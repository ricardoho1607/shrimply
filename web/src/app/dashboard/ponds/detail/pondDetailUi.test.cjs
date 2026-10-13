const assert = require('node:assert/strict');
const { readFeatureSource } = require('../../../../../../scripts/read-feature-source.cjs');
const path = require('node:path');
const test = require('node:test');

const component = readFeatureSource(path.join(__dirname, 'PondDetailClient.tsx'));
const stylesheet = readFeatureSource(path.join(__dirname, '../../../globals.css'));
const translationsIndex = readFeatureSource(path.join(__dirname, '../../../../translations/index.ts'));

test('mobile sampling table centers every heading without horizontal overflow', () => {
  assert.match(stylesheet, /\.pond-detail-sampling-table-wrap\s*\{[^}]*overflow-x:\s*hidden;/s);
  assert.match(stylesheet, /\.pond-detail-sampling-table\s*\{[^}]*table-layout:\s*fixed;/s);
  assert.match(stylesheet, /\.pond-detail-sampling-table th:first-child,[\s\S]*?text-align:\s*center\s*!important;/);
});

test('record trigger exposes sampling, mortality, and pond-aware feed flows', () => {
  assert.match(component, /copy\.record/);
  assert.match(component, /<strong>\{copy\.sampling\}<\/strong>/);
  assert.match(component, /<strong>\{copy\.mortality\}<\/strong>/);
  assert.match(component, /<strong>\{copy\.feed\}<\/strong>/);
  assert.match(component, /\/dashboard\/feed\?action=new&pondId=\$\{encodeURIComponent\(pond\.id\)\}/);
});

test('mobile record menu opens below its trigger inside the visible viewport', () => {
  assert.match(component, /@media \(max-width: 420px\)[\s\S]*?\.pond-detail-record-popover\s*{[\s\S]*?position:\s*absolute;/);
  assert.match(component, /\.pond-detail-record-popover\s*{[\s\S]*?top:\s*calc\(100% \+ 8px\);[\s\S]*?bottom:\s*auto;/);
  assert.match(component, /width:\s*min\(238px, calc\(100vw - 24px\)\);/);
});

test('sampling and mortality forms use the compact Add Feed modal treatment on mobile', () => {
  assert.match(component, /responsive-modal-overlay feed-log-overlay pond-detail-form-modal-overlay/);
  assert.match(component, /responsive-modal feed-log-modal pond-detail-form-modal/);
  assert.match(component, /responsive-modal-body feed-log-form pond-detail-form-modal-form/);
  assert.match(stylesheet, /\.pond-detail-form-modal-form\s*{[\s\S]*?max-height:\s*calc\(100dvh - 102px\)/);
  assert.match(stylesheet, /@media \(max-width: 640px\)[\s\S]*?\.pond-detail-form-modal-form\s*{[\s\S]*?max-height:\s*calc\(100dvh - 74px\)/);
});

test('pond detail cycle forms share the compact modal treatment', () => {
  assert.equal((component.match(/pond-detail-form-modal-overlay/g) || []).length, 5);
  assert.match(component, /className="responsive-modal-body feed-log-form pond-detail-form-modal-form pond-detail-form-grid"/);
  assert.match(component, /className="responsive-modal-footer feed-log-footer pond-detail-form-actions"/);
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
  assert.match(component, /copy\.mortalityHistory/);
  assert.match(component, /currentCycleMortalityRecords/);
  assert.match(component, /isMortalityHistoryOpen/);
  assert.match(component, /copy\.noMortalityRecords/);
  assert.match(component, /copy\.recordMortality/);
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
  assert.match(handler, /transaction.get\(reference\)/);
  assert.doesNotMatch(handler, /inventoryFeedId|companies.*feeds/);
});

test('pond details use the localized copy instead of hardcoded English labels', () => {
  assert.match(translationsIndex, /pondDetailTranslations/);
  assert.match(component, /const copy = t\.pondDetail;/);
  assert.doesNotMatch(component, />Biological Growth Curve</);
  assert.doesNotMatch(component, />Sampling History</);
  assert.doesNotMatch(component, />Mortality History</);
  assert.doesNotMatch(component, />Latest Lab Status</);
  assert.doesNotMatch(component, />Detailed Metrics</);
});
