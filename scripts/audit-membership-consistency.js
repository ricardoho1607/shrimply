const crypto = require("node:crypto");
const path = require("node:path");
const firebaseAuth = require("firebase-tools/lib/auth");

const projectId = process.argv[2];
if (!projectId || !/^[a-z0-9-]+$/.test(projectId)) {
  throw new Error("Usage: node scripts/audit-membership-consistency.js <firebase-project-id>");
}

const anonymize = (value) => crypto
  .createHash("sha256")
  .update(String(value || ""), "utf8")
  .digest("hex")
  .slice(0, 12);

const decodeValue = (value) => {
  if (!value || typeof value !== "object") return null;
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeValue);
  if ("mapValue" in value) {
    return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, nested]) => [key, decodeValue(nested)]));
  }
  return null;
};

const decodeDocument = (document) => ({
  id: decodeURIComponent(document.name.split("/").pop()),
  ...Object.fromEntries(Object.entries(document.fields || {}).map(([key, value]) => [key, decodeValue(value)])),
});

const getAccessToken = async () => {
  const account = firebaseAuth.getProjectDefaultAccount(path.resolve(__dirname, ".."));
  if (!account?.tokens?.refresh_token) {
    throw new Error("No Firebase CLI login found. Run firebase login --reauth first.");
  }
  const tokens = await firebaseAuth.getAccessToken(account.tokens.refresh_token, []);
  if (!tokens?.access_token) throw new Error("Firebase CLI did not return an access token.");
  return tokens.access_token;
};

const listDocuments = async (accessToken, collectionId, fieldPaths) => {
  const documents = [];
  let pageToken = "";
  do {
    const url = new URL(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionId}`);
    url.searchParams.set("pageSize", "1000");
    fieldPaths.forEach((fieldPath) => url.searchParams.append("mask.fieldPaths", fieldPath));
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Firestore read failed (${response.status}): ${body.slice(0, 500)}`);
    }
    const page = await response.json();
    documents.push(...(page.documents || []).map(decodeDocument));
    pageToken = page.nextPageToken || "";
  } while (pageToken);
  return documents;
};

const run = async () => {
  const accessToken = await getAccessToken();
  const [users, companies] = await Promise.all([
    listDocuments(accessToken, "users", ["companyId", "role"]),
    listDocuments(accessToken, "companies", ["ownerId", "teamMembers"]),
  ]);
  const usersById = new Map(users.map((user) => [user.id, user]));
  const companiesById = new Map(companies.map((company) => [company.id, company]));
  const membershipsByUser = new Map();
  const ownershipsByUser = new Map();
  const issues = [];
  const affectedUsers = new Set();

  const addIssue = (type, userId, companyId, extra = {}) => {
    issues.push({
      type,
      ...(userId ? { user: anonymize(userId) } : {}),
      ...(companyId ? { company: anonymize(companyId) } : {}),
      ...extra,
    });
    if (userId) affectedUsers.add(userId);
  };

  companies.forEach((company) => {
    const ownerId = typeof company.ownerId === "string" ? company.ownerId : "";
    const rawMembers = Array.isArray(company.teamMembers) ? company.teamMembers : [];
    const members = rawMembers.filter((memberId) => typeof memberId === "string" && memberId);
    if (!ownerId) addIssue("company_missing_owner", null, company.id);
    if (new Set(members).size !== members.length) addIssue("duplicate_team_member", null, company.id);
    if (rawMembers.length !== members.length) addIssue("invalid_team_member_value", null, company.id);

    if (ownerId) {
      const owned = ownershipsByUser.get(ownerId) || [];
      owned.push(company.id);
      ownershipsByUser.set(ownerId, owned);
      const owner = usersById.get(ownerId);
      if (!owner) addIssue("owner_user_missing", ownerId, company.id);
      else if (owner.companyId !== company.id) addIssue("owner_company_mismatch", ownerId, company.id, {
        recordedCompany: owner.companyId ? anonymize(owner.companyId) : null,
      });
      if (!members.includes(ownerId)) addIssue("owner_missing_from_team", ownerId, company.id);
    }

    new Set(members).forEach((memberId) => {
      const memberships = membershipsByUser.get(memberId) || [];
      memberships.push(company.id);
      membershipsByUser.set(memberId, memberships);
      const member = usersById.get(memberId);
      if (!member) addIssue("team_member_user_missing", memberId, company.id);
      else if (member.companyId !== company.id) addIssue("team_member_company_mismatch", memberId, company.id, {
        recordedCompany: member.companyId ? anonymize(member.companyId) : null,
      });
    });
  });

  users.forEach((user) => {
    if (!user.companyId) return;
    const company = companiesById.get(user.companyId);
    if (!company) {
      addIssue("user_company_missing", user.id, user.companyId);
      return;
    }
    const members = Array.isArray(company.teamMembers) ? company.teamMembers : [];
    if (company.ownerId !== user.id && !members.includes(user.id)) {
      addIssue("user_missing_from_company_team", user.id, user.companyId, { role: user.role || null });
    }
  });

  membershipsByUser.forEach((companyIds, userId) => {
    if (new Set(companyIds).size > 1) {
      addIssue("user_listed_in_multiple_companies", userId, null, {
        companies: [...new Set(companyIds)].map(anonymize),
      });
    }
  });
  ownershipsByUser.forEach((companyIds, userId) => {
    if (new Set(companyIds).size > 1) {
      addIssue("user_owns_multiple_companies", userId, null, {
        companies: [...new Set(companyIds)].map(anonymize),
      });
    }
  });

  const issueCounts = issues.reduce((counts, issue) => ({
    ...counts,
    [issue.type]: (counts[issue.type] || 0) + 1,
  }), {});
  console.log(JSON.stringify({
    mode: "read-only",
    projectId,
    totals: { users: users.length, companies: companies.length },
    affectedUserCount: affectedUsers.size,
    issueCounts,
    issues,
  }, null, 2));
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
