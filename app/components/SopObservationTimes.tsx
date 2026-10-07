import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { SOP_FIELDS } from "../../shared/sop/registry";
export function SopObservationTimes({
  values,
  times,
  onChange,
}: {
  values: Record<string, unknown>;
  times: Record<string, string>;
  onChange: (times: Record<string, string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const fields = SOP_FIELDS.filter(
    (f) =>
      f.key.startsWith("water.") &&
      values[f.key.split(".").pop()!] !== null &&
      values[f.key.split(".").pop()!] !== undefined &&
      values[f.key.split(".").pop()!] !== "",
  );
  return (
    <View style={{ marginVertical: 14 }}>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => setOpen((v) => !v)}
      >
        <Text style={{ fontSize: 15, fontWeight: "600", color: "#0F4C75" }}>
          Observation times for SOP checks {open ? "−" : "+"}
        </Text>
      </TouchableOpacity>
      {open && (
        <>
          <Text style={{ color: "#526b7d", marginVertical: 8 }}>
            Enter when each reading was measured, including timezone, for
            example 2026-10-08T06:30+07:00. Blank times retain date-only
            evidence.
          </Text>
          {fields.map((f) => {
            const key = f.key.split(".").pop()!;
            return (
              <View key={key} style={{ marginVertical: 6 }}>
                <Text>{f.label}</Text>
                <TextInput
                  accessibilityLabel={`${f.label} observation time`}
                  value={times[key] || ""}
                  onChangeText={(value) => onChange({ ...times, [key]: value })}
                  placeholder="YYYY-MM-DDTHH:MM+07:00"
                  style={{
                    borderWidth: 1,
                    borderColor: "#c9dae6",
                    borderRadius: 7,
                    padding: 10,
                    marginTop: 5,
                  }}
                />
              </View>
            );
          })}
        </>
      )}
    </View>
  );
}
