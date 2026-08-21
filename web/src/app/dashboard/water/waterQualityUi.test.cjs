const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const pageSource = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
const globalStyles = fs.readFileSync(path.join(__dirname, '../../globals.css'), 'utf8');
const mobileSource = fs.readFileSync(path.join(__dirname, '../../../../../app/(tabs)/water-quality.tsx'), 'utf8');
const pondStore = fs.readFileSync(path.join(__dirname, '../../../../../app/store/pondStore.ts'), 'utf8');

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
  assert.match(pageSource, /<label className="form-label">Date<\/label>/);
  assert.match(pageSource, /disabled=\{!formData\.pondId\} className="water-save-log-button"/);
  assert.match(globalStyles, /\.water-save-log-button:disabled\s*\{[\s\S]*background:\s*var\(--bg-mid\)/);
});

test('water quality shows Plankton Overwatch and keeps pond-condition evidence optional', () => {
  assert.match(pageSource, /<PlanktonOverwatchCard snapshot=\{pond\.latestPlanktonOverwatch\} compact \/>/);
  assert.match(pageSource, />Optional Pond Conditions</);
  assert.match(pageSource, /weatherEvent: null as Sampling\['weatherEvent'\]/);
  assert.match(pageSource, /surfaceScum: null as boolean \| null/);
  assert.match(pageSource, /shrimpBehaviour: formData\.shrimpBehaviour/);
  assert.match(pageSource, /prev\.surfaceScum === value \? null : value/);
});

test('daily water quality preserves optional farm context and legacy records', () => {
  assert.match(pageSource, /ammonia: existing\.ammonia \|\| ''/);
  assert.match(pageSource, /operationalNotes: existing\.operationalNotes \|\| ''/);
  assert.match(pageSource, />Ammonia \(TAN\) \(mg\/L\)</);
  assert.match(pageSource, />Operational Notes</);
  assert.match(pageSource, /temperature: formData\.temperature/);
  assert.match(pageSource, /weatherEvent: formData\.weatherEvent/);
  assert.match(mobileSource, /ammonia: values\.ammonia\.trim\(\)/);
  assert.match(mobileSource, /operationalNotes: values\.operationalNotes\.trim\(\)/);
  assert.match(pondStore, /sampling\.ammonia/);
  assert.match(pondStore, /sampling\.operationalNotes/);
});
