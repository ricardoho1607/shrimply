import assert from 'node:assert/strict';
import test from 'node:test';
import { fromByteArray, toByteArray } from 'base64-js';
import {
  decryptStorageValue,
  encryptStorageValue,
  isProtectedStorageEnvelope,
} from './protectedStorage.ts';

const key = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
const nonce = Uint8Array.from({ length: 24 }, (_, index) => index + 31);
const storageKey = 'shrimply:farm-cache:v1:user-a:company-a';

test('encrypts cached values and decrypts them with the matching storage key', () => {
  const plaintext = JSON.stringify({ ponds: [{ id: 'pond-secret', name: '池 🦐' }] });
  const encrypted = encryptStorageValue(plaintext, key, nonce, storageKey);

  assert.equal(isProtectedStorageEnvelope(encrypted), true);
  assert.equal(encrypted.includes('pond-secret'), false);
  assert.equal(decryptStorageValue(encrypted, key, storageKey), plaintext);
});

test('rejects ciphertext tampering', () => {
  const encrypted = encryptStorageValue('private farm data', key, nonce, storageKey);
  const envelope = JSON.parse(encrypted) as { ciphertext: string };
  const ciphertext = toByteArray(envelope.ciphertext);
  ciphertext[0] ^= 1;
  envelope.ciphertext = fromByteArray(ciphertext);

  assert.throws(() => decryptStorageValue(JSON.stringify(envelope), key, storageKey));
});

test('binds encrypted values to their AsyncStorage key', () => {
  const encrypted = encryptStorageValue('private farm data', key, nonce, storageKey);

  assert.throws(() => decryptStorageValue(encrypted, key, `${storageKey}:other`));
});

test('does not mistake legacy plaintext snapshots for encrypted envelopes', () => {
  assert.equal(isProtectedStorageEnvelope(JSON.stringify({ version: 1, data: {} })), false);
  assert.equal(isProtectedStorageEnvelope('{broken'), false);
});
