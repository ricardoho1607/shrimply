const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { initializeApp, deleteApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { createSopService } = require("./service");
const { createSopRuntime } = require("./runtime");
const { emptySopStep } = require("../shared/orsonDomain/sop/contracts");
const { validateSop, farmDate } = require("../shared/orsonDomain/sop/engine");
let app, db;
test.before(() => {
  app = initializeApp(
    { projectId: "demo-shrimply-sop" },
    "adoption-regression",
  );
  db = getFirestore(app);
});
test.after(() => deleteApp(app));
const manual = (id, stages) => ({
  ...emptySopStep(id),
  title: id,
  instructions: "Synthetic QA written evidence",
  stages,
  trigger: { ...emptySopStep().trigger, kind: "manual", windowMinutes: 120 },
  check: {
    ...emptySopStep().check,
    field: "manual",
    operator: "narrative",
    exactTime: false,
    unit: "",
    rubric: "Review the saved QA notes",
  },
  requireNotes: true,
});
const definition = () => ({
  title: "Adoption regression",
  description: "Isolated QA",
  language: "en",
  steps: [
    manual("water-formation", ["stocking"]),
    manual("seed-selection", ["stocking"]),
    manual("preparation", ["preparation"]),
    ...["water", "feed", "health", "siphon"].map((id) =>
      manual(id, ["growout"]),
    ),
  ],
});
async function fixture() {
  const companyId = `adoption-${randomUUID()}`,
    owner = `${companyId}-owner`,
    tech = `${companyId}-tech`;
  const base = db.doc(`companies/${companyId}`),
    now = Date.now();
  await Promise.all([
    base.set({
      ownerId: owner,
      teamMembers: [tech],
      companyName: "QA",
      businessSize: "enterprise",
      timeZone: "Australia/Melbourne",
    }),
    db.doc(`users/${owner}`).set({ companyId, role: "owner" }),
    db.doc(`users/${tech}`).set({ companyId, role: "technician" }),
    base
      .collection("blocks")
      .doc("qa")
      .set({ assignedTechnicianId: tech, name: "QA" }),
    ...["a", "b"].flatMap((id) => [
      base
        .collection("physicalPonds")
        .doc(id)
        .set({
          pondName: id.toUpperCase(),
          blockId: "qa",
          activePondId: `${id}-current`,
        }),
      base
        .collection("ponds")
        .doc(`${id}-current`)
        .set({
          physicalPondId: id,
          pondCycleId: `${id}-cycle`,
          blockId: "qa",
          docStart: farmDate(now, "Australia/Melbourne"),
          cycleStatus: "active",
          samplings: [],
        }),
      base
        .collection("sopStages")
        .doc(id)
        .set({ stage: "stocking", changedAt: now }),
    ]),
  ]);
  const service = createSopService(db);
  const command = (action, input = {}, actor = owner) =>
    service.command(actor, {
      companyId,
      operationId: randomUUID(),
      action,
      ...input,
    });
  const def = definition();
  assert.deepEqual(validateSop(def), []);
  const saved = await command("saveDraft", { definition: def });
  await command("approve", {
    sopId: saved.sopId,
    expectedRevision: saved.revision,
  });
  const settings = {
    sopId: saved.sopId,
    pondIds: ["a", "b"],
    blockIds: [],
    managerId: owner,
    lifetime: "cycle",
    recipients: [tech],
  };
  return { companyId, base, owner, tech, command, settings, now };
}

// Intercept historical provider reads, while every permitted read/write uses the real emulator.
function trackHistory(companyId, forbid = false) {
  const reads = [];
  const history = new Set([
    "waterObservations",
    "feeds",
    "additives",
    "harvestRecords",
    "labReports",
    "assets",
  ]);
  function wrapQuery(query, kind) {
    return new Proxy(query, {
      get(target, key) {
        if (key === "get")
          return () => {
            reads.push(kind);
            if (forbid) throw new Error(`Forbidden baseline replay: ${kind}`);
            return target.get();
          };
        if (key === "where")
          return (...args) => wrapQuery(target.where(...args), kind);
        const value = target[key];
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  }
  const wrapped = new Proxy(db, {
    get(target, key) {
      if (key === "collection")
        return (path) => {
          const collection = target.collection(path);
          if (path === "assets") return wrapQuery(collection, "assets");
          if (path !== "companies") return collection;
          return new Proxy(collection, {
            get(target, key) {
              if (key === "doc")
                return (id) => {
                  const ref = target.doc(id);
                  if (id !== companyId) return ref;
                  return new Proxy(ref, {
                    get(target, key) {
                      if (key === "collection")
                        return (kind) =>
                          history.has(kind)
                            ? wrapQuery(target.collection(kind), kind)
                            : target.collection(kind);
                      const value = target[key];
                      return typeof value === "function"
                        ? value.bind(target)
                        : value;
                    },
                  });
                };
              const value = target[key];
              return typeof value === "function" ? value.bind(target) : value;
            },
          });
        };
      const value = target[key];
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  return { runtime: createSopRuntime(wrapped), reads };
}

test("two DOC0 ponds inherit their technician and create four manual tasks without replaying unrelated SIM history", async () => {
  const f = await fixture();
  await f.base
    .collection("ponds")
    .doc("old-sim")
    .set({
      pondName: "Unrelated old SIM",
      cycleStatus: "ended",
      docStart: "2025-01-01",
      samplings: Array.from({ length: 60 }, (_, i) => ({
        date: `2025-02-${String((i % 28) + 1).padStart(2, "0")}`,
        mbw: 5,
      })),
    });
  await f.base
    .collection("labReports")
    .doc("old-sim-report")
    .set({ pondId: "old-sim", date: "2025-02-01", status: "confirmed" });
  const preview = await f.command("previewAdoption", f.settings);
  assert.deepEqual(preview.targets.map((t) => [t.id, t.assigneeId]).sort(), [
    ["a", f.tech],
    ["b", f.tech],
  ]);
  const activated = await f.command("activate", {
    ...f.settings,
    expectedVersionId: preview.versionId,
  });
  const guarded = trackHistory(f.companyId, true);
  await guarded.runtime.tickAdoption(f.companyId, activated.adoptionId, f.now);
  const tasks = () =>
    f.base
      .collection("tasks")
      .where("adoptionId", "==", activated.adoptionId)
      .get();
  const first = await tasks();
  assert.equal(first.size, 4);
  assert.deepEqual(guarded.reads, []);
  for (const task of first.docs.map((d) => d.data())) {
    assert.equal(task.assigneeId, f.tech);
    assert.deepEqual(task.visibleTo.sort(), [f.owner, f.tech].sort());
    assert.equal(task.target.stage, "stocking");
    assert.equal(
      task.target.stockingDate,
      farmDate(f.now, "Australia/Melbourne"),
    );
    assert.equal(task.windowStart, f.now);
    assert.equal(task.dueAt, f.now + 120 * 60000);
  }
  await guarded.runtime.tickAdoption(
    f.companyId,
    activated.adoptionId,
    f.now + 1000,
  );
  assert.deepEqual(
    (await tasks()).docs.map((d) => d.id).sort(),
    first.docs.map((d) => d.id).sort(),
  );
  assert.equal(
    (
      await f.base
        .collection("sopNotifications")
        .where("adoptionId", "==", activated.adoptionId)
        .get()
    ).size,
    4,
  );
  assert.equal(
    (
      await f.base.collection("sopAdoptions").doc(activated.adoptionId).get()
    ).data().baselineReconciledAt,
    0,
  );
  const technicianWorkspace = await createSopService(db).snapshot(
    f.tech,
    f.companyId,
  );
  assert.equal(technicianWorkspace.tasks.length, 4);
  assert.equal(technicianWorkspace.adoptions[0].targets.length, 2);
  await assert.rejects(
    f.command("activate", f.settings, f.tech),
    (error) => error.code === "permission-denied",
  );
});

test("current-cycle adoption refuses to silently drop a selected unstocked pond; standing adoption includes it", async () => {
  const f = await fixture();
  await f.base
    .collection("physicalPonds")
    .doc("prep")
    .set({ pondName: "Preparation pond", blockId: "qa" });
  const input = { ...f.settings, pondIds: ["a", "prep"] };
  await assert.rejects(
    f.command("previewAdoption", input),
    /Preparation pond has no active cycle/,
  );
  const preview = await f.command("previewAdoption", {
    ...input,
    lifetime: "standing",
  });
  assert.deepEqual(preview.targets.map((t) => t.id).sort(), ["a", "prep"]);
  const membership = await db.runTransaction((tx) =>
    createSopService(db).resolveTargets(
      tx,
      f.base,
      input,
      definition(),
      { ownerId: f.owner, teamMembers: [f.tech] },
      true,
    ),
  );
  assert.deepEqual(
    membership.targets.map((target) => target.id),
    ["a"],
  );
});

test("legacy physical IDs remain selectable when only cycle records exist", async () => {
  const f = await fixture();
  await f.base
    .collection("ponds")
    .doc("legacy-cycle")
    .set({
      physicalPondId: "legacy-physical",
      pondName: "Legacy",
      blockId: "qa",
      docStart: farmDate(f.now, "Australia/Melbourne"),
      cycleStatus: "active",
    });
  const preview = await f.command("previewAdoption", {
    ...f.settings,
    pondIds: ["legacy-physical"],
  });
  assert.equal(preview.targets[0].id, "legacy-physical");
  assert.equal(preview.targets[0].assigneeId, f.tech);
});

test("acceptance rejects an assignment change after preview instead of sending work to an unreviewed technician", async () => {
  const f = await fixture();
  const preview = await f.command("previewAdoption", f.settings);
  await f.base
    .collection("blocks")
    .doc("qa")
    .update({ assignedTechnicianId: f.owner });
  await assert.rejects(
    f.command("activate", {
      ...f.settings,
      expectedVersionId: preview.versionId,
      expectedTargetSignature: preview.targetSignature,
    }),
    /assignments or production stages changed/,
  );
  assert.equal((await f.base.collection("sopAdoptions").get()).size, 0);
});

test("measured checks and inactive measured branches still reconcile history; invalid definitions cannot bypass replay", async () => {
  const f = await fixture();
  const measured = {
    ...emptySopStep("measured"),
    title: "Measured",
    instructions: "Read saved DO",
    stages: ["growout"],
    check: { ...emptySopStep().check, min: 5, max: 8 },
  };
  for (const [id, steps] of [
    ["measured", [measured]],
    [
      "mixed",
      [{ ...manual("root", ["stocking"]), onPass: ["measured"] }, measured],
    ],
  ]) {
    const def = { ...definition(), steps };
    assert.deepEqual(validateSop(def), []);
    await f.base.collection("sopAdoptions").doc(id).set({
      id,
      definition: def,
      targets: [],
      status: "active",
      versionId: "v1",
      revision: 1,
      timeZone: "Australia/Melbourne",
      lifetime: "standing",
      activatedAt: f.now,
      scheduleCursorAt: f.now,
      baselineReconciledAt: 0,
    });
    const tracked = trackHistory(f.companyId);
    await tracked.runtime.tickAdoption(f.companyId, id, f.now);
    assert.ok(tracked.reads.includes("waterObservations"));
    assert.ok(!tracked.reads.includes("assets"), "Water checks do not replay unrelated equipment history");
    assert.equal(
      (await f.base.collection("sopAdoptions").doc(id).get()).data()
        .baselineReconciledAt,
      f.now,
    );
  }
  const { isFullyValidManualOnly } = require("./runtime");
  for (const def of [
    null,
    { ...definition(), steps: [] },
    { ...definition(), steps: [null] },
    {
      ...definition(),
      steps: [{ ...manual("bad", ["stocking"]), check: null }],
    },
  ])
    assert.equal(isFullyValidManualOnly(def), false);
});

async function ordinaryFixture() {
  const f = await fixture();
  await f.base.update({businessSize: 'large'});
  await f.base.collection('cycles').doc('assigned-cycle').set({assignedTechnicianId: f.tech});
  for(const id of ['a','b']) {
    await f.base.collection('ponds').doc(`${id}-current`).update({cycleId:'assigned-cycle',blockId:''});
    await f.base.collection('physicalPonds').doc(id).update({blockId:''});
  }
  await f.base.collection('physicalPonds').doc('other').set({pondName:'OTHER',activePondId:'other-current'});
  await f.base.collection('ponds').doc('other-current').set({physicalPondId:'other',cycleId:'unassigned-cycle',cycleStatus:'active'});
  return f;
}
test('ordinary two-pond cycle sends SOP tasks to its technician and scopes the workspace',async()=>{
  const f=await ordinaryFixture();
  const preview=await f.command('previewAdoption',f.settings);
  assert.deepEqual(preview.targets.map(t=>t.assigneeId),[f.tech,f.tech]);
  const activated=await f.command('activate',{...f.settings,expectedVersionId:preview.versionId});
  const runtime=createSopRuntime(db);
  await runtime.tickAdoption(f.companyId,activated.adoptionId,f.now);
  const workspace=await createSopService(db).snapshot(f.tech,f.companyId);
  assert.deepEqual(workspace.ponds.map(p=>p.id).sort(),['a-current','b-current']);
  assert.deepEqual(workspace.physicalPonds.map(p=>p.id).sort(),['a','b']);
  assert.equal(workspace.tasks.length,4);
  for(const task of workspace.tasks) {assert.equal(task.assigneeId,f.tech);assert.deepEqual(task.visibleTo.sort(),[f.owner,f.tech].sort());}
  assert.equal(workspace.adoptions[0].targets.length,2);
  assert.ok(workspace.adoptions[0].targets.every(target => target.assigneeId === f.tech));
  await assert.rejects(f.command('manualTask',{scope:'pond',targetId:'other',title:'Outside',instructions:'',dueAt:f.now+60000},f.tech),{code:'permission-denied'});
  await f.command('manualTask',{scope:'pond',targetId:'a',title:'Own pond',instructions:'',dueAt:f.now+60000},f.tech);
  const ownerWorkspace=await createSopService(db).snapshot(f.owner,f.companyId);
  assert.equal(ownerWorkspace.ponds.length,3);
});
test('ordinary assignment reconciliation repairs existing owner tasks without duplicates and revocation blocks stale access',async()=>{
  const f=await ordinaryFixture();
  await f.base.collection('cycles').doc('assigned-cycle').update({assignedTechnicianId:null});
  const preview=await f.command('previewAdoption',f.settings);
  const activated=await f.command('activate',{...f.settings,expectedVersionId:preview.versionId});
  const runtime=createSopRuntime(db);
  await runtime.tickAdoption(f.companyId,activated.adoptionId,f.now);
  assert.equal((await createSopService(db).snapshot(f.tech,f.companyId)).tasks.length,0);
  const before=await f.base.collection('tasks').get();
  await f.base.collection('cycles').doc('assigned-cycle').update({assignedTechnicianId:f.tech});
  await runtime.tickAdoption(f.companyId,activated.adoptionId,f.now+1000);
  const after=await f.base.collection('tasks').get();
  assert.deepEqual(after.docs.map(d=>d.id),before.docs.map(d=>d.id));
  const workspace=await createSopService(db).snapshot(f.tech,f.companyId);
  assert.equal(workspace.tasks.length,4);
  assert.equal(workspace.adoptions[0].targets.length,2);
  assert.ok(workspace.adoptions[0].targets.every(target => target.assigneeId === f.tech));
  const task=workspace.tasks[0];
  await f.base.collection('cycles').doc('assigned-cycle').update({assignedTechnicianId:null});
  const revoked=await createSopService(db).snapshot(f.tech,f.companyId);
  assert.equal(revoked.ponds.length,0);assert.equal(revoked.tasks.length,0);assert.equal(revoked.physicalPonds.length,0);
  await assert.rejects(f.command('submitEvidence',{taskId:task.id,expectedRevision:task.revision,notes:'Attempt after revocation',attachments:[],observedAt:new Date(f.now).toISOString()},f.tech),{code:'permission-denied'});
  const history=await require('./history').sopHistory(db,f.tech,f.companyId,'tasks');
  assert.equal(history.items.length,0);
});
