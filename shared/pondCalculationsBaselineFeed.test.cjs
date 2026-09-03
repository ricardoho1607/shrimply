require('sucrase/register/ts');

const test = require('node:test');
const {
  getPondOperationalFeed,
  getPondTotalFeedConsumed,
} = require('./pondCalculations.ts');

const assertEqual = (actual, expected, message) => {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`);
  }
};

test('existing-cycle baseline feed is not counted twice', () => {
  const existingCyclePond = {
    baselineDate: '2026-09-03',
    baselineCumulativeFeed: 1786,
    samplings: [
      { date: '2026-09-03', feed: 1786, isBaselineEstimate: true, source: 'midcycle_onboarding' },
      { date: '2026-09-02', feedData: { totalDailyFeed: 100 } },
      { date: '2026-09-03', feedData: { totalDailyFeed: 90 } },
      { date: '2026-09-04', feedData: { totalDailyFeed: 120 } },
    ],
  };

  assertEqual(
    getPondOperationalFeed(existingCyclePond),
    120,
    'backlogged feed covered by the existing-cycle baseline is not counted again',
  );
  assertEqual(
    getPondTotalFeedConsumed(existingCyclePond),
    1906,
    'existing-cycle feed total combines the baseline with post-baseline feed only',
  );

  const regularPond = {
    baselineCumulativeFeed: 0,
    samplings: [
      { date: '2026-09-02', feedData: { totalDailyFeed: 100 } },
      { date: '2026-09-04', feedData: { totalDailyFeed: 120 } },
    ],
  };

  assertEqual(
    getPondTotalFeedConsumed(regularPond),
    220,
    'ponds without an opening feed baseline still sum every daily feed record',
  );
});
