const test = require("node:test");
const assert = require("node:assert/strict");
const { emptySopStep } = require("./contracts.ts");
const { sopLibrarySummary } = require("./library.ts");

test("library cards do not count empty procedure placeholders as readable content", () => {
  const definition = {
    title: "Farm SOP",
    description: "",
    language: "id",
    steps: [emptySopStep()],
    content: {
      sections: [
        {
          id: "blank",
          title: "Section",
          body: " ",
          sourcePages: [],
          tables: [],
        },
        {
          id: "instructions",
          title: "Method",
          body: "Record the result.",
          sourcePages: [],
          tables: [],
        },
        {
          id: "reference",
          title: "Reference",
          body: "",
          sourcePages: [],
          tables: [
            { title: "Source", columns: ["Value"], rows: [{ cells: ["0"] }] },
          ],
        },
      ],
      omissions: [],
    },
  };
  const before = structuredClone(definition);
  const result = sopLibrarySummary(definition);
  assert.equal(result.readableSections, 2);
  assert.equal(result.checks, 1);
  assert.ok(result.issues > 0);
  assert.deepEqual(definition, before);
});

test("legacy task-only drafts report missing procedure content and incomplete review without inventing sections", () => {
  const result = sopLibrarySummary({
    title: "Draft",
    description: "",
    language: "id",
    steps: [emptySopStep()],
  });
  assert.equal(result.readableSections, 0);
  assert.equal(result.checks, 1);
  assert.ok(result.issues > 0);
});
