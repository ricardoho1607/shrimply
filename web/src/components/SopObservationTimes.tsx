"use client";
import { SopDateTimeInput } from "./SopDateTimeInput";
import { useAuth } from "@/contexts/AuthContext";
import { SOP_FIELDS } from "../../../shared/sop/registry";
import { sopText } from "../../../shared/sop/uiCopy";
import { sopMeasurementLabel } from "../../../shared/sop/editor";
import { useLanguage } from "@/contexts/LanguageContext";
export function SopObservationTimes({
  values,
  times,
  onChange,
}: {
  values: Record<string, unknown>;
  times: Record<string, string>;
  onChange: (times: Record<string, string>) => void;
}) {
  const { company } = useAuth();
  const { currentLanguage } = useLanguage();
  const ui = (value: string) => sopText(value, currentLanguage);
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
      <summary>{ui("Observation times for SOP checks")}</summary>
      <p>
        {ui(
          "Choose when each reading was taken in farm time. Leave blank only when a date is enough.",
        )}
      </p>
      {fields.map((f) => {
        const key = f.key.split(".").pop()!;
        return (
          <SopDateTimeInput key={key} label={sopMeasurementLabel(f.key, currentLanguage)}
            language={currentLanguage} timeZone={company?.timeZone || "UTC"}
            value={times[key] || ""} onChange={value => onChange({ ...times, [key]: value })} />
        );
      })}
    </details>
  );
}
