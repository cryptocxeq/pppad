import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { practicalChecklistGroups } from "@/data/practicalChecklist";
import { requirements } from "@/data/requirements";
import { cn } from "@/lib/utils";

export function SubmissionMilestones({
  checklist,
  onToggle,
  onJumpToTask,
}: {
  checklist: Record<string, boolean>;
  onToggle: (id: string) => void;
  onJumpToTask: (taskId: string) => void;
}) {
  const [open, setOpen] = useState(true);

  const totalItems = practicalChecklistGroups.flatMap((g) => g.items).length;
  const doneItems = practicalChecklistGroups
    .flatMap((g) => g.items)
    .filter((item) => item.checklistIds.every((id) => checklist[id])).length;

  return (
    <div className="border-b border-[var(--color-border)] bg-[var(--color-card)]/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-[var(--color-accent)]/30"
      >
        <span className="text-xs font-medium">
          Practical checklist
          <span className="ml-2 font-normal text-[var(--color-muted-foreground)]">
            {doneItems}/{totalItems}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-[var(--color-muted-foreground)] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="space-y-3 px-2 pb-3">
          {practicalChecklistGroups.map((group) => (
            <GroupSection
              key={group.id}
              group={group}
              checklist={checklist}
              onToggle={onToggle}
              onJumpToTask={onJumpToTask}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GroupSection({
  group,
  checklist,
  onToggle,
  onJumpToTask,
}: {
  group: (typeof practicalChecklistGroups)[number];
  checklist: Record<string, boolean>;
  onToggle: (id: string) => void;
  onJumpToTask: (taskId: string) => void;
}) {
  const done = group.items.filter((i) => i.checklistIds.every((id) => checklist[id])).length;

  return (
    <div>
      <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {group.label}
        <span className="ml-1.5 font-normal text-[var(--color-muted-foreground)]">
          {done}/{group.items.length}
        </span>
      </p>
      <ul className="space-y-0.5">
        {group.items.map((item) => {
          const itemDone = item.checklistIds.every((id) => checklist[id]);
          const taskId = item.taskId ?? findTaskForChecklist(item.checklistIds[0]);

          return (
            <li key={item.id}>
              <div
                role={taskId ? "button" : undefined}
                tabIndex={taskId ? 0 : undefined}
                onClick={() => taskId && onJumpToTask(taskId)}
                onKeyDown={(e) => {
                  if (taskId && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onJumpToTask(taskId);
                  }
                }}
                className={cn(
                  "flex items-start gap-2.5 rounded-md px-2 py-2 transition-colors",
                  itemDone && "opacity-60",
                  taskId && "cursor-pointer hover:bg-[var(--color-accent)]/40",
                )}
              >
                <div
                  className="shrink-0 pt-0.5"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    id={item.id}
                    checked={itemDone}
                    onCheckedChange={() => {
                      const next = !itemDone;
                      for (const cid of item.checklistIds) {
                        if (!!checklist[cid] !== next) onToggle(cid);
                      }
                    }}
                  />
                </div>
                <label
                  htmlFor={item.id}
                  onClick={(e) => e.preventDefault()}
                  className={cn(
                    "min-w-0 flex-1 text-xs leading-snug",
                    itemDone && "line-through",
                    taskId && "pointer-events-none",
                  )}
                >
                  {item.label}
                </label>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function findTaskForChecklist(checklistId: string) {
  return requirements.find((t) => t.checklist.some((c) => c.id === checklistId))?.id;
}
