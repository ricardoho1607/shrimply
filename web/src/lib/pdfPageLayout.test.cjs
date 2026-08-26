const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '../../..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const fixedPageReports = [
  ['Sampling', 'app/services/samplingReportExportService.ts', '792px 612px', '11in 8.5in'],
  ['Profit & Loss', 'app/services/pdfExportService.ts', '612px 792px', '8.5in 11in'],
  ['Cash Flow', 'app/services/cashFlowExportService.ts', '612px 792px', '8.5in 11in'],
  ['COGS', 'app/services/cogsExportService.ts', '612px 792px', '8.5in 11in'],
  ['Cycle', 'app/services/cycleReportExportService.ts', '612px 792px', '8.5in 11in'],
];

for (const [name, file, iosSize, physicalSize] of fixedPageReports) {
  test(`${name} PDF uses platform-safe full-page sizing`, () => {
    const source = read(file);
    assert.match(source, /Platform\.OS === 'ios'/);
    assert.match(source, /useIosPrintLayout = false/);
    assert.ok(source.includes(`useIosPrintLayout ? '${iosSize}' : '${physicalSize}'`));
    assert.match(source, /@page\s*\{\s*size:\s*\$\{printPageSize\};?\s*margin:\s*0;?\s*\}/);
    assert.match(source, /useIosPrintLayout \? '100%' :/);
    assert.match(source, /useIosPrintLayout \? '' : 'break-inside: avoid; page-break-inside: avoid;'/);
  });
}

test('flowing Pond Summary PDF uses the same platform-safe paper size', () => {
  const source = read('app/services/pondReportExportService.ts');
  assert.match(source, /Platform\.OS === 'ios'/);
  assert.match(source, /useIosPrintLayout = false/);
  assert.ok(source.includes("useIosPrintLayout ? '612px 792px' : '8.5in 11in'"));
  assert.match(source, /@page\s*\{\s*size:\s*\$\{printPageSize\};?\s*margin:\s*0;?\s*\}/);
});

test('Cycle PDF explicitly separates every fixed page', () => {
  const source = read('app/services/cycleReportExportService.ts');
  assert.match(source, /html\{width:100%;height:100%;margin:0;padding:0\}/);
  assert.match(source, /body\{margin:0;padding:0;width:\$\{printPageWidth\};height:\$\{printPageHeight\}/);
  assert.match(source, /\.pdf-page\{.*page-break-after:always/);
  assert.match(source, /\.pdf-page:last-child\{page-break-after:auto\}/);
  assert.match(source, /reportStyles\.replace\(\/\(-\?\\d\+\(\?:\\\.\\d\+\)\?\)pt\\b\/g, '\$1px'\)/);
});

test('Cycle PDF shows average harvest MBW separately from final MBW', () => {
  const mobileSource = read('app/services/cycleReportExportService.ts');
  const webSource = read('web/src/lib/generated/mobileCycleReport.ts');
  [mobileSource, webSource].forEach((source) => {
    assert.match(source, /<th>Final MBW<\/th><th>Average MBW<\/th>/);
    assert.match(source, /pond\.averageHarvestMbw/);
  });
});

test('Cycle PDF uses neutral overview cards and omits the closed header badge', () => {
  const source = read('app/services/cycleReportExportService.ts');
  assert.doesNotMatch(source, /<span class="closed">/);
  assert.doesNotMatch(source, /class="metric (?:blue|green)"/);
  assert.match(source, /\.metric\{border-left-width:1pt\}/);
  assert.match(source, /\.metric\{border-left-color:#D7E7F2\}/);
});

test('Cycle PDF includes executive comparisons, MBW movement, and actions', () => {
  const mobileSource = read('app/services/cycleReportExportService.ts');
  const webSource = read('web/src/lib/generated/mobileCycleReport.ts');
  [mobileSource, webSource].forEach((source) => {
    assert.match(source, /Executive performance snapshot/);
    assert.match(source, /Previous cycle comparison/);
    assert.match(source, /Priority review and next action/);
    assert.match(source, /Recent MBW movement/);
    assert.match(source, /renderSparkline\(pond\.mbwTrend\)/);
  });
});

test('Cycle PDF reports yield in tonnes per hectare and keeps supporting text legible', () => {
  const mobileSource = read('app/services/cycleReportExportService.ts');
  const webSource = read('web/src/lib/generated/mobileCycleReport.ts');
  [mobileSource, webSource].forEach((source) => {
    assert.match(source, /t\/ha/);
    assert.doesNotMatch(source, /kg\/m2/);
    assert.doesNotMatch(source, /Data quality and assumptions/);
    assert.doesNotMatch(source, /font-size:[56](?:\.\d+)?pt/);
  });
});

test('Sampling PDF keeps its compact pond column aligned and contained', () => {
  const source = read('app/services/samplingReportExportService.ts');
  assert.match(source, /<table class="sampling-table">/);
  assert.match(source, /<col style="width:7\.8%" \/>/);
  assert.match(source, /\.sampling-table th, \.sampling-table td \{ overflow-wrap: anywhere; word-break: normal; \}/);
  assert.match(source, /\.pond-cell \{ padding-left: 2px; padding-right: 2px; text-align: center;/);
});
