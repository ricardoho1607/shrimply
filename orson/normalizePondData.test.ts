import { normalizePondData } from './normalizePondData';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

export const runNormalizePondDataSelfTest = () => {
  const pond = normalizePondData(
    {
      id: 'pond-a1',
      pondName: 'A1',
      pondArea: '2500',
      density: '100',
      docStart: '2026-01-01',
      initialWeight: '0.8',
      supplier: 'Test Hatchery',
      samplings: [
        {
          id: 'wq-1',
          date: '2026-01-03',
          mbw: 0,
          mortality: 0,
          feed: 0,
          phMorning: '7.8',
          phEvening: '8.2',
          doMorning: '5.1',
          doEvening: '4.4',
          salinity: '18',
        },
        {
          id: 'feed-1',
          date: '2026-01-04',
          mbw: 0,
          mortality: 0,
          feed: 0,
          feedData: {
            totalDailyFeed: '52',
            ancoPercentage: '85',
            anco1: '90',
            anco2: '80',
            inventoryFeedId: 'feed-a',
          },
        },
        {
          id: 'sampling-1',
          date: '2026-01-05',
          mbw: '1.2',
          mortality: '100',
          feed: '50',
        },
      ],
    },
    { now: new Date('2026-01-06T00:00:00Z') },
  );

  assert(pond.id === 'pond-a1', 'normalizes pond id');
  assert(pond.pondName === 'A1', 'normalizes pond name');
  assert(pond.pondAreaM2 === 2500, 'normalizes pond area');
  assert(pond.densityPerM2 === 100, 'normalizes density');
  assert(pond.initialPopulation === 250000, 'derives initial population from area and density');
  assert(pond.initialWeightG === 0.8, 'normalizes initial weight');
  assert(pond.currentDoc === 5, 'calculates current DOC');
  assert(pond.records.length === 3, 'keeps existing records');
  assert(pond.records[0].kinds.includes('water_quality'), 'detects water-quality record');
  assert(!pond.records[0].kinds.includes('feed'), 'does not treat zero-feed water-quality entry as feed');
  assert(pond.records[1].feedData?.trayClearancePercent === 85, 'averages tray clearance');
  assert(pond.records[1].feedKg === 52, 'uses feedData total daily feed');
  assert(pond.records[2].kinds.includes('sampling'), 'detects sampling record');
  assert(pond.records[2].mbwG === 1.2, 'normalizes MBW');

  return pond;
};
