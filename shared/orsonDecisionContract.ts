/** Common metadata for the existing read-only decision payloads. */
export type DecisionKind = 'period_totals' | 'comparison' | 'replenishment' | 'harvest_scenarios';
export type DecisionStatus = 'complete' | 'partial' | 'insufficient_data';
export interface DecisionMetadata {
  version: 1;
  kind: DecisionKind;
  resultStatus: DecisionStatus;
  writesPerformed: 0;
  asOf: string;
  formulaVersion: string;
  consistency: string;
  sourceDigest: string | null;
  coverage: {
    retrievalComplete: boolean;
    expectedObservationDays: number | null;
    recordedObservationDays: number | null;
    missingFields: string[];
    excludedRecordCount: number | null;
  };
}
export const isDecisionMetadata = (value: unknown): value is DecisionMetadata => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const coverage = record.coverage as DecisionMetadata['coverage'] | undefined;
  const nullableCount = (count: unknown) => count === null || (typeof count === 'number' && Number.isInteger(count) && count >= 0);
  return !!coverage && typeof coverage.retrievalComplete === 'boolean' &&
    nullableCount(coverage.expectedObservationDays) && nullableCount(coverage.recordedObservationDays) && nullableCount(coverage.excludedRecordCount) &&
    Array.isArray(coverage.missingFields) && coverage.missingFields.every(field => typeof field === 'string') && record.version === 1 && record.writesPerformed === 0 &&
    ['period_totals', 'comparison', 'replenishment', 'harvest_scenarios'].includes(String(record.kind)) &&
    ['complete', 'partial', 'insufficient_data'].includes(String(record.resultStatus)) &&
    typeof record.asOf === 'string' && Number.isFinite(Date.parse(record.asOf)) &&
    typeof record.formulaVersion === 'string' && typeof record.consistency === 'string' &&
    (record.sourceDigest === null || typeof record.sourceDigest === 'string');
};
