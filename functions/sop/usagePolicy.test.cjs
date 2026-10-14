const test = require("node:test");
const assert = require("node:assert/strict");
const { nextSopCheckAt, ROUTINE_CHECK_MS, SAFETY_CHECK_MS } = require("./usagePolicy");
const adoption = (minutes = 120, severity = "warning") => ({ definition: { steps: [{ severity, trigger: { windowMinutes: minutes } }] } });
const settled = { caughtUp: true };
test("routine cadence is hardwired at thirty minutes across SOP timers", () => {
  for (const minutes of [60, 120, 1440])
    assert.equal(nextSopCheckAt(adoption(minutes), 1000, settled), 1000 + ROUTINE_CHECK_MS);
});
test("critical and short-window SOPs retain the minute safety cadence", () => {
  assert.equal(nextSopCheckAt(adoption(120, "critical"), 1000, settled), 1000 + SAFETY_CHECK_MS);
  assert.equal(nextSopCheckAt(adoption(30), 1000, settled), 1000 + SAFETY_CHECK_MS);
});
test("creation and paginated work cannot wait thirty minutes", () => {
  for (const key of ["createdTasks", "moreTasks", "baselinePending"])
    assert.equal(nextSopCheckAt(adoption(), 1000, { ...settled, [key]: true }), 1000 + SAFETY_CHECK_MS);
  assert.equal(nextSopCheckAt(adoption(), 1000, { caughtUp: false }), 1000);
});

test("manual waits cannot suppress a deadline, submission, assignment or rule change", () => {
  const {canWaitForManualTask}=require("./usagePolicy");
  const task={step:{check:{field:"manual"},severity:"warning"},purpose:"routine",revision:2,
    nextEvaluationAt:2000,evaluatedTaskRevision:2,evaluatedAdoptionRevision:3};
  assert.equal(canWaitForManualTask(task,{revision:3},1000),true);
  assert.equal(canWaitForManualTask(task,{revision:3},2000),false);
  for(const change of [{submittedAt:1},{revision:3},{issueId:"issue"},{requiresHumanReview:true},
      {step:{check:{field:"manual"},severity:"critical"}},{step:{check:{field:"water.doMorning"},severity:"warning"}}])
    assert.equal(canWaitForManualTask({...task,...change},{revision:3},1000),false);
  assert.equal(canWaitForManualTask(task,{revision:4},1000),false);
});

test("automatic no-input waits are invalidated by source changes and temporal eligibility", () => {
  const {canWaitForTask}=require("./usagePolicy");
  const task={step:{check:{field:"water.doMorning"},severity:"warning"},purpose:"routine",revision:2,
    nextEvaluationAt:2000,evaluationInputEmpty:true,evaluatedTaskRevision:2,evaluatedAdoptionRevision:3,evaluatedWakeRevision:4};
  assert.equal(canWaitForTask(task,{revision:3,wakeRevision:4},1000),true);
  assert.equal(canWaitForTask(task,{revision:3,wakeRevision:5},1000),false);
  assert.equal(canWaitForTask({...task,evaluationInputEmpty:false},{revision:3,wakeRevision:4},1000),false);
  assert.equal(canWaitForTask(task,{revision:3,wakeRevision:4},2000),false);
});
