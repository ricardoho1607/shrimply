const { test } = require("node:test");
const assert = require("node:assert/strict");
const { isExplicitFarmAction, isExplicitFarmCorrection, mergeOrsonOperation } = require("../shared/orsonAgentContract.ts");

test("natural requests for farm writes reach the action flow", () => {
  for (const request of [
    "I need to add 50 kg of Grower Feed to inventory at $4/kg",
    "I'd like to record today's sampling for Pond A",
    "We want to update yesterday's water quality reading",
    "Change Pond A's last sampling MBW to 13 g",
    "Please fix the pond area to 1200 m²",
    "Set the supplier for Pond A to Hatchery B",
    "Help me stock in 20 kg of feed",
    "ganti harga nya jadi 17000 IDR",
    "ubah harga pembelian Local Trial Feed menjadi 5 AUD per kg",
  ]) assert.equal(isExplicitFarmAction(request), true, request);

  for (const question of [
    "How do I add feed inventory?",
    "What if I need to update a sampling record?",
    "I want to know how to edit feeding records",
    "Bagaimana cara ganti harga pakan?",
    "How do I change a pond's area?",
  ]) assert.equal(isExplicitFarmAction(question), false, question);

  assert.equal(isExplicitFarmCorrection("Change Pond A's last sampling MBW to 13 g"), true);
  assert.equal(isExplicitFarmCorrection("Add 50 kg of feed"), false);
  assert.equal(isExplicitFarmCorrection("How do I change a pond's area?"), false);
});
test("late streamed drafts cannot regress saved receipts or a revised draft", () => {
  const draft = {
    id: "op",
    revision: 1,
    state: "draft",
    rows: [],
    receipts: [],
  };
  const partial = {
    ...draft,
    state: "partial",
    receipts: [{ rowIds: ["row-1"], status: "saved", message: "Saved" }],
  };
  const completed = { ...partial, state: "completed" };
  assert.equal(mergeOrsonOperation(partial, draft), partial);
  assert.equal(mergeOrsonOperation(completed, partial), completed);
  const revised = { ...draft, revision: 2 };
  assert.equal(mergeOrsonOperation(revised, completed), revised);
  assert.equal(mergeOrsonOperation(draft, partial), partial);
});
