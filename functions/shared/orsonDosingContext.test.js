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
