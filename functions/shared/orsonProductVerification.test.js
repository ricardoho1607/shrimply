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

test('product verification enforces bounded concurrency and request-local URL dedup', async () => {
  let activeProducts = 0;
  let maxActiveProducts = 0;
  let activePages = 0;
  let maxActivePages = 0;
  let pageFetchCount = 0;

  const testProducts = [
    { id: 'p1', name: 'Product 1', brand: 'Brand', current_stock: 10, unit: 'kg' },
    { id: 'p2', name: 'Product 2', brand: 'Brand', current_stock: 10, unit: 'kg' },
    { id: 'p3', name: 'Product 3', brand: 'Brand', current_stock: 10, unit: 'kg' },
    { id: 'p4', name: 'Product 4', brand: 'Brand', current_stock: 10, unit: 'kg' },
  ];

  const slowFetch = async (_u) => {
    pageFetchCount++;
    activePages++;
    if (activePages > maxActivePages) maxActivePages = activePages;
    await new Promise((r) => setTimeout(r, 20));
    activePages--;
    return 'Exact Mineral official product label evidence. Calcium: 25%. Maximum 0.1 kg/m3';
  };

  const slowGenerate = async ({ systemInstruction, prompt }) => {
    activeProducts++;
    if (activeProducts > maxActiveProducts) maxActiveProducts = activeProducts;
    await new Promise((r) => setTimeout(r, 15));
    activeProducts--;
    const parsedPrompt = JSON.parse(prompt);
    const prod = parsedPrompt.product || parsedPrompt.products?.[0];
    const pid = prod?.product_id || prod?.id || 'p1';
    if (systemInstruction.includes('research')) {
      return result({ products: [{ ...evidence, product_id: pid }] });
    }
    return result({ products: [{ product_id: pid, identity_passed: true, composition_passed: true, use_passed: true, strength_and_limit_passed: true }] });
  };

  const records = await verification.verifyProducts({
    products: testProducts,
    question: 'calcium mineral',
    generate: slowGenerate,
    fetchPage: slowFetch,
  });

  assert.equal(records.length, 4);
  assert.ok(maxActiveProducts <= 2, `Product concurrency must not exceed 2 (was ${maxActiveProducts})`);
  assert.ok(maxActivePages <= 3, `Page fetch concurrency must not exceed 3 (was ${maxActivePages})`);
  assert.equal(pageFetchCount, 1, `URL fetch dedup should fetch shared URL once (was ${pageFetchCount})`);
});

test('regression: realvalidpositive calculation and cache freshness', async () => {
  const store = new Map();
  const cache = {
    get: async (key) => store.get(key),
    set: async (key, val) => store.set(key, val),
  };

  const input = {
    pond: 'Pond A',
    analyte: 'calcium',
    basis: 'elemental_mg_L',
    volume_m3: 1000,
    current_mg_L: 100,
    target_mg_L: 110,
    quotes: {
      pond: 'selected Pond A',
      volume_m3: 'volume 1000 m3',
      current_mg_L: 'current 100 mg/L',
      target_mg_L: 'target 110 mg/L',
    },
  };
  const selection = { pond_id: 'pond-a', analyte: 'calcium', target_mg_L: 110, target_quote: 'target 110 mg/L' };

  let llmCalls = 0;
  const generate = async ({ systemInstruction }) => {
    llmCalls++;
    if (systemInstruction.includes('research')) return result({ products: [evidence] });
    if (systemInstruction.includes('Select only the pond')) return result(selection);
    if (systemInstruction.includes('Independently search')) {
      return result({
        ...review,
        calculation_inputs_passed: true,
        pond_selection_passed: true,
        target_passed: true,
        representative_depth_confirmed: true,
      });
    }
    return result(review);
  };

  // 1. Initial calculation: full verification and calculation succeeds, record is cached
  const answer1 = await buildVerifiedInventoryAnswer({
    context: { products: [product], complete_inventory: true },
    question: 'dose calcium',
    prompt: Object.values(input.quotes).join('; '),
    loadPondContext: async () => ({ ...input, source: 'server_firestore', pond_id: 'pond-a' }),
    generate,
    cache,
  });

  assert.equal(answer1.groundingStatus, 'verified_calculation');
  assert.match(answer1.text, /= 40 kg/);
  assert.equal(store.size, 1);
  const initialLlmCalls = llmCalls;

  // 2. Second calculation: cache hit! Verification reuses cached evidence and validates cache freshness
  const answer2 = await buildVerifiedInventoryAnswer({
    context: { products: [product], complete_inventory: true },
    question: 'dose calcium',
    prompt: Object.values(input.quotes).join('; '),
    loadPondContext: async () => ({ ...input, source: 'server_firestore', pond_id: 'pond-a' }),
    generate,
    cache,
  });

  assert.equal(answer2.groundingStatus, 'verified_calculation');
  assert.match(answer2.text, /= 40 kg/);
  // Product verification bypassed research and review LLM passes due to fresh cache
  assert.equal(llmCalls - initialLlmCalls, 2); // only selection and final calculation review

  // 3. Cache freshness failure: if cache is corrupted or invalidated, calculation must fail closed
  const key = Array.from(store.keys())[0];
  store.set(key, { ...store.get(key), status: 'failed' });

  const answer3 = await buildVerifiedInventoryAnswer({
    context: { products: [product], complete_inventory: true },
    question: 'dose calcium',
    prompt: Object.values(input.quotes).join('; '),
    loadPondContext: async () => ({ ...input, source: 'server_firestore', pond_id: 'pond-a' }),
    generate: async () => { throw new Error('should not calculate'); },
    cache,
  });

  assert.equal(answer3.groundingStatus, 'dose_withheld');
  assert.match(answer3.text, /No application dose passed verification/);
});

test('regression: 2product3pageoverlap and uniqueURLonce', async () => {
  const url1 = 'https://manufacturer.example/label-1';
  const url2 = 'https://manufacturer.example/label-2';
  const url3 = 'https://manufacturer.example/label-3';

  const claim1 = { quote: 'Product 1 calcium label details. Calcium: 20%. Maximum 0.1 kg/m3', source_type: 'manufacturer_label', url: url1 };
  const claim2 = { quote: 'Product shared label details. Calcium: 20%. Maximum 0.1 kg/m3', source_type: 'manufacturer_label', url: url2 };
  const claim3 = { quote: 'Product 2 calcium label details. Calcium: 20%. Maximum 0.1 kg/m3', source_type: 'manufacturer_label', url: url3 };

  const prod1 = { id: 'p1', name: 'Product 1', brand: 'Maker', current_stock: 10, unit: 'kg' };
  const prod2 = { id: 'p2', name: 'Product 2', brand: 'Maker', current_stock: 10, unit: 'kg' };

  // prod1 references url1 and url2; prod2 references url2 and url3.
  // url2 overlaps across both products!
  const ev1 = {
    product_id: 'p1', manufacturer: 'Maker', variant: 'Product 1',
    identity: { ...claim1, exact_match: true },
    composition: claim2,
    aquaculture_use: claim1,
    element: 'calcium', element_mass_fraction: 0.20, soluble: true, unit: 'kg', max_single_application_kg_m3: 0.1,
  };
  const ev2 = {
    product_id: 'p2', manufacturer: 'Maker', variant: 'Product 2',
    identity: { ...claim2, exact_match: true },
    composition: claim3,
    aquaculture_use: claim2,
    element: 'calcium', element_mass_fraction: 0.20, soluble: true, unit: 'kg', max_single_application_kg_m3: 0.1,
  };

  const fetchCalls = { [url1]: 0, [url2]: 0, [url3]: 0 };
  const customFetch = async (targetUrl) => {
    if (fetchCalls[targetUrl] !== undefined) fetchCalls[targetUrl]++;
    if (targetUrl === url1) return claim1.quote;
    if (targetUrl === url2) return claim2.quote;
    if (targetUrl === url3) return claim3.quote;
    throw new Error('unexpected URL');
  };

  const generate = async ({ prompt }) => {
    const parsed = JSON.parse(prompt);
    const p = parsed.product || parsed.products?.[0];
    const pid = p?.product_id || p?.id;
    const isP1 = pid === 'p1';
    const ev = isP1 ? ev1 : ev2;
    const sources = isP1 ? [{ uri: url1 }, { uri: url2 }] : [{ uri: url2 }, { uri: url3 }];
    if (prompt.includes('sourceSnapshots')) {
      return {
        text: JSON.stringify({
          products: [{ product_id: pid, identity_passed: true, composition_passed: true, use_passed: true, strength_and_limit_passed: true }],
        }),
        sources,
        finishReason: 'STOP',
      };
    }
    return {
      text: JSON.stringify({ products: [ev] }),
      sources,
      finishReason: 'STOP',
    };
  };

  const records = await verification.verifyProducts({
    products: [prod1, prod2],
    question: 'dose calcium',
    generate,
    fetchPage: customFetch,
  });

  assert.equal(records.length, 2);
  assert.equal(records[0].status, 'passed');
  assert.equal(records[1].status, 'passed');

  // Each of the 3 unique pages was fetched EXACTLY once across the entire verifyProducts call
  assert.equal(fetchCalls[url1], 1, `URL 1 fetched once (was ${fetchCalls[url1]})`);
  assert.equal(fetchCalls[url2], 1, `Overlapping URL 2 fetched once (was ${fetchCalls[url2]})`);
  assert.equal(fetchCalls[url3], 1, `URL 3 fetched once (was ${fetchCalls[url3]})`);
});

test('regression: activequeueddeadlineexternalSignal and latecompletion', async () => {
  const controller = new AbortController();

  let activeCount = 0;
  let maxActive = 0;
  let startedCount = 0;
  let settledCount = 0;

  const prods = [
    { id: 'item-1', name: 'Item 1', brand: 'Maker', current_stock: 10, unit: 'kg' },
    { id: 'item-2', name: 'Item 2', brand: 'Maker', current_stock: 10, unit: 'kg' },
    { id: 'item-3', name: 'Item 3', brand: 'Maker', current_stock: 10, unit: 'kg' },
    { id: 'item-4', name: 'Item 4', brand: 'Maker', current_stock: 10, unit: 'kg' },
  ];

  const slowGenerate = async ({ prompt }) => {
    startedCount++;
    activeCount++;
    if (activeCount > maxActive) maxActive = activeCount;

    // Trigger external abort while items 1 & 2 are active and items 3 & 4 are queued
    if (startedCount === 2) {
      setTimeout(() => controller.abort(), 10);
    }

    await new Promise(r => setTimeout(r, 40));
    activeCount--;
    settledCount++;

    const parsed = JSON.parse(prompt);
    const pid = parsed.product?.id || 'item-1';
    return result({ products: [{ ...evidence, product_id: pid }] });
  };

  const records = await verification.verifyProducts({
    products: prods,
    question: 'dose calcium',
    generate: slowGenerate,
    fetchPage,
    signal: controller.signal,
  });

  assert.equal(records.length, 4);
  // Queued items (3 & 4) must not have started
  assert.ok(startedCount <= 2, `Queued items must stop; started was ${startedCount}`);
  // Active concurrency never exceeded limit 2
  assert.ok(maxActive <= 2, `Active concurrency must not exceed 2 (was ${maxActive})`);
  // All records should be marked uncertain due to abort/deadline
  for (const rec of records) {
    assert.equal(rec.status, 'uncertain');
  }

  // Late completion check: verify that late settlement cannot release a dose
  const answer = await buildVerifiedInventoryAnswer({
    context: { products: prods, complete_inventory: true },
    question: 'dose calcium',
    prompt: 'pond volume 1000',
    signal: controller.signal,
    generate: slowGenerate,
    fetchPage,
  });
  assert.equal(answer.groundingStatus, 'dose_withheld');
  assert.match(answer.text, /No application dose passed verification/);
});
