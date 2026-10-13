const test = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('../../scripts/test-module.cjs');
const { randomBytes } = require('node:crypto');
test('logout preserves encrypted pending work for the same account and blocks access while signed out', async () => {
 const storage = new Map(), secure = new Map();
 const api = loadModule('app/services/protectedStorage.ts', {
  '@react-native-async-storage/async-storage': { getItem: async k=>storage.get(k)??null, setItem:async(k,v)=>storage.set(k,v),removeItem:async k=>storage.delete(k),getAllKeys:async()=>[...storage.keys()],multiRemove:async keys=>keys.forEach(k=>storage.delete(k)) },
  'expo-crypto': {getRandomBytesAsync:async n=>new Uint8Array(randomBytes(n))},
  'expo-secure-store': {isAvailableAsync:async()=>true,getItemAsync:async k=>secure.get(k)??null,setItemAsync:async(k,v)=>secure.set(k,v),deleteItemAsync:async k=>secure.delete(k)},
  'react-native': {Platform:{OS:'android'}},
 });
 const { getPendingSyncKey, getFarmCacheKey } = require('../../shared/farmCache.ts');
 const pending = getPendingSyncKey('alice','farm'), cache = getFarmCacheKey('alice','farm');
 api.enableProtectedStorageForUser('alice');
 await api.writeProtectedItem('alice',pending,'pending feed');
 await api.writeProtectedItem('alice',cache,'private farm');
 assert.notEqual(storage.get(pending),'pending feed');
 await api.clearProtectedStorageForUser('alice',true);
 assert.equal(storage.has(cache),false);
 assert.equal(await api.readProtectedItem('alice',pending),null);
 api.enableProtectedStorageForUser('alice');
 assert.equal(await api.readProtectedItem('alice',pending),'pending feed');
 await api.clearProtectedStorageForUser('alice');
 assert.equal(storage.has(pending),false);
 assert.equal(secure.size,0);
});

test('required writes reject unavailable secure storage instead of accepting a no-op', async () => {
 const api = loadModule('app/services/protectedStorage.ts', {
  '@react-native-async-storage/async-storage': { removeItem: async () => { throw new Error('Must not erase pending work'); } },
  'expo-crypto': {},
  'expo-secure-store': { isAvailableAsync: async () => false },
  'react-native': { Platform: { OS: 'android' } },
 });
 await assert.rejects(api.writeProtectedItem('alice', 'pending', 'change', { required: true }), /Secure local storage is unavailable/);
});
