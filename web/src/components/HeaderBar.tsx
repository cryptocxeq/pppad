import { ExternalLink, RotateCcw } from "lucide-react";
import { GitHubSync } from "@/components/GitHubSync";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { categories } from "@/data/categories";
import { computeOverallStats } from "@/lib/progress-stats";
import type { SyncStatus } from "@/hooks/useProgress";
import type { ProgressState, RequirementTask, UnifiedScrapeIndex } from "@/types";
import type { RequirementCategory } from "@/types";
import type { GitHubUser } from "@/lib/githubAuth";

type ViewCategory = RequirementCategory | "all" | "workflow";

export function HeaderBar({
  view,
  tasks,
  allTasks,
  state,
  unifiedScrape,
  pebbleUrl,
  onReset,
  isCloudEnabled,
  githubUser,
  gistUrl,
  syncStatus,
  syncError,
  onSignIn,
  onSignOut,
}: {
  view: ViewCategory;
  tasks: RequirementTask[];
  allTasks: RequirementTask[];
  state: ProgressState;
  unifiedScrape?: UnifiedScrapeIndex | null;
  pebbleUrl: string;
  onReset: () => void;
  isCloudEnabled: boolean;
  githubUser: GitHubUser | null;
  gistUrl: string | null;
  syncStatus: SyncStatus;
  syncError: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  const stats = computeOverallStats(allTasks, state, false);
  const critical = computeOverallStats(allTasks, state, true);

  const viewTitle =
    view === "all"
      ? "All requirements"
      : view === "workflow"
        ? "Recommended order"
        : (categories.find((c) => c.id === view)?.label ?? "");

  const viewSubtitle =
    view === "all"
      ? `${tasks.length} tasks`
      : view === "workflow"
        ? `${tasks.length} steps`
        : categories.find((c) => c.id === view)?.description;

  return (
    <header className="shrink-0 border-b border-[var(--color-border)] bg-[#0c0c0f]/80 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight">{viewTitle}</h2>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {viewSubtitle}
            {unifiedScrape?.dom && (
              <>
                {" · "}
                {unifiedScrape.dom.uniquePageCount} scrape pages
                {unifiedScrape.dom.sessionStamp &&
                  ` · ${unifiedScrape.dom.sessionStamp.slice(0, 10)}`}
              </>
            )}
          </p>
        </div>

        <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
          <GitHubSync
            isCloudEnabled={isCloudEnabled}
            githubUser={githubUser}
            gistUrl={gistUrl}
            syncStatus={syncStatus}
            syncError={syncError}
            onSignIn={onSignIn}
            onSignOut={onSignOut}
          />
          <a
            href={pebbleUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--color-border)] px-3 text-xs font-medium text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]"
          >
            PebblePad
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
          <Button variant="outline" size="sm" onClick={onReset} title="Clear all progress">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
      </div>

      <div className="grid gap-px border-t border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-2">
        <ProgressStrip
          label="Overall"
          percent={stats.combinedPct}
          detail={`${stats.checklistDone}/${stats.checklistTotal} items · ${stats.tasksDone}/${stats.tasksTotal} tasks`}
        />
        <ProgressStrip
          label="Critical path"
          percent={critical.combinedPct}
          detail={`${critical.checklistDone}/${critical.checklistTotal} must-submit items`}
          accent
        />
      </div>
    </header>
  );
}

function ProgressStrip({
  label,
  percent,
  detail,
  accent,
}: {
  label: string;
  percent: number;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 bg-[var(--color-background)] px-5 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-medium text-[var(--color-foreground)]">{label}</span>
          <span
            className={
              accent
                ? "text-sm font-semibold tabular-nums text-[#a8b0ff]"
                : "text-sm font-semibold tabular-nums"
            }
          >
            {percent}%
          </span>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-[var(--color-muted-foreground)]">
          {detail}
        </p>
        <Progress value={percent} className="mt-2 h-1" />
      </div>
    </div>
  );
}
