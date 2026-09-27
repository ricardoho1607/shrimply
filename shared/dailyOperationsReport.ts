import { buildPondReportSnapshot, type ReportHarvest } from './reportSnapshots.ts';
import type { MortalityObservationType } from './pondCalculations.ts';
import { dailyOperationsTranslations, type DailyOperationsLanguage } from './dailyOperationsI18n.ts';
import { normalizeFarmDateKey } from './farmDate.ts';

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
  doMorning?: string | number | null;
  doEvening?: string | number | null;
  ammonia?: string | number | null;
  date?: string | null;
  mbw?: string | number | null;
  abw?: string | number | null;
  feed?: string | number | null;
  feedData?: { totalDailyFeed?: string | number | null } | null;
  isBaselineEstimate?: boolean;
  source?: string | null;
  cumulativeFeedToDate?: string | number | null;
  phMorning?: string | number | null;
  phEvening?: string | number | null;
  temperatureMorning?: string | number | null;
  temperatureEvening?: string | number | null;
  temperature?: string | number | null;
  waterAppearanceMorning?: string | null;
  waterAppearanceEvening?: string | null;
  waterAppearance?: string | null;
  waterDepthCmMorning?: string | number | null;
  waterDepthCmEvening?: string | number | null;
  waterDepthCm?: string | number | null;
  transparencyMorning?: string | number | null;
  transparencyEvening?: string | number | null;
  transparency?: string | number | null;
  salinity?: string | number | null;
  alkalinity?: string | number | null;
  waterQualityRecordedByName?: string | null;
  pondCycleId?: string | null;
}

export interface DailyOperationsPondSource {
  cycleId?: string;
  cycleStartedAt?: string;
  cycleEndedAt?: string;
  id: string;
  pondName: string;
  blockId?: string | null;
  blockName?: string | null;
  cycleStatus?: 'active' | 'ended' | null;
  docStart?: string | null;
  initialWeight?: number | string | null;
  baselineDate?: string | null;
  baselineMbw?: number | string | null;
  baselineCumulativeFeed?: number | string | null;
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
  doMorning: string;
  doEvening: string;
  ammonia: string;
  pondName: string;
  blockName: string;
  stockingDate: string;
  doc: number;
  recordedBy: string;
  phMorning: string;
  phEvening: string;
  phRange: string;
  temperatureMorning: string;
  temperatureEvening: string;
  temperature: string;
  waterAppearanceMorning: string;
  waterAppearanceEvening: string;
  waterAppearance: string;
  waterDepthCmMorning: string;
  waterDepthCmEvening: string;
  waterDepthCm: string;
  transparencyMorning: string;
  transparencyEvening: string;
  transparency: string;
  salinity: string;
  alkalinity: string;
  feedIndex: string;
  dailyFeedKg: string;
  cumulativeFeedKg: string;
  targetAdg: string;
  estimatedPopulation: number | null;
}

export interface DailyOperationsReportData {
  warnings?: string[];
  companyName: string;
  reportDate: string;
  generatedBy: string;
  siponRows: SiponReportRow[];
  waterQualityRows: WaterQualityReportRow[];
}

const numberValue = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  const text = String(value).trim();
  if (!text || text === 'undefined' || text === 'null' || text === 'NaN') return 0;
  const parsed = Number(text.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const textValue = (value: unknown): string => {
  if (value === null || value === undefined) return 'N/A';
  const text = String(value).trim();
  if (
    !text ||
    text === '0' ||
    text === '-' ||
    text === 'undefined' ||
    text === 'null' ||
    text === 'NaN'
  ) return 'N/A';
  return text;
};

const phRangeValue = (morning: unknown, evening: unknown): string => {
  const morningText = textValue(morning);
  const eveningText = textValue(evening);
  if (morningText === 'N/A' || eveningText === 'N/A') return 'N/A';
  const morningValue = Number(morningText.replace(',', '.'));
  const eveningValue = Number(eveningText.replace(',', '.'));
  if (!Number.isFinite(morningValue) || !Number.isFinite(eveningValue)) return 'N/A';
  return Math.abs(eveningValue - morningValue).toFixed(2);
};

const dateKey = (value: unknown, timeZone?: string): string => normalizeFarmDateKey(value, timeZone) || '';

const isBaselineRecord = (record: DailyOperationsWaterRecord): boolean =>
  Boolean(record.isBaselineEstimate) || record.source === 'midcycle_onboarding';

const formatDecimal = (value: number, digits = 2): string =>
  value.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');

const getDoc = (stockingDate: unknown, reportDate: string, timeZone?: string): number => {
  const startKey = dateKey(stockingDate, timeZone);
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

const buildSiponRow = (pond: DailyOperationsPondSource, reportDate: string, timeZone?: string): SiponReportRow => {
  const records = (pond.mortalityRecords || []).filter((record) => belongsToCurrentCycle(record, pond));
  const dailyRecords = records.filter((record) => dateKey(record.date, timeZone) === reportDate);
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
    .filter((record) => dateKey(record.date, timeZone) <= reportDate)
    .reduce((total, record) => total + componentCount(record), 0);
  const initialPopulation = numberValue(pond.initialPopulation ?? pond.initialStock);
  const estimatedPopulation = Math.max(0, initialPopulation - cumulativeTotal - numberValue(pond.totalHarvestedPopulation));
  const pondArea = numberValue(pond.pondArea);
  const doc = getDoc(pond.docStart, reportDate, timeZone);
  const density = pondArea > 0 ? estimatedPopulation / pondArea : numberValue(pond.density);

  return {
    pondName: pond.pondName || 'N/A',
    blockName: textValue(pond.blockName),
    doc: Number.isFinite(doc) ? doc : 0,
    morningSiphoned: morning.siphoned || 0,
    morningMortal: morning.mortal || 0,
    morningTotal: morning.total || 0,
    eveningSiphoned: evening.siphoned || 0,
    eveningMortal: evening.mortal || 0,
    eveningTotal: evening.total || 0,
    dailyTotal: dailyTotal || 0,
    cumulativeTotal: cumulativeTotal || 0,
    estimatedPopulation: Number.isFinite(estimatedPopulation) ? estimatedPopulation : 0,
    density: Number.isFinite(density) ? density : 0,
    hasUnclassifiedData: dailyRecords.some((record) => !record.siponShift || (
      numberValue(record.siphonedCount) + numberValue(record.mortalCount) <= 0
    )),
  };
};

const buildWaterQualityRow = (
  pond: DailyOperationsPondSource,
  reportDate: string,
  timeZone?: string,
): WaterQualityReportRow | null => {
  const cycleRecords = (pond.samplings || []).filter((record) => belongsToCurrentCycle(record, pond));
  const recordsToDate = cycleRecords.filter((record) => {
    const recordDate = dateKey(record.date, timeZone);
    return Boolean(recordDate) && recordDate <= reportDate;
  });
  const dailyRecords = recordsToDate.filter((record) => dateKey(record.date, timeZone) === reportDate);
  const operationalFeedRecords = recordsToDate.filter((record) => !isBaselineRecord(record) && numberValue(record.feedData?.totalDailyFeed) > 0);
  const operationalFeed = operationalFeedRecords.reduce((total, record) => total + numberValue(record.feedData?.totalDailyFeed), 0);
  const baselineFeedFromPond = !pond.baselineDate || pond.baselineDate <= reportDate
    ? numberValue(pond.baselineCumulativeFeed)
    : 0;
  const baselineFeedFromRecords = recordsToDate
    .filter(isBaselineRecord)
    .reduce((maximum, record) => Math.max(
      maximum,
      numberValue(record.cumulativeFeedToDate) || numberValue(record.feed),
    ), 0);
  const baselineFeed = Math.max(baselineFeedFromPond, baselineFeedFromRecords);
  const hasFeedHistory = baselineFeed > 0 || operationalFeedRecords.length > 0;
  const hasDailyReportData = dailyRecords.some((record) => [
      record.doMorning, record.doEvening, record.ammonia,
      record.phMorning,
      record.phEvening,
      record.temperatureMorning,
      record.temperatureEvening,
      record.temperature,
      record.waterAppearanceMorning,
      record.waterAppearanceEvening,
      record.waterAppearance,
      record.waterDepthCmMorning,
      record.waterDepthCmEvening,
      record.waterDepthCm,
      record.transparencyMorning,
      record.transparencyEvening,
      record.transparency,
      record.salinity,
      record.alkalinity,
      record.feedData?.totalDailyFeed,
    ].some((value) => {
      if (value === null || value === undefined) return false;
      const text = String(value).trim();
      return Boolean(text && text !== '-' && text !== 'undefined' && text !== 'null' && text !== 'NaN');
    }));
  if (!hasDailyReportData && !hasFeedHistory) return null;

  const latestValue = (key: keyof DailyOperationsWaterRecord): unknown => {
    for (let index = dailyRecords.length - 1; index >= 0; index -= 1) {
      const raw = dailyRecords[index][key];
      if (raw === null || raw === undefined) continue;
      const text = String(raw).trim();
      if (!text || text === '0' || text === '-' || text === 'undefined' || text === 'null' || text === 'NaN') continue;
      return raw;
    }
    return undefined;
  };

  const exactNumber = (field: keyof DailyOperationsWaterRecord): string => {
    const values = dailyRecords.map(record => record[field]).filter(value => value !== null && value !== undefined && String(value).trim() !== '');
    const value = values[values.length - 1];
    return value !== undefined && Number.isFinite(Number(value)) ? String(value) : 'N/A';
  };
  const phMorning = latestValue('phMorning');
  const phEvening = latestValue('phEvening');
  const tempMorning = textValue(latestValue('temperatureMorning') ?? latestValue('temperature'));
  const tempEvening = textValue(latestValue('temperatureEvening'));
  const appearanceMorning = textValue(latestValue('waterAppearanceMorning') ?? latestValue('waterAppearance'));
  const appearanceEvening = textValue(latestValue('waterAppearanceEvening'));
  const depthMorning = textValue(latestValue('waterDepthCmMorning') ?? latestValue('waterDepthCm'));
  const depthEvening = textValue(latestValue('waterDepthCmEvening'));
  const transpMorning = textValue(latestValue('transparencyMorning') ?? latestValue('transparency'));
  const transpEvening = textValue(latestValue('transparencyEvening'));
  const dailyFeedRecords = dailyRecords.filter((record) => !isBaselineRecord(record) && numberValue(record.feedData?.totalDailyFeed) > 0);
  const dailyFeed = dailyFeedRecords.reduce((total, record) => total + numberValue(record.feedData?.totalDailyFeed), 0);
  const hasCumulativeFeed = baselineFeed > 0 || operationalFeedRecords.length > 0;
  const cumulativeFeed = baselineFeed + operationalFeed;
  const doc = getDoc(pond.docStart, reportDate, timeZone);
  const initialPopulation = numberValue(pond.initialPopulation ?? pond.initialStock);
  const siponRow = buildSiponRow(pond, reportDate, timeZone);
  const estimatedPopulation = initialPopulation > 0 ? siponRow.estimatedPopulation : null;
  const feedIndex = dailyFeed > 0 && doc > 0 && estimatedPopulation && estimatedPopulation > 0
    ? (dailyFeed * 100_000) / (doc * estimatedPopulation)
    : null;
  const targetAdg = feedIndex === null ? null : feedIndex * 0.5;

  return {
    pondName: pond.pondName || 'N/A',
    blockName: textValue(pond.blockName),
    stockingDate: dateKey(pond.docStart, timeZone) || 'N/A',
    doc: Number.isFinite(doc) ? doc : 0,
    recordedBy: textValue(latestValue('waterQualityRecordedByName')),
    doMorning: exactNumber('doMorning'), doEvening: exactNumber('doEvening'), ammonia: exactNumber('ammonia'),
    phMorning: textValue(phMorning),
    phEvening: textValue(phEvening),
    phRange: phRangeValue(phMorning, phEvening),
    temperatureMorning: tempMorning || 'N/A',
    temperatureEvening: tempEvening || 'N/A',
    temperature: (tempMorning !== 'N/A' ? tempMorning : tempEvening) || 'N/A',
    waterAppearanceMorning: appearanceMorning || 'N/A',
    waterAppearanceEvening: appearanceEvening || 'N/A',
    waterAppearance: (appearanceMorning !== 'N/A' ? appearanceMorning : appearanceEvening) || 'N/A',
    waterDepthCmMorning: depthMorning || 'N/A',
    waterDepthCmEvening: depthEvening || 'N/A',
    waterDepthCm: (depthMorning !== 'N/A' ? depthMorning : depthEvening) || 'N/A',
    transparencyMorning: transpMorning || 'N/A',
    transparencyEvening: transpEvening || 'N/A',
    transparency: (transpMorning !== 'N/A' ? transpMorning : transpEvening) || 'N/A',
    salinity: textValue(latestValue('salinity')),
    alkalinity: textValue(latestValue('alkalinity')),
    feedIndex: feedIndex === null || !Number.isFinite(feedIndex) ? 'N/A' : feedIndex.toFixed(2),
    dailyFeedKg: dailyFeedRecords.length === 0 || !Number.isFinite(dailyFeed) ? 'N/A' : formatDecimal(dailyFeed),
    cumulativeFeedKg: hasCumulativeFeed && Number.isFinite(cumulativeFeed) ? formatDecimal(cumulativeFeed) : 'N/A',
    targetAdg: targetAdg === null || !Number.isFinite(targetAdg) ? 'N/A' : targetAdg.toFixed(2),
    estimatedPopulation: estimatedPopulation != null && Number.isFinite(estimatedPopulation) ? estimatedPopulation : null,
  };
};

export const buildDailyOperationsReport = ({
  companyName,
  reportDate,
  generatedBy,
  ponds,
  harvests,
  timeZone,
}: {
  companyName?: string | null;
  reportDate?: string | null;
  generatedBy?: string | null;
  ponds?: DailyOperationsPondSource[] | null;
  harvests?: ReportHarvest[];
  timeZone?: string;
}): DailyOperationsReportData => {
  const sourcePonds = Array.isArray(ponds) ? ponds : [];
  const warnings: string[] = [];
  const safeDate = dateKey(reportDate, timeZone);
  const safePonds = sourcePonds.flatMap(pond => {
    if (!harvests) return [pond];
    try {
      return [buildPondReportSnapshot({ ...pond,
        samplings: (pond.samplings || []).map(record => ({ ...record, date: record.date || undefined })),
        mortalityRecords: (pond.mortalityRecords || []).map(record => ({ ...record, date: record.date || undefined, observationType: record.observationType || undefined })),
      }, safeDate, harvests, timeZone)];
    } catch (error) { warnings.push(`${pond.pondName}: ${error instanceof Error ? error.message : 'Incomplete history'}`); return []; }
  });
  const safeCompany = String(companyName || '').trim();
  const safeGenerated = String(generatedBy || '').trim();

  return {
    warnings,
    companyName: safeCompany && safeCompany !== 'undefined' && safeCompany !== 'null' ? safeCompany : 'My Farm',
    reportDate: safeDate && safeDate !== 'undefined' && safeDate !== 'null' ? safeDate : '',
    generatedBy: safeGenerated && safeGenerated !== 'undefined' && safeGenerated !== 'null' ? safeGenerated : 'Shrimply user',
    siponRows: safePonds.map((pond) => buildSiponRow(pond, safeDate, timeZone)),
    waterQualityRows: safePonds
      .map((pond) => buildWaterQualityRow(pond, safeDate, timeZone))
      .filter((row): row is WaterQualityReportRow => Boolean(row)),
  };
};

const escapeHtml = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const text = String(value).trim();
  if (text === 'undefined' || text === 'null') return 'N/A';
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
};

const formatInteger = (value: unknown): string => {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? Math.round(num).toLocaleString('en-US') : '0';
};

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
  const reportDate = new Date(`${data.reportDate}T00:00:00Z`).toLocaleDateString(localeByLanguage[language], {
    timeZone: 'UTC', day: '2-digit', month: 'long', year: 'numeric',
  });
  const printViewportWidth = useIosPrintLayout ? 1000 : 1056;
  const printPageSize = useIosPrintLayout ? '792px 612px' : '11in 8.5in';
  const printPageWidth = useIosPrintLayout ? '100%' : '11in';
  const printPageHeight = useIosPrintLayout ? '100%' : '8.5in';
  const renderSiponRows = (rows: SiponReportRow[]) => rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.pondName || 'N/A')}</td><td>${Number.isFinite(row.doc) ? row.doc : 0}</td>
      <td>${formatInteger(row.morningSiphoned)}</td><td>${formatInteger(row.morningMortal)}</td><td>${formatInteger(row.morningTotal)}</td>
      <td>${formatInteger(row.eveningSiphoned)}</td><td>${formatInteger(row.eveningMortal)}</td><td>${formatInteger(row.eveningTotal)}</td>
      <td><strong>${formatInteger(row.dailyTotal)}</strong></td><td>${formatInteger(row.cumulativeTotal)}</td>
      <td>${formatInteger(row.estimatedPopulation)}</td><td>${formatInteger(row.density)}</td>
    </tr>`).join('');
  const renderWaterRows = (rows: WaterQualityReportRow[]) => rows.map((row) => `
    <tr><td>${escapeHtml(row.stockingDate || 'N/A')}</td><td>${escapeHtml(row.pondName || 'N/A')}</td><td>${Number.isFinite(row.doc) ? row.doc : 0}</td>
      <td>${escapeHtml(row.recordedBy || 'N/A')}</td><td>${escapeHtml(row.phMorning || 'N/A')}</td><td>${escapeHtml(row.phEvening || 'N/A')}</td><td>${escapeHtml(row.phRange || 'N/A')}</td>
      <td>${escapeHtml(row.temperatureMorning || 'N/A')}</td><td>${escapeHtml(row.temperatureEvening || 'N/A')}</td>
      <td>${escapeHtml(row.waterAppearanceMorning || 'N/A')}</td><td>${escapeHtml(row.waterAppearanceEvening || 'N/A')}</td>
      <td>${escapeHtml(row.waterDepthCmMorning || 'N/A')}</td><td>${escapeHtml(row.waterDepthCmEvening || 'N/A')}</td>
      <td>${escapeHtml(row.transparencyMorning || 'N/A')}</td><td>${escapeHtml(row.transparencyEvening || 'N/A')}</td>
      <td>${escapeHtml(row.salinity || 'N/A')}</td><td>${escapeHtml(row.alkalinity || 'N/A')}</td><td>${escapeHtml(row.doMorning)}</td><td>${escapeHtml(row.doEvening)}</td><td>${escapeHtml(row.ammonia)}</td><td>${escapeHtml(row.feedIndex || 'N/A')}</td>
      <td>${escapeHtml(row.dailyFeedKg || 'N/A')}</td><td>${escapeHtml(row.cumulativeFeedKg || 'N/A')}</td><td>${escapeHtml(row.targetAdg || 'N/A')}</td>
      <td>${row.estimatedPopulation === null || !Number.isFinite(row.estimatedPopulation) ? 'N/A' : formatInteger(row.estimatedPopulation)}</td></tr>`).join('');
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
  const pagesOf = <T,>(rows: T[], size: number): T[][] => rows.length ? Array.from({ length: Math.ceil(rows.length / size) }, (_, index) => rows.slice(index * size, (index + 1) * size)) : [[]];
  const siponPages = pagesOf(data.siponRows, 12);
  const waterPages = pagesOf(data.waterQualityRows, 12);
  const totalPages = siponPages.length + waterPages.length;
  const renderFooter = (pageNumber: number) => `
    <div class="footer">
      <span>Shrimply Aquaculture Management | ${escapeHtml(data.companyName)}</span>
      <span>${escapeHtml(copy.page)} ${pageNumber} ${escapeHtml(copy.of)} ${totalPages}</span>
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
      th.feed-group { background: rgba(187, 225, 250, 0.96); color: #0F4C75; border-color: rgba(15,76,117,0.20); }
      .water-table th { padding: 4px 1px; font-size: 5.2px; overflow-wrap: normal; word-break: normal; }
      td { padding: 6px 3px; text-align: center; vertical-align: middle; font-size: 7px; color: #26384A; border-bottom: 1px solid rgba(15, 76, 117, 0.18); line-height: 1.15; font-variant-numeric: tabular-nums; background: rgba(255,255,255,0.50); overflow-wrap: anywhere; }
      .water-table td { padding: 4px 1px; font-size: 6.2px; }
      tbody tr:nth-child(even) td { background: rgba(255,255,255,0.64); }
      tfoot td { background: rgba(232,244,248,0.78); font-weight: 800; border-top: 2px solid #0F4C75; border-bottom: 1px solid #0F4C75; }
      .strong { font-weight: 800; color: #0F4C75; }
      .note { margin-top: 10px; padding: 8px 10px; background: rgba(255,255,255,0.52); color: #92400E; font-size: 7px; line-height: 1.3; }
      .empty { padding: 28px; text-align: center; color: #4A5568; background: rgba(255,255,255,0.55); border-top: 1px solid rgba(15,76,117,0.18); border-bottom: 1px solid rgba(15,76,117,0.18); }
      .footer { margin-top: auto; padding-top: 7px; border-top: 1px solid rgba(15,76,117,0.18); display: flex; justify-content: space-between; gap: 10px; color: #4A5568; font-size: 7px; }
    </style>
  </head>
  <body>
    ${siponPages.map((pageRows, pageIndex) => `
    <div class="pdf-page">
      <img class="page-bg" src="data:image/png;base64,${assets.backgroundBase64}" alt="" />
      <div class="report-shell">
        ${renderHeader(copy.dailySiponReport, copy.siponDescription)}
        <div class="table-container">
          ${pageRows.length ? `<table><colgroup><col style="width:7%"><col style="width:4%"><col span="6" style="width:7%"><col style="width:8%"><col style="width:9%"><col style="width:18%"><col style="width:12%"></colgroup><thead><tr><th rowspan="2">${escapeHtml(copy.pond)}</th><th rowspan="2">${escapeHtml(copy.doc)}</th><th class="group" colspan="3">${escapeHtml(copy.morning)}</th><th class="group" colspan="3">${escapeHtml(copy.evening)}</th><th rowspan="2">${escapeHtml(copy.dailyTotal)}</th><th rowspan="2">${escapeHtml(copy.cumulative)}</th><th rowspan="2">${escapeHtml(copy.estimatedPopulation)}</th><th rowspan="2">${escapeHtml(copy.density)}</th></tr><tr><th>${escapeHtml(copy.siphoned)}</th><th>${escapeHtml(copy.mortal)}</th><th>${escapeHtml(copy.total)}</th><th>${escapeHtml(copy.siphoned)}</th><th>${escapeHtml(copy.mortal)}</th><th>${escapeHtml(copy.total)}</th></tr></thead><tbody>${renderSiponRows(pageRows)}</tbody><tfoot><tr><td colspan="2">${escapeHtml(copy.total)}</td><td>${formatInteger(sum(pageRows, 'morningSiphoned'))}</td><td>${formatInteger(sum(pageRows, 'morningMortal'))}</td><td>${formatInteger(sum(pageRows, 'morningTotal'))}</td><td>${formatInteger(sum(pageRows, 'eveningSiphoned'))}</td><td>${formatInteger(sum(pageRows, 'eveningMortal'))}</td><td>${formatInteger(sum(pageRows, 'eveningTotal'))}</td><td>${formatInteger(sum(pageRows, 'dailyTotal'))}</td><td>${formatInteger(sum(pageRows, 'cumulativeTotal'))}</td><td colspan="2"></td></tr></tfoot></table>` : `<div class="empty">${escapeHtml(copy.noPonds)}</div>`}
        </div>
        ${hasLegacy ? `<div class="note">${escapeHtml(copy.legacySiponNote)}</div>` : ''}
        ${renderFooter(pageIndex + 1)}
      </div>
    </div>
    `).join('')}
    ${waterPages.map((pageRows, pageIndex) => `
    <div class="pdf-page">
      <img class="page-bg" src="data:image/png;base64,${assets.backgroundBase64}" alt="" />
      <div class="report-shell">
        ${renderHeader(copy.dailyWaterQualityReport, copy.waterDescription)}
        <div class="table-container">
          ${pageRows.length ? `<table class="water-table"><thead><tr><th rowspan="2">${escapeHtml(copy.stockingDate)}</th><th rowspan="2">${escapeHtml(copy.pond)}</th><th rowspan="2">${escapeHtml(copy.doc)}</th><th rowspan="2">${escapeHtml(copy.recordedBy)}</th><th class="group" colspan="3">pH</th><th class="group" colspan="2">${escapeHtml(copy.temperature)}</th><th class="group" colspan="2">${escapeHtml(copy.waterAppearance)}</th><th class="group" colspan="2">${escapeHtml(copy.waterDepth)}</th><th class="group" colspan="2">${escapeHtml(copy.transparency)}</th><th rowspan="2">${escapeHtml(copy.salinity)}</th><th rowspan="2">${escapeHtml(copy.alkalinity)}</th><th rowspan="2">DO AM<br/>mg/L</th><th rowspan="2">DO PM<br/>mg/L</th><th rowspan="2">Ammonia<br/>mg/L</th><th class="feed-group" colspan="5">${escapeHtml(copy.feedSection)}</th></tr><tr><th>${escapeHtml(copy.phMorning)}</th><th>${escapeHtml(copy.phEvening)}</th><th>${escapeHtml(copy.phRange)}</th><th>${escapeHtml(copy.am)}</th><th>${escapeHtml(copy.pm)}</th><th>${escapeHtml(copy.am)}</th><th>${escapeHtml(copy.pm)}</th><th>${escapeHtml(copy.am)}</th><th>${escapeHtml(copy.pm)}</th><th>${escapeHtml(copy.am)}</th><th>${escapeHtml(copy.pm)}</th><th class="feed-group">${escapeHtml(copy.feedIndex)}</th><th class="feed-group">${escapeHtml(copy.dailyFeed)}</th><th class="feed-group">${escapeHtml(copy.cumulativeFeed)}</th><th class="feed-group">${escapeHtml(copy.targetAdg)}</th><th class="feed-group">${escapeHtml(copy.estimatedPopulation)}</th></tr></thead><tbody>${renderWaterRows(pageRows)}</tbody></table>` : `<div class="empty">${escapeHtml(copy.noWaterRecords)}</div>`}
        </div>
        ${renderFooter(siponPages.length + pageIndex + 1)}
      </div>
    </div>
    `).join('')}
  </body>
  </html>`;
};
