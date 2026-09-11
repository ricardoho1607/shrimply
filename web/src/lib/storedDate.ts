/** Dates loaded from Firestore may be SDK timestamps, serialized timestamps, or legacy strings. */
export function storedDate(value: unknown): Date | null {
  let date: Date;
  if (value instanceof Date) date = value;
  else if (typeof value === 'string' || typeof value === 'number') date = new Date(value);
  else if (value && typeof value === 'object' && 'seconds' in value && typeof value.seconds === 'number') date = new Date(value.seconds * 1000);
  else return null;
  return Number.isFinite(date.getTime()) ? date : null;
}
