"use strict";
const {
  getPondTechnicianId,
} = require("../shared/orsonDomain/pondAssignments");
const {
  scheduledOccurrence,
  evaluateSopStep,
  farmDate,
  localInstant,
  validateSop,
} = require("../shared/orsonDomain/sop/engine");
const { hash, projectEvidence } = require("./evidence");
const { SOP_FIELDS } = require("../shared/orsonDomain/sop/registry");
const { currentEvidence } = require("./currentEvidence");
const { rows } = require("./service");
const {
  isSopDate,
  sopPondStage,
  obsoleteSopTaskReason,
} = require("../shared/orsonDomain/sop/lifecycle");
const { canWaitForTask } = require("./usagePolicy");
const PAGE_SIZE = 100;
const ACTIVE_STATUSES = ["open", "scheduled", "submitted", "needs_review"];
const documentId = () => require("firebase-admin/firestore").FieldPath.documentId();
const recordingOnly = (task) => task.purpose === "routine" && task.step?.check.field !== "manual" && task.step?.check.operator === "present" && task.step?.severity !== "critical";
const terminal = (task) => ["waived", "cancelled"].includes(task.status);
function isFullyValidManualOnly(definition) {
  try {
    return (
      !!definition &&
      Array.isArray(definition.steps) &&
      definition.steps.length > 0 &&
      validateSop(definition).length === 0 &&
      definition.steps.every((step) => step.check.field === "manual")
    );
  } catch {
    return false;
  }
}
function createSopRuntime(db) {
  const base = (id) => db.collection("companies").doc(id);
  function taskFrom(
    ad,
    step,
    target,
    key,
    start,
    due,
    purpose = "routine",
    issueId = "",
  ) {
    const assigneeId = step.assigneeId || target.assigneeId || ad.managerId;
    return {
      id: hash([ad.id, step.id, target.id, target.cycleId, key]),
      title:
        purpose === "routine"
          ? step.title
          : `${purpose === "corrective" ? "Corrective action" : "Recheck"}: ${step.title}`,
      instructions:
        purpose === "corrective"
          ? step.correctiveInstructions
          : step.instructions,
      status: "open",
      result: "insufficient_evidence",
      adoptionId: ad.id,
      versionId: ad.versionId,
      step,
      target,
      assigneeId,
      managerId: ad.managerId,
      visibleTo: [...new Set([assigneeId, ad.managerId])],
      windowStart: start,
      dueAt: due,
      createdAt: Date.now(),
      revision: 1,
      notes: "",
      attachments: [],
      issueId,
      purpose,
    };
  }
  function notify(tx, ref, task, key, title, recipients) {
    for (const recipientId of new Set(recipients)) {
      const nid = hash([task.id, key, recipientId]);
      tx.set(ref.collection("sopNotifications").doc(nid), {
        recipientId,
        title,
        message: "Open To-do to review the assigned farm work.",
        taskId: task.id,
        adoptionId: task.adoptionId,
        createdAt: Date.now(),
        severity: task.step?.severity || "low",
        read: false,
        pushStatus: "pending",
        nextAttemptAt: Date.now(),
      });
    }
  }
  async function createTask(companyId, task, now) {
    const ref = base(companyId);
    return db.runTransaction(async (tx) => {
      const tRef = ref.collection("tasks").doc(task.id),
        s = await tx.get(tRef);
      if (s.exists) return false;
      const adoption = await tx.get(
        ref.collection("sopAdoptions").doc(task.adoptionId),
      );
      if (
        !adoption.exists ||
        adoption.data().status !== "active" ||
        adoption.data().versionId !== task.versionId ||
        !adoption
          .data()
          .targets.some(
            (t) => t.id === task.target.id && t.scope === task.target.scope,
          )
      )
        return false;
      const obsolete = obsoleteSopTaskReason(task, task.target, farmDate(now, adoption.data().timeZone));
      if (obsolete) Object.assign(task, {
        status: "cancelled", cancellationReason: obsolete, cancelledAt: now,
        previousResult: task.result, result: "not_applicable",
      });
      tx.create(tRef, task);
      if (!obsolete) notify(tx, ref, task, "assigned", "Farm task assigned", [
        task.assigneeId,
      ]);
      tx.create(ref.collection("sopAudit").doc(hash([task.id, "created"])), {
        action: "taskCreated",
        taskId: task.id,
        at: Date.now(),
        actorId: "system",
      });
      return true;
    });
  }
  async function tickAdoption(companyId, adId, now = Date.now()) {
    const ref = base(companyId),
      adRef = ref.collection("sopAdoptions").doc(adId),
      snap = await adRef.get();
    if (!snap.exists || snap.data().status !== "active") return;
    const ad = { id: adId, ...snap.data() };
    let createdTasks = false;
    let pendingBaselineCursor = ad.baselineCursor || "";
    const assignments = await refreshAssignments(companyId);
    if (
      !isFullyValidManualOnly(ad.definition) &&
      (!ad.baselineReconciledAt || now - ad.baselineReconciledAt > 6 * 3600000)
    ) {
      const sources = new Set(["ponds"]);
      for (const step of ad.definition.steps) {
        const field = SOP_FIELDS.find((field) => field.key === step.check.field);
        if (field && field.key !== "manual")
          for (const source of field.sources || [field.source]) sources.add(source);
        if (step.check.field.startsWith("water.")) sources.add("waterObservations");
        if (step.trigger.event === "harvest") sources.add("harvestRecords");
      }
      if (validateSop(ad.definition).length)
        for (const kind of ["waterObservations", "feeds", "additives", "harvestRecords", "labReports", "assets"]) sources.add(kind);
      const kinds = [...sources];
      const savedCursor = ad.baselineCursor || {};
      let kind = kinds.includes(savedCursor.kind) ? savedCursor.kind : kinds[0];
      let cursor = savedCursor.kind === kind ? savedCursor.documentId || "" : "";
      let budget = PAGE_SIZE, baselineCursor = null;
      const pondOnly = ad.targets.length > 0 && ad.targets.every((target) => target.scope === "pond");
      while (kind && budget > 0) {
        let query = kind === "assets" ? db.collection("assets").where("companyId", "==", companyId) : ref.collection(kind);
        query = query.orderBy(documentId());
        if (cursor) query = query.startAfter(cursor);
        const page = await query.limit(budget).get();
        const filledPage = page.size === budget;
        budget -= page.size;
        for (const doc of page.docs) {
          const data = doc.data();
          if (pondOnly && kind === "ponds" && !ad.targets.some((target) =>
            target.pondId ? target.pondId === doc.id : target.id === (data.physicalPondId || data.previousCyclePondId || doc.id) && target.cycleId === (data.pondCycleId || data.cycleId || doc.id)
          )) continue;
          if (pondOnly && kind === "waterObservations" && !ad.targets.some((target) => target.id === (data.physicalPondId || data.pondId) && target.cycleId === data.cycleId)) continue;
          await project(companyId, kind, doc.id, data, `baseline-${ad.id}-${doc.id}`, doc.updateTime.toMillis());
        }
        if (filledPage) { baselineCursor = { kind, documentId: page.docs.at(-1).id }; break; }
        kind = kinds[kinds.indexOf(kind) + 1];
        cursor = "";
      }
      pendingBaselineCursor = baselineCursor;
      await adRef.update({ baselineCursor, ...(!baselineCursor ? { baselineReconciledAt: now } : {}) });
    }

    let taskQuery = ref.collection("tasks").where("adoptionId", "==", adId)
      .where("status", "in", ACTIVE_STATUSES).orderBy(documentId());
    if (ad.taskCursor) taskQuery = taskQuery.startAfter(ad.taskCursor);
    const [stageSnap, pondSnap, taskSnap, cycleSnap, blockSnap, companySnap] =
      await Promise.all([
        ref.collection("sopStages").get(),
        assignments?.productionPonds || ref.collection("ponds").get(),
        taskQuery.limit(PAGE_SIZE).get(),
        assignments?.cycles || ref.collection("cycles").get(),
        assignments?.blocks || ref.collection("blocks").get(),
        assignments?.company || ref.get(),
      ]);
    const knownTaskIds = new Set(taskSnap.docs.map((doc) => doc.id));
    const ensureTask = (task) => knownTaskIds.has(task.id)
      ? Promise.resolve(false) : createTask(companyId, task, now);
    const stages = rows(stageSnap),
      ponds = rows(pondSnap),
      tasks = rows(taskSnap);
    if (
      ad.lifetime === "cycle" &&
      (ad.cycleBindings || []).length &&
      !ad.cycleBindings.some((binding) =>
        ponds.some(
          (p) =>
            (p.physicalPondId || p.previousCyclePondId || p.id) ===
              binding.targetId &&
            (p.pondCycleId || p.cycleId || p.id) === binding.cycleId &&
            p.cycleStatus !== "ended",
        ),
      )
    ) {
      await adRef.update({
        status: taskSnap.size === PAGE_SIZE ? "active" : "retired",
        taskCursor: taskSnap.size === PAGE_SIZE ? taskSnap.docs.at(-1).id : "",
        nextDueAt: now,
        retiredAt: now,
        retirementReason: "Adopted production cycles ended",
      });
      for (const task of tasks)
        if (
          ["open", "scheduled", "submitted"].includes(task.status) &&
          task.purpose === "routine"
        )
          await ref.collection("tasks").doc(task.id).update({
            status: "cancelled",
            cancellationReason: "Production cycle ended",
            cancelledAt: now,
          });
      return;
    }
    if (ad.blockIds?.length || ad.pondIds?.length) {
      const { createSopService } = require("./service");
      const membership = await db.runTransaction(async (tx) =>
        createSopService(db).resolveTargets(
          tx,
          ref,
          { ...ad, adoptionId: ad.id },
          ad.definition,
          (await tx.get(ref)).data(),
          true,
          now,
        ),
      );
      const existingTargets = ad.targets;
      const candidates = membership.targets.filter(
        (t) =>
          ad.lifetime === "standing" ||
          !existingTargets.some((old) => old.id === t.id) ||
          existingTargets.some(
            (old) => old.id === t.id && old.cycleId === t.cycleId,
          ),
      );
      const nextTargets = membership.conflicts.length
        ? candidates.filter((t) =>
            existingTargets.some(
              (old) => old.id === t.id && old.scope === t.scope,
            ),
          )
        : candidates;
      const signature = (items) =>
        JSON.stringify(
          items
            .map((t) => [
              t.id,
              t.scope,
              t.blockId,
              t.cycleId,
              t.pondId,
              t.assigneeId,
              t.stage,
              t.stockingDate,
              t.plannedStockingDate || "",
            ])
            .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
        );
      if (
        signature(nextTargets) !== signature(existingTargets) ||
        JSON.stringify(membership.conflicts) !==
          JSON.stringify(ad.membershipConflicts || [])
      ) {
        const applied = await db.runTransaction(async (tx) => {
          const current = await tx.get(adRef);
          if (current.data()?.revision !== ad.revision) return false;
          const revision = ad.revision + 1;
          tx.update(adRef, {
            targets: nextTargets,
            membershipConflicts: membership.conflicts,
            membershipChangedAt: now,
            revision,
          });
          tx.create(
            adRef.collection("membershipRevisions").doc(String(revision)),
            {
              at: now,
              actorId: "system",
              previousTargets: existingTargets,
              targets: nextTargets,
              conflicts: membership.conflicts,
            },
          );
          tx.create(
            ref
              .collection("sopAudit")
              .doc(hash([adId, "membership", revision])),
            {
              action: "membershipReconciled",
              adoptionId: adId,
              revision,
              at: now,
              actorId: "system",
            },
          );
          return true;
        });
        if (!applied) return;
        ad.revision += 1;
      }
      ad.targets = nextTargets;
    }
    const targets = ad.targets
      .map((target) => {
        if (target.scope !== "pond") return target;
        const active = ponds.find(
          (p) =>
            (p.physicalPondId || p.previousCyclePondId || p.id) === target.id &&
            p.cycleStatus !== "ended",
        );
        if (
          ad.lifetime === "cycle" &&
          (!active ||
            (active.pondCycleId || active.cycleId || active.id) !==
              target.cycleId)
        )
          return null;
        return {
          ...target,
          assigneeId:
            getPondTechnicianId(
              active || { id: target.id, blockId: target.blockId },
              {
                businessSize: companySnap.data()?.businessSize,
                blocks: rows(blockSnap),
                cycles: rows(cycleSnap),
              },
            ) || ad.managerId,
          pondId: active?.id || "",
          cycleId: active?.pondCycleId || active?.cycleId || active?.id || "",
          stockingDate: active?.docStart || "",
          stage: sopPondStage(
            active,
            stages.find((s) => s.id === target.id)?.stage,
            farmDate(now, ad.timeZone),
          ),
        };
      })
      .filter(Boolean);
    const stageStart = (target) => {
      const saved = stages.find((s) => s.id === target.id);
      if (saved?.stage === target.stage)
        return saved.changedAt || ad.activatedAt;
      const stockingDate = target.stockingDate?.slice(0, 10);
      if (
        target.pondId &&
        isSopDate(stockingDate) &&
        ["stocking", "growout"].includes(target.stage)
      ) {
        const date =
          target.stage === "growout"
            ? new Date(Date.parse(`${stockingDate}T00:00:00Z`) + 86400000)
                .toISOString()
                .slice(0, 10)
            : stockingDate;
        return Math.max(
          ad.activatedAt,
          localInstant(date, "00:00", ad.timeZone),
        );
      }
      return saved?.changedAt || ad.activatedAt;
    };
    const stageContexts = (target) => {
      if (target.scope === "pond")
        return [
          {
            ...target,
            stageEnteredAt: stageStart(target),
          },
        ];
      const members = targets.filter(
        (t) =>
          t.scope === "pond" &&
          (target.scope === "company" || t.blockId === target.id),
      );
      if (!members.length)
        for (const p of ponds.filter(
          (p) =>
            p.cycleStatus !== "ended" &&
            (target.scope === "company" || p.blockId === target.id),
        )) {
          const physicalId = p.physicalPondId || p.previousCyclePondId || p.id;
          members.push({
            id: physicalId,
            stage: sopPondStage(
              p,
              stages.find((s) => s.id === physicalId)?.stage,
              farmDate(now, ad.timeZone),
            ),
            pondId: p.id,
            stockingDate: p.docStart || "",
          });
        }
      const phases = [...new Set(members.map((t) => t.stage))];
      if (!phases.length) phases.push("preparation");
      return phases.map((stage) => ({
        ...target,
        stage,
        stageEnteredAt: Math.max(
          ad.activatedAt,
          ...members.filter((t) => t.stage === stage).map((t) => stageStart(t)),
        ),
      }));
    };
    const contexts = targets.flatMap(stageContexts);
    for (const task of tasks) {
      const matching = contexts.filter(
        (t) => t.id === task.target.id && t.scope === task.target.scope,
      );
      const target =
        matching.find((t) => task.step?.stages.includes(t.stage)) ||
        matching[0];
      const reason = obsoleteSopTaskReason(
        task,
        target,
        farmDate(now, ad.timeZone),
      );
      if (!reason) continue;
      await db.runTransaction(async (tx) => {
        const taskRef = ref.collection("tasks").doc(task.id);
        const current = await tx.get(taskRef);
        const currentAd = await tx.get(adRef);
        if (
          !current.exists ||
          currentAd.data()?.status !== "active" ||
          currentAd.data()?.revision !== ad.revision ||
          current.data().revision !== task.revision ||
          obsoleteSopTaskReason(
            current.data(),
            target,
            farmDate(now, ad.timeZone),
          ) !== reason
        )
          return;
        // A concurrent transition or plan edit must be reconsidered next tick.
        if (target?.scope === "pond") {
          const physical = await tx.get(
            ref.collection("physicalPonds").doc(target.id),
          );
          const stage = await tx.get(
            ref.collection("sopStages").doc(target.id),
          );
          const pond = target.pondId
            ? await tx.get(ref.collection("ponds").doc(target.pondId))
            : null;
          if (
            (physical.data()?.plannedStockingDate || "") !==
              (target.plannedStockingDate || "") ||
            (physical.data()?.activePondId && physical.data().activePondId !== target.pondId) ||
            sopPondStage(
              pond?.exists && pond.data().cycleStatus !== "ended"
                ? pond.data()
                : null,
              stage.data()?.stage,
              farmDate(now, ad.timeZone),
            ) !== target.stage
          )
            return;
        }
        tx.update(taskRef, {
          status: "cancelled",
          cancellationReason: reason,
          cancelledAt: now,
          revision: task.revision + 1,
          previousResult: current.data().result,
          result: "not_applicable",
        });
        tx.create(
          ref
            .collection("sopAudit")
            .doc(hash([task.id, "lifecycle", task.revision])),
          {
            action: "cancelObsoleteTask",
            taskId: task.id,
            adoptionId: ad.id,
            reason,
            at: now,
            actorId: "scheduler",
          },
        );
      });
    }
    // A bounded catch-up page leaves a cursor due immediately until every missed date is covered.
    const fromDate = farmDate(
      ad.scheduleCursorAt || ad.activatedAt,
      ad.timeZone,
    );
    const today = farmDate(now, ad.timeZone);
    const dates = [];
    let date = fromDate;
    while (date <= today && dates.length < 31) {
      dates.push(date);
      date = new Date(Date.parse(date + "T00:00Z") + 86400000)
        .toISOString()
        .slice(0, 10);
    }
    const caughtUp = date > today;
    for (const physicalTarget of targets)
      for (const target of stageContexts(physicalTarget))
        for (const step of ad.definition.steps) {
          if (step.scope !== target.scope) continue;
          let occurrence = scheduledOccurrence(
            step,
            target,
            now,
            ad.activatedAt,
            ad.timeZone,
          );
          if (
            step.stages.includes(target.stage) &&
            step.trigger.kind === "manual"
          )
            occurrence = {
              key: `manual-${target.stage}-${target.stageEnteredAt}`,
              start: target.stageEnteredAt,
              due: target.stageEnteredAt + step.trigger.windowMinutes * 60000,
            };
          if (
            step.stages.includes(target.stage) &&
            step.trigger.kind === "stage" &&
            (!step.trigger.event || step.trigger.event === target.stage)
          ) {
            const changed = target.stageEnteredAt;
            occurrence = {
              key: `stage-${target.stage}-${changed}`,
              start: changed + step.trigger.offsetMinutes * 60000,
              due:
                changed +
                (step.trigger.offsetMinutes + step.trigger.windowMinutes) *
                  60000,
            };
          }
          if (
            step.stages.includes(target.stage) &&
            step.trigger.kind === "event"
          ) {
            const eventTargets =
              target.scope === "pond"
                ? [target.id]
                : [
                    ...new Set([
                      target.id,
                      ...ponds
                        .filter(
                          (p) =>
                            p.cycleStatus !== "ended" &&
                            (target.scope === "company" ||
                              p.blockId === target.id),
                        )
                        .map(
                          (p) =>
                            p.physicalPondId || p.previousCyclePondId || p.id,
                        ),
                    ]),
                  ];
            const eventPages = await Promise.all(
              eventTargets.map((targetId) =>
                ref
                  .collection("sopEvents")
                  .where("targetId", "==", targetId)
                  .where("event", "==", step.trigger.event)
                  .where(
                    "at",
                    ">=",
                    Math.max(ad.activatedAt, ad.rulesEffectiveAt || 0),
                  )
                  .get(),
              ),
            );
            for (const e of eventPages.flatMap((page) => page.docs)) {
              if (e.data().evidenceId) {
                const evidence = await ref
                  .collection("sopEvidence")
                  .doc(e.data().evidenceId)
                  .get();
                if (
                  !evidence.exists ||
                  evidence.data().deleted ||
                  evidence.data().revision !== e.data().sourceRevision ||
                  !(await db.runTransaction((tx) =>
                    currentEvidence(tx, ref, [evidence.data()]),
                  ))
                )
                  continue;
              }
              const start = e.data().at + step.trigger.offsetMinutes * 60000;
              if (
                e.data().taskId &&
                !await ref.collection("tasks").doc(e.data().taskId).get().then((snap) =>
                  snap.exists && snap.data().result === "pass" &&
                  snap.data().evaluationId === e.data().evaluationId
                )
              )
                continue;
              if (
                start <= now &&
                (target.scope === "pond"
                  ? e.data().cycleId === target.cycleId
                  : !e.data().cycleId ||
                    ponds.some(
                      (p) =>
                        p.cycleStatus !== "ended" &&
                        (p.physicalPondId || p.previousCyclePondId || p.id) ===
                          e.data().targetId &&
                        (p.pondCycleId || p.cycleId || p.id) ===
                          e.data().cycleId,
                    ))
              )
                createdTasks = (await ensureTask(
                  taskFrom(
                    ad,
                    step,
                    target,
                    `event-${e.id}`,
                    start,
                    start + step.trigger.windowMinutes * 60000,
                  ),
                )) || createdTasks;
            }
          }
          const occurrences = ["daily", "weekly", "doc"].includes(
            step.trigger.kind,
          )
            ? dates
                .map((date) =>
                  scheduledOccurrence(
                    step,
                    target,
                    Math.min(now, localInstant(date, "23:59", ad.timeZone)),
                    Math.max(
                      ad.rulesEffectiveAt || ad.activatedAt,
                      target.stageEnteredAt,
                    ),
                    ad.timeZone,
                  ),
                )
                .filter(Boolean)
            : occurrence
              ? [occurrence]
              : [];
          if (
            ad.definition.steps.some(
              (s) => s.onPass.includes(step.id) || s.onFail.includes(step.id),
            )
          )
            continue;
          for (const due of occurrences) {
            if (
              step.dependsOn.length &&
              !(await Promise.all(step.dependsOn.map(async (id) => {
                const passed = await ref.collection("tasks")
                  .where("adoptionId", "==", adId).where("step.id", "==", id)
                  .where("target.id", "==", target.id).where("target.cycleId", "==", target.cycleId)
                  .where("result", "==", "pass").where("windowStart", ">=", target.stageEnteredAt)
                  .where("windowStart", "<=", due.start).limit(1).get();
                return !passed.empty;
              }))).every(Boolean)
            )
              continue;
            createdTasks = (await ensureTask(
              taskFrom(ad, step, target, due.key, due.start, due.due),
            )) || createdTasks;
          }
        }
    await require("./taskQueue").evaluateTaskPage(
      tasks.filter((task) => !terminal(task) && !canWaitForTask(task, ad, now)),
      (task) => evaluateTask(companyId, task.id, now, { scheduler: true }),
    );
    const gates = await ref
      .collection("sopGates")
      .where("adoptionIds", "array-contains", adId)
      .get();
    for (const gate of gates.docs) {
      const data = gate.data(),
        entry =
          stages.find((s) => s.id === data.targetId)?.changedAt ||
          ad.activatedAt;
      const allowed =
        (data.approvedAt > now - 86400000 &&
          stages.find((s) => s.id === data.targetId)?.stage === data.stage) ||
        (await Promise.all(data.required.map(async (r) => {
          const query = ref.collection("tasks").where("adoptionId", "==", r.adoptionId)
            .where("step.id", "==", r.stepId).where("target.id", "==", r.targetId || data.targetId)
            .where("createdAt", ">=", entry);
          const [passed, waived] = await Promise.all([
            query.where("result", "==", "pass").limit(1).get(),
            query.where("status", "==", "waived").limit(1).get(),
          ]);
          return !passed.empty || !waived.empty;
        }))).every(Boolean);
      if (data.allowed !== allowed)
        await gate.ref.update({ allowed, updatedAt: now });
    }
    await db.runTransaction(async (tx) => {
      const current = await tx.get(adRef);
      if (current.exists && current.data().revision === ad.revision)
        tx.update(adRef, {
          // A source event arriving during this tick must retain its immediate wake-up.
          ...(current.data().wakeRevision === ad.wakeRevision ? {
            nextDueAt: require("./usagePolicy").nextSopCheckAt(ad, now, {
              caughtUp, createdTasks,
              moreTasks: taskSnap.size === PAGE_SIZE,
              baselinePending: !!pendingBaselineCursor,
            }),
          } : {}),
          taskCursor: taskSnap.size === PAGE_SIZE ? taskSnap.docs.at(-1).id : "",
          scheduleCursorAt: caughtUp
            ? now
            : localInstant(date, "00:00", ad.timeZone),
          targets,
        });
    });
  }
  async function evaluateTask(companyId, taskId, now = Date.now(), options = {}) {
    const ref = base(companyId),
      taskRef = ref.collection("tasks").doc(taskId);
    return db.runTransaction(async (transaction) => {
      let changed = false, idleCache = null;
      const tx = { get: transaction.get.bind(transaction) };
      for (const method of ["create", "set", "update"])
        tx[method] = (...args) => { changed = true; return transaction[method](...args); };
      const result = await (async () => {
      const s = await tx.get(taskRef);
      if (!s.exists) return;
      const task = { id: s.id, ...s.data() };
      if (terminal(task) || !task.step) return;
      const adSnap = await tx.get(
        ref.collection("sopAdoptions").doc(task.adoptionId),
      );
      if (adSnap.data()?.status === "paused") return false;
      if (!adSnap.exists || adSnap.data().status !== "active") return;
      const ad = { id: adSnap.id, ...adSnap.data() };
      // Unchanged waiting tasks can sleep until their next time boundary.
      // Automatic checks also require the adoption's source wake revision to match.
      if (canWaitForTask(task, ad, now)) return;
      // An action acknowledgment does not use measured evidence. Read adoption
      // first so paused work still defers source reconciliation correctly.
      if (task.purpose === "corrective") {
        if (task.status === "submitted")
          tx.update(taskRef, {
            status:
              task.requiresHumanReview ||
              task.step.requireAttachment ||
              task.attachments?.some((a) => a.contentType?.startsWith("image/"))
                ? "needs_review"
                : "completed",
            result: "needs_review",
            actionRecordedAt: now,
          });
        return;
      }
      let evidenceStart = task.windowStart, evidenceEnd = task.dueAt;
      if (recordingOnly(task) && ["daily", "weekly", "doc"].includes(task.step.trigger.kind)) {
        const date = farmDate(task.windowStart, ad.timeZone);
        const nextDate = new Date(Date.parse(date + "T00:00Z") + 86400000).toISOString().slice(0, 10);
        evidenceStart = localInstant(date, "00:00", ad.timeZone);
        evidenceEnd = localInstant(nextDate, "00:00", ad.timeZone) - 1;
      }
      const episodeKey = hash([
        task.adoptionId,
        task.step.id,
        task.target.id,
        task.target.cycleId,
      ]);
      const pointerRef = ref.collection("sopIssuePointers").doc(episodeKey),
        pointer = await tx.get(pointerRef);
      let issueRef = ref
        .collection("sopIssues")
        .doc(
          task.issueId ||
            pointer.data()?.issueId ||
            hash([episodeKey, task.id]),
        );
      let issueSnap = await tx.get(issueRef),
        issue = issueSnap.exists ? issueSnap.data() : null;
      const initialActionSnap = issue && !["closed", "exempted"].includes(issue.status) && issue.correctiveTaskId
        ? await tx.get(ref.collection("tasks").doc(issue.correctiveTaskId)) : null;
      // Only expired, noncritical issue checks can reuse a settled result. Read
      // related state transactionally first; commands need no special cache API.
      const canCache = options.scheduler && now > evidenceEnd && now > task.dueAt && task.step.severity !== "critical" &&
        issue && !["closed", "exempted"].includes(issue.status) &&
        !task.step.onPass?.length && !task.step.onFail?.length &&
        !(issue.nextEscalationAt <= now);
      let cacheKey;
      if (canCache) {
        const withoutCache = (data) => {
          if (!data) return null;
          const { schedulerEvaluationCache, ...rest } = data;
          return rest;
        };
        cacheKey = hash([withoutCache(task), ad.revision || 0, ad.wakeRevision || 0,
          ad.timeZone, pointer.data() || null, issue, withoutCache(initialActionSnap?.data())]);
        if (task.schedulerEvaluationCache?.key === cacheKey && task.schedulerEvaluationCache.until > now) return;
      }
      const evidenceSnap = await require("./evidenceQuery").taskEvidence(
        tx, ref, task, ad.timeZone, evidenceStart, evidenceEnd, now,
      );
      let evaluation = evaluateSopStep(task.step, rows(evidenceSnap), {
        target: task.target,
        start: evidenceStart,
        end: evidenceEnd,
        now: Math.min(now, evidenceEnd),
        timeZone: ad.timeZone,
      });
      let sourcePending = false;
      if (task.step.check.field !== "manual") {
        const referenced = rows(evidenceSnap).filter((e) =>
          evaluation.evidenceIds.includes(`${e.id}:${e.revision}`),
        );
        if (
          referenced.length &&
          !(await require("./currentEvidence").currentEvidence(
            tx,
            ref,
            referenced,
          ))
        ) {
          sourcePending = true;
          evaluation = {
            result: "needs_review",
            recorded: false,
            evidenceIds: evaluation.evidenceIds,
            explanation:
              "A source record changed; server verification is pending.",
          };
        }
      }
      if (task.step.check.field === "manual") {
        const reviewed = ["pass", "fail", "not_applicable"].includes(
          task.result,
        );
        const submitted =
          !!task.submittedAt &&
          (!task.step.requireNotes || !!task.notes?.trim()) &&
          (!task.step.requireAttachment || !!task.attachments?.length);
        evaluation = {
          result: reviewed
            ? task.result
            : submitted
              ? "needs_review"
              : "insufficient_evidence",
          recorded: reviewed || submitted,
          evidenceIds:
            submitted || reviewed
              ? [task.submissionId || `review:${task.id}:${task.revision}`]
              : [],
          explanation: "Reviewed written evidence.",
        };
      }
      if (cacheKey && !sourcePending && !evaluation.recorded)
        // A paginated routine sweep can exceed 30 minutes. Keep the settled
        // result until its alert deadline, with a six-hour repair ceiling.
        idleCache = { key: cacheKey, until: Math.min(now + 6 * 3600000, issue.nextEscalationAt || Infinity) };
      const decisionId = hash([
        task.id,
        task.versionId,
        task.evidenceRevision || 0,
        evaluation.result,
        evaluation.evidenceIds,
      ]);
      const previous = await tx.get(
        ref.collection("sopEvaluations").doc(decisionId),
      );
      const overdue =
        !sourcePending && now > task.dueAt && !evaluation.recorded;
      const shouldFail = evaluation.result === "fail" || (overdue && !recordingOnly(task));
      if (issue?.status === "closed" && !task.issueId && shouldFail) {
        issueRef = ref.collection("sopIssues").doc(hash([episodeKey, task.id]));
        issueSnap = await tx.get(issueRef);
        issue = issueSnap.exists ? issueSnap.data() : null;
      }
      if (
        issue?.status === "closed" &&
        task.issueId &&
        taskId !== issue.recoveryTaskId &&
        previous.exists
      )
        return;
      const activeIssue =
        issue && !["closed", "exempted"].includes(issue.status);
      let corrective = null,
        recheck = null;
      if (shouldFail && !activeIssue) {
        corrective = taskFrom(
          ad,
          task.step,
          task.target,
          `action-${issueRef.id}`,
          now,
          now + task.step.escalationMinutes * 60000,
          "corrective",
          issueRef.id,
        );
        recheck = taskFrom(
          ad,
          task.step,
          task.target,
          `recheck-${issueRef.id}-1`,
          now + task.step.recheckMinutes * 60000,
          now +
            (task.step.recheckMinutes + task.step.trigger.windowMinutes) *
              60000,
          "recheck",
          issueRef.id,
        );
      }
      let nextRecheck = null;
      if (
        activeIssue &&
        task.purpose === "recheck" &&
        shouldFail &&
        (issue.rechecks || 1) < task.step.maxRechecks &&
        issue.lastFailedTaskId !== taskId
      ) {
        nextRecheck = taskFrom(
          ad,
          task.step,
          task.target,
          `recheck-${issueRef.id}-${(issue.rechecks || 1) + 1}`,
          now + task.step.recheckMinutes * 60000,
          now +
            (task.step.recheckMinutes + task.step.trigger.windowMinutes) *
              60000,
          "recheck",
          issueRef.id,
        );
      }
      const branchSteps = (
        evaluation.result === "pass"
          ? task.step.onPass
          : shouldFail
            ? task.step.onFail
            : []
      )
        .map((id) => ad.definition.steps.find((s) => s.id === id))
        .filter(Boolean);
      const branches = branchSteps.map((step) =>
        taskFrom(
          ad,
          step,
          task.target,
          `branch-${taskId}-${step.id}`,
          now,
          now + step.trigger.windowMinutes * 60000,
        ),
      );
      const branchExisting = await Promise.all(
        branches.map((t) => tx.get(ref.collection("tasks").doc(t.id))),
      );
      const actionSnap =
        activeIssue && issue.correctiveTaskId
          ? initialActionSnap?.id === issue.correctiveTaskId ? initialActionSnap
            : await tx.get(ref.collection("tasks").doc(issue.correctiveTaskId))
          : null;
      const actionDone = actionSnap?.data()?.status === "completed";
      const actionTime = actionSnap?.data()?.evidenceObservedAt;
      const recoveryReadings = rows(evidenceSnap).filter((e) =>
        evaluation.evidenceIds.includes(`${e.id}:${e.revision}`),
      );
      const latestRecoveryTime = Math.max(
        0,
        ...recoveryReadings.map(
          (e) =>
            e.observedAt ??
            (e.date ? localInstant(e.date, "00:00", ad.timeZone) : 0),
        ),
      );
      const sequenceVerified =
        Number.isFinite(actionTime) && latestRecoveryTime > actionTime;
      const canRecover =
        activeIssue &&
        task.purpose === "recheck" &&
        evaluation.result === "pass" &&
        evaluation.evidenceIds.length &&
        task.windowStart > issue.openedAt;
      if (!previous.exists) {
        if (evaluation.result === "pass")
          tx.set(
            ref
              .collection("sopEvents")
              .doc(hash([task.id, decisionId, "completed"])),
            {
              event: `step:${task.step.id}`,
              targetId: task.target.id,
              cycleId: task.target.cycleId,
              at: now,
              taskId: task.id,
              evaluationId: decisionId,
            },
          );
        tx.create(ref.collection("sopEvaluations").doc(decisionId), {
          ...evaluation,
          taskId,
          versionId: task.versionId,
          at: now,
          target: task.target,
          visibleTo: task.visibleTo,
        });
        tx.create(ref.collection("sopAudit").doc(decisionId), {
          action: "evaluation",
          taskId,
          at: now,
          result: evaluation.result,
          evidenceIds: evaluation.evidenceIds,
        });
      }
      const inputEmpty = !evaluation.recorded && !evaluation.evidenceIds.length &&
        evaluation.result === "insufficient_evidence" && !activeIssue && !shouldFail && !sourcePending;
      let nextEvaluationAt = 0;
      if (task.purpose === "routine" && !task.submittedAt && inputEmpty) {
        const deadline = recordingOnly(task) ? Math.max(task.dueAt + 1, evidenceEnd + 1) : task.dueAt + 1;
        nextEvaluationAt = deadline > now ? deadline : recordingOnly(task) ? Number.MAX_SAFE_INTEGER : 0;
        // A future-dated observation can become eligible without another source write.
        for (const evidence of rows(evidenceSnap)) {
          const time = Number.isFinite(evidence.observedAt) ? evidence.observedAt :
            isSopDate(evidence.date) ? localInstant(evidence.date, "00:00", ad.timeZone) : 0;
          if (time > now && time >= evidenceStart && time <= evidenceEnd)
            nextEvaluationAt = Math.min(nextEvaluationAt || time, time);
        }
      }
      if (!previous.exists || task.evaluationId !== decisionId || task.result !== evaluation.result ||
          task.evaluatedTaskRevision !== task.revision || task.evaluatedAdoptionRevision !== (ad.revision || 0) ||
          task.evaluatedWakeRevision !== (ad.wakeRevision || 0) || task.nextEvaluationAt !== nextEvaluationAt)
        tx.update(taskRef, {
          result: evaluation.result,
          status:
            sourcePending || task.requiresHumanReview
              ? "needs_review"
              : evaluation.recorded
                ? evaluation.result === "needs_review"
                  ? "needs_review"
                  : "completed"
                : task.status === "completed"
                  ? "open"
                  : task.status,
          revision: task.revision + 1,
          explanation: task.requiresHumanReview
            ? "Evidence was submitted against changed rules, assignment, or a previously closed critical issue. A manager must review it."
            : evaluation.explanation,
          evaluationId: decisionId,
          nextEvaluationAt,
          evaluationInputEmpty: inputEmpty,
          evaluatedWakeRevision: ad.wakeRevision || 0,
          evaluatedTaskRevision: task.revision + 1,
          evaluatedAdoptionRevision: ad.revision || 0,
        });

      if (corrective) {
        tx.create(issueRef, {
          updatedAt: now,
          id: issueRef.id,
          adoptionId: ad.id,
          stepId: task.step.id,
          title: task.step.title,
          target: task.target,
          status: "open",
          severity: task.step.severity,
          visibleTo: task.visibleTo,
          managerId: ad.managerId,
          openedAt: now,
          recoveryVerified: false,
          rechecks: 1,
          nextEscalationAt: now + task.step.escalationMinutes * 60000,
          correctiveTaskId: corrective.id,
          recheckTaskId: recheck.id,
          originalTaskId: taskId,
          originalCheck: task.step.check,
          versionId: task.versionId,
          initialEvaluationId: decisionId,
          initialEvidenceIds: evaluation.evidenceIds,
          failureExplanation: evaluation.explanation,
          lastFailedTaskId: taskId,
        });
        tx.set(pointerRef, { issueId: issueRef.id });
        tx.create(ref.collection("tasks").doc(corrective.id), corrective);
        tx.create(ref.collection("tasks").doc(recheck.id), recheck);
        tx.update(taskRef, { issueId: issueRef.id });
        notify(tx, ref, corrective, "issue", "SOP corrective action required", [
          corrective.assigneeId,
          ...(task.step.severity === "critical" ? ad.recipients : []),
        ]);
      }
      if (activeIssue && shouldFail && !previous.exists)
        tx.update(issueRef, {
          updatedAt: now,
          lastFailureAt: now,
          lastFailureTaskId: taskId,
          lastFailureEvaluationId: decisionId,
        });
      if (nextRecheck) {
        tx.create(ref.collection("tasks").doc(nextRecheck.id), nextRecheck);
        tx.update(issueRef, {
          updatedAt: now,
          rechecks: (issue.rechecks || 1) + 1,
          recheckTaskId: nextRecheck.id,
          lastFailedTaskId: taskId,
        });
      }
      if (
        canRecover &&
        (!issue.recoveryVerified ||
          issue.recoveryTaskId !== taskId ||
          (issue.status === "action_required" && actionDone))
      ) {
        const critical = issue.severity === "critical" || !sequenceVerified;
        tx.update(issueRef, {
          updatedAt: now,
          recoveryVerified: true,
          actionSequenceVerified: sequenceVerified,
          recoveryTaskId: taskId,
          status: !actionDone
            ? "action_required"
            : critical
              ? "closure_review"
              : "closed",
          ...(actionDone && !critical
            ? { closedAt: now, closedBy: "system" }
            : {}),
        });
        if (critical && actionDone) {
          tx.update(taskRef, { status: "needs_review" });
          notify(
            tx,
            ref,
            task,
            "signoff",
            "SOP recovery needs manager sign-off",
            [ad.managerId],
          );
        }
      }
      // Edits/retractions of evidence reopen a previously resolved episode.
      if (
        issue?.status === "closed" &&
        taskId === issue.recoveryTaskId &&
        evaluation.result !== "pass"
      ) {
        tx.update(issueRef, {
          updatedAt: now,
          status: "open",
          recoveryVerified: false,
          reopenedAt: now,
          nextEscalationAt: now,
        });
        notify(
          tx,
          ref,
          task,
          `reopened-${decisionId}`,
          "SOP recovery evidence changed",
          ad.recipients,
        );
      }
      if (
        activeIssue &&
        issue.nextEscalationAt <= now &&
        !["closed", "exempted"].includes(issue.status)
      ) {
        notify(
          tx,
          ref,
          task,
          `escalation-${issue.nextEscalationAt}`,
          "Unresolved SOP issue requires attention",
          ad.recipients,
        );
        tx.update(issueRef, {
          updatedAt: now,
          nextEscalationAt: now + task.step.escalationMinutes * 60000,
          lastEscalatedAt: now,
        });
      }
      for (let i = 0; i < branches.length; i++)
        if (!branchExisting[i].exists) {
          tx.create(ref.collection("tasks").doc(branches[i].id), branches[i]);
          notify(tx, ref, branches[i], "assigned", "SOP follow-up assigned", [
            branches[i].assigneeId,
          ]);
        }
      })();
      if (idleCache && !changed) transaction.update(taskRef, { schedulerEvaluationCache: idleCache });
      return result;
    });
  }
  async function refreshAssignments(companyId) {
    const ref = base(companyId),
      companySnapshot = await ref.get(),
      company = companySnapshot.data();
    if (!company) return;
    const stateRef = ref.collection("sopRuntimeState").doc("assignments");
    const state = (await stateRef.get()).data() || {};
    const pageQuery = (name, statuses, cursor) => {
      let query = ref.collection(name).where("status", "in", statuses).orderBy(documentId());
      if (cursor) query = query.startAfter(cursor);
      return query.limit(PAGE_SIZE).get();
    };
    const [physical, blocks, tasks, issues, users, productionPonds, cycles] = await Promise.all([
      ref.collection("physicalPonds").get(),
      ref.collection("blocks").get(),
      pageQuery("tasks", ACTIVE_STATUSES, state.taskCursor),
      pageQuery("sopIssues", ["open", "action_required", "closure_review"], state.issueCursor),
      Promise.all(
        [company.ownerId, ...(company.teamMembers || [])].map((uid) =>
          db.doc(`users/${uid}`).get(),
        ),
      ),
      ref.collection("ponds").get(),
      ref.collection("cycles").get(),
    ]);
    const ponds = rows(physical),
      blockRows = rows(blocks),
      productionRows = rows(productionPonds),
      cycleRows = rows(cycles),
      members = new Map(
        users
          .filter(
            (u) =>
              u.exists &&
              (u.id === company.ownerId || u.data().companyId === companyId),
          )
          .map((u) => [u.id, u.data()]),
      );
    for (const snapshot of [...tasks.docs, ...issues.docs]) {
      const data = snapshot.data(),
        target = { ...data.target };
      if (target.scope === "pond")
        target.blockId = ponds.find((p) => p.id === target.id)?.blockId || "";
      const block = blockRows.find((b) => b.id === target.blockId),
        managerUser = members.get(data.managerId),
        manager =
          managerUser &&
          !managerUser.founderAccessSuspended &&
          require("../shared/orsonDomain/sop/contracts").sopCanManage(
            managerUser.role,
            data.managerId,
            company.ownerId,
          )
            ? data.managerId
            : company.ownerId;
      const sourcePond = target.pondId
        ? productionRows.find((p) => p.id === target.pondId)
        : productionRows.find((p) => p.id === ponds.find((physical) => physical.id === target.id)?.activePondId);
      const assignedTechnician = target.scope === "pond"
        ? getPondTechnicianId(sourcePond || { id: target.id, blockId: target.blockId }, { businessSize: company.businessSize, blocks: blockRows, cycles: cycleRows })
        : block?.assignedTechnicianId;
      const candidate =
        snapshot.ref.parent.id === "tasks" && !data.step
          ? data.assigneeId || manager
          : data.step?.assigneeId || assignedTechnician || manager;
      const user = members.get(candidate),
        allowed =
          !!user &&
          !user.founderAccessSuspended &&
          (user.role !== "technician" || target.scope === "company" || assignedTechnician === candidate);
      const assignee = allowed ? candidate : manager,
        visibleTo = [...new Set([assignee, manager])];
      target.assigneeId = assignee;
      if (
        JSON.stringify(visibleTo) === JSON.stringify(data.visibleTo) &&
        (snapshot.ref.parent.id !== "tasks" || data.assigneeId === assignee) &&
        target.blockId === data.target.blockId &&
        target.assigneeId === data.target.assigneeId &&
        data.managerId === manager
      )
        continue;
      await db.runTransaction(async (tx) => {
        const latest = await tx.get(snapshot.ref);
        if (latest.data()?.revision !== data.revision || !latest.exists) return;
        const change = {
          target,
          managerId: manager,
          visibleTo,
          ...(snapshot.ref.parent.id === "tasks"
            ? { assigneeId: assignee, revision: (data.revision || 0) + 1 }
            : {}),
          assignmentUpdatedAt: Date.now(),
          ...(snapshot.ref.parent.id === "sopIssues" ? { updatedAt: Date.now() } : {}),
        };
        tx.update(snapshot.ref, change);
        tx.create(ref.collection("sopAudit").doc(), {
          action: "assignmentReconciled",
          subjectId: snapshot.id,
          previousVisibleTo: data.visibleTo,
          visibleTo,
          at: Date.now(),
          actorId: "system",
        });
      });
    }
    await stateRef.set({
      taskCursor: tasks.size === PAGE_SIZE ? tasks.docs.at(-1).id : "",
      issueCursor: issues.size === PAGE_SIZE ? issues.docs.at(-1).id : "",
      updatedAt: Date.now(),
    });
    return { company: companySnapshot, productionPonds, blocks, cycles };
  }
  async function project(
    companyId,
    kind,
    documentId,
    data,
    eventId,
    receivedAt = Date.now(),
  ) {
    const ref = base(companyId);
    if (
      (
        await ref
          .collection("sopAdoptions")
          .where("status", "==", "active")
          .limit(1)
          .get()
      ).empty
    )
      return;
    const sourcePath = `${kind}/${documentId}`,
      sourceRef = ref.collection("sopProjectionSources").doc(hash(sourcePath));
    const accepted = await db.runTransaction(async (tx) => {
      const cursor = await tx.get(sourceRef);
      if (cursor.data()?.sourceEventAt > receivedAt) return false;
      tx.set(sourceRef, { sourcePath, sourceEventAt: receivedAt, eventId });
      return true;
    });
    if (!accepted) return;
    if (!eventId.startsWith("baseline-") && ["ponds", "physicalPonds", "blocks", "cycles"].includes(kind))
      await refreshAssignments(companyId);
    if (kind === "cycles") return;
    const entries = projectEvidence(kind, documentId, data, receivedAt),
      current = await ref
        .collection("sopEvidence")
        .where("sourcePath", "==", sourcePath)
        .get();
    if (["labReports", "additives", "harvestRecords"].includes(kind)) {
      const ponds = rows(await ref.collection("ponds").get());
      for (const e of entries) {
        const p = ponds.find((p) => p.id === e.pondId);
        if (p) {
          e.targetId = p.physicalPondId || p.previousCyclePondId || p.id;
          e.cycleId = e.cycleId || p.pondCycleId || p.cycleId || p.id;
          e.revision = hash({
            ...e,
            revision: undefined,
            receivedAt: undefined,
          });
        }
      }
    }
    if (kind === "ponds" && data) {
      const physicalId =
        data.physicalPondId || data.previousCyclePondId || documentId;
      const prior = rows(current).find((e) => e.field === "lifecycle.status");
      if (
        (data.cycleStatus === "ended" && prior?.value !== "ended") ||
        (!prior && data.__sopCreated)
      ) {
        const stage =
          data.cycleStatus === "ended"
            ? "turnaround"
            : data.cycleStartMode === "midcycle"
              ? "growout"
              : "stocking";
        await db.runTransaction(async (tx) => {
          const stageRef = ref.collection("sopStages").doc(physicalId),
            existing = await tx.get(stageRef);
          if ((existing.data()?.changedAt || 0) > receivedAt) return;
          tx.set(stageRef, {
            stage,
            changedAt: receivedAt,
            changedBy: "recorded-operation",
            actual: true,
            reason: "Reconciled a committed production event.",
          });
        });
        await ref
          .collection("sopStageTransitions")
          .doc(hash([eventId, "actual-stage"]))
          .set({
            targetId: physicalId,
            stage,
            at: receivedAt,
            actorId: "recorded-operation",
            actual: true,
          });
      }
    }
    if (kind === "ponds") {
      const observations = await ref
        .collection("waterObservations")
        .where("pondId", "==", documentId)
        .get();
      const records = new Set((data?.samplings || []).map((r) => r.id));
      for (const observation of observations.docs)
        if (
          !records.has(observation.data().recordId) &&
          !observation.data().deleted
        )
          await observation.ref.update({
            deleted: true,
            deletionReason: "Parent water record removed",
          });
    }
    const nextIds = new Set(entries.map((e) => e.id));
    for (const e of entries) {
      let event = "";
      if (e.field.startsWith("water.")) event = "measurement";
      if (e.field === "harvest.biomass") event = "harvest";
      if (e.field === "treatment.quantity") event = "treatment";
      if (
        event &&
        rows(current).find((old) => old.id === e.id)?.revision !== e.revision
      ) {
        const eventRef = ref.collection("sopEvents").doc(hash([e.id, event]));
        await db.runTransaction(async (tx) => {
          const previous = await tx.get(eventRef);
          if ((previous.data()?.sourceEventAt || 0) <= receivedAt)
            tx.set(eventRef, {
              evidenceId: e.id,
              sourceEventAt: receivedAt,
              event,
              targetId: e.targetId,
              cycleId: e.cycleId,
              at: e.observedAt ?? receivedAt,
              timestampMeaning:
                e.observedAt === null ? "recorded-event" : "observed-event",
              sourceRevision: e.revision,
            });
        });
      }
    }
    if (
      kind === "ponds" &&
      data?.cycleStartedAt &&
      data.cycleStartMode !== "midcycle"
    ) {
      const at = Date.parse(data.cycleStartedAt),
        eventRef = ref
          .collection("sopEvents")
          .doc(hash([documentId, "stocking"]));
      if (Number.isFinite(at))
        await db.runTransaction(async (tx) => {
          if (!(await tx.get(eventRef)).exists)
            tx.create(eventRef, {
              event: "stocking",
              targetId:
                data.physicalPondId || data.previousCyclePondId || documentId,
              cycleId: data.pondCycleId || data.cycleId || documentId,
              at,
            });
        });
    }
    const changed = [
      ...entries,
      ...rows(current)
        .filter((e) => !nextIds.has(e.id) && !e.deleted)
        .map((e) => ({
          ...e,
          deleted: true,
          revision: hash([e.revision, eventId, "deleted"]),
          receivedAt,
        })),
    ];
    for (const e of changed)
      await db.runTransaction(async (tx) => {
        const liveRef = ref.collection("sopEvidence").doc(e.id),
          live = await tx.get(liveRef);
        const cursor = await tx.get(sourceRef);
        if (cursor.data()?.sourceEventAt > receivedAt) return;
        if (
          live.data()?.revision === e.revision ||
          live.data()?.sourceEventAt > receivedAt
        )
          return;
        const revisionRef = ref
            .collection("sopEvidenceRevisions")
            .doc(`${e.id}-${e.revision}`),
          revision = await tx.get(revisionRef);
        if (!revision.exists)
          tx.create(revisionRef, { ...e, sourceEventAt: receivedAt });
        tx.set(liveRef, { ...e, sourceEventAt: receivedAt });
      });
    for (const old of rows(current)) {
      if (!changed.some((entry) => entry.id === old.id && entry.revision !== old.revision)) continue;
      const job = ref.collection("sopReevaluationJobs").doc(hash([old.id, old.revision]));
      await db.runTransaction(async (tx) => {
        const existing = await tx.get(job);
        if (!existing.exists) tx.create(job, { status: "pending", evidenceKey: `${old.id}:${old.revision}`, cursor: "" });
      });
    }
    await reconcileSourceChanges(companyId);
    const ads = await ref
      .collection("sopAdoptions")
      .where("status", "==", "active")
      .get();
    for (const ad of ads.docs) await ad.ref.update({
      nextDueAt: Date.now(),
      wakeRevision: require("firebase-admin/firestore").FieldValue.increment(1),
    });
  }
  async function reconcileSourceChanges(companyId) {
    const ref = base(companyId);
    const stateRef = ref.collection("sopRuntimeState").doc("sourceJobs");
    const state = (await stateRef.get()).data() || {};
    let jobQuery = ref.collection("sopReevaluationJobs").where("status", "==", "pending").orderBy(documentId());
    if (state.cursor) jobQuery = jobQuery.startAfter(state.cursor);
    const jobs = await jobQuery.limit(10).get();
    for (const job of jobs.docs) {
      let query = ref.collection("sopEvaluations").where("evidenceIds", "array-contains", job.data().evidenceKey).orderBy(documentId());
      if (job.data().cursor) query = query.startAfter(job.data().cursor);
      const evaluations = await query.limit(PAGE_SIZE).get();
      let deferred = false;
      for (const taskId of new Set(evaluations.docs.map((doc) => doc.data().taskId))) {
        // A paused adoption must retain its invalidation until it resumes.
        if (await evaluateTask(companyId, taskId) === false) deferred = true;
      }
      await job.ref.update({
        cursor: deferred ? job.data().cursor : evaluations.size === PAGE_SIZE ? evaluations.docs.at(-1).id : "",
        status: deferred || evaluations.size === PAGE_SIZE ? "pending" : "done",
      });
    }
    // Rotation prevents a paused job from starving other adoptions' active work.
    await stateRef.set({ cursor: jobs.size === 10 ? jobs.docs.at(-1).id : "" });
  }
  async function scheduler() {
    const due = await db
      .collectionGroup("sopAdoptions")
      .where("status", "==", "active")
      .where("nextDueAt", "<=", Date.now())
      .orderBy("nextDueAt")
      .limit(100)
      .get();
    const failures = [];
    for (const ad of due.docs) {
      const companyId = ad.ref.parent.parent.id;
      try {
        await reconcileSourceChanges(companyId);
        await tickAdoption(companyId, ad.id);
      } catch (error) {
        failures.push({ companyId, adoptionId: ad.id, error: String(error) });
        await ad.ref.update({
          lastSchedulerError: String(error).slice(0, 1000),
          lastSchedulerErrorAt: Date.now(),
          nextDueAt: Date.now() + 300000,
        });
        console.error("[SOP scheduler]", companyId, ad.id, error);
      }
    }
    return { processed: due.size, failures };
  }
  return {
    taskFrom,
    createTask,
    tickAdoption,
    evaluateTask,
    project,
    scheduler,
    refreshAssignments,
  };
}
module.exports = { createSopRuntime, isFullyValidManualOnly };
