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
