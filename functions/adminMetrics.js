const { HttpsError, onCall } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

const ADMIN_EMAILS = new Set(["ricardofransiskusho@gmail.com"]);

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
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return start;
};

const dayKey = (date) => date.toISOString().slice(0, 10);

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

const countOptionalCollection = async (db, collectionName, since) => {
  try {
    return await countDocsSince(db.collection(collectionName), since);
  } catch (error) {
    console.warn(`Admin metrics skipped ${collectionName}:`, error.message);
    return { total: 0, period: 0 };
  }
};

const getCompanyMetrics = async (db, companiesSnapshot, usersById) => {
  const rows = [];
  let totalPonds = 0;

  for (const companyDoc of companiesSnapshot.docs) {
    const company = companyDoc.data() || {};
    const [pondCount, cyclesSnapshot, feedItemCount, additiveItemCount] = await Promise.all([
      getSnapshotSize(companyDoc.ref.collection("ponds")),
      companyDoc.ref.collection("cycles").get().catch((error) => {
        console.warn(`Admin metrics skipped ${companyDoc.ref.path}/cycles:`, error.message);
        return { docs: [] };
      }),
      getSnapshotSize(companyDoc.ref.collection("feeds")),
      getSnapshotSize(companyDoc.ref.collection("additives")),
    ]);

    totalPonds += pondCount;

    const activeCycleCount = cyclesSnapshot.docs.filter((cycleDoc) => {
      const cycle = cycleDoc.data() || {};
      return String(cycle.status || "").toLowerCase() === "active";
    }).length;

    const teamMembers = Array.isArray(company.teamMembers) ? company.teamMembers : [];
    const owner = usersById.get(company.ownerId) || null;

    rows.push({
      id: companyDoc.id,
      companyName: company.companyName || company.businessName || "Unnamed company",
      ownerEmail: owner?.email || company.ownerEmail || "",
      farmType: company.farmType || company.businessType || "",
      businessSize: company.businessSize || "",
      teamMembersCount: teamMembers.length,
      pondCount,
      activeCycleCount,
      feedItemCount,
      additiveItemCount,
      createdAt: toIso(company.createdAt),
    });
  }

  rows.sort((a, b) => b.pondCount - a.pondCount || a.companyName.localeCompare(b.companyName));

  return { rows, totalPonds };
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

exports.getAdminMetrics = onCall(async (request) => {
  const uid = request.auth?.uid;
  const email = String(request.auth?.token?.email || "").toLowerCase();

  if (!uid) {
    throw new HttpsError("unauthenticated", "You must be signed in to view admin metrics.");
  }

  if (!ADMIN_EMAILS.has(email)) {
    throw new HttpsError("permission-denied", "This admin page is restricted to the founder account.");
  }

  const periodDays = Number(request.data?.days) === 30 ? 30 : 7;
  const since = startOfPeriod(periodDays);
  const db = admin.firestore();

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
    const date = new Date(since);
    date.setDate(since.getDate() + offset);
    dailyNewUsers.set(dayKey(date), 0);
  }

  usersSnapshot.forEach((userDoc) => {
    const user = userDoc.data() || {};
    usersById.set(userDoc.id, user);

    const role = user.role || "unknown";
    roleBreakdown[role] = (roleBreakdown[role] || 0) + 1;
    if (role === "buyer") buyers += 1;
    if (role === "owner") owners += 1;
    if (["technician", "manager", "admin"].includes(role)) staff += 1;

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
    companies: companyMetrics.rows,
  };
});
