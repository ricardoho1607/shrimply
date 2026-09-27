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
import {
  applyPendingHarvestChanges,
  backfillCommittedHarvestReceipts,
  applyPendingPondChanges,
  createOfflineOperationId,
  isOfflineSyncIdentityCurrent,
  persistOfflineFarmChange,
  reconcileCommittedHarvestPonds,
  removeAcknowledgedPendingChanges,
  replayPendingFarmState,
  sortPendingChanges,
  type PendingFarmChange,
} from '../../shared/offlineWorkspace';
import { getPendingSyncKey } from '../../shared/farmCache';
import {
  getOfflineRetryDelay,
  isUsableNetworkState,
  shouldApplyRemoteCollectionSnapshot,
} from '../../shared/offlineSnapshotPolicy';
import { type DurableOutcome } from '../store/pondStore';

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

type PendingChange = PendingFarmChange;

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

const isHarvestPayloadMatch = (existing: any, expected: any): boolean => {
  if (!existing || !expected) return false;
  const metadata = new Set(['createdAt', 'createdBy', 'updatedAt', 'updatedBy', 'financeEntry', 'operationReceiptId', 'operationPayload', 'correctedFromHarvestId', 'harvestReferenceSamplingId', 'harvestReferenceSamplingDate', 'harvestReferenceMbw']);
  const matchesExpected = (actual: any, wanted: any): boolean => {
    if (wanted instanceof Date) return new Date(actual).getTime() === wanted.getTime();
    if (Array.isArray(wanted)) {
      return Array.isArray(actual) && actual.length === wanted.length
        && wanted.every((item, index) => matchesExpected(actual[index], item));
    }
    if (wanted && typeof wanted === 'object') {
      if (!actual || typeof actual !== 'object') return false;
      return Object.entries(wanted).filter(([key]) => !metadata.has(key))
        .every(([key, value]) => matchesExpected(actual[key], value));
    }
    return actual === wanted;
  };
  return matchesExpected(existing, expected);
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

const replayPendingFarmChanges = (
  userId: string,
  companyId: string,
  changes: PendingChange[],
): void => {
  const state = usePondStore.getState();
  if (state.currentCompanyId !== companyId || state.farmCacheUserId !== userId) return;

  const replayed = replayPendingFarmState(
    {
      ponds: state.ponds,
      physicalPonds: state.physicalPonds,
      cycles: state.cycles,
      harvestRecords: state.harvestRecords,
    },
    changes,
  );

  usePondStore.setState({
    ponds: replayed.ponds.map(normalizePondLifecycle),
    physicalPonds: replayed.physicalPonds,
    cycles: replayed.cycles,
    harvestRecords: replayed.harvestRecords,
  });
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
  const pendingIdentityRef = useRef<string | null>(null);
  const initialLoadComplete = useRef(false);
  const isOnlineRef = useRef(false);
  const syncInProgressRef = useRef(false);
  const retryAttemptRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const syncPendingChangesRef = useRef<() => void>(() => undefined);
  const pendingQueueWriteRef = useRef<Promise<void>>(Promise.resolve());
  const pendingEnqueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const pendingQueueWritesRef = useRef(0);

  const persistPendingQueue = useCallback((changes: PendingChange[]): Promise<void> => {
    if (!activeUserId || !pendingStorageKey || !pendingStorageReady || pendingIdentityRef.current !== pendingStorageKey) {
      return Promise.reject(new Error('Pending queue identity is not ready.'));
    }
    const write = pendingQueueWriteRef.current.catch(() => undefined).then(async () => {
      if (changes.length === 0) await removeProtectedItem(pendingStorageKey);
      else await writeProtectedItem(activeUserId, pendingStorageKey, JSON.stringify(changes));
    });
    pendingQueueWriteRef.current = write;
    return write;
  }, [activeUserId, pendingStorageKey, pendingStorageReady]);



  useEffect(() => {
    let cancelled = false;
    pendingIdentityRef.current = null;
    pendingChangesRef.current = [];

    const loadPendingChanges = async () => {

      if (!pendingStorageKey || !activeUserId) {
        pendingIdentityRef.current = null;
        setPendingChanges([]);
        setPendingStorageReady(true);
        return;
      }

      try {
        const raw = await readProtectedItem(activeUserId, pendingStorageKey);
        if (cancelled) return;
        pendingIdentityRef.current = pendingStorageKey;
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
                appliedHarvestOperationId: data.appliedHarvestOperationId,
                appliedHarvestOperationIds: data.appliedHarvestOperationIds,
                reversedHarvestOperationIds: data.reversedHarvestOperationIds,
                lastAppliedHarvestId: data.lastAppliedHarvestId,
                appliedHarvestIds: data.appliedHarvestIds,
              }));
            });

            // Only update if this is the initial load or if we have actual changes
            const mutations = await listOfflineMutations(userId, companyId);
            if (!isActiveFarmIdentity() || version !== pondSnapshotVersion) return;
            const intents = mutations.flatMap(mutation => mutation.dailyFeed ? [mutation.dailyFeed] : []);
            const mergedPonds = overlayDailyFeedIntents(applyPendingPondChanges(serverPonds, sortPendingChanges(pendingChangesRef.current)), intents)
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

  const commitChanges = useCallback(async (changes: PendingChange[]): Promise<{ processedIds: string[]; committedLegacyPonds: Record<string, Record<string, any>> }> => {
    if (!activeCompanyId || !user || changes.length === 0) return { processedIds: [], committedLegacyPonds: {} };

    try {
      const batch = writeBatch(db);
      const processedChanges: string[] = [];
      const committedLegacyPonds: Record<string, Record<string, any>> = {};
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
            const changeLegacyPonds: Record<string, Record<string, any>> = {};
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

              const backfillLegacyPondReceipts = async (committedRecord: any, previousRecord?: any) => {
                const pondIds = Array.from(new Set([
                  ...(committedRecord?.ponds || []).map((line: any) => line.pondId),
                  ...(previousRecord?.ponds || []).map((line: any) => line.pondId),
                ]));
                const snapshots = await Promise.all(pondIds.map((pondId) => transaction.get(
                  doc(db, 'companies', activeCompanyId, 'ponds', pondId),
                )));
                snapshots.forEach((snapshot) => {
                  if (!snapshot.exists()) return;
                  changeLegacyPonds[snapshot.id] = snapshot.data() || {};
                  const [receiptPond] = backfillCommittedHarvestReceipts<Record<string, any>>(
                    [{ id: snapshot.id, ...snapshot.data() }], change, committedRecord, previousRecord,
                  );
                  transaction.update(snapshot.ref, removeUndefinedFields({
                    appliedHarvestOperationId: receiptPond.appliedHarvestOperationId,
                    appliedHarvestOperationIds: receiptPond.appliedHarvestOperationIds,
                    reversedHarvestOperationIds: receiptPond.reversedHarvestOperationIds,
                    appliedHarvestIds: receiptPond.appliedHarvestIds,
                    lastAppliedHarvestId: receiptPond.lastAppliedHarvestId,
                  }));
                });
              };

              if (change.action === 'create' && harvestSnapshot.exists()) {
                const existingData = harvestSnapshot.data() || {};
                if ((!existingData.operationReceiptId || existingData.operationReceiptId === change.id)
                  && isHarvestPayloadMatch(existingData.operationPayload || existingData, change.data)) {
                  await backfillLegacyPondReceipts({ id: harvestSnapshot.id, ...existingData });
                  if (!existingData.operationReceiptId) transaction.update(harvestRef, {
                    operationReceiptId: change.id,
                  });
                  didProcess = true;
                  return;
                }
                throw new Error(`Cannot create harvest: target record ${harvestRef.id} already exists with differing data`);
              }
              if (change.action === 'delete' && (!harvestSnapshot.exists() || harvestSnapshot.data()?.voided)) {
                if (harvestSnapshot.exists() && harvestSnapshot.data()?.voidedByOperationId
                  && harvestSnapshot.data()?.voidedByOperationId !== change.id) {
                  throw new Error(`Cannot delete harvest ${harvestRef.id}: record was voided by another operation`);
                }
                if (harvestSnapshot.exists() && !harvestSnapshot.data()?.voidedByOperationId
                  && !isHarvestPayloadMatch(harvestSnapshot.data()?.operationPayload || harvestSnapshot.data(), change.data)) {
                  throw new Error(`Cannot delete harvest ${harvestRef.id}: voided record payload does not match queued operation`);
                }
                await backfillLegacyPondReceipts(
                  harvestSnapshot.exists()
                    ? { id: harvestSnapshot.id, ...harvestSnapshot.data() }
                    : change.data,
                );
                if (harvestSnapshot.exists() && !harvestSnapshot.data()?.voidedByOperationId) {
                  transaction.update(harvestRef, { voidedByOperationId: change.id });
                }
                didProcess = true;
                return;
              }
              if (change.action === 'update') {
                if (harvestRef.path === previousHarvestRef.path) {
                  throw new Error(`Cannot update harvest ${previousHarvestRef.id}: queued replacement uses the original document ID`);
                }
                if (harvestSnapshot.exists()) {
                  const currentReplacement = harvestSnapshot.data() || {};
                  if ((!currentReplacement.operationReceiptId || currentReplacement.operationReceiptId === change.id)
                    && currentReplacement.correctedFromHarvestId === previousHarvestSnapshot.id
                    && isHarvestPayloadMatch(currentReplacement.operationPayload || currentReplacement, change.data)) {
                    await backfillLegacyPondReceipts(
                      { id: harvestSnapshot.id, ...currentReplacement },
                      previousHarvestSnapshot.exists() ? { id: previousHarvestSnapshot.id, ...previousHarvestSnapshot.data() } : change.previousData,
                    );
                    if (!currentReplacement.operationReceiptId) {
                      transaction.update(harvestRef, {
                        operationReceiptId: change.id,
                      });
                    }
                    if (previousHarvestSnapshot.exists() && previousHarvestSnapshot.data()?.voided
                      && !previousHarvestSnapshot.data()?.voidedByOperationId) {
                      transaction.update(previousHarvestRef, { voidedByOperationId: change.id });
                    }
                    didProcess = true;
                    return;
                  }
                }
                if (!previousHarvestSnapshot.exists() || previousHarvestSnapshot.data()?.voided) {
                  throw new Error(`Cannot update harvest ${previousHarvestRef.id}: record not found or already voided`);
                }
                if (change.previousData && !isHarvestPayloadMatch(previousHarvestSnapshot.data(), change.previousData)) {
                  throw new Error(`Cannot update harvest ${previousHarvestRef.id}: record was concurrently modified`);
                }
                if (harvestRef.path !== previousHarvestRef.path && harvestSnapshot.exists()) {
                  throw new Error(`Cannot update harvest: target record ${harvestRef.id} already exists`);
                }
              }

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
                  const pondSnapshotData = pondSnapshot.data() || {};
                  const currentAppliedIds = Array.isArray(pondSnapshotData.appliedHarvestIds)
                    ? pondSnapshotData.appliedHarvestIds
                    : [];
                  const currentAppliedOps = Array.isArray(pondSnapshotData.appliedHarvestOperationIds)
                    ? pondSnapshotData.appliedHarvestOperationIds
                    : [];
                  const currentReversedOps = Array.isArray(pondSnapshotData.reversedHarvestOperationIds)
                    ? pondSnapshotData.reversedHarvestOperationIds
                    : [];
                  const changedByNextHarvest = sourceRecord.ponds.some((item) => item.pondId === pondSnapshot.id);
                  const nextAppliedIds = [
                    ...currentAppliedIds.filter((id: string) => id !== previousRecord?.id && id !== harvestRef.id),
                    ...(changedByNextHarvest ? [harvestRef.id] : []),
                  ];
                  const nextAppliedOps = currentAppliedOps.includes(change.id) ? currentAppliedOps : [...currentAppliedOps, change.id];
                  const nextReversedOps = !changedByNextHarvest && previousRecord
                    ? (currentReversedOps.includes(change.id) ? currentReversedOps : [...currentReversedOps, change.id])
                    : currentReversedOps;
                  const authoritativeHarvestFields = removeUndefinedFields({
                    totalHarvestedBiomass: updatedPond.totalHarvestedBiomass,
                    totalHarvestedPopulation: updatedPond.totalHarvestedPopulation,
                    partialHarvestCount: updatedPond.partialHarvestCount,
                    postHarvestBaselineDate: updatedPond.postHarvestBaselineDate,
                    postHarvestRemainingBiomass: updatedPond.postHarvestRemainingBiomass,
                    postHarvestRemainingPopulation: updatedPond.postHarvestRemainingPopulation,
                    postHarvestReferenceSamplingId: updatedPond.postHarvestReferenceSamplingId,
                    postHarvestReferenceSamplingDate: updatedPond.postHarvestReferenceSamplingDate,
                    postHarvestReferenceMbw: updatedPond.postHarvestReferenceMbw,
                    appliedHarvestOperationId: change.id,
                    appliedHarvestOperationIds: nextAppliedOps,
                    reversedHarvestOperationIds: nextReversedOps,
                    lastAppliedHarvestId: changedByNextHarvest
                      ? harvestRef.id
                      : (pondSnapshotData.lastAppliedHarvestId === previousRecord?.id
                        ? (nextAppliedIds[nextAppliedIds.length - 1] ?? null)
                        : pondSnapshotData.lastAppliedHarvestId ?? null),
                    appliedHarvestIds: nextAppliedIds,
                  });
                  changeLegacyPonds[pondSnapshot.id] = authoritativeHarvestFields;
                  transaction.update(pondSnapshot.ref, {
                    ...authoritativeHarvestFields,
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
                  operationReceiptId: change.id,
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
                    voidedByOperationId: change.id,
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
                const currentAppliedIds = Array.isArray(pondSnapshot.data()?.appliedHarvestIds)
                  ? pondSnapshot.data().appliedHarvestIds
                  : [];
                const nextAppliedIds = currentAppliedIds.filter((id: string) => id !== previousRecord?.id);
                const currentReversedOps = Array.isArray(pondSnapshot.data()?.reversedHarvestOperationIds)
                  ? pondSnapshot.data().reversedHarvestOperationIds
                  : [];
                const nextReversedOps = currentReversedOps.includes(change.id) ? currentReversedOps : [...currentReversedOps, change.id];
                const authoritativeHarvestFields = removeUndefinedFields({
                  totalHarvestedBiomass: updatedPond.totalHarvestedBiomass,
                  totalHarvestedPopulation: updatedPond.totalHarvestedPopulation,
                  partialHarvestCount: updatedPond.partialHarvestCount,
                  postHarvestBaselineDate: updatedPond.postHarvestBaselineDate,
                  postHarvestRemainingBiomass: updatedPond.postHarvestRemainingBiomass,
                  postHarvestRemainingPopulation: updatedPond.postHarvestRemainingPopulation,
                  postHarvestReferenceSamplingId: updatedPond.postHarvestReferenceSamplingId,
                  postHarvestReferenceSamplingDate: updatedPond.postHarvestReferenceSamplingDate,
                  postHarvestReferenceMbw: updatedPond.postHarvestReferenceMbw,
                  appliedHarvestOperationId: change.id,
                  appliedHarvestOperationIds: pondSnapshot.data()?.appliedHarvestOperationIds || [],
                  reversedHarvestOperationIds: nextReversedOps,
                  lastAppliedHarvestId: pondSnapshot.data()?.lastAppliedHarvestId === previousRecord!.id
                    ? (nextAppliedIds[nextAppliedIds.length - 1] ?? null)
                    : pondSnapshot.data()?.lastAppliedHarvestId ?? null,
                  appliedHarvestIds: nextAppliedIds,
                });
                changeLegacyPonds[pondSnapshot.id] = authoritativeHarvestFields;
                transaction.update(pondSnapshot.ref, {
                  ...authoritativeHarvestFields,
                  updatedAt: serverTimestamp(),
                  updatedBy: user.uid,
                });
              });
              const revenue = buildHarvestRevenue(previousRecord!);
              const revenueId = financeSyncDocumentId(revenue.reference);
              transaction.update(harvestRef, { voided: true, voidedAt: serverTimestamp(), voidedBy: user.uid, voidedByOperationId: change.id, financeEntry: { ...financeSourceEntry(revenue), id: revenueId, voided: true } });
              transaction.set(doc(db, 'companies', activeCompanyId, 'revenues', revenueId), { ...removeUndefinedFields(revenue), companyId: activeCompanyId, addedBy: user.uid, timestamp: Date.now(), voided: true, voidedAt: serverTimestamp(), voidedBy: user.uid }, { merge: true });
            });
            Object.assign(committedLegacyPonds, changeLegacyPonds);
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
      return { processedIds: processedChanges, committedLegacyPonds };
    } catch (error) {
      console.error('Error syncing changes:', error);
      throw error;
    }
  }, [activeCompanyId, user]);

  // Queue acceptance is serialized so concurrent form submits cannot overwrite each other's disk queue.
  const addPendingChange = useCallback((change: Omit<PendingChange, 'timestamp'>): Promise<DurableOutcome> => {
    if (!activeUserId || !activeCompanyId) {
      return Promise.resolve({ success: false, status: 'rejected', error: 'User or company is not authenticated.' });
    }
    if (!pendingStorageReady) {
      return Promise.resolve({ success: false, status: 'rejected', error: 'Local storage is not ready.' });
    }
    if (pendingIdentityRef.current !== pendingStorageKey) {
      return Promise.resolve({ success: false, status: 'rejected', error: 'Farm data is still loading for this account.' });
    }

    pendingQueueWritesRef.current += 1;
    const enqueue = pendingEnqueueRef.current.catch(() => undefined).then(async (): Promise<DurableOutcome> => {
      const pendingChange: PendingChange = { ...change, timestamp: Date.now() };
      const store = usePondStore.getState();
      if (pendingIdentityRef.current !== pendingStorageKey
        || store.currentCompanyId !== activeCompanyId || store.farmCacheUserId !== activeUserId) {
        return { success: false, status: 'rejected', error: 'Farm account changed before the change could be saved.' };
      }
      const previous = pendingChangesRef.current;
      const next = [...previous.filter((c) => c.id !== pendingChange.id), pendingChange];
      pendingChangesRef.current = next;
      setPendingChanges(next);
      const persistence = await persistOfflineFarmChange(
        // This is the acceptance boundary. Do not report success or permit flush until disk confirms it.
        () => persistPendingQueue(next),
        async () => {
          if (pendingIdentityRef.current !== pendingStorageKey) return;
          const currentState = usePondStore.getState();
          if (currentState.currentCompanyId !== activeCompanyId || currentState.farmCacheUserId !== activeUserId) return;
          scheduleFarmCachePersist(activeUserId, activeCompanyId, currentState, Date.now());
          await flushFarmCachePersist(activeUserId, activeCompanyId);
        },
        () => persistPendingQueue(previous),
      );
      if (!persistence.durable) {
        const error = persistence.queueError;
        if (pendingIdentityRef.current !== pendingStorageKey) {
          return { success: false, status: 'rejected', error: 'Farm account changed while saving locally.' };
        }
        pendingChangesRef.current = previous;
        setPendingChanges(previous);
        if (persistence.rollbackError) {
          console.error('Queue write and rollback both failed; change rejected and memory restored:', persistence.rollbackError);
        }
        const errorMessage = error instanceof Error ? error.message : 'Unable to save offline changes locally.';
        setSyncStatus(prev => ({ ...prev, error: errorMessage }));
        return { success: false, status: 'rejected', error: errorMessage };
      }
      if (persistence.cacheError) {
        console.error('Farm cache write failed; durable queued change will replay:', persistence.cacheError);
        setSyncStatus(prev => ({ ...prev, error: 'Change is saved locally and will replay; farm cache refresh failed.' }));
      }
      if (pendingIdentityRef.current !== pendingStorageKey) {
        return { success: true, status: 'pending', error: 'Saved to the previous account queue; sync will resume when that account is active.' };
      }
      return { success: true, status: 'pending' };
    });
    pendingEnqueueRef.current = enqueue;
    return enqueue.finally(() => {
      pendingQueueWritesRef.current = Math.max(0, pendingQueueWritesRef.current - 1);
      if (pendingQueueWritesRef.current === 0 && isOnlineRef.current
        && pendingIdentityRef.current === pendingStorageKey) syncPendingChangesRef.current();
    });
  }, [activeCompanyId, activeUserId, pendingStorageKey, pendingStorageReady, persistPendingQueue]);

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
    const changesToSync = sortPendingChanges([...pendingChangesRef.current]);
    if (!pendingStorageKey || pendingQueueWritesRef.current > 0 || pendingIdentityRef.current !== pendingStorageKey) return;
    if (!activeCompanyId || !user || changesToSync.length === 0 || !isOnlineRef.current || syncInProgressRef.current) return;

    clearRetryTimer();
    syncInProgressRef.current = true;
    const syncIdentity = { companyId: activeCompanyId, userId: user.uid, storageKey: pendingStorageKey };
    const stillOwnsSyncIdentity = () => isOfflineSyncIdentityCurrent(
      usePondStore.getState(),
      syncIdentity,
      pendingIdentityRef.current,
    );
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
          if (!stillOwnsSyncIdentity()) break;
          if (!processed.processedIds.includes(pendingChange.id)) throw new Error('Change was not applied');
          const pendingForOverlay = removeAcknowledgedPendingChanges(pendingChangesRef.current, processed.processedIds);
          if (pendingChange.type === 'harvest') {
            if (!stillOwnsSyncIdentity()) break;
            usePondStore.setState((state) => {
              const committedBaseline = backfillCommittedHarvestReceipts(
                reconcileCommittedHarvestPonds(state.ponds, processed.committedLegacyPonds),
                pendingChange,
                pendingChange.data,
                pendingChange.action === 'update' ? pendingChange.previousData : undefined,
              );
              return {
                ponds: applyPendingPondChanges(
                  committedBaseline,
                  pendingForOverlay.filter(change => change.type === 'harvest'),
                ),
              };
            });
            if (!stillOwnsSyncIdentity()) break;
            const reconciledState = usePondStore.getState();
            scheduleFarmCachePersist(user.uid, activeCompanyId, reconciledState, Date.now());
            await flushFarmCachePersist(user.uid, activeCompanyId);
            if (!stillOwnsSyncIdentity()) break;
          }
          if (!stillOwnsSyncIdentity()) break;
          // Serialize acknowledgement with enqueues, then derive from the live queue
          // after cache persistence so changes accepted while awaiting are retained.
          const acknowledgement = pendingEnqueueRef.current.catch(() => undefined).then(async () => {
            if (!stillOwnsSyncIdentity()) return;
            const remaining = removeAcknowledgedPendingChanges(pendingChangesRef.current, processed.processedIds);
            pendingChangesRef.current = remaining;
            setPendingChanges(remaining);
            try {
              await persistPendingQueue(remaining);
            } catch (error) {
              if (!stillOwnsSyncIdentity()) return;
              const restored = pendingChangesRef.current.some(change => processed.processedIds.includes(change.id))
                ? pendingChangesRef.current
                : [...pendingChangesRef.current, ...changesToSync.filter(change => processed.processedIds.includes(change.id))];
              pendingChangesRef.current = restored;
              setPendingChanges(restored);
              try {
                await persistPendingQueue(restored);
              } catch (restoreError) {
                console.error('Unable to persist retryable queue after acknowledgement failure:', restoreError);
              }
              throw error;
            }
          });
          pendingEnqueueRef.current = acknowledgement;
          await acknowledgement;
          if (!stillOwnsSyncIdentity()) break;
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
      if (pendingChangesRef.current.length > 0 && !retryTimerRef.current
        && isOnlineRef.current && stillOwnsSyncIdentity()) {
        setTimeout(() => syncPendingChangesRef.current(), 0);
      }
    }
  }, [activeCompanyId, clearRetryTimer, commitChanges, pendingStorageKey, persistPendingQueue, scheduleSyncRetry, user]);

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
  const syncPond = useCallback((action: 'create' | 'update' | 'delete', pond: Pond, operationId?: string) => {
    addPendingChange({
      id: operationId || createOfflineOperationId(`pond-${pond.id}-${action}`),
      type: 'pond',
      action,
      data: pond
    });
  }, [addPendingChange]);

  const syncPhysicalPond = useCallback((action: 'create' | 'update' | 'delete', pond: PhysicalPond, operationId?: string) => {
    addPendingChange({
      id: operationId || createOfflineOperationId(`physical-pond-${pond.id}-${action}`),
      type: 'physicalPond',
      action,
      data: pond
    });
  }, [addPendingChange]);

  const syncSampling = useCallback((action: 'create' | 'update' | 'delete', pondId: string, sampling: Sampling, samplingId?: string, operationId?: string): Promise<DurableOutcome> => {
    return addPendingChange({
      id: operationId || createOfflineOperationId(`sampling-${sampling.id}-${action}`),
      type: 'sampling',
      action,
      data: sampling,
      pondId,
      samplingId: samplingId || sampling.id
    });
  }, [addPendingChange]);

  const syncHarvestRecord = useCallback((action: 'create' | 'update' | 'delete', harvestRecord: HarvestRecord, previousRecord?: HarvestRecord, operationId?: string): Promise<DurableOutcome> => {
    return addPendingChange({
      id: operationId || createOfflineOperationId(`harvest-${harvestRecord.id}-${action}`),
      type: 'harvest',
      action,
      data: harvestRecord,
      previousData: previousRecord,
    });
  }, [addPendingChange]);

  const syncMortality = useCallback((action: 'create' | 'update' | 'delete', pondId: string, record: MortalityRecord, recordId?: string, operationId?: string) => {
    addPendingChange({
      id: operationId || createOfflineOperationId(`mortality-${record.id}-${action}`),
      type: 'mortality',
      action,
      data: record,
      pondId,
      recordId: recordId || record.id,
    });
  }, [addPendingChange]);

  const syncCycle = useCallback((action: 'create' | 'update' | 'delete', cycle: FarmCycle, operationId?: string) => {
    addPendingChange({
      id: operationId || createOfflineOperationId(`cycle-${cycle.id}-${action}`),
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
    pendingChanges,
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
