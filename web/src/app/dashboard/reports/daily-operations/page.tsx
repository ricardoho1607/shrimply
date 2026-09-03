"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Download, Droplets, FileText, Loader2 } from 'lucide-react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { db } from '@/lib/firebase';
import { useCompanyBlocks } from '@/hooks/useDashboardData';
import { downloadMobilePdf, loadMobilePdfBrandAssets } from '@/lib/mobilePdfExport';
import {
  buildDailyOperationsReport,
  generateDailyOperationsReportHTML,
  type DailyOperationsPondSource,
} from '../../../../../../shared/dailyOperationsReport';
import { getFarmDateKey } from '../../../../../../shared/farmDate';
import { hasFarmPermission } from '../../../../../../shared/permissions';
import {
  filterEnterpriseRecordsForUser,
  type FarmBlock,
} from '../../../../../../shared/enterpriseBlocks';

type ReportTab = 'sipon' | 'water';

const cellStyle: React.CSSProperties = {
  padding: '10px 8px',
  borderBottom: '1px solid var(--border)',
  textAlign: 'center',
  whiteSpace: 'nowrap',
  fontSize: '12px',
};

export default function DailyOperationsReportsPage() {
  const { user, company } = useAuth();
  const { t, currentLanguage } = useLanguage();
  const copy = t.dailyOperationsReports;
  const today = getFarmDateKey(new Date(), company?.timeZone);
  const [reportDate, setReportDate] = useState(today);
  const [activeTab, setActiveTab] = useState<ReportTab>('sipon');
  const [selectedBlock, setSelectedBlock] = useState('all');
  const [ponds, setPonds] = useState<DailyOperationsPondSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const canViewReports = hasFarmPermission(user, 'viewReports', company?.ownerId);
  const canExportReports = hasFarmPermission(user, 'exportReports', company?.ownerId);
  const { data: farmBlocks } = useCompanyBlocks<FarmBlock>('asc');

  useEffect(() => {
    if (!company?.id || !canViewReports) return;
    return onSnapshot(
      query(collection(db, 'companies', company.id, 'ponds'), orderBy('pondName')),
      (snapshot) => {
        setPonds(snapshot.docs.map((pondDoc) => ({ id: pondDoc.id, ...pondDoc.data() } as DailyOperationsPondSource)));
        setLoading(false);
      },
      (error) => {
        console.error('Failed to load daily operations report:', error);
        setLoading(false);
      },
    );
  }, [canViewReports, company?.id]);

  const accessiblePonds = useMemo(() => filterEnterpriseRecordsForUser(ponds, {
    businessSize: company?.businessSize,
    role: user?.role,
    userId: user?.uid,
    blocks: farmBlocks,
  }), [company?.businessSize, farmBlocks, ponds, user?.role, user?.uid]);
  const activePonds = useMemo(() => accessiblePonds.filter((pond) => pond.cycleStatus !== 'ended'), [accessiblePonds]);
  const blocks = useMemo(() => Array.from(new Set(activePonds.map((pond) => pond.blockName).filter(Boolean) as string[])).sort(), [activePonds]);
  const filteredPonds = useMemo(
    () => selectedBlock === 'all' ? activePonds : activePonds.filter((pond) => pond.blockName === selectedBlock),
    [activePonds, selectedBlock],
  );
  const report = useMemo(() => buildDailyOperationsReport({
    companyName: company?.companyName || copy.myFarm,
    reportDate,
    generatedBy: user?.name || user?.email?.split('@')[0] || copy.shrimplyUser,
    ponds: filteredPonds,
  }), [company?.companyName, copy.myFarm, copy.shrimplyUser, filteredPonds, reportDate, user?.email, user?.name]);

  const exportPdf = async () => {
    if (!canExportReports || exporting) return;
    setExporting(true);
    try {
      const assets = await loadMobilePdfBrandAssets('landscape');
      const html = generateDailyOperationsReportHTML(report, assets, currentLanguage);
      await downloadMobilePdf({ html, filename: `Shrimply-Daily-Operations-${reportDate}.pdf`, orientation: 'landscape' });
    } catch (error) {
      console.error('Failed to export daily operations PDF:', error);
      window.alert(copy.exportFailedMessage);
    } finally {
      setExporting(false);
    }
  };

  if (!canViewReports) return <div style={{ textAlign: 'center', padding: '100px' }}>{copy.noPermission}</div>;
  if (loading) return <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}><Loader2 className="animate-spin" size={40} /></div>;

  const headerCell = { ...cellStyle, background: '#fff4a8', fontWeight: 700, color: '#102a43' } as React.CSSProperties;

  return (
    <div className="dashboard-page-relaxed authenticated-compact-page business-dashboard-page" style={{ paddingBottom: '40px' }}>
      <div className="glass-card" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '18px', padding: '20px 22px', display: 'flex', justifyContent: 'space-between', gap: '18px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{t.nav.reports || 'Reports'}</div>
          <h1 style={{ fontSize: '24px', lineHeight: '32px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>{copy.title}</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0' }}>{copy.subtitle}</p>
        </div>
        <button className="btn-primary" onClick={exportPdf} disabled={!canExportReports || exporting || filteredPonds.length === 0} style={{ minHeight: '44px', padding: '0 17px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          {exporting ? copy.exporting : copy.exportBoth}
        </button>
      </div>

      <div className="glass-card" style={{ marginTop: '16px', background: '#fff', border: '1px solid var(--border)', borderRadius: '18px', padding: '16px', display: 'flex', alignItems: 'end', gap: '18px', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '7px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>
          {copy.reportDate}
          <input type="date" max={today} value={reportDate} onChange={(event) => setReportDate(event.target.value)} className="form-input" style={{ minWidth: '190px' }} />
        </label>
        {blocks.length > 0 && <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['all', ...blocks].map((block) => {
            const active = selectedBlock === block;
            return <button key={block} type="button" onClick={() => setSelectedBlock(block)} style={{ border: `1px solid ${active ? '#0F4C75' : 'var(--border)'}`, background: active ? '#0F4C75' : '#fff', color: active ? '#fff' : 'var(--text-muted)', borderRadius: '999px', padding: '9px 14px', fontWeight: 600, cursor: 'pointer' }}>{block === 'all' ? copy.allBlocks : block}</button>;
          })}
        </div>}
      </div>

      <div style={{ marginTop: '16px', display: 'flex', gap: '8px', padding: '5px', background: 'var(--bg-mid)', borderRadius: '14px', width: 'fit-content' }} role="tablist">
        {([
          { key: 'sipon' as const, label: copy.dailySipon, icon: FileText },
          { key: 'water' as const, label: copy.waterQuality, icon: Droplets },
        ]).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return <button key={tab.key} role="tab" aria-selected={active} onClick={() => setActiveTab(tab.key)} style={{ border: 0, borderRadius: '10px', padding: '10px 16px', display: 'flex', gap: '8px', alignItems: 'center', background: active ? '#0F4C75' : 'transparent', color: active ? '#fff' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}><Icon size={16} />{tab.label}</button>;
        })}
      </div>

      <div className="glass-card" style={{ marginTop: '12px', background: '#fff', border: '1px solid var(--border)', borderRadius: '18px', overflowX: 'auto' }}>
        {activeTab === 'sipon' ? <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1080px' }}>
          <thead><tr>{[copy.pond, copy.doc, copy.morningSiphoned, copy.morningMortal, copy.morningTotal, copy.eveningSiphoned, copy.eveningMortal, copy.eveningTotal, copy.dailyTotal, copy.cumulative, copy.estimatedPopulation, copy.density].map((label) => <th key={label} style={headerCell}>{label}</th>)}</tr></thead>
          <tbody>{report.siponRows.map((row) => <tr key={row.pondName}>
            <td style={{ ...cellStyle, fontWeight: 700 }}>{row.pondName}</td><td style={cellStyle}>{row.doc}</td>
            <td style={cellStyle}>{row.morningSiphoned}</td><td style={cellStyle}>{row.morningMortal}</td><td style={cellStyle}>{row.morningTotal}</td>
            <td style={cellStyle}>{row.eveningSiphoned}</td><td style={cellStyle}>{row.eveningMortal}</td><td style={cellStyle}>{row.eveningTotal}</td>
            <td style={{ ...cellStyle, fontWeight: 700 }}>{row.dailyTotal}</td><td style={cellStyle}>{row.cumulativeTotal}</td>
            <td style={cellStyle}>{Math.round(row.estimatedPopulation).toLocaleString()}</td><td style={cellStyle}>{Math.round(row.density).toLocaleString()}</td>
          </tr>)}</tbody>
        </table> : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '980px' }}>
          <thead><tr>{[copy.stockingDate, copy.pond, copy.doc, copy.recordedBy, copy.phMorning, `${copy.temperature} °C`, copy.waterAppearance, `${copy.waterDepth} cm`, `${copy.transparency} cm`, `${copy.salinity} ppt`, `${copy.alkalinity} ppm`].map((label) => <th key={label} style={headerCell}>{label}</th>)}</tr></thead>
          <tbody>{report.waterQualityRows.map((row) => <tr key={row.pondName}>
            <td style={cellStyle}>{row.stockingDate || '-'}</td><td style={{ ...cellStyle, fontWeight: 700 }}>{row.pondName}</td><td style={cellStyle}>{row.doc}</td><td style={cellStyle}>{row.recordedBy}</td>
            <td style={cellStyle}>{row.phMorning}</td><td style={cellStyle}>{row.temperature}</td><td style={cellStyle}>{row.waterAppearance}</td><td style={cellStyle}>{row.waterDepthCm}</td>
            <td style={cellStyle}>{row.transparency}</td><td style={cellStyle}>{row.salinity}</td><td style={cellStyle}>{row.alkalinity}</td>
          </tr>)}</tbody>
        </table>}
        {activeTab === 'water' && report.waterQualityRows.length === 0 && <div style={{ padding: '42px', textAlign: 'center', color: 'var(--text-muted)' }}>{copy.noWaterRecords}</div>}
      </div>
    </div>
  );
}
