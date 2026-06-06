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
  assert(analysis.promptPackage.questionFocus.intent === 'feed', 'detects feed intent');

  const focused = buildOrsonAnalysis([
    {
      id: 'a1',
      pondName: 'A1',
      pondArea: 1000,
      density: 100,
      initialPopulation: 100000,
      initialWeight: 0.5,
      docStart: '2026-01-01',
      samplings: [
        { id: 'a1-s1', date: '2026-01-10', mbw: 2, mortality: 10, feed: 12, doMorning: 5, doEvening: 4.8 },
      ],
    },
    {
      id: 'b2',
      pondName: 'B2',
      pondArea: 1000,
      density: 100,
      initialPopulation: 100000,
      initialWeight: 0.5,
      docStart: '2026-01-01',
      samplings: [
        { id: 'b2-s1', date: '2026-01-10', mbw: 2, mortality: 10, feed: 12, doMorning: 3.4, doEvening: 3.2 },
      ],
    },
  ], 'Why is feed high in A1?', new Date('2026-01-16T00:00:00Z'));

  assert(focused.promptPackage.questionFocus.focusedPondName === 'A1', 'detects focused pond');
  assert(focused.promptPackage.questionFocus.shouldSummarize === false, 'narrow question does not request summary');
  assert(focused.promptPackage.context.indexOf('"pond": "A1"') < focused.promptPackage.context.indexOf('"pond": "B2"'), 'focused pond comes first');

  const parameterControl = buildOrsonAnalysis([
    {
      id: 'a1',
      pondName: 'A1',
      pondArea: 1000,
      density: 100,
      initialPopulation: 100000,
      initialWeight: 0.5,
      docStart: '2026-01-01',
      latestLabStatus: {
        reportType: 'water_quality',
        sampleDate: '2026-01-15',
        status: 'warning',
        mainIssue: 'Ammonia elevated',
        keyRisks: ['High ammonia pressure'],
        recommendations: ['Reduce feed pressure and improve aeration while rechecking pH and temperature.'],
      },
      samplings: [
        { id: 'a1-s1', date: '2026-01-15', mbw: 2, mortality: 10, feed: 18, phMorning: 8.1, phEvening: 8.8, doMorning: 4.2, doEvening: 5.2 },
      ],
    },
  ], 'How do I lower ammonia in A1?', new Date('2026-01-16T00:00:00Z'));

  assert(parameterControl.promptPackage.questionFocus.intent === 'parameter_control', 'detects parameter-control intent');
  assert(parameterControl.promptPackage.questionFocus.requestedParameter === 'ammonia', 'detects ammonia parameter');
  assert(parameterControl.promptPackage.questionFocus.requestedDirection === 'decrease', 'detects decrease direction');
  assert(parameterControl.promptPackage.context.includes('ORSON SELECTED KNOWLEDGE'), 'adds selected knowledge');
  assert(parameterControl.promptPackage.context.includes('Toxic NH3 risk rises with higher pH and temperature'), 'adds ammonia guidance');

  return analysis;
};
