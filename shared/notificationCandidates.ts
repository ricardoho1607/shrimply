type DateLike = Date | string | number | { toDate?: () => Date; seconds?: number } | null | undefined;

export interface InventoryCandidateSource {
  id: string;
  totalStock?: number;
  reorderLevel?: number;
  unit?: string;
  feedName?: string;
  additiveName?: string;
  inventoryKind?: string;
}

interface TransferSource {
  toUserName?: string;
  expectedReturn?: DateLike;
  returned?: boolean;
  actualReturnDate?: DateLike;
}

export interface AssetCandidateSource {
  id: string;
  assetName?: string;
  name?: string;
  currentHolder?: string | null;
  transferHistory?: TransferSource[];
}

const toDate = (value: DateLike): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'object' && typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  if (typeof value === 'object') return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
};

export const getNotificationCandidates = ({
  now = new Date(), feeds = [], additives = [], assets = [],
}: {
  now?: Date;
  feeds?: InventoryCandidateSource[];
  additives?: InventoryCandidateSource[];
  assets?: AssetCandidateSource[];
}) => {
  const lowStock = [
    ...feeds.map((item) => ({ ...item, itemType: 'feed' as const, itemName: item.feedName || 'Feed' })),
    ...additives
      .filter((item) => item.inventoryKind !== 'treatmentMix')
      .map((item) => ({ ...item, itemType: 'additive' as const, itemName: item.additiveName || 'Additive' })),
  ].filter((item) => {
    const reorderLevel = Number(item.reorderLevel);
    const currentStock = Number(item.totalStock);
    return Number.isFinite(reorderLevel) && reorderLevel > 0
      && Number.isFinite(currentStock) && currentStock <= reorderLevel;
  }).map((item) => ({
    itemId: item.id,
    itemName: item.itemName,
    itemType: item.itemType,
    currentStock: Number(item.totalStock),
    reorderLevel: Number(item.reorderLevel),
    unit: item.unit || 'kg',
  }));

  const overdue = assets.flatMap((asset) => {
    if (!asset.currentHolder) return [];
    const activeTransfer = [...(asset.transferHistory || [])].reverse().find((transfer) => !transfer.returned && !transfer.actualReturnDate);
    const expectedReturn = toDate(activeTransfer?.expectedReturn);
    if (!activeTransfer || !expectedReturn || expectedReturn >= now) return [];
    return [{
      assetId: asset.id,
      assetName: asset.assetName || asset.name || 'Asset',
      holderName: activeTransfer.toUserName || 'Team member',
      expectedReturn,
    }];
  });

  return { lowStock, overdue };
};
