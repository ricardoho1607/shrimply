const assert = require("node:assert/strict");
const test = require("node:test");
const { ROLE_DEFAULTS, hasUserPermission } = require("./permissions");

const company = { id: "company-a", ownerId: "owner-a", teamMembers: ["owner-a", "manager-a", "tech-a"] };

test("server permission defaults match the supported company roles", () => {
  assert.equal(ROLE_DEFAULTS.owner, "*");
  assert.equal(ROLE_DEFAULTS["co-owner"], "*");
  assert.equal(ROLE_DEFAULTS.manager.includes("manageFinance"), true);
  assert.equal(ROLE_DEFAULTS.manager.includes("managePonds"), false);
  assert.equal(ROLE_DEFAULTS.technician.includes("recordPondData"), true);
  assert.deepEqual(ROLE_DEFAULTS.mechanic, ["viewFarm", "viewAssets", "logAssetMaintenance"]);
  assert.deepEqual(ROLE_DEFAULTS.buyer, ["manageMarketplace"]);
});

test("server permissions apply overrides and keep the company owner unlocked", () => {
  assert.equal(hasUserPermission({ company, user: { companyId: "company-a", role: "manager" }, uid: "manager-a", permission: "managePonds" }), false);
  assert.equal(hasUserPermission({ company, user: { companyId: "company-a", role: "manager", permissionOverrides: { managePonds: true } }, uid: "manager-a", permission: "managePonds" }), true);
  assert.equal(hasUserPermission({ company, user: { companyId: "company-a", role: "owner", permissionOverrides: { managePonds: false } }, uid: "owner-a", permission: "managePonds" }), true);
});
