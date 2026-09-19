import assert from 'node:assert/strict';
import test from 'node:test';
import {
  allocateExpenseAcrossCyclePonds,
  getOpenFinanceCycles,
  isCompanyWideExpenseCategory,
} from './financeCycleAllocation.ts';

test('recognises current and legacy company-wide expense labels', () => {
  for (const label of [
    'Company-wide expense', 'Biaya perusahaan', 'ค่าใช้จ่ายระดับบริษัท',
    '公司费用', 'Chi phí toàn công ty',
  ]) {
    assert.equal(isCompanyWideExpenseCategory(label), true, label);
  }
  assert.equal(isCompanyWideExpenseCategory('General'), true);
  assert.equal(isCompanyWideExpenseCategory('Utilities'), false);
});

test('returns every open cycle and excludes closing or closed cycles', () => {
  const cycles = getOpenFinanceCycles([
    { id: 'closed', cycleName: 'Cycle 0', status: 'closed' },
    { id: 'two', cycleName: 'Cycle 2', status: 'active' },
    { id: 'one', cycleName: 'Cycle 1', status: 'stocking' },
    { id: 'planned', cycleName: 'Cycle 3', status: 'planning' },
  ]);

  assert.deepEqual(cycles.map((cycle) => cycle.id), ['one', 'two', 'planned']);
});

test('splits a cycle expense across its ponds without losing rounding remainder', () => {
  const allocations = allocateExpenseAcrossCyclePonds(100, 'cycle-a', [
    { id: 'pond-3', pondName: 'A3', cycleId: 'cycle-a' },
    { id: 'pond-1', pondName: 'A1', cycleId: 'cycle-a' },
    { id: 'pond-b', pondName: 'B1', cycleId: 'cycle-b' },
    { id: 'pond-2', pondName: 'A2', cycleId: 'cycle-a', pondCycleId: 'pond-cycle-2' },
  ]);

  assert.deepEqual(allocations.map((allocation) => allocation.pondName), ['A1', 'A2', 'A3']);
  assert.equal(allocations.reduce((total, allocation) => total + allocation.amount, 0), 100);
  assert.deepEqual(allocations.map((allocation) => allocation.amount), [33.34, 33.33, 33.33]);
  assert.equal(allocations[1].pondCycleId, 'pond-cycle-2');
});

test('does not allocate general expenses or cycles without ponds', () => {
  assert.deepEqual(allocateExpenseAcrossCyclePonds(50, undefined, []), []);
  assert.deepEqual(allocateExpenseAcrossCyclePonds(50, 'missing', []), []);
});
