/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS regression test. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const loaded = { exports: {} };
new Function('module', 'exports', ts.transpileModule(
  fs.readFileSync(path.join(__dirname, 'samplingReportScope.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText)(loaded, loaded.exports);
const { filterSamplingReportPonds } = loaded.exports;
const cycles = [{ id: 'first', status: 'active' }, { id: 'second', status: 'active' }, { id: 'old', status: 'closed' }];
const ponds = [
  { id: 'a', cycleId: 'first' }, { id: 'b', cycleId: 'second' },
  { id: 'c', cycleId: 'old', cycleStatus: 'ended' },
  { id: 'd' }, { id: 'e', cycleId: 'first', cycleStatus: 'ended' },
];

test('active report includes ponds from every open cycle and legacy unassigned ponds', () => {
  assert.deepEqual(filterSamplingReportPonds(ponds, cycles, 'active').map(p => p.id), ['a', 'b', 'd']);
});
test('switching cycles isolates the report data, including completed ponds', () => {
  assert.deepEqual(filterSamplingReportPonds(ponds, cycles, 'second').map(p => p.id), ['b']);
  assert.deepEqual(filterSamplingReportPonds(ponds, cycles, 'old').map(p => p.id), ['c']);
  assert.deepEqual(filterSamplingReportPonds(ponds, cycles, 'first').map(p => p.id), ['a', 'e']);
  assert.deepEqual(filterSamplingReportPonds(ponds, cycles, 'missing'), []);
});
test('all cycles includes the entire available company history', () => {
  assert.deepEqual(filterSamplingReportPonds(ponds, cycles, 'all'), ponds);
});
