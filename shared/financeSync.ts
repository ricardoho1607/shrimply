export interface HarvestFinancePond {
  pondName?: string;
  biomass?: number | string;
  price?: number | string;
  subBiomass?: number | string;
  subPrice?: number | string;
}

export interface HarvestFinanceSource {
  id: string;
  date: string;
  cycleId?: string;
  cycleName?: string;
  ponds: HarvestFinancePond[];
}

export interface InventoryFinanceSource {
  id: string;
  itemId: string;
  type: 'feed' | 'additive';
  sourceStockIndex?: number;
  itemName: string;
  quantity: number;
  price: number;
  unit?: string;
  date: string;
  batch?: string;
  notes?: string;
  category?: string;
}

const finiteNumber = (value: number | string | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const financeSyncDocumentId = (reference: string) => `sync_${encodeURIComponent(reference)}`;

export const buildHarvestRevenue = (harvest: HarvestFinanceSource) => {
  const totals = harvest.ponds.reduce<{ biomass: number; amount: number }>((result, pond) => {
    const biomass = finiteNumber(pond.biomass);
    const subBiomass = finiteNumber(pond.subBiomass);
    return {
      biomass: result.biomass + biomass + subBiomass,
      amount: result.amount
        + biomass * finiteNumber(pond.price)
        + subBiomass * finiteNumber(pond.subPrice),
    };
  }, { biomass: 0, amount: 0 });

  return {
    date: harvest.date,
    category: 'Shrimp Sales',
    item: `Harvest (${harvest.date}) - ${totals.biomass.toFixed(1)} kg`,
    amount: totals.amount,
    cycleId: harvest.cycleId,
    cycleName: harvest.cycleName,
    paymentType: 'Unconfirmed',
    sourceKind: 'harvest',
    sourceId: harvest.id,
    reference: `HARVEST-${harvest.id}`,
    notes: 'Auto-synced from harvest records',
  };
};

export const buildInventoryExpense = (stock: InventoryFinanceSource) => ({
  date: stock.date,
  category: stock.category || (stock.type === 'feed' ? 'Feed' : 'Pond Additives'),
  item: `${stock.itemName} - ${finiteNumber(stock.quantity)} ${stock.unit || 'kg'}${stock.batch ? ` (Batch: ${stock.batch})` : ''}`,
  amount: finiteNumber(stock.quantity) * finiteNumber(stock.price),
  paymentType: 'Unconfirmed',
  sourceKind: 'inventory',
  sourceId: stock.itemId,
  sourceCollection: stock.type === 'feed' ? 'feeds' : 'additives',
  sourceLineId: stock.id,
  sourceStockIndex: stock.sourceStockIndex ?? 0,
  reference: `INVENTORY-${stock.type}-${stock.itemId}-${stock.id}`,
  notes: `Auto-synced from inventory${stock.notes ? `: ${stock.notes}` : ''}`,
  linkedInventory: stock.itemName,
});

/** Source metadata is verified against the source document by Firestore rules. */
export const financeSourceEntry = (record: { amount: number; date: string; reference: string }) => ({
  amount: record.amount, date: record.date, reference: record.reference, voided: false,
});

export function buildInventoryLedgerEntries(itemId: string, item: {
  feedName?: string; additiveName?: string; unit?: string; inventoryKind?: string;
  stockInHistory?: { id: string; date: unknown; quantity: number; price: number; notes?: string; source?: string }[];
}, type: 'feed' | 'additive') {
  if (item.inventoryKind === 'treatmentMix') return [];
  return (item.stockInHistory || []).filter(stock => stock.source !== 'treatmentMixProduction').map(stock => {
    const value = stock.date as { toDate?: () => Date; seconds?: number };
    const date = typeof stock.date === 'string' ? stock.date.split('T')[0]
      : value?.toDate ? value.toDate().toISOString().slice(0, 10)
      : typeof value?.seconds === 'number' ? new Date(value.seconds * 1000).toISOString().slice(0, 10) : '';
    if (!date || !Number.isFinite(Number(stock.quantity)) || !Number.isFinite(Number(stock.price)) || stock.quantity <= 0 || stock.price <= 0) {
      throw new Error('Inventory purchase date, quantity and price are required for finance.');
    }
    const record = buildInventoryExpense({ ...stock, sourceStockIndex: item.stockInHistory!.indexOf(stock), date, itemId, type, itemName: item.feedName || item.additiveName || 'Inventory', unit: item.unit });
    return { id: financeSyncDocumentId(record.reference), record };
  });
}
