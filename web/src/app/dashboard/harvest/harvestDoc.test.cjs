/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS regression test. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
function load(file) {
  const loaded = { exports: {} };
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function('module', 'exports', 'require', compiled)(loaded, loaded.exports,
    name => load(path.resolve(path.dirname(file), name + '.ts')));
  return loaded.exports;
}
const { getHarvestDoc } = load(path.join(__dirname, 'harvestDoc.ts'));
test('harvest DOC uses the event date, including stocking day and farm timezone', () => {
  assert.equal(getHarvestDoc({ docStart: '2026-06-01' }, '2026-08-01'), 61);
  assert.equal(getHarvestDoc({ docStart: '2026-06-01' }, '2026-06-01'), 0);
  assert.equal(getHarvestDoc({ docStart: '2026-06-01' }, '2026-06-02T17:00:00Z', 'Asia/Jakarta'), 2);
});
test('midcycle DOC uses baseline age and date', () => {
  assert.equal(getHarvestDoc({ baselineDate: '2026-07-01', baselineDoc: 40 }, '2026-07-11'), 50);
});
test('missing or invalid age data stays unavailable instead of showing DOC zero', () => {
  for (const pond of [undefined, {}, { docStart: 'invalid' }]) {
    assert.equal(getHarvestDoc(pond, '2026-07-01'), null);
  }
  assert.equal(getHarvestDoc({ docStart: '2026-07-01' }, 'invalid'), null);
  assert.equal(getHarvestDoc({ docStart: '2026-07-01' }, '2026-06-01'), null);
});
