import { overlayDailyFeedIntents } from '../../shared/dailyFeedTransaction';
import { buildHarvestRevenue, financeSyncDocumentId, financeSourceEntry } from '../../shared/financeSync';
import { resolvePhysicalPond, PHYSICAL_POND_LINK_ERROR } from '../../shared/physicalPondIdentity';
// hooks/useFirebaseSync.ts - Fixed version with proper account switching
import { createContext, createElement, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { 
  doc, 
  collection, 
  onSnapshot, 
  serverTimestamp,
  writeBatch,
  query,
  orderBy,
  runTransaction,
} from 'firebase/firestore';
import firebaseApp, { db } from '@/config/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '@/context/AuthContext';
import { usePondStore, Pond, HarvestRecord, Sampling, FarmCycle, PhysicalPond, MortalityRecord, normalizePondLifecycle } from './../store/pondStore';
import { AppState, Platform } from 'react-native';
import {
  applyHarvestImpactToPond,
  getHarvestDateSampling,
  getNextPartialHarvestNumber,
  reverseHarvestImpactOnPond,
  withHarvestReference,
} from '../../shared/harvestCalculations';
import { createFirebaseSyncListenerOwner } from './firebaseSyncListenerOwner';
import { flushFarmCachePersist, scheduleFarmCachePersist } from '../services/farmCache';
import { readProtectedItem, removeProtectedItem, writeProtectedItem } from '../services/protectedStorage';
import { listOfflineMutations, requestOfflineMutationFlush } from '../services/offlineWorkspace';
import { getPendingSyncKey } from '../../shared/farmCache';
import {
  getOfflineRetryDelay,
  isUsableNetworkState,
  shouldApplyRemoteCollectionSnapshot,
} from '../../shared/offlineSnapshotPolicy';

// NetInfo crashes on web (window is not defined during SSR/init).
// Use a simple online-check mock for web instead.
const NetInfo = Platform.OS === 'web'
  ? {
      addEventListener: (callback: (state: { isConnected: boolean }) => void) => {
        // On web, assume online and use the browser's online event
        if (typeof window !== 'undefined') {
          const handler = () => callback({ isConnected: navigator.onLine });
          window.addEventListener('online', handler);
          window.addEventListener('offline', handler);
          // Call immediately
          callback({ isConnected: navigator.onLine });
          return () => {
            window.removeEventListener('online', handler);
            window.removeEventListener('offline', handler);
          };
        }
        callback({ isConnected: true });
        return () => {};
      }
    }
  : require('@react-native-community/netinfo').default;


export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync?: Date;
  pendingChanges: number;
  error?: string;
}

interface PendingChange {
  id: string;
  type: 'pond' | 'physicalPond' | 'sampling' | 'mortality' | 'harvest' | 'cycle';
  action: 'create' | 'update' | 'delete';
  data: any;
  previousData?: any;
  timestamp: number;
  pondId?: string;
  samplingId?: string;
  recordId?: string;
}

const removeUndefinedFields = (value: any): any => {
  if (Array.isArray(value)) return value.map(removeUndefinedFields);
  if (!value || typeof value !== 'object') return value;

  return Object.entries(value).reduce((cleaned, [key, entry]) => {
    if (entry !== undefined) {
      cleaned[key] = removeUndefinedFields(entry);
    }
    return cleaned;
  }, {} as Record<string, any>);
};

const applyPendingHarvestChanges = (
  serverRecords: HarvestRecord[],
  pendingChanges: PendingChange[],
): HarvestRecord[] => {
  const merged = new Map(serverRecords.map((record) => [record.id, record]));
  pendingChanges
    .filter((change) => change.type === 'harvest')
    .sort((a, b) => a.timestamp - b.timestamp)
    .forEach((change) => {
      const record = change.data as HarvestRecord | undefined;
      if (!record?.id) return;
      if (change.action === 'delete') {
        merged.delete(record.id);
        return;
      }
      if (change.action === 'update' && change.previousData?.id) {
        merged.delete(change.previousData.id);
      }
      merged.set(record.id, record);
    });
  return Array.from(merged.values());
};

const applyPendingPhysicalPondChanges = (
  serverPhysicalPonds: PhysicalPond[],
  pendingChanges: PendingChange[]
): PhysicalPond[] => {
  const merged = new Map(serverPhysicalPonds.map((pond) => [pond.id, pond]));

  pendingChanges
    .filter((change) => change.type === 'physicalPond')
    .sort((a, b) => a.timestamp - b.timestamp)
    .forEach((change) => {
      const pond = change.data as PhysicalPond | undefined;
      if (!pond?.id) return;

      if (change.action === 'delete') {
        merged.delete(pond.id);
        return;
      }

      merged.set(pond.id, {
        ...merged.get(pond.id),
        ...pond,
        status: pond.status === 'active' ? 'active' : 'idle',
      });
    });

  return Array.from(merged.values());
};

const applyPendingEntityChanges = <T extends { id: string }>(
  serverEntities: T[],
  pendingChanges: PendingChange[],
  type: PendingChange['type'],
): T[] => {
  const merged = new Map(serverEntities.map((entity) => [entity.id, entity]));

  pendingChanges
    .filter((change) => change.type === type)
    .sort((a, b) => a.timestamp - b.timestamp)
    .forEach((change) => {
      const entity = change.data as T | undefined;
      if (!entity?.id) return;
      if (change.action === 'delete') {
        merged.delete(entity.id);
      } else {
        merged.set(entity.id, { ...merged.get(entity.id), ...entity });
      }
    });

  return Array.from(merged.values());
};

const applyPendingPondChanges = (serverPonds: Pond[], changes: PendingChange[]): Pond[] => {
  let ponds = [...serverPonds];
  changes.slice().sort((a, b) => a.timestamp - b.timestamp).forEach((change) => {
    if (change.type === 'pond') {
      const pond = change.data as Pond;
      if (!pond?.id) return;
      ponds = change.action === 'delete'
        ? ponds.filter((item) => item.id !== pond.id)
        : applyPendingEntityChanges(ponds, [change], 'pond');
      return;
    }
    if (change.type === 'sampling' && change.pondId) {
      ponds = ponds.map((pond) => {
        if (pond.id !== change.pondId) return pond;
        let samplings = [...(pond.samplings || [])];
        if (change.action === 'delete') {
          samplings = samplings.filter((sampling) => sampling.id !== change.samplingId);
        } else {
          const index = samplings.findIndex((sampling) => sampling.id === change.samplingId);
          if (index >= 0) samplings[index] = change.data as Sampling;
          else samplings.push(change.data as Sampling);
        }
        return { ...pond, samplings };
      });
      return;
    }
    if (change.type === 'mortality' && change.pondId) {
      ponds = ponds.map((pond) => {
        if (pond.id !== change.pondId) return pond;
        let records = [...(pond.mortalityRecords || [])];
        if (change.action === 'delete') records = records.filter((record) => record.id !== change.recordId);
        else {
          const index = records.findIndex((record) => record.id === change.recordId);
          if (index >= 0) records[index] = change.data as MortalityRecord;
          else records.push(change.data as MortalityRecord);
        }
        return { ...pond, mortalityRecords: records };
      });
    }
  });
  return ponds;
};

const replayPendingFarmChanges = (
  userId: string,
  companyId: string,
  changes: PendingChange[],
): void => {
  const state = usePondStore.getState();
  if (state.currentCompanyId !== companyId || state.farmCacheUserId !== userId) return;

  let ponds = [...state.ponds];
  let physicalPonds = [...state.physicalPonds];
  let cycles = [...state.cycles];
  let harvestRecords = [...state.harvestRecords];

  changes.slice().sort((a, b) => a.timestamp - b.timestamp).forEach((change) => {
    if (change.type === 'pond') {
      const pond = change.data as Pond;
      if (!pond?.id) return;
      ponds = change.action === 'delete'
        ? ponds.filter((item) => item.id !== pond.id)
        : applyPendingEntityChanges(ponds, [change], 'pond').map(normalizePondLifecycle);
      return;
    }
    if (change.type === 'physicalPond') {
      physicalPonds = applyPendingPhysicalPondChanges(physicalPonds, [change]);
      return;
    }
    if (change.type === 'cycle') {
      cycles = applyPendingEntityChanges(cycles, [change], 'cycle');
      return;
    }
    if (change.type === 'sampling' && change.pondId) {
      ponds = ponds.map((pond) => {
        if (pond.id !== change.pondId) return pond;
        let samplings = [...(pond.samplings || [])];
        if (change.action === 'delete') {
          samplings = samplings.filter((sampling) => sampling.id !== change.samplingId);
        } else {
          const index = samplings.findIndex((sampling) => sampling.id === change.samplingId);
          if (index >= 0) samplings[index] = change.data as Sampling;
          else samplings.push(change.data as Sampling);
        }
        return { ...pond, samplings };
      });
      return;
    }
    if (change.type === 'mortality' && change.pondId) {
      ponds = ponds.map((pond) => {
        if (pond.id !== change.pondId) return pond;
        let records = [...(pond.mortalityRecords || [])];
        if (change.action === 'delete') {
          records = records.filter((record) => record.id !== change.recordId);
        } else {
          const index = records.findIndex((record) => record.id === change.recordId);
          if (index >= 0) records[index] = change.data as MortalityRecord;
          else records.push(change.data as MortalityRecord);
        }
        return { ...pond, mortalityRecords: records };
      });
      return;
    }
    if (change.type === 'harvest') {
      const record = change.data as HarvestRecord;
      const existing = harvestRecords.find((item) => item.id === record.id);
      if (change.action === 'create' && !existing) {
        harvestRecords = [record, ...harvestRecords];
        ponds = ponds.map((pond) => {
          const harvestPond = record.ponds.find((item) => item.pondId === pond.id);
          return harvestPond
            ? applyHarvestImpactToPond(pond, harvestPond, record.date, harvestPond.partialHarvestNumber)
            : pond;
        });
      } else if (change.action === 'delete' && existing) {
        harvestRecords = harvestRecords.filter((item) => item.id !== record.id);
        ponds = ponds.map((pond) => {
          const harvestPond = existing.ponds.find((item) => item.pondId === pond.id);
          return harvestPond ? reverseHarvestImpactOnPond(pond, harvestPond) : pond;
        });
      } else if (change.action === 'update') {
        const previousRecord = change.previousData as HarvestRecord | undefined;
        const previousExists = previousRecord
          ? harvestRecords.some((item) => item.id === previousRecord.id)
          : false;
        if (previousRecord && previousExists && !existing) {
          ponds = ponds.map((pond) => {
            const previousHarvestPond = previousRecord.ponds.find((item) => item.pondId === pond.id);
            const nextHarvestPond = record.ponds.find((item) => item.pondId === pond.id);
            const revertedPond = previousHarvestPond
              ? reverseHarvestImpactOnPond(pond, previousHarvestPond)
              : pond;
            return nextHarvestPond
              ? applyHarvestImpactToPond(revertedPond, nextHarvestPond, record.date, nextHarvestPond.partialHarvestNumber)
              : revertedPond;
          });
        }
        harvestRecords = applyPendingHarvestChanges(harvestRecords, [change]);
      }
    }
  });

  usePondStore.setState({ ponds, physicalPonds, cycles, harvestRecords });
  scheduleFarmCachePersist(userId, companyId, usePondStore.getState(), state.lastFarmCacheUpdate);
  void flushFarmCachePersist(userId, companyId).catch((error) => {
    console.error('[FarmCache] pending replay persistence failed:', error);
  });
};

const useFirebaseSyncController = () => {
  const { user, company, isBuyer } = useAuth();
  const activeCompanyId = user && !isBuyer ? company?.id : undefined;
  const activeUserId = user?.uid;
  const pendingStorageKey = activeUserId && activeCompanyId
    ? getPendingSyncKey(activeUserId, activeCompanyId)
    : null;
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: false,
    isSyncing: false,
    pendingChanges: 0
  });
  
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [pendingStorageReady, setPendingStorageReady] = useState(false);
  const [listenerOwner] = useState(createFirebaseSyncListenerOwner);
  const pendingChangesRef = useRef<PendingChange[]>([]);
  const initialLoadComplete = useRef(false);
  const isOnlineRef = useRef(false);
  const syncInProgressRef = useRef(false);
  const retryAttemptRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const syncPendingChangesRef = useRef<() => void>(() => undefined);
  const pendingQueueWriteRef = useRef<Promise<void>>(Promise.resolve());

  const persistPendingQueue = useCallback((changes: PendingChange[]): Promise<void> => {
    if (!activeUserId || !pendingStorageKey || !pendingStorageReady) return Promise.resolve();
    const write = pendingQueueWriteRef.current.catch(() => undefined).then(async () => {
      if (changes.length === 0) await removeProtectedItem(pendingStorageKey);
      else await writeProtectedItem(activeUserId, pendingStorageKey, JSON.stringify(changes));
    });
    pendingQueueWriteRef.current = write;
    return write;
  }, [activeUserId, pendingStorageKey, pendingStorageReady]);



  useEffect(() => {
    let cancelled = false;

    const loadPendingChanges = async () => {

      if (!pendingStorageKey || !activeUserId) {
        setPendingStorageReady(true);
        return;
      }

      try {
        const raw = await readProtectedItem(activeUserId, pendingStorageKey);
        if (cancelled) return;
        const parsed = raw ? JSON.parse(raw) : [];
        const restoredChanges = Array.isArray(parsed) ? parsed : [];
        const mergedChanges = Array.from(new Map(
          [...restoredChanges, ...pendingChangesRef.current].map((change) => [change.id, change]),
        ).values()) as PendingChange[];
        replayPendingFarmChanges(activeUserId, activeCompanyId!, mergedChanges);
        pendingChangesRef.current = mergedChanges;
        setPendingChanges(mergedChanges);
      } catch (error) {
        console.error('Error loading pending sync queue:', error);
        if (!cancelled) setPendingChanges([]);
      } finally {
        if (!cancelled) setPendingStorageReady(true);
      }
    };

    loadPendingChanges();

    return () => {
      cancelled = true;
    };
  }, [activeCompanyId, activeUserId, pendingStorageKey]);





  const setupRealtimeListeners = useCallback((userId: string, companyId: string) => {
    const newUnsubscribeCallbacks: (() => void)[] = [];
    const isActiveFarmIdentity = () => {
      const state = usePondStore.getState();
      return state.currentCompanyId === companyId && state.farmCacheUserId === userId;
    };
    const persistCurrentFarmSnapshot = (fromCache: boolean) => {
      const state = usePondStore.getState();
      if (!isActiveFarmIdentity()) return;
      scheduleFarmCachePersist(
        userId,
        companyId,
        state,
        fromCache ? state.lastFarmCacheUpdate : Date.now(),
      );
    };
    try {
      // Listen to ponds collection
      const cyclesQuery = query(collection(db, 'companies', companyId, 'cycles'));

      const unsubscribeCycles = onSnapshot(cyclesQuery, { includeMetadataChanges: true },
        (snapshot) => {
          try {
            if (!isActiveFarmIdentity()) return;
            const serverCycles: FarmCycle[] = [];
            snapshot.forEach(doc => {
              const data = doc.data();
              serverCycles.push({
                id: doc.id,
                cycleName: data.cycleName || `Cycle ${serverCycles.length + 1}`,
                status: ['planning', 'stocking', 'active', 'closing', 'closed'].includes(data.status) ? data.status : 'active',
                blockIds: Array.isArray(data.blockIds) ? data.blockIds : [],
                blockNames: Array.isArray(data.blockNames) ? data.blockNames : [],
                blockId: data.blockId,
                blockName: data.blockName,
                plannedPondIds: Array.isArray(data.plannedPondIds) ? data.plannedPondIds : [],
                assignedTechnicianId: data.assignedTechnicianId ?? null,
                plannedStartDate: data.plannedStartDate,
                plannedStockingEndDate: data.plannedStockingEndDate,
                stockingStartDate: data.stockingStartDate,
                stockingEndDate: data.stockingEndDate,
                closedAt: data.closedAt,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
                createdBy: data.createdBy,
                updatedBy: data.updatedBy,
              });
            });
            serverCycles.sort((a, b) => {
              const getTime = (cycle: FarmCycle) => {
                const createdAt = cycle.createdAt?.toDate?.() || (cycle.createdAt?.seconds ? new Date(cycle.createdAt.seconds * 1000) : undefined);
                return new Date(
                  createdAt ||
                  cycle.plannedStartDate ||
                  cycle.stockingStartDate ||
                  cycle.closedAt ||
                  0
                ).getTime();
              };
              return getTime(a) - getTime(b);
            });
            const currentState = usePondStore.getState();
            if (!shouldApplyRemoteCollectionSnapshot({
              fromCache: snapshot.metadata.fromCache,
              incomingCount: serverCycles.length,
              currentCount: currentState.cycles.length,
            })) return;
            usePondStore.setState({
              cycles: applyPendingEntityChanges(serverCycles, pendingChangesRef.current, 'cycle'),
              farmCacheStatus: 'ready',
              lastFarmCacheUpdate: snapshot.metadata.fromCache
                ? usePondStore.getState().lastFarmCacheUpdate
                : Date.now(),
            });
            persistCurrentFarmSnapshot(snapshot.metadata.fromCache);
          } catch (error) {
            console.error('Error processing cycles snapshot:', error);
            setSyncStatus(prev => ({ ...prev, error: 'Error processing cycle data' }));
          }
        },
        (error) => {
          console.error('Error listening to cycles:', error);
          setSyncStatus(prev => ({ ...prev, error: 'Unable to sync cycle data' }));
        }
      );
      newUnsubscribeCallbacks.push(unsubscribeCycles);
      if (__DEV__) console.log('[FirebaseSync] cycles listener attached');

      const physicalPondsQuery = query(
        collection(db, 'companies', companyId, 'physicalPonds'),
        orderBy('createdAt', 'asc')
      );

      const unsubscribePhysicalPonds = onSnapshot(physicalPondsQuery, { includeMetadataChanges: true },
        (snapshot) => {
          try {
            if (!isActiveFarmIdentity()) return;
            const serverPhysicalPonds: PhysicalPond[] = [];
            snapshot.forEach(doc => {
              const data = doc.data();
              serverPhysicalPonds.push({
                id: doc.id,
                pondName: data.pondName || '',
                pondArea: data.pondArea || 0,
                blockId: data.blockId,
                blockName: data.blockName,
                status: data.status === 'active' ? 'active' : 'idle',
                activePondId: data.activePondId || null,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
                createdBy: data.createdBy,
                updatedBy: data.updatedBy,
              });
            });
            const currentState = usePondStore.getState();
            if (!shouldApplyRemoteCollectionSnapshot({
              fromCache: snapshot.metadata.fromCache,
              incomingCount: serverPhysicalPonds.length,
              currentCount: currentState.physicalPonds.length,
            })) return;
            usePondStore.setState({
              physicalPonds: applyPendingPhysicalPondChanges(
                serverPhysicalPonds,
                pendingChangesRef.current
              ),
              farmCacheStatus: 'ready',
              lastFarmCacheUpdate: snapshot.metadata.fromCache
                ? usePondStore.getState().lastFarmCacheUpdate
                : Date.now(),
            });
            persistCurrentFarmSnapshot(snapshot.metadata.fromCache);
          } catch (error) {
            console.error('Error processing physical ponds snapshot:', error);
            setSyncStatus(prev => ({ ...prev, error: 'Error processing physical pond data' }));
          }
        },
        (error) => {
          console.error('Error listening to physical ponds:', error);
          setSyncStatus(prev => ({ ...prev, error: 'Unable to sync physical pond data' }));
        }
      );
      newUnsubscribeCallbacks.push(unsubscribePhysicalPonds);
      if (__DEV__) console.log('[FirebaseSync] physicalPonds listener attached');

      const pondsQuery = query(
        collection(db, 'companies', companyId, 'ponds'),
        orderBy('createdAt', 'asc')
      );

      let pondSnapshotVersion = 0;
      const unsubscribePonds = onSnapshot(pondsQuery, { includeMetadataChanges: true },
        async (snapshot) => {
          const version = ++pondSnapshotVersion;
          try {
            if (!isActiveFarmIdentity()) return;
            const serverPonds: Pond[] = [];
            
            snapshot.forEach(doc => {
              const data = doc.data();
              serverPonds.push(normalizePondLifecycle({
                id: doc.id,
                pondName: data.pondName || '',
                pondArea: data.pondArea || 0,
                blockId: data.blockId,
                blockName: data.blockName,
                density: data.density || 0,
                initialPopulation: data.initialPopulation || 0,
                docStart: data.docStart || '',
                supplier: data.supplier || '',
                plSupplier: data.plSupplier || data.supplier || '',
                initialWeight: data.initialWeight || 0,
                samplings: data.samplings || [],
                mortalityRecords: data.mortalityRecords || [],
                totalHarvestedBiomass: data.totalHarvestedBiomass || 0,
                totalHarvestedPopulation: data.totalHarvestedPopulation || 0,
                totalHarvestedFeed: data.totalHarvestedFeed || 0,
                partialHarvestCount: data.partialHarvestCount || 0,
                postHarvestBaselineDate: data.postHarvestBaselineDate ?? null,
                postHarvestRemainingBiomass: data.postHarvestRemainingBiomass ?? null,
                postHarvestRemainingPopulation: data.postHarvestRemainingPopulation ?? null,
                postHarvestReferenceSamplingId: data.postHarvestReferenceSamplingId ?? null,
                postHarvestReferenceSamplingDate: data.postHarvestReferenceSamplingDate ?? null,
                postHarvestReferenceMbw: data.postHarvestReferenceMbw ?? null,
                latestLabStatus: data.latestLabStatus,
                cycleId: data.cycleId,
                cycleName: data.cycleName,
                pondCycleId: data.pondCycleId || doc.id,
                cycleStatus: data.cycleStatus === 'ended' ? 'ended' : 'active',
                cycleStartedAt: data.cycleStartedAt || data.docStart || '',
                cycleEndedAt: data.cycleEndedAt,
                cycleEndedBy: data.cycleEndedBy,
                cycleEndReason: data.cycleEndReason,
                previousCyclePondId: data.previousCyclePondId,
                cycleStartMode: data.cycleStartMode || 'new',
                baselineDate: data.baselineDate,
                baselineDoc: data.baselineDoc,
                baselineMbw: data.baselineMbw,
                baselineEstimatedPopulation: data.baselineEstimatedPopulation,
                baselineSurvivalRate: data.baselineSurvivalRate,
                baselineCumulativeFeed: data.baselineCumulativeFeed,
                baselineSource: data.baselineSource,
              }));
            });

            // Only update if this is the initial load or if we have actual changes
            const mutations = await listOfflineMutations(userId, companyId);
            if (!isActiveFarmIdentity() || version !== pondSnapshotVersion) return;
            const intents = mutations.flatMap(mutation => mutation.dailyFeed ? [mutation.dailyFeed] : []);
            const mergedPonds = overlayDailyFeedIntents(applyPendingPondChanges(serverPonds, pendingChangesRef.current), intents)
              .map(normalizePondLifecycle);
            const currentPonds = usePondStore.getState().ponds;
            if (!shouldApplyRemoteCollectionSnapshot({
              fromCache: snapshot.metadata.fromCache,
              incomingCount: serverPonds.length,
              currentCount: currentPonds.length,
            })) return;
            const hasChanges = !initialLoadComplete.current || 
              JSON.stringify(currentPonds) !== JSON.stringify(mergedPonds);

            if (hasChanges) {
              console.log(`Updating local store with ${serverPonds.length} ponds from server`);
              usePondStore.setState({
                ponds: mergedPonds,
                farmCacheStatus: 'ready',
                lastFarmCacheUpdate: snapshot.metadata.fromCache
                  ? usePondStore.getState().lastFarmCacheUpdate
                  : Date.now(),
              });
              initialLoadComplete.current = true;
            }
            persistCurrentFarmSnapshot(snapshot.metadata.fromCache);
            
            setSyncStatus(prev => ({ ...prev, lastSync: new Date(), error: pendingChangesRef.current.length ? prev.error : undefined }));
          } catch (error) {
            console.error('Error processing ponds snapshot:', error);
            setSyncStatus(prev => ({ ...prev, error: 'Error processing pond data' }));
          }
        },
        (error) => {
          console.error('Error listening to ponds:', error);
          setSyncStatus(prev => ({ ...prev, error: 'Unable to sync pond data' }));
        }
      );
      newUnsubscribeCallbacks.push(unsubscribePonds);
      if (__DEV__) console.log('[FirebaseSync] ponds listener attached');

      // Listen to harvest records collection
      const harvestQuery = query(
        collection(db, 'companies', companyId, 'harvestRecords'),
        orderBy('date', 'asc')
      );

      const unsubscribeHarvest = onSnapshot(harvestQuery, { includeMetadataChanges: true },
        (snapshot) => {
          try {
            if (!isActiveFarmIdentity()) return;
            const serverHarvestRecords: HarvestRecord[] = [];
            
            snapshot.forEach(doc => {
              const data = doc.data();
              if (data.voided) return;
              serverHarvestRecords.push({
                id: doc.id,
                date: data.date || '',
                cycleId: data.cycleId,
                cycleName: data.cycleName,
                ponds: data.ponds || []
              });
            });
            const currentState = usePondStore.getState();
            if (!shouldApplyRemoteCollectionSnapshot({
              fromCache: snapshot.metadata.fromCache,
              incomingCount: serverHarvestRecords.length,
              currentCount: currentState.harvestRecords.length,
            })) return;

            usePondStore.setState({
              harvestRecords: applyPendingHarvestChanges(serverHarvestRecords, pendingChangesRef.current),
              farmCacheStatus: 'ready',
              lastFarmCacheUpdate: snapshot.metadata.fromCache
                ? usePondStore.getState().lastFarmCacheUpdate
                : Date.now(),
            });
            persistCurrentFarmSnapshot(snapshot.metadata.fromCache);
            console.log(`Received ${serverHarvestRecords.length} harvest records from server`);
          } catch (error) {
            console.error('Error processing harvest records snapshot:', error);
            setSyncStatus(prev => ({ ...prev, error: 'Error processing harvest data' }));
          }
        },
        (error) => {
          console.error('Error listening to harvest records:', error);
          setSyncStatus(prev => ({ ...prev, error: 'Unable to sync harvest data' }));
        }
      );
      newUnsubscribeCallbacks.push(unsubscribeHarvest);
      if (__DEV__) console.log('[FirebaseSync] harvestRecords listener attached');
    } catch (error) {
      newUnsubscribeCallbacks.splice(0).forEach((unsubscribe) => unsubscribe());
      console.error('Error setting up Firebase listeners:', error);
      setSyncStatus(prev => ({ ...prev, error: 'Failed to connect to Firebase' }));
    }
    return newUnsubscribeCallbacks;
  }, []);

  // Setup real-time listeners when company is available.
  useEffect(() => {
    if (!activeCompanyId || !user?.uid || !pendingStorageReady) {
      listenerOwner.stop();
      initialLoadComplete.current = false;
      return;
    }

    if (__DEV__) console.log(`[FirebaseSync] initialize company ${activeCompanyId}`);
    listenerOwner.start(activeCompanyId, () => setupRealtimeListeners(user.uid, activeCompanyId));

    return () => {
      const didStop = listenerOwner.stop(activeCompanyId);
      if (didStop) {
        initialLoadComplete.current = false;
        if (__DEV__) console.log(`[FirebaseSync] cleanup company ${activeCompanyId}`);
      }
    };
  }, [activeCompanyId, listenerOwner, pendingStorageReady, setupRealtimeListeners, user?.uid]);

  const commitChanges = useCallback(async (changes: PendingChange[]): Promise<string[]> => {
    if (!activeCompanyId || !user || changes.length === 0) return [];

    try {
      const batch = writeBatch(db);
      const processedChanges: string[] = [];
      let hasBatchWrites = false;

      for (const change of changes) {
        try {
          let didProcess = false;

          if (change.type === 'pond') {
            const pondRef = doc(db, 'companies', activeCompanyId, 'ponds', change.data.id);
            
            if (change.action === 'create' || change.action === 'update') {
              // Repair pre-upgrade queued creates without inventing a physical pond.
              const physical = change.action === 'create'
                ? resolvePhysicalPond(change.data, usePondStore.getState().physicalPonds)
                : undefined;
              if (change.action === 'create' && !physical) throw new Error(PHYSICAL_POND_LINK_ERROR);
              const { samplings: _samplings, mortalityRecords: _mortalityRecords,
                physicalPondId: _physicalPondId, pondName: _pondName, ...pondFields } = change.data;
              const pondData = {
                ...removeUndefinedFields(change.action === 'create' ? change.data : pondFields),
                ...(physical ? { physicalPondId: physical.id, pondName: physical.pondName } : {}),
                updatedAt: serverTimestamp(),
                updatedBy: user.uid,
                ...(change.action === 'create' && { 
                  createdAt: serverTimestamp(),
                  createdBy: user.uid 
                })
              };
              batch.set(pondRef, pondData, { merge: change.action === 'update' });
              if (physical && change.data.cycleStatus !== 'ended') {
                batch.update(doc(db, 'companies', activeCompanyId, 'physicalPonds', physical.id), {
                  status: 'active', activePondId: change.data.id,
                  updatedAt: serverTimestamp(), updatedBy: user.uid,
                });
              }
              hasBatchWrites = true;
              didProcess = true;
            } else if (change.action === 'delete') {
              batch.delete(pondRef);
              hasBatchWrites = true;
              didProcess = true;
            }
          } 
          else if (change.type === 'physicalPond') {
            const physicalPondRef = doc(db, 'companies', activeCompanyId, 'physicalPonds', change.data.id);
            if (change.action === 'create') {
              const createPhysicalPond = httpsCallable<
                { companyId: string; pondId: string; pond: PhysicalPond },
                { id: string }
              >(getFunctions(firebaseApp), 'createCompanyPhysicalPond');
              await createPhysicalPond({
                companyId: activeCompanyId,
                pondId: change.data.id,
                pond: change.data,
              });
              didProcess = true;
            } else if (change.action === 'update') {
              const physicalPondData = {
                ...removeUndefinedFields(change.data),
                updatedAt: serverTimestamp(),
                updatedBy: user.uid,
              };
              batch.set(physicalPondRef, physicalPondData, { merge: true });
              hasBatchWrites = true;
              didProcess = true;
            } else if (change.action === 'delete') {
              batch.delete(physicalPondRef);
              hasBatchWrites = true;
              didProcess = true;
            }
          }
          else if (change.type === 'cycle') {
            const cycleRef = doc(db, 'companies', activeCompanyId, 'cycles', change.data.id);
            if (change.action === 'create' || change.action === 'update') {
              const cycleData = {
                ...removeUndefinedFields(change.data),
                updatedAt: serverTimestamp(),
                updatedBy: user.uid,
                ...(change.action === 'create' && {
                  createdAt: serverTimestamp(),
                  createdBy: user.uid,
                }),
              };
              batch.set(cycleRef, cycleData, { merge: change.action === 'update' });
              hasBatchWrites = true;
              didProcess = true;
            } else if (change.action === 'delete') {
              batch.delete(cycleRef);
              hasBatchWrites = true;
              didProcess = true;
            }
          }
          else if (change.type === 'harvest') {
            const harvestRef = change.data.id
              ? doc(db, 'companies', activeCompanyId, 'harvestRecords', change.data.id)
              : doc(collection(db, 'companies', activeCompanyId, 'harvestRecords'));
            const previousHarvestRef = change.action === 'update' && change.previousData?.id
              ? doc(db, 'companies', activeCompanyId, 'harvestRecords', change.previousData.id)
              : harvestRef;

            await runTransaction(db, async (transaction) => {
              const [harvestSnapshot, previousHarvestSnapshot] = await Promise.all([
                transaction.get(harvestRef),
                previousHarvestRef.path === harvestRef.path
                  ? transaction.get(harvestRef)
                  : transaction.get(previousHarvestRef),
              ]);

              if (change.action === 'create' && harvestSnapshot.exists()) return;
              if (change.action === 'delete' && (!harvestSnapshot.exists() || harvestSnapshot.data()?.voided)) return;
              if (change.action === 'update' && (
                harvestSnapshot.exists()
                || !previousHarvestSnapshot.exists()
                || previousHarvestSnapshot.data()?.voided
              )) return;

              const previousRecord = change.action === 'create'
                ? undefined
                : ({ id: previousHarvestSnapshot.id, ...previousHarvestSnapshot.data() } as HarvestRecord);
              const sourceRecord = change.action === 'delete'
                ? previousRecord!
                : (change.data as HarvestRecord);
              const uniquePondIds = Array.from(new Set([
                ...(previousRecord?.ponds.map((pond) => pond.pondId) || []),
                ...sourceRecord.ponds.map((pond) => pond.pondId),
              ]));
              const pondRefs = uniquePondIds.map((pondId) => doc(db, 'companies', activeCompanyId, 'ponds', pondId));
              const pondSnapshots = await Promise.all(pondRefs.map((pondRef) => transaction.get(pondRef)));
              const pondSnapshotsById = new Map(pondSnapshots.map((snapshot) => [snapshot.id, snapshot]));

              if (change.action === 'create' || change.action === 'update') {
                const updatedPondsById = new Map<string, Pond>();
                pondSnapshots.forEach((pondSnapshot) => {
                  if (!pondSnapshot.exists()) throw new Error(`Pond ${pondSnapshot.id} was not found`);
                  updatedPondsById.set(pondSnapshot.id, { id: pondSnapshot.id, ...pondSnapshot.data() } as Pond);
                });
                previousRecord?.ponds.forEach((previousHarvestPond) => {
                  const pondData = updatedPondsById.get(previousHarvestPond.pondId);
                  if (pondData) updatedPondsById.set(
                    previousHarvestPond.pondId,
                    reverseHarvestImpactOnPond(pondData, previousHarvestPond),
                  );
                });

                const canonicalPonds = sourceRecord.ponds.map((harvestPond) => {
                  const pondSnapshot = pondSnapshotsById.get(harvestPond.pondId);
                  if (!pondSnapshot?.exists()) throw new Error(`Pond ${harvestPond.pondId} was not found`);
                  const pondData = updatedPondsById.get(harvestPond.pondId)!;
                  const previousHarvestPond = previousRecord?.ponds.find((pond) => pond.pondId === harvestPond.pondId);
                  if (!getHarvestDateSampling(pondData, sourceRecord.date)) {
                    throw new Error(`Pond ${harvestPond.pondId} requires a positive-MBW sampling on ${sourceRecord.date}`);
                  }
                  const partialHarvestNumber = harvestPond.harvestType === 'partial'
                    ? harvestPond.partialHarvestNumber
                      || (previousHarvestPond?.harvestType === 'partial' ? previousHarvestPond.partialHarvestNumber : undefined)
                      || getNextPartialHarvestNumber(pondData)
                    : undefined;
                  const canonicalHarvestPond = withHarvestReference(pondData, { ...harvestPond, partialHarvestNumber });
                  const updatedPond = applyHarvestImpactToPond(
                    pondData,
                    canonicalHarvestPond,
                    sourceRecord.date,
                    partialHarvestNumber,
                  );
                  updatedPondsById.set(harvestPond.pondId, updatedPond);
                  return canonicalHarvestPond;
                });

                pondSnapshots.forEach((pondSnapshot) => {
                  const updatedPond = updatedPondsById.get(pondSnapshot.id)!;
                  transaction.update(pondSnapshot.ref, {
                    ...removeUndefinedFields({
                      totalHarvestedBiomass: updatedPond.totalHarvestedBiomass,
                      totalHarvestedPopulation: updatedPond.totalHarvestedPopulation,
                      partialHarvestCount: updatedPond.partialHarvestCount,
                      postHarvestBaselineDate: updatedPond.postHarvestBaselineDate,
                      postHarvestRemainingBiomass: updatedPond.postHarvestRemainingBiomass,
                      postHarvestRemainingPopulation: updatedPond.postHarvestRemainingPopulation,
                      postHarvestReferenceSamplingId: updatedPond.postHarvestReferenceSamplingId,
                      postHarvestReferenceSamplingDate: updatedPond.postHarvestReferenceSamplingDate,
                      postHarvestReferenceMbw: updatedPond.postHarvestReferenceMbw,
                    }),
                    updatedAt: serverTimestamp(),
                    updatedBy: user.uid,
                  });
                });

                const revenue = buildHarvestRevenue({ ...sourceRecord, id: harvestRef.id, ponds: canonicalPonds });
                const revenueId = financeSyncDocumentId(revenue.reference);
                transaction.set(harvestRef, {
                  financeEntry: { ...financeSourceEntry(revenue), id: revenueId },
                  ...removeUndefinedFields(sourceRecord),
                  id: harvestRef.id,
                  ponds: canonicalPonds.map(removeUndefinedFields),
                  ...(previousRecord ? { correctedFromHarvestId: previousRecord.id } : {}),
                  createdAt: serverTimestamp(),
                  createdBy: user.uid,
                });
                transaction.set(doc(db, 'companies', activeCompanyId, 'revenues', revenueId), {
                  ...removeUndefinedFields(revenue), companyId: activeCompanyId, addedBy: user.uid, addedByName: user.name || user.email || 'Harvest', timestamp: Date.now(), createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
                }, { merge: true });

                if (previousRecord) {
                  const previousRevenue = buildHarvestRevenue(previousRecord);
                  const previousRevenueId = financeSyncDocumentId(previousRevenue.reference);
                  transaction.update(previousHarvestRef, {
                    voided: true,
                    voidedAt: serverTimestamp(),
                    voidedBy: user.uid,
                    financeEntry: { ...financeSourceEntry(previousRevenue), id: previousRevenueId, voided: true },
                  });
                  transaction.set(doc(db, 'companies', activeCompanyId, 'revenues', previousRevenueId), {
                    ...removeUndefinedFields(previousRevenue), companyId: activeCompanyId, addedBy: user.uid, timestamp: Date.now(), voided: true, voidedAt: serverTimestamp(), voidedBy: user.uid,
                  }, { merge: true });
                }
                return;
              }

              previousRecord!.ponds.forEach((harvestPond) => {
                const pondSnapshot = pondSnapshotsById.get(harvestPond.pondId);
                if (!pondSnapshot?.exists()) return;
                const pondData = { id: pondSnapshot.id, ...pondSnapshot.data() } as Pond;
                const updatedPond = reverseHarvestImpactOnPond(pondData, harvestPond);
                transaction.update(pondSnapshot.ref, {
                  ...removeUndefinedFields({
                    totalHarvestedBiomass: updatedPond.totalHarvestedBiomass,
                    totalHarvestedPopulation: updatedPond.totalHarvestedPopulation,
                    postHarvestRemainingBiomass: updatedPond.postHarvestRemainingBiomass,
                    postHarvestRemainingPopulation: updatedPond.postHarvestRemainingPopulation,
                  }),
                  updatedAt: serverTimestamp(),
                  updatedBy: user.uid,
                });
              });
              const revenue = buildHarvestRevenue(previousRecord!);
              const revenueId = financeSyncDocumentId(revenue.reference);
              transaction.update(harvestRef, { voided: true, voidedAt: serverTimestamp(), voidedBy: user.uid, financeEntry: { ...financeSourceEntry(revenue), id: revenueId, voided: true } });
              transaction.set(doc(db, 'companies', activeCompanyId, 'revenues', revenueId), { ...removeUndefinedFields(revenue), companyId: activeCompanyId, addedBy: user.uid, timestamp: Date.now(), voided: true, voidedAt: serverTimestamp(), voidedBy: user.uid }, { merge: true });
            });
            didProcess = true;
          }
          else if (change.type === 'sampling' && change.pondId) {
            const pondRef = doc(db, 'companies', activeCompanyId, 'ponds', change.pondId);
            await runTransaction(db, async (transaction) => {
              const pondDoc = await transaction.get(pondRef);
              if (!pondDoc.exists()) throw new Error(`Pond ${change.pondId} was not found`);
              const pondData = pondDoc.data();
              let samplings = [...(pondData.samplings || [])];
              
              // Feeding is committed only with its inventory transaction. Old queued
              // sampling snapshots must never overwrite a newer feed allocation.
              const { feedData: _queuedFeed, ...samplingFields } = change.data;
              if (change.action === 'create') {
                if (!samplings.some((sampling) => sampling.id === change.samplingId)) samplings.push(removeUndefinedFields(samplingFields));
              } else if (change.action === 'update' && change.samplingId) {
                const index = samplings.findIndex(s => s.id === change.samplingId);
                if (index >= 0) samplings[index] = removeUndefinedFields({ ...samplingFields, ...(samplings[index].feedData ? { feedData: samplings[index].feedData } : {}) });
                else samplings.push(removeUndefinedFields(samplingFields));
              } else if (change.action === 'delete' && change.samplingId) {
                samplings = samplings.filter(s => s.id !== change.samplingId);
              }
              transaction.update(pondRef, {
                samplings,
                updatedAt: serverTimestamp(),
                updatedBy: user.uid
              });
            });
            didProcess = true;
          }
          else if (change.type === 'mortality' && change.pondId) {
            const pondRef = doc(db, 'companies', activeCompanyId, 'ponds', change.pondId);
            await runTransaction(db, async (transaction) => {
              const pondDoc = await transaction.get(pondRef);
              if (!pondDoc.exists()) throw new Error(`Pond ${change.pondId} was not found`);
              let records = [...(pondDoc.data().mortalityRecords || [])];
              if (change.action === 'delete') {
                records = records.filter((record) => record.id !== change.recordId);
              } else {
                const index = records.findIndex((record) => record.id === change.recordId);
                if (index >= 0) records[index] = removeUndefinedFields(change.data);
                else records.push(removeUndefinedFields(change.data));
              }
              transaction.update(pondRef, {
                mortalityRecords: records,
                updatedAt: serverTimestamp(),
                updatedBy: user.uid,
              });
            });
            didProcess = true;
          }
          
          if (didProcess) processedChanges.push(change.id);
        } catch (error) {
          console.error(`Error processing change ${change.id}:`, error);
          throw error;
        }
      }

      if (hasBatchWrites) await batch.commit();
      return processedChanges;
    } catch (error) {
      console.error('Error syncing changes:', error);
      throw error;
    }
  }, [activeCompanyId, user]);

  // Add pending change to queue
  const addPendingChange = useCallback((change: Omit<PendingChange, 'timestamp'>) => {
    const pendingChange: PendingChange = {
      ...change,
      timestamp: Date.now()
    };

    const nextChanges = [...pendingChangesRef.current, pendingChange];
    pendingChangesRef.current = nextChanges;
    setPendingChanges(nextChanges);
    const queuePersist = persistPendingQueue(nextChanges);
    const cachePersist = activeUserId && activeCompanyId
      ? (() => {
          scheduleFarmCachePersist(activeUserId, activeCompanyId, usePondStore.getState(), Date.now());
          return flushFarmCachePersist(activeUserId, activeCompanyId);
        })()
      : Promise.resolve();

    void Promise.all([queuePersist, cachePersist]).then(() => {
      if (isOnlineRef.current) syncPendingChangesRef.current();
    }).catch((error) => {
      console.error('Unable to protect pending farm change:', error);
      setSyncStatus(prev => ({ ...prev, error: 'Unable to save offline changes locally.' }));
    });
  }, [activeCompanyId, activeUserId, persistPendingQueue]);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = undefined;
  }, []);

  useEffect(() => {
    clearRetryTimer();
    retryAttemptRef.current = 0;
    syncInProgressRef.current = false;
  }, [activeCompanyId, activeUserId, clearRetryTimer]);

  const scheduleSyncRetry = useCallback(() => {
    if (!isOnlineRef.current || retryTimerRef.current || pendingChangesRef.current.length === 0) return;
    const delay = getOfflineRetryDelay(retryAttemptRef.current);
    retryAttemptRef.current += 1;
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = undefined;
      syncPendingChangesRef.current();
    }, delay);
  }, []);

  // Sync pending changes to Firebase
  const syncPendingChanges = useCallback(async () => {
    const changesToSync = [...pendingChangesRef.current].sort((a, b) => a.timestamp - b.timestamp);
    if (!activeCompanyId || !user || changesToSync.length === 0 || !isOnlineRef.current || syncInProgressRef.current) return;

    clearRetryTimer();
    syncInProgressRef.current = true;
    setSyncStatus(prev => ({ ...prev, isSyncing: true, error: undefined }));

    try {
      const blocked = new Set<string>();
      const failures: string[] = [];
      for (const pendingChange of changesToSync) {
        if (usePondStore.getState().currentCompanyId !== activeCompanyId || usePondStore.getState().farmCacheUserId !== user.uid) break;
        const keys = [pendingChange.pondId || (pendingChange.type === 'pond' ? pendingChange.data?.id || pendingChange.recordId || pendingChange.id : `${pendingChange.type}:${pendingChange.data?.id || pendingChange.recordId || pendingChange.id}`),
          ...(pendingChange.type === 'harvest' ? (pendingChange.data?.ponds || []).map((pond: { pondId: string }) => pond.pondId) : [])];
        if (keys.some(key => blocked.has(key))) continue;
        try {
          const processed = await commitChanges([pendingChange]);
          if (!processed.includes(pendingChange.id)) throw new Error('Change was not applied');
          const remaining = pendingChangesRef.current.filter(change => !processed.includes(change.id));
          // Acknowledge each success before advancing to another remote operation.
          pendingChangesRef.current = remaining;
          setPendingChanges(remaining);
          try {
            await persistPendingQueue(remaining);
          } catch (error) {
            // Keep changes enqueued during this write, and retain the acknowledged
            // operation for safe retry if its local acknowledgement failed.
            pendingChangesRef.current = [...pendingChangesRef.current, pendingChange];
            setPendingChanges(pendingChangesRef.current);
            throw error;
          }
          setSyncStatus(previous => ({ ...previous, pendingChanges: pendingChangesRef.current.length, lastSync: new Date() }));
        } catch (error) {
          keys.forEach(key => blocked.add(key));
          failures.push(`${pendingChange.type} ${pendingChange.pondId || pendingChange.data?.pondName || pendingChange.id}: ${error instanceof Error ? error.message : 'Could not sync'}`);
        }
      }
      if (failures.length) {
        setSyncStatus(previous => ({ ...previous, error: `Some changes need attention. ${failures.join('; ')}. Other independent changes have been synchronized. Correct the record or restore access, then retry.` }));
        scheduleSyncRetry();
      } else {
        retryAttemptRef.current = 0;
        setSyncStatus(previous => ({ ...previous, error: undefined }));
      }
    } finally {
      syncInProgressRef.current = false;
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  }, [activeCompanyId, clearRetryTimer, commitChanges, persistPendingQueue, scheduleSyncRetry, user]);

  useEffect(() => {
    syncPendingChangesRef.current = () => { void syncPendingChanges(); };
  }, [syncPendingChanges]);

  // Monitor network status after the sync callback is available.
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: any) => {
      const wasOnline = isOnlineRef.current;
      const isOnline = isUsableNetworkState(state);
      isOnlineRef.current = isOnline;
      setSyncStatus(prev => ({ ...prev, isOnline }));

      if (!isOnline) {
        clearRetryTimer();
        retryAttemptRef.current = 0;
      } else if (!wasOnline && pendingChangesRef.current.length > 0) {
        syncPendingChangesRef.current();
      }
      if (isOnline && activeUserId && activeCompanyId) {
        requestOfflineMutationFlush(activeUserId, activeCompanyId);
      }
    });

    return () => {
      clearRetryTimer();
      unsubscribe();
    };
  }, [activeCompanyId, activeUserId, clearRetryTimer]);

  useEffect(() => {
    if (pendingStorageReady && syncStatus.isOnline && pendingChanges.length > 0) {
      syncPendingChangesRef.current();
    }
  }, [pendingStorageReady, pendingChanges.length, syncStatus.isOnline]);

  // Sync methods
  const syncPond = useCallback((action: 'create' | 'update' | 'delete', pond: Pond) => {
    addPendingChange({
      id: `pond-${pond.id}-${Date.now()}`,
      type: 'pond',
      action,
      data: pond
    });
  }, [addPendingChange]);

  const syncPhysicalPond = useCallback((action: 'create' | 'update' | 'delete', pond: PhysicalPond) => {
    addPendingChange({
      id: `physical-pond-${pond.id}-${Date.now()}`,
      type: 'physicalPond',
      action,
      data: pond
    });
  }, [addPendingChange]);

  const syncSampling = useCallback((action: 'create' | 'update' | 'delete', pondId: string, sampling: Sampling, samplingId?: string) => {
    addPendingChange({
      id: `sampling-${sampling.id}-${Date.now()}`,
      type: 'sampling',
      action,
      data: sampling,
      pondId,
      samplingId: samplingId || sampling.id
    });
  }, [addPendingChange]);

  const syncHarvestRecord = useCallback((action: 'create' | 'update' | 'delete', harvestRecord: HarvestRecord, previousRecord?: HarvestRecord) => {
    addPendingChange({
      id: `harvest-${harvestRecord.id}-${Date.now()}`,
      type: 'harvest',
      action,
      data: harvestRecord,
      previousData: previousRecord,
    });
  }, [addPendingChange]);

  const syncMortality = useCallback((action: 'create' | 'update' | 'delete', pondId: string, record: MortalityRecord, recordId?: string) => {
    addPendingChange({
      id: `mortality-${record.id}-${Date.now()}`,
      type: 'mortality',
      action,
      data: record,
      pondId,
      recordId: recordId || record.id,
    });
  }, [addPendingChange]);

  const syncCycle = useCallback((action: 'create' | 'update' | 'delete', cycle: FarmCycle) => {
    addPendingChange({
      id: `cycle-${cycle.id}-${Date.now()}`,
      type: 'cycle',
      action,
      data: cycle
    });
  }, [addPendingChange]);

  const triggerManualSync = useCallback(() => {
    if (syncStatus.isOnline && !syncStatus.isSyncing && pendingChanges.length > 0) {
      syncPendingChanges();
    }
  }, [syncStatus.isOnline, syncStatus.isSyncing, pendingChanges.length, syncPendingChanges]);

  return {
    syncStatus: { ...syncStatus, pendingChanges: pendingChanges.length },
    syncPond,
    syncPhysicalPond,
    syncSampling,
    syncMortality,
    syncHarvestRecord,
    syncCycle,
    triggerManualSync,
    hasPendingChanges: pendingChanges.length > 0
  };
};

export type FirebaseSyncContextValue = ReturnType<typeof useFirebaseSyncController>;

const FirebaseSyncContext = createContext<FirebaseSyncContextValue | null>(null);

export const FirebaseSyncProvider = ({ children }: { children: ReactNode }) => {
  const { user, company, isBuyer } = useAuth();
  const identity = `${user?.uid ?? 'signed-out'}:${isBuyer ? 'buyer' : company?.id ?? 'no-company'}`;
  return createElement(ScopedFirebaseSyncProvider, { key: identity }, children);
};

const ScopedFirebaseSyncProvider = ({ children }: { children?: ReactNode }) => {
  const firebaseSync = useFirebaseSyncController();
  const { triggerManualSync } = firebaseSync;
  const { user, company, isBuyer } = useAuth();
  const activeCompanyId = user && !isBuyer ? company?.id : undefined;

  useEffect(() => {
    const pondStore = usePondStore.getState();

    if (!activeCompanyId || !user?.uid) {
      pondStore.setFirebaseSync(undefined);
      pondStore.clearData();
      return;
    }

    pondStore.switchAccount(activeCompanyId, company?.timeZone, user.uid);
    pondStore.setFirebaseSync({
      syncPond: firebaseSync.syncPond,
      syncPhysicalPond: firebaseSync.syncPhysicalPond,
      syncSampling: firebaseSync.syncSampling,
      syncMortality: firebaseSync.syncMortality,
      syncHarvestRecord: firebaseSync.syncHarvestRecord,
      syncCycle: firebaseSync.syncCycle,
    });

    return () => {
      const currentStore = usePondStore.getState();
      if (currentStore.currentCompanyId === activeCompanyId) {
        currentStore.setFirebaseSync(undefined);
      }
    };
  }, [
    activeCompanyId,
    company?.timeZone,
    firebaseSync.syncCycle,
    firebaseSync.syncHarvestRecord,
    firebaseSync.syncPhysicalPond,
    firebaseSync.syncPond,
    firebaseSync.syncSampling,
    firebaseSync.syncMortality,
    user?.uid,
  ]);

  useEffect(() => {
    if (!activeCompanyId || !user?.uid) return;

    const flushCache = () => {
      void flushFarmCachePersist(user.uid, activeCompanyId).catch((error) => {
        console.error('[FarmCache] flush failed:', error);
      });
    };
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        flushCache();
      } else {
        triggerManualSync();
        requestOfflineMutationFlush(user.uid, activeCompanyId);
      }
    });

    return () => {
      subscription.remove();
      flushCache();
    };
  }, [activeCompanyId, triggerManualSync, user?.uid]);

  return createElement(FirebaseSyncContext.Provider, { value: firebaseSync }, children);
};

export const useFirebaseSync = (): FirebaseSyncContextValue => {
  const firebaseSync = useContext(FirebaseSyncContext);
  if (!firebaseSync) {
    throw new Error('useFirebaseSync must be used within FirebaseSyncProvider');
  }
  return firebaseSync;
};
