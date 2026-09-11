const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const ts = require('typescript');
require('./register-typescript.cjs');
exports.loadModule = (relativePath, overrides = {}) => {
  const filename = path.resolve(__dirname, '..', relativePath);
  const actual = createRequire(filename);
  const module = { exports: {} };
  const require = name => Object.hasOwn(overrides, name) ? overrides[name] : actual(name);
  const source = fs.readFileSync(filename, 'utf8');
  const code = /\.tsx?$/.test(filename) ? ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText : source;
  vm.runInNewContext(code, { module, exports: module.exports, require, console, Date, URL, process, fetch, AbortSignal, setTimeout, clearTimeout }, { filename });
  return module.exports;
};
exports.loadCallback = (relativePath, name, bindings) => {
  const filename = path.resolve(__dirname, '..', relativePath);
  const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name && node.initializer && ts.isCallExpression(node.initializer)) callback = node.initializer.arguments[0];
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (!callback) throw new Error(`Callback ${name} was not found`);
  const js = ts.transpileModule(`(${callback.getText(source)})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return vm.runInNewContext(js, { console, Date, Promise, Set, Error, ...bindings }, { filename });
};
