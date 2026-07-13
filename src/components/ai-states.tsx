import { useEffect, useRef, useState } from "react";
import { AlertTriangle, RefreshCw, Clock } from "lucide-react";
import { Mascot } from "@/components/mascot";

/**
 * Shared "AI is thinking" state. The old version was a static skeleton pulse with one
 * caption — fine, but boring, and gave no sense that anything was actually happening.
 * This rotates through real stage labels and keeps the mascot animated so the wait reads
 * as progress rather than a stall.
 */
export function AiLoadingState({
  stages,
  subject,
}: {
  stages: string[];
  subject: string;
}) {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    setStageIndex(0);
    const id = setInterval(() => {
      setStageIndex((i) => Math.min(i + 1, stages.length - 1));
    }, 2200);
    return () => clearInterval(id);
  }, [stages.length]);

  const progressPct = ((stageIndex + 1) / stages.length) * 100;

  return (
    <div
      className="mx-auto flex max-w-lg flex-col items-center px-6 py-28 text-center"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="animate-[float_3.2s_ease-in-out_infinite]">
        <Mascot size={88} mood="point" />
      </div>
      <h2 className="mt-6 font-display text-2xl">Working on it</h2>
      <p className="mt-2 min-h-[1.5rem] text-sm text-muted-foreground transition-opacity">
        {stages[stageIndex]}
      </p>
      <p className="text-xs text-muted-foreground/70">{subject}</p>
      <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-purple-gradient transition-[width] duration-700 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="mt-8 grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="h-20 animate-pulse rounded-2xl border border-border bg-surface-elevated" />
        <div className="h-20 animate-pulse rounded-2xl border border-border bg-surface-elevated" />
      </div>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}

/**
 * Like AiLoadingState, but driven by real progress instead of a timer. Roadmap and
 * Interview Prep are now built from several small, sequential Groq calls (a skeleton/
 * category list, then one call per branch/category) — this shows each step as
 * pending/active/done as it genuinely happens, so a ~30-60s wait reads as real progress,
 * not a guess at how long five separate network calls might take.
 */
export interface StagedStep {
  label: string;
  status: "pending" | "active" | "done" | "error";
}

export function AiStagedProgress({
  steps,
  subject,
}: {
  steps: StagedStep[];
  subject: string;
}) {
  const doneCount = steps.filter((s) => s.status === "done").length;
  const progressPct = Math.max(6, (doneCount / steps.length) * 100);

  return (
    <div
      className="mx-auto flex max-w-lg flex-col items-center px-6 py-28 text-center"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="animate-[float_3.2s_ease-in-out_infinite]">
        <Mascot size={88} mood="point" />
      </div>
      <h2 className="mt-6 font-display text-2xl">Working on it</h2>
      <p className="mt-2 text-sm text-muted-foreground">{subject}</p>
      <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-purple-gradient transition-[width] duration-700 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <ul className="mt-6 w-full space-y-2 text-left">
        {steps.map((step, i) => (
          <li
            key={`${step.label}-${i}`}
            className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
              step.status === "done"
                ? "border-success/30 bg-success/5 text-foreground"
                : step.status === "active"
                  ? "border-accent-purple/40 bg-accent-purple-soft/40 text-foreground"
                  : step.status === "error"
                    ? "border-destructive/30 bg-destructive/5 text-muted-foreground"
                    : "border-border bg-surface-elevated text-muted-foreground"
            }`}
          >
            {step.status === "done" ? (
              <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-success text-[10px] text-white">
                ✓
              </span>
            ) : step.status === "active" ? (
              <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-accent-purple border-t-transparent" />
            ) : step.status === "error" ? (
              <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-destructive/70 text-[10px] text-white">
                !
              </span>
            ) : (
              <span className="h-4 w-4 shrink-0 rounded-full border-2 border-border" />
            )}
            <span className="min-w-0 truncate">{step.label}</span>
          </li>
        ))}
      </ul>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}

const FRIENDLY_MESSAGE: Record<string, string> = {
  config:
    "The AI service isn't configured on the server yet (missing API key).",
  "rate-limit": "The AI service is busy right now.",
  timeout: "The AI request took too long and timed out.",
  network: "We couldn't reach the AI service.",
  validation: "The AI returned a response we couldn't validate safely.",
  unknown: "Something went wrong running this step.",
};

export function AiErrorState({
  kind,
  message,
  retryAfterSeconds,
  onRetry,
}: {
  kind: string;
  message: string;
  retryAfterSeconds?: number;
  onRetry: () => void;
}) {
  const [remaining, setRemaining] = useState(
    kind === "rate-limit" ? Math.ceil(retryAfterSeconds ?? 8) : 0,
  );
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (kind !== "rate-limit") return;
    startedAt.current = Date.now();
    setRemaining(Math.ceil(retryAfterSeconds ?? 8));
    const id = setInterval(() => {
      const elapsed = (Date.now() - startedAt.current) / 1000;
      setRemaining(Math.max(0, Math.ceil((retryAfterSeconds ?? 8) - elapsed)));
    }, 1000);
    return () => clearInterval(id);
  }, [kind, retryAfterSeconds]);

  const waiting = kind === "rate-limit" && remaining > 0;

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-32 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h2 className="mt-5 font-display text-2xl">
        {FRIENDLY_MESSAGE[kind] ?? FRIENDLY_MESSAGE.unknown}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        Your resume and job description are unchanged — nothing was lost.
      </p>
      <button
        onClick={onRetry}
        disabled={waiting}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
      >
        {waiting ? (
          <>
            <Clock className="h-4 w-4" /> Try again in {remaining}s
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" /> Try again
          </>
        )}
      </button>
    </div>
  );
}
