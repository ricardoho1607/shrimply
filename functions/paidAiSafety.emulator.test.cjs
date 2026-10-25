const assert = require('node:assert/strict');
const { test, before, after, beforeEach, mock } = require('node:test');
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const projectId = 'demo-shrimply-ai-safety';
let app, db, env, verified = true, unverifiedActor = null, providerCalls = 0, assist, clock;
const originalNow = Date.now;
before(async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST || '', /^(127\.0\.0\.1|localhost):/);
  process.env.GCLOUD_PROJECT = projectId;
  process.env.MODEL_API_KEY = 'local-provider-stub';
  process.env.GEMINI_API_KEY = 'local-provider-stub';
  app = initializeApp({ projectId }); db = getFirestore(app);
  const admin = require('./firebaseAdmin');
  mock.method(admin, 'auth', () => ({ getUser: async uid => ({ uid, emailVerified: verified && uid !== unverifiedActor, disabled: false }) }));
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  mock.method(GoogleGenerativeAI.prototype, 'getGenerativeModel', () => ({ generateContent: async () => {
    providerCalls++; return { response: { text: () => '{}' } };
  } }));
  mock.method(Date, 'now', () => clock);
  const model = require('./sop/model');
  mock.method(model, 'generateSopJson', async () => { providerCalls++; throw new Error('local model stub'); });
  assist = require('./sop/ai').assistSop;
  env = await initializeTestEnvironment({ projectId });
});
after(async () => { mock.restoreAll(); await env?.cleanup(); await deleteApp(app); });
beforeEach(async () => {
  await env.clearFirestore(); verified = true; unverifiedActor = null; providerCalls = 0; clock = originalNow();
  process.env.AI_USER_DAILY_SAFETY_LIMIT = '2';
  process.env.AI_USER_30_DAY_SAFETY_LIMIT = '3';
  delete process.env.AI_GENERATION_PAUSED;
  await db.doc('users/owner').set({ companyId: 'a', role: 'owner' });
  for (const id of ['a', 'b']) await db.doc(`companies/${id}`).set({ ownerId: 'owner', teamMembers: ['owner'] });
});
const reserve = (companyId = 'a') => require('./shared/paidAiSafety').reservePaidAiRequest(db, 'owner', companyId);

test('shared account budget survives company switching and is atomic under concurrency', async () => {
  const results = await Promise.allSettled([reserve(), reserve(), reserve(), reserve()]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 2);
  for (const r of results.filter(r => r.status === 'rejected')) assert.equal(r.reason.code, 'resource-exhausted');
  await db.doc('users/owner').update({ companyId: 'b' });
  await assert.rejects(reserve('b'), { code: 'resource-exhausted' });
});
test('thirty-day budget survives a daily reset; old unbound companies cannot use AI', async () => {
  await assert.rejects(reserve('b'), { code: 'permission-denied' });
  await reserve(); await reserve(); clock += 86400001;
  await reserve();
  await assert.rejects(reserve(), { code: 'resource-exhausted' });
});
test('unverified accounts, emergency pause, and invalid configuration fail closed', async () => {
  verified = false; await assert.rejects(reserve(), { code: 'permission-denied' });
  verified = true; process.env.AI_GENERATION_PAUSED = 'true';
  await assert.rejects(reserve(), { code: 'unavailable' });
  delete process.env.AI_GENERATION_PAUSED;
  process.env.AI_USER_DAILY_SAFETY_LIMIT = 'invalid';
  await assert.rejects(reserve(), { code: 'failed-precondition' });
  assert.equal((await db.collection('securityRateLimits').get()).size, 0);
});
test('SOP draft uses the shared budget before model dispatch; cached translation remains free', async () => {
  process.env.AI_USER_DAILY_SAFETY_LIMIT = '1';
  const request = data => ({ auth: { uid: 'owner', token: { email_verified: true } }, data: { companyId: 'a', ...data } });
  await assert.rejects(assist.run(request({ mode: 'draft', text: 'Farm observation procedure' })), /local model stub/);
  await assert.rejects(assist.run(request({ mode: 'draft', text: 'Another procedure' })), { code: 'resource-exhausted' });
  assert.equal(providerCalls, 1);
  const { hash } = require('./sop/evidence');
  await db.doc('companies/a/sops/sop').set({ revision: 1 });
  const cache = { language: 'id', translation: 'cached result' };
  await db.doc(`companies/a/sopTranslations/${hash(['sop', 1, 'id', 'document-v2'])}`).set(cache);
  assert.deepEqual(await assist.run(request({ mode: 'translate', sopId: 'sop', language: 'id' })), cache);
  assert.equal(providerCalls, 1);
});

test('lab trigger checks its writer rather than borrowing the verified owner identity', async () => {
  await db.doc('users/tech').set({ companyId: 'a', role: 'technician' });
  await db.doc('companies/a').update({ teamMembers: ['owner', 'tech'] });
  await db.doc('companies/a/ponds/p').set({ pondName: 'P1', pondArea: 1000 });
  const { createManualLabUnits } = require('./shared/labMeasurementContract');
  const processReport = async (id, confirmedBy) => {
    const ref = db.doc(`companies/a/labReports/${id}`);
    await ref.set({ companyId: 'a', status: 'confirmed', confirmedBy, sampleDate: '2026-10-25',
      pondResults: [{ pondId: 'p', pondCode: 'P1', waterQuality: { nh4: 0 }, measurementUnits: createManualLabUnits() }] });
    await require('./orson').processConfirmedLabReport.run({ params: { companyId: 'a', labReportId: id }, data: { after: await ref.get() } });
    return (await ref.get()).data();
  };
  unverifiedActor = 'tech';
  assert.equal((await processReport('unverified', 'tech')).insights.generatedBy, 'deterministic_fallback');
  assert.equal(providerCalls, 0);
  assert.equal((await processReport('verified', 'owner')).insights.generatedBy, 'gemini');
  assert.equal(providerCalls, 1);
  assert.equal((await processReport('legacy', null)).insights.generatedBy, 'deterministic_fallback');
  assert.equal(providerCalls, 1);
});
