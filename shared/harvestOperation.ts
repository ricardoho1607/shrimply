import type { PendingFarmChange } from './offlineWorkspace';
export interface HarvestRecordLike {
  id: string;
  date: string;
  ponds: { pondId: string }[];
}

export interface HarvestOperation<T extends HarvestRecordLike = HarvestRecordLike> {
  id: string;
  records: T[];
  previousRecord?: T;
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const isValidHarvestDateKey = (date: unknown): date is string => {
  if (typeof date !== 'string' || !ISO_DATE_REGEX.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
};

const deepClone = <O>(value: O): O => {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(deepClone) as unknown as O;
  const copy: any = {};
  for (const [k, v] of Object.entries(value)) copy[k] = deepClone(v);
  return copy;
};

const deepFreeze = <O>(value: O): O => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze((value as any)[key]);
  }
  return value;
};

const sanitizeRecord = <T extends HarvestRecordLike>(record: T): T => {
  if (!record || typeof record !== 'object') throw new Error('Harvest record must be an object');
  const copy = deepClone(record) as any;
  if (Array.isArray(copy.ponds)) {
    copy.ponds = copy.ponds.map((pond: any) => {
      if (pond && typeof pond === 'object') delete pond.date;
      return pond;
    });
  }
  return copy;
};

export const groupHarvestEntriesByDate = <T extends { pondId: string; date: string }>(
  entries: T[],
  today: string,
): { date: string; entries: T[] }[] => {
  if (!isValidHarvestDateKey(today)) throw new Error(`Invalid today date: ${today}`);
  if (!Array.isArray(entries)) throw new Error('Entries must be an array');
  const seenPonds = new Set<string>();
  const groups = new Map<string, T[]>();
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') throw new Error('Invalid harvest entry');
    const pondId = typeof entry.pondId === 'string' ? entry.pondId.trim() : '';
    if (!pondId) throw new Error('Harvest entry must specify a pondId');
    if (seenPonds.has(pondId)) throw new Error(`Duplicate pond in harvest entries: ${pondId}`);
    seenPonds.add(pondId);
    if (!isValidHarvestDateKey(entry.date)) throw new Error(`Invalid harvest date: ${entry.date}`);
    if (entry.date > today) throw new Error(`Harvest date cannot be in the future: ${entry.date}`);
    const existing = groups.get(entry.date);
    if (existing) existing.push(entry);
    else groups.set(entry.date, [entry]);
  }
  return Array.from(groups.entries()).map(([date, groupEntries]) => ({ date, entries: groupEntries }));
};

export function createHarvestOperation<T extends HarvestRecordLike = HarvestRecordLike>(
  id: string,
  records: T[] | T,
  previousRecord?: T,
): HarvestOperation<T> {
  if (!id || typeof id !== 'string' || !id.trim()) throw new Error('Harvest operation requires an id');
  const recordsList = Array.isArray(records) ? records : [records];
  const operation: HarvestOperation<T> = {
    id: id.trim(),
    records: recordsList.map(sanitizeRecord),
    ...(previousRecord ? { previousRecord: sanitizeRecord(previousRecord) } : {}),
  };
  return deepFreeze(operation);
}

export const isHarvestOperation = <T extends HarvestRecordLike = HarvestRecordLike>(
  value: unknown,
): value is HarvestOperation<T> => {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  if (typeof c.id !== 'string' || c.id.trim().length === 0 || !Array.isArray(c.records)) return false;
  const validRecords = c.records.every(
    (r: any) => Boolean(r) && typeof r === 'object' && typeof r.id === 'string' && typeof r.date === 'string' && Array.isArray(r.ponds),
  );
  if (!validRecords) return false;
  if (c.previousRecord !== undefined) {
    const prev: any = c.previousRecord;
    if (!prev || typeof prev !== 'object' || typeof prev.id !== 'string' || typeof prev.date !== 'string' || !Array.isArray(prev.ponds)) {
      return false;
    }
  }
  return true;
};

export const isHarvestPayloadMatch = (existing: any, expected: any): boolean => {
  if (!existing || !expected) return false;
  const metadata = new Set(['createdAt', 'createdBy', 'updatedAt', 'updatedBy', 'financeEntry', 'operationReceiptId', 'operationPayload', 'correctedFromHarvestId', 'harvestReferenceSamplingId', 'harvestReferenceSamplingDate', 'harvestReferenceMbw']);
  const matchesExpected = (actual: any, wanted: any): boolean => {
    if (wanted instanceof Date) return new Date(actual).getTime() === wanted.getTime();
    if (Array.isArray(wanted)) {
      return Array.isArray(actual) && actual.length === wanted.length
        && wanted.every((item, index) => matchesExpected(actual[index], item));
    }
    if (wanted && typeof wanted === 'object') {
      if (!actual || typeof actual !== 'object') return false;
      return Object.entries(wanted).filter(([key]) => !metadata.has(key))
        .every(([key, value]) => matchesExpected(actual[key], value));
    }
    return actual === wanted;
  };
  return matchesExpected(existing, expected);
};

/** Expand only for local replay. The durable queue still contains one operation. */
export const expandHarvestOperationChange = (change: PendingFarmChange): PendingFarmChange[] => {
  if (change.type !== 'harvest' || !isHarvestOperation(change.data)) return [change];
  const operation = change.data;
  const previous = operation.previousRecord;
  const nextIds = new Set(operation.records.flatMap(record => record.ponds.map(pond => pond.pondId)));
  const expanded = operation.records.map(record => {
    const ids = new Set(record.ponds.map(pond => pond.pondId));
    const oldPonds = previous?.ponds.filter(pond => ids.has(pond.pondId)) || [];
    return { ...change, id: `${operation.id}:${record.id}`, action: oldPonds.length ? 'update' : 'create',
      data: record, previousData: oldPonds.length ? { ...previous, ponds: oldPonds } : undefined } as PendingFarmChange;
  });
  const removed = previous?.ponds.filter(pond => !nextIds.has(pond.pondId)) || [];
  if (removed.length) expanded.push({ ...change, id: `${operation.id}:removed`, action: 'delete',
    data: { ...previous, ponds: removed }, previousData: undefined } as PendingFarmChange);
  return expanded;
};

export const harvestChangePondIds = (change: { data: any }): string[] => {
  const data = change.data;
  return isHarvestOperation(data)
    ? [...new Set([...data.records.flatMap(record => record.ponds.map(pond => pond.pondId)),
      ...(data.previousRecord?.ponds.map(pond => pond.pondId) || [])])]
    : (data?.ponds || []).map((pond: { pondId: string }) => pond.pondId);
};
