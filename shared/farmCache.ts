export const FARM_CACHE_VERSION = 1;

const FARM_CACHE_PREFIX = 'shrimply:farm-cache';
const AUTH_BOOTSTRAP_PREFIX = 'shrimply:auth-bootstrap';
const AUTH_BINDING_PREFIX = 'shrimply:auth-binding';

const encodeKeyPart = (value: string): string => encodeURIComponent(value);

export const getFarmCacheKey = (userId: string, companyId: string): string =>
  `${FARM_CACHE_PREFIX}:v${FARM_CACHE_VERSION}:${encodeKeyPart(userId)}:${encodeKeyPart(companyId)}`;

export const getAuthBootstrapKey = (userId: string, companyId: string): string =>
  `${AUTH_BOOTSTRAP_PREFIX}:v${FARM_CACHE_VERSION}:${encodeKeyPart(userId)}:${encodeKeyPart(companyId)}`;

export const getAuthBindingKey = (userId: string): string =>
  `${AUTH_BINDING_PREFIX}:v${FARM_CACHE_VERSION}:${encodeKeyPart(userId)}`;

export interface FarmCacheData {
  ponds: unknown[];
  physicalPonds: unknown[];
  cycles: unknown[];
  harvestRecords: unknown[];
  currentTimeZone?: string;
}

export interface FarmCacheSnapshot {
  version: typeof FARM_CACHE_VERSION;
  userId: string;
  companyId: string;
  cachedAt: number;
  lastSyncedAt?: number;
  data: FarmCacheData;
}

export interface AuthBootstrapSnapshot {
  version: typeof FARM_CACHE_VERSION;
  userId: string;
  companyId: string;
  cachedAt: number;
  user: Record<string, unknown>;
  company: Record<string, unknown>;
}

export interface AuthBindingSnapshot {
  version: typeof FARM_CACHE_VERSION;
  userId: string;
  companyId: string;
}

const selectRecordFields = (
  record: Record<string, unknown>,
  fields: string[],
): Record<string, unknown> => fields.reduce<Record<string, unknown>>((selected, field) => {
  if (record[field] !== undefined) selected[field] = record[field];
  return selected;
}, {});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const toCacheSafeValue = (value: unknown): unknown => {
  if (value === undefined) return undefined;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value.map((entry) => toCacheSafeValue(entry) ?? null);
  }
  if (typeof value === 'object') {
    const timestamp = value as { toMillis?: () => number; seconds?: number; nanoseconds?: number };
    if (typeof timestamp.toMillis === 'function') {
      const milliseconds = timestamp.toMillis();
      return {
        seconds: Math.floor(milliseconds / 1000),
        nanoseconds: Math.floor((milliseconds % 1000) * 1_000_000),
      };
    }

    return Object.entries(value).reduce<Record<string, unknown>>((safe, [key, entry]) => {
      const normalized = toCacheSafeValue(entry);
      if (normalized !== undefined) safe[key] = normalized;
      return safe;
    }, {});
  }
  return undefined;
};

export const createFarmCacheSnapshot = (
  userId: string,
  companyId: string,
  data: FarmCacheData,
  options?: { cachedAt?: number; lastSyncedAt?: number },
): FarmCacheSnapshot => ({
  version: FARM_CACHE_VERSION,
  userId,
  companyId,
  cachedAt: options?.cachedAt ?? Date.now(),
  ...(options?.lastSyncedAt ? { lastSyncedAt: options.lastSyncedAt } : {}),
  data: toCacheSafeValue(data) as FarmCacheData,
});

export const createAuthBootstrapSnapshot = (
  userId: string,
  companyId: string,
  user: Record<string, unknown>,
  company: Record<string, unknown>,
): AuthBootstrapSnapshot => ({
  version: FARM_CACHE_VERSION,
  userId,
  companyId,
  cachedAt: Date.now(),
  user: toCacheSafeValue(selectRecordFields(user, [
    'id', 'uid', 'email', 'name', 'phone', 'profileImage', 'role',
    'hasCompletedSetup', 'companyId', 'invitedBy', 'joinedDate',
  ])) as Record<string, unknown>,
  company: toCacheSafeValue(selectRecordFields(company, [
    'id', 'companyName', 'primaryLocation', 'farmType', 'businessSize',
    'description', 'contactPhone', 'isPublicProfile', 'country', 'ownerId',
    'serviceRadius', 'locationData', 'isSearchable', 'logo', 'logoUrl', 'timeZone',
  ])) as Record<string, unknown>,
});

export const parseFarmCacheSnapshot = (
  raw: string,
  expectedUserId: string,
  expectedCompanyId: string,
): FarmCacheSnapshot | null => {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)
      || parsed.version !== FARM_CACHE_VERSION
      || parsed.userId !== expectedUserId
      || parsed.companyId !== expectedCompanyId
      || typeof parsed.cachedAt !== 'number'
      || !isRecord(parsed.data)) return null;

    const data = parsed.data;
    if (!Array.isArray(data.ponds)
      || !Array.isArray(data.physicalPonds)
      || !Array.isArray(data.cycles)
      || !Array.isArray(data.harvestRecords)
      || (data.currentTimeZone !== undefined && typeof data.currentTimeZone !== 'string')) return null;

    return parsed as unknown as FarmCacheSnapshot;
  } catch {
    return null;
  }
};

export const parseAuthBootstrapSnapshot = (
  raw: string,
  expectedUserId: string,
  expectedCompanyId: string,
): AuthBootstrapSnapshot | null => {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)
      || parsed.version !== FARM_CACHE_VERSION
      || parsed.userId !== expectedUserId
      || parsed.companyId !== expectedCompanyId
      || typeof parsed.cachedAt !== 'number'
      || !isRecord(parsed.user)
      || !isRecord(parsed.company)
      || parsed.user.uid !== expectedUserId
      || parsed.user.companyId !== expectedCompanyId
      || parsed.company.id !== expectedCompanyId) return null;

    return parsed as unknown as AuthBootstrapSnapshot;
  } catch {
    return null;
  }
};

export const parseAuthBindingSnapshot = (
  raw: string,
  expectedUserId: string,
): AuthBindingSnapshot | null => {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)
      || parsed.version !== FARM_CACHE_VERSION
      || parsed.userId !== expectedUserId
      || typeof parsed.companyId !== 'string'
      || !parsed.companyId) return null;
    return parsed as unknown as AuthBindingSnapshot;
  } catch {
    return null;
  }
};
