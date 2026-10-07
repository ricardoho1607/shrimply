"use strict";
const admin = require("../firebaseAdmin");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { hash } = require("./evidence");
function isQuiet(now, zone, start, end) {
  if (start === end) return false;
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(now));
  return start < end
    ? time >= start && time < end
    : time >= start || time < end;
}
async function deliverSopPush(
  db,
  fetcher = fetch,
  now = Date.now(),
  singleRef = null,
) {
  const pending = singleRef
    ? { docs: [await singleRef.get()], size: 1 }
    : await db
        .collectionGroup("sopNotifications")
        .where("pushStatus", "==", "pending")
        .where("nextAttemptAt", "<=", now)
        .limit(100)
        .get();
  for (const notification of pending.docs) {
    if (!notification.exists || notification.data().pushStatus !== "pending")
      continue;
    const n = notification.data(),
      companyId = notification.ref.parent.parent.id,
      company = (await notification.ref.parent.parent.get()).data();
    const user = (await db.doc(`users/${n.recipientId}`).get()).data();
    if (
      !company ||
      user?.founderAccessSuspended ||
      (company.ownerId !== n.recipientId &&
        (!(company.teamMembers || []).includes(n.recipientId) ||
          user?.companyId !== companyId))
    ) {
      await notification.ref.update({ pushStatus: "cancelled" });
      continue;
    }
    const devices = await db
      .collection("sopDevices")
      .where("uid", "==", n.recipientId)
      .where("companyId", "==", companyId)
      .where("enabled", "==", true)
      .get();
    if (!devices.size) {
      await notification.ref.update({ pushStatus: "no_device" });
      continue;
    }
    let waiting = false;
    for (const device of devices.docs) {
      const d = device.data();
      if (!user) {
        await device.ref.update({ enabled: false });
        continue;
      }
      if (
        Number.isFinite(user.founderSessionValidAfter) &&
        (!Number.isFinite(d.authTime) ||
          d.authTime <= user.founderSessionValidAfter)
      ) {
        await device.ref.update({ enabled: false });
        continue;
      }
      const deliveryRef = db
        .collection("sopPushDeliveries")
        .doc(hash([notification.ref.path, device.id]));
      if (
        n.severity !== "critical" &&
        isQuiet(now, company.timeZone || "UTC", d.quietStart, d.quietEnd)
      ) {
        waiting = true;
        continue;
      }
      const lease = await db.runTransaction(async (tx) => {
        const s = await tx.get(deliveryRef);
        if (
          s.data()?.status === "sent" ||
          s.data()?.status === "disabled" ||
          s.data()?.leaseUntil > now
        )
          return false;
        tx.set(deliveryRef, {
          notificationPath: notification.ref.path,
          deviceId: device.id,
          status: "sending",
          leaseUntil: now + 120000,
          attempts: (s.data()?.attempts || 0) + 1,
        });
        return true;
      });
      if (!lease) continue;
      try {
        const response = await fetcher("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: d.token,
            title: n.title,
            body: "Open Shrimply To-do to review your farm work.",
            data: {
              url: `/todo?taskId=${encodeURIComponent(n.taskId || "")}`,
              companyId,
              severity: n.severity,
            },
            channelId:
              n.severity === "critical" ? "sop-critical" : "sop-routine",
            sound: n.severity === "critical" ? "default" : undefined,
          }),
        });
        if (!response.ok) throw new Error(`Expo push ${response.status}`);
        const body = await response.json(),
          ticket = body.data;
        if (ticket?.status === "ok")
          await deliveryRef.update({
            status: "sent",
            ticketId: ticket.id,
            sentAt: now,
            nextReceiptAt: now + 900000,
          });
        else if (ticket?.details?.error === "DeviceNotRegistered") {
          await device.ref.update({ enabled: false });
          await deliveryRef.update({ status: "disabled" });
        } else throw new Error(ticket?.message || "Push delivery failed");
      } catch (error) {
        waiting = true;
        await deliveryRef.update({
          status: "retry",
          leaseUntil: 0,
          error: String(error).slice(0, 500),
        });
      }
    }
    await notification.ref.update(
      waiting ? { nextAttemptAt: now + 300000 } : { pushStatus: "sent" },
    );
  }
  const receipts = await db
    .collection("sopPushDeliveries")
    .where("status", "==", "sent")
    .where("nextReceiptAt", "<=", now)
    .limit(100)
    .get();
  if (receipts.size) {
    const response = await fetcher(
      "https://exp.host/--/api/v2/push/getReceipts",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: receipts.docs.map((d) => d.data().ticketId),
        }),
      },
    );
    if (response.ok) {
      const { data } = await response.json();
      for (const r of receipts.docs) {
        const receipt = data?.[r.data().ticketId];
        if (!receipt) {
          await r.ref.update({ nextReceiptAt: now + 900000 });
          continue;
        }
        if (receipt.details?.error === "DeviceNotRegistered")
          await db
            .collection("sopDevices")
            .doc(r.data().deviceId)
            .update({ enabled: false });
        await r.ref.update({
          status: receipt.status === "ok" ? "delivered" : "receipt_error",
          receipt,
          checkedAt: now,
        });
      }
    }
  }
  return { processed: pending.size };
}
exports.deliverSopNotifications = onSchedule(
  { schedule: "every 1 minutes", timeoutSeconds: 120, maxInstances: 1 },
  () => deliverSopPush(admin.firestore()),
);
exports.deliverSopPush = deliverSopPush;
exports.isQuiet = isQuiet;

exports.deliverCriticalSopPush = onDocumentCreated(
  {
    document: "companies/{companyId}/sopNotifications/{notificationId}",
    timeoutSeconds: 120,
  },
  (event) =>
    event.data?.data()?.severity === "critical"
      ? deliverSopPush(admin.firestore(), fetch, Date.now(), event.data.ref)
      : null,
);
