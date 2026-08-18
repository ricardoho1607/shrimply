const { HttpsError, onCall } = require("firebase-functions/v2/https");
const admin = require("./firebaseAdmin");
const {
  deriveAccountStatus,
  getInitials,
  hasPlatformOwnerClaim,
  maskEmail,
} = require("./adminIntelligenceCore");
const {
  enforceFixedWindowLimits,
  logCallableAppCheckStatus,
} = require("./abuseProtection");

const ADMIN_EMAILS = new Set(["ricardofransiskusho@gmail.com"]);

const assertFounder = (request, action) => {
  const uid = request.auth?.uid;
  const email = String(request.auth?.token?.email || "").toLowerCase();
  if (!uid) {
    throw new HttpsError("unauthenticated", `You must be signed in to ${action}.`);
  }
  if (!ADMIN_EMAILS.has(email) || !hasPlatformOwnerClaim(request.auth)) {
    throw new HttpsError("permission-denied", "This action requires the founder account and platform-owner claim.");
  }
  return uid;
};

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value.toDate === "function") {
    const parsed = value.toDate();
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }
  return null;
};

const toIso = (value) => {
  const date = toDate(value);
  return date ? date.toISOString() : null;
};

const startOfPeriod = (days) => {
  const now = new Date();
  const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  utcMidnight.setUTCDate(utcMidnight.getUTCDate() - (days - 1));
  return utcMidnight;
};

const dayKey = (date) => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getSnapshotSize = async (ref) => {
  try {
    const snapshot = await ref.get();
    return snapshot.size;
  } catch (error) {
    console.warn(`Admin metrics skipped ${ref.path}:`, error.message);
    return 0;
  }
};

const countDocsSince = async (ref, since) => {
  const snapshot = await ref.get();
  let count = 0;
  snapshot.forEach((doc) => {
    const data = doc.data() || {};
    const createdAt = toDate(data.createdAt || data.timestamp || data.generatedAt || data.requestedAt || data.date);
    if (createdAt && createdAt >= since) count += 1;
  });
  return { total: snapshot.size, period: count };
};

const sumAiUsage = async (db, since) => {
  const snapshot = await db.collectionGroup("aiUsage").get();
  let total = 0;
  let period = 0;

  snapshot.forEach((doc) => {
    const data = doc.data() || {};
    const functions = data.functions && typeof data.functions === "object" ? data.functions : {};
    const value = Object.values(functions).reduce((sum, current) => (
      typeof current === "number" && Number.isFinite(current) ? sum + current : sum
    ), 0);

    total += value;

    const usageDate = toDate(data.updatedAt || data.createdAt || data.date) || new Date(`${data.dateKey || doc.id}T00:00:00.000Z`);
    if (!Number.isNaN(usageDate.getTime()) && usageDate >= since) {
      period += value;
    }
  });

  return { total, period };
};

const getAiUsageValue = (data) => {
  const functions = data.functions && typeof data.functions === "object" ? data.functions : {};
  return Object.values(functions).reduce((sum, current) => (
    typeof current === "number" && Number.isFinite(current) ? sum + current : sum
  ), 0);
};

const sumCompanyAiUsage = async (companyRef) => {
  try {
    const snapshot = await companyRef.collection("aiUsage").get();
    let total = 0;
    snapshot.forEach((doc) => {
      total += getAiUsageValue(doc.data() || {});
    });
    return total;
  } catch (error) {
    console.warn(`Admin metrics skipped ${companyRef.path}/aiUsage:`, error.message);
    return 0;
  }
};

const countOptionalCollection = async (db, collectionName, since) => {
  try {
    return await countDocsSince(db.collection(collectionName), since);
  } catch (error) {
    console.warn(`Admin metrics skipped ${collectionName}:`, error.message);
    return { total: 0, period: 0 };
  }
};

const isOwnerRole = (role) => role === "owner" || role === "co-owner";
const isStaffRole = (role) => ["technician", "manager", "admin", "mechanic"].includes(role);
const isActiveCycleStatus = (status) => ["planning", "stocking", "active"].includes(String(status || "").toLowerCase());
const isActivePondCycle = (pond) => String(pond.cycleStatus || "active").toLowerCase() !== "ended";
const getPhysicalPondKey = (pondName) => String(pondName || "").trim().toLowerCase();

const getCompanyPondCounts = (pondDocs, physicalPondDocs) => {
  const pondNames = new Set();
  const activePondNames = new Set();
  const inactivePondNames = new Set();
  let unnamedPonds = 0;
  let activeUnnamedPonds = 0;
  const countPond = (pond) => {
    const key = getPhysicalPondKey(pond.pondName);
    if (key) {
      pondNames.add(key);
    } else {
      unnamedPonds += 1;
    }
  };

  physicalPondDocs.forEach((pondDoc) => {
    const pond = pondDoc.data() || {};
    countPond(pond);
    const key = getPhysicalPondKey(pond.pondName);
    const isActivePhysicalPond = pond.status === "active" || Boolean(pond.activePondId);
    if (key && !isActivePhysicalPond) inactivePondNames.add(key);
  });
  pondDocs.forEach((pondDoc) => {
    const pond = pondDoc.data() || {};
    countPond(pond);
    const key = getPhysicalPondKey(pond.pondName);
    if (isActivePondCycle(pond)) {
      if (key) activePondNames.add(key);
      else activeUnnamedPonds += 1;
    } else if (key) {
      inactivePondNames.add(key);
    }
  });

  activePondNames.forEach((pondName) => inactivePondNames.delete(pondName));

  const pondCount = pondNames.size + unnamedPonds;
  const activePondCount = activePondNames.size + activeUnnamedPonds;
  const inactivePondCount = Math.max(pondCount - activePondCount, inactivePondNames.size);

  return { pondCount, activePondCount, inactivePondCount };
};

const countLinkedCompanyUsers = (companyId, company, usersById) => {
  const userIds = new Set();
  if (company.ownerId) userIds.add(company.ownerId);
  if (Array.isArray(company.teamMembers)) {
    company.teamMembers.forEach((userId) => userId && userIds.add(userId));
  }
  usersById.forEach((user, userId) => {
    if (user?.companyId === companyId) userIds.add(userId);
  });
  return userIds.size;
};

const getCompanyMetrics = async (db, companiesSnapshot, usersById) => {
  const rows = [];
  let totalPonds = 0;
  let totalActivePonds = 0;
  let totalInactivePonds = 0;
  let totalActiveCycles = 0;

  for (const companyDoc of companiesSnapshot.docs) {
    const company = companyDoc.data() || {};
    const [pondsSnapshot, physicalPondsSnapshot, cyclesSnapshot, feedItemCount, additiveItemCount, aiRequestCount] = await Promise.all([
      companyDoc.ref.collection("ponds").get().catch((error) => {
        console.warn(`Admin metrics skipped ${companyDoc.ref.path}/ponds:`, error.message);
        return { docs: [], size: 0 };
      }),
      companyDoc.ref.collection("physicalPonds").get().catch((error) => {
        console.warn(`Admin metrics skipped ${companyDoc.ref.path}/physicalPonds:`, error.message);
        return { docs: [], size: 0 };
      }),
      companyDoc.ref.collection("cycles").get().catch((error) => {
        console.warn(`Admin metrics skipped ${companyDoc.ref.path}/cycles:`, error.message);
        return { docs: [] };
      }),
      getSnapshotSize(companyDoc.ref.collection("feeds")),
      getSnapshotSize(companyDoc.ref.collection("additives")),
      sumCompanyAiUsage(companyDoc.ref),
    ]);

    const { pondCount, activePondCount, inactivePondCount } = getCompanyPondCounts(pondsSnapshot.docs, physicalPondsSnapshot.docs);
    totalPonds += pondCount;
    totalActivePonds += activePondCount;
    totalInactivePonds += inactivePondCount;

    const activeCycleDocs = cyclesSnapshot.docs.filter((cycleDoc) => {
      const cycle = cycleDoc.data() || {};
      return isActiveCycleStatus(cycle.status);
    }).length;
    const activePondDocs = pondsSnapshot.docs.filter((pondDoc) => isActivePondCycle(pondDoc.data() || {})).length;
    const activeCycleCount = Math.max(activeCycleDocs, activePondDocs);
    totalActiveCycles += activeCycleCount;

    const teamMembersCount = countLinkedCompanyUsers(companyDoc.id, company, usersById);
    let ownerId = company.ownerId || undefined;
    if (!ownerId) {
      const matchedOwner = Array.from(usersById.entries()).find(([_, u]) => u?.companyId === companyDoc.id && isOwnerRole(u?.role));
      if (matchedOwner) ownerId = matchedOwner[0];
    }
    const owner = ownerId ? usersById.get(ownerId) : null;

    rows.push({
      id: companyDoc.id,
      companyName: company.companyName || company.businessName || "Unnamed company",
      ownerId,
      ownerEmail: owner?.email || company.ownerEmail || "",
      farmType: company.farmType || company.businessType || "",
      businessSize: company.businessSize || "",
      teamMembersCount,
      pondCount,
      activePondCount,
      inactivePondCount,
      activeCycleCount,
      feedItemCount,
      additiveItemCount,
      aiRequestCount,
      createdAt: toIso(company.createdAt),
    });
  }

  rows.sort((a, b) => b.pondCount - a.pondCount || a.companyName.localeCompare(b.companyName));

  return { rows, totalPonds, totalActivePonds, totalInactivePonds, totalActiveCycles };
};

const getPendingJoinRequestsByUserId = async (db, companyRows) => {
  const pendingByUserId = new Map();
  const companyNamesById = new Map(companyRows.map((company) => [company.id, company.companyName]));

  try {
    const snapshot = await db.collection("joinRequests").where("status", "==", "pending").get();
    snapshot.forEach((doc) => {
      const request = doc.data() || {};
      if (!request.userId) return;

      const pendingRequest = {
        id: doc.id,
        companyId: request.companyId || "",
        companyName: companyNamesById.get(request.companyId) || request.companyName || request.companyId || "Unknown company",
        requestedAt: toIso(request.requestedAt || request.createdAt),
        requestedRole: request.requestedRole || "",
      };

      const existing = pendingByUserId.get(request.userId);
      if (!existing || new Date(pendingRequest.requestedAt || 0).getTime() > new Date(existing.requestedAt || 0).getTime()) {
        pendingByUserId.set(request.userId, pendingRequest);
      }
    });
  } catch (error) {
    console.warn("Admin metrics skipped pending join request enrichment:", error.message);
  }

  return pendingByUserId;
};

const deleteQuerySnapshot = async (db, snapshot) => {
  if (snapshot.empty) return 0;

  let deleted = 0;
  let batch = db.batch();
  let operationCount = 0;

  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    deleted += 1;
    operationCount += 1;

    if (operationCount === 450) {
      await batch.commit();
      batch = db.batch();
      operationCount = 0;
    }
  }

  if (operationCount > 0) {
    await batch.commit();
  }

  return deleted;
};

const deleteTopLevelWhereCompanyId = async (db, collectionName, companyId) => {
  try {
    const snapshot = await db.collection(collectionName).where("companyId", "==", companyId).get();
    return await deleteQuerySnapshot(db, snapshot);
  } catch (error) {
    console.warn(`Hard delete skipped ${collectionName} by companyId:`, error.message);
    return 0;
  }
};

const getCompanyUserIds = async (db, companyId, company) => {
  const userIds = new Set();
  if (company.ownerId) userIds.add(company.ownerId);
  if (Array.isArray(company.teamMembers)) {
    company.teamMembers.forEach((userId) => userId && userIds.add(userId));
  }

  const linkedUsersSnapshot = await db.collection("users").where("companyId", "==", companyId).get();
  linkedUsersSnapshot.forEach((userDoc) => userIds.add(userDoc.id));

  return Array.from(userIds);
};

exports.hardDeleteCompany = onCall({ timeoutSeconds: 540, memory: "1GiB" }, async (request) => {
  const uid = assertFounder(request, "delete a company");
  const companyId = typeof request.data?.companyId === "string" ? request.data.companyId.trim() : "";

  if (!companyId || companyId.length > 160 || companyId.includes("/")) {
    throw new HttpsError("invalid-argument", "Company ID is required.");
  }

  const db = admin.firestore();
  await enforceFixedWindowLimits({
    db,
    admin,
    limits: [{
      namespace: "adminDeleteCompanyBurst",
      scope: `user:${uid}`,
      limit: 3,
      windowMs: 60 * 60 * 1000,
      message: "Too many company deletion requests. Try again later.",
    }],
  });
  logCallableAppCheckStatus(request, "hardDeleteCompany");
  const companyRef = db.collection("companies").doc(companyId);
  const companySnapshot = await companyRef.get();

  if (!companySnapshot.exists) {
    throw new HttpsError("not-found", "Company not found.");
  }

  const company = companySnapshot.data() || {};
  const userIds = (await getCompanyUserIds(db, companyId, company)).filter((userId) => userId !== uid);

  const deleteCounts = {};
  const topLevelCollections = [
    "joinRequests",
    "notifications",
    "marketplace_listings",
    "marketplace_responses",
    "diseaseReports",
    "apiRequests",
    "requestLogs",
    "assets",
  ];

  for (const collectionName of topLevelCollections) {
    deleteCounts[collectionName] = await deleteTopLevelWhereCompanyId(db, collectionName, companyId);
  }

  for (const userId of userIds) {
    await db.recursiveDelete(db.collection("users").doc(userId));
  }

  await db.recursiveDelete(companyRef);

  const authDeleted = [];
  const authSkipped = [];
  for (const userId of userIds) {
    try {
      await admin.auth().deleteUser(userId);
      authDeleted.push(userId);
    } catch (error) {
      authSkipped.push({ userId, reason: error.message });
      console.warn(`Hard delete could not remove auth user ${userId}:`, error.message);
    }
  }

  return {
    success: true,
    companyId,
    deletedUserCount: userIds.length,
    authDeletedCount: authDeleted.length,
    authSkipped,
    deleteCounts,
  };
});

exports.getAdminMetrics = onCall(async (request) => {
  const uid = assertFounder(request, "view admin metrics");

  const periodDays = Number(request.data?.days) === 30 ? 30 : 7;
  const since = startOfPeriod(periodDays);
  const db = admin.firestore();
  await enforceFixedWindowLimits({
    db,
    admin,
    limits: [{
      namespace: "adminMetricsBurst",
      scope: `user:${uid}`,
      limit: 6,
      windowMs: 60_000,
      message: "Too many admin metrics requests. Try again shortly.",
    }],
  });
  logCallableAppCheckStatus(request, "getAdminMetrics");

  let usersSnapshot;
  let companiesSnapshot;

  try {
    [usersSnapshot, companiesSnapshot] = await Promise.all([
      db.collection("users").get(),
      db.collection("companies").get(),
    ]);
  } catch (error) {
    console.error("Admin metrics failed to load required collections:", error);
    throw new HttpsError("internal", "Admin metrics could not load required user/company data.");
  }

  const [marketplace, diseaseReports, joinRequests, notifications, aiUsage, apiRequests, requestLogs] = await Promise.all([
    countOptionalCollection(db, "marketplace_listings", since),
    countOptionalCollection(db, "diseaseReports", since),
    countOptionalCollection(db, "joinRequests", since),
    countOptionalCollection(db, "notifications", since),
    sumAiUsage(db, since).catch((error) => {
      console.warn("Admin metrics skipped aiUsage:", error.message);
      return { total: 0, period: 0 };
    }),
    countOptionalCollection(db, "apiRequests", since),
    countOptionalCollection(db, "requestLogs", since),
  ]);

  const usersById = new Map();
  const dailyNewUsers = new Map();
  const roleBreakdown = {};
  let newUsers = 0;
  let activeUsers = 0;
  let buyers = 0;
  let owners = 0;
  let staff = 0;

  for (let offset = 0; offset < periodDays; offset += 1) {
    const date = new Date(since.getTime() + offset * 86_400_000);
    dailyNewUsers.set(dayKey(date), 0);
  }

  usersSnapshot.forEach((userDoc) => {
    const user = userDoc.data() || {};
    usersById.set(userDoc.id, user);

    const role = user.role || "unknown";
    roleBreakdown[role] = (roleBreakdown[role] || 0) + 1;
    if (role === "buyer") buyers += 1;
    if (isOwnerRole(role)) owners += 1;
    if (isStaffRole(role)) staff += 1;

    const joinedAt = toDate(user.joinedDate || user.createdAt);
    if (joinedAt && joinedAt >= since) {
      newUsers += 1;
      const key = dayKey(joinedAt);
      if (dailyNewUsers.has(key)) dailyNewUsers.set(key, (dailyNewUsers.get(key) || 0) + 1);
    }

    const lastActive = toDate(user.lastActive || user.updatedAt || user.joinedDate || user.createdAt);
    if (lastActive && lastActive >= since) {
      activeUsers += 1;
    }
  });

  const companyMetrics = await getCompanyMetrics(db, companiesSnapshot, usersById);
  const pendingJoinRequestsByUserId = await getPendingJoinRequestsByUserId(db, companyMetrics.rows);

  const newCompanies = companiesSnapshot.docs.filter((companyDoc) => {
    const company = companyDoc.data() || {};
    const createdAt = toDate(company.createdAt);
    return createdAt && createdAt >= since;
  }).length;

  const companyNamesById = new Map(companyMetrics.rows.map((c) => [c.id, c.companyName]));
  const triage = [];

  pendingJoinRequestsByUserId.forEach((request, userId) => {
    const user = usersById.get(userId);
    triage.push({
      id: `join-${request.id}`,
      type: "user",
      severity: "high",
      title: user?.name || user?.email || "Pending Staff Member",
      subtitle: `Request to join ${request.companyName} as ${request.requestedRole || user?.role || "staff"}`,
      issue: "Waiting for farm owner approval to join company",
      action: "Ask farm owner to approve request or inspect staff account",
      userId,
      companyId: request.companyId,
      email: user?.email || undefined,
    });
  });

  companyMetrics.rows.forEach((company) => {
    if (company.pondCount === 0) {
      triage.push({
        id: `company-noponds-${company.id}`,
        type: "company",
        severity: "high",
        title: company.companyName,
        subtitle: company.ownerEmail || "Owner contact unavailable",
        issue: "Company created but 0 physical ponds configured",
        action: "Reach out to owner to guide initial pond and water setup",
        companyId: company.id,
        userId: company.ownerId,
        email: company.ownerEmail || undefined,
      });
    } else if (company.activeCycleCount === 0 && (company.feedItemCount + company.additiveItemCount === 0)) {
      triage.push({
        id: `company-setup-${company.id}`,
        type: "company",
        severity: "medium",
        title: company.companyName,
        subtitle: `${company.pondCount} ponds · ${company.ownerEmail || "Owner unavailable"}`,
        issue: "Ponds exist but no active production cycle or feed stock logged",
        action: "Help farm start their active cycle and configure inventory",
        companyId: company.id,
        userId: company.ownerId,
        email: company.ownerEmail || undefined,
      });
    }
  });

  const usersList = usersSnapshot.docs.map((userDoc) => {
    const user = userDoc.data() || {};
    const joinedAt = toIso(user.joinedDate || user.createdAt);
    const lastActiveAt = toIso(user.lastActive || user.updatedAt || user.joinedDate || user.createdAt);
    const companyId = user.companyId || "";
    let farmName = companyId ? companyNamesById.get(companyId) || null : null;
    if (!farmName) {
      const ownedCompany = companyMetrics.rows.find((c) => c.ownerId === userDoc.id);
      if (ownedCompany) farmName = ownedCompany.companyName;
    }
    const email = user.email || "";
    const name = user.name || user.displayName || "Unnamed user";
    const status = deriveAccountStatus({ explicitStatus: user.status, lastActiveAt, billingStatus: null });
    const role = String(user.role || "").toLowerCase();
    const defaultPlan = isOwnerRole(role) ? "Farm Owner" : role === "buyer" ? "Buyer" : isStaffRole(role) ? "Staff" : "Standard";

    return {
      id: userDoc.id,
      name,
      initials: getInitials(name),
      maskedEmail: maskEmail(email),
      email: email || undefined,
      status,
      plan: user.plan || defaultPlan,
      country: user.country || "Global",
      joinedAt,
      lastActiveAt,
      farmName,
    };
  }).sort((a, b) => new Date(b.lastActiveAt || 0).getTime() - new Date(a.lastActiveAt || 0).getTime());

  const recentUsers = usersSnapshot.docs
    .map((userDoc) => {
      const user = userDoc.data() || {};
      return {
        id: userDoc.id,
        name: user.name || "",
        email: user.email || "",
        role: user.role || "",
        companyId: user.companyId || null,
        joinedAt: toIso(user.joinedDate || user.createdAt),
        lastActive: toIso(user.lastActive || user.updatedAt),
        pendingJoinRequest: pendingJoinRequestsByUserId.get(userDoc.id) || null,
      };
    })
    .sort((a, b) => new Date(b.joinedAt || 0).getTime() - new Date(a.joinedAt || 0).getTime())
    .slice(0, 12);

  return {
    generatedAt: new Date().toISOString(),
    periodDays,
    totals: {
      users: usersSnapshot.size,
      companies: companiesSnapshot.size,
      ponds: companyMetrics.totalPonds,
      activePonds: companyMetrics.totalActivePonds,
      inactivePonds: companyMetrics.totalInactivePonds,
      activeCycles: companyMetrics.totalActiveCycles,
      buyers,
      owners,
      staff,
      marketplaceListings: marketplace.total,
      diseaseReports: diseaseReports.total,
      joinRequests: joinRequests.total,
      notifications: notifications.total,
      aiRequests: aiUsage.total,
      apiRequests: apiRequests.total,
      requestLogs: requestLogs.total,
    },
    period: {
      newUsers,
      activeUsers,
      newCompanies,
      aiRequests: aiUsage.period,
      apiRequests: apiRequests.period,
      requestLogs: requestLogs.period,
    },
    dailyNewUsers: Array.from(dailyNewUsers.entries()).map(([date, count]) => ({ date, count })),
    roleBreakdown,
    recentUsers,
    users: usersList,
    companies: companyMetrics.rows,
    triage: triage.slice(0, 12),
  };
});
