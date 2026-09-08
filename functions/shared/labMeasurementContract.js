// Source values stay unchanged. Only explicitly supported units/bases enter calculations.
const LAB_WATER_FIELDS = {
  phCustomer: { label: 'pH (field)', unit: 'pH', bases: ['pH'], max: 14 },
  phLab: { label: 'pH (lab)', unit: 'pH', bases: ['pH'], max: 14 },
  salinityCustomer: { label: 'Salinity (field)', unit: 'ppt', bases: ['salinity'], max: 1000 },
  salinityLab: { label: 'Salinity (lab)', unit: 'ppt', bases: ['salinity'], max: 1000 },
  tan: { label: 'TAN', unit: 'mg/L', bases: ['N'] },
  nh3: { label: 'NH3', unit: 'mg/L', bases: ['NH3', 'N'] },
  nh4: { label: 'NH4', unit: 'mg/L', bases: ['NH4', 'N'] },
  phosphate: { label: 'Phosphate', unit: 'mg/L', bases: ['PO4', 'P'] },
  no2: { label: 'NO2', unit: 'mg/L', bases: ['NO2', 'N'] },
  alkalinityTotal: { label: 'Alkalinity', unit: 'mg/L', bases: ['CaCO3'] },
  tom: { label: 'TOM', unit: 'mg/L', bases: ['KMnO4 consumption', 'O2 demand'] },
  hardnessCa: { label: 'Calcium / Ca hardness', unit: 'mg/L', bases: ['CaCO3', 'Ca'] },
  hardnessMg: { label: 'Magnesium / Mg hardness', unit: 'mg/L', bases: ['CaCO3', 'Mg'] },
  hardnessTotal: { label: 'Total hardness', unit: 'mg/L', bases: ['CaCO3'] },
};

const number = value => value == null || String(value).trim() === '' ? null : typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
const createManualLabUnits = () => Object.fromEntries(Object.entries(LAB_WATER_FIELDS).map(([key, field]) => [key, {
  unit: field.unit, basis: key === 'tom' ? '' : field.bases[0],
}]));

const labMeasurementLabel = (field, units) => {
  const definition = LAB_WATER_FIELDS[field];
  const metadata = units?.[field];
  return `${definition?.label || field} (${metadata?.unit || 'unit unknown'}${metadata?.basis ? ` as ${metadata.basis}` : '; basis unknown'})`;
};

const validateLabRow = row => {
  const errors = [];
  let count = 0;
  for (const section of ['waterQuality', 'microbiology', 'plankton']) {
    for (const [key, raw] of Object.entries(row?.[section] || {})) {
      if (section === 'waterQuality' && !Object.prototype.hasOwnProperty.call(LAB_WATER_FIELDS, key)) continue;
      if (key.endsWith('Species') || raw == null || String(raw).trim() === '') continue;
      const value = number(raw);
      const definition = section === 'waterQuality' ? LAB_WATER_FIELDS[key] : null;
      const max = definition?.max ?? (key.endsWith('Percent') ? 100 : Number.MAX_SAFE_INTEGER);
      if (!Number.isFinite(value) || value < 0 || value > max) { errors.push(`${key}: enter a valid non-negative result${max < Number.MAX_SAFE_INTEGER ? ` up to ${max}` : ''}.`); continue; }
      count++;
      if (definition) {
        const metadata = row.measurementUnits?.[key];
        if (typeof metadata?.unit !== 'string' || !metadata.unit.trim() || typeof metadata?.basis !== 'string' || !metadata.basis.trim()) errors.push(`${definition.label}: source unit and measurement basis are required.`);
      }
    }
  }
  const transparency = number(row?.transparencyCm);
  if (transparency !== null) {
    if (Number.isFinite(transparency) && transparency >= 0) count++;
    else errors.push('Transparency must be a non-negative number in cm.');
  }
  if (count === 0) errors.push('Enter at least one measured result for this pond.');
  return errors;
};

const canonicalLabValue = (row, key) => {
  const value = number(row?.waterQuality?.[key]);
  const definition = LAB_WATER_FIELDS[key];
  const metadata = row?.measurementUnits?.[key];
  // Other source units/bases are retained for display, without silent conversion.
  if (!definition || !Number.isFinite(value) || value < 0 || value > (definition.max ?? Number.MAX_SAFE_INTEGER)
    || metadata?.unit !== definition.unit || metadata?.basis !== definition.bases[0]) return null;
  // TOM methods are not interchangeable; no method-specific threshold is established here.
  if (key === 'tom') return null;
  return value;
};

const labMeasurementWarnings = row => Object.keys(LAB_WATER_FIELDS)
  .filter(key => row?.waterQuality?.[key] != null && String(row.waterQuality[key]).trim() !== '' && canonicalLabValue(row, key) === null)
  .map(key => `${labMeasurementLabel(key, row.measurementUnits)}: retained as reported; excluded from automated thresholds and charts until its unit/basis is supported.`);

module.exports = { LAB_WATER_FIELDS, createManualLabUnits, labMeasurementLabel, validateLabRow, canonicalLabValue, labMeasurementWarnings };
