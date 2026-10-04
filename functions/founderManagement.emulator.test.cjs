'use strict';
process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc } = require('firebase/firestore');
const { ref, uploadBytes } = require('firebase/storage');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { mutate, reconcile } = require('./founderManagement');
const { resolveEntitlements, resolveBaseEntitlements, NINETY_DAYS_MS } = require('./shared/companyEntitlements');
const { assertCurrentAccess } = require('./shared/guardedCallable');
const { __test: billing } = require('./billing');
const { __test: orson } = require('./orson');
const { farmDateKey } = require('./farmDate');
const actor = 'fxksp6HpzgVxPwPJHfqiRZp3b482';
const projectId = 'demo-shrimply-founder';
const adminDb = getFirestore(initializeApp({ projectId }, 'founder-management-tests'));
let env;
let identities, auth, now;
test.before(async () => {
  env = await initializeTestEnvironment({ projectId, firestore: { rules: fs.readFileSync(path.join(__dirname, '../firestore.rules'), 'utf8') }, storage: { rules: fs.readFileSync(path.join(__dirname, '../storage.rules'), 'utf8') } });
});
test.after(async () => { await env?.cleanup(); await adminDb.terminate(); });
test.beforeEach(async () => {
  await env.clearFirestore(); await env.clearStorage();
  now = Date.now();
  identities = new Map([['target', { uid: 'target', email: 'target@example.test', disabled: false, customClaims: {}, tokensValidAfterTime: new Date(now - 10000).toISOString() }], [actor, { uid: actor, email: 'ricardofransiskusho@gmail.com', disabled: false, customClaims: { platformOwner: true } }]]);
  auth = {
    async getUser(uid) { if (!identities.has(uid)) throw Object.assign(new Error('Missing identity'), { code: 'auth/user-not-found' }); return { ...identities.get(uid) }; },
    async updateUser(uid, changes) { Object.assign(identities.get(uid), changes); },
    async revokeRefreshTokens(uid) { identities.get(uid).tokensValidAfterTime = new Date(now).toISOString(); },
    async deleteUser(uid) { identities.delete(uid); },
  };
  await adminDb.doc('companies/farm').set({ companyName: 'Test farm', ownerId: 'target', teamMembers: ['target'], createdAt: new Date(now), timeZone: 'UTC' });
  await adminDb.doc('users/target').set({ email: 'target@example.test', name: 'Target', role: 'owner', companyId: 'farm' });
  await adminDb.doc('companies/farm/entitlements/current').set({ planId: 'free', status: 'free' });
});
const change = (route, body, issues = []) => mutate(adminDb, auth, actor, route, { operationId: randomUUID(), ...body }, issues, now);
const access = (body = {}) => ({ expectedRevision: 0, expectedDisabled: false, action: 'disable', reason: 'Review account access', ...body });
const grant = (body = {}) => ({ expectedRevision: 0, planId: 'pro', expiresAt: new Date(now + 30 * 86400000).toISOString(), reason: 'Customer trial access', ...body });

test('permanent deletion removes account/profile/membership, retains farm records and blocks cached tokens', async () => {
  await adminDb.doc('companies/farm').update({ ownerId: 'another-owner', teamMembers: ['target', 'another-owner'] });
  await adminDb.doc('users/target').update({ role: 'technician' });
  await adminDb.doc('users/target/private/preferences').set({ personal: true });
  await adminDb.doc('companies/farm/ponds/pond').set({ name: 'Keep farm history' });
  await adminDb.doc('joinRequests/request').set({ userId: 'target' });
  const body = { operationId: randomUUID(), ...access(), confirmation: 'target@example.test' };
  await change('/users/target/delete', body);
  await change('/users/target/delete', body);
  assert.equal(identities.has('target'), false);
  assert.deepEqual((await adminDb.doc('users/target').get()).data(), { founderAccessSuspended: true, founderAccountDeleted: true });
  assert.equal((await adminDb.doc('users/target/private/preferences').get()).exists, false);
  assert.equal((await adminDb.doc('joinRequests/request').get()).exists, false);
  assert.deepEqual((await adminDb.doc('companies/farm').get()).data().teamMembers, ['another-owner']);
  assert.equal((await adminDb.doc('companies/farm/ponds/pond').get()).exists, true);
  assert.equal((await adminDb.collection('founderAudit').get()).size, 1);
  await assertFails(getDoc(doc(env.authenticatedContext('target', { auth_time: Math.floor(now / 1000) }).firestore(), 'companies/farm')));
});

test('deletion rejects wrong confirmation, owners, founders and stale revisions before deleting Auth', async () => {
  await assert.rejects(change('/users/target/delete', { ...access(), confirmation: 'wrong@example.test' }), error => error.status === 400);
  await assert.rejects(change('/users/target/delete', { ...access(), confirmation: 'target@example.test' }), error => error.status === 409);
  await assert.rejects(change(`/users/${actor}/delete`, { ...access(), confirmation: 'ricardofransiskusho@gmail.com' }), error => error.status === 403);
  await assert.rejects(change('/users/target/delete', { ...access({ expectedRevision: 1 }), confirmation: 'target@example.test' }), error => error.status === 409);
  assert.equal(identities.has('target'), true);
  assert.equal((await adminDb.collection('founderOperations').get()).size, 0);
});

test('deletion reconciles cleanup failure after Auth removal and keeps one audit receipt', async () => {
  await adminDb.doc('companies/farm').update({ ownerId: 'another-owner' });
  await adminDb.doc('users/target').update({ role: 'technician' });
  const body = { operationId: randomUUID(), ...access(), confirmation: 'target@example.test' };
  const original = auth.deleteUser;
  auth.deleteUser = async uid => { await original(uid); throw Object.assign(new Error('Interrupted after deletion'), { code: 'network' }); };
  await assert.rejects(change('/users/target/delete', body), error => error.status === 503);
  assert.equal(identities.has('target'), false);
  assert.equal((await adminDb.doc('users/target').get()).data().founderAccessSuspended, true);
  await reconcile(adminDb, auth);
  assert.equal((await adminDb.doc(`founderOperations/${body.operationId}`).get()).data().status, 'completed');
  assert.equal((await adminDb.collection('founderAudit').get()).size, 1);
});

test('concurrent duplicate notes create exactly one note and durable audit', async () => {
  const body = { operationId: randomUUID(), text: 'Follow up on onboarding.' };
  await Promise.all([change('/companies/farm/notes', body), change('/companies/farm/notes', body)]);
  assert.equal((await adminDb.collection('companies/farm/founderNotes').get()).size, 1);
  assert.equal((await adminDb.collection('founderAudit').get()).size, 1);
  await assert.rejects(change('/companies/farm/notes', { ...body, text: 'Changed payload here.' }), error => error.status === 409);
});

test('grant, stale revision rejection and revoke preserve base entitlement and payments', async () => {
  const before = (await adminDb.doc('companies/farm/entitlements/current').get()).data();
  const body = { operationId: randomUUID(), ...grant() };
  await change('/companies/farm/access-override', body);
  await change('/companies/farm/access-override', body);
  const override = (await adminDb.doc('companies/farm/accessOverrides/current').get()).data();
  assert.equal(override.revision, 1);
  assert.equal(resolveEntitlements(before, {}, now, null, override).planId, 'pro');
  assert.equal(resolveEntitlements(before, {}, Date.parse(override.expiresAt), null, override).planId, 'free');
  await assert.rejects(change('/companies/farm/access-override', grant()), error => error.status === 409);
  await change('/companies/farm/access-override/revoke', { expectedRevision: 1, reason: 'Trial has concluded' });
  assert.deepEqual((await adminDb.doc('companies/farm/entitlements/current').get()).data(), before);
  assert.equal((await adminDb.collection('companies/farm/billingPayments').get()).size, 0);
  assert.equal(resolveEntitlements(before, {}, now, null, (await adminDb.doc('companies/farm/accessOverrides/current').get()).data()).planId, 'free');
});

test('90-day limit, expired grants and lifetime protections are enforced on the server', async () => {
  await assert.rejects(change('/companies/farm/access-override', grant({ expiresAt: new Date(now + NINETY_DAYS_MS + 1).toISOString() })), error => error.status === 400);
  await assert.rejects(change('/companies/farm/access-override', grant({ expiresAt: new Date(now - 1).toISOString() })), error => error.status === 400);
  await adminDb.doc('companies/farm/subscriptionGrants/current').set({ kind: 'lifetime', status: 'active' });
  await assert.rejects(change('/companies/farm/access-override', grant()), error => error.status === 409);
  const result = resolveEntitlements(null, {}, now, { kind: 'lifetime', status: 'active' }, { status: 'active', planId: 'pro', startsAt: new Date(now - 1000), expiresAt: new Date(now + 1000) });
  assert.equal(result.planId, 'lifetime'); assert.equal(result.pondLimit, null); assert.equal(result.orson.monthlyTotal, null);
});

test('Plus grant never weakens paid Pro and temporary Pro never destroys paid Plus dates', () => {
  const until = new Date(now + 20 * 86400000);
  const override = { status: 'active', planId: 'plus', startsAt: new Date(now - 1000), expiresAt: until };
  const paid = { planId: 'pro', status: 'active', currentPeriodEnd: until, graceUntil: until };
  const result = resolveEntitlements(paid, {}, now, null, override);
  assert.equal(result.planId, 'pro'); assert.equal(result.pondLimit, 100); assert.equal(result.orson.monthlyTotal, 750); assert.equal(result.currentPeriodEnd, until);
  const upgraded = resolveEntitlements({ ...paid, planId: 'plus' }, {}, now, null, { ...override, planId: 'pro' });
  assert.equal(upgraded.planId, 'pro'); assert.equal(upgraded.currentPeriodEnd, until); assert.equal(upgraded.complimentaryAccess.basePlanId, 'plus');
  assert.equal(resolveBaseEntitlements({ ...paid, planId: 'plus' }, {}, now).planId, 'plus');
});

test('billing summary and server pond/quota resolver use the same grant', async () => {
  await change('/companies/farm/access-override', grant());
  const effective = (await billing.ensureEntitlements(adminDb, 'farm', {}, true)).entitlements;
  const base = (await billing.ensureEntitlements(adminDb, 'farm', {}, false)).entitlements;
  assert.equal(effective.pondLimit, 100); assert.equal(effective.orson.monthlyTotal, 750); assert.equal(base.planId, 'free');
  assert.equal(billing.serializeEntitlements(effective).complimentaryAccess.expiresAt, new Date(now + 30 * 86400000).toISOString());
});

test('attention acknowledgement and snooze persist with revision checks and audit', async () => {
  const issues = [{ id: 'onboarding:farm', companyId: 'farm', source: 'companies/farm/physicalPonds', evidenceAt: null }];
  await change('/attention/onboarding%3Afarm/triage', { expectedRevision: 0, status: 'acknowledged', reason: 'Discussed with customer' }, issues);
  await assert.rejects(change('/attention/onboarding%3Afarm/triage', { expectedRevision: 0, status: 'snoozed', snoozedUntil: new Date(now + 86400000).toISOString(), reason: 'Review tomorrow please' }, issues), error => error.status === 409);
  await change('/attention/onboarding%3Afarm/triage', { expectedRevision: 1, status: 'snoozed', snoozedUntil: new Date(now + 86400000).toISOString(), reason: 'Review tomorrow please' }, issues);
  assert.equal((await adminDb.doc('founderAttention/onboarding:farm').get()).data().revision, 2);
  assert.equal((await adminDb.collection('founderAudit').get()).size, 2);
});

test('Orson reservations consume temporary quotas and expiry/revoke restores base limits without resetting usage', async () => {
  const day = farmDateKey('UTC');
  await adminDb.doc(`companies/farm/orsonUsage/${day}`).set({ functions: { chat: 3, projection: 0, total: 3 } });
  await adminDb.doc(`companies/farm/orsonUsageMonthly/${day.slice(0, 7)}`).set({ total: 60 });
  await assert.rejects(orson.reserveServerOrsonRequest(adminDb, 'farm', 'chat', 'UTC'), error => error.code === 'resource-exhausted');
  await change('/companies/farm/access-override', grant());
  await orson.reserveServerOrsonRequest(adminDb, 'farm', 'chat', 'UTC');
  assert.equal((await adminDb.doc(`companies/farm/orsonUsageMonthly/${day.slice(0, 7)}`).get()).data().total, 61);
  await adminDb.doc('companies/farm/accessOverrides/current').update({ expiresAt: new Date(Date.now() - 1000).toISOString() });
  await assert.rejects(orson.reserveServerOrsonRequest(adminDb, 'farm', 'chat', 'UTC'), error => error.code === 'resource-exhausted');
  await adminDb.doc('companies/farm/accessOverrides/current').update({ expiresAt: new Date(now + 86400000).toISOString() });
  await change('/companies/farm/access-override/revoke', { expectedRevision: 1, reason: 'End the temporary trial' });
  await assert.rejects(orson.reserveServerOrsonRequest(adminDb, 'farm', 'chat', 'UTC'), error => error.code === 'resource-exhausted');
  assert.equal((await adminDb.doc(`companies/farm/orsonUsageMonthly/${day.slice(0, 7)}`).get()).data().total, 61);
});

test('concurrent duplicate access changes cannot repeat external authentication effects', async () => {
  let release;
  const waiting = new Promise(resolve => { release = resolve; });
  const update = auth.updateUser;
  let updates = 0;
  auth.updateUser = async (...args) => { updates++; await waiting; return update(...args); };
  const body = { operationId: randomUUID(), ...access() };
  const first = change('/users/target/access', body);
  while (updates === 0) await new Promise(resolve => setTimeout(resolve, 10));
  await assert.rejects(change('/users/target/access', body), error => error.status === 423);
  release(); await first;
  assert.equal(updates, 1);
  assert.equal((await adminDb.collection('founderAudit').get()).size, 1);
});

test('suspension/restoration revokes sessions, blocks Firestore/Storage/callables and audits once', async () => {
  const oldContext = env.authenticatedContext('target', { auth_time: Math.floor(now / 1000) - 100 });
  const userDb = oldContext.firestore();
  await assertSucceeds(getDoc(doc(userDb, 'companies/farm')));
  const body = { operationId: randomUUID(), ...access() };
  await change('/users/target/access', body);
  await change('/users/target/access', body);
  assert.equal(identities.get('target').disabled, true);
  await assertFails(getDoc(doc(userDb, 'companies/farm')));
  await assertFails(uploadBytes(ref(oldContext.storage(), 'users/target/profile/photo.jpg'), new Uint8Array([1]), { contentType: 'image/jpeg' }));
  await assert.rejects(assertCurrentAccess(auth, adminDb, { auth: { uid: 'target', token: { auth_time: Math.floor(now / 1000) - 100 } } }));
  await change('/users/target/access', access({ action: 'restore', expectedRevision: 1, expectedDisabled: true }));
  assert.equal(identities.get('target').disabled, false);
  await assertFails(getDoc(doc(userDb, 'companies/farm'))); // Old token stays rejected after restore.
  const newContext = env.authenticatedContext('target', { auth_time: Math.floor(now / 1000) + 1 });
  await assertSucceeds(getDoc(doc(newContext.firestore(), 'companies/farm')));
  await assertSucceeds(uploadBytes(ref(newContext.storage(), 'users/target/profile/photo.jpg'), new Uint8Array([1]), { contentType: 'image/jpeg' }));
  assert.equal((await adminDb.collection('founderAudit').get()).size, 2);
  assert.equal((await adminDb.doc('founderUserAccess/target').get()).data().revision, 2);
});

test('authentication failure leaves durable pending guard; retry completes without duplicate audit', async () => {
  const realRevoke = auth.revokeRefreshTokens;
  auth.revokeRefreshTokens = async () => { throw new Error('Transient Auth outage'); };
  const body = { operationId: randomUUID(), ...access() };
  await assert.rejects(change('/users/target/access', body), error => error.status === 503);
  assert.equal((await adminDb.doc('users/target').get()).data().founderAccessSuspended, true);
  assert.equal((await adminDb.doc('founderOperations/' + body.operationId).get()).data().status, 'pending');
  assert.equal((await adminDb.doc('founderAudit/' + body.operationId).get()).data().status, 'pending');
  await assert.rejects(change('/users/target/access', access({ expectedDisabled: true, action: 'restore' })), error => error.status === 423);
  auth.revokeRefreshTokens = realRevoke;
  await reconcile(adminDb, auth);
  assert.equal((await adminDb.doc('founderOperations/' + body.operationId).get()).data().status, 'completed');
  assert.equal((await adminDb.collection('founderAudit').get()).size, 1);
  assert.equal((await adminDb.doc('founderUserAccess/target').get()).data().revision, 1);
});

test('restore failure keeps access blocked even if Authentication is already enabled', async () => {
  await change('/users/target/access', access());
  const revoke = auth.revokeRefreshTokens;
  auth.revokeRefreshTokens = async () => { throw new Error('Revocation failed'); };
  const body = { operationId: randomUUID(), ...access({ action: 'restore', expectedDisabled: true, expectedRevision: 1 }) };
  await assert.rejects(change('/users/target/access', body), error => error.status === 503);
  assert.equal(identities.get('target').disabled, false);
  assert.equal((await adminDb.doc('users/target').get()).data().founderAccessSuspended, true);
  await assert.rejects(assertCurrentAccess(auth, adminDb, { auth: { uid: 'target', token: { auth_time: Math.floor(now / 1000) + 1 } } }));
  auth.revokeRefreshTokens = revoke;
  await change('/users/target/access', body);
  assert.equal((await adminDb.doc('users/target').get()).data().founderAccessSuspended, false);
});

test('founder identities, missing identities and stale expected status fail closed', async () => {
  await assert.rejects(change(`/users/${actor}/access`, access()), error => error.status === 403);
  identities.get('target').customClaims.platformOwner = true;
  await assert.rejects(change('/users/target/access', access()), error => error.status === 403);
  identities.get('target').customClaims = {};
  await assert.rejects(change('/users/target/access', access({ expectedDisabled: true })), error => error.status === 409);
  await assert.rejects(change('/users/missing/access', access()));
  assert.equal((await adminDb.collection('founderOperations').get()).size, 0);
});

test('users cannot create, edit or delete access guard fields or private founder records', async () => {
  const db = env.authenticatedContext('target').firestore();
  await assertFails(updateDoc(doc(db, 'users/target'), { founderAccessSuspended: false }));
  await assertFails(updateDoc(doc(db, 'users/target'), { founderSessionValidAfter: -1 }));
  await assertFails(setDoc(doc(env.authenticatedContext('new').firestore(), 'users/new'), { email: 'new@example.test', founderAccessSuspended: false }));
  for (const route of ['founderAudit/x', 'founderOperations/x', 'founderAttention/x', 'founderUserAccess/target', 'companies/farm/accessOverrides/current', 'companies/farm/founderNotes/x']) {
    await assertFails(getDoc(doc(db, route)));
    await assertFails(setDoc(doc(db, route), { status: 'active' }));
  }
});
