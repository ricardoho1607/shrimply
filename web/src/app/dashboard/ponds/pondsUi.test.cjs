const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const stylesheet = fs.readFileSync(path.join(__dirname, '../../globals.css'), 'utf8');
const dashboardLayout = fs.readFileSync(path.join(__dirname, '../layout.tsx'), 'utf8');
const pondsPage = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');

test('pond status tabs share equal widths and expose a hover highlight', () => {
  assert.match(stylesheet, /\.ponds-filter-tabs\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\);/s);
  assert.match(stylesheet, /\.ponds-filter-tabs button\s*\{[^}]*width:\s*100%;/s);
  assert.match(stylesheet, /\.ponds-filter-tabs button:hover\s*\{[^}]*background:\s*var\(--primary-dim\);[^}]*color:\s*var\(--primary\);/s);
});

test('mobile navigation trigger highlights only on interaction', () => {
  assert.match(dashboardLayout, /\.mobile-trigger\s*\{[^}]*background:\s*transparent\s*!important;/s);
  assert.match(dashboardLayout, /\.mobile-trigger:hover,[\s\S]*?\.mobile-trigger:focus-visible\s*\{[^}]*background:\s*var\(--primary-dim\)\s*!important;/s);
});

test('empty pond state uses the light action without a plus icon', () => {
  assert.match(pondsPage, /className="ponds-empty-add-button"/);
  assert.doesNotMatch(pondsPage, /className="ponds-empty-add-button"[\s\S]*?<Plus size=\{18\} \/>[\s\S]*?t\.ponds\.addNew/);
  assert.match(stylesheet, /\.ponds-empty-add-button\s*\{[^}]*background:\s*#eaf6fd;[^}]*color:\s*var\(--primary\);/s);
});

test('pond cards only report a last sampling date for a real growth sample', () => {
  assert.match(pondsPage, /getLatestGrowthSampling/);
  assert.match(pondsPage, /t\.ponds\.never \|\| 'Never'/);
});
