const { HttpsError } = require("firebase-functions/v2/https");
const { hasUserPermission } = require("./permissions");

const assertCompanyMemberForCallable = async (db, uid, companyId, permission) => {
  if (!uid) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }
  if (
    !companyId
    || typeof companyId !== "string"
    || companyId !== companyId.trim()
    || companyId.length > 160
    || companyId.includes("/")
  ) {
    throw new HttpsError("invalid-argument", "companyId is required.");
  }

  const [companySnap, userSnap] = await Promise.all([
    db.collection("companies").doc(companyId).get(),
    db.collection("users").doc(uid).get(),
  ]);
  if (!companySnap.exists) {
    throw new HttpsError("not-found", "Company not found.");
  }
  const company = companySnap.data() || {};
  const user = userSnap.exists ? userSnap.data() : null;
  if (user?.founderAccessSuspended === true) throw new HttpsError("permission-denied", "Your Shrimply access has been disabled.");
  const teamMembers = Array.isArray(company.teamMembers) ? company.teamMembers : [];
  if (company.ownerId !== uid && !(teamMembers.includes(uid) && user?.companyId === companyId)) {
    throw new HttpsError("permission-denied", "You do not have access to this company.");
  }
  if (permission && !hasUserPermission({ company: { ...company, id: companyId }, user, uid, permission })) {
    throw new HttpsError("permission-denied", "You do not have permission to use this company feature.");
  }
  return company;
};

module.exports = { assertCompanyMemberForCallable };
