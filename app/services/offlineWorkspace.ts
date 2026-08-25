import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system/legacy';
import {
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Platform } from 'react-native';
import app, { db, storage } from '../../config/firebase';
import {
  createOfflineCollectionSnapshot,
  createOfflineMutationQueue,
  applyOfflineMutationToCollection,
  getOfflineCollectionKey,
  getOfflineMutationQueueKey,
  parseOfflineCollectionSnapshot,
  parseOfflineMutationQueue,
  type OfflineMutation,
  type OfflineInventoryMutationData,
} from '../../shared/offlineWorkspace';
import { isUsableNetworkState } from '../../shared/offlineSnapshotPolicy';
import { calculateFifoConsumption } from '../../shared/treatmentMix';
import {
  readProtectedItem,
  removeProtectedItem,
  writeProtectedItem,
} from './protectedStorage';

const cacheWriteChains = new Map<string, Promise<void>>();
const queueWriteChains = new Map<string, Promise<void>>();
const queueFlushes = new Map<string, Promise<number>>();
const retryAttempts = new Map<string, number>();
const retryTimers = new Map<string, ReturnType<typeof setTimeout>>();

const isLocalFileUri = (value: string): boolean =>
  value.startsWith('file://') || value.startsWith('content://');

const mapNestedValues = async (
  value: unknown,
  mapString: (value: string) => Promise<string>,
): Promise<unknown> => {
  if (typeof value === 'string') return mapString(value);
  if (Array.isArray(value)) return Promise.all(value.map((entry) => mapNestedValues(entry, mapString)));
  if (!value || typeof value !== 'object') return value;
  const entries = await Promise.all(Object.entries(value).map(async ([key, entry]) => [
    key,
    await mapNestedValues(entry, mapString),
  ] as const));
  return Object.fromEntries(entries);
};

const persistMutationLocalFiles = async (mutation: OfflineMutation): Promise<OfflineMutation> => {
  if (!mutation.uploadLocalFiles || !mutation.data || Platform.OS === 'web' || !FileSystem.documentDirectory) {
    return mutation;
  }
  const directory = `${FileSystem.documentDirectory}offline-uploads/${mutation.id}/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  let fileIndex = 0;
  const data = await mapNestedValues(mutation.data, async (value) => {
    if (!isLocalFileUri(value) || value.startsWith(directory)) return value;
    const extension = value.match(/\.([a-zA-Z0-9]{1,8})(?:\?|$)/)?.[1] ?? 'bin';
    const destination = `${directory}${fileIndex++}.${extension}`;
    await FileSystem.copyAsync({ from: value, to: destination });
    return destination;
  });
  return { ...mutation, data: data as Record<string, unknown> };
};

const uploadMutationLocalFiles = async (mutation: OfflineMutation): Promise<Record<string, unknown>> => {
  if (!mutation.uploadLocalFiles || !mutation.data) return mutation.data ?? {};
  let fileIndex = 0;
  return await mapNestedValues(mutation.data, async (value) => {
    if (!isLocalFileUri(value)) return value;
    const response = await fetch(value);
    const blob = await response.blob();
    const storagePath = mutation.uploadPath && fileIndex === 0
      ? mutation.uploadPath
      : `offline-uploads/${mutation.companyId}/${mutation.id}/${fileIndex}`;
    fileIndex += 1;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, blob);
    return getDownloadURL(storageRef);
  }) as Record<string, unknown>;
};

const cleanupMutationLocalFiles = async (mutation: OfflineMutation): Promise<void> => {
  if (!mutation.uploadLocalFiles || Platform.OS === 'web' || !FileSystem.documentDirectory) return;
  const directory = `${FileSystem.documentDirectory}offline-uploads/${mutation.id}/`;
  await FileSystem.deleteAsync(directory, { idempotent: true }).catch(() => undefined);
};

const serializeWrite = (
  chains: Map<string, Promise<void>>,
  key: string,
  operation: () => Promise<void>,
): Promise<void> => {
  const previous = chains.get(key) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(operation);
  chains.set(key, next);
  void next.finally(() => {
    if (chains.get(key) === next) chains.delete(key);
  });
  return next;
};

export const isWorkspaceOnline = async (): Promise<boolean> => {
  const state = await NetInfo.fetch();
  return isUsableNetworkState(state);
};

export const loadOfflineCollection = async <T>(
  userId: string,
  companyId: string,
  scope: string,
): Promise<T[]> => {
  const key = getOfflineCollectionKey(userId, companyId, scope);
  try {
    const raw = await readProtectedItem(userId, key);
    const snapshot = raw
      ? parseOfflineCollectionSnapshot<T>(raw, userId, companyId, scope)
      : null;
    if (!snapshot && raw) await removeProtectedItem(key);
    return snapshot?.data ?? [];
  } catch (error) {
    console.error(`[OfflineWorkspace] failed to load ${scope}:`, error);
    return [];
  }
};

export const loadOfflineCollectionWithMutations = async <T extends { id: string }>(
  userId: string,
  companyId: string,
  scope: string,
  collectionPath: string[],
): Promise<T[]> => {
  const [cached, mutations] = await Promise.all([
    loadOfflineCollection<T>(userId, companyId, scope),
    listOfflineMutations(userId, companyId),
  ]);
  return mutations
    .filter((mutation) => (
      mutation.kind === 'inventory'
        ? collectionPath[collectionPath.length - 1] === mutation.inventory?.collection
        : mutation.path.length === collectionPath.length + 1
          && collectionPath.every((segment, index) => mutation.path[index] === segment)
    ))
    .reduce((current, mutation) => applyOfflineMutationToCollection(current, mutation), cached);
};

export const overlayOfflineMutations = async <T extends { id: string }>(
  data: T[],
  userId: string,
  companyId: string,
  collectionPath: string[],
): Promise<T[]> => {
  const mutations = await listOfflineMutations(userId, companyId);
  return mutations
    .filter((mutation) => (
      mutation.kind === 'inventory'
        ? collectionPath[collectionPath.length - 1] === mutation.inventory?.collection
        : mutation.path.length === collectionPath.length + 1
          && collectionPath.every((segment, index) => mutation.path[index] === segment)
    ))
    .reduce((current, mutation) => applyOfflineMutationToCollection(current, mutation), data);
};

export const persistCollectionAfterMutation = async <T extends { id: string }>(
  mutation: OfflineMutation,
  scope: string,
  collectionPath: string[],
): Promise<T[]> => {
  await saveDurableMutation(mutation, { deferFlush: true });
  const data = await loadOfflineCollectionWithMutations<T>(
    mutation.userId,
    mutation.companyId,
    scope,
    collectionPath,
  );
  await persistOfflineCollection(mutation.userId, mutation.companyId, scope, data);
  requestOfflineMutationFlush(mutation.userId, mutation.companyId);
  return data;
};

export const persistOfflineCollection = async <T>(
  userId: string,
  companyId: string,
  scope: string,
  data: T[],
): Promise<void> => {
  const key = getOfflineCollectionKey(userId, companyId, scope);
  const snapshot = createOfflineCollectionSnapshot(userId, companyId, scope, data);
  await serializeWrite(cacheWriteChains, key, () =>
    writeProtectedItem(userId, key, JSON.stringify(snapshot))
  );
};

const readMutationQueue = async (
  userId: string,
  companyId: string,
): Promise<OfflineMutation[]> => {
  const key = getOfflineMutationQueueKey(userId, companyId);
  const raw = await readProtectedItem(userId, key);
  if (!raw) return [];
  const parsed = parseOfflineMutationQueue(raw, userId, companyId);
  if (!parsed) {
    await removeProtectedItem(key);
    return [];
  }
  return parsed.mutations;
};

const writeMutationQueue = async (
  userId: string,
  companyId: string,
  mutations: OfflineMutation[],
): Promise<void> => {
  const key = getOfflineMutationQueueKey(userId, companyId);
  if (mutations.length === 0) {
    await removeProtectedItem(key);
    return;
  }
  const queue = createOfflineMutationQueue(userId, companyId, mutations);
  await writeProtectedItem(userId, key, JSON.stringify(queue));
};

export const listOfflineMutations = async (
  userId: string,
  companyId: string,
): Promise<OfflineMutation[]> => {
  const key = getOfflineMutationQueueKey(userId, companyId);
  const pendingWrite = queueWriteChains.get(key);
  if (pendingWrite) await pendingWrite.catch(() => undefined);
  return readMutationQueue(userId, companyId);
};

export const enqueueOfflineMutation = async (mutation: OfflineMutation): Promise<void> => {
  const key = getOfflineMutationQueueKey(mutation.userId, mutation.companyId);
  await serializeWrite(queueWriteChains, key, async () => {
    const existing = await readMutationQueue(mutation.userId, mutation.companyId);
    await writeMutationQueue(
      mutation.userId,
      mutation.companyId,
      [...existing.filter((entry) => entry.id !== mutation.id), mutation],
    );
  });
};

const removeOfflineMutation = async (mutation: OfflineMutation): Promise<void> => {
  const key = getOfflineMutationQueueKey(mutation.userId, mutation.companyId);
  await serializeWrite(queueWriteChains, key, async () => {
    const existing = await readMutationQueue(mutation.userId, mutation.companyId);
    await writeMutationQueue(
      mutation.userId,
      mutation.companyId,
      existing.filter((entry) => entry.id !== mutation.id),
    );
  });
};

const applyRemoteMutation = async (mutation: OfflineMutation): Promise<void> => {
  if (mutation.kind === 'inventory') {
    const inventory = mutation.inventory as OfflineInventoryMutationData;
    await runTransaction(db, async (transaction) => {
      const references = inventory.adjustments.map((adjustment) =>
        doc(db, 'companies', mutation.companyId, inventory.collection, adjustment.itemId)
      );
      const snapshots = await Promise.all(references.map((reference) => transaction.get(reference)));

      inventory.adjustments.forEach((adjustment, index) => {
        const snapshot = snapshots[index];
        if (!snapshot.exists()) {
          if (adjustment.action !== 'stockIn' || !adjustment.createItem) {
            throw new Error(`Inventory item ${adjustment.itemId} was not found`);
          }
          const historyEntry = restoreFirestoreValues(adjustment.historyEntry) as Record<string, unknown>;
          const price = Number(adjustment.price);
          if (!Number.isFinite(price) || price <= 0) throw new Error('Inventory price is missing');
          transaction.set(references[index], {
            ...restoreFirestoreValues(adjustment.createItem) as Record<string, unknown>,
            id: adjustment.itemId,
            stockInHistory: [historyEntry],
            usageHistory: [],
            totalStock: adjustment.quantity,
            totalCost: adjustment.quantity * price,
            createdAt: serverTimestamp(),
            lastUpdated: serverTimestamp(),
          });
          return;
        }
        const item = snapshot.data() as {
          totalStock?: number;
          totalCost?: number;
          stockInHistory?: Record<string, unknown>[];
          usageHistory?: Record<string, unknown>[];
        };
        const historyField = adjustment.action === 'stockIn' ? 'stockInHistory' : 'usageHistory';
        const history = [...(item[historyField] ?? [])];
        if (history.some((entry) => entry.id === adjustment.historyEntry.id)) return;

        const currentStock = Number(item.totalStock) || 0;
        const currentCost = Number(item.totalCost) || 0;
        let nextStock = currentStock;
        let nextCost = currentCost;
        let historyEntry = restoreFirestoreValues(adjustment.historyEntry) as Record<string, unknown>;

        if (adjustment.action === 'stockIn') {
          const price = Number(adjustment.price);
          if (!Number.isFinite(price) || price <= 0) throw new Error('Inventory price is missing');
          nextStock += adjustment.quantity;
          nextCost += adjustment.quantity * price;
        } else {
          const suppliedUnitPrice = Number(adjustment.historyEntry.unitPrice);
          const fifoCost = adjustment.action === 'consume' && adjustment.useFifoCost
            ? calculateFifoConsumption(
              item.stockInHistory as any[] || [],
              item.usageHistory as any[] || [],
              adjustment.quantity,
            )
            : null;
          const unitPrice = fifoCost
            ? fifoCost.unitPrice
            : adjustment.action === 'consume' && !adjustment.useFixedUnitPrice
              ? (currentStock > 0 ? currentCost / currentStock : 0)
              : suppliedUnitPrice > 0
                ? suppliedUnitPrice
                : currentStock > 0 ? currentCost / currentStock : 0;
          if (!Number.isFinite(unitPrice) || unitPrice <= 0) throw new Error('Inventory cost is missing');
          if (adjustment.action === 'consume') {
            if (adjustment.quantity > currentStock + 0.000001) throw new Error('Insufficient inventory stock');
            nextStock = currentStock - adjustment.quantity;
            nextCost = fifoCost?.remainingCost ?? Math.max(0, currentCost - (adjustment.quantity * unitPrice));
            historyEntry = {
              ...historyEntry,
              quantity: adjustment.quantity,
              unitPrice,
              totalCost: adjustment.quantity * unitPrice,
            };
          } else {
            nextStock = currentStock + adjustment.quantity;
            nextCost = currentCost + (adjustment.quantity * unitPrice);
            historyEntry = {
              ...historyEntry,
              quantity: -adjustment.quantity,
              unitPrice,
              totalCost: -(adjustment.quantity * unitPrice),
            };
          }
        }

        transaction.update(references[index], {
          [historyField]: [...history, historyEntry],
          totalStock: nextStock,
          totalCost: nextCost,
          lastUpdated: serverTimestamp(),
        });
      });
    });
    return;
  }
  const reference = doc(db, mutation.path[0], ...mutation.path.slice(1));
  if (mutation.kind === 'delete') {
    await deleteDoc(reference);
    return;
  }

  function restoreFirestoreValues(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(restoreFirestoreValues);
    if (!value || typeof value !== 'object') return value;
    const record = value as Record<string, unknown>;
    if (typeof record.seconds === 'number'
      && typeof record.nanoseconds === 'number'
      && Object.keys(record).every((key) => key === 'seconds' || key === 'nanoseconds')) {
      return new Timestamp(record.seconds, record.nanoseconds);
    }
    return Object.entries(record).reduce<Record<string, unknown>>((restored, [key, entry]) => {
      restored[key] = restoreFirestoreValues(entry);
      return restored;
    }, {});
  }
  const uploadedData = await uploadMutationLocalFiles(mutation);
  const data = restoreFirestoreValues(uploadedData) as Record<string, unknown>;
  mutation.serverTimestampFields?.forEach((field) => {
    data[field] = serverTimestamp();
  });
  if (mutation.createOnly) {
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) transaction.set(reference, data);
    });
  } else {
    await setDoc(reference, data, { merge: mutation.merge !== false });
  }
  if (mutation.functionCall) {
    const callable = httpsCallable(getFunctions(app), mutation.functionCall.name);
    await callable(mutation.functionCall.payload);
  }
  await cleanupMutationLocalFiles(mutation);
};

export const flushOfflineMutations = async (
  userId: string,
  companyId: string,
): Promise<number> => {
  const key = getOfflineMutationQueueKey(userId, companyId);
  const existingFlush = queueFlushes.get(key);
  if (existingFlush) return existingFlush;

  const flush = (async () => {
    if (!await isWorkspaceOnline()) return 0;
    let applied = 0;
    while (true) {
      const mutations = await listOfflineMutations(userId, companyId);
      if (mutations.length === 0) return applied;
      let firstError: unknown;
      for (const mutation of mutations) {
        try {
          await applyRemoteMutation(mutation);
          await removeOfflineMutation(mutation);
          applied += 1;
        } catch (error) {
          firstError ??= error;
          console.error(`[OfflineWorkspace] mutation ${mutation.id} is waiting to retry:`, error);
        }
      }
      if (firstError) throw firstError;
    }
  })();
  queueFlushes.set(key, flush);
  try {
    return await flush;
  } finally {
    if (queueFlushes.get(key) === flush) queueFlushes.delete(key);
  }
};

export const saveDurableMutation = async (
  mutation: OfflineMutation,
  options: { deferFlush?: boolean } = {},
): Promise<OfflineMutation> => {
  const durableMutation = await persistMutationLocalFiles(mutation);
  await enqueueOfflineMutation(durableMutation);
  if (!options.deferFlush) {
    requestOfflineMutationFlush(durableMutation.userId, durableMutation.companyId);
  }
  return durableMutation;
};

export const requestOfflineMutationFlush = (userId: string, companyId: string): void => {
  const key = getOfflineMutationQueueKey(userId, companyId);
  if (retryTimers.has(key)) return;

  void flushOfflineMutations(userId, companyId).then(async () => {
    retryAttempts.delete(key);
    if (await isWorkspaceOnline() && (await listOfflineMutations(userId, companyId)).length > 0) {
      requestOfflineMutationFlush(userId, companyId);
    }
  }).catch(async (error) => {
    console.error('[OfflineWorkspace] queued write is waiting to retry:', error);
    if (!await isWorkspaceOnline()) return;
    const attempt = retryAttempts.get(key) ?? 0;
    retryAttempts.set(key, attempt + 1);
    const delay = Math.min(1000 * (2 ** attempt), 30000);
    const timer = setTimeout(() => {
      retryTimers.delete(key);
      requestOfflineMutationFlush(userId, companyId);
    }, delay);
    retryTimers.set(key, timer);
  });
};

export const createOfflineOperationId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
