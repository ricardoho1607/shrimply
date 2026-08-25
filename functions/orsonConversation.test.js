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

test("web lookup is limited to product composition questions", () => {
  assert.equal(__test.shouldUseOrsonProductWebLookup("inventory_product", "What ingredients are in BioPlus?"), true);
  assert.equal(__test.shouldUseOrsonProductWebLookup("inventory_product", "What does this probiotic do?"), true);
  assert.equal(__test.shouldUseOrsonProductWebLookup("inventory_product", "How much BioPlus stock is left?"), false);
  assert.equal(__test.shouldUseOrsonProductWebLookup("aquaculture_knowledge", "What ingredients are in BioPlus?"), false);
});
