// Flat values keep lab entries compatible with the existing editable action cards.
export const LAB_WATER_KEYS = [
  'phCustomer', 'phLab', 'salinityCustomer', 'salinityLab', 'tan', 'nh3', 'nh4',
  'no2', 'alkalinityTotal', 'tom', 'hardnessCa', 'hardnessMg', 'phosphate', 'hardnessTotal',
] as const;
export const LAB_MICROBIOLOGY_KEYS = ['vibrioYellow', 'vibrioGreen', 'vibrioTotal', 'tbc', 'tvcTbcRatioPercent'] as const;
export const LAB_PLANKTON_KEYS = [
  'totalCellPerMl', 'beneficialCellPerMl', 'harmfulCellPerMl',
  ...['chlorophyta', 'cyanophyta', 'diatom', 'chrysophyta', 'dinoflagellata', 'protozoa']
    .flatMap(group => [`${group}CellPerMl`, `${group}Percent`, `${group}Species`]),
];
export const ORSON_LAB_FIELDS = [
  'reportType', 'labName', 'transparencyCm', 'planktonUnit', 'microbiologyUnit',
  ...LAB_WATER_KEYS.flatMap(key => [key, `${key}Unit`, `${key}Basis`]),
  ...LAB_MICROBIOLOGY_KEYS, ...LAB_PLANKTON_KEYS,
];
export const isLabTextField = (key: string) =>
  ['reportType', 'labName', 'planktonUnit', 'microbiologyUnit'].includes(key) || /(?:Unit|Basis|Species)$/.test(key);

export function validateOrsonLabValues(values: Record<string, string | number | boolean>): void {
  if (!['water_quality', 'plankton'].includes(String(values.reportType))) throw new Error('Choose a mineral (water_quality) or plankton lab report.');
  const water = LAB_WATER_KEYS.filter(key => values[key] !== undefined);
  const microbes = LAB_MICROBIOLOGY_KEYS.filter(key => values[key] !== undefined);
  const plankton = LAB_PLANKTON_KEYS.filter(key => values[key] !== undefined);
  if (values.reportType === 'plankton' && (water.length || microbes.length)) throw new Error('Save mineral and plankton results as separate lab reports.');
  if (values.reportType === 'water_quality' && plankton.length) throw new Error('Save mineral and plankton results as separate lab reports.');
  const measured = [...water, ...microbes, ...plankton.filter(key => !key.endsWith('Species'))];
  if (!measured.length && values.transparencyCm === undefined) throw new Error('Enter at least one measured lab result.');
  for (const key of water) {
    if (!values[`${key}Unit`] || !values[`${key}Basis`]) throw new Error(`${key}: source unit and measurement basis are required.`);
    if (key.startsWith('ph') && Number(values[key]) > 14) throw new Error('pH must be between 0 and 14.');
  }
  for (const key of [...microbes, ...plankton]) {
    if (key.endsWith('Percent') && Number(values[key]) > 100) throw new Error(`${key} must be between 0 and 100.`);
  }
  if (plankton.some(key => key.endsWith('CellPerMl')) && values.planktonUnit !== 'cells/mL') throw new Error('Confirm plankton counts are in cells/mL.');
  if (microbes.some(key => !key.endsWith('Percent')) && values.microbiologyUnit !== 'CFU/mL') throw new Error('Confirm microbiology counts are in CFU/mL.');
}
