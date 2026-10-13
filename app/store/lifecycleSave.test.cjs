const assert = require('node:assert/strict');
const test = require('node:test');
const { loadModule } = require('../../scripts/test-module.cjs');
const physical = { id: 'physical', pondName: 'A1', pondArea: 100, status: 'idle' };
const pond = { id: 'pond', pondName: 'A1', physicalPondId: 'physical', pondArea: 100, docStart: '2026-10-01', density: 10, initialPopulation: 1000, samplings: [], cycleStatus: 'active' };
function fixture(sync) {
  const { usePondStore: store } = loadModule('app/store/pondStore.ts');
  const writes = [];
  store.setState({ currentCompanyId: 'farm', farmCacheUserId: 'user', physicalPonds: [physical], firebaseSync: {
    syncLifecycleChanges: async changes => { writes.push(changes); return sync ? sync(changes) : { success: true, status: 'pending' }; },
  } });
  return { store, writes };
}
test('pond start waits for durable acceptance and queues its cycle and physical link together', async () => {
  let resolve;
  const { store, writes } = fixture(() => new Promise(done => { resolve = done; }));
  const saving = store.getState().addPond(pond);
  assert.equal(store.getState().ponds.length, 0);
  assert.equal(store.getState().cycles.length, 0);
  assert.equal(writes.length, 1);
  assert.deepEqual(Array.from(writes[0], change => change.type), ['cycle', 'physicalPond', 'pond']);
  resolve({ success: true, status: 'pending' });
  assert.equal(await saving, true);
  assert.equal(store.getState().ponds.length, 1);
  assert.equal(store.getState().physicalPonds[0].activePondId, 'pond');
});
test('rejected pond start leaves no phantom pond, cycle or physical link', async () => {
  const { store } = fixture(() => ({ success: false, error: 'Disk full' }));
  await assert.rejects(store.getState().addPond(pond), /Disk full/);
  assert.equal(store.getState().ponds.length, 0);
  assert.equal(store.getState().cycles.length, 0);
  assert.equal(store.getState().physicalPonds[0], physical);
});
test('rejected rename and cycle close preserve all existing farm data', async () => {
  const { store, writes } = fixture(() => ({ success: false, error: 'Disk full' }));
  const cycle = { id: 'cycle', cycleName: 'Original', status: 'active' };
  store.setState({ cycles: [cycle], ponds: [{ ...pond, cycleId: 'cycle', cycleName: 'Original' }], physicalPonds: [{ ...physical, status: 'active', activePondId: 'pond' }] });
  const previous = store.getState();
  await assert.rejects(store.getState().updateFarmCycle('cycle', { cycleName: 'New' }), /Disk full/);
  await assert.rejects(store.getState().closeFarmCycle('cycle', '2026-10-13'), /Disk full/);
  for (const key of ['cycles', 'ponds', 'physicalPonds']) assert.equal(store.getState()[key], previous[key]);
  assert.equal(writes[0].length, 2);
  assert.equal(writes[1].length, 3);
});
test('account switch during durable acceptance does not insert old farm data', async () => {
  let resolve;
  const { store } = fixture(() => new Promise(done => { resolve = done; }));
  const saving = store.getState().addPond(pond);
  store.getState().switchAccount('other-farm', 'UTC', 'other-user');
  resolve({ success: true, status: 'pending' });
  await assert.rejects(saving, /previous account/);
  assert.equal(store.getState().ponds.length, 0);
  assert.equal(store.getState().physicalPonds.length, 0);
});
test('missing provider rejects saves and cloud-confirmed local insert still works', async () => {
  const { store } = fixture();
  store.setState({ firebaseSync: undefined, physicalPonds: [] });
  await assert.rejects(store.getState().addFarmCycle(), /not ready/);
  await store.getState().addPhysicalPond(physical, { sync: false });
  assert.equal(store.getState().physicalPonds.length, 1);
});

test('overlapping starts for the same physical pond cannot both enter the queue', async () => {
  let resolve;
  const { store, writes } = fixture(() => new Promise(done => { resolve = done; }));
  const first = store.getState().addPond(pond);
  await assert.rejects(store.getState().addPond({ ...pond, id: 'second' }), /still saving/);
  assert.equal(writes.length, 1);
  resolve({ success: true, status: 'pending' });
  await first;
  assert.equal(store.getState().ponds.length, 1);
});

test('a newly named cycle and its first pond are accepted or rejected together', async () => {
  const { store, writes } = fixture(() => ({ success: false, error: 'Disk full' }));
  const cycle = { id: 'named', cycleName: 'Summer', status: 'active' };
  await assert.rejects(store.getState().addPond({ ...pond, cycleId: cycle.id, cycleName: cycle.cycleName }, { cycle }), /Disk full/);
  assert.equal(writes[0][0].data, cycle);
  assert.equal(store.getState().cycles.length, 0);
});
