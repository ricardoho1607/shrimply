import { buildDailyFeedRecordId, DAILY_FEED_USAGE_SOURCE, getDailyFeedUsageTotal, isDailyFeedUsage, type FeedAllocation } from './feedInventoryUsage';
import { getUsageReturnCost } from './financeIntegrity';

export interface DailyFeedIntent { pondId: string; date: string; allocations: FeedAllocation[]; previousFeedIds: string[]; feedingResponse?: string | null }
export interface DailyFeedStock { totalStock?: number; totalCost?: number; usageHistory?: { id?: string; pondId?: string; date?: string; quantity?: number; totalCost?: number; unitPrice?: number; source?: string; feedRecordId?: string }[] }
/** Reconcile against authoritative usage, never a device's precomputed delta. */
export function reconcileDailyFeedStock(stock: DailyFeedStock, desired: number, intent: DailyFeedIntent, operationId: string) {
  const history = stock.usageHistory || [];
  const delta = desired - getDailyFeedUsageTotal(history, intent.pondId, intent.date);
  if (Math.abs(delta) < 0.000001) return null;
  const available = stock.totalStock, cost = stock.totalCost;
  if (typeof available !== 'number' || !Number.isFinite(available) || typeof cost !== 'number' || !Number.isFinite(cost)) throw new Error('Inventory quantity or cost is missing');
  if (delta > available + 0.000001) throw new Error('Insufficient inventory stock');
  const unitPrice = delta > 0 ? cost / available : getUsageReturnCost(history.filter(row => isDailyFeedUsage(row, intent.pondId, intent.date)), -delta).unitPrice;
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) throw new Error('Inventory cost is missing');
  return { totalStock: Math.max(0, available - delta), totalCost: Math.max(0, cost - delta * unitPrice), usageHistory: [...history, {
    id: operationId, pondId: intent.pondId, date: intent.date, quantity: delta, unitPrice, totalCost: delta * unitPrice,
    source: DAILY_FEED_USAGE_SOURCE, feedRecordId: buildDailyFeedRecordId(intent.pondId, intent.date),
  }] };
}

/** Preserve pending desired feed totals when a server snapshot replaces local ponds. */
export function overlayDailyFeedIntents<T extends { id: string; samplings: { id: string; date: string; feedData?: unknown; isBaselineEstimate?: boolean; source?: string }[] }>(ponds: T[], intents: DailyFeedIntent[]): T[] {
  return intents.reduce((current, intent) => current.map(pond => {
    if (pond.id !== intent.pondId) return pond;
    const samplings = [...pond.samplings];
    const index = samplings.findIndex(row => row.date === intent.date && row.feedData && !row.isBaselineEstimate && row.source !== 'midcycle_onboarding');
    const feedData = { totalDailyFeed: intent.allocations.reduce((sum, row) => sum + row.quantityKg, 0).toFixed(2), feedAllocations: intent.allocations,
      inventoryFeedId: intent.allocations.length === 1 ? intent.allocations[0].inventoryFeedId : null, feedingResponse: intent.feedingResponse ?? null };
    if (index >= 0) samplings[index] = { ...samplings[index], feedData };
    else samplings.push({ id: `feed-${intent.date}`, date: intent.date, mbw: 0, mortality: 0, feed: 0, feedData } as T['samplings'][number]);
    return { ...pond, samplings };
  }), ponds);
}
