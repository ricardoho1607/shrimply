const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { after, before, beforeEach, test } = require("node:test");
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require("@firebase/rules-unit-testing");
const { doc, getDoc, serverTimestamp, setDoc, updateDoc } = require("firebase/firestore");

const projectId = "demo-shrimply-team-security";
let testEnvironment;

const seed = async (entries) => {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    for (const [documentPath, data] of entries) {
      await setDoc(doc(context.firestore(), documentPath), data);
    }
  });
};

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  test("Firestore membership rules require the emulator", { skip: "Run npm run test:team-security:emulator through firebase emulators:exec." }, () => {});
} else {
before(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, "..", "firestore.rules"), "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnvironment.clearFirestore();
});

after(async () => {
  await testEnvironment.cleanup();
});

test("a stale company team entry cannot read company data", async () => {
  await seed([
    ["users/stale-user", { email: "stale@example.com", companyId: "other-company", role: "manager" }],
    ["companies/company-a", { ownerId: "owner-a", teamMembers: ["owner-a", "stale-user"] }],
  ]);
  const db = testEnvironment.authenticatedContext("stale-user", { email: "stale@example.com" }).firestore();
  await assertFails(getDoc(doc(db, "companies/company-a")));
});

test("a reciprocal company member retains company access", async () => {
  await seed([
    ["users/member-a", { email: "member@example.com", companyId: "company-a", role: "manager" }],
    ["companies/company-a", { ownerId: "owner-a", teamMembers: ["owner-a", "member-a"] }],
  ]);
  const db = testEnvironment.authenticatedContext("member-a", { email: "member@example.com" }).firestore();
  await assertSucceeds(getDoc(doc(db, "companies/company-a")));
});

test("clients cannot create invites, rate-limit records, or join requests", async () => {
  await seed([
    ["users/user-a", { email: "user@example.com", companyId: null, role: "technician" }],
  ]);
  const db = testEnvironment.authenticatedContext("user-a", {
    email: "user@example.com",
    email_verified: true,
  }).firestore();
  await assertFails(setDoc(doc(db, "companyInvites/invite-a"), { companyId: "company-a" }));
  await assertFails(setDoc(doc(db, "securityRateLimits/limit-a"), { count: 1 }));
  await assertFails(setDoc(doc(db, "joinRequests/request-a"), {
    companyId: "company-a",
    userId: "user-a",
    requestedRole: "technician",
    status: "pending",
  }));
});

test("company managers cannot directly change membership records", async () => {
  await seed([
    ["users/manager-a", { email: "manager@example.com", companyId: "company-a", role: "manager" }],
    ["users/member-a", { email: "member@example.com", companyId: "company-a", role: "technician" }],
    ["companies/company-a", {
      ownerId: "owner-a",
      teamMembers: ["owner-a", "manager-a", "member-a"],
      companyName: "Company A",
      farmType: "shrimp",
      businessSize: "small",
      primaryLocation: "Farm A",
    }],
  ]);
  const db = testEnvironment.authenticatedContext("manager-a", {
    email: "manager@example.com",
    email_verified: true,
  }).firestore();
  await assertFails(updateDoc(doc(db, "companies/company-a"), {
    teamMembers: ["owner-a", "manager-a"],
  }));
  await assertFails(updateDoc(doc(db, "users/member-a"), {
    companyId: null,
    role: null,
  }));
});

test("only an unassigned user can create their first company", async () => {
  await seed([
    ["users/free-owner", { email: "free@example.com", companyId: null, role: "owner" }],
    ["users/assigned-owner", { email: "assigned@example.com", companyId: "company-existing", role: "owner" }],
  ]);
  const companyPayload = (ownerId) => ({
    ownerId,
    teamMembers: [ownerId],
    companyName: "New Company",
    farmType: "shrimp",
    businessSize: "small",
    primaryLocation: "Farm A",
  });
  const freeDb = testEnvironment.authenticatedContext("free-owner", { email: "free@example.com" }).firestore();
  const assignedDb = testEnvironment.authenticatedContext("assigned-owner", { email: "assigned@example.com" }).firestore();
  await assertSucceeds(setDoc(doc(freeDb, "companies/company-new"), companyPayload("free-owner")));
  await assertFails(setDoc(doc(assignedDb, "companies/company-second"), companyPayload("assigned-owner")));
  const created = await getDoc(doc(freeDb, "companies/company-new"));
  assert.equal(created.exists(), true);
});

test("platform owners can grant a user permission that Firestore enforces", async () => {
  await seed([
    ["users/founder-a", { email: "founder@example.com", role: "admin" }],
    ["users/owner-a", { email: "owner@example.com", companyId: "company-a", role: "owner" }],
    ["users/manager-a", { email: "manager@example.com", companyId: "company-a", role: "manager" }],
    ["companies/company-a", {
      ownerId: "owner-a",
      teamMembers: ["owner-a", "manager-a"],
      companyName: "Company A",
      farmType: "shrimp",
      businessSize: "medium",
      primaryLocation: "Farm A",
    }],
  ]);
  const managerDb = testEnvironment.authenticatedContext("manager-a", { email: "manager@example.com" }).firestore();
  const founderDb = testEnvironment.authenticatedContext("founder-a", {
    email: "founder@example.com",
    platformOwner: true,
  }).firestore();

  await assertFails(setDoc(doc(managerDb, "companies/company-a/ponds/pond-a"), { pondName: "Pond A" }));
  await assertSucceeds(updateDoc(doc(founderDb, "users/manager-a"), {
    permissionOverrides: { managePonds: true },
    permissionsUpdatedAt: serverTimestamp(),
    permissionsUpdatedBy: "founder-a",
  }));
  await assertSucceeds(setDoc(doc(managerDb, "companies/company-a/ponds/pond-a"), { pondName: "Pond A" }));
});

test("platform owners cannot remove permissions from the actual company owner", async () => {
  await seed([
    ["users/founder-a", { email: "founder@example.com", role: "admin" }],
    ["users/owner-a", { email: "owner@example.com", companyId: "company-a", role: "owner" }],
    ["companies/company-a", {
      ownerId: "owner-a",
      teamMembers: ["owner-a"],
      companyName: "Company A",
      farmType: "shrimp",
      businessSize: "medium",
      primaryLocation: "Farm A",
    }],
  ]);
  const founderDb = testEnvironment.authenticatedContext("founder-a", {
    email: "founder@example.com",
    platformOwner: true,
  }).firestore();

  await assertFails(updateDoc(doc(founderDb, "users/owner-a"), {
    permissionOverrides: { managePonds: false },
    permissionsUpdatedAt: serverTimestamp(),
    permissionsUpdatedBy: "founder-a",
  }));
});
}
