const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
require('../../scripts/register-typescript.cjs');
const calculations = require('../../shared/harvestCalculations.ts');
const operations = require('../../shared/harvestOperation.ts');
const offline = require('../../shared/offlineWorkspace.ts');
const { getFarmDateKey } = require('../../shared/farmDate.ts');
const { getPondCurrentDoc } = require('../../shared/pondCalculations.ts');
const isFarmCycleOpen = cycle => ['planning', 'stocking', 'active'].includes(cycle.status);
const source = fs.readFileSync(__dirname + '/pondStore.ts', 'utf8');
const start = source.indexOf('      saveHarvestOperation:');
const end = source.indexOf('      addHarvestRecord:', start);
const expression = source.slice(start, end).trim().replace(/^saveHarvestOperation:\s*/, '').replace(/,$/, '');
const compiled = ts.transpileModule(`const save = ${expression}; return save;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const line = id => ({ pondId: id, pondName: id, pondCycleId: id, cycleId: 'cycle', harvestType: 'final', biomass: '100', size: '50', price: '10', subBiomass: '', subSize: '', subPrice: '' });
const records = [{ id: 'h1', date: '2026-09-16', cycleId: 'cycle', ponds: [line('p1')] }, { id: 'h2', date: '2026-09-17', cycleId: 'cycle', ponds: [line('p2')] }];
const operation = operations.createHarvestOperation('operation-1', records);
function harness(sync = async () => ({ success: true, status: 'pending' })) {
  let state = { currentCompanyId: 'company', farmCacheUserId: 'owner', currentTimeZone: 'UTC',
    cycles: [{ id: 'cycle', status: 'active' }], physicalPonds: [], harvestRecords: [],
    ponds: ['p1','p2'].map(id => ({ id, pondName: id, pondCycleId: id, cycleId: 'cycle', cycleStatus: 'active',
      docStart: '2026-07-01', initialPopulation: 100000, initialWeight: 0.5,
      samplings: ['2026-09-16','2026-09-17'].map(date => ({ date, mbw: 20, feed: 0 })) })),
    firebaseSync: { syncHarvestOperation: sync } };
  const dependencies = { ...calculations, ...operations, ...offline, getFarmDateKey, isFarmCycleOpen,
    get: () => state, set: update => { state = { ...state, ...update(state) }; } };
  const save = new Function(...Object.keys(dependencies), compiled)(...Object.values(dependencies));
  return { save, get state() { return state; }, replace: value => { state = value; } };
}
test('mixed final dates enqueue one durable operation and stop each pond DOC independently', async () => {
  const queued = []; const h = harness(async op => { queued.push(op); return { success: true, status: 'pending' }; });
  assert.equal((await h.save(operation)).success, true);
  assert.equal(queued.length, 1);
  assert.equal(queued[0].records.length, 2);
  assert.equal(h.state.harvestRecords.length, 2);
  assert.equal(getPondCurrentDoc(h.state.ponds[0], 'UTC', '2026-10-20'), 77);
  assert.equal(getPondCurrentDoc(h.state.ponds[1], 'UTC', '2026-10-20'), 78);
  const restarted = offline.replayPendingFarmState(JSON.parse(JSON.stringify(h.state)), [{id: operation.id,type:'harvest',action:'create',data:queued[0],timestamp:1}]);
  assert.deepEqual(restarted.ponds.map(p => p.totalHarvestedBiomass), [100,100]);
  assert.equal(restarted.harvestRecords.length, 2);
});
test('a rejected durable enqueue rolls back every pond and preserves other pond edits', async () => {
  let h; h = harness(async () => {
    h.state.ponds[0].note = 'edited during save';
    return { success: false, error: 'storage full' };
  });
  assert.equal((await h.save(operation)).success, false);
  assert.equal(h.state.harvestRecords.length, 0);
  assert.deepEqual(h.state.ponds.map(p => p.finalHarvestDates), [undefined,undefined]);
  assert.equal(h.state.ponds[0].note, 'edited during save');
});
test('missing sampling on either final date rejects the whole operation before enqueue', async () => {
  let calls = 0; const h = harness(async () => { calls++; return {success:true,status:'pending'}; });
  h.state.ponds[1].samplings = [];
  assert.equal((await h.save(operation)).success, false);
  assert.equal(calls, 0); assert.equal(h.state.harvestRecords.length, 0);
});
test('a failed enqueue after switching farms cannot restore old ponds into the new farm', async () => {
  let h; h = harness(async () => { h.replace({...h.state,currentCompanyId:'other',ponds:[],harvestRecords:[]}); throw new Error('storage failed'); });
  assert.equal((await h.save(operation)).success, false);
  assert.deepEqual(h.state.ponds, []);
});

test('repeating a durable save preserves the same records and pond totals', async () => {
  const queued=[];const h=harness(async op=>{queued.push(op);return {success:true,status:'pending'};});
  await h.save(operation);await h.save(operation);
  assert.equal(h.state.harvestRecords.length,2);
  assert.deepEqual(h.state.ponds.map(p=>p.totalHarvestedBiomass),[100,100]);
  assert.deepEqual(queued[0],queued[1]);
});
test('a split final-harvest correction survives restart without restoring the original DOC dates', async () => {
  const h=harness();
  const previous={id:'old',date:'2026-09-15',cycleId:'cycle',ponds:[line('p1'),line('p2')]};
  h.state.harvestRecords=[previous];
  h.state.ponds=h.state.ponds.map(p=>calculations.applyHarvestImpactToPond(p,line(p.id),previous.date));
  const change={id:'correction',type:'harvest',action:'update',data:operations.createHarvestOperation('correction',records,previous),timestamp:1};
  assert.equal((await h.save(change.data)).success,true);
  const restarted=offline.replayPendingFarmState(JSON.parse(JSON.stringify(h.state)),[change]);
  assert.deepEqual(restarted.ponds.map(p=>p.finalHarvestDates),[['2026-09-16'],['2026-09-17']]);
  assert.deepEqual(restarted.ponds.map(p=>p.totalHarvestedBiomass),[100,100]);
  assert.deepEqual(restarted.harvestRecords.map(r=>r.id).sort(),['h1','h2']);
});
