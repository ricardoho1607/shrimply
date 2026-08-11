const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const functionsSource = fs.readFileSync(path.join(__dirname, "orson.js"), "utf8");
const rules = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");

test("confirmed lab processing bounds client-controlled ponds before server writes", () => {
  assert.match(functionsSource, /const LAB_MAX_POND_RESULTS = 200;/);
  assert.match(functionsSource, /const pondSnapshots = pondIds\.length > 0[\s\S]*?await db\.getAll/);
  assert.match(functionsSource, /const existingPondIds = new Set/);
  assert.match(functionsSource, /candidatePondResults\.filter\(\(result\) => existingPondIds\.has\(result\.pondId\)\)/);
  assert.match(rules, /match \/labReports\/\{labReportId\}[\s\S]*?resource\.data\.status != 'confirmed'/);
});

test("confirmed lab AI has a company limit with deterministic fallback", () => {
  assert.match(functionsSource, /namespace: "labInsightsCompanyDaily"/);
  assert.match(functionsSource, /limit: 10,[\s\S]*?windowMs: DAY_MS/);
  assert.match(functionsSource, /generateLabInsights\(summaries, allowPaidInsights\)/);
});
