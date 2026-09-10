import assert from 'node:assert/strict';
import test from 'node:test';
import * as calculations from './pondCalculations.ts';
import { buildPondReportSnapshot } from './reportSnapshots.ts';

const close = (actual: number | null, expected: number) => assert.ok(actual !== null && Math.abs(actual - expected) < 1e-9, `${actual} should equal ${expected}`);
const pond = {
  id: 'adg-pond', docStart: '2026-08-01', initialWeight: 0.5, initialPopulation: 100000,
  samplings: [
    { id: 's1', date: '2026-08-10', mbw: 2 },
    { id: 's2', date: '2026-08-20', mbw: 4 },
    { id: 's3', date: '2026-08-30', mbw: 6 },
    { id: 's4', date: '2026-09-10', mbw: 11.5 },
  ],
};

test('current sampling ADG is the latest weight difference divided by its 11-day interval, not the median trend', () => {
  close(calculations.calculateAdg(pond), (11.5 - 6) / 11);
  close(calculations.calculatePondMetricsWithHarvest(pond, 'Asia/Jakarta').adg, 0.5);
  close(calculations.calculateSmoothedAdg(pond), 0.2);
});

test('a real slowdown is retained even when older sampling intervals grew faster', () => {
  close(calculations.calculateAdg({ ...pond, samplings: [...pond.samplings.slice(0, 3), { date: '2026-09-10', mbw: 6.55 }] }), 0.05);
});

test('report snapshots calculate the interval ending on each sampling date', () => {
  const expected = [(2 - 0.5) / 9, 0.2, 0.2, 0.5];
  for (const [i, sample] of pond.samplings.entries()) {
    const snapshot = buildPondReportSnapshot(pond, sample.date, [], 'Asia/Jakarta');
    close(calculations.calculatePondMetricsWithHarvest(snapshot, 'Asia/Jakarta').adg, expected[i]);
  }
});

test('zero/missing MBW daily logs and unordered records do not replace the last valid growth sampling', () => {
  const mixed = [...pond.samplings].reverse().concat([
    { id: 'water', date: '2026-09-11', mbw: 0 },
    { id: 'feed', date: '2026-09-07', mbw: 0 },
  ]);
  const original = JSON.stringify(mixed);
  close(calculations.calculateAdg({ ...pond, samplings: mixed }), 0.5);
  assert.equal(JSON.stringify(mixed), original, 'calculation must not mutate saved history');
});

test('negative growth and no weight change are real interval results', () => {
  close(calculations.calculateAdg({ ...pond, samplings: [{ date: '2026-09-01', mbw: 10 }, { date: '2026-09-06', mbw: 9 }] }), -0.2);
  close(calculations.calculateAdg({ ...pond, samplings: [{ date: '2026-09-01', mbw: 10 }, { date: '2026-09-06', mbw: 10 }] }), 0);
});

test('single sampling uses the stocking baseline and missing initial weight falls back to 0.5g', () => {
  close(calculations.calculateAdg({ docStart: '2026-09-01', initialWeight: 1, samplings: [{ date: '2026-09-06', mbw: 2 }] }), 0.2);
  close(calculations.calculateAdg({ docStart: '2026-09-01', samplings: [{ date: '2026-09-06', mbw: 2 }] }), 0.3);
});

test('same-date samples do not create a zero-day rate and ABW/string records use the same formula', () => {
  close(calculations.calculateAdg({ ...pond, samplings: [
    { date: '2026-09-01', abw: '10' },
    { date: '2026-09-06', mbw: '10,5' },
    { date: '2026-09-06', mbw: '11' },
  ] }), 0.2);
});

test('invalid dates cannot displace the latest valid sampling', () => {
  close(calculations.calculateAdg({ ...pond, samplings: [...pond.samplings, { date: 'invalid', mbw: 999 }, { date: '2026-02-30', mbw: 999 }] }), 0.5);
});

test('each historical sampling uses its own MBW, even when another sample was saved on that date', () => {
  const samplings = [{ date: '2026-09-01', mbw: 10 }, { date: '2026-09-06', mbw: 10.5 }, { date: '2026-09-06', mbw: 11 }];
  const source = { ...pond, samplings };
  close(calculations.calculateSamplingAdg(source, samplings[1]), 0.1);
  close(calculations.calculateSamplingAdg(source, samplings[2]), 0.2);
});

test('ADG uses farm calendar days for timestamps crossing local midnight', () => {
  const source = { ...pond, samplings: [{ date: '2026-09-09T16:30:00Z', mbw: 10 }, { date: '2026-09-09T18:00:00Z', mbw: 10.2 }] };
  close(calculations.calculateAdg(source, 'Asia/Jakarta'), 0.2);
  close(calculations.calculatePondMetricsWithHarvest(source, 'Asia/Jakarta').adg, 0.2);
});

test('daylight saving does not turn a one-calendar-day sampling interval into 23 or 25 hours', () => {
  for (const [previous, current] of [
    ['2026-10-03T12:00:00+10:00', '2026-10-04T12:00:00+11:00'],
    ['2026-04-04T12:00:00+11:00', '2026-04-05T12:00:00+10:00'],
  ]) {
    close(calculations.calculateAdg({ samplings: [{ date: previous, mbw: 10 }, { date: current, mbw: 10.3 }] }, 'Australia/Melbourne'), 0.3);
  }
});

test('baseline estimates support only the first observed growth interval', () => {
  const baseline = { date: '2026-09-01', mbw: 10, isBaselineEstimate: true };
  const first = { date: '2026-09-06', mbw: 11 };
  const second = { date: '2026-09-10', mbw: 13 };
  close(calculations.calculateAdg({ ...pond, samplings: [baseline, first] }), 0.2);
  close(calculations.calculateAdg({ ...pond, samplings: [baseline, first, second] }), 0.5);
  close(calculations.calculateAdg({ ...pond, baselineDate: baseline.date, baselineMbw: baseline.mbw, samplings: [first] }), 0.2);
  assert.equal(calculations.calculateSamplingAdg({ ...pond, samplings: [baseline] }, baseline), null);
});

test('missing weights and missing or zero-day intervals have no sampling ADG', () => {
  for (const sample of [{ date: '2026-09-10', mbw: 0 }, { date: '2026-09-10' }, { date: 'invalid', mbw: 10 }]) {
    assert.equal(calculations.calculateSamplingAdg(pond, sample), null);
  }
  const first = { date: '2026-09-10', mbw: 10 };
  assert.equal(calculations.calculateSamplingAdg({ docStart: first.date, samplings: [first] }, first), null);
  assert.equal(calculations.calculateSamplingAdg({ samplings: [first] }, first), null);
});
