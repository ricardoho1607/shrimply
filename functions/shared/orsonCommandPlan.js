const { fail, validId } = require("./orsonActionAuth");
const { normalizeCommand, ORSON_ACTIONS } = require("./orsonDomain/orsonAgentContract");
const {
  reconcileDailyFeedStock,
} = require("./orsonDomain/dailyFeedTransaction");
const {
  normalizeFeedAllocations,
} = require("./orsonDomain/feedInventoryUsage");
const {
  buildInventoryExpense,
  buildHarvestRevenue,
  financeSourceEntry,
  financeSyncDocumentId,
} = require("./orsonDomain/financeSync");
const {
  isSourceLinkedFinance,
  getUsageReturnCost,
} = require("./orsonDomain/financeIntegrity");
const {
  calculatePondMetricsWithHarvest,
} = require("./orsonDomain/pondCalculations");
const {
  applyHarvestImpactToPond,
  reverseHarvestImpactOnPond,
  getHarvestDateSampling,
  withHarvestReference,
  getNextPartialHarvestNumber,
  hasFinalHarvestForPondCycle,
} = require("./orsonDomain/harvestCalculations");
const { resolvePhysicalPond } = require("./orsonDomain/physicalPondIdentity");
const { farmDateKey } = require("../farmDate");
const { createHash } = require("node:crypto");
const clean = (value) => JSON.parse(JSON.stringify(value));
const INVENTORY_CATEGORIES = {
  feed: ["Starter", "Grower", "Finisher", "Other"],
  additive: ["Water Conditioner", "Probiotic", "Mineral", "Vitamin", "Other"],
};
function canonical(value) {
  if (value === undefined) return null;
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  return value;
}
const hash = (value) =>
  createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
const numeric = (value, label) => {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    !Number.isFinite(Number(value))
  )
    fail(`${label} is missing.`);
  return Number(value);
};
const cycleKeys = (pond) =>
  clean({
    cycleId: pond.cycleId,
    cycleName: pond.cycleName,
    pondCycleId: pond.pondCycleId || pond.id,
  });
const recordInCycle = (row, pond) =>
  (!row.pondCycleId || row.pondCycleId === (pond.pondCycleId || pond.id)) &&
  (!row.cycleId || !pond.cycleId || row.cycleId === pond.cycleId);

/** Reads and computes only. Caller applies the complete write set after all reads. */
async function planCommands({ auth, commands, operationId, transaction }) {
  const cache = new Map(),
    writes = new Map(),
    basis = [],
    rows = [],
    links = [];
  const get = (ref) => (transaction ? transaction.get(ref) : ref.get());
  const read = async (collection, id) => {
    if (!validId(id)) fail(`Select a valid ${collection} record.`);
    const key = `${collection}/${id}`;
    if (!cache.has(key)) {
      const snap = await get(auth.base.collection(collection).doc(id));
      cache.set(key, snap.exists ? { ...snap.data(), id } : null);
    }
    return cache.get(key);
  };
  const list = async (collection) => {
    const snapshot = await get(auth.base.collection(collection));
    const records = new Map(
      snapshot.docs.map((doc) => [doc.id, { ...doc.data(), id: doc.id }]),
    );
    for (const write of writes.values())
      if (write.collection === collection)
        if (write.delete) records.delete(write.id);
        else records.set(write.id, {
            ...(records.get(write.id) || {}),
            ...write.values,
            id: write.id,
          });
    return [...records.values()];
  };
  const put = (collection, id, values, replace = false) => {
    const key = `${collection}/${id}`;
    const old = writes.get(key);
    writes.set(key, {
      collection,
      id,
      values: clean({ ...(old?.values || {}), ...values }),
      replace: old?.replace || replace,
    });
    cache.set(key, { ...(cache.get(key) || {}), ...clean(values), id });
  };
  const remove = (collection, id) => {
    const key = `${collection}/${id}`;
    writes.set(key, { collection, id, delete: true, values: {}, replace: true });
    cache.set(key, null);
  };
  const metadata = { updatedBy: auth.uid, updatedAt: new Date().toISOString() };
  const financeMeta = {
    companyId: auth.companyId,
    addedBy: auth.uid,
    addedByName: auth.user?.name || auth.user?.email || "Orson",
    timestamp: Date.now(),
    ...metadata,
  };
  const now = new Date().toISOString();
  for (const input of commands) {
    const c = normalizeCommand(input),
      v = c.values;
    auth.require(ORSON_ACTIONS[c.type].permission);
    const row = {
      command: c,
      title: ORSON_ACTIONS[c.type].label,
      target: "",
      valid: true,
      warnings: [],
      effects: [],
      before: {},
    };
    const generatedId = `orson-${hash([operationId, c.id]).slice(0, 32)}`;
    const pondAction = [
      "update_pond_details",
      "upsert_water_quality",
      "record_sampling",
      "record_mortality",
      "record_feeding",
      "apply_pond_treatment",
      "record_harvest",
      "start_cycle",
      "end_cycle",
    ].includes(c.type);
    let pond;
    if (pondAction) {
      pond = await read("ponds", c.pondId);
      if (!pond && c.type === "start_cycle") {
        const physical = await read("physicalPonds", c.pondId);
        if (physical)
          pond = {
            ...physical,
            physicalPondId: physical.id,
            cycleStatus: "ended",
            isPhysicalStart: true,
          };
      }
      auth.checkPond(pond);
      row.target = pond.pondName || pond.id;
      const identity = {
        cycleId: pond.cycleId || null,
        cycleStatus: pond.cycleStatus || "active",
        physicalPondId: pond.physicalPondId || null,
      };
      basis.push(identity);
      if (
        c.type !== "start_cycle" &&
        c.type !== "update_pond_details" &&
        pond.cycleStatus === "ended" &&
        !c.recordId
      )
        fail(
          "This pond cycle has ended. Select an existing record to correct.",
        );
      if (c.date > farmDateKey(auth.company.timeZone))
        fail("Operational records cannot be dated in the future.");
      if (
        c.type !== "start_cycle" &&
        c.type !== "update_pond_details" &&
        c.date < String(pond.cycleStartedAt || pond.docStart || "").slice(0, 10)
      )
        fail("The date is before stocking.");
      if (
        pond.cycleEndedAt &&
        c.type !== "start_cycle" &&
        c.type !== "update_pond_details" &&
        c.date > String(pond.cycleEndedAt).slice(0, 10)
      )
        fail("The date is after this cycle ended.");
      links.push({
        label: row.target,
        web: `/dashboard/ponds/detail?id=${encodeURIComponent(c.type === "start_cycle" ? generatedId : pond.id)}`,
        mobile: `/ponddetails?pondId=${encodeURIComponent(c.type === "start_cycle" ? generatedId : pond.id)}`,
      });
    }
    if (c.type === "update_pond_details") {
      if (v.pondName !== undefined && !v.pondName)
        fail("Pond name cannot be empty.");
      const before = Object.fromEntries(
        Object.keys(v).map((key) => [key, pond[key] ?? null]),
      );
      row.before = before;
      basis.push(before);
      const changes = { ...v };
      if (v.supplier !== undefined) changes.plSupplier = v.supplier;
      if (v.pondArea !== undefined || v.density !== undefined) {
        const area = numeric(v.pondArea ?? pond.pondArea, "Pond area");
        const density = numeric(v.density ?? pond.density, "Stocking density");
        if (area <= 0 || density <= 0) fail("Pond area and density must be positive.");
        const initialPopulation = area * density;
        const harvested = numeric(pond.totalHarvestedPopulation ?? 0, "Harvested population");
        const mortality = calculatePondMetricsWithHarvest(pond).totalMortality;
        if (initialPopulation < harvested + mortality)
          fail("Corrected stocking population cannot be below recorded harvest and mortality.");
        row.before.initialPopulation = pond.initialPopulation ?? null;
        basis.push({ initialPopulation: pond.initialPopulation ?? null, harvested, mortality });
        changes.initialPopulation = initialPopulation;
        row.effects.push(`Stocking population becomes ${initialPopulation} shrimp.`);
        if (pond.cycleStartMode === "midcycle")
          row.warnings.push("The separate mid-cycle population estimate remains unchanged.");
      }
      if (v.pondName !== undefined || v.pondArea !== undefined) {
        if (pond.cycleStatus === "ended")
          fail("Rename or resize the physical pond through pond management after this cycle ended.");
        const physicals = await list("physicalPonds");
        const physical = resolvePhysicalPond(pond, physicals);
        if (!physical) fail("This pond needs a registered physical-pond link.");
        if (physical.blockId !== pond.blockId ||
            (physical.activePondId && physical.activePondId !== pond.id))
          fail("The physical pond is linked to a different pond or block.");
        if (v.pondName !== undefined && physicals.some((other) =>
          other.id !== physical.id && other.blockId === pond.blockId &&
          String(other.pondName || "").trim().toLowerCase() === v.pondName.toLowerCase()))
          fail("Another physical pond in this block already has that name.");
        basis.push({ physicalId: physical.id, pondName: physical.pondName, pondArea: physical.pondArea });
        put("physicalPonds", physical.id, {
          ...(v.pondName !== undefined ? { pondName: v.pondName } : {}),
          ...(v.pondArea !== undefined ? { pondArea: v.pondArea } : {}),
          ...metadata,
        });
      }
      for (const [key, value] of Object.entries(v))
        row.effects.push(`${key}: ${String(before[key] ?? "Missing")} → ${String(value)}`);
      put("ponds", pond.id, { ...changes, ...metadata });
    } else if (
      ["upsert_water_quality", "record_sampling", "record_feeding"].includes(
        c.type,
      )
    ) {
      const samplings = [...(pond.samplings || [])];
      let index = c.recordId
        ? samplings.findIndex(
            (r) => r.id === c.recordId && recordInCycle(r, pond),
          )
        : -1;
      if (c.recordId && index < 0)
        fail("The selected record no longer exists.");
      if (!c.recordId && c.type !== "record_sampling") {
        const candidates = samplings
          .map((r, i) => ({ r, i }))
          .filter(
            ({ r }) =>
              r.date === c.date &&
              recordInCycle(r, pond) &&
              !r.isBaselineEstimate &&
              r.source !== "midcycle_onboarding" &&
              (c.type !== "record_feeding" || r.feedData),
          );
        if (candidates.length > 1)
          fail("Several records match this date. Choose the exact record ID.");
        if (candidates.length === 1) index = candidates[0].i;
      }
      const previous = index >= 0 ? samplings[index] : null;
      if (c.type === "record_feeding" && previous && previous.date !== c.date)
        fail(
          "Correct feeding on its original date; moving inventory usage between days requires separate reviewed entries.",
        );
      row.before = Object.fromEntries(
        (c.type === "record_feeding" ? ["feedData"] : Object.keys(v)).map(
          (key) => [key, previous?.[key] ?? null],
        ),
      );
      basis.push({
        type: c.type,
        record: previous
          ? { id: previous.id, date: previous.date, ...row.before }
          : null,
      });
      let next = {
        ...(previous || {
          id: c.type === "record_feeding" ? `feed-${c.date}` : generatedId,
          mbw: 0,
          mortality: 0,
        }),
        date: c.date,
        ...cycleKeys(pond),
      };
      if (c.type === "record_feeding") {
        const oldAllocations = normalizeFeedAllocations(previous?.feedData);
        const ids = [
          ...new Set(
            [...oldAllocations, ...c.allocations].map((r) => r.inventoryFeedId),
          ),
        ];
        for (const id of ids) {
          const stock = await read("feeds", id);
          if (!stock) fail("Feed inventory is unavailable.");
          const desired =
            c.allocations.find((r) => r.inventoryFeedId === id)?.quantityKg ||
            0;
          const intent = {
            pondId: pond.id,
            date: c.date,
            allocations: c.allocations,
            previousFeedIds: ids,
          };
          const update = reconcileDailyFeedStock(
            stock,
            desired,
            intent,
            `${generatedId}:${id}`,
          );
          if (update) {
            const usage = update.usageHistory.at(-1);
            basis.push({
              feed: id,
              unitPrice: usage.unitPrice,
              delta: usage.quantity,
            });
            row.effects.push(
              `${stock.feedName || id}: ${usage.quantity > 0 ? "deduct" : "return"} ${Math.abs(usage.quantity)} kg; cost ${Math.abs(usage.totalCost).toFixed(2)}`,
            );
            put("feeds", id, { ...update, lastUpdated: now });
          }
        }
        next.feedData = {
          ...previous?.feedData,
          ...v,
          totalDailyFeed: c.allocations
            .reduce((sum, r) => sum + r.quantityKg, 0)
            .toFixed(2),
          feedAllocations: c.allocations,
          inventoryFeedId:
            c.allocations.length === 1
              ? c.allocations[0].inventoryFeedId
              : null,
        };
      } else {
        for (const [key, value] of Object.entries(v))
          next[key] = c.type === "upsert_water_quality" ? String(value) : value;
        if (c.type === "upsert_water_quality")
          for (const [key, value] of Object.entries(v)) {
            if (key.startsWith("do") && Number(value) < 4)
              row.warnings.push(
                `${key} is low; preserve the measured reading and review pond conditions.`,
              );
            if (
              key.startsWith("ph") &&
              (Number(value) < 6.5 || Number(value) > 9)
            )
              row.warnings.push(`${key} is outside the usual operating range.`);
          }
      }
      if (index >= 0) samplings[index] = next;
      else samplings.push(next);
      put("ponds", pond.id, { samplings, ...metadata });
    } else if (c.type === "record_mortality") {
      const records = [...(pond.mortalityRecords || [])];
      const index = c.recordId
        ? records.findIndex(
            (r) => r.id === c.recordId && recordInCycle(r, pond),
          )
        : -1;
      if (c.recordId && index < 0)
        fail("The selected mortality record no longer exists.");
      const previous = index >= 0 ? records[index] : null;
      basis.push(previous);
      row.before = previous || {};
      const latest = [...(pond.samplings || [])]
        .filter((r) => r.date <= c.date && Number(r.mbw) > 0)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      const record = {
        ...(previous || {}),
        id: previous?.id || generatedId,
        date: c.date,
        ...v,
        ...cycleKeys(pond),
        recordedAt: previous?.recordedAt || now,
        recordedBy: previous?.recordedBy || auth.uid,
        ...(latest ? { mbwAtRecord: Number(latest.mbw) } : {}),
      };
      if (index >= 0) records[index] = record;
      else records.push(record);
      if (
        numeric(
          pond.initialPopulation ?? pond.initialStock,
          "Initial population",
        ) -
          numeric(pond.totalHarvestedPopulation ?? 0, "Harvested population") <
        records.reduce((sum, r) => sum + Number(r.count || 0), 0)
      )
        fail("Cumulative mortality exceeds the remaining stocked population.");
      put("ponds", pond.id, { mortalityRecords: records, ...metadata });
    } else if (
      [
        "stock_in_inventory",
        "void_inventory_purchase",
        "apply_pond_treatment",
        "update_inventory_details",
        "delete_inventory_item",
      ].includes(c.type)
    ) {
      if (!c.itemType) fail("Choose feed or additive.");
      const collection = c.itemType === "feed" ? "feeds" : "additives";
      if (c.type === "stock_in_inventory" && c.itemId && v.category !== undefined)
        fail("Existing inventory items keep their saved category; do not set a category on a stock-in purchase.");
      let stock;
      if (c.type === "stock_in_inventory" && !c.itemId && v.itemName) {
        if (!v.category || !v.unit)
          fail("New items require a category and unit.");
        if (!INVENTORY_CATEGORIES[c.itemType].includes(v.category))
          fail(`Choose a valid ${c.itemType} inventory category: ${INVENTORY_CATEGORIES[c.itemType].join(", ")}.`);
        const matches = (await list(collection)).filter(
          (item) =>
            String(item.feedName || item.additiveName || "")
              .trim()
              .toLowerCase() === v.itemName.trim().toLowerCase(),
        );
        if (matches.length)
          fail(
            "An item with this name already exists. Select it before stocking in.",
          );
        stock = {
          id: `item-${generatedId}`,
          companyId: auth.companyId,
          [c.itemType === "feed" ? "feedName" : "additiveName"]: v.itemName,
          [c.itemType === "feed" ? "feedType" : "category"]: v.category,
          unit: v.unit,
          totalStock: 0,
          totalCost: 0,
          stockInHistory: [],
          usageHistory: [],
          createdAt: now,
        };
        put(collection, stock.id, stock, true);
        row.effects.push(`Create inventory item: ${v.itemName} (${v.unit})`);
      } else stock = await read(collection, c.itemId);
      if (!stock) fail("Select an inventory item or enter a new item name.");
      row.target = `${pond ? `${row.target} · ` : ""}${stock.feedName || stock.additiveName || stock.id}`;
      const stockId = stock.id;
      links.push({
        label: stock.feedName || stock.additiveName || stock.id,
        web: "/dashboard/inventory/feeds",
        mobile: "/inventory/feedAdditives",
      });
      if (c.type === "delete_inventory_item") {
        if (commands.length !== 1)
          fail("Delete one inventory item per confirmed operation.");
        if (stock.inventoryKind === "treatmentMix")
          fail("Treatment mixes must be removed through treatment mix management.");
        if (!Array.isArray(stock.stockInHistory) || !Array.isArray(stock.usageHistory))
          fail("This item has incomplete movement history and cannot be safely deleted.");
        if (stock.stockInHistory.length || stock.usageHistory.length || Object.keys(stock.financeEntries || {}).length)
          fail("This item has purchase, usage, or linked finance history. Keep it for audit and resolve its movements through inventory management.");
        const remainingStock = Number(stock.totalStock);
        const remainingCost = Number(stock.totalCost);
        if (!Number.isFinite(remainingStock) || remainingStock < 0 || !Number.isFinite(remainingCost) || remainingCost < 0)
          fail("Stock or cost is missing or invalid; correct the inventory record before deleting it.");
        row.before = {
          name: stock.feedName || stock.additiveName || stock.id,
          unit: stock.unit || "kg",
          totalStock: remainingStock,
          totalCost: remainingCost,
        };
        basis.push(stock);
        row.effects.push(`Permanently delete ${row.target}, including ${remainingStock} ${stock.unit || "kg"} remaining stock and recorded cost ${remainingCost} ${auth.company.currency || auth.company.currencyCode || "company currency"}.`);
        remove(collection, stockId);
      } else if (c.type === "void_inventory_purchase") {
        if (commands.length !== 1)
          fail("Void one inventory purchase per confirmed operation.");
        if (!c.recordId)
          fail("Select a purchase record to void.");
        if (!stock || typeof stock !== "object")
          fail("Select a valid inventory item.");
        if (stock.inventoryKind === "treatmentMix")
          fail("Treatment mixes cannot be voided through purchase voiding.");

        if (!Array.isArray(stock.usageHistory))
          fail("This item has incomplete usage history and cannot have purchases voided.");
        if (stock.usageHistory.length > 0)
          fail("Items with recorded usage cannot have purchases voided.");

        if (!Array.isArray(stock.stockInHistory))
          fail("This item has incomplete purchase history and cannot have purchases voided.");

        const matchingIndices = stock.stockInHistory
          .map((r, i) => (r && typeof r === "object" && r.id === c.recordId ? i : -1))
          .filter((i) => i >= 0);
        if (matchingIndices.length === 0)
          fail("The purchase record no longer exists.");
        if (matchingIndices.length > 1)
          fail("Duplicate purchase records found; cannot safely void.");
        const index = matchingIndices[0];
        const purchase = stock.stockInHistory[index];
        if (!purchase || typeof purchase !== "object")
          fail("The purchase record is invalid.");
        if (purchase.voided)
          fail("This purchase is already voided.");
        if (purchase.source === "treatmentMixProduction")
          fail("Treatment mix production cannot be voided through purchase voiding.");

        const purchaseQty = Number(purchase.quantity);
        const purchasePrice = Number(purchase.price);
        if (
          !Number.isFinite(purchaseQty) ||
          purchaseQty <= 0 ||
          !Number.isFinite(purchasePrice) ||
          purchasePrice <= 0
        )
          fail("The purchase record has invalid quantity or price.");

        const available = Number(stock.totalStock);
        const cost = Number(stock.totalCost);
        if (
          !Number.isFinite(available) ||
          available < 0 ||
          !Number.isFinite(cost) ||
          cost < 0
        )
          fail("Inventory stock or cost totals are invalid.");

        if (available < purchaseQty)
          fail("Available stock is less than the purchase quantity.");

        const purchaseCost = purchaseQty * purchasePrice;
        if (!Number.isFinite(purchaseCost) || purchaseCost <= 0)
          fail("The purchase record has invalid cost.");

        if (cost < purchaseCost - 0.005)
          fail("Inventory cost is less than the purchase cost.");

        // Reconcile active purchase history to inventory totals conservatively; fail closed if active history cannot explain totals
        let expectedActiveStock = 0;
        let expectedActiveCost = 0;
        for (const p of stock.stockInHistory) {
          if (!p || typeof p !== "object")
            fail("Purchase history contains invalid records.");
          if (p.voided) continue;
          const q = Number(p.quantity);
          const pr = Number(p.price);
          if (!Number.isFinite(q) || q <= 0 || !Number.isFinite(pr) || pr < 0)
            fail("Active purchase history contains invalid quantity or price.");
          expectedActiveStock += q;
          expectedActiveCost += q * pr;
        }
        if (available < expectedActiveStock - 0.005)
          fail("Active purchase history exceeds available stock; cannot safely void without usage reconciliation.");
        if (cost < expectedActiveCost - 0.01)
          fail("Active purchase history exceeds inventory cost; cannot safely void without usage reconciliation.");

        const expectedCollection = c.itemType === "feed" ? "feeds" : "additives";
        const expense = buildInventoryExpense({
          ...purchase,
          itemId: stockId,
          itemName: stock.feedName || stock.additiveName,
          type: c.itemType,
          sourceStockIndex: index,
        });
        const expenseId = financeSyncDocumentId(expense.reference);
        const ledger = await read("expenses", expenseId);
        if (!ledger || typeof ledger !== "object")
          fail("The linked finance expense does not exist.");
        if (ledger.voided)
          fail("The linked expense is already voided.");
        if (
          ledger.sourceKind !== "inventory" ||
          ledger.sourceCollection !== expectedCollection ||
          ledger.sourceId !== stockId ||
          ledger.sourceLineId !== purchase.id ||
          ledger.sourceStockIndex !== index
        )
          fail("Expense source metadata does not match this purchase.");
        if (ledger.reference !== expense.reference)
          fail("Expense reference does not match this purchase.");
        if (ledger.date !== purchase.date)
          fail("Expense date does not match this purchase.");
        if (ledger.companyId !== auth.companyId)
          fail("Expense company does not match this purchase.");

        if (ledger.paymentType !== "Unconfirmed")
          fail("This purchase has confirmed payment and cannot be voided.");
        if (ledger.settlements !== undefined && !Array.isArray(ledger.settlements))
          fail("Malformed settlements array on linked expense.");
        if (Array.isArray(ledger.settlements) && ledger.settlements.length > 0)
          fail("This purchase has payment settlements and cannot be voided.");

        const ledgerAmount = Number(ledger.amount);
        if (!Number.isFinite(ledgerAmount) || Math.abs(ledgerAmount - purchaseCost) >= 0.01)
          fail("Expense amount does not match the purchase record.");

        if (!stock.financeEntries || typeof stock.financeEntries !== "object")
          fail("Inventory finance entries are missing for this item.");
        const sourceEntry = stock.financeEntries[expenseId];
        if (!sourceEntry || typeof sourceEntry !== "object")
          fail("The linked finance entry on the inventory item does not exist.");
        if (sourceEntry.voided)
          fail("This purchase finance entry is already voided.");
        const sourceAmount = Number(sourceEntry.amount);
        if (
          !Number.isFinite(sourceAmount) ||
          Math.abs(sourceAmount - purchaseCost) >= 0.01
        )
          fail("Inventory finance entry metadata is inconsistent with the purchase.");

        if (!sourceEntry.reference || sourceEntry.reference !== expense.reference)
          fail("Inventory finance entry reference does not match the purchase.");

        if (!sourceEntry.date || sourceEntry.date !== purchase.date)
          fail("Inventory finance entry date does not match the purchase.");

        if (sourceEntry.sourceKind !== undefined && sourceEntry.sourceKind !== "inventory")
          fail("Inventory finance entry sourceKind is inconsistent.");
        if (sourceEntry.sourceCollection !== undefined && sourceEntry.sourceCollection !== expectedCollection)
          fail("Inventory finance entry sourceCollection is inconsistent.");
        if (sourceEntry.sourceId !== undefined && sourceEntry.sourceId !== stockId)
          fail("Inventory finance entry sourceId is inconsistent.");
        if (sourceEntry.sourceLineId !== undefined && sourceEntry.sourceLineId !== purchase.id)
          fail("Inventory finance entry sourceLineId is inconsistent.");
        if (sourceEntry.sourceStockIndex !== undefined && sourceEntry.sourceStockIndex !== index)
          fail("Inventory finance entry sourceStockIndex is inconsistent.");

        basis.push(stock, ledger);
        row.before = {
          purchaseId: purchase.id,
          date: purchase.date,
          quantity: purchaseQty,
          price: purchasePrice,
          unit: purchase.unit || stock.unit || "kg",
          totalCost: purchaseCost,
          expenseId,
        };
        const roundQty = (val) => Math.round(val * 1000) / 1000;
        const roundCost = (val) => Math.round(val * 100) / 100;
        const remainingStock = roundQty(available - purchaseQty);
        const remainingCost = roundCost(Math.max(0, cost - purchaseCost));
        const updatedPurchase = {
          ...purchase,
          voided: true,
          voidedAt: now,
          voidedBy: auth.uid,
        };
        const history = [...stock.stockInHistory];
        history[index] = updatedPurchase;
        put(collection, stockId, {
          totalStock: remainingStock,
          totalCost: remainingCost,
          stockInHistory: history,
          archived: remainingStock === 0,
          financeEntries: {
            ...stock.financeEntries,
            [expenseId]: {
              ...financeSourceEntry(expense),
              id: expenseId,
              voided: true,
              voidedAt: now,
              voidedBy: auth.uid,
            },
          },
          lastUpdated: now,
        });
        put("expenses", expenseId, {
          voided: true,
          voidedAt: now,
          voidedBy: auth.uid,
          updatedAt: now,
          updatedBy: auth.uid,
        });
        links.push({
          label: "Finance",
          web: "/dashboard/finance",
          mobile: "/finance",
        });
        row.effects.push(
          `Audited effect: Void purchase of ${purchaseQty} ${purchase.unit || stock.unit || "kg"} (${purchaseCost.toFixed(2)}); remaining stock becomes ${remainingStock} ${stock.unit || "kg"}.`,
        );
        row.effects.push(
          `Audited effect: Void linked unconfirmed expense ${expenseId} (${purchaseCost.toFixed(2)}).`,
        );
        if (remainingStock === 0) {
          row.effects.push("Audited effect: Archive inventory item as remaining stock is zero.");
        }
      } else if (c.type === "update_inventory_details") {
        row.before = Object.fromEntries(
          Object.keys(v).map((key) => [key, stock[key] ?? null]),
        );
        basis.push(row.before);
        if (
          (c.itemType === "feed" && v.additiveName) ||
          (c.itemType === "additive" && v.feedName)
        )
          fail("The item name must match its inventory type.");
        put(collection, stockId, { ...v, lastUpdated: now });
      } else {
        if (v.unit !== (stock.unit || "kg"))
          fail(`Use the inventory unit: ${stock.unit || "kg"}.`);
        const available = numeric(stock.totalStock, "Inventory stock"),
          cost = numeric(stock.totalCost, "Inventory cost");
        if (c.type === "stock_in_inventory") {
          if (stock.inventoryKind === "treatmentMix")
            fail("Use treatment mix production to replenish this item.");
          const history = [...(stock.stockInHistory || [])];
          const index = c.recordId
            ? history.findIndex((r) => r.id === c.recordId)
            : -1;
          if (c.recordId && index < 0)
            fail("The purchase record no longer exists.");
          const previous = index >= 0 ? history[index] : null;
          if (previous?.voided)
            fail("A voided purchase cannot be corrected or resurrected.");
          if (previous && (stock.usageHistory || []).length)
            fail(
              "Consumed purchases require reconciliation in inventory before their quantity or price can be corrected.",
            );
          basis.push(previous);
          row.before = previous || {};
          const purchase = {
            ...previous,
            ...v,
            id: previous?.id || generatedId,
            date: c.date,
          };
          if (index >= 0) history[index] = purchase;
          else history.push(purchase);
          const expense = buildInventoryExpense({
            ...purchase,
            itemId: stockId,
            itemName: stock.feedName || stock.additiveName,
            type: c.itemType,
            sourceStockIndex: index >= 0 ? index : history.length - 1,
          });
          const expenseId = financeSyncDocumentId(expense.reference);
          const ledger = await read("expenses", expenseId);
          if (
            ledger?.settlements?.length ||
            (ledger?.paymentType && ledger.paymentType !== "Unconfirmed")
          )
            fail(
              "This purchase has payment activity. Correct it through finance reconciliation.",
            );
          const totalStock =
            available + v.quantity - Number(previous?.quantity || 0);
          const totalCost =
            cost +
            v.quantity * v.price -
            Number(previous?.quantity || 0) * Number(previous?.price || 0);
          if (totalStock < 0 || totalCost < 0)
            fail("The correction would create negative inventory.");
          put(collection, stockId, {
            totalStock,
            totalCost,
            stockInHistory: history,
            archived: false,
            financeEntries: {
              ...stock.financeEntries,
              [expenseId]: financeSourceEntry(expense),
            },
            lastUpdated: now,
          });
          put("expenses", expenseId, { ...expense, ...financeMeta });
          row.effects.push(
            `Stock in ${v.quantity} ${v.unit}; unconfirmed expense ${(v.quantity * v.price).toFixed(2)}`,
          );
        } else {
          const history = [...(stock.usageHistory || [])];
          const index = c.recordId
            ? history.findIndex(
                (r) => r.id === c.recordId && r.pondId === pond.id,
              )
            : -1;
          if (c.recordId && index < 0)
            fail("The treatment usage no longer exists.");
          const previous = index >= 0 ? history[index] : null;
          if (
            previous?.source === "daily_feed_record" ||
            previous?.source === "treatmentMixProduction"
          )
            fail("Correct this source through its original workflow.");
          const delta = v.quantity - Number(previous?.quantity || 0);
          if (delta > available) fail("Insufficient inventory stock.");
          const unitPrice =
            delta < 0
              ? getUsageReturnCost([previous], -delta).unitPrice
              : cost / available;
          if (!Number.isFinite(unitPrice) || unitPrice <= 0)
            fail("Inventory cost is missing.");
          basis.push({ previous, unitPrice });
          row.before = previous || {};
          const usage = {
            ...previous,
            id: previous?.id || generatedId,
            date: c.date,
            quantity: v.quantity,
            unitPrice,
            totalCost: Number(previous?.totalCost || 0) + delta * unitPrice,
            pondId: pond.id,
            ...cycleKeys(pond),
            notes: v.notes || "",
            createdAt: previous?.createdAt || now,
          };
          if (index >= 0) history[index] = usage;
          else history.push(usage);
          put(collection, stockId, {
            totalStock: available - delta,
            totalCost: Math.max(0, cost - delta * unitPrice),
            usageHistory: history,
            lastUpdated: now,
          });
          row.effects.push(
            `${delta >= 0 ? "Deduct" : "Return"} ${Math.abs(delta)} ${v.unit}; cost ${Math.abs(delta * unitPrice).toFixed(2)}`,
          );
        }
      }
    } else if (c.type === "record_harvest") {
      const previous = c.recordId
        ? await read("harvestRecords", c.recordId)
        : null;
      if (c.recordId && (!previous || previous.voided))
        fail("The harvest record is unavailable.");
      if (
        previous &&
        (previous.ponds?.length !== 1 || previous.ponds[0].pondId !== pond.id)
      )
        fail("Correct a multi-pond harvest through the harvest screen.");
      if (!getHarvestDateSampling(pond, c.date))
        fail("Save a positive-MBW sampling for the harvest date first.");
      basis.push(previous, {
        samplings: pond.samplings,
        totalHarvestedBiomass: pond.totalHarvestedBiomass,
        totalHarvestedPopulation: pond.totalHarvestedPopulation,
        partialHarvestCount: pond.partialHarvestCount,
      });
      row.before = previous || {};
      const restored = previous
        ? reverseHarvestImpactOnPond(pond, previous.ponds[0])
        : pond;
      const partialHarvestNumber =
        v.harvestType === "partial"
          ? previous?.ponds[0]?.partialHarvestNumber ||
            getNextPartialHarvestNumber(restored)
          : undefined;
      const line = withHarvestReference(restored, {
        pondId: pond.id,
        pondName: pond.pondName,
        ...cycleKeys(pond),
        blockId: pond.blockId,
        blockName: pond.blockName,
        ...Object.fromEntries(
          Object.entries(v).map(([k, value]) => [
            k,
            typeof value === "number" ? String(value) : value,
          ]),
        ),
        partialHarvestNumber,
      });
      const removal =
        Number(v.biomass) * Number(v.size) +
        Number(v.subBiomass || 0) * Number(v.subSize || 0);
      if (removal > calculatePondMetricsWithHarvest(restored).currentPopulation)
        fail("Harvest exceeds the estimated remaining population.");
      const updated = applyHarvestImpactToPond(
        restored,
        line,
        c.date,
        partialHarvestNumber,
      );
      const fields = [
        "totalHarvestedBiomass",
        "totalHarvestedPopulation",
        "partialHarvestCount",
        "postHarvestBaselineDate",
        "postHarvestRemainingBiomass",
        "postHarvestRemainingPopulation",
        "postHarvestReferenceSamplingId",
        "postHarvestReferenceSamplingDate",
        "postHarvestReferenceMbw",
      ];
      put("ponds", pond.id, {
        ...Object.fromEntries(fields.map((k) => [k, updated[k]])),
        ...metadata,
      });
      const record = {
        id: generatedId,
        date: c.date,
        ...cycleKeys(pond),
        ponds: [line],
      };
      const revenue = buildHarvestRevenue(record),
        revenueId = financeSyncDocumentId(revenue.reference);
      if (previous) {
        const oldRevenue = buildHarvestRevenue(previous),
          oldId = financeSyncDocumentId(oldRevenue.reference),
          ledger = await read("revenues", oldId);
        if (
          ledger?.settlements?.length ||
          (ledger?.paymentType && ledger.paymentType !== "Unconfirmed")
        )
          fail(
            "This harvest has payment activity. Correct it through finance reconciliation.",
          );
        put("harvestRecords", previous.id, {
          voided: true,
          voidedBy: auth.uid,
          voidedAt: now,
          financeEntry: {
            ...financeSourceEntry(oldRevenue),
            id: oldId,
            voided: true,
          },
        });
        put("revenues", oldId, {
          voided: true,
          voidedBy: auth.uid,
          voidedAt: now,
        });
      }
      put(
        "harvestRecords",
        generatedId,
        {
          ...record,
          financeEntry: { ...financeSourceEntry(revenue), id: revenueId },
          createdBy: auth.uid,
          createdAt: now,
          ...(previous ? { correctedFromHarvestId: previous.id } : {}),
        },
        true,
      );
      put("revenues", revenueId, { ...revenue, ...financeMeta });
      row.effects.push(
        `Unconfirmed harvest revenue ${revenue.amount.toFixed(2)}`,
      );
    } else if (c.type === "start_cycle" || c.type === "end_cycle") {
      auth.require("managePonds");
      const physicals = await list("physicalPonds"),
        physical = resolvePhysicalPond(pond, physicals);
      if (!physical) fail("This pond needs a registered physical-pond link.");
      basis.push(physical);
      if (c.type === "end_cycle") {
        if (pond.cycleStatus === "ended") fail("The cycle already ended.");
        if (
          v.cycleEndReason === "harvested" &&
          !hasFinalHarvestForPondCycle(
            (await list("harvestRecords")).filter((r) => !r.voided),
            pond,
          )
        )
          fail("Record the final harvest before closing as harvested.");
        if (physical.activePondId && physical.activePondId !== pond.id)
          fail("Physical pond is linked to a different active cycle.");
        put("ponds", pond.id, {
          cycleStatus: "ended",
          cycleEndedAt: c.date,
          cycleEndReason: v.cycleEndReason,
          cycleEndedBy: auth.uid,
          ...metadata,
        });
        put("physicalPonds", physical.id, {
          status: "idle",
          activePondId: null,
          ...metadata,
        });
      } else {
        if (
          physical.activePondId ||
          physical.status === "active" ||
          pond.cycleStatus !== "ended"
        )
          fail("End the active pond cycle first.");
        const ponds = await list("ponds");
        if (
          ponds.some(
            (p) =>
              p.cycleStatus !== "ended" &&
              (p.physicalPondId === physical.id ||
                (p.pondName === physical.pondName &&
                  p.blockId === physical.blockId)),
          )
        )
          fail("The physical pond already has an active run.");
        const cycles = await list("cycles");
        const eligible = cycles.filter(
          (cycle) =>
            ["planning", "stocking", "active"].includes(cycle.status) &&
            (!(cycle.blockIds?.length || cycle.blockId) ||
              (cycle.blockIds || [cycle.blockId]).includes(pond.blockId)) &&
            (!cycle.plannedPondIds?.length ||
              cycle.plannedPondIds.includes(physical.id)),
        );
        let cycle = v.cycleId
          ? eligible.find((r) => r.id === v.cycleId)
          : eligible.length === 1
            ? eligible[0]
            : null;
        if (!cycle && eligible.length)
          fail("Select an open production cycle ID.");
        if (!cycle) {
          if (
            auth.company.businessSize === "enterprise" &&
            auth.company.ownerId !== auth.uid &&
            !["owner", "co-owner"].includes(auth.user.role)
          )
            fail("An owner must create the production cycle first.");
          if (!v.cycleName) fail("Enter the new production cycle name.");
          cycle = {
            id: `cycle-${generatedId}`,
            cycleName: v.cycleName,
            status: "stocking",
            plannedStartDate: c.date,
            stockingStartDate: c.date,
            ...(pond.blockId ? { blockIds: [pond.blockId] } : {}),
          };
          put(
            "cycles",
            cycle.id,
            { ...cycle, createdBy: auth.uid, ...metadata },
            true,
          );
        }
        basis.push(cycle);
        const area = numeric(physical.pondArea ?? pond.pondArea, "Pond area");
        if (area <= 0) fail("Pond area must be positive.");
        put(
          "ponds",
          generatedId,
          {
            id: generatedId,
            physicalPondId: physical.id,
            pondName: physical.pondName,
            pondArea: area,
            blockId: physical.blockId,
            blockName: physical.blockName,
            density: v.density,
            initialWeight: v.initialWeight,
            initialPopulation: area * v.density,
            supplier: v.supplier,
            plSupplier: v.supplier,
            docStart: c.date,
            cycleStartedAt: c.date,
            cycleStatus: "active",
            cycleId: cycle.id,
            cycleName: cycle.cycleName,
            pondCycleId: generatedId,
            previousCyclePondId: pond.isPhysicalStart ? undefined : pond.id,
            samplings: [],
            mortalityRecords: [],
            totalHarvestedBiomass: 0,
            totalHarvestedPopulation: 0,
            totalHarvestedFeed: 0,
            createdBy: auth.uid,
            createdAt: now,
          },
          true,
        );
        put("physicalPonds", physical.id, {
          status: "active",
          activePondId: generatedId,
          ...metadata,
        });
        row.effects.push(
          `Stock ${area * v.density} shrimp at ${v.initialWeight} g into ${cycle.cycleName}`,
        );
      }
    } else {
      const collection = c.type === "record_expense" ? "expenses" : "revenues";
      const previous = c.recordId ? await read(collection, c.recordId) : null;
      if (c.recordId && (!previous || previous.voided))
        fail("This ledger record is unavailable.");
      if (
        previous &&
        (isSourceLinkedFinance(previous) ||
          previous.sourceKind ||
          previous.settlements?.length)
      )
        fail(
          "Correct source-linked or settled entries through their original workflow.",
        );
      basis.push(previous);
      row.before = previous || {};
      row.target = v.item;
      put(collection, previous?.id || generatedId, {
        ...v,
        date: c.date,
        ...financeMeta,
      });
      row.effects.push(
        `${c.type === "record_expense" ? "Expense" : "Revenue"} ${v.amount}; ${v.paymentType}`,
      );
      links.push({
        label: "Finance",
        web: "/dashboard/finance",
        mobile: "/finance",
      });
    }
    rows.push(row);
  }
  return {
    rows: clean(rows),
    basis: hash(basis),
    writes: [...writes.values()],
    links: clean(links),
  };
}
module.exports = { planCommands, hash, clean, recordInCycle };
