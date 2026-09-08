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
import MineralLabResults from '@/components/MineralLabResults';
import { useFarmPermissions } from '@/hooks/useFarmPermissions';
import {
  filterEnterpriseRecordsForUser,
  type FarmBlock,
} from '../../../../../../shared/enterpriseBlocks';

type ReportTab = 'sipon' | 'water' | 'mineral';

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
  const hasPermission = useFarmPermissions();
  const canViewReports = hasPermission('viewReports');
  const canExportReports = hasPermission('exportReports');
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

  const headerCell = { ...cellStyle, background: '#0F4C75', fontWeight: 700, color: '#fff' } as React.CSSProperties;

  return (
    <div className="dashboard-page-relaxed authenticated-compact-page business-dashboard-page" style={{ paddingBottom: '40px' }}>
      <div className="glass-card" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '18px', padding: '20px 22px', display: 'flex', justifyContent: 'space-between', gap: '18px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{t.nav.reports || 'Reports'}</div>
          <h1 style={{ fontSize: '24px', lineHeight: '32px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>{copy.title}</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0' }}>{copy.subtitle}</p>
        </div>
        {activeTab !== 'mineral' && <button className="btn-primary" onClick={exportPdf} disabled={!canExportReports || exporting || filteredPonds.length === 0} style={{ minHeight: '44px', padding: '0 17px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          {exporting ? copy.exporting : copy.exportBoth}
        </button>}
      </div>

      <div className="glass-card" style={{ marginTop: '16px', background: '#fff', border: '1px solid var(--border)', borderRadius: '18px', padding: '16px', display: 'flex', alignItems: 'end', gap: '18px', flexWrap: 'wrap' }}>
        <label className="daily-operations-date-field">
          <span>{copy.reportDate}</span>
          <input type="date" max={today} value={reportDate} onChange={(event) => setReportDate(event.target.value)} className="daily-operations-date-input" />
        </label>
        {blocks.length > 0 && <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['all', ...blocks].map((block) => {
            const active = selectedBlock === block;
            return <button key={block} type="button" onClick={() => setSelectedBlock(block)} style={{ border: `1px solid ${active ? '#0F4C75' : 'var(--border)'}`, background: active ? '#0F4C75' : '#fff', color: active ? '#fff' : 'var(--text-muted)', borderRadius: '999px', padding: '9px 14px', fontWeight: 600, cursor: 'pointer' }}>{block === 'all' ? copy.allBlocks : block}</button>;
          })}
        </div>}
      </div>

      <div style={{ marginTop: '16px', display: 'flex', gap: '8px', padding: '5px', background: 'var(--bg-mid)', borderRadius: '14px', width: 'fit-content', maxWidth: '100%', flexWrap: 'wrap' }} role="tablist">
        {([
          { key: 'sipon' as const, label: copy.dailySipon, icon: FileText },
          { key: 'water' as const, label: copy.waterQuality, icon: Droplets },
          { key: 'mineral' as const, label: copy.mineralLabResults, icon: FileText },
        ]).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return <button key={tab.key} role="tab" aria-selected={active} onClick={() => setActiveTab(tab.key)} style={{ border: 0, borderRadius: '10px', padding: '10px 16px', display: 'flex', gap: '8px', alignItems: 'center', background: active ? '#0F4C75' : 'transparent', color: active ? '#fff' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}><Icon size={16} />{tab.label}</button>;
        })}
      </div>

      <div className="glass-card" style={{ marginTop: '12px', background: '#fff', border: '1px solid var(--border)', borderRadius: '18px', overflowX: 'auto' }}>
        {activeTab === 'mineral' ? (company?.id && <MineralLabResults companyId={company.id} ponds={accessiblePonds} reportDate={reportDate} selectedBlock={selectedBlock} canExport={canExportReports} />) : activeTab === 'sipon' ? <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1080px' }}>
          <thead><tr>{[copy.pond, copy.doc, copy.morningSiphoned, copy.morningMortal, copy.morningTotal, copy.eveningSiphoned, copy.eveningMortal, copy.eveningTotal, copy.dailyTotal, copy.cumulative, copy.estimatedPopulation, copy.density].map((label) => <th key={label} style={headerCell}>{label}</th>)}</tr></thead>
          <tbody>{report.siponRows.map((row) => <tr key={row.pondName}>
            <td style={{ ...cellStyle, fontWeight: 700 }}>{row.pondName}</td><td style={cellStyle}>{row.doc}</td>
            <td style={cellStyle}>{row.morningSiphoned}</td><td style={cellStyle}>{row.morningMortal}</td><td style={cellStyle}>{row.morningTotal}</td>
            <td style={cellStyle}>{row.eveningSiphoned}</td><td style={cellStyle}>{row.eveningMortal}</td><td style={cellStyle}>{row.eveningTotal}</td>
            <td style={{ ...cellStyle, fontWeight: 700 }}>{row.dailyTotal}</td><td style={cellStyle}>{row.cumulativeTotal}</td>
            <td style={cellStyle}>{Math.round(row.estimatedPopulation).toLocaleString()}</td><td style={cellStyle}>{Math.round(row.density).toLocaleString()}</td>
          </tr>)}</tbody>
        </table> : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1500px' }}>
          <thead><tr>{[copy.stockingDate, copy.pond, copy.doc, copy.recordedBy, copy.phMorning, copy.phEvening, copy.phRange, `${copy.temperature} °C`, copy.waterAppearance, `${copy.waterDepth} cm`, `${copy.transparency} cm`, `${copy.salinity} ppt`, `${copy.alkalinity} ppm`, copy.feedIndex, `${copy.dailyFeed} kg`, `${copy.cumulativeFeed} kg`, copy.targetAdg, copy.estimatedPopulation].map((label, index) => <th key={label} style={index >= 13 ? { ...headerCell, background: '#BBE1FA', color: '#0F4C75' } : headerCell}>{label}</th>)}</tr></thead>
          <tbody>{report.waterQualityRows.map((row) => <tr key={row.pondName}>
            <td style={cellStyle}>{row.stockingDate || '-'}</td><td style={{ ...cellStyle, fontWeight: 700 }}>{row.pondName}</td><td style={cellStyle}>{row.doc}</td><td style={cellStyle}>{row.recordedBy}</td>
            <td style={cellStyle}>{row.phMorning}</td><td style={cellStyle}>{row.phEvening}</td><td style={cellStyle}>{row.phRange}</td><td style={cellStyle}>{row.temperature}</td><td style={cellStyle}>{row.waterAppearance}</td><td style={cellStyle}>{row.waterDepthCm}</td>
            <td style={cellStyle}>{row.transparency}</td><td style={cellStyle}>{row.salinity}</td><td style={cellStyle}>{row.alkalinity}</td>
            <td style={cellStyle}>{row.feedIndex}</td><td style={cellStyle}>{row.dailyFeedKg}</td><td style={cellStyle}>{row.cumulativeFeedKg}</td><td style={cellStyle}>{row.targetAdg}</td>
            <td style={cellStyle}>{row.estimatedPopulation === null ? '-' : Math.round(row.estimatedPopulation).toLocaleString()}</td>
          </tr>)}</tbody>
        </table>}
        {activeTab === 'water' && report.waterQualityRows.length === 0 && <div style={{ padding: '42px', textAlign: 'center', color: 'var(--text-muted)' }}>{copy.noWaterRecords}</div>}
      </div>

      <style jsx>{`
        .daily-operations-date-field {
          width: min(100%, 220px);
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .daily-operations-date-field span {
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 600;
        }

        .daily-operations-date-input {
          width: 100%;
          height: 44px;
          padding: 0 12px;
          border: 1px solid var(--border);
          border-radius: 10px;
          outline: 0;
          background: #fff;
          color: var(--text-primary);
          font: inherit;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: border-color 160ms ease, box-shadow 160ms ease;
        }

        .daily-operations-date-input:hover {
          border-color: #9fb8ca;
        }

        .daily-operations-date-input:focus {
          border-color: #3282b8;
          box-shadow: 0 0 0 3px rgba(50, 130, 184, 0.12);
        }

        .daily-operations-date-input::-webkit-calendar-picker-indicator {
          cursor: pointer;
          opacity: 0.65;
        }
      `}</style>
    </div>
  );
}
