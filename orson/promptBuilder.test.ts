import { calculatePondMetrics } from './metrics';
import { normalizePondData } from './normalizePondData';
import { build72HourOutlook } from './outlook';
import { cleanOrsonResponse, ORSON_FALLBACK_RESPONSE, withOrsonTimeout, buildOrsonPromptPackage, isFarmSpecificQuestion } from './promptBuilder';
import { analyzePondRisks } from './riskEngine';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

export const runPromptBuilderSelfTest = () => {
  const pond = normalizePondData(
    {
      id: 'pond-prompt',
      pondName: 'Prompt Pond',
      pondArea: 1000,
      density: 100,
      initialPopulation: 100000,
      initialWeight: 0.5,
      docStart: '2026-01-01',
      latestPlanktonOverwatch: {
        state: 'high',
        message: 'Plankton instability risk is high.',
        sourceDate: '2026-01-15',
        signals: [{ id: 'cyanobacteria_increasing', evidence: 'Cyanobacteria increased across three results.', recommendation: 'Recheck dawn DO.' }],
        recommendations: ['Increase or optimise aeration overnight.'],
        dataQuality: { missing: ['TAN'] },
        metrics: { totalPlanktonCellPerMl: 1900000, cyanobacteriaPercent: 21, dawnDo: 4.1, feedingResponse: 'weak' },
      },
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
          feedData: { totalDailyFeed: 10 },
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
          temperature: 29.5,
          ammonia: 0.35,
          operationalNotes: 'Aerators ran overnight after rain.',
          transparency: 22,
          weatherEvent: 'heavy_rain',
          waterExchangePercent: 10,
          sludgeLoad: 'high',
          surfaceScum: true,
          shrimpBehaviour: 'abnormal',
          feedData: { totalDailyFeed: 30, feedingResponse: 'weak' },
        },
      ],
    },
    { now: new Date('2026-01-16T00:00:00Z') },
  );

  const metrics = calculatePondMetrics(pond);
  const report = analyzePondRisks(metrics, new Date('2026-01-16T00:00:00Z'));
  const outlook = build72HourOutlook(report, new Date('2026-01-16T00:00:00Z'));
  const farmPackage = buildOrsonPromptPackage({
    userMessage: 'Analyze my feed risk today',
    metrics: [metrics],
    reports: [report],
    outlooks: [outlook],
  });
  const generalPackage = buildOrsonPromptPackage({
    userMessage: 'What is FCR?',
    metrics: [metrics],
    reports: [report],
    outlooks: [outlook],
  });

  assert(isFarmSpecificQuestion('Analyze my pond') === true, 'detects farm-specific questions');
  assert(isFarmSpecificQuestion('What is FCR?') === false, 'detects general questions');
  assert(isFarmSpecificQuestion('give me the last 7 days of mortality') === true, 'detects lookback question as farm-specific');
  assert(farmPackage.cacheKey === null, 'does not cache farm-specific answers by default');
  assert(generalPackage.cacheKey !== null, 'allows general answers to be cached');
  assert(farmPackage.systemInstruction.includes('Do not invent measurements'), 'guards against invented measurements');
  assert(farmPackage.systemInstruction.includes('Do not treat a change in logged daily feed as measured appetite'), 'prevents false appetite inference');
  assert(farmPackage.systemInstruction.includes('deterministic state'), 'keeps the deterministic plankton state authoritative');
  assert(farmPackage.systemInstruction.includes('daily_records_14d'), 'system instruction references daily_records_14d');
  assert(farmPackage.systemInstruction.includes('recent_lab_reports'), 'system instruction references recent_lab_reports');
  assert(farmPackage.systemInstruction.includes('compare the ponds side-by-side'), 'system instruction references pond comparisons');
  assert(farmPackage.systemInstruction.includes('exact numerical adjustments'), 'system instruction references exact feed adjustments');
  assert(farmPackage.systemInstruction.includes('reply in that same language'), 'keeps replies in the user question language');
  assert(farmPackage.context.includes('ORSON RISK PAYLOAD'), 'builds payload context');
  assert(farmPackage.context.includes('feed_pressure_ratio'), 'includes feed pressure');
  assert(farmPackage.context.includes('feed_allocation_trend'), 'includes recent feed allocation trend');
  assert(farmPackage.context.includes('daily_records_14d'), 'includes 14-day daily records in context payload');
  assert(farmPackage.context.includes('recent_lab_reports'), 'includes recent lab reports in context payload');
  assert(farmPackage.context.includes('plankton_overwatch'), 'includes deterministic Plankton Overwatch context');
  assert(farmPackage.context.includes('feeding_response'), 'includes direct feeding response separately from feed quantity');
  assert(farmPackage.context.includes('weather_event'), 'includes dated weather events');
  assert(farmPackage.context.includes('ammonia_mg_l'), 'includes daily ammonia context');
  assert(farmPackage.context.includes('operational_notes'), 'includes daily operational notes');
  assert(farmPackage.context.includes('water_exchange_pct'), 'includes water exchange history');
  assert(farmPackage.context.includes('sludge_load'), 'includes sludge observations');
  assert(farmPackage.context.includes('surface_scum'), 'includes surface-scum observations');
  assert(farmPackage.context.includes('shrimp_behaviour'), 'includes shrimp behaviour observations');
  assert(farmPackage.context.includes('biomass_range_kg'), 'includes biomass range');
  assert(farmPackage.context.includes('calibration'), 'includes bounded company calibration context');
  assert(farmPackage.context.length < 15000, 'keeps prompt context compact');
  assert(cleanOrsonResponse('## **Risk**  \nUse aeration.') === 'Risk\nUse aeration.', 'cleans markdown-heavy responses');

  const pond2 = normalizePondData(
    {
      id: 'pond-prompt-2',
      pondName: 'Prompt Pond 2',
      pondArea: 1000,
      density: 100,
      initialPopulation: 100000,
      initialWeight: 0.5,
      docStart: '2026-01-01',
      treatments: [
        {
          id: 't1',
          date: '2026-01-12',
          name: 'Hydrated Lime',
          quantity: 25,
          unit: 'kg',
        },
      ],
      samplings: [
        {
          id: 's21',
          date: '2026-01-15',
          mbw: 3.0,
          mortality: 10,
          feed: 40,
        },
      ],
    },
    { now: new Date('2026-01-16T00:00:00Z') },
  );

  const metrics2 = calculatePondMetrics(pond2);
  const report2 = analyzePondRisks(metrics2, new Date('2026-01-16T00:00:00Z'));
  const outlook2 = build72HourOutlook(report2, new Date('2026-01-16T00:00:00Z'));

  const comparisonPackage = buildOrsonPromptPackage({
    userMessage: 'Compare Prompt Pond and Prompt Pond 2',
    metrics: [metrics, metrics2],
    reports: [report, report2],
    outlooks: [outlook, outlook2],
  });

  assert(comparisonPackage.questionFocus.intent === 'comparison', 'detects comparison intent');
  assert(comparisonPackage.questionFocus.isComparison === true, 'sets isComparison flag');
  assert(comparisonPackage.context.includes('ORSON COMPARATIVE MATRIX'), 'includes comparative matrix in context');
  assert(comparisonPackage.context.includes('recent_treatments'), 'includes recent treatments');

  return {
    farmPackage,
    generalPackage,
    comparisonPackage,
  };
};

export const runPromptTimeoutSelfTest = async () => {
  const fast = await withOrsonTimeout(Promise.resolve('ok'), 100);
  assert(fast === 'ok', 'returns fast promise result');

  try {
    await withOrsonTimeout(new Promise((resolve) => setTimeout(resolve, 20)), 1);
    throw new Error('timeout should have thrown');
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    assert(error.message === ORSON_FALLBACK_RESPONSE, 'uses fallback timeout message');
  }
};
