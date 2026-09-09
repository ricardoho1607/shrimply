import { type LabMeasurementUnits } from '../../../functions/shared/labMeasurementContract';
import { getManualLabColumns, type ManualLabColumn } from './manualLabColumns';
import { generateSamplingReportHTML, type PdfBrandAssets } from './generated/mobileSamplingReport';

type Value = string | number | null;
export interface LabRow {
  pondId: string;
  pondCode: string;
  doc?: Value;
  transparencyCm?: Value;
  measurementUnits?: LabMeasurementUnits;
  waterQuality?: Record<string, Value>;
  microbiology?: Record<string, Value>;
  plankton?: Record<string, Value>;
}
export interface ManualLabReport {
  sampleDate?: string;
  labName?: string;
  farmName?: string;
  reportType?: string;
  pondResults?: LabRow[];
}
const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
const display = (value: Value | undefined) => value === null || value === undefined || value === '' ? 'N/A' : String(value);
const shortLabels: Record<string, string> = {
  transparencyCm: 'Transp.', salinityCustomer: 'Salinity', salinityLab: 'Sal. lab',
  phosphate: 'PO4', alkalinityTotal: 'Alk.', hardnessCa: 'Ca', hardnessMg: 'Mg', hardnessTotal: 'Hardness',
  totalCellPerMl: 'Total plankton', beneficialCellPerMl: 'Good plankton', harmfulCellPerMl: 'Bad plankton',
  chlorophyta: 'Green algae', cyanophyta: 'Blue-green', diatom: 'Diatom', chrysophyta: 'Golden-green',
  dinoflagellata: 'Dino', protozoa: 'Protozoa',
};
const columnLabel = (column: ManualLabColumn) => {
  const key = column.path[column.path.length - 1];
  const group = key.replace(/CellPerMl$|Percent$|Species$/, '');
  if (shortLabels[key]) return shortLabels[key];
  if (shortLabels[group]) return `${shortLabels[group]} ${key.endsWith('Percent') ? '%' : key.endsWith('Species') ? 'species' : 'cells'}`;
  return column.label.replace(' (unit/basis below)', '');
};
const sourceUnit = (pond: LabRow, column: ManualLabColumn) => {
  const key = column.path[column.path.length - 1];
  if (column.path[0] === 'waterQuality') {
    const metadata = pond.measurementUnits?.[key];
    return `${metadata?.unit || 'unit unknown'}${metadata?.basis ? ` as ${metadata.basis}` : '; basis unknown'}`;
  }
  return key === 'transparencyCm' ? 'cm' : key.endsWith('CellPerMl') ? 'cells/mL' : '';
};
const columnValue = (pond: LabRow, column: ManualLabColumn) => {
  const [section, key] = column.path;
  if (!key) return display(pond[section as 'doc' | 'transparencyCm']);
  return display(pond[section as 'waterQuality' | 'microbiology' | 'plankton']?.[key]);
};

export function generateManualLabReportHTML(report: ManualLabReport, assets: PdfBrandAssets): string {
  const ponds = report.pondResults || [];
  if (!ponds.length) throw new Error('No pond results to export.');
  const sampling = generateSamplingReportHTML({ farmName: '', block: '', technician: '', reportDate: '', reportPeriod: '', companyName: '', ponds: [] }, assets, 'en');
  const style = sampling.match(/<style>([\s\S]*?)<\/style>/)?.[1] || '';
  const columns = getManualLabColumns(report.reportType);
  const units = columns.map(column => {
    const reported = [...new Set(ponds.map(pond => sourceUnit(pond, column)))];
    return reported.length === 1 ? reported[0] : 'See cell';
  });
  const pondWidth = 44;
  const columnWidth = (730 - pondWidth) / columns.length;
  // Conservative line budgeting keeps wrapped values and continuation rows on the page.
  const charactersPerLine = Math.max(2, Math.floor((columnWidth - 4) / 4));
  const chunkLength = charactersPerLine * 8;
  const pages: string[][][] = [];
  let pageRows: string[][] = [];
  let usedHeight = 0;
  for (const pond of ponds) {
    const values = columns.map((column, index) => {
      const value = columnValue(pond, column);
      return units[index] === 'See cell' && value !== 'N/A' ? `${value} ${sourceUnit(pond, column)}` : value;
    });
    const chunks = values.map(value => value.match(new RegExp(`[\\s\\S]{1,${chunkLength}}`, 'g')) || ['N/A']);
    const parts = Math.max(...chunks.map(value => value.length));
    for (let part = 0; part < parts; part++) {
      const cells = chunks.map(value => value[part] || '');
      const pondName = `${pond.pondCode || pond.pondId}${part ? ' (cont.)' : ''}`;
      const lines = Math.max(Math.ceil(pondName.length / 8), ...cells.map(value => Math.ceil(value.length / charactersPerLine)));
      const rowHeight = Math.max(22, lines * 8 + 10);
      if (pageRows.length && usedHeight + rowHeight > 330) {
        pages.push(pageRows);
        pageRows = [];
        usedHeight = 0;
      }
      pageRows.push([pondName, ...cells]);
      usedHeight += rowHeight;
    }
  }
  if (pageRows.length) pages.push(pageRows);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Manual Lab Report</title><style>${style}
    .pdf-page { width: 792px; height: 612px; }
    .metadata { font-size: 9px; line-height: 1.4; overflow-wrap: anywhere; }
    .lab-results { margin-top: 8px; }
    .lab-results th { font-size: 5.8px; padding: 5px 2px; text-transform: none; letter-spacing: 0; overflow-wrap: anywhere; line-height: 1.2; }
    .lab-results th small { display: block; font-size: 5px; font-weight: 400; margin-top: 4px; }
    .lab-results td { min-height: 22px; padding: 6px 2px; font-size: 6.5px; line-height: 8px; overflow-wrap: anywhere; }
    .lab-results td:first-child { font-weight: 800; }
    .note { margin-top: 9px; font-size: 7px; }
  </style></head><body>${pages.map((rows, index) => `<div class="pdf-page"><img class="page-bg" src="data:image/png;base64,${assets.backgroundBase64}" alt=""><div class="report-shell">
    <div class="header"><img class="header-logo" src="data:image/png;base64,${assets.logoBase64}" alt="Shrimply"><div class="header-main"><h1 class="title">Manual Lab Report</h1><div class="metadata">Farm: ${escape(report.farmName || 'N/A')}<br>Laboratory: ${escape(report.labName || 'N/A')}<br>Sample date: ${escape(report.sampleDate || 'N/A')}</div></div></div>
    <table class="lab-results"><colgroup><col style="width:${pondWidth}px">${columns.map(() => `<col style="width:${columnWidth}px">`).join('')}</colgroup><thead><tr><th scope="col">Pond</th>${columns.map((column, columnIndex) => `<th scope="col" data-field="${escape(column.path.join('.'))}">${escape(columnLabel(column))}${units[columnIndex] ? `<small>${escape(units[columnIndex])}</small>` : ''}</th>`).join('')}</tr></thead><tbody>${rows.map((row, rowIndex) => `<tr${rowIndex % 2 ? ' class="row-alt"' : ''}>${row.map(cell => `<td>${escape(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>
    <p class="note">Values are reproduced as entered. N/A means no result was recorded. Units and measurement bases appear beneath each column heading, or beside values when they differ.</p><div class="footer"><span>Shrimply | Manual Lab Report</span><span>Page ${index + 1} of ${pages.length}</span></div>
  </div></div>`).join('')}</body></html>`;
}
