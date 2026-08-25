import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  OFFLINE_WORKSPACE_VERSION,
  applyOfflineMutationToCollection,
  createOfflineCollectionSnapshot,
  createOfflineMutationQueue,
  getOfflineCollectionKey,
  getOfflineMutationQueueKey,
  parseOfflineCollectionSnapshot,
  parseOfflineMutationQueue,
  type OfflineMutation,
} from './offlineWorkspace.ts';

test('offline collection snapshots are encrypted-storage friendly and identity scoped', () => {
  const key = getOfflineCollectionKey('user-a', 'company-a', 'inventory');
  assert.notEqual(key, getOfflineCollectionKey('user-b', 'company-a', 'inventory'));
  assert.notEqual(key, getOfflineCollectionKey('user-a', 'company-b', 'inventory'));

  const snapshot = createOfflineCollectionSnapshot('user-a', 'company-a', 'inventory', [
    { id: 'feed-a', updatedAt: new Date('2026-01-01T00:00:00.000Z') },
  ]);
  const parsed = parseOfflineCollectionSnapshot(
    JSON.stringify(snapshot),
    'user-a',
    'company-a',
    'inventory',
  );

  assert.equal(parsed?.version, OFFLINE_WORKSPACE_VERSION);
  assert.equal((parsed?.data[0] as { updatedAt: string }).updatedAt, '2026-01-01T00:00:00.000Z');
  assert.equal(parseOfflineCollectionSnapshot(JSON.stringify(snapshot), 'user-b', 'company-a', 'inventory'), null);
});

test('durable mutation queue rejects another user or company and keeps stable operation ids', () => {
  const mutation: OfflineMutation = {
    id: 'operation-a',
    companyId: 'company-a',
    userId: 'user-a',
    createdAt: 100,
    kind: 'set',
    path: ['companies', 'company-a', 'feeds', 'feed-a'],
    data: { id: 'feed-a', totalStock: 10 },
    merge: true,
  };
  const queue = createOfflineMutationQueue('user-a', 'company-a', [mutation, mutation]);

  assert.equal(queue.mutations.length, 1);
  assert.ok(parseOfflineMutationQueue(JSON.stringify(queue), 'user-a', 'company-a'));
  const queueWithDamagedEntry = {
    ...queue,
    mutations: [...queue.mutations, { id: 'damaged' }],
  };
  assert.deepEqual(
    parseOfflineMutationQueue(JSON.stringify(queueWithDamagedEntry), 'user-a', 'company-a')?.mutations,
    [mutation],
  );
  assert.equal(parseOfflineMutationQueue(JSON.stringify(queue), 'user-a', 'company-b'), null);
  assert.notEqual(
    getOfflineMutationQueueKey('user-a', 'company-a'),
    getOfflineMutationQueueKey('user-a', 'company-b'),
  );
});

test('queued writes replay into cached collections before the network returns', () => {
  const original = [{ id: 'feed-a', totalStock: 10, brand: 'A' }];
  const updated = applyOfflineMutationToCollection(original, {
    id: 'operation-a',
    companyId: 'company-a',
    userId: 'user-a',
    createdAt: 100,
    kind: 'set',
    path: ['companies', 'company-a', 'feeds', 'feed-a'],
    data: { id: 'feed-a', totalStock: 7 },
    merge: true,
  });

  assert.deepEqual(updated, [{ id: 'feed-a', totalStock: 7, brand: 'A' }]);
});

test('inventory mutations are idempotent and cannot deduct twice after a retry', () => {
  const mutation: OfflineMutation = {
    id: 'feed-use-1',
    userId: 'user-1',
    companyId: 'company-1',
    createdAt: 1,
    kind: 'inventory',
    path: ['companies', 'company-1'],
    inventory: {
      collection: 'feeds',
      adjustments: [{
        itemId: 'feed-1',
        action: 'consume',
        quantity: 2,
        historyEntry: { id: 'feed-use-1:feed-1', unitPrice: 3 },
      }],
    },
  };
  const initial = [{
    id: 'feed-1',
    totalStock: 10,
    totalCost: 30,
    stockInHistory: [],
    usageHistory: [],
  }];

  const once = applyOfflineMutationToCollection(initial, mutation);
  const twice = applyOfflineMutationToCollection(once, mutation);

  assert.equal(once[0].totalStock, 8);
  assert.equal(once[0].totalCost, 24);
  assert.equal(once[0].usageHistory.length, 1);
  assert.deepEqual(twice, once);
});

test('every operational mobile data surface uses the durable offline layer', () => {
  const sources = [
    'app/store/feedAdditiveStore.ts',
    'app/store/assetStore.ts',
    'app/services/financeService.ts',
    'app/services/revenueService.ts',
    'app/hooks/useFirebaseSync.ts',
    'app/hooks/useEnterpriseBlocks.ts',
    'app/(tabs)/water-quality.tsx',
    'app/disease-report.tsx',
    'app/notifications.tsx',
  ].map((path) => readFileSync(path, 'utf8'));

  for (const source of sources) {
    assert.match(source, /offlineWorkspace/);
  }
});
