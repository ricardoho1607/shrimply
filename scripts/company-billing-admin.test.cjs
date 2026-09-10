const test = require('node:test');
const assert = require('node:assert/strict');
const { eligibleCompanies } = require('./company-billing-admin.cjs');

test('the lifetime cohort uses immutable server createTime, never editable company dates', () => {
  const cutoff = Date.parse('2026-09-09T14:28:43Z');
  const existing = { name: 'companies/old', createTime: '2026-09-09T14:28:42Z', fields: {} };
  const later = { name: 'companies/new', createTime: '2026-09-09T14:28:44Z', fields: { createdAt: { timestampValue: '2020-01-01T00:00:00Z' } } };
  assert.deepEqual(eligibleCompanies([existing, later], cutoff), [existing]);
  assert.throws(() => eligibleCompanies([{ name: 'unknown' }], cutoff), /Missing server createTime/);
});
