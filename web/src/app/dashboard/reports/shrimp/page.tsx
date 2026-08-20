"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Loader2, 
  Waves, 
  TrendingUp,
  X
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
  generateSamplingReportHTML,
  type PondData as SamplingReportPondData,
  type SamplingReportData,
} from '@/lib/generated/mobileSamplingReport';
import { downloadMobilePdf, loadMobilePdfBrandAssets } from '@/lib/mobilePdfExport';
import type { PlanktonOverwatchSnapshot } from '../../../../../../shared/planktonOverwatch';

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
  supplier?: string;
  plSupplier?: string;
  docStart: string;
  pondArea?: number;
  area?: number; // Mobile parity
  initialPopulation?: number;
  initialStock?: number; // Mobile parity
  initialWeight?: number;
  density?: number;
  samplings: Sampling[];
  mortalityRecords?: Array<{ date: string; mortality?: number; quantity?: number }>;
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
  latestPlanktonOverwatch?: PlanktonOverwatchSnapshot;
}

interface FarmCycle {
  id: string;
  status?: 'planning' | 'stocking' | 'active' | 'closing' | 'closed';
}

interface DashboardUser {
  uid: string;
  name?: string;
  email?: string;
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
        fontWeight: 600,
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
              <text x={left - 10} y={y + 4} textAnchor="end" fontSize="11" fontWeight="600" fill="#7A8EA3">{tick.toFixed(1)}</text>
            </g>
          );
        })}
        {xTicks.map((tick) => {
          const x = xScale(tick);
          return (
            <g key={`x-${tick}`}>
              <line x1={x} x2={x} y1={top} y2={height - bottom} stroke="#F1F5F9" strokeWidth="1" />
              <text x={x} y={height - 18} textAnchor="middle" fontSize="11" fontWeight="600" fill="#7A8EA3">DOC {tick}</text>
            </g>
          );
        })}
        <line x1={left} x2={width - right} y1={height - bottom} y2={height - bottom} stroke="#C7D7E4" strokeWidth="1.5" />
        <line x1={left} x2={left} y1={top} y2={height - bottom} stroke="#C7D7E4" strokeWidth="1.5" />
        <text x="14" y="22" fontSize="11" fontWeight="600" fill="#7A8EA3">MBW (g)</text>

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
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '999px', background: item.color }} />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function ShrimpReportsPage() {
  const { currentLanguage } = useLanguage();
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [cycles, setCycles] = useState<FarmCycle[]>([]);
  const [selectedPondIds, setSelectedPondIds] = useState<string[] | null>(null);
  const [draftPondIds, setDraftPondIds] = useState<string[]>([]);
  const [isPondSelectorOpen, setIsPondSelectorOpen] = useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        onSnapshot(doc(db, 'users', firebaseUser.uid), (uDoc) => {
          if (uDoc.exists()) {
            const userData = uDoc.data();
            setUser({ ...userData, uid: firebaseUser.uid, email: userData.email || firebaseUser.email || undefined });
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
  const selectedPonds = useMemo(() => {
    if (selectedPondIds === null) return activePonds;
    const selectedIds = new Set(selectedPondIds);
    return activePonds.filter((pond) => selectedIds.has(pond.id));
  }, [activePonds, selectedPondIds]);
  const global = useMemo(() => getGlobalAverages(selectedPonds, company?.timeZone), [selectedPonds, company?.timeZone]);
  const growthSeries = useMemo(() => buildGrowthSeries(selectedPonds), [selectedPonds]);

  const openPondSelector = () => {
    setDraftPondIds(selectedPonds.map((pond) => pond.id));
    setIsPondSelectorOpen(true);
  };

  const toggleDraftPond = (pondId: string) => {
    setDraftPondIds((current) => current.includes(pondId)
      ? current.filter((id) => id !== pondId)
      : [...current, pondId]);
  };

  const applyPondSelection = () => {
    setSelectedPondIds(draftPondIds);
    setIsPondSelectorOpen(false);
  };

  const handleGenerateReport = async () => {
    if (selectedPonds.length === 0) return;
    setExportLoading(true);
    try {
      const pondsForReport: SamplingReportPondData[] = selectedPonds.map((pond) => {
        const operationalSamplings = (pond.samplings || [])
          .filter((sampling) => !isBaselineSampling(sampling))
          .sort((first, second) => new Date(first.date).getTime() - new Date(second.date).getTime());
        const allSamplings = [...(pond.samplings || [])]
          .sort((first, second) => new Date(first.date).getTime() - new Date(second.date).getTime());
        const growthSamplings = operationalSamplings.filter((sampling) => getSamplingMbw(sampling) > 0);
        const pondMetrics = calculatePondMetricsWithHarvest(pond, company?.timeZone);
        const initialPopulation = toFiniteNumber(pond.initialPopulation || pond.initialStock);

        const samplingHistory = growthSamplings.map((sampling, index) => {
          const samplingTime = new Date(sampling.date).getTime();
          const metricsToDate = calculatePondMetricsWithHarvest({
            ...pond,
            samplings: allSamplings.filter((item) => new Date(item.date).getTime() <= samplingTime),
            mortalityRecords: (pond.mortalityRecords || []).filter((record) => new Date(record.date).getTime() <= samplingTime),
          }, company?.timeZone);
          const mbw = getSamplingMbw(sampling);
          return {
            samplingNumber: index + 1,
            samplingDate: sampling.date,
            doc: Math.floor((samplingTime - new Date(pond.docStart).getTime()) / DAY_MS),
            mbw,
            abw: mbw,
            adg: metricsToDate.adg,
            size: mbw > 0 ? 1000 / mbw : 0,
            sr: metricsToDate.adjustedSR,
            biomass: metricsToDate.currentBiomass,
            feedCumulative: metricsToDate.totalFeedConsumed,
            fcr: index === growthSamplings.length - 1 ? pondMetrics.adjustedFCR : metricsToDate.adjustedFCR,
            mortality: toFiniteNumber(sampling.mortality),
            mortalityPercentage: initialPopulation > 0 ? (metricsToDate.totalMortality / initialPopulation) * 100 : 0,
          };
        });

        return {
          pondNumber: pond.pondName,
          supplier: pond.plSupplier || pond.supplier || 'N/A',
          stockingDate: pond.docStart,
          area: toFiniteNumber(pond.pondArea || pond.area),
          initialStock: initialPopulation,
          density: toFiniteNumber(pond.density),
          latestLabStatus: pond.latestLabStatus,
          latestPlanktonOverwatch: pond.latestPlanktonOverwatch,
          isMidcycleBaseline: pond.cycleStartMode === 'midcycle',
          baselineDate: pond.baselineDate,
          samplingHistory,
        };
      });
      const reportData: SamplingReportData = {
        farmName: company?.companyName || 'My Farm',
        block: 'Main Block',
        technician: user?.name || user?.email?.split('@')[0] || 'Unknown',
        reportDate: new Date().toISOString(),
        reportPeriod: `Culture Cycle ${new Date().getFullYear()}`,
        companyName: company?.companyName || 'My Company',
        ponds: pondsForReport,
      };
      const brandAssets = await loadMobilePdfBrandAssets('landscape');
      const html = generateSamplingReportHTML(reportData, brandAssets, currentLanguage);
      await downloadMobilePdf({ html, filename: 'Sampling_Report.pdf', orientation: 'landscape' });
    } catch (error) {
      console.error('Sampling report export failed:', error);
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><Loader2 className="animate-spin" size={48} color="var(--primary)" /></div>;

  return (
    <div className="dashboard-page-relaxed authenticated-compact-page business-dashboard-page" style={{ paddingBottom: '40px' }}>
      
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
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Reports</div>
          <h1 style={{ fontSize: '24px', lineHeight: '32px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Shrimp Production Audit</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600 }}>
            Performance analytics for {selectedPonds.length} of {activePonds.length} active production ponds.
          </p>
        </div>
        <div className="sampling-report-actions">
          <button type="button" className="btn-secondary sampling-pond-trigger" onClick={openPondSelector} disabled={activePonds.length === 0}>
            <span>Select ponds</span>
            <span className="sampling-pond-count">{selectedPonds.length}</span>
          </button>
          <button className="btn-primary" onClick={handleGenerateReport} disabled={exportLoading || selectedPonds.length === 0} style={{ minHeight: '42px', padding: '0 16px', borderRadius: '12px', fontWeight: 600 }}>
            {exportLoading ? <Loader2 size={19} className="animate-spin" /> : 'Export Audit PDF'}
          </button>
        </div>
      </div>

      {/* Global Metrics */}
      <div className="glass-card sampling-summary-bar" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '4px', padding: '8px', border: '1px solid var(--border)', background: '#fff', overflow: 'hidden' }}>
        {[
          { label: 'ABW', value: `${global.avgABW.toFixed(2)}g` },
          { label: 'FCR', value: global.avgFCR.toFixed(2) },
          { label: 'ADG', value: `${global.avgADG.toFixed(2)}g` },
          { label: 'T.Biomas', value: `${Math.round(global.totalBiomass)}kg` },
        ].map((item) => (
          <div key={item.label} className="sampling-summary-item" style={{ minWidth: 0, minHeight: '64px', padding: '8px 4px', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 600, lineHeight: '14px', whiteSpace: 'nowrap' }}>{item.label}</div>
            <div style={{ marginTop: '2px', color: 'var(--text-primary)', fontSize: '18px', fontWeight: 600, lineHeight: '24px', whiteSpace: 'nowrap' }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-report-grid">
        <div className="glass-card" style={{ padding: '22px', background: '#FFF', border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}><TrendingUp size={20} /> Growth Trajectory</h2>
          <GrowthTrajectoryChart series={growthSeries} />
        </div>

        <div className="glass-card" style={{ padding: '22px', background: '#FFF', border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}><Waves size={20} /> Pond Status</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {global.stats.map((s: PondStats) => (
              <div key={s.pondName} style={{ padding: '14px', borderRadius: '14px', background: 'var(--bg-mid)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                  <div><div style={{ fontSize: '16px', fontWeight: 600 }}>{s.pondName}</div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>DOC {s.doc} days</div></div>
                  <div style={{ height: 'fit-content', fontSize: '10px', fontWeight: 600, color: s.sr >= 85 ? '#27AE60' : '#E74C3C', background: '#FFF', padding: '6px 10px', borderRadius: '999px', border: '1px solid var(--border)' }}>{s.sr >= 85 ? 'EXCELLENT' : 'CRITICAL'}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', textAlign: 'center', gap: '8px' }}>
                  <div><div style={{ fontSize: '10px', color: 'var(--text-faint)', fontWeight: 600 }}>ABW</div><div style={{ fontSize: '14px', fontWeight: 600 }}>{s.mbw.toFixed(2)}g</div></div>
                  <div><div style={{ fontSize: '10px', color: 'var(--text-faint)', fontWeight: 600 }}>SIZE</div><div style={{ fontSize: '14px', fontWeight: 600 }}>{s.size}</div></div>
                  <div><div style={{ fontSize: '10px', color: 'var(--text-faint)', fontWeight: 600 }}>SR</div><div style={{ fontSize: '14px', fontWeight: 600 }}>{s.sr.toFixed(1)}%</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isPondSelectorOpen && (
        <div
          className="responsive-modal-overlay sampling-pond-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsPondSelectorOpen(false);
          }}
        >
          <div className="glass-card responsive-modal sampling-pond-modal" role="dialog" aria-modal="true" aria-labelledby="sampling-pond-title">
            <div className="responsive-modal-header sampling-pond-header">
              <div>
                <h2 id="sampling-pond-title">Select ponds</h2>
                <p>Choose which ponds to include in this report.</p>
              </div>
              <button type="button" className="sampling-pond-close" onClick={() => setIsPondSelectorOpen(false)} aria-label="Close pond selection">
                <X size={18} />
              </button>
            </div>

            <div className="responsive-modal-body sampling-pond-body">
              <div className="sampling-pond-toolbar">
                <span>{draftPondIds.length} of {activePonds.length} selected</span>
                <div>
                  <button type="button" onClick={() => setDraftPondIds(activePonds.map((pond) => pond.id))}>Select all</button>
                  <button type="button" onClick={() => setDraftPondIds([])}>Clear</button>
                </div>
              </div>
              <div className="sampling-pond-list">
                {activePonds.map((pond) => {
                  const isSelected = draftPondIds.includes(pond.id);
                  return (
                    <label key={pond.id} className={`sampling-pond-option${isSelected ? ' is-selected' : ''}`}>
                      <span>
                        <strong>{pond.pondName}</strong>
                        <small>{(pond.samplings || []).filter((sampling) => getSamplingMbw(sampling) > 0).length} sampling records</small>
                      </span>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleDraftPond(pond.id)} />
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="responsive-modal-footer sampling-pond-footer">
              <button type="button" className="btn-secondary" onClick={() => setIsPondSelectorOpen(false)}>Cancel</button>
              <button type="button" className="btn-primary" onClick={applyPondSelection}>Apply selection</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .sampling-report-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sampling-pond-trigger {
          min-height: 42px;
          padding: 0 12px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          font-weight: 600;
          transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;
        }

        .sampling-pond-trigger:hover {
          background: var(--bg-mid);
          border-color: var(--secondary);
          color: var(--primary);
        }

        .sampling-pond-count {
          min-width: 22px;
          height: 22px;
          padding: 0 6px;
          border-radius: 7px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          background: var(--primary);
          font-size: 11px;
        }

        .sampling-pond-overlay {
          position: fixed;
          inset: 0;
          z-index: 1200;
          padding: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(15, 23, 42, 0.52);
          backdrop-filter: blur(8px);
        }

        .sampling-pond-modal {
          width: min(100%, 480px);
          max-height: min(680px, calc(100dvh - 36px));
          padding: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          background: #fff;
          border: 1px solid var(--border);
          border-radius: 16px;
        }

        .sampling-pond-header {
          min-height: 68px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid var(--border);
        }

        .sampling-pond-header h2 {
          margin: 0;
          color: var(--text-primary);
          font-size: 17px;
          line-height: 22px;
        }

        .sampling-pond-header p {
          margin: 2px 0 0;
          color: var(--text-muted);
          font-size: 12px;
        }

        .sampling-pond-close {
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          border: 0;
          border-radius: 9px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--text-primary);
          background: transparent;
          cursor: pointer;
        }

        .sampling-pond-close:hover {
          background: var(--bg-mid);
        }

        .sampling-pond-body {
          min-height: 0;
          padding: 14px 16px;
          overflow-y: auto;
        }

        .sampling-pond-toolbar {
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 600;
        }

        .sampling-pond-toolbar > div {
          display: flex;
          gap: 4px;
        }

        .sampling-pond-toolbar button {
          min-height: 32px;
          padding: 0 8px;
          border: 0;
          border-radius: 8px;
          color: var(--primary);
          background: transparent;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .sampling-pond-toolbar button:hover {
          background: var(--bg-mid);
        }

        .sampling-pond-list {
          display: grid;
          gap: 8px;
        }

        .sampling-pond-option {
          min-height: 58px;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: #fff;
          cursor: pointer;
        }

        .sampling-pond-option:hover,
        .sampling-pond-option.is-selected {
          border-color: var(--secondary);
          background: var(--bg-mid);
        }

        .sampling-pond-option span {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .sampling-pond-option strong {
          color: var(--text-primary);
          font-size: 14px;
        }

        .sampling-pond-option small {
          margin-top: 2px;
          color: var(--text-muted);
          font-size: 11px;
        }

        .sampling-pond-option input {
          width: 18px;
          height: 18px;
          flex: 0 0 18px;
          accent-color: var(--primary);
        }

        .sampling-pond-footer {
          padding: 10px 12px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          border-top: 1px solid var(--border);
          background: #fff;
        }

        .sampling-pond-footer button {
          width: 100%;
          min-height: 40px;
          border-radius: 10px;
          font-weight: 600;
        }

        @media (max-width: 640px) {
          .sampling-report-actions {
            width: 100%;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .sampling-report-actions > button {
            width: 100%;
            padding-inline: 10px !important;
            font-size: 12px;
          }

          .sampling-pond-overlay {
            padding: 12px;
          }

          .sampling-pond-modal {
            max-height: calc(100dvh - 24px);
          }
        }
      `}</style>
    </div>
  );
}
