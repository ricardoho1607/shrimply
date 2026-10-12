import type { SopTask } from "./contracts";

const finished = (task: SopTask) =>
  ["completed", "waived", "cancelled"].includes(task.status);

export const sopTaskUrgent = (task: SopTask) =>
  task.severity === "critical" || task.step?.severity === "critical";

/** Presentation only: every saved task and its evidence remain independently accessible. */
export function isPondReadingTask(task: SopTask): boolean {
  return (
    task.purpose === "routine" &&
    task.status === "open" &&
    !!task.target.pondId &&
    task.target.scope === "pond" &&
    !!task.step?.check.field.startsWith("water.") &&
    task.step.check.operator === "present" &&
    !sopTaskUrgent(task) &&
    task.result === "insufficient_evidence" &&
    !task.issueId &&
    !task.requiresHumanReview
  );
}

export type SopWorkItem =
  | { kind: "task"; id: string; tasks: [SopTask] }
  | { kind: "readings"; id: string; tasks: SopTask[] };

export function sopWorkItems(tasks: SopTask[], now: number): SopWorkItem[] {
  const items: SopWorkItem[] = [],
    groups = new Map<string, SopWorkItem>();
  for (const task of tasks) {
    if (!isPondReadingTask(task)) {
      items.push({ kind: "task", id: task.id, tasks: [task] });
      continue;
    }
    const key = JSON.stringify([
      task.target.pondId,
      task.target.cycleId,
      task.adoptionId,
      task.assigneeId,
      task.windowStart,
      task.dueAt,
    ]);
    const existing = groups.get(key);
    if (existing) existing.tasks.push(task);
    else {
      const item: SopWorkItem = {
        kind: "readings",
        id: `readings-${task.id}`,
        tasks: [task],
      };
      groups.set(key, item);
      items.push(item);
    }
  }
  const priority = (item: SopWorkItem) => {
    const task = item.tasks[0];
    if (finished(task)) return 4;
    if (sopTaskUrgent(task) || task.result === "fail") return 0;
    if (
      task.purpose === "corrective" ||
      task.purpose === "recheck" ||
      task.status === "needs_review"
    )
      return 1;
    return task.dueAt < now ? 2 : 3;
  };
  return items.sort((a, b) => priority(a) - priority(b));
}

export function sopTaskStatus(task: SopTask): string {
  if (!finished(task) && task.result === "fail") return "Needs attention";
  return (
    {
      open: "To do",
      scheduled: "Later",
      submitted: "Waiting for review",
      needs_review: "Waiting for review",
      completed: "Done",
      waived: "Not needed",
      cancelled: "Stopped",
    } as const
  )[task.status];
}
