import { AppAlert as Alert } from '../components/alerts/appAlert';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import { financeService, type Expense } from './services/financeService';
import { buildCycleReport, type CycleReport } from './services/cycleReportService';
import { exportCycleReportPDF } from './services/cycleReportExportService';
import { useAssetStore } from './store/assetStore';
import { useFeedAdditiveStore } from './store/feedAdditiveStore';
import { usePondStore } from './store/pondStore';
import { hasFarmPermission } from '../shared/permissions';

import { getReportableCycles } from '../shared/cycleReportAvailability';

type TabKey = 'overview' | 'ponds' | 'costs';

const tabs: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'overview', label: 'Overview', icon: 'analytics-outline' },
  { key: 'ponds', label: 'Ponds', icon: 'water-outline' },
  { key: 'costs', label: 'Costs', icon: 'receipt-outline' },
];

const toNumber = (value: number) => Number.isFinite(value) ? value : 0;
const formatCompact = (value: number, digits = 1) => toNumber(value).toLocaleString('id-ID', { maximumFractionDigits: digits });
const fillTemplate = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce((text, [key, value]) => text.replace(new RegExp(`{{${key}}}`, 'g'), String(value)), template);

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function CycleReportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cycleId } = useLocalSearchParams<{ cycleId?: string }>();
  const { user, company } = useAuth();
  const { formatCurrency } = useCurrency();
  const { t, currentLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingFinance, setLoadingFinance] = useState(true);
  const [financeError, setFinanceError] = useState(false);
  const inventoryLoading = useFeedAdditiveStore(state => state.loading);
  const assetsLoading = useAssetStore(state => state.loading);
  const assetsError = useAssetStore(state => state.error);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [expandedPondIds, setExpandedPondIds] = useState<Set<string>>(() => new Set());

  const {
    cycles,
    ponds,
    harvestRecords,
    calculatePondMetricsWithHarvest,
  } = usePondStore();
  const feeds = useFeedAdditiveStore((state) => state.feeds);
  const additives = useFeedAdditiveStore((state) => state.additives);
  const initializeFeedInventory = useFeedAdditiveStore((state) => state.initializeForCompany);
  const assets = useAssetStore((state) => state.assets);
  const initializeAssets = useAssetStore((state) => state.initializeForCompany);
  const cleanupAssets = useAssetStore((state) => state.cleanup);

  const hasFinanceAccess = hasFarmPermission(user, 'viewReports', company?.ownerId)
    && hasFarmPermission(user, 'viewFinance', company?.ownerId);
  const canExportReports = hasFarmPermission(user, 'exportReports', company?.ownerId);

  useEffect(() => {
    if (!company?.id || !hasFinanceAccess) return;

    const unsubscribeInventory = initializeFeedInventory(company.id);
    initializeAssets(company.id);
    setLoadingFinance(true);
    setFinanceError(false);
    financeService.getExpenses(company.id)
      .then(setExpenses)
      .catch((error) => {
        console.error('Failed to load cycle report expenses:', error);
        setFinanceError(true);
        setExpenses([]);
      })
      .finally(() => setLoadingFinance(false));

    return () => {
      try { unsubscribeInventory?.(); } catch {}
      cleanupAssets();
    };
  }, [cleanupAssets, company?.id, hasFinanceAccess, initializeAssets, initializeFeedInventory]);

  const reportableCycles = useMemo(() => {
    return getReportableCycles(cycles, ponds)
      .sort((a, b) =>
        new Date(b.closedAt || b.stockingEndDate || 0).getTime() -
        new Date(a.closedAt || a.stockingEndDate || 0).getTime()
      );
  }, [cycles, ponds]);

  const resolvedCycleId = useMemo(() => {
    if (cycleId) return Array.isArray(cycleId) ? cycleId[0] : cycleId;
    return undefined;
  }, [cycleId]);

  const report: CycleReport | null = useMemo(() => {
    if (!resolvedCycleId) return null;
    return buildCycleReport({
      cycleId: resolvedCycleId,
      cycles,
      ponds,
      harvestRecords,
      feeds,
      additives,
      assets,
      expenses,
      calculatePondMetricsWithHarvest,
    });
  }, [
    resolvedCycleId,
    cycles,
    ponds,
    harvestRecords,
    feeds,
    additives,
    assets,
    expenses,
    calculatePondMetricsWithHarvest,
  ]);

  const tabLabels: Record<TabKey, string> = {
    overview: t.cycleReport.tabs.overview,
    ponds: t.cycleReport.tabs.ponds,
    costs: t.cycleReport.tabs.costs,
  };

  const statusText = (status: string) => {
    if (status === 'closed') return t.cycleReport.status.closed;
    if (status === 'ended') return t.cycleReport.status.ended;
    if (status === 'active') return t.cycleReport.status.active;
    return status.toUpperCase();
  };

  const handleExportPdf = async () => {
    if (!report || !canExportReports || exportingPdf || loadingFinance || inventoryLoading || assetsLoading) return;
    if (financeError || assetsError || !Object.values(report.totals.costs).every(Number.isFinite)) { Alert.alert('Incomplete report data', 'Reload report sources or correct missing costs before exporting.'); return; }
    try {
      setExportingPdf(true);
      await exportCycleReportPDF({
        report,
        companyName: company?.companyName || 'Shrimply Farm',
        formatCurrency,
        language: currentLanguage,
      });
    } catch (error) {
      console.error('Failed to export Cycle Report PDF:', error);
      Alert.alert(t.cycleReport.pdfExportFailedTitle, t.cycleReport.pdfExportFailedBody);
    } finally {
      setExportingPdf(false);
    }
  };

  const togglePond = (pondId: string) => {
    setExpandedPondIds((current) => {
      const next = new Set(current);
      if (next.has(pondId)) next.delete(pondId);
      else next.add(pondId);
      return next;
    });
  };

  const MetricCard = ({
    label,
    value,
    subtext,
    tone = 'default',
  }: {
    label: string;
    value: string;
    subtext?: string;
    tone?: 'default' | 'good' | 'danger';
  }) => (
    <View style={[styles.metricCard, tone === 'good' && styles.metricGood, tone === 'danger' && styles.metricDanger]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, tone === 'danger' && styles.dangerText]} numberOfLines={1}>{value}</Text>
      {!!subtext && <Text style={styles.metricSubtext}>{subtext}</Text>}
    </View>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const renderOverview = () => {
    if (!report) return null;
    const profitTone = report.totals.grossProfit >= 0 ? 'good' : 'danger';
    return (
      <>
        {report.cycle.status !== 'closed' && <Text style={styles.centerText}>{t.cycleReport.interimBody}</Text>}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryCopy}>
              <Text style={styles.eyebrow}>{t.cycleReport.summary.title}</Text>
              <Text style={styles.summaryTitle}>{report.cycle.cycleName}</Text>
              <Text style={styles.summarySub}>
                {formatDate(report.cycle.stockingStartDate || report.cycle.plannedStartDate)} - {formatDate(report.cycle.closedAt || report.cycle.stockingEndDate)}
              </Text>
            </View>
            <View style={[styles.statusBadge, report.cycle.status !== 'closed' && styles.statusOpen]}>
              <Text style={styles.statusText}>{report.cycle.status === 'closed' ? statusText(report.cycle.status) : t.cycleReport.interimLabel}</Text>
            </View>
          </View>
          <View style={styles.summaryStats}>
            <Text style={styles.summaryStat}>{fillTemplate(t.cycleReport.summary.pondsIncluded, { count: report.totals.pondCount })}</Text>
            <Text style={styles.summaryStat}>{t.cycleReport.metrics.totalArea}: {formatCompact(report.totals.totalArea, 0)} m²</Text>
          </View>
        </View>

        <View style={styles.metricGrid}>
          <MetricCard label={t.cycleReport.metrics.harvested} value={`${formatCompact(report.totals.harvestedBiomass)} kg`} subtext={t.cycleReport.metrics.recordedBiomass} />
          <MetricCard label={t.cycleReport.metrics.revenue} value={formatCurrency(report.totals.harvestRevenue)} subtext={t.cycleReport.metrics.harvestSales} />
          <MetricCard label={t.cycleReport.metrics.cost} value={formatCurrency(report.totals.costs.total)} subtext={t.cycleReport.metrics.cycleCosts} />
          <MetricCard label={t.cycleReport.metrics.profit} value={formatCurrency(report.totals.grossProfit)} subtext={t.cycleReport.metrics.grossEstimate} tone={profitTone} />
        </View>

      </>
    );
  };

  const renderPonds = () => {
    if (!report) return null;
    const harvestedPonds = report.ponds.filter((pond) => !pond.isNonHarvestClosure);
    const nonHarvestPonds = report.ponds.filter((pond) => pond.isNonHarvestClosure);
    const closureReasonText = (reason?: string) => {
      if (reason === 'disease') return t.cycleReport.closureReasons.disease;
      if (reason === 'reset') return t.cycleReport.closureReasons.reset;
      return t.cycleReport.closureReasons.other;
    };

    return (
      <>
        <Section title={t.cycleReport.sections.harvestedPonds}>
          {harvestedPonds.map((pond) => {
            const isExpanded = expandedPondIds.has(pond.id);
            return (
              <View key={pond.id} style={styles.detailCard}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`${pond.pondName}. ${isExpanded ? t.home.hideDetails : t.home.moreDetails}`}
                  accessibilityState={{ expanded: isExpanded }}
                  onPress={() => togglePond(pond.id)}
                  style={[styles.detailHeader, isExpanded && styles.detailHeaderExpanded]}
                >
                  <View style={styles.detailHeaderCopy}>
                    <Text style={styles.detailTitle}>{pond.pondName}</Text>
                    <Text style={styles.detailSub}>{pond.supplier}</Text>
                  </View>
                  <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color="#315f57" />
                </TouchableOpacity>
                {isExpanded && (
                  <View style={styles.detailGrid}>
                    <Detail label="DOC" value={pond.doc.toString()} />
                    <Detail label={t.cycleReport.metrics.productivityPerHa} value={pond.area > 0 ? `${formatCompact(pond.productivityKgPerHa)} kg/ha` : '—'} />
                    <Detail label={t.cycleReport.metrics.finalHarvestMbw} value={pond.hasFinalHarvest ? `${formatCompact(pond.finalHarvestMbw, 2)} g` : '—'} />
                    <Detail label={t.cycleReport.metrics.averageCycleMbw} value={pond.averageHarvestMbw > 0 ? `${formatCompact(pond.averageHarvestMbw, 2)} g` : '—'} />
                    <Detail label={t.cycleReport.metrics.harvested} value={`${formatCompact(pond.harvestedBiomass)} kg`} />
                    <Detail label={t.cycleReport.metrics.harvestedPopulation} value={formatCompact(pond.harvestedPopulation, 0)} />
                    <Detail label={t.cycleReport.metrics.actualSr} value={pond.hasFinalHarvest ? `${formatCompact(pond.actualSurvivalRate)}%` : '—'} />
                    <Detail label={t.cycleReport.metrics.actualFcr} value={pond.hasFinalHarvest && pond.actualFcr > 0 ? formatCompact(pond.actualFcr, 2) : '—'} />
                  </View>
                )}
              </View>
            );
          })}
        </Section>

        {nonHarvestPonds.length > 0 && (
          <Section title={t.cycleReport.sections.nonHarvestClosures}>
            {nonHarvestPonds.map((pond) => {
              const isExpanded = expandedPondIds.has(pond.id);
              return (
                <View key={pond.id} style={styles.detailCard}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`${pond.pondName}. ${isExpanded ? t.home.hideDetails : t.home.moreDetails}`}
                    accessibilityState={{ expanded: isExpanded }}
                    onPress={() => togglePond(pond.id)}
                    style={[styles.detailHeader, isExpanded && styles.detailHeaderExpanded]}
                  >
                    <View style={styles.detailHeaderCopy}>
                      <Text style={styles.detailTitle}>{pond.pondName}</Text>
                      <Text style={styles.detailSub}>{pond.supplier}</Text>
                    </View>
                    <View style={styles.detailHeaderActions}>
                      <View style={styles.smallBadge}>
                        <Text style={styles.smallBadgeText}>{closureReasonText(pond.closureReason)}</Text>
                      </View>
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color="#315f57" />
                    </View>
                  </TouchableOpacity>
                  {isExpanded && (
                    <View style={styles.detailGrid}>
                      <Detail label="DOC" value={pond.doc.toString()} />
                      <Detail label={t.cycleReport.metrics.productivityPerHa} value={pond.area > 0 ? `${formatCompact(pond.productivityKgPerHa)} kg/ha` : '—'} />
                      <Detail label={t.cycleReport.metrics.lastSamplingMbw} value={pond.latestMbw > 0 ? `${formatCompact(pond.latestMbw, 2)} g` : '—'} />
                      <Detail label={t.cycleReport.metrics.averageCycleMbw} value={pond.averageHarvestMbw > 0 ? `${formatCompact(pond.averageHarvestMbw, 2)} g` : '—'} />
                      <Detail label={t.cycleReport.metrics.harvested} value={`${formatCompact(pond.harvestedBiomass)} kg`} />
                      <Detail label={t.cycleReport.metrics.feedUsed} value={`${formatCompact(pond.totalFeedUsed)} kg`} />
                    </View>
                  )}
                </View>
              );
            })}
          </Section>
        )}
      </>
    );
  };

  const Detail = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );

  const CostRow = ({ label, value, total }: { label: string; value: number; total: number }) => {
    const percentage = total > 0 ? Math.min(100, (value / total) * 100) : 0;
    return (
      <View style={styles.costRow}>
        <View style={styles.costHeader}>
          <Text style={styles.costLabel}>{label}</Text>
          <Text style={styles.costValue}>{formatCurrency(value)}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${percentage}%` }]} />
        </View>
      </View>
    );
  };

  const renderCosts = () => {
    if (!report) return null;
    const total = report.totals.costs.total;
    return (
      <>
        <Section title={t.cycleReport.sections.costBreakdown}>
          <Text>Maintenance includes Finance entries only. Post each asset maintenance cost once in Finance.</Text>
          <View style={styles.costCard}>
            <CostRow label={t.cycleReport.costs.feed} value={report.totals.costs.feed} total={total} />
            <CostRow label={t.cycleReport.costs.additives} value={report.totals.costs.additives} total={total} />
            <CostRow label={t.cycleReport.costs.maintenance} value={report.totals.costs.maintenance} total={total} />
            <CostRow label={t.cycleReport.costs.manualExpenses} value={report.totals.costs.manualExpenses} total={total} />
            <View style={styles.costTotalRow}>
              <Text style={styles.costTotalLabel}>{t.cycleReport.metrics.totalCost}</Text>
              <Text style={styles.costTotalValue}>{formatCurrency(total)}</Text>
            </View>
          </View>
        </Section>
        <Section title={t.cycleReport.sections.unitEconomics}>
          <View style={styles.unitCard}>
            <Detail label={t.cycleReport.metrics.costPerKg} value={formatCurrency(report.totals.costPerKg)} />
            <Detail label={t.cycleReport.metrics.revenuePerKg} value={formatCurrency(report.totals.revenuePerKg)} />
            <Detail label={t.cycleReport.metrics.profitPerKg} value={formatCurrency(report.totals.profitPerKg)} />
          </View>
        </Section>
      </>
    );
  };

  const renderContent = () => {
    if (!hasFinanceAccess) {
      return (
        <View style={styles.centerState}>
          <Ionicons name="lock-closed-outline" size={52} color="#315f57" />
          <Text style={styles.centerTitle}>{t.cycleReport.accessRestrictedTitle}</Text>
          <Text style={styles.centerText}>{t.cycleReport.accessRestrictedBody}</Text>
        </View>
      );
    }

    if (!resolvedCycleId) {
      return (
        <Section title={t.cycleReport.archiveTitle}>
          {reportableCycles.length === 0 ? (
            <View style={styles.centerState}>
              <Ionicons name="file-tray-outline" size={52} color="#315f57" />
              <Text style={styles.centerTitle}>{t.cycleReport.emptyTitle}</Text>
              <Text style={styles.centerText}>{t.cycleReport.emptyBody}</Text>
            </View>
          ) : reportableCycles.map((cycle) => {
            const cyclePonds = ponds.filter((pond) => pond.cycleId === cycle.id);
            const harvestedKg = cyclePonds.reduce((sum, pond) => sum + toNumber(pond.totalHarvestedBiomass || 0), 0);
            return (
              <TouchableOpacity
                key={cycle.id}
                style={styles.reportListCard}
                onPress={() => router.push({ pathname: '/cycle-report', params: { cycleId: cycle.id } })}
              >
                <View style={styles.reportListIcon}>
                  <Ionicons name="document-text-outline" size={22} color="#315f57" />
                </View>
                <View style={styles.reportListBody}>
                  <Text style={styles.reportListTitle}>{cycle.cycleName}{cycle.status !== 'closed' ? ` · ${t.cycleReport.interimLabel}` : ''}</Text>
                  <Text style={styles.reportListMeta}>
                    {fillTemplate(t.cycleReport.archiveMeta, {
                      date: cycle.status === 'closed' ? formatDate(cycle.closedAt || cycle.stockingEndDate) : t.cycleReport.interimLabel,
                      pondCount: cyclePonds.length,
                      harvestedKg: formatCompact(harvestedKg),
                    })}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6b8aa0" />
              </TouchableOpacity>
            );
          })}
        </Section>
      );
    }

    if (loadingFinance || inventoryLoading || assetsLoading) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator color="#0d2137" />
          <Text style={styles.centerText}>{t.cycleReport.loading}</Text>
        </View>
      );
    }

    if (!report) {
      return (
        <View style={styles.centerState}>
          <Ionicons name="document-text-outline" size={52} color="#315f57" />
          <Text style={styles.centerTitle}>{t.cycleReport.notFoundTitle}</Text>
          <Text style={styles.centerText}>{t.cycleReport.notFoundBody}</Text>
        </View>
      );
    }

    if (activeTab === 'ponds') return renderPonds();
    if (activeTab === 'costs') return renderCosts();
    return renderOverview();
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="#dce8f2" />
      <View style={styles.container}>
        <SafeAreaView style={styles.topSafeArea} edges={['top', 'left', 'right']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#0d2137" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>{resolvedCycleId ? t.cycleReport.title : t.cycleReport.archiveTitle}</Text>
              <Text style={styles.headerSub}>{report?.cycle.cycleName || t.cycleReport.archiveSubtitle}</Text>
            </View>
            {hasFinanceAccess && resolvedCycleId ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t.cycleReport.exportPdf}
                disabled={!report || !canExportReports || exportingPdf || loadingFinance || inventoryLoading || assetsLoading || financeError || Boolean(assetsError)}
                onPress={handleExportPdf}
                style={[styles.exportPdfButton, (!report || exportingPdf) && styles.exportPdfButtonDisabled]}
              >
                {exportingPdf
                  ? <ActivityIndicator size="small" color="#0F4C75" />
                  : <Ionicons name="document-outline" size={16} color="#0F4C75" />}
                <Text style={styles.exportPdfText} numberOfLines={1}>{exportingPdf ? t.cycleReport.exportingPdf : t.cycleReport.exportPdf}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.backButton} />
            )}
          </View>
        </SafeAreaView>

        {hasFinanceAccess && resolvedCycleId && (
          <View style={styles.tabBar}>
            {tabs.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tabButton, active && styles.tabButtonActive]}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Ionicons name={tab.icon} size={16} color={active ? '#FFFFFF' : '#315f57'} />
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{tabLabels[tab.key]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 28 }}
          showsVerticalScrollIndicator={false}
        >
          {renderContent()}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8fc' },
  topSafeArea: { backgroundColor: '#dce8f2' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#dce8f2',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dce8f2',
  },
  backButton: { width: 42, padding: 8 },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  headerTitle: { color: '#0d2137', fontSize: 19, fontWeight: '900' },
  headerSub: { color: '#315f57', fontSize: 12, fontWeight: '700', marginTop: 2 },
  exportPdfButton: {
    minWidth: 96,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3282B8',
    backgroundColor: '#F8FBFE',
  },
  exportPdfButtonDisabled: { opacity: 0.45 },
  exportPdfText: { color: '#0F4C75', fontSize: 11, fontWeight: '900' },
  tabBar: {
    flexDirection: 'row',
    gap: 6,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    backgroundColor: '#dce8f2',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#e8f2f9',
  },
  tabButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    gap: 2,
  },
  tabButtonActive: { backgroundColor: '#0d2137' },
  tabText: { color: '#315f57', fontSize: 10, fontWeight: '800' },
  tabTextActive: { color: '#FFFFFF' },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e8f2f9',
    marginBottom: 12,
  },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  summaryCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: '#315f57', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.4 },
  summaryTitle: { color: '#0d2137', fontSize: 20, fontWeight: '900', marginTop: 4 },
  summarySub: { color: '#6b8aa0', fontSize: 12, fontWeight: '700', marginTop: 4 },
  statusBadge: { backgroundColor: '#315f57', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start', flexShrink: 0 },
  statusOpen: { backgroundColor: '#6b8aa0' },
  statusText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  summaryStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  summaryStat: { color: '#0d2137', backgroundColor: '#f4f8fc', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, fontWeight: '800' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  metricCard: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#e8f2f9' },
  metricGood: { borderColor: '#315f57' },
  metricDanger: { borderColor: '#e74c3c' },
  metricLabel: { color: '#6b8aa0', fontSize: 11, fontWeight: '800' },
  metricValue: { color: '#0d2137', fontSize: 16, fontWeight: '900', marginTop: 4 },
  dangerText: { color: '#e74c3c' },
  metricSubtext: { color: '#315f57', fontSize: 10, fontWeight: '700', marginTop: 3 },
  section: { marginBottom: 16 },
  sectionTitle: { color: '#0d2137', fontSize: 17, fontWeight: '900', marginBottom: 10 },
  pondRow: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e8f2f9', marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  pondRowMain: { flex: 1 },
  pondName: { color: '#0d2137', fontSize: 15, fontWeight: '900' },
  pondMeta: { color: '#6b8aa0', fontSize: 11, fontWeight: '700', marginTop: 3 },
  pondRowNumbers: { alignItems: 'flex-end' },
  pondNumber: { color: '#0d2137', fontSize: 14, fontWeight: '900' },
  pondSmall: { color: '#315f57', fontSize: 11, fontWeight: '700', marginTop: 3 },
  detailCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e8f2f9', marginBottom: 10 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  detailHeaderExpanded: { marginBottom: 12 },
  detailHeaderCopy: { flex: 1, minWidth: 0 },
  detailHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  detailTitle: { color: '#0d2137', fontSize: 16, fontWeight: '900' },
  detailSub: { color: '#6b8aa0', fontSize: 12, fontWeight: '700', marginTop: 2 },
  smallBadge: { backgroundColor: '#dce8f2', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  endedBadge: { backgroundColor: '#eef3f7', borderWidth: 1, borderColor: '#dce8f2' },
  smallBadgeText: { color: '#0d2137', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detailItem: { width: '48%', backgroundColor: '#f4f8fc', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#e8f2f9' },
  detailLabel: { color: '#6b8aa0', fontSize: 11, fontWeight: '800' },
  detailValue: { color: '#0d2137', fontSize: 13, fontWeight: '900', marginTop: 4 },
  costCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e8f2f9' },
  costRow: { marginBottom: 14 },
  costHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, gap: 10 },
  costLabel: { color: '#0d2137', fontSize: 13, fontWeight: '800' },
  costValue: { color: '#315f57', fontSize: 13, fontWeight: '900' },
  progressTrack: { height: 8, backgroundColor: '#e8f2f9', borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: '#315f57', borderRadius: 999 },
  costTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e8f2f9', paddingTop: 12 },
  costTotalLabel: { color: '#0d2137', fontSize: 14, fontWeight: '900' },
  costTotalValue: { color: '#0d2137', fontSize: 15, fontWeight: '900' },
  unitCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e8f2f9', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reportListCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e8f2f9', marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  reportListIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#dce8f2', alignItems: 'center', justifyContent: 'center' },
  reportListBody: { flex: 1 },
  reportListTitle: { color: '#0d2137', fontSize: 15, fontWeight: '900' },
  reportListMeta: { color: '#6b8aa0', fontSize: 12, fontWeight: '700', marginTop: 4 },
  noteRow: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e8f2f9', marginBottom: 8, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  noteText: { color: '#0d2137', fontSize: 13, fontWeight: '700', lineHeight: 18, flex: 1 },
  emptyNote: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e8f2f9', flexDirection: 'row', alignItems: 'center', gap: 10 },
  emptyNoteText: { color: '#0d2137', fontSize: 13, fontWeight: '700', flex: 1 },
  centerState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 90, paddingHorizontal: 20 },
  centerTitle: { color: '#0d2137', fontSize: 18, fontWeight: '900', marginTop: 14, textAlign: 'center' },
  centerText: { color: '#315f57', fontSize: 13, fontWeight: '700', lineHeight: 19, marginTop: 8, textAlign: 'center' },
});
