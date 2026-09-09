'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const verification = require('./orsonProductVerification');
const { calculateMineralAddition, validateProduct } = verification;
const fetchPage = async () => 'Exact Mineral official product label evidence. Calcium: 25%. Maximum 0.1 kg/m3';
const verifyProducts = options => verification.verifyProducts({ fetchPage, ...options });
const buildVerifiedInventoryAnswer = options => verification.buildVerifiedInventoryAnswer({ fetchPage, ...options });
const product = { id: 'mineral', name: 'Exact Mineral', brand: 'Maker', current_stock: 12, unit: 'kg' };
const url = 'https://manufacturer.example/label';
const claim = { quote: 'Exact Mineral official product label evidence. Calcium: 25%. Maximum 0.1 kg/m3', source_type: 'manufacturer_label', url };
const evidence = { product_id: 'mineral', manufacturer: 'Maker', variant: 'Exact Mineral', identity: { ...claim, exact_match: true }, composition: claim, aquaculture_use: claim, element: 'calcium', element_mass_fraction: 0.25, soluble: true, unit: 'kg', max_single_application_kg_m3: 0.1 };
const result = data => ({ text: JSON.stringify(data), sources: [{ uri: url }], finishReason: 'STOP' });
const review = { products: [{ product_id: 'mineral', identity_passed: true, composition_passed: true, use_passed: true, strength_and_limit_passed: true }] };

test('citations alone cannot verify a product', () => {
  assert.equal(validateProduct({ product_id: 'mineral' }, product, new Set([url])), null);
  assert.equal(validateProduct(evidence, product, new Set()), null);
  assert.equal(validateProduct({ ...evidence, identity: { ...claim, exact_match: false } }, product, new Set([url])), null);
  assert.equal(validateProduct({ ...evidence, composition: { ...claim, source_type: 'retailer' } }, product, new Set([url])), null);
});
test('requires separate corroborating search and refuses an unconfirmed review', async () => {
  let calls = 0;
  const records = await verifyProducts({ products: [product], question: 'raise calcium', generate: async () => ++calls === 1 ? result({ products: [evidence] }) : result(review) });
  assert.equal(calls, 2);
  assert.equal(records[0].status, 'passed');
  const failed = await verifyProducts({ products: [product], question: 'raise calcium', generate: async () => result({ products: [evidence] }) });
  assert.equal(failed[0].status, 'failed');
});
test('search errors fail closed', async () => {
  const records = await verifyProducts({ products: [product], question: 'dose', generate: async () => { throw new Error('unsupported'); } });
  assert.equal(records[0].status, 'uncertain');
});
test('checked maths uses elemental strength and rejects unsafe or missing inputs', () => {
  const input = { analyte: 'calcium', basis: 'elemental_mg_L', volume_m3: 1000, current_mg_L: 100, target_mg_L: 110 };
  assert.deepEqual(calculateMineralAddition(input, evidence), { delta_mg_L: 10, active_kg: 10, product_kg: 40 });
  for (const patch of [{ volume_m3: null }, { target_mg_L: 90 }, { current_mg_L: '' }, { basis: 'CaCO3' }, { analyte: 'ammonia' }]) assert.equal(calculateMineralAddition({ ...input, ...patch }, evidence), null);
  for (const patch of [{ element_mass_fraction: 25 }, { soluble: false }, { unit: 'L' }, { max_single_application_kg_m3: 0.001 }]) assert.equal(calculateMineralAddition(input, { ...evidence, ...patch }), null);
});
test('cache expires and changed product labels invalidate verification', async () => {
  let saved;
  const cache = { get: async () => saved, set: async (_key, value) => { saved = value; } };
  let calls = 0;
  const generate = async () => ++calls % 2 ? result({ products: [evidence] }) : result(review);
  await verifyProducts({ products: [product], question: 'calcium', generate, cache, now: 1000 });
  await verifyProducts({ products: [product], question: 'calcium', generate, cache, now: 1001 });
  assert.equal(calls, 2);
  await verifyProducts({ products: [{ ...product, brand: 'Different' }], question: 'calcium', generate, cache, now: 1002 });
  assert.equal(calls, 4);
  await verifyProducts({ products: [product], question: 'calcium', generate, cache, now: 8 * 86400000 });
  assert.equal(calls, 6);
});
test('no unsafe model prose can escape the deterministic answer', async () => {
  const response = await buildVerifiedInventoryAnswer({ context: { products: [product], complete_inventory: true }, question: 'dose calcium', prompt: 'pond data missing', generate: async () => ({ text: 'Apply 999 kg now', sources: [{ uri: url }], finishReason: 'STOP' }) });
  assert.doesNotMatch(response.text, /999/);
  assert.match(response.text, /No application dose passed/);
});

test('complete evidence releases only the server-calculated amount', async () => {
  const input = { pond: 'Pond A', analyte: 'calcium', basis: 'elemental_mg_L', volume_m3: 1000, current_mg_L: 100, target_mg_L: 110,
    quotes: { pond: 'selected Pond A', volume_m3: 'volume 1000 m3', current_mg_L: 'current 100 mg/L', target_mg_L: 'target 110 mg/L' } };
  const selection = { pond_id: 'pond-a', analyte: 'calcium', target_mg_L: 110, target_quote: 'target 110 mg/L' };
  const responses = [result({ products: [evidence] }), result(review), result(selection), result({ ...review, calculation_inputs_passed: true, pond_selection_passed: true, target_passed: true, representative_depth_confirmed: true })];
  const answer = await buildVerifiedInventoryAnswer({ context: { products: [product], complete_inventory: true }, question: 'dose calcium', prompt: Object.values(input.quotes).join('; '), loadPondContext: async () => ({ ...input, source: 'server_firestore', pond_id: 'pond-a' }), generate: async () => responses.shift() });
  assert.equal(answer.groundingStatus, 'verified_calculation');
  assert.match(answer.text, /= 40 kg/);
  assert.match(answer.text, /Shortfall: 28 kg/);
});
test('invented pond inputs cannot release a calculation', async () => {
  const responses = [result({ products: [evidence] }), result(review), result({ pond: 'Pond A', volume_m3: 1000, current_mg_L: 100, target_mg_L: 110, quotes: {} })];
  const answer = await buildVerifiedInventoryAnswer({ context: { products: [product], complete_inventory: true }, question: 'dose calcium', prompt: 'No pond volume provided', generate: async () => responses.shift() });
  assert.equal(answer.groundingStatus, 'dose_withheld');
});
test('stock-only questions include feed stock without demanding dosing inputs', async () => {
  const answer = await buildVerifiedInventoryAnswer({ context: { products: [{ id: 'feed', name: 'Feed A', inventory_kind: 'feed', current_stock: 50, unit: 'kg' }], complete_inventory: true }, question: 'check my inventory', prompt: '', generate: async () => { throw new Error('unexpected'); } });
  assert.match(answer.text, /Feed A.*50 kg/);
  assert.doesNotMatch(answer.text, /Confirm the selected pond/);
});

test('client prompt measurements alone never unlock a dose even when every model review passes', async () => {
  const input = { pond: 'Pond A', analyte: 'calcium', basis: 'elemental_mg_L', volume_m3: 1000, current_mg_L: 100, target_mg_L: 110, quotes: { pond: 'selected Pond A', volume_m3: 'volume 1000 m3', current_mg_L: 'current 100 mg/L', target_mg_L: 'target 110 mg/L' } };
  const responses = [result({ products: [evidence] }), result(review), result(input), result({ ...review, calculation_inputs_passed: true })];
  const answer = await buildVerifiedInventoryAnswer({ context: { products: [product], complete_inventory: true }, question: 'dose calcium', prompt: Object.values(input.quotes).join('; '), generate: async () => responses.shift() });
  assert.equal(answer.groundingStatus, 'dose_withheld');
  assert.doesNotMatch(answer.text, /Checked theoretical addition/);
});
test('cached verification is rejected when source content changes or disappears', async () => {
  let saved;
  let calls = 0;
  const cache = { get: async () => saved, set: async (_key, record) => { saved = record; } };
  const generate = async () => ++calls % 2 ? result({ products: [evidence] }) : result(review);
  await verifyProducts({ products: [product], question: 'calcium', generate, cache });
  const records = await verifyProducts({ products: [product], question: 'calcium', generate, cache, fetchPage: async () => 'Revised label without that claim' });
  assert.equal(records[0].status, 'uncertain');
});
test('model-approved but mismatched numeric strength or limit cannot unlock dosing', () => {
  assert.equal(verification.labelSupportsNumericStrength(evidence), true);
  assert.equal(verification.labelSupportsNumericStrength({ ...evidence, element_mass_fraction: 0.5 }), false);
  assert.equal(verification.labelSupportsNumericStrength({ ...evidence, max_single_application_kg_m3: 10 }), false);
  assert.equal(verification.labelSupportsNumericStrength({ ...evidence, composition: { ...claim, quote: 'Calcium chloride: 25%' } }), false);
});
