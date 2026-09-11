// Explicit test-only TypeScript runtime, using the already declared compiler.
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const ts = require('typescript');
require.extensions['.ts'] = (mod, filename) => {
  const source = fs.readFileSync(filename, 'utf8').replace(/import\.meta\.url/g, JSON.stringify(pathToFileURL(filename).href));
  mod._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
};
