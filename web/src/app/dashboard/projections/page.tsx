"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Target, 
  TrendingUp, 
  Waves, 
  Sparkles, 
  Loader2, 
  Download,
  Pencil,
  Save,
  X,
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useGemini } from '@/hooks/useGemini';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { calculateOrsonHarvestProjection } from '../../../../../orson/harvestProjection';
import { createDefaultOrsonCalibration, normalizeOrsonCalibration } from '../../../../../orson/learning';
import type { OrsonCalibrationProfile } from '../../../../../orson/types';
import { filterActiveCyclePonds } from '@/lib/pondLifecycle';
import { calculatePondMetricsWithHarvest } from '../../../../../shared/pondCalculations';
import { getFarmDateKey } from '../../../../../shared/farmDate';
import { escapeReportText } from '../../../../../shared/reportingIntegrity';
import {
  formatPdfDate,
  localizePdfHtml,
} from '../../../../../shared/pdfReportI18n';
import {
  buildDailyFeedTotalsForPond,
  buildPondProfitabilityCostSnapshot,
  calculateHarvestProfitability,
  calculateRecordedDailyMortalityRate,
  type ExpenseCostLike,
  type InventoryItemWithUsage,
  type PriceTier,
} from '../../../../../shared/harvestProfitability';
import {
  HARVEST_MARKET_SIZE_TIERS,
  buildPersistedHarvestMarketPrices,
  createEmptyHarvestMarketPriceInputs,
  harvestMarketPriceInputsEqual,
  normalizeHarvestMarketPriceInputs,
  type HarvestMarketPriceInputs,
} from '../../../../../shared/harvestProjectionSettings';
import { useFarmPermissions } from '@/hooks/useFarmPermissions';
import { useDashboardCopy } from '@/hooks/useDashboardCopy';
import styles from './ProjectionsPage.module.css';

/* --- Types --------------------------------------------------- */
interface Pond {
  id: string;
  pondName: string;
  docStart: string;
  initialPopulation: number;
  initialStock?: number;
  initialWeight?: number;
  samplings: Array<Record<string, unknown>>;
  mortalityRecords?: Array<Record<string, unknown>>;
  cycleId?: string;
  pondCycleId?: string;
  cycleStatus?: 'active' | 'ended';
  cycleStartedAt?: string;
  cycleEndedAt?: string;
}

interface DashboardUser {
  uid: string;
  companyId?: string;
  role?: string;
  permissionOverrides?: unknown;
}

interface Company {
  id: string;
  companyName?: string;
  timeZone?: string;
  ownerId?: string;
  harvestProjectionMarketPrices?: Record<string, number>;
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
  operatingComparison: {
    decision: 'harvest_now' | 'keep_growing' | 'review_data';
    decisionReason: string;
    currentSizeCountPerKg: number;
    feedDailyIncreaseRatePercent: number;
    dailyMortalityRatePercent: number;
    mortalityRecordedDays: number;
    todayRevenue: number;
    todayOperatingProfit: number;
    bestTargetSizeCountPerKg: number;
    bestDaysFromNow: number;
    bestRevenue: number;
    bestOperatingProfit: number;
    incrementalProfit: number;
    costsToDate: {
      feed: number;
      additives: number;
      generalExpenses: number;
      other: number;
    };
    futureCosts: {
      feed: number;
      additives: number;
      generalExpenses: number;
      other: number;
    };
    inventoryPurchasesExcluded: boolean;
    dataQualityWarning: boolean;
  };
}

type Html2PdfWorker = {
  from: (element: HTMLElement) => {
    set: (options: unknown) => {
      save: () => Promise<void>;
    };
  };
};

type Html2PdfFactory = () => Html2PdfWorker;

const totalScenarioCosts = (costs: { feed: number; additives: number; generalExpenses: number; other: number }) =>
  costs.feed + costs.additives + costs.generalExpenses + costs.other;

export default function HarvestProjectionsPage() {
  const copy = useDashboardCopy();
  const { t, currentLanguage } = useLanguage();
  const { formatCurrency, currencyConfig } = useCurrency();
  
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [selectedPondId, setSelectedPondId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [cycles, setCycles] = useState<FarmCycle[]>([]);
  const [feeds, setFeeds] = useState<InventoryItemWithUsage[]>([]);
  const [additives, setAdditives] = useState<InventoryItemWithUsage[]>([]);
  const [expenses, setExpenses] = useState<ExpenseCostLike[]>([]);
  const [financeDataWarning, setFinanceDataWarning] = useState<string | null>(null);
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
  
  const [marketPrices, setMarketPrices] = useState<HarvestMarketPriceInputs>(createEmptyHarvestMarketPriceInputs);
  const [savedMarketPrices, setSavedMarketPrices] = useState<HarvestMarketPriceInputs>(createEmptyHarvestMarketPriceInputs);
  const [isEditingPrices, setIsEditingPrices] = useState(true);
  const [priceSaveStatus, setPriceSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [priceSaveError, setPriceSaveError] = useState<string | null>(null);
  
  // AI State
  const { sendMessage, loading: aiLoading } = useGemini();
  const [insight, setInsight] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeUser: (() => void) | undefined;
    let unsubscribeCompany: (() => void) | undefined;
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        unsubscribeUser?.();
        unsubscribeUser = onSnapshot(doc(db, 'users', firebaseUser.uid), (uDoc) => {
          if (uDoc.exists()) {
            const userData = uDoc.data();
            setUser({ ...userData, uid: firebaseUser.uid });
            if (userData.companyId) {
              unsubscribeCompany?.();
              unsubscribeCompany = onSnapshot(doc(db, 'companies', userData.companyId), (cDoc) => {
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
    return () => {
      unsubAuth();
      unsubscribeUser?.();
      unsubscribeCompany?.();
    };
  }, []);

  useEffect(() => {
    if (!company?.id) return;
    const normalized = normalizeHarvestMarketPriceInputs(company.harvestProjectionMarketPrices);
    const hasSavedPrices = Object.values(normalized).some((value) => value !== '');
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setMarketPrices(normalized);
      setSavedMarketPrices(normalized);
      setIsEditingPrices(!hasSavedPrices);
      setPriceSaveStatus('idle');
      setPriceSaveError(null);
    });
    return () => {
      cancelled = true;
    };
  }, [company?.id, company?.harvestProjectionMarketPrices]);

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
    const unsubFeeds = onSnapshot(collection(db, 'companies', companyId, 'feeds'), (snapshot) => {
      setFeeds(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as InventoryItemWithUsage)));
    }, (error) => console.error('Error fetching feed costs in projections:', error));
    const unsubAdditives = onSnapshot(collection(db, 'companies', companyId, 'additives'), (snapshot) => {
      setAdditives(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as InventoryItemWithUsage)));
    }, (error) => console.error('Error fetching additive costs in projections:', error));
    const unsubExpenses = onSnapshot(collection(db, 'companies', companyId, 'expenses'), (snapshot) => {
      setExpenses(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as ExpenseCostLike)));
      setFinanceDataWarning(null);
    }, (error) => {
      console.error('Error fetching expenses in projections:', error);
      setFinanceDataWarning('General expenses could not be loaded. Review the result before using it.');
    });
    return () => {
      unsubFeeds();
      unsubAdditives();
      unsubExpenses();
    };
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

  const hasPermission = useFarmPermissions();
  const canManagePriceLadder = hasPermission('manageFinance');
  const canUseOrson = hasPermission('useOrson');
  const canViewProjection = hasPermission('viewFinance') && hasPermission('viewReports');
  const canExportReports = canViewProjection && hasPermission('exportReports');
  const hasSavedPriceLadder = Object.values(savedMarketPrices).some((value) => value !== '');
  const hasUnsavedPriceChanges = !harvestMarketPriceInputsEqual(marketPrices, savedMarketPrices);

  const priceLadder = useMemo<PriceTier[]>(() => HARVEST_MARKET_SIZE_TIERS
    .map((sizeCountPerKg) => ({ sizeCountPerKg, pricePerKg: Number(savedMarketPrices[sizeCountPerKg]) }))
    .filter((tier) => Number.isFinite(tier.pricePerKg) && tier.pricePerKg > 0), [savedMarketPrices]);

  const financialComparison = useMemo(() => {
    if (!selectedPond || priceLadder.length === 0) return null;
    const today = getFarmDateKey(new Date(), company?.timeZone);
    const cycleStart = selectedPond.cycleStartedAt || selectedPond.docStart || today;
    const metrics = calculatePondMetricsWithHarvest(selectedPond, company?.timeZone);
    const costSnapshot = buildPondProfitabilityCostSnapshot({
      pond: selectedPond,
      ponds,
      feeds,
      additives,
      expenses,
      startDate: cycleStart,
      endDate: today,
      timeZone: company?.timeZone,
    });
    const mortality = calculateRecordedDailyMortalityRate({
      records: selectedPond.mortalityRecords || [],
      currentPopulation: metrics.currentPopulation,
      timeZone: company?.timeZone,
    });
    const result = calculateHarvestProfitability({
      currentPopulation: metrics.currentPopulation,
      initialPopulation: Number(selectedPond.initialPopulation || selectedPond.initialStock || 0),
      currentMbwG: metrics.latestMbw,
      currentSurvivalRatePercent: metrics.adjustedSR,
      adgGPerDay: metrics.adg,
      historicalFcr: metrics.biomassGainFCR > 0 ? metrics.biomassGainFCR : metrics.adjustedFCR,
      dailyMortalityRatePercent: mortality.dailyRatePercent,
      fallbackDailyMortalityRatePercent: metrics.biomassEstimate.expectedDailyMortalityRatePercent,
      recentDailyFeedTotals: buildDailyFeedTotalsForPond(feeds, selectedPond.id, company?.timeZone),
      feedUnitCostPerKg: costSnapshot.feedUnitCostPerKg,
      priceLadder,
      costsToDate: costSnapshot.costsToDate,
      projectedDailyAdditiveCost: costSnapshot.projectedDailyAdditiveCost,
      projectedDailyGeneralExpense: costSnapshot.projectedDailyGeneralExpense,
      timeZone: company?.timeZone,
    });
    return { result, costSnapshot, mortality };
  }, [selectedPond, priceLadder, company?.timeZone, ponds, feeds, additives, expenses]);

  const financialDecisionReason = useMemo(() => {
    if (!financialComparison) return '';
    const { result } = financialComparison;
    if (result.decision === 'keep_growing') {
      return (t.harvestProjectionScreen?.keepGrowingReason || 'Target size {{size}} is projected to improve operating profit by {{amount}}.')
        .replace('{{size}}', String(result.bestScenario.targetSizeCountPerKg))
        .replace('{{amount}}', formatCurrency(result.bestScenario.incrementalProfitVsToday));
    }
    if (result.decision === 'harvest_now') {
      return t.harvestProjectionScreen?.harvestNowReason || 'Harvesting now has equal or higher projected operating profit than the reachable larger sizes.';
    }
    return t.harvestProjectionScreen?.reviewDataReason || 'Critical population, MBW, or market-price data is missing.';
  }, [financialComparison, formatCurrency, t.harvestProjectionScreen]);

  const projection = useMemo(() => {
    if (!selectedPond || !financialComparison) return null;
    const bestScenario = financialComparison.result.bestScenario;

    return calculateOrsonHarvestProjection({
      pond: selectedPond,
      daysToHarvest: bestScenario.daysFromNow,
      expectedPricePerKg: bestScenario.pricePerKg,
      dailyFeedCost: bestScenario.daysFromNow > 0
        ? bestScenario.futureCosts.feed / bestScenario.daysFromNow
        : 0,
      targetAdgGPerDay: null,
      assumedSurvivalPercent: bestScenario.projectedSurvivalRatePercent,
      targetMarketSizeG: bestScenario.targetMbwG,
      calibration,
      timeZone: company?.timeZone,
    });
  }, [selectedPond, financialComparison, calibration, company?.timeZone]);

  const handleSavePrices = async () => {
    if (!company?.id || !user?.uid || !canManagePriceLadder) return;
    setPriceSaveStatus('saving');
    setPriceSaveError(null);
    try {
      const persisted = buildPersistedHarvestMarketPrices(marketPrices);
      await updateDoc(doc(db, 'companies', company.id), {
        harvestProjectionMarketPrices: persisted,
        harvestProjectionMarketPricesUpdatedAt: serverTimestamp(),
        harvestProjectionMarketPricesUpdatedBy: user.uid,
      });
      const normalized = normalizeHarvestMarketPriceInputs(persisted);
      setSavedMarketPrices(normalized);
      setMarketPrices(normalized);
      setIsEditingPrices(false);
      setPriceSaveStatus('saved');
      setInsight(null);
    } catch (error) {
      console.error('Failed to save harvest market prices:', error);
      setPriceSaveStatus('error');
      setPriceSaveError(error instanceof Error ? error.message : 'Unable to save market prices.');
    }
  };

  const handleCancelPriceEdit = () => {
    setMarketPrices(savedMarketPrices);
    setIsEditingPrices(false);
    setPriceSaveStatus('idle');
    setPriceSaveError(null);
  };

  const handleAskOrson = async () => {
    if (!canUseOrson) return;
    if (!selectedPond || !projection) return;
    const prompt = `Please provide a risk analysis for this harvest projection:
Pond: ${selectedPond.pondName}
Current DOC: ${projection.currentDoc} | Projected DOC: ${projection.futureDoc}
Current MBW: ${projection.currentMbwG ?? 'unknown'}g | Projected MBW: ${projection.projectedMbwG?.toFixed(2) ?? 'unknown'}g
Historical ADG: ${projection.historicalAdgGPerDay ?? 'unknown'}g/day | Assumed ADG: ${projection.assumedAdgGPerDay ?? 'unknown'}g/day
Assumed survival: ${projection.assumedSurvivalPercent ?? 'unknown'}% (${projection.survivalConfidence} confidence)
Projected FCR: ${projection.projectedFcr ?? 'unknown'} | Market size status: ${projection.marketSizeRisk}
${financialComparison ? `Harvest-today operating profit: ${formatCurrency(financialComparison.result.today.operatingProfit)}
Best scenario: ${financialComparison.result.bestScenario.kind === 'today' ? 'Harvest now' : `Size ${financialComparison.result.bestScenario.targetSizeCountPerKg}`} — ${formatCurrency(financialComparison.result.bestScenario.operatingProfit)}
Decision: ${financialComparison.result.decision} — ${financialComparison.result.decisionReason}
Market price ladder: ${priceLadder.map((tier) => `${tier.sizeCountPerKg}=${formatCurrency(tier.pricePerKg)}/kg`).join(', ')}` : 'Comprehensive operating-profit comparison is waiting for market price inputs.'}
Projection confidence: ${(projection.confidenceScore * 100).toFixed(0)}%
Structured risks: ${projection.risks.map((risk) => `${risk.severity}: ${risk.summary}`).join('; ') || 'none'}

Give a concise recommendation based on the operating-profit comparison and Orson's structured projection risk. Do not use the legacy feed-only profit calculation.
Respond in ${currentLanguage === 'id' ? 'Indonesian' : currentLanguage === 'th' ? 'Thai' : currentLanguage === 'vi' ? 'Vietnamese' : currentLanguage === 'zh' ? 'Simplified Chinese' : 'English'}.`;

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
    const { pondName, futureDoc, projectedMbwG, projectedBiomassKg, insight, companyName, confidenceScore, assumedSurvivalPercent, survivalConfidence, projectedFcr, marketSizeRisk, risks = [], operatingComparison } = data;
    const decisionTitle = operatingComparison.decision === 'keep_growing'
      ? 'Keep Growing'
      : operatingComparison.decision === 'harvest_now'
        ? 'Harvest Now'
        : 'Review Data';
    return localizePdfHtml(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Plus Jakarta Sans', Arial, sans-serif; padding: 40px; color: #2C3E50; background: #ffffff; font-size: 14px; line-height: 1.6; }
          .header { margin-bottom: 30px; }
          .title { font-size: 32px; font-weight: 600; color: #E74C3C; margin-bottom: 8px; }
          .company-name { font-size: 15px; color: #2C3E50; margin-bottom: 4px; font-weight: 600; }
          .divider { height: 3px; background: linear-gradient(to right, #E74C3C, #F39C12); margin: 20px 0; border-radius: 2px; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
          .card { background: #F8FAFB; padding: 15px; border-radius: 8px; text-align: center; border-bottom: 3px solid #E74C3C; }
          .label { font-size: 10px; color: #64748B; text-transform: uppercase; margin-bottom: 4px; }
          .value { font-size: 20px; font-weight: 600; color: #2C3E50; }
          .financial-card { background: #F0F9FF; padding: 25px; border-radius: 12px; border-left: 5px solid #3282B8; margin-bottom: 25px; }
          .profit { color: #10B981; font-size: 36px; font-weight: 600; }
          .section { margin-top: 24px; page-break-inside: avoid; }
          .section-title { font-size: 18px; font-weight: 600; color: #0F4C75; margin-bottom: 10px; }
          .comparison { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px; }
          .scenario { background: #FFFFFF; border: 1px solid #BAE6FD; border-radius: 10px; padding: 16px; }
          .table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          .table td { border-bottom: 1px solid #E2E8F0; padding: 8px 4px; }
          .table td:last-child { text-align: right; font-weight: 600; }
          .note { font-size: 12px; color: #64748B; margin-top: 10px; }
          .warning { background: #FFFBEB; border: 1px solid #FDE68A; color: #92400E; padding: 12px; border-radius: 8px; margin-top: 10px; }
          .orson-box { background: #FFFBEA; border: 1px solid #FDE68A; padding: 20px; border-radius: 12px; margin-top: 30px; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #64748B; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Financial Harvest Projection</div>
          <div class="company-name">${escapeReportText(companyName)}</div>
          <div style="font-size: 14px; color: #4A5568;">Pond: ${escapeReportText(pondName)} | Generated on ${formatPdfDate(new Date(), currentLanguage)}</div>
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
          <div class="label">Recommended action</div>
          <div class="profit">${decisionTitle}</div>
          <div style="margin-top: 8px; color: #334155;">${escapeReportText(operatingComparison.decisionReason)}</div>
          <div class="comparison">
            <div class="scenario">
              <div class="label">Harvest today</div>
              <div class="value">${formatCurrency(operatingComparison.todayOperatingProfit)}</div>
              <div class="note">Revenue: ${formatCurrency(operatingComparison.todayRevenue)}</div>
            </div>
            <div class="scenario">
              <div class="label">Best projected scenario</div>
              <div class="value">${formatCurrency(operatingComparison.bestOperatingProfit)}</div>
              <div class="note">Size ${operatingComparison.bestTargetSizeCountPerKg} in ${operatingComparison.bestDaysFromNow} days; revenue ${formatCurrency(operatingComparison.bestRevenue)}</div>
            </div>
          </div>
        </div>
        <div class="section">
          <div class="section-title">Cost Basis</div>
          <table class="table">
            <tr><td>Consumed feed to date</td><td>${formatCurrency(operatingComparison.costsToDate.feed)}</td></tr>
            <tr><td>Consumed additives to date</td><td>${formatCurrency(operatingComparison.costsToDate.additives)}</td></tr>
            <tr><td>Allocated general expenses to date</td><td>${formatCurrency(operatingComparison.costsToDate.generalExpenses)}</td></tr>
            <tr><td>Projected future feed at best scenario</td><td>${formatCurrency(operatingComparison.futureCosts.feed)}</td></tr>
            <tr><td>Projected future additives at best scenario</td><td>${formatCurrency(operatingComparison.futureCosts.additives)}</td></tr>
            <tr><td>Projected future general expenses at best scenario</td><td>${formatCurrency(operatingComparison.futureCosts.generalExpenses)}</td></tr>
          </table>
          ${operatingComparison.inventoryPurchasesExcluded ? '<div class="note">Unused feed and additive inventory is excluded. Only recorded consumption is treated as production cost.</div>' : ''}
        </div>
        <div class="section">
          <div class="section-title">Key Assumptions and Sensitivities</div>
          <table class="table">
            <tr><td>Current market size</td><td>${operatingComparison.currentSizeCountPerKg} count/kg</td></tr>
            <tr><td>Feed change benchmark</td><td>${operatingComparison.feedDailyIncreaseRatePercent.toFixed(2)}% per day</td></tr>
            <tr><td>Mortality benchmark</td><td>${operatingComparison.dailyMortalityRatePercent.toFixed(4)}% per day</td></tr>
            <tr><td>Mortality data coverage</td><td>${operatingComparison.mortalityRecordedDays} recorded days</td></tr>
            <tr><td>Projected FCR</td><td>${projectedFcr ?? 'Not available'}</td></tr>
            <tr><td>Survival assumption</td><td>${assumedSurvivalPercent ?? 'Not available'}%</td></tr>
          </table>
          <div class="note">The recommendation changes if selling prices, feed cost, ADG, mortality, or allocated operating expenses differ from the recorded trend.</div>
          ${operatingComparison.dataQualityWarning ? '<div class="warning">Some projection inputs are incomplete. Review source records and recalculate after the next sampling, feed, mortality, or expense update.</div>' : ''}
        </div>
        <div class="orson-box">
          <div style="font-weight: 600; color: #92400E; margin-bottom: 8px;">Orson AI Risk Analysis:</div>
          <div style="font-style: italic; color: #451a03;">"${escapeReportText(insight || 'No AI analysis performed for this projection.')}"</div>
          <div style="margin-top: 10px; color: #451a03;">Survival confidence: ${escapeReportText(survivalConfidence)}. Market size status: ${escapeReportText(marketSizeRisk)}.</div>
          <div style="margin-top: 14px; font-weight: 600; color: #92400E;">Structured Projection Risks</div>
          <ul style="margin-top: 8px; padding-left: 18px; color: #451a03;">
            ${risks.length > 0 ? risks.map((risk: ProjectionRisk) => `<li><strong>${escapeReportText(risk.severity)}:</strong> ${escapeReportText(risk.summary)}</li>`).join('') : '<li>No projection-specific risks were detected from the available data.</li>'}
          </ul>
        </div>
        <div class="footer">This projection is based on available app data and user-entered market prices. Actual results may vary due to market price, survival, feed cost, disease events, harvest timing, and operating conditions. Generated by Shrimply.</div>
      </body>
      </html>
    `, currentLanguage);
  };

  const handleExport = async () => {
    if (!canExportReports || !selectedPond || !projection || !financialComparison) return;
    setExportLoading(true);
    try {
      const html2pdf = ((await import('html2pdf.js')) as { default: Html2PdfFactory }).default;
      const html = generateProjectionHTML({
        ...projection,
        pondName: selectedPond.pondName,
        companyName: company?.companyName || 'My Farm',
        insight: insight,
        operatingComparison: {
          decision: financialComparison.result.decision,
          decisionReason: financialDecisionReason,
          currentSizeCountPerKg: financialComparison.result.currentSizeCountPerKg,
          feedDailyIncreaseRatePercent: financialComparison.result.feedDailyIncreaseRatePercent,
          dailyMortalityRatePercent: financialComparison.result.dailyMortalityRatePercent,
          mortalityRecordedDays: financialComparison.mortality.recordedDays,
          todayRevenue: financialComparison.result.today.revenue,
          todayOperatingProfit: financialComparison.result.today.operatingProfit,
          bestTargetSizeCountPerKg: financialComparison.result.bestScenario.targetSizeCountPerKg,
          bestDaysFromNow: financialComparison.result.bestScenario.daysFromNow,
          bestRevenue: financialComparison.result.bestScenario.revenue,
          bestOperatingProfit: financialComparison.result.bestScenario.operatingProfit,
          incrementalProfit: financialComparison.result.bestScenario.incrementalProfitVsToday,
          costsToDate: financialComparison.result.today.totalCosts,
          futureCosts: financialComparison.result.bestScenario.futureCosts,
          inventoryPurchasesExcluded: financialComparison.costSnapshot.excludedInventoryPurchaseIds.length > 0,
          dataQualityWarning: financialComparison.costSnapshot.warnings.length > 0 || financialComparison.result.warnings.length > 0 || financialComparison.mortality.recordedDays === 0 || Boolean(financeDataWarning),
        },
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

  if (!canViewProjection) return <div role="alert">You do not have permission to view financial reports.</div>;
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><Loader2 className="animate-spin" size={40} color="var(--primary)" /></div>;

  return (
    <div className="dashboard-page authenticated-compact-page business-dashboard-page">
      <div className="dashboard-action-row">
        <button 
          className="btn-primary" 
          onClick={handleExport}
          disabled={!canExportReports || exportLoading || !projection || !financialComparison}
        >
          {exportLoading ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
          {exportLoading ? 'Generating...' : t.actions.export + ' Audit PDF'}
        </button>
      </div>
      <div className={styles.mainGrid} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '32px', alignItems: 'start' }}>
        
        {/* Settings Card */}
        <div className={styles.settingsColumn} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-card" style={{ background: '#FFF', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={20} color="var(--primary)" /> {t.harvestProjectionScreen?.marketPriceLadder || '2. Market Price by Size'}
            </h3>
            <p style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--text-muted)', marginBottom: '16px' }}>
              {t.harvestProjectionScreen?.marketPriceHelp || 'Save the farm-gate price per kg for each size. Saved prices are reused for every pond until edited.'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
              {HARVEST_MARKET_SIZE_TIERS.map((size) => (
                <label key={size} style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>
                  {size} {t.harvestProjectionScreen?.countPerKg || 'count/kg'}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={marketPrices[size]}
                    disabled={!isEditingPrices || !canManagePriceLadder}
                    placeholder={`${currencyConfig.symbol}/kg`}
                    onChange={(event) => {
                      setMarketPrices((current) => ({ ...current, [size]: event.target.value }));
                      setPriceSaveStatus('idle');
                      setPriceSaveError(null);
                      setInsight(null);
                    }}
                    style={{ width: '100%', padding: '10px', borderRadius: '9px', border: '1px solid var(--border)', background: isEditingPrices ? 'var(--bg-mid)' : '#FFF', outline: 'none', opacity: canManagePriceLadder ? 1 : 0.75 }}
                  />
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '18px', flexWrap: 'wrap' }}>
              {canManagePriceLadder && isEditingPrices && (
                <>
                  <button
                    className="btn-primary"
                    onClick={handleSavePrices}
                    disabled={priceSaveStatus === 'saving' || !hasUnsavedPriceChanges}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}
                  >
                    {priceSaveStatus === 'saving' ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    {priceSaveStatus === 'saving'
                      ? (t.harvestProjectionScreen?.savingPrices || 'Saving...')
                      : (t.harvestProjectionScreen?.savePrices || 'Save prices')}
                  </button>
                  {hasSavedPriceLadder && (
                    <button className="btn-secondary" onClick={handleCancelPriceEdit} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                      <X size={16} /> {t.actions.cancel || 'Cancel'}
                    </button>
                  )}
                </>
              )}
              {canManagePriceLadder && !isEditingPrices && (
                <button className="btn-secondary" onClick={() => { setIsEditingPrices(true); setPriceSaveStatus('idle'); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                  <Pencil size={16} /> {t.harvestProjectionScreen?.editPrices || 'Edit prices'}
                </button>
              )}
              {priceSaveStatus === 'saved' && <span style={{ fontSize: '12px', fontWeight: 600, color: '#059669' }}>{t.harvestProjectionScreen?.pricesSaved || 'Prices saved.'}</span>}
              {priceSaveError && <span style={{ fontSize: '12px', fontWeight: 600, color: '#B91C1C' }}>{t.harvestProjectionScreen?.priceSaveError || priceSaveError}</span>}
              {!canManagePriceLadder && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.harvestProjectionScreen?.priceEditRestricted || 'Only owners and finance managers can edit saved prices.'}</span>}
            </div>
          </div>
        </div>

        {/* Projections Display */}
        <div className={styles.resultsColumn} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="glass-card" style={{ background: '#FFF', padding: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <TrendingUp size={22} color="var(--primary)" /> {t.harvestProjectionScreen?.step3 || '3. Financial Projected Outcomes'}
            </h3>

            {!selectedPond ? (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>{t.forms.selectPond || 'Please select a pond to begin.'}</div>
            ) : !hasSavedPriceLadder ? (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                {t.harvestProjectionScreen?.priceRequired || 'Save at least one market price to calculate harvest-today versus target-size operating profit.'}
              </div>
            ) : financialComparison && projection ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                <div style={{ padding: '28px', borderRadius: '22px', background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)', border: '1px solid #BAE6FD' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0369A1', textTransform: 'uppercase' }}>
                    {financialComparison.result.decision === 'keep_growing'
                      ? (t.harvestProjectionScreen?.keepGrowing || 'Keep Growing')
                      : financialComparison.result.decision === 'harvest_now'
                        ? (t.harvestProjectionScreen?.harvestNow || 'Harvest Now')
                        : (t.harvestProjectionScreen?.reviewData || 'Review Data')}
                  </div>
                  <div style={{ fontSize: '14px', color: '#334155', marginTop: '6px' }}>{financialDecisionReason}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '14px' }}>
                  <div style={{ padding: '18px', borderRadius: '16px', background: 'var(--bg-mid)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>{t.harvestProjectionScreen?.harvestTodayProfit || 'HARVEST-TODAY PROFIT'}</div>
                    <div style={{ fontSize: '25px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '7px' }}>{formatCurrency(financialComparison.result.today.operatingProfit)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>{t.harvestProjectionScreen?.revenue || 'Revenue'}: {formatCurrency(financialComparison.result.today.revenue)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{t.harvestProjectionScreen?.totalCosts || 'Total costs'}: {formatCurrency(totalScenarioCosts(financialComparison.result.today.totalCosts))}</div>
                  </div>
                  <div style={{ padding: '18px', borderRadius: '16px', background: '#ECFDF5' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#047857' }}>
                      {financialComparison.result.bestScenario.kind === 'today'
                        ? (t.harvestProjectionScreen?.bestOption || 'BEST OPTION')
                        : `${t.harvestProjectionScreen?.targetSize || 'TARGET SIZE'} ${financialComparison.result.bestScenario.targetSizeCountPerKg}`}
                    </div>
                    <div style={{ fontSize: '25px', fontWeight: 600, color: '#059669', marginTop: '7px' }}>{formatCurrency(financialComparison.result.bestScenario.operatingProfit)}</div>
                    <div style={{ fontSize: '11px', color: '#047857', marginTop: '6px' }}>{financialComparison.result.bestScenario.daysFromNow} {t.harvestProjectionScreen?.days || 'days'} · {t.harvestProjectionScreen?.revenue || 'Revenue'} {formatCurrency(financialComparison.result.bestScenario.revenue)}</div>
                    <div style={{ fontSize: '11px', color: '#047857', marginTop: '2px' }}>{t.harvestProjectionScreen?.totalCosts || 'Total costs'}: {formatCurrency(totalScenarioCosts(financialComparison.result.bestScenario.totalCosts))}</div>
                  </div>
                  <div style={{ padding: '18px', borderRadius: '16px', background: financialComparison.result.bestScenario.incrementalProfitVsToday >= 0 ? '#EFF6FF' : '#FEF2F2' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>{t.harvestProjectionScreen?.profitDifference || 'PROFIT DIFFERENCE'}</div>
                    <div style={{ fontSize: '25px', fontWeight: 600, color: financialComparison.result.bestScenario.incrementalProfitVsToday >= 0 ? '#2563EB' : '#DC2626', marginTop: '7px' }}>
                      {formatCurrency(financialComparison.result.bestScenario.incrementalProfitVsToday)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>{t.harvestProjectionScreen?.versusHarvestToday || 'versus harvesting today'}</div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>{t.harvestProjectionScreen?.sizeComparison || 'Profit by harvest size'}</div>
                  <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '14px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '650px', fontSize: '12px' }}>
                      <thead style={{ background: 'var(--bg-mid)', color: 'var(--text-muted)' }}>
                        <tr>
                          <th style={{ padding: '11px', textAlign: 'left' }}>{t.harvestProjectionScreen?.harvestSize || 'Harvest size'}</th>
                          <th style={{ padding: '11px', textAlign: 'right' }}>{t.harvestProjectionScreen?.days || 'Days'}</th>
                          <th style={{ padding: '11px', textAlign: 'right' }}>{t.harvestProjectionScreen?.revenue || 'Revenue'}</th>
                          <th style={{ padding: '11px', textAlign: 'right' }}>{t.harvestProjectionScreen?.totalCosts || 'Total costs'}</th>
                          <th style={{ padding: '11px', textAlign: 'right' }}>{t.harvestProjectionScreen?.operatingProfit || 'Operating profit'}</th>
                          <th style={{ padding: '11px', textAlign: 'right' }}>{t.harvestProjectionScreen?.changeVsToday || 'Change vs today'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[financialComparison.result.today, ...financialComparison.result.targets].map((scenario) => (
                          <tr key={`${scenario.kind}-${scenario.targetSizeCountPerKg}`} style={{ borderTop: '1px solid var(--border)', background: scenario === financialComparison.result.bestScenario ? '#ECFDF5' : '#FFF' }}>
                            <td style={{ padding: '11px', fontWeight: 600 }}>{scenario.kind === 'today' ? `${t.harvestProjectionScreen?.today || 'Today'} (${scenario.targetSizeCountPerKg})` : scenario.targetSizeCountPerKg}</td>
                            <td style={{ padding: '11px', textAlign: 'right' }}>{scenario.daysFromNow}</td>
                            <td style={{ padding: '11px', textAlign: 'right' }}>{formatCurrency(scenario.revenue)}</td>
                            <td style={{ padding: '11px', textAlign: 'right' }}>{formatCurrency(totalScenarioCosts(scenario.totalCosts))}</td>
                            <td style={{ padding: '11px', textAlign: 'right', fontWeight: 600, color: scenario.operatingProfit >= 0 ? '#059669' : '#DC2626' }}>{formatCurrency(scenario.operatingProfit)}</td>
                            <td style={{ padding: '11px', textAlign: 'right', color: scenario.incrementalProfitVsToday >= 0 ? '#2563EB' : '#DC2626' }}>{formatCurrency(scenario.incrementalProfitVsToday)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                  <div style={{ padding: '16px', borderRadius: '14px', background: 'var(--bg-mid)', textAlign: 'center' }}><div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>{t.harvestProjectionScreen?.harvestDOC || 'HARVEST DOC'}</div><div style={{ fontSize: '20px', fontWeight: 600, marginTop: '5px' }}>{projection.futureDoc ?? '-'}</div></div>
                  <div style={{ padding: '16px', borderRadius: '14px', background: 'var(--bg-mid)', textAlign: 'center' }}><div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>{t.harvestProjectionScreen?.projBiomass || 'PROJ. BIOMASS'}</div><div style={{ fontSize: '20px', fontWeight: 600, marginTop: '5px' }}>{financialComparison.result.bestScenario.projectedBiomassKg.toFixed(0)} kg</div></div>
                  <div style={{ padding: '16px', borderRadius: '14px', background: 'var(--bg-mid)', textAlign: 'center' }}><div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>{t.harvestProjectionScreen?.projectedSurvival || 'PROJECTED SURVIVAL'}</div><div style={{ fontSize: '20px', fontWeight: 600, marginTop: '5px' }}>{financialComparison.result.bestScenario.projectedSurvivalRatePercent.toFixed(1)}%</div></div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', fontSize: '12px', lineHeight: 1.8, color: 'var(--text-muted)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{t.harvestProjectionScreen?.costsIncluded || 'Costs included to date'}</strong><br />
                  {t.inventory?.feeds || 'Feed'}: {formatCurrency(financialComparison.costSnapshot.costsToDate.feed)} · {t.inventory?.additives || 'Additives'}: {formatCurrency(financialComparison.costSnapshot.costsToDate.additives)}<br />
                  {t.harvestProjectionScreen?.generalExpenses || 'Allocated general expenses'}: {formatCurrency(financialComparison.costSnapshot.costsToDate.generalExpenses)}<br />
                  {t.harvestProjectionScreen?.feedTrend || 'Daily feed trend'}: {financialComparison.result.feedDailyIncreaseRatePercent.toFixed(2)}% · {t.harvestProjectionScreen?.mortalityTrend || 'Daily mortality benchmark'}: {financialComparison.result.dailyMortalityRatePercent.toFixed(4)}%
                  {financialComparison.costSnapshot.excludedInventoryPurchaseIds.length > 0 && <div style={{ color: '#92400E' }}>• {t.harvestProjectionScreen?.inventorySafeguard || 'Unused inventory is excluded; only consumed feed and additives are counted.'}</div>}
                  {(financialComparison.costSnapshot.warnings.length > 0 || financialComparison.result.warnings.length > 0 || financialComparison.mortality.recordedDays === 0) && <div style={{ color: '#92400E' }}>• {t.harvestProjectionScreen?.dataQualityWarning || 'Some projection inputs are incomplete. Review the recorded data before deciding.'}</div>}
                  {financeDataWarning && <div style={{ color: '#92400E' }}>• {t.harvestProjectionScreen?.financeLoadWarning || 'General expenses could not be loaded. Review the result before using it.'}</div>}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>{t.harvestProjectionScreen?.dataQualityWarning || 'Projection data is still loading or incomplete.'}</div>
            )}
          </div>

          {/* Orson AI Card */}
          {canUseOrson && <div className="glass-card" style={{ background: '#FFF', padding: '32px', border: '2px solid #BAE6FD' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Sparkles size={24} color="#0EA5E9" />
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0369A1' }}>{t.sidebar.aiAssistant} {copy('Risk Analysis')}</h3>
              </div>
              {insight && <button onClick={() => setInsight(null)} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>{copy('Recalculate')}</button>}
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
                  background: '#0F4C75',
                  color: '#FFF',
                  border: 'none',
                  fontWeight: 600,
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
                {copy(aiLoading ? 'Analyzing Trends...' : 'Analyze Financial Risk')}
              </button>
            )}
            {!insight && !aiLoading && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '16px' }}>
                {copy('Orson will evaluate your growth rates, market pricing, and biological risks.')}
              </p>
            )}
          </div>}

        </div>

      </div>

    </div>
  );
}
