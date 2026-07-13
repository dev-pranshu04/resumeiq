import { z } from "zod";

/**
 * Every schema in this file is a contract, not a suggestion. Groq is asked to return JSON
 * matching these shapes; the response is validated here before it ever reaches the UI.
 * If validation fails after one repair attempt, the caller gets a typed error — never a
 * partially-shaped object silently rendered as if it were trustworthy.
 */

/* -------------------- Shared primitives -------------------- */

export const evidenceLevelSchema = z.enum([
  "strong",
  "present",
  "weak",
  "missing",
]);

export const confidenceSchema = z.enum(["low", "medium", "high"]);

/**
 * Groq is instructed to return every score as a whole number 0-100, but small instruct
 * models frequently "helpfully" return a 0-1 fraction instead (0.85 instead of 85) —
 * especially once the word "score" appears near words like "probability" or "confidence".
 * A bare `z.number().min(0).max(100)` happily accepts 0.85, so the bad value sails through
 * validation and reaches the UI as "0.85 / 100". This schema normalizes that specific,
 * observed failure mode: a value strictly between 0 and 1 is treated as a fraction and
 * scaled up. A genuine score of exactly 0 or 1 (the extreme low end of the real 0-100
 * scale) is left as-is — that ambiguity is an accepted edge case, not a masked bug.
 */
const score0to100 = z
  .number()
  .min(0)
  .max(100)
  .transform((v) => (v > 0 && v < 1 ? Math.round(v * 100) : Math.round(v)));

/**
 * Coerces one array item that should be a plain string. Groq occasionally wraps a plain
 * label in a small object instead — most often when another array in the *same* response
 * uses objects (e.g. missingKeywords: [{keyword, importance}]), which seems to "prime" the
 * model into wrapping a neighboring plain-string array the same way (e.g.
 * matchedKeywords: [{keyword: "Python"}] instead of ["Python"]). This was an observed,
 * repeatable failure — not hypothetical — that crashed the whole response with a Zod
 * validation error for a single stray item. Rather than rejecting the entire response over
 * one wrapped label, pull the string out of whichever field it's actually in.
 */
function coerceToPlainString(item: unknown): string {
  if (typeof item === "string") return item;
  if (item && typeof item === "object") {
    const obj = item as Record<string, unknown>;
    const candidate =
      obj.keyword ??
      obj.skill ??
      obj.tag ??
      obj.name ??
      obj.value ??
      obj.text ??
      obj.label ??
      obj.title;
    if (typeof candidate === "string") return candidate;
  }
  return String(item);
}

/**
 * Drop-in replacement for `z.array(z.string())` on any *model-generated* array of plain
 * labels (never use this for user-typed input fields, which don't need coercion). Accepts
 * either plain strings or the wrapped-object shape described above and normalizes both to
 * plain strings, so one misshapen item degrades gracefully instead of failing the whole
 * response.
 */
function looseStringArray(
  opts: { min?: number; max?: number; default?: string[] } = {},
) {
  let schema = z.array(z.unknown());
  if (opts.min !== undefined) schema = schema.min(opts.min);
  if (opts.max !== undefined) schema = schema.max(opts.max);
  const withDefault =
    opts.default !== undefined ? schema.default(opts.default) : schema;
  return withDefault.transform((arr) => arr.map(coerceToPlainString));
}

/* -------------------- Resume / Job Analysis -------------------- */

export const scoreBreakdownItemSchema = z.object({
  label: z.string(),
  score: score0to100,
  reason: z.string(),
  evidence: z.string().nullable(),
  suggestion: z.string(),
});

export const missingKeywordSchema = z.object({
  keyword: z.string(),
  importance: z.enum(["critical", "important", "nice-to-have"]),
  whereInJob: z.string(),
});

export const skillGapSchema = z.object({
  skill: z.string(),
  tier: z.enum(["critical", "important", "differentiator"]),
  whyItMatters: z.string(),
  evidenceLevel: evidenceLevelSchema,
  jobDescriptionContext: z.string(),
  suggestedAction: z.string(),
});

export const fixActionSchema = z.object({
  title: z.string(),
  detail: z.string(),
  priority: z.enum(["high", "medium", "low"]),
  category: z.enum([
    "keywords",
    "formatting",
    "quantification",
    "structure",
    "skills",
    "clarity",
  ]),
});

export const analysisResultSchema = z.object({
  atsScore: score0to100,
  atsScoreLabel: z.string(),
  jobMatchScore: score0to100,
  readinessScore: score0to100,
  shortlistRange: z.object({
    low: score0to100,
    high: score0to100,
    confidence: confidenceSchema,
  }),
  summary: z.string(),
  scoreBreakdown: z.array(scoreBreakdownItemSchema).min(3),
  missingKeywords: z.array(missingKeywordSchema),
  skillGaps: z.array(skillGapSchema),
  criticalWeaknesses: looseStringArray(),
  strengths: looseStringArray(),
  prioritizedActions: z.array(fixActionSchema).min(1),
  interviewProbability: z.object({
    rangeLow: score0to100,
    rangeHigh: score0to100,
    confidence: confidenceSchema,
    positiveFactors: looseStringArray(),
    negativeFactors: looseStringArray(),
    highestImpactAction: z.string(),
  }),
  methodologyNote: z.string(),
});
export type AnalysisResult = z.infer<typeof analysisResultSchema>;

/* -------------------- Career Roadmap -------------------- */

export const roadmapNodeKindSchema = z.enum([
  "root",
  "domain",
  "topic",
  "tool",
  "skill",
  "portfolio",
  "interview",
  "strategy",
]);

export const roadmapNodeSchema: z.ZodType<RoadmapNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    title: z.string(),
    kind: roadmapNodeKindSchema,
    status: z.enum(["completed", "in-progress", "missing"]),
    priority: z.enum(["high", "medium", "low"]).nullable(),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]).nullable(),
    estimatedEffort: z.string().nullable(),
    evidenceRequired: z.string().nullable(),
    recommendedAction: z.string().nullable(),
    children: z.array(roadmapNodeSchema),
  }),
);
export interface RoadmapNode {
  id: string;
  title: string;
  kind:
    | "root"
    | "domain"
    | "topic"
    | "tool"
    | "skill"
    | "portfolio"
    | "interview"
    | "strategy";
  status: "completed" | "in-progress" | "missing";
  priority: "high" | "medium" | "low" | null;
  difficulty: "beginner" | "intermediate" | "advanced" | null;
  estimatedEffort: string | null;
  evidenceRequired: string | null;
  recommendedAction: string | null;
  children: RoadmapNode[];
}

export const roadmapResultSchema = z.object({
  targetRole: z.string(),
  root: roadmapNodeSchema,
  generatedFrom: z.enum(["resume-and-job", "resume-only", "role-only"]),
});
export type RoadmapResult = z.infer<typeof roadmapResultSchema>;

/**
 * Staged/chunked roadmap generation: a single request asking for the *entire* tree in one
 * completion is exactly what tipped Career Roadmap over Groq's per-request token budget,
 * especially on the smaller fallback model. Instead, one small "skeleton" call lists just
 * the top-level branches (no children yet), and one small "branch fill" call per branch
 * fills in that branch's children — each call is independently small and budget-safe, and
 * the client can show real per-branch progress as each one completes.
 */
export const roadmapSkeletonBranchSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: roadmapNodeKindSchema,
  status: z.enum(["completed", "in-progress", "missing"]),
});
export const roadmapSkeletonResultSchema = z.object({
  targetRole: z.string(),
  generatedFrom: z.enum(["resume-and-job", "resume-only", "role-only"]),
  // Capped at 7 (was 9): each branch means one more sequential Groq call in the
  // branch-fill stage, so this range directly bounds the worst-case request count per
  // roadmap generation (1 skeleton + up to 7 branches = 8 calls, down from 10) — a real
  // lever against requests-per-minute rate limiting, separate from the per-request token
  // budget fixed earlier.
  branches: z.array(roadmapSkeletonBranchSchema).min(5).max(7),
});
export type RoadmapSkeletonResult = z.infer<typeof roadmapSkeletonResultSchema>;
export type RoadmapSkeletonBranch = z.infer<typeof roadmapSkeletonBranchSchema>;

export const roadmapBranchFillResultSchema = z.object({
  children: z.array(roadmapNodeSchema).min(1),
});
export type RoadmapBranchFillResult = z.infer<
  typeof roadmapBranchFillResultSchema
>;

/* -------------------- Interview Preparation -------------------- */

export const interviewQuestionSchema = z.object({
  id: z.string(),
  category: z.enum([
    "hr",
    "resume-based",
    "project",
    "technical",
    "behavioral",
  ]),
  question: z.string(),
  whyTheyAsk: z.string(),
  answerFramework: z.string(),
  strongAnswerExample: z.string(),
  weakAnswerWarning: z.string(),
  relatedStarTip: z.string().nullable(),
});
export type InterviewQuestion = z.infer<typeof interviewQuestionSchema>;

export const interviewCategorySchema = z.enum([
  "hr",
  "resume-based",
  "project",
  "technical",
  "behavioral",
]);

/**
 * Staged/chunked interview-prep generation: asking for 8+ fully-elaborated questions
 * (framework, example, weak-answer warning, STAR tip) in a single completion is the other
 * call observed hitting Groq's per-request token ceiling. Generating 1-2 questions per
 * category in its own small call keeps every request budget-safe on both models and lets
 * the client show real progress ("Drafting technical questions…") per category.
 */
export const interviewCategoryResultSchema = z.object({
  questions: z.array(interviewQuestionSchema).min(1).max(3),
});
export type InterviewCategoryResult = z.infer<
  typeof interviewCategoryResultSchema
>;

export const interviewSummaryResultSchema = z.object({
  recruiterConcerns: looseStringArray({ default: [] }),
  preparationSummary: z.string(),
});
export type InterviewSummaryResult = z.infer<
  typeof interviewSummaryResultSchema
>;

export const interviewPrepResultSchema = z.object({
  targetRole: z.string(),
  questions: z.array(interviewQuestionSchema).min(4),
  // Defaulted, not required: the prompt asks for this, but a single omitted field
  // shouldn't fail validation and discard 8+ good interview questions along with it.
  recruiterConcerns: looseStringArray({ default: [] }),
  preparationSummary: z.string(),
});
export type InterviewPrepResult = z.infer<typeof interviewPrepResultSchema>;

/* -------------------- Server function inputs -------------------- */

export const analysisInputSchema = z.object({
  resumeText: z.string().min(50, "Resume text is too short to analyze."),
  jobDescription: z
    .string()
    .min(20, "Job description is too short to analyze."),
  targetRole: z.string().min(1),
});

export const roadmapInputSchema = z.object({
  resumeText: z.string().min(50),
  jobDescription: z.string().default(""),
  targetRole: z.string().min(1),
});

export const interviewInputSchema = z.object({
  resumeText: z.string().min(50),
  jobDescription: z.string().min(20),
  targetRole: z.string().min(1),
  skillGaps: z.array(z.string()).default([]),
});

export const roadmapBranchInputSchema = roadmapInputSchema.extend({
  branchId: z.string().min(1),
  branchTitle: z.string().min(1),
  branchKind: roadmapNodeKindSchema,
  branchStatus: z.enum(["completed", "in-progress", "missing"]),
});

export const interviewCategoryInputSchema = interviewInputSchema.extend({
  category: interviewCategorySchema,
});

// ---------------------------------------------------------------------------------------
// JD Matcher
// ---------------------------------------------------------------------------------------
export const jdMatcherInputSchema = z.object({
  resumeText: z.string().min(50),
  jobDescription: z.string().min(20),
  targetRole: z.string().min(1),
});

export const jdMatchResultSchema = z.object({
  matchScore: z.number().min(0).max(100),
  atsKeywordCoverage: z.number().min(0).max(100),
  verdict: z.string(),
  matchedKeywords: looseStringArray({ default: [] }),
  missingKeywords: z
    .array(
      z.object({
        keyword: z.string(),
        importance: z.enum(["critical", "important", "nice-to-have"]),
      }),
    )
    .default([]),
  hardSkillsToAdd: looseStringArray({ default: [] }),
  softSkillsToAdd: looseStringArray({ default: [] }),
  bulletRewrites: z
    .array(
      z.object({ before: z.string(), after: z.string(), note: z.string() }),
    )
    .default([]),
  sectionSuggestions: z
    .array(
      z.object({
        section: z.string(),
        priority: z.enum(["high", "medium", "low"]),
        suggestion: z.string(),
      }),
    )
    .default([]),
});
export type JdMatchResult = z.infer<typeof jdMatchResultSchema>;

// ---------------------------------------------------------------------------------------
// Cover Letter Studio
// ---------------------------------------------------------------------------------------
export const coverLetterToneSchema = z.enum([
  "formal",
  "confident",
  "warm",
  "bold",
]);
export const coverLetterLengthSchema = z.enum(["short", "medium", "long"]);
export const coverLetterHookSchema = z.enum([
  "story",
  "metric",
  "mission",
  "direct",
]);
export type CoverLetterTone = z.infer<typeof coverLetterToneSchema>;
export type CoverLetterLength = z.infer<typeof coverLetterLengthSchema>;
export type CoverLetterHook = z.infer<typeof coverLetterHookSchema>;

export const coverLetterInputSchema = z.object({
  resumeText: z.string().min(50),
  jobDescription: z.string().min(20),
  targetRole: z.string().min(1),
  company: z.string().default(""),
  hiringManager: z.string().default(""),
  companyResearch: z.string().default(""),
  tone: coverLetterToneSchema.default("confident"),
  length: coverLetterLengthSchema.default("medium"),
  hook: coverLetterHookSchema.default("metric"),
});

export const coverLetterResultSchema = z.object({
  letter: z.string(),
  wordCount: z.number().int().min(0),
  styleNote: z.string(),
  alternateHooks: z
    .array(
      z.object({ label: z.string(), opening: z.string(), note: z.string() }),
    )
    .default([]),
});
export type CoverLetterResult = z.infer<typeof coverLetterResultSchema>;

// ---------------------------------------------------------------------------------------
// Portfolio & Project Judge
// ---------------------------------------------------------------------------------------
export const portfolioJudgeInputSchema = z.object({
  resumeText: z.string().min(50),
  targetRole: z.string().min(1),
  extraProjects: z.array(z.string()).default([]),
});

export const portfolioCriterionSchema = z.object({
  score: z.number().min(0).max(10),
  note: z.string(),
});

export const portfolioProjectJudgementSchema = z.object({
  id: z.string(),
  source: z.enum(["cv", "extra"]),
  name: z.string(),
  verdict: z.enum(["hire-signal", "solid", "weak"]),
  score: z.number().min(0).max(100),
  summary: z.string(),
  problemFraming: portfolioCriterionSchema,
  impactMetrics: portfolioCriterionSchema,
  technicalDepth: portfolioCriterionSchema,
  presentation: portfolioCriterionSchema,
  roleRelevance: portfolioCriterionSchema,
  rewriteSuggestion: z.string(),
});

export const portfolioJudgeResultSchema = z.object({
  portfolioScore: z.number().min(0).max(100),
  diversityScore: z.number().min(0).max(100),
  coherenceScore: z.number().min(0).max(100),
  seniorityRead: z.enum(["Junior", "Mid", "Senior", "Staff+"]),
  topStrengths: looseStringArray({ default: [] }),
  topGaps: looseStringArray({ default: [] }),
  projects: z.array(portfolioProjectJudgementSchema).min(1),
  nextMoves: looseStringArray({ default: [] }),
});
export type PortfolioJudgeResult = z.infer<typeof portfolioJudgeResultSchema>;

// ---------------------------------------------------------------------------------------
// LinkedIn Optimizer
// ---------------------------------------------------------------------------------------
export const linkedinOptimizerInputSchema = z.object({
  targetRole: z.string().min(1),
  currentHeadline: z.string().default(""),
  aboutSection: z.string().default(""),
  experienceBullets: z.string().default(""),
  skills: z.string().default(""),
});

export const ssiPillarSchema = z.object({
  score: z.number().min(0).max(100),
  tip: z.string(),
});

export const linkedinOptimizerResultSchema = z.object({
  completeness: z.number().min(0).max(100),
  pillars: z.object({
    brand: ssiPillarSchema,
    insights: ssiPillarSchema,
    people: ssiPillarSchema,
    relationships: ssiPillarSchema,
  }),
  headlineVariants: looseStringArray({ min: 1, max: 5 }),
  aboutRewrite: z.object({ strategyNote: z.string(), text: z.string() }),
  experienceRewrites: z
    .array(
      z.object({
        roleTitle: z.string(),
        before: z.string(),
        bullets: looseStringArray({ default: [] }),
        addedTags: looseStringArray({ default: [] }),
      }),
    )
    .default([]),
  skillsToAdd: looseStringArray({ default: [] }),
  skillsToRemove: looseStringArray({ default: [] }),
  searchAppearanceTips: looseStringArray({ default: [] }),
});
export type LinkedinOptimizerResult = z.infer<
  typeof linkedinOptimizerResultSchema
>;
