const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '../../../app/services/transactionHistoryExportService.ts'), 'utf8');

test('transaction register reserves enough room for summaries, notes, and footers', () => {
  assert.match(source, /const firstPageSize = 14;/);
  assert.match(source, /const continuationPageSize = 18;/);
  assert.match(source, /\.report-content \{[^}]*padding-bottom: 22px;/);
  assert.match(source, /\.footer \{ position: absolute;[^}]*bottom: 0;/);
});

test('transaction cells stay within their columns', () => {
  assert.match(source, /class="cell-clip"/);
  assert.match(source, /\.cell-clip \{[^}]*overflow: hidden;[^}]*text-overflow: ellipsis;[^}]*white-space: nowrap;/);
  assert.match(source, /tr \{ height: 25px;[^}]*page-break-inside: avoid;/);
});
