const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCallback } = require('../../scripts/test-module.cjs');
const { sortPendingChanges, removeAcknowledgedPendingChanges, isOfflineSyncIdentityCurrent } = require('../../shared/offlineWorkspace.ts');
function runner(changes, commit, persist = async () => {}) {
 const ref = { current: changes }, calls = [], status = {};
 const sync = loadCallback('app/services/firebaseSync/useSyncRetry.ts', 'syncPendingChanges', {
  sortPendingChanges, removeAcknowledgedPendingChanges, isOfflineSyncIdentityCurrent,
  pendingStorageKey:'queue',pendingIdentityRef:{current:'queue'},pendingQueueWritesRef:{current:0},pendingEnqueueRef:{current:Promise.resolve()},retryTimerRef:{current:undefined},setTimeout(){},
  activeCompanyId:'farm', user:{uid:'user'}, pendingChangesRef:ref, isOnlineRef:{current:true},syncInProgressRef:{current:false},retryAttemptRef:{current:0},
  clearRetryTimer(){}, scheduleSyncRetry(){}, usePondStore:{getState:()=>({currentCompanyId:'farm',farmCacheUserId:'user'})},
  setSyncStatus(update){Object.assign(status,update(status));},setPendingChanges(){},
  commitChanges:async batch=>{calls.push(batch[0].id);return {processedIds:await commit(batch[0],ref),committedLegacyPonds:{}};},
  persistPendingQueue:async next=>persist(next,ref),
 });
 return {sync,ref,calls,status};
}
const change=(id,pondId,type='sampling')=>({id,...(type === 'pond' ? {} : {pondId}),type,timestamp:1,data:{id:pondId}});
test('failed pond leaves dependent edits pending while other pond edits progress', async () => {
 const r=runner([change('create','a','pond'),change('edit','a'),change('independent','b')],async op=>{
  if(op.id==='create')throw new Error('permission denied');return [op.id];
 });
 await r.sync();
 assert.deepEqual(r.calls,['create','independent']);
 assert.deepEqual(r.ref.current.map(op=>op.id),['create','edit']);
 assert.match(r.status.error,/permission denied/);
});
test('an edit enqueued during local acknowledgement is retained and prior successes are not replayed', async () => {
 let inserted=false;
 const r=runner([change('first','a')],async op=>[op.id],async (next,ref)=>{
  if(!inserted){inserted=true;ref.current=[...ref.current,change('new','b')];}
 });
 await r.sync();
 assert.deepEqual(r.ref.current.map(op=>op.id),['new']);
 await r.sync();
 assert.deepEqual(r.calls,['first','new']);
 assert.equal(r.ref.current.length,0);
});
