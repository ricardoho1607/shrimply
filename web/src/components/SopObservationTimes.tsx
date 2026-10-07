"use client";
import { SOP_FIELDS } from "../../../shared/sop/registry";
export function SopObservationTimes({
  values,
  times,
  onChange,
}: {
  values: Record<string, unknown>;
  times: Record<string, string>;
  onChange: (times: Record<string, string>) => void;
}) {
  const fields = SOP_FIELDS.filter(
    (f) =>
      f.key.startsWith("water.") &&
      values[f.key.split(".").pop()!] !== null &&
      values[f.key.split(".").pop()!] !== undefined &&
      values[f.key.split(".").pop()!] !== "",
  );
  return (
    <details
      style={{
        gridColumn: "1 / -1",
        padding: 14,
        border: "1px solid #c9dae6",
        borderRadius: 8,
      }}
    >
      <summary>Observation times for SOP checks</summary>
      <p>
        Enter when each reading was measured, including timezone. Blank times
        retain date-only evidence.
      </p>
      {fields.map((f) => {
        const key = f.key.split(".").pop()!;
        return (
          <label key={key} style={{ display: "block", margin: "10px 0" }}>
            {f.label}
            <input
              aria-label={`${f.label} observation time`}
              value={times[key] || ""}
              onChange={(e) => onChange({ ...times, [key]: e.target.value })}
              placeholder="2026-10-08T06:30+07:00"
              className="form-input"
            />
          </label>
        );
      })}
    </details>
  );
}
