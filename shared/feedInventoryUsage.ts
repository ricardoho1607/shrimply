export const DAILY_FEED_USAGE_SOURCE = 'daily_feed_record' as const;

export const DAILY_FEED_ERROR_CODES = {
  companyUnavailable: 'DAILY_FEED_COMPANY_UNAVAILABLE',
  feedSelectionRequired: 'DAILY_FEED_SELECTION_REQUIRED',
  invalidAmount: 'DAILY_FEED_INVALID_AMOUNT',
  invalidAllocation: 'DAILY_FEED_INVALID_ALLOCATION',
  inventoryNotFound: 'DAILY_FEED_INVENTORY_NOT_FOUND',
  feedRecordMissingInventory: 'DAILY_FEED_RECORD_MISSING_INVENTORY',
  insufficientStock: 'DAILY_FEED_INSUFFICIENT_STOCK',
  missingCost: 'DAILY_FEED_MISSING_COST',
} as const;

export interface FeedAllocation {
  inventoryFeedId: string;
  quantityKg: number;
}

export interface FeedAllocationDataLike {
  totalDailyFeed?: unknown;
  inventoryFeedId?: unknown;
  feedAllocations?: unknown;
}

export const normalizeFeedAllocations = (
  feedData: FeedAllocationDataLike | null | undefined,
): FeedAllocation[] => {
  const totals = new Map<string, number>();
  const rawAllocations = Array.isArray(feedData?.feedAllocations)
    ? feedData.feedAllocations
    : [];

  rawAllocations.forEach((allocation) => {
    if (!allocation || typeof allocation !== 'object') return;
    const inventoryFeedId = 'inventoryFeedId' in allocation
      ? allocation.inventoryFeedId
      : undefined;
    const quantityKg = 'quantityKg' in allocation
      ? Number(allocation.quantityKg)
      : Number.NaN;
    if (typeof inventoryFeedId !== 'string' || !inventoryFeedId || !Number.isFinite(quantityKg) || quantityKg <= 0) return;
    totals.set(inventoryFeedId, (totals.get(inventoryFeedId) || 0) + quantityKg);
  });

  if (totals.size === 0 && typeof feedData?.inventoryFeedId === 'string' && feedData.inventoryFeedId) {
    const quantityKg = Number(feedData.totalDailyFeed);
    if (Number.isFinite(quantityKg) && quantityKg > 0) {
      totals.set(feedData.inventoryFeedId, quantityKg);
    }
  }

  return Array.from(totals, ([inventoryFeedId, quantityKg]) => ({ inventoryFeedId, quantityKg }));
};

export const sumFeedAllocations = (allocations: FeedAllocation[]): number =>
  allocations.reduce((total, allocation) => total + allocation.quantityKg, 0);

export interface DailyFeedUsageLike {
  date?: unknown;
  pondId?: unknown;
  quantity?: unknown;
  notes?: unknown;
  source?: unknown;
  feedRecordId?: unknown;
}

export const buildDailyFeedRecordId = (pondId: string, date: string): string =>
  `daily-feed:${pondId}:${date}`;

const isLegacyDailyFeedUsage = (notes: unknown): boolean =>
  typeof notes === 'string' && (
    notes === 'Feed screen record' ||
    notes.startsWith('Daily feed for pond:')
  );

export const isDailyFeedUsage = (
  usage: DailyFeedUsageLike,
  pondId: string,
  date: string,
): boolean => {
  if (usage.date !== date || usage.pondId !== pondId) return false;

  const recordId = buildDailyFeedRecordId(pondId, date);
  return usage.feedRecordId === recordId ||
    usage.source === DAILY_FEED_USAGE_SOURCE ||
    isLegacyDailyFeedUsage(usage.notes);
};

export const getDailyFeedUsageTotal = (
  usages: DailyFeedUsageLike[] | null | undefined,
  pondId: string,
  date: string,
): number => (usages || [])
  .filter((usage) => isDailyFeedUsage(usage, pondId, date))
  .reduce((total, usage) => {
    const quantity = Number(usage.quantity);
    return total + (Number.isFinite(quantity) ? quantity : 0);
  }, 0);

export const getDailyFeedUsageAdjustment = (desiredQuantity: number, alreadyDeducted: number): number => {
  if (!Number.isFinite(desiredQuantity) || !Number.isFinite(alreadyDeducted)) return 0;
  return desiredQuantity - alreadyDeducted;
};

export const formatFeedQuantityForDisplay = (value: unknown): string => {
  const quantity = Number(value);
  if (!Number.isFinite(quantity)) return '0';
  return String(Math.round((quantity + Number.EPSILON) * 100) / 100);
};
