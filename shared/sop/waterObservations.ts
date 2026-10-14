import { SOP_FIELDS } from "./registry";
interface WaterRecord {
  id?: string;
  date?: string;
  observedAtByField?: Record<string, string>;
  observationIdsByField?: Record<string, string>;
  [key: string]: unknown;
}
/** New timestamps append operational readings; edits at the same timestamp correct that reading. */
export function waterObservationChanges(
  pondId: string,
  previous: WaterRecord | undefined,
  next: WaterRecord,
) {
  const sampling = {
    ...next,
    observationIdsByField: {
      ...previous?.observationIdsByField,
      ...next.observationIdsByField,
    },
  };
  const observations: {
    id: string;
    field: string;
    value: unknown;
    observedAt: string;
    date: string;
    recordId: string;
    unit: string;
    basis: string;
    deleted: boolean;
  }[] = [];
  for (const f of SOP_FIELDS.filter((f) => f.key.startsWith("water."))) {
    const field = f.key.slice(6),
      time = next.observedAtByField?.[field];
    if (!time || !Number.isFinite(Date.parse(time))) continue;
    const id = `water-${pondId}-${field}-${Date.parse(time)}`;
    sampling.observationIdsByField[field] = id;
    const value = next[field];
    observations.push({
      id,
      field,
      value: value === undefined || value === "" ? null : value,
      observedAt: time,
      date: String(next.date || ""),
      recordId: String(next.id || ""),
      unit: f.unit,
      basis: String(
        field === "ammonia"
          ? next.ammoniaBasis || ""
          : field === "nitriteMgL"
            ? next.nitriteBasis || ""
            : "",
      ),
      deleted: value === undefined || value === null || value === "",
    });
  }
  return { sampling, observations };
}
