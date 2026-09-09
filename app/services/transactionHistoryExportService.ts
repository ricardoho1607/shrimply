import { Asset } from 'expo-asset';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert, Platform } from 'react-native';
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

export interface TransactionHistorySource {
  id: string;
  date: string;
  category?: string;
  item?: string;
  description?: string;
  amount: number;
  paymentType?: string;
  settlements?: { id: string; date: string; amount: number }[];
  voided?: boolean;
  reference?: string;
  cycleName?: string;
  timestamp?: number;
}

export interface TransactionHistoryRow extends TransactionHistorySource {
  type: 'income' | 'expense';
}

export interface TransactionHistoryData {
  period: string;
  startDate: string;
  endDate: string;
  companyName: string;
  openingBalance: number;
  transactions: TransactionHistoryRow[];
  totalIncome: number;
  totalExpenses: number;
  netMovement: number;
  closingBalance: number;
  currencyCode: string;
  currencySymbol: string;
}

const loadBase64Asset = async (assetModule: number): Promise<string> => {
  const asset = Asset.fromModule(assetModule);
  await asset.downloadAsync();
  const assetUri = asset.localUri || asset.uri;
  if (!assetUri) throw new Error('Unable to resolve PDF asset URI');
  return FileSystem.readAsStringAsync(assetUri, { encoding: FileSystem.EncodingType.Base64 });
};

const loadTransactionHistoryBrandAssets = async (): Promise<PdfBrandAssets> => {
  const [backgroundBase64, logoBase64] = await Promise.all([
    loadBase64Asset(PDF_BACKGROUND_ASSET),
    loadBase64Asset(PDF_LOGO_ASSET),
  ]);
  return { backgroundBase64, logoBase64 };
};

const formatCurrency = (amount: number, currencyCode: string, currencySymbol: string, language: PdfLanguage): string => {
  const decimalPlaces = currencyCode === 'IDR' || currencyCode === 'VND' ? 0 : 2;
  return `${currencySymbol} ${formatPdfNumber(amount, language, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  })}`;
};

const escapeHtml = (value: unknown): string => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const transactionDateKey = (transaction: TransactionHistorySource): string => (
  transaction.date.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || transaction.date || ''
);

const transactionTimestamp = (transaction: TransactionHistorySource): number => {
  const timestamp = Number(transaction.timestamp);
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const formatReportDate = (
  value: string,
  language: PdfLanguage,
  options?: Intl.DateTimeFormatOptions,
): string => {
  const dateKey = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  return formatPdfDate(dateKey ? `${dateKey}T12:00:00` : value, language, options);
};

export const prepareTransactionHistoryData = (
  period: string,
  startDate: string,
  endDate: string,
  companyName: string,
  openingBalance: number,
  expenses: TransactionHistorySource[],
  revenues: TransactionHistorySource[],
  currencyCode: string,
  currencySymbol: string,
): TransactionHistoryData => {
  expenses = expenses.filter(transaction => !transaction.voided);
  revenues = revenues.filter(transaction => !transaction.voided);
  if (!Number.isFinite(openingBalance)) throw new Error('The opening recorded balance is invalid.');
  for (const transaction of [...expenses, ...revenues]) {
    if (transaction.amount == null || String(transaction.amount).trim() === '' || !Number.isFinite(Number(transaction.amount))) {
      throw new Error('A transaction amount is missing or invalid. Correct it before exporting.');
    }
    const settlements = transaction.settlements || [];
    if (settlements.some(payment => !Number.isFinite(payment.amount) || payment.amount <= 0)
      || new Set(settlements.map(payment => payment.id)).size !== settlements.length
      || (settlements.length > 0 && settlements.reduce((sum, payment) => sum + payment.amount, 0) > Number(transaction.amount) + 0.001)) {
      throw new Error('A transaction has invalid payment records. Reconcile its payments before exporting.');
    }
  }
  const transactions = [
    ...expenses.map((transaction): TransactionHistoryRow => ({ ...transaction, type: 'expense' })),
    ...revenues.map((transaction): TransactionHistoryRow => ({ ...transaction, type: 'income' })),
  ].sort((a, b) => (
    transactionDateKey(a).localeCompare(transactionDateKey(b))
    || transactionTimestamp(a) - transactionTimestamp(b)
    || a.id.localeCompare(b.id)
  ));
  const totalIncome = revenues.reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0);
  const totalExpenses = expenses.reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0);
  const netMovement = totalIncome - totalExpenses;

  return {
    period,
    startDate,
    endDate,
    companyName,
    openingBalance,
    transactions,
    totalIncome,
    totalExpenses,
    netMovement,
    closingBalance: openingBalance + netMovement,
    currencyCode,
    currencySymbol,
  };
};

const generateTransactionHistoryHTML = (
  data: TransactionHistoryData,
  brandAssets: PdfBrandAssets,
  language: PdfLanguage,
  useIosPrintLayout = false,
): string => {
  const money = (amount: number) => formatCurrency(amount, data.currencyCode, data.currencySymbol, language);
  const firstPageSize = 7;
  const continuationPageSize = 10;
  const expanded = data.transactions.flatMap(transaction => {
    const detail = [transaction.item, transaction.description, transaction.reference || transaction.id].filter(Boolean).join(' | ');
    const parts = detail.match(/[\s\S]{1,120}/g) || ['-'];
    return parts.map((detailPart, index) => ({ ...transaction, detailPart, continuation: index > 0 }));
  });
  const pages: (typeof expanded)[] = [];
  pages.push(expanded.slice(0, firstPageSize));
  for (let index = firstPageSize; index < expanded.length; index += continuationPageSize) {
    pages.push(expanded.slice(index, index + continuationPageSize));
  }
  if (pages.length === 0) pages.push([]);

  let runningBalance = data.openingBalance;
  const pageRows = pages.map((page) => page.map((transaction) => {
    const amount = Number(transaction.amount) || 0;
    if (!transaction.continuation) runningBalance += transaction.type === 'income' ? amount : -amount;
    return { transaction, amount, runningBalance };
  }));

  const printPageSize = useIosPrintLayout ? '612px 792px' : '8.5in 11in';
  const printPageWidth = useIosPrintLayout ? '100%' : '8.5in';
  const printPageHeight = useIosPrintLayout ? '100%' : '11in';
  const totalPages = pageRows.length;

  const renderPage = (rows: typeof pageRows[number], pageIndex: number) => `
    <div class="pdf-page">
      <img class="page-bg" src="data:image/png;base64,${brandAssets.backgroundBase64}" alt="" />
      <div class="report-content">
        <div class="header">
          <img class="page-logo" src="data:image/png;base64,${brandAssets.logoBase64}" alt="Shrimply" />
          <div class="title">Transaction Register</div>
          <div class="company-name">${escapeHtml(data.companyName)}</div>
          <div class="subtitle">Complete recorded income and expense activity</div>
          <div class="date-range">For ${formatReportDate(data.startDate, language)} - ${formatReportDate(data.endDate, language)}</div>
        </div>
        <div class="divider"></div>

        ${pageIndex === 0 ? `
          <div class="summary-grid">
            <div class="summary-card"><span>Opening Net Position</span><strong>${money(data.openingBalance)}</strong></div>
            <div class="summary-card"><span>Recorded Income</span><strong>${money(data.totalIncome)}</strong></div>
            <div class="summary-card"><span>Recorded Expenses</span><strong>${money(data.totalExpenses)}</strong></div>
            <div class="summary-card"><span>Closing Net Position</span><strong>${money(data.closingBalance)}</strong></div>
          </div>
        ` : ''}

        <div class="section-title">Transaction History</div>
        <table>
          <thead><tr>
            <th class="date-column">Date</th>
            <th>Details</th>
            <th class="payment-column">Payment</th>
            <th class="amount-column">Income</th>
            <th class="amount-column">Expense</th>
            <th class="amount-column">Running Net</th>
          </tr></thead>
          <tbody>
            ${rows.length > 0 ? rows.map(({ transaction, amount, runningBalance: balance }) => {
              const detail = [transaction.category, transaction.cycleName, transaction.continuation ? '(continued)' : ''].filter(Boolean).join(' | ') || '-';
              const paid = (transaction.settlements || []).reduce((sum, payment) => sum + Number(payment.amount), 0);
              const paymentText = transaction.continuation ? '' : `Confirmed: ${money(paid)} • Outstanding: ${money(Math.max(0, amount - paid))}`;
              return `<tr>
                <td><span class="cell-clip">${formatReportDate(transaction.date, language, { year: 'numeric', month: 'short', day: '2-digit' })}</span></td>
                <td><strong class="detail-copy">${escapeHtml(detail)}</strong><span class="detail-copy">${escapeHtml(transaction.detailPart)}</span></td>
                <td><span class="detail-copy">${escapeHtml(paymentText)}</span></td>
                <td class="number income"><span class="cell-clip">${!transaction.continuation && transaction.type === 'income' ? money(amount) : '-'}</span></td>
                <td class="number expense"><span class="cell-clip">${!transaction.continuation && transaction.type === 'expense' ? money(amount) : '-'}</span></td>
                <td class="number"><span class="cell-clip">${money(balance)}</span></td>
              </tr>`;
            }).join('') : `<tr><td colspan="6" class="empty">No transactions were recorded for this period.</td></tr>`}
          </tbody>
        </table>

        ${pageIndex === totalPages - 1 ? `
          <div class="report-note">
            <strong>Data Quality Note</strong>
            <span>This register combines the income and expense records saved in Shrimply. The running net position is not a bank-reconciled cash balance.</span>
          </div>
        ` : ''}

        <div class="footer">
          <span>Generated on ${formatPdfDateTime(new Date(), language, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <span>Page ${pageIndex + 1} of ${totalPages}</span>
        </div>
      </div>
    </div>
  `;

  return localizePdfHtml(`<!DOCTYPE html>
    <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Transaction Register</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: ${printPageSize}; margin: 0; }
        html { width: 100%; height: 100%; }
        body { width: ${printPageWidth}; height: ${printPageHeight}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827; background: #0F4C75; font-size: 10px; line-height: 1.35; }
        .pdf-page { width: 100%; height: ${printPageHeight}; padding: 30px 34px 26px; position: relative; overflow: hidden; background: #0F4C75; ${useIosPrintLayout ? '' : 'break-inside: avoid; page-break-inside: avoid;'} }
        .pdf-page + .pdf-page { break-before: page; page-break-before: always; }
        .page-bg { position: absolute; inset: -14px; width: calc(100% + 28px); height: calc(100% + 28px); object-fit: cover; z-index: 0; }
        .report-content { position: relative; z-index: 1; height: 100%; padding-bottom: 22px; display: flex; flex-direction: column; }
        .header { position: relative; min-height: 56px; padding-right: 70px; overflow: hidden; }
        .page-logo { position: absolute; top: -5px; right: 0; width: 54px; height: 54px; object-fit: contain; filter: grayscale(1); }
        .title { font-size: 24px; line-height: 1.1; font-weight: 700; color: #111827; margin-bottom: 3px; }
        .company-name { max-width: 100%; white-space: normal; overflow-wrap: anywhere; font-size: 12px; font-weight: 600; margin-bottom: 1px; }
        .subtitle, .date-range { white-space: normal; overflow-wrap: anywhere; font-size: 9px; color: #334155; }
        .divider { flex: 0 0 auto; height: 2px; background: #374151; margin: 7px 0 9px; }
        .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 10px; }
        .summary-card { min-width: 0; min-height: 34px; border: 1px solid #94A3B8; background: #FFFFFF; padding: 6px 8px; display: flex; align-items: center; justify-content: space-between; gap: 8px; overflow: hidden; }
        .summary-card span { min-width: 0; color: #475569; font-size: 8px; line-height: 1.15; text-transform: uppercase; letter-spacing: 0.2px; }
        .summary-card strong { flex: 0 0 auto; max-width: 55%; overflow: hidden; text-overflow: ellipsis; font-size: 10px; font-variant-numeric: tabular-nums; white-space: nowrap; }
        .section-title { flex: 0 0 auto; font-size: 11px; line-height: 1.2; font-weight: 800; color: #111827; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.35px; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; background: rgba(255,255,255,0.82); }
        tr { height: 25px; break-inside: avoid; page-break-inside: avoid; }
        th { height: 28px; background: #E8EEF2; color: #1F2937; font-size: 6.8px; line-height: 1.1; text-align: left; text-transform: uppercase; letter-spacing: 0.1px; padding: 4px; border: 1px solid #94A3B8; white-space: normal; overflow: hidden; }
        td { min-height: 25px; padding: 5px 4px; border: 1px solid #CBD5E1; vertical-align: middle; font-size: 8px; line-height: 1.15; overflow: hidden; }
        td strong { display: block; font-size: 8px; line-height: 1.15; }
        .cell-clip { display: block; max-width: 100%; white-space: normal; overflow-wrap: anywhere; }
        .detail-copy { display: block; white-space: normal; overflow-wrap: anywhere; font-size: 7px; line-height: 1.3; }
        .date-column { width: 11%; }
        .payment-column { width: 17%; }
        .amount-column { width: 14%; text-align: right; }
        .number { text-align: right; font-size: 7px; letter-spacing: -0.1px; font-variant-numeric: tabular-nums; white-space: nowrap; }
        .income { color: #166534; }
        .expense { color: #991B1B; }
        .empty { padding: 28px 10px; text-align: center; color: #64748B; }
        .report-note { flex: 0 0 auto; margin-top: 8px; border: 1px solid #94A3B8; border-left: 3px solid #4B5563; background: #FFFFFF; padding: 6px 8px; display: flex; flex-direction: column; gap: 2px; overflow: hidden; }
        .report-note strong { font-size: 8px; line-height: 1.15; text-transform: uppercase; letter-spacing: 0.25px; }
        .report-note span { color: #475569; font-size: 8px; line-height: 1.25; }
        .footer { position: absolute; right: 0; bottom: 0; left: 0; height: 18px; padding-top: 6px; border-top: 1px solid rgba(15, 76, 117, 0.18); font-size: 8px; color: #334155; display: flex; justify-content: space-between; }
      </style>
    </head><body>${pageRows.map(renderPage).join('')}</body></html>`, language);
};

export const exportTransactionHistoryPDF = async (data: TransactionHistoryData, language: PdfLanguage = 'en') => {
  try {
    const brandAssets = await loadTransactionHistoryBrandAssets();
    const html = generateTransactionHistoryHTML(data, brandAssets, language, Platform.OS === 'ios');
    const { uri } = await Print.printToFileAsync({
      html,
      textZoom: 100,
      width: 612,
      height: 792,
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      base64: false,
    });
    const safeCompanyName = data.companyName.replace(/[^a-zA-Z0-9]/g, '');
    const filename = `Transaction_Register_${safeCompanyName}_${new Date().toISOString().slice(0, 10)}.pdf`;
    const newUri = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.copyAsync({ from: uri, to: newUri });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(newUri, {
        mimeType: 'application/pdf',
        dialogTitle: localizePdfText('Share Transaction Register', language),
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert(
        localizePdfText('PDF Generated', language),
        localizePdfText(`Your transaction register has been saved to: ${newUri}`, language),
        [{ text: localizePdfText('OK', language) }],
      );
    }
    return newUri;
  } catch (error) {
    console.error('Error generating Transaction Register PDF:', error);
    Alert.alert(localizePdfText('Error', language), localizePdfText('Failed to generate Transaction Register PDF', language));
    throw error;
  }
};
