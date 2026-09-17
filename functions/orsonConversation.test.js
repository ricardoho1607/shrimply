process.env.NODE_ENV = "test";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
if (!require.extensions['.ts']) {
  require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, file);
}
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

test("product context removes floating-point artifacts before Muse sees inventory", () => {
  const [product] = __test.normalizeOrsonProductDocuments([{
    id: "mineral",
    data: () => ({
      additiveName: "Mineral blend",
      totalStock: 6415.800000000001,
      usageHistory: [{ date: "2026-09-12", quantity: 1.2000000000000002, ppm: 2.5000000000000004 }],
      treatmentMixRecipe: { yieldLiters: 100.00000000000001, components: [{ additiveName: "A", quantity: 3.3000000000000003, unit: "kg" }] },
    }),
  }], "What is in stock?");

  assert.equal(product.current_stock, 6415.8);
  assert.equal(product.recent_usage[0].quantity, 1.2);
  assert.equal(product.recent_usage[0].ppm, 2.5);
  assert.equal(product.treatment_mix_recipe.yield_liters, 100);
  assert.equal(product.treatment_mix_recipe.components[0].quantity, 3.3);
});

test("server instructions keep general knowledge and unrelated questions away from pond summaries", () => {
  const knowledge = __test.buildServerOrsonSystemInstruction("standard", "chat", "aquaculture_knowledge");
  const unrelated = __test.buildServerOrsonSystemInstruction("standard", "chat", "out_of_scope");

  assert.match(knowledge, /Do not introduce pond status, feed pressure, or farm measurements/);
  assert.match(knowledge, /every numeric threshold must name the analyte, unit, reporting basis/);
  assert.match(knowledge, /salinity, life stage or shrimp size, and exposure duration/);
  assert.match(knowledge, /Keep operating targets separate from LC\/toxicity-study results/);
  assert.match(unrelated, /Converse naturally/);
  assert.match(unrelated, /read_app_records/);
  assert.doesNotMatch(unrelated, /Do not answer the unrelated|Do not calculate or provide a structured harvest projection/);
});

test("server instructions preserve exact-record and no-advice constraints", () => {
  const instructions = __test.buildServerOrsonSystemInstruction("standard", "chat", "farm_analysis");

  assert.match(instructions, /If ORSON EXACT RECORDS is present/);
  assert.match(instructions, /suppress_advice to true/);
  assert.match(instructions, /Do not interpret the word compare as a request for a multi-pond ranking/);
  assert.match(instructions, /suggested route is advisory/);
  assert.match(instructions, /suppress_treatment_advice/);
  assert.match(instructions, /Address every explicitly requested analyte/);
  assert.match(instructions, /read_pond_timeline/);
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
  assert.match(instructions, /read_pond_timeline for a 30-day baseline/);
  assert.match(instructions, /lineSeries/);
});

test("treatment questions search and retain alternative stock", () => {
  for (const question of ["What should I use to increase calcium?", "How do I reduce ammonia?", "What is the dosing formula?"]) {
    assert.equal(__test.shouldUseOrsonWebLookup("farm_analysis", question), true);
  }
  assert.equal(__test.shouldUseOrsonWebLookup("out_of_scope", "recommend a movie"), false);
  const products = __test.normalizeOrsonProductDocuments([
    { id: "a", data: { additiveName: "Mineral A", totalStock: 0 } },
    { id: "b", data: { additiveName: "Mineral B", totalStock: 30 } },
    { id: "c", data: { additiveName: "Mineral C" } },
    { id: "d", data: { feedName: "Feed D", totalStock: 5 } },
  ], "Recommend an alternative to Mineral A");
  assert.equal(products.length, 4);
  assert.equal(products[0].current_stock, 0);
  assert.equal(products[2].current_stock, null);
  assert.equal(products[3].inventory_kind, "feed");
});

test("inventory and dosing safeguards apply to farm questions too", () => {
  const { needsInventoryContext } = require('./shared/orsonInventoryPolicy');
  assert.equal(needsInventoryContext('farm_analysis', 'increase calcium'), true);
  assert.equal(needsInventoryContext('inventory_product', 'check my inventory'), true);
  assert.equal(needsInventoryContext('out_of_scope', 'recommend a movie'), false);
  const instruction = __test.buildServerOrsonSystemInstruction('standard', 'chat', 'farm_analysis');
  assert.match(instruction, /product_kg = active_kg \/ active_mass_fraction/);
  assert.match(instruction, /withhold numeric application doses/);
  assert.match(instruction, /unknown stock is not zero/);
  assert.match(instruction, /Never deduct stock/);
});

test("multi-turn pond selection inherits previous parameter and topic without resetting to generic farm summary", () => {
  const { buildOrsonQuestionFocus } = require('../orson/promptBuilder.ts');
  const mockPayloads = [{
    pondId: 'pond-c1',
    pondName: 'C1',
    areaM2: 1000,
    dailyRecords: [],
    recentSamplings: [],
    recentWaterQuality: [],
  }];
  const conversationHistory = [
    { role: 'user', text: 'Berapa kisaran fluktuasi pH harian yang aman?' },
    { role: 'model', text: 'Fluktuasi pH harian yang aman adalah 0.3 - 0.5. Apakah Anda ingin saya cek tren ayunan pH 14 hari untuk salah satu kolam C1 atau C2?' },
  ];

  const focus = buildOrsonQuestionFocus('coba cek kolam c1', mockPayloads, conversationHistory);

  assert.equal(focus.focusedPondName, 'C1');
  assert.equal(focus.requestedParameter, 'ph');
  assert.equal(focus.intent, 'water_quality');
  assert.equal(focus.answerContract.primaryTopic, 'water_quality');
  assert.equal(focus.shouldSummarize, false);
  assert.equal(focus.usesConversationHistory, true);

  const serverInstructions = __test.buildServerOrsonSystemInstruction('standard', 'chat', 'farm_analysis');
  assert.match(serverInstructions, /ORSON QUESTION FOCUS is advisory context/);
  assert.match(serverInstructions, /Prioritize natural conversation continuity/);
});

