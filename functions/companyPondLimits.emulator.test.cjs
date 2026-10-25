const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, setDoc, updateDoc, deleteDoc, deleteField, writeBatch } = require('firebase/firestore');

test('company-wide pond limits, cycle references and lifetime grants', { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async () => {
  const projectId = 'demo-shrimply-pond-guard-audit';
  process.env.GCLOUD_PROJECT = projectId;
  process.env.NODE_ENV = 'test';
  const { initializeApp, deleteApp } = require('node:module').createRequire(require.resolve('./firebaseAdmin'))('firebase-admin/app');
  const app = initializeApp({ projectId });
  const admin = require('./firebaseAdmin');
  for (const uid of ['owner', 'manager', 'outsider']) {
    try { await admin.auth().createUser({ uid }); }
    catch (error) { if (error.code !== 'auth/uid-already-exists') throw error; }
  }
  const { createCompanyPhysicalPond, getCompanyBillingSummary, createMidtransPlanPayment, scheduleCompanyPlanChange, trackPhysicalPondDeletion, midtransBillingWebhook, expireCompanyPlans } = require('./billing');
  const { buildEntitlements } = require('./shared/companyPlans');
  const env = await initializeTestEnvironment({ projectId, firestore: { rules: fs.readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8') } });
  try {
    await env.clearFirestore();
    const db = admin.firestore();
    const seed = async (companyId, planId, count) => {
      const batch = db.batch();
      batch.set(db.doc(`companies/${companyId}`), { ownerId: 'owner', teamMembers: ['owner', 'manager'], createdAt: new Date('2026-09-09') });
      for (const uid of ['owner', 'manager']) batch.set(db.doc(`users/${uid}`), { companyId, role: uid, permissionOverrides: { managePonds: true } });
      batch.set(db.doc(`companies/${companyId}/entitlements/current`), buildEntitlements(planId));
      batch.set(db.doc(`companies/${companyId}/planUsage/current`), { physicalPondCount: count });
      for (let i = 0; i < count; i++) batch.set(db.doc(`companies/${companyId}/physicalPonds/seed-${i}`), { pondName: `Seed ${i}`, pondArea: 100, createdBy: 'owner', status: 'idle' });
      await batch.commit();
    };
    const request = (companyId, data = {}, uid = 'owner') => ({ auth: { uid, token: {} }, data: { companyId, ...data } });
    const add = (companyId, id, uid = 'owner') => createCompanyPhysicalPond.run(request(companyId, { pondId: id, pond: { pondName: id, pondArea: 100 } }, uid));
    for (const [planId, limit] of [['free', 10], ['plus', 30], ['pro', 100]]) {
      await seed(planId, planId, limit - 1);
      const results = await Promise.allSettled([add(planId, 'last-owner'), add(planId, 'last-manager', 'manager')]);
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
      assert.equal(results.find(r => r.status === 'rejected').reason.code, 'resource-exhausted');
      assert.equal((await db.collection(`companies/${planId}/physicalPonds`).count().get()).data().count, limit);
      const winner = results.find(r => r.status === 'fulfilled').value.id;
      assert.equal((await add(planId, winner, winner === 'last-owner' ? 'owner' : 'manager')).created, false);
    }
    await seed('guard', 'free', 10);
    const client = env.authenticatedContext('owner').firestore();
    const cycle = { pondName: 'Seed 0', pondArea: 100, cycleStatus: 'active', initialPopulation: 10000, docStart: '2026-09-10' };
    await assertFails(setDoc(doc(client, 'companies/guard/physicalPonds/extra'), { pondName: 'Extra', pondArea: 100 }));
    for (const physicalPondId of [undefined, null, 'nonexistent', '../foreign']) {
      await assertFails(setDoc(doc(client, 'companies/guard/ponds/bypass'), { ...cycle, ...(physicalPondId === undefined ? {} : { physicalPondId }) }));
    }
    await db.doc('companies/other/physicalPonds/foreign').set({ pondName: 'Seed 0' });
    await assertFails(setDoc(doc(client, 'companies/guard/ponds/bypass'), { ...cycle, physicalPondId: 'foreign' }));
    const start = (id, extra = {}) => {
      const batch = writeBatch(client);
      batch.set(doc(client, `companies/guard/ponds/${id}`), { ...cycle, physicalPondId: 'seed-0', ...extra });
      batch.update(doc(client, 'companies/guard/physicalPonds/seed-0'), { status: 'active', activePondId: id });
      return batch.commit();
    };
    await assertFails(start('renamed', { pondName: 'Uncounted extra pond' }));
    await assertSucceeds(start('cycle-1'));
    await assertFails(start('concurrent-cycle'));
    await assertFails(updateDoc(doc(client, 'companies/guard/ponds/cycle-1'), { physicalPondId: deleteField() }));
    await assertFails(updateDoc(doc(client, 'companies/guard/ponds/cycle-1'), { physicalPondId: 'seed-1' }));
    await assertFails(deleteDoc(doc(client, 'companies/guard/physicalPonds/seed-0')));
    await assertFails(updateDoc(doc(client, 'companies/guard/physicalPonds/seed-0'), { status: 'idle', activePondId: null }));
    const end = writeBatch(client);
    end.update(doc(client, 'companies/guard/ponds/cycle-1'), { cycleStatus: 'ended' });
    end.update(doc(client, 'companies/guard/physicalPonds/seed-0'), { status: 'idle', activePondId: null });
    await assertSucceeds(end.commit());
    await assertSucceeds(start('cycle-2'));
    await db.doc('companies/guard/ponds/legacy').set({ ...cycle });
    await assertSucceeds(updateDoc(doc(client, 'companies/guard/ponds/legacy'), { samplings: [{ mbw: 2, feed: 0 }] }));
    await assertFails(setDoc(doc(client, 'companies/guard/subscriptionGrants/current'), { kind: 'lifetime', status: 'active' }));
    await assertFails(add('guard', 'outsider', 'outsider'));
    await db.doc('companies/guard/physicalPonds/seed-9').delete();
    const deletion = { id: 'replayed-deletion', params: { companyId: 'guard', pondId: 'seed-9' } };
    await trackPhysicalPondDeletion.run(deletion);
    await trackPhysicalPondDeletion.run(deletion);
    assert.equal((await db.doc('companies/guard/planUsage/current').get()).data().physicalPondCount, 9);
    await add('guard', 'replacement-tenth');
    await assert.rejects(add('guard', 'over-limit'), { code: 'resource-exhausted' });
    await seed('complimentary', 'free', 10);
    await db.doc('companies/complimentary/accessOverrides/current').set({ planId: 'pro', status: 'active', startsAt: new Date(Date.now() - 1000).toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString(), revision: 1 });
    await assertSucceeds(add('complimentary', 'trial-eleventh'));
    assert.equal((await getCompanyBillingSummary.run(request('complimentary'))).entitlements.pondLimit, 100);
    await db.doc('companies/complimentary/accessOverrides/current').update({ expiresAt: new Date(Date.now() - 1000).toISOString() });
    await assert.rejects(add('complimentary', 'expired-twelfth'), { code: 'resource-exhausted' });
    assert.equal((await db.doc('companies/complimentary/entitlements/current').get()).data().planId, 'free');
    await seed('guard', 'free', 10);
    await db.doc('companies/guard/subscriptionGrants/current').set({ kind: 'lifetime', status: 'active' });
    await assertSucceeds(add('guard', 'lifetime-eleventh'));
    const summary = await getCompanyBillingSummary.run(request('guard'));
    assert.equal(summary.entitlements.planId, 'lifetime');
    assert.equal(summary.entitlements.orson.monthlyTotal, null);
    await assert.rejects(createMidtransPlanPayment.run(request('guard', { planId: 'plus', interval: 'monthly' })), { code: 'failed-precondition' });
    await assert.rejects(scheduleCompanyPlanChange.run(request('guard', { planId: 'free' })), { code: 'failed-precondition' });
    const { reserveServerOrsonRequest } = require('./orson').__test;
    const dateKey = new Date().toISOString().slice(0, 10);
    await db.doc(`companies/guard/orsonUsage/${dateKey}`).set({ functions: { chat: 10000, projection: 5000, total: 15000 } });
    await db.doc(`companies/guard/orsonUsageMonthly/${dateKey.slice(0, 7)}`).set({ total: 20000 });
    const usage = await reserveServerOrsonRequest(db, 'guard', 'chat', 'UTC');
    assert.equal(usage.limit, null);
    assert.equal(usage.remaining, null);
    assert.equal(usage.monthlyUsed, 20001);
    // A checkout created before the gift can settle later. Keep the gift, record
    // the payment honestly and flag a refund review rather than activating a paid plan.
    await db.doc('billingOrders/old-order').set({ companyId: 'guard', ownerId: 'owner', planId: 'plus', interval: 'monthly', amount: 150000, environment: 'sandbox' });
    const oldKey = process.env.MIDTRANS_SERVER_KEY;
    process.env.MIDTRANS_SERVER_KEY = 'emulator-only-key';
    const notification = { order_id: 'old-order', status_code: '200', gross_amount: '150000.00' };
    notification.signature_key = require('node:crypto').createHash('sha512').update('old-order200150000.00emulator-only-key').digest('hex');
    const oldFetch = global.fetch;
    global.fetch = async () => ({ ok: true, json: async () => ({ ...notification, transaction_status: 'settlement', currency: 'IDR' }) });
    let responseCode;
    const response = { status: code => { responseCode = code; return response; }, json: () => {}, send: () => {} };
    try { await midtransBillingWebhook({ method: 'POST', body: notification }, response); }
    finally { global.fetch = oldFetch; if (oldKey === undefined) delete process.env.MIDTRANS_SERVER_KEY; else process.env.MIDTRANS_SERVER_KEY = oldKey; }
    assert.equal(responseCode, 200);
    const payment = (await db.doc('companies/guard/billingPayments/old-order').get()).data();
    assert.equal(payment.requiresRefundReview, true);
    assert.equal(payment.activatedAt, undefined);
    await db.doc('companies/guard/entitlements/current').set({ ...buildEntitlements('pro'), status: 'active', graceUntil: new Date('2000-01-01') });
    await expireCompanyPlans.run({});
    assert.equal((await getCompanyBillingSummary.run(request('guard'))).entitlements.planId, 'lifetime');

    // New documents cannot gain legacy benefits by supplying an old client date.
    await seed('backdated', 'free', 0);
    await db.doc('companies/backdated/entitlements/current').delete();
    await db.doc('companies/backdated').update({ createdAt: new Date('2000-01-01') });
    assert.equal((await getCompanyBillingSummary.run(request('backdated'))).entitlements.planId, 'free');

    await seed('enterprise', 'free', 0);
    await db.doc('companies/enterprise').update({ businessSize: 'enterprise' });
    await db.doc('users/manager').update({ role: 'technician' });
    await db.doc('companies/enterprise/blocks/assigned').set({ assignedTechnicianId: 'manager' });
    await db.doc('companies/enterprise/blocks/other').set({ assignedTechnicianId: 'someone-else' });
    const technicianAdd = blockId => createCompanyPhysicalPond.run(request('enterprise', { pondId: 'technician-pond', pond: { pondName: 'Technician pond', pondArea: 100, blockId } }, 'manager'));
    await assert.rejects(technicianAdd('other'), { code: 'permission-denied' });
    await assert.rejects(technicianAdd(undefined), { code: 'permission-denied' });
    await technicianAdd('assigned');
  } finally { await env.cleanup(); await deleteApp(app); }
});
