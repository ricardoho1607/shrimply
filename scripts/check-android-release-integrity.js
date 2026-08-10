const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const projectRoot = path.resolve(path.dirname(require.main.filename), '..');
const expectedPackage = 'com.shrimply.tech.investashrimp';
const expectedEasProjectId = '8a20b603-ee9c-44cc-8797-1865788511db';
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

const buildGradle = read('android/app/build.gradle');
const appConfig = read('app.config.js');
const easConfig = JSON.parse(read('eas.json'));
const gitignoreEntries = new Set(
  read('.gitignore')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#')),
);

if (!buildGradle.includes(`applicationId '${expectedPackage}'`)) {
  failures.push(`android/app/build.gradle must use ${expectedPackage}`);
}

if (!appConfig.includes(`package: '${expectedPackage}'`)) {
  failures.push(`app.config.js must use ${expectedPackage}`);
}

if (!appConfig.includes(`projectId: '${expectedEasProjectId}'`)) {
  failures.push(`app.config.js must remain linked to EAS project ${expectedEasProjectId}`);
}

const productionProfile = easConfig.build?.production;
if (easConfig.cli?.appVersionSource !== 'remote') {
  failures.push('EAS Android versioning must use the remote source');
}
if (productionProfile?.credentialsSource !== 'remote') {
  failures.push('The EAS production profile must use remote credentials');
}
if (productionProfile?.autoIncrement !== true) {
  failures.push('The EAS production profile must auto-increment versionCode');
}
if (productionProfile?.channel !== 'production') {
  failures.push('The EAS production profile must use the production channel');
}

if (/release\s*\{[\s\S]*?signingConfig\s+signingConfigs\.debug/.test(buildGradle)) {
  failures.push('Android release builds must never use the debug signing configuration');
}

const trackedFiles = execFileSync('git', ['ls-files', '-z'], {
  cwd: projectRoot,
  encoding: 'utf8',
})
  .split('\0')
  .filter(Boolean);

const trackedSigningFiles = trackedFiles.filter(
  (file) =>
    (/\.(jks|keystore)$/i.test(file) && file !== 'android/app/debug.keystore') ||
    path.basename(file) === 'credentials.json' ||
    /service-account.*\.json$/i.test(path.basename(file)),
);

if (trackedSigningFiles.length > 0) {
  failures.push(`Sensitive signing files are tracked: ${trackedSigningFiles.join(', ')}`);
}

for (const requiredEntry of [
  '*.jks',
  '*.keystore',
  'credentials.json',
  '*.p12',
  '*.pfx',
  '*.pk8',
  '*.pepk',
  '*service-account*.json',
]) {
  if (!gitignoreEntries.has(requiredEntry)) {
    failures.push(`.gitignore must include ${requiredEntry}`);
  }
}

if (failures.length > 0) {
  console.error('Android release integrity check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Android release integrity checks passed.');
