import {
  calculatePondMetricsWithHarvest,
  getSamplingMbw,
  isBaselineSampling,
  toFiniteNumber,
  type SharedSampling,
  type SharedPond,
} from './pondCalculations';

export type HarvestType = 'partial' | 'final';
export type HarvestDayFeedStatus = 'not_recorded' | 'fasted';

export interface HarvestDateSamplingInput {
  id: string;
  date: string;
  mbw: number;
  feedStatus: HarvestDayFeedStatus;
  cycleId?: string;
  cycleName?: string;
  pondCycleId?: string;
}

export interface HarvestLineInput {
  biomass?: number | string | null;
  size?: number | string | null;
  subBiomass?: number | string | null;
  subSize?: number | string | null;
  harvestType?: HarvestType;
  partialHarvestNumber?: number;
  harvestReferenceSamplingId?: string | null;
  harvestReferenceSamplingDate?: string | null;
  harvestReferenceMbw?: number | string | null;
}

export interface HarvestDraftLineInput {
  biomass?: string | null;
  size?: string | null;
  price?: string | null;
  subBiomass?: string | null;
  subSize?: string | null;
  subPrice?: string | null;
}

export interface AutoFilledHarvestSize {
  value: string;
  date: string;
}

export const clearUntouchedAutoFilledHarvestSize = (
  currentSize: string,
  autoFilled?: AutoFilledHarvestSize,
): string => autoFilled && currentSize === autoFilled.value ? '' : currentSize;

export const refreshAutoFilledHarvestSize = (
  currentSize: string,
  autoFilled: AutoFilledHarvestSize | undefined,
  suggestedSize: string,
  samplingDate: string,
): { size: string; autoFilled?: AutoFilledHarvestSize } => {
  const isUntouchedAutoFill = Boolean(autoFilled && currentSize === autoFilled.value);
  if (!isUntouchedAutoFill && currentSize) return { size: currentSize };
  return { size: suggestedSize, autoFilled: { value: suggestedSize, date: samplingDate } };
};

const hasDraftValue = (value: string | null | undefined): boolean => Boolean(value?.trim());

export const hasHarvestDraftData = (
  draft: HarvestDraftLineInput,
  autoFilledMainSize = false,
): boolean => (
  hasDraftValue(draft.biomass)
  || (!autoFilledMainSize && hasDraftValue(draft.size))
  || hasDraftValue(draft.price)
  || hasDraftValue(draft.subBiomass)
  || hasDraftValue(draft.subSize)
  || hasDraftValue(draft.subPrice)
);

export const getInvalidHarvestDraftLine = (
  draft: HarvestDraftLineInput,
  autoFilledMainSize = false,
): 'main' | 'secondary' | null => {
  const valid = (value: string | null | undefined) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0;
  };
  const mainStarted = hasDraftValue(draft.biomass)
    || (!autoFilledMainSize && hasDraftValue(draft.size))
    || hasDraftValue(draft.price);
  const secondaryStarted = hasDraftValue(draft.subBiomass)
    || hasDraftValue(draft.subSize)
    || hasDraftValue(draft.subPrice);

  if (mainStarted && !(valid(draft.biomass) && valid(draft.size) && valid(draft.price))) return 'main';
  if (secondaryStarted && !(valid(draft.subBiomass) && valid(draft.subSize) && valid(draft.subPrice))) return 'secondary';
  return null;
};

export const stripOrphanAutoFilledHarvestSize = <T extends HarvestDraftLineInput>(
  draft: T,
  autoFilledMainSize: boolean,
): T => {
  const mainHasExplicitData = hasDraftValue(draft.biomass) || hasDraftValue(draft.price);
  return autoFilledMainSize && !mainHasExplicitData
    ? { ...draft, size: '' }
    : draft;
};

export interface HarvestTrackingPond extends SharedPond {
  partialHarvestCount?: number | string | null;
  postHarvestBaselineDate?: string | null;
  postHarvestRemainingBiomass?: number | string | null;
  postHarvestRemainingPopulation?: number | string | null;
  postHarvestReferenceSamplingId?: string | null;
  postHarvestReferenceSamplingDate?: string | null;
  postHarvestReferenceMbw?: number | string | null;
}

export interface HarvestRecordForReadiness {
  cycleId?: string | null;
  ponds?: (HarvestLineInput & {
    pondId?: string | null;
    pondCycleId?: string | null;
    cycleId?: string | null;
  })[] | null;
}

export interface PondCycleIdentity {
  id: string;
  pondCycleId?: string | null;
  cycleId?: string | null;
}

export const getHarvestDateSampling = (
  pond: Pick<SharedPond, 'samplings'>,
  harvestDate: string,
): SharedSampling | undefined => {
  const dateKey = String(harvestDate || '').slice(0, 10);
  if (!dateKey) return undefined;

  return [...(pond.samplings || [])]
    .reverse()
    .find((sampling) => (
      !isBaselineSampling(sampling)
      && String(sampling.date || '').slice(0, 10) === dateKey
      && getSamplingMbw(sampling) > 0
    ));
};

export const buildHarvestDateSampling = (input: HarvestDateSamplingInput) => ({
  id: input.id,
  date: input.date,
  mbw: input.mbw,
  mortality: 0,
  feedEntryStatus: input.feedStatus,
  ...(input.feedStatus === 'fasted' ? { feed: 0 } : {}),
  ...(input.cycleId ? { cycleId: input.cycleId } : {}),
  ...(input.cycleName ? { cycleName: input.cycleName } : {}),
  ...(input.pondCycleId ? { pondCycleId: input.pondCycleId } : {}),
});

export const getSamplingSize = (sampling?: SharedSampling): number => {
  const mbw = getSamplingMbw(sampling);
  return mbw > 0 ? Math.round(1000 / mbw) : 0;
};

export const harvestSizeDiffersFromSampling = (
  harvestSize: number | string | null | undefined,
  sampling?: SharedSampling,
  threshold = 0.2,
): boolean => {
  const sampledSize = getSamplingSize(sampling);
  const enteredSize = Math.max(0, toFiniteNumber(harvestSize));
  if (sampledSize <= 0 || enteredSize <= 0) return false;
  return Math.abs(enteredSize - sampledSize) / sampledSize > threshold;
};

export const calculateHarvestRemoval = (harvest: HarvestLineInput) => {
  const mainBiomass = Math.max(0, toFiniteNumber(harvest.biomass));
  const subBiomass = Math.max(0, toFiniteNumber(harvest.subBiomass));
  const mainSize = Math.max(0, toFiniteNumber(harvest.size));
  const subSize = Math.max(0, toFiniteNumber(harvest.subSize));

  return {
    biomass: mainBiomass + subBiomass,
    population: (mainBiomass * mainSize) + (subBiomass * subSize),
  };
};

export const getNextPartialHarvestNumber = (pond: Pick<HarvestTrackingPond, 'partialHarvestCount'>): number =>
  Math.max(0, Math.floor(toFiniteNumber(pond.partialHarvestCount))) + 1;

export const hasFinalHarvestForPondCycle = (
  records: HarvestRecordForReadiness[],
  pond: PondCycleIdentity,
): boolean => records.some((record) =>
  (record.ponds || []).some((harvestPond) => {
    if (harvestPond.harvestType !== 'final') return false;
    const matchesPond = harvestPond.pondId === pond.id || (
      Boolean(pond.pondCycleId) && harvestPond.pondCycleId === pond.pondCycleId
    );
    if (!matchesPond) return false;
    if (!pond.cycleId) return true;
    return harvestPond.cycleId === pond.cycleId || record.cycleId === pond.cycleId || harvestPond.pondId === pond.id;
  })
);

export const withHarvestReference = <T extends HarvestLineInput>(pond: HarvestTrackingPond, harvest: T): T => {
  const referenceSampling = calculatePondMetricsWithHarvest(pond).latestValidMbwSampling;
  return {
    ...harvest,
    harvestReferenceSamplingId: referenceSampling?.id || null,
    harvestReferenceSamplingDate: referenceSampling?.date || null,
    harvestReferenceMbw: getSamplingMbw(referenceSampling),
  };
};

export const applyHarvestImpactToPond = <T extends HarvestTrackingPond>(
  pond: T,
  harvest: HarvestLineInput,
  harvestDate: string,
  assignedPartialNumber?: number,
): T => {
  const removal = calculateHarvestRemoval(harvest);
  const metrics = calculatePondMetricsWithHarvest(pond);
  const referenceSampling = metrics.latestValidMbwSampling;
  const isPartial = harvest.harvestType === 'partial';
  const partialHarvestCount = isPartial
    ? Math.max(
        Math.floor(toFiniteNumber(pond.partialHarvestCount)),
        assignedPartialNumber || getNextPartialHarvestNumber(pond),
      )
    : Math.max(0, Math.floor(toFiniteNumber(pond.partialHarvestCount)));

  return {
    ...pond,
    totalHarvestedBiomass: toFiniteNumber(pond.totalHarvestedBiomass) + removal.biomass,
    totalHarvestedPopulation: toFiniteNumber(pond.totalHarvestedPopulation) + removal.population,
    partialHarvestCount,
    postHarvestBaselineDate: harvestDate,
    postHarvestRemainingBiomass: Math.max(0, metrics.currentBiomass - removal.biomass),
    postHarvestRemainingPopulation: Math.max(0, metrics.currentPopulation - removal.population),
    postHarvestReferenceSamplingId: referenceSampling?.id || null,
    postHarvestReferenceSamplingDate: referenceSampling?.date || null,
    postHarvestReferenceMbw: getSamplingMbw(referenceSampling),
  } as T;
};

export const reverseHarvestImpactOnPond = <T extends HarvestTrackingPond>(
  pond: T,
  harvest: HarvestLineInput,
): T => {
  const removal = calculateHarvestRemoval(harvest);
  const hasBiomassBaseline = pond.postHarvestRemainingBiomass !== undefined && pond.postHarvestRemainingBiomass !== null;
  const hasPopulationBaseline = pond.postHarvestRemainingPopulation !== undefined && pond.postHarvestRemainingPopulation !== null;
  const sameReferenceSampling = harvest.harvestReferenceSamplingId
    ? harvest.harvestReferenceSamplingId === pond.postHarvestReferenceSamplingId
    : harvest.harvestReferenceSamplingDate
      ? harvest.harvestReferenceSamplingDate === pond.postHarvestReferenceSamplingDate
      : true;
  const biomassToRestore = sameReferenceSampling
    ? removal.biomass
    : (removal.population * toFiniteNumber(pond.postHarvestReferenceMbw)) / 1000;

  return {
    ...pond,
    totalHarvestedBiomass: Math.max(0, toFiniteNumber(pond.totalHarvestedBiomass) - removal.biomass),
    totalHarvestedPopulation: Math.max(0, toFiniteNumber(pond.totalHarvestedPopulation) - removal.population),
    ...(hasBiomassBaseline
      ? { postHarvestRemainingBiomass: toFiniteNumber(pond.postHarvestRemainingBiomass) + biomassToRestore }
      : {}),
    ...(hasPopulationBaseline
      ? { postHarvestRemainingPopulation: toFiniteNumber(pond.postHarvestRemainingPopulation) + removal.population }
      : {}),
  } as T;
};
