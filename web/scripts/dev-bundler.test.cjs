const assert = require('node:assert/strict');
const test = require('node:test');

const { scripts } = require('../package.json');

test('local development uses the stable webpack bundler', () => {
  assert.match(scripts.dev, /(?:^|\s)next dev --webpack(?:\s|$)/);
});
