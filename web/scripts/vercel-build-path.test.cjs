const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ignore = require('ignore');

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

test('Vercel includes shared client contracts and excludes backend secrets and code', () => {
  const excluded = ignore().add(fs.readFileSync(path.join(repositoryRoot, '.vercelignore'), 'utf8'));
  for (const directory of ['functions', 'functions/shared']) {
    assert.equal(excluded.ignores(directory), false, `${directory} must be traversed during upload`);
  }
  for (const contract of ['labMeasurementContract', 'orsonPromptPolicy']) {
    for (const extension of ['js', 'd.ts']) {
      const file = `functions/shared/${contract}.${extension}`;
      assert.ok(fs.existsSync(path.join(repositoryRoot, file)));
      assert.equal(excluded.ignores(file), false, `${file} must reach the web build`);
    }
  }
  for (const file of ['.env', '.env.local', 'web/.env.production', '.secret.local', 'functions/.secret.local', 'functions/.env', 'functions/orson.js', 'functions/node_modules/example/index.js', 'functions/shared/metaModelApi.js']) {
    assert.equal(excluded.ignores(file), true, `${file} must stay out of the web deployment`);
  }
});
