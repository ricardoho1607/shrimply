import { calculatePondMetrics } from './metrics';
import { normalizePondData } from './normalizePondData';
import { analyzePondRisks } from './riskEngine';

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
          feed: 10,
          phMorning: 7.8,
          phEvening: 8.1,
          doMorning: 4.8,
          doEvening: 4.4,
          salinity: 18,
          feedData: { totalDailyFeed: 10, anco1: 90, anco2: 85 },
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
          feedData: { totalDailyFeed: 30, anco1: 65, anco2: 55 },
        },
      ],
    },
    { now: new Date('2026-01-16T00:00:00Z') },
  );

  const metrics = calculatePondMetrics(pond);
  const report = analyzePondRisks(metrics, new Date('2026-01-16T00:00:00Z'));
  const ids = report.findings.map((finding) => finding.id);

  assert(report.pondName === 'Risk Pond', 'keeps pond identity');
  assert(report.overallSeverity === 'warning', 'uses highest severity');
  assert(ids.includes('low_do'), 'flags low DO');
  assert(ids.includes('do_decline'), 'flags DO decline');
  assert(ids.includes('ph_instability'), 'flags pH swing');
  assert(ids.includes('appetite_drop'), 'flags appetite drop');
  assert(ids.includes('feed_pressure_high'), 'flags high feed pressure');
  assert(ids.includes('biomass_model_disagreement'), 'flags biomass model disagreement');
  assert(ids.includes('salinity_shock'), 'flags salinity movement');
  assert(report.findings.every((finding) => finding.evidence.length > 0), 'adds evidence for every finding');
  assert(report.findings.every((finding) => finding.recommendation.length > 0), 'adds recommendation for every finding');

  return report;
};

