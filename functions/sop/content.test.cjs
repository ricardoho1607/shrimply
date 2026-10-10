const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const React = require("../../web/node_modules/react");
const {
  renderToStaticMarkup,
} = require("../../web/node_modules/react-dom/server");
require.extensions[".tsx"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText,
    filename,
  );
const { checkDefinition } = require("./service");
const { emptySopStep } = require("../../shared/sop/contracts.ts");
const { validateSopContent } = require("../../shared/sop/content.ts");
test("server approval validation accepts optional corrective and manual evidence text", () => {
  const { checkDefinition } = require("./service");
  const { emptySopStep } = require("../shared/orsonDomain/sop/contracts");
  const step = emptySopStep();
  step.check = {
    ...step.check,
    field: "manual",
    operator: "narrative",
    unit: "",
    exactTime: false,
    rubric: "",
  };
  step.correctiveInstructions = "";
  const definition = {
    title: "Manual observation",
    description: "",
    language: "id",
    attachments: [],
    steps: [step],
  };
  assert.deepEqual(checkDefinition(definition, false), definition);
});
const { validateSopTranslation } = require("../../shared/sop/translation.ts");
const { generateAndSaveSopDraft } = require("../../shared/sop/draft.ts");
const content = require("./fixtures/water-content.json");
const fixture = () => ({
  title: "Water procedure",
  description: "Source-based draft fixture; not a complete 46-page conversion.",
  language: "id",
  content: structuredClone(content),
  steps: [
    {
      ...emptySopStep(),
      trigger: { ...emptySopStep().trigger, kind: "manual" },
      check: {
        ...emptySopStep().check,
        field: "manual",
        unit: "",
        operator: "narrative",
        exactTime: false,
        rubric: "Document measurements and review source parameter guidance.",
      },
      correctiveInstructions:
        "Review the recorded findings with the farm manager.",
    },
  ],
});

test("source tables and procedures survive model output, draft saving, reload and reader rendering", async () => {
  const { generateSopJson, SOP_DRAFT_FORMAT } = require("./model");
  const { SopReader } = require("../../web/src/components/SopReader.tsx");
  let saved;
  const result = await generateAndSaveSopDraft({
    text: "Source fixture",
    language: "id",
    editing: null,
    onProgress() {},
    onDraft() {},
    client: {
      upload() {
        assert.fail("No file upload in this fixture");
      },
      async assist() {
        return {
          definition: await generateSopJson({
            apiKey: "fixture",
            prompt: "Untrusted source",
            format: SOP_DRAFT_FORMAT,
            fetchImpl: async () =>
              new Response(
                JSON.stringify({
                  status: "completed",
                  output_text: JSON.stringify(fixture()),
                }),
              ),
          }),
        };
      },
      async command(command) {
        saved = JSON.parse(
          JSON.stringify(checkDefinition(command.definition, true)),
        );
        return { ok: true, sopId: "fixture" };
      },
    },
  });
  assert.deepEqual(saved.content, content);
  assert.equal(saved.steps[0].check.min, null);
  assert.equal(saved.steps[0].check.max, null);
  const html = renderToStaticMarkup(
    React.createElement(SopReader, {
      document: { ...result.document, definition: saved },
      language: "en",
      onOpen() {},
    }),
  );
  for (const value of [
    "7,5–8,5",
    "28–32",
    "15–30",
    "5–7",
    "&lt;0,2",
    "&lt;0,1",
    "&lt;10",
    "0,1–0,5",
    "&lt;20",
    "&lt;15",
    "100–200",
    "DOC 10",
    "4 m³",
  ])
    assert.ok(html.includes(value), value);
  assert.match(html, /<table/);
  assert.match(html, /<caption/);
  assert.match(html, /Source pages/);
  assert.match(html, /href="[^"]+-water-parameters"/);
  assert.match(html, /<details class="sop-workflow-rules">/); // workflow secondary, document visible
});

test("old task-only model responses cannot be silently imported as a complete SOP", async () => {
  const { generateSopJson, SOP_DRAFT_FORMAT } = require("./model");
  const old = fixture();
  delete old.content;
  await assert.rejects(
    generateSopJson({
      apiKey: "fixture",
      prompt: "Source",
      format: SOP_DRAFT_FORMAT,
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            status: "completed",
            output_text: JSON.stringify(old),
          }),
        ),
    }),
    /readable document/,
  );
  await assert.rejects(
    generateAndSaveSopDraft({
      text: "Source",
      language: "id",
      editing: null,
      onProgress() {},
      onDraft() {
        assert.fail("Existing editor must survive");
      },
      client: {
        async assist() {
          return { definition: old };
        },
        async command() {
          assert.fail("Do not save task-only imports");
        },
        upload() {},
      },
    }),
    /updated SOP backend/,
  );
  assert.equal(checkDefinition(old, true).content, undefined); // legacy SOPs still readable/editable
});

test("omitted source content is saved for review but blocks approval", () => {
  const draft = fixture();
  draft.content.omissions = ["Feeding table on page 39 could not be read."];
  assert.deepEqual(
    checkDefinition(draft, true).content.omissions,
    draft.content.omissions,
  );
  assert.throws(() => checkDefinition(draft), /Resolve omitted source content/);
});

test("malformed or excessive document tables are rejected rather than losing cells", () => {
  for (const change of [
    (c) => c.sections[0].tables[0].rows[0].cells.pop(),
    (c) =>
      c.sections[0].tables[0].rows.push({
        cells: [5, "range", "unit", "page"],
      }),
    (c) => c.sections.push(c.sections[0]),
    (c) => c.sections[0].sourcePages.push(0),
    (c) => (c.sections[0].body = "x".repeat(20001)),
    (c) =>
      (c.sections[0].tables[0].rows = Array(301).fill({
        cells: ["a", "b", "c", "d"],
      })),
  ]) {
    const draft = fixture();
    change(draft.content);
    assert.ok(validateSopContent(draft.content).length);
    assert.throws(() => checkDefinition(draft, true));
  }
});

test("translations retain document identity, table rows, inequalities and numeric values", () => {
  const source = fixture();
  const translated = {
    title: source.title,
    description: source.description,
    content: structuredClone(source.content),
    steps: source.steps.map((s) => ({
      id: s.id,
      title: s.title,
      instructions: s.instructions,
      correctiveInstructions: s.correctiveInstructions,
      rubric: s.check.rubric,
    })),
  };
  assert.deepEqual(validateSopTranslation(source, translated), []);
  for (const change of [
    (t) => t.content.sections.pop(),
    (t) => t.content.sections[0].tables[0].rows.pop(),
    (t) => (t.content.sections[0].tables[0].rows[4].cells[1] = "0,2"),
    (t) => (t.content.sections[0].tables[0].rows[4].cells[1] = "<2"),
    (t) => (t.content.sections[0].sourcePages = [4]),
    (t) => (t.content.sections[0].tables[0].rows[4].cells[2] = "g/L"),
  ]) {
    const copy = structuredClone(translated);
    change(copy);
    assert.ok(validateSopTranslation(source, copy).length);
  }
});

test("draft review shows saved water limits openly and distinguishes recording-only checks", () => {
  const { SopReader } = require("../../web/src/components/SopReader.tsx");
  const water = {
    ...emptySopStep("oxygen"),
    title: "Oxygen",
    check: {
      ...emptySopStep().check,
      field: "water.doMorning",
      operator: "range",
      min: 0,
      max: 7,
      unit: "mg/L",
    },
  };
  const record = {
    ...emptySopStep("ph"),
    title: "pH",
    check: {
      ...emptySopStep().check,
      field: "water.phMorning",
      operator: "present",
      min: 99,
      max: 100,
    },
  };
  const html = renderToStaticMarkup(
    React.createElement(SopReader, {
      document: {
        id: "draft",
        revision: 3,
        status: "draft",
        definition: {
          title: "Water SOP",
          description: "",
          language: "id",
          steps: [water, record],
        },
      },
      language: "id",
      onOpen() {},
    }),
  );
  assert.match(html, /Sasaran parameter air/);
  assert.match(html, /Oksigen terlarut \(pagi\)/);
  assert.match(html, /0 – 7 mg\/L/);
  assert.match(html, /Batas tidak diperiksa/);
  assert.match(html, /Batas pengukuran belum diatur/);
  assert.doesNotMatch(
    html,
    /99|100|do Morning|present|<details class="sop-check-details"/,
  );
});

test("invalid AI automation preserves readable source tables as a blocked manual-review draft", (t) => {
  const { prepareGeneratedSopDraft } = require("./draftValidation");
  t.mock.method(console, "warn", () => {});
  const input = fixture();
  const original = JSON.stringify(input);
  input.steps[0].trigger.at = "";
  input.steps[0].trigger.everyDays = 0;
  input.steps[0].onFail = ["nonexistent"];
  const before = JSON.stringify(input);
  const { definition, warnings } = prepareGeneratedSopDraft(input);
  assert.equal(JSON.stringify(input), before);
  assert.deepEqual(definition.content.sections, input.content.sections);
  assert.equal(definition.steps[0].instructions, input.steps[0].instructions);
  assert.equal(
    definition.steps[0].correctiveInstructions,
    input.steps[0].correctiveInstructions,
  );
  assert.equal(definition.steps[0].trigger.kind, "manual");
  assert.equal(definition.steps[0].check.field, "manual");
  assert.equal(definition.steps[0].check.operator, "narrative");
  assert.equal(definition.steps[0].check.exactTime, false);
  assert.equal(definition.steps[0].gateStage, "");
  assert.deepEqual(definition.steps[0].onFail, []);
  assert.match(definition.content.omissions.at(-1), /^AI belum/);
  assert.ok(
    warnings.some((item) => item.startsWith("Resolve omitted source content:")),
  );
  assert.throws(
    () => checkDefinition(definition),
    /Resolve omitted source content/,
  );
  const valid = JSON.parse(original);
  assert.deepEqual(
    prepareGeneratedSopDraft(valid).definition,
    checkDefinition(valid, true),
  );
});

test("manual-review recovery cannot fabricate missing content or swallow unexpected server failures", () => {
  const { prepareGeneratedSopDraft } = require("./draftValidation");
  const empty = fixture();
  empty.content.sections = [];
  assert.throws(() => prepareGeneratedSopDraft(empty), /Document needs/);
  const unsupported = fixture();
  unsupported.language = "unknown";
  assert.throws(
    () => prepareGeneratedSopDraft(unsupported),
    /supported original language/,
  );
});

test("invalid measurement automation retains valid H-20 preparation timing in its blocked review draft", (t) => {
  t.mock.method(console, "warn", () => {});
  const { prepareGeneratedSopDraft } = require("./draftValidation");
  const input = fixture();
  input.steps[0].stages = ["preparation"];
  input.steps[0].trigger = {
    ...input.steps[0].trigger,
    kind: "doc",
    docFrom: -20,
    docTo: -20,
  };
  input.steps[0].check.field = "unsupported-procedure";
  const output = prepareGeneratedSopDraft(input);
  assert.deepEqual(output.definition.steps[0].trigger, input.steps[0].trigger);
  assert.deepEqual(output.definition.steps[0].stages, ["preparation"]);
  assert.equal(output.definition.steps[0].check.field, "manual");
  assert.ok(
    output.warnings.some((w) =>
      w.startsWith("Resolve omitted source content:"),
    ),
  );
});

test("AI manual measurement checks retain their source limits without inventing a clock schedule", () => {
  const { prepareGeneratedSopDraft } = require("./draftValidation");
  const definition = fixture();
  definition.steps[0].trigger.at = "";
  definition.steps[0].check = {
    ...definition.steps[0].check,
    field: "water.doMorning",
    operator: "range",
    min: 5,
    max: 7,
    unit: "mg/L",
  };
  const actual = prepareGeneratedSopDraft(definition);
  assert.deepEqual(actual.definition.content, definition.content);
  assert.deepEqual(actual.definition.steps[0].check, definition.steps[0].check);
  assert.equal(actual.definition.steps[0].trigger.at, "");
  assert.equal(actual.definition.steps[0].trigger.kind, "manual");
  assert.deepEqual(actual.warnings, []);
});

test("dedicated deletion forwards auth but strips injected commands and privileges", async () => {
  const { createDeleteSopHandler } = require("./delete");
  const auth = { uid: "tech", token: { auth_time: 123 } };
  let forwarded;
  const handler = createDeleteSopHandler(async (request) => {
    forwarded = request;
    return { ok: true };
  });
  assert.deepEqual(
    await handler({
      auth,
      data: {
        companyId: "farm",
        sopId: "draft",
        expectedRevision: 2,
        operationId: "delete-1",
        action: "approve",
        platformAdmin: true,
        definition: {},
      },
    }),
    { ok: true },
  );
  assert.equal(forwarded.auth, auth);
  assert.deepEqual(forwarded.data, {
    action: "deleteSop",
    companyId: "farm",
    sopId: "draft",
    expectedRevision: 2,
    operationId: "delete-1",
  });
});
