const assert = require('node:assert/strict');
const test = require('node:test');
const { loadModule } = require('../../scripts/test-module.cjs');
const { getPendingSyncKey } = require('../../shared/farmCache.ts');

const folder = 'app/services/firebaseSync/';
const plain = value => JSON.parse(JSON.stringify(value));
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const operation = id => ({ id, type: 'sampling', action: 'create', pondId: 'pond', samplingId: id, timestamp: 1, data: { id, date: '2026-10-13', mbw: 10, feed: 0 } });

// Run the actual hooks, including effects and cleanup, with deterministic storage/network boundaries.
function hooks() {
  const slots = [];
  let cursor = 0, pending = [], dirty = false, mounted = true, renderHook, value;
  const same = (a, b) => a && b && a.length === b.length && a.every((item, i) => Object.is(item, b[i]));
  const react = {
    useState(initial) {
      const i = cursor++;
      slots[i] ||= { value: typeof initial === 'function' ? initial() : initial, set(next) { const v = typeof next === 'function' ? next(slots[i].value) : next; if (!Object.is(v, slots[i].value)) { slots[i].value = v; dirty = true; } } };
      return [slots[i].value, slots[i].set];
    },
    useRef(initial) { const i = cursor++; return slots[i] ||= { current: initial }; },
    useCallback(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) slots[i] = { deps, fn }; return slots[i].fn; },
    useEffect(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) { const prior = slots[i]; slots[i] = { deps }; pending.push(() => { prior?.cleanup?.(); slots[i].cleanup = fn(); }); } },
  };
  function render() { dirty = false; cursor = 0; value = renderHook(); const effects = pending; pending = []; effects.forEach(fn => fn()); }
  return {
    react,
    mount(fn) { renderHook = fn; render(); return value; },
    async settle() { for (let i = 0; i < 6; i++) { await new Promise(resolve => setImmediate(resolve)); if (dirty && mounted) render(); } return value; },
    unmount() { mounted = false; slots.forEach(slot => slot?.cleanup?.()); },
    get value() { return value; },
  };
}

function fixture({ stored = [], write = async () => {}, read } = {}) {
  let state = { currentCompanyId: 'farm', farmCacheUserId: 'user', ponds: [{ id: 'pond', samplings: [] }], physicalPonds: [], cycles: [], harvestRecords: [] };
  const key = getPendingSyncKey('user', 'farm');
  const disk = new Map([[key, JSON.stringify(stored)]]), writes = [], timers = new Map();
  let timerId = 0, status = {}, flushes = 0;
  const store = { getState: () => state, setState: update => { state = { ...state, ...(typeof update === 'function' ? update(state) : update) }; } };
  const runtime = { activeCompanyId: 'farm', activeUserId: 'user', user: { uid: 'user' }, company: { id: 'farm' }, isOnlineRef: { current: false }, syncPendingChangesRef: { current: () => { flushes++; } }, setSyncStatus(update) { status = update(status); } };
  const globals = { Error, __DEV__: false, console: { log() {}, error() {} }, setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn, delay }); return id; }, clearTimeout(id) { timers.delete(id); } };
  const common = {
    '../../store/pondStore': { usePondStore: store, normalizePondLifecycle: x => x },
    '../farmCache': { scheduleFarmCachePersist() {}, flushFarmCachePersist: async () => {} },
    '../offlineWorkspace': { listOfflineMutations: async () => [], requestOfflineMutationFlush() {} },
  };
  common['./syncReconciliation'] = loadModule(folder + 'syncReconciliation.ts', common, globals);
  const queueHooks = hooks();
  const { useSyncQueue } = loadModule(folder + 'useSyncQueue.ts', {
    ...common, react: queueHooks.react,
    '../protectedStorage': {
      readProtectedItem: async () => read ? read() : disk.get(key),
      writeProtectedItem: async (user, storageKey, value) => { await write(value); disk.set(storageKey, value); writes.push({ user, storageKey, value }); },
      removeProtectedItem: async storageKey => { await write(null); disk.delete(storageKey); writes.push({ storageKey, value: null }); },
    },
  }, globals);
  queueHooks.mount(() => useSyncQueue(runtime));
  return { queueHooks, runtime, common, globals, disk, writes, timers, key, store,
    get queue() { return queueHooks.value; }, get state() { return state; }, get status() { return status; }, get flushes() { return flushes; } };
}

test('cold restart restores the protected queue and replays sampling without inventory changes', async () => {
  const f = fixture({ stored: [operation('saved')] });
  await f.queueHooks.settle();
  assert.equal(f.queue.pendingStorageReady, true);
  assert.equal(f.queue.pendingIdentityRef.current, f.key);
  assert.deepEqual(plain(f.state.ponds[0].samplings), [operation('saved').data]);
  assert.equal(f.queue.pendingChanges.length, 1);
  assert.equal(f.writes.length, 0);
  f.queueHooks.unmount();
});

test('concurrent enqueues wait for protected storage and keep both changes before flushing', async () => {
  const gate = deferred(); let writes = 0;
  const f = fixture({ write: async () => { if (++writes === 1) await gate.promise; } });
  await f.queueHooks.settle(); f.runtime.isOnlineRef.current = true;
  let accepted = false;
  const first = f.queue.addPendingChange(operation('first')).then(result => { accepted = true; return result; });
  const second = f.queue.addPendingChange(operation('second'));
  await f.queueHooks.settle();
  assert.equal(accepted, false); assert.equal(f.flushes, 0);
  gate.resolve();
  assert.equal((await first).success, true); assert.equal((await second).success, true);
  assert.deepEqual(JSON.parse(f.disk.get(f.key)).map(x => x.id), ['first', 'second']);
  assert.equal(f.flushes, 1);
  f.queueHooks.unmount();
});

test('failed protected-storage writes reject acceptance and restore the previous queue', async () => {
  const f = fixture({ stored: [operation('previous')], write: async () => { throw new Error('Disk full'); } });
  await f.queueHooks.settle();
  const result = await f.queue.addPendingChange(operation('new'));
  assert.equal(result.success, false); assert.match(result.error, /Disk full/);
  assert.deepEqual(plain(f.queue.pendingChangesRef.current).map(x => x.id), ['previous']);
  assert.deepEqual(JSON.parse(f.disk.get(f.key)).map(x => x.id), ['previous']);
  f.queueHooks.unmount();
});

test('an unmounted queue rejects stale handlers even after the same account returns', async () => {
  const f = fixture(); await f.queueHooks.settle(); const save = f.queue.addPendingChange;
  f.queueHooks.unmount();
  const result = await save(operation('stale'));
  assert.equal(result.success, false);
  assert.equal(f.writes.length, 0);
});

test('a deferred restore cannot replay into another account after cleanup', async () => {
  const gate = deferred(); const f = fixture({ read: () => gate.promise });
  f.queueHooks.unmount(); f.store.setState({ currentCompanyId: 'other', farmCacheUserId: 'other-user' });
  gate.resolve(JSON.stringify([operation('stale')])); await f.queueHooks.settle();
  assert.equal(f.state.ponds[0].samplings.length, 0); assert.equal(f.writes.length, 0);
});

test('detached listeners ignore late snapshots, including returning to the same account', async () => {
  const f = fixture(); await f.queueHooks.settle();
  const h = hooks(), listeners = [], detached = [];
  const { useSyncListeners } = loadModule(folder + 'useSyncListeners.ts', {
    ...f.common, react: h.react, '@/config/firebase': { db: {} },
    'firebase/firestore': {
      collection: (_db, ...parts) => parts.join('/'), query: target => target, orderBy() {},
      onSnapshot: (target, _options, onNext) => { listeners.push({ target, onNext }); return () => detached.push(target); },
    },
  }, f.globals);
  h.mount(() => useSyncListeners(f.runtime, f.queue));
  assert.equal(listeners.length, 4);
  h.unmount();
  assert.equal(detached.length, 4);
  const cycles = listeners.find(x => x.target.endsWith('/cycles'));
  cycles.onNext({ metadata: { fromCache: false }, forEach: fn => fn({ id: 'stale', data: () => ({ cycleName: 'stale' }) }) });
  assert.equal(f.state.cycles.length, 0);
  f.queueHooks.unmount();
});

function mountRetry(f, commit) {
  const h = hooks(); let network;
  const { useSyncRetry } = loadModule(folder + 'useSyncRetry.ts', {
    ...f.common, react: h.react,
    './networkStatus': { NetInfo: { addEventListener(callback) { network = callback; callback({ isConnected: false }); return () => { network = undefined; }; } } },
  }, f.globals);
  h.mount(() => useSyncRetry(f.runtime, f.queue, commit, { isOnline: false }));
  return { h, online: () => network({ isConnected: true, isInternetReachable: true }), offline: () => network({ isConnected: false }) };
}

test('reconnect flushes once, retries with backoff, and clears timers on cleanup', async () => {
  const f = fixture({ stored: [operation('queued')] }); await f.queueHooks.settle(); let attempts = 0;
  const r = mountRetry(f, async changes => { attempts++; if (attempts === 1) throw new Error('Transient failure'); return { processedIds: changes.map(x => x.id), committedLegacyPonds: {} }; });
  assert.equal(attempts, 0); r.online(); await r.h.settle();
  assert.equal(attempts, 1); assert.equal(f.timers.size, 1);
  const [id, timer] = [...f.timers][0]; assert.equal(timer.delay, 1000);
  f.timers.delete(id); timer.fn(); await r.h.settle();
  assert.equal(attempts, 2); assert.equal(f.queue.pendingChangesRef.current.length, 0); assert.equal(f.disk.has(f.key), false);
  r.h.unmount(); f.queueHooks.unmount(); assert.equal(f.timers.size, 0);
});

test('a slow cloud acknowledgement cannot clear a queue after account cleanup', async () => {
  const f = fixture({ stored: [operation('queued')] }); await f.queueHooks.settle(); const gate = deferred();
  const r = mountRetry(f, async () => { await gate.promise; return { processedIds: ['queued'], committedLegacyPonds: {} }; });
  r.online(); await r.h.settle();
  r.h.unmount(); f.queueHooks.unmount(); gate.resolve(); await r.h.settle();
  assert.equal(f.queue.pendingChangesRef.current.length, 1);
  assert.equal(JSON.parse(f.disk.get(f.key)).length, 1);
});

test('a related lifecycle batch is one durable write and replays every entity after restart', async () => {
  const f = fixture(); await f.queueHooks.settle();
  const changes = [
    { id: 'cycle', type: 'cycle', action: 'create', data: { id: 'cycle', cycleName: 'New cycle', status: 'active' } },
    { id: 'physical', type: 'physicalPond', action: 'update', data: { id: 'physical', pondName: 'A1', status: 'active', activePondId: 'new-pond' } },
    { id: 'new-pond', type: 'pond', action: 'create', data: { id: 'new-pond', pondName: 'A1', physicalPondId: 'physical', cycleId: 'cycle', samplings: [] } },
  ];
  assert.equal((await f.queue.addPendingChanges(changes)).success, true);
  assert.equal(f.writes.length, 1);
  const restored = fixture({ stored: JSON.parse(f.disk.get(f.key)) });
  await restored.queueHooks.settle();
  assert.equal(restored.state.cycles[0].id, 'cycle');
  assert.equal(restored.state.physicalPonds[0].activePondId, 'new-pond');
  assert.equal(restored.state.ponds.find(pond => pond.id === 'new-pond').cycleId, 'cycle');
  f.queueHooks.unmount(); restored.queueHooks.unmount();
});

test('a failed lifecycle batch accepts none of its related operations', async () => {
  const f = fixture({ write: async () => { throw new Error('Disk full'); } });
  await f.queueHooks.settle();
  assert.equal((await f.queue.addPendingChanges([operation('one'), operation('two')])).success, false);
  assert.equal(f.queue.pendingChangesRef.current.length, 0);
  assert.deepEqual(JSON.parse(f.disk.get(f.key)), []);
  f.queueHooks.unmount();
});
