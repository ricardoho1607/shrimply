const assert = require("node:assert/strict");
const test = require("node:test");
const { evaluatePlanktonOverwatch } = require("./planktonOverwatch");

const stableWater = [
  { date: "2026-08-18", dawnDo: 5.6, eveningDo: 6.8, morningPh: 7.9, afternoonPh: 8.2, secchiCm: 35 },
  { date: "2026-08-19", dawnDo: 5.5, eveningDo: 6.7, morningPh: 7.9, afternoonPh: 8.2, secchiCm: 34 },
];

const stablePlankton = [
  { date: "2026-08-10", totalCellPerMl: 800000, cyanobacteriaPercent: 8, greenAlgaePercent: 48, diatomPercent: 35 },
  { date: "2026-08-15", totalCellPerMl: 850000, cyanobacteriaPercent: 9, greenAlgaePercent: 47, diatomPercent: 34 },
  { date: "2026-08-20", totalCellPerMl: 900000, cyanobacteriaPercent: 9, greenAlgaePercent: 46, diatomPercent: 34 },
];

test("does not diagnose risk from total plankton count alone", () => {
  const result = evaluatePlanktonOverwatch({
    planktonRecords: [{ date: "2026-08-20", totalCellPerMl: 4000000 }],
  });
  assert.equal(result.state, "insufficient");
  assert.equal(result.signals.some((signal) => signal.id === "cyanobacteria_share_elevated"), false);
});

test("marks a complete stable pattern as stable", () => {
  const result = evaluatePlanktonOverwatch({
    planktonRecords: stablePlankton,
    waterQualityRecords: stableWater,
    feedRecords: [{ date: "2026-08-20", feedingResponse: "normal", totalDailyFeed: 120 }],
  });
  assert.equal(result.state, "stable");
  assert.equal(result.dataQuality.status, "good");
});

test("uses dawn DO between four and five as a watch signal", () => {
  const result = evaluatePlanktonOverwatch({
    planktonRecords: stablePlankton,
    waterQualityRecords: [...stableWater, { date: "2026-08-20", dawnDo: 4.6, eveningDo: 6.3, morningPh: 7.9, afternoonPh: 8.2 }],
  });
  assert.equal(result.state, "watch");
  assert(result.signals.some((signal) => signal.id === "dawn_do_watch"));
});

test("raises high risk when cyanobacteria rises while DO falls and pH swing widens", () => {
  const result = evaluatePlanktonOverwatch({
    planktonRecords: [
      { date: "2026-08-10", totalCellPerMl: 600000, cyanobacteriaPercent: 8, greenAlgaePercent: 55, diatomPercent: 30 },
      { date: "2026-08-15", totalCellPerMl: 900000, cyanobacteriaPercent: 14, greenAlgaePercent: 47, diatomPercent: 28 },
      { date: "2026-08-20", totalCellPerMl: 1500000, cyanobacteriaPercent: 23, greenAlgaePercent: 37, diatomPercent: 24 },
    ],
    waterQualityRecords: [
      { date: "2026-08-18", dawnDo: 5.5, morningPh: 8, afternoonPh: 8.3 },
      { date: "2026-08-19", dawnDo: 5, morningPh: 7.9, afternoonPh: 8.5 },
      { date: "2026-08-20", dawnDo: 4.4, morningPh: 7.8, afternoonPh: 8.6 },
    ],
  });
  assert.equal(result.state, "high");
  assert(result.signals.some((signal) => signal.id === "community_shift_to_cyanobacteria"));
  assert(result.categories.oxygen > 0);
  assert(result.categories.cyanobacteria > 0);
});

test("uses falling sub-four dawn DO as a critical oxygen override", () => {
  const result = evaluatePlanktonOverwatch({
    planktonRecords: stablePlankton,
    waterQualityRecords: [
      { date: "2026-08-18", dawnDo: 4.7, morningPh: 7.9, afternoonPh: 8.3 },
      { date: "2026-08-19", dawnDo: 4.2, morningPh: 7.9, afternoonPh: 8.3 },
      { date: "2026-08-20", dawnDo: 3.7, morningPh: 7.9, afternoonPh: 8.3 },
    ],
  });
  assert.equal(result.state, "critical");
});

test("detects bloom-crash risk from rapid plankton decline plus falling DO", () => {
  const result = evaluatePlanktonOverwatch({
    planktonRecords: [
      { date: "2026-08-10", totalCellPerMl: 1800000, cyanobacteriaPercent: 12 },
      { date: "2026-08-15", totalCellPerMl: 1700000, cyanobacteriaPercent: 12 },
      { date: "2026-08-20", totalCellPerMl: 700000, cyanobacteriaPercent: 10 },
    ],
    waterQualityRecords: [
      { date: "2026-08-18", dawnDo: 5.2, morningPh: 7.9, afternoonPh: 8.3 },
      { date: "2026-08-20", dawnDo: 4.5, morningPh: 7.9, afternoonPh: 8.3 },
    ],
  });
  assert.equal(result.state, "critical");
  assert(result.trends.rapidPlanktonDecline);
});

test("keeps molar N:P as a supporting signal rather than a standalone diagnosis", () => {
  const result = evaluatePlanktonOverwatch({
    planktonRecords: stablePlankton,
    waterQualityRecords: stableWater,
    nutrients: { dinMolar: 8, dipMolar: 1, ratioMethod: "molar_din_to_dip" },
  });
  assert.notEqual(result.state, "high");
  assert.equal(result.metrics.nToPRatio, 8);
  assert(result.signals.some((signal) => signal.id === "np_ratio_signal"));
});

test("calculates absolute cyanobacteria load from total density and percentage", () => {
  const result = evaluatePlanktonOverwatch({
    planktonRecords: [{ date: "2026-08-20", totalCellPerMl: 2500000, cyanobacteriaPercent: 20 }],
    waterQualityRecords: [{ date: "2026-08-20", dawnDo: 5.4, morningPh: 7.9, afternoonPh: 8.2 }],
  });
  assert.equal(result.metrics.cyanobacteriaCellPerMl, 500000);
});

test("does not turn missing values into safe zeroes", () => {
  const result = evaluatePlanktonOverwatch({
    planktonRecords: [{ date: "2026-08-20", totalCellPerMl: null, cyanobacteriaPercent: null }],
    waterQualityRecords: [{ date: "2026-08-20", dawnDo: null, morningPh: null, afternoonPh: null }],
  });
  assert.equal(result.state, "insufficient");
  assert.equal(result.metrics.dawnDo, null);
  assert(result.dataQuality.missing.includes("dawn dissolved oxygen"));
});

test("a newer chemistry report does not hide the latest daily oxygen record", () => {
  const result = evaluatePlanktonOverwatch({
    planktonRecords: stablePlankton,
    waterQualityRecords: [
      { date: "2026-08-19", dawnDo: 4.6, morningPh: 7.9, afternoonPh: 8.2 },
      { date: "2026-08-20", tanMgL: 0.7, nitriteMgL: 0.6 },
    ],
  });
  assert.equal(result.metrics.dawnDo, 4.6);
  assert(result.signals.some((signal) => signal.id === "tan_elevated"));
});

test("uses direct weak feeding response with oxygen stress without inferring it from feed quantity", () => {
  const result = evaluatePlanktonOverwatch({
    planktonRecords: stablePlankton,
    waterQualityRecords: [{ date: "2026-08-20", dawnDo: 4.3, morningPh: 7.9, afternoonPh: 8.2 }],
    feedRecords: [
      { date: "2026-08-19", totalDailyFeed: 140 },
      { date: "2026-08-20", totalDailyFeed: 90, feedingResponse: "weak" },
    ],
  });
  assert.equal(result.metrics.feedingResponse, "weak");
  assert(result.signals.some((signal) => signal.id === "feeding_response_weak"));
});
