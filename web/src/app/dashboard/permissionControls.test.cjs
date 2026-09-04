/* eslint-disable @typescript-eslint/no-require-imports -- This is a CommonJS Node test. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const read = (file) => fs.readFileSync(path.resolve(__dirname, file), 'utf8');

test('Feed buttons, open forms and saves all honour the live feeding permission', () => {
  const source = read('feed/page.tsx');
  assert.match(source, /const canEditFeed = hasPermission\('manageFeedInventory'\)/);
  assert.match(source, /\{canEditFeed && \(/);
  assert.match(source, /isModalOpen && canEditFeed/);
  assert.match(source, /if \(!canEditFeed\) return/);
  assert.doesNotMatch(source, /setUser\(/);
});

test('enterprise controls check individual permissions and do not rely on owner roles', () => {
  const source = read('../../components/EnterpriseCycleDashboard.tsx');
  for (const permission of ['managePonds', 'manageCycles', 'manageEnterpriseBlocks', 'recordPondData']) {
    assert.ok(source.includes(`hasPermission('${permission}')`), permission);
  }
  assert.doesNotMatch(source, /user\?\.role === 'owner'/);
  for (const [handler, guard] of [
    ['createCycle', 'canManageCycles'], ['closeCycle', 'canManageCycles'],
    ['createBlock', 'canManageBlocks'], ['createPhysicalPond', 'canManagePonds'],
    ['savePondAssignment', 'canManagePonds'],
  ]) {
    const start = source.indexOf(`const ${handler} =`);
    assert.ok(start >= 0, handler);
    assert.match(source.slice(start, start + 500), new RegExp(`!${guard}`), handler);
  }
});

test('enterprise pond creation honours manager grants while retaining technician block scope', () => {
  const web = read('ponds/page.tsx');
  const mobile = read('../../../../app/(tabs)/index.tsx');
  for (const [source, variable, permission] of [
    [web, 'availableFarmBlocks', 'canEditPonds'],
    [mobile, 'availableEnterpriseBlocks', 'canManagePonds'],
  ]) {
    const start = source.indexOf(`const ${variable} =`);
    const block = source.slice(start, source.indexOf('const accessiblePonds', start));
    assert.ok(block.includes(`!${permission}`));
    assert.match(block, /role === 'technician'/);
    assert.doesNotMatch(block, /role === 'owner'/);
    assert.match(block, /return (?:farmBlocks|enterpriseBlocks\.blocks);/);
  }
});

test('company settings shortcut honours team permission', () => {
  const source = read('company/page.tsx');
  assert.match(source, /hasPermission\('manageTeam'\)/);
  assert.match(source, /\{canManageTeam && \(/);
});

test('admin role changes are audited and both clients receive the user update live', () => {
  const detail = read('../../components/admin/AccountDetail.tsx');
  const commandCenter = read('../../components/admin/AdminCommandCenter.tsx');
  const adapter = read('../../lib/admin/firestoreAdminAdapter.ts');
  const rules = read('../../../../firestore.rules');
  assert.match(detail, /User role/);
  assert.match(detail, /Save role/);
  assert.match(detail, /FARM_STAFF_ROLES/);
  assert.match(commandCenter, /repository\.updateUserRole/);
  assert.match(adapter, /account\.role\.updated/);
  assert.match(adapter, /rebasePermissionOverridesForRole/);
  assert.match(adapter, /Role verification failed/);
  assert.match(rules, /validStaffRoleValue\(request\.resource\.data\.role\)/);
  assert.match(rules, /companyDoc\(resource\.data\.companyId\)\.data\.ownerId != userId/);

  for (const authContext of [
    read('../../contexts/AuthContext.tsx'),
    read('../../../../context/AuthContext.tsx'),
  ]) {
    assert.match(authContext, /onSnapshot\([\s\S]{0,120}doc\(db, ['"]users['"], firebaseUser\.uid\)/);
    assert.match(authContext, /setUser\(userData\)/);
  }
});
