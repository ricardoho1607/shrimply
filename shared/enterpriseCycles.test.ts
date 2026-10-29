import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getEnterpriseBlockCycles,
  getEnterpriseCycleAvailableBlocks,
  getEnterpriseCycleAvailablePonds,
  getEnterpriseCycleUnstartedPonds,
  getEnterpriseBlockStockingCycle,
  getEnterpriseCycleBlockIds,
  getEnterpriseCyclePlannedPonds,
  getPreviousEnterpriseCycleForSameBlocks,
  getEnterpriseUnassignedInactivePonds,
  summarizeEnterpriseCycle,
  type EnterpriseCycleRecord,
  type EnterpriseCyclePondRecord,
  type EnterprisePhysicalPondRecord,
} from './enterpriseCycles.ts';

const cycles: EnterpriseCycleRecord[] = [
  {
    id: 'cycle-a',
    cycleName: 'August production',
    status: 'planning',
    blockIds: ['block-a'],
    plannedStartDate: '2026-08-01',
  },
  {
    id: 'cycle-b',
    cycleName: 'October production',
    status: 'planning',
    blockIds: ['block-b'],
    plannedStartDate: '2026-10-01',
  },
];

test('assigns one whole block to each enterprise cycle', () => {
  assert.deepEqual(getEnterpriseCycleBlockIds(cycles[0]), ['block-a']);
  assert.deepEqual(
    getEnterpriseBlockCycles('block-a', cycles, []).map((cycle) => cycle.id),
    ['cycle-a'],
  );
  assert.deepEqual(
    getEnterpriseBlockCycles('block-b', cycles, []).map((cycle) => cycle.id),
    ['cycle-b'],
  );
});

test('compares a cycle only with the latest earlier cycle for the same block', () => {
  const selected = {
    id: 'cycle-a-current',
    cycleName: 'Block A current',
    status: 'closed' as const,
    blockIds: ['block-a'],
    closedAt: '2026-08-20',
  };
  const previous = getPreviousEnterpriseCycleForSameBlocks(selected, [
    selected,
    {
      id: 'cycle-b-newer',
      cycleName: 'Block B newer',
      status: 'closed',
      blockIds: ['block-b'],
      closedAt: '2026-08-10',
    },
    {
      id: 'cycle-a-previous',
      cycleName: 'Block A previous',
      status: 'closed',
      blockIds: ['block-a'],
      closedAt: '2026-08-01',
    },
  ]);

  assert.equal(previous?.id, 'cycle-a-previous');
});

test('does not compare cycles when no same-block history exists', () => {
  const selected = {
    id: 'cycle-a-current',
    cycleName: 'Block A current',
    status: 'closed' as const,
    blockIds: ['block-a'],
    closedAt: '2026-08-20',
  };

  assert.equal(getPreviousEnterpriseCycleForSameBlocks(selected, [
    selected,
    {
      id: 'cycle-b-previous',
      cycleName: 'Block B previous',
      status: 'closed',
      blockIds: ['block-b'],
      closedAt: '2026-08-01',
    },
  ]), undefined);
});

test('does not offer blocks reserved by another open cycle', () => {
  const available = getEnterpriseCycleAvailableBlocks([
    { id: 'block-a' },
    { id: 'block-b' },
    { id: 'block-c' },
    { id: 'block-d' },
  ], cycles);

  assert.deepEqual(available.map((block) => block.id), ['block-c', 'block-d']);
});

test('includes every physical pond in the selected blocks', () => {
  const planned = getEnterpriseCyclePlannedPonds(cycles[0], [
    { id: 'pond-a1', blockId: 'block-a', status: 'idle' },
    { id: 'pond-a2', blockId: 'block-a', status: 'active', activePondId: 'run-a2' },
    { id: 'pond-b1', blockId: 'block-b', status: 'idle' },
    { id: 'pond-c1', blockId: 'block-c', status: 'idle' },
  ]);

  assert.deepEqual(planned.map((pond) => pond.id), ['pond-a1', 'pond-a2']);
});

test('includes a newly added pond for cycles using the legacy single block field', () => {
  const planned = getEnterpriseCyclePlannedPonds({
    id: 'cycle-b',
    blockId: 'block-b',
  }, [
    { id: 'pond-b-new', blockId: 'block-b', status: 'idle' },
  ]);

  assert.deepEqual(planned.map((pond) => pond.id), ['pond-b-new']);
});

test('includes new ponds when an active pond supplies a legacy cycle block link', () => {
  const planned = getEnterpriseCyclePlannedPonds({
    id: 'cycle-legacy',
  }, [
    { id: 'pond-b1', blockId: 'block-b', status: 'active', activePondId: 'run-b1' },
    { id: 'pond-b2', blockId: 'block-b', status: 'idle' },
  ], [
    { id: 'run-b1', cycleId: 'cycle-legacy', blockId: 'block-b', cycleStatus: 'active' },
  ]);

  assert.deepEqual(planned.map((pond) => pond.id), ['pond-b1', 'pond-b2']);
});

test('keeps newly created ponds visible while their block has no open cycle', () => {
  const available = getEnterpriseUnassignedInactivePonds([
    { id: 'pond-a1', blockId: 'block-a', status: 'idle' },
    { id: 'pond-c1', blockId: 'block-c', status: 'idle' },
    { id: 'pond-c2', blockId: 'block-c', status: 'active', activePondId: 'run-c2' },
  ], cycles);

  assert.deepEqual(available.map((pond) => pond.id), ['pond-c1']);
});

test('derives stocking progress for the cycle block', () => {
  const summary = summarizeEnterpriseCycle(cycles[0], [
    {
      id: 'run-a1',
      blockId: 'block-a',
      cycleId: 'cycle-a',
      cycleStatus: 'active',
      previousCyclePondId: 'pond-a1',
      docStart: '2026-08-03',
    },
  ], [
    { id: 'pond-a1', blockId: 'block-a', status: 'active', activePondId: 'run-a1' },
    { id: 'pond-a2', blockId: 'block-a', status: 'idle' },
  ]);

  assert.equal(summary.status, 'stocking');
  assert.equal(summary.startedCount, 1);
  assert.equal(summary.plannedCount, 2);
  assert.equal(summary.stockingStartDate, '2026-08-03');
});

// Cahaya Samudera Bangka: C1-C4 still growing; C5-C8 harvested in the same old cycle.
const blockC = { id: 'C' };
const oldCycle: EnterpriseCycleRecord = { id: 'old', cycleName: 'Siklus 15', status: 'active', blockIds: ['C'] };
const physicalC: EnterprisePhysicalPondRecord[] = Array.from({ length: 8 }, (_, index) => ({
  id: `c${index + 1}`, pondName: `C${index + 1}`, blockId: 'C',
  status: index < 4 ? 'active' : 'idle', activePondId: index < 4 ? `run-c${index + 1}` : null,
}));
const runsC: EnterpriseCyclePondRecord[] = physicalC.map((pond, index) => ({
  id: `run-${pond.id}`, pondName: pond.pondName, physicalPondId: pond.id, previousCyclePondId: pond.id,
  blockId: 'C', cycleId: oldCycle.id, cycleStatus: index < 4 ? 'active' : 'ended',
}));

test('C5-C8 can start a separate cycle while C1-C4 stay active in the same block', () => {
  assert.deepEqual(getEnterpriseCycleAvailableBlocks([blockC], [oldCycle], runsC, physicalC), [blockC]);
  assert.deepEqual(getEnterpriseCycleAvailablePonds('C', physicalC, [oldCycle], runsC).map((pond) => pond.id), ['c5', 'c6', 'c7', 'c8']);
  assert.deepEqual(getEnterpriseCycleUnstartedPonds(oldCycle, physicalC, runsC), []);
  assert.equal(getEnterpriseBlockStockingCycle('C', [oldCycle], physicalC, runsC), undefined);
});

test('an explicit subgroup counts only its ponds and preserves old cycle history', () => {
  const subgroup: EnterpriseCycleRecord = { ...oldCycle, id: 'new', plannedPondIds: ['c5', 'c6', 'c7', 'c8'] };
  const newRuns = runsC.slice(4).map((pond) => ({ ...pond, id: `new-${pond.id}`, cycleId: subgroup.id, cycleStatus: 'active' as const }));
  const allRuns = [...runsC, ...newRuns];
  const original = JSON.stringify(allRuns);
  const summary = summarizeEnterpriseCycle(subgroup, allRuns, physicalC);
  assert.equal(summary.plannedCount, 4);
  assert.equal(summary.startedCount, 4);
  assert.equal(summary.activeCount, 4);
  const previous = summarizeEnterpriseCycle(oldCycle, allRuns, physicalC);
  assert.equal(previous.activeCount, 4);
  assert.equal(previous.endedCount, 4);
  assert.equal(previous.startedCount, 8);
  assert.equal(JSON.stringify(allRuns), original);
  assert.deepEqual(getEnterpriseCyclePlannedPonds({ ...subgroup, plannedPondIds: [] }, physicalC, allRuns), []);
});

test('only unstarted planned ponds are reserved and continued; ended members are reusable', () => {
  const planned: EnterpriseCycleRecord = { ...oldCycle, id: 'planned', status: 'stocking', plannedPondIds: ['c5', 'c6'] };
  assert.deepEqual(getEnterpriseCycleAvailablePonds('C', physicalC, [oldCycle, planned], runsC).map((pond) => pond.id), ['c7', 'c8']);
  assert.deepEqual(getEnterpriseCycleUnstartedPonds(planned, physicalC, runsC).map((pond) => pond.id), ['c5', 'c6']);
  assert.equal(getEnterpriseBlockStockingCycle('C', [oldCycle, planned], physicalC, runsC)?.id, 'planned');
  const ended = [...runsC, { ...runsC[4], id: 'planned-c5', cycleId: planned.id }];
  assert.deepEqual(getEnterpriseCycleAvailablePonds('C', physicalC, [oldCycle, planned], ended).map((pond) => pond.id), ['c5', 'c7', 'c8']);
  assert.deepEqual(getEnterpriseCycleUnstartedPonds(planned, physicalC, ended).map((pond) => pond.id), ['c6']);
  assert.deepEqual(getEnterpriseCycleAvailablePonds('C', physicalC, [{ ...planned, status: 'closed' }], runsC).map((pond) => pond.id), ['c5', 'c6', 'c7', 'c8']);
});

test('legacy unstarted block ponds still continue their cycle without choosing ambiguous plans', () => {
  const legacy: EnterpriseCycleRecord = { ...oldCycle, id: 'legacy', status: 'planning' };
  assert.equal(getEnterpriseBlockStockingCycle('C', [legacy], physicalC, runsC)?.id, legacy.id);
  assert.deepEqual(getEnterpriseCycleAvailableBlocks([blockC], [legacy], runsC, physicalC), []);
  assert.deepEqual(getEnterpriseCycleUnstartedPonds(legacy, physicalC, runsC).map((pond) => pond.id), ['c5', 'c6', 'c7', 'c8']);
  assert.equal(getEnterpriseBlockStockingCycle('C', [legacy, { ...legacy, id: 'overlap' }], physicalC, runsC), undefined);
});

test('active status, pointer, or a linked run each prevents another start', () => {
  for (const pond of [{ id: 'p', status: 'active' as const }, { id: 'p', activePondId: 'run' }]) {
    assert.deepEqual(getEnterpriseCycleAvailablePonds('C', [{ ...pond, blockId: 'C' }], []), []);
  }
  for (const link of [{ physicalPondId: 'p' }, { previousCyclePondId: 'p' }, { pondName: ' P ', blockId: 'C' }]) {
    assert.deepEqual(getEnterpriseCycleAvailablePonds('C', [{ id: 'p', pondName: 'P', blockId: 'C', status: 'idle' }], [], [{ id: 'run', ...link }]), []);
  }
});
