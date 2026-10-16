const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { createRequire } = require('node:module');
const path = require('node:path');

// Render the real component with disposable identities and controllable snapshots/requests.
const setup = (kind = 'web') => {
  let authState;
  let current;
  let instance;
  let view;
  let hookLoading = false;
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
    useCallback: callback => callback,
    useMemo: factory => factory(),
    useRef: initial => { const owner = current, index = owner.cursor++; return owner.hooks[index] ||= { current: initial }; },
    useEffect: (effect, deps) => {
      const owner = current, index = owner.cursor++, previous = owner.hooks[index];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
        owner.pending.push(() => { previous?.cleanup?.(); owner.hooks[index] = { deps, cleanup: effect() }; });
      }
    },
  };
  const filename = path.resolve(__dirname, kind === 'mobile' ? '../app/AIChat.tsx' : '../web/src/app/dashboard/ai/page.tsx');
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
    if (name === 'react-native') return new Proxy({
      StyleSheet: { create: value => value }, Platform: { OS: 'ios' },
      Alert: { alert: (_, __, actions) => actions.find(action => action.text === 'Clear')?.onPress() },
    }, { get: (object, key) => object[key] || String(key) });
    if (name === '@expo/vector-icons/Ionicons') return { __esModule: true, default: 'Icon' };
    if (name === 'expo-router') return { useRouter: () => ({ back() {} }) };
    if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ bottom: 0 }) };
    if (name === '@react-native-async-storage/async-storage' || name === '@react-native-community/netinfo') return { __esModule: true, default: {} };
    if (name === './store/pondStore') return { isPondCycleActive: () => true, usePondStore: () => ({
      currentCompanyId: authState.company?.id, farmCacheUserId: authState.user?.uid,
      ponds: [{ id: 'pond-1', pondName: 'A1' }],
    }) };
    if (name === '../shared/permissions') return { hasFarmPermission: () => true };
    if (name === '../config/firebase') return { __esModule: true, default: {}, auth };
    if (name === '../context/AuthContext') return { useAuth: () => authState };
    if (name === './components/OrsonAgentCards' || name === './components/OrsonAgentInput') return { __esModule: true, default: 'AgentTools' };
    if (name.startsWith('@/components/orson/')) return { __esModule: true, default: name };
    if (name.endsWith('/orson/useAgentOperations')) return { useAgentOperations: () => ({ busy: false, operations: [], activity: null, elapsed: 0, onActivity() {}, receive() {}, clearActivity() {} }) };
    if (name === 'lucide-react') return new Proxy({}, { get: (_, key) => String(key) });
    if (name === '@/contexts/AuthContext') return { useAuth: () => authState };
    if (name === '@/contexts/LanguageContext') return { useLanguage: () => ({ currentLanguage: 'en' }) };
    if (name === '@/hooks/useDashboardCopy') return { useDashboardCopy: () => value => value };
    if (name === '@/lib/firebase') return { auth, db: {} };
    if (name === 'firebase/auth') return { onAuthStateChanged: (_, callback) => { callback(auth.currentUser); return () => {}; } };
    if (name === 'firebase/firestore') return {
      collection: (_, ...parts) => parts, doc: (_, ...parts) => parts,
      onSnapshot: (ref, callback) => { snapshots.push({ ref, callback }); return () => {}; },
    };
    if (name === '@/hooks/useGemini' || name === './hooks/useGemini') return { useGemini: () => ({
      loading: hookLoading, clearChat() { hookLoading = false; }, error: null,
      sendMessage: (question, ponds, options) => {
        hookLoading = true;
        return new Promise((resolve, reject) => requests.push({ question, ponds, options,
          resolve: value => { hookLoading = false; resolve(value); },
          reject: error => { hookLoading = false; reject(error); },
        }));
      },
    }) };
    if (name.endsWith('/orson/session')) return { OrsonSessionChangedError, orsonIdentityKey: (uid, companyId) => uid && companyId ? `${uid}:${companyId}` : null };
    if (name.endsWith('/orson/responseCompletion')) return { OrsonIncompleteResponseError };
    if (name === '@/hooks/useFarmPermissions') return { useFarmPermissions: () => () => true };
    return localRequire(name);
  };
  const loaded = { exports: {} };
  const window = { setTimeout: callback => { timers.add(callback); return callback; }, clearTimeout: callback => timers.delete(callback), confirm: () => true };
  const sessionStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  new Function('require', 'module', 'exports', 'window', 'sessionStorage', 'setInterval', 'clearInterval', 'setTimeout', compiled)(
    mockedRequire, loaded, loaded.exports, window, sessionStorage, () => 1, () => {}, window.setTimeout);
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
    hookLoading = false;
    auth.currentUser = uid ? { uid } : null;
    authState = { user: uid ? { uid, companyId } : null, company: companyId ? { id: companyId } : null, loading: false, companyLoading: false };
    render();
    snapshots.filter(entry => entry.ref.at(-1) === 'ponds').forEach(entry => entry.callback({ docs: [{ id: `${companyId}-pond`, data: () => ({ pondName: `${companyId}-pond` }) }] }));
    render();
  };
  const send = async message => {
    if (kind === 'mobile') elements().find(node => node.type === 'TextInput').props.onChangeText(message);
    else elements().find(node => node.type === 'textarea').props.onChange({ target: { value: message } });
    render();
    if (kind === 'mobile') elements().find(node => node.props.accessibilityLabel === 'Send message').props.onPress();
    else elements().find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
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

test('farm cards stay beside their reply and a reset removes saved cards from the chat', async () => {
  const ui = setup();
  ui.signIn('A', 'company-A');
  await ui.send('Correct the saved feed price');
  const request = ui.requests[0];
  request.options.onOperation({ id: 'op-1', state: 'completed' });
  request.options.onPartialResponse('Correction ready');
  request.resolve('Review the correction');
  await Promise.resolve();
  ui.render(); ui.flush(); ui.reload();
  const cards = () => ui.elements().filter(node => node.type === '@/components/orson/AgentCards');
  assert.deepEqual(cards()[0].props.operationIds, ['op-1']);
  assert.deepEqual(cards().at(-1).props.operationIds, []);
  await ui.send('What is the current stock?');
  ui.requests[1].resolve('The stock is available.');
  await Promise.resolve();
  ui.render();
  const nodes = ui.elements();
  assert.ok(nodes.indexOf(cards()[0]) < nodes.findIndex(node => node.type === 'div' && node.props.className?.includes('is-user') && ui.text(node).includes('current stock')));
  const reset = nodes.find(node => node.type === 'button' && ui.text(node).includes('Reset'));
  reset.props.onClick();
  ui.render();
  assert.deepEqual(cards()[0].props.operationIds, []);
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

const savedPreview = { title: 'Saved-record preview', text: 'PRIVATE PREVIEW: Pond A morning DO 3.2 mg/L on 2026-09-02' };

for(const kind of ['web','mobile']) test(`${kind}: an Orson table renders cells without raw table syntax`,async()=>{
  const ui=setup(kind);ui.signIn('A','company-A');
  await ui.send('Show a pond comparison table');
  ui.requests[0].resolve('Saved readings:\n\n| Pond | Oxygen |\n| --- | --- |\n| A1 | 3.1 mg/L (2026-10-13, old) |\n| A2 | Unknown |\n\nRecheck old readings.');
  await Promise.resolve();ui.render();
  assert.ok(ui.text().includes('3.1 mg/L (2026-10-13, old)'));
  assert.ok(ui.text().includes('Recheck old readings.'));
  assert.ok(!ui.text().includes('| --- |'));
  assert.ok(ui.elements().some(node=>kind==='web'?node.type==='table':node.props.accessibilityLabel==='Pond readings table. Swipe sideways for more columns.'));
});

test('saved-record preview appears with activity, then only the answer is saved and sent', async () => {
  const ui = setup(); ui.signIn('A', 'company-A');
  await ui.send('Why is oxygen low?');
  const request = ui.requests[0];
  request.options.onPreview(savedPreview); ui.render(); ui.flush();
  assert.ok(ui.text().includes(savedPreview.text));
  assert.ok(ui.text().includes('Working on your request'));
  assert.ok([...ui.storage.values()].every(value => !value.includes('PRIVATE PREVIEW')));
  request.options.onPartialResponse(' \n '); ui.render();
  assert.ok(ui.text().includes(savedPreview.text), 'empty text must not hide the preview');
  request.options.onPartialResponse('The checked answer'); ui.render();
  assert.ok(!ui.text().includes(savedPreview.text));
  request.options.onPreview(savedPreview); ui.render();
  assert.ok(!ui.text().includes(savedPreview.text), 'late preview must not replace answer text');
  request.resolve('The complete checked answer'); await Promise.resolve(); ui.render(); ui.flush();
  request.options.onPreview(savedPreview); ui.render();
  assert.ok(!ui.text().includes(savedPreview.text));
  assert.ok([...ui.storage.values()].every(value => !value.includes('PRIVATE PREVIEW')));
  await ui.send('Next question');
  assert.ok(!JSON.stringify(ui.requests.at(-1).options.conversationHistory).includes('PRIVATE PREVIEW'));
  ui.requests.at(-1).resolve('Next answer'); await Promise.resolve();
});

test('failed requests clear previews and retry never treats them as an answer', async () => {
  const ui = setup(); ui.signIn('A', 'company-A');
  await ui.send('Why is oxygen low?');
  const request = ui.requests[0];
  request.options.onPreview(savedPreview); ui.render();
  request.reject(new ui.OrsonIncompleteResponseError('', 'TIMEOUT'));
  await Promise.resolve(); ui.render(); ui.flush();
  assert.ok(!ui.text().includes(savedPreview.text));
  assert.ok(ui.text().includes('Response interrupted.'));
  request.options.onPreview(savedPreview); ui.render();
  assert.ok(!ui.text().includes(savedPreview.text));
  const retry = ui.elements().find(node => node.type === 'button' && node.props.children.includes('Retry'));
  const retryPromise = retry.props.onClick();
  const next = ui.requests.at(-1);
  assert.ok(!JSON.stringify(next.options.conversationHistory).includes('PRIVATE PREVIEW'));
  next.resolve('Recovered answer'); await retryPromise; ui.render();
  assert.ok(ui.text().includes('Recovered answer'));
});

test('reset, unmount and account/company changes reject delayed previews', async () => {
  for (const transition of ['reset', 'reload', 'account', 'company']) {
    const ui = setup(); ui.signIn('A', 'company-A');
    await ui.send('Why is oxygen low?');
    const request = ui.requests[0]; request.options.onPreview(savedPreview); ui.render();
    if (transition === 'reset') ui.elements().find(node => node.type === 'button' && ui.text(node).includes('Reset')).props.onClick();
    if (transition === 'reload') ui.reload();
    if (transition === 'account') ui.signIn('B', 'company-B');
    if (transition === 'company') ui.signIn('A', 'company-B');
    request.options.onPreview(savedPreview); request.resolve('Delayed old answer');
    await Promise.resolve(); ui.render(); ui.flush();
    assert.ok(!ui.text().includes(savedPreview.text), transition);
    assert.ok(!ui.text().includes('Delayed old answer'), transition);
    assert.ok([...ui.storage.values()].every(value => !value.includes('PRIVATE PREVIEW')), transition);
  }
});

test('real mobile screen replaces preview on text and rejects callbacks after reset or account change', async () => {
  const ui = setup('mobile'); ui.signIn('A', 'company-A');
  await ui.send('Why is oxygen low in A1?');
  const first = ui.requests[0]; first.options.onPreview(savedPreview); ui.render();
  assert.ok(ui.text().includes(savedPreview.text));
  assert.ok(ui.text().includes('Working on your request'));
  first.options.onPartialResponse(' '); ui.render();
  assert.ok(ui.text().includes(savedPreview.text));
  first.options.onPartialResponse('The answer starts here'); ui.render();
  assert.ok(!ui.text().includes(savedPreview.text));
  first.options.onPreview(savedPreview); ui.render();
  assert.ok(!ui.text().includes(savedPreview.text));
  first.resolve('Complete answer'); await Promise.resolve(); ui.render();
  first.options.onPreview(savedPreview); ui.render();
  assert.ok(!ui.text().includes(savedPreview.text));
  await ui.send('Second question');
  const second = ui.requests[1];
  assert.ok(!JSON.stringify(second.options.conversationHistory).includes('PRIVATE PREVIEW'));
  second.options.onPreview(savedPreview); ui.render();
  ui.elements().find(node => node.props.accessibilityLabel === 'Reset conversation').props.onPress(); ui.render();
  second.options.onPreview(savedPreview); second.resolve('Old answer after reset'); await Promise.resolve(); ui.render();
  assert.ok(!ui.text().includes(savedPreview.text));
  assert.ok(!ui.text().includes('Old answer after reset'));
  await ui.send('Third question'); const third = ui.requests[2];
  third.options.onPreview(savedPreview); ui.render();
  ui.signIn('A', 'company-B'); third.options.onPreview(savedPreview); third.resolve('Old company reply');
  await Promise.resolve(); ui.render();
  assert.ok(!ui.text().includes(savedPreview.text));
  assert.ok(!ui.text().includes('Old company reply'));
});
