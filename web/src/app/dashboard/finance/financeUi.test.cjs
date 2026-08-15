const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');

test('finance combines transaction actions into the shared input menu', () => {
  assert.match(source, /const \[isInputMenuOpen, setInputMenuOpen\] = useState\(false\)/);
  assert.match(source, /const inputMenuRef = useRef<HTMLDivElement>\(null\)/);
  assert.match(source, /document\.addEventListener\('pointerdown', closeInputMenu\)/);
  assert.match(source, /className="pond-detail-record-menu finance-input-menu"/);
  assert.match(source, /className="pond-detail-record-trigger finance-input-trigger"/);
  assert.match(source, /<Plus size=\{15\} \/>[\s\S]*?<span>Input<\/span>/);
  assert.match(source, /className="pond-detail-record-popover finance-input-popover"[\s\S]*?role="menu"/);
  assert.match(source, /openTransactionForm\('income'\)/);
  assert.match(source, /openTransactionForm\('expense'\)/);
});

test('finance places the input menu beside a compact cycle selector', () => {
  assert.match(source, /className="finance-input-toolbar"/);
  assert.match(source, /className="finance-cycle-control"/);
  assert.match(source, /flex: '0 1 440px'/);
  assert.match(source, /justifyContent: 'space-between'/);
});

test('finance keeps the input menu anchored as a popover on phones', () => {
  assert.match(source, /className="pond-detail-record-menu finance-input-menu"[\s\S]*?position: 'relative'/);
  assert.match(source, /className="pond-detail-record-popover finance-input-popover"[\s\S]*?position: 'absolute'/);
  assert.match(source, /top: 'calc\(100% \+ 8px\)'/);
  assert.match(source, /right: 0/);
  assert.match(source, /width: 'min\(238px, calc\(100vw - 24px\)\)'/);
});

test('finance transaction modal uses a clean shared header and balanced actions', () => {
  assert.doesNotMatch(source, /<DollarSign/);
  assert.match(source, /className="responsive-modal-footer"[\s\S]*?flex: '1 1 0'/);
  assert.match(source, /className="btn-primary"[\s\S]*?flex: '1 1 0'/);
  assert.match(source, /className="btn-primary"[\s\S]*?background: 'var\(--primary\)'/);
  assert.doesNotMatch(source, /background: formType === 'income' \? '#27AE60' : '#ef4444'/);
});
