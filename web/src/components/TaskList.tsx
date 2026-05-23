import { formatDeadline } from "@/lib/dates";
import { taskChecklistProgress } from "@/lib/progress-stats";
import { cn } from "@/lib/utils";
import { categories } from "@/data/categories";
import type { ProgressState, RequirementTask } from "@/types";

export function TaskList({
  tasks,
  state,
  selectedId,
  onSelect,
  groupByCategory = false,
  showIndex = false,
}: {
  tasks: RequirementTask[];
  state: ProgressState;
  selectedId: string | null;
  onSelect: (id: string) => void;
  groupByCategory?: boolean;
  showIndex?: boolean;
}) {
  if (groupByCategory) {
    const grouped = categories
      .map((cat) => ({
        cat,
        tasks: tasks.filter((t) => t.category === cat.id),
      }))
      .filter((g) => g.tasks.length > 0);

    return (
      <div className="space-y-5 py-2">
        {grouped.map(({ cat, tasks: catTasks }) => (
          <section key={cat.id}>
            <h3 className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
              {cat.label}
            </h3>
            <TaskRows
              tasks={catTasks}
              state={state}
              selectedId={selectedId}
              onSelect={onSelect}
              showIndex={showIndex}
            />
          </section>
        ))}
      </div>
    );
  }

  return (
    <TaskRows
      tasks={tasks}
      state={state}
      selectedId={selectedId}
      onSelect={onSelect}
      showIndex={showIndex}
    />
  );
}

function TaskRows({
  tasks,
  state,
  selectedId,
  onSelect,
  showIndex,
}: {
  tasks: RequirementTask[];
  state: ProgressState;
  selectedId: string | null;
  onSelect: (id: string) => void;
  showIndex?: boolean;
}) {
  return (
    <ul className="flex flex-col gap-0.5 px-2">
      {tasks.map((task, index) => (
        <TaskRow
          key={task.id}
          task={task}
          state={state}
          selected={selectedId === task.id}
          onSelect={() => onSelect(task.id)}
          index={showIndex ? index : undefined}
        />
      ))}
    </ul>
  );
}

function TaskRow({
  task,
  state,
  selected,
  onSelect,
  index,
}: {
  task: RequirementTask;
  state: ProgressState;
  selected: boolean;
  onSelect: () => void;
  index?: number;
}) {
  const status = state.tasks[task.id] ?? "todo";
  const pct = taskChecklistProgress(task, state.checklist);
  const deadline = formatDeadline(task.deadline);

  const priorityBar =
    task.priority === "critical"
      ? "bg-[var(--color-destructive)]"
      : task.priority === "high"
        ? "bg-[var(--color-warning)]"
        : "bg-transparent";

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "group relative flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
          selected
            ? "bg-[var(--color-accent)] shadow-[inset_2px_0_0_0_var(--color-primary)]"
            : "hover:bg-[var(--color-accent)]/50",
        )}
      >
        <span
          className={cn("absolute left-0 top-2 bottom-2 w-0.5 rounded-full", priorityBar)}
          aria-hidden
        />
        {index !== undefined && (
          <span className="mt-0.5 w-5 shrink-0 text-[11px] tabular-nums text-[var(--color-muted-foreground)]">
            {index + 1}
          </span>
        )}
        <StatusDot status={status} />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-[13px] font-medium leading-snug",
              status === "done" && "text-[var(--color-muted-foreground)] line-through",
            )}
          >
            {task.title}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {deadline && (
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-medium",
                  deadline.isPast
                    ? "bg-[var(--color-destructive)]/15 text-[#ff9b9e]"
                    : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]",
                )}
              >
                {deadline.isPast ? "Overdue" : "Due"} · {deadline.relative}
              </span>
            )}
            {pct > 0 && pct < 100 && (
              <span className="text-[10px] text-[#a8b0ff]">{pct}%</span>
            )}
            {pct === 100 && (
              <span className="text-[10px] text-[var(--color-success)]">Complete</span>
            )}
          </div>
        </div>
      </button>
    </li>
  );
}

function StatusDot({ status }: { status: "todo" | "in_progress" | "done" }) {
  return (
    <span
      className={cn(
        "mt-1.5 h-2 w-2 shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-transparent",
        status === "done" &&
          "bg-[var(--color-success)] ring-[var(--color-success)]/30",
        status === "in_progress" &&
          "bg-[var(--color-warning)] ring-[var(--color-warning)]/30",
        status === "todo" && "bg-zinc-600 ring-zinc-600/20",
      )}
      aria-label={status}
    />
  );
}
