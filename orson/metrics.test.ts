import { calculatePondMetrics } from './metrics';
import { normalizePondData } from './normalizePondData';

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
            anco1: 90,
            anco2: 80,
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
            anco1: 75,
            anco2: 65,
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
  assert(metrics.estimatedCurrentPopulation === 94700, 'subtracts mortality and harvest population');
  assert(metrics.estimatedSurvivalPercent === 94.7, 'calculates survival percent');
  assert(metrics.estimatedBiomassKg === 189.4, 'calculates biomass from population and MBW');
  assert(metrics.feedBiomassModel.feedRatePercent === 6.5, 'looks up feed-rate percentage from MBW');
  assert(metrics.feedBiomassModel.expectedFeedKg === 12.31, 'calculates expected feed from biomass and feed rate');
  assert(metrics.feedBiomassModel.actualFeedKg === 30, 'uses latest daily feed as actual feed pressure');
  assert(metrics.feedBiomassModel.feedPressureRatio === 2.437, 'calculates feed pressure ratio');
  assert(metrics.feedBiomassModel.feedBasedPopulation === 230769, 'backsolves population from feed, MBW, and feed rate');
  assert(metrics.feedBiomassModel.populationRange.expected === 79700, 'estimates conservative early survival population range');
  assert(metrics.feedBiomassModel.biomassRangeKg.expected === 159.4, 'estimates biomass range from survival range');
  assert(metrics.feedBiomassModel.survivalAssumption.confidence === 'low', 'marks early survival confidence as low');
  assert(metrics.feedBiomassModel.warnings.length >= 2, 'flags feed pressure and survival confidence warnings');
  assert(metrics.biomassGainKg === 189.4, 'includes harvested biomass in biomass gain');
  assert(metrics.fcr === 0.264, 'calculates FCR from feed and biomass gain');
  assert(metrics.phSwingLatest === 0.6, 'calculates latest pH swing');
  assert(metrics.doMinimumLatest === 3.9, 'calculates latest DO minimum');
  assert(metrics.doMinimumTrend.direction === 'down', 'calculates DO trend direction');
  assert(metrics.appetiteTrend.direction === 'down', 'calculates appetite trend direction');
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
          feedData: { totalDailyFeed: 10, anco1: 90, anco2: 85 },
        },
        {
          id: 's2',
          date: '2026-01-15',
          mbw: 2,
          mortality: 50,
          feed: 12,
          doMorning: 4.3,
          doEvening: 3.8,
          feedData: { totalDailyFeed: 12, anco1: 70, anco2: 60 },
        },
      ],
    },
    { now: new Date('2026-01-16T00:00:00Z') },
  );

  const metrics = calculatePondMetrics(pond);

  assert(metrics.currentDoc === 15, 'sets up DOC 11-30 scenario');
  assert(metrics.feedBiomassModel.survivalAssumption.confidence === 'medium', 'uses feed response for medium confidence in DOC 11-30');
  assert(metrics.feedBiomassModel.survivalAssumption.expectedPercent === 78, 'reduces expected survival for appetite decline and low DO');
  assert(metrics.feedBiomassModel.populationRange.expected === 77900, 'refines expected population from survival model');
  assert(metrics.feedBiomassModel.biomassRangeKg.expected === 155.8, 'refines expected biomass range');

  return metrics;
};
