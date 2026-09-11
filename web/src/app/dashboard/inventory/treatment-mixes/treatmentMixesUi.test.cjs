const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
const styles = fs.readFileSync(path.join(__dirname, 'TreatmentMixesPage.module.css'), 'utf8');

test('treatment mix dialog uses the shared compact modal structure', () => {
  assert.match(source, /className={`responsive-modal-overlay \$\{styles\.modalOverlay\}`}/);
  assert.match(source, /className={`glass-card responsive-modal \$\{styles\.modal\}`}/);
  assert.match(source, /className={`responsive-modal-body \$\{styles\.modalBody\}`}/);
  assert.match(source, /className={`responsive-modal-footer \$\{styles\.modalFooter\}`}/);
  assert.match(styles, /\.modalOverlay\s*{[\s\S]*?z-index:\s*9100 !important;/);
  assert.match(styles, /\.modalBody\s*{[\s\S]*?overflow-y:\s*auto;/);
});

test('treatment mix actions use in-app confirmations and equal modal actions', () => {
  assert.match(source, /const \[batchMix, setBatchMix\]/);
  assert.doesNotMatch(source, /window\.confirm/);
  assert.match(source, /\(showCreate \|\| useMix \|\| batchMix\)/);
  assert.match(source, /role="dialog" aria-modal="true"/);
  assert.match(source, />\{copy\('Cancel'\)\}<\/button>/);
  assert.match(styles, /\.modalFooter\s*{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/s);
});

test('treatment mix empty state stays compact and icon free', () => {
  assert.match(source, /className=\{styles\.emptyState\}/);
  assert.doesNotMatch(source, /<Beaker size=\{52\}/);
  assert.match(styles, /\.emptyState\s*{[^}]*min-height:\s*120px;/s);
});

test('treatment mix page header and dose guidance stay container free', () => {
  assert.match(source, /className={`dashboard-inline-toolbar \$\{styles\.toolbarCompact\}`}/);
  assert.match(source, /className=\{styles\.doseLogic\}/);
  assert.doesNotMatch(source, /className="glass-card" style=\{\{ marginTop: 20, padding: 16/);
  assert.match(styles, /\.toolbarCompact\s*{[^}]*grid-template-columns:\s*auto minmax\(0, 1fr\) auto;/s);
  assert.match(styles, /\.doseLogic\s*{[^}]*border:\s*0;/s);
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*?\.toolbarCopy\s*{[\s\S]*?display:\s*none;/);
});

test('treatment mix creation explicitly selects additive inventory', () => {
  assert.match(source, /const \[selectedIngredientIds, setSelectedIngredientIds\]/);
  assert.match(source, /const selectedAdditives = useMemo/);
  assert.match(source, /const components: TreatmentMixComponent\[\] = selectedAdditives\.flatMap/);
  assert.match(source, /aria-label=\{copy\('Select treatment mix ingredients'\)\}/);
  assert.match(source, /role="menuitemcheckbox"/);
  assert.match(source, /aria-checked=\{isSelected\}/);
  assert.match(source, /No stocked additives are available/);
  assert.match(source, /await createTreatmentMix\(companyId/);
  assert.match(source, /await makeTreatmentMixBatch\(companyId/);
});
