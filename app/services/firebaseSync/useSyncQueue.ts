import { useCallback, useEffect, useRef, useState } from 'react';
import { getPendingSyncKey } from '../../../shared/farmCache';
import {
  persistOfflineFarmChange
} from '../../../shared/offlineWorkspace';
import { usePondStore, type DurableOutcome } from '../../store/pondStore';
import { flushFarmCachePersist, scheduleFarmCachePersist } from '../farmCache';
import { readProtectedItem, removeProtectedItem, writeProtectedItem } from '../protectedStorage';
import { replayPendingFarmChanges } from './syncReconciliation';
import type { PendingChange, SyncRuntime } from './syncTypes';
export function useSyncQueue(runtime: SyncRuntime) {
  const { activeCompanyId, activeUserId, setSyncStatus, isOnlineRef, syncPendingChangesRef } = runtime;
  const pendingStorageKey = activeUserId && activeCompanyId
    ? getPendingSyncKey(activeUserId, activeCompanyId)
    : null;

  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [pendingStorageReady, setPendingStorageReady] = useState(false);
  const pendingChangesRef = useRef<PendingChange[]>([]);
  const pendingIdentityRef = useRef<string | null>(null);
  const pendingQueueWriteRef = useRef<Promise<void>>(Promise.resolve());
  const pendingEnqueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const pendingQueueWritesRef = useRef(0);
  const persistPendingQueue = useCallback((changes: PendingChange[]): Promise<void> => {
    if (!activeUserId || !pendingStorageKey || !pendingStorageReady || pendingIdentityRef.current !== pendingStorageKey) {
      return Promise.reject(new Error('Pending queue identity is not ready.'));
    }
    const write = pendingQueueWriteRef.current.catch(() => undefined).then(async () => {
      if (changes.length === 0) await removeProtectedItem(pendingStorageKey);
      else await writeProtectedItem(activeUserId, pendingStorageKey, JSON.stringify(changes), { required: true });
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
      // Invalidate callbacks held by the previous provider, even if this account returns.
      pendingIdentityRef.current = null;
    };
  }, [activeCompanyId, activeUserId, pendingStorageKey]);

  // Queue acceptance is serialized so concurrent form submits cannot overwrite each other's disk queue.
  const addPendingChanges = useCallback((changes: Omit<PendingChange, 'timestamp'>[]): Promise<DurableOutcome> => {
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
      const additions: PendingChange[] = changes.map(change => ({ ...change, timestamp: Date.now() }));
      const store = usePondStore.getState();
      if (pendingIdentityRef.current !== pendingStorageKey
        || store.currentCompanyId !== activeCompanyId || store.farmCacheUserId !== activeUserId) {
        return { success: false, status: 'rejected', error: 'Farm account changed before the change could be saved.' };
      }
      const previous = pendingChangesRef.current;
      const next = [...new Map([...previous, ...additions].map(change => [change.id, change])).values()];
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
      pendingChangesRef.current = next;
      setPendingChanges(next);
      return { success: true, status: 'pending' };
    });
    pendingEnqueueRef.current = enqueue;
    return enqueue.finally(() => {
      pendingQueueWritesRef.current = Math.max(0, pendingQueueWritesRef.current - 1);
      if (pendingQueueWritesRef.current === 0 && isOnlineRef.current
        && pendingIdentityRef.current === pendingStorageKey) syncPendingChangesRef.current();
    });
  }, [activeCompanyId, activeUserId, isOnlineRef, pendingStorageKey, pendingStorageReady, persistPendingQueue, setSyncStatus, syncPendingChangesRef]);

  const addPendingChange = useCallback((change: Omit<PendingChange, 'timestamp'>) => addPendingChanges([change]), [addPendingChanges]);

  return { pendingStorageKey, pendingChanges, setPendingChanges, pendingStorageReady, pendingChangesRef, pendingIdentityRef, pendingEnqueueRef, pendingQueueWritesRef, persistPendingQueue, addPendingChange, addPendingChanges };
}
export type SyncQueue = ReturnType<typeof useSyncQueue>;
