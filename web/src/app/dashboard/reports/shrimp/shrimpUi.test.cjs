const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
const reportGenerator = fs.readFileSync(path.join(__dirname, '../../../../lib/generated/mobileSamplingReport.ts'), 'utf8');
const mobileReportGenerator = fs.readFileSync(path.join(__dirname, '../../../../../../app/services/samplingReportExportService.ts'), 'utf8');

test('sampling report metrics use one compact icon-free summary row', () => {
  assert.match(source, /className="glass-card sampling-summary-bar"/);
  assert.match(source, /gridTemplateColumns: 'repeat\(4, minmax\(0, 1fr\)\)'/);
  assert.match(source, /\{ label: 'ABW'/);
  assert.match(source, /\{ label: 'FCR'/);
  assert.match(source, /\{ label: 'ADG'/);
  assert.match(source, /\{ label: 'T\.Biomas'/);
  assert.doesNotMatch(source, /icon: (Scale|Activity|Zap|Target)/);
  assert.doesNotMatch(source, /<item\.icon/);
});

test('sampling reports scope the dashboard and PDF export to selected ponds', () => {
  assert.match(source, /const \[selectedPondIds, setSelectedPondIds\]/);
  assert.match(source, /const selectedPonds = useMemo/);
  assert.match(source, /getGlobalAverages\(selectedPonds/);
  assert.match(source, /buildGrowthSeries\(selectedPonds\)/);
  assert.match(source, /selectedPonds\.map\(\(pond\)/);
  assert.match(source, />Select ponds</);
  assert.match(source, /role="dialog"/);
  assert.match(source, />Apply selection</);
});

test('pond selector has a visible hover highlight', () => {
  assert.match(source, /\.sampling-pond-trigger:hover\s*\{[^}]*background: var\(--bg-mid\);[^}]*border-color: var\(--secondary\);/s);
});

test('sampling PDF shows supplier between pond and stocking date', () => {
  assert.match(source, /supplier: pond\.plSupplier \|\| pond\.supplier \|\| 'N\/A'/);
  assert.match(reportGenerator, /<th>Pond<\/th><th>Supplier<\/th><th>Stock<br\/>Date<\/th>/);
  assert.match(reportGenerator, /escapeXml\(pond\.supplier \|\| 'N\/A'\)/);
});

test('sampling PDF uses platform-safe page sizing without scaling or an extra iOS page', () => {
  assert.match(reportGenerator, /useIosPrintLayout = false/);
  assert.match(reportGenerator, /useIosPrintLayout \? 1000 : 1056/);
  assert.match(reportGenerator, /useIosPrintLayout \? '792px 612px' : '11in 8\.5in'/);
  assert.match(reportGenerator, /useIosPrintLayout \? '100%' : '11in'/);
  assert.match(reportGenerator, /useIosPrintLayout \? '100%' : '8\.5in'/);
  assert.match(reportGenerator, /useIosPrintLayout \? '' : 'break-inside: avoid;'/);
  assert.match(reportGenerator, /\.header \{ position: relative; min-height: 62px;[^}]*page-break-inside: avoid;/);
  assert.match(reportGenerator, /\.header-logo \{ position: absolute; top: 0; right: 0;/);
  assert.doesNotMatch(reportGenerator, /\.header \{ display: flex;/);
  assert.match(mobileReportGenerator, /generateSamplingReportHTML\(data, brandAssets, language, Platform\.OS === 'ios'\)/);
});

test('ponds without a real growth sampling are not performance-rated', () => {
  assert.match(source, /getLatestGrowthSampling/);
  assert.match(source, /hasGrowthSampling/);
  assert.match(source, /Awaiting sampling/);
  assert.match(source, /hasGrowthSampling \? \(s\.sr >= 85 \? 'EXCELLENT' : 'CRITICAL'\) : 'Awaiting sampling'/);
});
