const DAY_MS = 24 * 60 * 60 * 1000;

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();
  if (typeof value?.seconds === "number") return new Date(value.seconds * 1000);
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
};

const isLowStock = (item) => {
  if (!item || item.inventoryKind === "treatmentMix") return false;
  const reorderLevel = Number(item.reorderLevel);
  const totalStock = Number(item.totalStock);
  return Number.isFinite(reorderLevel)
    && reorderLevel > 0
    && Number.isFinite(totalStock)
    && totalStock <= reorderLevel;
};

const getActiveOverdueTransfer = (asset, now = new Date()) => {
  if (!asset?.currentHolder) return null;
  const transfer = [...(asset.transferHistory || [])]
    .reverse()
    .find((item) => !item.returned && !item.actualReturnDate);
  const expectedReturn = toDate(transfer?.expectedReturn);
  if (!transfer || !expectedReturn || expectedReturn >= now) return null;
  return { transfer, expectedReturn };
};

const getOperationalCandidates = ({ feeds = [], additives = [], assets = [], now = new Date() }) => ({
  lowStockFeeds: feeds.filter(isLowStock),
  lowStockAdditives: additives.filter(isLowStock),
  overdueAssets: assets.flatMap((asset) => {
    const overdue = getActiveOverdueTransfer(asset, now);
    return overdue ? [{ asset, ...overdue }] : [];
  }),
});

const getUtcDayKey = (date = new Date()) => date.toISOString().slice(0, 10).replaceAll("-", "");

const getOperationalNotificationId = (companyId, type, entityId, date = new Date()) => (
  `operational:${companyId}:${type}:${entityId}:${getUtcDayKey(date)}`
);

const getOperationalSummaryCounts = (candidates) => ({
  lowStockFeedCount: candidates.lowStockFeeds.length,
  lowStockAdditiveCount: candidates.lowStockAdditives.length,
  overdueAssetCount: candidates.overdueAssets.length,
});

module.exports = {
  DAY_MS,
  getActiveOverdueTransfer,
  getOperationalCandidates,
  getOperationalNotificationId,
  getOperationalSummaryCounts,
  isLowStock,
  toDate,
};
