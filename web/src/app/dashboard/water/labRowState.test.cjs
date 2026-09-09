const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, 'labRowState.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const loadedModule = { exports: {} };
new Function('module', 'exports', 'require', compiled)(loadedModule, loadedModule.exports, require);
const { toggleUniqueLabPondRow } = loadedModule.exports;

test('selecting a pond creates exactly one result row', () => {
  const first = toggleUniqueLabPondRow([], [], 'pond-a', () => ({ pondId: 'pond-a' }));
  const replayed = toggleUniqueLabPondRow([], first.rows, 'pond-a', () => ({ pondId: 'pond-a' }));

  assert.deepEqual(first.selectedIds, ['pond-a']);
  assert.equal(replayed.rows.length, 1);
  assert.equal(replayed.rows[0].pondId, 'pond-a');
});

test('deselecting a pond removes every stale duplicate row', () => {
  const result = toggleUniqueLabPondRow(
    ['pond-a'],
    [{ pondId: 'pond-a' }, { pondId: 'pond-a' }],
    'pond-a',
    () => ({ pondId: 'pond-a' }),
  );

  assert.deepEqual(result.selectedIds, []);
  assert.deepEqual(result.rows, []);
});

test('compact manual inputs keep standard units and preserve reported bases', () => {
  const { getManualLabInputUnits } = loadedModule.exports;
  const { validateLabRow, canonicalLabValue } = require('../../../../../functions/shared/labMeasurementContract');
  const units = getManualLabInputUnits();
  assert.deepEqual(units.phosphate, { unit: 'mg/L', basis: 'PO4' });
  assert.equal(units.tom.basis, 'unspecified');
  assert.deepEqual(validateLabRow({ waterQuality: { tom: 50, phosphate: 0 }, measurementUnits: units }), []);
  assert.equal(canonicalLabValue({ waterQuality: { tom: 50 }, measurementUnits: units }, 'tom'), null);
  assert.deepEqual(getManualLabInputUnits({ phosphate: { unit: 'mg/L', basis: 'P' } }).phosphate, { unit: 'mg/L', basis: 'P' });
});
