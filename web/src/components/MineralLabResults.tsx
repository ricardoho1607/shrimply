"use client";
import { showAppAlert } from '@/lib/appDialogs';


import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useLanguage } from '@/contexts/LanguageContext';
import { getManualLabColumns } from '@/lib/manualLabColumns';
import { selectMineralLabReports, type SavedMineralLabReport } from '@/lib/mineralLabResults';
import { dailyOperationsTranslations, type DailyOperationsLanguage } from '../../../shared/dailyOperationsI18n';

export interface MineralLabResultsHandle {
  exportPdf: () => Promise<void>;
  selectedReport: SavedMineralLabReport | null;
}

export interface MineralLabResultsProps {
  companyId: string;
  ponds: {
    id: string;
    blockName?: string | null;
    pondName?: string;
    pondCode?: string;
    cycleStatus?: string | null;
    docStart?: unknown;
    stockingDate?: unknown;
  }[];
  reportDate: string;
  selectedBlock: string;
  canExport: boolean;
  onSelectedReportChange?: (report: SavedMineralLabReport | null) => void;
  onExportingChange?: (exporting: boolean) => void;
}

const cellStyle: React.CSSProperties = {
  padding: '10px 8px',
  borderBottom: '1px solid var(--border)',
  textAlign: 'center',
  whiteSpace: 'nowrap',
  fontSize: '12px',
};

const headerCell: React.CSSProperties = {
  ...cellStyle,
  background: '#0F4C75',
  fontWeight: 700,
  color: '#fff',
};

const getDocDays = (stockingDate: unknown, reportDate: string): string => {
  if (!stockingDate) return 'N/A';
  const startKey = typeof stockingDate === 'string' ? stockingDate.slice(0, 10) : '';
  if (!startKey) return 'N/A';
  const start = Date.parse(`${startKey}T00:00:00Z`);
  const end = Date.parse(`${reportDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 'N/A';
  const diff = Math.floor((end - start) / 86_400_000);
  return diff >= 0 ? String(diff) : 'N/A';
};

const MineralLabResults = forwardRef<MineralLabResultsHandle, MineralLabResultsProps>(function MineralLabResults(
  { companyId, ponds, reportDate, selectedBlock, canExport, onSelectedReportChange, onExportingChange },
  ref,
) {
  const { t, currentLanguage } = useLanguage();
  const langKey = (currentLanguage in dailyOperationsTranslations ? currentLanguage : 'en') as DailyOperationsLanguage;
  const localeCopy = dailyOperationsTranslations[langKey] || dailyOperationsTranslations.en;
  const copy = useMemo(() => {
    const rawContext = (t?.dailyOperationsReports || {}) as Record<string, unknown>;
    const base = { ...dailyOperationsTranslations.en, ...localeCopy } as Record<string, string>;
    const merged = { ...base };
    for (const [key, value] of Object.entries(rawContext)) {
      if (typeof value === 'string' && value.trim() && value !== 'undefined' && value !== 'null') {
        merged[key] = value;
      }
    }
    return merged as typeof dailyOperationsTranslations.en;
  }, [currentLanguage, localeCopy, t?.dailyOperationsReports]);
  const [source, setSource] = useState<{ companyId: string; reports: SavedMineralLabReport[]; error?: boolean } | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [exporting, setExporting] = useState(false);
  useEffect(() => onSnapshot(query(collection(db, 'companies', companyId, 'labReports'), orderBy('sampleDate', 'desc')),
    snapshot => setSource({ companyId, reports: snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as SavedMineralLabReport)) }),
    error => { console.error('Failed to load mineral reports:', error); setSource({ companyId, reports: [], error: true }); }), [companyId]);
  const reports = useMemo(() => selectMineralLabReports(source?.companyId === companyId ? source.reports : [], ponds, reportDate, selectedBlock), [companyId, ponds, reportDate, selectedBlock, source]);
  const confirmedReport = reports.find(report => report.id === selectedId) || reports[0];
  const columns = getManualLabColumns('water_quality');

  const activePonds = useMemo(() => {
    return (ponds || [])
      .filter(pond => pond.cycleStatus !== 'ended' && (selectedBlock === 'all' || pond.blockName === selectedBlock))
      .sort((a, b) => (a.pondName || a.pondCode || a.id || '').localeCompare(b.pondName || b.pondCode || b.id || ''));
  }, [ponds, selectedBlock]);

  const defaultRows = useMemo(() => {
    return activePonds.map(pond => ({
      pondId: pond.id,
      pondCode: pond.pondCode || pond.pondName || pond.id,
      doc: getDocDays(pond.docStart || pond.stockingDate, reportDate),
    }));
  }, [activePonds, reportDate]);

  const selected = useMemo(() => {
    if (confirmedReport) return confirmedReport;
    if (defaultRows.length > 0) {
      return {
        id: `mineral-${reportDate}`,
        status: 'draft',
        entryMode: 'manual',
        reportType: 'water_quality',
        sampleDate: reportDate,
        labName: `${copy.mineralLabResults} — Blank worksheet (no confirmed results)`,
        pondResults: defaultRows,
      } as SavedMineralLabReport;
    }
    return null;
  }, [confirmedReport, copy.mineralLabResults, defaultRows, reportDate]);

  const rows = selected?.pondResults || [];

  useEffect(() => {
    onSelectedReportChange?.(selected || null);
    return () => {
      onSelectedReportChange?.(null);
    };
  }, [onSelectedReportChange, selected]);

  useEffect(() => {
    onExportingChange?.(exporting);
  }, [onExportingChange, exporting]);

  const exportPdf = async () => {
    if (!canExport || exporting || !selected) return;
    setExporting(true);
    try {
      const { generateManualLabReportHTML } = await import('@/lib/manualLabReport');
      const { downloadMobilePdf, loadMobilePdfBrandAssets } = await import('@/lib/mobilePdfExport');
      const assets = await loadMobilePdfBrandAssets('landscape');
      await downloadMobilePdf({ html: generateManualLabReportHTML(selected, assets), filename: `Shrimply-Mineral-Lab-${reportDate}-${selected.id.replace(/[^a-zA-Z0-9_-]/g, '')}.pdf`, orientation: 'landscape' });
    } catch (error) {
      console.error('Failed to export mineral report:', error);
      showAppAlert(copy.exportFailedMessage);
    } finally { setExporting(false); }
  };

  useImperativeHandle(ref, () => ({
    exportPdf,
    selectedReport: selected || null,
  }), [exportPdf, selected]);

  if (source?.companyId !== companyId) {
    return (
      <div style={{ width: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1800px' }}>
          <thead>
            <tr>
              {[copy.pond || 'Pond', ...columns.map(column => column.label.replace(' (unit/basis below)', ''))].map((label, index) => (
                <th key={label || index} style={headerCell}>{label}</th>
              ))}
            </tr>
          </thead>
        </table>
        <div style={{ padding: '42px', display: 'grid', placeItems: 'center' }}>
          <Loader2 className="animate-spin" aria-label={copy.mineralLabResults} />
        </div>
      </div>
    );
  }

  if (source.error) {
    return (
      <div style={{ width: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1800px' }}>
          <thead>
            <tr>
              {[copy.pond || 'Pond', ...columns.map(column => column.label.replace(' (unit/basis below)', ''))].map((label, index) => (
                <th key={label || index} style={headerCell}>{label}</th>
              ))}
            </tr>
          </thead>
        </table>
        <div role="alert" style={{ padding: '42px', textAlign: 'center', color: 'var(--text-muted)' }}>
          {copy.mineralLoadFailed}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {reports.length > 1 && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
            <span>{copy.labReport}:</span>
            <select
              value={selected?.id || ''}
              onChange={event => setSelectedId(event.target.value)}
              style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: '#fff', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600 }}
            >
              {reports.map((report, index) => (
                <option key={report.id} value={report.id}>
                  {report.labName || copy.labReport} · {report.sampleDate} {reports.length > 1 ? `(${index + 1})` : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1800px' }}>
        <thead>
          <tr>
            {[copy.pond || 'Pond', ...columns.map(column => column.label.replace(' (unit/basis below)', ''))].map((label, index) => (
              <th key={label || index} style={headerCell}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.pondId || index}-${index}`}>
              <td style={{ ...cellStyle, fontWeight: 700 }}>{row.pondCode || 'N/A'}</td>
              {columns.map(column => {
                const [section, key] = column.path;
                const sectionValue = (row as unknown as Record<string, unknown>)[section];
                const rawValue = key && sectionValue && typeof sectionValue === 'object'
                  ? (sectionValue as Record<string, unknown>)[key] : key ? undefined : sectionValue;
                const valStr = rawValue == null ? '' : String(rawValue).trim();
                const displayValue = !valStr || valStr === 'undefined' || valStr === 'null' || valStr === 'NaN' || valStr === '-' ? 'N/A' : valStr;
                return (
                  <td key={column.path.join('.')} style={cellStyle}>
                    {displayValue}
                  </td>
                );
              })}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length + 1} style={{ ...cellStyle, padding: '42px', color: 'var(--text-muted)' }}>
                {copy.noMineralReports}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {!confirmedReport && rows.length > 0 && (
        <div style={{ padding: '16px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', borderTop: '1px solid var(--border)' }}>
          {copy.noMineralReports}
        </div>
      )}
    </div>
  );
});

export default MineralLabResults;
