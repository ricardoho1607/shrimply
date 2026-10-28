/** Open cycles become reportable once any of their own pond runs has ended. */
export const getReportableCycles = <T extends { id: string; status: string }>(
  cycles: T[],
  ponds: { cycleId?: string; cycleStatus?: string }[],
): T[] => {
  const endedCycleIds = new Set(ponds.filter(pond => pond.cycleStatus === 'ended').map(pond => pond.cycleId));
  return cycles.filter(cycle => cycle.status === 'closed' || endedCycleIds.has(cycle.id));
};
