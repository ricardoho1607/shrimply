"use client";
import { showAppAlert } from '@/lib/appDialogs';


import { scopeExpenseRecords } from '../../../../../../shared/financeExpenseAllocation';
import { getFinanceAllocationCopy } from '../../../../../../shared/financeAllocationCopy';

import { buildProfitLoss, buildConfirmedCashFlow } from '../../../../../../shared/financeReports';
import { monetaryValue, NON_OPERATING_INCOME } from '../../../../../../shared/financeIntegrity';
import { transactionOpeningPosition } from '../../../../../../shared/reportingIntegrity';
import React, { useMemo, useState } from 'react';
import {
  Download,
  Loader2,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  useCompanyAdditives,
  useCompanyCycles,
  useCompanyFeeds,
  useCompanyPonds,
  useCompanyHarvestRecords,
  useFinanceRecords,
} from '@/hooks/useDashboardData';
import { generateCashFlowHTML, type CashFlowData } from '@/lib/generated/mobileCashFlowReport';
import { generateCOGSHTML, prepareCOGSData } from '@/lib/generated/mobileCogsReport';
import { generateProfitLossHTML, type FinancialData } from '@/lib/generated/mobileProfitLossReport';
import { generateTransactionHistoryHTML, prepareTransactionHistoryData } from '@/lib/generated/mobileTransactionHistoryReport';
import { downloadMobilePdf, loadMobilePdfBrandAssets } from '@/lib/mobilePdfExport';
import { normalizeCategory } from '@/utils/categoryNormalizer';
import { getOpenFinanceCycles } from '../../../../../../shared/financeCycleAllocation';
import {
  getFarmDateKey,
  getFarmPeriodDateKeys,
  isDateKeyInRange,
} from '../../../../../../shared/farmDate';
import { useFarmPermissions } from '@/hooks/useFarmPermissions';
import { useDashboardCopy } from '@/hooks/useDashboardCopy';
import { buildCogsReport, type CogsPond, type CogsHarvest, type CogsUsage } from '../../../../../../shared/cogsReport';

interface Expense {
  allocationMethod?: string | null;
  id: string;
  amount: number;
  settlements?: { id: string; date: string; amount: number }[];
  voided?: boolean;
  category: string;
  date: string;
  description?: string;
  item?: string;
  cycleId?: string;
  cycleName?: string;
  paymentType?: string;
  reference?: string;
  timestamp?: number;
  pondId?: string;
  pondCycleId?: string;
  pondAllocations?: { pondId: string; pondCycleId?: string; cycleId?: string; amount: number }[];
}

interface Revenue {
  id: string;
  amount: number;
  settlements?: { id: string; date: string; amount: number }[];
  voided?: boolean;
  category: string;
  date: string;
  description?: string;
  item?: string;
  cycleId?: string;
  cycleName?: string;
  paymentType?: string;
  reference?: string;
  timestamp?: number;
  pondId?: string;
  pondCycleId?: string;
  pondAllocations?: { pondId: string; pondCycleId?: string; cycleId?: string; amount: number }[];
}

interface FinanceCycle { id: string; cycleName: string; status?: string }
type InventoryUsage = CogsUsage;
interface InventoryItem { id: string; usageHistory?: InventoryUsage[] }
interface CustomDateRange { startDateKey: string; endDateKey: string }

const PERIOD_OPTIONS = ['Today', 'This Week', 'This Month', 'This Year', 'Custom'];
const REPORT_TYPES = [
  { id: 'profit-loss', name: 'Profit & Loss', desc: 'Income Statement' },
  { id: 'cogs', name: 'COGS Report', desc: 'Cost of Production' },
  { id: 'cash-flow', name: 'Cash Flow', desc: 'Liquidity Analysis' },
  { id: 'transaction-history', name: 'Transaction History', desc: 'Money In and Money Out' },
];

const addBreakdown = (target: Record<string, number>, category: string, amount: number) => {
  const key = normalizeCategory(category);
  target[key] = (target[key] || 0) + amount;
};

export default function FinancialReportsPage() {
  const copy = useDashboardCopy();
  const { formatCurrency: displayCurrency, currencyConfig } = useCurrency();
  const formatCurrency = (value: number) => Number.isFinite(value) ? displayCurrency(value) : 'N/A';
  const { currentLanguage, t } = useLanguage();
  const allocationCopy = getFinanceAllocationCopy(currentLanguage);
  const { company, loading: authLoading } = useAuth();
  const hasPermission = useFarmPermissions();
  const canViewFinance = hasPermission('viewFinance');
  const canExportReports = hasPermission('exportReports');
  const [selectedReport, setSelectedReport] = useState('profit-loss');
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');
  const [cycleScope, setCycleScope] = useState('all');
  const [isCustomRangeOpen, setCustomRangeOpen] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<CustomDateRange | null>(null);
  const [customRangeDraft, setCustomRangeDraft] = useState<CustomDateRange>({ startDateKey: '', endDateKey: '' });
  const [customRangeError, setCustomRangeError] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [openingInventory, setOpeningInventory] = useState(0);
  const [closingInventory, setClosingInventory] = useState(0);
  const { expenses: rawExpenses, revenues: rawRevenues, loading: financeLoading } = useFinanceRecords<Expense, Revenue>(true);
  const { data: cycles, loading: cyclesLoading } = useCompanyCycles<FinanceCycle>();
  const { data: feeds, loading: feedsLoading } = useCompanyFeeds<InventoryItem>();
  const { data: additives, loading: additivesLoading } = useCompanyAdditives<InventoryItem>();
  const { data: ponds, loading: pondsLoading } = useCompanyPonds<CogsPond>();
  const { data: harvests, loading: harvestsLoading } = useCompanyHarvestRecords<CogsHarvest>();
  const invalidMoneyCount = [...rawExpenses, ...rawRevenues].filter(row => monetaryValue(row.amount) === null).length;
  const expenses = rawExpenses.map(row => ({ ...row, amount: monetaryValue(row.amount) ?? Number.NaN }));
  const revenues = rawRevenues.map(row => ({ ...row, amount: monetaryValue(row.amount) ?? Number.NaN }));
  const activeCycles = useMemo(() => getOpenFinanceCycles(cycles), [cycles]);
  const loading = authLoading || financeLoading || cyclesLoading || feedsLoading || additivesLoading || pondsLoading || harvestsLoading;
  const reportTypes = REPORT_TYPES.map((report) => ({
    ...report,
    name: report.id === 'profit-loss'
      ? t.financialReports.profitLoss
      : report.id === 'cogs'
        ? t.financialReports.cogs
        : report.id === 'cash-flow'
          ? t.financialReports.cashFlow
          : t.financialReports.transactionHistory,
    desc: report.id === 'transaction-history'
      ? t.financialReports.transactionHistoryDescription
      : report.desc,
  }));
  const selectedReportMeta = reportTypes.find((report) => report.id === selectedReport) || reportTypes[0];

  const openCustomRange = () => {
    const now = new Date();
    const today = getFarmDateKey(now, company?.timeZone);
    const currentMonth = getFarmPeriodDateKeys('month', now, company?.timeZone);
    setCustomRangeDraft(customDateRange || {
      startDateKey: currentMonth.startDateKey || today,
      endDateKey: today,
    });
    setCustomRangeError('');
    setCustomRangeOpen(true);
  };

  const selectPeriod = (period: string) => {
    if (period === 'Custom') {
      openCustomRange();
      return;
    }
    setSelectedPeriod(period);
  };

  const applyCustomRange = (event: React.FormEvent) => {
    event.preventDefault();
    if (!customRangeDraft.startDateKey || !customRangeDraft.endDateKey) {
      setCustomRangeError(copy('Select both a start date and an end date.'));
      return;
    }
    if (customRangeDraft.startDateKey > customRangeDraft.endDateKey) {
      setCustomRangeError(copy('The start date must be before the end date.'));
      return;
    }
    setCustomDateRange(customRangeDraft);
    setSelectedPeriod('Custom');
    setCustomRangeOpen(false);
    setCustomRangeError('');
  };

  const dateRange = useMemo(() => {
    const now = new Date();
    const today = getFarmDateKey(now, company?.timeZone);
    if (selectedPeriod === 'Custom' && customDateRange) {
      return {
        startDateKey: customDateRange.startDateKey,
        endDateKey: customDateRange.endDateKey,
        startDate: new Date(`${customDateRange.startDateKey}T00:00:00.000Z`),
        endDate: new Date(`${customDateRange.endDateKey}T23:59:59.999Z`),
      };
    }
    const period = selectedPeriod === 'Today'
      ? 'today'
      : selectedPeriod === 'This Week'
        ? 'week'
        : selectedPeriod === 'This Month'
          ? 'month'
          : 'year';
    const { startDateKey, endDateKey } = getFarmPeriodDateKeys(period, now, company?.timeZone);
    return {
      startDateKey,
      endDateKey,
      startDate: new Date(`${startDateKey || today}T00:00:00.000Z`),
      endDate: new Date(`${endDateKey}T23:59:59.999Z`),
    };
  }, [company?.timeZone, customDateRange, selectedPeriod]);

  const filteredExpenses = scopeExpenseRecords(expenses, cycleScope, ponds).filter((expense) => (
    !expense.voided
    && isDateKeyInRange(expense.date, dateRange.startDateKey, dateRange.endDateKey, company?.timeZone)
  ));
  const filteredRevenues = revenues.filter((revenue) => (
    !revenue.voided && (cycleScope === 'all' || revenue.cycleId === cycleScope)
    && isDateKeyInRange(revenue.date, dateRange.startDateKey, dateRange.endDateKey, company?.timeZone)
  ));
  const cogsInput = {
    ponds, expenses, revenues, harvests,
    feedUsage: feeds.flatMap(feed => feed.usageHistory || []),
    additiveUsage: additives.flatMap(additive => additive.usageHistory || []),
    cycleScope, scopeLabel: cycles.find(cycle => cycle.id === cycleScope)?.cycleName || copy('All cycles'),
    startDateKey: dateRange.startDateKey, endDateKey: dateRange.endDateKey,
    timeZone: company?.timeZone, normalizeCategory,
  };
  const cogs = buildCogsReport(cogsInput);
  const pl = buildProfitLoss(cogsInput, openingInventory, closingInventory);
  const cash = buildConfirmedCashFlow({ expenses, revenues, startDateKey: dateRange.startDateKey, endDateKey: dateRange.endDateKey, timeZone: company?.timeZone, normalizeCategory });
  const cogsTotal = cogs.totalProductionCost + openingInventory - closingInventory;
  const cogsGrossProfit = cogs.revenue - cogsTotal;

  const totalRevenue = filteredRevenues.reduce((sum, revenue) => sum + revenue.amount, 0);
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const previewProfit = selectedReport === 'profit-loss' ? pl.netProfit : totalRevenue - totalExpenses;
  const openingBalance = transactionOpeningPosition({ expenses, revenues, cycleScope, startDateKey: dateRange.startDateKey, timeZone: company?.timeZone });

  const handleExport = async () => {
    if (!canExportReports) return;
    if (invalidMoneyCount || (['profit-loss', 'cogs'].includes(selectedReport) && pl.missingAmounts) || (selectedReport === 'cash-flow' && cash.invalidCount) || (selectedReport === 'transaction-history' && !Number.isFinite(openingBalance))) { showAppAlert('Some amounts or costs are invalid or missing. Reconcile the source entries before exporting.'); return; }
    setExportLoading(true);
    try {
      const brandAssets = await loadMobilePdfBrandAssets('portrait');
      const companyName = company?.companyName || company?.id || 'Company';
      const startDate = dateRange.startDate.toISOString();
      const endDate = dateRange.endDate.toISOString();
      const revenueBreakdown: Record<string, number> = {};
      filteredRevenues.filter(revenue => selectedReport !== 'profit-loss' || !NON_OPERATING_INCOME.includes(normalizeCategory(revenue.category))).forEach((revenue) => addBreakdown(revenueBreakdown, revenue.category, revenue.amount));

      let html: string;
      let filename: string;

      if (selectedReport === 'profit-loss') {
        const { totalCOGS, cogsBreakdown, totalOPEX, opexBreakdown, totalOtherExpenses, otherExpenseBreakdown, grossProfit, operatingIncome } = pl;
        const data: FinancialData = {
          period: selectedPeriod,
          startDate,
          endDate,
          companyName,
          totalRevenue: pl.totalRevenue,
          revenueBreakdown: pl.revenueBreakdown,
          totalCOGS,
          cogsBreakdown,
          grossProfit,
          totalOPEX,
          opexBreakdown,
          operatingIncome,
          totalOtherExpenses,
          otherExpenseBreakdown,
          netProfit: operatingIncome - totalOtherExpenses,
          currencyCode: currencyConfig.code,
          currencySymbol: currencyConfig.symbol,
        };
        html = generateProfitLossHTML(data, brandAssets, currentLanguage);
        filename = `Profit_Loss_${selectedPeriod.replace(/\s+/g, '_')}.pdf`;
      } else if (selectedReport === 'cash-flow') {
        const { operating: operatingActivities, investing: investingActivities, financing: financingActivities } = cash;
        const data: CashFlowData = {
          period: selectedPeriod,
          startDate,
          endDate,
          companyName,
          basisNote: `Company-wide confirmed payments only. ${cash.unconfirmedCount} entries have an unconfirmed balance. Opening cash is derived from recorded payments, not a reconciled bank balance.`,
          openingBalance: cash.openingBalance,
          operatingActivities,
          investingActivities,
          financingActivities,
          currencyCode: currencyConfig.code,
          currencySymbol: currencyConfig.symbol,
        };
        html = generateCashFlowHTML(data, brandAssets, currentLanguage);
        filename = `Cash_Flow_${selectedPeriod.replace(/\s+/g, '_')}.pdf`;
      } else if (selectedReport === 'cogs') {
        const data = prepareCOGSData(
          selectedPeriod, dateRange.startDateKey || startDate, dateRange.endDateKey || endDate,
          companyName, openingInventory, cogs.purchases, cogs.directLabor, cogs.directMaterials,
          closingInventory, cogs.revenue, cogs.categoryBreakdown,
          currencyConfig.code, currencyConfig.symbol, cogs.details,
        );
        html = generateCOGSHTML(data, brandAssets, currentLanguage);
        filename = `COGS_${selectedPeriod.replace(/\s+/g, '_')}.pdf`;
      } else {
        const data = prepareTransactionHistoryData(
          selectedPeriod,
          startDate,
          endDate,
          companyName,
          openingBalance,
          filteredExpenses,
          filteredRevenues,
          currencyConfig.code,
          currencyConfig.symbol,
        );
        html = generateTransactionHistoryHTML(data, brandAssets, currentLanguage);
        filename = `Transaction_Register_${selectedPeriod.replace(/\s+/g, '_')}.pdf`;
      }

      await downloadMobilePdf({ html, filename, orientation: 'portrait', compress: true });
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><Loader2 className="animate-spin" size={40} color="var(--primary)" /></div>;
  }
  if (!canViewFinance) return <div style={{ textAlign: 'center', padding: '100px' }}>{copy('You do not have permission to view financial reports.')}</div>;

  return (
    <div className="dashboard-page-relaxed authenticated-compact-page business-dashboard-page">
      <div className="dashboard-report-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <div>
            <h2 style={{ fontSize: '18px', lineHeight: '26px', fontWeight: 600, marginBottom: '14px' }}>{t.financialReports.reportType}</h2>
            <div className="glass-card financial-report-selector">
              <div className="financial-report-selector-copy">
                <label htmlFor="financial-report-type">{t.financialReports.selectReport}</label>
                <select id="financial-report-type" value={selectedReport} onChange={(event) => setSelectedReport(event.target.value)}>
                  {reportTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                </select>
                <span>{copy(selectedReportMeta.desc)}</span>
              </div>
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: '18px', lineHeight: '26px', fontWeight: 600, marginBottom: '14px' }}>{t.financeCycle.selectPeriod}</h2>
            <div className="dashboard-segmented-tabs financial-report-filter-tabs" style={{ width: '100%' }}>
              {PERIOD_OPTIONS.map((period) => <button key={period} type="button" onClick={() => selectPeriod(period)} className={`dashboard-segmented-tab ${selectedPeriod === period ? 'active' : ''}`} style={{ flex: '1 1 0', minWidth: 0 }}>{copy(period)}</button>)}
            </div>
            <div className="dashboard-segmented-tabs financial-report-filter-tabs financial-cycle-tabs" style={{ width: '100%', marginTop: '8px', overflowX: 'auto' }}>
              {[...activeCycles.map((cycle) => ({ key: cycle.id, label: cycle.cycleName })), { key: 'all', label: t.financeCycle.allHistory }].map((scope) => <button key={scope.key} type="button" disabled={selectedReport === 'cash-flow'} onClick={() => setCycleScope(scope.key)} className={`dashboard-segmented-tab ${(selectedReport === 'cash-flow' ? 'all' : cycleScope) === scope.key ? 'active' : ''}`} style={{ flex: '1 1 0', minWidth: '110px' }}>{scope.label}</button>)}
            </div>
          </div>

          {selectedReport === 'cash-flow' && <div className="glass-card" style={{ padding: 16 }}>Company-wide confirmed cash movements only. Purchases and sales remain unconfirmed until payment is recorded in Finance. {cash.unconfirmedCount} entries have an unconfirmed balance.</div>}
          {invalidMoneyCount > 0 && <p role="alert">{invalidMoneyCount} finance entries have invalid amounts. Correct these before exporting.</p>}
          {(selectedReport === 'cogs' || selectedReport === 'profit-loss') ? (
            <div className="glass-card" style={{ padding: '20px', background: '#FFF' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>{t.financeCycle.inventoryAdjustment}</h2>
              <p style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--text-muted)', marginBottom: '12px' }}>{copy('Feed and additives use consumed costs. Enter only production costs carried forward, not unused feed or material stock. Zero means no adjustment entered.')}</p>
              <div className="financial-inventory-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '14px' }}>
                <label style={{ minWidth: 0, fontSize: '12px', color: 'var(--text-muted)' }}>{copy('Opening production costs (WIP)')} ({currencyConfig.symbol})<input type="number" min="0" step="0.01" value={openingInventory} onChange={(event) => setOpeningInventory(Number(event.target.value))} className="form-input" placeholder="0" style={{ width: '100%', maxWidth: '100%', marginTop: '8px' }} /></label>
                <label style={{ minWidth: 0, fontSize: '12px', color: 'var(--text-muted)' }}>{copy('Closing production costs (WIP)')} ({currencyConfig.symbol})<input type="number" min="0" step="0.01" value={closingInventory} onChange={(event) => setClosingInventory(Number(event.target.value))} className="form-input" placeholder="0" style={{ width: '100%', maxWidth: '100%', marginTop: '8px' }} /></label>
              </div>
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-card" style={{ background: '#FFF', padding: '22px', position: 'sticky', top: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>{copy('Report Preview')}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {selectedReport === 'transaction-history' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}><span style={{ color: 'var(--text-muted)' }}>{t.financialReports.transactions}</span><span style={{ fontWeight: 600 }}>{filteredExpenses.length + filteredRevenues.length}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}><span style={{ color: 'var(--text-muted)' }}>{t.financialReports.moneyIn}</span><span style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(totalRevenue)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}><span style={{ color: 'var(--text-muted)' }}>{t.financialReports.moneyOut}</span><span style={{ fontWeight: 600, color: 'var(--error)' }}>{formatCurrency(totalExpenses)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px' }}><span style={{ fontWeight: 600 }}>{t.financialReports.netMovement}</span><span style={{ fontWeight: 600, fontSize: '20px', color: previewProfit >= 0 ? 'var(--success)' : 'var(--error)' }}>{formatCurrency(previewProfit)}</span></div>
                </>
              ) : selectedReport === 'cash-flow' ? (
                <>
                  <div>Confirmed opening cash: <strong>{formatCurrency(cash.openingBalance)}</strong></div>
                  <div>Confirmed net movement: <strong>{formatCurrency(cash.operating.cashFromSales + cash.operating.cashFromCustomers - cash.operating.paymentToSuppliers - cash.operating.paymentForExpenses + cash.operating.otherOperatingCash + cash.investing.saleOfAssets + cash.investing.saleOfInvestments - cash.investing.purchaseOfAssets - cash.investing.purchaseOfInvestments + cash.financing.loansReceived + cash.financing.capitalContributed - cash.financing.loanRepayments - cash.financing.dividendsPaid - cash.financing.ownerWithdrawals)}</strong></div>
                  <p>{cash.unconfirmedCount} entries have an unconfirmed balance. This is not a bank-reconciled balance.</p>
                </>
              ) : selectedReport === 'cogs' ? (
                <>
                  {[
                    { label: 'Revenue', value: formatCurrency(cogs.revenue) },
                    { label: 'Cost of Goods Sold', value: formatCurrency(cogsTotal) },
                    { label: 'Harvested shrimp (kg)', value: cogs.details.harvestedKg.toLocaleString(undefined, { maximumFractionDigits: 2 }) },
                    { label: 'COGS per kg', value: cogs.details.harvestedKg > 0 ? `${formatCurrency(cogsTotal / cogs.details.harvestedKg)} / kg` : 'N/A' },
                    { label: cogsGrossProfit >= 0 ? 'Gross Profit' : 'Gross Loss', value: formatCurrency(Math.abs(cogsGrossProfit)) },
                    { label: 'Gross Profit Margin', value: cogs.revenue > 0 ? `${(cogsGrossProfit / cogs.revenue * 100).toFixed(2)}%` : 'N/A' },
                  ].map(metric => <div key={metric.label} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}><span style={{ color: 'var(--text-muted)' }}>{copy(metric.label)}</span><strong>{metric.value}</strong></div>)}
                  <details style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 600, padding: '8px 0' }}>{allocationCopy.hpp} · {cogs.details.pondRows.length} {allocationCopy.ponds}</summary>
                    {cogs.details.pondRows.map(row => <div key={row.pondId} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid var(--border)', padding: '12px 0' }}>
                      <div><strong>{row.pondName}</strong><div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{row.cycleName}</div></div>
                      <div style={{ textAlign: 'right' }}><strong>{formatCurrency(row.total)}</strong><div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{row.harvestedKg > 0 ? `${formatCurrency(row.total / row.harvestedKg)} / kg` : 'N/A / kg'}</div></div>
                    </div>)}
                    {cogs.details.unallocatedCost !== 0 && <p>{allocationCopy.unallocated}: {formatCurrency(cogs.details.unallocatedCost)}</p>}
                  </details>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}><span style={{ color: 'var(--text-muted)' }}>{copy('Revenue')}</span><span style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(pl.totalRevenue)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}><span style={{ color: 'var(--text-muted)' }}>{copy('Expenses')}</span><span style={{ fontWeight: 600, color: 'var(--error)' }}>{formatCurrency(selectedReport === 'profit-loss' ? pl.totalCOGS + pl.totalOPEX + pl.totalOtherExpenses : totalExpenses)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px' }}><span style={{ fontWeight: 600 }}>{copy(previewProfit >= 0 ? 'Net Profit' : 'Net Loss')}</span><span style={{ fontWeight: 600, fontSize: '20px', color: previewProfit >= 0 ? 'var(--success)' : 'var(--error)' }}>{formatCurrency(Math.abs(previewProfit))}</span></div>
                </>
              )}
            </div>
            <button className="btn-primary" type="button" onClick={handleExport} disabled={exportLoading || !canExportReports} style={{ width: '100%', marginTop: '24px', padding: '14px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              {exportLoading ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
              <span style={{ fontWeight: 600 }}>{copy(exportLoading ? 'Generating PDF...' : 'Download Statement')}</span>
            </button>
          </div>
        </div>
      </div>

      {isCustomRangeOpen ? (
        <div className="responsive-modal-overlay custom-range-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px', background: 'rgba(15, 23, 42, 0.52)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-card responsive-modal animate-fade-up custom-range-modal" role="dialog" aria-modal="true" aria-labelledby="custom-date-range-title" style={{ width: '100%', maxWidth: '440px', overflow: 'hidden', background: '#fff', boxShadow: '0 20px 50px rgba(15, 76, 117, 0.2)' }}>
            <div className="responsive-modal-header custom-range-header">
              <div>
                <h2 id="custom-date-range-title">{copy('Custom date range')}</h2>
                <p>{copy('Choose the transactions to include in this report.')}</p>
              </div>
              <button type="button" className="custom-range-close" aria-label={copy('Close custom date range')} onClick={() => setCustomRangeOpen(false)}><X size={20} /></button>
            </div>

            <form className="responsive-modal-body custom-range-form" onSubmit={applyCustomRange}>
              <div className="custom-range-body">
                <div className="custom-range-fields">
                  <label className="custom-range-field">
                    <span>{copy('Start date')}</span>
                    <input type="date" required value={customRangeDraft.startDateKey} onChange={(event) => setCustomRangeDraft((range) => ({ ...range, startDateKey: event.target.value }))} />
                  </label>
                  <label className="custom-range-field">
                    <span>{copy('End date')}</span>
                    <input type="date" required value={customRangeDraft.endDateKey} onChange={(event) => setCustomRangeDraft((range) => ({ ...range, endDateKey: event.target.value }))} />
                  </label>
                </div>
                {customRangeError ? <p role="alert" className="custom-range-error">{customRangeError}</p> : null}
              </div>
              <div className="responsive-modal-footer custom-range-footer">
                <button type="button" className="custom-range-cancel" onClick={() => setCustomRangeOpen(false)}>{copy('Cancel')}</button>
                <button type="submit" className="btn-primary custom-range-apply">{copy('Apply date range')}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .financial-report-filter-tabs .dashboard-segmented-tab:hover:not(.active),
        .financial-report-filter-tabs .dashboard-segmented-tab:focus-visible:not(.active) {
          background: rgba(15, 76, 117, 0.08);
          color: var(--primary);
        }

        .financial-report-filter-tabs .dashboard-segmented-tab.active:hover {
          background: #fff;
          color: var(--primary);
          box-shadow: 0 4px 12px rgba(15, 76, 117, 0.1);
        }

        .financial-report-selector {
          min-height: 74px;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          background: #fff;
          border: 1px solid var(--border);
          border-radius: 14px;
        }

        .financial-report-selector-copy {
          min-width: 0;
          flex: 1;
          display: grid;
          gap: 3px;
        }

        .financial-report-selector-copy label {
          color: var(--text-muted);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .financial-report-selector-copy select {
          width: 100%;
          min-height: 34px;
          padding: 4px 34px 4px 0;
          border: 0;
          outline: 0;
          background: #fff;
          color: var(--text-primary);
          font: inherit;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
        }

        .financial-report-selector-copy select:focus-visible {
          outline: 2px solid #3282b8;
          outline-offset: 3px;
          border-radius: 4px;
        }

        .financial-report-selector-copy > span {
          color: var(--text-muted);
          font-size: 11px;
        }

        .custom-range-overlay {
          z-index: 9100 !important;
        }

        .custom-range-modal {
          max-height: calc(100dvh - 36px);
          display: flex;
          flex-direction: column;
          border: 1px solid var(--border);
          border-radius: 18px !important;
        }

        .custom-range-header {
          min-height: 68px;
          padding: 14px 16px !important;
          border-bottom: 1px solid var(--border);
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .custom-range-header h2 {
          color: var(--text-primary);
          font-size: 18px;
          font-weight: 600;
          line-height: 24px;
        }

        .custom-range-header p {
          margin-top: 2px;
          color: var(--text-muted);
          font-size: 12px;
          line-height: 16px;
        }

        .custom-range-close {
          width: 40px;
          height: 40px;
          flex: 0 0 auto;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: var(--text-primary);
          display: grid;
          place-items: center;
          cursor: pointer;
          transition: background-color 160ms ease, color 160ms ease;
        }

        .custom-range-close:hover {
          background: var(--bg-mid);
          color: #0f4c75;
        }

        .custom-range-form {
          min-height: 0;
          padding: 0 !important;
          display: flex;
          flex-direction: column;
          gap: 0 !important;
          overflow: hidden;
        }

        .custom-range-body {
          padding: 16px;
          background: #fff;
        }

        .custom-range-fields {
          padding: 0;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .custom-range-field {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .custom-range-field span {
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 600;
        }

        .custom-range-field input {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          height: 44px;
          padding: 0 11px;
          border: 1px solid var(--border);
          border-radius: 10px;
          outline: 0;
          background: #fff;
          color: var(--text-primary);
          font: inherit;
          font-size: 14px;
          font-weight: 600;
          transition: border-color 160ms ease, box-shadow 160ms ease;
        }

        .custom-range-field input:focus {
          border-color: #3282b8;
          box-shadow: 0 0 0 3px rgba(50, 130, 184, 0.12);
        }

        .custom-range-error {
          margin-top: 10px;
          color: var(--error);
          font-size: 12px;
          font-weight: 600;
        }

        .custom-range-footer {
          padding: 12px 16px !important;
          border-top: 1px solid var(--border);
          background: #fff;
          box-shadow: 0 -8px 24px rgba(15, 76, 117, 0.08);
          display: flex;
          gap: 10px !important;
        }

        .custom-range-footer button {
          width: 0;
          flex: 1 1 0;
          min-width: 0;
          min-height: 40px;
          padding: 0 12px !important;
          border-radius: 10px;
          box-sizing: border-box;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .custom-range-cancel {
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text-primary);
        }

        .custom-range-cancel:hover {
          background: var(--bg-mid);
          color: #0f4c75;
        }

        .custom-range-apply {
          border: 1px solid #0f4c75 !important;
          background: #0f4c75 !important;
          box-shadow: none !important;
          letter-spacing: 0;
          text-transform: none;
        }

        .custom-range-apply:hover {
          border-color: #0c3f62 !important;
          background: #0c3f62 !important;
        }

        @media (max-width: 640px) {
          .custom-range-overlay {
            align-items: center !important;
            padding: calc(8px + var(--safe-area-top)) calc(8px + var(--safe-area-right)) calc(8px + var(--safe-area-bottom)) calc(8px + var(--safe-area-left)) !important;
          }

          .custom-range-modal {
            width: 100% !important;
            max-width: 440px !important;
            max-height: calc(100dvh - 16px - var(--safe-area-top) - var(--safe-area-bottom)) !important;
            border-radius: 14px !important;
          }

          .custom-range-header {
            min-height: 60px;
            padding: 10px 12px !important;
          }

          .custom-range-header h2 {
            font-size: 17px;
            line-height: 22px;
          }

          .custom-range-body {
            padding: 12px;
          }

          .custom-range-fields {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .custom-range-footer {
            padding: 10px calc(10px + var(--safe-area-right)) calc(10px + var(--safe-area-bottom)) calc(10px + var(--safe-area-left)) !important;
          }
        }
      `}</style>
    </div>
  );
}
