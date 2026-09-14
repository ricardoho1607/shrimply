/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const articlePageTH = fs.readFileSync(path.join(__dirname, '[slug]/page.tsx'), 'utf8');
const navbarTH = fs.readFileSync(path.join(__dirname, '../../../components/NavbarTH.tsx'), 'utf8');
const footerTH = fs.readFileSync(path.join(__dirname, '../../../components/FooterTH.tsx'), 'utf8');
const languageToggle = fs.readFileSync(path.join(__dirname, '../../../components/LanguageToggle.tsx'), 'utf8');
const resourceLibraryEN = fs.readFileSync(path.join(__dirname, '../../../data/resourceLibrary.ts'), 'utf8');
const resourceLibraryTH = fs.readFileSync(path.join(__dirname, '../../../data/resourceLibraryTH.ts'), 'utf8');

test('Thai resource library has exact slug parity with English resource library', () => {
  const enSlugs = [...resourceLibraryEN.matchAll(/slug:\s*"([^"]+)"/g)].map(m => m[1]);
  
  const thArticlesDir = path.join(__dirname, '../../../data/th_articles');
  const thArticleFiles = fs.readdirSync(thArticlesDir).filter(f => f.endsWith('.ts') && f !== 'metadata.ts');
  const thSlugsMap = new Map();
  thArticleFiles.forEach(file => {
    const content = fs.readFileSync(path.join(thArticlesDir, file), 'utf8');
    const match = content.match(/slug:\s*"([^"]+)"/);
    if (match) {
      thSlugsMap.set(match[1], true);
    }
  });

  assert.equal(enSlugs.length, 22, 'English resource library has 22 articles');
  assert.equal(thSlugsMap.size, 22, 'Thai resource articles count is 22');
  
  enSlugs.forEach(slug => {
    assert.ok(thSlugsMap.has(slug), `Thai article for ${slug} must exist`);
  });

  assert.match(resourceLibraryTH, /export const resourceArticlesTH: ResourceArticle\[\] = \[/);
});

test('Thai wide resource tables stay inside a labelled horizontal scroller', () => {
  assert.match(articlePageTH, /className="resource-article-content"/);
  assert.match(articlePageTH, /className="resource-table-frame"/);
  assert.match(articlePageTH, /className="resource-table-scroll-hint"/);
  assert.match(articlePageTH, /className="resource-table-scroll"/);
  assert.match(articlePageTH, /role="region"/);
  assert.match(articlePageTH, /tabIndex=\{0\}/);
  assert.match(articlePageTH, /aria-label=\{`ตาราง \$\{section\.heading\}, เลื่อนในแนวนอนเพื่อดูคอลัมน์ทั้งหมด`\}/);
});

test('Thai resource page supports inline markdown links in tables and content', () => {
  assert.match(articlePageTH, /const renderInlineLinks =/);
  assert.match(articlePageTH, /\{renderInlineLinks\(cell\)\}/);
  assert.match(articlePageTH, /\{renderInlineLinks\(paragraph\)\}/);
  assert.match(articlePageTH, /\{renderInlineLinks\(item\)\}/);
});

test('Thai resource articles place author & editorial review at bottom of article before related pages', () => {
  const sourcesIdx = articlePageTH.indexOf('แหล่งข้อมูลอ้างอิงทางวิชาการ');
  const authorIdx = articlePageTH.indexOf('ผู้เขียนและผู้ตรวจสอบทางวิชาการ');
  const relatedIdx = articlePageTH.indexOf('เนื้อหาที่เกี่ยวข้องใน Shrimply');

  assert.ok(sourcesIdx !== -1, 'Sources section exists in Thai article page');
  assert.ok(authorIdx !== -1, 'Author & Editorial Review section exists in Thai article page');
  assert.ok(relatedIdx !== -1, 'Related Shrimply Pages section exists in Thai article page');
  assert.ok(authorIdx > sourcesIdx, 'Author section must be located after sources');
  assert.ok(authorIdx < relatedIdx, 'Author section must be located before related pages');
});

test('Thai navbar and footer include คู่มือ resources links', () => {
  assert.match(navbarTH, /href:\s*["']\/th\/resources["']/);
  assert.match(navbarTH, /label:\s*["']คู่มือ["']/);
  assert.match(footerTH, /href:\s*["']\/th\/resources["']/);
});

test('Language toggle supports 1:1 switching for /resources, /id/resources, and /th/resources', () => {
  assert.match(languageToggle, /isResourcesPath/);
  assert.match(languageToggle, /\/th\$\{basePath\}/);
});
