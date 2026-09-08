const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
const test = require('node:test');
const assert = require('node:assert/strict');
const { selectMineralLabReports } = require('./mineralLabResults.ts');
const { dailyOperationsTranslations } = require('../../../shared/dailyOperationsI18n.ts');
const report = { id: 'report-1', status: 'confirmed', entryMode: 'manual', reportType: 'combined', sampleDate: '2026-09-08', pondResults: [{ pondId: 'a1', pondCode: 'A1', waterQuality: { phosphate: 0, hardnessCa: 200 } }, { pondId: 'a2', pondCode: 'A2' }, { pondId: 'private', pondCode: 'Private' }] };
const ponds = [{ id: 'a1', blockName: 'A' }, { id: 'a2', blockName: 'B' }];
test('mineral results retain selected date, block and accessible pond scope for export', () => {
  const selected = selectMineralLabReports([report], ponds, '2026-09-08', 'A');
  assert.equal(selected.length, 1);
  assert.equal(selected[0].reportType, 'water_quality');
  assert.deepEqual(selected[0].pondResults, [report.pondResults[0]]);
  assert.equal(selected[0].pondResults[0].waterQuality.phosphate, 0);
  assert.equal(report.pondResults.length, 3);
  assert.equal(selectMineralLabReports([report], ponds, '2026-09-07', 'all').length, 0);
  assert.equal(selectMineralLabReports([report], [], '2026-09-08', 'all').length, 0);
});
test('only confirmed manual mineral reports are offered, including legacy manual records', () => {
  const reports = [report, { ...report, id: 'draft', status: 'draft' }, { ...report, id: 'upload', entryMode: 'pdf_upload' }, { ...report, id: 'plankton', reportType: 'plankton' }, { ...report, id: 'legacy', entryMode: undefined, reportType: undefined }];
  assert.deepEqual(selectMineralLabReports(reports, ponds, '2026-09-08', 'all').map(report => report.id), ['report-1', 'legacy']);
});
test('Daily Operations offers the mineral tab with report permissions and retains the existing report tabs', () => {
  const page = fs.readFileSync(path.join(__dirname, '../app/dashboard/reports/daily-operations/page.tsx'), 'utf8');
  assert.match(page, /key: 'mineral'.*copy.mineralLabResults/);
  assert.match(page, /ponds=\{accessiblePonds\}/);
  assert.match(page, /canExport=\{canExportReports\}/);
  assert.match(page, /key: 'sipon'/);
  assert.match(page, /key: 'water'/);
  const component = fs.readFileSync(path.join(__dirname, '../components/MineralLabResults.tsx'), 'utf8');
  assert.match(component, /if \(!canExport \|\| exporting \|\| !selected\) return/);
  assert.match(component, /generateManualLabReportHTML\(selected, assets\)/);
  const water = fs.readFileSync(path.join(__dirname, '../app/dashboard/water/page.tsx'), 'utf8');
  assert.match(water, /'manual' && report.reportType === 'plankton'/);
});
test('mortality title is consistent in the UI and PDF in every supported language', () => {
  assert.equal(dailyOperationsTranslations.en.dailySipon, 'Mortality Report');
  assert.equal(dailyOperationsTranslations.en.dailySiponReport, 'Mortality Report');
  for (const copy of Object.values(dailyOperationsTranslations)) {
    assert.equal(copy.dailySipon, copy.dailySiponReport);
    assert.ok(copy.mineralLabResults && copy.downloadMineralPdf && copy.noMineralReports);
  }
});
