const test = require('node:test'), assert = require('node:assert/strict');
const { loadModule } = require('../scripts/test-module.cjs');
function expiryFixture(renewed) {
  const now = new Date();
  let current = { planId: 'pro', status: 'active', graceUntil: new Date(now.getTime() - 86400000) };
  const original = { ...current }, writes = [];
  const company = { id: 'farm', collection: name => ({ doc: id => ({ path: name + '/' + id }) }) };
  const ref = { path: 'entitlements/current', parent: { parent: company } };
  const db = {
    collectionGroup: () => ({ where: () => ({ limit: () => ({ get: async () => {
      if (renewed) current = { ...current, graceUntil: new Date(now.getTime() + 86400000) };
      return { empty: false, docs: [{ id: 'current', ref, data: () => original }] };
    } }) }) }),
    runTransaction: work => work({ get: async reference => ({ exists: true, data: () => reference === ref ? current : undefined }), set: (reference, value) => writes.push([reference, value]) }),
  };
  const admin = { firestore: Object.assign(() => db, { Timestamp: { now: () => now }, FieldValue: { serverTimestamp: () => now } }) };
  const { expireCompanyPlans } = loadModule('functions/billing.js', { './firebaseAdmin': admin, 'firebase-functions/v2/scheduler': { onSchedule: (_options, handler) => handler } });
  return { expireCompanyPlans, writes };
}
test('expiry rechecks current entitlement and preserves a concurrent renewal', async () => {
  const f = expiryFixture(true); await f.expireCompanyPlans(); assert.equal(f.writes.length, 0);
});
test('still-expired entitlement and billing state change together', async () => {
  const f = expiryFixture(false); await f.expireCompanyPlans(); assert.equal(f.writes.length, 2); assert.equal(f.writes[0][1].planId, 'free');
});
