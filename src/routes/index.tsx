import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Upload,
  FileText,
  Sparkles,
  ShieldCheck,
  Eye,
  Check,
  X,
  Pencil,
  ChevronRight,
  ChevronDown,
  Circle,
  Target,
  TrendingUp,
  Compass,
  Trophy,
  Zap,
  Lock,
  BarChart3,
} from "lucide-react";
import { Mascot } from "@/components/mascot";
import { HeroScene } from "@/components/hero-scene";
import { ThemeToggle } from "@/components/theme-toggle";
import { useNavigate } from "@tanstack/react-router";
import { parseResumeFile, ResumeParseError } from "@/lib/parsing/resume-parser";
import { useWorkspaceStore } from "@/store/workspace-store";

const TARGET_ROLES = [
  "Machine Learning Engineer",
  "Software Engineer",
  "Data Scientist",
  "Data Analyst",
  "Product Analyst",
  "UI/UX Designer",
  "Other target role",
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ResumeIQ — Land More Interviews with an AI Career OS" },
      {
        name: "description",
        content:
          "Upload your resume, compare it with a job, understand what is blocking you, and get a clear path to improve.",
      },
    ],
  }),
  component: Landing,
});

/* -------------------- HEADER -------------------- */
function Header() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      className={`fixed left-1/2 top-4 z-50 -translate-x-1/2 transition-all duration-300 ${
        scrolled
          ? "w-[min(1120px,calc(100%-2rem))] top-3"
          : "w-[min(1160px,calc(100%-2rem))]"
      }`}
    >
      <nav
        className={`flex items-center justify-between rounded-2xl px-4 py-2.5 transition-all ${
          scrolled ? "glass shadow-soft" : "bg-transparent"
        }`}
      >
        <a href="#top" className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-purple-gradient text-white shadow-glow">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-semibold tracking-tight">ResumeIQ</span>
        </a>
        <div className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#how" className="transition-colors hover:text-foreground">
            How It Works
          </a>
          <a
            href="#features"
            className="transition-colors hover:text-foreground"
          >
            Features
          </a>
          <a
            href="#roadmap"
            className="transition-colors hover:text-foreground"
          >
            Career Roadmap
          </a>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            to="/analysis/overview"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground shadow-soft transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Analyze Resume
          </Link>
        </div>
      </nav>
    </header>
  );
}

/* -------------------- HERO -------------------- */
const rotatingLines = [
  "See what recruiters see.",
  "Fix what ATS systems miss.",
  "Build the profile the role expects.",
];

function Hero() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setIdx((i) => (i + 1) % rotatingLines.length),
      3200,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <section
      id="top"
      className="relative overflow-hidden pt-36 pb-24 md:pt-44 md:pb-32"
    >
      <HeroScene />
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-14 px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="animate-reveal">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated/60 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-purple" />
            AI Career Intelligence
          </div>
          <h1 className="mt-6 font-display text-5xl leading-[1.02] tracking-tight sm:text-6xl md:text-7xl">
            Your Resume Is Not
            <br />
            the Problem.
            <br />
            <span className="italic text-gradient">The Missing Signal Is.</span>
          </h1>
          <div className="mt-5 h-6 text-base text-muted-foreground">
            <span key={idx} className="animate-reveal inline-block">
              {rotatingLines[idx]}
            </span>
          </div>
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            ResumeIQ analyzes your resume against a real job description,
            explains every weakness, rewrites only what is factually supported,
            and creates a personalized career roadmap.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/analysis/overview"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-elevated transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Analyze My Resume
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#preview"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              View Live Product Preview
            </a>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> PDF and DOCX supported
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" /> Groq-powered analysis
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> No fabricated achievements
            </span>
          </div>
        </div>

        <div
          id="analyze"
          className="relative animate-reveal"
          style={{ animationDelay: "120ms" }}
        >
          <HeroUploadCard />
          <div className="pointer-events-none absolute -bottom-6 -left-6 hidden md:block">
            <Mascot size={88} mood="point" />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroUploadCard() {
  const navigate = useNavigate();
  const {
    resumeFileName,
    jobDescription,
    targetRole,
    setResume,
    setJobDescription,
    setTargetRole,
  } = useWorkspaceStore();

  const [step, setStep] = useState<1 | 2 | 3>(resumeFileName ? 2 : 1);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  async function handleFile(file: File) {
    setParseError(null);
    setIsParsing(true);
    try {
      const parsed = await parseResumeFile(file);
      setResume({
        text: parsed.text,
        fileName: parsed.fileName,
        warnings: parsed.warnings,
      });
      setStep(2);
    } catch (error) {
      setParseError(
        error instanceof ResumeParseError
          ? error.message
          : "Something went wrong reading that file.",
      );
    } finally {
      setIsParsing(false);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  function handleRunAnalysis() {
    void navigate({ to: "/analysis/overview" });
  }

  return (
    <div className="relative rounded-3xl border border-border bg-surface-elevated p-2 shadow-elevated">
      <div className="rounded-[20px] bg-surface p-6">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Resume Analysis
          </div>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={`h-1.5 rounded-full transition-all ${
                  step >= (n as 1 | 2 | 3)
                    ? "w-6 bg-accent-purple"
                    : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className="mt-5">
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`group flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-14 transition-all ${
                isDragOver
                  ? "border-accent-purple bg-accent-purple-soft/40"
                  : "border-border bg-background/50 hover:border-accent-purple hover:bg-accent-purple-soft/30"
              }`}
            >
              <input
                type="file"
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                  e.target.value = "";
                }}
              />
              <div className="grid h-12 w-12 place-items-center rounded-full bg-accent-purple-soft text-accent-purple transition-transform group-hover:scale-110">
                {isParsing ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-purple border-t-transparent" />
                ) : (
                  <Upload className="h-5 w-5" />
                )}
              </div>
              <div className="text-center">
                <div className="text-sm font-medium">
                  {isParsing
                    ? "Reading your resume…"
                    : "Drop your resume here, or click to browse"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  PDF, DOCX, or TXT · up to 8MB
                </div>
              </div>
            </label>
            {parseError && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-destructive">
                <AlertTriangleIcon /> {parseError}
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="mt-5 space-y-4 animate-reveal">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-background/50 p-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-success/15 text-success">
                <Check className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">Resume detected</div>
                <div className="truncate text-xs text-muted-foreground">
                  {resumeFileName}
                </div>
              </div>
              <button
                onClick={() => setStep(1)}
                className="text-xs text-muted-foreground underline decoration-dotted hover:text-foreground"
              >
                Replace
              </button>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Paste the job description
              </label>
              <textarea
                rows={4}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full JD here…"
                className="mt-1.5 w-full resize-none rounded-xl border border-border bg-background/50 p-3 text-sm outline-none transition-colors focus:border-accent-purple"
              />
            </div>
            <button
              onClick={() => setStep(3)}
              disabled={jobDescription.trim().length < 20}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              Continue
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="mt-5 space-y-4 animate-reveal">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Target role
              </label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="mt-1.5 w-full appearance-none rounded-xl border border-border bg-background/50 px-3 py-2.5 text-sm outline-none focus:border-accent-purple"
              >
                {TARGET_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleRunAnalysis}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-gradient py-3 text-sm font-medium text-white shadow-glow transition-transform hover:scale-[1.01] active:scale-[0.99]"
            >
              Run Career Analysis
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <p className="text-center text-[11px] text-muted-foreground">
              Your resume stays private. AI never invents experience.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function AlertTriangleIcon() {
  return <span className="mt-0.5 text-destructive">⚠</span>;
}

/* -------------------- TRUST STRIP -------------------- */
function TrustStrip() {
  const items = [
    {
      icon: ShieldCheck,
      title: "Truth-Preserving Rewrites",
      body: "Every suggestion stays grounded in your real experience.",
    },
    {
      icon: Eye,
      title: "Transparent Scoring",
      body: "Every score includes evidence, reasoning, and a fix.",
    },
    {
      icon: Lock,
      title: "Private by Design",
      body: "Sensitive resume content is never exposed in browser logs.",
    },
  ];
  return (
    <section className="border-y border-border/60">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-12 md:grid-cols-3">
        {items.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-purple-soft text-accent-purple">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">{title}</div>
              <div className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                {body}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------- PRODUCT PREVIEW -------------------- */
const tabs = ["Overview", "Optimizer", "Skill Gap", "Career Roadmap"] as const;
type Tab = (typeof tabs)[number];

// How long each tab stays on screen during the auto-cycle, in ms. Long enough to read the
// panel, short enough that the "live" feeling doesn't drag.
const AUTO_ADVANCE_MS = 5200;

function ProductPreview() {
  const [tab, setTab] = useState<Tab>("Overview");
  const [paused, setPaused] = useState(false);
  // Bumping this remounts the progress-bar fill (see key={cycleKey} below) so hovering to
  // pause, then leaving, restarts a clean fill instead of resuming from a stale width.
  const [cycleKey, setCycleKey] = useState(0);

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => {
      setTab((current) => tabs[(tabs.indexOf(current) + 1) % tabs.length]);
      setCycleKey((k) => k + 1);
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [tab, paused]);

  function selectTab(t: Tab) {
    setTab(t);
    setCycleKey((k) => k + 1);
  }

  return (
    <section id="preview" className="mx-auto max-w-6xl px-6 py-24 md:py-32">
      <SectionHeader
        eyebrow="Live Product Preview"
        title="One Resume. A Complete Career View."
        body="ResumeIQ does not just score your resume. It shows what is strong, what is missing, and what to do next."
      />
      <div
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        className="mt-12 overflow-hidden rounded-3xl border border-border bg-surface-elevated shadow-elevated"
      >
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
          <div className="ml-4 flex flex-1 gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => selectTab(t)}
                className={`relative overflow-hidden rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === t
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === t && (
                  <>
                    <span className="absolute inset-0 -z-10 rounded-lg bg-accent" />
                    {/* Auto-advance progress fill — restarts every time this tab becomes
                        active (key={cycleKey} forces a remount so the width animation
                        replays from 0 instead of jumping). Pausing on hover freezes it via
                        animation-play-state rather than unmounting, so it resumes smoothly. */}
                    <span
                      key={cycleKey}
                      className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-accent-purple"
                      style={{
                        animation: `fillTab ${AUTO_ADVANCE_MS}ms linear forwards`,
                        animationPlayState: paused ? "paused" : "running",
                      }}
                    />
                  </>
                )}
                {t}
              </button>
            ))}
          </div>
        </div>
        <div key={`${tab}-${cycleKey}`} className="animate-reveal p-6 md:p-8">
          {tab === "Overview" && <PreviewOverview />}
          {tab === "Optimizer" && <PreviewOptimizer />}
          {tab === "Skill Gap" && <PreviewSkillGap />}
          {tab === "Career Roadmap" && <PreviewRoadmap />}
        </div>
      </div>
      <style>{`
        @keyframes fillTab {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
      `}</style>
    </section>
  );
}

/** Animates a number counting up from 0 to `value` shortly after mount — remounting this
 * component (e.g. via a `key` on its parent) replays the count, which is what makes the
 * auto-cycling preview above feel like it's actively "working" each time a tab returns. */
function useCountUp(value: number, durationMs = 900) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      // ease-out cubic — fast start, gentle settle, reads as "alive" rather than mechanical
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return display;
}

/** A progress bar that animates its fill in from 0 on mount, instead of rendering at full
 * width immediately — small detail, but it's what makes every stat on this preview look
 * like it just finished computing rather than being a frozen screenshot. */
function AnimatedBar({
  value,
  delayMs = 0,
}: {
  value: number;
  delayMs?: number;
}) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(value), delayMs + 30);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-border">
      <div
        className="h-full rounded-full bg-purple-gradient transition-[width] duration-[900ms] ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function PreviewOverview() {
  const atsScore = useCountUp(56);
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <div className="col-span-1 rounded-2xl border border-border bg-background p-6 md:col-span-1">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          ATS Score
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <div className="font-display text-7xl leading-none tabular-nums">
            {atsScore}
          </div>
          <div className="text-sm text-muted-foreground">/ 100</div>
        </div>
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-medium text-warning">
          Fair
        </div>
        <div className="mt-6">
          <AnimatedBar value={56} />
        </div>
      </div>
      <MiniCard
        title="Strongest Signal"
        body="Machine learning research"
        tone="success"
      />
      <MiniCard
        title="Biggest Blocker"
        body="Cloud and deployment evidence"
        tone="warning"
      />
      <MiniCard
        title="Top Strengths"
        list={["ML research", "Applied NLP", "Team mentorship"]}
      />
      <MiniCard
        title="Missing Skills"
        list={["Cloud", "Data engineering", "MLOps"]}
      />
      <MiniCard
        title="Next Action"
        body="Containerize one existing ML project and document its deployment."
        tone="purple"
      />
    </div>
  );
}

function MiniCard({
  title,
  body,
  list,
  tone,
}: {
  title: string;
  body?: string;
  list?: string[];
  tone?: "success" | "warning" | "purple";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "purple"
          ? "text-accent-purple"
          : "text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <div
        className={`text-xs font-medium uppercase tracking-widest ${toneClass}`}
      >
        {title}
      </div>
      {body && <div className="mt-2 text-sm leading-relaxed">{body}</div>}
      {list && (
        <ul className="mt-3 space-y-1.5 text-sm">
          {list.map((i, idx) => (
            <li
              key={i}
              style={{ animationDelay: `${idx * 90}ms` }}
              className="animate-reveal flex items-center gap-2 text-muted-foreground"
            >
              <Circle className="h-1.5 w-1.5 fill-current" /> {i}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PreviewOptimizer() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>Change 1 of 8</span>
        <span>3 reviewed</span>
      </div>
      <div className="rounded-2xl border border-border bg-background p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Before
            </div>
            <p className="mt-2 text-sm leading-relaxed">
              Led ML system design, predictive modelling, and technical roadmap
              for three aerospace research initiatives.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-widest text-accent-purple">
              After
            </div>
            <p className="mt-2 text-sm leading-relaxed">
              Led ML system design, predictive modelling, and roadmap planning
              across three aerospace research initiatives.
            </p>
          </div>
        </div>
        <div className="mt-5 rounded-xl border border-warning/30 bg-warning/5 p-4">
          <div className="text-xs font-medium text-warning">
            Missing evidence
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a verified accuracy, deployment, or research outcome if
            available.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            <X className="h-3.5 w-3.5" /> Reject
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-medium">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground">
            <Check className="h-3.5 w-3.5" /> Accept
          </button>
        </div>
      </div>
    </div>
  );
}

function PreviewSkillGap() {
  const cols = [
    {
      title: "Matched",
      tone: "text-success",
      items: ["Machine Learning", "Python", "NLP", "Computer Vision"],
    },
    {
      title: "Missing",
      tone: "text-warning",
      items: ["Cloud Computing", "Data Engineering", "DevOps", "Scalability"],
    },
    {
      title: "Bonus",
      tone: "text-accent-purple",
      items: ["Research", "Leadership", "Usability Eval"],
    },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {cols.map((c, colIdx) => (
        <div
          key={c.title}
          style={{ animationDelay: `${colIdx * 120}ms` }}
          className="animate-reveal rounded-2xl border border-border bg-background p-5"
        >
          <div
            className={`text-xs font-medium uppercase tracking-widest ${c.tone}`}
          >
            {c.title}
          </div>
          <ul className="mt-3 space-y-2">
            {c.items.map((it, itemIdx) => (
              <li
                key={it}
                style={{
                  animationDelay: `${colIdx * 120 + itemIdx * 80 + 150}ms`,
                }}
                className="animate-reveal rounded-lg border border-border/60 bg-surface-elevated px-3 py-2 text-sm transition-colors hover:border-accent-purple/60"
              >
                {it}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function PreviewRoadmap() {
  return (
    <div className="mx-auto max-w-2xl">
      <RoadmapTree />
    </div>
  );
}

/* -------------------- HOW IT WORKS -------------------- */
function HowItWorks() {
  const steps = [
    {
      n: "01",
      t: "Upload",
      b: "Add your resume and the job description.",
      icon: Upload,
    },
    {
      n: "02",
      t: "Understand",
      b: "ResumeIQ maps your experience, skills, evidence, and missing signals.",
      icon: Eye,
    },
    {
      n: "03",
      t: "Improve",
      b: "Review grounded rewrites and accept, reject, or edit each change.",
      icon: Pencil,
    },
    {
      n: "04",
      t: "Grow",
      b: "Follow a personalized roadmap for skills, projects, and interviews.",
      icon: Compass,
    },
  ];
  return (
    <section id="how" className="mx-auto max-w-6xl px-6 py-24 md:py-32">
      <SectionHeader
        eyebrow="How It Works"
        title="From Resume to Action Plan in Four Steps."
      />
      <div className="relative mt-14">
        <div className="pointer-events-none absolute left-8 top-8 hidden h-[calc(100%-4rem)] w-px bg-gradient-to-b from-transparent via-border to-transparent md:left-1/2 md:top-0 md:h-px md:w-[calc(100%-4rem)] md:bg-gradient-to-r" />
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          {steps.map(({ n, t, b, icon: Icon }) => (
            <div key={n} className="relative">
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-surface-elevated shadow-soft ring-1 ring-border">
                <Icon className="h-4 w-4 text-accent-purple" />
              </div>
              <div className="font-mono text-xs text-muted-foreground">{n}</div>
              <div className="mt-1 font-display text-2xl">{t}</div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {b}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------- CORE OUTCOMES -------------------- */
function CoreOutcomes() {
  const outcomes = [
    {
      icon: BarChart3,
      title: "Understand Your Position",
      body: "Know exactly how your resume performs and why.",
      chips: [
        "ATS Analysis",
        "Resume Impact",
        "Skill Gap",
        "Recruiter Attention",
        "Industry Benchmark",
      ],
    },
    {
      icon: Pencil,
      title: "Improve Your Story",
      body: "Tailor your application without changing the truth.",
      chips: [
        "Optimizer",
        "Resume Twins",
        "Cover Letters",
        "LinkedIn",
        "Versions",
      ],
    },
    {
      icon: Compass,
      title: "Build Missing Evidence",
      body: "Turn missing skills into a practical plan.",
      chips: [
        "Career Roadmap",
        "Intelligence Graph",
        "Project Analyzer",
        "Portfolio",
        "Career Coach",
      ],
    },
    {
      icon: Trophy,
      title: "Win the Interview",
      body: "Prepare for the exact questions your profile will trigger.",
      chips: [
        "Readiness",
        "Resume Questions",
        "Personas",
        "Answer Library",
        "Tracker",
      ],
    },
  ];
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24 md:py-32">
      <SectionHeader
        eyebrow="Core Outcomes"
        title="Everything You Need to Become Interview-Ready."
      />
      <div className="mt-14 space-y-16">
        {outcomes.map((o, i) => (
          <div
            key={o.title}
            className={`grid grid-cols-1 items-center gap-10 md:grid-cols-2 ${
              i % 2 === 1 ? "md:[&>div:first-child]:order-2" : ""
            }`}
          >
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-accent-purple">
                <o.icon className="h-4 w-4" /> Outcome{" "}
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className="mt-4 font-display text-4xl leading-tight">
                {o.title}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                {o.body}
              </p>
              <div className="mt-5 flex flex-wrap gap-1.5">
                {o.chips.map((c) => (
                  <span
                    key={c}
                    className="rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
            <div className="relative overflow-hidden rounded-3xl border border-border bg-surface-elevated p-6 shadow-elevated">
              <div className="absolute inset-0 bg-hero-glow opacity-40" />
              <div className="relative flex items-center gap-3 border-b border-border/60 pb-4">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-purple-soft text-accent-purple">
                  <o.icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">{o.title}</span>
              </div>
              <ul className="relative mt-4 space-y-3">
                {o.chips.slice(0, 4).map((c) => (
                  <li
                    key={c}
                    className="flex items-center gap-2.5 text-sm text-muted-foreground"
                  >
                    <Check className="h-3.5 w-3.5 shrink-0 text-accent-purple" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------- ANALYSIS PREVIEW -------------------- */
function AnalysisPreview() {
  const rows = [
    { label: "Keyword Match", value: 68 },
    { label: "Skills Alignment", value: 62 },
    { label: "Experience Relevance", value: 51 },
    { label: "Resume Impact", value: 48 },
    { label: "Formatting", value: 76 },
    { label: "Job Requirement Coverage", value: 44 },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="mx-auto max-w-6xl px-6 py-24 md:py-32">
      <SectionHeader
        eyebrow="Analysis"
        title="A Score Is Useless Without an Explanation."
      />
      <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-[1fr_1.4fr]">
        <div className="rounded-3xl border border-border bg-surface-elevated p-8 shadow-elevated">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Overall ATS
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <div className="font-display text-8xl leading-none">56</div>
          </div>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-medium text-warning">
            Fair
          </div>
          <div className="mt-6 space-y-2 text-sm text-muted-foreground">
            <div>+ Strong ML foundation</div>
            <div>+ Relevant research experience</div>
            <div>− Limited cloud evidence</div>
            <div>− Weak deployment signals</div>
            <div>− Missing quantified outcomes</div>
          </div>
        </div>
        <div className="rounded-3xl border border-border bg-surface-elevated p-4 shadow-elevated">
          {rows.map((r, i) => (
            <div
              key={r.label}
              className="border-b border-border/60 last:border-0"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-accent"
              >
                <ChevronRight
                  className={`h-4 w-4 text-muted-foreground transition-transform ${open === i ? "rotate-90" : ""}`}
                />
                <span className="flex-1 text-sm font-medium">{r.label}</span>
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-purple-gradient"
                    style={{ width: `${r.value}%` }}
                  />
                </div>
                <span className="w-8 text-right font-mono text-xs text-muted-foreground">
                  {r.value}
                </span>
              </button>
              {open === i && (
                <div className="animate-reveal px-11 pb-4 text-sm text-muted-foreground">
                  Evidence: JD requires deployment metrics not present in
                  current bullets. Fix: add one quantified deployment or
                  outcome. Estimated lift: +6 to +10.
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------- ROADMAP TREE -------------------- */
type Node = { label: string; children?: Node[] };
const roadmap: Node = {
  label: "Machine Learning Engineer",
  children: [
    {
      label: "Foundations",
      children: [
        {
          label: "Mathematics",
          children: [
            { label: "Linear Algebra" },
            { label: "Probability" },
            { label: "Statistics" },
          ],
        },
        {
          label: "Programming",
          children: [{ label: "Python" }, { label: "Data Structures" }],
        },
      ],
    },
    {
      label: "Machine Learning",
      children: [
        { label: "Supervised Learning" },
        { label: "Unsupervised Learning" },
        { label: "Evaluation" },
      ],
    },
    {
      label: "Data Systems",
      children: [
        { label: "SQL" },
        { label: "Data Pipelines" },
        { label: "Warehousing" },
      ],
    },
    {
      label: "Deployment",
      children: [
        { label: "APIs" },
        { label: "Docker" },
        { label: "Cloud" },
        { label: "Monitoring" },
        { label: "MLOps" },
      ],
    },
    {
      label: "Interview Preparation",
      children: [
        { label: "ML Theory" },
        { label: "Coding" },
        { label: "System Design" },
        { label: "Behavioral" },
      ],
    },
  ],
};

function RoadmapNode({
  node,
  depth = 0,
  defaultOpen = false,
}: {
  node: Node;
  depth?: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const hasChildren = !!node.children?.length;
  return (
    <div>
      <button
        onClick={() => hasChildren && setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
      >
        {hasChildren ? (
          <ChevronRight
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
          />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-accent-purple" />
        )}
        <span className={depth === 0 ? "font-display text-lg" : ""}>
          {node.label}
        </span>
      </button>
      {hasChildren && open && (
        <div className="animate-reveal">
          {node.children!.map((c) => (
            <RoadmapNode key={c.label} node={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function RoadmapTree() {
  return (
    <div className="rounded-2xl border border-border bg-background p-3">
      <RoadmapNode node={roadmap} defaultOpen />
    </div>
  );
}

function CareerRoadmapSection() {
  return (
    <section id="roadmap" className="mx-auto max-w-6xl px-6 py-24 md:py-32">
      <SectionHeader
        eyebrow="Career Roadmap"
        title="Your Career Plan, Mapped to the Role."
      />
      <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-[1.1fr_1fr]">
        <div className="rounded-3xl border border-border bg-surface-elevated p-6 shadow-elevated">
          <RoadmapTree />
        </div>
        <div className="rounded-3xl border border-border bg-surface-elevated p-8 shadow-elevated">
          <div className="text-xs font-medium uppercase tracking-widest text-accent-purple">
            Selected · Docker
          </div>
          <h4 className="mt-3 font-display text-3xl">
            Containerize one existing ML project.
          </h4>
          <dl className="mt-6 divide-y divide-border/60 text-sm">
            {[
              ["Status", "Missing"],
              ["Priority", "High"],
              ["Prerequisites", "APIs and Linux basics"],
              ["Why it matters", "Required for reproducible deployment."],
              ["Evidence", "Public repo, Dockerfile, running deployment."],
            ].map(([k, v]) => (
              <div key={k} className="grid grid-cols-[140px_1fr] gap-4 py-3">
                <dt className="text-muted-foreground">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

/* -------------------- TRUST -------------------- */
function TrustSection() {
  const items = [
    [
      "No Fabricated Achievements",
      "ResumeIQ never invents percentages, revenue, acceptance rates, or project outcomes.",
    ],
    [
      "Simulated Attention, Clearly Labelled",
      "Recruiter attention is a heuristic simulation, not biometric eye tracking.",
    ],
    [
      "Estimated Probability, Not a Guarantee",
      "Interview probability is shown as a range with contributing factors.",
    ],
    [
      "Transparent Benchmarks",
      "Benchmarks state whether they are rubric-based or based on a real dataset.",
    ],
  ];
  return (
    <section className="mx-auto max-w-6xl px-6 py-24 md:py-32">
      <SectionHeader
        eyebrow="Transparency"
        title="AI Guidance Without False Promises."
      />
      <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-2">
        {items.map(([t, b]) => (
          <div key={t} className="bg-surface-elevated p-8">
            <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent-purple-soft text-accent-purple">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <h4 className="font-display text-2xl leading-snug">{t}</h4>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {b}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------- FINAL CTA -------------------- */
function FinalCTA() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
      <div className="relative overflow-hidden rounded-[32px] border border-border bg-surface-elevated p-10 shadow-elevated md:p-16">
        <div className="absolute inset-0 bg-hero-glow" />
        <div className="relative grid grid-cols-1 items-center gap-10 md:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground backdrop-blur">
              <Target className="h-3 w-3" /> Ready when you are
            </div>
            <h2 className="mt-5 font-display text-4xl leading-[1.05] md:text-6xl">
              Stop Guessing What Your{" "}
              <span className="italic text-gradient">Resume Is Missing.</span>
            </h2>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              Get a clear analysis, grounded improvements, and a personalized
              path toward your target role.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/analysis/overview"
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground shadow-elevated transition-transform hover:scale-[1.02]"
              >
                Analyze My Resume
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#preview"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-3.5 text-sm font-medium"
              >
                Explore the Product
              </a>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              No invented achievements. No hidden score. No generic advice.
            </p>
          </div>
          <div className="flex justify-center md:justify-end">
            <Mascot size={140} mood="point" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------- FOOTER -------------------- */
function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid h-6 w-6 place-items-center rounded-md bg-purple-gradient text-white">
              <Sparkles className="h-3 w-3" />
            </div>
            <span className="text-sm font-semibold">ResumeIQ</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Career Intelligence, Simplified.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <a href="#features" className="hover:text-foreground">
            Product
          </a>
          <a href="#how" className="hover:text-foreground">
            How It Works
          </a>
          <a href="#" className="hover:text-foreground">
            Privacy
          </a>
          <a href="#" className="hover:text-foreground">
            Terms
          </a>
          <a href="#" className="hover:text-foreground">
            Contact
          </a>
        </nav>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> All systems
            operational
          </span>
          <ThemeToggle />
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-[11px] text-muted-foreground">
        © {new Date().getFullYear()} ResumeIQ
      </div>
    </footer>
  );
}

/* -------------------- SHARED -------------------- */
function SectionHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow && (
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-purple" />
          {eyebrow}
        </div>
      )}
      <h2 className="mt-5 font-display text-4xl leading-[1.05] md:text-5xl">
        {title}
      </h2>
      {body && (
        <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          {body}
        </p>
      )}
    </div>
  );
}

/* -------------------- ROOT -------------------- */
function Landing() {
  // Silence unused imports used conditionally
  void Link;
  void TrendingUp;
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />
      <Hero />
      <TrustStrip />
      <ProductPreview />
      <HowItWorks />
      <CoreOutcomes />
      <AnalysisPreview />
      <CareerRoadmapSection />
      <TrustSection />
      <FinalCTA />
      <Footer />
    </main>
  );
}
