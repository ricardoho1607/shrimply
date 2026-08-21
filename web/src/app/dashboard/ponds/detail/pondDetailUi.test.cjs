const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const component = fs.readFileSync(path.join(__dirname, 'PondDetailClient.tsx'), 'utf8');
const stylesheet = fs.readFileSync(path.join(__dirname, '../../../globals.css'), 'utf8');

test('mobile sampling table centers every heading without horizontal overflow', () => {
  assert.match(stylesheet, /\.pond-detail-sampling-table-wrap\s*\{[^}]*overflow-x:\s*hidden;/s);
  assert.match(stylesheet, /\.pond-detail-sampling-table\s*\{[^}]*table-layout:\s*fixed;/s);
  assert.match(stylesheet, /\.pond-detail-sampling-table th:first-child,[\s\S]*?text-align:\s*center\s*!important;/);
});

test('record trigger exposes sampling, mortality, and pond-aware feed flows', () => {
  assert.match(component, />\s*Record\s*</);
  assert.match(component, /<strong>Sampling<\/strong>/);
  assert.match(component, /<strong>Mortality<\/strong>/);
  assert.match(component, /<strong>Feed<\/strong>/);
  assert.match(component, /\/dashboard\/feed\?action=new&pondId=\$\{encodeURIComponent\(pond\.id\)\}/);
});

test('mobile record menu opens below its trigger inside the visible viewport', () => {
  assert.match(component, /@media \(max-width: 420px\)[\s\S]*?\.pond-detail-record-popover\s*{[\s\S]*?position:\s*absolute;/);
  assert.match(component, /\.pond-detail-record-popover\s*{[\s\S]*?top:\s*calc\(100% \+ 8px\);[\s\S]*?bottom:\s*auto;/);
  assert.match(component, /width:\s*min\(238px, calc\(100vw - 24px\)\);/);
});

test('detail removes duplicate mortality and end-cycle controls', () => {
  assert.doesNotMatch(component, /label:\s*'Dead Shrimp Counted Today'/);
  assert.doesNotMatch(component, /label:\s*'Observed\/Recovered Today'/);
  assert.doesNotMatch(component, /aria-label="End cycle"/);
});

test('sampling history includes ADG and the record trigger has no container', () => {
  assert.match(component, />ADG<\/th>/);
  assert.match(component, /const samplingAdg =/);
  assert.match(stylesheet, /\.pond-detail-record-trigger\s*\{[^}]*border:\s*0;/s);
  assert.match(stylesheet, /\.pond-detail-record-trigger\s*\{[^}]*border-radius:\s*0;/s);
  assert.match(stylesheet, /\.pond-detail-record-trigger:hover,[\s\S]*?background:\s*transparent;/);
});

test('pond detail renders collapsible mortality history section scoped to current cycle', () => {
  assert.match(component, /Mortality History/);
  assert.match(component, /currentCycleMortalityRecords/);
  assert.match(component, /isMortalityHistoryOpen/);
  assert.match(component, /No mortality records logged for this cycle\./);
  assert.match(component, /Record Mortality/);
});

test('pond detail shows the latest deterministic Plankton Overwatch result', () => {
  assert.match(component, /latestPlanktonOverwatch\?: PlanktonOverwatchSnapshot/);
  assert.match(component, /<PlanktonOverwatchCard snapshot=\{pond\.latestPlanktonOverwatch\} \/>/);
});

test('sampling writes biological data without touching feed inventory', () => {
  const handler = component.slice(
    component.indexOf('const handleSaveSampling'),
    component.indexOf('const handleSaveMortality'),
  );
  assert.match(handler, /samplings:/);
  assert.doesNotMatch(handler, /runTransaction|inventoryFeedId|companies.*feeds/);
});
