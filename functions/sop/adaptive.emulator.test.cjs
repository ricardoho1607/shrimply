const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require("@firebase/rules-unit-testing");
const {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} = require("firebase/firestore");
const { initializeApp, deleteApp } = require("firebase-admin/app");
const { getStorage } = require("firebase-admin/storage");
const { ref: storageRef, uploadBytes, getBytes } = require("firebase/storage");
const { getFirestore } = require("firebase-admin/firestore");
const { createSopService } = require("./service");
const { createSopRuntime } = require("./runtime");
const { emptySopStep } = require("../shared/orsonDomain/sop/contracts");
const projectId = "demo-shrimply-sop";
let env,
  adminApp,
  db,
  service,
  runtime,
  clock = Date.parse("2026-10-08T06:00Z");
const originalNow = Date.now;
Date.now = () => clock;
const command = (uid, data) => {
  const payload = {
    companyId: "farm",
    operationId: `op-${Math.random().toString(36).slice(2)}`,
    ...data,
  };
  return data.action === "deleteSop"
    ? require("./delete").createDeleteSopHandler((request) =>
        service.command(request.auth?.uid, request.data),
      )({ auth: { uid }, data: payload })
    : service.command(uid, payload);
};
const get = async (name) =>
  (await db.collection(`companies/farm/${name}`).get()).docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
test.before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    storage: { rules: fs.readFileSync(path.resolve("storage.rules"), "utf8") },
    firestore: {
      rules: fs.readFileSync(path.resolve("firestore.rules"), "utf8"),
    },
  });
  await env.clearFirestore();
  adminApp = initializeApp(
    { projectId, storageBucket: `${projectId}.appspot.com` },
    "sop-integration",
  );
  db = getFirestore(adminApp);
  service = createSopService(db);
  runtime = createSopRuntime(db);
  await db.doc("companies/farm").set({
    ownerId: "owner",
    teamMembers: ["tech", "other"],
    timeZone: "UTC",
    businessSize: "enterprise",
    companyName: "Farm",
  });
  for (const [uid, role] of [
    ["owner", "owner"],
    ["tech", "technician"],
    ["other", "technician"],
  ])
    await db.doc(`users/${uid}`).set({ companyId: "farm", role });
  await db
    .doc("companies/foreign")
    .set({ ownerId: "stranger", teamMembers: [] });
  await db.doc("users/stranger").set({ companyId: "foreign", role: "owner" });
  await db
    .doc("companies/farm/blocks/block")
    .set({ companyId: "farm", name: "Block", assignedTechnicianId: "tech" });
  await db.doc("companies/farm/physicalPonds/physical").set({
    pondName: "Pond",
    blockId: "block",
    status: "active",
    activePondId: "pond",
  });
  await db.doc("companies/farm/ponds/pond").set({
    physicalPondId: "physical",
    pondCycleId: "cycle",
    blockId: "block",
    docStart: "2026-09-01",
    cycleStatus: "active",
    samplings: [],
  });
});
test.after(async () => {
  Date.now = originalNow;
  await env.cleanup();
  await deleteApp(adminApp);
});

let sopId, adoptionId;
test("staff can draft but cannot approve, and commands are replay safe", async () => {
  const definition = {
    title: "Water SOP",
    description: "Fixture limits for testing only",
    language: "en",
    steps: [
      {
        ...emptySopStep(),
        correctiveInstructions:
          "Confirm equipment and follow farm instructions.",
        check: { ...emptySopStep().check, min: 5, max: 8 },
        severity: "critical",
        recheckMinutes: 10,
        escalationMinutes: 30,
      },
    ],
  };
  const input = { action: "saveDraft", definition, operationId: "repeat" };
  const a = await command("tech", input),
    b = await command("tech", input);
  assert.equal(a.sopId, b.sopId);
  sopId = a.sopId;
  await assert.rejects(
    command("tech", { action: "approve", sopId }),
    /owner or manager/,
  );
  await command("owner", { action: "approve", sopId });
});
test("activation previews scope and pins an approved version", async () => {
  const input = {
    sopId,
    blockIds: ["block"],
    pondIds: [],
    managerId: "owner",
    lifetime: "standing",
    recipients: ["owner"],
  };
  const preview = await command("owner", {
    action: "previewAdoption",
    ...input,
  });
  assert.equal(preview.targets.length, 1);
  assert.equal(preview.targets[0].id, "physical");
  const result = await command("owner", { action: "activate", ...input });
  adoptionId = result.adoptionId;
  await runtime.tickAdoption("farm", adoptionId, clock);
  assert.equal(
    (await get("tasks")).filter((t) => t.purpose === "routine").length,
    1,
  );
});
test("date-only evidence cannot pass; out-of-range saved measurement creates one issue and recheck", async () => {
  clock += 60000;
  const p = {
    physicalPondId: "physical",
    pondCycleId: "cycle",
    blockId: "block",
    docStart: "2026-09-01",
    cycleStatus: "active",
    samplings: [{ id: "water", date: "2026-10-08", doMorning: 4 }],
  };
  // Firestore's update time is the source-event ordering fence. A fixed
  // observation clock must not make these newly saved events look stale.
  const dateOnlySaved = await db.doc("companies/farm/ponds/pond").set(p);
  await runtime.project(
    "farm",
    "ponds",
    "pond",
    p,
    "event-1",
    dateOnlySaved.writeTime.toMillis(),
  );
  let routine = (await get("tasks")).find((t) => t.purpose === "routine");
  await runtime.evaluateTask("farm", routine.id, clock);
  assert.equal(
    (await db.doc(`companies/farm/tasks/${routine.id}`).get()).data().result,
    "insufficient_evidence",
  );
  p.samplings[0].observedAtByField = {
    doMorning: new Date(clock).toISOString(),
  };
  const timedSaved = await db.doc("companies/farm/ponds/pond").set(p);
  await runtime.project(
    "farm",
    "ponds",
    "pond",
    p,
    "event-2",
    timedSaved.writeTime.toMillis(),
  );
  await runtime.evaluateTask("farm", routine.id, clock);
  await runtime.evaluateTask("farm", routine.id, clock);
  assert.equal((await get("sopIssues")).length, 1);
  assert.equal(
    (await get("tasks")).filter((t) => t.purpose === "corrective").length,
    1,
  );
  assert.equal(
    (await db.doc(`companies/farm/tasks/${routine.id}`).get()).data().status,
    "completed",
  );
  assert.equal(
    (await db.doc(`companies/farm/tasks/${routine.id}`).get()).data().result,
    "fail",
  );
});
test("recovery and corrective evidence require critical manager sign-off", async () => {
  const tasks = await get("tasks"),
    action = tasks.find((t) => t.purpose === "corrective"),
    recheck = tasks.find((t) => t.purpose === "recheck");
  await command("tech", {
    action: "submitEvidence",
    taskId: action.id,
    expectedRevision: action.revision,
    notes: "Inspected equipment and performed the farm-approved action.",
    attachments: [],
  });
  await runtime.evaluateTask("farm", action.id, clock);
  clock = recheck.windowStart + 60000;
  const p = (await db.doc("companies/farm/ponds/pond").get()).data();
  p.samplings[0].doMorning = 6;
  p.samplings[0].observedAtByField.doMorning = new Date(clock).toISOString();
  const recoverySaved = await db.doc("companies/farm/ponds/pond").set(p);
  await runtime.project(
    "farm",
    "ponds",
    "pond",
    p,
    "event-3",
    recoverySaved.writeTime.toMillis(),
  );
  await runtime.evaluateTask("farm", recheck.id, clock);
  const issue = (await get("sopIssues"))[0];
  assert.equal(issue.status, "closure_review");
  assert.equal(issue.recoveryVerified, true);
  const r = (await db.doc(`companies/farm/tasks/${recheck.id}`).get()).data();
  await assert.rejects(
    command("tech", {
      action: "review",
      taskId: recheck.id,
      result: "pass",
      reason: "Recovered",
    }),
    /owner or manager/,
  );
  await command("owner", {
    action: "review",
    taskId: recheck.id,
    result: "pass",
    reason: "Verified recovery reading and action",
    expectedRevision: r.revision,
  });
  assert.equal((await get("sopIssues"))[0].status, "closed");
  await runtime.evaluateTask("farm", recheck.id, clock);
  assert.equal((await get("sopIssues"))[0].status, "closed");
  p.samplings[0].doMorning = null;
  const retractedSaved = await db.doc("companies/farm/ponds/pond").set(p);
  await runtime.project(
    "farm",
    "ponds",
    "pond",
    p,
    "retracted",
    retractedSaved.writeTime.toMillis(),
  );
  await runtime.evaluateTask("farm", recheck.id, clock);
  assert.equal((await get("sopIssues"))[0].status, "open");
});
test("cross-company, direct forged compliance, and unassigned task access are denied", async () => {
  await assert.rejects(service.snapshot("stranger", "farm"), /access/);
  const task = (await get("tasks"))[0];
  const techDb = env.authenticatedContext("tech").firestore(),
    otherDb = env.authenticatedContext("other").firestore(),
    foreignDb = env.authenticatedContext("stranger").firestore();
  await assertSucceeds(getDoc(doc(techDb, "companies/farm/tasks", task.id)));
  await assertFails(getDoc(doc(otherDb, "companies/farm/tasks", task.id)));
  await assertFails(getDoc(doc(foreignDb, "companies/farm/tasks", task.id)));
  await assertFails(
    setDoc(
      doc(techDb, "companies/farm/tasks", task.id),
      { status: "completed", result: "pass" },
      { merge: true },
    ),
  );
  await assertSucceeds(
    getDocs(
      query(
        collection(techDb, "companies/farm/tasks"),
        where("visibleTo", "array-contains", "tech"),
        where("target.blockId", "in", ["block"]),
        where("status", "in", ["open", "scheduled", "submitted", "needs_review"]),
      ),
    ),
  );
});
test("publication is sanitized and withdrawal keeps private farm copies", async () => {
  const publication = await command("owner", { action: "publish", sopId });
  const pub = (
    await db.doc(`communitySops/${publication.publicationId}`).get()
  ).data();
  assert.ok(!pub.tasks && !pub.evidence);
  const copy = await command("owner", {
    action: "copyPublication",
    publicationId: publication.publicationId,
  });
  await command("owner", {
    action: "withdraw",
    publicationId: publication.publicationId,
    reason: "Review incorrect guidance",
  });
  assert.ok((await db.doc(`companies/farm/sops/${copy.sopId}`).get()).exists);
  assert.equal(
    (await db.doc(`communitySops/${publication.publicationId}`).get()).data()
      .status,
    "withdrawn",
  );
});

test("stage gates distinguish planned approval, staff-recorded events, and manager exceptions", async () => {
  await db
    .doc("companies/farm/physicalPonds/prep")
    .set({ pondName: "Preparation pond", blockId: "block" });
  const step = {
    ...emptySopStep(),
    title: "Inspect pond before stocking",
    scope: "pond",
    stages: ["preparation"],
    trigger: { ...emptySopStep().trigger, kind: "manual" },
    check: {
      ...emptySopStep().check,
      field: "manual",
      operator: "narrative",
      unit: "",
      exactTime: false,
      rubric: "Confirm inspection completed",
    },
    requireNotes: true,
    gateStage: "stocking",
    severity: "low",
    correctiveInstructions: "Review inspection",
  };
  const draft = await command("owner", {
    action: "saveDraft",
    definition: {
      title: "Preparation",
      language: "en",
      description: "Fixture",
      steps: [step],
    },
  });
  await command("owner", { action: "approve", sopId: draft.sopId });
  const ad = await command("owner", {
    action: "activate",
    sopId: draft.sopId,
    pondIds: ["prep"],
    blockIds: [],
    managerId: "owner",
    lifetime: "standing",
  });
  await runtime.tickAdoption("farm", ad.adoptionId, clock);
  assert.equal(
    (
      await require("./guards").stageGate(
        db,
        "tech",
        "farm",
        "prep",
        "stocking",
      )
    ).allowed,
    false,
  );
  await assert.rejects(
    command("owner", { action: "stage", targetId: "prep", stage: "stocking" }),
    /prerequisites/,
  );
  await assert.rejects(
    command("tech", {
      action: "stage",
      targetId: "prep",
      stage: "stocking",
      override: true,
      reason: "Bypass",
    }),
    /owner or manager/,
  );
  await command("tech", {
    action: "stage",
    targetId: "prep",
    stage: "stocking",
    actual: true,
    reason: "Stocking actually occurred; inspection pending.",
  });
  const transition = (
    await db.doc("companies/farm/sopStages/prep").get()
  ).data();
  assert.equal(transition.actual, true);
  assert.ok(transition.missingGates.length);
  await command("owner", { action: "retire", adoptionId: ad.adoptionId });
});
test("dynamic blocks inherit work and scheduler catch-up never duplicates occurrences", async () => {
  await db
    .doc("companies/farm/physicalPonds/second")
    .set({ pondName: "Second pond", blockId: "block", activePondId: "pond2" });
  await db.doc("companies/farm/ponds/pond2").set({
    physicalPondId: "second",
    pondCycleId: "cycle2",
    blockId: "block",
    docStart: "2026-09-01",
    cycleStatus: "active",
    samplings: [],
  });
  await runtime.tickAdoption("farm", adoptionId, clock);
  let tasks = (await get("tasks")).filter(
    (t) => t.adoptionId === adoptionId && t.purpose === "routine",
  );
  assert.ok(tasks.some((t) => t.target.id === "second"));
  clock += 3 * 86400000;
  await runtime.tickAdoption("farm", adoptionId, clock);
  const missed = (await get("tasks")).filter(
    (t) =>
      t.adoptionId === adoptionId &&
      t.purpose === "routine" &&
      t.target.id === "second",
  );
  assert.deepEqual(
    [
      ...new Set(
        missed.map((t) => new Date(t.windowStart).toISOString().slice(0, 10)),
      ),
    ].sort(),
    ["2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"],
  );
  // Newly overdue checks may legitimately create corrective/recheck work on
  // the next tick. Scheduled routine occurrences themselves must stay unique.
  const routineIds = async () =>
    (await get("tasks"))
      .filter(
        (task) => task.adoptionId === adoptionId && task.purpose === "routine",
      )
      .map((task) => task.id)
      .sort();
  const ids = await routineIds();
  await runtime.tickAdoption("farm", adoptionId, clock);
  assert.deepEqual(await routineIds(), ids);
});
test("private evidence files respect assignment and published guidance is copied without farm evidence", async () => {
  const task = (await get("tasks")).find(
    (t) => t.target.id === "second" && t.purpose === "routine",
  );
  const owner = env
      .authenticatedContext("owner")
      .storage(`gs://${projectId}.appspot.com`),
    tech = env
      .authenticatedContext("tech")
      .storage(`gs://${projectId}.appspot.com`),
    other = env
      .authenticatedContext("other")
      .storage(`gs://${projectId}.appspot.com`);
  const path = `companies/farm/sopAttachments/owner/evidence.txt`;
  await assertSucceeds(
    uploadBytes(storageRef(owner, path), Buffer.from("Inspection"), {
      contentType: "text/plain",
      customMetadata: { companyId: "farm", taskId: task.id },
    }),
  );
  await assertSucceeds(getBytes(storageRef(tech, path)));
  await assertFails(getBytes(storageRef(other, path)));
  const guidance = "companies/farm/sopAttachments/owner/guidance.txt";
  await assertSucceeds(
    uploadBytes(storageRef(owner, guidance), Buffer.from("Guidance only"), {
      contentType: "text/plain",
      customMetadata: { companyId: "farm", taskId: "guidance" },
    }),
  );
  const storage = getStorage(adminApp);
  const publicFiles = await require("./guidanceFiles").copyGuidance(
    storage,
    [{ path: guidance, name: "Guidance.txt" }],
    "communitySops/public-file",
  );
  await db.doc("communitySops/public-file").set({ status: "published" });
  await assertSucceeds(getBytes(storageRef(other, publicFiles[0].path)));
  await assertFails(
    uploadBytes(
      storageRef(other, publicFiles[0].path),
      Buffer.from("Tampered"),
      { contentType: "text/plain" },
    ),
  );
  const privateFiles = await require("./guidanceFiles").copyGuidance(
    storage,
    publicFiles,
    "companies/farm/sopAttachments/owner/private-copy",
  );
  assert.equal(privateFiles[0].path.split("/").length, 5);
  await assertSucceeds(getBytes(storageRef(tech, privateFiles[0].path)));
  await db
    .doc("companies/farm/blocks/block")
    .update({ assignedTechnicianId: "other" });
  await assertFails(getBytes(storageRef(tech, path)));
  await db
    .doc("companies/farm/blocks/block")
    .update({ assignedTechnicianId: "tech" });
});
test("withdrawal fan-out resumes with stable recipient state and no private-copy loss", async () => {
  const pub = await command("owner", { action: "publish", sopId });
  await db.doc("communitySopAdopters/withdrawal-link").set({
    publicationId: pub.publicationId,
    companyId: "farm",
    adoptionId,
    managerId: "owner",
  });
  await command("owner", {
    action: "withdraw",
    publicationId: pub.publicationId,
    reason: "Revised guidance",
  });
  const jobs = await db
    .collection("sopWithdrawalJobs")
    .where("publicationId", "==", pub.publicationId)
    .get();
  const process = require("./withdrawal").processWithdrawal;
  for (const job of jobs.docs) await process(db, job.ref);
  const notices = (await get("sopNotifications")).filter(
    (n) => n.title === "An adopted SOP was withdrawn",
  );
  assert.ok(notices.length);
  const n = notices[0];
  await command("owner", { action: "markRead", notificationId: n.id });
  for (const job of jobs.docs) await process(db, job.ref);
  assert.equal(
    (await db.doc(`companies/farm/sopNotifications/${n.id}`).get()).data().read,
    true,
  );
});
test("future updates preserve old work; explicit migration keeps a prior task snapshot", async () => {
  const old = (await db.doc(`companies/farm/sops/${sopId}`).get()).data();
  const originalTasks = (await get("tasks")).filter(
    (t) => t.adoptionId === adoptionId,
  );
  await command("owner", {
    action: "saveDraft",
    sopId,
    expectedRevision: old.revision,
    definition: {
      ...old.definition,
      steps: old.definition.steps.map((s) => ({
        ...s,
        check: { ...s.check, min: 6.5 },
      })),
    },
  });
  await command("owner", { action: "approve", sopId });
  const ad = (
    await db.doc(`companies/farm/sopAdoptions/${adoptionId}`).get()
  ).data();
  await command("owner", {
    action: "activate",
    sopId,
    adoptionId,
    expectedRevision: ad.revision,
  });
  for (const task of originalTasks)
    assert.equal(
      (await db.doc(`companies/farm/tasks/${task.id}`).get()).data().step.check
        .min,
      5,
    );
  const current = (
    await db.doc(`companies/farm/sopAdoptions/${adoptionId}`).get()
  ).data();
  await command("owner", {
    action: "migrate",
    sopId,
    adoptionId,
    expectedRevision: current.revision,
    confirmMigration: true,
  });
  const migrated = (await get("tasks")).find(
    (t) => t.adoptionId === adoptionId && t.migrationFrom,
  );
  assert.ok(migrated);
  assert.equal(migrated.step.check.min, 6.5);
  assert.ok(
    (await db.collection(`companies/farm/tasks/${migrated.id}/revisions`).get())
      .size,
  );
  const history = await require("./versions").sopVersions(
    db,
    "tech",
    "farm",
    sopId,
  );
  assert.equal(history.items.length, 2);
  assert.equal(
    history.items.find((v) => v.definition.steps[0].check.min === 5).definition
      .steps[0].check.min,
    5,
  );
});
test("device delivery respects quiet hours, critical bypass, and retry identities", async () => {
  await command("owner", {
    action: "registerDevice",
    token: "ExpoPushToken[acceptance-owner]",
    quietStart: "00:00",
    quietEnd: "23:59",
  });
  const ref = db.doc("companies/farm/sopNotifications/push-critical");
  for (const severity of ["critical", "low"])
    await db
      .doc(
        `companies/farm/sopNotifications/push-${severity === "critical" ? "critical" : "routine"}`,
      )
      .set({
        recipientId: "owner",
        severity,
        title: "Farm work",
        taskId: "task",
        createdAt: clock,
        pushStatus: "pending",
        nextAttemptAt: clock,
        read: false,
      });
  const sent = [];
  const fetcher = async (url, options) => {
    const body = JSON.parse(options.body);
    sent.push(body);
    return {
      ok: true,
      json: async () => ({ data: { status: "ok", id: "receipt-test" } }),
    };
  };
  const push = require("./push");
  await push.deliverSopPush(db, fetcher, clock, ref);
  await push.deliverSopPush(db, fetcher, clock, ref);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].channelId, "sop-critical");
  assert.ok(!sent[0].body.includes("Pond"));
  await push.deliverSopPush(
    db,
    fetcher,
    clock,
    db.doc("companies/farm/sopNotifications/push-routine"),
  );
  assert.equal(sent.length, 1);
  assert.equal(
    (await db.doc("companies/farm/sopNotifications/push-routine").get()).data()
      .pushStatus,
    "pending",
  );
  assert.equal(push.isQuiet(clock, "UTC", "00:00", "00:00"), false);
});
test("offline replay has one submission and stale evidence is explicitly reviewed", async () => {
  const task = (await get("tasks")).find(
    (t) => t.status === "open" && t.assigneeId === "tech",
  );
  assert.ok(task);
  const input = {
    action: "submitEvidence",
    taskId: task.id,
    operationId: "offline-stable",
    notes: "Offline inspection claim",
    attachments: [],
    observedAt: new Date(clock - 60000).toISOString(),
    expectedRevision: task.revision - 1,
  };
  await command("tech", input);
  await command("tech", input);
  const actual = (await db.doc(`companies/farm/tasks/${task.id}`).get()).data();
  assert.equal(actual.status, "needs_review");
  assert.equal(actual.evidenceObservedAt, clock - 60000);
  const submissions = (await get("sopSubmissions")).filter(
    (s) => s.taskId === task.id && s.notes === "Offline inspection claim",
  );
  assert.equal(submissions.length, 1);
  assert.equal(submissions[0].receivedAt, clock);
  await db
    .doc("companies/farm/blocks/block")
    .update({ assignedTechnicianId: "other" });
  await runtime.refreshAssignments("farm");
  await assert.rejects(
    command("tech", { ...input, operationId: "revoked-offline" }),
    /assignment|block/,
  );
  await db
    .doc("companies/farm/blocks/block")
    .update({ assignedTechnicianId: "tech" });
  await runtime.refreshAssignments("farm");
});
test("date-only committed harvests trigger shared block work once and corrections do not replay the occurrence", async () => {
  const existing = (
    await db.doc(`companies/farm/sopAdoptions/${adoptionId}`).get()
  ).data();
  const step = {
    ...emptySopStep(),
    id: "harvest-review",
    title: "Review recorded harvest",
    scope: "block",
    stages: ["growout"],
    trigger: {
      ...emptySopStep().trigger,
      kind: "event",
      event: "harvest",
      windowMinutes: 60,
    },
    check: {
      ...emptySopStep().check,
      field: "manual",
      operator: "present",
      unit: "",
      exactTime: false,
    },
    correctiveInstructions: "Manager reviews the record.",
  };
  const block = {
    ...existing.targets[0],
    id: "block",
    scope: "block",
    pondId: "",
    physicalPondId: "",
    cycleId: "",
    blockId: "block",
    assigneeId: "tech",
  };
  await db.doc("companies/farm/sopAdoptions/shared-event").set({
    ...existing,
    id: "shared-event",
    targets: [block],
    selector: { pondIds: [], blockIds: ["block"], companyScope: false },
    definition: { ...existing.definition, steps: [step] },
    baselineReconciledAt: clock,
    scheduleCursorAt: clock,
  });
  const record = {
    date: "2026-10-08",
    ponds: [{ pondId: "pond", biomass: "12" }],
  };
  await db.doc("companies/farm/harvestRecords/event-harvest").set(record);
  await runtime.project(
    "farm",
    "harvestRecords",
    "event-harvest",
    record,
    "harvest-created",
    clock,
  );
  await runtime.tickAdoption("farm", "shared-event", clock);
  const tasks = () =>
    db
      .collection("companies/farm/tasks")
      .where("adoptionId", "==", "shared-event")
      .get();
  assert.equal((await tasks()).size, 1);
  const evidence = (await get("sopEvidence")).find(
    (e) => e.sourcePath === "harvestRecords/event-harvest",
  );
  assert.equal(evidence.observedAt, null);
  await runtime.project(
    "farm",
    "harvestRecords",
    "event-harvest",
    record,
    "harvest-duplicate",
    clock + 1,
  );
  await runtime.tickAdoption("farm", "shared-event", clock + 1);
  assert.equal((await tasks()).size, 1);
  record.ponds[0].biomass = "14";
  await db.doc("companies/farm/harvestRecords/event-harvest").set(record);
  await runtime.project(
    "farm",
    "harvestRecords",
    "event-harvest",
    record,
    "harvest-corrected",
    clock + 2,
  );
  await runtime.tickAdoption("farm", "shared-event", clock + 2);
  assert.equal((await tasks()).size, 1);
});
test("company preparation work is generated without an active production cycle", async () => {
  const existing = (
    await db.doc(`companies/farm/sopAdoptions/${adoptionId}`).get()
  ).data();
  await db
    .doc("companies/preparation")
    .set({ ownerId: "owner", teamMembers: [], timeZone: "UTC" });
  const step = {
    ...emptySopStep(),
    id: "prep",
    scope: "company",
    stages: ["preparation"],
    trigger: { ...emptySopStep().trigger, kind: "manual" },
    check: {
      ...emptySopStep().check,
      field: "manual",
      unit: "",
      operator: "present",
      exactTime: false,
    },
  };
  await db.doc("companies/preparation/sopAdoptions/prep").set({
    ...existing,
    id: "prep",
    blockIds: [],
    pondIds: [],
    definition: { ...existing.definition, steps: [step] },
    targets: [
      {
        id: "company",
        scope: "company",
        cycleId: "",
        blockId: "",
        stage: "growout",
        assigneeId: "owner",
      },
    ],
    baselineReconciledAt: clock,
    selector: { pondIds: [], blockIds: [], companyScope: true },
  });
  await runtime.tickAdoption("preparation", "prep", clock);
  const tasks = await db.collection("companies/preparation/tasks").get();
  assert.equal(tasks.size, 1);
  assert.equal(tasks.docs[0].data().target.stage, "preparation");
});
test("source changes awaiting projection cannot receive an authoritative pass", async () => {
  const sourceRef = db.doc("companies/farm/ponds/pond"),
    source = (await sourceRef.get()).data();
  source.samplings = [
    {
      id: "pending-source",
      date: "2026-10-08",
      doMorning: "7",
      observedAtByField: { doMorning: new Date(clock).toISOString() },
    },
  ];
  await sourceRef.set(source);
  // Baseline reconciliation uses committed update times; this later write
  // must not be rejected as an older event from the synthetic farm clock.
  const committedAt = (await sourceRef.get()).updateTime.toMillis();
  await runtime.project("farm", "ponds", "pond", source, "source-valid", committedAt);
  const projected = (await get("sopEvidence")).filter(
    (e) =>
      e.sourcePath === "ponds/pond" &&
      e.field === "water.doMorning" &&
      !e.deleted,
  );
  assert.ok(projected.length);
  const current = require("./currentEvidence").currentEvidence;
  assert.equal(
    await db.runTransaction((tx) =>
      current(tx, db.doc("companies/farm"), projected),
    ),
    true,
  );
  source.samplings[0].doMorning = "2";
  await sourceRef.set(source);
  assert.equal(
    await db.runTransaction((tx) =>
      current(tx, db.doc("companies/farm"), projected),
    ),
    false,
  );
});
test("manager review requires complete manual evidence and not-applicable remains an exemption", async () => {
  const task = (await db.collection("companies/preparation/tasks").get())
    .docs[0];
  const input = {
    companyId: "preparation",
    taskId: task.id,
    action: "review",
    result: "pass",
    reason: "Reviewed",
    expectedRevision: task.data().revision,
  };
  await assert.rejects(command("owner", input), /complete required evidence/);
  await command("owner", {
    ...input,
    result: "not_applicable",
    reason: "Preparation activity does not apply to this site.",
  });
  const actual = (await task.ref.get()).data();
  assert.equal(actual.status, "waived");
  assert.equal(actual.result, "not_applicable");
  assert.ok(actual.waiverReason);
});
test("queued evidence checks the adoption revision and remains in human review after evaluation", async () => {
  const task = (
    await db
      .collection("companies/farm/tasks")
      .where("adoptionId", "==", "shared-event")
      .get()
  ).docs[0];
  await command("tech", {
    action: "submitEvidence",
    taskId: task.id,
    expectedRevision: task.data().revision,
    expectedAdoptionRevision: -1,
    notes: "Inspection recorded while offline under previous scope.",
    attachments: [],
  });
  await runtime.evaluateTask("farm", task.id, clock);
  const actual = (await task.ref.get()).data();
  assert.equal(actual.requiresHumanReview, true);
  assert.equal(actual.status, "needs_review");
  const claim = (await get("sopSubmissions")).find((s) => s.taskId === task.id);
  assert.equal(claim.expectedAdoptionRevision, -1);
  assert.ok(claim.adoptionRevision > 0);
});
test("a departing block member leaves future scope and unchanged membership does not create repeated revisions", async () => {
  await db
    .doc("companies/farm/blocks/different-block")
    .set({ name: "Other", assignedTechnicianId: "other" });
  const batch = db.batch();
  batch.update(db.doc("companies/farm/physicalPonds/physical"), {
    blockId: "different-block",
  });
  batch.update(db.doc("companies/farm/ponds/pond"), {
    blockId: "different-block",
  });
  await batch.commit();
  await runtime.tickAdoption("farm", adoptionId, clock);
  const ref = db.doc(`companies/farm/sopAdoptions/${adoptionId}`),
    current = (await ref.get()).data();
  assert.ok(!current.targets.some((t) => t.id === "physical"));
  await runtime.tickAdoption("farm", adoptionId, clock);
  assert.equal((await ref.get()).data().revision, current.revision);
  assert.ok((await ref.collection("membershipRevisions").get()).size);
});

test("readable SOP content survives draft reload, approval, versions and publication copy", async () => {
  const content = require("./fixtures/water-content.json");
  const definition = {
    title: "Source-content preservation fixture",
    description: "Test fixture, not approved biological advice.",
    language: "id",
    content,
    steps: [
      {
        ...emptySopStep(),
        trigger: { ...emptySopStep().trigger, kind: "manual" },
        check: { ...emptySopStep().check, operator: "present" },
        correctiveInstructions: "Review findings with the manager.",
      },
    ],
  };
  const saved = await command("owner", { action: "saveDraft", definition });
  const reloaded = (
    await db.doc(`companies/farm/sops/${saved.sopId}`).get()
  ).data();
  assert.deepEqual(reloaded.definition.content, content);
  await command("owner", {
    action: "approve",
    sopId: saved.sopId,
    expectedRevision: reloaded.revision,
  });
  const history = await require("./versions").sopVersions(
    db,
    "owner",
    "farm",
    saved.sopId,
  );
  assert.deepEqual(history.items[0].definition.content, content);
  const published = await command("owner", {
    action: "publish",
    sopId: saved.sopId,
  });
  const publication = (
    await db.doc(`communitySops/${published.publicationId}`).get()
  ).data();
  assert.deepEqual(publication.definition.content, content);
  const copy = await command("owner", {
    action: "copyPublication",
    publicationId: published.publicationId,
  });
  const copied = (
    await db.doc(`companies/farm/sops/${copy.sopId}`).get()
  ).data();
  assert.deepEqual(copied.definition.content, content);
});
test("SOP deletion is recoverable, scoped, revision checked and withdraws publications", async () => {
  const definition = {
    title: "Recoverable procedure",
    description: "Deletion regression fixture",
    language: "en",
    attachments: [],
    steps: [
      {
        ...emptySopStep(),
        check: { ...emptySopStep().check, operator: "present" },
        correctiveInstructions: "Ask the manager to review.",
      },
    ],
  };
  const saved = await command("tech", { action: "saveDraft", definition });
  const sopId = saved.sopId,
    ref = db.doc(`companies/farm/sops/${sopId}`);
  await assert.rejects(
    command("other", { action: "deleteSop", sopId, expectedRevision: 1 }),
    /own drafts/,
  );
  await assert.rejects(
    command("stranger", { action: "deleteSop", sopId }),
    /permission|company|member/i,
  );
  await assert.rejects(
    command("tech", { action: "deleteSop", sopId, expectedRevision: 0 }),
    /changed/,
  );
  await command("tech", { action: "deleteSop", sopId, expectedRevision: 1 });
  assert.equal((await ref.get()).data().status, "deleted");
  assert.deepEqual((await ref.get()).data().definition, definition);
  await assert.rejects(
    command("tech", { action: "saveDraft", sopId, definition }),
    /Restore/,
  );
  await assert.rejects(
    command("owner", { action: "approve", sopId }),
    /Restore/,
  );
  await command("tech", { action: "restoreSop", sopId, expectedRevision: 2 });
  assert.equal((await ref.get()).data().status, "draft");
  await command("owner", { action: "approve", sopId });
  const publication = await command("owner", { action: "publish", sopId });
  await assert.rejects(
    command("tech", { action: "deleteSop", sopId }),
    /own drafts/,
  );
  await command("owner", { action: "deleteSop", sopId });
  assert.equal(
    (await db.doc(`communitySops/${publication.publicationId}`).get()).data()
      .status,
    "withdrawn",
  );
  assert.ok((await ref.collection("versions").get()).size);
  const jobs = await db
    .collection("sopWithdrawalJobs")
    .where("publicationId", "==", publication.publicationId)
    .get();
  assert.equal(jobs.size, 1);
  await assert.rejects(
    command("owner", { action: "activate", sopId }),
    /Approve/,
  );
  await command("owner", { action: "restoreSop", sopId });
  assert.equal((await ref.get()).data().status, "approved");
  assert.equal(
    (await db.doc(`communitySops/${publication.publicationId}`).get()).data()
      .status,
    "withdrawn",
  );
});
