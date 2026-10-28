const assert = require('node:assert/strict');
const test = require('node:test');
require('../../../scripts/register-typescript.cjs');
const { loadTranslations, englishTranslations, isLanguage } = require('./loadTranslations.ts');

test('English startup does not load the four unused language dictionaries', () => {
  assert.ok(englishTranslations.nav.ponds);
  for (const lang of ['id','th','zh','vi']) assert.equal(require.cache[require.resolve(`./${lang}.ts`)], undefined, lang);
  assert.equal(isLanguage('__proto__'), false);
  assert.equal(isLanguage('en'), true);
});

test('each deferred language exactly preserves the existing merged translations', async () => {
  const {translations} = require('./index.ts');
  for (const lang of ['en','id','th','zh','vi']) {
    assert.equal(loadTranslations(lang), loadTranslations(lang), 'in-flight and successful loads are reused');
    assert.deepEqual(await loadTranslations(lang), translations[lang], lang);
  }
});
