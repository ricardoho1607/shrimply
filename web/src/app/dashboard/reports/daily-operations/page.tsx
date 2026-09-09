"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Droplets, FileText, Loader2 } from 'lucide-react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { db } from '@/lib/firebase';
import { useCompanyBlocks, useCompanyHarvestRecords } from '@/hooks/useDashboardData';
import { downloadMobilePdf, loadMobilePdfBrandAssets } from '@/lib/mobilePdfExport';
import {
  buildDailyOperationsReport,
  generateDailyOperationsReportHTML,
  type DailyOperationsPondSource,
} from '../../../../../../shared/dailyOperationsReport';
import {
  dailyOperationsTranslations,
  type DailyOperationsLanguage,
} from '../../../../../../shared/dailyOperationsI18n';
import { pondExistsOnReportDate, type ReportHarvest } from '../../../../../../shared/reportSnapshots';
import { useFarmDateKey } from '@/hooks/useFarmDateKey';
import MineralLabResults, { type MineralLabResultsHandle } from '@/components/MineralLabResults';
import type { SavedMineralLabReport } from '@/lib/mineralLabResults';
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
  const today = useFarmDateKey(company?.timeZone);
  const [reportDate, setReportDate] = useState(today);
  const previousToday = useRef(today);
  const [activeTab, setActiveTab] = useState<ReportTab>('sipon');
  const [selectedBlock, setSelectedBlock] = useState('all');
  const [ponds, setPonds] = useState<DailyOperationsPondSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const hasPermission = useFarmPermissions();
  const canViewReports = hasPermission('viewReports');
  const canExportReports = hasPermission('exportReports');
  const { data: harvests, loading: harvestLoading, error: harvestError } = useCompanyHarvestRecords<ReportHarvest & { id: string }>();
  const { data: farmBlocks } = useCompanyBlocks<FarmBlock>('asc');

  useEffect(() => {
    setReportDate((current) => current === previousToday.current ? today : current);
    previousToday.current = today;
  }, [today]);

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
  const activePonds = useMemo(() => accessiblePonds.filter((pond) => pondExistsOnReportDate(pond, reportDate, company?.timeZone)), [accessiblePonds, reportDate, company?.timeZone]);
  const blocks = useMemo(() => Array.from(new Set(activePonds.map((pond) => pond.blockName).filter(Boolean) as string[])).sort(), [activePonds]);
  const filteredPonds = useMemo(
    () => selectedBlock === 'all' ? activePonds : activePonds.filter((pond) => pond.blockName === selectedBlock),
    [activePonds, selectedBlock],
  );
  const report = useMemo(() => buildDailyOperationsReport({
    companyName: company?.companyName || copy.myFarm,
    reportDate,
    generatedBy: user?.name || user?.email?.split('@')[0] || copy.shrimplyUser,
    ponds: filteredPonds, harvests,
    timeZone: company?.timeZone,
  }), [company?.companyName, company?.timeZone, copy.myFarm, copy.shrimplyUser, filteredPonds, harvests, reportDate, user?.email, user?.name]);

  const exportPdf = async () => {
    if (!canExportReports || exporting || harvestLoading || harvestError || report.warnings?.length) return;
    setExporting(true);
    try {
      const assets = await loadMobilePdfBrandAssets('landscape');
      const html = generateDailyOperationsReportHTML(report, assets, currentLanguage);
      await downloadMobilePdf({ html, filename: `Shrimply-Daily-Operations-${reportDate}.pdf`, orientation: 'landscape', preserveTemplateScale: true });
    } catch (error) {
      console.error('Failed to export daily operations PDF:', error);
      window.alert(copy.exportFailedMessage);
    } finally {
      setExporting(false);
    }
  };

  const mineralRef = useRef<MineralLabResultsHandle | null>(null);
  const [selectedMineralReport, setSelectedMineralReport] = useState<SavedMineralLabReport | null>(null);
  const [mineralExporting, setMineralExporting] = useState(false);
  const isAnyExporting = exporting || mineralExporting;

  const handleExport = async () => {
    if (activeTab === 'mineral') {
      if (!mineralRef.current) return;
      await mineralRef.current.exportPdf();
    } else {
      await exportPdf();
    }
  };

  if (!canViewReports) return <div style={{ textAlign: 'center', padding: '100px' }}>{copy.noPermission}</div>;
  if (loading) return <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}><Loader2 className="animate-spin" size={40} /></div>;

  const headerCell = { ...cellStyle, background: '#0F4C75', fontWeight: 700, color: '#fff' } as React.CSSProperties;

  return (
    <div className="dashboard-page-relaxed authenticated-compact-page business-dashboard-page" style={{ paddingBottom: '40px' }}>
      {harvestError && <p role="alert">Harvest history could not be loaded. Reload before exporting.</p>}
      {report.warnings?.map(message => <p role="alert" key={message}>{message}</p>)}
      <div className="glass-card" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '18px', padding: '20px 22px', display: 'flex', justifyContent: 'space-between', gap: '18px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{t.nav.reports || 'Reports'}</div>
          <h1 style={{ fontSize: '24px', lineHeight: '32px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>{copy.title}</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0' }}>{copy.subtitle}</p>
        </div>
        <button
          className="btn-primary"
          onClick={handleExport}
          disabled={!canExportReports || isAnyExporting || (activeTab === 'mineral' ? !selectedMineralReport : harvestLoading || Boolean(harvestError) || Boolean(report.warnings?.length) || filteredPonds.length === 0)}
          style={{ minHeight: '44px', padding: '0 17px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {isAnyExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          {isAnyExporting ? copy.exporting : (activeTab === 'mineral' ? copy.downloadMineralPdf : copy.exportBoth)}
        </button>
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
        {activeTab === 'mineral' ? (company?.id && (
          <MineralLabResults
            ref={mineralRef}
            companyId={company.id}
            ponds={accessiblePonds}
            reportDate={reportDate}
            selectedBlock={selectedBlock}
            canExport={canExportReports}
            onSelectedReportChange={setSelectedMineralReport}
            onExportingChange={setMineralExporting}
          />
        )) : activeTab === 'sipon' ? <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1080px' }}>
          <thead><tr>{[
            copy.pond || 'Pond',
            copy.doc || 'DOC',
            copy.morningSiphoned || 'AM Siphoned',
            copy.morningMortal || 'AM Mortal',
            copy.morningTotal || 'AM Total',
            copy.eveningSiphoned || 'PM Siphoned',
            copy.eveningMortal || 'PM Mortal',
            copy.eveningTotal || 'PM Total',
            copy.dailyTotal || 'Daily Total',
            copy.cumulative || 'Cumulative',
            copy.estimatedPopulation || 'Estimated Population',
            copy.density || 'Density',
          ].map((label, index) => <th key={label || index} style={headerCell}>{label}</th>)}</tr></thead>
          <tbody>{report.siponRows.map((row, rowIndex) => <tr key={row.pondName || rowIndex}>
            <td style={{ ...cellStyle, fontWeight: 700 }}>{row.pondName || 'N/A'}</td><td style={cellStyle}>{row.doc ?? 0}</td>
            <td style={cellStyle}>{row.morningSiphoned ?? 0}</td><td style={cellStyle}>{row.morningMortal ?? 0}</td><td style={cellStyle}>{row.morningTotal ?? 0}</td>
            <td style={cellStyle}>{row.eveningSiphoned ?? 0}</td><td style={cellStyle}>{row.eveningMortal ?? 0}</td><td style={cellStyle}>{row.eveningTotal ?? 0}</td>
            <td style={{ ...cellStyle, fontWeight: 700 }}>{row.dailyTotal ?? 0}</td><td style={cellStyle}>{row.cumulativeTotal ?? 0}</td>
            <td style={cellStyle}>{Number.isFinite(row.estimatedPopulation) ? Math.round(row.estimatedPopulation).toLocaleString() : 'N/A'}</td><td style={cellStyle}>{Number.isFinite(row.density) ? Math.round(row.density).toLocaleString() : 'N/A'}</td>
          </tr>)}</tbody>
        </table> : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1800px' }}>
          <thead><tr>{[
            copy.stockingDate, copy.pond, copy.doc, copy.recordedBy,
            copy.phMorning, copy.phEvening, copy.phRange,
            copy.temperatureMorning,
            copy.temperatureEvening,
            copy.waterAppearanceMorning,
            copy.waterAppearanceEvening,
            copy.waterDepthMorning,
            copy.waterDepthEvening,
            copy.transparencyMorning,
            copy.transparencyEvening,
            copy.salinity,
            copy.alkalinity, 'DO AM (mg/L)', 'DO PM (mg/L)', 'Ammonia (mg/L)',
            copy.feedIndex,
            copy.dailyFeed,
            copy.cumulativeFeed,
            copy.targetAdg,
            copy.estimatedPopulation,
          ].map((label, index) => <th key={label || index} style={index >= 17 ? { ...headerCell, background: '#BBE1FA', color: '#0F4C75' } : headerCell}>{label}</th>)}</tr></thead>
          <tbody>{report.waterQualityRows.map((row, rowIndex) => <tr key={row.pondName || rowIndex}>
            <td style={cellStyle}>{row.stockingDate || 'N/A'}</td><td style={{ ...cellStyle, fontWeight: 700 }}>{row.pondName || 'N/A'}</td><td style={cellStyle}>{row.doc ?? 0}</td><td style={cellStyle}>{row.recordedBy || 'N/A'}</td>
            <td style={cellStyle}>{row.phMorning || 'N/A'}</td><td style={cellStyle}>{row.phEvening || 'N/A'}</td><td style={cellStyle}>{row.phRange || 'N/A'}</td>
            <td style={cellStyle}>{row.temperatureMorning || 'N/A'}</td><td style={cellStyle}>{row.temperatureEvening || 'N/A'}</td>
            <td style={cellStyle}>{row.waterAppearanceMorning || 'N/A'}</td><td style={cellStyle}>{row.waterAppearanceEvening || 'N/A'}</td>
            <td style={cellStyle}>{row.waterDepthCmMorning || 'N/A'}</td><td style={cellStyle}>{row.waterDepthCmEvening || 'N/A'}</td>
            <td style={cellStyle}>{row.transparencyMorning || 'N/A'}</td><td style={cellStyle}>{row.transparencyEvening || 'N/A'}</td>
            <td style={cellStyle}>{row.salinity || 'N/A'}</td><td style={cellStyle}>{row.alkalinity || 'N/A'}</td><td style={cellStyle}>{row.doMorning}</td><td style={cellStyle}>{row.doEvening}</td><td style={cellStyle}>{row.ammonia}</td>
            <td style={cellStyle}>{row.feedIndex || 'N/A'}</td><td style={cellStyle}>{row.dailyFeedKg || 'N/A'}</td><td style={cellStyle}>{row.cumulativeFeedKg || 'N/A'}</td><td style={cellStyle}>{row.targetAdg || 'N/A'}</td>
            <td style={cellStyle}>{row.estimatedPopulation == null || !Number.isFinite(row.estimatedPopulation) ? 'N/A' : Math.round(row.estimatedPopulation).toLocaleString()}</td>
          </tr>)}</tbody>
        </table>}
        {activeTab === 'water' && report.waterQualityRows.length === 0 && <div style={{ padding: '42px', textAlign: 'center', color: 'var(--text-muted)' }}>{copy.noWaterRecords || 'No water-quality records were saved for this date.'}</div>}
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
