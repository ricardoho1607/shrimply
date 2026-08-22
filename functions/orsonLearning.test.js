const assert = require("assert/strict");
const createOrsonLearningFunctions = require("./orsonLearning");

const { buildOutcome, calculateServerProjectionBase } = createOrsonLearningFunctions.__test;
const prediction = {
  id: "prediction-1",
  pondId: "pond-1",
  cycleId: "cycle-1",
  pondCycleId: "pond-cycle-1",
  targetDate: "2026-04-01",
  daysToHarvest: 20,
  modelVersion: "harvest-projection-v2",
  calibrationVersionId: "default-v1",
  projected: { mbwG: 21, biomassKg: 1700, survivalPercent: 84, fcr: 1.4 },
  learningContext: {
    currentMbwG: 15,
    baseAssumedAdgGPerDay: 0.3,
    baseProjectedMbwG: 21,
    baseAssumedSurvivalPercent: 84,
    baseProjectedBiomassKg: 1700,
    initialPopulation: 100000,
    mortalityCountAtPrediction: 0,
    harvestedPopulationAtPrediction: 0,
    manualAdgOverride: false,
    manualSurvivalOverride: false,
  },
};

const outcome = buildOutcome({
  companyId: "company-1",
  pondId: "pond-1",
  pond: {
    pondName: "A1",
    cycleId: "cycle-1",
    pondCycleId: "pond-cycle-1",
    cycleStatus: "ended",
    cycleEndedAt: "2026-04-01",
    cycleEndReason: "harvested",
    cycleStartMode: "new",
    initialPopulation: 100000,
    initialWeight: 0.5,
    totalHarvestedBiomass: 1600,
    totalHarvestedPopulation: 80000,
    samplings: [
      { id: "feed-1", date: "2026-03-01", feed: 100, feedData: { totalDailyFeed: 100 } },
      { id: "feed-2", date: "2026-03-02", feed: 110, feedData: { totalDailyFeed: 110 } },
    ],
  },
  predictions: [prediction],
});

assert.equal(outcome.actual.mbwG, 20, "derives actual MBW from harvested biomass and population");
assert.equal(outcome.actual.survivalPercent, 80, "derives actual survival without treating missing mortality as harvest");
assert.equal(outcome.actual.totalFeedKg, 210, "uses actual feed-management totals without double counting sampling feed");
assert.equal(outcome.eligibleForCalibration, true, "accepts a complete final-harvest outcome");
assert.ok(outcome.errors.biomassAbsolutePercent > 0, "stores prediction-versus-actual error");

const incomplete = buildOutcome({
  companyId: "company-1",
  pondId: "pond-2",
  pond: {
    pondName: "A2",
    cycleId: "cycle-1",
    cycleStatus: "ended",
    cycleEndedAt: "2026-04-01",
    cycleEndReason: "harvested",
    initialPopulation: 100000,
    initialWeight: 0.5,
  },
  predictions: [],
});
assert.equal(incomplete.actual.biomassKg, null, "preserves missing harvest biomass as null");
assert.equal(incomplete.eligibleForCalibration, false, "excludes incomplete outcomes from calibration");

const manualOutcome = buildOutcome({
  companyId: "company-1",
  pondId: "pond-manual",
  pond: {
    pondName: "A3",
    cycleId: "cycle-1",
    pondCycleId: "pond-manual",
    cycleStatus: "ended",
    cycleEndedAt: "2026-04-01",
    cycleEndReason: "harvested",
    cycleStartMode: "new",
    initialPopulation: 100000,
    initialWeight: 0.5,
    totalHarvestedBiomass: 1600,
    totalHarvestedPopulation: 80000,
  },
  predictions: [{
    ...prediction,
    pondId: "pond-manual",
    pondCycleId: "pond-manual",
    learningContext: { ...prediction.learningContext, manualSurvivalOverride: true },
  }],
});
assert.equal(manualOutcome.eligibleForCalibration, false, "does not learn company settings from a user's manual scenario override");

const serverBase = calculateServerProjectionBase({
  initialPopulation: 100000,
  initialWeight: 0.5,
  docStart: "2026-01-01",
  samplings: [
    { date: "2026-01-20", mbw: 5, mortality: 100, doMorning: 4.5, doEvening: 4.2 },
    { date: "2026-01-30", mbw: 8, mortality: 200, doMorning: 4, doEvening: 3.8 },
  ],
}, 14, new Date("2026-02-01T00:00:00Z"));
assert.equal(serverBase.baseAssumedAdgGPerDay, 0.3, "reconstructs the shared ADG base on the server");
assert.equal(serverBase.baseAssumedSurvivalPercent, 90.333, "reconstructs the stage-based survival base on the server");
assert.equal(serverBase.mortalityCountAtPrediction, 300, "uses company pond mortality instead of client-supplied totals");
