import type { OrsonCalibrationAdjustment, OrsonCalibrationProfile, OrsonDataCompleteness, OrsonDiagnosticHarvestEvent, OrsonEvidenceSummary, OrsonFeedBiomassModel, OrsonMetricEvidenceItem, OrsonNormalizedPond, OrsonNormalizedRecord, OrsonNumber, OrsonPondMetrics, OrsonPromptDailyRecord, OrsonPromptLabReport, OrsonRangeEstimate, OrsonSurvivalAssumption, OrsonTrendResult } from './types';
import { getOrsonCalibrationAdjustment } from './learning';
import { buildPondDiagnosticContext, selectDiagnosticRecords } from './diagnosticContext';
import { shiftDateKey } from '../shared/farmDate';
import { evaluateMeasurementFreshness, evaluateMetricCoverage, selectDailyFeedEntries } from '../shared/orsonEvidence';
import {
  calculateAdg as calculateSharedAdg,
  calculateSmoothedAdg,
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

const getDailyFeedEntries = (pond: OrsonNormalizedPond, allowSamplingEstimate = true) =>
  selectDailyFeedEntries(pond.records, {
    allowSamplingEstimate,
    asOfDate: pond.asOfTimestamp ?? pond.asOfDate,
    timeZone: pond.timeZone,
  });

const buildMetricEvidenceItem = (
  metric: string,
  domain: OrsonMetricEvidenceItem['domain'],
  pond: OrsonNormalizedPond,
  asOf: string,
  source: { id?: string | null; date?: string | null; farmDate?: string | null; observedAt?: string | null; measuredAt?: string | null; precision?: 'timestamp' | 'date-only'; sourceIds?: string[] } | null,
): OrsonMetricEvidenceItem => {
  const date = source?.date ?? source?.farmDate ?? null;
  const measuredAt = source?.measuredAt ?? source?.observedAt ?? null;
  const freshness = evaluateMeasurementFreshness({ date, measuredAt }, asOf, {
    domain,
    timeZone: pond.timeZone,
  });
  return {
    metric,
    domain,
    sourceId: source?.id ?? source?.sourceIds?.[0] ?? null,
    pondId: pond.id,
    cycleId: pond.cycleId,
    date,
    precision: source?.precision ?? (measuredAt ? 'timestamp' : 'date-only'),
    measuredAt,
    ageDays: freshness.ageDays,
    isFresh: freshness.isFresh,
    isStale: freshness.isStale,
  };
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
  const authoritativeFeed = getDailyFeedEntries(pond, false);
  const latestFeed = authoritativeFeed[authoritativeFeed.length - 1] ?? null;
  const recentFeedRecords = authoritativeFeed.slice(-5);

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

  const authoritativeFeed = getDailyFeedEntries(pond, false);
  const latestFeedRecord = authoritativeFeed[authoritativeFeed.length - 1] ?? null;
  const actualFeedKg = latestFeedRecord?.feedKg ?? null;
  const feedRatePercent = getFeedRatePercentFromMbw(latestMbwG);
  const expectedFeedKg = hasNumber(estimatedBiomassKg) && hasNumber(feedRatePercent)
    ? round((estimatedBiomassKg * feedRatePercent) / 100, 2)
    : null;
  const feedPressureRatio = hasNumber(actualFeedKg) && hasNumber(expectedFeedKg) && expectedFeedKg > 0
    ? round(actualFeedKg / expectedFeedKg, 3)
    : null;

  const feedBasedPopulation = hasNumber(actualFeedKg) && actualFeedKg > 0 && hasNumber(feedRatePercent) && hasNumber(latestMbwG) && latestMbwG > 0
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
  if (actualFeedKg === 0) {
    warnings.push('Zero daily feed was logged; verify whether feeding was halted intentionally or unrecorded.');
  }
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
  inputPond: OrsonNormalizedPond,
  calibrationProfile?: OrsonCalibrationProfile | null,
): OrsonPondMetrics => {
  const pond = { ...inputPond, records: selectDiagnosticRecords(inputPond) };
  const asOfDate = pond.asOfDate;
  const asOfTimestamp = pond.asOfTimestamp ?? asOfDate;
  const calibration = getOrsonCalibrationAdjustment(calibrationProfile, pond.pondName);
  const sharedPond = toSharedPond(pond);
  const currentDateKey = pond.asOfDate;
  const sharedMetrics = calculatePondMetricsWithHarvest(sharedPond, undefined, {
    currentDoc: pond.currentDoc ?? undefined,
    currentDateKey,
  });
  const mbwPoints = recordsWith(pond, (record) => record.isBaselineEstimate || !record.date ? null : positive(record.mbwG));
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
  const measuredDates = new Set(mbwPoints.map(point => point.record.date));
  const canCompareStocking = Boolean(latestMbw?.record.date && pond.docStartDate && latestMbw.record.date > pond.docStartDate);
  const hasGrowthInterval = measuredDates.size >= 2 || (mbwPoints.length > 0 && canCompareStocking);
  const sharedAdg = hasGrowthInterval ? round(calculateSharedAdg(sharedPond)) : null;
  const mbwDates = pond.records
    .filter((point) => !point.isBaselineEstimate && positive(point.mbwG) !== null && point.date)
    .map((point) => point.date as string);
  const mbwFreshness = evaluateMeasurementFreshness(latestMbw ? { date: latestMbw.record.date, observedAt: latestMbw.record.observedAt } : null, asOfTimestamp, {
    domain: 'mbw',
    timeZone: pond.timeZone,
  });
  const mbwCoverage = evaluateMetricCoverage(mbwDates, {
    metric: 'mbw',
    domain: 'mbw',
    asOfDate,
    windowDays: 14,
    minDaysRequired: 2,
    timeZone: pond.timeZone,
  });
  const mbwEvidence: OrsonMetricEvidenceItem = {
    ...buildMetricEvidenceItem('mbw', 'mbw', pond, asOfTimestamp, latestMbw?.record ?? null),
    coverage: {
      windowDays: mbwCoverage.windowDays,
      recordedDays: mbwCoverage.recordedDays,
      coverageRatio: mbwCoverage.coverageRatio,
      missingDates: mbwCoverage.missingDates,
    },
  };
  const growthEvidence: OrsonPondMetrics['growthEvidence'] = {
    sampleCount: mbwPoints.length,
    adgSource: !hasGrowthInterval ? 'unavailable' : measuredDates.size >= 2 ? 'measured' : 'stocking_comparison',
    weightSource: latestMbw ? 'measured' : hasNumber(pond.initialWeightG) || hasNumber(pond.baselineMbwG) ? 'baseline' : 'fallback',
    source: latestMbw?.record.source ?? (latestMbw ? 'sampling' : null),
    pondId: pond.id,
    cycleId: pond.cycleId,
    latestDate: latestMbw?.record.date ?? null,
    ageDays: mbwFreshness.ageDays,
    isFresh: mbwFreshness.isFresh,
    isStale: mbwFreshness.isStale,
    coverageRatio: mbwCoverage.coverageRatio,
  };

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
  if (!hasGrowthInterval) dataAssumptions.push('Growth observations are insufficient. ADG is unavailable; baseline or fallback weight is not evidence of measured growth.');
  else if (growthEvidence.adgSource === 'stocking_comparison') dataAssumptions.push('ADG compares one measured sample with the stocking baseline; repeated measured growth is not yet available.');
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

  const dailyRecords14d = extractDailyRecords14d(pond);
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

  const phSwingTrend = calculateTrend(dailyRecords14d.map((record) => ({
    timestampMs: new Date(`${record.date}T00:00:00.000Z`).getTime(),
    value: record.phSwing,
  })));
  const doMinimumTrend = calculateTrend(dailyRecords14d.map((record) => ({
    timestampMs: new Date(`${record.date}T00:00:00.000Z`).getTime(),
    value: record.doMinimumMgL,
  })));
  const salinityTrend = calculateTrend(dailyRecords14d.map((record) => ({
    timestampMs: new Date(`${record.date}T00:00:00.000Z`).getTime(),
    value: record.salinityPpt,
  })));
  const trendFeedPoints = getDailyFeedEntries(pond, false)
    .slice(-5)
    .map((entry) => ({
      timestampMs: new Date(`${entry.farmDate}T00:00:00.000Z`).getTime(),
      value: entry.feedKg,
    }));

  const feedAllocationTrend = calculateTrend(trendFeedPoints);
  const mortalityTrend = calculateTrend(dailyRecords14d.map((record) => ({
    timestampMs: new Date(`${record.date}T00:00:00.000Z`).getTime(),
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

  const waterDates = pond.records
    .filter((record) => record.kinds.includes('water_quality') && record.date)
    .map((record) => record.date as string);
  const latestWaterRecord = latestWith(pond, (record) => record.kinds.includes('water_quality') ? 1 : null);
  const waterCoverage = evaluateMetricCoverage(waterDates, {
    metric: 'water_quality',
    domain: 'water',
    asOfDate,
    windowDays: 14,
    minDaysRequired: 3,
    timeZone: pond.timeZone,
  });
  const waterEvidence: OrsonMetricEvidenceItem = {
    ...buildMetricEvidenceItem('water_quality', 'water', pond, asOfTimestamp, latestWaterRecord?.record ?? null),
    coverage: {
      windowDays: waterCoverage.windowDays,
      recordedDays: waterCoverage.recordedDays,
      coverageRatio: waterCoverage.coverageRatio,
      missingDates: waterCoverage.missingDates,
    },
  };

  const authoritativeFeedEntries = getDailyFeedEntries(pond, false);
  const feedDates = authoritativeFeedEntries.map((entry) => entry.farmDate);
  const latestFeedRecord = authoritativeFeedEntries[authoritativeFeedEntries.length - 1] ?? null;
  const feedCoverage = evaluateMetricCoverage(feedDates, {
    metric: 'daily_feed',
    domain: 'dailyFeed',
    asOfDate,
    windowDays: 14,
    minDaysRequired: 3,
    timeZone: pond.timeZone,
  });
  const dailyFeedEvidence: OrsonMetricEvidenceItem = {
    ...buildMetricEvidenceItem('daily_feed', 'dailyFeed', pond, asOfTimestamp, latestFeedRecord),
    coverage: {
      windowDays: feedCoverage.windowDays,
      recordedDays: feedCoverage.recordedDays,
      coverageRatio: feedCoverage.coverageRatio,
      missingDates: feedCoverage.missingDates,
    },
  };

  const mortalityDates = pond.records
    .filter((record) => (record.mortalityCount !== null || record.mortalityObservationType !== null) && record.date)
    .map((record) => record.date as string);
  const latestMortalityRecord = latestWith(pond, (record) => record.mortalityCount !== null || record.mortalityObservationType !== null ? 1 : null);
  const mortalityCoverage = evaluateMetricCoverage(mortalityDates, {
    metric: 'mortality',
    domain: 'operations',
    asOfDate,
    windowDays: 14,
    minDaysRequired: 3,
    timeZone: pond.timeZone,
  });
  const mortalityEvidence: OrsonMetricEvidenceItem = {
    ...buildMetricEvidenceItem('mortality', 'operations', pond, asOfTimestamp, latestMortalityRecord?.record ?? null),
    coverage: {
      windowDays: mortalityCoverage.windowDays,
      recordedDays: mortalityCoverage.recordedDays,
      coverageRatio: mortalityCoverage.coverageRatio,
      missingDates: mortalityCoverage.missingDates,
    },
  };

  const labDates = pond.labContext.latest?.sampleDate ? [pond.labContext.latest.sampleDate] : [];
  const labCoverage = evaluateMetricCoverage(labDates, {
    metric: 'lab',
    domain: 'lab',
    asOfDate,
    windowDays: 30,
    minDaysRequired: 1,
    timeZone: pond.timeZone,
  });
  const labEvidence: OrsonMetricEvidenceItem = {
    ...buildMetricEvidenceItem('lab', 'lab', pond, asOfTimestamp, pond.labContext.latest ? {
      id: pond.labContext.latest.labReportId,
      date: pond.labContext.latest.sampleDate,
      measuredAt: pond.labContext.latest.measuredAt,
    } : null),
    coverage: {
      windowDays: labCoverage.windowDays,
      recordedDays: labCoverage.recordedDays,
      coverageRatio: labCoverage.coverageRatio,
      missingDates: labCoverage.missingDates,
    },
  };

  const latestAmmoniaRecord = latestWith(pond, (record) => record.ammoniaMgL);
  const latestSalinityRecord = latestWith(pond, (record) => record.salinityPpt);
  const latestWeatherRecord = latestWith(pond, (record) => record.weatherEvent ? 1 : null);
  const latestSludgeRecord = latestWith(pond, (record) => record.sludgeLoad ? 1 : null);
  const latestScumRecord = latestWith(pond, (record) => record.surfaceScum !== null ? 1 : null);
  const latestBehaviourRecord = latestWith(pond, (record) => record.shrimpBehaviour ? 1 : null);
  const latestWaterExchangeRecord = latestWith(pond, (record) => record.waterExchangePercent);
  const metricEvidence: Record<string, OrsonMetricEvidenceItem> = {
    doMinimumMgL: buildMetricEvidenceItem('doMinimumMgL', 'water', pond, asOfTimestamp, latestDo?.record ?? null),
    doMorning: buildMetricEvidenceItem('doMorning', 'water', pond, asOfTimestamp, latestWith(pond, (record) => record.doMorning)?.record ?? null),
    doEvening: buildMetricEvidenceItem('doEvening', 'water', pond, asOfTimestamp, latestWith(pond, (record) => record.doEvening)?.record ?? null),
    phMorning: buildMetricEvidenceItem('phMorning', 'water', pond, asOfTimestamp, latestWith(pond, (record) => record.phMorning)?.record ?? null),
    phEvening: buildMetricEvidenceItem('phEvening', 'water', pond, asOfTimestamp, latestWith(pond, (record) => record.phEvening)?.record ?? null),
    phSwing: buildMetricEvidenceItem('phSwing', 'water', pond, asOfTimestamp, latestPh?.record ?? null),
    temperatureC: buildMetricEvidenceItem('temperatureC', 'water', pond, asOfTimestamp, latestTemperature?.record ?? null),
    ammoniaMgL: buildMetricEvidenceItem('ammoniaMgL', 'water', pond, asOfTimestamp, latestAmmoniaRecord?.record ?? null),
    transparencyCm: buildMetricEvidenceItem('transparencyCm', 'water', pond, asOfTimestamp, latestTransparency?.record ?? null),
    salinityPpt: buildMetricEvidenceItem('salinityPpt', 'water', pond, asOfTimestamp, latestSalinityRecord?.record ?? null),
    weatherEvent: buildMetricEvidenceItem('weatherEvent', 'operations', pond, asOfTimestamp, latestWeatherRecord?.record ?? null),
    waterExchangePercent: buildMetricEvidenceItem('waterExchangePercent', 'operations', pond, asOfTimestamp, latestWaterExchangeRecord?.record ?? null),
    sludgeLoad: buildMetricEvidenceItem('sludgeLoad', 'operations', pond, asOfTimestamp, latestSludgeRecord?.record ?? null),
    surfaceScum: buildMetricEvidenceItem('surfaceScum', 'operations', pond, asOfTimestamp, latestScumRecord?.record ?? null),
    shrimpBehaviour: buildMetricEvidenceItem('shrimpBehaviour', 'operations', pond, asOfTimestamp, latestBehaviourRecord?.record ?? null),
    mbw: mbwEvidence,
    daily_feed: dailyFeedEvidence,
    mortality: mortalityEvidence,
    lab: labEvidence,
  };

  const evidence: OrsonEvidenceSummary = {
    asOfDate,
    asOfTimestamp,
    timeZone: pond.timeZone,
    pondId: pond.id,
    cycleId: pond.cycleId,
    water: waterEvidence,
    mbw: mbwEvidence,
    dailyFeed: dailyFeedEvidence,
    mortality: mortalityEvidence,
    lab: labEvidence,
    allMetrics: {
      water_quality: waterEvidence,
      mbw: mbwEvidence,
      daily_feed: dailyFeedEvidence,
      mortality: mortalityEvidence,
      lab: labEvidence,
      ...metricEvidence,
    },
  };
  const diagnosticContext = buildPondDiagnosticContext(inputPond, dailyRecords14d, dataAssumptions);
  const currentFeedDay = dailyRecords14d.find(record => record.date === pond.asOfDate);
  const currentFeedKg = currentFeedDay?.actualDailyFeedKg;
  diagnosticContext.feedIndex = hasNumber(currentFeedKg) && currentFeedKg >= 0
    && hasNumber(pond.currentDoc) && pond.currentDoc > 0
    && hasNumber(pond.initialPopulation) && pond.initialPopulation > 0
    && hasNumber(estimatedCurrentPopulation) && estimatedCurrentPopulation > 0 ? {
      value: round(currentFeedKg * 100000 / (pond.currentDoc * estimatedCurrentPopulation), 3),
      farmDate: pond.asOfDate,
      actualDailyFeedKg: currentFeedKg,
      doc: pond.currentDoc,
      estimatedPopulation: round(estimatedCurrentPopulation, 0),
      sourceIds: currentFeedDay?.sourceIds ?? [],
      method: 'Shrimply index: daily_feed_kg * 100000 / (DOC * estimated_population)',
      limitation: 'Local planning index based on estimated population; not measured appetite, growth or feed conversion.',
    } : null;

  return {
    pondId: pond.id,
    pondName: pond.pondName,
    species: pond.species,
    pondAreaM2: pond.pondAreaM2,
    densityPerM2: pond.densityPerM2,
    initialPopulation: pond.initialPopulation,
    currentDoc: pond.currentDoc,
    latestMbwG: hasNumber(latestMbwG) ? round(latestMbwG) : null,
    latestMbwDate: latestMbw?.record.date ?? null,
    adgGPerDay: sharedAdg,
    smoothedAdgGPerDay: hasGrowthInterval ? round(calculateSmoothedAdg(sharedPond)) : null,
    growthConfidence: cleanMbwPoints.length < 2 ? 'low' : mbwOutlierDates.length > 0 || cleanMbwPoints.length < 3 ? 'medium' : 'high',
    growthEvidence,
    evidence,
    mbwOutlierDates,
    totalFeedKg: round(totalFeedKg, 2),
    totalHarvestedBiomassKg: pond.totalHarvestedBiomassKg,
    totalHarvestedPopulation: pond.totalHarvestedPopulation,
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
    dailyRecords14d,
    recentLabReports: extractRecentLabReports(pond),
    recentTreatments: pond.treatments || [],
    recentHarvests: extractRecentHarvests(pond),
    historicalBenchmark: pond.historicalBenchmark || null,
    dataCompleteness: calculateDataCompleteness(pond),
    calibration: {
      versionId: calibration.versionId,
      scope: calibration.scope,
      sampleSize: calibration.adjustment.sampleSize,
    },
    diagnosticContext,
  };
};

export const extractRecentHarvests = (pond: OrsonNormalizedPond): OrsonDiagnosticHarvestEvent[] => (
  selectDiagnosticRecords(pond)
    .filter((record) => record.date && (record.harvestBiomassKg !== null || record.harvestPopulation !== null))
    .map((record, index) => ({
      id: record.id ?? `harvest:${record.date}:${index}`,
      date: record.date as string,
      harvestType: record.harvestType,
      biomassKg: hasNumber(record.harvestBiomassKg) ? round(record.harvestBiomassKg, 2) : 0,
      population: hasNumber(record.harvestPopulation) ? round(record.harvestPopulation, 0) : 0,
    }))
    .slice(-5)
);

export const extractDailyRecords14d = (
  pond: OrsonNormalizedPond,
  asOfDate = pond.asOfDate,
  windowDays = 14,
  preserveRecordedPrecision = false,
): OrsonPromptDailyRecord[] => {
  const displayNumber = (value: number | null | undefined, decimals: number) => hasNumber(value)
    ? preserveRecordedPrecision ? value : round(value, decimals) : null;
  const windowStart = shiftDateKey(asOfDate, -(Math.max(1, Math.min(30, windowDays)) - 1));
  const dayMap = new Map<string, {
    diagnosticMeasurements?: OrsonNormalizedRecord['diagnosticMeasurements'];
    measurementProvenance: NonNullable<OrsonPromptDailyRecord['measurementProvenance']>;
    date: string;
    observedAt: string[];
    doc: number | null;
    feedKg: number | null;
    actualDailyFeedKg: number | null;
    samplingFeedEstimateKg: number | null;
    hasAuthoritativeFeed: boolean;
    hasExplicitZeroFeed: boolean;
    authoritativeFeedTotals: number[];
    authoritativeSourceId: string | null;
    samplingFeedTotals: number[];
    samplingSourceId: string | null;
    mbwG: number | null;
    mortalityCount: number | null;
    mortalityObservedCount: number | null;
    mortalityObservationTypes: ('estimated_total' | 'observed_recovered' | 'none_observed' | 'legacy_positive')[];
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
    sourceIds: string[];
    sourceKinds: OrsonNormalizedRecord['kinds'];
  }>();

  const createEmptyDay = (date: string, doc: number | null) => ({
    date,
    observedAt: [] as string[],
    diagnosticMeasurements: undefined as OrsonNormalizedRecord['diagnosticMeasurements'],
    measurementProvenance: {} as NonNullable<OrsonPromptDailyRecord['measurementProvenance']>,
    doc,
    feedKg: null as number | null,
    actualDailyFeedKg: null as number | null,
    samplingFeedEstimateKg: null as number | null,
    hasAuthoritativeFeed: false,
    hasExplicitZeroFeed: false,
    authoritativeFeedTotals: [] as number[],
    authoritativeSourceId: null as string | null,
    authoritativeTimestampMs: null as number | null,
    samplingFeedTotals: [] as number[],
    samplingSourceId: null as string | null,
    samplingTimestampMs: null as number | null,
    mbwG: null as number | null,
    mortalityCount: null as number | null,
    mortalityObservedCount: null as number | null,
    mortalityObservationTypes: [] as ('estimated_total' | 'observed_recovered' | 'none_observed' | 'legacy_positive')[],
    doMorning: null as number | null,
    doEvening: null as number | null,
    phMorning: null as number | null,
    phEvening: null as number | null,
    salinityPpt: null as number | null,
    temperatureC: null as number | null,
    ammoniaMgL: null as number | null,
    operationalNotes: null as string | null,
    transparencyCm: null as number | null,
    feedingResponse: null as 'strong' | 'normal' | 'weak' | null,
    weatherEvent: null as 'rain' | 'heavy_rain' | 'sudden_cloud' | null,
    waterExchangePercent: null as number | null,
    sludgeLoad: null as 'low' | 'moderate' | 'high' | null,
    surfaceScum: null as boolean | null,
    shrimpBehaviour: null as 'normal' | 'abnormal' | null,
    sourceIds: [] as string[],
    sourceKinds: [] as OrsonNormalizedRecord['kinds'],
  });

  const setMeasurementProvenance = (
    day: { measurementProvenance: NonNullable<OrsonPromptDailyRecord['measurementProvenance']> },
    metric: string,
    record: OrsonNormalizedRecord,
    appendSource = false,
  ) => {
    const existing = day.measurementProvenance[metric];
    const sourceIds = appendSource
      ? Array.from(new Set([...(existing?.sourceIds ?? (existing?.sourceId ? [existing.sourceId] : [])), ...(record.id ? [record.id] : [])]))
      : (record.id ? [record.id] : []);
    day.measurementProvenance[metric] = {
      sourceId: sourceIds[sourceIds.length - 1] ?? null,
      sourceIds,
      date: record.date!,
      measuredAt: record.observedAt,
      precision: record.observedAt ? 'timestamp' : 'date-only',
    };
  };

  const selectedFeedEntries = getDailyFeedEntries(pond, true).filter((entry) => entry.farmDate >= windowStart && entry.farmDate <= asOfDate);

  for (const [recordIndex, record] of selectDiagnosticRecords(pond).entries()) {
    if (!record.date) continue;
    const date = record.date;
    if (date < windowStart || date > asOfDate) continue;
    const existing = dayMap.get(date) ?? createEmptyDay(date, record.doc);

    if (record.doc !== null) existing.doc = record.doc;
    if (record.diagnosticMeasurements) {
      existing.diagnosticMeasurements = { ...existing.diagnosticMeasurements, ...record.diagnosticMeasurements };
      Object.entries(record.diagnosticMeasurements).forEach(([metric, value]) => {
        if (value !== null && value !== undefined) setMeasurementProvenance(existing, metric, record);
      });
    }
    if (hasNumber(record.mbwG) && record.mbwG > 0) {
      existing.mbwG = record.mbwG;
      setMeasurementProvenance(existing, 'mbwG', record);
    }
    if (record.mortalityObservationType) {
      if (!existing.mortalityObservationTypes.includes(record.mortalityObservationType)) {
        existing.mortalityObservationTypes.push(record.mortalityObservationType);
      }
      if (record.mortalityObservationType === 'estimated_total' && hasNumber(record.mortalityCount)) {
        existing.mortalityCount = (existing.mortalityCount ?? 0) + record.mortalityCount;
        setMeasurementProvenance(existing, 'mortalityCount', record, true);
      } else if (record.mortalityObservationType === 'none_observed' && existing.mortalityCount === null) {
        existing.mortalityCount = 0;
        setMeasurementProvenance(existing, 'mortalityCount', record, true);
      }
      if (record.mortalityObservationType === 'observed_recovered' && hasNumber(record.mortalityObservedCount)) {
        existing.mortalityObservedCount = (existing.mortalityObservedCount ?? 0) + record.mortalityObservedCount;
        setMeasurementProvenance(existing, 'mortalityObservedCount', record, true);
      }
    } else if (hasNumber(record.mortalityCount) && record.mortalityCount > 0) {
      existing.mortalityCount = (existing.mortalityCount ?? 0) + record.mortalityCount;
      setMeasurementProvenance(existing, 'mortalityCount', record, true);
      if (!existing.mortalityObservationTypes.includes('legacy_positive')) existing.mortalityObservationTypes.push('legacy_positive');
    }
    if (hasNumber(record.doMorning)) { existing.doMorning = record.doMorning; setMeasurementProvenance(existing, 'doMorning', record); }
    if (hasNumber(record.doEvening)) { existing.doEvening = record.doEvening; setMeasurementProvenance(existing, 'doEvening', record); }
    if (hasNumber(record.phMorning)) { existing.phMorning = record.phMorning; setMeasurementProvenance(existing, 'phMorning', record); }
    if (hasNumber(record.phEvening)) { existing.phEvening = record.phEvening; setMeasurementProvenance(existing, 'phEvening', record); }
    if (hasNumber(record.salinityPpt)) { existing.salinityPpt = record.salinityPpt; setMeasurementProvenance(existing, 'salinityPpt', record); }
    if (hasNumber(record.temperatureC)) { existing.temperatureC = record.temperatureC; setMeasurementProvenance(existing, 'temperatureC', record); }
    if (hasNumber(record.ammoniaMgL)) { existing.ammoniaMgL = record.ammoniaMgL; setMeasurementProvenance(existing, 'ammoniaMgL', record); }
    if (record.operationalNotes) { existing.operationalNotes = record.operationalNotes; setMeasurementProvenance(existing, 'operationalNotes', record); }
    if (hasNumber(record.transparencyCm)) { existing.transparencyCm = record.transparencyCm; setMeasurementProvenance(existing, 'transparencyCm', record); }
    if (record.feedData?.feedingResponse) existing.feedingResponse = record.feedData.feedingResponse;
    if (record.weatherEvent) { existing.weatherEvent = record.weatherEvent; setMeasurementProvenance(existing, 'weatherEvent', record); }
    if (hasNumber(record.waterExchangePercent)) { existing.waterExchangePercent = record.waterExchangePercent; setMeasurementProvenance(existing, 'waterExchangePercent', record); }
    if (record.sludgeLoad) { existing.sludgeLoad = record.sludgeLoad; setMeasurementProvenance(existing, 'sludgeLoad', record); }
    if (record.surfaceScum !== null) { existing.surfaceScum = record.surfaceScum; setMeasurementProvenance(existing, 'surfaceScum', record); }
    if (record.shrimpBehaviour) { existing.shrimpBehaviour = record.shrimpBehaviour; setMeasurementProvenance(existing, 'shrimpBehaviour', record); }
    existing.sourceIds.push(record.id ?? `record:${date}:${recordIndex}`);
    if (record.observedAt && !existing.observedAt.includes(record.observedAt)) existing.observedAt.push(record.observedAt);
    record.kinds.forEach((kind) => {
      if (!existing.sourceKinds.includes(kind)) existing.sourceKinds.push(kind);
    });

    dayMap.set(date, existing);
  }

  for (const entry of selectedFeedEntries) {
    const day = dayMap.get(entry.farmDate) ?? createEmptyDay(entry.farmDate, null);
    dayMap.set(entry.farmDate, day);
    day.feedKg = entry.feedKg;
    day.hasAuthoritativeFeed = entry.hasAuthoritativeDailyFeed;
    day.hasExplicitZeroFeed = entry.hasAuthoritativeDailyFeed && entry.feedKg === 0;
    day.actualDailyFeedKg = entry.hasAuthoritativeDailyFeed ? entry.feedKg : null;
    day.samplingFeedEstimateKg = entry.isEstimate ? entry.feedKg : null;
    day.authoritativeSourceId = entry.hasAuthoritativeDailyFeed ? (entry.sourceIds[0] ?? null) : null;
    day.samplingSourceId = entry.isEstimate ? (entry.sourceIds[0] ?? null) : null;
    const feedProvenance = {
      sourceId: entry.sourceIds[0] ?? null,
      sourceIds: entry.sourceIds,
      date: entry.farmDate,
      measuredAt: entry.measuredAt,
      precision: entry.precision,
    };
    day.measurementProvenance[entry.isEstimate ? 'samplingFeedEstimateKg' : 'daily_feed'] = feedProvenance;
    if (!entry.isEstimate) {
      day.measurementProvenance.feedKg = feedProvenance;
      day.measurementProvenance.actualDailyFeedKg = feedProvenance;
    }
  }

  // Keep the separately recorded sampling estimate even when a daily total
  // (including zero) wins. It is evidence, never an additional feed allocation.
  const samplingEstimates = selectDailyFeedEntries(pond.records.map(record => ({
    ...record, feedData: null, actualDailyFeedKg: null, feedKg: record.samplingFeedEstimateKg ?? null,
  })), { allowSamplingEstimate: true, asOfDate: pond.asOfTimestamp ?? asOfDate, timeZone: pond.timeZone });
  for (const entry of samplingEstimates) {
    if (entry.farmDate < windowStart || entry.farmDate > asOfDate) continue;
    const day = dayMap.get(entry.farmDate);
    if (!day) continue;
    day.samplingFeedEstimateKg = entry.feedKg;
    day.samplingSourceId = entry.sourceIds[0] ?? null;
    day.measurementProvenance.samplingFeedEstimateKg = {
      sourceId: entry.sourceIds[0] ?? null, sourceIds: entry.sourceIds,
      date: entry.farmDate, measuredAt: entry.measuredAt, precision: entry.precision,
    };
  }

  const recentDays = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  return recentDays.map((day) => {
    const doMin = minNumber(day.doMorning, day.doEvening);
    const phSwing = hasNumber(day.phMorning) && hasNumber(day.phEvening)
      ? round(Math.abs(day.phEvening - day.phMorning), 2)
      : null;

    const hasAuthoritative = day.hasExplicitZeroFeed || (day.hasAuthoritativeFeed && hasNumber(day.actualDailyFeedKg));
    const resolvedFeedKg = hasAuthoritative
      ? (day.hasExplicitZeroFeed ? 0 : displayNumber(day.actualDailyFeedKg, 2))
      : hasNumber(day.samplingFeedEstimateKg)
        ? displayNumber(day.samplingFeedEstimateKg, 2)
        : null;

    const feedSource: OrsonPromptDailyRecord['feedSource'] = hasAuthoritative
      ? 'daily_feed'
      : hasNumber(day.samplingFeedEstimateKg)
        ? 'sampling_estimate'
        : null;

    const freshness = evaluateMeasurementFreshness(day.date, asOfDate, {
      domain: 'operations',
      timeZone: pond.timeZone,
    });

    return {
      date: day.date,
      diagnosticMeasurements: day.diagnosticMeasurements,
      measurementProvenance: day.measurementProvenance,
      observedAt: day.observedAt,
      doc: day.doc,
      feedKg: resolvedFeedKg,
      feedSource,
      actualDailyFeedKg: day.hasExplicitZeroFeed ? 0 : displayNumber(day.actualDailyFeedKg, 2),
      samplingFeedEstimateKg: displayNumber(day.samplingFeedEstimateKg, 2),
      mbwG: hasNumber(day.mbwG) && day.mbwG > 0 ? displayNumber(day.mbwG, 2) : null,
      mortalityCount: hasNumber(day.mortalityCount) ? round(day.mortalityCount, 0) : null,
      mortalityObservedCount: hasNumber(day.mortalityObservedCount) ? round(day.mortalityObservedCount, 0) : null,
      mortalityObservationTypes: day.mortalityObservationTypes,
      doMorning: displayNumber(day.doMorning, 2),
      doEvening: displayNumber(day.doEvening, 2),
      doMinimumMgL: hasNumber(doMin) ? round(doMin, 2) : null,
      phMorning: displayNumber(day.phMorning, 2),
      phEvening: displayNumber(day.phEvening, 2),
      phSwing,
      salinityPpt: displayNumber(day.salinityPpt, 1),
      temperatureC: displayNumber(day.temperatureC, 1),
      ammoniaMgL: hasNumber(day.ammoniaMgL) ? round(day.ammoniaMgL, 3) : null,
      operationalNotes: day.operationalNotes ?? null,
      transparencyCm: displayNumber(day.transparencyCm, 1),
      feedingResponse: day.feedingResponse ?? null,
      weatherEvent: day.weatherEvent ?? null,
      waterExchangePercent: hasNumber(day.waterExchangePercent) ? round(day.waterExchangePercent, 1) : null,
      sludgeLoad: day.sludgeLoad ?? null,
      surfaceScum: day.surfaceScum ?? null,
      shrimpBehaviour: day.shrimpBehaviour ?? null,
      sourceIds: Array.from(new Set(day.sourceIds)),
      sourceKinds: day.sourceKinds,
      pondId: pond.id,
      cycleId: pond.cycleId,
      ageDays: freshness.ageDays,
      isFresh: freshness.isFresh,
      isStale: freshness.isStale,
      authoritativeSourceId: day.authoritativeSourceId,
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
      labReportId: s.labReportId,
      sampleDate: s.sampleDate,
      reportType: s.reportType,
      status: s.status,
      mainIssue: s.mainIssue,
      keyRisks: s.keyRisks || [],
      recommendations: s.recommendations || [],
      metrics: s.metrics ?? null,
      measurementWarnings: s.metrics?.measurementWarnings ?? [],
    });
  }

  return Array.from(uniqueReports.values())
    .sort((a, b) => (b.sampleDate ?? '').localeCompare(a.sampleDate ?? ''))
    .slice(0, 5);
};

export const calculatePondsMetrics = (
  ponds: OrsonNormalizedPond[],
  calibrationProfile?: OrsonCalibrationProfile | null,
): OrsonPondMetrics[] => {
  return ponds.map((pond) => calculatePondMetrics(pond, calibrationProfile));
};
