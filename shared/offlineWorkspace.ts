import { reconcileDailyFeedStock, type DailyFeedIntent, type DailyFeedStock } from './dailyFeedTransaction';
import { removeAdditiveUsage } from './additiveUsageRemoval';
import { toCacheSafeValue } from './farmCache.ts';
import { applyHarvestImpactToPond, reverseHarvestImpactOnPond } from './harvestCalculations.ts';

export const OFFLINE_WORKSPACE_VERSION = 1;

export const isSameOfflineFarmIdentity = (
  current: { currentCompanyId?: string; farmCacheUserId?: string },
  captured: { companyId?: string; userId?: string },
): boolean => current.currentCompanyId === captured.companyId
  && current.farmCacheUserId === captured.userId;

export const isOfflineSyncIdentityCurrent = (
  current: { currentCompanyId?: string; farmCacheUserId?: string },
  captured: { companyId: string; userId: string; storageKey: string },
  activeStorageKey?: string | null,
): boolean => activeStorageKey === captured.storageKey
  && isSameOfflineFarmIdentity(current, captured);

export const removeAcknowledgedPendingChanges = <T extends { id: string }>(
  current: T[],
  acknowledgedIds: string[],
): T[] => current.filter((change) => !acknowledgedIds.includes(change.id));

const OFFLINE_COLLECTION_PREFIX = 'shrimply:offline-collection';
const OFFLINE_MUTATION_PREFIX = 'shrimply:offline-mutations';

const encodeKeyPart = (value: string): string => encodeURIComponent(value);

export const getOfflineCollectionKey = (
  userId: string,
  companyId: string,
  scope: string,
): string => `${OFFLINE_COLLECTION_PREFIX}:v${OFFLINE_WORKSPACE_VERSION}:${encodeKeyPart(userId)}:${encodeKeyPart(companyId)}:${encodeKeyPart(scope)}`;

export const getOfflineMutationQueueKey = (userId: string, companyId: string): string =>
  `${OFFLINE_MUTATION_PREFIX}:v${OFFLINE_WORKSPACE_VERSION}:${encodeKeyPart(userId)}:${encodeKeyPart(companyId)}`;

export const isUserScopedOfflineWorkspaceKey = (key: string, userId: string): boolean => {
  const encodedUserId = encodeKeyPart(userId);
  return key.startsWith(`${OFFLINE_COLLECTION_PREFIX}:v${OFFLINE_WORKSPACE_VERSION}:${encodedUserId}:`)
    || key.startsWith(`${OFFLINE_MUTATION_PREFIX}:v${OFFLINE_WORKSPACE_VERSION}:${encodedUserId}:`);
};

export interface OfflineCollectionSnapshot<T = unknown> {
  version: typeof OFFLINE_WORKSPACE_VERSION;
  userId: string;
  companyId: string;
  scope: string;
  cachedAt: number;
  data: T[];
}

export type OfflineMutationKind = 'set' | 'delete' | 'inventory';

export interface OfflineInventoryAdjustment {
  itemId: string;
  action: 'stockIn' | 'consume' | 'restore' | 'removeUsage';
  quantity: number;
  price?: number;
  useFixedUnitPrice?: boolean;
  useFifoCost?: boolean;
  createItem?: Record<string, unknown>;
  historyEntry: Record<string, unknown> & { id: string };
}

export interface OfflineInventoryMutationData {
  collection: 'feeds' | 'additives';
  adjustments: OfflineInventoryAdjustment[];
}

export interface OfflineMutation {
  id: string;
  userId: string;
  companyId: string;
  createdAt: number;
  kind: OfflineMutationKind;
  path: string[];
  data?: Record<string, unknown>;
  merge?: boolean;
  createOnly?: boolean;
  serverTimestampFields?: string[];
  uploadLocalFiles?: boolean;
  uploadPath?: string;
  functionCall?: { name: string; payload: Record<string, unknown> };
  inventory?: OfflineInventoryMutationData;
  dailyFeed?: DailyFeedIntent;
  settlement?: { id: string; date: string; amount: number };
}

export interface OfflineMutationQueue {
  version: typeof OFFLINE_WORKSPACE_VERSION;
  userId: string;
  companyId: string;
  updatedAt: number;
  mutations: OfflineMutation[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const createOfflineCollectionSnapshot = <T>(
  userId: string,
  companyId: string,
  scope: string,
  data: T[],
): OfflineCollectionSnapshot<T> => ({
  version: OFFLINE_WORKSPACE_VERSION,
  userId,
  companyId,
  scope,
  cachedAt: Date.now(),
  data: toCacheSafeValue(data) as T[],
});

export const parseOfflineCollectionSnapshot = <T>(
  raw: string,
  expectedUserId: string,
  expectedCompanyId: string,
  expectedScope: string,
): OfflineCollectionSnapshot<T> | null => {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)
      || parsed.version !== OFFLINE_WORKSPACE_VERSION
      || parsed.userId !== expectedUserId
      || parsed.companyId !== expectedCompanyId
      || parsed.scope !== expectedScope
      || typeof parsed.cachedAt !== 'number'
      || !Array.isArray(parsed.data)) return null;
    return parsed as unknown as OfflineCollectionSnapshot<T>;
  } catch {
    return null;
  }
};

const isOfflineMutation = (
  value: unknown,
  expectedUserId: string,
  expectedCompanyId: string,
): value is OfflineMutation => {
  if (!isRecord(value)
    || typeof value.id !== 'string'
    || value.userId !== expectedUserId
    || value.companyId !== expectedCompanyId
    || typeof value.createdAt !== 'number'
    || (value.kind !== 'set' && value.kind !== 'delete' && value.kind !== 'inventory')
    || !Array.isArray(value.path)
    || value.path.length < 2
    || value.path.length % 2 !== 0
    || !value.path.every((segment) => typeof segment === 'string' && segment.length > 0)) return false;

  if (value.kind === 'set' && !isRecord(value.data)) return false;
  if (value.kind === 'inventory') {
    const inventory = value.inventory;
    if (!isRecord(inventory)
      || (inventory.collection !== 'feeds' && inventory.collection !== 'additives')
      || !Array.isArray(inventory.adjustments)
      || (inventory.adjustments.length === 0 && !value.dailyFeed)
      || !inventory.adjustments.every((adjustment) => (
        isRecord(adjustment)
        && typeof adjustment.itemId === 'string'
        && ['stockIn', 'consume', 'restore', 'removeUsage'].includes(adjustment.action as string)
        && (adjustment.action !== 'removeUsage' || inventory.collection === 'additives')
        && typeof adjustment.quantity === 'number'
        && adjustment.quantity > 0
        && (adjustment.useFixedUnitPrice === undefined || typeof adjustment.useFixedUnitPrice === 'boolean')
        && (adjustment.useFifoCost === undefined || typeof adjustment.useFifoCost === 'boolean')
        && (adjustment.createItem === undefined || isRecord(adjustment.createItem))
        && isRecord(adjustment.historyEntry)
        && typeof adjustment.historyEntry.id === 'string'
      ))) return false;
  }
  if (value.dailyFeed !== undefined && (
    value.kind !== 'inventory' || !isRecord(value.dailyFeed)
    || typeof value.dailyFeed.pondId !== 'string' || !value.dailyFeed.pondId
    || typeof value.dailyFeed.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.dailyFeed.date)
    || !Array.isArray(value.dailyFeed.previousFeedIds) || !value.dailyFeed.previousFeedIds.every(id => typeof id === 'string' && id.length > 0)
    || !Array.isArray(value.dailyFeed.allocations) || value.dailyFeed.allocations.length === 0
    || !value.dailyFeed.allocations.every(row => isRecord(row) && typeof row.inventoryFeedId === 'string'
      && row.inventoryFeedId.length > 0 && typeof row.quantityKg === 'number' && Number.isFinite(row.quantityKg) && row.quantityKg > 0)
  )) return false;
  if (value.serverTimestampFields !== undefined
    && (!Array.isArray(value.serverTimestampFields)
      || !value.serverTimestampFields.every((field) => typeof field === 'string' && field.length > 0))) return false;
  if (value.uploadLocalFiles !== undefined && typeof value.uploadLocalFiles !== 'boolean') return false;
  if (value.createOnly !== undefined && typeof value.createOnly !== 'boolean') return false;
  if (value.uploadPath !== undefined && typeof value.uploadPath !== 'string') return false;
  if (value.functionCall !== undefined && (
    !isRecord(value.functionCall)
    || typeof value.functionCall.name !== 'string'
    || !isRecord(value.functionCall.payload)
  )) return false;
  return true;
};

export const createOfflineMutationQueue = (
  userId: string,
  companyId: string,
  mutations: OfflineMutation[],
): OfflineMutationQueue => {
  const uniqueMutations = new Map<string, OfflineMutation>();
  mutations.forEach((mutation) => {
    if (isOfflineMutation(mutation, userId, companyId)) {
      uniqueMutations.set(mutation.id, toCacheSafeValue(mutation) as OfflineMutation);
    }
  });
  return {
    version: OFFLINE_WORKSPACE_VERSION,
    userId,
    companyId,
    updatedAt: Date.now(),
    mutations: Array.from(uniqueMutations.values()).sort((a, b) => a.createdAt - b.createdAt),
  };
};

export const parseOfflineMutationQueue = (
  raw: string,
  expectedUserId: string,
  expectedCompanyId: string,
): OfflineMutationQueue | null => {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)
      || parsed.version !== OFFLINE_WORKSPACE_VERSION
      || parsed.userId !== expectedUserId
      || parsed.companyId !== expectedCompanyId
      || typeof parsed.updatedAt !== 'number'
      || !Array.isArray(parsed.mutations)) return null;
    return createOfflineMutationQueue(
      expectedUserId,
      expectedCompanyId,
      parsed.mutations as OfflineMutation[],
    );
  } catch {
    return null;
  }
};

export const applyOfflineMutationToCollection = <T extends { id: string }>(
  collection: T[],
  mutation: OfflineMutation,
): T[] => {
  if (mutation.dailyFeed) {
    const intent = mutation.dailyFeed;
    const desired = new Map(intent.allocations.map(row => [row.inventoryFeedId, row.quantityKg]));
    const ids = new Set([...intent.previousFeedIds, ...desired.keys()]);
    return collection.map(item => {
      if (!ids.has(item.id)) return item;
      const stock = item as T & DailyFeedStock;
      const operationId = `${mutation.id}:${item.id}`;
      if (stock.usageHistory?.some(row => row.id === operationId)) return item;
      try {
        const update = reconcileDailyFeedStock(stock, desired.get(item.id) ?? 0, intent, operationId);
        return update ? { ...item, ...update } : item;
      } catch {
        // Keep authoritative stock when an offline intent can no longer be fulfilled.
        // The outbox retains the intent and reports the transaction failure.
        return item;
      }
    });
  }
  const documentId = mutation.path[mutation.path.length - 1];
  if (mutation.kind === 'inventory' && mutation.inventory) {
    return mutation.inventory.adjustments.reduce<T[]>((items, adjustment) => {
      const existingItems = items.some((item) => item.id === adjustment.itemId)
        ? items
        : adjustment.createItem
          ? [...items, { ...adjustment.createItem, id: adjustment.itemId } as T]
          : items;
      return existingItems.map((item) => {
        if (item.id !== adjustment.itemId) return item;
        const inventoryItem = item as T & {
          totalStock?: number;
          totalCost?: number;
          stockInHistory?: Record<string, unknown>[];
          usageHistory?: Record<string, unknown>[];
          removedUsageIds?: string[];
        };
        if (adjustment.action === 'removeUsage') {
          if (mutation.inventory?.collection !== 'additives') throw new Error('Only additive usage can be removed here.');
          try {
            const update = removeAdditiveUsage(inventoryItem, adjustment.historyEntry.id);
            return update ? { ...inventoryItem, ...update } : item;
          } catch {
            // Preserve authoritative stock; the outbox reports the invalid remote history.
            return item;
          }
        }
        if (adjustment.action === 'consume' && inventoryItem.removedUsageIds?.includes(adjustment.historyEntry.id)) return item;
        const historyField = adjustment.action === 'stockIn' ? 'stockInHistory' : 'usageHistory';
        const history = [...(inventoryItem[historyField] ?? [])];
        if (history.some((entry) => entry.id === adjustment.historyEntry.id)) return item;
        const currentStock = Number(inventoryItem.totalStock) || 0;
        const currentCost = Number(inventoryItem.totalCost) || 0;
        const price = adjustment.action === 'stockIn'
          ? Number(adjustment.price)
          : Number(adjustment.historyEntry.unitPrice) || (currentStock > 0 ? currentCost / currentStock : 0);
        const stockDelta = adjustment.action === 'consume' ? -adjustment.quantity : adjustment.quantity;
        const costDelta = stockDelta * price;
        const historyEntry = {
          ...adjustment.historyEntry,
          quantity: adjustment.action === 'restore' ? -adjustment.quantity : adjustment.quantity,
          ...(adjustment.action !== 'stockIn' ? {
            unitPrice: price,
            totalCost: adjustment.action === 'restore' ? -adjustment.quantity * price : adjustment.quantity * price,
          } : {}),
        };
        return {
          ...inventoryItem,
          [historyField]: [...history, historyEntry],
          totalStock: Math.max(0, currentStock + stockDelta),
          totalCost: Math.max(0, currentCost + costDelta),
        };
      });
    }, collection);
  }
  if (mutation.kind === 'delete') return collection.filter((item) => item.id !== documentId);
  if (!mutation.data) return collection;

  const existingIndex = collection.findIndex((item) => item.id === documentId);
  const nextItem = mutation.merge && existingIndex >= 0
    ? { ...collection[existingIndex], ...mutation.data, id: documentId } as T
    : { ...mutation.data, id: documentId } as T;
  if (existingIndex < 0) return [...collection, nextItem];
  return collection.map((item, index) => index === existingIndex ? nextItem : item);
};

export interface PendingFarmChange {
  id: string;
  type: 'pond' | 'physicalPond' | 'sampling' | 'mortality' | 'harvest' | 'cycle';
  action: 'create' | 'update' | 'delete';
  data: any;
  previousData?: any;
  timestamp: number;
  pondId?: string;
  samplingId?: string;
  recordId?: string;
}

const TYPE_PRIORITY: Record<PendingFarmChange['type'], number> = {
  cycle: 1,
  physicalPond: 2,
  pond: 3,
  mortality: 4,
  sampling: 5,
  harvest: 6,
};

export const createOfflineOperationId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const persistOfflineFarmChange = async (
  persistQueue: () => Promise<void>,
  persistCache: () => Promise<void>,
  rollbackQueue?: () => Promise<void>,
): Promise<{ durable: boolean; queueError?: unknown; rollbackError?: unknown; cacheError?: unknown }> => {
  try {
    await persistQueue();
  } catch (queueError) {
    try {
      await rollbackQueue?.();
      return { durable: false, queueError };
    } catch (rollbackError) {
      return { durable: false, queueError, rollbackError };
    }
  }
  try {
    await persistCache();
    return { durable: true };
  } catch (cacheError) {
    return { durable: true, cacheError };
  }
};

const HARVEST_OWNED_POND_FIELDS = [
  'totalHarvestedBiomass', 'totalHarvestedPopulation', 'partialHarvestCount',
  'postHarvestBaselineDate', 'postHarvestRemainingBiomass', 'postHarvestRemainingPopulation',
  'postHarvestReferenceSamplingId', 'postHarvestReferenceSamplingDate', 'postHarvestReferenceMbw',
  'appliedHarvestOperationId', 'appliedHarvestOperationIds', 'reversedHarvestOperationIds',
  'lastAppliedHarvestId', 'appliedHarvestIds',
] as const;

const restoreHarvestOwnedFields = <T extends Record<string, any>>(current: T, previous: T): T => ({
  ...current,
  ...Object.fromEntries(HARVEST_OWNED_POND_FIELDS.map((field) => [field, previous[field]])),
});

const hasNoLaterHarvestReceipt = (current: any, previous: any, operationId: string): boolean => {
  const priorReceipts = new Set([
    ...(previous?.appliedHarvestOperationIds || []),
    ...(previous?.reversedHarvestOperationIds || []),
    ...(previous?.appliedHarvestOperationId ? [previous.appliedHarvestOperationId] : []),
  ]);
  const currentReceipts = [
    ...(current.appliedHarvestOperationIds || []),
    ...(current.reversedHarvestOperationIds || []),
    ...(current.appliedHarvestOperationId ? [current.appliedHarvestOperationId] : []),
  ];
  return Boolean(previous) && currentReceipts.every((id: string) => id === operationId || priorReceipts.has(id));
};

const clearHarvestReceipt = (pond: any, operationId: string): any => ({
  ...pond,
  appliedHarvestOperationIds: (pond.appliedHarvestOperationIds || []).filter((id: string) => id !== operationId),
  reversedHarvestOperationIds: (pond.reversedHarvestOperationIds || []).filter((id: string) => id !== operationId),
  ...(pond.appliedHarvestOperationId === operationId ? { appliedHarvestOperationId: undefined } : {}),
});

export const rollbackPendingHarvestCreate = <T extends Record<string, any>>(
  current: T,
  previous: T | undefined,
  line: any,
  record: any,
  operationId: string,
): T => {
  if (hasNoLaterHarvestReceipt(current, previous, operationId)) return restoreHarvestOwnedFields(current, previous!);
  const reversed = clearHarvestReceipt(reverseHarvestImpactOnPond(current, line), operationId);
  return {
    ...reversed,
    appliedHarvestIds: (reversed.appliedHarvestIds || []).filter((id: string) => id !== record.id),
    postHarvestBaselineDate: current.postHarvestBaselineDate,
    postHarvestReferenceSamplingId: current.postHarvestReferenceSamplingId,
    postHarvestReferenceSamplingDate: current.postHarvestReferenceSamplingDate,
    postHarvestReferenceMbw: current.postHarvestReferenceMbw,
    lastAppliedHarvestId: current.lastAppliedHarvestId,
  };
};

export const rollbackPendingHarvestEdit = <T extends Record<string, any>>(
  current: T,
  previous: T | undefined,
  previousLine: any,
  nextLine: any,
  record: any,
  previousRecord: any,
  replacementId: string,
  operationId: string,
): T => {
  if (hasNoLaterHarvestReceipt(current, previous, operationId)) return restoreHarvestOwnedFields(current, previous!);
  const reverted = nextLine ? reverseHarvestImpactOnPond(current, nextLine) : current;
  const restored = previousLine
    ? applyHarvestImpactToPond(reverted, previousLine, previousRecord.date, previousLine.partialHarvestNumber)
    : reverted;
  const cleaned = clearHarvestReceipt(restored, operationId);
  return {
    ...cleaned,
    appliedHarvestIds: [
      ...(cleaned.appliedHarvestIds || []).filter((id: string) => id !== replacementId && id !== record.id),
      ...(previousLine ? [previousRecord.id] : []),
    ],
    postHarvestBaselineDate: current.postHarvestBaselineDate,
    postHarvestReferenceSamplingId: current.postHarvestReferenceSamplingId,
    postHarvestReferenceSamplingDate: current.postHarvestReferenceSamplingDate,
    postHarvestReferenceMbw: current.postHarvestReferenceMbw,
    lastAppliedHarvestId: current.lastAppliedHarvestId,
  };
};

export const rollbackPendingHarvestDelete = <T extends Record<string, any>>(
  current: T,
  previous: T | undefined,
  line: any,
  record: any,
  operationId: string,
): T => {
  if (hasNoLaterHarvestReceipt(current, previous, operationId)) return restoreHarvestOwnedFields(current, previous!);
  const restored = clearHarvestReceipt(
    applyHarvestImpactToPond(current, line, record.date, line.partialHarvestNumber),
    operationId,
  );
  return {
    ...restored,
    appliedHarvestIds: [...new Set([...(restored.appliedHarvestIds || []), record.id])],
    postHarvestBaselineDate: current.postHarvestBaselineDate,
    postHarvestReferenceSamplingId: current.postHarvestReferenceSamplingId,
    postHarvestReferenceSamplingDate: current.postHarvestReferenceSamplingDate,
    postHarvestReferenceMbw: current.postHarvestReferenceMbw,
    lastAppliedHarvestId: current.lastAppliedHarvestId,
  };
};

/** Adds local operation receipts to already committed legacy pond data without applying harvest math again. */
export const backfillCommittedHarvestReceipts = <T extends Record<string, any>>(
  ponds: T[],
  change: PendingFarmChange,
  committedRecord: any,
  previousRecord?: any,
): T[] => ponds.map((pond) => {
  const nextLine = committedRecord?.ponds?.find((line: any) => line.pondId === pond.id);
  const oldLine = previousRecord?.ponds?.find((line: any) => line.pondId === pond.id);
  if (!nextLine && !oldLine) return pond;
  const applied = change.action !== 'delete' && Boolean(nextLine);
  const appliedIds: string[] = Array.isArray(pond.appliedHarvestIds) ? pond.appliedHarvestIds : [];
  const operationIds: string[] = Array.isArray(pond.appliedHarvestOperationIds) ? pond.appliedHarvestOperationIds : [];
  const reversedIds: string[] = Array.isArray(pond.reversedHarvestOperationIds) ? pond.reversedHarvestOperationIds : [];
  const affectedId = applied ? committedRecord.id : previousRecord?.id || committedRecord?.id;
  const baseIds = change.action === 'update' && previousRecord?.id !== committedRecord?.id
    ? appliedIds.filter((id) => id !== previousRecord?.id)
    : appliedIds;
  const ids = applied
    ? (baseIds.includes(affectedId) ? baseIds : [...baseIds, affectedId])
    : appliedIds.filter((id) => id !== affectedId);
  return {
    ...pond,
    appliedHarvestOperationId: applied ? (pond.appliedHarvestOperationId || change.id) : pond.appliedHarvestOperationId,
    appliedHarvestOperationIds: applied ? [...new Set([...operationIds, change.id])] : operationIds,
    reversedHarvestOperationIds: applied ? reversedIds : [...new Set([...reversedIds, change.id])],
    appliedHarvestIds: ids,
    lastAppliedHarvestId: applied ? affectedId : (pond.lastAppliedHarvestId === affectedId ? (ids[ids.length - 1] || null) : pond.lastAppliedHarvestId),
  };
});

export const reconcileCommittedHarvestPonds = <T extends Record<string, any>>(
  ponds: T[],
  committedPonds: Record<string, Record<string, any>>,
): T[] => ponds.map((pond) => {
  const committed = committedPonds[pond.id];
  if (!committed) return pond;
  const reconciled = { ...pond } as Record<string, any>;
  HARVEST_OWNED_POND_FIELDS.forEach((field) => {
    delete reconciled[field];
    if (Object.prototype.hasOwnProperty.call(committed, field)) reconciled[field] = committed[field];
  });
  return reconciled as T;
});

export const comparePendingChanges = (a: PendingFarmChange, b: PendingFarmChange): number => {
  if (a.timestamp !== b.timestamp) {
    return a.timestamp - b.timestamp;
  }
  const typeDiff = (TYPE_PRIORITY[a.type] || 0) - (TYPE_PRIORITY[b.type] || 0);
  if (typeDiff !== 0) return typeDiff;
  return a.id.localeCompare(b.id);
};

export const sortPendingChanges = (changes: PendingFarmChange[]): PendingFarmChange[] => {
  if (changes.length <= 1) return [...changes];

  const adjusted = changes.map((change, index) => ({
    change,
    originalIndex: index,
    effectiveTimestamp: change.timestamp,
  }));

  for (const item of adjusted) {
    if (item.change.type === 'harvest') {
      const harvestRecord = item.change.data;
      const pondIds = new Set(
        (harvestRecord?.ponds || []).map((p: any) => p.pondId).filter(Boolean)
      );
      if (item.change.pondId) pondIds.add(item.change.pondId);

      for (const other of adjusted) {
        if (other.change.type === 'sampling' && other.change.pondId && pondIds.has(other.change.pondId)) {
          if (other.effectiveTimestamp >= item.effectiveTimestamp) {
            item.effectiveTimestamp = other.effectiveTimestamp + 1;
          }
        }
      }
    }
  }

  return adjusted
    .sort((a, b) => {
      if (a.effectiveTimestamp !== b.effectiveTimestamp) {
        return a.effectiveTimestamp - b.effectiveTimestamp;
      }
      const cmp = comparePendingChanges(a.change, b.change);
      if (cmp !== 0) return cmp;
      return a.originalIndex - b.originalIndex;
    })
    .map((item) => item.change);
};

export const isHarvestImpactAppliedToPond = (
  pond: any,
  change: PendingFarmChange,
  record: any,
): boolean => {
  if (pond.appliedHarvestOperationId && pond.appliedHarvestOperationId === change.id) return true;
  if (Array.isArray(pond.appliedHarvestOperationIds) && pond.appliedHarvestOperationIds.includes(change.id)) return true;
  if (Array.isArray(pond.reversedHarvestOperationIds) && pond.reversedHarvestOperationIds.includes(change.id)) return true;
  // A newer harvest may have replaced lastAppliedHarvestId; only explicit receipts are safe.
  if (Array.isArray(pond.appliedHarvestIds) && pond.appliedHarvestIds.includes(record.id)) return true;
  return false;
};

export const isHarvestImpactReversedOnPond = (
  pond: any,
  change: PendingFarmChange,
  record: any,
): boolean => {
  if (pond.appliedHarvestOperationId && pond.appliedHarvestOperationId === change.id) return true;
  if (Array.isArray(pond.appliedHarvestOperationIds) && pond.appliedHarvestOperationIds.includes(change.id)) return true;
  if (Array.isArray(pond.reversedHarvestOperationIds) && pond.reversedHarvestOperationIds.includes(change.id)) return true;
  if (Array.isArray(pond.reversedHarvestIds) && pond.reversedHarvestIds.includes(record.id)) return true;
  return false;
};

export const applyPendingHarvestChanges = <T extends { id: string }>(
  serverRecords: T[],
  pendingChanges: PendingFarmChange[],
): T[] => {
  const merged = new Map(serverRecords.map((record) => [record.id, record]));
  pendingChanges
    .filter((change) => change.type === 'harvest')
    .slice()
    .sort(comparePendingChanges)
    .forEach((change) => {
      const record = change.data as T | undefined;
      if (!record?.id) return;
      if (change.action === 'delete') {
        merged.delete(record.id);
        return;
      }
      if (change.action === 'update' && change.previousData?.id) {
        merged.delete(change.previousData.id);
      }
      merged.set(record.id, record);
    });
  return Array.from(merged.values());
};

export const applyPendingPondChanges = (
  serverPonds: any[],
  changes: PendingFarmChange[],
): any[] => {
  let ponds = [...serverPonds];
  sortPendingChanges(changes).forEach((change) => {
    if (change.type === 'pond') {
      const pond = change.data;
      if (!pond?.id) return;
      if (change.action === 'delete') {
        ponds = ponds.filter((item) => item.id !== pond.id);
      } else {
        const existingIndex = ponds.findIndex((item) => item.id === pond.id);
        if (existingIndex >= 0) {
          ponds[existingIndex] = { ...ponds[existingIndex], ...pond };
        } else {
          ponds.push(pond);
        }
      }
      return;
    }
    if (change.type === 'sampling' && change.pondId) {
      ponds = ponds.map((pond) => {
        if (pond.id !== change.pondId) return pond;
        let samplings = [...(pond.samplings || [])];
        if (change.action === 'delete') {
          samplings = samplings.filter((sampling) => sampling.id !== change.samplingId);
        } else {
          const index = samplings.findIndex((sampling) => sampling.id === change.samplingId);
          if (index >= 0) samplings[index] = change.data;
          else samplings.push(change.data);
        }
        return { ...pond, samplings };
      });
      return;
    }
    if (change.type === 'mortality' && change.pondId) {
      ponds = ponds.map((pond) => {
        if (pond.id !== change.pondId) return pond;
        let records = [...(pond.mortalityRecords || [])];
        if (change.action === 'delete') {
          records = records.filter((record) => record.id !== change.recordId);
        } else {
          const index = records.findIndex((record) => record.id === change.recordId);
          if (index >= 0) records[index] = change.data;
          else records.push(change.data);
        }
        return { ...pond, mortalityRecords: records };
      });
      return;
    }
    if (change.type === 'harvest') {
      const record = change.data;
      if (!record?.id || !Array.isArray(record.ponds)) return;
      if (change.action === 'create') {
        ponds = ponds.map((pond) => {
          const harvestPond = record.ponds.find((item: any) => item.pondId === pond.id);
          if (!harvestPond) return pond;
          if (isHarvestImpactAppliedToPond(pond, change, record)) return pond;
          const updated = applyHarvestImpactToPond(pond, harvestPond, record.date, harvestPond.partialHarvestNumber);
          const currentAppliedIds = Array.isArray(pond.appliedHarvestIds) ? pond.appliedHarvestIds : [];
          return {
            ...updated,
            appliedHarvestOperationId: change.id,
            appliedHarvestOperationIds: [...new Set([...(pond.appliedHarvestOperationIds || []), change.id])],
            lastAppliedHarvestId: record.id,
            appliedHarvestIds: currentAppliedIds.includes(record.id) ? currentAppliedIds : [...currentAppliedIds, record.id],
          };
        });
      } else if (change.action === 'delete') {
        ponds = ponds.map((pond) => {
          const harvestPond = record.ponds.find((item: any) => item.pondId === pond.id);
          if (!harvestPond) return pond;
          if (isHarvestImpactReversedOnPond(pond, change, record)) return pond;
          const updated = reverseHarvestImpactOnPond(pond, harvestPond);
          const currentAppliedIds = Array.isArray(pond.appliedHarvestIds) ? pond.appliedHarvestIds : [];
          const nextAppliedIds = currentAppliedIds.filter((id: string) => id !== record.id);
          return {
            ...updated,
            appliedHarvestOperationId: change.id,
            reversedHarvestOperationIds: [...new Set([...(pond.reversedHarvestOperationIds || []), change.id])],
            lastAppliedHarvestId: pond.lastAppliedHarvestId === record.id ? (nextAppliedIds[nextAppliedIds.length - 1] ?? null) : pond.lastAppliedHarvestId,
            appliedHarvestIds: nextAppliedIds,
          };
        });
      } else if (change.action === 'update') {
        const previousRecord = change.previousData;
        ponds = ponds.map((pond) => {
          const previousHarvestPond = previousRecord?.ponds?.find((item: any) => item.pondId === pond.id);
          const nextHarvestPond = record.ponds?.find((item: any) => item.pondId === pond.id);
          if (!previousHarvestPond && !nextHarvestPond) return pond;
          if (isHarvestImpactAppliedToPond(pond, change, record)) return pond;
          const currentAppliedIds = Array.isArray(pond.appliedHarvestIds) ? pond.appliedHarvestIds : [];
          if (previousHarvestPond && !nextHarvestPond) {
            const updated = reverseHarvestImpactOnPond(pond, previousHarvestPond);
            const nextAppliedIds = currentAppliedIds.filter((id: string) => id !== previousRecord?.id && id !== record.id);
            return {
              ...updated,
              appliedHarvestOperationId: change.id,
              appliedHarvestOperationIds: [...new Set([...(pond.appliedHarvestOperationIds || []), change.id])],
              lastAppliedHarvestId: pond.lastAppliedHarvestId === previousRecord?.id ? (nextAppliedIds[nextAppliedIds.length - 1] ?? null) : pond.lastAppliedHarvestId,
              appliedHarvestIds: nextAppliedIds,
            };
          }
          if (!previousHarvestPond && nextHarvestPond) {
            const updated = applyHarvestImpactToPond(pond, nextHarvestPond, record.date, nextHarvestPond.partialHarvestNumber);
            const nextAppliedIds = currentAppliedIds.includes(record.id) ? currentAppliedIds : [...currentAppliedIds, record.id];
            return {
              ...updated,
              appliedHarvestOperationId: change.id,
              appliedHarvestOperationIds: [...new Set([...(pond.appliedHarvestOperationIds || []), change.id])],
              lastAppliedHarvestId: record.id,
              appliedHarvestIds: nextAppliedIds,
            };
          }
          const revertedPond = reverseHarvestImpactOnPond(pond, previousHarvestPond!);
          const updated = applyHarvestImpactToPond(revertedPond, nextHarvestPond!, record.date, nextHarvestPond!.partialHarvestNumber);
          const nextAppliedIds = [
            ...currentAppliedIds.filter((id: string) => id !== previousRecord?.id && id !== record.id),
            record.id,
          ];
          return {
            ...updated,
            appliedHarvestOperationId: change.id,
            appliedHarvestOperationIds: [...new Set([...(pond.appliedHarvestOperationIds || []), change.id])],
            lastAppliedHarvestId: record.id,
            appliedHarvestIds: nextAppliedIds,
          };
        });
      }
    }
  });
  return ponds;
};

export const replayPendingFarmState = (
  state: {
    ponds: any[];
    physicalPonds: any[];
    cycles: any[];
    harvestRecords: any[];
  },
  changes: PendingFarmChange[],
): {
  ponds: any[];
  physicalPonds: any[];
  cycles: any[];
  harvestRecords: any[];
} => {
  let ponds = [...state.ponds];
  let physicalPonds = [...state.physicalPonds];
  let cycles = [...state.cycles];
  let harvestRecords = [...state.harvestRecords];

  sortPendingChanges(changes).forEach((change) => {
    if (change.type === 'pond') {
      const pond = change.data;
      if (!pond?.id) return;
      if (change.action === 'delete') {
        ponds = ponds.filter((item) => item.id !== pond.id);
      } else {
        const existingIndex = ponds.findIndex((item) => item.id === pond.id);
        if (existingIndex >= 0) ponds[existingIndex] = { ...ponds[existingIndex], ...pond };
        else ponds.push(pond);
      }
      return;
    }
    if (change.type === 'physicalPond') {
      const pond = change.data;
      if (!pond?.id) return;
      if (change.action === 'delete') {
        physicalPonds = physicalPonds.filter((item) => item.id !== pond.id);
      } else {
        const existingIndex = physicalPonds.findIndex((item) => item.id === pond.id);
        if (existingIndex >= 0) physicalPonds[existingIndex] = { ...physicalPonds[existingIndex], ...pond };
        else physicalPonds.push(pond);
      }
      return;
    }
    if (change.type === 'cycle') {
      const cycle = change.data;
      if (!cycle?.id) return;
      if (change.action === 'delete') {
        cycles = cycles.filter((item) => item.id !== cycle.id);
      } else {
        const existingIndex = cycles.findIndex((item) => item.id === cycle.id);
        if (existingIndex >= 0) cycles[existingIndex] = { ...cycles[existingIndex], ...cycle };
        else cycles.push(cycle);
      }
      return;
    }
    if (change.type === 'sampling' && change.pondId) {
      ponds = ponds.map((pond) => {
        if (pond.id !== change.pondId) return pond;
        let samplings = [...(pond.samplings || [])];
        if (change.action === 'delete') {
          samplings = samplings.filter((sampling) => sampling.id !== change.samplingId);
        } else {
          const index = samplings.findIndex((sampling) => sampling.id === change.samplingId);
          if (index >= 0) samplings[index] = change.data;
          else samplings.push(change.data);
        }
        return { ...pond, samplings };
      });
      return;
    }
    if (change.type === 'mortality' && change.pondId) {
      ponds = ponds.map((pond) => {
        if (pond.id !== change.pondId) return pond;
        let records = [...(pond.mortalityRecords || [])];
        if (change.action === 'delete') {
          records = records.filter((record) => record.id !== change.recordId);
        } else {
          const index = records.findIndex((record) => record.id === change.recordId);
          if (index >= 0) records[index] = change.data;
          else records.push(change.data);
        }
        return { ...pond, mortalityRecords: records };
      });
      return;
    }
    if (change.type === 'harvest') {
      const record = change.data;
      if (!record?.id || !Array.isArray(record.ponds)) return;
      const existing = harvestRecords.find((item) => item.id === record.id);
      if (change.action === 'create') {
        const alreadyInHarvestRecords = Boolean(existing);
        if (!existing) harvestRecords = [record, ...harvestRecords];
        ponds = ponds.map((pond) => {
          const harvestPond = record.ponds.find((item: any) => item.pondId === pond.id);
          if (!harvestPond) return pond;
          if (alreadyInHarvestRecords || isHarvestImpactAppliedToPond(pond, change, record)) {
            const currentAppliedIds = Array.isArray(pond.appliedHarvestIds) ? pond.appliedHarvestIds : [];
            return {
              ...pond,
              appliedHarvestOperationId: pond.appliedHarvestOperationId || change.id,
              appliedHarvestOperationIds: [...new Set([...(pond.appliedHarvestOperationIds || []), change.id])],
              lastAppliedHarvestId: pond.lastAppliedHarvestId || record.id,
              appliedHarvestIds: currentAppliedIds.includes(record.id) ? currentAppliedIds : [...currentAppliedIds, record.id],
            };
          }
          const updated = applyHarvestImpactToPond(pond, harvestPond, record.date, harvestPond.partialHarvestNumber);
          const currentAppliedIds = Array.isArray(pond.appliedHarvestIds) ? pond.appliedHarvestIds : [];
          return {
            ...updated,
            appliedHarvestOperationId: change.id,
            appliedHarvestOperationIds: [...new Set([...(pond.appliedHarvestOperationIds || []), change.id])],
            lastAppliedHarvestId: record.id,
            appliedHarvestIds: currentAppliedIds.includes(record.id) ? currentAppliedIds : [...currentAppliedIds, record.id],
          };
        });
      } else if (change.action === 'delete') {
        if (existing) harvestRecords = harvestRecords.filter((item) => item.id !== record.id);
        ponds = ponds.map((pond) => {
          const harvestPond = (existing || record).ponds?.find((item: any) => item.pondId === pond.id);
          if (!harvestPond) return pond;
          // A cache without the record may already contain the optimistic reversal.
          // Only reverse again when the cached record or an explicit apply receipt proves impact remains.
          if (!existing
            && pond.lastAppliedHarvestId !== record.id
            && !(Array.isArray(pond.appliedHarvestIds) && pond.appliedHarvestIds.includes(record.id))) return pond;
          if (isHarvestImpactReversedOnPond(pond, change, record)) {
            const currentAppliedIds = Array.isArray(pond.appliedHarvestIds) ? pond.appliedHarvestIds : [];
            const nextAppliedIds = currentAppliedIds.filter((id: string) => id !== record.id);
            return {
              ...pond,
              appliedHarvestOperationId: pond.appliedHarvestOperationId || change.id,
              reversedHarvestOperationIds: [...new Set([...(pond.reversedHarvestOperationIds || []), change.id])],
              lastAppliedHarvestId: pond.lastAppliedHarvestId === record.id ? (nextAppliedIds[nextAppliedIds.length - 1] ?? null) : pond.lastAppliedHarvestId,
              appliedHarvestIds: nextAppliedIds,
            };
          }
          const updated = reverseHarvestImpactOnPond(pond, harvestPond);
          const currentAppliedIds = Array.isArray(pond.appliedHarvestIds) ? pond.appliedHarvestIds : [];
          const nextAppliedIds = currentAppliedIds.filter((id: string) => id !== record.id);
          return {
            ...updated,
            appliedHarvestOperationId: change.id,
            reversedHarvestOperationIds: [...new Set([...(pond.reversedHarvestOperationIds || []), change.id])],
            lastAppliedHarvestId: pond.lastAppliedHarvestId === record.id ? (nextAppliedIds[nextAppliedIds.length - 1] ?? null) : pond.lastAppliedHarvestId,
            appliedHarvestIds: nextAppliedIds,
          };
        });
      } else if (change.action === 'update') {
        const previousRecord = change.previousData || existing;
        const alreadyUpdated = existing && JSON.stringify(existing) === JSON.stringify(record);
        if (!alreadyUpdated) {
          ponds = ponds.map((pond) => {
            const previousHarvestPond = previousRecord?.ponds?.find((item: any) => item.pondId === pond.id);
            const nextHarvestPond = record.ponds?.find((item: any) => item.pondId === pond.id);
            if (!previousHarvestPond && !nextHarvestPond) return pond;
            if (isHarvestImpactAppliedToPond(pond, change, record)) return pond;
            const currentAppliedIds = Array.isArray(pond.appliedHarvestIds) ? pond.appliedHarvestIds : [];
            if (previousHarvestPond && !nextHarvestPond) {
              const updated = reverseHarvestImpactOnPond(pond, previousHarvestPond);
              const nextAppliedIds = currentAppliedIds.filter((id: string) => id !== previousRecord?.id && id !== record.id);
              return {
                ...updated,
                appliedHarvestOperationId: change.id,
                appliedHarvestOperationIds: [...new Set([...(pond.appliedHarvestOperationIds || []), change.id])],
                lastAppliedHarvestId: pond.lastAppliedHarvestId === previousRecord?.id ? (nextAppliedIds[nextAppliedIds.length - 1] ?? null) : pond.lastAppliedHarvestId,
                appliedHarvestIds: nextAppliedIds,
              };
            }
            if (!previousHarvestPond && nextHarvestPond) {
              const updated = applyHarvestImpactToPond(pond, nextHarvestPond, record.date, nextHarvestPond.partialHarvestNumber);
              const nextAppliedIds = currentAppliedIds.includes(record.id) ? currentAppliedIds : [...currentAppliedIds, record.id];
              return {
                ...updated,
                appliedHarvestOperationId: change.id,
                appliedHarvestOperationIds: [...new Set([...(pond.appliedHarvestOperationIds || []), change.id])],
                lastAppliedHarvestId: record.id,
                appliedHarvestIds: nextAppliedIds,
              };
            }
            const revertedPond = reverseHarvestImpactOnPond(pond, previousHarvestPond!);
            const updated = applyHarvestImpactToPond(revertedPond, nextHarvestPond!, record.date, nextHarvestPond!.partialHarvestNumber);
            const nextAppliedIds = [
              ...currentAppliedIds.filter((id: string) => id !== previousRecord?.id && id !== record.id),
              record.id,
            ];
            return {
              ...updated,
              appliedHarvestOperationId: change.id,
              appliedHarvestOperationIds: [...new Set([...(pond.appliedHarvestOperationIds || []), change.id])],
              lastAppliedHarvestId: record.id,
              appliedHarvestIds: nextAppliedIds,
            };
          });
        }
        harvestRecords = applyPendingHarvestChanges(harvestRecords, [change]);
      }
    }
  });

  return { ponds, physicalPonds, cycles, harvestRecords };
};
