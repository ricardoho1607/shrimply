const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
require('../../scripts/register-typescript.cjs');
const { applyOfflineMutationToCollection } = require('../../shared/offlineWorkspace.ts');
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
