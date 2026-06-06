"use client";

import React, { useState } from 'react';
import {
  TrendingUp, 
  Calculator, 
  CircleDollarSign, 
  BarChart3, 
  Download, 
  Calendar,
  Loader2,
  ChevronRight,
  PieChart,
  Wallet,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileText
} from 'lucide-react';
import { normalizeCategory } from '@/utils/categoryNormalizer';
import { useRouter } from 'next/navigation';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyPonds, useFinanceRecords } from '@/hooks/useDashboardData';

/* ─── Types ─────────────────────────────────────────────── */
interface Expense {
  id: string;
  amount: number;
  category: string;
  date: string;
  description: string;
}

interface Revenue {
  id: string;
  amount: number;
  category: string;
  date: string;
  description: string;
}

interface FinancialData {
  period: string;
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
  totalOtherExpenses: number;
  otherExpenseBreakdown: Record<string, number>;
  netProfit: number;
}

/* ─── Helper Functions ──────────────────────────────────── */

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

/* ─── HTML Generators (1:1 Mobile Parity) ─────────────── */
const generateProfitLossHTML = (data: FinancialData, formatCurrency: (v: number) => string, currencyCode: string): string => {
  const { 
    period, startDate, endDate, companyName, totalRevenue, revenueBreakdown,
    totalCOGS, cogsBreakdown, grossProfit, totalOPEX, opexBreakdown,
    operatingIncome, totalOtherExpenses, otherExpenseBreakdown, netProfit
  } = data;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #2C3E50; background: #ffffff; font-size: 13px; line-height: 1.5; }
        .header { margin-bottom: 25px; }
        .title { font-size: 28px; font-weight: 700; color: #0F4C75; margin-bottom: 6px; }
        .company-name { font-size: 14px; color: #2C3E50; margin-bottom: 3px; font-weight: 600; }
        .subtitle { font-size: 13px; color: #4A5568; }
        .date-range { font-size: 13px; color: #2C3E50; margin-bottom: 20px; }
        .divider { height: 3px; background: linear-gradient(to right, #0F4C75, #3282B8); margin: 15px 0; border-radius: 2px; }
        .section { margin-bottom: 20px; }
        .section-title { font-size: 14px; font-weight: 700; color: #2C3E50; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #BDC3C7; padding-bottom: 4px; }
        .line-item { display: flex; justify-content: space-between; padding: 6px 0; }
        .line-item.category { color: #34495E; padding-left: 10px; }
        .line-item.total { font-weight: 700; font-size: 14px; border-top: 1px solid #BDC3C7; padding: 8px 0; margin-top: 4px; color: #2C3E50; }
        .line-item.gross { font-weight: 700; font-size: 15px; border-top: 2px solid #34495E; border-bottom: 1px solid #34495E; padding: 10px 0; margin-top: 8px; color: #2C3E50; background: #F8FAFB; padding-left: 10px; padding-right: 10px; }
        .line-item.net { font-weight: 700; font-size: 16px; border-bottom: 3px double #34495E; border-top: 2px solid #34495E; padding: 12px 10px; margin-top: 10px; background: #F0F4F8; }
        .amount { text-align: right; font-variant-numeric: tabular-nums; }
        .amount.positive { color: #2D7A4F; }
        .amount.negative { color: #C0392B; }
        .currency { font-size: 11px; color: #4A5568; display: inline-block; margin-left: 4px; }
        .summary-box { background: #F8FAFB; border-left: 4px solid #0F4C75; padding: 12px; margin-top: 25px; border-radius: 4px; }
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
        <div class="date-range">For the period ${formatDate(startDate)} - ${formatDate(endDate)}</div>
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
        <span style="color: ${netProfit >= 0 ? '#2D7A4F' : '#C0392B'}">Net ${netProfit >= 0 ? 'Income' : 'Loss'}</span>
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
        Generated by Shrimply Aquaculture Management on ${new Date().toLocaleString()} - ${companyName}
      </div>
    </body>
    </html>
  `;
};

const generateCashFlowHTML = (data: any, formatCurrency: (v: number) => string): string => {
  const { startDate, endDate, companyName, openingBalance, operating, investing, financing } = data;
  const netOperating = operating.cashFromSales + operating.cashFromCustomers - operating.paymentToSuppliers - operating.paymentForExpenses;
  const netInvesting = investing.saleOfAssets - investing.purchaseOfAssets;
  const netFinancing = financing.loansReceived - financing.loanRepayments - financing.ownerWithdrawals;
  const netChange = netOperating + netInvesting + netFinancing;
  const closingBalance = openingBalance + netChange;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #2C3E50; background: #ffffff; font-size: 14px; line-height: 1.6; }
        .header { margin-bottom: 30px; }
        .title { font-size: 32px; font-weight: 700; color: #0F4C75; margin-bottom: 8px; }
        .company-name { font-size: 15px; color: #2C3E50; margin-bottom: 4px; }
        .date-range { font-size: 14px; color: #2C3E50; margin-bottom: 30px; }
        .divider { height: 3px; background: linear-gradient(to right, #0F4C75, #3282B8); margin: 20px 0; border-radius: 2px; }
        .section { margin-bottom: 25px; }
        .section-title { font-size: 15px; font-weight: 700; color: #2C3E50; margin-bottom: 12px; text-transform: uppercase; background: #F0F9F4; padding: 10px 12px; border-left: 4px solid #0F4C75; border-radius: 4px; }
        .line-item { display: flex; justify-content: space-between; padding: 8px 0 8px 20px; border-bottom: 1px solid #ECF0F1; }
        .line-item.subtotal { font-weight: 700; font-size: 15px; border-bottom: 2px solid #34495E; padding: 12px 0; margin-top: 8px; color: #2C3E50; background: #F8FAFB; padding-left: 12px; padding-right: 12px; }
        .line-item.balance { font-weight: 700; font-size: 16px; padding: 12px; background: #EBF5FB; border-radius: 4px; border: 2px solid #3498DB; }
        .line-item.closing { font-weight: 700; font-size: 17px; color: #27AE60; border-bottom: 3px double #27AE60; padding: 15px 12px; margin-top: 15px; background: #F0F9F4; }
        .amount { text-align: right; font-variant-numeric: tabular-nums; }
        .amount.positive { color: #2D7A4F; }
        .amount.negative { color: #C0392B; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #ECF0F1; font-size: 12px; color: #2C3E50; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">Statement of Cash Flows</div>
        <div class="company-name">${companyName}</div>
        <div class="date-range">For the period ${formatDate(startDate)} - ${formatDate(endDate)}</div>
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
        Generated by Shrimply Aquaculture Management on ${new Date().toLocaleString()} - ${companyName}
      </div>
    </body>
    </html>
  `;
};

const generateCOGSHTML = (data: any, formatCurrency: (v: number) => string): string => {
  const { startDate, endDate, companyName, openingInventory, purchases, directLabor, directMaterials, closingInventory, revenue, totalCOGS, grossProfit, grossProfitMargin } = data;
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #2C3E50; background: #ffffff; font-size: 14px; line-height: 1.6; }
        .header { margin-bottom: 30px; }
        .title { font-size: 32px; font-weight: 700; color: #27AE60; margin-bottom: 8px; }
        .company-name { font-size: 15px; color: #2C3E50; margin-bottom: 4px; }
        .divider { height: 3px; background: linear-gradient(to right, #27AE60, #2ECC71); margin: 20px 0; border-radius: 2px; }
        .section { margin-bottom: 25px; }
        .section-title { font-size: 15px; font-weight: 700; color: #2C3E50; margin-bottom: 12px; text-transform: uppercase; }
        .line-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ECF0F1; }
        .line-item.total { font-weight: 700; font-size: 15px; border-bottom: 2px solid #34495E; padding: 12px 0; margin-top: 8px; color: #2C3E50; }
        .line-item.subtotal { font-weight: 600; font-size: 14px; border-bottom: 1px solid #BDC3C7; padding: 10px 0; margin-top: 8px; background: #F8FAFB; padding-left: 10px; padding-right: 10px; }
        .metric-box { background: linear-gradient(135deg, #0F4C75 0%, #3282B8 100%); color: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 32px; font-weight: 700; }
        .amount { text-align: right; font-variant-numeric: tabular-nums; }
        .amount.positive { color: #27AE60; }
        .amount.negative { color: #E74C3C; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #ECF0F1; font-size: 12px; color: #2C3E50; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">Cost of Goods Sold</div>
        <div class="company-name">${companyName}</div>
        <div class="date-range">For ${formatDate(startDate)} - ${formatDate(endDate)}</div>
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
        <div class="line-item subtotal"><span>Goods Available for Sale</span><span class="amount">${formatCurrency(openingInventory + purchases + directLabor)}</span></div>
        <div class="line-item"><span>Less: Closing Inventory</span><span class="amount negative">(${formatCurrency(closingInventory)})</span></div>
        <div class="line-item total"><span>Total Cost of Goods Sold</span><span class="amount negative">${formatCurrency(totalCOGS)}</span></div>
      </div>
      <div class="section">
        <div class="section-title">Gross Profit Analysis</div>
        <div class="line-item"><span>Total Revenue</span><span class="amount positive">${formatCurrency(revenue)}</span></div>
        <div class="line-item"><span>Less: Cost of Goods Sold</span><span class="amount negative">(${formatCurrency(totalCOGS)})</span></div>
        <div class="line-item total" style="color: #27AE60; border-bottom: 3px double #27AE60; font-size: 18px;"><span>Gross Profit</span><span class="amount">${formatCurrency(grossProfit)}</span></div>
      </div>
      <div class="footer">
        Generated by Shrimply Aquaculture Management on ${new Date().toLocaleString()} - ${companyName}
      </div>
    </body>
    </html>
  `;
};

const generateProjectionHTML = (data: any, formatCurrency: (v: number) => string): string => {
  const { pondName, currentDOC, futureDOC, currentMBW, projectedMBW, projectedBiomass, projectedRevenue, projectedProfit, insight } = data;
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #2C3E50; background: #ffffff; font-size: 14px; line-height: 1.6; }
        .header { margin-bottom: 30px; }
        .title { font-size: 32px; font-weight: 700; color: #E74C3C; margin-bottom: 8px; }
        .company-name { font-size: 15px; color: #2C3E50; margin-bottom: 4px; font-weight: 600; }
        .divider { height: 3px; background: linear-gradient(to right, #E74C3C, #F39C12); margin: 20px 0; border-radius: 2px; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
        .card { background: #F8FAFB; padding: 15px; border-radius: 8px; text-align: center; border-bottom: 3px solid #E74C3C; }
        .label { font-size: 10px; color: #64748B; text-transform: uppercase; margin-bottom: 4px; }
        .value { font-size: 20px; font-weight: 700; color: #2C3E50; }
        .financial-card { background: #F0F9FF; padding: 25px; border-radius: 12px; border-left: 5px solid #3282B8; margin-bottom: 25px; }
        .profit { color: #10B981; font-size: 36px; font-weight: 900; }
        .orson-box { background: #FFFBEA; border: 1px solid #FDE68A; padding: 20px; border-radius: 12px; margin-top: 30px; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #64748B; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">Harvest Projection Audit</div>
        <div class="company-name">Pond: ${pondName}</div>
        <div style="font-size: 14px; color: #4A5568;">Generated on ${new Date().toLocaleDateString()}</div>
      </div>
      <div class="divider"></div>
      <div class="grid">
        <div class="card"><div class="label">Harvest DOC</div><div class="value">${futureDOC}</div></div>
        <div class="card"><div class="label">Projected MBW</div><div class="value">${projectedMBW.toFixed(1)}g</div></div>
        <div class="card"><div class="label">Projected Biomass</div><div class="value">${projectedBiomass.toFixed(0)} kg</div></div>
      </div>
      <div class="financial-card">
        <div class="label">Projected Gross Revenue</div>
        <div class="value" style="font-size: 28px; margin-bottom: 15px;">${formatCurrency(projectedRevenue)}</div>
        <div class="label">Projected Net Profit (After Future Feed)</div>
        <div class="profit">${formatCurrency(projectedProfit)}</div>
      </div>
      <div class="orson-box">
        <div style="font-weight: 800, color: #92400E; margin-bottom: 8px;">Orson AI Risk Analysis:</div>
        <div style="font-style: italic; color: #451a03;">"${insight || 'No AI analysis performed for this projection.'}"</div>
      </div>
      <div class="footer">This is a biological projection based on current growth rates (ADG 0.2g). Actual results may vary.</div>
    </body>
    </html>
  `;
};

export default function FinancialReportsPage() {
  const { formatCurrency, currencyConfig } = useCurrency();
  const router = useRouter();
  const { company, loading: authLoading } = useAuth();
  const [selectedReport, setSelectedReport] = useState('profit-loss');
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');
  const [exportLoading, setExportLoading] = useState(false);
  const { expenses, revenues, loading: financeLoading } = useFinanceRecords<Expense, Revenue>();
  const { data: ponds, loading: pondsLoading } = useCompanyPonds<any>('asc');
  const loading = authLoading || financeLoading || pondsLoading;

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
    let startDate: Date, endDate: Date = now;

    if (selectedPeriod === 'Today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (selectedPeriod === 'This Week') {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
    } else if (selectedPeriod === 'This Month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (selectedPeriod === 'This Year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      startDate = new Date(0); // All time
    }
    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();
  const filteredExpenses = expenses.filter(e => new Date(e.date) >= startDate && new Date(e.date) <= endDate);
  const filteredRevenues = revenues.filter(r => new Date(r.date) >= startDate && new Date(r.date) <= endDate);

  // Financial Calculations for Preview
  const totalRev = filteredRevenues.reduce((s, r) => s + r.amount, 0);
  const totalExp = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalRev - totalExp;

  const handleExport = async () => {
    setExportLoading(true);
    try {
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;
      
      let html = '';
      let fileName = '';

      if (selectedReport === 'profit-loss') {
        const revBreakdown: Record<string, number> = {};
        filteredRevenues.forEach(r => revBreakdown[r.category] = (revBreakdown[r.category] || 0) + r.amount);
        
        const COGS_CATS = ['Feed', 'Pond Additives', 'Labor'];
        const cogsExp = filteredExpenses.filter(e => COGS_CATS.includes(normalizeCategory(e.category)));
        const cogsBreakdown: Record<string, number> = {};
        cogsExp.forEach(e => cogsBreakdown[e.category] = (cogsBreakdown[e.category] || 0) + e.amount);
        const totalCOGS = cogsExp.reduce((s, e) => s + e.amount, 0);
        
        const opexExp = filteredExpenses.filter(e => !COGS_CATS.includes(normalizeCategory(e.category)));
        const opexBreakdown: Record<string, number> = {};
        opexExp.forEach(e => opexBreakdown[e.category] = (opexBreakdown[e.category] || 0) + e.amount);
        const totalOPEX = opexExp.reduce((s, e) => s + e.amount, 0);

        const data: FinancialData = {
          period: selectedPeriod,
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
          totalOtherExpenses: 0,
          otherExpenseBreakdown: {},
          netProfit: totalRev - totalCOGS - totalOPEX
        };
        html = generateProfitLossHTML(data, formatCurrency, currencyConfig.code);
        fileName = `ProfitLoss_${company?.companyName || 'Farm'}_${selectedPeriod}.pdf`;
      } else if (selectedReport === 'cash-flow') {
        const operating = {
          cashFromSales: filteredRevenues.reduce((s, r) => s + r.amount, 0),
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
        html = generateCashFlowHTML(data, formatCurrency);
        fileName = `CashFlow_${company?.companyName || 'Farm'}_${selectedPeriod}.pdf`;
      } else if (selectedReport === 'cogs') {
        const purchases = filteredExpenses.filter(e => normalizeCategory(e.category) === 'Feed').reduce((s, e) => s + e.amount, 0);
        const labor = filteredExpenses.filter(e => normalizeCategory(e.category) === 'Labor').reduce((s, e) => s + e.amount, 0);
        const totalCOGS = openingInventory + purchases + labor - closingInventory;
        const data = {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          companyName: company?.companyName || 'My Farm',
          openingInventory,
          purchases,
          directLabor: labor,
          directMaterials: 0,
          closingInventory,
          revenue: totalRev,
          totalCOGS,
          grossProfit: totalRev - totalCOGS,
          grossProfitMargin: totalRev > 0 ? ((totalRev - totalCOGS) / totalRev) * 100 : 0
        };
        html = generateCOGSHTML(data, formatCurrency);
        fileName = `COGS_${company?.companyName || 'Farm'}_${selectedPeriod}.pdf`;
      } else if (selectedReport === 'harvest-projections') {
        // Redirect to projections page for full tool
        router.push('/dashboard/projections');
        return;
      }

      const element = document.createElement('div');
      element.innerHTML = html;
      document.body.appendChild(element);

      const opt = {
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
            <h2 style={{ fontSize: '17px', fontWeight: 850, marginBottom: '14px' }}>Select Period</h2>
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
          </div>

          {selectedReport === 'cogs' && (
            <div className="glass-card" style={{ padding: '20px', background: '#FFF' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>Inventory Adjustment</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Opening Inventory (Rp)</label>
                  <input 
                    type="number" 
                    value={openingInventory} 
                    onChange={(e) => setOpeningInventory(Number(e.target.value))} 
                    className="form-input"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Closing Inventory (Rp)</label>
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
