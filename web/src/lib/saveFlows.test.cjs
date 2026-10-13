const assert = require('node:assert/strict');
const { test, after } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
require('../../../scripts/register-typescript.cjs');
const { createSaveOperation } = require('../../../shared/saveOperation.ts');
const finance = require('../../../shared/financeSync.ts');
const { requireAvailableStock } = require('../../../shared/financeIntegrity.ts');
const { buildInventoryProductLabel } = require('../../../shared/productLabel.ts');
const { getFarmDateKey } = require('../../../shared/farmDate.ts');
const { allocateExpenseAcrossCyclePonds } = require('../../../shared/financeCycleAllocation.ts');
const { removeUndefinedFields } = require('./firestoreData.ts');
const { initializeApp, deleteApp } = require('firebase/app');
const firestore = require('firebase/firestore');
const app = initializeApp({ projectId: 'demo-save-flows' }, 'save-flows');
const db = firestore.getFirestore(app);
after(() => deleteApp(app));

function handler(file, name, next, env) {
  const source = fs.readFileSync(path.join(__dirname, '../app/dashboard', file), 'utf8');
  const start = source.indexOf(`  const ${name} =`);
  const end = source.indexOf(`  const ${next} =`, start);
  assert.ok(start > 0 && end > start, 'handler must exist in source');
  const compiled = ts.transpileModule(source.slice(start, end) + `\nreturn ${name};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(env), compiled)(...Object.values(env));
}

function harness({ mode = 'stockIn', lostAck = false, fail = false, permissions = true } = {}) {
  const documents = new Map();
  let transactions = 0;
  const writes = [];
  const alerts = [];
  let closed = false;
  let cleared = false;
  const selectedItem = { id: 'feed1', itemName: 'Feed', unit: 'kg', totalStock: 100 };
  const selectedAsset = { id: 'asset1', currentHolder: 'Old owner', condition: 'Good', transferHistory: [{ id: 'old-transfer' }], maintenanceHistory: [] };
  documents.set('companies/company/feeds/feed1', { totalStock: 100, totalCost: 1000, stockInHistory: [], usageHistory: [] });
  documents.set('assets/asset1', { ...selectedAsset, transferHistory: [{ id: 'old-transfer' }, { id: 'concurrent-transfer' }], maintenanceHistory: [{ id: 'existing', cost: 5 }], totalMaintenanceCost: 5 });
  const save = createSaveOperation();
  const formData = { itemName: 'Feed2', brand: 'Brand', category: 'Grower', unit: 'kg', quantity: '10', unitPrice: '10', reorderLevel: '2', stockDate: '2026-10-01', expiry: '', notes: '', pondId: '', manufacturer: '', ingredients: '', labelSourceUrl: '', name: 'Pump', description: '', purchaseDate: '2026-10-01', purchaseCost: '100', to: 'New owner', purpose: '', expectedReturn: '', maintCost: '10', laborHours: '', maintDesc: 'Repair', maintType: 'Repair', nextMaint: '', technician: 'Technician', date: '2026-10-01', amount: '100', cycleId: '' };
  const runTransaction = async (_db, work) => {
    transactions++;
    if (fail && transactions === 1) throw new Error('unavailable');
    const batch = firestore.writeBatch(db);
    const pending = [];
    let writing = false;
    const result = await work({
      get: async ref => { assert.equal(writing, false, 'all reads precede writes'); const data = documents.get(ref.path); return { exists: () => data !== undefined, data: () => data }; },
      set: (ref, data, opts) => { writing = true; opts ? batch.set(ref, data, opts) : batch.set(ref, data); pending.push({ ref, data, merge: !!opts?.merge }); },
      update: (ref, data) => { writing = true; batch.update(ref, data); pending.push({ ref, data, merge: true }); },
    });
    for (const { ref, data, merge } of pending) {
      const previous = documents.get(ref.path) || {};
      const applied = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value?._methodName === 'arrayUnion' ? [...(previous[key] || []), ...value._elements] : value]));
      documents.set(ref.path, merge ? { ...previous, ...applied } : applied);
      writes.push({ path: ref.path, data });
    }
    if (lostAck && transactions === 1) throw new Error('response lost');
    return result;
  };
  const env = { ...firestore, ...finance, removeUndefinedFields, requireAvailableStock, buildInventoryProductLabel, getFarmDateKey,
    allocateExpenseAcrossCyclePonds, db, save, runTransaction,
    createRecordOnce: async (_db, ref, data) => runTransaction(_db, async tx => { if (!(await tx.get(ref)).exists()) tx.set(ref, removeUndefinedFields(data)); }),
    setDoc: async (ref, data, options) => runTransaction(db, async tx => tx.set(ref, data, options)),
    updateDoc: async (ref, data) => runTransaction(db, async tx => tx.update(ref, data)),
    addDoc: async (ref, data) => { const target = firestore.doc(ref); await runTransaction(db, async tx => tx.set(target, data)); return target; },
    companyId: 'company', company: { id: 'company', timeZone: 'Asia/Jakarta' }, user: { uid: 'owner', name: 'Owner' },
    modalType: mode, selectedItem, selectedAsset, itemType: 'feed', formData, existingItems: [], activePonds: [], cycles: [], ponds: [], activeCycles: [], allocationMethod: null, allocationDecimals: 2, editingTransaction: null,
    canEditInventory: permissions, canManageAssets: permissions, canLogMaintenance: permissions, canManageFinance: permissions,
    assetManagementPermissionMessage: 'permission', assetMaintenancePermissionMessage: 'permission', isMaintenanceOnly: false, isOpenFarmCycle: () => true,
    uploadPhotos: async () => [], copy: value => value, alert: value => alerts.push(value), console: { error() {} },
    setModalOpen: value => { closed = !value; }, setIsModalOpen: value => { closed = !value; }, resetForm: () => { cleared = true; }, setIsSubmitting() {},
    handleOpenModal() {}, normalizeItemText: value => value.toLowerCase(), formType: 'expense', isCompanyWideExpense: true,
    t: { financeCycle: { saveFailed: 'failed', selectCycleMessage: 'select' } },
  };
  return { env, documents, writes, alerts, get transactions() { return transactions; }, get closed() { return closed; }, get cleared() { return cleared; } };
}

const event = { preventDefault() {} };
for (const mode of ['add', 'stockIn', 'usage']) {
  test(`inventory ${mode}: simultaneous submit writes stock and linked expense once`, async () => {
    const h = harness({ mode });
    const submit = handler('inventory/feeds/useInventoryFeedsActions.ts', 'handleAction', 'handleDeleteItem', h.env);
    await Promise.all([submit(event), submit(event)]);
    assert.equal(h.transactions, 1); assert.deepEqual(h.alerts, []); assert.equal(h.closed, true); assert.equal(h.env.save.busy, false);
    if (mode === 'stockIn') assert.equal(h.documents.get('companies/company/feeds/feed1').totalStock, 110);
    if (mode === 'usage') assert.equal(h.documents.get('companies/company/feeds/feed1').totalStock, 90);
  });
  test(`inventory ${mode}: lost acknowledgement retry applies once`, async () => {
    const h = harness({ mode, lostAck: true });
    const submit = handler('inventory/feeds/useInventoryFeedsActions.ts', 'handleAction', 'handleDeleteItem', h.env);
    await submit(event); assert.equal(h.closed, false); assert.equal(h.env.save.busy, false);
    const writeCount = h.writes.length;
    await submit(event); assert.equal(h.writes.length, writeCount); assert.equal(h.closed, true);
  });
}

for (const mode of ['add', 'transfer', 'maintenance']) {
  test(`assets ${mode}: retry does not duplicate records, history, or cost`, async () => {
    const h = harness({ mode, lostAck: true });
    const submit = handler('inventory/assets/page.tsx', 'handleAction', 'handleDeleteAsset', h.env);
    await Promise.all([submit(event), submit(event)]);
    assert.equal(h.transactions, 1); assert.equal(h.closed, false);
    const writeCount = h.writes.length;
    await submit(event); assert.equal(h.writes.length, writeCount); assert.equal(h.closed, true); assert.equal(h.env.save.busy, false);
    if (mode === 'maintenance') { const asset = h.documents.get('assets/asset1'); assert.equal(asset.maintenanceHistory.length, 2); assert.equal(asset.totalMaintenanceCost, 15); }
    if (mode === 'transfer') { const asset = h.documents.get('assets/asset1'); assert.equal(asset.transferHistory.length, 3); assert.equal(asset.transferHistory.at(-1).from, 'Old owner'); }
  });
}

test('return refuses to clear a newer asset transfer', async () => {
  const h = harness({ mode: 'return' });
  await handler('inventory/assets/page.tsx', 'handleAction', 'handleDeleteAsset', h.env)(event);
  assert.equal(h.writes.length, 0); assert.equal(h.closed, false); assert.equal(h.env.save.busy, false); assert.equal(h.alerts.length, 1);
});

test('finance lost acknowledgement retains draft and retry does not add a second expense', async () => {
  const h = harness({ lostAck: true });
  const submit = handler('finance/page.tsx', 'handlePost', 'resetForm', h.env);
  await Promise.all([submit(event), submit(event)]);
  assert.equal(h.transactions, 1, JSON.stringify(h.alerts)); assert.equal(h.closed, false); assert.equal(h.cleared, false); assert.equal(h.env.save.busy, false);
  await submit(event); assert.equal(h.writes.length, 1); assert.equal(h.closed, true); assert.equal(h.cleared, true);
});

test('permission and invalid quantity produce no writes; failure unlocks retry', async () => {
  for (const options of [{ permissions: false }, { fail: true }, {}]) {
    const h = harness(options); if (!options.fail && options.permissions !== false) h.env.formData.quantity = 'NaN';
    await handler('inventory/feeds/useInventoryFeedsActions.ts', 'handleAction', 'handleDeleteItem', h.env)(event);
    assert.equal(h.writes.length, 0); assert.equal(h.closed, false); assert.equal(h.env.save.busy, false);
  }
});

test('sampling retry preserves concurrent observations and never deducts inventory', async () => {
  const h = harness({ lostAck: true });
  h.documents.set('companies/company/ponds/c6', { cycleStatus: 'active', samplings: [{ id: 'server-observation', date: '2026-09-01', mbw: 10 }] });
  Object.assign(h.env, {
    pond: { id: 'c6', cycleStatus: 'active', docStart: '2026-07-01', samplings: [] },
    canRecordPondData: true, isActiveCycle: () => true, editingSamplingId: null,
    samplingForm: { date: '2026-10-01', mbw: '13', feed: '', mortality: '0' }, today: '2026-10-01',
    setSamplingModalOpen: value => { h.env.closed = !value; }, setEditingSamplingId() {}, setSamplingForm() {},
    t: { messages: { error: 'failed' } },
  });
  const submit = handler('ponds/detail/usePondDetailActions.ts', 'handleSaveSampling', 'handleSaveMortality', h.env);
  await Promise.all([submit(event), submit(event)]);
  assert.equal(h.transactions, 1); assert.equal(h.env.save.busy, false);
  await submit(event);
  const records = h.documents.get('companies/company/ponds/c6').samplings;
  assert.equal(records.length, 2); assert.equal(records[0].id, 'server-observation');
  assert.equal(records[1].feed, undefined, 'blank feed stays unknown');
  assert.equal(h.writes.length, 1); assert.ok(h.writes.every(write => write.path.includes('/ponds/')));
});
