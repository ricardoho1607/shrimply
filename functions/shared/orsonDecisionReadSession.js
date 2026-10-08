'use strict';
const { Buffer } = require('node:buffer');
const { createHash } = require('node:crypto');

const DEFAULT_LIMITS = Object.freeze({ maxDocuments: 12000, maxCalls: 160, maxConcurrent: 4, deadlineMs: 20000, maxReadBytes: 16 * 1024 * 1024, maxOutputBytes: 64 * 1024 });
const createDecisionBudget = (limits = {}) => ({ limits: { ...DEFAULT_LIMITS, ...limits }, documents: 0, calls: 0, bytes: 0, active: 0, peakConcurrent: 0, queue: [] });

// One cache per tool invocation. The request shares only budgets, never farm data.
// Re-reading bounded queries detects edits/deletes/new rows in the reviewed pages.
const createDecisionReadSession = (db, budget = createDecisionBudget()) => {
  const started = Date.now();
  const cache = new Map();
  const reads = new Map();
  const fingerprint = snapshot => createHash('sha256').update(JSON.stringify(
    snapshot.docs ? snapshot.docs.map(doc => [doc.id, doc.updateTime || null, doc.data()])
      : [snapshot.id, snapshot.exists, snapshot.updateTime || null, snapshot.data() || null]
  )).digest('hex');
  const check = () => {
    if (Date.now() - started >= budget.limits.deadlineMs) throw new Error('decision_deadline_exceeded');
    if (budget.calls >= budget.limits.maxCalls || budget.documents >= budget.limits.maxDocuments || budget.bytes >= budget.limits.maxReadBytes) throw new Error('decision_read_budget_exceeded');
  };
  const releaseSlot = () => {
    const next = budget.queue.shift();
    if (next) next(); else budget.active -= 1;
  };
  const read = async ref => {
    if (budget.active >= budget.limits.maxConcurrent) await new Promise((resolve, reject) => {
      let timer;
      const acquire = () => { clearTimeout(timer); resolve(); };
      budget.queue.push(acquire);
      timer = setTimeout(() => {
        const index = budget.queue.indexOf(acquire);
        if (index >= 0) budget.queue.splice(index, 1);
        reject(new Error('decision_deadline_exceeded'));
      }, Math.max(1, budget.limits.deadlineMs - (Date.now() - started)));
    });
    else budget.active += 1;
    let pendingRead = false;
    try {
      check();
      budget.calls += 1;
      budget.peakConcurrent = Math.max(budget.peakConcurrent, budget.active);
      let timer;
      const completion = Promise.resolve().then(() => ref.get());
      pendingRead = true;
      // A timed-out Firestore read still owns its slot until it actually settles.
      // This keeps subsequent evaluations inside the request concurrency budget.
      completion.then(releaseSlot, releaseSlot);
      const snapshot = await Promise.race([completion, new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('decision_deadline_exceeded')), Math.max(1, budget.limits.deadlineMs - (Date.now() - started)));
      })]).finally(() => clearTimeout(timer));
      const docs = snapshot.docs || (snapshot.exists ? [snapshot] : []);
      budget.documents += docs.length;
      budget.bytes += Buffer.byteLength(JSON.stringify(docs.map(doc => doc.data() || null)));
      if (budget.documents > budget.limits.maxDocuments || budget.bytes > budget.limits.maxReadBytes) throw new Error('decision_read_budget_exceeded');
      return snapshot;
    } finally {
      if (!pendingRead) releaseSlot();
    }
  };
  const wrap = (ref, key) => new Proxy(ref, { get(target, property) {
    if (property === 'get') return async () => {
      if (!cache.has(key)) cache.set(key, read(target).then(snapshot => {
        reads.set(key, { ref: target, digest: fingerprint(snapshot) });
        return snapshot;
      }));
      return cache.get(key);
    };
    const value = target[property];
    if (typeof value !== 'function') return value;
    if (['collection', 'doc', 'where', 'orderBy', 'limit', 'startAfter'].includes(property)) return (...args) => {
      const stableArgs = args.map(arg => arg && typeof arg === 'object' && arg.id ? arg.id : arg);
      return wrap(value.apply(target, args), `${key}/${String(property)}:${JSON.stringify(stableArgs)}`);
    };
    return value.bind(target);
  } });
  return {
    db: wrap(db, 'db'), budget,
    async verify() {
      let changed = false;
      await Promise.all([...reads.values()].map(async entry => { if (fingerprint(await read(entry.ref)) !== entry.digest) changed = true; }));
      return { changed, sourceDigest: createHash('sha256').update([...reads.values()].map(entry => entry.digest).sort().join(':')).digest('hex'),
        consistency: 'bounded_sources_rechecked_no_transactional_snapshot', asOf: new Date().toISOString() };
    },
    stats() { return { documentsRead: budget.documents, readCalls: budget.calls, readBytes: budget.bytes, peakConcurrentReads: budget.peakConcurrent, elapsedMs: Date.now() - started }; },
  };
};
module.exports = { DEFAULT_LIMITS, createDecisionBudget, createDecisionReadSession };
