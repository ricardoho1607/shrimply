import { getUserErrorMessage } from '../../../shared/userError';
import { AppAlert as Alert } from '../../../components/alerts/appAlert';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';
import ProfileCompletionCard from '../onboarding/ProfileCompletionCard';
import {
  getPhysicalPondKey,
  isPondCycleActive,
  type FarmCycle,
  type PhysicalPond,
  type Pond,
} from '../../store/pondStore';
import {
  getEnterpriseTechnicianLabel,
  getEnterprisePondStatus,
  type EnterprisePondRisk,
  type EnterpriseTechnician,
  type FarmBlock,
} from '../../../shared/enterpriseBlocks';

interface EnterpriseDashboardProps {
  ponds: Pond[];
  physicalPonds: PhysicalPond[];
  blocks: FarmBlock[];
  technicians: EnterpriseTechnician[];
  activeFarmCycle?: FarmCycle;
  cyclesCount: number;
  currentCyclePonds: Pond[];
  activeCyclePonds: Pond[];
  cycleNameDraft: string;
  timeZone?: string;
  loading: boolean;
  error?: string | null;
  onCycleNameChange: (value: string) => void;
  onRenameCycle: () => void;
  onCloseCycle: () => void;
  onStartCycle: () => void;
  onStartPondCycle: (pond: Pond | PhysicalPond) => void;
  createBlock: (input: { name: string; technician?: EnterpriseTechnician | null }) => Promise<void>;
  assignBlockTechnician: (input: { blockId: string; technician: EnterpriseTechnician }) => Promise<void>;
}

type EnterpriseCycleFilter = 'active' | 'inactive' | 'ended';
type EnterpriseDashboardRecord = Pond | PhysicalPond;

const STATUS_COLORS: Record<EnterprisePondRisk, { background: string; border: string; text: string }> = {
  stable: { background: '#C1E1C1', border: '#C1E1C1', text: '#1F5132' },
  warning: { background: '#FAC898', border: '#FAC898', text: '#5A3700' },
  'high-risk': { background: '#FAA0A0', border: '#FAA0A0', text: '#721C24' },
};

export default function EnterpriseDashboard({
  ponds,
  physicalPonds,
  blocks,
  technicians,
  activeFarmCycle,
  cyclesCount,
  currentCyclePonds,
  activeCyclePonds,
  cycleNameDraft,
  timeZone,
  loading,
  error,
  onCycleNameChange,
  onRenameCycle,
  onCloseCycle,
  onStartCycle,
  onStartPondCycle,
  createBlock,
  assignBlockTechnician,
}: EnterpriseDashboardProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const { company } = useAuth();
  const { width } = useWindowDimensions();
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>({});
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedPond, setSelectedPond] = useState<Pond | null>(null);
  const [blockName, setBlockName] = useState('');
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const [assignmentBlock, setAssignmentBlock] = useState<FarmBlock | null>(null);
  const [assignmentTechnicianId, setAssignmentTechnicianId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cycleFilter, setCycleFilter] = useState<EnterpriseCycleFilter>('active');
  const [cycleManagerExpanded, setCycleManagerExpanded] = useState(false);

  const columnCount = width < 600 ? 5 : width < 1000 ? 8 : Math.max(10, Math.min(14, Math.floor(width / 92)));
  const currentActiveCyclePonds = useMemo(
    () => activeCyclePonds.filter(isPondCycleActive),
    [activeCyclePonds],
  );
  const activePonds = useMemo(() => ponds.filter(isPondCycleActive), [ponds]);
  const endedPonds = useMemo(() => ponds.filter((pond) => !isPondCycleActive(pond)), [ponds]);
  const activePhysicalPondNames = useMemo(
    () => new Set(activePonds.map((pond) => getPhysicalPondKey(pond.pondName))),
    [activePonds],
  );
  const inactivePonds = useMemo(() => physicalPonds.filter((pond) => (
    pond.status !== 'active'
    && !activePhysicalPondNames.has(getPhysicalPondKey(pond.pondName))
  )), [activePhysicalPondNames, physicalPonds]);
  const displayedRecords = useMemo<EnterpriseDashboardRecord[]>(() => {
    if (cycleFilter === 'inactive') return inactivePonds;
    if (cycleFilter === 'ended') return endedPonds;
    return activePonds;
  }, [activePonds, cycleFilter, endedPonds, inactivePonds]);
  const statusByPondId = useMemo(() => new Map(ponds.map((pond) => [
    pond.id,
    getEnterprisePondStatus(pond, timeZone),
  ])), [ponds, timeZone]);
  const unassignedPonds = useMemo(() => displayedRecords.filter((pond) => !pond.blockId), [displayedRecords]);
  const displayBlocks = useMemo(() => [
    ...blocks,
    ...(unassignedPonds.length > 0 ? [{
      id: '__unassigned__',
      companyId: '',
      name: t.enterprise.unassignedPonds,
    } satisfies FarmBlock] : []),
  ], [blocks, t.enterprise.unassignedPonds, unassignedPonds.length]);

  const selectedStatus = selectedPond ? statusByPondId.get(selectedPond.id) : undefined;
  const riskCounts = useMemo(() => activePonds.reduce((counts, pond) => {
    const risk = statusByPondId.get(pond.id)?.risk || 'stable';
    counts[risk] += 1;
    return counts;
  }, { stable: 0, warning: 0, 'high-risk': 0 } as Record<EnterprisePondRisk, number>), [activePonds, statusByPondId]);

  const getPondsForBlock = (blockId: string) => (
    blockId === '__unassigned__'
      ? unassignedPonds
      : displayedRecords.filter((pond) => pond.blockId === blockId)
  );

  const getBlockCycleMeta = (blockId: string) => {
    const matchesBlock = (pond: { blockId?: string }) => (
      blockId === '__unassigned__' ? !pond.blockId : pond.blockId === blockId
    );
    const activeCount = activePonds.filter(matchesBlock).length;
    const inactiveCount = inactivePonds.filter(matchesBlock).length;
    const endedCount = endedPonds.filter(matchesBlock).length;
    return `${t.farmCycle.filterActive} ${activeCount} • ${t.farmCycle.filterInactive} ${inactiveCount} • ${t.farmCycle.filterEnded} ${endedCount}`;
  };

  const toggleBlock = (blockId: string) => {
    setExpandedBlocks((current) => ({ ...current, [blockId]: !current[blockId] }));
  };

  const closeCreateModal = () => {
    Keyboard.dismiss();
    setBlockName('');
    setTechnicianId(null);
    setCreateModalVisible(false);
  };

  const handleCreateBlock = async () => {
    if (!blockName.trim()) {
      Alert.alert(t.messages.error, t.enterprise.blockNameRequired);
      return;
    }
    setSaving(true);
    try {
      await createBlock({
        name: blockName,
        technician: technicians.find((technician) => technician.uid === technicianId) || null,
      });
      closeCreateModal();
    } catch (createError) {
      Alert.alert(
        t.messages.error,
        getUserErrorMessage(createError, t.enterprise.blockCreateFailed),
      );
    } finally {
      setSaving(false);
    }
  };

  const closeAssignmentModal = () => {
    setAssignmentBlock(null);
    setAssignmentTechnicianId(null);
  };

  const handleAssignTechnician = async () => {
    const technician = technicians.find((candidate) => candidate.uid === assignmentTechnicianId);
    if (!assignmentBlock || !technician) return;

    setSaving(true);
    try {
      await assignBlockTechnician({ blockId: assignmentBlock.id, technician });
      closeAssignmentModal();
    } catch (assignmentError) {
      console.error('Failed to assign enterprise block technician:', assignmentError);
      Alert.alert(t.messages.error, t.enterprise.blockAssignmentFailed);
    } finally {
      setSaving(false);
    }
  };

  const openRelevantScreen = () => {
    if (!selectedPond || !selectedStatus) return;
    const hasWaterWarning = selectedStatus.warnings.some((warning) => warning.destination === 'water_quality');
    setSelectedPond(null);
    if (hasWaterWarning) {
      router.push('/water-quality');
      return;
    }
    router.push({ pathname: '/ponddetails', params: { pondId: selectedPond.id } });
  };

  return (
    <View style={styles.container}>
      <ProfileCompletionCard
        company={company}
        onPress={() => router.push('/company-setup2?edit=true' as any)}
      />
      <View style={[
        styles.cycleManagerCard,
        !cycleManagerExpanded && styles.cycleManagerCardCollapsed,
      ]}>
        <TouchableOpacity
          style={[
            styles.cycleManagerHeader,
            !cycleManagerExpanded && styles.cycleManagerHeaderCollapsed,
          ]}
          onPress={() => setCycleManagerExpanded((expanded) => !expanded)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityState={{ expanded: cycleManagerExpanded }}
        >
          <View style={styles.cycleHeaderLeft}>
            {cycleManagerExpanded ? (
              <>
                <Text style={styles.cycleEyebrow}>{t.farmCycle.currentCycle}</Text>
                <Text style={styles.cycleTitle}>
                  {activeFarmCycle?.cycleName || t.farmCycle.noActiveCycle}
                </Text>
                <Text style={styles.cycleCompactMeta}>
                  {activeFarmCycle
                    ? t.farmCycle.cycleMeta
                      .replace('{{pondCount}}', String(currentCyclePonds.length))
                      .replace('{{activeCount}}', String(currentActiveCyclePonds.length))
                    : t.farmCycle.addPondToCreateCycle.replace('{{cycleNumber}}', String(cyclesCount + 1))}
                </Text>
              </>
            ) : (
              <View style={styles.cycleCollapsedContent}>
                <View style={[
                  styles.cycleStatusDot,
                  !activeFarmCycle && styles.cycleStatusDotMuted,
                ]} />
                <Text style={styles.cycleCollapsedTitle} numberOfLines={1}>
                  {activeFarmCycle?.cycleName || t.farmCycle.noActiveCycle}
                </Text>
                <Text style={styles.cycleCollapsedMeta} numberOfLines={1}>
                  {activeFarmCycle
                    ? `${currentCyclePonds.length} ${t.farmCycle.ponds} | ${activeFarmCycle.status.toUpperCase()}`
                    : t.farmCycle.addPondToCreateCycle.replace('{{cycleNumber}}', String(cyclesCount + 1))}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.cycleHeaderRight}>
            {cycleManagerExpanded ? (
              <View style={[styles.cycleStatusBadge, !activeFarmCycle && styles.cycleStatusBadgeMuted]}>
                <Text style={styles.cycleStatusText}>
                  {(activeFarmCycle?.status || t.farmCycle.status.waiting).toUpperCase()}
                </Text>
              </View>
            ) : null}
            <Ionicons
              name={cycleManagerExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
              size={cycleManagerExpanded ? 20 : 18}
              color="#315f57"
            />
          </View>
        </TouchableOpacity>

        {cycleManagerExpanded && activeFarmCycle ? (
          <>
            <View style={styles.cycleStats}>
              <View style={styles.cycleStat}>
                <Text style={styles.cycleStatValue}>{currentCyclePonds.length}</Text>
                <Text style={styles.cycleStatLabel}>{t.farmCycle.ponds}</Text>
              </View>
              <View style={styles.cycleStat}>
                <Text style={styles.cycleStatValue}>
                  {activeFarmCycle.stockingStartDate
                    || activeFarmCycle.plannedStartDate
                    || currentCyclePonds[0]?.docStart
                    || '-'}
                </Text>
                <Text style={styles.cycleStatLabel}>{t.farmCycle.stockingStart}</Text>
              </View>
            </View>
            <View style={styles.cycleActions}>
              <TextInput
                value={cycleNameDraft}
                onChangeText={onCycleNameChange}
                placeholder={t.farmCycle.cycleName}
                placeholderTextColor="#6B8090"
                style={styles.cycleNameInput}
              />
              <TouchableOpacity style={styles.cycleRenameButton} onPress={onRenameCycle}>
                <Text style={styles.cycleRenameText}>{t.farmCycle.rename}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.cyclePondList}>
              {currentCyclePonds.slice(0, 4).map((pond) => (
                <View
                  key={pond.id}
                  style={[
                    styles.cyclePondChip,
                    pond.cycleStatus === 'ended' && styles.cyclePondChipEnded,
                  ]}
                >
                  <Text style={styles.cyclePondChipText}>{pond.pondName}</Text>
                </View>
              ))}
              {currentCyclePonds.length > 4 ? (
                <View style={styles.cyclePondChip}>
                  <Text style={styles.cyclePondChipText}>+{currentCyclePonds.length - 4} more</Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity style={styles.cycleCloseButton} onPress={onCloseCycle}>
              <Ionicons name="lock-closed-outline" size={18} color="#FFFFFF" />
              <Text style={styles.cycleCloseText}>{t.farmCycle.endCycleAction}</Text>
            </TouchableOpacity>
          </>
        ) : cycleManagerExpanded ? (
          <TouchableOpacity style={styles.startCycleButton} onPress={onStartCycle}>
            <Ionicons name="play-outline" size={18} color="#FFFFFF" />
            <Text style={styles.startCycleButtonText}>{t.farmCycle.startFarmCycle}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.blockSectionHeader}>
        <View style={styles.blockSectionCopy}>
          <Text style={styles.blockSectionTitle}>{t.enterprise.title}</Text>
          <Text style={styles.blockSectionMeta}>
            {t.enterprise.summary
              .replace('{{blockCount}}', String(blocks.length))
              .replace('{{pondCount}}', String(activePonds.length))}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setCreateModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={t.enterprise.addBlock}
        >
          <Ionicons name="add" size={25} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.legendRow}>
        {([
          ['stable', t.enterprise.stable],
          ['warning', t.enterprise.warning],
          ['high-risk', t.enterprise.highRisk],
        ] as const).map(([risk, label]) => (
          <View key={risk} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS[risk].border }]} />
            <Text style={styles.legendText}>{label} {riskCounts[risk]}</Text>
          </View>
        ))}
      </View>

      <View style={styles.cycleFilters}>
        {(['active', 'inactive', 'ended'] as const).map((filter) => {
          const label = filter === 'active'
            ? t.farmCycle.filterActive
            : filter === 'inactive'
              ? t.farmCycle.filterInactive
              : t.farmCycle.filterEnded;
          return (
            <TouchableOpacity
              key={filter}
              style={[styles.cycleFilterButton, cycleFilter === filter && styles.cycleFilterButtonActive]}
              onPress={() => setCycleFilter(filter)}
            >
              <Text style={[styles.cycleFilterText, cycleFilter === filter && styles.cycleFilterTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color="#0F4C75" />
          <Text style={styles.loadingText}>{t.enterprise.loadingBlocks}</Text>
        </View>
      ) : (
        <ScrollView style={styles.blockScroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {displayBlocks.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="grid-outline" size={52} color="#3282B8" />
              <Text style={styles.emptyTitle}>{t.enterprise.noBlocks}</Text>
              <Text style={styles.emptyText}>{t.enterprise.noBlocksDescription}</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={() => setCreateModalVisible(true)}>
                <Text style={styles.emptyButtonText}>{t.enterprise.createFirstBlock}</Text>
              </TouchableOpacity>
            </View>
          ) : displayBlocks.map((block) => {
            const blockPonds = getPondsForBlock(block.id);
            const expanded = Boolean(expandedBlocks[block.id]);
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
            const canAssignTechnician = block.id !== '__unassigned__' && !block.assignedTechnicianId;
            return (
              <View key={block.id} style={styles.blockCard}>
                <TouchableOpacity style={styles.blockHeader} onPress={() => toggleBlock(block.id)} activeOpacity={0.8}>
                  <View style={styles.blockHeaderCopy}>
                    <View style={styles.blockTitleRow}>
                      <Text style={styles.blockName} numberOfLines={1}>{block.name}</Text>
                      {canAssignTechnician ? (
                        <TouchableOpacity
                          style={[styles.technicianBadge, styles.technicianBadgeAction]}
                          onPress={(event) => {
                            event.stopPropagation();
                            setAssignmentBlock(block);
                            setAssignmentTechnicianId(null);
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`${t.enterprise.saveAssignment}: ${block.name}`}
                        >
                          <Ionicons name="person-add-outline" size={12} color="#0F4C75" />
                          <Text style={styles.technicianBadgeText} numberOfLines={1}>{technicianLabel}</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.technicianBadge}>
                          <Ionicons name="person-outline" size={12} color="#0F4C75" />
                          <Text style={styles.technicianBadgeText} numberOfLines={1}>{technicianLabel}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.blockMeta}>{getBlockCycleMeta(block.id)}</Text>
                  </View>
                  <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={21} color="#315f57" />
                </TouchableOpacity>

                {expanded ? (
                  blockPonds.length > 0 ? (
                    <View style={styles.pondGrid}>
                      {blockPonds.map((pond) => {
                        const status = cycleFilter === 'active' ? statusByPondId.get(pond.id) : undefined;
                        const colors = status
                          ? STATUS_COLORS[status.risk]
                          : cycleFilter === 'ended'
                            ? { background: '#64748B', border: '#64748B', text: '#FFFFFF' }
                            : { background: '#3282B8', border: '#3282B8', text: '#FFFFFF' };
                        return (
                          <View key={pond.id} style={[styles.tileColumn, { width: `${100 / columnCount}%` as `${number}%` }]}>
                            <TouchableOpacity
                              style={[styles.pondTile, { backgroundColor: colors.background, borderColor: colors.border }]}
                              onPress={() => {
                                if (cycleFilter === 'inactive') {
                                  if (!activeFarmCycle) {
                                    setCycleManagerExpanded(true);
                                    Alert.alert(t.farmCycle.noActiveCycle, t.enterprise.ownerMustStartCycle);
                                    return;
                                  }
                                  onStartPondCycle(pond);
                                  return;
                                }
                                setSelectedPond(pond as Pond);
                              }}
                              accessibilityRole="button"
                              accessibilityLabel={`${pond.pondName}, ${cycleFilter}`}
                            >
                              {cycleFilter === 'inactive' ? (
                                <Ionicons name="play-circle-outline" size={14} color={colors.text} />
                              ) : null}
                              <Text style={[styles.pondTileName, { color: colors.text }]} numberOfLines={2} adjustsFontSizeToFit>
                                {pond.pondName}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={styles.noPondsInBlock}>{t.enterprise.noPondsForFilter}</Text>
                  )
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}

      <Modal visible={createModalVisible} animationType="fade" transparent onRequestClose={closeCreateModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.createModalContainer}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeCreateModal}
            accessibilityRole="button"
            accessibilityLabel={t.actions.cancel}
          />
          <View style={styles.createBlockModalCard}>
            <View style={[styles.modalHeader, styles.createModalHeader]}>
              <View style={styles.modalHeaderCopy}>
                <Text style={styles.modalTitle}>{t.enterprise.addBlock}</Text>
                <Text style={styles.modalSubtitle}>{t.enterprise.addBlockDescription}</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={closeCreateModal}
                accessibilityRole="button"
                accessibilityLabel={t.actions.cancel}
              >
                <Ionicons name="close" size={21} color="#315f57" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.createModalScrollView}
              contentContainerStyle={styles.createModalScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              <Text style={styles.inputLabel}>{t.enterprise.blockName}</Text>
              <TextInput
                value={blockName}
                onChangeText={setBlockName}
                placeholder={t.enterprise.blockNamePlaceholder}
                placeholderTextColor="#7A91A3"
                style={styles.input}
                maxLength={80}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
              <Text style={styles.inputLabel}>{t.enterprise.assignTechnician}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.technicianList}>
                <TouchableOpacity
                  style={[styles.technicianChip, technicianId === null && styles.technicianChipSelected]}
                  onPress={() => setTechnicianId(null)}
                >
                  <Text style={[styles.technicianText, technicianId === null && styles.technicianTextSelected]}>
                    {t.enterprise.unassigned}
                  </Text>
                </TouchableOpacity>
                {technicians.map((technician) => {
                  const selected = technicianId === technician.uid;
                  return (
                    <TouchableOpacity
                      key={technician.uid}
                      style={[styles.technicianChip, selected && styles.technicianChipSelected]}
                      onPress={() => setTechnicianId(technician.uid)}
                    >
                      <Text style={[styles.technicianText, selected && styles.technicianTextSelected]}>
                        {getEnterpriseTechnicianLabel(technician.name, technician.email)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {technicians.length === 0 ? <Text style={styles.helperText}>{t.enterprise.noTechnicians}</Text> : null}
              <View style={styles.createModalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={closeCreateModal} disabled={saving}>
                  <Text style={styles.cancelButtonText}>{t.actions.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveButton, saving && styles.disabledButton]} onPress={handleCreateBlock} disabled={saving}>
                  {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>{t.enterprise.saveBlock}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={Boolean(assignmentBlock)} animationType="fade" transparent onRequestClose={closeAssignmentModal}>
        <View style={styles.createModalContainer}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeAssignmentModal}
            accessibilityRole="button"
            accessibilityLabel={t.actions.cancel}
          />
          <View style={styles.createBlockModalCard}>
            <View style={[styles.modalHeader, styles.createModalHeader]}>
              <View style={styles.modalHeaderCopy}>
                <Text style={styles.modalTitle}>{t.enterprise.saveAssignment}</Text>
                <Text style={styles.modalSubtitle}>{assignmentBlock?.name}</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={closeAssignmentModal}
                accessibilityRole="button"
                accessibilityLabel={t.actions.cancel}
              >
                <Ionicons name="close" size={21} color="#315f57" />
              </TouchableOpacity>
            </View>
            <View style={styles.assignmentContent}>
              <Text style={styles.inputLabel}>{t.enterprise.assignTechnician}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.technicianList}>
                {technicians.map((technician) => {
                  const selected = assignmentTechnicianId === technician.uid;
                  return (
                    <TouchableOpacity
                      key={technician.uid}
                      style={[styles.technicianChip, selected && styles.technicianChipSelected]}
                      onPress={() => setAssignmentTechnicianId(technician.uid)}
                    >
                      <Text style={[styles.technicianText, selected && styles.technicianTextSelected]}>
                        {getEnterpriseTechnicianLabel(technician.name, technician.email)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {technicians.length === 0 ? <Text style={styles.helperText}>{t.enterprise.noTechnicians}</Text> : null}
              <View style={styles.createModalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={closeAssignmentModal} disabled={saving}>
                  <Text style={styles.cancelButtonText}>{t.actions.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, (saving || !assignmentTechnicianId) && styles.disabledButton]}
                  onPress={handleAssignTechnician}
                  disabled={saving || !assignmentTechnicianId}
                >
                  {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>{t.enterprise.saveAssignment}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(selectedPond)} animationType="fade" transparent onRequestClose={() => setSelectedPond(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.statusCard}>
            {selectedPond && selectedStatus ? (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.statusTitleRow}>
                    <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[selectedStatus.risk].border }]} />
                    <View>
                      <Text style={styles.modalTitle}>{selectedPond.pondName}</Text>
                      <Text style={styles.modalSubtitle}>DOC {selectedStatus.doc}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setSelectedPond(null)}
                    accessibilityRole="button"
                    accessibilityLabel={t.actions.cancel}
                  >
                    <Ionicons name="close" size={21} color="#315f57" />
                  </TouchableOpacity>
                </View>

                {selectedStatus.risk === 'stable' ? (
                  <View style={styles.stableMessage}>
                    <Ionicons name="checkmark-circle" size={23} color="#1F6A39" />
                    <Text style={styles.stableMessageText}>{t.enterprise.pondStable}</Text>
                  </View>
                ) : (
                  <View style={styles.warningList}>
                    {selectedStatus.warnings.map((warning) => (
                      <View key={warning.code} style={[styles.warningRow, warning.severity === 'critical' && styles.criticalRow]}>
                        <Ionicons name="alert-circle" size={19} color={warning.severity === 'critical' ? '#B42318' : '#B66A00'} />
                        <Text style={[styles.warningText, warning.severity === 'critical' && styles.criticalText]}>
                          {warning.translationCode ? t.enterprise.warningMessages[warning.translationCode] : warning.label}
                          {warning.value !== undefined ? ` (${warning.value.toFixed(warning.translationCode === 'mortality' ? 2 : 1)}${warning.unit || ''})` : ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {selectedStatus.mortalityCount > 0 ? (
                  <View style={styles.mortalityPanel}>
                    <Text style={styles.mortalityTitle}>{t.enterprise.latestMortality}</Text>
                    <View style={styles.mortalityStats}>
                      <View>
                        <Text style={styles.mortalityValue}>{selectedStatus.mortalityCount.toLocaleString()}</Text>
                        <Text style={styles.mortalityLabel}>{t.enterprise.shrimpCount}</Text>
                      </View>
                      <View>
                        <Text style={styles.mortalityValue}>{selectedStatus.mortalityBiomassKg.toFixed(2)} kg</Text>
                        <Text style={styles.mortalityLabel}>{t.enterprise.estimatedWeight}</Text>
                      </View>
                      <View>
                        <Text style={styles.mortalityValue}>{selectedStatus.mortalityPercent.toFixed(2)}%</Text>
                        <Text style={styles.mortalityLabel}>{t.enterprise.populationImpact}</Text>
                      </View>
                    </View>
                  </View>
                ) : null}

                <TouchableOpacity style={styles.openButton} onPress={openRelevantScreen}>
                  <Text style={styles.openButtonText}>
                    {selectedStatus.warnings.some((warning) => warning.destination === 'water_quality')
                      ? t.enterprise.openWaterQuality
                      : t.enterprise.openPondDetails}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F8FC', paddingHorizontal: 14, paddingTop: 12 },
  cycleManagerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8F2F9',
    padding: 14,
    marginBottom: 14,
    shadowColor: '#0D2137',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cycleManagerCardCollapsed: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cycleManagerHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  cycleManagerHeaderCollapsed: { minHeight: 32 },
  cycleHeaderLeft: { flex: 1, minWidth: 0 },
  cycleEyebrow: { color: '#6B8AA0', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  cycleTitle: { color: '#0D2137', fontSize: 18, fontWeight: '900', marginTop: 4 },
  cycleCompactMeta: { color: '#315F57', fontSize: 12, fontWeight: '700', marginTop: 3 },
  cycleCollapsedContent: { flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  cycleStatusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#315F57', marginRight: 8 },
  cycleStatusDotMuted: { backgroundColor: '#6B8AA0' },
  cycleCollapsedTitle: { color: '#0D2137', fontSize: 14, fontWeight: '900', maxWidth: '45%', marginRight: 8 },
  cycleCollapsedMeta: { color: '#6B8AA0', fontSize: 12, fontWeight: '800', flex: 1 },
  cycleHeaderRight: { alignItems: 'flex-end', gap: 8 },
  cycleStatusBadge: { backgroundColor: '#315F57', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  cycleStatusBadgeMuted: { backgroundColor: '#6B8AA0' },
  cycleStatusText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  cycleStats: { flexDirection: 'row', gap: 8, marginTop: 13 },
  cycleStat: { flex: 1, borderRadius: 12, backgroundColor: '#F4F8FC', padding: 12 },
  cycleStatValue: { color: '#0D2137', fontSize: 16, fontWeight: '900' },
  cycleStatLabel: { color: '#6B8AA0', fontSize: 11, fontWeight: '700', marginTop: 2 },
  cycleActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  cycleNameInput: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: '#D5E2EB',
    backgroundColor: '#F7FAFC',
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: '#14324A',
    fontSize: 12,
    fontWeight: '700',
  },
  cycleRenameButton: { borderRadius: 12, backgroundColor: '#0D2137', paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  cycleRenameText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  cyclePondList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  cyclePondChip: { borderRadius: 999, backgroundColor: '#E8F2F9', paddingHorizontal: 10, paddingVertical: 6 },
  cyclePondChipEnded: { opacity: 0.55 },
  cyclePondChipText: { color: '#315F57', fontSize: 10, fontWeight: '800' },
  cycleCloseButton: {
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: '#C53030',
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cycleCloseText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  startCycleButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#0F4C75',
    paddingHorizontal: 15,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  startCycleButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  blockSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  blockSectionCopy: { flex: 1, minWidth: 0 },
  blockSectionTitle: { fontSize: 18, fontWeight: '900', color: '#102A43' },
  blockSectionMeta: { color: '#5E7487', fontSize: 12, marginTop: 2 },
  addButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#0F4C75', alignItems: 'center', justifyContent: 'center' },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontWeight: '700', color: '#506779' },
  cycleFilters: { flexDirection: 'row', gap: 7, marginBottom: 12 },
  cycleFilterButton: { flex: 1, borderRadius: 11, backgroundColor: '#E8EEF3', paddingVertical: 9, alignItems: 'center' },
  cycleFilterButtonActive: { backgroundColor: '#0F4C75' },
  cycleFilterText: { color: '#607789', fontSize: 11, fontWeight: '800' },
  cycleFilterTextActive: { color: '#FFFFFF' },
  blockScroll: { flex: 1 },
  scrollContent: { paddingBottom: 100, gap: 10 },
  blockCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#DCE7EF', overflow: 'hidden' },
  blockHeader: { minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingRight: 15 },
  blockHeaderCopy: { flex: 1, paddingHorizontal: 13 },
  blockTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  blockName: { flexShrink: 1, fontSize: 16, fontWeight: '800', color: '#16344B' },
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
  technicianBadgeAction: { borderWidth: 1, borderColor: '#9EC5DC' },
  technicianBadgeText: { flexShrink: 1, color: '#0F4C75', fontSize: 10, fontWeight: '800' },
  blockMeta: { fontSize: 11, color: '#6B8090', marginTop: 3 },
  pondGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 7, paddingBottom: 10, paddingTop: 2 },
  tileColumn: { padding: 3 },
  pondTile: { aspectRatio: 1, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', padding: 3 },
  pondTileName: { fontSize: 9, lineHeight: 11, textAlign: 'center', fontWeight: '800' },
  noPondsInBlock: { color: '#6B8090', paddingHorizontal: 16, paddingBottom: 16, fontSize: 12 },
  errorText: { color: '#B42318', fontSize: 12, marginBottom: 9 },
  loadingState: { paddingTop: 80, alignItems: 'center', gap: 10 },
  loadingText: { color: '#607789', fontSize: 13 },
  emptyState: { marginTop: 50, alignItems: 'center', padding: 28, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#DCE7EF' },
  emptyTitle: { color: '#17364D', fontSize: 19, fontWeight: '800', marginTop: 12 },
  emptyText: { color: '#687E8F', fontSize: 13, textAlign: 'center', marginTop: 6 },
  emptyButton: { marginTop: 18, backgroundColor: '#0F4C75', paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12 },
  emptyButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 42, 60, 0.42)', justifyContent: 'flex-end' },
  createModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(15, 76, 117, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  createBlockModalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8F2F9',
    overflow: 'hidden',
    shadowColor: '#102A43',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  statusCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 34 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 22 },
  createModalHeader: {
    alignItems: 'center',
    marginBottom: 0,
    paddingHorizontal: Platform.OS === 'android' ? 20 : 24,
    paddingTop: Platform.OS === 'android' ? 20 : 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8F2F9',
  },
  modalHeaderCopy: { flex: 1, minWidth: 0 },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9E5ED',
    backgroundColor: '#F4F8FB',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#14324A' },
  modalSubtitle: { fontSize: 12, lineHeight: 17, color: '#6A8091', marginTop: 4, flexShrink: 1 },
  createModalScrollView: { flexGrow: 0, flexShrink: 1 },
  createModalScrollContent: {
    paddingHorizontal: Platform.OS === 'android' ? 20 : 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'android' ? 24 : 28,
  },
  assignmentContent: {
    paddingHorizontal: Platform.OS === 'android' ? 20 : 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'android' ? 24 : 28,
  },
  inputLabel: { fontSize: 11, fontWeight: '800', color: '#4C6679', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 7 },
  input: { borderWidth: 1, borderColor: '#D5E2EB', backgroundColor: '#F7FAFC', borderRadius: 13, paddingHorizontal: 14, paddingVertical: 13, color: '#14324A', marginBottom: 18 },
  technicianList: { gap: 8, paddingBottom: 7 },
  technicianChip: { borderWidth: 1, borderColor: '#CAD9E4', borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: '#F7FAFC' },
  technicianChipSelected: { backgroundColor: '#0F4C75', borderColor: '#0F4C75' },
  technicianText: { color: '#4E687B', fontSize: 12, fontWeight: '700' },
  technicianTextSelected: { color: '#FFFFFF' },
  helperText: { color: '#7A8E9D', fontSize: 11, marginTop: 2 },
  createModalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E74C3C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: { color: '#E74C3C', fontSize: 14, fontWeight: '800' },
  saveButton: { flex: 1, height: 50, borderRadius: 14, backgroundColor: '#0F4C75', alignItems: 'center', justifyContent: 'center' },
  disabledButton: { opacity: 0.65 },
  saveButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  statusTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 11, height: 11, borderRadius: 6 },
  stableMessage: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#EAF7EE', padding: 14, borderRadius: 13 },
  stableMessageText: { color: '#1F6A39', fontWeight: '700', flex: 1 },
  warningList: { gap: 9 },
  warningRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: '#FFF8E8', padding: 13, borderRadius: 12 },
  criticalRow: { backgroundColor: '#FDE8E8', borderWidth: 1, borderColor: '#FAA0A0' },
  warningText: { flex: 1, color: '#754900', fontSize: 13, fontWeight: '700', lineHeight: 18 },
  criticalText: { color: '#8B1E1E' },
  mortalityPanel: { marginTop: 16, padding: 14, backgroundColor: '#F6F9FB', borderRadius: 14 },
  mortalityTitle: { fontSize: 11, fontWeight: '800', color: '#526C7E', textTransform: 'uppercase', letterSpacing: 0.6 },
  mortalityStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, gap: 10 },
  mortalityValue: { color: '#17364D', fontSize: 14, fontWeight: '800' },
  mortalityLabel: { color: '#718696', fontSize: 9, marginTop: 2 },
  openButton: { marginTop: 20, height: 49, borderRadius: 14, backgroundColor: '#0F4C75', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  openButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});
