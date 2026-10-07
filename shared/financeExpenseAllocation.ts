import type { FinanceCycleRecord, FinancePondRecord, PondCostAllocation } from './financeCycleAllocation';
import { monetaryValue } from './financeIntegrity';
import { normalizeFarmDateKey } from './farmDate';

export type ExpenseAllocationMethod = 'equal_per_pond' | 'active_pond_area' | 'pl_quantity';
export interface ExpensePond extends FinancePondRecord {
  cycleName?: string | null;
  blockId?: string | null;
  blockName?: string | null;
  pondArea?: number | string | null;
  area?: number | string | null;
  initialPopulation?: number | string | null;
  initialStock?: number | string | null;
  cycleStatus?: string | null;
  cycleStartedAt?: string | null;
  docStart?: string | null;
}
export interface ExpenseAllocationLink {
  pondId: string;
  pondCycleId?: string;
  cycleId?: string;
  amount: number;
}
export interface AllocatedExpense {
  amount?: number | string | null;
  cycleId?: string | null;
  allocationMethod?: string | null;
  pondId?: string | null;
  pondCycleId?: string | null;
  pondAllocations?: ExpenseAllocationLink[];
}
export const requiresProductionAllocation = (record: { allocationMethod?: string | null }): boolean =>
  record.allocationMethod === 'active_pond_area' || record.allocationMethod === 'pl_quantity';
export interface ExpenseAllocationFields {
  allocationMethod?: ExpenseAllocationMethod | null;
  pondAllocations?: PondCostAllocation[];
  allocationBasisTotal?: number | null;
  allocationRate?: number | null;
  allocationCurrencyCode?: string | null;
  allocationDecimalPlaces?: number | null;
}
export const productionExpenseFields = (preview: ProductionAllocationPreview, method: 'active_pond_area' | 'pl_quantity', currencyCode: string, decimalPlaces: number): ExpenseAllocationFields & { cycleId: string; cycleName: string } => {
  const cycles = [...new Set(preview.allocations.map(row => row.cycleId).filter(Boolean))];
  return { allocationMethod: method, pondAllocations: preview.allocations, allocationBasisTotal: preview.totalBasis, allocationRate: preview.rate, allocationCurrencyCode: currencyCode, allocationDecimalPlaces: decimalPlaces,
    cycleId: cycles.length === 1 ? cycles[0]! : '', cycleName: cycles.length === 1 ? preview.allocations[0]?.cycleName || '' : '' };
};

const categoryAliases: Record<string, string> = {
  utilities: 'Utilities', utilitas: 'Utilities', '公用事业': 'Utilities', 'สาธารณูปโภค': 'Utilities', 'tiện ích': 'Utilities',
  salary: 'Salary', gaji: 'Salary', '工资': 'Salary', 'เงินเดือน': 'Salary', 'lương': 'Salary',
  consumption: 'Consumption', konsumsi: 'Consumption', '员工餐食': 'Consumption', 'อาหารพนักงาน': 'Consumption', 'suất ăn': 'Consumption',
  diesel: 'Diesel', solar: 'Diesel', 'solar / diesel': 'Diesel', '柴油': 'Diesel', 'ดีเซล': 'Diesel', 'dầu diesel': 'Diesel',
  petrol: 'Petrol', bensin: 'Petrol', 'bensin / petrol': 'Petrol', gasoline: 'Petrol', '汽油': 'Petrol', 'เบนซิน': 'Petrol', 'xăng': 'Petrol',
  'seed / pl': 'Seed / PL', 'bibit / pl': 'Seed / PL', '虾苗 / pl': 'Seed / PL', 'ลูกกุ้ง / pl': 'Seed / PL', 'giống / pl': 'Seed / PL',
};
export const normalizeProductionExpenseCategory = (category: string): string => categoryAliases[category.trim().toLowerCase()] || category;
export const productionAllocationMethod = (category: string): 'active_pond_area' | 'pl_quantity' | null => {
  const normalized = normalizeProductionExpenseCategory(category);
  if (normalized === 'Seed / PL') return 'pl_quantity';
  return ['Utilities', 'Salary', 'Consumption', 'Diesel', 'Petrol', 'Labor', 'Tenaga Kerja', '人工', 'แรงงาน', 'Lao động'].includes(normalized) ? 'active_pond_area' : null;
};
export const pondAreaValue = (pond: ExpensePond): number | null => monetaryValue(pond.pondArea ?? pond.area);
export const pondPlQuantity = (pond: ExpensePond): number | null => monetaryValue(pond.initialPopulation ?? pond.initialStock);
const sortPonds = (ponds: ExpensePond[]): ExpensePond[] => [...ponds].sort((a, b) =>
  String(a.blockName || '').localeCompare(String(b.blockName || ''), undefined, { numeric: true }) ||
  a.pondName.localeCompare(b.pondName, undefined, { numeric: true }) || a.id.localeCompare(b.id));
export const getActiveExpensePonds = (ponds: ExpensePond[], cycles: FinanceCycleRecord[], date: string, timeZone?: string): ExpensePond[] => {
  const openIds = new Set(cycles.filter(cycle => ['stocking', 'active'].includes(cycle.status || '')).map(cycle => cycle.id));
  const key = normalizeFarmDateKey(date, timeZone);
  return sortPonds(ponds.filter(pond => {
    const start = normalizeFarmDateKey(pond.cycleStartedAt || pond.docStart, timeZone);
    return pond.cycleStatus !== 'ended' && Boolean(pond.cycleId && openIds.has(pond.cycleId)) && Boolean(key && (!start || start <= key));
  }));
};
export const getPlExpensePonds = (ponds: ExpensePond[], cycles: FinanceCycleRecord[], date: string, timeZone?: string): ExpensePond[] => {
  const ids = new Set(cycles.map(cycle => cycle.id));
  const key = normalizeFarmDateKey(date, timeZone);
  return sortPonds(ponds.filter(pond => {
    const start = normalizeFarmDateKey(pond.cycleStartedAt || pond.docStart, timeZone);
    return Boolean(key && pond.cycleId && ids.has(pond.cycleId) && (!start || start <= key));
  }));
};

export type AllocationError = 'invalidAmount' | 'noPonds' | 'missingArea' | 'missingQuantity' | 'missingCycle';
export interface ProductionAllocationPreview {
  allocations: PondCostAllocation[];
  totalBasis: number;
  rate: number;
  blockCount: number;
  error: AllocationError | null;
}
/** Largest remainders distribute the currency's minor units without losing invoice value. */
export function buildProductionAllocation(amount: number, method: 'active_pond_area' | 'pl_quantity', targets: ExpensePond[], plQuantities: Record<string, string | number> = {}, decimalPlaces = 2): ProductionAllocationPreview {
  const fail = (error: AllocationError): ProductionAllocationPreview => ({ allocations: [], totalBasis: 0, rate: 0, blockCount: 0, error });
  const scale = 10 ** decimalPlaces;
  const units = Math.round(amount * scale);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(units) || units <= 0 || ![0, 2].includes(decimalPlaces)) return fail('invalidAmount');
  if (!targets.length) return fail('noPonds');
  const ponds = sortPonds(targets);
  if (new Set(ponds.map(pond => pond.id)).size !== ponds.length || ponds.some(pond => !pond.cycleId)) return fail('missingCycle');
  const weights = ponds.map(pond => method === 'active_pond_area' ? pondAreaValue(pond) : monetaryValue(plQuantities[pond.id] ?? pondPlQuantity(pond)));
  if (weights.some(weight => weight === null || weight <= 0 || (method === 'pl_quantity' && !Number.isSafeInteger(weight)))) return fail(method === 'active_pond_area' ? 'missingArea' : 'missingQuantity');
  const totalBasis = weights.reduce<number>((sum, weight) => sum + weight!, 0);
  if (!Number.isFinite(totalBasis) || totalBasis <= 0) return fail(method === 'active_pond_area' ? 'missingArea' : 'missingQuantity');
  const portions = weights.map(weight => units * (weight! / totalBasis));
  const shares = portions.map(Math.floor);
  const remainder = units - shares.reduce((sum, value) => sum + value, 0);
  if (remainder < 0 || remainder > ponds.length) return fail('invalidAmount');
  const order = portions.map((portion, index) => ({ index, remainder: portion - shares[index] })).sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let index = 0; index < remainder; index++) shares[order[index].index]++;
  const allocations = ponds.map((pond, index): PondCostAllocation => ({
    pondId: pond.id, pondName: pond.pondName, pondCycleId: pond.pondCycleId || pond.id,
    cycleId: pond.cycleId!, ...(pond.cycleName ? { cycleName: pond.cycleName } : {}),
    ...(pond.blockId ? { blockId: pond.blockId } : {}), ...(pond.blockName ? { blockName: pond.blockName } : {}),
    amount: shares[index] / scale, share: weights[index]! / totalBasis,
    ...(method === 'active_pond_area' ? { pondArea: weights[index]! } : { plQuantity: weights[index]! }),
  }));
  return { allocations, totalBasis, rate: (units / scale) / totalBasis, blockCount: new Set(ponds.map(pond => pond.blockId || pond.blockName || '__unassigned__')).size, error: null };
}

export function hasValidExpenseAllocations(record: AllocatedExpense): boolean {
  const amount = monetaryValue(record.amount);
  const rows = record.pondAllocations;
  if (amount === null || !rows?.length) return false;
  if (rows.some(row => !row.pondId || monetaryValue(row.amount) === null || Number(row.amount) < 0)) return false;
  if (new Set(rows.map(row => row.pondCycleId || row.pondId)).size !== rows.length) return false;
  return Math.round(rows.reduce((sum, row) => sum + Number(row.amount), 0) * 100) === Math.round(amount * 100);
}
export const allocationCycleId = (row: ExpenseAllocationLink, record: AllocatedExpense, ponds: FinancePondRecord[] = []): string | null | undefined =>
  row.cycleId || record.cycleId || ponds.find(pond => row.pondCycleId ? (pond.pondCycleId || pond.id) === row.pondCycleId : pond.id === row.pondId)?.cycleId;
export const expenseMatchesCycle = (record: AllocatedExpense, cycleId: string, ponds: FinancePondRecord[] = []): boolean =>
  cycleId === 'all' || (record.pondAllocations?.length
    ? record.pondAllocations.some(row => allocationCycleId(row, record, ponds) === cycleId)
    : (record.cycleId || ponds.find(pond => pond.id === record.pondId)?.cycleId) === cycleId);
export function expenseAmountForCycle(record: AllocatedExpense, cycleId: string, ponds: FinancePondRecord[] = []): number | null {
  const amount = monetaryValue(record.amount);
  if (amount === null) return null;
  if (cycleId === 'all') return amount;
  if (!expenseMatchesCycle(record, cycleId, ponds)) return 0;
  if (!record.pondAllocations?.length) return amount;
  if (!hasValidExpenseAllocations(record)) return record.cycleId === cycleId ? amount : null;
  return Math.round(record.pondAllocations.filter(row => allocationCycleId(row, record, ponds) === cycleId).reduce((sum, row) => sum + Number(row.amount), 0) * 100) / 100;
}
/** A view only: never persist its scoped amount back to the invoice or use it for payments. */
export function scopeExpenseRecords<T extends AllocatedExpense>(records: T[], cycleId: string, ponds: FinancePondRecord[] = []): (T & { billAmount?: number })[] {
  if (cycleId === 'all') return records;
  return records.filter(record => expenseMatchesCycle(record, cycleId, ponds)).map(record => ({ ...record, amount: expenseAmountForCycle(record, cycleId, ponds) ?? Number.NaN, billAmount: monetaryValue(record.amount) ?? Number.NaN }));
}
export const savedAllocationPonds = (record: ExpenseAllocationFields): ExpensePond[] | null => {
  if (!['active_pond_area', 'pl_quantity'].includes(record.allocationMethod || '') || !record.pondAllocations?.length) return null;
  return record.pondAllocations.map(row => ({ id: row.pondId, pondName: row.pondName, pondCycleId: row.pondCycleId, cycleId: row.cycleId, cycleName: row.cycleName, blockId: row.blockId, blockName: row.blockName, pondArea: row.pondArea, initialPopulation: row.plQuantity }));
};
