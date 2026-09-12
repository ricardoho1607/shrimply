'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, file);
const { buildOrsonCacheKey } = require('../../orson/promptBuilder.ts');
const { getOrsonRequestConstraints, isTreatmentQuestion, needsInventoryContext } = require('./orsonInventoryPolicy');

test('treatment answers never receive a client cache key', () => {
  for (const question of ['How much calcium should I add?', 'What should I use to increase calcium?', 'Berapa dosis kapur?', 'ใช้ปูนเท่าไหร่', '用多少石灰', 'Liều lượng vôi bao nhiêu?']) {
    assert.equal(buildOrsonCacheKey(question, []), null, question);
  }
});
test('treatment recognition includes quantity follow-ups and supported languages', () => {
  for (const question of ['How much should I add?', 'Can I use two bags?', 'Berapa dosis kapur?', 'ใช้ปูนเท่าไหร่', '用多少石灰', 'Liều lượng vôi bao nhiêu?']) assert.equal(isTreatmentQuestion(question), true, question);
});

const { classifyDosingRequest, guardModelDosingAnswer } = require('./orsonDosingSafety');
const model = data => ({ finishReason: 'STOP', text: JSON.stringify(data) });
test('normal chat and follow-ups never depend on a classifier model call', async () => {
  for (const question of ['hi', 'can you check if my pond is at risk', 'check again', 'And for pond B?', 'thanks', 'Apa kabar?', 'Tell me about our costs']) {
    assert.equal(await classifyDosingRequest({ question, prompt: 'context', generate: () => { throw new Error('No classifier needed'); } }), false);
  }
});
test('unsafe or unreviewed model doses cannot escape on a general route', async () => {
  const answer = { text: 'Apply two bags of lime', sources: [{ uri: 'https://example.com' }] };
  for (const generate of [async () => model({ contains_application_guidance: true, safe_to_release: false }), async () => { throw new Error('timeout'); }, async () => model({ safe_to_release: true })]) {
    const result = await guardModelDosingAnswer({ answer, question: 'what next?', generate });
    assert.doesNotMatch(result.text, /two bags/);
    assert.deepEqual(result.sources, []);
    assert.equal(result.doseSafety, 'withheld');
  }
});
test('ordinary measurements and historical feeding remain available', async () => {
  const answer = { text: 'Yesterday DO was 5 mg/L and feed was 20 kg.' };
  const result = await guardModelDosingAnswer({ answer, question: 'history', generate: async () => model({ contains_application_guidance: false, safe_to_release: true }) });
  assert.equal(result.text, answer.text);
});

test('plain pond-risk questions skip classification and inventory reads', async () => {
  const { needsInventoryContext } = require('./orsonInventoryPolicy');
  for (const question of ['can u check if there is potential issues on my ponds?', 'can you check if there are potential issues in my ponds?', 'check my ponds', 'analyze my ponds']) {
    assert.equal(await classifyDosingRequest({ question, prompt: '', generate: async () => { throw new Error('must not call model'); } }), false);
    assert.equal(needsInventoryContext('farm_analysis', question), false);
  }
  assert.equal(needsInventoryContext('inventory_product', 'what is in stock?'), true);
  assert.equal(needsInventoryContext('farm_analysis', 'How much lime should I add?'), true);
});
test('mixed analysis and dosing questions never take the analysis shortcut', async () => {
  assert.equal(await classifyDosingRequest({ question: 'check my ponds and tell me the dose of lime', prompt: '', generate: async () => { throw new Error('not needed'); } }), true);
});

test('explicit no-treatment instructions cannot divert general lab education into inventory dosing', async () => {
  const question = 'Secara umum, apa perbedaan TAN, NH3, NH4, dan nitrit pada tambak vaname, dan mengapa pH serta suhu penting saat membaca hasil lab? Jangan menganalisis kolam tertentu atau memberi dosis perlakuan.';
  const { inferOrsonConversationRoute, buildOrsonQuestionFocus } = require('../../orson/promptBuilder.ts');
  const constraints = getOrsonRequestConstraints(question);
  const focus = buildOrsonQuestionFocus(question, []);

  assert.equal(inferOrsonConversationRoute(question), 'aquaculture_knowledge');
  assert.equal(focus.route, 'aquaculture_knowledge');
  assert.equal(focus.suppressTreatmentAdvice, true);
  assert.equal(focus.suppressPondAnalysis, true);
  assert.deepEqual(constraints, { suppressTreatmentAdvice: true, suppressPondAnalysis: true });
  assert.equal(isTreatmentQuestion(question), false);
  assert.equal(await classifyDosingRequest({ question }), false);
  assert.equal(needsInventoryContext(focus.route, question), false);
});
