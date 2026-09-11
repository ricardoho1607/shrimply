const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const srcRoot = path.join(__dirname, '..', '..');
const source = name => fs.readFileSync(path.join(srcRoot, name), 'utf8');

test('privacy policy documents Shrimply data handling and user controls', () => {
  const page = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
  for (const expected of ['Information we collect', 'Orson AI and automated processing', 'Retention and deletion', 'Your rights and choices', 'shrimply.tech@gmail.com']) {
    assert.match(page, new RegExp(expected));
  }
  for (const provider of ['Firebase', 'Gemini', 'Vercel', 'Midtrans', 'Meta']) {
    assert.match(page, new RegExp(provider));
  }
});

test('every public locale footer links to the privacy policy', () => {
  for (const footer of ['Footer.tsx', 'FooterID.tsx', 'FooterTH.tsx', 'FooterVI.tsx']) {
    assert.match(source(`components/${footer}`), /href: '\/privacy'/);
  }
});

test('privacy policy is included in the public sitemap', () => {
  assert.match(source('app/sitemap.ts'), /path: '\/privacy'/);
});
