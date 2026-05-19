import { buildOrsonAnalysis } from './pipeline';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

export const runPipelineSelfTest = () => {
  const analysis = buildOrsonAnalysis([
    {
      id: 'pond-pipeline',
      pondName: 'Pipeline Pond',
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
          doMorning: 4.8,
          doEvening: 4.4,
          feedData: { totalDailyFeed: 10, anco1: 90, anco2: 85 },
        },
        {
          id: 's2',
          date: '2026-01-15',
          mbw: 2,
          mortality: 100,
          feed: 30,
          doMorning: 4.1,
          doEvening: 3.6,
          feedData: { totalDailyFeed: 30, anco1: 65, anco2: 55 },
        },
      ],
    },
  ], 'Analyze my feed risk', new Date('2026-01-16T00:00:00Z'));

  assert(analysis.normalizedPonds.length === 1, 'normalizes ponds');
  assert(analysis.metrics.length === 1, 'calculates metrics');
  assert(analysis.reports[0].findings.length > 0, 'creates risk report');
  assert(analysis.outlooks[0].direction === 'deteriorating', 'creates outlook');
  assert(analysis.promptPackage.context.includes('ORSON RISK PAYLOAD'), 'creates prompt package');

  return analysis;
};

