/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const webRoot = path.join(__dirname, '..', '..');
const validationScript = path.join(webRoot, 'scripts', 'validate-public-env.cjs');

function runValidation(apiKey) {
  const env = { ...process.env };
  env.SHRIMPLY_SKIP_DOTENV = '1';
  if (apiKey === undefined) delete env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
  else env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY = apiKey;

  return spawnSync(process.execPath, [validationScript], {
    cwd: webRoot,
    env,
    encoding: 'utf8',
  });
}

test('production build rejects a missing Google Places browser key', () => {
  const result = runValidation(undefined);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /NEXT_PUBLIC_GOOGLE_PLACES_API_KEY/);
});

test('production build accepts a configured Google Places browser key', () => {
  const result = runValidation('test-google-places-key');

  assert.equal(result.status, 0, result.stderr);
});
