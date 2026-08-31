export const getOperatingMarginDisplay = (
  revenue: number,
  profit: number,
  decimals = 1,
): string => {
  if (!Number.isFinite(revenue) || revenue <= 0 || !Number.isFinite(profit)) return 'N/A';
  return `${((profit / revenue) * 100).toFixed(decimals)}%`;
};
