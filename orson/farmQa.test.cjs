require('../scripts/register-typescript.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildOrsonAnalysis } = require('./pipeline.ts');
const { inferOrsonConversationRoute } = require('./promptBuilder.ts');

const question = 'Secara umum, bagaimana saya tahu kapan pakan udang vaname boleh dinaikkan, dan kapan harus ditahan? Jelaskan dengan bahasa sederhana untuk petambak pemula. Ini pertanyaan umum, bukan analisis kolam tertentu.';
const pond = { id: 'sim-b1', pondName: 'SIM-B1', initialPopulation: 100000, initialWeight: 0.5, docStart: '2026-08-20', pondArea: 2650 };
const now = new Date('2026-09-04T02:00:00Z');

test('explicit general Indonesian questions override previous farm analysis', () => {
  for (const history of [[], [{ role: 'user', text: 'Analyze pond SIM-B1' }, { role: 'model', text: 'Private pond measurements' }]]) {
    assert.equal(inferOrsonConversationRoute(question, history), 'aquaculture_knowledge');
    const analysis = buildOrsonAnalysis([pond], question, now, undefined, undefined, undefined, history);
    assert.equal(analysis.promptPackage.questionFocus.route, 'aquaculture_knowledge');
    assert.ok(!analysis.promptPackage.context.includes('Private pond measurements'));
    assert.ok(!analysis.promptPackage.context.includes('ORSON FARM SCOPE:'));
  }
});

test('absent and estimated weights cannot establish zero growth', () => {
  for (const samplings of [[], [{ date: '2026-08-20', mbw: 0.5, isBaselineEstimate: true }], [{ date: '2026-09-04', mbw: 0, feed: 0, mortality: 0, doMorning: '6.1' }]]) {
    const analysis = buildOrsonAnalysis([{ ...pond, samplings }], 'Analyze my pond', now);
    assert.equal(analysis.metrics[0].adgGPerDay, null);
    assert.equal(analysis.metrics[0].smoothedAdgGPerDay, null);
    assert.ok(!analysis.reports[0].findings.some(f => f.id === 'slow_growth'));
  }
});

test('recovery DO does not revive an old heavy-rain warning', () => {
  const analysis = buildOrsonAnalysis([{ ...pond, samplings: [
    { id: 'rain', date: '2026-09-01', mbw: 0, doMorning: '4.0', weatherEvent: 'heavy_rain' },
    { id: 'recovery', date: '2026-09-04', mbw: 0, doMorning: '6.1', doEvening: '6.6' },
  ] }], 'Analyze my pond', now);
  assert.ok(!analysis.reports[0].findings.some(f => f.id === 'heavy_rain_low_do'));
});


test('generic questions retain their scope across languages and histories', () => {
  for (const text of ['In general, when should shrimp feed be increased?', 'What is nitrate in shrimp farming?', 'Secara umum, bagaimana menurunkan nitrat di tambak udang?']) {
    for (const history of [[], [{ role: 'user', text: 'Analyze pond SIM-B1' }]]) {
      const result = buildOrsonAnalysis([pond], text, now, undefined, undefined, undefined, history);
      assert.equal(result.promptPackage.questionFocus.route, 'aquaculture_knowledge');
      assert.ok(!result.promptPackage.context.includes('ORSON FARM SCOPE:'));
    }
  }
  for (const text of ['Analyze pond SIM-B1', 'Analisis kolam SIM-B1', 'Analyze my whole farm', 'Analisis semua kolam saya']) {
    assert.equal(buildOrsonAnalysis([pond], text, now).promptPackage.questionFocus.route, 'farm_analysis');
  }
});

test('one sample is a stocking comparison; two equal measurements establish zero growth', () => {
  const single = buildOrsonAnalysis([{ ...pond, samplings: [{ date: '2026-09-01', mbw: 0.5 }] }], 'Analyze my pond', now);
  assert.equal(single.metrics[0].adgGPerDay, 0);
  assert.equal(single.metrics[0].growthEvidence.adgSource, 'stocking_comparison');
  assert.ok(!single.reports[0].findings.some(f => f.id === 'slow_growth'));
  const repeated = buildOrsonAnalysis([{ ...pond, samplings: [{ date: '2026-09-01', mbw: 0.5 }, { date: '2026-09-04', mbw: 0.5 }] }], 'Analyze my pond', now);
  assert.equal(repeated.metrics[0].adgGPerDay, 0);
  assert.equal(repeated.metrics[0].growthEvidence.adgSource, 'measured');
  assert.ok(repeated.reports[0].findings.some(f => f.id === 'slow_growth'));
});
