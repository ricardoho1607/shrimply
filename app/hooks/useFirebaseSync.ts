import { useAuth } from '@/context/AuthContext';
import { createContext, createElement, ReactNode, useContext, useEffect } from 'react';
import { AppState } from 'react-native';
import { flushFarmCachePersist } from '../services/farmCache';
import { useFirebaseSyncController } from '../services/firebaseSync/useSyncController';
import { requestOfflineMutationFlush } from '../services/offlineWorkspace';
import { usePondStore } from './../store/pondStore';
export type { SyncStatus } from '../services/firebaseSync/syncTypes';

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
      syncLifecycleChanges: firebaseSync.syncLifecycleChanges,
      syncPond: firebaseSync.syncPond,
      syncPhysicalPond: firebaseSync.syncPhysicalPond,
      syncSampling: firebaseSync.syncSampling,
      syncMortality: firebaseSync.syncMortality,
      syncHarvestRecord: firebaseSync.syncHarvestRecord,
      syncHarvestOperation: firebaseSync.syncHarvestOperation,
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
    firebaseSync.syncLifecycleChanges,
    firebaseSync.syncCycle,
    firebaseSync.syncHarvestRecord,
    firebaseSync.syncHarvestOperation,
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
