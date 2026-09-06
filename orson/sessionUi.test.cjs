const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { createRequire } = require('node:module');
const path = require('node:path');

// Render the real component with disposable identities and controllable snapshots/requests.
const setup = () => {
  let authState;
  let current;
  let instance;
  let view;
  const requests = [];
  const snapshots = [];
  const timers = new Set();
  const storage = new Map();
  const auth = { currentUser: null };
  class OrsonSessionChangedError extends Error {}
  class OrsonIncompleteResponseError extends Error {
    constructor(partialText, finishReason) { super('Orson response was incomplete.'); this.partialText = partialText; this.finishReason = finishReason; }
  }
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState: initial => {
      const owner = current, index = owner.cursor++;
      if (!(index in owner.hooks)) owner.hooks[index] = typeof initial === 'function' ? initial() : initial;
      return [owner.hooks[index], next => { owner.hooks[index] = typeof next === 'function' ? next(owner.hooks[index]) : next; }];
    },
    useRef: initial => { const owner = current, index = owner.cursor++; return owner.hooks[index] ||= { current: initial }; },
    useEffect: (effect, deps) => {
      const owner = current, index = owner.cursor++, previous = owner.hooks[index];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
        owner.pending.push(() => { previous?.cleanup?.(); owner.hooks[index] = { deps, cleanup: effect() }; });
      }
    },
  };
  const filename = path.resolve(__dirname, '../web/src/app/dashboard/ai/page.tsx');
  const localRequire = createRequire(filename);
  const source = process.env.SHRIMPLY_QA_BASELINE
    ? require('node:child_process').execFileSync('git', ['show', 'HEAD:web/src/app/dashboard/ai/page.tsx'], { encoding: 'utf8' })
    : fs.readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.React,
    esModuleInterop: true,
    target: ts.ScriptTarget.ES2020,
  } }).outputText;
  const mockedRequire = name => {
    if (name === 'react') return react;
    if (name === 'lucide-react') return new Proxy({}, { get: (_, key) => String(key) });
    if (name === '@/contexts/AuthContext') return { useAuth: () => authState };
    if (name === '@/hooks/useDashboardCopy') return { useDashboardCopy: () => value => value };
    if (name === '@/lib/firebase') return { auth, db: {} };
    if (name === 'firebase/auth') return { onAuthStateChanged: (_, callback) => { callback(auth.currentUser); return () => {}; } };
    if (name === 'firebase/firestore') return {
      collection: (_, ...parts) => parts, doc: (_, ...parts) => parts,
      onSnapshot: (ref, callback) => { snapshots.push({ ref, callback }); return () => {}; },
    };
    if (name === '@/hooks/useGemini') return { useGemini: () => ({
      loading: false, clearChat() {}, error: null,
      sendMessage: (question, ponds, options) => new Promise((resolve, reject) => requests.push({ question, ponds, options, resolve, reject })),
    }) };
    if (name.endsWith('/orson/session')) return { OrsonSessionChangedError, orsonIdentityKey: (uid, companyId) => uid && companyId ? `${uid}:${companyId}` : null };
    if (name.endsWith('/orson/responseCompletion')) return { OrsonIncompleteResponseError };
    if (name === '@/hooks/useFarmPermissions') return { useFarmPermissions: () => () => true };
    return localRequire(name);
  };
  const loaded = { exports: {} };
  const window = { setTimeout: callback => { timers.add(callback); return callback; }, clearTimeout: callback => timers.delete(callback), confirm: () => true };
  const sessionStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  new Function('require', 'module', 'exports', 'window', 'sessionStorage', compiled)(mockedRequire, loaded, loaded.exports, window, sessionStorage);
  const makeInstance = () => ({ hooks: [], pending: [], cursor: 0 });
  const root = makeInstance();
  const cleanup = owner => owner?.hooks.forEach(hook => hook?.cleanup?.());
  const renderWith = (owner, Component, props) => {
    current = owner; owner.cursor = 0;
    const element = Component(props);
    owner.pending.splice(0).forEach(run => run());
    return element;
  };
  const render = () => {
    const child = renderWith(root, loaded.exports.default, {});
    if (child && typeof child.type === 'function') {
      if (!instance || instance.key !== child.props.key) { cleanup(instance); instance = { ...makeInstance(), key: child.props.key }; }
      view = renderWith(instance, child.type, child.props);
    } else { cleanup(instance); instance = null; view = child; }
    return view;
  };
  const elements = (node = view) => !node || typeof node !== 'object' ? [] : [node, ...(node.props?.children || []).flat(Infinity).filter(child => child !== undefined).flatMap(elements)];
  const text = (node = view) => typeof node === 'string' ? node : !node || typeof node !== 'object' ? '' : (node.props?.children || []).flat(Infinity).filter(child => child !== undefined).map(text).join(' ');
  const signIn = (uid, companyId) => {
    auth.currentUser = uid ? { uid } : null;
    authState = { user: uid ? { uid, companyId } : null, company: companyId ? { id: companyId } : null, loading: false, companyLoading: false };
    render();
    snapshots.filter(entry => entry.ref.at(-1) === 'ponds').forEach(entry => entry.callback({ docs: [{ id: `${companyId}-pond`, data: () => ({ pondName: `${companyId}-pond` }) }] }));
    render();
  };
  const send = async message => {
    elements().find(node => node.type === 'textarea').props.onChange({ target: { value: message } });
    render();
    elements().find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
    render();
    await Promise.resolve();
  };
  return { storage, signIn, render, send, requests, text, elements, OrsonIncompleteResponseError, reload: () => { cleanup(instance); instance = null; signIn(authState.user.uid, authState.company.id); }, flush: () => { [...timers].forEach(callback => callback()); timers.clear(); } };
};

test('legacy unscoped chat is never displayed or sent by a new account', async () => {
  const ui = setup();
  ui.storage.set('orson_messages', JSON.stringify([{ id: 'private', type: 'ai', message: 'A private measurements', timestamp: '2026-09-01' }]));
  ui.signIn('B', 'company-B');
  assert.ok(!ui.text().includes('A private measurements'));
  await ui.send('General feeding question');
  assert.ok(!JSON.stringify(ui.requests[0].options).includes('A private measurements'));
});

test('account/company changes cancel delayed saves and ignore in-flight replies', async () => {
  for (const sameUser of [false, true]) {
    const ui = setup();
    ui.signIn('A', 'company-A');
    await ui.send('A private measurements');
    const old = ui.requests[0];
    if (!sameUser) ui.signIn(null, null);
    ui.signIn(sameUser ? 'A' : 'B', 'company-B');
    old.options.onPartialResponse('A delayed private reply');
    old.resolve('A final private reply');
    await Promise.resolve();
    ui.render(); ui.flush();
    assert.ok(!ui.text().includes('private'));
    await ui.send('B question');
    const sent = ui.requests.at(-1);
    assert.equal(sent.options.companyId, 'company-B');
    assert.ok(!JSON.stringify(sent).includes('private'));
    assert.ok([...ui.storage].filter(([key]) => key.includes('company-B')).every(([, value]) => !value.includes('private')));
  }
});

test('a successful delayed final chunk never shows an interruption state', async () => {
  const ui = setup();
  ui.signIn('A', 'company-A');
  await ui.send('What does nitrite mean?');
  const request = ui.requests[0];
  request.options.onPartialResponse('Orson is still completing this answer');
  ui.render();
  assert.ok(ui.text().includes('Orson is still completing this answer'));
  assert.ok(!ui.text().includes('Response interrupted.'));
  assert.equal(ui.elements().filter(node => node.type === 'button' && node.props.children.includes('Retry')).length, 0);
  request.resolve('Orson completed the answer.');
  await Promise.resolve();
  ui.render();
  assert.ok(ui.text().includes('Orson completed the answer.'));
  assert.ok(!ui.text().includes('Response interrupted.'));
});


test('refresh restores only scoped history and retry replaces an incomplete bubble', async () => {
  const ui = setup();
  ui.signIn('A', 'company-A');
  await ui.send('How should I feed?');
  const request = ui.requests[0];
  request.options.onPartialResponse('Incomplete answer');
  request.reject(new ui.OrsonIncompleteResponseError('Incomplete answer', 'MAX_TOKENS'));
  await Promise.resolve();
  ui.render(); ui.flush(); ui.reload();
  assert.ok(ui.text().includes('Incomplete answer'));
  assert.ok(ui.text().includes('Response interrupted.'));
  const retry = ui.elements().find(node => node.type === 'button' && node.props.children.includes('Retry'));
  const retryPromise = retry.props.onClick();
  const next = ui.requests.at(-1);
  assert.ok(!JSON.stringify(next.options.conversationHistory).includes('Incomplete answer'));
  next.resolve('Complete answer.');
  await retryPromise;
  ui.render();
  assert.ok(!ui.text().includes('Incomplete answer'));
  assert.equal(ui.text().split('Complete answer.').length - 1, 1);
  assert.ok(!ui.text().includes('Response interrupted.'));
});
