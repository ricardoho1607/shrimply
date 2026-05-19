// services/pdfExportService.ts
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';

type ExpenseBreakdown = Record<string, number>;
type RevenueBreakdown = Record<string, number>;

interface FinancialData {
  period: string;
  startDate: string;
  endDate: string;
  companyName: string;
  totalRevenue: number;
  revenueBreakdown: RevenueBreakdown;
  totalCOGS: number;
  cogsBreakdown: ExpenseBreakdown;
  grossProfit: number;
  totalOPEX: number;
  opexBreakdown: ExpenseBreakdown;
  operatingIncome: number;
  totalOtherExpenses: number;
  otherExpenseBreakdown: ExpenseBreakdown;
  netProfit: number;
  currencyCode?: string;
  currencySymbol?: string;
}

const formatCurrency = (amount: number, currencyCode: string = 'IDR', currencySymbol: string = 'Rp'): string => {
  const localeMap: Record<string, string> = {
    'USD': 'en-US',
    'IDR': 'id-ID',
    'THB': 'th-TH',
    'VND': 'vi-VN',
    'CNY': 'zh-CN'
  };
  
  const locale = localeMap[currencyCode] || 'id-ID';
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  
  return `${currencySymbol} ${formatted}`;
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

const getLargestBreakdownItem = (breakdown: ExpenseBreakdown | RevenueBreakdown): { category: string; amount: number } | null => {
  const entries = Object.entries(breakdown).filter(([, amount]) => amount > 0);
  if (entries.length === 0) return null;

  const [category, amount] = entries.sort(([, a], [, b]) => b - a)[0];
  return { category, amount };
};

const getProfitLossAnalysis = (data: FinancialData) => {
  const {
    totalRevenue,
    revenueBreakdown,
    totalCOGS,
    cogsBreakdown,
    grossProfit,
    totalOPEX,
    opexBreakdown,
    operatingIncome,
    totalOtherExpenses,
    netProfit,
  } = data;

  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : null;
  const operatingMargin = totalRevenue > 0 ? (operatingIncome / totalRevenue) * 100 : null;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : null;
  const cogsShare = totalRevenue > 0 ? (totalCOGS / totalRevenue) * 100 : null;
  const opexShare = totalRevenue > 0 ? (totalOPEX / totalRevenue) * 100 : null;
  const largestRevenue = getLargestBreakdownItem(revenueBreakdown);
  const largestCOGS = getLargestBreakdownItem(cogsBreakdown);
  const largestOPEX = getLargestBreakdownItem(opexBreakdown);

  const executiveSummary = [
    totalRevenue > 0
      ? `Total revenue for the period was ${formatCurrency(totalRevenue)}. Gross profit was ${formatCurrency(grossProfit)} and net ${netProfit >= 0 ? 'income' : 'loss'} was ${formatCurrency(Math.abs(netProfit))}.`
      : 'No revenue was recorded for this period, so profitability cannot be fully assessed from the available data.',
    grossMargin !== null
      ? `Gross margin was ${grossMargin.toFixed(2)}% and net margin was ${netMargin?.toFixed(2) ?? '0.00'}%. This result should be interpreted alongside COGS and operating expenses to judge sustainability.`
      : 'Gross and net margins were not calculated because revenue was not available for the selected period.',
  ];

  if (largestRevenue) {
    executiveSummary.push(`${largestRevenue.category} was the largest revenue source recorded in this period.`);
  }

  if (largestCOGS) {
    executiveSummary.push(`${largestCOGS.category} was the largest direct production cost category and should be monitored against production volume and harvest yield.`);
  }

  const riskAssessment = [
    netProfit < 0
      ? 'The company recorded a net loss for the selected period. Direct costs and operating expenses should be reviewed before the next cycle decision.'
      : netMargin !== null && netMargin < 10
        ? 'The company was profitable, but net margin is narrow. Small increases in feed, labor, or overhead costs could materially reduce profitability.'
        : 'No immediate net loss risk was detected from the selected period.',
    cogsShare !== null && cogsShare > 65
      ? `COGS represented ${cogsShare.toFixed(2)}% of revenue, indicating pressure on gross margin and production efficiency.`
      : 'COGS did not exceed the high-risk threshold based on the selected period revenue.',
    opexShare !== null && opexShare > 35
      ? `Operating expenses represented ${opexShare.toFixed(2)}% of revenue. Overhead should be reviewed if this pattern continues.`
      : 'Operating expenses did not exceed the high-risk threshold based on selected period revenue.',
  ];

  if (largestOPEX) {
    riskAssessment.push(`${largestOPEX.category} was the largest operating expense category and should be reviewed for budget control.`);
  }

  if (totalOtherExpenses > 0) {
    riskAssessment.push(`Non-operating or other expenses totaled ${formatCurrency(totalOtherExpenses)} and reduced the final net result.`);
  }

  if (operatingMargin !== null && operatingMargin < 0) {
    riskAssessment.push('Operating income was negative before non-operating expenses, indicating the core operation did not cover its operating cost base.');
  }

  return { executiveSummary, riskAssessment };
};

const generateProfitLossHTML = (data: FinancialData): string => {
  const { 
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
    netProfit
  } = data;
  const reportAnalysis = getProfitLossAnalysis(data);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Profit and Loss Statement</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #2C3E50; background: #ffffff; font-size: 13px; line-height: 1.5; }
        .header { margin-bottom: 25px; }
        .title { font-size: 28px; font-weight: 700; color: #0066CC; margin-bottom: 6px; }
        .company-name { font-size: 14px; color: #2C3E50; margin-bottom: 3px; font-weight: 600; }
        .subtitle { font-size: 13px; color: #4A5568; }
        .date-range { font-size: 13px; color: #2C3E50; margin-bottom: 20px; }
        .divider { height: 3px; background: linear-gradient(to right, #0066CC, #0099FF); margin: 15px 0; border-radius: 2px; }
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
        .summary-box { background: #F8FAFB; border-left: 4px solid #0066CC; padding: 12px; margin-top: 25px; border-radius: 4px; }
        .summary-item { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; }
        .summary-item.highlight { font-weight: 700; font-size: 15px; color: #2C3E50; border-top: 1px solid #BDC3C7; margin-top: 8px; padding-top: 8px; }
        .analysis-section {
          page-break-before: always;
          break-before: page;
          page-break-inside: avoid;
          break-inside: avoid;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 0;
        }
        .analysis-box {
          page-break-inside: avoid;
          break-inside: avoid;
          min-height: 180px;
          padding: 16px;
          background: #F8FAFB;
          border: 1px solid #DDEAF3;
          border-left: 4px solid #0066CC;
          border-radius: 6px;
        }
        .analysis-box.risk {
          background: #FFFBEA;
          border-color: #F5D08A;
          border-left-color: #F39C12;
        }
        .analysis-title {
          font-size: 15px;
          font-weight: 700;
          color: #0066CC;
          margin-bottom: 8px;
        }
        .analysis-box.risk .analysis-title {
          color: #B45309;
        }
        .analysis-list {
          margin-left: 18px;
          font-size: 12px;
          color: #2C3E50;
          line-height: 1.45;
        }
        .analysis-list li {
          margin-bottom: 8px;
        }
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
      
      <!-- REVENUE -->
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
      
      <!-- COGS -->
      <div class="section">
        <div class="section-title">Cost of Goods Sold (COGS)</div>
        ${Object.entries(cogsBreakdown).map(([category, amount]) => `
          <div class="line-item category">
            <span>${category}</span>
            <span class="amount">${formatCurrency(amount)}</span>
          </div>
        `).join('')}
        ${Object.keys(cogsBreakdown).length === 0 ? '<div class="line-item category"><span>No COGS recorded</span><span class="amount">-</span></div>' : ''}
        <div class="line-item total">
          <span>Total Cost of Goods Sold</span>
          <span class="amount">(${formatCurrency(totalCOGS)})</span>
        </div>
      </div>
      
      <!-- GROSS PROFIT -->
      <div class="line-item gross">
        <span>Gross Profit</span>
        <span class="amount">${formatCurrency(grossProfit)}</span>
      </div>
      <br/>
      
      <!-- OPERATING EXPENSES -->
      <div class="section">
        <div class="section-title">Operating Expenses (OPEX)</div>
        ${Object.entries(opexBreakdown).map(([category, amount]) => `
          <div class="line-item category">
            <span>${category}</span>
            <span class="amount">${formatCurrency(amount)}</span>
          </div>
        `).join('')}
        ${Object.keys(opexBreakdown).length === 0 ? '<div class="line-item category"><span>No Operating Expenses recorded</span><span class="amount">-</span></div>' : ''}
        <div class="line-item total">
          <span>Total Operating Expenses</span>
          <span class="amount">(${formatCurrency(totalOPEX)})</span>
        </div>
      </div>
      
      <!-- OPERATING INCOME -->
      <div class="line-item gross">
        <span>Operating Income (EBITDA)</span>
        <span class="amount">${formatCurrency(operatingIncome)}</span>
      </div>
      <br/>
      
      <!-- NON-OPERATING EXPENSES -->
      ${totalOtherExpenses > 0 ? `
      <div class="section">
        <div class="section-title">Non-Operating Expenses / Other</div>
        ${Object.entries(otherExpenseBreakdown).map(([category, amount]) => `
          <div class="line-item category">
            <span>${category}</span>
            <span class="amount">${formatCurrency(amount)}</span>
          </div>
        `).join('')}
        <div class="line-item total">
          <span>Total Non-Operating Expenses</span>
          <span class="amount">(${formatCurrency(totalOtherExpenses)})</span>
        </div>
      </div>
      ` : ''}
      
      <!-- NET PROFIT -->
      <div class="line-item net ${netProfit >= 0 ? '' : 'negative'}">
        <span style="color: ${netProfit >= 0 ? '#2D7A4F' : '#C0392B'}">Net ${netProfit >= 0 ? 'Income' : 'Loss'}</span>
        <div>
          <span class="amount ${netProfit >= 0 ? 'positive' : 'negative'}">${formatCurrency(Math.abs(netProfit))}</span>
          <span class="currency">IDR</span>
        </div>
      </div>
      
      <div class="summary-box">
        <div class="summary-item">
          <span>Gross Profit Margin:</span>
          <span>${totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(2) : '0.00'}%</span>
        </div>
        <div class="summary-item">
          <span>Operating Margin:</span>
          <span>${totalRevenue > 0 ? ((operatingIncome / totalRevenue) * 100).toFixed(2) : '0.00'}%</span>
        </div>
        <div class="summary-item highlight">
          <span>Net Profit Margin:</span>
          <span class="${netProfit >= 0 ? 'positive' : 'negative'}">${totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : '0.00'}%</span>
        </div>
      </div>

      <div class="analysis-section">
        <div class="analysis-box">
          <div class="analysis-title">Executive Summary</div>
          <ul class="analysis-list">
            ${reportAnalysis.executiveSummary.map((item) => `<li>${item}</li>`).join('')}
          </ul>
        </div>
        <div class="analysis-box risk">
          <div class="analysis-title">Risk Assessment</div>
          <ul class="analysis-list">
            ${reportAnalysis.riskAssessment.map((item) => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      </div>
      
      <div class="footer">
        Generated by Shrimply Aquaculture Management on ${new Date().toLocaleString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric'
        })} - ${companyName}
        <br/>Statement prepared according to multi-step income format.
      </div>
    </body>
    </html>
  `;
};

export const exportFinancialPDF = async (data: FinancialData) => {
  try {
    const html = generateProfitLossHTML(data);
    
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });
    
    // Create Custom Filename
    const cleanDate = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).replace(' ', '');
    const safeCompanyName = data.companyName.replace(/[^a-zA-Z0-9]/g, '');
    const filename = `ProfitLoss_${safeCompanyName}_${cleanDate}.pdf`;
    
    const newUri = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.copyAsync({
      from: uri,
      to: newUri
    });
    
    const canShare = await Sharing.isAvailableAsync();
    
    if (canShare) {
      await Sharing.shareAsync(newUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Profit & Loss Statement',
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert(
        'PDF Generated',
        `Your financial report has been saved to: ${newUri}`,
        [{ text: 'OK' }]
      );
    }
    
    return newUri;
  } catch (error) {
    console.error('Error generating PDF:', error);
    Alert.alert('Error', 'Failed to generate PDF report');
    throw error;
  }
};

export const prepareFinancialData = (
  period: string,
  startDate: string,
  endDate: string,
  companyName: string,
  totalRevenue: number,
  revenueBreakdown: RevenueBreakdown,
  totalCOGS: number,
  cogsBreakdown: ExpenseBreakdown,
  grossProfit: number,
  totalOPEX: number,
  opexBreakdown: ExpenseBreakdown,
  operatingIncome: number,
  totalOtherExpenses: number,
  otherExpenseBreakdown: ExpenseBreakdown,
  netProfit: number
): FinancialData => {
  return {
    period,
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
    netProfit,
  };
};
