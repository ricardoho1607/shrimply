const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test, before, after, beforeEach, mock } = require('node:test');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, setDoc, updateDoc, deleteDoc, deleteField } = require('firebase/firestore');
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { createSopService } = require('./sop/service');

const projectId = 'demo-shrimply-security-boundaries';
let env, app, db, handlers;
before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Run against the local Firestore emulator');
  process.env.GCLOUD_PROJECT = projectId;
  app = initializeApp({ projectId });
  const admin = require('./firebaseAdmin');
  db = admin.firestore();
  // Isolate these tests to company authorization; no live Auth service is used.
  mock.method(admin, 'auth', () => ({ getUser: async uid => ({ uid, disabled: false }) }));
  handlers = require('./teamAccess');
  env = await initializeTestEnvironment({ projectId, firestore: {
    rules: fs.readFileSync(path.join(__dirname, '../firestore.rules'), 'utf8'),
  } });
});
after(async () => { mock.restoreAll(); await env?.cleanup(); if (app) await deleteApp(app); });
beforeEach(async () => {
  await env.clearFirestore();
  await db.doc('companies/farm').set({ ownerId: 'owner', teamMembers: ['owner', 'coowner', 'third', 'tech'],
    companyName: 'Farm', farmType: 'shrimp', primaryLocation: 'Farm A' });
  for (const [uid, role] of [['owner', 'owner'], ['coowner', 'co-owner'], ['third', 'co-owner'], ['tech', 'technician']]) {
    await db.doc(`users/${uid}`).set({ email: `${uid}@example.invalid`, companyId: 'farm', role });
  }
});
const call = (name, uid = 'owner', companyId = 'farm') => handlers[name].run({
  auth: { uid, token: { email_verified: true } }, data: { companyId },
});

test('new companies cannot preseed foreign members or approval state', async () => {
  await db.doc('users/new').set({ email: 'new@example.invalid', companyId: null });
  const client = env.authenticatedContext('new').firestore();
  const payload = { ownerId: 'new', teamMembers: ['new'], companyName: 'New farm', farmType: 'shrimp', primaryLocation: 'A' };
  await assertFails(setDoc(doc(client, 'companies/injected'), { ...payload, teamMembers: ['new', 'tech'] }));
  await assertFails(setDoc(doc(client, 'companies/forged'), { ...payload, deletionRequest: { status: 'pending' } }));
  await assertSucceeds(setDoc(doc(client, 'companies/new'), payload));
});

test('company deletion preserves foreign, missing, and already-moved users', async () => {
  await db.doc('companies/attacker').set({ ownerId: 'attacker', teamMembers: ['attacker', 'tech', 'missing'] });
  await db.doc('users/attacker').set({ companyId: 'attacker', role: 'owner' });
  await db.doc('users/moved').set({ companyId: 'other', role: 'manager' });
  await db.doc('companies/attacker').update({ teamMembers: ['attacker', 'tech', 'missing', 'moved'] });
  const victim = (await db.doc('users/tech').get()).data();
  assert.equal((await call('requestCompanyDeletion', 'attacker', 'attacker')).status, 'deleted');
  assert.deepEqual((await db.doc('users/tech').get()).data(), victim);
  assert.equal((await db.doc('users/moved').get()).data().companyId, 'other');
  assert.equal((await db.doc('users/missing').get()).exists, false);
  assert.equal((await db.doc('users/attacker').get()).data().companyId, null);
});

test('legacy forged visible approvals cannot authorize deletion', async () => {
  await db.doc('companies/farm').update({ deletionRequest: {
    status: 'pending', requiredApproverIds: ['coowner'], approvedByIds: [],
  } });
  await assert.rejects(call('approveCompanyDeletion', 'coowner'), { code: 'failed-precondition' });
  assert.equal((await db.doc('companies/farm').get()).exists, true);
  // Existing screens expose cancel, but hide the new-request button while pending.
  assert.equal((await call('cancelCompanyDeletion', 'coowner')).status, 'cancelled');
  assert.equal((await db.doc('companies/farm').get()).data().deletionRequest.status, 'cancelled');
  // A real request starts fresh without trusting the old approval list.
  assert.equal((await call('requestCompanyDeletion', 'coowner')).totalRequired, 3);
});

test('private approval state requires every current owner and preserves normal deletion', async () => {
  await db.doc('companies/farm/ponds/record').set({ name: 'Farm record' });
  const requested = await call('requestCompanyDeletion', 'coowner');
  assert.equal(requested.status, 'pending');
  assert.equal(requested.totalRequired, 3);
  await db.doc('companies/farm').update({ deletionRequest: { status: 'pending', requiredApproverIds: ['owner'], approvedByIds: [] } });
  assert.equal((await call('approveCompanyDeletion', 'owner')).status, 'pending');
  assert.equal((await db.doc('companies/farm/ponds/record').get()).exists, true);
  assert.equal((await call('approveCompanyDeletion', 'third')).status, 'deleted');
  assert.equal((await db.doc('companies/farm/ponds/record').get()).exists, false);
  assert.equal((await db.doc('users/tech').get()).data().companyId, null);
});

test('approval recomputes membership and cancellation invalidates the private request', async () => {
  await call('requestCompanyDeletion', 'owner');
  await db.doc('users/new-coowner').set({ companyId: 'farm', role: 'co-owner' });
  await db.doc('companies/farm').update({ teamMembers: ['owner', 'coowner', 'third', 'new-coowner'] });
  assert.equal((await call('approveCompanyDeletion', 'coowner')).totalRequired, 4);
  assert.equal((await call('cancelCompanyDeletion', 'third')).success, true);
  await assert.rejects(call('approveCompanyDeletion', 'new-coowner'), { code: 'failed-precondition' });
  assert.equal((await db.doc('companies/farm').get()).exists, true);
});

test('clients cannot edit approval state or directly delete the company; settings still work', async () => {
  const client = env.authenticatedContext('coowner').firestore();
  const ref = doc(client, 'companies/farm');
  await assertFails(updateDoc(ref, { deletionRequest: { status: 'pending' } }));
  await assertFails(setDoc(doc(client, 'companies/farm/deletionRequests/current'), { status: 'approved' }));
  await assertFails(deleteDoc(doc(env.authenticatedContext('owner').firestore(), 'companies/farm')));
  await assertSucceeds(updateDoc(ref, { companyName: 'Renamed Farm' }));
  await call('requestCompanyDeletion', 'owner');
  await assertSucceeds(updateDoc(ref, { companyName: 'Renamed with pending request' }));
  await assertFails(updateDoc(ref, { deletionRequest: deleteField() }));
});

test('asset manager cannot reparent or remove tenant identity; same-company updates work', async () => {
  await db.doc('assets/asset').set({ companyId: 'farm', name: 'Pump' });
  const client = env.authenticatedContext('tech').firestore();
  const ref = doc(client, 'assets/asset');
  await assertFails(updateDoc(ref, { companyId: 'foreign' }));
  await assertFails(updateDoc(ref, { companyId: deleteField() }));
  await assertFails(setDoc(ref, { companyId: 'foreign', name: 'Injected' }));
  await assertSucceeds(updateDoc(ref, { name: 'Maintained Pump', currentHolder: 'tech' }));
});

test('only platform moderators can unlist, while own withdrawal and reporting remain allowed', async () => {
  const service = createSopService(db);
  await db.doc('communitySops/foreign').set({ companyId: 'other', status: 'published' });
  await db.doc('communitySops/own').set({ companyId: 'farm', status: 'published' });
  const command = (action, publicationId, extra = {}) => service.command('owner', {
    companyId: 'farm', operationId: `${action}-${publicationId}-${extra.platformAdmin || false}`,
    action, publicationId, reason: 'Review', ...extra,
  });
  await assert.rejects(command('unlist', 'foreign'), { code: 'permission-denied' });
  await assert.rejects(command('unlist', 'own'), { code: 'permission-denied' });
  await assert.rejects(command('withdraw', 'foreign'), { code: 'permission-denied' });
  await command('report', 'foreign');
  await command('withdraw', 'own');
  await command('unlist', 'foreign', { platformAdmin: true });
  assert.equal((await db.doc('communitySops/foreign').get()).data().status, 'unlisted');
  assert.equal((await db.doc('communitySops/own').get()).data().status, 'withdrawn');
});
