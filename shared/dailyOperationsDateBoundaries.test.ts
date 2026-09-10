import assert from 'node:assert/strict';
import test from 'node:test';
import { getFarmDateKey, normalizeFarmDateKey, shiftDateKey } from './farmDate.ts';
import { buildDailyOperationsReport, generateDailyOperationsReportHTML, type DailyOperationsPondSource } from './dailyOperationsReport.ts';

const pondsFor = (start: string, last: string, next: string): DailyOperationsPondSource[] => Array.from({ length: 8 }, (_, i) => ({
  id: `sim-${i}`, pondName: `SIM-${String.fromCharCode(65 + i)}1`,
  docStart: '2026-08-20', initialPopulation: 300000, pondArea: 2500,
  samplings: [
    { date: new Date(Date.parse(start) - 1).toISOString(), phMorning: 7.1, feedData: { totalDailyFeed: 9 } },
    { date: start, phMorning: 7.8, feedData: { totalDailyFeed: 10 + i } },
    { date: last, phEvening: 8.1, feedData: { totalDailyFeed: 20 + i } },
    { date: next, phEvening: 9.1, feedData: { totalDailyFeed: 99 } },
  ],
  mortalityRecords: [{ date: start, count: 2 }, { date: next, count: 999 }],
}));

for (const [zone, start, last, next] of [
  ['Asia/Jakarta', '2026-09-09T17:00:00Z', '2026-09-10T16:59:59.999Z', '2026-09-10T17:00:00Z'],
  ['Australia/Melbourne', '2026-09-09T14:00:00Z', '2026-09-10T13:59:59.999Z', '2026-09-10T14:00:00Z'],
  ['America/Los_Angeles', '2026-09-10T07:00:00Z', '2026-09-11T06:59:59.999Z', '2026-09-11T07:00:00Z'],
]) {
  test(`${zone}: all eight September 10 rows use DOC 21 and the complete local day, including PDF export`, () => {
    const report = buildDailyOperationsReport({ reportDate: '2026-09-10', timeZone: zone, ponds: pondsFor(start, last, next), harvests: [] });
    assert.deepEqual(report.warnings, []);
    assert.equal(report.reportDate, '2026-09-10');
    assert.equal(report.waterQualityRows.length, 8);
    assert.equal(report.siponRows.length, 8);
    report.waterQualityRows.forEach((row, i) => {
      assert.equal(row.doc, 21);
      assert.equal(row.phMorning, '7.8');
      assert.equal(row.phEvening, '8.1');
      assert.equal(row.dailyFeedKg, String(30 + 2 * i));
      assert.equal(row.cumulativeFeedKg, String(39 + 2 * i));
    });
    assert.ok(report.siponRows.every(row => row.doc === 21 && row.dailyTotal === 2));
    for (const ios of [false, true]) {
      const html = generateDailyOperationsReportHTML(report, { logoBase64: '', backgroundBase64: '' }, 'en', ios);
      assert.match(html, /September 10, 2026|10 September 2026/);
      assert.doesNotMatch(html, /September 09, 2026|09 September 2026/);
      for (const row of report.waterQualityRows) assert.ok(html.includes(row.pondName));
      assert.equal((html.match(/<td>21<\/td>/g) || []).length, 16);
    }
  });
}

test('ISO report dates use the company timezone instead of silently truncating to UTC', () => {
  const report = buildDailyOperationsReport({ reportDate: '2026-09-09T17:30:00Z', timeZone: 'Asia/Jakarta', ponds: [] });
  assert.equal(report.reportDate, '2026-09-10');
});

test('live and serialized Firestore Timestamps use the farm date without shifting date-only records', () => {
  const instant = new Date('2026-09-09T17:00:00Z');
  for (const value of [instant, { toDate: () => instant }, { seconds: instant.getTime() / 1000, nanoseconds: 0 }]) {
    assert.equal(normalizeFarmDateKey(value, 'Asia/Jakarta'), '2026-09-10');
  }
  assert.equal(normalizeFarmDateKey('2026-09-10', 'America/Los_Angeles'), '2026-09-10');
  for (const value of [null, '', {}, true, '2026-02-30', '2026-13-01']) assert.equal(normalizeFarmDateKey(value, 'Asia/Jakarta'), null);
});

test('Firestore snapshot records with serialized timestamps keep all eight local-day rows', () => {
  const rawPonds = JSON.parse(JSON.stringify(pondsFor('2026-09-09T17:00:00Z', '2026-09-10T16:59:59Z', '2026-09-10T17:00:00Z')));
  for (const pond of rawPonds) {
    for (const record of [...pond.samplings, ...pond.mortalityRecords]) record.date = { seconds: Date.parse(record.date) / 1000, nanoseconds: 0 };
  }
  const report = buildDailyOperationsReport({ reportDate: '2026-09-10', timeZone: 'Asia/Jakarta', ponds: rawPonds, harvests: [] });
  assert.equal(report.waterQualityRows.length, 8);
  assert.ok(report.waterQualityRows.every(row => row.doc === 21 && row.phMorning === '7.8' && row.phEvening === '8.1'));
  assert.ok(report.siponRows.every(row => row.dailyTotal === 2));
});

for (const [date, start, end] of [
  ['2026-10-04', '2026-10-03T14:00:00Z', '2026-10-04T13:00:00Z'], // 23 hours
  ['2026-04-05', '2026-04-04T13:00:00Z', '2026-04-05T14:00:00Z'], // 25 hours
]) {
  test(`Melbourne DST ${date}: local-day boundaries do not assume 24 hours`, () => {
    const zone = 'Australia/Melbourne';
    assert.equal(getFarmDateKey(new Date(Date.parse(start) - 1), zone), shiftDateKey(date, -1));
    assert.equal(getFarmDateKey(new Date(start), zone), date);
    assert.equal(getFarmDateKey(new Date(Date.parse(end) - 1), zone), date);
    assert.equal(getFarmDateKey(new Date(end), zone), shiftDateKey(date, 1));
  });
}
