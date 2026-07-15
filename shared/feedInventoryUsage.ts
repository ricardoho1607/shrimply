export const DAILY_FEED_USAGE_SOURCE = 'daily_feed_record' as const;

export const DAILY_FEED_ERROR_CODES = {
  companyUnavailable: 'DAILY_FEED_COMPANY_UNAVAILABLE',
  invalidAmount: 'DAILY_FEED_INVALID_AMOUNT',
  inventoryNotFound: 'DAILY_FEED_INVENTORY_NOT_FOUND',
  insufficientStock: 'DAILY_FEED_INSUFFICIENT_STOCK',
  missingCost: 'DAILY_FEED_MISSING_COST',
} as const;

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
