"use strict";
const fs = require("node:fs"),
  assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { loadSopModelKey } = require("./model-key.cjs");
const {
  generateSopJson,
  sopDraftPrompt,
  sopTranslationPrompt,
  SOP_DRAFT_FORMAT,
  SOP_TRANSLATION_FORMAT,
} = require("../../functions/sop/model");
const { checkDefinition } = require("../../functions/sop/service");
const { MODEL, CALIBRATION_ID } = require("../../functions/sop/narrative");

function fixturePdf(lines) {
  const text = lines
    .map(
      (line, i) =>
        `${i ? "0 -20 Td " : ""}(${line.replace(/[\\()]/g, "\\$&")}) Tj`,
    )
    .join("\n");
  const stream = `BT /F1 10 Tf 40 750 Td\n${text}\nET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}
async function main() {
  const apiKey = loadSopModelKey();
  const guideline = [
    "Synthetic acceptance fixture only; these are not farm recommendations.",
    "One pond-level step: record dissolved oxygen in the morning (water.doMorning).",
    "Daily at 06:00, measurement window 120 minutes. Stage growout. Severity warning.",
    "Fixture approved range 5 to 8 mg/L; exact observation time required.",
    "If outside range: inspect equipment, record findings and contact the manager.",
    "Recheck after 60 minutes; maximum 3 rechecks; escalate after 120 minutes.",
    "No dependencies or gates. Do not execute feeding, treatments or equipment actions.",
  ];
  const draft = checkDefinition(
    await generateSopJson({
      apiKey,
      prompt: sopDraftPrompt(guideline.join("\n"), "en"),
      format: SOP_DRAFT_FORMAT,
    }),
    true,
  );
  assert.ok(
    draft.steps.some(
      (step) =>
        step.check.field === "water.doMorning" &&
        step.check.min === 5 &&
        step.check.max === 8,
    ),
  );
  console.log("Meta structured text draft: PASS");
  const code = `META-SOP-${randomUUID().slice(0, 8)}`;
  const pdf = fixturePdf([`SOP title: ${code}`, ...guideline]);
  const pdfDraft = checkDefinition(
    await generateSopJson({
      apiKey,
      prompt: sopDraftPrompt("", "en"),
      format: SOP_DRAFT_FORMAT,
      files: [
        {
          type: "input_file",
          filename: "fixture.pdf",
          file_data: `data:application/pdf;base64,${pdf.toString("base64")}`,
        },
      ],
    }),
    true,
  );
  assert.ok(
    pdfDraft.title.includes(code),
    "The private PDF title must be read from the PDF, not supplied in the text prompt.",
  );
  assert.ok(
    pdfDraft.steps.some(
      (step) =>
        step.check.field === "water.doMorning" &&
        step.check.min === 5 &&
        step.check.max === 8,
    ),
  );
  console.log("Meta private inline PDF draft: PASS");
  const translated = await generateSopJson({
    apiKey,
    prompt: sopTranslationPrompt(draft, "id"),
    format: SOP_TRANSLATION_FORMAT,
  });
  assert.deepEqual(
    translated.steps.map((step) => step.id),
    draft.steps.map((step) => step.id),
  );
  assert.notEqual(
    translated.steps[0].instructions,
    draft.steps[0].instructions,
  );
  assert.ok(translated.steps[0].instructions.trim());
  const report = {
    modelId: MODEL,
    calibrationId: CALIBRATION_ID,
    testedAt: new Date().toISOString(),
    checks: [
      "text-draft",
      "private-pdf-draft",
      "identity-preserving-translation",
    ],
    passed: true,
  };
  fs.mkdirSync("artifacts/sop", { recursive: true });
  fs.writeFileSync(
    "artifacts/sop/meta-smoke.json",
    JSON.stringify(report, null, 2),
  );
  console.log("Meta workflow translation: PASS");
}
main().catch((error) => {
  console.error(
    "Meta SOP verification failed:",
    error.constructor?.name || "Unknown error",
    error.constructor?.name === "AssertionError" ? error.message : "",
  );
  process.exitCode = 1;
});
