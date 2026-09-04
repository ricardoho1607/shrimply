require('sucrase/register/ts');
const test = require('node:test');
const assert = require('node:assert/strict');
const { initializeWaterDraft, isDailyWaterRecord } = require('./waterFormState.ts');

test('draft is independent of later snapshots and preserves typed salinity and pH', () => {
  const records = [];
  const draft = initializeWaterDraft('sim-f1', '2026-09-04', records);
  Object.assign(draft, { salinity: '19.1', phMorning: '8.05', phEvening: '8.35' });
  records.push({ date: '2026-09-04', mbw: 0, feed: 0, mortality: 0, salinity: '16' });
  assert.equal(draft.salinity, '19.1');
  assert.equal(draft.phMorning, '8.05');
  assert.equal(draft.phEvening, '8.35');
});

test('correction selects the existing daily record, excludes feed/sampling, and keeps zero readings', () => {
  const records = [
    { id: 'feed', date: '2026-09-04', mbw: 0, mortality: 0, feed: 0, feedData: {} },
    { id: 'sampling', date: '2026-09-04', mbw: 2, mortality: 0, feed: 0 },
    { id: 'water', date: '2026-09-04', mbw: 0, mortality: 0, feed: 0, ammonia: 0, waterExchangePercent: 0, surfaceScum: false },
  ];
  assert.equal(records.findIndex(record => isDailyWaterRecord(record, '2026-09-04')), 2);
  const draft = initializeWaterDraft('sim-f1', '2026-09-04', records);
  assert.equal(draft.ammonia, '0');
  assert.equal(draft.waterExchangePercent, '0');
  assert.equal(draft.surfaceScum, false);
});
