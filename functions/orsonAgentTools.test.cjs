const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createAgentTools } = require("./orsonAgentTools");

test("a requested price in another currency cannot become a company-currency draft", async () => {
  const agent = createAgentTools({
    db: {},
    auth: { company: { currency: "AUD" } },
    userMessage: "ganti harga nya jadi 17000 IDR",
    onActivity: async () => {},
    onOperation: async () => { throw new Error("Unexpected draft"); },
  });
  const result = await agent.execute("prepare_farm_actions", {
    commands: [{ type: "stock_in_inventory", values: { price: 17000 } }],
  });
  assert.equal(result.status, "needs_currency_clarification");
  assert.match(result.message, /AUD/);
});

test("an edit request cannot silently add a new sampling record", async () => {
  const agent = createAgentTools({
    db: {},
    auth: { company: { currency: "AUD" } },
    userMessage: "Change Pond A's last sampling MBW to 13 g",
    onActivity: async () => {},
    onOperation: async () => { throw new Error("Unexpected draft"); },
  });
  const result = await agent.execute("prepare_farm_actions", {
    commands: [{ type: "record_sampling", date: "2026-09-21", values: { mbw: 13, feed: 25 } }],
  });
  assert.equal(result.status, "needs_existing_record");
  assert.match(result.message, /record ID/);
});

const inventoryAuth = ({ feeds = [], additives = [] } = {}) => ({
  company: { currency: "AUD" },
  uid: "test-user",
  companyId: "farm",
  allowed: () => true,
  base: {
    collection: (name) => ({
      get: async () => ({
        docs: (name === "feeds" ? feeds : name === "additives" ? additives : []).map((item) => ({
          id: item.id,
          data: () => item,
        })),
      }),
    }),
  },
});

const mockOperationService = (onPrepare) => ({
  prepare: async ({ commands }) => {
    onPrepare(commands);
    return {
      id: "operation-1",
      revision: 1,
      state: "draft",
      rows: commands.map((command) => ({
        command,
        title: command.type,
        valid: true,
        effects: [],
      })),
    };
  },
});

const observationAuth = () => ({
  company: { currency: "AUD" },
  uid: "test-user",
  companyId: "farm",
  allowed: () => true,
  base: {
    collection: (name) => ({
      get: async () => ({
        docs: name === "ponds" ? [{ id: "pond-a", data: () => ({ pondName: "SIM-A1", cycleStatus: "active" }) }] : [],
      }),
    }),
  },
});

test("an explicitly observed weather event is preserved in typed water-quality drafts", async () => {
  let preparedCommands;
  const agent = createAgentTools({
    db: {},
    auth: observationAuth(),
    service: mockOperationService((commands) => { preparedCommands = commands; }),
    userMessage: "Please record water quality for pond SIM-A1 today: observed heavy rain, 0% exchange, no surface scum.",
    onActivity: async () => {},
    onOperation: async () => {},
  });

  const result = await agent.execute("prepare_farm_actions", {
    commands: [{
      id: "row-1",
      type: "upsert_water_quality",
      pondId: "SIM-A1",
      date: "2026-10-03",
      values: { waterExchangePercent: 0, surfaceScum: false },
    }],
  });

  assert.equal(result.status, "awaiting_user_confirmation");
  assert.equal(preparedCommands[0].values.weatherEvent, "heavy_rain");
  assert.equal(preparedCommands[0].values.waterExchangePercent, 0);
  assert.equal(preparedCommands[0].values.surfaceScum, false);
});

test("weather mentioned only in a forecast is not added to a water-quality draft", async () => {
  let preparedCommands;
  const agent = createAgentTools({
    db: {},
    auth: observationAuth(),
    service: mockOperationService((commands) => { preparedCommands = commands; }),
    userMessage: "Please record water quality for pond SIM-A1 today. The forecast expects heavy rain tomorrow.",
    onActivity: async () => {},
    onOperation: async () => {},
  });

  await agent.execute("prepare_farm_actions", {
    commands: [{
      id: "row-1",
      type: "upsert_water_quality",
      pondId: "SIM-A1",
      date: "2026-10-03",
      values: { waterExchangePercent: 0 },
    }],
  });

  assert.equal(Object.hasOwn(preparedCommands[0].values, "weatherEvent"), false);
});

test("an explicitly absent weather event is not added to a water-quality draft", async () => {
  let preparedCommands;
  const agent = createAgentTools({
    db: {},
    auth: observationAuth(),
    service: mockOperationService((commands) => { preparedCommands = commands; }),
    userMessage: "Please record water quality for pond SIM-A1 today; heavy rain was not observed.",
    onActivity: async () => {},
    onOperation: async () => {},
  });

  await agent.execute("prepare_farm_actions", {
    commands: [{
      id: "row-1",
      type: "upsert_water_quality",
      pondId: "SIM-A1",
      date: "2026-10-03",
      values: { waterExchangePercent: 0 },
    }],
  });

  assert.equal(Object.hasOwn(preparedCommands[0].values, "weatherEvent"), false);
});

const makeInventoryItem = (overrides = {}) => ({
  id: "feed-a",
  feedName: "Feed A",
  unit: "kg",
  totalStock: 50,
  totalCost: 500,
  stockInHistory: [{
    id: "purchase-1",
    date: "2026-09-20",
    quantity: 50,
    price: 10,
    voided: false,
  }],
  usageHistory: [],
  ...overrides,
});

test("generic inventory removal routes one unique unused purchase to an audited void draft", async () => {
  let preparedCommands;
  let emittedOperation;
  const agent = createAgentTools({
    db: {},
    auth: inventoryAuth({ feeds: [makeInventoryItem()] }),
    service: mockOperationService((commands) => { preparedCommands = commands; }),
    userMessage: "Remove Feed A",
    onActivity: async () => {},
    onOperation: async (operation) => { emittedOperation = operation; },
  });

  const result = await agent.execute("prepare_farm_actions", {
    commands: [{
      id: "row-1",
      type: "delete_inventory_item",
      itemId: "Feed A",
      date: "2026-09-21",
      values: { unrelated: "ignored" },
    }],
  });

  assert.equal(result.status, "awaiting_user_confirmation");
  assert.match(result.notice, /Nothing has been saved/);
  assert.equal(preparedCommands[0].type, "void_inventory_purchase");
  assert.equal(preparedCommands[0].recordId, "purchase-1");
  assert.equal(preparedCommands[0].itemId, "feed-a");
  assert.equal(preparedCommands[0].itemType, "feed");
  assert.equal(preparedCommands[0].date, "2026-09-20");
  assert.deepEqual(preparedCommands[0].values, {});
  assert.equal(emittedOperation.state, "draft");
});

test("generic removal asks which item when feed and additive names both match", async () => {
  let prepareCalled = false;
  const agent = createAgentTools({
    db: {},
    auth: inventoryAuth({
      feeds: [makeInventoryItem()],
      additives: [makeInventoryItem({
        id: "additive-a",
        additiveName: "Feed A",
        feedName: undefined,
        stockInHistory: [{
          id: "purchase-2",
          date: "2026-09-21",
          quantity: 25,
          price: 8,
          voided: false,
        }],
      })],
    }),
    service: mockOperationService(() => { prepareCalled = true; }),
    userMessage: "Remove Feed A",
    onActivity: async () => {},
    onOperation: async () => { throw new Error("Unexpected draft"); },
  });

  const result = await agent.execute("prepare_farm_actions", {
    commands: [{ id: "row-1", type: "delete_inventory_item", itemId: "Feed A", itemType: "feed", date: "2026-09-21", values: {} }],
  });

  assert.equal(result.status, "needs_item_clarification");
  assert.match(result.message, /feed, ID feed-a/);
  assert.match(result.message, /additive, ID additive-a/);
  assert.equal(prepareCalled, false);
});

test("generic removal asks which active purchase when item history has several", async () => {
  let prepareCalled = false;
  const feed = makeInventoryItem({
    stockInHistory: [
      { id: "purchase-1", date: "2026-09-10", quantity: 20, price: 10, voided: false },
      { id: "purchase-2", date: "2026-09-15", quantity: 30, price: 11, voided: false },
    ],
  });
  const agent = createAgentTools({
    db: {},
    auth: inventoryAuth({ feeds: [feed] }),
    service: mockOperationService(() => { prepareCalled = true; }),
    userMessage: "Remove Feed A",
    onActivity: async () => {},
    onOperation: async () => { throw new Error("Unexpected draft"); },
  });

  const result = await agent.execute("prepare_farm_actions", {
    commands: [{ id: "row-1", type: "delete_inventory_item", itemId: "Feed A", date: "2026-09-21", values: {} }],
  });

  assert.equal(result.status, "needs_purchase_clarification");
  assert.equal(result.candidates.length, 2);
  assert.deepEqual(result.candidates[0], { date: "2026-09-10", quantity: 20, unit: "kg", price: 10 });
  assert.match(result.message, /date, quantity, and price/);
  assert.equal(prepareCalled, false);
});

test("generic removal fails closed for usage, malformed history, and duplicate purchase IDs", async (t) => {
  const cases = [
    {
      name: "recorded usage",
      item: makeInventoryItem({ usageHistory: [{ id: "usage-1", quantity: 1 }] }),
      expected: /recorded usage/i,
    },
    {
      name: "malformed history",
      item: makeInventoryItem({ stockInHistory: null }),
      expected: /history is incomplete, malformed, or duplicated/i,
    },
    {
      name: "duplicate purchase IDs",
      item: makeInventoryItem({ stockInHistory: [
        { id: "duplicate", date: "2026-09-10", quantity: 20, price: 10 },
        { id: "duplicate", date: "2026-09-11", quantity: 20, price: 10 },
      ] }),
      expected: /history is incomplete, malformed, or duplicated/i,
    },
  ];

  for (const entry of cases) {
    await t.test(entry.name, async () => {
      let prepareCalled = false;
      const agent = createAgentTools({
        db: {},
        auth: inventoryAuth({ feeds: [entry.item] }),
        service: mockOperationService(() => { prepareCalled = true; }),
        userMessage: "Remove Feed A",
        onActivity: async () => {},
        onOperation: async () => { throw new Error("Unexpected draft"); },
      });
      const result = await agent.execute("prepare_farm_actions", {
        commands: [{ id: "row-1", type: "delete_inventory_item", itemId: "Feed A", date: "2026-09-21", values: {} }],
      });
      assert.equal(result.status, "needs_inventory_reconciliation");
      assert.match(result.message, entry.expected);
      assert.equal(prepareCalled, false);
    });
  }
});

test("explicit permanent deletion stays on the existing hard-delete validation path", async () => {
  let preparedCommands;
  const agent = createAgentTools({
    db: {},
    auth: inventoryAuth({ feeds: [makeInventoryItem()] }),
    service: mockOperationService((commands) => { preparedCommands = commands; }),
    userMessage: "Permanently delete Feed A",
    onActivity: async () => {},
    onOperation: async () => {},
  });

  await agent.execute("prepare_farm_actions", {
    commands: [{ id: "row-1", type: "delete_inventory_item", itemId: "Feed A", date: "2026-09-21", values: {} }],
  });

  assert.equal(preparedCommands[0].type, "delete_inventory_item");
});

test("hard-delete wording is explicit but a negated hard-delete instruction still uses audited removal", async () => {
  const prepareForMessage = async (userMessage) => {
    let preparedCommands;
    const agent = createAgentTools({
      db: {},
      auth: inventoryAuth({ feeds: [makeInventoryItem()] }),
      service: mockOperationService((commands) => { preparedCommands = commands; }),
      userMessage,
      onActivity: async () => {},
      onOperation: async () => {},
    });
    await agent.execute("prepare_farm_actions", {
      commands: [{ id: "row-1", type: "delete_inventory_item", itemId: "Feed A", date: "2026-09-21", values: {} }],
    });
    return preparedCommands[0].type;
  };

  assert.equal(await prepareForMessage("Hard-delete Feed A"), "delete_inventory_item");
  assert.equal(
    await prepareForMessage("Remove Feed A without permanently deleting it"),
    "void_inventory_purchase",
  );
});

test("inventory catalog exposes safe active purchase metadata without finance internals", async () => {
  const { createAgentCatalog } = require("./shared/orsonEntityResolver");
  const item = makeInventoryItem({
    companyId: "private-company-id",
    financeEntries: { secret: { amount: 500 } },
  });
  const catalog = await createAgentCatalog(inventoryAuth({ feeds: [item] }));
  const feed = catalog.feeds[0];

  assert.equal(feed.activePurchaseCount, 1);
  assert.equal(feed.activePurchaseId, "purchase-1");
  assert.equal(feed.hasUsage, false);
  assert.equal(feed.hasAmbiguousHistory, false);
  assert.equal(feed.companyId, undefined);
  assert.equal(feed.financeEntries, undefined);
  assert.equal(feed.totalCost, undefined);
});

const depthRow = (values, pondId = "SIM-A1", date = "2026-10-03", id = "depth-row") => ({
  id, type: "upsert_water_quality", pondId, date, values,
});
const depthAuth = (ponds = [
  { id: "pond-a", pondName: "SIM-A1" },
  { id: "pond-b", pondName: "SIM-A2" },
  { id: "pond-suffix", pondName: "SIM-A1-2" },
]) => ({
  ...observationAuth(),
  base: { collection: (name) => ({ get: async () => ({
    docs: name === "ponds" ? ponds.map((p) => ({ id: p.id, data: () => p })) : [],
  }) }) },
});
async function prepareDepth(message, commands, auth = depthAuth()) {
  const counts = { activity: 0, prepare: 0, operation: 0 };
  let prepared;
  const before = JSON.stringify(commands);
  const agent = createAgentTools({
    db: {}, auth, userMessage: message,
    service: mockOperationService((rows) => { counts.prepare++; prepared = rows; }),
    onActivity: async () => { counts.activity++; },
    onOperation: async () => { counts.operation++; },
  });
  const result = await agent.execute("prepare_farm_actions", { commands });
  assert.equal(JSON.stringify(commands), before, "Caller commands must remain unchanged");
  return { result, counts, prepared };
}

const acceptedDepthCases = [
  ["canonical metre metadata is not applied twice", "Pond SIM-A1: morning depth 1.4m.", { waterDepthCmMorning: 140, waterDepthUnit: "m", doMorning: 5.5 }, { waterDepthCmMorning: 140, doMorning: 5.5 }],
  ["raw metre magnitude is converted once", "Pond SIM-A1: morning depth 1.4 metres.", { waterDepthCmMorning: 1.4, waterDepthUnit: "m" }, { waterDepthCmMorning: 140 }],
  ["unrelated preceding negation", "Pond SIM-A1: no surface scum, morning depth 1.4m.", { waterDepthCmMorning: 140, waterDepthUnit: "m", surfaceScum: false, waterExchangePercent: 0 }, { waterDepthCmMorning: 140, surfaceScum: false, waterExchangePercent: 0 }],
  ["unrelated following negation", "Pond SIM-A1: morning depth 120cm, DO was not measured.", {}, { waterDepthCmMorning: 120 }],
  ["unrelated scum in same phrase", "Pond SIM-A1: morning depth 1.4m with no surface scum.", { doMorning: 5.5 }, { waterDepthCmMorning: 140, doMorning: 5.5 }],
  ["unrelated forecast", "Pond SIM-A1: morning depth 1.4m, rain may occur tomorrow.", { waterDepthCmMorning: 140, waterDepthUnit: "m" }, { waterDepthCmMorning: 140 }],
  ["both sessions converted atomically", "Pond SIM-A1: morning depth 1.2m, evening depth 1.15m.", { morningDepth: 1.2, eveningDepth: 1.15, waterDepthUnit: "m", doMorning: 5.5, doEvening: 6 }, { waterDepthCmMorning: 120, waterDepthCmEvening: 115, doMorning: 5.5, doEvening: 6 }],
  ["neutral ammonia does not imply AM", "Pond SIM-A1: evening depth 1.2m, ammonia 0.2.", { ammonia: 0.2 }, { waterDepthCmEvening: 120, ammonia: 0.2 }],
  ["trailing explicit session", "Pond SIM-A1: depth 1.2m in evening.", {}, { waterDepthCmEvening: 120 }],
  ["canonical string import", "Save water quality observations", { waterDepthCmMorning: "120" }, { waterDepthCmMorning: 120 }],
  ["unitized import with null placeholder", "Save water quality observations", { depth: "1.2m", waterDepthCmEvening: null, surfaceScum: false, waterExchangePercent: 0 }, { waterDepthCmMorning: 120, surfaceScum: false, waterExchangePercent: 0 }],
  ["two-session import keeps shared unit", "Save water quality observations", { waterDepthCmMorning: 1.2, waterDepthCmEvening: 1.15, waterDepthUnit: "m" }, { waterDepthCmMorning: 120, waterDepthCmEvening: 115 }],
  ["unknown placeholders are omitted", "Save water quality observations", { doMorning: 5.5, waterDepthCmMorning: null, waterDepthUnit: "unknown" }, { doMorning: 5.5 }],
];
for (const [name, message, values, expected] of acceptedDepthCases) {
  test("depth accepts " + name, async () => {
    const { result, counts, prepared } = await prepareDepth(message, [depthRow(values)]);
    assert.equal(result.status, "awaiting_user_confirmation");
    assert.deepEqual(prepared[0].values, expected);
    assert.equal(counts.prepare, 1);
    assert.equal(counts.operation, 1);
  });
}

const rejectedDepthCases = [
  ["wrong pond", "SIM-A1: DO 5.5, SIM-A2: morning depth 1.2m", [depthRow({ doMorning: 5.5 })]],
  ["wrong date", "SIM-A1 on 2026-10-03: DO 5.5, on 2026-10-02 morning depth 1.2m", [depthRow({ doMorning: 5.5 })]],
  ["wrong session after comma", "SIM-A1: morning DO 5.5, depth 1.2m in evening", [depthRow({ doMorning: 5.5 })]],
  ["wrong explicit evening session", "SIM-A1: morning DO 5.5, evening depth 1.2m", [depthRow({ doMorning: 5.5 })]],
  ["identifier suffix", "Pond SIM-A1-2: depth 1.2m", [depthRow({ doMorning: 5.5 })]],
  ["two ponds", "Pond SIM-A1 and Pond SIM-A2: morning depth 1.2m", [depthRow({}, "SIM-A2")]],
  ["alternative dates", "SIM-A1 on 2026-10-01 or 2026-10-02: morning depth 1.2m", [depthRow({}, "SIM-A1", "2026-10-02")]],
  ["range with units", "SIM-A1: morning depth 1.2m or 1.3m", [depthRow({})]],
  ["range without first unit", "SIM-A1: morning depth 1.2 to 1.3m", [depthRow({})]],
  ["range separated by comma", "SIM-A1: morning depth 1.2m, or 1.3m", [depthRow({})]],
  ["second reading without label", "SIM-A1: morning depth 1.2m, evening 1.3m", [depthRow({})]],
  ["range using and", "SIM-A1: morning depth 1.2m and 1.3m", [depthRow({})]],
  ["unsupported written date", "SIM-A1 on October 2: morning depth 1.2m", [depthRow({})]],
  ["uncertain source", "SIM-A1: maybe depth 1.2m", [depthRow({ waterDepthCmMorning: 120 })]],
  ["mixed source units", "SIM-A1: morning depth 1.2m/cm", [depthRow({})]],
  ["zero source", "SIM-A1: morning depth 0m", [depthRow({})]],
  ["negative source", "SIM-A1: morning depth -1.2m", [depthRow({})]],
  ["source rounds to zero", "SIM-A1: morning depth 0.001m", [depthRow({})]],
  ["source unit missing", "SIM-A1: morning depth 1.2", [depthRow({})]],
  ["unsupported source unit", "SIM-A1: morning depth 4ft", [depthRow({})]],
  ["conflicting model depth", "SIM-A1: morning depth 1.2m", [depthRow({ waterDepthCmMorning: 150 })]],
  ["invalid untouched negative field", "SIM-A1: morning depth 1.2m", [depthRow({ doMorning: 5.5, waterDepthCmEvening: -1 })]],
  ["invalid untouched unit", "SIM-A1: morning depth 1.2m", [depthRow({ doMorning: 5.5, eveningDepth: "4 ft" })]],
  ["unverified evening shared-unit value", "SIM-A1: morning depth 1.2m", [depthRow({ waterDepthCmMorning: 1.2, waterDepthCmEvening: 1.15, waterDepthUnit: "m" })]],
  ["invalid type cannot be overwritten", "SIM-A1: morning depth 1.2m", [depthRow({ waterDepthCmMorning: false })]],
  ["unrelated row copied depth", "SIM-A1: morning depth 1.2m. SIM-A2: DO 6.", [depthRow({ doMorning: 5.5 }, "SIM-A1", "2026-10-03", "one"), depthRow({ doMorning: 6, waterDepthCmMorning: 120 }, "SIM-A2", "2026-10-03", "two")]],
  ["wrong date row copied depth", "SIM-A1 on 2026-10-03: morning depth 1.2m", [depthRow({ doMorning: 5.5 }, "SIM-A1", "2026-10-03", "one"), depthRow({ waterDepthCmMorning: 120 }, "SIM-A1", "2026-10-02", "two")]],
  ["generic negated depth", "SIM-A1: depth was not recorded", [depthRow({ doMorning: 5.5, waterDepthCmMorning: 120 })]],
  ["generic alias in negated evening", "SIM-A1: evening depth was not recorded", [depthRow({ doEvening: 6, depth: "1.15m" })]],
  ["negated other session", "SIM-A1: morning depth 1.2m, evening depth was not recorded", [depthRow({ waterDepthCmMorning: 120, waterDepthCmEvening: 115 })]],
  ["forecast source", "SIM-A1: expected depth 1.2m tomorrow", [depthRow({ waterDepthCmMorning: 120 })]],
  ["invalid imported depth", "Save water quality observations", [depthRow({ waterDepthCmMorning: -1 })]],
  ["unsupported imported depth", "Save water quality observations", [depthRow({ depth: "4ft" })]],
  ["bare alias needs unit", "Save water quality observations", [depthRow({ morningDepth: 120 })]],
  ["contradictory imported aliases", "Save water quality observations", [depthRow({ waterDepthCmMorning: 120, morningDepth: "1.3m" })]],
];
for (const [name, message, rows] of rejectedDepthCases) {
  test("depth clarifies " + name + " before every callback", async () => {
    const { result, counts } = await prepareDepth(message, rows);
    assert.equal(result.status, "needs_depth_clarification");
    assert.deepEqual(counts, { activity: 0, prepare: 0, operation: 0 });
  });
}

test("depth preserves natural entry without a resolved pond but validates every field and session", async () => {
  const source = "Please record water quality for Pond 1: morning depth 1.2m";
  const valid = depthRow({ doMorning: 5.5, depth: "1.2m" });
  delete valid.pondId;
  const accepted = await prepareDepth(source, [valid], depthAuth([]));
  assert.equal(accepted.result.status, "awaiting_user_confirmation");
  assert.equal(accepted.prepared[0].values.waterDepthCmMorning, 120);
  for (const values of [
    { doMorning: 5.5, doEvening: 6, eveningDepth: "1.2m" },
    { doMorning: 5.5, depth: "1.2m", waterDepthCmEvening: -1 },
  ]) {
    const row = depthRow(values);
    delete row.pondId;
    const rejected = await prepareDepth(source, [row], depthAuth([]));
    assert.equal(rejected.result.status, "needs_depth_clarification");
    assert.deepEqual(rejected.counts, { activity: 0, prepare: 0, operation: 0 });
  }
});

test("depth resolves exact pond IDs before names and respects authorized block scope", async () => {
  const auth = depthAuth([{ id: "pond-a", pondName: "SIM-A1" }, { id: "pond-b", pondName: "pond-a" }]);
  const wrong = await prepareDepth("Pond pond-b: morning depth 1.2m", [depthRow({}, "pond-a")], auth);
  assert.equal(wrong.result.status, "needs_depth_clarification");
  assert.deepEqual(wrong.counts, { activity: 0, prepare: 0, operation: 0 });
  const scoped = depthAuth([{ id: "pond-a", pondName: "SIM-A1", blockId: "allowed" }, { id: "pond-b", pondName: "SIM-A1", blockId: "other" }]);
  scoped.scoped = true;
  scoped.blockIds = new Set(["allowed"]);
  const accepted = await prepareDepth("SIM-A1: morning depth 1.2m", [depthRow({}, "pond-a")], scoped);
  assert.equal(accepted.result.status, "awaiting_user_confirmation");
  const ambiguous = await prepareDepth("SIM-A1: morning depth 1.2m", [depthRow({}, "pond-a")], depthAuth([{ id: "pond-a", pondName: "SIM-A1" }, { id: "pond-b", pondName: "SIM-A1" }]));
  assert.equal(ambiguous.result.status, "needs_depth_clarification");
});

test("depth does not block a measured pond because another pond's same session was unrecorded", async () => {
  const { result, prepared } = await prepareDepth(
    "SIM-A1: morning depth 1.2m. SIM-A2: morning depth was not recorded",
    [depthRow({ waterDepthCmMorning: 120 })],
  );
  assert.equal(result.status, "awaiting_user_confirmation");
  assert.equal(prepared[0].values.waterDepthCmMorning, 120);
});
