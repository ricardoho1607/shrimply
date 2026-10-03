const test = require('node:test');
const assert = require('node:assert/strict');
const { buildDosingContext, loadDosingContext } = require('./orsonDosingContext');
const pond = { pondName: 'Pond A', pondArea: 1000, samplings: [{ date: '2026-09-07', waterDepthCm: '150' }] };
const report = { status: 'confirmed', sampleDate: '2026-09-07', pondResults: [{ pondId: 'a', waterQuality: { hardnessCa: 100 }, measurementUnits: { hardnessCa: { unit: 'mg/L', basis: 'Ca' } } }] };
const args = { pondId: 'a', pond, report, analyte: 'calcium', today: '2026-09-07' };
test('dosing uses saved explicit elemental units and measured depth', () => {
  const result = buildDosingContext(args);
  assert.equal(result.current_mg_L, 100);
  assert.equal(result.volume_m3, 1500);
  assert.equal(result.source, 'server_firestore');
  assert.equal(result.volume_basis.requires_representative_depth_confirmation, true);
});
test('stale, future, unconfirmed, wrong-basis and cross-pond records fail closed', () => {
  for (const patch of [{ sampleDate: '2026-09-04' }, { sampleDate: '2026-09-08' }, { status: 'draft' }, { pondResults: [] }, { pondResults: [{ ...report.pondResults[0], measurementUnits: { hardnessCa: { unit: 'mg/L', basis: 'CaCO3' } } }] }]) assert.equal(buildDosingContext({ ...args, report: { ...report, ...patch } }), null);
  assert.equal(buildDosingContext({ ...args, pond: { ...pond, samplings: [] } }), null);
  assert.equal(buildDosingContext({ ...args, pond: { ...pond, cycleStatus: 'ended' } }), null);
});
test('invalid pond paths cannot access another company', async () => {
  assert.equal(await loadDosingContext({ db: {}, companyId: 'c', pondId: '../other', today: '2026-09-07' }), null);
});

test('spot readings never represent average depth or silently authorize dosing', () => {
  // Morning spot reading
  const morningPond = { pondName: 'Pond AM', pondArea: 800, samplings: [{ date: '2026-09-07', waterDepthCmMorning: 120 }] };
  const morningResult = buildDosingContext({ ...args, pond: morningPond });
  assert.ok(morningResult);
  assert.equal(morningResult.volume_m3, 960);
  assert.equal(morningResult.volume_basis.session, 'morning');
  assert.equal(morningResult.volume_basis.is_spot_reading, true);
  assert.equal(morningResult.volume_basis.represents_average_depth, false);
  assert.equal(morningResult.volume_basis.requires_representative_depth_confirmation, true);

  // Evening spot reading
  const eveningPond = { pondName: 'Pond PM', pondArea: 800, samplings: [{ date: '2026-09-07', waterDepthCmEvening: 130 }] };
  const eveningResult = buildDosingContext({ ...args, pond: eveningPond });
  assert.ok(eveningResult);
  assert.equal(eveningResult.volume_m3, 1040);
  assert.equal(eveningResult.volume_basis.session, 'evening');
  assert.equal(eveningResult.volume_basis.is_spot_reading, true);
  assert.equal(eveningResult.volume_basis.represents_average_depth, false);
  assert.equal(eveningResult.volume_basis.requires_representative_depth_confirmation, true);

  // Legacy unsuffixed depth remains compatible
  const legacyResult = buildDosingContext(args);
  assert.ok(legacyResult);
  assert.equal(legacyResult.volume_m3, 1500);
  assert.equal(legacyResult.volume_basis.session, null);
  assert.equal(legacyResult.volume_basis.is_spot_reading, true);
  assert.equal(legacyResult.volume_basis.represents_average_depth, false);
  assert.equal(legacyResult.volume_basis.requires_representative_depth_confirmation, true);
});

test('distinct AM and PM records prioritize latest session without conflating', () => {
  const dualPond = {
    pondName: 'Dual Pond',
    pondArea: 1000,
    samplings: [
      { date: '2026-09-07', waterDepthCmMorning: 110, waterDepthCmEvening: 115 },
    ],
  };
  const result = buildDosingContext({ ...args, pond: dualPond });
  assert.ok(result);
  assert.equal(result.volume_basis.measured_depth_cm, 115);
  assert.equal(result.volume_basis.session, 'evening');
  assert.equal(result.volume_basis.represents_average_depth, false);
  assert.equal(result.volume_basis.requires_representative_depth_confirmation, true);
});

