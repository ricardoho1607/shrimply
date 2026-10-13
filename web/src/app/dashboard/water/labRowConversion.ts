import { getManualLabInputUnits } from './labRowState';
import type { LabEntryMode, LabPondResult, Pond } from './WaterQualityModel';

const toOptionalNumber = (value?: string) => {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const parsed = Number(String(value).replace(/,/g, '').replace(/%$/, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const getPlanktonCellCount = (cellValue: string | undefined, percentValue: string | undefined, totalCellPerMl: number | null) => {
  const enteredCellCount = toOptionalNumber(cellValue);
  if (enteredCellCount !== null) return enteredCellCount;

  const percent = toOptionalNumber(percentValue);
  if (totalCellPerMl === null || percent === null) return null;

  return Math.round((totalCellPerMl * percent) / 100);
};

export const normalizeLabRow = (row: LabPondResult, labEntryMode: LabEntryMode) => {
  const totalCellPerMl = toOptionalNumber(row.plankton?.totalCellPerMl);

  return {
    pondId: row.pondId,
    pondCode: row.pondCode,
    measurementUnits: labEntryMode === 'manual' ? getManualLabInputUnits(row.measurementUnits) : row.measurementUnits || {},
    doc: toOptionalNumber(row.doc),
    transparencyCm: toOptionalNumber(row.transparencyCm),
    waterQuality: {
      phCustomer: toOptionalNumber(row.waterQuality?.phCustomer),
      phLab: toOptionalNumber(row.waterQuality?.phLab),
      salinityCustomer: toOptionalNumber(row.waterQuality?.salinityCustomer),
      salinityLab: toOptionalNumber(row.waterQuality?.salinityLab),
      tan: toOptionalNumber(row.waterQuality?.tan),
      nh3: toOptionalNumber(row.waterQuality?.nh3),
      nh4: toOptionalNumber(row.waterQuality?.nh4),
      no2: toOptionalNumber(row.waterQuality?.no2),
      phosphate: toOptionalNumber(row.waterQuality?.phosphate),
      alkalinityTotal: toOptionalNumber(row.waterQuality?.alkalinityTotal),
      tom: toOptionalNumber(row.waterQuality?.tom),
      hardnessCa: toOptionalNumber(row.waterQuality?.hardnessCa),
      hardnessMg: toOptionalNumber(row.waterQuality?.hardnessMg),
      hardnessTotal: toOptionalNumber(row.waterQuality?.hardnessTotal),
    },
    microbiology: {
      vibrioYellow: toOptionalNumber(row.microbiology?.vibrioYellow),
      vibrioGreen: toOptionalNumber(row.microbiology?.vibrioGreen),
      vibrioTotal: toOptionalNumber(row.microbiology?.vibrioTotal),
      tbc: toOptionalNumber(row.microbiology?.tbc),
      tvcTbcRatioPercent: toOptionalNumber(row.microbiology?.tvcTbcRatioPercent),
    },
    plankton: {
      totalCellPerMl,
      beneficialCellPerMl: toOptionalNumber(row.plankton?.beneficialCellPerMl),
      harmfulCellPerMl: toOptionalNumber(row.plankton?.harmfulCellPerMl),
      chlorophytaCellPerMl: getPlanktonCellCount(row.plankton?.chlorophytaCellPerMl, row.plankton?.chlorophytaPercent, totalCellPerMl),
      chlorophytaPercent: toOptionalNumber(row.plankton?.chlorophytaPercent),
      chlorophytaSpecies: row.plankton?.chlorophytaSpecies?.trim() || null,
      cyanophytaCellPerMl: getPlanktonCellCount(row.plankton?.cyanophytaCellPerMl, row.plankton?.cyanophytaPercent, totalCellPerMl),
      cyanophytaPercent: toOptionalNumber(row.plankton?.cyanophytaPercent),
      cyanophytaSpecies: row.plankton?.cyanophytaSpecies?.trim() || null,
      diatomCellPerMl: getPlanktonCellCount(row.plankton?.diatomCellPerMl, row.plankton?.diatomPercent, totalCellPerMl),
      diatomPercent: toOptionalNumber(row.plankton?.diatomPercent),
      diatomSpecies: row.plankton?.diatomSpecies?.trim() || null,
      chrysophytaCellPerMl: getPlanktonCellCount(row.plankton?.chrysophytaCellPerMl, row.plankton?.chrysophytaPercent, totalCellPerMl),
      chrysophytaPercent: toOptionalNumber(row.plankton?.chrysophytaPercent),
      chrysophytaSpecies: row.plankton?.chrysophytaSpecies?.trim() || null,
      dinoflagellataCellPerMl: getPlanktonCellCount(row.plankton?.dinoflagellataCellPerMl, row.plankton?.dinoflagellataPercent, totalCellPerMl),
      dinoflagellataPercent: toOptionalNumber(row.plankton?.dinoflagellataPercent),
      dinoflagellataSpecies: row.plankton?.dinoflagellataSpecies?.trim() || null,
      protozoaCellPerMl: getPlanktonCellCount(row.plankton?.protozoaCellPerMl, row.plankton?.protozoaPercent, totalCellPerMl),
      protozoaPercent: toOptionalNumber(row.plankton?.protozoaPercent),
      protozoaSpecies: row.plankton?.protozoaSpecies?.trim() || null,
    },
  };
};

const toInputString = (value: unknown) => {
  if (value === null || value === undefined) return '';
  return String(value);
};

export const denormalizeLabRow = (row: LabPondResult, accessiblePonds: Pick<Pond, 'id' | 'pondName'>[]): LabPondResult => ({
  measurementUnits: row.measurementUnits || {},
  pondId: row.pondId,
  pondCode: row.pondCode || accessiblePonds.find(pond => pond.id === row.pondId)?.pondName || '',
  doc: toInputString(row.doc),
  transparencyCm: toInputString(row.transparencyCm),
  waterQuality: {
    phCustomer: toInputString(row.waterQuality?.phCustomer),
    phLab: toInputString(row.waterQuality?.phLab),
    salinityCustomer: toInputString(row.waterQuality?.salinityCustomer),
    salinityLab: toInputString(row.waterQuality?.salinityLab),
    tan: toInputString(row.waterQuality?.tan),
    nh3: toInputString(row.waterQuality?.nh3),
    nh4: toInputString(row.waterQuality?.nh4),
    no2: toInputString(row.waterQuality?.no2),
    phosphate: toInputString(row.waterQuality?.phosphate),
    alkalinityTotal: toInputString(row.waterQuality?.alkalinityTotal),
    tom: toInputString(row.waterQuality?.tom),
    hardnessCa: toInputString(row.waterQuality?.hardnessCa),
    hardnessMg: toInputString(row.waterQuality?.hardnessMg),
    hardnessTotal: toInputString(row.waterQuality?.hardnessTotal),
  },
  microbiology: {
    vibrioYellow: toInputString(row.microbiology?.vibrioYellow),
    vibrioGreen: toInputString(row.microbiology?.vibrioGreen),
    vibrioTotal: toInputString(row.microbiology?.vibrioTotal),
    tbc: toInputString(row.microbiology?.tbc),
    tvcTbcRatioPercent: toInputString(row.microbiology?.tvcTbcRatioPercent),
  },
  plankton: {
    totalCellPerMl: toInputString(row.plankton?.totalCellPerMl),
    beneficialCellPerMl: toInputString(row.plankton?.beneficialCellPerMl),
    harmfulCellPerMl: toInputString(row.plankton?.harmfulCellPerMl),
    chlorophytaCellPerMl: toInputString(row.plankton?.chlorophytaCellPerMl),
    chlorophytaPercent: toInputString(row.plankton?.chlorophytaPercent),
    chlorophytaSpecies: toInputString(row.plankton?.chlorophytaSpecies),
    cyanophytaCellPerMl: toInputString(row.plankton?.cyanophytaCellPerMl),
    cyanophytaPercent: toInputString(row.plankton?.cyanophytaPercent),
    cyanophytaSpecies: toInputString(row.plankton?.cyanophytaSpecies),
    diatomCellPerMl: toInputString(row.plankton?.diatomCellPerMl),
    diatomPercent: toInputString(row.plankton?.diatomPercent),
    diatomSpecies: toInputString(row.plankton?.diatomSpecies),
    chrysophytaCellPerMl: toInputString(row.plankton?.chrysophytaCellPerMl),
    chrysophytaPercent: toInputString(row.plankton?.chrysophytaPercent),
    chrysophytaSpecies: toInputString(row.plankton?.chrysophytaSpecies),
    dinoflagellataCellPerMl: toInputString(row.plankton?.dinoflagellataCellPerMl),
    dinoflagellataPercent: toInputString(row.plankton?.dinoflagellataPercent),
    dinoflagellataSpecies: toInputString(row.plankton?.dinoflagellataSpecies),
    protozoaCellPerMl: toInputString(row.plankton?.protozoaCellPerMl),
    protozoaPercent: toInputString(row.plankton?.protozoaPercent),
    protozoaSpecies: toInputString(row.plankton?.protozoaSpecies),
  },
});
