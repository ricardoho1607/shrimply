const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function loader(mocks = {}) {
  const cache = new Map();
  return function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    new Function('module', 'exports', 'require', compiled)(module, module.exports, name => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      return name.startsWith('.') ? load(path.resolve(path.dirname(file), name.endsWith('.ts') ? name : `${name}.ts`)) : require(name);
    });
    return module.exports;
  };
}

test('physical identity resolution handles restarts without guessing ambiguous ponds', () => {
  const { resolvePhysicalPond } = loader()(path.join(__dirname, 'physicalPondIdentity.ts'));
  const physical = { id: 'physical', pondName: 'A1' };
  assert.equal(resolvePhysicalPond({ id: 'old-cycle', pondName: 'A1', physicalPondId: 'older-cycle' }, [physical]), physical);
  assert.equal(resolvePhysicalPond({ id: 'old-cycle', pondName: 'A1' }, [physical, { ...physical, id: 'duplicate' }]), undefined);
  assert.equal(resolvePhysicalPond({ id: 'old-cycle', pondName: 'A1', blockId: 'other' }, [physical]), undefined);
  assert.equal(resolvePhysicalPond({ id: 'new', pondName: 'A1' }, []), undefined);
});

test('mobile starts and restarts persist canonical identity and refuse unregistered ponds', () => {
  const { usePondStore } = loader()(path.resolve(__dirname, '../app/store/pondStore.ts'));
  const writes = [];
  const physical = { id: 'physical', pondName: 'A1', pondArea: 100, status: 'idle' };
  usePondStore.setState({ ponds: [], physicalPonds: [physical], cycles: [{ id: 'farm-cycle', cycleName: 'Farm cycle', status: 'active' }], firebaseSync: {
    syncPond: (action, pond) => writes.push({ type: 'cycle', action, pond }),
    syncPhysicalPond: (action, pond) => writes.push({ type: 'physical', action, pond }),
  } });
  const cycle = { id: 'new-cycle', pondName: 'A1', pondArea: 100, previousCyclePondId: 'old-cycle', physicalPondId: 'old-cycle', docStart: '2026-09-09', density: 10, initialPopulation: 1000, samplings: [] };
  assert.equal(usePondStore.getState().addPond(cycle), true);
  assert.equal(usePondStore.getState().ponds[0].physicalPondId, 'physical');
  assert.equal(writes[0].pond.activePondId, 'new-cycle');
  assert.equal(writes[1].pond.physicalPondId, 'physical');
  assert.equal(usePondStore.getState().addPond({ ...cycle, id: 'extra', pondName: 'Unregistered' }), false);
  assert.equal(writes.length, 2);
});

test('web new cycles and restarts link and activate the same counted physical pond', async () => {
  for (const pondType of ['physical', 'cycle']) {
    const writes = [];
    const physical = { pondName: 'A1', pondArea: 100 };
    const sdk = {
      collection: (_db, ...parts) => parts.join('/'),
      doc: (dbOrCollection, ...parts) => ({ path: parts.length ? parts.join('/') : `${dbOrCollection}/new-id`, id: parts.at(-1) || 'new-id' }),
      getDoc: async ref => ({ exists: () => ref.id === 'physical', id: ref.id, data: () => physical }),
      getDocs: async () => ({ docs: [{ id: 'physical', data: () => physical }] }),
      query: value => value, where: () => null, serverTimestamp: () => 'server-time',
      runTransaction: async (_db, work) => work({
        get: async ref => ({ exists: () => ref.id === 'physical' || ref.id === 'farm-cycle', data: () => ref.id === 'physical' ? physical : { status: 'active' } }),
        set: (ref, data) => writes.push({ ref, data }), update: (ref, data) => writes.push({ ref, data }),
      }),
    };
    const { startPondCycle } = loader({ 'firebase/firestore': sdk, '@/lib/firebase': { db: {} } })(path.resolve(__dirname, '../web/src/lib/startPondCycle.ts'));
    const options = { companyId: 'company', userId: 'owner', pondType, pond: { ...physical, id: pondType === 'physical' ? 'physical' : 'old-cycle', physicalPondId: pondType === 'physical' ? undefined : 'physical' },
      activeCycle: { id: 'farm-cycle', cycleName: 'Farm' }, today: '2026-09-09', activePonds: [],
      form: { density: '10', docStart: '2026-09-01', plValue: '10', plSupplier: 'Supplier', cycleStartMode: 'midcycle', baselineMbw: '2', baselineEstimatedPopulation: '', baselineSurvivalRate: '', baselineCumulativeFeed: '' } };
    await startPondCycle(options);
    const cycle = writes.find(write => write.ref.path.includes('/ponds/')).data;
    assert.equal(cycle.physicalPondId, 'physical');
    assert.equal(cycle.samplings[0].physicalPondId, 'physical');
    assert.equal(writes.find(write => write.ref.path.includes('/physicalPonds/')).data.activePondId, cycle.pondCycleId);
  }
});
