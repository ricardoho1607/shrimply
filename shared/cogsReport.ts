import { isDateKeyInRange } from './farmDate';
import { NON_PRODUCTION_CATEGORIES, NON_OPERATING_INCOME, isInventoryTransfer } from './financeIntegrity';
import { allocationCycleId, expenseMatchesCycle, expenseAmountForCycle, hasValidExpenseAllocations, requiresProductionAllocation, type ExpenseAllocationLink } from './financeExpenseAllocation';

export interface CogsPond {
  id: string;
  pondName: string;
  cycleId?: string | null;
  cycleName?: string;
  pondCycleId?: string | null;
}
type Allocation = ExpenseAllocationLink;
export interface CogsTransaction {
  id?: string;
  voided?: boolean;
  date?: string;
  amount?: number | string | null;
  category?: string;
  reference?: string;
  cycleId?: string;
  pondId?: string;
  pondCycleId?: string;
  pondAllocations?: Allocation[];
  allocationMethod?: string | null;
}
export interface CogsUsage extends Omit<CogsTransaction, 'amount'> { source?: string; totalCost?: number | string | null }
export interface CogsHarvest {
  id: string;
  voided?: boolean;
  date: string;
  cycleId?: string;
  ponds: { pondId?: string; pondCycleId?: string; cycleId?: string; biomass?: number | string; price?: number | string; subBiomass?: number | string; subPrice?: number | string }[];
}
export interface PondCogsRow {
  pondId: string;
  pondName: string;
  cycleName: string;
  feed: number;
  additives: number;
  labor: number;
  other: number;
  total: number;
  revenue: number;
  harvestedKg: number;
}
export interface CogsReportDetails {
  basis: 'consumption';
  scopeLabel: string;
  pondRows: PondCogsRow[];
  unallocatedCost: number;
  unallocatedRevenue: number;
  revenueRecordCount: number;
  harvestSales: number;
  harvestedKg: number;
  linkedHarvestRevenue: number;
  missingHarvestRevenueCount: number;
  mismatchedHarvestRevenueCount: number;
  duplicateHarvestRevenueCount: number;
  missingCostCount: number;
  missingRevenueAmountCount: number;
  excludedExpenseAmount: number;
}
const number = (value: unknown): number | null => {
  if (value == null || value === '') return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
};
const EXCLUDED = new Set(NON_PRODUCTION_CATEGORIES);

export function buildCogsReport(input: {
  ponds: CogsPond[];
  expenses: CogsTransaction[];
  revenues: CogsTransaction[];
  feedUsage: CogsUsage[];
  additiveUsage: CogsUsage[];
  harvests: CogsHarvest[];
  cycleScope: string;
  scopeLabel: string;
  startDateKey: string | null;
  endDateKey: string;
  timeZone?: string;
  normalizeCategory: (category: string) => string;
}) {
  const findPond = (record: { pondId?: string; pondCycleId?: string; cycleId?: string }) => input.ponds.find(pond =>
    (record.pondCycleId ? (pond.pondCycleId || pond.id) === record.pondCycleId : pond.id === record.pondId)
    && (!record.cycleId || pond.cycleId === record.cycleId));
  const inPeriod = (record: { date?: string; voided?: boolean }) => Boolean(!record.voided && record.date && isDateKeyInRange(record.date, input.startDateKey, input.endDateKey, input.timeZone));
  const inScope = (record: CogsTransaction) => expenseMatchesCycle(record, input.cycleScope, input.ponds);
  const rows = new Map<string, PondCogsRow>();
  input.ponds.filter(pond => input.cycleScope === 'all' || pond.cycleId === input.cycleScope).forEach(pond => rows.set(pond.id, {
    pondId: pond.id, pondName: pond.pondName, cycleName: pond.cycleName || pond.cycleId || 'Unassigned cycle',
    feed: 0, additives: 0, labor: 0, other: 0, total: 0, revenue: 0, harvestedKg: 0,
  }));
  const details: CogsReportDetails = {
    basis: 'consumption', scopeLabel: input.scopeLabel, pondRows: [], unallocatedCost: 0, unallocatedRevenue: 0,
    revenueRecordCount: 0, harvestSales: 0, harvestedKg: 0, linkedHarvestRevenue: 0, missingHarvestRevenueCount: 0,
    mismatchedHarvestRevenueCount: 0, duplicateHarvestRevenueCount: 0, missingCostCount: 0, missingRevenueAmountCount: 0, excludedExpenseAmount: 0,
  };
  const categoryBreakdown: Record<string, number> = {};
  const costs = { feed: 0, additives: 0, labor: 0, other: 0 };
  const addCost = (record: CogsTransaction, amount: number, bucket: keyof typeof costs, category: string) => {
    costs[bucket] += amount;
    categoryBreakdown[category] = (categoryBreakdown[category] || 0) + amount;
    let allocated = 0;
    const allocations = record.pondAllocations;
    // Invalid allocation totals are left unallocated instead of silently scaling or double counting them.
    if (allocations?.length && hasValidExpenseAllocations(record)) {
      for (const allocation of allocations) {
        const cycleId = allocationCycleId(allocation, record, input.ponds) || undefined;
        if (input.cycleScope !== 'all' && cycleId !== input.cycleScope) continue;
        const pond = findPond({ ...allocation, cycleId });
        const row = pond && rows.get(pond.id);
        if (!row || number(allocation.amount) === null) continue;
        const value = number(allocation.amount)!;
        row[bucket] += value;
        row.total += value;
        allocated += value;
      }
    } else if (!allocations?.length) {
      const pond = findPond(record);
      const row = pond && rows.get(pond.id);
      if (row) { row[bucket] += amount; row.total += amount; allocated = amount; }
    }
    details.unallocatedCost += amount - allocated;
  };
  for (const [usages, bucket, category] of [
    [input.feedUsage, 'feed', 'Feed consumed'], [input.additiveUsage, 'additives', 'Additives consumed'],
  ] as const) {
    for (const usage of usages.filter(record => !isInventoryTransfer(record) && inPeriod(record) && inScope(record))) {
      const cost = number(usage.totalCost);
      if (cost === null) { details.missingCostCount++; continue; }
      addCost(usage, cost, bucket, category);
    }
  }
  for (const expense of input.expenses.filter(record => inPeriod(record) && inScope(record))) {
    const amount = expenseAmountForCycle(expense, input.cycleScope, input.ponds);
    const category = input.normalizeCategory(expense.category || 'Uncategorised');
    if (expense.reference?.startsWith('INVENTORY-')) continue; // Stock purchases are represented by consumption.
    if ((!expense.cycleId && !findPond(expense)?.cycleId && !expense.pondAllocations?.length && !requiresProductionAllocation(expense)) || EXCLUDED.has(category)) {
      details.excludedExpenseAmount += amount ?? 0;
      continue;
    }
    if (amount === null) { details.missingCostCount++; continue; }
    if (requiresProductionAllocation(expense) && !hasValidExpenseAllocations(expense)) details.missingCostCount++;
    addCost(expense, amount, category === 'Feed' ? 'feed' : ['Labor', 'Salary'].includes(category) ? 'labor' : category === 'Pond Additives' ? 'additives' : 'other', category);
  }
  const revenues = input.revenues.filter(record => inPeriod(record) && inScope(record) && !NON_OPERATING_INCOME.includes(input.normalizeCategory(record.category || '')));
  const harvests = input.harvests.filter(inPeriod);
  const sale = (pond: CogsHarvest['ponds'][number]) => (number(pond.biomass) ?? 0) * (number(pond.price) ?? 0)
    + (number(pond.subBiomass) ?? 0) * (number(pond.subPrice) ?? 0);
  let revenue = 0;
  for (const record of revenues) {
    const amount = number(record.amount);
    if (amount === null) { details.missingRevenueAmountCount++; continue; }
    revenue += amount;
    details.revenueRecordCount++;
    const pond = findPond(record);
    const row = pond && rows.get(pond.id);
    if (row) { row.revenue += amount; continue; }
    const harvest = input.harvests.find(h => record.reference === `HARVEST-${h.id}`);
    const sales = harvest?.ponds.reduce((sum, p) => sum + sale(p), 0) ?? 0;
    if (harvest && Math.abs(sales - amount) < 0.01) {
      let assigned = 0;
      for (const line of harvest.ponds) {
        const source = findPond({ ...line, cycleId: line.cycleId || harvest.cycleId });
        const target = source && rows.get(source.id);
        if (target) { target.revenue += sale(line); assigned += sale(line); }
      }
      details.unallocatedRevenue += amount - assigned;
    } else details.unallocatedRevenue += amount;
  }
  for (const harvest of harvests) {
    const lines = harvest.ponds.filter(p => inScope({ ...p, cycleId: p.cycleId || harvest.cycleId }));
    if (!lines.length) continue;
    const sales = lines.reduce((sum, p) => sum + sale(p), 0);
    details.harvestSales += sales;
    details.harvestedKg += lines.reduce((sum, line) => sum + Math.max(0, number(line.biomass) ?? 0) + Math.max(0, number(line.subBiomass) ?? 0), 0);
    const linked = revenues.filter(r => r.reference === `HARVEST-${harvest.id}`);
    const linkedAmount = linked.reduce((sum, r) => sum + (number(r.amount) ?? 0), 0);
    details.linkedHarvestRevenue += linkedAmount;
    if (!linked.length && sales > 0) details.missingHarvestRevenueCount++;
    else if (Math.abs(linkedAmount - sales) >= 0.01) details.mismatchedHarvestRevenueCount++;
    if (linked.length > 1) details.duplicateHarvestRevenueCount++;
    for (const line of lines) {
      const source = findPond({ ...line, cycleId: line.cycleId || harvest.cycleId });
      const row = source && rows.get(source.id);
      if (row) row.harvestedKg += (number(line.biomass) ?? 0) + (number(line.subBiomass) ?? 0);
    }
  }
  details.pondRows = [...rows.values()].sort((a, b) => a.cycleName.localeCompare(b.cycleName, undefined, { numeric: true }) || a.pondName.localeCompare(b.pondName, undefined, { numeric: true }));
  return { purchases: costs.feed, directLabor: costs.labor, directMaterials: costs.additives + costs.other,
    totalProductionCost: costs.feed + costs.additives + costs.labor + costs.other, categoryBreakdown, revenue, details };
}
