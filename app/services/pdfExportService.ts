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

const generateProfitLossHTML = (data: FinancialData): string => {
  const { 
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
    netProfit
  } = data;

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
