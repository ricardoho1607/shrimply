import { AppAlert as Alert } from '../../components/alerts/appAlert';
// services/pdfExportService.ts
import { Asset } from 'expo-asset';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import {
  formatPdfDate,
  formatPdfDateTime,
  formatPdfNumber,
  localizePdfHtml,
  localizePdfText,
  type PdfLanguage,
} from '../../shared/pdfReportI18n';

const PDF_BACKGROUND_ASSET = require('../../assets/pdf/shrimply-pdf-background-portrait.png');
const PDF_LOGO_ASSET = require('../../assets/pdf/shrimply-logo.png');

interface PdfBrandAssets {
  backgroundBase64: string;
  logoBase64: string;
}

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
  currencyCode: string;
  currencySymbol: string;
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

const loadProfitLossBrandAssets = async (): Promise<PdfBrandAssets> => {
  const [backgroundBase64, logoBase64] = await Promise.all([
    loadBase64Asset(PDF_BACKGROUND_ASSET),
    loadBase64Asset(PDF_LOGO_ASSET),
  ]);

  return { backgroundBase64, logoBase64 };
};

const formatCurrency = (amount: number, currencyCode: string, currencySymbol: string, language: PdfLanguage): string => {
  const decimalPlaces = currencyCode === 'IDR' || currencyCode === 'VND' ? 0 : 2;
  const formatted = formatPdfNumber(amount, language, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });
  
  return `${currencySymbol} ${formatted}`;
};

const formatDate = (dateStr: string, language: PdfLanguage): string => formatPdfDate(dateStr, language);

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]!));

const getLargestBreakdownItem = (breakdown: ExpenseBreakdown | RevenueBreakdown): { category: string; amount: number } | null => {
  const entries = Object.entries(breakdown).filter(([, amount]) => amount > 0);
  if (entries.length === 0) return null;

  const [category, amount] = entries.sort(([, a], [, b]) => b - a)[0];
  return { category, amount };
};

const getProfitLossAnalysis = (data: FinancialData, language: PdfLanguage) => {
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
  const money = (amount: number) => formatCurrency(amount, data.currencyCode, data.currencySymbol, language);

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
      ? `Total revenue for the period was ${money(totalRevenue)}. Gross profit was ${money(grossProfit)} and net ${netProfit >= 0 ? 'income' : 'loss'} was ${money(Math.abs(netProfit))}.`
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
    cogsShare === null
      ? 'COGS as a share of revenue cannot be assessed because no positive revenue was recorded.'
      : cogsShare > 65
      ? `COGS represented ${cogsShare.toFixed(2)}% of revenue, indicating pressure on gross margin and production efficiency.`
      : 'COGS did not exceed the high-risk threshold based on the selected period revenue.',
    opexShare === null
      ? 'Operating expenses as a share of revenue cannot be assessed because no positive revenue was recorded.'
      : opexShare > 35
      ? `Operating expenses represented ${opexShare.toFixed(2)}% of revenue. Overhead should be reviewed if this pattern continues.`
      : 'Operating expenses did not exceed the high-risk threshold based on selected period revenue.',
  ];

  if (largestOPEX) {
    riskAssessment.push(`${largestOPEX.category} was the largest operating expense category and should be reviewed for budget control.`);
  }

  if (totalOtherExpenses > 0) {
    riskAssessment.push(`Non-operating or other expenses totaled ${money(totalOtherExpenses)} and reduced the final net result.`);
  }

  if (operatingMargin !== null && operatingMargin < 0) {
    riskAssessment.push('Operating income was negative before non-operating expenses, indicating the core operation did not cover its operating cost base.');
  }

  return { executiveSummary, riskAssessment };
};

const generateProfitLossHTML = (
  data: FinancialData,
  brandAssets: PdfBrandAssets,
  language: PdfLanguage,
  useIosPrintLayout = false,
): string => {
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
    netProfit,
    currencyCode,
    currencySymbol,
  } = data;
  const reportAnalysis = getProfitLossAnalysis(data, language);
  const money = (amount: number) => formatCurrency(amount, currencyCode, currencySymbol, language);
  const printPageSize = useIosPrintLayout ? '612px 792px' : '8.5in 11in';
  const printPageWidth = useIosPrintLayout ? '100%' : '8.5in';
  const printPageHeight = useIosPrintLayout ? '100%' : '11in';

  // Budget for the smallest renderer (612 x 792 CSS pixels). Explicit text
  // lines keep pagination identical in native printing and the web canvas export.
  const lines = (text: string, limit: number) => {
    const characters = Array.from(localizePdfText(text, language));
    const result: string[] = [];
    while (characters.length) {
      // Conservative glyph widths at 12px, including full-width CJK text.
      let width = 0;
      let end = 0;
      while (end < characters.length) {
        const char = characters[end];
        const glyphWidth = /[\u0000-\u007f]/.test(char)
          ? /[ il.,:;'!|]/.test(char) ? 0.4 : /[A-Zmw@]/.test(char) ? 1 : 0.75
          : 1.1;
        if (width + glyphWidth > limit) break;
        width += glyphWidth;
        end += 1;
      }
      if (end < characters.length) {
        const space = characters.slice(0, end + 1).lastIndexOf(' ');
        if (space > 0) end = space + 1;
      }
      result.push(characters.splice(0, end).join(''));
    }
    return result.length ? result : [''];
  };
  const pages: { title: string; blocks: string[] }[] = [];
  let used = 0;
  let title = 'Income Statement';
  const newPage = () => { pages.push({ title, blocks: [] }); used = 0; };
  newPage();
  const add = (html: string, height: number) => {
    if (used + height > 480) newPage();
    pages[pages.length - 1].blocks.push(html);
    used += height;
  };
  const row = (label: string, value: string, style = 'category') => {
    const labelLines = lines(label, 24);
    labelLines.forEach((line, index) => add(
      `<div class="report-row ${style}"><span>${escapeHtml(line)}</span><span class="amount">${index === labelLines.length - 1 ? escapeHtml(value) : ''}</span></div>`, 32,
    ));
  };
  const section = (heading: string, entries: Record<string, number>, totalLabel: string, total: number, expense = false, empty = '') => {
    const headingHtml = `<div class="report-heading">${localizePdfText(heading, language)}</div>`;
    if (used + 96 > 480) newPage();
    add(headingHtml, 32);
    Object.entries(entries).forEach(([category, amount]) => {
      // Repeat the section label when a category needs a continuation page.
      if (used + lines(category, 24).length * 32 > 480 && used > 32) {
        newPage();
        add(headingHtml, 32);
      }
      row(category, money(amount));
    });
    if (!Object.keys(entries).length && empty) row(empty, '-');
    if (used + lines(totalLabel, 24).length * 32 > 480) {
      newPage();
      add(headingHtml, 32);
    }
    row(totalLabel, expense ? `(${money(total)})` : money(total), 'total');
  };
  section('Revenue', revenueBreakdown, 'Total Revenue', totalRevenue);
  section('Cost of Goods Sold (COGS)', cogsBreakdown, 'Total Cost of Goods Sold', totalCOGS, true, 'No COGS recorded');
  row('Gross Profit', money(grossProfit), 'gross');
  section('Operating Expenses (OPEX)', opexBreakdown, 'Total Operating Expenses', totalOPEX, true, 'No Operating Expenses recorded');
  row('Operating Income (EBITDA)', money(operatingIncome), 'gross');
  if (totalOtherExpenses > 0) section('Non-Operating Expenses / Other', otherExpenseBreakdown, 'Total Non-Operating Expenses', totalOtherExpenses, true);
  row(`Net ${netProfit >= 0 ? 'Income' : 'Loss'}`, `${money(Math.abs(netProfit))} ${currencyCode}`, 'net');
  title = 'Profit & Loss Analysis';
  newPage();
  row('Gross Profit Margin:', totalRevenue > 0 ? `${((grossProfit / totalRevenue) * 100).toFixed(2)}%` : 'N/A');
  row('Operating Margin:', totalRevenue > 0 ? `${((operatingIncome / totalRevenue) * 100).toFixed(2)}%` : 'N/A');
  row('Net Profit Margin:', totalRevenue > 0 ? `${((netProfit / totalRevenue) * 100).toFixed(2)}%` : 'N/A');
  for (const [heading, items] of [['Executive Summary', reportAnalysis.executiveSummary], ['Risk Assessment', reportAnalysis.riskAssessment]] as const) {
    const firstItemHeight = lines(items[0] || '', 38).length * 24 + 8;
    if (used + 32 + Math.min(firstItemHeight, 448) > 480) newPage();
    add(`<div class="report-heading">${localizePdfText(heading, language)}</div>`, 32);
    for (const item of items) {
      const itemLines = lines(item, 38);
      const height = itemLines.length * 24 + 8;
      if (height <= 480 && used + height > 480) newPage();
      for (const line of itemLines) add(`<div class="analysis-line">${escapeHtml(line)}</div>`, 24);
      if (used + 8 <= 480) add('<div class="analysis-gap"></div>', 8);
    }
  }
  const renderedPages = pages.map((page, index) => `
    <div class="pdf-page">
      <img class="page-bg" src="data:image/png;base64,${brandAssets.backgroundBase64}" alt="" />
      <div class="page-content">
        <div class="header">
          <img class="header-logo" src="data:image/png;base64,${brandAssets.logoBase64}" alt="Shrimply" />
          <div class="title">${page.title}</div>
          <div class="company-name">${escapeHtml(companyName)}</div>
          <div class="date-range">${formatDate(startDate, language)} - ${formatDate(endDate, language)}</div>
        </div>
        <div class="divider"></div>
        <div class="report-blocks">${page.blocks.join('')}</div>
        <div class="footer">Generated by Shrimply Aquaculture Management on ${formatPdfDateTime(new Date(), language, { year: 'numeric', month: 'long', day: 'numeric' })} - ${escapeHtml(companyName)}
          <br/>Statement prepared according to multi-step income format. · ${index + 1} / ${pages.length}</div>
      </div>
    </div>`).join('');

  return localizePdfHtml(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Profit and Loss Statement</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        @page { size: ${printPageSize}; margin: 0; }
        html { width:100%; height:100%; }
        body {
          width:${printPageWidth}; height:${printPageHeight};
          font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color:#111827; background:#0F4C75; font-size:12px; line-height:1.35;
        }
        .pdf-page {
          width:100%; height:100%; padding:38px 44px 34px;
          position:relative; overflow:hidden; background:#0F4C75;
          page-break-after:always;
          ${useIosPrintLayout ? '' : 'break-inside: avoid; page-break-inside: avoid;'}
          print-color-adjust:exact; -webkit-print-color-adjust:exact;
        }
        .pdf-page:last-child { page-break-after:auto; }
        .page-bg { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; z-index:0; }
        .page-content { position:relative; z-index:1; height:100%; display:flex; flex-direction:column; }
        .page-content > * { flex-shrink:0; }
        .header { margin-bottom:18px; padding-right:78px; position:relative; min-height:58px; }
        .header-logo { position:absolute; top:-6px; right:0; width:64px; height:64px; object-fit:contain; filter:grayscale(1); }
        .title { font-size:28px; font-weight:700; margin-bottom:6px; }
        .company-name { font-size:14px; margin-bottom:3px; font-weight:600; overflow-wrap:anywhere; }
        .date-range { font-size:13px; }
        .divider { height:3px; background:#374151; margin:15px 0; border-radius:2px; }
        .report-row { display:flex; align-items:center; justify-content:space-between; gap:12px; min-height:32px; font-size:12px; line-height:16px; }
        .report-row > span:first-child { overflow-wrap:anywhere; }
        .amount { text-align:right; font-variant-numeric:tabular-nums; flex-shrink:0; white-space:nowrap; }
        .report-row.total, .report-row.gross, .report-row.net { font-weight:700; border-top:1px solid #6B7280; }
        .report-heading { min-height:32px; padding-top:8px; font-weight:700; font-size:13px; }
        .analysis-line { min-height:24px; line-height:24px; font-size:12px; overflow-wrap:anywhere; }
        .analysis-gap { height:8px; }
        .footer { margin-top:auto; padding-top:12px; border-top:1px solid rgba(15,76,117,0.18); font-size:10px; text-align:center; }
      </style>
    </head>
    <body>
      ${renderedPages}
    </body>
    </html>
  `, language);
};

export const exportFinancialPDF = async (data: FinancialData, language: PdfLanguage = 'en') => {
  try {
    const brandAssets = await loadProfitLossBrandAssets();
    const html = generateProfitLossHTML(data, brandAssets, language, Platform.OS === 'ios');
    
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
        dialogTitle: localizePdfText('Share Profit & Loss Statement', language),
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert(
        localizePdfText('PDF Generated', language),
        localizePdfText(`Your financial report has been saved to: ${newUri}`, language),
        [{ text: localizePdfText('OK', language) }]
      );
    }
    
    return newUri;
  } catch (error) {
    console.error('Error generating PDF:', error);
    Alert.alert(localizePdfText('Error', language), localizePdfText('Failed to generate PDF report', language));
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
  netProfit: number,
  currencyCode: string,
  currencySymbol: string,
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
    currencyCode,
    currencySymbol,
  };
};
