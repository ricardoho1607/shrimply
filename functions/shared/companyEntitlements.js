'use strict';

const { buildEntitlements } = require('./companyPlans');

const ENTITLEMENTS_DOCUMENT_ID = 'current';
const LEGACY_GRACE_END_MS = Date.UTC(2026, 10, 5, 0, 0, 0);
const hasLifetimeGrant = (grant) => grant?.kind === 'lifetime' && grant.status === 'active';

const timestampMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;
  return 0;
};

const legacyEntitlements = (company, nowMs) => {
  const createdAtMs = timestampMillis(company?.createdAt);
  const existedBeforeBilling = createdAtMs > 0 && createdAtMs < Date.UTC(2026, 8, 5, 0, 0, 0);
  if (!existedBeforeBilling || nowMs >= LEGACY_GRACE_END_MS) return buildEntitlements('free');
  return buildEntitlements('pro', {
    planId: 'legacy',
    planName: 'Early access',
    status: 'trialing',
    pondLimit: null,
    graceUntilMs: LEGACY_GRACE_END_MS,
  });
};

// Grants are read ONLY from the server-owned subscriptionGrants/current document.
// Never infer a permanent grant from client-editable company fields or creation dates.
const resolveBaseEntitlements = (data, company, nowMs = Date.now(), grant = null) => {
  if (hasLifetimeGrant(grant)) return buildEntitlements('pro', {
    planId: 'lifetime', planName: 'Lifetime free', status: 'complimentary', pondLimit: null,
    orson: { dailyChat: null, dailyProjection: null, weeklyProjection: null, monthlyTotal: null },
    billingInterval: null, currentPeriodStart: null, currentPeriodEnd: null,
    graceUntil: null, scheduledPlanId: null,
  });
  if (!data || typeof data !== 'object') return legacyEntitlements(company, nowMs);
  const graceUntilMs = timestampMillis(data.graceUntil);
  if (['active', 'grace', 'trialing'].includes(data.status) && graceUntilMs > 0 && graceUntilMs <= nowMs) {
    return buildEntitlements('free');
  }
  return {
    ...buildEntitlements(data.planId),
    ...data,
    orson: {
      ...buildEntitlements(data.planId).orson,
      ...(data.orson && typeof data.orson === 'object' ? data.orson : {}),
    },
  };
};

const NINETY_DAYS_MS = 90 * 86400000;
const activeOverride = (override, nowMs) => Boolean(override
  && override.status === 'active' && ['plus', 'pro'].includes(override.planId)
  && timestampMillis(override.startsAt) > 0 && timestampMillis(override.startsAt) <= nowMs
  && timestampMillis(override.expiresAt) > nowMs
  && timestampMillis(override.expiresAt) - timestampMillis(override.startsAt) <= NINETY_DAYS_MS);
const maximumBenefit = (left, right) => left === null || right === null ? null : Math.max(left, right);

// Overlay benefits; never rewrite the paid contract or lifetime grant.
const resolveEntitlements = (data, company, nowMs = Date.now(), grant = null, override = null) => {
  const base = resolveBaseEntitlements(data, company, nowMs, grant);
  if (hasLifetimeGrant(grant) || !activeOverride(override, nowMs)) return base;
  const temporary = buildEntitlements(override.planId);
  const higher = base.planId === 'free' || (base.planId === 'plus' && override.planId === 'pro');
  return {
    ...base,
    ...(higher ? { planId: temporary.planId, planName: temporary.planName, status: 'complimentary' } : {}),
    pondLimit: maximumBenefit(base.pondLimit, temporary.pondLimit),
    orson: Object.fromEntries(Object.keys(temporary.orson).map(key => [key, maximumBenefit(base.orson[key], temporary.orson[key])])),
    complimentaryAccess: { planId: override.planId, expiresAt: override.expiresAt, basePlanId: base.planId },
  };
};

const getCompanyEntitlements = async (db, companyId, company, nowMs = Date.now()) => {
  const ref = db.collection('companies').doc(companyId).collection('entitlements').doc(ENTITLEMENTS_DOCUMENT_ID);
  const [snapshot, grant, override] = await Promise.all([
    ref.get(), db.collection('companies').doc(companyId).collection('subscriptionGrants').doc('current').get(),
    db.collection('companies').doc(companyId).collection('accessOverrides').doc('current').get(),
  ]);
  return { ref, entitlements: resolveEntitlements(snapshot.exists ? snapshot.data() : null, company, nowMs, grant.data(), override.data()) };
};

module.exports = {
  ENTITLEMENTS_DOCUMENT_ID,
  LEGACY_GRACE_END_MS,
  hasLifetimeGrant,
  getCompanyEntitlements,
  resolveEntitlements,
  resolveBaseEntitlements,
  activeOverride,
  NINETY_DAYS_MS,
  timestampMillis,
};
