import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { type ReactNode, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import {
  type FarmCycle,
  type PhysicalPond,
  type Pond,
} from '../../store/pondStore';
import {
  getEnterprisePondStatus,
  getEnterpriseTechnicianLabel,
  sortFarmBlocks,
  type EnterprisePondRisk,
  type EnterpriseTechnician,
  type FarmBlock,
} from '../../../shared/enterpriseBlocks';
import {
  getEnterpriseCycleAvailableBlocks,
  getEnterpriseCycleBlockIds,
  getEnterpriseCyclePonds,
  isEnterpriseCycleOpen,
  summarizeEnterpriseCycle,
} from '../../../shared/enterpriseCycles';
import { differenceInFarmCalendarDays, getFarmDateKey } from '../../../shared/farmDate';
import {
  countCompletedEnterprisePondSetups,
  createEnterprisePondSetupValues,
  isEnterprisePondSetupComplete,
  parseEnterprisePondDensity,
  parseOptionalEnterprisePondNumber,
  type EnterpriseCycleStartMode,
  type EnterprisePondSetupValue,
} from '../../../shared/enterpriseCycleSetup';
import ProfileCompletionCard from '../onboarding/ProfileCompletionCard';
import AppDatePicker from '../forms/AppDatePicker';

interface EnterpriseCycleDashboardProps {
  ponds: Pond[];
  physicalPonds: PhysicalPond[];
  blocks: FarmBlock[];
  technicians: EnterpriseTechnician[];
  cycles: FarmCycle[];
  timeZone?: string;
  loading: boolean;
  error?: string | null;
  dashboardModeSwitch?: ReactNode;
  onSaveProductionCycle: (input: {
    cycle?: FarmCycle;
    cycleName: string;
    block: FarmBlock;
    stockingDate: string;
    cycleStartMode: EnterpriseCycleStartMode;
    ponds: {
      pond: PhysicalPond;
      density: number;
      supplier: string;
      baselineMbw?: number;
      baselineEstimatedPopulation?: number;
      baselineSurvivalRate?: number;
      baselineCumulativeFeed?: number;
    }[];
  }) => void | Promise<void>;
  onCreatePond: (input: { pondName: string; pondArea: number; block: FarmBlock }) => void | Promise<void>;
  onEditCycle: (cycle: FarmCycle, input: { cycleName: string; blocks: FarmBlock[] }) => void | Promise<void>;
  onCloseCycle: (cycle: FarmCycle) => void;
  onAddSampling: () => void;
  onAddMortality: () => void;
  createBlock: (input: { name: string; technician?: EnterpriseTechnician | null }) => Promise<void>;
  updateBlock?: (input: { blockId: string; name: string; technician?: EnterpriseTechnician | null }) => Promise<void>;
  deleteBlock?: (blockId: string) => Promise<void>;
  assignBlockTechnician: (input: { blockId: string; technician: EnterpriseTechnician }) => Promise<void>;
}

type PondFilter = 'active' | 'inactive' | 'ended';

const RISK_COLORS: Record<EnterprisePondRisk, { background: string; text: string }> = {
  stable: { background: '#C1E1C1', text: '#1F5132' },
  warning: { background: '#FAC898', text: '#5A3700' },
  'high-risk': { background: '#FAA0A0', text: '#721C24' },
};

export default function EnterpriseCycleDashboard({
  ponds,
  physicalPonds,
  blocks,
  technicians,
  cycles,
  timeZone,
  loading,
  error,
  dashboardModeSwitch,
  onSaveProductionCycle,
  onCreatePond,
  onEditCycle,
  onCloseCycle,
  onAddSampling,
  onAddMortality,
  createBlock,
  updateBlock,
  deleteBlock,
  assignBlockTechnician,
}: EnterpriseCycleDashboardProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const copy = t.enterpriseCycle;
  const { company } = useAuth();
  const { width } = useWindowDimensions();
  const pondTileWidth: number | `${number}%` = width < 600
    ? (width - 72) / 5
    : `${100 / (width < 1000 ? 7 : 10) - 1}%`;
  const [expandedCycles, setExpandedCycles] = useState<Record<string, boolean>>({});
  const [pondFilter, setPondFilter] = useState<PondFilter>('active');
  const [addMenuVisible, setAddMenuVisible] = useState(false);
  const [cycleFormOpen, setCycleFormOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<FarmCycle | null>(null);
  const [cycleName, setCycleName] = useState('');
  const [plannedStartDate, setPlannedStartDate] = useState(getFarmDateKey(new Date(), timeZone));
  const [cycleStartMode, setCycleStartMode] = useState<EnterpriseCycleStartMode>('new');
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
  const [cycleFormStep, setCycleFormStep] = useState<'details' | 'ponds'>('details');
  const [stockingCycle, setStockingCycle] = useState<FarmCycle | null>(null);
  const [pondSetupValues, setPondSetupValues] = useState<Record<string, EnterprisePondSetupValue>>({});
  const [expandedSetupPondId, setExpandedSetupPondId] = useState<string | null>(null);
  const [selectedPond, setSelectedPond] = useState<Pond | null>(null);
  const [createBlockVisible, setCreateBlockVisible] = useState(false);
  const [editingBlock, setEditingBlock] = useState<FarmBlock | null>(null);
  const [editingBlockName, setEditingBlockName] = useState('');
  const [editingBlockTechnicianId, setEditingBlockTechnicianId] = useState<string | null>(null);
  const [createPondVisible, setCreatePondVisible] = useState(false);
  const [newPondName, setNewPondName] = useState('');
  const [newPondArea, setNewPondArea] = useState('');
  const [newPondBlockId, setNewPondBlockId] = useState('');
  const [blockName, setBlockName] = useState('');
  const [blockTechnicianId, setBlockTechnicianId] = useState<string | null>(null);
  const [assignmentBlock, setAssignmentBlock] = useState<FarmBlock | null>(null);
  const [saving, setSaving] = useState(false);

  const sortedBlocks = useMemo(() => sortFarmBlocks(blocks), [blocks]);
  const activePonds = useMemo(() => ponds.filter((pond) => pond.cycleStatus !== 'ended'), [ponds]);
  const sortedCycles = useMemo(() => [...cycles].sort((first, second) => {
    const firstClosed = first.status === 'closed' ? 1 : 0;
    const secondClosed = second.status === 'closed' ? 1 : 0;
    if (firstClosed !== secondClosed) return firstClosed - secondClosed;
    return (second.stockingStartDate || second.plannedStartDate || '')
      .localeCompare(first.stockingStartDate || first.plannedStartDate || '');
  }), [cycles]);
  const openCycles = useMemo(() => cycles.filter(isEnterpriseCycleOpen), [cycles]);
  const statusByPond = useMemo(() => new Map(ponds.map((pond) => [
    pond.id,
    getEnterprisePondStatus(pond, timeZone),
  ])), [ponds, timeZone]);
  const activePhysicalPondIds = useMemo(() => new Set(ponds
    .filter((pond) => pond.cycleStatus !== 'ended')
    .flatMap((pond) => [pond.physicalPondId, pond.previousCyclePondId].filter((id): id is string => Boolean(id)))), [ponds]);
  const activePondNames = useMemo(() => new Set(ponds
    .filter((pond) => pond.cycleStatus !== 'ended')
    .map((pond) => pond.pondName.trim().toLowerCase())), [ponds]);
  const selectedStatus = selectedPond ? statusByPond.get(selectedPond.id) : undefined;
  const cycleBlockOptions = useMemo(
    () => getEnterpriseCycleAvailableBlocks(
      sortedBlocks,
      openCycles.filter((cycle) => cycle.id !== editingCycle?.id),
      ponds,
    ),
    [editingCycle?.id, openCycles, ponds, sortedBlocks],
  );
  const openCycleByBlockId = useMemo(() => {
    const result = new Map<string, FarmCycle>();
    openCycles.forEach((cycle) => {
      getEnterpriseCycleBlockIds(cycle, ponds).forEach((blockId) => {
        if (!result.has(blockId)) result.set(blockId, cycle);
      });
    });
    return result;
  }, [openCycles, ponds]);
  const inactiveBlockRows = useMemo(() => sortedBlocks.map((block) => ({
    block,
    inactivePonds: physicalPonds
      .filter((pond) => pond.blockId === block.id && pond.status !== 'active' && !pond.activePondId && !activePhysicalPondIds.has(pond.id) && !activePondNames.has(pond.pondName.trim().toLowerCase()))
      .sort((first, second) => first.pondName.localeCompare(second.pondName, undefined, { numeric: true })),
  })), [activePhysicalPondIds, activePondNames, physicalPonds, sortedBlocks]);
  const lockedEditingBlockIds = useMemo(() => new Set(
    editingCycle
      ? getEnterpriseCyclePonds(editingCycle.id, ponds)
        .map((pond) => pond.blockId)
        .filter((blockId): blockId is string => Boolean(blockId))
      : [],
  ), [editingCycle, ponds]);
  const editingCycleSummary = useMemo(
    () => editingCycle ? summarizeEnterpriseCycle(editingCycle, ponds, physicalPonds) : null,
    [editingCycle, physicalPonds, ponds],
  );
  const filteredCycleRows = useMemo(() => sortedCycles.map((cycle) => {
    const cyclePonds = getEnterpriseCyclePonds(cycle.id, ponds);
    const visiblePonds = cyclePonds.filter((pond) => pondFilter === 'ended'
      ? pond.cycleStatus === 'ended'
      : pond.cycleStatus !== 'ended');
    return { cycle, visiblePonds };
  }).filter((row) => pondFilter !== 'inactive' && row.visiblePonds.length > 0), [pondFilter, ponds, sortedCycles]);
  const selectedSetupBlock = sortedBlocks.find((block) => selectedBlockIds.includes(block.id));
  const setupPonds = useMemo(() => physicalPonds
    .filter((pond) => pond.blockId === selectedSetupBlock?.id && pond.status !== 'active' && !pond.activePondId && !activePhysicalPondIds.has(pond.id) && !activePondNames.has(pond.pondName.trim().toLowerCase()))
    .sort((first, second) => first.pondName.localeCompare(second.pondName, undefined, { numeric: true })), [activePhysicalPondIds, activePondNames, physicalPonds, selectedSetupBlock?.id]);
  const completedSetupCount = countCompletedEnterprisePondSetups(
    setupPonds.map((pond) => pond.id),
    pondSetupValues,
    cycleStartMode,
  );

  const resetCycleForm = () => {
    setCycleFormOpen(false);
    setEditingCycle(null);
    setStockingCycle(null);
    setCycleName('');
    setPlannedStartDate(getFarmDateKey(new Date(), timeZone));
    setCycleStartMode('new');
    setSelectedBlockIds([]);
    setCycleFormStep('details');
    setPondSetupValues({});
    setExpandedSetupPondId(null);
  };

  const openCycleForm = () => {
    setEditingCycle(null);
    setCycleFormOpen(true);
    setCycleName(copy.defaultCycleName.replace('{{number}}', String(cycles.length + 1)));
    setPlannedStartDate(getFarmDateKey(new Date(), timeZone));
    setCycleStartMode('new');
    setSelectedBlockIds([]);
    setCycleFormStep('details');
    setStockingCycle(null);
    setPondSetupValues({});
    setExpandedSetupPondId(null);
  };

  const openCycleFormForBlock = (blockId?: string | null) => {
    if (!blockId) {
      openCycleForm();
      return;
    }
    const existingCycle = openCycleByBlockId.get(blockId) || null;
    const blockPonds = physicalPonds
      .filter((pond) => pond.blockId === blockId && pond.status !== 'active' && !pond.activePondId && !activePhysicalPondIds.has(pond.id) && !activePondNames.has(pond.pondName.trim().toLowerCase()))
      .sort((first, second) => first.pondName.localeCompare(second.pondName, undefined, { numeric: true }));
    setEditingCycle(null);
    setStockingCycle(existingCycle);
    setCycleFormOpen(true);
    setCycleName(existingCycle?.cycleName || copy.defaultCycleName.replace('{{number}}', String(cycles.length + 1)));
    setPlannedStartDate(existingCycle?.plannedStartDate || getFarmDateKey(new Date(), timeZone));
    setCycleStartMode('new');
    setSelectedBlockIds([blockId]);
    setPondSetupValues(createEnterprisePondSetupValues(blockPonds.map((pond) => pond.id)));
    setExpandedSetupPondId(blockPonds[0]?.id || null);
    setCycleFormStep(existingCycle ? 'ponds' : 'details');
  };

  const openEditCycleForm = (cycle: FarmCycle) => {
    setEditingCycle(cycle);
    setCycleFormOpen(true);
    setStockingCycle(null);
    setCycleFormStep('details');
    setCycleName(cycle.cycleName);
    setPlannedStartDate(cycle.plannedStartDate || getFarmDateKey(new Date(), timeZone));
    setSelectedBlockIds(getEnterpriseCycleBlockIds(cycle, ponds));
  };

  const continueCycleForm = () => {
    if (!cycleName.trim() || !selectedSetupBlock || setupPonds.length === 0) return;
    setPondSetupValues(createEnterprisePondSetupValues(setupPonds.map((pond) => pond.id)));
    setExpandedSetupPondId(setupPonds[0]?.id || null);
    setCycleFormStep('ponds');
  };

  const updatePondSetup = (pondId: string, field: keyof EnterprisePondSetupValue, value: string) => {
    setPondSetupValues((current) => {
      const previous = current[pondId] || { density: '', supplier: '' };
      return { ...current, [pondId]: { ...previous, [field]: value } };
    });
  };

  const submitCycle = async () => {
    if (!cycleName.trim() || selectedBlockIds.length !== 1) return;
    if (cycleStartMode === 'midcycle' && differenceInFarmCalendarDays(getFarmDateKey(new Date(), timeZone), plannedStartDate) < 0) {
      Alert.alert(t.messages.error, copy.baselineDateInvalid);
      return;
    }
    setSaving(true);
    try {
      const selectedBlocks = sortedBlocks.filter((block) => selectedBlockIds.includes(block.id));
      if (editingCycle) {
        await onEditCycle(editingCycle, { cycleName: cycleName.trim(), blocks: selectedBlocks });
      } else {
        if (!selectedSetupBlock || setupPonds.length === 0 || completedSetupCount !== setupPonds.length) return;
        await onSaveProductionCycle({
          cycle: stockingCycle || undefined,
          cycleName: cycleName.trim(),
          block: selectedSetupBlock,
          stockingDate: plannedStartDate,
          cycleStartMode,
          ponds: setupPonds.map((pond) => ({
            pond,
            density: parseEnterprisePondDensity(pondSetupValues[pond.id].density),
            supplier: pondSetupValues[pond.id].supplier.trim(),
            baselineMbw: parseOptionalEnterprisePondNumber(pondSetupValues[pond.id].baselineMbw),
            baselineEstimatedPopulation: parseOptionalEnterprisePondNumber(pondSetupValues[pond.id].baselineEstimatedPopulation),
            baselineSurvivalRate: parseOptionalEnterprisePondNumber(pondSetupValues[pond.id].baselineSurvivalRate),
            baselineCumulativeFeed: parseOptionalEnterprisePondNumber(pondSetupValues[pond.id].baselineCumulativeFeed),
          })),
        });
        setPondFilter('active');
      }
      resetCycleForm();
    } catch (cycleError) {
      Alert.alert(t.messages.error, cycleError instanceof Error ? cycleError.message : copy.cycleSaveFailed);
    } finally {
      setSaving(false);
    }
  };

  const submitBlock = async () => {
    if (!blockName.trim()) return;
    setSaving(true);
    try {
      await createBlock({
        name: blockName.trim(),
        technician: technicians.find((technician) => technician.uid === blockTechnicianId) || null,
      });
      setBlockName('');
      setBlockTechnicianId(null);
      setCreateBlockVisible(false);
    } catch (blockError) {
      Alert.alert(t.messages.error, blockError instanceof Error ? blockError.message : t.enterprise.blockCreateFailed);
    } finally {
      setSaving(false);
    }
  };

  const submitPond = async () => {
    const selectedBlock = sortedBlocks.find((block) => block.id === newPondBlockId);
    const pondArea = Number(newPondArea);
    if (!newPondName.trim() || !selectedBlock || !Number.isFinite(pondArea) || pondArea <= 0) return;
    setSaving(true);
    try {
      await onCreatePond({ pondName: newPondName.trim(), pondArea, block: selectedBlock });
      setNewPondName('');
      setNewPondArea('');
      setNewPondBlockId('');
      setCreatePondVisible(false);
      setPondFilter('inactive');
    } catch (pondError) {
      Alert.alert(t.messages.error, pondError instanceof Error ? pondError.message : copy.pondCreateFailed);
    } finally {
      setSaving(false);
    }
  };

  const openEditBlock = (block: FarmBlock) => {
    setEditingBlock(block);
    setEditingBlockName(block.name);
    setEditingBlockTechnicianId(block.assignedTechnicianId || null);
  };

  const submitEditBlock = async () => {
    if (!editingBlock || !editingBlockName.trim() || !updateBlock) return;
    setSaving(true);
    try {
      const selectedTech = technicians.find((tech) => tech.uid === editingBlockTechnicianId) || null;
      await updateBlock({
        blockId: editingBlock.id,
        name: editingBlockName.trim(),
        technician: selectedTech,
      });
      setEditingBlock(null);
    } catch (err) {
      Alert.alert(t.messages.error, err instanceof Error ? err.message : t.enterprise.blockUpdateFailed);
    } finally {
      setSaving(false);
    }
  };

  const promptDeleteBlock = () => {
    if (!editingBlock || !deleteBlock) return;
    const blockHasPonds = physicalPonds.some((pond) => pond.blockId === editingBlock.id)
      || ponds.some((pond) => pond.blockId === editingBlock.id);

    if (blockHasPonds) {
      Alert.alert(
        t.enterprise.deleteBlockConfirmTitle,
        t.enterprise.cannotDeleteBlockWithPonds,
      );
      return;
    }

    Alert.alert(
      t.enterprise.deleteBlockConfirmTitle,
      t.enterprise.deleteBlockConfirmMessage.replace('{{blockName}}', editingBlock.name),
      [
        { text: t.actions.cancel, style: 'cancel' },
        {
          text: t.actions.delete,
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await deleteBlock(editingBlock.id);
              setEditingBlock(null);
            } catch (err) {
              Alert.alert(t.messages.error, err instanceof Error ? err.message : t.enterprise.blockDeleteFailed);
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  const assignTechnician = async (technician: EnterpriseTechnician) => {
    if (!assignmentBlock) return;
    setSaving(true);
    try {
      await assignBlockTechnician({ blockId: assignmentBlock.id, technician });
      setAssignmentBlock(null);
    } catch {
      Alert.alert(t.messages.error, t.enterprise.blockAssignmentFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.enterpriseHeader}>
        <View style={styles.enterpriseHeaderCopy}>
          <Text style={styles.enterpriseHeaderTitle}>{copy.dashboardTitle}</Text>
          <Text style={styles.enterpriseCompanyName} numberOfLines={1}>{company?.companyName || copy.companyFallback}</Text>
        </View>
        <TouchableOpacity style={styles.addBlockButton} onPress={() => setAddMenuVisible(true)}><Ionicons name="add" size={22} color="#FFFFFF" /></TouchableOpacity>
      </View>
      <ProfileCompletionCard
        company={company}
        onPress={() => router.push('/company-setup2?edit=true' as never)}
      />
      <View style={styles.dashboardModeSwitchContainer}>{dashboardModeSwitch}</View>
      <View style={styles.cycleFilterContainer}>
        {(['active', 'inactive', 'ended'] as PondFilter[]).map((filter) => (
          <TouchableOpacity key={filter} style={[styles.cycleFilterButton, pondFilter === filter && styles.cycleFilterButtonActive]} onPress={() => setPondFilter(filter)}>
            <Text style={[styles.cycleFilterText, pondFilter === filter && styles.cycleFilterTextActive]}>{filter === 'active' ? t.farmCycle.filterActive : filter === 'inactive' ? t.farmCycle.filterInactive : t.farmCycle.filterEnded}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {loading ? (
        <View style={styles.loadingState}><ActivityIndicator color="#0F4C75" /><Text style={styles.loadingText}>{copy.loading}</Text></View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {(pondFilter === 'inactive' ? inactiveBlockRows.length === 0 : filteredCycleRows.length === 0) ? (
            <TouchableOpacity style={styles.emptyCycle} onPress={openCycleForm}>
              {sortedCycles.length === 0 ? <Ionicons name="add" size={21} color="#0F4C75" /> : null}
              <Text style={styles.emptyCycleText}>{sortedCycles.length === 0 ? copy.createFirstCycle : copy.noPonds.replace('{{status}}', pondFilter === 'active' ? t.farmCycle.filterActive.toLocaleLowerCase() : pondFilter === 'inactive' ? t.farmCycle.filterInactive.toLocaleLowerCase() : t.farmCycle.filterEnded.toLocaleLowerCase())}</Text>
            </TouchableOpacity>
          ) : null}
          {pondFilter === 'inactive' ? inactiveBlockRows.map(({ block, inactivePonds }) => {
            const openCycle = openCycleByBlockId.get(block.id);
            const blockTechnician = technicians.find((candidate) => candidate.uid === block.assignedTechnicianId);
            const technicianLabel = getEnterpriseTechnicianLabel(blockTechnician?.name, blockTechnician?.email, t.enterprise.unassigned);

            return (
              <View key={block.id} style={styles.cycleCard}>
                <View style={styles.cycleHeader}>
                  <View style={styles.cycleToggle}>
                    <View style={styles.cycleIcon}><Ionicons name="layers-outline" size={19} color="#0F4C75" /></View>
                    <View style={styles.cycleCopy}>
                      <Text style={styles.cycleName}>{block.name}</Text>
                      <Text style={styles.cycleDate}>{copy.inactivePonds.replace('{{count}}', String(inactivePonds.length))} • {technicianLabel}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <TouchableOpacity style={styles.editCycleButton} onPress={() => openEditBlock(block)}>
                      <Ionicons name="pencil-outline" size={14} color="#0F4C75" />
                      <Text style={styles.editCycleText}>{t.actions.edit || 'Edit'}</Text>
                    </TouchableOpacity>
                    {inactivePonds.length > 0 && (
                      <TouchableOpacity style={styles.editCycleButton} onPress={() => openCycleFormForBlock(block.id)}>
                        <Ionicons name={openCycle ? 'play' : 'add'} size={14} color="#0F4C75" />
                        <Text style={styles.editCycleText}>{openCycle ? copy.continue : copy.createCycle}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                {inactivePonds.length > 0 ? (
                  <View style={styles.cycleBody}>
                    <View style={styles.pondGrid}>
                      {inactivePonds.map((pond) => <View key={pond.id} style={[styles.pondTile, styles.waitingPond, { width: pondTileWidth }]}><Text style={styles.waitingPondName} numberOfLines={2}>{pond.pondName}</Text><Text style={styles.waitingPondMeta}>{copy.inactive}</Text></View>)}
                    </View>
                  </View>
                ) : null}
              </View>
            );
          }) : null}
          {filteredCycleRows.map(({ cycle, visiblePonds }) => {
            const summary = summarizeEnterpriseCycle(cycle, ponds, physicalPonds);
            const cycleExpanded = Boolean(expandedCycles[cycle.id]);
            const cycleBlockId = getEnterpriseCycleBlockIds(cycle, ponds)[0];
            const cycleBlock = sortedBlocks.find((block) => block.id === cycleBlockId);
            const cycleTechnician = technicians.find((technician) => technician.uid === cycleBlock?.assignedTechnicianId);
            const technicianLabel = getEnterpriseTechnicianLabel(cycleTechnician?.name, cycleTechnician?.email, t.enterprise.unassigned);

            return (
              <View key={cycle.id} style={styles.cycleCard}>
                <View style={styles.cycleHeader}>
                  <TouchableOpacity style={styles.cycleToggle} onPress={() => setExpandedCycles((current) => ({ ...current, [cycle.id]: !cycleExpanded }))} accessibilityRole="button" accessibilityState={{ expanded: cycleExpanded }}>
                    <View style={styles.cycleIcon}><Ionicons name="calendar-outline" size={19} color="#0F4C75" /></View>
                    <View style={styles.cycleCopy}><Text style={styles.cycleName} numberOfLines={1}>{cycle.cycleName}</Text><Text style={styles.cycleDate} numberOfLines={1}>{copy.started.replace('{{date}}', summary.stockingStartDate || copy.notStarted).replace('{{technician}}', technicianLabel)}</Text></View>
                    <Ionicons name={cycleExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="#5E7485" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.editCycleButton} onPress={() => openEditCycleForm(cycle)}><Ionicons name="pencil-outline" size={15} color="#0F4C75" /><Text style={styles.editCycleText}>{t.actions.edit}</Text></TouchableOpacity>
                </View>

                {cycleExpanded ? (
                  <View style={styles.cycleBody}>
                    <View style={styles.pondGrid}>
                      {pondFilter !== 'inactive' ? visiblePonds.map((pond) => {
                        const pondStatus = statusByPond.get(pond.id);
                        const colors = pond.cycleStatus === 'ended' ? { background: '#64748B', text: '#FFFFFF' } : RISK_COLORS[pondStatus?.risk || 'stable'];
                        return <TouchableOpacity key={pond.id} style={[styles.pondTile, { width: pondTileWidth, backgroundColor: colors.background }]} onPress={() => setSelectedPond(pond)}><Text style={[styles.pondName, { color: colors.text }]} numberOfLines={2}>{pond.pondName}</Text><Text style={[styles.pondMeta, { color: colors.text }]}>{pond.cycleStatus === 'ended' ? copy.ended : `DOC ${pondStatus?.doc ?? 0}`}</Text></TouchableOpacity>;
                      }) : null}
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}

      <Modal visible={cycleFormOpen} transparent animationType="slide" onRequestClose={resetCycleForm}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderCopy}><Text style={styles.eyebrow}>{copy.eyebrow}</Text><Text style={styles.modalTitle}>{editingCycle ? copy.editCycle : stockingCycle ? copy.continueCycle.replace('{{cycleName}}', stockingCycle.cycleName) : copy.createProductionCycle}</Text><Text style={styles.modalText}>{editingCycle ? copy.editDescription : cycleFormStep === 'details' ? copy.chooseBlockDate : copy.stockingDetails.replace('{{blockName}}', selectedSetupBlock?.name || copy.blockFallback)}</Text></View>
              <TouchableOpacity style={styles.closeModalButton} onPress={resetCycleForm}><Ionicons name="close" size={21} color="#334B5C" /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="never">
              {editingCycle || cycleFormStep === 'details' ? <>
                <Text style={styles.inputLabel}>{copy.cycleName}</Text>
                <TextInput style={styles.input} value={cycleName} onChangeText={setCycleName} placeholder={copy.defaultCycleName.replace('{{number}}', '1')} placeholderTextColor="#8A9BA8" />
                {!editingCycle ? <>
                  <View style={styles.dateField}>
                    <AppDatePicker
                      label={copy.plannedStart}
                      value={plannedStartDate}
                      onChange={(date) => setPlannedStartDate(getFarmDateKey(date, timeZone))}
                      cancelLabel={t.actions.cancel}
                      confirmLabel={t.actions.confirm}
                    />
                  </View>
                </> : null}
                <Text style={styles.inputLabel}>{copy.blockInCycle}</Text>
                <View style={styles.pondSelector}>
                  {cycleBlockOptions.length === 0 ? <Text style={styles.emptySelectorText}>{copy.noBlocksAvailable}</Text> : cycleBlockOptions.map((block) => {
                    const selected = selectedBlockIds.includes(block.id);
                    const locked = lockedEditingBlockIds.has(block.id);
                    const pondCount = physicalPonds.filter((pond) => pond.blockId === block.id && pond.status !== 'active' && !pond.activePondId).length;
                    return (
                      <TouchableOpacity key={block.id} style={[styles.pondOption, selected && styles.pondOptionSelected]} disabled={lockedEditingBlockIds.size > 0} onPress={() => setSelectedBlockIds([block.id])}>
                        <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={selected ? '#0F4C75' : '#8AA3B3'} />
                        <Text style={styles.pondOptionName}>{block.name}</Text>
                        <Text style={styles.pondOptionArea}>{locked ? copy.inProduction : copy.inactivePonds.replace('{{count}}', String(pondCount))}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity style={[styles.primaryButton, (saving || !cycleName.trim() || selectedBlockIds.length !== 1 || (!editingCycle && setupPonds.length === 0)) && styles.disabledAction]} disabled={saving || !cycleName.trim() || selectedBlockIds.length !== 1 || (!editingCycle && setupPonds.length === 0)} onPress={editingCycle ? submitCycle : continueCycleForm}>
                  {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>{editingCycle ? copy.saveChanges : t.actions.next}</Text>}
                </TouchableOpacity>
              </> : <>
                <Text style={styles.inputLabel}>{copy.cycleStartQuestion}</Text>
                <View style={styles.cycleModeRow}>
                  {(['new', 'midcycle'] as const).map((mode) => {
                    const selected = cycleStartMode === mode;
                    return <TouchableOpacity key={mode} style={[styles.cycleModeOption, selected && styles.cycleModeOptionSelected]} onPress={() => setCycleStartMode(mode)}>
                      <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={19} color={selected ? '#0F4C75' : '#8AA3B3'} />
                      <View style={styles.cycleModeCopy}>
                        <Text style={styles.cycleModeTitle}>{mode === 'new' ? copy.newCycle : copy.existingCycle}</Text>
                        <Text style={styles.cycleModeHint}>{mode === 'new' ? copy.newCycleHint : copy.existingCycleHint}</Text>
                      </View>
                    </TouchableOpacity>;
                  })}
                </View>
                <View style={styles.setupProgress}><Text style={styles.setupProgressTitle}>{copy.pondsReady.replace('{{completed}}', String(completedSetupCount)).replace('{{total}}', String(setupPonds.length))}</Text><Text style={styles.setupProgressText}>{cycleStartMode === 'midcycle' ? copy.baselineMbwRequired : copy.densitySupplierRequired}</Text></View>
                {setupPonds.map((pond) => {
                  const value = pondSetupValues[pond.id] || { density: '', supplier: '' };
                  const expanded = expandedSetupPondId === pond.id;
                  const complete = isEnterprisePondSetupComplete(value, cycleStartMode);
                  return <View key={pond.id} style={[styles.setupPondCard, expanded && styles.setupPondCardExpanded]}>
                    <TouchableOpacity style={styles.setupPondHeader} onPress={() => setExpandedSetupPondId(expanded ? null : pond.id)} accessibilityRole="button" accessibilityState={{ expanded }}>
                      <View style={styles.setupPondCopy}><View style={styles.setupPondTitleRow}><Text style={styles.setupPondTitle}>{pond.pondName}</Text>{complete ? <Ionicons name="checkmark-circle" size={18} color="#2E7D63" /> : null}</View><Text style={styles.setupPondStatus}>{complete ? `${value.density} PL/m² · ${value.supplier}` : copy.stockingMissing}</Text></View>
                      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color="#315F57" />
                    </TouchableOpacity>
                    {expanded ? <View style={styles.setupPondForm}>
                      <Text style={styles.inputLabel}>{copy.density}</Text><TextInput style={styles.input} value={value.density} onChangeText={(text) => updatePondSetup(pond.id, 'density', text)} keyboardType="numeric" placeholder="120" placeholderTextColor="#8A9BA8" />
                      <Text style={styles.inputLabel}>{copy.supplier}</Text><TextInput style={styles.input} value={value.supplier} onChangeText={(text) => updatePondSetup(pond.id, 'supplier', text)} placeholder={copy.hatcheryName} placeholderTextColor="#8A9BA8" />
                      {cycleStartMode === 'midcycle' ? <>
                        <Text style={styles.inputLabel}>{copy.currentMbw}</Text><TextInput style={styles.input} value={value.baselineMbw || ''} onChangeText={(text) => updatePondSetup(pond.id, 'baselineMbw', text)} keyboardType="numeric" placeholder={copy.currentMbwPlaceholder} placeholderTextColor="#8A9BA8" />
                        <Text style={styles.inputLabel}>{copy.currentPopulation}</Text><TextInput style={styles.input} value={value.baselineEstimatedPopulation || ''} onChangeText={(text) => updatePondSetup(pond.id, 'baselineEstimatedPopulation', text)} keyboardType="numeric" placeholder={copy.currentPopulationPlaceholder} placeholderTextColor="#8A9BA8" />
                        <Text style={styles.inputLabel}>{copy.currentSurvivalRate}</Text><TextInput style={styles.input} value={value.baselineSurvivalRate || ''} onChangeText={(text) => updatePondSetup(pond.id, 'baselineSurvivalRate', text)} keyboardType="numeric" placeholder={copy.survivalRatePlaceholder} placeholderTextColor="#8A9BA8" />
                        <Text style={styles.inputLabel}>{copy.feedUsedSoFar}</Text><TextInput style={styles.input} value={value.baselineCumulativeFeed || ''} onChangeText={(text) => updatePondSetup(pond.id, 'baselineCumulativeFeed', text)} keyboardType="numeric" placeholder={copy.feedUsedSoFarPlaceholder} placeholderTextColor="#8A9BA8" />
                        <Text style={styles.setupProgressText}>{copy.feedUsedSoFarHint}</Text>
                      </> : null}
                    </View> : null}
                  </View>;
                })}
                <View style={styles.setupActions}><TouchableOpacity style={styles.secondaryAction} onPress={() => stockingCycle ? resetCycleForm() : setCycleFormStep('details')}><Text style={styles.secondaryActionText}>{stockingCycle ? t.actions.cancel : t.actions.back}</Text></TouchableOpacity><TouchableOpacity style={[styles.primaryButton, styles.setupSubmitButton, (saving || setupPonds.length === 0 || completedSetupCount !== setupPonds.length) && styles.disabledAction]} disabled={saving || setupPonds.length === 0 || completedSetupCount !== setupPonds.length} onPress={submitCycle}>{saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>{stockingCycle ? copy.startRemainingPonds : copy.startProductionCycle}</Text>}</TouchableOpacity></View>
              </>}
              {editingCycle ? <View style={styles.editModalActions}>
                <TouchableOpacity style={styles.secondaryAction} onPress={() => { resetCycleForm(); router.push({ pathname: '/cycle-report', params: { cycleId: editingCycle.id } }); }}><Text style={styles.secondaryActionText}>{copy.viewCycleReport}</Text></TouchableOpacity>
                {editingCycle.status !== 'closed' ? <TouchableOpacity style={[styles.closeAction, (editingCycleSummary?.activeCount || 0) > 0 && styles.disabledAction]} disabled={(editingCycleSummary?.activeCount || 0) > 0} onPress={() => Alert.alert(copy.closeCycle, copy.closeCycleConfirm.replace('{{cycleName}}', editingCycle.cycleName), [{ text: t.actions.cancel, style: 'cancel' }, { text: copy.closeCycle, style: 'destructive', onPress: () => { onCloseCycle(editingCycle); resetCycleForm(); } }])}><Text style={styles.closeActionText}>{copy.closeCycle}</Text></TouchableOpacity> : null}
              </View> : null}
            </ScrollView>
          </View>
        </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={addMenuVisible} transparent animationType="fade" onRequestClose={() => setAddMenuVisible(false)}>
        <View style={styles.centeredBackdrop}><View style={styles.dialogCard}>
          <View style={styles.modalHeader}><View style={styles.modalHeaderCopy}><Text style={styles.modalTitle}>{copy.addPrompt}</Text><Text style={styles.modalText}>{copy.addPromptDescription}</Text></View><TouchableOpacity style={styles.closeModalButton} onPress={() => setAddMenuVisible(false)} accessibilityLabel={t.harvest.close}><Ionicons name="close" size={21} color="#334B5C" /></TouchableOpacity></View>
          <TouchableOpacity style={styles.addMenuOption} disabled={activePonds.length === 0} onPress={() => { setAddMenuVisible(false); onAddSampling(); }}><Ionicons name="analytics-outline" size={22} color="#0F4C75" /><Text style={styles.addMenuOptionText}>{t.home.samplingData}</Text></TouchableOpacity>
          <TouchableOpacity style={styles.addMenuOption} disabled={activePonds.length === 0} onPress={() => { setAddMenuVisible(false); onAddMortality(); }}><Ionicons name="pulse-outline" size={22} color="#0F4C75" /><Text style={styles.addMenuOptionText}>{t.home.dailyMortality}</Text></TouchableOpacity>
          <TouchableOpacity style={styles.addMenuOption} disabled={cycleBlockOptions.length === 0} onPress={() => { setAddMenuVisible(false); openCycleForm(); }}><Ionicons name="repeat-outline" size={22} color="#0F4C75" /><Text style={styles.addMenuOptionText}>{copy.newProductionCycle}</Text></TouchableOpacity>
          <TouchableOpacity style={styles.addMenuOption} onPress={() => { setAddMenuVisible(false); setCreateBlockVisible(true); }}><Ionicons name="layers-outline" size={22} color="#0F4C75" /><Text style={styles.addMenuOptionText}>{copy.newBlock}</Text></TouchableOpacity>
          <TouchableOpacity style={styles.addMenuOption} disabled={sortedBlocks.length === 0} onPress={() => { setAddMenuVisible(false); setCreatePondVisible(true); }}><Ionicons name="water-outline" size={22} color="#0F4C75" /><Text style={styles.addMenuOptionText}>{copy.newPond}</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <Modal visible={createPondVisible} transparent animationType="slide" onRequestClose={() => setCreatePondVisible(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.modalBackdrop}><View style={styles.modalSheet}>
          <View style={styles.modalHeader}><View style={styles.modalHeaderCopy}><Text style={styles.modalTitle}>{copy.newPond}</Text><Text style={styles.modalText}>{copy.newPondDescription}</Text></View><TouchableOpacity style={styles.closeModalButton} onPress={() => setCreatePondVisible(false)} accessibilityLabel={t.harvest.close}><Ionicons name="close" size={21} color="#334B5C" /></TouchableOpacity></View>
          <Text style={styles.inputLabel}>{copy.selectBlock}</Text>
          <View style={styles.pondSelector}>{sortedBlocks.map((block) => <TouchableOpacity key={block.id} style={[styles.pondOption, newPondBlockId === block.id && styles.pondOptionSelected]} onPress={() => setNewPondBlockId(block.id)}><Ionicons name={newPondBlockId === block.id ? 'checkmark-circle' : 'ellipse-outline'} size={20} color="#0F4C75" /><Text style={styles.pondOptionName}>{block.name}</Text></TouchableOpacity>)}</View>
          <Text style={styles.inputLabel}>{copy.pondName}</Text><TextInput style={styles.input} value={newPondName} onChangeText={setNewPondName} placeholder="Pond 1" placeholderTextColor="#8A9BA8" />
          <Text style={styles.inputLabel}>{copy.pondArea}</Text><TextInput style={styles.input} value={newPondArea} onChangeText={setNewPondArea} placeholder="1000" keyboardType="numeric" placeholderTextColor="#8A9BA8" />
          <TouchableOpacity style={[styles.primaryButton, (saving || !newPondName.trim() || !newPondBlockId || Number(newPondArea) <= 0) && styles.disabledAction]} disabled={saving || !newPondName.trim() || !newPondBlockId || Number(newPondArea) <= 0} onPress={submitPond}>{saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>{copy.createPond}</Text>}</TouchableOpacity>
        </View></View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={Boolean(selectedPond && selectedStatus)} transparent animationType="fade" onRequestClose={() => setSelectedPond(null)}>
        <View style={styles.centeredBackdrop}><View style={styles.dialogCard}>
          <View style={styles.modalHeader}><View style={styles.modalHeaderCopy}><Text style={styles.modalTitle}>{selectedPond?.pondName}</Text><Text style={styles.modalText}>DOC {selectedStatus?.doc}</Text></View><TouchableOpacity style={styles.closeModalButton} onPress={() => setSelectedPond(null)} accessibilityLabel={t.harvest.close}><Ionicons name="close" size={21} color="#334B5C" /></TouchableOpacity></View>
          {selectedStatus?.risk === 'stable' ? <View style={styles.stablePanel}><Ionicons name="checkmark-circle" size={22} color="#1F6A39" /><Text style={styles.stableText}>{copy.stableHealth}</Text></View> : selectedStatus?.warnings.map((warning) => <View key={warning.code} style={[styles.warningPanel, warning.severity === 'critical' && styles.criticalPanel]}><Ionicons name="warning" size={19} color={warning.severity === 'critical' ? '#B42318' : '#8A5A00'} /><Text style={[styles.warningText, warning.severity === 'critical' && styles.criticalWarningText]}>{warning.label}</Text></View>)}
          <TouchableOpacity style={styles.primaryButton} onPress={() => { const pondId = selectedPond?.id; setSelectedPond(null); if (pondId) router.push({ pathname: '/ponddetails', params: { pondId } }); }}><Text style={styles.primaryButtonText}>{t.enterprise.openPondDetails}</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <Modal visible={createBlockVisible} transparent animationType="slide" onRequestClose={() => setCreateBlockVisible(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.modalBackdrop}><View style={styles.modalSheet}>
          <View style={styles.modalHeader}><View style={styles.modalHeaderCopy}><Text style={styles.modalTitle}>{copy.manageBlocks}</Text><Text style={styles.modalText}>{copy.manageBlocksDescription}</Text></View><TouchableOpacity style={styles.closeModalButton} onPress={() => setCreateBlockVisible(false)} accessibilityLabel={t.harvest.close}><Ionicons name="close" size={21} color="#334B5C" /></TouchableOpacity></View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="never">
          {sortedBlocks.length > 0 ? <View style={styles.pondSelector}>{sortedBlocks.map((block) => {
            const technician = technicians.find((candidate) => candidate.uid === block.assignedTechnicianId);
            return <TouchableOpacity key={block.id} style={styles.pondOption} onPress={() => { setCreateBlockVisible(false); openEditBlock(block); }}><Ionicons name="layers-outline" size={20} color="#0F4C75" /><Text style={styles.pondOptionName}>{block.name}</Text><Text style={styles.pondOptionArea}>{getEnterpriseTechnicianLabel(technician?.name, technician?.email, t.enterprise.unassigned)}</Text><Ionicons name="pencil-outline" size={16} color="#5E7485" /></TouchableOpacity>;
          })}</View> : null}
          <Text style={styles.inputLabel}>{t.enterprise.blockName}</Text><TextInput style={styles.input} value={blockName} onChangeText={setBlockName} placeholder={t.enterprise.blockNamePlaceholder} />
          <Text style={styles.inputLabel}>{t.enterprise.assignTechnician}</Text>
          <View style={styles.pondSelector}>{technicians.map((technician) => <TouchableOpacity key={technician.uid} style={[styles.pondOption, blockTechnicianId === technician.uid && styles.pondOptionSelected]} onPress={() => setBlockTechnicianId(technician.uid)}><Ionicons name={blockTechnicianId === technician.uid ? 'checkmark-circle' : 'ellipse-outline'} size={20} color="#0F4C75" /><Text style={styles.pondOptionName}>{getEnterpriseTechnicianLabel(technician.name, technician.email)}</Text></TouchableOpacity>)}</View>
          <TouchableOpacity style={[styles.primaryButton, (!blockName.trim() || saving) && styles.disabledAction]} disabled={!blockName.trim() || saving} onPress={submitBlock}><Text style={styles.primaryButtonText}>{t.enterprise.saveBlock}</Text></TouchableOpacity>
          </ScrollView>
        </View></View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={Boolean(editingBlock)} transparent animationType="slide" onRequestClose={() => setEditingBlock(null)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.modalBackdrop}><View style={styles.modalSheet}>
          <View style={styles.modalHeader}><View style={styles.modalHeaderCopy}><Text style={styles.modalTitle}>{t.enterprise.editBlock || 'Edit Block'}</Text><Text style={styles.modalText}>{t.enterprise.editBlockDescription || 'Update the block name or change the assigned technician.'}</Text></View><TouchableOpacity style={styles.closeModalButton} onPress={() => setEditingBlock(null)} accessibilityLabel={t.harvest.close}><Ionicons name="close" size={21} color="#334B5C" /></TouchableOpacity></View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="never">
          <Text style={styles.inputLabel}>{t.enterprise.blockName}</Text>
          <TextInput style={styles.input} value={editingBlockName} onChangeText={setEditingBlockName} placeholder={t.enterprise.blockNamePlaceholder} placeholderTextColor="#8A9BA8" />
          <Text style={styles.inputLabel}>{t.enterprise.assignTechnician}</Text>
          <View style={styles.pondSelector}>
            <TouchableOpacity
              style={[styles.pondOption, editingBlockTechnicianId === null && styles.pondOptionSelected]}
              onPress={() => setEditingBlockTechnicianId(null)}
            >
              <Ionicons name={editingBlockTechnicianId === null ? 'checkmark-circle' : 'ellipse-outline'} size={20} color="#0F4C75" />
              <Text style={styles.pondOptionName}>{t.enterprise.unassigned || 'Unassigned'}</Text>
            </TouchableOpacity>
            {technicians.map((technician) => (
              <TouchableOpacity
                key={technician.uid}
                style={[styles.pondOption, editingBlockTechnicianId === technician.uid && styles.pondOptionSelected]}
                onPress={() => setEditingBlockTechnicianId(technician.uid)}
              >
                <Ionicons name={editingBlockTechnicianId === technician.uid ? 'checkmark-circle' : 'ellipse-outline'} size={20} color="#0F4C75" />
                <Text style={styles.pondOptionName}>{getEnterpriseTechnicianLabel(technician.name, technician.email)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.primaryButton, (!editingBlockName.trim() || saving) && styles.disabledAction]}
            disabled={!editingBlockName.trim() || saving}
            onPress={submitEditBlock}
          >
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>{t.actions.save || 'Save'}</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cancelButton, { marginTop: 10, borderColor: '#F0C8C3', backgroundColor: '#FFF5F5' }]}
            disabled={saving}
            onPress={promptDeleteBlock}
          >
            <Text style={[styles.cancelText, { color: '#B42318' }]}>{t.enterprise.deleteBlock || 'Delete block'}</Text>
          </TouchableOpacity>
          </ScrollView>
        </View></View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={Boolean(assignmentBlock)} transparent animationType="fade" onRequestClose={() => setAssignmentBlock(null)}>
        <View style={styles.centeredBackdrop}><View style={styles.dialogCard}>
          <Text style={styles.modalTitle}>{t.enterprise.assignTechnician} · {assignmentBlock?.name}</Text>
          <View style={styles.pondSelector}>{technicians.map((technician) => <TouchableOpacity key={technician.uid} style={styles.pondOption} onPress={() => assignTechnician(technician)}><Ionicons name="person-circle-outline" size={21} color="#0F4C75" /><Text style={styles.pondOptionName}>{getEnterpriseTechnicianLabel(technician.name, technician.email)}</Text></TouchableOpacity>)}</View>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setAssignmentBlock(null)}><Text style={styles.cancelText}>{t.actions.cancel}</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F8FC', paddingHorizontal: 16, paddingTop: 10, gap: 14 },
  enterpriseHeader: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  dashboardModeSwitchContainer: { marginHorizontal: -16 },
  enterpriseHeaderCopy: { flex: 1, minWidth: 0 },
  enterpriseHeaderTitle: { color: '#102F46', fontSize: 24, fontWeight: '900' },
  enterpriseCompanyName: { marginTop: 3, color: '#6A8191', fontSize: 12, fontWeight: '700' },
  cycleFilterContainer: { flexDirection: 'row', padding: 4, borderRadius: 14, borderWidth: 1, borderColor: '#E0ECF3', backgroundColor: '#FFFFFF' },
  cycleFilterButton: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  cycleFilterButtonActive: { backgroundColor: '#0F4C75' },
  cycleFilterText: { color: '#60798A', fontSize: 11, fontWeight: '800' },
  cycleFilterTextActive: { color: '#FFFFFF' },
  summaryCard: { borderRadius: 22, borderWidth: 1, borderColor: '#D8E7F0', backgroundColor: '#FFFFFF', padding: 18, gap: 16, shadowColor: '#0F4C75', shadowOpacity: 0.06, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  summaryHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  summaryCopy: { flex: 1 },
  eyebrow: { color: '#3282B8', fontSize: 10, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  summaryTitle: { marginTop: 4, color: '#102F46', fontSize: 24, fontWeight: '900' },
  summaryText: { marginTop: 4, color: '#60798A', fontSize: 13, lineHeight: 19 },
  summaryActions: { flexDirection: 'row', gap: 7 },
  manageBlockButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: '#9EC5DC', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  addBlockButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#0F4C75', alignItems: 'center', justifyContent: 'center' },
  summaryStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summaryStat: { width: '48%', flexGrow: 1, borderRadius: 13, borderWidth: 1, borderColor: '#E0ECF3', backgroundColor: '#F8FBFD', padding: 11 },
  summaryStatWarning: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
  summaryStatValue: { color: '#0F4C75', fontSize: 19, fontWeight: '900' },
  summaryStatValueWarning: { color: '#B45309' },
  summaryStatLabel: { marginTop: 2, color: '#6A8191', fontSize: 9, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, paddingHorizontal: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 999 },
  legendText: { color: '#61798A', fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  scroll: { flex: 1 },
  scrollContent: { gap: 12, paddingBottom: 120 },
  loadingState: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: '#6A8191', fontSize: 12 },
  errorText: { color: '#B42318', fontSize: 12 },
  blockCard: { borderRadius: 18, borderWidth: 1, borderColor: '#D8E7F0', backgroundColor: '#FFFFFF', overflow: 'hidden' },
  blockHeader: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 11, paddingRight: 14 },
  blockRisk: { width: 6, alignSelf: 'stretch' },
  blockHeaderCopy: { flex: 1, gap: 5 },
  blockTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  blockTitle: { flexShrink: 1, color: '#102F46', fontSize: 16, fontWeight: '900' },
  technicianBadge: { maxWidth: '55%', borderRadius: 999, backgroundColor: '#E8F3FA', paddingHorizontal: 9, paddingVertical: 5 },
  technicianText: { color: '#0F4C75', fontSize: 9, fontWeight: '800' },
  blockMeta: { color: '#6A8191', fontSize: 11, fontWeight: '600' },
  blockBody: { borderTopWidth: 1, borderTopColor: '#D8E7F0', backgroundColor: '#F8FBFD', padding: 12, gap: 10 },
  blockToolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 2 },
  blockToolbarTitle: { color: '#6A8191', fontSize: 9, fontWeight: '900', letterSpacing: 0.7, textTransform: 'uppercase' },
  newCycleButton: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, backgroundColor: '#E8F3FA', paddingHorizontal: 10, paddingVertical: 8 },
  newCycleText: { color: '#0F4C75', fontSize: 10, fontWeight: '800' },
  emptyCycle: { minHeight: 72, borderRadius: 13, borderWidth: 1, borderStyle: 'dashed', borderColor: '#9EC5DC', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyCycleText: { color: '#0F4C75', fontSize: 12, fontWeight: '800' },
  cycleCard: { borderRadius: 14, borderWidth: 1, borderColor: '#D8E7F0', backgroundColor: '#FFFFFF', overflow: 'hidden' },
  cycleHeader: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
  cycleToggle: { minWidth: 0, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },
  cycleIcon: { width: 37, height: 37, borderRadius: 11, backgroundColor: '#E8F3FA', alignItems: 'center', justifyContent: 'center' },
  cycleCopy: { flex: 1, minWidth: 0 },
  cycleName: { color: '#102F46', fontSize: 13, fontWeight: '900' },
  cycleDate: { marginTop: 3, color: '#6A8191', fontSize: 9, fontWeight: '600' },
  editCycleButton: { minHeight: 34, borderRadius: 9, borderWidth: 1, borderColor: '#D8E7F0', backgroundColor: '#FFFFFF', paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 4 },
  editCycleText: { color: '#0F4C75', fontSize: 9, fontWeight: '800' },
  cycleCount: { alignItems: 'center', minWidth: 34 },
  cycleCountValue: { color: '#102F46', fontSize: 13, fontWeight: '900' },
  cycleCountLabel: { color: '#6A8191', fontSize: 8 },
  statusBadge: { borderRadius: 999, backgroundColor: '#EAF7EE', paddingHorizontal: 8, paddingVertical: 5 },
  statusPlanning: { backgroundColor: '#EEF2F6' },
  statusStocking: { backgroundColor: '#FFF4D6' },
  statusClosed: { backgroundColor: '#EDF0F3' },
  statusText: { color: '#315F57', fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  cycleBody: { borderTopWidth: 1, borderTopColor: '#D8E7F0', padding: 11, gap: 11 },
  progressRow: { flexDirection: 'row', gap: 7 },
  progressStat: { flex: 1, borderRadius: 10, backgroundColor: '#F4F8FC', padding: 8 },
  progressValue: { color: '#0F4C75', fontSize: 13, fontWeight: '900' },
  progressLabel: { marginTop: 2, color: '#6A8191', fontSize: 8, fontWeight: '700' },
  cycleBlockList: { gap: 9 },
  cycleBlock: { borderRadius: 12, borderWidth: 1, borderColor: '#D8E7F0', backgroundColor: '#F8FBFD', overflow: 'hidden' },
  cycleBlockHeader: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 9, paddingRight: 10 },
  cycleBlockCopy: { flex: 1, gap: 3 },
  pondGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  pondTile: { minWidth: 45, minHeight: 60, borderRadius: 8, padding: 3, alignItems: 'center', justifyContent: 'center', gap: 2 },
  pondName: { textAlign: 'center', fontSize: 9, fontWeight: '900' },
  pondMeta: { fontSize: 8, fontWeight: '700', opacity: 0.82 },
  waitingPond: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#76A9C8', backgroundColor: '#FFFFFF' },
  waitingPondName: { color: '#0F4C75', textAlign: 'center', fontSize: 9, fontWeight: '900' },
  waitingPondMeta: { color: '#3282B8', fontSize: 8, fontWeight: '700' },
  cycleActions: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  editModalActions: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  secondaryAction: { minHeight: 34, borderRadius: 9, borderWidth: 1, borderColor: '#D8E7F0', backgroundColor: '#FFFFFF', paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
  secondaryActionText: { color: '#0F4C75', fontSize: 10, fontWeight: '800' },
  closeAction: { marginLeft: 'auto', minHeight: 34, borderRadius: 9, borderWidth: 1, borderColor: '#F0C8C3', paddingHorizontal: 10, justifyContent: 'center' },
  closeActionText: { color: '#B42318', fontSize: 10, fontWeight: '800' },
  disabledAction: { opacity: 0.45 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,42,60,0.46)' },
  centeredBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(15,42,60,0.46)' },
  modalSheet: { maxHeight: '92%', borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 22, gap: 16 },
  dialogCard: { width: '100%', maxWidth: 460, borderRadius: 22, backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 20, gap: 14 },
  addMenuOption: { minHeight: 54, borderRadius: 13, borderWidth: 1, borderColor: '#D8E7F0', backgroundColor: '#F8FBFD', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 11 },
  addMenuOptionText: { color: '#102F46', fontSize: 13, fontWeight: '800' },
  modalHeader: { minHeight: 40, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 },
  modalHeaderCopy: { flex: 1, minWidth: 0, paddingTop: 1 },
  modalTitle: { color: '#102F46', fontSize: 20, lineHeight: 26, fontWeight: '900' },
  modalText: { marginTop: 4, color: '#6A8191', fontSize: 12, lineHeight: 18 },
  closeModalButton: { width: 40, height: 40, flexShrink: 0, borderRadius: 12, borderWidth: 1, borderColor: '#D8E7F0', backgroundColor: '#F4F8FC', alignItems: 'center', justifyContent: 'center' },
  inputLabel: { marginTop: 12, marginBottom: 7, color: '#60798A', fontSize: 10, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: '#D8E7F0', backgroundColor: '#F8FBFD', paddingHorizontal: 13, color: '#102F46', fontSize: 14, fontWeight: '600' },
  setupProgress: { marginTop: 2, marginBottom: 10, borderRadius: 13, borderWidth: 1, borderColor: '#D8E7F0', backgroundColor: '#F4F8FC', padding: 13 },
  setupProgressTitle: { color: '#102F46', fontSize: 13, fontWeight: '900' },
  setupProgressText: { marginTop: 3, color: '#6A8191', fontSize: 10, fontWeight: '600' },
  cycleModeRow: { gap: 8, marginBottom: 12 },
  cycleModeOption: { minHeight: 64, borderRadius: 12, borderWidth: 1, borderColor: '#D8E7F0', backgroundColor: '#FFFFFF', padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 },
  cycleModeOptionSelected: { borderColor: '#3282B8', backgroundColor: '#EAF6FD' },
  cycleModeCopy: { flex: 1, minWidth: 0 },
  cycleModeTitle: { color: '#102F46', fontSize: 12, fontWeight: '900' },
  cycleModeHint: { marginTop: 3, color: '#6A8191', fontSize: 10, lineHeight: 14, fontWeight: '600' },
  setupPondCard: { marginBottom: 9, borderRadius: 13, borderWidth: 1, borderColor: '#D8E7F0', backgroundColor: '#FFFFFF', overflow: 'hidden' },
  setupPondCardExpanded: { borderColor: '#8FB7D1' },
  setupPondHeader: { minHeight: 62, paddingHorizontal: 13, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 10 },
  setupPondCopy: { flex: 1, minWidth: 0 },
  setupPondTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  setupPondTitle: { color: '#102F46', fontSize: 13, fontWeight: '900' },
  setupPondStatus: { marginTop: 3, color: '#6A8191', fontSize: 10, fontWeight: '600' },
  setupPondForm: { borderTopWidth: 1, borderTopColor: '#E3EDF3', backgroundColor: '#F8FBFD', paddingHorizontal: 13, paddingBottom: 14 },
  setupActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  setupSubmitButton: { flex: 1, marginTop: 0 },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateField: { flex: 1, marginTop: 12 },
  pondSelector: { gap: 7 },
  pondOption: { minHeight: 48, borderRadius: 11, borderWidth: 1, borderColor: '#D8E7F0', backgroundColor: '#FFFFFF', paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 9 },
  pondOptionSelected: { borderColor: '#3282B8', backgroundColor: '#EAF6FD' },
  pondOptionName: { flex: 1, color: '#102F46', fontSize: 12, fontWeight: '800' },
  pondOptionArea: { color: '#6A8191', fontSize: 10 },
  emptySelectorText: { color: '#6A8191', fontSize: 12, paddingVertical: 14 },
  primaryButton: { minHeight: 48, marginTop: 15, borderRadius: 13, backgroundColor: '#0F4C75', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primarySmallButton: { minHeight: 42, flex: 1, borderRadius: 11, backgroundColor: '#0F4C75', alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  cancelButton: { minHeight: 42, flex: 1, borderRadius: 11, borderWidth: 1, borderColor: '#D8E7F0', alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: '#5E7485', fontSize: 12, fontWeight: '800' },
  dialogActions: { flexDirection: 'row', gap: 9 },
  stablePanel: { borderRadius: 12, backgroundColor: '#EAF7EE', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 9 },
  stableText: { color: '#1F6A39', fontSize: 12, fontWeight: '800' },
  warningPanel: { borderRadius: 12, backgroundColor: '#FFF8E8', padding: 13, flexDirection: 'row', alignItems: 'center', gap: 9 },
  criticalPanel: { backgroundColor: '#FDE8E8', borderWidth: 1, borderColor: '#FAA0A0' },
  warningText: { flex: 1, color: '#754900', fontSize: 12, fontWeight: '700' },
  criticalWarningText: { color: '#8B1E1E' },
});
