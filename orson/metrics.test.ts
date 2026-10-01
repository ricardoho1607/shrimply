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

  runMetricCoverageRegressionSelfTest();

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
  const normalized = normalizePondData(pond, { now, timeZone: 'Australia/Melbourne' });
  const shared = calculatePondMetricsWithHarvest(pond, 'Australia/Melbourne', {
    currentDoc: normalized.currentDoc ?? undefined,
    now,
  });
  const metrics = calculatePondMetrics(normalized);

  assert(metrics.estimatedCurrentPopulation === shared.currentPopulation, 'Orson and the app use one population estimate');
  assert(metrics.estimatedBiomassKg === Number(shared.currentBiomass.toFixed(2)), 'Orson and the app use one biomass estimate');

  const midnightNow = new Date('2026-08-24T00:30:00+10:00');
  const midnightPond = {
    id: 'sim-c1',
    pondName: 'SIM-C1',
    docStart: '2026-08-20',
    initialPopulation: 347200,
    initialWeight: 0.5,
    samplings: [],
    mortalityRecords: [],
    totalHarvestedPopulation: 0,
  };
  const normalizedMidnightPond = normalizePondData(midnightPond, {
    now: midnightNow,
    timeZone: 'Australia/Melbourne',
  });
  const sharedMidnightMetrics = calculatePondMetricsWithHarvest(midnightPond, 'Australia/Melbourne', {
    currentDoc: normalizedMidnightPond.currentDoc ?? undefined,
    now: midnightNow,
  });
  const orsonMidnightMetrics = calculatePondMetrics(normalizedMidnightPond);

  assert(normalizedMidnightPond.currentDoc === 4, 'Orson uses the farm calendar DOC after local midnight');
  assert(sharedMidnightMetrics.currentPopulation === 341678, 'the shared model estimates SIM-C1 living population');
  assert(orsonMidnightMetrics.estimatedCurrentPopulation === sharedMidnightMetrics.currentPopulation, 'Orson matches the shared living population after local midnight');
};

export const runFeedEvidenceParitySelfTest = () => {
  const asOf = new Date('2026-02-08T00:00:00Z');
  const pond = normalizePondData(
    {
      id: 'pond-evidence-test',
      pondName: 'Evidence Test Pond',
      docStart: '2026-01-01',
      initialPopulation: 100000,
      initialWeight: 0.5,
      cycleId: 'cycle-2026-a',
      pondCycleId: 'pond-evidence-test:cycle-2026-a',
      samplings: [
        // Historical feed point outside 14d window
        {
          id: 'hist-feed',
          date: '2026-01-15',
          mbw: 1.0,
          feedData: { totalDailyFeed: 15 },
        },
        // Day 1 (2026-02-05): authoritative feed (28kg) and sampling estimate (45kg)
        {
          id: 'sample-d1',
          date: '2026-02-05',
          mbw: 2.5,
          feed: 45,
          phMorning: 7.8,
          phEvening: 8.1,
          doMorning: 5.2,
          doEvening: 4.8,
        },
        {
          id: 'auth-feed-d1',
          date: '2026-02-05',
          feedData: {
            totalDailyFeed: 28,
            feedingResponse: 'normal',
          },
        },
        // Day 2 (2026-02-06): duplicate totals (32kg and 32kg)
        {
          id: 'auth-feed-d2-a',
          date: '2026-02-06',
          feedData: { totalDailyFeed: 32 },
        },
        {
          id: 'auth-feed-d2-b',
          date: '2026-02-06',
          feedData: { totalDailyFeed: 32 },
        },
        // Day 3 (2026-02-07): explicit zero feed (0kg) and sampling (20kg), plus mbw: 0
        {
          id: 'auth-feed-d3-zero',
          date: '2026-02-07',
          feedData: { totalDailyFeed: 0, isExplicitZero: true },
        },
        {
          id: 'sample-d3',
          date: '2026-02-07',
          mbw: 0,
          feed: 20,
        },
      ],
      mortalityRecords: [
        {
          id: 'mort-d2',
          date: '2026-02-06',
          observationType: 'none_observed',
          count: 0,
        },
      ],
    },
    { now: asOf },
  );

  const metrics = calculatePondMetrics(pond);
  const d1 = metrics.dailyRecords14d.find((r) => r.date === '2026-02-05');
  const d2 = metrics.dailyRecords14d.find((r) => r.date === '2026-02-06');
  const d3 = metrics.dailyRecords14d.find((r) => r.date === '2026-02-07');

  // Criterion 1: Daily authoritative feed wins over sampling
  assert(d1 !== undefined, 'finds day 1 record');
  assert(d1?.feedKg === 28, 'authoritative feed (28kg) wins over sampling estimate (45kg)');
  assert(d1?.feedSource === 'daily_feed', 'feedSource is daily_feed');
  assert(d1?.actualDailyFeedKg === 28, 'actualDailyFeedKg is 28');
  assert(d1?.samplingFeedEstimateKg === 45, 'preserves sampling estimate for diagnostics');

  // Criterion 1: Duplicate totals do not sum
  assert(d2 !== undefined, 'finds day 2 record');
  assert(d2?.feedKg === 32, 'duplicate totals do not sum (remains 32kg, not 64kg)');
  assert(d2?.actualDailyFeedKg === 32, 'actualDailyFeedKg does not duplicate');

  // Criterion 1: Explicit zero cannot be overwritten
  assert(d3 !== undefined, 'finds day 3 record');
  assert(d3?.feedKg === 0, 'explicit zero feed is preserved as 0kg');
  assert(d3?.actualDailyFeedKg === 0, 'actualDailyFeedKg is 0 for explicit zero');
  assert(d3?.feedSource === 'daily_feed', 'feedSource remains daily_feed even when zero');

  // Criterion 3: Zero feed does not collapse biomass/population or imply safety
  assert(metrics.feedBiomassModel.actualFeedKg === 0, 'latest feed pressure recognizes 0kg feed');
  assert(metrics.feedBiomassModel.feedBasedPopulation === null, 'zero feed does not collapse feed-based population to 0');
  assert(metrics.feedBiomassModel.feedBasedBiomassKg === null, 'zero feed does not collapse feed-based biomass to 0');
  assert(metrics.estimatedBiomassKg !== null && metrics.estimatedBiomassKg > 0, 'biological biomass remains intact');
  assert(metrics.estimatedCurrentPopulation !== null && metrics.estimatedCurrentPopulation > 0, 'population remains intact');
  assert(
    metrics.feedBiomassModel.warnings.some((w) => w.includes('Zero daily feed was logged')),
    'flags warning that zero daily feed was logged (does not imply safety)',
  );

  // Criterion 3: MBW positive-only; preserve ADG
  assert(d3?.mbwG === null, 'day 3 mbw: 0 normalizes to null (positive-only)');
  assert(metrics.latestMbwG === 2.5, 'looks back to latest positive MBW (2.5g), ignoring 0g');
  assert(typeof metrics.adgGPerDay === 'number' && metrics.adgGPerDay > 0, 'preserves ADG calculation from valid MBW');

  // Criterion 2: Trend has last 3-5 feed observations available
  assert(metrics.feedAllocationTrend.points >= 3, 'trend retains at least 3 feed observations across window/history');

  // Criterion 4: Evidence types retain source, pond/cycle, date precision, freshness, and coverage
  assert(metrics.evidence !== undefined, 'metrics includes evidence summary');
  assert(metrics.evidence?.pondId === 'pond-evidence-test', 'evidence retains pondId');
  assert(metrics.evidence?.cycleId === 'cycle-2026-a', 'evidence retains cycleId');
  assert(metrics.evidence?.asOfDate === '2026-02-08', 'evidence retains asOfDate');
  assert(metrics.evidence?.water.domain === 'water', 'water evidence domain is water');
  assert(metrics.evidence?.water.coverage !== undefined, 'water evidence has coverage');
  assert(metrics.evidence?.mbw.domain === 'mbw', 'mbw evidence domain is mbw');
  assert(metrics.evidence?.mbw.isFresh === true, 'mbw evidence evaluates freshness');
  assert(metrics.evidence?.dailyFeed.domain === 'dailyFeed', 'dailyFeed evidence domain is dailyFeed');
  assert(metrics.evidence?.mortality.domain === 'operations', 'mortality evidence domain is operations');
  assert(metrics.growthEvidence.pondId === 'pond-evidence-test', 'growthEvidence retains pondId');
  assert(metrics.growthEvidence.cycleId === 'cycle-2026-a', 'growthEvidence retains cycleId');
  assert(metrics.growthEvidence.latestDate === '2026-02-05', 'growthEvidence retains latestDate');
  assert(typeof metrics.growthEvidence.ageDays === 'number', 'growthEvidence retains ageDays');
  assert(typeof metrics.growthEvidence.coverageRatio === 'number', 'growthEvidence retains coverageRatio');

  // Daily records retain evidence fields
  assert(d1?.pondId === 'pond-evidence-test', 'daily record retains pondId');
  assert(d1?.cycleId === 'cycle-2026-a', 'daily record retains cycleId');
  assert(typeof d1?.ageDays === 'number', 'daily record retains ageDays');
  assert(typeof d1?.isFresh === 'boolean', 'daily record retains isFresh');
  assert(d1?.authoritativeSourceId === 'auth-feed-d1', 'daily record retains authoritativeSourceId');
};

export const runMetricCoverageRegressionSelfTest = () => {
  // 1. Regression test: calculatePondMetrics on a pond with empty records must never throw
  const emptyPond = normalizePondData(
    {
      id: 'pond-empty-coverage',
      pondName: 'Empty Pond',
      docStart: '2026-01-01',
      samplings: [],
      records: [],
    },
    { now: new Date('2026-01-15T00:00:00Z') },
  );

  const emptyMetrics = calculatePondMetrics(emptyPond);
  assert(emptyMetrics !== undefined, 'calculatePondMetrics completes for empty records');
  assert(emptyMetrics.evidence !== undefined, 'empty metrics evidence exists');
  assert(emptyMetrics.evidence?.water.coverage?.recordedDays === 0, 'empty water coverage recordedDays is 0');
  assert(emptyMetrics.evidence?.water.coverage?.coverageRatio === 0, 'empty water coverageRatio is 0');
  assert(emptyMetrics.evidence?.water.isFresh === false, 'empty water is not fresh');
  assert(emptyMetrics.evidence?.water.isStale === true, 'empty water is stale');
  assert(emptyMetrics.evidence?.mbw.isFresh === false, 'empty mbw is not fresh');
  assert(emptyMetrics.evidence?.dailyFeed.coverage?.recordedDays === 0, 'empty dailyFeed coverage recordedDays is 0');
  assert(emptyMetrics.evidence?.mortality.coverage?.recordedDays === 0, 'empty mortality coverage recordedDays is 0');
  assert(emptyMetrics.growthEvidence.coverageRatio === 0, 'empty growthEvidence coverageRatio is 0');

  // 2. Non-empty records: verify calculatePondMetrics computes genuine coverage without throwing
  const populatedPond = normalizePondData(
    {
      id: 'pond-pop-coverage',
      pondName: 'Populated Pond',
      docStart: '2026-01-01',
      samplings: [
        { id: 's1', date: '2026-01-10', mbw: 3.5, doMorning: 5.1, doEvening: 4.8, feed: 30, mortality: 5 },
        { id: 's2', date: '2026-01-15', mbw: 4.2, doMorning: 4.9, doEvening: 4.5, feed: 35, mortality: 0 },
      ],
    },
    { now: new Date('2026-01-15T00:00:00Z') },
  );

  const popMetrics = calculatePondMetrics(populatedPond);
  assert(popMetrics !== undefined, 'calculatePondMetrics completes for populated records');
  assert(popMetrics.evidence?.water.coverage?.recordedDays === 2, 'water coverage recordedDays is 2');
  assert(popMetrics.evidence?.water.coverage?.coverageRatio !== undefined, 'water coverageRatio is computed');
  assert(popMetrics.evidence?.water.isFresh === true, 'water on asOfDate is fresh');
  assert((popMetrics.evidence?.water.coverage?.missingDates?.length ?? 0) > 0, 'missing dates are identified');
  assert(popMetrics.growthEvidence.coverageRatio !== undefined, 'growthEvidence coverageRatio is computed');
};
