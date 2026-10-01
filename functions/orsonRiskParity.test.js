const test = require('node:test');
const assert = require('node:assert/strict');
const fixtures = require('../orson/fixtures/riskParity.json');

process.env.NODE_ENV = 'test';
const {
  calculateRiskReport,
  compareWholeFarmPondReports,
  summarizePondRisks,
  getCurrentLabWaterMetrics,
  getNewOperationalEventFindings,
  getOrsonNotificationPriority,
  getRiskSignature,
} = require('./orson').__test;

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
  const report = calculateRiskReport(fixture.pond, fixture.pond.id, { asOfDate: '2026-08-19', timeZone: 'UTC' });

  assert.equal(report.overallSeverity, 'warning');
  assert.equal(report.findings[0].id, 'abnormal_shrimp_behaviour');
  assert.equal(report.findings.some((finding) => finding.id === 'ammonia_elevated'), false);
  assert.match(getRiskSignature(report), /2026-08-19/);
  assert.equal(
    getOrsonNotificationPriority(report.findings[0].severity, report.findings.map((finding) => finding.id)),
    'high',
  );
});

test('fresh low DO produces critical severity with eventDate', () => {
  const pond = {
    id: 'pond-fresh-do',
    pondName: 'Fresh DO Pond',
    samplings: [
      {
        id: 's1',
        date: '2026-08-19',
        doMorning: 3.2,
        doEvening: 3.4,
      },
    ],
  };
  const report = calculateRiskReport(pond, pond.id, { asOfDate: '2026-08-19' });
  const finding = report.findings.find((f) => f.id === 'low_do');
  assert.ok(finding, 'low_do finding exists');
  assert.equal(finding.severity, 'critical');
  assert.equal(finding.eventDate, '2026-08-19');
  assert.ok(!finding.title.includes('Historical'), 'title is not historical');
});

test('stale low DO produces historical watch finding and does not raise overall severity', () => {
  const pond = {
    id: 'pond-stale-do',
    pondName: 'Stale DO Pond',
    samplings: [
      {
        id: 's1',
        date: '2026-08-19',
        doMorning: 3.2,
        doEvening: 3.4,
      },
    ],
  };
  // 17 days later
  const report = calculateRiskReport(pond, pond.id, { asOfDate: '2026-09-05' });
  const finding = report.findings.find((f) => f.id === 'low_do');
  assert.ok(finding, 'low_do finding exists');
  assert.equal(finding.severity, 'watch');
  assert.match(finding.title, /Historical low DO/);
  assert.match(finding.title, /17d old - recheck required/);
  assert.ok(finding.evidence.some((e) => e.includes('stale')), 'evidence notes stale');
  assert.notEqual(report.overallSeverity, 'critical', 'stale low DO does not raise overall severity to critical');
});

test('compound rule evaluates temporal compatibility: compatible is critical, differing dates is watch', () => {
  const compatiblePond = {
    id: 'pond-compat',
    pondName: 'Compatible Pond',
    samplings: [
      {
        id: 'c1',
        date: '2026-08-19',
        doMorning: 3.2,
        temperature: 33,
      },
    ],
  };
  const compatReport = calculateRiskReport(compatiblePond, compatiblePond.id, { asOfDate: '2026-08-19' });
  const compatFinding = compatReport.findings.find((f) => f.id === 'low_do_high_temperature');
  assert.ok(compatFinding, 'compatible finding exists');
  assert.equal(compatFinding.severity, 'critical');
  assert.equal(compatFinding.title, 'Low DO combined with high temperature');

  const differingPond = {
    id: 'pond-diff',
    pondName: 'Differing Dates Pond',
    samplings: [
      {
        id: 'd1',
        date: '2026-08-10',
        doMorning: 3.2,
      },
      {
        id: 'd2',
        date: '2026-08-19',
        temperature: 33,
      },
    ],
  };
  const diffReport = calculateRiskReport(differingPond, differingPond.id, { asOfDate: '2026-08-19' });
  const diffFinding = diffReport.findings.find((f) => f.id === 'low_do_high_temperature');
  assert.ok(diffFinding, 'differing finding exists');
  assert.equal(diffFinding.severity, 'watch');
  assert.match(diffFinding.title, /differing dates/);
  assert.ok(diffFinding.evidence.some((e) => e.includes('differing observation dates')), 'evidence notes differing dates');
});

test('whole-farm pond risk ranking is independent of input order', () => {
  const reportCrit = {
    pondId: 'p-crit',
    pondName: 'Alpha Pond',
    overallSeverity: 'critical',
    findings: [{ id: 'low_do', severity: 'critical', confidence: 0.9, eventDate: '2026-08-19' }],
  };
  const reportWarn = {
    pondId: 'p-warn',
    pondName: 'Beta Pond',
    overallSeverity: 'warning',
    findings: [{ id: 'ph_instability', severity: 'warning', confidence: 0.85, eventDate: '2026-08-18' }],
  };
  const reportWatch = {
    pondId: 'p-watch',
    pondName: 'Gamma Pond',
    overallSeverity: 'watch',
    findings: [{ id: 'transparency', severity: 'watch', confidence: 0.7, eventDate: '2026-08-15' }],
  };

  const listA = [reportWatch, reportCrit, reportWarn].sort(compareWholeFarmPondReports);
  const listB = [reportWarn, reportWatch, reportCrit].sort(compareWholeFarmPondReports);
  const listC = [reportCrit, reportWarn, reportWatch].sort(compareWholeFarmPondReports);

  const expectedIds = ['p-crit', 'p-warn', 'p-watch'];
  assert.deepEqual(listA.map((r) => r.pondId), expectedIds);
  assert.deepEqual(listB.map((r) => r.pondId), expectedIds);
  assert.deepEqual(listC.map((r) => r.pondId), expectedIds);
});

test('summarizePondRisks ranks reports deterministically', () => {
  const snapshot1 = {
    docs: [
      { id: 'p-low', data: () => ({ pondName: 'Pond Low', samplings: [{ date: '2026-08-19', transparency: 20 }] }) },
      { id: 'p-high', data: () => ({ pondName: 'Pond High', samplings: [{ date: '2026-08-19', doMorning: 3.0 }] }) },
    ],
  };
  const snapshot2 = {
    docs: [
      { id: 'p-high', data: () => ({ pondName: 'Pond High', samplings: [{ date: '2026-08-19', doMorning: 3.0 }] }) },
      { id: 'p-low', data: () => ({ pondName: 'Pond Low', samplings: [{ date: '2026-08-19', transparency: 20 }] }) },
    ],
  };

  const summary1 = summarizePondRisks(snapshot1);
  const summary2 = summarizePondRisks(snapshot2);

  assert.deepEqual(summary1.reports.map((r) => r.pondId), summary2.reports.map((r) => r.pondId));
  assert.equal(summary1.reports[0].pondId, 'p-high', 'critical pond is ranked first');
});
