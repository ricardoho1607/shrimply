import { buildHarvestRevenue, buildInventoryLedgerEntries, financeSyncDocumentId, type HarvestFinanceSource } from './financeSync';
import { monetaryValue, isSourceLinkedFinance } from './financeIntegrity';
export interface ReconciliationEntry { id: string; reference?: string; amount?: unknown; voided?: boolean }
export function reconcileFinanceSources(input: {
  harvests: (HarvestFinanceSource & { voided?: boolean })[];
  feeds: ({ id: string } & Parameters<typeof buildInventoryLedgerEntries>[1])[];
  additives: ({ id: string } & Parameters<typeof buildInventoryLedgerEntries>[1])[];
  expenses: ReconciliationEntry[]; revenues: ReconciliationEntry[];
}) {
  const expected: { collection: 'expenses' | 'revenues'; id: string; reference: string; amount: number; voided?: boolean }[] = [];
  const issues: { kind: string; collection: string; reference: string; ids: string[]; expectedAmount?: number; actualAmount?: number }[] = [];
  for (const harvest of input.harvests) {
    const entry = buildHarvestRevenue(harvest);
    if (entry.amount > 0) expected.push({ collection: 'revenues', id: financeSyncDocumentId(entry.reference), reference: entry.reference, amount: entry.amount, voided: harvest.voided });
  }
  for (const [items, type] of [[input.feeds, 'feed'], [input.additives, 'additive']] as const) {
    for (const item of items) {
      try {
        for (const entry of buildInventoryLedgerEntries(item.id, item, type)) expected.push({ collection: 'expenses', id: entry.id, reference: entry.record.reference, amount: entry.record.amount });
      } catch { issues.push({ kind: 'invalid-source', collection: 'expenses', reference: item.id, ids: [] }); }
    }
  }
  for (const source of expected) {
    const linked = input[source.collection].filter(row => row.reference === source.reference);
    const active = linked.filter(row => !row.voided);
    if (!source.voided && !active.length) issues.push({ kind: 'missing', collection: source.collection, reference: source.reference, ids: linked.map(row => row.id), expectedAmount: source.amount });
    if (active.length > 1) issues.push({ kind: 'duplicate', collection: source.collection, reference: source.reference, ids: active.map(row => row.id) });
    for (const row of active) {
      const actual = monetaryValue(row.amount);
      if (source.voided || actual === null || Math.abs(actual - source.amount) >= 0.01) issues.push({ kind: source.voided ? 'orphaned-active-entry' : 'mismatch', collection: source.collection, reference: source.reference, ids: [row.id], expectedAmount: source.voided ? 0 : source.amount, ...(actual !== null ? { actualAmount: actual } : {}) });
    }
  }
  for (const collection of ['expenses', 'revenues'] as const) {
    for (const entry of input[collection]) {
      if (!entry.voided && isSourceLinkedFinance(entry) && !entry.reference?.startsWith('ASSET-') && !expected.some(row => row.collection === collection && row.reference === entry.reference)) issues.push({ kind: 'orphaned', collection, reference: entry.reference || '', ids: [entry.id] });
      if (!entry.voided && monetaryValue(entry.amount) === null) issues.push({ kind: 'invalid-amount', collection, reference: entry.reference || '', ids: [entry.id] });
    }
  }
  return { generatedAt: new Date().toISOString(), issues, expectedSourceCount: expected.length, writesPerformed: 0 };
}
