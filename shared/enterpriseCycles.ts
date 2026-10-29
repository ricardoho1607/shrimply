export type EnterpriseCycleStatus = 'planning' | 'stocking' | 'active' | 'closing' | 'closed';

export interface EnterpriseCycleRecord {
  id: string;
  cycleName: string;
  status: EnterpriseCycleStatus;
  blockIds?: string[] | null;
  blockNames?: string[] | null;
  blockId?: string | null;
  blockName?: string | null;
  plannedPondIds?: string[] | null;
  plannedStartDate?: string;
  plannedStockingEndDate?: string;
  stockingStartDate?: string;
  stockingEndDate?: string;
  closedAt?: string;
  assignedTechnicianId?: string | null;
}

export interface EnterpriseCyclePondRecord {
  id: string;
  pondName?: string;
  blockId?: string | null;
  cycleId?: string | null;
  cycleStatus?: 'active' | 'ended';
  previousCyclePondId?: string | null;
  physicalPondId?: string | null;
  docStart?: string | null;
  cycleStartedAt?: string | null;
}

export interface EnterprisePhysicalPondRecord {
  id: string;
  pondName?: string;
  blockId?: string | null;
  status?: 'idle' | 'active';
  activePondId?: string | null;
}

export interface EnterpriseCycleSummary {
  plannedCount: number;
  startedCount: number;
  activeCount: number;
  endedCount: number;
  status: EnterpriseCycleStatus;
  stockingStartDate?: string;
  stockingEndDate?: string;
}

export const isEnterpriseCycleOpen = (
  cycle: Pick<EnterpriseCycleRecord, 'status'>,
): boolean => ['planning', 'stocking', 'active'].includes(cycle.status);

export const getEnterpriseCyclePonds = <T extends EnterpriseCyclePondRecord>(
  cycleId: string,
  ponds: T[],
  blockId?: string | null,
): T[] => ponds.filter((pond) => (
  pond.cycleId === cycleId
  && (!blockId || pond.blockId === blockId)
));

export const getEnterpriseCycleBlockIds = (
  cycle: Pick<EnterpriseCycleRecord, 'blockIds' | 'blockId' | 'id'>,
  ponds: EnterpriseCyclePondRecord[] = [],
): string[] => {
  if (cycle.blockIds?.length) return [...new Set(cycle.blockIds.filter(Boolean))];
  if (cycle.blockId) return [cycle.blockId];

  return [...new Set(ponds
    .filter((pond) => pond.cycleId === cycle.id && pond.blockId)
    .map((pond) => pond.blockId as string))];
};

export const getEnterpriseBlockCycles = <T extends EnterpriseCycleRecord>(
  blockId: string,
  cycles: T[],
  ponds: EnterpriseCyclePondRecord[],
): T[] => cycles
  .filter((cycle) => getEnterpriseCycleBlockIds(cycle, ponds).includes(blockId))
  .sort((first, second) => {
    const firstClosed = first.status === 'closed' ? 1 : 0;
    const secondClosed = second.status === 'closed' ? 1 : 0;
    if (firstClosed !== secondClosed) return firstClosed - secondClosed;
    const firstDate = first.stockingStartDate || first.plannedStartDate || '';
    const secondDate = second.stockingStartDate || second.plannedStartDate || '';
    return secondDate.localeCompare(firstDate);
  });

export const getPreviousEnterpriseCycleForSameBlocks = <T extends EnterpriseCycleRecord>(
  selectedCycle: T,
  cycles: T[],
  ponds: EnterpriseCyclePondRecord[] = [],
): T | undefined => {
  const selectedBlockIds = getEnterpriseCycleBlockIds(selectedCycle, ponds).sort();
  if (selectedBlockIds.length === 0) return undefined;

  const selectedEnd = new Date(
    selectedCycle.closedAt || selectedCycle.stockingEndDate || Date.now(),
  ).getTime();

  return [...cycles]
    .filter((candidate) => candidate.id !== selectedCycle.id && candidate.status === 'closed')
    .filter((candidate) => {
      const candidateEnd = new Date(candidate.closedAt || candidate.stockingEndDate || 0).getTime();
      if (candidateEnd >= selectedEnd) return false;

      const candidateBlockIds = getEnterpriseCycleBlockIds(candidate, ponds).sort();
      return candidateBlockIds.length === selectedBlockIds.length
        && candidateBlockIds.every((blockId, index) => blockId === selectedBlockIds[index]);
    })
    .sort((first, second) => (
      new Date(second.closedAt || second.stockingEndDate || 0).getTime()
      - new Date(first.closedAt || first.stockingEndDate || 0).getTime()
    ))[0];
};

export const getEnterpriseCyclePlannedPonds = <T extends EnterprisePhysicalPondRecord>(
  cycle: Pick<EnterpriseCycleRecord, 'id' | 'plannedPondIds' | 'blockIds' | 'blockId'>,
  physicalPonds: T[],
  ponds: EnterpriseCyclePondRecord[] = [],
): T[] => {
  const cycleBlockIds = new Set(getEnterpriseCycleBlockIds(cycle, ponds));
  if (Array.isArray(cycle.plannedPondIds)) {
    const plannedPondIds = new Set(cycle.plannedPondIds);
    return physicalPonds.filter((pond) => plannedPondIds.has(pond.id)
      && (cycleBlockIds.size === 0 || Boolean(pond.blockId && cycleBlockIds.has(pond.blockId))));
  }
  if (cycleBlockIds.size > 0) {
    return physicalPonds.filter((pond) => Boolean(pond.blockId && cycleBlockIds.has(pond.blockId)));
  }

  return [];
};

const isRunForPhysicalPond = (
  run: EnterpriseCyclePondRecord,
  pond: EnterprisePhysicalPondRecord,
): boolean => run.physicalPondId === pond.id
  || run.previousCyclePondId === pond.id
  || pond.activePondId === run.id
  || Boolean(run.pondName && pond.pondName
    && run.pondName.trim().toLowerCase() === pond.pondName.trim().toLowerCase()
    && (run.blockId || null) === (pond.blockId || null));

const isPhysicalPondIdle = (
  pond: EnterprisePhysicalPondRecord,
  ponds: EnterpriseCyclePondRecord[],
): boolean => pond.status !== 'active' && !pond.activePondId
  && !ponds.some((run) => run.cycleStatus !== 'ended' && isRunForPhysicalPond(run, pond));

// A completed run is history, not a reservation for another run in the same cycle.
export const getEnterpriseCycleUnstartedPonds = <T extends EnterprisePhysicalPondRecord>(
  cycle: EnterpriseCycleRecord,
  physicalPonds: T[],
  ponds: EnterpriseCyclePondRecord[] = [],
): T[] => getEnterpriseCyclePlannedPonds(cycle, physicalPonds, ponds).filter((pond) => (
  isPhysicalPondIdle(pond, ponds)
  && !ponds.some((run) => run.cycleId === cycle.id && isRunForPhysicalPond(run, pond))
));

export const getEnterpriseBlockStockingCycle = <T extends EnterpriseCycleRecord>(
  blockId: string,
  cycles: T[],
  physicalPonds: EnterprisePhysicalPondRecord[],
  ponds: EnterpriseCyclePondRecord[] = [],
): T | undefined => {
  const candidates = cycles.filter((cycle) => isEnterpriseCycleOpen(cycle)
    && getEnterpriseCycleUnstartedPonds(cycle, physicalPonds, ponds).some((pond) => pond.blockId === blockId));
  // Never choose an arbitrary cycle when legacy plans overlap.
  return candidates.length === 1 ? candidates[0] : undefined;
};

export const getEnterpriseCycleAvailableBlocks = <T extends { id: string }>(
  blocks: T[],
  openCycles: EnterpriseCycleRecord[],
  ponds: EnterpriseCyclePondRecord[] = [],
  physicalPonds?: EnterprisePhysicalPondRecord[],
): T[] => {
  if (physicalPonds) {
    const available = getEnterpriseUnassignedInactivePonds(physicalPonds, openCycles, ponds);
    return blocks.filter((block) => available.some((pond) => pond.blockId === block.id));
  }
  const reservedBlockIds = new Set(openCycles.flatMap((cycle) => getEnterpriseCycleBlockIds(cycle, ponds)));
  return blocks.filter((block) => !reservedBlockIds.has(block.id));
};

export const getEnterpriseUnassignedInactivePonds = <T extends EnterprisePhysicalPondRecord>(
  physicalPonds: T[],
  cycles: EnterpriseCycleRecord[],
  ponds: EnterpriseCyclePondRecord[] = [],
): T[] => {
  const reservedPondIds = new Set(
    cycles
      .filter(isEnterpriseCycleOpen)
      .flatMap((cycle) => getEnterpriseCycleUnstartedPonds(cycle, physicalPonds, ponds).map((pond) => pond.id)),
  );

  return physicalPonds.filter((pond) => (
    isPhysicalPondIdle(pond, ponds)
    && !reservedPondIds.has(pond.id)
  ));
};

export const getEnterpriseCycleAvailablePonds = <T extends EnterprisePhysicalPondRecord>(
  blockId: string,
  physicalPonds: T[],
  openCycles: EnterpriseCycleRecord[],
  ponds: EnterpriseCyclePondRecord[] = [],
): T[] => {
  return getEnterpriseUnassignedInactivePonds(physicalPonds, openCycles, ponds)
    .filter((pond) => pond.blockId === blockId);
};

export const summarizeEnterpriseCycle = (
  cycle: EnterpriseCycleRecord,
  ponds: EnterpriseCyclePondRecord[],
  physicalPonds: EnterprisePhysicalPondRecord[],
): EnterpriseCycleSummary => {
  const cyclePonds = getEnterpriseCyclePonds(cycle.id, ponds);
  const plannedPonds = getEnterpriseCyclePlannedPonds(cycle, physicalPonds, ponds);
  const startedPhysicalPondIds = new Set(cyclePonds.flatMap((pond) => {
    if (pond.previousCyclePondId) return [pond.previousCyclePondId];
    const physicalPond = physicalPonds.find((candidate) => candidate.activePondId === pond.id);
    return physicalPond ? [physicalPond.id] : [];
  }));
  const activeCount = cyclePonds.filter((pond) => pond.cycleStatus !== 'ended').length;
  const endedCount = cyclePonds.length - activeCount;
  const plannedCount = Math.max(plannedPonds.length, cyclePonds.length);
  const startedCount = Math.max(startedPhysicalPondIds.size, cyclePonds.length);
  const stockingDates = cyclePonds
    .map((pond) => pond.cycleStartedAt || pond.docStart || '')
    .filter(Boolean)
    .sort();

  let status = cycle.status;
  if (cycle.status !== 'closed' && cycle.status !== 'closing') {
    if (startedCount === 0) status = 'planning';
    else if (plannedCount > startedCount) status = 'stocking';
    else status = 'active';
  }

  return {
    plannedCount,
    startedCount,
    activeCount,
    endedCount,
    status,
    stockingStartDate: cycle.stockingStartDate || stockingDates[0] || cycle.plannedStartDate,
    stockingEndDate: cycle.stockingEndDate || stockingDates[stockingDates.length - 1],
  };
};
