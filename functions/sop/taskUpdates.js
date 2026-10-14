"use strict";
const { access, id, fail } = require("./service");
const { targetTechnician } = require("./assignments");
async function taskUpdates(db, uid, companyId, taskIds) {
  const { manage, company, user } = await access(db, uid, companyId);
  if (!Array.isArray(taskIds) || taskIds.length > 50) fail("invalid-argument", "Request at most 50 tasks.");
  const ids = [...new Set(taskIds.map(id))], ref = db.doc(`companies/${companyId}`);
  const items = [];
  for (const taskId of ids) {
    const snap = await ref.collection("tasks").doc(taskId).get();
    if (!snap.exists) continue;
    const task = { id: snap.id, ...snap.data() };
    if (!manage && !(task.visibleTo || []).includes(uid)) continue;
    if (!manage && user.role === "technician" && task.target?.scope !== "company" &&
        await targetTechnician({}, ref, company, task.target) !== uid) continue;
    items.push(task);
  }
  return { items, removedIds: ids.filter((id) => !items.some((item) => item.id === id)) };
}
module.exports = { taskUpdates };
