import {
  DAILY_FEED_USAGE_SOURCE,
  buildDailyFeedRecordId,
  getDailyFeedUsageTotal,
  getDailyFeedUsageAdjustment,
  formatFeedQuantityForDisplay,
  isDailyFeedUsage,
  normalizeFeedAllocations,
  sumFeedAllocations,
} from './feedInventoryUsage';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

export const runFeedInventoryUsageSelfTest = () => {
  const pondId = 'pond-a';
  const date = '2026-07-15';
  const usages = [
    { date, pondId, quantity: 10, notes: 'Feed screen record' },
    { date, pondId, quantity: 12, notes: 'Daily feed for pond: A' },
    {
      date,
      pondId,
      quantity: -2,
      source: DAILY_FEED_USAGE_SOURCE,
      feedRecordId: buildDailyFeedRecordId(pondId, date),
    },
    { date, pondId, quantity: 50, notes: 'Manual inventory usage' },
    { date: '2026-07-14', pondId, quantity: 20, source: DAILY_FEED_USAGE_SOURCE },
  ];

  assert(isDailyFeedUsage(usages[0], pondId, date), 'recognizes legacy mobile feed usage');
  assert(isDailyFeedUsage(usages[1], pondId, date), 'recognizes legacy web feed usage');
  assert(isDailyFeedUsage(usages[2], pondId, date), 'recognizes stable daily-feed identity');
  assert(!isDailyFeedUsage(usages[3], pondId, date), 'excludes manual inventory usage');
  assert(getDailyFeedUsageTotal(usages, pondId, date) === 20, 'nets cross-platform adjustments once');
  assert(getDailyFeedUsageAdjustment(110, 0) === 110, 'deducts a new feed record exactly once');
  assert(getDailyFeedUsageAdjustment(110, 110) === 0, 'does not deduct inventory again when editing only the response');
  assert(getDailyFeedUsageAdjustment(115, 110) === 5, 'deducts only the added amount when editing feed quantity');
  assert(formatFeedQuantityForDisplay(7943.200000000001) === '7943.2', 'hides floating-point display noise');

  const legacyAllocations = normalizeFeedAllocations({
    inventoryFeedId: 'feed-a',
    totalDailyFeed: '70',
  });
  assert(legacyAllocations.length === 1 && legacyAllocations[0].quantityKg === 70, 'normalizes a legacy single-feed record');

  const mixedAllocations = normalizeFeedAllocations({
    feedAllocations: [
      { inventoryFeedId: 'feed-a', quantityKg: 70 },
      { inventoryFeedId: 'feed-b', quantityKg: 40 },
      { inventoryFeedId: 'feed-a', quantityKg: 5 },
      { inventoryFeedId: '', quantityKg: 20 },
      { inventoryFeedId: 'feed-c', quantityKg: 0 },
    ],
  });
  assert(mixedAllocations.length === 2, 'ignores invalid allocations and aggregates duplicate feeds');
  assert(sumFeedAllocations(mixedAllocations) === 115, 'sums a multi-feed mix');
  assert(sumFeedAllocations(normalizeFeedAllocations({
    feedAllocations: [
      { inventoryFeedId: 'feed-a', quantityKg: 70 },
      { inventoryFeedId: 'feed-b', quantityKg: 40 },
    ],
  })) === 110, 'calculates a 70 kg plus 40 kg mix as 110 kg');
  assert(normalizeFeedAllocations({ totalDailyFeed: '110' }).length === 0, 'keeps manual totals separate from inventory');

  return true;
};
