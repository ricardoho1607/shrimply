export interface EnterprisePondSetupValue {
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
): Record<string, EnterprisePondSetupValue> => Object.fromEntries(
  pondIds.map((pondId) => [pondId, {
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
  return Number.isFinite(density)
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
