import type { CogsReportDetails } from '../../shared/cogsReport';
// app/services/cogsExportService.ts - Cost of Goods Sold Export Service
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

export interface COGSData {
  details?: CogsReportDetails;
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

const loadCOGSBrandAssets = async (): Promise<PdfBrandAssets> => {
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

const formatDate = (dateStr: string, language: PdfLanguage): string => formatPdfDate(dateStr, language, { year: 'numeric', month: 'short', day: 'numeric', ...( /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? { timeZone: 'UTC' } : {}) });

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
  categoryBreakdown: { [category: string]: number },
  currencyCode: string,
  currencySymbol: string,
  details?: CogsReportDetails,
): COGSData => {
  const totalCOGS = openingInventory + purchases + directLabor + directMaterials - closingInventory;
  const grossProfit = revenue - totalCOGS;
  const grossProfitMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  return {
    details,
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
    currencyCode,
    currencySymbol,
  };
};

const escapeCOGS = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));

const generateCOGSHTML = (
  data: COGSData,
  brandAssets: PdfBrandAssets,
  language: PdfLanguage,
  useIosPrintLayout = false,
): string => {
  const money = (value: number) => escapeCOGS(formatCurrency(value, data.currencyCode, data.currencySymbol, language));
  const numeric = (value: number, digits = 0) => escapeCOGS(formatPdfNumber(value, language, { maximumFractionDigits: digits }));
  const copy = (english: string, indonesian: string) => language === 'id' ? indonesian : english;
  const categoryLabel = (category: string) => category === 'Feed consumed'
    ? copy('Feed consumed', 'Pakan terpakai')
    : category === 'Additives consumed' ? copy('Additives consumed', 'Aditif terpakai')
    : category === 'Seed' ? copy('Seed', 'Benur') : category;
  const details = data.details;
  const productionCost = data.purchases + data.directLabor + data.directMaterials;
  const adjustment = data.openingInventory - data.closingInventory;
  const margin = data.revenue > 0 ? `${numeric(data.grossProfitMargin, 2)}%` : 'N/A';
  const categories = Object.entries(data.categoryBreakdown).sort(([, a], [, b]) => b - a);
  const categoryTotal = categories.reduce((sum, [, value]) => sum + value, 0);
  const assignedCost = details?.pondRows.reduce((sum, row) => sum + row.total, 0) ?? 0;
  const assignedRevenue = details?.pondRows.reduce((sum, row) => sum + row.revenue, 0) ?? 0;
  const pages: { title: string; content: string }[] = [];
  const line = (label: string, value: string, total = false) => `<div class="cogs-line${total ? ' cogs-total' : ''}"><span>${label}</span><strong>${value}</strong></div>`;
  const section = (title: string, content: string) => `<section class="cogs-section"><h2>${title}</h2>${content}</section>`;
  const note = (text: string) => `<p class="cogs-note">${text}</p>`;
  const list = (items: string[]) => `<ul class="cogs-list">${items.map(text => `<li>${text}</li>`).join('')}</ul>`;
  const chunks = <T,>(items: T[], count: number): T[][] => items.length ? Array.from({ length: Math.ceil(items.length / count) }, (_, index) => items.slice(index * count, (index + 1) * count)) : [[]];
  const basis = copy('Management report - consumption basis; provisional until production carry-forward and revenue are reconciled.', 'Laporan manajemen berbasis pemakaian; sementara sampai biaya produksi terbawa dan pendapatan direkonsiliasi.');
  pages.push({ title: 'Cost of Goods Sold', content:
    note(basis)
    + section('COGS Calculation',
      line(copy('Feed consumed and direct feed expenses', 'Pakan terpakai dan biaya pakan langsung'), money(data.purchases))
      + line(copy('Direct Labor', 'Tenaga kerja langsung'), money(data.directLabor))
      + line(copy('Additives and other production costs', 'Aditif dan biaya produksi lainnya'), money(data.directMaterials))
      + line(copy('Recorded production costs', 'Biaya produksi tercatat'), money(productionCost), true)
      + line(copy('Add: Opening production costs (WIP)', 'Tambah: Biaya produksi awal (WIP)'), money(data.openingInventory))
      + line(copy('Less: Closing production costs (WIP)', 'Kurang: Biaya produksi akhir (WIP)'), `(${money(data.closingInventory)})`)
      + line('Total Cost of Goods Sold', money(data.totalCOGS), true)
      + line(copy('Harvested shrimp (kg)', 'Udang dipanen (kg)'), details ? numeric(details.harvestedKg, 2) : 'N/A')
      + line(copy('COGS per kg of harvested shrimp', 'HPP per kg udang dipanen'), details && details.harvestedKg > 0 ? money(data.totalCOGS / details.harvestedKg) + ' / kg' : 'N/A', true))
    + section('Gross Profit Analysis',
      line('Total Revenue', money(data.revenue))
      + line('Less: Cost of Goods Sold', `(${money(data.totalCOGS)})`)
      + line(data.grossProfit >= 0 ? 'Gross Profit' : 'Gross Loss', money(Math.abs(data.grossProfit)), true)
      + line('Gross Profit Margin', margin))
    + note(copy('COGS/kg = total COGS divided by recorded harvest kg for the selected period. Revenue comes from finance entries; harvest sales are not added twice. This is not full-cycle unit cost, net profit, or cash flow.', 'HPP/kg = total HPP dibagi kg panen tercatat untuk periode terpilih. Pendapatan berasal dari catatan keuangan; penjualan panen tidak ditambahkan dua kali. Ini bukan biaya satuan siklus penuh, laba bersih, atau arus kas.'))
  });
  chunks(categories, 10).forEach((entries, index) => pages.push({ title: 'COGS Cost Breakdown', content:
    section(copy('Production cost categories', 'Kategori biaya produksi'),
      `<table class="cogs-table"><thead><tr><th>Category</th><th>${escapeCOGS(data.currencyCode)}</th><th>${copy('Share', 'Porsi')}</th></tr></thead><tbody>`
      + entries.map(([category, amount]) => `<tr><td>${escapeCOGS(categoryLabel(category))}</td><td>${money(amount)}</td><td>${productionCost > 0 ? numeric(amount / productionCost * 100, 1) + '%' : 'N/A'}</td></tr>`).join('')
      + `</tbody></table>`
      + (!entries.length ? note(copy('No cost category records are available.', 'Belum ada catatan kategori biaya.')) : ''))
    + (index === 0 ? section(copy('Cost reconciliation', 'Rekonsiliasi biaya'),
      line(copy('Category subtotal', 'Subtotal kategori'), money(categoryTotal))
      + line(copy('Production costs not in categories', 'Biaya produksi tanpa kategori'), money(productionCost - categoryTotal))
      + line(copy('Net production carry-forward adjustment', 'Penyesuaian neto biaya produksi terbawa'), money(adjustment))
      + line('Total Cost of Goods Sold', money(data.totalCOGS), true)) : '')
    + note(copy('Category shares use production costs before carry-forward adjustments. Inventory stock purchases are excluded when usage costs already represent consumption.', 'Porsi kategori memakai biaya produksi sebelum penyesuaian biaya terbawa. Pembelian persediaan dikecualikan saat pemakaian sudah dicatat sebagai biaya.'))
  }));
  chunks(details?.pondRows || [], 4).forEach(rows => pages.push({ title: copy('COGS by pond', 'HPP per kolam'), content:
    note(copy('Amounts are in', 'Nilai dalam') + ` ${escapeCOGS(data.currencyCode)}. ` + copy('Only stored pond links and recorded allocations are used.', 'Hanya tautan kolam dan alokasi biaya yang sudah tersimpan yang digunakan.'))
    + section(copy('Pond production costs', 'Biaya produksi per kolam'),
      `<table class="cogs-table cogs-pond-table"><thead><tr><th>Pond</th><th>Feed</th><th>${copy('Additives', 'Aditif')}</th><th>Labor</th><th>${copy('Other', 'Lainnya')}</th><th>Total</th></tr></thead><tbody>`
      + rows.map(row => `<tr><td>${escapeCOGS(row.pondName)}<small>${escapeCOGS(row.cycleName)}</small></td><td>${numeric(row.feed, 2)}</td><td>${numeric(row.additives, 2)}</td><td>${numeric(row.labor, 2)}</td><td>${numeric(row.other, 2)}</td><td><strong>${numeric(row.total, 2)}</strong></td></tr>`).join('')
      + `</tbody></table>`)
    + section(copy('Revenue and harvested output', 'Pendapatan dan hasil panen'),
      `<table class="cogs-table cogs-output-table"><thead><tr><th>Pond</th><th>Revenue</th><th>${copy('Harvest (kg)', 'Panen (kg)')}</th><th>${copy('Cost / kg', 'Biaya / kg')}</th></tr></thead><tbody>`
      + rows.map(row => `<tr><td>${escapeCOGS(row.pondName)}</td><td>${numeric(row.revenue, 2)}</td><td>${numeric(row.harvestedKg, 2)}</td><td>${row.harvestedKg > 0 ? numeric(row.total / row.harvestedKg, 2) : 'N/A'}</td></tr>`).join('')
      + `</tbody></table>`)
    + (!rows.length ? note(copy('No pond records are available for this scope.', 'Tidak ada catatan kolam untuk cakupan ini.')) : '')
    + note(copy('Pond totals exclude unallocated costs and company-level carry-forward. Period cost/kg is not full-cycle unit cost when costs and harvest fall in different periods. N/A means no recorded harvest denominator.', 'Total kolam tidak mencakup biaya belum dialokasikan dan biaya terbawa tingkat perusahaan. Biaya periode/kg bukan biaya satuan satu siklus jika biaya dan panen terjadi pada periode berbeda. N/A berarti belum ada berat panen tercatat.'))
  }));
  pages.push({ title: copy('Revenue reconciliation', 'Rekonsiliasi pendapatan'), content:
    section(copy('Revenue recording check', 'Pemeriksaan pencatatan pendapatan'),
      line(copy('Recorded revenue entries', 'Jumlah catatan pendapatan'), details ? numeric(details.revenueRecordCount) : 'N/A')
      + line(copy('Revenue entries with missing amounts', 'Catatan pendapatan tanpa nilai'), details ? numeric(details.missingRevenueAmountCount) : 'N/A')
      + line('Total Revenue', money(data.revenue), true)
      + line(copy('Harvest sales in this period', 'Penjualan panen periode ini'), details ? money(details.harvestSales) : 'N/A')
      + line(copy('Revenue linked to those harvests', 'Pendapatan tertaut ke panen tersebut'), details ? money(details.linkedHarvestRevenue) : 'N/A')
      + line(copy('Harvests without a revenue entry', 'Panen tanpa catatan pendapatan'), details ? numeric(details.missingHarvestRevenueCount) : 'N/A')
      + line(copy('Harvest amount mismatches', 'Selisih nilai panen'), details ? numeric(details.mismatchedHarvestRevenueCount) : 'N/A')
      + line(copy('Duplicate harvest revenue references', 'Referensi pendapatan panen ganda'), details ? numeric(details.duplicateHarvestRevenueCount) : 'N/A'))
    + section(copy('Pond allocation reconciliation', 'Rekonsiliasi alokasi kolam'),
      line(copy('Costs assigned to ponds', 'Biaya dialokasikan ke kolam'), money(assignedCost))
      + line(copy('Unallocated production costs', 'Biaya produksi belum dialokasikan'), money(details?.unallocatedCost ?? productionCost))
      + line(copy('Net production carry-forward adjustment', 'Penyesuaian neto biaya produksi terbawa'), money(adjustment))
      + line('Total Cost of Goods Sold', money(data.totalCOGS), true)
      + line(copy('Revenue assigned to ponds', 'Pendapatan dialokasikan ke kolam'), money(assignedRevenue))
      + line(copy('Unallocated revenue', 'Pendapatan belum dialokasikan'), money(details?.unallocatedRevenue ?? data.revenue)) )
    + note(copy('Harvest checks match HARVEST references within the selected dates and cycle. A timing difference or an unlinked manual sale requires review; this check does not create or change accounting entries.', 'Pemeriksaan panen mencocokkan referensi HARVEST pada tanggal dan siklus terpilih. Perbedaan waktu atau penjualan manual tanpa tautan perlu ditinjau; pemeriksaan ini tidak membuat atau mengubah catatan keuangan.'))
  });
  const largest = categories[0];
  pages.push({ title: 'COGS Analysis', content:
    section('Executive Summary', list([
      copy('Recorded production costs:', 'Biaya produksi tercatat:') + ` ${money(productionCost)}. ` + copy('Reported COGS after carry-forward:', 'HPP setelah penyesuaian biaya terbawa:') + ` ${money(data.totalCOGS)}.`,
      copy('COGS per kg:', 'HPP per kg:') + ` ${details && details.harvestedKg > 0 ? money(data.totalCOGS / details.harvestedKg) + ' / kg' : 'N/A'}. ` + copy('Based on recorded harvested kilograms in the selected period.', 'Berdasarkan kilogram panen tercatat pada periode terpilih.'),
      copy('Recorded revenue:', 'Pendapatan tercatat:') + ` ${money(data.revenue)}. ` + copy('Gross margin:', 'Margin kotor:') + ` ${margin}.`,
      largest ? `${escapeCOGS(categoryLabel(largest[0]))}: ${money(largest[1])} (${productionCost > 0 ? numeric(largest[1] / productionCost * 100, 1) : 'N/A'}%).` : copy('No cost category detail is available.', 'Rincian kategori biaya belum tersedia.'),
    ]))
    + section('Risk Assessment', list([
      data.revenue <= 0 ? copy('No positive revenue is recorded for this scope; margin is unavailable, not zero.', 'Belum ada pendapatan positif pada cakupan ini; margin tidak tersedia, bukan nol.') : data.grossProfit < 0 ? copy('Recorded costs exceed recorded revenue. Review timing and cost allocation before judging cycle profitability.', 'Biaya tercatat melebihi pendapatan. Tinjau waktu pencatatan dan alokasi biaya sebelum menilai laba siklus.') : copy('Positive gross profit does not include all operating, financing, or tax costs.', 'Laba kotor positif belum mencakup seluruh biaya operasi, pembiayaan, atau pajak.'),
      copy('Usage records without a valid cost:', 'Catatan pemakaian/biaya tanpa nilai valid:') + ` ${details ? numeric(details.missingCostCount) : 'N/A'}.`,
      copy('Unallocated production costs:', 'Biaya produksi belum dialokasikan:') + ` ${money(details?.unallocatedCost ?? productionCost)}.`,
      copy('Excluded non-production or unassigned expenses:', 'Pengeluaran nonproduksi atau tanpa siklus yang dikecualikan:') + ` ${details ? money(details.excludedExpenseAmount) : 'N/A'}.`,
    ]))
    + section('Recommendations', list([
      copy('Resolve missing, duplicate, and mismatched harvest revenue entries before signing off the report.', 'Selesaikan pendapatan panen yang hilang, ganda, dan berselisih sebelum menyetujui laporan.'),
      copy('Review unallocated costs and retain the original pond allocation basis. Do not divide shared costs arbitrarily.', 'Tinjau biaya belum dialokasikan dan pertahankan dasar alokasi kolam. Jangan membagi biaya bersama secara sembarang.'),
      copy('Confirm production carry-forward balances and compare a full cycle before using cost/kg for decisions.', 'Konfirmasi saldo biaya produksi terbawa dan bandingkan satu siklus penuh sebelum memakai biaya/kg untuk keputusan.'),
    ]))
  });
  pages.push({ title: 'Assumptions and Data Quality', content:
    section(copy('Calculation basis', 'Dasar perhitungan'), list([
      copy('COGS = consumed feed + consumed additives + cycle production expenses + opening production costs - closing production costs.', 'HPP = pakan terpakai + aditif terpakai + biaya produksi siklus + biaya produksi awal - biaya produksi akhir.'),
      copy('Opening and closing amounts are manual production carry-forward (WIP) adjustments. Zero means no adjustment entered, not a verified inventory count. Unused feed and additive stock must not be deducted again.', 'Nilai awal dan akhir adalah penyesuaian manual biaya produksi terbawa (WIP). Nol berarti belum ada penyesuaian, bukan hasil stok opname. Stok pakan dan aditif yang belum dipakai tidak boleh dikurangi lagi.'),
      copy('Costs follow recorded usage valuations and stored expense allocations. Missing valuations are excluded and counted; no replacement prices are invented.', 'Biaya mengikuti nilai pemakaian dan alokasi pengeluaran tersimpan. Nilai yang hilang dikecualikan dan dihitung; harga pengganti tidak direkayasa.'),
      copy('Revenue follows finance records, not estimates. Pond sales are assigned only through a direct pond link or an exactly matching harvest reference and total.', 'Pendapatan mengikuti catatan keuangan, bukan estimasi. Penjualan kolam hanya dialokasikan melalui tautan kolam langsung atau referensi dan total panen yang cocok.'),
    ]))
    + section(copy('Scope and limitations', 'Cakupan dan keterbatasan'), list([
      copy('This is a management cost report, not an audited financial statement. Revenue recognition, biological asset valuation, and production carry-forward require accounting review.', 'Ini adalah laporan biaya manajemen, bukan laporan keuangan yang diaudit. Pengakuan pendapatan, penilaian aset biologis, dan biaya produksi terbawa memerlukan tinjauan akuntansi.'),
      copy('Company overhead without a cycle, capital purchases, financing, owner distributions, tax and interest are excluded. This report does not replace P&L or cash flow.', 'Overhead perusahaan tanpa siklus, pembelian aset, pembiayaan, distribusi pemilik, pajak dan bunga dikecualikan. Laporan ini tidak menggantikan laba rugi atau arus kas.'),
      copy('Selected dates apply to transaction, usage, and harvest dates in the farm timezone. Period totals may combine ongoing and harvested production.', 'Tanggal terpilih berlaku pada tanggal transaksi, pemakaian, dan panen sesuai zona waktu tambak. Total periode dapat menggabungkan produksi berjalan dan yang sudah dipanen.'),
    ]))
    + note(copy('Prepared from Shrimply records at export time. Review and approval remain with farm management.', 'Disusun dari catatan Shrimply saat ekspor. Tinjauan dan persetujuan tetap menjadi tanggung jawab manajemen tambak.'))
  });
  const printPageSize = useIosPrintLayout ? '612px 792px' : '8.5in 11in';
  const printPageWidth = useIosPrintLayout ? '100%' : '8.5in';
  const printPageHeight = useIosPrintLayout ? '100%' : '11in';
  return localizePdfHtml(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>COGS Report</title><style>
    @page { size: ${printPageSize}; margin: 0; }
    html { width: 100%; height: 100%; }
    body { margin: 0; padding: 0; width: ${printPageWidth}; height: ${printPageHeight}; }
    .cogs-page, .cogs-page * { box-sizing: border-box; }
    .cogs-page { width: 100%; height: 100%; position: relative; padding: 30px 32px 26px; overflow: hidden; background: #fff; font: 12px/1.4 Arial, Helvetica, sans-serif; color: #172b3a; page-break-after: always; ${useIosPrintLayout ? '' : 'break-inside: avoid; page-break-inside: avoid;'} }
    .cogs-page:last-child { page-break-after: auto; }
    .cogs-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    .cogs-content { position: relative; height: 100%; display: flex; flex-direction: column; }
    .cogs-header { position: relative; min-height: 90px; padding: 0 68px 10px 0; margin: 0 0 14px; border-bottom: 2px solid #0F4C75; flex-shrink: 0; }
    .cogs-logo { position: absolute; width: 58px; height: 58px; right: 0; top: 0; object-fit: contain; }
    .cogs-title { font-size: 23px; line-height: 1.15; color: #0F4C75; margin: 0 0 6px; font-weight: 700; overflow-wrap: anywhere; }
    .cogs-company { margin: 0 0 3px; font-size: 12px; font-weight: 600; overflow-wrap: anywhere; }
    .cogs-meta { margin: 0; font-size: 10px; overflow-wrap: anywhere; }
    .cogs-body { flex: 0 0 auto; }
    .cogs-section { margin: 0 0 14px; padding: 0; }
    .cogs-section h2 { font: 700 12px/1.3 Arial, Helvetica, sans-serif; color: #0F4C75; margin: 0 0 8px; }
    .cogs-line { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 6px 0; border-bottom: 1px solid #dce5ed; font-size: 11px; }
    .cogs-line span { min-width: 0; overflow-wrap: anywhere; }
    .cogs-line strong { flex-shrink: 0; text-align: right; font-variant-numeric: tabular-nums; }
    .cogs-total { border-bottom: 2px solid #0F4C75; font-weight: 700; }
    .cogs-note { font-size: 10px; line-height: 1.45; padding: 9px 10px; margin: 0 0 12px; background: #f1f6fa; border-left: 3px solid #3282B8; }
    .cogs-list { margin: 0; padding: 0 0 0 16px; font-size: 11px; line-height: 1.5; }
    .cogs-list li { padding: 0; margin: 0 0 9px; }
    .cogs-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10px; line-height: 1.4; margin: 0; }
    .cogs-table th, .cogs-table td { padding: 7px 5px; border-bottom: 1px solid #dce5ed; text-align: right; vertical-align: top; overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }
    .cogs-table th { background: #eaf1f6; color: #0F4C75; font-size: 9px; font-weight: 700; }
    .cogs-table th:first-child, .cogs-table td:first-child { text-align: left; width: 34%; }
    .cogs-pond-table th:first-child, .cogs-pond-table td:first-child { width: 25%; }
    .cogs-pond-table { font-size: 9px; }
    .cogs-table small { display: block; font-size: 8px; color: #526879; margin-top: 2px; }
    .cogs-footer { margin-top: auto; padding-top: 10px; border-top: 1px solid #b5c8d7; display: flex; justify-content: space-between; gap: 12px; font-size: 9px; flex-shrink: 0; }
  </style></head><body>${pages.map((page, index) => `<div class="pdf-page cogs-page"><img class="cogs-bg" src="data:image/png;base64,${brandAssets.backgroundBase64}" alt=""/><div class="cogs-content"><header class="cogs-header"><img class="cogs-logo" src="data:image/png;base64,${brandAssets.logoBase64}" alt="Shrimply"/><h1 class="cogs-title">${page.title}</h1><p class="cogs-company">${escapeCOGS(data.companyName)}</p><p class="cogs-meta">${escapeCOGS(formatDate(data.startDate, language))} - ${escapeCOGS(formatDate(data.endDate, language))} | ${escapeCOGS(data.currencyCode)}</p><p class="cogs-meta">${escapeCOGS(details?.scopeLabel || data.period)}</p></header><div class="cogs-body">${page.content}</div><footer class="cogs-footer"><span>Shrimply | ${escapeCOGS(formatPdfDateTime(new Date(), language, { year: 'numeric', month: 'short', day: 'numeric' }))}</span><span>Page ${index + 1} of ${pages.length}</span></footer></div></div>`).join('')}</body></html>`, language);
};

export const exportCOGSPDF = async (data: COGSData, language: PdfLanguage = 'en') => {
  try {
    const brandAssets = await loadCOGSBrandAssets();
    const html = generateCOGSHTML(data, brandAssets, language, Platform.OS === 'ios');
    
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
        dialogTitle: localizePdfText('Share COGS Report', language),
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert(
        localizePdfText('PDF Generated', language),
        localizePdfText(`Your COGS report has been saved to: ${newUri}`, language),
        [{ text: localizePdfText('OK', language) }]
      );
    }
    
    return newUri;
  } catch (error) {
    console.error('Error generating COGS PDF:', error);
    Alert.alert(localizePdfText('Error', language), localizePdfText('Failed to generate COGS PDF report', language));
    throw error;
  }
};
