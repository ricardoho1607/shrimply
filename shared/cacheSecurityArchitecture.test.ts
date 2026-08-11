import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSource = (path: string) => readFileSync(path, 'utf8');

test('farm cache and offline queue only persist through protected storage', () => {
  const farmCache = readSource('app/services/farmCache.ts');
  const syncHook = readSource('app/hooks/useFirebaseSync.ts');

  assert.doesNotMatch(farmCache, /from ['"]@react-native-async-storage\/async-storage['"]/);
  assert.doesNotMatch(syncHook, /from ['"]@react-native-async-storage\/async-storage['"]/);
  assert.match(farmCache, /writeProtectedItem/);
  assert.match(syncHook, /writeProtectedItem/);
});

test('explicit logout clears all persisted data for the user', () => {
  const authContext = readSource('context/AuthContext.tsx');

  assert.match(authContext, /await clearUserFarmCaches\(userId\)/);
  assert.match(authContext, /await firebaseSignOut\(auth\)/);
});
