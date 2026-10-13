const assert = require('node:assert/strict');
const { readFeatureSource } = require('../../../../../scripts/read-feature-source.cjs');
const path = require('node:path');
const test = require('node:test');

const pageSource = readFeatureSource(path.join(__dirname, 'page.tsx'));
const globalStyles = readFeatureSource(path.join(__dirname, '../../globals.css'));
const mobileSource = readFeatureSource(path.join(__dirname, '../../../../../app/(tabs)/water-quality.tsx'));
const ts = require('typescript');
const waterFormSource = readFeatureSource(path.join(__dirname, 'waterFormState.ts'));
const compiledWaterForm = ts.transpileModule(waterFormSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const waterFormModule = { exports: {} };
new Function('module', 'exports', 'require', compiledWaterForm)(waterFormModule, waterFormModule.exports, require);
const { initializeWaterDraft } = waterFormModule.exports;
const pondStore = readFeatureSource(path.join(__dirname, '../../../../../app/store/pondStore.ts'));

test('water quality uses the compact authenticated layout', () => {
  assert.match(pageSource, /className="dashboard-page water-quality-page"/);
  assert.match(pageSource, /className="water-view-tabs animate-fade-up"/);
  assert.match(pageSource, /className="water-pond-grid"/);
  assert.match(pageSource, /className={`glass-card water-pond-card/);
});
test('water quality controls expose hover and responsive states', () => {
  assert.match(globalStyles, /\.water-view-tabs button:hover/);
  assert.match(globalStyles, /\.water-history-button:hover/);
  assert.match(globalStyles, /@media \(max-width: 640px\)[\s\S]*\.water-metric-grid/);
});

test('water quality modals use compact options and the authenticated primary action', () => {
  assert.match(pageSource, /className="glass-card responsive-modal animate-fade-up water-lab-action-modal"/);
  assert.match(pageSource, /className="water-lab-action-option"/);
  assert.match(pageSource, /className="water-save-log-button"/);
  assert.match(globalStyles, /\.water-save-log-button\s*\{[\s\S]*background:\s*var\(--primary\)/);
  assert.match(pageSource, /className="glass-card responsive-modal animate-fade-up water-lab-form-modal"/);
  assert.match(pageSource, /className="water-pdf-upload-row"/);
  assert.match(pageSource, /className="water-lab-primary-button water-upload-extract-button"/);
  assert.match(pageSource, /className="water-pdf-file-success"/);
  assert.match(globalStyles, /\.water-lab-primary-button\s*\{[\s\S]*background:\s*var\(--primary\)/);
  assert.match(globalStyles, /\.water-lab-primary-button:disabled\s*\{[\s\S]*background:\s*var\(--primary\)/);
  assert.match(pageSource, /className="water-lab-primary-button water-confirm-lab-button"/);
  assert.match(globalStyles, /\.water-confirm-lab-button:disabled\s*\{[\s\S]*background:\s*var\(--bg-mid\)/);
  assert.match(pageSource, /className="glass-card responsive-modal animate-fade-up water-log-modal"/);
  assert.match(globalStyles, /@media \(max-width: 640px\)[\s\S]*\.water-log-form-grid/);
  assert.match(pageSource, /<label className="form-label">\{copy\('Date'\)\}<\/label>/);
  assert.match(pageSource, /disabled=\{savePending \|\| \(!formData\.pondId \|\| waterSubmitting\)\} className="water-save-log-button"/);
  assert.match(globalStyles, /\.water-save-log-button:disabled\s*\{[\s\S]*background:\s*var\(--bg-mid\)/);
});

test('water quality shows Plankton Overwatch and keeps pond-condition evidence optional', () => {
  assert.match(pageSource, /<PlanktonOverwatchCard snapshot=\{pond\.latestPlanktonOverwatch\} compact \/>/);
  assert.match(pageSource, /copy\('Optional Pond Conditions'\)/);
  assert.match(pageSource, /weatherEvent: null as Sampling\['weatherEvent'\]/);
  assert.match(pageSource, /surfaceScum: null as boolean \| null/);
  assert.match(pageSource, /shrimpBehaviour: formData\.shrimpBehaviour/);
  assert.match(pageSource, /prev\.surfaceScum === value \? null : value/);
});

test('daily water quality preserves optional farm context and legacy records', () => {
  const draft = initializeWaterDraft('pond', '2026-09-04', [{ date: '2026-09-04', mbw: 0, feed: 0, mortality: 0, ammonia: '0', operationalNotes: 'Normal swimming' }]);
  assert.equal(draft.ammonia, '0');
  assert.equal(draft.operationalNotes, 'Normal swimming');
  assert.match(pageSource, /copy\('Ammonia \(TAN\) \(mg\/L\)'\)/);
  assert.match(pageSource, /copy\('Operational Notes'\)/);
  assert.match(pageSource, /temperature: formData\.temperature/);
  assert.match(pageSource, /weatherEvent: formData\.weatherEvent/);
  assert.match(mobileSource, /ammonia: values\.ammonia\.trim\(\)/);
  assert.match(mobileSource, /operationalNotes: values\.operationalNotes\.trim\(\)/);
  assert.match(pondStore, /sampling\.ammonia/);
  assert.match(pondStore, /sampling\.operationalNotes/);
});

test('water quality history displays every saved pond-condition field', () => {
  assert.match(pageSource, /waterExchangePercent/);
  assert.match(pageSource, /copy\('Weather'\)/);
  assert.match(pageSource, /copy\('Water Exchange'\)/);
  assert.match(pageSource, /copy\('Sludge Load'\)/);
  assert.match(pageSource, /copy\('Surface Scum'\)/);
  assert.match(pageSource, /copy\('Shrimp Behavior'\)/);
  assert.match(pageSource, /log\.weatherEvent/);
  assert.match(pageSource, /log\.waterExchangePercent/);
  assert.match(pageSource, /hasSavedValue\(log\.waterExchangePercent\)/);
  assert.match(pageSource, /log\.sludgeLoad/);
  assert.match(pageSource, /log\.surfaceScum/);
  assert.match(pageSource, /log\.shrimpBehaviour/);
});

test('water quality modal includes morning/evening inputs with NA placeholders and moved up temperature', () => {
  assert.match(pageSource, /copy\('Temperature \(Morning\) \(°C\)'\)/);
  assert.match(pageSource, /copy\('Temperature \(Evening\) \(°C\)'\)/);
  assert.match(pageSource, /copy\('Transparency \(Morning\) \(CM\)'\)/);
  assert.match(pageSource, /copy\('Transparency \(Evening\) \(CM\)'\)/);
  assert.match(pageSource, /copy\('Water Appearance \(Morning\)'\)/);
  assert.match(pageSource, /copy\('Water Appearance \(Evening\)'\)/);
  assert.match(pageSource, /copy\('Water Depth \(Morning\) \(CM\)'\)/);
  assert.match(pageSource, /copy\('Water Depth \(Evening\) \(CM\)'\)/);

  // Ensure temperature appears before optional heading
  const tempIndex = pageSource.indexOf("copy('Temperature (Morning) (°C)')");
  const optionalHeadingIndex = pageSource.indexOf("copy('Optional Pond Conditions')");
  assert.ok(tempIndex !== -1 && tempIndex < optionalHeadingIndex, 'Temperature should be moved above Optional Pond Conditions');

  // Ensure placeholders use N/A
  assert.match(pageSource, /placeholder="N\/A" value=\{formData\.temperatureMorning\}/);
  assert.match(pageSource, /placeholder="N\/A" value=\{formData\.transparencyMorning\}/);
  assert.match(pageSource, /placeholder="N\/A" value=\{formData\.salinity\}/);
});
