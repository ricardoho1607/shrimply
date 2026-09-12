const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { FARM_OPERATIONAL_DAY_ROLLOVER_HOUR, farmDateKey } = require('./farmDate');

test('Orson usage day resets at 3am in each farm timezone', () => {
  assert.equal(FARM_OPERATIONAL_DAY_ROLLOVER_HOUR, 3);

  assert.equal(farmDateKey('Asia/Jakarta', new Date('2026-09-11T19:59:59.000Z')), '2026-09-11');
  assert.equal(farmDateKey('Asia/Jakarta', new Date('2026-09-11T20:00:00.000Z')), '2026-09-12');

  assert.equal(farmDateKey('Australia/Melbourne', new Date('2026-09-11T16:59:59.000Z')), '2026-09-11');
  assert.equal(farmDateKey('Australia/Melbourne', new Date('2026-09-11T17:00:00.000Z')), '2026-09-12');
});

test('the authoritative Orson quota uses the operational farm date', () => {
  const source = fs.readFileSync(path.join(__dirname, 'orson.js'), 'utf8');
  assert.match(source, /require\("\.\/farmDate"\)/);
  assert.match(source, /const dateKey = farmDateKey\(timeZone\)/);
});
