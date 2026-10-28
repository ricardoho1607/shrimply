/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), test = require('node:test'), ts = require('typescript');
const root = path.resolve(__dirname, '../../..'), cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (!path.extname(file)) file += fs.existsSync(file + '.ts') ? '.ts' : '.js';
  if (cache.has(file)) return cache.get(file).exports;
  const m = { exports: {} }; cache.set(file, m);
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('module', 'exports', 'require', js)(m, m.exports, name => name.startsWith('.') ? load(path.resolve(path.dirname(file), name)) : require(name));
  return m.exports;
}
const integrity = load(root + '/shared/reportingIntegrity.ts');
const snapshots = load(root + '/shared/reportSnapshots.ts');
const cycle = load(root + '/web/src/lib/cycleReport.ts');
const projection = load(root + '/shared/harvestProfitability.ts');
const daily = load(root + '/shared/dailyOperationsReport.ts');
const transactions = load(root + '/web/src/lib/generated/mobileTransactionHistoryReport.ts');
const pond = { id: 'p1', pondName: 'P1', cycleId: 'c1', docStart: '2026-08-01', initialPopulation: 100000, initialWeight: 0.5, pondArea: 1000, samplings: [] };
const base = { cycle: { id: 'c1', cycleName: 'C1', status: 'closed', closedAt: '2026-09-09' }, ponds: [pond], harvestRecords: [], feeds: [], additives: [], expenses: [], assets: [], includeComparison: false };
const assets = { backgroundBase64: '', logoBase64: '' };
test('cycle costs count Finance maintenance once and exclude capital and financing', () => {
  const report = cycle.buildWebCycleReport({ ...base, assets: [{ maintenanceHistory: [{ cycleId: 'c1', cost: 100 }] }], expenses: [{ cycleId: 'c1', category: 'Repairs', amount: 100 }, { cycleId: 'c1', category: 'Equipment', amount: 500 }, { cycleId: 'c1', category: 'Loan Payment', amount: 300 }] });
  assert.equal(report.totals.costs.total, 100);
  assert.equal(report.totals.costs.maintenance, 100);
  assert.ok(report.notes.some(note => note.key === 'maintenancePosting'));
});
test('cycle honors explicit ownership and signed stored corrections', () => {
  const usageHistory = [{ cycleId: 'c2', pondId: 'p1', quantity: 10, totalCost: 100 }, { cycleId: 'c1', quantity: 10, totalCost: 100 }, { cycleId: 'c1', quantity: -2, totalCost: -20 }];
  assert.equal(cycle.buildWebCycleReport({ ...base, feeds: [{ usageHistory }] }).totals.costs.feed, 80);
  assert.equal(integrity.savedUsageCost({ totalCost: 0, quantity: 10, unitPrice: 2 }), 0);
  assert.ok(Number.isNaN(integrity.savedUsageCost({ quantity: 10 })));
});
test('projection excludes manufacture transfers and includes only treatment application', () => {
  const costs = projection.buildPondProfitabilityCostSnapshot({ pond, ponds: [pond], feeds: [], additives: [{ usageHistory: [{ id: 'prep', date: '2026-08-10', source: 'treatmentMixProduction', quantity: 10, totalCost: 100 }, { id: 'apply', date: '2026-08-10', pondId: 'p1', cycleId: 'c1', source: 'treatmentMixApplication', quantity: 10, totalCost: 100 }] }], expenses: [{ id: 'capital', date: '2026-08-10', category: 'Equipment', amount: 500 }], startDate: '2026-08-01', endDate: '2026-09-09', timeZone: 'UTC' });
  assert.equal(costs.costsToDate.additives, 100); assert.equal(costs.costsToDate.generalExpenses, null, 'no recorded operating expense remains unknown rather than becoming zero');
});
test('historical snapshots exclude later harvests and future post-harvest state', () => {
  const harvests = [{ date: '2026-09-01', ponds: [{ pondId: 'p1', biomass: 400, size: 50 }] }];
  const current = { ...pond, totalHarvestedPopulation: 20000, totalHarvestedBiomass: 400, postHarvestBaselineDate: '2026-09-01', postHarvestRemainingBiomass: 900 };
  const before = snapshots.buildPondReportSnapshot(current, '2026-08-10', harvests, 'UTC');
  assert.equal(before.totalHarvestedPopulation, 0); assert.equal(before.postHarvestRemainingBiomass, null);
  assert.equal(snapshots.buildPondReportSnapshot(current, '2026-09-02', harvests, 'UTC').totalHarvestedPopulation, 20000);
  assert.throws(() => snapshots.buildPondReportSnapshot(current, '2026-08-10', [], 'UTC'), /history is missing/);
});
test('historical DOC respects farm date keys and midcycle baseline', () => {
  assert.equal(snapshots.reportCalculationOptions(pond, '2026-08-10', 'America/Los_Angeles').currentDoc, 9);
  assert.equal(snapshots.reportCalculationOptions({ ...pond, baselineDate: '2026-08-08', baselineDoc: 50 }, '2026-08-10', 'Asia/Jakarta').currentDoc, 52);
});
test('daily reports retain DO-only observations, measured zero ammonia, and dated populations', () => {
  const harvests = [{ date: '2026-09-01', ponds: [{ pondId: 'p1', biomass: 400, size: 50 }] }];
  const source = { ...pond, totalHarvestedPopulation: 20000, samplings: [{ date: '2026-08-10', doMorning: 3, doEvening: 4, ammonia: 0 }] };
  const report = daily.buildDailyOperationsReport({ reportDate: '2026-08-10', ponds: [source], harvests, timeZone: 'UTC' });
  assert.equal(report.siponRows[0].estimatedPopulation, 100000);
  assert.equal(report.waterQualityRows[0].doMorning, '3'); assert.equal(report.waterQualityRows[0].ammonia, '0');
  assert.ok(snapshots.pondExistsOnReportDate({ ...pond, cycleEndedAt: '2026-09-01' }, '2026-08-10'));
  assert.equal(snapshots.pondExistsOnReportDate({ ...pond, cycleEndedAt: '2026-09-01' }, '2026-09-02'), false);
});
test('register opening position uses recorded amounts, matching cycle and excluding voids', () => {
  const revenues = [{ date: '2026-08-01', amount: 100, voided: true }, { date: '2026-08-01', amount: '200', cycleId: 'c1' }, { date: '2026-08-01', amount: 300, cycleId: 'c2' }];
  assert.equal(integrity.transactionOpeningPosition({ revenues, expenses: [], startDateKey: '2026-09-01', cycleScope: 'c1' }), 200);
  assert.equal(integrity.transactionOpeningPosition({ revenues, expenses: [], startDateKey: '2026-09-01', cycleScope: 'all' }), 500);
});
test('transaction PDF includes source detail and confirmed/outstanding payments without changing totals', () => {
  const data = transactions.prepareTransactionHistoryData('Custom', '2026-09-01', '2026-09-09', 'Farm', 200, [{ id: 'e1', date: '2026-09-01', amount: 100, item: 'Feed pellets', reference: 'INVOICE-123', paymentType: 'Unconfirmed', settlements: [{ id: 'paid', date: '2026-09-02', amount: 40 }] }], [], 'USD', '$');
  const html = transactions.generateTransactionHistoryHTML(data, assets, 'en');
  assert.match(html, /Feed pellets/); assert.match(html, /INVOICE-123/); assert.match(html, /Confirmed: \$ 40\.00/); assert.match(html, /Outstanding: \$ 60\.00/);
  assert.doesNotMatch(html, /Unconfirmed/); assert.equal(data.closingBalance, 100);
});
test('projection template escapes untrusted report text before DOM insertion', () => {
  const source = fs.readFileSync(root + '/web/src/app/dashboard/projections/page.tsx', 'utf8');
  const code = source.slice(source.indexOf('  const generateProjectionHTML ='), source.indexOf('  const handleExport ='));
  const i18n = load(root + '/shared/pdfReportI18n.ts');
  const fn = new Function('currentLanguage', 'formatPdfDate', 'localizePdfHtml', 'formatCurrency', 'escapeReportText', 'formatNullableCurrency', ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText + '\nreturn generateProjectionHTML;')('en', i18n.formatPdfDate, i18n.localizePdfHtml, String, integrity.escapeReportText, value => value === null || value === undefined ? 'N/A' : String(value));
  const costs = { feed: 1, additives: 1, generalExpenses: 1 };
  const html = fn({ pondName: '<Farm>', companyName: '<Company>', insight: '<img src=x onerror=alert(1)>', operatingComparison: { decision: 'review_data', decisionReason: '<Reason>', costsToDate: costs, futureCosts: costs, feedDailyIncreaseRatePercent: 1, dailyMortalityRatePercent: 0.01 } });
  assert.doesNotMatch(html, /<img src=x/); assert.match(html, /&lt;img src=x/); assert.match(html, /&lt;Farm&gt;/);
  assert.match(source, /if \(!canExportReports \|\| !selectedPond/);
});

test('register rejects missing amounts and invalid payments, and excludes voided rows', () => {
  const prepare = (expenses) => transactions.prepareTransactionHistoryData('Custom', '2026-09-01', '2026-09-09', 'Farm', 0, expenses, [], 'USD', '$');
  assert.throws(() => prepare([{ id: 'bad', date: '2026-09-01', amount: null }]), /amount is missing/);
  assert.throws(() => prepare([{ id: 'bad', date: '2026-09-01', amount: 10, settlements: [{ id: 'p', date: '2026-09-01', amount: 20 }] }]), /invalid payment/);
  assert.equal(prepare([{ id: 'credit', date: '2026-09-01', amount: -10 }]).totalExpenses, -10);
  assert.equal(prepare([{ id: 'void', date: '2026-09-01', amount: 10, voided: true }]).transactions.length, 0);
});

test('daily PDF paginates all ponds with repeating headings and complete page numbering', () => {
  const report = daily.buildDailyOperationsReport({ reportDate: '2026-08-10', ponds: Array.from({ length: 25 }, (_, i) => ({ ...pond, id: `p${i}`, pondName: `QA pond ${i}`, samplings: [{ date: '2026-08-10', doMorning: 4, ammonia: 0 }] })) });
  const html = daily.generateDailyOperationsReportHTML(report, assets, 'en');
  assert.equal((html.match(/class="pdf-page/g) || []).length, 6);
  assert.match(html, /QA pond 24/);
  assert.match(html, /6 of 6/);
});

test('new accounting labels and the maintenance basis are localized as complete phrases', () => {
  const i18n = load(root + '/shared/pdfReportI18n.ts');
  const note = 'Maintenance includes Finance entries only. Asset maintenance history is not added again; post each maintenance cost once in Finance.';
  assert.match(i18n.localizePdfHtml(`<p>${note}</p>`, 'id'), /Biaya pemeliharaan hanya mencakup/);
  assert.doesNotMatch(i18n.localizePdfHtml(`<p>${note}</p>`, 'id'), /includes Finance/);
  assert.equal(i18n.localizePdfText('Recorded Income', 'id'), 'Pendapatan Tercatat');
});

test('an interim cycle report preserves ended pond results alongside active ponds', () => {
  const report = cycle.buildWebCycleReport({ ...base,
    cycle: { ...base.cycle, status: 'active', closedAt: undefined },
    ponds: [{ ...pond, cycleStatus: 'ended', cycleEndedAt: '2026-09-09', cycleEndReason: 'harvested' },
      { ...pond, id: 'p2', pondName: 'P2', cycleStatus: 'active' }],
    harvestRecords: [{ id: 'h1', cycleId: 'c1', date: '2026-09-09', ponds: [{ pondId: 'p1', harvestType: 'final', biomass: '100', size: '100', price: '10' }] }],
  });
  assert.equal(report.cycle.status, 'active');
  assert.equal(report.ponds.find(p => p.id === 'p1').status, 'ended');
  assert.equal(report.ponds.find(p => p.id === 'p1').harvestedBiomass, 100);
  assert.equal(report.ponds.find(p => p.id === 'p2').status, 'active');
  assert.ok(report.notes.some(n => n.key === 'cycleNotClosed'));
});

test('pond report includes only its own harvest, feed and saved expense allocations', () => {
  const ponds = [{ ...pond, cycleStatus: 'ended' }, { ...pond, id: 'p2', pondName: 'P2', cycleStatus: 'active' }];
  const report = cycle.buildWebCycleReport({ ...base, ponds, pondId: 'p1', cycle: { ...base.cycle, status: 'active' },
    harvestRecords: [{ id: 'h1', cycleId: 'c1', date: '2026-09-09', ponds: [{ pondId: 'p1', biomass: '100', price: '10', size: '100' }, { pondId: 'p2', biomass: '900', price: '20', size: '100' }] }],
    feeds: [{ usageHistory: [{ cycleId: 'c1', pondId: 'p1', totalCost: 10, quantity: 1 }, { cycleId: 'c1', pondId: 'p2', totalCost: 80, quantity: 1 }, { cycleId: 'c1', totalCost: 30, quantity: 1 }] }],
    expenses: [{ cycleId: 'c1', category: 'Salary', amount: 100, pondAllocations: [{ pondId: 'p1', cycleId: 'c1', amount: 40 }, { pondId: 'p2', cycleId: 'c1', amount: 60 }] }, { cycleId: 'c1', category: 'Salary', amount: 500 }],
  });
  assert.equal(report.ponds.length, 1);
  assert.equal(report.totals.harvestRevenue, 1000);
  assert.equal(report.totals.costs.feed, 10);
  assert.equal(report.totals.costs.manualExpenses, 40);
  assert.equal(report.totals.costs.total, 50);
});
