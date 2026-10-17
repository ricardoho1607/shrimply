/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const originalTimeZone = process.env.TZ;
process.env.TZ = 'Australia/Melbourne';
test.after(() => { if (originalTimeZone === undefined) delete process.env.TZ; else process.env.TZ = originalTimeZone; });

// Execute the real screens with queued React effects and company snapshots.
function screenHarness(platform) {
  const states = [], effects = [], refs = [];
  let cursor = 0, tree;
  const pending = [];
  const context = { company: { id: 'farm', timeZone: 'Asia/Jakarta' }, now: new Date('2026-09-09T21:19:00Z') };
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const i = cursor++;
      if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial;
      return [states[i], value => pending.push(() => { states[i] = typeof value === 'function' ? value(states[i]) : value; })];
    },
    useRef(value) { const i = cursor++; return refs[i] ||= { current: value }; },
    useMemo: fn => fn(),
    useEffect(fn, deps) {
      const i = cursor++;
      if (!effects[i] || deps.some((v, j) => v !== effects[i][j])) { effects[i] = deps; pending.push(fn); }
    },
  };
  const cache = new Map();
  function load(file) {
    if (!path.extname(file)) file += '.ts';
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const requireLocal = name => {
      if (name === '@/lib/appDialogs') return { showAppAlert() {} };
      if (name === '@/lib/userError') return require('../shared/userError.ts');
      if (name.endsWith('/alerts/appAlert')) return { AppAlert: { alert() {} } };
      if (name === 'react') return react;
      if (name === 'react-native') return { StyleSheet: { create: x => x }, View: 'View', Text: 'Text' };
      if (name === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 0 }) };
      if (name === 'expo-router') return { Stack: {}, useRouter: () => ({}) };
      if (name.includes('AuthContext')) return { useAuth: () => ({ company: context.company, user: { role: 'owner' } }) };
      if (name.includes('LanguageContext')) return { useLanguage: () => ({ currentLanguage: 'en', t: { nav: {}, actions: {} } }) };
      if (name.includes('useFarmDateKey')) return { useFarmDateKey: zone => load(root + '/shared/farmDate.ts').getFarmDateKey(context.now, zone) };
      if (name.includes('useFarmPermissions')) return { useFarmPermissions: () => () => true };
      if (name.endsWith('/permissions')) return { hasFarmPermission: () => true };
      if (name.includes('useEnterpriseBlocks')) return { useEnterpriseBlocks: () => ({ blocks: [] }) };
      if (name.includes('useDashboardData')) return { useCompanyHarvestRecords: () => ({ data: [] }), useCompanyBlocks: () => ({ data: [] }) };
      if (name.includes('pondStore')) return { usePondStore: fn => fn({ ponds: [], harvestRecords: [] }) };
      if (name === 'firebase/firestore') return { collection: () => ({}), query: () => ({}), orderBy: () => ({}), onSnapshot: (_, fn) => { fn({ docs: [] }); return () => {}; } };
      if (/firebase|mobilePdfExport|ExportService|lucide|vector-icons|MineralLabResults/.test(name)) return {};
      if (name.includes('AppDatePicker')) return { __esModule: true, default: 'AppDatePicker' };
      if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name));
      return require(name);
    };
    const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
    new Function('module', 'exports', 'require', js)(module, module.exports, requireLocal);
    return module.exports;
  }
  const screen = load(root + (platform === 'web' ? '/web/src/app/dashboard/reports/daily-operations/page.tsx' : '/app/daily-operations-report.tsx')).default;
  function render() {
    for (let pass = 0; pass < 10; pass++) {
      cursor = 0; tree = screen();
      if (!pending.length) return tree;
      while (pending.length) pending.shift()();
    }
    throw new Error('screen did not settle');
  }
  function picker() {
    const visit = node => {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'AppDatePicker' || node.type === 'input' && node.props.type === 'date') return node.props;
      for (const child of (node.props?.children || []).flat(Infinity)) { const found = visit(child); if (found) return found; }
    };
    return visit(render());
  }
  return { context, picker, select(date) { const props = picker(); props.onChange(platform === 'web' ? { target: { value: date } } : new Date(`${date}T00:00:00`)); } };
}

for (const platform of ['web', 'mobile']) {
  test(`${platform}: company day defaults to September 10 before UTC midnight and retains an explicit selection`, () => {
    const screen = screenHarness(platform);
    assert.equal(screen.picker().value, '2026-09-10');
    screen.select('2026-09-10');
    assert.equal(screen.picker().value, '2026-09-10');
    screen.context.now = new Date('2026-09-10T18:00:00Z');
    assert.equal(screen.picker().value, '2026-09-10', 'midnight refresh must not overwrite an explicitly selected date');
  });
  test(`${platform}: late company timezone updates the default, while historical selections remain fixed`, () => {
    const screen = screenHarness(platform);
    screen.context.company.timeZone = 'UTC';
    assert.equal(screen.picker().value, '2026-09-09');
    screen.context.company.timeZone = 'Asia/Jakarta';
    assert.equal(screen.picker().value, '2026-09-10');
    screen.select('2026-09-08');
    screen.context.company.timeZone = 'America/Los_Angeles';
    assert.equal(screen.picker().value, '2026-09-08');
  });
  test(`${platform}: legacy companies without a timezone use the local day`, () => {
    const screen = screenHarness(platform);
    delete screen.context.company.timeZone;
    assert.equal(screen.picker().value, '2026-09-10');
  });
}
