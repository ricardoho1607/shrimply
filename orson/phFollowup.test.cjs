'use strict';
require('../scripts/register-typescript.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const {buildOrsonAnalysis} = require('./pipeline.ts');
const {buildOrsonRequestPrompt, estimateOrsonPromptTokens, ORSON_PROMPT_TOKEN_BUDGET} = require('./promptBuilder.ts');
const fixture = require('./fixtures/diagnosticEvaluation.cjs').find(item => item.id === '09');
const ponds = Array.from({length:10}, (_,index) => {
  const pond = structuredClone(fixture.ponds[0]);
  if (index) { pond.id = `other-${index}`; pond.pondName = `Other ${index}`; }
  const record = pond.samplings.find(item => item.date === '2026-09-02' && typeof item.phMorning === 'number');
  record.phMorning = index ? 8.6 : 7.71;
  record.phEvening = index ? 8.9 : 8.23;
  return pond;
});
const history = [
  {role:'user',text:'What was morning oxygen in Test Pond yesterday?'},
  {role:'model',text:'2026-09-03: Morning oxygen: 4.22 mg/L'},
  {role:'user',text:'And what was it the day before?'},
  {role:'model',text:'2026-09-02: Morning oxygen: 4.31 mg/L'},
];
const analyze = (message, turns=history) => buildOrsonAnalysis(ponds,message,new Date(fixture.asOf),null,undefined,'Asia/Jakarta',turns).promptPackage;

test('a pH follow-up keeps the date reached by a day-before lookup and uses only saved pH', () => {
  const pkg = analyze('what about the ph');
  assert.equal(pkg.questionFocus.focusedPondId,'test');
  assert.deepEqual(pkg.questionFocus.requestedDates,['2026-09-02']);
  assert.deepEqual(pkg.questionFocus.requestedFields,['ph_morning','ph_evening']);
  assert.match(pkg.exactRecordAnswer,/2026-09-02: Morning pH: 7\.71; Evening pH: 8\.23/);
  assert.doesNotMatch(pkg.exactRecordAnswer,/oxygen|8\.6|8\.9|2026-09-03/);
  assert.doesNotMatch(pkg.context,/ORSON RISK PAYLOAD:/);
  const prompt = buildOrsonRequestPrompt(pkg.context,pkg.userMessage);
  assert.ok(estimateOrsonPromptTokens(prompt) <= ORSON_PROMPT_TOKEN_BUDGET);
});

test('retrying the pH follow-up after the reported error still resolves the original saved date', () => {
  const pkg = analyze('what about the ph',[...history,
    {role:'user',text:'what about the ph'},
    {role:'model',text:'Orson context budget exceeded: protected structured evidence and omission note cannot fit within token budget.'},
  ]);
  assert.deepEqual(pkg.questionFocus.requestedDates,['2026-09-02']);
  assert.match(pkg.exactRecordAnswer,/7\.71.*8\.23/);
});

test('an explicit new date and time win over the inherited reading', () => {
  const pkg = analyze('What about morning pH on 2026-09-03?');
  assert.deepEqual(pkg.questionFocus.requestedDates,['2026-09-03']);
  assert.match(pkg.exactRecordAnswer,/2026-09-03: Morning pH: 7\.8/);
  assert.doesNotMatch(pkg.exactRecordAnswer,/Evening|7\.71/);
});

test('a new general topic, diagnostic request, or different pond does not reuse the saved lookup', () => {
  for (const message of ['What is pH?','What about pH, is it safe?','What about pH in Other 1?','Why is pH dropping?','What about lowering pH?','How about adjusting pH?','What about pH on 2026-02-30?']) {
    assert.equal(analyze(message).exactRecordAnswer,null,message);
  }
  const pkg = analyze('what about the ph',[...history,{role:'user',text:'What is pH?'},{role:'model',text:'pH describes acidity.'}]);
  assert.equal(pkg.questionFocus.focusedPondId,null);
  assert.equal(pkg.exactRecordAnswer,null);
});

test('a missing or ambiguous previous lookup date is never guessed', () => {
  for (const text of ['What was oxygen in Test Pond?', 'Show oxygen in Test Pond on 2026-09-02 and 2026-09-03.']) {
    const pkg = analyze('what about the ph',[{role:'user',text},{role:'model',text:'2026-09-02: pH 7.71'}]);
    assert.deepEqual(pkg.questionFocus.requestedDates,[]);
    assert.equal(pkg.exactRecordAnswer,null);
  }
});
