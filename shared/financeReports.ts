import { buildCogsReport, type CogsTransaction } from './cogsReport';
import { CAPITAL_CATEGORIES, FINANCING_CATEGORIES, OTHER_EXPENSE_CATEGORIES, NON_PRODUCTION_CATEGORIES, NON_OPERATING_INCOME, monetaryValue } from './financeIntegrity';
import { isDateKeyInRange, normalizeFarmDateKey } from './farmDate';

export function buildProfitLoss(input: Parameters<typeof buildCogsReport>[0], openingWip = 0, closingWip = 0) {
  const cogs = buildCogsReport(input);
  const opexBreakdown: Record<string, number> = {};
  const otherExpenseBreakdown: Record<string, number> = {};
  let excludedCapital = 0;
  let missingAmounts = cogs.details.missingCostCount + cogs.details.missingRevenueAmountCount;
  for (const expense of input.expenses) {
    if (expense.voided || !expense.date || !isDateKeyInRange(expense.date, input.startDateKey, input.endDateKey, input.timeZone)) continue;
    const cycleId = expense.cycleId || input.ponds.find(p => p.id === expense.pondId)?.cycleId;
    if (input.cycleScope !== 'all' && cycleId !== input.cycleScope) continue;
    const amount = monetaryValue(expense.amount);
    if (amount === null) { missingAmounts++; continue; }
    const category = input.normalizeCategory(expense.category || 'Uncategorised');
    if (expense.reference?.startsWith('INVENTORY-')) continue;
    if (CAPITAL_CATEGORIES.includes(category) || FINANCING_CATEGORIES.includes(category)) { excludedCapital += amount; continue; }
    const target = OTHER_EXPENSE_CATEGORIES.includes(category) ? otherExpenseBreakdown
      : !cycleId && !NON_PRODUCTION_CATEGORIES.includes(category) ? opexBreakdown : null;
    if (target) target[category] = (target[category] || 0) + amount;
  }
  const revenueBreakdown: Record<string, number> = {};
  for (const record of input.revenues) {
    const cycleId = record.cycleId || input.ponds.find(pond => pond.id === record.pondId)?.cycleId;
    if (record.voided || !record.date || !isDateKeyInRange(record.date, input.startDateKey, input.endDateKey, input.timeZone) || (input.cycleScope !== 'all' && cycleId !== input.cycleScope)) continue;
    const category = input.normalizeCategory(record.category || 'Uncategorised');
    const amount = monetaryValue(record.amount);
    if (amount !== null && !NON_OPERATING_INCOME.includes(category)) revenueBreakdown[category] = (revenueBreakdown[category] || 0) + amount;
  }
  const expenseBreakdown: Record<string, number> = {};
  for (const breakdown of [cogs.categoryBreakdown, opexBreakdown, otherExpenseBreakdown]) {
    for (const [category, amount] of Object.entries(breakdown)) expenseBreakdown[category] = (expenseBreakdown[category] || 0) + amount;
  }
  if (openingWip || closingWip) expenseBreakdown['Production carry-forward adjustment'] = openingWip - closingWip;
  const totalCOGS = cogs.totalProductionCost + openingWip - closingWip;
  const totalOPEX = Object.values(opexBreakdown).reduce((a, b) => a + b, 0);
  const totalOtherExpenses = Object.values(otherExpenseBreakdown).reduce((a, b) => a + b, 0);
  const grossProfit = cogs.revenue - totalCOGS;
  const operatingIncome = grossProfit - totalOPEX;
  return { ...cogs, revenueBreakdown, expenseBreakdown, totalRevenue: cogs.revenue, totalCOGS, cogsBreakdown: { ...cogs.categoryBreakdown, ...(openingWip || closingWip ? { 'Production carry-forward adjustment': openingWip - closingWip } : {}) }, totalOPEX, opexBreakdown, totalOtherExpenses, otherExpenseBreakdown, grossProfit, operatingIncome, netProfit: operatingIncome - totalOtherExpenses, excludedCapital, missingAmounts };
}

export interface SettledTransaction extends CogsTransaction {
  paymentType?: string;
  settlements?: { id: string; date: string; amount: number }[];
}
/** Cash-flow uses confirmed settlement dates. Legacy entries require confirmation. */
export function buildConfirmedCashFlow(input: { expenses: SettledTransaction[]; revenues: SettledTransaction[]; startDateKey: string | null; endDateKey: string; timeZone?: string; normalizeCategory: (s: string) => string }) {
  const operating = { cashFromSales: 0, cashFromCustomers: 0, paymentToSuppliers: 0, paymentForExpenses: 0, otherOperatingCash: 0 };
  const investing = { purchaseOfAssets: 0, saleOfAssets: 0, purchaseOfInvestments: 0, saleOfInvestments: 0 };
  const financing = { loansReceived: 0, loanRepayments: 0, capitalContributed: 0, dividendsPaid: 0, ownerWithdrawals: 0 };
  let openingBalance = 0;
  let unconfirmedCount = 0;
  let invalidCount = 0;
  for (const [records, sign] of [[input.revenues, 1], [input.expenses, -1]] as const) {
    for (const record of records) {
      // Voiding a sale does not undo money actually received; refunds need their own recorded cash movement.
      const amount = monetaryValue(record.amount);
      if (amount === null) { invalidCount++; continue; }
      const settlements = record.settlements || [];
      const ids = new Set<string>();
      let paid = 0;
      let invalidSettlement = false;
      for (const settlement of settlements) {
        const value = monetaryValue(settlement.amount);
        if (!settlement.id || ids.has(settlement.id) || value === null || value <= 0 || !normalizeFarmDateKey(settlement.date, input.timeZone)) { invalidCount++; invalidSettlement = true; continue; }
        ids.add(settlement.id); paid += value;
      }
      if (invalidSettlement) continue;
      if (paid > amount + 0.01) { invalidCount++; continue; }
      if (!record.voided && paid < amount - 0.01) unconfirmedCount++;
      for (const settlement of settlements) {
        const value = monetaryValue(settlement.amount);
        const key = normalizeFarmDateKey(settlement.date, input.timeZone);
        if (!key || value === null || value <= 0) continue;
        if (input.startDateKey && key < input.startDateKey) { openingBalance += sign * value; continue; }
        if (!isDateKeyInRange(key, input.startDateKey, input.endDateKey, input.timeZone)) continue;
        const category = input.normalizeCategory(record.category || 'Uncategorised');
        if (sign === 1) {
          if (category === 'Loan Received') financing.loansReceived += value;
          else if (category === 'Capital Contribution') financing.capitalContributed += value;
          else if (category === 'Asset Sale') investing.saleOfAssets += value;
          else if (category === 'Shrimp Sales') operating.cashFromSales += value;
          else operating.cashFromCustomers += value;
        } else if (CAPITAL_CATEGORIES.includes(category)) investing.purchaseOfAssets += value;
        else if (category === 'Loan Payment') financing.loanRepayments += value;
        else if (category === 'Dividend') financing.dividendsPaid += value;
        else if (category === 'Owner Withdrawal') financing.ownerWithdrawals += value;
        else if (['Feed', 'Pond Additives'].includes(category)) operating.paymentToSuppliers += value;
        else operating.paymentForExpenses += value;
      }
    }
  }
  return { operating, investing, financing, openingBalance, unconfirmedCount, invalidCount };
}
