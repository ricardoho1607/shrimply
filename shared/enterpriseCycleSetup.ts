export interface EnterprisePondSetupValue {
  density: string;
  supplier: string;
}

export const createEnterprisePondSetupValues = (
  pondIds: string[],
): Record<string, EnterprisePondSetupValue> => Object.fromEntries(
  pondIds.map((pondId) => [pondId, { density: '', supplier: '' }]),
);

export const isEnterprisePondSetupComplete = (
  value?: EnterprisePondSetupValue,
): boolean => {
  const density = Number(String(value?.density || '').trim().replace(',', '.'));
  return Number.isFinite(density) && density > 0 && Boolean(value?.supplier.trim());
};

export const countCompletedEnterprisePondSetups = (
  pondIds: string[],
  values: Record<string, EnterprisePondSetupValue>,
): number => pondIds.filter((pondId) => isEnterprisePondSetupComplete(values[pondId])).length;

export const parseEnterprisePondDensity = (value: string): number =>
  Number(value.trim().replace(',', '.'));
