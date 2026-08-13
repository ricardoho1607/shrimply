const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const styles = fs.readFileSync(path.join(__dirname, '../globals.css'), 'utf8');

const compactRoutes = [
  'admin/page.tsx',
  'ai/page.tsx',
  'company/page.tsx',
  'disease/page.tsx',
  'finance/page.tsx',
  'harvest/page.tsx',
  'inventory/assets/page.tsx',
  'inventory/feeds/page.tsx',
  'inventory/treatment-mixes/page.tsx',
  'marketplace/page.tsx',
  'notifications/page.tsx',
  'projections/page.tsx',
  'reports/cycles/page.tsx',
  'reports/financial/page.tsx',
  'reports/shrimp/page.tsx',
  'settings/page.tsx',
  'suppliers/page.tsx',
];

test('authenticated dashboard has a scoped compact UI layer', () => {
  assert.match(styles, /\.dashboard-saas \.glass-card/);
  assert.match(styles, /\.dashboard-saas \.responsive-modal/);
  assert.match(styles, /\.dashboard-saas \.dashboard-toolbar-card/);
  assert.match(styles, /\.dashboard-saas :where\(input, select, textarea\)/);
});

test('authenticated compact UI includes mobile overflow protection', () => {
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*\.dashboard-saas \.responsive-modal/);
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*\.dashboard-saas :where\(table/);
});

test('remaining authenticated routes opt into the compact UI standard', () => {
  for (const route of compactRoutes) {
    const source = fs.readFileSync(path.join(__dirname, route), 'utf8');
    assert.match(source, /authenticated-compact-page/, `${route} is missing the compact UI class`);
  }
});
