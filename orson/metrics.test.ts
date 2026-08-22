import { calculatePondMetrics } from './metrics';
import { normalizePondData } from './normalizePondData';
import { calculatePondMetricsWithHarvest } from '../shared/pondCalculations';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

export const runMetricsSelfTest = () => {
  const pond = normalizePondData(
    {
      id: 'pond-a1',
      pondName: 'A1',
      pondArea: 1000,
      density: 100,
      initialPopulation: 100000,
      initialWeight: 0.5,
      docStart: '2026-01-01',
      totalHarvestedPopulation: 5000,
      totalHarvestedBiomass: 50,
      samplings: [
        {
          id: 's1',
          date: '2026-01-05',
          mbw: 1,
          mortality: 100,
          feed: 20,
          phMorning: 7.8,
          phEvening: 8.1,
          doMorning: 5,
          doEvening: 4.5,
          salinity: 18,
          feedData: {
            totalDailyFeed: 20,
          },
        },
        {
          id: 's2',
          date: '2026-01-10',
          mbw: 2,
          mortality: 200,
          feed: 30,
          phMorning: 7.6,
          phEvening: 8.2,
          doMorning: 4.6,
          doEvening: 3.9,
          salinity: 20,
          feedData: {
            totalDailyFeed: 30,
          },
        },
      ],
    },
    { now: new Date('2026-01-11T00:00:00Z') },
  );

  const metrics = calculatePondMetrics(pond);

  assert(metrics.currentDoc === 10, 'calculates current DOC');
  assert(metrics.latestMbwG === 2, 'uses latest valid MBW');
  assert(metrics.adgGPerDay === 0.2, 'calculates ADG between sampling records');
  assert(metrics.smoothedAdgGPerDay === 0.2, 'calculates smoothed ADG');
  assert(metrics.totalFeedKg === 50, 'calculates total feed');
  assert(metrics.totalMortalityCount === 300, 'calculates total mortality');
  assert(metrics.estimatedCurrentPopulation === 91071, 'uses the age-based survival estimate without double-counting mortality');
  assert(metrics.estimatedSurvivalPercent === 91.07, 'calculates survival percent from the consolidated population');
  assert(metrics.estimatedBiomassKg === 182.14, 'calculates biomass from consolidated population and MBW');
  assert(metrics.feedBiomassModel.feedRatePercent === 6.5, 'looks up feed-rate percentage from MBW');
  assert(metrics.feedBiomassModel.expectedFeedKg === 11.84, 'calculates expected feed from biomass and feed rate');
  assert(metrics.feedBiomassModel.actualFeedKg === 30, 'uses latest daily feed as actual feed pressure');
  assert(metrics.feedBiomassModel.feedPressureRatio === 2.534, 'calculates feed pressure ratio');
  assert(metrics.feedBiomassModel.feedBasedPopulation === 230769, 'backsolves population from feed, MBW, and feed rate');
  assert(metrics.feedBiomassModel.populationRange.expected === 91071, 'uses the shared consolidated population range');
  assert(metrics.feedBiomassModel.biomassRangeKg.expected === 182.14, 'uses the shared consolidated biomass range');
  assert(metrics.feedBiomassModel.survivalAssumption.confidence === 'low', 'marks early survival confidence as low');
  assert(metrics.feedBiomassModel.warnings.length >= 2, 'flags feed pressure and survival confidence warnings');
  assert(metrics.biomassGainKg === 182.14, 'includes harvested biomass in biomass gain');
  assert(metrics.fcr === 0.275, 'calculates FCR from feed and biomass gain');
  assert(metrics.phSwingLatest === 0.6, 'calculates latest pH swing');
  assert(metrics.doMinimumLatest === 3.9, 'calculates latest DO minimum');
  assert(metrics.doMinimumTrend.direction === 'down', 'calculates DO trend direction');
  assert(metrics.feedAllocationTrend.direction === 'up', 'calculates recent feed allocation trend');
  assert(metrics.dataCompleteness.score > 0.8, 'calculates data completeness');

  return metrics;
};

export const runDoc11To30SurvivalRefinementSelfTest = () => {
  const pond = normalizePondData(
    {
      id: 'pond-b2',
      pondName: 'B2',
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
          doEvening: 4.3,
          feedData: { totalDailyFeed: 10 },
        },
        {
          id: 's2',
          date: '2026-01-15',
          mbw: 2,
          mortality: 50,
          feed: 12,
          doMorning: 4.3,
          doEvening: 3.8,
          feedData: { totalDailyFeed: 12 },
        },
      ],
    },
    { now: new Date('2026-01-16T00:00:00Z') },
  );

  const metrics = calculatePondMetrics(pond);

  assert(metrics.currentDoc === 15, 'sets up DOC 11-30 scenario');
  assert(metrics.feedBiomassModel.survivalAssumption.confidence === 'low', 'keeps inferred early survival confidence low');
  assert(metrics.feedBiomassModel.survivalAssumption.expectedPercent === 94.6, 'uses the same stage-based survival curve as the app');
  assert(metrics.feedBiomassModel.populationRange.expected === 94639, 'refines expected population without double-counting mortality');
  assert(metrics.feedBiomassModel.biomassRangeKg.expected === 189.28, 'refines biomass range without inferred appetite');

  return metrics;
};

export const runBiologyParityFallbackSelfTest = () => {
  const pond = normalizePondData(
    {
      id: 'pond-c3',
      pondName: 'C3',
      pondArea: 1000,
      density: 100,
      initialPopulation: 100000,
      docStart: '2026-01-01',
      totalHarvestedPopulation: 12000,
      samplings: [
        {
          id: 's1',
          date: '2026-01-11',
          mbw: 2,
          mortality: 1000,
          feed: 15,
        },
        {
          id: 's2',
          date: '2026-01-18',
          mbw: 0,
          mortality: 500,
          feed: 20,
        },
      ],
    },
    { now: new Date('2026-01-19T00:00:00Z') },
  );

  const metrics = calculatePondMetrics(pond);

  assert(metrics.latestMbwG === 2, 'looks back to latest valid MBW when newest sampling MBW is zero');
  assert(metrics.adgGPerDay === 0.15, 'uses 0.5g initial-weight fallback for single-sampling ADG');
  assert(metrics.smoothedAdgGPerDay === 0.15, 'uses shared ADG fallback for smoothed ADG with one valid MBW point');
  assert(metrics.totalMortalityCount === 1500, 'counts mortality from records after the latest valid MBW');
  assert(metrics.estimatedCurrentPopulation === 81790, 'combines age-based survival with cumulative harvests');
  assert(metrics.estimatedBiomassKg === 163.58, 'uses looked-back MBW with consolidated current population');

  return metrics;
};

export const runUnifiedBiomassParitySelfTest = () => {
  const now = new Date('2026-08-23T12:00:00+10:00');
  const pond = {
    id: 'pond-parity',
    pondName: 'Parity',
    docStart: '2026-05-25',
    initialPopulation: 100000,
    initialWeight: 0.5,
    totalHarvestedPopulation: 5000,
    samplings: [
      { id: 'growth', date: '2026-08-18', mbw: 14, mortality: 200 },
      { id: 'feed-1', date: '2026-08-21', feedData: { totalDailyFeed: 31, feedingResponse: 'normal' as const } },
      { id: 'feed-2', date: '2026-08-22', feedData: { totalDailyFeed: 32, feedingResponse: 'normal' as const } },
      { id: 'feed-3', date: '2026-08-23', feedData: { totalDailyFeed: 33, feedingResponse: 'normal' as const } },
    ],
    mortalityRecords: [{
      id: 'mortality-1',
      date: '2026-08-20',
      observationType: 'estimated_total' as const,
      count: 300,
      mbwAtRecord: 14,
    }],
  };
  const normalized = normalizePondData(pond, { now });
  const shared = calculatePondMetricsWithHarvest(pond, 'Australia/Melbourne', {
    currentDoc: normalized.currentDoc ?? undefined,
    now,
  });
  const metrics = calculatePondMetrics(normalized);

  assert(metrics.estimatedCurrentPopulation === shared.currentPopulation, 'Orson and the app use one population estimate');
  assert(metrics.estimatedBiomassKg === Number(shared.currentBiomass.toFixed(2)), 'Orson and the app use one biomass estimate');
};
