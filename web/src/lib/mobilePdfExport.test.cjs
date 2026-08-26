const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, 'mobilePdfExport.ts'), 'utf8');

test('multi-page mobile reports are not constrained to one page height', () => {
  assert.match(source, /element\.style\.height = 'auto'/);
  assert.match(source, /height: \$\{pageHeight\}px !important/);
  assert.match(source, /width: pageWidth/);
  assert.match(source, /windowWidth: pageWidth/);
  assert.match(source, /pagebreak: \{ mode: \[\] \}/);
});

test('mobile PDF dimensions remain identical on web', () => {
  assert.match(source, /orientation === 'landscape' \? 792 : 612/);
  assert.match(source, /orientation === 'landscape' \? 612 : 792/);
});

test('web PDF rendering preserves source colours without JPEG conversion', () => {
  assert.match(source, /image: \{ type: 'png' \}/);
  assert.doesNotMatch(source, /image: \{ type: 'jpeg'/);
});

test('web PDF rendering uses high resolution for sharp small text', () => {
  assert.match(source, /scale: 3/);
});
