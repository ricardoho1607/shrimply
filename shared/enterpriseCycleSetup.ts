export interface EnterprisePondSetupValue {
  stockingDate: string;
  density: string;
  supplier: string;
  baselineMbw?: string;
  baselineEstimatedPopulation?: string;
  baselineSurvivalRate?: string;
  baselineCumulativeFeed?: string;
}

export type EnterpriseCycleStartMode = 'new' | 'midcycle';

export const createEnterprisePondSetupValues = (
  pondIds: string[],
  defaultStockingDate = '',
): Record<string, EnterprisePondSetupValue> => Object.fromEntries(
  pondIds.map((pondId) => [pondId, {
    stockingDate: defaultStockingDate,
    density: '',
    supplier: '',
    baselineMbw: '',
    baselineEstimatedPopulation: '',
    baselineSurvivalRate: '',
    baselineCumulativeFeed: '',
  }]),
);

export const isEnterprisePondSetupComplete = (
  value?: EnterprisePondSetupValue,
  cycleStartMode: EnterpriseCycleStartMode = 'new',
): boolean => {
  const density = Number(String(value?.density || '').trim().replace(',', '.'));
  const baselineMbw = Number(String(value?.baselineMbw || '').trim().replace(',', '.'));
  return /^\d{4}-\d{2}-\d{2}$/.test(value?.stockingDate || '')
    && Number.isFinite(density)
    && density > 0
    && Boolean(value?.supplier.trim())
    && (cycleStartMode === 'new' || (Number.isFinite(baselineMbw) && baselineMbw > 0));
};

export const countCompletedEnterprisePondSetups = (
  pondIds: string[],
  values: Record<string, EnterprisePondSetupValue>,
  cycleStartMode: EnterpriseCycleStartMode = 'new',
): number => pondIds.filter((pondId) => isEnterprisePondSetupComplete(values[pondId], cycleStartMode)).length;

export const parseEnterprisePondDensity = (value: string): number =>
  Number(value.trim().replace(',', '.'));

export const parseOptionalEnterprisePondNumber = (value?: string): number | undefined => {
  if (!value?.trim()) return undefined;
  const parsed = Number(value.trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const getEnterpriseStockingDateRange = (
  stockingDates: (string | null | undefined)[],
): { stockingStartDate?: string; stockingEndDate?: string } => {
  const dates = stockingDates.filter((date): date is string => /^\d{4}-\d{2}-\d{2}$/.test(date || '')).sort();
  return {
    stockingStartDate: dates[0],
    stockingEndDate: dates[dates.length - 1],
  };
};
