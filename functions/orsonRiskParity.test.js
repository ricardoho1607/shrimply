const test = require('node:test');
const assert = require('node:assert/strict');
const fixtures = require('../orson/fixtures/riskParity.json');

process.env.NODE_ENV = 'test';
const { calculateRiskReport, getCurrentLabWaterMetrics, getNewOperationalEventFindings, getRiskSignature } = require('./orson').__test;

for (const fixture of fixtures) {
  test(`backend risk parity: ${fixture.id}`, () => {
    const report = calculateRiskReport(fixture.pond, fixture.pond.id);
    const ids = report.findings.map((finding) => finding.id);
    fixture.expectedRiskIds.forEach((id) => assert.ok(ids.includes(id), `expected ${id}`));
    fixture.excludedRiskIds.forEach((id) => assert.ok(!ids.includes(id), `excluded ${id}`));
  });
}

test('backend keeps NH4 separate from TAN and NH3', () => {
  const fixture = fixtures.find((item) => item.id === 'nh4-is-not-tan-or-nh3');
  const metrics = getCurrentLabWaterMetrics(fixture.pond, fixture.pond.id);
  assert.equal(metrics.tanMgL, null);
  assert.equal(metrics.nh3MgL, null);
  assert.equal(metrics.nh4MgL, 0.7);
});

test('backend ignores old-cycle lab metrics', () => {
  const fixture = fixtures.find((item) => item.id === 'old-cycle-lab-is-ignored');
  assert.equal(getCurrentLabWaterMetrics(fixture.pond, fixture.pond.id), null);
});

test('backend detects a newly synced weak feed response even when a later record is normal', () => {
  const after = [
    { id: 'sim-27-water', date: '2026-08-27', doMorning: 5.2, doEvening: 6, ammonia: 0.06 },
    { id: 'sim-27-feed', date: '2026-08-27', feedData: { totalDailyFeed: 7.2, feedingResponse: 'weak' } },
    { id: 'sim-29-water', date: '2026-08-29', doMorning: 6, doEvening: 6.6, ammonia: 0.03 },
    { id: 'sim-29-feed', date: '2026-08-29', feedData: { totalDailyFeed: 8.2, feedingResponse: 'normal' } },
  ];
  const findings = getNewOperationalEventFindings([], after);

  assert.equal(findings.length, 1);
  assert.equal(findings[0].id, 'weak_feeding_response');
  assert.equal(findings[0].severity, 'warning');
  assert.match(findings[0].summary, /2026-08-27/);
});

test('SIM-B1 produces a warning-level dated notification signature', () => {
  const fixture = fixtures.find((item) => item.id === 'sim-b1-operational-water-risk');
  const report = calculateRiskReport(fixture.pond, fixture.pond.id);

  assert.equal(report.overallSeverity, 'warning');
  assert.equal(report.findings[0].id, 'abnormal_shrimp_behaviour');
  assert.match(getRiskSignature(report), /2026-09-01/);
});
