export const ASSUMED_POND_DEPTH_METERS = 1;

export type CostedStockEntry = { quantity?: number; price?: number; totalCost?: number };
export type QuantityUsageEntry = { quantity?: number };

const round = (value: number, decimals: number) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export const roundInventoryQuantity = (value: number) => round(value, 3);
export const roundInventoryCost = (value: number) => round(value, 2);

export const calculateTreatmentDoseLiters = (
  pondAreaSquareMeters: number,
  ppm: number,
  depthMeters = ASSUMED_POND_DEPTH_METERS,
) => {
  if (!Number.isFinite(pondAreaSquareMeters) || pondAreaSquareMeters <= 0) throw new Error('Pond area must be greater than zero');
  if (!Number.isFinite(ppm) || ppm <= 0) throw new Error('PPM must be greater than zero');
  if (!Number.isFinite(depthMeters) || depthMeters <= 0) throw new Error('Pond depth must be greater than zero');
  const pondVolumeLiters = pondAreaSquareMeters * depthMeters * 1000;
  return {
    pondVolumeLiters: roundInventoryQuantity(pondVolumeLiters),
    requiredMixLiters: roundInventoryQuantity(ppm * pondVolumeLiters / 1_000_000),
  };
};

export const calculateFifoConsumption = (
  stockEntries: CostedStockEntry[],
  previousUsageEntries: QuantityUsageEntry[],
  requestedQuantity: number,
) => {
  if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) throw new Error('Quantity must be greater than zero');
  const layers = stockEntries.map((entry) => {
    const quantity = Number(entry.quantity) || 0;
    const explicitTotalCost = Number(entry.totalCost);
    return {
      remaining: quantity,
      price: Number.isFinite(explicitTotalCost) && quantity > 0 ? explicitTotalCost / quantity : Number(entry.price),
    };
  }).filter((entry) => entry.remaining > 0);
  if (layers.some((entry) => !Number.isFinite(entry.price) || entry.price < 0)) throw new Error('Inventory price history is incomplete');

  let historicalUsage = previousUsageEntries.reduce((sum, entry) => sum + Math.max(0, Number(entry.quantity) || 0), 0);
  for (const layer of layers) {
    if (historicalUsage <= 0) break;
    const consumed = Math.min(layer.remaining, historicalUsage);
    layer.remaining -= consumed;
    historicalUsage -= consumed;
  }
  if (historicalUsage > 0.0005) throw new Error('Inventory cost history does not cover previous usage');
  if (layers.reduce((sum, layer) => sum + layer.remaining, 0) + 0.0005 < requestedQuantity) {
    throw new Error('Inventory cost history does not cover the requested quantity');
  }

  let quantityLeft = requestedQuantity;
  let totalCost = 0;
  for (const layer of layers) {
    if (quantityLeft <= 0) break;
    const consumed = Math.min(layer.remaining, quantityLeft);
    layer.remaining -= consumed;
    quantityLeft -= consumed;
    totalCost += consumed * layer.price;
  }
  const remainingCost = layers.reduce((sum, layer) => sum + layer.remaining * layer.price, 0);
  return {
    totalCost: roundInventoryCost(totalCost),
    unitPrice: roundInventoryCost(totalCost / requestedQuantity),
    remainingCost: roundInventoryCost(remainingCost),
  };
};
