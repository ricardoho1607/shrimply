"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Target, 
  TrendingUp, 
  Waves, 
  Sparkles, 
  Loader2, 
  Download
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
import { useGemini } from '@/hooks/useGemini';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { calculateOrsonHarvestProjection } from '../../../../../orson/harvestProjection';
import { createDefaultOrsonCalibration, normalizeOrsonCalibration } from '../../../../../orson/learning';
import type { OrsonCalibrationProfile } from '../../../../../orson/types';
import { filterActiveCyclePonds } from '@/lib/pondLifecycle';

/* --- Types --------------------------------------------------- */
interface Pond {
  id: string;
  pondName: string;
  docStart: string;
  initialPopulation: number;
  initialWeight?: number;
  samplings: Array<Record<string, unknown>>;
  cycleId?: string;
  cycleStatus?: 'active' | 'ended';
}

interface DashboardUser {
  uid: string;
  companyId?: string;
}

interface Company {
  id: string;
  companyName?: string;
  timeZone?: string;
}

interface FarmCycle {
  id: string;
  status?: 'planning' | 'stocking' | 'active' | 'closing' | 'closed';
}

interface ProjectionRisk {
  severity: string;
  summary: string;
}

interface ProjectionExportData {
  pondName: string;
  futureDoc?: number | null;
  projectedMbwG?: number | null;
  projectedBiomassKg?: number | null;
  projectedRevenue: number;
  projectedProfit: number;
  insight?: string | null;
  companyName?: string;
  confidenceScore?: number | null;
  assumedSurvivalPercent?: number | null;
  survivalConfidence?: string;
  projectedFcr?: number | null;
  marketSizeRisk?: string;
  risks?: ProjectionRisk[];
}

type Html2PdfWorker = {
  from: (element: HTMLElement) => {
    set: (options: unknown) => {
      save: () => Promise<void>;
    };
  };
};

type Html2PdfFactory = () => Html2PdfWorker;

export default function HarvestProjectionsPage() {
  const { t } = useLanguage();
  const { formatCurrency, currencyConfig } = useCurrency();
  
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [selectedPondId, setSelectedPondId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setUser] = useState<DashboardUser | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [cycles, setCycles] = useState<FarmCycle[]>([]);
  const [calibrationState, setCalibrationState] = useState<{
    companyId: string;
    profile: OrsonCalibrationProfile;
  } | null>(null);
  const calibration = useMemo(
    () => calibrationState && calibrationState.companyId === company?.id
      ? calibrationState.profile
      : createDefaultOrsonCalibration(),
    [calibrationState, company?.id],
  );
  
  // Assumptions
  const [daysToHarvest, setDaysToHarvest] = useState('14');
  const [expectedPrice, setExpectedPrice] = useState('5.50');
  const [dailyFeedCost, setDailyFeedCost] = useState('50');
  const [targetADG, setTargetADG] = useState('');
  const [assumedSurvival, setAssumedSurvival] = useState('');
  const [targetMarketSize, setTargetMarketSize] = useState('20');
  
  // AI State
  const { sendMessage, loading: aiLoading } = useGemini();
  const [insight, setInsight] = useState<string | null>(null);

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
              }, (error) => {
                console.error("Error fetching company in projections:", error);
              });
            }
          }
        }, (error) => {
          console.error("Error fetching user in projections:", error);
        });
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!company?.id) return;
    const q = query(collection(db, 'companies', company.id, 'ponds'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const pondData = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Pond));
      setPonds(pondData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching ponds in projections:", error);
      setLoading(false);
    });
    return () => unsub();
  }, [company?.id]);

  useEffect(() => {
    if (!company?.id) return;
    const companyId = company.id;
    return onSnapshot(
      doc(db, 'companies', companyId, 'orsonCalibration', 'current'),
      (snapshot) => setCalibrationState({
        companyId,
        profile: normalizeOrsonCalibration(snapshot.exists() ? snapshot.data() : null),
      }),
      (error) => {
        console.warn('Orson calibration listener failed; using safe defaults.', error);
        setCalibrationState({ companyId, profile: createDefaultOrsonCalibration() });
      },
    );
  }, [company?.id]);

  useEffect(() => {
    if (!company?.id) return;
    const q = query(collection(db, 'companies', company.id, 'cycles'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setCycles(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as FarmCycle)));
    }, (error) => {
      console.error("Error fetching cycles in projections:", error);
    });
    return () => unsub();
  }, [company?.id]);

  const activePonds = useMemo(() => filterActiveCyclePonds(ponds, cycles), [ponds, cycles]);
  const selectedPond = useMemo(() => {
    return activePonds.find(p => p.id === selectedPondId) || activePonds[0] || null;
  }, [activePonds, selectedPondId]);

  const projection = useMemo(() => {
    if (!selectedPond) return null;

    return calculateOrsonHarvestProjection({
      pond: selectedPond,
      daysToHarvest: Number(daysToHarvest) || 0,
      expectedPricePerKg: Number(expectedPrice) || 0,
      dailyFeedCost: Number(dailyFeedCost) || 0,
      targetAdgGPerDay: targetADG ? Number(targetADG) : null,
      assumedSurvivalPercent: assumedSurvival ? Number(assumedSurvival) : null,
      targetMarketSizeG: targetMarketSize ? Number(targetMarketSize) : null,
      calibration,
      timeZone: company?.timeZone,
    });
  }, [selectedPond, daysToHarvest, expectedPrice, dailyFeedCost, targetADG, assumedSurvival, targetMarketSize, calibration, company?.timeZone]);

  const handleAskOrson = async () => {
    if (!selectedPond || !projection) return;
    const prompt = `Please provide a risk analysis for this harvest projection:
Pond: ${selectedPond.pondName}
Current DOC: ${projection.currentDoc} | Projected DOC: ${projection.futureDoc}
Current MBW: ${projection.currentMbwG ?? 'unknown'}g | Projected MBW: ${projection.projectedMbwG?.toFixed(2) ?? 'unknown'}g
Historical ADG: ${projection.historicalAdgGPerDay ?? 'unknown'}g/day | Assumed ADG: ${projection.assumedAdgGPerDay ?? 'unknown'}g/day
Assumed survival: ${projection.assumedSurvivalPercent ?? 'unknown'}% (${projection.survivalConfidence} confidence)
Projected FCR: ${projection.projectedFcr ?? 'unknown'} | Market size status: ${projection.marketSizeRisk}
Expected Price: ${currencyConfig.symbol}${expectedPrice}/kg | Daily Feed Cost: ${currencyConfig.symbol}${dailyFeedCost}
Projected Revenue: ${currencyConfig.symbol}${projection.projectedRevenue.toFixed(2)}
Projected Profit (Gross - Future Feed): ${currencyConfig.symbol}${projection.projectedProfit.toFixed(2)}
Projection confidence: ${(projection.confidenceScore * 100).toFixed(0)}%
Structured risks: ${projection.risks.map((risk) => `${risk.severity}: ${risk.summary}`).join('; ') || 'none'}

Give a concise recommendation based on Orson's structured projection risk.`;

    try {
      const response = await sendMessage(prompt, activePonds, {
        companyId: company?.id,
        timeZone: company?.timeZone,
        aiFunction: 'projection',
        calibration,
        projectionSnapshot: {
          pond: selectedPond as unknown as Record<string, unknown>,
          projection,
        },
      });
      setInsight(response);
    } catch {
      setInsight("Orson is currently unavailable to provide an analysis.");
    }
  };


  const generateProjectionHTML = (data: ProjectionExportData): string => {
    const { pondName, futureDoc, projectedMbwG, projectedBiomassKg, projectedRevenue, projectedProfit, insight, companyName, confidenceScore, assumedSurvivalPercent, survivalConfidence, projectedFcr, marketSizeRisk, risks = [] } = data;
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #2C3E50; background: #ffffff; font-size: 14px; line-height: 1.6; }
          .header { margin-bottom: 30px; }
          .title { font-size: 32px; font-weight: 700; color: #E74C3C; margin-bottom: 8px; }
          .company-name { font-size: 15px; color: #2C3E50; margin-bottom: 4px; font-weight: 600; }
          .divider { height: 3px; background: linear-gradient(to right, #E74C3C, #F39C12); margin: 20px 0; border-radius: 2px; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
          .card { background: #F8FAFB; padding: 15px; border-radius: 8px; text-align: center; border-bottom: 3px solid #E74C3C; }
          .label { font-size: 10px; color: #64748B; text-transform: uppercase; margin-bottom: 4px; }
          .value { font-size: 20px; font-weight: 700; color: #2C3E50; }
          .financial-card { background: #F0F9FF; padding: 25px; border-radius: 12px; border-left: 5px solid #3282B8; margin-bottom: 25px; }
          .profit { color: #10B981; font-size: 36px; font-weight: 900; }
          .orson-box { background: #FFFBEA; border: 1px solid #FDE68A; padding: 20px; border-radius: 12px; margin-top: 30px; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #64748B; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Harvest Projection Audit</div>
          <div class="company-name">${companyName}</div>
          <div style="font-size: 14px; color: #4A5568;">Pond: ${pondName} | Generated on ${new Date().toLocaleDateString()}</div>
        </div>
        <div class="divider"></div>
        <div class="grid">
          <div class="card"><div class="label">Harvest DOC</div><div class="value">${futureDoc ?? '-'}</div></div>
          <div class="card"><div class="label">Projected MBW</div><div class="value">${projectedMbwG?.toFixed(1) ?? '-'}g</div></div>
          <div class="card"><div class="label">Projected Biomass</div><div class="value">${projectedBiomassKg?.toFixed(0) ?? '-'} kg</div></div>
          <div class="card"><div class="label">Survival</div><div class="value">${assumedSurvivalPercent ?? '-'}%</div></div>
          <div class="card"><div class="label">Projection FCR</div><div class="value">${projectedFcr ?? '-'}</div></div>
          <div class="card"><div class="label">Confidence</div><div class="value">${confidenceScore ? `${Math.round(confidenceScore * 100)}%` : '-'}</div></div>
        </div>
        <div class="financial-card">
          <div class="label">Projected Gross Revenue</div>
          <div class="value" style="font-size: 28px; margin-bottom: 15px;">${formatCurrency(projectedRevenue)}</div>
          <div class="label">Projected Net Profit (After Future Feed)</div>
          <div class="profit">${formatCurrency(projectedProfit)}</div>
        </div>
        <div class="orson-box">
          <div style="font-weight: 800; color: #92400E; margin-bottom: 8px;">Orson AI Risk Analysis:</div>
          <div style="font-style: italic; color: #451a03;">"${insight || 'No AI analysis performed for this projection.'}"</div>
          <div style="margin-top: 10px; color: #451a03;">Survival confidence: ${survivalConfidence}. Market size status: ${marketSizeRisk}.</div>
          <div style="margin-top: 14px; font-weight: 800; color: #92400E;">Structured Projection Risks</div>
          <ul style="margin-top: 8px; padding-left: 18px; color: #451a03;">
            ${risks.length > 0 ? risks.map((risk: ProjectionRisk) => `<li><strong>${risk.severity}:</strong> ${risk.summary}</li>`).join('') : '<li>No projection-specific risks were detected from the available data.</li>'}
          </ul>
        </div>
        <div class="footer">This is a biological projection based on current Orson metrics, survival assumptions, feed cost, and market-size inputs. Actual results may vary. Generated by Shrimply.</div>
      </body>
      </html>
    `;
  };

  const handleExport = async () => {
    if (!selectedPond || !projection) return;
    setExportLoading(true);
    try {
      const html2pdf = ((await import('html2pdf.js')) as { default: Html2PdfFactory }).default;
      const html = generateProjectionHTML({
        ...projection,
        pondName: selectedPond.pondName,
        companyName: company?.companyName || 'My Farm',
        insight: insight
      });

      const element = document.createElement('div');
      element.innerHTML = html;
      document.body.appendChild(element);

      const opt = {
        margin: [15, 15, 15, 15] as [number, number, number, number],
        filename: `Projection_${selectedPond.pondName}_${new Date().toLocaleDateString()}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      };

      await html2pdf().from(element).set(opt).save();
      document.body.removeChild(element);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExportLoading(false);
    }
  };

  const [exportLoading, setExportLoading] = useState(false);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><Loader2 className="animate-spin" size={40} color="var(--primary)" /></div>;

  return (
    <div className="dashboard-page">
      <div className="dashboard-action-row">
        <button 
          className="btn-primary" 
          onClick={handleExport}
          disabled={exportLoading || !projection}
        >
          {exportLoading ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
          {exportLoading ? 'Generating...' : t.actions.export + ' Audit PDF'}
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '32px', alignItems: 'start' }}>
        
        {/* Settings Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-card" style={{ background: '#FFF', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Waves size={20} color="var(--primary)" /> 1. {t.forms.selectPond}
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {activePonds.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedPondId(p.id); setInsight(null); }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: 'none',
                    background: selectedPond?.id === p.id ? 'var(--primary)' : 'var(--bg-mid)',
                    color: selectedPond?.id === p.id ? '#FFF' : 'var(--text-muted)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {p.pondName}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card" style={{ background: '#FFF', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={20} color="var(--primary)" /> 2. Manual Assumptions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>DAYS UNTIL HARVEST</label>
                <input type="number" value={daysToHarvest} onChange={e => { setDaysToHarvest(e.target.value); setInsight(null); }} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>EXPECTED MARKET PRICE ({currencyConfig.symbol}/KG)</label>
                <input type="number" step="0.1" value={expectedPrice} onChange={e => { setExpectedPrice(e.target.value); setInsight(null); }} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>EST. DAILY FEED COST ({currencyConfig.symbol})</label>
                <input type="number" value={dailyFeedCost} onChange={e => { setDailyFeedCost(e.target.value); setInsight(null); }} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>GROWTH RATE (ADG g/DAY)</label>
                  {projection?.historicalAdgGPerDay && projection.historicalAdgGPerDay > 0 && (
                    <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--primary)' }}>HISTORICAL: {projection.historicalAdgGPerDay.toFixed(2)}g</span>
                  )}
                </div>
                <input type="number" step="0.01" value={targetADG} onChange={e => { setTargetADG(e.target.value); setInsight(null); }} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>ASSUMED SURVIVAL (%)</label>
                  {projection && (
                    <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--primary)' }}>CONFIDENCE: {projection.survivalConfidence.toUpperCase()}</span>
                  )}
                </div>
                <input type="number" step="0.1" value={assumedSurvival} onChange={e => { setAssumedSurvival(e.target.value); setInsight(null); }} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>TARGET MARKET SIZE (G)</label>
                <input type="number" step="0.1" value={targetMarketSize} onChange={e => { setTargetMarketSize(e.target.value); setInsight(null); }} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Projections Display */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="glass-card" style={{ background: '#FFF', padding: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <TrendingUp size={22} color="var(--primary)" /> Projected Outcomes
            </h3>
            
            {projection ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  <div style={{ padding: '20px', borderRadius: '16px', background: 'var(--bg-mid)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px' }}>HARVEST DOC</div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--primary)' }}>{projection.futureDoc ?? '-'}</div>
                  </div>
                  <div style={{ padding: '20px', borderRadius: '16px', background: 'var(--bg-mid)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px' }}>PROJ. MBW</div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--primary)' }}>{projection.projectedMbwG?.toFixed(1) ?? '-'}g</div>
                  </div>
                  <div style={{ padding: '20px', borderRadius: '16px', background: 'var(--bg-mid)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px' }}>PROJ. BIOMASS</div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--primary)' }}>{projection.projectedBiomassKg?.toFixed(0) ?? '-'} kg</div>
                  </div>
                  <div style={{ padding: '20px', borderRadius: '16px', background: 'var(--bg-mid)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px' }}>ASSUMED ADG</div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--primary)' }}>{projection.assumedAdgGPerDay?.toFixed(2) ?? '-'}g</div>
                  </div>
                  <div style={{ padding: '20px', borderRadius: '16px', background: 'var(--bg-mid)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px' }}>ASSUMED SURVIVAL</div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--primary)' }}>{projection.assumedSurvivalPercent ?? '-'}%</div>
                  </div>
                  <div style={{ padding: '20px', borderRadius: '16px', background: 'var(--bg-mid)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px' }}>CONFIDENCE</div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--primary)' }}>{Math.round(projection.confidenceScore * 100)}%</div>
                  </div>
                </div>

                <div style={{ padding: '32px', borderRadius: '24px', background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)', border: '1px solid #BAE6FD' }}>
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>ESTIMATED GROSS REVENUE</div>
                    <div style={{ fontSize: '36px', fontWeight: 900, color: 'var(--text-primary)' }}>{formatCurrency(projection.projectedRevenue)}</div>
                  </div>
                  <div style={{ borderTop: '1px solid #BAE6FD', paddingTop: '24px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#059669', marginBottom: '4px' }}>PROJECTED PROFIT (MINUS FUTURE FEED)</div>
                    <div style={{ fontSize: '36px', fontWeight: 900, color: '#059669' }}>{formatCurrency(projection.projectedProfit)}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                {t.forms.selectPond || 'Please select a pond to begin.'}
              </div>
            )}
          </div>

          {/* Orson AI Card */}
          <div className="glass-card" style={{ background: '#FFF', padding: '32px', border: '2px solid #BAE6FD' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Sparkles size={24} color="#0EA5E9" />
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0369A1' }}>{t.sidebar.aiAssistant} Risk Analysis</h3>
              </div>
              {insight && <button onClick={() => setInsight(null)} style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>Recalculate</button>}
            </div>

            {insight ? (
              <div style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-primary)', background: '#F8FAFC', padding: '20px', borderRadius: '16px' }}>
                {insight}
              </div>
            ) : (
              <button 
                onClick={handleAskOrson}
                disabled={aiLoading || !projection}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '16px',
                  background: 'var(--gradient)',
                  color: '#FFF',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  opacity: (aiLoading || !projection) ? 0.7 : 1
                }}
              >
                {aiLoading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                {aiLoading ? 'Analyzing Trends...' : 'Analyze Financial Risk'}
              </button>
            )}
            {!insight && !aiLoading && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '16px' }}>
                Orson will evaluate your growth rates, market pricing, and biological risks.
              </p>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
