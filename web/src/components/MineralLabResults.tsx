"use client";

import { useEffect, useMemo, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useLanguage } from '@/contexts/LanguageContext';
import { getManualLabColumns } from '@/lib/manualLabColumns';
import { selectMineralLabReports, type SavedMineralLabReport } from '@/lib/mineralLabResults';
import { labMeasurementLabel } from '../../../functions/shared/labMeasurementContract';

export default function MineralLabResults({ companyId, ponds, reportDate, selectedBlock, canExport }: {
  companyId: string;
  ponds: { id: string; blockName?: string | null }[];
  reportDate: string;
  selectedBlock: string;
  canExport: boolean;
}) {
  const { t } = useLanguage();
  const copy = t.dailyOperationsReports;
  const [source, setSource] = useState<{ companyId: string; reports: SavedMineralLabReport[]; error?: boolean } | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [exporting, setExporting] = useState(false);
  useEffect(() => onSnapshot(query(collection(db, 'companies', companyId, 'labReports'), orderBy('sampleDate', 'desc')),
    snapshot => setSource({ companyId, reports: snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as SavedMineralLabReport)) }),
    error => { console.error('Failed to load mineral reports:', error); setSource({ companyId, reports: [], error: true }); }), [companyId]);
  const reports = useMemo(() => selectMineralLabReports(source?.companyId === companyId ? source.reports : [], ponds, reportDate, selectedBlock), [companyId, ponds, reportDate, selectedBlock, source]);
  const selected = reports.find(report => report.id === selectedId) || reports[0];
  const columns = getManualLabColumns('water_quality');
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
      window.alert(copy.exportFailedMessage);
    } finally { setExporting(false); }
  };
  if (source?.companyId !== companyId) return <div style={{ padding: 40, textAlign: 'center' }}><Loader2 className="animate-spin" aria-label={copy.mineralLabResults} /></div>;
  if (source.error) return <p role="alert" style={{ padding: 24 }}>{copy.mineralLoadFailed}</p>;
  if (!selected) return <p style={{ padding: 24, color: 'var(--text-muted)' }}>{copy.noMineralReports}</p>;
  return <section aria-label={copy.mineralLabResults}>
    <div style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
      <label style={{ display: 'grid', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>{copy.labReport}
        <select value={selected.id} onChange={event => setSelectedId(event.target.value)} style={{ maxWidth: '100%', padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: '#fff', color: 'var(--text-primary)' }}>
          {reports.map((report, index) => <option key={report.id} value={report.id}>{report.labName || copy.labReport} · {report.sampleDate} · {index + 1}</option>)}
        </select>
      </label>
      <button className="btn-primary" onClick={exportPdf} disabled={!canExport || exporting} style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 44 }}>
        {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}{exporting ? copy.exporting : copy.downloadMineralPdf}
      </button>
    </div>
    <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 1800, borderCollapse: 'collapse', fontSize: 12 }}>
      <thead><tr>{[copy.pond, ...columns.map(column => column.label.replace(' (unit/basis below)', ''))].map((label, index) => <th key={index} style={{ padding: 10, background: '#0F4C75', color: '#fff' }}>{label}</th>)}</tr></thead>
      <tbody>{selected.pondResults?.map((row, index) => <tr key={`${row.pondId}-${index}`}>
        <td style={{ padding: 10, textAlign: 'center', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>{row.pondCode}</td>
        {columns.map(column => {
          const [section, key] = column.path;
          const value = key ? row[section as 'waterQuality' | 'microbiology']?.[key] : row[section as 'doc' | 'transparencyCm'];
          return <td key={column.path.join('.')} style={{ padding: 10, textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
            {value === null || value === undefined || value === '' ? 'N/A' : value}
            {section === 'waterQuality' && value !== null && value !== undefined && value !== '' && <small style={{ display: 'block', marginTop: 4, color: 'var(--text-muted)' }}>{labMeasurementLabel(key, row.measurementUnits).replace(/^.*?\(/, '(')}</small>}
          </td>;
        })}
      </tr>)}</tbody>
    </table></div>
  </section>;
}
