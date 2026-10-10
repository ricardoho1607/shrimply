const test = require("node:test");
const assert = require("node:assert/strict");
const { META_MODEL_API_MODEL } = require("../shared/metaModelApi");
const { MODEL } = require("./narrative");

test("SOP evaluator shares the model configured for Orson chat", () => {
  assert.equal(MODEL, META_MODEL_API_MODEL);
});

test("calibration from Gemini or an older evaluator cannot authorize Muse Spark approvals", () => {
  const {
    CALIBRATION_ID,
    narrativeCalibrationMatches,
  } = require("./narrative");
  assert.equal(narrativeCalibrationMatches(true, CALIBRATION_ID), true);
  for (const id of ["", "gemini-2.5-flash:v1", `${MODEL}:v1`])
    assert.equal(narrativeCalibrationMatches(true, id), false);
  assert.equal(narrativeCalibrationMatches(false, CALIBRATION_ID), false);
});

test("SOP JSON uses the shared Meta adapter, strict schema and private inline PDF input", async () => {
  const { generateSopJson, SOP_DRAFT_FORMAT } = require("./model");
  let captured;
  const draft = {
    title: "Synthetic fixture",
    description: "",
    language: "en",
    content: require("./fixtures/water-content.json"),
    steps: [],
  };
  const actual = await generateSopJson({
    apiKey: "synthetic-key",
    prompt: "Draft this fixture.",
    files: [
      {
        type: "input_file",
        filename: "sop.pdf",
        file_data: "data:application/pdf;base64,cGRm",
      },
    ],
    format: SOP_DRAFT_FORMAT,
    fetchImpl: async (url, options) => {
      captured = { url, body: JSON.parse(options.body) };
      return new Response(
        JSON.stringify({
          status: "completed",
          output_text: JSON.stringify(draft),
        }),
      );
    },
  });
  assert.deepEqual(actual, draft);
  assert.match(captured.url, /\/responses$/);
  assert.equal(captured.body.model, META_MODEL_API_MODEL);
  assert.equal(captured.body.text.format.type, "json_schema");
  assert.equal(captured.body.text.format.strict, true);
  assert.equal(captured.body.input[0].content[1].type, "input_file");
  assert.equal(captured.body.input[0].content[1].file_url, undefined);
  assert.equal(captured.body.store, false);
  assert.equal(captured.body.tools, undefined);
  assert.match(captured.body.instructions, /untrusted/i);
});

test("partial, malformed and refused Meta output never becomes a SOP judgment", async () => {
  const { generateSopJson, SOP_NARRATIVE_FORMAT } = require("./model");
  for (const response of [
    {
      status: "incomplete",
      incomplete_details: { reason: "max_output_tokens" },
      output_text: '{"result":"pass"}',
    },
    { status: "completed", output_text: "not JSON" },
    {
      status: "completed",
      output: [
        { type: "message", content: [{ type: "refusal", refusal: "No" }] },
      ],
    },
  ])
    await assert.rejects(
      generateSopJson({
        apiKey: "synthetic-key",
        prompt: "Evaluate synthetic evidence.",
        format: SOP_NARRATIVE_FORMAT,
        fetchImpl: async () => new Response(JSON.stringify(response)),
      }),
    );
});

test("narrative schema rejects extra authority fields and requires cited structured evidence", () => {
  const {
    SOP_NARRATIVE_FORMAT,
    validateNarrativeJudgment,
  } = require("./model");
  const judgment = {
    result: "pass",
    confidence: 0.95,
    citations: ["evidence"],
    explanation: "Fixture is complete.",
  };
  assert.equal(SOP_NARRATIVE_FORMAT.schema.additionalProperties, false);
  assert.deepEqual(validateNarrativeJudgment(judgment), judgment);
  for (const invalid of [
    { ...judgment, confidence: 1.1 },
    { ...judgment, confidence: "0.95" },
    { ...judgment, citations: [null] },
    { ...judgment, explanation: "" },
    { ...judgment, activate: true },
  ])
    assert.throws(() => validateNarrativeJudgment(invalid));
});

test("long document generation gets a larger budget while narrative judgments retain their short budget", async (t) => {
  const {
    generateSopJson,
    SOP_DRAFT_FORMAT,
    SOP_NARRATIVE_FORMAT,
  } = require("./model");
  const { SOP_DOCUMENT_TIMEOUT_MS } = require("../../shared/sop/timing.ts");
  const timeouts = [];
  t.mock.method(AbortSignal, "timeout", (milliseconds) => {
    timeouts.push(milliseconds);
    return new AbortController().signal;
  });
  for (const format of [SOP_DRAFT_FORMAT, SOP_NARRATIVE_FORMAT]) {
    await assert.rejects(
      generateSopJson({
        apiKey: "fixture",
        prompt: "Fixture",
        format,
        fetchImpl: async () => {
          throw new DOMException("Timed out", "TimeoutError");
        },
      }),
      {
        code: "deadline-exceeded",
        message: "SOP generation timed out. Try generating the draft again.",
      },
    );
  }
  assert.deepEqual(timeouts, [SOP_DOCUMENT_TIMEOUT_MS, 90000]);
});
