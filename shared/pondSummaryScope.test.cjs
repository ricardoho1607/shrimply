const { test } = require('node:test');
const assert = require('node:assert/strict');
require('../scripts/register-typescript.cjs');
const { getPondSummaryScope } = require('./pondSummaryScope.ts');
const physical = { id: 'physical', pondName: 'P1', pondArea: 1000, activePondId: 'current' };
const current = { id: 'current', pondName: 'P1', pondArea: 1000, docStart: '2026-10-01', physicalPondId: 'physical' };
const old = { ...current, id: 'old', cycleStatus: 'ended', docStart: '2025-01-01' };
test('repeated cycles count once and only active cycles supply biological metrics', () => {
  const result = getPondSummaryScope([old, current], [physical, { id: 'idle', pondName: 'P2', pondArea: 2000 }]);
  assert.equal(result.totalPonds, 2);
  assert.equal(result.totalArea, 3000);
  assert.deepEqual(result.activePonds, [current]);
});
test('legacy records group by name AND block, including ended-only ponds', () => {
  const result = getPondSummaryScope([old, current, { ...old, id: 'other', blockId: 'B' }], []);
  assert.equal(result.totalPonds, 2);
  assert.equal(result.totalArea, 2000);
  assert.deepEqual(result.activePonds, [current]);
});
test('idle farm has no historical biological metrics', () => {
  assert.equal(getPondSummaryScope([old], [{ ...physical, activePondId: null }]).activePonds.length, 0);
});
test('conflicting active cycles and missing areas block misleading summaries', () => {
  assert.throws(() => getPondSummaryScope([current, { ...current, id: 'duplicate' }], [physical]), /conflicting/);
  assert.throws(() => getPondSummaryScope([], [{ ...physical, pondArea: undefined }]), /area/);
});
test('idle Pond Summary prints unavailable survival rather than zero or NaN', async () => {
  const { loadModule } = require('../scripts/test-module.cjs');
  let html;
  const { exportPondReportPDF } = loadModule('app/services/pondReportExportService.ts', {
    'expo-print': { printToFileAsync: async (options) => { html = options.html; return { uri: 'fixture.pdf' }; } },
    'expo-sharing': { isAvailableAsync: async () => false },
    'expo-file-system/legacy': { documentDirectory: '/tmp/', copyAsync: async () => {} },
    'react-native': { Platform: { OS: 'ios' }, Alert: { alert: () => {} } },
  });
  await exportPondReportPDF({ companyName: 'Fixture Company', reportDate: '2026-10-13', totalPonds: 1, totalArea: 1000, totalBiomass: 0, avgSR: null, ponds: [] });
  assert.match(html, /Fixture Company/);
  assert.match(html, /stat-value">N\/A<\/div>/);
  assert.match(html, /active production cycles only \(0\)/);
  assert.doesNotMatch(html, /NaN/);
});
