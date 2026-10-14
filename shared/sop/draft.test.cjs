const { test } = require("node:test");
const assert = require("node:assert/strict");
const { generateAndSaveSopDraft, saveSopDraft } = require("./draft.ts");
const { emptySopStep } = require("./contracts.ts");

function fixture() {
  const events = [];
  const source = {
    path: "company/source.pdf",
    name: "Source.pdf",
    contentType: "application/pdf",
  };
  const definition = {
    title: "Source procedure",
    description: "Guidance",
    language: "id",
    content: require("../../functions/sop/fixtures/water-content.json"),
    steps: [emptySopStep()],
  };
  const client = {
    async upload(file, purpose) {
      events.push(["upload", file, purpose]);
      return source;
    },
    async assist(data) {
      events.push(["assist", data]);
      return { definition, warnings: ["Review targets"] };
    },
    async command(data) {
      events.push(["save", data]);
      return { ok: true, sopId: data.sopId || "saved-sop" };
    },
  };
  return { events, source, definition, client };
}

test("an imported draft retains source guidance and is saved before success", async () => {
  const f = fixture(),
    progress = [],
    drafts = [];
  const previous = {
    path: "company/previous.txt",
    name: "Previous",
    contentType: "text/plain",
  };
  const result = await generateAndSaveSopDraft({
    client: f.client,
    text: "",
    language: "id",
    file: "pdf",
    editing: null,
    attachments: [previous],
    onProgress: (x) => progress.push(x),
    onDraft: (x) => drafts.push(x),
  });
  assert.deepEqual(progress, ["uploading", "generating", "saving"]);
  assert.equal(f.events[0][2], "guidance");
  assert.equal(f.events[1][1].attachment, f.source);
  assert.deepEqual(f.events[2][1].definition.attachments, [previous, f.source]);
  assert.equal(result.document.id, "saved-sop");
  assert.equal(result.document.status, "draft");
  assert.equal(result.document.revision, 1);
  assert.deepEqual(result.warnings, ["Review targets"]);
  assert.deepEqual(drafts[0], result.document.definition);
});

test("a failed save leaves a reviewable result without regenerating it", async () => {
  const f = fixture(),
    drafts = [];
  f.client.command = async () => {
    throw new Error("Save unavailable");
  };
  await assert.rejects(
    generateAndSaveSopDraft({
      client: f.client,
      text: "",
      language: "id",
      file: "pdf",
      editing: null,
      onProgress() {},
      onDraft: (d) => drafts.push(d),
    }),
    /Save unavailable/,
  );
  assert.equal(drafts.length, 1);
  assert.deepEqual(drafts[0].attachments, [f.source]);
  assert.equal(f.events.filter(([kind]) => kind === "assist").length, 1);
});

test("failed generation cannot save a fabricated draft", async () => {
  const f = fixture();
  f.client.assist = async () => {
    throw new Error("Generation timed out");
  };
  await assert.rejects(
    generateAndSaveSopDraft({
      client: f.client,
      text: "",
      language: "id",
      file: "pdf",
      editing: null,
      onProgress() {},
      onDraft() {
        assert.fail("No generated draft exists");
      },
    }),
    /timed out/,
  );
  assert.equal(
    f.events.some(([kind]) => kind === "save"),
    false,
  );
});

test("an empty AI response cannot replace the editor or report a saved SOP", async () => {
  const f = fixture();
  f.client.assist = async () => ({ warnings: [] });
  await assert.rejects(
    generateAndSaveSopDraft({
      client: f.client,
      text: "Procedure",
      language: "id",
      editing: null,
      onProgress() {},
      onDraft() {
        assert.fail("No generated draft exists");
      },
    }),
    /no usable draft/,
  );
  assert.equal(
    f.events.some(([kind]) => kind === "save"),
    false,
  );
});

test("an existing SOP is saved with its revision precondition and requires fresh approval", async () => {
  const f = fixture();
  const editing = {
    id: "existing",
    title: "Old",
    definition: f.definition,
    revision: 3,
    status: "approved",
    approvedVersionId: "v3",
  };
  const result = await generateAndSaveSopDraft({
    client: f.client,
    text: "Procedure",
    language: "id",
    editing,
    onProgress() {},
    onDraft() {},
  });
  const saved = f.events.find(([kind]) => kind === "save")[1];
  assert.equal(saved.sopId, "existing");
  assert.equal(saved.expectedRevision, 3);
  assert.equal(result.document.revision, 4);
  assert.equal(result.document.approvedVersionId, undefined);
});

test("manual saves preserve oxygen targets and review the acknowledged revision as a draft", async () => {
  const f = fixture();
  const step = emptySopStep();
  step.check = {
    ...step.check,
    field: "water.doMorning",
    operator: "range",
    min: 5,
    max: 7,
    unit: "mg/L",
  };
  const definition = { ...f.definition, steps: [step] };
  const editing = {
    id: "existing",
    revision: 2,
    status: "approved",
    approvedVersionId: "old",
    createdBy: "owner",
    source: { author: "Farm", publicationId: "source", versionId: "v1" },
  };
  const document = await saveSopDraft({
    client: f.client,
    definition,
    editing,
  });
  const command = f.events.find(([kind]) => kind === "save")[1];
  assert.equal(command.expectedRevision, 2);
  assert.deepEqual(command.definition.steps[0].check, step.check);
  assert.equal(document.revision, 3);
  assert.equal(document.status, "draft");
  assert.equal(document.approvedVersionId, undefined);
  assert.equal(document.createdBy, "owner");
  assert.deepEqual(document.source, editing.source);
  assert.equal(document.definition.steps[0].check.min, 5);
  assert.equal(document.definition.steps[0].check.max, 7);
});

test("manual saves reject false acknowledgements and leave edits available for retry", async () => {
  const f = fixture();
  const before = JSON.stringify(f.definition);
  for (const response of [
    {},
    { pending: true },
    { ok: false, sopId: "draft" },
    { ok: true, sopId: "" },
    { ok: true, sopId: "another" },
  ]) {
    await assert.rejects(
      saveSopDraft({
        client: { command: async () => response },
        definition: f.definition,
        editing: { id: "draft", revision: 4 },
      }),
      /not saved/,
    );
  }
  const failure = new Error("Revision conflict");
  await assert.rejects(
    saveSopDraft({
      client: {
        command: async () => {
          throw failure;
        },
      },
      definition: f.definition,
      editing: null,
    }),
    (e) => e === failure,
  );
  assert.equal(JSON.stringify(f.definition), before);
});
