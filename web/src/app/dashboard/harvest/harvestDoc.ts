import { differenceInFarmCalendarDays, normalizeFarmDateKey } from '../../../../../shared/farmDate';

interface HarvestAgeSource {
  docStart?: string | null;
  baselineDate?: string | null;
  baselineDoc?: number | string | null;
}

export function getHarvestDoc(pond: HarvestAgeSource | undefined, harvestDate: string, timeZone?: string): number | null {
  if (!pond) return null;
  const date = normalizeFarmDateKey(harvestDate, timeZone);
  if (!date) return null;
  const baselineDate = normalizeFarmDateKey(pond.baselineDate, timeZone);
  const baselineDoc = pond.baselineDoc == null || pond.baselineDoc === '' ? NaN : Number(pond.baselineDoc);
  const startDate = normalizeFarmDateKey(pond.docStart, timeZone);
  const age = baselineDate && Number.isFinite(baselineDoc) && baselineDoc >= 0
    ? baselineDoc + differenceInFarmCalendarDays(date, baselineDate)
    : startDate ? differenceInFarmCalendarDays(date, startDate) : NaN;
  return Number.isFinite(age) && age >= 0 ? Math.floor(age) : null;
}
