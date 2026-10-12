const test = require("node:test");
const assert = require("node:assert/strict");
const { emptySopStep } = require("./contracts.ts");
const {
  sopWorkItems,
  isPondReadingTask,
  sopTaskStatus,
} = require("./presentation.ts");
function task(id, change = {}) {
  const step = emptySopStep(id);
  step.check.operator = "present";
  step.severity = "low";
  return {
    id,
    title: `Catat ${id}`,
    instructions: "Instruksi asli",
    status: "open",
    result: "insufficient_evidence",
    purpose: "routine",
    step,
    adoptionId: "adoption",
    assigneeId: "tech",
    windowStart: 100,
    dueAt: 200,
    target: {
      scope: "pond",
      pondId: "cycle-record",
      cycleId: "cycle-a",
      name: "Pond A",
    },
    issueId: "",
    ...change,
  };
}
test("pond readings reduce list clutter without losing tasks or changing source instructions", () => {
  const tasks = [task("ph"), task("do"), task("salinity")],
    before = structuredClone(tasks);
  const items = sopWorkItems(tasks, 150);
  assert.equal(items.length, 1);
  assert.equal(items[0].kind, "readings");
  assert.deepEqual(
    items[0].tasks.map((t) => t.id),
    ["ph", "do", "salinity"],
  );
  assert.deepEqual(tasks, before);
});
test("grouping never combines different ponds, cycles, assignments, windows, or SOPs", () => {
  const base = task("one");
  const different = [
    task("pond", { target: { ...base.target, pondId: "other" } }),
    task("cycle", { target: { ...base.target, cycleId: "other" } }),
    task("staff", { assigneeId: "other" }),
    task("window", { windowStart: 101 }),
    task("due", { dueAt: 201 }),
    task("sop", { adoptionId: "other" }),
  ];
  assert.equal(sopWorkItems([base, ...different], 150).length, 7);
});
test("failures, urgent tasks, follow-ups, reviews and historical work stay individually visible", () => {
  const range = task("range");
  range.step.check.operator = "range";
  const inheritedCritical = task("critical-rule", { severity: "low" });
  inheritedCritical.step.severity = "critical";
  const tasks = [
    inheritedCritical,
    task("uncertain-result", { result: "needs_review" }),
    task("critical", { severity: "critical" }),
    task("failure", { result: "fail" }),
    task("issue", { issueId: "open-issue" }),
    task("corrective", { purpose: "corrective" }),
    task("recheck", { purpose: "recheck" }),
    task("review", { status: "needs_review" }),
    task("review-rule", { requiresHumanReview: true }),
    task("saved", { status: "completed" }),
    task("manual", { purpose: "manual", step: null }),
    range,
  ];
  assert.ok(tasks.every((t) => !isPondReadingTask(t)));
  assert.ok(sopWorkItems(tasks, 150).every((item) => item.kind === "task"));
  assert.deepEqual(
    sopWorkItems(tasks, 150)
      .flatMap((item) => item.tasks)
      .map((t) => t.id)
      .sort(),
    tasks.map((t) => t.id).sort(),
  );
});
test("urgent work is ahead of reading groups, without hiding finished tasks or rewriting results", () => {
  const tasks = [
    task("ph"),
    task("do"),
    task("complete", { status: "completed" }),
    task("repair", { purpose: "corrective" }),
    task("danger", { result: "fail" }),
  ];
  const items = sopWorkItems(tasks, 150);
  assert.deepEqual(
    items.map((item) => item.id),
    ["danger", "repair", "readings-ph", "complete"],
  );
  assert.equal(sopTaskStatus(tasks[0]), "To do");
  assert.equal(sopTaskStatus(tasks[2]), "Done");
  assert.equal(sopTaskStatus(tasks[4]), "Needs attention");
  assert.equal(
    sopTaskStatus(task("review", { status: "needs_review", result: "pass" })),
    "Waiting for review",
  );
  assert.equal(
    sopTaskStatus(task("waived", { status: "waived", result: "fail" })),
    "Not needed",
  );
});
