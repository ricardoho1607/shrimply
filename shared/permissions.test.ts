import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPermissionOverrides,
  getDefaultPermissions,
  getEffectivePermissions,
  hasFarmPermission,
} from './permissions.ts';

test('preserves the existing role permission defaults', () => {
  assert.equal(getDefaultPermissions('owner').manageTeam, true);
  assert.equal(getDefaultPermissions('manager').manageFinance, true);
  assert.equal(getDefaultPermissions('manager').managePonds, false);
  assert.equal(getDefaultPermissions('technician').recordPondData, true);
  assert.equal(getDefaultPermissions('technician').viewFinance, false);
  assert.equal(getDefaultPermissions('mechanic').logAssetMaintenance, true);
  assert.equal(getDefaultPermissions('buyer').viewFarm, false);
});

test('applies only valid per-user overrides', () => {
  const permissions = getEffectivePermissions('manager', {
    managePonds: true,
    manageFinance: false,
    unknownPermission: true,
  });
  assert.equal(permissions.managePonds, true);
  assert.equal(permissions.manageFinance, false);
  assert.equal('unknownPermission' in permissions, false);
});

test('company owner access cannot be removed by overrides', () => {
  assert.equal(hasFarmPermission({ uid: 'owner-a', role: 'manager', permissionOverrides: { manageTeam: false } }, 'manageTeam', 'owner-a'), true);
});

test('stores only values that differ from the selected role', () => {
  const permissions = { ...getDefaultPermissions('technician'), viewFinance: true, managePonds: false };
  assert.deepEqual(createPermissionOverrides('technician', permissions), { managePonds: false, viewFinance: true });
});
