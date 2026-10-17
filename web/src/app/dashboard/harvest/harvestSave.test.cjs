const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test, after } = require('node:test');
const ts = require('typescript');
require('../../../../../scripts/register-typescript.cjs');
const { getUserErrorMessage } = require('./../../../lib/userError.ts');
const calculations = require('../../../../../shared/harvestCalculations.ts');
const finance = require('../../../../../shared/financeSync.ts');
const { calculatePondMetricsWithHarvest } = require('../../../../../shared/pondCalculations.ts');
const persistence = require('./harvestPersistence.ts');
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
const samplingSource = source.slice(source.indexOf('  const saveRequiredSampling ='), source.indexOf('  const handleAddHarvest ='));
const samplingHandler = ts.transpileModule(samplingSource + '\nreturn saveRequiredSampling;', {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText;

async function save({ harvestType = 'final', metadata = true, editing = false, deleting = false, sampling = true,
  formOverrides = {}, batch = [], extraPonds = [], serverPondOverrides = {}, missingPond = false, previousVoided = false,
  transactionError, commitThenFail = false, retry = false, retryOverrides = {}, concurrent = false,
  samplingOnly = false, samplingMbw = '13.04', samplingBusy = false, confirm = true } = {}) {
  const cycle = metadata ? { cycleId: 'cycle-15', cycleName: 'Siklus 15', blockId: 'block-c', blockName: 'Block C' } : {};
  const pond = { id: 'c6', pondName: 'C6', initialPopulation: 310000, initialWeight: 0.5,
    docStart: '2026-07-01', ...cycle, totalHarvestedBiomass: editing ? 100 : 0,
    totalHarvestedPopulation: editing ? 10000 : 0,
    samplings: sampling ? [{ id: 'sampling-c6', date: '2026-09-17', mbw: 13.04, feed: 0 }] : [] };
  const formData = { date: '2026-09-17', pondId: 'c6', harvestType,
    biomass: '3489.29', size: '76.71', price: '56987', subBiomass: '437.44', subSize: '104.76', subPrice: '52571.98', ...formOverrides };
  const previous = editing || deleting ? { id: 'previous-harvest', date: formData.date, ...cycle,
    ponds: [{ pondId: 'c6', pondName: 'C6', harvestType: 'partial', partialHarvestNumber: 1,
      biomass: '100', size: '100', price: '50000', ...cycle }] } : null;
  const alerts = [];
  const errors = [];
  const committed = [];
  const documents = new Map();
  const harvestSubmitLock = { current: false };
  const pendingHarvest = { current: null };
  let transactions = 0;
  let saving = false;
  let cleared = false;
  let closed = false;
  const dependencies = { ...calculations, ...finance, calculatePondMetricsWithHarvest,
    ...persistence, removeUndefinedFields, db, doc, collection, serverTimestamp,
    harvestSubmitLock, pendingHarvest, samplingSavingPondId: samplingBusy ? 'c6' : null,
    samplingMbwDrafts: { c6: samplingMbw }, samplingFeedStatuses: {},
    setSamplingSavingPondId: () => {}, setSamplingMbwDrafts: () => { cleared = true; },
    companyId: 'company-csb', user: { uid: 'owner' }, canEditHarvest: true,
    formData, harvestBatch: batch, formPonds: [pond, ...extraPonds.map(extra => ({ ...pond, ...extra }))], formCycle: metadata ? { id: cycle.cycleId, ...cycle } : undefined,
    editingRecord: previous, harvestRecords: previous ? [previous] : [], company: { timeZone: 'Asia/Jakarta' }, today: '2026-10-01',
    t: { harvestCycle: { saveFailed: 'save-failed' }, harvest: { samplingMbwRequired: 'MBW must be positive', samplingRequiredMessage: '{{pondName}}:{{date}}', sizeDifferenceMessage: '{{pondName}}' } },
    confirmAppAction: async () => confirm, getUserErrorMessage, showAppAlert: message => alerts.push(message), copy: value => value,
    console: { error: (...args) => errors.push(args.at(-1).message) },
    setIsSavingHarvest: value => { saving = value; },
    setModalOpen: value => { closed = !value; }, setEditingRecord: () => {}, setHarvestBatch: () => {}, setFormData: () => { cleared = true; },
    runTransaction: async (_db, work) => {
      transactions += 1;
      if (transactionError && transactions === 1) throw transactionError;
      // Use the real SDK serializer, without committing any network writes.
      const batch = writeBatch(db);
      const pending = [];
      let writing = false;
      const outcome = await work({
        get: async ref => {
          assert.equal(writing, false, 'all reads must precede writes');
          const extra = extraPonds.find(pond => pond.id === ref.id);
          const data = ref.path.includes('/ponds/') ? (missingPond ? undefined : { ...pond, ...extra, ...serverPondOverrides })
            : ref.id === 'previous-harvest' ? { ...previous, voided: previousVoided } : documents.get(ref.path);
          return { id: ref.id, ref, exists: () => Boolean(data), data: () => data };
        },
        update: (ref, data) => { writing = true; batch.update(ref, data); pending.push({ path: ref.path, data }); },
        set: (ref, data, options) => { writing = true; if (options) batch.set(ref, data, options); else batch.set(ref, data); pending.push({ path: ref.path, data }); },
      });
      committed.push(...pending);
      pending.forEach(write => documents.set(write.path, write.data));
      if (commitThenFail && transactions === 1) throw Object.assign(new Error('Response lost'), { code: 'unavailable' });
      return outcome;
    },
  };
  const submit = new Function(...Object.keys(dependencies), samplingOnly ? samplingHandler : deleting ? deleteHandler : handler)(...Object.values(dependencies));
  const invoke = () => submit(samplingOnly ? pond : deleting ? 'previous-harvest' : { preventDefault() {} });
  if (concurrent) await Promise.all([invoke(), invoke()]); else await invoke();
  const afterFirst = { cleared, closed, pendingId: pendingHarvest.current?.id };
  if (retry) {
    Object.assign(formData, retryOverrides);
    await invoke();
  }
  return { alerts, errors, committed, closed, cleared, transactions, saving, locked: harvestSubmitLock.current, afterFirst };
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

test('rapid repeated submissions commit only one harvest and release the lock', async () => {
  const result = await save({ concurrent: true });
  assert.deepEqual(result.alerts, []);
  assert.equal(result.transactions, 1);
  assert.equal(result.committed.length, 3);
  assert.equal(result.saving, false);
  assert.equal(result.locked, false);
});
for (const editing of [false, true]) {
  test(`retry after a lost response does not apply ${editing ? 'correction' : 'harvest'} totals twice`, async () => {
    const result = await save({ editing, commitThenFail: true, retry: true });
    assert.equal(result.afterFirst.closed, false);
    assert.equal(result.afterFirst.cleared, false);
    assert.ok(result.afterFirst.pendingId);
    assert.match(result.alerts[0], /connection and retry/);
    assert.equal(result.transactions, 2);
    assert.equal(result.committed.length, editing ? 5 : 3);
    assert.equal(result.closed, true);
    assert.equal(result.locked, false);
  });
}
test('a rejected save retains the draft and permits retry', async () => {
  const result = await save({ transactionError: { code: 'permission-denied', message: 'Denied' }, retry: true });
  assert.equal(result.afterFirst.cleared, false);
  assert.match(result.alerts[0], /company owner/);
  assert.equal(result.committed.length, 3);
  assert.equal(result.closed, true);
});
test('changing a draft after an unconfirmed save cannot create a second harvest', async () => {
  const result = await save({ commitThenFail: true, retry: true, retryOverrides: { price: '60000' } });
  assert.equal(result.committed.length, 3);
  assert.match(result.alerts.at(-1), /already saved/);
  assert.equal(result.closed, true);
});
for (const formOverrides of [{ biomass: 'NaN' }, { size: '-1' }, { price: 'Infinity' },
  { subPrice: '' }, { subBiomass: '-1' }, { date: '' }, { date: '2026-02-31' }, { date: '2026-10-02' },
  { biomass: '1e308', price: '1e308' }]) {
  test(`invalid harvest input ${JSON.stringify(formOverrides)} never commits or clears the draft`, async () => {
    const result = await save({ formOverrides });
    assert.equal(result.committed.length, 0);
    assert.equal(result.cleared, false);
    assert.equal(result.closed, false);
    assert.ok(result.alerts.length);
    assert.equal(result.locked, false);
  });
}
test('duplicate batch ponds and incomplete queued grades are rejected', async () => {
  for (const batch of [[{ pondId: 'c6' }], [{ pondId: 'c7', biomass: '10', size: '', price: '20' }]]) {
    const result = await save({ batch });
    assert.equal(result.transactions, 0);
    assert.equal(result.committed.length, 0);
    assert.ok(result.alerts.length);
  }
});
for (const options of [{ missingPond: true }, { serverPondOverrides: { cycleId: 'new-cycle' } },
  { serverPondOverrides: { samplings: [] } }, { editing: true, previousVoided: true }]) {
  test(`stale server data ${JSON.stringify(options)} blocks all writes`, async () => {
    const result = await save(options);
    assert.equal(result.committed.length, 0);
    assert.equal(result.closed, false);
    assert.equal(result.locked, false);
    assert.ok(result.alerts.length);
  });
}
test('saving waits for sampling and cancelled warnings release the submission lock', async () => {
  const busy = await save({ samplingBusy: true });
  assert.equal(busy.transactions, 0);
  const cancelled = await save({ confirm: false, formOverrides: { size: '150' } });
  assert.equal(cancelled.transactions, 0);
  assert.equal(cancelled.locked, false);
  assert.equal(cancelled.closed, false);
});
test('voiding cannot silently proceed when the server pond is missing or permission is denied', async () => {
  for (const options of [{ missingPond: true }, { transactionError: { code: 'permission-denied', message: 'Denied' } }]) {
    const result = await save({ deleting: true, ...options });
    assert.equal(result.committed.length, 0);
    assert.ok(result.alerts.length);
    assert.equal(result.locked, false);
  }
});

test('numeric legacy fields normalize to the existing string schema', async () => {
  const result = await save({ formOverrides: { biomass: 3489.29, size: 76.71, price: 56987 } });
  assert.deepEqual(result.alerts, []);
  const harvest = result.committed.find(write => write.path.includes('/harvestRecords/')).data;
  assert.equal(harvest.ponds[0].biomass, '3489.29');
});
test('a valid batch updates each pond once and posts the combined revenue', async () => {
  const result = await save({ extraPonds: [{ id: 'c7', pondName: 'C7' }],
    batch: [{ pondId: 'c7', harvestType: 'partial', biomass: '100', size: '76.71', price: '50000' }] });
  assert.deepEqual(result.alerts, []);
  assert.equal(result.committed.length, 4);
  assert.equal(result.committed.filter(write => write.path.includes('/ponds/')).length, 2);
  const revenue = result.committed.find(write => write.path.includes('/revenues/')).data;
  assert.equal(revenue.amount, 3489.29 * 56987 + 437.44 * 52571.98 + 100 * 50000);
});
test('ponds from different cycles cannot be recorded in the same batch', async () => {
  const result = await save({ extraPonds: [{ id: 'c7', pondName: 'C7', cycleId: 'different-cycle' }],
    batch: [{ pondId: 'c7', harvestType: 'partial', biomass: '100', size: '76.71', price: '50000' }] });
  assert.equal(result.committed.length, 0);
  assert.match(result.alerts[0], /same cycle/);
});

test('harvest-date sampling persists numeric MBW without inventing feed or deducting inventory', async () => {
  const result = await save({ samplingOnly: true, sampling: false, metadata: false });
  assert.deepEqual(result.alerts, []);
  assert.equal(result.committed.length, 1);
  assert.match(result.committed[0].path, /\/ponds\/c6$/);
  const sampling = result.committed[0].data.samplings[0];
  assert.equal(sampling.mbw, 13.04);
  assert.equal(sampling.feedEntryStatus, 'not_recorded');
  assert.equal(Object.hasOwn(sampling, 'feed'), false);
  assert.equal(Object.hasOwn(sampling, 'cycleId'), false);
});
test('existing same-day sampling is not duplicated', async () => {
  const result = await save({ samplingOnly: true });
  assert.deepEqual(result.alerts, []);
  assert.equal(result.committed.length, 0);
});
test('sampling rejects invalid MBW and preserves its draft after a failed transaction', async () => {
  const invalid = await save({ samplingOnly: true, sampling: false, samplingMbw: 'Infinity' });
  assert.equal(invalid.transactions, 0);
  assert.match(invalid.alerts[0], /MBW/);
  const failed = await save({ samplingOnly: true, sampling: false, transactionError: { code: 'unavailable' } });
  assert.equal(failed.committed.length, 0);
  assert.equal(failed.cleared, false);
  assert.match(failed.alerts[0], /connection and retry/);
});
