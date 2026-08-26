"use client";

import React, { Suspense, useEffect, useMemo, useState } from 'react';
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
import { generateCycleReportHtml } from '@/lib/generated/mobileCycleReport';
import { downloadMobilePdf, loadMobilePdfBrandAssets } from '@/lib/mobilePdfExport';
import { hasFarmPermission } from '../../../../../../shared/permissions';
import styles from './CycleReports.module.css';

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
  const { user, company } = useAuth();
  const { t, currentLanguage } = useLanguage();
  const { formatCurrency } = useCurrency();
  const { data: cycles, loading: cyclesLoading } = useCompanyCycles<CycleReportCycle>('desc');
  const { data: ponds, loading: pondsLoading } = useCompanyPonds<CycleReportPondSource>('desc');
  const { data: harvestRecords, loading: harvestLoading } = useCompanyHarvestRecords<CycleReportHarvestRecord>('desc');
  const { feeds, additives, loading: inventoryLoading } = useInventoryFeeds<
    CycleReportInventoryItem,
    CycleReportInventoryItem,
    CycleReportPondSource
  >();
  const { expenses, loading: financeLoading } = useFinanceRecords<CycleReportExpense, { id: string }>();
  const [assets, setAssets] = useState<CycleReportAsset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [exportLoading, setExportLoading] = useState(false);

  const hasFinanceAccess = hasFarmPermission(user, 'viewReports', company?.ownerId)
    && hasFarmPermission(user, 'viewFinance', company?.ownerId);
  const canExportReports = hasFarmPermission(user, 'exportReports', company?.ownerId);

  useEffect(() => {
    if (!company?.id || !hasFinanceAccess) {
      queueMicrotask(() => {
        setAssets([]);
        setAssetsLoading(false);
      });
      return;
    }

    queueMicrotask(() => setAssetsLoading(true));
    return onSnapshot(
      query(collection(db, 'assets'), where('companyId', '==', company.id)),
      (snapshot) => {
        setAssets(snapshot.docs.map((asset) => ({ id: asset.id, ...asset.data() } as CycleReportAsset)));
        setAssetsLoading(false);
      },
      (error) => {
        console.error('Failed to load cycle report assets:', error);
        setAssets([]);
        setAssetsLoading(false);
      },
    );
  }, [company?.id, hasFinanceAccess]);

  const closedCycles = useMemo(() => [...cycles]
    .filter((cycle) => cycle.status === 'closed')
    .sort((first, second) => (
      (new Date(second.closedAt || second.stockingEndDate || 0).getTime() || 0)
      - (new Date(first.closedAt || first.stockingEndDate || 0).getTime() || 0)
    )), [cycles]);
  const selectedCycle = cycles.find((cycle) => cycle.id === selectedCycleId);
  const report = useMemo(() => selectedCycle ? buildWebCycleReport({
    cycle: selectedCycle,
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
  ]);
  const loading = cyclesLoading || pondsLoading || harvestLoading || inventoryLoading || financeLoading || assetsLoading;

  const handleExport = async () => {
    if (!report || !canExportReports) return;
    setExportLoading(true);
    try {
      const brandAssets = await loadMobilePdfBrandAssets('portrait');
      const html = generateCycleReportHtml({
        report,
        companyName: company?.companyName || company?.id || 'Company',
        formatCurrency,
        language: currentLanguage,
      }, brandAssets.backgroundBase64, brandAssets.logoBase64);
      await downloadMobilePdf({
        html,
        filename: `Cycle_Report_${report.cycle.cycleName.replace(/[^a-z0-9]+/gi, '_')}.pdf`,
        orientation: 'portrait',
      });
    } catch (error) {
      console.error('Cycle report export failed:', error);
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
        {cyclesLoading ? (
          <div className={styles.empty}><Loader2 className="animate-spin" /><p>{t.cycleReport.loading}</p></div>
        ) : closedCycles.length === 0 ? (
          <div className={styles.empty}>
            <FileText size={42} color="#3282B8" />
            <h2>{t.cycleReport.emptyTitle}</h2>
            <p>{t.cycleReport.emptyBody}</p>
          </div>
        ) : (
          <div className={styles.archiveList}>
            {closedCycles.map((cycle) => {
              const cyclePonds = ponds.filter((pond) => pond.cycleId === cycle.id);
              const harvestedKg = cyclePonds.reduce((sum, pond) => sum + Number(pond.totalHarvestedBiomass || 0), 0);
              return (
                <Link key={cycle.id} href={`/dashboard/reports/cycles?cycleId=${encodeURIComponent(cycle.id)}`} className={styles.archiveCard}>
                  <span className={styles.archiveIcon}><FileText size={21} /></span>
                  <span className={styles.archiveCopy}>
                    <strong>{cycle.cycleName}</strong>
                    <span>{t.cycleReport.archiveMeta
                      .replace('{{date}}', formatDate(cycle.closedAt || cycle.stockingEndDate))
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

  if (loading && !report) {
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
          <button type="button" className={styles.actionButton} onClick={handleExport} disabled={exportLoading || !canExportReports}>
            {exportLoading ? <Loader2 className="animate-spin" size={17} /> : <FileDown size={17} />} {t.cycleReport.exportPdf}
          </button>
        </div>
      </header>

      <section className={styles.summaryCard}>
        <div className={styles.summaryTop}>
          <div>
            <h2>{report.cycle.cycleName}</h2>
            <p>{formatDate(report.cycle.stockingStartDate || report.cycle.plannedStartDate)} - {formatDate(report.cycle.closedAt || report.cycle.stockingEndDate)}</p>
          </div>
          <span className={styles.status}>{t.cycleReport.statusClosed}</span>
        </div>
        <div className={styles.summaryMeta}>
          <span>{t.cycleReport.pondsIncluded.replace('{{count}}', String(report.totals.pondCount))}</span>
          <span>{t.cycleReport.totalArea}: {formatNumber(report.totals.totalArea, 0)} m²</span>
        </div>
      </section>

      <nav className={styles.tabs} aria-label={t.cycleReport.title}>
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
      </nav>

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
