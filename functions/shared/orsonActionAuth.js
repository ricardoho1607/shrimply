const { HttpsError } = require("firebase-functions/v2/https");
const { hasUserPermission } = require("./permissions");
const validId = (value) =>
  typeof value === "string" &&
  /^[A-Za-z0-9_.:@-]{1,160}$/.test(value) &&
  value !== "." &&
  value !== "..";
const fail = (message, code = "failed-precondition") => {
  throw new HttpsError(code, message);
};
async function authorizeAgent(db, uid, companyId, transaction, options = {}) {
  if (!uid) fail("Sign in to use Orson.", "unauthenticated");
  if (!validId(companyId)) fail("Invalid company.", "invalid-argument");

  const cache = options?.cache;
  const refresh = options?.refresh === true;

  const getDoc = (colName, docId, providedSnap) => {
    // Unconditional transaction bypass: transactions always read fresh via transaction.get
    if (transaction) {
      return transaction.get(db.collection(colName).doc(docId));
    }
    if (providedSnap) {
      return Promise.resolve(providedSnap);
    }
    const key = `${colName}:${docId}`;
    if (!refresh && cache && cache.has(key)) return cache.get(key);
    const promise = db.collection(colName).doc(docId).get().catch((err) => {
      if (cache && cache.get(key) === promise) cache.delete(key);
      throw err;
    });
    if (cache) cache.set(key, promise);
    return promise;
  };

  const base = db.collection("companies").doc(companyId);
  const [companySnap, userSnap] = await Promise.all([
    getDoc("companies", companyId, options?.companySnap),
    getDoc("users", uid, options?.userSnap),
  ]);
  const company = companySnap.data(),
    user = userSnap.data();
  if (
    !company ||
    (company.ownerId !== uid &&
      (!company.teamMembers?.includes(uid) || user?.companyId !== companyId))
  )
    fail("Company access is unavailable.", "permission-denied");
  const allowed = (permission) =>
    hasUserPermission({
      company: { ...company, id: companyId },
      user: user || {},
      uid,
      permission,
    });
  if (!allowed("useOrson"))
    fail("Orson access is unavailable.", "permission-denied");
  const scoped =
    company.businessSize === "enterprise" &&
    user?.role === "technician" &&
    company.ownerId !== uid;
  // Lazily build block query only when enterprise scoped; owner stubs lack subcollections
  const blocks = scoped
    ? await (transaction
        ? transaction.get(
            base.collection("blocks").where("assignedTechnicianId", "==", uid),
          )
        : base.collection("blocks").where("assignedTechnicianId", "==", uid).get())
    : null;
  const blockIds = new Set(blocks?.docs.map((doc) => doc.id) || []);
  return {
    uid,
    companyId,
    company,
    user: user || {},
    base,
    allowed,
    scoped,
    blockIds,
    require(permission) {
      if (!allowed(permission))
        fail(
          "You do not have permission for this action.",
          "permission-denied",
        );
    },
    checkPond(pond) {
      if (!pond || (scoped && !blockIds.has(pond.blockId)))
        fail(
          "Pond is unavailable or outside your assigned scope.",
          "permission-denied",
        );
    },
  };
}
module.exports = { authorizeAgent, validId, fail };
