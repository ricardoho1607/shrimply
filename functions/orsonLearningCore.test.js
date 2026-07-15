const assert = require("assert/strict");
const {
  LIMITS,
  evaluateAdjustment,
  proposeAdjustment,
} = require("./orsonLearningCore");

const buildOutcome = (index) => ({
  pondId: `pond-${index}`,
  pondName: `Pond ${index}`,
  pondNameKey: `pond ${index}`,
  endedAt: `2026-0${Math.floor(index / 3) + 1}-${String((index % 3) + 10).padStart(2, "0")}`,
  eligibleForCalibration: true,
  prediction: {
    daysToHarvest: 20,
    projected: { mbwG: 14, survivalPercent: 90, biomassKg: 1260 },
    learningContext: {
      currentMbwG: 10,
      baseAssumedAdgGPerDay: 0.2,
      baseAssumedSurvivalPercent: 90,
      initialPopulation: 100000,
      mortalityCountAtPrediction: 0,
      harvestedPopulationAtPrediction: 0,
      manualAdgOverride: false,
      manualSurvivalOverride: false,
    },
  },
  actual: {
    mbwG: 13.6,
    survivalPercent: 86,
    biomassKg: 1075.712,
  },
});

const outcomes = Array.from({ length: 12 }, (_, index) => buildOutcome(index));
const defaultAdjustment = {
  adgMultiplier: 1,
  survivalOffsetPercentagePoints: 0,
  biomassMultiplier: 1,
  sampleSize: 0,
};
const proposal = proposeAdjustment(defaultAdjustment, outcomes);

assert.equal(proposal.status, "promoted", "promotes a candidate that improves held-out prediction error");
assert.ok(proposal.candidate.adgMultiplier < 1, "reduces ADG after consistent overprediction");
assert.ok(proposal.candidate.survivalOffsetPercentagePoints < 0, "reduces survival after consistent overprediction");
assert.ok(proposal.candidate.biomassMultiplier < 1, "reduces residual biomass bias");
assert.ok(
  proposal.current.adgMultiplier - proposal.candidate.adgMultiplier <= LIMITS.adgMultiplier.maxStep,
  "caps the ADG adjustment per promoted version",
);
assert.ok(
  Math.abs(proposal.candidate.survivalOffsetPercentagePoints) <= LIMITS.survivalOffsetPercentagePoints.maxStep,
  "caps the survival adjustment per promoted version",
);
assert.ok(
  proposal.currentEvaluation.score > proposal.candidateEvaluation.score,
  "tests the candidate against a held-out validation set",
);

const insufficient = proposeAdjustment(defaultAdjustment, outcomes.slice(0, 5));
assert.equal(insufficient.status, "insufficient_data", "does not calibrate from too few outcomes");

const currentEvaluation = evaluateAdjustment(outcomes, defaultAdjustment);
assert.ok(currentEvaluation.evaluatedOutcomeCount === outcomes.length, "evaluates every usable outcome once");

const largeFarmOutcomes = Array.from({ length: 100 }, (_, index) => ({
  ...buildOutcome(index % 12),
  pondId: `large-pond-${index}`,
  pondName: `Large Pond ${index}`,
  pondNameKey: `large pond ${index}`,
  endedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString().split("T")[0],
}));
const largeFarmProposal = proposeAdjustment(defaultAdjustment, largeFarmOutcomes);
assert.equal(largeFarmProposal.trainingOutcomeCount, 80, "trains on 80 outcomes for a 100-pond company");
assert.equal(largeFarmProposal.validationOutcomeCount, 20, "holds out 20 outcomes for a 100-pond company");
assert.ok(largeFarmProposal.candidate.adgMultiplier >= LIMITS.adgMultiplier.min, "keeps large-farm calibration bounded");
