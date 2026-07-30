"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Loader2, 
  Waves, 
  TrendingUp,
  Scale,
  Zap,
  Activity,
  Target
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useLanguage } from '@/contexts/LanguageContext';
import { filterActiveCyclePonds } from '@/lib/pondLifecycle';
import {
  DAY_MS,
  calculatePondMetricsWithHarvest,
  getSamplingMbw,
  isBaselineSampling,
  toFiniteNumber,
} from '../../../../../../shared/pondCalculations';
import {
  localizePdfHtml,
  type PdfLanguage,
} from '../../../../../../shared/pdfReportI18n';
import {
  buildSamplingGrowthMovementRows,
  renderSamplingGrowthMovementChartSvg,
} from '../../../../../../shared/samplingGrowthMovementChart';

/* --- Types --------------------------------------------------- */
interface Sampling {
  id: string;
  date: string;
  mbw?: number;
  abw?: number; // Mobile parity
  mortality?: number;
  feed?: number;
  feedData?: Record<string, unknown>;
  isBaselineEstimate?: boolean;
  source?: string;
  estimatedPopulation?: number;
  estimatedSurvivalRate?: number;
  cumulativeFeedToDate?: number;
}

interface Pond {
  id: string;
  pondName: string;
  docStart: string;
  pondArea?: number;
  area?: number; // Mobile parity
  initialPopulation?: number;
  initialStock?: number; // Mobile parity
  initialWeight?: number;
  density?: number;
  samplings: Sampling[];
  cycleId?: string;
  cycleStatus?: 'active' | 'ended';
  cycleStartMode?: 'new' | 'midcycle';
  baselineDate?: string;
  baselineDoc?: number;
  baselineMbw?: number;
  baselineEstimatedPopulation?: number;
  baselineSurvivalRate?: number;
  baselineCumulativeFeed?: number;
  latestLabStatus?: {
    sampleDate?: string;
    status?: 'good' | 'info' | 'watch' | 'warning' | 'critical';
    mainIssue?: string;
    keyRisks?: string[];
    recommendations?: string[];
  };
}

interface FarmCycle {
  id: string;
  status?: 'planning' | 'stocking' | 'active' | 'closing' | 'closed';
}

interface DashboardUser {
  uid: string;
  name?: string;
  companyId?: string;
}

interface Company {
  id: string;
  companyName?: string;
  timeZone?: string;
}

/* --- Robust Calculation Utilities (Mobile + Web Parity) ---- */

type GrowthPoint = {
  x: number;
  y: number;
};

type GrowthSeries = {
  label: string;
  color: string;
  data: GrowthPoint[];
};

type PondStats = ReturnType<typeof calculatePondStats>;

interface ShrimpReportExportData {
  farmName?: string;
  technician?: string;
  companyName?: string;
  ponds: Pond[];
  chartSvg: string;
}

type Html2PdfWorker = {
  from: (element: HTMLElement) => {
    set: (options: unknown) => {
      save: () => Promise<void>;
    };
  };
};

type Html2PdfFactory = () => Html2PdfWorker;

const getValidDateTime = (date?: string): number | null => {
  if (!date) return null;
  const timestamp = new Date(date).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

const buildGrowthSeries = (ponds: Pond[]): GrowthSeries[] => {
  const colors = ['#0F4C75', '#3282B8', '#10B981', '#F59E0B', '#6366F1', '#E74C3C'];

  return ponds
    .map((pond, idx) => {
      const samplingDates = (pond.samplings || [])
        .map((sampling) => getValidDateTime(sampling.date))
        .filter((timestamp): timestamp is number => timestamp !== null);
      const startTime = getValidDateTime(pond.docStart) || getValidDateTime(pond.baselineDate) || Math.min(...samplingDates);

      if (!Number.isFinite(startTime)) {
        return { label: pond.pondName, color: colors[idx % colors.length], data: [] };
      }

      const data = (pond.samplings || [])
        .map((sampling) => {
          const samplingTime = getValidDateTime(sampling.date);
          const mbw = toFiniteNumber(sampling.mbw || sampling.abw);
          if (samplingTime === null || mbw <= 0) return null;
          return {
            x: Math.max(0, Math.floor((samplingTime - startTime) / DAY_MS)),
            y: mbw
          };
        })
        .filter((point): point is GrowthPoint => point !== null)
        .sort((a, b) => a.x - b.x);

      return {
        label: pond.pondName,
        color: colors[idx % colors.length],
        data
      };
    })
    .filter((series) => series.data.length > 0);
};

const calculatePondStats = (pond: Pond, timeZone?: string) => {
  const samplings = pond.samplings || [];
  // Sort by date ascending to correctly identify latest/previous
  const sorted = [...samplings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const growthSorted = sorted.filter((sampling) => !isBaselineSampling(sampling) && getSamplingMbw(sampling) > 0);
  const biologicalMetrics = calculatePondMetricsWithHarvest(pond, timeZone);
  
  const previousRaw = growthSorted[growthSorted.length - 2] || null;
  const previous = previousRaw ? {
    mbw: getSamplingMbw(previousRaw),
    date: previousRaw.date
  } : null;

  // Normalize pond base data (checking for mobile field names)
  const initialPop = pond.initialPopulation || pond.initialStock || 0;

  return {
    pondName: pond.pondName,
    doc: biologicalMetrics.doc,
    population: biologicalMetrics.currentPopulation,
    biomass: biologicalMetrics.currentBiomass,
    sr: biologicalMetrics.adjustedSR,
    mbw: biologicalMetrics.latestMbw,
    prevMbw: previous?.mbw || 0,
    size: biologicalMetrics.size,
    adg: biologicalMetrics.adg,
    fcr: biologicalMetrics.biomassGainFCR,
    totalFeed: biologicalMetrics.totalFeedConsumed,
    mortality: biologicalMetrics.totalMortality,
    mortalityPct: (biologicalMetrics.totalMortality / (initialPop || 1)) * 100
  };
};

const getGlobalAverages = (ponds: Pond[], timeZone?: string) => {
  if (ponds.length === 0) {
    return { avgABW: 0, avgADG: 0, avgSize: 0, avgSR: 0, avgFCR: 0, totalBiomass: 0, totalFeed: 0, avgDensity: 0, stats: [] };
  }
  
  const stats = ponds.map(p => calculatePondStats(p, timeZone));
  const totalPonds = ponds.length;

  return {
    avgABW: stats.reduce((sum, s) => sum + (s.mbw || 0), 0) / totalPonds,
    avgADG: stats.reduce((sum, s) => sum + (s.adg || 0), 0) / totalPonds,
    avgSize: stats.reduce((sum, s) => sum + (s.size || 0), 0) / totalPonds,
    avgSR: stats.reduce((sum, s) => sum + (s.sr || 0), 0) / totalPonds,
    avgFCR: stats.reduce((sum, s) => sum + (s.fcr || 0), 0) / totalPonds,
    totalBiomass: stats.reduce((sum, s) => sum + (s.biomass || 0), 0),
    totalFeed: stats.reduce((sum, s) => sum + (s.totalFeed || 0), 0),
    avgDensity: ponds.reduce((sum, p) => sum + (p.density || 0), 0) / totalPonds,
    stats
  };
};

const GrowthTrajectoryChart = ({ series }: { series: GrowthSeries[] }) => {
  const points = series.flatMap((item) => item.data);

  if (!points.length) {
    return (
      <div style={{
        height: '260px',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        background: 'var(--bg-mid)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        fontWeight: 700,
        textAlign: 'center',
        padding: '24px'
      }}>
        No growth sampling data yet.
      </div>
    );
  }

  const width = 760;
  const height = 300;
  const left = 54;
  const right = 18;
  const top = 22;
  const bottom = 44;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  const xSpan = Math.max(1, maxX - minX);
  const yPadding = Math.max(1, (maxY - minY) * 0.15);
  const yMin = Math.max(0, minY - yPadding);
  const yMax = maxY + yPadding;
  const ySpan = Math.max(1, yMax - yMin);
  const xScale = (x: number) => left + ((x - minX) / xSpan) * plotWidth;
  const yScale = (y: number) => top + (1 - ((y - yMin) / ySpan)) * plotHeight;
  const yTicks = [0, 0.5, 1].map((ratio) => yMin + ySpan * ratio);
  const xTicks = [minX, Math.round(minX + xSpan / 2), maxX];

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Growth trajectory chart" style={{ width: '100%', display: 'block', borderRadius: '12px', border: '1px solid var(--border)', background: '#FFFFFF' }}>
        <rect x="0" y="0" width={width} height={height} fill="#FFFFFF" />
        {yTicks.map((tick) => {
          const y = yScale(tick);
          return (
            <g key={`y-${tick}`}>
              <line x1={left} x2={width - right} y1={y} y2={y} stroke="#E5EEF5" strokeWidth="1" />
              <text x={left - 10} y={y + 4} textAnchor="end" fontSize="11" fontWeight="700" fill="#7A8EA3">{tick.toFixed(1)}</text>
            </g>
          );
        })}
        {xTicks.map((tick) => {
          const x = xScale(tick);
          return (
            <g key={`x-${tick}`}>
              <line x1={x} x2={x} y1={top} y2={height - bottom} stroke="#F1F5F9" strokeWidth="1" />
              <text x={x} y={height - 18} textAnchor="middle" fontSize="11" fontWeight="700" fill="#7A8EA3">DOC {tick}</text>
            </g>
          );
        })}
        <line x1={left} x2={width - right} y1={height - bottom} y2={height - bottom} stroke="#C7D7E4" strokeWidth="1.5" />
        <line x1={left} x2={left} y1={top} y2={height - bottom} stroke="#C7D7E4" strokeWidth="1.5" />
        <text x="14" y="22" fontSize="11" fontWeight="800" fill="#7A8EA3">MBW (g)</text>

        {series.map((item) => {
          const path = item.data.map((point) => `${xScale(point.x)},${yScale(point.y)}`).join(' ');
          return (
            <g key={item.label}>
              {item.data.length > 1 && (
                <polyline points={path} fill="none" stroke={item.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              )}
              {item.data.map((point, index) => (
                <circle key={`${item.label}-${point.x}-${index}`} cx={xScale(point.x)} cy={yScale(point.y)} r="4" fill="#FFFFFF" stroke={item.color} strokeWidth="3" />
              ))}
            </g>
          );
        })}
      </svg>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 16px', marginTop: '12px' }}>
        {series.map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 800 }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '999px', background: item.color }} />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
};

/* --- PDF Generation HTML Template -------------------------- */
const generateShrimpReportHTML = (data: ShrimpReportExportData, language: PdfLanguage): string => {
  const { farmName, technician, companyName, ponds, chartSvg } = data;
  const global = getGlobalAverages(ponds);
  const stats = global.stats || [];
  const midcyclePonds = ponds.filter((pond: Pond) => pond.baselineDate || pond.cycleStartMode === 'midcycle');

  const pondRows = stats.map((s: PondStats, index: number) => `
    <tr style="${index % 2 === 0 ? 'background-color: #F8FAFB;' : ''}">
      <td style="padding: 12px 4px; text-align: center; border-bottom: 1px solid #E5E7EB;">${s.pondName}</td>
      <td style="padding: 12px 4px; text-align: center; border-bottom: 1px solid #E5E7EB;">${s.doc}</td>
      <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #E5E7EB;">${s.prevMbw > 0 ? s.prevMbw.toFixed(2) : '-'}</td>
      <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #E5E7EB; font-weight: 600;">${s.mbw.toFixed(2)}</td>
      <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #E5E7EB;">${s.adg.toFixed(2)}</td>
      <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #E5E7EB;">${s.size}</td>
      <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #E5E7EB; color: ${s.sr >= 85 ? '#2D7A4F' : '#C0392B'}; font-weight: 600;">${s.sr.toFixed(1)}%</td>
      <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #E5E7EB;">${s.biomass.toFixed(1)}</td>
      <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #E5E7EB;">${s.totalFeed.toFixed(1)}</td>
      <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #E5E7EB; font-weight: 600;">${s.fcr.toFixed(2)}</td>
      <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #E5E7EB;">${s.mortality}</td>
      <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #E5E7EB;">${s.mortalityPct.toFixed(2)}%</td>
    </tr>
  `).join('');

  const labRows = ponds
    .filter((pond: Pond) => pond.latestLabStatus)
    .map((pond: Pond) => {
      const lab = pond.latestLabStatus;
      const status = lab?.status === 'info' ? 'good' : lab?.status || 'good';
      const color = status === 'critical' ? '#C0392B' : status === 'warning' || status === 'watch' ? '#B45309' : '#2D7A4F';
      const risks = (lab?.keyRisks || []).slice(0, 2).join('; ') || lab?.mainIssue || 'No warning-level issue detected';
      const recommendation = (lab?.recommendations || [])[0] || 'Continue routine monitoring and compare against the next lab result.';
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #E5E7EB; font-weight: 700;">${pond.pondName}</td>
          <td style="padding: 8px; border-bottom: 1px solid #E5E7EB;">${lab?.sampleDate || '-'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #E5E7EB; color: ${color}; font-weight: 800;">${status.toUpperCase()}</td>
          <td style="padding: 8px; border-bottom: 1px solid #E5E7EB;">${lab?.mainIssue || 'Lab result reviewed'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #E5E7EB;">${risks}</td>
          <td style="padding: 8px; border-bottom: 1px solid #E5E7EB;">${recommendation}</td>
        </tr>
      `;
    }).join('');

  return localizePdfHtml(`
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: sans-serif; padding: 15px; font-size: 9px; color: #1B262C;">
      <h1 style="color: #0F4C75;">Shrimp Production Audit Report</h1>
      <div>Farm: ${farmName} | Company: ${companyName} | Technician: ${technician}</div>
      <hr style="margin: 10px 0; border: 0.5px solid #E5E7EB;"/>
      <table style="width: 100%; border-collapse: collapse;">
        <thead style="background: #0F4C75; color: white;">
          <tr><th>Pond</th><th>DOC</th><th>Prev ABW</th><th>ABW</th><th>ADG</th><th>Size</th><th>SR%</th><th>Bio</th><th>Feed</th><th>FCR</th><th>Mort</th><th>Mort%</th></tr>
        </thead>
        <tbody>${pondRows}</tbody>
      </table>
      ${midcyclePonds.length > 0 ? `
        <div style="margin-top: 14px; padding: 12px; background: #F0F8FF; border: 1px solid #BBE1FA; border-radius: 8px; color: #0F4C75;">
          <strong>Data Quality Note:</strong> ${midcyclePonds.map((pond: Pond) => `${pond.pondName}${pond.baselineDate ? ` baseline ${pond.baselineDate}` : ''}`).join(', ')} ${midcyclePonds.length === 1 ? 'was' : 'were'} onboarded mid-cycle. Pre-onboarding feed, survival, and biomass values are estimates, not exact historical logs.
        </div>
      ` : ''}
      <div style="margin-top: 16px; padding: 12px; background: #F8FAFC; border: 1px solid #BBE1FA; border-radius: 8px;">
        <h2 style="font-size: 14px; margin: 0 0 10px; color: #0F4C75;">Latest Lab Analysis</h2>
        ${labRows ? `
          <table style="width: 100%; border-collapse: collapse;">
            <thead style="background: #E0F2FE; color: #0F4C75;">
              <tr><th>Pond</th><th>Date</th><th>Status</th><th>Main Issue</th><th>Risks</th><th>Recommended Action</th></tr>
            </thead>
            <tbody>${labRows}</tbody>
          </table>
        ` : '<p style="margin: 0; color: #475569;">No confirmed lab analysis was attached to the selected ponds at export time.</p>'}
      </div>
      <div style="margin-top: 28px; width: 100%; page-break-inside: avoid;">${chartSvg}</div>
    </body>
    </html>
  `, language);
};

export default function ShrimpReportsPage() {
  const { currentLanguage } = useLanguage();
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [cycles, setCycles] = useState<FarmCycle[]>([]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        onSnapshot(doc(db, 'users', firebaseUser.uid), (uDoc) => {
          if (uDoc.exists()) {
            const userData = uDoc.data();
            setUser({ ...userData, uid: firebaseUser.uid });
            if (userData.companyId) {
              onSnapshot(doc(db, 'companies', userData.companyId), (cDoc) => {
                if (cDoc.exists()) setCompany({ id: cDoc.id, ...cDoc.data() });
              });
            }
          }
        });
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!company?.id) return;
    const q = query(collection(db, 'companies', company.id, 'ponds'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const pondData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pond));
      setPonds(pondData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching ponds:", error);
      setLoading(false);
    });
    return () => unsub();
  }, [company?.id]);

  useEffect(() => {
    if (!company?.id) return;
    const q = query(collection(db, 'companies', company.id, 'cycles'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setCycles(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as FarmCycle)));
    }, (error) => {
      console.error("Error fetching cycles:", error);
    });
    return () => unsub();
  }, [company?.id]);

  const activePonds = useMemo(() => filterActiveCyclePonds(ponds, cycles), [ponds, cycles]);
  const global = useMemo(() => getGlobalAverages(activePonds, company?.timeZone), [activePonds, company?.timeZone]);
  const growthSeries = useMemo(() => buildGrowthSeries(activePonds), [activePonds]);

  const growthChartSvg = useMemo(() => {
    const rows = buildSamplingGrowthMovementRows(growthSeries.map((series) => ({
      label: series.label,
      samples: series.data.map((point) => ({
        doc: point.x,
        mbw: point.y,
      })),
    })));

    return renderSamplingGrowthMovementChartSvg(rows, {
      language: currentLanguage,
      width: 1000,
      height: 350,
    });
  }, [currentLanguage, growthSeries]);

  const handleGenerateReport = async () => {
    setExportLoading(true);
    try {
      const html2pdf = ((await import('html2pdf.js')) as { default: Html2PdfFactory }).default;
      const html = generateShrimpReportHTML({ farmName: activePonds[0]?.pondName, technician: user?.name, companyName: company?.companyName, ponds: activePonds, chartSvg: growthChartSvg }, currentLanguage);
      const element = document.createElement('div');
      element.innerHTML = html;
      document.body.appendChild(element);
      await html2pdf().from(element).set({ margin: 10, filename: 'Sampling_Report.pdf', jsPDF: { orientation: 'landscape' } }).save();
      document.body.removeChild(element);
    } catch (err) { console.error(err); } finally { setExportLoading(false); }
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><Loader2 className="animate-spin" size={48} color="var(--primary)" /></div>;

  return (
    <div className="dashboard-page-relaxed" style={{ paddingBottom: '40px' }}>
      
      <div className="glass-card" style={{
        background: '#FFFFFF',
        border: '1px solid var(--border)',
        borderRadius: '18px',
        padding: '20px 22px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 850, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Reports</div>
          <h1 style={{ fontSize: '22px', fontWeight: 900, marginBottom: '4px', color: 'var(--text-primary)', letterSpacing: 0 }}>Shrimp Production Audit</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600 }}>Performance analytics across all active production ponds.</p>
        </div>
        <button className="btn-primary" onClick={handleGenerateReport} disabled={exportLoading} style={{ minHeight: '42px', padding: '0 16px', borderRadius: '12px', fontWeight: 800 }}>
          {exportLoading ? <Loader2 size={19} className="animate-spin" /> : 'Export Audit PDF'}
        </button>
      </div>

      {/* Global Metrics */}
      <div className="dashboard-kpi-grid">
        {[
          { label: 'Avg Body Weight', value: `${global.avgABW.toFixed(2)}g`, icon: Scale, color: 'var(--primary)', bg: 'var(--primary-dim)' },
          { label: 'Growth Rate (ADG)', value: `${global.avgADG.toFixed(2)}g`, icon: Activity, color: '#27AE60', bg: '#E8F7EE' },
          { label: 'Avg FCR', value: global.avgFCR.toFixed(2), icon: Zap, color: '#F39C12', bg: '#FFF9EB' },
          { label: 'Total Biomass', value: `${Math.round(global.totalBiomass)}kg`, icon: Target, color: '#E74C3C', bg: '#FEF2F2' },
        ].map((item, i) => (
          <div key={i} className="glass-card dashboard-kpi-card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: item.bg, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><item.icon size={21} /></div>
            <div>
              <div className="dashboard-kpi-label">{item.label}</div>
              <div className="dashboard-kpi-value">{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-report-grid">
        <div className="glass-card" style={{ padding: '22px', background: '#FFF', border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}><TrendingUp size={20} /> Growth Trajectory</h2>
          <GrowthTrajectoryChart series={growthSeries} />
        </div>

        <div className="glass-card" style={{ padding: '22px', background: '#FFF', border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}><Waves size={20} /> Pond Status</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {global.stats.map((s: PondStats) => (
              <div key={s.pondName} style={{ padding: '14px', borderRadius: '14px', background: 'var(--bg-mid)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                  <div><div style={{ fontSize: '16px', fontWeight: 800 }}>{s.pondName}</div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>DOC {s.doc} days</div></div>
                  <div style={{ height: 'fit-content', fontSize: '10px', fontWeight: 900, color: s.sr >= 85 ? '#27AE60' : '#E74C3C', background: '#FFF', padding: '6px 10px', borderRadius: '999px', border: '1px solid var(--border)' }}>{s.sr >= 85 ? 'EXCELLENT' : 'CRITICAL'}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', textAlign: 'center', gap: '8px' }}>
                  <div><div style={{ fontSize: '10px', color: 'var(--text-faint)', fontWeight: 800 }}>ABW</div><div style={{ fontSize: '14px', fontWeight: 850 }}>{s.mbw.toFixed(2)}g</div></div>
                  <div><div style={{ fontSize: '10px', color: 'var(--text-faint)', fontWeight: 800 }}>SIZE</div><div style={{ fontSize: '14px', fontWeight: 850 }}>{s.size}</div></div>
                  <div><div style={{ fontSize: '10px', color: 'var(--text-faint)', fontWeight: 800 }}>SR</div><div style={{ fontSize: '14px', fontWeight: 850 }}>{s.sr.toFixed(1)}%</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
