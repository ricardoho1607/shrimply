import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  getOfflineRetryDelay,
  isUsableNetworkState,
  shouldApplyRemoteCollectionSnapshot,
} from './offlineSnapshotPolicy.ts';

test('keeps hydrated farm data when Firestore only returns an empty offline cache snapshot', () => {
  assert.equal(shouldApplyRemoteCollectionSnapshot({
    fromCache: true,
    incomingCount: 0,
    currentCount: 3,
  }), false);
});

test('accepts authoritative empty snapshots and cached snapshots containing data', () => {
  assert.equal(shouldApplyRemoteCollectionSnapshot({
    fromCache: false,
    incomingCount: 0,
    currentCount: 3,
  }), true);
  assert.equal(shouldApplyRemoteCollectionSnapshot({
    fromCache: true,
    incomingCount: 2,
    currentCount: 3,
  }), true);
});

test('does not report online when the device has a network but no reachable internet', () => {
  assert.equal(isUsableNetworkState({ isConnected: true, isInternetReachable: false }), false);
  assert.equal(isUsableNetworkState({ isConnected: true, isInternetReachable: true }), true);
  assert.equal(isUsableNetworkState({ isConnected: false, isInternetReachable: true }), false);
});

test('backs off failed reconnect syncs and caps the delay', () => {
  assert.equal(getOfflineRetryDelay(0), 1000);
  assert.equal(getOfflineRetryDelay(1), 2000);
  assert.equal(getOfflineRetryDelay(10), 30000);
});

test('mobile sync applies the offline guards to every persisted farm collection', () => {
  const syncSource = readFileSync('app/hooks/useFirebaseSync.ts', 'utf8');
  const snapshotGuardUses = syncSource.match(/shouldApplyRemoteCollectionSnapshot\(/g) || [];

  assert.equal(snapshotGuardUses.length, 4);
  assert.match(syncSource, /isUsableNetworkState\(state\)/);
  assert.match(syncSource, /getOfflineRetryDelay\(retryAttemptRef\.current\)/);
});
