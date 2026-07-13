import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Sparkles, Target, Copy, Check } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AiErrorState, AiLoadingState } from "@/components/ai-states";
import { useWorkspaceStore } from "@/store/workspace-store";
import { matchJobDescriptionFn } from "@/lib/ai/server-functions";
import type { AiCallResult } from "@/lib/ai/server-functions";
import type { JdMatchResult } from "@/lib/ai/schemas";

export const Route = createFileRoute("/jd-matcher")({
  head: () => ({
    meta: [
      { title: "JD Matcher — ResumeIQ" },
      {
        name: "description",
        content: "Score your resume against a specific job description.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: JdMatcherPage,
});

const IMPORTANCE_STYLE: Record<string, string> = {
  critical: "border-destructive/30 bg-destructive/5 text-destructive",
  important: "border-warning/30 bg-warning/5 text-warning",
  "nice-to-have": "border-border bg-surface-elevated text-muted-foreground",
};

function ScoreCard({
  label,
  value,
  suffix = "/100",
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface-elevated p-5">
      <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 font-display text-4xl">
        {value}
        <span className="text-lg text-muted-foreground">{suffix}</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-purple-gradient"
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-elevated px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function JdMatcherPage() {
  const navigate = useNavigate();
  const {
    resumeText,
    targetRole,
    jobDescription: storedJobDescription,
  } = useWorkspaceStore();
  const [jobDescription, setJobDescription] = useState(storedJobDescription);
  const [state, setState] = useState<
    AiCallResult<JdMatchResult> | { ok: "loading" } | { ok: "idle" }
  >({
    ok: "idle",
  });

  async function run() {
    if (!resumeText) return;
    setState({ ok: "loading" });
    const result = await matchJobDescriptionFn({
      data: { resumeText, jobDescription, targetRole },
    });
    setState(result);
  }

  if (!resumeText) {
    return (
      <AppShell breadcrumb="JD Matcher">
        <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-32 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-accent-purple-soft text-accent-purple">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="mt-5 font-display text-2xl">Upload a resume first</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            JD matching needs your real resume to score against.
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
    <AppShell breadcrumb="JD Matcher">
      <div className="mx-auto max-w-4xl px-6 py-8 md:px-10 md:py-10">
        <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-accent-purple">
          <Target className="h-3.5 w-3.5" /> Job Description Matcher
        </div>
        <h1 className="mt-2 font-display text-4xl leading-tight md:text-5xl">
          Job Description Matcher
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Paste the job you're targeting. We'll score ATS keyword coverage and
          rewrite bullets to match.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
          <div className="rounded-2xl border border-border bg-surface-elevated p-5">
            <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Target role
            </label>
            <div className="mt-1.5 rounded-xl border border-border bg-background/50 p-3 text-sm">
              {targetRole}
            </div>
            <label className="mt-4 block text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Job description
            </label>
            <textarea
              rows={10}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here…"
              className="mt-1.5 w-full resize-y rounded-xl border border-border bg-background/50 p-3 font-mono text-xs leading-relaxed outline-none transition-colors focus:border-accent-purple"
            />
            <div className="mt-1.5 text-right text-xs text-muted-foreground">
              {jobDescription.length} chars
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface-elevated p-5 md:w-56">
            <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Actions
            </div>
            <button
              onClick={run}
              disabled={
                jobDescription.trim().length < 20 || state.ok === "loading"
              }
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-purple-gradient py-2.5 text-sm font-medium text-white shadow-glow transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              <Sparkles className="h-4 w-4" /> Run match
            </button>
          </div>
        </div>

        {state.ok === "loading" && (
          <div className="mt-8">
            <AiLoadingState
              stages={[
                "Scanning ATS keywords…",
                "Comparing skills and tools…",
                "Drafting bullet rewrites…",
              ]}
              subject={`Matching your resume against this job description`}
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

        {state.ok === true && <JdMatchResults data={state.data} />}
      </div>
    </AppShell>
  );
}

function JdMatchResults({ data }: { data: JdMatchResult }) {
  return (
    <div className="mt-8 space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <ScoreCard label="Match score" value={data.matchScore} />
        <ScoreCard
          label="ATS keyword coverage"
          value={data.atsKeywordCoverage}
        />
        <div className="rounded-2xl border border-border bg-surface-elevated p-5">
          <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Verdict
          </div>
          <p className="mt-2 text-sm leading-relaxed">{data.verdict}</p>
        </div>
      </div>

      <div>
        <h2 className="font-display text-2xl">Matched vs missing keywords</h2>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div>
            <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Matched
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.matchedKeywords.map((k) => (
                <span
                  key={k}
                  className="rounded-full border border-success/30 bg-success/5 px-3 py-1 text-xs text-success"
                >
                  {k}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Missing
            </div>
            <div className="mt-2 space-y-2">
              {data.missingKeywords.map((k) => (
                <div
                  key={k.keyword}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${IMPORTANCE_STYLE[k.importance]}`}
                >
                  <span className="text-foreground">{k.keyword}</span>
                  <span className="text-xs">{k.importance}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="font-display text-2xl">Skill gaps</h2>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div>
            <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Hard skills to add
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.hardSkillsToAdd.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-warning/30 bg-warning/5 px-3 py-1 text-xs text-warning"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Soft skills to add
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.softSkillsToAdd.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-warning/30 bg-warning/5 px-3 py-1 text-xs text-warning"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="font-display text-2xl">Bullet rewrites</h2>
        <div className="mt-4 space-y-3">
          {data.bulletRewrites.map((b, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-surface-elevated p-5"
            >
              <p className="text-sm text-muted-foreground line-through decoration-muted-foreground/50">
                {b.before}
              </p>
              <div className="mt-2 flex items-start justify-between gap-4">
                <p className="text-sm font-medium leading-relaxed">{b.after}</p>
                <CopyButton text={b.after} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{b.note}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-display text-2xl">Section-level suggestions</h2>
        <div className="mt-4 space-y-2">
          {data.sectionSuggestions.map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface-elevated px-4 py-3"
            >
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  s.priority === "high"
                    ? "bg-destructive/10 text-destructive"
                    : s.priority === "medium"
                      ? "bg-warning/10 text-warning"
                      : "bg-border text-muted-foreground"
                }`}
              >
                {s.priority}
              </span>
              <span className="text-sm">
                <strong>{s.section}</strong> — {s.suggestion}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
