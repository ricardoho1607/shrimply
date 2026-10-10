import {
  SOP_ID,
  SOP_STAGES,
  type SopDefinition,
  type SopStep,
  type SopEvidence,
  type SopResult,
  type SopTarget,
} from "./contracts";
import { sopField } from "./registry";
import { validateSopContent } from "./content";
import { sopCycleDay } from "./lifecycle";
export const finiteSopNumber = (value: unknown): number | null => {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (
    typeof value === "string" &&
    !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim())
  )
    return null;
  return Number.isFinite(Number(value)) ? Number(value) : null;
};
export function validateSop(definition: SopDefinition): string[] {
  const errors: string[] = [];
  if (
    !definition ||
    typeof definition !== "object" ||
    !Array.isArray(definition.steps)
  )
    return ["A structured SOP is required."];
  if (!definition.title?.trim() || definition.title.length > 200)
    errors.push("Enter a title of at most 200 characters.");
  if (
    typeof definition.description !== "string" ||
    definition.description.length > 10000
  )
    errors.push("Description is too long.");
  if (!["en", "id", "vi", "th", "zh"].includes(definition.language))
    errors.push("Choose a supported original language.");
  if (definition.content !== undefined)
    errors.push(...validateSopContent(definition.content));
  if (
    definition.attachments &&
    (!Array.isArray(definition.attachments) ||
      definition.attachments.length > 10)
  )
    errors.push("Attach at most ten guidance files.");
  if (!definition.steps.length || definition.steps.length > 60)
    errors.push("An SOP needs between 1 and 60 steps.");
  const ids = new Set(definition.steps.map((step) => step?.id));
  if (ids.size !== definition.steps.length)
    errors.push("Step IDs must be unique.");
  for (const s of definition.steps) {
    if (
      !s ||
      !SOP_ID.test(s.id) ||
      !s.title?.trim() ||
      s.title.length > 200 ||
      typeof s.instructions !== "string"
    ) {
      errors.push("Every step needs an ID, title, and instructions.");
      continue;
    }
    const prefix = `${s.title}: `;
    if (
      !["pond", "block", "company"].includes(s.scope) ||
      !["low", "warning", "critical"].includes(s.severity) ||
      !Array.isArray(s.stages) ||
      !s.stages.length ||
      s.stages.some((stage) => !SOP_STAGES.includes(stage))
    )
      errors.push(prefix + "Choose scope, severity, and stages.");
    if (
      !s.trigger ||
      !["daily", "weekly", "doc", "event", "stage", "manual"].includes(
        s.trigger.kind,
      ) ||
      typeof s.trigger.at !== "string" ||
      ((["daily", "weekly", "doc"].includes(s.trigger.kind) ||
        s.trigger.at !== "") &&
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.trigger.at))
    ) {
      errors.push(prefix + "Invalid schedule.");
      continue;
    }
    for (const [name, value] of Object.entries({
      windowMinutes: s.trigger.windowMinutes,
      everyDays: s.trigger.everyDays,
      recheckMinutes: s.recheckMinutes,
      maxRechecks: s.maxRechecks,
      escalationMinutes: s.escalationMinutes,
    }))
      if (!Number.isInteger(value) || value < 1 || value > 525600)
        errors.push(prefix + `Invalid ${name}.`);
    if (s.maxRechecks > 20)
      errors.push(prefix + "Limit automatic rechecks to 20.");
    if (
      !Array.isArray(s.trigger.weekDays) ||
      s.trigger.weekDays.some(
        (day) => !Number.isInteger(day) || day < 0 || day > 6,
      )
    )
      errors.push(prefix + "Invalid weekdays.");
    if (
      ![s.trigger.docFrom, s.trigger.docTo, s.trigger.offsetMinutes].every(
        Number.isInteger,
      ) ||
      s.trigger.docTo < s.trigger.docFrom ||
      s.trigger.offsetMinutes < 0
    )
      errors.push(prefix + "Invalid DOC/event window.");
    if (
      s.trigger.kind === "doc" &&
      Array.isArray(s.stages) &&
      s.trigger.docFrom < 0 &&
      (s.trigger.docTo >= 0 ||
        s.stages.some((stage) => stage !== "preparation"))
    )
      errors.push(
        prefix +
          "Before-stocking days require preparation only and must end before DOC0.",
      );
    if (
      s.trigger.kind === "doc" &&
      Array.isArray(s.stages) &&
      s.trigger.docFrom >= 0 &&
      s.stages.includes("preparation")
    )
      errors.push(
        prefix +
          "DOC0 and later require a stocked stage; use negative days for preparation.",
      );
    if (s.trigger.kind === "event" && !s.trigger.event)
      errors.push(prefix + "Choose an event.");
    const f = sopField(s.check?.field);
    if (
      !f ||
      ![
        "present",
        "range",
        "equals",
        "count",
        "trend",
        "sequence",
        "narrative",
      ].includes(s.check.operator)
    ) {
      errors.push(prefix + "Choose a supported check.");
      continue;
    }
    if (
      [
        "inventory.totalStock",
        "treatment.quantity",
        "equipment.maintenance",
      ].includes(s.check.field) &&
      !(
        SOP_ID.test(s.check.sourceId || "") ||
        /^(feeds|additives|assets)\/[A-Za-z0-9_-]{1,160}$/.test(
          s.check.sourceId || "",
        )
      )
    )
      errors.push(
        prefix +
          "Bind this check to a specific inventory item or equipment record.",
      );
    if (
      s.check.sourceId?.includes("/") &&
      !(f.sources || [f.source]).includes(s.check.sourceId.split("/")[0])
    )
      errors.push(prefix + "Bind this check to a supported source.");
    if (
      ["inventory.totalStock", "treatment.quantity"].includes(s.check.field) &&
      !s.check.unit.trim()
    )
      errors.push(prefix + "Specify the inventory or treatment unit.");
    if (f.scopes && !f.scopes.includes(s.scope))
      errors.push(
        prefix + `This check supports ${f.scopes.join(" / ")} scope.`,
      );
    if (f.checks && !f.checks.includes(s.check.operator))
      errors.push(prefix + "This source does not support that condition.");
    if (s.trigger.kind === "doc" && s.scope !== "pond")
      errors.push(
        prefix +
          "DOC schedules require pond scope. Shared work uses a calendar schedule or a recorded event.",
      );
    if (s.check.exactTime && !f.exactTime)
      errors.push(
        prefix + "This record cannot prove an exact observation time.",
      );
    if (f.unit && s.check.unit !== f.unit)
      errors.push(prefix + `Use ${f.unit}.`);
    if (
      f.basis &&
      !(f.source === "labReports"
        ? s.check.basis === f.basis
        : ["TAN-N", "TAN", "NH3-N", "NH3", "NO2-N", "NO2"].includes(
            s.check.basis,
          ))
    )
      errors.push(prefix + "Specify the analytical basis.");
    if (
      s.trigger.kind === "event" &&
      ![
        "stocking",
        "harvest",
        "treatment",
        "measurement",
        ...definition.steps.map((step) => `step:${step.id}`),
      ].includes(s.trigger.event)
    )
      errors.push(prefix + "Choose a supported event or completed step.");
    if (s.check.operator === "range" || s.check.operator === "trend") {
      if (s.check.min === null && s.check.max === null)
        errors.push(prefix + "Set a farm-approved minimum or maximum.");
      if (
        [s.check.min, s.check.max].some(
          (v) => v !== null && (typeof v !== "number" || !Number.isFinite(v)),
        )
      )
        errors.push(prefix + "Limits must be finite numbers.");
      if (
        s.check.min !== null &&
        s.check.max !== null &&
        s.check.min > s.check.max
      )
        errors.push(prefix + "Minimum exceeds maximum.");
    }
    if (
      !Number.isInteger(s.check.minCount) ||
      s.check.minCount < 1 ||
      s.check.minCount > 100 ||
      !Number.isInteger(s.check.freshnessMinutes) ||
      s.check.freshnessMinutes < 1
    )
      errors.push(prefix + "Invalid evidence count/freshness.");
    if (
      (s.check.operator === "equals" || s.check.operator === "sequence") &&
      !s.check.value.trim()
    )
      errors.push(prefix + "Specify the required value or sequence.");
    if (s.gateStage && !SOP_STAGES.includes(s.gateStage))
      errors.push(prefix + "Invalid stage gate.");
    for (const links of [s.dependsOn, s.onPass, s.onFail])
      if (
        !Array.isArray(links) ||
        links.some((id) => !ids.has(id) || id === s.id)
      )
        errors.push(prefix + "Invalid step reference.");
  }
  const visiting = new Set<string>(),
    visited = new Set<string>();
  const visit = (id: string): void => {
    if (visiting.has(id)) {
      errors.push(
        "Workflow branches and dependencies must not contain cycles. Use bounded rechecks.",
      );
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    const s = definition.steps.find((step) => step.id === id);
    for (const next of [
      ...definition.steps
        .filter((step) => step.trigger?.event === `step:${id}`)
        .map((step) => step.id),
      ...(s?.onPass || []),
      ...(s?.onFail || []),
      ...definition.steps
        .filter((step) => step.dependsOn?.includes(id))
        .map((step) => step.id),
    ])
      visit(next);
    visiting.delete(id);
    visited.add(id);
  };
  ids.forEach(visit);
  return [...new Set(errors)];
}
export interface SopEvaluation {
  result: SopResult;
  recorded: boolean;
  evidenceIds: string[];
  explanation: string;
}
export function evaluateSopStep(
  step: SopStep,
  evidence: SopEvidence[],
  context: {
    target: SopTarget;
    start: number;
    end: number;
    now: number;
    timeZone: string;
  },
): SopEvaluation {
  const units: Record<string, { dimension: string; factor: number }> = {
    "mg/L": { dimension: "concentration", factor: 1 },
    "g/L": { dimension: "concentration", factor: 1000 },
    "µg/L": { dimension: "concentration", factor: 0.001 },
    "ug/L": { dimension: "concentration", factor: 0.001 },
    kg: { dimension: "mass", factor: 1000 },
    g: { dimension: "mass", factor: 1 },
    mg: { dimension: "mass", factor: 0.001 },
    cm: { dimension: "length", factor: 1 },
    m: { dimension: "length", factor: 100 },
    mm: { dimension: "length", factor: 0.1 },
  };
  const normalized = evidence.map((item) => {
    const e =
      item.observedAt === null
        ? item
        : { ...item, date: farmDate(item.observedAt, context.timeZone) };
    if (!step.check.unit || e.unit === step.check.unit) return e;
    const value = finiteSopNumber(e.value),
      from = units[e.unit],
      to = units[step.check.unit];
    if (value !== null && from && to && from.dimension === to.dimension)
      return {
        ...e,
        value: (value * from.factor) / to.factor,
        unit: step.check.unit,
      };
    if (value !== null && e.unit === "°F" && step.check.unit === "°C")
      return { ...e, value: ((value - 32) * 5) / 9, unit: "°C" };
    return e;
  });
  const valid = normalized.filter(
    (e) =>
      !e.deleted &&
      !e.estimated &&
      e.field === step.check.field &&
      (!step.check.sourceId ||
        (step.check.sourceId.includes("/")
          ? e.sourcePath === step.check.sourceId
          : e.sourcePath.split("/").pop() === step.check.sourceId)) &&
      e.targetId === context.target.id &&
      e.cycleId === context.target.cycleId &&
      e.value !== null &&
      e.value !== "" &&
      (!step.check.unit || e.unit === step.check.unit) &&
      (!step.check.basis || e.basis === step.check.basis) &&
      (step.check.exactTime
        ? e.precision === "instant" &&
          e.observedAt !== null &&
          e.observedAt >=
            (["trend", "count", "sequence"].includes(step.check.operator)
              ? context.now - step.check.freshnessMinutes * 60000
              : context.start) &&
          e.observedAt <= context.end
        : e.date >=
            farmDate(
              ["trend", "count", "sequence"].includes(step.check.operator)
                ? context.now - step.check.freshnessMinutes * 60000
                : context.start,
              context.timeZone,
            ) && e.date <= farmDate(context.end, context.timeZone)) &&
      (e.observedAt === null
        ? e.date >=
          farmDate(
            context.now - step.check.freshnessMinutes * 60000,
            context.timeZone,
          )
        : e.observedAt <= context.now &&
          e.observedAt >= context.now - step.check.freshnessMinutes * 60000),
  );
  valid.sort(
    (a, b) =>
      (a.observedAt ?? Date.parse(a.date + "T00:00Z")) -
      (b.observedAt ?? Date.parse(b.date + "T00:00Z")),
  );
  const ids = valid.map((e) => `${e.id}:${e.revision}`);
  if (
    valid.some(
      (e, i) =>
        i > 0 &&
        (e.observedAt ?? e.date) ===
          (valid[i - 1].observedAt ?? valid[i - 1].date) &&
        ((["sequence", "trend"].includes(step.check.operator) &&
          e.observedAt === null) ||
          JSON.stringify(e.value) !== JSON.stringify(valid[i - 1].value)),
    )
  )
    return {
      result: "needs_review",
      recorded: true,
      evidenceIds: ids,
      explanation:
        "Conflicting or unordered observations require human review; date-only records cannot establish order within a day.",
    };
  if (step.check.field === "manual")
    return {
      result: "needs_review",
      recorded: false,
      evidenceIds: [],
      explanation:
        "Submitted evidence requires assessment against the approved instructions.",
    };
  if (valid.length < step.check.minCount)
    return {
      result: "insufficient_evidence",
      recorded: false,
      evidenceIds: ids,
      explanation:
        "Missing qualifying evidence for this target, cycle, measurement window, unit, or analytical basis.",
    };
  if (
    step.check.field !== "manual" &&
    ![
      "water.weatherEvent",
      "water.sludgeLoad",
      "water.surfaceScum",
      "water.shrimpBehaviour",
      "lab.status",
      "equipment.maintenance",
      "lifecycle.status",
    ].includes(step.check.field) &&
    valid.some((e) => finiteSopNumber(e.value) === null)
  )
    return {
      result: "insufficient_evidence",
      recorded: false,
      evidenceIds: ids,
      explanation: "Invalid numeric source evidence.",
    };
  let pass = true;
  const latest = valid[valid.length - 1];
  if (step.check.operator === "range" || step.check.operator === "trend") {
    const number =
      step.check.operator === "trend"
        ? valid.length >= 2
          ? (finiteSopNumber(latest.value) ?? NaN) -
            (finiteSopNumber(valid[0].value) ?? NaN)
          : null
        : finiteSopNumber(latest.value);
    if (number === null || !Number.isFinite(number))
      return {
        result: "insufficient_evidence",
        recorded: false,
        evidenceIds: ids,
        explanation: "A measured numeric value is required.",
      };
    pass =
      (step.check.min === null || number >= step.check.min) &&
      (step.check.max === null || number <= step.check.max);
  } else if (step.check.operator === "equals")
    pass = String(latest.value) === step.check.value;
  else if (step.check.operator === "sequence") {
    const expected = step.check.value.split(",").map((v) => v.trim());
    const actual = valid
      .slice(-expected.length)
      .map((e) => String(e.value).trim());
    pass =
      actual.length === expected.length &&
      actual.every((v, i) => v === expected[i]);
  }
  return {
    result: pass ? "pass" : "fail",
    recorded: true,
    evidenceIds: ids,
    explanation: pass
      ? "Qualifying records meet the approved check."
      : "The procedure was recorded, but its result is outside the approved target.",
  };
}
export const farmDate = (ms: number, zone: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
export function localInstant(date: string, time: string, zone: string): number {
  const wanted = Date.parse(`${date}T${time}:00Z`);
  let candidate = wanted;
  const adjusted: number[] = [];
  for (let i = 0; i < 4; i++) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(candidate));
    const get = (type: string) => parts.find((p) => p.type === type)?.value;
    const actual = Date.parse(
      `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}Z`,
    );
    if (actual === wanted) return candidate;
    candidate += wanted - actual;
    adjusted.push(candidate);
  }
  // A non-existent DST clock time resolves to the first following valid hour.
  return Math.max(...adjusted);
}
export function scheduledOccurrence(
  step: SopStep,
  target: SopTarget,
  now: number,
  activatedAt: number,
  timeZone: string,
): { key: string; start: number; due: number } | null {
  if (
    !step.stages.includes(target.stage) ||
    ["event", "stage", "manual"].includes(step.trigger.kind)
  )
    return null;
  const date = farmDate(now, timeZone),
    dateMs = Date.parse(date + "T00:00:00Z");
  const beforeStocking = step.trigger.docTo < 0;
  if (
    step.trigger.kind === "doc" &&
    (beforeStocking
      ? target.stage !== "preparation" ||
        !!target.pondId ||
        !!target.stockingDate
      : target.stage === "preparation")
  )
    return null;
  const doc = sopCycleDay(
    date,
    beforeStocking
      ? target.plannedStockingDate || ""
      : target.stockingDate.slice(0, 10),
  );
  if (
    step.trigger.kind === "weekly" &&
    !step.trigger.weekDays.includes(new Date(dateMs).getUTCDay())
  )
    return null;
  if (
    step.trigger.kind === "doc" &&
    (doc === null ||
      doc < step.trigger.docFrom ||
      doc > step.trigger.docTo ||
      (doc - step.trigger.docFrom) % step.trigger.everyDays !== 0)
  )
    return null;
  if (
    step.trigger.kind === "daily" &&
    Math.floor(
      (dateMs - Date.parse(farmDate(activatedAt, timeZone) + "T00:00:00Z")) /
        86400000,
    ) %
      step.trigger.everyDays !==
      0
  )
    return null;
  const start = localInstant(date, step.trigger.at, timeZone),
    due = start + step.trigger.windowMinutes * 60000;
  if (now < start || due < activatedAt) return null;
  return { key: date, start: Math.max(start, activatedAt), due };
}
export function sopConflicts(
  definition: SopDefinition,
  existing: SopDefinition[],
): string[] {
  const errors: string[] = [];
  for (const a of definition.steps)
    for (const d of existing)
      for (const b of d.steps) {
        if (
          a.scope !== b.scope ||
          a.check.field !== b.check.field ||
          !a.stages.some((s) => b.stages.includes(s))
        )
          continue;
        if (
          a.title.trim().toLowerCase() === b.title.trim().toLowerCase() &&
          JSON.stringify(a.trigger) === JSON.stringify(b.trigger)
        ) {
          errors.push(
            `${a.title} conflicts with ${d.title}: duplicate competing steps need manager review.`,
          );
          if (a.gateStage && b.gateStage && a.gateStage !== b.gateStage)
            errors.push(
              `${a.title} conflicts with ${d.title}: contradictory stage requirements.`,
            );
        }
        if (
          a.check.operator === "range" &&
          b.check.operator === "range" &&
          Math.max(a.check.min ?? -Infinity, b.check.min ?? -Infinity) >
            Math.min(a.check.max ?? Infinity, b.check.max ?? Infinity)
        )
          errors.push(
            `${a.title} conflicts with ${d.title}: incompatible ranges.`,
          );
        if (
          a.check.operator === "equals" &&
          b.check.operator === "equals" &&
          a.check.value !== b.check.value
        )
          errors.push(
            `${a.title} conflicts with ${d.title}: incompatible required values.`,
          );
      }
  return [...new Set(errors)];
}
export function assessNarrative(input: {
  severity: string;
  confidence: number;
  result: string;
  citations: string[];
  allowedIds: string[];
  calibrated: boolean;
}): SopResult {
  if (!Array.isArray(input.citations) || !Array.isArray(input.allowedIds))
    return "needs_review";
  if (
    !input.calibrated ||
    input.severity !== "low" ||
    input.confidence < 0.9 ||
    !Number.isFinite(input.confidence) ||
    input.confidence > 1 ||
    input.result !== "pass" ||
    !input.citations.length ||
    input.citations.some((id) => !input.allowedIds.includes(id))
  )
    return "needs_review";
  return input.result as SopResult;
}
