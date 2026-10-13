import { useCallback, useEffect, useRef } from 'react';
import {
  getOfflineRetryDelay,
  isUsableNetworkState
} from '../../../shared/offlineSnapshotPolicy';
import {
  applyPendingPondChanges,
  backfillCommittedHarvestReceipts,
  isOfflineSyncIdentityCurrent,
  reconcileCommittedHarvestPonds,
  removeAcknowledgedPendingChanges,
  sortPendingChanges
} from '../../../shared/offlineWorkspace';
import { usePondStore } from '../../store/pondStore';
import { flushFarmCachePersist, scheduleFarmCachePersist } from '../farmCache';
import { requestOfflineMutationFlush } from '../offlineWorkspace';
import { NetInfo } from './networkStatus';
import type { CommitResult, PendingChange, SyncRuntime, SyncStatus } from './syncTypes';
import type { SyncQueue } from './useSyncQueue';
export function useSyncRetry(runtime: SyncRuntime, queue: SyncQueue, commitChanges: (changes: PendingChange[]) => Promise<CommitResult>, syncStatus: SyncStatus) {
  const { activeCompanyId, activeUserId, user, setSyncStatus, isOnlineRef, syncPendingChangesRef } = runtime;
  const { pendingStorageKey, pendingChanges, setPendingChanges, pendingStorageReady, pendingChangesRef, pendingIdentityRef, pendingEnqueueRef, pendingQueueWritesRef, persistPendingQueue } = queue;
  const syncInProgressRef = useRef(false);
  const retryAttemptRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
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
  }, [isOnlineRef, pendingChangesRef, syncPendingChangesRef]);

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
  }, [activeCompanyId, clearRetryTimer, commitChanges, isOnlineRef, pendingChangesRef, pendingEnqueueRef, pendingIdentityRef, pendingQueueWritesRef, pendingStorageKey, persistPendingQueue, scheduleSyncRetry, setPendingChanges, setSyncStatus, syncPendingChangesRef, user]);

  useEffect(() => {
    syncPendingChangesRef.current = () => { void syncPendingChanges(); };
    return () => { syncPendingChangesRef.current = () => undefined; };
  }, [syncPendingChanges, syncPendingChangesRef]);

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
      isOnlineRef.current = false;
      unsubscribe();
    };
  }, [activeCompanyId, activeUserId, clearRetryTimer, isOnlineRef, pendingChangesRef, setSyncStatus, syncPendingChangesRef]);

  useEffect(() => {
    if (pendingStorageReady && syncStatus.isOnline && pendingChanges.length > 0) {
      syncPendingChangesRef.current();
    }
  }, [pendingStorageReady, pendingChanges.length, syncStatus.isOnline, syncPendingChangesRef]);

  return syncPendingChanges;
}
