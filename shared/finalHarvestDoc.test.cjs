const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getPondCurrentDoc } = require('./pondCalculations.ts');
const { applyHarvestImpactToPond, reverseHarvestImpactOnPond, withFinalHarvestDates } = require('./harvestCalculations.ts');
const { buildWebCycleReport } = require('../web/src/lib/cycleReport.ts');

const pond = { id: 'p1', pondName: 'Pond 1', cycleId: 'c1', pondCycleId: 'pc1', cycleStatus: 'active', docStart: '2026-07-01', cycleStartedAt: '2026-07-01', initialPopulation: 1000, initialWeight: 1, samplings: [] };
const final = { pondId: 'p1', harvestType: 'final', biomass: 10, size: 100, price: 5 };
const partial = { ...final, harvestType: 'partial' };

test('DOC stops at final harvest while the pond stays active and later records are added', () => {
  const harvested = applyHarvestImpactToPond(pond, final, '2026-07-31');
  assert.equal(harvested.cycleStatus, 'active');
  assert.equal(getPondCurrentDoc(harvested, 'UTC', '2026-08-15'), 30);
  assert.equal(getPondCurrentDoc({ ...harvested, cycleEndedAt: '2026-08-20', samplings: [{ date: '2026-08-15', feed: 1 }] }, 'UTC', '2026-09-01'), 30);
  assert.equal(getPondCurrentDoc(harvested, 'UTC', '2026-07-20'), 19, 'historical DOC remains historical');
  assert.equal(getPondCurrentDoc(applyHarvestImpactToPond(pond, partial, '2026-07-31'), 'UTC', '2026-08-15'), 45, 'partial harvest keeps counting');
  assert.equal(getPondCurrentDoc({ ...harvested, baselineDate: '2026-07-11', baselineDoc: 20 }, 'UTC', '2026-08-15'), 40, 'midcycle baseline is preserved');
});

test('editing or voiding final harvest updates DOC and preserves other finals', () => {
  const harvested = applyHarvestImpactToPond(pond, final, '2026-07-31');
  const reversed = reverseHarvestImpactOnPond(harvested, final, '2026-07-31');
  assert.equal(getPondCurrentDoc(reversed, 'UTC', '2026-08-15'), 45);
  assert.equal(getPondCurrentDoc(applyHarvestImpactToPond(reversed, final, '2026-08-02'), 'UTC', '2026-08-15'), 32);
  const twice = applyHarvestImpactToPond(harvested, final, '2026-08-02');
  assert.equal(getPondCurrentDoc(reverseHarvestImpactOnPond(twice, final, '2026-07-31'), 'UTC', '2026-08-15'), 32);
  assert.equal(getPondCurrentDoc(reverseHarvestImpactOnPond(twice, final, '2026-08-02'), 'UTC', '2026-08-15'), 30);
});

test('ponds in the same cycle stop DOC on their own final harvest dates', () => {
  const secondPond = { ...pond, id: 'p2', pondName: 'Pond 2', pondCycleId: 'pc2' };
  const secondFinal = { ...final, pondId: 'p2', pondCycleId: 'pc2' };
  const firstHarvested = applyHarvestImpactToPond(pond, final, '2026-07-31');
  const secondHarvested = applyHarvestImpactToPond(secondPond, secondFinal, '2026-08-02');
  assert.equal(getPondCurrentDoc(firstHarvested, 'UTC', '2026-08-20'), 30);
  assert.equal(getPondCurrentDoc(secondHarvested, 'UTC', '2026-08-20'), 32);

  const correctedFirst = applyHarvestImpactToPond(
    reverseHarvestImpactOnPond(firstHarvested, final, '2026-07-31'), final, '2026-08-01',
  );
  assert.equal(getPondCurrentDoc(correctedFirst, 'UTC', '2026-08-20'), 31);
  assert.equal(getPondCurrentDoc(secondHarvested, 'UTC', '2026-08-20'), 32);

  const report = buildWebCycleReport({
    cycle: { id: 'c1', cycleName: 'Cycle 1', status: 'closed', closedAt: '2026-08-20' },
    ponds: [pond, secondPond],
    harvestRecords: [
      { id: 'h1', date: '2026-08-01', cycleId: 'c1', ponds: [final] },
      { id: 'h2', date: '2026-08-02', cycleId: 'c1', ponds: [secondFinal] },
    ],
    feeds: [], additives: [], expenses: [], assets: [], timeZone: 'UTC', includeComparison: false,
  });
  assert.equal(report.ponds.find((entry) => entry.id === 'p1').doc, 31);
  assert.equal(report.ponds.find((entry) => entry.id === 'p2').doc, 32);
  const { buildCycleReport } = require('../app/services/cycleReportService.ts');
  const { calculatePondMetricsWithHarvest } = require('./pondCalculations.ts');
  const mobileReport = buildCycleReport({
    cycleId: 'c1', cycles: [report.cycle], ponds: [pond, secondPond],
    harvestRecords: report.harvestRecords, feeds: [], additives: [], expenses: [], assets: [],
    calculatePondMetricsWithHarvest, includeComparison: false,
  });
  assert.equal(mobileReport.ponds.find((entry) => entry.id === 'p1').doc, 31);
  assert.equal(mobileReport.ponds.find((entry) => entry.id === 'p2').doc, 32);
});

test('legacy final harvest resolution ignores voided records and other cycles', () => {
  const records = [
    { date: '2026-07-31', cycleId: 'c1', ponds: [final] },
    { date: '2026-08-02', cycleId: 'c1', voided: true, ponds: [final] },
    { date: '2026-08-05', cycleId: 'other', ponds: [final] },
  ];
  assert.deepEqual(withFinalHarvestDates(pond, records).finalHarvestDates, ['2026-07-31']);
});

test('cycle report uses final harvest end date and includes later additive and finance costs', () => {
  const result = buildWebCycleReport({
    cycle: { id: 'c1', cycleName: 'Cycle 1', status: 'closed', closedAt: '2026-08-20' },
    ponds: [{ ...pond, cycleEndedAt: '2026-08-20' }],
    harvestRecords: [{ id: 'h1', date: '2026-07-31', cycleId: 'c1', ponds: [final] }],
    feeds: [], additives: [{ usageHistory: [{ date: '2026-08-05', cycleId: 'c1', pondId: 'p1', quantity: 1, totalCost: 10 }] }],
    expenses: [{ id: 'e1', date: '2026-08-10', cycleId: 'c1', pondId: 'p1', category: 'Labor', amount: 20 }],
    assets: [], timeZone: 'UTC', includeComparison: false,
  });
  assert.equal(result.ponds[0].doc, 30);
  assert.equal(result.ponds[0].endedAt, '2026-07-31');
  assert.equal(result.totals.costs.additives, 10);
  assert.equal(result.totals.costs.manualExpenses, 20);
});

test('mobile cycle report keeps final DOC and includes expenses posted afterward', () => {
  const { buildCycleReport } = require('../app/services/cycleReportService.ts');
  const { calculatePondMetricsWithHarvest } = require('./pondCalculations.ts');
  const result = buildCycleReport({ cycleId: 'c1', cycles: [{ id: 'c1', cycleName: 'Cycle 1', status: 'closed', closedAt: '2026-08-20' }],
    ponds: [{ ...pond, cycleEndedAt: '2026-08-20' }], harvestRecords: [{ id: 'h1', date: '2026-07-31', cycleId: 'c1', ponds: [final] }],
    feeds: [], additives: [], assets: [], expenses: [{ id: 'e1', date: '2026-08-10', cycleId: 'c1', pondId: 'p1', category: 'Labor', amount: 20 }],
    calculatePondMetricsWithHarvest, includeComparison: false,
  });
  assert.equal(result.ponds[0].doc, 30);
  assert.equal(result.ponds[0].endedAt, '2026-07-31');
  assert.equal(result.totals.costs.manualExpenses, 20);
});

test('historical report snapshot caps later DOC at final harvest', () => {
  const { buildPondReportSnapshot, reportCalculationOptions } = require('./reportSnapshots.ts');
  const snapshot = buildPondReportSnapshot(pond, '2026-08-10', [{ id: 'h1', date: '2026-07-31', cycleId: 'c1', ponds: [final] }], 'UTC');
  assert.equal(reportCalculationOptions(snapshot, '2026-08-10', 'UTC').currentDoc, 30);
  assert.equal(reportCalculationOptions(snapshot, '2026-07-20', 'UTC').currentDoc, 19);
});
