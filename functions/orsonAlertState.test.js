const test = require('node:test');
const assert = require('node:assert/strict');
const { syncRiskAlerts, eventKey } = require('./orsonAlertState');
process.env.NODE_ENV = 'test';
const { calculateRiskReport } = require('./orson').__test;

const fixture = () => {
  const documents = new Map();
  const pond = { pondName: 'SIM-B1', pondCycleId: 'cycle-1', samplings: [
    { id: 'rain', date: '2026-09-01', weatherEvent: 'heavy_rain', doMorning: '4.1', doEvening: '4.4' },
  ] };
  documents.set('companies/test-company/ponds/sim-b1', pond);
  const reference = (path, filters = []) => ({
    path, filters, collection: name => reference(`${path}/${name}`), doc: id => reference(`${path}/${id}`),
    where: (field, op, value) => reference(path, [...filters, [field, value]]),
  });
  const snapshot = (path, value) => ({ id: path.split('/').pop(), exists: value !== undefined, ref: reference(path), data: () => structuredClone(value) });
  let queue = Promise.resolve();
  const db = {
    collection: name => reference(name),
    runTransaction: callback => {
      const result = queue.then(() => callback({
        get: async ref => ref.filters.length ? { docs: [...documents].filter(([path, data]) => path.startsWith(`${ref.path}/`) && ref.filters.every(([key, value]) => data[key] === value)).map(([path, data]) => snapshot(path, data)) } : snapshot(ref.path, documents.get(ref.path)),
        set: (ref, value) => documents.set(ref.path, structuredClone(value)),
        update: (ref, patch) => { const value = documents.get(ref.path); for (const [key, next] of Object.entries(patch)) { const [parent, child] = key.split('.'); if (child) value[parent][child] = next; else value[parent] = next; } },
      }));
      queue = result.catch(() => {});
      return result;
    },
  };
  const run = (extra = {}) => syncRiskAlerts({ db, companyId: 'test-company', pondId: 'sim-b1', calculateRiskReport, timestamp: () => 'creation-time', priority: () => 'high', ...extra });
  const alerts = () => [...documents].filter(([path]) => path.startsWith('notifications/')).map(([, data]) => data);
  return { documents, pond, run, alerts };
};

test('concurrent/repeated evaluations and read state create one alert for an event', async () => {
  const state = fixture();
  await Promise.all([state.run(), state.run(), state.run()]);
  const rainAlerts = () => state.alerts().filter(alert => alert.data.riskId === 'heavy_rain_low_do');
  assert.equal(rainAlerts().length, 1);
  rainAlerts()[0].read = true;
  await state.run();
  assert.equal(rainAlerts().length, 1);
  assert.equal(rainAlerts()[0].timestamp, 'creation-time');
  assert.equal(rainAlerts()[0].data.sourceDate, '2026-09-01');
});

test('recovery resolves the original alert; a new rain event creates a new alert', async () => {
  const state = fixture();
  await state.run();
  state.pond.samplings.push({ id: 'recovery', date: '2026-09-04', doMorning: '6.1', doEvening: '6.6' });
  await state.run();
  const original = state.alerts().find(alert => alert.data.riskId === 'heavy_rain_low_do');
  assert.equal(original.data.status, 'resolved');
  assert.equal(original.data.lastEvaluatedDate, '2026-09-04');
  state.pond.samplings.push({ id: 'dry-low-do', date: '2026-09-05', doMorning: '4.0' });
  await state.run();
  assert.equal(original.data.status, 'resolved', 'a later low-DO reading alone must not revive the old rain');
  state.pond.samplings.push({ id: 'new-rain', date: '2026-09-06', weatherEvent: 'heavy_rain', doMorning: '4.0' });
  await state.run();
  assert.equal(state.alerts().filter(alert => alert.data.riskId === 'heavy_rain_low_do').length, 2);
  assert.equal(state.alerts().find(alert => alert.data.sourceDate === '2026-09-06').data.status, 'active');
});

test('backfilled events remain history without reviving a resolved warning', async () => {
  const state = fixture();
  state.pond.samplings.push({ date: '2026-09-04', doMorning: '6.1' });
  const historical = { id: 'weak_feeding_response', title: 'Weak response', summary: 'On 2026-09-01', recommendation: 'Review', eventDate: '2026-09-01', severity: 'warning' };
  await state.run({ eventFindings: [historical] });
  assert.equal(state.alerts().find(alert => alert.data.riskId === historical.id).data.status, 'historical');
});

test('alert identity isolates company, pond, cycle and event date', () => {
  const finding = { id: 'rain', eventDate: '2026-09-01' };
  const keys = [eventKey('A', 'P', 'C', finding), eventKey('B', 'P', 'C', finding), eventKey('A', 'Q', 'C', finding), eventKey('A', 'P', 'D', finding), eventKey('A', 'P', 'C', { ...finding, eventDate: '2026-09-02' })];
  assert.equal(new Set(keys).size, 5);
});

test('legacy alerts deduplicate using pond, event, and a preserved source-record date', async () => {
  const state = fixture();
  state.documents.set('notifications/legacy-rain', {
    companyId: 'test-company',
    pondId: 'sim-b1',
    type: 'orson_risk',
    message: 'Heavy rain and low DO detected.',
    data: { pondId: 'sim-b1', riskId: 'heavy_rain_low_do' },
    orsonRiskReport: { findings: [{ id: 'heavy_rain_low_do', eventDate: '2026-09-01' }] },
  });

  await state.run();
  assert.equal(state.alerts().filter(alert => alert.data.riskId === 'heavy_rain_low_do').length, 1);
});
