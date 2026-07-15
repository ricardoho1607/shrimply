const DEFAULT_ADJUSTMENT = Object.freeze({
  adgMultiplier: 1,
  survivalOffsetPercentagePoints: 0,
  biomassMultiplier: 1,
  sampleSize: 0,
});

const LIMITS = Object.freeze({
  adgMultiplier: { min: 0.75, max: 1.25, maxStep: 0.05 },
  survivalOffsetPercentagePoints: { min: -8, max: 8, maxStep: 2 },
  biomassMultiplier: { min: 0.85, max: 1.15, maxStep: 0.04 },
});

const finiteNumber = (value) => typeof value === "number" && Number.isFinite(value) ? value : null;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value, decimals = 4) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const normalizeAdjustment = (value, fallback = DEFAULT_ADJUSTMENT) => {
  const source = value && typeof value === "object" ? value : {};
  return {
    adgMultiplier: round(clamp(
      finiteNumber(source.adgMultiplier) ?? fallback.adgMultiplier,
      LIMITS.adgMultiplier.min,
      LIMITS.adgMultiplier.max,
    )),
    survivalOffsetPercentagePoints: round(clamp(
      finiteNumber(source.survivalOffsetPercentagePoints) ?? fallback.survivalOffsetPercentagePoints,
      LIMITS.survivalOffsetPercentagePoints.min,
      LIMITS.survivalOffsetPercentagePoints.max,
    )),
    biomassMultiplier: round(clamp(
      finiteNumber(source.biomassMultiplier) ?? fallback.biomassMultiplier,
      LIMITS.biomassMultiplier.min,
      LIMITS.biomassMultiplier.max,
    )),
    sampleSize: Math.max(0, Math.floor(finiteNumber(source.sampleSize) ?? fallback.sampleSize)),
  };
};

const median = (values) => {
  const sorted = values.filter((value) => finiteNumber(value) !== null).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};

const normalizePondNameKey = (value) => typeof value === "string"
  ? value.trim().toLowerCase().replace(/\s+/g, " ")
  : "";

const predictOutcomeWithAdjustment = (outcome, adjustmentValue) => {
  const adjustment = normalizeAdjustment(adjustmentValue);
  const prediction = outcome?.prediction || {};
  const context = prediction.learningContext || {};
  const projected = prediction.projected || {};
  const daysToHarvest = finiteNumber(prediction.daysToHarvest);
  const currentMbwG = finiteNumber(context.currentMbwG);
  const baseAdg = finiteNumber(context.baseAssumedAdgGPerDay);
  const baseSurvival = finiteNumber(context.baseAssumedSurvivalPercent);
  const initialPopulation = finiteNumber(context.initialPopulation);
  const mortality = finiteNumber(context.mortalityCountAtPrediction) ?? 0;
  const harvestedPopulation = finiteNumber(context.harvestedPopulationAtPrediction) ?? 0;

  const mbwG = context.manualAdgOverride
    ? finiteNumber(projected.mbwG)
    : currentMbwG !== null && baseAdg !== null && daysToHarvest !== null
      ? Math.max(0, currentMbwG + baseAdg * adjustment.adgMultiplier * daysToHarvest)
      : finiteNumber(projected.mbwG);
  const survivalPercent = context.manualSurvivalOverride
    ? finiteNumber(projected.survivalPercent)
    : baseSurvival !== null
      ? clamp(baseSurvival + adjustment.survivalOffsetPercentagePoints, 1, 100)
      : finiteNumber(projected.survivalPercent);
  const population = initialPopulation !== null && survivalPercent !== null
    ? Math.max(0, (initialPopulation * survivalPercent) / 100 - mortality - harvestedPopulation)
    : null;
  const biomassKg = population !== null && mbwG !== null
    ? Math.max(0, (population * mbwG) / 1000) * adjustment.biomassMultiplier
    : finiteNumber(projected.biomassKg);

  return {
    mbwG: mbwG === null ? null : round(mbwG, 3),
    survivalPercent: survivalPercent === null ? null : round(survivalPercent, 3),
    biomassKg: biomassKg === null ? null : round(biomassKg, 3),
  };
};

const relativeError = (predicted, actual) => {
  if (finiteNumber(predicted) === null || finiteNumber(actual) === null || actual <= 0) return null;
  return Math.abs(predicted - actual) / actual;
};

const evaluateAdjustment = (outcomes, adjustment) => {
  const errors = { mbw: [], survival: [], biomass: [] };
  const outcomeScores = [];

  outcomes.forEach((outcome) => {
    const predicted = predictOutcomeWithAdjustment(outcome, adjustment);
    const actual = outcome.actual || {};
    const row = [
      ["mbw", relativeError(predicted.mbwG, finiteNumber(actual.mbwG))],
      ["survival", relativeError(predicted.survivalPercent, finiteNumber(actual.survivalPercent))],
      ["biomass", relativeError(predicted.biomassKg, finiteNumber(actual.biomassKg))],
    ];
    const valid = [];
    row.forEach(([key, error]) => {
      if (finiteNumber(error) === null) return;
      errors[key].push(error);
      valid.push(error);
    });
    if (valid.length > 0) outcomeScores.push(valid.reduce((sum, value) => sum + value, 0) / valid.length);
  });

  const average = (values) => values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
  const score = average(outcomeScores);

  return {
    score: score === null ? null : round(score),
    metrics: {
      mbw: average(errors.mbw) === null ? null : round(average(errors.mbw)),
      survival: average(errors.survival) === null ? null : round(average(errors.survival)),
      biomass: average(errors.biomass) === null ? null : round(average(errors.biomass)),
    },
    evaluatedOutcomeCount: outcomeScores.length,
  };
};

const splitOutcomes = (outcomes) => {
  const sorted = [...outcomes].sort((a, b) => {
    const dateCompare = String(a.endedAt || "").localeCompare(String(b.endedAt || ""));
    if (dateCompare !== 0) return dateCompare;
    return String(a.pondNameKey || a.pondId || "").localeCompare(String(b.pondNameKey || b.pondId || ""));
  });
  const validationCount = Math.max(2, Math.ceil(sorted.length * 0.2));
  return {
    training: sorted.slice(0, Math.max(0, sorted.length - validationCount)),
    validation: sorted.slice(Math.max(0, sorted.length - validationCount)),
  };
};

const stepToward = (current, target, maxStep, min, max) =>
  round(clamp(current + clamp(target - current, -maxStep, maxStep), min, max));

const buildCandidateAdjustment = (currentValue, training) => {
  const current = normalizeAdjustment(currentValue);
  const growthRatios = [];
  const survivalDeltas = [];

  training.forEach((outcome) => {
    const prediction = outcome.prediction || {};
    const context = prediction.learningContext || {};
    const actual = outcome.actual || {};
    const days = finiteNumber(prediction.daysToHarvest);
    const currentMbw = finiteNumber(context.currentMbwG);
    const baseAdg = finiteNumber(context.baseAssumedAdgGPerDay);
    const actualMbw = finiteNumber(actual.mbwG);
    if (!context.manualAdgOverride && days !== null && days > 0 && currentMbw !== null && baseAdg !== null && baseAdg > 0 && actualMbw !== null) {
      const actualGrowth = actualMbw - currentMbw;
      const baseGrowth = baseAdg * days;
      if (actualGrowth > 0 && baseGrowth > 0) growthRatios.push(clamp(actualGrowth / baseGrowth, 0.5, 1.5));
    }

    const baseSurvival = finiteNumber(context.baseAssumedSurvivalPercent);
    const actualSurvival = finiteNumber(actual.survivalPercent);
    if (!context.manualSurvivalOverride && baseSurvival !== null && actualSurvival !== null) {
      survivalDeltas.push(clamp(actualSurvival - baseSurvival, -20, 20));
    }
  });

  const reliability = clamp(training.length / 20, 0.15, 0.75);
  const medianGrowthRatio = median(growthRatios);
  const medianSurvivalDelta = median(survivalDeltas);
  const targetAdg = medianGrowthRatio === null ? current.adgMultiplier : 1 + (medianGrowthRatio - 1) * reliability;
  const targetSurvival = medianSurvivalDelta === null ? current.survivalOffsetPercentagePoints : medianSurvivalDelta * reliability;

  const provisional = {
    adgMultiplier: clamp(targetAdg, LIMITS.adgMultiplier.min, LIMITS.adgMultiplier.max),
    survivalOffsetPercentagePoints: clamp(targetSurvival, LIMITS.survivalOffsetPercentagePoints.min, LIMITS.survivalOffsetPercentagePoints.max),
    biomassMultiplier: 1,
    sampleSize: training.length,
  };
  const biomassRatios = training.map((outcome) => {
    const predicted = predictOutcomeWithAdjustment(outcome, provisional).biomassKg;
    const actual = finiteNumber(outcome?.actual?.biomassKg);
    return predicted !== null && predicted > 0 && actual !== null && actual > 0
      ? clamp(actual / predicted, 0.6, 1.4)
      : null;
  }).filter((value) => value !== null);
  const medianBiomassRatio = median(biomassRatios);
  const targetBiomass = medianBiomassRatio === null ? current.biomassMultiplier : 1 + (medianBiomassRatio - 1) * reliability;

  return {
    adgMultiplier: stepToward(
      current.adgMultiplier,
      targetAdg,
      LIMITS.adgMultiplier.maxStep,
      LIMITS.adgMultiplier.min,
      LIMITS.adgMultiplier.max,
    ),
    survivalOffsetPercentagePoints: stepToward(
      current.survivalOffsetPercentagePoints,
      targetSurvival,
      LIMITS.survivalOffsetPercentagePoints.maxStep,
      LIMITS.survivalOffsetPercentagePoints.min,
      LIMITS.survivalOffsetPercentagePoints.max,
    ),
    biomassMultiplier: stepToward(
      current.biomassMultiplier,
      targetBiomass,
      LIMITS.biomassMultiplier.maxStep,
      LIMITS.biomassMultiplier.min,
      LIMITS.biomassMultiplier.max,
    ),
    sampleSize: training.length,
  };
};

const metricDoesNotRegressMaterially = (currentMetrics, candidateMetrics) =>
  ["mbw", "survival", "biomass"].every((key) => {
    const current = finiteNumber(currentMetrics[key]);
    const candidate = finiteNumber(candidateMetrics[key]);
    if (current === null || candidate === null) return true;
    return candidate <= current + 0.03;
  });

const proposeAdjustment = (currentValue, outcomes, minimumOutcomes = 6) => {
  if (outcomes.length < minimumOutcomes) {
    return {
      status: "insufficient_data",
      current: normalizeAdjustment(currentValue),
      candidate: null,
      trainingOutcomeCount: 0,
      validationOutcomeCount: 0,
      currentEvaluation: null,
      candidateEvaluation: null,
    };
  }

  const { training, validation } = splitOutcomes(outcomes);
  if (training.length < 3 || validation.length < 2) {
    return {
      status: "insufficient_data",
      current: normalizeAdjustment(currentValue),
      candidate: null,
      trainingOutcomeCount: training.length,
      validationOutcomeCount: validation.length,
      currentEvaluation: null,
      candidateEvaluation: null,
    };
  }

  const current = normalizeAdjustment(currentValue);
  const candidate = buildCandidateAdjustment(current, training);
  const currentEvaluation = evaluateAdjustment(validation, current);
  const candidateEvaluation = evaluateAdjustment(validation, candidate);
  const currentScore = finiteNumber(currentEvaluation.score);
  const candidateScore = finiteNumber(candidateEvaluation.score);
  const improved = currentScore !== null && candidateScore !== null &&
    candidateScore + 0.002 < currentScore * 0.99 &&
    metricDoesNotRegressMaterially(currentEvaluation.metrics, candidateEvaluation.metrics);

  return {
    status: improved ? "promoted" : "rejected",
    current,
    candidate,
    trainingOutcomeCount: training.length,
    validationOutcomeCount: validation.length,
    currentEvaluation,
    candidateEvaluation,
  };
};

module.exports = {
  DEFAULT_ADJUSTMENT,
  LIMITS,
  normalizeAdjustment,
  normalizePondNameKey,
  predictOutcomeWithAdjustment,
  evaluateAdjustment,
  splitOutcomes,
  buildCandidateAdjustment,
  proposeAdjustment,
};
