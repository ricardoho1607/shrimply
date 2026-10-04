'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { farmRecords, responseFor, overview, paidPayment } = require('./founderDashboardData');
const { __test: { assertFounder } } = require('./founderDashboard');

test('management API and recovery job explicitly use the Firebase Admin runtime identity', () => {
  const functions = require('./founderDashboard');
  for (const name of ['founderDashboardApi', 'reconcileFounderAccess']) {
    assert.equal(functions[name].__endpoint.serviceAccountEmail, 'firebase-adminsdk-fbsvc@investashrimp-5d9e5.iam.gserviceaccount.com');
  }
});

test('fresh owner claims are required even when token claims were previously valid', async () => {
  const auth = { verifyIdToken: async (_, revoked) => { assert.equal(revoked, true); return { uid: 'fxksp6HpzgVxPwPJHfqiRZp3b482', platformOwner: true }; }, getUser: async uid => ({ uid, email: 'ricardofransiskusho@gmail.com', disabled: false, customClaims: {} }) };
  await assert.rejects(assertFounder(auth, 'Bearer token'), error => error.status === 403);
  auth.getUser = async uid => ({ uid, email: 'ricardofransiskusho@gmail.com', disabled: false, customClaims: { platformOwner: true } });
  await assertFounder(auth, 'Bearer token');
  await assert.rejects(assertFounder(auth, ''), error => error.status === 401);
});

test('sampling feed alone and baseline estimates are not feeding activity', () => {
  const records = farmRecords([{ id: 'pond', companyId: 'company', samplings: [
    { id: 'sample', date: '2026-10-02', mbw: 3, feed: 100 },
    { date: '2026-10-02', mbw: 3, isBaselineEstimate: true },
    { date: '2026-10-02', feedData: { totalDailyFeed: '25' }, phMorning: 7 },
  ] }]);
  assert.deepEqual(records.map(row => row.kind), ['sampling', 'feeding', 'waterQuality']);
});

test('pagination continues after the last returned record without skipping', () => {
  const snapshot = { companies: ['a', 'B', 'c'].map(id => ({ company: { id } })), users: [], audit: [], asOf: new Date().toISOString() };
  const first = responseFor(snapshot, '/companies', { limit: 2 });
  const next = responseFor(snapshot, '/companies', { limit: 2, cursor: first.meta.nextCursor });
  assert.deepEqual(first.data.map(row => row.id), ['B', 'a']);
  assert.deepEqual(next.data.map(row => row.id), ['c']);
});

test('collections exclude sandbox, deduplicate transactions and respect reporting period', () => {
  const now = Date.parse('2026-10-02T12:00:00Z');
  const payment = { id: 'one', transactionId: 'transaction', amount: 150000, currency: 'IDR', environment: 'production', status: 'settlement', recordedPaymentAt: '2026-10-01T12:00:00Z' };
  const company = { company: { id: 'company', activity7d: false, activity30d: false }, subscription: { payments: [payment, { ...payment, id: 'duplicate' }, { ...payment, transactionId: 'old', recordedPaymentAt: '2026-08-01T00:00:00Z' }, { ...payment, transactionId: 'sandbox', environment: 'sandbox' }] }, records: [], dailyUsage: [], orson: { estimatedCostUsd: null } };
  assert.equal(paidPayment({ ...payment, environment: 'sandbox' }), false);
  const result = overview({ now, companies: [company], users: [] }, 7);
  assert.equal(result.collectedPaymentsIdr.value, 150000);
  assert.equal(result.recordedEstimatedCostUsd.value, null);
  assert.equal(result.activeCompanies7d.value, 0);
});
