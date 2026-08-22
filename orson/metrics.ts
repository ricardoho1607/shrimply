import type {
  OrsonCalibrationAdjustment,
  OrsonCalibrationProfile,
  OrsonDataCompleteness,
  OrsonFeedBiomassModel,
  OrsonNormalizedPond,
  OrsonNormalizedRecord,
  OrsonNumber,
  OrsonPondMetrics,
  OrsonPromptDailyRecord,
  OrsonPromptLabReport,
  OrsonRangeEstimate,
  OrsonSurvivalAssumption,
  OrsonTrendResult,
} from './types';
import { getOrsonCalibrationAdjustment } from './learning';
import { shiftDateKey } from '../shared/farmDate';
import {
  calculateAdg as calculateSharedAdg,
  calculatePondMetricsWithHarvest,
  detectFeedBiomassMismatchInsight,
  getFeedRateFromMbw,
  getPondBaselineFeed,
  getPondOperationalFeed,
  type PondMetricsWithHarvest,
  type SharedPond,
} from '../shared/pondCalculations';

const hasNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const positive = (value: OrsonNumber): number | null => (hasNumber(value) && value > 0 ? value : null);

const round = (value: number, decimals = 3): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const recordsWith = (
  pond: OrsonNormalizedPond,
  selector: (record: OrsonNormalizedRecord) => OrsonNumber,
): { record: OrsonNormalizedRecord; value: number }[] => {
  return pond.records
    .map((record) => ({ record, value: selector(record) }))
    .filter((point): point is { record: OrsonNormalizedRecord; value: number } => hasNumber(point.value));
};

const latestWith = (
  pond: OrsonNormalizedPond,
  selector: (record: OrsonNormalizedRecord) => OrsonNumber,
): { record: OrsonNormalizedRecord; value: number } | null => {
  const points = recordsWith(pond, selector);
  return points.length > 0 ? points[points.length - 1] : null;
};

const minNumber = (...values: OrsonNumber[]): OrsonNumber => {
  const valid = values.filter(hasNumber);
  if (valid.length === 0) return null;
  return Math.min(...valid);
};

export const getFeedRatePercentFromMbw = (mbwG: OrsonNumber): OrsonNumber => {
  const feedRate = hasNumber(mbwG) ? getFeedRateFromMbw(mbwG) : null;
  return hasNumber(feedRate) ? round(feedRate) : null;
};

export const calculateDoc = (docStartTimestampMs: number | null, targetTimestampMs: number | null): number | null => {
  if (docStartTimestampMs === null || targetTimestampMs === null) return null;
  return Math.max(0, Math.floor((targetTimestampMs - docStartTimestampMs) / (1000 * 60 * 60 * 24)));
};

export const calculateTrend = (
  points: { timestampMs: number | null; value: OrsonNumber }[],
): OrsonTrendResult => {
  const valid = points.filter(
    (point): point is { timestampMs: number; value: number } => point.timestampMs !== null && hasNumber(point.value),
  );

  if (valid.length < 2) {
    const only = valid[0]?.value ?? null;
    return {
      first: only,
      last: only,
      delta: null,
      slopePerDay: null,
      direction: 'unknown',
      points: valid.length,
    };
  }

  const first = valid[0];
  const last = valid[valid.length - 1];
  const days = Math.max(1, (last.timestampMs - first.timestampMs) / (1000 * 60 * 60 * 24));
  const delta = last.value - first.value;
  const slopePerDay = delta / days;
  const direction = Math.abs(delta) < 0.001 ? 'flat' : delta > 0 ? 'up' : 'down';

  return {
    first: round(first.value),
    last: round(last.value),
    delta: round(delta),
    slopePerDay: round(slopePerDay),
    direction,
    points: valid.length,
  };
};

const detectMbwOutliers = (
  mbwPoints: { record: OrsonNormalizedRecord; value: number }[],
): string[] => {
  if (mbwPoints.length < 3) return [];

  const outliers: string[] = [];
  for (let index = 1; index < mbwPoints.length - 1; index += 1) {
    const previous = mbwPoints[index - 1];
    const current = mbwPoints[index];
    const next = mbwPoints[index + 1];

    const expected = (previous.value + next.value) / 2;
    const deviation = Math.abs(current.value - expected);
    const threshold = Math.max(1.5, expected * 0.25);

    if (deviation > threshold && current.record.date) {
      outliers.push(current.record.date);
    }
  }

  return outliers;
};

const calculateDataCompleteness = (pond: OrsonNormalizedPond): OrsonDataCompleteness => {
  const latestMbw = latestWith(pond, (record) => positive(record.mbwG));
  const latestWq = latestWith(pond, (record) => minNumber(record.phMorning, record.phEvening, record.doMorning, record.doEvening));
  const latestFeed = latestWith(pond, (record) => positive(record.feedKg));
  const recentFeedRecords = recordsWith(pond, (record) => positive(record.feedKg)).slice(-5);

  const fields: Record<string, boolean> = {
    docStartDate: pond.docStartDate !== null,
    initialPopulation: hasNumber(pond.initialPopulation),
    initialWeightG: hasNumber(pond.initialWeightG),
    latestMbw: latestMbw !== null,
    latestWaterQuality: latestWq !== null,
    latestFeed: latestFeed !== null,
    recentFeedHistory: recentFeedRecords.length >= 2,
  };

  const presentFields = Object.entries(fields).filter(([, present]) => present).map(([field]) => field);
  const missingFields = Object.entries(fields).filter(([, present]) => !present).map(([field]) => field);

  return {
    score: round(presentFields.length / Object.keys(fields).length, 2),
    presentFields,
    missingFields,
  };
};

const toSharedPond = (pond: OrsonNormalizedPond): SharedPond => ({
  docStart: pond.docStartDate,
  baselineDate: pond.baselineDate,
  baselineDoc: pond.baselineDoc,
  baselineMbw: pond.baselineMbwG,
  initialPopulation: pond.initialPopulation,
  initialWeight: pond.initialWeightG,
  baselineEstimatedPopulation: pond.baselineEstimatedPopulation,
  baselineSurvivalRate: pond.baselineSurvivalRate,
  baselineCumulativeFeed: pond.baselineCumulativeFeedKg,
  totalHarvestedPopulation: pond.totalHarvestedPopulation,
  totalHarvestedBiomass: pond.totalHarvestedBiomassKg,
  postHarvestBaselineDate: pond.postHarvestBaselineDate,
  postHarvestRemainingBiomass: pond.postHarvestRemainingBiomassKg,
  postHarvestRemainingPopulation: pond.postHarvestRemainingPopulation,
  postHarvestReferenceSamplingId: pond.postHarvestReferenceSamplingId,
  postHarvestReferenceSamplingDate: pond.postHarvestReferenceSamplingDate,
  postHarvestReferenceMbw: pond.postHarvestReferenceMbwG,
  samplings: pond.records.map((record) => ({
    id: record.id ?? undefined,
    date: record.date ?? undefined,
    mbw: record.mbwG,
    mortality: record.mortalityObservationType ? null : record.mortalityCount,
    feed: record.feedKg,
    feedData: record.feedData
      ? {
          totalDailyFeed: record.feedData.totalDailyFeedKg,
          feedingResponse: record.feedData.feedingResponse,
        }
      : null,
    isBaselineEstimate: record.isBaselineEstimate,
    source: record.isBaselineEstimate ? 'midcycle_onboarding' : null,
    cumulativeFeedToDate: record.isBaselineEstimate ? record.feedKg : null,
  })),
  mortalityRecords: pond.records
    .filter((record) => record.mortalityObservationType !== null)
    .map((record) => ({
      id: record.id ?? undefined,
      date: record.date ?? undefined,
      observationType: record.mortalityObservationType ?? undefined,
      count: record.mortalityObservedCount,
      notes: record.mortalityNotes,
    })),
  historicalBenchmark: pond.historicalBenchmark
    ? {
        completedCycleCount: pond.historicalBenchmark.completedCycleCount,
        averageSurvivalRate: pond.historicalBenchmark.averageSurvivalPercent,
        averageFinalMbwG: pond.historicalBenchmark.averageFinalMbwG,
      }
    : null,
});

const calculateFeedBiomassModel = (params: {
  pond: OrsonNormalizedPond;
  latestMbwG: OrsonNumber;
  estimatedBiomassKg: OrsonNumber;
  sharedPond: SharedPond;
  sharedMetrics: PondMetricsWithHarvest;
  calibration: OrsonCalibrationAdjustment;
}): OrsonFeedBiomassModel => {
  const {
    pond,
    latestMbwG,
    estimatedBiomassKg,
    sharedPond,
    sharedMetrics,
    calibration,
  } = params;

  const latestFeedRecord = latestWith(pond, (record) => record.isBaselineEstimate ? null : positive(record.feedKg));
  const actualFeedKg = latestFeedRecord?.value ?? null;
  const feedRatePercent = getFeedRatePercentFromMbw(latestMbwG);
  const expectedFeedKg = hasNumber(estimatedBiomassKg) && hasNumber(feedRatePercent)
    ? round((estimatedBiomassKg * feedRatePercent) / 100, 2)
    : null;
  const feedPressureRatio = hasNumber(actualFeedKg) && hasNumber(expectedFeedKg) && expectedFeedKg > 0
    ? round(actualFeedKg / expectedFeedKg, 3)
    : null;

  const feedBasedPopulation = hasNumber(actualFeedKg) && hasNumber(feedRatePercent) && hasNumber(latestMbwG) && latestMbwG > 0
    ? round(((actualFeedKg / feedRatePercent) / latestMbwG) * 100000, 0)
    : null;
  const feedBasedBiomassKg = hasNumber(feedBasedPopulation) && hasNumber(latestMbwG)
    ? round((feedBasedPopulation * latestMbwG) / 1000, 2)
    : null;

  const estimate = sharedMetrics.biomassEstimate;
  const survivalAssumption: OrsonSurvivalAssumption = {
    lowPercent: round(estimate.lowSurvivalPercent, 1),
    expectedPercent: round(estimate.expectedSurvivalPercent, 1),
    highPercent: round(estimate.highSurvivalPercent, 1),
    confidence: estimate.confidence,
    reason: estimate.method === 'record_only'
      ? 'Pond age is unavailable, so survival uses recorded mortality and harvest only.'
      : 'Survival combines the age-based loss curve, recorded mortality, harvests, and eligible recent feed data.',
  };
  const populationRange: OrsonRangeEstimate = {
    low: estimate.lowPopulation,
    expected: estimate.bestPopulation,
    high: estimate.highPopulation,
  };
  const rawBiomassRangeKg: OrsonRangeEstimate = {
    low: round(estimate.lowEstimateKg, 2),
    expected: round(estimate.bestEstimateKg, 2),
    high: round(estimate.highEstimateKg, 2),
  };
  const applyBiomassMultiplier = (value: OrsonNumber): OrsonNumber =>
    hasNumber(value) ? round(value * calibration.biomassMultiplier, 2) : null;
  const biomassRangeKg = calibration.sampleSize > 0
    ? {
        low: applyBiomassMultiplier(rawBiomassRangeKg.low),
        expected: applyBiomassMultiplier(rawBiomassRangeKg.expected),
        high: applyBiomassMultiplier(rawBiomassRangeKg.high),
      }
    : rawBiomassRangeKg;

  const warnings: string[] = [];
  if (hasNumber(feedPressureRatio) && feedPressureRatio > 1.25) {
    warnings.push('Logged feed is higher than expected for the estimated biomass and feed-rate table.');
  }
  if (hasNumber(feedPressureRatio) && feedPressureRatio < 0.75) {
    warnings.push('Logged feed is lower than expected for the estimated biomass; survival or MBW may be overestimated.');
  }
  const feedBiomassInsight = detectFeedBiomassMismatchInsight(sharedPond);
  if (feedBiomassInsight?.latest) {
    warnings.push(`Feed-based biomass and record biomass disagree by ${feedBiomassInsight.latest.differencePercent.toFixed(0)}% across ${feedBiomassInsight.requiredRecords} recent records.`);
  }
  if (survivalAssumption.confidence === 'low') {
    warnings.push(survivalAssumption.reason);
  }
  if (estimate.warnings.includes('feed_biomass_disagreement')) {
    warnings.push('Recent normal-response feed data disagrees with the biological biomass estimate, so feed was not blended into the result.');
  }

  return {
    feedRatePercent,
    expectedFeedKg,
    actualFeedKg,
    feedPressureRatio,
    feedBasedPopulation,
    feedBasedBiomassKg,
    populationRange,
    biomassRangeKg,
    survivalAssumption,
    expectedDailyMortalityRatePercent: estimate.expectedDailyMortalityRatePercent,
    warnings,
  };
};

export const calculatePondMetrics = (
  pond: OrsonNormalizedPond,
  calibrationProfile?: OrsonCalibrationProfile | null,
): OrsonPondMetrics => {
  const calibration = getOrsonCalibrationAdjustment(calibrationProfile, pond.pondName);
  const sharedPond = toSharedPond(pond);
  const currentDateKey = pond.docStartDate && pond.currentDoc !== null
    ? shiftDateKey(pond.docStartDate, pond.currentDoc)
    : [...pond.records].reverse().find((record) => record.date)?.date ?? undefined;
  const sharedMetrics = calculatePondMetricsWithHarvest(sharedPond, undefined, {
    currentDoc: pond.currentDoc ?? undefined,
    currentDateKey,
  });
  const mbwPoints = recordsWith(pond, (record) => positive(record.mbwG));
  const mbwOutlierDates = detectMbwOutliers(mbwPoints);
  const mbwOutlierDateSet = new Set(mbwOutlierDates);
  const cleanMbwPoints = mbwPoints.filter((point) => !point.record.date || !mbwOutlierDateSet.has(point.record.date));
  const latestMbw = mbwPoints.length > 0 ? mbwPoints[mbwPoints.length - 1] : null;
  const latestMbwG = sharedMetrics.latestMbw;
  const baselineFeedKg = getPondBaselineFeed(sharedPond);
  const totalFeedKg = sharedMetrics.totalFeedConsumed;
  const operationalFeedKg = getPondOperationalFeed(sharedPond);
  const totalMortalityCount = sharedMetrics.totalMortality;
  const estimatedCurrentPopulation = sharedMetrics.currentPopulation;
  const sharedAdg = round(calculateSharedAdg(sharedPond));

  const hasMidcycleBaseline = pond.cycleStartMode === 'midcycle' ||
    Boolean(pond.baselineDate) ||
    baselineFeedKg > 0 ||
    hasNumber(pond.baselineEstimatedPopulation) ||
    hasNumber(pond.baselineSurvivalRate);
  const dataAssumptions = hasMidcycleBaseline
    ? [
        `This pond was onboarded mid-cycle${pond.baselineDate ? ` on ${pond.baselineDate}` : ''}. Pre-onboarding feed, survival, and biomass are user-provided estimates.`,
        'Post-baseline records are Shrimply tracked observations; pre-baseline values should not be treated as exact historical logs.',
      ]
    : [];
  if (calibration.scope !== 'default') {
    dataAssumptions.push(
      `Orson calibration ${calibration.versionId} uses ${calibration.adjustment.sampleSize} completed ${calibration.scope === 'pond' ? 'cycles for this pond' : 'pond-cycle outcomes for this company'} to adjust projection ranges.`,
    );
  }

  const estimatedSurvivalPercent = round(sharedMetrics.adjustedSR, 2);
  const estimatedBiomassKg = round(sharedMetrics.currentBiomass, 2);

  const initialBiomassKg = hasNumber(pond.initialPopulation) && hasNumber(pond.initialWeightG)
    ? (pond.initialPopulation * pond.initialWeightG) / 1000
    : null;

  const biomassGainKg = hasNumber(estimatedBiomassKg) && hasNumber(initialBiomassKg)
    ? round(Math.max(0, estimatedBiomassKg + (positive(pond.totalHarvestedBiomassKg) ?? 0) - initialBiomassKg), 2)
    : null;

  const fcr = round(sharedMetrics.biomassGainFCR);

  const latestPh = latestWith(pond, (record) => minNumber(record.phMorning, record.phEvening));
  const latestDo = latestWith(pond, (record) => minNumber(record.doMorning, record.doEvening));
  const latestTemperature = latestWith(pond, (record) => record.temperatureC);
  const latestTransparency = latestWith(pond, (record) => record.transparencyCm);
  const phSwingLatest = latestPh ? (() => {
    const swing = latestPh.record.phMorning !== null && latestPh.record.phEvening !== null
      ? Math.abs(latestPh.record.phEvening - latestPh.record.phMorning)
      : null;
    return hasNumber(swing) ? round(swing) : null;
  })() : null;

  const doMinimumLatest = latestDo
    ? minNumber(latestDo.record.doMorning, latestDo.record.doEvening)
    : null;

  const phSwingTrend = calculateTrend(pond.records.map((record) => ({
    timestampMs: record.timestampMs,
    value: record.phMorning !== null && record.phEvening !== null
      ? Math.abs(record.phEvening - record.phMorning)
      : null,
  })));
  const doMinimumTrend = calculateTrend(pond.records.map((record) => ({
    timestampMs: record.timestampMs,
    value: minNumber(record.doMorning, record.doEvening),
  })));
  const salinityTrend = calculateTrend(pond.records.map((record) => ({
    timestampMs: record.timestampMs,
    value: record.salinityPpt,
  })));
  const feedAllocationTrend = calculateTrend(pond.records
    .filter((record) => !record.isBaselineEstimate && hasNumber(positive(record.feedKg)))
    .slice(-5)
    .map((record) => ({
    timestampMs: record.timestampMs,
    value: positive(record.feedKg),
  })));
  const mortalityTrend = calculateTrend(pond.records.map((record) => ({
    timestampMs: record.timestampMs,
    value: record.mortalityCount,
  })));
  const latestMortality = latestWith(pond, (record) => record.mortalityCount);
  const latestMortalityPercent = latestMortality && hasNumber(estimatedCurrentPopulation) && estimatedCurrentPopulation > 0
    ? round((latestMortality.value / estimatedCurrentPopulation) * 100, 3)
    : null;
  const roundedDoMinimumLatest = hasNumber(doMinimumLatest) ? round(doMinimumLatest) : null;
  const feedBiomassModel = calculateFeedBiomassModel({
    pond,
    latestMbwG,
    estimatedBiomassKg,
    sharedPond,
    sharedMetrics,
    calibration: calibration.adjustment,
  });

  return {
    pondId: pond.id,
    pondName: pond.pondName,
    currentDoc: pond.currentDoc,
    latestMbwG: hasNumber(latestMbwG) ? round(latestMbwG) : null,
    latestMbwDate: latestMbw?.record.date ?? null,
    adgGPerDay: sharedAdg,
    smoothedAdgGPerDay: sharedAdg,
    growthConfidence: cleanMbwPoints.length < 2 ? 'low' : mbwOutlierDates.length > 0 || cleanMbwPoints.length < 3 ? 'medium' : 'high',
    mbwOutlierDates,
    totalFeedKg: round(totalFeedKg, 2),
    baselineFeedKg: round(baselineFeedKg, 2),
    operationalFeedKg: round(operationalFeedKg, 2),
    hasMidcycleBaseline,
    baselineDate: pond.baselineDate,
    dataAssumptions,
    totalMortalityCount: round(totalMortalityCount, 0),
    estimatedCurrentPopulation: hasNumber(estimatedCurrentPopulation) ? round(estimatedCurrentPopulation, 0) : null,
    estimatedSurvivalPercent,
    estimatedBiomassKg,
    feedBiomassModel,
    biomassGainKg,
    fcr,
    latestPhMorning: latestPh?.record.phMorning ?? null,
    latestPhEvening: latestPh?.record.phEvening ?? null,
    phSwingLatest,
    phSwingTrend,
    doMinimumLatest: roundedDoMinimumLatest,
    doMinimumTrend,
    latestTemperatureC: latestTemperature?.value ?? null,
    latestTransparencyCm: latestTransparency?.value ?? null,
    salinityTrend,
    feedAllocationTrend,
    mortalityTrend,
    latestMortalityCount: latestMortality?.value ?? null,
    latestMortalityDate: latestMortality?.record.date ?? null,
    latestMortalityPercent,
    labContext: pond.labContext,
    planktonOverwatch: pond.planktonOverwatch,
    dailyRecords14d: extractDailyRecords14d(pond),
    recentLabReports: extractRecentLabReports(pond),
    recentTreatments: pond.treatments || [],
    historicalBenchmark: pond.historicalBenchmark || null,
    dataCompleteness: calculateDataCompleteness(pond),
    calibration: {
      versionId: calibration.versionId,
      scope: calibration.scope,
      sampleSize: calibration.adjustment.sampleSize,
    },
  };
};

export const extractDailyRecords14d = (pond: OrsonNormalizedPond): OrsonPromptDailyRecord[] => {
  const dayMap = new Map<string, {
    date: string;
    doc: number | null;
    feedKg: number | null;
    mbwG: number | null;
    mortalityCount: number | null;
    doMorning: number | null;
    doEvening: number | null;
    phMorning: number | null;
    phEvening: number | null;
    salinityPpt: number | null;
    temperatureC?: number | null;
    ammoniaMgL?: number | null;
    operationalNotes?: string | null;
    transparencyCm?: number | null;
    feedingResponse?: 'strong' | 'normal' | 'weak' | null;
    weatherEvent?: 'rain' | 'heavy_rain' | 'sudden_cloud' | null;
    waterExchangePercent?: number | null;
    sludgeLoad?: 'low' | 'moderate' | 'high' | null;
    surfaceScum?: boolean | null;
    shrimpBehaviour?: 'normal' | 'abnormal' | null;
  }>();

  for (const record of pond.records) {
    if (!record.date) continue;
    const date = record.date;
    const existing = dayMap.get(date) ?? {
      date,
      doc: record.doc,
      feedKg: null,
      mbwG: null,
      mortalityCount: null,
      doMorning: null,
      doEvening: null,
      phMorning: null,
      phEvening: null,
      salinityPpt: null,
      temperatureC: null,
      ammoniaMgL: null,
      operationalNotes: null,
      transparencyCm: null,
      feedingResponse: null,
      weatherEvent: null,
      waterExchangePercent: null,
      sludgeLoad: null,
      surfaceScum: null,
      shrimpBehaviour: null,
    };

    if (record.doc !== null) existing.doc = record.doc;
    if (hasNumber(record.feedKg)) existing.feedKg = (existing.feedKg ?? 0) + record.feedKg;
    if (hasNumber(record.mbwG)) existing.mbwG = record.mbwG;
    if (hasNumber(record.mortalityCount)) existing.mortalityCount = (existing.mortalityCount ?? 0) + record.mortalityCount;
    if (hasNumber(record.doMorning)) existing.doMorning = record.doMorning;
    if (hasNumber(record.doEvening)) existing.doEvening = record.doEvening;
    if (hasNumber(record.phMorning)) existing.phMorning = record.phMorning;
    if (hasNumber(record.phEvening)) existing.phEvening = record.phEvening;
    if (hasNumber(record.salinityPpt)) existing.salinityPpt = record.salinityPpt;
    if (hasNumber(record.temperatureC)) existing.temperatureC = record.temperatureC;
    if (hasNumber(record.ammoniaMgL)) existing.ammoniaMgL = record.ammoniaMgL;
    if (record.operationalNotes) existing.operationalNotes = record.operationalNotes;
    if (hasNumber(record.transparencyCm)) existing.transparencyCm = record.transparencyCm;
    if (record.feedData?.feedingResponse) existing.feedingResponse = record.feedData.feedingResponse;
    if (record.weatherEvent) existing.weatherEvent = record.weatherEvent;
    if (hasNumber(record.waterExchangePercent)) existing.waterExchangePercent = record.waterExchangePercent;
    if (record.sludgeLoad) existing.sludgeLoad = record.sludgeLoad;
    if (record.surfaceScum !== null) existing.surfaceScum = record.surfaceScum;
    if (record.shrimpBehaviour) existing.shrimpBehaviour = record.shrimpBehaviour;

    dayMap.set(date, existing);
  }

  const sortedDays = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  const recentDays = sortedDays.slice(-14);

  return recentDays.map((day) => {
    const doMin = minNumber(day.doMorning, day.doEvening);
    const phSwing = hasNumber(day.phMorning) && hasNumber(day.phEvening)
      ? round(Math.abs(day.phEvening - day.phMorning), 2)
      : null;

    return {
      date: day.date,
      doc: day.doc,
      feedKg: hasNumber(day.feedKg) ? round(day.feedKg, 2) : null,
      mbwG: hasNumber(day.mbwG) ? round(day.mbwG, 2) : null,
      mortalityCount: hasNumber(day.mortalityCount) ? round(day.mortalityCount, 0) : null,
      doMorning: hasNumber(day.doMorning) ? round(day.doMorning, 2) : null,
      doEvening: hasNumber(day.doEvening) ? round(day.doEvening, 2) : null,
      doMinimumMgL: hasNumber(doMin) ? round(doMin, 2) : null,
      phMorning: hasNumber(day.phMorning) ? round(day.phMorning, 2) : null,
      phEvening: hasNumber(day.phEvening) ? round(day.phEvening, 2) : null,
      phSwing,
      salinityPpt: hasNumber(day.salinityPpt) ? round(day.salinityPpt, 1) : null,
      temperatureC: hasNumber(day.temperatureC) ? round(day.temperatureC, 1) : null,
      ammoniaMgL: hasNumber(day.ammoniaMgL) ? round(day.ammoniaMgL, 3) : null,
      operationalNotes: day.operationalNotes ?? null,
      transparencyCm: hasNumber(day.transparencyCm) ? round(day.transparencyCm, 1) : null,
      feedingResponse: day.feedingResponse ?? null,
      weatherEvent: day.weatherEvent ?? null,
      waterExchangePercent: hasNumber(day.waterExchangePercent) ? round(day.waterExchangePercent, 1) : null,
      sludgeLoad: day.sludgeLoad ?? null,
      surfaceScum: day.surfaceScum ?? null,
      shrimpBehaviour: day.shrimpBehaviour ?? null,
    };
  });
};

export const extractRecentLabReports = (pond: OrsonNormalizedPond): OrsonPromptLabReport[] => {
  const summaries = [
    ...(pond.labContext.latest ? [pond.labContext.latest] : []),
    ...pond.labContext.byType,
  ];
  const uniqueReports = new Map<string, OrsonPromptLabReport>();

  for (const s of summaries) {
    const key = s.labReportId || `${s.sampleDate || ''}-${s.reportType || ''}`;
    if (!key || uniqueReports.has(key)) continue;
    uniqueReports.set(key, {
      sampleDate: s.sampleDate,
      reportType: s.reportType,
      status: s.status,
      mainIssue: s.mainIssue,
      keyRisks: s.keyRisks || [],
      recommendations: s.recommendations || [],
    });
  }

  return Array.from(uniqueReports.values()).slice(0, 5);
};

export const calculatePondsMetrics = (
  ponds: OrsonNormalizedPond[],
  calibrationProfile?: OrsonCalibrationProfile | null,
): OrsonPondMetrics[] => {
  return ponds.map((pond) => calculatePondMetrics(pond, calibrationProfile));
};
