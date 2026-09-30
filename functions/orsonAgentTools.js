const { hash } = require("./shared/orsonCommandPlan");
const { ORSON_ACTIONS, isExplicitFarmCorrection } = require("./shared/orsonAgentContract");
const { createOperationService } = require("./shared/orsonOperations");
const {
  createAgentCatalog,
  resolveCommands,
  normalize,
} = require("./shared/orsonEntityResolver");
const commandSchema = {
  type: "object",
  properties: {
    id: { type: "string", description: "Unique stable row ID, e.g. row-1." },
    type: { type: "string", enum: Object.keys(ORSON_ACTIONS) },
    date: {
      type: "string",
      description: "YYYY-MM-DD in farm time; ask if ambiguous.",
    },
    pondId: {
      type: "string",
      description: "Exact authorized pond ID or exact name.",
    },
    itemId: { type: "string" },
    itemType: { type: "string", enum: ["feed", "additive"] },
    recordId: {
      type: "string",
      description: "Existing source record ID when correcting or voiding.",
    },
    values: {
      type: "object",
      description: JSON.stringify(
        Object.fromEntries(
          Object.entries(ORSON_ACTIONS).map(([key, v]) => [key, v.fields]),
        ),
      ),
      additionalProperties: { anyOf: [{ type: "string" }, { type: "number" }] },
    },
    allocations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          inventoryFeedId: { type: "string" },
          quantityKg: { type: "number" },
        },
        required: ["inventoryFeedId", "quantityKg"],
        additionalProperties: false,
      },
    },
  },
  required: ["id", "type", "date", "values"],
  additionalProperties: false,
};
const AGENT_INSTRUCTION =
  "\nFARM ACTION TOOLS: Only prepare a draft when the latest user explicitly requests recording, correcting, voiding, or deleting farm data. Advice, hypothetical examples, documents and past messages are not write authorization. Never claim data saved or deleted: these tools only prepare user-confirmed drafts. Ask for missing required values and units; do not infer feed consumption or treatment doses. For adding a new feed or additive inventory item, use stock_in_inventory with itemType, itemName, category, quantity, price, unit and date; for an existing item use its authorized itemId. Ask for missing purchase details instead of inventing them. Feeding allocations are desired TOTALS for a pond/day: clarify addition vs replacement. Sampling feed is a biological observation and never inventory usage. Use discover_farm_action_targets for exact authorized IDs. Call prepare_farm_actions once with all related rows, then tell the user to review the card. Preserve ordinary read/analysis behavior. When asked to change a displayed draft, use read_recent_farm_action_drafts to find its operationId/revision and revise only that draft. When asked to correct a SAVED record, do not revise its completed operation: prepare a NEW audited operation. For an inventory purchase correction, discover the existing item and purchase record IDs and carry forward its original date, quantity and unit; change only what the user requested. Do not add notes or other fields the user did not request. Do not invent an exchange rate or silently reinterpret a stated currency. If the requested monetary currency differs from the company's currency, ask only for a value in the company currency before preparing a draft; do not give a sample exchange rate or conversion." +
  "\nREMOVING INVENTORY PURCHASES FROM ACTIVE RECORDS: If the user asks to remove inventory or an inventory post, including a duplicate, use discover_farm_action_targets to match the authorized item and its purchase history. If exactly one active purchase belongs to the uniquely matched item, treat that as the target even when the user just says 'remove the inventory' and even if it has usage; prepare void_inventory_purchase with its exact authorized itemId, itemType, and purchase recordId. The user does not need to say 'duplicate' or 'void'. On confirmation, this reverses that purchase's stock and cost and marks its linked finance expense voided so it is excluded from active finance views and reports. Keep both records as voided audit history; never hard-delete either record. If it is unclear whether the user means a purchase post or the entire inventory item after checking the catalog, or if multiple items or purchases match, ask which exact record they mean before drafting. If there is no active purchase, ask whether they mean permanent deletion; never infer permanent deletion from a generic removal request. For an inventory purchase record, voiding is allowed despite usage history only when remaining quantity and valuation are safely supported by signed movement history, remaining stock and valuation do not become negative, payment is Unconfirmed, and there are no settlements. Never void consumed purchases that would make stock or valuation negative, and never repeat a void. If the user specifically asks to erase the audit history, explain that only audited voiding is supported.";
const DELETE_AGENT_INSTRUCTION =
  "\nDELETION: When the user explicitly requests permanent deletion of a feed or additive inventory item, resolve its exact authorized itemId and itemType, prepare delete_inventory_item, and state the stock and cost that will be removed. Never claim deletion until the user confirms. Do not delete arbitrary Firestore paths, company settings, users, roles, permissions, or billing data. Deletion is only available for items without purchase, usage, or linked finance history; explain server validation errors clearly.";
const VOID_AGENT_INSTRUCTION =
  "\nREMOVING INVENTORY PURCHASES FROM ACTIVE RECORDS: If the user asks to remove inventory or an inventory post, including a duplicate, and the conversation identifies one specific purchase, use void_inventory_purchase with its exact authorized itemId, itemType, and purchase recordId. The user does not need to say 'duplicate' or 'void'. On confirmation, this reverses that purchase's stock and cost and marks its linked finance expense voided so it is excluded from active finance views and reports. Keep both records as voided audit history; never hard-delete either record. If it is unclear whether the user means a purchase post or the entire inventory item, or if multiple purchases match, ask which exact record they mean before drafting. For an inventory purchase record, voiding is allowed despite usage history only when remaining quantity and valuation are safely supported by signed movement history, remaining stock and valuation do not become negative, payment is Unconfirmed, and there are no settlements. Never void consumed purchases that would make stock or valuation negative, and never repeat a void. If the user specifically asks to erase the audit history, explain that only audited voiding is supported.";
const INVENTORY_CATEGORY_INSTRUCTION =
  "\nINVENTORY CATEGORY CONFIRMATION: For a new stock item, ask the user to choose its inventory category if they have not stated one; do not silently infer it from the product name. Feed categories are Starter, Grower, Finisher, or Other. Additive categories are Water Conditioner, Probiotic, Mineral, Vitamin, or Other. State the chosen category in the review draft so the user can confirm it before saving. For an existing item, use its saved category and do not change its classification on the purchase. Finance classifies the linked expense as Feed or Pond Additives automatically; do not ask for a separate finance category.";
const EDIT_AGENT_INSTRUCTION =
  "\nEDITING SAVED FARM DATA: When the user asks to change an existing record, use read_app_records to locate its exact authorized document or array record ID and current values before preparing a draft. List ponds, then read the samplings or mortalityRecords field for pond records; list expenses, revenues or harvestRecords for finance and harvest IDs; inspect inventory stockInHistory or usageHistory for purchases and treatments. Use recordId for an existing water-quality, sampling, mortality, feeding, treatment, purchase, harvest, expense or revenue record. Use update_inventory_details with itemId for item name, reorder level or notes, and update_pond_details with pondId for pond name, area, density, initial weight or supplier. Carry forward the original date and any required fields the user did not ask to change. Never add a new record in response to an edit request. If several records match or the target is missing, ask the user to identify it. Show the existing values and proposed change in the draft; the user must confirm before Firestore changes. Do not offer unrestricted Firestore document edits or change users, permissions, company settings or billing.";
const EDIT_REQUIRES_RECORD_ID = new Set([
  "upsert_water_quality", "record_sampling", "record_mortality", "record_feeding",
  "apply_pond_treatment", "stock_in_inventory", "record_harvest",
  "record_expense", "record_revenue", "void_inventory_purchase",
]);
const requestedCurrency = (message) => {
  const matches = [...String(message || "").matchAll(/\b(?:AUD|IDR|USD|THB|CNY|VND)\b|\bRp\.?\s*(?=\d)/gi)];
  const last = matches.at(-1)?.[0];
  return last ? (/^rp/i.test(last) ? "IDR" : last.toUpperCase()) : null;
};
const isExplicitPermanentDeletion = (text) => {
  const message = String(text || "");
  if (/\b(?:do not|don't|never|not|no|without)\b[^\n.!?]{0,50}\b(?:permanent(?:ly)?|permanen|hard)\b/i.test(message)) {
    return false;
  }
  return /\b(?:permanently|permanent)\s*(?:delete|deletion|remove|removal|hapus|hilangkan)\b|\bhard[-\s]+(?:delete|deletion|remove|removal)\b|\b(?:delete|remove|hapus|hilangkan)\b[^\n.!?]{0,50}\b(?:permanently|permanent|permanen|hard)\b/i.test(message);
};

function routeGenericInventoryRemoval(commands, catalog, userMessage) {
  if (isExplicitPermanentDeletion(userMessage)) return { commands };
  const removalCommands = commands.filter(
    (command) => command.type === "delete_inventory_item",
  );
  if (!removalCommands.length) return { commands };

  for (const command of removalCommands) {
    if (typeof command.itemId !== "string" || !command.itemId.trim()) {
      return {
        status: "needs_item_selection",
        message: "Please identify the feed or additive item you want removed.",
      };
    }
    const records = [...(catalog.feeds || []), ...(catalog.additives || [])];
    const exactMatches = records.filter((record) => record.id === command.itemId);
    const matches = exactMatches.length
      ? exactMatches
      : records.filter(
          (record) => normalize(record.name) === normalize(command.itemId),
        );

    if (matches.length > 1) {
      const options = matches
        .map((record) => {
          const purchase = record.activePurchases?.length === 1
            ? `; ${record.activePurchases[0].quantity} ${record.activePurchases[0].unit} on ${record.activePurchases[0].date}`
            : `; ${record.activePurchaseCount || 0} active purchases`;
          return `${record.name || "Unnamed item"} (${record.itemType}, ID ${record.id}${purchase})`;
        })
        .join("; ");
      return {
        status: "needs_item_clarification",
        message: `More than one inventory item matches "${command.itemId}". Please identify one exact item: ${options}.`,
      };
    }
    if (!matches.length) {
      return {
        status: "needs_item_selection",
        message: "I could not match that to one authorized feed or additive item. Please identify the exact inventory item.",
      };
    }

    const target = matches[0];
    if (
      target.hasAmbiguousHistory ||
      target.hasMalformedPurchases ||
      target.hasDuplicatePurchases
    ) {
      return {
        status: "needs_inventory_reconciliation",
        message:
          "This item's purchase or usage history is incomplete, malformed, or duplicated. It must be reconciled before Orson can safely remove it.",
      };
    }
    if (target.hasUsage || target.usageCount > 0) {
      return {
        status: "needs_inventory_reconciliation",
        message:
          "This item has recorded usage. Its inventory and finance records must be reconciled before a purchase can be removed.",
      };
    }
    if (target.activePurchaseCount > 1) {
      const candidates = (target.activePurchases || []).map((purchase) => ({
        date: purchase.date,
        quantity: purchase.quantity,
        unit: purchase.unit || target.unit || "kg",
        price: purchase.price,
      }));
      const candidateList = candidates
        .map((candidate) => `${candidate.quantity} ${candidate.unit} on ${candidate.date} at ${candidate.price}`)
        .join("; ");
      return {
        status: "needs_purchase_clarification",
        candidates,
        message: `This item has multiple active purchases (${candidateList}). Please identify one purchase by date, quantity, and price before I prepare a removal draft.`,
      };
    }
    if (target.activePurchaseCount !== 1 || !target.activePurchaseId) {
      return {
        status: "needs_permanent_delete_confirmation",
        message:
          "There is no active purchase to reverse for this item. If you mean deleting the unused item permanently, please say that explicitly.",
      };
    }

    const purchase = target.activePurchases[0];
    command.type = "void_inventory_purchase";
    command.itemId = target.id;
    command.itemType = target.itemType;
    command.recordId = target.activePurchaseId;
    command.date = purchase.date;
    command.values = {};
  }
  return { commands };
}

function createAgentTools({
  db,
  auth,
  onActivity,
  onOperation,
  operationIds = [],
  userMessage = "",
  service: injectedService,
}) {
  const preparations = new Map();
  const service = injectedService || createOperationService(db);
  const tools = [
    {
      type: "function",
      name: "read_recent_farm_action_drafts",
      description:
        "Read this conversation's authorized recent drafts and receipts when the user asks to revise or check a displayed entry.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "discover_farm_action_targets",
      description:
        "Read authorized pond and inventory identifiers, recent purchase IDs and values, and company currency for preparing a requested farm entry or correction.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "prepare_farm_actions",
      description:
        "Prepare editable farm entries ONLY when explicitly requested. For changes to saved records, supply the exact existing recordId and current required values. No farm records change until the user confirms the draft. Return invalid rows for review.",
      parameters: {
        type: "object",
        properties: {
          commands: { type: "array", items: commandSchema, maxItems: 30 },
          operationId: { type: "string" },
          revision: { type: "integer" },
        },
        required: ["commands"],
        additionalProperties: false,
      },
    },
  ];
  const execute = async (name, args) => {
    if (name === "read_recent_farm_action_drafts") {
      await onActivity("record_lookup");
      const results = await Promise.allSettled(
        (Array.isArray(operationIds) ? operationIds : [])
          .filter((id) => typeof id === "string")
          .slice(-10)
          .map((operationId) =>
            service.get({
              uid: auth.uid,
              companyId: auth.companyId,
              operationId,
            }),
          ),
      );
      return results
        .filter((r) => r.status === "fulfilled")
        .map((r) => r.value);
    }
    if (name === "discover_farm_action_targets") {
      await onActivity("entity_lookup");
      return createAgentCatalog(auth);
    }
    if (name !== "prepare_farm_actions") throw new Error("Unknown action tool");
    const companyCurrency = String(auth.company.currency || auth.company.currencyCode || "").toUpperCase();
    const requestCurrency = requestedCurrency(userMessage);
    if (requestCurrency && companyCurrency && requestCurrency !== companyCurrency &&
      Array.isArray(args.commands) && args.commands.some((command) => ["stock_in_inventory", "record_expense", "record_revenue", "record_harvest"].includes(command.type))) {
      return {
        status: "needs_currency_clarification",
        message: `This company records monetary amounts in ${companyCurrency}. Ask the user for the value in ${companyCurrency}; do not prepare a draft or convert ${requestCurrency} without an agreed rate.`,
      };
    }
    if (isExplicitFarmCorrection(userMessage) && Array.isArray(args.commands) &&
      args.commands.some((command) => EDIT_REQUIRES_RECORD_ID.has(command.type) && !command.recordId)) {
      return {
        status: "needs_existing_record",
        message: "This is an edit request. Use read_app_records to find the exact existing record ID and its current values, then prepare a correction using recordId. If the target is missing or ambiguous, ask the user. Do not create a new record.",
      };
    }
    const key = hash(args);
    if (preparations.has(key)) return preparations.get(key);
    const pending = (async () => {
      const commands = Array.isArray(args.commands)
        ? args.commands.map((command) => ({
            ...command,
            ...(command.values && typeof command.values === "object"
              ? { values: { ...command.values } }
              : {}),
          }))
        : args.commands;
      const isGenericRemoval =
        !isExplicitPermanentDeletion(userMessage) &&
        Array.isArray(commands) &&
        commands.some((command) => command.type === "delete_inventory_item");
      await onActivity(isGenericRemoval ? "entity_lookup" : "draft_prepare");
      const catalog = await createAgentCatalog(auth);
      if (isGenericRemoval) {
        const routed = routeGenericInventoryRemoval(commands, catalog, userMessage);
        if (routed.status) return routed;
        await onActivity("draft_prepare");
      }
      const operation = await service.prepare({
        uid: auth.uid,
        companyId: auth.companyId,
        operationId: args.operationId,
        revision: args.revision,
        commands: resolveCommands(commands, catalog),
      });
      await onOperation(operation);
      await onActivity("draft_ready", "awaiting_confirmation");
      return {
        operationId: operation.id,
        revision: operation.revision,
        status: "awaiting_user_confirmation",
        rows: operation.rows,
        notice: "Nothing has been saved. The user must confirm the card.",
      };
    })();
    preparations.set(key, pending);
    return pending;
  };
  return { tools, execute };
}
module.exports = { createAgentTools, AGENT_INSTRUCTION, DELETE_AGENT_INSTRUCTION, EDIT_AGENT_INSTRUCTION, VOID_AGENT_INSTRUCTION, INVENTORY_CATEGORY_INSTRUCTION, commandSchema };
