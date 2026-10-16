'use strict';
require('../scripts/register-typescript.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const {buildOrsonAnalysis} = require('./pipeline.ts');
const {buildOrsonRequestPrompt, estimateOrsonPromptTokens, ORSON_PROMPT_TOKEN_BUDGET} = require('./promptBuilder.ts');
const base = require('./fixtures/diagnosticEvaluation.cjs').find(item => item.id === '09');
const farm = count => Array.from({length:count},(_,i) => {
  const p = structuredClone(base.ponds[0]); p.id = `p-${i}`; p.pondName = `Scale ${i+1}`;
  p.samplings.filter(r=>r.date==='2026-09-03' && typeof r.phMorning==='number').forEach(r=>{r.phMorning=7+i/1000;r.phEvening=8+i/1000;});
  return p;
});
const analyze = (ponds,question,history=[]) => buildOrsonAnalysis(ponds,question,new Date(base.asOf),null,undefined,'Asia/Jakarta',history).promptPackage;

for (const count of [10,100]) {
  test(`${count}-pond farm overview fits without pretending detailed histories are present`, () => {
    const p=analyze(farm(count),'How is my farm today?');
    const prompt=buildOrsonRequestPrompt(p.context,p.userMessage);
    assert.ok(estimateOrsonPromptTokens(prompt)<=ORSON_PROMPT_TOKEN_BUDGET);
    assert.match(p.context,new RegExp(`"active_pond_count":${count}`));
    assert.match(p.context,/summary_only/);
    assert.doesNotMatch(p.context,/"detailed_history_included":true/);
  });
  test(`${count}-pond dated pH lookup includes every requested pond with its own readings`, () => {
    const p=analyze(farm(count),'Show pH for all ponds yesterday.');
    assert.ok(p.exactRecordAnswer,'uses saved values without a model');
    for(let i=0;i<count;i++) assert.ok(p.exactRecordAnswer.includes(`Scale ${i+1} saved readings:\n- 2026-09-03: Morning pH: ${7+i/1000}; Evening pH: ${8+i/1000}`));
    assert.equal((p.exactRecordAnswer.match(/saved readings:/g)||[]).length,count);
  });
}

test('explicit multi-pond lookup overrides an older single-pond follow-up and includes only the requested ponds', () => {
  const p=analyze(farm(12),'Show morning pH for Scale 2 and Scale 12 yesterday.',[
    {role:'user',text:'What was oxygen in Scale 1 yesterday?'},{role:'model',text:'Recorded oxygen.'},
  ]);
  assert.match(p.exactRecordAnswer,/Scale 2 saved readings/); assert.match(p.exactRecordAnswer,/Scale 12 saved readings/);
  assert.doesNotMatch(p.exactRecordAnswer,/Scale 1 saved|Scale 3 saved|Evening pH/);
});

test('an all-pond lookup cannot silently reuse the previous pond', () => {
  const p=analyze(farm(12),'And show pH for all ponds yesterday.',[
    {role:'user',text:'What was oxygen in Scale 1 yesterday?'},{role:'model',text:'Recorded oxygen.'},
  ]);
  assert.equal((p.exactRecordAnswer?.match(/saved readings:/g)||[]).length,12);
});

test('multi-pond estimates and absent feed are never relabelled as recorded daily feed', () => {
  const ponds=farm(3);
  for(const [i,p] of ponds.entries()) p.samplings=p.samplings.filter(r=>r.date!=='2026-09-03');
  ponds[0].samplings.push({id:'zero',date:'2026-09-03',feedData:{totalDailyFeed:0}});
  ponds[1].samplings.push({id:'estimate',date:'2026-09-03',feed:20,mbw:13});
  const p=analyze(ponds,'Show recorded feed for all ponds yesterday.');
  assert.match(p.exactRecordAnswer,/Scale 1 saved readings:\n- 2026-09-03: Recorded feed: 0 kg/);
  assert.equal((p.exactRecordAnswer.match(/not recorded in the loaded records/g)||[]).length,2);
  assert.doesNotMatch(p.exactRecordAnswer,/20 kg/);
});

test('named multi-pond diagnostic fits as summaries with clear missing-history limits', () => {
  const p=analyze(farm(12),'Compare oxygen and growth in Scale 1 and Scale 12.');
  assert.ok(estimateOrsonPromptTokens(buildOrsonRequestPrompt(p.context,p.userMessage))<=ORSON_PROMPT_TOKEN_BUDGET);
  assert.match(p.context,/Scale 12/);assert.match(p.context,/summary_only/);
});

test('a damaged mortality entry is skipped without losing a valid observation', () => {
  const ponds=farm(1);
  ponds[0].mortalityRecords=[null,{}, {id:'recovered',date:'2026-09-03',observationType:'observed_recovered',count:3}];
  const p=analyze(ponds,'Why is oxygen low in Scale 1?');
  assert.match(p.context,/"mortality_observed_recovered":3/);
});

test('a comparison follow-up stays on the named pair when other ponds are present', () => {
  const p=analyze(farm(12),'Why?',[
    {role:'user',text:'Compare oxygen in Scale 2 and Scale 12.'},{role:'model',text:'Their saved readings differ.'},
  ]);
  const rows=JSON.parse(p.context.split('ORSON FARM OVERVIEW:\n')[1]).ponds;
  assert.deepEqual(rows.map(row=>row.pond).sort(),['Scale 12','Scale 2']);
});

test('an overview uses current report severity and keeps historical alerts separate', () => {
  const a=buildOrsonAnalysis(farm(2),'How is my farm today?',new Date('2026-09-15T02:00:00Z'),null,undefined,'Asia/Jakarta');
  const overview=JSON.parse(a.promptPackage.context.split('ORSON FARM OVERVIEW:\n')[1]);
  for(const row of overview.ponds) assert.equal(row.risk_level,a.reports.find(report=>report.pondName===row.pond).overallSeverity);
  assert.ok(overview.ponds.some(row=>row.findings.some(finding=>finding.historical)));
  assert.match(a.promptPackage.context,/Use a compact Markdown table/);
});

test('a rule warning cannot label possible consequences as confirmed observations', () => {
  const a=buildOrsonAnalysis(farm(1),'How is my farm today?',new Date(base.asOf),null,undefined,'Asia/Jakarta');
  const warning=a.reports[0].findings.find(f=>f.id==='cross_parameter_risk');
  assert.ok(warning);
  assert.match(warning.summary,/Possible consequences, not confirmed observations/);
});

test('reusing cached metrics later cannot keep expired measurements marked current', () => {
  const {analyzePondRisks}=require('./riskEngine.ts');
  const a=buildOrsonAnalysis(farm(1),'Why is oxygen low in Scale 1?',new Date(base.asOf),null,undefined,'Asia/Jakarta');
  const later=analyzePondRisks(a.metrics[0],new Date('2026-09-25T02:00:00Z'));
  assert.notEqual(later.overallSeverity,'critical');assert.notEqual(later.overallSeverity,'warning');
  assert.ok(later.findings.filter(f=>f.id!=='missing_data').every(f=>f.isHistorical || f.status==='historical'));
});

test('sorted risk reports stay attached to their own pond readings', () => {
  const ponds=farm(3);
  ponds.forEach((pond,index)=>pond.samplings.forEach(record=>{
    if(typeof record.doMorning==='number') {record.doMorning=[6,2.5,4.2][index];record.doEvening=[6.4,2.8,4.6][index];}
  }));
  const a=buildOrsonAnalysis(ponds,'How is my farm today?',new Date(base.asOf),null,undefined,'Asia/Jakarta');
  assert.notEqual(a.reports[0].pondId,a.metrics[0].pondId,'risk sorting differs from input order');
  const rows=JSON.parse(a.promptPackage.context.split('ORSON FARM OVERVIEW:\n')[1]).ponds;
  for(const row of rows) assert.equal(row.risk_level,a.reports.find(report=>report.pondName===row.pond).overallSeverity,row.pond);
  const single=analyze(ponds,'Why is oxygen low in Scale 1?');
  assert.doesNotMatch(single.context,/Latest DO minimum is 2\.5 mg\/L/);
});
