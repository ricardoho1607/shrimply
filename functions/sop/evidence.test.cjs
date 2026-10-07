const test = require("node:test");
const assert = require("node:assert/strict");
const { projectEvidence } = require("./evidence");
test("projection separates explicit per-field observation time from daily totals", () => {
  const p = {
    physicalPondId: "physical",
    pondCycleId: "cycle",
    samplings: [
      {
        id: "day",
        date: "2026-10-08",
        doMorning: "0",
        observedAtByField: { doMorning: "2026-10-08T06:30+07:00" },
        feedData: { totalDailyFeed: 10 },
        mbw: 0,
      },
    ],
  };
  const e = projectEvidence(
    "ponds",
    "pond",
    p,
    Date.parse("2026-10-08T08:00Z"),
  );
  assert.equal(
    e.find((e) => e.field === "water.doMorning").precision,
    "instant",
  );
  assert.equal(
    e.find((e) => e.field === "feeding.totalDailyFeed").precision,
    "date",
  );
  assert.ok(!e.some((e) => e.field === "sampling.mbw"));
  assert.ok(e.every((e) => e.targetId === "physical" && e.cycleId === "cycle"));
});
test("missing readings and unconfirmed lab results are not invented", () => {
  assert.ok(
    !projectEvidence("ponds", "pond", { samplings: [] }, 1).some((e) =>
      e.field.startsWith("water."),
    ),
  );
  assert.deepEqual(
    projectEvidence("labReports", "lab", { status: "draft" }, 1),
    [],
  );
});
test("source revision changes with evidence but not upload receipt time", () => {
  const p = { samplings: [{ id: "s", date: "2026-10-08", doMorning: 5 }] };
  const a = projectEvidence("ponds", "p", p, 1),
    b = projectEvidence("ponds", "p", p, 2);
  assert.equal(a[0].revision, b[0].revision);
  p.samplings[0].doMorning = 6;
  assert.notEqual(
    a[0].revision,
    projectEvidence("ponds", "p", p, 3)[0].revision,
  );
});
test("inventory updates do not acquire invented observation times, and treatment inherits its unit", () => {
  const stock = projectEvidence(
    "additives",
    "asset",
    {
      totalStock: 7,
      unit: "kg",
      usageHistory: [
        { id: "use", pondId: "pond", quantity: 1, date: "2026-10-08" },
      ],
    },
    Date.parse("2026-10-08T10:00Z"),
  );
  const inventory = stock.find((e) => e.field === "inventory.totalStock");
  assert.equal(inventory.observedAt, null);
  assert.equal(inventory.date, "");
  assert.equal(stock.find((e) => e.field === "treatment.quantity").unit, "kg");
});
test("timestamp-valued cycle metadata is safe and retains date-only lifecycle evidence", () => {
  const evidence = projectEvidence(
    "ponds",
    "pond",
    {
      cycleStartedAt: { toMillis: () => 1234 },
      docStart: "2026-10-08",
      cycleStatus: "active",
    },
    1234,
  );
  assert.equal(
    evidence.find((e) => e.field === "lifecycle.status").date,
    "2026-10-08",
  );
});
test("a pond lab summary cannot masquerade as an additional confirmed laboratory record", () => {
  const evidence = projectEvidence(
    "ponds",
    "p",
    {
      latestLabStatus: {
        status: "confirmed",
        labReportId: "report",
        sampleDate: "2026-10-08",
      },
    },
    1,
  );
  assert.ok(!evidence.some((e) => e.field === "lab.status"));
});
