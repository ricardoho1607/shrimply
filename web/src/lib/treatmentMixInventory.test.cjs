const assert = require('node:assert/strict');
const { test, after } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
require('../../../scripts/register-typescript.cjs');
const treatment = require('../../../shared/treatmentMix.ts');
const dates = require('../../../shared/farmDate.ts');
const { initializeApp, deleteApp } = require('firebase/app');
const firestore = require('firebase/firestore');
const app = initializeApp({ projectId: 'demo-treatment-save' }, 'treatment-save-test');
const db = firestore.getFirestore(app);
after(() => deleteApp(app));
function harness() {
  const documents = new Map([['companies/company/additives/ingredient', { additiveName: 'Mineral', unit: 'kg', totalStock: 100, totalCost: 1000, stockInHistory: [{ id: 'purchase', quantity: 100, price: 10, date: '2026-09-01' }], usageHistory: [] }]]);
  let writes = 0;
  const runTransaction = async (_db, work) => {
    const batch = firestore.writeBatch(db); const pending = []; let writing = false;
    await work({
      get: async ref => { assert.equal(writing, false); const data = documents.get(ref.path); return { exists: () => !!data, data: () => data }; },
      set: (ref, data) => { writing = true; batch.set(ref, data); pending.push({ ref, data }); },
      update: (ref, data) => { writing = true; batch.update(ref, data); pending.push({ ref, data }); },
    });
    for (const { ref, data } of pending) {
      const previous = documents.get(ref.path) || {};
      const applied = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value?._methodName === 'arrayUnion' ? [...(previous[key] || []), ...value._elements] : value]));
      documents.set(ref.path, { ...previous, ...applied }); writes++;
    }
  };
  const compiled = ts.transpileModule(fs.readFileSync(__dirname + '/treatmentMixInventory.ts', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  new Function('require', 'exports', compiled)(name => ({ 'firebase/firestore': { ...firestore, runTransaction }, '../../../shared/farmDate': dates, '../../../shared/treatmentMix': treatment, './firebase': { db } })[name], exports);
  const input = { name: 'Mix', yieldLiters: 100, components: [{ additiveId: 'ingredient', additiveName: 'Mineral', quantity: 10, unit: 'kg' }], operationId: 'stable-mix' };
  return { ...exports, input, documents, get writes() { return writes; } };
}

test('first mix retry does not deduct ingredients or create stock twice', async () => {
  const h = harness(); const id = await h.createTreatmentMix('company', h.input);
  await h.createTreatmentMix('company', h.input);
  assert.equal(id, 'stable-mix'); assert.equal(h.writes, 2);
  assert.equal(h.documents.get('companies/company/additives/ingredient').totalStock, 90);
});

test('batch retry adds one batch and deducts ingredients once', async () => {
  const h = harness(); await h.createTreatmentMix('company', h.input);
  await h.makeTreatmentMixBatch('company', 'stable-mix', undefined, 'batch-operation');
  await h.makeTreatmentMixBatch('company', 'stable-mix', undefined, 'batch-operation');
  assert.equal(h.writes, 4); assert.equal(h.documents.get('companies/company/additives/ingredient').totalStock, 80);
  assert.equal(h.documents.get('companies/company/additives/stable-mix').totalStock, 200);
});

test('treatment retry deducts mix once', async () => {
  const h = harness(); await h.createTreatmentMix('company', h.input);
  const pond = { id: 'c6', name: 'C6', areaM2: 1000 };
  await h.useTreatmentMix('company', 'stable-mix', pond, 1, undefined, '', 'treatment-operation');
  await h.useTreatmentMix('company', 'stable-mix', pond, 1, undefined, '', 'treatment-operation');
  assert.equal(h.writes, 3);
  assert.equal(h.documents.get('companies/company/additives/stable-mix').usageHistory.length, 1);
});

test('duplicate recipe ingredients reject before stock writes', async () => {
  const h = harness(); h.input.components.push({ ...h.input.components[0] });
  await assert.rejects(h.createTreatmentMix('company', h.input), /only be included once/); assert.equal(h.writes, 0);
});
