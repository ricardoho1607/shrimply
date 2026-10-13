const assert = require('node:assert/strict');
const test = require('node:test');
const { removeUndefinedFields } = require('./firestoreData.ts');
test('Firestore cleaning removes nested undefined values without replacing valid zero or null', () => {
 assert.deepEqual(removeUndefinedFields({ missing: undefined, nested: { missing: undefined, zero: 0, absent: null }, list: [undefined, 0, null, { missing: undefined, value: 2 }] }), { nested: { zero: 0, absent: null }, list: [0, null, { value: 2 }] });
});
test('Firestore cleaning preserves Date, Timestamp and sentinel class instances', () => {
 class Timestamp { constructor() { this.seconds = 12; } }
 class FieldValue { constructor() { this.methodName = 'serverTimestamp'; } }
 const date = new Date('2026-10-13'), timestamp = new Timestamp(), sentinel = new FieldValue();
 const result = removeUndefinedFields({ date, timestamp, sentinel });
 assert.equal(result.date, date); assert.equal(result.timestamp, timestamp); assert.equal(result.sentinel, sentinel);
});
