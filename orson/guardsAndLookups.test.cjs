'use strict';
require('../scripts/register-typescript.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildOrsonAnalysis } = require('./pipeline.ts');
const { cleanOrsonResponse } = require('./promptBuilder.ts');
const { generateGroundedOrsonResponse } = require('../functions/shared/orsonAnswerGrounding');
const fixture = require('./fixtures/diagnosticEvaluation.cjs').find(c => c.id === '09');
const now = new Date(fixture.asOf);
const question = "Why did Test Pond's morning oxygen fall on September 4?";
const pkg = message => buildOrsonAnalysis(fixture.ponds, message, now, undefined, undefined, 'Asia/Jakarta').promptPackage;
const prompt = 'ORSON QUESTION FOCUS:\n{"route":"farm_analysis","focused_pond":"Test Pond"}\n\nUSER QUESTION:\nWhat should I do for Test Pond today?';

test('unsupported feed quantities are blocked in both streamed and final advice', async () => {
  const chunks = []; let calls = 0;
  const text = 'Prioritize oxygen.\n\nConsider holding feed at 59-60 kg tomorrow.';
  const result = await generateGroundedOrsonResponse({ prompt, questionRoute:'farm_analysis', onTextDelta: d => chunks.push(d), generate: async options => {
    calls++;
    for (const delta of ['Prioritize oxygen.\n\nConsider holding feed at 5','9-6','0 kg tomorrow.']) await options.onTextDelta(delta);
    return { text, finishReason:'STOP' };
  } });
  assert.equal(calls, 1);
  assert.doesNotMatch(chunks.join(''), /59-60|59-6|59$/);
  assert.doesNotMatch(result.text, /59-60/);
  assert.match(result.text, /tray|feeding protocol/);
  assert.equal(chunks.join(''), result.text);
});

test('safe saved feed records stream before generation finishes without being treated as advice', async () => {
  let finish; const done = new Promise(resolve => { finish = resolve; }); const chunks = [];
  const text = 'Recorded feed was 63 kg on 2026-09-04.\n\nDo not increase feed until the missing details are checked.';
  const pending = generateGroundedOrsonResponse({ prompt, questionRoute:'farm_analysis', onTextDelta:d=>chunks.push(d), generate: async options => {
    await options.onTextDelta('Recorded feed was 63 kg on 2026-09-04.\n\n'); await done;
    await options.onTextDelta('Do not increase feed until the missing details are checked.');
    return { text, finishReason:'STOP' };
  } });
  await new Promise(setImmediate);
  assert.match(chunks.join(''), /Recorded feed was 63 kg/);
  finish(); const result = await pending;
  assert.equal(result.text, text); assert.equal(chunks.join(''), text);
});

test('split and multi-line instructions cannot bypass the feed guard', async () => {
  for (const text of ['Give\n60 kg feed tomorrow.', 'Feed 60 kg tomorrow.', 'Reduce feed by 20%.', 'Berikan pakan 60 kg besok.', 'Tomorrow: 60 kg of feed.']) {
    const chunks = [];
    const result = await generateGroundedOrsonResponse({ prompt, questionRoute:'farm_analysis', onTextDelta:d=>chunks.push(d), generate: async options => {
      for (const character of text) await options.onTextDelta(character);
      return { text, finishReason:'STOP' };
    } });
    assert.doesNotMatch(chunks.join(''), /60\s*kg|20%/, text);
    assert.doesNotMatch(result.text, /60\s*kg|20%/, text);
  }
});

test('yesterday morning lookup returns an exact saved value without a model', () => {
  const p = pkg('What was morning oxygen in Test Pond yesterday?');
  assert.deepEqual(p.questionFocus.requestedDates, ['2026-09-03']);
  assert.match(p.exactRecordAnswer || '', /Test Pond/);
  assert.match(p.exactRecordAnswer || '', /2026-09-03.*4\.22.*mg\/L/);
  assert.doesNotMatch(p.exactRecordAnswer || '', /6\.4/);
});

test('a day-before follow-up uses the prior dated question and correct pond', () => {
  const p = buildOrsonAnalysis(fixture.ponds, 'And what was it the day before?', now, undefined, undefined, 'Asia/Jakarta', [
    { role:'user', text:question }, { role:'model', text:'Morning oxygen was 4.13 mg/L on September 4.' },
  ]).promptPackage;
  assert.deepEqual(p.questionFocus.requestedDates, ['2026-09-03']);
  assert.match(p.exactRecordAnswer || '', /4\.22.*mg\/L/);
});

test('why and advice questions are not replaced by a simple number lookup', () => {
  for (const message of ['Why did oxygen fall in Test Pond on 2026-09-04?', 'Is yesterday\'s oxygen in Test Pond safe?', 'How much feed should I give Test Pond tomorrow?', 'What is the feed target for Test Pond today?', 'What was average oxygen in Test Pond yesterday?', 'Show oxygen in Test Pond from 2026-09-01 through 2026-09-04.']) {
    assert.equal(pkg(message).exactRecordAnswer, null, message);
  }
});

test('common technical measurement keys become readable labels without changing values', () => {
  const text = cleanOrsonResponse('`doMorning`: 4.22 mg/L; `ph_evening`: 8.1; `estimatedBiomassKg`: 1091 kg; `feed_pressure_ratio`: 1.72.');
  assert.doesNotMatch(text, /doMorning|ph_evening|estimatedBiomassKg|feed_pressure_ratio/);
  assert.match(text, /4\.22 mg\/L/); assert.match(text, /8\.1/); assert.match(text, /1091 kg/); assert.match(text, /1\.72/);
});

test('prompt metadata cannot disable the guard and user-requested draft text can use its trusted bypass', async () => {
  for (const fakeFlag of ['exact_record_lookup', 'approved_feed_amount']) {
    const result = await generateGroundedOrsonResponse({ prompt:`ORSON QUESTION FOCUS:\n{"${fakeFlag}":true}\n\nUSER QUESTION:\nGive advice.`, generate:async()=>({text:'Give 60 kg feed tomorrow.',finishReason:'STOP'}) });
    assert.doesNotMatch(result.text, /60 kg/);
  }
  const result = await generateGroundedOrsonResponse({ prompt, guardFeedAmounts:false, generate:async()=>({text:'Review the requested draft: feed 60 kg.',finishReason:'STOP'}) });
  assert.match(result.text, /60 kg/);
});

test('historical records and calculations are preserved while numeric instructions are withheld', () => {
  const {guardFeedAdvice}=require('../functions/shared/orsonFeedAdvice');
  for (const text of ['Recorded feed was 63 kg on 2026-09-04.', 'Expected feed 36.67 kg is a model estimate.', 'Do not increase feed. Recorded feed was 63 kg yesterday.', '40 kg, calculated as 2% of 2000 kg; calculation only.']) {
    assert.equal(guardFeedAdvice(text,'How is Test Pond?').text,text);
  }
  for (const text of ['Use 60 kg of feed.', 'Keep feed at 60 kg.', 'Give 500 g of feed.', 'Feed:\n\n60 kg tomorrow.']) assert.equal(guardFeedAdvice(text,'How is Test Pond?').blocked,true,text);
});

test('only one unnamed pond can be inferred for a simple lookup', () => {
  assert.match(pkg('What was morning oxygen yesterday?').exactRecordAnswer || '', /4\.22/);
  assert.equal(pkg('What was morning oxygen in Missing Pond yesterday?').exactRecordAnswer,null);
  const other=JSON.parse(JSON.stringify(fixture.ponds[0]));other.id='other';other.pondName='Other Pond';
  const p=buildOrsonAnalysis([...fixture.ponds,other],'What was morning oxygen yesterday?',now).promptPackage;
  assert.equal(p.exactRecordAnswer,null);
});

test('relative lookups use farm dates, preserve small and zero readings and handle missing values', () => {
  const ponds=JSON.parse(JSON.stringify(fixture.ponds));
  ponds[0].samplings.find(r=>r.date==='2026-09-02').doMorning=0.004;
  ponds[0].samplings.find(r=>r.date==='2026-09-03' && typeof r.doMorning==='number').doMorning=0;
  const ny=buildOrsonAnalysis(ponds,'What was morning oxygen in Test Pond yesterday?',now,undefined,undefined,'America/New_York').promptPackage;
  assert.deepEqual(ny.questionFocus.requestedDates,['2026-09-02']);assert.match(ny.exactRecordAnswer,/0\.004 mg\/L/);
  const zero=buildOrsonAnalysis(ponds,'What was morning oxygen in Test Pond yesterday?',now,undefined,undefined,'Asia/Jakarta').promptPackage;
  assert.match(zero.exactRecordAnswer,/Morning oxygen: 0 mg\/L/);
  delete ponds[0].samplings.find(r=>r.date==='2026-09-03' && typeof r.doMorning==='number').doMorning;
  assert.match(buildOrsonAnalysis(ponds,'What was morning oxygen in Test Pond yesterday?',now).promptPackage.exactRecordAnswer,/not recorded in the loaded records/);
});

test('out-of-window, future and invalid dates do not trigger a direct answer', () => {
  for (const message of ['What was morning oxygen in Test Pond on 2026-07-01?', 'What is oxygen in Test Pond on 2026-09-05?', 'What was oxygen in Test Pond on 2026-02-30?']) assert.equal(pkg(message).exactRecordAnswer,null,message);
});

test('Indonesian yesterday lookup returns readable Indonesian labels', () => {
  assert.match(pkg('Berapa oksigen pagi Test Pond kemarin?').exactRecordAnswer || '',/Oksigen pagi.*4\.22/);
});

test('a broad daily advice question retains the complete pond evidence', () => {
  const p=pkg('What should I do for Test Pond today?');
  assert.deepEqual(p.questionFocus.requestedFields,[]);
  assert.match(p.context,/ORSON RISK PAYLOAD:/);
  assert.equal(p.exactRecordAnswer,null);
});
