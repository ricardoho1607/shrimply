"use client";

import { showAppAlert } from '@/lib/appDialogs';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ChevronRight,
  FileDown,
  FileText,
  Loader2,
  Lock,
} from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  useCompanyCycles,
  useCompanyHarvestRecords,
  useCompanyPonds,
  useFinanceRecords,
  useInventoryFeeds,
} from '@/hooks/useDashboardData';
import {
  buildWebCycleReport,
  type CycleReportAsset,
  type CycleReportCycle,
  type CycleReportExpense,
  type CycleReportHarvestRecord,
  type CycleReportInventoryItem,
  type CycleReportPondSource,
} from '@/lib/cycleReport';
import { downloadMobilePdf, loadMobilePdfBrandAssets } from '@/lib/mobilePdfExport';
import { useFarmPermissions } from '@/hooks/useFarmPermissions';
import styles from './CycleReports.module.css';

import { getReportableCycles } from '../../../../../../shared/cycleReportAvailability';

type TabKey = 'overview' | 'ponds' | 'costs';

const formatNumber = (value: number, digits = 1) => value.toLocaleString(undefined, {
  maximumFractionDigits: digits,
});

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
    : 'N/A';
};

function CycleReportsContent() {
  const params = useSearchParams();
  const selectedCycleId = params.get('cycleId') || '';
  const { company } = useAuth();
  const { t, currentLanguage } = useLanguage();
  const { formatCurrency } = useCurrency();
  const { data: cycles, loading: cyclesLoading, error: cyclesError } = useCompanyCycles<CycleReportCycle>('desc');
  const { data: ponds, loading: pondsLoading, error: pondsError } = useCompanyPonds<CycleReportPondSource>('desc');
  const { data: harvestRecords, loading: harvestLoading, error: harvestError } = useCompanyHarvestRecords<CycleReportHarvestRecord>('desc');
  const { feeds, additives, loading: inventoryLoading, error: inventoryError } = useInventoryFeeds<
    CycleReportInventoryItem,
    CycleReportInventoryItem,
    CycleReportPondSource
  >();
  const { expenses, loading: financeLoading, error: financeError } = useFinanceRecords<CycleReportExpense, { id: string }>();
  const [assets, setAssets] = useState<CycleReportAsset[]>([]);
  const [assetsError, setAssetsError] = useState<Error | null>(null);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [pondChoice, setPondChoice] = useState<{ cycleId: string; ids: string[] } | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [exportLoading, setExportLoading] = useState(false);

  const hasPermission = useFarmPermissions();
  const hasFinanceAccess = hasPermission('viewReports')
    && hasPermission('viewFinance');
  const canExportReports = hasPermission('exportReports');

  useEffect(() => {
    if (!company?.id || !hasFinanceAccess) {
      queueMicrotask(() => {
        setAssets([]);
        setAssetsLoading(false);
      });
      return;
    }

    queueMicrotask(() => { setAssetsLoading(true); setAssetsError(null); });
    return onSnapshot(
      query(collection(db, 'assets'), where('companyId', '==', company.id)),
      (snapshot) => {
        setAssets(snapshot.docs.map((asset) => ({ id: asset.id, ...asset.data() } as CycleReportAsset)));
        setAssetsLoading(false);
      },
      (error) => {
        console.error('Failed to load cycle report assets:', error);
        setAssetsError(error);
        setAssets([]);
        setAssetsLoading(false);
      },
    );
  }, [company?.id, hasFinanceAccess]);

  const reportableCycles = useMemo(() => getReportableCycles(cycles, ponds)
    .sort((first, second) => (
      (new Date(second.closedAt || second.stockingEndDate || 0).getTime() || 0)
      - (new Date(first.closedAt || first.stockingEndDate || 0).getTime() || 0)
    )), [cycles, ponds]);
  const selectedCycle = cycles.find((cycle) => cycle.id === selectedCycleId);
  const cyclePondsForScope = useMemo(() => ponds.filter(pond => pond.cycleId === selectedCycleId), [ponds, selectedCycleId]);
  const defaultPondId = cyclePondsForScope.find(pond => pond.cycleStatus === 'ended')?.id || cyclePondsForScope[0]?.id;
  const selectedPondIds = useMemo(() => pondChoice?.cycleId === selectedCycleId
    ? pondChoice.ids.filter(id => cyclePondsForScope.some(pond => pond.id === id))
    : defaultPondId ? [defaultPondId] : [], [pondChoice, selectedCycleId, cyclePondsForScope, defaultPondId]);
  const selectedPonds = useMemo(() => cyclePondsForScope.filter(pond => !selectedPondIds || selectedPondIds.includes(pond.id)), [cyclePondsForScope, selectedPondIds]);
  const togglePond = (id: string) => {
    const current = selectedPonds.map(pond => pond.id);
    setPondChoice({ cycleId: selectedCycleId, ids: current.includes(id) ? current.filter(value => value !== id) : [...current, id] });
  };
  const report = useMemo(() => selectedCycle ? buildWebCycleReport({
    cycle: selectedCycle,
    pondIds: selectedPondIds,
    cycles,
    ponds,
    harvestRecords,
    feeds,
    additives,
    expenses,
    assets,
    timeZone: company?.timeZone,
  }) : null, [
    additives,
    assets,
    company?.timeZone,
    expenses,
    feeds,
    harvestRecords,
    ponds,
    cycles,
    selectedCycle,
    selectedPondIds,
  ]);
  const loading = cyclesLoading || pondsLoading || harvestLoading || inventoryLoading || financeLoading || assetsLoading;

  const sourceError = cyclesError || pondsError || harvestError || inventoryError || financeError || assetsError;
  const invalidCosts = report ? !Object.values(report.totals.costs).every(Number.isFinite) : false;

  const handleExport = async () => {
    if (!report || !report.ponds.length || !canExportReports || loading || sourceError || invalidCosts) return;
    setExportLoading(true);
    try {
      const [brandAssets, { generateCycleReportHtml }] = await Promise.all([
        loadMobilePdfBrandAssets('portrait'),
        import('@/lib/generated/mobileCycleReport'),
      ]);
      const html = generateCycleReportHtml({
        report: { ...report, pondScopeName: selectedPondIds === undefined ? undefined : report.ponds.map(pond => pond.pondName).join(', ') },
        companyName: company?.companyName || company?.id || 'Company',
        formatCurrency,
        language: currentLanguage,
      }, brandAssets.backgroundBase64, brandAssets.logoBase64);
      await downloadMobilePdf({
        html,
        filename: `Cycle_Report_${report.cycle.cycleName.replace(/[^a-z0-9]+/gi, '_').slice(0, 80)}${selectedPondIds !== undefined ? `_${report.ponds.length > 1 ? `${report.ponds.length}_Ponds` : report.ponds[0].pondName.replace(/[^a-z0-9]+/gi, '_').slice(0, 80)}` : ''}.pdf`,
        orientation: 'portrait', preserveTemplateScale: true, renderPagesSeparately: true,
      });
    } catch (error) {
      console.error('Cycle report export failed:', error);
      showAppAlert('Unable to download the report. Check your connection and try again.');
    } finally {
      setExportLoading(false);
    }
  };

  if (!hasFinanceAccess) {
    return (
      <div className={`${styles.restricted} authenticated-compact-page business-dashboard-page`}>
        <Lock size={42} color="#0F4C75" />
        <h2>{t.cycleReport.accessRestrictedTitle}</h2>
        <p>{t.cycleReport.accessRestrictedBody}</p>
      </div>
    );
  }

  if (!selectedCycleId) {
    return (
      <div className={`${styles.page} authenticated-compact-page business-dashboard-page`}>
        <header className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>{t.cycleReport.eyebrow}</p>
            <h1>{t.cycleReport.archiveTitle}</h1>
            <p className={styles.subtitle}>{t.cycleReport.archiveSubtitle}</p>
          </div>
        </header>
        {cyclesLoading || pondsLoading ? (
          <div className={styles.empty}><Loader2 className="animate-spin" /><p>{t.cycleReport.loading}</p></div>
        ) : reportableCycles.length === 0 ? (
          <div className={styles.empty}>
            <FileText size={42} color="#3282B8" />
            <h2>{t.cycleReport.emptyTitle}</h2>
            <p>{t.cycleReport.emptyBody}</p>
          </div>
        ) : (
          <div className={styles.archiveList}>
            {reportableCycles.map((cycle) => {
              const cyclePonds = ponds.filter((pond) => pond.cycleId === cycle.id);
              const harvestedKg = cyclePonds.reduce((sum, pond) => sum + Number(pond.totalHarvestedBiomass || 0), 0);
              return (
                <Link key={cycle.id} href={`/dashboard/reports/cycles?cycleId=${encodeURIComponent(cycle.id)}`} className={styles.archiveCard}>
                  <span className={styles.archiveIcon}><FileText size={21} /></span>
                  <span className={styles.archiveCopy}>
                    <strong>{cycle.cycleName}{cycle.status !== 'closed' ? ` · ${t.cycleReport.interimLabel}` : ''}</strong>
                    <span>{t.cycleReport.archiveMeta
                      .replace('{{date}}', (cycle.status === 'closed' ? formatDate(cycle.closedAt || cycle.stockingEndDate) : t.cycleReport.interimLabel))
                      .replace('{{pondCount}}', String(cyclePonds.length))
                      .replace('{{harvestedKg}}', formatNumber(harvestedKg))}</span>
                  </span>
                  <ChevronRight size={20} color="#6B8090" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (sourceError) return <div role="alert">A report data source could not be loaded. Reload before exporting.</div>;
  if (invalidCosts) return <div role="alert">Some recorded usage costs are missing or invalid. Correct the source costs before exporting.</div>;

  if (loading) {
    return <div className={`${styles.empty} authenticated-compact-page business-dashboard-page`}><Loader2 className="animate-spin" /><p>{t.cycleReport.loading}</p></div>;
  }

  if (!report) {
    return (
      <div className={`${styles.empty} authenticated-compact-page business-dashboard-page`}>
        <FileText size={42} color="#3282B8" />
        <h2>{t.cycleReport.notFoundTitle}</h2>
        <p>{t.cycleReport.notFoundBody}</p>
        <Link className={styles.backButton} href="/dashboard/reports/cycles">{t.cycleReport.backToArchive}</Link>
      </div>
    );
  }

  const profitClass = report.totals.grossProfit >= 0 ? styles.metricPositive : styles.metricNegative;

  return (
    <div className={`${styles.page} authenticated-compact-page business-dashboard-page`}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>{t.cycleReport.eyebrow}</p>
          <h1>{t.cycleReport.title}</h1>
          <p className={styles.subtitle}>{report.cycle.cycleName}</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/dashboard/reports/cycles" className={styles.backButton}>{t.cycleReport.backToArchive}</Link>
          <button type="button" className={styles.actionButton} onClick={handleExport} disabled={loading || Boolean(sourceError) || invalidCosts || exportLoading || !canExportReports || !report.ponds.length}>
            {exportLoading ? <Loader2 className="animate-spin" size={17} /> : <FileDown size={17} />} {t.cycleReport.exportPdf}
          </button>
        </div>
      </header>

      <section className={styles.scopePanel} aria-label={t.cycleReport.pondScope}>
        <div className={styles.scopeHeading}>
          <div><h2>{t.cycleReport.selectPonds}</h2><p>{t.cycleReport.pondsIncluded.replace('{{count}}', String(selectedPonds.length))}</p></div>
          <div className={styles.scopeActions}>
            <button type="button" onClick={() => setPondChoice({ cycleId: selectedCycleId, ids: cyclePondsForScope.map(pond => pond.id) })}>{t.cycleReport.allPonds}</button>
            <button type="button" disabled={!cyclePondsForScope.some(pond => pond.cycleStatus === 'ended')} onClick={() => setPondChoice({ cycleId: selectedCycleId, ids: cyclePondsForScope.filter(pond => pond.cycleStatus === 'ended').map(pond => pond.id) })}>{t.cycleReport.endedPonds}</button>
          </div>
        </div>
        <div className={styles.pondChoices}>
          {cyclePondsForScope.map(pond => <label key={pond.id} className={styles.pondChoice}>
            <input type="checkbox" checked={selectedPonds.some(item => item.id === pond.id)} onChange={() => togglePond(pond.id)} />
            <span><strong>{pond.pondName}</strong><small>{pond.cycleStatus === 'ended' ? t.cycleReport.statusEnded : t.cycleReport.statusActive}</small></span>
          </label>)}
        </div>
        {selectedPondIds !== undefined && <p className={styles.scopeNotice}>{t.cycleReport.unallocatedNotice}</p>}
        {!selectedPonds.length && <p role="status" className={styles.scopeNotice}>{t.cycleReport.selectPonds}</p>}
      </section>
      <section className={styles.summaryCard}>
        <div className={styles.summaryTop}>
          <div>
            <h2>{report.cycle.cycleName}</h2>
            <p>{formatDate(report.cycle.stockingStartDate || report.cycle.plannedStartDate)} - {formatDate(report.cycle.closedAt || report.cycle.stockingEndDate)}</p>
          </div>
          <span className={styles.status}>{report.cycle.status === 'closed' ? t.cycleReport.statusClosed : t.cycleReport.interimLabel}</span>
        </div>
        <div className={styles.summaryMeta}>
          <span>{t.cycleReport.pondsIncluded.replace('{{count}}', String(report.totals.pondCount))}</span>
          <span>{t.cycleReport.totalArea}: {formatNumber(report.totals.totalArea, 0)} m²</span>
        </div>
        {report.cycle.status !== 'closed' && <p className={styles.interimNotice}>{t.cycleReport.interimBody}</p>}
      </section>

      <div className={styles.tabs} role="group" aria-label={t.cycleReport.title}>
        {(['overview', 'ponds', 'costs'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={activeTab === tab ? styles.tabActive : ''}
            onClick={() => setActiveTab(tab)}
            aria-pressed={activeTab === tab}
          >
            {t.cycleReport.tabs[tab]}
          </button>
        ))}
      </div>

      {activeTab === 'overview' ? (
        <div className={styles.metricGrid}>
          <article className={styles.metric}><small>{t.cycleReport.harvested}</small><strong>{formatNumber(report.totals.harvestedBiomass)} kg</strong></article>
          <article className={styles.metric}><small>{t.cycleReport.revenue}</small><strong>{formatCurrency(report.totals.harvestRevenue)}</strong></article>
          <article className={styles.metric}><small>{t.cycleReport.cost}</small><strong>{formatCurrency(report.totals.costs.total)}</strong></article>
          <article className={`${styles.metric} ${profitClass}`}><small>{t.cycleReport.profit}</small><strong>{formatCurrency(report.totals.grossProfit)}</strong></article>
        </div>
      ) : null}

      {activeTab === 'ponds' ? (
        <section className={styles.section}>
          <h2>{t.cycleReport.pondPerformance}</h2>
          <div className={styles.pondList}>
            {report.ponds.map((pond) => (
              <article key={pond.id} className={styles.pondCard}>
                <div className={styles.pondHeader}><strong>{pond.pondName}</strong><span>{pond.supplier}</span></div>
                <div className={styles.pondStats}>
                  <span>DOC<b>{pond.doc}</b></span>
                  <span>{t.cycleReport.finalHarvestMbw}<b>{pond.hasFinalHarvest ? `${formatNumber(pond.finalHarvestMbw, 2)} g` : '—'}</b></span>
                  <span>{t.cycleReport.harvested}<b>{formatNumber(pond.harvestedBiomass)} kg</b></span>
                  <span>{t.cycleReport.actualSr}<b>{pond.hasFinalHarvest ? `${formatNumber(pond.actualSurvivalRate)}%` : '—'}</b></span>
                  <span>{t.cycleReport.actualFcr}<b>{pond.hasFinalHarvest && pond.actualFcr > 0 ? formatNumber(pond.actualFcr, 2) : '—'}</b></span>
                  <span>{t.cycleReport.feedUsed}<b>{formatNumber(pond.totalFeedUsed)} kg</b></span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === 'costs' ? (
        <>
          <section className={styles.section}>
            <h2>{t.cycleReport.costBreakdown}</h2>
            <p>Maintenance includes Finance entries only. Post each asset maintenance cost once in Finance.</p>
            <div className={styles.costList}>
              <div className={styles.costRow}><span>{t.cycleReport.feedCost}</span><b>{formatCurrency(report.totals.costs.feed)}</b></div>
              <div className={styles.costRow}><span>{t.cycleReport.additiveCost}</span><b>{formatCurrency(report.totals.costs.additives)}</b></div>
              <div className={styles.costRow}><span>{t.cycleReport.maintenanceCost}</span><b>{formatCurrency(report.totals.costs.maintenance)}</b></div>
              <div className={styles.costRow}><span>{t.cycleReport.manualExpenses}</span><b>{formatCurrency(report.totals.costs.manualExpenses)}</b></div>
              <div className={styles.costTotal}><span>{t.cycleReport.totalCost}</span><b>{formatCurrency(report.totals.costs.total)}</b></div>
            </div>
          </section>
          <div className={styles.metricGrid}>
            <article className={styles.metric}><small>{t.cycleReport.costPerKg}</small><strong>{formatCurrency(report.totals.costPerKg)}</strong></article>
            <article className={styles.metric}><small>{t.cycleReport.revenuePerKg}</small><strong>{formatCurrency(report.totals.revenuePerKg)}</strong></article>
            <article className={`${styles.metric} ${profitClass}`}><small>{t.cycleReport.profitPerKg}</small><strong>{formatCurrency(report.totals.profitPerKg)}</strong></article>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function CycleReportsPage() {
  return (
    <Suspense fallback={<div className={styles.empty}><Loader2 className="animate-spin" /></div>}>
      <CycleReportsContent />
    </Suspense>
  );
}
