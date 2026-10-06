import {
  allocateCostsToPond,
  buildDailyFeedTotalsForPond,
  buildPondProfitabilityCostSnapshot,
  calculateDailyFeedIncreaseRate,
  calculateHarvestProfitability,
  calculateRecordedDailyMortalityRate,
  evaluateHarvestDecisionForPond,
  expenseToCostRecord,
  inventoryUsageToCostRecord,
  type AllocatableCostRecord,
  type ProfitabilityPond,
} from './harvestProfitability';
import {
  buildPersistedHarvestMarketPrices,
  harvestMarketPriceInputsEqual,
  normalizeHarvestMarketPriceInputs,
} from './harvestProjectionSettings';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const closeTo = (actual: number, expected: number, tolerance = 0.01): boolean =>
  Math.abs(actual - expected) <= tolerance;

export const runHarvestProfitabilitySelfTest = () => {
  const storedPrices = normalizeHarvestMarketPriceInputs({ 100: 4.2, 50: '6.5', 40: 0, invalid: 99 });
  assert(storedPrices[100] === '4.2' && storedPrices[50] === '6.5' && storedPrices[40] === '', 'normalizes only supported positive saved market prices');
  assert(harvestMarketPriceInputsEqual(storedPrices, normalizeHarvestMarketPriceInputs({ 100: 4.2, 50: 6.5 })), 'compares normalized market-price drafts');
  const persistedPrices = buildPersistedHarvestMarketPrices(storedPrices);
  assert(persistedPrices['100'] === 4.2 && persistedPrices['50'] === 6.5, 'serializes valid market prices for Firestore');

  const ponds: ProfitabilityPond[] = [
    { id: 'p1', pondCycleId: 'pc1', cycleId: 'c1', cycleStartedAt: '2026-07-01', cycleStatus: 'active' },
    { id: 'p2', pondCycleId: 'pc2', cycleId: 'c1', cycleStartedAt: '2026-07-01', cycleStatus: 'active' },
    { id: 'p3', pondCycleId: 'pc3', cycleId: 'c2', cycleStartedAt: '2026-07-10', cycleEndedAt: '2026-07-15', cycleStatus: 'ended' },
  ];
  const records: AllocatableCostRecord[] = [
    { id: 'direct', date: '2026-07-12', amount: 90, pondId: 'p1', pondCycleId: 'pc1', cycleId: 'c1', source: 'expense' },
    { id: 'cycle-shared', date: '2026-07-12', amount: 100, cycleId: 'c1', source: 'expense' },
    { id: 'company-shared', date: '2026-07-12', amount: 300, source: 'additive_usage' },
    { id: 'after-ended', date: '2026-07-16', amount: 200, source: 'expense' },
  ];
  const allocation = allocateCostsToPond({
    pond: ponds[0],
    ponds,
    records,
    startDate: '2026-07-01',
    endDate: '2026-07-19',
  });
  assert(closeTo(allocation.directAmount, 90), 'assigns pond-specific cost directly');
  assert(closeTo(allocation.sharedAmount, 250), 'shares cycle and company costs only across active ponds on each date');
  assert(closeTo(allocation.allocatedAmount, 340), 'returns total pond allocation');

  const purchase = {
    id: 'purchase', date: '2026-07-12', amount: 500, reference: 'INVENTORY-additive-a1-s1', linkedInventory: 'Probiotic',
  };
  assert(expenseToCostRecord(purchase) === null, 'does not count stock-in purchase as consumed operating cost');
  const usage = inventoryUsageToCostRecord({
    id: 'usage', date: '2026-07-12', quantity: 2, unitPrice: 15, totalCost: 30,
  }, 'additive_usage', 'fallback');
  assert(usage?.amount === 30 && !usage.pondId, 'keeps unassigned additive usage as a general consumed cost');

  const costSnapshot = buildPondProfitabilityCostSnapshot({
    pond: ponds[0],
    ponds,
    feeds: [{ id: 'feed-1', usageHistory: [
      { id: 'feed-use', date: '2026-07-12', quantity: 10, totalCost: 20, pondId: 'p1', pondCycleId: 'pc1', cycleId: 'c1' },
    ] }],
    additives: [{ id: 'additive-1', usageHistory: [
      { id: 'general-use', date: '2026-07-12', quantity: 3, totalCost: 60 },
    ] }],
    expenses: [
      purchase,
      { id: 'salary', date: '2026-07-12', amount: 300 },
    ],
    startDate: '2026-07-01',
    endDate: '2026-07-19',
  });
  assert(costSnapshot.costsToDate.feed === 20, 'uses consumed feed cost');
  assert(costSnapshot.costsToDate.additives === 20, 'shares general consumed additive cost across active ponds');
  assert(costSnapshot.costsToDate.generalExpenses === 100, 'shares company expense across active ponds on its date');
  assert(costSnapshot.feedUnitCostPerKg === 2, 'derives feed unit cost from allocated consumed quantity and cost');
  assert(costSnapshot.excludedInventoryPurchaseIds.includes('purchase'), 'reports excluded inventory purchases');

  const mortalityRate = calculateRecordedDailyMortalityRate({
    records: [
      { date: '2026-07-18', observationType: 'estimated_total', count: 90 },
      { date: '2026-07-19', observationType: 'none_observed', count: 0 },
      { date: '2026-07-19', observationType: 'observed_recovered', count: 10 },
    ],
    currentPopulation: 89910,
    now: new Date('2026-07-19T00:00:00Z'),
  });
  assert(mortalityRate.recordedDays === 2, 'distinguishes recorded zero mortality from missing days');
  assert(mortalityRate.estimatedDeaths === 90, 'only estimated-total mortality affects the projection rate');
  assert(closeTo(mortalityRate.dailyRatePercent, 0.05, 0.0001), 'derives daily mortality rate from recorded days');

  const feedTotals = buildDailyFeedTotalsForPond([
    { id: 'f1', usageHistory: [
      { date: '2026-07-18', quantity: 50, pondId: 'p1' },
      { date: '2026-07-18', quantity: -5, pondId: 'p1' },
    ] },
    { id: 'f2', usageHistory: [{ date: '2026-07-18', quantity: 10, pondId: 'p1' }] },
  ], 'p1');
  assert(feedTotals[0]?.quantityKg === 55, 'aggregates multi-brand feed and edit adjustments into the pond daily total');

  const feedRate = calculateDailyFeedIncreaseRate([
    { date: '2026-07-15', quantityKg: 100 },
    { date: '2026-07-16', quantityKg: 105 },
    { date: '2026-07-17', quantityKg: 110.25 },
  ], undefined, new Date('2026-07-19T00:00:00Z'));
  assert(closeTo(feedRate, 0.05, 0.0001), 'uses recent daily feed increase as the benchmark');

  const profitableGrowth = calculateHarvestProfitability({
    currentPopulation: 90000,
    initialPopulation: 100000,
    currentMbwG: 20,
    currentSurvivalRatePercent: 90,
    adgGPerDay: 0.3,
    historicalFcr: 1.4,
    dailyMortalityRatePercent: 0.02,
    recentDailyFeedTotals: [
      { date: '2026-07-17', quantityKg: 80 },
      { date: '2026-07-18', quantityKg: 82 },
      { date: '2026-07-19', quantityKg: 84 },
    ],
    feedUnitCostPerKg: 1.2,
    priceLadder: [
      { sizeCountPerKg: 50, pricePerKg: 5 },
      { sizeCountPerKg: 40, pricePerKg: 7.5 },
      { sizeCountPerKg: 30, pricePerKg: 9.5 },
      { sizeCountPerKg: 20, pricePerKg: 12 },
    ],
    costsToDate: { feed: 4000, additives: 500, generalExpenses: 1000, other: 0 },
    projectedDailyAdditiveCost: 10,
    projectedDailyGeneralExpense: 20,
    now: new Date('2026-07-19T00:00:00Z'),
  });
  assert(profitableGrowth.today.operatingProfit === 3500, 'calculates harvest-today operating profit after incurred costs');
  assert(profitableGrowth.targets.length > 0, 'builds reachable larger-size scenarios from the price ladder');
  const firstGrowthTarget = profitableGrowth.targets[0];
  assert(firstGrowthTarget.daysFromNow > Math.ceil((firstGrowthTarget.targetMbwG - 20) / 0.3), 'uses tapered growth instead of a straight-line forecast');
  const firstGrowthBiomassGain = firstGrowthTarget.projectedBiomassKg - profitableGrowth.today.projectedBiomassKg;
  assert(firstGrowthTarget.futureFeedKg >= firstGrowthBiomassGain * 1.4 - 0.01, 'does not project feed below the quantity implied by historical FCR');
  assert(profitableGrowth.bestScenario.operatingProfit >= profitableGrowth.today.operatingProfit, 'selects the highest-profit scenario');
  assert(profitableGrowth.decision === 'keep_growing', 'recommends growth when price uplift exceeds mortality and future cost');

  const highMortality = calculateHarvestProfitability({
    ...{
      currentPopulation: 90000,
      initialPopulation: 100000,
      currentMbwG: 20,
      currentSurvivalRatePercent: 90,
      adgGPerDay: 0.15,
      historicalFcr: 1.8,
      recentDailyFeedTotals: [{ date: '2026-07-19', quantityKg: 120 }],
      feedUnitCostPerKg: 2,
      priceLadder: [
        { sizeCountPerKg: 50, pricePerKg: 5 },
        { sizeCountPerKg: 40, pricePerKg: 5.2 },
        { sizeCountPerKg: 30, pricePerKg: 5.4 },
      ],
      costsToDate: { feed: 4000, additives: 500, generalExpenses: 1000, other: 0 },
      projectedDailyAdditiveCost: 30,
      projectedDailyGeneralExpense: 50,
      now: new Date('2026-07-19T00:00:00Z'),
    },
    dailyMortalityRatePercent: 0.8,
  });
  assert(highMortality.decision === 'harvest_now', 'recommends harvest when waiting destroys operating profit');

  const hiddenMortalityFallback = calculateHarvestProfitability({
    ...profitableGrowth,
    currentPopulation: 90000,
    currentMbwG: 20,
    adgGPerDay: 0.3,
    historicalFcr: 1.4,
    dailyMortalityRatePercent: 0,
    fallbackDailyMortalityRatePercent: 0.25,
    recentDailyFeedTotals: [],
    feedUnitCostPerKg: 1.2,
    priceLadder: [{ sizeCountPerKg: 40, pricePerKg: 7.5 }],
    costsToDate: { feed: 4000, additives: 500, generalExpenses: 1000, other: 0 },
    projectedDailyAdditiveCost: 10,
    projectedDailyGeneralExpense: 20,
  });
  assert(hiddenMortalityFallback.dailyMortalityRatePercent === 0.25, 'uses the biological mortality fallback when logs show zero deaths');

  const fullPond = {
    id: 'p1',
    pondName: 'Pond 1',
    pondCycleId: 'pc1',
    cycleId: 'c1',
    cycleStartedAt: '2026-07-01',
    docStart: '2026-07-01',
    initialPopulation: 100000,
    initialWeight: 0.5,
    samplings: [
      { id: 's1', date: '2026-07-10', mbw: 10, feed: 30 },
      { id: 's2', date: '2026-07-19', mbw: 20, feed: 50 },
    ],
    mortalityRecords: [
      { date: '2026-07-18', observationType: 'estimated_total', count: 50 },
      { date: '2026-07-19', observationType: 'none_observed', count: 0 },
    ],
  };

  const decisionEvaluation = evaluateHarvestDecisionForPond({
    pond: fullPond as any,
    options: {
      now: new Date('2026-07-19T00:00:00Z'),
      currentDateKey: '2026-07-19',
      priceLadder: [
        { sizeCountPerKg: 50, pricePerKg: 5 },
        { sizeCountPerKg: 40, pricePerKg: 7.5 },
        { sizeCountPerKg: 30, pricePerKg: 9.5 },
        { sizeCountPerKg: 20, pricePerKg: 12 },
      ],
      feeds: [
        {
          id: 'feed-1',
          usageHistory: [
            { id: 'u1', date: '2026-07-17', quantity: 80, totalCost: 96, pondId: 'p1', pondCycleId: 'pc1', cycleId: 'c1' },
            { id: 'u2', date: '2026-07-18', quantity: 82, totalCost: 98.4, pondId: 'p1', pondCycleId: 'pc1', cycleId: 'c1' },
            { id: 'u3', date: '2026-07-19', quantity: 84, totalCost: 100.8, pondId: 'p1', pondCycleId: 'pc1', cycleId: 'c1' },
          ],
        },
      ],
      additives: [],
      expenses: [{ id: 'e1', date: '2026-07-10', amount: 500, pondId: 'p1', pondCycleId: 'pc1', cycleId: 'c1' }],
    },
  });

  assert(decisionEvaluation.result.decision === 'keep_growing', 'evaluates profitable harvest growth scenario from canonical pond data');
  assert(decisionEvaluation.scope.pondId === 'p1', 'records explicit pondId scope');
  assert(decisionEvaluation.scope.cycleId === 'pc1', 'records explicit cycleId scope');
  assert(decisionEvaluation.assumptions.growthModel === 'von_bertalanffy_tapered_growth', 'explicitly cites tapered growth model');
  assert(decisionEvaluation.assumptions.mortalityBasis === 'recorded_mortality_trend', 'explicitly cites recorded mortality basis');
  assert(decisionEvaluation.marginBasis === 'operating_profit_after_all_incurred_and_projected_costs', 'explicitly states full operating profit margin basis');
  assert(decisionEvaluation.guardrails.advisoryOnly === true, 'enforces advisory-only guardrail');
  assert(decisionEvaluation.guardrails.noFarmWrites === true, 'enforces no-writes guardrail');
  assert(decisionEvaluation.missingEvidence.length === 0, 'flags zero missing evidence when all critical inputs present');

  const missingFeedEvaluation = evaluateHarvestDecisionForPond({
    pond: fullPond as any,
    options: {
      now: new Date('2026-07-19T00:00:00Z'),
      currentDateKey: '2026-07-19',
      priceLadder: [{ sizeCountPerKg: 50, pricePerKg: 5 }, { sizeCountPerKg: 40, pricePerKg: 7.5 }],
      feeds: [],
    },
  });
  assert(missingFeedEvaluation.missingEvidence.includes('missing_recent_daily_feed_records'), 'flags missing recent daily feed evidence');
  assert(missingFeedEvaluation.missingEvidence.includes('missing_historical_feed_unit_cost'), 'flags missing feed unit cost');

  const missingPriceEvaluation = evaluateHarvestDecisionForPond({
    pond: fullPond as any,
    options: {
      now: new Date('2026-07-19T00:00:00Z'),
      currentDateKey: '2026-07-19',
      priceLadder: [],
      feeds: [{ id: 'feed-1', usageHistory: [{ date: '2026-07-19', quantity: 50, totalCost: 100, pondId: 'p1' }] }],
    },
  });
  assert(missingPriceEvaluation.missingEvidence.includes('missing_market_price_ladder'), 'flags missing price ladder evidence');
  assert(missingPriceEvaluation.result.decision === 'review_data', 'recommends review_data when market prices are missing');

  const unrecordedMortalityEvaluation = evaluateHarvestDecisionForPond({
    pond: { ...fullPond, mortalityRecords: [] } as any,
    options: {
      now: new Date('2026-07-19T00:00:00Z'),
      currentDateKey: '2026-07-19',
      priceLadder: [{ sizeCountPerKg: 50, pricePerKg: 5 }, { sizeCountPerKg: 40, pricePerKg: 7.5 }],
      feeds: [{ id: 'feed-1', usageHistory: [{ date: '2026-07-19', quantity: 50, totalCost: 100, pondId: 'p1' }] }],
    },
  });
  assert(unrecordedMortalityEvaluation.missingEvidence.includes('missing_recorded_mortality_observations'), 'flags missing recorded mortality observations');
  assert(unrecordedMortalityEvaluation.assumptions.mortalityBasis === 'biological_fallback', 'falls back to biological mortality model');

  const missingMbwEvaluation = evaluateHarvestDecisionForPond({
    pond: { ...fullPond, samplings: [] } as any,
    options: {
      now: new Date('2026-07-19T00:00:00Z'),
      currentDateKey: '2026-07-19',
      priceLadder: [{ sizeCountPerKg: 50, pricePerKg: 5 }, { sizeCountPerKg: 40, pricePerKg: 7.5 }],
    },
  });
  assert(missingMbwEvaluation.result.decision === 'review_data', 'recommends review_data when current MBW cannot be reliably established');

  return profitableGrowth;
};
