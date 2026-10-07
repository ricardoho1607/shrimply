export interface FinanceCycleRecord {
  id: string;
  cycleName: string;
  status?: string;
}

export interface FinancePondRecord {
  id: string;
  pondName: string;
  cycleId?: string | null;
  pondCycleId?: string | null;
}

export interface PondCostAllocation {
  pondId: string;
  pondName: string;
  pondCycleId: string;
  amount: number;
  share: number;
  cycleId?: string;
  cycleName?: string;
  blockId?: string;
  blockName?: string;
  pondArea?: number;
  plQuantity?: number;
}

const COMPANY_WIDE_EXPENSE_LABELS = new Set([
  'general', 'company-wide', 'company wide', 'company-wide expense',
  'umum', 'perusahaan', 'biaya perusahaan',
  'ทั้งบริษัท', 'ทั่วไป', 'ค่าใช้จ่ายระดับบริษัท',
  '一般', '公司范围', '公司费用',
  'chung', 'toàn công ty', 'chi phí toàn công ty',
]);

export const isCompanyWideExpenseCategory = (category: unknown): boolean => (
  COMPANY_WIDE_EXPENSE_LABELS.has(String(category ?? '').trim().toLowerCase())
);

export const getOpenFinanceCycles = <T extends FinanceCycleRecord>(cycles: T[]): T[] => cycles
  .filter((cycle) => ['planning', 'stocking', 'active'].includes(cycle.status || ''))
  .sort((first, second) => first.cycleName.localeCompare(second.cycleName, undefined, { numeric: true }));

export const allocateExpenseAcrossCyclePonds = (
  amount: number,
  cycleId: string | undefined,
  ponds: FinancePondRecord[],
): PondCostAllocation[] => {
  if (!cycleId || !Number.isFinite(amount) || amount <= 0) return [];

  const cyclePonds = ponds
    .filter((pond) => pond.cycleId === cycleId)
    .sort((first, second) => first.pondName.localeCompare(second.pondName, undefined, { numeric: true }));
  if (cyclePonds.length === 0) return [];

  const totalMinorUnits = Math.round(amount * 100);
  const baseMinorUnits = Math.floor(totalMinorUnits / cyclePonds.length);
  const remainder = totalMinorUnits - (baseMinorUnits * cyclePonds.length);
  const share = 1 / cyclePonds.length;

  return cyclePonds.map((pond, index) => ({
    pondId: pond.id,
    pondName: pond.pondName,
    pondCycleId: pond.pondCycleId || pond.id,
    amount: (baseMinorUnits + (index < remainder ? 1 : 0)) / 100,
    share,
  }));
};
