const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { after, before, beforeEach, test } = require("node:test");
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require("@firebase/rules-unit-testing");
const { collection, doc, getDoc, runTransaction, serverTimestamp, setDoc, updateDoc, writeBatch } = require("firebase/firestore");

const projectId = "demo-shrimply-team-security";
let testEnvironment;

const seed = async (entries) => {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    for (const [documentPath, data] of entries) {
      await setDoc(doc(context.firestore(), documentPath), data);
    }
  });
};

const startRegisteredCycle = (db, companyId, pondId, pondName) => {
  const batch = writeBatch(db);
  batch.set(doc(db, `companies/${companyId}/ponds/${pondId}`), { pondName, physicalPondId: 'registered', cycleStatus: 'active' });
  batch.update(doc(db, `companies/${companyId}/physicalPonds/registered`), { status: 'active', activePondId: pondId });
  return batch.commit();
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

test("billing state is server-owned and physical pond limits cannot be bypassed", async () => {
  await seed([
    ["users/owner-a", { email: "owner@example.com", companyId: "company-a", role: "owner" }],
    ["users/member-a", { email: "member@example.com", companyId: "company-a", role: "manager" }],
    ["companies/company-a", { ownerId: "owner-a", teamMembers: ["owner-a", "member-a"] }],
    ["companies/company-a/entitlements/current", { planId: "free", pondLimit: 10 }],
    ["companies/company-a/billing/current", { planId: "free", status: "free" }],
  ]);
  const ownerDb = testEnvironment.authenticatedContext("owner-a", { email: "owner@example.com" }).firestore();
  const memberDb = testEnvironment.authenticatedContext("member-a", { email: "member@example.com" }).firestore();

  await assertSucceeds(getDoc(doc(ownerDb, "companies/company-a/entitlements/current")));
  await assertSucceeds(getDoc(doc(memberDb, "companies/company-a/entitlements/current")));
  await assertSucceeds(getDoc(doc(ownerDb, "companies/company-a/billing/current")));
  await assertFails(getDoc(doc(memberDb, "companies/company-a/billing/current")));
  await assertFails(updateDoc(doc(ownerDb, "companies/company-a/entitlements/current"), { pondLimit: 100 }));
  await assertFails(setDoc(doc(ownerDb, "companies/company-a/physicalPonds/pond-a"), {
    pondName: "Pond A",
    pondArea: 1000,
  }));
});

test("farm members can read but cannot write the server dashboard summary", async () => {
  await seed([
    ["users/member-a", { email: "member@example.com", companyId: "company-a", role: "manager" }],
    ["companies/company-a", { ownerId: "owner-a", teamMembers: ["owner-a", "member-a"] }],
    ["companies/company-a/summaries/dashboard", { operationalSummaryVersion: 1, unreadNotificationCount: 3 }],
  ]);
  const db = testEnvironment.authenticatedContext("member-a", { email: "member@example.com" }).firestore();
  const summaryRef = doc(db, "companies/company-a/summaries/dashboard");
  await assertSucceeds(getDoc(summaryRef));
  await assertFails(updateDoc(summaryRef, { unreadNotificationCount: 0 }));
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
    primaryLocation: "Farm A",
  });
  const freeDb = testEnvironment.authenticatedContext("free-owner", { email: "free@example.com" }).firestore();
  const assignedDb = testEnvironment.authenticatedContext("assigned-owner", { email: "assigned@example.com" }).firestore();
  const setup = writeBatch(freeDb);
  setup.set(doc(freeDb, "companies/company-new"), { ...companyPayload("free-owner"), createdAt: serverTimestamp() });
  setup.update(doc(freeDb, "users/free-owner"), { companyId: "company-new", hasCompletedSetup: true });
  await assertSucceeds(setup.commit());
  await assertFails(setDoc(doc(assignedDb, "companies/company-second"), companyPayload("assigned-owner")));
  const created = await getDoc(doc(freeDb, "companies/company-new"));
  assert.equal(created.exists(), true);
});

test("platform owners can grant a user permission that Firestore enforces", async () => {
  await seed([
    ["companies/company-a/physicalPonds/registered", { pondName: "Pond A", status: "idle" }],
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

  await assertFails(startRegisteredCycle(managerDb, 'company-a', 'pond-a', 'Pond A'));
  await assertSucceeds(updateDoc(doc(founderDb, "users/manager-a"), {
    permissionOverrides: { managePonds: true },
    permissionsUpdatedAt: serverTimestamp(),
    permissionsUpdatedBy: "founder-a",
  }));
  await assertSucceeds(startRegisteredCycle(managerDb, 'company-a', 'pond-a', 'Pond A'));
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

test("enterprise feeding permission works independently while technicians keep block scope", async () => {
  await seed([
    ["users/manager-enterprise", { email: "manager@example.com", companyId: "enterprise-farm", role: "manager" }],
    ["users/technician-enterprise", { email: "technician@example.com", companyId: "enterprise-farm", role: "technician" }],
    ["companies/enterprise-farm", { ownerId: "owner", teamMembers: ["owner", "manager-enterprise", "technician-enterprise"], businessSize: "enterprise" }],
    ["companies/enterprise-farm/ponds/pond-a", { pondName: "Pond A", blockId: "block-a", samplings: [] }],
    ["companies/enterprise-farm/ponds/pond-b", { pondName: "Pond B", blockId: "block-b", samplings: [] }],
    ["companies/enterprise-farm/blocks/block-a", { assignedTechnicianId: "technician" }],
    ["companies/enterprise-farm/blocks/block-b", { assignedTechnicianId: "technician-enterprise" }],
    ["companies/enterprise-farm/feeds/feed-a", { totalStock: 100 }],
  ]);
  const managerDb = testEnvironment.authenticatedContext("manager-enterprise", { email: "manager@example.com" }).firestore();
  const technicianDb = testEnvironment.authenticatedContext("technician-enterprise", { email: "technician@example.com" }).firestore();
  const ownerDb = testEnvironment.authenticatedContext("owner", { email: "owner@example.com" }).firestore();
  const founderDb = testEnvironment.authenticatedContext("founder", { platformOwner: true }).firestore();
  const pondRef = doc(managerDb, "companies/enterprise-farm/ponds/pond-a");
  const feedRef = doc(managerDb, "companies/enterprise-farm/feeds/feed-a");
  const recordFeed = () => runTransaction(managerDb, async (transaction) => {
    const pond = await transaction.get(pondRef);
    const feed = await transaction.get(feedRef);
    transaction.update(pondRef, {
      samplings: [...pond.data().samplings, { id: "feed-record", date: "2026-09-04", feedData: { totalDailyFeed: "5.00", inventoryFeedId: "feed-a" } }],
      updatedBy: "manager-enterprise", updatedAt: serverTimestamp(),
    });
    transaction.update(feedRef, { totalStock: feed.data().totalStock - 5 });
  });
  await assertFails(recordFeed());
  assert.equal((await getDoc(feedRef)).data().totalStock, 100, "Denied pond access must not deduct stock");
  await updateDoc(doc(founderDb, "users/manager-enterprise"), {
    permissionOverrides: { manageFeedInventory: true },
    permissionsUpdatedAt: serverTimestamp(), permissionsUpdatedBy: "founder",
  });
  await assertSucceeds(recordFeed());
  assert.equal((await getDoc(feedRef)).data().totalStock, 95);
  assert.equal((await getDoc(pondRef)).data().samplings.length, 1);
  await assertFails(updateDoc(doc(technicianDb, "companies/enterprise-farm/ponds/pond-a"), {
    samplings: [], updatedBy: "technician-enterprise", updatedAt: serverTimestamp(),
  }));
  await assertSucceeds(updateDoc(doc(technicianDb, "companies/enterprise-farm/ponds/pond-b"), {
    samplings: [{ id: "assigned-feed", feedData: { totalDailyFeed: "1.00" } }],
    updatedBy: "technician-enterprise", updatedAt: serverTimestamp(),
  }));
  await assertSucceeds(updateDoc(doc(ownerDb, "companies/enterprise-farm/ponds/pond-a"), {
    samplings: [{ id: "owner-feed", feedData: { totalDailyFeed: "1.00" } }],
    updatedBy: "owner", updatedAt: serverTimestamp(),
  }));
});

test("admin feeding grants and revocations govern writes without a new login", async () => {
  await seed([
    ["users/manager-feed", { email: "manager@example.com", companyId: "feed-farm", role: "manager" }],
    ["companies/feed-farm", { ownerId: "owner", teamMembers: ["owner", "manager-feed"] }],
    ["companies/other-farm", { ownerId: "other-owner", teamMembers: ["other-owner"] }],
  ]);
  const managerDb = testEnvironment.authenticatedContext("manager-feed", { email: "manager@example.com" }).firestore();
  const founderDb = testEnvironment.authenticatedContext("founder", { platformOwner: true }).firestore();
  const feedRef = doc(managerDb, "companies/feed-farm/feeds/feed-a");
  await assertFails(setDoc(feedRef, { feedName: "Feed A", totalStock: 100 }));
  for (const granted of [true, false]) {
    const batch = writeBatch(founderDb);
    batch.update(doc(founderDb, "users/manager-feed"), {
      permissionOverrides: { manageFeedInventory: granted },
      permissionsUpdatedAt: serverTimestamp(),
      permissionsUpdatedBy: "founder",
    });
    batch.set(doc(collection(founderDb, "adminAuditEvents")), {
      targetId: "manager-feed", action: "account.permissions.updated", timestamp: serverTimestamp(),
    });
    await assertSucceeds(batch.commit());
    const profile = await getDoc(doc(managerDb, "users/manager-feed"));
    assert.equal(profile.data().permissionOverrides.manageFeedInventory, granted);
    const write = setDoc(feedRef, { feedName: "Feed A", totalStock: 95 });
    if (granted) await assertSucceeds(write);
    else await assertFails(write);
    await assertFails(setDoc(doc(managerDb, "companies/other-farm/feeds/feed-a"), { totalStock: 100 }));
  }
  await assertFails(updateDoc(doc(managerDb, "users/manager-feed"), {
    permissionOverrides: { manageFeedInventory: true },
    permissionsUpdatedAt: serverTimestamp(), permissionsUpdatedBy: "manager-feed",
  }));
});

test("platform owners can change active staff roles but cannot change the company owner", async () => {
  await seed([
    ["companies/role-farm/physicalPonds/registered", { pondName: "Role Pond", status: "idle" }],
    ["users/owner-role", { email: "owner@example.com", companyId: "role-farm", role: "owner" }],
    ["users/member-role", { email: "member@example.com", companyId: "role-farm", role: "manager", permissionOverrides: { manageFeedInventory: true } }],
    ["companies/role-farm", { ownerId: "owner-role", teamMembers: ["owner-role", "member-role"] }],
  ]);
  const memberDb = testEnvironment.authenticatedContext("member-role", { email: "member@example.com" }).firestore();
  const founderDb = testEnvironment.authenticatedContext("founder-role", { platformOwner: true }).firestore();
  const memberRef = doc(founderDb, "users/member-role");

  await assertFails(startRegisteredCycle(memberDb, 'role-farm', 'pond-role', 'Role Pond'));
  const batch = writeBatch(founderDb);
  batch.update(memberRef, {
    role: "technician",
    permissionOverrides: {},
    roleUpdatedAt: serverTimestamp(),
    roleUpdatedBy: "founder-role",
    permissionsUpdatedAt: serverTimestamp(),
    permissionsUpdatedBy: "founder-role",
  });
  batch.set(doc(collection(founderDb, "adminAuditEvents")), {
    targetId: "member-role",
    action: "account.role.updated",
    timestamp: serverTimestamp(),
  });
  await assertSucceeds(batch.commit());
  assert.equal((await getDoc(doc(memberDb, "users/member-role"))).data().role, "technician");
  await assertSucceeds(startRegisteredCycle(memberDb, 'role-farm', 'pond-role', 'Role Pond'));

  await assertFails(updateDoc(doc(memberDb, "users/member-role"), {
    role: "manager",
    permissionOverrides: {},
    roleUpdatedAt: serverTimestamp(),
    roleUpdatedBy: "member-role",
    permissionsUpdatedAt: serverTimestamp(),
    permissionsUpdatedBy: "member-role",
  }));
  await assertFails(updateDoc(doc(founderDb, "users/member-role"), {
    role: "owner",
    permissionOverrides: {},
    roleUpdatedAt: serverTimestamp(),
    roleUpdatedBy: "founder-role",
    permissionsUpdatedAt: serverTimestamp(),
    permissionsUpdatedBy: "founder-role",
  }));
  await assertFails(updateDoc(doc(founderDb, "users/owner-role"), {
    role: "manager",
    permissionOverrides: {},
    roleUpdatedAt: serverTimestamp(),
    roleUpdatedBy: "founder-role",
    permissionsUpdatedAt: serverTimestamp(),
    permissionsUpdatedBy: "founder-role",
  }));
});
}
