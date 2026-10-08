'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createDecisionBudget, createDecisionReadSession } = require('./orsonDecisionReadSession');
const { isDecisionMetadata } = require('./orsonDomain/orsonDecisionContract');

test('source verification detects edited, inserted, and removed records', async () => {
  for (const mutation of ['edit', 'insert', 'remove']) {
    const rows = [{ id: 'a', quantity: 1 }];
    const ref = { get: async () => ({ docs: rows.map(row => ({ id: row.id, data: () => ({ ...row }) })) }) };
    const session = createDecisionReadSession({ collection: () => ref });
    await session.db.collection('feeds').get();
    if (mutation === 'edit') rows[0].quantity = 2;
    if (mutation === 'insert') rows.push({ id: 'b', quantity: 3 });
    if (mutation === 'remove') rows.pop();
    assert.equal((await session.verify()).changed, true, mutation);
  }
});

test('read session caches one invocation, rechecks once, and caps concurrent reads', async () => {
  let count = 0;
  const ref = { get: async () => { count += 1; await new Promise(resolve => setTimeout(resolve, 2)); return { docs: [{ id: 'a', data: () => ({ value: 1 }) }] }; } };
  const budget = createDecisionBudget({ maxConcurrent: 2 });
  const session = createDecisionReadSession({ collection: () => ref }, budget);
  await Promise.all(Array.from({ length: 12 }, () => session.db.collection('feeds').get()));
  assert.equal(count, 1);
  await Promise.all(['ponds', 'cycles', 'expenses', 'additives'].map(name => session.db.collection(name).get()));
  assert.equal((await session.verify()).changed, false);
  assert.equal(count, 10);
  assert.equal(budget.peakConcurrent, 2);
  const fresh = createDecisionReadSession({ collection: () => ref }, budget);
  await fresh.db.collection('feeds').get();
  assert.equal(count, 11); // No evidence caching across invocations.
});

test('read sessions enforce request document, call, byte, and time budgets', async () => {
  for (const limits of [{ maxDocuments: 1 }, { maxCalls: 1 }, { maxReadBytes: 1 }]) {
    const session = createDecisionReadSession({ get: async () => ({ docs: [{ id: 'a', data: () => ({ x: 'large' }) }, { id: 'b', data: () => ({ x: 2 }) }] }) }, createDecisionBudget(limits));
    await assert.rejects(async () => { await session.db.get(); await session.verify(); }, /decision_read_budget_exceeded/);
  }
  const timed = createDecisionReadSession({ get: () => new Promise(() => {}) }, createDecisionBudget({ deadlineMs: 10 }));
  await assert.rejects(timed.db.get(), /decision_deadline_exceeded/);
});

test('common result runtime validator matches required metadata and nullable digest', () => {
  const metadata = { version: 1, kind: 'comparison', resultStatus: 'partial', writesPerformed: 0, asOf: '2026-10-08T00:00:00Z', formulaVersion: 'v2', consistency: 'rechecked', sourceDigest: null, coverage: { retrievalComplete: true, expectedObservationDays: null, recordedObservationDays: null, missingFields: [], excludedRecordCount: null } };
  assert.equal(isDecisionMetadata(metadata), true);
  for (const patch of [{ writesPerformed: 1 }, { kind: 'unknown' }, { resultStatus: 'ok' }, { asOf: 'invalid' }, { sourceDigest: 3 }]) assert.equal(isDecisionMetadata({ ...metadata, ...patch }), false);
});

test('timed-out reads keep their concurrency slot and queued readers also respect deadlines', async () => {
  const budget = createDecisionBudget({ maxConcurrent: 1, deadlineMs: 10 });
  const session = createDecisionReadSession({ collection: () => ({ get: () => new Promise(() => {}) }) }, budget);
  const outcomes = await Promise.allSettled([session.db.collection('first').get(), session.db.collection('queued').get()]);
  assert.ok(outcomes.every(outcome => outcome.status === 'rejected' && /decision_deadline_exceeded/.test(outcome.reason.message)));
  assert.equal(budget.calls, 1);
  assert.equal(budget.peakConcurrent, 1);
  assert.equal(budget.queue.length, 0);
});
