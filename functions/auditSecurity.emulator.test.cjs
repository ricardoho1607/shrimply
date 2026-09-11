const { test, before, after, beforeEach } = require('node:test');
const fs = require('node:fs'); const path = require('node:path');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, setDoc, updateDoc, getDoc, deleteField } = require('firebase/firestore');
let env;
before(async () => { env = await initializeTestEnvironment({ projectId: 'demo-shrimply-audit-regressions', firestore: { rules: fs.readFileSync(path.join(__dirname, '../firestore.rules'), 'utf8') } }); });
after(async () => env?.cleanup());
beforeEach(async () => { await env.clearFirestore(); await env.withSecurityRulesDisabled(async ctx => {
  const db = ctx.firestore(); await setDoc(doc(db, 'users/tech'), { email: 'tech@example.invalid', role: 'technician', companyId: 'farm' });
  await setDoc(doc(db, 'users/owner'), { email: 'owner@example.invalid', role: 'owner', companyId: 'farm' });
  await setDoc(doc(db, 'companies/farm'), { ownerId: 'owner', teamMembers: ['tech', 'owner'] });
  await setDoc(doc(db, 'companies/farm/expenses/private'), { amount: 100 });
}); });
test('self-profile additions and deletes cannot change authorization; ordinary profile edits work', async () => {
  const db = env.authenticatedContext('tech').firestore(), user = doc(db, 'users/tech');
  await assertSucceeds(updateDoc(user, { name: 'Technician' }));
  await assertFails(updateDoc(user, { permissionOverrides: { viewFinance: true, manageTeam: true } }));
  await assertFails(updateDoc(user, { role: deleteField() }));
  await assertFails(updateDoc(user, { companyId: deleteField() }));
  await assertFails(getDoc(doc(db, 'companies/farm/expenses/private')));
});
test('new profiles cannot preseed overrides or company membership', async () => {
  const db = env.authenticatedContext('new').firestore(), ref = doc(db, 'users/new');
  await assertFails(setDoc(ref, { email: 'new@example.invalid', role: 'owner', companyId: 'farm' }));
  await assertFails(setDoc(ref, { email: 'new@example.invalid', permissionOverrides: { viewFinance: true } }));
  await assertSucceeds(setDoc(ref, { email: 'new@example.invalid', role: null, companyId: null }));
});
test('unrelated users can increment views but cannot strip listing fields', async () => {
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'marketplace_listings/listing'), { companyId: 'farm', userId: 'owner', createdBy: 'owner', viewCount: 0, status: 'active', contactPhone: '123' }));
  const ref = doc(env.authenticatedContext('outsider').firestore(), 'marketplace_listings/listing');
  await assertSucceeds(updateDoc(ref, { viewCount: 1 }));
  await assertFails(updateDoc(ref, { viewCount: 2, companyId: deleteField(), status: deleteField() }));
});
test('private reports stay company scoped; public projections are readable but server owned', async () => {
  await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), 'diseaseReports/r'), { companyId: 'farm', symptoms: 'private' }); await setDoc(doc(ctx.firestore(), 'publicDiseaseAlerts/r'), { diseaseType: 'test' }); });
  const outsider = env.authenticatedContext('buyer').firestore();
  await assertFails(getDoc(doc(outsider, 'diseaseReports/r')));
  await assertSucceeds(getDoc(doc(env.authenticatedContext('tech').firestore(), 'diseaseReports/r')));
  await assertSucceeds(getDoc(doc(outsider, 'publicDiseaseAlerts/r')));
  await assertFails(setDoc(doc(outsider, 'publicDiseaseAlerts/r'), { companyName: 'private' }));
});
test('an operator cannot change or void a harvest independently of its revenue', async () => {
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore(), entry = { id: 'sync_HARVEST-h', reference: 'HARVEST-h', amount: 50, date: '2026-09-11', voided: false };
    await setDoc(doc(db, 'companies/farm/harvestRecords/h'), { id: 'h', ponds: [{ biomass: 10, price: 5 }], date: entry.date, financeEntry: entry });
    await setDoc(doc(db, 'companies/farm/revenues/sync_HARVEST-h'), { ...entry, companyId: 'farm', sourceKind: 'harvest', sourceId: 'h' });
  });
  const ref = doc(env.authenticatedContext('tech').firestore(), 'companies/farm/harvestRecords/h');
  await assertFails(updateDoc(ref, { ponds: [{ biomass: 100, price: 10 }] }));
  await assertFails(updateDoc(ref, { voided: true }));
});
