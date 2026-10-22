const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { initializeApp, deleteApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { createSopRuntime } = require("./runtime");
const { emptySopStep } = require("../shared/orsonDomain/sop/contracts");
let app, db;
test.before(() => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST || "", /^(127\.0\.0\.1|localhost):/);
  app = initializeApp({ projectId: "demo-shrimply-sop" }, "sop-efficiency");
  db = getFirestore(app);
});
test.after(() => deleteApp(app));

async function fixture() {
  const companyId = `efficiency-${randomUUID()}`, ref = db.doc(`companies/${companyId}`);
  const now = Date.parse("2026-10-23T12:00Z");
  const step = { ...emptySopStep("water"), maxRechecks: 1 };
  step.check.min = 4;
  const ad = { id: "ad", status: "active", revision: 1, wakeRevision: 1, timeZone: "UTC",
    managerId: "owner", recipients: ["owner"], versionId: "v1", definition: { steps: [step] } };
  await ref.collection("sopAdoptions").doc("ad").set(ad);
  const stats = { queries: 0, reads: 0 };
  const measured = new Proxy(db, { get(target, key) {
    if (key === "runTransaction") return (fn) => target.runTransaction((tx) => fn(new Proxy(tx, { get(t, k) {
      if (k === "get") return async (doc) => {
        const value = await t.get(doc);
        if (Array.isArray(value.docs)) stats.queries++;
        stats.reads += Array.isArray(value.docs) ? Math.max(1, value.size) : 1;
        return value;
      };
      return typeof t[k] === "function" ? t[k].bind(t) : t[k];
    } })));
    return typeof target[key] === "function" ? target[key].bind(target) : target[key];
  } });
  const runtime = createSopRuntime(measured);
  const task = runtime.taskFrom(ad, step, { id: "pond", cycleId: "cycle" }, "old", now - 7200000, now - 3600000);
  await ref.collection("tasks").doc(task.id).set(task);
  await runtime.evaluateTask(companyId, task.id, now);
  // First follow-up stabilizes the task's revision; the second can save its idle result.
  const check = (at = now + 1, options = { scheduler: true }) => runtime.evaluateTask(companyId, task.id, at, options);
  const warm = async () => { await check(); await check(); stats.queries = stats.reads = 0; };
  await warm();
  const stored = (await ref.collection("tasks").doc(task.id).get()).data();
  const issue = ref.collection("sopIssues").doc(stored.issueId);
  const issueData = (await issue.get()).data();
  return { ref, companyId, runtime, now, task, stats, check, warm, issue, issueData };
}

test("settled expired issues avoid evidence reads, but escalation and the repair interval still run", async () => {
  const f = await fixture();
  await f.check();
  assert.equal(f.stats.queries, 0);
  await f.check(f.now + 33 * 60000);
  assert.equal(f.stats.queries, 0, "reuse survives a four-page routine sweep");
  await f.issue.update({ nextEscalationAt: f.now + 8 * 3600000 });
  await f.warm();
  await f.check(f.now + 6 * 3600000 + 2);
  assert.ok(f.stats.queries > 0, "a periodic fresh check remains mandatory");
  f.stats.queries = 0;
  await f.issue.update({ nextEscalationAt: f.issueData.nextEscalationAt });
  await f.check(f.issueData.nextEscalationAt);
  assert.ok(f.stats.queries > 0);
  assert.equal((await f.issue.get()).data().lastEscalatedAt, f.issueData.nextEscalationAt);
});

test("evidence wake, task edit, adoption change and corrective action each invalidate idle reuse", async () => {
  for (const change of ["wake", "task", "adoption", "action", "issue"]) {
    const f = await fixture();
    if (change === "wake") await f.ref.collection("sopAdoptions").doc("ad").update({ wakeRevision: 2 });
    if (change === "adoption") await f.ref.collection("sopAdoptions").doc("ad").update({ revision: 2 });
    if (change === "task") await f.ref.collection("tasks").doc(f.task.id).update({ notes: "New note" });
    if (change === "action") await f.ref.collection("tasks").doc(f.issueData.correctiveTaskId).update({ status: "completed" });
    if (change === "issue") await f.issue.update({ status: "closure_review" });
    await f.check();
    assert.ok(f.stats.queries > 0, change);
  }
});

test("source reconciliation bypasses idle reuse; critical and still-open windows never cache", async () => {
  const f = await fixture();
  await f.check(f.now + 2, {});
  assert.ok(f.stats.queries > 0);
  for (const update of [{ "step.severity": "critical" }, { "step.severity": "warning", dueAt: f.now + 60000 }]) {
    await f.ref.collection("tasks").doc(f.task.id).update(update);
    await f.warm();
    await f.check();
    assert.ok(f.stats.queries > 0);
  }
});

test("corrective acknowledgments skip measurements, retain review rules and honor pause", async () => {
  const f = await fixture(), id = f.issueData.correctiveTaskId;
  const taskRef = f.ref.collection("tasks").doc(id);
  for (const [update, expected] of [
    [{ status: "open" }, "open"],
    [{ status: "submitted", requiresHumanReview: true }, "needs_review"],
    [{ status: "submitted", requiresHumanReview: false, attachments: [{ contentType: "image/png" }] }, "needs_review"],
    [{ status: "submitted", attachments: [] }, "completed"],
  ]) {
    await taskRef.update(update);
    f.stats.queries = f.stats.reads = 0;
    await f.runtime.evaluateTask(f.companyId, id, f.now);
    assert.equal(f.stats.queries, 0);
    assert.equal(f.stats.reads, 2);
    assert.equal((await taskRef.get()).data().status, expected);
  }
  await f.ref.collection("sopAdoptions").doc("ad").update({ status: "paused" });
  assert.equal(await f.runtime.evaluateTask(f.companyId, id, f.now), false);
});

test("a cached overdue recheck accepts late-saved recovery evidence and reopens when that evidence is deleted", async () => {
  const f = await fixture(), id = f.issueData.recheckTaskId;
  const checkAt = f.now + 4 * 3600000;
  const check = () => f.runtime.evaluateTask(f.companyId, id, checkAt, { scheduler: true });
  await check(); await check(); await check();
  f.stats.queries = 0;
  await check();
  assert.equal(f.stats.queries, 0);
  await f.ref.collection("tasks").doc(f.issueData.correctiveTaskId).update({
    status: "completed", evidenceObservedAt: f.now + 30 * 60000,
  });
  const reading = { physicalPondId: "pond", pondId: "stocked", cycleId: "cycle", field: "doMorning",
    value: 6, observedAt: f.now + 90 * 60000, date: "2026-10-23", unit: "mg/L" };
  await f.ref.collection("waterObservations").doc("recovery").set(reading);
  await f.runtime.project(f.companyId, "waterObservations", "recovery", reading, "saved", checkAt);
  await check();
  assert.equal((await f.issue.get()).data().status, "closed");
  await f.ref.collection("waterObservations").doc("recovery").update({ deleted: true });
  await f.runtime.project(f.companyId, "waterObservations", "recovery", { ...reading, deleted: true }, "deleted", checkAt + 1);
  assert.equal((await f.issue.get()).data().status, "open");
});
