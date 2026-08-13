const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repositoryRoot = path.join(__dirname, '../..');
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
const vercelConfig = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'vercel.json'), 'utf8'));

test('production deployment uploads the monorepo dependencies used by the web build', () => {
  assert.equal(vercelConfig.buildCommand, 'npm --prefix web run build');
  assert.equal(vercelConfig.outputDirectory, 'web/out');
  assert.match(packageJson.scripts.prebuild, /\.\.\/scripts\/sync-web-pdf-generators\.cjs/);
  assert.match(packageJson.scripts.prebuild, /scripts\/validate-public-env\.cjs/);
  assert.ok(fs.existsSync(path.join(repositoryRoot, 'shared/pondCalculations.ts')));
  assert.ok(fs.existsSync(path.join(repositoryRoot, 'orson/harvestProjection.ts')));
});
