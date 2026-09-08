import type { ManualLabReport } from './manualLabReport';

export interface SavedMineralLabReport extends ManualLabReport {
  id: string;
  status?: string;
  entryMode?: string;
}

export function selectMineralLabReports(
  reports: SavedMineralLabReport[],
  ponds: { id: string; blockName?: string | null }[],
  reportDate: string,
  selectedBlock: string,
): SavedMineralLabReport[] {
  const pondIds = new Set(ponds.filter(pond => selectedBlock === 'all' || pond.blockName === selectedBlock).map(pond => pond.id));
  return reports.filter(report => report.status === 'confirmed'
    && (report.entryMode || 'manual') === 'manual'
    && report.reportType !== 'plankton'
    && report.sampleDate?.slice(0, 10) === reportDate)
    .map(report => ({ ...report, reportType: 'water_quality', pondResults: (report.pondResults || []).filter(row => pondIds.has(row.pondId)) }))
    .filter(report => report.pondResults.length > 0);
}
