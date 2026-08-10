const assert = require("node:assert/strict");
const test = require("node:test");
const {
  buildSecureInvite,
  evaluateInviteAcceptance,
  evaluateJoinApproval,
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
