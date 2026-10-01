const assert = require('node:assert/strict');
const { test } = require('node:test');
require('../scripts/register-typescript.cjs');
const { mergeAssetSave } = require('./assetSave.ts');

test('offline transfer keeps server history and uses current holder', () => {
  const current = { currentHolder: 'Manager', transferHistory: [{ id: 'a' }, { id: 'server-only' }] };
  const incoming = { currentHolder: 'Technician', transferHistory: [{ id: 'a' }, { id: 'new', from: 'Storage', to: 'Technician' }] };
  const saved = mergeAssetSave(current, incoming);
  assert.equal(saved.transferHistory.length, 3);
  assert.equal(saved.transferHistory.at(-1).from, 'Manager');
  assert.equal(mergeAssetSave({ ...current, ...saved }, incoming), null);
});

test('offline maintenance append counts cost once and preserves concurrent maintenance', () => {
  const current = { maintenanceHistory: [{ id: 'server', cost: 50 }], totalMaintenanceCost: 50 };
  const incoming = { maintenanceHistory: [{ id: 'new', cost: 20 }], totalMaintenanceCost: 20 };
  const saved = mergeAssetSave(current, incoming);
  assert.equal(saved.totalMaintenanceCost, 70); assert.equal(saved.maintenanceHistory.length, 2);
  assert.equal(mergeAssetSave({ ...current, ...saved }, incoming), null);
});

test('offline return cannot clear a newer server transfer', () => {
  const incoming = { currentHolder: null, transferHistory: [{ id: 'old', returned: 'today' }] };
  assert.throws(() => mergeAssetSave({ currentHolder: 'New holder', transferHistory: [{ id: 'old' }, { id: 'new' }] }, incoming), /transfer changed/);
  const saved = mergeAssetSave({ currentHolder: 'Old holder', transferHistory: [{ id: 'old' }] }, incoming);
  assert.equal(saved.currentHolder, null); assert.equal(saved.transferHistory[0].returned, 'today');
  assert.equal(mergeAssetSave(saved, incoming), null);
});

test('non-history asset updates are preserved and invalid costs reject', () => {
  assert.deepEqual(mergeAssetSave({}, { name: 'Pump' }), { name: 'Pump' });
  assert.throws(() => mergeAssetSave({}, { maintenanceHistory: [{ id: 'a', cost: Infinity }] }), /cost/);
});
