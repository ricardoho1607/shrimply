import { buildOrsonAnalysis } from './pipeline';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const basePond = {
  pondArea: 1000,
  density: 100,
  initialPopulation: 100000,
  initialWeight: 0.5,
  docStart: '2026-01-01',
};

export const runValidationScenarioSelfTest = () => {
  const noPonds = buildOrsonAnalysis([], 'Analyze my farm', new Date('2026-01-20T00:00:00Z'));
  assert(noPonds.reports.length === 0, 'handles no ponds');

  const sparse = buildOrsonAnalysis([
    { id: 'sparse', pondName: 'Sparse Pond', ...basePond, samplings: [] },
  ], 'Analyze Sparse Pond', new Date('2026-01-20T00:00:00Z'));
  assert(sparse.reports[0].findings.some((risk) => risk.id === 'missing_data'), 'flags sparse data');

  const healthy = buildOrsonAnalysis([
    {
      id: 'healthy',
      pondName: 'Healthy Pond',
      ...basePond,
      samplings: [
        { id: 'h1', date: '2026-01-10', mbw: 2, mortality: 5, feed: 12, phMorning: 7.8, phEvening: 8, doMorning: 5.5, doEvening: 5.1, salinity: 18, feedData: { totalDailyFeed: 12, anco1: 90, anco2: 92 } },
        { id: 'h2', date: '2026-01-17', mbw: 3.8, mortality: 5, feed: 18, phMorning: 7.8, phEvening: 8, doMorning: 5.4, doEvening: 5, salinity: 18, feedData: { totalDailyFeed: 18, anco1: 90, anco2: 92 } },
      ],
    },
  ], 'Analyze Healthy Pond', new Date('2026-01-20T00:00:00Z'));
  assert(healthy.outlooks[0].level === 'info' || healthy.outlooks[0].level === 'watch', 'healthy pond stays below warning');

  const lowDo = buildOrsonAnalysis([
    {
      id: 'low-do',
      pondName: 'Low DO Pond',
      ...basePond,
      samplings: [
        { id: 'd1', date: '2026-01-17', mbw: 3, mortality: 10, feed: 18, phMorning: 7.8, phEvening: 8.1, doMorning: 3.8, doEvening: 3.4, salinity: 18, feedData: { totalDailyFeed: 18, anco1: 85, anco2: 80 } },
      ],
    },
  ], 'Analyze Low DO Pond', new Date('2026-01-20T00:00:00Z'));
  assert(lowDo.reports[0].findings.some((risk) => risk.id === 'low_do'), 'flags low DO pond');

  const slowGrowthHighFcr = buildOrsonAnalysis([
    {
      id: 'slow-growth',
      pondName: 'Slow Growth Pond',
      ...basePond,
      samplings: [
        { id: 'g1', date: '2026-01-10', mbw: 5, mortality: 20, feed: 80, phMorning: 7.8, phEvening: 8, doMorning: 5, doEvening: 4.8, salinity: 18, feedData: { totalDailyFeed: 80, anco1: 82, anco2: 80 } },
        { id: 'g2', date: '2026-01-17', mbw: 5.1, mortality: 20, feed: 90, phMorning: 7.8, phEvening: 8, doMorning: 5, doEvening: 4.8, salinity: 18, feedData: { totalDailyFeed: 90, anco1: 80, anco2: 78 } },
      ],
    },
  ], 'Analyze growth and FCR', new Date('2026-01-20T00:00:00Z'));
  assert(slowGrowthHighFcr.reports[0].findings.some((risk) => risk.id === 'slow_growth'), 'flags slow growth');
  assert(slowGrowthHighFcr.reports[0].findings.some((risk) => risk.id === 'high_fcr' || risk.id === 'feed_pressure_high'), 'flags high FCR or feed pressure');

  const missingWater = buildOrsonAnalysis([
    {
      id: 'missing-water',
      pondName: 'Missing Water Pond',
      ...basePond,
      samplings: [
        { id: 'm1', date: '2026-01-10', mbw: 2, mortality: 5, feed: 12, feedData: { totalDailyFeed: 12, anco1: 90, anco2: 92 } },
        { id: 'm2', date: '2026-01-17', mbw: 3, mortality: 5, feed: 16, feedData: { totalDailyFeed: 16, anco1: 88, anco2: 90 } },
      ],
    },
  ], 'Analyze Missing Water Pond', new Date('2026-01-20T00:00:00Z'));
  assert(missingWater.reports[0].findings.some((risk) => risk.id === 'missing_data'), 'flags missing water-quality data');

  return {
    noPonds,
    sparse,
    healthy,
    lowDo,
    slowGrowthHighFcr,
    missingWater,
  };
};
