/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');
const ts = require('typescript');
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const m = { exports: {} }; cache.set(file, m.exports);
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('module', 'exports', 'require', js)(m, m.exports, name => load(path.resolve(path.dirname(file), name + '.ts')));
  return m.exports;
}
const root = path.resolve(__dirname, '../../..');
const integrity = load(path.join(root, 'shared/financeIntegrity.ts'));
const { buildCogsReport } = load(path.join(root, 'shared/cogsReport.ts'));
const base = { ponds: [{ id: 'p1', pondName: 'A1', cycleId: 'c1' }], expenses: [], revenues: [], feedUsage: [], additiveUsage: [], harvests: [], cycleScope: 'all', scopeLabel: 'All', startDateKey: '2026-09-01', endDateKey: '2026-09-30', normalizeCategory: x => x };
test('mix manufacture remains inventory and application is charged once under either scope', () => {
  const additiveUsage = [{ date: '2026-09-09', source: 'treatmentMixProduction', totalCost: 100 }, { date: '2026-09-09', source: 'treatmentMixApplication', totalCost: 100, pondId: 'p1', cycleId: 'c1' }];
  for (const cycleScope of ['all', 'c1']) assert.equal(buildCogsReport({ ...base, additiveUsage, cycleScope }).totalProductionCost, 100);
  assert.equal(buildCogsReport({ ...base, additiveUsage: additiveUsage.slice(0, 1) }).totalProductionCost, 0);
});
test('money accepts numeric strings, excludes voids and rejects unknown values', () => {
  assert.equal(integrity.sumMoney([{ amount: '100' }, { amount: 50 }, { amount: 999, voided: true }]), 150);
  for (const amount of [undefined, null, '', 'bad', Infinity]) assert.throws(() => integrity.sumMoney([{ amount }]));
});
test('historical returns restore exact remaining costs across prices and previous corrections', () => {
  const usages = [{ quantity: 10, totalCost: 100 }, { quantity: 10, totalCost: 200 }];
  assert.deepEqual(integrity.getUsageReturnCost(usages, 5), { unitPrice: 15, totalCost: 75 });
  assert.equal(integrity.getUsageReturnCost([...usages, { quantity: -5, totalCost: -75 }], 15).totalCost, 225);
  assert.throws(() => integrity.getUsageReturnCost(usages, 21));
  assert.throws(() => integrity.getUsageReturnCost([{ quantity: 5 }], 5));
});
test('stock check rejects a transaction whose current balance is below requested use', () => {
  assert.throws(() => integrity.requireAvailableStock(5, 8));
  assert.equal(integrity.requireAvailableStock(10, 8), 2);
});
const { buildProfitLoss, buildConfirmedCashFlow } = load(path.join(root, 'shared/financeReports.ts'));
const { reconcileFinanceSources } = load(path.join(root, 'shared/financeReconciliation.ts'));
test('P&L charges interest once and excludes loan principal and capital from profit', () => {
  const expenses = ['Interest', 'Equipment', 'Loan Payment'].map(category => ({ date: '2026-09-09', cycleId: 'c1', category, amount: 100 }));
  const result = buildProfitLoss({ ...base, expenses });
  assert.equal(result.totalCOGS, 0); assert.equal(result.totalOtherExpenses, 100); assert.equal(result.netProfit, -100); assert.equal(result.excludedCapital, 200);
});
test('payment confirmation is idempotent and cannot exceed outstanding amount', () => {
  const payment = { id: 'pay1', amount: 40, date: '2026-09-10' };
  const record = { amount: 100, settlements: integrity.appendSettlement({ amount: 100 }, payment) };
  assert.equal(integrity.appendSettlement(record, payment).length, 1);
  assert.throws(() => integrity.appendSettlement(record, { ...payment, id: 'pay2', amount: 70 }));
  assert.throws(() => integrity.appendSettlement(record, { ...payment, id: 'pay2', date: '2026-02-31' }));
});
test('cash uses actual payment dates and partial amounts, not sales or purchase dates', () => {
  const result = buildConfirmedCashFlow({ expenses: [{ date: '2026-09-01', amount: 100, category: 'Feed', settlements: [{ id: 'old', date: '2026-08-30', amount: 20 }, { id: 'now', date: '2026-09-10', amount: 30 }] }], revenues: [{ date: '2026-09-01', amount: 200, category: 'Shrimp Sales' }], startDateKey: '2026-09-01', endDateKey: '2026-09-30', normalizeCategory: x => x });
  assert.equal(result.openingBalance, -20); assert.equal(result.operating.paymentToSuppliers, 30); assert.equal(result.operating.cashFromSales, 0); assert.equal(result.unconfirmedCount, 2);
});
test('reconciliation reports missing, duplicate and orphaned entries without writes', () => {
  const result = reconcileFinanceSources({ feeds: [{ id: 'feed1', feedName: 'Feed', stockInHistory: [{ id: 'stock1', date: '2026-09-09', quantity: 10, price: 2 }] }], additives: [], harvests: [{ id: 'h1', date: '2026-09-09', ponds: [{ biomass: 10, price: 5 }] }], expenses: [], revenues: [{ id: 'a', reference: 'HARVEST-h1', amount: 50 }, { id: 'b', reference: 'HARVEST-h1', amount: 50 }, { id: 'c', reference: 'HARVEST-gone', amount: 100 }] });
  assert.equal(result.writesPerformed, 0); assert.deepEqual(result.issues.map(row => row.kind).sort(), ['duplicate', 'missing', 'orphaned']);
});
test('source saves post together and UI cannot remove generated history independently', () => {
  const source = file => fs.readFileSync(path.join(root, file), 'utf8');
  const { readFeatureSource } = require('../../../scripts/read-feature-source.cjs');
  const sync = readFeatureSource(path.join(root, 'app/hooks/useFirebaseSync.ts'));
  assert.match(sync, /transaction\.set\(doc\(db, 'companies', activeCompanyId, 'revenues', revenueId\)/);
  assert.match(sync, /transaction\.update\(harvestRef, \{ voided: true/);
  const offline = source('app/services/offlineWorkspace.ts');
  assert.match(offline, /buildInventoryLedgerEntries/);
  assert.match(offline, /transaction\.set\(doc\(db, 'companies', mutation\.companyId, 'expenses', entry\.id\)/);
  assert.doesNotMatch(source('app/finance.tsx'), /removeSyncedExpenses|removeSyncedRevenues|SyncEnabled/);
  assert.match(source('web/src/app/dashboard/finance/page.tsx'), /!isSourceLinkedFinance\(t\)/);
});
test('voiding a source does not erase a confirmed cash receipt and malformed settlements are excluded', () => {
  const args = { expenses: [], startDateKey: '2026-09-01', endDateKey: '2026-09-30', normalizeCategory: x => x };
  const payment = { id: 'p', date: '2026-09-09', amount: 50 };
  assert.equal(buildConfirmedCashFlow({ ...args, revenues: [{ amount: 50, voided: true, category: 'Shrimp Sales', settlements: [payment] }] }).operating.cashFromSales, 50);
  const invalid = buildConfirmedCashFlow({ ...args, revenues: [{ amount: 100, category: 'Shrimp Sales', settlements: [payment, payment] }] });
  assert.equal(invalid.invalidCount, 1); assert.equal(invalid.operating.cashFromSales, 0);
});

// Execute the real mobile replay function with an in-memory transactional Firestore boundary.
async function mobileReplay(mutation, initial = {}) {
  const source = fs.readFileSync(path.join(root, 'app/services/offlineWorkspace.ts'), 'utf8');
  const fn = source.slice(source.indexOf('const applyRemoteMutation ='), source.indexOf('export const flushOfflineMutations'));
  const compiled = ts.transpileModule(fn, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const data = structuredClone(initial);
  const doc = (_db, ...parts) => ({ path: parts.join('/'), id: parts.at(-1) });
  const runTransaction = async (_db, callback) => {
    const writes = []; let writing = false;
    await callback({
      get: async ref => { assert.equal(writing, false, 'all transaction reads precede writes'); return { exists: () => Boolean(data[ref.path]), data: () => structuredClone(data[ref.path]) }; },
      set: (ref, value, opts) => { writing = true; writes.push(() => { data[ref.path] = opts?.merge ? { ...data[ref.path], ...value } : value; }); },
      update: (ref, value) => { writing = true; writes.push(() => { data[ref.path] = { ...data[ref.path], ...value }; }); },
      delete: ref => { writing = true; writes.push(() => { delete data[ref.path]; }); },
    });
    writes.forEach(write => write());
  };
  const financeSync = load(path.join(root, 'shared/financeSync.ts'));
  const feeding = load(path.join(root, 'shared/feedInventoryUsage.ts'));
  const deps = { db: {}, doc, runTransaction, serverTimestamp: () => 'server-time', ...financeSync, ...integrity, ...feeding, ...load(path.join(root, 'shared/additiveUsageRemoval.ts')), uploadMutationLocalFiles: async op => op.data || {}, cleanupMutationLocalFiles: async () => {}, Timestamp: class { constructor(seconds, nanoseconds) { this.seconds = seconds; this.nanoseconds = nanoseconds; } } };
  const apply = new Function(...Object.keys(deps), compiled + '\nreturn applyRemoteMutation;')(...Object.values(deps));
  await apply(mutation);
  return data;
}
test('mobile creation and restock post one linked expense atomically, including replay retry', async () => {
  const source = { id: 'feed', companyId: 'farm', feedName: 'Feed', archived: false, totalStock: 10, totalCost: 100, stockInHistory: [{ id: 's1', date: '2026-09-09', quantity: 10, price: 10 }], usageHistory: [] };
  const create = { id: 'create', userId: 'owner', companyId: 'farm', createdAt: 1, kind: 'set', path: ['companies', 'farm', 'feeds', 'feed'], createOnly: true, data: source };
  const first = await mobileReplay(create);
  assert.equal(first['companies/farm/expenses/sync_INVENTORY-feed-feed-s1'].amount, 100);
  assert.deepEqual(await mobileReplay(create, first), first);
  const restock = { id: 'restock', userId: 'owner', companyId: 'farm', createdAt: 2, kind: 'inventory', path: create.path, inventory: { collection: 'feeds', adjustments: [{ itemId: 'feed', action: 'stockIn', quantity: 5, price: 20, historyEntry: { id: 's2', date: '2026-09-10', quantity: 5, price: 20 } }] } };
  const second = await mobileReplay(restock, first);
  assert.equal(second['companies/farm/feeds/feed'].totalStock, 15);
  assert.equal(second['companies/farm/expenses/sync_INVENTORY-feed-feed-s2'].amount, 100);
  assert.deepEqual(await mobileReplay(restock, second), second);
});

test('mobile usage removal restores authoritative cost once and leaves other usage and purchases intact', async () => {
  const key = 'companies/farm/additives/mineral';
  const source = {
    totalStock: 20, totalCost: 600, stockInHistory: [{ id: 'stock', quantity: 30, price: 25 }],
    usageHistory: [{ id: 'remove', quantity: 5, totalCost: 50 }, { id: 'keep', quantity: 5, totalCost: 100 }],
  };
  const initial = { [key]: source, 'companies/farm/expenses/purchase': { amount: 750 } };
  const mutation = { id: 'removal', companyId: 'farm', userId: 'owner', kind: 'inventory', inventory: { collection: 'additives', adjustments: [{ itemId: 'mineral', action: 'removeUsage', quantity: 99, historyEntry: { id: 'remove', totalCost: 999 } }] } };
  const result = await mobileReplay(mutation, initial);
  assert.equal(result[key].totalStock, 25);
  assert.equal(result[key].totalCost, 650);
  assert.deepEqual(result[key].usageHistory, [source.usageHistory[1]]);
  assert.deepEqual(result[key].stockInHistory, source.stockInHistory);
  assert.deepEqual(result['companies/farm/expenses/purchase'], initial['companies/farm/expenses/purchase']);
  assert.deepEqual(await mobileReplay(mutation, result), result);
  const delayedUse = structuredClone(mutation);
  delayedUse.inventory.adjustments[0] = { itemId: 'mineral', action: 'consume', quantity: 5, historyEntry: { id: 'remove', unitPrice: 10 } };
  assert.deepEqual(await mobileReplay(delayedUse, result), result, 'a delayed original consumption retry cannot recreate removed usage');
  const invalid = structuredClone(initial); delete invalid[key].usageHistory[0].totalCost;
  await assert.rejects(mobileReplay(mutation, invalid), /recorded usage/);
  assert.deepEqual(invalid[key].usageHistory, [{ id: 'remove', quantity: 5 }, source.usageHistory[1]]);
});
test('mobile replay blocks deletion of stock with history and validates payment against current balance', async () => {
  await assert.rejects(mobileReplay({ kind: 'delete', path: ['companies', 'farm', 'feeds', 'feed'] }, { 'companies/farm/feeds/feed': { stockInHistory: [{ id: 's1' }] } }));
  const mutation = { kind: 'set', path: ['companies', 'farm', 'revenues', 'r1'], settlement: { id: 'p2', date: '2026-09-09', amount: 50 } };
  await assert.rejects(mobileReplay(mutation, { 'companies/farm/revenues/r1': { amount: 100, settlements: [{ id: 'p1', date: '2026-09-08', amount: 80 }] } }));
});

test('mobile archive and restore preserve stock history and reject archiving available stock', async () => {
  const key = 'companies/farm/feeds/feed';
  const source = { totalStock: 0, stockInHistory: [{ id: 's1', quantity: 10, price: 10 }], usageHistory: [{ quantity: 10, totalCost: 100 }] };
  const mutation = { kind: 'set', path: key.split('/'), data: { archived: true } };
  const archived = await mobileReplay(mutation, { [key]: source });
  assert.equal(archived[key].archived, true);
  assert.deepEqual(archived[key].stockInHistory, source.stockInHistory);
  assert.deepEqual(archived[key].usageHistory, source.usageHistory);
  const restored = await mobileReplay({ ...mutation, data: { archived: false } }, archived);
  assert.equal(restored[key].archived, false);
  assert.deepEqual(restored[key].usageHistory, source.usageHistory);
  await assert.rejects(mobileReplay(mutation, { [key]: { ...source, totalStock: 1 } }));
});
