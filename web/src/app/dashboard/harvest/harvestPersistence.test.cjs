const assert = require('node:assert/strict');
const { test } = require('node:test');
require('../../../../../scripts/register-typescript.cjs');
const { serverTimestamp, Timestamp } = require('firebase/firestore');
const { prepareHarvestWriteData, isValidHarvestDate, getHarvestSaveError, HarvestSaveError } = require('./harvestPersistence.ts');

test('the complete write boundary removes nested undefined while retaining null, zero and SDK values', () => {
  const transform = serverTimestamp();
  const timestamp = Timestamp.fromMillis(1234);
  const source = { createdAt: transform, timestamp, missing: undefined, zero: 0, baseline: null,
    ponds: [{ biomass: '123', partialHarvestNumber: undefined, nested: { optional: undefined, valid: 1 } }] };
  const cleaned = prepareHarvestWriteData(source);
  assert.deepEqual(cleaned.ponds, [{ biomass: '123', nested: { valid: 1 } }]);
  assert.equal(cleaned.createdAt, transform);
  assert.equal(cleaned.timestamp, timestamp);
  assert.equal(cleaned.zero, 0);
  assert.equal(cleaned.baseline, null);
  assert.equal(Object.hasOwn(cleaned, 'missing'), false);
  assert.equal(Object.hasOwn(source.ponds[0], 'partialHarvestNumber'), true, 'source is not mutated');
});
test('non-finite totals anywhere in a write fail before persistence', () => {
  for (const invalid of [NaN, Infinity, -Infinity]) {
    assert.throws(() => prepareHarvestWriteData({ ponds: [{ total: invalid }] }), HarvestSaveError);
  }
});
test('harvest dates require an actual calendar day at or before the farm date', () => {
  for (const date of ['', '2026-02-31', '2026-13-01', '2026-10-02', 'not-a-date']) {
    assert.equal(isValidHarvestDate(date, '2026-10-01'), false);
  }
  assert.equal(isValidHarvestDate('2026-10-01', '2026-10-01'), true);
  assert.equal(isValidHarvestDate('2024-02-29', '2026-10-01'), true);
});
test('save errors give actionable guidance and do not expose raw SDK internals', () => {
  const copy = text => text;
  assert.match(getHarvestSaveError({ code: 'firestore/permission-denied' }, 'Failed', copy), /company owner/);
  assert.match(getHarvestSaveError({ code: 'unauthenticated' }, 'Failed', copy), /Sign in again/);
  for (const code of ['unavailable', 'deadline-exceeded']) {
    assert.match(getHarvestSaveError({ code }, 'Failed', copy), /connection and retry/);
  }
  for (const code of ['aborted', 'failed-precondition']) {
    assert.match(getHarvestSaveError({ code }, 'Failed', copy), /latest pond data/);
  }
  assert.equal(getHarvestSaveError(new Error('SDK details'), 'Failed', copy), 'Failed');
  assert.equal(getHarvestSaveError({ code: 'invalid-argument', message: 'SDK details' }, 'Failed', copy), 'Failed (invalid-argument)');
  assert.equal(getHarvestSaveError(new HarvestSaveError('Choose a valid date'), 'Failed', copy), 'Choose a valid date');
});
