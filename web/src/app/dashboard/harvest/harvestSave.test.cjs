const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test, after } = require('node:test');
const ts = require('typescript');
require('../../../../../scripts/register-typescript.cjs');
const calculations = require('../../../../../shared/harvestCalculations.ts');
const finance = require('../../../../../shared/financeSync.ts');
const { calculatePondMetricsWithHarvest } = require('../../../../../shared/pondCalculations.ts');
const { removeUndefinedFields } = require('../../../lib/firestoreData.ts');
const { initializeApp, deleteApp } = require('firebase/app');
const { getFirestore, doc, collection, writeBatch, serverTimestamp } = require('firebase/firestore');
const app = initializeApp({ projectId: 'demo-harvest-save' }, 'harvest-save-test');
const db = getFirestore(app);
after(() => deleteApp(app));
const source = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
const handlerSource = source.slice(source.indexOf('  const handleAddHarvest ='), source.indexOf('  const addPondToBatch ='));
const handler = ts.transpileModule(handlerSource + '\nreturn handleAddHarvest;', {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText;
const deleteSource = source.slice(source.indexOf('  const handleDeleteRecord ='), source.indexOf('  const openCycleIds ='));
const deleteHandler = ts.transpileModule(deleteSource + '\nreturn handleDeleteRecord;', {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText;

async function save({ harvestType = 'final', metadata = true, editing = false, deleting = false, sampling = true } = {}) {
  const cycle = metadata ? { cycleId: 'cycle-15', cycleName: 'Siklus 15', blockId: 'block-c', blockName: 'Block C' } : {};
  const pond = { id: 'c6', pondName: 'C6', initialPopulation: 310000, initialWeight: 0.5,
    docStart: '2026-07-01', ...cycle, totalHarvestedBiomass: editing ? 100 : 0,
    totalHarvestedPopulation: editing ? 10000 : 0,
    samplings: sampling ? [{ id: 'sampling-c6', date: '2026-09-17', mbw: 13.04, feed: 0 }] : [] };
  const formData = { date: '2026-09-17', pondId: 'c6', harvestType,
    biomass: '3489.29', size: '76.71', price: '56987', subBiomass: '437.44', subSize: '104.76', subPrice: '52571.98' };
  const previous = editing || deleting ? { id: 'previous-harvest', date: formData.date, ...cycle,
    ponds: [{ pondId: 'c6', pondName: 'C6', harvestType: 'partial', partialHarvestNumber: 1,
      biomass: '100', size: '100', price: '50000', ...cycle }] } : null;
  const alerts = [];
  const committed = [];
  let closed = false;
  const dependencies = { ...calculations, ...finance, calculatePondMetricsWithHarvest,
    removeUndefinedFields, db, doc, collection, serverTimestamp,
    companyId: 'company-csb', user: { uid: 'owner' }, canEditHarvest: true,
    formData, harvestBatch: [], formPonds: [pond], formCycle: metadata ? { id: cycle.cycleId, ...cycle } : undefined,
    editingRecord: previous, harvestRecords: previous ? [previous] : [], company: { timeZone: 'Asia/Jakarta' }, today: formData.date,
    t: { harvestCycle: { saveFailed: 'save-failed' }, harvest: { samplingRequiredMessage: '{{pondName}}:{{date}}', sizeDifferenceMessage: '{{pondName}}' } },
    window: { confirm: () => true }, alert: message => alerts.push(message),
    console: { error: (...args) => alerts.push(args.at(-1).message) },
    setModalOpen: value => { closed = !value; }, setEditingRecord: () => {}, setHarvestBatch: () => {}, setFormData: () => {},
    runTransaction: async (_db, work) => {
      // Use the real SDK serializer, without committing any network writes.
      const batch = writeBatch(db);
      const pending = [];
      await work({
        get: async ref => ({ id: ref.id, ref, exists: () => true,
          data: () => ref.path.includes('/ponds/') ? pond : previous }),
        update: (ref, data) => { batch.update(ref, data); pending.push({ path: ref.path, data }); },
        set: (ref, data, options) => { if (options) batch.set(ref, data, options); else batch.set(ref, data); pending.push({ path: ref.path, data }); },
      });
      committed.push(...pending);
    },
  };
  await new Function(...Object.keys(dependencies), deleting ? deleteHandler : handler)(...Object.values(dependencies))(
    deleting ? 'previous-harvest' : { preventDefault() {} },
  );
  return { alerts, committed, closed };
}

for (const metadata of [true, false]) {
  for (const harvestType of ['final', 'partial']) {
    test(`${harvestType} harvest saves atomically ${metadata ? 'with' : 'without'} cycle/block metadata`, async () => {
      const result = await save({ harvestType, metadata });
      assert.deepEqual(result.alerts, []);
      assert.equal(result.closed, true);
      assert.equal(result.committed.length, 3);
      const harvest = result.committed.find(write => write.path.includes('/harvestRecords/')).data;
      const revenue = result.committed.find(write => write.path.includes('/revenues/')).data;
      const pond = result.committed.find(write => write.path.includes('/ponds/')).data;
      assert.equal(harvest.ponds[0].harvestType, harvestType);
      assert.equal(harvest.ponds[0].harvestReferenceMbw, 13.04);
      assert.equal(harvest.ponds[0].partialHarvestNumber, harvestType === 'partial' ? 1 : undefined);
      assert.equal(Object.hasOwn(harvest.ponds[0], 'partialHarvestNumber'), harvestType === 'partial');
      assert.ok(Math.abs(pond.totalHarvestedBiomass - 3926.73) < 1e-6);
      assert.equal(revenue.amount, 3489.29 * 56987 + 437.44 * 52571.98);
      assert.equal(harvest.financeEntry.amount, revenue.amount);
      assert.equal(harvest.financeEntry.reference, revenue.reference);
      if (!metadata) assert.equal(Object.hasOwn(revenue, 'cycleId'), false);
    });
  }
}
test('correcting a legacy harvest saves replacement and voids original with matching revenues', async () => {
  const result = await save({ editing: true, metadata: false });
  assert.deepEqual(result.alerts, []);
  assert.equal(result.committed.length, 5);
  const replacement = result.committed.find(write => write.data.correctedFromHarvestId).data;
  assert.equal(replacement.correctedFromHarvestId, 'previous-harvest');
  assert.equal(result.committed.filter(write => write.data.voided === true).length, 2);
});
test('missing harvest-date sampling still blocks saving', async () => {
  const result = await save({ sampling: false });
  assert.equal(result.committed.length, 0);
  assert.equal(result.closed, false);
  assert.match(result.alerts[0], /C6:2026-09-17/);
});
test('voiding a legacy harvest tolerates absent cycle metadata and retains matching finance entries', async () => {
  const result = await save({ deleting: true, metadata: false });
  assert.deepEqual(result.alerts, []);
  assert.equal(result.committed.length, 3);
  const harvest = result.committed.find(write => write.path.includes('/harvestRecords/')).data;
  const revenue = result.committed.find(write => write.path.includes('/revenues/')).data;
  assert.equal(harvest.voided, true);
  assert.equal(revenue.voided, true);
  assert.equal(harvest.financeEntry.amount, revenue.amount);
  assert.equal(harvest.financeEntry.reference, revenue.reference);
});
