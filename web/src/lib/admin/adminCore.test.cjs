/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const coreSource = fs.readFileSync(path.join(__dirname, 'adminCore.ts'), 'utf8');
const compiled = ts.transpileModule(coreSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const loadedModule = { exports: {} };
new Function('module', 'exports', 'require', compiled)(loadedModule, loadedModule.exports, require);
const core = loadedModule.exports;

test('admin route renders AdminCommandCenter directly', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'src/app/admin/page.tsx'), 'utf8');
  assert.match(source, /<AdminCommandCenter \/>/);
  assert.doesNotMatch(source, /AdminOverview/);
});

test('admin selection is reflected in URL state', () => {
  assert.equal(core.shouldSyncAdminSelection(null, 'user-123'), true);
  assert.equal(core.shouldSyncAdminSelection('', 'user-123'), true);
  assert.equal(core.shouldSyncAdminSelection('user-123', 'user-123'), false);
  assert.equal(core.shouldSyncAdminSelection('user-123', 'user-456'), true);
});

test('a directly requested user remains selected even when absent from the current directory page', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'src/components/admin/AdminCommandCenter.tsx'), 'utf8');
  assert.match(source, /if \(requestedUserId\) return requestedUserId/);
});

test('selected account has a direct return path to the user directory', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'src/components/admin/AdminCommandCenter.tsx'), 'utf8');
  assert.match(source, /handleBackToDirectory/);
  assert.match(source, /backIconButton/);
});

test('selected account can change the linked farm mode with an audited Firestore update', () => {
  const detail = fs.readFileSync(path.join(process.cwd(), 'src/components/admin/AccountDetail.tsx'), 'utf8');
  const adapter = fs.readFileSync(path.join(process.cwd(), 'src/lib/admin/firestoreAdminAdapter.ts'), 'utf8');
  assert.match(detail, /Farm mode/);
  assert.match(detail, /enterprise/);
  assert.match(detail, /onUpdateFarmMode/);
  assert.match(adapter, /businessSize: input\.businessSize/);
  assert.match(adapter, /farm\.mode\.updated/);
  assert.match(adapter, /savedBusinessSize !== input\.businessSize/);
});

test('selected account permissions use role defaults and audited Firestore overrides', () => {
  const detail = fs.readFileSync(path.join(process.cwd(), 'src/components/admin/AccountDetail.tsx'), 'utf8');
  const adapter = fs.readFileSync(path.join(process.cwd(), 'src/lib/admin/firestoreAdminAdapter.ts'), 'utf8');
  const rules = fs.readFileSync(path.join(process.cwd(), '..', 'firestore.rules'), 'utf8');
  assert.match(detail, /FARM_PERMISSION_DEFINITIONS/);
  assert.match(detail, /Use role defaults/);
  assert.match(detail, /Owner · locked/);
  assert.match(adapter, /account\.permissions\.updated/);
  assert.match(adapter, /permissionOverrides/);
  assert.match(rules, /hasCompanyPermission/);
  assert.match(rules, /permissionsUpdatedBy == request\.auth\.uid/);
});

test('admin UI masks directory contacts and audits the selected email reveal', () => {
  const directory = fs.readFileSync(path.join(process.cwd(), 'src/components/admin/UserDirectory.tsx'), 'utf8');
  const detail = fs.readFileSync(path.join(process.cwd(), 'src/components/admin/AccountDetail.tsx'), 'utf8');
  const commandCenter = fs.readFileSync(path.join(process.cwd(), 'src/components/admin/AdminCommandCenter.tsx'), 'utf8');
  const backend = fs.readFileSync(path.join(process.cwd(), '..', 'functions/adminIntelligence.js'), 'utf8');
  assert.match(directory, /user\.maskedEmail/);
  assert.doesNotMatch(directory, /user\.email/);
  assert.match(detail, /account\.email/);
  assert.doesNotMatch(detail, /account\.maskedEmail/);
  assert.match(detail, /account\.maskedPhone/);
  assert.doesNotMatch(detail, /account\.phone/);
  assert.match(backend, /account\.contact\.reveal/);
  assert.match(backend, /revealedFields: \["email"\]/);
  assert.match(commandCenter, /<AccountTimeline/);
  assert.match(commandCenter, /<AdminActions/);
});

test('annotated admin chrome is simplified without removing core account data', () => {
  const sidebar = fs.readFileSync(path.join(process.cwd(), 'src/components/admin/AdminSidebar.tsx'), 'utf8');
  const commandCenter = fs.readFileSync(path.join(process.cwd(), 'src/components/admin/AdminCommandCenter.tsx'), 'utf8');
  const detail = fs.readFileSync(path.join(process.cwd(), 'src/components/admin/AccountDetail.tsx'), 'utf8');
  const styles = fs.readFileSync(path.join(process.cwd(), 'src/app/admin/admin.module.css'), 'utf8');
  assert.doesNotMatch(sidebar, /next\/image|brandLogo|Shrimply Admin home/);
  assert.match(sidebar, /<strong>Admin<\/strong>/);
  assert.doesNotMatch(commandCenter, /universalSearch|MobilePanelButton/);
  assert.doesNotMatch(detail, /<Building2|<ShieldCheck|<Sparkles/);
  assert.match(styles, /\.sidebar[\s\S]*border-right: 1px solid var\(--admin-line\)/);
  assert.match(styles, /\.detailSection[^\n]*border-bottom: 0/);
});

test('Firestore owner reads require platform-owner claims without an email allowlist', () => {
  const rules = fs.readFileSync(path.join(process.cwd(), '..', 'firestore.rules'), 'utf8');
  assert.match(rules, /request\.auth\.token\.platformOwner == true/);
  assert.match(rules, /request\.auth\.token\.platformRole == 'owner'/);
  assert.doesNotMatch(rules, /ricardofransiskusho@gmail\.com/i);
  assert.match(rules, /match \/adminAuditEvents\/\{eventId\}/);
  assert.match(rules, /match \/securityEvents\/\{eventId\}/);
});

test('masks email and phone values without exposing full PII', () => {
  assert.equal(core.maskEmail('ayu.pratama@example.com'), 'ay••••••••@example.com');
  assert.equal(core.maskPhone('+62 812-3456-7890'), '+•• ••• ••• 7890');
});

test('latest activity uses the newest valid timestamp', () => {
  assert.equal(core.getLatestIsoTimestamp([
    '2026-08-03T09:15:00.000Z',
    null,
    'invalid',
    '2026-08-04T10:24:00.000Z',
  ]), '2026-08-04T10:24:00.000Z');
  assert.equal(core.getLatestIsoTimestamp([null, undefined, 'invalid']), null);
});

test('health calculation is weighted, transparent, and status-aware', () => {
  const healthy = core.calculateAccountHealth({
    loginRecencyScore: 100,
    samplingActivityScore: 80,
    dataCompletenessScore: 90,
    featureAdoptionScore: 75,
    subscriptionScore: 100,
    syncReliabilityScore: 100,
    supportScore: 80,
    securityScore: 100,
  });
  assert.equal(healthy.score, 89);
  assert.equal(healthy.label, 'Healthy');
  assert.equal(healthy.signals.length, 5);
  const partial = core.calculateAccountHealth({
    loginRecencyScore: 100,
    samplingActivityScore: null,
    dataCompletenessScore: null,
    featureAdoptionScore: null,
    subscriptionScore: null,
    syncReliabilityScore: null,
    supportScore: null,
    securityScore: null,
  });
  assert.equal(partial.score, 100);
  assert.equal(partial.signals[1].score, null);
  assert.equal(core.calculateAccountHealth({ ...Object.fromEntries(Object.keys({
    loginRecencyScore: 0, samplingActivityScore: 0, dataCompletenessScore: 0, featureAdoptionScore: 0,
    subscriptionScore: 0, syncReliabilityScore: 0, supportScore: 0, securityScore: 0,
  }).map((key) => [key, 100])), suspended: true }).label, 'Suspended');
});

test('directory search and filters cover identifiers, farms, status, and activity', () => {
  const users = [
    { id: 'USR-1', name: 'Ayu Pratama', maskedEmail: 'ay••••@example.com', initials: 'AP', status: 'Healthy', plan: 'Professional', country: 'Indonesia', joinedAt: '2026-07-01T00:00:00Z', lastActiveAt: '2026-08-03T00:00:00Z', farmName: 'Tambak Indah' },
    { id: 'USR-2', name: 'Budi Santoso', maskedEmail: 'bu••••@example.com', initials: 'BS', status: 'Inactive', plan: 'Free', country: 'Indonesia', joinedAt: '2025-01-01T00:00:00Z', lastActiveAt: '2025-10-01T00:00:00Z', farmName: 'Samudra Farm' },
  ];
  const all = { status: 'all', plan: 'all', country: 'all', activity: 'all', registered: 'all' };
  assert.deepEqual(core.filterDirectoryUsers(users, 'tambak', all, new Date('2026-08-04T00:00:00Z')).map((user) => user.id), ['USR-1']);
  assert.deepEqual(core.filterDirectoryUsers(users, '', { ...all, status: 'Inactive', activity: '90d+' }, new Date('2026-08-04T00:00:00Z')).map((user) => user.id), ['USR-2']);
});

test('sensitive actions require a meaningful reason and explicit confirmation', () => {
  assert.equal(core.validateSensitiveAction('short', true).allowed, false);
  assert.equal(core.validateSensitiveAction('Investigating failed sync reports', false).allowed, false);
  assert.equal(core.validateSensitiveAction('Investigating failed sync reports', true).allowed, true);
  assert.equal(core.validateDeleteUserAction('Remove duplicate test account', 'wrong@example.com', 'user@example.com').allowed, false);
  assert.equal(core.validateDeleteUserAction('short', 'user@example.com', 'user@example.com').allowed, false);
  assert.equal(core.validateDeleteUserAction('Remove duplicate test account', 'USER@example.com', 'user@example.com').allowed, true);
});
