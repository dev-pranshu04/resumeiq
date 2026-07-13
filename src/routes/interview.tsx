import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronRight,
  MessagesSquare,
  RefreshCw,
  Sparkles,
  Info,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  AiErrorState,
  AiStagedProgress,
  type StagedStep,
} from "@/components/ai-states";
import { useWorkspaceStore } from "@/store/workspace-store";
import {
  generateInterviewCategoryFn,
  generateInterviewSummaryFn,
} from "@/lib/ai/server-functions";
import type { AiCallResult } from "@/lib/ai/server-functions";
import type { InterviewPrepResult, InterviewQuestion } from "@/lib/ai/schemas";

export const Route = createFileRoute("/interview")({
  head: () => ({
    meta: [
      { title: "Interview Preparation — ResumeIQ" },
      {
        name: "description",
        content:
          "Role-specific interview questions grounded in your real resume.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InterviewPage,
});

const CATEGORY_LABEL: Record<string, string> = {
  hr: "HR",
  "resume-based": "Resume-based",
  project: "Project",
  technical: "Technical",
  behavioral: "Behavioral",
};

const CATEGORIES = [
  "hr",
  "resume-based",
  "project",
  "technical",
  "behavioral",
] as const;

// Same reasoning as the roadmap flow: each category/summary call is now capped at
// CHUNK_DEADLINE_MS (12s, see server-functions.ts), so this just bounds the sum across all
// five categories + summary rather than needing to absorb one call's entire retry budget.
const OVERALL_CLIENT_BUDGET_MS = 65_000;

// Same reasoning as roadmap.tsx's INTER_BRANCH_DELAY_MS — a deliberate pause between
// sequential calls to reduce request density against a requests-per-minute rate limit,
// separate from the per-request token budget.
const INTER_CALL_DELAY_MS = 500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function InterviewPage() {
  const navigate = useNavigate();
  const {
    resumeText,
    jobDescription,
    targetRole,
    analysis,
    interviewPrep,
    setInterviewLoading,
    setInterviewResult,
  } = useWorkspaceStore();
  const [steps, setSteps] = useState<StagedStep[]>([]);
  const runId = useRef(0);

  useEffect(() => {
    if (
      resumeText &&
      jobDescription.trim().length >= 20 &&
      interviewPrep.status === "idle"
    ) {
      void run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeText]);

  async function run() {
    if (!resumeText) return;
    const thisRun = ++runId.current;
    const deadline = Date.now() + OVERALL_CLIENT_BUDGET_MS;
    setInterviewLoading();
    const skillGaps = analysis.data?.skillGaps.map((g) => g.skill) ?? [];

    setSteps(
      CATEGORIES.map((c) => ({
        label: `Drafting ${CATEGORY_LABEL[c]} questions…`,
        status: "pending" as const,
      })).concat([
        { label: "Summarizing recruiter concerns…", status: "pending" },
      ]),
    );

    const questions: InterviewQuestion[] = [];
    let anyCategorySucceeded = false;

    for (let i = 0; i < CATEGORIES.length; i++) {
      if (thisRun !== runId.current) return;
      const category = CATEGORIES[i];

      if (Date.now() >= deadline) {
        setSteps((s) =>
          s.map((step, idx) =>
            idx === i ? { ...step, status: "error" } : step,
          ),
        );
        continue;
      }

      // Pace requests instead of firing them back-to-back — see INTER_CALL_DELAY_MS.
      if (i > 0) await sleep(INTER_CALL_DELAY_MS);

      setSteps((s) =>
        s.map((step, idx) =>
          idx === i ? { ...step, status: "active" } : step,
        ),
      );
      const result = await generateInterviewCategoryFn({
        data: { resumeText, jobDescription, targetRole, skillGaps, category },
      });
      if (thisRun !== runId.current) return;

      if (result.ok) {
        questions.push(...result.data.questions);
        anyCategorySucceeded = true;
        setSteps((s) =>
          s.map((step, idx) =>
            idx === i ? { ...step, status: "done" } : step,
          ),
        );
      } else {
        // One category failing after its own retries shouldn't sink the whole page —
        // the other categories still make a useful, honest set of prep questions.
        setSteps((s) =>
          s.map((step, idx) =>
            idx === i ? { ...step, status: "error" } : step,
          ),
        );
      }
    }

    if (!anyCategorySucceeded) {
      setInterviewResult({
        ok: false,
        errorKind: "unknown",
        message:
          "Every category failed to generate after retrying. Please try again.",
      });
      return;
    }

    const summaryStepIndex = CATEGORIES.length;
    await sleep(INTER_CALL_DELAY_MS);
    setSteps((s) =>
      s.map((step, idx) =>
        idx === summaryStepIndex ? { ...step, status: "active" } : step,
      ),
    );
    const summary = await generateInterviewSummaryFn({
      data: { resumeText, jobDescription, targetRole, skillGaps },
    });
    if (thisRun !== runId.current) return;

    const recruiterConcerns = summary.ok ? summary.data.recruiterConcerns : [];
    const preparationSummary = summary.ok
      ? summary.data.preparationSummary
      : `Prep questions grounded in your resume for ${targetRole}.`;
    setSteps((s) =>
      s.map((step, idx) =>
        idx === summaryStepIndex
          ? { ...step, status: summary.ok ? "done" : "error" }
          : step,
      ),
    );

    const assembled: InterviewPrepResult = {
      targetRole,
      questions,
      recruiterConcerns,
      preparationSummary,
    };
    setInterviewResult({
      ok: true,
      data: assembled,
    } as AiCallResult<InterviewPrepResult>);
  }

  if (!resumeText || jobDescription.trim().length < 20) {
    return (
      <AppShell breadcrumb="Interview Prep">
        <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-32 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-accent-purple-soft text-accent-purple">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="mt-5 font-display text-2xl">
            Resume and job description needed
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Interview prep is grounded in your real resume and the specific job
            — add both first.
          </p>
          <button
            onClick={() => navigate({ to: "/" })}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-purple-gradient px-5 py-2.5 text-sm font-medium text-white shadow-glow"
          >
            Go set up your analysis <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </AppShell>
    );
  }

  if (interviewPrep.status === "loading" || interviewPrep.status === "idle") {
    return (
      <AppShell breadcrumb="Interview Prep">
        <AiStagedProgress
          steps={steps}
          subject={`Preparing questions for ${targetRole}`}
        />
      </AppShell>
    );
  }

  if (interviewPrep.status === "error") {
    return (
      <AppShell breadcrumb="Interview Prep">
        <AiErrorState
          kind={interviewPrep.error?.kind ?? "unknown"}
          message={
            interviewPrep.error?.message ?? "Couldn't generate interview prep."
          }
          retryAfterSeconds={interviewPrep.error?.retryAfterSeconds}
          onRetry={run}
        />
      </AppShell>
    );
  }

  const data = interviewPrep.data as InterviewPrepResult;
  const categories = Array.from(new Set(data.questions.map((q) => q.category)));

  return (
    <AppShell breadcrumb="Interview Prep">
      <div className="mx-auto max-w-4xl px-6 py-8 md:px-10 md:py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-accent-purple">
              <MessagesSquare className="h-3.5 w-3.5" /> Interview Preparation
            </div>
            <h1 className="mt-2 font-display text-4xl leading-tight md:text-5xl">
              {data.targetRole}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {data.preparationSummary}
            </p>
          </div>
          <button
            onClick={run}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground shadow-soft"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Regenerate
          </button>
        </div>

        {data.recruiterConcerns.length > 0 && (
          <div className="mb-6 rounded-2xl border border-warning/30 bg-warning/5 p-5">
            <div className="text-xs font-medium uppercase tracking-widest text-warning">
              Likely recruiter concerns
            </div>
            <ul className="mt-2 space-y-1.5 text-sm">
              {data.recruiterConcerns.map((c) => (
                <li key={c} className="flex items-start gap-2">
                  <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-8">
          {categories.map((cat) => (
            <div key={cat}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {CATEGORY_LABEL[cat] ?? cat}
              </h2>
              <div className="space-y-3">
                {data.questions
                  .filter((q) => q.category === cat)
                  .map((q) => (
                    <QuestionCard key={q.id} question={q} />
                  ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          This is text-based preparation grounded in your resume. It does not
          evaluate your voice, tone, or delivery.
        </p>
      </div>
    </AppShell>
  );
}

function QuestionCard({
  question,
}: {
  question: InterviewPrepResult["questions"][number];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-border bg-surface-elevated p-5 shadow-soft">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-3 text-left"
      >
        <ChevronRight
          className={`mt-0.5 h-4 w-4 shrink-0 text-accent-purple transition-transform ${open ? "rotate-90" : ""}`}
        />
        <span className="text-sm font-medium leading-relaxed">
          {question.question}
        </span>
      </button>
      {open && (
        <div className="mt-4 space-y-3 border-t border-border/60 pt-4 text-sm">
          <div>
            <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Why they ask
            </div>
            <p className="mt-1 text-muted-foreground">{question.whyTheyAsk}</p>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Answer framework
            </div>
            <p className="mt-1 text-muted-foreground">
              {question.answerFramework}
            </p>
          </div>
          <div className="rounded-xl bg-success/5 p-3">
            <div className="text-xs font-medium uppercase tracking-widest text-success">
              Strong answer example
            </div>
            <p className="mt-1">{question.strongAnswerExample}</p>
          </div>
          <div className="rounded-xl bg-warning/5 p-3">
            <div className="text-xs font-medium uppercase tracking-widest text-warning">
              Weak-answer warning
            </div>
            <p className="mt-1">{question.weakAnswerWarning}</p>
          </div>
          {question.relatedStarTip && (
            <div className="rounded-xl bg-accent-purple-soft/40 p-3">
              <div className="text-xs font-medium uppercase tracking-widest text-accent-purple">
                STAR tip
              </div>
              <p className="mt-1">{question.relatedStarTip}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
