"use strict";
const { HttpsError } = require("firebase-functions/v2/https");
const { assertCompanyMemberForCallable } = require("../shared/companyAccess");
const {
  SOP_ID,
  sopCanManage,
  SOP_STAGES,
} = require("../shared/orsonDomain/sop/contracts");
const {
  validateSop,
  sopConflicts,
  farmDate,
} = require("../shared/orsonDomain/sop/engine");
const { hash } = require("./evidence");
const fail = (code, message) => {
  throw new HttpsError(code, message);
};
const id = (value) => {
  if (typeof value !== "string" || !SOP_ID.test(value))
    fail("invalid-argument", "Invalid identifier.");
  return value;
};
const text = (value, max = 10000) => {
  if (typeof value !== "string" || value.length > max)
    fail("invalid-argument", "Invalid text.");
  return value;
};
const rows = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
function checkDefinition(value, draft = false) {
  if (value?.content !== undefined) {
    const { validateSopContent } = require("../shared/orsonDomain/sop/content");
    const invalid = validateSopContent(value.content).filter(
      (item) => !item.startsWith("Resolve omitted source content:"),
    );
    if (invalid.length) fail("invalid-argument", invalid.join("\n"));
    value = {
      ...value,
      content: {
        omissions: value.content.omissions,
        sections: value.content.sections.map((section) => ({
          id: section.id,
          title: section.title,
          body: section.body,
          sourcePages: section.sourcePages,
          tables: section.tables.map((table) => ({
            title: table.title,
            columns: table.columns,
            rows: table.rows.map((row) => ({ cells: row.cells })),
          })),
        })),
      },
    };
  }
  if (value && Array.isArray(value.steps)) {
    const { emptySopStep } = require("../shared/orsonDomain/sop/contracts");
    const shape = emptySopStep();
    value = {
      title: value.title,
      description: value.description,
      language: value.language,
      ...(value.content !== undefined ? { content: value.content } : {}),
      attachments: Array.isArray(value.attachments)
        ? value.attachments.map((a) => ({
            path: String(a.path || ""),
            name: String(a.name || ""),
            contentType: String(a.contentType || ""),
          }))
        : [],
      steps: value.steps.map((step) =>
        Object.fromEntries(
          Object.keys(shape).map((k) => [
            k,
            ["check", "trigger"].includes(k) &&
            step?.[k] &&
            typeof step[k] === "object"
              ? Object.fromEntries(
                  Object.keys(shape[k]).map((field) => [field, step[k][field]]),
                )
              : step?.[k],
          ]),
        ),
      ),
    };
  }
  let errors;
  try {
    errors = validateSop(value);
  } catch {
    errors = ["Invalid structured SOP fields."];
  }
  const blocking = draft
    ? errors.filter(
        (e) =>
          !/Set a farm-approved|Bind this check|Specify the inventory|Specify the analytical|Specify the required value|^Resolve omitted source content:/.test(
            e,
          ),
      )
    : errors;
  if (blocking.length) fail("invalid-argument", blocking.join("\n"));
  if (JSON.stringify(value).length > 250000)
    fail("invalid-argument", "SOP is too large.");
  return JSON.parse(JSON.stringify(value));
}
async function access(db, uid, companyId) {
  const company = await assertCompanyMemberForCallable(
    db,
    uid,
    companyId,
    "viewFarm",
  );
  const user = (await db.doc(`users/${uid}`).get()).data() || {};
  return {
    company,
    user,
    manage: sopCanManage(user.role, uid, company.ownerId),
  };
}
function createSopService(db, storage) {
  const base = (companyId) => db.collection("companies").doc(companyId);
  async function snapshot(uid, companyId) {
    const a = await access(db, uid, companyId),
      ref = base(companyId);
    const scoped = (name) =>
      a.manage
        ? ref.collection(name)
        : ref.collection(name).where("visibleTo", "array-contains", uid);
    const sets = await Promise.all([
      ref.collection("sops").limit(200).get(),
      ref.collection("sopAdoptions").limit(200).get(),
      scoped("tasks").orderBy("dueAt", "desc").limit(250).get(),
      scoped("sopIssues").orderBy("openedAt", "desc").limit(200).get(),
      ref.collection("blocks").get(),
      ref.collection("physicalPonds").get(),
      ref.collection("ponds").get(),
      db
        .collection("communitySops")
        .where("status", "==", "published")
        .limit(100)
        .get(),
      ref
        .collection("sopNotifications")
        .where("recipientId", "==", uid)
        .orderBy("createdAt", "desc")
        .limit(100)
        .get(),
    ]);
    const sourceSets = await Promise.all([
      ref.collection("feeds").get(),
      ref.collection("additives").get(),
      db.collection("assets").where("companyId", "==", companyId).get(),
    ]);
    const sources = sourceSets.flatMap((s, i) =>
      (i === 2 &&
      !require("../shared/permissions").hasUserPermission({
        company: { ...a.company, id: companyId },
        user: a.user,
        uid,
        permission: "viewAssets",
      })
        ? []
        : rows(s)
      ).map((item) => ({
        id: item.id,
        label:
          item.feedName ||
          item.additiveName ||
          item.assetName ||
          item.name ||
          item.id,
        source: ["feeds", "additives", "assets"][i],
        unit: item.unit || "",
      })),
    );
    const members = await Promise.all(
      [...new Set([a.company.ownerId, ...(a.company.teamMembers || [])])]
        .filter(Boolean)
        .map((uid) => db.doc(`users/${uid}`).get()),
    );
    const isScoped =
      a.user.role === "technician" &&
      a.company.businessSize === "enterprise" &&
      !a.manage;
    const blocks = rows(sets[4]).filter(
        (b) => !isScoped || b.assignedTechnicianId === uid,
      ),
      blockIds = new Set(blocks.map((b) => b.id));
    const ponds = rows(sets[6]).filter(
      (p) => !isScoped || blockIds.has(p.blockId),
    );
    let summary;
    if (a.manage) {
      const {
        localInstant,
        farmDate,
      } = require("../shared/orsonDomain/sop/engine");
      let zone = a.company.timeZone || "UTC";
      try {
        new Intl.DateTimeFormat("en", { timeZone: zone }).format();
      } catch {
        zone = "UTC";
      }
      const date = farmDate(Date.now(), zone),
        start = localInstant(date, "00:00", zone);
      const routine = ref
        .collection("tasks")
        .where("purpose", "==", "routine")
        .where("dueAt", ">=", start)
        .where(
          "dueAt",
          "<",
          localInstant(
            farmDate(Date.parse(date + "T00:00Z") + 86400000, "UTC"),
            "00:00",
            zone,
          ),
        );
      const specs = [
        routine.where("status", "==", "completed"),
        routine,
        routine.where("result", "==", "pass"),
        routine.where("result", "==", "fail"),
        routine.where("result", "==", "insufficient_evidence"),
        routine.where("status", "==", "waived"),
        ref
          .collection("sopIssues")
          .where("status", "in", ["open", "closure_review", "action_required"]),
      ];
      const totals = await Promise.all(specs.map((q) => q.count().get()));
      summary = {
        recorded: totals[0].data().count,
        total: totals[1].data().count,
        pass: totals[2].data().count,
        fail: totals[3].data().count,
        missing: totals[4].data().count,
        exempt: totals[5].data().count,
        issues: totals[6].data().count,
        period: date,
      };
    }
    return {
      sources,
      manage: a.manage,
      summary: summary || null,
      nextSopCursor: sets[0].size === 200 ? sets[0].docs.at(-1).id : "",
      nextAdoptionCursor: sets[1].size === 200 ? sets[1].docs.at(-1).id : "",
      nextCommunityCursor: sets[7].size === 100 ? sets[7].docs.at(-1).id : "",
      nextTaskCursor:
        sets[2].size === 250 ? sets[2].docs[sets[2].docs.length - 1].id : "",
      nextIssueCursor:
        sets[3].size === 200 ? sets[3].docs[sets[3].docs.length - 1].id : "",
      timeZone: a.company.timeZone || "",
      sops: rows(sets[0]),
      adoptions: rows(sets[1]).map((ad) =>
        a.manage
          ? ad
          : {
              ...ad,
              targets: (ad.targets || []).filter(
                (t) => t.assigneeId === uid || blockIds.has(t.blockId),
              ),
            },
      ),
      tasks: rows(sets[2]).filter(
        (t) =>
          !isScoped ||
          t.target?.scope === "company" ||
          blockIds.has(t.target?.blockId),
      ),
      issues: rows(sets[3]).filter(
        (t) =>
          !isScoped ||
          t.target?.scope === "company" ||
          blockIds.has(t.target?.blockId),
      ),
      blocks,
      physicalPonds: rows(sets[5]).filter(
        (p) => !isScoped || blockIds.has(p.blockId),
      ),
      ponds: ponds.map((p) => ({
        id: p.id,
        pondName: p.pondName,
        physicalPondId: p.physicalPondId || p.previousCyclePondId || p.id,
        blockId: p.blockId || "",
        cycleId: p.pondCycleId || p.cycleId || p.id,
        stockingDate: p.docStart || "",
        cycleStatus: p.cycleStatus || "active",
      })),
      community: rows(sets[7]),
      notifications: rows(sets[8]),
      members: members
        .filter((s) => s.exists)
        .map((s) => ({
          id: s.id,
          name: s.data().name || s.data().displayName || s.data().email || s.id,
          role: s.id === a.company.ownerId ? "owner" : s.data().role,
        })),
      truncated: sets[2].size === 250 || sets[3].size === 200,
    };
  }
  async function resolveTargets(
    tx,
    ref,
    input,
    definition,
    company,
    allowEmptyMembership = false,
  ) {
    const [physicalSnap, pondSnap, blockSnap, stageSnap, existingSnap] =
      await Promise.all(
        ["physicalPonds", "ponds", "blocks", "sopStages", "sopAdoptions"].map(
          (name) => tx.get(ref.collection(name)),
        ),
      );
    const physical = rows(physicalSnap).map((p) =>
        input.proposedPondIds?.includes(p.id)
          ? { ...p, blockId: input.proposedBlockId }
          : p,
      ),
      ponds = rows(pondSnap).map((p) =>
        input.proposedPondIds?.includes(
          p.physicalPondId || p.previousCyclePondId || p.id,
        )
          ? { ...p, blockId: input.proposedBlockId }
          : p,
      ),
      blocks = rows(blockSnap),
      stages = rows(stageSnap),
      existing = rows(existingSnap).filter(
        (a) => a.status === "active" && a.id !== input.adoptionId,
      );
    const blockIds = (input.blockIds || []).map(id),
      pondIds = (input.pondIds || []).map(id);
    for (const b of blockIds)
      if (!blocks.some((x) => x.id === b))
        fail("not-found", "Selected block no longer exists.");
    const selected = physical.filter(
      (p) => pondIds.includes(p.id) || blockIds.includes(p.blockId),
    );
    for (const p of ponds.filter((p) => p.cycleStatus !== "ended"))
      if (
        (pondIds.includes(p.id) ||
          pondIds.includes(p.physicalPondId || p.previousCyclePondId) ||
          blockIds.includes(p.blockId)) &&
        !selected.some(
          (x) => x.id === (p.physicalPondId || p.previousCyclePondId || p.id),
        )
      )
        selected.push({
          id: p.physicalPondId || p.previousCyclePondId || p.id,
          pondName: p.pondName,
          blockId: p.blockId,
        });
    for (const p of pondIds)
      if (
        !selected.some((x) => x.id === p) ||
        (!physical.some((x) => x.id === p) &&
          !ponds.some((x) =>
            [x.id, x.physicalPondId, x.previousCyclePondId].includes(p),
          ))
      )
        fail("not-found", "Selected pond no longer exists.");
    const managerId = id(input.managerId);
    const manager = (await tx.get(db.doc(`users/${managerId}`))).data();
    if (
      !manager ||
      !sopCanManage(manager.role, managerId, company.ownerId) ||
      (managerId !== company.ownerId &&
        (!(company.teamMembers || []).includes(managerId) ||
          manager.companyId !== ref.id))
    )
      fail(
        "invalid-argument",
        "Choose a current owner or manager as accountable manager.",
      );
    const targets = [];
    for (const p of selected) {
      const active = ponds.find(
        (x) =>
          (x.physicalPondId || x.previousCyclePondId || x.id) === p.id &&
          x.cycleStatus !== "ended",
      );
      if (input.lifetime === "cycle" && !active) {
        if (allowEmptyMembership) continue;
        fail(
          "failed-precondition",
          `${p.pondName || p.id} has no active cycle. Choose a standing procedure to include preparation ponds.`,
        );
      }
      const block = blocks.find((b) => b.id === p.blockId),
        stage =
          stages.find((s) => s.id === p.id)?.stage ||
          (active ? "growout" : "preparation");
      targets.push({
        id: p.id,
        scope: "pond",
        physicalPondId: p.id,
        pondId: active?.id || "",
        cycleId: active?.pondCycleId || active?.cycleId || active?.id || "",
        blockId: p.blockId || "",
        name: p.pondName || p.id,
        stage,
        stockingDate: active?.docStart || "",
        assigneeId: block?.assignedTechnicianId || managerId,
      });
    }
    if (definition.steps.some((s) => s.scope === "block"))
      for (const blockId of [
        ...new Set([
          ...blockIds,
          ...targets.map((t) => t.blockId).filter(Boolean),
        ]),
      ]) {
        const b = blocks.find((b) => b.id === blockId);
        targets.push({
          id: blockId,
          scope: "block",
          physicalPondId: "",
          pondId: "",
          cycleId: "",
          blockId,
          name: b?.name || blockId,
          stage: "growout",
          stockingDate: "",
          assigneeId: b?.assignedTechnicianId || managerId,
        });
      }
    if (
      input.companyScope ||
      definition.steps.some((s) => s.scope === "company")
    )
      targets.push({
        id: "company",
        scope: "company",
        physicalPondId: "",
        pondId: "",
        cycleId: "",
        blockId: "",
        name: company.companyName || company.name || "Company",
        stage: "growout",
        stockingDate: "",
        assigneeId: managerId,
      });
    for (const scope of allowEmptyMembership
      ? []
      : new Set(definition.steps.map((step) => step.scope)))
      if (!targets.some((target) => target.scope === scope))
        fail(
          "invalid-argument",
          `Select an applicable ${scope} scope for every step. No work can be silently skipped.`,
        );
    if (!targets.length && !allowEmptyMembership)
      fail(
        "invalid-argument",
        "Select an applicable pond, block, or company scope.",
      );
    if (targets.length > 200)
      fail(
        "resource-exhausted",
        "An adoption supports at most 200 targets; split it into separate blocks.",
      );
    const targetIds = new Set(targets.map((t) => t.id));
    const overlapping = existing.filter((a) =>
      (a.targets || []).some((t) => targetIds.has(t.id)),
    );
    return {
      targets,
      conflicts: sopConflicts(
        definition,
        overlapping.map((a) => a.definition),
      ),
      overlaps: overlapping.map((a) => ({ id: a.id, title: a.title })),
      managerId,
    };
  }
  async function command(uid, input) {
    const companyId = id(input.companyId),
      operationId = id(input.operationId),
      a = await access(db, uid, companyId),
      ref = base(companyId),
      now = Date.now();
    // Read-only feature negotiation on the same endpoint that will save the
    // document. Older deployments must not silently strip new content fields.
    if (input.action === "checkContentSupport")
      return { ok: true, documentContentVersion: 1 };
    const actions = [
      "saveDraft",
      "deleteSop",
      "restoreSop",
      "copyPublication",
      "approve",
      "publish",
      "withdraw",
      "previewAdoption",
      "activate",
      "previewMembership",
      "refreshMembership",
      "pause",
      "retire",
      "manualTask",
      "submitEvidence",
      "review",
      "waive",
      "cancel",
      "postpone",
      "reassign",
      "stage",
      "markRead",
      "registerDevice",
      "report",
      "unlist",
      "previewUpdate",
      "migrate",
    ];
    if (!actions.includes(input.action))
      fail("invalid-argument", "Unknown SOP command.");
    const staffActions = [
      "saveDraft",
      "deleteSop",
      "restoreSop",
      "copyPublication",
      "manualTask",
      "submitEvidence",
      "markRead",
      "registerDevice",
      "report",
    ];
    const actualEvent = input.action === "stage" && input.actual === true;
    if (
      actualEvent &&
      !require("../shared/permissions").hasUserPermission({
        company: { ...a.company, id: companyId },
        user: a.user,
        uid,
        permission: "recordPondData",
      })
    )
      fail("permission-denied", "You cannot record pond events.");
    const isPlatformAdmin =
      input.action === "unlist" && input.platformAdmin === true;
    if (
      !staffActions.includes(input.action) &&
      !actualEvent &&
      !a.manage &&
      !isPlatformAdmin
    )
      fail(
        "permission-denied",
        "An owner or manager must approve this action.",
      );
    if (JSON.stringify(input).length > 400000)
      fail("invalid-argument", "Command is too large.");
    const fingerprint = hash({ ...input, platformAdmin: undefined });
    let copiedGuidance = [],
      preparedRevision;
    if (input.action === "publish") {
      const sop = (
        await ref.collection("sops").doc(id(input.sopId)).get()
      ).data();
      if (sop) {
        preparedRevision = sop.revision;
        const pubId = hash([companyId, input.sopId, `v${sop.revision}`]);
        copiedGuidance = await require("./guidanceFiles").copyGuidance(
          storage,
          sop.definition.attachments || [],
          `communitySops/${pubId}`,
        );
      }
    }
    if (
      input.publicationId &&
      ["copyPublication", "activate"].includes(input.action)
    ) {
      const publication = (
        await db.collection("communitySops").doc(id(input.publicationId)).get()
      ).data();
      if (publication?.status === "published")
        copiedGuidance = await require("./guidanceFiles").copyGuidance(
          storage,
          publication.definition.attachments || [],
          `companies/${companyId}/sopAttachments/${uid}/${operationId}`,
        );
    }

    return db.runTransaction(async (tx) => {
      const receipt = ref
          .collection("sopCommands")
          .doc(`${uid}-${operationId}`),
        old = await tx.get(receipt);
      if (old.exists) {
        if (old.data().fingerprint !== fingerprint)
          fail(
            "already-exists",
            "This operation ID was used with different input.",
          );
        return old.data().result;
      }
      const [currentCompany, currentUser] = await Promise.all([
        tx.get(ref),
        tx.get(db.doc(`users/${uid}`)),
      ]);
      const c = currentCompany.data() || {},
        u = currentUser.data() || {};
      if (
        (c.ownerId !== uid &&
          (!(c.teamMembers || []).includes(uid) ||
            u.companyId !== companyId)) ||
        u.founderAccessSuspended
      )
        fail("permission-denied", "Company access changed.");
      if (
        !staffActions.includes(input.action) &&
        !actualEvent &&
        !sopCanManage(u.role, uid, c.ownerId) &&
        !isPlatformAdmin
      )
        fail("permission-denied", "Manager authority changed.");
      if (
        Number.isFinite(u.founderSessionValidAfter) &&
        (!Number.isFinite(input.authTime) ||
          input.authTime <= u.founderSessionValidAfter)
      )
        fail("unauthenticated", "Your session was revoked.");
      const manageNow = sopCanManage(u.role, uid, c.ownerId);
      if (
        !require("../shared/permissions").hasUserPermission({
          company: { ...c, id: companyId },
          user: u,
          uid,
          permission: "viewFarm",
        })
      )
        fail("permission-denied", "Farm permission changed.");
      if (
        actualEvent &&
        !require("../shared/permissions").hasUserPermission({
          company: { ...c, id: companyId },
          user: u,
          uid,
          permission: "recordPondData",
        })
      )
        fail("permission-denied", "Recording permission changed.");
      let result = { ok: true };
      const audit = {
        action: input.action,
        actorId: uid,
        at: now,
        operationId,
        reason: input.reason || "",
        subjectId: input.taskId || input.adoptionId || input.sopId || "",
      };
      const expected = (data) => {
        if (
          input.expectedRevision !== undefined &&
          input.expectedRevision !== data.revision
        )
          fail(
            "failed-precondition",
            "This item changed. Refresh and review it again.",
          );
      };
      if (input.action === "copyPublication") {
        const pub = await tx.get(
          db.collection("communitySops").doc(id(input.publicationId)),
        );
        if (!pub.exists || pub.data().status !== "published")
          fail("failed-precondition", "Publication is unavailable.");
        const sopId = hash([uid, operationId, "copy"]),
          definition = checkDefinition(
            { ...pub.data().definition, attachments: copiedGuidance },
            true,
          );
        tx.create(ref.collection("sops").doc(sopId), {
          title: definition.title,
          definition,
          status: "draft",
          revision: 1,
          createdBy: uid,
          updatedAt: now,
          source: {
            publicationId: pub.id,
            companyId: pub.data().companyId,
            sopId: pub.data().sopId,
            versionId: pub.data().versionId,
            author: pub.data().author,
          },
        });
        result = { ok: true, sopId };
      } else if (["deleteSop", "restoreSop"].includes(input.action)) {
        const doc = ref.collection("sops").doc(id(input.sopId)),
          s = await tx.get(doc);
        if (!s.exists) fail("not-found", "SOP not found.");
        const data = s.data();
        expected(data);
        if (
          !manageNow &&
          (data.createdBy !== uid ||
            (data.deletedFromStatus || data.status) !== "draft")
        )
          fail(
            "permission-denied",
            "You may delete or restore your own drafts.",
          );
        if (input.action === "restoreSop") {
          if (data.status !== "deleted")
            fail("failed-precondition", "This SOP is not in Deleted SOPs.");
          tx.update(doc, {
            status:
              data.deletedFromStatus === "approved" ? "approved" : "draft",
            revision: data.revision + 1,
            updatedAt: now,
            deletedAt: null,
            deletedBy: null,
            deletedFromStatus: null,
          });
        } else {
          if (!["draft", "approved"].includes(data.status))
            fail("failed-precondition", "This SOP cannot be deleted.");
          // Existing executions retain their approved snapshots. Public copies
          // are withdrawn, while the company document and versions remain recoverable.
          const publications = await tx.get(
            db
              .collection("communitySops")
              .where("companyId", "==", companyId)
              .where("sopId", "==", s.id),
          );
          if (publications.size > 200)
            fail(
              "resource-exhausted",
              "Too many publications to withdraw in one change.",
            );
          for (const pub of publications.docs)
            if (pub.data().status === "published") {
              tx.update(pub.ref, {
                status: "withdrawn",
                withdrawnAt: now,
                withdrawalReason: "Company SOP deleted.",
              });
              tx.set(
                db.collection("sopWithdrawalJobs").doc(hash([pub.id, now])),
                {
                  publicationId: pub.id,
                  status: "pending",
                  cursor: "",
                  createdAt: now,
                  nextDueAt: now,
                },
              );
            }
          tx.update(doc, {
            status: "deleted",
            deletedFromStatus: data.status,
            deletedAt: now,
            deletedBy: uid,
            revision: data.revision + 1,
            updatedAt: now,
          });
        }
        result = { ok: true, sopId: s.id };
      } else if (input.action === "saveDraft") {
        const sopId = input.sopId ? id(input.sopId) : hash([uid, operationId]),
          doc = ref.collection("sops").doc(sopId),
          s = await tx.get(doc);
        if (s.exists) expected(s.data());
        if (s.data()?.status === "deleted")
          fail("failed-precondition", "Restore this SOP before editing it.");
        if (s.exists && !manageNow && s.data().createdBy !== uid)
          fail("permission-denied", "You may edit your own drafts.");
        const definition = checkDefinition(input.definition, true);
        for (const attachment of definition.attachments || []) {
          if (
            !attachment.path.startsWith(
              `companies/${companyId}/sopAttachments/`,
            ) ||
            attachment.path.includes("..")
          )
            fail(
              "permission-denied",
              "Guidance must be uploaded in this company.",
            );
          if (storage) {
            const [metadata] = await storage
              .bucket()
              .file(attachment.path)
              .getMetadata();
            if (metadata.metadata?.taskId !== "guidance")
              fail(
                "invalid-argument",
                "Select a file explicitly uploaded as company guidance.",
              );
          }
        }
        tx.set(doc, {
          title: definition.title,
          definition,
          status: "draft",
          revision: (s.data()?.revision || 0) + 1,
          createdBy: s.data()?.createdBy || uid,
          updatedAt: now,
          source: s.data()?.source || null,
        });
        result = { ok: true, sopId };
      } else if (input.action === "approve" || input.action === "publish") {
        const sopRef = ref.collection("sops").doc(id(input.sopId)),
          s = await tx.get(sopRef);
        if (!s.exists) fail("not-found", "SOP not found.");
        if (s.data().status === "deleted")
          fail(
            "failed-precondition",
            "Restore this SOP before approving or publishing it.",
          );
        expected(s.data());
        if (
          preparedRevision !== undefined &&
          s.data().revision !== preparedRevision
        )
          fail(
            "failed-precondition",
            "Guidance changed during publication. Refresh and retry.",
          );
        const definition = checkDefinition(s.data().definition),
          versionId = `v${s.data().revision}`,
          versionRef = sopRef.collection("versions").doc(versionId),
          version = await tx.get(versionRef);
        if (input.action === "publish" && !version.exists)
          fail(
            "failed-precondition",
            "Approve this version before publication.",
          );
        const pubId = hash([companyId, sopRef.id, versionId]),
          pubRef = db.collection("communitySops").doc(pubId);
        let pub;
        if (input.action === "publish") pub = await tx.get(pubRef);
        if (!version.exists)
          tx.create(versionRef, {
            definition,
            approvedBy: uid,
            approvedAt: now,
            source: s.data().source || null,
          });
        tx.update(sopRef, {
          status: "approved",
          approvedVersionId: versionId,
          updatedAt: now,
        });
        if (input.action === "publish")
          tx.set(pubRef, {
            companyId,
            sopId: sopRef.id,
            versionId,
            definition: {
              ...definition,
              attachments: copiedGuidance,
              steps: definition.steps.map((step) => ({
                ...step,
                assigneeId: "",
                check: { ...step.check, sourceId: "" },
              })),
            },
            title: definition.title,
            author: c.companyName || c.name || "Shrimply farm",
            status: "published",
            publishedAt: pub.data()?.publishedAt || now,
            sourceAttribution: s.data().source
              ? {
                  publicationId: s.data().source.publicationId,
                  author: s.data().source.author,
                  versionId: s.data().source.versionId,
                }
              : null,
            adoptionCount: pub.data()?.adoptionCount || 0,
          });
        result = { ok: true, versionId, publicationId: pubId };
      } else if (["withdraw", "unlist", "report"].includes(input.action)) {
        const pubRef = db
            .collection("communitySops")
            .doc(id(input.publicationId)),
          pub = await tx.get(pubRef);
        if (!pub.exists) fail("not-found", "Publication not found.");
        if (input.action === "report")
          tx.create(db.collection("sopReports").doc(hash([uid, operationId])), {
            publicationId: pub.id,
            companyId,
            actorId: uid,
            reason: text(input.reason, 2000),
            createdAt: now,
            status: "open",
          });
        else {
          if (input.action === "withdraw" && pub.data().companyId !== companyId)
            fail(
              "permission-denied",
              "You cannot withdraw another farm’s SOP.",
            );
          tx.update(pubRef, {
            status: input.action === "unlist" ? "unlisted" : "withdrawn",
            withdrawalReason: text(input.reason, 2000),
            withdrawnAt: now,
          });
          tx.set(db.collection("sopWithdrawalJobs").doc(hash([pub.id, now])), {
            publicationId: pub.id,
            status: "pending",
            cursor: "",
            createdAt: now,
            nextDueAt: now,
          });
        }
      } else if (
        [
          "previewAdoption",
          "activate",
          "previewMembership",
          "refreshMembership",
          "previewUpdate",
          "migrate",
        ].includes(input.action)
      ) {
        let definition,
          versionId,
          sopId,
          source = null,
          adoption = null;
        if (input.adoptionId) {
          const ad = await tx.get(
            ref.collection("sopAdoptions").doc(id(input.adoptionId)),
          );
          if (!ad.exists) fail("not-found", "Adoption not found.");
          adoption = ad.data();
          expected(adoption);
        }
        if (input.publicationId) {
          const pub = await tx.get(
            db.collection("communitySops").doc(id(input.publicationId)),
          );
          if (!pub.exists || pub.data().status !== "published")
            fail("failed-precondition", "Publication is unavailable.");
          definition = {
            ...pub.data().definition,
            attachments: copiedGuidance,
          };
          versionId = pub.data().versionId;
          sopId = hash([uid, operationId, "copy"]);
          source = {
            publicationId: pub.id,
            companyId: pub.data().companyId,
            sopId: pub.data().sopId,
            versionId,
            author: pub.data().author,
          };
        } else if (input.sopId) {
          sopId = id(input.sopId);
          const s = await tx.get(ref.collection("sops").doc(sopId));
          if (
            !s.exists ||
            s.data().status === "deleted" ||
            !s.data().approvedVersionId
          )
            fail("failed-precondition", "Approve the farm SOP first.");
          versionId = s.data().approvedVersionId;
          const v = await tx.get(
            ref
              .collection("sops")
              .doc(sopId)
              .collection("versions")
              .doc(versionId),
          );
          definition = v.data()?.definition;
          source = s.data().source || null;
        } else if (adoption) {
          ({ definition, versionId, sopId } = adoption);
        } else
          fail("invalid-argument", "Choose an approved SOP or publication.");
        definition = checkDefinition(definition);
        if (input.expectedVersionId && input.expectedVersionId !== versionId)
          fail(
            "failed-precondition",
            "The approved version changed. Preview it again.",
          );
        const settings = { ...adoption, ...input };
        if (!["cycle", "standing"].includes(settings.lifetime))
          fail("invalid-argument", "Choose cycle or standing adoption.");
        const zone = c.timeZone;
        try {
          new Intl.DateTimeFormat("en", { timeZone: zone }).format();
        } catch {
          fail(
            "failed-precondition",
            "Set a valid company timezone before activation.",
          );
        }
        if (!zone)
          fail("failed-precondition", "Set the company timezone first.");
        const preview = await resolveTargets(tx, ref, settings, definition, c);
        const targetSignature = hash(
          [...preview.targets].sort((a, b) =>
            `${a.scope}:${a.id}`.localeCompare(`${b.scope}:${b.id}`),
          ),
        );
        if (
          input.expectedTargetSignature &&
          input.expectedTargetSignature !== targetSignature
        )
          fail(
            "failed-precondition",
            "Pond assignments or production stages changed. Review adoption again.",
          );
        const recipients = [
          ...new Set([
            preview.managerId,
            ...(settings.recipients || []).map(id),
          ]),
        ];
        for (const r of recipients)
          if (r !== c.ownerId && !(c.teamMembers || []).includes(r))
            fail(
              "invalid-argument",
              "Escalation recipients must be current team members.",
            );
        for (const step of definition.steps)
          if (
            step.assigneeId &&
            step.assigneeId !== c.ownerId &&
            !(c.teamMembers || []).includes(step.assigneeId)
          )
            fail(
              "invalid-argument",
              "Step assignees must belong to this company.",
            );
        result = {
          ok: true,
          ...preview,
          definition,
          versionId,
          generatedSteps: definition.steps.length,
          targetSignature,
        };
        if (input.action === "previewUpdate" && input.adoptionId) {
          const pending = await tx.get(
            ref
              .collection("tasks")
              .where("adoptionId", "==", input.adoptionId)
              .where("status", "in", [
                "open",
                "scheduled",
                "submitted",
                "needs_review",
              ]),
          );
          const changed = pending.docs.filter(
            (t) => t.data().versionId !== versionId,
          );
          result = {
            ...result,
            unresolved: changed.slice(0, 150).map((t) => {
              const task = t.data(),
                step = definition.steps.find((s) => s.id === task.step?.id);
              return {
                id: t.id,
                title: task.title,
                target: task.target.name,
                purpose: task.purpose,
                fromVersion: task.versionId,
                toVersion: versionId,
                oldInstructions: task.instructions,
                newInstructions: step
                  ? task.purpose === "corrective"
                    ? step.correctiveInstructions
                    : step.instructions
                  : "Cancelled: step removed",
                oldCheck: task.step?.check || null,
                newCheck: step?.check || null,
                scopeReplacement: !!step && step.scope !== task.target.scope,
              };
            }),
            migrationTotal: changed.length,
          };
        }
        if (
          ["activate", "refreshMembership", "migrate"].includes(input.action)
        ) {
          if (preview.conflicts.length)
            fail("failed-precondition", preview.conflicts.join("\n"));
          const adId = input.adoptionId || hash([uid, operationId, "adoption"]),
            adRef = ref.collection("sopAdoptions").doc(adId);
          let pubCount, adopterRef, adopter;
          if (source) {
            const pubRef = db
              .collection("communitySops")
              .doc(source.publicationId);
            pubCount = await tx.get(pubRef);
            adopterRef = db
              .collection("communitySopAdopters")
              .doc(hash([source.publicationId, companyId]));
            adopter = await tx.get(adopterRef);
          }
          const gateRequirements = preview.targets
            .filter((t) => t.scope === "pond")
            .flatMap((t) =>
              definition.steps
                .filter((s) => s.gateStage)
                .map((s) => ({
                  key: `${t.id}-${s.gateStage}`,
                  targetId: t.id,
                  stage: s.gateStage,
                  stepId: s.id,
                  evidenceTargetId:
                    s.scope === "pond"
                      ? t.id
                      : s.scope === "block"
                        ? t.blockId
                        : "company",
                })),
            );
          if (gateRequirements.length > 150)
            fail(
              "resource-exhausted",
              "Split this adoption into smaller blocks for stage gates.",
            );
          const gateSnapshots = await Promise.all(
            gateRequirements.map((g) =>
              tx.get(ref.collection("sopGates").doc(g.key)),
            ),
          );
          const priorGates = await tx.get(
            ref
              .collection("sopGates")
              .where("adoptionIds", "array-contains", adId),
          );
          let openTasks;
          if (input.action === "migrate") {
            if (!input.confirmMigration)
              fail("failed-precondition", "Review and confirm the migration.");
            const snapshot = await tx.get(
              ref
                .collection("tasks")
                .where("adoptionId", "==", adId)
                .where("status", "in", [
                  "open",
                  "scheduled",
                  "submitted",
                  "needs_review",
                ]),
            );
            const unresolved = snapshot.docs.filter(
              (t) => t.data().versionId !== versionId,
            );
            openTasks = { docs: unresolved.slice(0, 150) };
            result = {
              ...result,
              migrationRemaining: Math.max(0, unresolved.length - 150),
              migrationCount: openTasks.docs.length,
            };
          }
          if (input.publicationId) {
            tx.create(ref.collection("sops").doc(sopId), {
              title: definition.title,
              definition,
              status: "approved",
              revision: 1,
              approvedVersionId: versionId,
              createdBy: uid,
              source,
              updatedAt: now,
            });
            tx.create(
              ref
                .collection("sops")
                .doc(sopId)
                .collection("versions")
                .doc(versionId),
              { definition, source, approvedBy: uid, approvedAt: now },
            );
          }
          if (source) {
            if (!adopter.exists) {
              tx.create(adopterRef, {
                publicationId: source.publicationId,
                companyId,
                adoptionId: adId,
                managerId: preview.managerId,
                adoptions: [{ id: adId, managerId: preview.managerId }],
              });
              tx.update(pubCount.ref, {
                adoptionCount: (pubCount.data().adoptionCount || 0) + 1,
              });
            } else {
              const current = adopter.data().adoptions || [
                {
                  id: adopter.data().adoptionId,
                  managerId: adopter.data().managerId,
                },
              ];
              tx.update(adopterRef, {
                adoptions: [
                  ...current.filter((a) => a.id !== adId),
                  { id: adId, managerId: preview.managerId },
                ],
              });
            }
          }
          if (
            settings.lifetime === "cycle" &&
            !preview.targets.some((t) => t.scope === "pond" && t.cycleId)
          )
            fail(
              "invalid-argument",
              "A current-cycle adoption needs an active pond. Choose standing for shared procedures without a pond cycle.",
            );
          tx.update(ref, { adaptiveSopsEnabled: true });
          const next = {
            id: adId,
            sopId,
            versionId,
            title: definition.title,
            definition,
            targets: preview.targets,
            status: "active",
            revision: (adoption?.revision || 0) + 1,
            pondIds: settings.pondIds || [],
            blockIds: settings.blockIds || [],
            companyScope: settings.companyScope === true,
            lifetime: settings.lifetime,
            managerId: preview.managerId,
            recipients,
            timeZone: zone,
            activatedAt: adoption?.activatedAt || now,
            rulesEffectiveAt:
              adoption &&
              ["activate", "migrate"].includes(input.action) &&
              adoption.versionId !== versionId
                ? now
                : adoption?.rulesEffectiveAt || adoption?.activatedAt || now,
            scheduleCursorAt: adoption?.scheduleCursorAt || now,
            baselineReconciledAt: adoption?.baselineReconciledAt || 0,
            cycleBindings:
              adoption?.cycleBindings ||
              preview.targets
                .filter((t) => t.scope === "pond")
                .map((t) => ({ targetId: t.id, cycleId: t.cycleId })),
            nextDueAt: now,
            source: source || adoption?.source || null,
          };
          tx.set(adRef, next);
          for (const gate of priorGates.docs)
            if (!gateRequirements.some((g) => g.key === gate.id)) {
              const required = gate
                  .data()
                  .required.filter((r) => r.adoptionId !== adId),
                adoptionIds = gate.data().adoptionIds.filter((a) => a !== adId);
              tx.update(gate.ref, {
                required,
                adoptionIds,
                allowed: !required.length || gate.data().allowed === true,
                updatedAt: now,
              });
            }
          for (let i = 0; i < gateRequirements.length; i++) {
            const gate = gateRequirements[i],
              previous = gateSnapshots[i].data();
            if (gateRequirements.findIndex((g) => g.key === gate.key) !== i)
              continue;
            tx.set(ref.collection("sopGates").doc(gate.key), {
              targetId: gate.targetId,
              stage: gate.stage,
              adoptionIds: [
                ...new Set([...(previous?.adoptionIds || []), adId]),
              ],
              required: [
                ...(previous?.required || []).filter(
                  (r) => r.adoptionId !== adId,
                ),
                ...gateRequirements
                  .filter((g) => g.key === gate.key)
                  .map((g) => ({
                    adoptionId: adId,
                    stepId: g.stepId,
                    targetId: g.evidenceTargetId,
                  })),
              ],
              allowed: false,
              updatedAt: now,
            });
          }
          tx.create(
            adRef.collection("membershipRevisions").doc(String(next.revision)),
            {
              targets: preview.targets,
              approvedBy: uid,
              effectiveAt: now,
              versionId,
            },
          );
          if (openTasks)
            for (const t of openTasks.docs) {
              if (
                ["completed", "cancelled", "waived"].includes(t.data().status)
              )
                continue;
              const step = definition.steps.find(
                (s) => s.id === t.data().step?.id,
              );
              tx.set(
                t.ref.collection("revisions").doc(String(t.data().revision)),
                { ...t.data(), archivedAt: now },
              );
              tx.update(
                t.ref,
                step && step.scope === t.data().target.scope
                  ? {
                      title:
                        t.data().purpose === "routine"
                          ? step.title
                          : `${t.data().purpose === "corrective" ? "Corrective action" : "Recheck"}: ${step.title}`,
                      instructions:
                        t.data().purpose === "corrective"
                          ? step.correctiveInstructions
                          : step.instructions,
                      step,
                      versionId,
                      revision: t.data().revision + 1,
                      status: "open",
                      result: "insufficient_evidence",
                      migrationFrom: t.data().versionId,
                      migratedAt: now,
                    }
                  : {
                      status: "cancelled",
                      cancellationReason: step
                        ? "Scope changed by approved migration; future work uses the new scope"
                        : "Step removed by approved migration",
                      revision: t.data().revision + 1,
                    },
              );
            }
          result = { ...result, adoptionId: adId, sopId };
        }
      } else if (input.action === "pause" || input.action === "retire") {
        const adRef = ref.collection("sopAdoptions").doc(id(input.adoptionId)),
          s = await tx.get(adRef);
        if (!s.exists) fail("not-found", "Adoption not found.");
        expected(s.data());
        const gates = await tx.get(
          ref
            .collection("sopGates")
            .where("adoptionIds", "array-contains", adRef.id),
        );
        for (const gate of gates.docs) {
          const required = gate
              .data()
              .required.filter((r) => r.adoptionId !== adRef.id),
            adoptionIds = gate.data().adoptionIds.filter((a) => a !== adRef.id);
          tx.update(gate.ref, {
            required,
            adoptionIds,
            ...(!required.length ? { allowed: true } : {}),
          });
        }
        tx.update(adRef, {
          status: input.action === "pause" ? "paused" : "retired",
          revision: s.data().revision + 1,
        });
      } else if (input.action === "manualTask") {
        const assigneeId = id(input.assigneeId || uid);
        if (assigneeId !== uid && !manageNow)
          fail(
            "permission-denied",
            "Only managers can assign work to someone else.",
          );
        if (
          assigneeId !== c.ownerId &&
          !(c.teamMembers || []).includes(assigneeId)
        )
          fail("invalid-argument", "Assignee is not a team member.");
        if (!Number.isFinite(input.dueAt) || input.dueAt < now - 86400000)
          fail("invalid-argument", "Choose a due time.");
        let target = {
          id: "company",
          scope: "company",
          name: "Company",
          pondId: "",
          physicalPondId: "",
          cycleId: "",
          blockId: "",
          stage: "growout",
          stockingDate: "",
          assigneeId,
        };
        if (input.scope && input.scope !== "company") {
          if (!["pond", "block"].includes(input.scope))
            fail("invalid-argument", "Invalid task scope.");
          const targetId = id(input.targetId),
            collection = input.scope === "pond" ? "physicalPonds" : "blocks",
            source = await tx.get(ref.collection(collection).doc(targetId));
          if (!source.exists) fail("not-found", "Task scope no longer exists.");
          const data = source.data(),
            blockId = input.scope === "block" ? targetId : data.blockId || "";
          const block = blockId
            ? (await tx.get(ref.collection("blocks").doc(blockId))).data()
            : null;
          if (
            !manageNow &&
            c.businessSize === "enterprise" &&
            u.role === "technician" &&
            block?.assignedTechnicianId !== uid
          )
            fail("permission-denied", "Task is outside your block.");
          target = {
            ...target,
            id: targetId,
            scope: input.scope,
            name: data.pondName || data.name || targetId,
            physicalPondId: input.scope === "pond" ? targetId : "",
            blockId,
          };
        }

        const taskId = hash([uid, operationId]),
          task = {
            id: taskId,
            title: text(input.title, 200),
            instructions: text(input.instructions || ""),
            status: "open",
            result: "insufficient_evidence",
            adoptionId: "",
            versionId: "",
            step: null,
            target,
            severity: ["low", "warning", "critical"].includes(input.severity)
              ? input.severity
              : "low",
            assigneeId,
            managerId: c.ownerId,
            visibleTo: [...new Set([assigneeId, c.ownerId])],
            windowStart: now,
            dueAt: input.dueAt,
            createdAt: now,
            revision: 1,
            notes: "",
            attachments: [],
            issueId: "",
            purpose: "manual",
          };
        if (!task.title.trim())
          fail("invalid-argument", "Task title is required.");
        tx.create(ref.collection("tasks").doc(taskId), task);
        tx.create(
          ref
            .collection("sopNotifications")
            .doc(hash([taskId, assigneeId, "assigned"])),
          {
            recipientId: assigneeId,
            taskId,
            title: "Farm task assigned",
            message: "Open To-do to review your farm work.",
            createdAt: now,
            severity: task.severity,
            read: false,
            pushStatus: "pending",
            nextAttemptAt: now,
          },
        );
        result = { ok: true, taskId };
      } else if (
        [
          "submitEvidence",
          "review",
          "waive",
          "cancel",
          "postpone",
          "reassign",
        ].includes(input.action)
      ) {
        const taskRef = ref.collection("tasks").doc(id(input.taskId)),
          s = await tx.get(taskRef);
        if (!s.exists) fail("not-found", "Task not found.");
        const task = s.data();
        if (input.action !== "submitEvidence") expected(task);
        if (
          !manageNow &&
          c.businessSize === "enterprise" &&
          u.role === "technician" &&
          task.target.scope !== "company"
        ) {
          const block = await tx.get(
            ref.collection("blocks").doc(task.target.blockId || "missing"),
          );
          if (block.data()?.assignedTechnicianId !== uid)
            fail("permission-denied", "Your block assignment changed.");
        }
        if (!manageNow && !task.visibleTo.includes(uid))
          fail("permission-denied", "This task is outside your assignment.");
        if (["waived", "cancelled"].includes(task.status))
          fail("failed-precondition", "This task is no longer active.");
        const issue = task.issueId
          ? await tx.get(ref.collection("sopIssues").doc(task.issueId))
          : null;
        if (input.action === "submitEvidence") {
          const execution = task.adoptionId
            ? await tx.get(ref.collection("sopAdoptions").doc(task.adoptionId))
            : null;
          const requiresHumanReview =
            (!!task.adoptionId &&
              (!execution?.exists ||
                execution.data().status !== "active" ||
                (input.expectedAdoptionRevision !== undefined &&
                  input.expectedAdoptionRevision !==
                    execution.data().revision))) ||
            (input.expectedRevision !== undefined &&
              input.expectedRevision !== task.revision) ||
            (issue?.data()?.status === "closed" &&
              task.step?.severity === "critical");
          let evidenceObservedAt = null;
          if (input.observedAt) {
            const time = String(input.observedAt);
            evidenceObservedAt = Date.parse(time);
            if (
              !/T.*(?:Z|[+-]\d\d:\d\d)$/.test(time) ||
              !Number.isFinite(evidenceObservedAt) ||
              evidenceObservedAt > now + 120000
            )
              fail(
                "invalid-argument",
                "Use a valid observation time with timezone.",
              );
          }
          const notes = text(input.notes || ""),
            attachments = input.attachments || [];
          if (!Array.isArray(attachments) || attachments.length > 10)
            fail("invalid-argument", "Attach at most ten files.");
          for (const file of attachments) {
            if (
              typeof file.path !== "string" ||
              !file.path.startsWith(
                `companies/${companyId}/sopAttachments/${uid}/`,
              ) ||
              file.path.includes("..")
            )
              fail("permission-denied", "Invalid evidence attachment path.");
            if (storage) {
              const [metadata] = await storage
                .bucket()
                .file(file.path)
                .getMetadata();
              if (metadata.metadata?.taskId !== taskRef.id)
                fail(
                  "invalid-argument",
                  "Upload this evidence attachment for the selected task.",
                );
              if (Number(metadata.size) > 10 * 1024 * 1024)
                fail("invalid-argument", "Attachment exceeds 10 MB.");
            }
          }
          if (
            ((task.step?.requireNotes || task.purpose === "corrective") &&
              !notes.trim()) ||
            (task.step?.requireAttachment && !attachments.length)
          )
            fail(
              "invalid-argument",
              "Required notes or attachments are missing.",
            );
          tx.create(
            ref.collection("sopSubmissions").doc(hash([uid, operationId])),
            {
              taskId: s.id,
              actorId: uid,
              notes,
              attachments,
              receivedAt: now,
              observedAt: evidenceObservedAt,
              revision: (task.evidenceRevision || 0) + 1,
              taskRevision: task.revision,
              adoptionRevision: execution?.data()?.revision ?? null,
              expectedAdoptionRevision: input.expectedAdoptionRevision ?? null,
              requiresHumanReview,
              visibleTo: task.visibleTo,
              target: task.target,
            },
          );
          if (
            issue?.data()?.status === "closed" &&
            task.step?.severity === "critical"
          )
            tx.update(issue.ref, {
              status: "closure_review",
              closureInvalidatedAt: now,
              closureInvalidationReason:
                "Evidence revised after critical closure",
            });
          tx.update(taskRef, {
            notes,
            attachments,
            requiresHumanReview,
            reviewedAt: null,
            reviewedBy: "",
            reviewReason: "",
            status: requiresHumanReview
              ? "needs_review"
              : task.step
                ? "submitted"
                : "completed",
            result: task.step ? "needs_review" : "pass",
            evidenceObservedAt,
            evidenceRevision: (task.evidenceRevision || 0) + 1,
            submissionId: hash([uid, operationId]),
            submittedAt: now,
            submittedBy: uid,
            revision: task.revision + 1,
          });
        } else if (input.action === "review") {
          const resultValue = input.result;
          if (
            resultValue === "pass" &&
            task.step?.check.field === "manual" &&
            (!task.submittedAt ||
              (task.step.requireNotes && !task.notes?.trim()) ||
              (task.step.requireAttachment && !task.attachments?.length))
          )
            fail(
              "failed-precondition",
              "Submit complete required evidence before approval.",
            );
          if (
            issue?.exists &&
            resultValue === "pass" &&
            task.purpose === "recheck"
          ) {
            const corrective = await tx.get(
              ref.collection("tasks").doc(issue.data().correctiveTaskId),
            );
            if (corrective.data()?.status !== "completed")
              fail(
                "failed-precondition",
                "Complete the corrective action before closing the issue.",
              );
          }
          if (!["pass", "fail", "not_applicable"].includes(resultValue))
            fail("invalid-argument", "Choose a reviewed result.");
          const reason = text(input.reason, 2000);
          if (!reason.trim())
            fail("invalid-argument", "Record your review reason.");
          if (
            resultValue === "pass" &&
            task.step?.check.field !== "manual" &&
            task.purpose !== "corrective"
          ) {
            const decision = task.evaluationId
              ? await tx.get(
                  ref.collection("sopEvaluations").doc(task.evaluationId),
                )
              : null;
            const refs = decision?.data()?.evidenceIds || [];
            const evidence = await Promise.all(
              refs.map(async (value) => {
                const [key, revision] = value.split(":");
                const item = await tx.get(
                  ref.collection("sopEvidence").doc(key),
                );
                if (item.data()?.revision !== revision) return null;
                return { id: key, ...item.data() };
              }),
            );
            if (
              !evidence.length ||
              evidence.some((e) => !e) ||
              !(await require("./currentEvidence").currentEvidence(
                tx,
                ref,
                evidence,
              ))
            )
              fail(
                "failed-precondition",
                "Source evidence changed; wait for verification before sign-off.",
              );
          }
          if (
            task.step?.check.field !== "manual" &&
            task.purpose !== "corrective" &&
            resultValue === "pass" &&
            task.result !== "pass"
          )
            fail(
              "failed-precondition",
              "A qualifying source record must pass this check before sign-off.",
            );
          if (
            issue?.exists &&
            resultValue === "pass" &&
            task.purpose !== "recheck" &&
            task.purpose !== "corrective" &&
            issue.data().recoveryVerified !== true
          )
            fail(
              "failed-precondition",
              "Qualifying recovery evidence is required.",
            );
          if (
            task.purpose === "corrective" &&
            resultValue === "pass" &&
            (!task.notes?.trim() ||
              (task.step.requireAttachment && !task.attachments?.length))
          )
            fail(
              "failed-precondition",
              "Record the required action evidence before approval.",
            );
          tx.update(taskRef, {
            status: resultValue === "not_applicable" ? "waived" : "completed",
            ...(resultValue === "not_applicable"
              ? { waiverReason: reason, waivedBy: uid, waivedAt: now }
              : {}),
            result:
              task.purpose === "corrective" && resultValue === "pass"
                ? "needs_review"
                : resultValue,
            requiresHumanReview: false,
            reviewedBy: uid,
            reviewedAt: now,
            reviewReason: reason,
            revision: task.revision + 1,
          });
          if (
            issue?.exists &&
            resultValue === "pass" &&
            task.purpose === "recheck"
          )
            tx.update(issue.ref, {
              recoveryVerified: true,
              recoveryTaskId: taskRef.id,
              status: "closed",
              closedBy: uid,
              closedAt: now,
            });
          if (issue?.exists && resultValue === "not_applicable")
            tx.update(issue.ref, {
              status: "exempted",
              exemptionReason: reason,
              exemptedBy: uid,
              exemptedAt: now,
            });
        } else if (input.action === "reassign") {
          const assignee = id(input.assigneeId);
          if (
            assignee !== c.ownerId &&
            !(c.teamMembers || []).includes(assignee)
          )
            fail("invalid-argument", "Assignee must be a team member.");
          tx.update(taskRef, {
            assigneeId: assignee,
            visibleTo: [...new Set([assignee, task.managerId])],
            revision: task.revision + 1,
          });
        } else {
          const reason = text(input.reason, 2000);
          if (!reason.trim())
            fail("invalid-argument", "An exception reason is required.");
          if (input.action === "postpone") {
            if (
              !Number.isFinite(input.dueAt) ||
              input.dueAt <= now ||
              input.dueAt < task.dueAt
            )
              fail("invalid-argument", "Choose a later deadline.");
            tx.update(taskRef, {
              dueAt: input.dueAt,
              originalDueAt: task.originalDueAt || task.dueAt,
              postponementReason: reason,
              revision: task.revision + 1,
            });
          } else
            tx.update(taskRef, {
              status: input.action === "waive" ? "waived" : "cancelled",
              result: input.action === "waive" ? "not_applicable" : task.result,
              exceptionReason: reason,
              exceptionBy: uid,
              exceptionAt: now,
              revision: task.revision + 1,
            });
        }
      } else if (input.action === "stage") {
        const targetId = id(input.targetId);
        const physical = await tx.get(
          ref.collection("physicalPonds").doc(targetId),
        );
        if (!physical.exists) fail("not-found", "Pond no longer exists.");
        if (
          !manageNow &&
          c.businessSize === "enterprise" &&
          u.role === "technician"
        ) {
          const block = await tx.get(
            ref.collection("blocks").doc(physical.data().blockId || "missing"),
          );
          if (block.data()?.assignedTechnicianId !== uid)
            fail("permission-denied", "Pond is outside your block.");
        }
        if (!SOP_STAGES.includes(input.stage))
          fail("invalid-argument", "Invalid production stage.");
        const tasks = await tx.get(ref.collection("tasks"));
        const stageRef = ref.collection("sopStages").doc(targetId),
          oldStage = await tx.get(stageRef);
        const activePond = physical.data().activePondId
          ? await tx.get(
              ref.collection("ponds").doc(physical.data().activePondId),
            )
          : null;
        const cycleId =
          activePond?.data()?.pondCycleId ||
          activePond?.data()?.cycleId ||
          physical.data().activePondId ||
          "";
        const activeAdoptions = await tx.get(
          ref.collection("sopAdoptions").where("status", "==", "active"),
        );
        const missingGates = activeAdoptions.docs.flatMap((ad) =>
          ad
            .data()
            .definition.steps.filter(
              (step) =>
                step.gateStage === input.stage &&
                ad
                  .data()
                  .targets.some(
                    (t) => t.id === targetId && t.scope === "pond",
                  ) &&
                !tasks.docs.some(
                  (t) =>
                    t.data().adoptionId === ad.id &&
                    t.data().step?.id === step.id &&
                    t.data().createdAt >=
                      (oldStage.data()?.changedAt || ad.data().activatedAt) &&
                    (step.scope !== "pond" ||
                      t.data().target.cycleId === cycleId) &&
                    t.data().target.id ===
                      (step.scope === "pond"
                        ? targetId
                        : step.scope === "block"
                          ? physical.data().blockId
                          : "company") &&
                    (t.data().result === "pass" ||
                      t.data().status === "waived"),
                ),
            )
            .map((step) => step.title),
        );
        const blocked = tasks.docs.filter(
          (s) =>
            s.data().createdAt >= (oldStage.data()?.changedAt || 0) &&
            (s.data().target.scope !== "pond" ||
              s.data().target.cycleId === cycleId) &&
            s.data().step?.gateStage === input.stage &&
            [targetId, physical.data().blockId, "company"].includes(
              s.data().target.id,
            ) &&
            s.data().result !== "pass" &&
            s.data().status !== "waived",
        );
        if (
          (blocked.length || missingGates.length) &&
          !input.actual &&
          !input.override
        )
          fail(
            "failed-precondition",
            "Stage prerequisites are incomplete. Record a manager exception to continue.",
          );
        if (
          (blocked.length || missingGates.length) &&
          !String(input.reason || "").trim()
        )
          fail("invalid-argument", "Explain the unmet prerequisites.");
        tx.set(
          ref.collection("sopGates").doc(`${targetId}-${input.stage}`),
          {
            targetId,
            stage: input.stage,
            allowed: true,
            approvedBy: uid,
            approvedAt: now,
            reason: input.reason || "",
            actual: input.actual === true,
          },
          { merge: true },
        );
        tx.set(stageRef, {
          stage: input.stage,
          previousStage: oldStage.data()?.stage || "",
          changedAt: now,
          changedBy: uid,
          actual: input.actual === true,
          reason: input.reason || "",
          blockedTaskIds: blocked.map((s) => s.id),
          missingGates,
        });
        tx.create(
          ref.collection("sopStageTransitions").doc(hash([uid, operationId])),
          {
            targetId,
            stage: input.stage,
            at: now,
            actorId: uid,
            actual: input.actual === true,
            reason: input.reason || "",
            blockedTaskIds: blocked.map((s) => s.id),
            missingGates,
          },
        );
      } else if (input.action === "markRead") {
        const n = await tx.get(
          ref.collection("sopNotifications").doc(id(input.notificationId)),
        );
        if (!n.exists || n.data().recipientId !== uid)
          fail("permission-denied", "Notification is not yours.");
        tx.update(n.ref, { read: true });
      } else if (input.action === "registerDevice") {
        for (const value of [input.quietStart, input.quietEnd])
          if (value !== undefined && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value))
            fail("invalid-argument", "Quiet hours must use HH:MM.");
        if (
          !/^ExponentPushToken\[[A-Za-z0-9_-]+\]$|^ExpoPushToken\[[A-Za-z0-9_-]+\]$/.test(
            input.token,
          )
        )
          fail("invalid-argument", "Invalid push token.");
        const doc = db.collection("sopDevices").doc(hash(input.token)),
          existing = await tx.get(doc);
        tx.set(doc, {
          uid,
          companyId,
          token: input.token,
          enabled: input.enabled !== false,
          quietStart: input.quietStart || "22:00",
          quietEnd: input.quietEnd || "06:00",
          updatedAt: now,
          authTime: input.authTime ?? null,
          previousUid: existing.data()?.uid || uid,
        });
      }
      tx.create(receipt, { actorId: uid, fingerprint, result, createdAt: now });
      tx.create(
        ref.collection("sopAudit").doc(hash([uid, operationId])),
        audit,
      );
      return result;
    });
  }
  return { snapshot, command, resolveTargets };
}
module.exports = { createSopService, access, checkDefinition, id, rows, fail };
