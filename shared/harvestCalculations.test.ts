import {
  applyHarvestImpactToPond,
  calculateHarvestRemoval,
  getNextPartialHarvestNumber,
  hasFinalHarvestForPondCycle,
  reverseHarvestImpactOnPond,
  withHarvestReference,
  type HarvestTrackingPond,
} from './harvestCalculations';
import {
  calculateAdg,
  calculatePondMetricsWithHarvest,
  calculatePondMortalityForDate,
  getLatestFeedResponseForDate,
  getLatestGrowthSampling,
  projectMbwWithTapering,
} from './pondCalculations';

const assertClose = (actual: number, expected: number, label: string) => {
  if (Math.abs(actual - expected) > 0.0001) throw new Error(`${label}: expected ${expected}, received ${actual}`);
};

export const runHarvestCalculationsSelfTest = () => {
  const mixedDailyRecords = [
    { id: 'baseline', date: '2026-08-18', mbw: 1.2, mortality: 0, isBaselineEstimate: true },
    { id: 'growth', date: '2026-08-19', mbw: 1.5, mortality: 0 },
    { id: 'water', date: '2026-08-21', mbw: 0, mortality: 0, phMorning: '7.9' },
    { id: 'feed-old-cycle', date: '2026-08-21', mbw: 0, mortality: 0, cycleId: 'old', feedData: { totalDailyFeed: 10, feedingResponse: 'weak' as const } },
    { id: 'feed-current', date: '2026-08-21', mbw: 0, mortality: 0, cycleId: 'current', feedData: { totalDailyFeed: 12, feedingResponse: 'normal' as const } },
  ];
  if (getLatestGrowthSampling({ samplings: mixedDailyRecords })?.date !== '2026-08-19') {
    throw new Error('feed and water logs must not become growth sampling dates');
  }
  if (getLatestGrowthSampling({ samplings: [mixedDailyRecords[0], mixedDailyRecords[2]] }) !== undefined) {
    throw new Error('a baseline and daily log must still display Never sampled');
  }
  if (getLatestFeedResponseForDate(mixedDailyRecords, '2026-08-21', { cycleId: 'current' }) !== 'normal') {
    throw new Error('dashboard feed status must use the current-cycle response for the date');
  }

  const pond: HarvestTrackingPond & { samplings: { id: string; date: string; mbw: number; mortality: number }[] } = {
    initialPopulation: 100_000,
    initialWeight: 10,
    samplings: [{ id: 'sampling-1', date: '2026-07-10', mbw: 10, mortality: 0 }],
  };
  const harvest = withHarvestReference(pond, { biomass: 100, size: 80, harvestType: 'partial' as const });
  const removal = calculateHarvestRemoval(harvest);
  assertClose(removal.biomass, 100, 'harvest biomass');
  assertClose(removal.population, 8_000, 'harvest population');

  const afterHarvest = applyHarvestImpactToPond(pond, harvest, '2026-07-12', 1);
  assertClose(afterHarvest.samplings[0].mbw, 10, 'harvest does not overwrite MBW');
  assertClose(Number(afterHarvest.partialHarvestCount), 1, 'first partial harvest number');
  assertClose(getNextPartialHarvestNumber(afterHarvest), 2, 'next partial harvest number');
  assertClose(calculatePondMetricsWithHarvest(afterHarvest).currentBiomass, 900, 'exact biomass after harvest');
  assertClose(calculatePondMetricsWithHarvest(afterHarvest).currentPopulation, 92_000, 'population after harvest');

  const afterNewSampling = {
    ...afterHarvest,
    samplings: [...afterHarvest.samplings, { id: 'sampling-2', date: '2026-07-14', mbw: 12, mortality: 0 }],
  };
  assertClose(calculatePondMetricsWithHarvest(afterNewSampling).currentBiomass, 1_104, 'new sampling refreshes biomass');

  const restored = reverseHarvestImpactOnPond(afterHarvest, harvest);
  assertClose(calculatePondMetricsWithHarvest(restored).currentBiomass, 1_000, 'reversed biomass');
  assertClose(calculatePondMetricsWithHarvest(restored).currentPopulation, 100_000, 'reversed population');

  const withDailyMortality = {
    ...pond,
    mortalityRecords: [
      { id: 'mortality-1', date: '2026-07-11', observationType: 'estimated_total' as const, count: 500, mbwAtRecord: 10 },
      { id: 'mortality-2', date: '2026-07-12', observationType: 'observed_recovered' as const, count: 250, mbwAtRecord: 10 },
      { id: 'mortality-3', date: '2026-07-13', observationType: 'none_observed' as const, count: 0, mbwAtRecord: 10 },
    ],
  };
  const mortalityMetrics = calculatePondMetricsWithHarvest(withDailyMortality);
  assertClose(mortalityMetrics.totalMortality, 750, 'all recorded mortality is added to the cumulative total');
  assertClose(mortalityMetrics.currentPopulation, 99_250, 'daily mortality updates standing population');
  assertClose(mortalityMetrics.adjustedSR, 99.25, 'daily mortality updates SR');
  assertClose(mortalityMetrics.currentBiomass, 992.5, 'daily mortality updates biomass');
  assertClose(mortalityMetrics.totalMortalityWeight, 7.5, 'daily mortality uses MBW snapshot for mortality weight');

  const withRepeatedDailyMortality = {
    ...withDailyMortality,
    mortalityRecords: [
      ...withDailyMortality.mortalityRecords,
      { id: 'mortality-4', date: '2026-07-11', observationType: 'estimated_total' as const, count: 200, mbwAtRecord: 10 },
    ],
  };
  const dailyMortality = calculatePondMortalityForDate(withRepeatedDailyMortality, '2026-07-11');
  assertClose(dailyMortality.totalMortality, 700, 'same-day mortality entries are added together');
  assertClose(dailyMortality.totalMortalityWeight, 7, 'same-day mortality weight is added together');
  assertClose(dailyMortality.observedRecovered, 0, 'observed mortality is separated from estimated mortality');
  assertClose(
    calculatePondMortalityForDate(withRepeatedDailyMortality, '2026-07-12').totalMortality,
    250,
    'observed mortality contributes to the daily and cumulative totals',
  );
  assertClose(
    calculatePondMortalityForDate(withRepeatedDailyMortality, '2026-07-12').observedRecovered,
    250,
    'observed mortality remains visible for its recorded day',
  );

  const laterHarvest = withHarvestReference(afterNewSampling, { biomass: 50, size: 100, harvestType: 'partial' as const });
  const afterLaterHarvest = applyHarvestImpactToPond(afterNewSampling, laterHarvest, '2026-07-15', 2);
  const oldHarvestRemoved = reverseHarvestImpactOnPond(afterLaterHarvest, harvest);
  assertClose(calculatePondMetricsWithHarvest(oldHarvestRemoved).currentBiomass, 1_150, 'old harvest reversal uses newer sampled MBW');

  const readinessRecords = [{
    cycleId: 'cycle-1',
    ponds: [{ pondId: 'pond-1', pondCycleId: 'pond-cycle-1', cycleId: 'cycle-1', harvestType: 'final' as const }],
  }];
  if (!hasFinalHarvestForPondCycle(readinessRecords, { id: 'pond-1', pondCycleId: 'pond-cycle-1', cycleId: 'cycle-1' })) {
    throw new Error('final harvest readiness was not detected');
  }
  if (hasFinalHarvestForPondCycle(readinessRecords, { id: 'pond-2', pondCycleId: 'pond-cycle-2', cycleId: 'cycle-1' })) {
    throw new Error('final harvest readiness leaked to another pond');
  }

  const hiddenMortalityMetrics = calculatePondMetricsWithHarvest({
    docStart: '2026-05-24',
    initialPopulation: 100_000,
    initialWeight: 0.5,
    samplings: [
      { id: 'growth-1', date: '2026-08-17', mbw: 14, mortality: 0 },
      { id: 'feed-1', date: '2026-08-20', feedData: { totalDailyFeed: 33, feedingResponse: 'normal' } },
      { id: 'feed-2', date: '2026-08-21', feedData: { totalDailyFeed: 33, feedingResponse: 'normal' } },
      { id: 'feed-3', date: '2026-08-22', feedData: { totalDailyFeed: 33, feedingResponse: 'normal' } },
    ],
  }, 'Australia/Melbourne', { now: new Date('2026-08-22T12:00:00+10:00') });
  if (hiddenMortalityMetrics.currentPopulation >= 90_000 || hiddenMortalityMetrics.currentPopulation <= 65_000) {
    throw new Error(`hidden mortality estimate is unrealistic: ${hiddenMortalityMetrics.currentPopulation}`);
  }
  assertClose(
    hiddenMortalityMetrics.currentBiomass,
    hiddenMortalityMetrics.biomassEstimate.bestEstimateKg,
    'dashboard biomass uses the consolidated estimate',
  );
  if (hiddenMortalityMetrics.biomassEstimate.recentFeedDays !== 3) {
    throw new Error('three recent feed days should qualify as a biomass cross-check');
  }
  if (
    hiddenMortalityMetrics.currentBiomass < hiddenMortalityMetrics.biomassEstimate.lowEstimateKg ||
    hiddenMortalityMetrics.currentBiomass > hiddenMortalityMetrics.biomassEstimate.highEstimateKg
  ) {
    throw new Error('best biomass estimate must remain inside its confidence range');
  }

  const largeKnownMortalityMetrics = calculatePondMetricsWithHarvest({
    docStart: '2026-07-23',
    initialPopulation: 100_000,
    initialWeight: 0.5,
    mortalityRecords: [{
      id: 'known-loss',
      date: '2026-08-10',
      observationType: 'estimated_total',
      count: 20_000,
      mbwAtRecord: 8,
    }],
    samplings: [{ id: 'growth-1', date: '2026-08-20', mbw: 10, mortality: 0 }],
  }, 'Australia/Melbourne', { now: new Date('2026-08-22T12:00:00+10:00') });
  assertClose(largeKnownMortalityMetrics.currentPopulation, 80_000, 'known mortality is a cap, not deducted twice');

  const calibratedMetrics = calculatePondMetricsWithHarvest({
    initialPopulation: 100_000,
    initialWeight: 0.5,
    historicalBenchmark: {
      completedCycleCount: 4,
      averageSurvivalRate: 80,
      averageCycleDoc: 120,
      averageFinalMbwG: 25,
    },
    samplings: [{ id: 'growth-1', date: '2026-08-20', mbw: 20, mortality: 0 }],
  }, undefined, { currentDoc: 120 });
  assertClose(calibratedMetrics.currentPopulation, 80_000, 'completed harvests calibrate the survival curve');
  if (calibratedMetrics.biomassEstimate.confidence !== 'medium') {
    throw new Error('completed-cycle calibration should improve biomass confidence');
  }

  const latestIntervalAdg = calculateAdg({
    docStart: '2026-07-01',
    initialWeight: 0.5,
    samplings: [
      { date: '2026-07-11', mbw: 2.5 },
      { date: '2026-07-21', mbw: 4.5 },
      { date: '2026-07-31', mbw: 6.5 },
      { date: '2026-08-10', mbw: 16.5 },
    ],
  });
  assertClose(latestIntervalAdg, 1, 'sampling ADG uses the latest interval even when it differs from the older trend');

  const taperedMbw = projectMbwWithTapering(8, 0.3, 14, 50);
  if (taperedMbw <= 8 || taperedMbw >= 12.2) {
    throw new Error(`growth taper must grow more slowly than a straight line: ${taperedMbw}`);
  }
};
