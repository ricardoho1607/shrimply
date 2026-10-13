const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
require('../../../../../scripts/register-typescript.cjs');
const inventory = require('../../../../../shared/feedInventoryUsage.ts');
const reconciliation = require('../../../../../shared/dailyFeedTransaction.ts');
const finance = require('../../../../../shared/financeIntegrity.ts');

// Execute the real page handlers with a transactional in-memory SDK. No Firebase writes.
const source = process.env.V4_FEED_BASELINE
  ? require('node:child_process').execFileSync('git', ['show', 'v4:web/src/app/dashboard/feed/page.tsx'], { encoding: 'utf8' })
  : fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
const ast = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function handler(name, bindings) {
  let body;
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) body = node.initializer.getText(ast);
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.ok(body);
  const code = ts.transpileModule(`const run = ${body};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(bindings), `${code}; return run;`)(...Object.values(bindings));
}
function fixture() {
  const date = '2026-10-13';
  const sample = { id: 'sample', date, mbw: 12, feed: 4, mortality: 1 };
  const feeding = { id: 'feed-record', date, feedData: { totalDailyFeed: '10.00', inventoryFeedId: 'f', feedAllocations: [{ inventoryFeedId: 'f', quantityKg: 10 }] } };
  const pondPath = 'companies/a/ponds/p';
  const feedPath = 'companies/a/feeds/f';
  const rows = new Map([
    [pondPath, { pondName: 'P1', cycleStatus: 'active', samplings: [sample, feeding] }],
    [feedPath, { totalStock: 90, totalCost: 900, usageHistory: [{ id: 'prior', pondId: 'p', date, source: 'daily_feed_record', quantity: 10, totalCost: 100, unitPrice: 10 }] }],
  ]);
  const alerts = [];
  const noop = () => {};
  const bindings = {
    ...inventory, ...reconciliation, ...finance,
    console: { error: noop }, alert: message => alerts.push(message),
    db: {}, companyId: 'a', user: { uid: 'staff' }, canEditFeed: true,
    accessiblePonds: [{ id: 'p' }], inventoryFeeds: [{ id: 'f' }], availableStockedFeeds: [{ id: 'f' }],
    formData: { pondId: 'p', date, feedingResponse: 'normal', feedAllocations: [{ inventoryFeedId: 'f', quantityKg: '20' }] },
    editingFeedRecord: null, deletingFeedRecord: feeding, selectedPondForHistory: { id: 'p' }, isDeletingFeedRecord: false,
    isBaselineSampling: row => row.isBaselineEstimate || row.source === 'midcycle_onboarding',
    save: { busy: false, acquire: () => true, release: noop },
    copy: text => text, today: date,
    t: { feed: { missingFeedCost: 'Missing feed cost' }, feedHistory: { deleteInventoryMissing: 'Missing inventory', deleteSuccess: 'Deleted', deleteSuccessWithoutInventory: 'Deleted without inventory', deleteFailed: 'Failed' } },
    setModalOpen: noop, setEditingFeedRecord: noop, setFormData: noop, setIsDeletingFeedRecord: noop, setDeletingFeedRecord: noop, setRevealedFeedRecordId: noop,
    doc: (_db, ...parts) => parts.join('/'), serverTimestamp: () => 'server-time', Timestamp: { now: () => 'server-time' },
    arrayUnion: row => ({ union: row }), removeUndefinedFields: value => value,
    runTransaction: async (_db, callback) => {
      const writes = [];
      await callback({
        get: async ref => { assert.equal(writes.length, 0, 'All reads must precede writes'); return { exists: () => rows.has(ref), data: () => structuredClone(rows.get(ref)) }; },
        update: (ref, data) => writes.push([ref, data]),
      });
      for (const [ref, data] of writes) {
        const previous = rows.get(ref);
        rows.set(ref, { ...previous, ...data, ...(data.usageHistory?.union ? { usageHistory: [...previous.usageHistory, data.usageHistory.union] } : {}) });
      }
    },
  };
  return { rows, bindings, alerts, sample, pondPath, feedPath,
    save: () => handler('handleAddFeed', bindings)({ preventDefault: noop }),
    remove: () => handler('handleDeleteFeedRecord', bindings)(),
  };
}

test('web desired totals deduct once, preserve biological samples, and retain ledger metadata', async () => {
  const f = fixture();
  await f.save(); await f.save();
  assert.deepEqual(f.alerts, []);
  assert.equal(f.rows.get(f.feedPath).totalStock, 80);
  assert.equal(f.rows.get(f.feedPath).totalCost, 800);
  assert.equal(f.rows.get(f.feedPath).usageHistory.length, 2);
  assert.equal(f.rows.get(f.feedPath).usageHistory[1].notes, 'Daily feed for pond: P1');
  assert.deepEqual(f.rows.get(f.pondPath).samplings[0], f.sample);
});

test('web feed reduction and deletion return historical cost after a price change', async () => {
  const f = fixture();
  f.rows.get(f.feedPath).totalCost = 1800; // Current stock costs 20/kg; recorded feed cost 10/kg.
  f.bindings.formData.feedAllocations[0].quantityKg = '5';
  await f.save();
  assert.equal(f.rows.get(f.feedPath).totalStock, 95);
  assert.equal(f.rows.get(f.feedPath).totalCost, 1850);
  await f.remove();
  assert.equal(f.rows.get(f.feedPath).totalStock, 100);
  assert.equal(f.rows.get(f.feedPath).totalCost, 1900);
  assert.deepEqual(f.rows.get(f.pondPath).samplings[0], f.sample);
  assert.equal(f.rows.get(f.pondPath).samplings[1].feedData, undefined);
});

for (const action of ['save', 'remove']) {
  test(`web ${action} rejects missing stock instead of treating it as zero`, async () => {
    const f = fixture(); delete f.rows.get(f.feedPath).totalStock;
    f.bindings.formData.feedAllocations[0].quantityKg = '5';
    const before = structuredClone([...f.rows]);
    await f[action]();
    assert.match(f.alerts[0] || '', /quantity or cost is missing/);
    assert.deepEqual([...f.rows], before, 'A failed adjustment must not write pond or inventory');
  });
}

test('web insufficient stock does not commit either pond or inventory', async () => {
  const f = fixture(); f.bindings.formData.feedAllocations[0].quantityKg = '200';
  const before = structuredClone([...f.rows]); await f.save();
  assert.match(f.alerts[0], /Insufficient/);
  assert.deepEqual([...f.rows], before);
});

test('web does not save feed after the pond cycle ends on another device', async () => {
  const f = fixture(); f.rows.get(f.pondPath).cycleStatus = 'ended';
  const before = structuredClone([...f.rows]); await f.save();
  assert.match(f.alerts[0] || '', /cycle is unavailable/);
  assert.deepEqual([...f.rows], before);
});
