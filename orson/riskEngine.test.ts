import { calculatePondMetrics } from './metrics';
import { normalizePondData } from './normalizePondData';
import { analyzePondRisks, analyzePondsRisks, compareWholeFarmRiskReports } from './riskEngine';
import type { OrsonRiskReport } from './types';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

export const runRiskEngineSelfTest = () => {
  const pond = normalizePondData(
    {
      id: 'pond-risk',
      pondName: 'Risk Pond',
      pondArea: 1000,
      density: 100,
      initialPopulation: 100000,
      initialWeight: 0.5,
      docStart: '2026-01-01',
      samplings: [
        {
          id: 's1',
          date: '2026-01-10',
          mbw: 1.5,
          mortality: 50,
          feed: 40,
          phMorning: 7.8,
          phEvening: 8.1,
          doMorning: 4.8,
          doEvening: 4.4,
          salinity: 18,
          feedData: { totalDailyFeed: 40 },
        },
        {
          id: 's2',
          date: '2026-01-15',
          mbw: 2,
          mortality: 100,
          feed: 30,
          phMorning: 7.5,
          phEvening: 8.5,
          doMorning: 4.1,
          doEvening: 3.6,
          salinity: 25,
          feedData: { totalDailyFeed: 30 },
        },
      ],
    },
    { now: new Date('2026-01-15T18:00:00Z'), timeZone: 'UTC' },
  );

  const metrics = calculatePondMetrics(pond);
  const report = analyzePondRisks(metrics, new Date('2026-01-15T18:00:00Z'));
  const ids = report.findings.map((finding) => finding.id);

  assert(report.pondName === 'Risk Pond', 'keeps pond identity');
  assert(report.overallSeverity === 'warning', 'uses highest severity');
  assert(ids.includes('low_do'), 'flags low DO');
  assert(ids.includes('do_decline'), 'flags DO decline');
  assert(ids.includes('ph_instability'), 'flags pH swing');
  assert(ids.includes('feed_allocation_drop'), 'flags a material feed allocation decrease');
  assert(ids.includes('feed_pressure_high'), 'flags high feed pressure');
  assert(ids.includes('biomass_model_disagreement'), 'flags biomass model disagreement');
  assert(ids.includes('salinity_shock'), 'flags salinity movement');
  assert(report.findings.every((finding) => finding.evidence.length > 0), 'adds evidence for every finding');
  assert(report.findings.every((finding) => finding.recommendation.length > 0), 'adds recommendation for every finding');

  // Test 1: Fresh low DO stays current, dated, and active severity
  const freshDoFinding = report.findings.find((f) => f.id === 'low_do');
  assert(freshDoFinding !== undefined, 'finds low DO finding');
  assert(freshDoFinding?.severity === 'warning', 'DO 3.6 mg/L fresh is warning');
  assert(freshDoFinding?.eventDate === '2026-01-15', 'fresh DO carries eventDate');
  assert(!freshDoFinding?.title.includes('Historical'), 'fresh DO title is active, not historical');

  // Test 2: Stale low DO becomes historical with age/recheck and does not raise current severity to warning/critical
  const staleReport = analyzePondRisks(metrics, new Date('2026-02-05T00:00:00Z'));
  const staleDoFinding = staleReport.findings.find((f) => f.id === 'low_do');
  assert(staleDoFinding !== undefined, 'stale low DO finding exists');
  assert(staleDoFinding?.severity === 'watch', 'stale low DO is capped at watch severity');
  assert(staleDoFinding?.title.includes('Historical low DO'), 'stale low DO title notes historical');
  assert(staleDoFinding?.title.includes('21d old - recheck required'), 'stale low DO title gives age in days');
  assert(staleDoFinding?.evidence.some((e) => e.includes('stale')), 'stale low DO evidence notes stale measurement');
  assert(staleReport.overallSeverity !== 'warning' && staleReport.overallSeverity !== 'critical', 'historical abnormal readings do not raise current severity');

  const futurePond = normalizePondData({
    id: 'pond-future-do',
    pondName: 'Future DO Pond',
    samplings: [{ id: 'future-do', date: '2026-01-16T01:00:00Z', doMorning: 3.2 }],
  }, { now: new Date('2026-01-15T18:00:00Z'), timeZone: 'UTC' });
  const futureDoFinding = analyzePondRisks(
    calculatePondMetrics(futurePond),
    new Date('2026-01-15T18:00:00Z'),
  ).findings.find((f) => f.id === 'low_do');
  assert(futureDoFinding !== undefined, 'future low DO is retained as a finding');
  assert(futureDoFinding?.severity === 'watch' && futureDoFinding?.status === 'historical', 'future measurements cannot qualify as a current risk');

  // Test 3: Compound current evidence compatible dates vs differing dates
  // 3a: Compatible dates (DO < 4 and temp > 32 on the same fresh date)
  const pondCompatible = normalizePondData(
    {
      id: 'pond-compat',
      pondName: 'Compat Pond',
      docStart: '2026-01-01',
      samplings: [
        {
          id: 'c1',
          date: '2026-01-15',
          doMorning: 3.2,
          doEvening: 3.4,
          temperature: 33.5,
          feed: 20,
        },
      ],
    },
    { now: new Date('2026-01-15T18:00:00Z') },
  );
  const metricsCompat = calculatePondMetrics(pondCompatible);
  const reportCompat = analyzePondRisks(metricsCompat, new Date('2026-01-15T18:00:00Z'));
  const compoundCompatFinding = reportCompat.findings.find((f) => f.id === 'low_do_high_temperature');
  assert(compoundCompatFinding !== undefined, 'finds compatible compound risk');
  assert(compoundCompatFinding?.severity === 'critical', 'compatible low DO + high temp is critical');
  assert(compoundCompatFinding?.title === 'Low DO combined with high temperature', 'compatible title is active');

  // 3b: Differing dates (DO < 4 on 2026-01-10, temp > 32 on 2026-01-15: differing dates > 1 day)
  const pondDiffering = normalizePondData(
    {
      id: 'pond-diff',
      pondName: 'Diff Pond',
      docStart: '2026-01-01',
      samplings: [
        {
          id: 'd1',
          date: '2026-01-10',
          doMorning: 3.2,
          doEvening: 3.4,
          temperature: 28,
        },
        {
          id: 'd2',
          date: '2026-01-15',
          doMorning: null,
          doEvening: null,
          temperature: 33.5,
        },
      ],
    },
    { now: new Date('2026-01-15T18:00:00Z') },
  );
  const metricsDiffering = calculatePondMetrics(pondDiffering);
  const reportDiffering = analyzePondRisks(metricsDiffering, new Date('2026-01-15T18:00:00Z'));
  const compoundDiffFinding = reportDiffering.findings.find((f) => f.id === 'low_do_high_temperature');
  assert(compoundDiffFinding !== undefined, 'finds differing dates compound risk');
  assert(compoundDiffFinding?.severity === 'watch', 'differing dates compound risk is capped at watch');
  assert(compoundDiffFinding?.title.includes('differing dates'), 'title indicates differing dates');
  assert(compoundDiffFinding?.evidence.some((e) => e.includes('differing observation dates')), 'evidence notes differing dates');

  // 3c: Transparency compounds retain both metric sources and require compatible dates.
  const transparencyCurrent = normalizePondData({
    id: 'pond-transparency-current',
    pondName: 'Current Transparency Pond',
    samplings: [{ id: 't1', date: '2026-01-15', transparency: 20, doMorning: 3.2 }],
  }, { now: new Date('2026-01-15T18:00:00Z'), timeZone: 'UTC' });
  const currentTransparencyFinding = analyzePondRisks(
    calculatePondMetrics(transparencyCurrent),
    new Date('2026-01-15T18:00:00Z'),
  ).findings.find((f) => f.id === 'plankton_transparency_instability');
  assert(currentTransparencyFinding !== undefined, 'current transparency compound is found');
  assert(currentTransparencyFinding?.status === 'current', 'same-date supporting water evidence stays current');
  assert(currentTransparencyFinding?.measurementEvidence?.length === 2, 'both transparency and unstable-water evidence are attached');

  const transparencyHistorical = normalizePondData({
    id: 'pond-transparency-historical',
    pondName: 'Historical Transparency Pond',
    samplings: [
      { id: 't-old-do', date: '2026-01-14', doMorning: 3.2 },
      { id: 't-new-transparency', date: '2026-01-15', transparency: 20 },
    ],
  }, { now: new Date('2026-01-15T18:00:00Z'), timeZone: 'UTC' });
  const historicalTransparencyFinding = analyzePondRisks(
    calculatePondMetrics(transparencyHistorical),
    new Date('2026-01-15T18:00:00Z'),
  ).findings.find((f) => f.id === 'plankton_transparency_instability');
  assert(historicalTransparencyFinding !== undefined, 'historical transparency compound is retained');
  assert(historicalTransparencyFinding?.severity === 'watch', 'different-date water evidence is watch only');
  assert(historicalTransparencyFinding?.status === 'historical', 'different dates are marked historical');

  // Test 4: Whole-farm ranking is independent of input order
  const mockReportCritical: OrsonRiskReport = {
    pondId: 'p-crit',
    pondName: 'Alpha Pond',
    overallSeverity: 'critical',
    findings: [
      {
        id: 'low_do',
        severity: 'critical',
        confidence: 0.9,
        title: 'Critical finding',
        summary: 'Emergency',
        evidence: ['DO 2.5'],
        recommendation: 'Aeration',
        metricRefs: [],
        eventDate: '2026-01-15',
      },
    ],
    generatedAt: '2026-01-16T00:00:00Z',
  };

  const mockReportWarning: OrsonRiskReport = {
    pondId: 'p-warn',
    pondName: 'Beta Pond',
    overallSeverity: 'warning',
    findings: [
      {
        id: 'unsafe_ph',
        severity: 'warning',
        confidence: 0.85,
        title: 'Warning finding',
        summary: 'Alert',
        evidence: ['pH 8.8'],
        recommendation: 'Monitor',
        metricRefs: [],
        eventDate: '2026-01-14',
      },
    ],
    generatedAt: '2026-01-16T00:00:00Z',
  };

  const mockReportWatch: OrsonRiskReport = {
    pondId: 'p-watch',
    pondName: 'Gamma Pond',
    overallSeverity: 'watch',
    findings: [
      {
        id: 'ammonia_elevated',
        severity: 'watch',
        confidence: 0.7,
        title: 'Watch finding',
        summary: 'Notice',
        evidence: ['Transparency 20'],
        recommendation: 'Check',
        metricRefs: [],
        eventDate: '2026-01-12',
      },
    ],
    generatedAt: '2026-01-16T00:00:00Z',
  };

  const order1 = [mockReportWatch, mockReportCritical, mockReportWarning].sort(compareWholeFarmRiskReports);
  const order2 = [mockReportWarning, mockReportWatch, mockReportCritical].sort(compareWholeFarmRiskReports);
  const order3 = [mockReportCritical, mockReportWarning, mockReportWatch].sort(compareWholeFarmRiskReports);

  assert(order1.map((r) => r.pondId).join(',') === 'p-crit,p-warn,p-watch', 'order 1 ranked critical first, then warning, then watch');
  assert(order2.map((r) => r.pondId).join(',') === 'p-crit,p-warn,p-watch', 'order 2 ranked critical first, then warning, then watch');
  assert(order3.map((r) => r.pondId).join(',') === 'p-crit,p-warn,p-watch', 'order 3 ranked critical first, then warning, then watch');

  // Multi-pond metrics analyzePondsRisks sorting order independence
  const multiReports1 = analyzePondsRisks([metricsCompat, metrics]);
  const multiReports2 = analyzePondsRisks([metrics, metricsCompat]);
  assert(
    multiReports1.map((r) => r.pondId).join(',') === multiReports2.map((r) => r.pondId).join(','),
    'analyzePondsRisks produces identical ordering regardless of input order',
  );
  assert(multiReports1[0].pondId === 'pond-compat', 'critical pond-compat ranks before warning pond-risk');

  return report;
};
