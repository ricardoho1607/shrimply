const ts = require('../web/node_modules/typescript');
const fs = require('node:fs');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename);
const test = require('node:test');
const assert = require('node:assert/strict');
const { extractLabMetrics } = require('../functions/planktonOverwatchContext');
const { createManualLabUnits, validateLabRow } = require('../functions/shared/labMeasurementContract');
const { buildOrsonAnalysis } = require('./pipeline.ts');
for (const basis of ['PO4', 'P']) test(`phosphate ${basis} survives saving, lab processing and Orson prompt`, () => {
  const row = JSON.parse(JSON.stringify({ waterQuality: { phosphate: 0.25 }, measurementUnits: { ...createManualLabUnits(), phosphate: { unit: 'mg/L', basis } } }));
  assert.deepEqual(validateLabRow(row), []);
  const metrics = extractLabMetrics(row, '2026-09-08');
  assert.equal(metrics.waterQuality.phosphateMgL, 0.25);
  const result = buildOrsonAnalysis([{ id: 'a1', pondName: 'A1', samplings: [], latestLabStatus: { reportType: 'water_quality', sampleDate: '2026-09-08', metrics } }], 'What is the phosphate in A1?', new Date('2026-09-08T12:00:00Z'));
  assert.match(result.promptPackage.context, /"phosphateMgL":\s*0\.25/);
  assert.match(result.promptPackage.context, new RegExp(`"basis":\\s*"${basis}"`));
});
test('missing phosphate is not zero and invalid values fail validation', () => {
  assert.equal(extractLabMetrics({}).waterQuality, null);
  assert.ok(validateLabRow({ waterQuality: { phosphate: -1 }, measurementUnits: createManualLabUnits() }).length);
  assert.deepEqual(validateLabRow({ waterQuality: { phosphate: 0 }, measurementUnits: createManualLabUnits() }), []);
});
