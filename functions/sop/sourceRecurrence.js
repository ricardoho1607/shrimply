"use strict";

// Read the instruction belonging to this check, never another chapter's interval.
function sourceRepeatDays(text) {
  const values = [];
  for (const pattern of [
    /\b(?:setiap|tiap|every)\s+(\d+)\s*(?:hari|days?)\b/gi,
    /(?<![\d.,-])\b(\d+)\s*hari\s+sekali\b/gi,
  ])
    for (const match of String(text || "").matchAll(pattern)) {
      if (/\d\s*[-–]\s*$/.test(String(text || "").slice(0, match.index))) continue;
      values.push(Number(match[1]));
    }
  const unique = [...new Set(values)];
  return unique.length === 1 && unique[0] >= 1 && unique[0] <= 365
    ? unique[0]
    : null;
}

function applySourceRecurrence(definition) {
  if (!Array.isArray(definition?.steps)) return definition;
  return {
    ...definition,
    steps: definition.steps.map((step) => {
      const everyDays = sourceRepeatDays(step?.instructions);
      if (
        !everyDays ||
        !step.trigger ||
        step.scope !== "pond" ||
        !Array.isArray(step.stages) ||
        !step.stages.length ||
        step.stages.some((stage) => !["stocking", "growout"].includes(stage)) ||
        !["manual", "daily", "doc"].includes(step.trigger.kind)
      )
        return step;
      // Preserve an explicit DOC anchor/window. Without a clock instruction,
      // a manual interval becomes a whole-day check counted from stocking.
      return {
        ...step,
        trigger: step.trigger.kind === "doc"
          ? { ...step.trigger, everyDays }
          : {
              ...step.trigger,
              kind: "doc",
              docFrom: everyDays,
              docTo: Math.max(everyDays, step.trigger.docTo || 365),
              everyDays,
              ...(step.trigger.kind === "manual"
                ? { at: "00:00", windowMinutes: 1440 }
                : {}),
            },
      };
    }),
  };
}

module.exports = { sourceRepeatDays, applySourceRecurrence };
