const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');

test('financial reports replaces all-time with an applied custom date range', () => {
  assert.match(source, /const PERIOD_OPTIONS = \['Today', 'This Week', 'This Month', 'This Year', 'Custom'\]/);
  assert.match(source, /const \[customDateRange, setCustomDateRange\]/);
  assert.match(source, /selectedPeriod === 'Custom' && customDateRange/);
  assert.match(source, /setSelectedPeriod\('Custom'\)/);
  assert.match(source, /type="date"[\s\S]*?type="date"/);
  assert.match(source, /Apply date range/);
  assert.doesNotMatch(source, /selectedPeriod === 'All Time'/);
});

test('financial report filters use equal hoverable selector options', () => {
  assert.match(source, /financial-report-filter-tabs/);
  assert.match(source, /financial-cycle-tabs/);
  assert.match(source, /flex: '1 1 0'/);
  assert.match(source, /\.financial-report-filter-tabs[\s\S]*?\.dashboard-segmented-tab:hover/);
  assert.match(source, /financial-report-type-card/);
  assert.match(source, /\.financial-report-type-card:hover:not\(\.active\)/);
});

test('COGS inventory adjustment stacks without mobile overflow', () => {
  assert.match(source, /className="financial-inventory-grid"/);
  assert.match(source, /repeat\(auto-fit, minmax\(min\(220px, 100%\), 1fr\)\)/);
  assert.match(source, /maxWidth: '100%'/);
});

test('custom range modal follows the shared compact modal treatment', () => {
  assert.match(source, /custom-range-overlay/);
  assert.match(source, /custom-range-modal/);
  assert.match(source, /custom-range-close/);
  assert.match(source, /custom-range-fields/);
  assert.match(source, /custom-range-footer/);
  assert.match(source, /\.custom-range-close:hover/);
  assert.match(source, /\.custom-range-field input:focus/);
  assert.match(source, /\.custom-range-fields[\s\S]*?padding: 0/);
  assert.match(source, /\.custom-range-apply[\s\S]*?letter-spacing: 0/);
  assert.match(source, /\.custom-range-apply[\s\S]*?text-transform: none/);
  assert.match(source, /background: #0f4c75/);
});
