import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, Platform, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import financeService, { Expense } from './services/financeService';
import revenueService, { Revenue } from './services/revenueService';
import { exportFinancialPDF, prepareFinancialData } from './services/pdfExportService';
import { exportCashFlowPDF, prepareCashFlowData } from './services/cashFlowExportService';
import { exportCOGSPDF, prepareCOGSData } from './services/cogsExportService';
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

type ReportType = { id: string; name: string; icon: string; color: string; disabled?: boolean };
const PERIOD_OPTIONS = ['Today', 'This Week', 'This Month', 'This Year', 'Custom', 'All Time'] as const;

export default function FinancialReportsPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, company } = useAuth();
  const { t, currentLanguage } = useLanguage();
  const { formatCurrency, currencyConfig } = useCurrency();
  const { cycles } = usePondStore();
  const activeCycles = useMemo(() => getOpenFinanceCycles(cycles), [cycles]);
  const feedAdditiveStore = useFeedAdditiveStore();

  const REPORT_TYPES: ReportType[] = [
    { id: 'profit-loss', name: t.financialReports?.profitLoss || 'Profit & Loss', icon: 'trending-up', color: '#3498DB' },
    { id: 'cogs', name: t.financialReports?.cogs || 'COGS Report', icon: 'calculator', color: '#27AE60' },
    { id: 'cash-flow', name: t.financialReports?.cashFlow || 'Cash Flow', icon: 'cash', color: '#9B59B6' },
    { id: 'harvest-projections', name: t.financialReports?.harvestProjection || 'Harvest Projections', icon: 'analytics', color: '#E74C3C' },
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

  const [selectedReportType, setSelectedReportType] = useState<string>('profit-loss');
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

  const hasFinanceAccess = ['owner', 'co-owner', 'manager', 'admin'].includes(user?.role || '');

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
    feedAdditiveStore.initializeForCompany(company.id, company.timeZone);
  }, [company?.id]);

  const loadData = async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const [fetchedExpenses, fetchedRevenues] = await Promise.all([
        financeService.getExpenses(company.id),
        revenueService.getRevenues(company.id),
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
      filteredExpenses: scopeFinance(expenses).filter(e => isDateKeyInRange(e.date, startDateKey, endDateKey, company?.timeZone)),
      filteredRevenues: scopeFinance(revenues).filter(r => isDateKeyInRange(r.date, startDateKey, endDateKey, company?.timeZone))
    };
  };

  const { filteredExpenses, filteredRevenues } = getFilteredData();

  const calculateTotals = (data: Expense[] | Revenue[], service: typeof financeService | typeof revenueService) => ({
    total: service.calculateTotal(data),
    byCategory: service.getCategoryBreakdown(data),
    top: service === financeService ? (service as typeof financeService).getTopExpenses(data as Expense[], 3) : (service as typeof revenueService).getTopRevenues(data as Revenue[], 3)
  });

  const expenseTotals = calculateTotals(filteredExpenses, financeService);
  const revenueTotals = calculateTotals(filteredRevenues, revenueService);
  const profit = revenueTotals.total - expenseTotals.total;


  const { startDateKey: cogsStartDateKey, endDateKey: cogsEndDateKey } = getDateRange();
  const usageMatchesScope = (usage: { date?: string; cycleId?: string }) => Boolean(
    usage.date
    && usage.cycleId
    && (cycleScope === 'all' || usage.cycleId === cycleScope)
    && isDateKeyInRange(usage.date, cogsStartDateKey, cogsEndDateKey, company?.timeZone)
  );
  const feedUsageCost = feedAdditiveStore.feeds.flatMap((feed) => feed.usageHistory || [])
    .filter(usageMatchesScope)
    .reduce((sum, usage) => sum + (Number(usage.totalCost) || 0), 0);
  const additiveUsageCost = feedAdditiveStore.additives.flatMap((additive) => additive.usageHistory || [])
    .filter(usageMatchesScope)
    .reduce((sum, usage) => sum + (Number(usage.totalCost) || 0), 0);

  const cycleProductionExpenses = filteredExpenses.filter((expense) => (
    Boolean(expense.cycleId) && !expense.reference?.startsWith('INVENTORY-')
  ));
  const purchases = feedUsageCost + cycleProductionExpenses
    .filter((expense) => normalizeCategory(expense.category) === 'Feed')
    .reduce((sum, expense) => sum + expense.amount, 0);
  const directLabor = cycleProductionExpenses
    .filter((expense) => normalizeCategory(expense.category) === 'Labor')
    .reduce((sum, expense) => sum + expense.amount, 0);
  const directMaterials = additiveUsageCost + cycleProductionExpenses
    .filter((expense) => !['Feed', 'Labor'].includes(normalizeCategory(expense.category)))
    .reduce((sum, expense) => sum + expense.amount, 0);
  const totalCOGSInventory = openingInventory + purchases + directLabor + directMaterials - closingInventory; // For COGS Report

  // P&L Metrics — use English display names in breakdowns so PDF always shows clean labels
  const cogsCategoryBreakdown: { [key: string]: number } = {};
  if (feedUsageCost) cogsCategoryBreakdown[t.financeCycle.feedUsage] = feedUsageCost;
  if (additiveUsageCost) cogsCategoryBreakdown[t.financeCycle.additiveUsage] = additiveUsageCost;
  cycleProductionExpenses.forEach(exp => {
    const key = normalizeCategory(exp.category);
    cogsCategoryBreakdown[key] = (cogsCategoryBreakdown[key] || 0) + exp.amount;
  });
  const totalCOGSPL = feedUsageCost + additiveUsageCost + cycleProductionExpenses.reduce((sum, e) => sum + e.amount, 0);
  const grossProfitPL = revenueTotals.total - totalCOGSPL;

  const NON_OPEX_CATEGORIES = ['Loan Payment', 'Taxes', 'Interest', 'Equipment', 'Property', 'Infrastructure', 'Owner Withdrawal', 'Dividend'];

  const opexExpenses = filteredExpenses.filter(e => {
    const norm = normalizeCategory(e.category);
    return !e.cycleId && !e.reference?.startsWith('INVENTORY-') && !NON_OPEX_CATEGORIES.includes(norm);
  });
  const opexCategoryBreakdown: { [key: string]: number } = {};
  opexExpenses.forEach(exp => {
    const key = normalizeCategory(exp.category);
    opexCategoryBreakdown[key] = (opexCategoryBreakdown[key] || 0) + exp.amount;
  });
  const totalOPEX = opexExpenses.reduce((sum, e) => sum + e.amount, 0);

  const operatingIncome = grossProfitPL - totalOPEX;

  const otherExpenses = filteredExpenses.filter(e => ['Loan Payment', 'Taxes', 'Interest'].includes(normalizeCategory(e.category)));
  const otherExpenseBreakdown: { [key: string]: number } = {};
  otherExpenses.forEach(exp => {
    const key = normalizeCategory(exp.category);
    otherExpenseBreakdown[key] = (otherExpenseBreakdown[key] || 0) + exp.amount;
  });
  const totalOtherExpenses = otherExpenses.reduce((sum, e) => sum + e.amount, 0);

  const netProfitPL = operatingIncome - totalOtherExpenses;

  const getOpeningBalance = () => {
    const { startDateKey } = getDateRange();
    const previousRevenues = revenues.filter(r => {
      const dateKey = normalizeFarmDateKey(r.date, company?.timeZone);
      return Boolean(startDateKey && dateKey && dateKey < startDateKey);
    });
    const previousExpenses = expenses.filter(e => {
      const dateKey = normalizeFarmDateKey(e.date, company?.timeZone);
      return Boolean(startDateKey && dateKey && dateKey < startDateKey);
    });
    return revenueService.calculateTotal(previousRevenues) - financeService.calculateTotal(previousExpenses);
  };

  const CF_INVESTING_CATEGORIES = ['Equipment', 'Property', 'Infrastructure'];
  const CF_FINANCING_CATEGORIES = ['Loan Payment', 'Owner Withdrawal', 'Dividend'];

  const categorizeCashFlow = () => {
    const operating = { cashFromSales: 0, cashFromCustomers: 0, paymentToSuppliers: 0, paymentForExpenses: 0, otherOperatingCash: 0 };
    const investing = { purchaseOfAssets: 0, saleOfAssets: 0, purchaseOfInvestments: 0, saleOfInvestments: 0 };
    const financing = { loansReceived: 0, loanRepayments: 0, capitalContributed: 0, dividendsPaid: 0, ownerWithdrawals: 0 };

    filteredRevenues.forEach(rev => {
      if (normalizeCategory(rev.category) === 'Shrimp Sales') operating.cashFromSales += rev.amount;
      else operating.cashFromCustomers += rev.amount;
    });

    filteredExpenses.forEach(exp => {
      const norm = normalizeCategory(exp.category);
      if (!CF_INVESTING_CATEGORIES.includes(norm) && !CF_FINANCING_CATEGORIES.includes(norm)) {
        if (norm === 'Feed' || norm === 'Pond Additives') operating.paymentToSuppliers += exp.amount;
        else operating.paymentForExpenses += exp.amount;
      } else if (CF_INVESTING_CATEGORIES.includes(norm)) {
        investing.purchaseOfAssets += exp.amount;
      } else if (CF_FINANCING_CATEGORIES.includes(norm)) {
        if (norm === 'Loan Payment') financing.loanRepayments += exp.amount;
        else financing.ownerWithdrawals += exp.amount;
      } else {
        // Fallback for any unhandled categories
        operating.paymentForExpenses += exp.amount;
      }
    });
    return { operating, investing, financing };
  };

  const { operating, investing, financing } = categorizeCashFlow();
  const openingBalance = getOpeningBalance();
  
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
    setGenerating(true);
    try {
      const { startDate, endDate } = getDateRange();
      if (selectedReportType === 'profit-loss') {
        await exportFinancialPDF(prepareFinancialData(selectedPeriod, startDate.toISOString(), endDate.toISOString(),
          company?.companyName || company?.id || 'Company', 
          revenueTotals.total, revenueTotals.byCategory, 
          totalCOGSPL, cogsCategoryBreakdown, grossProfitPL, 
          totalOPEX, opexCategoryBreakdown, operatingIncome, 
          totalOtherExpenses, otherExpenseBreakdown, netProfitPL,
          currencyConfig.code, currencyConfig.symbol), currentLanguage);
      } else if (selectedReportType === 'cash-flow') {
        await exportCashFlowPDF(prepareCashFlowData(selectedPeriod, startDate.toISOString(), endDate.toISOString(),
          company?.companyName || company?.id || 'Company', openingBalance, operating, investing, financing,
          currencyConfig.code, currencyConfig.symbol), currentLanguage);
      } else if (selectedReportType === 'cogs') {
        await exportCOGSPDF(prepareCOGSData(selectedPeriod, startDate.toISOString(), endDate.toISOString(),
          company?.companyName || company?.id || 'Company', openingInventory, purchases, directLabor,
          directMaterials, closingInventory, revenueTotals.total, cogsCategoryBreakdown,
          currencyConfig.code, currencyConfig.symbol), currentLanguage);
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.financialReports?.reportType || 'Report Type'}</Text>
          <View style={styles.reportTypeGrid}>
            {REPORT_TYPES.map((type) => (
              <TouchableOpacity key={type.id}
                style={[styles.reportTypeCard, selectedReportType === type.id && styles.reportTypeCardActive, type.disabled && styles.reportTypeCardDisabled]}
                onPress={() => {
                  if (type.id === 'harvest-projections') {
                    router.push('/harvest-projection');
                  } else if (!type.disabled) {
                    setSelectedReportType(type.id);
                  }
                }} disabled={type.disabled}>
                <View style={[styles.reportTypeIcon, { backgroundColor: type.color + '20' }]}>
                  <Ionicons name={type.icon as any} size={28} color={type.color} />
                </View>
                <Text style={[styles.reportTypeName, type.disabled && styles.reportTypeNameDisabled]}>{type.name}</Text>
                {type.disabled && (
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonText}>{t.financialReports?.comingSoon || 'Soon'}</Text>
                  </View>
                )}
                {selectedReportType === type.id && !type.disabled && (
                  <View style={styles.selectedCheck}>
                    <Ionicons name="checkmark-circle" size={24} color={type.color} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

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

          <View style={styles.cycleSelectorContainer}>
            <CycleSelector
              value={cycleScope}
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

        {selectedReportType === 'cogs' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.financialReports?.inventoryValues || 'Inventory Values'}</Text>
            <View style={styles.inventoryInputs}>
              <View style={styles.dateInputGroup}>
                <Text style={styles.dateLabel}>{withSelectedCurrency(t.financialReports?.openingInventory || 'Opening Inventory')}</Text>
                <TextInput style={styles.dateInput} placeholder="0" placeholderTextColor="#6b8aa0" keyboardType="numeric"
                  value={openingInventory.toString()} onChangeText={(text) => setOpeningInventory(Number(text.replace(/[^0-9]/g, '')) || 0)} />
              </View>
              <View style={styles.dateInputGroup}>
                <Text style={styles.dateLabel}>{withSelectedCurrency(t.financialReports?.closingInventory || 'Closing Inventory')}</Text>
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
                <Text style={[styles.summaryValue, styles.revenueColor]}>{formatCurrency(revenueTotals.total)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t.financialReports?.totalExpenses || 'Total Expenses'}</Text>
                <Text style={[styles.summaryValue, styles.expenseColor]}>{formatCurrency(expenseTotals.total)}</Text>
              </View>
              <View style={styles.previewDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabelBold}>{profit >= 0 ? t.financialReports?.netProfit || 'Net Profit' : t.financialReports?.netLoss || 'Net Loss'}</Text>
                <Text style={[styles.summaryValueBold, profit >= 0 ? styles.revenueColor : styles.expenseColor]}>{formatCurrency(Math.abs(profit))}</Text>
              </View>
              <View style={styles.breakdownPreview}>
                <Text style={styles.breakdownTitle}>{t.financialReports?.revenueBreakdown || 'Revenue Breakdown'}</Text>
                {Object.entries(revenueTotals.byCategory).slice(0, 3).map(([category, amount]) => (
                  <View key={category} style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>{category}</Text>
                    <Text style={styles.breakdownValue}>{formatCurrency(amount)}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.breakdownPreview}>
                <Text style={styles.breakdownTitle}>{t.financialReports?.expenseBreakdown || 'Expense Breakdown'}</Text>
                {Object.entries(expenseTotals.byCategory).slice(0, 3).map(([category, amount]) => (
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
                <Text style={styles.summaryLabel}>{t.financialReports?.openingInventory || 'Opening Inventory'}</Text>
                <Text style={styles.summaryValue}>{formatCurrency(openingInventory)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t.financialReports?.purchases || 'Add: Purchases (Feed)'}</Text>
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
                <Text style={styles.summaryLabel}>{t.financialReports?.closingInventory || 'Less: Closing Inventory'}</Text>
                <Text style={styles.summaryValue}>({formatCurrency(closingInventory)})</Text>
              </View>
              <View style={styles.previewDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabelBold}>{t.financialReports?.totalCOGS || 'Total COGS'}</Text>
                <Text style={[styles.summaryValueBold, styles.expenseColor]}>{formatCurrency(totalCOGSInventory)}</Text>
              </View>
              <View style={styles.previewDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t.financialReports?.revenue || 'Revenue'}</Text>
                <Text style={styles.summaryValue}>{formatCurrency(revenueTotals.total)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t.financialReports?.lessCOGS || 'Less: COGS'}</Text>
                <Text style={styles.summaryValue}>({formatCurrency(totalCOGSInventory)})</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabelBold}>{t.financialReports?.grossProfit || 'Gross Profit'}</Text>
                <Text style={[styles.summaryValueBold, grossProfitPL >= 0 ? styles.revenueColor : styles.expenseColor]}>{formatCurrency(Math.abs(grossProfitPL))}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t.financialReports?.grossProfitMargin || 'Gross Profit Margin'}</Text>
                <Text style={[styles.summaryValue, grossProfitPL >= 0 ? styles.revenueColor : styles.expenseColor]}>{revenueTotals.total > 0 ? ((grossProfitPL / revenueTotals.total) * 100).toFixed(2) : '0.00'}%</Text>
              </View>
              {Object.keys(cogsCategoryBreakdown).length > 0 && (
                <View style={styles.breakdownPreview}>
                  <Text style={styles.breakdownTitle}>{t.financialReports?.cogsBreakdown || 'COGS Breakdown'}</Text>
                  {Object.entries(cogsCategoryBreakdown).map(([category, amount]) => (
                    <View key={category} style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>{category}</Text>
                      <Text style={styles.breakdownValue}>{formatCurrency(amount)}</Text>
                    </View>
                  ))}
                </View>
              )}
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

        <TouchableOpacity style={[styles.generateButton, generating && styles.generateButtonDisabled]}
          onPress={handleGenerateReport} disabled={generating}>
          {generating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="download" size={20} color="#FFFFFF" />
              <Text style={styles.generateButtonText}>{t.financialReports?.generateExportPDF || 'Generate & Export PDF'}</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color="#3498DB" />
          <Text style={styles.infoText}>
            {t.financialReports?.pdfInfoText || 'The PDF report will include detailed breakdowns, transaction history, and can be shared or saved for your records.'}
          </Text>
        </View>
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
  reportTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Platform.OS === 'android' ? 10 : 12 },
  reportTypeCard: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: Platform.OS === 'android' ? 16 : 20, alignItems: 'center', shadowColor: '#dce8f2', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 2, borderColor: 'transparent' },
  reportTypeCardActive: { borderColor: '#3498DB', backgroundColor: '#EBF5FB' },
  reportTypeCardDisabled: { opacity: 0.5 },
  reportTypeIcon: { width: Platform.OS === 'android' ? 52 : 56, height: Platform.OS === 'android' ? 52 : 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: Platform.OS === 'android' ? 10 : 12 },
  reportTypeName: { fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '600', color: '#2C3E50', textAlign: 'center' },
  reportTypeNameDisabled: { color: '#95A5A6' },
  comingSoonBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#F39C12', paddingHorizontal: Platform.OS === 'android' ? 7 : 8, paddingVertical: 4, borderRadius: 8 },
  comingSoonText: { fontSize: Platform.OS === 'android' ? 9 : 10, fontWeight: '700', color: '#FFFFFF', textTransform: 'uppercase' },
  selectedCheck: { position: 'absolute', top: 8, right: 8 },
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
  generateButton: { flexDirection: 'row', backgroundColor: '#3498DB', marginHorizontal: Platform.OS === 'android' ? 16 : 20, marginTop: Platform.OS === 'android' ? 20 : 24, padding: Platform.OS === 'android' ? 16 : 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#3498DB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  generateButtonDisabled: { opacity: 0.6 },
  generateButtonText: { color: '#FFFFFF', fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: '700' },
  infoCard: { flexDirection: 'row', backgroundColor: '#EBF5FB', marginHorizontal: Platform.OS === 'android' ? 16 : 20, marginTop: Platform.OS === 'android' ? 14 : 16, marginBottom: Platform.OS === 'android' ? 28 : 32, padding: Platform.OS === 'android' ? 14 : 16, borderRadius: 12, gap: Platform.OS === 'android' ? 10 : 12, borderLeftWidth: 4, borderLeftColor: '#3498DB' },
  infoText: { flex: 1, fontSize: Platform.OS === 'android' ? 12 : 13, color: '#34495E', lineHeight: Platform.OS === 'android' ? 18 : 20 },
});
