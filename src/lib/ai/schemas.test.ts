import { describe, expect, it } from "vitest";
import {
  analysisResultSchema,
  interviewPrepResultSchema,
  jdMatchResultSchema,
  roadmapNodeSchema,
  roadmapResultSchema,
} from "@/lib/ai/schemas";

const validAnalysis = {
  atsScore: 62,
  atsScoreLabel: "Fair",
  jobMatchScore: 58,
  readinessScore: 55,
  shortlistRange: { low: 20, high: 35, confidence: "medium" },
  summary: "Solid technical base, missing deployment evidence.",
  scoreBreakdown: [
    {
      label: "Keyword Match",
      score: 60,
      reason: "r",
      evidence: "e",
      suggestion: "s",
    },
    {
      label: "Formatting",
      score: 80,
      reason: "r",
      evidence: null,
      suggestion: "s",
    },
    {
      label: "Quantification",
      score: 40,
      reason: "r",
      evidence: null,
      suggestion: "s",
    },
  ],
  missingKeywords: [
    {
      keyword: "Kubernetes",
      importance: "critical",
      whereInJob: "Requirements section",
    },
  ],
  skillGaps: [
    {
      skill: "Cloud deployment",
      tier: "critical",
      whyItMatters: "Core to the role",
      evidenceLevel: "missing",
      jobDescriptionContext: "AWS required",
      suggestedAction: "Deploy one project to AWS",
    },
  ],
  criticalWeaknesses: ["No deployment evidence"],
  strengths: ["Strong ML fundamentals"],
  prioritizedActions: [
    {
      title: "Add a deployed project",
      detail: "Deploy and document one project.",
      priority: "high",
      category: "skills",
    },
  ],
  interviewProbability: {
    rangeLow: 20,
    rangeHigh: 35,
    confidence: "medium",
    positiveFactors: ["Relevant coursework"],
    negativeFactors: ["No production experience"],
    highestImpactAction: "Ship a deployed project",
  },
  methodologyNote: "LLM-assisted estimate, not a guarantee.",
};

describe("analysisResultSchema", () => {
  it("accepts a well-formed analysis result", () => {
    const result = analysisResultSchema.safeParse(validAnalysis);
    expect(result.success).toBe(true);
  });

  it("rejects a score outside 0-100", () => {
    const result = analysisResultSchema.safeParse({
      ...validAnalysis,
      atsScore: 140,
    });
    expect(result.success).toBe(false);
  });

  it("rejects when scoreBreakdown has fewer than 3 entries", () => {
    const result = analysisResultSchema.safeParse({
      ...validAnalysis,
      scoreBreakdown: validAnalysis.scoreBreakdown.slice(0, 1),
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid confidence enum value", () => {
    const result = analysisResultSchema.safeParse({
      ...validAnalysis,
      shortlistRange: { low: 10, high: 20, confidence: "certain" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const { summary: _summary, ...withoutSummary } = validAnalysis;
    const result = analysisResultSchema.safeParse(withoutSummary);
    expect(result.success).toBe(false);
  });

  it("normalizes a 0-1 fraction atsScore into a 0-100 score (the observed Groq bug)", () => {
    const result = analysisResultSchema.safeParse({
      ...validAnalysis,
      atsScore: 0.85,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.atsScore).toBe(85);
  });

  it("normalizes fractional scores across shortlistRange, interviewProbability, and scoreBreakdown", () => {
    const result = analysisResultSchema.safeParse({
      ...validAnalysis,
      jobMatchScore: 0.92,
      readinessScore: 0.9,
      shortlistRange: { low: 0.7, high: 0.95, confidence: "high" },
      scoreBreakdown: [
        {
          label: "Keyword Match",
          score: 0.6,
          reason: "r",
          evidence: "e",
          suggestion: "s",
        },
        {
          label: "Formatting",
          score: 80,
          reason: "r",
          evidence: null,
          suggestion: "s",
        },
        {
          label: "Quantification",
          score: 40,
          reason: "r",
          evidence: null,
          suggestion: "s",
        },
      ],
      interviewProbability: {
        ...validAnalysis.interviewProbability,
        rangeLow: 0.6,
        rangeHigh: 0.9,
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.jobMatchScore).toBe(92);
      expect(result.data.readinessScore).toBe(90);
      expect(result.data.shortlistRange).toEqual({
        low: 70,
        high: 95,
        confidence: "high",
      });
      expect(result.data.scoreBreakdown[0].score).toBe(60);
      expect(result.data.interviewProbability.rangeLow).toBe(60);
      expect(result.data.interviewProbability.rangeHigh).toBe(90);
    }
  });

  it("leaves already-correct whole-number scores untouched", () => {
    const result = analysisResultSchema.safeParse(validAnalysis);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.atsScore).toBe(62);
  });

  it("still rejects a genuinely out-of-range score", () => {
    const result = analysisResultSchema.safeParse({
      ...validAnalysis,
      atsScore: 140,
    });
    expect(result.success).toBe(false);
  });
});

describe("roadmapNodeSchema (recursive)", () => {
  const leaf = {
    id: "leaf-1",
    title: "Learn Docker",
    kind: "skill",
    status: "missing",
    priority: "high",
    difficulty: "beginner",
    estimatedEffort: "1 week",
    evidenceRequired: "A containerized project",
    recommendedAction: "Containerize an existing project",
    children: [],
  };

  it("accepts a leaf node with no children", () => {
    expect(roadmapNodeSchema.safeParse(leaf).success).toBe(true);
  });

  it("accepts nested children recursively", () => {
    const nested = {
      ...leaf,
      id: "root",
      kind: "root",
      children: [leaf, { ...leaf, id: "leaf-2" }],
    };
    const result = roadmapNodeSchema.safeParse(nested);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.children).toHaveLength(2);
    }
  });

  it("rejects an invalid kind", () => {
    const result = roadmapNodeSchema.safeParse({
      ...leaf,
      kind: "not-a-real-kind",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a node missing the children array entirely", () => {
    const { children: _children, ...withoutChildren } = leaf;
    const result = roadmapNodeSchema.safeParse(withoutChildren);
    expect(result.success).toBe(false);
  });
});

describe("roadmapResultSchema", () => {
  it("validates a full tree", () => {
    const tree = {
      targetRole: "ML Engineer",
      generatedFrom: "resume-and-job",
      root: {
        id: "root",
        title: "ML Engineer",
        kind: "root",
        status: "in-progress",
        priority: null,
        difficulty: null,
        estimatedEffort: null,
        evidenceRequired: null,
        recommendedAction: null,
        children: [],
      },
    };
    expect(roadmapResultSchema.safeParse(tree).success).toBe(true);
  });
});

describe("interviewPrepResultSchema", () => {
  const question = {
    id: "q1",
    category: "technical",
    question: "Explain your model evaluation approach.",
    whyTheyAsk: "Tests depth of ML understanding.",
    answerFramework: "Describe metrics, then tradeoffs.",
    strongAnswerExample: "I used precision/recall because...",
    weakAnswerWarning: "Don't just say 'I used accuracy'.",
    relatedStarTip: null,
  };

  it("requires at least 4 questions", () => {
    const result = interviewPrepResultSchema.safeParse({
      targetRole: "ML Engineer",
      questions: [question, question, question],
      recruiterConcerns: [],
      preparationSummary: "summary",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid set of questions", () => {
    const result = interviewPrepResultSchema.safeParse({
      targetRole: "ML Engineer",
      questions: [question, question, question, question],
      recruiterConcerns: ["No production deployment experience"],
      preparationSummary: "summary",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid category", () => {
    const result = interviewPrepResultSchema.safeParse({
      targetRole: "ML Engineer",
      questions: [
        { ...question, category: "trivia" },
        question,
        question,
        question,
      ],
      recruiterConcerns: [],
      preparationSummary: "summary",
    });
    expect(result.success).toBe(false);
  });
});

describe("jdMatchResultSchema", () => {
  const validJdMatch = {
    matchScore: 80,
    atsKeywordCoverage: 78,
    verdict: "Would pass an initial screen.",
    matchedKeywords: ["Python", "PyTorch", "LangChain"],
    missingKeywords: [{ keyword: "AWS", importance: "critical" }],
    hardSkillsToAdd: ["Cloud platforms"],
    softSkillsToAdd: ["Stakeholder communication"],
    bulletRewrites: [
      {
        before: "Built a model.",
        after: "Shipped a production model.",
        note: "Adds outcome.",
      },
    ],
    sectionSuggestions: [
      {
        section: "Skills",
        priority: "high",
        suggestion: "Add a cloud subsection.",
      },
    ],
  };

  it("accepts a well-formed match result", () => {
    expect(jdMatchResultSchema.safeParse(validJdMatch).success).toBe(true);
  });

  it(
    "coerces matchedKeywords/hardSkillsToAdd wrapped in objects into plain strings " +
      "(the exact shape observed crashing JD Matcher in production: " +
      '[{"keyword":"Python"}, ...] instead of ["Python", ...])',
    () => {
      const result = jdMatchResultSchema.safeParse({
        ...validJdMatch,
        matchedKeywords: [
          { keyword: "Python" },
          { keyword: "PyTorch" },
          { keyword: "LangChain" },
          { keyword: "RAG" },
          { keyword: "Docker" },
        ],
        hardSkillsToAdd: [{ skill: "Cloud platforms (AWS/GCP)" }],
        softSkillsToAdd: [{ name: "Stakeholder communication" }],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.matchedKeywords).toEqual([
          "Python",
          "PyTorch",
          "LangChain",
          "RAG",
          "Docker",
        ]);
        expect(result.data.hardSkillsToAdd).toEqual([
          "Cloud platforms (AWS/GCP)",
        ]);
        expect(result.data.softSkillsToAdd).toEqual([
          "Stakeholder communication",
        ]);
      }
    },
  );

  it("still rejects a match result missing required fields", () => {
    const { verdict: _verdict, ...withoutVerdict } = validJdMatch;
    expect(jdMatchResultSchema.safeParse(withoutVerdict).success).toBe(false);
  });
});
