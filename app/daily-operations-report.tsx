import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getFarmDateKey } from '../shared/farmDate';
import {
  buildDailyOperationsReport,
  type DailyOperationsPondSource,
} from '../shared/dailyOperationsReport';
import { hasFarmPermission } from '../shared/permissions';
import { getAssignedEnterpriseBlockIds } from '../shared/enterpriseBlocks';
import AppDatePicker from './components/forms/AppDatePicker';
import { useEnterpriseBlocks } from './hooks/useEnterpriseBlocks';
import { exportDailyOperationsReportPDF } from './services/dailyOperationsReportExportService';
import { isPondCycleActive, usePondStore } from './store/pondStore';

type ReportTab = 'sipon' | 'water';

const Cell = ({ value, width = 86, header = false }: { value: string | number; width?: number; header?: boolean }) => (
  <View style={[styles.cell, { width }, header && styles.headerCell]}>
    <Text style={[styles.cellText, header && styles.headerText]} numberOfLines={2}>{value}</Text>
  </View>
);

export default function DailyOperationsReportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, company } = useAuth();
  const { t, currentLanguage } = useLanguage();
  const copy = t.dailyOperationsReports;
  const ponds = usePondStore((state) => state.ponds);
  const today = getFarmDateKey(new Date(), company?.timeZone);
  const [reportDate, setReportDate] = useState(today);
  const [activeTab, setActiveTab] = useState<ReportTab>('sipon');
  const [selectedBlock, setSelectedBlock] = useState('all');
  const [exporting, setExporting] = useState(false);
  const canViewReports = hasFarmPermission(user, 'viewReports', company?.ownerId);
  const canExportReports = hasFarmPermission(user, 'exportReports', company?.ownerId);
  const enterpriseBlocks = useEnterpriseBlocks(
    company?.businessSize === 'enterprise' ? company.id : undefined,
    user?.uid,
  );
  const assignedBlockIds = useMemo(
    () => getAssignedEnterpriseBlockIds(enterpriseBlocks.blocks, user?.uid),
    [enterpriseBlocks.blocks, user?.uid],
  );

  const activePonds = useMemo(() => ponds.filter((pond) => (
    isPondCycleActive(pond) && (
      company?.businessSize !== 'enterprise' || user?.role !== 'technician' ||
      (typeof pond.blockId === 'string' && assignedBlockIds.has(pond.blockId))
    )
  )), [assignedBlockIds, company?.businessSize, ponds, user?.role]);
  const blocks = useMemo(() => Array.from(new Set(activePonds.map((pond) => pond.blockName).filter(Boolean) as string[])).sort(), [activePonds]);
  const selectedPonds = useMemo(
    () => selectedBlock === 'all' ? activePonds : activePonds.filter((pond) => pond.blockName === selectedBlock),
    [activePonds, selectedBlock],
  );
  const report = useMemo(() => buildDailyOperationsReport({
    companyName: company?.companyName || copy.myFarm,
    reportDate,
    generatedBy: user?.name || user?.email?.split('@')[0] || copy.shrimplyUser,
    ponds: selectedPonds as DailyOperationsPondSource[],
  }), [company?.companyName, copy.myFarm, copy.shrimplyUser, reportDate, selectedPonds, user?.email, user?.name]);

  const exportReport = async () => {
    if (!canExportReports || exporting) return;
    setExporting(true);
    try {
      await exportDailyOperationsReportPDF(report, currentLanguage);
    } catch {
      Alert.alert(copy.exportFailedTitle, copy.exportFailedMessage);
    } finally {
      setExporting(false);
    }
  };

  if (!canViewReports) {
    return <SafeAreaView style={styles.container}><Text style={styles.emptyTitle}>{copy.noPermission}</Text></SafeAreaView>;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="#dce8f2" />
      <SafeAreaView style={styles.topSafeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel={t.actions.back}
          >
            <Ionicons name="arrow-back" size={24} color="#0d2137" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{copy.menuLabel}</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 44) }]}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}><Ionicons name="clipboard-outline" size={24} color="#0F4C75" /></View>
          <View style={styles.heroCopy}>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.subtitle}>{copy.subtitle}</Text>
          </View>
        </View>

        <View style={styles.filters}>
          <AppDatePicker
            label={copy.reportDate}
            value={reportDate}
            maximumDate={new Date(`${today}T23:59:59`)}
            onChange={(date) => setReportDate(getFarmDateKey(date, company?.timeZone))}
          />
          {blocks.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.blockRow}>
            {['all', ...blocks].map((block) => (
              <TouchableOpacity key={block} style={[styles.blockChip, selectedBlock === block && styles.blockChipActive]} onPress={() => setSelectedBlock(block)}>
                <Text style={[styles.blockChipText, selectedBlock === block && styles.blockChipTextActive]}>{block === 'all' ? copy.allBlocks : block}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>}
        </View>

        <View style={styles.tabs}>
          {([
            { key: 'sipon' as const, label: copy.dailySipon, icon: 'fish-outline' as const },
            { key: 'water' as const, label: copy.waterQuality, icon: 'water-outline' as const },
          ]).map((tab) => (
            <TouchableOpacity key={tab.key} style={[styles.tab, activeTab === tab.key && styles.tabActive]} onPress={() => setActiveTab(tab.key)}>
              <Ionicons name={tab.icon} size={17} color={activeTab === tab.key ? '#fff' : '#315f57'} />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.reportCard}>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            {activeTab === 'sipon' ? (
              <View>
                <View style={styles.row}>
                  {[copy.pond, copy.doc, copy.morningSiphoned, copy.morningMortal, copy.morningTotal, copy.eveningSiphoned, copy.eveningMortal, copy.eveningTotal, copy.dailyTotal, copy.cumulative, copy.population, copy.density].map((label) => <Cell key={label} value={label} header width={label === copy.pond ? 78 : 86} />)}
                </View>
                {report.siponRows.map((row) => <View key={row.pondName} style={styles.row}>
                  <Cell value={row.pondName} width={78} /><Cell value={row.doc} />
                  <Cell value={row.morningSiphoned} /><Cell value={row.morningMortal} /><Cell value={row.morningTotal} />
                  <Cell value={row.eveningSiphoned} /><Cell value={row.eveningMortal} /><Cell value={row.eveningTotal} />
                  <Cell value={row.dailyTotal} /><Cell value={row.cumulativeTotal} />
                  <Cell value={Math.round(row.estimatedPopulation).toLocaleString()} /><Cell value={Math.round(row.density)} />
                </View>)}
              </View>
            ) : (
              <View>
                <View style={styles.row}>
                  {[copy.stocked, copy.pond, copy.doc, copy.recordedBy, copy.phMorning, `${copy.temperature} °C`, copy.waterAppearance, `${copy.waterDepth} cm`, `${copy.transparency} cm`, copy.salinity, copy.alkalinity].map((label) => <Cell key={label} value={label} header />)}
                </View>
                {report.waterQualityRows.map((row) => <View key={row.pondName} style={styles.row}>
                  <Cell value={row.stockingDate || '-'} /><Cell value={row.pondName} /><Cell value={row.doc} /><Cell value={row.recordedBy} />
                  <Cell value={row.phMorning} /><Cell value={row.temperature} /><Cell value={row.waterAppearance} /><Cell value={row.waterDepthCm} />
                  <Cell value={row.transparency} /><Cell value={row.salinity} /><Cell value={row.alkalinity} />
                </View>)}
                {report.waterQualityRows.length === 0 && <View style={styles.emptyRow}><Text style={styles.emptyText}>{copy.noWaterRecords}</Text></View>}
              </View>
            )}
          </ScrollView>
        </View>

        <TouchableOpacity style={[styles.exportButton, (!canExportReports || exporting) && styles.disabled]} onPress={exportReport} disabled={!canExportReports || exporting}>
          {exporting ? <ActivityIndicator color="#fff" /> : <Ionicons name="download-outline" size={20} color="#fff" />}
          <Text style={styles.exportText}>{exporting ? copy.exporting : copy.exportBoth}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8fc' },
  topSafeArea: { backgroundColor: '#dce8f2' },
  header: { minHeight: 58, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: '#0d2137', fontSize: 19, fontWeight: '700' },
  headerSpacer: { width: 42 },
  content: { padding: 18, paddingBottom: 44, gap: 16 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#dce8f2' },
  heroCopy: { flex: 1 },
  title: { color: '#0d2137', fontSize: 22, fontWeight: '700' },
  subtitle: { color: '#486581', fontSize: 13, marginTop: 3, lineHeight: 18 },
  filters: { backgroundColor: '#fff', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#dce8f2' },
  blockRow: { gap: 8, paddingTop: 12 },
  blockChip: { borderRadius: 999, borderWidth: 1, borderColor: '#bcccdc', paddingHorizontal: 14, paddingVertical: 8 },
  blockChipActive: { backgroundColor: '#0F4C75', borderColor: '#0F4C75' },
  blockChipText: { color: '#315f57', fontSize: 12, fontWeight: '600' },
  blockChipTextActive: { color: '#fff' },
  tabs: { flexDirection: 'row', backgroundColor: '#e8f2f9', borderRadius: 14, padding: 4 },
  tab: { flex: 1, minHeight: 42, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  tabActive: { backgroundColor: '#0F4C75' },
  tabText: { color: '#315f57', fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: '#fff' },
  reportCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#dce8f2', overflow: 'hidden' },
  row: { flexDirection: 'row' },
  cell: { minHeight: 48, paddingHorizontal: 5, paddingVertical: 8, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#d9e2ec', alignItems: 'center', justifyContent: 'center' },
  headerCell: { backgroundColor: '#fff4a8', minHeight: 58 },
  cellText: { color: '#243b53', fontSize: 11, textAlign: 'center' },
  headerText: { color: '#102a43', fontWeight: '700', fontSize: 10 },
  emptyRow: { width: 946, padding: 28, alignItems: 'center' },
  emptyText: { color: '#627d98', fontSize: 13 },
  emptyTitle: { color: '#0d2137', fontSize: 18, fontWeight: '700', margin: 24, textAlign: 'center' },
  exportButton: { minHeight: 52, borderRadius: 14, backgroundColor: '#0F4C75', flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center' },
  exportText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
