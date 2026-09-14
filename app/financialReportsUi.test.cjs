const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, 'financial-reports.tsx'), 'utf8');

test('mobile report choices and previews use text without report logos', () => {
  assert.doesNotMatch(source, /reportSelectorIcon/);
  assert.doesNotMatch(source, /selectedReport\.(icon|color)/);
  assert.doesNotMatch(source, /type\.(icon|color)/);
  assert.doesNotMatch(source, /name="(document-text|calculator|receipt|cash)" size=\{24\}/);
});
