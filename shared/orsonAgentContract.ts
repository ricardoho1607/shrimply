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
  values: Record<string, string | number>;
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
    /(?:^|[.!?]\s*|\bplease\s+|\btolong\s+)(?:(?:please|tolong|can you|could you)\s+)?(?:record|log|save|add|update|correct|edit|change|fix|replace|adjust|set|delete|remove|stock in|start|end|close|catat|simpan|tambahkan|perbarui|koreksi|ganti|ubah|mulai|akhiri)\b/i.test(
      value,
    ) ||
    /^(?:(?:i|we)\s+(?:need|want)\s+(?:you\s+to\s+|to\s+)?|(?:i|we)(?:'d| would)\s+like\s+(?:you\s+to\s+|to\s+)|help\s+(?:me|us)\s+(?:to\s+)?)(?:record|log|save|add|update|correct|edit|change|fix|replace|adjust|set|delete|remove|stock in|start|end|close)\b/i.test(
      value,
    ) ||
    /^(?:记录|保存|修改|添加|开始|结束|บันทึก|เพิ่ม|แก้ไข|ghi lại|lưu|cập nhật)/i.test(
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
