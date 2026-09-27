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
async function authorizeAgent(db, uid, companyId, transaction) {
  if (!uid) fail("Sign in to use Orson.", "unauthenticated");
  if (!validId(companyId)) fail("Invalid company.", "invalid-argument");
  const get = (ref) => (transaction ? transaction.get(ref) : ref.get());
  const base = db.collection("companies").doc(companyId);
  const [companySnap, userSnap] = await Promise.all([
    get(base),
    get(db.collection("users").doc(uid)),
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
  const blocks = scoped
    ? await get(
        base.collection("blocks").where("assignedTechnicianId", "==", uid),
      )
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
