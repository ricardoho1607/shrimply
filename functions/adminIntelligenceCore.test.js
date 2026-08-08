const assert = require("node:assert/strict");
const test = require("node:test");
const {
  deriveAccountStatus,
  getLatestIsoTimestamp,
  hasPlatformOwnerClaim,
  isValidDeleteUserRequest,
  maskEmail,
  maskPhone,
} = require("./adminIntelligenceCore");

test("platform owner permission requires a dedicated verified claim", () => {
  assert.equal(hasPlatformOwnerClaim(null), false);
  assert.equal(hasPlatformOwnerClaim({ uid: "farm-owner", token: { role: "owner" } }), false);
  assert.equal(hasPlatformOwnerClaim({ uid: "platform-owner", token: { platformOwner: true } }), true);
  assert.equal(hasPlatformOwnerClaim({ uid: "platform-owner", token: { platformRole: "owner" } }), true);
});

test("backend masking never returns full contact values", () => {
  assert.equal(maskEmail("owner@example.com"), "ow••••@example.com");
  assert.equal(maskPhone("+61 412 555 678"), "+•• ••• ••• 5678");
});

test("account status reflects explicit suspension, recency, and billing risk", () => {
  const recent = new Date(Date.now() - 2 * 86_400_000).toISOString();
  const old = new Date(Date.now() - 120 * 86_400_000).toISOString();
  assert.equal(deriveAccountStatus({ lastActiveAt: recent, billingStatus: "active" }), "Healthy");
  assert.equal(deriveAccountStatus({ lastActiveAt: recent, billingStatus: "past_due" }), "At Risk");
  assert.equal(deriveAccountStatus({ lastActiveAt: old, billingStatus: "active" }), "Inactive");
  assert.equal(deriveAccountStatus({ explicitStatus: "suspended", lastActiveAt: recent }), "Suspended");
});

test("latest activity uses the newest valid timestamp", () => {
  assert.equal(getLatestIsoTimestamp([
    "2026-08-03T09:15:00.000Z",
    null,
    "not-a-date",
    "2026-08-04T10:24:00.000Z",
  ]), "2026-08-04T10:24:00.000Z");
  assert.equal(getLatestIsoTimestamp([null, undefined, "invalid"]), null);
});

test("user deletion requires a reason and exact case-insensitive confirmation", () => {
  assert.equal(isValidDeleteUserRequest({ reason: "Remove duplicate account", confirmation: "USER@example.com", expectedConfirmation: "user@example.com" }), true);
  assert.equal(isValidDeleteUserRequest({ reason: "short", confirmation: "user@example.com", expectedConfirmation: "user@example.com" }), false);
  assert.equal(isValidDeleteUserRequest({ reason: "Remove duplicate account", confirmation: "wrong@example.com", expectedConfirmation: "user@example.com" }), false);
});
