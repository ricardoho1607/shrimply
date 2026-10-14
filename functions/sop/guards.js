"use strict";
const { sopConflicts } = require("../shared/orsonDomain/sop/engine");
const { fail, access } = require("./service");
async function previewPondChange(db, uid, companyId, pond) {
  const { company, user, manage } = await access(db, uid, companyId);
  const ref = db.collection("companies").doc(companyId);
  if (
    !manage &&
    company.businessSize === "enterprise" &&
    user.role === "technician" &&
    pond.blockId
  ) {
    const block = (
      await ref.collection("blocks").doc(pond.blockId).get()
    ).data();
    if (block?.assignedTechnicianId !== uid)
      fail("permission-denied", "Pond is outside your assigned block.");
  }
  const all = (
    await ref.collection("sopAdoptions").where("status", "==", "active").get()
  ).docs.map((d) => ({ id: d.id, ...d.data() }));
  const affected = all.filter(
    (a) =>
      a.blockIds.includes(pond.blockId) || (a.pondIds || []).includes(pond.id),
  );
  const conflicts = [];
  for (let i = 0; i < affected.length; i++)
    conflicts.push(
      ...sopConflicts(
        affected[i].definition,
        affected.slice(i + 1).map((a) => a.definition),
      ),
    );
  return {
    affected: affected.map((a) => ({
      id: a.id,
      title: a.title,
      lifetime: a.lifetime,
    })),
    conflicts: [...new Set(conflicts)],
    pondName: pond.pondName || "Pond",
  };
}
async function stageGate(db, uid, companyId, targetId, stage) {
  const { company, user, manage } = await access(db, uid, companyId),
    ref = db.collection("companies").doc(companyId);
  const [ads, tasks, stageSnap, physical] = await Promise.all([
    ref.collection("sopAdoptions").where("status", "==", "active").get(),
    ref.collection("tasks").get(),
    ref.collection("sopStages").doc(targetId).get(),
    ref.collection("physicalPonds").doc(targetId).get(),
  ]);
  if (
    !manage &&
    company.businessSize === "enterprise" &&
    user.role === "technician"
  ) {
    const block = physical.data()?.blockId
      ? (
          await ref.collection("blocks").doc(physical.data().blockId).get()
        ).data()
      : null;
    if (block?.assignedTechnicianId !== uid)
      fail("permission-denied", "Pond is outside your assigned block.");
  }
  const activeId = physical.data()?.activePondId;
  const currentPond = activeId
    ? (await ref.collection("ponds").doc(activeId).get()).data()
    : null;
  const cycleId =
    currentPond?.pondCycleId || currentPond?.cycleId || activeId || "";
  const unmet = ads.docs.flatMap((ad) => {
    if (!(ad.data().targets || []).some((t) => t.id === targetId)) return [];
    return ad
      .data()
      .definition.steps.filter(
        (step) =>
          step.gateStage === stage &&
          !tasks.docs.some(
            (t) =>
              t.data().adoptionId === ad.id &&
              t.data().step?.id === step.id &&
              t.data().createdAt >=
                (stageSnap.data()?.changedAt || ad.data().activatedAt) &&
              (step.scope !== "pond" || t.data().target.cycleId === cycleId) &&
              t.data().target.id ===
                (step.scope === "pond"
                  ? targetId
                  : step.scope === "block"
                    ? physical.data()?.blockId
                    : "company") &&
              (t.data().result === "pass" || t.data().status === "waived"),
          ),
      )
      .map((step) => step.title);
  });
  const approved =
    stageSnap.data()?.stage === stage &&
    (stageSnap.data()?.actual === false || !!stageSnap.data()?.reason) &&
    stageSnap.data().changedAt > Date.now() - 86400000;
  return { allowed: !unmet.length || !!approved, unmet };
}
module.exports = { previewPondChange, stageGate };
