import assert from 'node:assert/strict';
import test from 'node:test';
import {
  harvestPondsBelongToCycle,
  harvestRecordMatchesCycle,
  isHistoricalHarvestRecord,
} from './harvestCycleScope.ts';

test('matches harvest records using top-level or pond cycle identity', () => {
  assert.equal(harvestRecordMatchesCycle({ cycleId: 'cycle-a' }, 'cycle-a'), true);
  assert.equal(harvestRecordMatchesCycle({ ponds: [{ cycleId: 'cycle-b' }] }, 'cycle-b'), true);
  assert.equal(harvestRecordMatchesCycle({ cycleId: 'cycle-a' }, 'cycle-b'), false);
});

test('keeps records from other open cycles out of history', () => {
  const openCycleIds = new Set(['cycle-a', 'cycle-b']);
  assert.equal(isHistoricalHarvestRecord({ cycleId: 'cycle-a' }, openCycleIds), false);
  assert.equal(isHistoricalHarvestRecord({ cycleId: 'cycle-closed' }, openCycleIds), true);
});

test('rejects a harvest selection containing ponds from different cycles', () => {
  assert.equal(harvestPondsBelongToCycle([
    { cycleId: 'cycle-a' },
    { cycleId: 'cycle-a' },
  ], 'cycle-a'), true);
  assert.equal(harvestPondsBelongToCycle([
    { cycleId: 'cycle-a' },
    { cycleId: 'cycle-b' },
  ], 'cycle-a'), false);
});
