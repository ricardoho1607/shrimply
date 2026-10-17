const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
function load(file, env = {}, imports = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, process: { env }, require: name => {
    if (name in imports) return imports[name];
    if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }) };
    if (name === 'react') return {};
    throw new Error('Unexpected dependency: ' + name);
  } }, { filename: file });
  return module.exports;
}
test('web and mobile SOP rollout require explicit opt-in and default off', () => {
  for (const [file, key] of [['web/src/lib/sopFeature.ts', 'NEXT_PUBLIC_ADAPTIVE_SOPS_ENABLED'], ['app/services/sopFeature.ts', 'EXPO_PUBLIC_ADAPTIVE_SOPS_ENABLED']]) {
    for (const value of [undefined, 'false', '1', 'TRUE']) assert.equal(load(file, { [key]: value }).ADAPTIVE_SOPS_ENABLED, false);
    assert.equal(load(file, { [key]: 'true' }).ADAPTIVE_SOPS_ENABLED, true);
  }
});
test('both web SOP routes return not-found on the main build and render on the enabled test build', () => {
  for (const route of ['sops', 'todo']) {
    const Client = function SopClient() {};
    const notFound = () => { throw new Error('route-disabled'); };
    const imports = { 'next/navigation': { notFound }, './SopPageClient': Client };
    const disabled = load(`web/src/app/dashboard/${route}/page.tsx`, {}, { ...imports, '@/lib/sopFeature': { ADAPTIVE_SOPS_ENABLED: false } });
    assert.throws(() => disabled.default(), /route-disabled/);
    const enabled = load(`web/src/app/dashboard/${route}/page.tsx`, {}, { ...imports, '@/lib/sopFeature': { ADAPTIVE_SOPS_ENABLED: true } });
    assert.equal(enabled.default().type, Client);
  }
});
test('disabled SOP checks add no Firebase reads or calls to ordinary pond operations', async () => {
  for (const [file, dbImport] of [['web/src/lib/sopGuards.ts', '@/lib/firebase'], ['app/services/sopGuards.ts', '@/config/firebase']]) {
    let reads = 0, calls = 0;
    const guards = load(file, {}, { './sopFeature': { ADAPTIVE_SOPS_ENABLED: false }, 'firebase/firestore': { doc: () => ({}), getDoc: async () => { reads++; return { exists: () => true, data: () => ({ adaptiveSopsEnabled: true }) }; } }, 'firebase/functions': { getFunctions: () => ({}), httpsCallable: () => async () => { calls++; throw new Error('unexpected call'); } }, [dbImport]: { db: {} }, 'react-native': { Alert: {} }, '@/lib/appDialogs': {}, '../../components/alerts/appAlert': { AppAlert: {} } });
    assert.equal(await guards.previewSopPondChange('farm', { id: 'pond', pondName: 'Pond' }), true);
    await guards.assertSopStageGate('farm', 'pond', 'stocking');
    assert.equal(reads, 0); assert.equal(calls, 0);
  }
});
test('disabled mobile SOP routes redirect without opening SOP screens', () => {
  const Redirect = function Redirect() {};
  for (const route of ['sops', 'todo']) {
    const page = load(`app/${route}.tsx`, {}, { 'expo-router': { Redirect }, './services/sopFeature': { ADAPTIVE_SOPS_ENABLED: false }, './components/SopScreen': { SopScreen: () => { throw new Error('SOP opened'); } } });
    assert.equal(page.default().type, Redirect);
    assert.equal(page.default().props.href, '/(tabs)');
  }
});
test('static export removes disabled SOP artifacts while retaining normal dashboard pages', () => {
  const os = require('node:os'); const { finalizeSopRollout } = require('../../web/scripts/finalize-sop-rollout.cjs');
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'shrimply-rollout-'));
  try {
    fs.mkdirSync(path.join(output, 'dashboard'), { recursive: true });
    for (const file of ['sops.html', 'sops.txt', 'todo.html', 'todo.txt', 'water.html']) fs.writeFileSync(path.join(output, 'dashboard', file), 'fixture');
    finalizeSopRollout(output, true); assert.ok(fs.existsSync(path.join(output, 'dashboard/sops.html')));
    finalizeSopRollout(output, false);
    for (const file of ['sops.html', 'sops.txt', 'todo.html', 'todo.txt']) assert.equal(fs.existsSync(path.join(output, 'dashboard', file)), false);
    assert.ok(fs.existsSync(path.join(output, 'dashboard/water.html')));
  } finally { fs.rmSync(output, { recursive: true, force: true }); }
});
