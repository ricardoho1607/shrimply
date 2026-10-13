const test = require('node:test');
const assert = require('node:assert/strict');
require('../scripts/register-typescript.cjs');
const { reconcileDailyFeedStock, reconcileDailyFeedStockAdjustment } = require('./dailyFeedTransaction.ts');
const intent = { pondId: 'p', date: '2026-10-13', allocations: [], previousFeedIds: [] };
const stock = () => ({ totalStock: 80, totalCost: 1600, usageHistory: [
  { pondId: 'p', date: intent.date, source: 'daily_feed_record', quantity: 20, unitPrice: 10, totalCost: 200 },
] });

test('web adjustment and mobile full-history updates produce identical balances and ledger entries', () => {
  for (const desired of [0, 5, 20, 40]) {
    const before = stock();
    const adjustment = reconcileDailyFeedStockAdjustment(before, desired, intent, 'op');
    const mobile = reconcileDailyFeedStock(before, desired, intent, 'op');
    if (desired === 20) { assert.equal(adjustment, null); assert.equal(mobile, null); continue; }
    assert.equal(adjustment.totalStock, mobile.totalStock);
    assert.equal(adjustment.totalCost, mobile.totalCost);
    assert.deepEqual(mobile.usageHistory, [...before.usageHistory, adjustment.usage]);
    assert.deepEqual(before, stock(), 'The calculation must not mutate the source snapshot');
  }
});

test('both adapters reject missing and invalid balances, including stock returns', () => {
  for (const field of ['totalStock', 'totalCost']) {
    for (const value of [undefined, null, NaN, Infinity, -1, '80']) {
      for (const desired of [0, 40]) {
        const before = { ...stock(), [field]: value };
        assert.throws(() => reconcileDailyFeedStock(before, desired, intent, 'op'), /missing or invalid/);
      }
    }
  }
});

test('invalid desired amounts cannot enter the ledger', () => {
  for (const desired of [NaN, Infinity, -1]) {
    assert.throws(() => reconcileDailyFeedStock(stock(), desired, intent, 'op'), /Invalid daily feed/);
  }
});

test('returns use historical prices while new usage uses current weighted cost', () => {
  assert.equal(reconcileDailyFeedStockAdjustment(stock(), 10, intent, 'return').totalCost, 1700);
  assert.equal(reconcileDailyFeedStockAdjustment(stock(), 30, intent, 'add').totalCost, 1400);
});

test('legacy numeric history and feed-screen labels still reconcile without duplicate deductions', () => {
  const before = { totalStock: 80, totalCost: 1600, usageHistory: [
    { pondId: 'p', date: intent.date, notes: 'Feed screen record', quantity: '20', totalCost: '200' },
  ] };
  assert.equal(reconcileDailyFeedStock(before, 20, intent, 'same'), null);
  assert.equal(reconcileDailyFeedStock(before, 0, intent, 'return').totalCost, 1800);
});
