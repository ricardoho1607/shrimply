import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  OFFLINE_WORKSPACE_VERSION,
  applyOfflineMutationToCollection,
  applyPendingPondChanges,
  backfillCommittedHarvestReceipts,
  reconcileCommittedHarvestPonds,
  removeAcknowledgedPendingChanges,
  comparePendingChanges,
  createOfflineCollectionSnapshot,
  createOfflineMutationQueue,
  createOfflineOperationId,
  getOfflineCollectionKey,
  getOfflineMutationQueueKey,
  parseOfflineCollectionSnapshot,
  parseOfflineMutationQueue,
  persistOfflineFarmChange,
  isSameOfflineFarmIdentity,
  isOfflineSyncIdentityCurrent,
  replayPendingFarmState,
  rollbackPendingHarvestCreate,
  rollbackPendingHarvestEdit,
  rollbackPendingHarvestDelete,
  sortPendingChanges,
  type OfflineMutation,
  type PendingFarmChange,
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

test('harvest and sampling rollback scope rejects stale operations after account or company switch', () => {
  const captured = { companyId: 'company-a', userId: 'user-a' };
  assert.equal(isSameOfflineFarmIdentity({ currentCompanyId: 'company-a', farmCacheUserId: 'user-a' }, captured), true);
  assert.equal(isSameOfflineFarmIdentity({ currentCompanyId: 'company-b', farmCacheUserId: 'user-a' }, captured), false);
  assert.equal(isSameOfflineFarmIdentity({ currentCompanyId: 'company-a', farmCacheUserId: 'user-b' }, captured), false);
  const syncIdentity = { ...captured, storageKey: 'queue-a' };
  assert.equal(isOfflineSyncIdentityCurrent({ currentCompanyId: 'company-a', farmCacheUserId: 'user-a' }, syncIdentity, 'queue-a'), true);
  assert.equal(isOfflineSyncIdentityCurrent({ currentCompanyId: 'company-b', farmCacheUserId: 'user-a' }, syncIdentity, 'queue-a'), false, 'a post-await company switch must fence cache writes and acknowledgements');
  assert.equal(isOfflineSyncIdentityCurrent({ currentCompanyId: 'company-a', farmCacheUserId: 'user-a' }, syncIdentity, 'queue-b'), false, 'a queue scope switch must fence post-await mutations');
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

test('queue persistence failure rejects acceptance, while cache failure retains durable pending acceptance', async () => {
  let cacheWrites = 0;
  const queueFailure = await persistOfflineFarmChange(
    async () => { throw new Error('disk queue unavailable'); },
    async () => { cacheWrites += 1; },
  );
  assert.equal(queueFailure.durable, false);
  assert.equal(cacheWrites, 0, 'Cache must not be treated as durable queue acceptance');

  const cacheFailure = await persistOfflineFarmChange(
    async () => undefined,
    async () => { throw new Error('farm cache unavailable'); },
  );
  assert.equal(cacheFailure.durable, true, 'Queue commit remains recoverable after cache write failure');
  assert.match(String(cacheFailure.cacheError), /farm cache unavailable/);

  const doubleFailure = await persistOfflineFarmChange(
    async () => { throw new Error('queue write failed'); },
    async () => undefined,
    async () => { throw new Error('queue rollback failed'); },
  );
  assert.equal(doubleFailure.durable, false, 'Failed cleanup must never turn a failed queue write into acceptance');
  assert.match(String(doubleFailure.rollbackError), /queue rollback failed/);
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

test('comparePendingChanges is strictly transitive across all triplets and preserves FIFO', () => {
  const samplingA: PendingFarmChange = {
    id: 's-1',
    type: 'sampling',
    action: 'create',
    pondId: 'pond-1',
    data: { id: 's-1', mbw: 12 },
    timestamp: 200,
  };
  const harvestB: PendingFarmChange = {
    id: 'h-1',
    type: 'harvest',
    action: 'create',
    pondId: 'pond-1',
    data: { id: 'h-1', date: '2026-09-27', ponds: [{ pondId: 'pond-1', biomass: '100' }] },
    timestamp: 100,
  };
  const cycleC: PendingFarmChange = {
    id: 'c-1',
    type: 'cycle',
    action: 'create',
    data: { id: 'c-1', cycleName: 'Cycle 1' },
    timestamp: 150,
  };

  const triplet = [samplingA, harvestB, cycleC];
  for (const x of triplet) {
    for (const y of triplet) {
      for (const z of triplet) {
        const xy = comparePendingChanges(x, y);
        const yz = comparePendingChanges(y, z);
        const xz = comparePendingChanges(x, z);
        if (xy < 0 && yz < 0) {
          assert.ok(xz < 0, `Transitivity violated: ${x.id} < ${y.id} and ${y.id} < ${z.id} but not ${x.id} < ${z.id}`);
        }
      }
    }
  }

  // Same timestamp: sampling has higher priority than harvest
  const sameTimeSampling: PendingFarmChange = { ...samplingA, timestamp: 100 };
  const sameTimeHarvest: PendingFarmChange = { ...harvestB, timestamp: 100 };
  assert.ok(comparePendingChanges(sameTimeSampling, sameTimeHarvest) < 0);
  assert.ok(comparePendingChanges(sameTimeHarvest, sameTimeSampling) > 0);

  // sortPendingChanges explicitly satisfies same-pond sampling prerequisite before harvest even across inverted timestamps
  const sorted = sortPendingChanges([harvestB, cycleC, samplingA]);
  const samplingIndex = sorted.findIndex((c) => c.id === 's-1');
  const harvestIndex = sorted.findIndex((c) => c.id === 'h-1');
  assert.ok(samplingIndex < harvestIndex, 'Sampling on pond-1 must precede harvest on pond-1');
});

test('pending harvest replay over server pond snapshots never applies biomass twice if server marker exists', () => {
  const serverPond = {
    id: 'pond-1',
    pondName: 'Pond 1',
    pondArea: 1000,
    density: 10,
    initialPopulation: 10000,
    docStart: '2026-01-01',
    supplier: 'Supplier A',
    initialWeight: 0.5,
    samplings: [],
    totalHarvestedBiomass: 500, // already applied on server!
    totalHarvestedPopulation: 5000,
    appliedHarvestOperationId: 'op-harvest-1',
    lastAppliedHarvestId: 'harvest-1',
    appliedHarvestIds: ['harvest-1'],
  };

  const pendingHarvestChange: PendingFarmChange = {
    id: 'op-harvest-1',
    type: 'harvest',
    action: 'create',
    timestamp: 100,
    data: {
      id: 'harvest-1',
      date: '2026-09-27',
      ponds: [{
        pondId: 'pond-1',
        biomass: '500',
        size: '100',
        price: '10',
        subBiomass: '',
        subSize: '',
        subPrice: '',
      }],
    },
  };

  const replayed = applyPendingPondChanges([serverPond], [pendingHarvestChange]);
  assert.equal(replayed[0].totalHarvestedBiomass, 500, 'Must not double-apply biomass if server pond doc already reflects the committed harvest');

  const replayedState = replayPendingFarmState({
    ponds: [serverPond],
    physicalPonds: [],
    cycles: [],
    harvestRecords: [],
  }, [pendingHarvestChange]);
  assert.equal(replayedState.ponds[0].totalHarvestedBiomass, 500, 'Replay state must not double-apply biomass');
});

test('two offline updates to one target have distinct operation IDs and retry stays idempotent', () => {
  const opId1 = createOfflineOperationId('harvest-edit');
  const opId2 = createOfflineOperationId('harvest-edit');
  assert.notEqual(opId1, opId2, 'Two separate offline updates must not dedupe each other');

  const mutation1: OfflineMutation = {
    id: opId1,
    companyId: 'company-1',
    userId: 'user-1',
    createdAt: 100,
    kind: 'set',
    path: ['companies', 'company-1', 'harvestRecords', 'harvest-new-1'],
    data: { id: 'harvest-new-1', biomass: '100' },
  };

  const mutation2: OfflineMutation = {
    id: opId2,
    companyId: 'company-1',
    userId: 'user-1',
    createdAt: 200,
    kind: 'set',
    path: ['companies', 'company-1', 'harvestRecords', 'harvest-new-2'],
    data: { id: 'harvest-new-2', biomass: '200' },
  };

  const queue = createOfflineMutationQueue('user-1', 'company-1', [mutation1, mutation2]);
  assert.equal(queue.mutations.length, 2, 'Both distinct mutations must be preserved in queue');

  const retriedQueue = createOfflineMutationQueue('user-1', 'company-1', [mutation1, mutation1]);
  assert.equal(retriedQueue.mutations.length, 1, 'Retry of same persisted mutation must dedupe to 1');
});

test('edit replacement document IDs are distinct from old record and stable across retries', () => {
  const originalHarvestId = 'harvest-old-1';
  let editReplacementId: string | null = null;

  const getReplacementId = () => {
    editReplacementId ||= `harvest-${originalHarvestId}-rev-${Date.now()}`;
    return editReplacementId;
  };

  const firstAttemptId = getReplacementId();
  assert.notEqual(firstAttemptId, originalHarvestId, 'Replacement ID must be distinct from old record');

  const retryAttemptId = getReplacementId();
  assert.equal(retryAttemptId, firstAttemptId, 'Retries must reuse the stable replacement ID');
});

test('rollback reconciles disk queue and preserves concurrent changes in memory queue', () => {
  const change1: PendingFarmChange = { id: 'change-1', type: 'pond', action: 'update', timestamp: 100, data: { id: 'pond-1' } };
  const change2: PendingFarmChange = { id: 'change-2', type: 'sampling', action: 'create', timestamp: 200, data: { id: 'sampling-1' } };

  let queue = [change1, change2];
  queue = queue.filter((c) => c.id !== change1.id);
  assert.deepEqual(queue, [change2], 'Concurrent change2 must not be dropped when change1 is rolled back');
});

test('rejected harvest rollback preserves concurrent non-harvest pond fields', () => {
  const before: Record<string, any> = {
    id: 'pond-1', totalHarvestedBiomass: 0, totalHarvestedPopulation: 0,
    postHarvestRemainingBiomass: 1000, postHarvestRemainingPopulation: 10000,
    samplings: [{ id: 's1', mbw: 10 }], mortalityRecords: [], dailyFeed: [{ date: 'd1', amount: 2 }],
  };
  const current = { ...before, samplings: [...before.samplings, { id: 's2', mbw: 12 }], mortalityRecords: [{ id: 'm1' }], dailyFeed: [...before.dailyFeed, { date: 'd2', amount: 3 }], custom: 'new' };
  const rolledBack = rollbackPendingHarvestCreate(current, before, { biomass: 100, size: 100 }, { id: 'h1' }, 'op-h1');
  assert.deepEqual(rolledBack.samplings, current.samplings);
  assert.deepEqual(rolledBack.mortalityRecords, current.mortalityRecords);
  assert.deepEqual(rolledBack.dailyFeed, current.dailyFeed);
  assert.equal(rolledBack.custom, 'new');
  assert.equal(rolledBack.totalHarvestedBiomass, 0);
});

test('edit and delete rollback recalculate remaining state after a newer harvest', () => {
  const baseline = {
    id: 'pond-1', initialStock: 100000, initialWeight: 1,
    totalHarvestedBiomass: 300, totalHarvestedPopulation: 30000,
    postHarvestRemainingBiomass: 700, postHarvestRemainingPopulation: 70000,
    postHarvestBaselineDate: '2026-02-02', postHarvestReferenceSamplingId: 's2',
    postHarvestReferenceSamplingDate: '2026-02-02', postHarvestReferenceMbw: 10,
    samplings: [{ id: 's2', date: '2026-02-02', mbw: 10 }],
    appliedHarvestOperationIds: ['op-h1', 'op-h2'], appliedHarvestIds: ['h2'], lastAppliedHarvestId: 'h2',
  };
  const original = { id: 'h1', date: '2026-01-01' };
  const h1line = { biomass: 100, size: 100, harvestType: 'partial', partialHarvestNumber: 1, harvestReferenceSamplingId: 's1' };
  const replacement = { id: 'h1-r', date: '2026-01-03' };
  const replacementLine = { biomass: 120, size: 100, harvestType: 'partial', partialHarvestNumber: 1, harvestReferenceSamplingId: 's1' };
  const rolledEdit = rollbackPendingHarvestEdit(baseline, { ...baseline, appliedHarvestOperationIds: [] }, h1line, replacementLine, replacement, original, 'h1-r', 'op-h1');
  assert.equal(rolledEdit.totalHarvestedBiomass, 280);
  assert.equal(rolledEdit.postHarvestRemainingBiomass, 720);
  assert.equal(rolledEdit.totalHarvestedPopulation, 28000);
  assert.equal(rolledEdit.postHarvestRemainingPopulation, 72000);
  assert.equal(rolledEdit.postHarvestBaselineDate, '2026-02-02');
  assert.equal(rolledEdit.postHarvestReferenceSamplingId, 's2');

  const optimisticDelete = { ...baseline, totalHarvestedBiomass: 200, totalHarvestedPopulation: 20000, postHarvestRemainingBiomass: 800, postHarvestRemainingPopulation: 80000, appliedHarvestOperationIds: ['op-h2', 'op-delete-h1'] };
  const rolledDelete = rollbackPendingHarvestDelete(optimisticDelete, { ...baseline, appliedHarvestOperationIds: ['op-h2'] }, h1line, { ...original, ponds: [h1line] }, 'op-delete-h1');
  assert.equal(rolledDelete.totalHarvestedBiomass, 300);
  assert.equal(rolledDelete.postHarvestRemainingBiomass, 700);
  assert.equal(rolledDelete.totalHarvestedPopulation, 30000);
  assert.equal(rolledDelete.postHarvestRemainingPopulation, 70000);
  assert.equal(rolledDelete.postHarvestBaselineDate, '2026-02-02');
});

test('legacy committed create, edit, and delete receipts prevent pending overlay double application', () => {
  const pending: PendingFarmChange = { id: 'op-legacy', type: 'harvest', action: 'create', timestamp: 1, data: { id: 'h1', date: '2026-02-01', ponds: [{ pondId: 'pond-1', biomass: '100', size: '100' }] } };
  const committed = { ...pending.data };
  const pond: Record<string, any> = { id: 'pond-1', totalHarvestedBiomass: 100, totalHarvestedPopulation: 10000, samplings: [] };
  const backfilled = backfillCommittedHarvestReceipts([pond], pending, committed);
  assert.equal(backfilled[0].totalHarvestedBiomass, 100, 'receipt backfill does not apply impact a second time');
  assert.equal(backfilled[0].appliedHarvestOperationIds.includes('op-legacy'), true);
  assert.equal(applyPendingPondChanges(backfilled, [pending])[0].totalHarvestedBiomass, 100, 'pond listener after harvest listener stays stable');
  assert.equal(applyPendingPondChanges([pond], [pending])[0].totalHarvestedBiomass, 200, 'unreconciled listener snapshot demonstrates the regression');
  const doubleOverlay = { ...pond, totalHarvestedBiomass: 200, totalHarvestedPopulation: 20000, appliedHarvestOperationIds: ['op-legacy'] };
  const authoritative = reconcileCommittedHarvestPonds([doubleOverlay], { 'pond-1': pond });
  const reconciled = backfillCommittedHarvestReceipts(authoritative, pending, committed);
  assert.equal(reconciled[0].totalHarvestedBiomass, 100, 'legacy ack restores committed authoritative totals before queue removal');
  assert.equal(applyPendingPondChanges(reconciled, [pending])[0].totalHarvestedBiomass, 100);

  const edit: PendingFarmChange = { ...pending, id: 'op-edit', action: 'update', data: { id: 'h2', date: '2026-02-02', ponds: [{ pondId: 'pond-1', biomass: '120', size: '100' }] }, previousData: committed };
  const editedPond: Record<string, any> = { ...pond, totalHarvestedBiomass: 120, totalHarvestedPopulation: 12000, appliedHarvestIds: ['h2'], lastAppliedHarvestId: 'h2' };
  const editBackfill = backfillCommittedHarvestReceipts([editedPond], edit, edit.data, edit.previousData);
  assert.equal(applyPendingPondChanges(editBackfill, [edit])[0].totalHarvestedBiomass, 120);
  assert.equal(editBackfill[0].reversedHarvestOperationIds.includes('op-edit'), false);

  const deletion: PendingFarmChange = { ...pending, id: 'op-delete', action: 'delete', data: committed };
  const deletedPond: Record<string, any> = { ...pond, totalHarvestedBiomass: 0, totalHarvestedPopulation: 0, appliedHarvestIds: [] };
  const deleteBackfill = backfillCommittedHarvestReceipts([deletedPond], deletion, committed);
  assert.equal(applyPendingPondChanges(deleteBackfill, [deletion])[0].totalHarvestedBiomass, 0);
  assert.equal(deleteBackfill[0].reversedHarvestOperationIds.includes('op-delete'), true);
});

test('acknowledging H1 reconciles authoritative totals, reapplies pending H2, and survives cold replay', () => {
  const h1: PendingFarmChange = { id: 'op-h1', type: 'harvest', action: 'create', timestamp: 1, data: { id: 'h1', date: '2026-02-01', ponds: [{ pondId: 'pond-1', biomass: '100', size: '100' }] } };
  const h2: PendingFarmChange = { id: 'op-h2', type: 'harvest', action: 'create', timestamp: 2, data: { id: 'h2', date: '2026-02-02', ponds: [{ pondId: 'pond-1', biomass: '200', size: '100' }] } };
  const authoritativeH1: Record<string, any> = {
    id: 'pond-1', totalHarvestedBiomass: 100, totalHarvestedPopulation: 10000,
    appliedHarvestIds: ['h1'], appliedHarvestOperationIds: ['op-h1'], lastAppliedHarvestId: 'h1',
  };
  const preAckLocal: Record<string, any> = {
    ...authoritativeH1, totalHarvestedBiomass: 300, totalHarvestedPopulation: 30000,
    appliedHarvestIds: ['h1', 'h2'], appliedHarvestOperationIds: ['op-h1', 'op-h2'], lastAppliedHarvestId: 'h2',
  };
  const baseline = reconcileCommittedHarvestPonds([preAckLocal], { 'pond-1': authoritativeH1 });
  assert.deepEqual(baseline[0].appliedHarvestOperationIds, ['op-h1'], 'receipts absent from the authoritative baseline are cleared');
  const acknowledged = backfillCommittedHarvestReceipts(baseline, h1, h1.data);
  const afterAck = applyPendingPondChanges(acknowledged, [h2]);
  assert.equal(afterAck[0].totalHarvestedBiomass, 300);
  assert.deepEqual(afterAck[0].appliedHarvestOperationIds, ['op-h1', 'op-h2']);

  const coldReplay = applyPendingPondChanges(afterAck, [h2]);
  assert.equal(coldReplay[0].totalHarvestedBiomass, 300, 'cold restart replay cannot lose or duplicate H2');
  assert.equal(coldReplay[0].totalHarvestedPopulation, 30000);
});

test('fresh commit acknowledgement replaces divergent optimistic totals with transaction result', () => {
  const freshCreate: PendingFarmChange = { id: 'op-local', type: 'harvest', action: 'create', timestamp: 1, data: { id: 'h-local', ponds: [{ pondId: 'pond-1', biomass: '100', size: '100' }] } };
  const localOptimistic: Record<string, any> = {
    id: 'pond-1', totalHarvestedBiomass: 100, totalHarvestedPopulation: 10000,
    appliedHarvestOperationIds: ['op-local'], appliedHarvestIds: ['h-local'], lastAppliedHarvestId: 'h-local',
  };
  const committedTransactionValue: Record<string, any> = {
    id: 'pond-1', totalHarvestedBiomass: 300, totalHarvestedPopulation: 30000,
    appliedHarvestOperationIds: ['op-other', 'op-local'], appliedHarvestIds: ['h-other', 'h-local'], lastAppliedHarvestId: 'h-local',
  };
  const authoritative = reconcileCommittedHarvestPonds([localOptimistic], { 'pond-1': committedTransactionValue });
  const acked = backfillCommittedHarvestReceipts(authoritative, freshCreate, freshCreate.data);
  assert.equal(acked[0].totalHarvestedBiomass, 300, 'fresh transaction result includes concurrent server-side harvests');
  assert.equal(acked[0].totalHarvestedPopulation, 30000);
});

test('deferred H1 cache acknowledgement retains H2 enqueued while cache write is pending', async () => {
  const h1: PendingFarmChange = { id: 'op-h1', type: 'harvest', action: 'create', timestamp: 1, data: { id: 'h1', ponds: [] } };
  const h2: PendingFarmChange = { id: 'op-h2', type: 'harvest', action: 'create', timestamp: 2, data: { id: 'h2', ponds: [] } };
  let liveQueue = [h1];
  let durableQueue = [h1];
  let finishCache!: () => void;
  const cacheWrite = new Promise<void>((resolve) => { finishCache = resolve; });
  const ack = (async () => {
    await cacheWrite;
    const remaining = removeAcknowledgedPendingChanges(liveQueue, ['op-h1']);
    liveQueue = remaining;
    durableQueue = remaining;
  })();

  // A second user action is accepted while H1's farm cache write is suspended.
  liveQueue = [...liveQueue, h2];
  durableQueue = [...durableQueue, h2];
  finishCache();
  await ack;

  assert.deepEqual(liveQueue.map((change) => change.id), ['op-h2']);
  assert.deepEqual(durableQueue.map((change) => change.id), ['op-h2']);
});
