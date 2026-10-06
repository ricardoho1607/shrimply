import { monetaryValue } from './financeIntegrity';

interface UsageToRemove {
  id?: unknown;
  quantity?: unknown;
  totalCost?: unknown;
  unitPrice?: unknown;
  source?: unknown;
}

/** Use the saved consumption cost, never today's stock price. Missing IDs make retries a no-op. */
export function removeAdditiveUsage<T extends UsageToRemove>(item: {
  totalStock?: unknown;
  totalCost?: unknown;
  usageHistory?: T[];
  removedUsageIds?: string[];
}, usageId: string) {
  if (!usageId) throw new Error('Usage ID is required.');
  const history = item.usageHistory ?? [];
  const matches = history.filter(entry => entry.id === usageId);
  if (matches.length === 0) return null;
  if (matches.length !== 1) throw new Error('This usage ID is duplicated. Reconcile the history before removing it.');
  const usage = matches[0];
  if (usage.source === 'treatmentMixProduction') {
    throw new Error('This usage produced a treatment mix. It cannot be removed independently.');
  }
  const quantity = monetaryValue(usage.quantity);
  const unitPrice = monetaryValue(usage.unitPrice);
  const cost = monetaryValue(usage.totalCost) ?? (quantity !== null && unitPrice !== null ? quantity * unitPrice : null);
  const stock = monetaryValue(item.totalStock);
  const stockCost = monetaryValue(item.totalCost);
  if (quantity === null || quantity <= 0 || cost === null || cost < 0) {
    throw new Error('The recorded usage quantity or cost is missing or invalid. Reconcile it before removing it.');
  }
  if (stock === null || stock < 0 || stockCost === null || stockCost < 0) {
    throw new Error('The current inventory quantity or cost is missing or invalid. Reconcile it before removing usage.');
  }
  return {
    totalStock: stock + quantity,
    totalCost: stockCost + cost,
    usageHistory: history.filter(entry => entry.id !== usageId),
    removedUsageIds: [...new Set([...(item.removedUsageIds ?? []), usageId])],
  };
}
