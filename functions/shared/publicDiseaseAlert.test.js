const test = require('node:test'), assert = require('node:assert/strict');
const { publicDiseaseAlert } = require('./publicDiseaseAlert');
test('public projection excludes private identity, symptoms, losses and precise coordinates', () => {
  const report = { companyId: 'secret', companyName: 'Private Farm', symptoms: 'private symptoms', estimatedLoss: '100000', actionsTaken: 'private', location: { latitude: -6.1234, longitude: 106.876, address: 'private address' }, diseaseName: 'Disease', status: 'active' };
  const projected = publicDiseaseAlert(report);
  assert.deepEqual(Object.keys(projected).sort(), ['isPublic','diseaseType','diseaseName','severity','color','status','reportDate','location'].sort());
  assert.equal(projected.location.latitude, -6.5);
  assert.equal(projected.location.longitude, 106.5);
  assert.ok(!JSON.stringify(projected).includes('private'));
});
