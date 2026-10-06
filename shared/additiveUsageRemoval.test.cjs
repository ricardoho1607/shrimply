const assert = require('node:assert/strict');
const test = require('node:test');
require('../scripts/register-typescript.cjs');
const { removeAdditiveUsage } = require('./additiveUsageRemoval.ts');
const { applyOfflineMutationToCollection, createOfflineMutationQueue } = require('./offlineWorkspace.ts');
const { buildCogsReport } = require('./cogsReport.ts');
const { buildProfitLoss } = require('./financeReports.ts');
const { buildInventoryLedgerEntries } = require('./financeSync.ts');

const item = () => ({
  id: 'additive', additiveName: 'Mineral', totalStock: 40, totalCost: 800,
  stockInHistory: [{ id: 'purchase', date: '2026-10-01', quantity: 50, price: 20 }],
  usageHistory: [
    { id: 'first', date: '2026-10-02', quantity: 5, unitPrice: 10, totalCost: 50, pondId: 'p1', cycleId: 'c1' },
    { id: 'second', date: '2026-10-02', quantity: 5, unitPrice: 30, totalCost: 150, pondId: 'p2', cycleId: 'c2' },
  ],
});
const removal = () => ({
  id: 'remove-first', userId: 'user', companyId: 'company', createdAt: 1,
  kind: 'inventory', path: ['companies', 'company'],
  inventory: { collection: 'additives', adjustments: [{ itemId: 'additive', action: 'removeUsage', quantity: 5, historyEntry: { id: 'first' } }] },
});

test('removes only the selected usage and restores its historical quantity and cost', () => {
  const original = item();
  const result = removeAdditiveUsage(original, 'first');
  assert.equal(result.totalStock, 45);
  assert.equal(result.totalCost, 850); // Current unit price is 20; the selected usage cost is 50.
  assert.deepEqual(result.usageHistory, [original.usageHistory[1]]);
  assert.equal(original.usageHistory.length, 2);
  assert.equal(removeAdditiveUsage(result, 'first'), null);
});

test('supports legacy unit-price costs and genuinely empty stock without inventing missing values', () => {
  assert.equal(removeAdditiveUsage({ totalStock: 0, totalCost: 0, usageHistory: [{ id: 'u', quantity: '2', unitPrice: '12' }] }, 'u').totalCost, 24);
  const original = item();
  for (const changes of [{ totalStock: undefined }, { totalCost: null }, { totalCost: -1 }]) {
    assert.throws(() => removeAdditiveUsage({ ...original, ...changes }, 'first'), /current inventory/);
  }
  for (const changes of [{ quantity: 0 }, { quantity: -1 }, { quantity: null }, { totalCost: undefined, unitPrice: undefined }, { totalCost: -1 }]) {
    assert.throws(() => removeAdditiveUsage({ ...original, usageHistory: [{ ...original.usageHistory[0], ...changes }] }, 'first'), /recorded usage/);
  }
  assert.throws(() => removeAdditiveUsage({ ...original, usageHistory: [original.usageHistory[0], original.usageHistory[0]] }, 'first'), /duplicated/);
  assert.throws(() => removeAdditiveUsage({ ...original, usageHistory: [{ ...original.usageHistory[0], source: 'treatmentMixProduction' }] }, 'first'), /treatment mix/);
});

test('offline queue retains removal; replay and another-device removal restore stock only once', () => {
  const mutation = removal();
  assert.equal(createOfflineMutationQueue('user', 'company', [mutation]).mutations.length, 1);
  const other = { ...item(), id: 'other' };
  const once = applyOfflineMutationToCollection([item(), other], mutation);
  const twice = applyOfflineMutationToCollection(once, mutation);
  assert.deepEqual(twice, once);
  assert.equal(once[0].totalStock, 45);
  assert.equal(once[0].totalCost, 850);
  assert.equal(once[1], other);
  const delayedUse = removal();
  delayedUse.inventory.adjustments[0] = { itemId: 'additive', action: 'consume', quantity: 5, historyEntry: { id: 'first', unitPrice: 10 } };
  assert.deepEqual(applyOfflineMutationToCollection(once, delayedUse), once, 'a delayed original consumption retry cannot recreate removed usage');
  const invalidStock = { ...item(), totalCost: undefined };
  assert.deepEqual(applyOfflineMutationToCollection([invalidStock], mutation), [invalidStock], 'invalid server values do not break the cached inventory view');
  const invalid = removal(); invalid.inventory.collection = 'feeds';
  assert.equal(createOfflineMutationQueue('user', 'company', [invalid]).mutations.length, 0);
});

test('removal reverses only its usage expense in COGS and P&L; purchase expense stays intact', () => {
  const original = item();
  const updated = { ...original, ...removeAdditiveUsage(original, 'first') };
  const expenses = buildInventoryLedgerEntries(original.id, original, 'additive').map(row => row.record);
  assert.deepEqual(buildInventoryLedgerEntries(updated.id, updated, 'additive').map(row => row.record), expenses);
  const input = {
    ponds: [{ id: 'p1', pondName: 'P1', cycleId: 'c1' }, { id: 'p2', pondName: 'P2', cycleId: 'c2' }],
    expenses, revenues: [], feedUsage: [], harvests: [], cycleScope: 'all', scopeLabel: 'All',
    startDateKey: '2026-10-01', endDateKey: '2026-10-06', normalizeCategory: x => x,
  };
  assert.equal(buildCogsReport({ ...input, additiveUsage: original.usageHistory }).totalProductionCost, 200);
  assert.equal(buildCogsReport({ ...input, additiveUsage: updated.usageHistory }).totalProductionCost, 150);
  assert.equal(buildCogsReport({ ...input, cycleScope: 'c1', additiveUsage: updated.usageHistory }).totalProductionCost, 0);
  assert.equal(buildCogsReport({ ...input, cycleScope: 'c2', additiveUsage: updated.usageHistory }).totalProductionCost, 150);
  assert.equal(buildProfitLoss({ ...input, additiveUsage: updated.usageHistory }).totalCOGS, 150);
});
