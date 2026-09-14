const assert = require('node:assert/strict');
const test = require('node:test');
const config = require('../metro.config');

const isBlocked = (filePath) => config.resolver.blockList.some((pattern) => pattern.test(filePath));

test('Metro excludes private Midtrans environment files on both platforms', () => {
  for (const filePath of [
    '/farm/.env.midtrans.local',
    '/farm/.env.midtrans',
    'C:\\farm\\.env.midtrans.local',
  ]) {
    assert.equal(isBlocked(filePath), true, filePath);
  }
});

test('Metro preserves app source, normal Expo env watching and existing exclusions', () => {
  for (const filePath of ['/farm/app/index.tsx', '/farm/.env.local', '/farm/.env.development']) {
    assert.equal(isBlocked(filePath), false, filePath);
  }
  assert.equal(isBlocked('/farm/.expo/types'), true);
});
