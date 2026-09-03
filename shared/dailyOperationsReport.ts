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

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: 11in 8.5in; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; font-family: Arial, sans-serif; color: #102a43; }
    .pdf-page { width: 792px; height: 612px; padding: 34px 38px 30px; position: relative; overflow: hidden; background: #f8fbfd url(data:image/png;base64,${assets.backgroundBase64}) center/cover no-repeat; page-break-after: always; }
    .pdf-page:last-child { page-break-after: auto; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
    .brand { display: flex; align-items: center; gap: 10px; }
    .brand img { width: 38px; height: 38px; object-fit: contain; }
    .brand-name { color: #0F4C75; font-size: 18px; font-weight: 700; }
    .meta { text-align: right; font-size: 10px; color: #486581; line-height: 1.45; }
    h1 { margin: 0 0 4px; font-size: 22px; color: #0d2137; }
    .subtitle { margin: 0 0 15px; color: #486581; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; background: rgba(255,255,255,.94); font-size: 8px; }
    th, td { border: 1px solid #9fb3c8; padding: 5px 3px; text-align: center; }
    thead th { background: #fff4a8; color: #243b53; font-weight: 700; }
    thead th.group { background: #ffe66d; }
    tfoot td { background: #fff4a8; font-weight: 700; }
    .note { margin-top: 10px; padding: 7px 9px; border-radius: 6px; background: #fff7ed; color: #9a3412; font-size: 8px; }
    .empty { padding: 24px; text-align: center; color: #627d98; border: 1px solid #bcccdc; background: #fff; }
    .footer { position: absolute; left: 38px; right: 38px; bottom: 18px; display: flex; justify-content: space-between; color: #829ab1; font-size: 8px; }
  </style></head><body>
    <section class="pdf-page">
      <div class="header"><div class="brand"><img src="data:image/png;base64,${assets.logoBase64}"/><div class="brand-name">Shrimply</div></div><div class="meta">${escapeHtml(data.companyName)}<br>${escapeHtml(reportDate)}</div></div>
      <h1>${escapeHtml(copy.dailySiponReport)}</h1><p class="subtitle">${escapeHtml(copy.siponDescription)}</p>
      ${data.siponRows.length ? `<table><thead><tr><th rowspan="2">${escapeHtml(copy.pond)}</th><th rowspan="2">${escapeHtml(copy.doc)}</th><th class="group" colspan="3">${escapeHtml(copy.morning)}</th><th class="group" colspan="3">${escapeHtml(copy.evening)}</th><th rowspan="2">${escapeHtml(copy.dailyTotal)}</th><th rowspan="2">${escapeHtml(copy.cumulative)}</th><th rowspan="2">${escapeHtml(copy.estimatedPopulation)}</th><th rowspan="2">${escapeHtml(copy.density)}</th></tr><tr><th>${escapeHtml(copy.siphoned)}</th><th>${escapeHtml(copy.mortal)}</th><th>${escapeHtml(copy.total)}</th><th>${escapeHtml(copy.siphoned)}</th><th>${escapeHtml(copy.mortal)}</th><th>${escapeHtml(copy.total)}</th></tr></thead><tbody>${siponRows}</tbody><tfoot><tr><td colspan="2">${escapeHtml(copy.total)}</td><td>${formatInteger(sum(data.siponRows, 'morningSiphoned'))}</td><td>${formatInteger(sum(data.siponRows, 'morningMortal'))}</td><td>${formatInteger(sum(data.siponRows, 'morningTotal'))}</td><td>${formatInteger(sum(data.siponRows, 'eveningSiphoned'))}</td><td>${formatInteger(sum(data.siponRows, 'eveningMortal'))}</td><td>${formatInteger(sum(data.siponRows, 'eveningTotal'))}</td><td>${formatInteger(sum(data.siponRows, 'dailyTotal'))}</td><td>${formatInteger(sum(data.siponRows, 'cumulativeTotal'))}</td><td colspan="2"></td></tr></tfoot></table>` : `<div class="empty">${escapeHtml(copy.noPonds)}</div>`}
      ${hasLegacy ? `<div class="note">${escapeHtml(copy.legacySiponNote)}</div>` : ''}
      <div class="footer"><span>${escapeHtml(copy.generatedBy)} ${escapeHtml(data.generatedBy)}</span><span>${escapeHtml(copy.menuLabel)} • Shrimply</span></div>
    </section>
    <section class="pdf-page">
      <div class="header"><div class="brand"><img src="data:image/png;base64,${assets.logoBase64}"/><div class="brand-name">Shrimply</div></div><div class="meta">${escapeHtml(data.companyName)}<br>${escapeHtml(reportDate)}</div></div>
      <h1>${escapeHtml(copy.dailyWaterQualityReport)}</h1><p class="subtitle">${escapeHtml(copy.waterDescription)}</p>
      ${data.waterQualityRows.length ? `<table><thead><tr><th>${escapeHtml(copy.stockingDate)}</th><th>${escapeHtml(copy.pond)}</th><th>${escapeHtml(copy.doc)}</th><th>${escapeHtml(copy.recordedBy)}</th><th>pH</th><th>${escapeHtml(copy.temperature)}<br>°C</th><th>${escapeHtml(copy.waterAppearance)}</th><th>${escapeHtml(copy.waterDepth)}<br>cm</th><th>${escapeHtml(copy.transparency)}<br>cm</th><th>${escapeHtml(copy.salinity)}<br>ppt</th><th>${escapeHtml(copy.alkalinity)}<br>ppm</th></tr></thead><tbody>${waterRows}</tbody></table>` : `<div class="empty">${escapeHtml(copy.noWaterRecords)}</div>`}
      <div class="footer"><span>${escapeHtml(copy.generatedBy)} ${escapeHtml(data.generatedBy)}</span><span>${escapeHtml(copy.menuLabel)} • Shrimply</span></div>
    </section>
  </body></html>`;
};
