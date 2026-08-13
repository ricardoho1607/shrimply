const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, 'Cursor.tsx'), 'utf8');

test('landing pages preserve the native browser cursor', () => {
  assert.doesNotMatch(source, /cursor:\s*none/);
  assert.doesNotMatch(source, /createElement\(['"]style['"]\)/);
  assert.doesNotMatch(source, /id=["']cursor(?:-ring)?["']/);
  assert.match(source, /return null;/);
});
