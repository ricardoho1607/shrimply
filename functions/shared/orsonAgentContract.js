const { ORSON_ACTIONS, isExplicitFarmCorrection } = require("./orsonDomain/orsonAgentContract");
const { validId, fail } = require("./orsonActionAuth");
const textFields = new Set([
  "pondName",
  "notes",
  "operationalNotes",
  "supplier",
  "cycleId",
  "cycleName",
  "cycleEndReason",
  "observationType",
  "feedingResponse",
  "harvestType",
  "item",
  "itemName",
  "category",
  "paymentType",
  "unit",
  "expiry",
  "feedName",
  "additiveName",
]);
const required = {
  record_sampling: ["mbw", "feed"],
  record_mortality: ["count", "observationType"],
  apply_pond_treatment: ["quantity", "unit"],
  stock_in_inventory: ["quantity", "price", "unit"],
  record_harvest: ["biomass", "size", "price", "harvestType"],
  start_cycle: ["density", "initialWeight", "supplier"],
  end_cycle: ["cycleEndReason"],
  record_expense: ["item", "category", "amount", "paymentType"],
  record_revenue: ["item", "category", "amount", "paymentType"],
};
const enums = {
  observationType: ["estimated_total", "none_observed"],
  feedingResponse: ["strong", "normal", "weak"],
  harvestType: ["partial", "final"],
  cycleEndReason: ["harvested", "disease", "reset", "other"],
  paymentType: ["Unconfirmed", "Cash", "Mobile Payment", "Bank Transfer"],
};
const validDate = (date) =>
  typeof date === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(date) &&
  Number.isFinite(Date.parse(date)) &&
  new Date(date).toISOString().slice(0, 10) === date;
function normalizeCommand(input) {
  if (input?.type === "record_lab_report")
    return require("./orsonDomain/orsonAgentContract").normalizeCommand(input);
  if (!input || !Object.hasOwn(ORSON_ACTIONS, input.type))
    fail("Choose a supported action.", "invalid-argument");
  if (!validId(input.id) || !validDate(input.date))
    fail("A row ID and valid date are required.", "invalid-argument");
  const result = {
    id: input.id,
    type: input.type,
    date: input.date,
    values: {},
  };
  for (const key of ["pondId", "itemId", "recordId"])
    if (input[key]) {
      if (!validId(input[key])) fail(`Invalid ${key}.`, "invalid-argument");
      result[key] = input[key];
    }
  if (input.itemType) {
    if (!["feed", "additive"].includes(input.itemType))
      fail("Choose feed or additive.");
    result.itemType = input.itemType;
  }
  const config = ORSON_ACTIONS[input.type];
  if (
    !input.values ||
    typeof input.values !== "object" ||
    Array.isArray(input.values)
  )
    fail("Enter the record values.");
  for (const [key, raw] of Object.entries(input.values)) {
    if (!config.fields.includes(key))
      fail(`Unsupported field: ${key}.`, "invalid-argument");
    if (raw === "" || raw === null || raw === undefined) continue;
    if (textFields.has(key)) {
      if (typeof raw !== "string" || raw.length > 1000) fail(`Invalid ${key}.`);
      result.values[key] = raw.trim();
      if (enums[key] && !enums[key].includes(raw))
        fail(`Choose a valid ${key}.`);
    } else {
      if (
        !["number", "string"].includes(typeof raw) ||
        !Number.isFinite(Number(raw)) ||
        Number(raw) < 0
      )
        fail(`${key} must be a non-negative number.`);
      const n = Number(raw);
      if (key.startsWith("ph") && n > 14) fail("pH must be between 0 and 14.");
      if (
        ["mbw", "quantity", "size", "pondArea", "density", "initialWeight"].includes(key) &&
        n <= 0
      )
        fail(`${key} must be greater than zero.`);
      if (key === "count" && !Number.isInteger(n))
        fail("Mortality count must be a whole number.");
      result.values[key] = n;
    }
  }
  for (const field of required[input.type] || [])
    if (result.values[field] === undefined || result.values[field] === "")
      fail(`${field} is required.`);
  if (
    input.type === "record_mortality" &&
    (result.values.count === 0) !==
      (result.values.observationType === "none_observed")
  )
    fail("Use none_observed only for a zero mortality count.");
  if (input.type === "record_feeding") {
    if (
      !Array.isArray(input.allocations) ||
      !input.allocations.length ||
      input.allocations.length > 12
    )
      fail("Select feed items and quantities.");
    const totals = new Map();
    for (const row of input.allocations) {
      if (
        !validId(row.inventoryFeedId) ||
        typeof row.quantityKg !== "number" ||
        !Number.isFinite(row.quantityKg) ||
        row.quantityKg < 0
      )
        fail("Each allocation needs a feed item and non-negative kg.");
      totals.set(
        row.inventoryFeedId,
        (totals.get(row.inventoryFeedId) || 0) + row.quantityKg,
      );
    }
    result.allocations = [...totals].map(([inventoryFeedId, quantityKg]) => ({
      inventoryFeedId,
      quantityKg,
    }));
  }
  if (
    !Object.keys(result.values).length &&
    !["record_feeding", "delete_inventory_item"].includes(input.type)
  )
    fail("Enter at least one value.");
  return result;
}
module.exports = { ORSON_ACTIONS, isExplicitFarmCorrection, normalizeCommand, validDate };
