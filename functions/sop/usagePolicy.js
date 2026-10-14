"use strict";
// Fixed platform policy: SOP authors cannot change the routine scheduler cadence.
const ROUTINE_CHECK_MS = 30 * 60 * 1000;
const SAFETY_CHECK_MS = 60 * 1000;
function nextSopCheckAt(adoption, now, work) {
  if (!work.caughtUp) return now;
  const followUp = work.createdTasks || work.moreTasks || work.baselinePending;
  const critical = adoption.definition.steps.some((step) => step.severity === "critical");
  // Short windows must keep the existing safety cadence, regardless of severity.
  const shortWindow = adoption.definition.steps.some((step) =>
    Number.isFinite(step.trigger?.windowMinutes) && step.trigger.windowMinutes < 60);
  return now + (followUp || critical || shortWindow ? SAFETY_CHECK_MS : ROUTINE_CHECK_MS);
}
function canWaitForTask(task, adoption, now) {
  const unchanged = task.step?.severity !== "critical" && task.purpose === "routine" &&
    !task.issueId && !task.submittedAt && !task.requiresHumanReview &&
    task.nextEvaluationAt > now && task.evaluatedTaskRevision === task.revision &&
    task.evaluatedAdoptionRevision === (adoption.revision || 0);
  return unchanged && (task.step?.check.field === "manual" ||
    (task.evaluationInputEmpty === true && task.evaluatedWakeRevision === (adoption.wakeRevision || 0)));
}
function canWaitForManualTask(task, adoption, now) {
  return task.step?.check.field === "manual" && canWaitForTask(task, adoption, now);
}
module.exports = { ROUTINE_CHECK_MS, SAFETY_CHECK_MS, nextSopCheckAt, canWaitForTask, canWaitForManualTask };
