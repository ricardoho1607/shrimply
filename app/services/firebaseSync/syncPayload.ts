export { removeUndefinedFields } from '../../../shared/firestoreData';

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
