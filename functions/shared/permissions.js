const ROLE_DEFAULTS = Object.freeze({
  owner: "*",
  "co-owner": "*",
  manager: [
    "viewFarm", "viewAssets", "viewFinance", "manageFinance", "viewReports", "exportReports",
    "useOrson", "editCompanySettings", "submitDiseaseReports", "resolveDiseaseReports", "manageMarketplace",
  ],
  admin: [
    "viewFarm", "viewAssets", "viewFinance", "manageFinance", "viewReports", "exportReports",
    "useOrson", "editCompanySettings", "submitDiseaseReports", "resolveDiseaseReports", "manageMarketplace",
  ],
  technician: [
    "viewFarm", "managePonds", "recordPondData", "manageCycles", "manageLabReports",
    "manageFeedInventory", "manageHarvests", "viewAssets", "manageAssets", "logAssetMaintenance",
    "viewReports", "exportReports", "useOrson", "submitDiseaseReports", "manageMarketplace",
  ],
  mechanic: ["viewFarm", "viewAssets", "logAssetMaintenance"],
  buyer: ["manageMarketplace"],
});

const hasUserPermission = ({ company, user, uid, permission }) => {
  if (!company || !user || !uid) return false;
  if (company.ownerId === uid) return true;
  if (user.companyId !== company.id || !Array.isArray(company.teamMembers) || !company.teamMembers.includes(uid)) return false;
  const overrides = user.permissionOverrides && typeof user.permissionOverrides === "object"
    ? user.permissionOverrides
    : {};
  if (typeof overrides[permission] === "boolean") return overrides[permission];
  const defaults = ROLE_DEFAULTS[user.role];
  return defaults === "*" || (Array.isArray(defaults) && defaults.includes(permission));
};

module.exports = { ROLE_DEFAULTS, hasUserPermission };
