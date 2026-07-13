import type { z } from "zod";

/**
 * SERVER-ONLY. This module reads process.env.GROQ_API_KEY and must never be imported
 * from a client component. All callers in this codebase go through server functions
 * (see server-functions.ts), which run exclusively on the server.
 */

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

// llama-3.3-70b-versatile is high quality but has a low tokens-per-minute ceiling on
// Groq's free tier — a single analysis call (prompt + completion) can exceed it on its
// own, which is what produced the "rate-limited" screen. llama-3.1-8b-instant runs on a
// separate, much higher-throughput quota bucket, so we try the primary model first and
// fall back to the instant model within the same request if the primary is limited,
// instead of just re-hitting the same wall and failing.
const PRIMARY_MODEL = "llama-3.3-70b-versatile";
const FALLBACK_MODEL = "llama-3.1-8b-instant";
const REQUEST_TIMEOUT_MS = 25_000;
const MAX_RETRY_AFTER_MS = 15_000;

// Every caller now goes through this file's chunk-aware budgeting, so a full page's worth
// of AI content is built from several small, budget-safe requests instead of one big one.
// Individual requests stay fast; this deadline bounds the *whole* retry/backoff sequence
// for a single logical call, so a page can legitimately take up to ~60s across several
// calls without any single one hanging indefinitely.
const OVERALL_DEADLINE_MS = 55_000;

export class GroqConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GroqConfigError";
  }
}

export class GroqRequestError extends Error {
  constructor(
    message: string,
    public readonly kind:
      "timeout" | "rate-limit" | "network" | "server" | "unknown",
    public readonly retriable: boolean,
    /** Seconds the caller should wait before trying again, when Groq sends Retry-After. */
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "GroqRequestError";
  }
}

export class GroqValidationError extends Error {
  constructor(
    message: string,
    public readonly raw: string,
  ) {
    super(message);
    this.name = "GroqValidationError";
  }
}

function getEnv(name: string): string | undefined {
  return typeof process !== "undefined" ? process.env[name] : undefined;
}

function requireApiKey(): string {
  const key = getEnv("GROQ_API_KEY");
  if (!key) {
    throw new GroqConfigError(
      "GROQ_API_KEY is not configured on the server. Add it to your environment variables.",
    );
  }
  return key;
}

function getPrimaryModel(): string {
  return getEnv("GROQ_MODEL") || PRIMARY_MODEL;
}

function getFallbackModel(): string | null {
  // If the deployer pinned a custom GROQ_MODEL, don't second-guess it with an
  // implicit fallback — only fall back when we're the ones who picked the default.
  if (getEnv("GROQ_MODEL")) return null;
  return FALLBACK_MODEL;
}

/** Caps a block of user-provided text so a single request can't blow the token budget. */
export function truncateForBudget(
  text: string,
  maxChars: number,
): { text: string; truncated: boolean } {
  if (text.length <= maxChars) return { text, truncated: false };
  return {
    text: `${text.slice(0, maxChars)}\n…[truncated ${text.length - maxChars} characters to stay within request limits]`,
    truncated: true,
  };
}

// Conservative chars-per-token estimate for the safety check below. Technical text
// (camelCase identifiers, acronyms) tokenizes denser than plain prose, so this
// deliberately undercounts chars/token rather than overcounting — the goal is to never
// under-estimate how many tokens a request will actually use.
const CHARS_PER_TOKEN_ESTIMATE = 3.3;
function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE);
}

// Groq's on-demand tier enforces a *per-model* tokens-per-minute ceiling for a single
// request (prompt + max_tokens) — llama-3.3-70b-versatile has been observed around 12,000
// TPM, but llama-3.1-8b-instant (our automatic fallback) sits much lower, around 6,000
// TPM. Treating these as one shared budget is exactly what caused the fallback model to
// keep tripping 413 "Request too large" even after the primary model's budget was
// respected: a request sized for a 9,000-token budget still blows past a 6,000-token
// ceiling. Each model gets its own safe budget, with margin below the observed ceiling for
// estimate error and system-prompt overhead. Unrecognized/custom-pinned models (via
// GROQ_MODEL) fall back to DEFAULT_SAFE_TOKEN_BUDGET, a conservative default.
const MODEL_TOKEN_BUDGETS: Record<string, number> = {
  "llama-3.3-70b-versatile": 10_000,
  "llama-3.1-8b-instant": 5_000,
};
const DEFAULT_SAFE_TOKEN_BUDGET = 9000;
const MIN_COMPLETION_TOKENS = 900;
// Below this, a model can't produce a useful completion for this request at all (prompt
// alone plus the smallest usable completion would exceed its budget) — so we skip it
// entirely rather than sending a request we already know will 413.
function safeBudgetFor(model: string): number {
  return MODEL_TOKEN_BUDGETS[model] ?? DEFAULT_SAFE_TOKEN_BUDGET;
}

/** Strips markdown code fences and leading/trailing prose so we can attempt JSON.parse. */
export function extractJsonCandidate(raw: string): string {
  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    text = fenced[1].trim();
  }
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }
  return text;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface GroqChatOptions {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  /**
   * Overrides OVERALL_DEADLINE_MS for this call. One-shot features (analysis, cover
   * letters, JD matching, etc.) want the full ~55s so a rate-limited request still has
   * room to succeed. Chunked features (roadmap branches, interview categories) call this
   * many times *in sequence* for one page, so each individual call needs its own much
   * shorter deadline — otherwise a single stuck chunk can silently burn through the whole
   * page's time budget before the next chunk even starts (this was an observed bug: a
   * branch call retrying for the full 55s left the client-side roadmap loop with zero time
   * for the remaining branches, which then all showed as "couldn't generate in time" even
   * though they were never actually attempted).
   */
  deadlineMs?: number;
}

function parseRetryAfterMs(response: Response): number {
  const header = response.headers.get("retry-after");
  const seconds = header ? Number(header) : NaN;
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
  }
  return 4000;
}

async function requestOnce(
  model: string,
  {
    system,
    user,
    maxTokens,
    temperature,
  }: { system: string; user: string; maxTokens: number; temperature: number },
  apiKey: string,
): Promise<
  { ok: true; content: string } | { ok: false; error: GroqRequestError }
> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    clearTimeout(timeout);

    if (response.status === 429) {
      const retryAfterSeconds = parseRetryAfterMs(response) / 1000;
      return {
        ok: false,
        error: new GroqRequestError(
          `Groq rate limit reached for ${model}.`,
          "rate-limit",
          true,
          retryAfterSeconds,
        ),
      };
    }
    if (response.status >= 500) {
      return {
        ok: false,
        error: new GroqRequestError(
          `Groq server error (${response.status}) for ${model}.`,
          "server",
          true,
        ),
      };
    }
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        ok: false,
        error: new GroqRequestError(
          `Groq request failed (${response.status}): ${body.slice(0, 200)}`,
          "unknown",
          false,
        ),
      };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return {
        ok: false,
        error: new GroqRequestError(
          "Groq returned an empty response.",
          "unknown",
          true,
        ),
      };
    }
    return { ok: true, content };
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === "AbortError") {
      return {
        ok: false,
        error: new GroqRequestError(
          `Groq request to ${model} timed out.`,
          "timeout",
          true,
        ),
      };
    }
    return {
      ok: false,
      error: new GroqRequestError(
        `Network error contacting Groq: ${error instanceof Error ? error.message : String(error)}`,
        "network",
        true,
      ),
    };
  }
}

/**
 * Tries the primary model first. On rate-limit specifically, it immediately tries the
 * fallback model (a separate quota bucket on Groq) instead of waiting and re-hitting the
 * same limit — this is what actually avoids the "AI service is rate-limited" screen for
 * the common case. Only sleeps (honoring Retry-After) when every model option is
 * exhausted, and only for retriable, non-rate-limit failures (timeouts, 5xx, network).
 *
 * A slow-but-successful response is the goal, not a fast failure: this keeps retrying
 * (honoring Retry-After, with backoff) across every viable model until OVERALL_DEADLINE_MS
 * is spent, rather than giving up after a couple of attempts. Callers that want their own
 * chunk of a larger flow to stay small and fast should shrink `maxTokens` and the prompt
 * itself — see prompts.ts's staged/skeleton builders — rather than relying on this loop to
 * paper over a request that's simply too big for any model's budget.
 */
async function requestGroqChat({
  system,
  user,
  maxTokens = 2200,
  temperature = 0.3,
  deadlineMs = OVERALL_DEADLINE_MS,
}: GroqChatOptions): Promise<string> {
  const apiKey = requireApiKey();
  const allModels = [getPrimaryModel(), getFallbackModel()].filter(
    (m, i, arr): m is string => !!m && arr.indexOf(m) === i,
  );

  const promptTokens = estimateTokens(system) + estimateTokens(user);

  // Only attempt models the prompt can plausibly fit on (prompt + a minimally useful
  // completion must clear that model's safe budget) — sending a request we already know
  // is oversized just wastes a round trip and reproduces the 413 the fallback model kept
  // hitting. If every model is too small for this prompt, keep the primary model anyway
  // (best effort) so we still get a real, if truncated-completion, attempt and error
  // message rather than silently doing nothing.
  const viableModels = allModels.filter(
    (m) => promptTokens + MIN_COMPLETION_TOKENS <= safeBudgetFor(m),
  );
  const models = viableModels.length > 0 ? viableModels : [allModels[0]];

  function budgetedMaxTokensFor(model: string): number {
    return Math.max(
      MIN_COMPLETION_TOKENS,
      Math.min(maxTokens, safeBudgetFor(model) - promptTokens),
    );
  }

  let lastError: GroqRequestError | null = null;
  const deadline = Date.now() + deadlineMs;
  let attempt = 0;

  while (Date.now() < deadline) {
    const model = models[Math.min(attempt, models.length - 1)];
    const result = await requestOnce(
      model,
      { system, user, maxTokens: budgetedMaxTokensFor(model), temperature },
      apiKey,
    );

    if (result.ok) return result.content;
    lastError = result.error;

    if (!lastError.retriable) throw lastError;

    const nextModel = models[Math.min(attempt + 1, models.length - 1)];
    const movingToNewModel = nextModel !== model;
    attempt += 1;

    if (lastError.kind === "rate-limit" && movingToNewModel) {
      // Different model *might* be a different quota bucket on Groq's side — but that's
      // an assumption, not something this code can verify, and if Groq actually enforces
      // rate limits per API key/account rather than strictly per model, firing the next
      // request with zero delay doesn't help and just adds another request against the
      // same limit. A short, cheap pause hedges against that uncertainty without
      // meaningfully slowing down the common case where it genuinely is a separate bucket.
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) break;
      await sleep(Math.min(400, Math.max(remainingMs - 250, 0)));
      continue;
    }

    const backoffMs =
      lastError.kind === "rate-limit"
        ? (lastError.retryAfterSeconds ?? 4) * 1000
        : Math.min(500 * 2 ** attempt, 8000);
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) break;
    await sleep(Math.min(backoffMs, Math.max(remainingMs - 250, 0)));
  }

  throw (
    lastError ??
    new GroqRequestError(
      "Groq request failed for an unknown reason.",
      "unknown",
      false,
    )
  );
}

/**
 * Calls Groq, asks for JSON, validates against the given Zod schema. On a validation
 * failure, makes exactly one repair attempt (re-asking the model to fix its own output
 * against the validation error) before giving up with a typed GroqValidationError.
 *
 * The repair attempt always gets its own short, fixed deadline (REPAIR_DEADLINE_MS)
 * regardless of the caller's `deadlineMs` — it's a small, bounded "fix your own JSON" ask,
 * not a from-scratch generation, so it doesn't need the same retry budget as the original
 * call. This keeps a chunked caller's worst-case total time at `deadlineMs +
 * REPAIR_DEADLINE_MS`, not `deadlineMs * 2` (which was the actual cause of Career Roadmap
 * branches burning through the whole page's time budget on a single stuck branch).
 */
const REPAIR_DEADLINE_MS = 12_000;

export async function callGroqStructured<S extends z.ZodTypeAny>({
  system,
  user,
  schema,
  maxTokens,
  temperature,
  deadlineMs,
}: GroqChatOptions & { schema: S }): Promise<z.infer<S>> {
  const raw = await requestGroqChat({
    system,
    user,
    maxTokens,
    temperature,
    deadlineMs,
  });
  const candidate = extractJsonCandidate(raw);

  const firstAttempt = safeParseJson(candidate);
  if (firstAttempt.ok) {
    const validated = schema.safeParse(firstAttempt.value);
    if (validated.success) return validated.data;

    // One bounded repair attempt: show the model its own output and the validation error.
    const repaired = await requestGroqChat({
      system:
        system +
        "\n\nYou previously returned JSON that failed schema validation. Return ONLY corrected JSON, no prose.",
      user: `Your previous output:\n${candidate}\n\nValidation error:\n${validated.error.message}\n\nOriginal request:\n${user}`,
      maxTokens,
      temperature: 0.1,
      deadlineMs: REPAIR_DEADLINE_MS,
    });
    const repairedCandidate = extractJsonCandidate(repaired);
    const repairedParsed = safeParseJson(repairedCandidate);
    if (repairedParsed.ok) {
      const repairedValidated = schema.safeParse(repairedParsed.value);
      if (repairedValidated.success) return repairedValidated.data;
      throw new GroqValidationError(
        `AI response failed validation after repair attempt: ${repairedValidated.error.message}`,
        repairedCandidate,
      );
    }
    throw new GroqValidationError(
      "AI response was not valid JSON after repair attempt.",
      repairedCandidate,
    );
  }

  throw new GroqValidationError("AI response was not valid JSON.", candidate);
}

function safeParseJson(
  text: string,
): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}
