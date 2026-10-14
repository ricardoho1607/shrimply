const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { createRequire } = require('node:module');
const localRequire = createRequire(path.join(__dirname, 'useSopWorkspace.ts'));
const root = path.resolve(__dirname, '../../..');
function harness() {
  const cells = [], effects = [], events = new Map(), cache = new Map(), subscriptions = [], calls = [];
  let cursor = 0, dirty = true, client, delay;
  const auth = { user: { uid: 'owner', role: 'owner' }, company: { id: 'farm', ownerId: 'owner', businessSize: 'enterprise' } };
  const depsEqual = (a, b) => a && b && a.length === b.length && a.every((value, index) => value === b[index]);
  const react = {
    useState(initial) { const index = cursor++; cells[index] ||= { value: typeof initial === 'function' ? initial() : initial }; return [cells[index].value, value => { cells[index].value = typeof value === 'function' ? value(cells[index].value) : value; dirty = true; }]; },
    useRef(initial) { const index = cursor++; cells[index] ||= { current: initial }; return cells[index]; },
    useCallback(callback, deps) { const index = cursor++; if (!depsEqual(cells[index]?.deps, deps)) cells[index] = { value: callback, deps }; return cells[index].value; },
    useEffect(callback, deps) { const index = cursor++; if (!depsEqual(cells[index]?.deps, deps)) { const old = cells[index]; cells[index] = { deps, cleanup: old?.cleanup }; effects.push(() => { old?.cleanup?.(); cells[index].cleanup = callback(); }); } },
  };
  const snapshot = () => ({ ...localRequire(path.join(root, 'shared/sop/client.ts')).emptySopWorkspace(), compact: true, manage: auth.user.role === 'owner', nextActiveTaskCursor: '__first__', refreshedAt: Date.now(), sops: [{ id: 'guide' }], tasks: [{ id: 'history', status: 'completed', revision: 1, target: { scope: 'company' } }] });
  const callable = async (_, name, data) => {
    calls.push({ name, data });
    if (delay) { const pending = delay; delay = null; return pending; }
    if (name === 'getSopWorkspace' && data.taskUpdates === true) return { items: [{ id: 'active', status: 'completed', revision: 4, target: { scope: 'company' } }], removedIds: [] };
    return data.statusOnly ? { refreshedAt: Date.now(), notificationDelta: true, issueDelta: true, notifications: [], issues: [], manage: auth.user.role === 'owner', blocks: [] } : snapshot();
  };
  const firestore = { collection: (_, ...parts) => ({ parts }), query: (ref, ...constraints) => ({ ref, constraints }), where: (...args) => args, orderBy: (...args) => args, limit: n => n,
    onSnapshot: (query, next) => { const entry = { query, next, stopped: false }; subscriptions.push(entry); return () => { entry.stopped = true; }; } };
  const context = { module: { exports: {} }, exports: {}, console, setTimeout, clearTimeout, navigator: { onLine: true },
    localStorage: { getItem: key => cache.get(key) || null, setItem: (key, value) => cache.set(key, value), removeItem: key => cache.delete(key) },
    document: { visibilityState: 'visible', addEventListener: (name, fn) => events.set(name, fn), removeEventListener: name => events.delete(name) },
    window: { setInterval: fn => { events.set('poll', fn); return 1; }, clearInterval: () => events.delete('poll'), addEventListener: (name, fn) => events.set(name, fn), removeEventListener: name => events.delete(name) },
    require: name => {
      if (name === 'react') return react;
      if (name === 'firebase/firestore') return firestore;
      if (name === 'firebase/functions') return { getFunctions: () => ({}) };
      if (name === 'firebase/storage') return {};
      if (name === '@/lib/firebase') return { db: { app: {} }, storage: {} };
      if (name === '@/contexts/AuthContext') return { useAuth: () => auth };
      if (name.includes('sop/callable')) return { callSopFunction: callable };
      if (name === '@/lib/sopOfflineFiles') return { resolveSopFiles: async () => [], removeSopFiles: async () => {} };
      return localRequire(name);
    },
  };
  context.exports = context.module.exports;
  const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, 'useSopWorkspace.ts'), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(compiled, context);
  const settle = async () => {
    for (let index = 0; index < 25; index++) {
      if (dirty) { dirty = false; cursor = 0; client = context.module.exports.useSopWorkspace(); while (effects.length) effects.shift()(); }
      await Promise.resolve(); await Promise.resolve();
      if (!dirty && index > 5) break;
    }
  };
  const emit = (changes) => { const docs = changes.filter(change => change.type !== 'removed').map(change => change.doc); subscriptions.filter(entry => !entry.stopped).forEach(entry => entry.next({ docs, size: docs.length, docChanges: () => changes })); };
  const item = (type, status = 'open', revision = 3) => ({ type, doc: { id: 'active', data: () => ({ status, revision, target: { scope: 'company' } }) } });
  const cleanup = () => cells.forEach(cell => cell?.cleanup?.());
  return { settle, emit, item, calls, auth, cleanup, snapshot, get client() { return client; },
    rerender: () => { dirty = true; }, delayNext: promise => { delay = promise; } };
}
test('task events and routine refreshes retain active work without reloading metadata; simultaneous refreshes coalesce', async t => {
  const h = harness(); t.after(h.cleanup); await h.settle();
  assert.equal(h.calls.length, 1);
  h.emit([h.item('added')]); await h.settle();
  assert.equal(h.client.workspace.tasks.find(task => task.id === 'active').status, 'open');
  await h.client.refresh(); await h.settle();
  assert.ok(h.client.workspace.tasks.some(task => task.id === 'active'), 'Manual refresh must not erase unchanged active tasks');
  const before = h.calls.length;
  await Promise.all([h.client.refresh(false), h.client.refresh(false)]); await h.settle();
  assert.equal(h.calls.length, before + 1);
  assert.equal(h.calls.at(-1).data.statusOnly, true);
  assert.ok(h.client.workspace.tasks.some(task => task.id === 'active'));
  h.emit([h.item('removed')]);
  await new Promise(resolve => setTimeout(resolve, 850)); await h.settle();
  assert.ok(h.calls.some(call => call.name === 'getSopWorkspace' && call.data.taskUpdates === true));
  assert.equal(h.client.workspace.tasks.find(task => task.id === 'active').status, 'completed', 'Query removals must obtain the current task instead of guessing completion');
});
test('a delayed response from the previous role cannot restore its workspace after access changes', async t => {
  const h = harness(); t.after(h.cleanup); await h.settle();
  let resolve;
  h.delayNext(new Promise(done => { resolve = done; }));
  const oldRequest = h.client.refresh();
  h.auth.user = { uid: 'owner', role: 'technician' }; h.auth.company = { ...h.auth.company, ownerId: 'other' };
  h.rerender(); await h.settle();
  assert.equal(h.client.workspace.manage, false);
  resolve({ ...h.snapshot(), manage: true, sops: [{ id: 'stale-owner-response' }] });
  await oldRequest; await h.settle();
  assert.equal(h.client.workspace.manage, false);
  assert.ok(!h.client.workspace.sops.some(guide => guide.id === 'stale-owner-response'));
});
