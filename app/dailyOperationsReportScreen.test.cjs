const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'app/daily-operations-report.tsx'), 'utf8');

test('daily operations report owns a top-safe custom header', () => {
  assert.match(source, /<Stack\.Screen options=\{\{ headerShown: false \}\} \/>/);
  assert.match(source, /<SafeAreaView style=\{styles\.topSafeArea\} edges=\{\['top', 'left', 'right'\]\}>/);
  assert.match(source, /<View style=\{styles\.header\}>/);
});

test('daily operations labels are wired into every app and web locale', () => {
  const translations = fs.readFileSync(path.join(root, 'shared/dailyOperationsI18n.ts'), 'utf8');
  const appIndex = fs.readFileSync(path.join(root, 'app/translations/index.ts'), 'utf8');
  const webIndex = fs.readFileSync(path.join(root, 'web/src/translations/index.ts'), 'utf8');

  for (const locale of ['en', 'id', 'th', 'vi', 'zh']) {
    assert.match(translations, new RegExp(`\\n  ${locale}: \\{`), `${locale} translations are missing`);
    assert.match(appIndex, new RegExp(`dailyOperationsReports: dailyOperationsTranslations\\.${locale}`));
    assert.match(webIndex, new RegExp(`dailyOperationsReports: dailyOperationsTranslations\\.${locale}`));
  }
});

test('daily operations water tables show morning pH, evening pH, and pH range', () => {
  const webSource = fs.readFileSync(path.join(root, 'web/src/app/dashboard/reports/daily-operations/page.tsx'), 'utf8');

  for (const reportSource of [source, webSource]) {
    assert.match(reportSource, /copy\.phMorning, copy\.phEvening, copy\.phRange/);
    assert.match(reportSource, /row\.phMorning/);
    assert.match(reportSource, /row\.phEvening/);
    assert.match(reportSource, /row\.phRange/);
  }
});

test('daily operations water tables show the feed section', () => {
  const webSource = fs.readFileSync(path.join(root, 'web/src/app/dashboard/reports/daily-operations/page.tsx'), 'utf8');

  for (const reportSource of [source, webSource]) {
    assert.match(reportSource, /copy\.feedIndex/);
    assert.match(reportSource, /copy\.dailyFeed/);
    assert.match(reportSource, /copy\.cumulativeFeed/);
    assert.match(reportSource, /copy\.actualAdg/);
    assert.match(reportSource, /row\.estimatedPopulation/);
  }
});

test('daily operations PDF uses the standard mobile landscape print settings', () => {
  const service = fs.readFileSync(path.join(root, 'app/services/dailyOperationsReportExportService.ts'), 'utf8');

  assert.match(service, /Platform\.OS === 'ios'/);
  assert.match(service, /textZoom: 100/);
  assert.match(service, /width: 792/);
  assert.match(service, /height: 612/);
  assert.match(service, /margins: \{ top: 0, right: 0, bottom: 0, left: 0 \}/);
});
