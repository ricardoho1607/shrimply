// services/pdfExportService.ts
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

type ExpenseBreakdown = Record<string, number>;
type RevenueBreakdown = Record<string, number>;

interface FinancialData {
  period: string;
  startDate: string;
  endDate: string;
  companyName: string;
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
  expenseBreakdown: ExpenseBreakdown;
  revenueBreakdown: RevenueBreakdown;
  topExpenses: Array<{ item: string; category: string; amount: number }>;
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
    totalExpenses, 
    profit,
    expenseBreakdown,
    revenueBreakdown 
  } = data;

  const grossProfit = totalRevenue;
  const netProfit = profit;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Profit and Loss Statement</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #2C3E50; background: #ffffff; font-size: 14px; line-height: 1.6; }
        .header { margin-bottom: 30px; }
        .title { font-size: 32px; font-weight: 700; color: #0066CC; margin-bottom: 8px; }
        .company-name { font-size: 15px; color: #2C3E50; margin-bottom: 4px; }
        .subtitle { font-size: 14px; color: #2C3E50; }
        .date-range { font-size: 14px; color: #2C3E50; margin-bottom: 30px; }
        .divider { height: 3px; background: linear-gradient(to right, #0066CC, #0099FF); margin: 20px 0; border-radius: 2px; }
        .section { margin-bottom: 25px; }
        .section-title { font-size: 15px; font-weight: 700; color: #2C3E50; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        .line-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ECF0F1; }
        .line-item.category { font-weight: 600; color: #34495E; padding-left: 0; }
        .line-item.subcategory { color: #7F8C8D; padding-left: 20px; font-size: 13px; }
        .line-item.total { font-weight: 700; font-size: 15px; border-bottom: 2px solid #34495E; padding: 12px 0; margin-top: 8px; color: #2C3E50; }
        .line-item.net-profit { font-weight: 700; font-size: 16px; color: #2D7A4F; border-bottom: 3px double #2D7A4F; padding: 15px 0; margin-top: 15px; }
        .line-item.net-loss { font-weight: 700; font-size: 16px; color: #C0392B; border-bottom: 3px double #C0392B; padding: 15px 0; margin-top: 15px; }
        .amount { text-align: right; font-variant-numeric: tabular-nums; }
        .amount.positive { color: #2D7A4F; }
        .amount.negative { color: #C0392B; }
        .currency { font-size: 12px; color: #2C3E50; display: block; text-align: right; margin-top: 2px; }
        .summary-box { background: #F8FAFB; border-left: 4px solid #0066CC; padding: 15px; margin-top: 30px; border-radius: 4px; }
        .summary-item { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
        .summary-item.highlight { font-weight: 700; font-size: 16px; color: #2C3E50; border-top: 2px solid #BDC3C7; margin-top: 10px; padding-top: 12px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #ECF0F1; font-size: 12px; color: #2C3E50; text-align: center; }
        .icon { display: inline-block; width: 16px; height: 16px; margin-right: 8px; vertical-align: middle; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">Profit and Loss</div>
        <div class="company-name">${companyName}</div>
        <div class="subtitle">Income Statement</div>
        <div class="date-range">For ${formatDate(startDate)} - ${formatDate(endDate)}</div>
      </div>
      
      <div class="divider"></div>
      
      <div class="section">
        <div class="section-title">Income (Billed)*</div>
        ${Object.entries(revenueBreakdown).map(([category, amount]) => `
          <div class="line-item category">
            <span>${category}</span>
            <span class="amount">${formatCurrency(amount)}</span>
          </div>
        `).join('')}
        <div class="line-item total">
          <span>Total Income</span>
          <div>
            <span class="amount positive">${formatCurrency(totalRevenue)}</span>
            <span class="currency">IDR</span>
          </div>
        </div>
      </div>
      
      <div class="section">
        <div class="line-item total">
          <span>Gross Profit</span>
          <div>
            <span class="amount">${formatCurrency(grossProfit)}</span>
            <span class="currency">IDR</span>
          </div>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Less Expenses</div>
        ${Object.entries(expenseBreakdown).map(([category, amount]) => `
          <div class="line-item category">
            <span>${category}</span>
            <span class="amount">${formatCurrency(amount)}</span>
          </div>
        `).join('')}
        <div class="line-item total">
          <span>Total Expenses</span>
          <div>
            <span class="amount negative">${formatCurrency(totalExpenses)}</span>
            <span class="currency">IDR</span>
          </div>
        </div>
      </div>
      
      <div class="section">
        <div class="line-item ${netProfit >= 0 ? 'net-profit' : 'net-loss'}">
          <span>Net ${netProfit >= 0 ? 'Profit' : 'Loss'}</span>
          <div>
            <span class="amount ${netProfit >= 0 ? 'positive' : 'negative'}">${formatCurrency(Math.abs(netProfit))}</span>
            <span class="currency">IDR</span>
          </div>
        </div>
      </div>
      
      <div class="summary-box">
        <div class="summary-item">
          <span>Total Revenue:</span>
          <span class="amount positive">Rp ${formatCurrency(totalRevenue)}</span>
        </div>
        <div class="summary-item">
          <span>Total Expenses:</span>
          <span class="amount negative">Rp ${formatCurrency(totalExpenses)}</span>
        </div>
        <div class="summary-item highlight">
          <span>${netProfit >= 0 ? 'Net Profit:' : 'Net Loss:'}</span>
          <span class="amount ${netProfit >= 0 ? 'positive' : 'negative'}">Rp ${formatCurrency(Math.abs(netProfit))}</span>
        </div>
      </div>
      
      <div class="footer">
        Generated by Shrimply Aquaculture Management on ${new Date().toLocaleString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric'
        })} - ${companyName}
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
    
    const canShare = await Sharing.isAvailableAsync();
    
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Profit & Loss Statement',
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert(
        'PDF Generated',
        `Your financial report has been saved to: ${uri}`,
        [{ text: 'OK' }]
      );
    }
    
    return uri;
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
  totalExpenses: number,
  profit: number,
  expenseBreakdown: ExpenseBreakdown,
  revenueBreakdown: RevenueBreakdown,
  topExpenses: Array<{ item: string; category: string; amount: number }>
): FinancialData => {
  return {
    period,
    startDate,
    endDate,
    companyName,
    totalRevenue,
    totalExpenses,
    profit,
    expenseBreakdown,
    revenueBreakdown,
    topExpenses,
  };
};
