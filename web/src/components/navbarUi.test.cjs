const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const componentNames = ['Navbar.tsx', 'NavbarID.tsx', 'NavbarTH.tsx', 'NavbarVI.tsx'];
const navbarSources = componentNames.map((name) => ({
  name,
  source: fs.readFileSync(path.join(__dirname, name), 'utf8'),
}));
const languageToggle = fs.readFileSync(path.join(__dirname, 'LanguageToggle.tsx'), 'utf8');

test('desktop language control shows one current locale and opens a menu', () => {
  assert.match(languageToggle, /aria-haspopup="menu"/);
  assert.match(languageToggle, /aria-expanded=\{menuOpen\}/);
  assert.match(languageToggle, /role="menu"/);
  assert.match(languageToggle, /currentLanguage\.code/);
});

test('localized desktop navbars keep links and actions on one centered line', () => {
  navbarSources.forEach(({ name, source }) => {
    assert.match(source, /\.desktop-links\s*\{[^}]*flex:\s*1;[^}]*justify-content:\s*center;/s, name);
    assert.match(source, /:global\(\.nav-link\)\s*\{[^}]*white-space:\s*nowrap;/s, name);
    assert.match(source, /:global\(\.signin-link\)\s*\{[^}]*display:\s*inline-flex;[^}]*align-items:\s*center;[^}]*white-space:\s*nowrap;/s, name);
  });
});
