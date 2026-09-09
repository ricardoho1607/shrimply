import { normalizeFarmDateKey } from './farmDate';
import { monetaryValue, NON_PRODUCTION_CATEGORIES } from './financeIntegrity';

export const escapeReportText = (value: unknown): string => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

export const savedUsageCost = (usage: { totalCost?: unknown; quantity?: unknown; unitPrice?: unknown }): number => {
  const saved = monetaryValue(usage.totalCost);
  if (saved !== null) return saved;
  const quantity = monetaryValue(usage.quantity), price = monetaryValue(usage.unitPrice);
  return quantity !== null && price !== null ? quantity * price : Number.NaN;
};
export const isCycleOperatingExpense = (expense: { voided?: boolean; category?: string | null; reference?: string | null }): boolean =>
  !expense.voided && !expense.reference?.startsWith('INVENTORY-') && !NON_PRODUCTION_CATEGORIES.includes(expense.category || '');
export const isMaintenanceExpense = (expense: { category?: string | null }): boolean => ['Maintenance', 'Repairs'].includes(expense.category || '');

/** The register is recorded activity, including unpaid entries, under the same scope as its rows. */
export function transactionOpeningPosition(input: {
  expenses: { date?: string; amount?: unknown; voided?: boolean; cycleId?: string }[];
  revenues: { date?: string; amount?: unknown; voided?: boolean; cycleId?: string }[];
  startDateKey: string | null; cycleScope: string; timeZone?: string;
}): number {
  if (!input.startDateKey) return 0;
  let total = 0;
  for (const [records, sign] of [[input.revenues, 1], [input.expenses, -1]] as const) {
    for (const entry of records) {
      const key = normalizeFarmDateKey(entry.date, input.timeZone);
      if (entry.voided || !key || key >= input.startDateKey || (input.cycleScope !== 'all' && entry.cycleId !== input.cycleScope)) continue;
      const amount = monetaryValue(entry.amount);
      if (amount === null) return Number.NaN;
      total += sign * amount;
    }
  }
  return total;
}
