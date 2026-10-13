import { useCallback } from 'react';
import {
  createOfflineOperationId
} from '../../../shared/offlineWorkspace';
import { FarmCycle, HarvestRecord, MortalityRecord, PhysicalPond, Pond, Sampling, type DurableOutcome, LifecycleChange } from '../../store/pondStore';
import type { SyncStatus } from './syncTypes';
import type { SyncQueue } from './useSyncQueue';
export function useSyncMethods({ addPendingChange, addPendingChanges, pendingChanges }: SyncQueue, syncStatus: SyncStatus, syncPendingChanges: () => Promise<void>) {
  // Sync methods
  const syncPond = useCallback((action: 'create' | 'update' | 'delete', pond: Pond, operationId?: string) => {
    return addPendingChange({
      id: operationId || createOfflineOperationId(`pond-${pond.id}-${action}`),
      type: 'pond',
      action,
      data: pond
    });
  }, [addPendingChange]);

  const syncPhysicalPond = useCallback((action: 'create' | 'update' | 'delete', pond: PhysicalPond, operationId?: string) => {
    return addPendingChange({
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
    return addPendingChange({
      id: operationId || createOfflineOperationId(`mortality-${record.id}-${action}`),
      type: 'mortality',
      action,
      data: record,
      pondId,
      recordId: recordId || record.id,
    });
  }, [addPendingChange]);

  const syncCycle = useCallback((action: 'create' | 'update' | 'delete', cycle: FarmCycle, operationId?: string) => {
    return addPendingChange({
      id: operationId || createOfflineOperationId(`cycle-${cycle.id}-${action}`),
      type: 'cycle',
      action,
      data: cycle
    });
  }, [addPendingChange]);

  const syncLifecycleChanges = useCallback((changes: LifecycleChange[]) => addPendingChanges(changes.map(change => ({
    ...change,
    id: createOfflineOperationId(`${change.type}-${change.data.id}-${change.action}`),
  }))), [addPendingChanges]);

  const triggerManualSync = useCallback(() => {
    if (syncStatus.isOnline && !syncStatus.isSyncing && pendingChanges.length > 0) {
      syncPendingChanges();
    }
  }, [syncStatus.isOnline, syncStatus.isSyncing, pendingChanges.length, syncPendingChanges]);

  return {
    syncStatus: { ...syncStatus, pendingChanges: pendingChanges.length },
    pendingChanges,
    syncLifecycleChanges,
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
