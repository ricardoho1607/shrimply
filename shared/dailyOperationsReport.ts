import type { MortalityObservationType } from './pondCalculations';
import { dailyOperationsTranslations, type DailyOperationsLanguage } from './dailyOperationsI18n.ts';

export type SiponShift = 'morning' | 'evening';

export interface DailyOperationsMortalityRecord {
  date?: string | null;
  observationType?: MortalityObservationType | null;
  count?: number | string | null;
  siphonedCount?: number | string | null;
  mortalCount?: number | string | null;
  siponShift?: SiponShift | null;
  pondCycleId?: string | null;
}

export interface DailyOperationsWaterRecord {
  date?: string | null;
  phMorning?: string | number | null;
  temperature?: string | number | null;
  waterAppearance?: string | null;
  waterDepthCm?: string | number | null;
  transparency?: string | number | null;
  salinity?: string | number | null;
  alkalinity?: string | number | null;
  waterQualityRecordedByName?: string | null;
  pondCycleId?: string | null;
}

export interface DailyOperationsPondSource {
  id: string;
  pondName: string;
  blockId?: string | null;
  blockName?: string | null;
  cycleStatus?: 'active' | 'ended' | null;
  docStart?: string | null;
  pondArea?: number | string | null;
  initialPopulation?: number | string | null;
  initialStock?: number | string | null;
  totalHarvestedPopulation?: number | string | null;
  density?: number | string | null;
  pondCycleId?: string | null;
  mortalityRecords?: DailyOperationsMortalityRecord[] | null;
  samplings?: DailyOperationsWaterRecord[] | null;
}

export interface SiponReportRow {
  pondName: string;
  blockName: string;
  doc: number;
  morningSiphoned: number;
  morningMortal: number;
  morningTotal: number;
  eveningSiphoned: number;
  eveningMortal: number;
  eveningTotal: number;
  dailyTotal: number;
  cumulativeTotal: number;
  estimatedPopulation: number;
  density: number;
  hasUnclassifiedData: boolean;
}

export interface WaterQualityReportRow {
  pondName: string;
  blockName: string;
  stockingDate: string;
  doc: number;
  recordedBy: string;
  phMorning: string;
  temperature: string;
  waterAppearance: string;
  waterDepthCm: string;
  transparency: string;
  salinity: string;
  alkalinity: string;
}

export interface DailyOperationsReportData {
  companyName: string;
  reportDate: string;
  generatedBy: string;
  siponRows: SiponReportRow[];
  waterQualityRows: WaterQualityReportRow[];
}

const numberValue = (value: unknown): number => {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const textValue = (value: unknown): string => {
  const text = String(value ?? '').trim();
  return text || '-';
};

const dateKey = (value: unknown): string => String(value ?? '').match(/^\d{4}-\d{2}-\d{2}/)?.[0] || '';

const getDoc = (stockingDate: unknown, reportDate: string): number => {
  const startKey = dateKey(stockingDate);
  if (!startKey) return 0;
  const start = Date.parse(`${startKey}T00:00:00Z`);
  const end = Date.parse(`${reportDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.floor((end - start) / 86_400_000));
};

const belongsToCurrentCycle = (
  record: { pondCycleId?: string | null },
  pond: DailyOperationsPondSource,
): boolean => !record.pondCycleId || !pond.pondCycleId || record.pondCycleId === pond.pondCycleId;

const componentCount = (record: DailyOperationsMortalityRecord): number => {
  const componentTotal = numberValue(record.siphonedCount) + numberValue(record.mortalCount);
  return componentTotal > 0 ? componentTotal : numberValue(record.count);
};

const buildSiponRow = (pond: DailyOperationsPondSource, reportDate: string): SiponReportRow => {
  const records = (pond.mortalityRecords || []).filter((record) => belongsToCurrentCycle(record, pond));
  const dailyRecords = records.filter((record) => dateKey(record.date) === reportDate);
  const shiftTotals = (shift: SiponShift) => {
    const matching = dailyRecords.filter((record) => record.siponShift === shift && (
      numberValue(record.siphonedCount) + numberValue(record.mortalCount) > 0
    ));
    const siphoned = matching.reduce((total, record) => total + numberValue(record.siphonedCount), 0);
    const mortal = matching.reduce((total, record) => total + numberValue(record.mortalCount), 0);
    return { siphoned, mortal, total: siphoned + mortal };
  };
  const morning = shiftTotals('morning');
  const evening = shiftTotals('evening');
  const dailyTotal = dailyRecords.reduce((total, record) => total + componentCount(record), 0);
  const cumulativeTotal = records
    .filter((record) => dateKey(record.date) <= reportDate)
    .reduce((total, record) => total + componentCount(record), 0);
  const initialPopulation = numberValue(pond.initialPopulation ?? pond.initialStock);
  const estimatedPopulation = Math.max(0, initialPopulation - cumulativeTotal - numberValue(pond.totalHarvestedPopulation));
  const pondArea = numberValue(pond.pondArea);

  return {
    pondName: pond.pondName,
    blockName: textValue(pond.blockName),
    doc: getDoc(pond.docStart, reportDate),
    morningSiphoned: morning.siphoned,
    morningMortal: morning.mortal,
    morningTotal: morning.total,
    eveningSiphoned: evening.siphoned,
    eveningMortal: evening.mortal,
    eveningTotal: evening.total,
    dailyTotal,
    cumulativeTotal,
    estimatedPopulation,
    density: pondArea > 0 ? estimatedPopulation / pondArea : numberValue(pond.density),
    hasUnclassifiedData: dailyRecords.some((record) => !record.siponShift || (
      numberValue(record.siphonedCount) + numberValue(record.mortalCount) <= 0
    )),
  };
};

const buildWaterQualityRow = (
  pond: DailyOperationsPondSource,
  reportDate: string,
): WaterQualityReportRow | null => {
  const records = (pond.samplings || [])
    .filter((record) => belongsToCurrentCycle(record, pond) && dateKey(record.date) === reportDate)
    .filter((record) => [
      record.phMorning,
      record.temperature,
      record.waterAppearance,
      record.waterDepthCm,
      record.transparency,
      record.salinity,
      record.alkalinity,
    ].some((value) => value !== null && value !== undefined && String(value).trim()));
  if (records.length === 0) return null;

  const latestValue = (key: keyof DailyOperationsWaterRecord): unknown => {
    for (let index = records.length - 1; index >= 0; index -= 1) {
      const value = records[index][key];
      if (value !== null && value !== undefined && String(value).trim()) return value;
    }
    return undefined;
  };

  return {
    pondName: pond.pondName,
    blockName: textValue(pond.blockName),
    stockingDate: dateKey(pond.docStart),
    doc: getDoc(pond.docStart, reportDate),
    recordedBy: textValue(latestValue('waterQualityRecordedByName')),
    phMorning: textValue(latestValue('phMorning')),
    temperature: textValue(latestValue('temperature')),
    waterAppearance: textValue(latestValue('waterAppearance')),
    waterDepthCm: textValue(latestValue('waterDepthCm')),
    transparency: textValue(latestValue('transparency')),
    salinity: textValue(latestValue('salinity')),
    alkalinity: textValue(latestValue('alkalinity')),
  };
};

export const buildDailyOperationsReport = ({
  companyName,
  reportDate,
  generatedBy,
  ponds,
}: {
  companyName: string;
  reportDate: string;
  generatedBy: string;
  ponds: DailyOperationsPondSource[];
}): DailyOperationsReportData => ({
  companyName,
  reportDate,
  generatedBy,
  siponRows: ponds.map((pond) => buildSiponRow(pond, reportDate)),
  waterQualityRows: ponds
    .map((pond) => buildWaterQualityRow(pond, reportDate))
    .filter((row): row is WaterQualityReportRow => Boolean(row)),
});

const escapeHtml = (value: unknown): string => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const formatInteger = (value: number): string => Math.round(value).toLocaleString('en-US');

const sum = (rows: SiponReportRow[], key: keyof SiponReportRow): number => rows.reduce((total, row) => {
  const value = row[key];
  return total + (typeof value === 'number' ? value : 0);
}, 0);

export const generateDailyOperationsReportHTML = (
  data: DailyOperationsReportData,
  assets: { backgroundBase64: string; logoBase64: string },
  language: DailyOperationsLanguage = 'en',
  useIosPrintLayout = false,
): string => {
  const copy = dailyOperationsTranslations[language];
  const localeByLanguage: Record<DailyOperationsLanguage, string> = {
    en: 'en-GB',
    id: 'id-ID',
    th: 'th-TH',
    vi: 'vi-VN',
    zh: 'zh-CN',
  };
  const reportDate = new Date(`${data.reportDate}T00:00:00`).toLocaleDateString(localeByLanguage[language], {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  const printViewportWidth = useIosPrintLayout ? 1000 : 1056;
  const printPageSize = useIosPrintLayout ? '792px 612px' : '11in 8.5in';
  const printPageWidth = useIosPrintLayout ? '100%' : '11in';
  const printPageHeight = useIosPrintLayout ? '100%' : '8.5in';
  const siponRows = data.siponRows.map((row) => `
    <tr>
      <td>${escapeHtml(row.pondName)}</td><td>${row.doc}</td>
      <td>${formatInteger(row.morningSiphoned)}</td><td>${formatInteger(row.morningMortal)}</td><td>${formatInteger(row.morningTotal)}</td>
      <td>${formatInteger(row.eveningSiphoned)}</td><td>${formatInteger(row.eveningMortal)}</td><td>${formatInteger(row.eveningTotal)}</td>
      <td><strong>${formatInteger(row.dailyTotal)}</strong></td><td>${formatInteger(row.cumulativeTotal)}</td>
      <td>${formatInteger(row.estimatedPopulation)}</td><td>${formatInteger(row.density)}</td>
    </tr>`).join('');
  const waterRows = data.waterQualityRows.map((row) => `
    <tr><td>${escapeHtml(row.stockingDate || '-')}</td><td>${escapeHtml(row.pondName)}</td><td>${row.doc}</td>
      <td>${escapeHtml(row.recordedBy)}</td><td>${escapeHtml(row.phMorning)}</td><td>${escapeHtml(row.temperature)}</td>
      <td>${escapeHtml(row.waterAppearance)}</td><td>${escapeHtml(row.waterDepthCm)}</td><td>${escapeHtml(row.transparency)}</td>
      <td>${escapeHtml(row.salinity)}</td><td>${escapeHtml(row.alkalinity)}</td></tr>`).join('');
  const hasLegacy = data.siponRows.some((row) => row.hasUnclassifiedData);
  const renderHeader = (title: string, subtitle: string) => `
    <div class="header">
      <div class="header-main">
        <div class="title">${escapeHtml(title)}</div>
        <div class="farm-info"><strong>${escapeHtml(copy.farm)}:</strong> ${escapeHtml(data.companyName)}</div>
        <div class="farm-info"><strong>${escapeHtml(copy.reportDate)}:</strong> ${escapeHtml(reportDate)}</div>
        <div class="farm-info"><strong>${escapeHtml(copy.generatedBy)}:</strong> ${escapeHtml(data.generatedBy)}</div>
        <div class="subtitle">${escapeHtml(subtitle)}</div>
      </div>
      <img class="header-logo" src="data:image/png;base64,${assets.logoBase64}" alt="Shrimply" />
    </div>
    <div class="divider"></div>
  `;
  const renderFooter = (pageNumber: number) => `
    <div class="footer">
      <span>Shrimply Aquaculture Management | ${escapeHtml(data.companyName)}</span>
      <span>${escapeHtml(copy.page)} ${pageNumber} ${escapeHtml(copy.of)} 2</span>
    </div>
  `;

  return `<!DOCTYPE html>
  <html lang="${language}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=${printViewportWidth}, initial-scale=1.0, maximum-scale=1.0">
    <title>${escapeHtml(copy.title)}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      @page { size: ${printPageSize}; margin: 0; }
      html { width: 100%; height: 100%; }
      body { width: 100%; height: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1B262C; background: #0F4C75; font-size: 8px; line-height: 1.2; }
      .pdf-page { width: ${printPageWidth}; height: ${printPageHeight}; padding: 26px 36px 26px 26px; position: relative; overflow: hidden; background: #0F4C75; page-break-after: always; ${useIosPrintLayout ? '' : 'break-inside: avoid; page-break-inside: avoid;'} }
      .pdf-page:last-child { page-break-after: auto; }
      .page-bg { position: absolute; left: -18px; top: -18px; width: calc(100% + 36px); height: calc(100% + 36px); object-fit: cover; z-index: 0; }
      .report-shell { position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; }
      .header { position: relative; min-height: 62px; margin-bottom: 8px; break-inside: avoid; page-break-inside: avoid; }
      .header-main { padding-right: 76px; }
      .header-logo { position: absolute; top: 0; right: 0; width: 62px; height: 62px; object-fit: contain; }
      .title { font-size: 20px; font-weight: 800; color: #0F4C75; margin-bottom: 3px; }
      .farm-info { font-size: 9px; color: #1B262C; margin-bottom: 1px; }
      .farm-info strong { color: #0F4C75; }
      .subtitle { font-size: 8px; color: #4A5568; margin-top: 2px; }
      .divider { height: 2px; background: linear-gradient(to right, #0F4C75, #3282B8); margin: 7px 0 12px; border-radius: 2px; }
      .table-container { width: 100%; overflow: hidden; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; background: transparent; }
      th { background: rgba(15, 76, 117, 0.90); color: #fff; padding: 6px 3px; text-align: center; vertical-align: middle; font-size: 6.4px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1px; border-right: 1px solid rgba(255,255,255,0.22); line-height: 1.1; overflow-wrap: anywhere; }
      th.group { background: rgba(50, 130, 184, 0.92); }
      td { padding: 6px 3px; text-align: center; vertical-align: middle; font-size: 7px; color: #26384A; border-bottom: 1px solid rgba(15, 76, 117, 0.18); line-height: 1.15; font-variant-numeric: tabular-nums; background: rgba(255,255,255,0.50); overflow-wrap: anywhere; }
      tbody tr:nth-child(even) td { background: rgba(255,255,255,0.64); }
      tfoot td { background: rgba(232,244,248,0.78); font-weight: 800; border-top: 2px solid #0F4C75; border-bottom: 1px solid #0F4C75; }
      .strong { font-weight: 800; color: #0F4C75; }
      .note { margin-top: 10px; padding: 8px 10px; background: rgba(255,255,255,0.52); color: #92400E; font-size: 7px; line-height: 1.3; }
      .empty { padding: 28px; text-align: center; color: #4A5568; background: rgba(255,255,255,0.55); border-top: 1px solid rgba(15,76,117,0.18); border-bottom: 1px solid rgba(15,76,117,0.18); }
      .footer { margin-top: auto; padding-top: 7px; border-top: 1px solid rgba(15,76,117,0.18); display: flex; justify-content: space-between; gap: 10px; color: #4A5568; font-size: 7px; }
    </style>
  </head>
  <body>
    <div class="pdf-page">
      <img class="page-bg" src="data:image/png;base64,${assets.backgroundBase64}" alt="" />
      <div class="report-shell">
        ${renderHeader(copy.dailySiponReport, copy.siponDescription)}
        <div class="table-container">
          ${data.siponRows.length ? `<table><colgroup><col style="width:7%"><col style="width:4%"><col span="6" style="width:7%"><col style="width:8%"><col style="width:9%"><col style="width:18%"><col style="width:12%"></colgroup><thead><tr><th rowspan="2">${escapeHtml(copy.pond)}</th><th rowspan="2">${escapeHtml(copy.doc)}</th><th class="group" colspan="3">${escapeHtml(copy.morning)}</th><th class="group" colspan="3">${escapeHtml(copy.evening)}</th><th rowspan="2">${escapeHtml(copy.dailyTotal)}</th><th rowspan="2">${escapeHtml(copy.cumulative)}</th><th rowspan="2">${escapeHtml(copy.estimatedPopulation)}</th><th rowspan="2">${escapeHtml(copy.density)}</th></tr><tr><th>${escapeHtml(copy.siphoned)}</th><th>${escapeHtml(copy.mortal)}</th><th>${escapeHtml(copy.total)}</th><th>${escapeHtml(copy.siphoned)}</th><th>${escapeHtml(copy.mortal)}</th><th>${escapeHtml(copy.total)}</th></tr></thead><tbody>${siponRows}</tbody><tfoot><tr><td colspan="2">${escapeHtml(copy.total)}</td><td>${formatInteger(sum(data.siponRows, 'morningSiphoned'))}</td><td>${formatInteger(sum(data.siponRows, 'morningMortal'))}</td><td>${formatInteger(sum(data.siponRows, 'morningTotal'))}</td><td>${formatInteger(sum(data.siponRows, 'eveningSiphoned'))}</td><td>${formatInteger(sum(data.siponRows, 'eveningMortal'))}</td><td>${formatInteger(sum(data.siponRows, 'eveningTotal'))}</td><td>${formatInteger(sum(data.siponRows, 'dailyTotal'))}</td><td>${formatInteger(sum(data.siponRows, 'cumulativeTotal'))}</td><td colspan="2"></td></tr></tfoot></table>` : `<div class="empty">${escapeHtml(copy.noPonds)}</div>`}
        </div>
        ${hasLegacy ? `<div class="note">${escapeHtml(copy.legacySiponNote)}</div>` : ''}
        ${renderFooter(1)}
      </div>
    </div>
    <div class="pdf-page">
      <img class="page-bg" src="data:image/png;base64,${assets.backgroundBase64}" alt="" />
      <div class="report-shell">
        ${renderHeader(copy.dailyWaterQualityReport, copy.waterDescription)}
        <div class="table-container">
          ${data.waterQualityRows.length ? `<table><colgroup><col style="width:11%"><col style="width:7%"><col style="width:5%"><col style="width:12%"><col style="width:7%"><col style="width:8%"><col style="width:12%"><col style="width:9.5%"><col style="width:9.5%"><col style="width:9.5%"><col style="width:9%"></colgroup><thead><tr><th>${escapeHtml(copy.stockingDate)}</th><th>${escapeHtml(copy.pond)}</th><th>${escapeHtml(copy.doc)}</th><th>${escapeHtml(copy.recordedBy)}</th><th>pH</th><th>${escapeHtml(copy.temperature)}<br>°C</th><th>${escapeHtml(copy.waterAppearance)}</th><th>${escapeHtml(copy.waterDepth)}<br>cm</th><th>${escapeHtml(copy.transparency)}<br>cm</th><th>${escapeHtml(copy.salinity)}<br>ppt</th><th>${escapeHtml(copy.alkalinity)}<br>ppm</th></tr></thead><tbody>${waterRows}</tbody></table>` : `<div class="empty">${escapeHtml(copy.noWaterRecords)}</div>`}
        </div>
        ${renderFooter(2)}
      </div>
    </div>
  </body>
  </html>`;
};
