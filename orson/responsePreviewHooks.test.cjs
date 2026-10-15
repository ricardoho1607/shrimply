require('../scripts/register-typescript.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const ts = require('typescript');
const { buildOrsonAnalysis } = require('./pipeline.ts');

const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const tickUntil = async predicate => { for (let i = 0; i < 20 && !predicate(); i++) await new Promise(setImmediate); assert.ok(predicate(), 'expected request boundary was reached'); };
const ponds = [{ id: 'p1', pondName: 'A1', cycleStatus: 'active', docStartDate: '2026-09-01', records: [
  { id: 'w1', type: 'water_quality', date: '2026-09-02', doMorning: 3.2, doEvening: 5.7 },
] }];
const question = 'Why is oxygen low in A1?';
const finalResponse = { text: 'Final checked answer.', finishReason: 'STOP', safeToCache: true };

function setup(kind, { mortality = false, exact = false, cached = false } = {}) {
  const analysis = buildOrsonAnalysis(ponds, question, new Date('2026-09-05T00:00:00Z'), null, undefined, 'Asia/Jakarta');
  analysis.promptPackage.cacheKey = 'fixture-key';
  if (exact) analysis.promptPackage.exactRecordAnswer = 'Exact saved answer.';
  // Isolate the hook's remote-context ordering from the independent question classifier.
  if (mortality) analysis.diagnosticRequest = { requested: true, status: 'selected', pondId: 'p1' };
  const model = deferred(), context = deferred();
  const calls = [], writes = [], reads = [], events = [], state = [], cleanups = [];
  const auth = { currentUser: { uid: 'u1' } };
  const storage = new Map();
  const cacheKey = 'orson_cache_orson_cache_v3:u1:c1:fixture-key';
  if (cached) storage.set(cacheKey, JSON.stringify({ timestamp: Date.now(), text: 'Cached answer.' }));
  let cursor = 0;
  const react = {
    useState(initial) { const index = cursor++; if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial; return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }]; },
    useRef(initial) { const index = cursor++; return state[index] ||= { current: initial }; },
    useEffect(effect, deps) { const index = cursor++; if (!state[index] || deps.some((dep, i) => dep !== state[index][i])) { state[index] = deps; const cleanup = effect(); if (cleanup) cleanups.push(cleanup); } },
  };
  const storageApi = {
    getItem(key) { reads.push(key); return storage.get(key) || null; },
    setItem(key, value) { writes.push(value); storage.set(key, value); },
  };
  const filename = path.resolve(__dirname, kind === 'mobile' ? '../app/hooks/useGemini.ts' : '../web/src/hooks/useGemini.ts');
  const localRequire = createRequire(filename);
  const mockedRequire = name => {
    if (name === 'react') return react;
    if (name.endsWith('/AuthContext')) return { useAuth: () => ({ user: { uid: 'u1', companyId: 'c1' }, company: { id: 'c1' }, loading: false }) };
    if (name === 'firebase/auth') return { getAuth: () => auth };
    if (name === 'firebase/functions') return { getFunctions: () => ({}), httpsCallable: (_, name) => {
      const call = async request => {
        calls.push({ name, request }); events.push(name);
        assert.equal(name, 'getOrsonMortalityContext');
        return { data: await context.promise };
      };
      call.stream = async request => {
        calls.push({ name, request }); events.push(name);
        return { stream: (async function* () { await model.promise; })(), data: model.promise };
      };
      return call;
    } };
    if (name === 'firebase/firestore') return { doc: () => ({}), getDoc: () => { throw new Error('Unexpected extra Firestore read'); } };
    if (name.endsWith('/firebase')) return { __esModule: true, default: {}, app: {}, db: {} };
    if (name.endsWith('/orson/pipeline')) return { buildOrsonAnalysis: () => analysis };
    if (name === '@react-native-async-storage/async-storage') return { __esModule: true, default: {
      getItem: async key => storageApi.getItem(key), setItem: async (key, value) => storageApi.setItem(key, value),
    } };
    if (name === '@/lib/orsonAiUsage') return require('./aiUsage.ts');
    if (name === '@/lib/asyncUtils') return { getErrorMessage: error => error.message, withTimeout: async promise => promise };
    return localRequire(name);
  };
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', 'window', 'localStorage', 'console', compiled)(
    mockedRequire, loaded, loaded.exports, {}, storageApi, { info() {}, warn() {}, error() {} });
  const render = () => { cursor = 0; return loaded.exports.useGemini(); };
  let hook = render();
  const options = { companyId: 'c1', calibration: null,
    onPreview(value) { events.push('preview'); }, onPartialResponse(value) { events.push('answer'); },
  };
  return { analysis, calls, writes, reads, events, auth, model, context, options, render,
    send: extra => hook.sendMessage(question, ponds, { ...options, ...extra }),
    finish() { context.resolve({ pondId: 'p1', labHistory: [], treatments: [], harvests: [] }); model.resolve(finalResponse); },
    cleanup() { this.finish(); hook.clearChat(); cleanups.forEach(cleanup => cleanup()); },
  };
}

for (const kind of ['mobile', 'web']) {
  test(`${kind}: saved preview arrives before the model finishes, without extra requests or saved preview text`, async t => {
    const h = setup(kind); t.after(() => h.cleanup());
    const pending = h.send();
    await tickUntil(() => h.calls.some(call => call.name === 'generateOrsonResponse'));
    assert.equal(h.events[0], 'preview');
    assert.equal(h.calls.length, 1);
    assert.equal(h.reads.length, 1, 'same initial/final cache key must reuse the single lookup');
    assert.equal(h.writes.length, 0);
    h.finish(); assert.equal(await pending, finalResponse.text);
    assert.ok(h.writes.every(value => !value.includes('Saved records for')));
    assert.ok(!JSON.stringify(h.calls).includes('Saved records for'));
    assert.ok(!JSON.stringify(h.render().chatHistory).includes('Saved records for'));
  });

  test(`${kind}: preview is delivered before an existing remote context wait`, async t => {
    const h = setup(kind, { mortality: true }); t.after(() => h.cleanup());
    const pending = h.send();
    await tickUntil(() => h.calls.some(call => call.name === 'getOrsonMortalityContext'));
    assert.deepEqual(h.events, ['preview', 'getOrsonMortalityContext']);
    assert.equal(h.calls.filter(call => call.name === 'generateOrsonResponse').length, 0);
    h.context.resolve({ pondId: 'p1', labHistory: [], treatments: [], harvests: [] });
    await tickUntil(() => h.calls.some(call => call.name === 'generateOrsonResponse'));
    h.model.resolve(finalResponse); await pending;
    assert.equal(h.events.filter(event => event === 'preview').length, 1);
    assert.equal(h.calls.filter(call => call.name === 'generateOrsonResponse').length, 1);
  });

  test(`${kind}: exact and cache hits avoid previews and model calls`, async t => {
    for (const mode of ['exact', 'cached']) {
      const h = setup(kind, { [mode]: true }); t.after(() => h.cleanup());
      const answer = await h.send();
      assert.equal(answer, mode === 'exact' ? 'Exact saved answer.' : 'Cached answer.');
      assert.ok(!h.events.includes('preview'));
      assert.equal(h.calls.length, 0);
    }
  });
}
