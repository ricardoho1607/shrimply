const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const featureEntries = new Map([
  ['app/hooks/useFirebaseSync.ts', 'app/services/firebaseSync'],
  ['app/(tabs)/index.tsx', 'features/pond-management'],
  ['web/src/app/dashboard/water/page.tsx', 'web/src/app/dashboard/water'],
  ['web/src/app/dashboard/ponds/detail/PondDetailClient.tsx', 'web/src/app/dashboard/ponds/detail'],
  ['web/src/app/dashboard/inventory/feeds/page.tsx', 'web/src/app/dashboard/inventory/feeds'],
]);

// Source-contract tests follow the modules actually imported by a feature entry.
// Unconnected files cannot accidentally satisfy an assertion after extraction.
function readFeatureSource(file) {
  const entry = path.resolve(file);
  const feature = featureEntries.get(path.relative(root, entry));
  if (!feature) return fs.readFileSync(entry, 'utf8');
  const directory = path.join(root, feature);
  const seen = new Set();
  function readModule(current) {
    if (seen.has(current)) return '';
    seen.add(current);
    const text = fs.readFileSync(current, 'utf8');
    const source = ts.createSourceFile(current, text, ts.ScriptTarget.Latest, true);
    const dependencies = source.statements.flatMap(statement => {
      if ((!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) || !statement.moduleSpecifier) return [];
      if (ts.isImportDeclaration(statement) && statement.importClause?.isTypeOnly) return [];
      const name = statement.moduleSpecifier.text;
      if (!name.startsWith('.')) return [];
      const base = path.resolve(path.dirname(current), name);
      if (!base.startsWith(directory + path.sep)) return [];
      const resolved = ['.ts', '.tsx'].map(ext => base + ext).find(candidate => fs.existsSync(candidate));
      return resolved ? [readModule(resolved)] : [];
    });
    return [text, ...dependencies].join('\n');
  }
  return readModule(entry);
}
module.exports = { readFeatureSource };
