const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
const styles = fs.readFileSync(path.join(__dirname, '../../globals.css'), 'utf8');
const mobileSource = fs.readFileSync(path.join(__dirname, '../../../../../app/(tabs)/feed.tsx'), 'utf8');
const sharedCalculations = fs.readFileSync(path.join(__dirname, '../../../../../shared/pondCalculations.ts'), 'utf8');

test('feed overview uses the compact authenticated layout', () => {
  assert.match(source, /className="dashboard-page feed-page"/);
  assert.match(source, /className="glass-card dashboard-toolbar-card feed-toolbar/);
  assert.match(source, /className="feed-pond-grid"/);
  assert.match(source, /className="glass-card feed-pond-card/);
});

test('feed controls have hover and mobile responsive states', () => {
  assert.match(styles, /\.feed-history-button:hover/);
  assert.match(styles, /\.feed-quick-entry:hover/);
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*\.feed-pond-grid/);
});

test('feed entry and history surfaces use compact authenticated styling', () => {
  assert.match(source, /className="responsive-side-drawer feed-history-drawer"/);
  assert.match(source, /className="glass-card animate-fade-up responsive-modal feed-log-modal"/);
  assert.match(source, /className="feed-save-button"/);
  assert.match(styles, /\.feed-save-button\s*\{[\s\S]*background:\s*var\(--primary\)/);
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*\.feed-log-grid/);
});

test('mobile feed history remains a narrow drawer instead of covering the page', () => {
  assert.match(styles, /\.feed-history-drawer\s*\{[\s\S]*?width:\s*min\(300px, 78vw\) !important;[\s\S]*?max-width:\s*78vw !important;/);
});

test('feed history drawer closes only when its backdrop is clicked', () => {
  assert.match(source, /const handleHistoryBackdropClick = \(event: React\.MouseEvent<HTMLDivElement>\)/);
  assert.match(source, /event\.target !== event\.currentTarget/);
  assert.match(source, /className="responsive-side-drawer-overlay feed-history-overlay" onClick=\{handleHistoryBackdropClick\}/);
});

test('phone feed history header stays below device navigation and status areas', () => {
  assert.match(source, /className="responsive-side-drawer-overlay feed-history-overlay"[\s\S]*?style=\{\{ zIndex: 9100 \}\}/);
  assert.match(source, /className="responsive-side-drawer feed-history-drawer"[\s\S]*?style=\{\{ paddingTop: 0 \}\}/);
  assert.match(source, /<style jsx global>[\s\S]*?\.dashboard-saas \.feed-history-header\s*{[\s\S]*?padding-top:\s*calc\(12px \+ var\(--safe-area-top\)\) !important;/);
});

test('feeding response is required on web, persisted, and shown beside daily feed on web and mobile', () => {
  assert.match(sharedCalculations, /FEEDING_RESPONSE_VALUES = \['strong', 'normal', 'weak'\]/);
  assert.match(source, /if \(!formData\.feedingResponse\)/);
  assert.match(source, /feedingResponse: formData\.feedingResponse/);
  assert.match(source, /className="feed-pond-response"/);
  assert.match(source, /role="radiogroup"/);
  assert.match(source, /feedingResponse: response/);
  assert.match(mobileSource, /feedingResponse,/);
  assert.match(mobileSource, /style=\{styles\.cardMetricsRow\}/);
  assert.match(mobileSource, /setFeedingResponse\(selected \? null : response\)/);
});

test('inventory quantities are formatted for display without changing stock math', () => {
  assert.match(source, /formatFeedQuantityForDisplay\(feed\.totalStock\)/);
  assert.doesNotMatch(source, /\{feed\.totalStock \|\| 0\} \{feed\.unit \|\| 'kg'\}/);
});
