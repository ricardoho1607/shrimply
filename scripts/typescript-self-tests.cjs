const fs = require('node:fs'), path = require('node:path'), test = require('node:test');
require('./register-typescript.cjs');
const root = path.resolve(__dirname, '..');
for (const directory of ['shared', 'orson', 'app/services']) {
  for (const filename of fs.readdirSync(path.join(root, directory))) {
    if (!filename.endsWith('.test.ts')) continue;
    const exports = require(path.join(root, directory, filename));
    for (const [name, fn] of Object.entries(exports)) {
      if (/^run.*SelfTest$/.test(name) && typeof fn === 'function') test(`${directory}/${filename}: ${name}`, fn);
    }
  }
}
