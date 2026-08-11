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
  getDoc,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { usePondStore, Pond, HarvestRecord, Sampling, FarmCycle, PhysicalPond, normalizePondLifecycle } from './../store/pondStore';
import { AppState, Platform } from 'react-native';
import {
  applyHarvestImpactToPond,
  getNextPartialHarvestNumber,
  reverseHarvestImpactOnPond,
  withHarvestReference,
} from '../../shared/harvestCalculations';
import { createFirebaseSyncListenerOwner } from './firebaseSyncListenerOwner';
import { flushFarmCachePersist, scheduleFarmCachePersist } from '../services/farmCache';
import { readProtectedItem, removeProtectedItem, writeProtectedItem } from '../services/protectedStorage';
import { getPendingSyncKey } from '../../shared/farmCache';

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
  type: 'pond' | 'physicalPond' | 'sampling' | 'harvest' | 'cycle';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  pondId?: string;
  samplingId?: string;
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

  useEffect(() => {
    pendingChangesRef.current = pendingChanges;
    setSyncStatus(prev => (
      prev.pendingChanges === pendingChanges.length
        ? prev
        : { ...prev, pendingChanges: pendingChanges.length }
    ));
  }, [pendingChanges]);

  useEffect(() => {
    let cancelled = false;

    const loadPendingChanges = async () => {
      setPendingStorageReady(false);
      pendingChangesRef.current = [];
      setPendingChanges([]);

      if (!pendingStorageKey || !activeUserId) {
        setPendingStorageReady(true);
        return;
      }

      try {
        const raw = await readProtectedItem(activeUserId, pendingStorageKey);
        if (cancelled) return;
        const parsed = raw ? JSON.parse(raw) : [];
        const restoredChanges = Array.isArray(parsed) ? parsed : [];
        setPendingChanges(restoredChanges);
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
  }, [activeUserId, pendingStorageKey]);

  useEffect(() => {
    setSyncStatus((previous) => ({
      ...previous,
      isSyncing: false,
      lastSync: undefined,
      pendingChanges: 0,
      error: undefined,
    }));
  }, [activeCompanyId, user?.uid]);

  useEffect(() => {
    if (!activeUserId || !pendingStorageKey || !pendingStorageReady) return;

    const persistPendingChanges = async () => {
      try {
        if (pendingChanges.length === 0) {
          await removeProtectedItem(pendingStorageKey);
        } else {
          await writeProtectedItem(activeUserId, pendingStorageKey, JSON.stringify(pendingChanges));
        }
      } catch (error) {
        console.error('Error saving pending sync queue:', error);
        setSyncStatus(prev => ({ ...prev, error: 'Unable to save offline changes locally.' }));
      }
    };

    persistPendingChanges();
  }, [activeUserId, pendingChanges, pendingStorageKey, pendingStorageReady]);

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

      const unsubscribePonds = onSnapshot(pondsQuery, { includeMetadataChanges: true },
        (snapshot) => {
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
            const mergedPonds = applyPendingEntityChanges(serverPonds, pendingChangesRef.current, 'pond')
              .map(normalizePondLifecycle);
            const currentPonds = usePondStore.getState().ponds;
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
            
            setSyncStatus(prev => ({ ...prev, lastSync: new Date(), error: undefined }));
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
              serverHarvestRecords.push({
                id: doc.id,
                date: data.date || '',
                cycleId: data.cycleId,
                cycleName: data.cycleName,
                ponds: data.ponds || []
              });
            });

            usePondStore.setState({
              harvestRecords: applyPendingEntityChanges(serverHarvestRecords, pendingChangesRef.current, 'harvest'),
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
              const pondData = {
                ...removeUndefinedFields(change.data),
                updatedAt: serverTimestamp(),
                updatedBy: user.uid,
                ...(change.action === 'create' && { 
                  createdAt: serverTimestamp(),
                  createdBy: user.uid 
                })
              };
              batch.set(pondRef, pondData, { merge: change.action === 'update' });
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
            if (change.action === 'create' || change.action === 'update') {
              const physicalPondData = {
                ...removeUndefinedFields(change.data),
                updatedAt: serverTimestamp(),
                updatedBy: user.uid,
                ...(change.action === 'create' && {
                  createdAt: serverTimestamp(),
                  createdBy: user.uid,
                }),
              };
              batch.set(physicalPondRef, physicalPondData, { merge: change.action === 'update' });
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
            const harvestRef = change.data.id ? 
              doc(db, 'companies', activeCompanyId, 'harvestRecords', change.data.id) :
              doc(collection(db, 'companies', activeCompanyId, 'harvestRecords'));

            await runTransaction(db, async (transaction) => {
              const harvestSnapshot = await transaction.get(harvestRef);

              if (change.action === 'create' && harvestSnapshot.exists()) return;
              if (change.action === 'delete' && !harvestSnapshot.exists()) return;

              const sourceRecord = change.action === 'delete'
                ? ({ id: harvestSnapshot.id, ...harvestSnapshot.data() } as HarvestRecord)
                : (change.data as HarvestRecord);
              const uniquePondIds = Array.from(new Set(sourceRecord.ponds.map((pond) => pond.pondId)));
              const pondRefs = uniquePondIds.map((pondId) => doc(db, 'companies', activeCompanyId, 'ponds', pondId));
              const pondSnapshots = await Promise.all(pondRefs.map((pondRef) => transaction.get(pondRef)));
              const pondSnapshotsById = new Map(pondSnapshots.map((snapshot) => [snapshot.id, snapshot]));

              if (change.action === 'create') {
                const canonicalPonds = sourceRecord.ponds.map((harvestPond) => {
                  const pondSnapshot = pondSnapshotsById.get(harvestPond.pondId);
                  if (!pondSnapshot?.exists()) throw new Error(`Pond ${harvestPond.pondId} was not found`);
                  const pondData = { id: pondSnapshot.id, ...pondSnapshot.data() } as Pond;
                  const partialHarvestNumber = harvestPond.harvestType === 'partial'
                    ? getNextPartialHarvestNumber(pondData)
                    : undefined;
                  const canonicalHarvestPond = withHarvestReference(pondData, { ...harvestPond, partialHarvestNumber });
                  const updatedPond = applyHarvestImpactToPond(
                    pondData,
                    canonicalHarvestPond,
                    sourceRecord.date,
                    partialHarvestNumber,
                  );

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

                  return canonicalHarvestPond;
                });

                transaction.set(harvestRef, {
                  ...removeUndefinedFields(sourceRecord),
                  id: harvestRef.id,
                  ponds: canonicalPonds.map(removeUndefinedFields),
                  createdAt: serverTimestamp(),
                  createdBy: user.uid,
                });
                return;
              }

              sourceRecord.ponds.forEach((harvestPond) => {
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
              transaction.delete(harvestRef);
            });
            didProcess = true;
          }
          else if (change.type === 'sampling' && change.pondId) {
            const pondRef = doc(db, 'companies', activeCompanyId, 'ponds', change.pondId);
            const pondDoc = await getDoc(pondRef);
            
            if (pondDoc.exists()) {
              const pondData = pondDoc.data();
              let samplings = [...(pondData.samplings || [])];
              
              if (change.action === 'create') {
                samplings.push(change.data);
              } else if (change.action === 'update' && change.samplingId) {
                const index = samplings.findIndex(s => s.id === change.samplingId);
                if (index >= 0) {
                  samplings[index] = { ...samplings[index], ...change.data };
                }
              } else if (change.action === 'delete' && change.samplingId) {
                samplings = samplings.filter(s => s.id !== change.samplingId);
              }
              
              batch.update(pondRef, {
                samplings,
                updatedAt: serverTimestamp(),
                updatedBy: user.uid
              });
              hasBatchWrites = true;
              didProcess = true;
            }
          }
          
          if (didProcess) processedChanges.push(change.id);
        } catch (error) {
          console.error(`Error processing change ${change.id}:`, error);
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

    pendingChangesRef.current = [...pendingChangesRef.current, pendingChange];
    setPendingChanges(pendingChangesRef.current);

    if (!syncStatus.isOnline) {
      setSyncStatus(prev => ({ ...prev, error: undefined }));
      return;
    }

    commitChanges([pendingChange])
      .then((processedChanges) => {
        if (processedChanges.length === 0) return;
        console.log(`Synced ${processedChanges.length} changes to server`);
        setPendingChanges(prev => prev.filter(c => !processedChanges.includes(c.id)));
        setSyncStatus(prev => ({
          ...prev,
          lastSync: new Date(),
          error: undefined,
        }));
      })
      .catch(() => {
        setSyncStatus(prev => ({
          ...prev,
          error: 'Sync failed. Please try again.',
        }));
      });
  }, [commitChanges, syncStatus.isOnline]);

  // Sync pending changes to Firebase
  const syncPendingChanges = useCallback(async () => {
    if (!activeCompanyId || !user || pendingChanges.length === 0 || syncStatus.isSyncing) return;

    setSyncStatus(prev => ({ ...prev, isSyncing: true, error: undefined }));

    try {
      const processedChanges: string[] = [];
      for (const pendingChange of [...pendingChanges].sort((a, b) => a.timestamp - b.timestamp)) {
        const processed = await commitChanges([pendingChange]);
        processedChanges.push(...processed);
      }
      if (processedChanges.length > 0) {
        console.log(`Synced ${processedChanges.length} changes to server`);
      }
      
      setPendingChanges(prev => prev.filter(c => !processedChanges.includes(c.id)));
      setSyncStatus(prev => ({ 
        ...prev, 
        pendingChanges: Math.max(0, prev.pendingChanges - processedChanges.length),
        lastSync: new Date()
      }));
      
    } catch {
      setSyncStatus(prev => ({ 
        ...prev, 
        error: 'Sync failed. Please try again.' 
      }));
    } finally {
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  }, [activeCompanyId, commitChanges, user, pendingChanges, syncStatus.isSyncing]);

  // Monitor network status after the sync callback is available.
  useEffect(() => {
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = NetInfo.addEventListener((state: any) => {
      const isOnline = state.isConnected === true;
      setSyncStatus(prev => ({ ...prev, isOnline }));

      if (isOnline && pendingChangesRef.current.length > 0) {
        retryTimer = setTimeout(() => syncPendingChanges(), 1000);
      }
    });

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      unsubscribe();
    };
  }, [syncPendingChanges]);

  useEffect(() => {
    if (pendingStorageReady && syncStatus.isOnline && !syncStatus.isSyncing && pendingChanges.length > 0) {
      syncPendingChanges();
    }
  }, [pendingStorageReady, pendingChanges.length, syncPendingChanges, syncStatus.isOnline, syncStatus.isSyncing]);

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

  const syncHarvestRecord = useCallback((action: 'create' | 'delete', harvestRecord: HarvestRecord) => {
    addPendingChange({
      id: `harvest-${harvestRecord.id}-${Date.now()}`,
      type: 'harvest',
      action,
      data: harvestRecord
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
    syncStatus,
    syncPond,
    syncPhysicalPond,
    syncSampling,
    syncHarvestRecord,
    syncCycle,
    triggerManualSync,
    hasPendingChanges: pendingChanges.length > 0
  };
};

export type FirebaseSyncContextValue = ReturnType<typeof useFirebaseSyncController>;

const FirebaseSyncContext = createContext<FirebaseSyncContextValue | null>(null);

export const FirebaseSyncProvider = ({ children }: { children: ReactNode }) => {
  const firebaseSync = useFirebaseSyncController();
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
      if (nextState !== 'active') flushCache();
    });

    return () => {
      subscription.remove();
      flushCache();
    };
  }, [activeCompanyId, user?.uid]);

  return createElement(FirebaseSyncContext.Provider, { value: firebaseSync }, children);
};

export const useFirebaseSync = (): FirebaseSyncContextValue => {
  const firebaseSync = useContext(FirebaseSyncContext);
  if (!firebaseSync) {
    throw new Error('useFirebaseSync must be used within FirebaseSyncProvider');
  }
  return firebaseSync;
};
