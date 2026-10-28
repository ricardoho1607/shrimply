const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

test('failed PDF assets retry while successful and concurrent downloads are reused', async () => {
  const calls = [];
  let fail = true;
  const fetch = async url => {
    calls.push(url);
    if (url.includes('background') && fail) throw Error('Connection lost');
    return { ok: true, blob: async () => ({}) };
  };
  class FileReader {
    readAsDataURL() { this.result = 'data:image/png;base64,YQ=='; this.onload(); }
  }
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(`${__dirname}/mobilePdfExport.ts`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('exports', 'fetch', 'FileReader', code)(mod.exports, fetch, FileReader);
  await assert.rejects(mod.exports.loadMobilePdfBrandAssets('portrait'), /Connection lost/);
  fail = false;
  const results = await Promise.all([
    mod.exports.loadMobilePdfBrandAssets('portrait'),
    mod.exports.loadMobilePdfBrandAssets('portrait'),
  ]);
  assert.deepEqual(results[0], { backgroundBase64: 'YQ==', logoBase64: 'YQ==' });
  assert.deepEqual(results[0], results[1]);
  assert.equal(calls.filter(url => url.includes('background')).length, 2);
  assert.equal(calls.filter(url => url.includes('logo')).length, 1);
});
