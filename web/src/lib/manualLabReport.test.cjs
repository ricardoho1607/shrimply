const ts = require('typescript');
const fs = require('node:fs');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename);
const test = require('node:test');
const assert = require('node:assert/strict');
const { generateManualLabReportHTML } = require('./manualLabReport.ts');
const { createManualLabUnits } = require('../../../functions/shared/labMeasurementContract');
const { getManualLabColumns } = require('./manualLabColumns.ts');
const assets = { backgroundBase64: 'background', logoBase64: 'logo' };
for (const reportType of ['water_quality', 'plankton', 'combined']) {
  test(`${reportType} columns follow the manual input order with ponds as rows`, () => {
    const pondResults = ['A1', 'A2'].map((pondCode, index) => ({ pondId: pondCode, pondCode, measurementUnits: createManualLabUnits(), waterQuality: { hardnessCa: 200 + index * 10, hardnessMg: 150 - index * 21, phosphate: 0 } }));
    const html = generateManualLabReportHTML({ farmName: '<Farm>', reportType, pondResults }, assets);
    assert.deepEqual([...html.matchAll(/data-field="([^"]+)"/g)].map(match => match[1]), getManualLabColumns(reportType).map(column => column.path.join('.')));
    assert.equal((html.match(/<table /g) || []).length, 1);
    assert.match(html, /<th scope="col">Pond<\/th>/);
    assert.match(html, /<td>A1<\/td>/);
    assert.match(html, /<td>A2<\/td>/);
    assert.match(html, /&lt;Farm&gt;/);
    if (reportType !== 'plankton') {
      assert.match(html, /<td>200<\/td><td>150<\/td>/);
      assert.match(html, /<td>210<\/td><td>129<\/td>/);
      assert.match(html, /<td>0<\/td>/);
      assert.match(html, /mg\/L as PO4/);
    }
    assert.match(html, /N\/A/);
    assert.match(html, /padding: 26px 36px 26px 26px/);
    assert.match(html, /width: 792px; height: 612px/);
  });
}
test('different source bases remain beside the correct pond values', () => {
  const html = generateManualLabReportHTML({ pondResults: ['PO4', 'P'].map((basis, index) => ({ pondId: String(index), pondCode: `A${index + 1}`, waterQuality: { phosphate: 0.25 }, measurementUnits: { ...createManualLabUnits(), phosphate: { unit: 'mg/L', basis } } })) }, assets);
  assert.match(html, /See cell/);
  assert.match(html, /0.25 mg\/L as PO4/);
  assert.match(html, /0.25 mg\/L as P<\/td>/);
});
test('long species entries continue without losing text and repeat the table headings', () => {
  const html = generateManualLabReportHTML({ reportType: 'plankton', pondResults: [{ pondId: '1', pondCode: 'A1', plankton: { chlorophytaSpecies: 'x'.repeat(1200) } }] }, assets);
  assert.ok((html.match(/class="pdf-page"/g) || []).length > 1);
  assert.equal((html.match(/<td>x+<\/td>/g) || []).reduce((sum, cell) => sum + cell.length - 9, 0), 1200);
  assert.match(html, /A1 \(cont.\)/);
});
