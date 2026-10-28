const assert = require('node:assert/strict');
const test = require('node:test');
require('../../../scripts/register-typescript.cjs');
const { ROUTES, getRequiredSetupRoute } = require('./routes.ts');
test('shared client routes do not load the article library in any language', () => {
  assert.equal(ROUTES.dashboard, '/dashboard');
  assert.equal(getRequiredSetupRoute('owner'), '/setup/company');
  assert.equal(getRequiredSetupRoute('buyer'), '/setup/buyer');
  assert.equal(getRequiredSetupRoute('technician'), '/setup/search');
  assert.equal(getRequiredSetupRoute(undefined), '/roleselection');
  assert.deepEqual(Object.keys(require.cache).filter(file => /\/data\/(?:resourceLibrary|(?:id|th|vi)_articles)/.test(file)), []);
});
