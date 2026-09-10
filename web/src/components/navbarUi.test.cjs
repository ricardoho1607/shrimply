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
const globals = fs.readFileSync(path.join(__dirname, '../app/globals.css'), 'utf8');
const publicTheme = fs.readFileSync(path.join(__dirname, 'landing/public-theme.css'), 'utf8');

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

test('navbar layout is available in the server-rendered stylesheet for the first paint', () => {
  assert.match(globals, /#navbar \.desktop-links\s*\{[^}]*display:\s*flex;[^}]*justify-content:\s*center;/s);
  assert.match(globals, /#navbar \.desktop-actions\s*\{[^}]*display:\s*flex;/s);
  assert.match(globals, /#navbar \.nav-link\s*\{[^}]*white-space:\s*nowrap;/s);
  assert.match(globals, /#navbar \.mobile-menu-button,[\s\S]*?#navbar \.mobile-drawer:not\(\.open\)\s*\{\s*display:\s*none;/s);
});

test('public mobile navigation uses a flat list instead of individual link containers', () => {
  assert.match(publicTheme, /\.ocean-theme #navbar \.drawer-link\s*\{[\s\S]*?display:\s*flex !important;[\s\S]*?align-items:\s*center !important;[\s\S]*?border:\s*0 !important;[\s\S]*?background:\s*transparent !important;[\s\S]*?box-shadow:\s*none !important;/);
  assert.match(publicTheme, /\.ocean-theme #navbar \.drawer-links\s*\{[\s\S]*?gap:\s*2px;[\s\S]*?border:\s*0;/);
  assert.match(publicTheme, /\.ocean-theme #navbar \.drawer-link\s*\{[\s\S]*?min-height:\s*38px !important;/);
  assert.match(publicTheme, /\.ocean-theme #navbar \.drawer-link\s*\{[\s\S]*?font-size:\s*1\.05rem !important;[\s\S]*?font-weight:\s*600 !important;/);
  assert.match(publicTheme, /\.ocean-theme #navbar \.mobile-lang-btn\s*\{[\s\S]*?font-size:\s*1\.05rem;[\s\S]*?font-weight:\s*600;/);
  assert.doesNotMatch(publicTheme, /\.ocean-theme #navbar \.drawer-link\.active\s*{[^}]*border-left:/);
  assert.match(publicTheme, /\.ocean-theme #navbar \.drawer-signin\s*{[\s\S]*?border:\s*0 !important;[\s\S]*?background:\s*transparent !important;/);
});

test('mobile sign in follows the navigation links and mobile signup CTA is omitted', () => {
  navbarSources.forEach(({ name, source }) => {
    const drawer = source.slice(source.indexOf('<aside'), source.indexOf('<style jsx>'));
    assert.match(drawer, /\{navItems\.map[\s\S]*?className="drawer-link drawer-signin"/, name);
    assert.doesNotMatch(drawer, /drawer-primary/, name);
    assert.doesNotMatch(drawer, /href="\/auth\/join"/, name);
  });
});
