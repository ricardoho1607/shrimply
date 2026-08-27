import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getEnterpriseBlockCycles,
  getEnterpriseCycleAvailableBlocks,
  getEnterpriseCycleBlockIds,
  getEnterpriseCyclePlannedPonds,
  getPreviousEnterpriseCycleForSameBlocks,
  getEnterpriseUnassignedInactivePonds,
  summarizeEnterpriseCycle,
  type EnterpriseCycleRecord,
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
