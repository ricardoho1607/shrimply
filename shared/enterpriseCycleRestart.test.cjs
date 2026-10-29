const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const test = require('node:test');
const { loadCallback } = require('../scripts/test-module.cjs');
const domain = require('./enterpriseCycles.ts');
const setup = require('./enterpriseCycleSetup.ts');
const dates = require('./farmDate.ts');

const oldCycle = { id: 'old', cycleName: 'Siklus 15', status: 'active', blockIds: ['C'] };
const block = { id: 'C', name: 'Block C' };
const physicalPonds = Array.from({ length: 8 }, (_, i) => ({
  id: `c${i + 1}`, pondName: `C${i + 1}`, pondArea: 1000, blockId: 'C',
  status: i < 4 ? 'active' : 'idle', activePondId: i < 4 ? `run-c${i + 1}` : null,
}));
const ponds = physicalPonds.map((pond, i) => ({
  id: `run-${pond.id}`, pondName: pond.pondName, physicalPondId: pond.id,
  cycleId: 'old', blockId: 'C', cycleStatus: i < 4 ? 'active' : 'ended',
}));

// Execute the real event handlers with local data; no browser or live writes.
function callback(file, name, bindings) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let fn;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) {
      fn = ts.isCallExpression(node.initializer) ? node.initializer.arguments[0] : node.initializer;
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(fn, name);
  const js = ts.transpileModule(`(${fn.getText(source)})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return vm.runInNewContext(js, { console: { ...console, error() {} }, Date, Map, Set, ...bindings });
}

for (const file of ['app/components/enterprise/EnterpriseCycleDashboard.tsx', 'web/src/components/EnterpriseCycleDashboard.tsx']) {
  test(`${file}: inactive C5-C8 opens a new cycle instead of continuing Siklus 15`, () => {
    const values = {};
    const bindings = { ...domain, ...setup, ...dates, physicalPonds, ponds, sortedBlocks: [block], openCycles: [oldCycle], cycles: [oldCycle], timeZone: 'UTC', canStartCycles: true,
      activePhysicalPondIds: new Set(physicalPonds.slice(0, 4).map((pond) => pond.id)), activePondNames: new Set(['c1', 'c2', 'c3', 'c4']),
      copy: { defaultCycleName: 'Cycle {{number}}' }, openCycleForm() { assert.fail('Expected a block'); },
    };
    for (const name of ['EditingCycle', 'StockingCycle', 'CycleFormOpen', 'CycleName', 'PlannedStartDate', 'CycleStartMode', 'SelectedBlockIds', 'PondSetupValues', 'ExpandedSetupPondId', 'CycleFormStep']) {
      bindings[`set${name}`] = (value) => { values[name] = value; };
    }
    bindings.openCycleByBlockId = callback(file, 'openCycleByBlockId', bindings)();
    assert.equal(bindings.openCycleByBlockId.has('C'), false);
    callback(file, 'openCycleFormForBlock', bindings)('C');
    assert.equal(values.StockingCycle, null);
    assert.equal(values.CycleFormStep, 'details');
    assert.deepEqual(Object.keys(values.PondSetupValues), ['c5', 'c6', 'c7', 'c8']);
    assert.notEqual(values.CycleName, oldCycle.cycleName);

    const continuing = { ...oldCycle, id: 'planned', status: 'stocking', plannedPondIds: ['c5', 'c6', 'c7', 'c8'] };
    bindings.openCycles = [oldCycle, continuing];
    bindings.openCycleByBlockId = callback(file, 'openCycleByBlockId', bindings)();
    callback(file, 'openCycleFormForBlock', bindings)('C');
    assert.equal(values.StockingCycle.id, continuing.id);
    assert.equal(values.CycleFormStep, 'ponds');
    assert.deepEqual(Object.keys(values.PondSetupValues), continuing.plannedPondIds);

    bindings.editingCycle = continuing;
    assert.equal(callback(file, 'cycleBlockOptions', bindings)()[0].id, 'C', 'Current block remains editable while another cycle is active');
    assert.equal(callback(file, 'lockedEditingBlockIds', bindings)().has('C'), true, 'Subgroup membership cannot move to another block');
  });
}

test('mobile persists a four-pond plan and leaves the old cycle untouched', async () => {
  const writes = [];
  const state = { cycles: [oldCycle], physicalPonds, ponds };
  const save = loadCallback('features/pond-management/usePondManagementEnterpriseActions.ts', 'handleSaveEnterpriseProductionCycle', {
    ...domain, ...setup, ...dates, company: { id: 'farm', timeZone: 'UTC' }, usePondStore: { getState: () => state },
    assertSopStageGate: async () => {},
    addFarmCycle: async (data) => { writes.push({ type: 'cycle', data }); return { id: 'new', ...data }; },
    updateFarmCycle: async () => assert.fail('Must not update old cycle'),
    addPond: async (data) => { writes.push({ type: 'pond', data }); return true; },
  });
  const input = { cycleName: 'Siklus 16', block, plannedStartDate: '2026-10-01', cycleStartMode: 'new',
    ponds: physicalPonds.slice(4).map((pond) => ({ pond, stockingDate: '2026-10-01', density: 100, supplier: 'Supplier' })),
  };
  await save(input);
  assert.deepEqual(Array.from(writes[0].data.plannedPondIds), ['c5', 'c6', 'c7', 'c8']);
  assert.equal(writes.filter((write) => write.type === 'pond' && write.data.cycleId === 'new').length, 4);
  assert.equal(oldCycle.cycleName, 'Siklus 15');
  writes.length = 0;
  await assert.rejects(save({ ...input, ponds: [{ ...input.ponds[0], pond: physicalPonds[0] }] }), /no longer available/);
  assert.equal(writes.length, 0);
});

test('web creates a separate four-pond cycle atomically and rejects a competing start', async () => {
  const documents = new Map(physicalPonds.map((pond) => [`companies/farm/physicalPonds/${pond.id}`, { ...pond }]));
  documents.set('companies/farm/cycles/old', { ...oldCycle });
  const writes = [], alerts = [];
  let counter = 0;
  const collection = (_db, ...parts) => ({ path: parts.join('/') });
  const doc = (parent, ...parts) => {
    const path = parts.length ? parts.join('/') : `${parent.path}/new-${++counter}`;
    return { path, id: path.split('/').at(-1) };
  };
  const save = callback('web/src/components/EnterpriseCycleDashboard.tsx', 'createCycle', {
    ...domain, ...setup, ...dates, db: {}, doc, collection, serverTimestamp: () => 'server-time',
    canManageCycles: true, canStartCycles: true, company: { id: 'farm' }, user: { uid: 'owner' },
    cycleName: 'Siklus 16', cycleStartMode: 'new', editingCycle: null, stockingCycle: null,
    selectedBlockIds: ['C'], sortedBlocks: [block], selectedSetupBlock: block, setupPonds: physicalPonds.slice(4),
    completedSetupCount: 4, plannedStartDate: '2026-10-01', todayDate: '2026-10-29',
    pondSetupValues: Object.fromEntries(physicalPonds.slice(4).map((pond) => [pond.id, { stockingDate: '2026-10-01', density: '100', supplier: 'Supplier' }])),
    copy: { cycleSaveFailed: 'failed' }, showAppAlert: (message) => alerts.push(message),
    setSaving() {}, setPondFilter() {}, resetCycleForm() {},
    runTransaction: async (_db, work) => {
      const pending = [];
      await work({
        get: async (ref) => { const data = documents.get(ref.path); return { exists: () => Boolean(data), data: () => data }; },
        set: (ref, data) => pending.push({ ref, data }),
        update: (ref, data) => pending.push({ ref, data: { ...documents.get(ref.path), ...data } }),
      });
      for (const write of pending) { documents.set(write.ref.path, write.data); writes.push(write); }
    },
  });
  await save({ preventDefault() {} });
  assert.equal(alerts.length, 0);
  const newCycles = writes.filter((write) => write.ref.path.includes('/cycles/'));
  assert.equal(newCycles.length, 1);
  assert.notEqual(newCycles[0].ref.id, 'old');
  assert.deepEqual(Array.from(newCycles[0].data.plannedPondIds), ['c5', 'c6', 'c7', 'c8']);
  assert.equal(writes.filter((write) => write.ref.path.includes('/ponds/')).length, 4);
  assert.equal(documents.get('companies/farm/physicalPonds/c1').activePondId, 'run-c1');
  assert.deepEqual(documents.get('companies/farm/cycles/old'), oldCycle);
  const count = writes.length;
  await save({ preventDefault() {} });
  assert.equal(writes.length, count, 'Server pointers reject a second start from stale form data');
  assert.equal(alerts.length, 1);
});
