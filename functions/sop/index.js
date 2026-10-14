"use strict";
const admin = require("../firebaseAdmin");
const { onCall } = require("../shared/guardedCallable");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { createSopService } = require("./service");
const { createSopRuntime } = require("./runtime");
const { enforceFixedWindowLimits } = require("../abuseProtection");
const service = () => createSopService(admin.firestore(), admin.storage());
const runtime = () => createSopRuntime(admin.firestore());
exports.getSopHistory = onCall(async (request) =>
  require("./history").sopHistory(
    admin.firestore(),
    request.auth?.uid,
    request.data?.companyId,
    request.data?.kind,
    request.data?.cursor,
  ),
);
exports.getSopTaskUpdates = onCall(async (request) =>
  require("./taskUpdates").taskUpdates(admin.firestore(), request.auth?.uid,
    request.data?.companyId, request.data?.taskIds));
exports.getSopWorkspace = onCall({ timeoutSeconds: 120 }, async (request) => ({
  ...(await service().snapshot(request.auth?.uid, request.data?.companyId, {
    compact: request.data?.compact === true, statusOnly: request.data?.statusOnly === true,
    liveTasks: request.data?.liveTasks === true, notificationsAfter: request.data?.notificationsAfter,
  })),
  canModerate:
    request.auth?.token?.platformOwner === true ||
    request.auth?.token?.platformRole === "owner",
}));
exports.previewSopPondChange = onCall(async (request) =>
  require("./guards").previewPondChange(
    admin.firestore(),
    request.auth?.uid,
    request.data?.companyId,
    request.data?.pond || {},
  ),
);
exports.checkSopStageGate = onCall(async (request) =>
  require("./guards").stageGate(
    admin.firestore(),
    request.auth?.uid,
    request.data?.companyId,
    require("./service").id(request.data?.targetId),
    request.data?.stage,
  ),
);
async function command(request) {
  if (!request.auth?.uid)
    throw new (require("firebase-functions/v2/https").HttpsError)(
      "unauthenticated",
      "Sign in first.",
    );
  await enforceFixedWindowLimits({
    db: admin.firestore(),
    admin,
    limits: [
      {
        namespace: "sopCommands",
        scope: `user:${request.auth.uid}`,
        limit: 60,
        windowMs: 60000,
        message: "Too many SOP changes. Try again shortly.",
      },
    ],
  });
  const data = {
    ...request.data,
    authTime: request.auth.token?.auth_time ?? null,
    platformAdmin:
      request.auth.token?.platformOwner === true ||
      request.auth.token?.platformRole === "owner",
  };
  return service().command(request.auth.uid, data);
}
exports.sopCommand = onCall({ timeoutSeconds: 120 }, command);
exports.deleteSop = onCall(
  { timeoutSeconds: 120 },
  require("./delete").createDeleteSopHandler(command),
);
exports.runSopScheduler = onSchedule(
  {
    schedule: "every 1 minutes",
    timeoutSeconds: 540,
    memory: "512MiB",
    maxInstances: 1,
  },
  async () => runtime().scheduler(),
);
for (const kind of [
  "ponds",
  "waterObservations",
  "feeds",
  "additives",
  "harvestRecords",
  "labReports",
  "physicalPonds",
  "blocks",
  "cycles",
])
  exports[`onSop${kind[0].toUpperCase() + kind.slice(1)}Evidence`] =
    onDocumentWritten(
      {
        document: `companies/{companyId}/${kind}/{documentId}`,
        timeoutSeconds: 540,
      },
      async (event) => {
        if (!event.data) return;
        const data = event.data.after.exists
          ? {
              ...event.data.after.data(),
              __sopCreated: !event.data.before.exists,
            }
          : null;
        await runtime().project(
          event.params.companyId,
          kind,
          event.params.documentId,
          data,
          event.id,
          Date.parse(event.time) || Date.now(),
        );
      },
    );
exports.onSopAssetEvidence = onDocumentWritten(
  { document: "assets/{assetId}", timeoutSeconds: 120 },
  async (event) => {
    const after = event.data?.after.data(),
      before = event.data?.before.data();
    if (before?.companyId && before.companyId !== after?.companyId)
      await runtime().project(
        before.companyId,
        "assets",
        event.params.assetId,
        null,
        event.id,
        Date.parse(event.time) || Date.now(),
      );
    const companyId = after?.companyId;
    if (companyId)
      await runtime().project(
        companyId,
        "assets",
        event.params.assetId,
        after || null,
        event.id,
        Date.parse(event.time) || Date.now(),
      );
  },
);
Object.assign(exports, require("./ai"));
exports.deliverSopNotifications = require("./push").deliverSopNotifications;
exports.deliverCriticalSopPush = require("./push").deliverCriticalSopPush;
exports.notifySopWithdrawal = require("./withdrawal").notifySopWithdrawal;
exports.retrySopWithdrawals = require("./withdrawal").retrySopWithdrawals;
exports.getSopVersions = onCall((request) =>
  require("./versions").sopVersions(
    admin.firestore(),
    request.auth?.uid,
    request.data?.companyId,
    request.data?.sopId,
    request.data?.cursor,
  ),
);
