import {
  differenceInFarmCalendarDays,
  getFarmDateKey,
  normalizeFarmDateKey,
} from './farmDate';

export const DAY_MS = 24 * 60 * 60 * 1000;

export interface SharedFeedData {
  totalDailyFeed?: number | string | null;
}

export interface SharedSampling {
  id?: string;
  date?: string;
  mbw?: number | string | null;
  abw?: number | string | null;
  mortality?: number | string | null;
  feed?: number | string | null;
  feedData?: SharedFeedData | null;
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
  latestSampling?: SharedSampling;
  latestValidMbwSampling?: SharedSampling;
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

export const getPondOperationalFeed = (pond: Pick<SharedPond, 'samplings'>): number => {
  const operationalSamplings = (pond.samplings || []).filter((sampling) => !isBaselineSampling(sampling));
  const feedManagementFeed = operationalSamplings
    .filter((sampling) => sampling.feedData)
    .reduce((total, sampling) => total + getSamplingFeedAmount(sampling), 0);
  const samplingFeed = operationalSamplings
    .filter((sampling) => getSamplingMbw(sampling) > 0 || toFiniteNumber(sampling.mortality) > 0 || toFiniteNumber(sampling.feed) > 0)
    .reduce((total, sampling) => total + toFiniteNumber(sampling.feed), 0);

  return feedManagementFeed > 0 ? feedManagementFeed : samplingFeed;
};

export const getPondTotalFeedConsumed = (pond: Pick<SharedPond, 'baselineCumulativeFeed' | 'samplings'>): number =>
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

export const calculateAdg = (
  pond: Pick<SharedPond, 'docStart' | 'initialWeight' | 'baselineMbw' | 'samplings'>,
): number => {
  const sorted = sortByDateAsc(pond.samplings || []);
  const validOperational = sorted.filter((sampling) => !isBaselineSampling(sampling) && getSamplingMbw(sampling) > 0);

  if (!validOperational.length) return 0;

  const currentSampling = validOperational[validOperational.length - 1];
  const currentSamplingTime = getValidTime(currentSampling.date);
  if (currentSamplingTime === null) return 0;

  const baselineSampling = [...sorted]
    .reverse()
    .find((sampling) => isBaselineSampling(sampling) && getSamplingMbw(sampling) > 0 && (getValidTime(sampling.date) ?? Infinity) < currentSamplingTime);
  const previousOperational = [...validOperational]
    .reverse()
    .find((sampling) => (getValidTime(sampling.date) ?? Infinity) < currentSamplingTime);
  const previousSampling = previousOperational || baselineSampling;
  const previousWeight = previousSampling ? getSamplingMbw(previousSampling) : getPondInitialWeight(pond);
  const previousDate = previousSampling?.date || pond.docStart;
  const previousTime = getValidTime(previousDate);

  if (previousTime === null) return 0;
  const daysDiff = (currentSamplingTime - previousTime) / DAY_MS;
  if (daysDiff <= 0) return 0;

  return (getSamplingMbw(currentSampling) - previousWeight) / daysDiff;
};

export const calculatePondMetricsWithHarvest = (pond: SharedPond, timeZone?: string): PondMetricsWithHarvest => {
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

  let currentPopulation = initialPopulation;
  if (baselinePopulation !== null) {
    currentPopulation = Math.max(0, baselinePopulation - postBaselineMortality);
  } else {
    currentPopulation = Math.max(0, initialPopulation - totalMortality);
  }

  currentPopulation = Math.max(0, currentPopulation - toFiniteNumber(pond.totalHarvestedPopulation));

  const latestMbw =
    getSamplingMbw(latestValidMbwSampling) ||
    toFiniteNumber(pond.baselineMbw) ||
    initialWeight;
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
    adg: calculateAdg(pond),
    doc: getPondCurrentDoc(pond, timeZone),
    totalMortality,
    totalMortalityWeight,
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
