export interface SopField {
  key: string;
  label: string;
  unit: string;
  source: string;
  sources?: string[];
  exactTime: boolean;
  basis?: string;
  permissions?: string[];
  scopes?: string[];
  checks?: string[];
}
export const SOP_FIELDS: SopField[] = [
  ...[
    "doMorning",
    "doEvening",
    "phMorning",
    "phEvening",
    "temperatureMorning",
    "temperatureEvening",
    "salinity",
    "alkalinity",
    "ammonia",
    "nitriteMgL",
    "transparencyMorning",
    "transparencyEvening",
    "waterDepthCmMorning",
    "waterDepthCmEvening",
    "waterExchangePercent",
  ].map((key) => ({
    key: `water.${key}`,
    label: key.replace(/([A-Z])/g, " $1"),
    unit:
      key.startsWith("do") ||
      ["alkalinity", "ammonia", "nitriteMgL"].includes(key)
        ? "mg/L"
        : key.startsWith("temperature")
          ? "°C"
          : key.startsWith("transparency") || key.startsWith("waterDepth")
            ? "cm"
            : key === "salinity"
              ? "ppt"
              : key === "waterExchangePercent"
                ? "%"
                : "",
    source: "ponds",
    exactTime: true,
    ...(["ammonia", "nitriteMgL"].includes(key)
      ? { basis: key === "ammonia" ? "TAN-N" : "NO2-N" }
      : {}),
  })),
  ...["weatherEvent", "sludgeLoad", "surfaceScum", "shrimpBehaviour"].map(
    (key) => ({
      key: `water.${key}`,
      label: key,
      unit: "",
      source: "ponds",
      exactTime: true,
    }),
  ),
  {
    key: "sampling.mbw",
    label: "Sampling mean body weight",
    unit: "g",
    source: "ponds",
    exactTime: true,
  },
  {
    key: "sampling.feed",
    label: "Sampling feed observation",
    unit: "kg",
    source: "ponds",
    exactTime: true,
  },
  {
    key: "feeding.totalDailyFeed",
    label: "Logged daily feed total",
    unit: "kg",
    source: "ponds",
    exactTime: false,
  },
  {
    key: "mortality.count",
    label: "Recorded mortality",
    unit: "shrimp",
    source: "ponds",
    exactTime: true,
  },
  ...[
    { key: "phLab", unit: "pH", basis: "pH" },
    { key: "salinityLab", unit: "ppt", basis: "salinity" },
    { key: "tan", unit: "mg/L", basis: "N" },
    { key: "nh3", unit: "mg/L", basis: "NH3" },
    { key: "no2", unit: "mg/L", basis: "NO2" },
    { key: "alkalinityTotal", unit: "mg/L", basis: "CaCO3" },
  ].map((f) => ({
    key: `lab.${f.key}`,
    label: `Lab ${f.key}`,
    unit: f.unit,
    basis: f.basis,
    source: "labReports",
    exactTime: false,
  })),
  {
    key: "lab.status",
    label: "Confirmed lab status",
    unit: "",
    source: "labReports",
    exactTime: false,
  },
  {
    key: "inventory.totalStock",
    label: "Recorded inventory stock",
    unit: "",
    source: "feeds",
    sources: ["feeds", "additives"],
    scopes: ["block", "company"],
    exactTime: false,
  },
  {
    key: "treatment.quantity",
    label: "Recorded treatment usage",
    unit: "",
    source: "additives",
    exactTime: true,
  },
  {
    key: "equipment.maintenance",
    label: "Maintenance record",
    unit: "",
    source: "assets",
    permissions: ["viewAssets"],
    scopes: ["block", "company"],
    exactTime: false,
  },
  {
    key: "harvest.biomass",
    label: "Recorded harvest biomass",
    unit: "kg",
    source: "harvestRecords",
    exactTime: false,
  },
  {
    key: "lifecycle.status",
    label: "Recorded cycle state",
    unit: "",
    source: "ponds",
    exactTime: false,
  },
  {
    key: "manual",
    label: "Written or attachment evidence",
    unit: "",
    source: "manual",
    exactTime: false,
  },
];
for (const field of SOP_FIELDS) {
  field.permissions ||=
    field.source === "assets" ? ["viewFarm", "viewAssets"] : ["viewFarm"];
  field.scopes ||=
    field.source === "manual" ? ["pond", "block", "company"] : ["pond"];
  field.checks ||=
    field.source === "manual"
      ? ["present", "narrative"]
      : field.key === "equipment.maintenance" ||
          field.key === "lab.status" ||
          field.key === "lifecycle.status" ||
          [
            "water.weatherEvent",
            "water.sludgeLoad",
            "water.surfaceScum",
            "water.shrimpBehaviour",
          ].includes(field.key)
        ? ["present", "equals", "count", "sequence"]
        : ["present", "range", "equals", "count", "trend", "sequence"];
}
export const sopField = (key: string) =>
  SOP_FIELDS.find((field) => field.key === key);
