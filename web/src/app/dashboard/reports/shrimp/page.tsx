"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  Download, 
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

/* ─── Types ─────────────────────────────────────────────────── */
interface Sampling {
  id: string;
  date: string;
  mbw?: number;
  abw?: number; // Mobile parity
  mortality?: number;
  feed?: number;
  feedData?: any;
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
}

/* ─── Robust Calculation Utilities (Mobile + Web Parity) ──── */

const calculatePondStats = (pond: Pond) => {
  const samplings = pond.samplings || [];
  // Sort by date ascending to correctly identify latest/previous
  const sorted = [...samplings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Normalize latest sampling data (checking for mbw and abw)
  const latestRaw = sorted[sorted.length - 1] || {};
  const latest = {
    mbw: latestRaw.mbw || latestRaw.abw || 0,
    mortality: latestRaw.mortality || 0,
    feed: latestRaw.feed || (latestRaw.feedData?.totalDailyFeed ? parseFloat(latestRaw.feedData.totalDailyFeed) : 0),
    date: latestRaw.date || new Date().toISOString()
  };

  const previousRaw = sorted[sorted.length - 2] || null;
  const previous = previousRaw ? {
    mbw: previousRaw.mbw || previousRaw.abw || 0,
    date: previousRaw.date
  } : null;

  // Normalize pond base data (checking for mobile field names)
  const initialPop = pond.initialPopulation || pond.initialStock || 0;
  const initialW = pond.initialWeight || 0.5;
  const docStart = new Date(pond.docStart);
  const docDays = Math.floor((Date.now() - docStart.getTime()) / (1000 * 60 * 60 * 24));
  
  // Find latest valid MBW across history (handling records without MBW updates)
  const lastRecordedMBW = [...sorted].reverse().find(s => (s.mbw || s.abw || 0) > 0);
  const currentMBW = lastRecordedMBW ? (lastRecordedMBW.mbw || lastRecordedMBW.abw) : initialW;

  // 1. Calculate Population & Survival Rate (SR)
  const totalMortality = sorted.reduce((sum, s) => sum + (s.mortality || 0), 0);
  const population = Math.max(0, initialPop - totalMortality);
  const sr = initialPop > 0 ? (population / initialPop) * 100 : 0;
  
  // 2. Calculate Biomass (kg)
  const biomass = (population * (currentMBW || 0)) / 1000;
  
  // 3. Calculate Size (pcs/kg)
  const size = (currentMBW || 0) > 0 ? Math.round(1000 / (currentMBW || 1)) : 0;
  
  // 4. Calculate ADG (Average Daily Growth)
  const validSamplings = sorted.filter(s => (s.mbw || s.abw || 0) > 0);
  let adg = 0;
  if (validSamplings.length >= 2) {
    const s2 = validSamplings[validSamplings.length - 1];
    const s1 = validSamplings[validSamplings.length - 2];
    const s2w = s2.mbw || s2.abw || 0;
    const s1w = s1.mbw || s1.abw || 0;
    const daysDiff = (new Date(s2.date).getTime() - new Date(s1.date).getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 0) {
      adg = (s2w - s1w) / daysDiff;
    }
  } else if (validSamplings.length === 1) {
    // Calculate ADG since stocking
    const s1 = validSamplings[0];
    const s1w = s1.mbw || s1.abw || 0;
    const daysDiff = (new Date(s1.date).getTime() - docStart.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 0) {
      adg = (s1w - initialW) / daysDiff;
    }
  }

  // 5. Calculate FCR (Feed Conversion Ratio)
  const totalFeed = sorted.reduce((sum, s) => {
    const f = s.feed || (s.feedData?.totalDailyFeed ? parseFloat(s.feedData.totalDailyFeed) : 0);
    return sum + (f || 0);
  }, 0);
  
  const initialBiomass = (initialPop * initialW) / 1000;
  const biomassGain = biomass - initialBiomass;
  const fcr = biomassGain > 0 ? totalFeed / biomassGain : 0;

  return {
    pondName: pond.pondName,
    doc: docDays,
    population,
    biomass,
    sr,
    mbw: currentMBW,
    prevMbw: previous?.mbw || 0,
    size,
    adg,
    fcr,
    totalFeed,
    mortality: totalMortality,
    mortalityPct: (totalMortality / (initialPop || 1)) * 100
  };
};

const getGlobalAverages = (ponds: Pond[]) => {
  if (ponds.length === 0) {
    return { avgABW: 0, avgADG: 0, avgSize: 0, avgSR: 0, avgFCR: 0, totalBiomass: 0, totalFeed: 0, avgDensity: 0, stats: [] };
  }
  
  const stats = ponds.map(p => calculatePondStats(p));
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

/* ─── PDF Generation HTML Template ────────────────────────── */
const generateShrimpReportHTML = (data: any, t: any): string => {
  const { farmName, technician, reportPeriod, companyName, ponds, chartUrl } = data;
  const global = getGlobalAverages(ponds);
  const stats = global.stats || [];

  const pondRows = stats.map((s: any, index: number) => `
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

  return `
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
      <div style="margin-top: 20px; text-align: center;"><img src="${chartUrl}" style="width: 100%; max-height: 300px; object-fit: contain;" /></div>
    </body>
    </html>
  `;
};

export default function ShrimpReportsPage() {
  const { t } = useLanguage();
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);

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

  const global = useMemo(() => getGlobalAverages(ponds), [ponds]);

  const chartUrl = useMemo(() => {
    if (ponds.length === 0) return null;
    const datasets = ponds.map((pond, idx) => {
      const docStart = new Date(pond.docStart);
      return {
        label: pond.pondName,
        borderColor: ['#0F4C75', '#3282B8', '#10B981', '#F59E0B', '#6366F1'][idx % 5],
        data: (pond.samplings || [])
          .map(s => {
            const val = s.mbw || s.abw || 0;
            return { 
              x: Math.floor((new Date(s.date).getTime() - docStart.getTime()) / (1000*60*60*24)), 
              y: val 
            };
          })
          .filter(d => d.y > 0)
          .sort((a,b) => a.x - b.x),
        fill: false, showLine: true
      };
    });
    const chartConfig = { type: 'scatter', data: { datasets }, options: { title: { display: true, text: 'Growth Trajectory' } } };
    return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&w=800&h=350&bkg=white`;
  }, [ponds]);

  const handleGenerateReport = async () => {
    setExportLoading(true);
    try {
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;
      const html = generateShrimpReportHTML({ farmName: ponds[0]?.pondName, technician: user?.name, companyName: company?.companyName, ponds, chartUrl }, t);
      const element = document.createElement('div');
      element.innerHTML = html;
      document.body.appendChild(element);
      await html2pdf().from(element).set({ margin: 10, filename: 'Shrimp_Audit.pdf', jsPDF: { orientation: 'landscape' } }).save();
      document.body.removeChild(element);
    } catch (err) { console.error(err); } finally { setExportLoading(false); }
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><Loader2 className="animate-spin" size={48} color="var(--primary)" /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', paddingBottom: '60px' }}>
      
      {/* Header */}
      <div style={{ 
        background: 'var(--gradient)', 
        borderRadius: '32px', 
        padding: '48px', 
        color: '#FFFFFF', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        boxShadow: '0 20px 40px rgba(15, 76, 117, 0.15)'
      }}>
        <div>
          <h1 style={{ fontSize: '40px', fontWeight: 900, marginBottom: '12px', color: '#FFFFFF' }}>Shrimp Production Audit</h1>
          <p style={{ fontSize: '18px', color: '#FFFFFF', opacity: 1, fontWeight: 500 }}>Performance analytics across all active production ponds.</p>
        </div>
        <button className="btn-secondary" onClick={handleGenerateReport} disabled={exportLoading} style={{ padding: '16px 32px', borderRadius: '20px', fontWeight: 800 }}>
          {exportLoading ? <Loader2 size={22} className="animate-spin" /> : 'Export Audit PDF'}
        </button>
      </div>

      {/* Global Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
        {[
          { label: 'Avg Body Weight', value: `${global.avgABW.toFixed(2)}g`, icon: Scale, color: 'var(--primary)', bg: 'var(--primary-dim)' },
          { label: 'Growth Rate (ADG)', value: `${global.avgADG.toFixed(2)}g`, icon: Activity, color: '#27AE60', bg: '#E8F7EE' },
          { label: 'Avg FCR', value: global.avgFCR.toFixed(2), icon: Zap, color: '#F39C12', bg: '#FFF9EB' },
          { label: 'Total Biomass', value: `${Math.round(global.totalBiomass)}kg`, icon: Target, color: '#E74C3C', bg: '#FEF2F2' },
        ].map((item, i) => (
          <div key={i} className="glass-card" style={{ padding: '28px', background: '#FFF', display: 'flex', alignItems: 'center', gap: '20px', border: '1px solid var(--border)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: item.bg, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><item.icon size={28} /></div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{item.label}</div>
              <div style={{ fontSize: '24px', fontWeight: 900 }}>{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px' }}>
        <div className="glass-card" style={{ padding: '32px', background: '#FFF', border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '32px' }}><TrendingUp size={22} /> Growth Trajectory</h2>
          {chartUrl ? <img src={chartUrl} style={{ width: '100%', borderRadius: '16px' }} alt="Chart" /> : <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No data.</div>}
        </div>

        <div className="glass-card" style={{ padding: '32px', background: '#FFF', border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '32px' }}><Waves size={22} /> Pond Status</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {global.stats.map((s: any) => (
              <div key={s.pondName} style={{ padding: '20px', borderRadius: '20px', background: 'var(--bg-mid)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div><div style={{ fontSize: '16px', fontWeight: 800 }}>{s.pondName}</div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>DOC {s.doc} days</div></div>
                  <div style={{ fontSize: '11px', fontWeight: 900, color: s.sr >= 85 ? '#27AE60' : '#E74C3C', background: '#FFF', padding: '6px 12px', borderRadius: '30px' }}>{s.sr >= 85 ? 'EXCELLENT' : 'CRITICAL'}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', textAlign: 'center' }}>
                  <div><div style={{ fontSize: '10px' }}>ABW</div><div style={{ fontSize: '15px', fontWeight: 800 }}>{s.mbw.toFixed(2)}g</div></div>
                  <div><div style={{ fontSize: '10px' }}>SIZE</div><div style={{ fontSize: '15px', fontWeight: 800 }}>{s.size}</div></div>
                  <div><div style={{ fontSize: '10px' }}>SR</div><div style={{ fontSize: '15px', fontWeight: 800 }}>{s.sr.toFixed(1)}%</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
