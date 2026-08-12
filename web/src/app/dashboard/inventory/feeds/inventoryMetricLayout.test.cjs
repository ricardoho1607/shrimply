const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const stylesheet = fs.readFileSync(path.join(__dirname, 'InventoryFeeds.module.css'), 'utf8');

test('inventory currency metrics stay on one line with a wider value column', () => {
  assert.match(stylesheet, /grid-template-columns:\s*minmax\(0, 0\.85fr\)\s+minmax\(0, 1fr\)\s+minmax\(0, 1\.25fr\)/);
  assert.match(stylesheet, /\.inventoryMetricValue\s*\{[^}]*white-space:\s*nowrap;/s);
});

test('inventory metrics reflow safely on narrow cards', () => {
  assert.match(stylesheet, /@media \(max-width: 480px\)[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(stylesheet, /\.inventoryMetric:last-child\s*\{[^}]*grid-column:\s*1 \/ -1;/s);
});
