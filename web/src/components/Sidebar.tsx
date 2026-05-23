import {
  BookOpen,
  Calendar,
  FileText,
  Lightbulb,
  Mic,
  Shield,
  Sparkles,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { categories } from "@/data/categories";
import { requirements } from "@/data/requirements";
import { computeOverallStats } from "@/lib/progress-stats";
import type { ProgressState, RequirementCategory, UnifiedScrapeIndex } from "@/types";

const iconMap = {
  shield: Shield,
  video: Video,
  "file-text": FileText,
  calendar: Calendar,
  mic: Mic,
  sparkles: Sparkles,
  lightbulb: Lightbulb,
  book: BookOpen,
} as const;

export function Sidebar({
  activeCategory,
  activeTaskId,
  onSelectCategory,
  onSelectTask,
  state,
  scrapeMeta,
  selectedLibraryPageName,
  onSelectLibraryPage,
}: {
  activeCategory: RequirementCategory | "all" | "workflow";
  activeTaskId: string | null;
  onSelectCategory: (c: RequirementCategory | "all" | "workflow") => void;
  onSelectTask: (id: string) => void;
  state: ProgressState;
  scrapeMeta?: UnifiedScrapeIndex | null;
  selectedLibraryPageName?: string | null;
  onSelectLibraryPage?: (name: string) => void;
}) {
  const critical = computeOverallStats(requirements, state, true);
  const libraryPages = scrapeMeta ? Object.keys(scrapeMeta.pagesByName).sort() : [];

  return (
    <aside className="flex h-full min-h-0 w-[220px] shrink-0 flex-col border-r border-[var(--color-border)] bg-[#0a0a0c]">
      <div className="border-b border-[var(--color-border)] px-3 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#5e6ad2] to-[#4a52a8] text-xs font-bold text-white shadow-lg shadow-[#5e6ad2]/20">
            IP
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold tracking-tight">IPGCE</h1>
            <p className="text-[10px] text-[var(--color-muted-foreground)]">Module tracker</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-muted)]">
            <div
              className="h-full rounded-full bg-[#5e6ad2] transition-all duration-500"
              style={{ width: `${critical.combinedPct}%` }}
            />
          </div>
          <span className="text-[10px] font-medium tabular-nums text-[#a8b0ff]">
            {critical.combinedPct}%
          </span>
        </div>
        <p className="mt-1 text-[10px] text-[var(--color-muted-foreground)]">Critical path</p>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-1.5 py-2">
        <NavItem
          active={activeCategory === "workflow"}
          onClick={() => onSelectCategory("workflow")}
          label="Recommended order"
        />
        <NavItem
          active={activeCategory === "all"}
          onClick={() => onSelectCategory("all")}
          label="All requirements"
        />

        <p className="mb-1 mt-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Categories
        </p>

        {categories.map((cat) => {
          const Icon = iconMap[cat.icon as keyof typeof iconMap];
          const catTasks = requirements.filter((t) => t.category === cat.id);
          const done = catTasks.filter(
            (t) => (state.tasks[t.id] ?? "todo") === "done",
          ).length;
          const expanded =
            activeCategory === cat.id ||
            catTasks.some((t) => t.id === activeTaskId);

          return (
            <div key={cat.id} className="mb-0.5">
              <NavItem
                active={activeCategory === cat.id}
                onClick={() => onSelectCategory(cat.id)}
                label={cat.label}
                icon={<Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />}
                badge={`${done}/${catTasks.length}`}
              />
              {expanded &&
                catTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onSelectTask(task.id)}
                    className={cn(
                      "ml-5 flex w-[calc(100%-1.25rem)] items-center gap-2 rounded-md py-1.5 pl-2 pr-2 text-left text-[11px] leading-tight transition-colors",
                      activeTaskId === task.id
                        ? "bg-[var(--color-accent)] font-medium text-[var(--color-foreground)]"
                        : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]/50 hover:text-[var(--color-foreground)]",
                    )}
                  >
                    <StatusDot status={state.tasks[task.id] ?? "todo"} />
                    <span className="line-clamp-2">{task.title}</span>
                  </button>
                ))}
            </div>
          );
        })}
      </nav>

      {libraryPages.length > 0 && onSelectLibraryPage && (
        <div className="flex max-h-[38%] min-h-0 shrink-0 flex-col border-t border-[var(--color-border)]">
          <p className="shrink-0 px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Scrape library
            <span className="ml-1 font-normal text-zinc-600">({libraryPages.length})</span>
          </p>
          <ul className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
            {libraryPages.map((name) => {
              const entry = scrapeMeta!.pagesByName[name];
              const q = entry.dom?.captureQuality;
              const selected = selectedLibraryPageName === name;
              return (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => onSelectLibraryPage(name)}
                    className={cn(
                      "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[11px] leading-tight transition-colors",
                      selected
                        ? "bg-[var(--color-accent)] font-medium text-[var(--color-foreground)]"
                        : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]/50 hover:text-[var(--color-foreground)]",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{name}</span>
                    {q && (
                      <span
                        className={cn(
                          "shrink-0 rounded px-1 text-[9px] leading-none",
                          q === "rich"
                            ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
                            : q === "placeholder-only"
                              ? "bg-[var(--color-destructive)]/15 text-[#ff9b9e]"
                              : "bg-[var(--color-muted)] text-zinc-500",
                        )}
                      >
                        {q === "placeholder-only" ? "empty" : q === "rich" ? "ok" : "·"}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </aside>
  );
}

function NavItem({
  active,
  onClick,
  label,
  icon,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors",
        active
          ? "bg-[var(--color-accent)] font-medium text-[var(--color-foreground)]"
          : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]/50 hover:text-[var(--color-foreground)]",
      )}
    >
      {icon}
      <span className="flex-1 truncate">{label}</span>
      {badge && (
        <span className="rounded bg-[var(--color-muted)] px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-400">
          {badge}
        </span>
      )}
    </button>
  );
}

function StatusDot({ status }: { status: "todo" | "in_progress" | "done" }) {
  const color =
    status === "done"
      ? "bg-[var(--color-success)]"
      : status === "in_progress"
        ? "bg-[var(--color-warning)]"
        : "bg-zinc-600";
  return <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", color)} />;
}
