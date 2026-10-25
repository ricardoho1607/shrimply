'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getPlanPrice, publicPlanCatalog } = require('./shared/companyPlans');
const { resolveEntitlements, LEGACY_GRACE_END_MS } = require('./shared/companyEntitlements');

test('publishes company plans without user limits', () => {
  const plans = publicPlanCatalog();
  assert.deepEqual(plans.map((plan) => [plan.id, plan.pondLimit]), [
    ['free', 10],
    ['plus', 30],
    ['pro', 100],
  ]);
  assert.equal(plans.some((plan) => Object.hasOwn(plan, 'userLimit')), false);
  assert.equal(getPlanPrice('plus', 'monthly'), 150000);
  assert.equal(getPlanPrice('plus', 'cycle'), 500000);
  assert.equal(getPlanPrice('pro', 'monthly'), 450000);
  assert.equal(getPlanPrice('pro', 'annual'), 4500000);
  assert.deepEqual(plans.map((plan) => plan.orson.monthlyTotal), [60, 300, 750]);
});

test('gives older companies a temporary early-access entitlement', () => {
  const beforeDeadline = resolveEntitlements(null, {}, LEGACY_GRACE_END_MS - 1, null, null, new Date('2026-08-01T00:00:00Z'));
  assert.equal(beforeDeadline.planId, 'legacy');
  assert.equal(beforeDeadline.pondLimit, null);

  const afterDeadline = resolveEntitlements(null, {}, LEGACY_GRACE_END_MS + 1, null, null, new Date('2026-08-01T00:00:00Z'));
  assert.equal(afterDeadline.planId, 'free');
  assert.equal(afterDeadline.pondLimit, 10);
});

test('backdating client fields cannot create early-access benefits', () => {
  const forged = { createdAt: new Date('2000-01-01'), _serverCreatedAt: new Date('2000-01-01') };
  assert.equal(resolveEntitlements(null, forged, LEGACY_GRACE_END_MS - 1).planId, 'free');
  assert.equal(resolveEntitlements(null, forged, LEGACY_GRACE_END_MS - 1, null, null, new Date('2026-10-25')).planId, 'free');
});

test('stored paid and early-access entitlements expire even before the scheduler runs', () => {
  for (const status of ['active', 'grace', 'trialing']) {
    const result = resolveEntitlements({ planId: status === 'trialing' ? 'legacy' : 'pro', status, graceUntil: new Date('2026-11-05T00:00:00Z') }, {}, LEGACY_GRACE_END_MS + 1);
    assert.equal(result.planId, 'free');
  }
});

test('a server-owned lifetime grant overrides expired or changed subscriptions without an expiry', () => {
  const result = resolveEntitlements({ planId: 'free', graceUntil: new Date('2026-11-05') }, {}, Date.UTC(2040, 0, 1), { kind: 'lifetime', status: 'active' });
  assert.equal(result.planId, 'lifetime');
  assert.equal(result.pondLimit, null);
  assert.equal(result.orson.dailyChat, null);
  assert.equal(result.orson.dailyProjection, null);
  assert.equal(result.orson.monthlyTotal, null);
  assert.equal(result.currentPeriodEnd, null);
  assert.equal(result.graceUntil, null);
  assert.equal(resolveEntitlements(null, {}, Date.now(), { kind: 'lifetime', status: 'revoked' }).planId, 'free');
  assert.equal(resolveEntitlements(null, { lifetime: true, createdAt: new Date('2000-01-01') }, Date.UTC(2040, 0, 1)).planId, 'free');
});
