const { fail } = require("./orsonActionAuth");
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
  const inventoryItem = (item, name) => ({
    id: item.id,
    name: item[name],
    unit: item.unit || "kg",
    recentPurchases: (Array.isArray(item.stockInHistory) ? item.stockInHistory : [])
      .filter((purchase) => purchase && typeof purchase.id === "string")
      .slice(-5)
      .reverse()
      .map((purchase) => ({
        id: purchase.id,
        date: purchase.date,
        quantity: purchase.quantity,
        price: purchase.price,
      })),
  });
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
    feeds: feeds.map((p) => inventoryItem(p, "feedName")),
    additives: additives.map((p) => inventoryItem(p, "additiveName")),
  };
}
function resolveCommands(commands, catalog) {
  const resolve = (value, records) => {
    if (!value) return value;
    const exact = records.find((r) => r.id === value);
    if (exact) return exact.id;
    const matches = records.filter(
      (r) => normalize(r.name) === normalize(value),
    );
    if (matches.length !== 1)
      fail("Choose an exact authorized pond or inventory item.");
    return matches[0].id;
  };
  return commands.map((c) => {
    try {
      return {
        ...c,
        ...(c.pondId ? { pondId: resolve(c.pondId, catalog.ponds) } : {}),
        ...(c.itemId
          ? {
              itemId: resolve(
                c.itemId,
                c.itemType === "feed" ? catalog.feeds : catalog.additives,
              ),
            }
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
module.exports = { createAgentCatalog, resolveCommands };
