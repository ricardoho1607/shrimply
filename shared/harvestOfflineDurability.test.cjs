const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  sortPendingChanges,
  applyPendingHarvestChanges,
  applyPendingPondChanges,
  replayPendingFarmState,
} = require('./offlineWorkspace.ts');
const { getPendingSyncKey } = require('./farmCache.ts');
const {
  applyHarvestImpactToPond,
  reverseHarvestImpactOnPond,
  getHarvestDateSampling,
  calculateHarvestRemoval,
} = require('./harvestCalculations.ts');

test('queue durability: getPendingSyncKey is identity-scoped by user and company', () => {
  const key1 = getPendingSyncKey('user-1', 'company-1');
  const key2 = getPendingSyncKey('user-2', 'company-1');
  const key3 = getPendingSyncKey('user-1', 'company-2');

  assert.notEqual(key1, key2);
  assert.notEqual(key1, key3);
  assert.equal(key1, 'shrimply:pending-sync:user-1:company-1');
});

test('queue ordering: sampling is prioritized before harvest for the same pond', () => {
  const samplingChange = {
    id: 'sampling-1-create',
    type: 'sampling',
    action: 'create',
    pondId: 'pond-1',
    samplingId: 'sampling-1',
    timestamp: 200,
    data: { id: 'sampling-1', date: '2026-09-27', mbw: 18 },
  };

  const harvestChange = {
    id: 'harvest-1-create',
    type: 'harvest',
    action: 'create',
    timestamp: 100, // Earlier timestamp than sampling
    data: {
      id: 'harvest-1',
      date: '2026-09-27',
      ponds: [{ pondId: 'pond-1', biomass: '500', size: '55' }],
    },
  };

  // Even though harvest has earlier timestamp, sampling must precede harvest for same pond
  const sorted = sortPendingChanges([harvestChange, samplingChange]);
  assert.equal(sorted[0].id, 'sampling-1-create');
  assert.equal(sorted[1].id, 'harvest-1-create');
});

test('queue ordering: preserves FIFO timestamp order for independent operations', () => {
  const change1 = {
    id: 'harvest-1-create',
    type: 'harvest',
    action: 'create',
    timestamp: 100,
    data: { id: 'harvest-1', date: '2026-09-27', ponds: [{ pondId: 'pond-1', biomass: '100' }] },
  };
  const change2 = {
    id: 'harvest-2-create',
    type: 'harvest',
    action: 'create',
    timestamp: 200,
    data: { id: 'harvest-2', date: '2026-09-27', ponds: [{ pondId: 'pond-2', biomass: '200' }] },
  };

  const sorted = sortPendingChanges([change2, change1]);
  assert.equal(sorted[0].id, 'harvest-1-create');
  assert.equal(sorted[1].id, 'harvest-2-create');
});

test('replay and idempotence: harvest create applies impact and replaying does not duplicate', () => {
  const initialPond = {
    id: 'pond-1',
    pondName: 'Pond 1',
    density: 100,
    pondArea: 1000,
    initialPopulation: 100000,
    initialWeight: 0.5,
    samplings: [
      { id: 's-1', date: '2026-09-27', mbw: 20, mortality: 0, feed: 0 },
    ],
    totalHarvestedBiomass: 0,
    totalHarvestedPopulation: 0,
    partialHarvestCount: 0,
  };

  const harvestChange = {
    id: 'harvest-1-create',
    type: 'harvest',
    action: 'create',
    timestamp: 100,
    data: {
      id: 'harvest-1',
      date: '2026-09-27',
      ponds: [{ pondId: 'pond-1', harvestType: 'partial', partialHarvestNumber: 1, biomass: '500', size: '50' }],
    },
  };

  const farmState = {
    ponds: [initialPond],
    physicalPonds: [],
    cycles: [],
    harvestRecords: [],
  };

  // First replay
  const stateOnce = replayPendingFarmState(farmState, [harvestChange]);
  assert.equal(stateOnce.harvestRecords.length, 1);
  assert.equal(stateOnce.ponds[0].totalHarvestedBiomass, 500);
  assert.equal(stateOnce.ponds[0].totalHarvestedPopulation, 25000); // 500 * 50

  // Second replay with same change (idempotence)
  const stateTwice = replayPendingFarmState(stateOnce, [harvestChange]);
  assert.equal(stateTwice.harvestRecords.length, 1);
  assert.equal(stateTwice.ponds[0].totalHarvestedBiomass, 500, 'Biomass must not double on replay');
  assert.equal(stateTwice.ponds[0].totalHarvestedPopulation, 25000, 'Population must not double on replay');
});

test('replay and idempotence: harvest update replaces previous impact idempotently', () => {
  const initialPond = {
    id: 'pond-1',
    pondName: 'Pond 1',
    density: 100,
    pondArea: 1000,
    initialPopulation: 100000,
    initialWeight: 0.5,
    samplings: [
      { id: 's-1', date: '2026-09-27', mbw: 20, mortality: 0, feed: 0 },
    ],
    totalHarvestedBiomass: 500,
    totalHarvestedPopulation: 25000,
    partialHarvestCount: 1,
  };

  const existingRecord = {
    id: 'harvest-1',
    date: '2026-09-27',
    ponds: [{ pondId: 'pond-1', harvestType: 'partial', partialHarvestNumber: 1, biomass: '500', size: '50' }],
  };

  const updatedRecord = {
    id: 'harvest-1',
    date: '2026-09-27',
    ponds: [{ pondId: 'pond-1', harvestType: 'partial', partialHarvestNumber: 1, biomass: '700', size: '50' }],
  };

  const updateChange = {
    id: 'harvest-1-update',
    type: 'harvest',
    action: 'update',
    timestamp: 200,
    data: updatedRecord,
    previousData: existingRecord,
  };

  const farmState = {
    ponds: [initialPond],
    physicalPonds: [],
    cycles: [],
    harvestRecords: [existingRecord],
  };

  const updatedState = replayPendingFarmState(farmState, [updateChange]);
  assert.equal(updatedState.ponds[0].totalHarvestedBiomass, 700);
  assert.equal(updatedState.ponds[0].totalHarvestedPopulation, 35000);

  // Idempotent re-replay of the same update
  const updatedAgain = replayPendingFarmState(updatedState, [updateChange]);
  assert.equal(updatedAgain.ponds[0].totalHarvestedBiomass, 700);
  assert.equal(updatedAgain.ponds[0].totalHarvestedPopulation, 35000);
});

test('replay and idempotence: harvest delete reverts pond impact idempotently', () => {
  const pondWithHarvest = {
    id: 'pond-1',
    pondName: 'Pond 1',
    density: 100,
    pondArea: 1000,
    initialPopulation: 100000,
    initialWeight: 0.5,
    samplings: [
      { id: 's-1', date: '2026-09-27', mbw: 20, mortality: 0, feed: 0 },
    ],
    totalHarvestedBiomass: 500,
    totalHarvestedPopulation: 25000,
    partialHarvestCount: 1,
  };

  const harvestRecord = {
    id: 'harvest-1',
    date: '2026-09-27',
    ponds: [{ pondId: 'pond-1', harvestType: 'partial', partialHarvestNumber: 1, biomass: '500', size: '50' }],
  };

  const deleteChange = {
    id: 'harvest-1-delete',
    type: 'harvest',
    action: 'delete',
    timestamp: 300,
    data: harvestRecord,
  };

  const farmState = {
    ponds: [pondWithHarvest],
    physicalPonds: [],
    cycles: [],
    harvestRecords: [harvestRecord],
  };

  const deletedState = replayPendingFarmState(farmState, [deleteChange]);
  assert.equal(deletedState.harvestRecords.length, 0);
  assert.equal(deletedState.ponds[0].totalHarvestedBiomass, 0);
  assert.equal(deletedState.ponds[0].totalHarvestedPopulation, 0);

  // Idempotent re-replay of delete
  const deletedAgain = replayPendingFarmState(deletedState, [deleteChange]);
  assert.equal(deletedAgain.harvestRecords.length, 0);
  assert.equal(deletedAgain.ponds[0].totalHarvestedBiomass, 0);
  assert.equal(deletedAgain.ponds[0].totalHarvestedPopulation, 0);
});

test('cold restart replay of cached optimistic create preserves all pond impact fields', () => {
  const pond = {
    id: 'pond-1', totalHarvestedBiomass: 500, totalHarvestedPopulation: 25000,
    partialHarvestCount: 1, postHarvestBaselineDate: '2026-09-27',
    postHarvestRemainingBiomass: 1500, postHarvestRemainingPopulation: 75000,
    appliedHarvestOperationId: 'op-h1', appliedHarvestOperationIds: ['op-h1'],
    appliedHarvestIds: ['h1'], lastAppliedHarvestId: 'h1', samplings: [],
  };
  const change = { id: 'op-h1', type: 'harvest', action: 'create', timestamp: 10,
    data: { id: 'h1', date: '2026-09-27', ponds: [{ pondId: 'pond-1', biomass: '500', size: '50', harvestType: 'partial', partialHarvestNumber: 1 }] } };
  const cached = { ponds: [pond], physicalPonds: [], cycles: [], harvestRecords: [change.data] };
  const afterRestart = replayPendingFarmState(cached, [change]);
  const afterSecondRestart = replayPendingFarmState(afterRestart, [change]);
  assert.deepEqual(afterSecondRestart.ponds[0], pond);
  assert.equal(afterSecondRestart.harvestRecords.length, 1);
});

test('create then edit keeps the create receipt across a second cold restart', () => {
  const initial = { ponds: [{ id: 'p', totalHarvestedBiomass: 0, totalHarvestedPopulation: 0,
    partialHarvestCount: 0, samplings: [] }], physicalPonds: [], cycles: [], harvestRecords: [] };
  const original = { id: 'h1', date: '2026-09-27', ponds: [{ pondId: 'p', biomass: '200', size: '50', harvestType: 'partial', partialHarvestNumber: 1 }] };
  const replacement = { id: 'h1-rev', date: '2026-09-27', ponds: [{ pondId: 'p', biomass: '200', size: '50', harvestType: 'partial', partialHarvestNumber: 1 }] };
  const create = { id: 'op-create-h1', type: 'harvest', action: 'create', timestamp: 1, data: original };
  const edit = { id: 'op-edit-h1', type: 'harvest', action: 'update', timestamp: 2, data: replacement, previousData: original };
  const afterCreate = replayPendingFarmState(initial, [create]);
  const afterEdit = replayPendingFarmState(afterCreate, [create, edit]);
  const afterSecondRestart = replayPendingFarmState(afterEdit, [create, edit]);
  assert.equal(afterEdit.ponds[0].totalHarvestedBiomass, 200);
  assert.equal(afterSecondRestart.ponds[0].totalHarvestedBiomass, 200, 'replay must not reapply the original create after edit');
  assert.equal(afterSecondRestart.ponds[0].totalHarvestedPopulation, 10000);
  assert.ok(afterSecondRestart.ponds[0].appliedHarvestOperationIds.includes(create.id));
  assert.ok(afterSecondRestart.ponds[0].appliedHarvestOperationIds.includes(edit.id));
});

test('deleting older H1 after H2 reverses only H1 and preserves H2 baseline and receipt', () => {
  const h1 = { id: 'h1', date: '2026-09-10', ponds: [{ pondId: 'p', biomass: '500', size: '50', harvestType: 'partial', partialHarvestNumber: 1, harvestReferenceSamplingId: 's', harvestReferenceMbw: 20 }] };
  const h2 = { id: 'h2', date: '2026-09-20', ponds: [{ pondId: 'p', biomass: '300', size: '50', harvestType: 'partial', partialHarvestNumber: 2, harvestReferenceSamplingId: 's', harvestReferenceMbw: 20 }] };
  const pond = { id: 'p', totalHarvestedBiomass: 800, totalHarvestedPopulation: 40000,
    partialHarvestCount: 2, postHarvestBaselineDate: '2026-09-20', postHarvestRemainingBiomass: 1200,
    postHarvestRemainingPopulation: 60000, postHarvestReferenceSamplingId: 's', postHarvestReferenceMbw: 20,
    appliedHarvestIds: ['h1', 'h2'], appliedHarvestOperationId: 'op-h2', lastAppliedHarvestId: 'h2', samplings: [] };
  const deletion = { id: 'op-delete-h1', type: 'harvest', action: 'delete', timestamp: 30, data: h1 };
  const next = replayPendingFarmState({ ponds: [pond], physicalPonds: [], cycles: [], harvestRecords: [h1, h2] }, [deletion]);
  assert.equal(next.ponds[0].totalHarvestedBiomass, 300);
  assert.equal(next.ponds[0].totalHarvestedPopulation, 15000);
  assert.equal(next.ponds[0].postHarvestRemainingBiomass, 1700);
  assert.equal(next.ponds[0].postHarvestRemainingPopulation, 85000);
  assert.equal(next.ponds[0].partialHarvestCount, 2);
  assert.equal(next.ponds[0].lastAppliedHarvestId, 'h2');
  assert.deepEqual(next.ponds[0].reversedHarvestOperationIds, ['op-delete-h1']);
});

test('legacy cache missing deleted H1 does not reverse its impact a second time', () => {
  const h1 = { id: 'h1', date: '2026-09-10', ponds: [{ pondId: 'p', biomass: '500', size: '50', harvestType: 'partial', partialHarvestNumber: 1 }] };
  const deletion = { id: 'legacy-delete-h1', type: 'harvest', action: 'delete', timestamp: 30, data: h1 };
  const alreadyReversed = { id: 'p', totalHarvestedBiomass: 300, totalHarvestedPopulation: 15000,
    partialHarvestCount: 2, postHarvestBaselineDate: '2026-09-20', postHarvestRemainingBiomass: 1700,
    postHarvestRemainingPopulation: 85000, lastAppliedHarvestId: 'h2', appliedHarvestIds: ['h2'], samplings: [] };
  const cached = { ponds: [alreadyReversed], physicalPonds: [], cycles: [], harvestRecords: [] };
  const replayed = replayPendingFarmState(cached, [deletion]);
  assert.equal(replayed.ponds[0].totalHarvestedBiomass, 300);
  assert.equal(replayed.ponds[0].totalHarvestedPopulation, 15000);
  assert.equal(replayed.ponds[0].postHarvestRemainingBiomass, 1700);
  assert.equal(replayed.ponds[0].postHarvestRemainingPopulation, 85000);
});

test('harvest edit reverses removed pond A and applies added pond B exactly once', () => {
  const old = { id: 'old', date: '2026-09-27', ponds: [{ pondId: 'a', biomass: '100', size: '20', harvestType: 'partial', partialHarvestNumber: 1 }] };
  const replacement = { id: 'new', date: '2026-09-27', ponds: [{ pondId: 'b', biomass: '200', size: '30', harvestType: 'partial', partialHarvestNumber: 1 }] };
  const change = { id: 'op-edit', type: 'harvest', action: 'update', timestamp: 40, data: replacement, previousData: old };
  const initial = { ponds: [
    { id: 'a', totalHarvestedBiomass: 100, totalHarvestedPopulation: 2000, partialHarvestCount: 1, samplings: [] },
    { id: 'b', totalHarvestedBiomass: 0, totalHarvestedPopulation: 0, partialHarvestCount: 0, samplings: [] },
  ], physicalPonds: [], cycles: [], harvestRecords: [old] };
  const once = replayPendingFarmState(initial, [change]);
  const twice = replayPendingFarmState(once, [change]);
  assert.equal(once.ponds.find(p => p.id === 'a').totalHarvestedBiomass, 0);
  assert.equal(once.ponds.find(p => p.id === 'b').totalHarvestedBiomass, 200);
  assert.equal(once.ponds.find(p => p.id === 'b').totalHarvestedPopulation, 6000);
  assert.deepEqual(twice.ponds, once.ponds);
  assert.deepEqual(twice.harvestRecords, once.harvestRecords);
});

test('rejected saves: sampling validation requires positive MBW on harvest date', () => {
  const pondWithoutDateSampling = {
    id: 'pond-1',
    samplings: [
      { id: 's-old', date: '2026-09-20', mbw: 15, mortality: 0 },
    ],
  };
  const dateSampling = getHarvestDateSampling(pondWithoutDateSampling, '2026-09-27');
  assert.equal(dateSampling, undefined, 'Must reject when no sampling on harvest date');

  const pondWithDateSampling = {
    id: 'pond-1',
    samplings: [
      { id: 's-today', date: '2026-09-27', mbw: 18.5, mortality: 0 },
    ],
  };
  const validSampling = getHarvestDateSampling(pondWithDateSampling, '2026-09-27');
  assert.ok(validSampling);
  assert.equal(validSampling.mbw, 18.5);
});
