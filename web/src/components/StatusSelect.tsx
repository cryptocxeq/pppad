import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/types";

const options: { value: TaskStatus; label: string; dot: string }[] = [
  { value: "todo", label: "Backlog", dot: "bg-zinc-500" },
  { value: "in_progress", label: "In progress", dot: "bg-[var(--color-warning)]" },
  { value: "done", label: "Done", dot: "bg-[var(--color-success)]" },
];

export function StatusSelect({
  value,
  onChange,
  className,
}: {
  value: TaskStatus;
  onChange: (v: TaskStatus) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Task status"
      className={cn("flex gap-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] p-0.5", className)}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            value === opt.value
              ? "bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm"
              : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", opt.dot)} />
          {opt.label}
        </button>
      ))}
    </div>
  );
}
