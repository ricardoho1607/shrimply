/** Shared ledger/cost rules. Invalid amounts remain visible as data-quality errors. */
export const monetaryValue = (value: unknown): number | null => {
  if (value == null || value === '' || typeof value === 'boolean') return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
};
export const sumMoney = (records: { amount?: unknown; voided?: boolean }[]): number => records.reduce((sum, record) => {
  if (record.voided) return sum;
  const amount = monetaryValue(record.amount);
  if (amount === null) throw new Error('A finance entry has an invalid amount. Correct it before calculating totals.');
  return sum + amount;
}, 0);
export const isSourceLinkedFinance = (record: { reference?: string }): boolean =>
  /^(HARVEST-|INVENTORY-|ASSET-)/.test(record.reference || '');
export const NON_OPERATING_INCOME = ['Loan Received', 'Capital Contribution', 'Asset Sale'];
export const CAPITAL_CATEGORIES = ['Equipment', 'Property', 'Infrastructure'];
export const FINANCING_CATEGORIES = ['Loan Payment', 'Owner Withdrawal', 'Dividend'];
export const OTHER_EXPENSE_CATEGORIES = ['Taxes', 'Interest'];
export const NON_PRODUCTION_CATEGORIES = [...CAPITAL_CATEGORIES, ...FINANCING_CATEGORIES, ...OTHER_EXPENSE_CATEGORIES];
export const isInventoryTransfer = (usage: { source?: string; transfer?: boolean }): boolean => Boolean(usage && (usage.source === 'treatmentMixProduction' || usage.transfer === true));

/** Reverse the remaining recorded cost proportionally, including earlier corrections. */
export function getUsageReturnCost(usages: { quantity?: unknown; totalCost?: unknown; unitPrice?: unknown }[], quantity: number) {
  let outstandingQuantity = 0;
  let outstandingCost = 0;
  for (const usage of usages) {
    const qty = monetaryValue(usage.quantity);
    const cost = monetaryValue(usage.totalCost) ?? (qty !== null && monetaryValue(usage.unitPrice) !== null ? qty * monetaryValue(usage.unitPrice)! : null);
    if (qty === null || cost === null) throw new Error('Historical feed cost is missing. Reconcile this usage before returning stock.');
    outstandingQuantity += qty;
    outstandingCost += cost;
  }
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > outstandingQuantity + 0.000001 || outstandingCost <= 0) {
    throw new Error('The return exceeds the remaining recorded usage or its cost is invalid.');
  }
  const totalCost = quantity * outstandingCost / outstandingQuantity;
  return { unitPrice: outstandingCost / outstandingQuantity, totalCost };
}
export function requireAvailableStock(stock: unknown, quantity: number) {
  const available = monetaryValue(stock);
  if (available === null || !Number.isFinite(quantity) || quantity <= 0 || quantity > available + 0.000001) {
    throw new Error('Insufficient inventory stock');
  }
  return available - quantity;
}

export function appendSettlement(record: { amount?: unknown; voided?: boolean; settlements?: { id: string; date: string; amount: number }[] }, payment: { id: string; date: string; amount: number }) {
  const entries = record.settlements || [];
  if (entries.some(entry => entry.id === payment.id)) return entries;
  const amount = monetaryValue(record.amount);
  const paid = entries.reduce((sum, entry) => sum + (monetaryValue(entry.amount) ?? Number.NaN), 0);
  if (record.voided || amount === null || !Number.isFinite(paid) || !/^\d{4}-\d{2}-\d{2}$/.test(payment.date)
    || new Date(payment.date + 'T00:00:00Z').toISOString().slice(0, 10) !== payment.date
    || !Number.isFinite(payment.amount) || payment.amount <= 0 || paid + payment.amount > amount + 0.001) {
    throw new Error('Enter a valid payment date and an amount no greater than the outstanding balance.');
  }
  return [...entries, payment];
}
