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
test("period feed/cost decision tool reads Firestore evidence with finance and enterprise scope", async () => {
  await db.doc(`companies/${companyId}/ponds/p1`).update({
    samplings: [{
      id: "feed-day",
      date,
      pondCycleId: "cycle-a",
      feedData: { totalDailyFeed: 12 },
    }],
  });
  await db.doc(`companies/${companyId}/feeds/feed-a`).update({
    usageHistory: [{
      id: "feed-use",
      date,
      pondId: "p1",
      pondCycleId: "cycle-a",
      quantity: 5,
      totalCost: 10,
      currency: "AUD",
    }],
  });
  await db.doc(`companies/${companyId}/expenses/energy-row`).set({
    date,
    amount: 20,
    category: "energy",
    pondId: "p1",
    pondCycleId: "cycle-a",
    currency: "AUD",
  });

  const companySnap = await db.doc(`companies/${companyId}`).get();
  const company = { id: companyId, ...companySnap.data() };
  const ownerReader = createOrsonAppDataReader({
    db,
    company,
    user: { companyId, role: "owner" },
    uid,
    companyId,
  });
  const ownerResult = await ownerReader.execute("summarize_period_feed_and_cost", {
    startDate: date,
    endDate: date,
  });

  assert.equal(ownerResult.scope.boundary, "company");
  assert.equal(ownerResult.ponds.length, 2);
  const ownerPond = ownerResult.ponds.find((row) => row.pondId === "p1");
  assert.equal(ownerPond.feed.totalFeedKg, 12);
  assert.equal(ownerPond.finance.consumedFeedCost, 10);
  assert.equal(ownerPond.finance.recordedOperatingExpenseSubtotal, 20);
  assert.equal(ownerPond.finance.operatingExpenseEntryCount, 1);
  assert.equal(ownerResult.retrieval.recordsRead.ponds, 2);
  assert.equal(ownerResult.retrieval.recordsRead.feedItems, 1);
  assert.equal(ownerResult.retrieval.recordsRead.expenses, 1);
  assert.equal(ownerResult.writesPerformed, 0);

  const technicianReader = createOrsonAppDataReader({
    db,
    company,
    user: { companyId, role: "technician" },
    uid: "tech",
    companyId,
  });
  const technicianResult = await technicianReader.execute("summarize_period_feed_and_cost", {
    startDate: date,
    endDate: date,
  });
  assert.equal(technicianResult.scope.boundary, "assigned_ponds");
  assert.deepEqual(technicianResult.ponds.map((row) => row.pondId), ["p1"]);
  assert.equal(Object.hasOwn(technicianResult, "finance"), false);
  assert.equal(Object.hasOwn(technicianResult.ponds[0], "finance"), false);
  await assert.rejects(
    technicianReader.execute("summarize_period_feed_and_cost", {
      pondId: "p2",
      startDate: date,
      endDate: date,
    }),
    /Not permitted/,
  );
  assert.equal((await get("ponds/p1")).samplings.length, 1, "the query performs no Firestore writes");
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

test('Orson prepares the Indonesian pH request and saves both sessions only on confirmation', async () => {
  const { createAgentTools } = require('./orsonAgentTools');
  await db.doc(`companies/${companyId}/ponds/p1`).update({ pondName: 'SIM-A1' });
  let operation;
  const tools = createAgentTools({ db, service, auth: await authorizeAgent(db, uid, companyId),
    userMessage: 'Bisa tolong bantu input pH Kolam sim a1 untuk hari ini pagi 7.8 dan sore 7.9',
    onActivity: async () => {}, onOperation: async op => { operation = op; } });
  const result = await tools.execute('prepare_farm_actions', { commands: [command('upsert_water_quality', { phMorning: 7.8, phEvening: 7.9 }, { pondId: 'SIM-A1' })] });
  assert.equal(result.status, 'awaiting_user_confirmation');
  assert.equal((await get('ponds/p1')).samplings.length, 0);
  await confirm(operation);
  const reading = (await get('ponds/p1')).samplings[0];
  assert.equal(reading.phMorning, '7.8'); assert.equal(reading.phEvening, '7.9');
});

test('water-quality selects the measured daily record among same-day feed and sampling rows', async () => {
  const readings = [
    { id: 'feeding', date, mbw: 0, feed: 0, mortality: 0, feedData: { totalDailyFeed: '25.00' } },
    { id: 'sampling', date, mbw: 10, feed: 25, mortality: 0, operationalNotes: 'Synthetic QA sampling' },
    { id: 'water', date, mbw: 0, feed: 0, mortality: 0, phMorning: '7.85', phEvening: '7.80', doMorning: '4.9' },
  ];
  await db.doc(`companies/${companyId}/ponds/p1`).update({ samplings: readings });
  const op = await prepare([command('upsert_water_quality', { phMorning: 7.8, phEvening: 7.9 })]);
  assert.equal(op.rows[0].valid, true, op.rows[0].error);
  assert.deepEqual(op.rows[0].before, { phMorning: '7.85', phEvening: '7.80' });
  await confirm(op);
  const saved = (await get('ponds/p1')).samplings;
  assert.equal(saved.length, 3);
  assert.deepEqual(saved[0], readings[0]); assert.deepEqual(saved[1], readings[1]);
  assert.equal(saved[2].id, 'water'); assert.equal(saved[2].phMorning, '7.8'); assert.equal(saved[2].phEvening, '7.9');
  assert.equal(saved[2].doMorning, '4.9'); assert.equal((await get('feeds/feed-a')).totalStock, 100);
});

test('water-quality ambiguity still rejects two measured records for the same day', async () => {
  await db.doc(`companies/${companyId}/ponds/p1`).update({ samplings: [
    { id: 'water-1', date, phMorning: '7.8' }, { id: 'water-2', date, phMorning: '7.9' },
  ] });
  const op = await prepare([command('upsert_water_quality', { phEvening: 7.9 })]);
  assert.equal(op.rows[0].valid, false); assert.match(op.rows[0].error, /Several records/);
});

for (const [reportType, values, section, key, expected] of [
  ['plankton', { totalCellPerMl: 120000, cyanophytaPercent: 0, chlorophytaSpecies: 'Chlorella', planktonUnit: 'cells/mL' }, 'plankton', 'totalCellPerMl', 120000],
  ['water_quality', { hardnessCa: 200, hardnessCaUnit: 'mg/L', hardnessCaBasis: 'Ca', phosphate: 0, phosphateUnit: 'mg/L', phosphateBasis: 'PO4' }, 'waterQuality', 'hardnessCa', 200],
]) {
  test(`Orson ${reportType} lab draft confirms into Lab Reports once without changing daily readings`, async () => {
    const { createAgentTools } = require('./orsonAgentTools');
    let op;
    const tools = createAgentTools({ db, service, auth: await authorizeAgent(db, uid, companyId),
      userMessage: `Please save the ${reportType} lab report for pond A1`, onActivity: async () => {}, onOperation: async value => { op = value; } });
    const result = await tools.execute('prepare_farm_actions', { commands: [command('record_lab_report', { reportType, labName: 'Test Lab', ...values }, { pondId: 'A1' })] });
    assert.equal(result.status, 'awaiting_user_confirmation'); assert.equal(op.rows[0].valid, true, op.rows[0].error);
    assert.equal((await db.collection(`companies/${companyId}/labReports`).get()).size, 0);
    await Promise.all([confirm(op), confirm(op)]);
    const reports = await db.collection(`companies/${companyId}/labReports`).get();
    assert.equal(reports.size, 1);
    const report = reports.docs[0].data();
    assert.equal(report.status, 'confirmed'); assert.equal(report.reportType, reportType);
    assert.equal(report.sampleDate, date); assert.equal(report.confirmedBy, uid);
    assert.equal(report.pondResults[0].pondId, 'p1'); assert.equal(report.pondResults[0][section][key], expected);
    if (reportType === 'plankton') assert.equal(report.pondResults[0].plankton.cyanophytaPercent, 0);
    else {
      assert.equal(report.pondResults[0].waterQuality.phosphate, 0);
      assert.deepEqual(report.pondResults[0].measurementUnits.hardnessCa, { unit: 'mg/L', basis: 'Ca' });
    }
    assert.equal((await get('ponds/p1')).samplings.length, 0);
    assert.equal((await get('feeds/feed-a')).totalStock, 100);
  });
}

test('lab entries reject missing units and out-of-scope ponds before saving', async () => {
  const invalid = await prepare([command('record_lab_report', { reportType: 'water_quality', hardnessCa: 200 })]);
  assert.equal(invalid.rows[0].valid, false);
  assert.match(invalid.rows[0].error, /unit.*basis/);
  await assert.rejects(service.prepare({ uid: 'tech', companyId, commands: [command('record_lab_report', { reportType: 'plankton', cyanophytaPercent: 10 }, { pondId: 'p2' })] }), /outside your assigned scope/);
  assert.equal((await db.collection(`companies/${companyId}/labReports`).get()).size, 0);
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
test("legacy saved commands do not block access to a current valid draft", async () => {
  const op = await prepare([
    command("record_sampling", { mbw: 12, feed: 20 }),
  ]);
  await db
    .doc(`companies/${companyId}/orsonOperations/${op.id}`)
    .update({ savedCommands: [{ id: "legacy-row", type: "removed_legacy_action" }] });

  assert.equal(
    (await service.get({ uid, companyId, operationId: op.id })).id,
    op.id,
  );
  const confirmed = await confirm(op);
  assert.equal(confirmed.state, "completed");
  assert.equal((await get("ponds/p1")).samplings.length, 1);
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

test("voiding an unused inventory purchase updates stock, cost, marks source row and expense as voided, and archives zero-stock item", async () => {
  await confirm(await prepare([
    command("stock_in_inventory", { quantity: 10, price: 3, unit: "kg" },
      { pondId: undefined, itemId: "feed-a", itemType: "feed" })
  ]));
  let stock = await get("feeds/feed-a");
  assert.equal(stock.totalStock, 110);
  assert.equal(stock.totalCost, 230);
  assert.equal(stock.stockInHistory.length, 1);
  const purchaseId = stock.stockInHistory[0].id;

  const op = await prepare([
    command("void_inventory_purchase", {},
      { pondId: undefined, itemId: "feed-a", itemType: "feed", recordId: purchaseId })
  ]);
  assert.equal(op.rows[0].valid, true);
  assert.ok(op.rows[0].effects.some((e) => e.includes("Audited effect: Void purchase of 10 kg (30.00); remaining stock becomes 100 kg.")));
  assert.ok(op.rows[0].effects.some((e) => e.includes("Audited effect: Void linked unconfirmed expense")));
  const done = await confirm(op);
  assert.equal(done.state, "completed");

  stock = await get("feeds/feed-a");
  assert.equal(stock.totalStock, 100);
  assert.equal(stock.totalCost, 200);
  assert.equal(stock.archived, false);
  assert.equal(stock.stockInHistory[0].voided, true);
  assert.equal(stock.stockInHistory[0].voidedBy, uid);
  assert.ok(stock.stockInHistory[0].voidedAt);

  const expenses = await db.collection(`companies/${companyId}/expenses`).get();
  assert.equal(expenses.size, 1);
  const expenseData = expenses.docs[0].data();
  assert.equal(expenseData.voided, true);
  assert.equal(expenseData.voidedBy, uid);
  assert.ok(expenseData.voidedAt);

  const financeEntry = Object.values(stock.financeEntries || {})[0];
  assert.ok(financeEntry);
  assert.equal(financeEntry.voided, true);
  assert.equal(financeEntry.voidedBy, uid);

  // Test archiving when remaining stock reaches zero
  await db.doc(`companies/${companyId}/feeds/feed-empty`).set({
    feedName: "Feed Empty",
    unit: "kg",
    totalStock: 0,
    totalCost: 0,
    stockInHistory: [],
    usageHistory: [],
  });
  await confirm(await prepare([
    command("stock_in_inventory", { quantity: 5, price: 10, unit: "kg" },
      { pondId: undefined, itemId: "feed-empty", itemType: "feed" })
  ]));
  const emptyStockBefore = await get("feeds/feed-empty");
  const emptyPurchaseId = emptyStockBefore.stockInHistory[0].id;
  const voidEmptyOp = await prepare([
    command("void_inventory_purchase", {},
      { pondId: undefined, itemId: "feed-empty", itemType: "feed", recordId: emptyPurchaseId })
  ]);
  assert.ok(voidEmptyOp.rows[0].effects.some((e) => e.includes("Audited effect: Archive inventory item as remaining stock is zero.")));
  await confirm(voidEmptyOp);
  const emptyStockAfter = await get("feeds/feed-empty");
  assert.equal(emptyStockAfter.totalStock, 0);
  assert.equal(emptyStockAfter.totalCost, 0);
  assert.equal(emptyStockAfter.archived, true);
});

test("voiding cannot be repeated and voided purchase cannot be resurrected via stock_in_inventory", async () => {
  await confirm(await prepare([
    command("stock_in_inventory", { quantity: 10, price: 3, unit: "kg" },
      { pondId: undefined, itemId: "feed-a", itemType: "feed" })
  ]));
  const stock = await get("feeds/feed-a");
  const purchaseId = stock.stockInHistory[0].id;
  await confirm(await prepare([
    command("void_inventory_purchase", {},
      { pondId: undefined, itemId: "feed-a", itemType: "feed", recordId: purchaseId })
  ]));

  // Repeated void attempt fails
  const repeatVoid = await prepare([
    command("void_inventory_purchase", {},
      { pondId: undefined, itemId: "feed-a", itemType: "feed", recordId: purchaseId })
  ]);
  assert.equal(repeatVoid.rows[0].valid, false);
  assert.equal(repeatVoid.rows[0].error, "This purchase is already voided.");

  // Resurrect/correction attempt via stock_in_inventory fails
  const resurrect = await prepare([
    command("stock_in_inventory", { quantity: 10, price: 3, unit: "kg" },
      { pondId: undefined, itemId: "feed-a", itemType: "feed", recordId: purchaseId })
  ]);
  assert.equal(resurrect.rows[0].valid, false);
  assert.equal(resurrect.rows[0].error, "A voided purchase cannot be corrected or resurrected.");
});

test("rejects voiding used inventory when removal would make stock negative", async () => {
  await db.doc(`companies/${companyId}/feeds/feed-a`).update({ totalStock: 0, totalCost: 0 });
  await confirm(await prepare([
    command("stock_in_inventory", { quantity: 10, price: 3, unit: "kg" },
      { pondId: undefined, itemId: "feed-a", itemType: "feed" })
  ]));
  const stock = await get("feeds/feed-a");
  const purchaseId = stock.stockInHistory[0].id;

  // Reconcile actual usage against the current stock and cost.
  await db.doc(`companies/${companyId}/feeds/feed-a`).update({
    totalStock: 8,
    totalCost: 24,
    usageHistory: [{ id: "u-1", date, quantity: 2, unitPrice: 3, totalCost: 6 }],
  });

  const op = await prepare([
    command("void_inventory_purchase", {},
      { pondId: undefined, itemId: "feed-a", itemType: "feed", recordId: purchaseId })
  ]);
  assert.equal(op.rows[0].valid, false);
  assert.equal(op.rows[0].error, "Voiding this purchase would make remaining inventory stock or valuation negative.");
});

test("voids a used purchase when reconciled remaining stock and finance stay positive", async () => {
  await db.doc(`companies/${companyId}/feeds/feed-a`).update({ totalStock: 0, totalCost: 0 });
  await confirm(await prepare([
    command("stock_in_inventory", { quantity: 400, price: 3, unit: "kg" },
      { pondId: undefined, itemId: "feed-a", itemType: "feed" })
  ]));
  await confirm(await prepare([
    command("stock_in_inventory", { quantity: 100, price: 3, unit: "kg" },
      { pondId: undefined, itemId: "feed-a", itemType: "feed" })
  ]));

  let stock = await get("feeds/feed-a");
  const targetPurchase = stock.stockInHistory[1];
  await db.doc(`companies/${companyId}/feeds/feed-a`).update({
    totalStock: 300,
    totalCost: 900,
    usageHistory: [{ id: "u-1", date, quantity: 200, unitPrice: 3, totalCost: 600, pondId: "p1" }],
  });

  const op = await prepare([
    command("void_inventory_purchase", {},
      { pondId: undefined, itemId: "feed-a", itemType: "feed", recordId: targetPurchase.id })
  ]);
  assert.equal(op.rows[0].valid, true);
  assert.ok(op.rows[0].effects.some((e) => e.includes("remaining stock becomes 200 kg")));
  assert.equal((await confirm(op)).state, "completed");

  stock = await get("feeds/feed-a");
  assert.equal(stock.totalStock, 200);
  assert.equal(stock.totalCost, 600);
  assert.equal(stock.stockInHistory[1].voided, true);
  assert.equal(stock.stockInHistory[0].voided, undefined);
  const targetFinanceEntry = Object.values(stock.financeEntries).find((entry) => entry.reference?.includes(targetPurchase.id));
  assert.ok(targetFinanceEntry);
  assert.equal(targetFinanceEntry.voided, true);

  const expenses = await db.collection(`companies/${companyId}/expenses`).get();
  const targetExpense = expenses.docs.find((doc) => doc.data().sourceLineId === targetPurchase.id);
  assert.ok(targetExpense);
  assert.equal(targetExpense.data().voided, true);
  assert.equal(targetExpense.data().amount, 300);
});

test("rejects voiding if expense has settlements or confirmed payment", async () => {
  await confirm(await prepare([
    command("stock_in_inventory", { quantity: 10, price: 3, unit: "kg" },
      { pondId: undefined, itemId: "feed-a", itemType: "feed" })
  ]));
  const stock = await get("feeds/feed-a");
  const purchaseId = stock.stockInHistory[0].id;
  const expenseDocs = await db.collection(`companies/${companyId}/expenses`).get();
  const expenseId = expenseDocs.docs[0].id;

  // Case 1: Confirmed payment (not Unconfirmed)
  await db.doc(`companies/${companyId}/expenses/${expenseId}`).update({
    paymentType: "Cash",
  });
  let op = await prepare([
    command("void_inventory_purchase", {},
      { pondId: undefined, itemId: "feed-a", itemType: "feed", recordId: purchaseId })
  ]);
  assert.equal(op.rows[0].valid, false);
  assert.equal(op.rows[0].error, "This purchase has confirmed payment and cannot be voided.");

  // Case 2: Settlements exist
  await db.doc(`companies/${companyId}/expenses/${expenseId}`).update({
    paymentType: "Unconfirmed",
    settlements: [{ id: "set-1", amount: 30 }],
  });
  op = await prepare([
    command("void_inventory_purchase", {},
      { pondId: undefined, itemId: "feed-a", itemType: "feed", recordId: purchaseId })
  ]);
  assert.equal(op.rows[0].valid, false);
  assert.equal(op.rows[0].error, "This purchase has payment settlements and cannot be voided.");
});

test("rejects voiding if expense source metadata does not match purchase or totals are inconsistent", async () => {
  await confirm(await prepare([
    command("stock_in_inventory", { quantity: 10, price: 3, unit: "kg" },
      { pondId: undefined, itemId: "feed-a", itemType: "feed" })
  ]));
  const stock = await get("feeds/feed-a");
  const purchaseId = stock.stockInHistory[0].id;
  const expenseDocs = await db.collection(`companies/${companyId}/expenses`).get();
  const expenseId = expenseDocs.docs[0].id;

  // Case 1: sourceId mismatch
  await db.doc(`companies/${companyId}/expenses/${expenseId}`).update({
    sourceId: "wrong-feed-id",
  });
  let op = await prepare([
    command("void_inventory_purchase", {},
      { pondId: undefined, itemId: "feed-a", itemType: "feed", recordId: purchaseId })
  ]);
  assert.equal(op.rows[0].valid, false);
  assert.equal(op.rows[0].error, "Expense source metadata does not match this purchase.");

  // Case 2: sourceLineId mismatch
  await db.doc(`companies/${companyId}/expenses/${expenseId}`).update({
    sourceId: "feed-a",
    sourceLineId: "wrong-line-id",
  });
  op = await prepare([
    command("void_inventory_purchase", {},
      { pondId: undefined, itemId: "feed-a", itemType: "feed", recordId: purchaseId })
  ]);
  assert.equal(op.rows[0].valid, false);
  assert.equal(op.rows[0].error, "Expense source metadata does not match this purchase.");

  // Case 3: Expense amount mismatch
  await db.doc(`companies/${companyId}/expenses/${expenseId}`).update({
    sourceLineId: purchaseId,
    amount: 999,
  });
  op = await prepare([
    command("void_inventory_purchase", {},
      { pondId: undefined, itemId: "feed-a", itemType: "feed", recordId: purchaseId })
  ]);
  assert.equal(op.rows[0].valid, false);
  assert.equal(op.rows[0].error, "Expense amount does not match the purchase record.");

  // Restore expense amount
  await db.doc(`companies/${companyId}/expenses/${expenseId}`).update({
    amount: 30,
  });

  // Case 4: Stock available less than purchase quantity
  await db.doc(`companies/${companyId}/feeds/feed-a`).update({
    totalStock: 5,
  });
  op = await prepare([
    command("void_inventory_purchase", {},
      { pondId: undefined, itemId: "feed-a", itemType: "feed", recordId: purchaseId })
  ]);
  assert.equal(op.rows[0].valid, false);
  assert.equal(op.rows[0].error, "Voiding this purchase would make remaining inventory stock or valuation negative.");
});

test("stale draft confirmation fails if inventory item or expense changes between draft and save", async () => {
  await confirm(await prepare([
    command("stock_in_inventory", { quantity: 10, price: 3, unit: "kg" },
      { pondId: undefined, itemId: "feed-a", itemType: "feed" })
  ]));
  const stock = await get("feeds/feed-a");
  const purchaseId = stock.stockInHistory[0].id;

  // Case 1: Change inventory record in Firestore
  const draft1 = await prepare([
    command("void_inventory_purchase", {},
      { pondId: undefined, itemId: "feed-a", itemType: "feed", recordId: purchaseId })
  ]);
  assert.equal(draft1.rows[0].valid, true);

  await db.doc(`companies/${companyId}/feeds/feed-a`).update({
    totalStock: 115,
  });

  await assert.rejects(
    confirm(draft1),
    /Records changed\. Refresh and review the draft before saving\./,
  );

  // Restore totalStock to valid state for next draft
  await db.doc(`companies/${companyId}/feeds/feed-a`).update({
    totalStock: 110,
  });

  // Case 2: Change linked expense in Firestore
  const draft2 = await prepare([
    command("void_inventory_purchase", {},
      { pondId: undefined, itemId: "feed-a", itemType: "feed", recordId: purchaseId })
  ]);
  assert.equal(draft2.rows[0].valid, true);

  const expenseDocs = await db.collection(`companies/${companyId}/expenses`).where("sourceLineId", "==", purchaseId).get();
  assert.equal(expenseDocs.size, 1);
  const expDocId = expenseDocs.docs[0].id;

  await db.doc(`companies/${companyId}/expenses/${expDocId}`).update({
    notes: "altered after draft preparation",
  });

  await assert.rejects(
    confirm(draft2),
    /Records changed\. Refresh and review the draft before saving\./,
  );
});

test("permanent deletion remains blocked on item with voided purchase history", async () => {
  await confirm(await prepare([
    command("stock_in_inventory", { quantity: 10, price: 3, unit: "kg" },
      { pondId: undefined, itemId: "feed-a", itemType: "feed" })
  ]));
  const stock = await get("feeds/feed-a");
  const purchaseId = stock.stockInHistory[0].id;
  await confirm(await prepare([
    command("void_inventory_purchase", {},
      { pondId: undefined, itemId: "feed-a", itemType: "feed", recordId: purchaseId })
  ]));

  // Attempting permanent deletion of feed-a
  const delOp = await prepare([
    command("delete_inventory_item", {},
      { pondId: undefined, itemId: "feed-a", itemType: "feed" })
  ]);
  assert.equal(delOp.rows[0].valid, false);
  assert.equal(delOp.rows[0].error, "This item has purchase, usage, or linked finance history. Keep it for audit and resolve its movements through inventory management.");
});

test("rejects voiding with multiple commands, missing record, treatment mix items, or inconsistent finance metadata", async () => {
  await confirm(await prepare([
    command("stock_in_inventory", { quantity: 10, price: 3, unit: "kg" },
      { pondId: undefined, itemId: "feed-a", itemType: "feed" })
  ]));
  const stock = await get("feeds/feed-a");
  const purchaseId = stock.stockInHistory[0].id;

  // Case 1: Multiple commands in void operation
  const multiOp = await prepare([
    command("void_inventory_purchase", {},
      { id: "row-1", pondId: undefined, itemId: "feed-a", itemType: "feed", recordId: purchaseId }),
    command("stock_in_inventory", { quantity: 5, price: 3, unit: "kg" },
      { id: "row-2", pondId: undefined, itemId: "feed-a", itemType: "feed" }),
  ]);
  assert.equal(multiOp.rows[0].valid, false);
  assert.equal(multiOp.rows[0].error, "Void one inventory purchase per confirmed operation.");

  // Case 2: Purchase record no longer exists
  const missingOp = await prepare([
    command("void_inventory_purchase", {},
      { pondId: undefined, itemId: "feed-a", itemType: "feed", recordId: "nonexistent-purchase" })
  ]);
  assert.equal(missingOp.rows[0].valid, false);
  assert.equal(missingOp.rows[0].error, "The purchase record no longer exists.");

  // Case 3: Treatment mix item
  await db.doc(`companies/${companyId}/additives/mix-1`).set({
    additiveName: "Mix 1",
    inventoryKind: "treatmentMix",
    unit: "L",
    totalStock: 50,
    totalCost: 100,
    stockInHistory: [{ id: "p-mix", date, quantity: 50, price: 2 }],
  });
  const mixOp = await prepare([
    command("void_inventory_purchase", {},
      { pondId: undefined, itemId: "mix-1", itemType: "additive", recordId: "p-mix" })
  ]);
  assert.equal(mixOp.rows[0].valid, false);
  assert.equal(mixOp.rows[0].error, "Treatment mixes cannot be voided through purchase voiding.");

  // Case 4: Treatment mix production purchase source
  await db.doc(`companies/${companyId}/feeds/feed-a`).update({
    stockInHistory: [{ id: "p-prod", date, quantity: 10, price: 3, source: "treatmentMixProduction" }],
  });
  const prodOp = await prepare([
    command("void_inventory_purchase", {},
      { pondId: undefined, itemId: "feed-a", itemType: "feed", recordId: "p-prod" })
  ]);
  assert.equal(prodOp.rows[0].valid, false);
  assert.equal(prodOp.rows[0].error, "Treatment mix production cannot be voided through purchase voiding.");
});

test("observation-only entry needs no MBW/feed and leaves inventory, costs and finance unchanged", async () => {
  // Fresh pond with no prior samplings
  const op = await prepare([
    command("upsert_water_quality", {
      doMorning: 5.8,
      phMorning: 7.9,
      waterDepthCmMorning: 120,
      surfaceScum: false,
      nitriteMgL: 0.25,
      nitriteBasis: "NO2",
    }),
  ]);
  assert.equal(op.rows[0].valid, true);
  const confirmed = await confirm(op);
  assert.equal(confirmed.state, "completed");

  const p1 = await get("ponds/p1");
  assert.equal(p1.samplings.length, 1);
  const record = p1.samplings[0];
  assert.equal(record.doMorning, "5.8");
  assert.equal(record.phMorning, "7.9");
  assert.equal(record.waterDepthCmMorning, 120);
  assert.equal(typeof record.waterDepthCmMorning, "number");
  assert.equal(record.surfaceScum, false);
  assert.equal(typeof record.surfaceScum, "boolean");
  assert.equal(record.nitriteMgL, 0.25);
  assert.equal(typeof record.nitriteMgL, "number");
  assert.equal(record.nitriteBasis, "NO2");

  // Crucial: Observation-only entry has NO mbw, feed, or mortality
  assert.equal(record.mbw, undefined);
  assert.equal(record.feed, undefined);
  assert.equal(record.feedData, undefined);
  assert.equal(record.mortality, undefined);

  // Crucial: Inventory remains completely untouched
  const feedA = await get("feeds/feed-a");
  assert.equal(feedA.totalStock, 100);
  assert.equal(feedA.totalCost, 200);
  assert.deepEqual(feedA.usageHistory, []);

  // Crucial: Finance (expenses and revenues) remains completely untouched
  const expensesSnap = await db.collection(`companies/${companyId}/expenses`).get();
  assert.equal(expensesSnap.docs.length, 0);
  const revenuesSnap = await db.collection(`companies/${companyId}/revenues`).get();
  assert.equal(revenuesSnap.docs.length, 0);
});

test("existing id, date, cycle and other sessions survive updates and corrections", async () => {
  // Pre-seed an existing sampling record with morning session and biological/cycle metadata
  const existingRecord = {
    id: "sample-existing-42",
    date,
    cycleId: "cycle-a",
    pondCycleId: "p1",
    cycleName: "Alpha Cycle",
    doMorning: "5.2",
    phMorning: "7.7",
    temperatureMorning: "28.5",
    waterDepthCmMorning: 110,
    surfaceScum: true,
  };
  await db.doc(`companies/${companyId}/ponds/p1`).update({
    samplings: [existingRecord],
  });

  // Now submit evening observation to the same date
  const op = await prepare([
    command("upsert_water_quality", {
      doEvening: 6.3,
      phEvening: 8.1,
      temperatureEvening: 29.5,
      waterDepthCmEvening: 115,
      surfaceScum: false,
    }),
  ]);
  assert.equal(op.rows[0].valid, true);
  await confirm(op);

  const p1 = await get("ponds/p1");
  assert.equal(p1.samplings.length, 1);
  const updated = p1.samplings[0];

  // Existing id, date, cycle survive
  assert.equal(updated.id, "sample-existing-42");
  assert.equal(updated.date, date);
  assert.equal(updated.cycleId, "cycle-a");
  assert.equal(updated.pondCycleId, "p1");

  // Morning session survived untouched
  assert.equal(updated.doMorning, "5.2");
  assert.equal(updated.phMorning, "7.7");
  assert.equal(updated.temperatureMorning, "28.5");
  assert.equal(updated.waterDepthCmMorning, 110);

  // Evening session and typed fields were added/updated
  assert.equal(updated.doEvening, "6.3");
  assert.equal(updated.phEvening, "8.1");
  assert.equal(updated.temperatureEvening, "29.5");
  assert.equal(updated.waterDepthCmEvening, 115);
  assert.equal(typeof updated.waterDepthCmEvening, "number");
  assert.equal(updated.surfaceScum, false);
  assert.equal(typeof updated.surfaceScum, "boolean");
});

test("water quality confirmation retries remain idempotent", async () => {
  const op = await prepare([
    command("upsert_water_quality", {
      doMorning: 5.6,
      surfaceScum: false,
    }),
  ]);
  const res1 = await confirm(op);
  assert.equal(res1.state, "completed");
  assert.equal((await get("ponds/p1")).samplings.length, 1);

  // Retry confirming the exact same operation
  const res2 = await confirm(op);
  assert.equal(res2.state, "completed");
  assert.equal((await get("ponds/p1")).samplings.length, 1);
  assert.equal((await get("ponds/p1")).samplings[0].doMorning, "5.6");
  assert.equal((await get("ponds/p1")).samplings[0].surfaceScum, false);
});

test("concurrent edit to the same reading rejects confirmation", async () => {
  const op = await prepare([
    command("upsert_water_quality", { doMorning: 5.5 }),
  ]);
  assert.equal(op.rows[0].valid, true);

  // Someone concurrently writes a sampling on that date
  await db.doc(`companies/${companyId}/ponds/p1`).update({
    samplings: [
      { id: "concurrent-row", date, doMorning: "6.0", phMorning: "7.8" },
    ],
  });

  // Attempting to confirm the prepared draft must reject due to changed basis
  await assert.rejects(confirm(op), /changed/i);
});

test("permission revocation rejects confirmation of prepared observation draft", async () => {
  const op = await service.prepare({
    uid: "tech",
    companyId,
    commands: [
      command("upsert_water_quality", { doMorning: 5.5 }),
    ],
  });
  assert.equal(op.rows[0].valid, true);

  // Revoke permission
  await db
    .doc("users/tech")
    .update({ permissionOverrides: { recordPondData: false } });

  // Confirmation must reject
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
