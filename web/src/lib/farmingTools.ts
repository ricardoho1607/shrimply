type Input = number | string;

function nonNegative(input: Input): number | null {
  if (typeof input === 'string' && !/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(input.trim())) return null;
  const value = Number(input);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

const finite = (value: number): number | null => Number.isFinite(value) ? value : null;

/** Average grams per shrimp and shrimp per kg are reciprocals. */
export function convertShrimpSize(input: Input): number | null {
  const value = nonNegative(input);
  return value !== null && value > 0 ? finite(1000 / value) : null;
}

/** Survival includes shrimp already removed in partial harvests. */
export function standingBiomass(stocked: Input, survival: Input, removed: Input, weight: Input): number | null {
  const values = [stocked, survival, removed, weight].map(nonNegative);
  if (values.some(value => value === null)) return null;
  const [population, survivalPercent, harvestedCount, grams] = values as number[];
  if (!Number.isSafeInteger(population) || !Number.isSafeInteger(harvestedCount) || survivalPercent > 100 || grams <= 0) return null;
  const remaining = population * (survivalPercent / 100) - harvestedCount;
  if (remaining < 0) return null;
  return finite(remaining * (grams / 1000));
}

/** Apparent FCR: feed divided by net biomass gain; no mortality adjustment. */
export function apparentFcr(feed: Input, current: Input, harvested: Input, initial: Input): number | null {
  const values = [feed, current, harvested, initial].map(nonNegative);
  if (values.some(value => value === null)) return null;
  const [feedKg, currentKg, harvestedKg, initialKg] = values as number[];
  const gain = currentKg + harvestedKg - initialKg;
  if (!Number.isFinite(gain) || gain <= 0) return null;
  return finite(feedKg / gain);
}

/** Gross revenue before production costs and buyer deductions. */
export function harvestRevenue(weight: Input, price: Input): number | null {
  const kg = nonNegative(weight);
  const rupiah = nonNegative(price);
  return kg !== null && rupiah !== null ? finite(kg * rupiah) : null;
}
