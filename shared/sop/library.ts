import type { SopDefinition } from "./contracts";
import { validateSop } from "./engine";

export function sopLibrarySummary(definition: SopDefinition) {
  const sections = definition.content?.sections || [];
  const readableSections = sections.filter(
    (section) =>
      section.body?.trim() ||
      section.tables?.some((table) => table.rows?.length),
  ).length;
  return {
    readableSections,
    checks: definition.steps?.length || 0,
    issues: validateSop(definition).length,
  };
}
