import { LAB_WATER_FIELDS } from '../../../functions/shared/labMeasurementContract';

export interface ManualLabColumn {
  label: string;
  path: string[];
  inputType?: 'number' | 'text';
}

export function getManualLabColumns(reportType = 'water_quality'): ManualLabColumn[] {
    const baseColumns: ManualLabColumn[] = [
      { label: 'DOC', path: ['doc'] },
    ];
    const mineralColumns: ManualLabColumn[] = [
      { label: 'Transparency', path: ['transparencyCm'] },
      { label: 'Salinity', path: ['waterQuality', 'salinityCustomer'] },
      { label: LAB_WATER_FIELDS.tan.label + ' (unit/basis below)', path: ['waterQuality', 'tan'] },
      { label: LAB_WATER_FIELDS.nh3.label + ' (unit/basis below)', path: ['waterQuality', 'nh3'] },
      { label: LAB_WATER_FIELDS.nh4.label + ' (unit/basis below)', path: ['waterQuality', 'nh4'] },
      { label: LAB_WATER_FIELDS.no2.label + ' (unit/basis below)', path: ['waterQuality', 'no2'] },
      { label: LAB_WATER_FIELDS.phosphate.label + ' (unit/basis below)', path: ['waterQuality', 'phosphate'] },
      { label: LAB_WATER_FIELDS.alkalinityTotal.label + ' (unit/basis below)', path: ['waterQuality', 'alkalinityTotal'] },
      { label: LAB_WATER_FIELDS.tom.label + ' (unit/basis below)', path: ['waterQuality', 'tom'] },
      { label: LAB_WATER_FIELDS.hardnessCa.label + ' (unit/basis below)', path: ['waterQuality', 'hardnessCa'] },
      { label: LAB_WATER_FIELDS.hardnessMg.label + ' (unit/basis below)', path: ['waterQuality', 'hardnessMg'] },
      { label: LAB_WATER_FIELDS.hardnessTotal.label + ' (unit/basis below)', path: ['waterQuality', 'hardnessTotal'] },
      { label: 'Vib. Y', path: ['microbiology', 'vibrioYellow'] },
      { label: 'Vib. G', path: ['microbiology', 'vibrioGreen'] },
      { label: 'Vib. Total', path: ['microbiology', 'vibrioTotal'] },
      { label: 'TBC', path: ['microbiology', 'tbc'] },
      { label: 'TVC/TBC %', path: ['microbiology', 'tvcTbcRatioPercent'] },
    ];
    const planktonColumns: ManualLabColumn[] = [
      { label: 'Total Plankton', path: ['plankton', 'totalCellPerMl'] },
      { label: 'Good Plankton', path: ['plankton', 'beneficialCellPerMl'] },
      { label: 'Bad Plankton', path: ['plankton', 'harmfulCellPerMl'] },
      { label: 'Green Algae Cells', path: ['plankton', 'chlorophytaCellPerMl'] },
      { label: 'Green Algae %', path: ['plankton', 'chlorophytaPercent'] },
      { label: 'Green Algae Species', path: ['plankton', 'chlorophytaSpecies'], inputType: 'text' },
      { label: 'Blue-Green Cells', path: ['plankton', 'cyanophytaCellPerMl'] },
      { label: 'Blue-Green %', path: ['plankton', 'cyanophytaPercent'] },
      { label: 'Blue-Green Species', path: ['plankton', 'cyanophytaSpecies'], inputType: 'text' },
      { label: 'Diatom Cells', path: ['plankton', 'diatomCellPerMl'] },
      { label: 'Diatom %', path: ['plankton', 'diatomPercent'] },
      { label: 'Diatom Species', path: ['plankton', 'diatomSpecies'], inputType: 'text' },
      { label: 'Golden-Green Cells', path: ['plankton', 'chrysophytaCellPerMl'] },
      { label: 'Golden-Green %', path: ['plankton', 'chrysophytaPercent'] },
      { label: 'Golden-Green Species', path: ['plankton', 'chrysophytaSpecies'], inputType: 'text' },
      { label: 'Dino Cells', path: ['plankton', 'dinoflagellataCellPerMl'] },
      { label: 'Dino %', path: ['plankton', 'dinoflagellataPercent'] },
      { label: 'Dino Species', path: ['plankton', 'dinoflagellataSpecies'], inputType: 'text' },
      { label: 'Protozoa Cells', path: ['plankton', 'protozoaCellPerMl'] },
      { label: 'Protozoa %', path: ['plankton', 'protozoaPercent'] },
      { label: 'Protozoa Species', path: ['plankton', 'protozoaSpecies'], inputType: 'text' },
    ];
    if (reportType === 'plankton') return planktonColumns;
    if (reportType === 'combined') return [...baseColumns, ...mineralColumns, ...planktonColumns];
    return [...baseColumns, ...mineralColumns];
}
