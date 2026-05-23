import type { RequirementTask } from "@/types";
import type { ProgressState } from "@/types";

export function taskChecklistProgress(
  task: RequirementTask,
  checklist: Record<string, boolean>,
) {
  const total = task.checklist.length;
  if (total === 0) return 100;
  const done = task.checklist.filter((c) => checklist[c.id]).length;
  return Math.round((done / total) * 100);
}

export function computeOverallStats(
  tasks: RequirementTask[],
  state: ProgressState,
  criticalOnly = false,
) {
  const filtered = criticalOnly
    ? tasks.filter((t) => t.priority === "critical")
    : tasks;

  let checklistTotal = 0;
  let checklistDone = 0;
  let tasksDone = 0;
  let tasksInProgress = 0;

  for (const task of filtered) {
    const status = state.tasks[task.id] ?? "todo";
    if (status === "done") tasksDone++;
    if (status === "in_progress") tasksInProgress++;

    for (const item of task.checklist) {
      checklistTotal++;
      if (state.checklist[item.id]) checklistDone++;
    }
  }

  const taskPct =
    filtered.length === 0
      ? 0
      : Math.round((tasksDone / filtered.length) * 100);
  const checklistPct =
    checklistTotal === 0
      ? 0
      : Math.round((checklistDone / checklistTotal) * 100);

  return {
    tasksTotal: filtered.length,
    tasksDone,
    tasksInProgress,
    taskPct,
    checklistTotal,
    checklistDone,
    checklistPct,
    combinedPct: Math.round((taskPct + checklistPct) / 2),
  };
}
