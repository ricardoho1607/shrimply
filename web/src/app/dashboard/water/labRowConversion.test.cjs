const assert = require('node:assert/strict');
const test = require('node:test');
const { normalizeLabRow, denormalizeLabRow } = require('./labRowConversion.ts');
test('lab conversion keeps missing measurements null and preserves explicit zero', () => {
 const row = normalizeLabRow({ pondId: 'pond', doc: '', waterQuality: { phCustomer: '0', tan: 'unknown', hardnessCa: '1,200' } }, 'manual');
 assert.equal(row.doc, null); assert.equal(row.waterQuality.phCustomer, 0); assert.equal(row.waterQuality.tan, null); assert.equal(row.waterQuality.hardnessCa, 1200);
});
test('plankton derives missing cell counts from percentages without overriding an explicit count', () => {
 const row = normalizeLabRow({ pondId: 'pond', plankton: { totalCellPerMl: '1,000', diatomPercent: '20%', cyanophytaPercent: '10%', cyanophytaCellPerMl: '0' } }, 'pdf_upload');
 assert.equal(row.plankton.diatomCellPerMl, 200); assert.equal(row.plankton.cyanophytaCellPerMl, 0); assert.equal(row.plankton.protozoaCellPerMl, null);
});
test('lab edit conversion retains units and resolves the pond name with explicit context', () => {
 const row = denormalizeLabRow({ pondId: 'pond', doc: 0, waterQuality: { tan: null }, measurementUnits: { salinityLab: 'ppt' } }, [{ id: 'pond', pondName: 'A1' }]);
 assert.equal(row.pondCode, 'A1'); assert.equal(row.doc, '0'); assert.equal(row.waterQuality.tan, ''); assert.equal(row.measurementUnits.salinityLab, 'ppt');
});
