"use strict";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8187";
const backendRequire = require("node:module").createRequire(
  require("node:path").resolve("functions/package.json"),
);
const { initializeApp } = backendRequire("firebase-admin/app");
const { getFirestore } = backendRequire("firebase-admin/firestore");
const { getAuth } = backendRequire("firebase-admin/auth");
const app = initializeApp({
  projectId: "demo-shrimply-agent",
  storageBucket: "demo-shrimply-agent.firebasestorage.app",
});
const db = getFirestore(app);
(async () => {
  await db.recursiveDelete(db.doc("companies/sop-browser-farm"));
  const auth = getAuth(app),
    uid = "sop-browser-owner";
  try {
    await auth.createUser({
      uid,
      email: "sop-owner@example.test",
      password: "Local-sop-test-123!",
      emailVerified: true,
    });
  } catch (e) {
    if (e.code !== "auth/uid-already-exists") throw e;
  }
  await db.doc(`users/${uid}`).set({
    uid,
    email: "sop-owner@example.test",
    name: "SOP test manager",
    role: "owner",
    companyId: "sop-browser-farm",
    hasCompletedSetup: true,
  });
  await db.doc("companies/sop-browser-farm").set({
    ownerId: uid,
    teamMembers: [],
    companyName: "SOP acceptance farm",
    businessSize: "enterprise",
    timeZone: "UTC",
    country: "Indonesia",
    primaryLocation: "Isolated emulator location",
    farmType: "shrimp",
    subscription: { plan: "pro", status: "active" },
  });
  await db.doc("companies/sop-browser-farm/blocks/acceptance-block").set({
    companyId: "sop-browser-farm",
    name: "Acceptance block",
    assignedTechnicianId: uid,
  });
  await db.doc("companies/sop-browser-farm/physicalPonds/acceptance-pond").set({
    pondName: "Acceptance pond",
    blockId: "acceptance-block",
    status: "active",
    activePondId: "acceptance-cycle",
  });
  await db.doc("companies/sop-browser-farm/ponds/acceptance-cycle").set({
    companyId: "sop-browser-farm",
    createdAt: new Date().toISOString(),
    pondName: "Acceptance pond",
    physicalPondId: "acceptance-pond",
    blockId: "acceptance-block",
    pondCycleId: "acceptance-cycle",
    cycleStatus: "active",
    cycleId: "cycle-1",
    cycleName: "Cycle 1",
    docStart: new Date(Date.now() - 40 * 86400000).toISOString().slice(0, 10),
    initialStock: 100000,
    initialWeight: 0.5,
    area: 1000,
    samplings: [],
  });
  console.log("Isolated SOP browser fixtures ready.");
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
