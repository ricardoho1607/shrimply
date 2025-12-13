// app/services/cogsExportService.ts - Cost of Goods Sold Export Service
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

export interface COGSData {
  period: string;
  startDate: string;
  endDate: string;
  companyName: string;
  openingInventory: number;
  purchases: number;
  directLabor: number;
  directMaterials: number;
  closingInventory: number;
  totalCOGS: number;
  revenue: number;
  grossProfit: number;
  grossProfitMargin: number;
  categoryBreakdown: { [category: string]: number };
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

export const prepareCOGSData = (
  period: string,
  startDate: string,
  endDate: string,
  companyName: string,
  openingInventory: number,
  purchases: number,
  directLabor: number,
  directMaterials: number,
  closingInventory: number,
  revenue: number,
  categoryBreakdown: { [category: string]: number }
): COGSData => {
  const totalCOGS = openingInventory + purchases + directLabor + directMaterials - closingInventory;
  const grossProfit = revenue - totalCOGS;
  const grossProfitMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  return {
    period,
    startDate,
    endDate,
    companyName,
    openingInventory,
    purchases,
    directLabor,
    directMaterials,
    closingInventory,
    totalCOGS,
    revenue,
    grossProfit,
    grossProfitMargin,
    categoryBreakdown,
  };
};

const generateCOGSHTML = (data: COGSData): string => {
  const { 
    startDate, 
    endDate, 
    companyName, 
    openingInventory,
    purchases,
    directLabor,
    directMaterials,
    closingInventory,
    totalCOGS,
    revenue,
    grossProfit,
    grossProfitMargin,
    categoryBreakdown
  } = data;

  const goodsAvailable = openingInventory + purchases + directLabor + directMaterials;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cost of Goods Sold Report</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #2C3E50; background: #ffffff; font-size: 14px; line-height: 1.6; }
        .header { margin-bottom: 30px; }
        .title { font-size: 32px; font-weight: 700; color: #27AE60; margin-bottom: 8px; }
        .company-name { font-size: 15px; color: #2C3E50; margin-bottom: 4px; }
        .subtitle { font-size: 14px; color: #2C3E50; }
        .date-range { font-size: 14px; color: #2C3E50; margin-bottom: 30px; }
        .divider { height: 3px; background: linear-gradient(to right, #27AE60, #2ECC71); margin: 20px 0; border-radius: 2px; }
        .section { margin-bottom: 25px; }
        .section-title { font-size: 15px; font-weight: 700; color: #2C3E50; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        .line-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ECF0F1; }
        .line-item.category { font-weight: 600; color: #34495E; padding-left: 0; }
        .line-item.subcategory { color: #7F8C8D; padding-left: 20px; font-size: 13px; }
        .line-item.total { font-weight: 700; font-size: 15px; border-bottom: 2px solid #34495E; padding: 12px 0; margin-top: 8px; color: #2C3E50; }
        .line-item.subtotal { font-weight: 600; font-size: 14px; border-bottom: 1px solid #BDC3C7; padding: 10px 0; margin-top: 8px; color: #34495E; background: #F8FAFB; padding-left: 10px; padding-right: 10px; }
        .line-item.gross-profit { font-weight: 700; font-size: 16px; color: #27AE60; border-bottom: 3px double #27AE60; padding: 15px 0; margin-top: 15px; }
        .line-item.gross-loss { font-weight: 700; font-size: 16px; color: #E74C3C; border-bottom: 3px double #E74C3C; padding: 15px 0; margin-top: 15px; }
        .amount { text-align: right; font-variant-numeric: tabular-nums; }
        .amount.positive { color: #27AE60; }
        .amount.negative { color: #E74C3C; }
        .currency { font-size: 12px; color: #2C3E50; display: block; text-align: right; margin-top: 2px; }
        .metric-box { background: linear-gradient(135deg, #27AE60 0%, #229954 100%); color: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; text-align: center; }
        .metric-label { font-size: 13px; opacity: 0.9; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .metric-value { font-size: 32px; font-weight: 700; }
        .summary-box { background: #F8FAFB; border-left: 4px solid #27AE60; padding: 15px; margin-top: 30px; border-radius: 4px; }
        .summary-item { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
        .summary-item.highlight { font-weight: 700; font-size: 16px; color: #2C3E50; border-top: 2px solid #BDC3C7; margin-top: 10px; padding-top: 12px; }
        .breakdown-item { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #ECF0F1; }
        .breakdown-item:last-child { border-bottom: none; }
        .percentage { font-size: 12px; color: #95A5A6; margin-left: 8px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #ECF0F1; font-size: 12px; color: #2C3E50; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">Cost of Goods Sold</div>
        <div class="company-name">${companyName}</div>
        <div class="subtitle">COGS Report</div>
        <div class="date-range">For ${formatDate(startDate)} - ${formatDate(endDate)}</div>
      </div>
      
      <div class="metric-box">
        <div class="metric-label">Gross Profit Margin</div>
        <div class="metric-value">${grossProfitMargin.toFixed(2)}%</div>
      </div>
      
      <div class="divider"></div>
      
      <div class="section">
        <div class="section-title">COGS Calculation</div>
        <div class="line-item category">
          <span>Opening Inventory</span>
          <div>
            <span class="amount">${formatCurrency(openingInventory)}</span>
            <span class="currency">IDR</span>
          </div>
        </div>
        <div class="line-item subcategory">
          <span>Add: Purchases (Feed & Materials)</span>
          <span class="amount">${formatCurrency(purchases)}</span>
        </div>
        <div class="line-item subcategory">
          <span>Add: Direct Labor</span>
          <span class="amount">${formatCurrency(directLabor)}</span>
        </div>
        <div class="line-item subcategory">
          <span>Add: Direct Materials (Pond Additives)</span>
          <span class="amount">${formatCurrency(directMaterials)}</span>
        </div>
        <div class="line-item subtotal">
          <span>Goods Available for Sale</span>
          <div>
            <span class="amount">${formatCurrency(goodsAvailable)}</span>
            <span class="currency">IDR</span>
          </div>
        </div>
        <div class="line-item category">
          <span>Less: Closing Inventory</span>
          <div>
            <span class="amount negative">(${formatCurrency(closingInventory)})</span>
            <span class="currency">IDR</span>
          </div>
        </div>
        <div class="line-item total">
          <span>Total Cost of Goods Sold</span>
          <div>
            <span class="amount negative">${formatCurrency(totalCOGS)}</span>
            <span class="currency">IDR</span>
          </div>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Gross Profit Analysis</div>
        <div class="line-item category">
          <span>Total Revenue</span>
          <div>
            <span class="amount positive">${formatCurrency(revenue)}</span>
            <span class="currency">IDR</span>
          </div>
        </div>
        <div class="line-item category">
          <span>Less: Cost of Goods Sold</span>
          <div>
            <span class="amount negative">(${formatCurrency(totalCOGS)})</span>
            <span class="currency">IDR</span>
          </div>
        </div>
        <div class="line-item ${grossProfit >= 0 ? 'gross-profit' : 'gross-loss'}">
          <span>Gross ${grossProfit >= 0 ? 'Profit' : 'Loss'}</span>
          <div>
            <span class="amount ${grossProfit >= 0 ? 'positive' : 'negative'}">${formatCurrency(Math.abs(grossProfit))}</span>
            <span class="currency">IDR</span>
          </div>
        </div>
        <div class="line-item category">
          <span>Gross Profit Margin</span>
          <span class="amount ${grossProfitMargin >= 0 ? 'positive' : 'negative'}">${grossProfitMargin.toFixed(2)}%</span>
        </div>
      </div>
      
      ${Object.keys(categoryBreakdown).length > 0 ? `
        <div class="section">
          <div class="section-title">Cost Breakdown by Category</div>
          ${Object.entries(categoryBreakdown)
            .sort(([, a], [, b]) => b - a)
            .map(([category, amount]) => {
              const percentage = totalCOGS > 0 ? (amount / totalCOGS * 100).toFixed(1) : '0.0';
              return `
                <div class="breakdown-item">
                  <span>${category}</span>
                  <span>
                    ${formatCurrency(amount)}
                    <span class="percentage">(${percentage}%)</span>
                  </span>
                </div>
              `;
            })
            .join('')}
        </div>
      ` : ''}
      
      <div class="summary-box">
        <div class="summary-item">
          <span>Total Revenue:</span>
          <span class="amount positive">Rp ${formatCurrency(revenue)}</span>
        </div>
        <div class="summary-item">
          <span>Cost of Goods Sold:</span>
          <span class="amount negative">Rp ${formatCurrency(totalCOGS)}</span>
        </div>
        <div class="summary-item highlight">
          <span>${grossProfit >= 0 ? 'Gross Profit:' : 'Gross Loss:'}</span>
          <span class="amount ${grossProfit >= 0 ? 'positive' : 'negative'}">Rp ${formatCurrency(Math.abs(grossProfit))}</span>
        </div>
        <div class="summary-item">
          <span>Gross Profit Margin:</span>
          <span class="amount ${grossProfitMargin >= 0 ? 'positive' : 'negative'}">${grossProfitMargin.toFixed(2)}%</span>
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

export const exportCOGSPDF = async (data: COGSData) => {
  try {
    const html = generateCOGSHTML(data);
    
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });
    
    const canShare = await Sharing.isAvailableAsync();
    
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share COGS Report',
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert(
        'PDF Generated',
        `Your COGS report has been saved to: ${uri}`,
        [{ text: 'OK' }]
      );
    }
    
    return uri;
  } catch (error) {
    console.error('Error generating COGS PDF:', error);
    Alert.alert('Error', 'Failed to generate COGS PDF report');
    throw error;
  }
};
