"use client";

import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  CircleDollarSign,
  Download,
  FileText,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  useCompanyAdditives,
  useCompanyCycles,
  useCompanyFeeds,
  useFinanceRecords,
} from '@/hooks/useDashboardData';
import { generateCashFlowHTML, type CashFlowData } from '@/lib/generated/mobileCashFlowReport';
import { generateCOGSHTML, prepareCOGSData } from '@/lib/generated/mobileCogsReport';
import { generateProfitLossHTML, type FinancialData } from '@/lib/generated/mobileProfitLossReport';
import { downloadMobilePdf, loadMobilePdfBrandAssets } from '@/lib/mobilePdfExport';
import { normalizeCategory } from '@/utils/categoryNormalizer';
import { getOpenFinanceCycles } from '../../../../../../shared/financeCycleAllocation';
import {
  getFarmDateKey,
  getFarmPeriodDateKeys,
  isDateKeyInRange,
  normalizeFarmDateKey,
} from '../../../../../../shared/farmDate';

interface Expense {
  id: string;
  amount: number;
  category: string;
  date: string;
  description: string;
  cycleId?: string;
  reference?: string;
}

interface Revenue {
  id: string;
  amount: number;
  category: string;
  date: string;
  description: string;
  cycleId?: string;
}

interface FinanceCycle { id: string; cycleName: string; status?: string }
interface InventoryUsage { date?: string; cycleId?: string; totalCost?: number }
interface InventoryItem { id: string; usageHistory?: InventoryUsage[] }

const PERIOD_OPTIONS = ['Today', 'This Week', 'This Month', 'This Year', 'All Time'];
const REPORT_TYPES = [
  { id: 'profit-loss', name: 'Profit & Loss', icon: TrendingUp, color: '#3498DB', desc: 'Income Statement' },
  { id: 'cogs', name: 'COGS Report', icon: Calculator, color: '#27AE60', desc: 'Cost of Production' },
  { id: 'cash-flow', name: 'Cash Flow', icon: CircleDollarSign, color: '#9B59B6', desc: 'Liquidity Analysis' },
];
const NON_OPEX_CATEGORIES = ['Loan Payment', 'Taxes', 'Interest', 'Equipment', 'Property', 'Infrastructure', 'Owner Withdrawal', 'Dividend'];
const INVESTING_CATEGORIES = ['Equipment', 'Property', 'Infrastructure'];
const FINANCING_CATEGORIES = ['Loan Payment', 'Owner Withdrawal', 'Dividend'];

const addBreakdown = (target: Record<string, number>, category: string, amount: number) => {
  const key = normalizeCategory(category);
  target[key] = (target[key] || 0) + amount;
};

export default function FinancialReportsPage() {
  const { formatCurrency, currencyConfig } = useCurrency();
  const { currentLanguage, t } = useLanguage();
  const { company, loading: authLoading } = useAuth();
  const [selectedReport, setSelectedReport] = useState('profit-loss');
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');
  const [cycleScope, setCycleScope] = useState('all');
  const [exportLoading, setExportLoading] = useState(false);
  const [openingInventory, setOpeningInventory] = useState(0);
  const [closingInventory, setClosingInventory] = useState(0);
  const { expenses, revenues, loading: financeLoading } = useFinanceRecords<Expense, Revenue>();
  const { data: cycles, loading: cyclesLoading } = useCompanyCycles<FinanceCycle>();
  const { data: feeds, loading: feedsLoading } = useCompanyFeeds<InventoryItem>();
  const { data: additives, loading: additivesLoading } = useCompanyAdditives<InventoryItem>();
  const activeCycles = useMemo(() => getOpenFinanceCycles(cycles), [cycles]);
  const loading = authLoading || financeLoading || cyclesLoading || feedsLoading || additivesLoading;

  const dateRange = useMemo(() => {
    const now = new Date();
    const today = getFarmDateKey(now, company?.timeZone);
    if (selectedPeriod === 'All Time') {
      const firstDate = [...expenses, ...revenues]
        .map((item) => normalizeFarmDateKey(item.date, company?.timeZone))
        .filter((value): value is string => Boolean(value))
        .sort()[0] || today;
      return {
        startDateKey: null as string | null,
        endDateKey: today,
        startDate: new Date(`${firstDate}T00:00:00.000Z`),
        endDate: new Date(`${today}T23:59:59.999Z`),
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
  }, [company?.timeZone, expenses, revenues, selectedPeriod]);

  const filteredExpenses = expenses.filter((expense) => (
    (cycleScope === 'all' || expense.cycleId === cycleScope)
    && isDateKeyInRange(expense.date, dateRange.startDateKey, dateRange.endDateKey, company?.timeZone)
  ));
  const filteredRevenues = revenues.filter((revenue) => (
    (cycleScope === 'all' || revenue.cycleId === cycleScope)
    && isDateKeyInRange(revenue.date, dateRange.startDateKey, dateRange.endDateKey, company?.timeZone)
  ));
  const usageMatchesScope = (usage: InventoryUsage) => Boolean(
    usage.date
    && usage.cycleId
    && (cycleScope === 'all' || usage.cycleId === cycleScope)
    && isDateKeyInRange(usage.date, dateRange.startDateKey, dateRange.endDateKey, company?.timeZone)
  );
  const feedUsageCost = feeds.flatMap((feed) => feed.usageHistory || [])
    .filter(usageMatchesScope)
    .reduce((sum, usage) => sum + (Number(usage.totalCost) || 0), 0);
  const additiveUsageCost = additives.flatMap((additive) => additive.usageHistory || [])
    .filter(usageMatchesScope)
    .reduce((sum, usage) => sum + (Number(usage.totalCost) || 0), 0);
  const cycleProductionExpenses = filteredExpenses.filter((expense) => (
    Boolean(expense.cycleId) && !expense.reference?.startsWith('INVENTORY-')
  ));

  const totalRevenue = filteredRevenues.reduce((sum, revenue) => sum + revenue.amount, 0);
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const previewProfit = totalRevenue - totalExpenses;

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const brandAssets = await loadMobilePdfBrandAssets('portrait');
      const companyName = company?.companyName || company?.id || 'Company';
      const startDate = dateRange.startDate.toISOString();
      const endDate = dateRange.endDate.toISOString();
      const revenueBreakdown: Record<string, number> = {};
      filteredRevenues.forEach((revenue) => addBreakdown(revenueBreakdown, revenue.category, revenue.amount));

      let html: string;
      let filename: string;

      if (selectedReport === 'profit-loss') {
        const cogsBreakdown: Record<string, number> = {};
        if (feedUsageCost) cogsBreakdown[t.financeCycle.feedUsage] = feedUsageCost;
        if (additiveUsageCost) cogsBreakdown[t.financeCycle.additiveUsage] = additiveUsageCost;
        cycleProductionExpenses.forEach((expense) => addBreakdown(cogsBreakdown, expense.category, expense.amount));
        const totalCOGS = feedUsageCost + additiveUsageCost
          + cycleProductionExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const opexExpenses = filteredExpenses.filter((expense) => {
          const category = normalizeCategory(expense.category);
          return !expense.cycleId
            && !expense.reference?.startsWith('INVENTORY-')
            && !NON_OPEX_CATEGORIES.includes(category);
        });
        const opexBreakdown: Record<string, number> = {};
        opexExpenses.forEach((expense) => addBreakdown(opexBreakdown, expense.category, expense.amount));
        const totalOPEX = opexExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const otherExpenses = filteredExpenses.filter((expense) => (
          ['Loan Payment', 'Taxes', 'Interest'].includes(normalizeCategory(expense.category))
        ));
        const otherExpenseBreakdown: Record<string, number> = {};
        otherExpenses.forEach((expense) => addBreakdown(otherExpenseBreakdown, expense.category, expense.amount));
        const totalOtherExpenses = otherExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const grossProfit = totalRevenue - totalCOGS;
        const operatingIncome = grossProfit - totalOPEX;
        const data: FinancialData = {
          period: selectedPeriod,
          startDate,
          endDate,
          companyName,
          totalRevenue,
          revenueBreakdown,
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
        const operatingActivities = {
          cashFromSales: 0,
          cashFromCustomers: 0,
          paymentToSuppliers: 0,
          paymentForExpenses: 0,
          otherOperatingCash: 0,
        };
        const investingActivities = { purchaseOfAssets: 0, saleOfAssets: 0, purchaseOfInvestments: 0, saleOfInvestments: 0 };
        const financingActivities = { loansReceived: 0, loanRepayments: 0, capitalContributed: 0, dividendsPaid: 0, ownerWithdrawals: 0 };
        filteredRevenues.forEach((revenue) => {
          if (normalizeCategory(revenue.category) === 'Shrimp Sales') operatingActivities.cashFromSales += revenue.amount;
          else operatingActivities.cashFromCustomers += revenue.amount;
        });
        filteredExpenses.forEach((expense) => {
          const category = normalizeCategory(expense.category);
          if (INVESTING_CATEGORIES.includes(category)) investingActivities.purchaseOfAssets += expense.amount;
          else if (FINANCING_CATEGORIES.includes(category)) {
            if (category === 'Loan Payment') financingActivities.loanRepayments += expense.amount;
            else financingActivities.ownerWithdrawals += expense.amount;
          } else if (category === 'Feed' || category === 'Pond Additives') operatingActivities.paymentToSuppliers += expense.amount;
          else operatingActivities.paymentForExpenses += expense.amount;
        });
        const previousRevenue = revenues
          .filter((revenue) => {
            const key = normalizeFarmDateKey(revenue.date, company?.timeZone);
            return Boolean(dateRange.startDateKey && key && key < dateRange.startDateKey);
          })
          .reduce((sum, revenue) => sum + revenue.amount, 0);
        const previousExpenses = expenses
          .filter((expense) => {
            const key = normalizeFarmDateKey(expense.date, company?.timeZone);
            return Boolean(dateRange.startDateKey && key && key < dateRange.startDateKey);
          })
          .reduce((sum, expense) => sum + expense.amount, 0);
        const data: CashFlowData = {
          period: selectedPeriod,
          startDate,
          endDate,
          companyName,
          openingBalance: previousRevenue - previousExpenses,
          operatingActivities,
          investingActivities,
          financingActivities,
          currencyCode: currencyConfig.code,
          currencySymbol: currencyConfig.symbol,
        };
        html = generateCashFlowHTML(data, brandAssets, currentLanguage);
        filename = `Cash_Flow_${selectedPeriod.replace(/\s+/g, '_')}.pdf`;
      } else {
        const purchases = feedUsageCost + cycleProductionExpenses
          .filter((expense) => normalizeCategory(expense.category) === 'Feed')
          .reduce((sum, expense) => sum + expense.amount, 0);
        const directLabor = cycleProductionExpenses
          .filter((expense) => normalizeCategory(expense.category) === 'Labor')
          .reduce((sum, expense) => sum + expense.amount, 0);
        const directMaterials = additiveUsageCost + cycleProductionExpenses
          .filter((expense) => !['Feed', 'Labor'].includes(normalizeCategory(expense.category)))
          .reduce((sum, expense) => sum + expense.amount, 0);
        const cogsBreakdown: Record<string, number> = {};
        if (feedUsageCost) cogsBreakdown[t.financeCycle.feedUsage] = feedUsageCost;
        if (additiveUsageCost) cogsBreakdown[t.financeCycle.additiveUsage] = additiveUsageCost;
        cycleProductionExpenses.forEach((expense) => addBreakdown(cogsBreakdown, expense.category, expense.amount));
        const data = prepareCOGSData(
          selectedPeriod,
          startDate,
          endDate,
          companyName,
          openingInventory,
          purchases,
          directLabor,
          directMaterials,
          closingInventory,
          totalRevenue,
          cogsBreakdown,
          currencyConfig.code,
          currencyConfig.symbol,
        );
        html = generateCOGSHTML(data, brandAssets, currentLanguage);
        filename = `COGS_${selectedPeriod.replace(/\s+/g, '_')}.pdf`;
      }

      await downloadMobilePdf({ html, filename, orientation: 'portrait' });
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><Loader2 className="animate-spin" size={40} color="var(--primary)" /></div>;
  }

  return (
    <div className="dashboard-page-relaxed authenticated-compact-page">
      <div className="dashboard-report-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <div>
            <h2 style={{ fontSize: '18px', lineHeight: '26px', fontWeight: 600, marginBottom: '14px' }}>Select Report Type</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              {REPORT_TYPES.map((type) => (
                <button key={type.id} type="button" onClick={() => setSelectedReport(type.id)} className="glass-card" style={{ padding: '18px', cursor: 'pointer', textAlign: 'left', border: selectedReport === type.id ? `1px solid ${type.color}` : '1px solid var(--border)', background: selectedReport === type.id ? `${type.color}10` : '#FFF', position: 'relative' }}>
                  <span style={{ width: '38px', height: '38px', borderRadius: '11px', background: `${type.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}><type.icon size={20} color={type.color} /></span>
                  <span style={{ display: 'block', fontWeight: 600, fontSize: '15px' }}>{type.name}</span>
                  <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px', lineHeight: 1.45 }}>{type.desc}</span>
                  {selectedReport === type.id ? <CheckCircle2 size={18} color={type.color} style={{ position: 'absolute', top: '14px', right: '14px' }} /> : null}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: '18px', lineHeight: '26px', fontWeight: 600, marginBottom: '14px' }}>{t.financeCycle.selectPeriod}</h2>
            <div className="dashboard-segmented-tabs" style={{ width: '100%' }}>
              {PERIOD_OPTIONS.map((period) => <button key={period} type="button" onClick={() => setSelectedPeriod(period)} className={`dashboard-segmented-tab ${selectedPeriod === period ? 'active' : ''}`} style={{ flex: 1 }}>{period}</button>)}
            </div>
            <div className="dashboard-segmented-tabs" style={{ width: '100%', marginTop: '8px', overflowX: 'auto' }}>
              {[...activeCycles.map((cycle) => ({ key: cycle.id, label: cycle.cycleName })), { key: 'all', label: t.financeCycle.allHistory }].map((scope) => <button key={scope.key} type="button" onClick={() => setCycleScope(scope.key)} className={`dashboard-segmented-tab ${cycleScope === scope.key ? 'active' : ''}`} style={{ minWidth: '110px' }}>{scope.label}</button>)}
            </div>
          </div>

          {selectedReport === 'cogs' ? (
            <div className="glass-card" style={{ padding: '20px', background: '#FFF' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>{t.financeCycle.inventoryAdjustment}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Opening Inventory ({currencyConfig.symbol})<input type="number" value={openingInventory} onChange={(event) => setOpeningInventory(Number(event.target.value))} className="form-input" placeholder="0" style={{ marginTop: '8px' }} /></label>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Closing Inventory ({currencyConfig.symbol})<input type="number" value={closingInventory} onChange={(event) => setClosingInventory(Number(event.target.value))} className="form-input" placeholder="0" style={{ marginTop: '8px' }} /></label>
              </div>
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-card" style={{ background: '#FFF', padding: '22px', position: 'sticky', top: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}><FileText size={21} color="var(--primary)" /><h2 style={{ fontSize: '18px', fontWeight: 600 }}>Report Preview</h2></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}><span style={{ color: 'var(--text-muted)' }}>Revenue</span><span style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(totalRevenue)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}><span style={{ color: 'var(--text-muted)' }}>Expenses</span><span style={{ fontWeight: 600, color: 'var(--error)' }}>{formatCurrency(totalExpenses)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px' }}><span style={{ fontWeight: 600 }}>{previewProfit >= 0 ? 'Net Profit' : 'Net Loss'}</span><span style={{ fontWeight: 600, fontSize: '20px', color: previewProfit >= 0 ? 'var(--success)' : 'var(--error)' }}>{formatCurrency(Math.abs(previewProfit))}</span></div>
            </div>
            <div style={{ marginTop: '24px', padding: '14px', background: 'var(--bg-mid)', borderRadius: '14px', display: 'flex', gap: '12px', marginBottom: '24px' }}><AlertCircle size={20} color="var(--primary)" style={{ flexShrink: 0 }} /><p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>Your PDF uses the same report template as the mobile application.</p></div>
            <button className="btn-primary" type="button" onClick={handleExport} disabled={exportLoading} style={{ width: '100%', padding: '14px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              {exportLoading ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
              <span style={{ fontWeight: 600 }}>{exportLoading ? 'Generating PDF...' : 'Download Statement'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
