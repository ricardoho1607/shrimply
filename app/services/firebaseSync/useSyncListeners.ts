import { db } from '@/config/firebase';
import {
  collection,
  onSnapshot,
  orderBy,
  query
} from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { overlayDailyFeedIntents } from '../../../shared/dailyFeedTransaction';
import {
  shouldApplyRemoteCollectionSnapshot
} from '../../../shared/offlineSnapshotPolicy';
import {
  applyPendingHarvestChanges,
  applyPendingPondChanges,
  sortPendingChanges
} from '../../../shared/offlineWorkspace';
import { createFirebaseSyncListenerOwner } from '../../hooks/firebaseSyncListenerOwner';
import { FarmCycle, HarvestRecord, normalizePondLifecycle, PhysicalPond, Pond, usePondStore } from '../../store/pondStore';
import { scheduleFarmCachePersist } from '../farmCache';
import { listOfflineMutations } from '../offlineWorkspace';
import { applyPendingEntityChanges, applyPendingPhysicalPondChanges } from './syncReconciliation';
import type { SyncRuntime } from './syncTypes';
import type { SyncQueue } from './useSyncQueue';
export function useSyncListeners({ activeCompanyId, user, setSyncStatus }: SyncRuntime, { pendingChangesRef, pendingStorageReady }: SyncQueue) {
  const [listenerOwner] = useState(createFirebaseSyncListenerOwner);
  const initialLoadComplete = useRef(false);
  const setupRealtimeListeners = useCallback((userId: string, companyId: string) => {
    let active = true;
    const newUnsubscribeCallbacks: (() => void)[] = [];
    const isActiveFarmIdentity = () => {
      const state = usePondStore.getState();
      return active && state.currentCompanyId === companyId && state.farmCacheUserId === userId;
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
      active = false;
      newUnsubscribeCallbacks.splice(0).forEach((unsubscribe) => unsubscribe());
      console.error('Error setting up Firebase listeners:', error);
      setSyncStatus(prev => ({ ...prev, error: 'Failed to connect to Firebase' }));
    }
    return newUnsubscribeCallbacks.map(unsubscribe => () => {
      active = false;
      unsubscribe();
    });
  }, [pendingChangesRef, setSyncStatus]);

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

}
