import { getOperatingMarginDisplay } from './financeMetrics';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

export const runFinanceMetricsSelfTest = () => {
  assert(getOperatingMarginDisplay(0, -154000000) === 'N/A', 'does not show a zero margin when revenue is zero');
  assert(getOperatingMarginDisplay(200000000, 46000000) === '23.0%', 'formats a valid operating margin');
};
