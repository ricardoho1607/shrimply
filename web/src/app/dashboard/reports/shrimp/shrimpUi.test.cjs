const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
const reportGenerator = fs.readFileSync(path.join(__dirname, '../../../../lib/generated/mobileSamplingReport.ts'), 'utf8');

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
