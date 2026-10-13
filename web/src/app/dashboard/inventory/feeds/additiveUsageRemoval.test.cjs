const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
require('../../../../../../scripts/register-typescript.cjs');
const { removeAdditiveUsage } = require('../../../../../../shared/additiveUsageRemoval.ts');
const { createSaveOperation } = require('../../../../../../shared/saveOperation.ts');
const source = ts.createSourceFile('useInventoryFeedsActions.ts', fs.readFileSync(path.join(__dirname, 'useInventoryFeedsActions.ts'), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function harness({ permission = true, confirm = true, fail = false } = {}) {
  let initializer;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'handleRemoveUsage') initializer = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(source); assert.ok(initializer);
  const saved = { totalStock: 10, totalCost: 300, usageHistory: [{ id: 'target', quantity: 2, totalCost: 20 }, { id: 'other', quantity: 2, totalCost: 80 }] };
  let data = saved; const writes = []; let error = ''; let calls = 0;
  const save = createSaveOperation();
  const env = {
    companyId: 'company', userUid: 'user', auth: { currentUser: { uid: 'user' } }, canEditInventory: permission, itemType: 'additive', save,
    window: { confirm: () => confirm }, formatQuantity: String, formatDate: String, setRemovingUsageId() {}, setUsageRemovalError: value => { error = value; },
    db: {}, doc: (_db, ...parts) => parts.join('/'), serverTimestamp: () => 'server-time', removeAdditiveUsage,
    runTransaction: async (_db, callback) => {
      calls++;
      if (fail) throw new Error('Write failed');
      const pending = [];
      await callback({ get: async ref => { assert.equal(ref, 'companies/company/additives/mineral'); return { exists: () => true, data: () => structuredClone(data) }; }, update: (ref, patch) => { pending.push({ ref, patch }); } });
      for (const write of pending) { writes.push(write); data = { ...data, ...write.patch }; }
    },
  };
  const js = ts.transpileModule(`return (${initializer.getText(source)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const run = new Function(...Object.keys(env), js)(...Object.values(env));
  return { run: () => run({ id: 'mineral', unit: 'kg' }, { id: 'target', quantity: 99, date: '2026-10-02' }), save, writes, get data() { return data; }, get error() { return error; }, get calls() { return calls; } };
}

test('web removal uses the exact company/item/usage and current transaction values, including retries', async () => {
  const h = harness();
  await h.run(); await h.run();
  assert.equal(h.writes.length, 1);
  assert.equal(h.data.totalStock, 12);
  assert.equal(h.data.totalCost, 320);
  assert.deepEqual(h.data.usageHistory.map(row => row.id), ['other']);
  assert.equal(h.error, '');
  assert.equal(h.save.busy, false);
});

test('web removal respects permission, cancellation, failure and the submit lock', async () => {
  for (const options of [{ permission: false }, { confirm: false }]) {
    const h = harness(options); await h.run(); assert.equal(h.calls, 0);
  }
  const locked = harness(); locked.save.acquire(); await locked.run(); assert.equal(locked.calls, 0);
  const failed = harness({ fail: true }); await failed.run();
  assert.equal(failed.writes.length, 0);
  assert.equal(failed.data.totalStock, 10);
  assert.equal(failed.error, 'Write failed');
  assert.equal(failed.save.busy, false);
});
