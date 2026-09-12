export const DEFAULT_FARM_TIME_ZONE = 'UTC';
export const FARM_OPERATIONAL_DAY_ROLLOVER_HOUR = 3;

export type CompanyTimeZoneSource = {
  timeZone?: unknown;
} | null | undefined;

export const isValidTimeZone = (value: unknown): value is string => {
  if (typeof value !== 'string' || !value.trim()) return false;

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value.trim() }).format(new Date());
    return true;
  } catch {
    return false;
  }
};

export const getSystemTimeZone = (): string => {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isValidTimeZone(timeZone) ? timeZone : DEFAULT_FARM_TIME_ZONE;
  } catch {
    return DEFAULT_FARM_TIME_ZONE;
  }
};

export const resolveFarmTimeZone = (
  timeZone?: unknown,
  fallbackTimeZone: string = DEFAULT_FARM_TIME_ZONE,
): string => {
  if (isValidTimeZone(timeZone)) return timeZone.trim();
  if (isValidTimeZone(fallbackTimeZone)) return fallbackTimeZone.trim();
  return DEFAULT_FARM_TIME_ZONE;
};

export const getCompanyTimeZone = (company: CompanyTimeZoneSource): string =>
  resolveFarmTimeZone(company?.timeZone);

export const getSupportedTimeZones = (): string[] => {
  try {
    const supportedValuesOf = (Intl as typeof Intl & {
      supportedValuesOf?: (key: 'timeZone') => string[];
    }).supportedValuesOf;
    const values = supportedValuesOf?.('timeZone') ?? [];
    return values.length > 0
      ? values
      : Array.from(new Set([getSystemTimeZone(), DEFAULT_FARM_TIME_ZONE]));
  } catch {
    return Array.from(new Set([getSystemTimeZone(), DEFAULT_FARM_TIME_ZONE]));
  }
};

const getDateParts = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
};

export const getFarmDateKey = (
  date: Date = new Date(),
  timeZone?: unknown,
): string => {
  const safeDate = date instanceof Date && Number.isFinite(date.getTime()) ? date : new Date();
  const parts = getDateParts(safeDate, resolveFarmTimeZone(timeZone));
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const normalizeFarmDateKey = (
  value: unknown,
  timeZone?: unknown,
): string | null => {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (DATE_KEY_PATTERN.test(trimmed)) {
      const parsed = new Date(`${trimmed}T00:00:00Z`);
      return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === trimmed ? trimmed : null;
    }
  }

  // Firestore snapshots can contain live Timestamp instances or serialized timestamps.
  try {
    let parsed: Date;
    if (value instanceof Date) parsed = value;
    else if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') parsed = value.toDate();
    else if (typeof value === 'object' && 'seconds' in value && typeof value.seconds === 'number') parsed = new Date(value.seconds * 1000);
    else if (typeof value === 'string' || typeof value === 'number') parsed = new Date(value);
    else return null;
    return parsed instanceof Date && Number.isFinite(parsed.getTime()) ? getFarmDateKey(parsed, timeZone) : null;
  } catch {
    return null;
  }
};

const dateKeyToUtcDay = (dateKey: string): number | null => {
  const match = DATE_KEY_PATTERN.exec(dateKey);
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

export const differenceInFarmCalendarDays = (
  laterDateKey: string,
  earlierDateKey: string,
): number => {
  const later = dateKeyToUtcDay(laterDateKey);
  const earlier = dateKeyToUtcDay(earlierDateKey);
  if (later === null || earlier === null) return 0;
  return Math.floor((later - earlier) / (24 * 60 * 60 * 1000));
};

export const shiftDateKey = (dateKey: string, days: number): string => {
  const utcDay = dateKeyToUtcDay(dateKey);
  if (utcDay === null || !Number.isFinite(days)) return dateKey;
  return new Date(utcDay + Math.trunc(days) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
};

export const getFarmDateKeyAtRollover = (
  date: Date = new Date(),
  timeZone?: unknown,
  rolloverHour: number = 0,
): string => {
  const safeDate = date instanceof Date && Number.isFinite(date.getTime()) ? date : new Date();
  const calendarDateKey = getFarmDateKey(safeDate, timeZone);
  const safeRolloverHour = Number.isInteger(rolloverHour)
    ? Math.min(23, Math.max(0, rolloverHour))
    : 0;
  if (safeRolloverHour === 0) return calendarDateKey;

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: resolveFarmTimeZone(timeZone),
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(safeDate);
  const localHour = Number(parts.find((part) => part.type === 'hour')?.value);
  return Number.isFinite(localHour) && localHour < safeRolloverHour
    ? shiftDateKey(calendarDateKey, -1)
    : calendarDateKey;
};

export const getFarmOperationalDateKey = (
  date: Date = new Date(),
  timeZone?: unknown,
): string => getFarmDateKeyAtRollover(date, timeZone, FARM_OPERATIONAL_DAY_ROLLOVER_HOUR);

export const getFarmPeriodDateKeys = (
  period: 'today' | 'week' | 'month' | 'year' | 'all',
  date: Date = new Date(),
  timeZone?: unknown,
): { startDateKey: string | null; endDateKey: string } => {
  const endDateKey = getFarmDateKey(date, timeZone);
  if (period === 'all') return { startDateKey: null, endDateKey };
  if (period === 'today') return { startDateKey: endDateKey, endDateKey };
  if (period === 'week') return { startDateKey: shiftDateKey(endDateKey, -7), endDateKey };
  if (period === 'month') return { startDateKey: `${endDateKey.slice(0, 7)}-01`, endDateKey };
  return { startDateKey: `${endDateKey.slice(0, 4)}-01-01`, endDateKey };
};

export const isDateKeyInRange = (
  value: unknown,
  startDateKey: string | null,
  endDateKey: string,
  timeZone?: unknown,
): boolean => {
  const dateKey = normalizeFarmDateKey(value, timeZone);
  if (!dateKey) return false;
  return (!startDateKey || dateKey >= startDateKey) && dateKey <= endDateKey;
};
