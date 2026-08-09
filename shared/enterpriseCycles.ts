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
  blockId?: string | null;
  cycleId?: string | null;
  cycleStatus?: 'active' | 'ended';
  previousCyclePondId?: string | null;
  docStart?: string | null;
  cycleStartedAt?: string | null;
}

export interface EnterprisePhysicalPondRecord {
  id: string;
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

export const getEnterpriseCyclePlannedPonds = <T extends EnterprisePhysicalPondRecord>(
  cycle: Pick<EnterpriseCycleRecord, 'id' | 'plannedPondIds' | 'blockIds' | 'blockId'>,
  physicalPonds: T[],
  ponds: EnterpriseCyclePondRecord[] = [],
): T[] => {
  const cycleBlockIds = new Set(getEnterpriseCycleBlockIds(cycle, ponds));
  if (cycleBlockIds.size > 0) {
    return physicalPonds.filter((pond) => Boolean(pond.blockId && cycleBlockIds.has(pond.blockId)));
  }

  const plannedPondIds = new Set(cycle.plannedPondIds || []);
  if (plannedPondIds.size === 0) return [];
  return physicalPonds.filter((pond) => (
    plannedPondIds.has(pond.id)
    && (cycleBlockIds.size === 0 || Boolean(pond.blockId && cycleBlockIds.has(pond.blockId)))
  ));
};

export const getEnterpriseCycleAvailableBlocks = <T extends { id: string }>(
  blocks: T[],
  openCycles: EnterpriseCycleRecord[],
  ponds: EnterpriseCyclePondRecord[] = [],
): T[] => {
  const reservedBlockIds = new Set(openCycles.flatMap((cycle) => getEnterpriseCycleBlockIds(cycle, ponds)));
  return blocks.filter((block) => !reservedBlockIds.has(block.id));
};

export const getEnterpriseUnassignedInactivePonds = <T extends EnterprisePhysicalPondRecord>(
  physicalPonds: T[],
  cycles: EnterpriseCycleRecord[],
  ponds: EnterpriseCyclePondRecord[] = [],
): T[] => {
  const reservedBlockIds = new Set(
    cycles
      .filter(isEnterpriseCycleOpen)
      .flatMap((cycle) => getEnterpriseCycleBlockIds(cycle, ponds)),
  );

  return physicalPonds.filter((pond) => (
    pond.status !== 'active'
    && !pond.activePondId
    && (!pond.blockId || !reservedBlockIds.has(pond.blockId))
  ));
};

export const getEnterpriseCycleAvailablePonds = <T extends EnterprisePhysicalPondRecord>(
  blockId: string,
  physicalPonds: T[],
  openCycles: EnterpriseCycleRecord[],
): T[] => {
  const reservedPondIds = new Set(
    openCycles.flatMap((cycle) => cycle.plannedPondIds || []),
  );

  return physicalPonds.filter((pond) => (
    pond.blockId === blockId
    && pond.status !== 'active'
    && !pond.activePondId
    && !reservedPondIds.has(pond.id)
  ));
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
