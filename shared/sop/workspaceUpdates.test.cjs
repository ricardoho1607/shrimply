const test = require("node:test");
const assert = require("node:assert/strict");
const { mergeSopTaskUpdates, mergeSopStatus } = require("./workspaceUpdates.ts");
const { emptySopWorkspace } = require("./client.ts");
test("task deltas update changed rows without discarding history or accepting an older response", () => {
  const tasks = [{ id: "old", revision: 1, status: "completed" }, { id: "live", revision: 3, status: "open" }];
  const next = mergeSopTaskUpdates(tasks, [{ id: "live", revision: 2, status: "submitted" }, { id: "new", revision: 1 }]);
  assert.equal(next.find(t => t.id === "live").revision, 3);
  assert.equal(next.find(t => t.id === "old").status, "completed");
  assert.equal(next.length, 3);
  assert.equal(mergeSopTaskUpdates(next, [], ["live"]).length, 2);
});
test("status refresh retains definitions and combines notification deltas", () => {
  const before = { ...emptySopWorkspace(), sops: [{ id: "guide" }], notifications: [{ id: "old", createdAt: 1 }, { id: "changed", createdAt: 2, read: false }] };
  const next = mergeSopStatus(before, { notificationDelta: true, notifications: [{ id: "changed", createdAt: 2, read: true }, { id: "new", createdAt: 3 }], issues: [{ id: "issue" }] });
  assert.equal(next.sops[0].id, "guide");
  assert.equal(next.notifications.length, 3);
  assert.equal(next.notifications.find(n => n.id === "changed").read, true);
  assert.equal(next.notifications[0].id, "new");
});
test("technician status refresh removes cached work for lost assignments", () => {
  const before = { ...emptySopWorkspace(), tasks: [{ id: "private", target: { scope: "pond", blockId: "lost" } }, { id: "company", target: { scope: "company" } }] };
  assert.deepEqual(mergeSopStatus(before, { blocks: [] }, "technician", "enterprise").tasks.map(t => t.id), ["company"]);
});
