import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePondStore, isPondCycleActive } from './store/pondStore';
import { useGemini } from './hooks/useGemini';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import { calculateOrsonHarvestProjection } from '../orson/harvestProjection';
import { createDefaultOrsonCalibration, normalizeOrsonCalibration } from '../orson/learning';
import type { OrsonCalibrationProfile } from '../orson/types';
import { doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useFeedAdditiveStore } from './store/feedAdditiveStore';
import { financeService, type Expense } from './services/financeService';
import { calculatePondMetricsWithHarvest } from '../shared/pondCalculations';
import { getFarmDateKey } from '../shared/farmDate';
import {
  buildDailyFeedTotalsForPond,
  buildPondProfitabilityCostSnapshot,
  calculateHarvestProfitability,
  calculateRecordedDailyMortalityRate,
  type PriceTier,
} from '../shared/harvestProfitability';
import {
  HARVEST_MARKET_SIZE_TIERS,
  buildPersistedHarvestMarketPrices,
  createEmptyHarvestMarketPriceInputs,
  harvestMarketPriceInputsEqual,
  normalizeHarvestMarketPriceInputs,
  type HarvestMarketPriceInputs,
} from '../shared/harvestProjectionSettings';

const totalScenarioCosts = (costs: { feed: number; additives: number; generalExpenses: number; other: number }) =>
  costs.feed + costs.additives + costs.generalExpenses + costs.other;

export default function HarvestProjectionScreen() {
  const router = useRouter();
  const { ponds } = usePondStore();
  const activePonds = React.useMemo(() => ponds.filter(isPondCycleActive), [ponds]);
  const { sendMessage, loading: aiLoading } = useGemini();
  const { t } = useLanguage();
  const { formatCurrency, currencyConfig } = useCurrency();
  const { company, user } = useAuth();
  const feeds = useFeedAdditiveStore((state) => state.feeds);
  const additives = useFeedAdditiveStore((state) => state.additives);
  const initializeInventory = useFeedAdditiveStore((state) => state.initializeForCompany);

  const [selectedPondId, setSelectedPondId] = useState<string | null>(activePonds.length > 0 ? activePonds[0].id : null);
  const [marketPrices, setMarketPrices] = useState<HarvestMarketPriceInputs>(createEmptyHarvestMarketPriceInputs);
  const [savedMarketPrices, setSavedMarketPrices] = useState<HarvestMarketPriceInputs>(createEmptyHarvestMarketPriceInputs);
  const [isEditingPrices, setIsEditingPrices] = useState(true);
  const [priceSaveStatus, setPriceSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [priceSaveError, setPriceSaveError] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [financeDataWarning, setFinanceDataWarning] = useState<string | null>(null);
  
  const [insight, setInsight] = useState<string | null>(null);
  const [calibration, setCalibration] = useState<OrsonCalibrationProfile>(() => createDefaultOrsonCalibration());

  const selectedPond = activePonds.find(p => p.id === selectedPondId);

  const canManagePriceLadder = Boolean(user && company && (
    company.ownerId === user.uid || ['owner', 'co-owner', 'manager', 'admin'].includes(user.role || '')
  ));
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
    const recentDailyFeedTotals = buildDailyFeedTotalsForPond(feeds, selectedPond.id, company?.timeZone);
    const result = calculateHarvestProfitability({
      currentPopulation: metrics.currentPopulation,
      initialPopulation: Number(selectedPond.initialPopulation || selectedPond.initialStock || 0),
      currentMbwG: metrics.latestMbw,
      currentSurvivalRatePercent: metrics.adjustedSR,
      adgGPerDay: metrics.adg,
      historicalFcr: metrics.biomassGainFCR > 0 ? metrics.biomassGainFCR : metrics.adjustedFCR,
      dailyMortalityRatePercent: mortality.dailyRatePercent,
      recentDailyFeedTotals,
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

  useEffect(() => {
    if (!selectedPondId && activePonds.length > 0) {
      setSelectedPondId(activePonds[0].id);
    }
  }, [activePonds, selectedPondId]);

  useEffect(() => {
    if (!company?.id) return;
    const normalized = normalizeHarvestMarketPriceInputs(company.harvestProjectionMarketPrices);
    const hasSavedPrices = Object.values(normalized).some((value) => value !== '');
    setMarketPrices(normalized);
    setSavedMarketPrices(normalized);
    setIsEditingPrices(!hasSavedPrices);
    setPriceSaveStatus('idle');
    setPriceSaveError(null);
  }, [company?.id, company?.harvestProjectionMarketPrices]);

  useEffect(() => {
    if (!company?.id) {
      setCalibration(createDefaultOrsonCalibration());
      return;
    }
    return onSnapshot(
      doc(db, 'companies', company.id, 'orsonCalibration', 'current'),
      (snapshot) => setCalibration(normalizeOrsonCalibration(snapshot.exists() ? snapshot.data() : null)),
      (error) => {
        console.warn('Orson calibration listener failed; using safe defaults.', error);
        setCalibration(createDefaultOrsonCalibration());
      },
    );
  }, [company?.id]);

  useEffect(() => {
    if (!company?.id) return;
    return initializeInventory(company.id, company.timeZone);
  }, [company?.id, company?.timeZone, initializeInventory]);

  useEffect(() => {
    let cancelled = false;
    if (!company?.id) {
      setExpenses([]);
      return;
    }
    financeService.getExpenses(company.id)
      .then((records) => {
        if (cancelled) return;
        setExpenses(records);
        setFinanceDataWarning(null);
      })
      .catch((error) => {
        console.warn('Financial projection expense read failed:', error);
        if (!cancelled) setFinanceDataWarning('General expenses could not be loaded. Review the result before using it.');
      });
    return () => { cancelled = true; };
  }, [company?.id]);

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

  useEffect(() => {
    setInsight(null);
  }, [selectedPondId, savedMarketPrices]);

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
      console.warn('Failed to save harvest market prices:', error);
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
    if (!selectedPond || !projection) return;
    
    const prompt = `Please provide a risk analysis for this harvest projection:
Pond: ${selectedPond.pondName}
Current DOC: ${projection.currentDoc} | Projected DOC: ${projection.futureDoc}
Current MBW: ${projection.currentMbwG ?? 'unknown'}g | Projected MBW: ${projection.projectedMbwG?.toFixed(2) ?? 'unknown'}g
Historical ADG: ${projection.historicalAdgGPerDay ?? 'unknown'}g/day | Assumed ADG: ${projection.assumedAdgGPerDay ?? 'unknown'}g/day
Assumed survival: ${projection.assumedSurvivalPercent ?? 'unknown'}% (${projection.survivalConfidence} confidence)
Projected FCR: ${projection.projectedFcr ?? 'unknown'} | Market size status: ${projection.marketSizeRisk}
${financialComparison ? `Harvest-today operating profit: ${formatCurrency(financialComparison.result.today.operatingProfit, {showCode: true})}
Best scenario: ${financialComparison.result.bestScenario.kind === 'today' ? 'Harvest now' : `Size ${financialComparison.result.bestScenario.targetSizeCountPerKg}`} — ${formatCurrency(financialComparison.result.bestScenario.operatingProfit, {showCode: true})}
Decision: ${financialComparison.result.decision} — ${financialComparison.result.decisionReason}
Market price ladder: ${priceLadder.map((tier) => `${tier.sizeCountPerKg}=${formatCurrency(tier.pricePerKg, {showCode: true})}/kg`).join(', ')}` : 'Comprehensive operating-profit comparison is waiting for market price inputs.'}
Projection confidence: ${(projection.confidenceScore * 100).toFixed(0)}%
Structured risks: ${projection.risks.map((risk) => `${risk.severity}: ${risk.summary}`).join('; ') || 'none'}

Give a concise recommendation based on the operating-profit comparison and Orson's structured projection risk. Do not use the legacy feed-only profit calculation.`;

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
      setInsight(t.harvestProjectionScreen?.orsonUnavailable || "Orson is currently unavailable to provide an analysis.");
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.topSafeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#0d2137" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.harvestProjectionScreen?.title || 'Harvest Projections'}</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t.harvestProjectionScreen?.step1 || '1. Select Pond'}</Text>
            <View style={styles.pondTabs}>
              {activePonds.map(pond => (
                <TouchableOpacity 
                  key={pond.id} 
                  style={[styles.pondTab, selectedPondId === pond.id && styles.pondTabActive]}
                  onPress={() => setSelectedPondId(pond.id)}
                >
                  <Text style={[styles.pondTabText, selectedPondId === pond.id && styles.pondTabTextActive]}>
                    {pond.pondName}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t.harvestProjectionScreen?.marketPriceLadder || '2. Market Price by Size'}</Text>
            <Text style={styles.helperText}>{t.harvestProjectionScreen?.marketPriceHelp || 'Save the farm-gate price per kg for each size. Saved prices are reused for every pond until edited.'}</Text>
            <View style={styles.priceGrid}>
              {HARVEST_MARKET_SIZE_TIERS.map((size) => (
                <View key={size} style={styles.priceInputGroup}>
                  <Text style={styles.priceSizeLabel}>{size} {t.harvestProjectionScreen?.countPerKg || 'count/kg'}</Text>
                  <TextInput
                    style={[styles.priceInput, (!isEditingPrices || !canManagePriceLadder) && styles.priceInputDisabled]}
                    keyboardType="decimal-pad"
                    placeholder={`${currencyConfig.symbol}/kg`}
                    value={marketPrices[size]}
                    editable={isEditingPrices && canManagePriceLadder}
                    onChangeText={(value) => {
                      setMarketPrices((current) => ({ ...current, [size]: value }));
                      setPriceSaveStatus('idle');
                      setPriceSaveError(null);
                      setInsight(null);
                    }}
                  />
                </View>
              ))}
            </View>
            {canManagePriceLadder && isEditingPrices && (
              <View style={styles.priceActionRow}>
                <TouchableOpacity
                  style={[styles.priceSaveButton, (priceSaveStatus === 'saving' || !hasUnsavedPriceChanges) && styles.buttonDisabled]}
                  disabled={priceSaveStatus === 'saving' || !hasUnsavedPriceChanges}
                  onPress={handleSavePrices}
                >
                  {priceSaveStatus === 'saving' ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="save-outline" size={17} color="#FFFFFF" />}
                  <Text style={styles.priceSaveButtonText}>{priceSaveStatus === 'saving'
                    ? (t.harvestProjectionScreen?.savingPrices || 'Saving...')
                    : (t.harvestProjectionScreen?.savePrices || 'Save prices')}</Text>
                </TouchableOpacity>
                {hasSavedPriceLadder && (
                  <TouchableOpacity style={styles.priceCancelButton} onPress={handleCancelPriceEdit}>
                    <Text style={styles.priceCancelButtonText}>{t.common?.cancel || 'Cancel'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {canManagePriceLadder && !isEditingPrices && (
              <TouchableOpacity style={styles.priceEditButton} onPress={() => { setIsEditingPrices(true); setPriceSaveStatus('idle'); }}>
                <Ionicons name="pencil-outline" size={17} color="#0F4C75" />
                <Text style={styles.priceEditButtonText}>{t.harvestProjectionScreen?.editPrices || 'Edit prices'}</Text>
              </TouchableOpacity>
            )}
            {priceSaveStatus === 'saved' && <Text style={styles.priceSavedText}>{t.harvestProjectionScreen?.pricesSaved || 'Prices saved.'}</Text>}
            {priceSaveError && <Text style={styles.priceErrorText}>{t.harvestProjectionScreen?.priceSaveError || priceSaveError}</Text>}
            {!canManagePriceLadder && <Text style={styles.helperText}>{t.harvestProjectionScreen?.priceEditRestricted || 'Only owners and finance managers can edit saved prices.'}</Text>}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t.harvestProjectionScreen?.step3 || '3. Financial Projected Outcomes'}</Text>
            {!selectedPond ? (
              <Text style={styles.emptyProjectionText}>{t.forms.selectPond || 'Please select a pond to begin.'}</Text>
            ) : !hasSavedPriceLadder ? (
              <Text style={styles.emptyProjectionText}>{t.harvestProjectionScreen?.priceRequired || 'Save at least one market price to calculate harvest-today versus target-size operating profit.'}</Text>
            ) : financialComparison && projection ? (
              <>
                <View style={styles.decisionBox}>
                  <Text style={styles.decisionLabel}>{financialComparison.result.decision === 'keep_growing'
                    ? (t.harvestProjectionScreen?.keepGrowing || 'Keep Growing')
                    : financialComparison.result.decision === 'harvest_now'
                      ? (t.harvestProjectionScreen?.harvestNow || 'Harvest Now')
                      : (t.harvestProjectionScreen?.reviewData || 'Review Data')}</Text>
                  <Text style={styles.decisionReason}>{financialDecisionReason}</Text>
                </View>

                <View style={styles.comparisonRow}>
                  <View style={styles.comparisonColumn}>
                    <Text style={styles.financialLabel}>{t.harvestProjectionScreen?.harvestTodayProfit || 'Harvest-today profit'}</Text>
                    <Text style={styles.comparisonProfit}>{formatCurrency(financialComparison.result.today.operatingProfit)}</Text>
                    <Text style={styles.comparisonMeta}>{t.harvestProjectionScreen?.revenue || 'Revenue'}: {formatCurrency(financialComparison.result.today.revenue)}</Text>
                    <Text style={styles.comparisonMeta}>{t.harvestProjectionScreen?.totalCosts || 'Total costs'}: {formatCurrency(totalScenarioCosts(financialComparison.result.today.totalCosts))}</Text>
                  </View>
                  <View style={[styles.comparisonColumn, styles.bestComparisonColumn]}>
                    <Text style={styles.financialLabel}>{financialComparison.result.bestScenario.kind === 'today'
                      ? (t.harvestProjectionScreen?.bestOption || 'Best option')
                      : `${t.harvestProjectionScreen?.targetSize || 'Target size'} ${financialComparison.result.bestScenario.targetSizeCountPerKg}`}</Text>
                    <Text style={styles.comparisonProfit}>{formatCurrency(financialComparison.result.bestScenario.operatingProfit)}</Text>
                    <Text style={styles.comparisonMeta}>{financialComparison.result.bestScenario.daysFromNow} {t.harvestProjectionScreen?.days || 'days'}</Text>
                    <Text style={styles.comparisonMeta}>{t.harvestProjectionScreen?.totalCosts || 'Total costs'}: {formatCurrency(totalScenarioCosts(financialComparison.result.bestScenario.totalCosts))}</Text>
                  </View>
                </View>

                <View style={styles.profitDifferenceBox}>
                  <Text style={styles.profitDifferenceLabel}>{t.harvestProjectionScreen?.profitDifference || 'Profit difference'}</Text>
                  <Text style={[styles.profitDifferenceValue, financialComparison.result.bestScenario.incrementalProfitVsToday < 0 && styles.negativeProfit]}>{formatCurrency(financialComparison.result.bestScenario.incrementalProfitVsToday)}</Text>
                  <Text style={styles.comparisonMeta}>{t.harvestProjectionScreen?.versusHarvestToday || 'versus harvesting today'}</Text>
                </View>

                <Text style={styles.scenarioTitle}>{t.harvestProjectionScreen?.sizeComparison || 'Profit by harvest size'}</Text>
                {[financialComparison.result.today, ...financialComparison.result.targets].map((scenario) => (
                  <View key={`${scenario.kind}-${scenario.targetSizeCountPerKg}`} style={[styles.scenarioRow, scenario === financialComparison.result.bestScenario && styles.bestScenarioRow]}>
                    <View style={styles.scenarioMain}>
                      <Text style={styles.scenarioSize}>{scenario.kind === 'today' ? `${t.harvestProjectionScreen?.today || 'Today'} · ${scenario.targetSizeCountPerKg}` : `${t.harvestProjectionScreen?.targetSize || 'Size'} ${scenario.targetSizeCountPerKg}`}</Text>
                      <Text style={styles.scenarioMeta}>{scenario.daysFromNow} {t.harvestProjectionScreen?.days || 'days'} · {t.harvestProjectionScreen?.revenue || 'Revenue'} {formatCurrency(scenario.revenue)}</Text>
                      <Text style={styles.scenarioMeta}>{t.harvestProjectionScreen?.totalCosts || 'Total costs'} {formatCurrency(totalScenarioCosts(scenario.totalCosts))}</Text>
                    </View>
                    <View style={styles.scenarioProfitColumn}>
                      <Text style={[styles.scenarioProfit, scenario.operatingProfit < 0 && styles.negativeProfit]}>{formatCurrency(scenario.operatingProfit)}</Text>
                      <Text style={styles.scenarioDelta}>{formatCurrency(scenario.incrementalProfitVsToday)}</Text>
                    </View>
                  </View>
                ))}

                <View style={styles.statsGrid}>
                  <View style={styles.statBox}><Text style={styles.statLabel}>{t.harvestProjectionScreen?.harvestDOC || 'Harvest DOC'}</Text><Text style={styles.statValue}>{projection.futureDoc ?? '-'}</Text></View>
                  <View style={styles.statBox}><Text style={styles.statLabel}>{t.harvestProjectionScreen?.projBiomass || 'Proj. Biomass'}</Text><Text style={styles.statValue}>{financialComparison.result.bestScenario.projectedBiomassKg.toFixed(0)} kg</Text></View>
                  <View style={styles.statBox}><Text style={styles.statLabel}>{t.harvestProjectionScreen?.projectedSurvival || 'Projected survival'}</Text><Text style={styles.statValue}>{financialComparison.result.bestScenario.projectedSurvivalRatePercent.toFixed(1)}%</Text></View>
                </View>

                <View style={styles.financialBox}>
                  <Text style={styles.costTitle}>{t.harvestProjectionScreen?.costsIncluded || 'Costs included to date'}</Text>
                  <Text style={styles.costLine}>{t.inventory?.feeds || 'Feed'}: {formatCurrency(financialComparison.costSnapshot.costsToDate.feed)}</Text>
                  <Text style={styles.costLine}>{t.inventory?.additives || 'Additives'}: {formatCurrency(financialComparison.costSnapshot.costsToDate.additives)}</Text>
                  <Text style={styles.costLine}>{t.harvestProjectionScreen?.generalExpenses || 'Allocated general expenses'}: {formatCurrency(financialComparison.costSnapshot.costsToDate.generalExpenses)}</Text>
                  <Text style={styles.costLine}>{t.harvestProjectionScreen?.feedTrend || 'Daily feed trend'}: {financialComparison.result.feedDailyIncreaseRatePercent.toFixed(2)}%</Text>
                  <Text style={styles.costLine}>{t.harvestProjectionScreen?.mortalityTrend || 'Daily mortality benchmark'}: {financialComparison.result.dailyMortalityRatePercent.toFixed(4)}% ({financialComparison.mortality.recordedDays} {t.harvestProjectionScreen?.recordedDays || 'recorded days'})</Text>
                  {financialComparison.costSnapshot.excludedInventoryPurchaseIds.length > 0 && <Text style={styles.warningText}>• {t.harvestProjectionScreen?.inventorySafeguard || 'Unused inventory is excluded; only consumed feed and additives are counted.'}</Text>}
                  {(financialComparison.costSnapshot.warnings.length > 0 || financialComparison.result.warnings.length > 0 || financialComparison.mortality.recordedDays === 0) && <Text style={styles.warningText}>• {t.harvestProjectionScreen?.dataQualityWarning || 'Some projection inputs are incomplete. Review the recorded data before deciding.'}</Text>}
                  {financeDataWarning && <Text style={styles.warningText}>• {t.harvestProjectionScreen?.financeLoadWarning || 'General expenses could not be loaded. Review the result before using it.'}</Text>}
                </View>
              </>
            ) : (
              <Text style={styles.emptyProjectionText}>{t.harvestProjectionScreen?.dataQualityWarning || 'Projection data is still loading or incomplete.'}</Text>
            )}
          </View>

          <View style={styles.orsonCard}>
            <View style={styles.orsonHeader}>
              <Ionicons name="sparkles" size={20} color="#315f57" />
              <Text style={styles.orsonTitle}>{t.harvestProjectionScreen?.orsonTitle || 'Orson AI Risk Analysis'}</Text>
            </View>
            
            {insight ? (
              <Text style={styles.orsonText}>{insight}</Text>
            ) : aiLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#315f57" />
                <Text style={styles.loadingText}>{t.harvestProjectionScreen?.orsonAnalyzing || 'Orson is analyzing the projection...'}</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.orsonBtn} onPress={handleAskOrson}>
                <Text style={styles.orsonBtnText}>{t.harvestProjectionScreen?.orsonAnalyzeBtn || 'Analyze this Projection'}</Text>
              </TouchableOpacity>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8fc' },
  topSafeArea: { backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: '#0d2137' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#dce8f2', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0d2137', marginBottom: 12 },
  pondTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pondTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9' },
  pondTabActive: { backgroundColor: '#0d2137' },
  pondTabText: { color: '#64748B', fontWeight: '600', fontSize: 14 },
  pondTabTextActive: { color: '#FFFFFF' },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 13, color: '#64748B', marginBottom: 6 },
  input: { backgroundColor: '#f4f8fc', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, fontSize: 16, color: '#0d2137' },
  helperText: { marginTop: 4, fontSize: 11, color: '#64748B' },
  priceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  priceInputGroup: { width: '31%' },
  priceSizeLabel: { fontSize: 10, color: '#64748B', marginBottom: 4 },
  priceInput: { backgroundColor: '#f4f8fc', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 10, fontSize: 14, color: '#0d2137' },
  priceInputDisabled: { backgroundColor: '#FFFFFF', color: '#475569' },
  priceActionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  priceSaveButton: { flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F4C75', paddingHorizontal: 16, paddingVertical: 11, borderRadius: 9 },
  priceSaveButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  priceCancelButton: { justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 11, borderRadius: 9, borderWidth: 1, borderColor: '#CBD5E1' },
  priceCancelButtonText: { color: '#475569', fontWeight: '700', fontSize: 13 },
  priceEditButton: { flexDirection: 'row', gap: 7, alignItems: 'center', alignSelf: 'flex-start', marginTop: 16, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 9, borderWidth: 1, borderColor: '#0F4C75' },
  priceEditButtonText: { color: '#0F4C75', fontWeight: '700', fontSize: 13 },
  priceSavedText: { color: '#059669', fontWeight: '700', fontSize: 12, marginTop: 10 },
  priceErrorText: { color: '#B91C1C', fontWeight: '700', fontSize: 12, marginTop: 10 },
  buttonDisabled: { opacity: 0.5 },
  emptyProjectionText: { color: '#64748B', textAlign: 'center', paddingVertical: 32, lineHeight: 20 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 12, padding: 12, marginHorizontal: 4, alignItems: 'center' },
  statLabel: { fontSize: 11, color: '#64748B', marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '700', color: '#0d2137' },
  financialBox: { backgroundColor: '#f3f8f5', borderRadius: 12, padding: 16, borderLeftWidth: 4, borderLeftColor: '#315f57' },
  financialLabel: { fontSize: 13, color: '#64748B', marginTop: 8 },
  financialValue: { fontSize: 22, fontWeight: '700', color: '#0d2137' },
  profitValue: { fontSize: 22, fontWeight: '800', color: '#10B981' },
  decisionLabel: { fontSize: 20, fontWeight: '800', color: '#0F4C75' },
  decisionReason: { fontSize: 12, lineHeight: 18, color: '#475569', marginTop: 4, marginBottom: 12 },
  decisionBox: { backgroundColor: '#E0F2FE', borderWidth: 1, borderColor: '#BAE6FD', borderRadius: 12, padding: 14, marginBottom: 14 },
  comparisonRow: { flexDirection: 'row', gap: 10 },
  comparisonColumn: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 10 },
  bestComparisonColumn: { backgroundColor: '#ECFDF5' },
  comparisonProfit: { fontSize: 18, fontWeight: '800', color: '#0d2137', marginTop: 4 },
  comparisonMeta: { fontSize: 11, color: '#64748B', marginTop: 4 },
  profitDifferenceBox: { backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, marginTop: 10, marginBottom: 18 },
  profitDifferenceLabel: { fontSize: 11, color: '#64748B', fontWeight: '700' },
  profitDifferenceValue: { fontSize: 22, color: '#2563EB', fontWeight: '800', marginTop: 3 },
  negativeProfit: { color: '#DC2626' },
  scenarioTitle: { fontSize: 14, color: '#0d2137', fontWeight: '800', marginBottom: 8 },
  scenarioRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 11, marginBottom: 8 },
  bestScenarioRow: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  scenarioMain: { flex: 1 },
  scenarioSize: { fontSize: 13, color: '#0d2137', fontWeight: '800' },
  scenarioMeta: { fontSize: 10, color: '#64748B', marginTop: 3 },
  scenarioProfitColumn: { alignItems: 'flex-end', justifyContent: 'center' },
  scenarioProfit: { fontSize: 14, color: '#059669', fontWeight: '800' },
  scenarioDelta: { fontSize: 10, color: '#2563EB', marginTop: 3 },
  costTitle: { fontSize: 12, fontWeight: '700', color: '#0d2137', marginTop: 14, marginBottom: 5 },
  costLine: { fontSize: 12, color: '#475569', marginTop: 3 },
  warningText: { fontSize: 11, lineHeight: 16, color: '#92400E', marginTop: 6 },
  orsonCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e8f2f9' },
  orsonHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  orsonTitle: { fontSize: 16, fontWeight: '700', color: '#0d2137', marginLeft: 8 },
  orsonText: { fontSize: 14, lineHeight: 22, color: '#334155' },
  orsonBtn: { backgroundColor: '#E0F2FE', padding: 12, borderRadius: 8, alignItems: 'center' },
  orsonBtnText: { color: '#0284C7', fontWeight: '700', fontSize: 14 },
  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12 },
  loadingText: { marginLeft: 8, color: '#64748B', fontSize: 14 },
});
