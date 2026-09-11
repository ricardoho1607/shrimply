const test = require('node:test'), assert = require('node:assert/strict');
const { loadModule } = require('../../scripts/test-module.cjs');
function fixture() {
  const rows = new Map([
    ['companies/farm/ponds/pond', { samplings: [{ id: 'feed-old', date: '2026-09-11', feedData: { feedAllocations: [{ inventoryFeedId: 'feed', quantityKg: 10 }] } }] }],
    ['companies/farm/feeds/feed', { totalStock: 90, totalCost: 900, usageHistory: [{ id: 'old', pondId: 'pond', date: '2026-09-11', source: 'daily_feed_record', quantity: 10, unitPrice: 10, totalCost: 100 }] }],
  ]);
  const sdk = { doc: (base, ...parts) => ({ path: [base?.path, ...parts].filter(Boolean).join('/') }), serverTimestamp: () => new Date(), runTransaction: async (_db, work) => {
    const writes = [];
    await work({ get: async ref => ({ exists: () => rows.has(ref.path), data: () => structuredClone(rows.get(ref.path)) }), update: (ref, value) => writes.push([ref.path, { ...rows.get(ref.path), ...value }]), set: (ref, value) => writes.push([ref.path, value]) });
    writes.forEach(([path, value]) => rows.set(path, value));
  } };
  const { applyDailyFeedMutation } = loadModule('app/services/dailyFeedTransaction.ts', { 'firebase/firestore': sdk, '@/config/firebase': { db: {} } });
  const mutation = (id, amount) => ({ id, companyId: 'farm', userId: 'tech', dailyFeed: { pondId: 'pond', date: '2026-09-11', previousFeedIds: ['feed'], allocations: [{ inventoryFeedId: 'feed', quantityKg: amount }] } });
  return { rows, applyDailyFeedMutation, mutation };
}
test('two devices setting the same daily total deduct once and replay cannot undo a newer edit', async () => {
  const { rows, applyDailyFeedMutation: apply, mutation } = fixture();
  await apply(mutation('a', 20)); await apply(mutation('b', 20));
  assert.equal(rows.get('companies/farm/feeds/feed').totalStock, 80);
  await apply(mutation('c', 30)); await apply(mutation('a', 20));
  assert.equal(rows.get('companies/farm/feeds/feed').totalStock, 70);
  assert.equal(rows.get('companies/farm/ponds/pond').samplings[0].feedData.totalDailyFeed, '30.00');
});
test('insufficient stock commits neither a feeding record nor an operation receipt', async () => {
  const { rows, applyDailyFeedMutation: apply, mutation } = fixture();
  await assert.rejects(() => apply(mutation('bad', 200)), /Insufficient/);
  assert.equal(rows.get('companies/farm/feeds/feed').totalStock, 90);
  assert.equal(rows.has('companies/farm/ponds/pond/feedOperations/bad'), false);
});
test('reducing a daily feed total returns its historical cost', async () => {
  const { rows, applyDailyFeedMutation: apply, mutation } = fixture();
  await apply(mutation('a', 5));
  assert.equal(rows.get('companies/farm/feeds/feed').totalStock, 95);
  assert.equal(rows.get('companies/farm/feeds/feed').totalCost, 950);
});
