const assert = require("node:assert/strict");
const test = require("node:test");

const EXPECTED_FUNCTION_EXPORTS = [
  "acceptCompanyInvite",
  "approveCompanyDeletion",
  "cancelCompanyDeletion",
  "createCompanyInvite",
  "createCompanyJoinRequest",
  "deleteAdminUser",
  "extractLabReportFromPdf",
  "generateOrsonResponse",
  "getAdminAccountIntelligence",
  "getAdminMetrics",
  "getOrsonMortalityContext",
  "hardDeleteCompany",
  "listCompanyInvites",
  "notifyNearbyFarmsOnDiseaseReport",
  "orsonDailySupervisor",
  "orsonFarmCycleLearning",
  "orsonPondCycleLearning",
  "orsonProactiveConsultant",
  "processCompanyJoinRequest",
  "processConfirmedLabReport",
  "recordOrsonPrediction",
  "removeCompanyMember",
  "requestAndroidTesterAccess",
  "requestCompanyDeletion",
  "revokeCompanyInvite",
  "searchAdminAccounts",
];

test("Functions entrypoint preserves all deployed export names", () => {
  const deployedFunctions = require("./index");
  assert.deepEqual(Object.keys(deployedFunctions).sort(), EXPECTED_FUNCTION_EXPORTS);
});
