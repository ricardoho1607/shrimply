const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function fixture(companyId = 'farm-a') {
  const source = fs.readFileSync(`${__dirname}/page.tsx`, 'utf8');
  const tree = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let effect;
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(tree) === 'useEffect'
      && node.arguments[0].getText(tree).includes('// Load Ponds')) effect = node.arguments[0];
    ts.forEachChild(node, visit);
  }
  visit(tree);
  const listeners = [], writes = [];
  const env = {
    companyId, user: { uid: 'user-a' }, db: {},
    collection: (_, ...parts) => parts.join('/'), query: ref => ref, orderBy: () => null,
    onSnapshot: (path, next, error) => {
      const item = { path, next, error, stopped: false }; listeners.push(item);
      return () => { item.stopped = true; };
    },
  };
  for (const name of ['setPonds', 'setHarvestRecords', 'setPondsResolved', 'setHarvestRecordsResolved']) {
    env[name] = value => writes.push([name, value]);
  }
  const js = ts.transpileModule(`const effect = ${effect.getText(tree)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const cleanup = new Function(...Object.keys(env), `${js}; return effect();`)(...Object.values(env));
  return { listeners, writes, cleanup };
}

test('leaving harvest closes both subscriptions and ignores late callbacks', () => {
  const f = fixture();
  assert.equal(f.listeners.length, 2);
  f.listeners.forEach(l => l.next({ docs: [] }));
  f.cleanup();
  assert.ok(f.listeners.every(l => l.stopped));
  const count = f.writes.length;
  f.listeners.forEach(l => { l.next({ docs: [] }); l.error(Error('late')); });
  assert.equal(f.writes.length, count);
});
test('no company starts no downloads and resolves empty state', () => {
  const f = fixture(null);
  assert.equal(f.listeners.length, 0);
  assert.ok(f.writes.some(([name, value]) => name === 'setPondsResolved' && value === true));
});
test('company switches close old listeners before opening the new scope', () => {
  const old = fixture(); old.cleanup();
  const next = fixture('farm-b');
  assert.ok(old.listeners.every(l => l.stopped));
  assert.ok(next.listeners.every(l => l.path.includes('/farm-b/')));
  next.cleanup();
});
