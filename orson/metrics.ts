import type {
  OrsonDataCompleteness,
  OrsonFeedBiomassModel,
  OrsonNormalizedPond,
  OrsonNormalizedRecord,
  OrsonNumber,
  OrsonPondMetrics,
  OrsonRangeEstimate,
  OrsonSurvivalAssumption,
  OrsonTrendResult,
} from './types';

const FEED_RATE_TABLE = [
  { mbwG: 0.01, ratePercent: null },
  { mbwG: 0.65, ratePercent: null },
  { mbwG: 1.65, ratePercent: 6.5 },
  { mbwG: 3, ratePercent: 6.5 },
  { mbwG: 5, ratePercent: 5.5 },
  { mbwG: 7.5, ratePercent: 4.2 },
  { mbwG: 10.5, ratePercent: 3.6 },
  { mbwG: 14, ratePercent: 3.3 },
  { mbwG: 17.5, ratePercent: 3.1 },
  { mbwG: 21, ratePercent: 2.9 },
  { mbwG: 25, ratePercent: 2.7 },
  { mbwG: 29, ratePercent: 2.5 },
  { mbwG: 33, ratePercent: 2.3 },
];

const hasNumber = (value: OrsonNumber): value is number => value !== null && Number.isFinite(value);

const positive = (value: OrsonNumber): number | null => (hasNumber(value) && value > 0 ? value : null);

const round = (value: number, decimals = 3): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const recordsWith = (
  pond: OrsonNormalizedPond,
  selector: (record: OrsonNormalizedRecord) => OrsonNumber,
): Array<{ record: OrsonNormalizedRecord; value: number }> => {
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

const sumPositive = (
  pond: OrsonNormalizedPond,
  selector: (record: OrsonNormalizedRecord) => OrsonNumber,
): number => {
  return recordsWith(pond, selector).reduce((sum, point) => {
    return point.value > 0 ? sum + point.value : sum;
  }, 0);
};

const minNumber = (...values: OrsonNumber[]): OrsonNumber => {
  const valid = values.filter(hasNumber);
  if (valid.length === 0) return null;
  return Math.min(...valid);
};

const averageNumber = (...values: OrsonNumber[]): OrsonNumber => {
  const valid = values.filter(hasNumber);
  if (valid.length === 0) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
};

export const getFeedRatePercentFromMbw = (mbwG: OrsonNumber): OrsonNumber => {
  if (!hasNumber(mbwG) || mbwG <= 0) return null;
  if (mbwG > 33) return 2.1;

  for (let index = 0; index < FEED_RATE_TABLE.length - 1; index += 1) {
    const current = FEED_RATE_TABLE[index];
    const next = FEED_RATE_TABLE[index + 1];

    if (current.ratePercent === null) continue;
    if (mbwG <= current.mbwG) return current.ratePercent;

    if (mbwG >= current.mbwG && mbwG <= next.mbwG && next.ratePercent !== null) {
      const ratio = (mbwG - current.mbwG) / (next.mbwG - current.mbwG);
      return round(current.ratePercent + ratio * (next.ratePercent - current.ratePercent), 3);
    }
  }

  return FEED_RATE_TABLE[FEED_RATE_TABLE.length - 1].ratePercent;
};

export const calculateDoc = (docStartTimestampMs: number | null, targetTimestampMs: number | null): number | null => {
  if (docStartTimestampMs === null || targetTimestampMs === null) return null;
  return Math.max(0, Math.floor((targetTimestampMs - docStartTimestampMs) / (1000 * 60 * 60 * 24)));
};

export const calculateTrend = (
  points: Array<{ timestampMs: number | null; value: OrsonNumber }>,
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

const calculateAdg = (
  pond: OrsonNormalizedPond,
  mbwPoints: Array<{ record: OrsonNormalizedRecord; value: number }>,
): OrsonNumber => {
  if (mbwPoints.length >= 2) {
    const previous = mbwPoints[mbwPoints.length - 2];
    const latest = mbwPoints[mbwPoints.length - 1];
    if (previous.record.timestampMs !== null && latest.record.timestampMs !== null) {
      const days = Math.max(1, (latest.record.timestampMs - previous.record.timestampMs) / (1000 * 60 * 60 * 24));
      return round((latest.value - previous.value) / days);
    }
  }

  const first = mbwPoints[0];
  if (first && pond.docStartTimestampMs !== null && first.record.timestampMs !== null && hasNumber(pond.initialWeightG)) {
    const days = Math.max(1, (first.record.timestampMs - pond.docStartTimestampMs) / (1000 * 60 * 60 * 24));
    return round((first.value - pond.initialWeightG) / days);
  }

  return null;
};

const calculateSmoothedAdg = (
  pond: OrsonNormalizedPond,
  mbwPoints: Array<{ record: OrsonNormalizedRecord; value: number }>,
): OrsonNumber => {
  const recent = mbwPoints.slice(-4);
  if (recent.length >= 2) {
    const first = recent[0];
    const last = recent[recent.length - 1];
    if (first.record.timestampMs !== null && last.record.timestampMs !== null) {
      const days = Math.max(1, (last.record.timestampMs - first.record.timestampMs) / (1000 * 60 * 60 * 24));
      return round((last.value - first.value) / days);
    }
  }

  return calculateAdg(pond, mbwPoints);
};

const detectMbwOutliers = (
  mbwPoints: Array<{ record: OrsonNormalizedRecord; value: number }>,
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
  const latestAppetite = latestWith(pond, (record) => record.feedData?.trayClearancePercent ?? null);

  const fields: Record<string, boolean> = {
    docStartDate: pond.docStartDate !== null,
    initialPopulation: hasNumber(pond.initialPopulation),
    initialWeightG: hasNumber(pond.initialWeightG),
    latestMbw: latestMbw !== null,
    latestWaterQuality: latestWq !== null,
    latestFeed: latestFeed !== null,
    latestAppetite: latestAppetite !== null,
  };

  const presentFields = Object.entries(fields).filter(([, present]) => present).map(([field]) => field);
  const missingFields = Object.entries(fields).filter(([, present]) => !present).map(([field]) => field);

  return {
    score: round(presentFields.length / Object.keys(fields).length, 2),
    presentFields,
    missingFields,
  };
};

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

const calculateSurvivalAssumption = (
  pond: OrsonNormalizedPond,
  appetiteTrend: OrsonTrendResult,
  doMinimumLatest: OrsonNumber,
): OrsonSurvivalAssumption => {
  const doc = pond.currentDoc;

  if (doc === null) {
    return {
      lowPercent: 70,
      expectedPercent: 85,
      highPercent: 95,
      confidence: 'low',
      reason: 'DOC is missing, so early survival cannot be staged reliably.',
    };
  }

  if (doc <= 10) {
    return {
      lowPercent: 70,
      expectedPercent: 85,
      highPercent: 95,
      confidence: 'low',
      reason: 'Early PL survival is not directly observable during the first 10 DOC.',
    };
  }

  if (doc <= 30) {
    let expected = 88;
    const reasons = ['DOC 11-30 survival is inferred from feed response and early sampling trend.'];

    if (appetiteTrend.direction === 'down') {
      expected -= 5;
      reasons.push('Appetite is trending down.');
    }

    if (hasNumber(doMinimumLatest) && doMinimumLatest < 4) {
      expected -= 5;
      reasons.push('Recent DO minimum is below 4.0.');
    }

    expected = clamp(expected, 75, 92);
    return {
      lowPercent: clamp(expected - 10, 60, 90),
      expectedPercent: expected,
      highPercent: clamp(expected + 7, 80, 97),
      confidence: appetiteTrend.points >= 2 ? 'medium' : 'low',
      reason: reasons.join(' '),
    };
  }

  return {
    lowPercent: 80,
    expectedPercent: 90,
    highPercent: 97,
    confidence: appetiteTrend.points >= 2 ? 'medium' : 'low',
    reason: 'Later-cycle survival is still estimated unless mortality, harvest, and feed response are complete.',
  };
};

const rangeFromPopulation = (
  initialPopulation: OrsonNumber,
  totalMortalityCount: number,
  harvestedPopulation: number,
  survivalAssumption: OrsonSurvivalAssumption,
): OrsonRangeEstimate => {
  if (!hasNumber(initialPopulation)) {
    return { low: null, expected: null, high: null };
  }

  const bySurvival = (survivalPercent: OrsonNumber) => {
    if (!hasNumber(survivalPercent)) return null;
    return Math.max(0, (initialPopulation * survivalPercent) / 100 - totalMortalityCount - harvestedPopulation);
  };

  return {
    low: round(bySurvival(survivalAssumption.lowPercent) ?? 0, 0),
    expected: round(bySurvival(survivalAssumption.expectedPercent) ?? 0, 0),
    high: round(bySurvival(survivalAssumption.highPercent) ?? 0, 0),
  };
};

const biomassRangeFromPopulationRange = (
  populationRange: OrsonRangeEstimate,
  mbwG: OrsonNumber,
): OrsonRangeEstimate => {
  if (!hasNumber(mbwG)) return { low: null, expected: null, high: null };

  const toBiomass = (population: OrsonNumber) => (hasNumber(population) ? round((population * mbwG) / 1000, 2) : null);

  return {
    low: toBiomass(populationRange.low),
    expected: toBiomass(populationRange.expected),
    high: toBiomass(populationRange.high),
  };
};

const calculateFeedBiomassModel = (params: {
  pond: OrsonNormalizedPond;
  latestMbwG: OrsonNumber;
  estimatedCurrentPopulation: OrsonNumber;
  estimatedBiomassKg: OrsonNumber;
  totalFeedKg: number;
  totalMortalityCount: number;
  harvestedPopulation: number;
  appetiteTrend: OrsonTrendResult;
  doMinimumLatest: OrsonNumber;
}): OrsonFeedBiomassModel => {
  const {
    pond,
    latestMbwG,
    estimatedCurrentPopulation,
    estimatedBiomassKg,
    totalFeedKg,
    totalMortalityCount,
    harvestedPopulation,
    appetiteTrend,
    doMinimumLatest,
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

  const survivalAssumption = calculateSurvivalAssumption(pond, appetiteTrend, doMinimumLatest);
  const populationRange = rangeFromPopulation(
    pond.initialPopulation,
    totalMortalityCount,
    harvestedPopulation,
    survivalAssumption,
  );
  const biomassRangeKg = biomassRangeFromPopulationRange(populationRange, latestMbwG);

  const warnings: string[] = [];
  if (hasNumber(feedPressureRatio) && feedPressureRatio > 1.25) {
    warnings.push('Logged feed is higher than expected for the estimated biomass and feed-rate table.');
  }
  if (hasNumber(feedPressureRatio) && feedPressureRatio < 0.75) {
    warnings.push('Logged feed is lower than expected for the estimated biomass; survival or MBW may be overestimated.');
  }
  if (hasNumber(feedBasedPopulation) && hasNumber(estimatedCurrentPopulation)) {
    const differenceRatio = estimatedCurrentPopulation > 0
      ? Math.abs(feedBasedPopulation - estimatedCurrentPopulation) / estimatedCurrentPopulation
      : 0;
    if (differenceRatio > 0.35) {
      warnings.push('Feed-based population and mortality-based population disagree by more than 35%.');
    }
  }
  if (survivalAssumption.confidence === 'low') {
    warnings.push(survivalAssumption.reason);
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
    warnings,
  };
};

export const calculatePondMetrics = (pond: OrsonNormalizedPond): OrsonPondMetrics => {
  const mbwPoints = recordsWith(pond, (record) => positive(record.mbwG));
  const latestMbw = mbwPoints.length > 0 ? mbwPoints[mbwPoints.length - 1] : null;
  const latestMbwG = latestMbw?.value ?? pond.initialWeightG;
  const baselineRecordFeedKg = sumPositive(pond, (record) => record.isBaselineEstimate ? record.feedKg : null);
  const baselineFeedKg = positive(pond.baselineCumulativeFeedKg) ?? baselineRecordFeedKg;
  const operationalFeedKg = sumPositive(pond, (record) => record.isBaselineEstimate ? null : record.feedKg);
  const totalFeedKg = baselineFeedKg + operationalFeedKg;
  const totalMortalityCount = sumPositive(pond, (record) => record.isBaselineEstimate ? null : record.mortalityCount);
  const harvestedPopulation = positive(pond.totalHarvestedPopulation) ?? 0;
  const harvestedBiomassKg = positive(pond.totalHarvestedBiomassKg) ?? 0;
  const baselinePopulation = positive(pond.baselineEstimatedPopulation) ??
    (hasNumber(pond.baselineSurvivalRate) && hasNumber(pond.initialPopulation)
      ? (pond.initialPopulation * pond.baselineSurvivalRate) / 100
      : null);

  const estimatedCurrentPopulation = hasNumber(baselinePopulation)
    ? Math.max(0, baselinePopulation - totalMortalityCount - harvestedPopulation)
    : hasNumber(pond.initialPopulation)
      ? Math.max(0, pond.initialPopulation - totalMortalityCount - harvestedPopulation)
      : null;

  const hasMidcycleBaseline = pond.cycleStartMode === 'midcycle' || Boolean(pond.baselineDate) || baselineFeedKg > 0 || hasNumber(baselinePopulation);
  const dataAssumptions = hasMidcycleBaseline
    ? [
        `This pond was onboarded mid-cycle${pond.baselineDate ? ` on ${pond.baselineDate}` : ''}. Pre-onboarding feed, survival, and biomass are user-provided estimates.`,
        'Post-baseline records are Shrimply tracked observations; pre-baseline values should not be treated as exact historical logs.',
      ]
    : [];

  const estimatedSurvivalPercent = hasNumber(estimatedCurrentPopulation) && hasNumber(pond.initialPopulation) && pond.initialPopulation > 0
    ? round((estimatedCurrentPopulation / pond.initialPopulation) * 100, 2)
    : null;

  const estimatedBiomassKg = hasNumber(estimatedCurrentPopulation) && hasNumber(latestMbwG)
    ? round((estimatedCurrentPopulation * latestMbwG) / 1000, 2)
    : null;

  const initialBiomassKg = hasNumber(pond.initialPopulation) && hasNumber(pond.initialWeightG)
    ? (pond.initialPopulation * pond.initialWeightG) / 1000
    : null;

  const biomassGainKg = hasNumber(estimatedBiomassKg) && hasNumber(initialBiomassKg)
    ? round(Math.max(0, estimatedBiomassKg + harvestedBiomassKg - initialBiomassKg), 2)
    : null;

  const usableFeedKg = Math.max(0, totalFeedKg - (positive(pond.totalHarvestedFeedKg) ?? 0));
  const fcr = hasNumber(biomassGainKg) && biomassGainKg > 0 ? round(usableFeedKg / biomassGainKg, 3) : null;

  const latestWq = latestWith(pond, (record) => minNumber(record.phMorning, record.phEvening, record.doMorning, record.doEvening));
  const phSwingLatest = latestWq ? (() => {
    const swing = latestWq.record.phMorning !== null && latestWq.record.phEvening !== null
      ? Math.abs(latestWq.record.phEvening - latestWq.record.phMorning)
      : null;
    return hasNumber(swing) ? round(swing) : null;
  })() : null;

  const doMinimumLatest = latestWq
    ? minNumber(latestWq.record.doMorning, latestWq.record.doEvening)
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
  const appetiteTrend = calculateTrend(pond.records.map((record) => ({
    timestampMs: record.timestampMs,
    value: record.feedData?.trayClearancePercent ?? null,
  })));
  const mortalityTrend = calculateTrend(pond.records.map((record) => ({
    timestampMs: record.timestampMs,
    value: record.mortalityCount,
  })));
  const roundedDoMinimumLatest = hasNumber(doMinimumLatest) ? round(doMinimumLatest) : null;
  const feedBiomassModel = calculateFeedBiomassModel({
    pond,
    latestMbwG,
    estimatedCurrentPopulation,
    estimatedBiomassKg,
    totalFeedKg,
    totalMortalityCount,
    harvestedPopulation,
    appetiteTrend,
    doMinimumLatest: roundedDoMinimumLatest,
  });

  return {
    pondId: pond.id,
    pondName: pond.pondName,
    currentDoc: pond.currentDoc,
    latestMbwG: hasNumber(latestMbwG) ? round(latestMbwG) : null,
    latestMbwDate: latestMbw?.record.date ?? null,
    adgGPerDay: calculateAdg(pond, mbwPoints),
    smoothedAdgGPerDay: calculateSmoothedAdg(pond, mbwPoints),
    mbwOutlierDates: detectMbwOutliers(mbwPoints),
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
    phSwingLatest,
    phSwingTrend,
    doMinimumLatest: roundedDoMinimumLatest,
    doMinimumTrend,
    salinityTrend,
    appetiteTrend,
    mortalityTrend,
    dataCompleteness: calculateDataCompleteness(pond),
  };
};

export const calculatePondsMetrics = (ponds: OrsonNormalizedPond[]): OrsonPondMetrics[] => {
  return ponds.map(calculatePondMetrics);
};
