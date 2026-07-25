import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useLanguage } from '../../../context/LanguageContext';
import {
  getEnterpriseTechnicianLabel,
  type EnterprisePondRisk,
  type EnterpriseTechnician,
  type FarmBlock,
} from '../../../shared/enterpriseBlocks';

type TileTone = EnterprisePondRisk | 'neutral';

interface GridPond {
  id: string;
  pondName: string;
  blockId?: string | null;
}

interface EnterprisePondGridProps<TPond extends GridPond> {
  blocks: FarmBlock[];
  technicians?: EnterpriseTechnician[];
  ponds: TPond[];
  onPress: (pond: TPond) => void;
  getTone?: (pond: TPond) => TileTone;
  getSubtitle?: (pond: TPond) => string | undefined;
  emptyMessage: string;
}

const TILE_COLORS: Record<TileTone, { background: string; border: string; text: string }> = {
  stable: { background: '#C1E1C1', border: '#C1E1C1', text: '#1F5132' },
  warning: { background: '#FAC898', border: '#FAC898', text: '#5A3700' },
  'high-risk': { background: '#FAA0A0', border: '#FAA0A0', text: '#721C24' },
  neutral: { background: '#3282B8', border: '#3282B8', text: '#FFFFFF' },
};

export default function EnterprisePondGrid<TPond extends GridPond>({
  blocks,
  technicians = [],
  ponds,
  onPress,
  getTone = () => 'neutral',
  getSubtitle,
  emptyMessage,
}: EnterprisePondGridProps<TPond>) {
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const columns = width < 600 ? 5 : width < 1000 ? 8 : Math.max(10, Math.min(14, Math.floor(width / 92)));
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const unassigned = useMemo(() => ponds.filter((pond) => !pond.blockId), [ponds]);
  const displayBlocks = useMemo(() => [
    ...blocks,
    ...(unassigned.length > 0 ? [{ id: '__unassigned__', companyId: '', name: t.enterprise.unassignedPonds }] : []),
  ], [blocks, t.enterprise.unassignedPonds, unassigned.length]);

  if (displayBlocks.length === 0) {
    return <View style={styles.empty}><Ionicons name="grid-outline" size={48} color="#5E829A" /><Text style={styles.emptyText}>{emptyMessage}</Text></View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {displayBlocks.map((block) => {
        const blockPonds = block.id === '__unassigned__' ? unassigned : ponds.filter((pond) => pond.blockId === block.id);
        const isExpanded = Boolean(expanded[block.id]);
        const currentTechnician = technicians.find((technician) => technician.uid === block.assignedTechnicianId);
        const technicianLabel = getEnterpriseTechnicianLabel(
          currentTechnician?.name,
          currentTechnician?.email,
          getEnterpriseTechnicianLabel(
            block.assignedTechnicianName,
            block.assignedTechnicianEmail,
            t.enterprise.unassigned,
          ),
        );
        return (
          <View key={block.id} style={styles.block}>
            <TouchableOpacity style={styles.header} onPress={() => setExpanded((current) => ({ ...current, [block.id]: !current[block.id] }))}>
              <View style={styles.headerCopy}>
                <View style={styles.blockTitleRow}>
                  <Text style={styles.blockName} numberOfLines={1}>{block.name}</Text>
                  <View style={styles.technicianBadge}>
                    <Ionicons name="person-outline" size={12} color="#0F4C75" />
                    <Text style={styles.technicianBadgeText} numberOfLines={1}>{technicianLabel}</Text>
                  </View>
                </View>
                <Text style={styles.meta}>{t.enterprise.pondCount.replace('{{count}}', String(blockPonds.length))}</Text>
              </View>
              <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color="#315f57" />
            </TouchableOpacity>
            {isExpanded ? (
              blockPonds.length > 0 ? (
                <View style={styles.grid}>
                  {blockPonds.map((pond) => {
                    const colors = TILE_COLORS[getTone(pond)];
                    return (
                      <View key={pond.id} style={[styles.column, { width: `${100 / columns}%` as `${number}%` }]}>
                        <TouchableOpacity style={[styles.tile, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => onPress(pond)}>
                          <Text style={[styles.name, { color: colors.text }]} numberOfLines={2} adjustsFontSizeToFit>{pond.pondName}</Text>
                          {getSubtitle ? <Text style={[styles.subtitle, { color: colors.text }]} numberOfLines={1}>{getSubtitle(pond)}</Text> : null}
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              ) : <Text style={styles.noPonds}>{t.enterprise.noPondsInBlock}</Text>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 14, paddingBottom: 100, gap: 10 },
  block: { backgroundColor: '#FFFFFF', borderRadius: 15, borderWidth: 1, borderColor: '#D9E5ED', overflow: 'hidden' },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  headerCopy: { flex: 1 },
  blockTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  blockName: { flexShrink: 1, color: '#18384F', fontSize: 15, fontWeight: '800' },
  technicianBadge: {
    maxWidth: '58%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#E8F3FA',
  },
  technicianBadgeText: { flexShrink: 1, color: '#0F4C75', fontSize: 10, fontWeight: '800' },
  meta: { color: '#6B8191', fontSize: 10, marginTop: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 7 },
  column: { padding: 3 },
  tile: { aspectRatio: 1, borderRadius: 8, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', padding: 3 },
  name: { fontSize: 9, lineHeight: 11, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 7, marginTop: 2, opacity: 0.82 },
  noPonds: { paddingHorizontal: 14, paddingBottom: 14, color: '#6B8191', fontSize: 11 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 30 },
  emptyText: { color: '#6B8191', textAlign: 'center' },
});
