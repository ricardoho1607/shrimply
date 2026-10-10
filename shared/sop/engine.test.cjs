const test = require("node:test");
const assert = require("node:assert/strict");
const { emptySopStep } = require("./contracts.ts");
const {
  validateSop,
  evaluateSopStep,
  scheduledOccurrence,
  localInstant,
  sopConflicts,
  assessNarrative,
} = require("./engine.ts");
const { parseObservationTimes } = require("./observationTimes.ts");
const now = Date.parse("2026-10-08T07:00:00Z");
const target = {
  id: "physical",
  scope: "pond",
  cycleId: "cycle",
  stage: "growout",
  stockingDate: "2026-09-01",
};
const step = () => ({
  ...emptySopStep(),
  correctiveInstructions: "Perform the farm-approved corrective check.",
  check: { ...emptySopStep().check, min: 5, max: 8 },
});
const evidence = (overrides = {}) => ({
  id: "measurement",
  revision: "r1",
  targetId: "physical",
  cycleId: "cycle",
  field: "water.doMorning",
  value: 6,
  unit: "mg/L",
  basis: "",
  observedAt: now,
  date: "2026-10-08",
  precision: "instant",
  receivedAt: now,
  deleted: false,
  estimated: false,
  ...overrides,
});
const evaluate = (items, s = step()) =>
  evaluateSopStep(s, items, {
    target,
    start: now - 3600000,
    end: now + 3600000,
    now,
    timeZone: "UTC",
  });
test("corrective guidance and manual evidence descriptions are optional without changing check results", () => {
  const s = step();
  s.correctiveInstructions = "";
  const definition = {
    title: "Farm procedure",
    description: "",
    language: "id",
    steps: [s],
  };
  assert.deepEqual(validateSop(definition), []);
  assert.equal(evaluate([evidence({ value: 4 })], s).result, "fail");
  s.check = {
    ...s.check,
    field: "manual",
    operator: "narrative",
    unit: "",
    exactTime: false,
    rubric: "",
  };
  assert.deepEqual(validateSop(definition), []);
  assert.equal(
    evaluate(
      [evidence({ field: "manual", unit: "", value: "Observation recorded" })],
      s,
    ).result,
    "needs_review",
  );
});
test("missing, estimated, wrong-cycle, malformed, and date-only evidence cannot pass an exact measurement check", () => {
  for (const items of [
    [],
    [evidence({ estimated: true })],
    [evidence({ cycleId: "other" })],
    [evidence({ value: "n/a" })],
    [evidence({ value: " " })],
    [evidence({ value: [] })],
    [evidence({ observedAt: null, precision: "date" })],
    [evidence({ unit: "ppm" })],
    [evidence({ deleted: true })],
  ])
    assert.equal(evaluate(items).result, "insufficient_evidence");
});
test("recorded adherence remains true when the biological target fails", () => {
  assert.deepEqual(
    [
      evaluate([evidence({ value: 4 })]).recorded,
      evaluate([evidence({ value: 4 })]).result,
    ],
    [true, "fail"],
  );
  assert.equal(evaluate([evidence()]).result, "pass");
});
test("zero is a measured value and is not missing", () => {
  const s = step();
  s.check.min = 0;
  assert.equal(evaluate([evidence({ value: 0 })], s).result, "pass");
});
test("analytical bases are not silently interchangeable", () => {
  const s = step();
  s.check.field = "water.ammonia";
  s.check.basis = "TAN-N";
  assert.equal(
    evaluate([evidence({ field: "water.ammonia", basis: "NH3" })], s).result,
    "insufficient_evidence",
  );
});
test("validation requires limits for range checks and rejects cyclic workflows", () => {
  assert.equal(
    validateSop({
      title: "SOP",
      description: "",
      language: "en",
      steps: [step()],
    }).length,
    0,
  );
  assert.ok(
    validateSop({
      title: "SOP",
      description: "",
      language: "en",
      steps: [
        {
          ...step(),
          check: { ...step().check, operator: "range", min: null, max: null },
        },
      ],
    }).some((issue) =>
      issue.includes("Set a farm-approved minimum or maximum."),
    ),
  );
  const a = step(),
    b = { ...step(), id: "step-2" };
  a.onPass = ["step-2"];
  b.onFail = ["step-1"];
  assert.ok(
    validateSop({
      title: "SOP",
      description: "",
      language: "en",
      steps: [a, b],
    }).some((e) => e.includes("cycles")),
  );
});
test("range conflicts require review while compatible ranges coexist", () => {
  const a = { title: "A", description: "", language: "en", steps: [step()] },
    b = {
      ...a,
      title: "B",
      steps: [
        {
          ...step(),
          title: "Alternative water check",
          check: { ...step().check, min: 9, max: 10 },
        },
      ],
    };
  assert.equal(sopConflicts(a, [b]).length, 1);
  assert.equal(
    sopConflicts(a, [
      {
        ...a,
        steps: a.steps.map((s) => ({ ...s, title: "Independent measurement" })),
      },
    ]).length,
    0,
  );
  assert.ok(
    sopConflicts(a, [a]).some((e) => e.includes("duplicate competing")),
  );
});
test("no pre-adoption overdue occurrences and deterministic DST/local-time scheduling", () => {
  const s = step();
  assert.equal(scheduledOccurrence(s, target, now, now + 7200000, "UTC"), null);
  assert.equal(
    localInstant("2026-10-08", "06:00", "Asia/Jakarta"),
    Date.parse("2026-10-07T23:00Z"),
  );
  assert.equal(
    localInstant("2026-10-04", "06:00", "Australia/Melbourne"),
    Date.parse("2026-10-03T19:00Z"),
  );
  assert.equal(
    scheduledOccurrence(s, target, now, now - 3600000, "UTC").key,
    "2026-10-08",
  );
});
test("AI automatic decisions require calibration, low severity, confidence, and valid citations", () => {
  const input = {
    severity: "low",
    confidence: 0.95,
    result: "pass",
    citations: ["e1"],
    allowedIds: ["e1"],
    calibrated: true,
  };
  assert.equal(assessNarrative(input), "pass");
  for (const patch of [
    { result: "fail" },
    { citations: "not-an-array" },
    { calibrated: false },
    { severity: "critical" },
    { confidence: 0.89 },
    { citations: ["invented"] },
    { confidence: 2 },
  ])
    assert.equal(assessNarrative({ ...input, ...patch }), "needs_review");
});
test("observation time requires timezone and preserves actual measurement time", () => {
  assert.throws(() =>
    parseObservationTimes({ doMorning: "2026-10-08T06:00" }, now),
  );
  assert.throws(() =>
    parseObservationTimes({ doMorning: "2027-10-08T06:00Z" }, now),
  );
  assert.deepEqual(
    parseObservationTimes({ doMorning: "2026-10-08T06:00+07:00" }, now),
    { doMorning: "2026-10-07T23:00:00.000Z" },
  );
});

test("DST gap advances by the gap and repeated clock time is deterministic", () => {
  assert.equal(
    localInstant("2026-10-04", "02:30", "Australia/Melbourne"),
    Date.parse("2026-10-03T16:30Z"),
  );
  assert.equal(
    localInstant("2026-04-05", "02:30", "Australia/Melbourne"),
    Date.parse("2026-04-04T16:30Z"),
  );
});
test("freshness, inclusive boundaries, and qualifying counts use observations rather than receipt time", () => {
  const s = step();
  s.check.freshnessMinutes = 10;
  assert.equal(
    evaluate([evidence({ value: 5, observedAt: now - 600000 })], s).result,
    "pass",
  );
  assert.equal(evaluate([evidence({ value: 8 })], s).result, "pass");
  assert.equal(
    evaluate([evidence({ observedAt: now - 600001, receivedAt: now })], s)
      .result,
    "insufficient_evidence",
  );
  s.check.operator = "count";
  s.check.minCount = 2;
  assert.equal(
    evaluate(
      [evidence(), evidence({ id: "second", observedAt: now - 300000 })],
      s,
    ).result,
    "pass",
  );
  assert.equal(
    evaluate([evidence(), evidence({ id: "second", cycleId: "wrong" })], s)
      .result,
    "insufficient_evidence",
  );
});
test("trends and sequences follow chronological qualifying records", () => {
  const s = step();
  s.check.operator = "trend";
  s.check.min = -2;
  s.check.max = 0;
  s.check.minCount = 2;
  const items = [
    evidence({ value: 5 }),
    evidence({ id: "earlier", observedAt: now - 600000, value: 6 }),
  ];
  assert.equal(evaluate(items, s).result, "pass");
  items[0].value = 9;
  assert.equal(evaluate(items, s).result, "fail");
  s.check = {
    ...s.check,
    field: "lab.status",
    operator: "sequence",
    unit: "",
    value: "pending,confirmed",
  };
  const sequence = [
    evidence({ field: "lab.status", unit: "", value: "confirmed" }),
    evidence({
      field: "lab.status",
      unit: "",
      id: "early",
      observedAt: now - 600000,
      value: "pending",
    }),
  ];
  assert.equal(evaluate(sequence, s).result, "pass");
  sequence[0].value = "pending";
  assert.equal(evaluate(sequence, s).result, "fail");
});
test("compatible measurement units normalize without treating ppm or analytical bases as interchangeable", () => {
  assert.equal(
    evaluate([evidence({ value: 0.006, unit: "g/L" })]).result,
    "pass",
  );
  assert.equal(
    evaluate([evidence({ value: 6000, unit: "µg/L" })]).result,
    "pass",
  );
  assert.equal(
    evaluate([evidence({ value: 6, unit: "ppm" })]).result,
    "insufficient_evidence",
  );
  const s = step();
  s.check.field = "inventory.totalStock";
  s.check.sourceId = "additives/item";
  s.check.unit = "kg";
  s.check.min = 0;
  s.check.max = 10;
  assert.equal(
    evaluate(
      [
        evidence({
          field: s.check.field,
          sourcePath: "feeds/item",
          unit: "kg",
        }),
      ],
      s,
    ).result,
    "insufficient_evidence",
  );
  assert.equal(
    evaluate(
      [
        evidence({
          field: s.check.field,
          sourcePath: "additives/item",
          unit: "g",
          value: 6000,
        }),
      ],
      s,
    ).result,
    "pass",
  );
});
test("date-only observations cannot invent same-day trend ordering", () => {
  const s = step();
  s.check.exactTime = false;
  s.check.operator = "trend";
  s.check.min = -2;
  s.check.max = 2;
  s.check.minCount = 2;
  assert.equal(
    evaluate(
      [
        evidence({ observedAt: null, precision: "date", value: 5 }),
        evidence({
          id: "other",
          observedAt: null,
          precision: "date",
          value: 6,
        }),
      ],
      s,
    ).result,
    "needs_review",
  );
});
test("shared DOC schedules cannot silently omit work when ponds have different stocking dates", () => {
  const s = step();
  s.scope = "block";
  s.trigger.kind = "doc";
  s.check.field = "manual";
  s.check.operator = "present";
  s.check.unit = "";
  s.check.exactTime = false;
  assert.ok(
    validateSop({
      title: "Shared work",
      description: "",
      language: "en",
      steps: [s],
    }).some((error) => error.includes("DOC schedules require pond scope")),
  );
});

test("on-demand checks do not need a clock time, while calendar schedules still require one", () => {
  for (const kind of ["manual", "event", "stage"]) {
    const s = step();
    s.trigger = { ...s.trigger, kind, at: "", event: "harvest" };
    const definition = {
      title: "Source schedule",
      description: "",
      language: "id",
      steps: [s],
    };
    assert.deepEqual(validateSop(definition), []);
    assert.equal(
      scheduledOccurrence(s, target, now, now - 86400000, "UTC"),
      null,
    );
    s.trigger.at = "not-a-time";
    assert.ok(
      validateSop(definition).some((issue) =>
        issue.includes("Invalid schedule"),
      ),
    );
  }
  for (const kind of ["daily", "weekly", "doc"]) {
    const s = step();
    s.trigger = { ...s.trigger, kind, at: "" };
    assert.ok(
      validateSop({
        title: "Clock schedule",
        description: "",
        language: "id",
        steps: [s],
      }).some((issue) => issue.includes("Invalid schedule")),
    );
  }
});
