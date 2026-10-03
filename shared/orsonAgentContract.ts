/** Shared wire contract. Runtime validation is enforced again by the server. */
export const ORSON_ACTIONS = {
  update_pond_details: {
    label: "Pond details",
    permission: "managePonds",
    fields: ["pondName", "pondArea", "density", "initialWeight", "supplier"],
  },
  upsert_water_quality: {
    label: "Water quality",
    permission: "recordPondData",
    fields: [
      "doMorning",
      "doEvening",
      "phMorning",
      "phEvening",
      "temperatureMorning",
      "temperatureEvening",
      "transparencyMorning",
      "transparencyEvening",
      "salinity",
      "alkalinity",
      "ammonia",
      "nitriteMgL",
      "nitriteBasis",
      "weatherEvent",
      "waterExchangePercent",
      "sludgeLoad",
      "surfaceScum",
      "shrimpBehaviour",
      "waterDepthCmMorning",
      "waterDepthCmEvening",
      "operationalNotes",
    ],
  },
  record_sampling: {
    label: "Sampling",
    permission: "recordPondData",
    fields: ["mbw", "feed"],
  },
  record_mortality: {
    label: "Mortality",
    permission: "recordPondData",
    fields: ["count", "observationType", "notes"],
  },
  record_feeding: {
    label: "Daily feeding (replacement total)",
    permission: "manageFeedInventory",
    fields: ["feedingResponse"],
  },
  apply_pond_treatment: {
    label: "Pond treatment",
    permission: "manageFeedInventory",
    fields: ["quantity", "unit", "notes"],
  },
  stock_in_inventory: {
    label: "Inventory purchase",
    permission: "manageFeedInventory",
    fields: [
      "itemName",
      "category",
      "quantity",
      "price",
      "unit",
      "notes",
      "expiry",
    ],
  },
  update_inventory_details: {
    label: "Inventory details",
    permission: "manageFeedInventory",
    fields: ["feedName", "additiveName", "reorderLevel", "notes"],
  },
  void_inventory_purchase: {
    label: "Void inventory purchase",
    permission: "manageFeedInventory",
    fields: [],
  },
  delete_inventory_item: {
    label: "Permanently delete inventory item",
    permission: "manageFeedInventory",
    fields: [],
  },
  record_harvest: {
    label: "Harvest",
    permission: "manageHarvests",
    fields: [
      "harvestType",
      "biomass",
      "size",
      "price",
      "subBiomass",
      "subSize",
      "subPrice",
    ],
  },
  start_cycle: {
    label: "Start pond cycle",
    permission: "manageCycles",
    fields: ["density", "initialWeight", "supplier", "cycleId", "cycleName"],
  },
  end_cycle: {
    label: "End pond cycle",
    permission: "manageCycles",
    fields: ["cycleEndReason"],
  },
  record_expense: {
    label: "Expense",
    permission: "manageFinance",
    fields: ["item", "category", "amount", "paymentType", "notes"],
  },
  record_revenue: {
    label: "Revenue",
    permission: "manageFinance",
    fields: ["item", "category", "amount", "paymentType", "notes"],
  },
} as const;
export type OrsonActionType = keyof typeof ORSON_ACTIONS;
export type OrsonCommand = {
  id: string;
  type: OrsonActionType;
  date: string;
  pondId?: string;
  itemId?: string;
  itemType?: "feed" | "additive";
  recordId?: string;
  values: Record<string, string | number | boolean>;
  allocations?: { inventoryFeedId: string; quantityKg: number }[];
};
export type OrsonDraftRow = {
  command: OrsonCommand;
  title: string;
  target: string;
  valid: boolean;
  error?: string;
  warnings: string[];
  effects: string[];
  before?: Record<string, unknown>;
};
export type OrsonOperation = {
  id: string;
  revision: number;
  state: "draft" | "completed" | "partial" | "discarded";
  rows: OrsonDraftRow[];
  expiresAt: number;
  receipts: {
    rowIds: string[];
    status: "saved" | "failed";
    message: string;
    links?: { label: string; web: string; mobile: string }[];
  }[];
};
export type OrsonActivity = {
  type: "status_step";
  requestId: string;
  sequence: number;
  step: string;
  state: "running" | "awaiting_confirmation" | "completed" | "failed";
};
export const ORSON_ACTIVITY_LABELS: Record<string, string> = {
  working: "Working on your request",
  pond_lookup: "Checking ponds",
  sampling_lookup: "Reading recent sampling records",
  inventory_check: "Checking inventory",
  record_lookup: "Reading farm records",
  ocr_extract: "Reading your document",
  entity_lookup: "Matching pond and item names",
  draft_prepare: "Preparing your entry",
  draft_ready: "Ready for your review",
  saving: "Saving your records",
  answer: "Preparing your answer",
};
export function acceptOrsonActivity(
  previous: OrsonActivity | null,
  next: OrsonActivity,
): OrsonActivity | null {
  if (
    !next ||
    next.type !== "status_step" ||
    !Number.isInteger(next.sequence) ||
    next.sequence < 1 ||
    typeof next.requestId !== "string" ||
    !Object.hasOwn(ORSON_ACTIVITY_LABELS, next.step) ||
    !["running", "awaiting_confirmation", "completed", "failed"].includes(
      next.state,
    )
  )
    return previous;
  if (
    previous &&
    (next.requestId !== previous.requestId ||
      next.sequence <= previous.sequence)
  )
    return previous;
  return next;
}
/** Routing hint only; model tools still only prepare drafts and never authorize writes. */
export function isExplicitFarmAction(text: string): boolean {
  const value = text.trim();
  if (
    /^(?:what|why|when|how|should|if|suppose|imagine|apa|mengapa|bagaimana|jika)\b/i.test(
      value,
    )
  )
    return false;
  return (
    /(?:^|[.!?]\s*|\bplease\s+|\btolong\s+)(?:(?:please|tolong|can you|could you)\s+)?(?:record|log|save|add|update|correct|edit|change|fix|replace|adjust|set|delete|remove|stock in|start|end|close|void|cancel|catat|simpan|tambahkan|perbarui|koreksi|ganti|ubah|mulai|akhiri|batalkan)\b/i.test(
      value,
    ) ||
    /^(?:(?:i|we)\s+(?:need|want)\s+(?:you\s+to\s+|to\s+)?|(?:i|we)(?:'d| would)\s+like\s+(?:you\s+to\s+|to\s+)|help\s+(?:me|us)\s+(?:to\s+)?)(?:record|log|save|add|update|correct|edit|change|fix|replace|adjust|set|delete|remove|stock in|start|end|close|void|cancel)\b/i.test(
      value,
    ) ||
    /^(?:记录|保存|修改|添加|开始|结束|作废|取消|บันทึก|เพิ่ม|แก้ไข|ยกเลิก|ghi lại|lưu|cập nhật|hủy)/i.test(
      value,
    )
  );
}

/** Editing intent requires an existing target so a correction cannot become a new record. */
export function isExplicitFarmCorrection(text: string): boolean {
  const value = text.trim();
  if (!isExplicitFarmAction(value)) return false;
  return /(?:^|[.!?]\s*|\bplease\s+|\btolong\s+)(?:(?:please|tolong|can you|could you)\s+)?(?:update|correct|edit|change|fix|replace|adjust|set|perbarui|koreksi|ganti|ubah)\b/i.test(value)
    || /^(?:(?:i|we)\s+(?:need|want)\s+(?:you\s+to\s+|to\s+)?|(?:i|we)(?:'d| would)\s+like\s+(?:you\s+to\s+|to\s+)|help\s+(?:me|us)\s+(?:to\s+)?)(?:update|correct|edit|change|fix|replace|adjust|set)\b/i.test(value);
}

/** A delayed stream/final result must never replace a newer revision or saved receipt. */
export function mergeOrsonOperation(
  previous: OrsonOperation | undefined,
  incoming: OrsonOperation,
): OrsonOperation {
  if (!previous || previous.id !== incoming.id) return incoming;
  if (previous.revision !== incoming.revision)
    return previous.revision > incoming.revision ? previous : incoming;
  if (previous.state === "completed" || previous.state === "discarded")
    return previous;
  const incomingSaved = new Set(
    incoming.receipts
      .filter((r) => r.status === "saved")
      .flatMap((r) => r.rowIds),
  );
  if (
    previous.receipts.some(
      (r) =>
        r.status === "saved" && r.rowIds.some((id) => !incomingSaved.has(id)),
    )
  )
    return previous;
  if (previous.state === "partial" && incoming.state === "draft")
    return previous;
  return incoming;
}

export class OrsonContractError extends Error {
  code: string;
  constructor(message: string, code = "failed-precondition") {
    super(message);
    this.name = "OrsonContractError";
    this.code = code;
  }
}

export function fail(message: string, code = "failed-precondition"): never {
  throw new OrsonContractError(message, code);
}

export const validId = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[A-Za-z0-9_.:@-]{1,160}$/.test(value) &&
  value !== "." &&
  value !== "..";

export const validDate = (date: unknown): date is string =>
  typeof date === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(date) &&
  Number.isFinite(Date.parse(date)) &&
  new Date(date).toISOString().slice(0, 10) === date;

const booleanFields = new Set([
  "surfaceScum",
]);

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
  "weatherEvent",
  "sludgeLoad",
  "shrimpBehaviour",
  "nitriteBasis",
]);

const requiredFields: Record<string, string[]> = {
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

const fieldEnums: Record<string, string[]> = {
  observationType: ["estimated_total", "none_observed"],
  feedingResponse: ["strong", "normal", "weak"],
  harvestType: ["partial", "final"],
  cycleEndReason: ["harvested", "disease", "reset", "other"],
  paymentType: ["Unconfirmed", "Cash", "Mobile Payment", "Bank Transfer"],
  weatherEvent: ["rain", "heavy_rain", "sudden_cloud"],
  sludgeLoad: ["low", "moderate", "high"],
  shrimpBehaviour: ["normal", "abnormal"],
  nitriteBasis: ["NO2"],
};

export function normalizeCommand(input: any): OrsonCommand {
  if (!input || typeof input !== "object" || !Object.hasOwn(ORSON_ACTIONS, input.type)) {
    fail("Choose a supported action.", "invalid-argument");
  }
  if (!validId(input.id) || !validDate(input.date)) {
    fail("A row ID and valid date are required.", "invalid-argument");
  }

  // Strict action schema for void_inventory_purchase
  if (input.type === "void_inventory_purchase") {
    if (!input.itemType || !["feed", "additive"].includes(input.itemType)) {
      fail("Choose feed or additive.");
    }
    if (!input.itemId || !validId(input.itemId)) {
      fail("Select a valid inventory item.");
    }
    if (!input.recordId || !validId(input.recordId)) {
      fail("Select a valid purchase record.");
    }
    if (!input.values || typeof input.values !== "object" || Array.isArray(input.values)) {
      fail("Enter the record values.");
    }
    const allowed = ORSON_ACTIONS.void_inventory_purchase?.fields || [];
    for (const key of Object.keys(input.values)) {
      if (!allowed.includes(key as never)) {
        fail(`Unsupported field: ${key}.`, "invalid-argument");
      }
    }
    return {
      id: input.id,
      type: input.type,
      date: input.date,
      itemType: input.itemType,
      itemId: input.itemId,
      recordId: input.recordId,
      values: { ...input.values },
    };
  }

  const result: OrsonCommand = {
    id: input.id,
    type: input.type,
    date: input.date,
    values: {},
  };

  for (const key of ["pondId", "itemId", "recordId"] as const) {
    if (input[key]) {
      if (!validId(input[key])) fail(`Invalid ${key}.`, "invalid-argument");
      result[key] = input[key];
    }
  }

  if (input.itemType) {
    if (!["feed", "additive"].includes(input.itemType)) {
      fail("Choose feed or additive.");
    }
    result.itemType = input.itemType;
  }

  const config = ORSON_ACTIONS[input.type as OrsonActionType];
  if (
    !input.values ||
    typeof input.values !== "object" ||
    Array.isArray(input.values)
  ) {
    fail("Enter the record values.");
  }

  for (const [key, raw] of Object.entries(input.values)) {
    if (!config.fields.includes(key as never)) {
      fail(`Unsupported field: ${key}.`, "invalid-argument");
    }
    if (
      raw === "" ||
      raw === null ||
      raw === undefined ||
      (typeof raw === "string" && raw.trim() === "")
    ) {
      continue;
    }
    if (booleanFields.has(key)) {
      if (typeof raw !== "boolean") {
        fail(`${key} must be a boolean.`);
      }
      result.values[key] = raw;
    } else if (textFields.has(key)) {
      if (typeof raw !== "string" || raw.length > 1000) fail(`Invalid ${key}.`);
      const trimmed = raw.trim();
      if (key === "nitriteBasis" && trimmed !== "NO2") {
        fail("Ambiguous or NO2-N nitrite is unresolved; only explicit NO2 is accepted.");
      }
      if (fieldEnums[key] && !fieldEnums[key].includes(trimmed)) {
        fail(`Choose a valid ${key}.`);
      }
      result.values[key] = trimmed;
    } else {
      if (
        !["number", "string"].includes(typeof raw) ||
        !Number.isFinite(Number(raw)) ||
        Number(raw) < 0
      ) {
        fail(`${key} must be a non-negative number.`);
      }
      const n = Number(raw);
      if (key.startsWith("ph") && (n < 0 || n > 14)) {
        fail("pH must be between 0 and 14.");
      }
      if (key === "waterExchangePercent" && (n < 0 || n > 100)) {
        fail("waterExchangePercent must be between 0 and 100.");
      }
      if (
        ["mbw", "quantity", "size", "subSize", "pondArea", "density", "initialWeight"].includes(key) &&
        n <= 0
      ) {
        fail(`${key} must be greater than zero.`);
      }
      if (key === "count" && !Number.isInteger(n)) {
        fail("Mortality count must be a whole number.");
      }
      result.values[key] = n;
    }
  }

  if (result.values.nitriteMgL !== undefined && result.values.nitriteBasis !== "NO2") {
    fail("Ambiguous or NO2-N nitrite is unresolved; only explicit NO2 is accepted.");
  }
  if (result.values.nitriteBasis !== undefined && result.values.nitriteMgL === undefined) {
    fail("Ambiguous or NO2-N nitrite is unresolved; only explicit NO2 is accepted.");
  }

  for (const field of requiredFields[input.type] || []) {
    if (result.values[field] === undefined || result.values[field] === "") {
      fail(`${field} is required.`);
    }
  }

  if (
    input.type === "record_mortality" &&
    (result.values.count === 0) !==
      (result.values.observationType === "none_observed")
  ) {
    fail("Use none_observed only for a zero mortality count.");
  }

  if (input.type === "record_feeding") {
    if (
      !Array.isArray(input.allocations) ||
      !input.allocations.length ||
      input.allocations.length > 12
    ) {
      fail("Select feed items and quantities.");
    }
    const totals = new Map<string, number>();
    for (const row of input.allocations) {
      if (
        !row ||
        !validId(row.inventoryFeedId) ||
        typeof row.quantityKg !== "number" ||
        !Number.isFinite(row.quantityKg) ||
        row.quantityKg < 0
      ) {
        fail("Each allocation needs a feed item and non-negative kg.");
      }
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
    !["record_feeding", "delete_inventory_item", "void_inventory_purchase"].includes(input.type)
  ) {
    fail("Enter at least one value.");
  }

  return result;
}
