import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRandomBytesAsync } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { fromByteArray, toByteArray } from 'base64-js';
import {
  decryptStorageValue,
  encryptStorageValue,
  isProtectedStorageEnvelope,
  utf8ToBytes,
} from '../../shared/protectedStorage';
import { isUserScopedCacheKey, isUserPendingWorkKey } from '../../shared/farmCache';

const KEY_SIZE = 32;
const NONCE_SIZE = 24;
const KEY_PREFIX = 'shrimply.cache-key.v1.';

const blockedUsers = new Set<string>();
const retainedPendingUsers = new Set<string>();
const userGenerations = new Map<string, number>();
const cachedKeys = new Map<string, Uint8Array>();
const pendingKeys = new Map<string, Promise<Uint8Array | null>>();
let availabilityPromise: Promise<boolean> | null = null;

const getUserGeneration = (userId: string): number => userGenerations.get(userId) ?? 0;

const isCurrentOperation = (userId: string, generation: number): boolean =>
  !blockedUsers.has(userId) && getUserGeneration(userId) === generation;

const getSecureStoreKey = (userId: string): string => {
  const encodedUserId = fromByteArray(utf8ToBytes(userId))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  return `${KEY_PREFIX}${encodedUserId}`;
};

const isAvailable = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;
  availabilityPromise ??= SecureStore.isAvailableAsync().catch(() => false);
  return availabilityPromise;
};

const readOrCreateKey = async (userId: string): Promise<Uint8Array | null> => {
  if (blockedUsers.has(userId) || !await isAvailable()) return null;
  const cached = cachedKeys.get(userId);
  if (cached) return cached;

  const existingPromise = pendingKeys.get(userId);
  if (existingPromise) return existingPromise;

  const keyPromise = (async () => {
    const keyName = getSecureStoreKey(userId);
    const stored = await SecureStore.getItemAsync(keyName);
    if (blockedUsers.has(userId)) return null;

    if (stored) {
      try {
        const key = toByteArray(stored);
        if (key.length === KEY_SIZE && !blockedUsers.has(userId)) {
          cachedKeys.set(userId, key);
          return key;
        }
      } catch {
        // Replace malformed key material below.
      }
    }

    const key = await getRandomBytesAsync(KEY_SIZE);
    if (blockedUsers.has(userId)) return null;
    await SecureStore.setItemAsync(keyName, fromByteArray(key), {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
    if (blockedUsers.has(userId)) {
      if (!retainedPendingUsers.has(userId)) await SecureStore.deleteItemAsync(keyName);
      return null;
    }
    cachedKeys.set(userId, key);
    return key;
  })().finally(() => pendingKeys.delete(userId));

  pendingKeys.set(userId, keyPromise);
  return keyPromise;
};

export const enableProtectedStorageForUser = (userId: string): void => {
  blockedUsers.delete(userId);
};

const writeProtectedItemAtGeneration = async (
  userId: string,
  storageKey: string,
  value: string,
  generation: number,
): Promise<void> => {
  if (!isCurrentOperation(userId, generation)) return;
  const key = await readOrCreateKey(userId);
  if (!key) {
    if (isCurrentOperation(userId, generation)) await AsyncStorage.removeItem(storageKey);
    return;
  }
  if (!isCurrentOperation(userId, generation)) return;
  const nonce = await getRandomBytesAsync(NONCE_SIZE);
  if (!isCurrentOperation(userId, generation)) return;
  const encrypted = encryptStorageValue(value, key, nonce, storageKey);
  await AsyncStorage.setItem(storageKey, encrypted);
  if (!isCurrentOperation(userId, generation)) {
    const current = await AsyncStorage.getItem(storageKey);
    if (current === encrypted) await AsyncStorage.removeItem(storageKey);
  }
};

export const readProtectedItem = async (userId: string, storageKey: string): Promise<string | null> => {
  const generation = getUserGeneration(userId);
  if (!isCurrentOperation(userId, generation)) return null;
  const key = await readOrCreateKey(userId);
  if (!key) {
    if (isCurrentOperation(userId, generation)) await AsyncStorage.removeItem(storageKey);
    return null;
  }

  const raw = await AsyncStorage.getItem(storageKey);
  if (!raw || !isCurrentOperation(userId, generation)) return null;
  if (isProtectedStorageEnvelope(raw)) {
    const value = decryptStorageValue(raw, key, storageKey);
    return isCurrentOperation(userId, generation) ? value : null;
  }

  await writeProtectedItemAtGeneration(userId, storageKey, raw, generation);
  return isCurrentOperation(userId, generation) ? raw : null;
};

export const writeProtectedItem = async (
  userId: string,
  storageKey: string,
  value: string,
): Promise<void> => {
  const generation = getUserGeneration(userId);
  await writeProtectedItemAtGeneration(userId, storageKey, value, generation);
};

export const removeProtectedItem = async (storageKey: string): Promise<void> => {
  await AsyncStorage.removeItem(storageKey);
};

export const clearProtectedStorageForUser = async (userId: string, preservePendingWork = false): Promise<void> => {
  if (preservePendingWork) retainedPendingUsers.add(userId);
  else retainedPendingUsers.delete(userId);
  blockedUsers.add(userId);
  userGenerations.set(userId, getUserGeneration(userId) + 1);
  cachedKeys.delete(userId);

  const pendingKey = pendingKeys.get(userId);
  if (pendingKey) await pendingKey.catch(() => undefined);
  cachedKeys.delete(userId);

  let cleanupError: unknown;
  try {
    if (!preservePendingWork && await isAvailable()) {
      await SecureStore.deleteItemAsync(getSecureStoreKey(userId));
    }
  } catch (error) {
    cleanupError = error;
  }

  try {
    const keys = await AsyncStorage.getAllKeys();
    const userKeys = keys.filter((key) => isUserScopedCacheKey(key, userId) && !(preservePendingWork && isUserPendingWorkKey(key, userId)));
    if (userKeys.length > 0) await AsyncStorage.multiRemove(userKeys);
  } catch (error) {
    cleanupError ??= error;
  }

  if (cleanupError) throw cleanupError;
};
