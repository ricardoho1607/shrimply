const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
require('../../scripts/register-typescript.cjs');
const { applyOfflineMutationToCollection } = require('../../shared/offlineWorkspace.ts');
const { removeAdditiveUsage } = require('../../shared/additiveUsageRemoval.ts');
const source = ts.createSourceFile('feedAdditiveStore.ts', fs.readFileSync(__dirname + '/feedAdditiveStore.ts', 'utf8'), ts.ScriptTarget.Latest, true);
function load(name, env) {
  let initializer;
  function visit(node) {
    if ((ts.isVariableDeclaration(node) || ts.isPropertyAssignment(node)) && node.name.getText(source) === name) initializer = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(source); assert.ok(initializer);
  const compiled = ts.transpileModule(`return (${initializer.getText(source)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(env), compiled)(...Object.values(env));
}
function harness({ failCache = false } = {}) {
  let state = { currentCompanyId: 'company', currentTimeZone: 'Asia/Jakarta', feeds: [{ id: 'item', totalStock: 100, totalCost: 1000, stockInHistory: [], usageHistory: [] }], additives: [{ id: 'item', totalStock: 100, totalCost: 1000, stockInHistory: [], usageHistory: [] }] };
  const admitted = new Map(); let failed = false;
  const env = {
    auth: { currentUser: { uid: 'owner' } }, get: () => state, set: changes => { state = { ...state, ...changes }; },
    removeAdditiveUsage,
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
