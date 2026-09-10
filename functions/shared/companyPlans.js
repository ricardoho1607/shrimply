'use strict';

const PRICE_VERSION = '2026-09-05';

const PLAN_CATALOG = Object.freeze({
  free: Object.freeze({
    id: 'free',
    name: 'Free',
    description: 'Essential farm records for small teams getting started.',
    pondLimit: 10,
    prices: Object.freeze({ monthly: 0, cycle: 0, annual: 0 }),
    orson: Object.freeze({ dailyChat: 3, dailyProjection: 1, weeklyProjection: 1, monthlyTotal: 60 }),
    features: Object.freeze([
      'Core farm records and dashboards',
      'Feeding, water quality, sampling and harvest records',
      '3 Orson chats per day',
      '1 harvest projection per week',
    ]),
  }),
  plus: Object.freeze({
    id: 'plus',
    name: 'Plus',
    description: 'Complete day-to-day management for growing farms.',
    pondLimit: 30,
    prices: Object.freeze({ monthly: 150000, cycle: 500000, annual: 1500000 }),
    orson: Object.freeze({ dailyChat: 10, dailyProjection: 2, weeklyProjection: null, monthlyTotal: 300 }),
    features: Object.freeze([
      'All current farm-management tools',
      'Capacity for growing farm operations',
      '10 Orson chats per day',
      '2 harvest projections per day',
      '300 total Orson requests per month',
    ]),
  }),
  pro: Object.freeze({
    id: 'pro',
    name: 'Pro',
    description: 'Advanced controls and reporting for larger operations.',
    pondLimit: 100,
    prices: Object.freeze({ monthly: 450000, cycle: 1500000, annual: 4500000 }),
    orson: Object.freeze({ dailyChat: 20, dailyProjection: 5, weeklyProjection: null, monthlyTotal: 750 }),
    features: Object.freeze([
      'All current farm-management tools',
      'Capacity for larger farm operations',
      '20 Orson chats per day',
      '5 harvest projections per day',
      '750 total Orson requests per month',
      'Priority support',
    ]),
  }),
});

const BILLING_INTERVALS = Object.freeze({
  monthly: Object.freeze({ id: 'monthly', label: 'Monthly', months: 1 }),
  cycle: Object.freeze({ id: 'cycle', label: '4-month cycle', months: 4 }),
  annual: Object.freeze({ id: 'annual', label: 'Annual', months: 12 }),
});

const PUBLIC_PLAN_IDS = Object.freeze(Object.keys(PLAN_CATALOG));

const normalizePlanId = (value) => (
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(PLAN_CATALOG, value)
    ? value
    : 'free'
);

const normalizeBillingInterval = (value) => (
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(BILLING_INTERVALS, value)
    ? value
    : 'monthly'
);

const getPlan = (planId) => PLAN_CATALOG[normalizePlanId(planId)];

const getPlanPrice = (planId, interval) => {
  const plan = getPlan(planId);
  const normalizedInterval = normalizeBillingInterval(interval);
  return plan.prices[normalizedInterval];
};

const publicPlanCatalog = () => PUBLIC_PLAN_IDS.map((planId) => {
  const plan = PLAN_CATALOG[planId];
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    pondLimit: plan.pondLimit,
    prices: { ...plan.prices },
    orson: { ...plan.orson },
    features: [...plan.features],
    priceVersion: PRICE_VERSION,
  };
});

const buildEntitlements = (planId, overrides = {}) => {
  const plan = getPlan(planId);
  return {
    planId: plan.id,
    planName: plan.name,
    status: plan.id === 'free' ? 'free' : 'active',
    pondLimit: plan.pondLimit,
    orson: { ...plan.orson },
    priceVersion: PRICE_VERSION,
    ...overrides,
  };
};

module.exports = {
  BILLING_INTERVALS,
  PLAN_CATALOG,
  PRICE_VERSION,
  PUBLIC_PLAN_IDS,
  buildEntitlements,
  getPlan,
  getPlanPrice,
  normalizeBillingInterval,
  normalizePlanId,
  publicPlanCatalog,
};
