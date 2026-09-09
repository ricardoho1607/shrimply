interface ReportPond {
  id: string;
  cycleId?: string;
  cycleStatus?: string;
}

interface ReportCycle {
  id: string;
  status?: string;
}

export function filterSamplingReportPonds<T extends ReportPond>(
  ponds: T[], cycles: ReportCycle[], scope: string,
): T[] {
  if (scope === 'all') return ponds;
  if (scope !== 'active') return ponds.filter(pond => pond.cycleId === scope);
  const endedCycleIds = new Set(cycles
    .filter(cycle => cycle.status === 'closing' || cycle.status === 'closed')
    .map(cycle => cycle.id));
  return ponds.filter(pond => pond.cycleStatus !== 'ended'
    && !endedCycleIds.has(pond.cycleId || ''));
}
