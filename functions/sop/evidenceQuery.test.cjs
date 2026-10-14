const test = require('node:test');
const assert = require('node:assert/strict');
const { evidenceBounds } = require('./evidenceQuery');
const { evaluateSopStep, localInstant, farmDate } = require('../shared/orsonDomain/sop/engine');
const { emptySopStep } = require('../shared/orsonDomain/sop/contracts');
test('bounded evidence keeps the evaluator result and evidence identities across date, instant and trend checks', () => {
  for (const zone of ['UTC', 'Australia/Melbourne', 'America/Los_Angeles']) {
    const now = localInstant('2026-10-14', '12:00', zone), start = now - 6 * 3600000, end = now + 18 * 3600000;
    const target = { id: 'pond', cycleId: 'cycle' };
    const evidence = [];
    for (let offset = -48; offset <= 36; offset += 3) {
      const instant = now + offset * 3600000, date = farmDate(instant, zone);
      for (const observedAt of [instant, null]) evidence.push({ id: `${offset}-${observedAt}`, revision: 'r1', field: 'water.doMorning', targetId: 'pond', cycleId: 'cycle', sourcePath: 'ponds/pond', observedAt, date, precision: observedAt === null ? 'date' : 'instant', value: 6, unit: 'mg/L', deleted: false, estimated: false });
    }
    for (const exactTime of [false, true]) for (const operator of ['range', 'present', 'count', 'trend', 'sequence']) {
      const step = { ...emptySopStep(), check: { ...emptySopStep().check, min: 5, max: 8, minCount: 2, operator, exactTime, freshnessMinutes: 1440 } };
      const bounds = evidenceBounds(step, start, end, now, zone);
      const selected = evidence.filter(item => item.observedAt === null
        ? !exactTime && item.date >= bounds.dateStart && item.date <= bounds.dateEnd
        : item.observedAt >= bounds.instantStart && item.observedAt <= bounds.instantEnd);
      const context = { target, start, end, now, timeZone: zone };
      const before = evaluateSopStep(step, evidence, context), after = evaluateSopStep(step, selected, context);
      assert.equal(after.result, before.result, `${zone}: ${operator} exact=${exactTime}`);
      assert.equal(after.recorded, before.recorded);
      assert.deepEqual(after.evidenceIds, before.evidenceIds);
    }
  }
});
