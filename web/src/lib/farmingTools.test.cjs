const assert = require('node:assert/strict');
const { test } = require('node:test');
require('../../../scripts/register-typescript.cjs');
const { convertShrimpSize, standingBiomass, apparentFcr, harvestRevenue } = require('./farmingTools.ts');

test('size conversion works in both directions and preserves decimals', () => {
  assert.equal(convertShrimpSize(20), 50);
  assert.equal(convertShrimpSize('50'), 20);
  assert.equal(convertShrimpSize(12.5), 80);
});
test('biomass accounts for survival and partial harvests without double counting', () => {
  assert.equal(standingBiomass(100000, 80, 0, 20), 1600);
  assert.equal(standingBiomass(100000, 80, 10000, 20), 1400);
  assert.equal(standingBiomass(100000, 80, 80000, 20), 0);
  assert.equal(standingBiomass(100000, 0, 0, 20), 0);
  assert.equal(standingBiomass(100000, 80, 80001, 20), null);
  assert.equal(standingBiomass(100000, 101, 0, 20), null);
  assert.equal(standingBiomass(100000.5, 80, 0, 20), null);
  assert.equal(standingBiomass(100000, 80, 0.5, 20), null);
  assert.equal(standingBiomass(100000, 80, 0, 0), null);
});
test('apparent FCR includes harvested biomass and deducts starting biomass', () => {
  assert.ok(Math.abs(apparentFcr(2400, 1500, 500, 100) - 2400 / 1900) < 1e-12);
  assert.equal(apparentFcr(1500, 1000, 0, 0), 1.5);
  assert.equal(apparentFcr(1500, 100, 0, 100), null);
  assert.equal(apparentFcr(1500, 99, 0, 100), null);
  assert.equal(apparentFcr(0, 100, 0, 0), 0);
});
test('harvest revenue uses the entered price and allows a genuine zero', () => {
  assert.equal(harvestRevenue(1500, 60000), 90000000);
  assert.equal(harvestRevenue('1.5', '60000'), 90000);
  assert.equal(harvestRevenue(0, 60000), 0);
  assert.equal(harvestRevenue(1500, 0), 0);
});
test('missing, negative, nonfinite and malformed input never becomes a result', () => {
  for (const input of ['', ' ', '-1', -1, NaN, Infinity, 'abc', '0x20']) {
    assert.equal(convertShrimpSize(input), null);
    assert.equal(standingBiomass(input, 80, 0, 20), null);
    assert.equal(standingBiomass(100000, input, 0, 20), null);
    assert.equal(apparentFcr(input, 1000, 0, 0), null);
    assert.equal(harvestRevenue(1000, input), null);
  }
  assert.equal(convertShrimpSize(0), null);
});
test('overflow is rejected rather than displayed as infinity', () => {
  assert.equal(convertShrimpSize(1e-320), null);
  assert.equal(harvestRevenue(1e308, 1e308), null);
  assert.equal(apparentFcr(1e308, 1e-308, 0, 0), null);
  assert.equal(apparentFcr(1000, 1e308, 1e308, 0), null);
  assert.equal(standingBiomass(100000, 100, 0, 1e308), null);
});
