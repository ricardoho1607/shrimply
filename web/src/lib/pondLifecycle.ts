export interface LifecyclePond {
  cycleId?: string;
  cycleStatus?: 'active' | 'ended';
}

export interface LifecycleCycle {
  id: string;
  status?: 'planning' | 'stocking' | 'active' | 'closing' | 'closed' | string;
}

export const isOpenFarmCycle = (cycle: LifecycleCycle): boolean =>
  ['planning', 'stocking', 'active'].includes(cycle.status || '');

export const isActivePondCycle = (pond: LifecyclePond): boolean =>
  pond.cycleStatus !== 'ended';

export const getActiveFarmCycle = <TCycle extends LifecycleCycle>(cycles: TCycle[]): TCycle | undefined =>
  cycles.find(isOpenFarmCycle);

export const filterActiveCyclePonds = <TPond extends LifecyclePond, TCycle extends LifecycleCycle>(
  ponds: TPond[],
  cycles: TCycle[]
): TPond[] => {
  const activeCycle = getActiveFarmCycle(cycles);
  const activePonds = ponds.filter(isActivePondCycle);

  if (!activeCycle) return activePonds;

  return activePonds.filter((pond) => pond.cycleId === activeCycle.id || !pond.cycleId);
};
