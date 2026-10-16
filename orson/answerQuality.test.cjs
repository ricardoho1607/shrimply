'use strict';
require('../scripts/register-typescript.cjs');
process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildOrsonAnalysis } = require('./pipeline.ts');
const { buildOrsonRequestPrompt, ORSON_PROMPT_TOKEN_BUDGET, estimateOrsonPromptTokens, buildOrsonSystemInstruction, cleanOrsonResponse } = require('./promptBuilder.ts');
const { getClaimLimits } = require('../functions/shared/orsonAnswerGrounding');
const { __test } = require('../functions/orson');
const cases = require('./fixtures/diagnosticEvaluation.cjs');
const oxygenCase = cases.find(c => c.id === '09');
const question = "Why did Test Pond's morning oxygen fall to 4.13 mg/L on September 4?";
const history = [
  { role: 'user', text: question },
  { role: 'model', text: 'The saved morning oxygen was 4.13 mg/L on September 4. The cause is not confirmed.' },
];
const makePonds = () => {
  const ponds = JSON.parse(JSON.stringify(oxygenCase.ponds));
  const other = JSON.parse(JSON.stringify(ponds[0]));
  other.id = 'other'; other.pondName = 'Other Pond';
  for (const record of other.samplings) if (Number.isFinite(record.doMorning)) record.doMorning = 7;
  return [...ponds, other];
};
const analyze = (message, turns = [], ponds = makePonds()) => buildOrsonAnalysis(ponds, message, new Date(oxygenCase.asOf), undefined, undefined, 'UTC', turns).promptPackage;
const request = pkg => buildOrsonRequestPrompt(pkg.context, pkg.userMessage);

test('large real pond context keeps dated oxygen, feed and fixed biomass evidence within the request budget', () => {
  const pkg = analyze(question);
  const prompt = request(pkg);
  const limits = getClaimLimits(prompt);
  assert.ok(estimateOrsonPromptTokens(prompt) <= ORSON_PROMPT_TOKEN_BUDGET);
  assert.equal(limits.ponds.length, 1);
  const pond = limits.ponds[0];
  assert.equal(pond.pond, 'Test Pond');
  assert.equal(pond.daily_records_14d.length, 14);
  assert.equal(pond.daily_records_14d.find(r => r.date === '2026-09-03').do_morning, 4.22);
  assert.equal(pond.daily_records_14d.find(r => r.date === '2026-09-04').do_morning, 4.13);
  assert.equal(pond.daily_records_14d.find(r => r.date === '2026-09-04').feed_kg, 113);
  const comparison = pond.diagnostic_context.comparisons.estimated_biomass;
  assert.equal(comparison.previous.value, 6000);
  assert.equal(comparison.current.value, 6000);
});

test('short follow-up keeps the named pond and oxygen facts despite a different pond', () => {
  const pkg = analyze('And what was it the day before?', history);
  assert.equal(pkg.questionFocus.route, 'farm_analysis');
  assert.equal(pkg.questionFocus.focusedPondId, 'test');
  assert.equal(pkg.questionFocus.requestedParameter, 'dissolved_oxygen');
  assert.equal(pkg.cacheKey, null);
  const limits = getClaimLimits(request(pkg));
  assert.equal(limits.focus.exact_record_lookup, true);
  assert.equal(limits.exactRecords.pond, 'Test Pond');
  assert.equal(limits.exactRecords.records.find(r => r.date === '2026-09-03').do_morning_mg_l, 4.22);
  assert.match(pkg.exactRecordAnswer, /2026-09-03.*4\.22.*mg\/L/);
});

test('a chain of short follow-ups stays on the original pond', () => {
  const turns = [...history, { role: 'user', text: 'And what was it the day before?' }, { role: 'model', text: 'It was 4.22 mg/L on September 3.' }];
  const pkg = analyze('Why?', turns);
  assert.equal(pkg.questionFocus.route, 'farm_analysis');
  assert.equal(pkg.questionFocus.focusedPondId, 'test');
  assert.equal(getClaimLimits(request(pkg)).ponds[0].pond, 'Test Pond');
});

test('a new general question does not become a pond follow-up', () => {
  const pkg = analyze('What is pH?', history);
  assert.equal(pkg.questionFocus.route, 'aquaculture_knowledge');
  assert.doesNotMatch(request(pkg), /ORSON RISK PAYLOAD:/);
});

test('a newly selected pond wins over the previous pond', () => {
  const pkg = analyze('How about Other Pond?', history);
  assert.equal(pkg.questionFocus.route, 'farm_analysis');
  assert.equal(pkg.questionFocus.focusedPondId, 'other');
  const limits = getClaimLimits(request(pkg));
  assert.equal(limits.ponds[0].pond, 'Other Pond');
  assert.equal(limits.ponds[0].daily_records_14d.at(-1).do_morning, 7);
});

test('an explicitly general follow-up does not expose pond records', () => {
  const pkg = analyze('In general, what happens to oxygen at night?', history);
  assert.equal(pkg.questionFocus.route, 'aquaculture_knowledge');
  assert.doesNotMatch(request(pkg), /ORSON RISK PAYLOAD:/);
  assert.doesNotMatch(request(pkg), /ORSON RECENT CONVERSATION:/);
});

test('a new general topic ends the older pond reference before another follow-up', () => {
  const turns = [...history, { role: 'user', text: 'What is pH?' }, { role: 'model', text: 'pH describes how acidic or alkaline water is.' }];
  const pkg = analyze('Why?', turns);
  assert.equal(pkg.questionFocus.route, 'aquaculture_knowledge');
  assert.equal(pkg.questionFocus.focusedPondId, null);
  assert.equal(pkg.questionFocus.requestedParameter, 'ph');
  assert.doesNotMatch(request(pkg), /ORSON RISK PAYLOAD:/);
});

test('a comparison with two named ponds does not silently select an older single pond', () => {
  const turns = [...history, { role: 'user', text: 'Compare Test Pond and Other Pond' }, { role: 'model', text: 'Their oxygen readings differ.' }];
  const pkg = analyze('Why?', turns);
  assert.equal(pkg.questionFocus.focusedPondId, null);
  const overview = JSON.parse(pkg.context.split('ORSON FARM OVERVIEW:\n')[1]);
  assert.deepEqual(overview.ponds.map(pond => pond.pond).sort(), ['Other Pond', 'Test Pond']);
  assert.match(request(pkg), /"summary_only":true/);
});

test('greetings and thanks do not pull in the previous pond analysis', () => {
  for (const message of ['Hello', 'Thanks!', 'Thank you']) {
    const pkg = analyze(message, history);
    assert.equal(pkg.questionFocus.route, 'aquaculture_knowledge');
    assert.equal(pkg.questionFocus.focusedPondId, null);
    assert.doesNotMatch(request(pkg), /ORSON RISK PAYLOAD:/);
  }
});

test('diagnostic focus highlights actual dated biomass estimates without inventing their direction', () => {
  for (const latestValue of [6000, 7000]) {
    const ponds = makePonds();
    ponds[0].samplings.find(r => r.date === '2026-09-04').estimatedBiomassKg = latestValue;
    const limits = getClaimLimits(request(analyze(question, [], ponds)));
    const entry = limits.focus.evidence_limits[0];
    assert.equal(entry.pond, 'Test Pond');
    assert.equal(entry.biomass_comparison.previous.value, 6000);
    assert.equal(entry.biomass_comparison.current.value, latestValue);
    assert.equal(entry.biomass_comparison.current.farm_date, '2026-09-04');
    assert.match(entry.interpretation, /Flat estimates do not support growing biomass/);
  }
});

test('feed-amount instructions require missing information before a firm amount, on client and server', () => {
  for (const instruction of [buildOrsonSystemInstruction(), __test.buildServerOrsonSystemInstruction('standard', 'chat', 'farm_analysis')]) {
    assert.match(instruction, /ask one short question before giving a firm feed amount/i);
    assert.match(instruction, /last logged allocation.*tomorrow.*limit/i);
    assert.match(instruction, /biomass.*survival.*tray/i);
    assert.match(instruction, /requirement also applies to broad daily advice/);
  }
});

test('ordinary daily advice carries the same missing-feed-evidence limit as an exact kg question', () => {
  for (const message of ['What should I do for Test Pond today?', 'How many kilograms of feed should I give Test Pond tomorrow?']) {
    const limits = getClaimLimits(request(analyze(message)));
    assert.equal(limits.focus.evidence_limits[0].numeric_feed_recommendation, 'unsupported_by_initial_records');
    assert.match(limits.focus.evidence_limits[0].feeding_limit, /Do not recommend a new kg amount, range or maximum/);
  }
});

test('routine and diagnostic prompts start short but preserve explicit requests for detail', () => {
  for (const mode of ['standard', 'pond_diagnostic']) {
    for (const instruction of [buildOrsonSystemInstruction(mode), __test.buildServerOrsonSystemInstruction(mode, 'chat', 'farm_analysis')]) {
      assert.match(instruction, /120 words/);
      assert.match(instruction, /180 words/);
      assert.match(instruction, /at most three.*next steps/i);
      assert.match(instruction, /explicitly requests.*detail/i);
      assert.doesNotMatch(instruction, /200-350 word executive summaries/);
    }
  }
});

test('displayed FCR replies use readable labels while preserving the values and dates', () => {
  for (const field of ['recordedFcr', 'recordedFCr', 'recorded_fcr', '`recordedFcr`']) {
    assert.equal(
      cleanOrsonResponse(`The logged ${field} changed from 1.2 to 2.0 on 2026-09-04.`),
      'The recorded FCR changed from 1.2 to 2.0 on 2026-09-04.',
    );
  }
  assert.equal(cleanOrsonResponse('The `fcrBasis` changed. FCR is 1.2.'), 'The FCR calculation method changed. FCR is 1.2.');
  assert.equal(cleanOrsonResponse('Product recordedFcrPlus is named by the user.'), 'Product recordedFcrPlus is named by the user.');
});

test('both client and server instructions require plain FCR wording rather than code field names', () => {
  for (const instruction of [buildOrsonSystemInstruction(), __test.buildServerOrsonSystemInstruction('standard', 'chat', 'farm_analysis')]) {
    assert.match(instruction, /Never show raw code field names/);
    assert.match(instruction, /say recorded FCR/);
    assert.match(instruction, /whole cycle versus last week/);
  }
});
