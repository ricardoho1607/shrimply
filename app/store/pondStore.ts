import { create } from "zustand";
import {
  calculatePondMetricsWithHarvest as calculateSharedPondMetricsWithHarvest,
  isBaselineSampling,
  toFiniteNumber,
  type MortalityObservationType,
  type PondMetricsWithHarvest,
  type FeedingResponse,
} from "../../shared/pondCalculations";
import { getFarmDateKey, resolveFarmTimeZone } from '../../shared/farmDate';
import {
  applyHarvestImpactToPond,
  getHarvestDateSampling,
  getNextPartialHarvestNumber,
  reverseHarvestImpactOnPond,
  withHarvestReference,
  type HarvestType,
} from '../../shared/harvestCalculations';
import { harvestPondsBelongToCycle } from '../../shared/harvestCycleScope';
import type { PlanktonOverwatchSnapshot } from '../../shared/planktonOverwatch';

export {
  getPondBaselineFeed,
  getPondBaselinePopulation,
  getPondCurrentDoc,
  getPondOperationalFeed,
  getPondTotalFeedConsumed,
  getSamplingFeedAmount,
  isBaselineSampling,
} from "../../shared/pondCalculations";
export type { FeedingResponse, MortalityObservationType } from "../../shared/pondCalculations";

export interface FeedAllocation {
  inventoryFeedId: string;
  quantityKg: number;
}

export interface FeedData { 
  totalDailyFeed: string; 
  feedingResponse?: FeedingResponse | null;
  inventoryFeedId?: string | null;
  feedAllocations?: FeedAllocation[];
  cycleId?: string;
  cycleName?: string;
  pondCycleId?: string;
}
export interface HarvestData { biomass: string; size: string; pricePerKg: string; subBiomass: string; subSize: string; subPricePerKg: string; cycleId?: string; cycleName?: string; pondCycleId?: string; }
export interface HarvestRecord { id: string; date: string; cycleId?: string; cycleName?: string; blockId?: string; blockName?: string; ponds: { pondId: string; pondName: string; cycleId?: string; cycleName?: string; pondCycleId?: string; blockId?: string; blockName?: string; harvestType?: HarvestType; partialHarvestNumber?: number; harvestReferenceSamplingId?: string | null; harvestReferenceSamplingDate?: string | null; harvestReferenceMbw?: number | string | null; biomass: string; size: string; price: string; subBiomass: string; subSize: string; subPrice: string; }[]; }

export type PondCycleStatus = 'active' | 'ended';
export type PondCycleEndReason = 'harvested' | 'disease' | 'reset' | 'other';
export type FarmCycleStatus = 'planning' | 'stocking' | 'active' | 'closing' | 'closed';

export interface FarmCycle {
  id: string;
  cycleName: string;
  status: FarmCycleStatus;
  blockIds?: string[];
  blockNames?: string[];
  blockId?: string;
  blockName?: string;
  plannedPondIds?: string[];
  assignedTechnicianId?: string | null;
  plannedStartDate?: string;
  plannedStockingEndDate?: string;
  stockingStartDate?: string;
  stockingEndDate?: string;
  closedAt?: string;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
  updatedBy?: string;
}

export interface PhysicalPond {
  id: string;
  pondName: string;
  pondArea: number;
  blockId?: string;
  blockName?: string;
  status?: 'idle' | 'active';
  activePondId?: string | null;
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
  temperature?: string;
  waterAppearance?: string;
  waterDepthCm?: string;
  alkalinity?: string;
  waterQualityRecordedByName?: string;
  ammonia?: string;
  operationalNotes?: string;
  weatherEvent?: 'rain' | 'heavy_rain' | 'sudden_cloud' | null;
  waterExchangePercent?: string;
  sludgeLoad?: 'low' | 'moderate' | 'high' | null;
  surfaceScum?: boolean | null;
  shrimpBehaviour?: 'normal' | 'abnormal' | null;
  feedData?: FeedData; harvestData?: HarvestData;
}

export const hasWaterQualityData = (
  sampling: Pick<Sampling, 'phMorning' | 'phEvening' | 'doMorning' | 'doEvening' | 'transparency' | 'salinity' | 'temperature' | 'waterAppearance' | 'waterDepthCm' | 'alkalinity' | 'operationalNotes' | 'ammonia' | 'weatherEvent' | 'waterExchangePercent' | 'sludgeLoad' | 'surfaceScum' | 'shrimpBehaviour'>,
): boolean => [
  sampling.phMorning,
  sampling.phEvening,
  sampling.doMorning,
  sampling.doEvening,
  sampling.transparency,
  sampling.salinity,
  sampling.temperature,
  sampling.waterAppearance,
  sampling.waterDepthCm,
  sampling.alkalinity,
  sampling.ammonia,
  sampling.operationalNotes,
  sampling.weatherEvent,
  sampling.waterExchangePercent,
  sampling.sludgeLoad,
  sampling.surfaceScum,
  sampling.shrimpBehaviour,
].some((value) => value !== null && value !== undefined && String(value).trim() !== '');

export interface MortalityRecord {
  id: string;
  date: string;
  observationType: MortalityObservationType;
  count: number;
  siphonedCount?: number;
  mortalCount?: number;
  siponShift?: 'morning' | 'evening';
  mbwAtRecord?: number;
  notes?: string;
  recordedAt: string;
  recordedBy: string;
  cycleId?: string;
  cycleName?: string;
  pondCycleId: string;
}

export type CycleStartMode = 'new' | 'midcycle';

export type LabReportStatus = {
  labReportId?: string;
  reportType?: 'water_quality' | 'plankton' | 'combined';
  sampleDate?: string;
  status?: 'good' | 'info' | 'watch' | 'warning' | 'critical';
  mainIssue?: string;
  keyRisks?: string[];
  recommendations?: string[];
  updatedAt?: unknown;
};

export interface Pond {
  id: string; pondName: string; pondArea: number; density: number; initialPopulation: number; initialStock?: number; docStart: string; supplier: string; plSupplier?: string; initialWeight: number; samplings: Sampling[];
  physicalPondId?: string;
  blockId?: string;
  blockName?: string;
  mortalityRecords?: MortalityRecord[];
  totalHarvestedBiomass?: number; totalHarvestedPopulation?: number; totalHarvestedFeed?: number;
  partialHarvestCount?: number;
  postHarvestBaselineDate?: string | null;
  postHarvestRemainingBiomass?: number | null;
  postHarvestRemainingPopulation?: number | null;
  postHarvestReferenceSamplingId?: string | null;
  postHarvestReferenceSamplingDate?: string | null;
  postHarvestReferenceMbw?: number | null;
  latestLabStatus?: LabReportStatus & {
    byType?: {
      water_quality?: LabReportStatus;
      plankton?: LabReportStatus;
    };
  };
  latestPlanktonOverwatch?: PlanktonOverwatchSnapshot;
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

const normalizeSamplingNumbers = <T extends Partial<Sampling>>(sampling: T): T => ({
  ...sampling,
  ...(sampling.mbw !== undefined ? { mbw: toFiniteNumber(sampling.mbw) } : {}),
  ...(sampling.mortality !== undefined ? { mortality: toFiniteNumber(sampling.mortality) } : {}),
  ...(sampling.feed !== undefined ? { feed: toFiniteNumber(sampling.feed) } : {}),
});
export const buildDefaultFarmCycle = (existingCycles: FarmCycle[] = [], timeZone?: string): FarmCycle => {
  const now = Date.now();
  const today = getFarmDateKey(new Date(now), timeZone);
  return {
    id: `cycle-${now}`,
    cycleName: `Cycle ${existingCycles.length + 1}`,
    status: 'stocking',
    plannedStartDate: today,
    stockingStartDate: today,
  };
};
export const normalizePondLifecycle = (pond: Pond): Pond => ({
  ...pond,
  samplings: Array.isArray(pond.samplings) ? pond.samplings : [],
  mortalityRecords: Array.isArray(pond.mortalityRecords) ? pond.mortalityRecords : [],
  supplier: pond.supplier || pond.plSupplier || '',
  plSupplier: pond.plSupplier || pond.supplier || '',
  pondCycleId: pond.pondCycleId || pond.id,
  cycleStatus: getPondCycleStatus(pond),
  cycleStartedAt: pond.cycleStartedAt || pond.docStart,
  cycleStartMode: pond.cycleStartMode || 'new',
});

export type FarmCacheStatus = 'idle' | 'hydrating' | 'ready' | 'miss';

interface PondStore {
  ponds: Pond[]; physicalPonds: PhysicalPond[]; cycles: FarmCycle[]; harvestRecords: HarvestRecord[]; currentCompanyId?: string; currentTimeZone?: string; farmCacheUserId?: string; farmCacheStatus: FarmCacheStatus; lastFarmCacheUpdate?: number; isBackingUp: boolean; isRestoring: boolean; lastBackupTime?: number;
  firebaseSync?: { syncPond: (action: 'create' | 'update' | 'delete', pond: Pond) => void; syncPhysicalPond?: (action: 'create' | 'update' | 'delete', pond: PhysicalPond) => void; syncSampling: (action: 'create' | 'update' | 'delete', pondId: string, sampling: Sampling, samplingId?: string) => void; syncMortality?: (action: 'create' | 'update' | 'delete', pondId: string, record: MortalityRecord, recordId?: string) => void; syncHarvestRecord: (action: 'create' | 'delete', harvestRecord: HarvestRecord) => void; syncCycle?: (action: 'create' | 'update' | 'delete', cycle: FarmCycle) => void; };
  
  addFarmCycle: (cycle?: Partial<FarmCycle>) => FarmCycle;
  updateFarmCycle: (cycleId: string, updates: Partial<FarmCycle>) => void;
  closeFarmCycle: (cycleId: string, closedAt: string, options?: { sync?: boolean; endedBy?: string }) => void;
  addPhysicalPond: (pond: PhysicalPond) => void;
  updatePhysicalPond: (pondId: string, updates: Partial<PhysicalPond>) => void;
  deletePhysicalPond: (pondId: string) => void;
  addPond: (pond: Pond) => void; updatePond: (pondId: string, updates: Partial<Pond>) => void; deletePond: (pondId: string) => void; endPondCycle: (pondId: string, endedAt: string, reason: PondCycleEndReason, endedBy?: string) => void; addSampling: (pondId: string, sampling: Sampling) => void; updateSampling: (pondId: string, samplingId: string, updates: Partial<Sampling>) => void; deleteSampling: (pondId: string, samplingId: string) => void; addMortalityRecord: (pondId: string, record: MortalityRecord) => void; updateMortalityRecord: (pondId: string, recordId: string, updates: Partial<MortalityRecord>) => void; deleteMortalityRecord: (pondId: string, recordId: string) => void;
  addHarvestRecord: (record: HarvestRecord) => void; removeHarvestRecord: (harvestId: string) => void; processHarvestImpact: (record: HarvestRecord) => void; reverseHarvestImpact: (record: HarvestRecord) => void;
  
  addWaterQuality: (pondId: string, record: { phMorning: string; phEvening: string; doMorning: string; doEvening: string; transparency: string; salinity: string; temperature?: string; waterAppearance?: string; waterDepthCm?: string; alkalinity?: string; waterQualityRecordedByName?: string; ammonia?: string; operationalNotes?: string; weatherEvent?: Sampling['weatherEvent']; waterExchangePercent?: string; sludgeLoad?: Sampling['sludgeLoad']; surfaceScum?: boolean | null; shrimpBehaviour?: Sampling['shrimpBehaviour']; }) => void;
  addFeedData: (pondId: string, record: FeedData, date: string) => void;
  addHarvestData: (pondId: string, record: HarvestData) => void;
  
  getPondById: (pondId: string) => Pond | undefined; getPondSamplingData: (pondName: string) => Sampling[]; getSamplingDataFlat: () => (Sampling & { pondName: string })[];
  
  calculatePondMetricsWithHarvest: (pond: Pond) => PondMetricsWithHarvest;
  
  switchAccount: (companyId: string, timeZone?: string, userId?: string) => void; clearData: () => void; setFirebaseSync: (sync: PondStore['firebaseSync']) => void;
  backupToFirebase: (userId: string) => Promise<void>; restoreFromFirebase: (userId: string) => Promise<void>;
}

export const usePondStore = create<PondStore>()(
    (set, get) => ({
      ponds: [], physicalPonds: [], cycles: [], harvestRecords: [], currentCompanyId: undefined, currentTimeZone: undefined, farmCacheUserId: undefined, farmCacheStatus: 'idle', lastFarmCacheUpdate: undefined, isBackingUp: false, isRestoring: false, lastBackupTime: undefined, firebaseSync: undefined,
      
      setFirebaseSync: (sync) => set({ firebaseSync: sync }),
      
      switchAccount: (companyId: string, timeZone?: string, userId?: string) => {
        const state = get();
        const resolvedTimeZone = resolveFarmTimeZone(timeZone);
        const userChanged = Boolean(userId && state.farmCacheUserId && state.farmCacheUserId !== userId);
        if (state.currentCompanyId !== companyId || userChanged) {
          console.log(`Switching account from ${state.currentCompanyId} to ${companyId}`);
          set({ ponds: [], physicalPonds: [], cycles: [], harvestRecords: [], currentCompanyId: companyId, currentTimeZone: resolvedTimeZone, farmCacheUserId: userId, farmCacheStatus: 'miss', lastFarmCacheUpdate: undefined });
        } else if (state.currentTimeZone !== resolvedTimeZone) {
          set({ currentTimeZone: resolvedTimeZone, ...(userId ? { farmCacheUserId: userId } : {}) });
        } else if (userId && state.farmCacheUserId !== userId) {
          set({ farmCacheUserId: userId });
        }
      },
      
      clearData: () => set({ ponds: [], physicalPonds: [], cycles: [], harvestRecords: [], currentCompanyId: undefined, currentTimeZone: undefined, farmCacheUserId: undefined, farmCacheStatus: 'idle', lastFarmCacheUpdate: undefined }),
      
      backupToFirebase: async (userId: string) => { console.log('Legacy backupToFirebase called - real-time sync handles this now'); return Promise.resolve(); },
      restoreFromFirebase: async (userId: string) => { console.log('Legacy restoreFromFirebase called - real-time sync handles this now'); return Promise.resolve(); },
      
      addFarmCycle: (cycle) => {
        const state = get();
        const newCycle: FarmCycle = {
          ...buildDefaultFarmCycle(state.cycles, state.currentTimeZone),
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

      closeFarmCycle: (cycleId, closedAt, options) => {
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
            cycleEndedBy: options?.endedBy || pond.cycleEndedBy,
            cycleEndReason: pond.cycleEndReason || 'harvested',
          }));
        const endedPondIds = new Set(endedPonds.map((pond) => pond.id));
        const endedPondNames = new Set(endedPonds.map((pond) => getPhysicalPondKey(pond.pondName)));
        const releasedPhysicalPonds = state.physicalPonds
          .filter((physicalPond) =>
            (physicalPond.activePondId && endedPondIds.has(physicalPond.activePondId)) ||
            (physicalPond.status === 'active' && endedPondNames.has(getPhysicalPondKey(physicalPond.pondName)))
          )
          .map((physicalPond) => ({ ...physicalPond, status: 'idle' as const, activePondId: null }));

        set((state) => ({
          cycles: cycleToClose
            ? state.cycles.map((cycle) => cycle.id === cycleId ? closedCycle : cycle)
            : [...state.cycles, closedCycle],
          ponds: state.ponds.map((pond) => endedPonds.find((endedPond) => endedPond.id === pond.id) || pond),
          physicalPonds: releasedPhysicalPonds.length > 0
            ? state.physicalPonds.map((physicalPond) =>
                releasedPhysicalPonds.find((released) => released.id === physicalPond.id) || physicalPond
              )
            : state.physicalPonds,
        }));
        if (options?.sync !== false) {
          state.firebaseSync?.syncCycle?.('update', closedCycle);
          endedPonds.forEach((pond) => state.firebaseSync?.syncPond('update', pond));
          releasedPhysicalPonds.forEach((physicalPond) => state.firebaseSync?.syncPhysicalPond?.('update', physicalPond));
        }
      },

      addPhysicalPond: (pond) => {
        const state = get();
        const pondKey = getPhysicalPondKey(pond.pondName);
        const duplicate = state.physicalPonds.find((existingPond) =>
          getPhysicalPondKey(existingPond.pondName) === pondKey
        );
        if (duplicate) {
          console.warn(`Skipped adding ${pond.pondName}: this physical pond already exists.`);
          return;
        }
        const newPond: PhysicalPond = { ...pond, status: pond.status || 'idle' };
        set((state) => ({ physicalPonds: [...state.physicalPonds, newPond] }));
        state.firebaseSync?.syncPhysicalPond?.('create', newPond);
      },

      updatePhysicalPond: (pondId, updates) => {
        const state = get();
        const existingPond = state.physicalPonds.find((pond) => pond.id === pondId);
        if (!existingPond) return;
        const updatedPond = { ...existingPond, ...updates };
        set((state) => ({
          physicalPonds: state.physicalPonds.map((pond) => pond.id === pondId ? updatedPond : pond),
        }));
        state.firebaseSync?.syncPhysicalPond?.('update', updatedPond);
      },

      deletePhysicalPond: (pondId) => {
        const state = get();
        const pondToDelete = state.physicalPonds.find((pond) => pond.id === pondId);
        if (!pondToDelete) return;
        if (pondToDelete.status === 'active' || pondToDelete.activePondId) {
          console.warn(`Skipped deleting ${pondToDelete.pondName}: active physical ponds must be ended first.`);
          return;
        }

        set((state) => ({
          physicalPonds: state.physicalPonds.filter((pond) => pond.id !== pondId),
        }));
        state.firebaseSync?.syncPhysicalPond?.('delete', pondToDelete);
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
            ...buildDefaultFarmCycle(state.cycles, state.currentTimeZone),
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
        const physicalPond = state.physicalPonds.find((item) =>
          item.id === pond.previousCyclePondId ||
          getPhysicalPondKey(item.pondName) === pondKey
        );
        if (physicalPond) {
          const updatedPhysicalPond = { ...physicalPond, status: 'active' as const, activePondId: newPond.id };
          set((state) => ({
            physicalPonds: state.physicalPonds.map((item) => item.id === physicalPond.id ? updatedPhysicalPond : item),
          }));
          get().firebaseSync?.syncPhysicalPond?.('update', updatedPhysicalPond);
        }
        get().firebaseSync?.syncPond('create', newPond);
      },

      deletePond: (pondId) => {
        const state = get();
        const pondToDelete = state.ponds.find(p => p.id === pondId);
        if (!pondToDelete) return;
        if (isPondCycleActive(pondToDelete)) {
          console.warn(`Skipped deleting ${pondToDelete.pondName}: active pond cycles must be ended first.`);
          return;
        }

        const linkedPhysicalPond = state.physicalPonds.find((physicalPond) =>
          physicalPond.activePondId === pondId ||
          (isPondCycleActive(pondToDelete) && getPhysicalPondKey(physicalPond.pondName) === getPhysicalPondKey(pondToDelete.pondName))
        );
        const updatedPhysicalPond = linkedPhysicalPond
          ? { ...linkedPhysicalPond, status: 'idle' as const, activePondId: null }
          : undefined;

        set((state) => ({
          ponds: state.ponds.filter((pond) => pond.id !== pondId),
          physicalPonds: updatedPhysicalPond
            ? state.physicalPonds.map((physicalPond) => physicalPond.id === updatedPhysicalPond.id ? updatedPhysicalPond : physicalPond)
            : state.physicalPonds,
        }));
        state.firebaseSync?.syncPond('delete', pondToDelete);
        if (updatedPhysicalPond) state.firebaseSync?.syncPhysicalPond?.('update', updatedPhysicalPond);
      },

      updatePond: (pondId, updates) => {
        let updatedPond: Pond | undefined;
        set((state) => ({
          ponds: state.ponds.map((pond) => {
            if (pond.id !== pondId) return pond;
            updatedPond = normalizePondLifecycle({ ...pond, ...updates });
            return updatedPond;
          })
        }));
        if (updatedPond) get().firebaseSync?.syncPond('update', updatedPond);
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
        const linkedPhysicalPond = state.physicalPonds.find((physicalPond) =>
          physicalPond.activePondId === pondId ||
          (physicalPond.status === 'active' && getPhysicalPondKey(physicalPond.pondName) === getPhysicalPondKey(pondToEnd.pondName))
        );
        const releasedPhysicalPond = linkedPhysicalPond
          ? { ...linkedPhysicalPond, status: 'idle' as const, activePondId: null }
          : undefined;

        set((state) => ({
          ponds: state.ponds.map((pond) => pond.id === pondId ? endedPond : pond),
          physicalPonds: releasedPhysicalPond
            ? state.physicalPonds.map((physicalPond) => physicalPond.id === releasedPhysicalPond.id ? releasedPhysicalPond : physicalPond)
            : state.physicalPonds,
        }));
        state.firebaseSync?.syncPond('update', endedPond);
        if (releasedPhysicalPond) state.firebaseSync?.syncPhysicalPond?.('update', releasedPhysicalPond);
      },

      addHarvestRecord: (record) => {
        const ponds = get().ponds;
        const pondWithoutSampling = record.ponds.find((harvestPond) => {
          const pond = ponds.find((item) => item.id === harvestPond.pondId);
          return !pond || !getHarvestDateSampling(pond, record.date);
        });
        if (pondWithoutSampling) {
          console.warn('Skipped harvest record: every pond requires a positive-MBW sampling on the harvest date.');
          return;
        }
        const firstPond = ponds.find((pond) => record.ponds.some((item) => item.pondId === pond.id));
        const resolvedCycleId = record.cycleId || firstPond?.cycleId;
        const resolvedHarvestPonds = record.ponds.map((harvestPond) => ({
          cycleId: harvestPond.cycleId || ponds.find((pond) => pond.id === harvestPond.pondId)?.cycleId,
        }));
        if (resolvedCycleId && !harvestPondsBelongToCycle(resolvedHarvestPonds, resolvedCycleId)) {
          console.warn('Skipped harvest record: all ponds must belong to the same production cycle.');
          return;
        }
        const recordWithCycle: HarvestRecord = {
          ...record,
          cycleId: resolvedCycleId,
          cycleName: record.cycleName || firstPond?.cycleName,
          blockId: record.blockId || firstPond?.blockId,
          blockName: record.blockName || firstPond?.blockName,
          ponds: record.ponds.map((harvestPond) => {
            const pond = ponds.find((item) => item.id === harvestPond.pondId);
            const partialHarvestNumber = harvestPond.harvestType === 'partial'
              ? harvestPond.partialHarvestNumber || (pond ? getNextPartialHarvestNumber(pond) : 1)
              : undefined;
            return withHarvestReference(pond || {}, {
              ...harvestPond,
              partialHarvestNumber,
              cycleId: harvestPond.cycleId || pond?.cycleId,
              cycleName: harvestPond.cycleName || pond?.cycleName,
              pondCycleId: harvestPond.pondCycleId || pond?.pondCycleId || pond?.id,
              blockId: harvestPond.blockId || pond?.blockId,
              blockName: harvestPond.blockName || pond?.blockName,
            });
          }),
        };
        set((state) => ({
          harvestRecords: [recordWithCycle, ...state.harvestRecords],
          ponds: state.ponds.map((pond) => {
            const harvestPond = recordWithCycle.ponds.find((item) => item.pondId === pond.id);
            if (!harvestPond) return pond;
            return applyHarvestImpactToPond(
              pond,
              harvestPond,
              recordWithCycle.date,
              harvestPond.partialHarvestNumber,
            );
          }),
        }));
        get().firebaseSync?.syncHarvestRecord('create', recordWithCycle);
      },

      removeHarvestRecord: (harvestId) => {
        const state = get();
        const harvestRecord = state.harvestRecords.find(r => r.id === harvestId);
        if (harvestRecord) {
          state.firebaseSync?.syncHarvestRecord('delete', harvestRecord);
        }
        set((state) => ({
          harvestRecords: state.harvestRecords.filter(r => r.id !== harvestId),
          ponds: harvestRecord
            ? state.ponds.map((pond) => {
                const harvestPond = harvestRecord.ponds.find((item) => item.pondId === pond.id);
                return harvestPond ? reverseHarvestImpactOnPond(pond, harvestPond) : pond;
              })
            : state.ponds,
        }));
      },

      processHarvestImpact: (record) => {
        const updatedPonds: Pond[] = [];
        set((state) => ({
          ponds: state.ponds.map((pond) => {
            const harvestForPond = record.ponds.find(p => p.pondId === pond.id);
            if (!harvestForPond) return pond;

            const updatedPond = applyHarvestImpactToPond(
              pond,
              harvestForPond,
              record.date,
              harvestForPond.partialHarvestNumber,
            );
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

            const updatedPond = reverseHarvestImpactOnPond(pond, harvestForPond);
            updatedPonds.push(updatedPond);
            return updatedPond;
          })
        }));
        updatedPonds.forEach((pond) => get().firebaseSync?.syncPond('update', pond));
      },

      calculatePondMetricsWithHarvest: (pond) => calculateSharedPondMetricsWithHarvest(pond, get().currentTimeZone),
      addSampling: (pondId, sampling) => {
        const pond = get().ponds.find((item) => item.id === pondId);
        if (!pond) return;

        const samplingWithId = normalizeSamplingNumbers({
          ...sampling,
          id: sampling.id || Date.now().toString(),
          cycleId: sampling.cycleId || pond.cycleId,
          cycleName: sampling.cycleName || pond.cycleName,
          pondCycleId: sampling.pondCycleId || pond.pondCycleId || pondId,
        });
        const updatedPond = { ...pond, samplings: [...(pond.samplings || []), samplingWithId] };
        set((state) => ({ ponds: state.ponds.map((p) => p.id === pondId ? updatedPond : p) }));
        get().firebaseSync?.syncSampling('create', pondId, samplingWithId);
      },

      updateSampling: (pondId, samplingId, updates) => {
        const state = get();
        const pond = state.ponds.find(p => p.id === pondId);
        if (!pond) return;

        const updatedPond = {
          ...pond,
          samplings: (pond.samplings || []).map((sampling) => sampling.id === samplingId ? normalizeSamplingNumbers({ ...sampling, ...updates }) : sampling),
        };
        set((state) => ({
          ponds: state.ponds.map((pond) => pond.id === pondId ? updatedPond : pond)
        }));
        const updatedSampling = updatedPond.samplings.find((sampling) => sampling.id === samplingId);
        if (updatedSampling) state.firebaseSync?.syncSampling('update', pondId, updatedSampling, samplingId);
      },

      deleteSampling: (pondId, samplingId) => {
        const state = get();
        const pond = state.ponds.find(p => p.id === pondId);
        if (!pond) return;
        
        const updatedPond = {
          ...pond,
          samplings: (pond.samplings || []).filter((s) => s.id !== samplingId),
        };
        set((state) => ({ ponds: state.ponds.map((pond) => pond.id === pondId ? updatedPond : pond) }));
        const deletedSampling = (pond.samplings || []).find((sampling) => sampling.id === samplingId);
        if (deletedSampling) state.firebaseSync?.syncSampling('delete', pondId, deletedSampling, samplingId);
      },

      addMortalityRecord: (pondId, record) => {
        const state = get();
        const pond = state.ponds.find((item) => item.id === pondId);
        if (!pond) return;

        const normalizedRecord: MortalityRecord = {
          ...record,
          count: record.observationType === 'none_observed'
            ? 0
            : Math.max(0, Math.round(toFiniteNumber(record.count))),
          mbwAtRecord: record.mbwAtRecord === undefined
            ? undefined
            : Math.max(0, toFiniteNumber(record.mbwAtRecord)),
          cycleId: record.cycleId || pond.cycleId,
          cycleName: record.cycleName || pond.cycleName,
          pondCycleId: record.pondCycleId || pond.pondCycleId || pondId,
        };
        const existingRecords = pond.mortalityRecords || [];
        const mortalityRecords = [...existingRecords, normalizedRecord];
        const updatedPond = { ...pond, mortalityRecords };

        set((current) => ({
          ponds: current.ponds.map((item) => item.id === pondId ? updatedPond : item),
        }));
        state.firebaseSync?.syncMortality?.('create', pondId, normalizedRecord);
      },

      updateMortalityRecord: (pondId, recordId, updates) => {
        const state = get();
        const pond = state.ponds.find((item) => item.id === pondId);
        if (!pond) return;

        const mortalityRecords = (pond.mortalityRecords || []).map((record) => {
          if (record.id !== recordId) return record;
          const merged = { ...record, ...updates };
          return {
            ...merged,
            count: merged.observationType === 'none_observed'
              ? 0
              : Math.max(0, Math.round(toFiniteNumber(merged.count))),
            mbwAtRecord: merged.mbwAtRecord === undefined
              ? undefined
              : Math.max(0, toFiniteNumber(merged.mbwAtRecord)),
          };
        });
        const updatedPond = { ...pond, mortalityRecords };

        set((current) => ({
          ponds: current.ponds.map((item) => item.id === pondId ? updatedPond : item),
        }));
        const updatedRecord = mortalityRecords.find((record) => record.id === recordId);
        if (updatedRecord) state.firebaseSync?.syncMortality?.('update', pondId, updatedRecord, recordId);
      },

      deleteMortalityRecord: (pondId, recordId) => {
        const state = get();
        const pond = state.ponds.find((item) => item.id === pondId);
        if (!pond) return;

        const mortalityRecords = (pond.mortalityRecords || []).filter((record) => record.id !== recordId);
        const updatedPond = { ...pond, mortalityRecords };

        set((current) => ({
          ponds: current.ponds.map((item) => item.id === pondId ? updatedPond : item),
        }));
        const deletedRecord = (pond.mortalityRecords || []).find((record) => record.id === recordId);
        if (deletedRecord) state.firebaseSync?.syncMortality?.('delete', pondId, deletedRecord, recordId);
      },

      addWaterQuality: (pondId, record) => {
        const today = getFarmDateKey(new Date(), get().currentTimeZone);
        const existingSamplingId = get().ponds.find((pond) => pond.id === pondId)?.samplings.find((sampling) => (
          !isBaselineSampling(sampling) && sampling.date === today && hasWaterQualityData(sampling)
        ))?.id;
        
        set((state) => ({
          ponds: state.ponds.map((p) => {
            if (p.id !== pondId) return p;
            const cycleFields = { cycleId: p.cycleId, cycleName: p.cycleName, pondCycleId: p.pondCycleId || p.id };
            
            const todayWQIndex = p.samplings.findIndex(s =>
              !isBaselineSampling(s) &&
              s.date === today &&
              hasWaterQualityData(s)
            );
            
            let updatedSamplings;
            if (todayWQIndex >= 0) {
              updatedSamplings = p.samplings.map((s, index) => index === todayWQIndex ? {
                ...s,
                ...cycleFields,
                phMorning: record.phMorning || s.phMorning,
                phEvening: record.phEvening || s.phEvening,
                doMorning: record.doMorning || s.doMorning,
                doEvening: record.doEvening || s.doEvening,
                transparency: record.transparency || s.transparency,
                salinity: record.salinity || s.salinity,
                temperature: record.temperature || s.temperature,
                waterAppearance: record.waterAppearance || s.waterAppearance,
                waterDepthCm: record.waterDepthCm || s.waterDepthCm,
                alkalinity: record.alkalinity || s.alkalinity,
                waterQualityRecordedByName: record.waterQualityRecordedByName || s.waterQualityRecordedByName,
                ammonia: record.ammonia || s.ammonia,
                operationalNotes: record.operationalNotes ?? s.operationalNotes,
                weatherEvent: record.weatherEvent ?? null,
                waterExchangePercent: record.waterExchangePercent || s.waterExchangePercent,
                sludgeLoad: record.sludgeLoad ?? null,
                surfaceScum: record.surfaceScum ?? null,
                shrimpBehaviour: record.shrimpBehaviour ?? null,
              } : s);
            } else {
              updatedSamplings = [...p.samplings, { id: `wq-${Date.now()}`, date: today, mbw: 0, mortality: 0, feed: 0, ...cycleFields, ...record }];
            }
            
            return { ...p, samplings: updatedSamplings };
          })
        }));
        
        const state = get();
        const updatedPond = state.ponds.find(p => p.id === pondId);
        const updatedSampling = updatedPond?.samplings.find((sampling) => sampling.id === existingSamplingId)
          || updatedPond?.samplings.find((sampling) => sampling.date === today && hasWaterQualityData(sampling));
        if (updatedSampling) state.firebaseSync?.syncSampling(existingSamplingId ? 'update' : 'create', pondId, updatedSampling, updatedSampling.id);
      },

      addFeedData: (pondId, record, date) => {
        const recordDate = /^\d{4}-\d{2}-\d{2}$/.test(date)
          ? date
          : getFarmDateKey(new Date(), get().currentTimeZone);
        const existingSamplingId = get().ponds.find((pond) => pond.id === pondId)?.samplings.find((sampling) => (
          !isBaselineSampling(sampling) && Boolean(sampling.feedData) && sampling.date === recordDate
        ))?.id;
        
        set((state) => ({
          ponds: state.ponds.map((p) => {
            if (p.id !== pondId) return p;
            const cycleFields = { cycleId: p.cycleId, cycleName: p.cycleName, pondCycleId: p.pondCycleId || p.id };
            const feedRecord = { ...record, ...cycleFields };
            
            const existingIndex = p.samplings.findIndex(s => !isBaselineSampling(s) && s.feedData && s.date === recordDate);
            
            let updatedSamplings;
            if (existingIndex >= 0) {
              updatedSamplings = p.samplings.map((s, index) => 
                index === existingIndex 
                  ? { ...s, ...cycleFields, feedData: { ...(s.feedData || {}), ...feedRecord } } 
                  : s
              );
            } else {
              updatedSamplings = [...p.samplings, { id: `feed-${Date.now()}`, date: recordDate, mbw: 0, mortality: 0, feed: 0, ...cycleFields, feedData: feedRecord }];
            }
            
            return { ...p, samplings: updatedSamplings };
          })
        }));
        
        const state = get();
        const updatedPond = state.ponds.find(p => p.id === pondId);
        const updatedSampling = updatedPond?.samplings.find((sampling) => sampling.id === existingSamplingId)
          || updatedPond?.samplings.find((sampling) => sampling.date === recordDate && Boolean(sampling.feedData));
        if (updatedSampling) state.firebaseSync?.syncSampling(existingSamplingId ? 'update' : 'create', pondId, updatedSampling, updatedSampling.id);
      },

      addHarvestData: (pondId, record) => {
        const today = getFarmDateKey(new Date(), get().currentTimeZone);
        const existingSamplingId = get().ponds.find((pond) => pond.id === pondId)?.samplings.find((sampling) => (
          !isBaselineSampling(sampling) && Boolean(sampling.harvestData) && sampling.date === today
        ))?.id;
        
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
        const updatedSampling = updatedPond?.samplings.find((sampling) => sampling.id === existingSamplingId)
          || updatedPond?.samplings.find((sampling) => sampling.date === today && Boolean(sampling.harvestData));
        if (updatedSampling) state.firebaseSync?.syncSampling(existingSamplingId ? 'update' : 'create', pondId, updatedSampling, updatedSampling.id);
      },

      getPondById: (pondId) => get().ponds.find((p) => p.id === pondId),
      getPondSamplingData: (pondName) => { const pond = get().ponds.find((p) => p.pondName === pondName); return pond ? pond.samplings : []; },
      getSamplingDataFlat: () => get().ponds.flatMap((pond) => pond.samplings.map((sampling) => ({ ...sampling, pondName: pond.pondName }))),
    })
);
