import { differenceInFarmCalendarDays, normalizeFarmDateKey } from './farmDate.ts';
import { type SharedPond, toFiniteNumber } from './pondCalculations.ts';

export interface ReportHarvest {
  date: string; voided?: boolean; cycleId?: string;
  ponds: { pondId: string; cycleId?: string; biomass?: number | string; size?: number | string; subBiomass?: number | string; subSize?: number | string }[];
}
export function pondExistsOnReportDate(pond: { docStart?: string | null; cycleStartedAt?: string | null; cycleEndedAt?: string | null }, date: string, timeZone?: string): boolean {
  const start = normalizeFarmDateKey(pond.cycleStartedAt || pond.docStart, timeZone);
  const end = normalizeFarmDateKey(pond.cycleEndedAt, timeZone);
  return Boolean(start && start <= date && (!end || date <= end));
}
/** Rebuild cumulative harvests from their dated source records, never today's aggregate. */
export function buildPondReportSnapshot<T extends SharedPond & { id: string; cycleId?: string | null }>(pond: T, date: string, harvests: ReportHarvest[], timeZone?: string): T {
  const key = normalizeFarmDateKey(date, timeZone);
  if (!key) throw new Error('A valid report date is required.');
  let population = 0, biomass = 0, allPopulation = 0, allBiomass = 0;
  for (const harvest of harvests) {
    if (harvest.voided) continue;
    for (const line of harvest.ponds || []) {
      if (line.pondId !== pond.id || ((line.cycleId || harvest.cycleId) && pond.cycleId && (line.cycleId || harvest.cycleId) !== pond.cycleId)) continue;
      const harvestDate = normalizeFarmDateKey(harvest.date, timeZone);
      if (!harvestDate) throw new Error('A linked harvest has no valid date. Correct it before exporting historical reports.');
      for (const [weight, size] of [[line.biomass, line.size], [line.subBiomass, line.subSize]]) {
        const kg = toFiniteNumber(weight);
        if (kg <= 0) continue;
        const countPerKg = toFiniteNumber(size);
        if (countPerKg <= 0) throw new Error('A linked harvest is missing shrimp size. Historical population cannot be reconstructed.');
        allBiomass += kg; allPopulation += kg * countPerKg;
        if (harvestDate <= key) { biomass += kg; population += kg * countPerKg; }
      }
    }
  }
  if (toFiniteNumber(pond.totalHarvestedPopulation) > allPopulation + 1 || toFiniteNumber(pond.totalHarvestedBiomass) > allBiomass + 0.01) {
    throw new Error('Some harvest history is missing. Reconcile the pond harvest records before exporting a historical report.');
  }
  const throughDate = (record: { date?: string }) => {
    const recordKey = normalizeFarmDateKey(record.date, timeZone);
    return Boolean(recordKey && recordKey <= key);
  };
  const laterPostHarvest = (normalizeFarmDateKey(pond.postHarvestBaselineDate, timeZone) || '') > key;
  return {
    ...pond,
    samplings: (pond.samplings || []).filter(throughDate),
    mortalityRecords: (pond.mortalityRecords || []).filter(throughDate),
    totalHarvestedPopulation: population, totalHarvestedBiomass: biomass,
    ...(laterPostHarvest ? { postHarvestBaselineDate: null, postHarvestRemainingBiomass: null, postHarvestRemainingPopulation: null, postHarvestReferenceSamplingId: null, postHarvestReferenceSamplingDate: null, postHarvestReferenceMbw: null } : {}),
  };
}

export function reportCalculationOptions(pond: SharedPond, date: string, timeZone?: string) {
  const currentDateKey = normalizeFarmDateKey(date, timeZone);
  if (!currentDateKey) throw new Error('A valid observation date is required.');
  const baseline = normalizeFarmDateKey(pond.baselineDate, timeZone);
  const start = normalizeFarmDateKey(pond.docStart, timeZone);
  const currentDoc = baseline && toFiniteNumber(pond.baselineDoc) > 0 && baseline <= currentDateKey
    ? toFiniteNumber(pond.baselineDoc) + differenceInFarmCalendarDays(currentDateKey, baseline)
    : start ? differenceInFarmCalendarDays(currentDateKey, start) : 0;
  return { currentDateKey, currentDoc: Math.max(0, currentDoc), now: new Date(`${currentDateKey}T12:00:00Z`) };
}
