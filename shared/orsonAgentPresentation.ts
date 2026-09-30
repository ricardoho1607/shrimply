import {
  ORSON_ACTIONS,
  ORSON_ACTIVITY_LABELS,
  type OrsonCommand,
} from "./orsonAgentContract";
const fieldLabels: Record<string, string> = {
  pondName: "Pond name",
  pondArea: "Pond area (m²)",
  supplier: "PL supplier",
  mbw: "Mean body weight (g)",
  feed: "Sampling feed observation (kg)",
  count: "Mortality count",
  density: "Stocking density (shrimp/m²)",
  initialWeight: "Initial weight (g)",
  price: "Unit price",
  size: "Shrimp size (count/kg)",
  biomass: "Harvest weight (kg)",
  subBiomass: "Secondary harvest weight (kg)",
  subSize: "Secondary size (count/kg)",
  subPrice: "Secondary unit price",
  doMorning: "Morning dissolved oxygen (mg/L)",
  doEvening: "Evening dissolved oxygen (mg/L)",
  phMorning: "Morning pH",
  phEvening: "Evening pH",
  salinity: "Salinity (ppt)",
  alkalinity: "Alkalinity (mg/L)",
  ammonia: "Ammonia (mg/L)",
  temperatureMorning: "Morning temperature (°C)",
  temperatureEvening: "Evening temperature (°C)",
  transparencyMorning: "Morning transparency (cm)",
  transparencyEvening: "Evening transparency (cm)",
  feedingResponse: "Observed feeding response",
  observationType: "Mortality observation type",
  cycleEndReason: "Reason for closing",
  cycleName: "New production cycle name",
  cycleId: "Existing production cycle",
  item: "Description",
  reorderLevel: "Reorder level",
};
export const agentFieldLabel = (field: string) =>
  fieldLabels[field] ||
  field.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
export const agentFields = (command: OrsonCommand): readonly string[] => {
  if (command.type === "stock_in_inventory" && command.itemId) {
    return (ORSON_ACTIONS[command.type]?.fields || []).filter(
      (field) => field !== "itemName" && field !== "category",
    );
  }
  return ["upsert_water_quality", "update_pond_details", "update_inventory_details"].includes(command.type) &&
    Object.keys(command.values || {}).length
      ? Object.keys(command.values)
      : ORSON_ACTIONS[command.type]?.fields || Object.keys(command.values || {});
};
const ID_LABELS: Record<string, string> = {
  working: "Memproses permintaan Anda",
  pond_lookup: "Memeriksa kolam",
  sampling_lookup: "Membaca catatan sampling terbaru",
  inventory_check: "Memeriksa persediaan",
  record_lookup: "Membaca catatan tambak",
  ocr_extract: "Membaca dokumen Anda",
  entity_lookup: "Mencocokkan nama kolam dan barang",
  draft_prepare: "Menyiapkan catatan Anda",
  draft_ready: "Siap untuk ditinjau",
  saving: "Menyimpan catatan Anda",
  answer: "Menyiapkan jawaban Anda",
};
export const agentActivityLabel = (step: string, language = "en") =>
  (language === "id" ? ID_LABELS[step] : undefined) ||
  ORSON_ACTIVITY_LABELS[step] ||
  ORSON_ACTIVITY_LABELS.working;
export const agentFieldOptions: Record<string, { id: string; name: string }[]> =
  {
    observationType: [
      { id: "estimated_total", name: "Estimated total deaths" },
      { id: "none_observed", name: "No deaths observed" },
    ],
    feedingResponse: [
      { id: "strong", name: "Strong" },
      { id: "normal", name: "Normal" },
      { id: "weak", name: "Weak" },
    ],
    harvestType: [
      { id: "partial", name: "Partial harvest" },
      { id: "final", name: "Final harvest" },
    ],
    cycleEndReason: [
      { id: "harvested", name: "Harvested" },
      { id: "disease", name: "Disease" },
      { id: "reset", name: "Reset" },
      { id: "other", name: "Other" },
    ],
    paymentType: ["Unconfirmed", "Cash", "Bank Transfer", "Mobile Payment"].map(
      (id) => ({ id, name: id }),
    ),
  };
