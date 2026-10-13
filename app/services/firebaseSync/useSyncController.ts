import { useAuth } from '@/context/AuthContext';
import { useCallback, useRef, useState } from 'react';
import { commitFarmChanges } from './commitFarmChanges';
import type { CommitResult, PendingChange, SyncStatus } from './syncTypes';
import { useSyncListeners } from './useSyncListeners';
import { useSyncMethods } from './useSyncMethods';
import { useSyncQueue } from './useSyncQueue';
import { useSyncRetry } from './useSyncRetry';
export function useFirebaseSyncController() {
  const { user, company, isBuyer } = useAuth();
  const activeCompanyId = user && !isBuyer ? company?.id : undefined;
  const activeUserId = user?.uid;
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ isOnline: false, isSyncing: false, pendingChanges: 0 });
  const isOnlineRef = useRef(false);
  const syncPendingChangesRef = useRef<() => void>(() => undefined);
  const runtime = { user, company, activeCompanyId, activeUserId, setSyncStatus, isOnlineRef, syncPendingChangesRef };
  const queue = useSyncQueue(runtime);
  useSyncListeners(runtime, queue);
  const commitChanges = useCallback((changes: PendingChange[]): Promise<CommitResult> => {
    if (!activeCompanyId || !user) return Promise.resolve({ processedIds: [], committedLegacyPonds: {} });
    return commitFarmChanges({ activeCompanyId, user, company }, changes);
  }, [activeCompanyId, user, company]);
  const syncPendingChanges = useSyncRetry(runtime, queue, commitChanges, syncStatus);
  return useSyncMethods(queue, syncStatus, syncPendingChanges);
}
