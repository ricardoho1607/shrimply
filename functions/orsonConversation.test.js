process.env.NODE_ENV = "test";

const test = require("node:test");
const assert = require("node:assert/strict");
const { __test } = require("./orson");

test("product context preserves recorded label ingredients and recipes", () => {
  const products = __test.normalizeOrsonProductDocuments([
    {
      id: "bio-plus",
      data: () => ({
        additiveName: "BioPlus",
        brand: "Shrimp Labs",
        category: "Probiotic",
        productLabel: {
          manufacturer: "Shrimp Labs",
          ingredients: ["Bacillus subtilis 1×10^9 CFU/g", "Rice bran carrier"],
          sourceUrl: "https://example.com/bioplus-label.pdf",
          recordedAt: "2026-08-25",
        },
        usageHistory: [{ date: "2026-08-24", pondId: "a1", quantity: 2, notes: "Evening application" }],
      }),
    },
    {
      id: "mix-one",
      data: () => ({
        additiveName: "Mix One",
        inventoryKind: "treatmentMix",
        treatmentMixRecipe: {
          yieldLiters: 100,
          components: [{ additiveName: "Mineral A", quantity: 3, unit: "kg" }],
        },
      }),
    },
  ], "What is inside BioPlus?");

  assert.equal(products.length, 1);
  assert.deepEqual(products[0].product_label.ingredients, ["Bacillus subtilis 1×10^9 CFU/g", "Rice bran carrier"]);
  assert.equal(products[0].recent_usage[0].pond_id, "a1");
  assert.equal(products[0].product_label.source_url, "https://example.com/bioplus-label.pdf");
});

test("product context rejects unsafe label links", () => {
  const products = __test.normalizeOrsonProductDocuments([{
    id: "unsafe",
    data: () => ({
      additiveName: "Unsafe Label",
      productLabel: { ingredients: ["Unknown mineral"], sourceUrl: "javascript:alert(1)" },
    }),
  }], "Unsafe Label");

  assert.equal(products[0].product_label.source_url, null);
});

test("server instructions keep general knowledge and unrelated questions away from pond summaries", () => {
  const knowledge = __test.buildServerOrsonSystemInstruction("standard", "chat", "aquaculture_knowledge");
  const unrelated = __test.buildServerOrsonSystemInstruction("standard", "chat", "out_of_scope");

  assert.match(knowledge, /Do not introduce pond status, feed pressure, or farm measurements/);
  assert.match(unrelated, /Do not mention or reveal farm data/);
});

test("server instructions preserve exact-record and no-advice constraints", () => {
  const instructions = __test.buildServerOrsonSystemInstruction("standard", "chat", "farm_analysis");

  assert.match(instructions, /If ORSON EXACT RECORDS is present/);
  assert.match(instructions, /suppress_advice to true/);
  assert.match(instructions, /Do not interpret the word compare as a request for a multi-pond ranking/);
});

test("server pond diagnostics rank evidence and keep actions conditional", () => {
  const instructions = __test.buildServerOrsonSystemInstruction("pond_diagnostic", "chat", "farm_analysis");

  assert.match(instructions, /ASSESSMENT; KEY DATED EVIDENCE; LIKELY CAUSES; WHAT TO CHECK NEXT; ACTIONS/);
  assert.match(instructions, /Rank no more than three supported causes/);
  assert.match(instructions, /Logged feed allocation is not proof of appetite/);
  assert.match(instructions, /Timing alone does not confirm/);
  assert.match(instructions, /A morning DO reading is not a dawn or pre-dawn measurement/);
  assert.match(instructions, /Readings after its end date cannot explain the completed interval/);
  assert.doesNotMatch(instructions, /cut feed by 15-20%|cut by 30-50%/);
});

test("web lookup covers aquaculture knowledge and product composition questions", () => {
  assert.equal(__test.shouldUseOrsonWebLookup("inventory_product", "What ingredients are in BioPlus?"), true);
  assert.equal(__test.shouldUseOrsonWebLookup("inventory_product", "What does this probiotic do?"), true);
  assert.equal(__test.shouldUseOrsonWebLookup("inventory_product", "How much BioPlus stock is left?"), false);
  assert.equal(__test.shouldUseOrsonWebLookup("aquaculture_knowledge", "What is the best nitrate level for shrimp?"), true);
  assert.equal(__test.shouldUseOrsonWebLookup("farm_analysis", "What is my nitrate today?"), false);
});

test("mortality diagnostics never reinterpret logged allocation as appetite", () => {
  const instructions = __test.buildServerOrsonSystemInstruction("mortality_diagnostic", "chat", "farm_analysis");
  assert.doesNotMatch(instructions, /low-confidence appetite proxy/);
  assert.match(instructions, /allocation alone cannot establish appetite/);
});
