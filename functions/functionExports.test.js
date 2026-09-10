const assert = require("node:assert/strict");
const test = require("node:test");

const EXPECTED_FUNCTION_EXPORTS = [
  "acceptCompanyInvite",
  "approveCompanyDeletion",
  "cancelCompanyDeletion",
  "createCompanyInvite",
  "createCompanyJoinRequest",
  "createCompanyPhysicalPond",
  "createMidtransPlanPayment",
  "deleteAdminUser",
  "ensureOperationalSummary",
  "expireCompanyPlans",
  "extractLabReportFromPdf",
  "generateOrsonResponse",
  "getAdminAccountIntelligence",
  "getAdminMetrics",
  "getCompanyBillingSummary",
  "getOrsonMortalityContext",
  "hardDeleteCompany",
  "initializeCompanyPlan",
  "listCompanyInvites",
  "midtransBillingWebhook",
  "notifyNearbyFarmsOnDiseaseReport",
  "onAdditiveOperationalChange",
  "onAssetOperationalChange",
  "onFeedOperationalChange",
  "onNotificationOperationalChange",
  "orsonDailySupervisor",
  "orsonFarmCycleLearning",
  "orsonPondCycleLearning",
  "orsonProactiveConsultant",
  "processCompanyJoinRequest",
  "processConfirmedLabReport",
  "recordOrsonPrediction",
  "refreshOperationalSummaries",
  "removeCompanyMember",
  "requestAndroidTesterAccess",
  "requestCompanyDeletion",
  "revokeCompanyInvite",
  "scheduleCompanyPlanChange",
  "searchAdminAccounts",
  "trackPhysicalPondDeletion",
];

test("Functions entrypoint preserves all deployed export names", () => {
  const deployedFunctions = require("./index");
  assert.deepEqual(Object.keys(deployedFunctions).sort(), EXPECTED_FUNCTION_EXPORTS);
});
