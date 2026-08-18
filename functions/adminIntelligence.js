const { HttpsError, onCall } = require("firebase-functions/v2/https");
const {
  enforceFixedWindowLimits,
  logCallableAppCheckStatus,
} = require("./abuseProtection");
const {
  adoptionPercentage,
  deriveAccountStatus,
  getInitials,
  getLatestIsoTimestamp,
  hasPlatformOwnerClaim,
  isValidDeleteUserRequest,
  maskEmail,
  maskPhone,
  normalizeText,
} = require("./adminIntelligenceCore");

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toIso = (value) => toDate(value)?.toISOString() || null;

const assertPlatformOwner = (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign in to access Shrimply Admin.");
  if (!hasPlatformOwnerClaim(request.auth)) throw new HttpsError("permission-denied", "A platform-owner custom claim is required.");
};

const safeSnapshot = async (promise, label) => {
  try {
    const snapshot = await promise;
    return { docs: snapshot.docs, size: snapshot.size, empty: snapshot.empty, available: true };
  } catch (error) {
    console.warn(`Admin intelligence skipped ${label}:`, error.message);
    return { docs: [], size: 0, empty: true, available: false };
  }
};

const locationParts = (company) => {
  const location = company?.primaryLocation;
  if (typeof location === "string") return { region: "Unavailable", country: "Unavailable", display: location };
  const region = location?.state || location?.region || location?.city || company?.region || "Unavailable";
  const country = location?.country || company?.country || "Unavailable";
  return { region, country, display: location?.address || [location?.city, location?.state, country].filter(Boolean).join(", ") || "Unavailable" };
};

const getBilling = async (companyRef) => {
  if (!companyRef) return {};
  const current = await companyRef.collection("billing").doc("current").get().catch(() => null);
  return current?.exists ? current.data() || {} : {};
};

const matchesActivity = (lastActiveAt, filter) => {
  if (filter === "all") return true;
  const date = lastActiveAt ? new Date(lastActiveAt) : null;
  const days = date && !Number.isNaN(date.getTime()) ? (Date.now() - date.getTime()) / 86_400_000 : Number.POSITIVE_INFINITY;
  if (filter === "7d") return days <= 7;
  if (filter === "30d") return days <= 30;
  return days > 90;
};

const matchesRegistered = (joinedAt, filter) => {
  if (filter === "all") return true;
  const date = joinedAt ? new Date(joinedAt) : null;
  const days = date && !Number.isNaN(date.getTime()) ? (Date.now() - date.getTime()) / 86_400_000 : Number.POSITIVE_INFINITY;
  return days <= (filter === "30d" ? 30 : filter === "90d" ? 90 : 365);
};

const createDirectoryHandler = (admin) => onCall({ timeoutSeconds: 60, memory: "512MiB" }, async (request) => {
  assertPlatformOwner(request);
  const search = normalizeText(request.data?.search, 120).toLowerCase();
  const filters = request.data?.filters || {};
  const page = Math.max(1, Math.min(500, Number(request.data?.page) || 1));
  const pageSize = Math.max(5, Math.min(50, Number(request.data?.pageSize) || 10));
  const db = admin.firestore();
  await enforceFixedWindowLimits({
    db,
    admin,
    limits: [{
      namespace: "adminDirectoryBurst",
      scope: `user:${request.auth.uid}`,
      limit: 12,
      windowMs: 60_000,
      message: "Too many admin directory requests. Try again shortly.",
    }],
  });
  logCallableAppCheckStatus(request, "searchAdminAccounts");
  const [usersSnapshot, companiesSnapshot] = await Promise.all([
    db.collection("users").limit(2000).get(),
    db.collection("companies").limit(2000).get(),
  ]);
  const companiesById = new Map(companiesSnapshot.docs.map((document) => [document.id, document]));
  const billingByCompany = new Map();
  await Promise.all(companiesSnapshot.docs.map(async (companyDocument) => {
    billingByCompany.set(companyDocument.id, await getBilling(companyDocument.ref));
  }));

  const rows = usersSnapshot.docs.map((userDocument) => {
    const user = userDocument.data() || {};
    const companyDocument = companiesById.get(user.companyId);
    const company = companyDocument?.data() || {};
    const billing = billingByCompany.get(user.companyId) || {};
    const location = locationParts(company);
    const joinedAt = toIso(user.joinedDate || user.createdAt);
    const lastActiveAt = toIso(user.lastActive || user.updatedAt || user.joinedDate || user.createdAt);
    const plan = billing.planName || billing.planId || company.plan || "Unavailable";
    const farmName = company.companyName || company.businessName || null;
    const status = deriveAccountStatus({ explicitStatus: user.status, lastActiveAt, billingStatus: billing.status });
    return {
      id: userDocument.id,
      name: user.name || user.displayName || "Unnamed user",
      initials: getInitials(user.name || user.displayName),
      maskedEmail: maskEmail(user.email),
      status,
      plan,
      country: location.country,
      joinedAt,
      lastActiveAt,
      farmName,
      _search: [userDocument.id, user.name, user.displayName, user.email, user.phone, farmName, location.country].filter(Boolean).join(" ").toLowerCase(),
    };
  }).filter((row) => {
    if (search && !row._search.includes(search)) return false;
    if (filters.status && filters.status !== "all" && row.status !== filters.status) return false;
    if (filters.plan && filters.plan !== "all" && row.plan.toLowerCase() !== String(filters.plan).toLowerCase()) return false;
    if (filters.country && filters.country !== "all" && row.country.toLowerCase() !== String(filters.country).toLowerCase()) return false;
    if (!matchesActivity(row.lastActiveAt, filters.activity || "all")) return false;
    return matchesRegistered(row.joinedAt, filters.registered || "all");
  }).sort((a, b) => new Date(b.lastActiveAt || 0).getTime() - new Date(a.lastActiveAt || 0).getTime());

  const start = (page - 1) * pageSize;
  await db.collection("adminAuditEvents").add({
    actorId: request.auth.uid,
    targetId: null,
    action: "account.directory.view",
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    reason: "Owner viewed the masked user directory",
    metadata: {
      source: "admin-command-centre",
      maskedFields: ["email"],
      resultCount: Math.min(pageSize, Math.max(0, rows.length - start)),
      searchApplied: Boolean(search),
    },
  });
  return {
    users: rows.slice(start, start + pageSize).map(({ _search, ...row }) => row),
    total: rows.length,
    platformTotal: usersSnapshot.size,
    page,
    pageSize,
    source: "live",
    filterOptions: {
      plans: ["all", ...new Set(rows.map((row) => row.plan))].sort(),
      countries: ["all", ...new Set(rows.map((row) => row.country))].sort(),
    },
  };
});

const createDeleteUserHandler = (admin) => onCall({ timeoutSeconds: 120, memory: "512MiB" }, async (request) => {
  assertPlatformOwner(request);
  const userId = normalizeText(request.data?.userId, 160);
  const reason = normalizeText(request.data?.reason, 500);
  const confirmation = normalizeText(request.data?.confirmation, 320);
  if (!userId) throw new HttpsError("invalid-argument", "userId is required.");
  if (reason.length < 10) throw new HttpsError("invalid-argument", "A specific deletion reason of at least 10 characters is required.");
  if (request.auth.uid === userId) throw new HttpsError("failed-precondition", "You cannot delete your own platform-owner account.");

  const db = admin.firestore();
  await enforceFixedWindowLimits({
    db,
    admin,
    limits: [{
      namespace: "adminDeleteUserBurst",
      scope: `user:${request.auth.uid}`,
      limit: 3,
      windowMs: 60 * 60 * 1000,
      message: "Too many account deletion requests. Try again later.",
    }],
  });
  logCallableAppCheckStatus(request, "deleteAdminUser");
  const userRef = db.collection("users").doc(userId);
  const userDocument = await userRef.get();
  if (!userDocument.exists) throw new HttpsError("not-found", "User account not found.");
  const user = userDocument.data() || {};

  let authUser = null;
  try {
    authUser = await admin.auth().getUser(userId);
  } catch (error) {
    if (error.code !== "auth/user-not-found") throw error;
  }
  if (authUser?.customClaims?.platformOwner === true || authUser?.customClaims?.platformRole === "owner") {
    throw new HttpsError("failed-precondition", "Platform-owner accounts cannot be deleted from the dashboard.");
  }

  const expectedConfirmation = userId;
  if (!isValidDeleteUserRequest({ reason, confirmation, expectedConfirmation })) {
    throw new HttpsError("failed-precondition", `Type ${expectedConfirmation} exactly to confirm deletion.`);
  }

  const deleteCompanyRequested = Boolean(request.data?.deleteCompany);
  const companyDocument = user.companyId ? await db.collection("companies").doc(user.companyId).get() : null;
  const company = companyDocument?.exists ? companyDocument.data() || {} : {};
  const role = String(user.role || "").toLowerCase();
  const isOwner = company.ownerId === userId || role === "owner" || role === "co-owner";

  if (isOwner && !deleteCompanyRequested && companyDocument?.exists) {
    await companyDocument.ref.update({
      ownerId: null,
      ownerEmail: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  const requestedAudit = await db.collection("adminAuditEvents").add({
    actorId: request.auth.uid,
    targetId: userId,
    action: "account.delete.requested",
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    reason,
    metadata: { source: "admin-command-centre", destructive: true, deleteCompany: deleteCompanyRequested },
  });

  try {
    if (authUser) await admin.auth().deleteUser(userId);

    const membershipSnapshot = await db.collection("companies").where("teamMembers", "array-contains", userId).get();
    const membershipBatch = db.batch();
    membershipSnapshot.docs.forEach((document) => {
      membershipBatch.update(document.ref, {
        teamMembers: admin.firestore.FieldValue.arrayRemove(userId),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    if (!membershipSnapshot.empty) await membershipBatch.commit();

    if (deleteCompanyRequested && companyDocument?.exists) {
      await db.recursiveDelete(companyDocument.ref);
    }

    await db.recursiveDelete(userRef);
    await db.collection("adminAuditEvents").add({
      actorId: request.auth.uid,
      targetId: userId,
      action: "account.delete.completed",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      reason,
      metadata: {
        source: "admin-command-centre",
        destructive: true,
        requestAuditId: requestedAudit.id,
        authAccountRemoved: Boolean(authUser),
        companyMembershipsRemoved: membershipSnapshot.size,
        companyDeleted: deleteCompanyRequested && Boolean(companyDocument?.exists),
      },
    });
    return { success: true, userId, companyDeleted: deleteCompanyRequested };
  } catch (error) {
    console.error(`Admin user deletion failed for ${userId}:`, error);
    await db.collection("adminAuditEvents").add({
      actorId: request.auth.uid,
      targetId: userId,
      action: "account.delete.failed",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      reason,
      metadata: {
        source: "admin-command-centre",
        destructive: true,
        requestAuditId: requestedAudit.id,
        errorCode: normalizeText(error.code || "unknown", 120),
      },
    }).catch(() => null);
    throw new HttpsError("internal", "The user deletion did not complete. Review the audit log before retrying.");
  }
});

const samplingDate = (sampling) => toIso(sampling?.timestamp || sampling?.createdAt || sampling?.date);

const makeEvent = (id, type, title, detail, timestamp, tone = "neutral", metadata) => ({ id, type, title, detail, timestamp, tone, ...(metadata ? { metadata } : {}) });

const createAccountHandler = (admin) => onCall({ timeoutSeconds: 60, memory: "512MiB" }, async (request) => {
  assertPlatformOwner(request);
  const userId = normalizeText(request.data?.userId, 160);
  if (!userId) throw new HttpsError("invalid-argument", "userId is required.");
  const db = admin.firestore();
  await enforceFixedWindowLimits({
    db,
    admin,
    limits: [{
      namespace: "adminAccountBurst",
      scope: `user:${request.auth.uid}`,
      limit: 20,
      windowMs: 60_000,
      message: "Too many admin account requests. Try again shortly.",
    }],
  });
  logCallableAppCheckStatus(request, "getAdminAccountIntelligence");
  const userDocument = await db.collection("users").doc(userId).get();
  if (!userDocument.exists) throw new HttpsError("not-found", "User account not found.");
  const user = userDocument.data() || {};
  const companyDocument = user.companyId ? await db.collection("companies").doc(user.companyId).get() : null;
  const company = companyDocument?.exists ? companyDocument.data() || {} : {};
  const companyRef = companyDocument?.exists ? companyDocument.ref : null;
  const billing = await getBilling(companyRef);
  const [ponds, harvests, feeds, additives, expenses, revenues, activity, payments, labReports, diseaseReports, adminEvents, securityEvents] = await Promise.all([
    companyRef ? safeSnapshot(companyRef.collection("ponds").get(), "ponds") : { docs: [], size: 0 },
    companyRef ? safeSnapshot(companyRef.collection("harvestRecords").get(), "harvestRecords") : { docs: [], size: 0 },
    companyRef ? safeSnapshot(companyRef.collection("feeds").get(), "feeds") : { docs: [], size: 0 },
    companyRef ? safeSnapshot(companyRef.collection("additives").get(), "additives") : { docs: [], size: 0 },
    companyRef ? safeSnapshot(companyRef.collection("expenses").get(), "expenses") : { docs: [], size: 0 },
    companyRef ? safeSnapshot(companyRef.collection("revenues").get(), "revenues") : { docs: [], size: 0 },
    companyRef ? safeSnapshot(companyRef.collection("userActivitySessions").where("userId", "==", userId).limit(100).get(), "userActivitySessions") : { docs: [], size: 0 },
    companyRef ? safeSnapshot(companyRef.collection("billingPayments").limit(50).get(), "billingPayments") : { docs: [], size: 0 },
    companyRef ? safeSnapshot(companyRef.collection("labReports").limit(50).get(), "labReports") : { docs: [], size: 0 },
    user.companyId ? safeSnapshot(db.collection("diseaseReports").where("companyId", "==", user.companyId).limit(50).get(), "diseaseReports") : { docs: [], size: 0 },
    safeSnapshot(db.collection("adminAuditEvents").where("targetId", "==", userId).limit(100).get(), "adminAuditEvents"),
    safeSnapshot(db.collection("securityEvents").where("userId", "==", userId).limit(100).get(), "securityEvents"),
  ]);

  const allSamplings = ponds.docs.flatMap((pondDocument) => {
    const pond = pondDocument.data() || {};
    return Array.isArray(pond.samplings) ? pond.samplings.map((sampling) => ({ ...sampling, pondId: pondDocument.id, pondName: pond.pondName || "Pond" })) : [];
  });
  const recentCutoff = Date.now() - 30 * 86_400_000;
  const recentSamplings = allSamplings.filter((item) => {
    const date = samplingDate(item);
    return date && new Date(date).getTime() >= recentCutoff && (Number(item.mbw) > 0 || Number(item.feed) > 0 || Number(item.mortality) > 0);
  });
  const waterEntries = allSamplings.filter((item) => [item.phMorning, item.phEvening, item.doMorning, item.doEvening, item.salinity, item.transparency].some((value) => value !== undefined && value !== null && value !== ""));
  const feedEntries = allSamplings.filter((item) => item.feedData || Number(item.feed) > 0);
  const teamCount = new Set([company.ownerId, ...(Array.isArray(company.teamMembers) ? company.teamMembers : [])].filter(Boolean)).size;
  const adoption = [
    ["sampling", "Sampling", recentSamplings.length, 12, ponds.available],
    ["water", "Water Quality", waterEntries.length, 20, ponds.available],
    ["feed", "Feed Management", feedEntries.length, 20, ponds.available],
    ["harvest", "Harvest & Reports", harvests.size + labReports.size, 8, harvests.available || labReports.available],
    ["disease", "Disease Reports", diseaseReports.size, 3, diseaseReports.available],
    ["inventory", "Inventory", feeds.size + additives.size, 15, feeds.available || additives.available],
    ["finance", "Finance", expenses.size + revenues.size, 16, expenses.available || revenues.available],
    ["team", "Team Collaboration", Math.max(0, teamCount - 1), 4, Boolean(companyDocument?.exists)],
  ].map(([key, label, eventCount, target, available]) => ({
    key,
    label,
    eventCount: available ? eventCount : null,
    percentage: available ? adoptionPercentage(eventCount, target) : 0,
    availability: available ? "live" : "unavailable",
  }));

  const timeline = [];
  const activityTimestamps = [];
  activity.docs.forEach((document) => {
    const data = document.data() || {};
    const timestamp = getLatestIsoTimestamp([
      toIso(data.lastSeenAt),
      toIso(data.endedAt),
      toIso(data.updatedAt),
      toIso(data.startedAt),
      toIso(data.createdAt),
    ]);
    if (timestamp) activityTimestamps.push(timestamp);
    if (timestamp) timeline.push(makeEvent(`login-${document.id}`, "login", "User login", `${data.platform || "App"} activity session`, timestamp, "positive"));
  });
  allSamplings.forEach((item, index) => {
    const timestamp = samplingDate(item);
    if (!timestamp) return;
    if (Number(item.mbw) > 0 || Number(item.feed) > 0 || Number(item.mortality) > 0) timeline.push(makeEvent(`sampling-${item.pondId}-${index}`, "sampling", "Sampling data uploaded", item.pondName, timestamp, "neutral"));
    if ([item.phMorning, item.phEvening, item.doMorning, item.doEvening, item.salinity, item.transparency].some((value) => value !== undefined && value !== null && value !== "")) timeline.push(makeEvent(`water-${item.pondId}-${index}`, "water_quality", "Water quality recorded", item.pondName, timestamp, "neutral"));
  });
  harvests.docs.forEach((document) => { const data = document.data() || {}; const timestamp = toIso(data.timestamp || data.createdAt || data.date); if (timestamp) timeline.push(makeEvent(`harvest-${document.id}`, "report", "Harvest recorded", data.cycleName || "Harvest record", timestamp, "positive")); });
  labReports.docs.forEach((document) => { const data = document.data() || {}; const timestamp = toIso(data.generatedAt || data.confirmedAt || data.createdAt); if (timestamp) timeline.push(makeEvent(`report-${document.id}`, "report", "Laboratory report recorded", data.reportType || data.entryMode || "Lab report", timestamp, "neutral")); });
  payments.docs.forEach((document) => { const data = document.data() || {}; const timestamp = toIso(data.paidAt || data.createdAt); if (timestamp) timeline.push(makeEvent(`payment-${document.id}`, "payment", data.status === "paid" ? "Invoice paid" : "Payment event", data.invoiceNumber || "Billing payment", timestamp, data.status === "paid" ? "positive" : "warning", data.amount ? `IDR ${Number(data.amount).toLocaleString("en-US")}` : undefined)); });
  adminEvents.docs.forEach((document) => { const data = document.data() || {}; const timestamp = toIso(data.timestamp || data.createdAt); if (timestamp) timeline.push(makeEvent(`admin-${document.id}`, "admin", data.action || "Owner action", data.reason || "Audited owner action", timestamp, "warning")); });
  securityEvents.docs.forEach((document) => { const data = document.data() || {}; const timestamp = toIso(data.timestamp || data.createdAt); if (timestamp) timeline.push(makeEvent(`security-${document.id}`, "security", data.title || data.type || "Security event", data.detail || "Recorded security event", timestamp, data.severity === "high" ? "danger" : "warning")); });
  if (companyDocument?.exists) { const timestamp = toIso(company.createdAt); if (timestamp) timeline.push(makeEvent(`farm-${companyDocument.id}`, "farm", "Farm created", company.companyName || "Farm account", timestamp, "neutral")); }
  ponds.docs.forEach((document) => { const data = document.data() || {}; const timestamp = toIso(data.createdAt || data.docStart); if (timestamp) timeline.push(makeEvent(`pond-${document.id}`, "farm", "Pond created", data.pondName || "Pond", timestamp, "neutral")); });
  timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const location = locationParts(company);
  const joinedAt = toIso(user.joinedDate || user.createdAt);
  const lastActiveAt = getLatestIsoTimestamp([
    toIso(user.lastActive),
    toIso(user.updatedAt),
    ...activityTimestamps,
    joinedAt,
  ]);
  const status = deriveAccountStatus({ explicitStatus: user.status, lastActiveAt, billingStatus: billing.status });
  const daysInactive = lastActiveAt ? (Date.now() - new Date(lastActiveAt).getTime()) / 86_400_000 : 999;
  const completenessFields = [user.name, user.email, user.phone, user.companyId, company.companyName, company.primaryLocation];
  const completeness = Math.round((completenessFields.filter(Boolean).length / completenessFields.length) * 100);
  const availableAdoption = adoption.filter((item) => item.availability === "live");
  const adoptionAverage = availableAdoption.length ? Math.round(availableAdoption.reduce((sum, item) => sum + item.percentage, 0) / availableAdoption.length) : null;
  const totalAreaHa = ponds.docs.reduce((sum, document) => sum + (Number(document.data()?.pondArea) || 0), 0) / 10000;

  await db.collection("adminAuditEvents").add({
    actorId: request.auth.uid,
    targetId: userId,
    action: "account.contact.reveal",
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    reason: "Owner opened account intelligence with the full email address visible",
    metadata: { source: "admin-command-centre", revealedFields: ["email"], maskedFields: ["phone"] },
  });

  return {
    id: userDocument.id,
    name: user.name || user.displayName || "Unnamed user",
    initials: getInitials(user.name || user.displayName),
    email: user.email || "Unavailable",
    maskedEmail: maskEmail(user.email),
    maskedPhone: maskPhone(user.phone),
    role: user.role || "Unavailable",
    plan: billing.planName || billing.planId || company.plan || "Unavailable",
    country: location.country,
    region: location.region,
    joinedAt,
    lastActiveAt,
    status,
    farms: companyDocument?.exists ? [{ id: companyDocument.id, name: company.companyName || company.businessName || "Unnamed farm", location: location.display, pondCount: ponds.size, totalAreaHa: totalAreaHa || null }] : [],
    healthInputs: {
      loginRecencyScore: daysInactive <= 7 ? 100 : daysInactive <= 30 ? 65 : daysInactive <= 90 ? 35 : 5,
      samplingActivityScore: ponds.available ? adoption.find((item) => item.key === "sampling").percentage : null,
      dataCompletenessScore: completeness,
      featureAdoptionScore: adoptionAverage,
      subscriptionScore: !Object.keys(billing).length ? null : ["active", "enterprise", "exempt"].includes(String(billing.status)) ? 100 : billing.status === "past_due" ? 35 : ["unpaid", "canceled"].includes(String(billing.status)) ? 10 : null,
      syncReliabilityScore: null,
      supportScore: null,
      securityScore: securityEvents.available ? (securityEvents.size ? 55 : 100) : null,
      suspended: status === "Suspended",
    },
    adoption,
    subscription: {
      plan: billing.planName || billing.planId || company.plan || "Unavailable",
      status: billing.status || "Unavailable",
      renewalAt: toIso(billing.renewsAt || billing.currentPeriodEndsAt || billing.expiresAt),
      billingInterval: billing.interval || null,
      paymentMethod: "Unavailable",
      availability: Object.keys(billing).length ? "live" : "unavailable",
    },
    support: { availability: "unavailable", tickets: [], note: "No support-ticket collection is connected to this account adapter." },
    timeline: timeline.slice(0, 100),
    missingBackendSignals: [
      "Failed login attempts require an Authentication blocking/log export integration.",
      "Support tickets require a support-system adapter.",
      "Generated PDF reports need a persistent report-generation event.",
      "Secure audited support sessions require a dedicated callable with scoped, expiring privileges.",
      "Sync reliability is unavailable until failed-sync events are persisted.",
    ],
    source: "live",
  };
});

module.exports = ({ admin }) => ({
  searchAdminAccounts: createDirectoryHandler(admin),
  getAdminAccountIntelligence: createAccountHandler(admin),
  deleteAdminUser: createDeleteUserHandler(admin),
});
