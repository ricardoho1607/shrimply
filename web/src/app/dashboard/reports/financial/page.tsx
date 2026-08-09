"use client";

import React, { useMemo, useState } from 'react';
import {
  TrendingUp, 
  Calculator, 
  CircleDollarSign, 
  BarChart3, 
  Download, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText
} from 'lucide-react';
import { normalizeCategory } from '@/utils/categoryNormalizer';
import { useRouter } from 'next/navigation';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getFarmPeriodDateKeys, isDateKeyInRange } from '../../../../../../shared/farmDate';
import {
  formatPdfDate,
  formatPdfDateTime,
  localizePdfHtml,
  type PdfLanguage,
} from '../../../../../../shared/pdfReportI18n';
import {
  useCompanyAdditives,
  useCompanyCycles,
  useCompanyFeeds,
  useFinanceRecords,
} from '@/hooks/useDashboardData';
import { getOpenFinanceCycles } from '../../../../../../shared/financeCycleAllocation';

/* --- Types ----------------------------------------------- */
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

interface FinancialData {
  startDate: string;
  endDate: string;
  companyName: string;
  totalRevenue: number;
  revenueBreakdown: Record<string, number>;
  totalCOGS: number;
  cogsBreakdown: Record<string, number>;
  grossProfit: number;
  totalOPEX: number;
  opexBreakdown: Record<string, number>;
  operatingIncome: number;
  netProfit: number;
}

interface CashFlowReportData {
  startDate: string;
  endDate: string;
  companyName: string;
  openingBalance: number;
  operating: {
    cashFromSales: number;
    cashFromCustomers: number;
    paymentToSuppliers: number;
    paymentForExpenses: number;
  };
  investing: {
    purchaseOfAssets: number;
    saleOfAssets: number;
  };
  financing: {
    loansReceived: number;
    loanRepayments: number;
    ownerWithdrawals: number;
  };
}

interface COGSReportData {
  startDate: string;
  endDate: string;
  companyName: string;
  openingInventory: number;
  purchases: number;
  directLabor: number;
  directMaterials: number;
  closingInventory: number;
  revenue: number;
  totalCOGS: number;
  grossProfit: number;
  grossProfitMargin: number;
}

interface Html2PdfOptions {
  margin: [number, number, number, number];
  filename: string;
  image: { type: 'jpeg'; quality: number };
  html2canvas: { scale: number; useCORS: boolean };
  jsPDF: { unit: 'mm'; format: 'a4'; orientation: 'portrait' };
}

interface Html2PdfWorker {
  from: (element: HTMLElement) => Html2PdfWorker;
  set: (options: Html2PdfOptions) => Html2PdfWorker;
  save: () => Promise<void>;
}

type Html2PdfFactory = () => Html2PdfWorker;

/* --- Helper Functions ------------------------------------ */

const formatDate = (dateStr: string, language: PdfLanguage): string => formatPdfDate(dateStr, language);

/* --- HTML Generators (1:1 Mobile Parity) --------------- */
const generateProfitLossHTML = (data: FinancialData, formatCurrency: (v: number) => string, currencyCode: string, language: PdfLanguage): string => {
  const { 
    startDate, endDate, companyName, totalRevenue, revenueBreakdown,
    totalCOGS, cogsBreakdown, grossProfit, totalOPEX, opexBreakdown,
    operatingIncome, netProfit
  } = data;

  return localizePdfHtml(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #2C3E50; background: #ffffff; font-size: 13px; line-height: 1.5; }
        .header { margin-bottom: 25px; }
        .title { font-size: 28px; font-weight: 700; color: #111827; margin-bottom: 6px; }
        .company-name { font-size: 14px; color: #2C3E50; margin-bottom: 3px; font-weight: 600; }
        .subtitle { font-size: 13px; color: #4A5568; }
        .date-range { font-size: 13px; color: #2C3E50; margin-bottom: 20px; }
        .divider { height: 3px; background: #374151; margin: 15px 0; border-radius: 2px; }
        .section { margin-bottom: 20px; }
        .section-title { font-size: 14px; font-weight: 700; color: #2C3E50; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #BDC3C7; padding-bottom: 4px; }
        .line-item { display: flex; justify-content: space-between; padding: 6px 0; }
        .line-item.category { color: #34495E; padding-left: 10px; }
        .line-item.total { font-weight: 700; font-size: 14px; border-top: 1px solid #BDC3C7; padding: 8px 0; margin-top: 4px; color: #2C3E50; }
        .line-item.gross { font-weight: 700; font-size: 15px; border-top: 2px solid #34495E; border-bottom: 1px solid #34495E; padding: 10px 0; margin-top: 8px; color: #2C3E50; background: #F8FAFB; padding-left: 10px; padding-right: 10px; }
        .line-item.net { font-weight: 700; font-size: 16px; border-bottom: 3px double #34495E; border-top: 2px solid #34495E; padding: 12px 10px; margin-top: 10px; background: #F0F4F8; }
        .amount { text-align: right; font-variant-numeric: tabular-nums; }
        .amount.positive { color: #111827; }
        .amount.negative { color: #111827; }
        .currency { font-size: 11px; color: #4A5568; display: inline-block; margin-left: 4px; }
        .summary-box { background: #FFFFFF; border: 1px solid #6B7280; padding: 12px; margin-top: 25px; border-radius: 0; }
        .summary-item { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; }
        .summary-item.highlight { font-weight: 700; font-size: 15px; color: #2C3E50; border-top: 1px solid #BDC3C7; margin-top: 8px; padding-top: 8px; }
        .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ECF0F1; font-size: 11px; color: #4A5568; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">Income Statement</div>
        <div class="company-name">${companyName}</div>
        <div class="subtitle">Multi-Step Profit & Loss</div>
        <div class="date-range">For the period ${formatDate(startDate, language)} - ${formatDate(endDate, language)}</div>
      </div>
      <div class="divider"></div>
      <div class="section">
        <div class="section-title">Revenue</div>
        ${Object.entries(revenueBreakdown).map(([category, amount]) => `
          <div class="line-item category">
            <span>${category}</span>
            <span class="amount">${formatCurrency(amount)}</span>
          </div>
        `).join('')}
        <div class="line-item total">
          <span>Total Revenue</span>
          <span class="amount">${formatCurrency(totalRevenue)}</span>
        </div>
      </div>
      <div class="section">
        <div class="section-title">Cost of Goods Sold (COGS)</div>
        ${Object.entries(cogsBreakdown).map(([category, amount]) => `
          <div class="line-item category">
            <span>${category}</span>
            <span class="amount">${formatCurrency(amount)}</span>
          </div>
        `).join('')}
        <div class="line-item total">
          <span>Total Cost of Goods Sold</span>
          <span class="amount">(${formatCurrency(totalCOGS)})</span>
        </div>
      </div>
      <div class="line-item gross">
        <span>Gross Profit</span>
        <span class="amount">${formatCurrency(grossProfit)}</span>
      </div>
      <br/>
      <div class="section">
        <div class="section-title">Operating Expenses (OPEX)</div>
        ${Object.entries(opexBreakdown).map(([category, amount]) => `
          <div class="line-item category">
            <span>${category}</span>
            <span class="amount">${formatCurrency(amount)}</span>
          </div>
        `).join('')}
        <div class="line-item total">
          <span>Total Operating Expenses</span>
          <span class="amount">(${formatCurrency(totalOPEX)})</span>
        </div>
      </div>
      <div class="line-item gross">
        <span>Operating Income (EBITDA)</span>
        <span class="amount">${formatCurrency(operatingIncome)}</span>
      </div>
      <br/>
      <div class="line-item net ${netProfit >= 0 ? '' : 'negative'}">
        <span>Net ${netProfit >= 0 ? 'Income' : 'Loss'}</span>
        <div>
          <span class="amount ${netProfit >= 0 ? 'positive' : 'negative'}">${formatCurrency(Math.abs(netProfit))}</span>
          <span class="currency">${currencyCode}</span>
        </div>
      </div>
      <div class="summary-box">
        <div class="summary-item">
          <span>Gross Profit Margin:</span>
          <span>${totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(2) : '0.00'}%</span>
        </div>
        <div class="summary-item highlight">
          <span>Net Profit Margin:</span>
          <span class="${netProfit >= 0 ? 'positive' : 'negative'}">${totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : '0.00'}%</span>
        </div>
      </div>
      <div class="footer">
        Generated by Shrimply Aquaculture Management on ${formatPdfDateTime(new Date(), language)} - ${companyName}
      </div>
    </body>
    </html>
  `, language);
};

const generateCashFlowHTML = (data: CashFlowReportData, formatCurrency: (v: number) => string, language: PdfLanguage): string => {
  const { startDate, endDate, companyName, openingBalance, operating, investing, financing } = data;
  const netOperating = operating.cashFromSales + operating.cashFromCustomers - operating.paymentToSuppliers - operating.paymentForExpenses;
  const netInvesting = investing.saleOfAssets - investing.purchaseOfAssets;
  const netFinancing = financing.loansReceived - financing.loanRepayments - financing.ownerWithdrawals;
  const netChange = netOperating + netInvesting + netFinancing;
  const closingBalance = openingBalance + netChange;

  return localizePdfHtml(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #2C3E50; background: #ffffff; font-size: 14px; line-height: 1.6; }
        .header { margin-bottom: 30px; }
        .title { font-size: 32px; font-weight: 700; color: #111827; margin-bottom: 8px; }
        .company-name { font-size: 15px; color: #2C3E50; margin-bottom: 4px; }
        .date-range { font-size: 14px; color: #2C3E50; margin-bottom: 30px; }
        .divider { height: 3px; background: #374151; margin: 20px 0; border-radius: 2px; }
        .section { margin-bottom: 25px; }
        .section-title { font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 12px; text-transform: uppercase; background: #FFFFFF; padding: 8px 0; border-bottom: 1px solid #6B7280; }
        .line-item { display: flex; justify-content: space-between; padding: 8px 0 8px 20px; border-bottom: 1px solid #ECF0F1; }
        .line-item.subtotal { font-weight: 700; font-size: 15px; border-bottom: 2px solid #374151; padding: 12px; margin-top: 8px; color: #111827; background: #FFFFFF; }
        .line-item.balance { font-weight: 700; font-size: 16px; padding: 12px; background: #FFFFFF; border: 1px solid #6B7280; }
        .line-item.closing { font-weight: 700; font-size: 17px; color: #111827; border-bottom: 3px double #374151; padding: 15px 12px; margin-top: 15px; background: #FFFFFF; }
        .amount { text-align: right; font-variant-numeric: tabular-nums; }
        .amount.positive { color: #111827; }
        .amount.negative { color: #111827; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #ECF0F1; font-size: 12px; color: #2C3E50; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">Statement of Cash Flows</div>
        <div class="company-name">${companyName}</div>
        <div class="date-range">For the period ${formatDate(startDate, language)} - ${formatDate(endDate, language)}</div>
      </div>
      <div class="divider"></div>
      <div class="section">
        <div class="line-item balance">
          <span>Cash at Beginning of Period</span>
          <span class="amount">${formatCurrency(openingBalance)}</span>
        </div>
      </div>
      <div class="section">
        <div class="section-title">Operating Activities</div>
        <div class="line-item"><span>Cash Received from Sales</span><span class="amount positive">${formatCurrency(operating.cashFromSales)}</span></div>
        <div class="line-item"><span>Cash Paid to Suppliers</span><span class="amount negative">(${formatCurrency(operating.paymentToSuppliers)})</span></div>
        <div class="line-item"><span>Cash Paid for Operating Expenses</span><span class="amount negative">(${formatCurrency(operating.paymentForExpenses)})</span></div>
        <div class="line-item subtotal"><span>Net Cash from Operating Activities</span><span class="amount ${netOperating >= 0 ? 'positive' : 'negative'}">${formatCurrency(netOperating)}</span></div>
      </div>
      <div class="section">
        <div class="section-title">Investing Activities</div>
        <div class="line-item"><span>Purchase of Assets</span><span class="amount negative">(${formatCurrency(investing.purchaseOfAssets)})</span></div>
        <div class="line-item subtotal"><span>Net Cash from Investing Activities</span><span class="amount negative">(${formatCurrency(investing.purchaseOfAssets)})</span></div>
      </div>
      <div class="section">
        <div class="line-item total">
          <div class="line-item closing"><span>Cash at End of Period</span><span class="amount">${formatCurrency(closingBalance)}</span></div>
        </div>
      </div>
      <div class="footer">
        Generated by Shrimply Aquaculture Management on ${formatPdfDateTime(new Date(), language)} - ${companyName}
      </div>
    </body>
    </html>
  `, language);
};

const generateCOGSHTML = (data: COGSReportData, formatCurrency: (v: number) => string, language: PdfLanguage): string => {
  const { startDate, endDate, companyName, openingInventory, purchases, directLabor, directMaterials, closingInventory, revenue, totalCOGS, grossProfit, grossProfitMargin } = data;
  return localizePdfHtml(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #2C3E50; background: #ffffff; font-size: 14px; line-height: 1.6; }
        .header { margin-bottom: 30px; }
        .title { font-size: 32px; font-weight: 700; color: #111827; margin-bottom: 8px; }
        .company-name { font-size: 15px; color: #2C3E50; margin-bottom: 4px; }
        .divider { height: 3px; background: #374151; margin: 20px 0; border-radius: 2px; }
        .section { margin-bottom: 25px; }
        .section-title { font-size: 15px; font-weight: 700; color: #2C3E50; margin-bottom: 12px; text-transform: uppercase; }
        .line-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ECF0F1; }
        .line-item.total { font-weight: 700; font-size: 15px; border-bottom: 2px solid #34495E; padding: 12px 0; margin-top: 8px; color: #2C3E50; }
        .line-item.subtotal { font-weight: 600; font-size: 14px; border-bottom: 1px solid #6B7280; padding: 10px; margin-top: 8px; background: #FFFFFF; }
        .metric-box { background: #FFFFFF; color: #111827; padding: 20px; margin-bottom: 20px; border: 2px solid #374151; text-align: center; }
        .metric-value { font-size: 32px; font-weight: 700; }
        .amount { text-align: right; font-variant-numeric: tabular-nums; }
        .amount.positive { color: #111827; }
        .amount.negative { color: #111827; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #ECF0F1; font-size: 12px; color: #2C3E50; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">Cost of Goods Sold</div>
        <div class="company-name">${companyName}</div>
        <div class="date-range">For ${formatDate(startDate, language)} - ${formatDate(endDate, language)}</div>
      </div>
      <div class="metric-box">
        <div style="font-size: 13px; opacity: 0.9; margin-bottom: 8px;">GROSS PROFIT MARGIN</div>
        <div class="metric-value">${grossProfitMargin.toFixed(2)}%</div>
      </div>
      <div class="divider"></div>
      <div class="section">
        <div class="section-title">COGS Calculation</div>
        <div class="line-item"><span>Opening Inventory</span><span class="amount">${formatCurrency(openingInventory)}</span></div>
        <div class="line-item"><span>Add: Purchases (Feed & Materials)</span><span class="amount">${formatCurrency(purchases)}</span></div>
        <div class="line-item"><span>Add: Direct Labor</span><span class="amount">${formatCurrency(directLabor)}</span></div>
        <div class="line-item subtotal"><span>Goods Available for Sale</span><span class="amount">${formatCurrency(openingInventory + purchases + directLabor + directMaterials)}</span></div>
        <div class="line-item"><span>Less: Closing Inventory</span><span class="amount negative">(${formatCurrency(closingInventory)})</span></div>
        <div class="line-item total"><span>Total Cost of Goods Sold</span><span class="amount negative">${formatCurrency(totalCOGS)}</span></div>
      </div>
      <div class="section">
        <div class="section-title">Gross Profit Analysis</div>
        <div class="line-item"><span>Total Revenue</span><span class="amount positive">${formatCurrency(revenue)}</span></div>
        <div class="line-item"><span>Less: Cost of Goods Sold</span><span class="amount negative">(${formatCurrency(totalCOGS)})</span></div>
        <div class="line-item total" style="color: #111827; border-bottom: 3px double #374151; font-size: 18px;"><span>Gross Profit</span><span class="amount">${formatCurrency(grossProfit)}</span></div>
      </div>
      <div class="footer">
        Generated by Shrimply Aquaculture Management on ${formatPdfDateTime(new Date(), language)} - ${companyName}
      </div>
    </body>
    </html>
  `, language);
};

export default function FinancialReportsPage() {
  const { formatCurrency, currencyConfig } = useCurrency();
  const { currentLanguage, t } = useLanguage();
  const router = useRouter();
  const { company, loading: authLoading } = useAuth();
  const [selectedReport, setSelectedReport] = useState('profit-loss');
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');
  const [cycleScope, setCycleScope] = useState('all');
  const [exportLoading, setExportLoading] = useState(false);
  const { expenses, revenues, loading: financeLoading } = useFinanceRecords<Expense, Revenue>();
  const { data: cycles, loading: cyclesLoading } = useCompanyCycles<FinanceCycle>();
  const { data: feeds, loading: feedsLoading } = useCompanyFeeds<InventoryItem>();
  const { data: additives, loading: additivesLoading } = useCompanyAdditives<InventoryItem>();
  const activeCycles = useMemo(() => getOpenFinanceCycles(cycles), [cycles]);
  const loading = authLoading || financeLoading || cyclesLoading || feedsLoading || additivesLoading;

  // COGS Inventory State
  const [openingInventory, setOpeningInventory] = useState(0);
  const [closingInventory, setClosingInventory] = useState(0);

  const PERIOD_OPTIONS = ['Today', 'This Week', 'This Month', 'This Year', 'All Time'];
  
  const REPORT_TYPES = [
    { id: 'profit-loss', name: 'Profit & Loss', icon: TrendingUp, color: '#3498DB', desc: 'Income Statement' },
    { id: 'cogs', name: 'COGS Report', icon: Calculator, color: '#27AE60', desc: 'Cost of Production' },
    { id: 'cash-flow', name: 'Cash Flow', icon: CircleDollarSign, color: '#9B59B6', desc: 'Liquidity Analysis' },
    { id: 'harvest-projections', name: 'Harvest Projections', icon: BarChart3, color: '#E74C3C', desc: 'Future Estimates' },
  ];

  const getDateRange = () => {
    const now = new Date();
    const period = selectedPeriod === 'Today'
      ? 'today'
      : selectedPeriod === 'This Week'
        ? 'week'
        : selectedPeriod === 'This Month'
          ? 'month'
          : selectedPeriod === 'This Year'
            ? 'year'
            : 'all';
    const { startDateKey, endDateKey } = getFarmPeriodDateKeys(period, now, company?.timeZone);
    return {
      startDateKey,
      endDateKey,
      startDate: new Date(`${startDateKey || '1970-01-01'}T00:00:00.000Z`),
      endDate: new Date(`${endDateKey}T23:59:59.999Z`),
    };
  };

  const { startDate, endDate, startDateKey, endDateKey } = getDateRange();
  const filteredExpenses = expenses.filter(e => (
    (cycleScope === 'all' || e.cycleId === cycleScope)
    && isDateKeyInRange(e.date, startDateKey, endDateKey, company?.timeZone)
  ));
  const filteredRevenues = revenues.filter(r => (
    (cycleScope === 'all' || r.cycleId === cycleScope)
    && isDateKeyInRange(r.date, startDateKey, endDateKey, company?.timeZone)
  ));
  const usageMatchesScope = (usage: InventoryUsage) => Boolean(
    usage.date
    && usage.cycleId
    && (cycleScope === 'all' || usage.cycleId === cycleScope)
    && isDateKeyInRange(usage.date, startDateKey, endDateKey, company?.timeZone)
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

  // Financial Calculations for Preview
  const totalRev = filteredRevenues.reduce((s, r) => s + r.amount, 0);
  const totalExp = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalRev - totalExp;

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const html2pdf = ((await import('html2pdf.js')) as { default: Html2PdfFactory }).default;
      
      let html = '';
      let fileName = '';

      if (selectedReport === 'profit-loss') {
        const revBreakdown: Record<string, number> = {};
        filteredRevenues.forEach(r => revBreakdown[r.category] = (revBreakdown[r.category] || 0) + r.amount);
        
        const cogsExp = cycleProductionExpenses;
        const cogsBreakdown: Record<string, number> = {};
        if (feedUsageCost) cogsBreakdown[t.financeCycle.feedUsage] = feedUsageCost;
        if (additiveUsageCost) cogsBreakdown[t.financeCycle.additiveUsage] = additiveUsageCost;
        cogsExp.forEach(e => cogsBreakdown[e.category] = (cogsBreakdown[e.category] || 0) + e.amount);
        const totalCOGS = feedUsageCost + additiveUsageCost + cogsExp.reduce((s, e) => s + e.amount, 0);
        
        const opexExp = filteredExpenses.filter(e => !e.cycleId && !e.reference?.startsWith('INVENTORY-'));
        const opexBreakdown: Record<string, number> = {};
        opexExp.forEach(e => opexBreakdown[e.category] = (opexBreakdown[e.category] || 0) + e.amount);
        const totalOPEX = opexExp.reduce((s, e) => s + e.amount, 0);

        const data: FinancialData = {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          companyName: company?.companyName || 'My Farm',
          totalRevenue: totalRev,
          revenueBreakdown: revBreakdown,
          totalCOGS,
          cogsBreakdown,
          grossProfit: totalRev - totalCOGS,
          totalOPEX,
          opexBreakdown,
          operatingIncome: totalRev - totalCOGS - totalOPEX,
          netProfit: totalRev - totalCOGS - totalOPEX
        };
        html = generateProfitLossHTML(data, formatCurrency, currencyConfig.code, currentLanguage);
        fileName = `ProfitLoss_${company?.companyName || 'Farm'}_${selectedPeriod}.pdf`;
      } else if (selectedReport === 'cash-flow') {
        const operating = {
          cashFromSales: filteredRevenues.reduce((s, r) => s + r.amount, 0),
          cashFromCustomers: 0,
          paymentToSuppliers: filteredExpenses.filter(e => ['Feed', 'Additives'].includes(normalizeCategory(e.category))).reduce((s, e) => s + e.amount, 0),
          paymentForExpenses: filteredExpenses.filter(e => !['Feed', 'Additives'].includes(normalizeCategory(e.category))).reduce((s, e) => s + e.amount, 0)
        };
        const data = {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          companyName: company?.companyName || 'My Farm',
          openingBalance: 0,
          operating,
          investing: { purchaseOfAssets: 0, saleOfAssets: 0 },
          financing: { loansReceived: 0, loanRepayments: 0, ownerWithdrawals: 0 }
        };
        html = generateCashFlowHTML(data, formatCurrency, currentLanguage);
        fileName = `CashFlow_${company?.companyName || 'Farm'}_${selectedPeriod}.pdf`;
      } else if (selectedReport === 'cogs') {
        const purchases = feedUsageCost + cycleProductionExpenses.filter(e => normalizeCategory(e.category) === 'Feed').reduce((s, e) => s + e.amount, 0);
        const labor = cycleProductionExpenses.filter(e => normalizeCategory(e.category) === 'Labor').reduce((s, e) => s + e.amount, 0);
        const materials = additiveUsageCost + cycleProductionExpenses.filter(e => !['Feed', 'Labor'].includes(normalizeCategory(e.category))).reduce((s, e) => s + e.amount, 0);
        const totalCOGS = openingInventory + purchases + labor + materials - closingInventory;
        const data = {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          companyName: company?.companyName || 'My Farm',
          openingInventory,
          purchases,
          directLabor: labor,
          directMaterials: materials,
          closingInventory,
          revenue: totalRev,
          totalCOGS,
          grossProfit: totalRev - totalCOGS,
          grossProfitMargin: totalRev > 0 ? ((totalRev - totalCOGS) / totalRev) * 100 : 0
        };
        html = generateCOGSHTML(data, formatCurrency, currentLanguage);
        fileName = `COGS_${company?.companyName || 'Farm'}_${selectedPeriod}.pdf`;
      } else if (selectedReport === 'harvest-projections') {
        // Redirect to projections page for full tool
        router.push('/dashboard/projections');
        return;
      }

      const element = document.createElement('div');
      element.innerHTML = html;
      document.body.appendChild(element);

      const opt: Html2PdfOptions = {
        margin: [15, 15, 15, 15] as [number, number, number, number],
        filename: fileName,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      };

      await html2pdf().from(element).set(opt).save();
      document.body.removeChild(element);

    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><Loader2 className="animate-spin" size={40} color="var(--primary)" /></div>;

  return (
    <div className="dashboard-page-relaxed">
      <div className="glass-card" style={{ padding: '20px 22px', background: '#FFF', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary-dim)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileText size={21} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 850, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Reports</div>
            <h1 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-primary)', margin: 0, letterSpacing: 0 }}>Financial Reports</h1>
          </div>
        </div>
      </div>

      <div className="dashboard-report-grid">
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          
          {/* Report Type Grid */}
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 850, marginBottom: '14px' }}>Select Report Type</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              {REPORT_TYPES.map((type) => (
                <div 
                  key={type.id}
                  onClick={() => setSelectedReport(type.id)}
                  className="glass-card"
                  style={{ 
                    padding: '18px',
                    cursor: 'pointer',
                    border: selectedReport === type.id ? `1px solid ${type.color}` : '1px solid var(--border)',
                    background: selectedReport === type.id ? `${type.color}10` : '#FFF',
                    position: 'relative'
                  }}
                >
                  <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: `${type.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                    <type.icon size={20} color={type.color} />
                  </div>
                  <div style={{ fontWeight: 850, fontSize: '15px' }}>{type.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px', lineHeight: 1.45 }}>{type.desc}</div>
                  {selectedReport === type.id && (
                    <div style={{ position: 'absolute', top: '14px', right: '14px' }}>
                      <CheckCircle2 size={18} color={type.color} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Period Selection */}
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 850, marginBottom: '14px' }}>{t.financeCycle.selectPeriod}</h2>
            <div className="dashboard-segmented-tabs" style={{ width: '100%' }}>
              {PERIOD_OPTIONS.map(period => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`dashboard-segmented-tab ${selectedPeriod === period ? 'active' : ''}`}
                  style={{ flex: 1 }}
                >
                  {period}
                </button>
              ))}
            </div>
            <div className="dashboard-segmented-tabs" style={{ width: '100%', marginTop: '8px', overflowX: 'auto' }}>
              {[...activeCycles.map((cycle) => ({ key: cycle.id, label: cycle.cycleName })), { key: 'all', label: t.financeCycle.allHistory }].map((scope) => (
                <button
                  key={scope.key}
                  onClick={() => setCycleScope(scope.key)}
                  className={`dashboard-segmented-tab ${cycleScope === scope.key ? 'active' : ''}`}
                  style={{ minWidth: '110px' }}
                >
                  {scope.label}
                </button>
              ))}
            </div>
          </div>

          {selectedReport === 'cogs' && (
            <div className="glass-card" style={{ padding: '20px', background: '#FFF' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>{t.financeCycle.inventoryAdjustment}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Opening Inventory ({currencyConfig.symbol})</label>
                  <input 
                    type="number" 
                    value={openingInventory} 
                    onChange={(e) => setOpeningInventory(Number(e.target.value))} 
                    className="form-input"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Closing Inventory ({currencyConfig.symbol})</label>
                  <input 
                    type="number" 
                    value={closingInventory} 
                    onChange={(e) => setClosingInventory(Number(e.target.value))} 
                    className="form-input"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Preview & Export */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="glass-card" style={{ background: '#FFF', padding: '22px', position: 'sticky', top: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <FileText size={21} color="var(--primary)" />
              <h2 style={{ fontSize: '18px', fontWeight: 850 }}>Report Preview</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Revenue</span>
                <span style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(totalRev)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Expenses</span>
                <span style={{ fontWeight: 700, color: 'var(--error)' }}>{formatCurrency(totalExp)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px' }}>
                <span style={{ fontWeight: 800 }}>{netProfit >= 0 ? 'Net Profit' : 'Net Loss'}</span>
                <span style={{ fontWeight: 800, fontSize: '20px', color: netProfit >= 0 ? 'var(--success)' : 'var(--error)' }}>{formatCurrency(Math.abs(netProfit))}</span>
              </div>
            </div>

            <div style={{ marginTop: '24px', padding: '14px', background: 'var(--bg-mid)', borderRadius: '14px', display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <AlertCircle size={20} color="var(--primary)" style={{ flexShrink: 0 }} />
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Your PDF will be generated using the professional multi-step format from the mobile application.
              </p>
            </div>

            <button 
              className="btn-primary" 
              onClick={selectedReport === 'harvest-projections' ? () => router.push('/dashboard/projections') : handleExport}
              disabled={exportLoading}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
            >
              {exportLoading ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
              <span style={{ fontWeight: 700 }}>{exportLoading ? 'Generating PDF...' : selectedReport === 'harvest-projections' ? 'Go to Projections' : 'Download Statement'}</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
