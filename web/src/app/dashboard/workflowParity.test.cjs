const assert = require('node:assert/strict');
const { readFeatureSource } = require('../../../../scripts/read-feature-source.cjs');
const path = require('node:path');
const test = require('node:test');

const read = (relativePath) => readFeatureSource(path.join(__dirname, relativePath));

test('web source mutations create deterministic finance records and support multi-pond harvests', () => {
  const harvest = read('./harvest/page.tsx');
  const inventory = read('./inventory/feeds/page.tsx');
  assert.match(harvest, /harvestBatch/);
  assert.match(harvest, /financeSyncDocumentId\(revenue\.reference\)/);
  assert.match(inventory, /financeSyncDocumentId\(expense\.reference\)/);
});

test('marketplace lifecycle and operational notifications match mobile workflows', () => {
  const marketplace = read('./marketplace/page.tsx');
  const layout = read('./layout.tsx');
  assert.match(marketplace, /marketplace_responses/);
  assert.doesNotMatch(marketplace, /country:\s*['"]Indonesia['"]/);
  assert.match(layout, /useNotificationChecker\(company\?\.id, user\?\.role\)/);
});

test('web exposes sampling correction, asset media, team removal, profile photos, and Google sign-in', () => {
  const sampling = read('./ponds/detail/PondDetailClient.tsx');
  const assets = read('./inventory/assets/page.tsx');
  const settings = read('./settings/page.tsx');
  const auth = read('../auth/page.tsx');
  assert.match(sampling, /editingSamplingId/);
  assert.match(assets, /QRCode\.toDataURL/);
  assert.match(assets, /uploadPhotos/);
  assert.match(settings, /removeMember/);
  assert.match(settings, /handleProfilePhoto/);
  assert.match(auth, /signInWithGoogle/);
});
