import { toCacheSafeValue } from './farmCache.ts';

export const OFFLINE_WORKSPACE_VERSION = 1;

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
  action: 'stockIn' | 'consume' | 'restore';
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
    if (!isRecord(value.inventory)
      || (value.inventory.collection !== 'feeds' && value.inventory.collection !== 'additives')
      || !Array.isArray(value.inventory.adjustments)
      || value.inventory.adjustments.length === 0
      || !value.inventory.adjustments.every((adjustment) => (
        isRecord(adjustment)
        && typeof adjustment.itemId === 'string'
        && ['stockIn', 'consume', 'restore'].includes(adjustment.action as string)
        && typeof adjustment.quantity === 'number'
        && adjustment.quantity > 0
        && (adjustment.useFixedUnitPrice === undefined || typeof adjustment.useFixedUnitPrice === 'boolean')
        && (adjustment.useFifoCost === undefined || typeof adjustment.useFifoCost === 'boolean')
        && (adjustment.createItem === undefined || isRecord(adjustment.createItem))
        && isRecord(adjustment.historyEntry)
        && typeof adjustment.historyEntry.id === 'string'
      ))) return false;
  }
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
        };
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
