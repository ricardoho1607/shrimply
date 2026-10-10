"use strict";
const {
  scheduledOccurrence,
  evaluateSopStep,
  farmDate,
  localInstant,
  validateSop,
} = require("../shared/orsonDomain/sop/engine");
const { hash, projectEvidence } = require("./evidence");
const { currentEvidence } = require("./currentEvidence");
const { rows } = require("./service");
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
  async function createTask(companyId, task) {
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
      tx.create(tRef, task);
      notify(tx, ref, task, "assigned", "Farm task assigned", [
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
    if (
      !isFullyValidManualOnly(ad.definition) &&
      (!ad.baselineReconciledAt || now - ad.baselineReconciledAt > 6 * 3600000)
    ) {
      for (const kind of [
        "ponds",
        "waterObservations",
        "feeds",
        "additives",
        "harvestRecords",
        "labReports",
      ]) {
        const source = await ref.collection(kind).get();
        for (const doc of source.docs)
          await project(
            companyId,
            kind,
            doc.id,
            doc.data(),
            `baseline-${ad.id}-${doc.id}`,
            doc.updateTime.toMillis(),
          );
      }
      const assets = await db
        .collection("assets")
        .where("companyId", "==", companyId)
        .get();
      for (const doc of assets.docs)
        await project(
          companyId,
          "assets",
          doc.id,
          doc.data(),
          `baseline-${ad.id}-${doc.id}`,
          doc.updateTime.toMillis(),
        );
      await adRef.update({ baselineReconciledAt: now });
    }
    const [stageSnap, pondSnap, taskSnap] = await Promise.all([
      ref.collection("sopStages").get(),
      ref.collection("ponds").get(),
      ref.collection("tasks").where("adoptionId", "==", adId).get(),
    ]);
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
        status: "retired",
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
    if (ad.blockIds?.length) {
      const { createSopService } = require("./service");
      const membership = await db.runTransaction(async (tx) =>
        createSopService(db).resolveTargets(
          tx,
          ref,
          { ...ad, adoptionId: ad.id },
          ad.definition,
          (await tx.get(ref)).data(),
          true,
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
          pondId: active?.id || "",
          cycleId: active?.pondCycleId || active?.cycleId || active?.id || "",
          stockingDate: active?.docStart || "",
          stage:
            stages.find((s) => s.id === target.id)?.stage ||
            (active ? "growout" : "preparation"),
        };
      })
      .filter(Boolean);
    const stageContexts = (target) => {
      if (target.scope === "pond")
        return [
          {
            ...target,
            stageEnteredAt:
              stages.find((s) => s.id === target.id)?.changedAt ||
              ad.activatedAt,
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
            stage: stages.find((s) => s.id === physicalId)?.stage || "growout",
          });
        }
      const phases = [...new Set(members.map((t) => t.stage))];
      if (!phases.length) phases.push("preparation");
      return phases.map((stage) => ({
        ...target,
        stage,
        stageEnteredAt: Math.max(
          ad.activatedAt,
          ...members
            .filter((t) => t.stage === stage)
            .map(
              (t) =>
                stages.find((s) => s.id === t.id)?.changedAt || ad.activatedAt,
            ),
        ),
      }));
    };
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
                !tasks.some(
                  (t) =>
                    t.id === e.data().taskId &&
                    t.result === "pass" &&
                    t.evaluationId === e.data().evaluationId,
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
                await createTask(
                  companyId,
                  taskFrom(
                    ad,
                    step,
                    target,
                    `event-${e.id}`,
                    start,
                    start + step.trigger.windowMinutes * 60000,
                  ),
                );
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
              !step.dependsOn.every((id) =>
                tasks.some(
                  (t) =>
                    t.step?.id === id &&
                    t.target.id === target.id &&
                    t.target.cycleId === target.cycleId &&
                    t.result === "pass" &&
                    t.windowStart <= due.start &&
                    t.windowStart >= target.stageEnteredAt,
                ),
              )
            )
              continue;
            await createTask(
              companyId,
              taskFrom(ad, step, target, due.key, due.start, due.due),
            );
          }
        }
    const gates = await ref
      .collection("sopGates")
      .where("adoptionIds", "array-contains", adId)
      .get();
    const currentTasks = rows(await ref.collection("tasks").get());
    for (const gate of gates.docs) {
      const data = gate.data(),
        entry =
          stages.find((s) => s.id === data.targetId)?.changedAt ||
          ad.activatedAt;
      const allowed =
        (data.approvedAt > now - 86400000 &&
          stages.find((s) => s.id === data.targetId)?.stage === data.stage) ||
        data.required.every((r) =>
          currentTasks.some(
            (t) =>
              t.adoptionId === r.adoptionId &&
              t.step?.id === r.stepId &&
              t.target.id === (r.targetId || data.targetId) &&
              t.createdAt >= entry &&
              (t.result === "pass" || t.status === "waived"),
          ),
        );
      await gate.ref.update({ allowed, updatedAt: now });
    }
    for (const task of tasks) {
      if (!terminal(task)) await evaluateTask(companyId, task.id, now);
    }
    await db.runTransaction(async (tx) => {
      const current = await tx.get(adRef);
      if (current.exists && current.data().revision === ad.revision)
        tx.update(adRef, {
          nextDueAt: caughtUp ? now + 60000 : now,
          scheduleCursorAt: caughtUp
            ? now
            : localInstant(date, "00:00", ad.timeZone),
          targets,
        });
    });
  }
  async function evaluateTask(companyId, taskId, now = Date.now()) {
    const ref = base(companyId),
      taskRef = ref.collection("tasks").doc(taskId);
    await db.runTransaction(async (tx) => {
      const s = await tx.get(taskRef);
      if (!s.exists) return;
      const task = { id: s.id, ...s.data() };
      if (terminal(task) || !task.step) return;
      const adSnap = await tx.get(
        ref.collection("sopAdoptions").doc(task.adoptionId),
      );
      if (!adSnap.exists || adSnap.data().status !== "active") return;
      const ad = { id: adSnap.id, ...adSnap.data() };
      const evidenceSnap = await tx.get(
        ref
          .collection("sopEvidence")
          .where("targetId", "==", task.target.id)
          .where("field", "==", task.step.check.field),
      );
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
      let evaluation = evaluateSopStep(task.step, rows(evidenceSnap), {
        target: task.target,
        start: task.windowStart,
        end: task.dueAt,
        now: Math.min(now, task.dueAt),
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
      // Corrective actions are acknowledgments; recovery must come from a later recheck.
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
      const shouldFail = evaluation.result === "fail" || overdue;
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
          ? await tx.get(ref.collection("tasks").doc(issue.correctiveTaskId))
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
        });
      }
      if (corrective) {
        tx.create(issueRef, {
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
          lastFailureAt: now,
          lastFailureTaskId: taskId,
          lastFailureEvaluationId: decisionId,
        });
      if (nextRecheck) {
        tx.create(ref.collection("tasks").doc(nextRecheck.id), nextRecheck);
        tx.update(issueRef, {
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
    });
  }
  async function refreshAssignments(companyId) {
    const ref = base(companyId),
      company = (await ref.get()).data();
    if (!company) return;
    const [physical, blocks, tasks, issues, users] = await Promise.all([
      ref.collection("physicalPonds").get(),
      ref.collection("blocks").get(),
      ref.collection("tasks").get(),
      ref.collection("sopIssues").get(),
      Promise.all(
        [company.ownerId, ...(company.teamMembers || [])].map((uid) =>
          db.doc(`users/${uid}`).get(),
        ),
      ),
    ]);
    const ponds = rows(physical),
      blockRows = rows(blocks),
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
      const candidate =
        snapshot.ref.parent.id === "tasks" && !data.step
          ? data.assigneeId || manager
          : data.step?.assigneeId || block?.assignedTechnicianId || manager;
      const user = members.get(candidate),
        allowed =
          !!user &&
          !user.founderAccessSuspended &&
          (company.businessSize !== "enterprise" ||
            user.role !== "technician" ||
            target.scope === "company" ||
            block?.assignedTechnicianId === candidate);
      const assignee = allowed ? candidate : manager,
        visibleTo = [...new Set([assignee, manager])];
      if (
        JSON.stringify(visibleTo) === JSON.stringify(data.visibleTo) &&
        target.blockId === data.target.blockId &&
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
    if (["ponds", "physicalPonds", "blocks"].includes(kind))
      await refreshAssignments(companyId);
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
    const ads = await ref
      .collection("sopAdoptions")
      .where("status", "==", "active")
      .get();
    for (const ad of ads.docs) await ad.ref.update({ nextDueAt: Date.now() });
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
