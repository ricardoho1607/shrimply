import { calculatePondMetrics } from './metrics';
import { normalizePondData } from './normalizePondData';
import { build72HourOutlook } from './outlook';
import {
  buildOrsonPromptPackage,
  buildOrsonRequestPrompt,
  cleanOrsonResponse,
  estimateOrsonPromptTokens,
  expandReferences,
  isFarmSpecificQuestion,
  ORSON_FALLBACK_RESPONSE,
  ORSON_PROMPT_TOKEN_BUDGET,
  selectCompleteContextSections,
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
  const generalFeedPackage = buildOrsonPromptPackage({
    userMessage: 'Secara umum, kapan kenaikan pakan harian sebaiknya ditahan meskipun udang tampak aktif, dan data apa yang perlu dikonfirmasi terlebih dahulu? Jangan menganalisis kolam tertentu atau memberi dosis perlakuan.',
    metrics: [metrics],
    reports: [report],
    outlooks: [outlook],
    conversationHistory: [
      { role: 'user', text: 'Apa perbedaan TAN, NH3, dan nitrit?' },
      { role: 'model', text: 'TAN, NH3, dan nitrit memiliki basis analit yang berbeda.' },
    ],
  });
  const fallbackAquaculturePackage = buildOrsonPromptPackage({
    userMessage: 'Secara umum, kapan kualitas dasar tambak perlu dievaluasi dan data apa yang perlu dikonfirmasi?',
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
  assert(buildOrsonPromptPackage({ userMessage: 'What is the best nitrate level?', metrics: [metrics], reports: [report], outlooks: [outlook] }).questionFocus.route === 'aquaculture_knowledge', 'keeps nitrate guidance in aquaculture scope');
  assert(buildOrsonPromptPackage({ userMessage: 'What is a safe nitrogen level in shrimp farming?', metrics: [metrics], reports: [report], outlooks: [outlook] }).questionFocus.route === 'aquaculture_knowledge', 'keeps generic nitrogen guidance in aquaculture scope');
  assert(buildOrsonPromptPackage({ userMessage: 'Take a look at my ponds. Which ponds are at risk?', metrics: [metrics], reports: [report], outlooks: [outlook] }).questionFocus.isComparison === true, 'recognizes plural pond comparisons');
  assert(isFarmSpecificQuestion('give me the last 7 days of mortality') === true, 'detects lookback question as farm-specific');
  assert(farmPackage.cacheKey === null, 'does not cache farm-specific answers by default');
  assert(generalPackage.cacheKey !== null, 'allows general answers to be cached');
  assert(generalPackage.questionFocus.route === 'aquaculture_knowledge', 'routes general aquaculture knowledge separately');
  assert(generalFeedPackage.questionFocus.route === 'aquaculture_knowledge', 'keeps general Indonesian feed management in aquaculture scope');
  assert(generalFeedPackage.questionFocus.intent === 'feed', 'recognizes Indonesian feed-management intent');
  assert(generalFeedPackage.context.includes('feed_control'), 'selects feed-control knowledge for Indonesian feed-management questions');
  assert(!generalFeedPackage.context.includes('ORSON RECENT CONVERSATION'), 'does not carry an earlier nitrogen topic into an explicit standalone general question');
  assert(fallbackAquaculturePackage.questionFocus.answerContract.primaryTopic === 'aquaculture_general', 'uses the general aquaculture fallback when a specific intent is not recognized');
  assert(fallbackAquaculturePackage.questionFocus.answerContract.routeConfidence === 'fallback', 'marks unrecognized aquaculture intent as low confidence');
  assert(fallbackAquaculturePackage.questionFocus.answerContract.requiredAspects.includes('conditions_or_timing'), 'retains when or timing obligations');
  assert(fallbackAquaculturePackage.questionFocus.answerContract.requiredAspects.includes('evidence_to_confirm'), 'retains requested evidence obligations');
  assert(fallbackAquaculturePackage.questionFocus.answerContract.needsFarmData === false, 'does not load farm data for a general fallback');
  assert(fallbackAquaculturePackage.context.includes('answer_contract'), 'sends the answer contract to Muse');
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
  assert(farmPackage.systemInstruction.includes('Give a numerical change only when'), 'makes numerical feed adjustments conditional on evidence');
  assert(farmPackage.systemInstruction.includes('reply in that same language'), 'keeps replies in the user question language');
  assert(farmPackage.context.includes('ORSON RISK PAYLOAD'), 'builds payload context');
  assert(farmPackage.context.includes('feed_pressure_ratio'), 'includes feed pressure');
  assert(farmPackage.context.includes('feed_allocation_trend'), 'includes recent feed allocation trend');
  assert(farmPackage.context.includes('daily_records_14d'), 'includes 14-day daily records in context payload');
  assert(farmRiskPayload[0].daily_records_14d.length > 5 && farmRiskPayload[0].daily_records_14d.length <= 14, 'keeps the available calendar window for diagnostic prompts');
  assert(historyRiskPayload[0].daily_records_14d.length > 5 && historyRiskPayload[0].daily_records_14d.length <= 14, 'keeps the available calendar window for explicit history questions');
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
  assert(farmPackage.systemInstruction.includes('Always use farm-local calendar dates'), 'instructs farm-local calendar dates');
  assert(farmPackage.systemInstruction.includes('Stale normal data is not current safety'), 'instructs stale data is not current safety');
  assert(farmPackage.systemInstruction.includes('Logged feed allocation is an operational distribution'), 'distinguishes allocation from appetite');
  assert(farmPackage.systemInstruction.includes('Explicit zero feed (0 kg) indicates feeding was halted or fasted'), 'preserves explicit zero feed rule');
  assert(farmPackage.systemInstruction.includes('A missing observation is strictly unknown'), 'enforces missing observations stay unknown');
  assert(farmPackage.systemInstruction.includes('Prompt context carries source IDs, measurement dates, precision, freshness, and per-metric coverage'), 'instructs evidence provenance');
  assert(farmPackage.context.includes('biomass_range_kg'), 'includes biomass range');
  assert(farmPackage.context.includes('calibration'), 'includes bounded company calibration context');
  assert(farmRiskPayload[0].evidence, 'includes evidence object in risk payload');
  assert(farmRiskPayload[0].evidence.as_of_date === '2026-01-16', 'evidence carries farm-local as_of_date');
  assert(farmRiskPayload[0].evidence.water.source_id !== undefined, 'evidence carries source ID for water');
  assert(farmRiskPayload[0].evidence.water.date === '2026-01-15', 'evidence carries measurement date');
  assert(typeof farmRiskPayload[0].evidence.water.age_days === 'number', 'evidence carries freshness age_days');
  assert(farmRiskPayload[0].evidence.water.is_fresh === true, 'evidence carries freshness flag');
  assert(farmRiskPayload[0].evidence.water.coverage.recorded_days > 0, 'evidence carries per-metric coverage');
  assert(farmRiskPayload[0].growth_evidence.sample_count !== undefined, 'growth_evidence carries sample_count');
  assert(farmRiskPayload[0].growth_evidence.adg_source !== undefined, 'growth_evidence carries adg_source');
  assert(farmRiskPayload[0].calculation_context.adg.age_days !== undefined, 'calculation_context.adg carries age_days');
  assert(farmRiskPayload[0].daily_records_14d[0].source_ids !== undefined, 'daily records carry source_ids');
  assert(farmRiskPayload[0].daily_records_14d[0].date !== undefined, 'daily records carry dates');
  assert(farmRiskPayload[0].daily_records_14d[0].ph_morning === undefined, 'missing analyte in daily record stays unknown');
  assert(estimateOrsonPromptTokens(farmPackage.context) < ORSON_PROMPT_TOKEN_BUDGET, 'keeps prompt context within its token budget');
  assert(cleanOrsonResponse('## **Risk**  \nUse aeration.') === 'Risk\nUse aeration.', 'cleans markdown-heavy responses');
  assert(cleanOrsonResponse('Weather: heavy_rain') === 'Weather: Heavy Rain', 'formats raw enum values for display');

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
  assert(focusedRecords.length === 14, 'sends the selected pond calendar window for a diagnostic question');
  assert(focusedRecords.at(-1).date === '2026-01-16', 'excludes future-dated selected-pond records');
  assert(focusedRecords.every((record: { operational_notes?: string | null }) => !record.operational_notes || record.operational_notes.length <= 180), 'trims long operational notes');
  assert(estimateOrsonPromptTokens(requestPrompt) <= ORSON_PROMPT_TOKEN_BUDGET, 'enforces the Orson request token budget');

  return {
    farmPackage,
    generalPackage,
    comparisonPackage,
  };
};

export const runPromptContextRecoverySelfTest = () => {
  // Test-only decoder: read local dictionary entries directly; do not call the production decoder.
  const decodePonds = (ponds: any[]): any[] => ponds.map((pond) => {
    const dictionary = pond.refs;
    const visit = (value: any): any => {
      if (!value || typeof value !== 'object') return value;
      if (Array.isArray(value)) return value.map(visit);
      if (dictionary && Object.keys(value).length === 1 && typeof value.$ref === 'string') {
        const id = value.$ref.slice('#/refs/'.length);
        assert(value.$ref === `#/refs/${id}` && Object.prototype.hasOwnProperty.call(dictionary, id), 'valid local test reference');
        return visit(dictionary[id]);
      }
      return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, visit(child)]));
    };
    return Object.fromEntries(Object.entries(pond).filter(([key]) => !dictionary || key !== 'refs').map(([key, value]) => [key, visit(value)]));
  });
  // 1. Fitting context identity and risk payload retention (with own complete fixtures)
  const fittingTestContext = [
    'ORSON QUESTION FOCUS:\n{"route":"farm_analysis"}',
    'ORSON RISK PAYLOAD:\n[{"pond":"Test Pond","biomass_kg":500}]',
  ].join('\n\n');
  assert(selectCompleteContextSections(fittingTestContext, ORSON_PROMPT_TOKEN_BUDGET) === fittingTestContext, 'preserves fitting prompts bytewise unchanged');
  const budgetedReqPrompt = buildOrsonRequestPrompt(fittingTestContext, 'How is the pond?');
  assert(budgetedReqPrompt.includes('ORSON RISK PAYLOAD:'), 'retains risk payload in budgeted prompt');

  // 2. Expanded references retain 14 daily records & oversized overflow check
  const overflowTestPond = { pond: 'Oversized', data: 'x'.repeat(60000) };
  let overflowThrew = false;
  try {
    selectCompleteContextSections(`ORSON RISK PAYLOAD:\n${JSON.stringify([overflowTestPond])}`, 100);
  } catch (err) {
    if (err instanceof Error && err.message.includes('Orson context budget exceeded')) {
      overflowThrew = true;
    }
  }
  assert(overflowThrew, 'fails explicitly on irreducible protected evidence overflow');

  // 3. Genuinely reducible repeated objects within same pond (220 entries of { id, details })
  const sharedLargeDetails = {
    source: 'authoritative-sensor-grid',
    model: 'pro-optical-do-ph-v3',
    calibration: {
      standard: 'iso-aquaculture-17025',
      certified_date: '2026-01-01',
      valid_until: '2027-01-01',
      tolerances: { ph: 0.05, do: 0.1, temp: 0.2, salinity: 0.5 },
    },
    metadata: {
      station: 'station-north-alpha',
      firmware: '4.12.0-rc3',
      operator: 'PT Central Aqua Tech',
      telemetry: { interval_seconds: 60, retry_limit: 5, encryption: 'tls-1.3' },
    },
    verified: true,
  };

  const testPondWithConflicts: any = {
    pond: 'Conflict Pond',
    daily_records_14d: [
      {
        date: '2026-01-16',
        measurement_provenance: {
          water: { sourceId: 'lab-single', sourceIds: ['lab-single'] },
          do: { sourceId: 'sensor-1', sourceIds: ['sensor-2'] },
          ph: { sourceId: 'meter-1', sourceIds: ['meter-1', 'meter-2'] },
          salinity: { sourceId: 'ref-1', source_id: 'ref-2' },
        },
      },
    ],
    repeated_provenance: Array.from({ length: 220 }, (_, i) => ({
      id: `prov-${i}`,
      details: sharedLargeDetails,
    })),
  };

  const rawConflictContext = `ORSON RISK PAYLOAD:\n${JSON.stringify([testPondWithConflicts])}`;
  assert(estimateOrsonPromptTokens(rawConflictContext) > 5000, 'uncompressed context exceeds 5000 token budget');
  const compactedConflictContext = selectCompleteContextSections(rawConflictContext, 5000);
  assert(estimateOrsonPromptTokens(compactedConflictContext) <= 5000, 'compacted context fits within 5000 token budget');

  const parsedConflictPond = decodePonds(JSON.parse(compactedConflictContext.split('ORSON RISK PAYLOAD:\n')[1].split('\n\n')[0]))[0];
  const prov = parsedConflictPond.daily_records_14d[0].measurement_provenance;
  assert(prov.water.sourceId === undefined, 'removes single matching sourceId alias');
  assert(prov.do.sourceId === 'sensor-1' && prov.do.sourceIds[0] === 'sensor-2', 'preserves non-equivalent sourceId and sourceIds');
  assert(prov.ph.sourceId === 'meter-1' && prov.ph.sourceIds.length === 2, 'preserves sourceId when multiple sourceIds exist');
  assert(prov.salinity.sourceId === 'ref-1' && prov.salinity.source_id === 'ref-2', 'preserves conflicting sourceId and source_id');
  assert(parsedConflictPond.repeated_provenance.length === 220, 'roundtrip retains all 220 repeated provenance records');
  assert(parsedConflictPond.repeated_provenance[0].details.source === 'authoritative-sensor-grid', 'roundtrip retains provenance details fields without loss');

  // Full independent decoded payload equals original (EXACT approved alias norm only)
  const expectedPond = JSON.parse(JSON.stringify(testPondWithConflicts));
  delete expectedPond.daily_records_14d[0].measurement_provenance.water.sourceId;
  assert(JSON.stringify(parsedConflictPond) === JSON.stringify(expectedPond), 'full independent decoded payload equals normalized original');

  // Separately keep irreducible literal padding overflow test
  let irreducibleOverflow = false;
  try {
    selectCompleteContextSections(`ORSON RISK PAYLOAD:\n${JSON.stringify([{ pond: 'Irreducible', dummy: 'x'.repeat(40000) }])}`, 5000);
  } catch (err) {
    if (err instanceof Error && err.message.includes('Orson context budget exceeded')) {
      irreducibleOverflow = true;
    }
  }
  assert(irreducibleOverflow, 'fails explicitly on irreducible literal padding overflow');

  // Verify UTF-8 strings and notes preserved without corruption
  const utf8Text = 'Pemeriksaan DO pagi 4.2 mg/L, suhu 29°C, pakan udang vannamei 🦐 normal. Anco bersih.';
  const utf8Context = `ORSON RISK PAYLOAD:\n${JSON.stringify([{ pond: 'Kolam-UTF8', notes: utf8Text }])}`;
  const utf8Prompt = buildOrsonRequestPrompt(utf8Context, 'Kondisi kolam?');
  assert(utf8Prompt.includes(utf8Text), 'preserves complete UTF-8 notes and multi-byte characters');

  // Protected ORSON RECENT CONVERSATION overflow throws explicit error before provider
  let convOverflow = false;
  try {
    const hugeConversationContext = [
      `ORSON RECENT CONVERSATION:\n${JSON.stringify(Array.from({ length: 50 }, (_, i) => ({ role: 'user', text: `Question ${i}: ${'q'.repeat(1000)}` })))}`,
      `ORSON RISK PAYLOAD:\n${JSON.stringify([{ pond: 'Pond-1', data: 'data'.repeat(2000) }])}`,
    ].join('\n\n');
    selectCompleteContextSections(hugeConversationContext, 200);
  } catch (err) {
    if (err instanceof Error && err.message.includes('Orson context budget exceeded')) {
      convOverflow = true;
    }
  }
  assert(convOverflow, 'fails explicitly when protected conversation cannot fit budget');

  // Verify reference interning uses refs and r1 format, genuinely reducible repeated objects within same pond, and proves nested ref roundtrip
  const repeatedObj = { source: 'lab-report-authoritative', precision: 2, unit: 'mg/L' };
  const nestedObj = { timestamp: '2026-01-16T00:00:00Z', details: repeatedObj, rating: 'authoritative' };
  const pondWithRepeats: any = {
    pond: 'Intern Test',
    metric1: repeatedObj,
    metric2: repeatedObj,
    metric3: repeatedObj,
    nested1: nestedObj,
    nested2: nestedObj,
    repeated_history: Array.from({ length: 80 }, (_, i) => ({
      sample_id: `sample-${i}`,
      observation: repeatedObj,
      nested: nestedObj,
    })),
  };
  const rawInternContext = `ORSON RISK PAYLOAD:\n${JSON.stringify([pondWithRepeats])}`;
  assert(estimateOrsonPromptTokens(rawInternContext) > 5000, 'uncompressed context exceeds 5000 token budget');
  const compSection = selectCompleteContextSections(rawInternContext, 5000);
  assert(estimateOrsonPromptTokens(compSection) <= 5000, 'compacted context fits within 5000 token budget');
  const internedPayload = JSON.parse(compSection.split('ORSON RISK PAYLOAD:\n')[1].split('\n\n')[0]);
  assert(internedPayload[0].refs !== undefined, 'uses refs property for interning');
  assert(internedPayload[0].refs.r1 !== undefined, 'uses r1 key format in refs');
  const expandedPond = decodePonds(internedPayload)[0];
  assert(expandedPond.metric1.source === 'lab-report-authoritative', 'expands refs correctly');
  assert(expandedPond.nested1.details.source === 'lab-report-authoritative', 'expands nested refs correctly');
  assert(expandedPond.repeated_history.length === 80, 'retains full history without loss');
  assert(expandedPond.repeated_history[0].nested.details.precision === 2, 'roundtrips nested refs with full fidelity');

  return { passed: true };
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
