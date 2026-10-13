import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useEnterpriseBlocks } from "../../app/hooks/useEnterpriseBlocks";
import { useFarmDateKey } from "../../app/hooks/useFarmDateKey";
import { getActiveFarmCycle, getPhysicalPondKey, getPondCurrentDoc, getPondCycleStatus, isBaselineSampling, isPondCycleActive, usePondStore, type FarmCycle, type PhysicalPond, type Pond, type Sampling } from "../../app/store/pondStore";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import {
  filterEnterpriseRecordsForUser
} from "../../shared/enterpriseBlocks";
import { FARM_OPERATIONAL_DAY_ROLLOVER_HOUR } from "../../shared/farmDate";
import { hasFarmPermission } from "../../shared/permissions";
import { calculateAdg } from "../../shared/pondCalculations";
import { compareByPondName, FormData } from './PondManagementModel';

export function usePondManagementState() {
  const router = useRouter();

  const { t } = useLanguage();

  const { user, company } = useAuth();

  const farmToday = useFarmDateKey(company?.timeZone, FARM_OPERATIONAL_DAY_ROLLOVER_HOUR);

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

  const mortalityDraftIdRef = useRef<string | null>(null);

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

  const [cycleDraftSource, setCycleDraftSource] = useState({ id: activeFarmCycle?.id, name: activeFarmCycle?.cycleName });

  if (cycleDraftSource.id !== activeFarmCycle?.id || cycleDraftSource.name !== activeFarmCycle?.cycleName) {
    setCycleDraftSource({ id: activeFarmCycle?.id, name: activeFarmCycle?.cycleName });
    setCycleNameDraft(activeFarmCycle?.cycleName || '');
    if (activeFarmCycle && cycleDraftSource.id !== activeFarmCycle.id) setSelectedDashboardCycleId(activeFarmCycle.id);
  }

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
      doc: getPondCurrentDoc(pond, company?.timeZone, farmToday),
      totalBiomass: metrics.currentBiomass,
      sr: metrics.adjustedSR.toFixed(1),
      size,
      currentPopulation: metrics.currentPopulation,
      latestSampling,
      fcr: metrics.adjustedFCR.toFixed(2),
    };
  }, [calculatePondMetricsWithHarvest, company?.timeZone, farmToday, getLatestSampling]);

  const getDOCColor = useCallback((doc: number): string => {
    if (doc < 30) return '#0d2137';
    if (doc < 60) return '#315f57';
    if (doc < 90) return '#dbe7df';
    return '#0d2137';
  }, []);

  const closeModal = useCallback(() => {
    if (submitLockRef.current) return;
    mortalityDraftIdRef.current = null;
    resetForm();
    setEditingBaselinePondId(null);
    setModalVisible(false);
  }, [resetForm]);

  const currentCompanyId = company?.id;
  return {
    router,
    t,
    user,
    company,
    canManagePonds,
    canRecordPondData,
    canEditPonds,
    isEnterpriseFarm,
    canManageFarmCycle,
    canManageEnterpriseBlocks,
    enterpriseBlocks,
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
    modalVisible,
    setModalVisible,
    menuModalVisible,
    setMenuModalVisible,
    cycleFilter,
    setCycleFilter,
    isSubmitting,
    setIsSubmitting,
    submitLockRef,
    mortalityDraftIdRef,
    modalType,
    setModalType,
    cycleNameDraft,
    setCycleNameDraft,
    setSelectedDashboardCycleId,
    cycleManagerExpanded,
    setCycleManagerExpanded,
    dashboardMode,
    setDashboardMode,
    editingBaselinePondId,
    setEditingBaselinePondId,
    formData,
    setFormData,
    updateForm,
    convertPlToGrams,
    parseNumericInput,
    formatLocalDateKey,
    normalizeDateValue,
    calculateDocFromDates,
    availableEnterpriseBlocks,
    accessiblePonds,
    activePonds,
    activePhysicalPondNames,
    idlePhysicalPonds,
    startablePondOptions,
    openAccessibleFarmCycles,
    activeFarmCycle,
    currentCyclePonds,
    activeCyclePonds,
    currentCycleTitle,
    currentCycleStatus,
    visiblePonds,
    getLastADG,
    calculateMetrics,
    getDOCColor,
    closeModal,
    currentCompanyId,
  };
}
