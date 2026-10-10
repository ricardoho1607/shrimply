const {test}=require('node:test');const assert=require('node:assert/strict');require('../scripts/register-typescript.cjs');
const {filterPondRecordsForUser,getPondTechnicianId}=require('./pondAssignments.ts');
const cycles=[{id:'assigned',assignedTechnicianId:'tech'},{id:'other',assignedTechnicianId:'other-tech'},{id:'unassigned'}];
const ponds=[{id:'a',cycleId:'assigned',physicalPondId:'pa'},{id:'b',cycleId:'assigned',physicalPondId:'pb'},{id:'c',cycleId:'other',physicalPondId:'pc'},{id:'d',cycleId:'unassigned'},{id:'legacy'}];
const options={businessSize:'large',role:'technician',userId:'tech',blocks:[],cycles};
test('ordinary technician sees only the two ponds in their assigned cycle',()=>assert.deepEqual(filterPondRecordsForUser(ponds,options).map(p=>p.id),['a','b']));

test('unassigned, revoked, missing user and loading assignments fail closed',()=>{
  for(const scope of [{...options,cycles:[]},{...options,userId:undefined},{...options,userId:'unknown'}]) assert.deepEqual(filterPondRecordsForUser(ponds,scope),[]);
});
test('physical pond scope follows the assigned production record, never a pond name',()=>{
  const physical=[{id:'pa',activePondId:'a'},{id:'pb',activePondId:'b'},{id:'pc',activePondId:'c'},{id:'idle'},{id:'pa-old',activePondId:'c'}];
  assert.deepEqual(filterPondRecordsForUser(physical,options,{ponds}).map(p=>p.id),['pa','pb']);
});
test('enterprise scope continues to use blocks instead of cycles',()=>{
  const scope={...options,businessSize:'enterprise',blocks:[{id:'one',assignedTechnicianId:'tech'}]};
  assert.deepEqual(filterPondRecordsForUser([{id:'a',blockId:'one'},{id:'b',blockId:'two',cycleId:'assigned'}],scope).map(p=>p.id),['a']);
});
test('owners and managers retain the company view including an owner with a technician profile',()=>{
  for(const scope of [{...options,role:'owner'},{...options,role:'manager'},{...options,companyOwnerId:'tech'}]) assert.deepEqual(filterPondRecordsForUser(ponds,scope),ponds);
});
test('SOP assignee resolves the farm cycle, not the independent pond cycle identifier',()=>{
  assert.equal(getPondTechnicianId({...ponds[0],pondCycleId:'pond-cycle'},options),'tech');
  assert.equal(getPondTechnicianId(ponds[3],options),null);
});
