const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');

test('daily report date selector matches authenticated report controls', () => {
  assert.match(source, /className="daily-operations-date-input"/);
  assert.match(source, /\.daily-operations-date-input\s*{[\s\S]*?height:\s*44px;/);
  assert.match(source, /\.daily-operations-date-input\s*{[\s\S]*?border:\s*1px solid var\(--border\);/);
  assert.match(source, /\.daily-operations-date-input:focus\s*{[\s\S]*?box-shadow:\s*0 0 0 3px rgba\(50, 130, 184, 0\.12\);/);
});

test('daily operations tables use Shrimply themed headers', () => {
  assert.match(source, /const headerCell = \{[\s\S]*?background: '#0F4C75'[\s\S]*?color: '#fff'/);
  assert.doesNotMatch(source, /background: '#fff4a8'/);
});
