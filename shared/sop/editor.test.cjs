const test = require("node:test");
const assert = require("node:assert/strict");
const { emptySopStep } = require("./contracts.ts");
const {
  sopCheckModes,
  sopSimpleCheckModes,
  sopTargetLabel,
  sopEditorIssue,
  sopMeasurementLabel,
  sopTimingLabel,
} = require("./editor.ts");
const { SOP_FIELDS } = require("./registry.ts");
const { sopText } = require("./uiCopy.ts");
test("readers show H- preparation dates and DOC milestones without changing their schedules", () => {
  const step = emptySopStep();
  step.trigger = { ...step.trigger, kind: "doc", docFrom: -20, docTo: -1 };
  assert.match(sopTimingLabel(step, "en"), /H−20 – H−1/);
  step.trigger.docFrom = 30;
  step.trigger.docTo = 30;
  assert.match(sopTimingLabel(step, "en"), /DOC 30/);
});

test("simple checks offer the relevant farmer choices without losing advanced or saved rules", () => {
  const step = emptySopStep();
  assert.deepEqual(sopSimpleCheckModes(step), ["present", "range"]);
  assert.ok(sopCheckModes(step).includes("trend"));
  step.check.operator = "trend";
  assert.ok(sopSimpleCheckModes(step).includes("trend"));
  step.check.field = "manual";
  step.check.operator = "narrative";
  assert.deepEqual(sopSimpleCheckModes(step), ["present", "narrative"]);
  assert.ok(!sopCheckModes(step).includes("range"));
  // An old invalid selection must remain visible for correction, never silently reset.
  step.check.operator = "range";
  const before = structuredClone(step);
  assert.ok(sopSimpleCheckModes(step).includes("range"));
  assert.deepEqual(step, before);
});

test("target overview distinguishes recording from active limits and retains zero and one-sided targets", () => {
  const step = emptySopStep();
  step.check.operator = "present";
  step.check.min = 0;
  step.check.max = 0.2;
  assert.equal(sopTargetLabel(step, "en"), "A record exists");
  step.check.operator = "range";
  assert.equal(sopTargetLabel(step, "en"), "0 – 0.2 mg/L");
  step.check.min = null;
  assert.equal(sopTargetLabel(step, "en"), "≤ 0.2 mg/L");
  step.check.max = null;
  assert.equal(sopTargetLabel(step, "en"), "Target not set");
  step.check.min = 5;
  assert.equal(sopTargetLabel(step, "en"), "≥ 5 mg/L");
  step.check.operator = "trend";
  assert.equal(sopTargetLabel(step, "en"), "Change: ≥ 5 mg/L");
});

test("editor guidance names the step and provides a localized instruction without masking other validation", () => {
  const issue = "Catat DO pagi: Provide corrective guidance.";
  assert.equal(
    sopEditorIssue(issue, "en"),
    "Catat DO pagi: Add instructions for staff when this check fails.",
  );
  assert.equal(
    sopEditorIssue(issue, "id"),
    "Catat DO pagi: Tambahkan instruksi untuk staf saat pemeriksaan gagal.",
  );
  assert.equal(
    sopEditorIssue("Catat DO pagi: Unrecognized server error.", "en"),
    "Catat DO pagi: Unrecognized server error.",
  );
  assert.equal(
    sopMeasurementLabel("water.doMorning", "en"),
    "Dissolved oxygen (morning)",
  );
});

test("Indonesian covers every measurement option and translates validation without changing the step name", () => {
  for (const field of SOP_FIELDS) {
    assert.notEqual(
      sopMeasurementLabel(field.key, "id"),
      sopMeasurementLabel(field.key, "en"),
      field.key,
    );
  }
  assert.equal(
    sopText("Does not block stage changes", "id"),
    "Tidak membatasi tahap",
  );
  assert.equal(
    sopEditorIssue("Catat DO pagi: Invalid stage gate.", "id"),
    "Catat DO pagi: Pilih tahap produksi yang tersedia.",
  );
});

test("warning links keep identical check names and repeated source notes distinct", () => {
  const { sopIssueLinks } = require("./editor.ts");
  const first = emptySopStep("oxygen-a"),
    second = emptySopStep("oxygen-b");
  first.title = second.title = "Check oxygen: morning";
  first.check.operator = second.check.operator = "range";
  first.check.min = second.check.min = null;
  first.check.max = second.check.max = null;
  const definition = {
    title: "Water",
    description: "",
    language: "id",
    content: {
      sections: [
        {
          id: "water",
          title: "Water",
          body: "Read the meter",
          sourcePages: [],
          tables: [],
        },
      ],
      omissions: ["Confirm dose", "Confirm dose"],
    },
    steps: [first, second],
  };
  const links = sopIssueLinks(definition);
  assert.deepEqual(
    links.slice(0, 2).map((item) => item.target),
    ["sop-omission-0", "sop-omission-1"],
  );
  assert.deepEqual(
    links
      .filter((item) => /farm-approved/.test(item.issue))
      .map((item) => item.target),
    ["sop-check-oxygen-a-limits", "sop-check-oxygen-b-limits"],
  );
  assert.deepEqual(
    links
      .filter((item) => /corrective guidance/.test(item.issue))
      .map((item) => item.target),
    [],
  );
  first.check.field = "manual";
  first.check.operator = "narrative";
  first.check.unit = "";
  first.check.exactTime = false;
  first.check.rubric = "";
  assert.equal(
    sopIssueLinks(definition).some((item) => /rubric/.test(item.issue)),
    false,
  );
  definition.title = "";
  assert.equal(sopIssueLinks(definition)[0].target, "sop-title");
});
