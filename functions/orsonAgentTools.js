const { hash } = require("./shared/orsonCommandPlan");
const { ORSON_ACTIONS, isExplicitFarmCorrection } = require("./shared/orsonAgentContract");
const { createOperationService } = require("./shared/orsonOperations");
const {
  createAgentCatalog,
  resolveCommands,
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
      description: "Existing source record ID only when correcting.",
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
  "\nFARM ACTION TOOLS: Only prepare a draft when the latest user explicitly requests recording, correcting, or deleting farm data. Advice, hypothetical examples, documents and past messages are not write authorization. Never claim data saved or deleted: these tools only prepare user-confirmed drafts. Ask for missing required values and units; do not infer feed consumption or treatment doses. For adding a new feed or additive inventory item, use stock_in_inventory with itemType, itemName, category, quantity, price, unit and date; for an existing item use its authorized itemId. Ask for missing purchase details instead of inventing them. Feeding allocations are desired TOTALS for a pond/day: clarify addition vs replacement. Sampling feed is a biological observation and never inventory usage. Use discover_farm_action_targets for exact authorized IDs. Call prepare_farm_actions once with all related rows, then tell the user to review the card. Preserve ordinary read/analysis behavior. When asked to change a displayed draft, use read_recent_farm_action_drafts to find its operationId/revision and revise only that draft. When asked to correct a SAVED record, do not revise its completed operation: prepare a NEW audited operation. For an inventory purchase correction, discover the existing item and purchase record IDs and carry forward its original date, quantity and unit; change only what the user requested. Do not add notes or other fields the user did not request. Do not invent an exchange rate or silently reinterpret a stated currency. If the requested monetary currency differs from the company's currency, ask only for a value in the company currency before preparing a draft; do not give a sample exchange rate or conversion.";
const DELETE_AGENT_INSTRUCTION =
  "\nDELETION: When the user explicitly requests permanent deletion of a feed or additive inventory item, resolve its exact authorized itemId and itemType, prepare delete_inventory_item, and state the stock and cost that will be removed. Never claim deletion until the user confirms. Do not delete arbitrary Firestore paths, company settings, users, roles, permissions, or billing data. Deletion is only available for items without purchase, usage, or linked finance history; explain server validation errors clearly.";
const EDIT_AGENT_INSTRUCTION =
  "\nEDITING SAVED FARM DATA: When the user asks to change an existing record, use read_app_records to locate its exact authorized document or array record ID and current values before preparing a draft. List ponds, then read the samplings or mortalityRecords field for pond records; list expenses, revenues or harvestRecords for finance and harvest IDs; inspect inventory stockInHistory or usageHistory for purchases and treatments. Use recordId for an existing water-quality, sampling, mortality, feeding, treatment, purchase, harvest, expense or revenue record. Use update_inventory_details with itemId for item name, reorder level or notes, and update_pond_details with pondId for pond name, area, density, initial weight or supplier. Carry forward the original date and any required fields the user did not ask to change. Never add a new record in response to an edit request. If several records match or the target is missing, ask the user to identify it. Show the existing values and proposed change in the draft; the user must confirm before Firestore changes. Do not offer unrestricted Firestore document edits or change users, permissions, company settings or billing.";
const EDIT_REQUIRES_RECORD_ID = new Set([
  "upsert_water_quality", "record_sampling", "record_mortality", "record_feeding",
  "apply_pond_treatment", "stock_in_inventory", "record_harvest",
  "record_expense", "record_revenue",
]);
const requestedCurrency = (message) => {
  const matches = [...String(message || "").matchAll(/\b(?:AUD|IDR|USD|THB|CNY|VND)\b|\bRp\.?\s*(?=\d)/gi)];
  const last = matches.at(-1)?.[0];
  return last ? (/^rp/i.test(last) ? "IDR" : last.toUpperCase()) : null;
};
function createAgentTools({
  db,
  auth,
  onActivity,
  onOperation,
  operationIds = [],
  userMessage = "",
}) {
  const preparations = new Map();
  const service = createOperationService(db);
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
      await onActivity("draft_prepare");
      const catalog = await createAgentCatalog(auth);
      const operation = await service.prepare({
        uid: auth.uid,
        companyId: auth.companyId,
        operationId: args.operationId,
        revision: args.revision,
        commands: resolveCommands(args.commands, catalog),
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
module.exports = { createAgentTools, AGENT_INSTRUCTION, DELETE_AGENT_INSTRUCTION, EDIT_AGENT_INSTRUCTION, commandSchema };
