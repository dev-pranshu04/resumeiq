import { createServerFn } from "@tanstack/react-start";

import {
  analysisInputSchema,
  analysisResultSchema,
  coverLetterInputSchema,
  coverLetterResultSchema,
  interviewCategoryInputSchema,
  interviewCategoryResultSchema,
  interviewInputSchema,
  interviewPrepResultSchema,
  interviewSummaryResultSchema,
  jdMatcherInputSchema,
  jdMatchResultSchema,
  linkedinOptimizerInputSchema,
  linkedinOptimizerResultSchema,
  portfolioJudgeInputSchema,
  portfolioJudgeResultSchema,
  roadmapBranchFillResultSchema,
  roadmapBranchInputSchema,
  roadmapInputSchema,
  roadmapResultSchema,
  roadmapSkeletonResultSchema,
  type RoadmapNode,
} from "./schemas";
import {
  buildAnalysisPrompt,
  buildCoverLetterPrompt,
  buildInterviewCategoryPrompt,
  buildInterviewPrepPrompt,
  buildInterviewSummaryPrompt,
  buildJdMatchPrompt,
  buildLinkedinOptimizerPrompt,
  buildPortfolioJudgePrompt,
  buildRoadmapBranchPrompt,
  buildRoadmapPrompt,
  buildRoadmapSkeletonPrompt,
} from "./prompts";
import {
  callGroqStructured,
  GroqConfigError,
  GroqRequestError,
  GroqValidationError,
} from "./groq-client";

/**
 * Every server function returns a discriminated-union result instead of throwing across the
 * client/server boundary — this lets the UI render a specific, honest error state (config
 * missing vs. rate-limited vs. timed out vs. bad AI output) instead of a generic failure.
 */
export type AiCallResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      errorKind:
        | "config"
        | "rate-limit"
        | "timeout"
        | "network"
        | "validation"
        | "unknown";
      message: string;
      /** Only set for rate-limit errors — lets the UI show an accurate countdown instead of a vague retry. */
      retryAfterSeconds?: number;
    };

function toResult<T>(fn: () => Promise<T>) {
  return fn()
    .then((data): AiCallResult<T> => ({ ok: true, data }))
    .catch((error): AiCallResult<T> => {
      if (error instanceof GroqConfigError) {
        return { ok: false, errorKind: "config", message: error.message };
      }
      if (error instanceof GroqValidationError) {
        return { ok: false, errorKind: "validation", message: error.message };
      }
      if (error instanceof GroqRequestError) {
        const kind =
          error.kind === "rate-limit"
            ? "rate-limit"
            : error.kind === "timeout"
              ? "timeout"
              : error.kind === "network"
                ? "network"
                : "unknown";
        return {
          ok: false,
          errorKind: kind,
          message: error.message,
          retryAfterSeconds: error.retryAfterSeconds,
        };
      }
      return {
        ok: false,
        errorKind: "unknown",
        message: error instanceof Error ? error.message : "Unexpected error.",
      };
    });
}

/**
 * Tiny in-memory, per-instance cache so identical requests (re-mounting a page, a tab
 * regaining focus, a duplicate effect fire) don't re-spend Groq quota on work we already
 * have the answer to. Best-effort only — it resets on cold start/deploy, which is fine,
 * it's a throughput saver, not a source of truth.
 */
const RESULT_CACHE_TTL_MS = 15 * 60 * 1000;
const resultCache = new Map<string, { expires: number; result: unknown }>();

// A short, strict per-call deadline for the chunked roadmap/interview generators below.
// Each of those runs several times in sequence for a single page load (one skeleton call +
// up to 9 branch calls, or 5 category calls + a summary call) — every individual call must
// stay fast so one slow/rate-limited chunk can't silently consume the whole page's
// client-side time budget before the remaining chunks are even attempted. This was an
// observed bug: without it, callGroqStructured's default ~55s deadline (meant for one-shot
// features like Analysis or Cover Letter Studio) meant a single stuck roadmap branch could
// burn through the entire client-side budget on its own, leaving every other branch marked
// "couldn't generate in time" even though they were never actually attempted.
const CHUNK_DEADLINE_MS = 12_000;

function hashKey(parts: string[]): string {
  // FNV-1a — fast, dependency-free, good enough to dedupe request payloads.
  let hash = 0x811c9dc5;
  for (const part of parts) {
    for (let i = 0; i < part.length; i++) {
      hash ^= part.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
  }
  return (hash >>> 0).toString(36);
}

/**
 * Renames an item's `id` in place if it collides with one already in `seen`, appending
 * "-2", "-3", etc. until it's unique, then records it in `seen`.
 *
 * Why this exists: the roadmap-skeleton prompt asks the model for a "unique short
 * kebab-case id" per branch, but that's just an instruction — nothing enforces it, and
 * small/fast models (especially the fallback llama-3.1-8b-instant, which is exactly what
 * kicks in under rate-limit pressure) are unreliable at actually keeping 5-7
 * independently-conceived ids distinct. When two branches shared an id, the roadmap tree
 * rendered them with a duplicate React `key`, which silently breaks reconciliation — one
 * branch could vanish or show the wrong content even though both were genuinely generated
 * (this was an observed bug, not a hypothetical one). Deduping here, once, server-side,
 * means the client never has to deal with a colliding key at all.
 */
export function dedupeId(item: { id: string }, seen: Set<string>): void {
  const base = item.id && item.id.trim().length > 0 ? item.id : "node";
  let candidate = base;
  let suffix = 2;
  while (seen.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix++;
  }
  item.id = candidate;
  seen.add(candidate);
}

/** Dedupes a flat list of items in place (used for the roadmap skeleton's branches). */
export function dedupeFlatIds<T extends { id: string }>(
  items: T[],
  seen: Set<string> = new Set(),
): void {
  for (const item of items) dedupeId(item, seen);
}

/**
 * Dedupes a recursive node tree in place, across the *whole* tree rather than just
 * per-level — simplest correct option, and cheap given these trees max out at a couple
 * dozen nodes per branch.
 */
export function dedupeNodeIdsRecursive(
  nodes: RoadmapNode[],
  seen: Set<string> = new Set(),
): void {
  for (const node of nodes) {
    dedupeId(node, seen);
    if (node.children?.length) dedupeNodeIdsRecursive(node.children, seen);
  }
}

async function withCache<T>(
  cacheKey: string,
  run: () => Promise<AiCallResult<T>>,
): Promise<AiCallResult<T>> {
  const cached = resultCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.result as AiCallResult<T>;
  }
  const result = await run();
  // Only cache successes — a rate-limit or transient error should be retried fresh.
  if (result.ok) {
    resultCache.set(cacheKey, {
      expires: Date.now() + RESULT_CACHE_TTL_MS,
      result,
    });
  }
  return result;
}

export const analyzeResumeFn = createServerFn({ method: "POST" })
  .validator(analysisInputSchema)
  .handler(async ({ data }) =>
    withCache(
      hashKey([
        "analysis",
        data.resumeText,
        data.jobDescription,
        data.targetRole,
      ]),
      () =>
        toResult(async () => {
          const { system, user } = buildAnalysisPrompt(data);
          return callGroqStructured({
            system,
            user,
            schema: analysisResultSchema,
            maxTokens: 2600,
          });
        }),
    ),
  );

export const generateRoadmapFn = createServerFn({ method: "POST" })
  .validator(roadmapInputSchema)
  .handler(async ({ data }) =>
    withCache(
      hashKey([
        "roadmap",
        data.resumeText,
        data.jobDescription,
        data.targetRole,
      ]),
      () =>
        toResult(async () => {
          const { system, user } = buildRoadmapPrompt(data);
          return callGroqStructured({
            system,
            user,
            schema: roadmapResultSchema,
            maxTokens: 3200,
          });
        }),
    ),
  );

/**
 * Chunked roadmap generation. Stage 1 (skeleton) returns just the top-level branches;
 * the client then calls generateRoadmapBranchFn once per branch. Each call is small
 * enough to stay well under either model's token budget, which is what actually lets
 * Career Roadmap complete instead of hitting a 413 on the fallback model — a single
 * request asking for the whole tree at once cannot make that guarantee no matter how
 * the retry logic is tuned.
 */
export const generateRoadmapSkeletonFn = createServerFn({ method: "POST" })
  .validator(roadmapInputSchema)
  .handler(async ({ data }) =>
    withCache(
      hashKey([
        "roadmap-skeleton",
        data.resumeText,
        data.jobDescription,
        data.targetRole,
      ]),
      () =>
        toResult(async () => {
          const { system, user } = buildRoadmapSkeletonPrompt(data);
          const result = await callGroqStructured({
            system,
            user,
            schema: roadmapSkeletonResultSchema,
            maxTokens: 1200,
            deadlineMs: CHUNK_DEADLINE_MS,
          });
          // "root" is reserved for the tree's root node (see roadmap.tsx) — seeding it
          // here means a branch that happened to pick id: "root" also gets renamed.
          dedupeFlatIds(result.branches, new Set(["root"]));
          return result;
        }),
    ),
  );

export const generateRoadmapBranchFn = createServerFn({ method: "POST" })
  .validator(roadmapBranchInputSchema)
  .handler(async ({ data }) =>
    withCache(
      hashKey([
        "roadmap-branch",
        data.resumeText,
        data.jobDescription,
        data.targetRole,
        data.branchId,
        data.branchTitle,
      ]),
      () =>
        toResult(async () => {
          const { system, user } = buildRoadmapBranchPrompt(data);
          const result = await callGroqStructured({
            system,
            user,
            schema: roadmapBranchFillResultSchema,
            maxTokens: 1400,
            deadlineMs: CHUNK_DEADLINE_MS,
          });
          dedupeNodeIdsRecursive(
            result.children,
            new Set([data.branchId, "root"]),
          );
          return result;
        }),
    ),
  );

/**
 * Chunked interview-prep generation, mirroring the roadmap: one small call per category,
 * plus one small call for the resume-wide recruiter concerns + summary. Generating 8+
 * fully-elaborated questions in a single completion was the other call observed tripping
 * Groq's per-request token ceiling.
 */
export const generateInterviewCategoryFn = createServerFn({ method: "POST" })
  .validator(interviewCategoryInputSchema)
  .handler(async ({ data }) =>
    withCache(
      hashKey([
        "interview-category",
        data.resumeText,
        data.jobDescription,
        data.targetRole,
        data.category,
        ...data.skillGaps,
      ]),
      () =>
        toResult(async () => {
          const { system, user } = buildInterviewCategoryPrompt(data);
          return callGroqStructured({
            system,
            user,
            schema: interviewCategoryResultSchema,
            maxTokens: 1200,
            deadlineMs: CHUNK_DEADLINE_MS,
          });
        }),
    ),
  );

export const generateInterviewSummaryFn = createServerFn({ method: "POST" })
  .validator(interviewInputSchema)
  .handler(async ({ data }) =>
    withCache(
      hashKey([
        "interview-summary",
        data.resumeText,
        data.jobDescription,
        data.targetRole,
      ]),
      () =>
        toResult(async () => {
          const { system, user } = buildInterviewSummaryPrompt(data);
          return callGroqStructured({
            system,
            user,
            schema: interviewSummaryResultSchema,
            maxTokens: 500,
            deadlineMs: CHUNK_DEADLINE_MS,
          });
        }),
    ),
  );

export const generateInterviewPrepFn = createServerFn({ method: "POST" })
  .validator(interviewInputSchema)
  .handler(async ({ data }) =>
    withCache(
      hashKey([
        "interview",
        data.resumeText,
        data.jobDescription,
        data.targetRole,
        ...data.skillGaps,
      ]),
      () =>
        toResult(async () => {
          const { system, user } = buildInterviewPrepPrompt(data);
          return callGroqStructured({
            system,
            user,
            schema: interviewPrepResultSchema,
            maxTokens: 2800,
          });
        }),
    ),
  );

/**
 * Lightweight status check for the Settings page — reports whether the server has a Groq
 * key configured and which models are active, without ever exposing the key itself.
 */
export const getAiStatusFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const configured = !!process.env.GROQ_API_KEY;
    const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile (default)";
    const fallbackActive = !process.env.GROQ_MODEL;
    return {
      configured,
      model,
      fallbackModel: fallbackActive
        ? "llama-3.1-8b-instant (auto fallback on rate-limit)"
        : null,
      cachedResults: resultCache.size,
    };
  },
);

export const matchJobDescriptionFn = createServerFn({ method: "POST" })
  .validator(jdMatcherInputSchema)
  .handler(async ({ data }) =>
    withCache(
      hashKey([
        "jd-match",
        data.resumeText,
        data.jobDescription,
        data.targetRole,
      ]),
      () =>
        toResult(async () => {
          const { system, user } = buildJdMatchPrompt(data);
          return callGroqStructured({
            system,
            user,
            schema: jdMatchResultSchema,
            maxTokens: 2200,
          });
        }),
    ),
  );

export const generateCoverLetterFn = createServerFn({ method: "POST" })
  .validator(coverLetterInputSchema)
  .handler(async ({ data }) =>
    withCache(
      hashKey([
        "cover-letter",
        data.resumeText,
        data.jobDescription,
        data.targetRole,
        data.company,
        data.hiringManager,
        data.companyResearch,
        data.tone,
        data.length,
        data.hook,
      ]),
      () =>
        toResult(async () => {
          const { system, user } = buildCoverLetterPrompt(data);
          return callGroqStructured({
            system,
            user,
            schema: coverLetterResultSchema,
            maxTokens: 1600,
          });
        }),
    ),
  );

export const judgePortfolioFn = createServerFn({ method: "POST" })
  .validator(portfolioJudgeInputSchema)
  .handler(async ({ data }) =>
    withCache(
      hashKey([
        "portfolio-judge",
        data.resumeText,
        data.targetRole,
        ...data.extraProjects,
      ]),
      () =>
        toResult(async () => {
          const { system, user } = buildPortfolioJudgePrompt(data);
          return callGroqStructured({
            system,
            user,
            schema: portfolioJudgeResultSchema,
            maxTokens: 2800,
          });
        }),
    ),
  );

export const optimizeLinkedinFn = createServerFn({ method: "POST" })
  .validator(linkedinOptimizerInputSchema)
  .handler(async ({ data }) =>
    withCache(
      hashKey([
        "linkedin-optimizer",
        data.targetRole,
        data.currentHeadline,
        data.aboutSection,
        data.experienceBullets,
        data.skills,
      ]),
      () =>
        toResult(async () => {
          const { system, user } = buildLinkedinOptimizerPrompt(data);
          return callGroqStructured({
            system,
            user,
            schema: linkedinOptimizerResultSchema,
            maxTokens: 2400,
          });
        }),
    ),
  );
