import { create } from "zustand";

// Function to get FR percentage based on MBW value
const getFRFromMBW = (mbw: number): number | null => {
  const frTable: { mbw: number; fr: number | null }[] = [
    { mbw: 0.01, fr: null }, { mbw: 0.65, fr: null }, { mbw: 1.65, fr: 6.50 }, { mbw: 3.00, fr: 6.50 }, { mbw: 5.00, fr: 5.50 }, { mbw: 7.50, fr: 4.20 },
    { mbw: 10.50, fr: 3.60 }, { mbw: 14.00, fr: 3.30 }, { mbw: 17.50, fr: 3.10 }, { mbw: 21.00, fr: 2.90 }, { mbw: 25.00, fr: 2.70 }, { mbw: 29.00, fr: 2.50 }, { mbw: 33.00, fr: 2.30 }
  ];

  if (mbw > 33.00) return 2.10;

  for (let i = 0; i < frTable.length - 1; i++) {
    const current = frTable[i];
    const next = frTable[i + 1];
    
    if (current.fr === null) continue;
    if (mbw <= current.mbw) return current.fr;
    
    if (mbw >= current.mbw && mbw <= next.mbw && next.fr !== null && current.fr !== null) {
      const ratio = (mbw - current.mbw) / (next.mbw - current.mbw);
      return current.fr + ratio * (next.fr - current.fr);
    }
  }
  
  return frTable[frTable.length - 1].fr;
};

// Function to calculate population based on new formula using sampling feed data
const calculatePopulationFromSampling = (sampling: Sampling): number => {
  const { mbw } = sampling;
  const feedAmount = getSamplingFeedAmount(sampling);
  const frPercentage = getFRFromMBW(mbw);
  
  if (feedAmount === 0 || mbw === 0 || frPercentage === null || frPercentage === 0) return 0;
  
  return Math.round(((feedAmount / frPercentage) / mbw) * 100000);
};

export interface FeedData { 
  ancoPercentage: string; 
  totalDailyFeed: string; 
  inventoryFeedId?: string | null;
  cycleId?: string;
  cycleName?: string;
  pondCycleId?: string;
  feed1?: string; feed2?: string; feed3?: string; feed4?: string; feed5?: string; 
  anco1?: string; anco2?: string; anco3?: string; anco4?: string; anco5?: string;
  anco6?: string; anco7?: string; anco8?: string; anco9?: string; anco10?: string;
}
export interface HarvestData { biomass: string; size: string; pricePerKg: string; subBiomass: string; subSize: string; subPricePerKg: string; cycleId?: string; cycleName?: string; pondCycleId?: string; }
export interface HarvestRecord { id: string; date: string; cycleId?: string; cycleName?: string; ponds: { pondId: string; pondName: string; cycleId?: string; cycleName?: string; pondCycleId?: string; biomass: string; size: string; price: string; subBiomass: string; subSize: string; subPrice: string; }[]; }

export type PondCycleStatus = 'active' | 'ended';
export type PondCycleEndReason = 'harvested' | 'disease' | 'reset' | 'other';
export type FarmCycleStatus = 'planning' | 'stocking' | 'active' | 'closing' | 'closed';

export interface FarmCycle {
  id: string;
  cycleName: string;
  status: FarmCycleStatus;
  plannedStartDate?: string;
  stockingStartDate?: string;
  stockingEndDate?: string;
  closedAt?: string;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
  updatedBy?: string;
}

export interface Sampling {
  id: string; date: string; mbw: number; mortality: number; feed: number;
  cycleId?: string; cycleName?: string; pondCycleId?: string;
  isBaselineEstimate?: boolean; source?: 'midcycle_onboarding' | string;
  estimatedPopulation?: number; estimatedSurvivalRate?: number; cumulativeFeedToDate?: number;
  phMorning?: string; phEvening?: string; doMorning?: string; doEvening?: string; transparency?: string; salinity?: string;
  feedData?: FeedData; harvestData?: HarvestData;
}

export type CycleStartMode = 'new' | 'midcycle';

export interface Pond {
  id: string; pondName: string; pondArea: number; density: number; initialPopulation: number; docStart: string; supplier: string; plSupplier?: string; initialWeight: number; samplings: Sampling[];
  totalHarvestedBiomass?: number; totalHarvestedPopulation?: number; totalHarvestedFeed?: number;
  cycleId?: string; cycleName?: string; pondCycleId?: string;
  cycleStatus?: PondCycleStatus; cycleStartedAt?: string; cycleEndedAt?: string; cycleEndedBy?: string; cycleEndReason?: PondCycleEndReason; previousCyclePondId?: string;
  cycleStartMode?: CycleStartMode;
  baselineDate?: string;
  baselineDoc?: number;
  baselineMbw?: number;
  baselineEstimatedPopulation?: number;
  baselineSurvivalRate?: number;
  baselineCumulativeFeed?: number;
  baselineSource?: 'user_midcycle_estimate' | string;
}

export const getPondCycleStatus = (pond: Pick<Pond, 'cycleStatus'>): PondCycleStatus => pond.cycleStatus === 'ended' ? 'ended' : 'active';
export const isPondCycleActive = (pond: Pick<Pond, 'cycleStatus'>): boolean => getPondCycleStatus(pond) === 'active';
export const getPondPlSupplier = (pond: Pick<Pond, 'plSupplier' | 'supplier'>): string => pond.plSupplier || pond.supplier || 'N/A';
export const isFarmCycleOpen = (cycle: Pick<FarmCycle, 'status'>): boolean => ['planning', 'stocking', 'active'].includes(cycle.status);
export const getActiveFarmCycle = (cycles: FarmCycle[]): FarmCycle | undefined => cycles.find(isFarmCycleOpen);
export const getPhysicalPondKey = (pondName: string): string => pondName.trim().toLowerCase();
const toFiniteNumber = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
export const isBaselineSampling = (sampling: Pick<Sampling, 'isBaselineEstimate' | 'source'>): boolean =>
  Boolean(sampling.isBaselineEstimate) || sampling.source === 'midcycle_onboarding';
export const getSamplingFeedAmount = (sampling: Pick<Sampling, 'feed' | 'feedData'>): number => {
  const samplingFeed = toFiniteNumber(sampling.feed);
  if (samplingFeed > 0) return samplingFeed;
  return toFiniteNumber(sampling.feedData?.totalDailyFeed);
};
export const getPondBaselineFeed = (pond: Pick<Pond, 'baselineCumulativeFeed' | 'samplings'>): number => {
  const pondLevelFeed = toFiniteNumber(pond.baselineCumulativeFeed);
  if (pondLevelFeed > 0) return pondLevelFeed;

  return (pond.samplings || [])
    .filter(isBaselineSampling)
    .reduce((maxFeed, sampling) => Math.max(maxFeed, toFiniteNumber(sampling.cumulativeFeedToDate) || getSamplingFeedAmount(sampling)), 0);
};
export const getPondOperationalFeed = (pond: Pick<Pond, 'samplings'>): number => {
  const operationalSamplings = (pond.samplings || []).filter((sampling) => !isBaselineSampling(sampling));
  const feedManagementFeed = operationalSamplings
    .filter((sampling) => sampling.feedData)
    .reduce((total, sampling) => total + getSamplingFeedAmount(sampling), 0);
  const samplingFeed = operationalSamplings
    .filter((sampling) => Number(sampling.mbw) > 0 || Number(sampling.mortality) > 0 || Number(sampling.feed) > 0)
    .reduce((total, sampling) => total + toFiniteNumber(sampling.feed), 0);

  return feedManagementFeed > 0 ? feedManagementFeed : samplingFeed;
};
export const getPondTotalFeedConsumed = (pond: Pick<Pond, 'baselineCumulativeFeed' | 'samplings'>): number =>
  getPondBaselineFeed(pond) + getPondOperationalFeed(pond);
export const getPondBaselinePopulation = (pond: Pick<Pond, 'initialPopulation' | 'baselineEstimatedPopulation' | 'baselineSurvivalRate' | 'samplings'>): number | null => {
  const estimatedPopulation = toFiniteNumber(pond.baselineEstimatedPopulation);
  if (estimatedPopulation > 0) return estimatedPopulation;

  const survivalRate = toFiniteNumber(pond.baselineSurvivalRate);
  if (survivalRate > 0 && pond.initialPopulation > 0) return Math.round((pond.initialPopulation * survivalRate) / 100);

  const baselineSampling = (pond.samplings || []).find(isBaselineSampling);
  const samplingPopulation = toFiniteNumber(baselineSampling?.estimatedPopulation);
  if (samplingPopulation > 0) return samplingPopulation;

  const samplingSurvival = toFiniteNumber(baselineSampling?.estimatedSurvivalRate);
  if (samplingSurvival > 0 && pond.initialPopulation > 0) return Math.round((pond.initialPopulation * samplingSurvival) / 100);

  return null;
};
export const getPondCurrentDoc = (pond: Pick<Pond, 'docStart' | 'baselineDate' | 'baselineDoc'>): number => {
  const docFromStart = Math.floor((Date.now() - new Date(pond.docStart).getTime()) / (1000 * 60 * 60 * 24));
  const baselineDoc = toFiniteNumber(pond.baselineDoc);
  const baselineDate = pond.baselineDate ? new Date(pond.baselineDate) : null;

  if (baselineDoc > 0 && baselineDate && !Number.isNaN(baselineDate.getTime())) {
    const daysSinceBaseline = Math.floor((Date.now() - baselineDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, Math.floor(baselineDoc + Math.max(0, daysSinceBaseline)));
  }

  return Math.max(0, Number.isFinite(docFromStart) ? docFromStart : 0);
};
export const buildDefaultFarmCycle = (existingCycles: FarmCycle[] = []): FarmCycle => {
  const now = Date.now();
  return {
    id: `cycle-${now}`,
    cycleName: `Cycle ${existingCycles.length + 1}`,
    status: 'stocking',
    plannedStartDate: new Date(now).toISOString().split('T')[0],
    stockingStartDate: new Date(now).toISOString().split('T')[0],
  };
};
export const normalizePondLifecycle = (pond: Pond): Pond => ({
  ...pond,
  supplier: pond.supplier || pond.plSupplier || '',
  plSupplier: pond.plSupplier || pond.supplier || '',
  pondCycleId: pond.pondCycleId || pond.id,
  cycleStatus: getPondCycleStatus(pond),
  cycleStartedAt: pond.cycleStartedAt || pond.docStart,
  cycleStartMode: pond.cycleStartMode || 'new',
});

interface PondStore {
  ponds: Pond[]; cycles: FarmCycle[]; harvestRecords: HarvestRecord[]; currentCompanyId?: string; isBackingUp: boolean; isRestoring: boolean; lastBackupTime?: number;
  firebaseSync?: { syncPond: (action: 'create' | 'update' | 'delete', pond: Pond) => void; syncSampling: (action: 'create' | 'update' | 'delete', pondId: string, sampling: Sampling, samplingId?: string) => void; syncHarvestRecord: (action: 'create' | 'delete', harvestRecord: HarvestRecord) => void; syncCycle?: (action: 'create' | 'update' | 'delete', cycle: FarmCycle) => void; };
  
  addFarmCycle: (cycle?: Partial<FarmCycle>) => FarmCycle;
  updateFarmCycle: (cycleId: string, updates: Partial<FarmCycle>) => void;
  closeFarmCycle: (cycleId: string, closedAt: string) => void;
  addPond: (pond: Pond) => void; deletePond: (pondId: string) => void; endPondCycle: (pondId: string, endedAt: string, reason: PondCycleEndReason, endedBy?: string) => void; addSampling: (pondId: string, sampling: Sampling) => void; updateSampling: (pondId: string, samplingId: string, updates: Partial<Sampling>) => void; deleteSampling: (pondId: string, samplingId: string) => void;
  addHarvestRecord: (record: HarvestRecord) => void; removeHarvestRecord: (harvestId: string) => void; processHarvestImpact: (record: HarvestRecord) => void; reverseHarvestImpact: (record: HarvestRecord) => void;
  
  addWaterQuality: (pondId: string, record: { phMorning: string; phEvening: string; doMorning: string; doEvening: string; transparency: string; salinity: string; }) => void;
  addFeedData: (pondId: string, record: FeedData) => void;
  addHarvestData: (pondId: string, record: HarvestData) => void;
  
  getPondById: (pondId: string) => Pond | undefined; getPondSamplingData: (pondName: string) => Sampling[]; getSamplingDataFlat: () => (Sampling & { pondName: string })[];
  
  calculatePondMetricsWithHarvest: (pond: Pond) => { currentBiomass: number; currentPopulation: number; adjustedSR: number; totalFeedConsumed: number; adjustedFCR: number; };
  
  switchAccount: (companyId: string) => void; clearData: () => void; setFirebaseSync: (sync: PondStore['firebaseSync']) => void;
  backupToFirebase: (userId: string) => Promise<void>; restoreFromFirebase: (userId: string) => Promise<void>;
}

export const usePondStore = create<PondStore>()(
    (set, get) => ({
      ponds: [], cycles: [], harvestRecords: [], currentCompanyId: undefined, isBackingUp: false, isRestoring: false, lastBackupTime: undefined, firebaseSync: undefined,
      
      setFirebaseSync: (sync) => set({ firebaseSync: sync }),
      
      switchAccount: (companyId: string) => {
        const state = get();
        if (state.currentCompanyId !== companyId) {
          console.log(`Switching account from ${state.currentCompanyId} to ${companyId}`);
          set({ ponds: [], cycles: [], harvestRecords: [], currentCompanyId: companyId });
        }
      },
      
      clearData: () => set({ ponds: [], cycles: [], harvestRecords: [], currentCompanyId: undefined }),
      
      backupToFirebase: async (userId: string) => { console.log('Legacy backupToFirebase called - real-time sync handles this now'); return Promise.resolve(); },
      restoreFromFirebase: async (userId: string) => { console.log('Legacy restoreFromFirebase called - real-time sync handles this now'); return Promise.resolve(); },
      
      addFarmCycle: (cycle) => {
        const state = get();
        const newCycle: FarmCycle = {
          ...buildDefaultFarmCycle(state.cycles),
          ...cycle,
        };
        set((state) => ({ cycles: [...state.cycles, newCycle] }));
        state.firebaseSync?.syncCycle?.('create', newCycle);
        return newCycle;
      },

      updateFarmCycle: (cycleId, updates) => {
        const state = get();
        const existingCycle = state.cycles.find((cycle) => cycle.id === cycleId);
        if (!existingCycle) return;

        const updatedCycle: FarmCycle = {
          ...existingCycle,
          ...updates,
        };

        set((state) => ({
          cycles: state.cycles.map((cycle) => cycle.id === cycleId ? updatedCycle : cycle),
          ponds: updates.cycleName
            ? state.ponds.map((pond) => pond.cycleId === cycleId ? { ...pond, cycleName: updates.cycleName } : pond)
            : state.ponds,
          harvestRecords: updates.cycleName
            ? state.harvestRecords.map((record) => record.cycleId === cycleId ? { ...record, cycleName: updates.cycleName } : record)
            : state.harvestRecords,
        }));
        state.firebaseSync?.syncCycle?.('update', updatedCycle);
        if (updates.cycleName) {
          state.ponds
            .filter((pond) => pond.cycleId === cycleId)
            .forEach((pond) => state.firebaseSync?.syncPond('update', { ...pond, cycleName: updates.cycleName }));
        }
      },

      closeFarmCycle: (cycleId, closedAt) => {
        const state = get();
        const cycleToClose = state.cycles.find((cycle) => cycle.id === cycleId);
        const cyclePonds = state.ponds.filter((pond) =>
          pond.cycleId === cycleId ||
          (cycleId === 'legacy-active-cycle' && !pond.cycleId)
        );
        if (!cycleToClose && cyclePonds.length === 0) return;

        const fallbackCycle: FarmCycle = {
          id: cycleId,
          cycleName: cyclePonds[0]?.cycleName || 'Current Cycle',
          status: 'active',
          plannedStartDate: cyclePonds[0]?.cycleStartedAt || cyclePonds[0]?.docStart || closedAt,
          stockingStartDate: cyclePonds
            .map((pond) => pond.cycleStartedAt || pond.docStart)
            .filter(Boolean)
            .sort()[0] || closedAt,
        };
        const sourceCycle = cycleToClose || fallbackCycle;

        const closedCycle: FarmCycle = {
          ...sourceCycle,
          status: 'closed',
          closedAt,
          stockingEndDate: sourceCycle.stockingEndDate || closedAt,
        };

        const activeCycle = getActiveFarmCycle(state.cycles);
        const endedPonds = state.ponds
          .filter((pond) =>
            isPondCycleActive(pond) &&
            (pond.cycleId === cycleId || !pond.cycleId || activeCycle?.id === cycleId)
          )
          .map((pond) => normalizePondLifecycle({
            ...pond,
            cycleId: pond.cycleId || cycleId,
            cycleName: pond.cycleName || sourceCycle.cycleName,
            cycleStatus: 'ended',
            cycleEndedAt: closedAt,
            cycleEndReason: pond.cycleEndReason || 'harvested',
          }));

        set((state) => ({
          cycles: cycleToClose
            ? state.cycles.map((cycle) => cycle.id === cycleId ? closedCycle : cycle)
            : [...state.cycles, closedCycle],
          ponds: state.ponds.map((pond) => endedPonds.find((endedPond) => endedPond.id === pond.id) || pond),
        }));
        state.firebaseSync?.syncCycle?.('update', closedCycle);
        endedPonds.forEach((pond) => state.firebaseSync?.syncPond('update', pond));
      },

      addPond: (pond) => {
        const state = get();
        const pondKey = getPhysicalPondKey(pond.pondName);
        const activeDuplicate = state.ponds.find((existingPond) =>
          existingPond.id !== pond.id &&
          isPondCycleActive(existingPond) &&
          getPhysicalPondKey(existingPond.pondName) === pondKey
        );

        if (activeDuplicate) {
          console.warn(`Skipped starting ${pond.pondName}: this physical pond already has an active cycle.`);
          return;
        }

        let cycle = pond.cycleId ? state.cycles.find((item) => item.id === pond.cycleId) : getActiveFarmCycle(state.cycles);
        if (!cycle) {
          cycle = {
            ...buildDefaultFarmCycle(state.cycles),
            stockingStartDate: pond.docStart,
            plannedStartDate: pond.docStart,
          };
          set((current) => ({ cycles: [...current.cycles, cycle!] }));
          state.firebaseSync?.syncCycle?.('create', cycle);
        }
        const newPond = normalizePondLifecycle({
          ...pond,
          cycleId: pond.cycleId || cycle.id,
          cycleName: pond.cycleName || cycle.cycleName,
          pondCycleId: pond.pondCycleId || pond.id,
          supplier: pond.plSupplier || pond.supplier,
          plSupplier: pond.plSupplier || pond.supplier,
          totalHarvestedBiomass: 0,
          totalHarvestedPopulation: 0,
          totalHarvestedFeed: 0,
          cycleStatus: 'active',
          cycleStartedAt: pond.cycleStartedAt || pond.docStart,
          cycleEndedAt: undefined,
          cycleEndedBy: undefined,
          cycleEndReason: undefined,
        });
        set((state) => ({ ponds: [...state.ponds, newPond] }));
        get().firebaseSync?.syncPond('create', newPond);
      },

      deletePond: (pondId) => {
        const state = get();
        const pondToDelete = state.ponds.find(p => p.id === pondId);
        set((state) => ({ ponds: state.ponds.filter((pond) => pond.id !== pondId) }));
        if (pondToDelete) state.firebaseSync?.syncPond('delete', pondToDelete);
      },

      endPondCycle: (pondId, endedAt, reason, endedBy) => {
        const state = get();
        const pondToEnd = state.ponds.find(p => p.id === pondId);
        if (!pondToEnd) return;
        const activeCycle = getActiveFarmCycle(state.cycles);

        const endedPond = normalizePondLifecycle({
          ...pondToEnd,
          cycleId: pondToEnd.cycleId || activeCycle?.id,
          cycleName: pondToEnd.cycleName || activeCycle?.cycleName,
          cycleStatus: 'ended',
          cycleEndedAt: endedAt,
          cycleEndedBy: endedBy,
          cycleEndReason: reason,
        });

        set((state) => ({
          ponds: state.ponds.map((pond) => pond.id === pondId ? endedPond : pond)
        }));
        state.firebaseSync?.syncPond('update', endedPond);
      },

      addHarvestRecord: (record) => {
        const ponds = get().ponds;
        const firstPond = ponds.find((pond) => record.ponds.some((item) => item.pondId === pond.id));
        const recordWithCycle: HarvestRecord = {
          ...record,
          cycleId: record.cycleId || firstPond?.cycleId,
          cycleName: record.cycleName || firstPond?.cycleName,
          ponds: record.ponds.map((harvestPond) => {
            const pond = ponds.find((item) => item.id === harvestPond.pondId);
            return {
              ...harvestPond,
              cycleId: harvestPond.cycleId || pond?.cycleId,
              cycleName: harvestPond.cycleName || pond?.cycleName,
              pondCycleId: harvestPond.pondCycleId || pond?.pondCycleId || pond?.id,
            };
          }),
        };
        set((state) => ({ harvestRecords: [recordWithCycle, ...state.harvestRecords] }));
        get().firebaseSync?.syncHarvestRecord('create', recordWithCycle);
      },

      removeHarvestRecord: (harvestId) => {
        const state = get();
        const harvestRecord = state.harvestRecords.find(r => r.id === harvestId);
        if (harvestRecord) {
          get().reverseHarvestImpact(harvestRecord);
          state.firebaseSync?.syncHarvestRecord('delete', harvestRecord);
        }
        set((state) => ({ harvestRecords: state.harvestRecords.filter(r => r.id !== harvestId) }));
      },

      processHarvestImpact: (record) => {
        const updatedPonds: Pond[] = [];
        set((state) => ({
          ponds: state.ponds.map((pond) => {
            const harvestForPond = record.ponds.find(p => p.pondId === pond.id);
            if (!harvestForPond) return pond;

            const mainBiomass = parseFloat(harvestForPond.biomass) || 0;
            const subBiomass = parseFloat(harvestForPond.subBiomass) || 0;
            const totalHarvestedBiomass = mainBiomass + subBiomass;

            const mainSize = parseFloat(harvestForPond.size) || 0;
            const subSize = parseFloat(harvestForPond.subSize) || 0;
            
            let harvestedPopulation = 0;
            if (mainSize > 0) harvestedPopulation += mainBiomass * mainSize;
            if (subSize > 0) harvestedPopulation += subBiomass * subSize;

            const updatedPond = {
              ...pond,
              totalHarvestedBiomass: (pond.totalHarvestedBiomass || 0) + totalHarvestedBiomass,
              totalHarvestedPopulation: Math.min(
                pond.initialPopulation,
                (pond.totalHarvestedPopulation || 0) + harvestedPopulation
              ),
            };
            updatedPonds.push(updatedPond);
            return updatedPond;
          })
        }));
        updatedPonds.forEach((pond) => get().firebaseSync?.syncPond('update', pond));
      },

      reverseHarvestImpact: (record) => {
        const updatedPonds: Pond[] = [];
        set((state) => ({
          ponds: state.ponds.map((pond) => {
            const harvestForPond = record.ponds.find(p => p.pondId === pond.id);
            if (!harvestForPond) return pond;

            const mainBiomass = parseFloat(harvestForPond.biomass) || 0;
            const subBiomass = parseFloat(harvestForPond.subBiomass) || 0;
            const totalHarvestedBiomass = mainBiomass + subBiomass;

            const mainSize = parseFloat(harvestForPond.size) || 0;
            const subSize = parseFloat(harvestForPond.subSize) || 0;
            
            let harvestedPopulation = 0;
            if (mainSize > 0) harvestedPopulation += mainBiomass * mainSize;
            if (subSize > 0) harvestedPopulation += subBiomass * subSize;

            const updatedPond = {
              ...pond,
              totalHarvestedBiomass: Math.max(0, (pond.totalHarvestedBiomass || 0) - totalHarvestedBiomass),
              totalHarvestedPopulation: Math.max(0, (pond.totalHarvestedPopulation || 0) - harvestedPopulation),
            };
            updatedPonds.push(updatedPond);
            return updatedPond;
          })
        }));
        updatedPonds.forEach((pond) => get().firebaseSync?.syncPond('update', pond));
      },

      calculatePondMetricsWithHarvest: (pond) => {
  const samplings = pond.samplings || [];
  const validSamplings = samplings.filter(s => s.mbw > 0 || s.mortality > 0 || s.feed > 0);
  const baselinePopulation = getPondBaselinePopulation(pond);
  
  if (validSamplings.length === 0) {
    return {
      currentBiomass: ((baselinePopulation || pond.initialPopulation) * (pond.initialWeight || 0.5)) / 1000,
      currentPopulation: baselinePopulation || pond.initialPopulation,
      adjustedSR: pond.initialPopulation > 0 ? ((baselinePopulation || pond.initialPopulation) / pond.initialPopulation) * 100 : 0,
      totalFeedConsumed: getPondBaselineFeed(pond),
      adjustedFCR: 0,
    };
  }

  const sortedSamplings = validSamplings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const latestSampling = sortedSamplings[sortedSamplings.length - 1];

  let currentPopulation = pond.initialPopulation;
  
  const latestValidSampling = sortedSamplings.filter(s => !isBaselineSampling(s) && s.mbw > 0 && getSamplingFeedAmount(s) > 0).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  if (baselinePopulation !== null) {
    const baselineTime = pond.baselineDate ? new Date(pond.baselineDate).getTime() : 0;
    const postBaselineMortality = sortedSamplings
      .filter((sampling) => !isBaselineSampling(sampling) && (!baselineTime || new Date(sampling.date).getTime() >= baselineTime))
      .reduce((sum, sampling) => sum + (sampling.mortality || 0), 0);
    currentPopulation = Math.max(0, baselinePopulation - postBaselineMortality);
  } else if (latestValidSampling) {
    currentPopulation = calculatePopulationFromSampling(latestValidSampling);
  } else {
    const totalMortality = sortedSamplings.filter(s => !isBaselineSampling(s) && s.mortality > 0).reduce((sum, s) => sum + s.mortality, 0);
    currentPopulation = Math.max(0, pond.initialPopulation - totalMortality);
  }

  currentPopulation = Math.max(0, currentPopulation - (pond.totalHarvestedPopulation || 0));

  let currentBiomass = 0;
  if (latestSampling && latestSampling.mbw > 0) {
    currentBiomass = Math.max(0, (currentPopulation * latestSampling.mbw) / 1000);
  }

  const totalFeedConsumed = getPondTotalFeedConsumed(pond);
  
  const adjustedSR = pond.initialPopulation > 0 ? (currentPopulation / pond.initialPopulation) * 100 : 0;

  const producedBiomass = currentBiomass + (pond.totalHarvestedBiomass || 0);
  const adjustedFCR = producedBiomass > 0 ? totalFeedConsumed / producedBiomass : 0;

  return {
    currentBiomass: Math.max(0, currentBiomass),
    currentPopulation: Math.max(0, currentPopulation),
    adjustedSR: Math.max(0, adjustedSR),
    totalFeedConsumed: Math.max(0, totalFeedConsumed),
    adjustedFCR: Math.max(0, adjustedFCR),
  };
},
      addSampling: (pondId, sampling) => {
        const pond = get().ponds.find((item) => item.id === pondId);
        const samplingWithId = {
          ...sampling,
          id: sampling.id || Date.now().toString(),
          cycleId: sampling.cycleId || pond?.cycleId,
          cycleName: sampling.cycleName || pond?.cycleName,
          pondCycleId: sampling.pondCycleId || pond?.pondCycleId || pondId,
        };
        set((state) => ({ ponds: state.ponds.map((p) => p.id === pondId ? { ...p, samplings: [...p.samplings, samplingWithId] } : p) }));
        get().firebaseSync?.syncSampling('create', pondId, samplingWithId);
      },

      updateSampling: (pondId, samplingId, updates) => {
        set((state) => ({
          ponds: state.ponds.map((pond) => pond.id === pondId ? { ...pond, samplings: pond.samplings.map((sampling) => sampling.id === samplingId ? { ...sampling, ...updates } : sampling) } : pond)
        }));
        
        const state = get();
        const pond = state.ponds.find(p => p.id === pondId);
        const sampling = pond?.samplings.find(s => s.id === samplingId);
        if (sampling) state.firebaseSync?.syncSampling('update', pondId, { ...sampling, ...updates }, samplingId);
      },

      deleteSampling: (pondId, samplingId) => {
        const state = get();
        const pond = state.ponds.find(p => p.id === pondId);
        const samplingToDelete = pond?.samplings.find(s => s.id === samplingId);
        
        set((state) => ({ ponds: state.ponds.map((pond) => pond.id === pondId ? { ...pond, samplings: pond.samplings.filter((s) => s.id !== samplingId) } : pond) }));
        
        if (samplingToDelete) state.firebaseSync?.syncSampling('delete', pondId, samplingToDelete, samplingId);
      },

      addWaterQuality: (pondId, record) => {
        const today = new Date().toISOString().split('T')[0];
        
        set((state) => ({
          ponds: state.ponds.map((p) => {
            if (p.id !== pondId) return p;
            const cycleFields = { cycleId: p.cycleId, cycleName: p.cycleName, pondCycleId: p.pondCycleId || p.id };
            
            const todayWQIndex = p.samplings.findIndex(s => !isBaselineSampling(s) && s.mbw === 0 && s.feed === 0 && s.mortality === 0 && s.date === today);
            
            let updatedSamplings;
            if (todayWQIndex >= 0) {
              updatedSamplings = p.samplings.map((s, index) => index === todayWQIndex ? { ...s, ...cycleFields, phMorning: record.phMorning || s.phMorning, phEvening: record.phEvening || s.phEvening, doMorning: record.doMorning || s.doMorning, doEvening: record.doEvening || s.doEvening, transparency: record.transparency || s.transparency, salinity: record.salinity || s.salinity } : s);
            } else {
              updatedSamplings = [...p.samplings, { id: `wq-${Date.now()}`, date: today, mbw: 0, mortality: 0, feed: 0, ...cycleFields, ...record }];
            }
            
            return { ...p, samplings: updatedSamplings };
          })
        }));
        
        const state = get();
        const updatedPond = state.ponds.find(p => p.id === pondId);
        if (updatedPond) state.firebaseSync?.syncPond('update', updatedPond);
      },

      addFeedData: (pondId, record) => {
        const today = new Date().toISOString().split('T')[0];
        
        set((state) => ({
          ponds: state.ponds.map((p) => {
            if (p.id !== pondId) return p;
            const cycleFields = { cycleId: p.cycleId, cycleName: p.cycleName, pondCycleId: p.pondCycleId || p.id };
            const feedRecord = { ...record, ...cycleFields };
            
            const existingIndex = p.samplings.findIndex(s => !isBaselineSampling(s) && s.date === today);
            
            let updatedSamplings;
            if (existingIndex >= 0) {
              updatedSamplings = p.samplings.map((s, index) => 
                index === existingIndex 
                  ? { ...s, ...cycleFields, feedData: { ...(s.feedData || {}), ...feedRecord } } 
                  : s
              );
            } else {
              updatedSamplings = [...p.samplings, { id: `feed-${Date.now()}`, date: today, mbw: 0, mortality: 0, feed: 0, ...cycleFields, feedData: feedRecord }];
            }
            
            return { ...p, samplings: updatedSamplings };
          })
        }));
        
        const state = get();
        const updatedPond = state.ponds.find(p => p.id === pondId);
        if (updatedPond) state.firebaseSync?.syncPond('update', updatedPond);
      },

      addHarvestData: (pondId, record) => {
        const today = new Date().toISOString().split('T')[0];
        
        set((state) => ({
          ponds: state.ponds.map((p) => {
            if (p.id !== pondId) return p;
            const cycleFields = { cycleId: p.cycleId, cycleName: p.cycleName, pondCycleId: p.pondCycleId || p.id };
            const harvestRecord = { ...record, ...cycleFields };
            
            const todayHarvestIndex = p.samplings.findIndex(s => !isBaselineSampling(s) && s.harvestData && s.date === today);
            
            let updatedSamplings;
            if (todayHarvestIndex >= 0) {
              updatedSamplings = p.samplings.map((s, index) => index === todayHarvestIndex ? { ...s, ...cycleFields, harvestData: { ...s.harvestData, ...harvestRecord } } : s);
            } else {
              updatedSamplings = [...p.samplings, { id: `harvest-${Date.now()}`, date: today, mbw: 0, mortality: 0, feed: 0, ...cycleFields, harvestData: harvestRecord }];
            }
            
            return { ...p, samplings: updatedSamplings };
          })
        }));
        
        const state = get();
        const updatedPond = state.ponds.find(p => p.id === pondId);
        if (updatedPond) state.firebaseSync?.syncPond('update', updatedPond);
      },

      getPondById: (pondId) => get().ponds.find((p) => p.id === pondId),
      getPondSamplingData: (pondName) => { const pond = get().ponds.find((p) => p.pondName === pondName); return pond ? pond.samplings : []; },
      getSamplingDataFlat: () => get().ponds.flatMap((pond) => pond.samplings.map((sampling) => ({ ...sampling, pondName: pond.pondName }))),
    })
);
