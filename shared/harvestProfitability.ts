import { isCycleOperatingExpense } from './reportingIntegrity';
import { differenceInFarmCalendarDays, normalizeFarmDateKey } from './farmDate';
import {
  daysToTargetMbwWithTapering,
  projectMbwWithTapering,
  calculatePondMetricsWithHarvest,
  getSamplingMbw,
  isBaselineSampling,
  type SharedPond,
  type PondMetricsWithHarvest,
} from './pondCalculations';
import { isInventoryTransfer, isRecordedInventoryReturn, monetaryValue } from './financeIntegrity';
import { hasValidExpenseAllocations, normalizeProductionExpenseCategory, requiresProductionAllocation, type ExpenseAllocationLink } from './financeExpenseAllocation';

export type HarvestDecision = 'harvest_now' | 'keep_growing' | 'review_data';

export interface ProfitabilityPond {
  id: string;
  name?: string | null;
  pondCycleId?: string | null;
  cycleId?: string | null;
  cycleStartedAt?: string | null;
  docStart?: string | null;
  cycleEndedAt?: string | null;
  cycleStatus?: 'active' | 'ended' | string | null;
}

export interface AllocatableCostRecord {
  id: string;
  date: string;
  amount: number;
  pondId?: string | null;
  pondCycleId?: string | null;
  cycleId?: string | null;
  pondAllocations?: ExpenseAllocationLink[];
  allocationMethod?: string | null;
  source: 'expense' | 'feed_usage' | 'additive_usage' | 'maintenance' | 'other';
}

export interface ExpenseCostLike {
  voided?: boolean;
  isVoid?: boolean;
  id: string;
  date?: string | null;
  amount?: number | string | null;
  category?: string | null;
  reference?: string | null;
  linkedInventory?: string | null;
  pondId?: string | null;
  pondCycleId?: string | null;
  cycleId?: string | null;
  pondAllocations?: ExpenseAllocationLink[];
  allocationMethod?: string | null;
}

export interface InventoryUsageCostLike {
  source?: string;
  type?: string;
  kind?: string;
  feedRecordId?: string;
  id?: string | null;
  date?: string | null;
  quantity?: number | string | null;
  unitPrice?: number | string | null;
  totalCost?: number | string | null;
  pondId?: string | null;
  pondCycleId?: string | null;
  cycleId?: string | null;
}

export interface PondCostAllocation {
  allocatedAmount: number;
  directAmount: number;
  sharedAmount: number;
  unallocatedAmount: number;
  includedRecordIds: string[];
  excludedInventoryPurchaseIds: string[];
}

export interface InventoryItemWithUsage {
  id: string;
  usageHistory?: InventoryUsageCostLike[] | null;
}

export interface MortalityRateRecordLike {
  date?: string | null;
  observationType?: 'estimated_total' | 'observed_recovered' | 'none_observed' | string | null;
  count?: number | string | null;
}

export interface PondProfitabilityCostSnapshot {
  recordedFeedCostSubtotal: number | null;
  feedCostCompleteness: 'complete' | 'partial' | 'unavailable';
  costsToDate: HarvestCostTotals;
  feedUnitCostPerKg: number | null;
  projectedDailyAdditiveCost: number | null;
  projectedDailyGeneralExpense: number | null;
  excludedInventoryPurchaseIds: string[];
  warnings: string[];
}

export interface PriceTier {
  sizeCountPerKg: number;
  pricePerKg: number;
}

export interface DailyFeedTotal {
  date: string;
  quantityKg: number;
}

export interface HarvestCostTotals {
  feed: number | null;
  additives: number | null;
  generalExpenses: number | null;
  other: number | null;
}

export interface HarvestProfitabilityScenario {
  kind: 'today' | 'target' | 'horizon';
  targetSizeCountPerKg: number;
  targetMbwG: number;
  daysFromNow: number;
  projectedPopulation: number;
  projectedSurvivalRatePercent: number;
  projectedBiomassKg: number;
  pricePerKg: number | null;
  revenue: number | null;
  futureFeedKg: number | null;
  impliedIncrementalFcr: number | null;
  futureCosts: HarvestCostTotals;
  totalCosts: HarvestCostTotals;
  operatingProfit: number | null;
  incrementalProfitVsToday: number | null;
}

export interface HarvestProfitabilityInput {
  currentPopulation: number;
  initialPopulation?: number | null;
  currentMbwG: number;
  currentSurvivalRatePercent?: number | null;
  adgGPerDay: number;
  historicalFcr?: number | null;
  dailyMortalityRatePercent?: number | null;
  fallbackDailyMortalityRatePercent?: number | null;
  recentDailyFeedTotals: DailyFeedTotal[];
  feedUnitCostPerKg: number | null;
  flatPricePerKg?: number | null;
  priceLadder: PriceTier[];
  costsToDate: HarvestCostTotals;
  projectedDailyAdditiveCost: number | null;
  projectedDailyGeneralExpense: number | null;
  projectedDailyOtherCost?: number | null;
  targetMbwG?: number | null;
  targetSizeCountPerKg?: number | null;
  hasValidSamplingMbw?: boolean;
  exactDaysFromNow?: number | null;
  maxProjectionDays?: number;
  timeZone?: string;
  now?: Date;
}

export interface HarvestProfitabilityResult {
  decision: HarvestDecision;
  decisionReason: string;
  currentSizeCountPerKg: number;
  currentPricePerKg: number | null;
  feedDailyIncreaseRatePercent: number;
  dailyMortalityRatePercent: number;
  today: HarvestProfitabilityScenario;
  targets: HarvestProfitabilityScenario[];
  bestScenario: HarvestProfitabilityScenario;
  warnings: string[];
}

const round = (value: number, decimals = 2): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const finite = (value: unknown): number | null => monetaryValue(value);

const nonNegative = (value: unknown): number => Math.max(0, finite(value) ?? 0);

const sumCosts = (costs: HarvestCostTotals): number | null =>
  Object.values(costs).some((value) => value === null || value === undefined)
    ? null
    : costs.feed! + costs.additives! + costs.generalExpenses! + costs.other!;

const addCost = (left: number | null, right: number | null): number | null =>
  left === null || right === null ? null : round(left + right);

const addCosts = (left: HarvestCostTotals, right: HarvestCostTotals): HarvestCostTotals => ({
  feed: addCost(left.feed, right.feed),
  additives: addCost(left.additives, right.additives),
  generalExpenses: addCost(left.generalExpenses, right.generalExpenses),
  other: addCost(left.other, right.other),
});

const validDate = (value: string | null | undefined, timeZone?: string): string | null =>
  normalizeFarmDateKey(value, timeZone);

export const isInventoryPurchaseExpense = (expense: ExpenseCostLike): boolean =>
  Boolean(
    expense.reference?.startsWith('INVENTORY-') ||
    expense.linkedInventory?.trim() ||
    String(expense.category || '').toLowerCase().includes('feed purchase')
  );

export const expenseToCostRecord = (expense: ExpenseCostLike, timeZone?: string): AllocatableCostRecord | null => {
  if (expense.voided === true || expense.isVoid === true || isInventoryPurchaseExpense(expense) || !isCycleOperatingExpense(expense)) return null;
  const date = validDate(expense.date, timeZone);
  const amount = finite(expense.amount);
  if (!date || amount === null || amount < 0) return null;

  return {
    id: expense.id,
    date,
    amount,
    pondId: expense.pondId,
    pondCycleId: expense.pondCycleId,
    cycleId: expense.cycleId,
    pondAllocations: expense.pondAllocations,
    allocationMethod: expense.allocationMethod,
    source: 'expense',
  };
};

export const inventoryUsageToCostRecord = (
  usage: InventoryUsageCostLike,
  source: 'feed_usage' | 'additive_usage',
  fallbackId: string,
  timeZone?: string,
): AllocatableCostRecord | null => {
  if (isInventoryTransfer(usage) || (usage as any).voided === true || (usage as any).isVoid === true) return null;
  const date = validDate(usage.date, timeZone);
  const quantity = finite(usage.quantity);
  const savedCost = finite(usage.totalCost);
  const unitPrice = finite(usage.unitPrice);
  const amount = savedCost !== null
    ? savedCost
    : quantity !== null && unitPrice !== null
      ? quantity * unitPrice
      : null;
  if (!date || amount === null || (amount < 0 && !isRecordedInventoryReturn(usage))) return null;

  return {
    id: usage.id || fallbackId,
    date,
    amount,
    pondId: usage.pondId,
    pondCycleId: usage.pondCycleId,
    cycleId: usage.cycleId,
    source,
  };
};

export const isPondActiveOnDate = (
  pond: ProfitabilityPond,
  dateInput: string,
  timeZone?: string,
): boolean => {
  const date = validDate(dateInput, timeZone);
  const start = validDate(pond.cycleStartedAt || pond.docStart, timeZone);
  const end = validDate(pond.cycleEndedAt, timeZone);
  if (!date) return false;
  if (start && date < start) return false;
  if (end && date > end) return false;
  if (!end && pond.cycleStatus === 'ended') return false;
  return true;
};

const recordDirectlyMatchesPond = (record: AllocatableCostRecord, pond: ProfitabilityPond): boolean => {
  if (record.pondCycleId) return Boolean(pond.pondCycleId) && record.pondCycleId === pond.pondCycleId;
  if (!record.pondId || record.pondId !== pond.id) return false;
  return !record.cycleId || !pond.cycleId || record.cycleId === pond.cycleId;
};

const eligibleSharedPonds = (
  record: AllocatableCostRecord,
  ponds: ProfitabilityPond[],
  timeZone?: string,
): ProfitabilityPond[] => ponds.filter((pond) =>
  isPondActiveOnDate(pond, record.date, timeZone) &&
  (!record.cycleId || pond.cycleId === record.cycleId)
);

export const allocateCostsToPond = ({
  pond,
  ponds,
  records,
  startDate,
  endDate,
  excludedInventoryPurchaseIds = [],
  timeZone,
}: {
  pond: ProfitabilityPond;
  ponds: ProfitabilityPond[];
  records: AllocatableCostRecord[];
  startDate?: string | null;
  endDate?: string | null;
  excludedInventoryPurchaseIds?: string[];
  timeZone?: string;
}): PondCostAllocation => {
  const normalizedStart = validDate(startDate, timeZone);
  const normalizedEnd = validDate(endDate, timeZone);
  let directAmount = 0;
  let sharedAmount = 0;
  let unallocatedAmount = 0;
  const includedRecordIds: string[] = [];

  records.forEach((record) => {
    if (normalizedStart && record.date < normalizedStart) return;
    if (normalizedEnd && record.date > normalizedEnd) return;

    // Explicit invoice shares are historical records, even after the farm's active pond set changes.
    if (record.pondAllocations?.length || requiresProductionAllocation(record)) {
      if (!hasValidExpenseAllocations(record)) { unallocatedAmount += record.amount; return; }
      const allocation = record.pondAllocations?.find(row => row.pondCycleId
        ? row.pondCycleId === (pond.pondCycleId || pond.id)
        : row.pondId === pond.id && (!row.cycleId || row.cycleId === pond.cycleId));
      if (allocation) { directAmount += Number(allocation.amount); includedRecordIds.push(record.id); }
      return;
    }

    if (record.pondId || record.pondCycleId) {
      if (recordDirectlyMatchesPond(record, pond)) {
        directAmount += record.amount;
        includedRecordIds.push(record.id);
      }
      return;
    }

    const eligiblePonds = eligibleSharedPonds(record, ponds, timeZone);
    if (eligiblePonds.length === 0) {
      unallocatedAmount += record.amount;
      return;
    }
    if (eligiblePonds.some((candidate) => candidate.id === pond.id && (
      !pond.pondCycleId || !candidate.pondCycleId || candidate.pondCycleId === pond.pondCycleId
    ))) {
      sharedAmount += record.amount / eligiblePonds.length;
      includedRecordIds.push(record.id);
    }
  });

  return {
    allocatedAmount: round(directAmount + sharedAmount),
    directAmount: round(directAmount),
    sharedAmount: round(sharedAmount),
    unallocatedAmount: round(unallocatedAmount),
    includedRecordIds,
    excludedInventoryPurchaseIds,
  };
};

const flattenUsageRecords = (
  items: InventoryItemWithUsage[],
  source: 'feed_usage' | 'additive_usage',
  timeZone?: string,
): AllocatableCostRecord[] => items.flatMap((item) =>
  (item.usageHistory || []).map((usage, index) => inventoryUsageToCostRecord(
    usage,
    source,
    `${item.id}:usage:${index}`,
    timeZone,
  )).filter((record): record is AllocatableCostRecord => record !== null)
);

export const buildPondProfitabilityCostSnapshot = ({
  pond,
  ponds,
  feeds,
  additives,
  expenses,
  startDate,
  endDate,
  timeZone,
}: {
  pond: ProfitabilityPond;
  ponds: ProfitabilityPond[];
  feeds: InventoryItemWithUsage[];
  additives: InventoryItemWithUsage[];
  expenses: ExpenseCostLike[];
  startDate: string;
  endDate: string;
  timeZone?: string;
}): PondProfitabilityCostSnapshot => {
  const excludedInventoryPurchaseIds = expenses.filter(isInventoryPurchaseExpense).map((expense) => expense.id);
  const isPlExpense = (expense: ExpenseCostLike) => normalizeProductionExpenseCategory(expense.category || '') === 'Seed / PL';
  const expenseRecords = expenses.filter(expense => !isPlExpense(expense))
    .map((expense) => expenseToCostRecord(expense, timeZone))
    .filter((record): record is AllocatableCostRecord => record !== null);
  const plRecords = expenses.filter(isPlExpense)
    .map(expense => expenseToCostRecord(expense, timeZone))
    .filter((record): record is AllocatableCostRecord => record !== null);
  const feedRecords = flattenUsageRecords(feeds, 'feed_usage', timeZone);
  const additiveRecords = flattenUsageRecords(additives, 'additive_usage', timeZone);
  const allocationInput = { pond, ponds, startDate, endDate, timeZone };
  const expenseAllocation = allocateCostsToPond({ ...allocationInput, records: expenseRecords, excludedInventoryPurchaseIds });
  const plAllocation = allocateCostsToPond({ ...allocationInput, records: plRecords });
  const feedAllocation = allocateCostsToPond({ ...allocationInput, records: feedRecords });
  const additiveAllocation = allocateCostsToPond({ ...allocationInput, records: additiveRecords });

  const feedQuantityRecords = feeds.flatMap((item) =>
    (item.usageHistory || []).reduce<AllocatableCostRecord[]>((records, usage, index) => {
      if (isInventoryTransfer(usage) || (usage as any).voided === true || (usage as any).isVoid === true) return records;
      const date = validDate(usage.date, timeZone);
      const quantity = finite(usage.quantity);
      if (!date || quantity === null || quantity === 0 || (quantity < 0 && !isRecordedInventoryReturn(usage))) return records;
      records.push({
        id: usage.id || `${item.id}:quantity:${index}`,
        date,
        amount: quantity,
        pondId: usage.pondId,
        pondCycleId: usage.pondCycleId,
        cycleId: usage.cycleId,
        source: 'feed_usage' as const,
      });
      return records;
    }, [])
  );
  const feedQuantityAllocation = allocateCostsToPond({ ...allocationInput, records: feedQuantityRecords });
  const elapsedDays = Math.max(1, differenceInFarmCalendarDays(endDate, startDate) + 1);
  const warnings: string[] = [];
  if (feedAllocation.allocatedAmount > 0 && feedQuantityAllocation.allocatedAmount <= 0) {
    warnings.push('Consumed feed cost exists, but its allocated quantity is missing.');
  }
  if (feedQuantityAllocation.allocatedAmount > 0 && feedAllocation.includedRecordIds.length === 0) {
    warnings.push('Consumed feed quantity exists, but its allocated cost is missing.');
  }
  if (expenseAllocation.unallocatedAmount > 0 || additiveAllocation.unallocatedAmount > 0 || plAllocation.unallocatedAmount > 0) {
    warnings.push('Some costs could not be allocated. Review saved pond shares and the ponds active on the record date.');
  }
  if (excludedInventoryPurchaseIds.length > 0) {
    warnings.push('Inventory stock-in purchases were excluded; only consumed feed and additive usage is counted.');
  }

  // Allocate missing valuations with the same cycle/pond rules as priced rows.
  // A known subtotal is evidence, never a complete cost or unit-price denominator.
  const allocatedUsageGap = (items: InventoryItemWithUsage[], source: 'feed_usage' | 'additive_usage', missingQuantity = false) =>
    allocateCostsToPond({ ...allocationInput, records: items.flatMap(item =>
      (item.usageHistory || []).flatMap((usage, index): AllocatableCostRecord[] => {
        if (isInventoryTransfer(usage) || (usage as any).voided || (usage as any).isVoid) return [];
        const priced = inventoryUsageToCostRecord(usage, source, `${item.id}:${index}`, timeZone);
        const quantity = finite(usage.quantity);
        const hasQuantity = quantity !== null && (quantity > 0 || (quantity < 0 && isRecordedInventoryReturn(usage)));
        if (missingQuantity ? !priced || hasQuantity || priced.amount === 0 : quantity === 0 || priced) return [];
        const date = validDate(usage.date, timeZone);
        return date ? [{ id: `${item.id}:gap:${index}`, date, amount: 1, pondId: usage.pondId,
          pondCycleId: usage.pondCycleId, cycleId: usage.cycleId, source }] : [];
      })) }).allocatedAmount > 0;
  const feedHasUnpricedUsage = allocatedUsageGap(feeds, 'feed_usage');
  const additiveHasUnpricedUsage = allocatedUsageGap(additives, 'additive_usage');
  if (feedHasUnpricedUsage) warnings.push('Consumed feed includes unpriced usage; complete feed cost and unit cost are unavailable.');
  if (additiveHasUnpricedUsage) warnings.push('Consumed additives include unpriced usage; complete additive cost is unavailable.');

  const feedHasMissingQuantity = allocatedUsageGap(feeds, 'feed_usage', true);
  if (feedHasMissingQuantity) warnings.push('Some priced feed usage has no quantity; unit cost is unavailable.');
  const missingExpenseAmountRecords = expenses.filter(expense => !isInventoryPurchaseExpense(expense) &&
    !expense.voided && !expense.isVoid && isCycleOperatingExpense(expense) &&
    (finite(expense.amount) === null || (finite(expense.amount) ?? 0) < 0))
    .map(expense => expenseToCostRecord({ ...expense, amount: 1, pondAllocations: undefined, allocationMethod: undefined }, timeZone))
    .filter((record): record is AllocatableCostRecord => record !== null);
  const hasMissingExpenseAmounts = allocateCostsToPond({ ...allocationInput, records: missingExpenseAmountRecords }).allocatedAmount > 0;
  if (hasMissingExpenseAmounts) warnings.push('Some operating-expense amounts are missing; complete operating cost is unavailable.');
  const hasRecordedFeedCost = feedAllocation.includedRecordIds.length > 0;
  const calculatedFeedUnitCost = feedQuantityAllocation.allocatedAmount > 0 && hasRecordedFeedCost && !feedHasUnpricedUsage && !feedHasMissingQuantity
    ? round(feedAllocation.allocatedAmount / feedQuantityAllocation.allocatedAmount, 4)
    : null;

  const incurredFeedCost = hasRecordedFeedCost && !feedHasUnpricedUsage ? feedAllocation.allocatedAmount : null;
  const incurredAdditiveCost = additiveAllocation.includedRecordIds.length > 0 && !additiveHasUnpricedUsage ? additiveAllocation.allocatedAmount : null;
  const incurredGeneralExpense = expenseAllocation.includedRecordIds.length > 0 && !hasMissingExpenseAmounts ? expenseAllocation.allocatedAmount : null;
  if (incurredAdditiveCost === null) warnings.push('Recorded additive costs are unavailable for this pond and period.');
  if (incurredGeneralExpense === null) warnings.push('Recorded operating expenses are unavailable for this pond and period.');
  if (feedQuantityAllocation.allocatedAmount > 0 && !hasRecordedFeedCost) {
    warnings.push('Feed consumption is recorded without a supported cost value.');
  }

  return {
    costsToDate: {
      feed: incurredFeedCost,
      additives: incurredAdditiveCost,
      generalExpenses: incurredGeneralExpense,
      // Seed is incurred once at stocking, rather than extrapolated as a daily operating cost.
      other: plAllocation.allocatedAmount,
    },
    recordedFeedCostSubtotal: hasRecordedFeedCost ? feedAllocation.allocatedAmount : null,
    feedCostCompleteness: feedHasUnpricedUsage ? 'partial' : hasRecordedFeedCost ? 'complete' : 'unavailable',
    feedUnitCostPerKg: calculatedFeedUnitCost,
    projectedDailyAdditiveCost: incurredAdditiveCost === null ? null : round(incurredAdditiveCost / elapsedDays),
    projectedDailyGeneralExpense: incurredGeneralExpense === null ? null : round(incurredGeneralExpense / elapsedDays),
    excludedInventoryPurchaseIds,
    warnings,
  };
};

export const calculateRecordedDailyMortalityRate = ({
  records,
  currentPopulation,
  now = new Date(),
  lookbackDays = 7,
  timeZone,
}: {
  records: MortalityRateRecordLike[];
  currentPopulation: number;
  now?: Date;
  lookbackDays?: number;
  timeZone?: string;
}): { dailyRatePercent: number; recordedDays: number; estimatedDeaths: number } => {
  const today = normalizeFarmDateKey(now, timeZone);
  if (!today || currentPopulation <= 0) return { dailyRatePercent: 0, recordedDays: 0, estimatedDeaths: 0 };
  const dailyCounts = new Map<string, number>();
  records.forEach((record) => {
    const date = validDate(record.date, timeZone);
    if (!date) return;
    const age = differenceInFarmCalendarDays(today, date);
    if (age < 0 || age >= lookbackDays) return;
    const count = record.observationType === 'estimated_total' ? nonNegative(record.count) : 0;
    dailyCounts.set(date, (dailyCounts.get(date) || 0) + count);
  });
  const estimatedDeaths = Array.from(dailyCounts.values()).reduce((sum, count) => sum + count, 0);
  const recordedDays = dailyCounts.size;
  const populationBeforeRecentDeaths = currentPopulation + estimatedDeaths;
  const dailyRatePercent = recordedDays > 0 && populationBeforeRecentDeaths > 0
    ? (estimatedDeaths / populationBeforeRecentDeaths / recordedDays) * 100
    : 0;
  return {
    dailyRatePercent: round(dailyRatePercent, 4),
    recordedDays,
    estimatedDeaths: round(estimatedDeaths, 0),
  };
};

export const buildDailyFeedTotalsForPond = (
  feeds: InventoryItemWithUsage[],
  pondId: string,
  timeZone?: string,
): DailyFeedTotal[] => {
  const totals = new Map<string, number>();
  feeds.forEach((feed) => {
    (feed.usageHistory || []).forEach((usage) => {
      if (usage.pondId !== pondId) return;
      if (isInventoryTransfer(usage)) return;
      if ((usage as any).voided === true || (usage as any).isVoid === true) return;
      const date = validDate(usage.date, timeZone);
      const quantity = finite(usage.quantity);
      if (!date || quantity === null || quantity === 0) return;
      totals.set(date, (totals.get(date) || 0) + quantity);
    });
  });
  return Array.from(totals, ([date, quantityKg]) => ({ date, quantityKg: round(Math.max(0, quantityKg), 3) }))
    .filter((entry) => entry.quantityKg > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
};

const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
};

export const calculateDailyFeedIncreaseRate = (
  totals: DailyFeedTotal[],
  timeZone?: string,
  now: Date = new Date(),
): number => {
  const today = normalizeFarmDateKey(now, timeZone);
  if (!today) return 0;
  const recent = totals
    .map((entry) => ({
      date: validDate(entry.date, timeZone),
      quantityKg: nonNegative(entry.quantityKg),
    }))
    .filter((entry): entry is { date: string; quantityKg: number } => Boolean(entry.date) && entry.quantityKg > 0)
    .filter((entry) => {
      const age = differenceInFarmCalendarDays(today, entry.date);
      return age >= 0 && age <= 7;
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-5);

  const dailyRates: number[] = [];
  for (let index = 1; index < recent.length; index += 1) {
    const previous = recent[index - 1];
    const current = recent[index];
    const days = differenceInFarmCalendarDays(current.date, previous.date);
    if (days <= 0 || previous.quantityKg <= 0) continue;
    const dailyRate = (current.quantityKg / previous.quantityKg) ** (1 / days) - 1;
    if (Number.isFinite(dailyRate)) dailyRates.push(Math.min(0.25, Math.max(-0.25, dailyRate)));
  }

  return round(median(dailyRates), 4);
};

const projectFeedKg = (startingDailyFeedKg: number, dailyRate: number, days: number): number => {
  let total = 0;
  let dailyFeed = Math.max(0, startingDailyFeedKg);
  for (let day = 0; day < days; day += 1) {
    dailyFeed = Math.max(0, dailyFeed * (1 + dailyRate));
    total += dailyFeed;
  }
  return round(total, 3);
};

const normalizePriceLadder = (tiers: PriceTier[]): PriceTier[] => {
  const bySize = new Map<number, number>();
  tiers.forEach((tier) => {
    const size = finite(tier.sizeCountPerKg);
    const price = finite(tier.pricePerKg);
    if (size === null || price === null || size < 20 || size > 300 || price <= 0) return;
    bySize.set(round(size, 1), price);
  });
  return Array.from(bySize, ([sizeCountPerKg, pricePerKg]) => ({ sizeCountPerKg, pricePerKg }))
    .sort((a, b) => b.sizeCountPerKg - a.sizeCountPerKg);
};

export const resolvePriceForSize = (sizeCountPerKg: number, tiers: PriceTier[]): number | null => {
  if (tiers.length === 0 || !Number.isFinite(sizeCountPerKg) || sizeCountPerKg <= 0) return null;
  const nearest = [...tiers].sort((left, right) =>
    Math.abs(left.sizeCountPerKg - sizeCountPerKg) - Math.abs(right.sizeCountPerKg - sizeCountPerKg)
  )[0];
  return nearest && Math.abs(nearest.sizeCountPerKg - sizeCountPerKg) <= 10
    ? nearest.pricePerKg
    : null;
};

const buildScenario = ({
  kind,
  targetSizeCountPerKg,
  daysFromNow,
  input,
  dailyFeedRate,
  startingDailyFeedKg,
  mortalityRate,
  pricePerKg,
  todayProfit,
}: {
  kind: 'today' | 'target' | 'horizon';
  targetSizeCountPerKg: number;
  daysFromNow: number;
  input: HarvestProfitabilityInput;
  dailyFeedRate: number;
  startingDailyFeedKg: number;
  mortalityRate: number;
  pricePerKg: number | null;
  todayProfit: number | null;
}): HarvestProfitabilityScenario => {
  const targetMbwG = kind === 'today' ? input.currentMbwG : 1000 / targetSizeCountPerKg;
  const projectedPopulation = Math.max(0, input.currentPopulation * ((1 - mortalityRate) ** daysFromNow));
  const projectedSurvivalRatePercent = input.initialPopulation && input.initialPopulation > 0
    ? (projectedPopulation / input.initialPopulation) * 100
    : input.currentSurvivalRatePercent !== null && input.currentSurvivalRatePercent !== undefined && input.currentSurvivalRatePercent > 0
      ? input.currentSurvivalRatePercent * ((1 - mortalityRate) ** daysFromNow)
      : 0;
  const projectedBiomassKg = (projectedPopulation * targetMbwG) / 1000;
  const currentBiomassKg = (input.currentPopulation * input.currentMbwG) / 1000;
  const biomassGainKg = projectedBiomassKg - currentBiomassKg;
  const trendProjectedFeedKg = projectFeedKg(startingDailyFeedKg, dailyFeedRate, daysFromNow);
  const fcrBasedFeedKg = daysFromNow > 0 && biomassGainKg > 0 && input.historicalFcr && input.historicalFcr > 0
    ? biomassGainKg * input.historicalFcr
    : 0;
  const hasFeedProjectionBasis = startingDailyFeedKg > 0 || (input.historicalFcr !== null && input.historicalFcr !== undefined && input.historicalFcr > 0);
  const futureFeedKg = daysFromNow === 0
    ? 0
    : hasFeedProjectionBasis
      ? round(Math.max(trendProjectedFeedKg, fcrBasedFeedKg), 3)
      : null;
  const impliedIncrementalFcr = futureFeedKg !== null && daysFromNow > 0 && biomassGainKg > 0
    ? futureFeedKg / biomassGainKg
    : null;
  const futureCosts: HarvestCostTotals = {
    feed: futureFeedKg !== null && input.feedUnitCostPerKg !== null
      ? round(futureFeedKg * nonNegative(input.feedUnitCostPerKg))
      : null,
    additives: daysFromNow === 0 ? 0 : input.projectedDailyAdditiveCost === null
      ? null : round(nonNegative(input.projectedDailyAdditiveCost) * daysFromNow),
    generalExpenses: daysFromNow === 0 ? 0 : input.projectedDailyGeneralExpense === null
      ? null : round(nonNegative(input.projectedDailyGeneralExpense) * daysFromNow),
    other: daysFromNow === 0 ? 0 : input.projectedDailyOtherCost === undefined
      ? 0
      : input.projectedDailyOtherCost === null
        ? null : round(nonNegative(input.projectedDailyOtherCost) * daysFromNow),
  };
  const totalCosts = addCosts(input.costsToDate, futureCosts);
  const revenue = pricePerKg === null ? null : round(projectedBiomassKg * pricePerKg);
  const totalCostAmount = sumCosts(totalCosts);
  const operatingProfit = revenue === null || totalCostAmount === null ? null : round(revenue - totalCostAmount);

  return {
    kind,
    targetSizeCountPerKg: round(targetSizeCountPerKg, 1),
    targetMbwG: round(targetMbwG, 2),
    daysFromNow,
    projectedPopulation: round(projectedPopulation, 0),
    projectedSurvivalRatePercent: round(projectedSurvivalRatePercent, 2),
    projectedBiomassKg: round(projectedBiomassKg, 2),
    pricePerKg: pricePerKg === null ? null : round(pricePerKg),
    revenue,
    futureFeedKg,
    impliedIncrementalFcr: impliedIncrementalFcr === null ? null : round(impliedIncrementalFcr, 3),
    futureCosts,
    totalCosts,
    operatingProfit,
    incrementalProfitVsToday: operatingProfit === null || todayProfit === null
      ? null : round(operatingProfit - todayProfit),
  };
};

export const calculateHarvestProfitability = (
  input: HarvestProfitabilityInput,
): HarvestProfitabilityResult => {
  const warnings: string[] = [];
  const priceLadder = normalizePriceLadder(input.priceLadder);
  const currentPopulation = nonNegative(input.currentPopulation);
  const currentMbwG = nonNegative(input.currentMbwG);
  const currentSizeCountPerKg = currentMbwG > 0 ? 1000 / currentMbwG : 0;
  const flatPrice = finite(input.flatPricePerKg);
  const currentPricePerKg = flatPrice !== null && flatPrice > 0 ? flatPrice : resolvePriceForSize(currentSizeCountPerKg, priceLadder);
  const now = input.now ?? new Date();
  const todayDateKey = normalizeFarmDateKey(now, input.timeZone);
  const dailyFeedRate = calculateDailyFeedIncreaseRate(input.recentDailyFeedTotals, input.timeZone, now);
  const validFeedTotals = input.recentDailyFeedTotals
    .filter((entry) => {
      const date = validDate(entry.date, input.timeZone);
      if (!date || !todayDateKey || nonNegative(entry.quantityKg) <= 0) return false;
      const age = differenceInFarmCalendarDays(todayDateKey, date);
      return age >= 0 && age <= 7;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  const startingDailyFeedKg = validFeedTotals.length > 0
    ? nonNegative(validFeedTotals[validFeedTotals.length - 1].quantityKg)
    : 0;
  const mortalityRate = Math.min(0.2, Math.max(
    nonNegative(input.dailyMortalityRatePercent),
    nonNegative(input.fallbackDailyMortalityRatePercent),
  ) / 100);

  if (currentPopulation <= 0) warnings.push('Current population is missing or zero.');
  if (currentMbwG <= 0) warnings.push('Current MBW is missing or zero.');
  if (priceLadder.length === 0) warnings.push('No valid market price tiers were provided.');
  const nearestCurrentTierDistance = priceLadder.length > 0
    ? Math.min(...priceLadder.map((tier) => Math.abs(tier.sizeCountPerKg - currentSizeCountPerKg)))
    : Number.POSITIVE_INFINITY;
  if (nearestCurrentTierDistance > 10) warnings.push('A market price close to the current harvest size is missing.');
  if (input.adgGPerDay <= 0) warnings.push('ADG is missing or not positive, so future target dates cannot be estimated.');
  if (startingDailyFeedKg <= 0) warnings.push('No valid recent daily feed total is available for the feed-cost projection.');
  if (!input.historicalFcr || input.historicalFcr <= 0) warnings.push('Historical FCR is unavailable for efficiency comparison.');

  const hasMortalityInput = (input.dailyMortalityRatePercent !== null && input.dailyMortalityRatePercent !== undefined && Number.isFinite(Number(input.dailyMortalityRatePercent)))
    || (input.fallbackDailyMortalityRatePercent !== null && input.fallbackDailyMortalityRatePercent !== undefined && Number.isFinite(Number(input.fallbackDailyMortalityRatePercent)));
  if (!hasMortalityInput) {
    warnings.push('Daily mortality rate is unavailable; future biomass projection assumes zero mortality which carries biological risk.');
  }

  const todayBase = buildScenario({
    kind: 'today',
    targetSizeCountPerKg: currentSizeCountPerKg,
    daysFromNow: 0,
    input: { ...input, currentPopulation, currentMbwG },
    dailyFeedRate,
    startingDailyFeedKg,
    mortalityRate,
    pricePerKg: currentPricePerKg,
    todayProfit: 0,
  });
  const today = { ...todayBase, incrementalProfitVsToday: todayBase.operatingProfit === null ? null : 0 };
  const maxProjectionDays = Math.max(1, Math.floor(input.maxProjectionDays ?? 120));
  const targets = input.adgGPerDay > 0
    ? priceLadder
      .filter((tier) => tier.sizeCountPerKg < currentSizeCountPerKg)
      .map((tier) => {
        const targetMbwG = 1000 / tier.sizeCountPerKg;
        const daysFromNow = Math.max(1, Math.ceil(daysToTargetMbwWithTapering(
          currentMbwG,
          targetMbwG,
          input.adgGPerDay,
          Math.max(50, targetMbwG * 1.15),
        )));
        return { tier, daysFromNow };
      })
      .filter(({ daysFromNow }) => daysFromNow <= maxProjectionDays)
      .map(({ tier, daysFromNow }) => buildScenario({
        kind: 'target',
        targetSizeCountPerKg: tier.sizeCountPerKg,
        daysFromNow,
        input: { ...input, currentPopulation, currentMbwG },
        dailyFeedRate,
        startingDailyFeedKg,
        mortalityRate,
        pricePerKg: flatPrice ?? tier.pricePerKg,
        todayProfit: today.operatingProfit,
      }))
    : [];

  const explicitTargetCount = input.targetSizeCountPerKg
    ? input.targetSizeCountPerKg
    : input.targetMbwG && input.targetMbwG > 0
      ? 1000 / input.targetMbwG
      : null;
  if (explicitTargetCount !== null && explicitTargetCount < currentSizeCountPerKg && input.adgGPerDay > 0) {
    const targetMbwG = 1000 / explicitTargetCount;
    const daysFromNow = Math.max(1, Math.ceil(daysToTargetMbwWithTapering(
      currentMbwG,
      targetMbwG,
      input.adgGPerDay,
      Math.max(50, targetMbwG * 1.15),
    )));
    if (daysFromNow <= maxProjectionDays && !targets.some((t) => Math.abs(t.targetSizeCountPerKg - explicitTargetCount) < 1)) {
      const explicitPrice = flatPrice ?? resolvePriceForSize(explicitTargetCount, priceLadder);
      targets.push(buildScenario({
        kind: 'target',
        targetSizeCountPerKg: explicitTargetCount,
        daysFromNow,
        input: { ...input, currentPopulation, currentMbwG },
        dailyFeedRate,
        startingDailyFeedKg,
        mortalityRate,
        pricePerKg: explicitPrice,
        todayProfit: today.operatingProfit,
      }));
      targets.sort((a, b) => a.daysFromNow - b.daysFromNow);
    }
  }

  if (input.exactDaysFromNow && Number.isInteger(input.exactDaysFromNow) && input.exactDaysFromNow <= maxProjectionDays && input.currentMbwG > 0 && input.hasValidSamplingMbw !== false) {
    const projectedMbwG = projectMbwWithTapering(currentMbwG, input.adgGPerDay, input.exactDaysFromNow, 50);
    if (projectedMbwG > 0) targets.push(buildScenario({ kind: 'horizon', targetSizeCountPerKg: 1000 / projectedMbwG,
      daysFromNow: input.exactDaysFromNow, input: { ...input, currentPopulation, currentMbwG },
      dailyFeedRate, startingDailyFeedKg, mortalityRate,
      pricePerKg: flatPrice ?? resolvePriceForSize(1000 / projectedMbwG, priceLadder), todayProfit: today.operatingProfit }));
  }

  const hasFeedProjectionBasis = startingDailyFeedKg > 0 || (input.historicalFcr !== null && input.historicalFcr !== undefined && input.historicalFcr > 0);
  if (targets.length > 0 && !hasFeedProjectionBasis) {
    warnings.push('Future feed cost cannot be projected without recent daily feed or historical FCR.');
  }

  targets.forEach((scenario) => {
    if (scenario.impliedIncrementalFcr !== null && input.historicalFcr && scenario.impliedIncrementalFcr > input.historicalFcr * 1.25) {
      warnings.push(`Target size ${scenario.targetSizeCountPerKg} implies FCR ${scenario.impliedIncrementalFcr}, materially above the historical FCR.`);
    }
  });

  const bestScenario = [today, ...targets].reduce((best, scenario) =>
    scenario.operatingProfit !== null && (best.operatingProfit === null || scenario.operatingProfit > best.operatingProfit)
      ? scenario : best
  );
  const incurredCostsComplete = Object.values(input.costsToDate).every((value) => value !== null && value !== undefined);
  const futureCostsComplete = targets.length === 0 || (
    input.projectedDailyAdditiveCost !== null && input.projectedDailyAdditiveCost !== undefined &&
    input.projectedDailyGeneralExpense !== null && input.projectedDailyGeneralExpense !== undefined &&
    input.projectedDailyOtherCost !== null
  );
  const hasCriticalFinanceData = input.feedUnitCostPerKg !== null && input.feedUnitCostPerKg !== undefined &&
    input.feedUnitCostPerKg > 0 && currentPricePerKg !== null && incurredCostsComplete && futureCostsComplete;
  if (input.feedUnitCostPerKg === null || input.feedUnitCostPerKg === undefined || input.feedUnitCostPerKg <= 0) {
    warnings.push('Feed unit cost is missing or zero; operating profit cannot be calculated without feed cost evidence.');
  }
  if (priceLadder.length === 0 || currentPricePerKg === null) {
    warnings.push('Market price tiers are missing. Financial revenue and operating profit require market prices.');
  }
  if (!incurredCostsComplete) warnings.push('One or more incurred cost categories are unavailable; financial comparison is withheld.');
  if (!futureCostsComplete) warnings.push('One or more future cost categories are unavailable; financial comparison is withheld.');
  const hasMeasuredMbw = input.currentMbwG > 0 && (input as any).hasValidSamplingMbw !== false;
  const hasCriticalData = currentPopulation > 0 && currentMbwG > 0 && hasMeasuredMbw &&
    priceLadder.length > 0 && nearestCurrentTierDistance <= 10;
  const canProjectGrowthSafely = hasFeedProjectionBasis || targets.length === 0;
  const decision: HarvestDecision = (!hasCriticalData || !hasCriticalFinanceData || !canProjectGrowthSafely)
    ? 'review_data'
    : bestScenario.operatingProfit !== null && today.operatingProfit !== null &&
      bestScenario.kind !== 'today' && bestScenario.operatingProfit > today.operatingProfit && bestScenario.operatingProfit > 0
      ? 'keep_growing'
      : 'harvest_now';
  const decisionReason = !hasCriticalData
    ? 'Critical population, MBW, or market-price data is missing.'
    : !hasCriticalFinanceData
      ? 'Required feed unit cost or market price evidence is missing; profit recommendation withheld.'
      : !canProjectGrowthSafely
        ? 'Future feed cost cannot be projected without recent feed records or historical FCR.'
        : decision === 'keep_growing'
          ? `Target size ${bestScenario.targetSizeCountPerKg} is projected to improve operating profit by ${round(bestScenario.incrementalProfitVsToday ?? 0)}.`
          : targets.length === 0
            ? 'No reachable larger market size has a valid, more profitable projection.'
            : 'Harvesting now has equal or higher projected operating profit than the reachable larger sizes.';

  return {
    decision,
    decisionReason,
    currentSizeCountPerKg: round(currentSizeCountPerKg, 1),
    currentPricePerKg: currentPricePerKg === null ? null : round(currentPricePerKg),
    feedDailyIncreaseRatePercent: round(dailyFeedRate * 100, 2),
    dailyMortalityRatePercent: round(mortalityRate * 100, 4),
    today,
    targets,
    bestScenario,
    warnings: Array.from(new Set(warnings)),
  };
};

export interface EvaluatePondHarvestDecisionOptions {
  currentDateKey?: string;
  now?: Date;
  timeZone?: string;
  priceLadder?: PriceTier[];
  pricePerKg?: number | null;
  projectedDailyOtherCost?: number | null;
  targetMbwG?: number | null;
  targetSizeCountPerKg?: number | null;
  daysToHarvest?: number | null;
  exactDaysFromNow?: number | null;
  maxProjectionDays?: number;
  startDate?: string | null;
  endDate?: string | null;
  ponds?: ProfitabilityPond[];
  feeds?: InventoryItemWithUsage[];
  additives?: InventoryItemWithUsage[];
  expenses?: ExpenseCostLike[];
}

export interface HarvestDecisionScenarioEvaluation {
  result: HarvestProfitabilityResult;
  metrics: PondMetricsWithHarvest;
  costSnapshot: PondProfitabilityCostSnapshot;
  recordedMortality: { dailyRatePercent: number; recordedDays: number; estimatedDeaths: number };
  recentDailyFeedTotals: DailyFeedTotal[];
  scope: {
    pondId: string;
    pondName: string;
    cycleId: string | null;
  };
  assumptions: {
    growthModel: string;
    assumedAdgGPerDay: number;
    mortalityBasis: 'recorded_mortality_trend' | 'biological_fallback' | 'unspecified';
    mortalityDailyRatePercent: number;
    feedCostUnitPerKg: number | null;
    maxProjectionDays: number;
  };
  missingEvidence: string[];
  marginBasis: 'operating_profit_after_recorded_incurred_and_supported_projected_costs';
  guardrails: {
    advisoryOnly: true;
    noFarmWrites: true;
    noHarvestDraftCreated: true;
    notes: string;
  };
}

/**
 * Reusable decision scenario evaluator mapping raw pond records, feed inventory,
 * and cost ledgers into the canonical harvest profitability decision.
 * Reuses canonical calculatePondMetricsWithHarvest, buildPondProfitabilityCostSnapshot,
 * and calculateRecordedDailyMortalityRate without fabricating missing data.
 */
export const evaluateHarvestDecisionForPond = ({
  pond,
  options = {},
}: {
  pond: SharedPond & ProfitabilityPond;
  options?: EvaluatePondHarvestDecisionOptions;
}): HarvestDecisionScenarioEvaluation => {
  const timeZone = options.timeZone;
  const now = options.now ?? new Date();
  const todayKey = normalizeFarmDateKey(options.currentDateKey ?? now, timeZone) ?? '';
  const earliestSampling = (pond.samplings || []).map((s: any) => s.date).filter(Boolean).sort()[0];
  const cycleStart = pond.cycleStartedAt || pond.docStart || earliestSampling || todayKey;
  const effectivePond: SharedPond & ProfitabilityPond = {
    ...pond,
    cycleStartedAt: pond.cycleStartedAt || pond.docStart || cycleStart,
  };

  const metrics = calculatePondMetricsWithHarvest(effectivePond, timeZone, {
    currentDateKey: options.currentDateKey,
    now,
  });

  const feeds = options.feeds || [];
  const additives = options.additives || [];
  const expenses = options.expenses || [];
  const ponds = options.ponds || [effectivePond];

  const costSnapshot = buildPondProfitabilityCostSnapshot({
    pond: effectivePond,
    ponds,
    feeds,
    additives,
    expenses,
    startDate: options.startDate || cycleStart,
    endDate: options.endDate || todayKey,
    timeZone,
  });

  const recordedMortality = calculateRecordedDailyMortalityRate({
    records: (pond.mortalityRecords || []) as MortalityRateRecordLike[],
    currentPopulation: metrics.currentPopulation,
    now,
    timeZone,
  });

  const activeCycleIds = [pond.cycleId, pond.pondCycleId].filter(Boolean);
  const currentCycleFeeds = feeds.map(item => ({ ...item, usageHistory: (item.usageHistory || []).filter(usage => {
    const ids = [usage.cycleId, usage.pondCycleId].filter(Boolean);
    const date = validDate(usage.date, timeZone);
    return date && date >= (validDate(cycleStart, timeZone) || todayKey) && date <= todayKey &&
      (!ids.length || !activeCycleIds.length || ids.some(id => activeCycleIds.includes(id)));
  }) }));
  const recentDailyFeedTotals = buildDailyFeedTotalsForPond(currentCycleFeeds, pond.id, timeZone);
  const priceLadder = [...(options.priceLadder || [])];
  const explicitCurrentPrice = finite(options.pricePerKg);
  if (explicitCurrentPrice !== null && explicitCurrentPrice > 0 && metrics.latestMbw > 0) {
    priceLadder.unshift({ sizeCountPerKg: 1000 / metrics.latestMbw, pricePerKg: explicitCurrentPrice });
  }

  const initialPopulation = Number(pond.initialPopulation || pond.initialStock || 0);
  const historicalFcr = metrics.biomassGainFCR > 0 ? metrics.biomassGainFCR : metrics.adjustedFCR;
  const hasValidSamplingMbw = (pond.samplings || []).some((sampling: any) =>
    !isBaselineSampling(sampling) && getSamplingMbw(sampling) > 0
  );

  const result = calculateHarvestProfitability({
    currentPopulation: metrics.currentPopulation,
    initialPopulation: initialPopulation > 0 ? initialPopulation : null,
    currentMbwG: metrics.latestMbw,
    currentSurvivalRatePercent: metrics.adjustedSR,
    adgGPerDay: metrics.adg,
    historicalFcr: historicalFcr > 0 ? historicalFcr : null,
    dailyMortalityRatePercent: recordedMortality.recordedDays > 0 ? recordedMortality.dailyRatePercent : null,
    fallbackDailyMortalityRatePercent: metrics.biomassEstimate.expectedDailyMortalityRatePercent,
    recentDailyFeedTotals,
    feedUnitCostPerKg: costSnapshot.feedUnitCostPerKg,
    priceLadder,
    flatPricePerKg: explicitCurrentPrice,
    costsToDate: costSnapshot.costsToDate,
    projectedDailyAdditiveCost: costSnapshot.projectedDailyAdditiveCost,
    projectedDailyGeneralExpense: costSnapshot.projectedDailyGeneralExpense,
    projectedDailyOtherCost: options.projectedDailyOtherCost === undefined ? null : options.projectedDailyOtherCost,
    targetMbwG: options.targetMbwG,
    targetSizeCountPerKg: options.targetSizeCountPerKg,
    hasValidSamplingMbw,
    exactDaysFromNow: options.exactDaysFromNow,
    maxProjectionDays: options.daysToHarvest ?? options.maxProjectionDays,
    timeZone,
    now,
  });

  const missingEvidence: string[] = [];
  if (!hasValidSamplingMbw) {
    missingEvidence.push('missing_valid_sampling_mbw');
  }
  if (metrics.currentPopulation <= 0) {
    missingEvidence.push('missing_current_population');
  }
  if (recentDailyFeedTotals.length === 0) {
    missingEvidence.push('missing_recent_daily_feed_records');
  }
  if (recordedMortality.recordedDays === 0) {
    missingEvidence.push('missing_recorded_mortality_observations');
  }
  if (priceLadder.length === 0) {
    missingEvidence.push('missing_market_price');
    missingEvidence.push('missing_market_price_ladder');
  }
  if (costSnapshot.feedUnitCostPerKg === null || costSnapshot.feedUnitCostPerKg <= 0) {
    missingEvidence.push('missing_historical_feed_unit_cost');
  }

  const mortalityBasis: 'recorded_mortality_trend' | 'biological_fallback' | 'unspecified' =
    recordedMortality.recordedDays > 0
      ? 'recorded_mortality_trend'
      : (metrics.biomassEstimate?.expectedDailyMortalityRatePercent ?? 0) > 0
        ? 'biological_fallback'
        : 'unspecified';

  return {
    result,
    metrics,
    costSnapshot,
    recordedMortality,
    recentDailyFeedTotals,
    scope: {
      pondId: pond.id,
      pondName: pond.name || (pond as any).pondName || pond.id,
      cycleId: pond.cycleId || pond.pondCycleId || null,
    },
    assumptions: {
      growthModel: 'von_bertalanffy_tapered_growth',
      assumedAdgGPerDay: metrics.adg,
      mortalityBasis,
      mortalityDailyRatePercent: result.dailyMortalityRatePercent,
      feedCostUnitPerKg: costSnapshot.feedUnitCostPerKg,
      maxProjectionDays: options.daysToHarvest ?? options.maxProjectionDays ?? 120,
    },
    missingEvidence,
    marginBasis: 'operating_profit_after_recorded_incurred_and_supported_projected_costs',
    guardrails: {
      advisoryOnly: true,
      noFarmWrites: true,
      noHarvestDraftCreated: true,
      notes: 'Pure read-only analytical evaluation. No harvest records or procurement transactions were created or modified in Firestore.',
    },
  };
};
