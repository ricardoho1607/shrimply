const crypto = require("crypto");
const { HttpsError } = require("firebase-functions/v2/https");
const { onCall } = require('./shared/guardedCallable');
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const {
  enforceFixedWindowLimits,
  logCallableAppCheckStatus,
} = require("./abuseProtection");
const {
  DEFAULT_ADJUSTMENT,
  normalizeAdjustment,
  normalizePondNameKey,
  proposeAdjustment,
} = require("./orsonLearningCore");

const DAY_MS = 24 * 60 * 60 * 1000;
const LEARNING_SCHEMA_VERSION = 1;
const DEFAULT_VERSION_ID = "default-v1";
const PROJECTION_MODEL_VERSION = "harvest-projection-v3";
const MAX_CALIBRATION_OUTCOMES = 1000;

const finiteNumber = (value) => typeof value === "number" && Number.isFinite(value) ? value : null;
const parsedNumber = (value) => {
  if (finiteNumber(value) !== null) return value;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};
const boundedNumber = (value, min, max) => {
  const parsed = parsedNumber(value);
  return parsed !== null && parsed >= min && parsed <= max ? parsed : null;
};
const positiveNumber = (value) => {
  const parsed = parsedNumber(value);
  return parsed !== null && parsed > 0 ? parsed : null;
};
const round = (value, decimals = 4) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};
const safeString = (value, maxLength = 160) => typeof value === "string" ? value.trim().slice(0, maxLength) : "";
const dateString = (value) => {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().split("T")[0];
};
const timestampMs = (value) => {
  if (!value) return null;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (typeof value === "string") {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};
const isBaselineSampling = (sampling) => Boolean(sampling?.isBaselineEstimate) || sampling?.source === "midcycle_onboarding";

const samplingDateMs = (sampling) => {
  const parsed = new Date(sampling?.date || 0).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

const samplingMbw = (sampling) => positiveNumber(sampling?.mbw ?? sampling?.abw);

const median = (values) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};

const projectMbwWithTapering = (currentMbw, adg, days, maximumMbw = 50) => {
  if (days <= 0) return currentMbw;
  const boundedMaximum = Math.max(currentMbw + 1, maximumMbw);
  const growthConstant = adg / (boundedMaximum - currentMbw);
  return boundedMaximum - ((boundedMaximum - currentMbw) * Math.exp(-growthConstant * days));
};

const feedRateFromMbw = (mbw) => {
  const table = [[1.65, 6.5], [3, 6.5], [5, 5.5], [7.5, 4.2], [10.5, 3.6], [14, 3.3], [17.5, 3.1], [21, 2.9], [25, 2.7], [29, 2.5], [33, 2.3]];
  if (mbw < 1.65) return null;
  if (mbw > 33) return 2.1;
  for (let index = 0; index < table.length - 1; index += 1) {
    const [leftMbw, leftRate] = table[index];
    const [rightMbw, rightRate] = table[index + 1];
    if (mbw <= leftMbw) return leftRate;
    if (mbw <= rightMbw) {
      const ratio = (mbw - leftMbw) / (rightMbw - leftMbw);
      return leftRate + ratio * (rightRate - leftRate);
    }
  }
  return 2.3;
};

const defaultDailyMortalityRate = (doc) => doc <= 10 ? 0.004 : doc <= 30 ? 0.003 : 0.0015;

const defaultSurvivalRetention = (startDoc, days) => {
  let retention = 1;
  for (let day = 1; day <= days; day += 1) retention *= 1 - defaultDailyMortalityRate(startDoc + day);
  return retention;
};

const calculateServerProjectionBase = (pond, daysToHarvest, now = new Date()) => {
  const samplings = (Array.isArray(pond.samplings) ? pond.samplings : [])
    .filter((sampling) => sampling && typeof sampling === "object")
    .sort((a, b) => (samplingDateMs(a) ?? 0) - (samplingDateMs(b) ?? 0));
  const validMbw = samplings.filter((sampling) => samplingMbw(sampling) !== null);
  const recentMbw = validMbw.slice(-5);
  const initialWeight = positiveNumber(pond.initialWeight ?? pond.initialWeightG) ?? 0.5;
  const currentMbwG = samplingMbw(validMbw[validMbw.length - 1]) ?? positiveNumber(pond.baselineMbw) ?? initialWeight;
  let baseAdg = null;
  if (recentMbw.length >= 2) {
    const intervalGrowth = recentMbw.slice(1).map((sampling, index) => {
      const previous = recentMbw[index];
      const days = ((samplingDateMs(sampling) ?? 0) - (samplingDateMs(previous) ?? 0)) / DAY_MS;
      return days > 0 ? (samplingMbw(sampling) - samplingMbw(previous)) / days : null;
    }).filter((growth) => finiteNumber(growth) !== null);
    if (intervalGrowth.length > 0) baseAdg = median(intervalGrowth);
  } else if (recentMbw.length === 1) {
    const sampling = recentMbw[0];
    const startValue = pond.docStart || pond.stockingDate || pond.startDate;
    const startMs = startValue ? new Date(startValue).getTime() : NaN;
    const days = ((samplingDateMs(sampling) ?? 0) - startMs) / DAY_MS;
    if (Number.isFinite(days) && days > 0) baseAdg = (samplingMbw(sampling) - initialWeight) / days;
  }
  if (finiteNumber(baseAdg) === null || baseAdg <= 0) {
    baseAdg = currentMbwG < 3 ? 0.12 : currentMbwG < 10 ? 0.18 : 0.2;
  }

  const startValue = pond.docStart || pond.stockingDate || pond.startDate;
  const startMs = startValue ? new Date(startValue).getTime() : NaN;
  const currentDoc = Number.isFinite(startMs) ? Math.max(0, Math.floor((now.getTime() - startMs) / DAY_MS)) : null;
  const explicitPopulation = positiveNumber(pond.initialPopulation ?? pond.initialStock);
  const area = positiveNumber(pond.pondArea ?? pond.area ?? pond.areaM2);
  const density = positiveNumber(pond.density ?? pond.stockingDensity ?? pond.densityPerM2);
  const initialPopulation = explicitPopulation ?? (area !== null && density !== null ? area * density : null);
  const samplingMortality = samplings
    .filter((sampling) => !isBaselineSampling(sampling))
    .reduce((sum, sampling) => sum + (positiveNumber(sampling?.mortality ?? sampling?.dead ?? sampling?.deaths) ?? 0), 0);
  const mortalityRecordCount = (Array.isArray(pond.mortalityRecords) ? pond.mortalityRecords : [])
    .reduce((sum, record) => record?.observationType === "none_observed"
      ? sum
      : sum + (positiveNumber(record?.count) ?? 0), 0);
  const mortalityCount = samplingMortality + mortalityRecordCount;
  const harvestedPopulation = parsedNumber(pond.totalHarvestedPopulation ?? pond.harvestedPopulation) ?? 0;
  const recordPopulation = initialPopulation !== null
    ? Math.max(0, initialPopulation - mortalityCount - harvestedPopulation)
    : null;
  const benchmark = pond.historicalBenchmark || pond.pastCycleBenchmark || {};
  const completedCycles = positiveNumber(benchmark.completedCycleCount) ?? 0;
  const historicalSurvival = positiveNumber(benchmark.averageSurvivalPercent ?? benchmark.survivalRate);
  const historicalDoc = positiveNumber(benchmark.averageCycleDoc) ?? 120;
  const calibratedDailyMortalityRate = completedCycles >= 3 && historicalSurvival !== null && historicalSurvival >= 50 && historicalSurvival < 100
    ? Math.min(0.01, Math.max(0.0001, 1 - Math.pow(historicalSurvival / 100, 1 / historicalDoc)))
    : null;
  const expectedDailyMortalityRate = calibratedDailyMortalityRate ?? defaultDailyMortalityRate(currentDoc ?? 0);
  const currentSurvivalRetention = currentDoc === null
    ? 1
    : calibratedDailyMortalityRate !== null
      ? Math.pow(1 - calibratedDailyMortalityRate, currentDoc)
      : defaultSurvivalRetention(0, currentDoc);
  let basePopulation = initialPopulation !== null && currentDoc !== null
    ? Math.min(recordPopulation, Math.max(0, initialPopulation * currentSurvivalRetention - harvestedPopulation))
    : recordPopulation;

  if (basePopulation !== null && currentDoc !== null && currentDoc >= 15 && currentMbwG >= 1.65) {
    const feedByDate = new Map();
    samplings.forEach((sampling) => {
      if (isBaselineSampling(sampling) || !sampling?.feedData) return;
      const response = sampling.feedData.feedingResponse;
      if (response === "weak" || response === "strong") return;
      const samplingMs = samplingDateMs(sampling);
      if (samplingMs === null) return;
      const ageDays = Math.floor((now.getTime() - samplingMs) / DAY_MS);
      if (ageDays < 0 || ageDays > 6) return;
      const feed = positiveNumber(sampling.feedData.totalDailyFeed ?? sampling.feed);
      const key = dateString(sampling.date);
      if (feed !== null && key) feedByDate.set(key, Math.max(feedByDate.get(key) || 0, feed));
    });
    const recentFeed = [...feedByDate.entries()].sort(([left], [right]) => left.localeCompare(right)).slice(-5).map(([, feed]) => feed);
    const feedRate = feedRateFromMbw(currentMbwG);
    if (recentFeed.length >= 3 && feedRate !== null) {
      const feedPopulation = ((median(recentFeed) / (feedRate / 100)) * 1000) / currentMbwG;
      const difference = Math.abs(feedPopulation - basePopulation) / basePopulation;
      if (difference <= 0.35) basePopulation = Math.min(recordPopulation, (basePopulation * 0.8) + (feedPopulation * 0.2));
    }
  }

  const baseSurvival = initialPopulation !== null && basePopulation !== null ? (basePopulation / initialPopulation) * 100 : null;
  const maximumMbw = Math.max(50, (positiveNumber(benchmark.averageFinalMbwG) ?? 0) * 1.15, currentMbwG + 1);
  const baseProjectedMbwG = round(projectMbwWithTapering(currentMbwG, baseAdg, daysToHarvest, maximumMbw), 3);
  const futureSurvivalRetention = calibratedDailyMortalityRate !== null
    ? Math.pow(1 - calibratedDailyMortalityRate, daysToHarvest)
    : defaultSurvivalRetention(currentDoc ?? 0, daysToHarvest);
  const futurePopulation = basePopulation !== null
    ? basePopulation * futureSurvivalRetention
    : null;
  const baseProjectedBiomassKg = futurePopulation !== null ? round((futurePopulation * baseProjectedMbwG) / 1000, 3) : null;

  return {
    currentMbwG: round(currentMbwG, 3),
    baseAssumedAdgGPerDay: round(baseAdg, 4),
    baseProjectedMbwG,
    baseAssumedSurvivalPercent: baseSurvival === null ? null : round(baseSurvival, 3),
    baseProjectedBiomassKg,
    currentPopulationAtPrediction: basePopulation === null ? null : round(basePopulation, 0),
    recordPopulationCap: recordPopulation === null ? null : round(recordPopulation, 0),
    expectedDailyMortalityRatePercent: round(expectedDailyMortalityRate * 100, 4),
    futureSurvivalRetention: round(futureSurvivalRetention, 8),
    initialPopulation,
    mortalityCountAtPrediction: round(mortalityCount, 0),
    harvestedPopulationAtPrediction: round(Math.max(0, harvestedPopulation), 0),
  };
};

const createDefaultProfile = () => ({
  schemaVersion: LEARNING_SCHEMA_VERSION,
  versionNumber: 0,
  versionId: DEFAULT_VERSION_ID,
  status: "default",
  companyAdjustment: { ...DEFAULT_ADJUSTMENT },
  pondAdjustments: [],
  eligibleOutcomeCount: 0,
  trainingOutcomeCount: 0,
  validationOutcomeCount: 0,
  previousScore: null,
  validationScore: null,
});

const normalizeProfile = (value) => {
  const fallback = createDefaultProfile();
  if (!value || typeof value !== "object") return fallback;
  const versionNumber = Math.max(0, Math.floor(finiteNumber(value.versionNumber) ?? 0));
  const companyAdjustment = normalizeAdjustment(value.companyAdjustment, fallback.companyAdjustment);
  const pondAdjustments = Array.isArray(value.pondAdjustments)
    ? value.pondAdjustments.map((item) => {
      const pondName = safeString(item?.pondName, 120);
      const pondNameKey = normalizePondNameKey(item?.pondNameKey || pondName);
      if (!pondNameKey) return null;
      return { pondName, pondNameKey, ...normalizeAdjustment(item, companyAdjustment) };
    }).filter(Boolean).slice(0, 200)
    : [];
  return {
    ...fallback,
    ...value,
    schemaVersion: LEARNING_SCHEMA_VERSION,
    versionNumber,
    versionId: safeString(value.versionId, 80) || (versionNumber > 0 ? `v${versionNumber}` : DEFAULT_VERSION_ID),
    status: versionNumber > 0 && value.status === "active" ? "active" : "default",
    companyAdjustment,
    pondAdjustments,
    eligibleOutcomeCount: Math.max(0, Math.floor(finiteNumber(value.eligibleOutcomeCount) ?? 0)),
  };
};

const getProfileAdjustment = (profileValue, pondName) => {
  const profile = normalizeProfile(profileValue);
  const pondNameKey = normalizePondNameKey(pondName);
  const pondAdjustment = profile.pondAdjustments.find((item) => item.pondNameKey === pondNameKey);
  if (pondAdjustment && pondAdjustment.sampleSize > 0) {
    return { profile, adjustment: pondAdjustment, scope: "pond" };
  }
  if (profile.status === "active" && profile.companyAdjustment.sampleSize > 0) {
    return { profile, adjustment: profile.companyAdjustment, scope: "company" };
  }
  return { profile, adjustment: { ...DEFAULT_ADJUSTMENT }, scope: "default" };
};

const getSamplingFeed = (sampling) => {
  const direct = positiveNumber(sampling?.feed);
  if (direct !== null) return direct;
  return positiveNumber(sampling?.feedData?.totalDailyFeed) ?? 0;
};

const getTotalFeed = (pond) => {
  const samplings = Array.isArray(pond.samplings) ? pond.samplings : [];
  const pondBaseline = positiveNumber(pond.baselineCumulativeFeed);
  const baselineFeed = pondBaseline ?? samplings
    .filter(isBaselineSampling)
    .reduce((maximum, sampling) => Math.max(
      maximum,
      positiveNumber(sampling.cumulativeFeedToDate) ?? getSamplingFeed(sampling),
    ), 0);
  const operational = samplings.filter((sampling) => !isBaselineSampling(sampling));
  const feedManagementTotal = operational
    .filter((sampling) => sampling?.feedData && typeof sampling.feedData === "object")
    .reduce((sum, sampling) => sum + getSamplingFeed(sampling), 0);
  const samplingFeedTotal = operational.reduce((sum, sampling) => sum + (positiveNumber(sampling?.feed) ?? 0), 0);
  return round(baselineFeed + (feedManagementTotal > 0 ? feedManagementTotal : samplingFeedTotal), 3);
};

const selectPrediction = (predictions, pond, endedAt) => {
  const endedMs = new Date(endedAt).getTime();
  const cycleId = safeString(pond.cycleId);
  const pondCycleId = safeString(pond.pondCycleId) || safeString(pond.id);
  return predictions
    .filter((prediction) => {
      if (cycleId && prediction.cycleId && prediction.cycleId !== cycleId) return false;
      if (pondCycleId && prediction.pondCycleId && prediction.pondCycleId !== pondCycleId) return false;
      const createdMs = timestampMs(prediction.createdAt);
      return createdMs === null || createdMs <= endedMs + DAY_MS;
    })
    .sort((a, b) => {
      const aTarget = new Date(a.targetDate || 0).getTime();
      const bTarget = new Date(b.targetDate || 0).getTime();
      const targetDistance = Math.abs(aTarget - endedMs) - Math.abs(bTarget - endedMs);
      if (targetDistance !== 0) return targetDistance;
      return (timestampMs(b.createdAt) ?? 0) - (timestampMs(a.createdAt) ?? 0);
    })[0] || null;
};

const percentError = (predicted, actual) => {
  const predictedNumber = finiteNumber(predicted);
  const actualNumber = finiteNumber(actual);
  if (predictedNumber === null || actualNumber === null || actualNumber <= 0) return null;
  return round(Math.abs(predictedNumber - actualNumber) / actualNumber);
};

const buildOutcome = ({ companyId, pondId, pond, predictions, endedAtOverride }) => {
  const endedAt = dateString(pond.cycleEndedAt) || dateString(endedAtOverride) || new Date().toISOString().split("T")[0];
  const selectedPrediction = selectPrediction(predictions, { id: pondId, ...pond }, endedAt);
  const initialPopulation = positiveNumber(pond.initialPopulation ?? pond.initialStock);
  const initialWeight = positiveNumber(pond.initialWeight ?? pond.initialWeightG);
  const harvestedBiomass = positiveNumber(pond.totalHarvestedBiomass ?? pond.harvestedBiomass);
  const harvestedPopulation = positiveNumber(pond.totalHarvestedPopulation ?? pond.harvestedPopulation);
  const actualMbw = harvestedBiomass !== null && harvestedPopulation !== null
    ? round((harvestedBiomass * 1000) / harvestedPopulation, 3)
    : null;
  const actualSurvival = initialPopulation !== null && harvestedPopulation !== null
    ? round((harvestedPopulation / initialPopulation) * 100, 3)
    : null;
  const totalFeedKg = getTotalFeed(pond);
  const initialBiomass = initialPopulation !== null && initialWeight !== null
    ? (initialPopulation * initialWeight) / 1000
    : null;
  const biomassGain = harvestedBiomass !== null && initialBiomass !== null
    ? harvestedBiomass - initialBiomass
    : null;
  const actualFcr = totalFeedKg > 0 && biomassGain !== null && biomassGain > 0
    ? round(totalFeedKg / biomassGain, 4)
    : null;
  const cycleEndReason = safeString(pond.cycleEndReason, 40) || "unknown";
  const learningContext = selectedPrediction?.learningContext || {};
  const missingFields = [];
  if (initialPopulation === null) missingFields.push("initialPopulation");
  if (initialWeight === null) missingFields.push("initialWeight");
  if (harvestedBiomass === null) missingFields.push("harvestedBiomass");
  if (harvestedPopulation === null) missingFields.push("harvestedPopulation");
  if (!selectedPrediction) missingFields.push("predictionSnapshot");
  const hasLearningContext = Boolean(
    selectedPrediction &&
    finiteNumber(selectedPrediction.daysToHarvest) !== null && selectedPrediction.daysToHarvest > 0 &&
    finiteNumber(learningContext.currentMbwG) !== null &&
    finiteNumber(learningContext.baseAssumedAdgGPerDay) !== null &&
    finiteNumber(learningContext.baseAssumedSurvivalPercent) !== null &&
    finiteNumber(learningContext.initialPopulation) !== null
  );
  if (!hasLearningContext) missingFields.push("predictionLearningContext");
  if (cycleEndReason !== "harvested") missingFields.push("completedHarvestEndReason");
  if (actualSurvival !== null && actualSurvival < 30) missingFields.push("plausibleCompleteHarvestPopulation");
  if (pond.cycleStartMode === "midcycle") missingFields.push("fullCycleHistory");
  if (learningContext.manualAdgOverride || learningContext.manualSurvivalOverride) missingFields.push("unmodifiedOrsonAssumptions");

  const actual = {
    mbwG: actualMbw,
    biomassKg: harvestedBiomass,
    survivalPercent: actualSurvival,
    fcr: actualFcr,
    harvestedPopulation,
    totalFeedKg: totalFeedKg > 0 ? totalFeedKg : null,
  };
  const predicted = selectedPrediction?.projected || {};
  const endedMs = new Date(endedAt).getTime();
  const targetMs = selectedPrediction?.targetDate ? new Date(selectedPrediction.targetDate).getTime() : NaN;
  const errors = {
    mbwAbsolutePercent: percentError(finiteNumber(predicted.mbwG), actualMbw),
    biomassAbsolutePercent: percentError(finiteNumber(predicted.biomassKg), harvestedBiomass),
    survivalAbsolutePercent: percentError(finiteNumber(predicted.survivalPercent), actualSurvival),
    survivalPercentagePoints: finiteNumber(predicted.survivalPercent) !== null && actualSurvival !== null
      ? round(Math.abs(predicted.survivalPercent - actualSurvival), 3)
      : null,
    fcrAbsolutePercent: percentError(finiteNumber(predicted.fcr), actualFcr),
    targetDateDays: Number.isFinite(targetMs) ? Math.round(Math.abs(targetMs - endedMs) / DAY_MS) : null,
  };
  const requiredFieldCount = 6;
  const presentFieldCount = requiredFieldCount - [
    initialPopulation,
    initialWeight,
    harvestedBiomass,
    harvestedPopulation,
    selectedPrediction,
    cycleEndReason === "harvested" ? true : null,
  ].filter((value) => value === null).length;
  const eligibleForCalibration = Boolean(
    selectedPrediction &&
    hasLearningContext &&
    initialPopulation !== null &&
    initialWeight !== null &&
    harvestedBiomass !== null &&
    harvestedPopulation !== null &&
    actualMbw !== null && actualMbw >= 1 && actualMbw <= 100 &&
    actualSurvival !== null && actualSurvival >= 30 && actualSurvival <= 100 &&
    cycleEndReason === "harvested" &&
    pond.cycleStartMode !== "midcycle" &&
    !learningContext.manualAdgOverride &&
    !learningContext.manualSurvivalOverride
  );

  return {
    schemaVersion: LEARNING_SCHEMA_VERSION,
    companyId,
    pondId,
    pondName: safeString(pond.pondName || pond.name, 120) || "Unnamed pond",
    pondNameKey: normalizePondNameKey(pond.pondName || pond.name),
    cycleId: safeString(pond.cycleId) || null,
    pondCycleId: safeString(pond.pondCycleId) || pondId,
    supplier: safeString(pond.plSupplier || pond.supplier, 160) || null,
    density: positiveNumber(pond.density ?? pond.stockingDensity),
    endedAt,
    cycleEndReason,
    eligibleForCalibration,
    prediction: selectedPrediction ? {
      id: selectedPrediction.id,
      createdAt: selectedPrediction.createdAt || null,
      targetDate: selectedPrediction.targetDate,
      daysToHarvest: selectedPrediction.daysToHarvest,
      modelVersion: selectedPrediction.modelVersion,
      calibrationVersionId: selectedPrediction.calibrationVersionId,
      projected: selectedPrediction.projected,
      learningContext: selectedPrediction.learningContext,
    } : null,
    actual,
    errors,
    dataQuality: {
      score: round(presentFieldCount / requiredFieldCount, 2),
      missingFields,
    },
  };
};

const actualSourceSignature = (pond) => JSON.stringify({
  cycleStatus: pond.cycleStatus,
  cycleEndedAt: pond.cycleEndedAt,
  cycleEndReason: pond.cycleEndReason,
  totalHarvestedBiomass: pond.totalHarvestedBiomass,
  totalHarvestedPopulation: pond.totalHarvestedPopulation,
  samplings: (Array.isArray(pond.samplings) ? pond.samplings : []).map((sampling) => ({
    id: sampling?.id,
    feed: sampling?.feed,
    feedData: sampling?.feedData?.totalDailyFeed,
    cumulativeFeedToDate: sampling?.cumulativeFeedToDate,
  })),
});

module.exports = ({ admin, assertCompanyMemberForCallable }) => {
  const serverTimestamp = () => admin.firestore.FieldValue.serverTimestamp();

  const writeOutcomeDocuments = async (db, companyId, outcomes) => {
    for (let index = 0; index < outcomes.length; index += 400) {
      const batch = db.batch();
      outcomes.slice(index, index + 400).forEach(({ pondId, data }) => {
        const ref = db.collection("companies").doc(companyId).collection("orsonCycleOutcomes").doc(pondId);
        batch.set(ref, { ...data, evaluatedAt: serverTimestamp() }, { merge: true });
      });
      await batch.commit();
    }
  };

  const recalibrateCompany = async (db, companyId, source, attempt = 0) => {
    const companyRef = db.collection("companies").doc(companyId);
    const currentRef = companyRef.collection("orsonCalibration").doc("current");
    const [currentSnap, outcomesSnap] = await Promise.all([
      currentRef.get(),
      companyRef.collection("orsonCycleOutcomes").orderBy("endedAt", "desc").limit(MAX_CALIBRATION_OUTCOMES).get(),
    ]);
    const currentProfile = normalizeProfile(currentSnap.exists ? currentSnap.data() : null);
    const outcomes = outcomesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((outcome) => outcome.eligibleForCalibration === true);
    const companyProposal = proposeAdjustment(currentProfile.companyAdjustment, outcomes);
    const nextCompanyAdjustment = companyProposal.status === "promoted"
      ? { ...companyProposal.candidate, sampleSize: outcomes.length }
      : currentProfile.companyAdjustment;
    const companyChanged = companyProposal.status === "promoted";
    let changed = companyChanged;

    const outcomeGroups = new Map();
    outcomes.forEach((outcome) => {
      const key = normalizePondNameKey(outcome.pondNameKey || outcome.pondName);
      if (!key) return;
      const group = outcomeGroups.get(key) || [];
      group.push(outcome);
      outcomeGroups.set(key, group);
    });
    const existingByPond = new Map(currentProfile.pondAdjustments.map((item) => [item.pondNameKey, item]));
    const nextPondAdjustments = [...currentProfile.pondAdjustments];
    const pondEvaluationSummaries = [];

    outcomeGroups.forEach((group, pondNameKey) => {
      if (group.length < 6) return;
      const existing = existingByPond.get(pondNameKey);
      const comparison = existing || nextCompanyAdjustment;
      const proposal = proposeAdjustment(comparison, group);
      pondEvaluationSummaries.push({
        pondNameKey,
        outcomeCount: group.length,
        status: proposal.status,
        currentScore: proposal.currentEvaluation?.score ?? null,
        candidateScore: proposal.candidateEvaluation?.score ?? null,
      });
      if (proposal.status !== "promoted") return;
      const pondName = safeString(group[0]?.pondName, 120);
      const adjustment = { pondName, pondNameKey, ...proposal.candidate, sampleSize: group.length };
      const existingIndex = nextPondAdjustments.findIndex((item) => item.pondNameKey === pondNameKey);
      if (existingIndex >= 0) nextPondAdjustments[existingIndex] = adjustment;
      else nextPondAdjustments.push(adjustment);
      changed = true;
    });

    const nextVersionNumber = changed ? currentProfile.versionNumber + 1 : currentProfile.versionNumber;
    const nextVersionId = changed ? `v${nextVersionNumber}-${Date.now()}` : currentProfile.versionId;
    const currentScore = companyProposal.currentEvaluation?.score ?? null;
    const candidateScore = companyProposal.candidateEvaluation?.score ?? null;
    const nextProfile = {
      ...currentProfile,
      schemaVersion: LEARNING_SCHEMA_VERSION,
      versionNumber: nextVersionNumber,
      versionId: nextVersionId,
      status: nextVersionNumber > 0 ? "active" : "default",
      companyAdjustment: nextCompanyAdjustment,
      pondAdjustments: nextPondAdjustments.slice(0, 200),
      eligibleOutcomeCount: outcomes.length,
      trainingOutcomeCount: companyProposal.trainingOutcomeCount,
      validationOutcomeCount: companyProposal.validationOutcomeCount,
      previousScore: currentScore,
      validationScore: companyChanged ? candidateScore : currentScore,
      lastEvaluationStatus: changed ? "promoted" : companyProposal.status,
      lastEvaluationSource: source,
      updatedAt: serverTimestamp(),
    };
    const evaluationRef = companyRef.collection("orsonCalibrationEvaluations").doc();
    const versionRef = companyRef.collection("orsonCalibration").doc(nextVersionId);
    const transactionResult = await db.runTransaction(async (transaction) => {
      const latestSnap = await transaction.get(currentRef);
      const latestProfile = normalizeProfile(latestSnap.exists ? latestSnap.data() : null);
      if (latestProfile.versionNumber !== currentProfile.versionNumber) return { retry: true };
      transaction.set(currentRef, nextProfile, { merge: true });
      if (changed) transaction.set(versionRef, nextProfile);
      transaction.set(evaluationRef, {
        schemaVersion: LEARNING_SCHEMA_VERSION,
        source,
        status: changed ? "promoted" : companyProposal.status,
        priorVersionId: currentProfile.versionId,
        resultingVersionId: nextVersionId,
        eligibleOutcomeCount: outcomes.length,
        trainingOutcomeCount: companyProposal.trainingOutcomeCount,
        validationOutcomeCount: companyProposal.validationOutcomeCount,
        currentAdjustment: companyProposal.current,
        candidateAdjustment: companyProposal.candidate,
        currentEvaluation: companyProposal.currentEvaluation,
        candidateEvaluation: companyProposal.candidateEvaluation,
        pondEvaluations: pondEvaluationSummaries.slice(0, 200),
        evaluatedAt: serverTimestamp(),
      });
      return { retry: false };
    });
    if (transactionResult.retry && attempt < 2) return recalibrateCompany(db, companyId, source, attempt + 1);
    if (transactionResult.retry) throw new Error(`Orson calibration changed concurrently for company ${companyId}.`);
    return { status: changed ? "promoted" : companyProposal.status, versionId: nextVersionId, outcomeCount: outcomes.length };
  };

  const processSinglePond = async (db, companyId, pondId, pond) => {
    const predictionsSnap = await db.collection("companies").doc(companyId)
      .collection("orsonPredictions").where("pondId", "==", pondId).get();
    const predictions = predictionsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const outcome = buildOutcome({ companyId, pondId, pond, predictions });
    await writeOutcomeDocuments(db, companyId, [{ pondId, data: outcome }]);
    return outcome;
  };

  const processFarmCycle = async (db, companyId, cycleId, cycle) => {
    const companyRef = db.collection("companies").doc(companyId);
    const [pondsSnap, predictionsSnap] = await Promise.all([
      companyRef.collection("ponds").where("cycleId", "==", cycleId).get(),
      companyRef.collection("orsonPredictions").where("cycleId", "==", cycleId).get(),
    ]);
    const predictionsByPond = new Map();
    predictionsSnap.docs.forEach((doc) => {
      const prediction = { id: doc.id, ...doc.data() };
      const group = predictionsByPond.get(prediction.pondId) || [];
      group.push(prediction);
      predictionsByPond.set(prediction.pondId, group);
    });
    const outcomes = pondsSnap.docs.map((doc) => ({
      pondId: doc.id,
      data: buildOutcome({
        companyId,
        pondId: doc.id,
        pond: doc.data() || {},
        predictions: predictionsByPond.get(doc.id) || [],
        endedAtOverride: cycle.closedAt,
      }),
    }));
    if (outcomes.length > 0) await writeOutcomeDocuments(db, companyId, outcomes);
    const calibration = await recalibrateCompany(db, companyId, `cycle:${cycleId}`);
    return { outcomeCount: outcomes.length, calibration };
  };

  const recordOrsonPrediction = onCall({ timeoutSeconds: 60 }, async (request) => {
    const uid = request.auth?.uid;
    const companyId = safeString(request.data?.companyId, 160);
    const pondId = safeString(request.data?.pondId, 160);
    const db = admin.firestore();
    await assertCompanyMemberForCallable(db, uid, companyId, "useOrson");
    if (!pondId || pondId.includes("/")) throw new HttpsError("invalid-argument", "pondId is required.");
    await enforceFixedWindowLimits({
      db,
      admin,
      limits: [{
        namespace: "orsonPredictionBurst",
        scope: `user:${uid}`,
        limit: 30,
        windowMs: 60_000,
        message: "Too many Orson prediction requests. Try again shortly.",
      }],
    });
    logCallableAppCheckStatus(request, "recordOrsonPrediction");

    const companyRef = db.collection("companies").doc(companyId);
    const [pondSnap, calibrationSnap] = await Promise.all([
      companyRef.collection("ponds").doc(pondId).get(),
      companyRef.collection("orsonCalibration").doc("current").get(),
    ]);
    if (!pondSnap.exists) throw new HttpsError("not-found", "Pond not found in this company.");
    const pond = pondSnap.data() || {};
    if (pond.cycleStatus === "ended") throw new HttpsError("failed-precondition", "Ended pond cycles cannot create new predictions.");

    const targetDate = dateString(request.data?.targetDate);
    const daysToHarvest = boundedNumber(request.data?.daysToHarvest, 0, 365);
    if (!targetDate || daysToHarvest === null) throw new HttpsError("invalid-argument", "A valid prediction target is required.");
    const targetDistance = new Date(targetDate).getTime() - Date.now();
    if (targetDistance < -DAY_MS || targetDistance > 366 * DAY_MS) {
      throw new HttpsError("invalid-argument", "Prediction target date is outside the supported range.");
    }

    const requestProjected = {
      mbwG: boundedNumber(request.data?.projected?.mbwG, 0, 200),
      biomassKg: boundedNumber(request.data?.projected?.biomassKg, 0, 1000000000),
      survivalPercent: boundedNumber(request.data?.projected?.survivalPercent, 0, 100),
      fcr: boundedNumber(request.data?.projected?.fcr, 0, 20),
    };
    const requestContext = request.data?.learningContext || {};
    const manualAdgOverride = requestContext.manualAdgOverride === true;
    const manualSurvivalOverride = requestContext.manualSurvivalOverride === true;
    const serverBase = calculateServerProjectionBase(pond, Math.floor(daysToHarvest));
    const calibration = getProfileAdjustment(calibrationSnap.exists ? calibrationSnap.data() : null, pond.pondName || pond.name);
    let learningContext;
    let projected;

    if (manualAdgOverride || manualSurvivalOverride) {
      learningContext = {
        ...serverBase,
        baseAssumedAdgGPerDay: manualAdgOverride
          ? boundedNumber(requestContext.baseAssumedAdgGPerDay, 0, 5)
          : serverBase.baseAssumedAdgGPerDay,
        baseProjectedMbwG: boundedNumber(requestContext.baseProjectedMbwG, 0, 200),
        baseAssumedSurvivalPercent: manualSurvivalOverride
          ? boundedNumber(requestContext.baseAssumedSurvivalPercent, 0, 100)
          : serverBase.baseAssumedSurvivalPercent,
        baseProjectedBiomassKg: boundedNumber(requestContext.baseProjectedBiomassKg, 0, 1000000000),
        manualAdgOverride,
        manualSurvivalOverride,
      };
      projected = requestProjected;
    } else {
      const adjustedAdg = serverBase.baseAssumedAdgGPerDay * calibration.adjustment.adgMultiplier;
      const benchmark = pond.historicalBenchmark || pond.pastCycleBenchmark || {};
      const maximumMbw = Math.max(50, (positiveNumber(benchmark.averageFinalMbwG) ?? 0) * 1.15, serverBase.currentMbwG + 1);
      const projectedMbwG = round(projectMbwWithTapering(
        serverBase.currentMbwG,
        adjustedAdg,
        daysToHarvest,
        maximumMbw,
      ), 3);
      const calibratedCurrentPopulation = serverBase.currentPopulationAtPrediction !== null && serverBase.initialPopulation !== null
        ? Math.min(
          serverBase.recordPopulationCap,
          Math.max(0, serverBase.currentPopulationAtPrediction +
            (serverBase.initialPopulation * calibration.adjustment.survivalOffsetPercentagePoints) / 100),
        )
        : null;
      const projectedPopulation = calibratedCurrentPopulation !== null
        ? calibratedCurrentPopulation * serverBase.futureSurvivalRetention
        : null;
      const survivalPercent = serverBase.initialPopulation !== null && projectedPopulation !== null
        ? round((projectedPopulation / serverBase.initialPopulation) * 100, 3)
        : null;
      const projectedBiomassKg = projectedPopulation !== null
        ? round((projectedPopulation * projectedMbwG) / 1000 * calibration.adjustment.biomassMultiplier, 3)
        : null;
      learningContext = {
        ...serverBase,
        manualAdgOverride: false,
        manualSurvivalOverride: false,
      };
      projected = {
        mbwG: projectedMbwG,
        biomassKg: projectedBiomassKg,
        survivalPercent,
        fcr: requestProjected.fcr,
      };
    }
    if (Object.values(projected).every((value) => value === null)) {
      throw new HttpsError("invalid-argument", "At least one measurable prediction is required.");
    }
    const cycleId = safeString(pond.cycleId, 160) || safeString(request.data?.cycleId, 160) || null;
    const pondCycleId = safeString(pond.pondCycleId, 160) || safeString(request.data?.pondCycleId, 160) || pondId;
    const prediction = {
      schemaVersion: LEARNING_SCHEMA_VERSION,
      companyId,
      pondId,
      pondName: safeString(pond.pondName || pond.name, 120) || "Unnamed pond",
      pondNameKey: normalizePondNameKey(pond.pondName || pond.name),
      cycleId,
      pondCycleId,
      targetDate,
      daysToHarvest: Math.floor(daysToHarvest),
      modelVersion: PROJECTION_MODEL_VERSION,
      calibrationVersionId: calibration.profile.versionId,
      calibrationScope: calibration.scope,
      calibrationSampleSize: calibration.adjustment.sampleSize,
      confidenceScore: boundedNumber(request.data?.confidenceScore, 0, 1),
      projected,
      learningContext,
      riskIds: Array.isArray(request.data?.riskIds)
        ? request.data.riskIds.map((item) => safeString(item, 80)).filter(Boolean).slice(0, 12)
        : [],
      createdBy: uid,
      createdAt: serverTimestamp(),
    };
    const dedupePayload = { ...prediction, createdAt: undefined, createdBy: undefined };
    const predictionId = crypto.createHash("sha256").update(JSON.stringify(dedupePayload)).digest("hex").slice(0, 40);
    const predictionRef = db.collection("companies").doc(companyId).collection("orsonPredictions").doc(predictionId);
    const created = await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(predictionRef);
      if (existing.exists) return false;
      transaction.create(predictionRef, prediction);
      return true;
    });
    return { predictionId, created, deduplicated: !created };
  });

  const orsonPondCycleLearning = onDocumentUpdated(
    { document: "companies/{companyId}/ponds/{pondId}", timeoutSeconds: 300, memory: "512MiB" },
    async (event) => {
      const before = event.data?.before.data() || {};
      const after = event.data?.after.data() || {};
      if (after.cycleStatus !== "ended") return null;
      const becameEnded = before.cycleStatus !== "ended";
      const actualChanged = actualSourceSignature(before) !== actualSourceSignature(after);
      if (!becameEnded && !actualChanged) return null;

      const { companyId, pondId } = event.params;
      const db = admin.firestore();
      const cycleId = safeString(after.cycleId, 160);
      let cycleClosed = false;
      if (cycleId) {
        const cycleSnap = await db.collection("companies").doc(companyId).collection("cycles").doc(cycleId).get();
        cycleClosed = Boolean(cycleSnap.exists && cycleSnap.data()?.status === "closed");
        if (cycleClosed && becameEnded) return { outcomeUpdated: false, calibrationDeferredToCycle: true };
      }
      await processSinglePond(db, companyId, pondId, after);
      const calibration = await recalibrateCompany(db, companyId, `pond:${pondId}`);
      return { outcomeUpdated: true, lateClosedCycleUpdate: cycleClosed, calibration };
    },
  );

  const orsonFarmCycleLearning = onDocumentUpdated(
    { document: "companies/{companyId}/cycles/{cycleId}", timeoutSeconds: 540, memory: "1GiB" },
    async (event) => {
      const before = event.data?.before.data() || {};
      const after = event.data?.after.data() || {};
      if (before.status === "closed" || after.status !== "closed") return null;
      const { companyId, cycleId } = event.params;
      return processFarmCycle(admin.firestore(), companyId, cycleId, after);
    },
  );

  return {
    recordOrsonPrediction,
    orsonPondCycleLearning,
    orsonFarmCycleLearning,
  };
};

module.exports.__test = {
  buildOutcome,
  actualSourceSignature,
  calculateServerProjectionBase,
  normalizeProfile,
};
