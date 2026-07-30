import {
  formatPdfNumber,
  localizePdfText,
  type PdfLanguage,
} from './pdfReportI18n';

export interface SamplingGrowthMovementSample {
  mbw: unknown;
  doc?: unknown;
}

export interface SamplingGrowthMovementSeries {
  label: string;
  samples: SamplingGrowthMovementSample[];
}

export interface SamplingGrowthMovementRow {
  label: string;
  previousMbw: number | null;
  latestMbw: number;
  changeMbw: number | null;
  latestDoc: number | null;
}

interface SamplingGrowthMovementChartOptions {
  language?: PdfLanguage;
  width?: number;
  height?: number;
  compact?: boolean;
}

const toPositiveNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'number'
    ? value
    : Number(String(value ?? '').trim().replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const toNonNegativeNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'number'
    ? value
    : Number(String(value ?? '').trim().replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const escapeXml = (value: string): string => (
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
);

const truncateLabel = (value: string, maxLength: number): string => (
  value.length > maxLength ? `${value.slice(0, Math.max(1, maxLength - 3))}...` : value
);

const getNiceAxis = (maxValue: number): { max: number; ticks: number[] } => {
  const paddedMax = Math.max(5, maxValue * 1.02);
  const roughStep = paddedMax / 5;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const fraction = roughStep / magnitude;
  const niceFraction = fraction <= 1
    ? 1
    : fraction <= 2
      ? 2
      : fraction <= 5
        ? 5
        : 10;
  const step = niceFraction * magnitude;
  const axisMax = Math.ceil(paddedMax / step) * step;
  const tickCount = Math.max(1, Math.round(axisMax / step));

  return {
    max: axisMax,
    ticks: Array.from({ length: tickCount + 1 }, (_, index) => index * step),
  };
};

export const buildSamplingGrowthMovementRows = (
  series: SamplingGrowthMovementSeries[],
): SamplingGrowthMovementRow[] => (
  series
    .map((item): SamplingGrowthMovementRow | null => {
      const validSamples = item.samples
        .map((sample, index) => ({
          mbw: toPositiveNumber(sample.mbw),
          doc: toNonNegativeNumber(sample.doc),
          index,
        }))
        .filter((sample): sample is { mbw: number; doc: number | null; index: number } => sample.mbw !== null)
        .sort((a, b) => {
          if (a.doc !== null && b.doc !== null && a.doc !== b.doc) return a.doc - b.doc;
          return a.index - b.index;
        });

      const latest = validSamples[validSamples.length - 1];
      if (!latest) return null;

      const previous = validSamples[validSamples.length - 2] || null;
      return {
        label: item.label,
        previousMbw: previous?.mbw ?? null,
        latestMbw: latest.mbw,
        changeMbw: previous ? latest.mbw - previous.mbw : null,
        latestDoc: latest.doc,
      };
    })
    .filter((row): row is SamplingGrowthMovementRow => row !== null)
    .sort((a, b) => b.latestMbw - a.latestMbw || a.label.localeCompare(b.label))
);

export const renderSamplingGrowthMovementChartSvg = (
  rows: SamplingGrowthMovementRow[],
  options: SamplingGrowthMovementChartOptions = {},
): string => {
  const language = options.language || 'en';
  const compact = Boolean(options.compact);
  const width = options.width || 1000;
  const height = options.height || (compact ? 195 : 350);
  const text = (value: string) => escapeXml(localizePdfText(value, language));
  const number = (value: number, decimals = 1) => formatPdfNumber(value, language, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const title = text('Recent Growth Movement');
  const subtitle = text('Previous and latest valid mean body weight by pond');
  const fontFamily = 'Plus Jakarta Sans, Arial, sans-serif';
  const titleY = compact ? 19 : 34;
  const subtitleY = compact ? 33 : 56;
  const legendY = compact ? 49 : 78;
  const chartTop = compact ? 63 : 104;
  const axisY = height - (compact ? 23 : 38);
  const chartLeft = compact ? 92 : 118;
  const chartRight = width - (compact ? 178 : 190);
  const latestValueX = chartRight + (compact ? 16 : 20);
  const changeValueX = width - (compact ? 16 : 22);
  const plotWidth = chartRight - chartLeft;
  const titleSize = compact ? 14 : 24;
  const subtitleSize = compact ? 7.5 : 13;
  const legendSize = compact ? 7 : 11;
  const tickSize = compact ? 6 : 10;
  const axisLabelSize = compact ? 8 : 13;
  const maxRowHeight = compact ? 10.5 : 24;
  const availableRowsHeight = Math.max(1, axisY - chartTop - (compact ? 6 : 10));
  const rowHeight = Math.min(maxRowHeight, availableRowsHeight / Math.max(1, rows.length));
  const rowsHeight = rowHeight * Math.max(1, rows.length);
  const rowsTop = chartTop + Math.max(0, (availableRowsHeight - rowsHeight) / 2);
  const rowFontSize = Math.max(compact ? 6 : 9, Math.min(compact ? 7.2 : 12, rowHeight * 0.58));
  const pointRadius = compact ? 3 : 5.3;
  const allWeights = rows.flatMap((row) => [
    row.latestMbw,
    ...(row.previousMbw === null ? [] : [row.previousMbw]),
  ]);
  const axis = getNiceAxis(allWeights.length > 0 ? Math.max(...allWeights) : 5);
  const xScale = (value: number) => chartLeft + (value / axis.max) * plotWidth;
  const formatChange = (value: number | null): string => {
    if (value === null) return '-';
    return `${value > 0 ? '+' : ''}${number(value)} g`;
  };

  const grid = axis.ticks.map((tick) => {
    const x = xScale(tick);
    return `
      <line x1="${x}" y1="${chartTop - 2}" x2="${x}" y2="${axisY}" stroke="#CFE0EC" stroke-width="1" stroke-dasharray="2 3" />
      <text x="${x}" y="${axisY + (compact ? 10 : 16)}" text-anchor="middle" font-family="${fontFamily}" font-size="${tickSize}" fill="#526B7D">${escapeXml(number(tick, tick % 1 === 0 ? 0 : 1))}</text>
    `;
  }).join('');

  const rowMarkup = rows.map((row, index) => {
    const y = rowsTop + rowHeight * index + rowHeight / 2;
    const latestX = xScale(row.latestMbw);
    const previousX = row.previousMbw === null ? null : xScale(row.previousMbw);
    const label = escapeXml(truncateLabel(row.label, compact ? 16 : 20));

    return `
      <text x="${compact ? 15 : 22}" y="${y + rowFontSize * 0.34}" font-family="${fontFamily}" font-size="${rowFontSize}" font-weight="650" fill="#153A5A">${label}</text>
      ${previousX === null ? '' : `
        <line x1="${previousX}" y1="${y}" x2="${latestX}" y2="${y}" stroke="#3282B8" stroke-width="${compact ? 1.2 : 1.8}" stroke-linecap="round" />
        <circle cx="${previousX}" cy="${y}" r="${pointRadius}" fill="#FFFFFF" stroke="#1769A0" stroke-width="${compact ? 1.2 : 1.8}" />
      `}
      <circle cx="${latestX}" cy="${y}" r="${pointRadius}" fill="#0F5F96" stroke="#0F5F96" stroke-width="1" />
      <text x="${latestValueX}" y="${y + rowFontSize * 0.34}" font-family="${fontFamily}" font-size="${rowFontSize}" font-weight="700" fill="#153A5A">${escapeXml(`${number(row.latestMbw)} g`)}</text>
      <text x="${changeValueX}" y="${y + rowFontSize * 0.34}" text-anchor="end" font-family="${fontFamily}" font-size="${rowFontSize}" font-weight="700" fill="#3282B8">${escapeXml(formatChange(row.changeMbw))}</text>
    `;
  }).join('');

  const emptyState = `
    <text x="${width / 2}" y="${chartTop + availableRowsHeight / 2}" text-anchor="middle" font-family="${fontFamily}" font-size="${compact ? 8 : 13}" font-weight="700" fill="#64748B">${text('No valid MBW sampling records available')}</text>
  `;

  return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title}">
      <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="${compact ? 7 : 11}" fill="#FFFFFF" fill-opacity="0.82" stroke="#0F4C75" stroke-opacity="0.62" stroke-width="1.3" />
      <text x="${compact ? 15 : 22}" y="${titleY}" font-family="${fontFamily}" font-size="${titleSize}" font-weight="800" fill="#0F4C75">${title}</text>
      <text x="${compact ? 15 : 22}" y="${subtitleY}" font-family="${fontFamily}" font-size="${subtitleSize}" font-weight="500" fill="#49677E">${subtitle}</text>
      <text x="${width - (compact ? 15 : 22)}" y="${titleY}" text-anchor="end" font-family="${fontFamily}" font-size="${compact ? 7 : 11}" font-weight="650" fill="#36556D">${rows.length} ${text('Ponds')} | ${text('Latest valid records')}</text>
      <circle cx="${compact ? 19 : 28}" cy="${legendY}" r="${compact ? 3 : 5}" fill="#FFFFFF" stroke="#1769A0" stroke-width="${compact ? 1.2 : 1.8}" />
      <text x="${compact ? 27 : 39}" y="${legendY + (compact ? 2.4 : 3.8)}" font-family="${fontFamily}" font-size="${legendSize}" font-weight="600" fill="#153A5A">${text('Previous sampling')}</text>
      <circle cx="${compact ? 101 : 150}" cy="${legendY}" r="${compact ? 3 : 5}" fill="#0F5F96" stroke="#0F5F96" stroke-width="1" />
      <text x="${compact ? 109 : 161}" y="${legendY + (compact ? 2.4 : 3.8)}" font-family="${fontFamily}" font-size="${legendSize}" font-weight="600" fill="#153A5A">${text('Latest sampling')}</text>
      ${grid}
      <line x1="${chartLeft}" y1="${axisY}" x2="${chartRight}" y2="${axisY}" stroke="#0F4C75" stroke-width="${compact ? 1 : 1.5}" />
      ${rows.length > 0 ? rowMarkup : emptyState}
      <text x="${chartLeft + plotWidth / 2}" y="${height - (compact ? 4 : 8)}" text-anchor="middle" font-family="${fontFamily}" font-size="${axisLabelSize}" font-weight="800" fill="#0F4C75">${text('MBW (g)')}</text>
    </svg>
  `;
};
