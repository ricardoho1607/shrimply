import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { usePondStore, FeedData, Pond, Sampling } from './store/pondStore';
import { useLanguage } from '../context/LanguageContext';
import { calculateFeedTrend } from '../shared/feedTrends';

type FeedHistoryRecord = FeedData & { date: string; id: string };

export default function FeedHistoryScreen() {
  const { pondId, pondName } = useLocalSearchParams();
  const { ponds } = usePondStore();
  const { t } = useLanguage();

  const pond: Pond | undefined = ponds.find((p: Pond) => p.id === pondId);
  const displayPondName = Array.isArray(pondName) ? pondName[0] : pondName;

  const feedHistory = useMemo<FeedHistoryRecord[]>(() => (pond?.samplings || [])
    .filter((sampling: Sampling): sampling is Sampling & { feedData: FeedData } => Boolean(sampling.feedData))
    .map((sampling) => ({ ...sampling.feedData, date: sampling.date, id: sampling.id }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [pond?.samplings]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  return (
    <>
      <Stack.Screen options={{
          title: `${displayPondName || ''} ${t.feedHistory.title}`.trim(),
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
          keyExtractor={(item) => item.id || item.date}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={feedHistory.length > 0 ? (
            <View style={styles.summaryCard}>
              <View style={styles.summaryIcon}>
                <Ionicons name="analytics-outline" size={24} color="#0F4C75" />
              </View>
              <View style={styles.summaryMetric}>
                <Text style={styles.summaryLabel}>{t.feedHistory.latestFeed}</Text>
                <Text style={styles.summaryValue}>{feedHistory[0].totalDailyFeed} kg</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryMetric}>
                <Text style={styles.summaryLabel}>{t.feedHistory.records}</Text>
                <Text style={styles.summaryValue}>{feedHistory.length}</Text>
              </View>
            </View>
          ) : null}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="fish-outline" size={80} color="#315f57" />
              <Text style={styles.emptyTitle}>{t.feedHistory.noHistory}</Text>
              <Text style={styles.emptySubtitle}>{t.feedHistory.noHistorySubtitle}</Text>
            </View>
          }
          renderItem={({ item: record, index }) => {
            const trend = calculateFeedTrend(record.totalDailyFeed, feedHistory[index + 1]?.totalDailyFeed);
            const trendConfig = {
              increased: { label: t.feedHistory.increased, icon: 'arrow-up-outline', color: '#16805C', background: '#E8F7F1' },
              decreased: { label: t.feedHistory.decreased, icon: 'arrow-down-outline', color: '#C0392B', background: '#FDEDEC' },
              maintained: { label: t.feedHistory.maintained, icon: 'remove-outline', color: '#0F4C75', background: '#EAF3F8' },
              first: { label: t.feedHistory.firstRecord, icon: 'flag-outline', color: '#60758A', background: '#EEF3F6' },
            }[trend.direction];
            const signedDelta = trend.deltaKg === null ? null : `${trend.deltaKg > 0 ? '+' : ''}${trend.deltaKg.toFixed(2)} kg`;

            return (
              <View style={styles.timelineRow}>
                <View style={styles.timelineRail}>
                  <View style={styles.timelineDot} />
                  {index < feedHistory.length - 1 && <View style={styles.timelineLine} />}
                </View>
                <View style={styles.recordCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.dateGroup}>
                      <Ionicons name="calendar-outline" size={16} color="#60758A" />
                      <Text style={styles.dateText}>{formatDate(record.date)}</Text>
                    </View>
                    <View style={[styles.trendChip, { backgroundColor: trendConfig.background }]}>
                      <Ionicons name={trendConfig.icon as React.ComponentProps<typeof Ionicons>['name']} size={14} color={trendConfig.color} />
                      <Text style={[styles.trendText, { color: trendConfig.color }]}>{trendConfig.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.metricLabel}>{t.feedHistory.dailyTotal}</Text>
                  <View style={styles.feedAmountRow}>
                    <Text style={styles.feedAmount}>{record.totalDailyFeed}</Text>
                    <Text style={styles.feedUnit}>kg</Text>
                  </View>
                  <View style={styles.cardFooter}>
                    <Ionicons name="git-compare-outline" size={15} color="#60758A" />
                    <Text style={styles.comparisonText}>
                      {signedDelta && trend.percent !== null
                        ? `${signedDelta} · ${Math.abs(trend.percent).toFixed(1)}% ${t.feedHistory.fromPrevious}`
                        : t.feedHistory.firstRecord}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
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
  summaryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#DCE8F2', padding: 16, marginBottom: 20, shadowColor: '#0F4C75', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  summaryIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#EAF3F8', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  summaryMetric: { flex: 1 },
  summaryLabel: { color: '#60758A', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  summaryValue: { color: '#0D2137', fontSize: 19, fontWeight: '800' },
  summaryDivider: { width: 1, height: 36, backgroundColor: '#DCE8F2', marginHorizontal: 14 },
  timelineRow: { flexDirection: 'row', alignItems: 'stretch' },
  timelineRail: { width: 24, alignItems: 'center' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3282B8', borderWidth: 2, borderColor: '#BBE1FA', marginTop: 22, zIndex: 1 },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#DCE8F2', marginTop: -1 },
  recordCard: { flex: 1, backgroundColor: '#FFFFFF', padding: Platform.OS === 'android' ? 16 : 18, borderRadius: 18, marginBottom: 14, borderWidth: 1, borderColor: '#DCE8F2', shadowColor: '#0F4C75', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 18 },
  dateGroup: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 },
  dateText: { fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '700', color: '#334E68', flexShrink: 1 },
  trendChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999 },
  trendText: { fontSize: 11, fontWeight: '800' },
  metricLabel: { color: '#60758A', fontSize: 12, fontWeight: '600', marginBottom: 3 },
  feedAmountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  feedAmount: { color: '#0F4C75', fontSize: Platform.OS === 'android' ? 28 : 30, fontWeight: '800', letterSpacing: -0.5 },
  feedUnit: { color: '#60758A', fontSize: 14, fontWeight: '700' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#EEF3F6' },
  comparisonText: { color: '#60758A', fontSize: 12, fontWeight: '600', flex: 1 },
});
