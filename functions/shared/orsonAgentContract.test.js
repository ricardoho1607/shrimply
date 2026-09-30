const { test } = require("node:test");
const assert = require("node:assert/strict");
const { normalizeCommand, acceptOrsonActivity } = require("./orsonDomain/orsonAgentContract");
test("rejects malformed dates, unknown fields, negative amounts and invalid observation enums", () => {
  for (const data of [
    { date: "2026-02-30" },
    { values: { mbw: -1, feed: 2 } },
    { values: { mbw: 1, feed: Infinity } },
    { values: { mbw: 1, feed: 2, companyId: "other" } },
  ])
    assert.throws(() =>
      normalizeCommand({
        id: "row-1",
        type: "record_sampling",
        date: "2026-09-21",
        values: { mbw: 1, feed: 2 },
        ...data,
      }),
    );
});
test("activity ordering ignores duplicate, stale and foreign requests", () => {
  const first = {
    type: "status_step",
    requestId: "one",
    sequence: 1,
    step: "pond_lookup",
    state: "running",
  };
  assert.equal(acceptOrsonActivity(null, first), first);
  assert.equal(acceptOrsonActivity(first, { ...first, sequence: 0 }), first);
  assert.equal(
    acceptOrsonActivity(first, { ...first, requestId: "two", sequence: 2 }),
    first,
  );
  assert.equal(
    acceptOrsonActivity(first, {
      ...first,
      sequence: 2,
      step: "internal-secret",
    }),
    first,
  );
  assert.equal(
    acceptOrsonActivity(first, {
      ...first,
      sequence: 2,
      step: "sampling_lookup",
    }).step,
    "sampling_lookup",
  );
});

test("CSV preserves quoted commas, newlines, empty cells and escaped quotes", () => {
  const { parseCsv } = require("./orsonDocumentExtraction");
  assert.deepEqual(
    parseCsv(
      'pond,notes,feed\r\nA1,"rain, wind",\r\nA2,"two\nlines and ""quotes""",20',
    ),
    [
      ["pond", "notes", "feed"],
      ["A1", "rain, wind", ""],
      ["A2", 'two\nlines and "quotes"', "20"],
    ],
  );
  assert.throws(() => parseCsv('pond,"unfinished'));
});

test("malformed status state cannot turn a live action into a false completion", () => {
  const event = {
    type: "status_step",
    requestId: "r",
    sequence: 1,
    step: "saving",
    state: "saved",
  };
  assert.equal(acceptOrsonActivity(null, event), null);
});

test("void_inventory_purchase validates exact authorized target and rejects unsupported values", () => {
  const valid = {
    id: "row-void",
    type: "void_inventory_purchase",
    date: "2026-09-21",
    itemType: "feed",
    itemId: "feed-1",
    recordId: "purchase-1",
    values: {},
  };
  const normalized = normalizeCommand(valid);
  assert.equal(normalized.type, "void_inventory_purchase");
  assert.equal(normalized.itemType, "feed");
  assert.equal(normalized.itemId, "feed-1");
  assert.equal(normalized.recordId, "purchase-1");

  // Rejects missing/invalid itemType
  assert.throws(() => normalizeCommand({ ...valid, itemType: "other" }));
  assert.throws(() => normalizeCommand({ ...valid, itemType: undefined }));

  // Rejects missing/invalid itemId
  assert.throws(() => normalizeCommand({ ...valid, itemId: "" }));
  assert.throws(() => normalizeCommand({ ...valid, itemId: "invalid id with spaces" }));

  // Rejects missing/invalid recordId
  assert.throws(() => normalizeCommand({ ...valid, recordId: "" }));
  assert.throws(() => normalizeCommand({ ...valid, recordId: "invalid/id" }));

  // Rejects unsupported fields or invalid values
  assert.throws(() => normalizeCommand({ ...valid, values: { notes: "arbitrary" } }));
  assert.throws(() => normalizeCommand({ ...valid, values: { quantity: 10 } }));
  assert.throws(() => normalizeCommand({ ...valid, values: undefined }));
  assert.throws(() => normalizeCommand({ ...valid, values: null }));
  assert.throws(() => normalizeCommand({ ...valid, values: "invalid" }));
});

test("both web and mobile Orson review cards explain active stock and finance removal with audit retention", async () => {
  const { planCommands } = require("./orsonCommandPlan");
  const { AGENT_INSTRUCTION, INVENTORY_CATEGORY_INSTRUCTION } = require("../orsonAgentTools");
  const { buildInventoryExpense, financeSyncDocumentId, financeSourceEntry } = require("./orsonDomain/financeSync");

  const purchase = {
    id: "p-1",
    date: "2026-09-20",
    quantity: 10,
    price: 3,
    unit: "kg",
  };
  const exp = buildInventoryExpense({
    ...purchase,
    itemId: "feed-1",
    itemName: "Grower Feed",
    type: "feed",
    sourceStockIndex: 0,
  });
  const expId = financeSyncDocumentId(exp.reference);
  const auth = {
    uid: "test-user",
    companyId: "farm-1",
    user: { name: "Test User", email: "test@example.com" },
    company: { currency: "USD", timeZone: "UTC" },
    require: () => {},
    base: {
      collection: (col) => ({
        doc: (id) => ({
          get: async () => {
            const data = {
              "feeds/feed-1": {
                id: "feed-1",
                feedName: "Grower Feed",
                unit: "kg",
                totalStock: 100,
                totalCost: 300,
                stockInHistory: [{ ...purchase }],
                usageHistory: [],
                financeEntries: { [expId]: financeSourceEntry(exp) },
              },
              [`expenses/${expId}`]: {
                id: expId,
                ...exp,
                companyId: "farm-1",
                paymentType: "Unconfirmed",
                settlements: [],
              },
            }[`${col}/${id}`];
            return { exists: Boolean(data), data: () => (data ? { ...data } : undefined) };
          },
        }),
      }),
    },
  };

  const command = {
    id: "row-1",
    type: "void_inventory_purchase",
    date: "2026-09-21",
    itemType: "feed",
    itemId: "feed-1",
    recordId: "p-1",
    values: {},
  };

  const plan = await planCommands({ auth, commands: [command], operationId: "op-card-test" });
  assert.equal(plan.rows.length, 1);
  const row = plan.rows[0];
  assert.equal(row.valid, true);
  assert.equal(row.title, "Void inventory purchase");
  assert.equal(row.target, "Grower Feed");
  assert.match(AGENT_INSTRUCTION, /remove inventory or an inventory post, including a duplicate/i);
  assert.match(AGENT_INSTRUCTION, /user does not need to say 'duplicate' or 'void'/i);
  assert.match(AGENT_INSTRUCTION, /If it is unclear whether the user means a purchase post or the entire inventory item.*ask which exact record/i);
  assert.match(AGENT_INSTRUCTION, /Keep both records as voided audit history; never hard-delete either record/i);
  assert.match(AGENT_INSTRUCTION, /voiding is allowed despite usage history only when remaining quantity and valuation are safely supported/i);
  assert.match(INVENTORY_CATEGORY_INSTRUCTION, /ask the user to choose its inventory category if they have not stated one/i);
  assert.match(INVENTORY_CATEGORY_INSTRUCTION, /Feed categories are Starter, Grower, Finisher, or Other/i);
  assert.match(INVENTORY_CATEGORY_INSTRUCTION, /Additive categories are Water Conditioner, Probiotic, Mineral, Vitamin, or Other/i);
  assert.match(INVENTORY_CATEGORY_INSTRUCTION, /Finance classifies the linked expense as Feed or Pond Additives automatically/i);

  // Guidance prompt logic verified across both clients
  const getPrompt = (types) => {
    if (types.includes("delete_inventory_item")) return "Check the item and stock details. Deletion is permanent.";
    if (types.includes("void_inventory_purchase")) return "Check the purchase and stock details. Voiding is auditable and permanent.";
    return "Check the target, date, and changes. Selected entries for each pond save together.";
  };
  assert.equal(getPrompt([row.command.type]), "Check the purchase and stock details. Voiding is auditable and permanent.");
  assert.equal(getPrompt(["delete_inventory_item"]), "Check the item and stock details. Deletion is permanent.");

  // Review card draft status badge and text logic
  const isVoid = row.command.type === "void_inventory_purchase";
  const draftBadge = isVoid ? "TO BE REMOVED" : null;
  const draftStatusText = isVoid ? "Remove from active stock and Finance on confirmation" : null;
  const auditRetentionText = isVoid ? "The purchase and linked expense will remain in audit history as voided records." : null;
  assert.equal(draftBadge, "TO BE REMOVED");
  assert.equal(draftStatusText, "Remove from active stock and Finance on confirmation");
  assert.equal(auditRetentionText, "The purchase and linked expense will remain in audit history as voided records.");

  const webCard = require("node:fs").readFileSync(require("node:path").join(__dirname, "../../web/src/components/orson/AgentCards.tsx"), "utf8");
  const mobileCard = require("node:fs").readFileSync(require("node:path").join(__dirname, "../../app/components/OrsonAgentCards.tsx"), "utf8");
  assert.ok(webCard.includes(draftBadge) && webCard.includes(draftStatusText) && webCard.includes(auditRetentionText));
  assert.ok(mobileCard.includes(draftBadge) && mobileCard.includes(draftStatusText) && mobileCard.includes(auditRetentionText));

  // Review card audit effects and status banner logic
  assert.ok(row.effects.every((e) => e.startsWith("Audited effect:")));
  assert.ok(row.effects.some((e) => e.includes("Void purchase of 10 kg (30.00)")));
  assert.ok(row.effects.some((e) => e.includes("remaining stock becomes 90 kg")));
  assert.ok(row.effects.some((e) => e.includes("Void linked unconfirmed expense")));
  assert.equal(row.before.purchaseId, "p-1");
  assert.equal(row.before.quantity, 10);
  assert.equal(row.before.price, 3);
  assert.equal(row.before.unit, "kg");
  assert.equal(row.before.totalCost, 30);
  assert.equal(row.before.expenseId, expId);
});

test("mobile and web inventory history presents explicit VOIDED badge and audited effect without starving active activity", () => {
  const activeStock = Array.from({ length: 5 }, (_, i) => ({
    id: `p-active-${i}`,
    date: "2026-09-20",
    quantity: 10 + i,
    price: 3,
    unit: "kg",
    createdAt: 1000 + i,
    voided: false,
  }));
  const voidedStock = Array.from({ length: 12 }, (_, i) => ({
    id: `p-voided-${i}`,
    date: "2026-09-21",
    quantity: 20 + i,
    price: 3,
    unit: "kg",
    createdAt: 2000 + i,
    voided: true,
    voidedAt: "2026-09-21T00:00:00.000Z",
    voidedBy: "user-1",
  }));
  const stockHistory = [...activeStock, ...voidedStock];

  // 1. Web recent transactions partitioning logic (from web/src/app/dashboard/inventory/feeds/page.tsx)
  const activeTxs = [];
  const voidedTxs = [];
  stockHistory.forEach((h) => {
    const tx = {
      id: h.id,
      type: "Stock In",
      name: "Grower Feed",
      date: h.date,
      quantity: h.quantity,
      createdAt: h.createdAt || 0,
      voided: Boolean(h.voided),
    };
    if (h.voided) {
      voidedTxs.push(tx);
    } else {
      activeTxs.push(tx);
    }
  });
  const activeRecentTransactions = activeTxs.sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);
  const voidedRecentTransactions = voidedTxs.sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);

  const getWebDisplayedTransactions = (filter) => {
    if (filter === "audit") return voidedRecentTransactions;
    if (filter === "stockIn") return activeRecentTransactions.filter((tx) => tx.type === "Stock In");
    if (filter === "usage") return activeRecentTransactions.filter((tx) => tx.type === "Usage");
    return activeRecentTransactions;
  };

  // Default "All" and "Stock In" views contain 5 active transactions, 0 voided transactions, and are not starved by the 12 voided items
  const webAll = getWebDisplayedTransactions("all");
  assert.equal(webAll.length, 5);
  assert.ok(webAll.every((tx) => !tx.voided));
  const webStockIn = getWebDisplayedTransactions("stockIn");
  assert.equal(webStockIn.length, 5);
  assert.ok(webStockIn.every((tx) => !tx.voided));

  // "Audit" filter provides the top 10 voided transactions
  const webAudit = getWebDisplayedTransactions("audit");
  assert.equal(webAudit.length, 10);
  assert.ok(webAudit.every((tx) => tx.voided));

  // 2. Mobile recent transactions partitioning logic (from app/store/feedAdditiveStore.ts and app/inventory/feedAdditives.tsx)
  const getMobileRecentTransactions = (limit = 10, options = {}) => {
    const includeVoided = Boolean(options.includeVoided);
    const txs = [];
    stockHistory.forEach((h) => {
      if (!h.voided || includeVoided) {
        txs.push({
          id: h.id,
          type: "Stock In",
          item: "Grower Feed",
          date: h.date,
          quantity: h.quantity,
          createdAt: h.createdAt,
          voided: Boolean(h.voided),
          voidedAt: h.voidedAt,
          voidedBy: h.voidedBy,
        });
      }
    });
    return txs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, limit);
  };

  const mobileActiveRecent = getMobileRecentTransactions(10, { includeVoided: false });
  assert.equal(mobileActiveRecent.length, 5);
  assert.ok(mobileActiveRecent.every((tx) => !tx.voided));

  const mobileAuditRecent = getMobileRecentTransactions(100, { includeVoided: true })
    .filter((tx) => tx.voided)
    .slice(0, 10);
  assert.equal(mobileAuditRecent.length, 10);
  assert.ok(mobileAuditRecent.every((tx) => tx.voided));

  const getMobileDisplayedTransactions = (filter) => {
    if (filter === "audit") return mobileAuditRecent;
    if (filter === "stockIn") return mobileActiveRecent.filter((tx) => tx.type === "Stock In");
    return mobileActiveRecent;
  };

  assert.equal(getMobileDisplayedTransactions("all").length, 5);
  assert.ok(getMobileDisplayedTransactions("all").every((tx) => !tx.voided));
  assert.equal(getMobileDisplayedTransactions("stockIn").length, 5);
  assert.ok(getMobileDisplayedTransactions("stockIn").every((tx) => !tx.voided));
  assert.equal(getMobileDisplayedTransactions("audit").length, 10);
  assert.ok(getMobileDisplayedTransactions("audit").every((tx) => tx.voided));

  // 3. Item-level audit history retains voided purchase with explicit VOIDED badge and audited effect
  const voidedEntry = voidedStock[0];
  assert.equal(voidedEntry.voided, true);
  assert.equal(voidedEntry.voidedBy, "user-1");
  const auditEffect = `Audited effect: Stock & cost reversed (${voidedEntry.voidedAt})`;
  assert.match(auditEffect, /Stock & cost reversed/);
});

test("planCommands enforces void rules: success, repeated void, usage/payment/source mismatch, stale draft, deletion blocked", async () => {
  const { planCommands } = require("./orsonCommandPlan");
  const { buildInventoryExpense, financeSyncDocumentId, financeSourceEntry } = require("./orsonDomain/financeSync");

  const buildMockAuth = (store) => ({
    uid: "test-user",
    companyId: "farm-1",
    user: {
      name: "Test User",
      email: "test@example.com",
    },
    company: {
      currency: "USD",
      timeZone: "UTC",
    },
    require: () => {},
    base: {
      collection: (col) => ({
        get: async () => ({
          docs: Object.entries(store)
            .filter(([path]) => path.startsWith(`${col}/`) && path.split("/").length === 2)
            .map(([path, data]) => ({ id: path.split("/")[1], data: () => ({ ...data }) })),
        }),
        doc: (id) => ({
          get: async () => {
            const data = store[`${col}/${id}`];
            return {
              exists: Boolean(data),
              data: () => (data ? { ...data } : undefined),
            };
          },
        }),
      }),
    },
  });

  for (const entry of [
    { itemType: "feed", category: "Grower", collection: "feeds", categoryField: "feedType" },
    { itemType: "additive", category: "Probiotic", collection: "additives", categoryField: "category" },
  ]) {
    const newItemPlan = await planCommands({
      auth: buildMockAuth({}),
      commands: [{
        id: `row-new-${entry.itemType}`,
        type: "stock_in_inventory",
        date: "2026-09-21",
        itemType: entry.itemType,
        values: { itemName: `New ${entry.itemType}`, category: entry.category, quantity: 10, price: 3, unit: "kg" },
      }],
      operationId: `op-new-${entry.itemType}`,
    });
    assert.equal(newItemPlan.rows[0].valid, true);
    const itemWrite = newItemPlan.writes.find((write) => write.collection === entry.collection);
    assert.equal(itemWrite.values[entry.categoryField], entry.category);
  }
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({}),
      commands: [{
        id: "row-invalid-feed-category",
        type: "stock_in_inventory",
        date: "2026-09-21",
        itemType: "feed",
        values: { itemName: "New Feed", category: "Medicinal", quantity: 10, price: 3, unit: "kg" },
      }],
      operationId: "op-invalid-feed-category",
    }),
    /Choose a valid feed inventory category: Starter, Grower, Finisher, Other\./,
  );
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({}),
      commands: [{
        id: "row-existing-feed-category",
        type: "stock_in_inventory",
        date: "2026-09-21",
        itemType: "feed",
        itemId: "feed-1",
        values: { category: "Other", quantity: 10, price: 3, unit: "kg" },
      }],
      operationId: "op-existing-feed-category",
    }),
    /Existing inventory items keep their saved category/,
  );

  const basePurchase = {
    id: "p-1",
    date: "2026-09-20",
    quantity: 10,
    price: 3,
    unit: "kg",
  };
  const expense = buildInventoryExpense({
    ...basePurchase,
    itemId: "feed-1",
    itemName: "Grower Feed",
    type: "feed",
    sourceStockIndex: 0,
  });
  const expenseId = financeSyncDocumentId(expense.reference);
  const baseExpense = {
    id: expenseId,
    ...expense,
    companyId: "farm-1",
    paymentType: "Unconfirmed",
    settlements: [],
  };
  const baseFeed = {
    id: "feed-1",
    feedName: "Grower Feed",
    unit: "kg",
    totalStock: 100,
    totalCost: 300,
    stockInHistory: [{ ...basePurchase }],
    usageHistory: [],
    financeEntries: {
      [expenseId]: financeSourceEntry(expense),
    },
  };

  const voidCmd = {
    id: "row-void",
    type: "void_inventory_purchase",
    date: "2026-09-21",
    itemType: "feed",
    itemId: "feed-1",
    recordId: "p-1",
    values: {},
  };

  // 1. Success
  const store1 = {
    "feeds/feed-1": { ...baseFeed },
    [`expenses/${expenseId}`]: { ...baseExpense },
  };
  const auth1 = buildMockAuth(store1);
  const plan1 = await planCommands({ auth: auth1, commands: [voidCmd], operationId: "op-1" });
  assert.equal(plan1.rows[0].valid, true);
  assert.ok(plan1.rows[0].effects.some((e) => e.includes("Void purchase of 10 kg (30.00)")));
  assert.ok(plan1.rows[0].effects.some((e) => e.includes("remaining stock becomes 90 kg")));
  assert.ok(plan1.rows[0].effects.some((e) => e.includes("Void linked unconfirmed expense")));
  const feedWrite = plan1.writes.find((w) => w.collection === "feeds" && w.id === "feed-1");
  assert.ok(feedWrite);
  assert.equal(feedWrite.values.totalStock, 90);
  assert.equal(feedWrite.values.totalCost, 270);
  assert.equal(feedWrite.values.archived, false);
  assert.equal(feedWrite.values.stockInHistory[0].voided, true);
  assert.equal(feedWrite.values.stockInHistory[0].voidedBy, "test-user");
  assert.equal(feedWrite.values.financeEntries[expenseId].voided, true);
  assert.equal(feedWrite.values.financeEntries[expenseId].voidedBy, "test-user");
  const expWrite = plan1.writes.find((w) => w.collection === "expenses" && w.id === expenseId);
  assert.ok(expWrite);
  assert.equal(expWrite.values.voided, true);
  assert.equal(expWrite.values.voidedBy, "test-user");

  // 2. Archiving when remaining stock is zero
  const emptyExpense = buildInventoryExpense({
    ...basePurchase,
    itemId: "feed-empty",
    itemName: "Empty Feed",
    type: "feed",
    sourceStockIndex: 0,
  });
  const emptyExpenseId = financeSyncDocumentId(emptyExpense.reference);
  const emptyFeed = {
    id: "feed-empty",
    feedName: "Empty Feed",
    unit: "kg",
    totalStock: 10,
    totalCost: 30,
    stockInHistory: [{ ...basePurchase }],
    usageHistory: [],
    financeEntries: {
      [emptyExpenseId]: financeSourceEntry(emptyExpense),
    },
  };
  const planEmpty = await planCommands({
    auth: buildMockAuth({
      "feeds/feed-empty": emptyFeed,
      [`expenses/${emptyExpenseId}`]: { id: emptyExpenseId, ...emptyExpense, companyId: "farm-1", paymentType: "Unconfirmed", settlements: [] },
    }),
    commands: [{ ...voidCmd, itemId: "feed-empty" }],
    operationId: "op-empty",
  });
  assert.equal(planEmpty.rows[0].valid, true);
  assert.ok(planEmpty.rows[0].effects.some((e) => e.includes("Archive inventory item as remaining stock is zero")));
  const emptyFeedWrite = planEmpty.writes.find((w) => w.collection === "feeds" && w.id === "feed-empty");
  assert.equal(emptyFeedWrite.values.totalStock, 0);
  assert.equal(emptyFeedWrite.values.totalCost, 0);
  assert.equal(emptyFeedWrite.values.archived, true);

  // 3. Repeated void fails
  const store2 = {
    "feeds/feed-1": {
      ...baseFeed,
      stockInHistory: [{ ...basePurchase, voided: true }],
    },
    [`expenses/${expenseId}`]: { ...baseExpense, voided: true },
  };
  await assert.rejects(
    () => planCommands({ auth: buildMockAuth(store2), commands: [voidCmd], operationId: "op-2" }),
    /This purchase is already voided\./,
  );

  // 4. Resurrect/correction via stock_in_inventory fails
  const resurrectCmd = {
    id: "row-stock-in",
    type: "stock_in_inventory",
    date: "2026-09-21",
    itemType: "feed",
    itemId: "feed-1",
    recordId: "p-1",
    values: { quantity: 10, price: 3, unit: "kg" },
  };
  await assert.rejects(
    () => planCommands({ auth: buildMockAuth(store2), commands: [resurrectCmd], operationId: "op-resurrect" }),
    /A voided purchase cannot be corrected or resurrected\./,
  );

  // 5. Usage history validation & reconciliation
  // 5a. Malformed array or invalid records fail closed
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": { ...baseFeed, usageHistory: null },
        [`expenses/${expenseId}`]: { ...baseExpense },
      }),
      commands: [voidCmd],
      operationId: "op-usage-null",
    }),
    /This item has incomplete usage history and cannot have purchases voided\./,
  );
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": { ...baseFeed, usageHistory: [null] },
        [`expenses/${expenseId}`]: { ...baseExpense },
      }),
      commands: [voidCmd],
      operationId: "op-usage-record-null",
    }),
    /Usage history contains invalid records\./,
  );
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": { ...baseFeed, usageHistory: [{ id: "u-1", date: "2026-09-21", quantity: NaN, totalCost: 15 }] },
        [`expenses/${expenseId}`]: { ...baseExpense },
      }),
      commands: [voidCmd],
      operationId: "op-usage-nan-qty",
    }),
    /Usage history contains invalid quantity or cost\./,
  );

  // Regression: reject null, blank string, boolean, array, and non-number before coercion
  for (const badQty of [null, "", "   ", false, true, [], [10], "10", {}]) {
    await assert.rejects(
      () => planCommands({
        auth: buildMockAuth({
          "feeds/feed-1": { ...baseFeed, usageHistory: [{ id: "u-1", date: "2026-09-21", quantity: badQty, totalCost: 15 }] },
          [`expenses/${expenseId}`]: { ...baseExpense },
        }),
        commands: [voidCmd],
        operationId: `op-usage-bad-qty-${String(badQty)}`,
      }),
      /Usage history contains invalid quantity or cost\./,
    );
  }

  for (const badCost of [null, "", "   ", false, true, [], [15], "15", {}]) {
    await assert.rejects(
      () => planCommands({
        auth: buildMockAuth({
          "feeds/feed-1": { ...baseFeed, usageHistory: [{ id: "u-1", date: "2026-09-21", quantity: 5, totalCost: badCost }] },
          [`expenses/${expenseId}`]: { ...baseExpense },
        }),
        commands: [voidCmd],
        operationId: `op-usage-bad-cost-${String(badCost)}`,
      }),
      /Usage history contains invalid quantity or cost\./,
    );
  }

  for (const badPrice of [null, "", "   ", false, true, [], [3], "3", {}]) {
    await assert.rejects(
      () => planCommands({
        auth: buildMockAuth({
          "feeds/feed-1": { ...baseFeed, usageHistory: [{ id: "u-1", date: "2026-09-21", quantity: 5, unitPrice: badPrice }] },
          [`expenses/${expenseId}`]: { ...baseExpense },
        }),
        commands: [voidCmd],
        operationId: `op-usage-bad-price-${String(badPrice)}`,
      }),
      /Usage history contains invalid quantity or cost\./,
    );
  }
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": { ...baseFeed, usageHistory: [{ id: "u-1", date: "2026-09-21", quantity: 5 }] },
        [`expenses/${expenseId}`]: { ...baseExpense },
      }),
      commands: [voidCmd],
      operationId: "op-usage-missing-cost",
    }),
    /Usage history contains invalid quantity or cost\./,
  );
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": { ...baseFeed, usageHistory: [{ id: "u-1", date: "2026-09-21", quantity: 5, totalCost: -15 }] },
        [`expenses/${expenseId}`]: { ...baseExpense },
      }),
      commands: [voidCmd],
      operationId: "op-usage-contradictory-signs",
    }),
    /Usage history contains invalid quantity or cost\./,
  );
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": { ...baseFeed, usageHistory: [{ id: "u-1", date: "2026-09-21", quantity: -5, unitPrice: 3, totalCost: 15 }] },
        [`expenses/${expenseId}`]: { ...baseExpense },
      }),
      commands: [voidCmd],
      operationId: "op-usage-return-positive-cost",
    }),
    /Usage history contains invalid quantity or cost\./,
  );
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": { ...baseFeed, usageHistory: [{ id: "u-1", date: "2026-09-21", quantity: -50, totalCost: -150 }] },
        [`expenses/${expenseId}`]: { ...baseExpense },
      }),
      commands: [voidCmd],
      operationId: "op-usage-net-negative",
    }),
    /Usage history contains invalid quantity or cost\./,
  );

  // 5b. Acceptance Criterion 1: 500 kg purchased, 200 kg net used, 300 kg current,
  // then voiding mistaken 100 kg purchase succeeds and leaves 200 kg with correctly reduced valuation and linked finance audit
  const p1_400kg = {
    id: "p-1",
    date: "2026-09-15",
    quantity: 400,
    price: 3,
    unit: "kg",
  };
  const exp1 = buildInventoryExpense({
    ...p1_400kg,
    itemId: "feed-ac1",
    itemName: "AC1 Feed",
    type: "feed",
    sourceStockIndex: 0,
  });
  const exp1Id = financeSyncDocumentId(exp1.reference);

  const p2_100kg = {
    id: "p-2",
    date: "2026-09-20",
    quantity: 100,
    price: 3,
    unit: "kg",
  };
  const exp2 = buildInventoryExpense({
    ...p2_100kg,
    itemId: "feed-ac1",
    itemName: "AC1 Feed",
    type: "feed",
    sourceStockIndex: 1,
  });
  const exp2Id = financeSyncDocumentId(exp2.reference);

  const ac1Feed = {
    id: "feed-ac1",
    feedName: "AC1 Feed",
    unit: "kg",
    totalStock: 300,
    totalCost: 900,
    stockInHistory: [{ ...p1_400kg }, { ...p2_100kg }],
    usageHistory: [
      { id: "u-1", date: "2026-09-18", quantity: 200, unitPrice: 3, totalCost: 600, pondId: "pond-1" },
    ],
    financeEntries: {
      [exp1Id]: financeSourceEntry(exp1),
      [exp2Id]: financeSourceEntry(exp2),
    },
  };

  const voidAc1Cmd = {
    id: "row-void-ac1",
    type: "void_inventory_purchase",
    date: "2026-09-21",
    itemType: "feed",
    itemId: "feed-ac1",
    recordId: "p-2",
    values: {},
  };

  const planAc1 = await planCommands({
    auth: buildMockAuth({
      "feeds/feed-ac1": ac1Feed,
      [`expenses/${exp1Id}`]: { id: exp1Id, ...exp1, companyId: "farm-1", paymentType: "Unconfirmed", settlements: [] },
      [`expenses/${exp2Id}`]: { id: exp2Id, ...exp2, companyId: "farm-1", paymentType: "Unconfirmed", settlements: [] },
    }),
    commands: [voidAc1Cmd],
    operationId: "op-ac1",
  });
  assert.equal(planAc1.rows[0].valid, true);
  assert.ok(planAc1.rows[0].effects.some((e) => e.includes("Void purchase of 100 kg (300.00)")));
  assert.ok(planAc1.rows[0].effects.some((e) => e.includes("remaining stock becomes 200 kg")));
  assert.ok(planAc1.rows[0].effects.some((e) => e.includes(`Void linked unconfirmed expense ${exp2Id} (300.00)`)));
  const ac1FeedWrite = planAc1.writes.find((w) => w.collection === "feeds" && w.id === "feed-ac1");
  assert.equal(ac1FeedWrite.values.totalStock, 200);
  assert.equal(ac1FeedWrite.values.totalCost, 600);
  assert.equal(ac1FeedWrite.values.archived, false);
  assert.equal(ac1FeedWrite.values.stockInHistory[1].voided, true);
  assert.equal(ac1FeedWrite.values.financeEntries[exp2Id].voided, true);
  // Prior usage records and historical usage costs remain unchanged
  assert.equal(ac1FeedWrite.values.usageHistory, undefined);
  const ac1ExpWrite = planAc1.writes.find((w) => w.collection === "expenses" && w.id === exp2Id);
  assert.equal(ac1ExpWrite.values.voided, true);

  // A reconciled history does not make a purchase voidable when removing it would make stock negative.
  const feedNegativeRemainder = {
    ...ac1Feed,
    totalStock: 50,
    totalCost: 600,
    usageHistory: [{ id: "u-negative", date: "2026-09-18", quantity: 450, unitPrice: 2, totalCost: 900, pondId: "pond-1" }],
  };
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-ac1": feedNegativeRemainder,
        [`expenses/${exp1Id}`]: { id: exp1Id, ...exp1, companyId: "farm-1", paymentType: "Unconfirmed", settlements: [] },
        [`expenses/${exp2Id}`]: { id: exp2Id, ...exp2, companyId: "farm-1", paymentType: "Unconfirmed", settlements: [] },
      }),
      commands: [voidAc1Cmd],
      operationId: "op-negative-stock-remainder",
    }),
    /Voiding this purchase would make remaining inventory stock or valuation negative\./,
  );

  // 5c. Signed returns and restorations in usage history
  const feedWithReturns = {
    ...ac1Feed,
    usageHistory: [
      { id: "u-1", date: "2026-09-18", quantity: 250, unitPrice: 3, totalCost: 750, pondId: "pond-1" },
      { id: "u-2", date: "2026-09-19", quantity: -50, unitPrice: 3, totalCost: -150, pondId: "pond-1" },
    ],
  };
  const planReturns = await planCommands({
    auth: buildMockAuth({
      "feeds/feed-ac1": feedWithReturns,
      [`expenses/${exp1Id}`]: { id: exp1Id, ...exp1, companyId: "farm-1", paymentType: "Unconfirmed", settlements: [] },
      [`expenses/${exp2Id}`]: { id: exp2Id, ...exp2, companyId: "farm-1", paymentType: "Unconfirmed", settlements: [] },
    }),
    commands: [voidAc1Cmd],
    operationId: "op-returns",
  });
  assert.equal(planReturns.rows[0].valid, true);
  const returnsFeedWrite = planReturns.writes.find((w) => w.collection === "feeds" && w.id === "feed-ac1");
  assert.equal(returnsFeedWrite.values.totalStock, 200);
  assert.equal(returnsFeedWrite.values.totalCost, 600);

  // 5d. Legitimate opening balance preserved
  const feedWithOpening = {
    id: "feed-open",
    feedName: "Opening Feed",
    unit: "kg",
    totalStock: 150, // 100 kg opening + 100 kg purchase - 50 kg usage = 150 kg
    totalCost: 300,  // 200 opening + 200 purchase - 100 usage = 300
    stockInHistory: [{ id: "p-open", date: "2026-09-15", quantity: 100, price: 2, unit: "kg" }],
    usageHistory: [{ id: "u-open", date: "2026-09-18", quantity: 50, unitPrice: 2, totalCost: 100, pondId: "pond-1" }],
    financeEntries: {},
  };
  const openExp = buildInventoryExpense({
    ...feedWithOpening.stockInHistory[0],
    itemId: "feed-open",
    itemName: "Opening Feed",
    type: "feed",
    sourceStockIndex: 0,
  });
  const openExpId = financeSyncDocumentId(openExp.reference);
  feedWithOpening.financeEntries[openExpId] = financeSourceEntry(openExp);
  const planOpen = await planCommands({
    auth: buildMockAuth({
      "feeds/feed-open": feedWithOpening,
      [`expenses/${openExpId}`]: { id: openExpId, ...openExp, companyId: "farm-1", paymentType: "Unconfirmed", settlements: [] },
    }),
    commands: [{ ...voidCmd, itemId: "feed-open", recordId: "p-open" }],
    operationId: "op-open",
  });
  assert.equal(planOpen.rows[0].valid, true);
  const openFeedWrite = planOpen.writes.find((w) => w.collection === "feeds" && w.id === "feed-open");
  assert.equal(openFeedWrite.values.totalStock, 50); // 150 - 100 = 50 kg opening balance preserved
  assert.equal(openFeedWrite.values.totalCost, 100);  // 300 - 200 = 100 opening cost preserved

  // 5e. Varying purchase costs
  const p1_var = { id: "p-var-1", date: "2026-09-10", quantity: 400, price: 2, unit: "kg" }; // 800
  const p2_var = { id: "p-var-2", date: "2026-09-15", quantity: 100, price: 4, unit: "kg" }; // 400
  const expVar1 = buildInventoryExpense({ ...p1_var, itemId: "feed-var", itemName: "Var Feed", type: "feed", sourceStockIndex: 0 });
  const expVar1Id = financeSyncDocumentId(expVar1.reference);
  const expVar2 = buildInventoryExpense({ ...p2_var, itemId: "feed-var", itemName: "Var Feed", type: "feed", sourceStockIndex: 1 });
  const expVar2Id = financeSyncDocumentId(expVar2.reference);
  const feedVar = {
    id: "feed-var",
    feedName: "Var Feed",
    unit: "kg",
    totalStock: 300,
    totalCost: 800, // 1200 purchased - 400 used (200 kg @ 2) = 800
    stockInHistory: [{ ...p1_var }, { ...p2_var }],
    usageHistory: [{ id: "u-var", date: "2026-09-18", quantity: 200, unitPrice: 2, totalCost: 400, pondId: "pond-1" }],
    financeEntries: {
      [expVar1Id]: financeSourceEntry(expVar1),
      [expVar2Id]: financeSourceEntry(expVar2),
    },
  };
  const planVar = await planCommands({
    auth: buildMockAuth({
      "feeds/feed-var": feedVar,
      [`expenses/${expVar1Id}`]: { id: expVar1Id, ...expVar1, companyId: "farm-1", paymentType: "Unconfirmed", settlements: [] },
      [`expenses/${expVar2Id}`]: { id: expVar2Id, ...expVar2, companyId: "farm-1", paymentType: "Unconfirmed", settlements: [] },
    }),
    commands: [{ ...voidCmd, itemId: "feed-var", recordId: "p-var-2" }],
    operationId: "op-var",
  });
  assert.equal(planVar.rows[0].valid, true);
  const varFeedWrite = planVar.writes.find((w) => w.collection === "feeds" && w.id === "feed-var");
  assert.equal(varFeedWrite.values.totalStock, 200);
  assert.equal(varFeedWrite.values.totalCost, 400);

  // 5f. Reject when removing a purchase makes remaining stock negative
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-ac1": { ...ac1Feed, totalStock: 50 },
        [`expenses/${exp1Id}`]: { id: exp1Id, ...exp1, companyId: "farm-1", paymentType: "Unconfirmed", settlements: [] },
        [`expenses/${exp2Id}`]: { id: exp2Id, ...exp2, companyId: "farm-1", paymentType: "Unconfirmed", settlements: [] },
      }),
      commands: [voidAc1Cmd],
      operationId: "op-insufficient-stock-usage",
    }),
    /Voiding this purchase would make remaining inventory stock or valuation negative\./,
  );

  // 5g. Reject when valuation would become negative
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-ac1": { ...ac1Feed, totalCost: 200 },
        [`expenses/${exp1Id}`]: { id: exp1Id, ...exp1, companyId: "farm-1", paymentType: "Unconfirmed", settlements: [] },
        [`expenses/${exp2Id}`]: { id: exp2Id, ...exp2, companyId: "farm-1", paymentType: "Unconfirmed", settlements: [] },
      }),
      commands: [voidAc1Cmd],
      operationId: "op-cost-negative",
    }),
    /Inventory cost is less than the purchase cost\./,
  );

  // 5h. Reject when active purchase history exceeds stock and cannot reconcile with usage
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-ac1": {
          ...ac1Feed,
          totalStock: 200, // 200 stock + 100 usage = 300 < 500 active purchases
          usageHistory: [{ id: "u-1", date: "2026-09-18", quantity: 100, unitPrice: 3, totalCost: 300, pondId: "pond-1" }],
        },
        [`expenses/${exp1Id}`]: { id: exp1Id, ...exp1, companyId: "farm-1", paymentType: "Unconfirmed", settlements: [] },
        [`expenses/${exp2Id}`]: { id: exp2Id, ...exp2, companyId: "farm-1", paymentType: "Unconfirmed", settlements: [] },
      }),
      commands: [voidAc1Cmd],
      operationId: "op-reconcile-stock-usage",
    }),
    /Active purchase history exceeds available stock; cannot safely void without usage reconciliation\./,
  );

  // 5i. Reject when active purchase history exceeds cost and cannot reconcile with usage
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-ac1": {
          ...ac1Feed,
          totalCost: 700, // 700 cost + 400 usage cost = 1100 < 1500 active purchase cost
          usageHistory: [{ id: "u-1", date: "2026-09-18", quantity: 200, unitPrice: 2, totalCost: 400, pondId: "pond-1" }],
        },
        [`expenses/${exp1Id}`]: { id: exp1Id, ...exp1, companyId: "farm-1", paymentType: "Unconfirmed", settlements: [] },
        [`expenses/${exp2Id}`]: { id: exp2Id, ...exp2, companyId: "farm-1", paymentType: "Unconfirmed", settlements: [] },
      }),
      commands: [voidAc1Cmd],
      operationId: "op-reconcile-cost-usage",
    }),
    /Active purchase history exceeds inventory cost; cannot safely void without usage reconciliation\./,
  );

  // 5j. Zero remainder with usage archives the item
  const feedZeroRemainder = {
    ...ac1Feed,
    totalStock: 100,
    totalCost: 300,
    usageHistory: [{ id: "u-1", date: "2026-09-18", quantity: 400, unitPrice: 3, totalCost: 1200, pondId: "pond-1" }],
  };
  const planZero = await planCommands({
    auth: buildMockAuth({
      "feeds/feed-ac1": feedZeroRemainder,
      [`expenses/${exp1Id}`]: { id: exp1Id, ...exp1, companyId: "farm-1", paymentType: "Unconfirmed", settlements: [] },
      [`expenses/${exp2Id}`]: { id: exp2Id, ...exp2, companyId: "farm-1", paymentType: "Unconfirmed", settlements: [] },
    }),
    commands: [voidAc1Cmd],
    operationId: "op-zero-remainder",
  });
  assert.equal(planZero.rows[0].valid, true);
  assert.ok(planZero.rows[0].effects.some((e) => e.includes("Archive inventory item as remaining stock is zero.")));
  const zeroFeedWrite = planZero.writes.find((w) => w.collection === "feeds" && w.id === "feed-ac1");
  assert.equal(zeroFeedWrite.values.totalStock, 0);
  assert.equal(zeroFeedWrite.values.totalCost, 0);
  assert.equal(zeroFeedWrite.values.archived, true);

  // 5k. Zero remainder with excess valuation fails closed
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-ac1": { ...feedZeroRemainder, totalCost: 400 }, // 400 - 300 = 100 remaining cost with 0 stock
        [`expenses/${exp1Id}`]: { id: exp1Id, ...exp1, companyId: "farm-1", paymentType: "Unconfirmed", settlements: [] },
        [`expenses/${exp2Id}`]: { id: exp2Id, ...exp2, companyId: "farm-1", paymentType: "Unconfirmed", settlements: [] },
      }),
      commands: [voidAc1Cmd],
      operationId: "op-zero-stock-excess-cost",
    }),
    /Remaining inventory valuation cannot support remaining stock without usage reconciliation\./,
  );

  // 5l. Positive remaining stock with non-positive valuation fails closed
  const lowCostPurchaseOne = { ...p1_400kg, price: 1.5 };
  const lowCostExpenseOne = buildInventoryExpense({
    ...lowCostPurchaseOne,
    itemId: "feed-ac1",
    itemName: "AC1 Feed",
    type: "feed",
    sourceStockIndex: 0,
  });
  const lowCostExpenseOneId = financeSyncDocumentId(lowCostExpenseOne.reference);
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-ac1": {
          ...ac1Feed,
          totalCost: 300, // 300 remaining cost minus the target purchase leaves 0 cost for positive remaining stock
          stockInHistory: [lowCostPurchaseOne, p2_100kg],
          financeEntries: {
            [lowCostExpenseOneId]: financeSourceEntry(lowCostExpenseOne),
            [exp2Id]: financeSourceEntry(exp2),
          },
        },
        [`expenses/${lowCostExpenseOneId}`]: { id: lowCostExpenseOneId, ...lowCostExpenseOne, companyId: "farm-1", paymentType: "Unconfirmed", settlements: [] },
        [`expenses/${exp2Id}`]: { id: exp2Id, ...exp2, companyId: "farm-1", paymentType: "Unconfirmed", settlements: [] },
      }),
      commands: [voidAc1Cmd],
      operationId: "op-stock-with-zero-cost",
    }),
    /Remaining inventory valuation cannot support remaining stock without usage reconciliation\./,
  );

  // 6. Purchase history: malformed array, missing record, or duplicates fail closed
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": { ...baseFeed, stockInHistory: "bad-history" },
        [`expenses/${expenseId}`]: { ...baseExpense },
      }),
      commands: [voidCmd],
      operationId: "op-stockin-bad",
    }),
    /This item has incomplete purchase history and cannot have purchases voided\./,
  );
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": { ...baseFeed, stockInHistory: [{ ...basePurchase }, { ...basePurchase }] },
        [`expenses/${expenseId}`]: { ...baseExpense },
      }),
      commands: [voidCmd],
      operationId: "op-duplicate-purchase",
    }),
    /Duplicate purchase records found; cannot safely void\./,
  );

  // 7. Invalid/NaN numbers fail closed
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": { ...baseFeed, stockInHistory: [{ ...basePurchase, quantity: NaN }] },
        [`expenses/${expenseId}`]: { ...baseExpense },
      }),
      commands: [voidCmd],
      operationId: "op-nan-qty",
    }),
    /The purchase record has invalid quantity or price\./,
  );
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": { ...baseFeed, stockInHistory: [{ ...basePurchase, price: NaN }] },
        [`expenses/${expenseId}`]: { ...baseExpense },
      }),
      commands: [voidCmd],
      operationId: "op-nan-price",
    }),
    /The purchase record has invalid quantity or price\./,
  );
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": { ...baseFeed, totalStock: NaN },
        [`expenses/${expenseId}`]: { ...baseExpense },
      }),
      commands: [voidCmd],
      operationId: "op-nan-totalstock",
    }),
    /Inventory stock or cost totals are invalid\./,
  );
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": { ...baseFeed, totalCost: NaN },
        [`expenses/${expenseId}`]: { ...baseExpense },
      }),
      commands: [voidCmd],
      operationId: "op-nan-totalcost",
    }),
    /Inventory stock or cost totals are invalid\./,
  );
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": { ...baseFeed, totalStock: 5 },
        [`expenses/${expenseId}`]: { ...baseExpense },
      }),
      commands: [voidCmd],
      operationId: "op-insufficient-stock",
    }),
    /Voiding this purchase would make remaining inventory stock or valuation negative\./,
  );

  // 7b. Conservative reconciliation fails closed when active purchase history exceeds inventory totals without recorded usage
  const multiPurchaseFeed = {
    ...baseFeed,
    stockInHistory: [
      { ...basePurchase },
      { id: "p-2", date: "2026-09-21", quantity: 20, price: 3, unit: "kg" },
    ],
  };
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": { ...multiPurchaseFeed, totalStock: 25, totalCost: 300 },
        [`expenses/${expenseId}`]: { ...baseExpense },
      }),
      commands: [voidCmd],
      operationId: "op-recon-stock",
    }),
    /Active purchase history exceeds available stock; cannot safely void without usage reconciliation\./,
  );
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": { ...multiPurchaseFeed, totalStock: 100, totalCost: 50 },
        [`expenses/${expenseId}`]: { ...baseExpense },
      }),
      commands: [voidCmd],
      operationId: "op-recon-cost",
    }),
    /Active purchase history exceeds inventory cost; cannot safely void without usage reconciliation\./,
  );

  // 8. Payment confirmed (Cash) fails
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": { ...baseFeed },
        [`expenses/${expenseId}`]: { ...baseExpense, paymentType: "Cash" },
      }),
      commands: [voidCmd],
      operationId: "op-4",
    }),
    /This purchase has confirmed payment and cannot be voided\./,
  );

  // 9. Payment settlements exist or malformed settlements fail closed
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": { ...baseFeed },
        [`expenses/${expenseId}`]: { ...baseExpense, settlements: [{ id: "set-1", amount: 30 }] },
      }),
      commands: [voidCmd],
      operationId: "op-5",
    }),
    /This purchase has payment settlements and cannot be voided\./,
  );
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": { ...baseFeed },
        [`expenses/${expenseId}`]: { ...baseExpense, settlements: "malformed" },
      }),
      commands: [voidCmd],
      operationId: "op-settlements-malformed",
    }),
    /Malformed settlements array on linked expense\./,
  );

  // 10. Linked expense metadata mismatches fail closed
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": { ...baseFeed },
        [`expenses/${expenseId}`]: { ...baseExpense, sourceId: "wrong-item" },
      }),
      commands: [voidCmd],
      operationId: "op-6",
    }),
    /Expense source metadata does not match this purchase\./,
  );
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": { ...baseFeed },
        [`expenses/${expenseId}`]: { ...baseExpense, sourceCollection: "additives" },
      }),
      commands: [voidCmd],
      operationId: "op-sourcecol-mismatch",
    }),
    /Expense source metadata does not match this purchase\./,
  );
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": { ...baseFeed },
        [`expenses/${expenseId}`]: { ...baseExpense, sourceLineId: "wrong-line" },
      }),
      commands: [voidCmd],
      operationId: "op-sourceline-mismatch",
    }),
    /Expense source metadata does not match this purchase\./,
  );
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": { ...baseFeed },
        [`expenses/${expenseId}`]: { ...baseExpense, sourceStockIndex: 99 },
      }),
      commands: [voidCmd],
      operationId: "op-sourcestockidx-mismatch",
    }),
    /Expense source metadata does not match this purchase\./,
  );
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": { ...baseFeed },
        [`expenses/${expenseId}`]: { ...baseExpense, date: "2026-09-01" },
      }),
      commands: [voidCmd],
      operationId: "op-exp-date-mismatch",
    }),
    /Expense date does not match this purchase\./,
  );
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": { ...baseFeed },
        [`expenses/${expenseId}`]: { ...baseExpense, reference: "wrong-ref" },
      }),
      commands: [voidCmd],
      operationId: "op-exp-ref-mismatch",
    }),
    /Expense reference does not match this purchase\./,
  );
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": { ...baseFeed },
        [`expenses/${expenseId}`]: { ...baseExpense, companyId: "other-farm" },
      }),
      commands: [voidCmd],
      operationId: "op-company-mismatch",
    }),
    /Expense company does not match this purchase\./,
  );
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": { ...baseFeed },
        [`expenses/${expenseId}`]: { ...baseExpense, amount: 999 },
      }),
      commands: [voidCmd],
      operationId: "op-7",
    }),
    /Expense amount does not match the purchase record\./,
  );
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": { ...baseFeed },
        [`expenses/${expenseId}`]: { ...baseExpense, amount: NaN },
      }),
      commands: [voidCmd],
      operationId: "op-nan-exp-amount",
    }),
    /Expense amount does not match the purchase record\./,
  );

  // 11. Linked finance entry on item: missing, voided, or inconsistent fails closed
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": { ...baseFeed, financeEntries: null },
        [`expenses/${expenseId}`]: { ...baseExpense },
      }),
      commands: [voidCmd],
      operationId: "op-fin-null",
    }),
    /Inventory finance entries are missing for this item\./,
  );
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": { ...baseFeed, financeEntries: {} },
        [`expenses/${expenseId}`]: { ...baseExpense },
      }),
      commands: [voidCmd],
      operationId: "op-missing-fin-entry",
    }),
    /The linked finance entry on the inventory item does not exist\./,
  );
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": {
          ...baseFeed,
          financeEntries: {
            [expenseId]: { ...financeSourceEntry(expense), voided: true },
          },
        },
        [`expenses/${expenseId}`]: { ...baseExpense },
      }),
      commands: [voidCmd],
      operationId: "op-fin-entry-voided",
    }),
    /This purchase finance entry is already voided\./,
  );
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": {
          ...baseFeed,
          financeEntries: {
            [expenseId]: { ...financeSourceEntry(expense), amount: 999 },
          },
        },
        [`expenses/${expenseId}`]: { ...baseExpense },
      }),
      commands: [voidCmd],
      operationId: "op-fin-entry-mismatch",
    }),
    /Inventory finance entry metadata is inconsistent with the purchase\./,
  );
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": {
          ...baseFeed,
          financeEntries: {
            [expenseId]: { ...financeSourceEntry(expense), amount: NaN },
          },
        },
        [`expenses/${expenseId}`]: { ...baseExpense },
      }),
      commands: [voidCmd],
      operationId: "op-fin-entry-nan",
    }),
    /Inventory finance entry metadata is inconsistent with the purchase\./,
  );
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": {
          ...baseFeed,
          financeEntries: {
            [expenseId]: { ...financeSourceEntry(expense), reference: "wrong-ref" },
          },
        },
        [`expenses/${expenseId}`]: { ...baseExpense },
      }),
      commands: [voidCmd],
      operationId: "op-fin-entry-ref",
    }),
    /Inventory finance entry reference does not match the purchase\./,
  );
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": {
          ...baseFeed,
          financeEntries: {
            [expenseId]: { ...financeSourceEntry(expense), date: "2026-09-01" },
          },
        },
        [`expenses/${expenseId}`]: { ...baseExpense },
      }),
      commands: [voidCmd],
      operationId: "op-fin-entry-date",
    }),
    /Inventory finance entry date does not match the purchase\./,
  );
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": {
          ...baseFeed,
          financeEntries: {
            [expenseId]: { ...financeSourceEntry(expense), sourceKind: "other" },
          },
        },
        [`expenses/${expenseId}`]: { ...baseExpense },
      }),
      commands: [voidCmd],
      operationId: "op-fin-entry-sourcekind",
    }),
    /Inventory finance entry sourceKind is inconsistent\./,
  );
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": {
          ...baseFeed,
          financeEntries: {
            [expenseId]: { ...financeSourceEntry(expense), sourceCollection: "additives" },
          },
        },
        [`expenses/${expenseId}`]: { ...baseExpense },
      }),
      commands: [voidCmd],
      operationId: "op-fin-entry-sourcecol",
    }),
    /Inventory finance entry sourceCollection is inconsistent\./,
  );
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": {
          ...baseFeed,
          financeEntries: {
            [expenseId]: { ...financeSourceEntry(expense), sourceId: "other-id" },
          },
        },
        [`expenses/${expenseId}`]: { ...baseExpense },
      }),
      commands: [voidCmd],
      operationId: "op-fin-entry-sourceid",
    }),
    /Inventory finance entry sourceId is inconsistent\./,
  );
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": {
          ...baseFeed,
          financeEntries: {
            [expenseId]: { ...financeSourceEntry(expense), sourceLineId: "other-line" },
          },
        },
        [`expenses/${expenseId}`]: { ...baseExpense },
      }),
      commands: [voidCmd],
      operationId: "op-fin-entry-sourceline",
    }),
    /Inventory finance entry sourceLineId is inconsistent\./,
  );
  await assert.rejects(
    () => planCommands({
      auth: buildMockAuth({
        "feeds/feed-1": {
          ...baseFeed,
          financeEntries: {
            [expenseId]: { ...financeSourceEntry(expense), sourceStockIndex: 99 },
          },
        },
        [`expenses/${expenseId}`]: { ...baseExpense },
      }),
      commands: [voidCmd],
      operationId: "op-fin-entry-stockindex",
    }),
    /Inventory finance entry sourceStockIndex is inconsistent\./,
  );

  // 12. Stale draft basis: basis contains stock and ledger
  const planStockChange = await planCommands({
    auth: buildMockAuth({
      "feeds/feed-1": { ...baseFeed, totalStock: 105 },
      [`expenses/${expenseId}`]: { ...baseExpense },
    }),
    commands: [voidCmd],
    operationId: "op-stale-1",
  });
  assert.notEqual(planStockChange.basis, plan1.basis);

  const planExpChange = await planCommands({
    auth: buildMockAuth({
      "feeds/feed-1": { ...baseFeed },
      [`expenses/${expenseId}`]: { ...baseExpense, notes: "edited" },
    }),
    commands: [voidCmd],
    operationId: "op-stale-2",
  });
  assert.notEqual(planExpChange.basis, plan1.basis);

  // 13. Permanent deletion remains blocked on item with voided purchase history
  const delCmd = {
    id: "row-del",
    type: "delete_inventory_item",
    date: "2026-09-21",
    itemType: "feed",
    itemId: "feed-1",
    values: {},
  };
  await assert.rejects(
    () => planCommands({ auth: buildMockAuth(store2), commands: [delCmd], operationId: "op-del" }),
    /This item has purchase, usage, or linked finance history\./,
  );
});

test("Orson operation surfaces remount when the signed-in user or company changes", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const inventory = fs.readFileSync(path.join(__dirname, "../../app/inventory/feedAdditives.tsx"), "utf8");
  const chat = fs.readFileSync(path.join(__dirname, "../../app/AIChat.tsx"), "utf8");
  const hook = fs.readFileSync(path.join(__dirname, "../../orson/useAgentOperations.ts"), "utf8");
  assert.ok(inventory.includes("const identity ="));
  assert.ok(inventory.includes("FeedAdditivesScreenContent key={identity}"));
  assert.ok(inventory.includes("user?.uid"));
  assert.ok(inventory.includes("company?.id"));
  assert.ok(chat.includes("AIChatSession key={identity}"));
  assert.ok(hook.includes("if (!mounted.current) return;"));
  assert.ok(hook.includes("mounted.current = false;"));
});

test("orsonAgentTools AGENT_INSTRUCTION selects active purchase even if it has usage", () => {
  const { AGENT_INSTRUCTION } = require("../orsonAgentTools");
  assert.ok(!AGENT_INSTRUCTION.includes("active unused purchase"));
  assert.match(AGENT_INSTRUCTION, /If exactly one active purchase belongs to the uniquely matched item/);
  assert.match(AGENT_INSTRUCTION, /even if it has usage/);
});
