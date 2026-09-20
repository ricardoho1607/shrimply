const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const waterPage = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
const pondDetail = fs.readFileSync(path.join(__dirname, '../ponds/detail/PondDetailClient.tsx'), 'utf8');

test('water quality cards do not duplicate the pond detail plankton warning card', () => {
  assert.doesNotMatch(waterPage, /<PlanktonOverwatchCard\b/);
  assert.match(pondDetail, /<PlanktonOverwatchCard snapshot=\{pond\.latestPlanktonOverwatch\} \/>/);
});
