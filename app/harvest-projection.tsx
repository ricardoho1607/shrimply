import React, { useState, useEffect } from 'react';
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
import type { OrsonCalibrationProfile, OrsonHarvestProjection } from '../orson/types';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';

export default function HarvestProjectionScreen() {
  const router = useRouter();
  const { ponds } = usePondStore();
  const activePonds = React.useMemo(() => ponds.filter(isPondCycleActive), [ponds]);
  const { sendMessage, loading: aiLoading } = useGemini();
  const { t } = useLanguage();
  const { formatCurrency, currencyConfig } = useCurrency();
  const { company } = useAuth();

  const [selectedPondId, setSelectedPondId] = useState<string | null>(activePonds.length > 0 ? activePonds[0].id : null);
  const [daysToHarvest, setDaysToHarvest] = useState('14');
  const [expectedPrice, setExpectedPrice] = useState('5.50');
  const [dailyFeedCost, setDailyFeedCost] = useState('50');
  const [targetADG, setTargetADG] = useState('');
  const [assumedSurvival, setAssumedSurvival] = useState('');
  const [targetMarketSize, setTargetMarketSize] = useState('20');
  
  const [insight, setInsight] = useState<string | null>(null);
  const [calibration, setCalibration] = useState<OrsonCalibrationProfile>(() => createDefaultOrsonCalibration());

  // Projections state
  const [projection, setProjection] = useState<OrsonHarvestProjection | null>(null);

  const selectedPond = activePonds.find(p => p.id === selectedPondId);

  useEffect(() => {
    if (!selectedPondId && activePonds.length > 0) {
      setSelectedPondId(activePonds[0].id);
    }
  }, [activePonds, selectedPondId]);

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
    if (!selectedPond) return;

    const nextProjection = calculateOrsonHarvestProjection({
      pond: selectedPond,
      daysToHarvest: parseInt(daysToHarvest, 10) || 0,
      expectedPricePerKg: parseFloat(expectedPrice) || 0,
      dailyFeedCost: parseFloat(dailyFeedCost) || 0,
      targetAdgGPerDay: targetADG ? parseFloat(targetADG) : null,
      assumedSurvivalPercent: assumedSurvival ? parseFloat(assumedSurvival) : null,
      targetMarketSizeG: targetMarketSize ? parseFloat(targetMarketSize) : null,
      calibration,
      timeZone: company?.timeZone,
    });

    setProjection(nextProjection);
    
    // Reset insight when data changes
    setInsight(null);
  }, [selectedPondId, daysToHarvest, expectedPrice, dailyFeedCost, targetADG, assumedSurvival, targetMarketSize, selectedPond, calibration, company?.timeZone]);

  const handleAskOrson = async () => {
    if (!selectedPond || !projection) return;
    
    const prompt = `Please provide a risk analysis for this harvest projection:
Pond: ${selectedPond.pondName}
Current DOC: ${projection.currentDoc} | Projected DOC: ${projection.futureDoc}
Current MBW: ${projection.currentMbwG ?? 'unknown'}g | Projected MBW: ${projection.projectedMbwG?.toFixed(2) ?? 'unknown'}g
Historical ADG: ${projection.historicalAdgGPerDay ?? 'unknown'}g/day | Assumed ADG: ${projection.assumedAdgGPerDay ?? 'unknown'}g/day
Assumed survival: ${projection.assumedSurvivalPercent ?? 'unknown'}% (${projection.survivalConfidence} confidence)
Projected FCR: ${projection.projectedFcr ?? 'unknown'} | Market size status: ${projection.marketSizeRisk}
Expected Price: ${formatCurrency(Number(expectedPrice) || 0, {showCode: true})}/kg | Daily Feed Cost: ${formatCurrency(Number(dailyFeedCost) || 0, {showCode: true})}
Projected Revenue: ${formatCurrency(projection.projectedRevenue, {showCode: true})}
Projected Profit (Gross - Future Feed): ${formatCurrency(projection.projectedProfit, {showCode: true})}
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
      setInsight(t.harvestProjectionScreen?.orsonUnavailable || "Orson is currently unavailable to provide an analysis.");
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.topSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/financial-reports')} style={styles.backBtn}>
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
            <Text style={styles.sectionTitle}>{t.harvestProjectionScreen?.step2 || '2. Manual Assumptions'}</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t.harvestProjectionScreen?.daysUntilHarvest || 'Days Until Harvest'}</Text>
              <TextInput 
                style={styles.input} 
                keyboardType="numeric" 
                value={daysToHarvest} 
                onChangeText={setDaysToHarvest} 
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t.harvestProjectionScreen?.expectedPrice || 'Expected Market Price'} ({currencyConfig.symbol}/kg)</Text>
              <TextInput 
                style={styles.input} 
                keyboardType="numeric" 
                value={expectedPrice} 
                onChangeText={setExpectedPrice} 
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t.harvestProjectionScreen?.dailyFeedCost || 'Estimated Daily Feed Cost'} ({currencyConfig.symbol})</Text>
              <TextInput 
                style={styles.input} 
                keyboardType="numeric" 
                value={dailyFeedCost} 
                onChangeText={setDailyFeedCost} 
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Growth Rate ADG (g/day)</Text>
              <TextInput 
                style={styles.input} 
                keyboardType="numeric" 
                value={targetADG} 
                onChangeText={setTargetADG} 
              />
              <Text style={styles.helperText}>Default uses recent pond ADG when available.</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Assumed Survival (%)</Text>
              <TextInput 
                style={styles.input} 
                keyboardType="numeric" 
                value={assumedSurvival} 
                onChangeText={setAssumedSurvival} 
              />
              <Text style={styles.helperText}>{projection ? `Orson confidence: ${projection.survivalConfidence}` : 'Uses Orson survival model by default.'}</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Target Market Size (g)</Text>
              <TextInput 
                style={styles.input} 
                keyboardType="numeric" 
                value={targetMarketSize} 
                onChangeText={setTargetMarketSize} 
              />
            </View>
          </View>

          {projection && <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t.harvestProjectionScreen?.step3 || '3. Projected Outcomes'}</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>{t.harvestProjectionScreen?.harvestDOC || 'Harvest DOC'}</Text>
                <Text style={styles.statValue}>{projection.futureDoc ?? '-'}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>{t.harvestProjectionScreen?.projSize || 'Proj. Size (MBW)'}</Text>
                <Text style={styles.statValue}>{projection.projectedMbwG?.toFixed(1) ?? '-'}g</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>{t.harvestProjectionScreen?.projBiomass || 'Proj. Biomass'}</Text>
                <Text style={styles.statValue}>{projection.projectedBiomassKg?.toFixed(0) ?? '-'} kg</Text>
              </View>
            </View>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>ADG</Text>
                <Text style={styles.statValue}>{projection.assumedAdgGPerDay?.toFixed(2) ?? '-'}g</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>FCR Risk</Text>
                <Text style={styles.statValue}>{projection.projectedFcr ?? '-'}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Confidence</Text>
                <Text style={styles.statValue}>{(projection.confidenceScore * 100).toFixed(0)}%</Text>
              </View>
            </View>
            <View style={styles.financialBox}>
              <Text style={styles.financialLabel}>{t.harvestProjectionScreen?.projectedRevenue || 'Projected Revenue'}</Text>
              <Text style={styles.financialValue}>{formatCurrency(projection.projectedRevenue)}</Text>
              
              <Text style={styles.financialLabel}>{t.harvestProjectionScreen?.projectedProfit || 'Projected Profit (Minus feed)'}</Text>
              <Text style={styles.profitValue}>{formatCurrency(projection.projectedProfit)}</Text>
            </View>
          </View>}

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
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 12, padding: 12, marginHorizontal: 4, alignItems: 'center' },
  statLabel: { fontSize: 11, color: '#64748B', marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '700', color: '#0d2137' },
  financialBox: { backgroundColor: '#f3f8f5', borderRadius: 12, padding: 16, borderLeftWidth: 4, borderLeftColor: '#315f57' },
  financialLabel: { fontSize: 13, color: '#64748B', marginTop: 8 },
  financialValue: { fontSize: 22, fontWeight: '700', color: '#0d2137' },
  profitValue: { fontSize: 22, fontWeight: '800', color: '#10B981' },
  orsonCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e8f2f9' },
  orsonHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  orsonTitle: { fontSize: 16, fontWeight: '700', color: '#0d2137', marginLeft: 8 },
  orsonText: { fontSize: 14, lineHeight: 22, color: '#334155' },
  orsonBtn: { backgroundColor: '#E0F2FE', padding: 12, borderRadius: 8, alignItems: 'center' },
  orsonBtnText: { color: '#0284C7', fontWeight: '700', fontSize: 14 },
  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12 },
  loadingText: { marginLeft: 8, color: '#64748B', fontSize: 14 },
});
