import { getFarmDateKey, normalizeFarmDateKey } from './farmDate';

export const resolveInventoryUsageDate = (value: string | undefined, timeZone?: unknown, now = new Date()): string => {
  const today = getFarmDateKey(now, timeZone);
  if (value === undefined) return today; // Older callers still default to today.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || normalizeFarmDateKey(value, timeZone) !== value) {
    throw new Error('Choose a valid usage date.');
  }
  if (value > today) throw new Error('Usage date cannot be in the future.');
  return value;
};

// A calendar picker returns a device-local Date. Keep the selected calendar
// day, rather than converting that instant into a different farm time zone.
export const inventoryUsageDateFromPicker = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
