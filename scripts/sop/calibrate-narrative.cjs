"use strict";
const fs = require("node:fs");
const {
  MODEL,
  EVALUATOR_VERSION,
  CALIBRATION_ID,
  narrativePrompt,
} = require("../../functions/sop/narrative");
const {
  assessNarrative,
} = require("../../functions/shared/orsonDomain/sop/engine");
(async () => {
  const apiKey = require("./model-key.cjs").loadSopModelKey();
  const {
    generateSopJson,
    SOP_NARRATIVE_FORMAT,
  } = require("../../functions/sop/model");
  const results = [];
  for (const fixture of require("./narrative-fixtures.json")) {
    const evidenceId = `fixture-${fixture.id}`;
    const judgment = await generateSopJson({
      apiKey,
      prompt: narrativePrompt({
        rubric: fixture.rubric,
        instructions: "Record direct inspection observations.",
        evidenceId,
        notes: fixture.notes,
      }),
      format: SOP_NARRATIVE_FORMAT,
    });
    const decision = assessNarrative({
      severity: "low",
      calibrated: true,
      allowedIds: [evidenceId],
      ...judgment,
    });
    const acceptable =
      fixture.expected === "pass"
        ? decision === "pass"
        : decision === "needs_review";
    console.log(
      `Calibration ${fixture.id}: ${decision} (${acceptable ? "PASS" : "FAIL"})`,
    );
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
    calibrationId: CALIBRATION_ID,
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
