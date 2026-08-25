const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const stylesheet = fs.readFileSync(path.join(__dirname, 'InventoryFeeds.module.css'), 'utf8');
const source = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');

test('inventory currency metrics stay on one line with a wider value column', () => {
  assert.match(stylesheet, /grid-template-columns:\s*minmax\(0, 0\.85fr\)\s+minmax\(0, 1fr\)\s+minmax\(0, 1\.25fr\)/);
  assert.match(stylesheet, /\.inventoryMetricValue\s*\{[^}]*white-space:\s*nowrap;/s);
});

test('inventory metrics reflow safely on narrow cards', () => {
  assert.match(stylesheet, /@media \(max-width: 480px\)[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(stylesheet, /\.inventoryMetric:last-child\s*\{[^}]*grid-column:\s*1 \/ -1;/s);
});

test('inventory cards keep header and actions compact without decorative icons', () => {
  assert.match(source, /className=\{styles\.inventoryCardHeader\}/);
  assert.match(source, /className=\{styles\.inventoryCardActions\}/);
  assert.match(source, />\s*History\s*<\/button>/);
  assert.match(source, />\s*Delete\s*<\/button>/);
  assert.match(source, /activeTab === 'additive' \? 'Product' : 'Threshold'/);
  assert.doesNotMatch(source, /<History size=/);
  assert.doesNotMatch(source, /<Trash2 size=/);
  assert.match(stylesheet, /\.inventoryCardActions\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\);/s);
});

test('inventory dashboard uses one input popover for all create actions', () => {
  assert.match(source, /aria-label="Add inventory input"/);
  assert.match(source, /role="menu"[^>]*className="pond-detail-record-popover inventory-input-popover"/);
  assert.match(source, />Treatment Mixes</);
  assert.match(source, /\{t\.inventory\.addFeed\}/);
  assert.match(source, /\{t\.inventory\.addAdditive\}/);
});

test('inventory dashboard navigation and metrics use compact equal rows', () => {
  assert.match(source, /className="inventory-section-tabs"/);
  assert.match(source, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(source, /className="glass-card inventory-summary-bar"/);
  assert.match(source, /gridTemplateColumns: 'repeat\(4, minmax\(0, 1fr\)\)'/);
  assert.doesNotMatch(source, /<metric\.icon/);
});

test('dashboard alerts and recent transactions keep compact icon-free headings', () => {
  assert.doesNotMatch(source, /Optimal Stock Levels/);
  assert.match(source, /<h2 className="inventory-section-heading">Stock Status Alerts<\/h2>/);
  assert.match(source, /<h2 className="inventory-section-heading">Recent Transactions<\/h2>/);
  assert.match(source, /className="inventory-alert-count"/);
});

test('transaction direction is selected from a sort popover', () => {
  assert.match(source, /aria-label="Filter transactions"/);
  assert.match(source, /<ArrowUpDown size=\{17\}/);
  assert.match(source, /className="pond-detail-record-popover inventory-filter-popover"/);
  assert.match(source, /All transactions/);
  assert.match(source, /Stock in/);
  assert.match(source, /Stock out/);
});

test('inventory input actions open the shared compact modal treatment', () => {
  assert.match(source, /className="glass-card responsive-modal animate-fade-up inventory-modal"/);
  assert.match(source, /role="dialog" aria-modal="true"/);
  assert.match(source, /aria-label="Close inventory dialog"/);
  assert.match(source, /className="responsive-modal-footer inventory-modal-footer"/);
  assert.match(source, /\.inventory-modal-footer\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/s);
  assert.doesNotMatch(source, /modalType === 'add' \? <Plus/);
  assert.match(source, /`Add \$\{itemType === 'feed' \? 'Feed' : 'Additive'\}`/);
});

test('inventory create form stays compact with constrained dropdown choices', () => {
  assert.match(source, /const FEED_CATEGORIES = \['Starter', 'Grower', 'Finisher', 'Other'\]/);
  assert.match(source, /aria-label="Inventory classification"/);
  assert.match(source, /className="responsive-form-grid inventory-add-details"/);
  assert.match(source, /className="responsive-form-grid inventory-stock-details"/);
  assert.match(source, /className="inventory-full-row"/);
  assert.match(source, /maxWidth: modalType === 'history' \? '920px' : '560px'/);
  assert.match(source, /\.inventory-add-details,[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\) !important;/);
});

test('inventory stock intake records the selected arrival date without batch fields', () => {
  assert.match(source, /type="date"[^>]*value=\{formData\.stockDate\}/);
  assert.match(source, /const stockDate = formData\.stockDate/);
  assert.doesNotMatch(source, /formData\.batch|Batch Number|Lot\/Batch/);
});
