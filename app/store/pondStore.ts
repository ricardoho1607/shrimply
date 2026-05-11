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
  const { mbw, feed: feedAmount } = sampling;
  const frPercentage = getFRFromMBW(mbw);
  
  if (feedAmount === 0 || mbw === 0 || frPercentage === null || frPercentage === 0) return 0;
  
  return Math.round(((feedAmount / frPercentage) / mbw) * 100000);
};

export interface FeedData { 
  ancoPercentage: string; 
  totalDailyFeed: string; 
  inventoryFeedId?: string | null;
  feed1?: string; feed2?: string; feed3?: string; feed4?: string; feed5?: string; 
  anco1?: string; anco2?: string; anco3?: string; anco4?: string; anco5?: string;
  anco6?: string; anco7?: string; anco8?: string; anco9?: string; anco10?: string;
}
export interface HarvestData { biomass: string; size: string; pricePerKg: string; subBiomass: string; subSize: string; subPricePerKg: string; }
export interface HarvestRecord { id: string; date: string; ponds: { pondId: string; pondName: string; biomass: string; size: string; price: string; subBiomass: string; subSize: string; subPrice: string; }[]; }

export type PondCycleStatus = 'active' | 'ended';
export type PondCycleEndReason = 'harvested' | 'disease' | 'reset' | 'other';

export interface Sampling {
  id: string; date: string; mbw: number; mortality: number; feed: number;
  phMorning?: string; phEvening?: string; doMorning?: string; doEvening?: string; transparency?: string; salinity?: string;
  feedData?: FeedData; harvestData?: HarvestData;
}

export interface Pond {
  id: string; pondName: string; pondArea: number; density: number; initialPopulation: number; docStart: string; supplier: string; plSupplier?: string; initialWeight: number; samplings: Sampling[];
  totalHarvestedBiomass?: number; totalHarvestedPopulation?: number; totalHarvestedFeed?: number;
  cycleStatus?: PondCycleStatus; cycleStartedAt?: string; cycleEndedAt?: string; cycleEndedBy?: string; cycleEndReason?: PondCycleEndReason; previousCyclePondId?: string;
}

export const getPondCycleStatus = (pond: Pick<Pond, 'cycleStatus'>): PondCycleStatus => pond.cycleStatus === 'ended' ? 'ended' : 'active';
export const isPondCycleActive = (pond: Pick<Pond, 'cycleStatus'>): boolean => getPondCycleStatus(pond) === 'active';
export const getPondPlSupplier = (pond: Pick<Pond, 'plSupplier' | 'supplier'>): string => pond.plSupplier || pond.supplier || 'N/A';
export const normalizePondLifecycle = (pond: Pond): Pond => ({
  ...pond,
  supplier: pond.supplier || pond.plSupplier || '',
  plSupplier: pond.plSupplier || pond.supplier || '',
  cycleStatus: getPondCycleStatus(pond),
  cycleStartedAt: pond.cycleStartedAt || pond.docStart,
});

interface PondStore {
  ponds: Pond[]; harvestRecords: HarvestRecord[]; currentCompanyId?: string; isBackingUp: boolean; isRestoring: boolean; lastBackupTime?: number;
  firebaseSync?: { syncPond: (action: 'create' | 'update' | 'delete', pond: Pond) => void; syncSampling: (action: 'create' | 'update' | 'delete', pondId: string, sampling: Sampling, samplingId?: string) => void; syncHarvestRecord: (action: 'create' | 'delete', harvestRecord: HarvestRecord) => void; };
  
  addPond: (pond: Pond) => void; deletePond: (pondId: string) => void; endPondCycle: (pondId: string, endedAt: string, reason: PondCycleEndReason, endedBy?: string) => void; addSampling: (pondId: string, sampling: Sampling) => void; updateSampling: (pondId: string, samplingId: string, updates: Partial<Sampling>) => void; deleteSampling: (pondId: string, samplingId: string) => void;
  addHarvestRecord: (record: HarvestRecord) => void; removeHarvestRecord: (harvestId: string) => void; processHarvestImpact: (record: HarvestRecord) => void; reverseHarvestImpact: (record: HarvestRecord) => void;
  
  addWaterQuality: (pondId: string, record: { phMorning: string; phEvening: string; doMorning: string; doEvening: string; transparency: string; salinity: string; }) => void;
  addFeedData: (pondId: string, record: { ancoPercentage: string; feed1: string; anco1: string; anco2: string; feed2: string; feed3: string; feed4: string; feed5: string; totalDailyFeed: string; }) => void;
  addHarvestData: (pondId: string, record: { biomass: string; size: string; pricePerKg: string; subBiomass: string; subSize: string; subPricePerKg: string; }) => void;
  
  getPondById: (pondId: string) => Pond | undefined; getPondSamplingData: (pondName: string) => Sampling[]; getSamplingDataFlat: () => Array<Sampling & { pondName: string }>;
  
  calculatePondMetricsWithHarvest: (pond: Pond) => { currentBiomass: number; currentPopulation: number; adjustedSR: number; totalFeedConsumed: number; adjustedFCR: number; };
  
  switchAccount: (companyId: string) => void; clearData: () => void; setFirebaseSync: (sync: PondStore['firebaseSync']) => void;
  backupToFirebase: (userId: string) => Promise<void>; restoreFromFirebase: (userId: string) => Promise<void>;
}

export const usePondStore = create<PondStore>()(
    (set, get) => ({
      ponds: [], harvestRecords: [], currentCompanyId: undefined, isBackingUp: false, isRestoring: false, lastBackupTime: undefined, firebaseSync: undefined,
      
      setFirebaseSync: (sync) => set({ firebaseSync: sync }),
      
      switchAccount: (companyId: string) => {
        const state = get();
        if (state.currentCompanyId !== companyId) {
          console.log(`Switching account from ${state.currentCompanyId} to ${companyId}`);
          set({ ponds: [], harvestRecords: [], currentCompanyId: companyId });
        }
      },
      
      clearData: () => set({ ponds: [], harvestRecords: [], currentCompanyId: undefined }),
      
      backupToFirebase: async (userId: string) => { console.log('Legacy backupToFirebase called - real-time sync handles this now'); return Promise.resolve(); },
      restoreFromFirebase: async (userId: string) => { console.log('Legacy restoreFromFirebase called - real-time sync handles this now'); return Promise.resolve(); },
      
      addPond: (pond) => {
        const newPond = normalizePondLifecycle({
          ...pond,
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

        const endedPond = normalizePondLifecycle({
          ...pondToEnd,
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
        set((state) => ({ harvestRecords: [record, ...state.harvestRecords] }));
        get().firebaseSync?.syncHarvestRecord('create', record);
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

            const currentMetrics = get().calculatePondMetricsWithHarvest(pond);
            const currentTotalBiomass = currentMetrics.currentBiomass + (pond.totalHarvestedBiomass || 0);
            const harvestPercentage = currentTotalBiomass > 0 ? totalHarvestedBiomass / currentTotalBiomass : 0;

            const totalFeedConsumed = pond.samplings.filter(s => s.feed > 0).reduce((sum, s) => sum + s.feed, 0);
            const feedToDeduct = totalFeedConsumed * harvestPercentage;

            return {
              ...pond,
              totalHarvestedBiomass: (pond.totalHarvestedBiomass || 0) + totalHarvestedBiomass,
              totalHarvestedPopulation: (pond.totalHarvestedPopulation || 0) + harvestedPopulation,
              totalHarvestedFeed: (pond.totalHarvestedFeed || 0) + feedToDeduct,
            };
          })
        }));
      },

      reverseHarvestImpact: (record) => {
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

            const currentTotalBiomass = (pond.totalHarvestedBiomass || 0);
            const harvestPercentage = currentTotalBiomass > 0 ? totalHarvestedBiomass / currentTotalBiomass : 0;
            const totalFeedConsumed = pond.samplings.filter(s => s.feed > 0).reduce((sum, s) => sum + s.feed, 0);
            const feedToRestore = totalFeedConsumed * harvestPercentage;

            return {
              ...pond,
              totalHarvestedBiomass: Math.max(0, (pond.totalHarvestedBiomass || 0) - totalHarvestedBiomass),
              totalHarvestedPopulation: Math.max(0, (pond.totalHarvestedPopulation || 0) - harvestedPopulation),
              totalHarvestedFeed: Math.max(0, (pond.totalHarvestedFeed || 0) - feedToRestore),
            };
          })
        }));
      },

      calculatePondMetricsWithHarvest: (pond) => {
  const samplings = pond.samplings || [];
  const validSamplings = samplings.filter(s => s.mbw > 0 || s.mortality > 0 || s.feed > 0);
  
  if (validSamplings.length === 0) {
    return {
      currentBiomass: (pond.initialPopulation * (pond.initialWeight || 0.5)) / 1000,
      currentPopulation: pond.initialPopulation,
      adjustedSR: 100,
      totalFeedConsumed: 0,
      adjustedFCR: 0,
    };
  }

  const sortedSamplings = validSamplings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const latestSampling = sortedSamplings[sortedSamplings.length - 1];

  let currentPopulation = pond.initialPopulation;
  
  const latestValidSampling = sortedSamplings.filter(s => s.mbw > 0 && s.feed > 0).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  if (latestValidSampling) {
    currentPopulation = calculatePopulationFromSampling(latestValidSampling);
  } else {
    const totalMortality = sortedSamplings.filter(s => s.mortality > 0).reduce((sum, s) => sum + s.mortality, 0);
    currentPopulation = Math.max(0, pond.initialPopulation - totalMortality);
  }

  currentPopulation = Math.max(0, currentPopulation - (pond.totalHarvestedPopulation || 0));

  let currentBiomass = 0;
  if (latestSampling && latestSampling.mbw > 0) {
    currentBiomass = Math.max(0, (currentPopulation * latestSampling.mbw) / 1000);
  }

  // Calculate total feed - same logic as in ponddetails.tsx getTotalFeedData()
  const samplingFeed = samplings
    .filter((s) => !(s.mbw === 0 && s.mortality === 0 && s.feed === 0))
    .reduce((total, s) => total + (s.feed || 0), 0);

  const feedManagementFeed = samplings
    .filter((s) => s.feedData)
    .reduce((total, s) => total + (parseFloat(s.feedData?.totalDailyFeed || '0') || 0), 0);

  const totalFeedConsumed = feedManagementFeed > 0 ? feedManagementFeed : samplingFeed;
  
  const adjustedSR = pond.initialPopulation > 0 ? (currentPopulation / pond.initialPopulation) * 100 : 0;

  const adjustedFCR = currentBiomass > 0 ? totalFeedConsumed / currentBiomass : 0;

  return {
    currentBiomass: Math.max(0, currentBiomass),
    currentPopulation: Math.max(0, currentPopulation),
    adjustedSR: Math.max(0, adjustedSR),
    totalFeedConsumed: Math.max(0, totalFeedConsumed),
    adjustedFCR: Math.max(0, adjustedFCR),
  };
},
      addSampling: (pondId, sampling) => {
        const samplingWithId = { ...sampling, id: sampling.id || Date.now().toString() };
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
            
            const todayWQIndex = p.samplings.findIndex(s => s.mbw === 0 && s.feed === 0 && s.mortality === 0 && s.date === today);
            
            let updatedSamplings;
            if (todayWQIndex >= 0) {
              updatedSamplings = p.samplings.map((s, index) => index === todayWQIndex ? { ...s, phMorning: record.phMorning || s.phMorning, phEvening: record.phEvening || s.phEvening, doMorning: record.doMorning || s.doMorning, doEvening: record.doEvening || s.doEvening, transparency: record.transparency || s.transparency, salinity: record.salinity || s.salinity } : s);
            } else {
              updatedSamplings = [...p.samplings, { id: `wq-${Date.now()}`, date: today, mbw: 0, mortality: 0, feed: 0, ...record }];
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
            
            const existingIndex = p.samplings.findIndex(s => s.date === today);
            
            let updatedSamplings;
            if (existingIndex >= 0) {
              updatedSamplings = p.samplings.map((s, index) => 
                index === existingIndex 
                  ? { ...s, feedData: { ...(s.feedData || {}), ...record } } 
                  : s
              );
            } else {
              updatedSamplings = [...p.samplings, { id: `feed-${Date.now()}`, date: today, mbw: 0, mortality: 0, feed: 0, feedData: record }];
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
            
            const todayHarvestIndex = p.samplings.findIndex(s => s.harvestData && s.date === today);
            
            let updatedSamplings;
            if (todayHarvestIndex >= 0) {
              updatedSamplings = p.samplings.map((s, index) => index === todayHarvestIndex ? { ...s, harvestData: { ...s.harvestData, ...record } } : s);
            } else {
              updatedSamplings = [...p.samplings, { id: `harvest-${Date.now()}`, date: today, mbw: 0, mortality: 0, feed: 0, harvestData: record }];
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
