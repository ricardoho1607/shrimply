import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { CycleReport, CycleReportPond } from './cycleReportService';

const PDF_BACKGROUND_ASSET = require('../../assets/pdf/shrimply-pdf-background-portrait.png');
const PDF_LOGO_ASSET = require('../../assets/pdf/shrimply-logo.png');

type ExportCycleReportInput = {
  report: CycleReport;
  companyName: string;
  formatCurrency: (amount: number) => string;
};

const loadBase64Asset = async (assetModule: number) => {
  const asset = Asset.fromModule(assetModule);
  await asset.downloadAsync();
  const uri = asset.localUri || asset.uri;
  if (!uri) throw new Error('Unable to resolve Cycle Report PDF asset.');
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
};

const safeNumber = (value: number, digits = 0) =>
  Number.isFinite(value) ? value.toLocaleString('en-US', { maximumFractionDigits: digits }) : '-';

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
};

const chunks = <T,>(items: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
};

const pondRow = (pond: CycleReportPond) => `
  <tr>
    <td>${escapeHtml(pond.pondName)}</td><td>${escapeHtml(pond.supplier || '-')}</td>
    <td>${safeNumber(pond.doc)}</td><td>${pond.hasFinalHarvest ? `${safeNumber(pond.finalHarvestMbw, 2)} g` : '-'}</td>
    <td>${safeNumber(pond.harvestedBiomass, 1)} kg</td><td>${safeNumber(pond.harvestedPopulation)}</td>
    <td>${pond.hasFinalHarvest ? `${safeNumber(pond.actualSurvivalRate, 1)}%` : '-'}</td>
    <td>${pond.hasFinalHarvest && pond.actualFcr > 0 ? safeNumber(pond.actualFcr, 2) : '-'}</td>
  </tr>`;

const closureRow = (pond: CycleReportPond) => `
  <tr>
    <td>${escapeHtml(pond.pondName)}</td><td>${escapeHtml(pond.supplier || '-')}</td>
    <td><span class="reason">${escapeHtml(pond.closureReason || 'other')}</span></td>
    <td>${safeNumber(pond.doc)}</td><td>${pond.latestMbw > 0 ? `${safeNumber(pond.latestMbw, 2)} g` : '-'}</td>
    <td>${safeNumber(pond.harvestedBiomass, 1)} kg</td>
  </tr>`;

export const generateCycleReportHtml = ({ report, companyName, formatCurrency }: ExportCycleReportInput, backgroundBase64: string, logoBase64: string) => {
  const harvested = report.ponds.filter((pond) => !pond.isNonHarvestClosure);
  const closures = report.ponds.filter((pond) => pond.isNonHarvestClosure);
  const harvestedPages = chunks(harvested, 7);
  if (harvestedPages.length === 0) harvestedPages.push([]);

  const pondPages: { harvested: CycleReportPond[]; closures: CycleReportPond[] }[] = harvestedPages.map((items) => ({ harvested: items, closures: [] }));
  let remainingClosures = [...closures];
  const lastPondPage = pondPages[pondPages.length - 1];
  if (lastPondPage.harvested.length <= 4) lastPondPage.closures = remainingClosures.splice(0, 3);
  chunks(remainingClosures, 6).forEach((items) => pondPages.push({ harvested: [], closures: items }));

  const totalPopulation = report.ponds.reduce((sum, pond) => sum + pond.harvestedPopulation, 0);
  const totalInitialPopulation = report.ponds.reduce((sum, pond) => sum + pond.initialPopulation, 0);
  const overallSr = totalInitialPopulation > 0 ? (totalPopulation / totalInitialPopulation) * 100 : 0;
  const bestBiomass = [...report.ponds].sort((a, b) => b.harvestedBiomass - a.harvestedBiomass)[0];
  const bestSr = [...harvested].filter((pond) => pond.hasFinalHarvest).sort((a, b) => b.actualSurvivalRate - a.actualSurvivalRate)[0];
  const bestFcr = [...harvested].filter((pond) => pond.actualFcr > 0).sort((a, b) => a.actualFcr - b.actualFcr)[0];
  const margin = report.totals.harvestRevenue > 0 ? (report.totals.grossProfit / report.totals.harvestRevenue) * 100 : 0;

  const overview = `
    <h2>1. Cycle Overview</h2>
    <div class="meta"><div><label>Cycle name</label><b>${escapeHtml(report.cycle.cycleName)}</b></div><div><label>Start date</label><b>${formatDate(report.cycle.stockingStartDate || report.cycle.plannedStartDate)}</b></div><div><label>End date</label><b>${formatDate(report.cycle.closedAt || report.cycle.stockingEndDate)}</b></div><div><label>Ponds / area</label><b>${report.totals.pondCount} / ${safeNumber(report.totals.totalArea)} m2</b></div></div>
    <div class="metrics"><div class="metric"><label>Total harvested biomass</label><strong>${safeNumber(report.totals.harvestedBiomass, 1)} kg</strong><small>Recorded partial and final harvests</small></div><div class="metric blue"><label>Total harvested revenue</label><strong>${escapeHtml(formatCurrency(report.totals.harvestRevenue))}</strong><small>Recorded harvest sales</small></div><div class="metric"><label>Total recorded cycle cost</label><strong>${escapeHtml(formatCurrency(report.totals.costs.total))}</strong><small>Feed, additives, maintenance and general</small></div><div class="metric green"><label>Estimated gross profit</label><strong>${escapeHtml(formatCurrency(report.totals.grossProfit))}</strong><small>Revenue minus recorded cycle costs</small></div></div>
    <section><h3>Cycle outcome summary</h3><p>${escapeHtml(report.cycle.cycleName)} included ${report.totals.pondCount} ponds across ${safeNumber(report.totals.totalArea)} m2. Recorded harvests produced <b>${safeNumber(report.totals.harvestedBiomass, 1)} kg</b> and generated <b>${escapeHtml(formatCurrency(report.totals.harvestRevenue))}</b> in revenue. Recorded cycle costs totalled <b>${escapeHtml(formatCurrency(report.totals.costs.total))}</b>, resulting in estimated gross profit of <b>${escapeHtml(formatCurrency(report.totals.grossProfit))}</b>.${closures.length ? ` ${closures.length} pond${closures.length === 1 ? ' was' : 's were'} reported as non-harvest closure${closures.length === 1 ? '' : 's'}.` : ''}</p></section>
    <section><h3>Factual performance highlights</h3><div class="highlights"><span>Highest harvested biomass</span><b>${escapeHtml(bestBiomass?.pondName || '-')}</b><em>${bestBiomass ? `${safeNumber(bestBiomass.harvestedBiomass, 1)} kg` : '-'}</em><span>Highest actual survival</span><b>${escapeHtml(bestSr?.pondName || '-')}</b><em>${bestSr ? `${safeNumber(bestSr.actualSurvivalRate, 1)}%` : '-'}</em><span>Lowest actual FCR</span><b>${escapeHtml(bestFcr?.pondName || '-')}</b><em>${bestFcr ? safeNumber(bestFcr.actualFcr, 2) : '-'}</em><span>Non-harvest closures</span><b>${closures.length}</b><em>${closures.length ? closures.map((pond) => escapeHtml(pond.pondName)).join(', ') : 'None'}</em></div></section>`;

  const pondBodies = pondPages.map((page, index) => `
    <h2>2. Pond Performance${index ? ' - Continued' : ''}</h2>
    ${index === 0 ? `<div class="summary-strip"><div><label>Total biomass</label><b>${safeNumber(report.totals.harvestedBiomass, 1)} kg</b></div><div><label>Harvested population</label><b>${safeNumber(totalPopulation)}</b></div><div><label>Overall actual SR</label><b>${safeNumber(overallSr, 1)}%</b></div></div>` : ''}
    ${page.harvested.length ? `<h3>Harvested ponds</h3><table><thead><tr><th>Pond</th><th>Supplier</th><th>DOC</th><th>Final MBW</th><th>Harvested biomass</th><th>Harvested population</th><th>Actual SR</th><th>Actual FCR</th></tr></thead><tbody>${page.harvested.map(pondRow).join('')}</tbody></table>` : ''}
    ${page.closures.length ? `<h3 class="closure-title">Non-Harvest Closures</h3><table class="closure-table"><thead><tr><th>Pond</th><th>Supplier</th><th>Reason</th><th>DOC</th><th>Last sampled MBW</th><th>Partial harvest</th></tr></thead><tbody>${page.closures.map(closureRow).join('')}</tbody></table>` : ''}
    ${index === pondPages.length - 1 ? `<section class="basis"><h3>Calculation basis</h3><p><b>Final harvest MBW:</b> Final Harvest only; Partial Harvest MBW does not replace pond MBW.<br/><b>Harvest totals:</b> Sum of every Partial and Final Harvest linked to the pond cycle.<br/><b>Actual SR:</b> Harvested population divided by initial stocked population.<br/><b>Actual FCR:</b> Recorded feed consumed divided by net harvested biomass gain.</p></section>` : ''}`);

  const costItems = [
    ['Feed cost', report.totals.costs.feed], ['Additive cost', report.totals.costs.additives],
    ['Maintenance cost', report.totals.costs.maintenance], ['General expenses', report.totals.costs.manualExpenses],
  ] as const;
  const costs = `
    <h2>3. Cost and Profitability</h2><h3>Recorded cycle cost breakdown</h3>
    <table class="cost-table"><thead><tr><th>Category</th><th>Amount</th><th>Share of total</th></tr></thead><tbody>${costItems.map(([label, value]) => `<tr><td>${label}</td><td>${escapeHtml(formatCurrency(value))}</td><td>${report.totals.costs.total > 0 ? safeNumber((value / report.totals.costs.total) * 100, 1) : '0'}%</td></tr>`).join('')}<tr class="total"><td>Total recorded cost</td><td>${escapeHtml(formatCurrency(report.totals.costs.total))}</td><td>100%</td></tr></tbody></table>
    <h3>Cost composition</h3><div class="bars">${costItems.map(([label, value]) => { const percent = report.totals.costs.total > 0 ? (value / report.totals.costs.total) * 100 : 0; return `<div><span>${label}</span><i><u style="width:${Math.min(100, percent)}%"></u></i><b>${safeNumber(percent, 1)}%</b></div>`; }).join('')}</div>
    <h3>Profitability summary</h3><div class="profit-grid"><div><label>Revenue</label><b>${escapeHtml(formatCurrency(report.totals.harvestRevenue))}</b></div><div><label>Total cost</label><b>${escapeHtml(formatCurrency(report.totals.costs.total))}</b></div><div class="positive"><label>Gross profit</label><b>${escapeHtml(formatCurrency(report.totals.grossProfit))}</b></div><div class="positive"><label>Gross margin</label><b>${safeNumber(margin, 1)}%</b></div></div>
    <h3>Unit economics</h3><div class="summary-strip"><div><label>Cost per kg</label><b>${escapeHtml(formatCurrency(report.totals.costPerKg))}</b></div><div><label>Revenue per kg</label><b>${escapeHtml(formatCurrency(report.totals.revenuePerKg))}</b></div><div><label>Profit per kg</label><b>${escapeHtml(formatCurrency(report.totals.profitPerKg))}</b></div></div>
    <section class="basis"><h3>Calculation basis</h3><p>Estimated gross profit equals recorded harvest revenue minus recorded cycle-linked costs. Unit economics use total harvested biomass as the denominator. Unrecorded or unlinked expenses are not included.</p></section>`;

  const bodies = [overview, ...pondBodies, costs];
  const generatedDate = formatDate(new Date().toISOString());
  const renderPage = (body: string, index: number) => `<div class="pdf-page"><img class="page-bg" src="data:image/png;base64,${backgroundBase64}"/><div class="shell"><header><img class="logo" src="data:image/png;base64,${logoBase64}"/><div><h1>Cycle Report</h1><p>${escapeHtml(companyName)} | ${escapeHtml(report.cycle.cycleName)}</p></div><span class="closed">CLOSED</span></header><main>${body}</main><footer><span>Generated by Shrimply | ${generatedDate}</span><b>Page ${index + 1} of ${bodies.length}</b></footer></div></div>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    *{box-sizing:border-box} @page{size:612pt 792pt;margin:0} html,body{margin:0;padding:0} body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#16324A;background:#0F4C75}
    .pdf-page{width:612pt;height:792pt;padding:0;position:relative;overflow:hidden;page-break-inside:avoid;break-inside:avoid}.page-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}.shell{position:absolute;inset:30pt 40pt 25pt;z-index:1;display:flex;flex-direction:column}.shell header{height:66pt;display:flex;align-items:center;border-bottom:1.5pt solid #3282B8;gap:10pt}.logo{width:48pt;height:48pt;object-fit:contain;background:transparent}.shell header h1{margin:0;color:#0F4C75;font-size:21pt;text-transform:uppercase}.shell header p{margin:3pt 0 0;color:#5D7488;font-size:8pt}.closed{margin-left:auto;border:1pt solid #98D0AC;background:#EAF7EF;color:#2D8A57;border-radius:12pt;padding:5pt 10pt;font-size:7pt;font-weight:800}main{flex:1;padding-top:12pt;overflow:hidden}h2{font-size:13pt;color:#0F4C75;margin:0 0 10pt;text-transform:uppercase}h3{font-size:9pt;color:#0F4C75;margin:12pt 0 7pt;text-transform:uppercase}label{display:block;color:#5D7488;font-size:6.8pt;text-transform:uppercase;margin-bottom:6pt}.meta,.summary-strip,.profit-grid{display:grid;gap:8pt}.meta{grid-template-columns:repeat(4,1fr);background:#fff;border:1pt solid #D7E7F2;border-radius:10pt;padding:12pt}.meta>div+div{border-left:1pt solid #D7E7F2;padding-left:10pt}.meta b,.summary-strip b,.profit-grid b{font-size:10pt}.metrics{display:grid;grid-template-columns:1fr 1fr;gap:9pt;margin-top:10pt}.metric{height:78pt;background:#fff;border:1pt solid #D7E7F2;border-left:4pt solid #0F4C75;border-radius:9pt;padding:11pt}.metric.blue{border-left-color:#3282B8}.metric.green{border-left-color:#2D8A57}.metric strong{display:block;font-size:15pt;color:#0F4C75}.metric.green strong{color:#2D8A57}.metric small{display:block;color:#5D7488;font-size:6.8pt;margin-top:10pt}section{background:#fff;border:1pt solid #D7E7F2;border-radius:9pt;padding:10pt 14pt;margin-top:10pt}section p{font-size:8pt;line-height:1.45;margin:0}.highlights{display:grid;grid-template-columns:1.7fr 1fr 1fr;gap:0;font-size:8pt}.highlights>*{padding:6pt 0;border-bottom:1pt solid #D7E7F2}.highlights em{text-align:right;color:#0F4C75;font-style:normal;font-weight:700}.summary-strip{grid-template-columns:repeat(3,1fr);margin-bottom:12pt}.summary-strip>div,.profit-grid>div{background:#EAF4FB;border:1pt solid #D7E7F2;border-radius:9pt;padding:11pt}.summary-strip b{font-size:12pt;color:#0F4C75}table{width:100%;border-collapse:collapse;table-layout:fixed;background:#fff;font-size:6.7pt}th{background:#0F4C75;color:#fff;text-align:left;padding:7pt 4pt;line-height:1.15}td{padding:8pt 4pt;border:1pt solid #D7E7F2;vertical-align:middle;word-break:break-word}th:nth-child(1){width:8%}th:nth-child(2){width:19%}.reason{background:#FFF5DF;color:#B76E00;border-radius:8pt;padding:3pt 5pt;text-transform:uppercase;font-weight:800}.closure-title{margin-top:14pt}.basis{margin-top:12pt;padding:8pt 11pt}.basis h3{margin:0 0 5pt}.basis p{font-size:6.9pt}.cost-table{font-size:8pt}.cost-table th:nth-child(1){width:44%}.cost-table th:nth-child(2){width:36%}.cost-table td:nth-child(n+2){text-align:right}.cost-table .total{background:#EAF4FB;font-weight:800}.bars>div{display:grid;grid-template-columns:105pt 1fr 40pt;gap:8pt;align-items:center;margin:8pt 0;font-size:7pt}.bars i{height:8pt;background:#E5EEF4;border-radius:5pt;overflow:hidden}.bars u{display:block;height:100%;background:#0F4C75;border-radius:5pt}.bars b{text-align:right}.profit-grid{grid-template-columns:repeat(4,1fr);margin-bottom:10pt}.profit-grid>div{background:#fff}.profit-grid .positive{background:#EAF7EF}.profit-grid .positive b{color:#2D8A57}footer{height:20pt;border-top:1pt solid #D7E7F2;padding-top:7pt;display:flex;justify-content:space-between;color:#5D7488;font-size:6.5pt}
  </style></head><body>${bodies.map(renderPage).join('')}</body></html>`;
};

export const exportCycleReportPDF = async (input: ExportCycleReportInput) => {
  const [backgroundBase64, logoBase64] = await Promise.all([
    loadBase64Asset(PDF_BACKGROUND_ASSET), loadBase64Asset(PDF_LOGO_ASSET),
  ]);
  const html = generateCycleReportHtml(input, backgroundBase64, logoBase64);
  const { uri } = await Print.printToFileAsync({ html, textZoom: 100, width: 612, height: 792, margins: { top: 0, right: 0, bottom: 0, left: 0 }, base64: false });
  const safeCompany = input.companyName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24) || 'Company';
  const safeCycle = input.report.cycle.cycleName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24) || 'Cycle';
  const filename = `CycleReport_${safeCompany}_${safeCycle}.pdf`;
  const outputUri = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.copyAsync({ from: uri, to: outputUri });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(outputUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Share Cycle Report' });
  return outputUri;
};
