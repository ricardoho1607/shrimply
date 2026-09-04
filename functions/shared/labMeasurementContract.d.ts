export type LabMeasurementUnits = Record<string, { unit: string; basis: string }>;
export const LAB_WATER_FIELDS: Record<string, { label: string; unit: string; bases: string[]; max?: number }>;
export function createManualLabUnits(): LabMeasurementUnits;
export function labMeasurementLabel(field: string, units?: LabMeasurementUnits): string;
export function validateLabRow(row: object): string[];
export function canonicalLabValue(row: object, key: string): number | null;
export function labMeasurementWarnings(row: object): string[];
