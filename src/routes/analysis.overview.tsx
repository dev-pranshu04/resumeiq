import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ChevronRight,
  TrendingUp,
  Target,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  RefreshCw,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AiLoadingState, AiErrorState } from "@/components/ai-states";
import { useWorkspaceStore } from "@/store/workspace-store";
import { analyzeResumeFn } from "@/lib/ai/server-functions";
import type { AnalysisResult } from "@/lib/ai/schemas";

const ANALYSIS_STAGES = [
  "Reading your resume…",
  "Comparing it against the job description…",
  "Scoring keywords and formatting…",
  "Estimating interview readiness…",
  "Putting the report together…",
];

export const Route = createFileRoute("/analysis/overview")({
  head: () => ({
    meta: [
      { title: "Analysis Overview — ResumeIQ" },
      { name: "description", content: "How strong is your resume, how well does it match the job, and what to do next." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const [drawer, setDrawer] = useState(false);
  const navigate = useNavigate();
  const { resumeText, resumeFileName, jobDescription, targetRole, analysis, setAnalysisLoading, setAnalysisResult } =
    useWorkspaceStore();

  const canRun = !!resumeText && jobDescription.trim().length >= 20;

  useEffect(() => {
    if (canRun && analysis.status === "idle") {
      void runAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRun]);

  async function runAnalysis() {
    if (!resumeText) return;
    setAnalysisLoading();
    const result = await analyzeResumeFn({ data: { resumeText, jobDescription, targetRole } });
    setAnalysisResult(result);
  }

  if (!resumeText) {
    return (
      <AppShell breadcrumb="Overview">
        <EmptyState
          title="No resume yet"
          body="Upload a resume and a job description on the home page to run an analysis."
          onAction={() => navigate({ to: "/" })}
          actionLabel="Go upload a resume"
        />
      </AppShell>
    );
  }

  if (!canRun) {
    return (
      <AppShell breadcrumb="Overview">
        <EmptyState
          title="Job description needed"
          body="We found your resume, but a job description is needed to run match analysis."
          onAction={() => navigate({ to: "/" })}
          actionLabel="Add a job description"
        />
      </AppShell>
    );
  }

  if (analysis.status === "loading" || analysis.status === "idle") {
    return (
      <AppShell breadcrumb="Overview">
        <AiLoadingState stages={ANALYSIS_STAGES} subject={`Analyzing ${resumeFileName ?? "your resume"} against the job description`} />
      </AppShell>
    );
  }

  if (analysis.status === "error") {
    return (
      <AppShell breadcrumb="Overview">
        <AiErrorState
          kind={analysis.error?.kind ?? "unknown"}
          message={analysis.error?.message ?? "Something went wrong."}
          retryAfterSeconds={analysis.error?.retryAfterSeconds}
          onRetry={runAnalysis}
        />
      </AppShell>
    );
  }

  const data = analysis.data as AnalysisResult;

  return (
    <AppShell breadcrumb="Overview">
      <div className="mx-auto max-w-6xl px-6 py-8 md:px-10 md:py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl leading-tight md:text-5xl">Analysis Overview</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {targetRole} · {resumeFileName}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-elevated px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Change resume
            </Link>
            <button
              onClick={runAnalysis}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground shadow-soft hover:scale-[1.02] transition-transform"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Re-run analysis
            </button>
          </div>
        </div>

        {/* KPI row */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <KpiCard
            label="ATS Score"
            value={String(data.atsScore)}
            foot={data.atsScoreLabel}
            tone="warning"
            progress={data.atsScore}
            highlight
          />
          <KpiCard
            label="Shortlist Range"
            value={`${data.shortlistRange.low}–${data.shortlistRange.high}%`}
            foot={`Confidence · ${cap(data.shortlistRange.confidence)}`}
            tone="purple"
          />
          <KpiCard label="Job Match" value={String(data.jobMatchScore)} foot="Resume vs. job description" tone="default" progress={data.jobMatchScore} />
          <KpiCard label="Readiness" value={String(data.readinessScore)} foot="Overall interview readiness" tone="default" progress={data.readinessScore} />
        </section>

        {/* Hero explain */}
        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr]">
          <div className="rounded-3xl border border-border bg-surface-elevated p-8 shadow-elevated">
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  ATS · {data.atsScoreLabel}
                </div>
                <div className="mt-2 flex items-baseline gap-3">
                  <div className="font-display text-8xl leading-none">{data.atsScore}</div>
                  <div className="text-sm text-muted-foreground">/ 100</div>
                </div>
                <button
                  onClick={() => setDrawer(true)}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-purple hover:underline"
                >
                  Why this number? <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="hidden md:block">
                <RadialGauge value={data.atsScore} />
              </div>
            </div>
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{data.summary}</p>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Callout tone="success" icon={CheckCircle2} label="Your strongest advantage">
                {data.strengths[0] ?? "No standout strength identified yet."}
              </Callout>
              <Callout tone="warning" icon={AlertTriangle} label="Your biggest blocker">
                {data.criticalWeaknesses[0] ?? "No critical weakness identified."}
              </Callout>
            </div>
          </div>

          {/* Primary recommendation */}
          <div className="rounded-3xl border border-accent-purple/40 bg-accent-purple-soft/40 p-8 shadow-elevated">
            <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-accent-purple">
              <Sparkles className="h-3.5 w-3.5" /> Primary recommendation
            </div>
            <h3 className="mt-3 font-display text-2xl leading-snug">
              {data.prioritizedActions[0]?.title ?? "Keep building evidence for this role."}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {data.prioritizedActions[0]?.detail ?? ""}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                to="/roadmap"
                className="inline-flex items-center gap-1.5 rounded-full bg-purple-gradient px-4 py-1.5 text-xs font-medium text-white shadow-glow"
              >
                Open in roadmap <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                to="/interview"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-elevated px-4 py-1.5 text-xs font-medium"
              >
                Prep interview
              </Link>
            </div>
          </div>
        </section>

        {/* Strengths + Gaps */}
        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Top Strengths" icon={CheckCircle2} tone="success">
            {data.strengths.length ? (
              <ul className="space-y-3 text-sm">
                {data.strengths.map((s) => (
                  <li key={s} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No strengths identified yet.</p>
            )}
          </Panel>
          <Panel title="Critical Skill Gaps" icon={AlertTriangle} tone="warning">
            {data.skillGaps.length ? (
              <div className="flex flex-wrap gap-2">
                {data.skillGaps.map((g) => (
                  <span
                    key={g.skill}
                    title={g.whyItMatters}
                    className="group inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/5 px-3 py-1 text-xs text-foreground"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                    {g.skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No major skill gaps detected against this job.</p>
            )}
            <p className="mt-4 text-xs text-muted-foreground">Hover a gap to see why it matters.</p>
          </Panel>
        </section>

        {/* Top Fixes */}
        <section className="mt-6">
          <Panel title="Prioritized Actions" icon={TrendingUp}>
            <ul className="divide-y divide-border/60">
              {data.prioritizedActions.map((f, i) => (
                <li key={f.title} className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-4 py-3">
                  <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{f.title}</div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">{f.detail}</div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                      f.priority === "high"
                        ? "bg-destructive/15 text-destructive"
                        : f.priority === "medium"
                          ? "bg-warning/15 text-warning"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {cap(f.priority)}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </section>

        {/* Interview probability */}
        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
          <Panel title="Missing Keywords" icon={Target}>
            {data.missingKeywords.length ? (
              <ul className="space-y-3 text-sm">
                {data.missingKeywords.slice(0, 6).map((k) => (
                  <li key={k.keyword} className="flex items-start gap-3">
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-accent-purple" />
                    <span>
                      <span className="font-medium">{k.keyword}</span>{" "}
                      <span className="text-xs text-muted-foreground">({k.importance})</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No significant missing keywords found.</p>
            )}
          </Panel>
          <Panel title="Estimated Interview Probability" icon={TrendingUp}>
            <div className="text-center">
              <div className="font-display text-4xl">
                {data.interviewProbability.rangeLow}–{data.interviewProbability.rangeHigh}%
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Confidence: {cap(data.interviewProbability.confidence)}
              </div>
            </div>
            <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              This is an estimate from configured signals, not a guarantee. {data.interviewProbability.highestImpactAction}
            </p>
          </Panel>
        </section>
      </div>

      {/* Explanation drawer */}
      {drawer && <ScoreDrawer data={data} onClose={() => setDrawer(false)} />}
    </AppShell>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ---------- states ---------- */

function EmptyState({
  title,
  body,
  onAction,
  actionLabel,
}: {
  title: string;
  body: string;
  onAction: () => void;
  actionLabel: string;
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-32 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-accent-purple-soft text-accent-purple">
        <Sparkles className="h-6 w-6" />
      </div>
      <h2 className="mt-5 font-display text-2xl">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      <button
        onClick={onAction}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-purple-gradient px-5 py-2.5 text-sm font-medium text-white shadow-glow transition-transform hover:scale-[1.02]"
      >
        {actionLabel} <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ---------- shared ---------- */

function KpiCard({
  label,
  value,
  foot,
  progress,
  tone = "default",
  highlight,
}: {
  label: string;
  value: string;
  foot: string;
  progress?: number;
  tone?: "default" | "warning" | "purple";
  highlight?: boolean;
}) {
  const toneClass =
    tone === "warning" ? "text-warning" : tone === "purple" ? "text-accent-purple" : "text-muted-foreground";
  return (
    <div
      className={`rounded-2xl border p-5 shadow-soft ${
        highlight ? "border-accent-purple/40 bg-accent-purple-soft/20" : "border-border bg-surface-elevated"
      }`}
    >
      <div className={`text-[11px] font-medium uppercase tracking-widest ${toneClass}`}>{label}</div>
      <div className="mt-2 font-display text-4xl leading-none">{value}</div>
      <div className="mt-2 text-xs text-muted-foreground">{foot}</div>
      {typeof progress === "number" && (
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-purple-gradient" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

function Callout({
  tone,
  icon: Icon,
  label,
  children,
}: {
  tone: "success" | "warning";
  icon: typeof CheckCircle2;
  label: string;
  children: React.ReactNode;
}) {
  const cls = tone === "success" ? "text-success bg-success/10" : "text-warning bg-warning/10";
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cls}`}>
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className="mt-2 text-sm leading-relaxed">{children}</p>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  tone,
  action,
  children,
}: {
  title: string;
  icon: typeof CheckCircle2;
  tone?: "success" | "warning";
  action?: string;
  children: React.ReactNode;
}) {
  const tint = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-accent-purple";
  return (
    <div className="rounded-3xl border border-border bg-surface-elevated p-6 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`grid h-7 w-7 place-items-center rounded-lg bg-accent ${tint}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        {action && (
          <button className="inline-flex items-center gap-1 text-xs font-medium text-accent-purple hover:underline">
            {action} <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function RadialGauge({ value }: { value: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  return (
    <svg width="112" height="112" viewBox="0 0 112 112">
      <circle cx="56" cy="56" r={r} stroke="var(--color-border)" strokeWidth="8" fill="none" />
      <circle
        cx="56"
        cy="56"
        r={r}
        stroke="url(#g)"
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={off}
        transform="rotate(-90 56 56)"
      />
      <defs>
        <linearGradient id="g" x1="0" x2="1">
          <stop offset="0%" stopColor="oklch(0.58 0.18 295)" />
          <stop offset="100%" stopColor="oklch(0.68 0.16 260)" />
        </linearGradient>
      </defs>
      <text x="56" y="62" textAnchor="middle" className="fill-foreground font-display" fontSize="24">
        {value}
      </text>
    </svg>
  );
}

function ScoreDrawer({ data, onClose }: { data: AnalysisResult; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm animate-reveal" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-border bg-surface-elevated shadow-elevated animate-reveal">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Explanation</div>
            <div className="font-display text-xl">Overall ATS · {data.atsScore}</div>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-accent" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4">
          {data.scoreBreakdown.map((r) => (
            <details key={r.label} className="group border-b border-border/60 last:border-0">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-2 py-3">
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
                <span className="flex-1 text-sm font-medium">{r.label}</span>
                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full bg-purple-gradient" style={{ width: `${r.score}%` }} />
                </div>
                <span className="w-8 text-right font-mono text-xs text-muted-foreground">{r.score}</span>
              </summary>
              <div className="space-y-2 px-8 pb-4 text-sm text-muted-foreground">
                <p>{r.reason}</p>
                {r.evidence && <p className="text-foreground">Evidence: {r.evidence}</p>}
                <p className="text-success">Suggestion: {r.suggestion}</p>
              </div>
            </details>
          ))}
        </div>
      </aside>
    </div>
  );
}
