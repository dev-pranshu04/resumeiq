import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronRight,
  Compass,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Circle,
  Clock,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  AiErrorState,
  AiStagedProgress,
  type StagedStep,
} from "@/components/ai-states";
import { useWorkspaceStore } from "@/store/workspace-store";
import {
  generateRoadmapBranchFn,
  generateRoadmapSkeletonFn,
} from "@/lib/ai/server-functions";
import type { AiCallResult } from "@/lib/ai/server-functions";
import type {
  RoadmapNode,
  RoadmapResult,
  RoadmapSkeletonBranch,
} from "@/lib/ai/schemas";

export const Route = createFileRoute("/roadmap")({
  head: () => ({
    meta: [
      { title: "Career Roadmap — ResumeIQ" },
      {
        name: "description",
        content:
          "An interactive, evidence-based roadmap toward your target role.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RoadmapPage,
});

// Soft overall time budget for the whole staged flow (skeleton + all branch calls). Each
// individual Groq call is now capped at CHUNK_DEADLINE_MS (12s, see server-functions.ts) —
// this caps the *sum* across the whole sequence, so a run of several slow branches can't
// turn into a multi-minute wait. Once the budget is spent, any branches not yet filled get
// a graceful placeholder instead of blocking further — a slow-but-complete roadmap beats a
// stuck one.
const OVERALL_CLIENT_BUDGET_MS = 65_000;

// A deliberate pause between successive branch calls. This exists purely to reduce request
// *density* against Groq's requests-per-minute limit — a separate dimension from the
// per-request token budget fixed earlier. Firing 5-7 branch calls back-to-back as fast as
// each resolves is the worst pattern for an RPM-style limit, even though each individual
// request is comfortably small. A short pause costs very little wall-clock time overall
// (well under a second per branch) but meaningfully lowers how "bursty" the traffic looks.
const INTER_BRANCH_DELAY_MS = 500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function placeholderNode(branch: RoadmapSkeletonBranch): RoadmapNode {
  return {
    id: branch.id,
    title: branch.title,
    kind: branch.kind,
    status: branch.status,
    priority: null,
    difficulty: null,
    estimatedEffort: null,
    evidenceRequired: null,
    recommendedAction: null,
    children: [
      {
        id: `${branch.id}-retry`,
        title:
          "Couldn't generate details for this branch in time — hit Regenerate to retry just this one.",
        kind: branch.kind,
        status: "missing",
        priority: null,
        difficulty: null,
        estimatedEffort: null,
        evidenceRequired: null,
        recommendedAction: null,
        children: [],
      },
    ],
  };
}

function RoadmapPage() {
  const navigate = useNavigate();
  const {
    resumeText,
    resumeFileName,
    jobDescription,
    targetRole,
    roadmap,
    setRoadmapLoading,
    setRoadmapResult,
  } = useWorkspaceStore();
  const [steps, setSteps] = useState<StagedStep[]>([]);
  const runId = useRef(0);

  useEffect(() => {
    if (resumeText && roadmap.status === "idle") {
      void run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeText]);

  async function run() {
    if (!resumeText) return;
    const thisRun = ++runId.current;
    const deadline = Date.now() + OVERALL_CLIENT_BUDGET_MS;
    setRoadmapLoading();
    setSteps([
      { label: `Mapping the ${targetRole} roadmap…`, status: "active" },
    ]);

    const skeleton = await generateRoadmapSkeletonFn({
      data: { resumeText, jobDescription, targetRole },
    });
    if (thisRun !== runId.current) return; // a newer run (regenerate) superseded this one
    if (!skeleton.ok) {
      setSteps((s) => [{ ...s[0], status: "error" }]);
      setRoadmapResult(skeleton as AiCallResult<RoadmapResult>);
      return;
    }

    const branches = skeleton.data.branches;
    setSteps([
      { label: `Mapping the ${targetRole} roadmap…`, status: "done" },
      ...branches.map((b) => ({
        label: `Building "${b.title}"…`,
        status: "pending" as const,
      })),
    ]);

    const filled: RoadmapNode[] = [];
    let successCount = 0;
    for (let i = 0; i < branches.length; i++) {
      if (thisRun !== runId.current) return;
      const branch = branches[i];
      const stepIndex = i + 1;

      if (Date.now() >= deadline) {
        filled.push(placeholderNode(branch));
        setSteps((s) =>
          s.map((step, idx) =>
            idx === stepIndex ? { ...step, status: "error" } : step,
          ),
        );
        continue;
      }

      // Pace requests instead of firing them back-to-back — see INTER_BRANCH_DELAY_MS.
      if (i > 0) await sleep(INTER_BRANCH_DELAY_MS);

      setSteps((s) =>
        s.map((step, idx) =>
          idx === stepIndex ? { ...step, status: "active" } : step,
        ),
      );
      const result = await generateRoadmapBranchFn({
        data: {
          resumeText,
          jobDescription,
          targetRole,
          branchId: branch.id,
          branchTitle: branch.title,
          branchKind: branch.kind,
          branchStatus: branch.status,
        },
      });
      if (thisRun !== runId.current) return;

      if (result.ok) {
        successCount++;
        filled.push({
          id: branch.id,
          title: branch.title,
          kind: branch.kind,
          status: branch.status,
          priority: null,
          difficulty: null,
          estimatedEffort: null,
          evidenceRequired: null,
          recommendedAction: null,
          children: result.data.children,
        });
        setSteps((s) =>
          s.map((step, idx) =>
            idx === stepIndex ? { ...step, status: "done" } : step,
          ),
        );
      } else {
        // One branch failing after its own internal retries shouldn't sink the whole
        // roadmap — fill it with a clear, honest placeholder and keep going.
        filled.push(placeholderNode(branch));
        setSteps((s) =>
          s.map((step, idx) =>
            idx === stepIndex ? { ...step, status: "error" } : step,
          ),
        );
      }
    }

    // Was previously (and incorrectly) inferred from whether a branch's *own* id ended in
    // "-retry" — but that suffix only ever appears on a placeholder's *child* node, never
    // on the branch itself, so that check was always true and this "every branch failed"
    // path could never actually trigger even if all of them had. Tracking real successes
    // as they happen fixes that.
    const anyCompleted = successCount > 0;
    const assembled: RoadmapResult = {
      targetRole: skeleton.data.targetRole,
      generatedFrom: skeleton.data.generatedFrom,
      root: {
        id: "root",
        title: targetRole,
        kind: "root",
        status: branches.every((b) => b.status === "completed")
          ? "completed"
          : branches.every((b) => b.status === "missing")
            ? "missing"
            : "in-progress",
        priority: null,
        difficulty: null,
        estimatedEffort: null,
        evidenceRequired: null,
        recommendedAction: null,
        children: filled,
      },
    };
    if (!anyCompleted) {
      // Every branch failed — this is the rare, genuinely-exhausted case where an error
      // state is actually warranted rather than a roadmap made entirely of placeholders.
      setRoadmapResult({
        ok: false,
        errorKind: "unknown",
        message:
          "Every branch of the roadmap failed to generate after retrying. Please try again.",
      });
      return;
    }
    setRoadmapResult({ ok: true, data: assembled });
  }

  if (!resumeText) {
    return (
      <AppShell breadcrumb="Career Roadmap">
        <EmptyState onAction={() => navigate({ to: "/" })} />
      </AppShell>
    );
  }

  if (roadmap.status === "loading" || roadmap.status === "idle") {
    return (
      <AppShell breadcrumb="Career Roadmap">
        <AiStagedProgress
          steps={steps}
          subject={`Building a roadmap toward ${targetRole} from ${resumeFileName}`}
        />
      </AppShell>
    );
  }

  if (roadmap.status === "error") {
    return (
      <AppShell breadcrumb="Career Roadmap">
        <AiErrorState
          kind={roadmap.error?.kind ?? "unknown"}
          message={roadmap.error?.message ?? "Couldn't build the roadmap."}
          retryAfterSeconds={roadmap.error?.retryAfterSeconds}
          onRetry={run}
        />
      </AppShell>
    );
  }

  const data = roadmap.data as RoadmapResult;

  return (
    <AppShell breadcrumb="Career Roadmap">
      <div className="mx-auto max-w-5xl px-6 py-8 md:px-10 md:py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-accent-purple">
              <Compass className="h-3.5 w-3.5" /> Career Roadmap
            </div>
            <h1 className="mt-2 font-display text-4xl leading-tight md:text-5xl">
              Path to {data.targetRole}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {data.generatedFrom === "resume-and-job"
                ? "Built from your resume and the job description."
                : "Built from your resume only — add a job description for a sharper match."}
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

        {/* Desktop tree */}
        <div className="hidden md:block">
          <RoadmapNodeView node={data.root} depth={0} defaultOpen />
        </div>

        {/* Mobile: flat, grouped list fallback — avoids a tangled tree on small screens */}
        <div className="space-y-4 md:hidden">
          {data.root.children.map((branch) => (
            <MobileBranch key={branch.id} node={branch} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function statusIcon(status: RoadmapNode["status"]) {
  if (status === "completed")
    return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
  if (status === "in-progress")
    return <Clock className="h-3.5 w-3.5 text-warning" />;
  return <Circle className="h-3.5 w-3.5 text-muted-foreground" />;
}

function priorityBadge(priority: RoadmapNode["priority"]) {
  if (!priority) return null;
  const cls =
    priority === "high"
      ? "bg-destructive/15 text-destructive"
      : priority === "medium"
        ? "bg-warning/15 text-warning"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {priority}
    </span>
  );
}

function RoadmapNodeView({
  node,
  depth,
  defaultOpen,
}: {
  node: RoadmapNode;
  depth: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen || depth < 1);
  const hasChildren = node.children.length > 0;

  return (
    <div className={depth > 0 ? "ml-5 border-l border-border/60 pl-5" : ""}>
      <div
        className={`group flex items-center gap-3 rounded-xl border border-border bg-surface-elevated px-4 py-3 shadow-soft ${
          hasChildren ? "cursor-pointer" : ""
        }`}
        onClick={() => hasChildren && setOpen((o) => !o)}
        role={hasChildren ? "button" : undefined}
        tabIndex={hasChildren ? 0 : undefined}
        onKeyDown={(e) => {
          if (hasChildren && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        aria-expanded={hasChildren ? open : undefined}
      >
        {hasChildren ? (
          <ChevronRight
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
          />
        ) : (
          <span className="w-4 shrink-0" />
        )}
        {statusIcon(node.status)}
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {node.title}
        </span>
        {priorityBadge(node.priority)}
        {node.estimatedEffort && (
          <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:inline">
            {node.estimatedEffort}
          </span>
        )}
      </div>

      {open && (node.recommendedAction || node.evidenceRequired) && (
        <div className="ml-7 mt-1 mb-2 rounded-lg bg-accent-purple-soft/30 px-3 py-2 text-xs text-muted-foreground">
          {node.evidenceRequired && (
            <p>Evidence needed: {node.evidenceRequired}</p>
          )}
          {node.recommendedAction && (
            <p className="text-foreground">Action: {node.recommendedAction}</p>
          )}
        </div>
      )}

      {open && hasChildren && (
        <div className="mt-2 space-y-2">
          {node.children.map((child) => (
            <RoadmapNodeView key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function MobileBranch({ node }: { node: RoadmapNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-border bg-surface-elevated p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 text-left"
      >
        {statusIcon(node.status)}
        <span className="flex-1 text-sm font-semibold">{node.title}</span>
        <ChevronRight
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && (
        <ul className="mt-3 space-y-2 border-t border-border/60 pt-3">
          {node.children.map((child) => (
            <li key={child.id} className="flex items-start gap-2 text-sm">
              {statusIcon(child.status)}
              <div className="min-w-0">
                <div className="truncate">{child.title}</div>
                {child.recommendedAction && (
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {child.recommendedAction}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState({ onAction }: { onAction: () => void }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-32 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-accent-purple-soft text-accent-purple">
        <Sparkles className="h-6 w-6" />
      </div>
      <h2 className="mt-5 font-display text-2xl">No resume yet</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Upload a resume on the home page first — the roadmap is built from your
        real experience.
      </p>
      <button
        onClick={onAction}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-purple-gradient px-5 py-2.5 text-sm font-medium text-white shadow-glow"
      >
        Go upload a resume <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
