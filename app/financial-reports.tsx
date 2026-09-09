import { transactionOpeningPosition } from '../shared/reportingIntegrity';
import { buildProfitLoss, buildConfirmedCashFlow } from '../shared/financeReports';
import { monetaryValue } from '../shared/financeIntegrity';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TouchableWithoutFeedback, Modal, Alert, ActivityIndicator, TextInput, Platform, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import financeService, { Expense } from './services/financeService';
import revenueService, { Revenue } from './services/revenueService';
import { exportFinancialPDF, prepareFinancialData } from './services/pdfExportService';
import { exportCashFlowPDF, prepareCashFlowData } from './services/cashFlowExportService';
import { exportCOGSPDF, prepareCOGSData } from './services/cogsExportService';
import { exportTransactionHistoryPDF, prepareTransactionHistoryData } from './services/transactionHistoryExportService';
import { normalizeCategory } from './utils/categoryNormalizer';
import { usePondStore } from './store/pondStore';
import { useFeedAdditiveStore } from './store/feedAdditiveStore';
import {
  getFarmDateKey,
  getFarmPeriodDateKeys,
  isDateKeyInRange,
  normalizeFarmDateKey,
} from '../shared/farmDate';
import AppDatePicker from './components/forms/AppDatePicker';
import CycleSelector from './components/forms/CycleSelector';
import { getOpenFinanceCycles } from '../shared/financeCycleAllocation';
import { hasFarmPermission } from '../shared/permissions';
import { buildCogsReport } from '../shared/cogsReport';

type ReportTypeId = 'profit-loss' | 'cogs' | 'cash-flow' | 'transaction-history';
type ReportType = { id: ReportTypeId; name: string; icon: string; color: string; description: string };
const PERIOD_OPTIONS = ['Today', 'This Week', 'This Month', 'This Year', 'Custom', 'All Time'] as const;

export default function FinancialReportsPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, company } = useAuth();
  const { t, currentLanguage } = useLanguage();
  const { formatCurrency: displayCurrency, currencyConfig } = useCurrency();
  const formatCurrency = (value: number) => Number.isFinite(value) ? displayCurrency(value) : 'N/A';
  const { cycles, ponds, harvestRecords } = usePondStore();
  const activeCycles = useMemo(() => getOpenFinanceCycles(cycles), [cycles]);
  const feedAdditiveStore = useFeedAdditiveStore();

  const REPORT_TYPES: ReportType[] = [
    { id: 'profit-loss', name: t.financialReports?.profitLoss || 'Profit & Loss', icon: 'trending-up', color: '#3498DB', description: t.financialReports?.profitLossStatement || 'Income statement' },
    { id: 'cogs', name: t.financialReports?.cogs || 'COGS Report', icon: 'calculator', color: '#27AE60', description: t.financialReports?.cogsStatement || 'Cost of production' },
    { id: 'cash-flow', name: t.financialReports?.cashFlow || 'Cash Flow', icon: 'cash', color: '#9B59B6', description: t.financialReports?.cashFlowStatement || 'Liquidity analysis' },
    { id: 'transaction-history', name: t.financialReports?.transactionHistory || 'Transaction History', icon: 'receipt', color: '#0F4C75', description: t.financialReports?.transactionHistoryDescription || 'Money in and money out' },
  ];

  const getTranslatedPeriod = (period: typeof PERIOD_OPTIONS[number]) => {
    const translations: Record<string, string> = {
      'Today': t.financialReports?.today || 'Today',
      'This Week': t.financialReports?.thisWeek || 'This Week',
      'This Month': t.financialReports?.thisMonth || 'This Month',
      'This Year': t.financialReports?.thisYear || 'This Year',
      'Custom': t.financialReports?.custom || 'Custom',
      'All Time': t.financialReports?.allTime || 'All Time',
    };
    return translations[period] || period;
  };

  const [selectedReportType, setSelectedReportType] = useState<ReportTypeId>('profit-loss');
  const [reportSelectorOpen, setReportSelectorOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<typeof PERIOD_OPTIONS[number]>('This Month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [cycleScope, setCycleScope] = useState('all');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [openingInventory, setOpeningInventory] = useState(0);
  const [closingInventory, setClosingInventory] = useState(0);
  const selectedReport = REPORT_TYPES.find((report) => report.id === selectedReportType) || REPORT_TYPES[0];

  const hasFinanceAccess = hasFarmPermission(user, 'viewFinance', company?.ownerId);
  const canExportReports = hasFarmPermission(user, 'exportReports', company?.ownerId);

  useEffect(() => {
    if (!hasFinanceAccess) {
      Alert.alert(t.financialReports?.accessDenied || 'Access Denied', t.financialReports?.noPermissionReports || 'You do not have permission to view financial reports.');
      router.back();
      return;
    }
    if (!company?.id) {
      Alert.alert('Error', t.financialReports?.noCompanyFound || 'No company found. Please set up your company first.');
      router.back();
      return;
    }
    loadData();
    feedAdditiveStore.setCurrentCompanyId(company.id, company.timeZone);
    const stopInventory = feedAdditiveStore.initializeForCompany(company.id, company.timeZone);
    const onLedgerError = (error: Error) => console.error('Finance listener:', error);
    const stopExpenses = financeService.subscribe(company.id, setExpenses, onLedgerError, true);
    const stopRevenues = revenueService.subscribe(company.id, setRevenues, onLedgerError, true);
    return () => { stopExpenses(); stopRevenues(); stopInventory?.(); };
  }, [company?.id]);

  const loadData = async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const [fetchedExpenses, fetchedRevenues] = await Promise.all([
        financeService.getExpenses(company.id, true),
        revenueService.getRevenues(company.id, true),
      ]);
      setExpenses(fetchedExpenses);
      setRevenues(fetchedRevenues);
    } catch (error: any) {
      console.error('Failed to load financial report data:', error);
      Alert.alert('Error', 'Failed to load financial report data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    const today = getFarmDateKey(now, company?.timeZone);
    let startDateKey: string | null;
    let endDateKey = today;

    if (selectedPeriod === 'Custom') {
      startDateKey = normalizeFarmDateKey(customStartDate, company?.timeZone) || `${today.slice(0, 7)}-01`;
      endDateKey = normalizeFarmDateKey(customEndDate, company?.timeZone) || today;
    } else if (selectedPeriod === 'All Time') {
      const allDateKeys = [...expenses, ...revenues]
        .map(item => normalizeFarmDateKey(item.date, company?.timeZone))
        .filter((dateKey): dateKey is string => Boolean(dateKey))
        .sort();
      startDateKey = allDateKeys[0] || today;
    } else {
      const period = selectedPeriod === 'Today'
        ? 'today'
        : selectedPeriod === 'This Week'
          ? 'week'
          : selectedPeriod === 'This Month'
            ? 'month'
            : 'year';
      ({ startDateKey, endDateKey } = getFarmPeriodDateKeys(period, now, company?.timeZone));
    }

    const effectiveStartKey = startDateKey || today;
    return {
      startDateKey,
      endDateKey,
      startDate: new Date(`${effectiveStartKey}T00:00:00.000Z`),
      endDate: new Date(`${endDateKey}T23:59:59.999Z`),
    };
  };

  const getFilteredData = () => {
    const { startDateKey, endDateKey } = getDateRange();
    const scopeFinance = <T extends { cycleId?: string }>(items: T[]) =>
      cycleScope !== 'all'
        ? items.filter((item) => item.cycleId === cycleScope)
        : items;

    return {
      filteredExpenses: scopeFinance(expenses).filter(e => !e.voided && isDateKeyInRange(e.date, startDateKey, endDateKey, company?.timeZone)),
      filteredRevenues: scopeFinance(revenues).filter(r => !r.voided && isDateKeyInRange(r.date, startDateKey, endDateKey, company?.timeZone))
    };
  };

  const { filteredExpenses, filteredRevenues } = getFilteredData();

  const calculateTotals = (data: Expense[] | Revenue[], service: typeof financeService | typeof revenueService) => ({
    total: data.reduce((sum, row) => sum + (monetaryValue(row.amount) ?? 0), 0),
    byCategory: service.getCategoryBreakdown(data),
    top: service === financeService ? (service as typeof financeService).getTopExpenses(data as Expense[], 3) : (service as typeof revenueService).getTopRevenues(data as Revenue[], 3)
  });

  const expenseTotals = calculateTotals(filteredExpenses, financeService);
  const revenueTotals = calculateTotals(filteredRevenues, revenueService);
  const profit = revenueTotals.total - expenseTotals.total;


  const { startDateKey: cogsStartDateKey, endDateKey: cogsEndDateKey } = getDateRange();
  const cogsInput = {
    ponds, expenses, revenues, harvests: harvestRecords,
    feedUsage: feedAdditiveStore.feeds.flatMap(feed => feed.usageHistory || []),
    additiveUsage: feedAdditiveStore.additives.flatMap(additive => additive.usageHistory || []),
    cycleScope, scopeLabel: cycles.find(cycle => cycle.id === cycleScope)?.cycleName || 'All cycles',
    startDateKey: cogsStartDateKey, endDateKey: cogsEndDateKey, timeZone: company?.timeZone, normalizeCategory,
  };
  const cogs = buildCogsReport(cogsInput);
  const pl = buildProfitLoss(cogsInput, openingInventory, closingInventory);
  const { purchases, directLabor, directMaterials } = cogs;
  const totalCOGSInventory = openingInventory + cogs.totalProductionCost - closingInventory;
  const cogsGrossProfit = cogs.revenue - totalCOGSInventory;

  const { totalCOGS: totalCOGSPL, cogsBreakdown: cogsCategoryBreakdown, grossProfit: grossProfitPL, totalOPEX, opexBreakdown: opexCategoryBreakdown, operatingIncome, totalOtherExpenses, otherExpenseBreakdown, netProfit: netProfitPL } = pl;
  const registerOpeningBalance = transactionOpeningPosition({ expenses, revenues, cycleScope, startDateKey: cogsStartDateKey, timeZone: company?.timeZone });
  const cash = buildConfirmedCashFlow({ expenses, revenues, startDateKey: cogsStartDateKey, endDateKey: cogsEndDateKey, timeZone: company?.timeZone, normalizeCategory });
  const { operating, investing, financing, openingBalance } = cash;
  const netOperatingCash = operating.cashFromSales + operating.cashFromCustomers - operating.paymentToSuppliers - operating.paymentForExpenses + operating.otherOperatingCash;
  const netInvestingCash = investing.saleOfAssets + investing.saleOfInvestments - investing.purchaseOfAssets - investing.purchaseOfInvestments;
  const netFinancingCash = financing.loansReceived + financing.capitalContributed - financing.loanRepayments - financing.dividendsPaid - financing.ownerWithdrawals;
  const netCashFlow = netOperatingCash + netInvestingCash + netFinancingCash;
  const closingBalance = openingBalance + netCashFlow;

  const formatDateRange = () => {
    const { startDate, endDate } = getDateRange();
    return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const withSelectedCurrency = (label: string) => (
    `${label.replace(/\s*\([^)]*\)\s*$/, '')} (${currencyConfig.symbol})`
  );

  const handleGenerateReport = async () => {
    if (!canExportReports) return;
    if ((['profit-loss', 'cogs'].includes(selectedReportType) && pl.missingAmounts) || (selectedReportType === 'transaction-history' && !Number.isFinite(registerOpeningBalance)) || [...expenses, ...revenues].some(row => monetaryValue(row.amount) === null) || (selectedReportType === 'cash-flow' && cash.invalidCount)) { Alert.alert('Incomplete finance data', 'Correct missing or invalid amounts and costs before exporting.'); return; }
    setGenerating(true);
    try {
      const { startDate, endDate } = getDateRange();
      if (selectedReportType === 'profit-loss') {
        await exportFinancialPDF(prepareFinancialData(selectedPeriod, startDate.toISOString(), endDate.toISOString(),
          company?.companyName || company?.id || 'Company', 
          pl.totalRevenue, pl.revenueBreakdown,
          totalCOGSPL, cogsCategoryBreakdown, grossProfitPL, 
          totalOPEX, opexCategoryBreakdown, operatingIncome, 
          totalOtherExpenses, otherExpenseBreakdown, netProfitPL,
          currencyConfig.code, currencyConfig.symbol), currentLanguage);
      } else if (selectedReportType === 'cash-flow') {
        await exportCashFlowPDF({ ...prepareCashFlowData(selectedPeriod, startDate.toISOString(), endDate.toISOString(),
          company?.companyName || company?.id || 'Company', openingBalance, operating, investing, financing,
          currencyConfig.code, currencyConfig.symbol), basisNote: `Company-wide confirmed payments only. ${cash.unconfirmedCount} entries have an unconfirmed balance. Opening cash is derived from recorded payments, not a reconciled bank balance.` }, currentLanguage);
      } else if (selectedReportType === 'cogs') {
        await exportCOGSPDF(prepareCOGSData(selectedPeriod, cogsStartDateKey || startDate.toISOString(), cogsEndDateKey,
          company?.companyName || company?.id || 'Company', openingInventory, purchases, directLabor,
          directMaterials, closingInventory, cogs.revenue, cogs.categoryBreakdown,
          currencyConfig.code, currencyConfig.symbol, cogs.details), currentLanguage);
      } else if (selectedReportType === 'transaction-history') {
        await exportTransactionHistoryPDF(prepareTransactionHistoryData(
          selectedPeriod,
          startDate.toISOString(),
          endDate.toISOString(),
          company?.companyName || company?.id || 'Company',
          registerOpeningBalance,
          filteredExpenses,
          filteredRevenues,
          currencyConfig.code,
          currencyConfig.symbol,
        ), currentLanguage);
      }
      Alert.alert('Success', t.financialReports?.reportGenerated || 'Financial report generated and ready to share!');
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', t.financialReports?.generateError || 'Failed to generate financial report');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498DB" />
        <Text style={styles.loadingText}>{t.financialReports?.loadingFinancialData || 'Loading financial data...'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#2C3E50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.financialReports?.title || 'Financial Reports'}</Text>
          <View style={styles.headerButton} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.financialReports?.reportType || 'Report Type'}</Text>
          <TouchableOpacity
            style={styles.reportSelectorTrigger}
            onPress={() => setReportSelectorOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`${t.financialReports?.reportType || 'Report Type'}: ${selectedReport.name}`}
          >
            <View style={[styles.reportSelectorIcon, { backgroundColor: `${selectedReport.color}18` }]}>
              <Ionicons name={selectedReport.icon as any} size={22} color={selectedReport.color} />
            </View>
            <View style={styles.reportSelectorCopy}>
              <Text style={styles.reportSelectorValue}>{selectedReport.name}</Text>
              <Text style={styles.reportSelectorDescription}>{selectedReport.description}</Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#0F4C75" />
          </TouchableOpacity>
        </View>

        <Modal visible={reportSelectorOpen} transparent animationType="fade" onRequestClose={() => setReportSelectorOpen(false)}>
          <TouchableWithoutFeedback onPress={() => setReportSelectorOpen(false)}>
            <View style={styles.reportSelectorBackdrop}>
              <TouchableWithoutFeedback>
                <View style={styles.reportSelectorSheet}>
                  <View style={styles.reportSelectorHeader}>
                    <View>
                      <Text style={styles.reportSelectorEyebrow}>{t.financialReports?.reportType || 'Report Type'}</Text>
                      <Text style={styles.reportSelectorTitle}>{t.financialReports?.selectReport || 'Choose a report'}</Text>
                    </View>
                    <TouchableOpacity style={styles.reportSelectorClose} onPress={() => setReportSelectorOpen(false)} accessibilityLabel={t.actions.cancel}>
                      <Ionicons name="close" size={21} color="#334B5C" />
                    </TouchableOpacity>
                  </View>
                  {REPORT_TYPES.map((type) => {
                    const selected = type.id === selectedReportType;
                    return (
                      <TouchableOpacity
                        key={type.id}
                        style={[styles.reportSelectorOption, selected && styles.reportSelectorOptionActive]}
                        onPress={() => {
                          setSelectedReportType(type.id);
                          setReportSelectorOpen(false);
                        }}
                      >
                        <View style={[styles.reportSelectorIcon, { backgroundColor: `${type.color}18` }]}>
                          <Ionicons name={type.icon as any} size={21} color={type.color} />
                        </View>
                        <View style={styles.reportSelectorCopy}>
                          <Text style={styles.reportSelectorValue}>{type.name}</Text>
                          <Text style={styles.reportSelectorDescription}>{type.description}</Text>
                        </View>
                        {selected ? <Ionicons name="checkmark-circle" size={21} color="#0F4C75" /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.financialReports?.reportPeriod || 'Report Period'}</Text>
          <View style={styles.periodContainer}>
            {PERIOD_OPTIONS.map(period => (
              <TouchableOpacity key={period}
                style={[styles.periodTab, selectedPeriod === period && styles.periodTabActive]}
                onPress={() => setSelectedPeriod(period)}>
                <Text style={[styles.periodTabText, selectedPeriod === period && styles.periodTabTextActive]}>
                  {getTranslatedPeriod(period)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.cycleSelectorContainer} pointerEvents={selectedReportType === 'cash-flow' ? 'none' : 'auto'}>
            <CycleSelector
              value={selectedReportType === 'cash-flow' ? 'all' : cycleScope}
              options={activeCycles}
              onChange={setCycleScope}
              includeAllHistory
              placeholder={t.financeCycle.selectCycle}
              allHistoryLabel={t.financeCycle.allHistory}
              sheetEyebrow={t.financeCycle.cycle}
              sheetTitle={t.financeCycle.selectCycle}
            />
          </View>

          {selectedPeriod === 'Custom' && (
            <View style={styles.customDateContainer}>
              <View style={styles.dateInputGroup}>
                <AppDatePicker
                  label={t.financialReports?.startDate || 'Start Date'}
                  value={customStartDate}
                  placeholder={t.financialReports?.datePlaceholder || 'Select date'}
                  maximumDate={new Date()}
                  onChange={(date) => setCustomStartDate(getFarmDateKey(date, company?.timeZone))}
                  cancelLabel={t.actions.cancel}
                  confirmLabel={t.actions.confirm}
                />
              </View>
              <View style={styles.dateInputGroup}>
                <AppDatePicker
                  label={t.financialReports?.endDate || 'End Date'}
                  value={customEndDate}
                  placeholder={t.financialReports?.datePlaceholder || 'Select date'}
                  maximumDate={new Date()}
                  onChange={(date) => setCustomEndDate(getFarmDateKey(date, company?.timeZone))}
                  cancelLabel={t.actions.cancel}
                  confirmLabel={t.actions.confirm}
                />
              </View>
            </View>
          )}
        </View>

        {selectedReportType === 'cash-flow' && <Text style={styles.previewSubtitle}>Company-wide confirmed cash movements only. Record payments in Finance. {cash.unconfirmedCount} entries have an unconfirmed balance.</Text>}
        {(selectedReportType === 'cogs' || selectedReportType === 'profit-loss') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.financialReports?.inventoryValues || 'Inventory Values'}</Text>
            <Text style={styles.previewSubtitle}>Feed and additives use consumed costs. Enter only production carry-forward, not unused stock. Zero means no adjustment entered.</Text>
            <View style={styles.inventoryInputs}>
              <View style={styles.dateInputGroup}>
                <Text style={styles.dateLabel}>{withSelectedCurrency('Opening production costs (WIP)')}</Text>
                <TextInput style={styles.dateInput} placeholder="0" placeholderTextColor="#6b8aa0" keyboardType="numeric"
                  value={openingInventory.toString()} onChangeText={(text) => setOpeningInventory(Number(text.replace(/[^0-9]/g, '')) || 0)} />
              </View>
              <View style={styles.dateInputGroup}>
                <Text style={styles.dateLabel}>{withSelectedCurrency('Closing production costs (WIP)')}</Text>
                <TextInput style={styles.dateInput} placeholder="0" placeholderTextColor="#6b8aa0" keyboardType="numeric"
                  value={closingInventory.toString()} onChangeText={(text) => setClosingInventory(Number(text.replace(/[^0-9]/g, '')) || 0)} />
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.financialReports?.reportPreview || 'Report Preview'}</Text>
          
          {selectedReportType === 'profit-loss' ? (
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Ionicons name="document-text" size={24} color="#3498DB" />
                <View style={styles.previewHeaderText}>
                  <Text style={styles.previewTitle}>{t.financialReports?.profitLossStatement || 'Profit & Loss Statement'}</Text>
                  <Text style={styles.previewSubtitle}>{formatDateRange()}</Text>
                </View>
              </View>
              <View style={styles.previewDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t.financialReports?.totalRevenue || 'Total Revenue'}</Text>
                <Text style={[styles.summaryValue, styles.revenueColor]}>{formatCurrency(pl.totalRevenue)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t.financialReports?.totalExpenses || 'Total Expenses'}</Text>
                <Text style={[styles.summaryValue, styles.expenseColor]}>{formatCurrency(pl.totalCOGS + pl.totalOPEX + pl.totalOtherExpenses)}</Text>
              </View>
              <View style={styles.previewDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabelBold}>{netProfitPL >= 0 ? t.financialReports?.netProfit || 'Net Profit' : t.financialReports?.netLoss || 'Net Loss'}</Text>
                <Text style={[styles.summaryValueBold, netProfitPL >= 0 ? styles.revenueColor : styles.expenseColor]}>{formatCurrency(Math.abs(netProfitPL))}</Text>
              </View>
              <View style={styles.breakdownPreview}>
                <Text style={styles.breakdownTitle}>{t.financialReports?.revenueBreakdown || 'Revenue Breakdown'}</Text>
                {Object.entries(pl.revenueBreakdown).slice(0, 3).map(([category, amount]) => (
                  <View key={category} style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>{category}</Text>
                    <Text style={styles.breakdownValue}>{formatCurrency(amount)}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.breakdownPreview}>
                <Text style={styles.breakdownTitle}>{t.financialReports?.expenseBreakdown || 'Expense Breakdown'}</Text>
                {Object.entries(pl.expenseBreakdown).slice(0, 3).map(([category, amount]) => (
                  <View key={category} style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>{category}</Text>
                    <Text style={styles.breakdownValue}>{formatCurrency(amount)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : selectedReportType === 'cogs' ? (
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Ionicons name="calculator" size={24} color="#27AE60" />
                <View style={styles.previewHeaderText}>
                  <Text style={styles.previewTitle}>{t.financialReports?.cogsStatement || 'Cost of Goods Sold Statement'}</Text>
                  <Text style={styles.previewSubtitle}>{formatDateRange()}</Text>
                </View>
              </View>
              <View style={styles.previewDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{'Opening production costs (WIP)'}</Text>
                <Text style={styles.summaryValue}>{formatCurrency(openingInventory)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{'Feed consumed and direct feed expenses'}</Text>
                <Text style={styles.summaryValue}>{formatCurrency(purchases)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t.financialReports?.directLabor || 'Add: Direct Labor'}</Text>
                <Text style={styles.summaryValue}>{formatCurrency(directLabor)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t.financialReports?.directMaterials || 'Add: Direct Materials'}</Text>
                <Text style={styles.summaryValue}>{formatCurrency(directMaterials)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{'Less: Closing production costs (WIP)'}</Text>
                <Text style={styles.summaryValue}>({formatCurrency(closingInventory)})</Text>
              </View>
              <View style={styles.previewDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabelBold}>{t.financialReports?.totalCOGS || 'Total COGS'}</Text>
                <Text style={[styles.summaryValueBold, styles.expenseColor]}>{formatCurrency(totalCOGSInventory)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Harvested shrimp (kg)</Text>
                <Text style={styles.summaryValue}>{cogs.details.harvestedKg.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabelBold}>COGS per kg</Text>
                <Text style={styles.summaryValueBold}>{cogs.details.harvestedKg > 0 ? `${formatCurrency(totalCOGSInventory / cogs.details.harvestedKg)} / kg` : 'N/A'}</Text>
              </View>
              <View style={styles.previewDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t.financialReports?.revenue || 'Revenue'}</Text>
                <Text style={styles.summaryValue}>{formatCurrency(cogs.revenue)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t.financialReports?.lessCOGS || 'Less: COGS'}</Text>
                <Text style={styles.summaryValue}>({formatCurrency(totalCOGSInventory)})</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabelBold}>{cogsGrossProfit >= 0 ? (t.financialReports?.grossProfit || 'Gross Profit') : 'Gross Loss'}</Text>
                <Text style={[styles.summaryValueBold, cogsGrossProfit >= 0 ? styles.revenueColor : styles.expenseColor]}>{formatCurrency(Math.abs(cogsGrossProfit))}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t.financialReports?.grossProfitMargin || 'Gross Profit Margin'}</Text>
                <Text style={[styles.summaryValue, cogsGrossProfit >= 0 ? styles.revenueColor : styles.expenseColor]}>{cogs.revenue > 0 ? `${((cogsGrossProfit / cogs.revenue) * 100).toFixed(2)}%` : 'N/A'}</Text>
              </View>
              {Object.keys(cogs.categoryBreakdown).length > 0 && (
                <View style={styles.breakdownPreview}>
                  <Text style={styles.breakdownTitle}>{t.financialReports?.cogsBreakdown || 'COGS Breakdown'}</Text>
                  {Object.entries(cogs.categoryBreakdown).map(([category, amount]) => (
                    <View key={category} style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>{category}</Text>
                      <Text style={styles.breakdownValue}>{formatCurrency(amount)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : selectedReportType === 'transaction-history' ? (
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Ionicons name="receipt" size={24} color="#0F4C75" />
                <View style={styles.previewHeaderText}>
                  <Text style={styles.previewTitle}>{t.financialReports?.transactionRegister || 'Transaction Register'}</Text>
                  <Text style={styles.previewSubtitle}>{formatDateRange()}</Text>
                </View>
              </View>
              <View style={styles.previewDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t.financialReports?.transactions || 'Transactions'}</Text>
                <Text style={styles.summaryValue}>{filteredExpenses.length + filteredRevenues.length}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t.financialReports?.moneyIn || 'Money In'}</Text>
                <Text style={[styles.summaryValue, styles.revenueColor]}>{formatCurrency(revenueTotals.total)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t.financialReports?.moneyOut || 'Money Out'}</Text>
                <Text style={[styles.summaryValue, styles.expenseColor]}>{formatCurrency(expenseTotals.total)}</Text>
              </View>
              <View style={styles.previewDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabelBold}>{t.financialReports?.netMovement || 'Net Movement'}</Text>
                <Text style={[styles.summaryValueBold, profit >= 0 ? styles.revenueColor : styles.expenseColor]}>{formatCurrency(profit)}</Text>
              </View>
              <Text style={styles.transactionPreviewNote}>{t.financialReports?.transactionPdfNote || 'The PDF lists every recorded income and expense with a running net position.'}</Text>
            </View>
          ) : (
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Ionicons name="cash" size={24} color="#9B59B6" />
                <View style={styles.previewHeaderText}>
                  <Text style={styles.previewTitle}>{t.financialReports?.cashFlowStatement || 'Cash Flow Statement'}</Text>
                  <Text style={styles.previewSubtitle}>{formatDateRange()}</Text>
                </View>
              </View>
              <View style={styles.previewDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t.financialReports?.openingBalance || 'Opening Balance'}</Text>
                <Text style={styles.summaryValue}>{formatCurrency(openingBalance)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t.financialReports?.operatingCashFlow || 'Operating Cash Flow'}</Text>
                <Text style={[styles.summaryValue, netOperatingCash >= 0 ? styles.revenueColor : styles.expenseColor]}>{formatCurrency(Math.abs(netOperatingCash))}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t.financialReports?.investingCashFlow || 'Investing Cash Flow'}</Text>
                <Text style={[styles.summaryValue, netInvestingCash >= 0 ? styles.revenueColor : styles.expenseColor]}>{formatCurrency(Math.abs(netInvestingCash))}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t.financialReports?.financingCashFlow || 'Financing Cash Flow'}</Text>
                <Text style={[styles.summaryValue, netFinancingCash >= 0 ? styles.revenueColor : styles.expenseColor]}>{formatCurrency(Math.abs(netFinancingCash))}</Text>
              </View>
              <View style={styles.previewDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabelBold}>{t.financialReports?.netCashFlow || 'Net Cash Flow'}</Text>
                <Text style={[styles.summaryValueBold, netCashFlow >= 0 ? styles.revenueColor : styles.expenseColor]}>{formatCurrency(Math.abs(netCashFlow))}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabelBold}>{t.financialReports?.closingBalance || 'Closing Balance'}</Text>
                <Text style={[styles.summaryValueBold, closingBalance >= 0 ? styles.revenueColor : styles.expenseColor]}>{formatCurrency(Math.abs(closingBalance))}</Text>
              </View>
              <View style={styles.breakdownPreview}>
                <Text style={styles.breakdownTitle}>{t.financialReports?.operatingActivities || 'Operating Activities'}</Text>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>{t.financialReports?.paymentToSuppliers || 'Payment to Suppliers'}</Text>
                  <Text style={styles.breakdownValue}>({formatCurrency(operating.paymentToSuppliers)})</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>{t.financialReports?.operatingExpenses || 'Operating Expenses'}</Text>
                  <Text style={styles.breakdownValue}>({formatCurrency(operating.paymentForExpenses)})</Text>
                </View>
              </View>
              {(investing.purchaseOfAssets > 0 || investing.saleOfAssets > 0) && (
                <View style={styles.breakdownPreview}>
                  <Text style={styles.breakdownTitle}>{t.financialReports?.investingActivities || 'Investing Activities'}</Text>
                  {investing.purchaseOfAssets > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>{t.financialReports?.purchaseOfAssets || 'Purchase of Assets'}</Text>
                      <Text style={styles.breakdownValue}>({formatCurrency(investing.purchaseOfAssets)})</Text>
                    </View>
                  )}
                  {investing.saleOfAssets > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>{t.financialReports?.saleOfAssets || 'Sale of Assets'}</Text>
                      <Text style={styles.breakdownValue}>{formatCurrency(investing.saleOfAssets)}</Text>
                    </View>
                  )}
                </View>
              )}
              {(financing.loansReceived > 0 || financing.loanRepayments > 0 || financing.ownerWithdrawals > 0) && (
                <View style={styles.breakdownPreview}>
                  <Text style={styles.breakdownTitle}>{t.financialReports?.financingActivities || 'Financing Activities'}</Text>
                  {financing.loansReceived > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>{t.financialReports?.loansReceived || 'Loans Received'}</Text>
                      <Text style={styles.breakdownValue}>{formatCurrency(financing.loansReceived)}</Text>
                    </View>
                  )}
                  {financing.loanRepayments > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>{t.financialReports?.loanRepayments || 'Loan Repayments'}</Text>
                      <Text style={styles.breakdownValue}>({formatCurrency(financing.loanRepayments)})</Text>
                    </View>
                  )}
                  {financing.ownerWithdrawals > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>{t.financialReports?.ownerWithdrawals || 'Owner Withdrawals'}</Text>
                      <Text style={styles.breakdownValue}>({formatCurrency(financing.ownerWithdrawals)})</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        <TouchableOpacity style={[styles.generateButton, (generating || !canExportReports) && styles.generateButtonDisabled]}
          onPress={handleGenerateReport} disabled={generating || !canExportReports}>
          {generating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="download" size={20} color="#FFFFFF" />
              <Text style={styles.generateButtonText}>{t.financialReports?.generateExportPDF || 'Generate & Export PDF'}</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  safeArea: { backgroundColor: '#dce8f2' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' },
  loadingText: { marginTop: Platform.OS === 'android' ? 14 : 16, fontSize: Platform.OS === 'android' ? 14 : 15, color: '#7F8C8D', fontWeight: '500' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Platform.OS === 'android' ? 16 : 20, paddingTop: Platform.OS === 'android' ? 14 : 16, paddingBottom: Platform.OS === 'android' ? 7 : 8, backgroundColor: '#dce8f2', borderBottomWidth: 1, borderBottomColor: '#ECF0F1' },   headerButton: { padding: 8, width: 40 },
  headerTitle: { fontSize: Platform.OS === 'android' ? 20 : 22, fontWeight: '700', color: '#2C3E50', flex: 1, textAlign: 'center' },
  content: { flex: 1 },
  section: { marginHorizontal: Platform.OS === 'android' ? 16 : 20, marginTop: Platform.OS === 'android' ? 16 : 20, marginBottom: 8 },
  sectionTitle: { fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: '700', color: '#2C3E50', marginBottom: Platform.OS === 'android' ? 14 : 16 },
  reportSelectorTrigger: { minHeight: 68, borderRadius: 14, borderWidth: 1, borderColor: '#D8E7F0', backgroundColor: '#FFFFFF', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#dce8f2', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  reportSelectorIcon: { width: 42, height: 42, flexShrink: 0, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  reportSelectorCopy: { flex: 1, minWidth: 0 },
  reportSelectorValue: { color: '#102F46', fontSize: 14, fontWeight: '800' },
  reportSelectorDescription: { marginTop: 2, color: '#78909C', fontSize: 11, fontWeight: '600' },
  reportSelectorBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(13, 33, 55, 0.48)' },
  reportSelectorSheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: '#FFFFFF', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 28 },
  reportSelectorHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  reportSelectorEyebrow: { color: '#60798A', fontSize: 10, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  reportSelectorTitle: { marginTop: 3, color: '#102F46', fontSize: 20, fontWeight: '900' },
  reportSelectorClose: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: '#D8E7F0', backgroundColor: '#F4F8FC', alignItems: 'center', justifyContent: 'center' },
  reportSelectorOption: { minHeight: 62, marginBottom: 8, borderRadius: 13, borderWidth: 1, borderColor: '#D8E7F0', backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 10 },
  reportSelectorOptionActive: { borderColor: '#3282B8', backgroundColor: '#EAF6FD' },
  periodContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 8, shadowColor: '#dce8f2', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cycleSelectorContainer: { marginTop: Platform.OS === 'android' ? 8 : 10 },
  periodTab: { flex: 1, minWidth: '30%', paddingVertical: Platform.OS === 'android' ? 9 : 10, alignItems: 'center', borderRadius: 8, backgroundColor: '#F8FAFB' },
  periodTabActive: { backgroundColor: '#3498DB' },
  periodTabText: { fontSize: Platform.OS === 'android' ? 12 : 13, fontWeight: '600', color: '#7F8C8D' },
  periodTabTextActive: { color: '#FFFFFF' },
  customDateContainer: { marginTop: Platform.OS === 'android' ? 14 : 16, gap: Platform.OS === 'android' ? 10 : 12 },
  dateInputGroup: { gap: 8 },
  dateLabel: { fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '600', color: '#34495E' },
  dateInput: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECF0F1', borderRadius: 10, padding: Platform.OS === 'android' ? 12 : 14, fontSize: Platform.OS === 'android' ? 14 : 15, color: '#2C3E50' },
  inventoryInputs: { gap: Platform.OS === 'android' ? 10 : 12 },
  previewCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: Platform.OS === 'android' ? 16 : 20, shadowColor: '#dce8f2', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: Platform.OS === 'android' ? 10 : 12 },
  previewHeaderText: { flex: 1 },
  previewTitle: { fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: '700', color: '#2C3E50', marginBottom: 4 },
  previewSubtitle: { fontSize: Platform.OS === 'android' ? 12 : 13, color: '#7F8C8D' },
  previewDivider: { height: 1, backgroundColor: '#ECF0F1', marginVertical: Platform.OS === 'android' ? 14 : 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Platform.OS === 'android' ? 7 : 8 },
  summaryLabel: { fontSize: Platform.OS === 'android' ? 13 : 14, color: '#7F8C8D', fontWeight: '500' },
  summaryValue: { fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: '600' },
  summaryLabelBold: { fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: '700', color: '#2C3E50', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValueBold: { fontSize: Platform.OS === 'android' ? 17 : 18, fontWeight: '700' },
  revenueColor: { color: '#27AE60' },
  expenseColor: { color: '#E74C3C' },
  breakdownPreview: { marginTop: Platform.OS === 'android' ? 14 : 16, paddingTop: Platform.OS === 'android' ? 14 : 16, borderTopWidth: 1, borderTopColor: '#F8FAFB' },
  breakdownTitle: { fontSize: Platform.OS === 'android' ? 12 : 13, fontWeight: '700', color: '#34495E', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Platform.OS === 'android' ? 5 : 6 },
  breakdownLabel: { fontSize: Platform.OS === 'android' ? 12 : 13, color: '#7F8C8D' },
  breakdownValue: { fontSize: Platform.OS === 'android' ? 12 : 13, fontWeight: '600', color: '#2C3E50' },
  transactionPreviewNote: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#ECF0F1', color: '#60798A', fontSize: 12, lineHeight: 18 },
  generateButton: { flexDirection: 'row', backgroundColor: '#3498DB', marginHorizontal: Platform.OS === 'android' ? 16 : 20, marginTop: Platform.OS === 'android' ? 20 : 24, padding: Platform.OS === 'android' ? 16 : 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#3498DB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  generateButtonDisabled: { opacity: 0.6 },
  generateButtonText: { color: '#FFFFFF', fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: '700' },
});
