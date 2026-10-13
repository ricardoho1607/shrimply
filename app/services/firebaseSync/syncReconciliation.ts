import {
  replayPendingFarmState
} from '../../../shared/offlineWorkspace';
import { normalizePondLifecycle, PhysicalPond, usePondStore } from '../../store/pondStore';
import { flushFarmCachePersist, scheduleFarmCachePersist } from '../farmCache';
import type { PendingChange } from './syncTypes';
export const applyPendingPhysicalPondChanges = (
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

export const applyPendingEntityChanges = <T extends { id: string }>(
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

export const replayPendingFarmChanges = (
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
