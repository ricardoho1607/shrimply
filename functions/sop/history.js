"use strict";
const { targetTechnician } = require("./assignments");
const { access, id, rows, fail } = require("./service");
async function sopHistory(db, uid, companyId, kind, cursor) {
  const { manage, company, user } = await access(db, uid, companyId);
  if (!["tasks", "activeTasks", "taskHistory", "notifications", "issues", "sops", "adoptions", "community"].includes(kind))
    fail("invalid-argument", "Invalid history kind.");
  const ref = db.collection("companies").doc(companyId),
    name = {
      tasks: "tasks",
      activeTasks: "tasks",
      taskHistory: "tasks",
      notifications: "sopNotifications",
      issues: "sopIssues",
      sops: "sops",
      adoptions: "sopAdoptions",
      community: "communitySops",
    }[kind],
    field = ["tasks", "activeTasks", "taskHistory"].includes(kind) ? "dueAt" : kind === "notifications" ? "createdAt" : "openedAt";
  const library = ["sops", "adoptions", "community"].includes(kind);
  let query =
    kind === "notifications" ? ref.collection(name).where("recipientId", "==", uid) :
    kind === "community"
      ? db.collection(name).where("status", "==", "published")
      : manage || library
        ? ref.collection(name)
        : ref.collection(name).where("visibleTo", "array-contains", uid);
  if (kind === "activeTasks") query = query.where("status", "in", ["open", "scheduled", "submitted", "needs_review"]);
  if (kind === "taskHistory") query = query.where("status", "in", ["completed", "waived", "cancelled"]);
  const pageSize = kind === "activeTasks" ? 100 : kind === "notifications" ? 50 : 200;
  query = library
    ? query.orderBy(require("firebase-admin/firestore").FieldPath.documentId())
    : query.orderBy(field, kind === "activeTasks" ? "asc" : "desc");
  if (cursor) {
    const last = await (
      kind === "community" ? db.collection(name) : ref.collection(name)
    )
      .doc(id(cursor))
      .get();
    if (!last.exists) fail("not-found", "History cursor no longer exists.");
    query = query.startAfter(last);
  }
  const snap = await query.limit(pageSize).get();
  let items = rows(snap);
  if (kind !== "notifications" && !manage && user.role === "technician") {
    const allowed = async (target) => target.scope === "company" || (await targetTechnician({}, ref, company, target)) === uid;
    if (kind === "adoptions") {
      items = await Promise.all(items.map(async (item) => ({ ...item, targets: (await Promise.all((item.targets || []).map(async (target) => await allowed(target) ? target : null))).filter(Boolean) })));
    } else if (!library) {
      items = (await Promise.all(items.map(async (item) => await allowed(item.target) ? item : null))).filter(Boolean);
    }
  }
  return {
    items,
    nextCursor: snap.size === pageSize ? snap.docs[snap.docs.length - 1].id : "",
  };
}
module.exports = { sopHistory };
