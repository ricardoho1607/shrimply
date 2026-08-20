const assert = require("node:assert/strict");
const test = require("node:test");
const {
  buildPlanktonOverwatchInput,
  buildStoredOverwatch,
  evaluatePondPlanktonOverwatch,
  extractLabMetrics,
  shouldNotifyPlanktonOverwatch,
} = require("./planktonOverwatchContext");

const pond = {
  id: "pond-1",
  pondName: "A2",
  pondCycleId: "pond-cycle-2",
  cycleId: "cycle-2",
  cycleStartedAt: "2026-08-01",
  initialPopulation: 100000,
  samplings: [
    { id: "wq-1", date: "2026-08-18", pondCycleId: "pond-cycle-2", doMorning: "5.4", doEvening: "6.7", phMorning: "7.9", phEvening: "8.3", transparency: "35" },
    { id: "wq-2", date: "2026-08-20", pondCycleId: "pond-cycle-2", doMorning: "4.6", doEvening: "6.4", phMorning: "7.8", phEvening: "8.5", transparency: "27" },
    { id: "feed-1", date: "2026-08-20", pondCycleId: "pond-cycle-2", feedData: { totalDailyFeed: "120", feedingResponse: "weak" } },
  ],
};

test("extracts normalized plankton and chemistry metrics from a lab pond result", () => {
  const metrics = extractLabMetrics({
    plankton: { totalCellPerMl: "2500000", cyanophytaPercent: "20", chlorophytaPercent: "40", diatomPercent: "30" },
    waterQuality: { tan: "0.6", nh3: "0.02", nh4: "0.7", no2: "0.4", alkalinityTotal: "120", tom: "90" },
  }, "2026-08-20");
  assert.equal(metrics.plankton.totalCellPerMl, 2500000);
  assert.equal(metrics.plankton.cyanobacteriaPercent, 20);
  assert.equal(metrics.waterQuality.tanMgL, 0.6);
  assert.equal(metrics.waterQuality.nh3MgL, 0.02);
  assert.equal(metrics.waterQuality.nh4MgL, 0.7);
  assert.equal(metrics.schemaVersion, 2);
});

test("does not reinterpret NH4 as TAN or NH3", () => {
  const metrics = extractLabMetrics({ waterQuality: { nh4: "0.7" } }, "2026-08-20");
  assert.equal(metrics.waterQuality.nh4MgL, 0.7);
  assert.equal(metrics.waterQuality.tanMgL, null);
  assert.equal(metrics.waterQuality.nh3MgL, null);
});

test("keeps lab and operational records inside the active pond cycle", () => {
  const input = buildPlanktonOverwatchInput({
    pond,
    pondId: "pond-1",
    labSummaries: [
      { id: "old", pondCycleId: "pond-cycle-1", sampleDate: "2026-07-20", metrics: { plankton: { date: "2026-07-20", totalCellPerMl: 9999999, cyanobacteriaPercent: 80 } } },
      { id: "new", pondCycleId: "pond-cycle-2", sampleDate: "2026-08-15", metrics: { plankton: { date: "2026-08-15", totalCellPerMl: 900000, cyanobacteriaPercent: 10 } } },
    ],
  });
  assert.equal(input.planktonRecords.length, 1);
  assert.equal(input.planktonRecords[0].totalCellPerMl, 900000);
  assert.equal(input.feedRecords[0].feedData.feedingResponse, "weak");
});

test("evaluates the current pond from stored lab summaries and operational records", () => {
  const result = evaluatePondPlanktonOverwatch({
    pond,
    pondId: "pond-1",
    labSummaries: [
      { id: "lab-1", pondCycleId: "pond-cycle-2", sampleDate: "2026-08-10", metrics: { plankton: { date: "2026-08-10", totalCellPerMl: 600000, cyanobacteriaPercent: 8, greenAlgaePercent: 55, diatomPercent: 30 } } },
      { id: "lab-2", pondCycleId: "pond-cycle-2", sampleDate: "2026-08-15", metrics: { plankton: { date: "2026-08-15", totalCellPerMl: 900000, cyanobacteriaPercent: 14, greenAlgaePercent: 48, diatomPercent: 27 } } },
    ],
    currentLabMetrics: {
      sourceId: "lab-3",
      plankton: { date: "2026-08-20", totalCellPerMl: 1600000, cyanobacteriaPercent: 23, greenAlgaePercent: 38, diatomPercent: 23 },
    },
  });
  assert(result);
  assert(["high", "critical"].includes(result.state));
  assert.equal(result.metrics.feedingResponse, "weak");
});

test("notifies on escalation and material high-risk changes but not repeated watch state", () => {
  assert.equal(shouldNotifyPlanktonOverwatch(null, { state: "watch", riskSignature: "watch:a" }), true);
  assert.equal(shouldNotifyPlanktonOverwatch({ state: "watch", riskSignature: "watch:a" }, { state: "watch", riskSignature: "watch:a" }), false);
  assert.equal(shouldNotifyPlanktonOverwatch({ state: "watch", riskSignature: "watch:a" }, { state: "high", riskSignature: "high:a" }), true);
  assert.equal(shouldNotifyPlanktonOverwatch({ state: "high", riskSignature: "high:a" }, { state: "high", riskSignature: "high:b" }), true);
});

test("stored snapshots retain pond and cycle ownership", () => {
  const snapshot = buildStoredOverwatch({
    result: { state: "watch", signals: [], sourceDates: {}, recommendations: [], message: "Watch" },
    pond,
    pondId: "pond-1",
    sourceType: "lab_report",
    sourceId: "lab-3",
    sourceDate: "2026-08-20",
  });
  assert.equal(snapshot.pondCycleId, "pond-cycle-2");
  assert.equal(snapshot.cycleId, "cycle-2");
  assert.equal(snapshot.sourceId, "lab-3");
});
