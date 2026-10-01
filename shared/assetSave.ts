type HistoryEntry = Record<string, unknown> & { id?: string };
type AssetSaveData = Record<string, unknown> & {
  transferHistory?: HistoryEntry[];
  maintenanceHistory?: HistoryEntry[];
};

/** Merge an offline history append with current server history, once per record ID. */
export const mergeAssetSave = (current: AssetSaveData, incoming: AssetSaveData): AssetSaveData | null => {
  const result = { ...incoming };
  if (incoming.transferHistory) {
    const history = current.transferHistory || [];
    const added = incoming.transferHistory.filter(entry => !history.some(existing => existing.id === entry.id));
    if (incoming.currentHolder === null) {
      const returned = incoming.transferHistory.at(-1);
      if (!current.currentHolder || history.some(entry => entry.id === returned?.id && entry.returned)) return null;
      if (!returned?.returned || history.at(-1)?.id !== returned.id) throw new Error('Asset transfer changed. Refresh before returning it.');
      result.transferHistory = history.map(entry => entry.id === returned.id ? { ...entry, returned: returned.returned } : entry);
    } else {
      if (!added.length) return null;
      result.transferHistory = [...history, ...added.map((entry, index) => ({ ...entry, from: index === 0 ? current.currentHolder || 'Storage' : added[index - 1].to }))];
    }
  }
  if (incoming.maintenanceHistory) {
    const history = current.maintenanceHistory || [];
    const added = incoming.maintenanceHistory.filter(entry => !history.some(existing => existing.id === entry.id));
    if (!added.length) return null;
    const cost = added.reduce((total, entry) => {
      const value = entry.cost == null ? 0 : Number(entry.cost);
      if (!Number.isFinite(value) || value < 0) throw new Error('Maintenance cost must be a valid positive amount.');
      return total + value;
    }, 0);
    const previousCost = current.totalMaintenanceCost == null
      ? history.reduce((total, entry) => total + (Number(entry.cost) || 0), 0)
      : Number(current.totalMaintenanceCost);
    if (!Number.isFinite(previousCost) || !Number.isFinite(previousCost + cost)) throw new Error('Asset cost is invalid. Refresh before saving.');
    result.maintenanceHistory = [...history, ...added];
    result.totalMaintenanceCost = previousCost + cost;
  }
  return result;
};
