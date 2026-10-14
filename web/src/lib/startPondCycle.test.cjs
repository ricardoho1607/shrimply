const assert = require('node:assert/strict');
const { test, after } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const { initializeApp, deleteApp } = require('firebase/app');
const firestore = require('firebase/firestore');
require('../../../scripts/register-typescript.cjs');
const { removeUndefinedFields } = require('./firestoreData.ts');
const app = initializeApp({ projectId: 'demo-start-cycle' }, 'start-cycle-test');
const db = firestore.getFirestore(app);
after(() => deleteApp(app));

function harness({ physical = {}, cycle = {}, loseAck = false, gateBlocked = false } = {}) {
  const documents = new Map([
    ['companies/company/physicalPonds/physical', { pondName: 'C6', status: 'idle', ...physical }],
    ['companies/company/cycles/existing', { cycleName: 'Cycle 15', status: 'active', stockingStartDate: '2026-07-01', stockingEndDate: '2026-09-01', ...cycle }],
  ]);
  const writes = [];
  let lost = false;
  const runTransaction = async (_db, work) => {
    const batch = firestore.writeBatch(db); const pending = []; let writing = false;
    const outcome = await work({
      get: async ref => { assert.equal(writing, false); const data = documents.get(ref.path); return { exists: () => data !== undefined, data: () => data }; },
      set: (ref, data) => { writing = true; batch.set(ref, data); pending.push({ ref, data, merge: false }); },
      update: (ref, data) => { writing = true; batch.update(ref, data); pending.push({ ref, data, merge: true }); },
    });
    for (const write of pending) { documents.set(write.ref.path, write.merge ? { ...documents.get(write.ref.path), ...write.data } : write.data); writes.push(write); }
    if (loseAck && pending.length && !lost) { lost = true; throw new Error('ack lost'); }
    return outcome;
  };
  const compiled = ts.transpileModule(fs.readFileSync(__dirname + '/startPondCycle.ts', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  new Function('require', 'exports', compiled)(name => ({
    'firebase/firestore': { ...firestore, runTransaction }, '@/lib/firebase': { db }, './firestoreData': { removeUndefinedFields },
    './sopGuards': { assertSopStageGate: async () => { if (gateBlocked) throw new Error('SOP prerequisites incomplete'); } },
    './physicalPondIdentity': { resolveCompanyPhysicalPond: async () => ({ id: 'physical', pondName: 'C6' }) },
  })[name], exports);
  const args = {
    companyId: 'company', userId: 'owner', operationId: 'stable-pond-cycle',
    pond: { id: 'old-cycle', pondName: 'C6', pondArea: 1000 }, pondType: 'cycle', activePonds: [], today: '2026-10-01',
    activeCycle: { id: 'existing', cycleName: 'Cycle 15', stockingStartDate: '2026-08-01', stockingEndDate: '2026-08-02' },
    form: { density: '100', plValue: '10', plSupplier: 'Supplier', docStart: '2026-08-15', cycleStartMode: 'new', baselineMbw: '', baselineEstimatedPopulation: '', baselineSurvivalRate: '', baselineCumulativeFeed: '' },
  };
  return { ...exports, args, documents, writes };
}

test('cycle start writes atomically and uses current server stocking dates', async () => {
  const h = harness(); const result = await h.startPondCycle(h.args);
  assert.equal(result.pondId, 'stable-pond-cycle'); assert.equal(h.writes.length, 3);
  assert.equal(h.documents.get('companies/company/physicalPonds/physical').activePondId, result.pondId);
  const cycle = h.documents.get('companies/company/cycles/existing');
  assert.equal(cycle.stockingStartDate, '2026-07-01'); assert.equal(cycle.stockingEndDate, '2026-09-01');
  const pond = h.documents.get('companies/company/ponds/stable-pond-cycle');
  assert.equal(pond.initialPopulation, 100000); assert.equal(pond.blockId, undefined);
  assert.equal(pond.createdAt._methodName, 'serverTimestamp', 'SDK sentinels are preserved');
});

test('lost cycle acknowledgement retry succeeds even after live data marks pond active', async () => {
  const h = harness({ loseAck: true }); h.args.activeCycle = null;
  await assert.rejects(h.startPondCycle(h.args), /ack lost/);
  h.args.activePonds = [{ id: 'stable-pond-cycle', pondName: 'C6', cycleStatus: 'active' }];
  const result = await h.startPondCycle(h.args);
  assert.equal(result.cycleId, 'cycle-stable-pond-cycle'); assert.equal(h.writes.length, 3);
});

test('server rejects another active pond cycle and closed farm cycle', async () => {
  for (const options of [{ physical: { activePondId: 'another-pond' } }, { cycle: { status: 'closed' } }]) {
    const h = harness(options); await assert.rejects(h.startPondCycle(h.args), h.StartPondCycleError); assert.equal(h.writes.length, 0);
  }
});

test('invalid calendar day cannot start a pond cycle', async () => {
  const h = harness(); h.args.form.docStart = '2026-02-30';
  await assert.rejects(h.startPondCycle(h.args), /invalidStartDate/); assert.equal(h.writes.length, 0);
});

test('unmet SOP stage requirements stop a planned stocking before operational writes', async () => { const h = harness({gateBlocked:true}); await assert.rejects(h.startPondCycle(h.args), /SOP prerequisites/); assert.equal(h.writes.length,0); });

for (const implicit of [false, true]) {
  for (const technician of [' technician ', '', undefined, null]) {
    test(`new ${implicit ? 'implicit' : 'explicit'} cycle permits technician ${String(technician)}`, async () => {
      const h = harness();
      if (implicit) h.args.activeCycle = null;
      else h.args.form.cycleTargetMode = 'new';
      h.args.form.assignedTechnicianId = technician;
      const result = await h.startPondCycle(h.args);
      const cycle = h.documents.get(`companies/company/cycles/${result.cycleId}`);
      assert.equal(cycle.assignedTechnicianId, technician ? 'technician' : undefined);
      assert.equal(h.documents.get(`companies/company/ponds/${result.pondId}`).assignedTechnicianId, undefined);
      assert.equal(h.writes.length, 3);
    });
  }
}

test('adding a pond to an existing cycle preserves its assigned technician', async () => {
  const h = harness({ cycle: { assignedTechnicianId: 'original' } });
  h.args.form.assignedTechnicianId = 'another';
  await h.startPondCycle(h.args);
  assert.equal(h.documents.get('companies/company/cycles/existing').assignedTechnicianId, 'original');
});

test('lost acknowledgement retry preserves the originally saved technician', async () => {
  const h = harness({ loseAck: true });
  h.args.activeCycle = null;
  h.args.form.assignedTechnicianId = 'original';
  await assert.rejects(h.startPondCycle(h.args), /ack lost/);
  h.args.form.assignedTechnicianId = 'another';
  const result = await h.startPondCycle(h.args);
  assert.equal(h.documents.get(`companies/company/cycles/${result.cycleId}`).assignedTechnicianId, 'original');
  assert.equal(h.writes.length, 3);
});
