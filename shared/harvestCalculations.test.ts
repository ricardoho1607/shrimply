import {
  applyHarvestImpactToPond,
  buildHarvestDateSampling,
  calculateHarvestRemoval,
  clearUntouchedAutoFilledHarvestSize,
  getHarvestDateSampling,
  getNextPartialHarvestNumber,
  getInvalidHarvestDraftLine,
  hasHarvestDraftData,
  getSamplingSize,
  harvestSizeDiffersFromSampling,
  hasFinalHarvestForPondCycle,
  reverseHarvestImpactOnPond,
  refreshAutoFilledHarvestSize,
  stripOrphanAutoFilledHarvestSize,
  withHarvestReference,
  type HarvestLineInput,
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

{
  const autoSizeOnly = { biomass: '', size: '100', price: '', subBiomass: '', subSize: '', subPrice: '' };
  if (hasHarvestDraftData(autoSizeOnly, true)) throw new Error('sampling-only auto-filled size must not count as harvest data');
  if (getInvalidHarvestDraftLine(autoSizeOnly, true) !== null) throw new Error('an auto-filled size alone must not create an invalid harvest line');

  if (!hasHarvestDraftData(autoSizeOnly, false) || getInvalidHarvestDraftLine(autoSizeOnly, false) !== 'main') {
    throw new Error('an explicitly entered size alone must start an invalid main harvest line');
  }

  const incompleteMain = { biomass: '10', size: '100', price: '', subBiomass: '', subSize: '', subPrice: '' };
  if (getInvalidHarvestDraftLine(incompleteMain, true) !== 'main') throw new Error('started incomplete main line must block saving');
  const incompleteSecondary = { biomass: '10', size: '100', price: '5', subBiomass: '2', subSize: '', subPrice: '' };
  if (getInvalidHarvestDraftLine(incompleteSecondary) !== 'secondary') throw new Error('started incomplete secondary line must block saving');

  const secondaryOnly = { biomass: '', size: '100', price: '', subBiomass: '2', subSize: '80', subPrice: '6' };
  if (!hasHarvestDraftData(secondaryOnly, true) || getInvalidHarvestDraftLine(secondaryOnly, true) !== null) {
    throw new Error('complete secondary-only line must be accepted despite auto-filled main size');
  }
  const savedSecondaryOnly = stripOrphanAutoFilledHarvestSize(secondaryOnly, true);
  if (savedSecondaryOnly.size !== '') throw new Error('secondary-only save must not persist an orphan main size');
  if (stripOrphanAutoFilledHarvestSize({ ...secondaryOnly, biomass: '1' }, true).size !== '100') {
    throw new Error('auto-filled main size must be retained when main biomass is entered');
  }

  const a2Draft = autoSizeOnly;
  const a3Draft = { biomass: '20', size: '110', price: '8', subBiomass: '', subSize: '', subPrice: '' };
  const a2A3SaveSet = [a2Draft, a3Draft].filter((draft) => hasHarvestDraftData(draft, true));
  if (a2A3SaveSet.length !== 1 || a2A3SaveSet[0] !== a3Draft) {
    throw new Error('A2 auto-size-only draft must be excluded while complete A3 draft enters the save set');
  }

  const generatedSize = { value: '100', date: '2026-09-27' };
  if (clearUntouchedAutoFilledHarvestSize('100', generatedSize) !== '') {
    throw new Error('changing harvest date must clear an untouched sampling-derived size');
  }
  if (clearUntouchedAutoFilledHarvestSize('95', generatedSize) !== '95') {
    throw new Error('changing harvest date must preserve an explicitly edited size');
  }
  const refreshedSuggestion = refreshAutoFilledHarvestSize('100', generatedSize, '80', '2026-10-02');
  if (refreshedSuggestion.size !== '80' || refreshedSuggestion.autoFilled?.date !== '2026-10-02') {
    throw new Error('saving a new-date sampling must replace the untouched stale size suggestion');
  }
  const preservedExplicitSize = refreshAutoFilledHarvestSize('95', generatedSize, '80', '2026-10-02');
  if (preservedExplicitSize.size !== '95' || preservedExplicitSize.autoFilled) {
    throw new Error('sampling save must preserve explicit size edits and clear stale provenance');
  }
}

{
  const pendingFeed = buildHarvestDateSampling({
    id: 'sampling-pending-feed',
    date: '2026-07-12',
    mbw: 10,
    feedStatus: 'not_recorded',
  });
  if ('feed' in pendingFeed) throw new Error('unknown harvest-day feed must not be saved as zero');
  if (pendingFeed.feedEntryStatus !== 'not_recorded') throw new Error('unknown harvest-day feed status was not preserved');

  const fasted = buildHarvestDateSampling({
    id: 'sampling-fasted',
    date: '2026-07-12',
    mbw: 10,
    feedStatus: 'fasted',
  });
  if (fasted.feed !== 0 || fasted.feedEntryStatus !== 'fasted') {
    throw new Error('confirmed fasting must be stored distinctly from unknown feed');
  }
}

{
  const pond = {
    samplings: [
      { id: 'baseline', date: '2026-07-12', mbw: 9, isBaselineEstimate: true },
      { id: 'feed-only', date: '2026-07-12', mbw: 0, feed: 20 },
      { id: 'valid', date: '2026-07-12', mbw: 10 },
    ],
  };
  const sampling = getHarvestDateSampling(pond, '2026-07-12');
  if (sampling?.id !== 'valid') throw new Error('harvest date sampling must use a real positive-MBW sample');
  assertClose(getSamplingSize(sampling), 100, 'sampling size');
  if (!harvestSizeDiffersFromSampling(125, sampling)) throw new Error('large harvest size difference was not detected');
  if (harvestSizeDiffersFromSampling(115, sampling)) throw new Error('small harvest size difference was incorrectly detected');
  if (getHarvestDateSampling(pond, '2026-07-13')) throw new Error('sampling from another date was accepted');
}

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
  assertClose(calculatePondMetricsWithHarvest(afterHarvest).currentBiomass, 920, 'post-harvest biomass follows remaining heads and sampled MBW');
  assertClose(calculatePondMetricsWithHarvest(afterHarvest).currentPopulation, 92_000, 'population after harvest');

  const afterNewSampling = {
    ...afterHarvest,
    samplings: [...afterHarvest.samplings, { id: 'sampling-2', date: '2026-07-14', mbw: 12, mortality: 0 }],
  };
  assertClose(calculatePondMetricsWithHarvest(afterNewSampling).currentBiomass, 1_104, 'new sampling refreshes biomass');

  const restored = reverseHarvestImpactOnPond(afterHarvest, harvest);
  assertClose(calculatePondMetricsWithHarvest(restored).currentBiomass, 1_000, 'reversed biomass');
  assertClose(calculatePondMetricsWithHarvest(restored).currentPopulation, 100_000, 'reversed population');

  const pondWithFutureSampling = {
    ...pond,
    samplings: [
      ...pond.samplings,
      { id: 'sampling-future', date: '2026-07-15', mbw: 15, mortality: 0 },
      { id: 'feed-future', date: '2026-07-15', feedData: { totalDailyFeed: 40, feedingResponse: 'normal' as const } },
    ],
  };
  const asOfHarvest = calculatePondMetricsWithHarvest(pondWithFutureSampling, undefined, {
    now: '2026-07-12',
    currentDateKey: '2026-07-12',
  });
  assertClose(asOfHarvest.latestMbw, 10, 'harvest-date snapshot excludes a later MBW sample');
  assertClose(asOfHarvest.totalFeedConsumed, 0, 'harvest-date snapshot excludes later feed');
  const dateBoundHarvest = withHarvestReference<HarvestLineInput>(
    pondWithFutureSampling,
    { biomass: 100, size: 80, harvestType: 'partial' as const },
    '2026-07-12',
  );
  assertClose(Number(dateBoundHarvest.harvestReferenceMbw), 10, 'harvest reference excludes future sampling');
  const dateBoundAfterHarvest = applyHarvestImpactToPond(pondWithFutureSampling, dateBoundHarvest, '2026-07-12', 1);
  assertClose(Number(dateBoundAfterHarvest.postHarvestRemainingPopulation), 92_000, 'date-bound harvest removes heads from harvest-date SR');
  assertClose(Number(dateBoundAfterHarvest.postHarvestRemainingBiomass), 920, 'saved harvest biomass matches remaining heads and reference MBW');

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
  const restoredMetrics = calculatePondMetricsWithHarvest(oldHarvestRemoved, undefined, { now: '2026-07-15' });
  // Only the later 50 kg x 100 shrimp/kg harvest remains. Value those heads at the newer 12 g MBW.
  const remainingHeads = 100_000 - (50 * 100);
  assertClose(restoredMetrics.currentPopulation, remainingHeads, 'old harvest reversal restores heads, retaining later harvest removal');
  assertClose(restoredMetrics.latestMbw, 12, 'old harvest reversal retains newer sampled MBW');
  assertClose(restoredMetrics.currentBiomass, (remainingHeads * 12) / 1000, 'reversed biomass uses remaining heads and newer sampled MBW');
  assertClose(Number(oldHarvestRemoved.totalHarvestedPopulation), 5_000, 'reversal preserves later harvested heads');
  assertClose(Number(oldHarvestRemoved.totalHarvestedBiomass), 50, 'reversal preserves later harvested kilograms');

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

  runFeedRateBiomassSelfTest();
};

export const runFeedRateBiomassSelfTest = () => {
  const timeZone = 'Australia/Melbourne';
  const basePond = {
    docStart: '2026-05-24',
    initialPopulation: 100_000,
    initialWeight: 0.5,
    samplings: [
      { id: 'growth-1', date: '2026-08-17', mbw: 14, mortality: 0 },
    ],
  };

  const getNormalBiomass = (pond: any, dateKey: string) => {
    return calculatePondMetricsWithHarvest(pond, timeZone, {
      currentDateKey: dateKey,
      now: new Date(`${dateKey}T12:00:00+10:00`),
      skipFrOverride: true,
    }).currentBiomass;
  };

  // 1. Pre-sample behavior: feed dates prior to the first valid sampling
  const preSamplePond = {
    ...basePond,
    samplings: [
      { id: 'feed-pre-1', date: '2026-08-14', feedData: { totalDailyFeed: 33, feedingResponse: 'normal' as const } },
      { id: 'feed-pre-2', date: '2026-08-15', feedData: { totalDailyFeed: 33, feedingResponse: 'normal' as const } },
      { id: 'feed-pre-3', date: '2026-08-16', feedData: { totalDailyFeed: 33, feedingResponse: 'normal' as const } },
      { id: 'growth-1', date: '2026-08-17', mbw: 14, mortality: 0 },
    ],
  };
  const preSampleMetrics = calculatePondMetricsWithHarvest(preSamplePond, timeZone, {
    currentDateKey: '2026-08-16',
    now: new Date('2026-08-16T12:00:00+10:00'),
  });
  if (preSampleMetrics.biomassEstimate.method === 'biological_feed') {
    throw new Error('pre-sample feed must retain normal biomass and not activate FR override');
  }

  // Pre-threshold behavior: fewer than 5 consecutive calendar feed dates (4 days)
  const norm1 = getNormalBiomass(basePond, '2026-08-18');
  const norm2 = getNormalBiomass(basePond, '2026-08-19');
  const norm3 = getNormalBiomass(basePond, '2026-08-20');
  const norm4 = getNormalBiomass(basePond, '2026-08-21');
  const norm5 = getNormalBiomass(basePond, '2026-08-22');

  const frPercent14 = 3.3; // getFeedRateFromMbw(14)
  const feed1 = norm1 * (frPercent14 / 100);
  const feed2 = norm2 * (frPercent14 / 100);
  const feed3 = norm3 * (frPercent14 / 100);
  const feed4 = norm4 * (frPercent14 / 100);
  const feed5 = norm5 * (frPercent14 / 100);

  const preThresholdPond = {
    ...basePond,
    samplings: [
      ...basePond.samplings,
      { id: 'f-1', date: '2026-08-18', feedData: { totalDailyFeed: feed1, feedingResponse: 'normal' as const } },
      { id: 'f-2', date: '2026-08-19', feedData: { totalDailyFeed: feed2, feedingResponse: 'normal' as const } },
      { id: 'f-3', date: '2026-08-20', feedData: { totalDailyFeed: feed3, feedingResponse: 'normal' as const } },
      { id: 'f-4', date: '2026-08-21', feedData: { totalDailyFeed: feed4, feedingResponse: 'normal' as const } },
    ],
  };
  const preThresholdMetrics = calculatePondMetricsWithHarvest(preThresholdPond, timeZone, {
    currentDateKey: '2026-08-21',
    now: new Date('2026-08-21T12:00:00+10:00'),
  });
  assertClose(preThresholdMetrics.currentBiomass, norm4, 'pre-threshold 4 days retains normal biomass');
  if (preThresholdMetrics.biomassEstimate.method === 'biological_feed') {
    throw new Error('4 feed days must not activate feed-rate override');
  }

  // 2. Activation on Day 5: 5 consecutive qualifying days
  const fiveDayPond = {
    ...basePond,
    samplings: [
      ...preThresholdPond.samplings,
      { id: 'f-5', date: '2026-08-22', feedData: { totalDailyFeed: feed5, feedingResponse: 'normal' as const } },
    ],
  };
  const activatedMetrics = calculatePondMetricsWithHarvest(fiveDayPond, timeZone, {
    currentDateKey: '2026-08-22',
    now: new Date('2026-08-22T12:00:00+10:00'),
  });
  const expectedMean5 = (norm1 + norm2 + norm3 + norm4 + norm5) / 5;
  assertClose(activatedMetrics.currentBiomass, expectedMean5, 'day 5 activates with arithmetic mean of 5 daily estimates');
  if (activatedMetrics.biomassEstimate.method !== 'biological_feed') {
    throw new Error('day 5 activation must set method to biological_feed');
  }
  if (activatedMetrics.biomassEstimate.confidence !== 'medium') {
    throw new Error('day 5 activation must have medium confidence');
  }
  const expectedPopulation5 = Math.round((expectedMean5 * 1000) / 14);
  assertClose(activatedMetrics.currentPopulation, expectedPopulation5, 'population consistent with accepted biomass');
  assertClose(activatedMetrics.adjustedSR, (expectedPopulation5 / 100_000) * 100, 'SR consistent with accepted biomass');
  if (
    activatedMetrics.currentBiomass < activatedMetrics.biomassEstimate.lowEstimateKg ||
    activatedMetrics.currentBiomass > activatedMetrics.biomassEstimate.highEstimateKg
  ) {
    throw new Error('activated biomass must remain within confidence bounds');
  }
  const produced5 = activatedMetrics.currentBiomass;
  assertClose(activatedMetrics.adjustedFCR, activatedMetrics.totalFeedConsumed / produced5, 'FCR consistent with accepted biomass');

  const qualifiedHarvestLine: HarvestLineInput = { biomass: 20, size: 70, harvestType: 'partial' };
  const qualifiedHarvestRemoval = calculateHarvestRemoval(qualifiedHarvestLine);
  const afterQualifiedHarvest: HarvestTrackingPond = applyHarvestImpactToPond(
    fiveDayPond,
    qualifiedHarvestLine,
    '2026-08-22',
    1,
    timeZone,
  );
  assertClose(
    Number(afterQualifiedHarvest.postHarvestRemainingPopulation),
    activatedMetrics.currentPopulation - qualifiedHarvestRemoval.population,
    'partial harvest starts from the qualified five-day FR/SR population',
  );
  assertClose(
    Number(afterQualifiedHarvest.postHarvestRemainingBiomass),
    (Number(afterQualifiedHarvest.postHarvestRemainingPopulation) * 14) / 1000,
    'partial harvest biomass is consistent with remaining heads and harvest-date MBW',
  );

  const postHarvestFeedDates = [
    '2026-08-23', '2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27',
  ];
  let postHarvestFeedPond = { ...afterQualifiedHarvest, samplings: [...(afterQualifiedHarvest.samplings || [])] };
  postHarvestFeedDates.forEach((dateKey, index) => {
    const normalBiomass = getNormalBiomass(postHarvestFeedPond, dateKey);
    postHarvestFeedPond = {
      ...postHarvestFeedPond,
      samplings: [
        ...postHarvestFeedPond.samplings,
        { id: `post-harvest-feed-${index + 1}`, date: dateKey, feedData: { totalDailyFeed: normalBiomass * (frPercent14 / 100), feedingResponse: 'normal' as const } },
      ],
    };
  });
  const postHarvestFrMetrics = calculatePondMetricsWithHarvest(postHarvestFeedPond, timeZone, {
    currentDateKey: '2026-08-27',
    now: new Date('2026-08-27T12:00:00+10:00'),
  });
  if (postHarvestFrMetrics.biomassEstimate.method !== 'biological_feed') {
    throw new Error('five qualifying post-harvest feed days must reactivate the FR estimate');
  }
  if (postHarvestFrMetrics.currentPopulation > Number(afterQualifiedHarvest.postHarvestRemainingPopulation)) {
    throw new Error('post-harvest FR cannot increase heads above the saved harvest anchor');
  }
  const withLaterMbw = {
    ...postHarvestFeedPond,
    samplings: [...postHarvestFeedPond.samplings, { id: 'growth-after-harvest', date: '2026-08-28', mbw: 16, mortality: 0 }],
  };
  const laterMbwMetrics = calculatePondMetricsWithHarvest(withLaterMbw, timeZone, {
    currentDateKey: '2026-08-28',
    now: new Date('2026-08-28T12:00:00+10:00'),
  });
  if (laterMbwMetrics.currentPopulation > Number(afterQualifiedHarvest.postHarvestRemainingPopulation)) {
    throw new Error('later MBW sampling cannot increase population beyond the post-harvest anchor');
  }

  // 3. 10% Boundary: inclusive ±10% qualifies, outside ±10% fails
  // +10% exactly qualifies
  const boundaryPlus10Pond = {
    ...basePond,
    samplings: [
      ...preThresholdPond.samplings,
      { id: 'f-5-plus10', date: '2026-08-22', feedData: { totalDailyFeed: feed5 * 1.10, feedingResponse: 'normal' as const } },
    ],
  };
  const metricsPlus10 = calculatePondMetricsWithHarvest(boundaryPlus10Pond, timeZone, {
    currentDateKey: '2026-08-22',
    now: new Date('2026-08-22T12:00:00+10:00'),
  });
  const expectedMeanPlus10 = (norm1 + norm2 + norm3 + norm4 + (norm5 * 1.10)) / 5;
  assertClose(metricsPlus10.currentBiomass, expectedMeanPlus10, '+10% inclusive boundary qualifies');

  // -10% exactly qualifies
  const boundaryMinus10Pond = {
    ...basePond,
    samplings: [
      ...preThresholdPond.samplings,
      { id: 'f-5-minus10', date: '2026-08-22', feedData: { totalDailyFeed: feed5 * 0.90, feedingResponse: 'normal' as const } },
    ],
  };
  const metricsMinus10 = calculatePondMetricsWithHarvest(boundaryMinus10Pond, timeZone, {
    currentDateKey: '2026-08-22',
    now: new Date('2026-08-22T12:00:00+10:00'),
  });
  const expectedMeanMinus10 = (norm1 + norm2 + norm3 + norm4 + (norm5 * 0.90)) / 5;
  assertClose(metricsMinus10.currentBiomass, expectedMeanMinus10, '-10% inclusive boundary qualifies');

  // +11% fails (mismatch reset)
  const beyondPlus10Pond = {
    ...basePond,
    samplings: [
      ...preThresholdPond.samplings,
      { id: 'f-5-plus11', date: '2026-08-22', feedData: { totalDailyFeed: feed5 * 1.11, feedingResponse: 'normal' as const } },
    ],
  };
  const metricsPlus11 = calculatePondMetricsWithHarvest(beyondPlus10Pond, timeZone, {
    currentDateKey: '2026-08-22',
    now: new Date('2026-08-22T12:00:00+10:00'),
  });
  assertClose(metricsPlus11.currentBiomass, norm5, '+11% mismatch retains normal biomass');

  // -11% fails (mismatch reset)
  const beyondMinus10Pond = {
    ...basePond,
    samplings: [
      ...preThresholdPond.samplings,
      { id: 'f-5-minus11', date: '2026-08-22', feedData: { totalDailyFeed: feed5 * 0.89, feedingResponse: 'normal' as const } },
    ],
  };
  const metricsMinus11 = calculatePondMetricsWithHarvest(beyondMinus10Pond, timeZone, {
    currentDateKey: '2026-08-22',
    now: new Date('2026-08-22T12:00:00+10:00'),
  });
  assertClose(metricsMinus11.currentBiomass, norm5, '-11% mismatch retains normal biomass');

  // 4. Day 6 and Day 7 rolling average
  const norm6 = getNormalBiomass(basePond, '2026-08-23');
  const feed6 = norm6 * (frPercent14 / 100) * 1.04; // +4%
  const frBiomass6 = feed6 / (frPercent14 / 100);

  const sixDayPond = {
    ...basePond,
    samplings: [
      ...fiveDayPond.samplings,
      { id: 'f-6', date: '2026-08-23', feedData: { totalDailyFeed: feed6, feedingResponse: 'normal' as const } },
    ],
  };
  const metricsDay6 = calculatePondMetricsWithHarvest(sixDayPond, timeZone, {
    currentDateKey: '2026-08-23',
    now: new Date('2026-08-23T12:00:00+10:00'),
  });
  const expectedMean6 = (norm2 + norm3 + norm4 + norm5 + frBiomass6) / 5;
  assertClose(metricsDay6.currentBiomass, expectedMean6, 'day 6 rolling average uses window [2..6]');

  const norm7 = getNormalBiomass(basePond, '2026-08-24');
  const feed7 = norm7 * (frPercent14 / 100) * 0.96; // -4%
  const frBiomass7 = feed7 / (frPercent14 / 100);

  const sevenDayPond = {
    ...basePond,
    samplings: [
      ...sixDayPond.samplings,
      { id: 'f-7', date: '2026-08-24', feedData: { totalDailyFeed: feed7, feedingResponse: 'normal' as const } },
    ],
  };
  const metricsDay7 = calculatePondMetricsWithHarvest(sevenDayPond, timeZone, {
    currentDateKey: '2026-08-24',
    now: new Date('2026-08-24T12:00:00+10:00'),
  });
  const expectedMean7 = (norm3 + norm4 + norm5 + frBiomass6 + frBiomass7) / 5;
  assertClose(metricsDay7.currentBiomass, expectedMean7, 'day 7 rolling average uses window [3..7]');

  // 5. Gap reset: missing calendar date (Aug 21 missing, feed on Aug 18, 19, 20, 22, 23)
  const gapPond = {
    ...basePond,
    samplings: [
      { id: 'growth-1', date: '2026-08-17', mbw: 14, mortality: 0 },
      { id: 'f-1', date: '2026-08-18', feedData: { totalDailyFeed: feed1, feedingResponse: 'normal' as const } },
      { id: 'f-2', date: '2026-08-19', feedData: { totalDailyFeed: feed2, feedingResponse: 'normal' as const } },
      { id: 'f-3', date: '2026-08-20', feedData: { totalDailyFeed: feed3, feedingResponse: 'normal' as const } },
      // 2026-08-21 is MISSING
      { id: 'f-5', date: '2026-08-22', feedData: { totalDailyFeed: feed5, feedingResponse: 'normal' as const } },
      { id: 'f-6', date: '2026-08-23', feedData: { totalDailyFeed: feed6, feedingResponse: 'normal' as const } },
    ],
  };
  const gapMetrics = calculatePondMetricsWithHarvest(gapPond, timeZone, {
    currentDateKey: '2026-08-23',
    now: new Date('2026-08-23T12:00:00+10:00'),
  });
  assertClose(gapMetrics.currentBiomass, norm6, 'calendar gap resets streak and retains normal biomass');

  // 6. Duplicate dates: split feedings on the same date count as one calendar day
  const duplicateDatePond = {
    ...basePond,
    samplings: [
      { id: 'growth-1', date: '2026-08-17', mbw: 14, mortality: 0 },
      { id: 'f-1', date: '2026-08-18', feedData: { totalDailyFeed: feed1, feedingResponse: 'normal' as const } },
      { id: 'f-2', date: '2026-08-19', feedData: { totalDailyFeed: feed2, feedingResponse: 'normal' as const } },
      // Duplicate snapshots are full-day totals, so the latest record wins.
      { id: 'f-3a', date: '2026-08-20T08:00:00+10:00', feedData: { totalDailyFeed: feed3, feedingResponse: 'normal' as const } },
      { id: 'f-3b', date: '2026-08-20T12:00:00+10:00', feedData: { totalDailyFeed: feed3, feedingResponse: 'normal' as const } },
      { id: 'f-4', date: '2026-08-21', feedData: { totalDailyFeed: feed4, feedingResponse: 'normal' as const } },
      { id: 'f-5', date: '2026-08-22', feedData: { totalDailyFeed: feed5, feedingResponse: 'normal' as const } },
    ],
  };
  const duplicateMetrics = calculatePondMetricsWithHarvest(duplicateDatePond, timeZone, {
    currentDateKey: '2026-08-22',
    now: new Date('2026-08-22T12:00:00+10:00'),
  });
  assertClose(duplicateMetrics.currentBiomass, expectedMean5, 'duplicate full-day totals are not added together');

  const samplingFeedDoesNotReplaceDailyTotal = {
    ...fiveDayPond,
    samplings: fiveDayPond.samplings.map((record: any) => record.id === 'f-3'
      ? { ...record, feed: feed3 * 100, feedData: { ...record.feedData, totalDailyFeed: feed3 } }
      : record),
  };
  const samplingFeedMetrics = calculatePondMetricsWithHarvest(samplingFeedDoesNotReplaceDailyTotal, timeZone, {
    currentDateKey: '2026-08-22',
    now: new Date('2026-08-22T12:00:00+10:00'),
  });
  assertClose(samplingFeedMetrics.currentBiomass, expectedMean5, 'FR uses feedData total, not a sampling record feed value');
  assertClose(samplingFeedMetrics.totalFeedConsumed, feed1 + feed2 + feed3 + feed4 + feed5, 'feed consumption uses daily feed totals on merged sampling records');
  assertClose(
    samplingFeedMetrics.adjustedFCR,
    samplingFeedMetrics.totalFeedConsumed / samplingFeedMetrics.currentBiomass,
    'FCR uses the same daily feed totals as biomass estimation',
  );

  // 7. Atypical responses: weak or strong feeding response resets streak
  const weakResponsePond = {
    ...basePond,
    samplings: [
      { id: 'growth-1', date: '2026-08-17', mbw: 14, mortality: 0 },
      { id: 'f-1', date: '2026-08-18', feedData: { totalDailyFeed: feed1, feedingResponse: 'normal' as const } },
      { id: 'f-2', date: '2026-08-19', feedData: { totalDailyFeed: feed2, feedingResponse: 'normal' as const } },
      { id: 'f-3', date: '2026-08-20', feedData: { totalDailyFeed: feed3, feedingResponse: 'weak' as const } },
      { id: 'f-4', date: '2026-08-21', feedData: { totalDailyFeed: feed4, feedingResponse: 'normal' as const } },
      { id: 'f-5', date: '2026-08-22', feedData: { totalDailyFeed: feed5, feedingResponse: 'normal' as const } },
    ],
  };
  const weakMetrics = calculatePondMetricsWithHarvest(weakResponsePond, timeZone, {
    currentDateKey: '2026-08-22',
    now: new Date('2026-08-22T12:00:00+10:00'),
  });
  assertClose(weakMetrics.currentBiomass, norm5, 'atypical weak response resets streak and retains normal biomass');

  // 8. MBW updates: updated MBW on Day 4 (2026-08-21) uses new MBW for Day 4/5, never future data for Days 1..3
  const frPercent17_5 = 3.1; // getFeedRateFromMbw(17.5)
  const updatedSamplingPond = {
    ...basePond,
    samplings: [
      { id: 'growth-1', date: '2026-08-17', mbw: 14, mortality: 0 },
      { id: 'f-1', date: '2026-08-18', feedData: { totalDailyFeed: feed1, feedingResponse: 'normal' as const } },
      { id: 'f-2', date: '2026-08-19', feedData: { totalDailyFeed: feed2, feedingResponse: 'normal' as const } },
      { id: 'f-3', date: '2026-08-20', feedData: { totalDailyFeed: feed3, feedingResponse: 'normal' as const } },
      { id: 'growth-2', date: '2026-08-21', mbw: 17.5, mortality: 0 },
    ],
  };
  const norm4New = getNormalBiomass(updatedSamplingPond, '2026-08-21');
  const norm5New = getNormalBiomass(updatedSamplingPond, '2026-08-22');
  const feed4New = norm4New * (frPercent17_5 / 100);
  const feed5New = norm5New * (frPercent17_5 / 100);

  const mbwUpdatePond = {
    ...updatedSamplingPond,
    samplings: [
      ...updatedSamplingPond.samplings,
      { id: 'f-4', date: '2026-08-21', feedData: { totalDailyFeed: feed4New, feedingResponse: 'normal' as const } },
      { id: 'f-5', date: '2026-08-22', feedData: { totalDailyFeed: feed5New, feedingResponse: 'normal' as const } },
    ],
  };
  const mbwUpdateMetrics = calculatePondMetricsWithHarvest(mbwUpdatePond, timeZone, {
    currentDateKey: '2026-08-22',
    now: new Date('2026-08-22T12:00:00+10:00'),
  });
  const expectedMbwMean = (norm1 + norm2 + norm3 + norm4New + norm5New) / 5;
  assertClose(mbwUpdateMetrics.currentBiomass, expectedMbwMean, 'MBW update applies to subsequent dates without leaking to earlier dates');

  // 9. Cycle boundaries: record with different cycleId does not count toward current cycle
  const cycleBoundaryPond = {
    ...basePond,
    cycleId: 'cycle-current',
    samplings: [
      { id: 'growth-1', date: '2026-08-17', mbw: 14, mortality: 0 },
      { id: 'f-1', date: '2026-08-18', cycleId: 'cycle-old', feedData: { totalDailyFeed: feed1, feedingResponse: 'normal' as const } },
      { id: 'f-2', date: '2026-08-19', cycleId: 'cycle-current', feedData: { totalDailyFeed: feed2, feedingResponse: 'normal' as const } },
      { id: 'f-3', date: '2026-08-20', cycleId: 'cycle-current', feedData: { totalDailyFeed: feed3, feedingResponse: 'normal' as const } },
      { id: 'f-4', date: '2026-08-21', cycleId: 'cycle-current', feedData: { totalDailyFeed: feed4, feedingResponse: 'normal' as const } },
      { id: 'f-5', date: '2026-08-22', cycleId: 'cycle-current', feedData: { totalDailyFeed: feed5, feedingResponse: 'normal' as const } },
    ],
  };
  const cycleMetrics = calculatePondMetricsWithHarvest(cycleBoundaryPond, timeZone, {
    currentDateKey: '2026-08-22',
    now: new Date('2026-08-22T12:00:00+10:00'),
  });
  assertClose(cycleMetrics.currentBiomass, norm5, 'cycle mismatch on day 1 resets streak, retaining normal biomass');

  // 10. Harvest precedence and no future harvest leakage
  // A saved harvest anchor is adjusted for expected mortality; unrelated pre-harvest feed cannot override it.
  const postHarvestPrecedencePond = {
    ...fiveDayPond,
    postHarvestBaselineDate: '2026-08-17',
    postHarvestRemainingBiomass: 750,
    postHarvestRemainingPopulation: 53_571,
    postHarvestReferenceSamplingId: 'growth-1',
    postHarvestReferenceSamplingDate: '2026-08-17',
    postHarvestReferenceMbw: 14,
  };
  const postHarvestMetrics = calculatePondMetricsWithHarvest(postHarvestPrecedencePond, timeZone, {
    currentDateKey: '2026-08-22',
    now: new Date('2026-08-22T12:00:00+10:00'),
  });
  const onHarvestDay = calculatePondMetricsWithHarvest(postHarvestPrecedencePond, timeZone, {
    now: '2026-08-17', currentDateKey: '2026-08-17',
  });
  assertClose(onHarvestDay.currentBiomass, 750, 'saved biomass is unchanged on the harvest date');
  // At DOC > 30 the default model loses 0.15% daily. Apply five days to the saved population.
  const expectedHeads = Math.round(53_571 * Math.pow(1 - 0.0015, 5));
  const expectedLossKg = ((53_571 - expectedHeads) * 14) / 1000;
  assertClose(postHarvestMetrics.currentPopulation, expectedHeads, 'post-harvest population includes five days of expected mortality');
  assertClose(postHarvestMetrics.currentBiomass, 750 - expectedLossKg, 'saved biomass loses the weight of expected mortalities');
  if (postHarvestMetrics.biomassEstimate.method !== 'post_harvest') {
    throw new Error('post-harvest precedence must preserve method post_harvest');
  }

  const harvestReferenceDateOnly = {
    ...fiveDayPond,
    postHarvestBaselineDate: null,
    postHarvestReferenceSamplingDate: '2026-08-17',
    totalHarvestedPopulation: 10_000,
  };
  const referenceOnlyMetrics = calculatePondMetricsWithHarvest(harvestReferenceDateOnly, timeZone, {
    currentDateKey: '2026-08-22',
    now: new Date('2026-08-22T12:00:00+10:00'),
  });
  if (referenceOnlyMetrics.biomassEstimate.method === 'biological_feed') {
    throw new Error('a reference sampling date is not sufficient to date aggregate harvests');
  }

  const mortalityCapPond = {
    ...basePond,
    mortalityRecords: [{ id: 'mortality-current', date: '2026-08-22', observationType: 'estimated_total' as const, count: 20_000 }],
  };
  const capNorms = [norm1, norm2, norm3, norm4,
    getNormalBiomass(mortalityCapPond, '2026-08-22')];
  const overCapPond = {
    ...mortalityCapPond,
    samplings: [
      ...basePond.samplings,
      ...capNorms.map((biomass, index) => ({
        id: `cap-feed-${index + 1}`,
        date: `2026-08-${18 + index}`,
        feedData: { totalDailyFeed: biomass * (frPercent14 / 100), feedingResponse: 'normal' as const },
      })),
    ],
  };
  const overCapMetrics = calculatePondMetricsWithHarvest(overCapPond, timeZone, {
    currentDateKey: '2026-08-22',
    now: new Date('2026-08-22T12:00:00+10:00'),
  });
  const expectedCapFallback = getNormalBiomass(mortalityCapPond, '2026-08-22');
  assertClose(overCapMetrics.currentBiomass, expectedCapFallback, 'FR average above the recorded population cap falls back to normal biomass');
  if (overCapMetrics.biomassEstimate.method === 'biological_feed') {
    throw new Error('over-cap FR biomass must not be reported as an accepted feed estimate');
  }

  // Future harvest on Day 7 (2026-08-24) does not leak into Day 5 (2026-08-22) calculation
  const futureHarvestPond = {
    ...fiveDayPond,
    postHarvestBaselineDate: '2026-08-24',
    postHarvestRemainingBiomass: 500,
    postHarvestRemainingPopulation: 35_000,
    totalHarvestedPopulation: 30_000,
    totalHarvestedBiomass: 420,
  };
  const futureHarvestMetrics = calculatePondMetricsWithHarvest(futureHarvestPond, timeZone, {
    currentDateKey: '2026-08-22',
    now: new Date('2026-08-22T12:00:00+10:00'),
  });
  assertClose(futureHarvestMetrics.currentBiomass, expectedMean5, 'future harvest does not leak into Day 5 calculation');
};
