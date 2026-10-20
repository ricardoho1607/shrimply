const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Small hook runner: renders can be inspected before effects, as during a scope switch.
function fixture(hookName, ...args) {
  let auth = { user: { uid: 'staff', companyId: 'a' }, company: { id: 'a' } };
  let index = 0;
  const slots = [], effects = [], listeners = [], pendingReads = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useState(initial) {
      const i = index++;
      if (!slots[i]) slots[i] = { value: typeof initial === 'function' ? initial() : initial };
      return [slots[i].value, value => { slots[i].value = typeof value === 'function' ? value(slots[i].value) : value; }];
    },
    useRef(value) { const i = index++; return slots[i] ||= { current: value }; },
    useMemo(fn, deps) { const i = index++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { value: fn(), deps }; return slots[i].value; },
    useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
    useEffect(fn, deps) {
      const i = index++;
      if (!slots[i] || !same(slots[i].deps, deps)) {
        const previous = slots[i];
        slots[i] = { deps, fn, cleanup: previous?.cleanup };
        effects.push(() => { previous?.cleanup?.(); slots[i].cleanup = fn(); });
      }
    },
  };
  const sdk = {
    collection: (_db, ...parts) => ({ path: parts.join('/') }),
    doc: (_db, ...parts) => ({ path: parts.join('/') }),
    query: (ref, ...constraints) => ({ ...ref, constraints }),
    where: (...args) => ({ where: args }), orderBy: (...args) => ({ orderBy: args }),
    limit: value => ({ limit: value }), startAfter: value => ({ startAfter: value }),
    onSnapshot(ref, ...callbacks) {
      if (typeof callbacks[0] !== 'function') callbacks.shift();
      const listener = { ref, next: callbacks[0], error: callbacks[1], stopped: false };
      listeners.push(listener);
      return () => { listener.stopped = true; };
    },
    getDocs(ref) { return new Promise((resolve, reject) => pendingReads.push({ ref, resolve, reject })); },
  };
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename);
    const mod = { exports: {} };
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    new Function('require', 'exports', 'module', code)(name => {
      if (name === 'react') return react;
      if (name === 'firebase/firestore') return sdk;
      if (name === '@/lib/firebase') return { db: {} };
      if (name === '@/contexts/AuthContext') return { useAuth: () => auth };
      if (name.endsWith('shared/operationalSummary')) return { isOperationalSummaryFresh: () => true };
      if (name.endsWith('shared/harvestCalculations')) return require('../../../shared/harvestCalculations.ts');
      if (name.startsWith('./')) return load(path.resolve(path.dirname(filename), name + '.ts'));
      throw new Error(`Unexpected dependency ${name}`);
    }, mod.exports, mod);
    cache.set(filename, mod.exports);
    return mod.exports;
  }
  const hooks = load(path.join(__dirname, 'useDashboardData.ts'));
  const render = () => { index = 0; return hooks[hookName](...args); };
  const flush = async () => { effects.splice(0).forEach(fn => fn()); await Promise.resolve(); return render(); };
  const snapshot = (ids) => ({ docs: ids.map(id => ({ id, data: () => ({ date: '2026-10-13' }) })), size: ids.length });
  return { render, flush, listeners, pendingReads, snapshot,
    switchCompany(id, uid = 'staff') { auth = id ? { user: { uid, companyId: id }, company: { id } } : { user: null, company: { id: 'a' } }; },
    setCompanyDocument(id) { auth = { ...auth, company: id ? { id } : null }; },
    replayEffects() { slots.forEach(slot => { if (slot?.fn) { slot.cleanup?.(); slot.cleanup = slot.fn(); } }); },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}

for (const [hook, fields] of [
  ['useCompanyPonds', ['data']], ['useCompanyMembers', ['data']],
  ['useFinanceRecords', ['expenses', 'revenues']], ['useInventoryFeeds', ['feeds', 'additives', 'ponds']],
  ['useCompanyNotifications', ['data']], ['useCompanyAssets', ['data']],
  ['useCompanyLabReports', ['data']], ['useCompanyCycles', ['data']],
]) {
  test(`${hook}: company switch hides old data before effects and ignores late snapshots/errors`, async () => {
    const f = fixture(hook);
    f.render(); await f.flush();
    const old = [...f.listeners];
    old.forEach((listener, i) => listener.next(f.snapshot([`a-${i}`])));
    let value = f.render();
    fields.forEach(field => assert.ok(value[field].length));
    f.switchCompany('b');
    value = f.render();
    fields.forEach(field => assert.equal(value[field].length, 0, `${field} leaked from company a`));
    await f.flush();
    assert.ok(old.every(listener => listener.stopped));
    const current = f.listeners.filter(listener => !listener.stopped);
    current.forEach((listener, i) => listener.next(f.snapshot([`b-${i}`])));
    old.forEach(listener => { listener.next(f.snapshot(['stale'])); listener.error(new Error('late error')); });
    value = f.render();
    fields.forEach(field => assert.ok(value[field].every(row => row.id.startsWith('b-'))));
    assert.equal(value.error, null);
    f.unmount();
    assert.ok(f.listeners.every(listener => listener.stopped));
  });
}

test('sign-out ignores a lingering company object, and same-company user changes reset data', async () => {
  const f = fixture('useCompanyPonds'); f.render(); await f.flush();
  f.listeners[0].next(f.snapshot(['private']));
  f.switchCompany('a', 'other-user');
  assert.equal(f.render().data.length, 0);
  await f.flush();
  f.listeners.at(-1).next(f.snapshot(['other-private']));
  f.switchCompany(null);
  const value = f.render();
  assert.equal(value.company, null);
  assert.equal(value.companyId, null);
  assert.equal(value.data.length, 0);
  assert.equal(value.loading, false);
  await f.flush();
  assert.ok(f.listeners.every(listener => listener.stopped));
});

test('permission errors clear previously loaded company records', async () => {
  const f = fixture('useCompanyPonds'); f.render(); await f.flush();
  f.listeners[0].next(f.snapshot(['private']));
  f.listeners[0].error(new Error('permission denied'));
  const value = f.render();
  assert.equal(value.data.length, 0);
  assert.match(value.error.message, /permission denied/);
  assert.equal(value.loading, false);
});

test('notification pagination cannot append another company’s delayed results', async () => {
  const f = fixture('useCompanyNotifications'); f.render(); await f.flush();
  f.listeners[0].next(f.snapshot(Array.from({ length: 50 }, (_, i) => `a-${i}`)));
  const loading = f.render().loadMore();
  f.switchCompany('b'); f.render(); await f.flush();
  f.listeners.at(-1).next(f.snapshot(['b-1']));
  f.pendingReads[0].resolve(f.snapshot(['a-older']));
  await loading;
  assert.deepEqual(f.render().data.map(row => row.id), ['b-1']);
  assert.equal(f.render().loadingMore, false);
});

for (const hook of ['useCompanyPonds', 'useCompanyNotifications']) {
  test(`${hook}: effect replay and repeated renders leave exactly one live listener`, async () => {
    const f = fixture(hook); f.render(); await f.flush();
    const old = f.listeners[0];
    f.replayEffects();
    const current = f.listeners.filter(item => !item.stopped).find(item => hook !== 'useCompanyPonds' || item.ref.path.endsWith('/ponds'));
    current.next(f.snapshot(['current']));
    old.next(f.snapshot(['stale']));
    old.error(new Error('stopped listener'));
    for (let i = 0; i < 3; i++) { f.render(); await f.flush(); }
    assert.deepEqual(f.render().data.map(row => row.id), ['current']);
    assert.equal(f.listeners.filter(item => !item.stopped).length, hook === 'useCompanyPonds' ? 2 : 1);
    f.unmount();
    assert.equal(f.listeners.filter(item => !item.stopped).length, 0);
  });
}

test('finance waits for both streams and keeps company-local partial results on one stream error', async () => {
  const f = fixture('useFinanceRecords'); f.render(); await f.flush();
  f.listeners[0].next(f.snapshot(['expense']));
  assert.equal(f.render().loading, true);
  f.listeners[1].error(new Error('revenue denied'));
  const value = f.render();
  assert.equal(value.loading, false);
  assert.equal(value.expenses.length, 1);
  assert.equal(value.revenues.length, 0);
  assert.match(value.error.message, /revenue denied/);
});

test('disabled cycle queries do not subscribe (mechanic asset view)', async () => {
  const f = fixture('useCompanyCycles', 'asc', false); f.render(); await f.flush();
  assert.equal(f.listeners.length, 0);
  assert.equal(f.render().loading, false);
  assert.deepEqual(f.render().data, []);
});

test('lab PDF quota state resets on company changes and ignores late document snapshots', async () => {
  const f = fixture('useCompanyLabPdfUsage'); f.render(); await f.flush();
  const old = f.listeners[0];
  old.next({ data: () => ({ water_quality: { requestCount: 4 } }) });
  assert.equal(f.render().data.water_quality.requestCount, 4);
  f.switchCompany('b');
  assert.deepEqual(f.render().data, {});
  await f.flush();
  f.listeners.at(-1).next({ data: () => ({ water_quality: { requestCount: 1 } }) });
  old.next({ data: () => ({ water_quality: { requestCount: 99 } }) });
  assert.equal(f.render().data.water_quality.requestCount, 1);
});

test('unread summary and fallback listeners stop on company switch and cannot restart afterward', async () => {
  const f = fixture('useUnreadNotificationsCount'); f.render(); await f.flush();
  const oldSummary = f.listeners[0];
  oldSummary.next({ exists: () => false, data: () => null, metadata: { fromCache: false } });
  const oldFallback = f.listeners[1]; oldFallback.next({ size: 8 });
  assert.equal(f.render(), 8);
  oldSummary.next({ exists: () => true, data: () => ({ unreadNotificationCount: 2 }) });
  oldFallback.next({ size: 99 });
  assert.equal(f.render(), 2);
  assert.equal(oldFallback.stopped, true);
  f.switchCompany('b'); assert.equal(f.render(), 0); await f.flush();
  const count = f.listeners.length;
  oldSummary.error(new Error('late error'));
  oldFallback.next({ size: 99 });
  assert.equal(f.listeners.length, count);
  assert.equal(f.render(), 0);
  f.unmount(); assert.ok(f.listeners.every(item => item.stopped));
});

test('notification pagination retains local edits, deduplicates updates and uses its own cursor', async () => {
  const f = fixture('useCompanyNotifications'); f.render(); await f.flush();
  const first = Array.from({ length: 50 }, (_, i) => `n-${i}`);
  f.listeners[0].next(f.snapshot(first));
  const more = f.render().loadMore();
  assert.equal(f.pendingReads[0].ref.constraints.find(c => c.startAfter).startAfter.id, 'n-49');
  f.pendingReads[0].resolve(f.snapshot(['n-49', 'older'])); await more;
  f.render().updateLocalItem('older', { read: true });
  f.listeners[0].next(f.snapshot(first));
  let value = f.render();
  assert.equal(value.data.filter(item => item.id === 'n-49').length, 1);
  assert.equal(value.data.find(item => item.id === 'older').read, true);
  assert.equal(value.hasMore, false);
  value.removeLocalItem('older');
  assert.equal(f.render().data.some(item => item.id === 'older'), false);
  f.render().clearLocalItems(); assert.equal(f.render().data.length, 0);
});

test('company queries wait for matching metadata before exposing records to role/block filters', async () => {
  const f = fixture('useCompanyPonds'); f.render(); await f.flush();
  f.listeners[0].next(f.snapshot(['a-private']));
  f.switchCompany('b'); f.setCompanyDocument('a');
  const transition = f.render();
  assert.equal(transition.companyId, null);
  assert.equal(transition.company, null);
  assert.deepEqual(transition.data, []);
  await f.flush();
  assert.ok(f.listeners.every(item => item.stopped));
  f.setCompanyDocument('b'); f.render(); await f.flush();
  assert.ok(f.listeners.some(item => !item.stopped && item.ref.path === 'companies/b/ponds'));
});
