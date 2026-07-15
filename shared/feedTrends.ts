export type FeedTrendDirection = 'increased' | 'decreased' | 'maintained' | 'first';

export interface FeedTrendResult {
  direction: FeedTrendDirection;
  deltaKg: number | null;
  percent: number | null;
}

const toFeedAmount = (value: unknown): number | null => {
  const amount = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
};

export const calculateFeedTrend = (currentValue: unknown, previousValue?: unknown): FeedTrendResult => {
  const currentAmount = toFeedAmount(currentValue);
  const previousAmount = toFeedAmount(previousValue);
  if (currentAmount === null || previousAmount === null || previousAmount <= 0) {
    return { direction: 'first', deltaKg: null, percent: null };
  }

  const deltaKg = currentAmount - previousAmount;
  const percent = (deltaKg / previousAmount) * 100;
  const direction: FeedTrendDirection = Math.abs(percent) <= 3
    ? 'maintained'
    : percent > 0 ? 'increased' : 'decreased';

  return { direction, deltaKg, percent };
};
