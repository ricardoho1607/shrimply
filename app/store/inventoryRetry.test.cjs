const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
require('../../scripts/register-typescript.cjs');
const { applyOfflineMutationToCollection } = require('../../shared/offlineWorkspace.ts');
const { removeAdditiveUsage } = require('../../shared/additiveUsageRemoval.ts');
const { resolveInventoryUsageDate } = require('../../shared/inventoryUsageDate.ts');
const { getFarmDateKey } = require('../../shared/farmDate.ts');
const source = ts.createSourceFile('feedAdditiveStore.ts', fs.readFileSync(__dirname + '/feedAdditiveStore.ts', 'utf8'), ts.ScriptTarget.Latest, true);
function load(name, env, fileSource = source) {
  let initializer;
  function visit(node) {
    if ((ts.isVariableDeclaration(node) || ts.isPropertyAssignment(node)) && node.name.getText(fileSource) === name) initializer = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(fileSource); assert.ok(initializer);
  const compiled = ts.transpileModule(`return (${initializer.getText(fileSource)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(env), compiled)(...Object.values(env));
}
function harness({ failCache = false } = {}) {
  let state = { currentCompanyId: 'company', currentTimeZone: 'Asia/Jakarta', feeds: [{ id: 'item', totalStock: 100, totalCost: 1000, stockInHistory: [], usageHistory: [] }], additives: [{ id: 'item', totalStock: 100, totalCost: 1000, stockInHistory: [], usageHistory: [] }] };
  const admitted = new Map(); let failed = false;
  const env = {
    auth: { currentUser: { uid: 'owner' } }, get: () => state, set: changes => { state = { ...state, ...changes }; },
    removeAdditiveUsage, resolveInventoryUsageDate,
    applyOfflineMutationToCollection, createOfflineOperationId: () => { throw new Error('retry must use supplied operation ID'); },
    saveDurableMutation: async mutation => { admitted.set(mutation.id, mutation); },
    persistOfflineCollection: async () => { if (failCache && !failed) { failed = true; throw new Error('cache acknowledgement failed'); } },
    requestOfflineMutationFlush() {}, persistInventoryCache: async () => {},
    Timestamp: { now: () => ({ seconds: 100, nanoseconds: 0 }) }, isoDate: () => '2026-10-01',
    usePondStore: { getState: () => ({ ponds: [] }) }, NotificationService: { createLowStockNotification: async () => {} },
  };
  env.queueInventoryAdjustments = load('queueInventoryAdjustments', env);
  return { env, admitted, get state() { return state; } };
}

test('mobile additive removal queues the selected usage ID and retry cannot restore stock twice', async () => {
  const h = harness();
  const use = load('useAdditive', h.env);
  await use('item', 10, null, '', 'first');
  await use('item', 5, null, '', 'second');
  const remove = load('removeAdditiveUsage', h.env);
  await remove('item', 'first:item');
  await remove('item', 'first:item');
  await use('item', 10, null, '', 'first');
  assert.equal(h.state.additives[0].totalStock, 95);
  assert.equal(h.state.additives[0].totalCost, 950);
  assert.deepEqual(h.state.additives[0].usageHistory.map(row => row.id), ['second:item']);
  assert.equal(h.admitted.size, 3);
  assert.equal(h.admitted.get('additive-remove-usage:item:first:item').inventory.adjustments[0].historyEntry.id, 'first:item');
});

test('mobile removal accepts numeric legacy quantity and preserves concurrent inventory edits', async () => {
  const h = harness();
  h.env.set({ additives: [{ id: 'item', totalStock: 90, totalCost: 900, usageHistory: [{ id: 'use', quantity: '10', totalCost: 100 }] }] });
  h.env.persistOfflineCollection = async () => {
    h.env.set({ additives: [...h.state.additives, { id: 'new', totalStock: 3, totalCost: 30, usageHistory: [] }] });
  };
  h.env.queueInventoryAdjustments = load('queueInventoryAdjustments', h.env);
  const remove = load('removeAdditiveUsage', h.env);
  await remove('item', 'use');
  assert.equal(h.state.additives[0].totalStock, 100);
  assert.equal(h.state.additives[1].id, 'new');
  assert.equal(h.admitted.get('additive-remove-usage:item:use').inventory.adjustments[0].quantity, 10);
});

test('mobile removal cannot overwrite the next company after a switch during queue persistence', async () => {
  const h = harness();
  h.env.set({ additives: [{ id: 'item', totalStock: 90, totalCost: 900, usageHistory: [{ id: 'use', quantity: 10, totalCost: 100 }] }] });
  h.env.persistOfflineCollection = async () => h.env.set({ currentCompanyId: 'next', additives: [{ id: 'next-item' }] });
  h.env.queueInventoryAdjustments = load('queueInventoryAdjustments', h.env);
  await load('removeAdditiveUsage', h.env)('item', 'use');
  assert.deepEqual(h.state.additives, [{ id: 'next-item' }]);
});
for (const kind of ['Feed', 'Additive']) {
  test(`mobile ${kind}: cache failure retry retains one stock operation and replay applies once`, async () => {
    const h = harness({ failCache: true }); const stock = load(`stockIn${kind}`, h.env);
    await assert.rejects(stock('item', 10, 10, '', { operationId: 'draft' }), /cache acknowledgement/);
    await stock('item', 10, 10, '', { operationId: 'draft' });
    assert.equal(h.admitted.size, 1);
    const mutation = h.admitted.get('draft');
    const initial = [{ id: 'item', totalStock: 100, totalCost: 1000, stockInHistory: [], usageHistory: [] }];
    const once = applyOfflineMutationToCollection(initial, mutation);
    const twice = applyOfflineMutationToCollection(once, mutation);
    assert.equal(twice[0].totalStock, 110); assert.equal(twice[0].stockInHistory.length, 1);
  });
  test(`mobile ${kind}: a usage retry succeeds after original operation emptied stock`, async () => {
    const h = harness(); const use = load(`use${kind}`, h.env);
    await use('item', 100, null, '', 'draft');
    await use('item', 100, null, '', 'draft');
    const collection = kind === 'Feed' ? h.state.feeds : h.state.additives;
    assert.equal(h.admitted.size, 1); assert.equal(collection[0].totalStock, 0); assert.equal(collection[0].usageHistory.length, 1);
  });
}

for (const kind of ['Feed', 'Additive']) {
  test(`mobile ${kind}: backdated pond usage survives cache failure and offline replay exactly once`, async () => {
    const h = harness({ failCache: true });
    h.env.usePondStore = { getState: () => ({ ponds: [{ id: 'pond', cycleId: 'cycle', cycleName: 'Cycle 1', pondCycleId: 'pond-cycle' }] }) };
    const use = load(`use${kind}`, h.env);
    await assert.rejects(use('item', 10, 'pond', 'Missed entry', 'backdate', '2026-10-02'), /cache acknowledgement/);
    await use('item', 10, 'pond', 'Missed entry', 'backdate', '2026-10-02');
    assert.equal(h.admitted.size, 1);
    const mutation = h.admitted.get('backdate');
    const usage = mutation.inventory.adjustments[0].historyEntry;
    assert.equal(usage.date, '2026-10-02');
    assert.equal(usage.pondId, 'pond');
    assert.equal(usage.cycleId, 'cycle');
    assert.equal(usage.pondCycleId, 'pond-cycle');
    assert.equal(usage.cycleName, 'Cycle 1');
    assert.equal(usage.notes, 'Missed entry');
    assert.equal(usage.createdAt.seconds, 100, 'creation time stays independent of usage day');
    const initial = [{ id: 'item', totalStock: 100, totalCost: 1000, usageHistory: [] }];
    const twice = applyOfflineMutationToCollection(applyOfflineMutationToCollection(initial, mutation), mutation);
    assert.equal(twice[0].totalStock, 90);
    assert.equal(twice[0].totalCost, 900);
    assert.equal(twice[0].usageHistory.length, 1);
    assert.equal(twice[0].usageHistory[0].date, '2026-10-02');
  });
  test(`mobile ${kind}: offline upload saves the chosen day to remote pond usage history`, async () => {
    const h = harness();
    h.env.usePondStore = { getState: () => ({ ponds: [{ id: 'pond', cycleId: 'cycle', pondCycleId: 'pond-cycle' }] }) };
    await load(`use${kind}`, h.env)('item', 10, 'pond', '', 'upload', '2026-10-02');
    const mutation = JSON.parse(JSON.stringify(h.admitted.get('upload')));
    const remoteSource = ts.createSourceFile('offlineWorkspace.ts', fs.readFileSync(__dirname + '/../services/offlineWorkspace.ts', 'utf8'), ts.ScriptTarget.Latest, true);
    let remote = { totalStock: 100, totalCost: 1000, usageHistory: [] };
    let writes = 0;
    const env = {
      db: {}, doc: (_db, ...parts) => parts.join('/'),
      Timestamp: class Timestamp { constructor(seconds, nanoseconds) { Object.assign(this, { seconds, nanoseconds }); } },
      serverTimestamp: () => 'server-now',
      runTransaction: async (_db, work) => work({
        get: async ref => {
          assert.equal(ref, `companies/company/${kind === 'Feed' ? 'feeds' : 'additives'}/item`);
          return { exists: () => true, data: () => structuredClone(remote) };
        },
        update: (_ref, patch) => { writes++; remote = { ...remote, ...patch }; },
      }),
    };
    const upload = load('applyRemoteMutation', env, remoteSource);
    await upload(mutation);
    await upload(mutation);
    assert.equal(writes, 1);
    assert.equal(remote.totalStock, 90);
    assert.equal(remote.totalCost, 900);
    assert.equal(remote.usageHistory.length, 1);
    assert.equal(remote.usageHistory[0].date, '2026-10-02');
    assert.equal(remote.usageHistory[0].pondId, 'pond');
    assert.equal(remote.usageHistory[0].cycleId, 'cycle');
    assert.ok(remote.usageHistory[0].createdAt instanceof env.Timestamp);
  });
  test(`mobile ${kind}: invalid usage dates never enter the offline queue; older callers default to farm today`, async () => {
    const h = harness();
    const use = load(`use${kind}`, h.env);
    for (const date of ['', '2026-02-30', '2999-01-01']) {
      await assert.rejects(use('item', 10, null, '', 'invalid', date), /usage date/i);
    }
    assert.equal(h.admitted.size, 0);
    await use('item', 10, null, '', 'today');
    assert.equal(h.admitted.get('today').inventory.adjustments[0].historyEntry.date, getFarmDateKey(new Date(), 'Asia/Jakarta'));
  });
}
