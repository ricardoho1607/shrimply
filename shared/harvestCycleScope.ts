export interface HarvestCycleRecord {
  cycleId?: string | null;
  ponds?: {
    cycleId?: string | null;
  }[] | null;
}

export interface HarvestCyclePond {
  cycleId?: string | null;
}

export const harvestRecordMatchesCycle = (
  record: HarvestCycleRecord,
  cycleId: string,
): boolean => record.cycleId === cycleId || Boolean(
  record.ponds?.some((pond) => pond.cycleId === cycleId),
);

export const isHistoricalHarvestRecord = (
  record: HarvestCycleRecord,
  openCycleIds: Set<string>,
): boolean => {
  const recordCycleIds = new Set([
    record.cycleId,
    ...(record.ponds || []).map((pond) => pond.cycleId),
  ].filter((cycleId): cycleId is string => Boolean(cycleId)));

  if (recordCycleIds.size === 0) return true;
  return [...recordCycleIds].every((cycleId) => !openCycleIds.has(cycleId));
};

export const harvestPondsBelongToCycle = (
  ponds: HarvestCyclePond[],
  cycleId: string,
): boolean => ponds.length > 0 && ponds.every((pond) => pond.cycleId === cycleId);
