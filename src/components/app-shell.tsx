import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  BarChart3,
  Target,
  Mail,
  Briefcase,
  Linkedin,
  Compass,
  MessagesSquare,
  Settings,
  Sparkles,
  Search,
  Bell,
  User,
  Command,
} from "lucide-react";
import { Mascot } from "@/components/mascot";
import { ThemeToggle } from "@/components/theme-toggle";

// Every item here is a real, working route — none of these are disabled/"Coming soon"
// placeholders. "Resume Studio", "Portfolio", and "Applications" used to silently point at
// /analysis/overview or render as disabled buttons; they're now JD Matcher, Cover Letter,
// Portfolio Judge, and LinkedIn Optimizer, each a genuine page with its own AI flow.
const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/analysis/overview", label: "Analysis Overview", icon: BarChart3 },
  { to: "/jd-matcher", label: "JD Matcher", icon: Target },
  { to: "/cover-letter", label: "Cover Letter", icon: Mail },
  { to: "/portfolio-judge", label: "Portfolio Judge", icon: Briefcase },
  { to: "/linkedin-optimizer", label: "LinkedIn Optimizer", icon: Linkedin },
  { to: "/roadmap", label: "Career Roadmap", icon: Compass },
  { to: "/interview", label: "Interview Prep", icon: MessagesSquare },
] as const;

export function AppShell({
  breadcrumb,
  children,
}: {
  breadcrumb: string;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-surface transition-[width] duration-300 ease-out ${
          expanded ? "w-56" : "w-16"
        }`}
      >
        <Link to="/" className="flex h-16 items-center gap-2.5 px-4">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-purple-gradient text-white shadow-glow">
            <Sparkles className="h-4 w-4" />
          </div>
          {expanded && (
            <span className="truncate text-sm font-semibold tracking-tight">
              ResumeIQ
            </span>
          )}
        </Link>

        <nav className="flex-1 space-y-1 px-2 py-2">
          {nav.map((item) => {
            const active =
              item.to === "/" ? path === "/" : path.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
                  active
                    ? "bg-accent-purple-soft text-accent-purple"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span
                  className={`min-w-0 truncate transition-opacity duration-200 ${
                    expanded ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {item.label}
                </span>
                {!expanded && (
                  <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md border border-border bg-surface-elevated px-2 py-1 text-xs opacity-0 shadow-soft transition-opacity group-hover:opacity-100">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-2">
          <Link
            to="/settings"
            className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
              path.startsWith("/settings")
                ? "bg-accent-purple-soft text-accent-purple"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {expanded && <span className="truncate">Settings</span>}
          </Link>
          {/* Profile lives on the Settings page for now (no separate account system yet) —
              linking here rather than rendering a disabled/dead button. */}
          <Link
            to="/settings"
            className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <User className="h-4 w-4 shrink-0" />
            {expanded && <span className="truncate">Profile</span>}
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="ml-16 flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 grid h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border bg-background/80 px-6 backdrop-blur-lg sm:flex sm:justify-between">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <span className="text-muted-foreground">Analysis</span>
            <span className="text-muted-foreground/50">/</span>
            <span className="truncate font-medium">{breadcrumb}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="hidden items-center gap-2 rounded-full border border-border bg-surface-elevated px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground md:inline-flex">
              <Search className="h-3.5 w-3.5" />
              <span>Search or run command</span>
              <span className="ml-4 inline-flex items-center gap-0.5 rounded border border-border px-1 font-mono text-[10px]">
                <Command className="h-2.5 w-2.5" />K
              </span>
            </button>
            <button
              className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface-elevated text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </button>
            <ThemeToggle />
            <div className="grid h-9 w-9 place-items-center">
              <Mascot size={36} mood="awake" />
            </div>
            <button className="grid h-9 w-9 place-items-center rounded-full bg-purple-gradient text-white shadow-glow">
              <User className="h-4 w-4" />
            </button>
          </div>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
