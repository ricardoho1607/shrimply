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
          temperature: '29.5',
          ammonia: '0.35',
          operationalNotes: 'Aerators ran overnight after rain.',
          weatherEvent: 'heavy_rain',
          waterExchangePercent: '12.5',
          sludgeLoad: 'high',
          surfaceScum: false,
          shrimpBehaviour: 'abnormal',
        },
        {
          id: 'feed-1',
          date: '2026-01-04',
          mbw: 0,
          mortality: 0,
          feed: 0,
          feedData: {
            totalDailyFeed: '52',
            inventoryFeedId: 'feed-a',
            feedingResponse: 'strong',
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
      mortalityRecords: [
        {
          id: 'mortality-1',
          date: '2026-01-05',
          observationType: 'estimated_total',
          count: 25,
        },
        {
          id: 'mortality-2',
          date: '2026-01-06',
          observationType: 'observed_recovered',
          count: 10,
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
  assert(pond.records.length === 5, 'keeps sampling and mortality records');
  assert(pond.records[0].kinds.includes('water_quality'), 'detects water-quality record');
  assert(!pond.records[0].kinds.includes('feed'), 'does not treat zero-feed water-quality entry as feed');
  assert(pond.records[0].weatherEvent === 'heavy_rain', 'keeps the dated weather event');
  assert(pond.records[0].ammoniaMgL === 0.35, 'normalizes daily ammonia context');
  assert(pond.records[0].operationalNotes === 'Aerators ran overnight after rain.', 'keeps water-quality operating notes');
  assert(pond.records[0].waterExchangePercent === 12.5, 'normalizes water exchange percentage');
  assert(pond.records[0].sludgeLoad === 'high', 'keeps sludge observation');
  assert(pond.records[0].surfaceScum === false, 'preserves an explicit no-scum observation');
  assert(pond.records[0].shrimpBehaviour === 'abnormal', 'keeps shrimp behaviour observation');
  assert(pond.records[1].feedKg === 52, 'uses feedData total daily feed');
  assert(pond.records[1].feedData?.feedingResponse === 'strong', 'keeps direct feeding response separate from feed quantity');
  assert(pond.records[2].kinds.includes('sampling'), 'detects sampling record');
  assert(pond.records[2].mbwG === 1.2, 'normalizes MBW');
  assert(pond.records[3].kinds.includes('mortality'), 'detects daily mortality record');
  assert(pond.records[3].mortalityCount === 25, 'deducts estimated total mortality');
  assert(pond.records[4].mortalityCount === 0, 'does not deduct observed recovered mortality');

  const farmCalendarPond = normalizePondData(
    {
      id: 'pond-midnight',
      pondName: 'Midnight pond',
      docStart: '2026-08-20',
      initialPopulation: 347200,
    },
    {
      now: new Date('2026-08-24T00:30:00+10:00'),
      timeZone: 'Australia/Melbourne',
    },
  );

  assert(farmCalendarPond.currentDoc === 4, 'uses the farm calendar date for current DOC');

  return pond;
};

export const runFeedEvidenceNormalizationSelfTest = () => {
  const pond = normalizePondData(
    {
      id: 'pond-evidence-norm',
      pondName: 'Evidence Pond',
      docStart: '2026-03-01',
      initialPopulation: 80000,
      initialWeight: '0.45',
      samplings: [
        {
          id: 's-zero-feed',
          date: '2026-03-05',
          mbw: 0,
          feedData: {
            totalDailyFeed: 0,
            feedingResponse: 'weak',
          },
        },
        {
          id: 's-valid-mbw',
          date: '2026-03-07',
          mbw: 2.8,
          feed: 18,
        },
        {
          id: 's-neg-mbw',
          date: '2026-03-08',
          mbw: -1.5,
          feed: 'n/a',
        },
      ],
    },
    { now: new Date('2026-03-10T00:00:00Z') },
  );

  const zeroRecord = pond.records.find((r) => r.id === 's-zero-feed');
  assert(zeroRecord !== undefined, 'finds zero feed record');
  assert(zeroRecord?.feedKg === 0, 'preserves explicit zero feedKg');
  assert(zeroRecord?.feedData?.isExplicitZero === true, 'flags isExplicitZero as true');
  assert(zeroRecord?.feedData?.totalDailyFeedKg === 0, 'feedData totalDailyFeedKg is 0');
  assert(zeroRecord?.mbwG === null, 'zero mbw normalizes to null (positive-only)');
  assert(zeroRecord?.isFresh === true, 'evaluates freshness within window');
  assert(typeof zeroRecord?.ageDays === 'number', 'populates ageDays');

  const validRecord = pond.records.find((r) => r.id === 's-valid-mbw');
  assert(validRecord?.mbwG === 2.8, 'positive mbw is preserved');
  assert(validRecord?.feedKg === 18, 'parses numeric feed string/number');

  const negRecord = pond.records.find((r) => r.id === 's-neg-mbw');
  assert(negRecord?.mbwG === null, 'negative mbw normalizes to null');
  assert(negRecord?.feedKg === null, 'empty token feed normalizes to null');
};
