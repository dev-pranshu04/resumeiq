import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MousePointer2, Bot, Moon, CheckCircle2, XCircle, Trash2, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Mascot } from "@/components/mascot";
import { useUiStore, type CursorStyle } from "@/store/ui-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { getAiStatusFn } from "@/lib/ai/server-functions";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — ResumeIQ" },
      { name: "description", content: "Appearance, cursor, and AI service settings." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <AppShell breadcrumb="Settings">
      <div className="mx-auto max-w-3xl px-6 py-8 md:px-10 md:py-10">
        <h1 className="font-display text-4xl leading-tight md:text-5xl">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">Appearance, cursor, AI service status, and your data.</p>

        <div className="mt-8 space-y-6">
          <CursorSection />
          <AppearanceSection />
          <AiStatusSection />
          <DataSection />
        </div>
      </div>
    </AppShell>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-surface-elevated p-6 shadow-soft">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

const CURSOR_OPTIONS: { value: CursorStyle; label: string; hint: string }[] = [
  { value: "system", label: "System default", hint: "Your browser's normal cursor" },
  { value: "simple", label: "Simple", hint: "A minimal custom-made ring & dot" },
  { value: "mascot", label: "Mascot", hint: "The ResumeIQ robot follows your pointer" },
];

function CursorSection() {
  const { cursorStyle, setCursorStyle } = useUiStore();

  return (
    <SectionCard title="Cursor" description="Switch between your system cursor, a simple custom pointer, or the mascot.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {CURSOR_OPTIONS.map((opt) => {
          const active = cursorStyle === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setCursorStyle(opt.value)}
              className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-colors ${
                active
                  ? "border-accent-purple/50 bg-accent-purple-soft/40 text-accent-purple"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="grid h-12 w-12 place-items-center">
                {opt.value === "mascot" ? (
                  <Mascot size={40} mood="point" />
                ) : opt.value === "simple" ? (
                  <MousePointer2 className="h-6 w-6" />
                ) : (
                  <Bot className="h-6 w-6" />
                )}
              </div>
              <div className="text-xs font-medium text-foreground">{opt.label}</div>
              <div className="text-[11px] leading-snug text-muted-foreground">{opt.hint}</div>
              {active && (
                <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-accent-purple">
                  <CheckCircle2 className="h-3 w-3" /> Active
                </div>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground">
        Move your mouse anywhere on the page to preview. Cursor customization is skipped automatically on touch devices.
      </p>
    </SectionCard>
  );
}

function AppearanceSection() {
  return (
    <SectionCard title="Appearance" description="Light or dark theme, saved to this browser.">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <Moon className="h-4 w-4 text-muted-foreground" />
          Theme
        </div>
        <p className="text-xs text-muted-foreground">Use the sun/moon icon in the top bar to switch instantly.</p>
      </div>
    </SectionCard>
  );
}

function AiStatusSection() {
  const [status, setStatus] = useState<
    | { loading: true }
    | { loading: false; configured: boolean; model: string; fallbackModel: string | null; cachedResults: number }
  >({ loading: true });

  useEffect(() => {
    let cancelled = false;
    getAiStatusFn()
      .then((data) => {
        if (!cancelled) setStatus({ loading: false, ...data });
      })
      .catch(() => {
        if (!cancelled) setStatus({ loading: false, configured: false, model: "unknown", fallbackModel: null, cachedResults: 0 });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SectionCard title="AI service" description="Live status of the Groq connection used for analysis, roadmap, and interview prep.">
      {status.loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking…
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3">
            <span className="text-muted-foreground">API key configured</span>
            {status.configured ? (
              <span className="inline-flex items-center gap-1.5 text-success">
                <CheckCircle2 className="h-4 w-4" /> Yes
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-destructive">
                <XCircle className="h-4 w-4" /> Missing GROQ_API_KEY
              </span>
            )}
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3">
            <span className="text-muted-foreground">Primary model</span>
            <span className="font-mono text-xs">{status.model}</span>
          </div>
          {status.fallbackModel && (
            <div className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3">
              <span className="text-muted-foreground">Rate-limit fallback</span>
              <span className="font-mono text-xs text-right">{status.fallbackModel}</span>
            </div>
          )}
          <div className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3">
            <span className="text-muted-foreground">Cached results this session</span>
            <span>{status.cachedResults}</span>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function DataSection() {
  const reset = useWorkspaceStore((s) => s.reset);
  const [confirming, setConfirming] = useState(false);

  return (
    <SectionCard title="Data" description="Your resume and job description are stored only in this browser.">
      {confirming ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <span>Clear your resume, job description, and all generated results?</span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                reset();
                setConfirming(false);
              }}
              className="rounded-full bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground"
            >
              Clear everything
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" /> Clear workspace data
        </button>
      )}
    </SectionCard>
  );
}
