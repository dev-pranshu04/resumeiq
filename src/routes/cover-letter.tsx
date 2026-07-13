import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Sparkles, Mail, Copy, Check } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AiErrorState, AiLoadingState } from "@/components/ai-states";
import { useWorkspaceStore } from "@/store/workspace-store";
import { generateCoverLetterFn } from "@/lib/ai/server-functions";
import type { AiCallResult } from "@/lib/ai/server-functions";
import type {
  CoverLetterHook,
  CoverLetterLength,
  CoverLetterResult,
  CoverLetterTone,
} from "@/lib/ai/schemas";

export const Route = createFileRoute("/cover-letter")({
  head: () => ({
    meta: [
      { title: "Cover Letter Studio — ResumeIQ" },
      {
        name: "description",
        content: "Generate a cover letter grounded in your real resume.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CoverLetterPage,
});

type Tone = CoverLetterTone;
type Length = CoverLetterLength;
type Hook = CoverLetterHook;

const TONE_OPTIONS: Tone[] = ["formal", "confident", "warm", "bold"];
const LENGTH_OPTIONS: Length[] = ["short", "medium", "long"];
const HOOK_OPTIONS: Hook[] = ["story", "metric", "mission", "direct"];

function PillGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              value === opt
                ? "bg-purple-gradient text-white shadow-glow"
                : "border border-border bg-surface-elevated text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function CoverLetterPage() {
  const navigate = useNavigate();
  const {
    resumeText,
    targetRole,
    jobDescription: storedJobDescription,
  } = useWorkspaceStore();
  const [jobDescription, setJobDescription] = useState(storedJobDescription);
  const [company, setCompany] = useState("");
  const [hiringManager, setHiringManager] = useState("");
  const [companyResearch, setCompanyResearch] = useState("");
  const [tone, setTone] = useState<Tone>("confident");
  const [length, setLength] = useState<Length>("medium");
  const [hook, setHook] = useState<Hook>("metric");
  const [state, setState] = useState<
    AiCallResult<CoverLetterResult> | { ok: "loading" } | { ok: "idle" }
  >({
    ok: "idle",
  });
  const [copied, setCopied] = useState(false);

  async function run() {
    if (!resumeText) return;
    setState({ ok: "loading" });
    const result = await generateCoverLetterFn({
      data: {
        resumeText,
        jobDescription,
        targetRole,
        company,
        hiringManager,
        companyResearch,
        tone,
        length,
        hook,
      },
    });
    setState(result);
  }

  if (!resumeText) {
    return (
      <AppShell breadcrumb="Cover Letter">
        <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-32 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-accent-purple-soft text-accent-purple">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="mt-5 font-display text-2xl">Upload a resume first</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Cover letters are grounded in your real resume — no fabricated wins.
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
    <AppShell breadcrumb="Cover Letter">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-8 md:grid-cols-2 md:px-10 md:py-10">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-accent-purple">
            <Mail className="h-3.5 w-3.5" /> Cover Letter Studio
          </div>
          <h1 className="mt-2 font-display text-4xl leading-tight">
            Cover Letter Studio
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Grounded in your resume, tuned to the job. Pick a tone, length, and
            hook — no fabricated wins.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Target role
              </label>
              <div className="mt-1.5 rounded-xl border border-border bg-background/50 p-3 text-sm">
                {targetRole}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Company
                </label>
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme, Inc."
                  className="mt-1.5 w-full rounded-xl border border-border bg-background/50 p-3 text-sm outline-none transition-colors focus:border-accent-purple"
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Hiring manager
                </label>
                <input
                  value={hiringManager}
                  onChange={(e) => setHiringManager(e.target.value)}
                  placeholder="optional"
                  className="mt-1.5 w-full rounded-xl border border-border bg-background/50 p-3 text-sm outline-none transition-colors focus:border-accent-purple"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Job description
              </label>
              <textarea
                rows={7}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job description here…"
                className="mt-1.5 w-full resize-y rounded-xl border border-border bg-background/50 p-3 font-mono text-xs leading-relaxed outline-none transition-colors focus:border-accent-purple"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Company research (optional)
              </label>
              <textarea
                rows={3}
                value={companyResearch}
                onChange={(e) => setCompanyResearch(e.target.value)}
                placeholder="Recent launches, mission phrases, culture notes…"
                className="mt-1.5 w-full resize-y rounded-xl border border-border bg-background/50 p-3 text-sm outline-none transition-colors focus:border-accent-purple"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <PillGroup
                label="Tone"
                options={TONE_OPTIONS}
                value={tone}
                onChange={setTone}
              />
              <PillGroup
                label="Length"
                options={LENGTH_OPTIONS}
                value={length}
                onChange={setLength}
              />
              <PillGroup
                label="Hook"
                options={HOOK_OPTIONS}
                value={hook}
                onChange={setHook}
              />
            </div>

            <button
              onClick={run}
              disabled={
                jobDescription.trim().length < 20 || state.ok === "loading"
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-gradient py-2.5 text-sm font-medium text-white shadow-glow transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              <Sparkles className="h-4 w-4" /> Generate letter
            </button>
          </div>
        </div>

        <div>
          {state.ok === "idle" && (
            <div className="grid h-full min-h-[24rem] place-items-center rounded-2xl border border-dashed border-border text-center text-sm text-muted-foreground">
              Your generated letter will appear here.
            </div>
          )}
          {state.ok === "loading" && (
            <AiLoadingState
              stages={[
                "Reading the job description…",
                "Choosing an opening hook…",
                "Drafting the letter…",
              ]}
              subject="Writing a cover letter grounded in your resume"
            />
          )}
          {state.ok === false && (
            <AiErrorState
              kind={state.errorKind}
              message={state.message}
              retryAfterSeconds={state.retryAfterSeconds}
              onRetry={run}
            />
          )}
          {state.ok === true && (
            <div className="rounded-2xl border border-border bg-surface-elevated p-6">
              <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
                <span>
                  {state.data.wordCount} words · {state.data.styleNote}
                </span>
                <button
                  onClick={() => {
                    void navigator.clipboard.writeText(state.data.letter);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs transition-colors hover:text-foreground"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="mt-4 whitespace-pre-line text-sm leading-relaxed">
                {state.data.letter}
              </div>

              {state.data.alternateHooks.length > 0 && (
                <div className="mt-8">
                  <h2 className="font-display text-xl">Alternate hooks</h2>
                  <div className="mt-3 space-y-3">
                    {state.data.alternateHooks.map((h, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-border bg-background/50 p-4"
                      >
                        <div className="text-xs font-medium uppercase tracking-widest text-accent-purple">
                          {h.label}
                        </div>
                        <p className="mt-1.5 text-sm">{h.opening}</p>
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          {h.note}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
