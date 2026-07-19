export const HARVEST_MARKET_SIZE_TIERS = [100, 90, 80, 70, 60, 50, 40, 30, 20] as const;

export type HarvestMarketSizeTier = typeof HARVEST_MARKET_SIZE_TIERS[number];
export type HarvestMarketPriceInputs = Record<HarvestMarketSizeTier, string>;
export type PersistedHarvestMarketPrices = Partial<Record<`${HarvestMarketSizeTier}`, number>>;

export const createEmptyHarvestMarketPriceInputs = (): HarvestMarketPriceInputs =>
  Object.fromEntries(HARVEST_MARKET_SIZE_TIERS.map((size) => [size, ''])) as HarvestMarketPriceInputs;

export const normalizeHarvestMarketPriceInputs = (value: unknown): HarvestMarketPriceInputs => {
  const inputs = createEmptyHarvestMarketPriceInputs();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return inputs;

  const record = value as Record<string, unknown>;
  HARVEST_MARKET_SIZE_TIERS.forEach((size) => {
    const parsed = typeof record[String(size)] === 'number'
      ? record[String(size)] as number
      : Number(record[String(size)]);
    if (Number.isFinite(parsed) && parsed > 0) inputs[size] = String(parsed);
  });
  return inputs;
};

export const buildPersistedHarvestMarketPrices = (
  inputs: HarvestMarketPriceInputs,
): PersistedHarvestMarketPrices => {
  const prices: PersistedHarvestMarketPrices = {};
  HARVEST_MARKET_SIZE_TIERS.forEach((size) => {
    const value = inputs[size].trim();
    if (!value) return;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error(`Invalid market price for size ${size}.`);
    }
    prices[String(size) as `${HarvestMarketSizeTier}`] = parsed;
  });
  if (Object.keys(prices).length === 0) throw new Error('At least one market price is required.');
  return prices;
};

export const harvestMarketPriceInputsEqual = (
  left: HarvestMarketPriceInputs,
  right: HarvestMarketPriceInputs,
): boolean => HARVEST_MARKET_SIZE_TIERS.every((size) => left[size].trim() === right[size].trim());
