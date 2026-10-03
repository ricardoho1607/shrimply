const { test } = require('node:test');
const assert = require('node:assert/strict');
require('../scripts/register-typescript.cjs');

const { normalizePondData } = require('./normalizePondData.ts');

test('false and zero survive in normalized records and diagnosticMeasurements', () => {
  const pond = {
    id: 'pond-zero-obs',
    pondName: 'Observation Pond',
    asOfDate: '2026-09-02',
    samplings: [
      {
        id: 'obs-day-1',
        date: '2026-09-01',
        surfaceScum: false,
        nitriteMgL: 0,
        nitriteBasis: 'NO2',
        waterDepthCmMorning: 0,
        waterExchangePercent: 0,
        shrimpBehaviour: 'normal',
      },
    ],
  };

  const normalized = normalizePondData(pond, { timeZone: 'UTC' });
  assert.equal(normalized.records.length, 1);
  const rec = normalized.records[0];

  // False and zero survive on the record
  assert.equal(rec.surfaceScum, false, 'surfaceScum: false must survive as boolean false');
  assert.equal(rec.nitriteMgL, 0, 'nitriteMgL: 0 must survive as numeric 0');
  assert.equal(rec.nitriteBasis, 'NO2', 'nitriteBasis: NO2 must be retained');
  assert.equal(rec.waterDepthCmMorning, 0, 'waterDepthCmMorning: 0 must survive as numeric 0');
  assert.equal(rec.waterDepthCm, 0, 'waterDepthCm: 0 must survive');
  assert.equal(rec.waterDepthCmEvening, null, 'omitted waterDepthCmEvening must be null');
  assert.equal(rec.waterExchangePercent, 0, 'waterExchangePercent: 0 must survive as numeric 0');
  assert.equal(rec.shrimpBehaviour, 'normal');

  // False and zero survive in diagnosticMeasurements
  assert.equal(rec.diagnosticMeasurements?.surfaceScum, false);
  assert.equal(rec.diagnosticMeasurements?.nitriteMgL, 0);
  assert.equal(rec.diagnosticMeasurements?.nitriteBasis, 'NO2');
  assert.equal(rec.diagnosticMeasurements?.waterDepthCmMorning, 0);
  assert.equal(rec.diagnosticMeasurements?.waterDepthCm, 0);
  assert.equal(rec.diagnosticMeasurements?.waterExchangePercent, 0);

  // Kinds classification: recognized as water_quality observation
  assert.ok(rec.kinds.includes('water_quality'), 'zero observations must still classify as water_quality');
});

test('basis and session depth survive with strict session isolation', () => {
  const pond = {
    id: 'pond-session-depth',
    pondName: 'Session Depth Pond',
    asOfDate: '2026-09-03',
    samplings: [
      // Morning-only observation
      {
        id: 'obs-morning',
        date: '2026-09-01',
        waterDepthCmMorning: 105,
        nitriteMgL: 0.2,
        nitriteBasis: 'NO2',
      },
      // Evening-only observation (with generic fallback field)
      {
        id: 'obs-evening',
        date: '2026-09-02',
        waterDepthCmEvening: 112,
        waterDepthCm: 112,
        nitriteMgL: 0.15,
        nitriteBasis: 'NO2',
      },
      // Both sessions observation
      {
        id: 'obs-both',
        date: '2026-09-03',
        waterDepthCmMorning: 108,
        waterDepthCmEvening: 115,
      },
    ],
  };

  const normalized = normalizePondData(pond, { timeZone: 'UTC' });
  const [morningRec, eveningRec, bothRec] = normalized.records;

  // Morning record retains morning session, evening remains null
  assert.equal(morningRec.waterDepthCmMorning, 105);
  assert.equal(morningRec.waterDepthCmEvening, null);
  assert.equal(morningRec.waterDepthCm, 105);
  assert.equal(morningRec.nitriteMgL, 0.2);
  assert.equal(morningRec.nitriteBasis, 'NO2');

  // Evening record retains evening session; evening depth DOES NOT leak into morning depth
  assert.equal(eveningRec.waterDepthCmMorning, null, 'evening depth must not leak into morningDepth');
  assert.equal(eveningRec.waterDepthCmEvening, 112);
  assert.equal(eveningRec.waterDepthCm, 112);

  // Both record retains both morning and evening sessions
  assert.equal(bothRec.waterDepthCmMorning, 108);
  assert.equal(bothRec.waterDepthCmEvening, 115);
  assert.equal(bothRec.waterDepthCm, 108);
});

test('missing observations remain unknown and are not coerced to 0 or false', () => {
  const pond = {
    id: 'pond-missing-obs',
    pondName: 'Missing Obs Pond',
    asOfDate: '2026-09-02',
    samplings: [
      {
        id: 'obs-missing',
        date: '2026-09-01',
        phMorning: 7.9,
      },
    ],
  };

  const normalized = normalizePondData(pond, { timeZone: 'UTC' });
  const rec = normalized.records[0];

  // Missing values stay null (unknown)
  assert.equal(rec.surfaceScum, null, 'missing surfaceScum must stay null');
  assert.equal(rec.nitriteMgL, null, 'missing nitriteMgL must stay null');
  assert.equal(rec.nitriteBasis, null, 'missing nitriteBasis must stay null');
  assert.equal(rec.waterDepthCmMorning, null, 'missing waterDepthCmMorning must stay null');
  assert.equal(rec.waterDepthCmEvening, null, 'missing waterDepthCmEvening must stay null');
  assert.equal(rec.waterDepthCm, null, 'missing waterDepthCm must stay null');
  assert.equal(rec.waterExchangePercent, null, 'missing waterExchangePercent must stay null');
  assert.equal(rec.shrimpBehaviour, null, 'missing shrimpBehaviour must stay null');

  // DiagnosticMeasurements does not contain keys for missing values
  assert.equal(rec.diagnosticMeasurements?.surfaceScum, undefined);
  assert.equal(rec.diagnosticMeasurements?.nitriteMgL, undefined);
  assert.equal(rec.diagnosticMeasurements?.waterDepthCmMorning, undefined);
  assert.equal(rec.diagnosticMeasurements?.waterDepthCmEvening, undefined);
  assert.equal(rec.diagnosticMeasurements?.waterDepthCm, undefined);
  assert.equal(rec.diagnosticMeasurements?.waterExchangePercent, undefined);
  assert.equal(rec.diagnosticMeasurements?.shrimpBehaviour, undefined);
});

test('abnormal behaviour remains an observation and not a diagnosis', () => {
  const pond = {
    id: 'pond-abnormal-behaviour',
    pondName: 'Behaviour Pond',
    asOfDate: '2026-09-02',
    samplings: [
      {
        id: 'obs-abnormal',
        date: '2026-09-01',
        shrimpBehaviour: 'abnormal',
        surfaceScum: false,
      },
    ],
  };

  const normalized = normalizePondData(pond, { timeZone: 'UTC' });
  const rec = normalized.records[0];

  // Stored strictly as observation 'abnormal'
  assert.equal(rec.shrimpBehaviour, 'abnormal');
  assert.equal(rec.diagnosticMeasurements?.shrimpBehaviour, 'abnormal');

  // No diagnosis is created or attached
  assert.equal(rec.kinds.includes('water_quality'), true);
  assert.equal(rec.kinds.includes('unknown'), false);
  assert.equal(Object.hasOwn(rec, 'diagnosis'), false, 'observation must not create diagnosis property');
});
