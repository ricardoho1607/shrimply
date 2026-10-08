"use strict";
const admin = require("../firebaseAdmin");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall } = require("../shared/guardedCallable");
const {
  defineSecret,
  defineBoolean,
  defineString,
} = require("firebase-functions/params");
const { access, checkDefinition, fail, id } = require("./service");
const { assessNarrative } = require("../shared/orsonDomain/sop/engine");
const { hash } = require("./evidence");
const { enforceFixedWindowLimits } = require("../abuseProtection");
const key = defineSecret("MODEL_API_KEY");
// Enable only after the labelled evaluator suite is run against the configured model.
const calibrated = defineBoolean("SOP_NARRATIVE_CALIBRATED", {
  default: false,
});
const {
  MODEL,
  EVALUATOR_VERSION,
  narrativeCalibrationMatches,
  narrativePrompt,
} = require("./narrative");
const calibrationId = defineString("SOP_NARRATIVE_CALIBRATION_ID", {
  default: "",
});
const {
  generateSopJson,
  sopDraftPrompt,
  sopTranslationPrompt,
  SOP_DRAFT_FORMAT,
  SOP_TRANSLATION_FORMAT,
  SOP_NARRATIVE_FORMAT,
} = require("./model");
async function generate(prompt, format, files = []) {
  return generateSopJson({ apiKey: key.value(), prompt, format, files });
}
exports.assistSop = onCall(
  { secrets: [key], timeoutSeconds: 150, memory: "512MiB" },
  async (request) => {
    const { companyId, mode } = request.data || {},
      uid = request.auth?.uid,
      a = await access(admin.firestore(), uid, companyId);
    await enforceFixedWindowLimits({
      db: admin.firestore(),
      admin,
      limits: [
        {
          namespace: "sopAI",
          scope: `user:${uid}`,
          limit: 10,
          windowMs: 60000,
          message: "SOP AI limit reached. Try again shortly.",
        },
      ],
    });
    await require("../shared/companyAccess").assertCompanyMemberForCallable(
      admin.firestore(),
      uid,
      companyId,
      "useOrson",
    );
    const db = admin.firestore(),
      ref = db.collection("companies").doc(companyId);
    if (mode === "draft") {
      let text = String(request.data.text || "").slice(0, 40000),
        parts = [];
      if (request.data.attachment) {
        const path = String(request.data.attachment.path || "");
        if (
          !path.startsWith(`companies/${companyId}/sopAttachments/${uid}/`) ||
          path.includes("..")
        )
          fail("permission-denied", "Use your own company upload.");
        const file = admin.storage().bucket().file(path);
        const [meta] = await file.getMetadata();
        if (Number(meta.size) > 10 * 1024 * 1024)
          fail("invalid-argument", "Document exceeds 10 MB.");
        const [buffer] = await file.download();
        if (meta.contentType === "application/pdf")
          parts.push({
            type: "input_file",
            filename: "sop.pdf",
            file_data: `data:application/pdf;base64,${buffer.toString("base64")}`,
          });
        else if (
          meta.contentType ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
          text +=
            "\n" +
            (await require("mammoth").extractRawText({ buffer })).value.slice(
              0,
              40000,
            );
        else if (meta.contentType === "text/plain")
          text += "\n" + buffer.toString("utf8").slice(0, 40000);
        else fail("invalid-argument", "Import PDF, DOCX, or plain text.");
      }
      if (!text.trim() && !parts.length)
        fail("invalid-argument", "Describe or upload your SOP.");
      const prompt = sopDraftPrompt(text, request.data.language || "en");
      let definition = await generate(prompt, SOP_DRAFT_FORMAT, parts);
      const { validateSop } = require("../shared/orsonDomain/sop/engine");
      let warnings;
      try {
        warnings = validateSop(definition);
        definition = checkDefinition(definition, true);
      } catch {
        fail("data-loss", "The AI draft could not be validated. Try again.");
      }
      return { definition, warnings, modelId: MODEL, requiresApproval: true };
    }
    if (mode === "translate") {
      const sop = (
        await ref.collection("sops").doc(id(request.data.sopId)).get()
      ).data();
      if (!sop) fail("not-found", "SOP not found.");
      const language = String(request.data.language);
      if (!["en", "id", "vi", "th", "zh"].includes(language))
        fail("invalid-argument", "Unsupported language.");
      const cache = ref
          .collection("sopTranslations")
          .doc(hash([request.data.sopId, sop.revision, language])),
        old = await cache.get();
      if (old.exists) return old.data();
      const translated = await generate(
        sopTranslationPrompt(sop.definition, language),
        SOP_TRANSLATION_FORMAT,
      );
      if (
        !Array.isArray(translated.steps) ||
        translated.steps.length !== sop.definition.steps.length ||
        translated.steps.some(
          (step, index) => step.id !== sop.definition.steps[index].id,
        )
      )
        fail(
          "data-loss",
          "Translation changed the approved workflow identity.",
        );
      const result = {
        translation: translated,
        language,
        sourceRevision: sop.revision,
        sopId: request.data.sopId,
        label: "AI translation; original SOP is authoritative",
        modelId: MODEL,
        createdAt: Date.now(),
      };
      await cache.set(result);
      return result;
    }
    if (mode === "assess")
      return evaluateWrittenEvidence(
        db,
        uid,
        companyId,
        id(request.data.taskId),
      );
    fail("invalid-argument", "Unsupported AI request.");
  },
);

async function evaluateWrittenEvidence(
  db,
  uid,
  companyId,
  taskId,
  expectedRevision,
) {
  const a = await access(db, uid, companyId);
  await require("../shared/companyAccess").assertCompanyMemberForCallable(
    db,
    uid,
    companyId,
    "useOrson",
  );
  const ref = db.collection("companies").doc(companyId),
    taskRef = ref.collection("tasks").doc(taskId),
    task = (await taskRef.get()).data();
  if (!task || (!a.manage && !task.visibleTo.includes(uid)))
    fail("permission-denied", "Task is outside your scope.");
  if (expectedRevision !== undefined && task.revision !== expectedRevision)
    return {
      result: "needs_review",
      explanation: "A newer evidence revision is awaiting evaluation.",
    };
  if (
    task.step?.check.operator !== "narrative" ||
    !task.notes?.trim() ||
    ["waived", "cancelled"].includes(task.status)
  )
    return { result: "needs_review" };
  if (
    !a.manage &&
    a.user.role === "technician" &&
    a.company.businessSize === "enterprise" &&
    task.target.scope !== "company"
  ) {
    const block = (
      await ref.collection("blocks").doc(task.target.blockId).get()
    ).data();
    if (block?.assignedTechnicianId !== uid)
      fail("permission-denied", "Block assignment changed.");
  }
  const evidenceId =
      task.submissionId || hash([taskId, task.revision, task.notes]),
    evaluationRef = ref
      .collection("sopEvaluations")
      .doc(hash([evidenceId, MODEL, EVALUATOR_VERSION]));
  const previous = await evaluationRef.get();
  if (previous.exists) return previous.data();
  let judgment;
  try {
    judgment = await generate(
      narrativePrompt({
        rubric: task.step.check.rubric,
        instructions: task.instructions,
        evidenceId,
        notes: task.notes,
      }),
      SOP_NARRATIVE_FORMAT,
    );
  } catch {
    judgment = {
      result: "needs_review",
      confidence: 0,
      citations: [],
      explanation: "AI assessment unavailable; human review required.",
    };
  }
  const citations = Array.isArray(judgment.citations)
    ? judgment.citations.filter((x) => typeof x === "string")
    : [];
  const result = assessNarrative({
    severity: task.step.severity,
    confidence: judgment.confidence,
    result: judgment.result,
    citations,
    allowedIds: [evidenceId],
    calibrated:
      narrativeCalibrationMatches(calibrated.value(), calibrationId.value()) &&
      !task.requiresHumanReview &&
      !task.attachments?.length &&
      typeof judgment.explanation === "string" &&
      !!judgment.explanation.trim(),
  });
  const evaluation = {
    taskId,
    result,
    confidence: Number.isFinite(judgment.confidence) ? judgment.confidence : 0,
    citations,
    explanation: String(judgment.explanation || "").slice(0, 10000),
    modelId: MODEL,
    evaluatorVersion: EVALUATOR_VERSION,
    rubric: task.step.check.rubric,
    evidenceRevision: task.evidenceRevision || task.revision,
    submissionId: task.submissionId || "",
    taskRevision: task.revision,
    visibleTo: task.visibleTo,
    target: task.target,
    at: Date.now(),
  };
  await db.runTransaction(async (tx) => {
    const [current, old] = await Promise.all([
      tx.get(taskRef),
      tx.get(evaluationRef),
    ]);
    if (old.exists) return;
    if (
      current.data()?.evidenceRevision !== task.evidenceRevision ||
      current.data()?.versionId !== task.versionId ||
      current.data()?.reviewedAt !== task.reviewedAt ||
      ["waived", "cancelled"].includes(current.data()?.status)
    )
      fail("failed-precondition", "Evidence changed during assessment.");
    tx.create(evaluationRef, evaluation);
    if (result === "needs_review")
      tx.create(
        ref
          .collection("sopNotifications")
          .doc(hash([evidenceId, "review", task.managerId])),
        {
          recipientId: task.managerId,
          taskId,
          title: "SOP evidence needs human review",
          message: "Review submitted evidence against the approved rubric.",
          createdAt: Date.now(),
          severity: task.step.severity,
          read: false,
          pushStatus: "pending",
          nextAttemptAt: Date.now(),
        },
      );
    tx.update(taskRef, {
      result,
      status: result === "needs_review" ? "needs_review" : "completed",
      revision: current.data().revision + 1,
    });
  });
  await require("./runtime")
    .createSopRuntime(db)
    .evaluateTask(companyId, taskId);
  return evaluation;
}
exports.assessSopSubmission = onDocumentCreated(
  {
    document: "companies/{companyId}/sopSubmissions/{submissionId}",
    secrets: [key],
    timeoutSeconds: 150,
    memory: "512MiB",
    retry: true,
  },
  async (event) => {
    const submission = event.data?.data();
    if (!submission) return;
    const db = admin.firestore(),
      task = (
        await db
          .doc(`companies/${event.params.companyId}/tasks/${submission.taskId}`)
          .get()
      ).data();
    if (task?.step?.check.operator !== "narrative" || !submission.notes?.trim())
      return;
    try {
      await access(db, submission.actorId, event.params.companyId);
      await require("../shared/companyAccess").assertCompanyMemberForCallable(
        db,
        submission.actorId,
        event.params.companyId,
        "useOrson",
      );
    } catch {
      return;
    }
    await enforceFixedWindowLimits({
      db,
      admin,
      limits: [
        {
          namespace: "sopAutoAI",
          scope: `company:${event.params.companyId}`,
          limit: 30,
          windowMs: 60000,
          message: "SOP evaluator is queued.",
        },
      ],
    });
    await evaluateWrittenEvidence(
      db,
      submission.actorId,
      event.params.companyId,
      submission.taskId,
      submission.revision,
    );
  },
);
