const assert = require('node:assert/strict');
const { readFeatureSource } = require('../../../../../scripts/read-feature-source.cjs');
const path = require('node:path');
const test = require('node:test');

const waterPage = readFeatureSource(path.join(__dirname, 'page.tsx'));
const pondDetail = readFeatureSource(path.join(__dirname, '../ponds/detail/PondDetailClient.tsx'));

test('water quality cards do not duplicate the pond detail plankton warning card', () => {
  assert.doesNotMatch(waterPage, /<PlanktonOverwatchCard\b/);
  assert.match(pondDetail, /<PlanktonOverwatchCard snapshot=\{pond\.latestPlanktonOverwatch\} \/>/);
});
