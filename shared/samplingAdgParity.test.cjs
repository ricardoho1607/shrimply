/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, file);
const { buildOrsonAnalysis } = require('../orson/pipeline.ts');
const root = path.resolve(__dirname, '..');

test('Orson receives the actual latest sampling ADG while retaining its separate smoothed forecast rate', () => {
  const result = buildOrsonAnalysis([{
    id: 'adg-regression', pondName: 'ADG regression', docStart: '2026-08-01', initialWeight: 0.5,
    samplings: [
      { date: '2026-09-01', mbw: 2 }, { date: '2026-09-03', mbw: 2.4 },
      { date: '2026-09-05', mbw: 2.8 }, { date: '2026-09-10', mbw: 5.3 },
    ],
  }], 'What is the latest sampling ADG?', new Date('2026-09-10T12:00:00Z'));
  assert.equal(result.metrics[0].adgGPerDay, 0.5);
  assert.equal(result.metrics[0].smoothedAdgGPerDay, 0.2);
  assert.equal(result.metrics[0].growthEvidence.adgSource, 'measured');
});

test('mobile dashboard, sampling history and both exports use the shared interval calculator', () => {
  const source = file => fs.readFileSync(path.join(root, file), 'utf8');
  assert.match(source('app/(tabs)/index.tsx'), /calculateAdg\(pond, company\?\.timeZone\)/);
  assert.match(source('app/ponddetails.tsx'), /calculateSamplingAdg\(pond, sampling, company\?\.timeZone\)/);
  assert.match(source('web/src/app/dashboard/ponds/detail/PondDetailClient.tsx'), /const samplingAdg = calculateSamplingAdg\(pond, s, company\?\.timeZone\)/);
  for (const file of ['app/shrimp-reports.tsx', 'web/src/app/dashboard/reports/shrimp/page.tsx']) {
    assert.match(source(file), /adg: calculateSamplingAdg\(snapshot, sampling, company\?\.timeZone\)/);
  }
});
