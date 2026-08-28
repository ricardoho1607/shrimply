const assert = require("node:assert/strict");
const test = require("node:test");
const {
  getOperationalCandidates,
  getOperationalNotificationId,
  getOperationalSummaryCounts,
  isLowStock,
} = require("./operationalNotificationsCore");

test("builds the same operational candidates without loading them on every client", () => {
  const candidates = getOperationalCandidates({
    now: new Date("2026-08-28T12:00:00Z"),
    feeds: [{ id: "feed-1", feedName: "Grower", totalStock: 4, reorderLevel: 5 }],
    additives: [
      { id: "add-1", additiveName: "Mineral", totalStock: 0, reorderLevel: 2 },
      { id: "mix-1", inventoryKind: "treatmentMix", totalStock: 0, reorderLevel: 2 },
    ],
    assets: [{
      id: "asset-1",
      assetName: "Pump",
      currentHolder: "user-2",
      transferHistory: [{ to: "Tech", expectedReturn: "2026-08-27T12:00:00Z", returned: false }],
    }],
  });

  assert.deepEqual(candidates.lowStockFeeds.map((item) => item.id), ["feed-1"]);
  assert.deepEqual(candidates.lowStockAdditives.map((item) => item.id), ["add-1"]);
  assert.deepEqual(candidates.overdueAssets.map(({ asset }) => asset.id), ["asset-1"]);
  assert.equal(candidates.overdueAssets[0].transfer.to, "Tech");
  assert.deepEqual(getOperationalSummaryCounts(candidates), {
    lowStockFeedCount: 1,
    lowStockAdditiveCount: 1,
    overdueAssetCount: 1,
  });
});

test("uses stable daily notification ids and defensive stock checks", () => {
  const date = new Date("2026-08-28T23:59:00Z");
  assert.equal(
    getOperationalNotificationId("company-1", "feed_low_stock", "feed-1", date),
    "operational:company-1:feed_low_stock:feed-1:20260828",
  );
  assert.equal(isLowStock({ totalStock: 0, reorderLevel: 5 }), true);
  assert.equal(isLowStock({ totalStock: 0, reorderLevel: 0 }), false);
  assert.equal(isLowStock({ totalStock: 0, reorderLevel: 5, inventoryKind: "treatmentMix" }), false);
});
