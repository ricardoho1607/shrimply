import {
  differenceInFarmCalendarDays,
  getFarmDateKey,
  normalizeFarmDateKey,
} from './farmDate.ts';

export const DAY_MS = 24 * 60 * 60 * 1000;

export const FEEDING_RESPONSE_VALUES = ['strong', 'normal', 'weak'] as const;
export type FeedingResponse = typeof FEEDING_RESPONSE_VALUES[number];

export interface SharedFeedData {
  totalDailyFeed?: number | string | null;
  feedingResponse?: FeedingResponse | null;
  cycleId?: string | null;
  pondCycleId?: string | null;
}

export interface SharedSampling {
  id?: string;
  date?: string;
  mbw?: number | string | null;
  abw?: number | string | null;
  mortality?: number | string | null;
  feed?: number | string | null;
  feedData?: SharedFeedData | null;
  cycleId?: string | null;
  pondCycleId?: string | null;
  isBaselineEstimate?: boolean;
  source?: string | null;
  estimatedPopulation?: number | string | null;
  estimatedSurvivalRate?: number | string | null;
  cumulativeFeedToDate?: number | string | null;
}

export type MortalityObservationType = 'estimated_total' | 'observed_recovered' | 'none_observed';

export interface SharedMortalityRecord {
  id?: string;
  date?: string;
  observationType?: MortalityObservationType;
  count?: number | string | null;
  siphonedCount?: number | string | null;
  mortalCount?: number | string | null;
  siponShift?: 'morning' | 'evening' | null;
  mbwAtRecord?: number | string | null;
  notes?: string | null;
  recordedAt?: string | null;
  recordedBy?: string | null;
  cycleId?: string | null;
  cycleName?: string | null;
  pondCycleId?: string | null;
}

export interface SharedPond {
  docStart?: string | null;
  baselineDate?: string | null;
  baselineDoc?: number | string | null;
  baselineMbw?: number | string | null;
  initialPopulation?: number | string | null;
  initialStock?: number | string | null;
  initialWeight?: number | string | null;
  baselineEstimatedPopulation?: number | string | null;
  baselineSurvivalRate?: number | string | null;
  baselineCumulativeFeed?: number | string | null;
  totalHarvestedPopulation?: number | string | null;
  totalHarvestedBiomass?: number | string | null;
  postHarvestBaselineDate?: string | null;
  postHarvestRemainingBiomass?: number | string | null;
  postHarvestRemainingPopulation?: number | string | null;
  postHarvestReferenceSamplingId?: string | null;
  postHarvestReferenceSamplingDate?: string | null;
  postHarvestReferenceMbw?: number | string | null;
  samplings?: SharedSampling[] | null;
  mortalityRecords?: SharedMortalityRecord[] | null;
  historicalBenchmark?: {
    completedCycleCount?: number | string | null;
    averageSurvivalRate?: number | string | null;
    averageCycleDoc?: number | string | null;
    averageFinalMbwG?: number | string | null;
  } | null;
}

export interface PondBiomassEstimate {
  bestEstimateKg: number;
  lowEstimateKg: number;
  highEstimateKg: number;
  bestPopulation: number;
  lowPopulation: number;
  highPopulation: number;
  recordBasedPopulation: number;
  biologicalPopulation: number | null;
  feedBasedBiomassKg: number | null;
  feedBasedPopulation: number | null;
  recentFeedDays: number;
  expectedSurvivalPercent: number;
  lowSurvivalPercent: number;
  highSurvivalPercent: number;
  expectedDailyMortalityRatePercent: number;
  confidence: 'low' | 'medium';
  method: 'post_harvest' | 'record_only' | 'biological' | 'biological_feed';
  warnings: string[];
}

export interface PondMetricsWithHarvest {
  currentBiomass: number;
  currentPopulation: number;
  adjustedSR: number;
  totalFeedConsumed: number;
  adjustedFCR: number;
  biomassGainFCR: number;
  latestMbw: number;
  size: number;
  adg: number;
  doc: number;
  totalMortality: number;
  totalMortalityWeight: number;
  biomassEstimate: PondBiomassEstimate;
  latestSampling?: SharedSampling;
  latestValidMbwSampling?: SharedSampling;
}

export interface PondCalculationOptions {
  now?: Date;
  currentDoc?: number;
  currentDateKey?: string;
}

export interface FeedBiomassMismatchRecord {
  sampling: SharedSampling;
  date: string | undefined;
  mbw: number;
  feedKg: number;
  feedRatePercent: number;
  recordPopulation: number;
  recordBiomassKg: number;
  feedBasedPopulation: number;
  feedBasedBiomassKg: number;
  differencePercent: number;
}

export interface FeedBiomassMismatchInsight {
  thresholdPercent: number;
  requiredRecords: number;
  triggered: boolean;
  records: FeedBiomassMismatchRecord[];
  latest?: FeedBiomassMismatchRecord;
  averageDifferencePercent: number;
  direction: 'feed_based_higher' | 'feed_based_lower' | 'mixed';
}

export const toFiniteNumber = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const median = (values: number[]): number => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
};

export const projectMbwWithTapering = (
  currentMbwInput: number,
  adgInput: number,
  daysInput: number,
  maximumMbwInput = 50,
): number => {
  const currentMbw = Math.max(0, toFiniteNumber(currentMbwInput));
  const adg = toFiniteNumber(adgInput);
  const days = Math.max(0, toFiniteNumber(daysInput));
  if (days <= 0) return currentMbw;
  if (adg <= 0) return Math.max(0, currentMbw + adg * days);

  const maximumMbw = Math.max(currentMbw + 1, toFiniteNumber(maximumMbwInput) || 50);
  const growthConstant = adg / (maximumMbw - currentMbw);
  return maximumMbw - ((maximumMbw - currentMbw) * Math.exp(-growthConstant * days));
};

export const daysToTargetMbwWithTapering = (
  currentMbwInput: number,
  targetMbwInput: number,
  adgInput: number,
  maximumMbwInput = 50,
): number => {
  const currentMbw = Math.max(0, toFiniteNumber(currentMbwInput));
  const targetMbw = Math.max(0, toFiniteNumber(targetMbwInput));
  const adg = toFiniteNumber(adgInput);
  if (targetMbw <= currentMbw) return 0;
  if (adg <= 0) return Number.POSITIVE_INFINITY;

  const maximumMbw = Math.max(targetMbw * 1.15, currentMbw + 1, toFiniteNumber(maximumMbwInput) || 50);
  const growthConstant = adg / (maximumMbw - currentMbw);
  return Math.log((maximumMbw - currentMbw) / (maximumMbw - targetMbw)) / growthConstant;
};

const getValidTime = (date?: string | null): number | null => {
  if (!date) return null;
  const timestamp = new Date(date).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

const sortByDateAsc = <T extends SharedSampling>(samplings: T[]): T[] =>
  [...samplings].sort((a, b) => (getValidTime(a.date) ?? 0) - (getValidTime(b.date) ?? 0));

export const getPondInitialPopulation = (pond: Pick<SharedPond, 'initialPopulation' | 'initialStock'>): number => {
  const initialPopulation = toFiniteNumber(pond.initialPopulation);
  if (initialPopulation > 0) return initialPopulation;
  return Math.max(0, toFiniteNumber(pond.initialStock));
};

export const getPondInitialWeight = (pond: Pick<SharedPond, 'initialWeight' | 'baselineMbw'>): number => {
  const initialWeight = toFiniteNumber(pond.initialWeight);
  if (initialWeight > 0) return initialWeight;
  const baselineMbw = toFiniteNumber(pond.baselineMbw);
  return baselineMbw > 0 ? baselineMbw : 0.5;
};

export const getSamplingMbw = (sampling?: Pick<SharedSampling, 'mbw' | 'abw'> | null): number => {
  if (!sampling) return 0;
  const mbw = toFiniteNumber(sampling.mbw);
  if (mbw > 0) return mbw;
  return Math.max(0, toFiniteNumber(sampling.abw));
};

export const isBaselineSampling = (sampling: Pick<SharedSampling, 'isBaselineEstimate' | 'source'>): boolean =>
  Boolean(sampling.isBaselineEstimate) || sampling.source === 'midcycle_onboarding';

export const getLatestFeedResponseForDate = (
  samplings: SharedSampling[] | null | undefined,
  date: string,
  cycle?: { cycleId?: string | null; pondCycleId?: string | null },
): FeedingResponse | null => {
  for (let index = (samplings?.length || 0) - 1; index >= 0; index -= 1) {
    const sampling = samplings?.[index];
    if (!sampling || sampling.date !== date || isBaselineSampling(sampling)) continue;
    const response = sampling.feedData?.feedingResponse;
    if (!response || !FEEDING_RESPONSE_VALUES.includes(response)) continue;

    const recordCycleId = sampling.feedData?.cycleId || sampling.cycleId;
    const recordPondCycleId = sampling.feedData?.pondCycleId || sampling.pondCycleId;
    if (cycle?.cycleId && recordCycleId && cycle.cycleId !== recordCycleId) continue;
    if (cycle?.pondCycleId && recordPondCycleId && cycle.pondCycleId !== recordPondCycleId) continue;
    return response;
  }
  return null;
};

export const getMortalityPopulationDeduction = (
  record: Pick<SharedMortalityRecord, 'observationType' | 'count'>,
): number => record.observationType === 'none_observed'
  ? 0
  : Math.max(0, toFiniteNumber(record.count));

export interface PondMortalityForDate {
  totalMortality: number;
  totalMortalityWeight: number;
  observedRecovered: number;
}

export const calculatePondMortalityForDate = (
  pond: SharedPond,
  date: unknown,
  timeZone?: string,
): PondMortalityForDate => {
  const dateKey = normalizeFarmDateKey(date, timeZone);
  if (!dateKey) return { totalMortality: 0, totalMortalityWeight: 0, observedRecovered: 0 };

  const samplingsForDate = (pond.samplings || []).filter((sampling) =>
    !isBaselineSampling(sampling) && normalizeFarmDateKey(sampling.date, timeZone) === dateKey,
  );
  const recordsForDate = (pond.mortalityRecords || []).filter((record) =>
    normalizeFarmDateKey(record.date, timeZone) === dateKey,
  );

  const samplingMortality = samplingsForDate.reduce(
    (sum, sampling) => sum + Math.max(0, toFiniteNumber(sampling.mortality)),
    0,
  );
  const samplingMortalityWeight = samplingsForDate.reduce(
    (sum, sampling) => sum + (Math.max(0, toFiniteNumber(sampling.mortality)) * getSamplingMbw(sampling)) / 1000,
    0,
  );
  const recordedMortality = recordsForDate.reduce(
    (sum, record) => sum + getMortalityPopulationDeduction(record),
    0,
  );
  const recordedMortalityWeight = recordsForDate.reduce((sum, record) => {
    const count = getMortalityPopulationDeduction(record);
    return sum + (count * Math.max(0, toFiniteNumber(record.mbwAtRecord))) / 1000;
  }, 0);
  const observedRecovered = recordsForDate
    .filter((record) => record.observationType === 'observed_recovered')
    .reduce((sum, record) => sum + Math.max(0, toFiniteNumber(record.count)), 0);

  return {
    totalMortality: samplingMortality + recordedMortality,
    totalMortalityWeight: samplingMortalityWeight + recordedMortalityWeight,
    observedRecovered,
  };
};

export const getSamplingFeedAmount = (sampling: Pick<SharedSampling, 'feed' | 'feedData'>): number => {
  const samplingFeed = toFiniteNumber(sampling.feed);
  if (samplingFeed > 0) return samplingFeed;
  return toFiniteNumber(sampling.feedData?.totalDailyFeed);
};

export const getFeedRateFromMbw = (mbwInput: number): number | null => {
  const mbw = toFiniteNumber(mbwInput);
  const frTable: { mbw: number; fr: number | null }[] = [
    { mbw: 0.01, fr: null },
    { mbw: 0.65, fr: null },
    { mbw: 1.65, fr: 6.5 },
    { mbw: 3, fr: 6.5 },
    { mbw: 5, fr: 5.5 },
    { mbw: 7.5, fr: 4.2 },
    { mbw: 10.5, fr: 3.6 },
    { mbw: 14, fr: 3.3 },
    { mbw: 17.5, fr: 3.1 },
    { mbw: 21, fr: 2.9 },
    { mbw: 25, fr: 2.7 },
    { mbw: 29, fr: 2.5 },
    { mbw: 33, fr: 2.3 },
  ];

  if (mbw <= 0) return null;
  if (mbw > 33) return 2.1;

  for (let index = 0; index < frTable.length - 1; index += 1) {
    const current = frTable[index];
    const next = frTable[index + 1];
    if (current.fr === null) continue;
    if (mbw <= current.mbw) return current.fr;
    if (mbw >= current.mbw && mbw <= next.mbw && next.fr !== null) {
      const ratio = (mbw - current.mbw) / (next.mbw - current.mbw);
      return current.fr + ratio * (next.fr - current.fr);
    }
  }

  return frTable[frTable.length - 1].fr;
};

export const getFRFromMBW = getFeedRateFromMbw;

export const calculatePopulationFromSampling = (sampling: SharedSampling): number => {
  const mbw = getSamplingMbw(sampling);
  const feedAmount = getSamplingFeedAmount(sampling);
  const frPercentage = getFeedRateFromMbw(mbw);

  if (feedAmount <= 0 || mbw <= 0 || !frPercentage) return 0;
  return Math.round(((feedAmount / frPercentage) / mbw) * 100000);
};

export const getPondCurrentDoc = (
  pond: Pick<SharedPond, 'docStart' | 'baselineDate' | 'baselineDoc'>,
  timeZone?: string,
  now: Date = new Date(),
): number => {
  const today = getFarmDateKey(now, timeZone);
  const docStartDate = normalizeFarmDateKey(pond.docStart, timeZone);
  const docFromStart = docStartDate === null ? 0 : differenceInFarmCalendarDays(today, docStartDate);
  const baselineDoc = toFiniteNumber(pond.baselineDoc);
  const baselineDate = normalizeFarmDateKey(pond.baselineDate, timeZone);

  if (baselineDoc > 0 && baselineDate !== null) {
    const daysSinceBaseline = differenceInFarmCalendarDays(today, baselineDate);
    return Math.max(0, Math.floor(baselineDoc + Math.max(0, daysSinceBaseline)));
  }

  return Math.max(0, Number.isFinite(docFromStart) ? docFromStart : 0);
};

export const getPondBaselineFeed = (pond: Pick<SharedPond, 'baselineCumulativeFeed' | 'samplings'>): number => {
  const pondLevelFeed = toFiniteNumber(pond.baselineCumulativeFeed);
  if (pondLevelFeed > 0) return pondLevelFeed;

  return (pond.samplings || [])
    .filter(isBaselineSampling)
    .reduce(
      (maxFeed, sampling) =>
        Math.max(maxFeed, toFiniteNumber(sampling.cumulativeFeedToDate) || getSamplingFeedAmount(sampling)),
      0,
    );
};

export const getPondOperationalFeed = (
  pond: Pick<SharedPond, 'baselineCumulativeFeed' | 'baselineDate' | 'samplings'>,
): number => {
  const baselineDate = getPondBaselineFeed(pond) > 0
    ? normalizeFarmDateKey(pond.baselineDate)
    : null;
  const operationalSamplings = (pond.samplings || []).filter((sampling) => {
    if (isBaselineSampling(sampling)) return false;
    if (!baselineDate) return true;

    const samplingDate = normalizeFarmDateKey(sampling.date);
    return samplingDate === null || samplingDate > baselineDate;
  });
  const feedManagementFeed = operationalSamplings
    .filter((sampling) => sampling.feedData)
    .reduce((total, sampling) => total + getSamplingFeedAmount(sampling), 0);
  const samplingFeed = operationalSamplings
    .filter((sampling) => getSamplingMbw(sampling) > 0 || toFiniteNumber(sampling.mortality) > 0 || toFiniteNumber(sampling.feed) > 0)
    .reduce((total, sampling) => total + toFiniteNumber(sampling.feed), 0);

  return feedManagementFeed > 0 ? feedManagementFeed : samplingFeed;
};

export const getPondTotalFeedConsumed = (
  pond: Pick<SharedPond, 'baselineCumulativeFeed' | 'baselineDate' | 'samplings'>,
): number =>
  getPondBaselineFeed(pond) + getPondOperationalFeed(pond);

export const getPondBaselinePopulation = (
  pond: Pick<
    SharedPond,
    'initialPopulation' | 'initialStock' | 'baselineEstimatedPopulation' | 'baselineSurvivalRate' | 'samplings'
  >,
): number | null => {
  const initialPopulation = getPondInitialPopulation(pond);
  const estimatedPopulation = toFiniteNumber(pond.baselineEstimatedPopulation);
  if (estimatedPopulation > 0) return estimatedPopulation;

  const survivalRate = toFiniteNumber(pond.baselineSurvivalRate);
  if (survivalRate > 0 && initialPopulation > 0) return Math.round((initialPopulation * survivalRate) / 100);

  const baselineSampling = (pond.samplings || []).find(isBaselineSampling);
  const samplingPopulation = toFiniteNumber(baselineSampling?.estimatedPopulation);
  if (samplingPopulation > 0) return samplingPopulation;

  const samplingSurvival = toFiniteNumber(baselineSampling?.estimatedSurvivalRate);
  if (samplingSurvival > 0 && initialPopulation > 0) return Math.round((initialPopulation * samplingSurvival) / 100);

  return null;
};

export const getLatestValidMbwSampling = (pond: Pick<SharedPond, 'samplings'>): SharedSampling | undefined =>
  sortByDateAsc(pond.samplings || [])
    .reverse()
    .find((sampling) => getSamplingMbw(sampling) > 0);

export const getLatestGrowthSampling = (pond: Pick<SharedPond, 'samplings'>): SharedSampling | undefined =>
  sortByDateAsc(pond.samplings || [])
    .reverse()
    .find((sampling) => !isBaselineSampling(sampling) && getSamplingMbw(sampling) > 0);

type GrowthPond = Pick<SharedPond, 'docStart' | 'initialWeight' | 'baselineDate' | 'baselineMbw' | 'samplings'>;

const datedGrowthSamplings = (pond: GrowthPond, timeZone?: string) => (pond.samplings || [])
  .flatMap(sampling => {
    const date = normalizeFarmDateKey(sampling.date, timeZone);
    return date && getSamplingMbw(sampling) > 0 ? [{ sampling, date }] : [];
  })
  .sort((a, b) => a.date.localeCompare(b.date) || (getValidTime(a.sampling.date) ?? 0) - (getValidTime(b.sampling.date) ?? 0));

/** Measured interval ADG for one sampling; daily feed/water logs are not growth samples. */
export const calculateSamplingAdg = (
  pond: GrowthPond,
  sampling: SharedSampling,
  timeZone?: string,
): number | null => {
  const currentDate = normalizeFarmDateKey(sampling.date, timeZone);
  const currentWeight = getSamplingMbw(sampling);
  if (!currentDate || currentWeight <= 0 || isBaselineSampling(sampling)) return null;

  // Use the previous distinct farm date, never another record on the same day.
  const earlier = datedGrowthSamplings(pond, timeZone).filter(item => item.date < currentDate).reverse();
  const previous = earlier.find(item => !isBaselineSampling(item.sampling)) || earlier.find(item => isBaselineSampling(item.sampling));
  const baselineDate = normalizeFarmDateKey(pond.baselineDate, timeZone);
  const useBaseline = !previous && baselineDate && baselineDate < currentDate && toFiniteNumber(pond.baselineMbw) > 0;
  const previousDate = previous?.date || (useBaseline ? baselineDate : normalizeFarmDateKey(pond.docStart, timeZone));
  const previousWeight = previous ? getSamplingMbw(previous.sampling)
    : useBaseline ? toFiniteNumber(pond.baselineMbw) : Math.max(0, toFiniteNumber(pond.initialWeight)) || 0.5;
  if (!previousDate) return null;
  const daysDiff = differenceInFarmCalendarDays(currentDate, previousDate);
  if (daysDiff <= 0) return null;
  return (currentWeight - previousWeight) / daysDiff;
};

/** Current ADG is the latest measured interval, not an average or smoothed trend. */
export const calculateAdg = (pond: GrowthPond, timeZone?: string): number => {
  const current = datedGrowthSamplings(pond, timeZone).reverse().find(item => !isBaselineSampling(item.sampling));
  return current ? calculateSamplingAdg(pond, current.sampling, timeZone) ?? 0 : 0;
};

/** Separate forecast trend; never display this as a sampling's measured ADG. */
export const calculateSmoothedAdg = (pond: GrowthPond, timeZone?: string): number => {
  const daily = new Map(datedGrowthSamplings(pond, timeZone)
    .filter(item => !isBaselineSampling(item.sampling)).map(item => [item.date, item]));
  const recent = [...daily.values()].slice(-5);
  const intervals = recent.slice(1).map((current, i) =>
    (getSamplingMbw(current.sampling) - getSamplingMbw(recent[i].sampling))
      / differenceInFarmCalendarDays(current.date, recent[i].date));
  return intervals.length ? median(intervals) : calculateAdg(pond, timeZone);
};

interface MortalityModel {
  expectedDailyRate: number;
  lowSurvivalDailyRate: number;
  highSurvivalDailyRate: number;
  calibrated: boolean;
}

const getDefaultDailyMortalityRate = (
  doc: number,
  band: 'expected' | 'low_survival' | 'high_survival',
): number => {
  if (band === 'low_survival') return doc <= 10 ? 0.008 : doc <= 30 ? 0.005 : 0.0025;
  if (band === 'high_survival') return doc <= 10 ? 0.0015 : doc <= 30 ? 0.001 : 0.0005;
  return doc <= 10 ? 0.004 : doc <= 30 ? 0.003 : 0.0015;
};

const getMortalityModel = (pond: SharedPond, currentDoc: number): MortalityModel => {
  const completedCycles = toFiniteNumber(pond.historicalBenchmark?.completedCycleCount);
  const historicalSurvival = toFiniteNumber(pond.historicalBenchmark?.averageSurvivalRate);
  const historicalDoc = toFiniteNumber(pond.historicalBenchmark?.averageCycleDoc) || 120;

  if (completedCycles >= 3 && historicalSurvival >= 50 && historicalSurvival < 100 && historicalDoc > 0) {
    const expectedDailyRate = clamp(1 - Math.pow(historicalSurvival / 100, 1 / historicalDoc), 0.0001, 0.01);
    const uncertainty = Math.max(0.00075, expectedDailyRate * 0.35);
    return {
      expectedDailyRate,
      lowSurvivalDailyRate: clamp(expectedDailyRate + uncertainty, 0.0002, 0.015),
      highSurvivalDailyRate: clamp(expectedDailyRate - uncertainty, 0.0001, 0.01),
      calibrated: true,
    };
  }

  return {
    expectedDailyRate: getDefaultDailyMortalityRate(currentDoc, 'expected'),
    lowSurvivalDailyRate: getDefaultDailyMortalityRate(currentDoc, 'low_survival'),
    highSurvivalDailyRate: getDefaultDailyMortalityRate(currentDoc, 'high_survival'),
    calibrated: false,
  };
};

const calculateSurvivalRetention = (
  model: MortalityModel,
  startDoc: number,
  days: number,
  band: 'expected' | 'low_survival' | 'high_survival',
): number => {
  if (model.calibrated) {
    const rate = band === 'expected'
      ? model.expectedDailyRate
      : band === 'low_survival'
        ? model.lowSurvivalDailyRate
        : model.highSurvivalDailyRate;
    return Math.pow(1 - rate, days);
  }

  let retention = 1;
  for (let day = 1; day <= days; day += 1) {
    retention *= 1 - getDefaultDailyMortalityRate(startDoc + day, band);
  }
  return retention;
};

export const calculateExpectedSurvivalRetention = (
  pond: Pick<SharedPond, 'historicalBenchmark'>,
  startDocInput: number,
  daysInput: number,
): number => {
  const startDoc = Math.max(0, Math.floor(toFiniteNumber(startDocInput)));
  const days = Math.max(0, Math.floor(toFiniteNumber(daysInput)));
  return calculateSurvivalRetention(getMortalityModel(pond, startDoc), startDoc, days, 'expected');
};

interface RecentFeedCrossCheck {
  biomassKg: number | null;
  population: number | null;
  days: number;
  excludedAtypicalDays: number;
}

const getRecentFeedCrossCheck = (
  pond: SharedPond,
  latestMbw: number,
  currentDoc: number,
  currentDateKey: string,
  timeZone: string | undefined,
): RecentFeedCrossCheck => {
  if (currentDoc < 15 || latestMbw < 1.65) {
    return { biomassKg: null, population: null, days: 0, excludedAtypicalDays: 0 };
  }

  const dailyFeed = new Map<string, number>();
  let excludedAtypicalDays = 0;

  (pond.samplings || []).forEach((sampling) => {
    if (isBaselineSampling(sampling) || !sampling.feedData) return;
    const dateKey = normalizeFarmDateKey(sampling.date, timeZone);
    if (!dateKey) return;
    const ageDays = differenceInFarmCalendarDays(currentDateKey, dateKey);
    if (ageDays < 0 || ageDays > 6) return;

    const response = sampling.feedData.feedingResponse;
    if (response === 'weak' || response === 'strong') {
      excludedAtypicalDays += 1;
      return;
    }

    const amount = getSamplingFeedAmount(sampling);
    if (amount <= 0) return;
    dailyFeed.set(dateKey, Math.max(dailyFeed.get(dateKey) || 0, amount));
  });

  const recentAmounts = [...dailyFeed.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-5)
    .map(([, amount]) => amount);
  if (recentAmounts.length < 3) {
    return { biomassKg: null, population: null, days: recentAmounts.length, excludedAtypicalDays };
  }

  const feedRatePercent = getFeedRateFromMbw(latestMbw);
  if (!feedRatePercent) {
    return { biomassKg: null, population: null, days: recentAmounts.length, excludedAtypicalDays };
  }

  const biomassKg = median(recentAmounts) / (feedRatePercent / 100);
  return {
    biomassKg,
    population: (biomassKg * 1000) / latestMbw,
    days: recentAmounts.length,
    excludedAtypicalDays,
  };
};

export const calculatePondMetricsWithHarvest = (
  pond: SharedPond,
  timeZone?: string,
  options: PondCalculationOptions = {},
): PondMetricsWithHarvest => {
  const samplings = pond.samplings || [];
  const mortalityRecords = pond.mortalityRecords || [];
  const validSamplings = sortByDateAsc(
    samplings.filter(
      (sampling) =>
        getSamplingMbw(sampling) > 0 ||
        toFiniteNumber(sampling.mortality) > 0 ||
        toFiniteNumber(sampling.feed) > 0 ||
        Boolean(sampling.feedData) ||
        isBaselineSampling(sampling),
    ),
  );
  const initialPopulation = getPondInitialPopulation(pond);
  const initialWeight = getPondInitialWeight(pond);
  const baselinePopulation = getPondBaselinePopulation(pond);
  const latestSampling = validSamplings[validSamplings.length - 1];
  const latestValidMbwSampling = [...validSamplings].reverse().find((sampling) => getSamplingMbw(sampling) > 0);
  const baselineTime = getValidTime(pond.baselineDate) ?? 0;
  const samplingMortality = validSamplings
    .filter((sampling) => !isBaselineSampling(sampling))
    .reduce((sum, sampling) => sum + toFiniteNumber(sampling.mortality), 0);
  const dailyMortality = mortalityRecords
    .reduce((sum, record) => sum + getMortalityPopulationDeduction(record), 0);
  const postBaselineSamplingMortality = validSamplings
    .filter((sampling) => !isBaselineSampling(sampling) && (!baselineTime || (getValidTime(sampling.date) ?? 0) >= baselineTime))
    .reduce((sum, sampling) => sum + toFiniteNumber(sampling.mortality), 0);
  const postBaselineDailyMortality = mortalityRecords
    .filter((record) => !baselineTime || (getValidTime(record.date) ?? 0) >= baselineTime)
    .reduce((sum, record) => sum + getMortalityPopulationDeduction(record), 0);
  const postBaselineMortality = postBaselineSamplingMortality + postBaselineDailyMortality;
  const totalMortality = samplingMortality + dailyMortality;

  let recordBasedPopulation = initialPopulation;
  if (baselinePopulation !== null) {
    recordBasedPopulation = Math.max(0, baselinePopulation - postBaselineMortality);
  } else {
    recordBasedPopulation = Math.max(0, initialPopulation - totalMortality);
  }

  const totalHarvestedPopulation = Math.max(0, toFiniteNumber(pond.totalHarvestedPopulation));
  recordBasedPopulation = Math.max(0, recordBasedPopulation - totalHarvestedPopulation);

  const latestMbw =
    getSamplingMbw(latestValidMbwSampling) ||
    toFiniteNumber(pond.baselineMbw) ||
    initialWeight;
  const now = options.now || new Date();
  const currentDateKey = normalizeFarmDateKey(options.currentDateKey, timeZone) || getFarmDateKey(now, timeZone);
  const currentDoc = options.currentDoc === undefined
    ? getPondCurrentDoc(pond, timeZone, now)
    : Math.max(0, Math.floor(toFiniteNumber(options.currentDoc)));
  const hasAgeAnchor = options.currentDoc !== undefined || Boolean(normalizeFarmDateKey(pond.docStart, timeZone));
  let modelDays = currentDoc;
  let modelPopulation = initialPopulation;
  let modelStartDoc = 0;
  const baselineDoc = Math.max(0, toFiniteNumber(pond.baselineDoc));
  const baselineDateKey = normalizeFarmDateKey(pond.baselineDate, timeZone);
  if (baselinePopulation !== null && baselineDateKey) {
    modelPopulation = baselinePopulation;
    modelDays = Math.max(0, differenceInFarmCalendarDays(currentDateKey, baselineDateKey));
    modelStartDoc = Math.max(0, baselineDoc || currentDoc - modelDays);
  } else if (baselinePopulation !== null && baselineDoc > 0 && currentDoc >= baselineDoc) {
    modelPopulation = baselinePopulation;
    modelDays = currentDoc - baselineDoc;
    modelStartDoc = baselineDoc;
  }
  const mortalityModel = getMortalityModel(pond, currentDoc);

  let biologicalPopulation: number | null = null;
  let lowBiologicalPopulation = recordBasedPopulation;
  let highBiologicalPopulation = recordBasedPopulation;
  if (hasAgeAnchor && modelPopulation > 0 && modelDays > 0) {
    const populationAfterExpectedLoss = (modelPopulation * calculateSurvivalRetention(
      mortalityModel,
      modelStartDoc,
      modelDays,
      'expected',
    ))
      - totalHarvestedPopulation;
    const populationAfterLowSurvival = (modelPopulation * calculateSurvivalRetention(
      mortalityModel,
      modelStartDoc,
      modelDays,
      'low_survival',
    ))
      - totalHarvestedPopulation;
    const populationAfterHighSurvival = (modelPopulation * calculateSurvivalRetention(
      mortalityModel,
      modelStartDoc,
      modelDays,
      'high_survival',
    ))
      - totalHarvestedPopulation;
    biologicalPopulation = Math.min(recordBasedPopulation, Math.max(0, populationAfterExpectedLoss));
    lowBiologicalPopulation = Math.min(recordBasedPopulation, Math.max(0, populationAfterLowSurvival));
    highBiologicalPopulation = Math.min(recordBasedPopulation, Math.max(0, populationAfterHighSurvival));
  }

  const recentFeed = getRecentFeedCrossCheck(pond, latestMbw, currentDoc, currentDateKey, timeZone);
  const feedDifference = biologicalPopulation && recentFeed.population
    ? Math.abs(recentFeed.population - biologicalPopulation) / biologicalPopulation
    : Number.POSITIVE_INFINITY;
  const feedAgrees = biologicalPopulation !== null && recentFeed.population !== null && feedDifference <= 0.35;
  let currentPopulation = biologicalPopulation ?? recordBasedPopulation;
  let lowPopulation = biologicalPopulation === null ? recordBasedPopulation : lowBiologicalPopulation;
  let highPopulation = biologicalPopulation === null ? recordBasedPopulation : highBiologicalPopulation;
  let method: PondBiomassEstimate['method'] = biologicalPopulation === null ? 'record_only' : 'biological';

  if (feedAgrees && recentFeed.population !== null) {
    currentPopulation = Math.min(recordBasedPopulation, (currentPopulation * 0.8) + (recentFeed.population * 0.2));
    lowPopulation = Math.min(recordBasedPopulation, (lowPopulation * 0.8) + (recentFeed.population * 0.75 * 0.2));
    highPopulation = Math.min(recordBasedPopulation, (highPopulation * 0.8) + (recentFeed.population * 1.25 * 0.2));
    method = 'biological_feed';
  }

  currentPopulation = Math.round(Math.max(0, currentPopulation));
  lowPopulation = Math.min(currentPopulation, Math.round(Math.max(0, lowPopulation)));
  highPopulation = Math.max(currentPopulation, Math.round(Math.max(0, highPopulation)));
  const postHarvestBiomass = pond.postHarvestRemainingBiomass;
  const postHarvestPopulation = toFiniteNumber(pond.postHarvestRemainingPopulation);
  const referenceSamplingId = pond.postHarvestReferenceSamplingId || '';
  const referenceSamplingDate = pond.postHarvestReferenceSamplingDate || '';
  const referenceMbw = toFiniteNumber(pond.postHarvestReferenceMbw);
  const latestSamplingId = latestValidMbwSampling?.id || '';
  const latestSamplingDate = latestValidMbwSampling?.date || '';
  const hasPostHarvestBiomass = postHarvestBiomass !== undefined && postHarvestBiomass !== null;
  const sameReferenceSampling = referenceSamplingId
    ? latestSamplingId === referenceSamplingId
    : latestSamplingDate === referenceSamplingDate;
  const referenceMbwUnchanged = referenceMbw <= 0 || Math.abs(latestMbw - referenceMbw) < 0.0001;
  const canUsePostHarvestBiomass = hasPostHarvestBiomass && sameReferenceSampling && referenceMbwUnchanged;
  const populationRemovedAfterBaseline = Math.max(0, postHarvestPopulation - currentPopulation);
  const currentBiomass = canUsePostHarvestBiomass
    ? Math.max(0, toFiniteNumber(postHarvestBiomass) - ((populationRemovedAfterBaseline * latestMbw) / 1000))
    : Math.max(0, (currentPopulation * latestMbw) / 1000);
  if (canUsePostHarvestBiomass) {
    method = 'post_harvest';
    lowPopulation = currentPopulation;
    highPopulation = currentPopulation;
  }
  const lowEstimateKg = canUsePostHarvestBiomass
    ? currentBiomass
    : (lowPopulation * latestMbw) / 1000;
  const highEstimateKg = canUsePostHarvestBiomass
    ? currentBiomass
    : (highPopulation * latestMbw) / 1000;
  const warnings: string[] = [];
  if (!hasAgeAnchor) warnings.push('age_missing_record_only');
  if (hasAgeAnchor && biologicalPopulation !== null) warnings.push('mortality_logs_are_minimum');
  if (currentDoc >= 15 && recentFeed.days < 3) warnings.push('recent_feed_cross_check_unavailable');
  if (recentFeed.population !== null && !feedAgrees) warnings.push('feed_biomass_disagreement');
  if (recentFeed.excludedAtypicalDays > 0) warnings.push('atypical_feed_days_excluded');
  const confidence: PondBiomassEstimate['confidence'] = method === 'post_harvest' ||
    mortalityModel.calibrated || feedAgrees || baselinePopulation !== null
    ? 'medium'
    : 'low';
  const biomassEstimate: PondBiomassEstimate = {
    bestEstimateKg: currentBiomass,
    lowEstimateKg,
    highEstimateKg,
    bestPopulation: currentPopulation,
    lowPopulation,
    highPopulation,
    recordBasedPopulation,
    biologicalPopulation: biologicalPopulation === null ? null : Math.round(biologicalPopulation),
    feedBasedBiomassKg: recentFeed.biomassKg,
    feedBasedPopulation: recentFeed.population === null ? null : Math.round(recentFeed.population),
    recentFeedDays: recentFeed.days,
    expectedSurvivalPercent: initialPopulation > 0 ? (currentPopulation / initialPopulation) * 100 : 0,
    lowSurvivalPercent: initialPopulation > 0 ? (lowPopulation / initialPopulation) * 100 : 0,
    highSurvivalPercent: initialPopulation > 0 ? (highPopulation / initialPopulation) * 100 : 0,
    expectedDailyMortalityRatePercent: mortalityModel.expectedDailyRate * 100,
    confidence,
    method,
    warnings,
  };
  const totalFeedConsumed = Math.max(0, getPondTotalFeedConsumed(pond));
  const adjustedSR = initialPopulation > 0 ? (currentPopulation / initialPopulation) * 100 : 0;
  const totalHarvestedBiomass = toFiniteNumber(pond.totalHarvestedBiomass);
  const producedBiomass = currentBiomass + totalHarvestedBiomass;
  const adjustedFCR = producedBiomass > 0 ? totalFeedConsumed / producedBiomass : 0;
  const initialBiomass = (initialPopulation * initialWeight) / 1000;
  const biomassGain = producedBiomass - initialBiomass;
  const biomassGainFCR = biomassGain > 0 ? totalFeedConsumed / biomassGain : 0;
  const samplingMortalityWeight = validSamplings
    .filter((sampling) => !isBaselineSampling(sampling))
    .reduce((sum, sampling) => sum + (toFiniteNumber(sampling.mortality) * getSamplingMbw(sampling)) / 1000, 0);
  const dailyMortalityWeight = mortalityRecords.reduce((sum, record) => {
    const mortalityCount = getMortalityPopulationDeduction(record);
    const mbwAtRecord = Math.max(0, toFiniteNumber(record.mbwAtRecord));
    return sum + (mortalityCount * mbwAtRecord) / 1000;
  }, 0);
  const totalMortalityWeight = samplingMortalityWeight + dailyMortalityWeight;

  return {
    currentBiomass,
    currentPopulation,
    adjustedSR: Math.max(0, adjustedSR),
    totalFeedConsumed,
    adjustedFCR: Math.max(0, adjustedFCR),
    biomassGainFCR: Math.max(0, biomassGainFCR),
    latestMbw,
    size: latestMbw > 0 ? Math.round(1000 / latestMbw) : 0,
    adg: calculateAdg(pond, timeZone),
    doc: currentDoc,
    totalMortality,
    totalMortalityWeight,
    biomassEstimate,
    latestSampling,
    latestValidMbwSampling,
  };
};

export const detectFeedBiomassMismatchInsight = (
  pond: SharedPond,
  options: { thresholdPercent?: number; requiredRecords?: number } = {},
): FeedBiomassMismatchInsight | null => {
  const thresholdPercent = options.thresholdPercent ?? 20;
  const requiredRecords = options.requiredRecords ?? 2;
  const sortedSamplings = sortByDateAsc(pond.samplings || []);
  const qualifyingRecords = sortedSamplings
    .filter((sampling) => !isBaselineSampling(sampling))
    .map((sampling) => {
      const mbw = getSamplingMbw(sampling);
      const feedKg = getSamplingFeedAmount(sampling);
      const feedRatePercent = getFeedRateFromMbw(mbw);
      if (mbw <= 0 || feedKg <= 0 || !feedRatePercent) return null;

      const metricsToDate = calculatePondMetricsWithHarvest({
        ...pond,
        samplings: sortedSamplings.filter((item) => {
          const itemTime = getValidTime(item.date);
          const samplingTime = getValidTime(sampling.date);
          if (itemTime === null || samplingTime === null) return item === sampling;
          return itemTime <= samplingTime;
        }),
        mortalityRecords: (pond.mortalityRecords || []).filter((record) => {
          const recordTime = getValidTime(record.date);
          const samplingTime = getValidTime(sampling.date);
          if (recordTime === null || samplingTime === null) return false;
          return recordTime <= samplingTime;
        }),
      }, undefined, {
        now: getValidTime(sampling.date) === null ? undefined : new Date(getValidTime(sampling.date)!),
        currentDateKey: sampling.date ? normalizeFarmDateKey(sampling.date) ?? undefined : undefined,
      });
      const recordBiomassKg = metricsToDate.currentBiomass;
      if (recordBiomassKg <= 0) return null;

      const feedBasedBiomassKg = feedKg / (feedRatePercent / 100);
      const feedBasedPopulation = (feedBasedBiomassKg * 1000) / mbw;
      const differencePercent = (Math.abs(feedBasedBiomassKg - recordBiomassKg) / recordBiomassKg) * 100;

      return {
        sampling,
        date: sampling.date ?? undefined,
        mbw,
        feedKg,
        feedRatePercent,
        recordPopulation: metricsToDate.currentPopulation,
        recordBiomassKg,
        feedBasedPopulation,
        feedBasedBiomassKg,
        differencePercent,
      };
    })
    .filter((record): record is FeedBiomassMismatchRecord => record !== null);

  const recentRecords = qualifyingRecords.slice(-requiredRecords);
  if (recentRecords.length < requiredRecords) return null;

  const triggered = recentRecords.every((record) => record.differencePercent >= thresholdPercent);
  if (!triggered) return null;

  const latest = recentRecords[recentRecords.length - 1];
  const averageDifferencePercent = recentRecords.reduce((sum, record) => sum + record.differencePercent, 0) / recentRecords.length;
  const higherCount = recentRecords.filter((record) => record.feedBasedBiomassKg > record.recordBiomassKg).length;
  const lowerCount = recentRecords.filter((record) => record.feedBasedBiomassKg < record.recordBiomassKg).length;
  const direction = higherCount === recentRecords.length
    ? 'feed_based_higher'
    : lowerCount === recentRecords.length
      ? 'feed_based_lower'
      : 'mixed';

  return {
    thresholdPercent,
    requiredRecords,
    triggered,
    records: recentRecords,
    latest,
    averageDifferencePercent,
    direction,
  };
};
