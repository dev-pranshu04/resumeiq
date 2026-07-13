import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  Sparkles,
  Briefcase,
  Plus,
  X,
  ArrowRight as ArrowRightIcon,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AiErrorState, AiLoadingState } from "@/components/ai-states";
import { useWorkspaceStore } from "@/store/workspace-store";
import { judgePortfolioFn } from "@/lib/ai/server-functions";
import type { AiCallResult } from "@/lib/ai/server-functions";
import type { PortfolioJudgeResult } from "@/lib/ai/schemas";

export const Route = createFileRoute("/portfolio-judge")({
  head: () => ({
    meta: [
      { title: "Portfolio Judge — ResumeIQ" },
      {
        name: "description",
        content:
          "Strict, criteria-based grading of every project in your portfolio.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PortfolioJudgePage,
});

const VERDICT_STYLE: Record<string, string> = {
  "hire-signal": "border-success/30 bg-success/5 text-success",
  solid: "border-accent-purple/30 bg-accent-purple-soft/40 text-accent-purple",
  weak: "border-warning/30 bg-warning/5 text-warning",
};

function ScoreCard({
  label,
  value,
  suffix = "/100",
}: {
  label: string;
  value: string | number;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface-elevated p-5">
      <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 font-display text-4xl">
        {value}
        {typeof value === "number" && (
          <span className="text-lg text-muted-foreground">{suffix}</span>
        )}
      </div>
      {typeof value === "number" && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-purple-gradient"
            style={{ width: `${Math.min(100, value)}%` }}
          />
        </div>
      )}
    </div>
  );
}

function CriterionBar({
  label,
  score,
  note,
}: {
  label: string;
  score: number;
  note: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/50 p-4">
      <div className="flex items-center justify-between text-sm font-medium">
        <span>{label}</span>
        <span className="text-muted-foreground">{score}/10</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-purple-gradient"
          style={{ width: `${score * 10}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function PortfolioJudgePage() {
  const navigate = useNavigate();
  const { resumeText, targetRole } = useWorkspaceStore();
  const [extraProjects, setExtraProjects] = useState<string[]>([]);
  const [state, setState] = useState<
    AiCallResult<PortfolioJudgeResult> | { ok: "loading" } | { ok: "idle" }
  >({
    ok: "idle",
  });

  async function run() {
    if (!resumeText) return;
    setState({ ok: "loading" });
    const result = await judgePortfolioFn({
      data: {
        resumeText,
        targetRole,
        extraProjects: extraProjects.filter((p) => p.trim().length > 0),
      },
    });
    setState(result);
  }

  if (!resumeText) {
    return (
      <AppShell breadcrumb="Portfolio Judge">
        <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-32 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-accent-purple-soft text-accent-purple">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="mt-5 font-display text-2xl">Upload a resume first</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We grade every project we find in your resume, plus any you add
            here.
          </p>
          <button
            onClick={() => navigate({ to: "/" })}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-purple-gradient px-5 py-2.5 text-sm font-medium text-white shadow-glow"
          >
            Go upload your resume <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell breadcrumb="Portfolio Judge">
      <div className="mx-auto max-w-5xl px-6 py-8 md:px-10 md:py-10">
        <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-accent-purple">
          <Briefcase className="h-3.5 w-3.5" /> Portfolio & Project Judge
        </div>
        <h1 className="mt-2 font-display text-4xl leading-tight md:text-5xl">
          Portfolio & Project Judge
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          We extract projects from your CV and grade every one against strict
          recruiter rubrics — problem, impact, technical depth, role clarity,
          and more.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
          <div className="rounded-2xl border border-border bg-surface-elevated p-5">
            <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Target role
            </label>
            <div className="mt-1.5 rounded-xl border border-border bg-background/50 p-3 text-sm">
              {targetRole}
            </div>

            <div className="mt-5 flex items-center justify-between">
              <h2 className="font-display text-xl">
                Extra projects (optional)
              </h2>
            </div>
            <div className="mt-3 space-y-3">
              {extraProjects.map((p, i) => (
                <div key={i} className="relative">
                  <textarea
                    rows={3}
                    value={p}
                    onChange={(e) =>
                      setExtraProjects((arr) =>
                        arr.map((existing, idx) =>
                          idx === i ? e.target.value : existing,
                        ),
                      )
                    }
                    placeholder="Describe a project not on your resume…"
                    className="w-full resize-y rounded-xl border border-border bg-background/50 p-3 pr-9 text-sm outline-none transition-colors focus:border-accent-purple"
                  />
                  <button
                    onClick={() =>
                      setExtraProjects((arr) =>
                        arr.filter((_, idx) => idx !== i),
                      )
                    }
                    className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:text-foreground"
                    aria-label="Remove project"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setExtraProjects((arr) => [...arr, ""])}
                className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-border px-4 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" /> Add project
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface-elevated p-5 md:w-56">
            <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Actions
            </div>
            <button
              onClick={run}
              disabled={state.ok === "loading"}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-purple-gradient py-2.5 text-sm font-medium text-white shadow-glow transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              <Sparkles className="h-4 w-4" /> Judge portfolio
            </button>
          </div>
        </div>

        {state.ok === "loading" && (
          <div className="mt-8">
            <AiLoadingState
              stages={[
                "Extracting projects from your resume…",
                "Grading against recruiter rubrics…",
                "Checking coherence across projects…",
              ]}
              subject={`Judging your portfolio for ${targetRole}`}
            />
          </div>
        )}

        {state.ok === false && (
          <div className="mt-8">
            <AiErrorState
              kind={state.errorKind}
              message={state.message}
              retryAfterSeconds={state.retryAfterSeconds}
              onRetry={run}
            />
          </div>
        )}

        {state.ok === true && <PortfolioResults data={state.data} />}
      </div>
    </AppShell>
  );
}

function PortfolioResults({ data }: { data: PortfolioJudgeResult }) {
  return (
    <div className="mt-8 space-y-8">
      <div className="grid gap-4 md:grid-cols-4">
        <ScoreCard label="Portfolio" value={data.portfolioScore} />
        <ScoreCard label="Diversity" value={data.diversityScore} />
        <ScoreCard label="Coherence" value={data.coherenceScore} />
        <ScoreCard
          label="Seniority read"
          value={data.seniorityRead}
          suffix=""
        />
      </div>

      <div>
        <h2 className="font-display text-2xl">Strengths & gaps</h2>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div>
            <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Top strengths
            </div>
            <div className="mt-2 space-y-2">
              {data.topStrengths.map((s, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-success/30 bg-success/5 px-3 py-2 text-sm text-success"
                >
                  {s}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Top gaps
            </div>
            <div className="mt-2 space-y-2">
              {data.topGaps.map((s, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning"
                >
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="font-display text-2xl">Project-by-project judgement</h2>
        <div className="mt-4 space-y-4">
          {data.projects.map((project) => (
            <div
              key={project.id}
              className="rounded-2xl border border-border bg-surface-elevated p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    From {project.source === "cv" ? "CV" : "extra project"} ·
                    Verdict:{" "}
                    <span
                      className={`rounded-full border px-2 py-0.5 ${VERDICT_STYLE[project.verdict]}`}
                    >
                      {project.verdict}
                    </span>
                  </div>
                  <h3 className="mt-2 font-display text-2xl">{project.name}</h3>
                  <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                    {project.summary}
                  </p>
                </div>
                <div className="font-display text-3xl">
                  {project.score}
                  <span className="text-base text-muted-foreground">/100</span>
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <CriterionBar
                  label="Problem Framing"
                  {...project.problemFraming}
                />
                <CriterionBar
                  label="Impact Metrics"
                  {...project.impactMetrics}
                />
                <CriterionBar
                  label="Technical Depth"
                  {...project.technicalDepth}
                />
                <CriterionBar label="Presentation" {...project.presentation} />
                <CriterionBar
                  label="Role Relevance"
                  {...project.roleRelevance}
                />
              </div>
              <div className="mt-4 rounded-xl bg-accent-purple-soft/40 p-4">
                <div className="text-xs font-medium uppercase tracking-widest text-accent-purple">
                  Rewrite suggestion
                </div>
                <p className="mt-1 text-sm">{project.rewriteSuggestion}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {data.nextMoves.length > 0 && (
        <div>
          <h2 className="font-display text-2xl">Next moves</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {data.nextMoves.map((m, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-xl border border-border bg-surface-elevated px-4 py-3 text-sm"
              >
                <ArrowRightIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-purple" />
                {m}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
