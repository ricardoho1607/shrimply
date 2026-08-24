import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import type { PlanktonOverwatchSnapshot, PlanktonOverwatchState } from '../../shared/planktonOverwatch';
import { localizePlanktonOverwatchSnapshot } from '../../shared/planktonOverwatchI18n';

interface Props {
  snapshot?: PlanktonOverwatchSnapshot | null;
  compact?: boolean;
}

const STATE_STYLE: Record<PlanktonOverwatchState, { color: string; background: string; border: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  insufficient: { color: '#526D82', background: '#F4F8FC', border: '#DCE8F2', icon: 'help-circle-outline' },
  stable: { color: '#276749', background: '#F0FFF4', border: '#B7E4C7', icon: 'checkmark-circle-outline' },
  watch: { color: '#9C6500', background: '#FFFAEB', border: '#F6D675', icon: 'eye-outline' },
  high: { color: '#B45309', background: '#FFF7ED', border: '#FDBA74', icon: 'warning-outline' },
  critical: { color: '#C53030', background: '#FFF5F5', border: '#FEB2B2', icon: 'alert-circle-outline' },
};

export default function PlanktonOverwatchCard({ snapshot, compact = false }: Props) {
  const { t } = useLanguage();
  if (!snapshot) return null;

  const labels: Record<PlanktonOverwatchState, string> = {
    insufficient: t.waterQuality.overwatchInsufficient,
    stable: t.waterQuality.overwatchStable,
    watch: t.waterQuality.overwatchWatch,
    high: t.waterQuality.overwatchHigh,
    critical: t.waterQuality.overwatchCritical,
  };
  const tone = STATE_STYLE[snapshot.state] || STATE_STYLE.insufficient;
  const localized = localizePlanktonOverwatchSnapshot(snapshot, t.waterQuality);
  const evidence = localized.evidence.slice(0, compact ? 1 : 2);
  const missing = localized.missing.slice(0, 3);

  return (
    <View style={[styles.card, { backgroundColor: tone.background, borderColor: tone.border }, compact && styles.compactCard]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name={tone.icon} size={20} color={tone.color} />
          <Text style={styles.title}>{t.waterQuality.overwatchTitle}</Text>
        </View>
        <View style={[styles.badge, { borderColor: tone.border }]}>
          <Text style={[styles.badgeText, { color: tone.color }]}>{labels[snapshot.state]}</Text>
        </View>
      </View>

      <Text style={styles.message}>{localized.message}</Text>

      {!compact && evidence.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.waterQuality.overwatchEvidence}</Text>
          {evidence.map((item) => (
            <View key={item.id} style={styles.evidenceRow}>
              <View style={[styles.dot, { backgroundColor: tone.color }]} />
              <Text style={styles.detailText}>{item.text}</Text>
            </View>
          ))}
        </View>
      )}

      {!compact && snapshot.state === 'insufficient' && missing.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.waterQuality.overwatchMissingData}</Text>
          <Text style={styles.detailText}>{missing.join(', ')}</Text>
        </View>
      )}

      {localized.nextAction && (
        <View style={styles.actionBox}>
          <Text style={[styles.sectionLabel, { color: tone.color }]}>{t.waterQuality.overwatchNextAction}</Text>
          <Text style={styles.detailText}>{localized.nextAction}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 16, padding: 16, borderRadius: 16, borderWidth: 1 },
  compactCard: { marginTop: 10, padding: 13 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  titleRow: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, color: '#0D2137', fontSize: 15, fontWeight: '800' },
  badge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, borderWidth: 1, backgroundColor: '#FFFFFF' },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  message: { marginTop: 10, color: '#334E68', fontSize: 13, lineHeight: 19, fontWeight: '600' },
  section: { marginTop: 13, gap: 7 },
  sectionLabel: { color: '#526D82', fontSize: 10, lineHeight: 14, fontWeight: '800', textTransform: 'uppercase' },
  evidenceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dot: { width: 6, height: 6, marginTop: 6, borderRadius: 3 },
  detailText: { flex: 1, color: '#334E68', fontSize: 12, lineHeight: 18, fontWeight: '600' },
  actionBox: { marginTop: 13, padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.72)', gap: 5 },
});
