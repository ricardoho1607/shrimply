// app/services/cogsExportService.ts - Cost of Goods Sold Export Service
import { Asset } from 'expo-asset';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';

const PDF_BACKGROUND_ASSET = require('../../assets/pdf/shrimply-pdf-background-portrait.png');
const PDF_LOGO_ASSET = require('../../assets/pdf/shrimply-logo.png');

interface PdfBrandAssets {
  backgroundBase64: string;
  logoBase64: string;
}

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

const loadBase64Asset = async (assetModule: number): Promise<string> => {
  const asset = Asset.fromModule(assetModule);
  await asset.downloadAsync();

  const assetUri = asset.localUri || asset.uri;
  if (!assetUri) {
    throw new Error('Unable to resolve PDF asset URI');
  }

  return FileSystem.readAsStringAsync(assetUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
};

const loadCOGSBrandAssets = async (): Promise<PdfBrandAssets> => {
  const [backgroundBase64, logoBase64] = await Promise.all([
    loadBase64Asset(PDF_BACKGROUND_ASSET),
    loadBase64Asset(PDF_LOGO_ASSET),
  ]);

  return { backgroundBase64, logoBase64 };
};

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

const buildCOGSReportAnalysis = (data: COGSData) => {
  const costEntries = Object.entries(data.categoryBreakdown || {})
    .filter(([, amount]) => Number.isFinite(amount) && amount > 0)
    .sort(([, a], [, b]) => b - a);
  const largestCost = costEntries[0];
  const largestCostShare = largestCost && data.totalCOGS > 0 ? (largestCost[1] / data.totalCOGS) * 100 : 0;
  const directCostInput = data.purchases + data.directLabor + data.directMaterials;
  const inventoryOffset = data.closingInventory > 0 && directCostInput > 0
    ? (data.closingInventory / (data.openingInventory + directCostInput)) * 100
    : 0;

  const executiveSummary = [
    `Total COGS for the selected period is ${formatCurrency(data.totalCOGS, data.currencyCode, data.currencySymbol)} against revenue of ${formatCurrency(data.revenue, data.currencyCode, data.currencySymbol)}.`,
    data.grossProfit >= 0
      ? `Gross profit is ${formatCurrency(data.grossProfit, data.currencyCode, data.currencySymbol)}, with a gross margin of ${data.grossProfitMargin.toFixed(2)}%.`
      : `The report shows a gross loss of ${formatCurrency(Math.abs(data.grossProfit), data.currencyCode, data.currencySymbol)}, so direct production costs exceeded recorded revenue.`,
  ];

  if (largestCost) {
    executiveSummary.push(`${largestCost[0]} is the largest direct cost category, representing ${largestCostShare.toFixed(1)}% of recorded COGS.`);
  } else {
    executiveSummary.push('No detailed direct-cost category breakdown was available for this export.');
  }

  const riskAssessment = [
    data.revenue <= 0
      ? 'Revenue is missing or zero, so gross margin cannot be used as a reliable profitability indicator.'
      : data.grossProfitMargin < 0
        ? 'Gross margin is negative. Review whether feed, seed, additive, labour, or inventory costs are being recorded against the correct cycle and period.'
        : data.grossProfitMargin < 20
          ? 'Gross margin is thin. Feed efficiency, stocking outcome, and harvest yield should be reviewed before the next purchasing decision.'
          : 'Gross margin is positive for this period, but it should still be compared with biomass, harvest yield, and feed conversion before judging cycle efficiency.',
    largestCost && largestCostShare >= 60
      ? `${largestCost[0]} is highly concentrated within COGS. This creates cost-driver risk if the category increases or is not matched by harvest output.`
      : 'No single direct-cost category exceeds the high concentration threshold from the available breakdown.',
    data.closingInventory <= 0
      ? 'Closing inventory is zero or missing. Confirm that remaining feed and materials were counted before using this report as a final COGS result.'
      : `Closing inventory offsets ${inventoryOffset.toFixed(1)}% of goods available for sale, reducing the cost assigned to this period.`,
  ];

  const recommendations = [
    largestCost
      ? `Review ${largestCost[0]} because it is the largest COGS driver and has the strongest effect on gross margin.`
      : 'Add cost categories for feed, additives, seed, labour, and materials so the next COGS report can identify the main production cost driver.',
    data.revenue > 0 && data.grossProfitMargin < 20
      ? 'Compare COGS against harvest biomass and FCR before increasing stocking density or feed purchases for the next cycle.'
      : 'Continue reconciling direct costs against harvest volume so cost per kg can be evaluated once harvest data is complete.',
    'Reconcile inventory stock-in, usage, and closing count before treating COGS as final.',
  ];

  const dataQualityNotes = [
    'COGS is calculated from opening inventory, purchases, direct labour, direct materials, and closing inventory available at export time.',
    data.revenue <= 0
      ? 'Revenue was not available, so gross profit and margin are limited as performance indicators.'
      : 'Revenue is included for gross profit context; this report does not replace the Profit and Loss report.',
    costEntries.length === 0
      ? 'Detailed direct-cost categories were not available, limiting cost-driver analysis.'
      : 'Category percentages are based on the available COGS breakdown and may exclude uncategorised costs.',
  ];

  return { executiveSummary, riskAssessment, recommendations, dataQualityNotes };
};

const generateCOGSHTML = (data: COGSData, brandAssets: PdfBrandAssets): string => {
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
    categoryBreakdown,
    currencyCode,
    currencySymbol
  } = data;

  const goodsAvailable = openingInventory + purchases + directLabor + directMaterials;
  const reportAnalysis = buildCOGSReportAnalysis(data);
  const money = (amount: number) => formatCurrency(amount, currencyCode, currencySymbol);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cost of Goods Sold Report</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: 612px 792px; margin: 0; }
        html { width: 100%; min-height: 100%; }
        body {
          width: 100%;
          min-height: 100%;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          padding: 40px 44px;
          color: #2C3E50;
          background: #0F4C75;
          font-size: 14px;
          line-height: 1.6;
        }
        .page-bg {
          position: fixed;
          inset: -14px;
          width: calc(100% + 28px);
          height: calc(100% + 28px);
          object-fit: cover;
          z-index: 0;
        }
        .page-logo {
          position: fixed;
          top: 30px;
          right: 38px;
          width: 64px;
          height: 64px;
          object-fit: contain;
          z-index: 2;
        }
        .report-content {
          position: relative;
          z-index: 1;
        }
        .header { margin-bottom: 30px; padding-right: 82px; min-height: 62px; }
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
        .line-item.subtotal { font-weight: 600; font-size: 14px; border-bottom: 1px solid #BDC3C7; padding: 10px 0; margin-top: 8px; color: #34495E; background: rgba(248, 250, 251, 0.72); padding-left: 10px; padding-right: 10px; }
        .line-item.gross-profit { font-weight: 700; font-size: 16px; color: #27AE60; border-bottom: 3px double #27AE60; padding: 15px 0; margin-top: 15px; }
        .line-item.gross-loss { font-weight: 700; font-size: 16px; color: #E74C3C; border-bottom: 3px double #E74C3C; padding: 15px 0; margin-top: 15px; }
        .amount { text-align: right; font-variant-numeric: tabular-nums; }
        .amount.positive { color: #27AE60; }
        .amount.negative { color: #E74C3C; }
        .currency { font-size: 12px; color: #2C3E50; display: block; text-align: right; margin-top: 2px; }
        .metric-box { background: rgba(39, 174, 96, 0.88); color: white; padding: 20px; margin-bottom: 20px; border-radius: 0; text-align: center; }
        .metric-label { font-size: 13px; opacity: 0.9; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .metric-value { font-size: 32px; font-weight: 700; }
        .summary-box { background: rgba(248, 250, 251, 0.72); border-left: 4px solid #27AE60; padding: 15px; margin-top: 30px; border-radius: 0; }
        .summary-item { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
        .summary-item.highlight { font-weight: 700; font-size: 16px; color: #2C3E50; border-top: 2px solid #BDC3C7; margin-top: 10px; padding-top: 12px; }
        .analysis-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 20px; }
        .analysis-box { background: rgba(248, 250, 251, 0.72); border-left: 4px solid #0F4C75; padding: 13px; border-radius: 0; }
        .analysis-box.risk { border-left-color: #F59E0B; }
        .analysis-box.recommendation { border-left-color: #27AE60; }
        .analysis-box.quality { border-left-color: #64748B; grid-column: 1 / -1; }
        .analysis-title { font-size: 12px; font-weight: 800; color: #0F4C75; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 8px; }
        .analysis-box.risk .analysis-title { color: #B45309; }
        .analysis-box.recommendation .analysis-title { color: #166534; }
        .analysis-list { padding-left: 16px; font-size: 11px; line-height: 1.45; color: #2C3E50; }
        .analysis-list li { margin-bottom: 5px; }
        .breakdown-item { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #ECF0F1; }
        .breakdown-item:last-child { border-bottom: none; }
        .percentage { font-size: 12px; color: #95A5A6; margin-left: 8px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #ECF0F1; font-size: 12px; color: #2C3E50; text-align: center; }
      </style>
    </head>
    <body>
      <img class="page-bg" src="data:image/png;base64,${brandAssets.backgroundBase64}" alt="" />
      <img class="page-logo" src="data:image/png;base64,${brandAssets.logoBase64}" alt="Shrimply" />
      <div class="report-content">
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
            <span class="amount">${money(openingInventory)}</span>
            <span class="currency">${currencyCode || 'IDR'}</span>
          </div>
        </div>
        <div class="line-item subcategory">
          <span>Add: Purchases (Feed & Materials)</span>
          <span class="amount">${money(purchases)}</span>
        </div>
        <div class="line-item subcategory">
          <span>Add: Direct Labor</span>
          <span class="amount">${money(directLabor)}</span>
        </div>
        <div class="line-item subcategory">
          <span>Add: Direct Materials (Pond Additives)</span>
          <span class="amount">${money(directMaterials)}</span>
        </div>
        <div class="line-item subtotal">
          <span>Goods Available for Sale</span>
          <div>
            <span class="amount">${money(goodsAvailable)}</span>
            <span class="currency">${currencyCode || 'IDR'}</span>
          </div>
        </div>
        <div class="line-item category">
          <span>Less: Closing Inventory</span>
          <div>
            <span class="amount negative">(${money(closingInventory)})</span>
            <span class="currency">${currencyCode || 'IDR'}</span>
          </div>
        </div>
        <div class="line-item total">
          <span>Total Cost of Goods Sold</span>
          <div>
            <span class="amount negative">${money(totalCOGS)}</span>
            <span class="currency">${currencyCode || 'IDR'}</span>
          </div>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Gross Profit Analysis</div>
        <div class="line-item category">
          <span>Total Revenue</span>
          <div>
            <span class="amount positive">${money(revenue)}</span>
            <span class="currency">${currencyCode || 'IDR'}</span>
          </div>
        </div>
        <div class="line-item category">
          <span>Less: Cost of Goods Sold</span>
          <div>
            <span class="amount negative">(${money(totalCOGS)})</span>
            <span class="currency">${currencyCode || 'IDR'}</span>
          </div>
        </div>
        <div class="line-item ${grossProfit >= 0 ? 'gross-profit' : 'gross-loss'}">
          <span>Gross ${grossProfit >= 0 ? 'Profit' : 'Loss'}</span>
          <div>
            <span class="amount ${grossProfit >= 0 ? 'positive' : 'negative'}">${money(Math.abs(grossProfit))}</span>
            <span class="currency">${currencyCode || 'IDR'}</span>
          </div>
        </div>
        <div class="line-item category">
          <span>Gross Profit Margin</span>
          <span class="amount ${grossProfitMargin >= 0 ? 'positive' : 'negative'}">${grossProfitMargin.toFixed(2)}%</span>
        </div>
      </div>
      
      ${Object.keys(categoryBreakdown).length > 0 ? `
        <div class="section">
          <div class="section-title">Direct Costs Breakdown</div>
          ${Object.entries(categoryBreakdown)
            .sort(([, a], [, b]) => b - a)
            .map(([category, amount]) => {
              const percentage = totalCOGS > 0 ? (amount / totalCOGS * 100).toFixed(1) : '0.0';
              return `
                <div class="breakdown-item">
                  <span>${category}</span>
                  <span>
                    ${money(amount)}
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
          <span class="amount positive">${money(revenue)}</span>
        </div>
        <div class="summary-item">
          <span>Cost of Goods Sold:</span>
          <span class="amount negative">${money(totalCOGS)}</span>
        </div>
        <div class="summary-item highlight">
          <span>${grossProfit >= 0 ? 'Gross Profit:' : 'Gross Loss:'}</span>
          <span class="amount ${grossProfit >= 0 ? 'positive' : 'negative'}">${money(Math.abs(grossProfit))}</span>
        </div>
        <div class="summary-item">
          <span>Gross Profit Margin:</span>
          <span class="amount ${grossProfitMargin >= 0 ? 'positive' : 'negative'}">${grossProfitMargin.toFixed(2)}%</span>
        </div>
      </div>

      <div class="analysis-grid">
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
        <div class="analysis-box recommendation">
          <div class="analysis-title">Recommendations</div>
          <ul class="analysis-list">
            ${reportAnalysis.recommendations.map((item) => `<li>${item}</li>`).join('')}
          </ul>
        </div>
        <div class="analysis-box quality">
          <div class="analysis-title">Assumptions and Data Quality</div>
          <ul class="analysis-list">
            ${reportAnalysis.dataQualityNotes.map((item) => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      </div>
      
      <div class="footer">
        Generated by Shrimply Aquaculture Management on ${new Date().toLocaleString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric'
        })} - ${companyName}
      </div>
      </div>
    </body>
    </html>
  `;
};

export const exportCOGSPDF = async (data: COGSData) => {
  try {
    const brandAssets = await loadCOGSBrandAssets();
    const html = generateCOGSHTML(data, brandAssets);
    
    const { uri } = await Print.printToFileAsync({
      html,
      textZoom: 100,
      width: 612,
      height: 792,
      margins: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
      base64: false,
    });
    
    // Create Custom Filename
    const cleanDate = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).replace(' ', '');
    const safeCompanyName = data.companyName.replace(/[^a-zA-Z0-9]/g, '');
    const filename = `COGS_Report_${safeCompanyName}_${cleanDate}.pdf`;
    
    const newUri = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.copyAsync({
      from: uri,
      to: newUri
    });
    
    const canShare = await Sharing.isAvailableAsync();
    
    if (canShare) {
      await Sharing.shareAsync(newUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share COGS Report',
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert(
        'PDF Generated',
        `Your COGS report has been saved to: ${newUri}`,
        [{ text: 'OK' }]
      );
    }
    
    return newUri;
  } catch (error) {
    console.error('Error generating COGS PDF:', error);
    Alert.alert('Error', 'Failed to generate COGS PDF report');
    throw error;
  }
};
