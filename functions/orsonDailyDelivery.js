const { createHash } = require('node:crypto');
const { FieldPath } = require('firebase-admin/firestore');
const admin = require('./firebaseAdmin');
const { farmDateKey, shiftDateKey, FARM_OPERATIONAL_DAY_ROLLOVER_HOUR } = require('./farmDate');

const DEFAULT_LEASE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const DAILY_DELIVERY_DUE_HOUR = 6; // 06:00 local time
const DEFAULT_BATCH_SIZE = 25;

/**
 * Validate IANA time zone and fall back to UTC if invalid.
 * Records whether UTC fallback was required.
 */
const resolveCompanyTimeZone = (companyOrZone) => {
  const candidate = typeof companyOrZone === 'string'
    ? companyOrZone
    : (companyOrZone?.timeZone || companyOrZone?.timezone);

  if (typeof candidate === 'string' && candidate.trim()) {
    const trimmed = candidate.trim();
    try {
      new Intl.DateTimeFormat('en-CA', { timeZone: trimmed });
      return { timeZone: trimmed, usedUtcFallback: false };
    } catch (_error) {
      // Invalid IANA time zone
    }
  }
  return { timeZone: 'UTC', usedUtcFallback: true };
};

const resolvePinnedTimeZone = (deliveryData, fallbackInfo) => {
  const pinned = resolveCompanyTimeZone(deliveryData?.timeZone);
  if (deliveryData?.timeZone && !pinned.usedUtcFallback) {
    return {
      timeZone: pinned.timeZone,
      usedUtcFallback: deliveryData.usedUtcFallback ?? false,
    };
  }
  if (deliveryData?.timeZone && pinned.usedUtcFallback) {
    return { timeZone: 'UTC', usedUtcFallback: true };
  }
  return fallbackInfo;
};

/**
 * Get the local calendar date key (YYYY-MM-DD) for a time zone.
 */
const getCalendarDayKey = (timeZone, date = new Date()) => {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const part = (type) => parts.find((p) => p.type === type)?.value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  } catch (_error) {
    return date.toISOString().slice(0, 10);
  }
};

/**
 * Get the local hour (0-23) in a time zone.
 */
const getLocalCalendarHour = (timeZone, date = new Date()) => {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || 'UTC',
      hour: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const hourVal = parts.find((p) => p.type === 'hour')?.value;
    const hour = Number(hourVal);
    return Number.isFinite(hour) ? hour : date.getUTCHours();
  } catch (_error) {
    return date.getUTCHours();
  }
};

/**
 * Determine whether daily delivery is due for a company in its local timezone.
 * Due once local time is at or after 06:00 on the calendar day.
 */
const isCompanyDailyDue = (timeZone, now = new Date(), dueHour = DAILY_DELIVERY_DUE_HOUR) => {
  const dayKey = getCalendarDayKey(timeZone, now);
  const localHour = getLocalCalendarHour(timeZone, now);
  const isDue = localHour >= dueHour;
  return {
    isDue,
    dayKey,
    localHour,
    dueHour,
    reason: isDue ? 'due' : 'before_due_hour',
  };
};

/**
 * Deterministic notification doc ID for stable create-if-absent.
 */
const getNotificationDocId = (companyId, dedupeKey) => {
  const hash = createHash('sha256')
    .update(`${companyId}:${dedupeKey}`)
    .digest('hex')
    .slice(0, 32);
  return `orson-${hash}`;
};

/**
 * Create a notification stably if it does not already exist.
 * Returns true if created, false if already present.
 */
const createNotificationIfAbsent = async (db, notificationDocRef, payload) => {
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(notificationDocRef);
    if (snapshot.exists) {
      return false; // Already created!
    }
    transaction.set(notificationDocRef, {
      ...payload,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
      isOrson: true,
      icon: payload.icon || 'brain-circuit',
      data: {
        isOrson: true,
        ...(payload.data || {}),
      },
    });
    return true;
  });
};

/**
 * Acquire generation-fenced lease for a company's daily delivery state.
 */
const acquireDeliveryLease = async ({
  db,
  companyId,
  dayKey,
  timeZoneInfo,
  leaseOwner = 'dispatcher',
  leaseDurationMs = DEFAULT_LEASE_DURATION_MS,
  now = new Date(),
}) => {
  const docRef = db
    .collection('companies')
    .doc(companyId)
    .collection('orsonDailyDelivery')
    .doc(dayKey);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef);
    const nowMs = now.getTime();
    const expiresAtMs = nowMs + leaseDurationMs;

    if (!snapshot.exists) {
      const initialDoc = {
        companyId,
        dayKey,
        timeZone: timeZoneInfo.timeZone,
        usedUtcFallback: timeZoneInfo.usedUtcFallback,
        status: 'processing',
        generation: 1,
        leaseOwner,
        leaseExpiresAtMs: expiresAtMs,
        manifest: null,
        deliveredCount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      transaction.set(docRef, initialDoc);
      return {
        acquired: true,
        docRef,
        isNew: true,
        generation: 1,
        manifest: null,
        timeZoneInfo,
      };
    }

    const data = snapshot.data() || {};

    if (data.status === 'completed') {
      return {
        acquired: false,
        reason: 'already_completed',
        data,
      };
    }

    if (data.status === 'processing') {
      const currentExpiresMs = typeof data.leaseExpiresAtMs === 'number'
        ? data.leaseExpiresAtMs
        : (data.leaseExpiresAt?.toMillis ? data.leaseExpiresAt.toMillis() : 0);

      if (currentExpiresMs > nowMs) {
        return {
          acquired: false,
          reason: 'active_lease',
          data,
        };
      }

      // Expired lease -> recovery
      const nextGen = (data.generation || 1) + 1;
      const pinnedTimeZoneInfo = resolvePinnedTimeZone(data, timeZoneInfo);
      transaction.update(docRef, {
        status: 'processing',
        generation: nextGen,
        leaseOwner,
        leaseExpiresAtMs: expiresAtMs,
        timeZone: pinnedTimeZoneInfo.timeZone,
        usedUtcFallback: pinnedTimeZoneInfo.usedUtcFallback,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return {
        acquired: true,
        docRef,
        recovered: true,
        generation: nextGen,
        manifest: data.manifest || null,
        timeZoneInfo: pinnedTimeZoneInfo,
      };
    }

    if (data.status === 'failed') {
      const nextGen = (data.generation || 1) + 1;
      const pinnedTimeZoneInfo = resolvePinnedTimeZone(data, timeZoneInfo);
      transaction.update(docRef, {
        status: 'processing',
        generation: nextGen,
        leaseOwner,
        leaseExpiresAtMs: expiresAtMs,
        timeZone: pinnedTimeZoneInfo.timeZone,
        usedUtcFallback: pinnedTimeZoneInfo.usedUtcFallback,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return {
        acquired: true,
        docRef,
        retrying: true,
        generation: nextGen,
        manifest: data.manifest || null,
        timeZoneInfo: pinnedTimeZoneInfo,
      };
    }

    return { acquired: false, reason: 'unrecognized_status', data };
  });
};

/**
 * Builds the frozen notification manifest for a company on a given dayKey.
 */
const buildNotificationManifest = ({
  companyId,
  dayKey,
  inventoryForecasts = [],
  nearbyDiseaseReports = [],
  riskSummary = { warningFindings: [], watchFindings: [], biosecurityFindings: [] },
}) => {
  const manifest = [];
  const topRisk = riskSummary.warningFindings[0] || riskSummary.watchFindings[0] || null;
  const criticalInventory = inventoryForecasts.filter((item) => item.daysLeft <= 3);

  // 1. Inventory forecasts
  for (const item of inventoryForecasts) {
    manifest.push({
      type: 'inventory_forecast',
      priority: item.daysLeft <= 3 ? 'high' : 'medium',
      title: `Orson: ${item.itemName} may run out in ${item.daysLeft} days`,
      message: `${item.itemName} has ${item.currentStock} ${item.unit} left. Recent usage averages ${item.avgDailyUsage} ${item.unit}/day, so stock may run out in about ${item.daysLeft} days.`,
      dedupeKey: `inventory_forecast:${item.itemType}:${item.itemId}:${dayKey}`,
      data: {
        itemId: item.itemId,
        itemName: item.itemName,
        itemType: item.itemType,
        currentStock: item.currentStock,
        avgDailyUsage: item.avgDailyUsage,
        daysLeft: item.daysLeft,
        unit: item.unit,
      },
    });
  }

  // 2. Biosecurity warnings
  if (nearbyDiseaseReports.length > 0 && riskSummary.biosecurityFindings.length > 0) {
    const disease = nearbyDiseaseReports[0];
    const finding = riskSummary.biosecurityFindings[0];
    manifest.push({
      type: 'orson_biosecurity',
      priority: finding.severity === 'critical' || disease.severity === 'critical' ? 'high' : 'medium',
      title: `Orson: Biosecurity risk near ${finding.pondName}`,
      message: `${disease.diseaseName} was reported ${disease.distanceKm} km away, while ${finding.pondName} shows ${finding.title.toLowerCase()}. Tighten biosecurity and monitor appetite, mortality, and water quality today.`,
      dedupeKey: `orson_biosecurity:${disease.id}:${finding.pondId}:${finding.id}:${dayKey}`,
      data: {
        reportId: disease.id,
        diseaseName: disease.diseaseName,
        diseaseType: disease.diseaseType,
        distanceKm: disease.distanceKm,
        pondId: finding.pondId,
        pondName: finding.pondName,
        riskId: finding.id,
        severity: finding.severity,
      },
    });
  }

  // 3. Orson Daily Brief
  if (topRisk || criticalInventory.length > 0 || nearbyDiseaseReports.length > 0) {
    const briefParts = [];
    if (topRisk) {
      briefParts.push(`${topRisk.pondName}: ${topRisk.summary}`);
    }
    if (criticalInventory.length > 0) {
      briefParts.push(`${criticalInventory.length} inventory item${criticalInventory.length === 1 ? '' : 's'} may run out within 3 days.`);
    } else if (inventoryForecasts.length > 0) {
      briefParts.push(`${inventoryForecasts.length} inventory item${inventoryForecasts.length === 1 ? '' : 's'} may run out within 7 days.`);
    }
    if (nearbyDiseaseReports.length > 0) {
      briefParts.push(`${nearbyDiseaseReports.length} active disease report${nearbyDiseaseReports.length === 1 ? '' : 's'} nearby.`);
    }

    manifest.push({
      type: 'orson_daily_brief',
      priority: riskSummary.warningFindings.length > 0 || criticalInventory.length > 0 ? 'high' : 'medium',
      title: 'Orson Daily Brief',
      message: briefParts.join(' '),
      dedupeKey: `orson_daily_brief:${dayKey}`,
      data: {
        dateKey: dayKey,
        warningRiskCount: riskSummary.warningFindings.length,
        watchRiskCount: riskSummary.watchFindings.length,
        inventoryForecastCount: inventoryForecasts.length,
        criticalInventoryCount: criticalInventory.length,
        nearbyDiseaseReportCount: nearbyDiseaseReports.length,
        topPondRisk: topRisk ? {
          pondId: topRisk.pondId,
          pondName: topRisk.pondName,
          riskId: topRisk.id,
          severity: topRisk.severity,
        } : null,
      },
    });
  }

  return manifest;
};

/**
 * Helper to execute delivery for a specific company and dayKey.
 * Propagates read failures without swallowing them, leaving manifest unfrozen/incomplete on error.
 */
const executeDayDelivery = async ({
  db,
  companyDoc,
  companyId,
  dayKey,
  timeZoneInfo,
  existingSnap,
  now,
  leaseOwner,
  leaseDurationMs,
  readers,
}) => {
  const company = companyDoc.data() || {};
  const deliveryDocRef = db
    .collection('companies')
    .doc(companyId)
    .collection('orsonDailyDelivery')
    .doc(dayKey);

  // If already completed today, never reopen!
  if (existingSnap && existingSnap.exists) {
    const existingData = existingSnap.data() || {};
    if (existingData.status === 'completed') {
      return {
        status: 'skipped',
        reason: 'already_completed',
        companyId,
        dayKey,
      };
    }
    if (existingData.status === 'processing') {
      const expiresAt = existingData.leaseExpiresAtMs || 0;
      if (expiresAt > now.getTime()) {
        return {
          status: 'skipped',
          reason: 'active_lease',
          companyId,
          dayKey,
        };
      }
    }
  }

  // Acquire generation-fenced lease
  const lease = await acquireDeliveryLease({
    db,
    companyId,
    dayKey,
    timeZoneInfo,
    leaseOwner,
    leaseDurationMs,
    now,
  });

  if (!lease.acquired) {
    return {
      status: 'skipped',
      reason: lease.reason,
      companyId,
      dayKey,
    };
  }

  try {
    let manifest = lease.manifest;
    const effectiveTimeZoneInfo = lease.timeZoneInfo || timeZoneInfo;
    const deliveryContext = {
      dayKey,
      timeZone: effectiveTimeZoneInfo.timeZone,
      usedUtcFallback: effectiveTimeZoneInfo.usedUtcFallback,
      now,
    };

    // If manifest was not yet frozen, load farm data and freeze it
    if (!manifest) {
      const getInventoryForecasts = readers.getCompanyInventoryForecasts || (async () => []);
      const getNearbyDisease = readers.getNearbyActiveDiseaseReports || (async () => []);
      const getPondRiskSummary = readers.getPondRiskSummary || (async () => ({ warningFindings: [], watchFindings: [], biosecurityFindings: [] }));

      // Propagate read failures! Do NOT catch to empty arrays.
      const [inventoryForecasts, nearbyDiseaseReports, riskSummary] = await Promise.all([
        getInventoryForecasts(companyDoc, deliveryContext),
        getNearbyDisease(db, companyId, company.primaryLocation, deliveryContext),
        getPondRiskSummary(companyDoc, deliveryContext),
      ]);

      manifest = buildNotificationManifest({
        companyId,
        dayKey,
        inventoryForecasts,
        nearbyDiseaseReports,
        riskSummary,
      });

      // Freeze manifest on document
      await db.runTransaction(async (transaction) => {
        const snap = await transaction.get(deliveryDocRef);
        if (!snap.exists) return;
        const cur = snap.data();
        if (cur.generation !== lease.generation) {
          throw new Error('Generation fenced out during manifest freeze');
        }
        transaction.update(deliveryDocRef, {
          manifest,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
    }

    // Deliver all notifications create-if-absent and wait for completion
    let createdCount = 0;
    for (const item of manifest) {
      const notifDocId = getNotificationDocId(companyId, item.dedupeKey);
      const notifRef = db.collection('notifications').doc(notifDocId);
      const created = await createNotificationIfAbsent(db, notifRef, {
        companyId,
        type: item.type,
        priority: item.priority,
        title: item.title,
        message: item.message,
        dedupeKey: item.dedupeKey,
        data: item.data,
      });
      if (created) createdCount++;
    }
    const deliveredCount = manifest.length;

    // Mark delivery completed under generation fence
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(deliveryDocRef);
      if (!snap.exists) return;
      const cur = snap.data();
      if (cur.generation !== lease.generation) {
        throw new Error('Generation fenced out on completion');
      }
      transaction.update(deliveryDocRef, {
        status: 'completed',
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        deliveredCount,
      });
    });

    return {
      status: 'completed',
      companyId,
      dayKey,
      deliveredCount,
      createdCount,
      totalManifestCount: manifest.length,
    };
  } catch (error) {
    // Record failure so it can be retried on next recurring dispatch
    try {
      await db.runTransaction(async (transaction) => {
        const snap = await transaction.get(deliveryDocRef);
        if (!snap.exists) return;
        const cur = snap.data();
        if (cur.generation === lease.generation && cur.status !== 'completed') {
          transaction.update(deliveryDocRef, {
            status: 'failed',
            error: error.message || String(error),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      });
    } catch (_ignore) {}

    return {
      status: 'failed',
      companyId,
      dayKey,
      error: error.message || String(error),
    };
  }
};

/**
 * Execute delivery for a single company if due and recoverable.
 * Performs bounded reads to discover recent incomplete processing/failed records
 * and retries using the stored dayKey/timezone/frozen manifest before starting today's delivery.
 * Pinned effective timezone is preserved for in-progress days; company timezone changes apply to future days.
 */
const deliverCompanyDailyNotifications = async ({
  db,
  companyDoc,
  now = new Date(),
  leaseOwner = 'dispatcher',
  leaseDurationMs = DEFAULT_LEASE_DURATION_MS,
  readers = {},
}) => {
  const companyId = companyDoc.id;
  const company = companyDoc.data() || {};

  const deliveryCollRef = db
    .collection('companies')
    .doc(companyId)
    .collection('orsonDailyDelivery');

  // Step 1: Bounded check of recent delivery records for incomplete/failed days
  // Query the oldest unfinished day by status, so an outage longer than three days
  // cannot hide an older failed run behind newer completed documents.
  const [failedSnapshot, expiredProcessingSnapshot] = await Promise.all([
    deliveryCollRef
      .where('status', '==', 'failed')
      .orderBy(FieldPath.documentId(), 'asc')
      .limit(1)
      .get(),
    deliveryCollRef
      .where('status', '==', 'processing')
      .where('leaseExpiresAtMs', '<=', now.getTime())
      .orderBy('leaseExpiresAtMs', 'asc')
      .orderBy(FieldPath.documentId(), 'asc')
      .limit(1)
      .get(),
  ]);
  const incompleteSnap = [failedSnapshot.docs?.[0], expiredProcessingSnapshot.docs?.[0]]
    .filter(Boolean)
    .sort((a, b) => a.id.localeCompare(b.id))[0] || null;

  let catchUpCompletedResult = null;
  if (incompleteSnap) {
    const incompleteData = incompleteSnap.data() || {};
    const catchUpDayKey = incompleteSnap.id;
    // Pinned timezone from stored delivery record
    const pinnedTzInfo = resolvePinnedTimeZone(incompleteData, resolveCompanyTimeZone(company));

    const catchUpResult = await executeDayDelivery({
      db,
      companyDoc,
      companyId,
      dayKey: catchUpDayKey,
      timeZoneInfo: pinnedTzInfo,
      existingSnap: incompleteSnap,
      now,
      leaseOwner,
      leaseDurationMs,
      readers,
    });

    if (catchUpResult.status === 'failed' || catchUpResult.status === 'skipped') {
      return catchUpResult;
    }
    catchUpCompletedResult = catchUpResult;
  }

  // Step 2: Today's delivery using current company timezone
  const timeZoneInfo = resolveCompanyTimeZone(company);
  const dueInfo = isCompanyDailyDue(timeZoneInfo.timeZone, now, DAILY_DELIVERY_DUE_HOUR);

  // If catch-up completed and today was already the catch-up day or today is not due yet, return catch-up result
  if (catchUpCompletedResult) {
    if (catchUpCompletedResult.dayKey === dueInfo.dayKey || !dueInfo.isDue) {
      return catchUpCompletedResult;
    }
  }

  // Read farms ONLY when due
  if (!dueInfo.isDue) {
    return {
      status: 'skipped',
      reason: 'before_due_hour',
      companyId,
      timeZoneInfo,
      dueInfo,
    };
  }

  const { dayKey } = dueInfo;
  const todaySnap = await deliveryCollRef.doc(dayKey).get();

  if (todaySnap && todaySnap.exists) {
    const todayData = todaySnap.data() || {};
    if (todayData.status === 'completed') {
      return {
        status: 'skipped',
        reason: 'already_completed',
        companyId,
        dayKey,
      };
    }
    if (todayData.status === 'processing') {
      const expiresAt = todayData.leaseExpiresAtMs || 0;
      if (expiresAt > now.getTime()) {
        return {
          status: 'skipped',
          reason: 'active_lease',
          companyId,
          dayKey,
        };
      }
    }
  }

  // Effective timezone is pinned if today was already created
  const effectiveTzInfo = (todaySnap?.exists && todaySnap.data()?.timeZone)
    ? resolvePinnedTimeZone(todaySnap.data(), timeZoneInfo)
    : timeZoneInfo;

  return executeDayDelivery({
    db,
    companyDoc,
    companyId,
    dayKey,
    timeZoneInfo: effectiveTzInfo,
    existingSnap: todaySnap,
    now,
    leaseOwner,
    leaseDurationMs,
    readers,
  });
};

/**
 * Dispatcher for daily supervisor: bounded recurring pagination with a durable cursor.
 * Advances after each page, wraps back to start when reaching the end, and cannot strand companies.
 */
const runDailySupervisorDelivery = async ({
  db,
  now = new Date(),
  batchSize = DEFAULT_BATCH_SIZE,
  leaseOwner = 'supervisor',
  leaseDurationMs = DEFAULT_LEASE_DURATION_MS,
  readers = {},
  startAfterDoc = null,
  cursorRef = null,
  persistCursor = true,
}) => {
  let resolvedCursorRef = cursorRef;
  if (!resolvedCursorRef && persistCursor && typeof db.doc === 'function') {
    resolvedCursorRef = db.doc('system/orsonDailyDispatcherCursor');
  }

  let cursorCompanyId = null;
  if (!startAfterDoc && resolvedCursorRef) {
    const cursorSnap = await resolvedCursorRef.get();
    if (cursorSnap && cursorSnap.exists) {
      cursorCompanyId = cursorSnap.data()?.lastCompanyId || null;
    }
  }

  let query = db.collection('companies').orderBy(FieldPath.documentId()).limit(batchSize);
  if (startAfterDoc) {
    query = query.startAfter(startAfterDoc);
  } else if (cursorCompanyId) {
    query = query.startAfter(cursorCompanyId);
  }

  const snapshot = await query.get();
  let docs = snapshot.docs || [];
  let wrapped = false;

  // If reached end of collection and cursor was set, wrap back to beginning
  if (docs.length === 0 && cursorCompanyId && !startAfterDoc) {
    const wrapQuery = db.collection('companies').orderBy(FieldPath.documentId()).limit(batchSize);
    const wrapSnapshot = await wrapQuery.get();
    docs = wrapSnapshot.docs || [];
    wrapped = true;
  }

  const results = [];

  for (const companyDoc of docs) {
    try {
      const result = await deliverCompanyDailyNotifications({
        db,
        companyDoc,
        now,
        leaseOwner,
        leaseDurationMs,
        readers,
      });
      results.push(result);
    } catch (error) {
      results.push({
        status: 'failed',
        companyId: companyDoc.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const nextCursorId = docs.length > 0 ? docs[docs.length - 1].id : null;
  if (resolvedCursorRef && persistCursor && nextCursorId) {
    await resolvedCursorRef.set({
      lastCompanyId: nextCursorId,
      wrapped,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  const completed = results.filter((r) => r.status === 'completed');
  const skipped = results.filter((r) => r.status === 'skipped');
  const failed = results.filter((r) => r.status === 'failed');

  return {
    processedCount: results.length,
    completedCount: completed.length,
    skippedCount: skipped.length,
    failedCount: failed.length,
    results,
    lastDoc: docs[docs.length - 1] || null,
    nextCursorId,
    wrapped,
  };
};

module.exports = {
  DEFAULT_LEASE_DURATION_MS,
  DAILY_DELIVERY_DUE_HOUR,
  resolveCompanyTimeZone,
  getCalendarDayKey,
  getLocalCalendarHour,
  isCompanyDailyDue,
  getNotificationDocId,
  createNotificationIfAbsent,
  acquireDeliveryLease,
  buildNotificationManifest,
  deliverCompanyDailyNotifications,
  runDailySupervisorDelivery,
};
