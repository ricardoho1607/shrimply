"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const backendRequire = require("node:module").createRequire(
  path.resolve("functions/package.json"),
);
const {
  MODEL,
  EVALUATOR_VERSION,
  narrativePrompt,
} = require("../../functions/sop/narrative");
const {
  assessNarrative,
} = require("../../functions/shared/orsonDomain/sop/engine");
(async () => {
  let apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey && process.env.SOP_CALIBRATION_ENV) {
    const text = fs.readFileSync(process.env.SOP_CALIBRATION_ENV, "utf8");
    apiKey =
      text.trim().match(/^AIza[\w-]+$/)?.[0] ||
      text
        .match(/^GEMINI_API_KEY\s*=\s*([^\r\n]+)/m)?.[1]
        ?.trim()
        .replace(/^["']|["']$/g, "");
  }
  assert.ok(
    apiKey,
    "Set GEMINI_API_KEY or SOP_CALIBRATION_ENV to an authorized local secret file.",
  );
  const { GoogleGenerativeAI } = backendRequire("@google/generative-ai");
  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: MODEL,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0,
      },
    }),
    results = [];
  for (const fixture of require("./narrative-fixtures.json")) {
    const evidenceId = `fixture-${fixture.id}`,
      response = await model.generateContent([
        narrativePrompt({
          rubric: fixture.rubric,
          instructions: "Record direct inspection observations.",
          evidenceId,
          notes: fixture.notes,
        }),
      ]);
    const judgment = JSON.parse(response.response.text()),
      decision = assessNarrative({
        severity: "low",
        calibrated: true,
        allowedIds: [evidenceId],
        ...judgment,
      });
    const acceptable =
      fixture.expected === "pass"
        ? decision === "pass"
        : decision === "needs_review";
    results.push({
      id: fixture.id,
      expected: fixture.expected,
      result: judgment.result,
      confidence: judgment.confidence,
      decision,
      acceptable,
    });
  }
  const report = {
    modelId: MODEL,
    evaluatorVersion: EVALUATOR_VERSION,
    fixtureSuite: "sop-narrative-v1",
    testedAt: new Date().toISOString(),
    results,
    passed: results.every((r) => r.acceptable),
  };
  fs.mkdirSync("artifacts/sop", { recursive: true });
  fs.writeFileSync(
    "artifacts/sop/narrative-calibration.json",
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify({
      modelId: MODEL,
      passed: report.passed,
      fixtures: results.length,
      failed: results.filter((r) => !r.acceptable).map((r) => r.id),
    }),
  );
  if (!report.passed) process.exitCode = 1;
})().catch((e) => {
  console.error(
    "Narrative calibration unavailable:",
    e.constructor?.name || "Unknown error",
  );
  process.exitCode = 1;
});
