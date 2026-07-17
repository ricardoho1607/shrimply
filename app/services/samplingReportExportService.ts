// services/samplingReportExportService.ts
import { Asset } from 'expo-asset';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';

const PDF_BACKGROUND_ASSET = require('../../assets/pdf/shrimply-pdf-background.png');
const PDF_LOGO_ASSET = require('../../assets/pdf/shrimply-logo.png');

interface PdfBrandAssets {
  backgroundBase64: string;
  logoBase64: string;
}

interface SamplingData {
  samplingNumber: number;
  samplingDate: string;
  doc: number; // Days of Culture
  abw?: number; // Average Body Weight
  mbw?: number; // Mean Body Weight, same biological value as ABW in Shrimply reports
  adg: number; // Average Daily Growth
  size: number; // Size (shrimp per kg)
  sr: number; // Survival Rate
  biomass: number;
  feedCumulative: number;
  fcr: number; // Feed Conversion Ratio
  mortality: number;
  mortalityPercentage: number;
}

interface PondData {
  pondNumber: string;
  stockingDate: string;
  area: number; // in hectares
  initialStock: number;
  density: number; // per m²
  latestLabStatus?: {
    sampleDate?: string;
    status?: 'good' | 'info' | 'watch' | 'warning' | 'critical';
    mainIssue?: string;
    keyRisks?: string[];
    recommendations?: string[];
  };
  isMidcycleBaseline?: boolean;
  baselineDate?: string;
  samplingHistory: SamplingData[];
}

interface SamplingReportData {
  farmName: string;
  block: string;
  technician: string;
  reportDate: string;
  reportPeriod: string;
  companyName: string;
  ponds: PondData[];
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

const loadSamplingReportBrandAssets = async (): Promise<PdfBrandAssets> => {
  const [backgroundBase64, logoBase64] = await Promise.all([
    loadBase64Asset(PDF_BACKGROUND_ASSET),
    loadBase64Asset(PDF_LOGO_ASSET),
  ]);

  return { backgroundBase64, logoBase64 };
};

const formatNumber = (num: number, decimals: number = 2): string => {
  const safeNumber = Number.isFinite(num) ? num : 0;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(safeNumber);
};

const formatOptionalNumber = (num: number | undefined, decimals: number = 2): string => {
  return Number.isFinite(num) ? formatNumber(num as number, decimals) : '-';
};

const toFiniteNumber = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const getSamplingWeight = (sampling?: SamplingData): number => {
  return toFiniteNumber(sampling?.mbw ?? sampling?.abw);
};

const escapeXml = (value: string): string => (
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
);

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

const formatShortDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
  });
};

const formatCompactNumber = (num: number, decimals: number = 0): string => {
  const safeNumber = Number.isFinite(num) ? num : 0;
  if (Math.abs(safeNumber) >= 1000000) return `${formatNumber(safeNumber / 1000000, 1)}M`;
  if (Math.abs(safeNumber) >= 10000) return `${formatNumber(safeNumber / 1000, 1)}k`;
  return formatNumber(safeNumber, decimals);
};

const calculateAverages = (ponds: PondData[]) => {
  const latestSamplings = ponds
    .map(pond => getLatestSampling(pond))
    .filter((sampling): sampling is SamplingData => Boolean(sampling));

  const sampledPondCount = latestSamplings.length || 1;
  const totalPonds = ponds.length || 1;
  const avgABW = latestSamplings.reduce((sum, s) => sum + getSamplingWeight(s), 0) / sampledPondCount;
  const avgADG = latestSamplings.reduce((sum, s) => sum + toFiniteNumber(s.adg), 0) / sampledPondCount;
  const avgSize = latestSamplings.reduce((sum, s) => sum + toFiniteNumber(s.size), 0) / sampledPondCount;
  const avgSR = latestSamplings.reduce((sum, s) => sum + toFiniteNumber(s.sr), 0) / sampledPondCount;
  const avgFCR = latestSamplings.reduce((sum, s) => sum + toFiniteNumber(s.fcr), 0) / sampledPondCount;
  const totalBiomass = latestSamplings.reduce((sum, s) => sum + toFiniteNumber(s.biomass), 0);
  const totalFeed = latestSamplings.reduce((sum, s) => sum + toFiniteNumber(s.feedCumulative), 0);
  const avgDensity = ponds.reduce((sum, p) => sum + toFiniteNumber(p.density), 0) / totalPonds;
  
  // Calculate average previous ABW
  const previousABWs = ponds.map(pond => getPreviousABW(pond)).filter(abw => abw > 0);
  const avgPrevABW = previousABWs.length > 0 ? previousABWs.reduce((sum, abw) => sum + abw, 0) / previousABWs.length : 0;

  return {
    avgABW,
    avgADG,
    avgSize,
    avgSR,
    avgFCR,
    totalBiomass,
    totalFeed,
    avgDensity,
    avgPrevABW,
  };
};

const getPreviousABW = (pond: PondData): number => {
  if (pond.samplingHistory.length < 2) return 0;
  return getSamplingWeight(pond.samplingHistory[pond.samplingHistory.length - 2]);
};

const getLatestSampling = (pond: PondData): SamplingData | undefined => {
  return pond.samplingHistory[pond.samplingHistory.length - 1];
};

const getReportAnalysis = (ponds: PondData[]) => {
  const latestSamplings = ponds
    .map((pond) => ({ pond, sampling: getLatestSampling(pond), previousABW: getPreviousABW(pond) }))
    .filter((item): item is { pond: PondData; sampling: SamplingData; previousABW: number } => Boolean(item.sampling));

  if (latestSamplings.length === 0) {
    return {
      executiveSummary: [
        'No valid sampling records were available for the selected ponds. Growth performance cannot be assessed until ABW/MBW, mortality, feed, and sampling date records are entered.',
      ],
      riskAssessment: [
        'Missing sampling history is the primary report risk. Record at least one valid sampling entry per selected pond before using this report for production decisions.',
      ],
    };
  }

  const avgABW = latestSamplings.reduce((sum, item) => sum + getSamplingWeight(item.sampling), 0) / latestSamplings.length;
  const avgADG = latestSamplings.reduce((sum, item) => sum + toFiniteNumber(item.sampling.adg), 0) / latestSamplings.length;
  const avgSR = latestSamplings.reduce((sum, item) => sum + toFiniteNumber(item.sampling.sr), 0) / latestSamplings.length;
  const avgFCR = latestSamplings.reduce((sum, item) => sum + toFiniteNumber(item.sampling.fcr), 0) / latestSamplings.length;
  const totalFeed = latestSamplings.reduce((sum, item) => sum + toFiniteNumber(item.sampling.feedCumulative), 0);
  const midcyclePonds = ponds.filter((pond) => pond.isMidcycleBaseline);
  const incompleteFeedHistory = totalFeed > 0 && avgFCR < 0.5;
  const highRiskPonds = latestSamplings.filter(({ pond, sampling }) => {
    const totalMortality = pond.samplingHistory.reduce((sum, s) => sum + toFiniteNumber(s.mortality), 0);
    const mortalityPct = pond.initialStock > 0 ? (totalMortality / pond.initialStock) * 100 : 0;
    return getSamplingWeight(sampling) <= 0 || toFiniteNumber(sampling.adg) <= 0 || toFiniteNumber(sampling.sr) < 80 || toFiniteNumber(sampling.fcr) > 1.8 || mortalityPct > 15;
  });
  const moderateRiskPonds = latestSamplings.filter(({ sampling }) => {
    return toFiniteNumber(sampling.adg) < 0.15 || toFiniteNumber(sampling.sr) < 90 || toFiniteNumber(sampling.fcr) > 1.5;
  });

  const bestPond = [...latestSamplings].sort((a, b) => {
    const score = (item: { sampling: SamplingData }) => (toFiniteNumber(item.sampling.adg) * 4) + (toFiniteNumber(item.sampling.sr) / 20) - toFiniteNumber(item.sampling.fcr);
    return score(b) - score(a);
  })[0];

  const weakestPond = [...latestSamplings].sort((a, b) => {
    const score = (item: { sampling: SamplingData }) => {
      const lowGrowthPenalty = toFiniteNumber(item.sampling.adg) < 0.15 ? 2 : 0;
      const survivalPenalty = toFiniteNumber(item.sampling.sr) < 90 ? 2 : 0;
      const fcrPenalty = toFiniteNumber(item.sampling.fcr) > 1.5 ? 2 : 0;
      return lowGrowthPenalty + survivalPenalty + fcrPenalty;
    };
    return score(b) - score(a);
  })[0];

  const executiveSummary = [
    `The report covers ${latestSamplings.length} sampled pond${latestSamplings.length === 1 ? '' : 's'} out of ${ponds.length} selected pond${ponds.length === 1 ? '' : 's'}. Average ABW/MBW is ${formatNumber(avgABW)} g, average ADG is ${formatNumber(avgADG, 2)} g/day, average survival is ${formatNumber(avgSR, 0)}%, and average FCR is ${formatNumber(avgFCR, 2)}.`,
    avgADG >= 0.25
      ? 'Growth performance is currently strong based on the latest sampled records.'
      : avgADG >= 0.15
        ? 'Growth performance is within a normal operating range, but should be checked against the next sampling round.'
        : 'Growth performance requires attention because average daily growth is below the expected operating range.',
  ];

  if (midcyclePonds.length > 0) {
    executiveSummary.push(`${midcyclePonds.length} pond${midcyclePonds.length === 1 ? ' was' : 's were'} onboarded mid-cycle. Pre-onboarding feed, survival, and biomass values are user-provided estimates and should be treated as baseline assumptions.`);
  }

  if (bestPond) {
    executiveSummary.push(`${bestPond.pond.pondNumber} is currently the strongest pond based on latest ADG, survival rate, and FCR balance.`);
  }

  if (weakestPond && (highRiskPonds.length > 0 || moderateRiskPonds.length > 0)) {
    executiveSummary.push(`${weakestPond.pond.pondNumber} should be reviewed first because its latest growth, survival, or FCR indicators are weaker than the rest of the selected ponds.`);
  }

  const riskAssessment = [
    highRiskPonds.length > 0
      ? `${highRiskPonds.length} pond${highRiskPonds.length === 1 ? '' : 's'} show high-risk indicators such as low survival, elevated FCR, flat growth, or high mortality.`
      : 'No high-risk pond indicators were detected from the latest sampling records.',
    moderateRiskPonds.length > 0
      ? `${moderateRiskPonds.length} pond${moderateRiskPonds.length === 1 ? '' : 's'} should remain under watch because one or more indicators are outside the preferred range.`
      : 'No moderate-risk growth or feed-efficiency warnings were detected from the latest sampling records.',
    'Biomass, FCR, and survival values should be treated as operational estimates until confirmed by consistent sampling and harvest records.',
    incompleteFeedHistory
      ? 'Average FCR is unusually low for shrimp production. This usually means feed history is incomplete or the report is only seeing partial feed records, so FCR should not be used as a final efficiency result yet.'
      : 'Recorded feed history is sufficient for a basic FCR estimate, but it should still be reconciled against inventory and feeding logs.',
    midcyclePonds.length > 0
      ? 'For mid-cycle onboarded ponds, compare future Shrimply-tracked sampling records against the baseline before making strong conclusions about historical growth trends.'
      : 'No mid-cycle baseline assumptions were detected in the selected ponds.',
  ];

  return { executiveSummary, riskAssessment };
};

const generateGrowthChartSvg = (ponds: PondData[]): string => {
  const colors = ['#0F4C75', '#27AE60', '#E74C3C', '#F39C12', '#7C3AED', '#34495E', '#16A085', '#D35400'];
  const series = ponds.map((pond, index) => ({
    label: pond.pondNumber,
    color: colors[index % colors.length],
    points: pond.samplingHistory
      .map((sampling) => ({ x: toFiniteNumber(sampling.doc), y: getSamplingWeight(sampling) }))
      .filter((point) => point.x > 0 && point.y > 0),
  }));
  const allPoints = series.flatMap((item) => item.points);
  const width = 760;
  const height = 165;
  const chartLeft = 58;
  const chartRight = 18;
  const chartTop = 24;
  const chartBottom = 38;
  const chartWidth = width - chartLeft - chartRight;
  const chartHeight = height - chartTop - chartBottom;

  if (allPoints.length === 0) {
    return `
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="${width}" height="${height}" rx="0" fill="#ffffff" fill-opacity="0.52" stroke="none" />
        <text x="${width / 2}" y="80" text-anchor="middle" font-family="Arial" font-size="13" font-weight="700" fill="#64748B">No valid MBW sampling points available</text>
      </svg>
    `;
  }

  const minDoc = Math.min(...allPoints.map((point) => point.x));
  const maxDoc = Math.max(...allPoints.map((point) => point.x));
  const minWeight = Math.min(...allPoints.map((point) => point.y));
  const maxWeight = Math.max(...allPoints.map((point) => point.y));
  const xMin = Math.max(0, minDoc - 1);
  const xMax = maxDoc === xMin ? xMin + 1 : maxDoc + 1;
  const yMin = Math.max(0, minWeight - 0.5);
  const yMax = maxWeight === yMin ? yMin + 1 : maxWeight + 0.5;
  const xScale = (value: number) => chartLeft + ((value - xMin) / (xMax - xMin)) * chartWidth;
  const yScale = (value: number) => chartTop + chartHeight - ((value - yMin) / (yMax - yMin)) * chartHeight;
  const xTicks = Array.from({ length: 5 }, (_, index) => xMin + ((xMax - xMin) * index) / 4);
  const yTicks = Array.from({ length: 4 }, (_, index) => yMin + ((yMax - yMin) * index) / 3);

  const grid = [
    ...xTicks.map((tick) => {
      const x = xScale(tick);
      return `<line x1="${x}" y1="${chartTop}" x2="${x}" y2="${chartTop + chartHeight}" stroke="#E5E7EB" stroke-width="1" />`;
    }),
    ...yTicks.map((tick) => {
      const y = yScale(tick);
      return `<line x1="${chartLeft}" y1="${y}" x2="${chartLeft + chartWidth}" y2="${y}" stroke="#E5E7EB" stroke-width="1" />`;
    }),
  ].join('');

  const labels = [
    ...xTicks.map((tick) => `<text x="${xScale(tick)}" y="${height - 18}" text-anchor="middle" font-family="Arial" font-size="9" fill="#64748B">${formatNumber(tick, 0)}</text>`),
    ...yTicks.map((tick) => `<text x="${chartLeft - 8}" y="${yScale(tick) + 3}" text-anchor="end" font-family="Arial" font-size="9" fill="#64748B">${formatNumber(tick, 1)}</text>`),
  ].join('');

  const lines = series.map((item) => {
    const points = item.points.map((point) => `${xScale(point.x)},${yScale(point.y)}`).join(' ');
    const circles = item.points.map((point) => `<circle cx="${xScale(point.x)}" cy="${yScale(point.y)}" r="3" fill="#ffffff" stroke="${item.color}" stroke-width="2" />`).join('');
    return `${points ? `<polyline points="${points}" fill="none" stroke="${item.color}" stroke-width="2" />` : ''}${circles}`;
  }).join('');

  const legend = series.map((item, index) => {
    const x = chartLeft + index * 72;
    return `<rect x="${x}" y="${height - 11}" width="12" height="5" fill="${item.color}" /><text x="${x + 16}" y="${height - 6}" font-family="Arial" font-size="8" fill="#475569">${escapeXml(item.label)}</text>`;
  }).join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${width}" height="${height}" rx="0" fill="#ffffff" fill-opacity="0.52" stroke="none" />
      <text x="${width / 2}" y="15" text-anchor="middle" font-family="Arial" font-size="12" font-weight="700" fill="#64748B">Growth Trajectory (MBW by DOC)</text>
      ${grid}
      <line x1="${chartLeft}" y1="${chartTop + chartHeight}" x2="${chartLeft + chartWidth}" y2="${chartTop + chartHeight}" stroke="#CBD5E1" stroke-width="1" />
      <line x1="${chartLeft}" y1="${chartTop}" x2="${chartLeft}" y2="${chartTop + chartHeight}" stroke="#CBD5E1" stroke-width="1" />
      ${labels}
      ${lines}
      ${legend}
      <text x="${width / 2}" y="${height - 2}" text-anchor="middle" font-family="Arial" font-size="8" fill="#64748B">Days of Culture (DOC)</text>
      <text x="13" y="${chartTop + chartHeight / 2}" text-anchor="middle" font-family="Arial" font-size="8" fill="#64748B" transform="rotate(-90 13 ${chartTop + chartHeight / 2})">MBW (g)</text>
    </svg>
  `;
};

const generateSamplingReportHTML = (data: SamplingReportData, brandAssets: PdfBrandAssets): string => {
  const {
    farmName,
    block,
    technician,
    reportDate,
    reportPeriod,
    companyName,
    ponds,
  } = data;

  const averages = calculateAverages(ponds);
  const reportAnalysis = getReportAnalysis(ponds);
  const midcyclePonds = ponds.filter((pond) => pond.isMidcycleBaseline);
  const generatedAt = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const renderHeader = (title = 'Sampling Report') => `
    <div class="header">
      <div class="header-main">
        <div class="title">${title}</div>
        <div class="farm-info"><strong>Farm:</strong> ${farmName} - ${block}</div>
        <div class="farm-info"><strong>Technician:</strong> ${technician}</div>
        <div class="farm-info"><strong>Company:</strong> ${companyName}</div>
        <div class="subtitle">Report Period: ${reportPeriod} | Generated: ${formatDate(reportDate)}</div>
      </div>
      <img class="header-logo" src="data:image/png;base64,${brandAssets.logoBase64}" alt="Shrimply" />
    </div>
    <div class="divider"></div>
  `;

  const renderFooter = (pageNumber: number, pageCount: number) => `
    <div class="footer">
      <span>Generated by Shrimply Aquaculture Management on ${generatedAt} | ${companyName}</span>
      <span>Page ${pageNumber} of ${pageCount}</span>
    </div>
  `;

  const pondRows = ponds.map((pond, index) => {
    const latestSampling = pond.samplingHistory[pond.samplingHistory.length - 1];
    const previousABW = getPreviousABW(pond);
    const latestWeight = getSamplingWeight(latestSampling);
    const totalMortality = pond.samplingHistory.reduce((sum, s) => sum + toFiniteNumber(s.mortality), 0);
    const initialStock = toFiniteNumber(pond.initialStock);
    const totalMortalityPct = initialStock > 0 ? (totalMortality / initialStock) * 100 : 0;
    const sr = toFiniteNumber(latestSampling?.sr);
    const fcr = toFiniteNumber(latestSampling?.fcr);

    return `
      <tr class="${index % 2 === 0 ? 'row-alt' : ''}">
        <td class="strong">${pond.pondNumber}</td>
        <td>${formatShortDate(pond.stockingDate)}</td>
        <td>${latestSampling ? formatNumber(toFiniteNumber(latestSampling.doc), 0) : '-'}</td>
        <td>${formatCompactNumber(toFiniteNumber(pond.area), 0)}</td>
        <td>${formatCompactNumber(initialStock, 0)}</td>
        <td>${formatNumber(toFiniteNumber(pond.density), 0)}</td>
        <td>${previousABW > 0 ? formatNumber(previousABW) : '-'}</td>
        <td class="strong">${latestWeight > 0 ? formatNumber(latestWeight) : '-'}</td>
        <td>${formatOptionalNumber(latestSampling ? toFiniteNumber(latestSampling.adg) : undefined, 2)}</td>
        <td>${formatOptionalNumber(latestSampling ? toFiniteNumber(latestSampling.size) : undefined, 0)}</td>
        <td class="${sr >= 90 ? 'good' : sr >= 80 ? 'watch' : 'bad'}">${latestSampling ? `${formatNumber(sr, 0)}%` : '-'}</td>
        <td>${formatCompactNumber(toFiniteNumber(latestSampling?.biomass), 0)}</td>
        <td>${formatCompactNumber(toFiniteNumber(latestSampling?.feedCumulative), 1)}</td>
        <td class="${fcr < 0.5 ? 'watch' : fcr <= 1.5 ? 'good' : 'bad'}">${latestSampling ? formatNumber(fcr, 2) : '-'}</td>
        <td>${formatCompactNumber(totalMortality, 0)}</td>
        <td>${formatNumber(totalMortalityPct, 2)}%</td>
      </tr>
    `;
  }).join('');

  const labRows = ponds
    .filter((pond) => pond.latestLabStatus)
    .map((pond) => {
      const lab = pond.latestLabStatus;
      const status = lab?.status === 'info' ? 'good' : lab?.status || 'good';
      const riskText = (lab?.keyRisks || []).slice(0, 2).join('; ') || lab?.mainIssue || 'No warning-level issue detected';
      const recommendation = (lab?.recommendations || [])[0] || 'Continue routine monitoring and compare against the next lab result.';
      return `
        <tr>
          <td class="strong">${escapeXml(pond.pondNumber)}</td>
          <td>${lab?.sampleDate ? formatShortDate(lab.sampleDate) : '-'}</td>
          <td class="${status === 'critical' ? 'bad' : status === 'warning' || status === 'watch' ? 'watch' : 'good'}">${status.toUpperCase()}</td>
          <td>${escapeXml(lab?.mainIssue || 'Lab result reviewed')}</td>
          <td>${escapeXml(riskText)}</td>
          <td>${escapeXml(recommendation)}</td>
        </tr>
      `;
    }).join('');

  const labAnalysisSection = labRows
    ? `
      <div class="lab-section">
        <div class="analysis-title">Latest Lab Analysis</div>
        <table class="lab-table">
          <thead>
            <tr><th>Pond</th><th>Date</th><th>Status</th><th>Main Issue</th><th>Risks</th><th>Recommended Action</th></tr>
          </thead>
          <tbody>${labRows}</tbody>
        </table>
      </div>
    `
    : `
      <div class="lab-section">
        <div class="analysis-title">Latest Lab Analysis</div>
        <div class="data-quality">No confirmed lab analysis was attached to the selected ponds at export time. This report only reflects operational sampling, feed, mortality, and water quality logs.</div>
      </div>
    `;

  const midcycleNote = midcyclePonds.length > 0
    ? `<br/><strong>Data Quality:</strong> ${midcyclePonds.map((pond) => `${pond.pondNumber}${pond.baselineDate ? ` baseline ${formatDate(pond.baselineDate)}` : ''}`).join(', ')} ${midcyclePonds.length === 1 ? 'was' : 'were'} onboarded mid-cycle. Pre-onboarding values are estimates, not exact historical logs.`
    : '';

  const lowFcrNote = averages.totalFeed > 0 && averages.avgFCR < 0.5
    ? '<br/><strong>FCR Note:</strong> Average FCR is unusually low, which usually means feed history is incomplete or only partial feed records are available.'
    : '';
  const chartSvg = generateGrowthChartSvg(ponds);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=1000, initial-scale=1.0, maximum-scale=1.0">
      <title>Sampling Report</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: 792px 612px; margin: 0; }
        html {
          width: 100%;
          height: 100%;
        }
        body {
          margin: 0;
          width: 100%;
          height: 100%;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #1B262C;
          background: #0F4C75;
          font-size: 8px;
          line-height: 1.2;
        }
        .pdf-page {
          width: 100%;
          height: 100%;
          padding: 26px 36px 26px 26px;
          position: relative;
          overflow: hidden;
          background: #0F4C75;
          page-break-after: always;
        }
        .page-bg {
          position: absolute;
          left: -18px;
          top: -18px;
          width: calc(100% + 36px);
          height: calc(100% + 36px);
          object-fit: cover;
          z-index: 0;
        }
        .pdf-page:last-child { page-break-after: auto; }
        .report-shell {
          position: relative;
          z-index: 1;
          height: 100%;
          padding: 0;
          display: flex;
          flex-direction: column;
          background: transparent;
          border: 0;
          border-radius: 0;
        }
        .header { display: flex; justify-content: space-between; gap: 14px; margin-bottom: 8px; }
        .header-main { flex: 1; }
        .header-logo { width: 62px; height: 62px; object-fit: contain; }
        .title { font-size: 20px; font-weight: 800; color: #0F4C75; margin-bottom: 3px; }
        .farm-info { font-size: 9px; color: #1B262C; margin-bottom: 1px; }
        .farm-info strong { color: #0F4C75; }
        .subtitle { font-size: 8px; color: #4A5568; }
        .divider { height: 2px; background: linear-gradient(to right, #0F4C75, #3282B8); margin: 7px 0 9px; border-radius: 2px; }
        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; margin-bottom: 8px; }
        .summary-card { background: transparent; border-left: 3px solid #0F4C75; padding: 5px 7px; border-radius: 0; }
        .summary-label { font-size: 7px; color: #4A5568; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 2px; }
        .summary-value { font-size: 13px; font-weight: 800; color: #26384A; }
        .summary-unit { font-size: 7px; color: #4A5568; margin-left: 2px; }
        .table-container { width: 100%; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; background: transparent; table-layout: fixed; box-shadow: none; }
        th { background: rgba(15, 76, 117, 0.90); color: white; padding: 4px 2px; text-align: center; font-size: 5.8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1px; border-right: 1px solid rgba(255,255,255,0.22); line-height: 1.05; }
        td { padding: 5px 2px; text-align: center; font-size: 7px; color: #26384A; border-bottom: 1px solid rgba(15, 76, 117, 0.18); white-space: nowrap; font-variant-numeric: tabular-nums; background: rgba(255, 255, 255, 0.50); }
        .row-alt td { background: rgba(255, 255, 255, 0.64); }
        .strong { font-weight: 800; }
        .good { color: #2D7A4F; font-weight: 800; }
        .watch { color: #B45309; font-weight: 800; }
        .bad { color: #C0392B; font-weight: 800; }
        .totals-row td { background: rgba(232, 244, 248, 0.74); font-weight: 800; border-top: 2px solid #0F4C75; border-bottom: 1px solid #0F4C75; }
        .chart-panel { padding: 0; background: transparent; border: 0; border-radius: 0; margin-bottom: 8px; }
        .panel-title { font-size: 11px; font-weight: 800; color: #0F4C75; margin-bottom: 5px; }
        .chart-svg { width: 100%; height: 128px; border-radius: 0; background: transparent; }
        .indicator-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 5px; }
        .indicator { display: flex; justify-content: space-between; align-items: center; gap: 4px; padding: 5px; background: transparent; border-radius: 0; border-left: 2px solid #0F4C75; }
        .indicator-label { font-size: 7px; color: #4A5568; }
        .indicator-value { font-size: 8px; font-weight: 800; color: #0F4C75; text-align: right; }
        .notes { margin-top: 8px; padding: 7px; background: transparent; border-left: 3px solid #F59E0B; border-radius: 0; font-size: 6.6px; color: #92400E; line-height: 1.25; }
        .notes-title { font-weight: 800; margin-bottom: 3px; color: #B45309; }
        .analysis-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
        .analysis-box { min-height: 104px; padding: 11px; background: rgba(255, 255, 255, 0.52); border-radius: 0; border: 0; border-left: 4px solid #0F4C75; }
        .analysis-box.risk { background: rgba(255, 255, 255, 0.52); border-left-color: #F59E0B; }
        .analysis-title { font-size: 12px; font-weight: 800; color: #0F4C75; margin-bottom: 7px; }
        .analysis-box.risk .analysis-title { color: #B45309; }
        .analysis-list { margin-left: 13px; font-size: 8px; color: #26384A; line-height: 1.35; }
        .analysis-list li { margin-bottom: 5px; }
        .lab-section { margin-top: 10px; padding: 9px; background: rgba(255, 255, 255, 0.52); border-left: 4px solid #3282B8; }
        .lab-table { margin-top: 7px; }
        .lab-table th { font-size: 7px; }
        .lab-table td { font-size: 6.5px; white-space: normal; line-height: 1.25; text-align: left; padding: 4px; }
        .data-quality { margin-top: 10px; padding: 9px; background: rgba(255, 255, 255, 0.42); border: 0; border-radius: 0; color: #26384A; font-size: 8px; line-height: 1.35; }
        .footer { margin-top: auto; padding-top: 7px; border-top: 1px solid rgba(15, 76, 117, 0.18); display: flex; justify-content: space-between; gap: 10px; color: #4A5568; font-size: 7px; }
      </style>
    </head>
    <body>
      <div class="pdf-page">
        <img class="page-bg" src="data:image/png;base64,${brandAssets.backgroundBase64}" alt="" />
        <div class="report-shell">
          ${renderHeader()}
          <div class="summary-grid">
            <div class="summary-card"><div class="summary-label">Avg Body Weight</div><div class="summary-value">${formatNumber(averages.avgABW)}<span class="summary-unit">g</span></div></div>
            <div class="summary-card"><div class="summary-label">Avg Daily Growth</div><div class="summary-value">${formatNumber(averages.avgADG, 2)}<span class="summary-unit">g/day</span></div></div>
            <div class="summary-card"><div class="summary-label">Avg Size</div><div class="summary-value">${formatNumber(averages.avgSize, 0)}<span class="summary-unit">pcs/kg</span></div></div>
            <div class="summary-card"><div class="summary-label">Avg Survival Rate</div><div class="summary-value">${formatNumber(averages.avgSR, 0)}<span class="summary-unit">%</span></div></div>
          </div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Pond</th><th>Stock<br/>Date</th><th>DOC</th><th>Area<br/>m2</th><th>Stock</th><th>Dens.</th><th>Prev<br/>MBW</th><th>MBW</th><th>ADG</th><th>Size</th><th>SR</th><th>Bio</th><th>Feed</th><th>FCR</th><th>Mort</th><th>Mort %</th>
                </tr>
              </thead>
              <tbody>
                ${pondRows}
                <tr class="totals-row">
                  <td colspan="4">Totals / Averages</td>
                  <td>${formatCompactNumber(ponds.reduce((sum, p) => sum + toFiniteNumber(p.initialStock), 0), 0)}</td>
                  <td>${formatNumber(averages.avgDensity, 0)}</td>
                  <td>${averages.avgPrevABW > 0 ? formatNumber(averages.avgPrevABW) : '-'}</td>
                  <td>${formatNumber(averages.avgABW)}</td>
                  <td>${formatNumber(averages.avgADG, 2)}</td>
                  <td>${formatNumber(averages.avgSize, 0)}</td>
                  <td>${formatNumber(averages.avgSR, 0)}%</td>
                  <td>${formatCompactNumber(averages.totalBiomass, 0)}</td>
                  <td>${formatCompactNumber(averages.totalFeed, 1)}</td>
                  <td>${formatNumber(averages.avgFCR, 2)}</td>
                  <td colspan="2">-</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="chart-panel">
            <div class="panel-title">Growth Chart</div>
            <div class="chart-svg">${chartSvg}</div>
          </div>
          <div class="chart-panel">
            <div class="panel-title">Performance Indicators</div>
            <div class="indicator-grid">
              <div class="indicator"><span class="indicator-label">Biomass</span><span class="indicator-value">${formatCompactNumber(averages.totalBiomass, 1)} kg</span></div>
              <div class="indicator"><span class="indicator-label">Feed</span><span class="indicator-value">${formatCompactNumber(averages.totalFeed, 1)} kg</span></div>
              <div class="indicator"><span class="indicator-label">Avg FCR</span><span class="indicator-value">${formatNumber(averages.avgFCR, 2)}</span></div>
              <div class="indicator"><span class="indicator-label">Ponds</span><span class="indicator-value">${ponds.length}</span></div>
              <div class="indicator"><span class="indicator-label">Area</span><span class="indicator-value">${formatCompactNumber(ponds.reduce((sum, p) => sum + toFiniteNumber(p.area), 0), 0)} m2</span></div>
              <div class="indicator"><span class="indicator-label">Stock</span><span class="indicator-value">${formatCompactNumber(ponds.reduce((sum, p) => sum + toFiniteNumber(p.initialStock), 0), 0)}</span></div>
            </div>
          </div>
          <div class="notes">
            <div class="notes-title">Legend & Data Notes</div>
            MBW and ABW refer to the same average shrimp weight value in this report. DOC = Days of Culture | ADG = Average Daily Growth | SR = Survival Rate | FCR = Feed Conversion Ratio.
            ${midcycleNote}${lowFcrNote}
          </div>
          ${renderFooter(1, 2)}
        </div>
      </div>
      <div class="pdf-page">
        <img class="page-bg" src="data:image/png;base64,${brandAssets.backgroundBase64}" alt="" />
        <div class="report-shell">
          ${renderHeader('Sampling Report Analysis')}
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
          </div>
          <div class="data-quality">
            <strong>Assumptions and Data Quality:</strong> Biomass, survival, and FCR are calculated from the sampling and feed records available at export time. If feed history is incomplete, FCR can appear unrealistically low. Use this report as an operational snapshot and reconcile it against feeding logs, inventory deductions, and harvest records before final cycle decisions.
          </div>
          ${labAnalysisSection}
          ${renderFooter(2, 2)}
        </div>
      </div>
    </body>
    </html>
  `;
};

export const exportSamplingReportPDF = async (data: SamplingReportData) => {
  try {
    const brandAssets = await loadSamplingReportBrandAssets();
    const html = generateSamplingReportHTML(data, brandAssets);
    
    const { uri } = await Print.printToFileAsync({
      html,
      textZoom: 100,
      width: 792,
      height: 612,
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
    const pondNames = data.ponds.map(p => p.pondNumber).join('_').substring(0, 20);
    const safeFarmName = data.farmName.replace(/[^a-zA-Z0-9]/g, '');
    const filename = `SamplingReport_${safeFarmName}_${pondNames}_${cleanDate}.pdf`;
    
    const newUri = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.copyAsync({
      from: uri,
      to: newUri
    });
    
    const canShare = await Sharing.isAvailableAsync();
    
    if (canShare) {
      await Sharing.shareAsync(newUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Shrimp Sampling Report',
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert(
        'PDF Generated',
        `Your sampling report has been saved to: ${newUri}`,
        [{ text: 'OK' }]
      );
    }
    
    return newUri;
  } catch (error) {
    console.error('Error generating shrimp PDF:', error);
    Alert.alert('Error', 'Failed to generate sampling report PDF');
    throw error;
  }
};

export const prepareSamplingReportData = (
  farmName: string,
  block: string,
  technician: string,
  reportDate: string,
  reportPeriod: string,
  companyName: string,
  ponds: PondData[]
): SamplingReportData => {
  return {
    farmName,
    block,
    technician,
    reportDate,
    reportPeriod,
    companyName,
    ponds,
  };
};
