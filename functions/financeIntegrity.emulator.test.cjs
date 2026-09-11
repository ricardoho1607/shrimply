const fs = require('node:fs');
const path = require('node:path');
const { test, before, after, beforeEach } = require('node:test');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, setDoc, updateDoc, deleteDoc, writeBatch, runTransaction } = require('firebase/firestore');
let env;
before(async () => { env = await initializeTestEnvironment({ projectId: 'demo-shrimply-finance-integrity', firestore: { rules: fs.readFileSync(path.join(__dirname, '../firestore.rules'), 'utf8') } }); });
after(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/owner'), { companyId: 'farm', role: 'owner' });
    await setDoc(doc(db, 'companies/farm'), { ownerId: 'owner', teamMembers: ['owner', 'operator'], businessSize: 'enterprise' });
    await setDoc(doc(db, 'users/operator'), { companyId: 'farm', role: 'manager', permissionOverrides: { manageFeedInventory: true, manageHarvests: true, manageFinance: false, viewFinance: false, viewFarm: true } });
  });
});
const dbFor = uid => env.authenticatedContext(uid).firestore();
const purchase = { companyId: 'farm', sourceKind: 'inventory', sourceId: 'feed', sourceCollection: 'feeds', sourceLineId: 'stock', sourceStockIndex: 0, reference: 'INVENTORY-feed-feed-stock', date: '2026-09-09', amount: 100 };
const expenseId = 'sync_INVENTORY-feed-feed-stock';
test('operator can atomically save inventory and source-matched expense without finance read access', async () => {
  const db = dbFor('operator'); const batch = writeBatch(db);
  batch.set(doc(db, 'companies/farm/feeds/feed'), { companyId: 'farm', stockInHistory: [{ id: 'stock', quantity: 10, price: 10 }], usageHistory: [], financeEntries: { [expenseId]: { reference: purchase.reference, date: purchase.date, amount: 100, voided: false } } });
  batch.set(doc(db, 'companies/farm/expenses', expenseId), purchase);
  await assertSucceeds(batch.commit());
  await assertFails(updateDoc(doc(db, 'companies/farm/expenses', expenseId), { amount: 200 }));
  await assertFails(updateDoc(doc(db, 'companies/farm/feeds/feed'), { stockInHistory: [{ id: 'stock', quantity: 20, price: 10 }] }));
  await assertFails(updateDoc(doc(db, 'companies/farm/feeds/feed'), { stockInHistory: [{ id: 'stock', quantity: 10, price: 10 }, { id: 'unlinked', quantity: 10, price: 10 }] }));
  await assertFails(deleteDoc(doc(db, 'companies/farm/feeds/feed')));
  await assertFails(deleteDoc(doc(dbFor('owner'), 'companies/farm/expenses', expenseId)));
  await assertSucceeds(updateDoc(doc(dbFor('owner'), 'companies/farm/expenses', expenseId), { settlements: [{ id: 'p', amount: 40, date: '2026-09-10' }] }));
});
test('fake source references and cross-company sources fail', async () => {
  const db = dbFor('operator');
  await assertFails(setDoc(doc(db, 'companies/farm/expenses', expenseId), purchase));
  await assertFails(setDoc(doc(db, 'companies/another/expenses', expenseId), { ...purchase, companyId: 'another' }));
});
test('harvest creation and void preserve source and ledger while forbidding detached deletes', async () => {
  const db = dbFor('operator'); const ref = doc(db, 'companies/farm/harvestRecords/h1'); const ledger = doc(db, 'companies/farm/revenues/sync_HARVEST-h1');
  const entry = { id: 'sync_HARVEST-h1', reference: 'HARVEST-h1', date: '2026-09-09', amount: 50, voided: false };
  const batch = writeBatch(db);
  batch.set(ref, { id: 'h1', date: entry.date, ponds: [{ biomass: 10, price: 5 }], financeEntry: entry });
  batch.set(ledger, { ...entry, companyId: 'farm', sourceKind: 'harvest', sourceId: 'h1' });
  await assertSucceeds(batch.commit());
  await assertFails(updateDoc(ref, { ponds: [{ biomass: 100, price: 5 }] }));
  await assertFails(updateDoc(ref, { date: '2026-09-10' }));
  await assertFails(updateDoc(ref, { voided: true, financeEntry: { ...entry, voided: true } }));
  await assertFails(deleteDoc(ref)); await assertFails(deleteDoc(ledger));
  const cancel = writeBatch(db); cancel.update(ref, { voided: true, financeEntry: { ...entry, voided: true } }); cancel.update(ledger, { voided: true });
  await assertSucceeds(cancel.commit());
});
test('manual entries remain editable by finance managers and operators cannot alter payments', async () => {
  const db = dbFor('owner'); const ref = doc(db, 'companies/farm/expenses/manual');
  await assertSucceeds(setDoc(ref, { reference: '', amount: 10, category: 'Repairs' }));
  await assertSucceeds(updateDoc(ref, { amount: 20 }));
  await assertFails(updateDoc(doc(dbFor('operator'), 'companies/farm/expenses/manual'), { settlements: [] }));
  await assertSucceeds(deleteDoc(ref));
});
