const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
const styles = fs.readFileSync(path.join(__dirname, 'HarvestPage.module.css'), 'utf8');

test('harvest entry uses a compact scrollable modal with persistent actions', () => {
  assert.match(source, /className={`glass-card responsive-modal \$\{styles\.harvestModal\}`}/);
  assert.match(styles, /\.harvestOverlay\s*{[\s\S]*?z-index:\s*9100 !important;/);
  assert.match(source, /className={`responsive-modal-body \$\{styles\.harvestForm\}`}/);
  assert.match(source, /className={styles\.harvestFormScroll}/);
  assert.match(source, /className={`responsive-modal-footer \$\{styles\.harvestFooter\}`}/);
  assert.match(styles, /\.harvestModal\s*{[\s\S]*?display:\s*flex;[\s\S]*?flex-direction:\s*column;/);
  assert.match(styles, /\.harvestForm\s*{[\s\S]*?min-height:\s*0;[\s\S]*?overflow:\s*hidden;/);
  assert.match(styles, /\.harvestFormScroll\s*{[\s\S]*?flex:\s*1;[\s\S]*?overflow-y:\s*auto;/);
  assert.match(styles, /\.harvestFooter\s*{[\s\S]*?flex:\s*0 0 auto;/);
});

test('phone harvest entry pairs short fields and compacts biomass inputs', () => {
  assert.match(source, /className={`responsive-form-grid \$\{styles\.harvestGrid\}`}/);
  assert.match(source, /className={`responsive-two-column \$\{styles\.primaryMetrics\}`}/);
  assert.match(source, /className={`responsive-card-grid \$\{styles\.secondaryMetrics\}`}/);
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*?\.harvestGrid\s*{[\s\S]*?grid-template-areas:[\s\S]*?"date size"/);
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*?\.metricsPanel\s*{[\s\S]*?grid-area:\s*metrics !important;/);
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*?\.primaryMetrics\s*{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\) !important;/);
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*?\.secondaryMetrics\s*{[\s\S]*?grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\) !important;/);
});

test('save harvest uses the solid Shrimply primary color', () => {
  assert.match(source, /className={`btn-primary \$\{styles\.saveButton\}`}/);
  assert.match(styles, /\.saveButton\s*{[\s\S]*?background:\s*#0f4c75 !important;/);
});

test('close control is square and highlights only on hover', () => {
  assert.match(source, /className={styles\.closeButton}/);
  assert.match(styles, /\.closeButton\s*{[\s\S]*?border-radius:\s*8px;[\s\S]*?background:\s*transparent;/);
  assert.match(styles, /\.closeButton:hover\s*{[\s\S]*?background:\s*var\(--bg-mid\);/);
});

test('harvest waits for ponds, cycles, and records before showing counts', () => {
  assert.match(source, /const \[pondsResolved, setPondsResolved\] = useState\(false\)/);
  assert.match(source, /const \[cyclesResolved, setCyclesResolved\] = useState\(false\)/);
  assert.match(source, /const \[harvestRecordsResolved, setHarvestRecordsResolved\] = useState\(false\)/);
  assert.match(source, /const loading = !pondsResolved \|\| !cyclesResolved \|\| !harvestRecordsResolved/);
  assert.match(source, /if \(loading\) \{[\s\S]*?return \([\s\S]*?aria-label="Loading harvest data"/);
});
