const assert = require('node:assert/strict');
const { test } = require('node:test');
require('../scripts/register-typescript.cjs');
const { getCompanyTechnicians, resolveCycleTechnicianId } = require('./cycleTechnicianAssignment.ts');

test('technician options exclude other companies and non-technician roles', () => {
  const options = getCompanyTechnicians([
    { id: 'technician', companyId: 'company', role: 'technician', name: ' Tech ' },
    { id: 'manager', companyId: 'company', role: 'manager' },
    { id: 'other-company', companyId: 'other', role: 'technician' },
    { id: 'pending', role: 'technician' },
  ], 'company');
  assert.deepEqual(options, [{ id: 'technician', uid: 'technician', name: 'Tech', email: '' }]);
  assert.equal(resolveCycleTechnicianId(' technician ', options), 'technician');
  assert.equal(resolveCycleTechnicianId('other-company', options), null);
});

test('missing, cleared, unavailable and stale selections all allow unassigned saves', () => {
  for (const id of [undefined, null, '', ' ', 'stale']) assert.equal(resolveCycleTechnicianId(id, []), null);
});
