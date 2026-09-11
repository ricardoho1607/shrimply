require('../scripts/register-typescript.cjs');

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildOrsonAnalysis } = require('./pipeline.ts');
const { buildOrsonRequestPrompt } = require('./promptBuilder.ts');

const now = new Date('2026-09-04T02:00:00Z');

const dailyRecord = (date, index, overrides = {}) => ({
  id: `daily-${date}`,
  date,
  mbw: 0,
  mortality: 0,
  feedData: { totalDailyFeed: 40 + index, feedingResponse: 'normal' },
  doMorning: 5.8 - (index * 0.05),
  doEvening: 6.4,
  phMorning: 7.8,
  phEvening: 8.1 + (index * 0.01),
  salinity: 19,
  ...overrides,
});

const pond = (name, samplings) => ({
  id: name.toLowerCase().replace(/\s+/g, '-'),
  pondName: name,
  cycleId: `${name}-cycle`,
  docStart: '2026-06-01',
  initialPopulation: 100000,
  initialWeight: 0.5,
  pondArea: 1000,
  samplings,
});

const riskPayload = (context) => JSON.parse(context.split('ORSON RISK PAYLOAD:\n')[1]);

test('daily history uses the previous 14 farm-calendar days and detailed requests keep the full available window', () => {
  const dates = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 7, 22 + index));
    return date.toISOString().slice(0, 10);
  });
  const result = buildOrsonAnalysis([
    pond('Calendar Pond', [
      dailyRecord('2026-06-10', -2),
      dailyRecord('2026-08-21', -1),
      ...dates.map((date, index) => dailyRecord(date, index)),
      dailyRecord('2026-09-05', 15),
    ]),
  ], 'Show the water quality history for Calendar Pond', now);

  assert.deepEqual(result.metrics[0].dailyRecords14d.map((record) => record.date), dates);
  const payload = riskPayload(result.promptPackage.context)[0];
  assert.equal(payload.daily_records_14d.length, 14);
  assert.equal(payload.history_coverage.window_start, '2026-08-22');
  assert.equal(payload.history_coverage.window_end, '2026-09-04');
});

test('pond diagnostics carry separate sampling history, dated comparisons, and data quality', () => {
  const result = buildOrsonAnalysis([
    pond('Evidence Pond', [
      { id: 's1', date: '2026-08-01', mbw: 7 },
      { id: 's2', date: '2026-08-12', mbw: 9.5 },
      { id: 's3', date: '2026-08-24', mbw: 12.5 },
      { id: 's4', date: '2026-09-03', mbw: 14.5 },
      dailyRecord('2026-08-29', 1),
      dailyRecord('2026-09-01', 2),
      dailyRecord('2026-09-04', 3),
    ]),
  ], 'Why did growth, feed, DO and pH change in Evidence Pond?', now);

  assert.equal(result.promptPackage.questionFocus.analysisMode, 'pond_diagnostic');
  const payload = riskPayload(result.promptPackage.context)[0];
  assert.equal(payload.diagnostic_context.schema_version, 1);
  assert.equal(payload.diagnostic_context.as_of_date, '2026-09-04');
  assert.deepEqual(
    payload.diagnostic_context.history.sampling.map((sample) => sample.farm_date),
    ['2026-08-01', '2026-08-12', '2026-08-24', '2026-09-03'],
  );
  assert.equal(payload.diagnostic_context.comparisons.adg_intervals.length, 3);
  assert.equal(payload.diagnostic_context.comparisons.morning_do.current.farm_date, '2026-09-04');
  assert.equal(payload.diagnostic_context.latest_growth_interval.start_date, '2026-08-24');
  assert.equal(payload.diagnostic_context.latest_growth_interval.end_date, '2026-09-03');
  assert.equal(payload.diagnostic_context.latest_growth_interval.actual_daily_feed_kg.recorded_days, 2);
  assert.ok(payload.diagnostic_context.signals.some((signal) => signal.type === 'ADG_DROP'));
  assert.ok(payload.diagnostic_context.signals.every((signal) => signal.interpretation === 'descriptive_change_only'));
  assert.ok(Array.isArray(payload.diagnostic_context.data_quality.missing));
});

test('focused diagnostics do not select knowledge from a different pond', () => {
  const target = pond('Target Pond', [
    { id: 'target-1', date: '2026-08-20', mbw: 8 },
    { id: 'target-2', date: '2026-09-03', mbw: 12 },
    dailyRecord('2026-09-04', 1, { doMorning: 6.2, doEvening: 6.8 }),
  ]);
  const unrelated = pond('Unrelated Pond', [
    { id: 'other-1', date: '2026-08-20', mbw: 8 },
    { id: 'other-2', date: '2026-09-03', mbw: 8.2 },
    dailyRecord('2026-09-04', 1, { doMorning: 3.2, doEvening: 3.8 }),
  ]);
  const result = buildOrsonAnalysis(
    [target, unrelated],
    'Why did growth change in Target Pond?',
    now,
  );

  const knowledgeText = result.promptPackage.context
    .split('ORSON SELECTED KNOWLEDGE:\n')[1]
    .split('\n\nORSON RISK PAYLOAD:')[0];
  assert.doesNotMatch(knowledgeText, /Low DO \+ high temperature|Low DO \+ high TAN/i);
});

test('future lab reports and treatments outside the active cycle stay out of diagnostic evidence', () => {
  const source = pond('Scope Pond', [{ id: 's1', date: '2026-09-03', mbw: 12 }]);
  source.latestLabStatus = {
    labReportId: 'future-lab', sampleDate: '2026-09-05', cycleId: 'Scope Pond-cycle', status: 'critical',
    mainIssue: 'FUTURE_LAB_SENTINEL',
    byType: { water: { labReportId: 'valid-lab', sampleDate: '2026-09-02', reportType: 'water_quality', status: 'good' } },
  };
  source.treatments = [
    { id: 'past-cycle', date: '2026-05-31', additiveName: 'OLD_CYCLE_SENTINEL' },
    { id: 'wrong-cycle', date: '2026-09-02', cycleId: 'old-cycle', additiveName: 'WRONG_CYCLE_SENTINEL' },
    { id: 'future', date: '2026-09-05', additiveName: 'FUTURE_TREATMENT_SENTINEL' },
    { id: 'valid', date: '2026-09-02', additiveName: 'Recorded treatment' },
  ];
  const result = buildOrsonAnalysis([source], 'Why did growth change in Scope Pond?', now);
  assert.deepEqual(result.metrics[0].recentLabReports.map(report => report.labReportId), ['valid-lab']);
  assert.doesNotMatch(result.promptPackage.context, /FUTURE_LAB_SENTINEL|OLD_CYCLE_SENTINEL|WRONG_CYCLE_SENTINEL|FUTURE_TREATMENT_SENTINEL/);
  assert.match(result.promptPackage.context, /Recorded treatment/);
});

test('prompt budgeting always preserves the complete current question', () => {
  const question = 'PLAN_QUESTION_MUST_SURVIVE';
  const request = buildOrsonRequestPrompt('X'.repeat(100000), question);

  assert.match(request, new RegExp(`USER QUESTION:\\n${question}$`));
  assert.ok(!request.includes('[Older or lower-priority context trimmed') || request.includes('[Lower-priority Orson context omitted'));
});

test('diagnostic evidence separates actual feed, sampling estimates, mortality observations, harvests, and lab units', () => {
  const source = pond('Source Pond', [
    { id: 'old-cycle', cycleId: 'old-cycle', date: '2026-08-28', mbw: 99 },
    { id: 'sample', cycleId: 'Source Pond-cycle', date: '2026-09-04', mbw: 12, mortality: 0, feed: 18 },
    { id: 'water', cycleId: 'Source Pond-cycle', date: '2026-09-04', mbw: 0, mortality: 0, feed: 0, doMorning: 5.2 },
    { id: 'feed', cycleId: 'Source Pond-cycle', date: '2026-09-04', mbw: 0, mortality: 0, feed: 0, feedData: { totalDailyFeed: 75 } },
    { id: 'mortality', cycleId: 'Source Pond-cycle', date: '2026-09-04', mortalityObservationType: 'observed_recovered', mortality: 3 },
    { id: 'harvest', cycleId: 'Source Pond-cycle', date: '2026-09-03', harvestData: { harvestType: 'partial', biomass: 100, size: 80 } },
  ]);
  source.latestLabStatus = {
    id: 'lab-1',
    reportType: 'water_quality',
    sampleDate: '2026-09-02',
    status: 'watch',
    metrics: {
      schemaVersion: 2,
      measurementSchemaVersion: 1,
      measurementUnits: { nitriteMgL: { unit: 'mg/L', basis: 'NO2' } },
      waterQuality: { date: '2026-09-02', nitriteMgL: 0.4 },
    },
  };

  const result = buildOrsonAnalysis([source], 'Why did feed and water change in Source Pond?', now);
  const payload = riskPayload(result.promptPackage.context)[0];
  const day = payload.daily_records_14d.find((record) => record.date === '2026-09-04');

  assert.equal(day.feed_kg, 75);
  assert.equal(day.actual_daily_feed_kg, 75);
  assert.equal(day.sampling_feed_estimate_kg, 18);
  assert.equal(day.mortality, undefined);
  assert.equal(day.mortality_observed_recovered, 3);
  assert.deepEqual(payload.diagnostic_context.history.sampling.map((sample) => sample.mbw_g), [12]);
  assert.deepEqual(payload.recent_harvests[0], {
    source_id: 'harvest', farm_date: '2026-09-03', harvest_type: 'partial', biomass_kg: 100, population: 8000,
  });
  assert.deepEqual(payload.recent_lab_reports[0].metrics.measurementUnits.nitriteMgL, { unit: 'mg/L', basis: 'NO2' });
});

test('measurements typed without a pond stay user-reported and do not absorb unrelated farm records', () => {
  const result = buildOrsonAnalysis([
    pond('Farm A', [dailyRecord('2026-09-04', 1, { doMorning: 3.1 })]),
    pond('Farm B', [dailyRecord('2026-09-04', 1, { doMorning: 6.1 })]),
  ], 'DOC 67, ADG is 0.22 and dawn DO is 4.0. What is happening?', now);

  assert.equal(result.promptPackage.questionFocus.containsUserReportedMeasurements, true);
  assert.match(result.promptPackage.context, /"user_question_measurements": "user_reported_unverified"/);
  assert.doesNotMatch(result.promptPackage.context, /ORSON RISK PAYLOAD|Farm A|Farm B/);
});

test('diagnostic follow-ups keep the previously named pond', () => {
  const result = buildOrsonAnalysis(
    [pond('Follow Pond', [dailyRecord('2026-09-04', 1)]), pond('Other Pond', [dailyRecord('2026-09-04', 1)])],
    'Why is that?',
    now,
    undefined,
    undefined,
    undefined,
    [{ role: 'user', text: 'Analyze Follow Pond' }, { role: 'model', text: 'The latest pond status is available.' }],
  );

  assert.equal(result.promptPackage.questionFocus.focusedPondName, 'Follow Pond');
  assert.equal(result.promptPackage.questionFocus.analysisMode, 'pond_diagnostic');
  assert.deepEqual(riskPayload(result.promptPackage.context).map((item) => item.pond), ['Follow Pond']);
});

test('short diagnostic phrases select diagnostic reasoning', () => {
  for (const question of ['Low ADG in Test Pond', 'High FCR in Test Pond', 'Unstable water in Test Pond', 'Growth slowed in Test Pond', 'Pond analysis for Test Pond']) {
    const result = buildOrsonAnalysis([pond('Test Pond', [])], question, now);
    assert.equal(result.promptPackage.questionFocus.analysisMode, 'pond_diagnostic', question);
  }
});

test('diagnostics preserve optional chemistry, sampling and feeding evidence with sources', () => {
  const result = buildOrsonAnalysis([pond('Test Pond', [
    { id: 's1', date: '2026-08-24', mbw: 10, estimatedPopulation: 90000, samplingMethod: 'cast net', survivalRate: 90 },
    { id: 'w1', date: '2026-08-25', alkalinity: 130, tanMgL: 0.4, nitriteMgL: 0.2 },
    { id: 'w2', date: '2026-09-03', alkalinity: 92, tanMgL: 0.8, nitriteMgL: 0.3, temperatureMorning: 28, temperatureEvening: 31 },
    { id: 'f1', date: '2026-09-03', feedData: { totalDailyFeed: 60, feedType: 'pellet', feedingFrequency: 4, feedingResponse: 'weak' } },
    { id: 's2', date: '2026-09-03', mbw: 12, estimatedPopulation: 89000, samplingMethod: 'cast net', survivalRate: 89 },
  ])], 'Why did growth slow in Test Pond?', now);
  const context = result.metrics[0].diagnosticContext;
  assert.equal(context.comparisons.alkalinity.absoluteChange, -38);
  assert.equal(context.history.sampling[0].estimatedBiomassKg, 900);
  assert.equal(context.history.sampling[0].samplingMethod, 'cast net');
  assert.equal(context.history.observations.find(r => r.sourceId === 'w2').tanMgL, 0.8);
  assert.equal(context.history.observations.find(r => r.sourceId === 'w2').ammoniaMgL, undefined);
  assert.equal(context.history.observations.find(r => r.sourceId === 'f1').feedingFrequency, 4);
  assert.match(result.promptPackage.context, /"alkalinity".*"absolute_change":-38/);
  assert.match(result.promptPackage.context, /"sampling_method":"cast net"/);
});

test('explicit multi-week requests keep a bounded extended daily history', () => {
  const records = Array.from({ length: 40 }, (_, i) => dailyRecord(new Date(Date.UTC(2026, 6, 27 + i)).toISOString().slice(0, 10), i));
  const result = buildOrsonAnalysis([pond('Test Pond', records)], 'Analyze the last 30 days in Test Pond', now);
  const diagnostic = riskPayload(result.promptPackage.context)[0].diagnostic_context;
  assert.equal(diagnostic.history.extended_daily.length, 30);
  assert.equal(diagnostic.history.extended_daily[0].date, '2026-08-06');
  assert.equal(diagnostic.history.extended_daily.at(-1).date, '2026-09-04');
  assert.equal(result.metrics[0].dailyRecords14d.length, 14);
});

test('user-reported changes are calculated without inventing a baseline', () => {
  const result = buildOrsonAnalysis([], 'ADG fell from 0.31 to 0.22. Dawn DO fell from 5.1 to 4.0. pH swing increased from 0.3 to 0.7. Alkalinity dropped to 92 mg/L. What is happening?', now);
  assert.equal(result.promptPackage.questionFocus.analysisMode, 'pond_diagnostic');
  assert.match(result.promptPackage.context, /"percent_change":-29/);
  assert.match(result.promptPackage.context, /"percent_change":-21.6/);
  assert.match(result.promptPackage.context, /"percent_change":133.3/);
  assert.doesNotMatch(result.promptPackage.context, /"metric":"alkalinity"/);
});

test('FCR comparisons reject unmatched calculation bases and biomass remains unavailable without historical estimates', () => {
  const result = buildOrsonAnalysis([pond('Test Pond', [
    { id: 's1', date: '2026-08-24', mbw: 10, fcr: 1.2, fcrBasis: 'cumulative' },
    { id: 's2', date: '2026-09-03', mbw: 12, fcr: 2, fcrBasis: 'weekly' },
  ])], 'Why is FCR increasing in Test Pond?', now);
  assert.equal(result.metrics[0].diagnosticContext.comparisons.recordedFcr, null);
  assert.equal(result.metrics[0].diagnosticContext.comparisons.estimatedBiomass, null);
});

test('recorded biomass history remains comparable without a same-day MBW sample', () => {
  const result = buildOrsonAnalysis([pond('Test Pond', [
    { id: 'b1', date: '2026-08-22', estimatedBiomassKg: 1200 },
    { id: 's1', date: '2026-08-24', mbw: 11.1 },
    { id: 's2', date: '2026-09-03', mbw: 13.3 },
    { id: 'b2', date: '2026-09-04', estimatedBiomassKg: 1200 },
    { id: 'future', date: '2026-09-05', estimatedBiomassKg: 9000 },
  ])], 'Why is FCR increasing in Test Pond?', now);
  const comparison = result.metrics[0].diagnosticContext.comparisons.estimatedBiomass;
  assert.ok(comparison, 'dated recorded biomass must not disappear because MBW is absent');
  assert.equal(comparison.previous.value, 1200);
  assert.equal(comparison.current.value, 1200);
  assert.equal(comparison.absoluteChange, 0);
  assert.deepEqual(comparison.current.sourceIds, ['b2']);
  assert.equal(riskPayload(result.promptPackage.context)[0].diagnostic_context.comparisons.estimated_biomass.absolute_change, 0);
});

test('feed index uses dated actual feeding and never turns missing feed into zero', () => {
  const source = pond('Test Pond', [dailyRecord('2026-09-04', 1)]);
  const current = buildOrsonAnalysis([source], 'Why did feed index change in Test Pond?', now);
  const index = current.metrics[0].diagnosticContext.feedIndex;
  assert.equal(index.value, Math.round(41 * 100000 / (index.doc * current.metrics[0].estimatedCurrentPopulation) * 1000) / 1000);
  assert.equal(riskPayload(current.promptPackage.context)[0].calculation_context.feed_index.farmDate, '2026-09-04');
  const missing = buildOrsonAnalysis([pond('Test Pond', [dailyRecord('2026-09-03', 1)])], 'Why did feed index change in Test Pond?', now);
  assert.equal(missing.metrics[0].diagnosticContext.feedIndex, null);
});

test('knowledge responds to measured trends when the question does not name the parameters', () => {
  const result = buildOrsonAnalysis([pond('Test Pond', [
    dailyRecord('2026-08-29', 1, { doMorning: 5.8, phMorning: 7.8, phEvening: 8 }),
    dailyRecord('2026-09-03', 2, { doMorning: 4.2, phMorning: 7.5, phEvening: 8.4 }),
  ])], 'What is happening in Test Pond?', now);
  const knowledge = JSON.parse(result.promptPackage.context.split('ORSON SELECTED KNOWLEDGE:\n')[1].split('\n\nORSON RISK PAYLOAD:')[0]);
  const ids = knowledge.parameter_guidance.map(k => k.id);
  for (const id of ['dissolved_oxygen', 'ph', 'alkalinity', 'plankton_transparency']) assert.ok(ids.includes(id), id);
});

test('unknown nitrite basis removes threshold guidance and adds an explicit data conflict', () => {
  const result = buildOrsonAnalysis([pond('Test Pond', [{ id: 'n1', date: '2026-09-03', nitriteMgL: 0.85 }])], 'Why is nitrite rising in Test Pond?', now);
  const knowledge = JSON.parse(result.promptPackage.context.split('ORSON SELECTED KNOWLEDGE:\n')[1].split('\n\nORSON RISK PAYLOAD:')[0]);
  const nitrite = knowledge.parameter_guidance.find(item => item.id === 'nitrite');
  assert.equal(nitrite.target, undefined);
  assert.equal(nitrite.warning, undefined);
  assert.equal(nitrite.critical, undefined);
  assert.match(result.metrics[0].diagnosticContext.dataQuality.conflicts.join(' '), /nitrite has an unverified/);
});

test('all handover knowledge topics are selectable and have attributable guidance', () => {
  for (const topic of ['temperature', 'FCR', 'feed index', 'biomass', 'carrying capacity', 'mortality', 'disease', 'N:P']) {
    const result = buildOrsonAnalysis([], `Explain ${topic} in shrimp farming in general`, now);
    assert.match(result.promptPackage.context, /"parameter_guidance":\[\{/);
    assert.match(result.promptPackage.context, /"source_ids":\["/);
  }
});

test('the 20 synthetic diagnostic contexts retain knowledge, pond evidence and the full question', () => {
  const { estimateOrsonPromptTokens, ORSON_PROMPT_TOKEN_BUDGET } = require('./promptBuilder.ts');
  for (const scenario of require('./fixtures/diagnosticEvaluation.cjs')) {
    const result = buildOrsonAnalysis(scenario.ponds, scenario.question, new Date(scenario.asOf));
    const pack = result.promptPackage;
    assert.notEqual(pack.questionFocus.analysisMode, 'standard', scenario.id);
    const request = buildOrsonRequestPrompt(pack.context, pack.userMessage);
    assert.ok(estimateOrsonPromptTokens(request) <= ORSON_PROMPT_TOKEN_BUDGET, scenario.id);
    assert.ok(request.includes(pack.userMessage), scenario.id);
    assert.match(request, /ORSON SELECTED KNOWLEDGE/, scenario.id);
    if (scenario.ponds.length) assert.match(request, /ORSON RISK PAYLOAD/, scenario.id);
  }
});
