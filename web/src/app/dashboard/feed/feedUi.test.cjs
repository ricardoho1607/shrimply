const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
const styles = fs.readFileSync(path.join(__dirname, '../../globals.css'), 'utf8');

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
