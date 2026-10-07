import assert from 'node:assert/strict';
import test from 'node:test';
import { buildProductionAllocation, getActiveExpensePonds, getPlExpensePonds, productionExpenseFields, savedAllocationPonds, scopeExpenseRecords, productionAllocationMethod, hasValidExpenseAllocations, type ExpensePond } from './financeExpenseAllocation';
import { buildCogsReport } from './cogsReport';
import { buildProfitLoss, buildConfirmedCashFlow } from './financeReports';
import { buildPondProfitabilityCostSnapshot } from './harvestProfitability';
import { transactionOpeningPosition } from './reportingIntegrity';

const cycles = [{ id: 'c1', cycleName: 'Cycle A', status: 'active' }, { id: 'c2', cycleName: 'Cycle B', status: 'stocking' }];
const ponds: ExpensePond[] = [
  { id: 'p1', pondName: 'A1', pondCycleId: 'pc1', blockId: 'a', blockName: 'A', cycleId: 'c1', cycleName: 'Cycle A', pondArea: 1000, initialPopulation: 200000, cycleStatus: 'active', docStart: '2026-09-01' },
  { id: 'p2', pondName: 'B1', pondCycleId: 'pc2', blockId: 'b', blockName: 'B', cycleId: 'c2', cycleName: 'Cycle B', pondArea: 3000, initialPopulation: 300000, cycleStatus: 'active', docStart: '2026-09-01' },
];
const reportInput = { ponds: ponds.map(pond => ({ ...pond, cycleId: pond.cycleId || undefined, cycleName: pond.cycleName || undefined })), expenses: [], revenues: [], feedUsage: [], additiveUsage: [], harvests: [], cycleScope: 'all', scopeLabel: 'All', startDateKey: '2026-09-01', endDateKey: '2026-09-30', normalizeCategory: (category: string) => category };

test('PLN example includes twelve stocked ponds across two blocks and balances whole rupiah', () => {
  const farm: ExpensePond[] = ['a', 'b'].flatMap((block, index) => Array.from({ length: 8 }, (_, pondIndex) => ({ id: `${block}${pondIndex}`, pondName: `${block}${pondIndex}`, blockId: block, cycleId: cycles[index].id, cycleStatus: pondIndex < 6 ? 'active' : 'ended', pondArea: 5000, docStart: '2026-09-01' })));
  const targets = getActiveExpensePonds(farm, cycles, '2026-09-10');
  const result = buildProductionAllocation(80000000, 'active_pond_area', targets, {}, 0);
  assert.equal(targets.length, 12); assert.equal(result.blockCount, 2); assert.equal(result.totalBasis, 60000);
  assert.equal(result.rate, 80000000 / 60000);
  assert.equal(result.allocations.reduce((sum, row) => sum + row.amount, 0), 80000000);
  assert(result.allocations.every(row => Number.isInteger(row.amount)));
  assert.equal(result.allocations.filter(row => row.amount === 6666667).length, 8);
});

test('area shares use pond area rather than equal blocks, and exclude ended, future and closed cycles', () => {
  const farm = [...ponds, { ...ponds[0], id: 'ended', cycleStatus: 'ended' }, { ...ponds[0], id: 'future', docStart: '2026-10-01' }, { ...ponds[0], id: 'closed', cycleId: 'closed' }];
  const targets = getActiveExpensePonds(farm, [...cycles, { id: 'closed', cycleName: 'Old', status: 'closed' }], '2026-09-10');
  assert.deepEqual(targets.map(pond => pond.id), ['p1', 'p2']);
  assert.deepEqual(buildProductionAllocation(800, 'active_pond_area', targets).allocations.map(row => row.amount), [200, 600]);
  assert.equal(buildProductionAllocation(800, 'active_pond_area', [{ ...ponds[0], pondArea: undefined }]).error, 'missingArea');
  assert.equal(buildProductionAllocation(800, 'active_pond_area', []).error, 'noPonds');
});

test('PL uses only selected ponds and recorded quantities, with explicit valid invoice overrides', () => {
  assert.deepEqual(buildProductionAllocation(10000000, 'pl_quantity', ponds).allocations.map(row => row.amount), [4000000, 6000000]);
  assert.deepEqual(buildProductionAllocation(10000000, 'pl_quantity', ponds, { p1: '100000', p2: '100000' }).allocations.map(row => row.amount), [5000000, 5000000]);
  assert.equal(buildProductionAllocation(10000000, 'pl_quantity', [ponds[1]]).allocations[0].amount, 10000000);
  for (const value of ['', 'bad', '0', '-1', '1.5']) assert.equal(buildProductionAllocation(100, 'pl_quantity', [ponds[0]], { p1: value }).error, 'missingQuantity');
  assert.equal(buildProductionAllocation(100, 'pl_quantity', [{ ...ponds[0], initialPopulation: undefined }]).error, 'missingQuantity');
  assert.equal(getPlExpensePonds([{ ...ponds[0], cycleStatus: 'ended' }], cycles, '2026-09-10').length, 1, 'invoices can target documented earlier stockings');
});

test('each new category selects its intended method across supported languages', () => {
  for (const category of ['Utilities', 'Salary', 'Consumption', 'Solar', 'Bensin', 'Gaji', 'Konsumsi', 'แรงงาน', 'Tiện ích']) assert.equal(productionAllocationMethod(category), 'active_pond_area', category);
  for (const category of ['Seed / PL', 'Bibit / PL', '虾苗 / PL']) assert.equal(productionAllocationMethod(category), 'pl_quantity', category);
  assert.equal(productionAllocationMethod('Company-wide expense'), null);
  assert.equal(productionAllocationMethod('Equipment'), null);
});

test('expense ledger, HPP and P&L scope shared bills to the exact stored cycle shares', () => {
  const preview = buildProductionAllocation(800, 'active_pond_area', ponds);
  const expense = { id: 'pln', amount: 800, category: 'Utilities', date: '2026-09-10', ...productionExpenseFields(preview, 'active_pond_area', 'IDR', 0) };
  assert.equal(expense.cycleId, ''); assert(hasValidExpenseAllocations(expense));
  for (const [cycleScope, amount] of [['all', 800], ['c1', 200], ['c2', 600]] as const) {
    const input = { ...reportInput, expenses: [expense], cycleScope };
    const cogs = buildCogsReport(input);
    const pl = buildProfitLoss(input);
    assert.equal(cogs.totalProductionCost, amount); assert.equal(cogs.details.unallocatedCost, 0);
    assert.equal(cogs.details.pondRows.reduce((sum, row) => sum + row.total, 0), amount);
    assert.equal(pl.totalCOGS, amount); assert.equal(pl.totalOPEX, 0); assert.equal(pl.netProfit, -amount);
    assert.equal(scopeExpenseRecords([expense], cycleScope, ponds)[0].amount, amount);
  }
  assert.equal(scopeExpenseRecords([expense], 'unrelated', ponds).length, 0);
  assert.equal(transactionOpeningPosition({ expenses: [expense], revenues: [], cycleScope: 'c1', startDateKey: '2026-10-01' }), -200);
  const paid = { ...expense, settlements: [{ id: 'payment', amount: 800, date: '2026-09-11' }] };
  assert.equal(buildConfirmedCashFlow({ expenses: [paid], revenues: [], startDateKey: '2026-09-01', endDateKey: '2026-09-30', normalizeCategory: (value: string) => value }).operating.paymentForExpenses, 800, 'the cash invoice is paid once at company level');
});

test('saved shares survive harvests and PL remains a one-time projection cost', () => {
  const area = buildProductionAllocation(800, 'active_pond_area', ponds);
  const seed = buildProductionAllocation(10000000, 'pl_quantity', ponds);
  const expenses = [
    { id: 'utilities', date: '2026-09-10', category: 'Utilities', amount: 800, ...productionExpenseFields(area, 'active_pond_area', 'USD', 2) },
    { id: 'seed', date: '2026-09-01', category: 'Seed / PL', amount: 10000000, ...productionExpenseFields(seed, 'pl_quantity', 'IDR', 0) },
  ];
  const changed = ponds.map(pond => ({ ...pond, cycleStatus: 'ended', cycleEndedAt: '2026-09-04', pondArea: 99999 }));
  const snapshot = buildPondProfitabilityCostSnapshot({ pond: changed[0], ponds: changed, feeds: [], additives: [], expenses, startDate: '2026-09-01', endDate: '2026-09-30' });
  assert.equal(snapshot.costsToDate.generalExpenses, 200); assert.equal(snapshot.costsToDate.other, 4000000);
  assert.equal(snapshot.projectedDailyGeneralExpense, 6.67);
  assert.equal(savedAllocationPonds(expenses[0])![0].pondArea, 1000);
  assert.deepEqual(buildProductionAllocation(1200, 'active_pond_area', savedAllocationPonds(expenses[0])!).allocations.map(row => row.amount), [300, 900], 'editing the amount preserves the saved area basis');
  assert.equal(buildCogsReport({ ...reportInput, expenses }).totalProductionCost, 10000800);
});

test('invalid saved allocations stay visible as reconciliation errors rather than duplicate or guessed cost', () => {
  const preview = buildProductionAllocation(800, 'active_pond_area', ponds);
  const expense = { amount: 800, category: 'Utilities', date: '2026-09-10', ...productionExpenseFields(preview, 'active_pond_area', 'USD', 2), pondAllocations: [{ ...preview.allocations[0], amount: 900 }] };
  assert.equal(hasValidExpenseAllocations(expense), false);
  assert(Number.isNaN(scopeExpenseRecords([expense], 'c1', ponds)[0].amount));
  const report = buildCogsReport({ ...reportInput, expenses: [expense] });
  assert.equal(report.totalProductionCost, 800); assert.equal(report.details.unallocatedCost, 800);
  assert.equal(buildCogsReport({ ...reportInput, cycleScope: 'c1', expenses: [expense] }).details.missingCostCount, 1);
});

test('a damaged production invoice without its required snapshot cannot become guessed pond cost or duplicate overhead', () => {
  const expense = { id: 'damaged', date: '2026-09-10', amount: 800, category: 'Utilities', allocationMethod: 'active_pond_area', pondAllocations: [] };
  const pl = buildProfitLoss({ ...reportInput, expenses: [expense] });
  assert.equal(pl.totalCOGS, 800); assert.equal(pl.totalOPEX, 0); assert.equal(pl.details.unallocatedCost, 800); assert.equal(pl.details.missingCostCount, 1);
  const snapshot = buildPondProfitabilityCostSnapshot({ pond: ponds[0], ponds, feeds: [], additives: [], expenses: [expense], startDate: '2026-09-01', endDate: '2026-09-30' });
  assert.equal(snapshot.costsToDate.generalExpenses, null);
  assert(snapshot.warnings.some(warning => warning.includes('could not be allocated')));
});

test('legacy cycle allocations and company overhead keep their original report treatment', () => {
  const expenses = [{ date: '2026-09-10', amount: 60, category: 'Company-wide expense' }, { date: '2026-09-10', amount: 40, category: 'Utilities', cycleId: 'c1' }];
  const pl = buildProfitLoss({ ...reportInput, expenses });
  assert.equal(pl.totalCOGS, 40); assert.equal(pl.totalOPEX, 60);
  assert.equal(pl.details.unallocatedCost, 40);
});
