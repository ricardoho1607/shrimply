import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createHarvestOperation,
  groupHarvestEntriesByDate,
  isHarvestOperation,
  isValidHarvestDateKey,
} from './harvestOperation';

test('groupHarvestEntriesByDate: groups entries with equal dates into one date group', () => {
  const entries = [
    { pondId: 'p1', date: '2026-09-15', biomass: '100' },
    { pondId: 'p2', date: '2026-09-15', biomass: '200' },
  ];
  const grouped = groupHarvestEntriesByDate(entries, '2026-09-17');
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].date, '2026-09-15');
  assert.equal(grouped[0].entries.length, 2);
  assert.deepEqual(grouped[0].entries.map((e) => e.pondId), ['p1', 'p2']);
});

test('groupHarvestEntriesByDate: groups entries with mixed dates into distinct date groups', () => {
  const entries = [
    { pondId: 'p1', date: '2026-09-14', biomass: '100' },
    { pondId: 'p2', date: '2026-09-15', biomass: '200' },
    { pondId: 'p3', date: '2026-09-14', biomass: '300' },
  ];
  const grouped = groupHarvestEntriesByDate(entries, '2026-09-17');
  assert.equal(grouped.length, 2);
  assert.equal(grouped[0].date, '2026-09-14');
  assert.deepEqual(grouped[0].entries.map((e) => e.pondId), ['p1', 'p3']);
  assert.equal(grouped[1].date, '2026-09-15');
  assert.deepEqual(grouped[1].entries.map((e) => e.pondId), ['p2']);
});

test('groupHarvestEntriesByDate: rejects duplicate pond across different dates', () => {
  const entries = [
    { pondId: 'p1', date: '2026-09-14' },
    { pondId: 'p1', date: '2026-09-15' },
  ];
  assert.throws(
    () => groupHarvestEntriesByDate(entries, '2026-09-17'),
    /Duplicate pond in harvest entries: p1/,
  );
});

test('groupHarvestEntriesByDate: rejects duplicate pond on the same date', () => {
  const entries = [
    { pondId: 'p1', date: '2026-09-14' },
    { pondId: 'p1', date: '2026-09-14' },
  ];
  assert.throws(
    () => groupHarvestEntriesByDate(entries, '2026-09-17'),
    /Duplicate pond in harvest entries: p1/,
  );
});

test('groupHarvestEntriesByDate: rejects invalid date formats and non-real calendar dates', () => {
  const today = '2026-09-17';
  const invalidDates = [
    '2026-9-15', // non-padded month
    '2026-09-1', // non-padded day
    '2026/09/15', // wrong delimiter
    'invalid',
    '',
    '2026-02-29', // 2026 is not a leap year
    '2026-04-31', // April has 30 days
    '2026-13-01', // month out of range
    '2026-00-10', // month 0
    '2026-07-32', // day 32
  ];

  for (const badDate of invalidDates) {
    assert.throws(
      () => groupHarvestEntriesByDate([{ pondId: 'p1', date: badDate }], today),
      /Invalid harvest date/,
      `Should reject invalid date: ${badDate}`,
    );
  }
});

test('groupHarvestEntriesByDate: accepts valid leap day and today date', () => {
  const leapDayEntries = [{ pondId: 'p1', date: '2024-02-29' }];
  const leapResult = groupHarvestEntriesByDate(leapDayEntries, '2024-03-01');
  assert.equal(leapResult.length, 1);
  assert.equal(leapResult[0].date, '2024-02-29');

  const todayEntries = [{ pondId: 'p1', date: '2026-09-17' }];
  const todayResult = groupHarvestEntriesByDate(todayEntries, '2026-09-17');
  assert.equal(todayResult.length, 1);
  assert.equal(todayResult[0].date, '2026-09-17');
});

test('groupHarvestEntriesByDate: rejects future dates strictly after today', () => {
  const futureEntries = [{ pondId: 'p1', date: '2026-09-18' }];
  assert.throws(
    () => groupHarvestEntriesByDate(futureEntries, '2026-09-17'),
    /Harvest date cannot be in the future: 2026-09-18/,
  );
});

test('groupHarvestEntriesByDate: rejects invalid today date parameter', () => {
  assert.throws(
    () => groupHarvestEntriesByDate([{ pondId: 'p1', date: '2026-09-15' }], 'invalid-today'),
    /Invalid today date/,
  );
});

test('groupHarvestEntriesByDate: rejects missing or empty pondId', () => {
  assert.throws(
    () => groupHarvestEntriesByDate([{ pondId: '', date: '2026-09-15' }], '2026-09-17'),
    /Harvest entry must specify a pondId/,
  );
  assert.throws(
    () => groupHarvestEntriesByDate([{ pondId: '   ', date: '2026-09-15' }], '2026-09-17'),
    /Harvest entry must specify a pondId/,
  );
});

test('createHarvestOperation: strips UI-only date fields from saved record ponds while keeping caller input intact', () => {
  const callerPonds = [{ pondId: 'p1', date: '2026-09-15', biomass: '100' }];
  const callerRecord = { id: 'rec-1', date: '2026-09-15', ponds: callerPonds };

  const operation = createHarvestOperation('op-1', [callerRecord]);

  assert.equal('date' in operation.records[0].ponds[0], false, 'UI-only date must be stripped from operation record pond');
  assert.equal((operation.records[0].ponds[0] as any).pondId, 'p1');
  assert.equal((operation.records[0].ponds[0] as any).biomass, '100');
  assert.equal(callerPonds[0].date, '2026-09-15', 'Caller input object must remain unmodified');
});

test('createHarvestOperation: mutation of caller input cannot change frozen operation', () => {
  const originalPond = { pondId: 'p1', date: '2026-09-15', biomass: '100' };
  const originalPonds = [originalPond];
  const originalRecord = { id: 'rec-1', date: '2026-09-15', ponds: originalPonds };
  const records = [originalRecord];
  const previousRecord = { id: 'rec-prev', date: '2026-09-10', ponds: [{ pondId: 'p1', biomass: '80' }] };

  const operation = createHarvestOperation('op-1', records, previousRecord);

  // Mutate caller input arrays and objects
  records.push({ id: 'rec-2', date: '2026-09-16', ponds: [] });
  originalRecord.date = '2026-09-99';
  originalPonds.push({ pondId: 'p2', date: '2026-09-15', biomass: '200' });
  originalPond.biomass = '999';
  previousRecord.date = '2026-09-01';

  // Verify frozen operation is untouched
  assert.equal(operation.records.length, 1);
  assert.equal(operation.records[0].date, '2026-09-15');
  assert.equal(operation.records[0].ponds.length, 1);
  assert.equal((operation.records[0].ponds[0] as any).biomass, '100');
  assert.equal(operation.previousRecord?.date, '2026-09-10');
});

test('createHarvestOperation: frozen operation cannot be mutated directly', () => {
  const operation = createHarvestOperation('op-1', [
    { id: 'rec-1', date: '2026-09-15', ponds: [{ pondId: 'p1', biomass: '100' }] },
  ], { id: 'rec-0', date: '2026-09-10', ponds: [{ pondId: 'p1', biomass: '50' }] });

  assert.throws(() => {
    (operation as any).id = 'op-changed';
  }, TypeError);

  assert.throws(() => {
    (operation.records as any).push({ id: 'rec-2', date: '2026-09-16', ponds: [] });
  }, TypeError);

  assert.throws(() => {
    (operation.records[0] as any).date = '2026-09-99';
  }, TypeError);

  assert.throws(() => {
    (operation.records[0].ponds as any).push({ pondId: 'p2', biomass: '50' });
  }, TypeError);

  assert.throws(() => {
    (operation.records[0].ponds[0] as any).biomass = '999';
  }, TypeError);

  assert.throws(() => {
    (operation.previousRecord as any).date = '2026-09-01';
  }, TypeError);
});

test('createHarvestOperation: single-record caller input stays compatible', () => {
  const singleRecord = { id: 'rec-1', date: '2026-09-15', ponds: [{ pondId: 'p1' }] };
  const prevRecord = { id: 'rec-prev', date: '2026-09-10', ponds: [{ pondId: 'p1' }] };

  const operation = createHarvestOperation('op-single', singleRecord, prevRecord);

  assert.equal(operation.id, 'op-single');
  assert.equal(Array.isArray(operation.records), true);
  assert.equal(operation.records.length, 1);
  assert.equal(operation.records[0].id, 'rec-1');
  assert.equal(operation.previousRecord?.id, 'rec-prev');
});

test('isHarvestOperation: validates operation shape correctly', () => {
  assert.equal(isHarvestOperation(null), false);
  assert.equal(isHarvestOperation(undefined), false);
  assert.equal(isHarvestOperation('not-an-op'), false);
  assert.equal(isHarvestOperation({}), false);
  assert.equal(isHarvestOperation({ id: '', records: [] }), false);
  assert.equal(isHarvestOperation({ id: 'op-1', records: 'not-array' }), false);
  assert.equal(isHarvestOperation({ id: 'op-1', records: [{ id: 'r1' }] }), false);
  assert.equal(isHarvestOperation({ id: 'op-1', records: [{ id: 'r1', date: '2026-09-15', ponds: 'bad' }] }), false);

  const validOp = createHarvestOperation('op-1', [{ id: 'r1', date: '2026-09-15', ponds: [{ pondId: 'p1' }] }]);
  assert.equal(isHarvestOperation(validOp), true);

  assert.equal(isHarvestOperation({ ...validOp, previousRecord: { id: 123 } }), false);
  assert.equal(isHarvestOperation({ ...validOp, previousRecord: { id: 'prev', date: '2026-09-10', ponds: [] } }), true);
});

test('isValidHarvestDateKey: validates calendar dates strictly', () => {
  assert.equal(isValidHarvestDateKey('2026-09-17'), true);
  assert.equal(isValidHarvestDateKey('2024-02-29'), true);
  assert.equal(isValidHarvestDateKey('2026-02-29'), false);
  assert.equal(isValidHarvestDateKey('2026-04-31'), false);
  assert.equal(isValidHarvestDateKey('2026-13-01'), false);
  assert.equal(isValidHarvestDateKey('2026-09-5'), false);
  assert.equal(isValidHarvestDateKey(null), false);
  assert.equal(isValidHarvestDateKey(12345), false);
});
