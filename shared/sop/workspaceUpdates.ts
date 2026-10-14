import type { SopWorkspace } from "./client";
export function mergeSopTaskUpdates(
  tasks: SopWorkspace["tasks"],
  items: SopWorkspace["tasks"],
  removedIds: string[] = [],
): SopWorkspace["tasks"] {
  const removed = new Set(removedIds);
  const merged = new Map(tasks.filter((task) => !removed.has(task.id)).map((task) => [task.id, task]));
  for (const item of items) {
    const existing = merged.get(item.id);
    if (!existing || (item.revision || 0) >= (existing.revision || 0)) merged.set(item.id, item);
  }
  return [...merged.values()];
}

export function mergeSopStatus(previous: SopWorkspace, update: Partial<SopWorkspace>, role?: string, businessSize?: string): SopWorkspace {
  const next = { ...previous, ...update };
  if (update.notificationDelta) {
    const messages = new Map(previous.notifications.map((item) => [item.id, item]));
    for (const item of update.notifications || []) messages.set(item.id, item);
    next.notifications = [...messages.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, 100);
  }
  if (update.issueDelta) {
    const issues = new Map(previous.issues.map((item) => [item.id, item]));
    for (const item of update.issues || []) issues.set(item.id, item);
    next.issues = [...issues.values()];
  }
  if (!next.manage && role === "technician") {
    const blocks = new Set(next.blocks.map((item) => item.id));
    const ponds = new Set(next.ponds.map((item) => item.id));
    const physical = new Set(next.physicalPonds.map((item) => item.id));
    const allowed = (target: SopWorkspace["tasks"][number]["target"]) => target.scope === "company" ||
      (businessSize === "enterprise" ? blocks.has(target.blockId || "") :
        target.pondId ? ponds.has(target.pondId) : physical.has(target.id));
    next.tasks = next.tasks.filter(({ target }) => allowed(target));
    next.issues = next.issues.filter(({ target }) => allowed(target));
    next.adoptions = next.adoptions.map((adoption) => ({ ...adoption, targets: adoption.targets.filter(allowed) }));
  }
  return next;
}
