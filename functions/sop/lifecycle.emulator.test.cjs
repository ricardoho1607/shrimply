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

test("two ponds follow independent H-20 plans, then actual DOC and retain cancelled preparation history", async () => {
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
