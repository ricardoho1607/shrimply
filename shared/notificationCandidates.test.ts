import assert from 'node:assert/strict';
import test from 'node:test';
import { getNotificationCandidates } from './notificationCandidates.ts';

test('web generates the same low-stock and overdue-return candidates as mobile', () => {
  const result = getNotificationCandidates({
    now: new Date('2026-08-15T12:00:00Z'),
    feeds: [{ id: 'f1', feedName: 'Grower', totalStock: 4, reorderLevel: 5, unit: 'kg' }],
    additives: [
      { id: 'a1', additiveName: 'Mineral', totalStock: 0, reorderLevel: 2, unit: 'kg' },
      { id: 'mix1', additiveName: 'Treatment', totalStock: 0, reorderLevel: 2, inventoryKind: 'treatmentMix' },
    ],
    assets: [{
      id: 'asset1', assetName: 'Pump', currentHolder: 'u2',
      transferHistory: [{ to: 'Tech', expectedReturn: '2026-08-14T12:00:00Z', returned: false }],
    }],
  });

  assert.deepEqual(result.lowStock.map((item) => item.itemId), ['f1', 'a1']);
  assert.deepEqual(result.overdue.map((item) => item.assetId), ['asset1']);
  assert.equal(result.overdue[0].holderName, 'Tech');
});
