import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Linkedin, Copy, Check } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AiErrorState, AiLoadingState } from "@/components/ai-states";
import { useWorkspaceStore } from "@/store/workspace-store";
import { optimizeLinkedinFn } from "@/lib/ai/server-functions";
import type { AiCallResult } from "@/lib/ai/server-functions";
import type { LinkedinOptimizerResult } from "@/lib/ai/schemas";

export const Route = createFileRoute("/linkedin-optimizer")({
  head: () => ({
    meta: [
      { title: "LinkedIn Optimizer — ResumeIQ" },
      {
        name: "description",
        content:
          "Rewrite and score your LinkedIn profile against SSI-style pillars.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LinkedinOptimizerPage,
});

function ScoreBar({
  label,
  value,
  tip,
}: {
  label: string;
  value: number;
  tip?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm font-medium">
        <span>{label}</span>
        <span className="text-muted-foreground">{value}/100</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-purple-gradient"
          style={{ width: `${value}%` }}
        />
      </div>
      {tip && <p className="mt-1.5 text-xs text-muted-foreground">{tip}</p>}
    </div>
  );
}

function CopyIconButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface-elevated px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
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

function LinkedinOptimizerPage() {
  const { targetRole } = useWorkspaceStore();
  const [currentHeadline, setCurrentHeadline] = useState("");
  const [aboutSection, setAboutSection] = useState("");
  const [experienceBullets, setExperienceBullets] = useState("");
  const [skills, setSkills] = useState("");
  const [state, setState] = useState<
    AiCallResult<LinkedinOptimizerResult> | { ok: "loading" } | { ok: "idle" }
  >({
    ok: "idle",
  });

  async function run() {
    setState({ ok: "loading" });
    const result = await optimizeLinkedinFn({
      data: {
        targetRole,
        currentHeadline,
        aboutSection,
        experienceBullets,
        skills,
      },
    });
    setState(result);
  }

  const hasAnyInput =
    aboutSection.trim().length > 0 ||
    experienceBullets.trim().length > 0 ||
    skills.trim().length > 0;

  return (
    <AppShell breadcrumb="LinkedIn Optimizer">
      <div className="mx-auto max-w-5xl px-6 py-8 md:px-10 md:py-10">
        <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-accent-purple">
          <Linkedin className="h-3.5 w-3.5" /> LinkedIn Optimizer
        </div>
        <h1 className="mt-2 font-display text-4xl leading-tight md:text-5xl">
          LinkedIn Optimizer
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Paste what's on your profile. We rewrite for search, storytelling, and
          social proof — and score you against the four SSI pillars.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Target role
            </label>
            <div className="mt-1.5 rounded-xl border border-border bg-background/50 p-3 text-sm">
              {targetRole}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Current headline
            </label>
            <input
              value={currentHeadline}
              onChange={(e) => setCurrentHeadline(e.target.value)}
              placeholder="Your existing headline"
              className="mt-1.5 w-full rounded-xl border border-border bg-background/50 p-3 text-sm outline-none transition-colors focus:border-accent-purple"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              About section
            </label>
            <textarea
              rows={6}
              value={aboutSection}
              onChange={(e) => setAboutSection(e.target.value)}
              placeholder="Paste your About text…"
              className="mt-1.5 w-full resize-y rounded-xl border border-border bg-background/50 p-3 text-sm outline-none transition-colors focus:border-accent-purple"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Experience bullets
            </label>
            <textarea
              rows={6}
              value={experienceBullets}
              onChange={(e) => setExperienceBullets(e.target.value)}
              placeholder="One role per block, bullets included."
              className="mt-1.5 w-full resize-y rounded-xl border border-border bg-background/50 p-3 text-sm outline-none transition-colors focus:border-accent-purple"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Skills (comma-separated)
            </label>
            <textarea
              rows={2}
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="React, TypeScript, Product Design…"
              className="mt-1.5 w-full resize-y rounded-xl border border-border bg-background/50 p-3 text-sm outline-none transition-colors focus:border-accent-purple"
            />
          </div>
          <div className="md:col-span-2">
            <button
              onClick={run}
              disabled={!hasAnyInput || state.ok === "loading"}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-gradient py-2.5 text-sm font-medium text-white shadow-glow transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 md:w-auto md:px-6"
            >
              <Sparkles className="h-4 w-4" /> Optimize profile
            </button>
          </div>
        </div>

        {state.ok === "loading" && (
          <div className="mt-8">
            <AiLoadingState
              stages={[
                "Scoring SSI pillars…",
                "Drafting headline variants…",
                "Rewriting your About section…",
              ]}
              subject="Optimizing your LinkedIn profile"
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

        {state.ok === true && <LinkedinResults data={state.data} />}
      </div>
    </AppShell>
  );
}

function LinkedinResults({ data }: { data: LinkedinOptimizerResult }) {
  return (
    <div className="mt-8 space-y-8">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface-elevated p-6">
          <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Completeness
          </div>
          <div className="mt-2 font-display text-5xl">
            {data.completeness}
            <span className="text-lg text-muted-foreground">/100</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-purple-gradient"
              style={{ width: `${data.completeness}%` }}
            />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface-elevated p-6">
          <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            SSI-style pillars
          </div>
          <div className="mt-3 space-y-4">
            <ScoreBar
              label="Brand"
              value={data.pillars.brand.score}
              tip={data.pillars.brand.tip}
            />
            <ScoreBar
              label="Insights"
              value={data.pillars.insights.score}
              tip={data.pillars.insights.tip}
            />
            <ScoreBar
              label="People"
              value={data.pillars.people.score}
              tip={data.pillars.people.tip}
            />
            <ScoreBar
              label="Relationships"
              value={data.pillars.relationships.score}
              tip={data.pillars.relationships.tip}
            />
          </div>
        </div>
      </div>

      <div>
        <h2 className="font-display text-2xl">Headline variants</h2>
        <div className="mt-3 space-y-2">
          {data.headlineVariants.map((h, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface-elevated p-4 text-sm"
            >
              <span>{h}</span>
              <CopyIconButton text={h} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-display text-2xl">About — rewrite</h2>
        <div className="mt-3 rounded-2xl border border-border bg-surface-elevated p-6">
          <div className="flex items-start justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              {data.aboutRewrite.strategyNote}
            </p>
            <CopyIconButton text={data.aboutRewrite.text} />
          </div>
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed">
            {data.aboutRewrite.text}
          </p>
        </div>
      </div>

      {data.experienceRewrites.length > 0 && (
        <div>
          <h2 className="font-display text-2xl">Experience rewrites</h2>
          <div className="mt-3 space-y-4">
            {data.experienceRewrites.map((exp, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border bg-surface-elevated p-6"
              >
                <div className="text-xs font-medium uppercase tracking-widest text-accent-purple">
                  {exp.roleTitle}
                </div>
                <p className="mt-2 text-sm text-muted-foreground line-through decoration-muted-foreground/50">
                  {exp.before}
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {exp.bullets.map((b, bi) => (
                    <li key={bi}>{b}</li>
                  ))}
                </ul>
                {exp.addedTags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {exp.addedTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-accent-purple-soft/40 px-3 py-1 text-xs text-accent-purple"
                      >
                        +{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-display text-2xl">Skills tuning</h2>
        <div className="mt-3 grid gap-6 md:grid-cols-2">
          <div>
            <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Add
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.skillsToAdd.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-success/30 bg-success/5 px-3 py-1 text-xs text-success"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Remove
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.skillsToRemove.map((s) => (
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

      {data.searchAppearanceTips.length > 0 && (
        <div>
          <h2 className="font-display text-2xl">Search appearance tips</h2>
          <div className="mt-3 space-y-2">
            {data.searchAppearanceTips.map((tip, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-surface-elevated p-4 text-sm"
              >
                {tip}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
