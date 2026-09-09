/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS regression tests. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const loaded = { exports: {} };
  cache.set(file, loaded.exports);
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function('module', 'exports', 'require', compiled)(loaded, loaded.exports,
    name => load(path.resolve(path.dirname(file), name + '.ts')));
  return loaded.exports;
}
const { buildCogsReport } = load(path.resolve(__dirname, '../../../shared/cogsReport.ts'));
const base = () => ({
  ponds: [{ id: 'p1', pondName: 'A1', cycleId: 'c1' }, { id: 'p2', pondName: 'A2', cycleId: 'c1' }, { id: 'p3', pondName: 'B1', cycleId: 'c2' }],
  expenses: [], revenues: [], feedUsage: [], additiveUsage: [], harvests: [],
  cycleScope: 'c1', scopeLabel: 'Cycle 1', startDateKey: '2026-09-01', endDateKey: '2026-09-30', normalizeCategory: value => value,
});
const record = (extra = {}) => ({ date: '2026-09-09', cycleId: 'c1', ...extra });
test('pond costs use actual usage and stored expense allocations, with exact reconciliation', () => {
  const result = buildCogsReport({ ...base(),
    feedUsage: [record({ pondId: 'p1', totalCost: '100' }), record({ pondId: 'p2', totalCost: 200 }), record({ totalCost: 30 })],
    additiveUsage: [record({ pondId: 'p1', totalCost: 20 })],
    expenses: [record({ category: 'Labor', amount: 90, pondAllocations: [{ pondId: 'p1', amount: 40 }, { pondId: 'p2', amount: 50 }] }), record({ category: 'Seed', amount: 60 }), record({ category: 'Feed', amount: 1000, reference: 'INVENTORY-feed-x' }), record({ category: 'Equipment', amount: 700 })],
  });
  assert.equal(result.totalProductionCost, 500);
  assert.deepEqual(result.details.pondRows.map(row => row.total), [160, 250]);
  assert.equal(result.details.unallocatedCost, 90);
  assert.equal(result.details.excludedExpenseAmount, 700);
  assert.equal(result.details.pondRows.reduce((sum, row) => sum + row.total, 0) + result.details.unallocatedCost, result.totalProductionCost);
});
test('recorded harvest revenue is included exactly once and allocated to the correct ponds', () => {
  const input = { ...base(),
    harvests: [{ id: 'h1', date: '2026-09-09', cycleId: 'c1', ponds: [{ pondId: 'p1', biomass: '10', price: '5', subBiomass: '', subPrice: '' }, { pondId: 'p2', biomass: 20, price: 6 }] }],
    revenues: [record({ amount: '170', reference: 'HARVEST-h1' }), record({ amount: 20 })],
  };
  const result = buildCogsReport(input);
  assert.equal(result.revenue, 190);
  assert.deepEqual(result.details.pondRows.map(row => row.revenue), [50, 120]);
  assert.equal(result.details.unallocatedRevenue, 20);
  assert.equal(result.details.harvestSales, 170);
  assert.equal(result.details.harvestedKg, 30);
  assert.equal(result.details.missingHarvestRevenueCount, 0);
  assert.equal(result.details.mismatchedHarvestRevenueCount, 0);
  const missing = buildCogsReport({ ...input, revenues: [] });
  assert.equal(missing.revenue, 0);
  assert.equal(missing.details.missingHarvestRevenueCount, 1);
  const mismatch = buildCogsReport({ ...input, revenues: [record({ amount: 150, reference: 'HARVEST-h1' })] });
  assert.equal(mismatch.details.mismatchedHarvestRevenueCount, 1);
  assert.equal(mismatch.details.unallocatedRevenue, 150);
  const duplicate = buildCogsReport({ ...input, revenues: [...input.revenues, input.revenues[0]] });
  assert.equal(duplicate.details.duplicateHarvestRevenueCount, 1);
});
test('scope filtering, missing amounts, and malformed allocations cannot fabricate pond costs', () => {
  const result = buildCogsReport({ ...base(),
    feedUsage: [record({ totalCost: 50, cycleId: 'c2', pondId: 'p3' }), record({ totalCost: 50, date: '2026-08-31' }), record({ pondId: 'p1' }), record({ totalCost: 10, cycleId: undefined, pondId: 'p1' })],
    expenses: [record({ amount: 90, category: 'Labor', pondAllocations: [{ pondId: 'p1', amount: 100 }] })],
    revenues: [record({ amount: 'invalid' })],
  });
  assert.equal(result.totalProductionCost, 100);
  assert.equal(result.details.unallocatedCost, 90);
  assert.equal(result.details.pondRows[0].total, 10);
  assert.equal(result.details.missingCostCount, 1);
  assert.equal(result.details.missingRevenueAmountCount, 1);
});
test('COGS export uses isolated styles, escaped data, and explicit unavailable margin', () => {
  const { prepareCOGSData, generateCOGSHTML } = load(path.join(__dirname, 'generated/mobileCogsReport.ts'));
  const cogs = buildCogsReport(base());
  const data = prepareCOGSData('This Month', '2026-09-01', '2026-09-30', '<script>alert(1)</script>', 50, 100, 20, 30, 10, 0, { '<bad>': 150 }, 'USD', '$', cogs.details);
  assert.equal(data.totalCOGS, 190);
  const html = generateCOGSHTML(data, { backgroundBase64: '', logoBase64: '' }, 'en');
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('cogs-page'));
  assert.ok(!html.includes('class="section"'));
  assert.ok(html.includes('Gross Profit Margin</span><strong>N/A'));
  assert.ok(html.includes('COGS by pond'));
  assert.ok(html.includes('Revenue reconciliation'));
  assert.ok(html.includes('Unallocated production costs'));
});


test('reused physical pond identities cannot receive costs from another cycle', () => {
  const result = buildCogsReport({ ...base(), cycleScope: 'all',
    feedUsage: [record({ pondId: 'p1', pondCycleId: 'old-cycle-pond', totalCost: 90 })],
  });
  assert.equal(result.details.unallocatedCost, 90);
  assert.equal(result.details.pondRows.reduce((sum, row) => sum + row.total, 0), 0);
});

test('COGS enables lossless compression without changing other PDF defaults', () => {
  const exporter = fs.readFileSync(path.join(__dirname, 'mobilePdfExport.ts'), 'utf8');
  const page = fs.readFileSync(path.join(__dirname, '../app/dashboard/reports/financial/page.tsx'), 'utf8');
  assert.match(exporter, /compress = false/);
  assert.match(exporter, /jsPDF: \{\s*compress,/);
  assert.match(page, /compress: selectedReport === 'cogs'/);
});


test('COGS/kg includes main and sub-grade harvest and production carry-forward', () => {
  const { prepareCOGSData, generateCOGSHTML } = load(path.join(__dirname, 'generated/mobileCogsReport.ts'));
  const cogs = buildCogsReport({ ...base(), feedUsage: [record({ pondId: 'p1', totalCost: 100 })],
    harvests: [{ id: 'h1', date: '2026-09-09', cycleId: 'c1', ponds: [{ pondId: 'p1', biomass: 8, price: 20, subBiomass: 2, subPrice: 10 }] }],
  });
  assert.equal(cogs.details.harvestedKg, 10);
  const data = prepareCOGSData('Period', '2026-09-01', '2026-09-09', 'Test', 30, cogs.purchases, cogs.directLabor, cogs.directMaterials, 10, cogs.revenue, cogs.categoryBreakdown, 'USD', '$', cogs.details);
  assert.equal(data.totalCOGS / cogs.details.harvestedKg, 12);
  const html = generateCOGSHTML(data, { backgroundBase64: '', logoBase64: '' }, 'en');
  assert.ok(html.includes('COGS per kg of harvested shrimp</span><strong>$ 12.00 / kg'));
  const empty = { ...data, details: { ...cogs.details, harvestedKg: 0 } };
  assert.ok(generateCOGSHTML(empty, { backgroundBase64: '', logoBase64: '' }, 'en').includes('COGS per kg of harvested shrimp</span><strong>N/A'));
});
