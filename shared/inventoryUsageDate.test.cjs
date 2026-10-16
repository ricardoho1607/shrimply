const assert = require('node:assert/strict');
const test = require('node:test');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
require('../scripts/register-typescript.cjs');
const { resolveInventoryUsageDate } = require('./inventoryUsageDate.ts');

test('usage date keeps an explicit calendar day in every farm time zone', () => {
  for (const zone of ['Asia/Jakarta', 'Australia/Melbourne', 'America/Los_Angeles']) {
    assert.equal(resolveInventoryUsageDate('2026-10-02', zone, new Date('2026-10-16T00:00:00Z')), '2026-10-02');
  }
});

test('usage date defaults to farm today and rejects invalid or future days', () => {
  const now = new Date('2026-10-15T18:00:00Z');
  assert.equal(resolveInventoryUsageDate(undefined, 'Asia/Jakarta', now), '2026-10-16');
  assert.equal(resolveInventoryUsageDate(undefined, 'America/Los_Angeles', now), '2026-10-15');
  assert.equal(resolveInventoryUsageDate('2024-02-29', 'UTC', now), '2024-02-29');
  for (const value of ['', '2026-02-29', '2026-02-30', '2026-13-01', '2026-10-16T00:00:00Z', ' 2026-10-01', '2026-10-17']) {
    assert.throws(() => resolveInventoryUsageDate(value, 'Asia/Jakarta', now), /usage date/i);
  }
});

test('mobile date picker keeps the selected calendar day across device time zones and DST', () => {
  const root = path.resolve(__dirname, '..');
  const script = `require('./scripts/register-typescript.cjs');
    const { inventoryUsageDateFromPicker } = require('./shared/inventoryUsageDate.ts');
    console.log(JSON.stringify([new Date(2026, 9, 2), new Date(2026, 9, 4), new Date(2026, 2, 8)]
      .map(inventoryUsageDateFromPicker)));`;
  for (const TZ of ['Australia/Melbourne', 'Asia/Jakarta', 'America/Los_Angeles']) {
    const dates = JSON.parse(execFileSync(process.execPath, ['-e', script], { cwd: root, env: { ...process.env, TZ }, encoding: 'utf8' }));
    assert.deepEqual(dates, ['2026-10-02', '2026-10-04', '2026-03-08']);
  }
});
