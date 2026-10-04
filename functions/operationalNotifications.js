const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall } = require('./shared/guardedCallable');
const {
  getActiveOverdueTransfer,
  getOperationalCandidates,
  getOperationalNotificationId,
  getOperationalSummaryCounts,
  isLowStock,
  toDate,
} = require("./operationalNotificationsCore");

const OPERATIONAL_SUMMARY_VERSION = 1;
const SUMMARY_DOCUMENT_PATH = "summaries/dashboard";

const asDocumentData = (snapshot) => snapshot?.exists ? { id: snapshot.id, ...(snapshot.data() || {}) } : null;

const createNotificationOnce = async (db, companyId, type, entityId, payload, now) => {
  const notificationId = getOperationalNotificationId(companyId, type, entityId, now);
  try {
    await db.collection("notifications").doc(notificationId).create(payload);
    return true;
  } catch (error) {
    if (error?.code === 6 || error?.code === "already-exists") return false;
    throw error;
  }
};

const createLowStockNotification = (db, companyId, item, itemType, now, recentKeys) => {
  const recentKey = `feed_low_stock:${item.id}`;
  if (recentKeys?.has(recentKey)) return Promise.resolve(false);
  const itemName = itemType === "feed" ? (item.feedName || "Feed") : (item.additiveName || "Additive");
  const currentStock = Number(item.totalStock);
  const reorderLevel = Number(item.reorderLevel);
  const unit = item.unit || "kg";
  return createNotificationOnce(db, companyId, "feed_low_stock", item.id, {
    companyId,
    type: "feed_low_stock",
    title: `Low Stock: ${itemName}`,
    message: `${itemName} stock is low (${currentStock.toFixed(1)} ${unit}). Reorder level is ${reorderLevel} ${unit}. Consider restocking soon.`,
    timestamp: now,
    read: false,
    priority: currentStock === 0 || currentStock < reorderLevel * 0.5 ? "high" : "medium",
    data: { itemId: item.id, itemName, itemType, currentStock, reorderLevel, unit },
  }, now).then((created) => {
    if (created) recentKeys?.add(recentKey);
    return created;
  });
};

const createOverdueAssetNotification = (db, companyId, candidate, now, recentKeys) => {
  const { asset, transfer, expectedReturn } = candidate;
  const recentKey = `asset_overdue:${asset.id}`;
  if (recentKeys?.has(recentKey)) return Promise.resolve(false);
  const assetName = asset.assetName || asset.name || "Asset";
  const holderName = transfer.toUserName || transfer.to || asset.currentHolder || "Team member";
  const daysOverdue = Math.max(1, Math.floor((now.getTime() - expectedReturn.getTime()) / (24 * 60 * 60 * 1000)));
  return createNotificationOnce(db, companyId, "asset_overdue", asset.id, {
    companyId,
    type: "asset_overdue",
    title: `Overdue asset: ${assetName}`,
    message: `${assetName} was due back from ${holderName} on ${expectedReturn.toLocaleDateString("en-GB", { timeZone: "UTC" })}.`,
    timestamp: now,
    read: false,
    priority: daysOverdue > 7 ? "high" : daysOverdue > 3 ? "medium" : "low",
    data: {
      assetId: asset.id,
      assetName,
      holder: holderName,
      holderName,
      expectedReturn: expectedReturn.toISOString(),
      daysOverdue,
    },
  }, now).then((created) => {
    if (created) recentKeys?.add(recentKey);
    return created;
  });
};

const loadRecentOperationalKeys = async (db, companyId, now) => {
  const notifications = db.collection("notifications");
  const snapshots = await Promise.all(["feed_low_stock", "asset_overdue"].map((type) => (
    notifications
      .where("companyId", "==", companyId)
      .where("type", "==", type)
      .where("read", "==", false)
      .get()
  )));
  const cutoff = now.getTime() - 24 * 60 * 60 * 1000;
  const keys = new Set();
  for (const snapshot of snapshots) {
    for (const document of snapshot.docs) {
      const data = document.data() || {};
      const timestamp = toDate(data.timestamp);
      const entityId = data.type === "asset_overdue" ? data.data?.assetId : data.data?.itemId;
      if (entityId && timestamp && timestamp.getTime() > cutoff) keys.add(`${data.type}:${entityId}`);
    }
  }
  return keys;
};

const countUnreadNotifications = async (db, companyId) => {
  const query = db.collection("notifications")
    .where("companyId", "==", companyId)
    .where("read", "==", false);
  if (typeof query.count === "function") {
    const aggregate = await query.count().get();
    return aggregate.data().count;
  }
  return (await query.get()).size;
};

const loadCompanyOperationalSources = async (db, companyId) => {
  const companyRef = db.collection("companies").doc(companyId);
  const [feeds, additives, assets] = await Promise.all([
    companyRef.collection("feeds").get(),
    companyRef.collection("additives").get(),
    db.collection("assets").where("companyId", "==", companyId).get(),
  ]);
  const mapDocuments = (snapshot) => snapshot.docs.map((document) => ({ id: document.id, ...(document.data() || {}) }));
  return {
    feeds: mapDocuments(feeds),
    additives: mapDocuments(additives),
    assets: mapDocuments(assets),
  };
};

const refreshCompanyOperationalSummary = async (db, companyId, now = new Date()) => {
  const [sources, recentKeys] = await Promise.all([
    loadCompanyOperationalSources(db, companyId),
    loadRecentOperationalKeys(db, companyId, now),
  ]);
  const candidates = getOperationalCandidates({ ...sources, now });
  const notificationResults = await Promise.all([
    ...candidates.lowStockFeeds.map((item) => createLowStockNotification(db, companyId, item, "feed", now, recentKeys)),
    ...candidates.lowStockAdditives.map((item) => createLowStockNotification(db, companyId, item, "additive", now, recentKeys)),
    ...candidates.overdueAssets.map((candidate) => createOverdueAssetNotification(db, companyId, candidate, now, recentKeys)),
  ]);
  const unreadNotificationCount = await countUnreadNotifications(db, companyId);
  const dashboardRef = db.doc(`companies/${companyId}/${SUMMARY_DOCUMENT_PATH}`);
  await dashboardRef.set({
    operationalSummaryVersion: OPERATIONAL_SUMMARY_VERSION,
    operationalManagedBy: "firebase-functions",
    operationalFullRefreshAt: now,
    operationalUpdatedAt: now,
    unreadNotificationCount,
    ...getOperationalSummaryCounts(candidates),
  }, { merge: true });
  return {
    ...getOperationalSummaryCounts(candidates),
    unreadNotificationCount,
    notificationsCreated: notificationResults.filter(Boolean).length,
  };
};

module.exports = ({ admin, assertCompanyMemberForCallable }) => {
  const getDb = () => admin.firestore();
  const fieldIncrement = (delta) => admin.firestore.FieldValue.increment(delta);

  const writeCountDelta = async (companyId, field, delta) => {
    if (!companyId || delta === 0) return;
    await getDb().doc(`companies/${companyId}/${SUMMARY_DOCUMENT_PATH}`).set({
      operationalSummaryVersion: OPERATIONAL_SUMMARY_VERSION,
      operationalManagedBy: "firebase-functions",
      operationalUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      [field]: fieldIncrement(delta),
    }, { merge: true });
  };

  const handleInventoryWrite = (itemType) => async (event) => {
    const companyId = event.params.companyId;
    const before = asDocumentData(event.data?.before);
    const after = asDocumentData(event.data?.after);
    const delta = Number(isLowStock(after)) - Number(isLowStock(before));
    await writeCountDelta(companyId, itemType === "feed" ? "lowStockFeedCount" : "lowStockAdditiveCount", delta);
    if (after && isLowStock(after)) {
      const created = await createLowStockNotification(getDb(), companyId, after, itemType, new Date());
      if (created) await writeCountDelta(companyId, "unreadNotificationCount", 1);
    }
  };

  const handleAssetWrite = async (event) => {
    const before = asDocumentData(event.data?.before);
    const after = asDocumentData(event.data?.after);
    const beforeCompanyId = before?.companyId;
    const afterCompanyId = after?.companyId;
    if (!beforeCompanyId && !afterCompanyId) return;
    const now = new Date();
    const beforeOverdue = before ? getActiveOverdueTransfer(before, now) : null;
    const afterOverdue = after ? getActiveOverdueTransfer(after, now) : null;
    if (beforeCompanyId !== afterCompanyId) {
      if (beforeCompanyId && beforeOverdue) await writeCountDelta(beforeCompanyId, "overdueAssetCount", -1);
      if (afterCompanyId && afterOverdue) await writeCountDelta(afterCompanyId, "overdueAssetCount", 1);
    } else if (afterCompanyId) {
      await writeCountDelta(afterCompanyId, "overdueAssetCount", Number(Boolean(afterOverdue)) - Number(Boolean(beforeOverdue)));
    }
    if (afterCompanyId && after && afterOverdue) {
      const created = await createOverdueAssetNotification(getDb(), afterCompanyId, { asset: after, ...afterOverdue }, now);
      if (created) await writeCountDelta(afterCompanyId, "unreadNotificationCount", 1);
    }
  };

  const handleNotificationWrite = async (event) => {
    const before = asDocumentData(event.data?.before);
    const after = asDocumentData(event.data?.after);
    if (event.params.notificationId.startsWith("operational:") && !before && after) return;
    const beforeUnread = Boolean(before && before.read === false);
    const afterUnread = Boolean(after && after.read === false);
    const beforeCompanyId = before?.companyId;
    const afterCompanyId = after?.companyId;
    if (beforeCompanyId && beforeCompanyId !== afterCompanyId && beforeUnread) {
      await writeCountDelta(beforeCompanyId, "unreadNotificationCount", -1);
    }
    if (afterCompanyId && beforeCompanyId !== afterCompanyId && afterUnread) {
      await writeCountDelta(afterCompanyId, "unreadNotificationCount", 1);
      return;
    }
    if (afterCompanyId) {
      await writeCountDelta(afterCompanyId, "unreadNotificationCount", Number(afterUnread) - Number(beforeUnread));
    }
  };

  return {
    ensureOperationalSummary: onCall({
      region: "us-central1",
      timeoutSeconds: 120,
      memory: "256MiB",
    }, async (request) => {
      const db = getDb();
      const companyId = typeof request.data?.companyId === "string" ? request.data.companyId.trim() : "";
      await assertCompanyMemberForCallable(db, request.auth?.uid, companyId, "viewFarm");
      const summaryRef = db.doc(`companies/${companyId}/${SUMMARY_DOCUMENT_PATH}`);
      const nowMs = Date.now();
      const shouldRefresh = await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(summaryRef);
        const data = snapshot.exists ? snapshot.data() || {} : {};
        const refreshedAt = data.operationalFullRefreshAt?.toDate?.()?.getTime?.() || 0;
        const leaseUntil = data.operationalRefreshLeaseUntil?.toDate?.()?.getTime?.() || 0;
        if (refreshedAt > 0 && nowMs - refreshedAt < 20 * 60 * 60 * 1000) return false;
        if (leaseUntil > nowMs) return false;
        transaction.set(summaryRef, {
          operationalSummaryVersion: OPERATIONAL_SUMMARY_VERSION,
          operationalManagedBy: "firebase-functions",
          operationalRefreshLeaseUntil: admin.firestore.Timestamp.fromMillis(nowMs + 5 * 60 * 1000),
          operationalUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        return true;
      });

      if (!shouldRefresh) return { refreshed: false };
      try {
        const result = await refreshCompanyOperationalSummary(db, companyId);
        await summaryRef.set({
          operationalRefreshLeaseUntil: admin.firestore.FieldValue.delete(),
        }, { merge: true });
        return { refreshed: true, ...result };
      } catch (error) {
        await summaryRef.set({
          operationalRefreshLeaseUntil: admin.firestore.FieldValue.delete(),
          operationalRefreshFailedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true }).catch(() => undefined);
        throw error;
      }
    }),
    refreshOperationalSummaries: onSchedule({
      schedule: "0 4 * * *",
      timeZone: "UTC",
      region: "us-central1",
      timeoutSeconds: 540,
      memory: "512MiB",
    }, async () => {
      const db = getDb();
      const companies = await db.collection("companies").get();
      const failures = [];
      for (const company of companies.docs) {
        try {
          await refreshCompanyOperationalSummary(db, company.id);
        } catch (error) {
          console.error(`Operational summary refresh failed for ${company.id}:`, error);
          failures.push(company.id);
        }
      }
      if (failures.length > 0) throw new Error(`Operational summary refresh failed for ${failures.length} companies`);
    }),
    onFeedOperationalChange: onDocumentWritten("companies/{companyId}/feeds/{itemId}", handleInventoryWrite("feed")),
    onAdditiveOperationalChange: onDocumentWritten("companies/{companyId}/additives/{itemId}", handleInventoryWrite("additive")),
    onAssetOperationalChange: onDocumentWritten("assets/{assetId}", handleAssetWrite),
    onNotificationOperationalChange: onDocumentWritten("notifications/{notificationId}", handleNotificationWrite),
  };
};

module.exports.refreshCompanyOperationalSummary = refreshCompanyOperationalSummary;
