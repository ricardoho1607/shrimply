import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildHarvestRevenue,
  buildInventoryExpense,
  financeSyncDocumentId,
} from './financeSync.ts';

test('finance sync uses one deterministic Firestore document per source record', () => {
  assert.equal(financeSyncDocumentId('HARVEST-harvest/1'), 'sync_HARVEST-harvest%2F1');
  assert.equal(financeSyncDocumentId('HARVEST-harvest/1'), financeSyncDocumentId('HARVEST-harvest/1'));
});

test('multi-pond harvest revenue includes main and sub-grade sales', () => {
  const revenue = buildHarvestRevenue({
    id: 'h1',
    date: '2026-08-15',
    cycleId: 'cycle-1',
    cycleName: 'Cycle 1',
    ponds: [
      { pondName: 'A1', biomass: '100', price: '5', subBiomass: '10', subPrice: '2' },
      { pondName: 'A2', biomass: '50', price: '6', subBiomass: '', subPrice: '' },
    ],
  });

  assert.equal(revenue.reference, 'HARVEST-h1');
  assert.equal(revenue.amount, 820);
  assert.match(revenue.item, /160\.0 kg/);
});

test('inventory stock-in expense is stable across web and mobile', () => {
  const expense = buildInventoryExpense({
    id: 'stock-1', itemId: 'feed-1', type: 'feed', itemName: 'Grower',
    quantity: 25, price: 4, unit: 'kg', date: '2026-08-15', batch: 'B1', notes: 'new',
  });

  assert.equal(expense.reference, 'INVENTORY-feed-feed-1-stock-1');
  assert.equal(expense.amount, 100);
  assert.match(expense.item, /25 kg/);
});
