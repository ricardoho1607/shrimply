'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const { guardOrsonNitrogenAnswer, ORSON_NITROGEN_SAFETY_RULES } = require('./orsonNitrogenSafety');
const incident = 'Secara umum, tanda apa yang menunjukkan biomassa udang mulai mendekati kapasitas aman kolam, dan data apa yang harus diperiksa sebelum memutuskan panen parsial? Jangan menganalisis kolam tertentu.';
const review = fields => ({ finishReason: 'STOP', text: JSON.stringify({ safe_to_release: true, basis_conflated: false, has_numeric_guidance: false, ...fields }) });
const approved = async () => review({ has_numeric_guidance: true, guidance_basis_confirmed: true, guidance_context_and_source_verified: true });
const answer = text => ({ text, finishReason: 'STOP', sources: [{ title: 'source', uri: 'https://www.fao.org/4/AC210E/AC210E09.htm' }] });

test('the exact Indonesian capacity prompt cannot release NH3 <0.5 mg/L, even if a reviewer would approve', async () => {
  for (const text of ['Target praktis: NH3 <0.5 mg/L.', 'Target praktis: **NH₃** < 0,5 mg/L.', 'NH3-N 0.5 mg N/L is safe.']) {
    let calls = 0;
    const result = await guardOrsonNitrogenAnswer({ answer: answer(text), question: incident, generate: async () => { calls++; return approved(); } });
    assert.equal(calls, 0);
    assert.equal(result.nitrogenSafety, 'withheld');
    assert.doesNotMatch(result.text, /0[.,]5/);
    assert.match(result.text, /TAN berbeda dari NH3 dan NH3-N/);
    assert.match(result.text, /panen parsial/);
    assert.deepEqual(result.sources, []);
  }
});

for (const [analyte, question] of [
  ['TAN', 'TAN 1 mg/L; what precise corrective threshold should I use?'],
  ['NH3', 'My kit says ammonia/NH3 0.2 mg/L. What level is safe?'],
  ['NH3-N', 'Apakah NH3-N sama dengan TAN? Berapa batas koreksinya?'],
  ['NO2', 'Nitrit NO2 1 mg/L, basis alat tidak diketahui. Berapa batas aman?'],
  ['NO2-N', 'NO2-N or NO2? Unknown kit basis. Tell me an exact target.'],
]) {
  test(`${analyte}: an unknown analytical basis withholds numerical corrective guidance`, async () => {
    const result = await guardOrsonNitrogenAnswer({ question, answer: answer(`${analyte} below 1 mg/L is safe.`),
      generate: async options => {
        assert.match(options.systemInstruction, /analytical basis/);
        assert.match(options.systemInstruction, /pH, temperature and salinity/);
        assert.match(options.systemInstruction, /salinity\/chloride/);
        return review({ has_numeric_guidance: true, guidance_basis_confirmed: false, guidance_context_and_source_verified: true });
      },
    });
    assert.equal(result.nitrogenSafety, 'withheld');
    assert.doesNotMatch(result.text, /below 1/);
  });
}

test('conflated TAN/NH3-N and NO2/NO2-N, universal limits, and toxicity endpoints used as targets fail validation', async () => {
  for (const text of ['TAN and NH3-N mean the same thing.', '1 mg/L NO2-N equals 1 mg/L NO2.', 'NH3 0.1 mg/L is safe for every shrimp pond.', 'Use the lethal LC50 as your nitrite operating target.']) {
    const result = await guardOrsonNitrogenAnswer({ answer: answer(text), question: 'Explain water quality.',
      generate: async () => review({ safe_to_release: false, basis_conflated: true }) });
    assert.equal(result.nitrogenSafety, 'withheld');
  }
});

test('no precise thresholds are released without supporting sources, even if the reviewer claims verification', async () => {
  const result = await guardOrsonNitrogenAnswer({ answer: { text: 'TAN <1 mg N/L is safe.', sources: [] }, question: 'Explain nitrogen.', generate: approved });
  assert.equal(result.nitrogenSafety, 'withheld');
});

test('NH3 must not be called an ion, even if the semantic reviewer would pass it', async () => {
  const result = await guardOrsonNitrogenAnswer({ answer: answer('NH3 in mg NH3/L — unionized ammonia as the ion.'), question: 'Explain TAN.', generate: approved });
  assert.equal(result.nitrogenSafety, 'withheld');
});

test('conditional numerical toxicity claims also require confirmed basis, context and sources', async () => {
  const result = await guardOrsonNitrogenAnswer({ answer: { text: 'If the value is NH3, 0.5 mg/L causes gill stress, but your kit basis is unknown.', sources: [] },
    question: 'What does my ammonia result mean?', generate: async () => review({ has_numeric_guidance: true, guidance_basis_confirmed: false, guidance_context_and_source_verified: false }) });
  assert.equal(result.nitrogenSafety, 'withheld');
});

test('unavailable, malformed, incomplete or incomplete-schema validation never releases the draft', async () => {
  for (const generate of [async () => { throw new Error('timeout'); }, async () => ({ text: 'invalid', finishReason: 'STOP' }),
    async () => ({ text: '{}', finishReason: 'MAX_TOKENS' }), async () => ({ text: '{}', finishReason: 'STOP' }), async () => review({ has_numeric_guidance: true })]) {
    const result = await guardOrsonNitrogenAnswer({ answer: answer('Nitrite has a safe universal target.'), question: incident, generate });
    assert.equal(result.nitrogenSafety, 'withheld');
  }
});

test('educational distinctions, observed readings and explicitly rejected unsafe targets remain available', async () => {
  for (const text of ['TAN is NH3-N plus NH4-N; NH3-N is not TAN. Confirm the kit basis first.',
    'Recorded NH3-N was 0.02 mg N/L; this observation alone does not establish safety.',
    'NH3 <0.5 mg/L is not a safe universal target. Check the analyte basis, pH, temperature and salinity.',
    'NO2 = NO2-N × 46/14 on a mass basis; this is a unit conversion, not an operating target.']) {
    const result = await guardOrsonNitrogenAnswer({ answer: answer(text), question: 'Explain nitrogen.', generate: async () => review({}) });
    assert.equal(result.text, text);
    assert.equal(result.nitrogenSafety, 'passed');
  }
});

test('distinguishing NH3 from ammonium ion does not trigger hasAmmoniaIonError', async () => {
  for (const text of [
    'Unionized ammonia (NH3) is toxic, while ammonium is an ion.',
    'NH3 (amonia tak terionisasi) adalah bentuk racun, sedangkan NH4+ adalah ion amonium.',
    'Amonia tak terionisasi (NH3) sangat berbahaya bagi udang, sedangkan NH4+ adalah ion.',
  ]) {
    const result = await guardOrsonNitrogenAnswer({ answer: answer(text), question: 'Explain ammonia forms.', generate: async () => review({}) });
    assert.equal(result.text, text);
    assert.equal(result.nitrogenSafety, 'passed');
  }
});

test('general capacity advice without unsafe targets passes without being withheld', async () => {
  const safeAdvice = 'Secara umum, perhatikan tren DO pagi, respons pakan di anco, dan estimasi biomassa dari sampling sebelum memutuskan panen parsial.';
  const result = await guardOrsonNitrogenAnswer({ answer: answer(safeAdvice), question: incident, generate: () => { throw new Error('not needed'); } });
  assert.equal(result.text, safeAdvice);
  assert.equal(result.nitrogenSafety, 'not_applicable');
});

test('ordinary answers do not add a nitrogen model call', async () => {
  const result = await guardOrsonNitrogenAnswer({ answer: answer('Your recorded feed was 20 kg.'), question: 'Feed history?', generate: () => { throw new Error('not needed'); } });
  assert.equal(result.nitrogenSafety, 'not_applicable');
});

test('server applies shared policy and final nitrogen validation before streaming or caching on every route', () => {
  const policy = require('./orsonPromptPolicy').ORSON_EVIDENCE_PROMPT_RULES;
  assert.ok(ORSON_NITROGEN_SAFETY_RULES.every(rule => policy.includes(rule)));
  const source = fs.readFileSync(require.resolve('../orson'), 'utf8');
  const finalGuard = source.indexOf('generated = await guardOrsonNitrogenAnswer');
  assert.ok(finalGuard > source.indexOf('generated = verificationRequest ?'));
  assert.ok(finalGuard < source.indexOf('await callableResponse.sendChunk'));
  assert.match(source, /generated\.nitrogenSafety !== "withheld"/);
  const client = fs.readFileSync(require.resolve('../../orson/promptBuilder.ts'), 'utf8');
  assert.match(client, /orson_general_v5_/); // Invalidate answers cached before nitrogen validation.
});
