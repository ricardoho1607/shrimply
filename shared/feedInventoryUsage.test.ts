import {
  DAILY_FEED_USAGE_SOURCE,
  buildDailyFeedRecordId,
  getDailyFeedUsageTotal,
  isDailyFeedUsage,
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

  return true;
};
