"use strict";
const { farmDate, localInstant } = require("../shared/orsonDomain/sop/engine");
function evidenceBounds(step, start, end, now, zone) {
  const clock = Math.min(now, end), fresh = clock - step.check.freshnessMinutes * 60000;
  if (![start, end, clock, fresh].every(Number.isFinite)) return null;
  const windowStart = ["trend", "count", "sequence"].includes(step.check.operator) ? fresh : start;
  if (step.check.exactTime) return { instantStart: Math.max(windowStart, fresh), instantEnd: end };
  const dateStart = [farmDate(windowStart, zone), farmDate(fresh, zone)].sort().at(-1);
  return { instantStart: Math.max(localInstant(dateStart, "00:00", zone), fresh), instantEnd: end,
    dateStart, dateEnd: farmDate(end, zone) };
}
async function taskEvidence(reader, ref, task, zone, start, end, now) {
  if (task.step.check.field === "manual") return { docs: [] };
  let query = ref.collection("sopEvidence").where("targetId", "==", task.target.id).where("field", "==", task.step.check.field);
  // Legacy tasks with no cycle identity retain their original query behavior.
  if (typeof task.target.cycleId !== "string") return reader.get(query);
  query = query.where("cycleId", "==", task.target.cycleId);
  const bounds = evidenceBounds(task.step, start, end, now, zone);
  if (!bounds) return reader.get(query);
  const instant = query.where("observedAt", ">=", bounds.instantStart).where("observedAt", "<=", bounds.instantEnd);
  if (task.step.check.exactTime) return reader.get(instant);
  const dates = query.where("observedAt", "==", null).where("date", ">=", bounds.dateStart).where("date", "<=", bounds.dateEnd);
  const snapshots = await Promise.all([reader.get(instant), reader.get(dates)]);
  return { docs: snapshots.flatMap((snapshot) => snapshot.docs) };
}
module.exports = { evidenceBounds, taskEvidence };
