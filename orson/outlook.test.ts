import { calculatePondMetrics } from './metrics';
import { normalizePondData } from './normalizePondData';
import { build72HourOutlook } from './outlook';
import { analyzePondRisks } from './riskEngine';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

export const runOutlookSelfTest = () => {
  const pond = normalizePondData(
    {
      id: 'pond-outlook',
      pondName: 'Outlook Pond',
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

  const report = analyzePondRisks(calculatePondMetrics(pond), new Date('2026-01-16T00:00:00Z'));
  const outlook = build72HourOutlook(report, new Date('2026-01-16T00:00:00Z'));

  assert(outlook.pondName === 'Outlook Pond', 'keeps pond identity');
  assert(outlook.direction === 'deteriorating', 'detects deteriorating outlook');
  assert(outlook.level === 'warning', 'uses warning level');
  assert(outlook.confidence > 0.8, 'calculates confidence from top findings');
  assert(outlook.topReason.includes('DO'), 'uses top finding as reason');
  assert(outlook.nextAction.length > 0, 'provides next action');
  assert(outlook.supportingFindings.includes('low_do'), 'includes supporting finding ids');

  return outlook;
};

export const runStableOutlookSelfTest = () => {
  const report = analyzePondRisks(
    calculatePondMetrics(normalizePondData(
      {
        id: 'pond-stable',
        pondName: 'Stable Pond',
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
            mortality: 10,
            feed: 9,
            phMorning: 7.8,
            phEvening: 8.0,
            doMorning: 5.5,
            doEvening: 5.0,
            salinity: 18,
            feedData: { totalDailyFeed: 9, anco1: 90, anco2: 95 },
          },
          {
            id: 's2',
            date: '2026-01-15',
            mbw: 2.5,
            mortality: 10,
            feed: 15,
            phMorning: 7.8,
            phEvening: 8.0,
            doMorning: 5.5,
            doEvening: 5.1,
            salinity: 18,
            feedData: { totalDailyFeed: 15, anco1: 90, anco2: 92 },
          },
        ],
      },
      { now: new Date('2026-01-16T00:00:00Z') },
    )),
    new Date('2026-01-16T00:00:00Z'),
  );

  const outlook = build72HourOutlook(report, new Date('2026-01-16T00:00:00Z'));
  assert(outlook.direction === 'stable' || outlook.direction === 'watch', 'stable pond should not deteriorate');
  assert(outlook.level === 'info' || outlook.level === 'watch', 'stable pond should stay below warning');

  return outlook;
};

