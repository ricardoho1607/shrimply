const test = require("node:test");
const assert = require("node:assert/strict");
const { emptySopStep } = require("./contracts.ts");
const { scheduledOccurrence, validateSop } = require("./engine.ts");
const {
  sopPondStage,
  sopCycleDay,
  obsoleteSopTaskReason,
} = require("./lifecycle.ts");

test("H-20 preparation uses a planned date and never runs on actual stocking day", () => {
  const step = emptySopStep();
  step.stages = ["preparation"];
  step.check = { ...step.check, operator: "present" };
  step.trigger = { ...step.trigger, kind: "doc", docFrom: -20, docTo: -20 };
  assert.deepEqual(
    validateSop({
      title: "Water preparation",
      description: "",
      language: "en",
      steps: [step],
    }),
    [],
  );
  const target = {
    stage: "preparation",
    stockingDate: "",
    plannedStockingDate: "2026-10-31",
  };
  const activated = Date.parse("2026-10-10T00:00:00Z");
  assert.ok(
    scheduledOccurrence(
      step,
      target,
      Date.parse("2026-10-11T07:00:00Z"),
      activated,
      "UTC",
    ),
  );
  assert.equal(
    scheduledOccurrence(
      step,
      { ...target, plannedStockingDate: "" },
      Date.parse("2026-10-11T07:00:00Z"),
      activated,
      "UTC",
    ),
    null,
  );
  assert.equal(
    scheduledOccurrence(
      step,
      { ...target, stage: "stocking", stockingDate: "2026-10-11" },
      Date.parse("2026-10-11T07:00:00Z"),
      activated,
      "UTC",
    ),
    null,
  );
});

test("stocked ponds leave preparation and advance from DOC0 to growout without inventing missing DOC", () => {
  const pond = { docStart: "2026-10-11" };
  assert.equal(sopPondStage(pond, "preparation", "2026-10-11"), "stocking");
  assert.equal(sopPondStage(pond, "stocking", "2026-10-12"), "growout");
  assert.equal(sopPondStage(pond, "harvest", "2026-10-12"), "harvest");
  assert.equal(sopPondStage(null, undefined, "2026-10-11"), "preparation");
  for (const date of ["", "2026-02-30", "not a date"])
    assert.equal(sopCycleDay("2026-10-11", date), null);
});

test("obsolete routine work leaves active to-do without deleting evidence, failures or corrective reviews", () => {
  const step = { ...emptySopStep(), stages: ["preparation"] };
  const task = {
    purpose: "routine",
    status: "open",
    result: "insufficient_evidence",
    issueId: "",
    step,
    target: { cycleId: "" },
  };
  const target = {
    stage: "stocking",
    cycleId: "new-cycle",
    stockingDate: "2026-10-11",
  };
  assert.match(obsoleteSopTaskReason(task, target, "2026-10-11"), /cycle/);
  for (const change of [
    { status: "submitted" },
    { status: "completed" },
    { status: "needs_review" },
    { result: "fail" },
    { issueId: "issue" },
    { purpose: "corrective" },
    { purpose: "recheck" },
  ])
    assert.equal(
      obsoleteSopTaskReason({ ...task, ...change }, target, "2026-10-11"),
      "",
    );
  step.stages = ["growout"];
  step.trigger = { ...step.trigger, kind: "doc", docFrom: 1, docTo: 10 };
  assert.match(
    obsoleteSopTaskReason(
      { ...task, target: { cycleId: "new-cycle" } },
      { ...target, stage: "growout" },
      "2026-10-22",
    ),
    /schedule ended/,
  );
});

test("DOC30 repeat milestones use actual dates per pond in farm time, not a planned date", () => {
  const step = emptySopStep();
  step.trigger = {
    ...step.trigger,
    kind: "doc",
    docFrom: 30,
    docTo: 60,
    everyDays: 5,
    at: "06:00",
  };
  const target = {
    stage: "growout",
    stockingDate: "2026-09-11",
    plannedStockingDate: "2026-09-01",
  };
  const activated = Date.parse("2026-09-01T00:00Z");
  const occurrence = (at) =>
    scheduledOccurrence(
      step,
      target,
      Date.parse(at),
      activated,
      "Australia/Melbourne",
    );
  assert.ok(occurrence("2026-10-10T20:00Z")); // Local Oct 11 is DOC30.
  assert.equal(occurrence("2026-10-11T20:00Z"), null);
  assert.ok(occurrence("2026-10-15T20:00Z")); // DOC35.
  assert.equal(
    scheduledOccurrence(
      step,
      { ...target, stockingDate: "" },
      Date.parse("2026-10-10T20:00Z"),
      activated,
      "Australia/Melbourne",
    ),
    null,
  );
});

test("preparation schedules cannot cross DOC0 or assign negative days to stocked stages", () => {
  const step = emptySopStep();
  step.check.operator = "present";
  step.trigger = { ...step.trigger, kind: "doc", docFrom: -20, docTo: 0 };
  const definition = {
    title: "Timing",
    description: "",
    language: "en",
    steps: [step],
  };
  assert.ok(
    validateSop(definition).some((error) => error.includes("preparation")),
  );
});

test("retired routine tasks stay in history without counting as missed work", () => {
  const { sopSummary } = require("./client.ts");
  const summary = sopSummary({ tasks: [
    { purpose: "routine", status: "cancelled", result: "not_applicable" },
    { purpose: "routine", status: "open", result: "insufficient_evidence" },
  ], issues: [] });
  assert.equal(summary.total, 1);
  assert.equal(summary.missing, 1);
});
