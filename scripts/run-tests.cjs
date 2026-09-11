const fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
function discover(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (['node_modules', 'dist', 'build', 'out', '.next', '.git'].includes(entry.name)) return [];
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? discover(file) : /\.test\.(cjs|mjs|js)$/.test(entry.name) && !entry.name.includes('.emulator.') ? [file] : [];
  });
}
const groups = [
  { cwd: root, files: ['app', 'shared', 'orson', 'functions', 'scripts'].flatMap(dir => discover(path.join(root, dir))).concat(path.join(__dirname, 'typescript-self-tests.cjs')) },
  { cwd: path.join(root, 'web'), files: ['src', 'scripts'].flatMap(dir => discover(path.join(root, 'web', dir))) },
];
let failed = false;
for (const group of groups) {
  const result = spawnSync(process.execPath, ['--require', path.join(__dirname, 'register-typescript.cjs'), '--test', '--test-concurrency=4', ...group.files], { cwd: group.cwd, stdio: 'inherit' });
  if (result.status !== 0) failed = true;
}
process.exitCode = failed ? 1 : 0;
