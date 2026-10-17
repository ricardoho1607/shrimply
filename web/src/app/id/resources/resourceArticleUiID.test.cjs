/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const articlePageID = fs.readFileSync(path.join(__dirname, '[slug]/page.tsx'), 'utf8');
const navbarID = fs.readFileSync(path.join(__dirname, '../../../components/NavbarID.tsx'), 'utf8');
const footerID = fs.readFileSync(path.join(__dirname, '../../../components/FooterID.tsx'), 'utf8');
const languageToggle = fs.readFileSync(path.join(__dirname, '../../../components/LanguageToggle.tsx'), 'utf8');
const resourceLibraryEN = fs.readFileSync(path.join(__dirname, '../../../data/resourceLibrary.ts'), 'utf8');
const resourceLibraryID = fs.readFileSync(path.join(__dirname, '../../../data/resourceLibraryID.ts'), 'utf8');

test('Indonesian resource library has exact slug parity with English resource library', () => {
  const enSlugs = [...resourceLibraryEN.matchAll(/slug:\s*"([^"]+)"/g)].map(m => m[1]);
  
  const idArticlesDir = path.join(__dirname, '../../../data/id_articles');
  const idArticleFiles = fs.readdirSync(idArticlesDir).filter(f => f.endsWith('.ts') && f !== 'metadata.ts');
  const idSlugsMap = new Map();
  idArticleFiles.forEach(file => {
    const content = fs.readFileSync(path.join(idArticlesDir, file), 'utf8');
    const match = content.match(/slug:\s*"([^"]+)"/);
    if (match) {
      idSlugsMap.set(match[1], true);
    }
  });

  assert.equal(enSlugs.length, 22, 'English resource library has 22 articles');
  assert.equal(idSlugsMap.size, 22, 'Indonesian resource articles count is 22');
  
  enSlugs.forEach(slug => {
    assert.ok(idSlugsMap.has(slug), `Indonesian article for ${slug} must exist`);
  });

  assert.match(resourceLibraryID, /export const resourceArticlesID: ResourceArticle\[\] = \[/);
});

test('Indonesian wide resource tables stay inside a labelled horizontal scroller', () => {
  assert.match(articlePageID, /className="resource-article-content"/);
  assert.match(articlePageID, /className="resource-table-frame"/);
  assert.match(articlePageID, /className="resource-table-scroll-hint"/);
  assert.match(articlePageID, /className="resource-table-scroll"/);
  assert.match(articlePageID, /role="region"/);
  assert.match(articlePageID, /tabIndex=\{0\}/);
  assert.match(articlePageID, /aria-label=\{`Tabel \$\{section\.heading\}, gulir horizontal untuk melihat seluruh kolom`\}/);
});

test('Indonesian resource page supports inline markdown links in tables and content', () => {
  assert.match(articlePageID, /const renderInlineLinks =/);
  assert.match(articlePageID, /\{renderInlineLinks\(cell\)\}/);
  assert.match(articlePageID, /\{renderInlineLinks\(paragraph\)\}/);
  assert.match(articlePageID, /\{renderInlineLinks\(item\)\}/);
});

test('Indonesian resource articles place author & editorial review at bottom of article before related pages', () => {
  const sourcesIdx = articlePageID.indexOf('Sumber dan Referensi Bacaan');
  const authorIdx = articlePageID.indexOf('Penulis & Peninjau Ahli');
  const relatedIdx = articlePageID.indexOf('Halaman Terkait Shrimply');

  assert.ok(sourcesIdx !== -1, 'Sources section exists in Indonesian article page');
  assert.ok(authorIdx !== -1, 'Author & Editorial Review section exists in Indonesian article page');
  assert.ok(relatedIdx !== -1, 'Related Shrimply Pages section exists in Indonesian article page');
  assert.ok(authorIdx > sourcesIdx, 'Author section must be located after sources');
  assert.ok(authorIdx < relatedIdx, 'Author section must be located before related pages');
});

test('Indonesian navbar and footer include Panduan resources links', () => {
  assert.match(navbarID, /href:\s*["']\/id\/resources["']/);
  assert.match(navbarID, /label:\s*["']Panduan["']/);
  assert.match(footerID, /href:\s*["']\/id\/resources["']/);
});

test('Language toggle supports 1:1 switching for /resources and /id/resources', () => {
  assert.match(languageToggle, /const enHref = basePath === "\/" \? "\/" : basePath/);
  assert.match(languageToggle, /\/id\$\{basePath\}/);
});
