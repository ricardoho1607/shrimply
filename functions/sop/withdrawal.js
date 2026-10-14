"use strict";
const admin = require("../firebaseAdmin");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { FieldPath } = require("firebase-admin/firestore");
const { hash } = require("./evidence");
async function processWithdrawal(db, ref) {
  const job = (await ref.get()).data();
  if (!job || job.status !== "pending") return;
  let query = db
    .collection("communitySopAdopters")
    .where("publicationId", "==", job.publicationId)
    .orderBy(FieldPath.documentId());
  if (job.cursor) query = query.startAfter(job.cursor);
  const page = await query.limit(200).get();
  for (const link of page.docs) {
    const data = link.data();
    for (const adoption of data.adoptions || [
      { id: data.adoptionId, managerId: data.managerId },
    ]) {
      const notification = db.doc(
        `companies/${data.companyId}/sopNotifications/${hash([job.publicationId, link.id, adoption.id, "withdrawal"])}`,
      );
      await db.runTransaction(async (tx) => {
        const old = await tx.get(notification);
        if (old.exists) return;
        tx.create(notification, {
          recipientId: adoption.managerId,
          title: "An adopted SOP was withdrawn",
          message: "Review the source withdrawal and your farm copy.",
          adoptionId: adoption.id,
          createdAt: job.createdAt,
          read: false,
          severity: "warning",
          pushStatus: "pending",
          nextAttemptAt: Date.now(),
        });
      });
    }
  }
  await db.runTransaction(async (tx) => {
    const latest = await tx.get(ref);
    if (latest.data()?.cursor !== job.cursor) return;
    tx.update(ref, {
      cursor: page.docs.at(-1)?.id || job.cursor,
      status: page.size === 200 ? "pending" : "completed",
      nextDueAt: Date.now(),
    });
  });
}
exports.notifySopWithdrawal = onDocumentCreated(
  { document: "sopWithdrawalJobs/{jobId}", timeoutSeconds: 540 },
  (event) =>
    event.data ? processWithdrawal(admin.firestore(), event.data.ref) : null,
);
exports.retrySopWithdrawals = onSchedule(
  { schedule: "every 5 minutes", timeoutSeconds: 540, maxInstances: 1 },
  async () => {
    const jobs = await admin
      .firestore()
      .collection("sopWithdrawalJobs")
      .where("status", "==", "pending")
      .limit(10)
      .get();
    for (const job of jobs.docs)
      await processWithdrawal(admin.firestore(), job.ref);
  },
);
exports.processWithdrawal = processWithdrawal;
