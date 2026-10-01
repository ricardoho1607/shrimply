const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const source = fs.readFileSync(__dirname + '/pondStore.ts', 'utf8');
const start = source.indexOf('      addMortalityRecord:');
const end = source.indexOf('      updateMortalityRecord:', start);
const expression = source.slice(start, end).trim().replace(/^addMortalityRecord:\s*/, '').replace(/,$/, '');
const compiled = ts.transpileModule(`const save = ${expression}; return save;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
function harness(sync = async () => ({ success: true, status: 'pending' })) {
  let state = { currentCompanyId: 'company', farmCacheUserId: 'owner', ponds: [{ id: 'c6', cycleStatus: 'active', mortalityRecords: [] }], firebaseSync: { syncMortality: sync } };
  const save = new Function('get', 'set', 'toFiniteNumber', 'isSameOfflineFarmIdentity', compiled)(
    () => state, update => { state = { ...state, ...update(state) }; }, Number,
    (current, scope) => current.currentCompanyId === scope.companyId && current.farmCacheUserId === scope.userId,
  );
  return { save, get state() { return state; } };
}
const record = { id: 'stable-mortality', date: '2026-10-01', observationType: 'observed', count: 10 };

test('mortality waits for durable storage acknowledgement before reporting success', async () => {
  let resolve; const h = harness(() => new Promise(done => { resolve = done; }));
  let completed = false; const pending = h.save('c6', record).then(result => { completed = true; return result; });
  await Promise.resolve(); assert.equal(completed, false);
  resolve({ success: true, status: 'pending' }); assert.equal((await pending).success, true);
});

test('mortality persistence rejection rolls back optimistic record and permits retry', async () => {
  const h = harness(async () => ({ success: false, error: 'storage full' }));
  assert.equal((await h.save('c6', record)).success, false);
  assert.equal(h.state.ponds[0].mortalityRecords.length, 0);
});

test('mortality retries never append the same record twice', async () => {
  const h = harness(); await h.save('c6', record); await h.save('c6', record);
  assert.equal(h.state.ponds[0].mortalityRecords.length, 1);
});

test('mortality without a sync provider refuses false success', async () => {
  const h = harness(undefined); h.state.firebaseSync = undefined;
  assert.equal((await h.save('c6', record)).success, false);
  assert.equal(h.state.ponds[0].mortalityRecords.length, 0);
});
