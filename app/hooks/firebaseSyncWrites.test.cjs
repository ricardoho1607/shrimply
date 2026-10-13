const assert = require('node:assert/strict');
const test = require('node:test');
const { loadModule } = require('../../scripts/test-module.cjs');
const folder = 'app/services/firebaseSync/';
const plain = value => JSON.parse(JSON.stringify(value));

function fixture() {
  const records = new Map(), commits = [];
  let loseAck = false, rejectWrite = false;
  const reference = path => ({ path, id: path.split('/').at(-1) });
  const snapshot = ref => ({ id: ref.id, ref, exists: () => records.has(ref.path), data: () => structuredClone(records.get(ref.path)) });
  function apply(writes) {
    for (const { type, ref, data, options } of writes) {
      if (type === 'delete') records.delete(ref.path);
      else records.set(ref.path, plain(type === 'update' || options?.merge ? { ...records.get(ref.path), ...data } : data));
    }
    commits.push(writes);
  }
  const firestore = {
    doc: (db, ...parts) => reference(parts.length ? parts.join('/') : db.path + '/generated'),
    collection: (_db, ...parts) => reference(parts.join('/')),
    serverTimestamp: () => 'server-time',
    async runTransaction(_db, callback) {
      const writes = [];
      await callback({
        async get(ref) { assert.equal(writes.length, 0, 'Firestore requires transaction reads before writes'); return snapshot(ref); },
        set(ref, data, options) { writes.push({ type: 'set', ref, data, options }); },
        update(ref, data) { writes.push({ type: 'update', ref, data }); },
      });
      if (rejectWrite) throw new Error('Permission denied');
      apply(writes);
      if (loseAck) { loseAck = false; throw new Error('Lost acknowledgement'); }
    },
    writeBatch() {
      const writes = [];
      return { set(ref, data, options) { writes.push({ type: 'set', ref, data, options }); }, update(ref, data) { writes.push({ type: 'update', ref, data }); }, delete(ref) { writes.push({ type: 'delete', ref }); }, async commit() { if (rejectWrite) throw new Error('Permission denied'); apply(writes); } };
    },
  };
  const overrides = {
    '@/config/firebase': { default: {}, db: {} },
    'firebase/firestore': firestore,
    'firebase/functions': { getFunctions: () => ({}), httpsCallable: () => async () => {} },
    '../../store/pondStore': { usePondStore: { getState: () => ({ physicalPonds: [] }) } },
  };
  const globals = { Error, console: { error() {} } };
  overrides['./commitHarvestChange'] = loadModule(folder + 'commitHarvestChange.ts', overrides, globals);
  const { commitFarmChanges } = loadModule(folder + 'commitFarmChanges.ts', overrides, globals);
  const context = { activeCompanyId: 'farm', user: { uid: 'user', name: 'QA' }, company: { timeZone: 'Asia/Jakarta' } };
  const key = collection => `companies/farm/${collection}`;
  records.set(key('ponds/pond'), {
    id: 'pond', initialStock: 100000, initialWeight: 0.5, docStart: '2026-08-01',
    samplings: [{ id: 'sampling', date: '2026-10-13', mbw: 20, feed: 12, feedData: { dailyTotal: 50 } }],
    mortalityRecords: [], totalHarvestedBiomass: 0, totalHarvestedPopulation: 0,
  });
  records.set(key('feeds/feed'), { totalStock: 100 });
  return { records, commits, key, run: change => commitFarmChanges(context, [change]), loseAck: () => { loseAck = true; }, reject: () => { rejectWrite = true; } };
}
const sampling = { id: 'op-sampling', type: 'sampling', action: 'update', pondId: 'pond', samplingId: 'sampling', timestamp: 1, data: { id: 'sampling', date: '2026-10-13', mbw: 21, feed: 15, feedData: { dailyTotal: 1 } } };
const harvest = { id: 'op-harvest', type: 'harvest', action: 'create', timestamp: 1, data: { id: 'harvest', date: '2026-10-13', ponds: [{ pondId: 'pond', harvestType: 'partial', biomass: '100', size: '50', price: '50000' }] } };

test('sampling retries preserve current feeding allocations and never write inventory', async () => {
  const f = fixture(); f.loseAck();
  await assert.rejects(f.run(sampling), /Lost acknowledgement/);
  await f.run(sampling);
  const rows = f.records.get(f.key('ponds/pond')).samplings;
  assert.equal(rows.length, 1); assert.equal(rows[0].mbw, 21); assert.equal(rows[0].feed, 15);
  assert.deepEqual(rows[0].feedData, { dailyTotal: 50 });
  assert.equal(f.records.get(f.key('feeds/feed')).totalStock, 100);
  assert.ok(f.commits.flat().every(write => write.ref.path === f.key('ponds/pond')));
});

test('mortality retries replace the same record instead of counting it twice', async () => {
  const f = fixture();
  const change = { id: 'op-mortality', type: 'mortality', action: 'create', pondId: 'pond', recordId: 'mortality', timestamp: 1, data: { id: 'mortality', date: '2026-10-13', count: 7 } };
  f.loseAck(); await assert.rejects(f.run(change)); await f.run(change);
  assert.deepEqual(f.records.get(f.key('ponds/pond')).mortalityRecords, [change.data]);
});

test('harvest retry after a lost acknowledgement cannot duplicate population removal or revenue', async () => {
  const f = fixture(); f.loseAck();
  await assert.rejects(f.run(harvest), /Lost acknowledgement/);
  const first = structuredClone(f.records.get(f.key('ponds/pond')));
  assert.equal(first.totalHarvestedPopulation, 5000);
  const result = await f.run(harvest);
  assert.deepEqual(plain(result.processedIds), ['op-harvest']);
  const second = f.records.get(f.key('ponds/pond'));
  assert.equal(second.totalHarvestedPopulation, first.totalHarvestedPopulation);
  assert.equal(second.totalHarvestedBiomass, first.totalHarvestedBiomass);
  const revenues = [...f.records.entries()].filter(([key]) => key.includes('/revenues/'));
  assert.equal(revenues.length, 1); assert.equal(revenues[0][1].amount, 5000000);
});

test('failed harvest transactions leave pond, harvest, and finance records unchanged', async () => {
  const f = fixture(); const before = structuredClone([...f.records]); f.reject();
  await assert.rejects(f.run(harvest), /Permission denied/);
  assert.deepEqual([...f.records], before);
  assert.equal(f.commits.length, 0);
});

test('harvest edits and deletions retain their receipts across retries', async () => {
  const f = fixture(); await f.run(harvest);
  const edit = { ...harvest, id: 'op-edit', action: 'update', previousData: f.records.get(f.key('harvestRecords/harvest')), data: { ...harvest.data, id: 'replacement', ponds: [{ ...harvest.data.ponds[0], biomass: '120' }] } };
  f.loseAck(); await assert.rejects(f.run(edit)); await f.run(edit);
  assert.equal(f.records.get(f.key('ponds/pond')).totalHarvestedPopulation, 6000);
  assert.equal(f.records.get(f.key('harvestRecords/harvest')).voided, true);
  const deletion = { ...edit, id: 'op-delete', action: 'delete', data: f.records.get(f.key('harvestRecords/replacement')) };
  f.loseAck(); await assert.rejects(f.run(deletion)); await f.run(deletion);
  assert.equal(f.records.get(f.key('ponds/pond')).totalHarvestedPopulation, 0);
  assert.equal(f.records.get(f.key('harvestRecords/replacement')).voided, true);
  const revenues = [...f.records.entries()].filter(([key]) => key.includes('/revenues/'));
  assert.equal(revenues.length, 2); assert.ok(revenues.every(([, entry]) => entry.voided));
});
