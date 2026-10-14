import type { SopWorkspace } from "./client";
import type { SopAdoption, SopTarget } from "./contracts";

export function existingSopAdoption(
  adoptions: SopAdoption[],
  sopId: string,
): SopAdoption | undefined {
  const active = adoptions.filter(
    (ad) => ad.sopId === sopId && ad.status === "active",
  );
  return active.length === 1 ? active[0] : undefined;
}

export interface AdoptionPond {
  id: string;
  name: string;
  blockId: string;
  activeCycle: boolean;
  stockingDate: string;
}

// A physical pond can have several historical cycle records. Select it once.
export function adoptionPonds(
  workspace: Pick<SopWorkspace, "physicalPonds" | "ponds">,
): AdoptionPond[] {
  const byId = new Map<string, AdoptionPond>();
  for (const pond of workspace.physicalPonds) {
    if (!pond.id) continue;
    byId.set(pond.id, {
      id: pond.id,
      name: pond.pondName || pond.id,
      blockId: pond.blockId || "",
      activeCycle: false,
      stockingDate: "",
    });
  }
  for (const pond of workspace.ponds) {
    const id = pond.physicalPondId || pond.id;
    if (!id) continue;
    const previous = byId.get(id);
    const active = pond.cycleStatus !== "ended";
    byId.set(id, {
      id,
      name: previous?.name || pond.pondName || id,
      blockId: previous?.blockId ?? pond.blockId ?? "",
      activeCycle: previous?.activeCycle === true || active,
      stockingDate: previous?.stockingDate || (active ? pond.stockingDate : ""),
    });
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function toggleAdoptionSelection(
  values: string[],
  id: string,
): string[] {
  return values.includes(id)
    ? values.filter((value) => value !== id)
    : [...values, id];
}

export interface AdoptionPreview {
  ok: true;
  targets: SopTarget[];
  conflicts: string[];
  versionId: string;
  generatedSteps: number;
  targetSignature?: string;
}

export function adoptionPreview(
  result: Record<string, unknown>,
): AdoptionPreview {
  if (
    result.ok !== true ||
    !Array.isArray(result.targets) ||
    !result.targets.length ||
    !result.targets.every(
      (target) =>
        target &&
        typeof target.id === "string" &&
        typeof target.name === "string" &&
        typeof target.assigneeId === "string" &&
        typeof target.stage === "string" &&
        ["pond", "block", "company"].includes(target.scope),
    ) ||
    !Array.isArray(result.conflicts) ||
    !result.conflicts.every((conflict) => typeof conflict === "string") ||
    !Number.isInteger(result.generatedSteps) ||
    Number(result.generatedSteps) < 1 ||
    typeof result.versionId !== "string" ||
    !result.versionId
  ) {
    throw new Error(
      "The adoption preview was not confirmed. Review the selected ponds and try again.",
    );
  }
  return result as unknown as AdoptionPreview;
}

export function confirmedAdoption(result: Record<string, unknown>): string {
  if (
    result.ok !== true ||
    typeof result.adoptionId !== "string" ||
    !result.adoptionId
  ) {
    throw new Error(
      "The adoption was not confirmed. Refresh before trying again.",
    );
  }
  return result.adoptionId;
}
