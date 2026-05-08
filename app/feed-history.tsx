import React, { useEffect } from 'react';
import { FlatList, StyleSheet, Text, View, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { usePondStore, Pond, Sampling } from './store/pondStore';
import { useLanguage } from '../context/LanguageContext';

export default function FeedHistoryScreen() {
  const { pondId, pondName } = useLocalSearchParams();
  const { ponds } = usePondStore();
  const { t } = useLanguage();

  const pond: Pond | undefined = ponds.find((p: Pond) => p.id === pondId);

  useEffect(() => {}, [pondName]);

  const feedHistory = pond?.samplings
    .filter((s: Sampling) => s.feedData)
    .map((s: Sampling) => ({ ...s.feedData, date: s.date, id: s.id }))
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [];

  const getAncoValueColor = (percentage: string) => {
    const num = parseFloat(percentage);
    if (isNaN(num)) return "#0d2137";
    return { 100: "#27ae60", 75: "#f39c12", 50: "#e74c3c", 0: "#e74c3c" }[num] || "#0d2137";
  };

  const renderParameterItem = (iconName: string, label: string, value: string, 
    color: string = "#0d2137", isAncoDisplay: boolean = false, anco1?: string, anco2?: string) => (
    <View style={styles.parameterItem}>
      <Ionicons name={iconName as any} size={16} color="#dce8f2" />
      <Text style={styles.parameterLabel}>{label}</Text>
      {isAncoDisplay && anco1 && anco2 ? (
        <View style={styles.ancoDisplayContainer}>
          <Text style={[styles.ancoDisplayValue, { color: getAncoValueColor(anco1) }]}>
            {anco1 || "N/A"}%
          </Text>
          <Text style={styles.ancoDisplaySeparator}> | </Text>
          <Text style={[styles.ancoDisplayValue, { color: getAncoValueColor(anco2) }]}>
            {anco2 || "N/A"}%
          </Text>
        </View>
      ) : (
        <Text style={[styles.parameterValue, { color }]}>{value || "N/A"}</Text>
      )}
    </View>
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  return (
    <>
      <Stack.Screen options={{
          title: `${pondName} ${t.feedHistory.title}`,
          headerBackTitle: t.feedHistory.backButton,
          headerStyle: { backgroundColor: '#dce8f2' },
          headerTintColor: '#0d2137',
          headerTitleStyle: { fontWeight: 'bold', fontSize: Platform.OS === 'android' ? 17 : 18 },
          headerShadowVisible: false,
        }} />
      <StatusBar barStyle="light-content" backgroundColor="#0d2137" />
      <View style={styles.container}>
        <FlatList
          data={feedHistory}
          keyExtractor={(item, index) => item.id || `${item.date}-${index}`}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="fish-outline" size={80} color="#315f57" />
              <Text style={styles.emptyTitle}>{t.feedHistory.noHistory}</Text>
              <Text style={styles.emptySubtitle}>{t.feedHistory.noHistorySubtitle}</Text>
            </View>
          }
          renderItem={({ item: record }) => (
              <View style={styles.recordCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.dateText}>{formatDate(record.date)}</Text>
                  <View style={styles.totalFeedBadge}>
                    <Text style={styles.totalFeedText}>{record.totalDailyFeed} kg</Text>
                  </View>
                </View>

                <View style={styles.parametersContainer}>
                  <View style={styles.parameterRow}>
                    {renderParameterItem("stats-chart-outline", t.feedHistory.anco, 
                      `${record.ancoPercentage || "N/A"}%`, "#0d2137")}
                  </View>
                  <View style={styles.parameterRow}>
                    {renderParameterItem("ellipse-outline", t.feedHistory.f1, "", "#0d2137", 
                      true, record.anco1, record.anco2)}
                    {renderParameterItem("ellipse-outline", t.feedHistory.f2, "", "#0d2137", 
                      true, record.anco3, record.anco4)}
                  </View>
                  <View style={styles.parameterRow}>
                    {renderParameterItem("ellipse-outline", t.feedHistory.f3, "", "#0d2137", 
                      true, record.anco5, record.anco6)}
                    {renderParameterItem("ellipse-outline", t.feedHistory.f4, "", "#0d2137", 
                      true, record.anco7, record.anco8)}
                  </View>
                </View>
              </View>
          )}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8fc' },
  scrollContent: { padding: Platform.OS === 'android' ? 16 : 20, paddingBottom: 40 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: Platform.OS === 'android' ? 60 : 80 },
  emptyTitle: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 22 : 24, fontWeight: 'bold', marginTop: Platform.OS === 'android' ? 16 : 20 },
  emptySubtitle: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 15 : 16, marginTop: 8, textAlign: 'center', lineHeight: Platform.OS === 'android' ? 20 : 22 },
  recordCard: { backgroundColor: '#FFFFFF', padding: Platform.OS === 'android' ? 16 : 20, borderRadius: 16, marginBottom: Platform.OS === 'android' ? 12 : 16, borderWidth: 1, borderColor: '#e8f2f9', shadowColor: '#315f57', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Platform.OS === 'android' ? 12 : 16 },
  dateText: { fontSize: Platform.OS === 'android' ? 17 : 18, fontWeight: 'bold', color: '#0d2137' },
  totalFeedBadge: { backgroundColor: '#315f57', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  totalFeedText: { color: '#fff', fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: 'bold' },
  parametersContainer: { gap: Platform.OS === 'android' ? 10 : 12 },
  parameterRow: { flexDirection: 'row', justifyContent: 'space-between' },
  parameterItem: { flex: 1, flexDirection: 'row', alignItems: 'center', marginHorizontal: 4, minWidth: 0 },
  parameterLabel: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 11 : 12, marginLeft: 6, width: 50, flexShrink: 0 },
  parameterValue: { fontSize: Platform.OS === 'android' ? 11 : 12, fontWeight: '600', textAlign: 'left', flex: 1, minWidth: 80, marginLeft: 8 },
  ancoDisplayContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 1 },
  ancoDisplayValue: { fontSize: Platform.OS === 'android' ? 11 : 12, fontWeight: '600', textAlign: 'left' },
  ancoDisplaySeparator: { fontSize: Platform.OS === 'android' ? 11 : 12, fontWeight: '600', color: '#0d2137' },
});
