const assert = require("node:assert/strict");
const { test, before, beforeEach, after } = require("node:test");
const admin = require("firebase-admin");
const { createOperationService } = require("./shared/orsonOperations");
const { createOrsonAppDataReader } = require("./shared/orsonAppData");
const { authorizeAgent } = require("./shared/orsonActionAuth");
const { createAgentCatalog } = require("./shared/orsonEntityResolver");
let app, db, service;
const companyId = "farm",
  uid = "owner",
  date = "2026-09-21";
const pond = (name = "A1", blockId = "a") => ({
  pondName: name,
  blockId,
  pondArea: 1000,
  initialPopulation: 100000,
  initialWeight: 0.5,
  density: 100,
  docStart: "2026-08-01",
  cycleStartedAt: "2026-08-01",
  cycleStatus: "active",
  cycleId: "cycle-a",
  samplings: [],
  mortalityRecords: [],
  totalHarvestedPopulation: 0,
  totalHarvestedBiomass: 0,
});
const command = (type, values, extra = {}) => ({
  id: "row-1",
  type,
  date,
  pondId: "p1",
  values,
  ...extra,
});
const prepare = (commands) => service.prepare({ uid, companyId, commands });
const confirm = (op) =>
  service.confirm({
    uid,
    companyId,
    operationId: op.id,
    revision: op.revision,
    selectedRowIds: op.rows.filter((r) => r.valid).map((r) => r.command.id),
  });
const get = async (path) =>
  (await db.doc(`companies/${companyId}/${path}`).get()).data();
before(() => {
  assert.ok(
    process.env.FIRESTORE_EMULATOR_HOST,
    "Run against the Firestore emulator only",
  );
  app = admin.initializeApp(
    { projectId: "demo-shrimply-agent" },
    "orson-agent-test",
  );
  db = require("firebase-admin/firestore").getFirestore(app);
  service = createOperationService(db);
});
after(async () => app && require("firebase-admin/app").deleteApp(app));
beforeEach(async () => {
  await db.recursiveDelete(db.doc(`companies/${companyId}`));
  await db.doc(`companies/${companyId}`).set({
    ownerId: uid,
    teamMembers: [uid, "tech", "manager"],
    timeZone: "Asia/Jakarta",
    businessSize: "enterprise",
  });
  await db.doc("users/owner").set({ companyId, role: "owner" });
  await db.doc("users/tech").set({ companyId, role: "technician" });
  await db.doc("users/manager").set({ companyId, role: "manager" });
  await db
    .doc(`companies/${companyId}/blocks/a`)
    .set({ assignedTechnicianId: "tech" });
  await db
    .doc(`companies/${companyId}/ponds/p1`)
    .set({ ...pond(), physicalPondId: "physical-a" });
  await db.doc(`companies/${companyId}/ponds/p2`).set(pond("B1", "b"));
  await db.doc(`companies/${companyId}/physicalPonds/physical-a`).set({
    pondName: "A1",
    pondArea: 1000,
    blockId: "a",
    status: "active",
    activePondId: "p1",
  });
  await db.doc(`companies/${companyId}/feeds/feed-a`).set({
    feedName: "Feed A",
    unit: "kg",
    totalStock: 100,
    totalCost: 200,
    stockInHistory: [],
    usageHistory: [],
  });
});
test("draft never writes operational data; confirmation saves numeric sampling without inventory deduction", async () => {
  const op = await prepare([command("record_sampling", { mbw: 12, feed: 25 })]);
  assert.equal(op.rows[0].valid, true);
  assert.deepEqual((await get("ponds/p1")).samplings, []);
  const receipt = await confirm(op);
  assert.equal(receipt.state, "completed");
  const saved = (await get("ponds/p1")).samplings[0];
  assert.equal(saved.mbw, 12);
  assert.equal(saved.feed, 25);
  assert.equal((await get("feeds/feed-a")).totalStock, 100);
});
test("pond detail corrections update the current pond and physical pond only after confirmation", async () => {
  const op = await prepare([
    command("update_pond_details", {
      pondName: "North A1",
      pondArea: 1200,
      density: 110,
      supplier: "Hatchery B",
    }),
  ]);
  assert.equal(op.rows[0].valid, true);
  assert.equal(op.rows[0].before.pondArea, 1000);
  assert.equal((await get("ponds/p1")).pondName, "A1");
  assert.equal((await get("physicalPonds/physical-a")).pondArea, 1000);
  await confirm(op);
  const changed = await get("ponds/p1");
  assert.equal(changed.pondName, "North A1");
  assert.equal(changed.pondArea, 1200);
  assert.equal(changed.density, 110);
  assert.equal(changed.initialPopulation, 132000);
  assert.equal(changed.supplier, "Hatchery B");
  assert.equal(changed.plSupplier, "Hatchery B");
  assert.equal((await get("physicalPonds/physical-a")).pondName, "North A1");
  assert.equal((await get("physicalPonds/physical-a")).pondArea, 1200);
});
test("pond baseline correction rejects population below recorded losses", async () => {
  await db.doc(`companies/${companyId}/ponds/p1`).update({ totalHarvestedPopulation: 5000 });
  const op = await prepare([command("update_pond_details", { pondArea: 1 })]);
  assert.equal(op.rows[0].valid, false);
  assert.match(op.rows[0].error, /population/i);
  assert.equal((await get("ponds/p1")).pondArea, 1000);
});
test("feeding confirmation retries and concurrent duplicate taps deduct once", async () => {
  const op = await prepare([
    command(
      "record_feeding",
      {},
      { allocations: [{ inventoryFeedId: "feed-a", quantityKg: 30 }] },
    ),
  ]);
  await Promise.all([confirm(op), confirm(op)]);
  assert.equal((await get("feeds/feed-a")).totalStock, 70);
  assert.equal((await get("feeds/feed-a")).usageHistory.length, 1);
  assert.equal(
    (await get("ponds/p1")).samplings[0].feedData.totalDailyFeed,
    "30.00",
  );
  await confirm(op);
  assert.equal((await get("feeds/feed-a")).totalStock, 70);
});
test("feeding correction returns quantity and original cost", async () => {
  await confirm(
    await prepare([
      command(
        "record_feeding",
        {},
        { allocations: [{ inventoryFeedId: "feed-a", quantityKg: 30 }] },
      ),
    ]),
  );
  await confirm(
    await prepare([
      command(
        "record_feeding",
        {},
        { allocations: [{ inventoryFeedId: "feed-a", quantityKg: 20 }] },
      ),
    ]),
  );
  assert.equal((await get("feeds/feed-a")).totalStock, 80);
  assert.equal((await get("feeds/feed-a")).totalCost, 160);
});
test("unrelated observation survives confirmation; changing reviewed reading requires review", async () => {
  const op = await prepare([command("upsert_water_quality", { doMorning: 5 })]);
  await db.doc(`companies/${companyId}/ponds/p1`).update({
    samplings: [
      { id: "other", date: "2026-09-20", mbw: 10, feed: 0, mortality: 0 },
    ],
  });
  await confirm(op);
  assert.equal((await get("ponds/p1")).samplings.length, 2);
  const edit = await prepare([
    command("upsert_water_quality", { doMorning: 6 }),
  ]);
  const p = await get("ponds/p1");
  p.samplings.find((r) => r.date === date).doMorning = "7";
  await db
    .doc(`companies/${companyId}/ponds/p1`)
    .update({ samplings: p.samplings });
  await assert.rejects(confirm(edit), /changed/i);
  assert.equal(
    (await get("ponds/p1")).samplings.find((r) => r.date === date).doMorning,
    "7",
  );
});
test("invalid pH cannot be confirmed; valid unusual oxygen carries warning", async () => {
  const op = await prepare([
    command("upsert_water_quality", { phMorning: 16 }),
  ]);
  assert.equal(op.rows[0].valid, false);
  await assert.rejects(
    service.confirm({
      uid,
      companyId,
      operationId: op.id,
      revision: op.revision,
      selectedRowIds: ["row-1"],
    }),
  );
  const warning = await prepare([
    command("upsert_water_quality", { doMorning: 3.2 }),
  ]);
  assert.ok(warning.rows[0].warnings.length);
  assert.equal((await confirm(warning)).state, "completed");
});
test("effective permissions, block scoping, ownership and revocation are enforced", async () => {
  await assert.rejects(
    service.prepare({
      uid: "tech",
      companyId,
      commands: [
        command("record_sampling", { mbw: 12, feed: 20 }, { pondId: "p2" }),
      ],
    }),
    /scope/i,
  );
  await assert.rejects(
    service.prepare({
      uid: "manager",
      companyId,
      commands: [command("record_sampling", { mbw: 12, feed: 20 })],
    }),
    /permission/i,
  );
  const op = await service.prepare({
    uid: "tech",
    companyId,
    commands: [command("record_sampling", { mbw: 12, feed: 20 })],
  });
  await assert.rejects(
    service.get({ uid: "owner", companyId, operationId: op.id }),
    /unavailable/i,
  );
  await db
    .doc("users/tech")
    .update({ permissionOverrides: { recordPondData: false } });
  await assert.rejects(
    service.confirm({
      uid: "tech",
      companyId,
      operationId: op.id,
      revision: op.revision,
      selectedRowIds: ["row-1"],
    }),
    /permission/i,
  );
});
test("partial save reports per-group outcomes and retry cannot duplicate success", async () => {
  const op = await prepare([
    command(
      "record_feeding",
      {},
      { allocations: [{ inventoryFeedId: "feed-a", quantityKg: 60 }] },
    ),
    command(
      "record_feeding",
      {},
      {
        id: "row-2",
        pondId: "p2",
        allocations: [{ inventoryFeedId: "feed-a", quantityKg: 60 }],
      },
    ),
  ]);
  const result = await confirm(op);
  assert.equal(result.state, "partial");
  assert.equal(result.receipts.filter((r) => r.status === "saved").length, 1);
  assert.equal((await get("feeds/feed-a")).totalStock, 40);
  await confirm(op);
  assert.equal((await get("feeds/feed-a")).totalStock, 40);
});
test("changing draft revision, discarding and expiry prevent stale confirmation", async () => {
  const op = await prepare([command("record_sampling", { mbw: 12, feed: 20 })]);
  const updated = await service.prepare({
    uid,
    companyId,
    operationId: op.id,
    revision: op.revision,
    commands: [command("record_sampling", { mbw: 13, feed: 20 })],
  });
  await assert.rejects(confirm(op), /changed/i);
  await service.prepare({
    uid,
    companyId,
    operationId: updated.id,
    revision: updated.revision,
    discard: true,
  });
  await assert.rejects(confirm(updated));
  const expired = await prepare([
    command("record_sampling", { mbw: 12, feed: 20 }),
  ]);
  await db
    .doc(`companies/${companyId}/orsonOperations/${expired.id}`)
    .update({ expiresAt: 0 });
  await assert.rejects(confirm(expired), /expired/i);
});
test("stock-in records stock, cost, purchase history and linked expense atomically", async () => {
  const op = await prepare([
    command(
      "stock_in_inventory",
      { quantity: 10, price: 3, unit: "kg" },
      { pondId: undefined, itemId: "feed-a", itemType: "feed" },
    ),
  ]);
  assert.equal(op.rows[0].valid, true);
  await confirm(op);
  const stock = await get("feeds/feed-a");
  assert.equal(stock.totalStock, 110);
  assert.equal(stock.totalCost, 230);
  assert.equal(stock.stockInHistory.length, 1);
  const expenses = await db.collection(`companies/${companyId}/expenses`).get();
  assert.equal(expenses.size, 1);
  assert.equal(expenses.docs[0].data().amount, 30);
  assert.equal(expenses.docs[0].data().paymentType, "Unconfirmed");
});
test("authorized purchase lookup supports a confirmed price correction without adding stock", async () => {
  await confirm(await prepare([command("stock_in_inventory", { quantity: 10, price: 3, unit: "kg" },
    { pondId: undefined, itemId: "feed-a", itemType: "feed" })]));
  const catalog = await createAgentCatalog(await authorizeAgent(db, uid, companyId));
  const purchase = catalog.feeds.find((item) => item.id === "feed-a").recentPurchases[0];
  assert.equal(purchase.quantity, 10);
  assert.equal(purchase.price, 3);
  assert.equal(purchase.date, date);
  const correction = await prepare([command("stock_in_inventory", { quantity: purchase.quantity, price: 5, unit: "kg" },
    { pondId: undefined, itemId: "feed-a", itemType: "feed", recordId: purchase.id })]);
  assert.equal(correction.rows[0].valid, true);
  await confirm(correction);
  const stock = await get("feeds/feed-a");
  assert.equal(stock.totalStock, 110);
  assert.equal(stock.totalCost, 250);
  assert.equal(stock.stockInHistory.length, 1);
  assert.equal(stock.stockInHistory[0].price, 5);
  const expenses = await db.collection(`companies/${companyId}/expenses`).get();
  assert.equal(expenses.size, 1);
  assert.equal(expenses.docs[0].data().amount, 50);
});
test("inventory writes stay inside the authenticated company even when item IDs match", async () => {
  const other = "other-farm";
  await db.recursiveDelete(db.doc(`companies/${other}`));
  await db.doc(`companies/${other}`).set({ ownerId: "other-owner", teamMembers: ["other-owner"] });
  await db.doc(`companies/${other}/feeds/feed-a`).set({
    feedName: "Other Farm Feed", unit: "kg", totalStock: 7, totalCost: 21,
    stockInHistory: [], usageHistory: [],
  });
  await assert.rejects(
    service.prepare({
      uid,
      companyId: other,
      commands: [command("stock_in_inventory", { quantity: 10, price: 3, unit: "kg" },
        { pondId: undefined, itemId: "feed-a", itemType: "feed" })],
    }),
    /company access/i,
  );
  const op = await prepare([
    command("stock_in_inventory", { quantity: 10, price: 3, unit: "kg" },
      { pondId: undefined, itemId: "feed-a", itemType: "feed" }),
  ]);
  await confirm(op);
  assert.equal((await get("feeds/feed-a")).totalStock, 110);
  const otherFeed = (await db.doc(`companies/${other}/feeds/feed-a`).get()).data();
  assert.equal(otherFeed.totalStock, 7);
  assert.deepEqual(otherFeed.stockInHistory, []);
});
test("treatment source usage is visible on the pond and deducts only its inventory", async () => {
  const op = await prepare([
    command(
      "apply_pond_treatment",
      { quantity: 4, unit: "kg", notes: "Observed application" },
      { itemType: "feed", itemId: "feed-a" },
    ),
  ]);
  await confirm(op);
  const stock = await get("feeds/feed-a");
  assert.equal(stock.totalStock, 96);
  assert.equal(stock.usageHistory[0].pondId, "p1");
  assert.equal(stock.usageHistory[0].totalCost, 8);
});
test("harvest requires sampling then writes source, pond removal and linked revenue once", async () => {
  let op = await prepare([
    command("record_harvest", {
      biomass: 10,
      size: 100,
      price: 5,
      harvestType: "final",
    }),
  ]);
  assert.equal(op.rows[0].valid, false);
  await confirm(
    await prepare([command("record_sampling", { mbw: 10, feed: 0 })]),
  );
  op = await prepare([
    command("record_harvest", {
      biomass: 10,
      size: 100,
      price: 5,
      harvestType: "final",
    }),
  ]);
  assert.equal(op.rows[0].valid, true);
  await confirm(op);
  await confirm(op);
  assert.equal((await get("ponds/p1")).totalHarvestedPopulation, 1000);
  const revenue = await db.collection(`companies/${companyId}/revenues`).get();
  assert.equal(revenue.size, 1);
  assert.equal(revenue.docs[0].data().amount, 50);
});
test("cycle lifecycle rejects missing final harvest and links a new active run after other closure", async () => {
  let op = await prepare([
    command("end_cycle", { cycleEndReason: "harvested" }),
  ]);
  assert.equal(op.rows[0].valid, false);
  op = await prepare([command("end_cycle", { cycleEndReason: "reset" })]);
  assert.equal((await confirm(op)).state, "completed");
  assert.equal((await get("physicalPonds/physical-a")).activePondId, null);
  op = await prepare([
    command("start_cycle", {
      density: 80,
      initialWeight: 0.5,
      supplier: "Supplier",
      cycleName: "Cycle B",
    }),
  ]);
  assert.equal(op.rows[0].valid, true);
  assert.equal((await confirm(op)).state, "completed");
  const physical = await get("physicalPonds/physical-a");
  assert.ok(physical.activePondId);
  const newPond = await get(`ponds/${physical.activePondId}`);
  assert.equal(newPond.initialPopulation, 80000);
  assert.equal((await get("ponds/p1")).cycleStatus, "ended");
});
test("standalone finance follows effective permission and rejects linked sources", async () => {
  const op = await service.prepare({
    uid: "manager",
    companyId,
    commands: [
      command(
        "record_expense",
        {
          item: "Fuel",
          category: "Operational",
          amount: 25,
          paymentType: "Cash",
        },
        { pondId: undefined },
      ),
    ],
  });
  assert.equal(
    (
      await service.confirm({
        uid: "manager",
        companyId,
        operationId: op.id,
        revision: op.revision,
        selectedRowIds: ["row-1"],
      })
    ).state,
    "completed",
  );
  const records = await db.collection(`companies/${companyId}/expenses`).get();
  assert.equal(records.docs[0].data().amount, 25);
});
test("read tools do not expose another enterprise block", async () => {
  const company = (await db.doc(`companies/${companyId}`).get()).data();
  const user = (await db.doc("users/tech").get()).data();
  const reader = createOrsonAppDataReader({
    db,
    company,
    user,
    uid: "tech",
    companyId,
  });
  const result = await reader.execute("read_app_records", { dataset: "ponds" });
  assert.deepEqual(
    result.records.map((r) => r.id),
    ["p1"],
  );
  await assert.rejects(
    reader.execute("read_pond_timeline", { pondId: "p2" }),
    /permitted/i,
  );
});

test("a new inventory item and its invoice become one confirmed atomic operation", async () => {
  const op = await prepare([
    command(
      "stock_in_inventory",
      {
        itemName: "New Feed",
        category: "Grower",
        unit: "kg",
        quantity: 50,
        price: 4,
      },
      { pondId: undefined, itemType: "feed" },
    ),
  ]);
  assert.equal(op.rows[0].valid, true);
  assert.match(op.rows[0].effects[0], /Create inventory item/);
  await confirm(op);
  const items = await db
    .collection(`companies/${companyId}/feeds`)
    .where("feedName", "==", "New Feed")
    .get();
  assert.equal(items.size, 1);
  assert.equal(items.docs[0].data().totalStock, 50);
  const expenses = await db.collection(`companies/${companyId}/expenses`).get();
  assert.equal(expenses.docs[0].data().amount, 200);
});
test("starting an idle physical pond does not require a previous pond cycle", async () => {
  await db
    .doc(`companies/${companyId}/physicalPonds/new-physical`)
    .set({ pondName: "C1", pondArea: 500, status: "idle", blockId: "a" });
  const op = await prepare([
    command(
      "start_cycle",
      {
        density: 80,
        initialWeight: 0.5,
        supplier: "Supplier",
        cycleName: "First cycle",
      },
      { pondId: "new-physical" },
    ),
  ]);
  assert.equal(op.rows[0].valid, true);
  assert.equal((await confirm(op)).state, "completed");
  assert.ok((await get("physicalPonds/new-physical")).activePondId);
});
test("multiple observations for one pond/day preserve each others fields", async () => {
  const op = await prepare([
    command("upsert_water_quality", { phMorning: 7.8 }),
    command("upsert_water_quality", { doMorning: 5.4 }, { id: "row-2" }),
  ]);
  assert.equal((await confirm(op)).state, "completed");
  const saved = (await get("ponds/p1")).samplings;
  assert.equal(saved.length, 1);
  assert.equal(saved[0].phMorning, "7.8");
  assert.equal(saved[0].doMorning, "5.4");
});

test("saving a selected subset preserves omitted rows for a later reviewed save", async () => {
  const op = await prepare([
    command("record_sampling", { mbw: 12, feed: 25 }),
    command(
      "record_sampling",
      { mbw: 11, feed: 20 },
      { id: "row-2", pondId: "p2" },
    ),
  ]);
  const partial = await service.confirm({
    uid,
    companyId,
    operationId: op.id,
    revision: op.revision,
    selectedRowIds: ["row-1"],
  });
  assert.equal(partial.state, "partial");
  assert.equal((await get("ponds/p2")).samplings.length, 0);
  const revised = await service.prepare({
    uid,
    companyId,
    operationId: op.id,
    revision: partial.revision,
    commands: [op.rows[1].command],
  });
  const done = await confirm(revised);
  assert.equal(done.state, "completed");
  assert.equal(done.receipts.filter((r) => r.status === "saved").length, 2);
  assert.equal((await get("ponds/p1")).samplings.length, 1);
  assert.equal((await get("ponds/p2")).samplings.length, 1);
});
test("two ponds can use the same feed and a correction can return the full allocation", async () => {
  const op = await prepare(
    ["p1", "p2"].map((pondId, i) =>
      command(
        "record_feeding",
        {},
        {
          id: `row-${i}`,
          pondId,
          allocations: [{ inventoryFeedId: "feed-a", quantityKg: 10 }],
        },
      ),
    ),
  );
  assert.equal((await confirm(op)).state, "completed");
  assert.equal((await get("feeds/feed-a")).totalStock, 80);
  const returned = await prepare([
    command(
      "record_feeding",
      {},
      { allocations: [{ inventoryFeedId: "feed-a", quantityKg: 0 }] },
    ),
  ]);
  assert.equal((await confirm(returned)).state, "completed");
  assert.equal((await get("feeds/feed-a")).totalStock, 90);
});
test("retrying an identical model tool preparation returns the same durable draft", async () => {
  const { authorizeAgent } = require("./shared/orsonActionAuth");
  const { createAgentTools } = require("./orsonAgentTools");
  let emitted = 0;
  const tools = createAgentTools({
    db,
    auth: await authorizeAgent(db, uid, companyId),
    onActivity: async () => {},
    onOperation: async () => {
      emitted++;
    },
  });
  const args = {
    commands: [command("record_sampling", { mbw: 12, feed: 25 })],
  };
  const [a, b] = await Promise.all([
    tools.execute("prepare_farm_actions", args),
    tools.execute("prepare_farm_actions", args),
  ]);
  assert.equal(a.operationId, b.operationId);
  assert.equal(emitted, 1);
  assert.equal((await get("ponds/p1")).samplings.length, 0);
});

test("ambiguous uploaded pond names stay editable while an explicit valid subset can save", async () => {
  const { resolveCommands } = require("./shared/orsonEntityResolver");
  const rows = resolveCommands(
    [
      command(
        "upsert_water_quality",
        { phMorning: 7.9 },
        { pondId: "Unclear pond" },
      ),
      command(
        "upsert_water_quality",
        { doMorning: 5 },
        { id: "row-2", pondId: "A1" },
      ),
    ],
    { ponds: [{ id: "p1", name: "A1" }], feeds: [], additives: [] },
  );
  const op = await prepare(rows);
  assert.equal(op.rows[0].valid, false);
  assert.equal(op.rows[0].command.values.phMorning, 7.9);
  assert.equal(op.rows[1].valid, true);
  const partial = await confirm(op);
  assert.equal(partial.state, "partial");
  assert.equal((await get("ponds/p1")).samplings[0].doMorning, "5");
});
