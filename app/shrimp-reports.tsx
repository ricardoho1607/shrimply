// app/shrimp-reports.tsx - Optimized with Android Consistency
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { usePondStore, type Pond } from './store/pondStore';
import { exportShrimpReportPDF, prepareShrimpReportData } from './services/shrimpPdfExportService';

const isAndroid = Platform.OS === 'android';

export default function ShrimpReportsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, company } = useAuth();
  const { t } = useLanguage();
  const { ponds, calculatePondMetricsWithHarvest } = usePondStore();
  const [loading, setLoading] = useState(false);
  const [selectedPonds, setSelectedPonds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const activePonds = ponds.filter(pond => calculateDOC(pond.docStart) >= 0);
    setSelectedPonds(new Set(activePonds.map(p => p.id)));
  }, [ponds]);

  const calculateDOC = (docStart: string): number => 
    Math.max(0, Math.floor((Date.now() - new Date(docStart).getTime()) / (1000 * 60 * 60 * 24)));

  const togglePondSelection = (pondId: string) => {
    setSelectedPonds(prev => {
      const newSet = new Set(prev);
      newSet.has(pondId) ? newSet.delete(pondId) : newSet.add(pondId);
      return newSet;
    });
  };

  const transformSamplingData = (pond: Pond, pondMetrics: any) => {
    return pond.samplings.filter(s => s.mbw > 0 || s.mortality > 0 || s.feed > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((sampling, index, allSamplings) => {
        const samplingDoc = Math.floor((new Date(sampling.date).getTime() - new Date(pond.docStart).getTime()) / (1000 * 60 * 60 * 24));
        const adg = index === 0 ? samplingDoc > 0 ? (sampling.mbw - (pond.initialWeight || 0.5)) / samplingDoc : 0
          : (() => {
              const prevSampling = allSamplings[index - 1];
              const daysDiff = Math.floor((new Date(sampling.date).getTime() - new Date(prevSampling.date).getTime()) / (1000 * 60 * 60 * 24));
              return daysDiff > 0 ? (sampling.mbw - prevSampling.mbw) / daysDiff : 0;
            })();
        const cumulativeMortality = allSamplings.slice(0, index + 1).reduce((sum, s) => sum + s.mortality, 0);
        const samplingFeed = allSamplings.slice(0, index + 1).filter((s) => !(s.mbw === 0 && s.mortality === 0 && s.feed === 0))
          .reduce((sum, s) => sum + (s.feed || 0), 0);
        const feedManagementFeed = allSamplings.slice(0, index + 1).filter((s) => s.feedData)
          .reduce((sum, s) => sum + (parseFloat(s.feedData?.totalDailyFeed || '0') || 0), 0);
        const cumulativeFeed = feedManagementFeed > 0 ? feedManagementFeed : samplingFeed;
        const currentPopulation = pond.initialPopulation - cumulativeMortality;
        const biomass = (currentPopulation * sampling.mbw) / 1000;
        const sr = (currentPopulation / pond.initialPopulation) * 100;
        const size = sampling.mbw > 0 ? 1000 / sampling.mbw : 0;
        const fcr = index === allSamplings.length - 1 ? pondMetrics.adjustedFCR : biomass > 0 ? cumulativeFeed / biomass : 0;
        const mortalityPercentage = (cumulativeMortality / pond.initialPopulation) * 100;
        return {
          samplingNumber: index + 1, samplingDate: sampling.date, doc: samplingDoc, abw: sampling.mbw, adg, size, sr, biomass,
          feedCumulative: cumulativeFeed, fcr, mortality: sampling.mortality, mortalityPercentage,
        };
      });
  };

  const handleGenerateReport = async () => {
    if (selectedPonds.size === 0) {
      Alert.alert(t.shrimpReports?.noSelection || 'No Ponds Selected', 
        t.shrimpReports?.selectAtLeastOne || 'Please select at least one pond to generate a report');
      return;
    }
    setLoading(true);
    try {
      const selectedPondData = ponds.filter(p => selectedPonds.has(p.id));
      const pondDataForPDF = selectedPondData.map(pond => {
        const pondMetrics = calculatePondMetricsWithHarvest(pond);
        return {
          pondNumber: pond.pondName, stockingDate: pond.docStart, area: pond.pondArea, initialStock: pond.initialPopulation,
          density: pond.density, samplingHistory: transformSamplingData(pond, pondMetrics),
        };
      });
      const reportData = prepareShrimpReportData(company?.companyName || t.shrimpReports?.myFarm || 'My Farm',
        t.shrimpReports?.mainBlock || 'Main Block', user?.name || t.shrimpReports?.unknown || 'Unknown',
        new Date().toISOString(), `${t.shrimpReports?.cultureCycle || 'Culture Cycle'} ${new Date().getFullYear()}`,
        company?.companyName || t.shrimpReports?.myCompany || 'My Company', pondDataForPDF);
      await exportShrimpReportPDF(reportData);
      Alert.alert(t.shrimpReports?.success || 'Success', 
        t.shrimpReports?.reportGenerated || 'Shrimp report has been generated successfully!');
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert(t.shrimpReports?.error || 'Error', 
        t.shrimpReports?.generateFailed || 'Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPondStats = (pond: Pond) => {
    const doc = calculateDOC(pond.docStart);
    const metrics = calculatePondMetricsWithHarvest(pond);
    const latestSampling = pond.samplings.filter(s => s.mbw > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    return {
      doc, currentPopulation: metrics.currentPopulation, biomass: metrics.currentBiomass, sr: metrics.adjustedSR,
      latestMBW: latestSampling?.mbw || 0, samplingCount: pond.samplings.filter(s => s.mbw > 0).length,
    };
  };

  const renderPondCard = (pond: Pond) => {
    const stats = getPondStats(pond);
    const isSelected = selectedPonds.has(pond.id);
    return (
      <TouchableOpacity key={pond.id} style={[s.card, isSelected && s.cardSelected]} 
        onPress={() => togglePondSelection(pond.id)}>
        <View style={s.cardHeader}>
          <View style={s.cardInfo}>
            <View style={s.row}>
              <Text style={s.cardTitle}>{pond.pondName}</Text>
              <View style={s.badge}>
                <Text style={s.badgeText}>{t.shrimpReports?.doc || 'DOC'} {stats.doc}</Text>
              </View>
            </View>
            <Text style={s.cardText}>
              {t.shrimpReports?.area || 'Area'}: {pond.pondArea}m² | {t.shrimpReports?.density || 'Density'}: {pond.density} pcs/m²
            </Text>
            <Text style={s.cardText}>
              {t.shrimpReports?.population || 'Population'}: {stats.currentPopulation.toLocaleString()} pcs | SR: {stats.sr.toFixed(1)}%
            </Text>
            <Text style={s.cardText}>
              {t.shrimpReports?.biomass || 'Biomass'}: {stats.biomass.toFixed(1)} kg | MBW: {stats.latestMBW.toFixed(2)} g | 
              {t.shrimpReports?.samplings || 'Samplings'}: {stats.samplingCount}
            </Text>
          </View>
          <Ionicons name={isSelected ? 'checkbox' : 'square-outline'} size={32} 
            color={isSelected ? '#0F4C75' : '#BBE1FA'} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={s.empty}>
      <Ionicons name="water-outline" size={64} color="#BBE1FA" />
      <Text style={s.emptyTitle}>{t.shrimpReports?.noPonds || 'No ponds found'}</Text>
      <Text style={s.emptySubtitle}>{t.shrimpReports?.addPonds || 'Add ponds to start generating reports'}</Text>
    </View>
  );

  const SummaryRow = ({ label, value }: { label: string; value: string }) => (
    <View style={s.summaryRow}>
      <Text style={s.summaryLabel}>{label}:</Text>
      <Text style={s.summaryValue}>{value}</Text>
    </View>
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#BBE1FA" />
      <View style={[s.header, { paddingTop: (isAndroid ? insets.top + 10 : insets.top + 12) }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backButton} 
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#1B262C" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t.shrimpReports?.title || 'Shrimp Reports'}</Text>
        <View style={s.placeholder} />
      </View>

      <ScrollView style={s.content}>
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t.shrimpReports?.selectPonds || 'Select Ponds'}</Text>
          <Text style={s.sectionSubtitle}>
            {t.shrimpReports?.selectSubtitle || 'Choose which ponds to include in the report'}
          </Text>
          <View style={s.pondList}>{ponds.map(renderPondCard)}</View>
          {ponds.length === 0 && renderEmptyState()}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t.shrimpReports?.reportSummary || 'Report Summary'}</Text>
          <View style={s.card}>
            <SummaryRow label={t.shrimpReports?.selectedPonds || 'Selected Ponds'} 
              value={selectedPonds.size.toString()} />
            <SummaryRow label={t.shrimpReports?.reportDate || 'Report Date'} 
              value={new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} />
            <SummaryRow label={t.shrimpReports?.company || 'Company'} 
              value={company?.companyName || 'N/A'} />
            <SummaryRow label={t.shrimpReports?.technician || 'Technician'} 
              value={user?.name || user?.email?.split('@')[0] || 'Unknown'} />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t.shrimpReports?.reportContents || 'Report Contents'}</Text>
          <View style={[s.card, s.contentCard]}>
            <Ionicons name="document-text" size={24} color="#0F4C75" />
            <View style={s.contentInfo}>
              <Text style={s.contentTitle}>
                {t.shrimpReports?.comprehensiveReport || 'Comprehensive Sampling Report'}
              </Text>
              <Text style={s.contentText}>
                {t.shrimpReports?.reportFeatures || 
                  '• Complete sampling history with all measurements\n• Growth metrics (ABW, ADG, Size)\n• Performance indicators (SR, FCR)\n• Biomass and feed consumption data\n• Mortality statistics and trends\n• Color-coded performance indicators'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity style={[s.button, (loading || selectedPonds.size === 0) && s.buttonDisabled]}
          onPress={handleGenerateReport} disabled={loading || selectedPonds.size === 0}>
          {loading ? (
            <>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={s.buttonText}>{t.shrimpReports?.generating || 'Generating...'}</Text>
            </>
          ) : (
            <>
              <Ionicons name="download-outline" size={24} color="#FFFFFF" />
              <Text style={s.buttonText}>{t.shrimpReports?.generatePDF || 'Generate PDF Report'}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: isAndroid ? 14 : 16, 
    paddingBottom: isAndroid ? 7 : 8, backgroundColor: '#BBE1FA', borderBottomWidth: 1, borderBottomColor: '#BBE1FA' },
  backButton: { padding: 8, marginLeft: -4 },
  headerTitle: { fontSize: isAndroid ? 19 : 20, fontWeight: 'bold', color: '#1B262C' },
  placeholder: { width: 40 },
  content: { flex: 1 },
  section: { padding: isAndroid ? 14 : 16 },
  sectionTitle: { fontSize: isAndroid ? 17 : 18, fontWeight: '700', color: '#0F4C75', marginBottom: 4 },
  sectionSubtitle: { fontSize: isAndroid ? 13 : 14, color: '#7F8C8D', marginBottom: isAndroid ? 14 : 16 },
  pondList: { gap: isAndroid ? 10 : 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: isAndroid ? 14 : 16, borderWidth: 2, borderColor: '#BBE1FA', 
    shadowColor: '#0F4C75', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardSelected: { borderColor: '#0F4C75', backgroundColor: '#F0F8FF' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardInfo: { flex: 1, marginRight: isAndroid ? 10 : 12 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: isAndroid ? 7 : 8 },
  cardTitle: { fontSize: isAndroid ? 15 : 16, fontWeight: '700', color: '#0F4C75', marginRight: 8 },
  badge: { backgroundColor: '#0F4C75', paddingHorizontal: isAndroid ? 7 : 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: '#FFFFFF', fontSize: isAndroid ? 10 : 11, fontWeight: '600' },
  cardText: { fontSize: isAndroid ? 12 : 13, color: '#7F8C8D', marginBottom: 4 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: isAndroid ? 42 : 48 },
  emptyTitle: { fontSize: isAndroid ? 15 : 16, color: '#0F4C75', marginTop: isAndroid ? 14 : 16, fontWeight: '600' },
  emptySubtitle: { fontSize: isAndroid ? 13 : 14, color: '#BBE1FA', marginTop: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: isAndroid ? 10 : 12 },
  summaryLabel: { fontSize: isAndroid ? 13 : 14, color: '#7F8C8D', fontWeight: '500' },
  summaryValue: { fontSize: isAndroid ? 13 : 14, color: '#0F4C75', fontWeight: '700' },
  contentCard: { flexDirection: 'row', alignItems: 'flex-start', gap: isAndroid ? 14 : 16, borderWidth: 1 },
  contentInfo: { flex: 1 },
  contentTitle: { fontSize: isAndroid ? 15 : 16, fontWeight: '700', color: '#0F4C75', marginBottom: isAndroid ? 7 : 8 },
  contentText: { fontSize: isAndroid ? 12 : 13, color: '#7F8C8D', lineHeight: isAndroid ? 18 : 20 },
  footer: { padding: isAndroid ? 14 : 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#BBE1FA' },
  button: { backgroundColor: '#0F4C75', borderRadius: 12, paddingVertical: isAndroid ? 14 : 16, paddingHorizontal: isAndroid ? 20 : 24, 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: isAndroid ? 10 : 12, shadowColor: '#0F4C75', 
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  buttonDisabled: { backgroundColor: '#BBE1FA', opacity: 0.6 },
  buttonText: { fontSize: isAndroid ? 15 : 16, fontWeight: '700', color: '#FFFFFF' },
});