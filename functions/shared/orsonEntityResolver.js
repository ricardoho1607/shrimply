const { fail } = require("./orsonActionAuth");
const { validDate } = require("./orsonDomain/orsonAgentContract");
const normalize = (text) =>
  String(text || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
async function createAgentCatalog(auth) {
  const read = async (collection) =>
    (await auth.base.collection(collection).get()).docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    }));
  const [ponds, feeds, additives, physicals] = await Promise.all([
    auth.allowed("viewFarm") ? read("ponds") : [],
    auth.allowed("manageFeedInventory") ? read("feeds") : [],
    auth.allowed("manageFeedInventory") ? read("additives") : [],
    auth.allowed("viewFarm") ? read("physicalPonds") : [],
  ]);
  const inventoryItem = (item, name, itemType) => {
    const rawStock = item.stockInHistory;
    const rawUsage = item.usageHistory;
    const isStockArray = Array.isArray(rawStock);
    const isUsageArray = Array.isArray(rawUsage);
    let hasMalformedPurchases = !isStockArray;
    let hasDuplicatePurchases = false;
    const seenPurchaseIds = new Set();
    const activePurchases = [];

    if (isStockArray) {
      for (const purchase of rawStock) {
        if (
          !purchase ||
          typeof purchase !== "object" ||
          Array.isArray(purchase) ||
          typeof purchase.id !== "string" ||
          !purchase.id.trim()
        ) {
          hasMalformedPurchases = true;
          continue;
        }
        if (seenPurchaseIds.has(purchase.id)) {
          hasDuplicatePurchases = true;
          continue;
        }
        seenPurchaseIds.add(purchase.id);
        if (purchase.voided !== undefined && typeof purchase.voided !== "boolean") {
          hasMalformedPurchases = true;
          continue;
        }
        if (purchase.voided === true) continue;

        const quantity = Number(purchase.quantity);
        const price = Number(purchase.price);
        if (
          !validDate(purchase.date) ||
          !Number.isFinite(quantity) ||
          quantity <= 0 ||
          !Number.isFinite(price) ||
          price <= 0
        ) {
          hasMalformedPurchases = true;
        }
        activePurchases.push({
          id: purchase.id,
          date: typeof purchase.date === "string" ? purchase.date : null,
          quantity: Number.isFinite(quantity) ? quantity : null,
          price: Number.isFinite(price) ? price : null,
          unit: purchase.unit || item.unit || "kg",
        });
      }
    }

    let hasMalformedUsage = !isUsageArray;
    if (isUsageArray && rawUsage.some((usage) => !usage || typeof usage !== "object")) {
      hasMalformedUsage = true;
    }
    const hasUsage = isUsageArray ? rawUsage.length > 0 : false;
    const hasAmbiguousHistory =
      !isStockArray ||
      !isUsageArray ||
      hasMalformedPurchases ||
      hasDuplicatePurchases ||
      hasMalformedUsage;
    const unit = item.unit || "kg";

    return {
      id: item.id,
      name: item[name],
      itemType,
      unit,
      activePurchaseCount: activePurchases.length,
      activePurchaseId:
        activePurchases.length === 1 ? activePurchases[0].id : null,
      activePurchases,
      hasUsage,
      usageCount: isUsageArray ? rawUsage.length : 0,
      hasAmbiguousHistory,
      hasDuplicatePurchases,
      hasMalformedPurchases,
      recentPurchases: (isStockArray ? rawStock : [])
        .filter((purchase) => purchase && typeof purchase.id === "string")
        .slice(-5)
        .reverse()
        .map((purchase) => ({
          id: purchase.id,
          date: purchase.date,
          quantity: purchase.quantity,
          price: purchase.price,
          voided: purchase.voided === true,
        })),
    };
  };
  return {
    currency: auth.company.currency || auth.company.currencyCode || null,
    ponds: [
      ...ponds,
      ...physicals
        .filter(
          (p) =>
            !p.activePondId &&
            p.status !== "active" &&
            !ponds.some((pond) => pond.physicalPondId === p.id),
        )
        .map((p) => ({ ...p, cycleStatus: "idle" })),
    ]
      .filter((p) => !auth.scoped || auth.blockIds.has(p.blockId))
      .map((p) => ({
        id: p.id,
        name: p.pondName,
        cycleStatus: p.cycleStatus || "active",
      })),
    feeds: feeds.map((p) => inventoryItem(p, "feedName", "feed")),
    additives: additives.map((p) => inventoryItem(p, "additiveName", "additive")),
  };
}
function resolveCommands(commands, catalog) {
  const resolve = (value, records) => {
    if (!value) return value;
    const exact = records.filter((r) => r.id === value);
    if (exact.length === 1) return exact[0].id;
    if (exact.length > 1) fail("Choose an exact authorized inventory item.");
    const matches = records.filter(
      (r) => normalize(r.name) === normalize(value),
    );
    if (matches.length !== 1)
      fail("Choose an exact authorized pond or inventory item.");
    return matches[0].id;
  };
  return commands.map((c) => {
    try {
      const inventoryRecords =
        c.itemType === "feed"
          ? catalog.feeds
          : c.itemType === "additive"
            ? catalog.additives
            : [...(catalog.feeds || []), ...(catalog.additives || [])];
      return {
        ...c,
        ...(c.pondId ? { pondId: resolve(c.pondId, catalog.ponds) } : {}),
        ...(c.itemId
          ? { itemId: resolve(c.itemId, inventoryRecords) }
          : {}),
        ...(c.allocations
          ? {
              allocations: c.allocations.map((a) => ({
                ...a,
                inventoryFeedId: resolve(a.inventoryFeedId, catalog.feeds),
              })),
            }
          : {}),
      };
    } catch {
      return {
        ...c,
        pondId: c.pondId ? "" : c.pondId,
        itemId: c.itemId ? "" : c.itemId,
      };
    }
  });
}
module.exports = { createAgentCatalog, resolveCommands, normalize };
