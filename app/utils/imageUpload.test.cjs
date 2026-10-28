const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

test('profile upload waits for resumable transfer before requesting its URL', async () => {
  let complete;
  let requested = false;
  const transfer = new Promise(resolve => { complete = resolve; });
  const sdk = {
    ref: (_, path) => path,
    uploadBytesResumable: (path, blob) => {
      assert.match(path, /^users\/user-a\/profile\//);
      assert.equal(blob, 'image-data');
      return transfer;
    },
    getDownloadURL: async () => { requested = true; return 'https://example.test/image'; },
  };
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(`${__dirname}/imageUpload.ts`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('require', 'exports', 'fetch', code)(name => {
    if (name === 'firebase/storage') return sdk;
    if (name === '../../config/firebase') return { storage: {} };
    throw Error(name);
  }, mod.exports, async () => ({ blob: async () => 'image-data' }));
  const upload = mod.exports.uploadProfileImage('local://photo', 'user-a');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(requested, false);
  complete();
  assert.equal(await upload, 'https://example.test/image');
  assert.equal(requested, true);
});
