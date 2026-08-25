export interface InventoryProductLabel {
  manufacturer?: string;
  ingredients: string[];
  sourceUrl?: string;
  recordedAt?: string;
}

export const parseProductLabelIngredients = (value: string): string[] => {
  return Array.from(new Set(value
    .split(/\r?\n/)
    .map((ingredient) => ingredient.trim())
    .filter(Boolean)))
    .slice(0, 20)
    .map((ingredient) => ingredient.slice(0, 160));
};

export const normalizeProductLabelSourceUrl = (value: string): string | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
    return url.toString().slice(0, 1000);
  } catch {
    return undefined;
  }
};

export const buildInventoryProductLabel = (input: {
  manufacturer: string;
  ingredientsText: string;
  sourceUrl: string;
  recordedAt: string;
}): InventoryProductLabel | undefined => {
  const manufacturer = input.manufacturer.trim().slice(0, 160);
  const ingredients = parseProductLabelIngredients(input.ingredientsText);
  const sourceUrl = normalizeProductLabelSourceUrl(input.sourceUrl);
  if (!manufacturer && ingredients.length === 0 && !sourceUrl) return undefined;
  return {
    ...(manufacturer ? { manufacturer } : {}),
    ingredients,
    ...(sourceUrl ? { sourceUrl } : {}),
    recordedAt: input.recordedAt,
  };
};
