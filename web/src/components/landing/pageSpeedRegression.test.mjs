import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '../../..');
const read = relativePath => fs.readFileSync(path.join(webRoot, relativePath), 'utf8');

test('the water scene animates on demand without expensive canvas blur filters', () => {
  const source = read('src/components/landing/WaterScene.tsx');
  const showcase = read('src/components/landing/FeatureShowcase.tsx');
  const conversation = read('src/components/landing/ScrollConversation.tsx');

  assert.doesNotMatch(source, /ctx\.filter\s*=/);
  assert.doesNotMatch(source, /frame\s*=\s*requestAnimationFrame\(animate\)/);
  assert.match(source, /addEventListener\('shrimply:water-progress',\s*schedulePaint\)/);
  assert.match(source, /Math\.abs\(target\s*-\s*travel\)/);
  assert.match(showcase, /rootMargin:\s*'600px 0px'/);
  assert.match(showcase, /if\s*\(!interactive\)\s*return/);
  assert.match(conversation, /rootMargin:\s*'600px 0px'/);
  assert.match(conversation, /if\s*\(!interactive\)\s*return/);
});

test('public routes do not eagerly bundle authenticated providers or Meta Pixel', () => {
  const providers = read('src/components/PortalProviders.tsx');
  const pixel = read('src/components/MetaPixel.tsx');

  assert.doesNotMatch(providers, /^import AppProviders/m);
  assert.match(providers, /dynamic\(\(\)\s*=>\s*import\(["']@\/components\/AppProviders["']\)\)/);
  assert.match(pixel, /addEventListener\(["']pointerdown["']/);
  assert.match(pixel, /addEventListener\(["']scroll["'][\s\S]*?passive:\s*true/);
  assert.match(pixel, /if\s*\(!shouldLoad\)\s*return null/);
});

test('the homepage uses a small base stylesheet instead of the application stylesheet', () => {
  const layout = read('src/app/layout.tsx');
  const homepageBase = read('src/app/homepage-base.css');

  assert.match(layout, /import ["']\.\/homepage-base\.css["']/);
  assert.doesNotMatch(layout, /import ["']\.\/globals\.css["']/);
  assert.doesNotMatch(homepageBase, /\.dashboard-page/);
  assert.ok(homepageBase.length < 15_000, `homepage base CSS is ${homepageBase.length} bytes`);
});

test('landing-page controls and text retain accessible names and contrast', () => {
  const hero = read('src/components/landing/UnderwaterHero.tsx');
  const styles = read('src/components/landing/ocean-home.css');
  const navbar = read('src/components/Navbar.tsx');

  assert.doesNotMatch(hero, /aria-label=\{`\$\{c\.pond\} \$\{pond\.id\}`\}/);
  assert.match(navbar, /<span className="brand-logo" aria-hidden="true" \/>/);
  assert.ok(fs.statSync(path.join(webRoot, 'public/shrimplylogo-mobile-1x.webp')).size < 5_000);
  assert.match(styles, /\.pond-navigation button>span\s*\{[^}]*opacity:\s*1/s);
  for (const lowContrastColor of ['#718390', '#6c8393', '#5e7484', '#6a808d', '#6b8191', '#8496a2', '#7c8f9d', '#738996', '#6f8797', '#657a89', '#7c909e', '#7a91a1', '#627a8b', '#637e90', '#6d8596', '#6e8797']) {
    assert.ok(!styles.toLowerCase().includes(lowContrastColor), `${lowContrastColor} should be replaced`);
  }
});

test('llms.txt publishes crawlable Markdown links', () => {
  const llms = read('public/llms.txt');
  const keyPages = llms.slice(llms.indexOf('## Key Pages'), llms.indexOf('## Audience'));

  assert.match(keyPages, /- \[[^\]]+\]\(https:\/\/www\.shrimplytech\.com\/[^)]*\)/);
  assert.doesNotMatch(keyPages, /^-[^\n]*:\s+https:\/\//m);
});
