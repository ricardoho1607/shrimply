const test = require('node:test');
const assert = require('node:assert/strict');
const {
  belongsToCurrentCycle,
  buildStatus,
  comparableStatus,
  normalizeMetrics,
} = require('./backfill-orson-lab-metrics.cjs');

test('legacy tanMgL is backfilled as NH4, never TAN or NH3', () => {
  const metrics = normalizeMetrics({ waterQuality: { tanMgL: 0.7 } }, '2026-08-19');
  assert.equal(metrics.schemaVersion, 2);
  assert.equal(metrics.waterQuality.tanMgL, null);
  assert.equal(metrics.waterQuality.nh3MgL, null);
  assert.equal(metrics.waterQuality.nh4MgL, 0.7);
});

test('schema two preserves separate ammonia measurements', () => {
  const metrics = normalizeMetrics({
    schemaVersion: 2,
    waterQuality: { tanMgL: 1.2, nh3MgL: 0.02, nh4MgL: 0.7 },
  }, '2026-08-19');
  assert.equal(metrics.waterQuality.tanMgL, 1.2);
  assert.equal(metrics.waterQuality.nh3MgL, 0.02);
  assert.equal(metrics.waterQuality.nh4MgL, 0.7);
});

test('backfill only selects the active pond cycle', () => {
  const pond = { cycleId: 'cycle-current', pondCycleId: 'pond-cycle-current', docStart: '2026-08-01' };
  assert.equal(belongsToCurrentCycle({ cycleId: 'cycle-current' }, pond, 'pond-1'), true);
  assert.equal(belongsToCurrentCycle({ cycleId: 'cycle-old' }, pond, 'pond-1'), false);
  assert.equal(belongsToCurrentCycle({ sampleDate: '2026-07-31' }, pond, 'pond-1'), false);
});

test('backfill status comparison is idempotent across timestamps', () => {
  const pond = { cycleId: 'cycle-current', pondCycleId: 'pond-cycle-current' };
  const status = buildStatus({
    id: 'lab-1',
    reportType: 'water_quality',
    sampleDate: '2026-08-19',
    metrics: { schemaVersion: 2, waterQuality: { tanMgL: 1.2 } },
  }, pond, 'pond-1');
  const existing = { ...status, byType: { water_quality: status }, updatedAt: { seconds: 1 } };
  const rerun = { ...status, byType: { water_quality: status }, updatedAt: { seconds: 2 } };
  assert.deepEqual(comparableStatus(existing), comparableStatus(rerun));
});
