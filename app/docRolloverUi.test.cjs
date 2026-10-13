const assert = require('node:assert/strict');
const { readFeatureSource } = require('../scripts/read-feature-source.cjs');
const path = require('node:path');
const test = require('node:test');

const appRoot = __dirname;
const read = (file) => readFeatureSource(path.join(appRoot, file));

test('mobile DOC surfaces refresh from the company farm date', () => {
  for (const file of ['(tabs)/index.tsx', 'ponddetails.tsx', 'shrimp-reports.tsx']) {
    const source = read(file);
    assert.match(source, /useFarmDateKey\(company\?\.timeZone, FARM_OPERATIONAL_DAY_ROLLOVER_HOUR\)/, `${file} must refresh at the farm's 3am boundary`);
    assert.match(source, /getPondCurrentDoc\(pond, company\?\.timeZone(?:, farmToday)?\)/, `${file} must calculate DOC in the company timezone`);
  }
});

test('mobile pond export uses calendar DOC instead of elapsed milliseconds', () => {
  const source = read('settings.tsx');
  assert.match(source, /getPondCurrentDoc\(pond, company\?\.timeZone\)/);
  assert.doesNotMatch(source, /diffTime\s*\/\s*\(1000\s*\*\s*60\s*\*\s*60\s*\*\s*24\)/);
});

test('mobile harvest projections refresh DOC at the 3am farm boundary', () => {
  const source = read('harvest-projection.tsx');
  assert.match(source, /useFarmDateKey\(company\?\.timeZone, FARM_OPERATIONAL_DAY_ROLLOVER_HOUR\)/);
  assert.match(source, /currentDateKey: operationalToday/);
});
