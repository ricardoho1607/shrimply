const assert = require('node:assert/strict');
const test = require('node:test');
require('../scripts/register-typescript.cjs');
const date = require('./farmDate.ts');

test('reused formatters keep farm days correct across timezone changes, DST and rollover', () => {
  const cases = [
    ['2026-10-03T15:59:59Z', 'Australia/Melbourne'],
    ['2026-10-03T16:00:00Z', 'Australia/Melbourne'],
    ['2026-04-04T15:59:59Z', 'Australia/Melbourne'],
    ['2026-04-04T16:00:00Z', 'Australia/Melbourne'],
    ['2026-10-28T19:59:59Z', 'Asia/Jakarta'],
    ['2026-10-28T20:00:00Z', 'Asia/Jakarta'],
    ['2026-10-28T02:00:00Z', 'America/Los_Angeles'],
  ];
  // Independent uncached reference; run twice in different orders to exercise reuse.
  for (const [instant, zone] of [...cases, ...cases.toReversed()]) {
    const value = new Date(instant);
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(value).map(p=>[p.type,p.value]));
    const calendar = `${parts.year}-${parts.month}-${parts.day}`;
    const operational = Number(parts.hour) < 3 ? new Date(Date.parse(calendar+'T00:00:00Z')-86400000).toISOString().slice(0,10) : calendar;
    assert.equal(date.getFarmDateKey(value, zone), calendar);
    assert.equal(date.getFarmOperationalDateKey(value, zone), operational);
  }
  assert.equal(date.resolveFarmTimeZone('bad/timezone', 'Asia/Jakarta'), 'Asia/Jakarta');
  assert.equal(date.resolveFarmTimeZone(' Asia/Jakarta '), 'Asia/Jakarta');
  assert.equal(date.resolveFarmTimeZone('bad/timezone', 'also/bad'), 'UTC');
});

test('invalid date keys stay invalid and timestamps still use their farm timezone', () => {
  assert.equal(date.normalizeFarmDateKey('2026-02-30','Asia/Jakarta'), null);
  assert.equal(date.normalizeFarmDateKey('2026-10-28','Asia/Jakarta'), '2026-10-28');
  assert.equal(date.normalizeFarmDateKey({seconds:Date.parse('2026-10-28T20:00:00Z')/1000}, 'Asia/Jakarta'), '2026-10-29');
  for (let i=0;i<100;i++) assert.equal(date.isValidTimeZone(`invalid/${i}`), false);
  assert.equal(date.getFarmDateKey(new Date('2026-10-28T20:00:00Z'), 'Asia/Jakarta'), '2026-10-29');
});

test('hot date paths do not reconstruct formatters for every record', () => {
  const original = Intl.DateTimeFormat;
  let constructions = 0;
  Intl.DateTimeFormat = new Proxy(original, {construct(target,args) {constructions++; return Reflect.construct(target,args);}});
  try {
    const value = new Date('2026-10-28T20:00:00Z');
    for (let i=0;i<200;i++) date.getFarmOperationalDateKey(value, 'Asia/Makassar');
    assert.ok(constructions <= 3, `${constructions} Intl formatters constructed for one timezone`);
  } finally { Intl.DateTimeFormat = original; }
});
