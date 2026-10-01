const test = require('node:test');
const assert = require('node:assert/strict');
const { syncRiskAlerts, eventKey, hasRecovery } = require('./orsonAlertState');
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
  const run = (extra = {}) => syncRiskAlerts({ db, companyId: 'test-company', pondId: 'sim-b1', calculateRiskReport, timestamp: () => 'creation-time', priority: () => 'high', asOfDate: '2026-09-01', ...extra });
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
  await state.run({ asOfDate: '2026-09-04' });
  const original = state.alerts().find(alert => alert.data.riskId === 'heavy_rain_low_do');
  assert.equal(original.data.status, 'resolved');
  assert.equal(original.data.lastEvaluatedDate, '2026-09-04');
  state.pond.samplings.push({ id: 'dry-low-do', date: '2026-09-05', doMorning: '4.0' });
  await state.run({ asOfDate: '2026-09-05' });
  assert.equal(original.data.status, 'resolved', 'a later low-DO reading alone must not revive the old rain');
  state.pond.samplings.push({ id: 'new-rain', date: '2026-09-06', weatherEvent: 'heavy_rain', doMorning: '4.0' });
  await state.run({ asOfDate: '2026-09-06' });
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

test('weak-feed creation time survives duplicate evaluation, recovery, reload and ordering', async () => {
  const state = fixture();
  state.pond.samplings = [{ date: '2026-09-10', feedData: { feedingResponse: 'weak' } }];
  let now = 1000;
  const evaluate = asOfDate => state.run({ timestamp: () => now, asOfDate });
  await state.run({ timestamp: () => now, asOfDate: '2026-09-10', eventFindings: [{ id: 'weak_feeding_response', eventDate: '2026-09-10', severity: 'warning', title: 'Weak feeding', summary: 'Weak response', recommendation: 'Check response' }] });
  const original = state.alerts().find(alert => alert.data.riskId === 'weak_feeding_response');
  assert.ok(original);
  original.read = true;
  now = 2000;
  await evaluate('2026-09-10');
  assert.equal(original.createdAt, 1000);
  assert.equal(original.updatedAt, 2000);
  state.pond.samplings.push({ date: '2026-09-11', feedData: { feedingResponse: 'normal' } });
  now = 3000;
  await evaluate('2026-09-11');
  assert.equal(original.data.status, 'resolved');
  assert.equal(original.resolvedAt, 3000);
  assert.equal(original.createdAt, 1000);
  assert.equal(original.timestamp, 1000);
  assert.equal(original.read, true);
  now = 4000;
  await evaluate('2026-09-11');
  assert.equal(original.resolvedAt, 3000);
  const reloaded = JSON.parse(JSON.stringify(state.alerts()));
  const saved = reloaded.find(alert => alert.data.riskId === 'weak_feeding_response');
  assert.equal(saved.createdAt, 1000);
  const ordered = [saved, { timestamp: 2500, createdAt: 2500 }].sort((a, b) => b.timestamp - a.timestamp);
  assert.equal(ordered[1], saved);
  assert.equal(state.alerts().filter(alert => alert.data.riskId === 'weak_feeding_response').length, 1);
});

test('staleness alone makes an active finding historical but never resolves it', async () => {
  const state = fixture();
  // On 2026-09-01, rain event with DO 4.1 creates active alert
  await state.run({ asOfDate: '2026-09-01' });
  const alert = state.alerts().find(a => a.data.riskId === 'heavy_rain_low_do');
  assert.ok(alert);
  assert.equal(alert.data.status, 'active');

  // 14 days later on 2026-09-15, no new samplings exist.
  // The observation is stale.
  await state.run({ asOfDate: '2026-09-15', timestamp: () => 'later-time' });
  assert.equal(alert.data.status, 'historical', 'staleness transitions active alert to historical');
  assert.equal(alert.resolvedAt, undefined, 'staleness alone must not resolve the alert');
  assert.equal(alert.timestamp, 'creation-time', 'preserves original creation time');
});

test('stale normal data cannot resolve a newer warning', async () => {
  const state = fixture();
  // Normal reading on 2026-08-25, but low DO warning occurs on 2026-09-01
  state.pond.samplings.unshift({ id: 'old-normal', date: '2026-08-25', doMorning: '6.5', doEvening: '6.8' });
  await state.run({ asOfDate: '2026-09-01' });

  const alert = state.alerts().find(a => a.data.riskId === 'heavy_rain_low_do');
  assert.ok(alert);
  // Prior normal reading cannot resolve the newer warning
  assert.equal(alert.data.status, 'active');
  assert.equal(alert.resolvedAt, undefined);

  // Even after multiple evaluations, prior normal data cannot resolve it
  await state.run({ asOfDate: '2026-09-02' });
  assert.notEqual(alert.data.status, 'resolved', 'prior normal data must not resolve a newer warning');
});

test('stale later normal data cannot resolve an alert evaluated when data is stale', async () => {
  const state = fixture();
  await state.run({ asOfDate: '2026-09-01' });
  const alert = state.alerts().find(a => a.data.riskId === 'heavy_rain_low_do');
  assert.ok(alert);
  assert.equal(alert.data.status, 'active');

  // A normal reading was taken on 2026-09-03, but evaluation is performed as of 2026-09-25 (22 days later)
  state.pond.samplings.push({ id: 'stale-normal', date: '2026-09-03', doMorning: '6.2', doEvening: '6.5' });
  await state.run({ asOfDate: '2026-09-25' });

  // On 2026-09-25, 2026-09-03 is 22 days old (> 7 days, stale).
  // Stale normal data cannot resolve the alert.
  assert.equal(alert.data.status, 'historical');
  assert.equal(alert.resolvedAt, undefined, 'stale normal measurement cannot resolve the alert');
});

test('alert recovery compares exact observations using the company-local calendar date', () => {
  const record = {
    id: 'jakarta-recovery',
    measuredAt: '2026-09-01T17:30:00Z', // 2026-09-02 00:30 in Jakarta
    doMorning: 6.2,
    doEvening: 6.4,
  };

  assert.equal(hasRecovery([record], 'low_do', '2026-09-01', {
    asOfDate: '2026-09-02T01:00:00Z',
    timeZone: 'Asia/Jakarta',
  }), true);
  assert.equal(hasRecovery([record], 'low_do', '2026-09-01', {
    asOfDate: '2026-09-02T01:00:00Z',
    timeZone: 'UTC',
  }), false, 'the same measurement remains on the source day in UTC');
});

test('substandard or partial later measurement does not resolve alert', async () => {
  const state = fixture();
  await state.run({ asOfDate: '2026-09-01' });
  const alert = state.alerts().find(a => a.data.riskId === 'heavy_rain_low_do');
  assert.ok(alert);

  // Later measurement on 2026-09-04 has evening DO drop below 5 (4.2 mg/L)
  state.pond.samplings.push({ id: 'partial-recovery', date: '2026-09-04', doMorning: '5.8', doEvening: '4.2' });
  await state.run({ asOfDate: '2026-09-04' });

  assert.notEqual(alert.data.status, 'resolved', 'measurement with evening DO < 5 does not resolve low DO');
});

test('read state and creation time survive updates and transitions', async () => {
  const state = fixture();
  await state.run({ asOfDate: '2026-09-01', timestamp: () => 1000 });
  const alert = state.alerts().find(a => a.data.riskId === 'heavy_rain_low_do');
  assert.ok(alert);
  alert.read = true;

  // Stale transition
  await state.run({ asOfDate: '2026-09-15', timestamp: () => 2000 });
  assert.equal(alert.read, true, 'read state is preserved across transitions');
  assert.equal(alert.createdAt, 1000, 'createdAt is preserved');
  assert.equal(alert.timestamp, 1000, 'timestamp is preserved');
  assert.equal(alert.updatedAt, 2000, 'updatedAt is updated');

  // Genuine recovery
  state.pond.samplings.push({ id: 'genuine-rec', date: '2026-09-16', doMorning: '6.0', doEvening: '6.2' });
  await state.run({ asOfDate: '2026-09-16', timestamp: () => 3000 });
  assert.equal(alert.data.status, 'resolved');
  assert.equal(alert.read, true, 'read state is preserved on resolution');
  assert.equal(alert.createdAt, 1000);
  assert.equal(alert.resolvedAt, 3000);

  // Further evaluation does not overwrite resolvedAt or read
  await state.run({ asOfDate: '2026-09-17', timestamp: () => 4000 });
  assert.equal(alert.data.status, 'resolved');
  assert.equal(alert.read, true);
  assert.equal(alert.createdAt, 1000);
  assert.equal(alert.resolvedAt, 3000);
});
