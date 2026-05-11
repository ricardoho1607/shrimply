// services/samplingReportExportService.ts
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';

interface SamplingData {
  samplingNumber: number;
  samplingDate: string;
  doc: number; // Days of Culture
  abw: number; // Average Body Weight
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

const formatNumber = (num: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

const calculateAverages = (ponds: PondData[]) => {
  const latestSamplings = ponds.map(pond => 
    pond.samplingHistory[pond.samplingHistory.length - 1]
  );

  const totalPonds = ponds.length;
  const avgABW = latestSamplings.reduce((sum, s) => sum + s.abw, 0) / totalPonds;
  const avgADG = latestSamplings.reduce((sum, s) => sum + s.adg, 0) / totalPonds;
  const avgSize = latestSamplings.reduce((sum, s) => sum + s.size, 0) / totalPonds;
  const avgSR = latestSamplings.reduce((sum, s) => sum + s.sr, 0) / totalPonds;
  const avgFCR = latestSamplings.reduce((sum, s) => sum + s.fcr, 0) / totalPonds;
  const totalBiomass = latestSamplings.reduce((sum, s) => sum + s.biomass, 0);
  const totalFeed = latestSamplings.reduce((sum, s) => sum + s.feedCumulative, 0);
  const avgDensity = ponds.reduce((sum, p) => sum + p.density, 0) / totalPonds;
  
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
  return pond.samplingHistory[pond.samplingHistory.length - 2].abw;
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

  const avgABW = latestSamplings.reduce((sum, item) => sum + item.sampling.abw, 0) / latestSamplings.length;
  const avgADG = latestSamplings.reduce((sum, item) => sum + item.sampling.adg, 0) / latestSamplings.length;
  const avgSR = latestSamplings.reduce((sum, item) => sum + item.sampling.sr, 0) / latestSamplings.length;
  const avgFCR = latestSamplings.reduce((sum, item) => sum + item.sampling.fcr, 0) / latestSamplings.length;
  const highRiskPonds = latestSamplings.filter(({ pond, sampling }) => {
    const totalMortality = pond.samplingHistory.reduce((sum, s) => sum + s.mortality, 0);
    const mortalityPct = pond.initialStock > 0 ? (totalMortality / pond.initialStock) * 100 : 0;
    return sampling.abw <= 0 || sampling.adg <= 0 || sampling.sr < 80 || sampling.fcr > 1.8 || mortalityPct > 15;
  });
  const moderateRiskPonds = latestSamplings.filter(({ sampling }) => {
    return sampling.adg < 0.15 || sampling.sr < 90 || sampling.fcr > 1.5;
  });

  const bestPond = [...latestSamplings].sort((a, b) => {
    const score = (item: { sampling: SamplingData }) => (item.sampling.adg * 4) + (item.sampling.sr / 20) - item.sampling.fcr;
    return score(b) - score(a);
  })[0];

  const weakestPond = [...latestSamplings].sort((a, b) => {
    const score = (item: { sampling: SamplingData }) => {
      const lowGrowthPenalty = item.sampling.adg < 0.15 ? 2 : 0;
      const survivalPenalty = item.sampling.sr < 90 ? 2 : 0;
      const fcrPenalty = item.sampling.fcr > 1.5 ? 2 : 0;
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
  ];

  return { executiveSummary, riskAssessment };
};

const generateChartUrl = (ponds: PondData[]): string => {
  const colors = ['#0066CC', '#27AE60', '#E74C3C', '#F39C12', '#9B59B6', '#34495E', '#16A085', '#D35400'];
  
  const datasets = ponds.map((pond, index) => {
    return {
      label: pond.pondNumber,
      borderColor: colors[index % colors.length],
      backgroundColor: 'transparent',
      data: pond.samplingHistory.map(s => ({ x: s.doc, y: s.abw })),
      fill: false,
      showLine: true,
      tension: 0.3,
      borderWidth: 2,
      pointRadius: 3
    };
  });

  const chartConfig = {
    type: 'scatter',
    data: { datasets },
    options: {
      title: { display: true, text: 'Growth Trajectory (ABW by DOC)', fontSize: 16 },
      legend: { position: 'bottom' },
      scales: {
        xAxes: [{ 
          type: 'linear', 
          position: 'bottom',
          scaleLabel: { display: true, labelString: 'Days of Culture (DOC)' }
        }],
        yAxes: [{ 
          scaleLabel: { display: true, labelString: 'Average Body Weight (g)' }
        }]
      }
    }
  };

  const encodedConfig = encodeURIComponent(JSON.stringify(chartConfig));
  return `https://quickchart.io/chart?c=${encodedConfig}&w=800&h=300&bkg=white&devicePixelRatio=2.0`;
};

const generateSamplingReportHTML = (data: SamplingReportData): string => {
  const { 
    farmName, 
    block, 
    technician, 
    reportDate, 
    reportPeriod,
    companyName, 
    ponds 
  } = data;

  const averages = calculateAverages(ponds);
  const reportAnalysis = getReportAnalysis(ponds);

  // Generate pond rows
  const pondRows = ponds.map((pond, index) => {
    const latestSampling = pond.samplingHistory[pond.samplingHistory.length - 1];
    const previousABW = getPreviousABW(pond);
    const totalMortality = pond.samplingHistory.reduce((sum, s) => sum + s.mortality, 0);
    const totalMortalityPct = (totalMortality / pond.initialStock) * 100;

    return `
      <tr style="${index % 2 === 0 ? 'background-color: #F8FAFB;' : ''}">
        <td style="padding: 12px 4px; text-align: center; border-bottom: 1px solid #E5E7EB;">${pond.pondNumber}</td>
        <td style="padding: 12px 4px; text-align: center; border-bottom: 1px solid #E5E7EB;">${formatDate(pond.stockingDate)}</td>
        <td style="padding: 12px 4px; text-align: center; border-bottom: 1px solid #E5E7EB;">${latestSampling.doc}</td>
        <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #E5E7EB;">${formatNumber(pond.area, 0)}</td>
        <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #E5E7EB;">${formatNumber(pond.initialStock, 0)}</td>
        <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #E5E7EB;">${formatNumber(pond.density, 0)}</td>
        <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #E5E7EB; color: #2C3E50;">${previousABW > 0 ? formatNumber(previousABW) : '-'}</td>
        <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #E5E7EB; font-weight: 600;">${formatNumber(latestSampling.abw)}</td>
        <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #E5E7EB;">${formatNumber(latestSampling.adg, 2)}</td>
        <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #E5E7EB;">${formatNumber(latestSampling.size, 0)}</td>
        <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #E5E7EB; color: ${latestSampling.sr >= 90 ? '#2D7A4F' : latestSampling.sr >= 80 ? '#D68910' : '#C0392B'}; font-weight: 600;">${formatNumber(latestSampling.sr, 0)}%</td>
        <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #E5E7EB;">${formatNumber(latestSampling.biomass, 0)}</td>
        <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #E5E7EB;">${formatNumber(latestSampling.feedCumulative, 2)}</td>
        <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #E5E7EB; color: ${latestSampling.fcr <= 1.3 ? '#2D7A4F' : latestSampling.fcr <= 1.5 ? '#D68910' : '#C0392B'}; font-weight: 600;">${formatNumber(latestSampling.fcr, 2)}</td>
        <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #E5E7EB;">${formatNumber(totalMortality, 0)}</td>
        <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #E5E7EB;">${formatNumber(totalMortalityPct, 2)}%</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sampling Report</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: landscape; margin: 10mm; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
          padding: 15px; 
          color: #2C3E50; 
          background: #ffffff; 
          font-size: 9px; 
          line-height: 1.2; 
        }
        .header { margin-bottom: 12px; }
        .title { font-size: 20px; font-weight: 700; color: #0066CC; margin-bottom: 4px; }
        .farm-info { font-size: 10px; color: #2C3E50; margin-bottom: 2px; }
        .farm-info strong { color: #0066CC; }
        .subtitle { font-size: 9px; color: #4A5568; }
        .divider { height: 2px; background: linear-gradient(to right, #0066CC, #0099FF); margin: 10px 0; border-radius: 2px; }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin: 12px 0;
        }
        .summary-card {
          background: #F8FAFB;
          border-left: 3px solid #0066CC;
          padding: 8px;
          border-radius: 3px;
        }
        .summary-label {
          font-size: 8px;
          color: #4A5568;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin-bottom: 2px;
        }
        .summary-value {
          font-size: 14px;
          font-weight: 700;
          color: #2C3E50;
        }
        .summary-unit {
          font-size: 8px;
          color: #4A5568;
          margin-left: 2px;
        }
        
        .table-container {
          overflow-x: visible;
          margin: 12px 0;
          width: 100%;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          font-size: 8px;
          table-layout: fixed;
        }
        th {
          background: linear-gradient(to bottom, #0066CC, #0052A3);
          color: white;
          padding: 6px 2px;
          text-align: center;
          font-size: 7px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.2px;
          border-right: 1px solid rgba(255,255,255,0.2);
          line-height: 1.1;
          word-wrap: break-word;
        }
        th:last-child {
          border-right: none;
        }
        td {
          font-size: 8px;
          padding: 5px 2px;
          text-align: center;
          word-wrap: break-word;
        }
        
        .col-pond { width: 4%; }
        .col-date { width: 6%; }
        .col-doc { width: 3%; }
        .col-area { width: 5%; }
        .col-stock { width: 6%; }
        .col-density { width: 5%; }
        .col-prev-abw { width: 5%; }
        .col-abw { width: 5%; }
        .col-adg { width: 5%; }
        .col-size { width: 6%; }
        .col-sr { width: 5%; }
        .col-biomass { width: 6%; }
        .col-feed { width: 7%; }
        .col-fcr { width: 5%; }
        .col-mort { width: 6%; }
        .col-mort-pct { width: 5%; }
        
        .totals-row {
          background: #E8F4F8 !important;
          font-weight: 700;
          border-top: 2px solid #0066CC !important;
        }
        
        .performance-indicators {
          margin: 12px 0;
          padding: 10px;
          background: #F0F8FF;
          border-radius: 5px;
          border: 1px solid #dbe7df;
        }
        .performance-title {
          font-size: 11px;
          font-weight: 700;
          color: #0066CC;
          margin-bottom: 6px;
        }
        .indicator-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 6px;
        }
        .indicator {
          display: flex;
          justify-content: space-between;
          padding: 5px;
          background: white;
          border-radius: 3px;
          border-left: 2px solid #0066CC;
        }
        .indicator-label {
          font-size: 8px;
          color: #4A5568;
        }
        .indicator-value {
          font-size: 9px;
          font-weight: 600;
          color: #0066CC;
        }
        
        .footer { 
          margin-top: 15px; 
          padding-top: 10px; 
          border-top: 2px solid #ECF0F1; 
          font-size: 7px; 
          color: #4A5568; 
          text-align: center; 
        }
        
        .notes {
          margin-top: 12px;
          padding: 8px;
          background: #FFFBEA;
          border-left: 3px solid #F59E0B;
          border-radius: 3px;
          font-size: 7px;
          color: #92400E;
          line-height: 1.3;
        }
        .notes-title {
          font-weight: 700;
          margin-bottom: 3px;
          color: #B45309;
        }
        .analysis-section {
          page-break-before: always;
          break-before: page;
          page-break-inside: avoid;
          break-inside: avoid;
          margin-top: 0;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .analysis-box {
          page-break-inside: avoid;
          break-inside: avoid;
          min-height: 128px;
          padding: 9px 10px;
          background: #F8FAFB;
          border-radius: 5px;
          border: 1px solid #dbe7df;
          border-left: 3px solid #0066CC;
        }
        .analysis-box.risk {
          background: #FFFBEA;
          border-left-color: #F59E0B;
        }
        .analysis-title {
          font-size: 10px;
          font-weight: 700;
          color: #0066CC;
          margin-bottom: 4px;
        }
        .analysis-box.risk .analysis-title {
          color: #B45309;
        }
        .analysis-list {
          margin-left: 10px;
          font-size: 6.5px;
          color: #2C3E50;
          line-height: 1.25;
        }
        .analysis-list li {
          margin-bottom: 3px;
        }
        
        .line-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ECF0F1; }
        .line-item.category { font-weight: 600; color: #34495E; padding-left: 0; }
        .line-item.subcategory { color: #4A5568; padding-left: 20px; font-size: 13px; }
        .line-item.total { font-weight: 700; font-size: 15px; border-bottom: 2px solid #34495E; padding: 12px 0; margin-top: 8px; color: #2C3E50; }
        .line-item.net-profit { font-weight: 700; font-size: 16px; color: #2D7A4F; border-bottom: 3px double #2D7A4F; padding: 15px 0; margin-top: 15px; }
        .line-item.net-loss { font-weight: 700; font-size: 16px; color: #C0392B; border-bottom: 3px double #C0392B; padding: 15px 0; margin-top: 15px; }
        .amount { text-align: right; font-variant-numeric: tabular-nums; }
        .amount.positive { color: #2D7A4F; }
        .amount.negative { color: #C0392B; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">Sampling Report</div>
        <div class="farm-info"><strong>Farm:</strong> ${farmName} - ${block}</div>
        <div class="farm-info"><strong>Technician:</strong> ${technician}</div>
        <div class="farm-info"><strong>Company:</strong> ${companyName}</div>
        <div class="subtitle">Report Period: ${reportPeriod} | Generated: ${formatDate(reportDate)}</div>
      </div>
      
      <div class="divider"></div>
      
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-label">Avg Body Weight</div>
          <div class="summary-value">${formatNumber(averages.avgABW)}<span class="summary-unit">g</span></div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Avg Daily Growth</div>
          <div class="summary-value">${formatNumber(averages.avgADG, 2)}<span class="summary-unit">g/day</span></div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Avg Size</div>
          <div class="summary-value">${formatNumber(averages.avgSize, 0)}<span class="summary-unit">pcs/kg</span></div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Avg Survival Rate</div>
          <div class="summary-value">${formatNumber(averages.avgSR, 0)}<span class="summary-unit">%</span></div>
        </div>
      </div>
      
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th class="col-pond">Pond</th>
              <th class="col-date">Stock Date</th>
              <th class="col-doc">DOC</th>
              <th class="col-area">Area<br/>(m²)</th>
              <th class="col-stock">Stock<br/>(pcs)</th>
              <th class="col-density">Dens.<br/>(pcs/m²)</th>
              <th class="col-prev-abw">Prev<br/>ABW<br/>(g)</th>
              <th class="col-abw">ABW<br/>(g)</th>
              <th class="col-adg">ADG<br/>(g/d)</th>
              <th class="col-size">Size<br/>(pcs/kg)</th>
              <th class="col-sr">SR<br/>(%)</th>
              <th class="col-biomass">Bio<br/>(kg)</th>
              <th class="col-feed">Feed<br/>(kg)</th>
              <th class="col-fcr">FCR</th>
              <th class="col-mort">Mort<br/>(pcs)</th>
              <th class="col-mort-pct">Mort<br/>(%)</th>
            </tr>
          </thead>
          <tbody>
            ${pondRows}
            <tr class="totals-row">
              <td colspan="4" style="padding: 12px 4px; text-align: center; border-bottom: 1px solid #0066CC;">TOTALS / AVERAGES</td>
              <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #0066CC;">${formatNumber(ponds.reduce((sum, p) => sum + p.initialStock, 0), 0)}</td>
              <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #0066CC;">${formatNumber(averages.avgDensity, 0)}</td>
              <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #0066CC;">${averages.avgPrevABW > 0 ? formatNumber(averages.avgPrevABW) : '-'}</td>
              <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #0066CC;">${formatNumber(averages.avgABW)}</td>
              <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #0066CC;">${formatNumber(averages.avgADG, 2)}</td>
              <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #0066CC;">${formatNumber(averages.avgSize, 0)}</td>
              <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #0066CC;">${formatNumber(averages.avgSR, 0)}%</td>
              <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #0066CC;">${formatNumber(averages.totalBiomass, 0)}</td>
              <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #0066CC;">${formatNumber(averages.totalFeed, 2)}</td>
              <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #0066CC;">${formatNumber(averages.avgFCR, 2)}</td>
              <td colspan="2" style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #0066CC;">-</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div class="performance-indicators">
        <div class="performance-title">Growth Chart</div>
        <div style="width: 100%; text-align: center; margin-top: 10px;">
          <img src="${generateChartUrl(ponds)}" style="max-width: 100%; height: auto; border-radius: 4px; border: 1px solid #E5E7EB;" />
        </div>
      </div>
      
      <div class="performance-indicators">
        <div class="performance-title">Performance Indicators</div>
        <div class="indicator-grid">
          <div class="indicator">
            <span class="indicator-label">Total Biomass:</span>
            <span class="indicator-value">${formatNumber(averages.totalBiomass, 2)} kg</span>
          </div>
          <div class="indicator">
            <span class="indicator-label">Total Feed Used:</span>
            <span class="indicator-value">${formatNumber(averages.totalFeed, 2)} kg</span>
          </div>
          <div class="indicator">
            <span class="indicator-label">Average FCR:</span>
            <span class="indicator-value">${formatNumber(averages.avgFCR, 2)}</span>
          </div>
          <div class="indicator">
            <span class="indicator-label">Active Ponds:</span>
            <span class="indicator-value">${ponds.length}</span>
          </div>
          <div class="indicator">
            <span class="indicator-label">Total Area:</span>
            <span class="indicator-value">${formatNumber(ponds.reduce((sum, p) => sum + p.area, 0), 0)} m²</span>
          </div>
          <div class="indicator">
            <span class="indicator-label">Total Stock:</span>
            <span class="indicator-value">${formatNumber(ponds.reduce((sum, p) => sum + p.initialStock, 0), 0)} pcs</span>
          </div>
        </div>
      </div>
      
      <div class="notes">
        <div class="notes-title">Legend & Notes:</div>
        DOC = Days of Culture | ABW = Average Body Weight | Prev ABW = Previous Average Body Weight | ADG = Average Daily Growth | SR = Survival Rate | FCR = Feed Conversion Ratio
        <br/>
        <strong>Color Coding:</strong> Green = Excellent Performance | Orange = Moderate Performance | Red = Needs Attention
      </div>

      <div class="analysis-section">
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
      
      <div class="footer">
        Generated by Shrimply Aquaculture Management on ${new Date().toLocaleString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })} | ${companyName}
        <br/>
        This report contains confidential information. Unauthorized distribution is prohibited.
      </div>
    </body>
    </html>
  `;
};

export const exportSamplingReportPDF = async (data: SamplingReportData) => {
  try {
    const html = generateSamplingReportHTML(data);
    
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });
    
    // Create Custom Filename
    const cleanDate = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).replace(' ', '');
    const pondNames = data.ponds.map(p => p.pondNumber).join('_').substring(0, 20);
    const safeFarmName = data.farmName.replace(/[^a-zA-Z0-9]/g, '');
    const filename = `ShrimpReport_${safeFarmName}_${pondNames}_${cleanDate}.pdf`;
    
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
        `Your shrimp report has been saved to: ${newUri}`,
        [{ text: 'OK' }]
      );
    }
    
    return newUri;
  } catch (error) {
    console.error('Error generating shrimp PDF:', error);
    Alert.alert('Error', 'Failed to generate shrimp report PDF');
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
