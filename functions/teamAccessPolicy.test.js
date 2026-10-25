const assert = require("node:assert/strict");
const test = require("node:test");
const {
  buildSecureInvite,
  evaluateInviteAcceptance,
  evaluateJoinApproval,
  evaluateDeletionRequest,
  evaluateDeletionApproval,
  evaluateDeletionCancellation,
  hashInviteToken,
} = require("./teamAccessPolicy");

test("secure invites use a high-entropy token without storing the plaintext secret", () => {
  const generated = buildSecureInvite({
    companyId: "company-a",
    email: "Technician@Example.com ",
    role: "technician",
    createdBy: "owner-a",
    message: "Welcome",
    nowMs: Date.UTC(2026, 7, 10),
    randomBytes: () => Buffer.alloc(32, 7),
  });

  assert.equal(generated.token.length, 43);
  assert.equal(generated.inviteId, hashInviteToken(generated.token));
  assert.equal(generated.record.tokenHash, generated.inviteId);
  assert.equal(generated.record.emailNormalized, "technician@example.com");
  assert.equal(generated.record.expiresAtMs, Date.UTC(2026, 7, 17));
  assert.equal("token" in generated.record, false);
  assert.equal("inviteToken" in generated.record, false);
});

test("invite acceptance requires a verified matching identity and one-company membership", () => {
  const invite = {
    companyId: "company-b",
    emailNormalized: "worker@example.com",
    role: "manager",
    status: "pending",
    expiresAtMs: Date.UTC(2026, 7, 17),
  };
  const base = {
    invite,
    authEmail: "Worker@example.com",
    emailVerified: true,
    currentCompanyId: null,
    nowMs: Date.UTC(2026, 7, 10),
  };

  assert.deepEqual(evaluateInviteAcceptance(base), { allowed: true, role: "manager" });
  assert.equal(evaluateInviteAcceptance({ ...base, emailVerified: false }).reason, "email-unverified");
  assert.equal(evaluateInviteAcceptance({ ...base, authEmail: "other@example.com" }).reason, "email-mismatch");
  assert.equal(evaluateInviteAcceptance({ ...base, currentCompanyId: "company-a" }).reason, "already-in-another-company");
  assert.equal(evaluateInviteAcceptance({ ...base, nowMs: Date.UTC(2026, 7, 18) }).reason, "invite-expired");
  assert.deepEqual(evaluateInviteAcceptance({ ...base, currentCompanyId: "company-b" }), { allowed: true, role: "manager" });
});

test("join approval cannot move a user from another company or process a stale request", () => {
  const request = {
    companyId: "company-b",
    requestedRole: "technician",
    status: "pending",
  };

  assert.deepEqual(evaluateJoinApproval({ request, currentCompanyId: null }), {
    allowed: true,
    role: "technician",
  });
  assert.equal(evaluateJoinApproval({ request, currentCompanyId: "company-a" }).reason, "already-in-another-company");
  assert.equal(evaluateJoinApproval({ request: { ...request, status: "approved" }, currentCompanyId: null }).reason, "request-not-pending");
  assert.equal(evaluateJoinApproval({ request: { ...request, requestedRole: "owner" }, currentCompanyId: null }).reason, "role-not-allowed");
});

test("company deletion request requires owner/co-owner and handles single vs multi-owner scenarios", () => {
  const singleOwnerCompany = { id: "company-1", ownerId: "owner-1" };
  const singleResult = evaluateDeletionRequest({
    company: singleOwnerCompany,
    requesterUid: "owner-1",
    requesterName: "Alice",
    ownerAndCoOwnerUids: ["owner-1"],
    nowMs: 1000,
  });
  assert.equal(singleResult.allowed, true);
  assert.equal(singleResult.isFullyApproved, true);
  assert.equal(singleResult.record.status, "approved");

  const multiOwnerCompany = { id: "company-2", ownerId: "owner-1" };
  const multiResult = evaluateDeletionRequest({
    company: multiOwnerCompany,
    requesterUid: "co-owner-1",
    requesterName: "Bob",
    ownerAndCoOwnerUids: ["owner-1", "co-owner-1", "co-owner-2"],
    nowMs: 1000,
  });
  assert.equal(multiResult.allowed, true);
  assert.equal(multiResult.isFullyApproved, false);
  assert.equal(multiResult.record.status, "pending");
  assert.deepEqual(multiResult.record.requiredApproverIds, ["owner-1", "co-owner-1", "co-owner-2"]);
  assert.deepEqual(multiResult.record.approvedByIds, ["co-owner-1"]);

  const nonOwnerResult = evaluateDeletionRequest({
    company: multiOwnerCompany,
    requesterUid: "tech-1",
    requesterName: "Charlie",
    ownerAndCoOwnerUids: ["owner-1", "co-owner-1"],
  });
  assert.equal(nonOwnerResult.allowed, false);
  assert.equal(nonOwnerResult.reason, "not-an-owner-or-co-owner");
});

test("company deletion approval requires all owners and co-owners to reach unanimous consent", () => {
  const companyWithPending = {
    id: "company-2",
    deletionRequest: {
      requestedBy: "owner-1",
      status: "pending",
      requiredApproverIds: ["owner-1", "co-owner-1", "co-owner-2"],
      approvedByIds: ["owner-1"],
    },
  };

  const firstApproval = evaluateDeletionApproval({
    company: companyWithPending,
    approverUid: "co-owner-1",
    ownerAndCoOwnerUids: ["owner-1", "co-owner-1", "co-owner-2"],
  });
  assert.equal(firstApproval.allowed, true);
  assert.equal(firstApproval.isFullyApproved, false);
  assert.equal(firstApproval.approvedCount, 2);
  assert.equal(firstApproval.totalRequired, 3);

  const duplicateApproval = evaluateDeletionApproval({
    company: companyWithPending,
    approverUid: "owner-1",
    ownerAndCoOwnerUids: ["owner-1", "co-owner-1", "co-owner-2"],
  });
  assert.equal(duplicateApproval.allowed, false);
  assert.equal(duplicateApproval.reason, "already-approved");

  const finalApproval = evaluateDeletionApproval({
    company: {
      ...companyWithPending,
      deletionRequest: {
        ...companyWithPending.deletionRequest,
        approvedByIds: ["owner-1", "co-owner-1"],
      },
    },
    approverUid: "co-owner-2",
    ownerAndCoOwnerUids: ["owner-1", "co-owner-1", "co-owner-2"],
  });
  assert.equal(finalApproval.allowed, true);
  assert.equal(finalApproval.isFullyApproved, true);
  assert.equal(finalApproval.approvedCount, 3);
});

test("company deletion cancellation allows any owner or co-owner to cancel pending deletion", () => {
  const companyWithPending = {
    id: "company-2",
    deletionRequest: {
      requestedBy: "owner-1",
      status: "pending",
      requiredApproverIds: ["owner-1", "co-owner-1"],
      approvedByIds: ["owner-1"],
    },
  };

  const cancelResult = evaluateDeletionCancellation({
    company: companyWithPending,
    cancellerUid: "co-owner-1",
    ownerAndCoOwnerUids: ["owner-1", "co-owner-1"],
  });
  assert.equal(cancelResult.allowed, true);

  const nonOwnerCancel = evaluateDeletionCancellation({
    company: companyWithPending,
    cancellerUid: "tech-1",
    ownerAndCoOwnerUids: ["owner-1", "co-owner-1"],
  });
  assert.equal(nonOwnerCancel.allowed, false);
  assert.equal(nonOwnerCancel.reason, "not-an-owner-or-co-owner");
});

