import { calculatePondMetrics } from './metrics';
import { normalizePondData } from './normalizePondData';
import { build72HourOutlook } from './outlook';
import {
  buildOrsonPromptPackage,
  buildOrsonRequestPrompt,
  cleanOrsonResponse,
  estimateOrsonPromptTokens,
  isFarmSpecificQuestion,
  ORSON_FALLBACK_RESPONSE,
  ORSON_PROMPT_TOKEN_BUDGET,
  withOrsonTimeout,
} from './promptBuilder';
import { analyzePondRisks } from './riskEngine';
import { consumeOrsonCallableStream } from './callableStream';
import { loadCachedOrsonCalibration } from './calibrationCache';

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
        ...Array.from({ length: 6 }, (_, index) => ({
          id: `early-${index + 1}`,
          date: `2026-01-${String(index + 4).padStart(2, '0')}`,
          mbw: 0.8 + (index * 0.1),
          mortality: index,
          feed: 4 + index,
          feedData: { totalDailyFeed: 4 + index },
        })),
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
  const additivePackage = buildOrsonPromptPackage({
    userMessage: 'What ingredients are inside BioPlus probiotic?',
    metrics: [metrics],
    reports: [report],
    outlooks: [outlook],
  });
  const additiveFollowUpPackage = buildOrsonPromptPackage({
    userMessage: 'Could that affect low oxygen?',
    metrics: [metrics],
    reports: [report],
    outlooks: [outlook],
    conversationHistory: [
      { role: 'user', text: 'What ingredients are inside BioPlus probiotic?' },
      { role: 'model', text: 'I need the saved product label to confirm the strains.' },
    ],
  });
  const outOfScopePackage = buildOrsonPromptPackage({
    userMessage: 'Who will win the football match tonight?',
    metrics: [metrics],
    reports: [report],
    outlooks: [outlook],
  });
  const historyPackage = buildOrsonPromptPackage({
    userMessage: 'Show the last 14 days of mortality for Prompt Pond',
    metrics: [metrics],
    reports: [report],
    outlooks: [outlook],
  });
  const farmRiskPayload = JSON.parse(farmPackage.context.split('ORSON RISK PAYLOAD:\n')[1]);
  const historyRiskPayload = JSON.parse(historyPackage.context.split('ORSON RISK PAYLOAD:\n')[1]);

  assert(isFarmSpecificQuestion('Analyze my pond') === true, 'detects farm-specific questions');
  assert(isFarmSpecificQuestion('What is FCR?') === false, 'detects general questions');
  assert(buildOrsonPromptPackage({ userMessage: 'What do biofloc systems do?', metrics: [metrics], reports: [report], outlooks: [outlook] }).questionFocus.route === 'aquaculture_knowledge', 'does not mistake the word do for dissolved oxygen');
  assert(buildOrsonPromptPackage({ userMessage: 'What do probiotics do?', metrics: [metrics], reports: [report], outlooks: [outlook] }).questionFocus.route === 'aquaculture_knowledge', 'keeps general additive education separate from product lookup');
  assert(buildOrsonPromptPackage({ userMessage: 'What causes white feces?', metrics: [metrics], reports: [report], outlooks: [outlook] }).questionFocus.route === 'aquaculture_knowledge', 'keeps shrimp-health education in aquaculture scope');
  assert(isFarmSpecificQuestion('give me the last 7 days of mortality') === true, 'detects lookback question as farm-specific');
  assert(farmPackage.cacheKey === null, 'does not cache farm-specific answers by default');
  assert(generalPackage.cacheKey !== null, 'allows general answers to be cached');
  assert(generalPackage.questionFocus.route === 'aquaculture_knowledge', 'routes general aquaculture knowledge separately');
  assert(!generalPackage.context.includes('ORSON RISK PAYLOAD'), 'does not attach pond risk data to general aquaculture questions');
  assert(!generalPackage.context.includes('feed_pressure_ratio'), 'does not inject feed pressure into general aquaculture questions');
  assert(additivePackage.questionFocus.route === 'inventory_product', 'routes additive ingredient questions to product context');
  assert(!additivePackage.context.includes('ORSON RISK PAYLOAD'), 'does not attach pond risk data to product questions without a pond reference');
  assert(additiveFollowUpPackage.questionFocus.route === 'inventory_product', 'keeps an ambiguous follow-up in the prior product route');
  assert(additiveFollowUpPackage.context.includes('ORSON RECENT CONVERSATION'), 'includes bounded recent conversation context');
  assert(additiveFollowUpPackage.cacheKey === null, 'does not cache context-dependent follow-up answers');
  assert(outOfScopePackage.questionFocus.route === 'out_of_scope', 'routes unrelated questions out of scope');
  assert(!outOfScopePackage.context.includes('ORSON RISK PAYLOAD'), 'does not expose pond data to unrelated questions');
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
  assert(farmRiskPayload[0].daily_records_14d.length === 5, 'keeps routine farm prompts to five recent daily records');
  assert(historyRiskPayload[0].daily_records_14d.length === 5, 'keeps explicit history questions to the latest five relevant records');
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

  const oversizedMetrics = {
    ...metrics,
    dailyRecords14d: Array.from({ length: 30 }, (_, index) => ({
      ...metrics.dailyRecords14d[metrics.dailyRecords14d.length - 1],
      date: `2026-01-${String(index + 1).padStart(2, '0')}`,
      operationalNotes: `Long simulated-day note ${index + 1}: ${'x'.repeat(5000)}`,
    })),
    recentTreatments: Array.from({ length: 20 }, (_, index) => ({
      id: `treatment-${index + 1}`,
      date: `2026-01-${String(index + 1).padStart(2, '0')}`,
      additiveId: `additive-${index + 1}`,
      additiveName: 'Pond treatment',
      category: 'probiotic',
      quantity: 10,
      unit: 'kg',
      ppm: null,
      pondVolumeLiters: null,
      notes: `Treatment note ${'y'.repeat(5000)}`,
    })),
  };
  const focusedPackage = buildOrsonPromptPackage({
    userMessage: 'Analyze Prompt Pond water quality',
    metrics: [oversizedMetrics, metrics2],
    reports: [report, report2],
    outlooks: [outlook, outlook2],
    conversationHistory: Array.from({ length: 20 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' as const : 'model' as const,
      text: `Conversation ${index}: ${'z'.repeat(5000)}`,
    })),
  });
  const focusedRiskPayload = JSON.parse(focusedPackage.context.split('ORSON RISK PAYLOAD:\n')[1]);
  const focusedRecords = focusedRiskPayload[0].daily_records_14d;
  const requestPrompt = buildOrsonRequestPrompt(focusedPackage.context, focusedPackage.userMessage);
  assert(focusedRiskPayload.length === 1, 'sends only the explicitly selected pond');
  assert(focusedRecords.length >= 3 && focusedRecords.length <= 5, 'sends only the latest three to five relevant records');
  assert(focusedRecords.at(-1).date === '2026-01-30', 'keeps the latest selected-pond record');
  assert(focusedRecords.every((record: { operational_notes?: string | null }) => !record.operational_notes || record.operational_notes.length <= 180), 'trims long operational notes');
  assert(estimateOrsonPromptTokens(requestPrompt) <= ORSON_PROMPT_TOKEN_BUDGET, 'enforces the Orson request token budget');

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

  const partialResponses: string[] = [];
  const streamed = await consumeOrsonCallableStream({
    callable: {
      stream: async () => ({
        stream: (async function* () {
          yield { type: 'text_delta' as const, text: 'Fast ' };
          yield { type: 'text_delta' as const, text: 'answer.' };
        })(),
        data: Promise.resolve({ text: 'Fast answer.' }),
      }),
    },
    request: {},
    timeoutMs: 100,
    onPartialResponse: (text) => partialResponses.push(text),
  });
  assert(streamed.text === 'Fast answer.', 'returns the final streamed response');
  assert(partialResponses.join('|') === 'Fast |Fast answer.', 'delivers accumulated partial responses');

  let calibrationLoads = 0;
  const companyId = `prompt-test-${Date.now()}`;
  const loadCalibration = async () => {
    calibrationLoads += 1;
    return null;
  };
  await loadCachedOrsonCalibration(companyId, loadCalibration, 1000);
  await loadCachedOrsonCalibration(companyId, loadCalibration, 1001);
  assert(calibrationLoads === 1, 'reuses calibration within the cache window');
};
