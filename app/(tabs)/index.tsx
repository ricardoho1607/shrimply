// app/(tabs)/index.tsx - Fully translated version with keyboard handling
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { 
  FlatList, Modal, Platform, ScrollView, StatusBar, StyleSheet, 
  Text, TextInput, TouchableOpacity, View, Alert, KeyboardAvoidingView,
  Keyboard, TouchableWithoutFeedback
} from 'react-native';
import { usePondStore, type FarmCycle, type Pond, type Sampling, type PondCycleEndReason, type PhysicalPond, type MortalityObservationType, getActiveFarmCycle, getPhysicalPondKey, getPondCurrentDoc, getPondCycleStatus, getPondPlSupplier, isBaselineSampling, isPondCycleActive } from '.././store/pondStore';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import ShrimpIcon from '../components/icons/ShrimpIcon';
import { differenceInFarmCalendarDays, getFarmDateKey } from '../../shared/farmDate';
import { calculateAdg } from '../../shared/pondCalculations';
import { hasFinalHarvestForPondCycle } from '../../shared/harvestCalculations';
import { hasFarmPermission } from '../../shared/permissions';
import { getEnterpriseStockingDateRange } from '../../shared/enterpriseCycleSetup';
import {
  filterEnterpriseRecordsForUser,
  type FarmBlock,
} from '../../shared/enterpriseBlocks';
import EnterpriseDashboard from '../components/enterprise/EnterpriseCycleDashboard';
import { useEnterpriseBlocks } from '../hooks/useEnterpriseBlocks';
import ProfileCompletionCard from '../components/onboarding/ProfileCompletionCard';
import AppDatePicker from '../components/forms/AppDatePicker';
import { getFunctions, httpsCallable } from 'firebase/functions';
import firebaseApp from '../../config/firebase';

interface FormData {
  pondName: string; 
  pondArea: string; 
  blockId: string;
  density: string; 
  supplier: string; 
  plValue: string; 
  docStart: Date;
  cycleStartMode: 'new' | 'midcycle';
  baselineDate: Date;
  baselineMbw: string;
  baselineEstimatedPopulation: string;
  baselineSurvivalRate: string;
  baselineCumulativeFeed: string;
  cyclePondId: string;
  cycleId: string;
  cycleTargetMode: 'existing' | 'new';
  newCycleName: string;
  selectedPond: string; 
  mbw: string; 
  feed: string; 
  samplingDate: Date;
  mortalityObservationType: MortalityObservationType;
  mortalityCount: string;
  siponShift: 'morning' | 'evening';
  siphonedCount: string;
  mortalCount: string;
  mortalityDate: Date;
  mortalityNotes: string;
}

const pondNameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

const compareByPondName = (
  first: { pondName: string },
  second: { pondName: string }
) => pondNameCollator.compare(
  first.pondName.replace(/\s+/g, ''),
  second.pondName.replace(/\s+/g, '')
);

const DetailItem = ({ 
  iconName, 
  label, 
  value, 
  isShrimp = false 
}: { 
  iconName?: string; 
  label?: string; 
  value?: string; 
  isShrimp?: boolean 
}) => {
  if (!iconName && !label && !value && !isShrimp) {
    return <View style={styles.detailItem} />;
  }
  
  return (
    <View style={styles.detailItem}>
      {isShrimp ? (
        <ShrimpIcon size={14} color="#dce8f2" />
      ) : iconName ? (
        <Ionicons name={iconName as any} size={14} color="#dce8f2" />
      ) : (
        <View style={{ width: 14 }} />
      )}
      <Text 
        style={styles.detailLabel}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {label || ''}
      </Text>
      <Text 
        style={styles.detailValue}
        numberOfLines={1}
        adjustsFontSizeToFit={Platform.OS === 'android'}
        minimumFontScale={0.85}
      >
        {value || ''}
      </Text>
    </View>
  );
};

const InputField = React.memo(({ 
  label, 
  value, 
  onChangeText, 
  placeholder, 
  keyboardType = 'default', 
  hint,
  maxLength,
}: {
  label: string; 
  value: string; 
  onChangeText: (text: string) => void; 
  placeholder: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad'; 
  hint?: string;
  maxLength?: number;
}) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput 
      placeholder={placeholder} 
      value={value} 
      onChangeText={onChangeText} 
      keyboardType={keyboardType}
      maxLength={maxLength}
      style={styles.input} 
      placeholderTextColor="#6b8aa0" 
    />
    {hint && <Text style={styles.inputHint}>{hint}</Text>}
  </View>
));
InputField.displayName = 'InputField';

export default function PondManagementScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, company } = useAuth();
  const canManagePonds = hasFarmPermission(user, 'managePonds', company?.ownerId);
  const canRecordPondData = hasFarmPermission(user, 'recordPondData', company?.ownerId);
  const canEditPonds = canManagePonds || canRecordPondData;
  const isEnterpriseFarm = company?.businessSize === 'enterprise';
  const canManageFarmCycle = hasFarmPermission(user, 'manageCycles', company?.ownerId);
  const canManageEnterpriseBlocks = hasFarmPermission(user, 'manageEnterpriseBlocks', company?.ownerId);
  const enterpriseBlocks = useEnterpriseBlocks(isEnterpriseFarm ? company?.id : undefined, user?.uid);
  
  const { 
    ponds, 
    physicalPonds,
    cycles,
    harvestRecords,
    addFarmCycle,
    addPhysicalPond,
    deletePhysicalPond,
    addPond, 
    updatePond,
    deletePond,
    addSampling, 
    addMortalityRecord,
    endPondCycle, 
    updateFarmCycle,
    closeFarmCycle,
    calculatePondMetricsWithHarvest, 
  } = usePondStore();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [cycleFilter, setCycleFilter] = useState<'active' | 'inactive' | 'ended'>('active');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const [modalType, setModalType] = useState<'pond' | 'sampling' | 'mortality' | 'cycle' | 'baseline'>('pond');
  const [cycleNameDraft, setCycleNameDraft] = useState('');
  const [selectedDashboardCycleId, setSelectedDashboardCycleId] = useState('');
  const [cycleManagerExpanded, setCycleManagerExpanded] = useState(false);
  const [dashboardMode, setDashboardMode] = useState<'enterprise' | 'normal'>('enterprise');
  const [editingBaselinePondId, setEditingBaselinePondId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    pondName: '', 
    pondArea: '', 
    blockId: '',
    density: '', 
    supplier: '', 
    plValue: '', 
    docStart: new Date(),
    cycleStartMode: 'new',
    baselineDate: new Date(),
    baselineMbw: '',
    baselineEstimatedPopulation: '',
    baselineSurvivalRate: '',
    baselineCumulativeFeed: '',
    cyclePondId: '',
    cycleId: '',
    cycleTargetMode: 'existing',
    newCycleName: '',
    selectedPond: '', 
    mbw: '', 
    feed: '', 
    samplingDate: new Date(),
    mortalityObservationType: 'observed_recovered',
    mortalityCount: '',
    siponShift: 'morning',
    siphonedCount: '',
    mortalCount: '',
    mortalityDate: new Date(),
    mortalityNotes: '',
  });

  useEffect(() => {
    if (modalVisible) {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }, [modalVisible]);

  const updateForm = useCallback((key: keyof FormData, value: any) => 
    setFormData(prev => ({ ...prev, [key]: value })), 
  []);
  
  const resetForm = useCallback(() => setFormData({
    pondName: '', 
    pondArea: '', 
    blockId: '',
    density: '', 
    supplier: '', 
    plValue: '', 
    docStart: new Date(),
    cycleStartMode: 'new',
    baselineDate: new Date(),
    baselineMbw: '',
    baselineEstimatedPopulation: '',
    baselineSurvivalRate: '',
    baselineCumulativeFeed: '',
    cyclePondId: '',
    cycleId: '',
    cycleTargetMode: 'existing',
    newCycleName: '',
    selectedPond: '', 
    mbw: '', 
    feed: '', 
    samplingDate: new Date(),
    mortalityObservationType: 'observed_recovered',
    mortalityCount: '',
    siponShift: 'morning',
    siphonedCount: '',
    mortalCount: '',
    mortalityDate: new Date(),
    mortalityNotes: '',
  }), []);

  const convertPlToGrams = useCallback((plValue: string): number => {
    const numericValue = parseFloat(plValue);
    return isNaN(numericValue) ? 0 : numericValue / 10;
  }, []);

  const parseNumericInput = useCallback((value: string): number => {
    const parsed = Number(String(value).trim().replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }, []);

  const formatLocalDateKey = useCallback((date: Date): string => {
    const safeDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
    const year = safeDate.getFullYear();
    const month = String(safeDate.getMonth() + 1).padStart(2, '0');
    const day = String(safeDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const normalizeDateValue = useCallback((value: unknown): Date => {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  }, []);

  const calculateDocFromDates = useCallback((startDate: Date, baselineDate: Date): number => {
    const startTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
    const baselineTime = new Date(baselineDate.getFullYear(), baselineDate.getMonth(), baselineDate.getDate()).getTime();
    return Math.floor((baselineTime - startTime) / (24 * 60 * 60 * 1000));
  }, []);

  const availableEnterpriseBlocks = useMemo(() => {
    if (!isEnterpriseFarm || !canManagePonds) return [];
    if (user?.role === 'technician') return enterpriseBlocks.blocksAssignedToUser;
    return enterpriseBlocks.blocks;
  }, [canManagePonds, enterpriseBlocks.blocks, enterpriseBlocks.blocksAssignedToUser, isEnterpriseFarm, user?.role]);
  const accessiblePonds = useMemo(() => filterEnterpriseRecordsForUser(ponds, {
    businessSize: company?.businessSize,
    role: user?.role,
    userId: user?.uid,
    blocks: enterpriseBlocks.blocks,
  }), [company?.businessSize, enterpriseBlocks.blocks, ponds, user?.role, user?.uid]);
  const accessiblePhysicalPonds = useMemo(() => filterEnterpriseRecordsForUser(physicalPonds, {
    businessSize: company?.businessSize,
    role: user?.role,
    userId: user?.uid,
    blocks: enterpriseBlocks.blocks,
  }), [company?.businessSize, enterpriseBlocks.blocks, physicalPonds, user?.role, user?.uid]);
  const activePonds = useMemo(
    () => accessiblePonds.filter(isPondCycleActive).sort(compareByPondName),
    [accessiblePonds]
  );
  const endedPonds = useMemo(
    () => accessiblePonds.filter((pond) => !isPondCycleActive(pond)).sort(compareByPondName),
    [accessiblePonds]
  );
  const activePhysicalPondNames = useMemo(
    () => new Set(activePonds.map((pond) => getPhysicalPondKey(pond.pondName))),
    [activePonds]
  );
  const idlePhysicalPonds = useMemo(() => {
    return accessiblePhysicalPonds
      .filter((pond) => pond.status !== 'active' && !activePhysicalPondNames.has(getPhysicalPondKey(pond.pondName)))
      .sort(compareByPondName);
  }, [accessiblePhysicalPonds, activePhysicalPondNames]);
  const startableEndedPonds = useMemo(() => {
    const latestByPondName = new Map<string, Pond>();

    endedPonds.forEach((pond) => {
      const pondKey = getPhysicalPondKey(pond.pondName);
      if (activePhysicalPondNames.has(pondKey)) return;

      const current = latestByPondName.get(pondKey);
      const pondDate = new Date(pond.cycleEndedAt || pond.docStart || 0).getTime();
      const currentDate = current ? new Date(current.cycleEndedAt || current.docStart || 0).getTime() : -Infinity;
      if (!current || pondDate >= currentDate) {
        latestByPondName.set(pondKey, pond);
      }
    });

    return Array.from(latestByPondName.values()).sort(compareByPondName);
  }, [activePhysicalPondNames, endedPonds]);
  const startablePondOptions = useMemo<(PhysicalPond | Pond)[]>(
    () => [...idlePhysicalPonds, ...startableEndedPonds].sort(compareByPondName),
    [idlePhysicalPonds, startableEndedPonds]
  );
  const inferredFarmCycle = useMemo<FarmCycle | undefined>(() => {
    if (cycles.length > 0 || accessiblePonds.length === 0) return undefined;

    const groupedPonds = accessiblePonds.reduce((groups, pond) => {
      const cycleId = pond.cycleId || 'legacy-active-cycle';
      const existing = groups.get(cycleId) || [];
      groups.set(cycleId, [...existing, pond]);
      return groups;
    }, new Map<string, Pond[]>());

    const latestGroup = Array.from(groupedPonds.entries()).sort(([, firstPonds], [, secondPonds]) => {
      const firstLatest = Math.max(...firstPonds.map((pond) => new Date(pond.cycleStartedAt || pond.docStart || 0).getTime()));
      const secondLatest = Math.max(...secondPonds.map((pond) => new Date(pond.cycleStartedAt || pond.docStart || 0).getTime()));
      return secondLatest - firstLatest;
    })[0];

    if (!latestGroup) return undefined;
    const [cycleId, cyclePonds] = latestGroup;
    const firstPond = cyclePonds[0];

    return {
      id: cycleId,
      cycleName: firstPond.cycleName || t.farmCycle.currentCycle,
      status: 'active',
      plannedStartDate: firstPond.cycleStartedAt || firstPond.docStart,
      stockingStartDate: cyclePonds
        .map((pond) => pond.cycleStartedAt || pond.docStart)
        .filter(Boolean)
        .sort()[0],
    };
  }, [accessiblePonds, cycles.length, t.farmCycle.currentCycle]);
  const accessibleFarmCycles = useMemo(() => {
    if (!isEnterpriseFarm || user?.role !== 'technician') return cycles;
    const assignedBlockIds = new Set(availableEnterpriseBlocks.map((block) => block.id));
    return cycles.filter((cycle) => (
      cycle.blockIds?.some((blockId) => assignedBlockIds.has(blockId))
      ||
      (cycle.blockId && assignedBlockIds.has(cycle.blockId))
      || (!cycle.blockId && accessiblePonds.some((pond) => pond.cycleId === cycle.id))
    ));
  }, [accessiblePonds, availableEnterpriseBlocks, cycles, isEnterpriseFarm, user?.role]);
  const openAccessibleFarmCycles = useMemo(
    () => accessibleFarmCycles.filter((cycle) => ['planning', 'stocking', 'active'].includes(cycle.status)),
    [accessibleFarmCycles],
  );
  const activeFarmCycle = useMemo(() => (
    openAccessibleFarmCycles.find((cycle) => cycle.id === selectedDashboardCycleId)
    || getActiveFarmCycle(accessibleFarmCycles)
    || inferredFarmCycle
  ), [accessibleFarmCycles, inferredFarmCycle, openAccessibleFarmCycles, selectedDashboardCycleId]);
  const currentCyclePonds = useMemo(() => {
    if (!activeFarmCycle) return activePonds;
    return accessiblePonds
      .filter((pond) =>
        pond.cycleId === activeFarmCycle.id ||
        (activeFarmCycle.id === 'legacy-active-cycle' && !pond.cycleId) ||
        (!pond.cycleId && openAccessibleFarmCycles.length <= 1 && isPondCycleActive(pond))
      )
      .sort(compareByPondName);
  }, [accessiblePonds, activeFarmCycle, activePonds, openAccessibleFarmCycles.length]);
  const activeCyclePonds = useMemo(() => currentCyclePonds.filter(isPondCycleActive), [currentCyclePonds]);
  const currentCycleTitle = activeFarmCycle?.cycleName || (currentCyclePonds.length > 0 ? t.farmCycle.currentCycle : t.farmCycle.noActiveCycle);
  const currentCycleStatus = activeFarmCycle?.status || (currentCyclePonds.length > 0 ? t.farmCycle.status.active : t.farmCycle.status.waiting);
  const visiblePonds = useMemo(
    () => cycleFilter === 'inactive'
      ? []
      : accessiblePonds
        .filter((pond) => {
          if (getPondCycleStatus(pond) !== cycleFilter) return false;
          if (cycleFilter === 'active' && activeFarmCycle && openAccessibleFarmCycles.length > 1) {
            return pond.cycleId === activeFarmCycle.id;
          }
          return true;
        })
        .sort(compareByPondName),
    [accessiblePonds, activeFarmCycle, cycleFilter, openAccessibleFarmCycles.length]
  );

  useEffect(() => {
    setCycleNameDraft(activeFarmCycle?.cycleName || '');
  }, [activeFarmCycle?.id, activeFarmCycle?.cycleName]);

  useEffect(() => {
    if (!activeFarmCycle || activeFarmCycle.id === selectedDashboardCycleId) return;
    setSelectedDashboardCycleId(activeFarmCycle.id);
  }, [activeFarmCycle, selectedDashboardCycleId]);

  const getLatestSampling = useCallback((pondId: string): Sampling | null => {
    const pond = accessiblePonds.find(p => p.id === pondId);
    const samples = (pond?.samplings || []).filter((sample) =>
      !isBaselineSampling(sample) && Number(sample.mbw) > 0
    );
    return samples.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0] || null;
  }, [accessiblePonds]);

  const getLastADG = useCallback((pondId: string): number => {
    const pond = accessiblePonds.find(p => p.id === pondId);
    return pond ? calculateAdg(pond, company?.timeZone) : 0;
  }, [accessiblePonds, company?.timeZone]);

  const calculateMetrics = useCallback((pond: Pond) => {
    const metrics = calculatePondMetricsWithHarvest(pond);
    const latestSampling = getLatestSampling(pond.id);
    const currentMbw = latestSampling ? Number(latestSampling.mbw) : Number(pond.baselineMbw || pond.initialWeight);
    const size = (currentMbw && currentMbw > 0) 
      ? (1000 / currentMbw).toFixed(0) 
      : '0';
      
    return {
      doc: getPondCurrentDoc(pond, company?.timeZone),
      totalBiomass: metrics.currentBiomass,
      sr: metrics.adjustedSR.toFixed(1), 
      size,
      currentPopulation: metrics.currentPopulation, 
      latestSampling,
      fcr: metrics.adjustedFCR.toFixed(2),
    };
  }, [calculatePondMetricsWithHarvest, company?.timeZone, getLatestSampling]);

  const getDOCColor = useCallback((doc: number): string => {
    if (doc < 30) return '#0d2137';
    if (doc < 60) return '#315f57';
    if (doc < 90) return '#dbe7df';
    return '#0d2137';
  }, []);

  const closeModal = useCallback(() => { 
    resetForm(); 
    setEditingBaselinePondId(null);
    setModalVisible(false); 
  }, [resetForm]);

  const currentCompanyId = company?.id;
  const createPhysicalPondOnServer = useCallback(async (pond: PhysicalPond) => {
    if (!currentCompanyId) throw new Error('Company not found.');
    const createPhysicalPond = httpsCallable<
      { companyId: string; pondId: string; pond: { pondName: string; pondArea: number; blockId?: string; blockName?: string } },
      { id: string }
    >(getFunctions(firebaseApp), 'createCompanyPhysicalPond');
    const result = await createPhysicalPond({
      companyId: currentCompanyId,
      pondId: pond.id,
      pond: {
        pondName: pond.pondName,
        pondArea: pond.pondArea,
        blockId: pond.blockId,
        blockName: pond.blockName,
      },
    });
    addPhysicalPond({ ...pond, id: result.data.id }, { sync: false });
    return result.data.id;
  }, [addPhysicalPond, currentCompanyId]);

  const handleAddPond = useCallback(async () => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setIsSubmitting(true);

    if (!canManagePonds) {
      Alert.alert(
        t.home.permissionDenied, 
        t.home.onlyTechniciansCanAdd, 
        [{ text: t.actions.confirm }]
      );
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }
    const { pondName, pondArea, blockId } = formData;

    if (!pondName || !pondArea) {
      Alert.alert(t.messages.error, t.home.fillAllFields);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }
    const selectedBlock = availableEnterpriseBlocks.find((block) => block.id === blockId);
    if (isEnterpriseFarm && !selectedBlock) {
      Alert.alert(t.messages.error, availableEnterpriseBlocks.length === 0
        ? t.enterprise.noAssignedBlocks
        : t.enterprise.blockRequired);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const pondKey = getPhysicalPondKey(pondName);
    const alreadyExists = physicalPonds.some((pond) => getPhysicalPondKey(pond.pondName) === pondKey) ||
      ponds.some((pond) => getPhysicalPondKey(pond.pondName) === pondKey);
    if (alreadyExists) {
      Alert.alert(t.messages.error, `${pondName} already exists. Use Add Cycle to start production for this pond.`);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    try {
      await createPhysicalPondOnServer({
        id: Date.now().toString(),
        pondName,
        pondArea: Number(pondArea),
        blockId: selectedBlock?.id,
        blockName: selectedBlock?.name,
        status: 'idle',
      });
      closeModal();
      setCycleFilter('inactive');
      Alert.alert(t.messages.success, t.home.pondAddedSuccess);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add pond.';
      Alert.alert(t.messages.error, message.includes('plan allows')
        ? `${message}\n\nThe company owner can manage the plan on the Shrimply website.`
        : message);
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }, [availableEnterpriseBlocks, canManagePonds, closeModal, createPhysicalPondOnServer, formData, isEnterpriseFarm, physicalPonds, ponds, t]);

  const handleAddCycle = useCallback(() => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setIsSubmitting(true);

    if (!canManagePonds || !canManageFarmCycle) {
      Alert.alert(t.home.permissionDenied, t.home.onlyTechniciansCanAdd, [{ text: t.actions.confirm }]);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }
    const {
      cyclePondId,
      density,
      docStart,
      supplier,
      plValue,
      cycleStartMode,
      baselineMbw,
      baselineEstimatedPopulation,
      baselineSurvivalRate,
      baselineCumulativeFeed,
    } = formData;

    const isCreatingNewCycle = !isEnterpriseFarm && (formData.cycleTargetMode === 'new' || openAccessibleFarmCycles.length === 0);
    const docStartString = formatLocalDateKey(docStart);

    let selectedFarmCycle: FarmCycle | undefined;
    if (isCreatingNewCycle) {
      const cycleName = formData.newCycleName?.trim() || `Cycle ${cycles.length + 1}`;
      selectedFarmCycle = addFarmCycle({
        cycleName,
        status: 'active',
        plannedStartDate: docStartString,
        stockingStartDate: docStartString,
        stockingEndDate: docStartString,
      });
    } else {
      selectedFarmCycle = cycles.find((cycle) => cycle.id === formData.cycleId) || activeFarmCycle;
    }

    if (isEnterpriseFarm && !selectedFarmCycle) {
      Alert.alert(t.farmCycle.noActiveCycle, t.enterprise.ownerMustStartCycle);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const sourcePond = startablePondOptions.find((pond) => pond.id === cyclePondId);
    if (!sourcePond || !density || !supplier || !plValue) {
      Alert.alert(t.messages.error, t.home.fillAllFields);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    if (activePhysicalPondNames.has(getPhysicalPondKey(sourcePond.pondName))) {
      Alert.alert(t.messages.error, t.farmCycle.activeDuplicateMessage.replace('{{pondName}}', sourcePond.pondName));
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }
    const selectedCycleBlockIds = selectedFarmCycle?.blockIds?.length
      ? selectedFarmCycle.blockIds
      : selectedFarmCycle?.blockId
        ? [selectedFarmCycle.blockId]
        : [];
    if (selectedCycleBlockIds.length > 0 && (!sourcePond.blockId || !selectedCycleBlockIds.includes(sourcePond.blockId))) {
      Alert.alert(t.messages.error, t.enterpriseCycle.pondBlockMismatch);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }
    if (!selectedFarmCycle?.blockIds?.length && selectedFarmCycle?.plannedPondIds?.length && !selectedFarmCycle.plannedPondIds.includes(sourcePond.id)) {
      Alert.alert(t.messages.error, t.enterpriseCycle.pondCycleMismatch);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const isMidcycle = cycleStartMode === 'midcycle';
    const baselineMbwValue = parseFloat(baselineMbw);
    const baselinePopulationValue = parseFloat(baselineEstimatedPopulation);
    const baselineSurvivalValue = parseFloat(baselineSurvivalRate);
    const baselineFeedValue = parseFloat(baselineCumulativeFeed);
    const baselineDate = new Date();
    const baselineDocValue = isMidcycle ? calculateDocFromDates(docStart, baselineDate) : 0;

    if (isMidcycle && (!baselineMbw || Number.isNaN(baselineMbwValue) || baselineMbwValue <= 0)) {
      Alert.alert(t.messages.error, t.midcycleOnboarding.baselineMbwRequired);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    if (isMidcycle && (!Number.isFinite(baselineDocValue) || baselineDocValue < 0)) {
      Alert.alert(t.messages.error, t.midcycleOnboarding.baselineDateInvalid);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const baselineDateString = formatLocalDateKey(baselineDate);
    const baselineSampling = isMidcycle ? [{
      id: `baseline-${Date.now()}`,
      date: baselineDateString,
      mbw: baselineMbwValue,
      mortality: 0,
      feed: Number.isNaN(baselineFeedValue) ? 0 : baselineFeedValue,
      isBaselineEstimate: true,
      source: 'midcycle_onboarding',
      ...(Number.isNaN(baselinePopulationValue) ? {} : { estimatedPopulation: baselinePopulationValue }),
      ...(Number.isNaN(baselineSurvivalValue) ? {} : { estimatedSurvivalRate: baselineSurvivalValue }),
      ...(Number.isNaN(baselineFeedValue) ? {} : { cumulativeFeedToDate: baselineFeedValue }),
      ...(selectedFarmCycle?.id ? { cycleId: selectedFarmCycle.id } : {}),
      ...(selectedFarmCycle?.cycleName ? { cycleName: selectedFarmCycle.cycleName } : {}),
    }] : [];

    const added = addPond({
      id: Date.now().toString(),
      pondName: sourcePond.pondName,
      blockId: sourcePond.blockId,
      blockName: sourcePond.blockName,
      supplier,
      plSupplier: supplier,
      pondArea: sourcePond.pondArea,
      density: Number(density),
      initialPopulation: sourcePond.pondArea * Number(density),
      docStart: docStartString,
      initialWeight: convertPlToGrams(plValue),
      samplings: baselineSampling,
      mortalityRecords: [],
      totalHarvestedBiomass: 0,
      totalHarvestedPopulation: 0,
      totalHarvestedFeed: 0,
      physicalPondId: sourcePond.id,
      cycleId: selectedFarmCycle?.id,
      cycleName: selectedFarmCycle?.cycleName,
      cycleStatus: 'active',
      cycleStartedAt: docStartString,
      cycleStartMode,
      previousCyclePondId: sourcePond.id,
      ...(isMidcycle && {
        baselineDate: baselineDateString,
        baselineDoc: baselineDocValue,
        baselineMbw: baselineMbwValue,
        baselineEstimatedPopulation: Number.isNaN(baselinePopulationValue) ? undefined : baselinePopulationValue,
        baselineSurvivalRate: Number.isNaN(baselineSurvivalValue) ? undefined : baselineSurvivalValue,
        baselineCumulativeFeed: Number.isNaN(baselineFeedValue) ? undefined : baselineFeedValue,
        baselineSource: 'user_midcycle_estimate',
      }),
    });
    if (!added) {
      Alert.alert(t.messages.error, 'Could not start this pond. Sync the farm and check its physical pond link before trying again.');
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }
    if (selectedFarmCycle && !isCreatingNewCycle) {
      const stockingDates = [selectedFarmCycle.stockingStartDate, selectedFarmCycle.stockingEndDate, docStartString]
        .filter((date): date is string => Boolean(date))
        .sort();
      updateFarmCycle(selectedFarmCycle.id, {
        status: 'stocking',
        stockingStartDate: stockingDates[0],
        stockingEndDate: stockingDates[stockingDates.length - 1],
      });
    }

    if (selectedFarmCycle) {
      setSelectedDashboardCycleId(selectedFarmCycle.id);
    }

    closeModal();
    setCycleFilter('active');
    Alert.alert(t.messages.success, t.farmCycle.cycleStartedSuccess.replace('{{pondName}}', sourcePond.pondName));
  }, [activeFarmCycle, activePhysicalPondNames, addFarmCycle, addPond, calculateDocFromDates, canManageFarmCycle, canManagePonds, closeModal, convertPlToGrams, cycles, formData, formatLocalDateKey, isEnterpriseFarm, openAccessibleFarmCycles.length, startablePondOptions, t, updateFarmCycle]);

  const handleAddSamplingData = useCallback(() => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setIsSubmitting(true);

    if (!canRecordPondData) {
      Alert.alert(t.home.permissionDenied, t.home.onlyTechniciansCanAdd, [{ text: t.actions.confirm }]);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }
    
    const { selectedPond, mbw, feed, samplingDate } = formData;
    if (!selectedPond || !mbw) {
      Alert.alert(t.messages.error, t.home.fillAllFields);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }
    
    const selectedPondData = activePonds.find(p => p.pondName === selectedPond);
    if (!selectedPondData) {
      Alert.alert(t.messages.error, t.home.pondNotFound);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }
    
    addSampling(selectedPondData.id, {
      id: Date.now().toString(), 
      mbw: parseNumericInput(mbw),
      mortality: 0,
      feed: parseNumericInput(feed),
      date: formatLocalDateKey(samplingDate),
      // No feedData here - sampling doesn't deduct from inventory
    });
    
    closeModal();
    Alert.alert(t.messages.success, t.home.samplingAddedSuccess);
  }, [canRecordPondData, closeModal, formData, activePonds, addSampling, parseNumericInput, formatLocalDateKey, t]);

  const handleAddMortalityRecord = useCallback(() => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setIsSubmitting(true);

    if (!canRecordPondData || !user?.uid) {
      Alert.alert(t.home.permissionDenied, t.home.onlyTechniciansCanAddMortality, [{ text: t.actions.confirm }]);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const {
      selectedPond,
      mortalityObservationType,
      mortalityCount,
      siponShift,
      siphonedCount,
      mortalCount,
      mortalityDate,
      mortalityNotes,
    } = formData;
    const selectedPondData = activePonds.find((pond) => pond.pondName === selectedPond);
    if (!selectedPondData) {
      Alert.alert(t.messages.error, t.home.pondNotFound);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const siphoned = Number(String(siphonedCount).trim().replace(',', '.')) || 0;
    const mortal = Number(String(mortalCount).trim().replace(',', '.')) || 0;
    const count = mortalityObservationType === 'none_observed'
      ? 0
      : mortalityObservationType === 'observed_recovered'
        ? siphoned + mortal
        : Number(String(mortalityCount).trim().replace(',', '.'));
    if (mortalityObservationType !== 'none_observed' && (!Number.isInteger(count) || count <= 0)) {
      Alert.alert(t.messages.error, t.home.mortalityPositiveCountRequired);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const dateKey = formatLocalDateKey(mortalityDate);
    const todayKey = getFarmDateKey(new Date(), company?.timeZone);
    const cycleStartKey = String(selectedPondData.cycleStartedAt || selectedPondData.docStart || '').slice(0, 10);
    if (dateKey > todayKey) {
      Alert.alert(t.messages.error, t.home.mortalityFutureDateError);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }
    if (cycleStartKey && dateKey < cycleStartKey) {
      Alert.alert(t.messages.error, t.home.mortalityBeforeCycleError);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const mbwAtRecord = [...(selectedPondData.samplings || [])]
      .filter((sampling) => sampling.date <= dateKey && Number(sampling.mbw) > 0)
      .sort((first, second) => second.date.localeCompare(first.date))[0]?.mbw;
    addMortalityRecord(selectedPondData.id, {
      id: `mortality-${Date.now()}`,
      date: dateKey,
      observationType: mortalityObservationType,
      count,
      ...(mortalityObservationType === 'observed_recovered' ? {
        siponShift,
        siphonedCount: siphoned,
        mortalCount: mortal,
      } : {}),
      mbwAtRecord: Number(mbwAtRecord) > 0 ? Number(mbwAtRecord) : undefined,
      notes: mortalityNotes.trim() || undefined,
      recordedAt: new Date().toISOString(),
      recordedBy: user.uid,
      cycleId: selectedPondData.cycleId,
      cycleName: selectedPondData.cycleName,
      pondCycleId: selectedPondData.pondCycleId || selectedPondData.id,
    });

    closeModal();
    Alert.alert(t.messages.success, t.home.mortalitySavedSuccess);
  }, [activePonds, addMortalityRecord, canRecordPondData, closeModal, company?.timeZone, formData, formatLocalDateKey, t, user?.uid]);

  const handleEndPondCycle = useCallback((pond: Pond) => {
    if (!canManagePonds) {
      Alert.alert(
        t.home.permissionDenied, 
        t.home.onlyTechniciansCanDelete, 
        [{ text: t.actions.confirm }]
      );
      return;
    }

    if (!isPondCycleActive(pond)) {
      Alert.alert(t.farmCycle.pondAlreadyEndedTitle, t.farmCycle.pondAlreadyEndedMessage.replace('{{pondName}}', pond.pondName));
      return;
    }

    const goToHarvest = () => router.push('/harvest');
    const endCycle = (reason: PondCycleEndReason) => {
      if (reason === 'harvested' && !hasFinalHarvestForPondCycle(harvestRecords, pond)) {
        Alert.alert(
          t.farmCycle.finalHarvestRequiredTitle,
          t.farmCycle.finalHarvestRequiredMessage.replace('{{pondNames}}', pond.pondName),
          [
            { text: t.actions.cancel, style: 'cancel' },
            { text: t.farmCycle.goToHarvest, onPress: goToHarvest },
          ]
        );
        return;
      }
      const today = getFarmDateKey(new Date(), company?.timeZone);
      endPondCycle(pond.id, today, reason, user?.uid);
      Alert.alert(t.messages.success, t.farmCycle.pondEndedSuccess.replace('{{pondName}}', pond.pondName));
    };
    const chooseNonHarvestReason = () => {
      Alert.alert(
        t.farmCycle.endCycleTitle,
        t.farmCycle.endPondCycleMessage.replace('{{pondName}}', pond.pondName),
        [
          { text: t.actions.cancel, style: 'cancel' },
          { text: t.farmCycle.reasons.disease, onPress: () => endCycle('disease') },
          { text: t.farmCycle.reasons.resetOther, onPress: () => endCycle('other') },
        ]
      );
    };

    Alert.alert(
      t.farmCycle.endCycleTitle,
      t.farmCycle.endPondCycleMessage.replace('{{pondName}}', pond.pondName),
      [
        { text: t.actions.cancel, style: 'cancel' },
        { text: t.farmCycle.reasons.harvested, onPress: () => endCycle('harvested') },
        { text: t.farmCycle.reasons.nonHarvest, onPress: chooseNonHarvestReason },
      ]
    );
  }, [canManagePonds, company?.timeZone, endPondCycle, harvestRecords, router, t, user?.uid]);

  const handleDeletePond = useCallback((pond: Pond) => {
    if (!canManagePonds) {
      Alert.alert(
        t.home.permissionDenied,
        t.home.onlyTechniciansCanDelete,
        [{ text: t.actions.confirm }]
      );
      return;
    }

    if (isPondCycleActive(pond)) {
      Alert.alert(
        t.farmCycle.endCycleTitle,
        t.farmCycle.endPondCycleMessage.replace('{{pondName}}', pond.pondName),
        [{ text: t.actions.confirm }]
      );
      return;
    }

    Alert.alert(
      t.home.deletePond,
      `${t.messages.deletePondConfirm} ${pond.pondName}? ${t.messages.deletePondWarning}`,
      [
        { text: t.actions.cancel, style: 'cancel' },
        {
          text: t.actions.delete,
          style: 'destructive',
          onPress: () => {
            deletePond(pond.id);
            Alert.alert(t.messages.success, t.home.pondDeletedSuccess);
          },
        },
      ]
    );
  }, [canManagePonds, deletePond, t]);

  const handleDeletePhysicalPond = useCallback((pond: PhysicalPond) => {
    if (!canManagePonds) {
      Alert.alert(
        t.home.permissionDenied,
        t.home.onlyTechniciansCanDelete,
        [{ text: t.actions.confirm }]
      );
      return;
    }

    if (!company?.id) {
      Alert.alert(t.messages.error, t.messages.dataNotFound);
      return;
    }

    if (pond.status === 'active' || pond.activePondId) {
      Alert.alert(
        t.farmCycle.endCycleTitle,
        t.farmCycle.endPondCycleMessage.replace('{{pondName}}', pond.pondName),
        [{ text: t.actions.confirm }]
      );
      return;
    }

    const persistDeletePhysicalPond = async () => {
      try {
        deletePhysicalPond(pond.id);
        Alert.alert(t.messages.success, t.home.pondDeletedSuccess);
      } catch (error) {
        console.error('Failed to delete physical pond:', error);
        Alert.alert(t.messages.error, t.messages.networkError);
      }
    };

    Alert.alert(
      t.home.deletePond,
      `${t.messages.deletePondConfirm} ${pond.pondName}?`,
      [
        { text: t.actions.cancel, style: 'cancel' },
        {
          text: t.actions.delete,
          style: 'destructive',
          onPress: () => {
            void persistDeletePhysicalPond();
          },
        },
      ]
    );
  }, [canManagePonds, company?.id, deletePhysicalPond, t]);

  const handleRenameFarmCycle = useCallback(() => {
    if (!activeFarmCycle || !canManageFarmCycle) return;
    const nextName = cycleNameDraft.trim();
    if (!nextName) {
      Alert.alert(t.messages.error, t.farmCycle.cycleNameRequired);
      return;
    }

    updateFarmCycle(activeFarmCycle.id, { cycleName: nextName });
    Alert.alert(t.messages.success, t.farmCycle.cycleNameUpdated);
  }, [activeFarmCycle, canManageFarmCycle, cycleNameDraft, t, updateFarmCycle]);

  const handleCloseFarmCycle = useCallback(() => {
    if (!activeFarmCycle || !canManageFarmCycle) return;

    const missingFinalHarvestPonds = activeCyclePonds.filter((pond) =>
      !hasFinalHarvestForPondCycle(harvestRecords, pond)
    );
    if (missingFinalHarvestPonds.length > 0) {
      Alert.alert(
        t.farmCycle.finalHarvestRequiredTitle,
        t.farmCycle.finalHarvestRequiredMessage.replace(
          '{{pondNames}}',
          missingFinalHarvestPonds.map((pond) => pond.pondName).join(', ')
        ),
        [
          { text: t.actions.cancel, style: 'cancel' },
          { text: t.farmCycle.goToHarvest, onPress: () => router.push('/harvest') },
        ]
      );
      return;
    }

    const today = getFarmDateKey(new Date(), company?.timeZone);
    const reportCycleId = activeFarmCycle.id;
    const canViewCycleReport = ['owner', 'co-owner', 'manager', 'admin'].includes(user?.role || '');
    Alert.alert(
      t.farmCycle.endCycleTitle,
      t.farmCycle.endFarmCycleMessage
        .replace('{{cycleName}}', activeFarmCycle.cycleName)
        .replace('{{pondCount}}', String(currentCyclePonds.length)),
      [
        { text: t.actions.cancel, style: 'cancel' },
        {
          text: t.farmCycle.endCycleAction,
          style: 'destructive',
          onPress: async () => {
            try {
              closeFarmCycle(activeFarmCycle.id, today, { endedBy: user?.uid });
              setCycleFilter('ended');
              setCycleManagerExpanded(false);
              Alert.alert(
                t.messages.success,
                t.farmCycle.endFarmCycleSuccess.replace('{{cycleName}}', activeFarmCycle.cycleName),
                canViewCycleReport
                  ? [
                      { text: t.farmCycle.later, style: 'cancel' },
                      {
                        text: t.farmCycle.viewCycleReport,
                        onPress: () => router.push({ pathname: '/cycle-report', params: { cycleId: reportCycleId } }),
                      },
                    ]
                  : [{ text: t.actions.confirm }]
              );
            } catch (error) {
              console.error('Failed to persist farm cycle close:', error);
              Alert.alert(t.messages.error, t.farmCycle.endCycleFailed);
            }
          },
        },
      ]
    );
  }, [activeCyclePonds, activeFarmCycle, canManageFarmCycle, closeFarmCycle, company?.timeZone, currentCyclePonds, harvestRecords, router, t, user?.role, user?.uid]);

  const handleSaveEnterpriseProductionCycle = useCallback((input: {
    cycle?: FarmCycle;
    cycleName: string;
    block: FarmBlock;
    plannedStartDate: string;
    cycleStartMode: 'new' | 'midcycle';
    ponds: {
      pond: PhysicalPond;
      stockingDate: string;
      density: number;
      supplier: string;
      baselineMbw?: number;
      baselineEstimatedPopulation?: number;
      baselineSurvivalRate?: number;
      baselineCumulativeFeed?: number;
    }[];
  }) => {
    const stockingRange = getEnterpriseStockingDateRange([
      input.cycle?.stockingStartDate,
      input.cycle?.stockingEndDate,
      ...input.ponds.map((pond) => pond.stockingDate),
    ]);
    const cycle = input.cycle || addFarmCycle({
      cycleName: input.cycleName,
      status: 'active',
      blockIds: [input.block.id],
      blockNames: [input.block.name],
      plannedStartDate: input.plannedStartDate,
      stockingStartDate: stockingRange.stockingStartDate,
      stockingEndDate: stockingRange.stockingEndDate,
    });
    if (input.cycle) {
      updateFarmCycle(cycle.id, {
        status: 'active',
        stockingStartDate: stockingRange.stockingStartDate,
        stockingEndDate: stockingRange.stockingEndDate,
      });
    }
    const startedAt = Date.now();
    const baselineDate = getFarmDateKey(new Date(), company?.timeZone);
    input.ponds.forEach(({ pond, stockingDate, density, supplier, baselineMbw, baselineEstimatedPopulation, baselineSurvivalRate, baselineCumulativeFeed }, index) => {
      const pondCycleId = `${startedAt}-${index}`;
      const baselineDoc = differenceInFarmCalendarDays(baselineDate, stockingDate);
      const baselineSampling = input.cycleStartMode === 'midcycle' && baselineMbw ? [{
        id: `baseline-${startedAt}-${index}`,
        date: baselineDate,
        mbw: baselineMbw,
        mortality: 0,
        feed: baselineCumulativeFeed ?? 0,
        isBaselineEstimate: true,
        source: 'midcycle_onboarding',
        ...(baselineEstimatedPopulation === undefined ? {} : { estimatedPopulation: baselineEstimatedPopulation }),
        ...(baselineSurvivalRate === undefined ? {} : { estimatedSurvivalRate: baselineSurvivalRate }),
        ...(baselineCumulativeFeed === undefined ? {} : { cumulativeFeedToDate: baselineCumulativeFeed }),
        cycleId: cycle.id,
        cycleName: cycle.cycleName,
        pondCycleId,
      }] : [];
      const added = addPond({
        id: pondCycleId,
        pondName: pond.pondName,
        pondArea: pond.pondArea,
        blockId: input.block.id,
        blockName: input.block.name,
        density,
        initialPopulation: pond.pondArea * density,
        docStart: stockingDate,
        supplier,
        plSupplier: supplier,
        initialWeight: 0.5,
        samplings: baselineSampling,
        mortalityRecords: [],
        totalHarvestedBiomass: 0,
        totalHarvestedPopulation: 0,
        totalHarvestedFeed: 0,
        physicalPondId: pond.id,
        previousCyclePondId: pond.id,
        cycleId: cycle.id,
        cycleName: cycle.cycleName,
        pondCycleId,
        cycleStatus: 'active',
        cycleStartedAt: stockingDate,
        cycleStartMode: input.cycleStartMode,
        ...(input.cycleStartMode === 'midcycle' && baselineMbw ? {
          baselineDate,
          baselineDoc,
          baselineMbw,
          baselineEstimatedPopulation,
          baselineSurvivalRate,
          baselineCumulativeFeed,
          baselineSource: 'user_midcycle_estimate',
        } : {}),
      });
      if (!added) throw new Error('Could not start this pond. Sync the farm and check its physical pond link before trying again.');
    });
  }, [addFarmCycle, addPond, company?.timeZone, updateFarmCycle]);

  const handleCreateEnterprisePhysicalPond = useCallback(async (input: {
    pondName: string;
    pondArea: number;
    block: FarmBlock;
  }) => {
    const pondKey = getPhysicalPondKey(input.pondName);
    const alreadyExists = physicalPonds.some((pond) => getPhysicalPondKey(pond.pondName) === pondKey)
      || ponds.some((pond) => getPhysicalPondKey(pond.pondName) === pondKey);
    if (alreadyExists) throw new Error(`${input.pondName} already exists.`);

    const id = Date.now().toString();
    await createPhysicalPondOnServer({
      id,
      pondName: input.pondName,
      pondArea: input.pondArea,
      blockId: input.block.id,
      blockName: input.block.name,
      status: 'idle',
    });
  }, [createPhysicalPondOnServer, physicalPonds, ponds]);

  const handleEditEnterpriseCycle = useCallback((cycle: FarmCycle, input: { cycleName: string; blocks: FarmBlock[] }) => {
    updateFarmCycle(cycle.id, {
      cycleName: input.cycleName,
      blockIds: input.blocks.map((block) => block.id),
      blockNames: input.blocks.map((block) => block.name),
    });
  }, [updateFarmCycle]);

  const handleCloseEnterpriseBlockCycle = useCallback((cycle: FarmCycle) => {
    const activePondsForCycle = ponds.filter((pond) => pond.cycleId === cycle.id && isPondCycleActive(pond));
    if (activePondsForCycle.length > 0) {
      Alert.alert(
        t.farmCycle.endCycleTitle,
        `End the active pond cycles first: ${activePondsForCycle.map((pond) => pond.pondName).join(', ')}`,
      );
      return;
    }
    updateFarmCycle(cycle.id, {
      status: 'closed',
      closedAt: getFarmDateKey(new Date(), company?.timeZone),
    });
  }, [company?.timeZone, ponds, t.farmCycle.endCycleTitle, updateFarmCycle]);

  const openModal = useCallback((type: 'pond' | 'sampling' | 'mortality' | 'cycle' | 'baseline') => {
    if (type === 'pond' && isEnterpriseFarm && availableEnterpriseBlocks.length === 1) {
      setFormData((current) => ({ ...current, blockId: availableEnterpriseBlocks[0].id }));
    }
    if (type === 'cycle') {
      const nextCycleNumber = cycles.length + 1;
      setFormData((current) => ({
        ...current,
        cycleTargetMode: openAccessibleFarmCycles.length > 0 ? 'existing' : 'new',
        cycleId: current.cycleId || activeFarmCycle?.id || openAccessibleFarmCycles[0]?.id || '',
        newCycleName: `Cycle ${nextCycleNumber}`,
      }));
    }
    setModalType(type); 
    setMenuModalVisible(false); 
    setModalVisible(true);
  }, [activeFarmCycle?.id, availableEnterpriseBlocks, cycles.length, isEnterpriseFarm, openAccessibleFarmCycles]);

  const openBaselineEditModal = useCallback((pond: Pond) => {
    const baselineSampling = (pond.samplings || [])
      .filter(isBaselineSampling)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const baselineDate = pond.baselineDate || baselineSampling?.date || getFarmDateKey(new Date(), company?.timeZone);

    setEditingBaselinePondId(pond.id);
    setFormData((prev) => ({
      ...prev,
      baselineDate: normalizeDateValue(new Date(baselineDate)),
      baselineMbw: String(pond.baselineMbw ?? baselineSampling?.mbw ?? ''),
      baselineEstimatedPopulation: String(pond.baselineEstimatedPopulation ?? baselineSampling?.estimatedPopulation ?? ''),
      baselineSurvivalRate: String(pond.baselineSurvivalRate ?? baselineSampling?.estimatedSurvivalRate ?? ''),
      baselineCumulativeFeed: String(pond.baselineCumulativeFeed ?? baselineSampling?.cumulativeFeedToDate ?? baselineSampling?.feed ?? ''),
    }));
    setModalType('baseline');
    setModalVisible(true);
  }, [company?.timeZone, normalizeDateValue]);

  const handleUpdateBaseline = useCallback(() => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setIsSubmitting(true);

    if (!canRecordPondData) {
      Alert.alert(t.home.permissionDenied, t.home.onlyTechniciansCanAdd, [{ text: t.actions.confirm }]);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const pond = accessiblePonds.find((item) => item.id === editingBaselinePondId);
    if (!pond) {
      Alert.alert(t.messages.error, t.messages.error);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const cycleStartDate = normalizeDateValue(pond.docStart || pond.cycleStartedAt || formData.baselineDate);
    const baselineDocValue = calculateDocFromDates(cycleStartDate, formData.baselineDate);
    const baselineMbwValue = parseFloat(formData.baselineMbw);
    const baselinePopulationValue = parseFloat(formData.baselineEstimatedPopulation);
    const baselineSurvivalValue = parseFloat(formData.baselineSurvivalRate);
    const baselineFeedValue = parseFloat(formData.baselineCumulativeFeed);

    if (!formData.baselineMbw || Number.isNaN(baselineMbwValue) || baselineMbwValue <= 0) {
      Alert.alert(t.messages.error, t.midcycleOnboarding.baselineMbwRequired);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    if (!Number.isFinite(baselineDocValue) || baselineDocValue < 0) {
      Alert.alert(t.messages.error, t.midcycleOnboarding.baselineDateInvalid);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const baselineDateString = formatLocalDateKey(formData.baselineDate);
    const docStartString = formatLocalDateKey(cycleStartDate);
    const baselineSamplingIndex = (pond.samplings || []).findIndex(isBaselineSampling);
    const existingBaseline = baselineSamplingIndex >= 0 ? pond.samplings[baselineSamplingIndex] : undefined;
    const baselineSampling: Sampling = {
      id: existingBaseline?.id || `baseline-${Date.now()}`,
      date: baselineDateString,
      mbw: baselineMbwValue,
      mortality: 0,
      feed: Number.isNaN(baselineFeedValue) ? 0 : baselineFeedValue,
      isBaselineEstimate: true,
      source: 'midcycle_onboarding',
      cycleId: pond.cycleId,
      cycleName: pond.cycleName,
      pondCycleId: pond.pondCycleId || pond.id,
      ...(Number.isNaN(baselinePopulationValue) ? {} : { estimatedPopulation: baselinePopulationValue }),
      ...(Number.isNaN(baselineSurvivalValue) ? {} : { estimatedSurvivalRate: baselineSurvivalValue }),
      ...(Number.isNaN(baselineFeedValue) ? {} : { cumulativeFeedToDate: baselineFeedValue }),
    };
    const samplings = baselineSamplingIndex >= 0
      ? pond.samplings.map((sampling, index) => index === baselineSamplingIndex ? baselineSampling : sampling)
      : [baselineSampling, ...(pond.samplings || [])];

    updatePond(pond.id, {
      docStart: docStartString,
      cycleStartedAt: docStartString,
      cycleStartMode: 'midcycle',
      baselineDate: baselineDateString,
      baselineDoc: baselineDocValue,
      baselineMbw: baselineMbwValue,
      baselineEstimatedPopulation: Number.isNaN(baselinePopulationValue) ? undefined : baselinePopulationValue,
      baselineSurvivalRate: Number.isNaN(baselineSurvivalValue) ? undefined : baselineSurvivalValue,
      baselineCumulativeFeed: Number.isNaN(baselineFeedValue) ? undefined : baselineFeedValue,
      baselineSource: 'user_midcycle_estimate',
      samplings,
    });

    setEditingBaselinePondId(null);
    closeModal();
    Alert.alert(t.messages.success, t.midcycleOnboarding.baselineUpdated);
  }, [accessiblePonds, calculateDocFromDates, canRecordPondData, closeModal, editingBaselinePondId, formData, formatLocalDateKey, normalizeDateValue, t, updatePond]);

  const PondCard = useMemo(() => React.memo(function PondCardItem({ pond }: { pond: Pond }) {
    const metrics = calculateMetrics(pond);
    const lastADG = getLastADG(pond.id);

    return (
      <TouchableOpacity 
        style={styles.pondCard} 
        onPress={() => router.push({ 
          pathname: '/ponddetails', 
          params: { pondId: pond.id } 
        })}
      >
        <View style={styles.pondHeader}>
          <View style={styles.pondTitleGroup}>
            <Text style={styles.pondName}>{pond.pondName}</Text>
            {pond.cycleStartMode === 'midcycle' && (
              <Text style={styles.midcycleBadgeText}>{t.midcycleOnboarding.importedMidcycle}</Text>
            )}
          </View>
          <View style={styles.headerRight}>
            <View style={[
              styles.docBadge, 
              { backgroundColor: getDOCColor(metrics.doc) }
            ]}>
              <Text style={styles.docText}>
                {t.shrimp.doc} {metrics.doc}
              </Text>
            </View>
            {canEditPonds && (
              <>
                {pond.cycleStartMode === 'midcycle' && isPondCycleActive(pond) && (
                  <TouchableOpacity
                    style={styles.baselineEditButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      openBaselineEditModal(pond);
                    }}
                  >
                    <Ionicons name="create-outline" size={18} color="#0F4C75" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleEndPondCycle(pond);
                  }}
                >
                  <Ionicons name={isPondCycleActive(pond) ? "archive-outline" : "time-outline"} size={18} color={isPondCycleActive(pond) ? "#315f57" : "#6b8aa0"} />
                </TouchableOpacity>
                {!isPondCycleActive(pond) && (
                  <TouchableOpacity
                    style={styles.deletePondButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeletePond(pond);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${t.home.deletePond} ${pond.pondName}`}
                  >
                    <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>

        <View style={styles.pondDetails}>
          <View style={styles.detailRow}>
            <DetailItem 
              iconName="scale-outline" 
              label={t.shrimp.biomass} 
              value={`${metrics.totalBiomass.toFixed(1)} kg`} 
            />
            <DetailItem 
              label={t.shrimp.population} 
              value={metrics.currentPopulation.toLocaleString()} 
              isShrimp 
            />
          </View>
          <View style={styles.detailRow}>
            <DetailItem 
              iconName="pulse-outline" 
              label={t.shrimp.survivalRate.replace(' (%)', '')} 
              value={`${metrics.sr}%`} 
            />
            <DetailItem 
              iconName="resize-outline" 
              label={t.shrimp.size} 
              value={`${metrics.size} pcs/kg`} 
            />
          </View>
          <View style={styles.detailRow}>
            <DetailItem 
              iconName="trending-up-outline" 
              label={t.shrimp.adg} 
              value={`${lastADG.toFixed(2)} g/day`} 
            />
            <DetailItem 
              iconName="stats-chart-outline" 
              label={t.shrimp.fcr} 
              value={`${metrics.fcr}`} 
            />
          </View>
          <View style={styles.detailRow}>
            {(pond.totalHarvestedBiomass || 0) > 0 && (
              <DetailItem 
                iconName="archive-outline" 
                label={t.shrimp.harvested} 
                value={`${(pond.totalHarvestedBiomass || 0).toFixed(1)} kg`} 
              />
            )}
            <DetailItem 
              iconName="business-outline" 
              label={t.forms.supplier} 
              value={getPondPlSupplier(pond)} 
            />
            {(pond.totalHarvestedBiomass || 0) === 0 && <DetailItem />}
          </View>
        </View>

        <View style={styles.startDateContainer}>
          <Ionicons name="calendar-outline" size={14} color="#dce8f2" />
          <Text style={styles.startDate}>
            {t.shrimp.started}: {new Date(pond.docStart).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }), [
    calculateMetrics, 
    getLastADG, 
    getDOCColor, 
    handleEndPondCycle, 
    handleDeletePond,
    openBaselineEditModal,
    router, 
    canEditPonds, 
    t
  ]);

  const renderPondForm = useMemo(() => (
    <>
      <Text style={styles.inputHint}>
        {t.enterpriseCycle.addPhysicalPondHint}
      </Text>
      {isEnterpriseFarm && (
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t.enterprise.selectBlock}</Text>
          {availableEnterpriseBlocks.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pondSelector}>
              {availableEnterpriseBlocks.map((block) => (
                <TouchableOpacity
                  key={block.id}
                  style={[styles.pondOption, formData.blockId === block.id && styles.pondOptionSelected]}
                  onPress={() => updateForm('blockId', block.id)}
                >
                  <Text style={[styles.pondOptionText, formData.blockId === block.id && styles.pondOptionTextSelected]}>
                    {block.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.inputHint}>{t.enterprise.noAssignedBlocks}</Text>
          )}
        </View>
      )}
      <InputField 
        label={t.forms.pondName} 
        value={formData.pondName} 
        onChangeText={(value) => updateForm('pondName', value)} 
        placeholder={t.home.pondNamePlaceholder} 
      />
      <InputField 
        label={t.forms.pondSize} 
        value={formData.pondArea} 
        onChangeText={(value) => updateForm('pondArea', value)} 
        placeholder={t.home.pondAreaHint} 
        keyboardType="numeric" 
      />
    </>
  ), [availableEnterpriseBlocks, formData.blockId, formData.pondArea, formData.pondName, isEnterpriseFarm, updateForm, t]);

  const renderBaselineForm = useMemo(() => (
    <>
      <Text style={styles.inputHint}>
        {t.midcycleOnboarding.baselineEditHint}
      </Text>
      <View style={styles.inputContainer}>
        <AppDatePicker
          label={t.midcycleOnboarding.baselineDate}
          value={formData.baselineDate}
          onChange={(date) => updateForm('baselineDate', date)}
          cancelLabel={t.actions.cancel}
          confirmLabel={t.actions.confirm}
        />
      </View>
      <InputField
        label={t.midcycleOnboarding.currentMbw}
        value={formData.baselineMbw}
        onChangeText={(value) => updateForm('baselineMbw', value)}
        placeholder={t.midcycleOnboarding.currentMbwPlaceholder}
        keyboardType="numeric"
      />
      <InputField
        label={t.midcycleOnboarding.currentPopulation}
        value={formData.baselineEstimatedPopulation}
        onChangeText={(value) => updateForm('baselineEstimatedPopulation', value)}
        placeholder={t.midcycleOnboarding.currentPopulationPlaceholder}
        keyboardType="numeric"
      />
      <InputField
        label={t.midcycleOnboarding.survivalRate}
        value={formData.baselineSurvivalRate}
        onChangeText={(value) => updateForm('baselineSurvivalRate', value)}
        placeholder={t.midcycleOnboarding.survivalRatePlaceholder}
        keyboardType="numeric"
      />
      <InputField
        label={t.midcycleOnboarding.feedUsedSoFar}
        value={formData.baselineCumulativeFeed}
        onChangeText={(value) => updateForm('baselineCumulativeFeed', value)}
        placeholder={t.midcycleOnboarding.feedUsedSoFarPlaceholder}
        keyboardType="numeric"
        hint={t.midcycleOnboarding.feedUsedSoFarHint}
      />
    </>
  ), [formData, t, updateForm]);

  const renderSamplingForm = useMemo(() => (
    <>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{t.forms.selectPond}</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.pondSelector}
        >
          {activePonds.map(pond => (
            <TouchableOpacity 
              key={pond.id} 
              style={[
                styles.pondOption, 
                formData.selectedPond === pond.pondName && 
                styles.pondOptionSelected
              ]}
              onPress={() => updateForm('selectedPond', pond.pondName)}
            >
              <Text style={[
                styles.pondOptionText, 
                formData.selectedPond === pond.pondName && 
                styles.pondOptionTextSelected
              ]}>
                {pond.pondName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <InputField 
        label={t.shrimp.meanBodyWeight} 
        value={formData.mbw} 
        onChangeText={(value) => updateForm('mbw', value)} 
        placeholder={t.home.mbwHint} 
        keyboardType="numeric" 
      />
      <InputField 
        label={t.shrimp.feedAmount} 
        value={formData.feed} 
        onChangeText={(value) => updateForm('feed', value)} 
        placeholder={t.home.feedHint} 
        keyboardType="numeric" 
      />
      <View style={styles.inputContainer}>
        <AppDatePicker
          label={t.forms.samplingDate}
          value={formData.samplingDate}
          onChange={(date) => updateForm('samplingDate', date)}
          cancelLabel={t.actions.cancel}
          confirmLabel={t.actions.confirm}
        />
      </View>
    </>
  ), [formData, activePonds, updateForm, t]);

  const renderMortalityForm = useMemo(() => {
    const observationOptions: { value: MortalityObservationType; label: string }[] = [
      { value: 'estimated_total', label: t.home.mortalityEstimatedTotal },
      { value: 'observed_recovered', label: t.home.mortalityObservedRecovered },
      { value: 'none_observed', label: t.home.mortalityNoneObserved },
    ];
    const observationHint = formData.mortalityObservationType === 'estimated_total'
      ? t.home.mortalityEstimatedHint
      : formData.mortalityObservationType === 'observed_recovered'
        ? t.home.mortalityObservedHint
        : t.home.mortalityNoneHint;

    return (
      <>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t.forms.selectPond}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pondSelector}>
            {activePonds.map((pond) => (
              <TouchableOpacity
                key={pond.id}
                style={[
                  styles.pondOption,
                  formData.selectedPond === pond.pondName && styles.pondOptionSelected,
                ]}
                onPress={() => updateForm('selectedPond', pond.pondName)}
              >
                <Text style={[
                  styles.pondOptionText,
                  formData.selectedPond === pond.pondName && styles.pondOptionTextSelected,
                ]}>
                  {pond.pondName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t.home.mortalityObservationType}</Text>
          <View style={styles.mortalityOptionList}>
            {observationOptions.map((option) => {
              const selected = formData.mortalityObservationType === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.mortalityOption, selected && styles.mortalityOptionSelected]}
                  onPress={() => updateForm('mortalityObservationType', option.value)}
                >
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={selected ? '#FFFFFF' : '#315f57'}
                  />
                  <Text style={[styles.mortalityOptionText, selected && styles.mortalityOptionTextSelected]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.inputHint}>{observationHint}</Text>
        </View>

        {formData.mortalityObservationType === 'estimated_total' && (
          <InputField
            label={t.home.mortalityCount}
            value={formData.mortalityCount}
            onChangeText={(value) => updateForm('mortalityCount', value)}
            placeholder={t.home.mortalityHint}
            keyboardType="numeric"
            hint={t.home.mortalityCountHint}
            maxLength={12}
          />
        )}

        {formData.mortalityObservationType === 'observed_recovered' && (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t.dailyOperationsReports.siponShift}</Text>
              <View style={styles.segmentRow}>
                {(['morning', 'evening'] as const).map((shift) => (
                  <TouchableOpacity
                    key={shift}
                    style={[styles.segmentOption, formData.siponShift === shift && styles.segmentOptionSelected]}
                    onPress={() => updateForm('siponShift', shift)}
                  >
                    <Text style={[styles.segmentOptionText, formData.siponShift === shift && styles.segmentOptionTextSelected]}>
                      {shift === 'morning' ? t.dailyOperationsReports.morning : t.dailyOperationsReports.evening}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.inputGroup}>
                <InputField label={t.dailyOperationsReports.siphoned} value={formData.siphonedCount} onChangeText={(value) => updateForm('siphonedCount', value)} placeholder="0" keyboardType="numeric" maxLength={12} />
              </View>
              <View style={styles.inputGroup}>
                <InputField label={t.dailyOperationsReports.mortal} value={formData.mortalCount} onChangeText={(value) => updateForm('mortalCount', value)} placeholder="0" keyboardType="numeric" maxLength={12} />
              </View>
            </View>
          </>
        )}

        <View style={styles.inputContainer}>
          <AppDatePicker
            label={t.home.mortalityDate}
            value={formData.mortalityDate}
            onChange={(date) => updateForm('mortalityDate', date)}
            cancelLabel={t.actions.cancel}
            confirmLabel={t.actions.confirm}
          />
        </View>

        <InputField
          label={t.home.mortalityNotes}
          value={formData.mortalityNotes}
          onChangeText={(value) => updateForm('mortalityNotes', value)}
          placeholder={t.home.mortalityNotesHint}
          maxLength={500}
        />
      </>
    );
  }, [activePonds, formData.mortalCount, formData.mortalityCount, formData.mortalityDate, formData.mortalityNotes, formData.mortalityObservationType, formData.selectedPond, formData.siphonedCount, formData.siponShift, t, updateForm]);

  const renderCycleForm = useMemo(() => (
    <>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{t.farmCycle.existingPond}</Text>
        {startablePondOptions.length === 0 ? (
          <Text style={styles.inputHint}>
            Add a pond placeholder first, or end an active pond cycle before starting another cycle.
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pondSelector}
          >
            {startablePondOptions.map(pond => (
              <TouchableOpacity
                key={pond.id}
                style={[
                  styles.pondOption,
                  formData.cyclePondId === pond.id && styles.pondOptionSelected
                ]}
                onPress={() => updateForm('cyclePondId', pond.id)}
              >
                <Text style={[
                  styles.pondOptionText,
                  formData.cyclePondId === pond.id && styles.pondOptionTextSelected
                ]}>
                  {pond.pondName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
      {openAccessibleFarmCycles.length > 0 && !isEnterpriseFarm && (
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t.farmCycle.targetCycle}</Text>
          <View style={styles.segmentRow}>
            {(['existing', 'new'] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.segmentOption,
                  formData.cycleTargetMode === mode && styles.segmentOptionSelected
                ]}
                onPress={() => updateForm('cycleTargetMode', mode)}
              >
                <Text style={[
                  styles.segmentOptionText,
                  formData.cycleTargetMode === mode && styles.segmentOptionTextSelected
                ]}>
                  {mode === 'existing' ? t.farmCycle.addToActiveCycle : t.farmCycle.createNewCycle}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {formData.cycleTargetMode === 'existing' && openAccessibleFarmCycles.length > 0 && !isEnterpriseFarm ? (
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t.farmCycle.cycleName}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pondSelector}
          >
            {openAccessibleFarmCycles.map((cycle) => (
              <TouchableOpacity
                key={cycle.id}
                style={[
                  styles.pondOption,
                  (formData.cycleId === cycle.id || (!formData.cycleId && activeFarmCycle?.id === cycle.id)) && styles.pondOptionSelected
                ]}
                onPress={() => updateForm('cycleId', cycle.id)}
              >
                <Text style={[
                  styles.pondOptionText,
                  (formData.cycleId === cycle.id || (!formData.cycleId && activeFarmCycle?.id === cycle.id)) && styles.pondOptionTextSelected
                ]}>
                  {cycle.cycleName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : !isEnterpriseFarm ? (
        <InputField
          label={t.farmCycle.newCycleName}
          value={formData.newCycleName}
          onChangeText={(value) => updateForm('newCycleName', value)}
          placeholder={`Cycle ${cycles.length + 1}`}
        />
      ) : null}

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{t.midcycleOnboarding.cycleQuestion}</Text>
        <View style={styles.segmentRow}>
          {(['new', 'midcycle'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.segmentOption,
                formData.cycleStartMode === mode && styles.segmentOptionSelected
              ]}
              onPress={() => updateForm('cycleStartMode', mode)}
            >
              <Text style={[
                styles.segmentOptionText,
                formData.cycleStartMode === mode && styles.segmentOptionTextSelected
              ]}>
                {mode === 'new' ? t.midcycleOnboarding.newCycle : t.midcycleOnboarding.existingCycle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <InputField
        label={t.forms.density}
        value={formData.density}
        onChangeText={(value) => updateForm('density', value)}
        placeholder={t.home.densityHint}
        keyboardType="numeric"
      />
      <View style={styles.inputContainer}>
        <AppDatePicker
          label={t.forms.startDate}
          value={formData.docStart}
          onChange={(date) => updateForm('docStart', date)}
          cancelLabel={t.actions.cancel}
          confirmLabel={t.actions.confirm}
        />
      </View>
      <InputField
        label={t.forms.supplier}
        value={formData.supplier}
        onChangeText={(value) => updateForm('supplier', value)}
        placeholder={t.home.supplierPlaceholder}
      />
      <InputField
        label={t.forms.plValue}
        value={formData.plValue}
        onChangeText={(value) => updateForm('plValue', value)}
        placeholder={t.home.plHint}
        keyboardType="numeric"
        hint={t.farmCycle.startCycleHint}
      />
      {formData.cycleStartMode === 'midcycle' && (
        <>
          <InputField
            label={t.midcycleOnboarding.currentMbw}
            value={formData.baselineMbw}
            onChangeText={(value) => updateForm('baselineMbw', value)}
            placeholder={t.midcycleOnboarding.currentMbwPlaceholder}
            keyboardType="numeric"
          />
          <InputField
            label={t.midcycleOnboarding.currentPopulation}
            value={formData.baselineEstimatedPopulation}
            onChangeText={(value) => updateForm('baselineEstimatedPopulation', value)}
            placeholder={t.midcycleOnboarding.currentPopulationPlaceholder}
            keyboardType="numeric"
          />
          <InputField
            label={t.midcycleOnboarding.survivalRate}
            value={formData.baselineSurvivalRate}
            onChangeText={(value) => updateForm('baselineSurvivalRate', value)}
            placeholder={t.midcycleOnboarding.survivalRatePlaceholder}
            keyboardType="numeric"
          />
          <InputField
            label={t.midcycleOnboarding.feedUsedSoFar}
            value={formData.baselineCumulativeFeed}
            onChangeText={(value) => updateForm('baselineCumulativeFeed', value)}
            placeholder={t.midcycleOnboarding.feedUsedSoFarPlaceholder}
            keyboardType="numeric"
            hint={t.midcycleOnboarding.feedUsedSoFarHint}
          />
        </>
      )}
    </>
  ), [activeFarmCycle?.id, cycles.length, formData, isEnterpriseFarm, openAccessibleFarmCycles, startablePondOptions, t, updateForm]);

  const dataEntryModal = (
    <Modal visible={modalVisible} animationType="slide" transparent>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalType === 'pond'
                  ? t.home.addNewPond
                  : modalType === 'cycle'
                    ? t.farmCycle.addCycle
                    : modalType === 'baseline'
                      ? t.enterpriseCycle.editBaseline
                      : modalType === 'mortality'
                        ? t.home.addDailyMortality
                        : t.home.addSamplingData}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#dce8f2" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              bounces={false}
            >
              {modalType === 'pond'
                ? renderPondForm
                : modalType === 'cycle'
                  ? renderCycleForm
                  : modalType === 'baseline'
                    ? renderBaselineForm
                    : modalType === 'mortality'
                      ? renderMortalityForm
                      : renderSamplingForm}

              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>{t.actions.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addButton, isSubmitting && { opacity: 0.6 }]}
                  onPress={modalType === 'pond'
                    ? handleAddPond
                    : modalType === 'cycle'
                      ? handleAddCycle
                      : modalType === 'baseline'
                        ? handleUpdateBaseline
                        : modalType === 'mortality'
                          ? handleAddMortalityRecord
                          : handleAddSamplingData}
                  disabled={isSubmitting}
                >
                  <Text style={styles.addButtonText}>
                    {modalType === 'pond'
                      ? t.home.addPondButton
                      : modalType === 'cycle'
                        ? t.enterpriseCycle.startCycle
                        : modalType === 'baseline'
                          ? t.enterpriseCycle.saveBaseline
                          : modalType === 'mortality'
                            ? t.home.saveMortality
                            : t.home.addDataButton}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );

  const dashboardModeSwitch = isEnterpriseFarm && canManageEnterpriseBlocks ? (
    <View style={styles.dashboardModeSwitch} accessibilityRole="tablist">
      {(['enterprise', 'normal'] as const).map((mode) => {
        const selected = dashboardMode === mode;
        return (
          <TouchableOpacity
            key={mode}
            style={[styles.dashboardModeOption, selected && styles.dashboardModeOptionSelected]}
            onPress={() => setDashboardMode(mode)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.dashboardModeText, selected && styles.dashboardModeTextSelected]}>
              {mode === 'enterprise' ? t.enterpriseCycle.enterpriseView : t.enterpriseCycle.normalView}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  ) : null;

  if (isEnterpriseFarm && canManageEnterpriseBlocks && dashboardMode === 'enterprise') {
    return (
      <>
        <EnterpriseDashboard
          ponds={ponds}
          physicalPonds={physicalPonds}
          blocks={enterpriseBlocks.blocks}
          technicians={enterpriseBlocks.technicians}
          cycles={cycles}
          timeZone={company?.timeZone}
          loading={enterpriseBlocks.loading}
          error={enterpriseBlocks.error}
          dashboardModeSwitch={dashboardModeSwitch}
          onSaveProductionCycle={handleSaveEnterpriseProductionCycle}
          onCreatePond={handleCreateEnterprisePhysicalPond}
          onEditCycle={handleEditEnterpriseCycle}
          onCloseCycle={handleCloseEnterpriseBlockCycle}
          onAddSampling={() => openModal('sampling')}
          onAddMortality={() => openModal('mortality')}
          createBlock={enterpriseBlocks.createBlock}
          updateBlock={enterpriseBlocks.updateBlock}
          deleteBlock={enterpriseBlocks.deleteBlock}
          assignBlockTechnician={enterpriseBlocks.assignBlockTechnician}
        />
        {dataEntryModal}
      </>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f8fc" />
      <View style={styles.container}>
        {(user?.role === 'owner' || user?.role === 'co-owner') ? (
          <ProfileCompletionCard
            company={company}
            onPress={() => router.push('/company-setup2?edit=true' as any)}
          />
        ) : null}
        <View style={[
          styles.cycleManagerCard,
          !cycleManagerExpanded && styles.cycleManagerCardCollapsed
        ]}>
          <TouchableOpacity
            style={[
              styles.cycleManagerHeader,
              !cycleManagerExpanded && styles.cycleManagerHeaderCollapsed
            ]}
            onPress={() => setCycleManagerExpanded((expanded) => !expanded)}
            activeOpacity={0.8}
          >
            <View style={styles.cycleHeaderLeft}>
              {cycleManagerExpanded ? (
                <>
                  <Text style={styles.cycleEyebrow}>{t.farmCycle.currentCycle}</Text>
                  <Text style={styles.cycleTitle}>
                    {currentCycleTitle}
                  </Text>
                  <Text style={styles.cycleCompactMeta}>
                    {currentCyclePonds.length > 0
                      ? t.farmCycle.cycleMeta
                        .replace('{{pondCount}}', String(currentCyclePonds.length))
                        .replace('{{activeCount}}', String(activeCyclePonds.length))
                      : t.farmCycle.addPondToCreateCycle.replace('{{cycleNumber}}', String(cycles.length + 1))}
                  </Text>
                </>
              ) : (
                <View style={styles.cycleCollapsedContent}>
                  <View style={[
                    styles.cycleStatusDot,
                    currentCyclePonds.length === 0 && styles.cycleStatusDotMuted
                  ]} />
                  <Text style={styles.cycleCollapsedTitle} numberOfLines={1}>
                    {currentCycleTitle}
                  </Text>
                  <Text style={styles.cycleCollapsedMeta} numberOfLines={1}>
                    {currentCyclePonds.length > 0
                      ? `${currentCyclePonds.length} ${t.farmCycle.ponds} | ${currentCycleStatus.toUpperCase()}`
                      : t.farmCycle.addPondToCreateCycle.replace('{{cycleNumber}}', String(cycles.length + 1))}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.cycleHeaderRight}>
              {cycleManagerExpanded && (
                <View style={[
                  styles.cycleStatusBadge,
                  currentCyclePonds.length === 0 && styles.cycleStatusBadgeMuted
                ]}>
                  <Text style={styles.cycleStatusText}>
                    {currentCycleStatus.toUpperCase()}
                  </Text>
                </View>
              )}
              <Ionicons
                name={cycleManagerExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                size={cycleManagerExpanded ? 20 : 18}
                color="#315f57"
              />
            </View>
          </TouchableOpacity>

          {cycleManagerExpanded && currentCyclePonds.length > 0 ? (
            <>
              {openAccessibleFarmCycles.length > 1 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cycleSwitcherRow}>
                  {openAccessibleFarmCycles.map((cycle) => (
                    <TouchableOpacity
                      key={cycle.id}
                      style={[styles.cycleSwitcherChip, cycle.id === activeFarmCycle?.id && styles.cycleSwitcherChipActive]}
                      onPress={() => setSelectedDashboardCycleId(cycle.id)}
                    >
                      <Text style={[styles.cycleSwitcherText, cycle.id === activeFarmCycle?.id && styles.cycleSwitcherTextActive]}>
                        {cycle.cycleName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : null}
              <View style={styles.cycleStatsRow}>
                <View style={styles.cycleStat}>
                  <Text style={styles.cycleStatValue}>{currentCyclePonds.length}</Text>
                  <Text style={styles.cycleStatLabel}>{t.farmCycle.ponds}</Text>
                </View>
                <View style={styles.cycleStat}>
                  <Text style={styles.cycleStatValue}>
                    {activeFarmCycle?.stockingStartDate || activeFarmCycle?.plannedStartDate || currentCyclePonds[0]?.docStart || '-'}
                  </Text>
                  <Text style={styles.cycleStatLabel}>{t.farmCycle.stockingStart}</Text>
                </View>
              </View>

              {canManageFarmCycle && activeFarmCycle && (
                <View style={styles.cycleRenameRow}>
                  <TextInput
                    value={cycleNameDraft}
                    onChangeText={setCycleNameDraft}
                    placeholder={t.farmCycle.cycleName}
                    placeholderTextColor="#6b8aa0"
                    style={styles.cycleNameInput}
                  />
                  <TouchableOpacity style={styles.cycleSmallButton} onPress={handleRenameFarmCycle}>
                    <Text style={styles.cycleSmallButtonText}>{t.farmCycle.rename}</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.cyclePondList}>
                {currentCyclePonds.slice(0, 4).map((pond) => (
                  <View
                    key={pond.id}
                    style={[
                      styles.cyclePondChip,
                      !isPondCycleActive(pond) && styles.cyclePondChipEnded
                    ]}
                  >
                    <Text style={styles.cyclePondChipText}>{pond.pondName}</Text>
                  </View>
                ))}
                {currentCyclePonds.length > 4 && (
                  <View style={styles.cyclePondChip}>
                    <Text style={styles.cyclePondChipText}>+{currentCyclePonds.length - 4} more</Text>
                  </View>
                )}
              </View>

              {canManageFarmCycle && activeFarmCycle && (
                <TouchableOpacity style={styles.closeFarmCycleButton} onPress={handleCloseFarmCycle}>
                  <Ionicons name="lock-closed-outline" size={18} color="#fff" />
                  <Text style={styles.closeFarmCycleText}>{t.farmCycle.endCycleAction}</Text>
                </TouchableOpacity>
              )}
            </>
          ) : cycleManagerExpanded ? (
            <Text style={styles.cycleEmptyText}>
              {t.farmCycle.emptyTrackerMessage.replace('{{cycleNumber}}', String(cycles.length + 1))}
            </Text>
          ) : null}
        </View>

        {dashboardModeSwitch}

        <View style={styles.cycleFilterContainer}>
          <TouchableOpacity
            style={[styles.cycleFilterButton, cycleFilter === 'active' && styles.cycleFilterButtonActive]}
            onPress={() => setCycleFilter('active')}
          >
            <Text style={[styles.cycleFilterText, cycleFilter === 'active' && styles.cycleFilterTextActive]}>{t.farmCycle.filterActive}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cycleFilterButton, cycleFilter === 'inactive' && styles.cycleFilterButtonActive]}
            onPress={() => setCycleFilter('inactive')}
          >
            <Text style={[styles.cycleFilterText, cycleFilter === 'inactive' && styles.cycleFilterTextActive]}>{t.farmCycle.filterInactive}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cycleFilterButton, cycleFilter === 'ended' && styles.cycleFilterButtonActive]}
            onPress={() => setCycleFilter('ended')}
          >
            <Text style={[styles.cycleFilterText, cycleFilter === 'ended' && styles.cycleFilterTextActive]}>{t.farmCycle.filterEnded}</Text>
          </TouchableOpacity>
        </View>
        <FlatList 
          data={visiblePonds}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PondCard pond={item} />}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            cycleFilter === 'inactive' && idlePhysicalPonds.length > 0 ? (
              <>
                {idlePhysicalPonds.map((pond) => (
                  <TouchableOpacity
                    key={pond.id}
                    style={styles.pondCard}
                    onPress={() => {
                      setFormData((prev) => ({ ...prev, cyclePondId: pond.id }));
                      openModal('cycle');
                    }}
                  >
                    <View style={[styles.pondHeader, styles.idlePondHeader]}>
                      <View style={[styles.pondTitleGroup, styles.idlePondTitleGroup]}>
                        <Text style={[styles.pondName, styles.idlePondName]}>{pond.pondName}</Text>
                        <Text style={styles.midcycleBadgeText}>Idle pond</Text>
                      </View>
                      <View style={styles.headerRight}>
                        <TouchableOpacity style={styles.editButton}>
                          <Ionicons name="play-outline" size={18} color="#315f57" />
                        </TouchableOpacity>
                        {canEditPonds && (
                          <TouchableOpacity
                            style={styles.deletePondButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleDeletePhysicalPond(pond);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`${t.home.deletePond} ${pond.pondName}`}
                          >
                            <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    <View style={styles.pondDetails}>
                      <View style={styles.detailRow}>
                        <DetailItem iconName="resize-outline" label={t.forms.pondSize} value={`${pond.pondArea} m²`} />
                        <DetailItem iconName="time-outline" label="Status" value="No active cycle" />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            ) : null
          }
          ListEmptyComponent={
            cycleFilter === 'inactive' && idlePhysicalPonds.length > 0 ? null :
            <View style={styles.emptyState}>
              <Ionicons name="home-outline" size={80} color="#315f57" />
              <Text style={styles.emptyTitle}>{t.home.noPondsYet}</Text>
              <Text style={styles.emptySubtitle}>
                {canEditPonds 
                  ? t.home.noPondsSubtitle 
                  : t.home.contactOwnerToAdd
                }
              </Text>
            </View>
          }
        />

        {canEditPonds && (
          <TouchableOpacity 
            style={styles.floatingButton}
            onPress={() => setMenuModalVisible(true)}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        )}

        <Modal visible={menuModalVisible} animationType="fade" transparent>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.menuModalContainer}>
              <View style={styles.menuModalContent}>
                <Text style={styles.menuTitle}>{t.home.whatToAdd}</Text>
                <TouchableOpacity 
                  style={styles.menuOption} 
                  onPress={() => openModal('pond')}
                >
                  <Ionicons name="water-outline" size={24} color="#0d2137" />
                  <Text style={styles.menuOptionText}>{t.home.newPond}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuOption}
                  onPress={() => openModal('cycle')}
                >
                  <Ionicons name="repeat-outline" size={24} color="#0d2137" />
                  <Text style={styles.menuOptionText}>{t.farmCycle.addCycle}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.menuOption} 
                  onPress={() => openModal('sampling')}
                >
                  <Ionicons name="analytics-outline" size={24} color="#315f57" />
                  <Text style={styles.menuOptionText}>
                    {t.home.samplingData}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuOption}
                  onPress={() => openModal('mortality')}
                >
                  <Ionicons name="pulse-outline" size={24} color="#315f57" />
                  <Text style={styles.menuOptionText}>{t.home.dailyMortality}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.cancelMenuButton} 
                  onPress={() => setMenuModalVisible(false)}
                >
                  <Text style={styles.cancelMenuText}>
                    {t.actions.cancel}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {dataEntryModal}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f4f8fc' 
  },
  
  scrollContent: { 
    padding: Platform.OS === 'android' ? 16 : 20, 
    paddingTop: Platform.OS === 'android' ? 8 : 12, 
    paddingBottom: 100 
  },

  cycleManagerCard: {
    marginHorizontal: Platform.OS === 'android' ? 16 : 20,
    marginTop: Platform.OS === 'android' ? 14 : 18,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e8f2f9',
    shadowColor: '#0d2137',
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
  dashboardModeSwitch: {
    flexDirection: 'row',
    marginHorizontal: Platform.OS === 'android' ? 16 : 20,
    marginTop: 8,
    padding: 3,
    borderRadius: 11,
    backgroundColor: '#E9F0F5',
  },
  dashboardModeOption: {
    flex: 1,
    minHeight: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardModeOptionSelected: {
    backgroundColor: '#FFFFFF',
  },
  dashboardModeText: {
    color: '#6B7F8E',
    fontSize: 12,
    fontWeight: '800',
  },
  dashboardModeTextSelected: {
    color: '#0F4C75',
  },
  cycleManagerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  cycleManagerHeaderCollapsed: {
    minHeight: 32,
  },
  cycleHeaderLeft: {
    flex: 1,
    minWidth: 0,
  },
  cycleEyebrow: {
    color: '#6b8aa0',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cycleTitle: {
    color: '#0d2137',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  cycleCompactMeta: {
    color: '#315f57',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  cycleCollapsedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  cycleStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#315f57',
    marginRight: 8,
  },
  cycleStatusDotMuted: {
    backgroundColor: '#6b8aa0',
  },
  cycleCollapsedTitle: {
    color: '#0d2137',
    fontSize: 14,
    fontWeight: '900',
    maxWidth: '45%',
    marginRight: 8,
  },
  cycleCollapsedMeta: {
    color: '#6b8aa0',
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
  },
  cycleHeaderRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  cycleStatusBadge: {
    backgroundColor: '#315f57',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cycleStatusBadgeMuted: {
    backgroundColor: '#6b8aa0',
  },
  cycleStatusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  cycleSwitcherRow: {
    gap: 8,
    paddingTop: 14,
  },
  cycleSwitcherChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d7e7f1',
    backgroundColor: '#f4f8fc',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cycleSwitcherChipActive: {
    borderColor: '#0F4C75',
    backgroundColor: '#0F4C75',
  },
  cycleSwitcherText: {
    color: '#5E7485',
    fontSize: 11,
    fontWeight: '800',
  },
  cycleSwitcherTextActive: {
    color: '#FFFFFF',
  },
  cycleStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cycleStat: {
    flex: 1,
    backgroundColor: '#f4f8fc',
    borderRadius: 12,
    padding: 12,
  },
  cycleStatValue: {
    color: '#0d2137',
    fontSize: 16,
    fontWeight: '900',
  },
  cycleStatLabel: {
    color: '#6b8aa0',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  cycleRenameRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cycleNameInput: {
    flex: 1,
    backgroundColor: '#f4f8fc',
    borderWidth: 1,
    borderColor: '#e8f2f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0d2137',
    fontWeight: '700',
  },
  cycleSmallButton: {
    backgroundColor: '#0d2137',
    borderRadius: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleSmallButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  cyclePondList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  cyclePondChip: {
    backgroundColor: '#dce8f2',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cyclePondChipEnded: {
    backgroundColor: '#eef3f7',
    borderWidth: 1,
    borderColor: '#dce8f2',
  },
  cyclePondChipText: {
    color: '#0d2137',
    fontSize: 12,
    fontWeight: '800',
  },
  closeFarmCycleButton: {
    marginTop: 14,
    backgroundColor: '#0d2137',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  closeFarmCycleText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  cycleEmptyText: {
    color: '#315f57',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    marginTop: 12,
  },

  cycleFilterContainer: {
    flexDirection: 'row',
    marginHorizontal: Platform.OS === 'android' ? 16 : 20,
    marginTop: Platform.OS === 'android' ? 12 : 16,
    padding: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e8f2f9',
  },
  cycleFilterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  cycleFilterButtonActive: {
    backgroundColor: '#0d2137',
  },
  cycleFilterText: {
    color: '#315f57',
    fontWeight: '700',
  },
  cycleFilterTextActive: {
    color: '#FFFFFF',
  },
  
  emptyState: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: Platform.OS === 'android' ? 60 : 80 
  },
  emptyTitle: { 
    color: '#0d2137', 
    fontSize: Platform.OS === 'android' ? 22 : 24, 
    fontWeight: 'bold', 
    marginTop: Platform.OS === 'android' ? 16 : 20 
  },
  
  emptySubtitle: { 
    color: '#0d2137', 
    fontSize: Platform.OS === 'android' ? 15 : 16, 
    marginTop: 8, 
    textAlign: 'center', 
    paddingHorizontal: 20 
  },
  
  floatingButton: { position: 'absolute', bottom: 30, right: 30, backgroundColor: '#0d2137', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#dce8f2', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  
  deleteModalContainer: { 
    flex: 1, 
    backgroundColor: 'rgba(15, 76, 117, 0.8)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  
  deleteModalContent: { 
    backgroundColor: '#0d2137', 
    padding: Platform.OS === 'android' ? 20 : 24, 
    borderRadius: 20, 
    width: '90%', 
    maxWidth: 400, 
    borderWidth: 1, 
    borderColor: '#315f57', 
    alignItems: 'center' 
  },
  
  deleteModalIcon: { 
    marginBottom: Platform.OS === 'android' ? 12 : 16 
  },
  
  deleteModalTitle: { 
    fontSize: Platform.OS === 'android' ? 20 : 22, 
    fontWeight: 'bold', 
    color: '#f4f8fc', 
    marginBottom: 12, 
    textAlign: 'center' 
  },
  
  deleteModalMessage: { 
    fontSize: Platform.OS === 'android' ? 15 : 16, 
    color: '#f4f8fc', 
    textAlign: 'center', 
    marginBottom: 12,
    lineHeight: Platform.OS === 'android' ? 20 : 22
  },
  
  deleteModalWarning: { 
    fontSize: Platform.OS === 'android' ? 13 : 14, 
    color: '#dce8f2', 
    textAlign: 'center', 
    marginBottom: Platform.OS === 'android' ? 20 : 24, 
    fontStyle: 'italic',
    lineHeight: Platform.OS === 'android' ? 18 : 20
  },
  
  deleteModalButtons: { 
    flexDirection: 'row', 
    gap: 12, 
    width: '100%' 
  },
  
  deleteModalCancelButton: { 
    flex: 1, 
    paddingVertical: Platform.OS === 'android' ? 12 : 14, 
    paddingHorizontal: Platform.OS === 'android' ? 16 : 20, 
    borderRadius: 12, 
    backgroundColor: '#315f57', 
    alignItems: 'center' 
  },
  
  deleteModalCancelText: { 
    color: '#f4f8fc', 
    fontSize: Platform.OS === 'android' ? 15 : 16, 
    fontWeight: '600' 
  },
  
  deleteModalConfirmButton: { 
    flex: 1, 
    paddingVertical: Platform.OS === 'android' ? 12 : 14, 
    paddingHorizontal: Platform.OS === 'android' ? 16 : 20, 
    borderRadius: 12, 
    backgroundColor: '#e74c3c', 
    alignItems: 'center' 
  },
  
  deleteModalConfirmText: { 
    color: '#fff', 
    fontSize: Platform.OS === 'android' ? 15 : 16, 
    fontWeight: 'bold' 
  },
  
  pondCard: { 
    backgroundColor: '#ffffff', 
    padding: Platform.OS === 'android' ? 16 : 20, 
    borderRadius: 16, 
    marginBottom: Platform.OS === 'android' ? 12 : 16, 
    borderWidth: 1, 
    borderColor: '#e8f2f9', 
    shadowColor: '#315f57', // soft shadow
    shadowOffset: { width: 0, height: 10 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 20, 
    elevation: 4 
  },
  
  pondHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: Platform.OS === 'android' ? 12 : 16 
  },
  
  pondName: { 
    fontSize: Platform.OS === 'android' ? 18 : 20, 
    fontWeight: 'bold', 
    color: '#0d2137', 
    flex: 1 
  },

  pondTitleGroup: {
    flex: 1,
    minWidth: 0,
  },

  idlePondHeader: {
    alignItems: 'flex-start',
  },

  idlePondTitleGroup: {
    paddingRight: 12,
  },

  idlePondName: {
    flex: 0,
    flexShrink: 1,
    lineHeight: Platform.OS === 'android' ? 23 : 25,
  },

  midcycleBadgeText: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#BBE1FA',
    color: '#0F4C75',
    fontSize: Platform.OS === 'android' ? 10 : 11,
    fontWeight: '800',
  },
  
  headerRight: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  
  docBadge: { 
    paddingHorizontal: Platform.OS === 'android' ? 10 : 12, 
    paddingVertical: Platform.OS === 'android' ? 5 : 6, 
    borderRadius: 12, 
    marginLeft: Platform.OS === 'android' ? 8 : 12 
  },
  
  docText: { 
    color: '#fff', 
    fontSize: Platform.OS === 'android' ? 11 : 12, 
    fontWeight: 'bold' 
  },
  
  editButton: { 
    padding: Platform.OS === 'android' ? 6 : 8, 
    marginLeft: 8, 
    backgroundColor: 'rgba(231, 76, 60, 0.1)', 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: 'rgba(231, 76, 60, 0.3)' 
  },

  deletePondButton: {
    padding: Platform.OS === 'android' ? 6 : 8,
    marginLeft: 8,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.3)',
  },

  baselineEditButton: {
    padding: Platform.OS === 'android' ? 6 : 8,
    marginLeft: 8,
    backgroundColor: '#EAF6FD',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBE1FA',
  },
  
  pondDetails: { 
    marginBottom: Platform.OS === 'android' ? 10 : 12 
  },
  
  detailRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: Platform.OS === 'android' ? 10 : 12 
  },
  
  detailItem: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginHorizontal: 4, 
    minWidth: 0,
    flexWrap: 'nowrap',
  },
  
  detailLabel: { 
    color: '#0d2137', 
    fontSize: Platform.OS === 'android' ? 10 : 11, 
    marginLeft: 6, 
    width: Platform.OS === 'android' ? 48 : 52, 
    flexShrink: 0,
  },
  
  detailValue: { 
    color: '#0d2137', 
    fontSize: Platform.OS === 'android' ? 10 : 11, 
    fontWeight: '600', 
    textAlign: 'right', 
    flex: 1,
    flexShrink: 1,
  },
  
  startDateContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingTop: Platform.OS === 'android' ? 10 : 12, 
    borderTopWidth: 1, 
    borderTopColor: '#dce8f2' 
  },
  
  startDate: { 
    color: '#0d2137', 
    fontSize: Platform.OS === 'android' ? 11 : 12, 
    marginLeft: 6,
    lineHeight: Platform.OS === 'android' ? 16 : 18,
    flex: 1,
    flexWrap: 'wrap',
  },
  
  menuModalContainer: { 
    flex: 1, 
    backgroundColor: 'rgba(15, 76, 117, 0.8)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  
  menuModalContent: { 
    backgroundColor: '#FFFFFF', 
    padding: Platform.OS === 'android' ? 20 : 24, 
    borderRadius: 20, 
    width: '80%', 
    borderWidth: 1, 
    borderColor: '#e8f2f9' 
  },
  
  menuTitle: { 
    fontSize: Platform.OS === 'android' ? 18 : 20, 
    fontWeight: 'bold', 
    color: '#0d2137', 
    textAlign: 'center', 
    marginBottom: Platform.OS === 'android' ? 20 : 24 
  },
  
  menuOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: Platform.OS === 'android' ? 14 : 16, 
    backgroundColor: '#f4f8fc', 
    borderRadius: 12, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: '#e8f2f9' 
  },
  
  menuOptionText: { 
    color: '#0d2137', 
    fontSize: Platform.OS === 'android' ? 15 : 16, 
    fontWeight: '600', 
    marginLeft: 12 
  },
  
  cancelMenuButton: { 
    padding: Platform.OS === 'android' ? 14 : 16, 
    alignItems: 'center', 
    marginTop: 8 
  },
  
  cancelMenuText: { 
    color: '#0d2137', 
    fontSize: Platform.OS === 'android' ? 15 : 16 
  },
  
  modalContainer: { 
    flex: 1, 
    backgroundColor: 'rgba(15, 76, 117, 0.8)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  
  modalContent: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    width: '100%', 
    maxHeight: '85%', 
    borderWidth: 1, 
    borderColor: '#e8f2f9', 
    overflow: 'hidden' 
  },
  
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: Platform.OS === 'android' ? 20 : 24, 
    paddingBottom: 0 
  },
  
  modalTitle: { 
    fontSize: Platform.OS === 'android' ? 22 : 24, 
    fontWeight: 'bold', 
    color: '#0d2137' 
  },
  
  closeButton: { 
    padding: 4 
  },
  
  modalScrollView: { 
    flexGrow: 0,
    flexShrink: 1,
    padding: Platform.OS === 'android' ? 20 : 24, 
    paddingTop: 0 
  },

  modalScrollContent: {
    paddingBottom: Platform.OS === 'android' ? 80 : 64,
  },
  
  inputContainer: { 
    marginBottom: Platform.OS === 'android' ? 16 : 20 
  },

  row: {
    flexDirection: 'row',
    gap: 12,
  },

  inputGroup: {
    flex: 1,
  },
  
  inputLabel: { 
    color: '#0d2137', 
    fontSize: Platform.OS === 'android' ? 13 : 14, 
    fontWeight: '600', 
    marginBottom: 8 
  },
  
  input: { 
    borderWidth: 1, 
    borderColor: '#e8f2f9', 
    padding: Platform.OS === 'android' ? 14 : 16, 
    borderRadius: 12, 
    backgroundColor: '#FFFFFF', 
    color: '#0d2137', 
    fontSize: Platform.OS === 'android' ? 15 : 16,
    includeFontPadding: false,
    textAlignVertical: 'center'
  },
  
  inputHint: { 
    color: '#0d2137', 
    fontSize: Platform.OS === 'android' ? 11 : 12, 
    marginTop: 4, 
    fontStyle: 'italic',
    lineHeight: Platform.OS === 'android' ? 16 : 18
  },

  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },

  segmentOption: {
    flex: 1,
    paddingVertical: Platform.OS === 'android' ? 10 : 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8f2f9',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },

  segmentOptionSelected: {
    backgroundColor: '#0F4C75',
    borderColor: '#0F4C75',
  },

  segmentOptionText: {
    color: '#0d2137',
    fontSize: Platform.OS === 'android' ? 12 : 13,
    fontWeight: '700',
    textAlign: 'center',
  },

  segmentOptionTextSelected: {
    color: '#FFFFFF',
  },

  mortalityOptionList: {
    gap: 8,
  },

  mortalityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: Platform.OS === 'android' ? 11 : 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8f2f9',
    backgroundColor: '#FFFFFF',
  },

  mortalityOptionSelected: {
    backgroundColor: '#0F4C75',
    borderColor: '#0F4C75',
  },

  mortalityOptionText: {
    flex: 1,
    color: '#0d2137',
    fontSize: Platform.OS === 'android' ? 13 : 14,
    fontWeight: '700',
  },

  mortalityOptionTextSelected: {
    color: '#FFFFFF',
  },
  
  pondSelector: { 
    maxHeight: 50 
  },
  
  pondOption: { 
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16, 
    paddingVertical: Platform.OS === 'android' ? 7 : 8, 
    marginRight: 8, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: '#e8f2f9' 
  },
  
  pondOptionSelected: { 
    backgroundColor: '#0d2137', 
    borderColor: '#0d2137' 
  },
  
  pondOptionText: { 
    color: '#0d2137', 
    fontSize: Platform.OS === 'android' ? 13 : 14, 
    fontWeight: '600' 
  },
  
  pondOptionTextSelected: { 
    color: '#FFFFFF' 
  },
  
  buttonContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    gap: 12, 
    marginTop: Platform.OS === 'android' ? 16 : 20, 
    marginBottom: Platform.OS === 'android' ? 20 : 24 
  },
  
  addButton: { 
    backgroundColor: '#315f57', 
    paddingVertical: Platform.OS === 'android' ? 14 : 16, 
    paddingHorizontal: Platform.OS === 'android' ? 20 : 24, 
    borderRadius: 12, 
    alignItems: 'center', 
    flex: 1, 
    shadowColor: '#dce8f2',
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8, 
    elevation: 6 
  },
  
  addButtonText: { 
    color: '#fff', 
    fontSize: Platform.OS === 'android' ? 15 : 16, 
    fontWeight: 'bold', 
  },
  
  cancelButton: { 
    backgroundColor: 'transparent', 
    paddingVertical: Platform.OS === 'android' ? 14 : 16, 
    paddingHorizontal: Platform.OS === 'android' ? 20 : 24, 
    borderRadius: 12, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#e74c3c', 
    flex: 1 
  },
  
  cancelButtonText: { 
    color: '#e74c3c', 
    fontSize: Platform.OS === 'android' ? 15 : 16, 
    fontWeight: 'bold', 
  },
  
});
