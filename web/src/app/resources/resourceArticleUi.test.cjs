/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const articlePage = fs.readFileSync(path.join(__dirname, '[slug]/page.tsx'), 'utf8');
const globalStyles = fs.readFileSync(path.join(__dirname, '../globals.css'), 'utf8');
const resourceLibrary = fs.readFileSync(path.join(__dirname, '../../data/resourceLibrary.ts'), 'utf8');

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

test('resource page supports inline markdown links in tables and content', () => {
  assert.match(articlePage, /const renderInlineLinks =/);
  assert.match(articlePage, /\{renderInlineLinks\(cell\)\}/);
  assert.match(articlePage, /\{renderInlineLinks\(paragraph\)\}/);
  assert.match(articlePage, /\{renderInlineLinks\(item\)\}/);
});

test('Vannamei water-quality guide uses contextual ranges and a dedicated image', () => {
  assert.match(resourceLibrary, /vannamei-water-quality-parameters-infographic\.png/);
  assert.match(resourceLibrary, /10–20 ppt growth-favourable reference/);
  assert.match(resourceLibrary, /practical references, not universal pass-or-fail limits/i);
  assert.doesNotMatch(resourceLibrary, /Shrimply automatically calculates toxic un-ionized NH₃/);
  assert.doesNotMatch(resourceLibrary, /molasses \(5–10 kg\/ha\)/);
});
