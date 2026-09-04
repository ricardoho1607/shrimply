/* eslint-disable @typescript-eslint/no-require-imports -- This is a CommonJS Node test. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const permissionModule = { exports: {} };
new Function('exports', ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../../../shared/permissions.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText)(permissionModule.exports);
const permissions = permissionModule.exports;
const { hasUserPermission } = require('../../../functions/shared/permissions.js');

const hookPath = path.join(__dirname, 'useFarmPermissions.ts');
const root = path.resolve(__dirname, '..');

test('all role and permission defaults, grants and revocations agree with the server', () => {
  const company = { id: 'farm', ownerId: 'owner', teamMembers: ['staff'] };
  for (const role of Object.keys(permissions.FARM_ROLE_PERMISSION_DEFAULTS)) {
    for (const { key } of permissions.FARM_PERMISSION_DEFINITIONS) {
      for (const override of [undefined, true, false]) {
        const user = { uid: 'staff', companyId: 'farm', role, permissionOverrides: override === undefined ? {} : { [key]: override } };
        const saved = permissions.createPermissionOverrides(role, permissions.getEffectivePermissions(role, user.permissionOverrides));
        const client = permissions.hasFarmPermission({ ...user, permissionOverrides: saved }, key, company.ownerId);
        assert.equal(client, override ?? permissions.getDefaultPermissions(role)[key], `${role}/${key}/${override}`);
        assert.equal(client, hasUserPermission({ company, user, uid: user.uid, permission: key }));
        assert.equal(hasUserPermission({ company: { ...company, id: 'other-farm' }, user, uid: user.uid, permission: key }), false);
      }
    }
  }
});

test('changing roles keeps real custom permissions and removes redundant overrides', () => {
  assert.deepEqual(
    permissions.rebasePermissionOverridesForRole('technician', {
      manageFeedInventory: true,
      viewFinance: true,
    }),
    { viewFinance: true },
  );
  assert.deepEqual(
    permissions.rebasePermissionOverridesForRole('manager', {
      manageFeedInventory: false,
      viewFinance: false,
    }),
    { viewFinance: false },
  );
});

test('every dashboard permission check uses the live auth permission hook', () => {
  const offenders = [];
  function scan(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) scan(file);
      else if (/\.tsx?$/.test(file) && /\bhasFarmPermission\s*\(/.test(fs.readFileSync(file, 'utf8'))) {
        offenders.push(path.relative(root, file));
      }
    }
  }
  scan(path.join(root, 'app/dashboard'));
  scan(path.join(root, 'components'));
  assert.deepEqual(offenders, [], 'Pages must not check a partial or stale user profile');
});

test('live permissions handle grants, revocations, sign-out and company changes', () => {
  let auth = { user: { uid: 'staff', role: 'manager' }, company: { ownerId: 'owner' } };
  const output = ts.transpileModule(fs.readFileSync(hookPath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', output)((id) => {
    if (id === '@/contexts/AuthContext') return { useAuth: () => auth };
    if (id.endsWith('/shared/permissions')) return permissions;
    throw new Error(`Unexpected dependency: ${id}`);
  }, mod, mod.exports);
  const allowed = () => mod.exports.useFarmPermissions()('manageFeedInventory');
  assert.equal(allowed(), false);
  auth.user = { ...auth.user, permissionOverrides: { manageFeedInventory: true } };
  assert.equal(allowed(), true, 'A manager grant must show Feed controls');
  auth.user = { ...auth.user, role: 'technician', permissionOverrides: { manageFeedInventory: false } };
  assert.equal(allowed(), false, 'A technician revoke must hide Feed controls');
  auth.company = { ownerId: 'staff' };
  assert.equal(allowed(), true, 'The actual owner retains access');
  auth.company = { ownerId: 'another-owner' };
  assert.equal(allowed(), false, 'Previous ownership must not leak across companies');
  auth.user = null;
  assert.equal(allowed(), false, 'Signed-out sessions have no permissions');
});
