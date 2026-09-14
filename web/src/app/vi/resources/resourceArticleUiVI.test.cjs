/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const articlePageVI = fs.readFileSync(path.join(__dirname, '[slug]/page.tsx'), 'utf8');
const navbarVI = fs.readFileSync(path.join(__dirname, '../../../components/NavbarVI.tsx'), 'utf8');
const footerVI = fs.readFileSync(path.join(__dirname, '../../../components/FooterVI.tsx'), 'utf8');
const languageToggle = fs.readFileSync(path.join(__dirname, '../../../components/LanguageToggle.tsx'), 'utf8');
const resourceLibraryEN = fs.readFileSync(path.join(__dirname, '../../../data/resourceLibrary.ts'), 'utf8');
const resourceLibraryVI = fs.readFileSync(path.join(__dirname, '../../../data/resourceLibraryVI.ts'), 'utf8');

test('Vietnamese resource library has exact slug parity with English resource library', () => {
  const enSlugs = [...resourceLibraryEN.matchAll(/slug:\s*"([^"]+)"/g)].map(m => m[1]);
  
  const viArticlesDir = path.join(__dirname, '../../../data/vi_articles');
  const viArticleFiles = fs.readdirSync(viArticlesDir).filter(f => f.endsWith('.ts') && f !== 'metadata.ts');
  const viSlugsMap = new Map();
  viArticleFiles.forEach(file => {
    const content = fs.readFileSync(path.join(viArticlesDir, file), 'utf8');
    const match = content.match(/slug:\s*"([^"]+)"/);
    if (match) {
      viSlugsMap.set(match[1], true);
    }
  });

  assert.equal(enSlugs.length, 22, 'English resource library has 22 articles');
  assert.equal(viSlugsMap.size, 22, 'Vietnamese resource articles count is 22');
  
  enSlugs.forEach(slug => {
    assert.ok(viSlugsMap.has(slug), `Vietnamese article for ${slug} must exist`);
  });

  assert.match(resourceLibraryVI, /export const resourceArticlesVI: ResourceArticle\[\] = \[/);
});

test('Vietnamese wide resource tables stay inside a labelled horizontal scroller', () => {
  assert.match(articlePageVI, /className="resource-article-content"/);
  assert.match(articlePageVI, /className="resource-table-frame"/);
  assert.match(articlePageVI, /className="resource-table-scroll-hint"/);
  assert.match(articlePageVI, /className="resource-table-scroll"/);
  assert.match(articlePageVI, /role="region"/);
  assert.match(articlePageVI, /tabIndex=\{0\}/);
  assert.match(articlePageVI, /aria-label=\{`Bảng \$\{section\.heading\}, cuộn ngang để xem toàn bộ các cột`\}/);
});

test('Vietnamese resource page supports inline markdown links in tables and content', () => {
  assert.match(articlePageVI, /const renderInlineLinks =/);
  assert.match(articlePageVI, /\{renderInlineLinks\(cell\)\}/);
  assert.match(articlePageVI, /\{renderInlineLinks\(paragraph\)\}/);
  assert.match(articlePageVI, /\{renderInlineLinks\(item\)\}/);
});

test('Vietnamese resource articles place author & editorial review at bottom of article before related pages', () => {
  const sourcesIdx = articlePageVI.indexOf('Tài liệu tham khảo học thuật');
  const authorIdx = articlePageVI.indexOf('Tác giả và Chuyên gia bình duyệt');
  const relatedIdx = articlePageVI.indexOf('Nội dung liên quan trong Shrimply');

  assert.ok(sourcesIdx !== -1, 'Sources section exists in Vietnamese article page');
  assert.ok(authorIdx !== -1, 'Author & Editorial Review section exists in Vietnamese article page');
  assert.ok(relatedIdx !== -1, 'Related Shrimply Pages section exists in Vietnamese article page');
  assert.ok(authorIdx > sourcesIdx, 'Author section must be located after sources');
  assert.ok(authorIdx < relatedIdx, 'Author section must be located before related pages');
});

test('Vietnamese navbar and footer include Cẩm nang resources links', () => {
  assert.match(navbarVI, /href:\s*["']\/vi\/resources["']/);
  assert.match(navbarVI, /label:\s*["']Cẩm nang["']/);
  assert.match(footerVI, /href:\s*["']\/vi\/resources["']/);
});

test('Language toggle supports 1:1 switching for /resources, /id/resources, /th/resources, and /vi/resources', () => {
  assert.match(languageToggle, /isResourcesPath/);
  assert.match(languageToggle, /\/vi\$\{basePath\}/);
});
