import { reportCalculationOptions, buildPondReportSnapshot } from '../shared/reportSnapshots';
import { calculatePondMetricsWithHarvest as calculateReportMetrics } from '../shared/pondCalculations';
import { filterEnterpriseRecordsForUser } from '../shared/enterpriseBlocks';
import { useEnterpriseBlocks } from './hooks/useEnterpriseBlocks';
// app/shrimp-reports.tsx - Optimized with Android Consistency
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { usePondStore, type Pond, getPondCurrentDoc, getPondPlSupplier, isBaselineSampling, isPondCycleActive } from './store/pondStore';
import { exportSamplingReportPDF, prepareSamplingReportData } from './services/samplingReportExportService';
import { DAY_MS, calculateSamplingAdg, getSamplingMbw, toFiniteNumber } from '../shared/pondCalculations';
import { hasFarmPermission } from '../shared/permissions';
import { useFarmDateKey } from './hooks/useFarmDateKey';
import { FARM_OPERATIONAL_DAY_ROLLOVER_HOUR } from '../shared/farmDate';

const isAndroid = Platform.OS === 'android';

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
    <View style={s.summaryRow}>
      <Text style={s.summaryLabel}>{label}:</Text>
      <Text style={s.summaryValue}>{value}</Text>
    </View>
  );

export default function ShrimpReportsScreen() {
  const router = useRouter();
  const { user, company } = useAuth();
  const farmToday = useFarmDateKey(company?.timeZone, FARM_OPERATIONAL_DAY_ROLLOVER_HOUR);
  const { t, currentLanguage } = useLanguage();
  const { ponds, harvestRecords, calculatePondMetricsWithHarvest } = usePondStore();
  const enterpriseBlocks = useEnterpriseBlocks(company?.businessSize === 'enterprise' ? company.id : undefined, user?.uid);
  const [loading, setLoading] = useState(false);
  const [selectedPonds, setSelectedPonds] = useState<Set<string>>(new Set());
  const canViewReports = hasFarmPermission(user, 'viewReports', company?.ownerId);
  const canExportReports = hasFarmPermission(user, 'exportReports', company?.ownerId);

  const activePonds = useMemo(
    () => filterEnterpriseRecordsForUser(ponds, { businessSize: company?.businessSize, role: user?.role, userId: user?.uid, blocks: enterpriseBlocks.blocks }).filter(pond => isPondCycleActive(pond) && getPondCurrentDoc(pond, company?.timeZone, farmToday) >= 0),
    [company?.timeZone, company?.businessSize, user?.role, user?.uid, enterpriseBlocks.blocks, farmToday, ponds]
  );

  const pondMembership = activePonds.map(pond => pond.id).sort().join('|');
  const [previousMembership, setPreviousMembership] = useState('');
  if (previousMembership !== pondMembership) {
    const previousIds = new Set(previousMembership.split('|'));
    setPreviousMembership(pondMembership);
    setSelectedPonds(previous => new Set(activePonds.filter(pond => previous.has(pond.id) || !previousIds.has(pond.id)).map(pond => pond.id)));
  }

  const togglePondSelection = (pondId: string) => {
    setSelectedPonds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pondId)) {
        newSet.delete(pondId);
      } else {
        newSet.add(pondId);
      }
      return newSet;
    });
  };

  const transformSamplingData = (pond: Pond) => {
    const operationalSamplings = (pond.samplings || [])
      .filter((sampling) => !isBaselineSampling(sampling))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const growthSamplings = operationalSamplings.filter((sampling) => getSamplingMbw(sampling) > 0);

    return growthSamplings
      .map((sampling, index) => {
        const snapshot = buildPondReportSnapshot(pond, sampling.date, harvestRecords, company?.timeZone);
        const metricsToDate = calculateReportMetrics(snapshot, company?.timeZone, reportCalculationOptions(snapshot, sampling.date, company?.timeZone));
        const samplingDoc = metricsToDate.doc;
        const currentMbw = getSamplingMbw(sampling);
        const fcr = metricsToDate.biomassGainFCR;
        const mortalityPercentage = pond.initialPopulation > 0 ? (metricsToDate.totalMortality / pond.initialPopulation) * 100 : 0;
        return {
          samplingNumber: index + 1,
          samplingDate: sampling.date,
          doc: samplingDoc,
          mbw: currentMbw,
          abw: currentMbw,
          adg: calculateSamplingAdg(snapshot, sampling, company?.timeZone) ?? 0,
          size: currentMbw > 0 ? 1000 / currentMbw : 0,
          sr: metricsToDate.adjustedSR,
          biomass: metricsToDate.currentBiomass,
          feedCumulative: metricsToDate.totalFeedConsumed,
          fcr,
          mortality: toFiniteNumber(sampling.mortality),
          mortalityPercentage,
        };
      });
  };

  const handleGenerateReport = async () => {
    if (!canExportReports) return;
    if (selectedPonds.size === 0) {
      Alert.alert(t.shrimpReports?.noSelection || 'No Ponds Selected', 
        t.shrimpReports?.selectAtLeastOne || 'Please select at least one pond to generate a report');
      return;
    }
    setLoading(true);
    try {
      const selectedPondData = activePonds.filter(p => selectedPonds.has(p.id));
      const pondDataForPDF = selectedPondData.map(pond => {
        return {
          pondNumber: pond.pondName, supplier: getPondPlSupplier(pond), stockingDate: pond.docStart, area: pond.pondArea, initialStock: pond.initialPopulation,
          density: pond.density,
          latestLabStatus: pond.latestLabStatus,
          latestPlanktonOverwatch: pond.latestPlanktonOverwatch,
          isMidcycleBaseline: pond.cycleStartMode === 'midcycle',
          baselineDate: pond.baselineDate,
          samplingHistory: transformSamplingData(pond),
        };
      });
      const reportData = prepareSamplingReportData(company?.companyName || t.shrimpReports?.myFarm || 'My Farm',
        [...new Set(selectedPondData.map(pond => pond.blockName).filter(Boolean))].join(', ') || 'Selected ponds', user?.name || t.shrimpReports?.unknown || 'Unknown',
        new Date().toISOString(), `${t.shrimpReports?.cultureCycle || 'Culture Cycle'} ${new Date().getFullYear()}`,
        company?.companyName || t.shrimpReports?.myCompany || 'My Company', pondDataForPDF);
      await exportSamplingReportPDF(reportData, currentLanguage);
      Alert.alert(t.shrimpReports?.success || 'Success', 
        t.shrimpReports?.reportGenerated || 'Sampling report has been generated successfully!');
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert(t.shrimpReports?.error || 'Error', 
        error instanceof Error ? error.message : (t.shrimpReports?.generateFailed || 'Failed to generate report. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const getPondStats = (pond: Pond) => {
    const doc = getPondCurrentDoc(pond, company?.timeZone, farmToday);
    const metrics = calculatePondMetricsWithHarvest(pond);
    return {
      doc, currentPopulation: metrics.currentPopulation, biomass: metrics.currentBiomass, sr: metrics.adjustedSR,
      latestMBW: metrics.latestMbw, samplingCount: pond.samplings.filter(s => getSamplingMbw(s) > 0).length,
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
            color={isSelected ? '#0d2137' : '#dbe7df'} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={s.empty}>
      <Ionicons name="water-outline" size={64} color="#dce8f2" />
      <Text style={s.emptyTitle}>{t.shrimpReports?.noPonds || 'No ponds found'}</Text>
      <Text style={s.emptySubtitle}>{t.shrimpReports?.addPonds || 'Add ponds to start generating reports'}</Text>
    </View>
  );



  if (!canViewReports) return (
    <SafeAreaView style={s.container}><View style={s.empty}><Text style={s.emptyTitle}>You do not have permission to view reports.</Text></View></SafeAreaView>
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#dce8f2" />
      <SafeAreaView style={s.topSafeArea} edges={['top', 'left', 'right']}>
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={s.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#0d2137" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{t.shrimpReports?.title || 'Sampling Reports'}</Text>
          <View style={s.placeholder} />
        </View>
      </SafeAreaView>

      <ScrollView style={s.content}>
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t.shrimpReports?.selectPonds || 'Select Ponds'}</Text>
          <Text style={s.sectionSubtitle}>
            {t.shrimpReports?.selectSubtitle || 'Choose which ponds to include in the report'}
          </Text>
          <View style={s.pondList}>{activePonds.map(renderPondCard)}</View>
          {activePonds.length === 0 && renderEmptyState()}
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
            <Ionicons name="document-text" size={24} color="#0d2137" />
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
          onPress={handleGenerateReport} disabled={loading || !canExportReports || selectedPonds.size === 0}>
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
  container: { flex: 1, backgroundColor: '#f4f8fc' },
  topSafeArea: { backgroundColor: '#dce8f2' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: isAndroid ? 14 : 16, 
    paddingBottom: isAndroid ? 7 : 8, backgroundColor: '#dce8f2', borderBottomWidth: 1, borderBottomColor: '#dce8f2' },
  backButton: { padding: 8, marginLeft: -4 },
  headerTitle: { fontSize: isAndroid ? 19 : 20, fontWeight: 'bold', color: '#0d2137' },
  placeholder: { width: 40 },
  content: { flex: 1 },
  section: { padding: isAndroid ? 14 : 16 },
  sectionTitle: { fontSize: isAndroid ? 17 : 18, fontWeight: '700', color: '#0d2137', marginBottom: 4 },
  sectionSubtitle: { fontSize: isAndroid ? 13 : 14, color: '#7F8C8D', marginBottom: isAndroid ? 14 : 16 },
  pondList: { gap: isAndroid ? 10 : 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: isAndroid ? 14 : 16, borderWidth: 2, borderColor: '#e8f2f9', 
    shadowColor: '#315f57', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardSelected: { borderColor: '#0d2137', backgroundColor: '#F0F8FF' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardInfo: { flex: 1, marginRight: isAndroid ? 10 : 12 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: isAndroid ? 7 : 8 },
  cardTitle: { fontSize: isAndroid ? 15 : 16, fontWeight: '700', color: '#0d2137', marginRight: 8 },
  badge: { backgroundColor: '#0d2137', paddingHorizontal: isAndroid ? 7 : 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: '#FFFFFF', fontSize: isAndroid ? 10 : 11, fontWeight: '600' },
  cardText: { fontSize: isAndroid ? 12 : 13, color: '#7F8C8D', marginBottom: 4 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: isAndroid ? 42 : 48 },
  emptyTitle: { fontSize: isAndroid ? 15 : 16, color: '#0d2137', marginTop: isAndroid ? 14 : 16, fontWeight: '600' },
  emptySubtitle: { fontSize: isAndroid ? 13 : 14, color: '#dce8f2', marginTop: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: isAndroid ? 10 : 12 },
  summaryLabel: { fontSize: isAndroid ? 13 : 14, color: '#7F8C8D', fontWeight: '500' },
  summaryValue: { fontSize: isAndroid ? 13 : 14, color: '#0d2137', fontWeight: '700' },
  contentCard: { flexDirection: 'row', alignItems: 'flex-start', gap: isAndroid ? 14 : 16, borderWidth: 1 },
  contentInfo: { flex: 1 },
  contentTitle: { fontSize: isAndroid ? 15 : 16, fontWeight: '700', color: '#0d2137', marginBottom: isAndroid ? 7 : 8 },
  contentText: { fontSize: isAndroid ? 12 : 13, color: '#7F8C8D', lineHeight: isAndroid ? 18 : 20 },
  footer: { padding: isAndroid ? 14 : 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#dce8f2' },
  button: { backgroundColor: '#0d2137', borderRadius: 12, paddingVertical: isAndroid ? 14 : 16, paddingHorizontal: isAndroid ? 20 : 24, 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: isAndroid ? 10 : 12, shadowColor: '#315f57', 
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  buttonDisabled: { backgroundColor: '#dce8f2', opacity: 0.6 },
  buttonText: { fontSize: isAndroid ? 15 : 16, fontWeight: '700', color: '#FFFFFF' },
});
