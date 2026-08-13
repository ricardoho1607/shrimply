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
