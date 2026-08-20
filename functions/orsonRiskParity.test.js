const test = require('node:test');
const assert = require('node:assert/strict');
const fixtures = require('../orson/fixtures/riskParity.json');

process.env.NODE_ENV = 'test';
const { calculateRiskReport, getCurrentLabWaterMetrics } = require('./orson').__test;

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
