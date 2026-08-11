import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { fromByteArray, toByteArray } from 'base64-js';

export const PROTECTED_STORAGE_VERSION = 1;

interface ProtectedStorageEnvelope {
  protectedStorage: true;
  version: typeof PROTECTED_STORAGE_VERSION;
  algorithm: 'xchacha20-poly1305';
  nonce: string;
  ciphertext: string;
}

export const utf8ToBytes = (value: string): Uint8Array => {
  const bytes: number[] = [];
  for (let index = 0; index < value.length; index += 1) {
    let codePoint = value.charCodeAt(index);
    if (codePoint >= 0xd800 && codePoint <= 0xdbff) {
      const low = value.charCodeAt(index + 1);
      if (low >= 0xdc00 && low <= 0xdfff) {
        codePoint = 0x10000 + ((codePoint - 0xd800) << 10) + (low - 0xdc00);
        index += 1;
      } else {
        codePoint = 0xfffd;
      }
    } else if (codePoint >= 0xdc00 && codePoint <= 0xdfff) {
      codePoint = 0xfffd;
    }

    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    }
  }
  return Uint8Array.from(bytes);
};

const bytesToUtf8 = (bytes: Uint8Array): string => {
  let value = '';
  for (let index = 0; index < bytes.length;) {
    const first = bytes[index];
    let codePoint: number;
    let continuationCount: number;

    if (first <= 0x7f) {
      codePoint = first;
      continuationCount = 0;
    } else if (first >= 0xc2 && first <= 0xdf) {
      codePoint = first & 0x1f;
      continuationCount = 1;
    } else if (first >= 0xe0 && first <= 0xef) {
      codePoint = first & 0x0f;
      continuationCount = 2;
    } else if (first >= 0xf0 && first <= 0xf4) {
      codePoint = first & 0x07;
      continuationCount = 3;
    } else {
      throw new Error('Invalid UTF-8 cache value');
    }

    if (index + continuationCount >= bytes.length) throw new Error('Invalid UTF-8 cache value');
    for (let offset = 1; offset <= continuationCount; offset += 1) {
      const next = bytes[index + offset];
      if ((next & 0xc0) !== 0x80) throw new Error('Invalid UTF-8 cache value');
      codePoint = (codePoint << 6) | (next & 0x3f);
    }

    if ((continuationCount === 1 && codePoint < 0x80)
      || (continuationCount === 2 && codePoint < 0x800)
      || (continuationCount === 3 && codePoint < 0x10000)
      || codePoint > 0x10ffff
      || (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
      throw new Error('Invalid UTF-8 cache value');
    }

    value += codePoint <= 0xffff
      ? String.fromCharCode(codePoint)
      : String.fromCharCode(
        0xd800 + ((codePoint - 0x10000) >> 10),
        0xdc00 + ((codePoint - 0x10000) & 0x3ff),
      );
    index += continuationCount + 1;
  }
  return value;
};

const parseEnvelope = (raw: string): ProtectedStorageEnvelope | null => {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const envelope = parsed as Partial<ProtectedStorageEnvelope>;
    if (envelope.protectedStorage !== true
      || envelope.version !== PROTECTED_STORAGE_VERSION
      || envelope.algorithm !== 'xchacha20-poly1305'
      || typeof envelope.nonce !== 'string'
      || typeof envelope.ciphertext !== 'string') return null;
    return envelope as ProtectedStorageEnvelope;
  } catch {
    return null;
  }
};

export const isProtectedStorageEnvelope = (raw: string): boolean => {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Boolean(parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      && (parsed as { protectedStorage?: unknown }).protectedStorage === true);
  } catch {
    return false;
  }
};

export const encryptStorageValue = (
  value: string,
  key: Uint8Array,
  nonce: Uint8Array,
  storageKey: string,
): string => {
  const cipher = xchacha20poly1305(key, nonce, utf8ToBytes(storageKey));
  const envelope: ProtectedStorageEnvelope = {
    protectedStorage: true,
    version: PROTECTED_STORAGE_VERSION,
    algorithm: 'xchacha20-poly1305',
    nonce: fromByteArray(nonce),
    ciphertext: fromByteArray(cipher.encrypt(utf8ToBytes(value))),
  };
  return JSON.stringify(envelope);
};

export const decryptStorageValue = (
  raw: string,
  key: Uint8Array,
  storageKey: string,
): string => {
  const envelope = parseEnvelope(raw);
  if (!envelope) throw new Error('Invalid protected storage envelope');
  const nonce = toByteArray(envelope.nonce);
  const ciphertext = toByteArray(envelope.ciphertext);
  const cipher = xchacha20poly1305(key, nonce, utf8ToBytes(storageKey));
  return bytesToUtf8(cipher.decrypt(ciphertext));
};
