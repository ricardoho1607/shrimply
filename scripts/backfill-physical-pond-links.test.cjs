const test = require('node:test');
const assert = require('node:assert/strict');
const { planLinks } = require('./backfill-physical-pond-links.cjs');

test('links only an unambiguous existing physical pond and preserves archived deleted ponds', () => {
  const physical = [{ id: 'physical', pondName: 'A1', activePondId: 'cycle' }];
  const cycle = { id: 'cycle', pondName: 'A1', previousCyclePondId: 'physical' };
  assert.deepEqual(planLinks(physical, [cycle]).updates, [{ pondId: 'cycle', physicalPondId: 'physical' }]);
  assert.equal(planLinks(physical, [{ ...cycle, physicalPondId: 'physical' }]).updates.length, 0);
  assert.equal(planLinks([...physical, { ...physical[0], id: 'duplicate' }], [{ ...cycle, previousCyclePondId: undefined }]).conflicts[0].reason, 'ambiguous-physical-pond');
  assert.equal(planLinks(physical, [{ ...cycle, blockId: 'different-block' }]).conflicts.length, 1);
  assert.equal(planLinks(physical, [{ ...cycle, id: 'another-cycle' }]).conflicts[0].reason, 'active-pointer-needs-review');
  const archived = planLinks([], [{ ...cycle, cycleStatus: 'ended' }]);
  assert.deepEqual(archived.archivedWithoutPhysical, ['cycle']);
  assert.equal(archived.updates.length, 0);
});
