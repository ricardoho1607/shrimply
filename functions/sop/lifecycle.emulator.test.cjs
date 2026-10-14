const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { initializeApp, deleteApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { createSopService } = require("./service");
const { createSopRuntime } = require("./runtime");
const { emptySopStep } = require("../shared/orsonDomain/sop/contracts");
let app, db;
test.before(() => {
  assert.ok(
    process.env.FIRESTORE_EMULATOR_HOST,
    "Run only against the Firestore emulator",
  );
  app = initializeApp({ projectId: "demo-shrimply-sop" }, "sop-lifecycle");
  db = getFirestore(app);
});
test.after(() => app && deleteApp(app));

const timedStep = (id, stages, from, to = from) => {
  const step = emptySopStep(id);
  return {
    ...step,
    title: id,
    stages,
    trigger: {
      ...step.trigger,
      kind: "doc",
      at: "06:00",
      docFrom: from,
      docTo: to,
    },
    check: {
      ...step.check,
      field: "manual",
      operator: "present",
      unit: "",
      exactTime: false,
    },
  };
};
async function fixture() {
  const companyId = `lifecycle-${randomUUID()}`,
    owner = `${companyId}-owner`,
    tech = `${companyId}-tech`;
  const ref = db.doc(`companies/${companyId}`),
    service = createSopService(db);
  await Promise.all([
    ref.set({
      ownerId: owner,
      teamMembers: [tech],
      timeZone: "UTC",
      businessSize: "large",
    }),
    db.doc(`users/${owner}`).set({ companyId, role: "owner" }),
    db.doc(`users/${tech}`).set({ companyId, role: "technician" }),
    ref
      .collection("physicalPonds")
      .doc("a")
      .set({ pondName: "A", activePondId: "" }),
    ref
      .collection("physicalPonds")
      .doc("b")
      .set({ pondName: "B", activePondId: "" }),
  ]);
  const command = (action, input = {}, uid = owner) =>
    service.command(uid, {
      companyId,
      operationId: randomUUID(),
      action,
      ...input,
    });
  return { companyId, owner, tech, ref, service, command };
}

test("stocking plans validate dates and manager authority, and cannot relabel actual stocking", async () => {
  const f = await fixture();
  await assert.rejects(
    f.command("planStocking", {
      targetId: "a",
      plannedStockingDate: "2026-02-30",
    }),
    { code: "invalid-argument" },
  );
  await assert.rejects(
    f.command(
      "planStocking",
      { targetId: "a", plannedStockingDate: "2026-11-01" },
      f.tech,
    ),
    { code: "permission-denied" },
  );
  await f.command("planStocking", {
    targetId: "a",
    plannedStockingDate: "2026-11-01",
  });
  const stage = (await f.ref.collection("sopStages").doc("a").get()).data();
  await f.command("planStocking", {
    targetId: "a",
    plannedStockingDate: "2026-11-02",
  });
  assert.deepEqual(
    (await f.ref.collection("sopStages").doc("a").get()).data(),
    stage,
    "Rescheduling cannot replay manual stage tasks",
  );
  const snapshot = await f.service.snapshot(f.owner, f.companyId);
  assert.equal(
    snapshot.physicalPonds.find((p) => p.id === "a").plannedStockingDate,
    "2026-11-02",
  );
  await f.ref
    .collection("ponds")
    .doc("stocked")
    .set({
      physicalPondId: "a",
      docStart: "2026-10-10",
      cycleStatus: "active",
    });
  await assert.rejects(
    f.command("planStocking", {
      targetId: "a",
      plannedStockingDate: "2026-11-03",
    }),
    { code: "failed-precondition" },
  );
});

test("two ponds follow independent H-20 plans, then actual DOC and retain cancelled preparation history", async (t) => {
  t.mock.method(Date, "now", () => Date.parse("2026-10-01T07:00:00Z"));
  const f = await fixture(),
    runtime = createSopRuntime(db);
  const definition = {
    title: "Cycle timing fixture",
    description: "Synthetic preparation and culture",
    language: "en",
    steps: [
      timedStep("prepare-water", ["preparation"], -20),
      timedStep("release-seed", ["stocking"], 0),
      timedStep("growout-feed", ["growout"], 1, 10),
    ],
  };
  const draft = await f.command("saveDraft", { definition });
  await f.command("approve", { sopId: draft.sopId, expectedRevision: 1 });
  const settings = {
    sopId: draft.sopId,
    pondIds: ["a", "b"],
    blockIds: [],
    lifetime: "standing",
    companyScope: false,
    managerId: f.owner,
    timeZone: "UTC",
  };
  await assert.rejects(
    f.command("previewAdoption", settings),
    /planned stocking date/,
  );
  await f.command("planStocking", {
    targetId: "a",
    plannedStockingDate: "2026-11-01",
  });
  await f.command("planStocking", {
    targetId: "b",
    plannedStockingDate: "2026-11-06",
  });
  const preview = await f.command("previewAdoption", settings);
  const ad = await f.command("activate", {
    ...settings,
    expectedVersionId: preview.versionId,
    expectedTargetSignature: preview.targetSignature,
  });
  const at = (date) => Date.parse(`${date}T07:00:00Z`);
  await f.ref.collection("sopAdoptions").doc(ad.adoptionId).update({ activatedAt: at("2026-10-01"), scheduleCursorAt: at("2026-10-01") });
  await runtime.tickAdoption(f.companyId, ad.adoptionId, at("2026-10-12"));
  const first = await f.ref.collection("tasks").get();
  assert.equal(first.size, 1);
  assert.equal(first.docs[0].data().target.id, "a");
  assert.equal(first.docs[0].data().step.id, "prepare-water");
  await runtime.tickAdoption(f.companyId, ad.adoptionId, at("2026-10-12"));
  assert.equal(
    (await f.ref.collection("tasks").get()).size,
    1,
    "Retries cannot duplicate H-20",
  );
  // A submitted preparation record must remain available for review after stocking.
  await f.ref
    .collection("tasks")
    .doc("submitted-history")
    .set({
      ...first.docs[0].data(),
      id: "submitted-history",
      status: "submitted",
      submittedAt: at("2026-10-12"),
      notes: "Synthetic preparation evidence awaiting review",
      submissionId: "fixture-submission",
    });
  const pond = {
    physicalPondId: "a",
    pondCycleId: "cycle-a",
    cycleStatus: "active",
    docStart: "2026-11-01",
    cycleStartMode: "new",
  };
  await f.ref.collection("ponds").doc("stocked-a").set(pond);
  await f.ref
    .collection("physicalPonds")
    .doc("a")
    .update({ activePondId: "stocked-a" });
  await runtime.project(
    f.companyId,
    "ponds",
    "stocked-a",
    { ...pond, __sopCreated: true },
    "stocking-fixture",
    at("2026-11-01"),
  );
  await runtime.tickAdoption(f.companyId, ad.adoptionId, at("2026-11-01"));
  let rows = (await f.ref.collection("tasks").get()).docs.map((d) => d.data());
  const old = rows.find((t) => t.id === first.docs[0].id);
  assert.equal(old.status, "cancelled");
  assert.ok(old.cancellationReason);
  assert.equal(
    rows.find((t) => t.id === "submitted-history").status,
    "needs_review",
  );
  assert.ok(
    rows.some(
      (t) =>
        t.step.id === "release-seed" &&
        t.target.id === "a" &&
        t.status === "open",
    ),
  );
  assert.ok(!rows.some((t) => t.step.id === "growout-feed"));
  await runtime.tickAdoption(f.companyId, ad.adoptionId, at("2026-11-02"));
  rows = (await f.ref.collection("tasks").get()).docs.map((d) => d.data());
  assert.ok(
    rows.some(
      (t) =>
        t.step.id === "growout-feed" &&
        t.target.id === "a" &&
        t.status === "open",
    ),
  );
  assert.ok(
    !rows.some(
      (t) =>
        t.step.id === "prepare-water" &&
        t.target.id === "a" &&
        t.purpose === "routine" &&
        t.status === "open",
    ),
  );
  assert.ok(
    rows
      .filter((t) => t.step.id === "growout-feed")
      .every((t) => t.windowStart >= Date.parse("2026-11-02T00:00Z")),
    "No growout reminders before actual stocking",
  );
});


test("daily pond records complete only their matching pond and cycle, and deletion revokes stale completion", async (t) => {
  const f = await fixture(), runtime = createSopRuntime(db);
  const now = Date.parse("2026-11-02T12:00:00Z");
  const realNow = Date.now;
  Date.now = () => now;
  t.after(() => { Date.now = realNow; });
  const pond = (id) => ({ physicalPondId: id, pondCycleId: `cycle-${id}`,
    cycleStatus: "active", docStart: "2026-11-01", cycleStartMode: "new", samplings: [] });
  for (const id of ["a", "b"]) {
    await f.ref.collection("ponds").doc(`stocked-${id}`).set(pond(id));
    await f.ref.collection("physicalPonds").doc(id).update({ activePondId: `stocked-${id}` });
  }
  await f.ref.collection("ponds").doc("unrelated-history").set({ physicalPondId: "outside", pondCycleId: "old-cycle", cycleStatus: "ended", docStart: "2025-01-01", samplings: [{ id: "old", date: "2025-01-02", phMorning: 8 }] });
  await f.ref.collection("labReports").doc("unneeded-lab").set({ status: "confirmed", sampleDate: "2026-11-02", pondResults: [{ pondId: "stocked-a", physicalPondId: "a", pondCycleId: "cycle-a", status: "confirmed", waterQuality: { phLab: 8 } }] });
  const recording = (field, unit) => {
    const step = emptySopStep(field.replaceAll(".", "-"));
    return { ...step, title: field, stages: ["growout"],
      trigger: { ...step.trigger, kind: "daily", at: "00:00", windowMinutes: 1440 },
      check: { ...step.check, field, unit, operator: "present", exactTime: false, freshnessMinutes: 1440 },
      requireNotes: false, requireAttachment: false };
  };
  const health = timedStep("dry-health", ["growout"], 10, 365);
  health.trigger.everyDays = 10;
  const draft = await f.command("saveDraft", { definition: { title: "Daily saved records", description: "", language: "en",
    steps: [recording("water.phMorning", ""), recording("water.doMorning", "mg/L"), recording("feeding.totalDailyFeed", "kg"), health] } });
  await f.command("approve", { sopId: draft.sopId, expectedRevision: 1 });
  const settings = { sopId: draft.sopId, pondIds: ["a", "b"], blockIds: [], lifetime: "standing", companyScope: false, managerId: f.owner, timeZone: "UTC" };
  const preview = await f.command("previewAdoption", settings);
  const ad = await f.command("activate", { ...settings, expectedVersionId: preview.versionId, expectedTargetSignature: preview.targetSignature });
  const tick = () => runtime.tickAdoption(f.companyId, ad.adoptionId, now);
  const tasks = async () => (await f.ref.collection("tasks").get()).docs.map(d => d.data()).filter(row => row.purpose === "routine");
  await tick();
  assert.equal((await tasks()).length, 6);
  const projected = (await f.ref.collection("sopEvidence").get()).docs.map(d => d.data());
  assert.ok(!projected.some(e => ["ponds/unrelated-history", "labReports/unneeded-lab"].includes(e.sourcePath)), "Water reminders cannot replay unrelated pond or unneeded lab history");
  assert.equal((await f.ref.collection("sopAdoptions").doc(ad.adoptionId).get()).data().baselineReconciledAt, now);
  assert.ok(!(await tasks()).some(row => row.step.id === "dry-health"), "DOC1 cannot create a DOC10 health task");
  const saved = { ...pond("a"), samplings: [{ id: "real-record", date: "2026-11-02", phMorning: 7.9, doMorning: 5.5, feedData: { totalDailyFeed: 12 } }] };
  await f.ref.collection("ponds").doc("stocked-a").set(saved);
  await runtime.project(f.companyId, "ponds", "stocked-a", saved, "saved-record", now);
  await tick();
  let rows = await tasks();
  assert.equal(rows.filter(row => row.target.id === "a" && row.status === "completed").length, 3);
  assert.equal(rows.filter(row => row.target.id === "b" && row.status === "open").length, 3);
  // A historical cycle on the same physical pond cannot satisfy current-cycle work.
  const oldCycle = { ...saved, physicalPondId: "b", pondCycleId: "old-cycle-b", cycleStatus: "closed" };
  await f.ref.collection("ponds").doc("old-b").set(oldCycle);
  await runtime.project(f.companyId, "ponds", "old-b", oldCycle, "wrong-cycle", now);
  await tick();
  assert.equal((await tasks()).filter(row => row.target.id === "b" && row.status === "completed").length, 0);
  await f.ref.collection("ponds").doc("stocked-a").set(pond("a"));
  await runtime.project(f.companyId, "ponds", "stocked-a", pond("a"), "deleted-record", now);
  await tick();
  rows = await tasks();
  assert.equal(rows.filter(row => row.target.id === "a" && row.status === "completed").length, 0);
});


test("updating unrelated SOP rules preserves an unchanged task awaiting manager review", async () => {
  const f = await fixture(), runtime = createSopRuntime(db);
  await f.ref.collection("ponds").doc("stocked-a").set({ physicalPondId: "a", pondCycleId: "cycle-a", cycleStatus: "active", docStart: "2026-10-10" });
  await f.ref.collection("physicalPonds").doc("a").update({ activePondId: "stocked-a" });
  const step = { ...timedStep("seed-review", ["growout"], 1, 365) };
  step.trigger.kind = "manual";
  const definition = { title: "Review preservation", description: "", language: "en", steps: [step] };
  const draft = await f.command("saveDraft", { definition });
  await f.command("approve", { sopId: draft.sopId, expectedRevision: 1 });
  const settings = { sopId: draft.sopId, pondIds: ["a"], blockIds: [], lifetime: "standing", companyScope: false, managerId: f.owner, timeZone: "UTC" };
  const preview = await f.command("previewAdoption", settings);
  const ad = await f.command("activate", { ...settings, expectedVersionId: preview.versionId, expectedTargetSignature: preview.targetSignature });
  await runtime.tickAdoption(f.companyId, ad.adoptionId, Date.now());
  const task = (await f.ref.collection("tasks").get()).docs[0];
  assert.ok(task);
  await task.ref.update({ status: "needs_review", result: "needs_review", notes: "Submitted seed evidence", submissionId: "submission-1" });
  await f.command("saveDraft", { sopId: draft.sopId, expectedRevision: 1, definition: { ...definition, description: "Updated guidance" } });
  await f.command("approve", { sopId: draft.sopId, expectedRevision: 2 });
  const current = (await f.ref.collection("sopAdoptions").doc(ad.adoptionId).get()).data();
  await f.command("migrate", { ...settings, adoptionId: ad.adoptionId, expectedRevision: current.revision, confirmMigration: true });
  const migrated = (await task.ref.get()).data();
  assert.equal(migrated.status, "needs_review");
  assert.equal(migrated.result, "needs_review");
  assert.equal(migrated.notes, "Submitted seed evidence");
  assert.equal(migrated.submissionId, "submission-1");
  assert.equal(migrated.versionId, "v2");
  assert.equal((await task.ref.collection("revisions").get()).size, 1);
});


test("ownership reconciliation synchronizes both assignees, pages active work and leaves completed history untouched", async () => {
  const f = await fixture(), runtime = createSopRuntime(db);
  await f.ref.collection("cycles").doc("cycle").set({ assignedTechnicianId: f.tech });
  await f.ref.collection("ponds").doc("pond").set({ physicalPondId: "a", pondCycleId: "cycle", cycleId: "cycle", cycleStatus: "active" });
  const step = timedStep("record", ["growout"], 1, 10);
  const batch = db.batch();
  for (let i = 0; i < 220; i++) batch.set(f.ref.collection("tasks").doc(`done-${i}`), {
    status: "completed", target: { id: "a", scope: "pond", pondId: "pond", assigneeId: f.owner },
    step, assigneeId: f.owner, managerId: f.owner, visibleTo: [f.owner], revision: 1,
  });
  for (let i = 0; i < 105; i++) batch.set(f.ref.collection("tasks").doc(`active-${String(i).padStart(3, "0")}`), {
    status: "open", target: { id: "a", scope: "pond", pondId: "pond", assigneeId: f.owner },
    step, assigneeId: f.owner, managerId: f.owner, visibleTo: [f.owner], revision: 1,
  });
  await batch.commit();
  await runtime.refreshAssignments(f.companyId);
  assert.equal((await f.ref.collection("tasks").doc("active-104").get()).data().assigneeId, f.owner, "First pass has a fixed page budget");
  await runtime.refreshAssignments(f.companyId);
  for (const id of ["active-000", "active-104"]) {
    const t = (await f.ref.collection("tasks").doc(id).get()).data();
    assert.equal(t.assigneeId, f.tech);
    assert.equal(t.target.assigneeId, f.tech);
    assert.deepEqual(t.visibleTo, [f.tech, f.owner]);
  }
  const revision = (await f.ref.collection("tasks").doc("active-000").get()).data().revision;
  await runtime.refreshAssignments(f.companyId);
  assert.equal((await f.ref.collection("tasks").doc("active-000").get()).data().revision, revision, "Reconciliation is idempotent");
  assert.equal((await f.ref.collection("tasks").doc("done-0").get()).data().revision, 1);
});

test("routine records entered later satisfy their performed day without spawning overdue corrections", async () => {
  const f = await fixture(), runtime = createSopRuntime(db);
  const day = "2026-10-10", morning = Date.parse(day + "T06:00Z");
  const step = { ...timedStep("water", ["growout"], 1, 20),
    check: { ...emptySopStep().check, field: "water.doMorning", operator: "present", exactTime: true },
  };
  const target = { id: "a", scope: "pond", pondId: "pond", cycleId: "cycle", name: "A", stage: "growout", stockingDate: "2026-10-01", assigneeId: f.tech };
  const ad = { id: "ad", managerId: f.owner, versionId: "v1", status: "active", timeZone: "UTC", recipients: [], definition: { title: "Water", description: "", language: "en", steps: [step] }, targets: [target] };
  await f.ref.collection("sopAdoptions").doc("ad").set(ad);
  const t = runtime.taskFrom(ad, step, target, day, morning, morning + 3600000);
  await f.ref.collection("tasks").doc(t.id).set(t);
  await runtime.evaluateTask(f.companyId, t.id, Date.parse(day + "T14:00Z"));
  assert.equal((await f.ref.collection("sopIssues").get()).size, 0, "An awaiting record is not a biological failure");
  await f.ref.collection("ponds").doc("pond").set({ physicalPondId: "a", pondCycleId: "cycle", cycleStatus: "active", docStart: "2026-10-01", samplings: [{ id: "reading", date: day, observedAtByField: { doMorning: Date.parse(day + "T09:00Z") }, doMorning: 6 }] });
  await runtime.project(f.companyId, "ponds", "pond", (await f.ref.collection("ponds").doc("pond").get()).data(), "late-record", Date.parse(day + "T14:00Z"));
  await runtime.evaluateTask(f.companyId, t.id, Date.parse(day + "T14:00Z"));
  assert.equal((await f.ref.collection("tasks").doc(t.id).get()).data().status, "completed");
  assert.equal((await f.ref.collection("sopIssues").get()).size, 0);
  await f.ref.collection("sopAdoptions").doc("another-active").set({ ...ad, id: "another-active" });
  await f.ref.collection("sopAdoptions").doc("ad").update({ status: "paused" });
  await f.ref.collection("ponds").doc("pond").update({ samplings: [] });
  await runtime.project(f.companyId, "ponds", "pond", (await f.ref.collection("ponds").doc("pond").get()).data(), "retract-late", Date.parse(day + "T15:00Z"));
  assert.equal((await f.ref.collection("tasks").doc(t.id).get()).data().status, "completed", "Paused work is preserved until its invalidation can be processed");
  assert.ok((await f.ref.collection("sopReevaluationJobs").where("status", "==", "pending").get()).size > 0);
  await f.ref.collection("sopAdoptions").doc("ad").update({ status: "active", nextDueAt: 0 });
  await runtime.project(f.companyId, "ponds", "pond", (await f.ref.collection("ponds").doc("pond").get()).data(), "resume-reconciliation", Date.parse(day + "T16:00Z"));
  assert.equal((await f.ref.collection("tasks").doc(t.id).get()).data().status, "open", "Source retraction still reopens completed work after resuming without scanning history");
});


test("fixed routine cadence preserves new-task follow-ups and concurrent source wake-ups", async (t) => {
  const f = await fixture(), runtime = createSopRuntime(db);
  let now = Date.parse("2026-11-02T12:00:00Z");
  t.mock.method(Date, "now", () => now);
  await f.ref.collection("ponds").doc("stocked-a").set({ physicalPondId: "a", pondCycleId: "cycle-a", cycleStatus: "active", docStart: "2026-11-01", samplings: [] });
  await f.ref.collection("physicalPonds").doc("a").update({ activePondId: "stocked-a" });
  const baseStep = emptySopStep("water");
  const step = { ...baseStep, title: "Water record", stages: ["growout"],
    trigger: { ...baseStep.trigger, kind: "daily", at: "00:00", windowMinutes: 1440 },
    check: { ...baseStep.check, field: "water.phMorning", operator: "present", exactTime: false },
    requireNotes: false, requireAttachment: false };
  const draft = await f.command("saveDraft", { definition: { title: "Fixed cadence", description: "", language: "en", steps: [step] } });
  await f.command("approve", { sopId: draft.sopId, expectedRevision: 1 });
  const settings = { sopId: draft.sopId, pondIds: ["a"], blockIds: [], lifetime: "standing", companyScope: false, managerId: f.owner, timeZone: "UTC" };
  const preview = await f.command("previewAdoption", settings);
  const activated = await f.command("activate", { ...settings, expectedVersionId: preview.versionId, expectedTargetSignature: preview.targetSignature });
  const adRef = f.ref.collection("sopAdoptions").doc(activated.adoptionId);
  await runtime.tickAdoption(f.companyId, activated.adoptionId, now);
  const firstDue = (await adRef.get()).data().nextDueAt;
  assert.ok(firstDue >= now && firstDue <= now + 60000, "New tasks and baseline projections are evaluated promptly");
  now += 60000;
  await runtime.tickAdoption(f.companyId, activated.adoptionId, now);
  assert.equal((await adRef.get()).data().nextDueAt, now + 1800000, "Settled routine work waits thirty minutes");
  const originalTransaction = db.runTransaction.bind(db);
  let injected = false;
  t.mock.method(db, "runTransaction", async (callback, ...options) => {
    if (!injected && callback.toString().includes("nextSopCheckAt")) {
      injected = true;
      await adRef.update({ nextDueAt: now, wakeRevision: require("firebase-admin/firestore").FieldValue.increment(1) });
    }
    return originalTransaction(callback, ...options);
  });
  await runtime.tickAdoption(f.companyId, activated.adoptionId, now);
  assert.ok(injected);
  assert.equal((await adRef.get()).data().nextDueAt, now, "A concurrent source event cannot be postponed");
});


test("compact workspaces paginate active work and history independently and keep status refreshes small", async () => {
  const f = await fixture(), runtime = createSopRuntime(db);
  await f.ref.update({businessSize:"enterprise"});
  await f.ref.collection("blocks").doc("block").set({assignedTechnicianId:f.tech});
  await f.ref.collection("physicalPonds").doc("a").update({blockId:"block"});
  const now=Date.now(), step={...emptySopStep("manual"),check:{...emptySopStep().check,field:"manual",operator:"present",unit:""}};
  const target={id:"a",scope:"pond",blockId:"block",cycleId:"cycle",name:"A",stage:"growout",assigneeId:f.tech};
  const ad={id:"ad",status:"active",revision:1,versionId:"v1",managerId:f.owner,timeZone:"UTC",definition:{steps:[step]},targets:[target]};
  await f.ref.collection("sopAdoptions").doc("ad").set(ad);
  const batch=db.batch();
  for(let index=0;index<110;index++){
    const task=runtime.taskFrom(ad,step,target,`active-${index}`,now,now+60000+index);
    batch.set(f.ref.collection("tasks").doc(task.id),task);
  }
  for(let index=0;index<28;index++){
    const task={...runtime.taskFrom(ad,step,target,`history-${index}`,now-86400000,now-1000-index),status:"completed",result:"pass"};
    batch.set(f.ref.collection("tasks").doc(task.id),task);
  }
  const urgent=runtime.taskFrom(ad,{...step,severity:"critical"},target,"urgent",now,now+3600000);
  batch.set(f.ref.collection("tasks").doc(urgent.id),urgent);
  for(let index=0;index<28;index++)batch.set(f.ref.collection("sopNotifications").doc(`message-${index}`),{recipientId:f.owner,createdAt:now-index,title:"Message",message:"Synthetic history",read:false});
  batch.set(f.ref.collection("sopNotifications").doc("private-tech"),{recipientId:f.tech,createdAt:now,title:"Private",message:"Technician message",read:false});
  await batch.commit();
  const compact=await f.service.snapshot(f.owner,f.companyId,{compact:true});
  assert.equal(compact.tasks.filter(t=>t.status==="open").length,101);
  assert.ok(compact.tasks.some(t=>t.id===urgent.id),"Critical work outside the earliest ordinary page remains visible");
  assert.equal(compact.notifications.length,25);
  assert.equal(compact.tasks.filter(t=>t.status==="completed").length,25);
  assert.ok(compact.nextActiveTaskCursor && compact.nextTaskCursor);
  const {sopHistory}=require("./history");
  const active=await sopHistory(db,f.owner,f.companyId,"activeTasks",compact.nextActiveTaskCursor);
  const history=await sopHistory(db,f.owner,f.companyId,"taskHistory",compact.nextTaskCursor);
  assert.equal(active.items.length,11);
  assert.equal(history.items.length,3);
  assert.ok(history.items.every(t=>t.status==="completed"));
  assert.equal((await sopHistory(db,f.owner,f.companyId,"notifications",compact.nextNotificationCursor)).items.length,3);
  const privateMessages=await sopHistory(db,f.tech,f.companyId,"notifications",null);
  assert.deepEqual(privateMessages.items.map(item=>item.id),["private-tech"]);
  const live=await f.service.snapshot(f.owner,f.companyId,{compact:true,liveTasks:true});
  assert.equal(live.tasks.length,25);
  assert.equal(live.nextActiveTaskCursor,"__first__");
  const status=await f.service.snapshot(f.owner,f.companyId,{compact:true,statusOnly:true,notificationsAfter:now});
  assert.ok(!("tasks" in status) && !("sources" in status) && !("sops" in status));
  assert.equal(status.summary.total,139);
  const {taskUpdates}=require("./taskUpdates");
  const task=compact.tasks[0];
  assert.equal((await taskUpdates(db,f.tech,f.companyId,[task.id])).items.length,1);
  await f.ref.collection("blocks").doc("block").update({assignedTechnicianId:f.owner});
  const revoked=await taskUpdates(db,f.tech,f.companyId,[task.id]);
  assert.equal(revoked.items.length,0);
  assert.deepEqual(revoked.removedIds,[task.id]);
  await assert.rejects(taskUpdates(db,"outsider",f.companyId,[task.id]));
});

test("manual idle evaluation guards expire at the deadline and are invalidated by submission", async () => {
  const f=await fixture(), runtime=createSopRuntime(db), now=Date.now();
  const step={...emptySopStep("manual"),check:{...emptySopStep().check,field:"manual",operator:"present",unit:""}};
  const target={id:"a",scope:"pond",cycleId:"cycle",name:"A",stage:"growout",assigneeId:f.owner};
  const ad={id:"ad",status:"active",revision:1,versionId:"v1",managerId:f.owner,timeZone:"UTC",definition:{steps:[step]},targets:[target]};
  await f.ref.collection("sopAdoptions").doc("ad").set(ad);
  const task=runtime.taskFrom(ad,step,target,"idle",now,now+60000), ref=f.ref.collection("tasks").doc(task.id);
  await ref.set(task);
  await runtime.evaluateTask(f.companyId,task.id,now);
  let current=(await ref.get()).data();
  assert.equal(current.nextEvaluationAt,task.dueAt+1);
  const revision=current.revision;
  await runtime.evaluateTask(f.companyId,task.id,now+1000);
  assert.equal((await ref.get()).data().revision,revision);
  await f.ref.collection("sopAdoptions").doc("ad").update({revision:2});
  await runtime.evaluateTask(f.companyId,task.id,now+2000);
  assert.equal((await ref.get()).data().evaluatedAdoptionRevision,2);
  await runtime.evaluateTask(f.companyId,task.id,task.dueAt+1);
  assert.equal((await f.ref.collection("sopIssues").get()).size,1,"Overdue manual checks still open an issue");
  const pending=runtime.taskFrom(ad,step,{...target,id:"b"},"submission",now,now+60000), pendingRef=f.ref.collection("tasks").doc(pending.id);
  await pendingRef.set(pending);
  await runtime.evaluateTask(f.companyId,pending.id,now);
  current=(await pendingRef.get()).data();
  assert.equal(current.nextEvaluationAt,pending.dueAt+1);
  await pendingRef.update({submittedAt:now+3000,notes:"Entered evidence",submissionId:"submission",revision:current.revision+1,status:"submitted"});
  await runtime.evaluateTask(f.companyId,pending.id,now+4000);
  assert.equal((await pendingRef.get()).data().result,"needs_review");
});


test("automatic waits wake on new pond evidence and source retraction still revokes completion", async () => {
  const f=await fixture(), runtime=createSopRuntime(db), now=Date.now(), day=new Date(now).toISOString().slice(0,10);
  const step={...emptySopStep("oxygen"),check:{...emptySopStep().check,field:"water.doMorning",operator:"range",min:5,max:8,exactTime:false},requireNotes:false,requireAttachment:false};
  const target={id:"a",pondId:"stocked-a",scope:"pond",blockId:"",cycleId:"cycle-a",name:"A",stage:"growout",assigneeId:f.owner};
  const ad={id:"ad",status:"active",revision:1,wakeRevision:0,versionId:"v1",managerId:f.owner,timeZone:"UTC",definition:{title:"Water",description:"",language:"en",steps:[step]},targets:[target]};
  const pond={physicalPondId:"a",pondCycleId:"cycle-a",cycleStatus:"active",docStart:day,samplings:[]};
  await f.ref.collection("physicalPonds").doc("a").update({activePondId:"stocked-a"});
  await f.ref.collection("ponds").doc("stocked-a").set(pond);
  await f.ref.collection("sopAdoptions").doc("ad").set(ad);
  const task={...runtime.taskFrom(ad,step,target,"empty-water",now,now+3600000),visibleTo:[f.owner]}, taskRef=f.ref.collection("tasks").doc(task.id);
  await taskRef.set(task);
  await runtime.evaluateTask(f.companyId,task.id,now);
  let current=(await taskRef.get()).data();
  assert.equal(current.evaluationInputEmpty,true);
  assert.equal(current.nextEvaluationAt,task.dueAt+1);
  const revision=current.revision;
  await runtime.evaluateTask(f.companyId,task.id,now+1000);
  assert.equal((await taskRef.get()).data().revision,revision);
  const saved={...pond,samplings:[{id:"reading",date:day,doMorning:6,observedAtByField:{doMorning:now+3000}}]};
  await f.ref.collection("ponds").doc("stocked-a").set(saved);
  await runtime.project(f.companyId,"ponds","stocked-a",saved,"record-created",now+3000);
  const adoption=(await f.ref.collection("sopAdoptions").doc("ad").get()).data();
  assert.ok(adoption.wakeRevision>current.evaluatedWakeRevision);
  await runtime.evaluateTask(f.companyId,task.id,now+4000);
  assert.equal((await taskRef.get()).data().result,"pass");
  await f.ref.collection("ponds").doc("stocked-a").set(pond);
  await runtime.project(f.companyId,"ponds","stocked-a",pond,"record-retracted",now+5000);
  await runtime.evaluateTask(f.companyId,task.id,now+6000);
  assert.equal((await taskRef.get()).data().status,"open");
});
