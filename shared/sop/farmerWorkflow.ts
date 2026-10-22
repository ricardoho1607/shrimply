import type { SopTask } from "./contracts";
import { farmDate } from "./engine";
import { SOP_FIELDS } from "./registry";

/** A link identifies a task, never trusted write parameters. Load it through the scoped service. */
export function waterTaskLink(task: SopTask): string | null {
  if (!["routine", "recheck"].includes(task.purpose) ||
      !["open", "scheduled"].includes(task.status) || !task.target.pondId ||
      !SOP_FIELDS.some(f => f.key === task.step?.check.field && f.key.startsWith("water."))) return null;
  return `/dashboard/water?sopTaskId=${encodeURIComponent(task.id)}`;
}

export function waterTaskContext(task: SopTask, timeZone: string) {
  if (!waterTaskLink(task)) throw new Error("This task no longer needs a water reading. Return to your tasks.");
  const start = task.windowStart || task.dueAt;
  if (!Number.isFinite(start) || !Number.isFinite(task.dueAt) || start > task.dueAt)
    throw new Error("This task has no valid reading date. Ask your manager to check it.");
  return {
    taskId: task.id, title: task.title, pondName: task.target.name,
    pondId: task.target.pondId, cycleId: task.target.cycleId,
    date: farmDate(start, timeZone), field: task.step!.check.field.slice(6),
    windowStart: start, dueAt: task.dueAt, exactTime: task.step!.check.exactTime,
    timeZone,
  };
}
export type WaterTaskContext = ReturnType<typeof waterTaskContext>;

export function assertWaterTaskPond(context: WaterTaskContext, pond: {
  id: string; pondCycleId?: string; cycleId?: string; cycleStatus?: string;
} | undefined) {
  if (!pond || pond.id !== context.pondId || pond.cycleStatus === "ended" ||
      (pond.pondCycleId || pond.cycleId || pond.id) !== context.cycleId)
    throw new Error("This task belongs to a pond cycle that is no longer available. Return to your tasks and ask your manager.");
}
