const assert = require('node:assert/strict');
const test = require('node:test');
const { loadCallback } = require('../../scripts/test-module.cjs');
function fixture(save = async () => true) {
 const lock = { current: false }, alerts = [];
 let closed = false, submitting = false;
 const cycle = { id: 'cycle', cycleName: 'Current', status: 'active' };
 const callback = loadCallback('features/pond-management/usePondManagementPondActions.ts', 'handleAddCycle', {
  currentCompanyId: "farm", assertSopStageGate: async () => {},
  submitLockRef: lock, setIsSubmitting: value => { submitting = value; },
  canManagePonds: true, canManageFarmCycle: true, isEnterpriseFarm: false,
  formData: { cyclePondId: 'physical', cycleId: 'cycle', density: '10', supplier: 'Hatchery', plValue: '10', cycleStartMode: 'new', docStart: new Date('2026-10-01') },
  cycles: [cycle], openAccessibleFarmCycles: [cycle], activeFarmCycle: cycle,
  startablePondOptions: [{ id: 'physical', pondName: 'A1', pondArea: 100 }], activePhysicalPondNames: new Set(),
  formatLocalDateKey: () => '2026-10-01', getPhysicalPondKey: name => name.toLowerCase(), convertPlToGrams: () => 1,
  addPond: save, updateFarmCycle: async () => {}, setSelectedDashboardCycleId() {}, setCycleFilter() {},
  closeModal() { if (!lock.current) closed = true; },
  Alert: { alert: (...args) => alerts.push(args) },
  t: { messages: { error: 'Error', success: 'Success', networkError: 'Network error' }, farmCycle: { cycleStartedSuccess: '{{pondName}} started' } },
 });
 return { callback, lock, alerts, get closed() { return closed; }, get submitting() { return submitting; } };
}
test('successful durable cycle save unlocks before closing the form', async () => {
 const f = fixture(); await f.callback();
 assert.equal(f.closed, true); assert.equal(f.lock.current, false); assert.equal(f.submitting, false);
 assert.deepEqual(Array.from(f.alerts[0]), ['Success', 'A1 started']);
});
test('rejected cycle save keeps the form open and releases its submit lock', async () => {
 const f = fixture(async () => { throw new Error('Disk full'); }); await f.callback();
 assert.equal(f.closed, false); assert.equal(f.lock.current, false); assert.equal(f.submitting, false);
 assert.deepEqual(Array.from(f.alerts[0]), ['Error', 'Disk full']);
});
