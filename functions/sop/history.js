"use strict";
const { targetTechnician } = require("./assignments");
const { access, id, rows, fail } = require("./service");
async function sopHistory(db, uid, companyId, kind, cursor) {
  const { manage, company, user } = await access(db, uid, companyId);
  if (!["tasks", "issues", "sops", "adoptions", "community"].includes(kind))
    fail("invalid-argument", "Invalid history kind.");
  const ref = db.collection("companies").doc(companyId),
    name = {
      tasks: "tasks",
      issues: "sopIssues",
      sops: "sops",
      adoptions: "sopAdoptions",
      community: "communitySops",
    }[kind],
    field = kind === "tasks" ? "dueAt" : "openedAt";
  const library = ["sops", "adoptions", "community"].includes(kind);
  let query =
    kind === "community"
      ? db.collection(name).where("status", "==", "published")
      : manage || library
        ? ref.collection(name)
        : ref.collection(name).where("visibleTo", "array-contains", uid);
  query = library
    ? query.orderBy(require("firebase-admin/firestore").FieldPath.documentId())
    : query.orderBy(field, "desc");
  if (cursor) {
    const last = await (
      kind === "community" ? db.collection(name) : ref.collection(name)
    )
      .doc(id(cursor))
      .get();
    if (!last.exists) fail("not-found", "History cursor no longer exists.");
    query = query.startAfter(last);
  }
  const snap = await query.limit(200).get();
  let items = rows(snap);
  if (!manage && user.role === "technician") {
    const allowed = async (target) => target.scope === "company" || (await targetTechnician({}, ref, company, target)) === uid;
    if (kind === "adoptions") {
      items = await Promise.all(items.map(async (item) => ({ ...item, targets: (await Promise.all((item.targets || []).map(async (target) => await allowed(target) ? target : null))).filter(Boolean) })));
    } else if (!library) {
      items = (await Promise.all(items.map(async (item) => await allowed(item.target) ? item : null))).filter(Boolean);
    }
  }
  return {
    items,
    nextCursor: snap.size === 200 ? snap.docs[snap.docs.length - 1].id : "",
  };
}
module.exports = { sopHistory };
