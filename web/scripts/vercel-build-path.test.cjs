const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));

test('production build only executes scripts included in the web deployment root', () => {
  assert.doesNotMatch(packageJson.scripts.prebuild, /\.\.\//);
  assert.match(packageJson.scripts.prebuild, /scripts\/validate-public-env\.cjs/);
});
