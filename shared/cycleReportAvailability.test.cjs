const test = require('node:test');
const assert = require('node:assert/strict');
const { getReportableCycles } = require('./cycleReportAvailability.ts');

test('an ended pond exposes its still-active cycle without waiting for other ponds', () => {
  const cycles = [{ id: 'running', status: 'active' }, { id: 'closed', status: 'closed' }, { id: 'other', status: 'active' }];
  const ponds = [{ cycleId: 'running', cycleStatus: 'ended' }, { cycleId: 'running', cycleStatus: 'active' }, { cycleId: 'other', cycleStatus: 'active' }];
  assert.deepEqual(getReportableCycles(cycles, ponds).map(c => c.id), ['running', 'closed']);
  assert.equal(cycles[0].status, 'active');
});
test('unassigned, missing-status and active pond runs do not expose unrelated cycles', () => {
  assert.deepEqual(getReportableCycles([{ id: 'a', status: 'stocking' }], [{ cycleStatus: 'ended' }, { cycleId: 'a' }, { cycleId: 'a', cycleStatus: 'active' }]), []);
});
test('disease/reset closures qualify, and fully closed historical cycles remain available', () => {
  const cycles = [{ id: 'a', status: 'closing' }, { id: 'old', status: 'closed' }];
  assert.deepEqual(getReportableCycles(cycles, [{ cycleId: 'a', cycleStatus: 'ended', cycleEndReason: 'disease' }]), cycles);
});
