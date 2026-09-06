import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import postcss from 'postcss';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, 'publicRoutes.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const exportsObject = {};
new Function('exports', compiled)(exportsObject);
const { publicThemeRoute, landingPath } = exportsObject;
const app = path.resolve(__dirname, '../../app');

function pages(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? pages(file) : entry.name === 'page.tsx' ? [file] : [];
  });
}

test('every existing public page opts in, while every application page stays outside the theme', () => {
  for (const file of pages(app)) {
    const route = '/' + path.relative(app, path.dirname(file)).split(path.sep)
      .filter(segment => segment && !segment.startsWith('(')).join('/');
    const protectedPage = /^\/(dashboard|setup|admin|roleselection)(\/|$)/.test(route);
    assert.equal(Boolean(publicThemeRoute(route)), !protectedPage, route);
  }
  for (const route of [null, '/dashboard-copy', '/auth/settings', '/id/auth', '/unknown', '/features/unknown']) {
    assert.equal(publicThemeRoute(route), null, String(route));
  }
});

test('localized calls to action retain real marketing and shared authentication routes', () => {
  for (const locale of ['en', 'id', 'th', 'vi']) {
    const copy = JSON.parse(fs.readFileSync(path.join(__dirname, `${locale}.json`), 'utf8'));
    for (const target of [...copy.capabilities.map(item => item.path), ...copy.features.map(item => `/features/${item.path}`), '/orson', '/how-it-works', '/']) {
      const route = landingPath(locale, target);
      assert.equal(publicThemeRoute(route)?.locale, locale, route);
    }
    assert.equal(landingPath(locale, '/auth/join'), '/auth/join');
    assert.equal(landingPath(locale, '/resources'), '/resources');
    assert.equal(copy.features.length, 4);
    assert.equal(copy.pondFocus.length, 3);
    assert.ok(copy.orsonIntro.includes('frontier'));
  }
});

test('theme styles cannot select signed-in application elements', () => {
  for (const file of ['public-theme.css', 'ocean-home.css']) {
    postcss.parse(fs.readFileSync(path.join(__dirname, file), 'utf8')).walkRules(rule => {
      if (rule.parent.type === 'atrule' && /keyframes$/.test(rule.parent.name)) return;
      for (const selector of rule.selectors) {
        assert.match(selector, /^(?:\.ocean-(?:home|theme)(?=[\s.:#\[>+~]|$)|(?:html|body):has\(\.ocean-theme\))/, `${file}: ${selector}`);
      }
    });
  }
});

test('feature showcase advances with page scroll and has no clickable menu tabs', () => {
  const showcase = fs.readFileSync(path.join(__dirname, 'FeatureShowcase.tsx'), 'utf8');

  assert.match(showcase, /className="feature-scroll-stage"/);
  assert.match(showcase, /addEventListener\('scroll'/);
  assert.doesNotMatch(showcase, /feature-scroll-menu/);
  assert.doesNotMatch(showcase, /role="tab(?:list)?"/);
  assert.doesNotMatch(showcase, /className="feature-tab"/);
});
