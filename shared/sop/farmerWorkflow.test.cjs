const test = require('node:test');
const assert = require('node:assert/strict');
const { emptySopStep } = require('./contracts.ts');
const { sopTaskMatchesView } = require('./presentation.ts');
const { waterTaskLink, waterTaskContext, assertWaterTaskPond } = require('./farmerWorkflow.ts');
const { farmLocalInput, farmLocalToIso } = require('./observationTimes.ts');
const now = Date.parse('2026-10-22T01:00:00Z');
function task(changes = {}) {
  return { id: 'task-a', title: 'Read nitrite', purpose: 'routine', status: 'open', result: 'insufficient_evidence',
    step: {...emptySopStep(), check: {...emptySopStep().check, field: 'water.nitriteMgL'}},
    target: {scope: 'pond', pondId: 'pond-a', cycleId: 'cycle-a', name: 'A1'},
    windowStart: Date.parse('2026-10-12T13:00:00Z'), dueAt: Date.parse('2026-10-13T12:59:59Z'), ...changes };
}
test('reading links support rechecks and range checks without routing corrective actions or finished work to entry', () => {
  for (const purpose of ['routine', 'recheck']) assert.equal(waterTaskLink(task({purpose})), '/dashboard/water?sopTaskId=task-a');
  for (const purpose of ['corrective', 'manual']) assert.equal(waterTaskLink(task({purpose})), null);
  for (const status of ['completed','waived','cancelled','submitted','needs_review']) assert.equal(waterTaskLink(task({status})), null);
});
test('overdue reading carries farm date, cycle, field, window and task identity from the loaded task', () => {
  const context = waterTaskContext(task(), 'Australia/Melbourne');
  assert.equal(context.date, '2026-10-13');
  assert.equal(context.pondId, 'pond-a');
  assert.equal(context.cycleId, 'cycle-a');
  assert.equal(context.field, 'nitriteMgL');
  assert.equal(context.taskId, 'task-a');
  assert.doesNotThrow(() => assertWaterTaskPond(context, {id:'pond-a', pondCycleId:'cycle-a'}));
  assert.throws(() => assertWaterTaskPond(context, {id:'pond-a', pondCycleId:'new-cycle'}));
  assert.throws(() => assertWaterTaskPond(context, {id:'pond-a', pondCycleId:'cycle-a',cycleStatus:'ended'}));
  assert.throws(() => assertWaterTaskPond(context, undefined));
});
test('needs attention combines today and overdue action, separates manager review and future work', () => {
  assert.equal(sopTaskMatchesView(task(), 'attention', now, 'Australia/Melbourne'), true);
  assert.equal(sopTaskMatchesView(task({windowStart: now}), 'attention', now, 'Australia/Melbourne'), true);
  assert.equal(sopTaskMatchesView(task({windowStart: now + 86400000}), 'attention', now, 'Australia/Melbourne'), false);
  for (const status of ['submitted', 'needs_review']) {
    assert.equal(sopTaskMatchesView(task({status}), 'attention', now, 'Australia/Melbourne'), false);
    assert.equal(sopTaskMatchesView(task({status}), 'review', now, 'Australia/Melbourne'), true);
  }
  assert.equal(sopTaskMatchesView(task({status:'completed'}), 'attention', now, 'Australia/Melbourne'), false);
});
test('calendar input round trips in the farm timezone, not the computer timezone', () => {
  assert.equal(farmLocalInput('2026-10-12T23:30:00Z','Asia/Jakarta'), '2026-10-13T06:30');
  assert.equal(farmLocalToIso('2026-10-13T06:30','Asia/Jakarta'), '2026-10-12T23:30:00.000Z');
  assert.equal(farmLocalToIso('2026-10-22T12:00','Australia/Melbourne'), '2026-10-22T01:00:00.000Z');
  assert.equal(farmLocalToIso('', 'Asia/Jakarta'), '');
  assert.throws(() => farmLocalToIso('2026-02-30T06:00','Asia/Jakarta'));
  assert.throws(() => farmLocalToIso('2026-10-04T02:30','Australia/Melbourne'), /clock change/);
});
