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
    paymentType: 'Cash',
    reference: `HARVEST-${harvest.id}`,
    notes: 'Auto-synced from harvest records',
  };
};

export const buildInventoryExpense = (stock: InventoryFinanceSource) => ({
  date: stock.date,
  category: stock.category || (stock.type === 'feed' ? 'Feed' : 'Pond Additives'),
  item: `${stock.itemName} - ${finiteNumber(stock.quantity)} ${stock.unit || 'kg'}${stock.batch ? ` (Batch: ${stock.batch})` : ''}`,
  amount: finiteNumber(stock.quantity) * finiteNumber(stock.price),
  paymentType: 'Cash',
  reference: `INVENTORY-${stock.type}-${stock.itemId}-${stock.id}`,
  notes: `Auto-synced from inventory${stock.notes ? `: ${stock.notes}` : ''}`,
  linkedInventory: stock.itemName,
});
