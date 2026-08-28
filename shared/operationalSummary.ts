export const OPERATIONAL_SUMMARY_VERSION = 1;
export const OPERATIONAL_SUMMARY_MAX_AGE_MS = 36 * 60 * 60 * 1000;

type TimestampLike = Date | string | number | { toDate?: () => Date; seconds?: number } | null | undefined;

export type OperationalSummaryData = {
  operationalSummaryVersion?: number;
  operationalFullRefreshAt?: TimestampLike;
};

const toTimestampMs = (value: TimestampLike): number | null => {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'object' && typeof value.toDate === 'function') return value.toDate().getTime();
  if (typeof value === 'object' && typeof value.seconds === 'number') return value.seconds * 1000;
  if (typeof value === 'object') return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

export const isOperationalSummaryFresh = (
  data: OperationalSummaryData | null | undefined,
  nowMs = Date.now(),
): boolean => {
  if (!data || data.operationalSummaryVersion !== OPERATIONAL_SUMMARY_VERSION) return false;
  const refreshedAt = toTimestampMs(data.operationalFullRefreshAt);
  return refreshedAt !== null
    && refreshedAt <= nowMs + 5 * 60 * 1000
    && nowMs - refreshedAt <= OPERATIONAL_SUMMARY_MAX_AGE_MS;
};
