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
