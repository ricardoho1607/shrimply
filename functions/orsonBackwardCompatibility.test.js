const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(path.dirname(require.resolve("./orsonRequestPolicy")), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("new clients retain the legacy callable fields during the backend rollout", () => {
  for (const clientPath of ["app/hooks/useGemini.ts", "web/src/hooks/useGemini.ts"]) {
    const source = read(clientPath);
    assert.match(source, /systemInstruction:\s*analysis\.promptPackage\.systemInstruction/);
    assert.match(source, /aiFunction:\s*options\.aiFunction\s*\?\?\s*['"]chat['"]/);
  }
});

test("the backend and rules retain installed-client data paths", () => {
  const backend = read("functions/orson.js");
  const rules = read("firestore.rules");

  assert.match(backend, /request\.data\?\.operation === ["']mortality_context["']/);
  assert.match(rules, /match \/aiUsage\/\{usageDateId\}[\s\S]*?allow read:[\s\S]*?validLegacyAiUsageCreate[\s\S]*?validLegacyAiUsageUpdate/);
  assert.match(rules, /match \/orsonUsage\/\{usageDateId\}[\s\S]*?allow read:[\s\S]*?allow write: if false/);
});
