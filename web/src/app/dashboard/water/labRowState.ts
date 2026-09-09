import { createManualLabUnits, type LabMeasurementUnits } from '../../../../../functions/shared/labMeasurementContract';

export function getManualLabInputUnits(existing?: LabMeasurementUnits): LabMeasurementUnits {
  const defaults = createManualLabUnits();
  return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => {
    const metadata = existing?.[key] || fallback;
    return [key, { unit: metadata.unit || fallback.unit, basis: metadata.basis || 'unspecified' }];
  }));
}

export function toggleUniqueLabPondRow<T extends { pondId: string }>(
  selectedIds: string[],
  rows: T[],
  pondId: string,
  createRow: () => T,
) {
  const selected = selectedIds.includes(pondId);

  if (selected) {
    return {
      selectedIds: selectedIds.filter((id) => id !== pondId),
      rows: rows.filter((row) => row.pondId !== pondId),
    };
  }

  return {
    selectedIds: [...new Set([...selectedIds, pondId])],
    rows: rows.some((row) => row.pondId === pondId) ? rows : [...rows, createRow()],
  };
}
