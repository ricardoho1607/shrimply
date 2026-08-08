import {
  applyHarvestImpactToPond,
  calculateHarvestRemoval,
  getNextPartialHarvestNumber,
  hasFinalHarvestForPondCycle,
  reverseHarvestImpactOnPond,
  withHarvestReference,
  type HarvestTrackingPond,
} from './harvestCalculations';
import { calculatePondMetricsWithHarvest, calculatePondMortalityForDate } from './pondCalculations';

const assertClose = (actual: number, expected: number, label: string) => {
  if (Math.abs(actual - expected) > 0.0001) throw new Error(`${label}: expected ${expected}, received ${actual}`);
};

export const runHarvestCalculationsSelfTest = () => {
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
};
