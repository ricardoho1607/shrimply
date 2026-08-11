import {
  FARM_CACHE_VERSION,
  createAuthBootstrapSnapshot,
  createFarmCacheSnapshot,
  getAuthBindingKey,
  getAuthBootstrapKey,
  getFarmCacheKey,
  parseAuthBindingSnapshot,
  parseAuthBootstrapSnapshot,
  parseFarmCacheSnapshot,
  type AuthBootstrapSnapshot,
} from '../../shared/farmCache';
import {
  normalizePondLifecycle,
  usePondStore,
  type FarmCycle,
  type HarvestRecord,
  type PhysicalPond,
  type Pond,
} from '../store/pondStore';
import {
  clearProtectedStorageForUser,
  enableProtectedStorageForUser,
  readProtectedItem,
  removeProtectedItem,
  writeProtectedItem,
} from './protectedStorage';

interface FarmStateForCache {
  ponds: Pond[];
  physicalPonds: PhysicalPond[];
  cycles: FarmCycle[];
  harvestRecords: HarvestRecord[];
  currentTimeZone?: string;
}

interface PendingFarmCacheWrite {
  timer: ReturnType<typeof setTimeout>;
  userId: string;
  companyId: string;
  state: FarmStateForCache;
  lastSyncedAt?: number;
}

const pendingWrites = new Map<string, PendingFarmCacheWrite>();

// Cached access is gated by Firebase's locally restored UID. A remote membership
// revocation can only be enforced after reconnecting; permission denial then clears
// both memory and the scoped cache.

const logCache = (message: string): void => {
  if (__DEV__) console.log(`[FarmCache] ${message}`);
};

const clearPendingWrite = (key: string): void => {
  const pending = pendingWrites.get(key);
  if (pending) clearTimeout(pending.timer);
  pendingWrites.delete(key);
};

export const enableFarmCacheForUser = (userId: string): void => {
  enableProtectedStorageForUser(userId);
};

const selectHarvestRecordsForCache = (state: FarmStateForCache): HarvestRecord[] => {
  const activeCycleIds = new Set(
    state.cycles.filter((cycle) => cycle.status !== 'closed').map((cycle) => cycle.id),
  );
  const activePondIds = new Set(
    state.ponds.filter((pond) => pond.cycleStatus !== 'ended').map((pond) => pond.id),
  );
  const currentRecords = state.harvestRecords.filter((record) =>
    Boolean(record.cycleId && activeCycleIds.has(record.cycleId))
    || record.ponds.some((pond) => activePondIds.has(pond.pondId)),
  );
  const recentRecords = [...state.harvestRecords]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-25);
  const selectedIds = new Set([...currentRecords, ...recentRecords].map((record) => record.id));
  return state.harvestRecords.filter((record) => selectedIds.has(record.id));
};

export const beginFarmCacheHydration = (userId: string, companyId: string, timeZone?: string): void => {
  usePondStore.setState({
    ponds: [],
    physicalPonds: [],
    cycles: [],
    harvestRecords: [],
    currentCompanyId: companyId,
    currentTimeZone: timeZone,
    farmCacheUserId: userId,
    farmCacheStatus: 'hydrating',
    lastFarmCacheUpdate: undefined,
  });
};

export const hydrateFarmCache = async (
  userId: string,
  companyId: string,
  fallbackTimeZone?: string,
): Promise<boolean> => {
  beginFarmCacheHydration(userId, companyId, fallbackTimeZone);
  const key = getFarmCacheKey(userId, companyId);

  try {
    const raw = await readProtectedItem(userId, key);
    const snapshot = raw ? parseFarmCacheSnapshot(raw, userId, companyId) : null;
    const currentState = usePondStore.getState();
    if (currentState.currentCompanyId !== companyId || currentState.farmCacheUserId !== userId) return false;

    if (!snapshot) {
      if (raw) await removeProtectedItem(key);
      usePondStore.setState({ farmCacheStatus: 'miss' });
      logCache(raw ? `invalid cache removed for ${companyId}` : `cache miss for ${companyId}`);
      return false;
    }

    usePondStore.setState({
      ponds: (snapshot.data.ponds as Pond[]).map(normalizePondLifecycle),
      physicalPonds: snapshot.data.physicalPonds as PhysicalPond[],
      cycles: snapshot.data.cycles as FarmCycle[],
      harvestRecords: snapshot.data.harvestRecords as HarvestRecord[],
      currentCompanyId: companyId,
      currentTimeZone: snapshot.data.currentTimeZone || fallbackTimeZone,
      farmCacheUserId: userId,
      farmCacheStatus: 'ready',
      lastFarmCacheUpdate: snapshot.lastSyncedAt || snapshot.cachedAt,
    });
    logCache(`cache hit for ${companyId}; age ${Math.max(0, Math.round((Date.now() - snapshot.cachedAt) / 60000))}m`);
    return true;
  } catch (error) {
    console.error('[FarmCache] hydration failed:', error);
    await removeProtectedItem(key).catch(() => undefined);
    const currentState = usePondStore.getState();
    if (currentState.currentCompanyId === companyId && currentState.farmCacheUserId === userId) {
      usePondStore.setState({ farmCacheStatus: 'miss' });
    }
    return false;
  }
};

const writeFarmCache = async (
  userId: string,
  companyId: string,
  state: FarmStateForCache,
  lastSyncedAt?: number,
): Promise<void> => {
  const snapshot = createFarmCacheSnapshot(userId, companyId, {
    ponds: state.ponds,
    physicalPonds: state.physicalPonds,
    cycles: state.cycles,
    harvestRecords: selectHarvestRecordsForCache(state),
    currentTimeZone: state.currentTimeZone,
  }, { lastSyncedAt });
  await writeProtectedItem(userId, getFarmCacheKey(userId, companyId), JSON.stringify(snapshot));
  logCache(`persisted ${companyId}`);
};

export const scheduleFarmCachePersist = (
  userId: string,
  companyId: string,
  state: FarmStateForCache,
  lastSyncedAt?: number,
): void => {
  const key = getFarmCacheKey(userId, companyId);
  clearPendingWrite(key);
  const pending: PendingFarmCacheWrite = {
    userId,
    companyId,
    state,
    lastSyncedAt,
    timer: setTimeout(() => {
      pendingWrites.delete(key);
      void writeFarmCache(userId, companyId, state, lastSyncedAt).catch((error) => {
        console.error('[FarmCache] persistence failed:', error);
      });
    }, 300),
  };
  pendingWrites.set(key, pending);
};

export const flushFarmCachePersist = async (userId: string, companyId: string): Promise<void> => {
  const key = getFarmCacheKey(userId, companyId);
  const pending = pendingWrites.get(key);
  if (!pending) return;
  clearPendingWrite(key);
  await writeFarmCache(pending.userId, pending.companyId, pending.state, pending.lastSyncedAt);
};

export const removeFarmCache = async (userId: string, companyId: string): Promise<void> => {
  const key = getFarmCacheKey(userId, companyId);
  clearPendingWrite(key);
  await removeProtectedItem(key);
};

export const clearUserFarmCaches = async (userId: string): Promise<void> => {
  for (const [key, pending] of pendingWrites) {
    if (pending.userId === userId) clearPendingWrite(key);
  }
  await clearProtectedStorageForUser(userId);
};

export const persistAuthBootstrap = async (
  userId: string,
  companyId: string,
  user: Record<string, unknown>,
  company: Record<string, unknown>,
): Promise<void> => {
  const snapshot = createAuthBootstrapSnapshot(userId, companyId, user, company);
  await Promise.all([
    writeProtectedItem(
      userId,
      getAuthBootstrapKey(userId, companyId),
      JSON.stringify(snapshot),
    ),
    writeProtectedItem(
      userId,
      getAuthBindingKey(userId),
      JSON.stringify({ version: FARM_CACHE_VERSION, userId, companyId }),
    ),
  ]);
};

export const loadCompanyAuthBootstrap = async (
  userId: string,
  companyId: string,
): Promise<AuthBootstrapSnapshot | null> => {
  try {
    const key = getAuthBootstrapKey(userId, companyId);
    const raw = await readProtectedItem(userId, key);
    const snapshot = raw ? parseAuthBootstrapSnapshot(raw, userId, companyId) : null;
    if (raw && !snapshot) await removeProtectedItem(key);
    return snapshot;
  } catch (error) {
    console.error('[FarmCache] auth bootstrap read failed:', error);
    await removeProtectedItem(getAuthBootstrapKey(userId, companyId)).catch(() => undefined);
    return null;
  }
};

export const loadActiveAuthBootstrap = async (userId: string): Promise<AuthBootstrapSnapshot | null> => {
  try {
    const bindingKey = getAuthBindingKey(userId);
    const rawBinding = await readProtectedItem(userId, bindingKey);
    const binding = rawBinding ? parseAuthBindingSnapshot(rawBinding, userId) : null;
    if (!binding) {
      if (rawBinding) await removeProtectedItem(bindingKey);
      return null;
    }
    return loadCompanyAuthBootstrap(userId, binding.companyId);
  } catch (error) {
    console.error('[FarmCache] active auth binding read failed:', error);
    await removeProtectedItem(getAuthBindingKey(userId)).catch(() => undefined);
    return null;
  }
};

export const removeAuthBootstrap = async (userId: string, companyId: string): Promise<void> => {
  const bindingKey = getAuthBindingKey(userId);
  const rawBinding = await readProtectedItem(userId, bindingKey);
  const binding = rawBinding ? parseAuthBindingSnapshot(rawBinding, userId) : null;
  const keys = [getAuthBootstrapKey(userId, companyId)];
  if (binding?.companyId === companyId || !binding) keys.push(bindingKey);
  await Promise.all(keys.map(removeProtectedItem));
};
