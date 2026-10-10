import type {
  SopDefinition,
  SopOperator,
  SopStep,
  SopTrigger,
} from "./contracts";
import { SOP_FIELDS } from "./registry";
import { sopText } from "./uiCopy";
import { validateSop } from "./engine";

export const SOP_INTERFACE_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "id", name: "Bahasa Indonesia" },
  { code: "vi", name: "Tiếng Việt" },
  { code: "th", name: "ไทย" },
  { code: "zh", name: "中文" },
] as const;

const modes: Record<SopOperator, string> = {
  present: "A record exists",
  range: "Within limits",
  equals: "Matches a required result",
  count: "Enough records",
  trend: "Change stays within limits",
  sequence: "Follows a required order",
  narrative: "Review notes or photos",
};

export function sopCheckModeLabel(mode: SopOperator, language: string): string {
  return sopText(modes[mode], language);
}

export function sopScheduleLabel(
  kind: SopTrigger["kind"],
  language: string,
): string {
  const labels = {
    daily: "Daily",
    weekly: "Weekly",
    doc: "By days of culture",
    event: "After an event",
    stage: "At a production stage",
    manual: "When assigned manually",
  };
  return sopText(labels[kind], language);
}

export function sopCheckModes(step: SopStep): SopOperator[] {
  const supported =
    SOP_FIELDS.find((field) => field.key === step.check.field)?.checks || [];
  // Retain an unsupported saved selection so opening the editor never rewrites it.
  return Object.keys(modes).filter(
    (mode) => supported.includes(mode) || mode === step.check.operator,
  ) as SopOperator[];
}

export function sopSimpleCheckModes(step: SopStep): SopOperator[] {
  const supported = sopCheckModes(step);
  const primary: SopOperator[] =
    step.check.field === "manual"
      ? ["narrative", "present"]
      : supported.includes("range")
        ? ["present", "range"]
        : ["present", "equals"];
  return supported.filter(
    (mode) => primary.includes(mode) || mode === step.check.operator,
  );
}

export function sopTargetLabel(step: SopStep, language: string): string {
  if (step.check.operator !== "range" && step.check.operator !== "trend")
    return sopCheckModeLabel(step.check.operator, language);
  const { min, max, unit, basis } = step.check;
  if (min === null && max === null) return sopText("Target not set", language);
  const limits =
    min === null ? `≤ ${max}` : max === null ? `≥ ${min}` : `${min} – ${max}`;
  return `${step.check.operator === "trend" ? `${sopText("Change", language)}: ` : ""}${limits}${unit ? ` ${unit}` : ""}${basis ? ` (${basis})` : ""}`;
}

const measurements: Record<string, string> = {
  "water.doMorning": "Dissolved oxygen (morning)",
  "water.doEvening": "Dissolved oxygen (evening)",
  "water.phMorning": "pH (morning)",
  "water.phEvening": "pH (evening)",
  "water.temperatureMorning": "Temperature (morning)",
  "water.temperatureEvening": "Temperature (evening)",
  "water.salinity": "Salinity",
  "water.alkalinity": "Alkalinity",
  "water.ammonia": "Ammonia",
  "water.nitriteMgL": "Nitrite",
  "water.transparencyMorning": "Water transparency (morning)",
  "water.transparencyEvening": "Water transparency (evening)",
  "water.waterDepthCmMorning": "Water depth (morning)",
  "water.waterDepthCmEvening": "Water depth (evening)",
  "water.waterExchangePercent": "Water exchange (%)",
  "water.weatherEvent": "Weather observation",
  "water.sludgeLoad": "Sludge observation",
  "water.surfaceScum": "Surface scum observation",
  "water.shrimpBehaviour": "Shrimp behaviour",
  manual: "Notes or photos",
  "lab.phLab": "Lab pH",
  "lab.salinityLab": "Lab salinity",
  "lab.tan": "Lab total ammonia nitrogen",
  "lab.nh3": "Lab un-ionized ammonia",
  "lab.no2": "Lab nitrite",
  "lab.alkalinityTotal": "Lab alkalinity",
};

export function sopMeasurementLabel(key: string, language: string): string {
  return sopText(
    measurements[key] ||
      SOP_FIELDS.find((field) => field.key === key)?.label ||
      key,
    language,
  );
}

/** Keep validation intact; present its actionable instructions in the editor. */
export function sopEditorIssue(issue: string, language: string): string {
  const omissionPrefix = "Resolve omitted source content: ";
  if (issue.startsWith(omissionPrefix))
    return `${sopText("Source content still needs review", language)}: ${issue.slice(omissionPrefix.length)}`;
  const replacements: Record<string, string> = {
    "Provide corrective guidance.":
      "Add instructions for staff when this check fails.",
    "Set a farm-approved minimum or maximum.":
      "Enter a lower or upper limit approved for your farm.",
    "Narrative checks need a manual evidence rubric.":
      "For notes or photos, choose Review notes or photos and describe what staff must show.",
    "Minimum exceeds maximum.":
      "The lower limit must not exceed the upper limit.",
    "Specify the required value or sequence.":
      "Describe the required result or order.",
  };
  for (const [original, instruction] of Object.entries(replacements)) {
    if (issue.endsWith(original)) {
      return issue.slice(0, -original.length) + sopText(instruction, language);
    }
  }
  const separator = issue.lastIndexOf(": ");
  return separator < 0
    ? sopText(issue, language)
    : issue.slice(0, separator + 2) +
        sopText(issue.slice(separator + 2), language);
}

/** Stable editor anchors, independent of translated labels. */
export function sopIssueLinks(
  definition: SopDefinition,
): { issue: string; target: string }[] {
  const issues = validateSop(definition);
  const stepIssues = definition.steps.flatMap((step) =>
    validateSop({ ...definition, content: undefined, steps: [step] })
      .filter((issue) => issue.startsWith(`${step.title}: `))
      .map((issue) => ({ issue, step })),
  );
  const omissions = [...(definition.content?.omissions || [])];
  return issues.flatMap((issue) => {
    if (issue.startsWith("Resolve omitted source content: ")) {
      const note = issue.slice("Resolve omitted source content: ".length);
      return omissions.flatMap((value, index) =>
        value === note ? [{ issue, target: `sop-omission-${index}` }] : [],
      );
    }
    const matches = stepIssues.filter((item) => item.issue === issue);
    if (matches.length) {
      return matches.map(({ step }) => {
        const suffix = issue.slice(`${step.title}: `.length);
        const field =
          suffix === "Provide corrective guidance."
            ? "corrective"
            : /limits|minimum|maximum|farm-approved/i.test(suffix)
              ? "limits"
              : /rubric/i.test(suffix)
                ? "rubric"
                : /required value|sequence/i.test(suffix)
                  ? "value"
                  : /^Invalid schedule|weekdays|Choose.*event/i.test(suffix)
                    ? "schedule"
                    : /^Use |treatment unit/i.test(suffix)
                      ? "unit"
                      : /analytical/i.test(suffix)
                        ? "basis"
                        : /Bind this check/i.test(suffix)
                          ? "source"
                          : /supported check|condition/i.test(suffix)
                            ? "condition"
                            : "advanced";
        return { issue, target: `sop-check-${step.id}-${field}` };
      });
    }
    const target = /title of at most/i.test(issue)
      ? "sop-title"
      : /Description/.test(issue)
        ? "sop-description"
        : /original language/i.test(issue)
          ? "sop-language"
          : /document|Document|omission/.test(issue)
            ? "sop-procedure-editor"
            : /guidance files/.test(issue)
              ? "sop-attachments"
              : "sop-checks-editor";
    return [{ issue, target }];
  });
}
