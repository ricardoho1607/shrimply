const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
require('../../../scripts/register-typescript.cjs');
const { createSaveOperation } = require('../../../shared/saveOperation.ts');
const { removeUndefinedFields } = require('./firestoreData.ts');

function loadModule(filename, dependencies) {
  const source = fs.readFileSync(path.join(__dirname, filename), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  new Function('require', 'exports', compiled)(name => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  }, exports);
  return exports;
}

function store() {
  let document;
  let writes = 0;
  const runTransaction = async (_db, work) => work({
    get: async () => ({ exists: () => document !== undefined, data: () => document }),
    set: (_ref, value) => { document = value; writes++; },
    update: (_ref, value) => { document = { ...document, ...value }; writes++; },
  });
  const helpers = loadModule('saveData.ts', {
    'firebase/firestore': { runTransaction },
    'firebase/storage': {}, './firestoreData': { removeUndefinedFields },
  });
  return { helpers, get document() { return document; }, get writes() { return writes; } };
}

test('synchronous lock prevents two same-tick submissions and preserves retry identity', () => {
  const busy = [];
  const save = createSaveOperation(value => busy.push(value));
  assert.equal(save.acquire(), true);
  assert.equal(save.acquire(), false);
  assert.equal(save.reset(), false);
  const id = save.id('entry');
  save.release();
  assert.equal(save.acquire(), true);
  assert.equal(save.id('entry'), id);
  save.release();
  save.complete();
  assert.notEqual(save.id('entry'), id);
  assert.deepEqual(busy, [true, false, true, false]);
});

test('create retry keeps original record and removes optional undefined fields', async () => {
  const data = store();
  await data.helpers.createRecordOnce({}, {}, { amount: 100, metadata: { cycleId: undefined } });
  // Simulates a commit followed by a lost acknowledgement and edited retry.
  await data.helpers.createRecordOnce({}, {}, { amount: 200 });
  assert.equal(data.writes, 1);
  assert.deepEqual(data.document, { amount: 100, metadata: {} });
});

test('update refuses to recreate a deleted record', async () => {
  const data = store();
  await assert.rejects(data.helpers.updateRecordOnline({}, {}, { amount: 1 }), /no longer exists/);
  assert.equal(data.writes, 0);
});

test('network failure rejects save without a queued hidden write', async () => {
  const helpers = loadModule('saveData.ts', {
    'firebase/firestore': { runTransaction: async () => { throw new Error('offline'); } },
    'firebase/storage': {}, './firestoreData': { removeUndefinedFields },
  });
  await assert.rejects(helpers.createRecordOnce({}, {}, {}), /offline/);
});

test('upload timeout cancels actual upload; successful upload clears timeout', async () => {
  let cancellations = 0;
  let success = false;
  const helpers = loadModule('saveData.ts', {
    'firebase/firestore': {}, './firestoreData': { removeUndefinedFields },
    'firebase/storage': { uploadBytesResumable: () => Object.assign(success ? Promise.resolve() : new Promise(() => {}), { cancel() { cancellations++; } }) },
  });
  await assert.rejects(helpers.uploadSaveFile({}, new Uint8Array(), undefined, 5), /timed out/);
  assert.equal(cancellations, 1);
  success = true;
  await helpers.uploadSaveFile({}, new Uint8Array(), undefined, 5);
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(cancellations, 1);
});

module.exports = { loadModule };

test('save boundary rejects nested non-finite numbers before any write', async () => {
  const data = store();
  await assert.rejects(data.helpers.createRecordOnce({}, {}, { totals: [Infinity] }), /valid numbers/);
  assert.equal(data.writes, 0);
});
