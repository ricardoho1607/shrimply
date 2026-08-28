import assert from 'node:assert/strict';
import test from 'node:test';
import { isOperationalSummaryFresh } from './operationalSummary.ts';

const NOW = new Date('2026-08-28T12:00:00Z').getTime();

test('trusts only a recent complete server refresh', () => {
  assert.equal(isOperationalSummaryFresh({
    operationalSummaryVersion: 1,
    operationalFullRefreshAt: new Date('2026-08-28T04:00:00Z'),
  }, NOW), true);
  assert.equal(isOperationalSummaryFresh({
    operationalSummaryVersion: 1,
    operationalFullRefreshAt: { seconds: new Date('2026-08-26T12:00:00Z').getTime() / 1000 },
  }, NOW), false);
  assert.equal(isOperationalSummaryFresh({ operationalSummaryVersion: 1 }, NOW), false);
  assert.equal(isOperationalSummaryFresh({
    operationalSummaryVersion: 2,
    operationalFullRefreshAt: new Date(NOW),
  }, NOW), false);
});
