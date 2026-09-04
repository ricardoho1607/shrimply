const test = require('node:test');
const assert = require('node:assert/strict');
const { createManualLabUnits, validateLabRow, canonicalLabValue, labMeasurementLabel, labMeasurementWarnings } = require('./labMeasurementContract');
const { extractLabMetrics } = require('../planktonOverwatchContext');

test('selected pond and DOC alone cannot create an empty lab report', () => {
  assert.ok(validateLabRow({ pondId: 'sim-a1', doc: 15 }).length > 0);
  assert.deepEqual(validateLabRow({ waterQuality: { nh4: 0 }, measurementUnits: createManualLabUnits() }), []);
});

test('units and bases survive JSON save/read-back and match the derived metrics', () => {
  const row = JSON.parse(JSON.stringify({ waterQuality: { nh4: 0.12, no2: 0, alkalinityTotal: 140, hardnessCa: 200 }, measurementUnits: createManualLabUnits() }));
  assert.deepEqual(validateLabRow(row), []);
  assert.equal(extractLabMetrics(row).waterQuality.nh4MgL, 0.12);
  assert.equal(extractLabMetrics(row).waterQuality.nitriteMgL, 0);
  assert.equal(extractLabMetrics(row).waterQuality.alkalinityMgL, 140);
  assert.match(labMeasurementLabel('hardnessCa', row.measurementUnits), /mg\/L as CaCO3/);
  assert.equal(canonicalLabValue(row, 'hardnessCa'), 200);
});

test('missing or different units/bases are not silently converted', () => {
  assert.ok(validateLabRow({ waterQuality: { nh4: 1 } }).length > 0);
  for (const metadata of [{ unit: 'mg/L', basis: 'N' }, { unit: 'µg/L', basis: 'NH4' }, { unit: 'ppm', basis: 'NH4' }]) {
    const row = { waterQuality: { nh4: 1 }, measurementUnits: { nh4: metadata } };
    assert.equal(canonicalLabValue(row, 'nh4'), null);
    assert.equal(row.waterQuality.nh4, 1);
    assert.equal(extractLabMetrics(row).waterQuality, null);
    assert.equal(labMeasurementWarnings(row).length, 1);
    assert.match(labMeasurementLabel('nh4', row.measurementUnits), new RegExp(metadata.basis));
  }
  assert.equal(canonicalLabValue({ waterQuality: { hardnessCa: 200 }, measurementUnits: { hardnessCa: { unit: 'mg/L', basis: 'Ca' } } }, 'hardnessCa'), null);
});

test('invalid measurements and methodless TOM require correction', () => {
  for (const value of [-1, Infinity, 'oops', Number.MAX_VALUE]) {
    assert.ok(validateLabRow({ waterQuality: { nh4: value }, measurementUnits: createManualLabUnits() }).length > 0);
  }
  assert.ok(validateLabRow({ waterQuality: { tom: 80 }, measurementUnits: createManualLabUnits() }).length > 0);
  assert.ok(validateLabRow({ plankton: { chlorophytaPercent: 101 } }).length > 0);
});
