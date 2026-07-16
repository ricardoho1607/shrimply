import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { usePondStore, FeedData, Pond, Sampling } from './store/pondStore';
import { useLanguage } from '../context/LanguageContext';

type FeedHistoryRecord = FeedData & { date: string; id: string };

export default function FeedHistoryScreen() {
  const { pondId, pondName } = useLocalSearchParams();
  const { ponds } = usePondStore();
  const { t } = useLanguage();

  const resolvedPondId = Array.isArray(pondId) ? pondId[0] : pondId;
  const pond: Pond | undefined = ponds.find((p: Pond) => p.id === resolvedPondId);
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
        {feedHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="fish-outline" size={80} color="#315f57" />
            <Text style={styles.emptyTitle}>{t.feedHistory.noHistory}</Text>
            <Text style={styles.emptySubtitle}>{t.feedHistory.noHistorySubtitle}</Text>
          </View>
        ) : (
          <View style={styles.historyCard}>
            <FlatList
              data={feedHistory}
              keyExtractor={(item) => item.id || item.date}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item: record }) => (
                <View style={styles.historyRow}>
                  <Text style={styles.dateText}>{formatDate(record.date)}</Text>
                  <Text style={styles.feedAmount}>{record.totalDailyFeed} kg</Text>
                </View>
              )}
            />
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8fc' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: Platform.OS === 'android' ? 60 : 80 },
  emptyTitle: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 22 : 24, fontWeight: 'bold', marginTop: Platform.OS === 'android' ? 16 : 20 },
  emptySubtitle: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 15 : 16, marginTop: 8, textAlign: 'center', lineHeight: Platform.OS === 'android' ? 20 : 22 },
  historyCard: { flexShrink: 1, margin: Platform.OS === 'android' ? 16 : 20, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#DCE8F2', overflow: 'hidden' },
  historyRow: { minHeight: 58, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  separator: { height: 1, backgroundColor: '#EEF3F6', marginHorizontal: 16 },
  dateText: { color: '#334E68', fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '600', flexShrink: 1 },
  feedAmount: { color: '#0F4C75', fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: '800' },
});
