import { Badge } from "@/components/ui/badge";
import { ScrapeExplorer } from "@/components/ScrapeExplorer";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusSelect } from "@/components/StatusSelect";
import { formatDeadline } from "@/lib/dates";
import { taskChecklistProgress } from "@/lib/progress-stats";
import { Progress } from "@/components/ui/progress";
import type { ProgressState, RequirementTask, UnifiedScrapeIndex, UnifiedScrapePage } from "@/types";
import type { TaskStatus } from "@/types";

export function TaskDetail({
  task,
  state,
  unifiedPage,
  scrapeMeta,
  onStatusChange,
  onToggleChecklist,
  onNoteChange,
}: {
  task: RequirementTask;
  state: ProgressState;
  unifiedPage?: UnifiedScrapePage | null;
  scrapeMeta?: UnifiedScrapeIndex | null;
  onStatusChange: (status: TaskStatus) => void;
  onToggleChecklist: (id: string) => void;
  onNoteChange: (note: string) => void;
}) {
  const status = state.tasks[task.id] ?? "todo";
  const checklistPct = taskChecklistProgress(task, state.checklist);
  const deadline = formatDeadline(task.deadline);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <PriorityBadge priority={task.priority} />
            {task.weight && <Badge variant="secondary">{task.weight}</Badge>}
            {deadline && (
              <Badge variant={deadline.isPast ? "destructive" : "warning"}>
                {deadline.isPast ? "Overdue" : "Due"} · {deadline.label}
              </Badge>
            )}
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight leading-tight">
            {task.title}
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-muted-foreground)]">
            {task.summary}
          </p>
        </div>
        <StatusSelect value={status} onChange={onStatusChange} className="shrink-0" />
      </div>

      {task.deadlineNote && (
        <p
          className={
            deadline?.isPast
              ? "mt-4 rounded-lg border border-[var(--color-destructive)]/25 bg-[var(--color-destructive)]/8 px-3.5 py-2.5 text-[13px] leading-relaxed text-[#ff9b9e]"
              : "mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/50 px-3.5 py-2.5 text-[13px] leading-relaxed text-[var(--color-muted-foreground)]"
          }
        >
          {task.deadlineNote}
        </p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <span className="text-xs text-[var(--color-muted-foreground)]">Checklist</span>
        <Progress value={checklistPct} className="max-w-xs flex-1" />
        <span className="text-xs tabular-nums text-[var(--color-muted-foreground)]">
          {checklistPct}%
        </span>
      </div>

      <Tabs defaultValue="checklist" className="mt-6">
        <TabsList>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="steps">Steps</TabsTrigger>
          <TabsTrigger value="scrape">Sources</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="checklist">
          <ul className="space-y-1.5">
            {task.checklist.map((item) => {
              const done = !!state.checklist[item.id];
              return (
                <li
                  key={item.id}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border px-3.5 py-3 transition-colors",
                    done
                      ? "border-[var(--color-border)]/60 bg-transparent opacity-55"
                      : "border-[var(--color-border)] bg-[var(--color-card)] hover:border-zinc-600",
                  )}
                >
                  <Checkbox
                    id={item.id}
                    checked={done}
                    onCheckedChange={() => onToggleChecklist(item.id)}
                    className="mt-0.5"
                  />
                  <label
                    htmlFor={item.id}
                    className={cn(
                      "cursor-pointer text-[13px] leading-snug",
                      done && "line-through decoration-zinc-500",
                    )}
                  >
                    {item.label}
                    {item.detail && (
                      <span className="mt-1 block text-xs text-[var(--color-muted-foreground)] no-underline">
                        {item.detail}
                      </span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        </TabsContent>

        <TabsContent value="steps">
          {task.steps?.length ? (
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
              {task.steps.map((step, i) => (
                <li key={i} className="text-[var(--color-foreground)]">
                  {step}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-[var(--color-muted-foreground)]">No step list for this item.</p>
          )}
          {task.warnings?.length ? (
            <>
              <Separator className="my-4" />
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-destructive)]">
                Warnings
              </p>
              <ul className="space-y-2">
                {task.warnings.map((w, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-[var(--color-destructive)]/25 bg-[var(--color-destructive)]/8 px-3 py-2 text-xs text-[#ff9b9e]"
                  >
                    {w}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {task.contacts?.length ? (
            <>
              <Separator className="my-4" />
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                Contacts
              </p>
              <ul className="space-y-1 text-sm">
                {task.contacts.map((c) => (
                  <li key={c.value}>
                    <span className="text-[var(--color-muted-foreground)]">{c.label}: </span>
                    <a
                      href={`mailto:${c.value}`}
                      className="text-[#a8b0ff] hover:underline"
                    >
                      {c.value}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="scrape">
          <ScrapeExplorer
            page={unifiedPage ?? null}
            scrapeMeta={scrapeMeta ?? null}
            pebblePageLabel={task.pebblePage}
          />
        </TabsContent>

        <TabsContent value="notes">
          <textarea
            value={state.notes[task.id] ?? ""}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Personal notes, blockers, tutor feedback…"
            className="min-h-[120px] w-full resize-y rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PriorityBadge({
  priority,
}: {
  priority: RequirementTask["priority"];
}) {
  const variant =
    priority === "critical"
      ? "destructive"
      : priority === "high"
        ? "warning"
        : "secondary";
  return <Badge variant={variant}>{priority}</Badge>;
}
