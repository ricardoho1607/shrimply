/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const articlePage = fs.readFileSync(path.join(__dirname, '[slug]/page.tsx'), 'utf8');
const globalStyles = fs.readFileSync(path.join(__dirname, '../globals.css'), 'utf8');

test('wide resource tables stay inside a labelled horizontal scroller', () => {
  assert.match(articlePage, /className="resource-article-content"/);
  assert.match(articlePage, /className="resource-table-frame"/);
  assert.match(articlePage, /className="resource-table-scroll-hint"/);
  assert.match(articlePage, /className="resource-table-scroll"/);
  assert.match(articlePage, /role="region"/);
  assert.match(articlePage, /tabIndex=\{0\}/);
  assert.match(articlePage, /aria-label=\{`\$\{section\.heading\} table, scroll horizontally to see all columns`\}/);

  assert.match(globalStyles, /\.resource-article-content\s*\{[^}]*min-width:\s*0;/s);
  assert.match(globalStyles, /\.resource-table-frame\s*\{[^}]*min-width:\s*0;[^}]*max-width:\s*100%;/s);
  assert.match(globalStyles, /\.resource-table-scroll\s*\{[^}]*width:\s*100%;[^}]*min-width:\s*0;[^}]*overflow-x:\s*auto;[^}]*scrollbar-gutter:\s*stable;/s);
  assert.match(globalStyles, /\.resource-table-scroll::-webkit-scrollbar\s*\{[^}]*height:\s*10px;/s);
});
