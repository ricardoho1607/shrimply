import { HarvestOperationError } from '../../../../../shared/commitHarvestOperation';
import { removeUndefinedFields } from '../../../lib/firestoreData';

/** Messages raised by harvest validation are safe to show directly. */
export class HarvestSaveError extends Error {}

/** Clean the entire write boundary, including future nested optional fields. */
export const prepareHarvestWriteData = <T>(value: T): T => {
  const cleaned = removeUndefinedFields(value);
  const check = (entry: unknown): void => {
    if (typeof entry === 'number' && !Number.isFinite(entry)) {
      throw new HarvestSaveError('Harvest totals are invalid. Check biomass, size, and price before saving.');
    }
    if (Array.isArray(entry)) entry.forEach(check);
    else if (entry && typeof entry === 'object' && Object.getPrototypeOf(entry) === Object.prototype) {
      Object.values(entry).forEach(check);
    }
  };
  check(cleaned);
  return cleaned;
};

export const isValidHarvestDate = (date: string, today: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
};

export const getHarvestSaveError = (
  error: unknown,
  fallback: string,
  copy: (message: string) => string,
): string => {
  if (error instanceof HarvestSaveError || error instanceof HarvestOperationError) return copy(error.message);
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  switch (code.replace(/^firestore\//, '')) {
    case 'permission-denied':
      return copy('You do not have permission to save this harvest. Ask a company owner to check your access.');
    case 'unauthenticated':
      return copy('Your session has expired. Sign in again before saving.');
    case 'unavailable':
    case 'deadline-exceeded':
      return copy('The save could not be confirmed. Check your connection and retry. Your harvest entries are still here.');
    case 'aborted':
    case 'failed-precondition':
      return copy('Farm data changed while saving. Check the latest pond data and retry.');
    default:
      return code ? `${fallback} (${code})` : fallback;
  }
};
