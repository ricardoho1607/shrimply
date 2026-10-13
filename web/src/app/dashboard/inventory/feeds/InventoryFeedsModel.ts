import { validId, type OrsonCommand, type OrsonOperation } from "../../../../../../shared/orsonAgentContract";
import { type InventoryProductLabel } from "../../../../../../shared/productLabel";
export interface StockHistory {
  id: string;
  date: string;
  quantity: number;
  price: number;
  notes?: string;
  expiry?: string;
  unit?: string;
  createdAt: unknown;
  voided?: boolean;
  voidedAt?: unknown;
  voidedBy?: string;
}

export interface UsageHistory {
  id: string;
  date: string;
  quantity: number;
  unitPrice?: number;
  totalCost?: number;
  source?: string;
  pondId?: string;
  cycleId?: string;
  cycleName?: string;
  pondCycleId?: string;
  notes?: string;
  createdAt: unknown;
}

export interface InventoryItem {
  archived?: boolean;
  id: string;
  companyId: string;
  itemName: string;
  brand?: string;
  category: string;
  feedType?: string;
  inventoryKind?: 'additive' | 'treatmentMix';
  productLabel?: InventoryProductLabel | null;
  unit?: string;
  reorderLevel?: number;
  stockInHistory: StockHistory[];
  usageHistory: UsageHistory[];
  totalStock: number;
  totalCost: number;
  lastUpdated: unknown;
  createdAt: unknown;
}

export type AcceptedVoid = {
  command: OrsonCommand;
  operation: OrsonOperation;
  companyId: string;
  uid: string;
  retryVerified: boolean;
};

export function matchesVoidOperation(
  operation: OrsonOperation | null | undefined,
  command: OrsonCommand,
  operationId?: string,
): operation is OrsonOperation {
  if (!operation || !validId(operation.id) || (operationId && operation.id !== operationId) ||
    !Number.isInteger(operation.revision) || operation.revision < 1 ||
    !['draft', 'completed', 'partial', 'discarded'].includes(operation.state) ||
    !Array.isArray(operation.rows) || operation.rows.length !== 1 ||
    !Array.isArray(operation.receipts)) return false;
  const row = operation.rows[0];
  const target = row?.command;
  return !!target && target.id === command.id && target.type === 'void_inventory_purchase' &&
    target.itemType === command.itemType && (command.itemType === 'feed' || command.itemType === 'additive') &&
    target.itemId === command.itemId &&
    target.recordId === command.recordId && target.date === command.date &&
    !!target.values && typeof target.values === 'object' && !Array.isArray(target.values) &&
    Object.keys(target.values).length === 0 &&
    typeof row.valid === 'boolean' &&
    operation.receipts.every(receipt => receipt &&
      ['saved', 'failed'].includes(receipt.status) && typeof receipt.message === 'string' &&
      Array.isArray(receipt.rowIds) && receipt.rowIds.length === 1 && receipt.rowIds[0] === command.id);
}

export function isVoidSaved(operation: OrsonOperation) {
  return operation.state === 'completed' && operation.receipts.some(receipt => receipt.status === 'saved');
}

export function isVoidRetryable(operation: OrsonOperation) {
  return (operation.state === 'draft' || operation.state === 'partial') &&
    operation.rows[0]?.valid === true && !operation.rows[0].error &&
    !operation.receipts.some(receipt => receipt.status === 'saved');
}

export const UNITS = ['kg', 'L', 'pack', 'sack'];

export const FEED_CATEGORIES = ['Starter', 'Grower', 'Finisher', 'Other'];

export const ADDITIVE_CATEGORIES = ['Water Conditioner', 'Probiotic', 'Mineral', 'Vitamin', 'Other'];

export const formatQuantity = (value: number) => new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
}).format(Number.isFinite(value) ? value : 0);

export function formatUsageDisplay(quantity: number | string): string {
  const numeric = typeof quantity === 'number' ? quantity : Number(quantity);
  const magnitude = Number.isFinite(numeric) ? Math.abs(numeric) : 0;
  return `-${formatQuantity(magnitude)}`;
}
