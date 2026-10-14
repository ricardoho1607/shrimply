import { filterPondRecordsForUser } from '../../shared/pondAssignments';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from "react";
import { FlatList, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert, Platform, KeyboardAvoidingView } from "react-native";
import { usePondStore, HarvestRecord, isFarmCycleOpen, isPondCycleActive } from "../store/pondStore";
import { useLanguage } from '../../context/LanguageContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFarmDateKey } from '../../shared/farmDate';
import {
  buildHarvestDateSampling,
  clearUntouchedAutoFilledHarvestSize,
  getHarvestDateSampling,
  getSamplingSize,
  harvestSizeDiffersFromSampling,
  refreshAutoFilledHarvestSize,
  getInvalidHarvestDraftLine,
  hasHarvestDraftData,
  stripOrphanAutoFilledHarvestSize,
  type HarvestDayFeedStatus,
  type HarvestType,
} from '../../shared/harvestCalculations';
import { getSamplingMbw } from '../../shared/pondCalculations';
import { useEnterpriseBlocks } from '../hooks/useEnterpriseBlocks';
import AppDatePicker from '../components/forms/AppDatePicker';
import CycleSelector from '../components/forms/CycleSelector';
import {
  harvestPondsBelongToCycle,
  harvestRecordMatchesCycle,
  isHistoricalHarvestRecord,
} from '../../shared/harvestCycleScope';
import { hasFarmPermission } from '../../shared/permissions';
import DashboardIcon from '../components/icons/DashboardIcon';

const Input = React.memo(function Input({ label, value, onChangeText, placeholder }: any) {
  return (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput style={styles.input} keyboardType="numeric" value={value} 
      onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#6b8aa0" />
  </View>
  );
});

const SummaryItem = React.memo(function SummaryItem({ iconName, label, value, unit = "" }: any) {
  return (
  <View style={styles.summaryItem}>
    <Ionicons name={iconName as any} size={16} color="#dce8f2" />
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue}>{value}{unit ? ` ${unit}` : ''}</Text>
  </View>
  );
});

const createHarvestSamplingId = () => `harvest-sampling-${Date.now()}`;

export default function HarvestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, currentLanguage } = useLanguage();
  const { formatCurrency, currencyConfig } = useCurrency();
  const { user, company } = useAuth();
  const {
    ponds,
    cycles,
    harvestRecords,
    addHarvestRecord,
    updateHarvestRecord,
    removeHarvestRecord,
    addSampling,
    calculatePondMetricsWithHarvest,
  } = usePondStore();
  const enterpriseBlocks = useEnterpriseBlocks(
    company?.businessSize === 'enterprise' ? company?.id : undefined,
    user?.uid,
  );
  const accessiblePonds = React.useMemo(() => filterPondRecordsForUser(ponds, {
    businessSize: company?.businessSize,
    role: user?.role,
    userId: user?.uid,
    blocks: enterpriseBlocks.blocks,
    cycles, companyOwnerId: company?.ownerId,
  }), [cycles, company?.ownerId, company?.businessSize, enterpriseBlocks.blocks, ponds, user?.role, user?.uid]);
  const activePonds = React.useMemo(() => accessiblePonds.filter(isPondCycleActive), [accessiblePonds]);
  const activePondCycleIds = React.useMemo(() => new Set(
    activePonds.map((pond) => pond.cycleId).filter((cycleId): cycleId is string => Boolean(cycleId)),
  ), [activePonds]);
  const activeCycles = React.useMemo(() => {
    const openCycles = cycles.filter(isFarmCycleOpen);
    const linkedCycles = openCycles.filter((cycle) => activePondCycleIds.has(cycle.id));
    const availableCycles = linkedCycles.length > 0
      ? linkedCycles
      : activePonds.length > 0 && openCycles[0]
        ? [openCycles[0]]
        : [];
    return availableCycles.sort((first, second) => first.cycleName.localeCompare(second.cycleName, undefined, { numeric: true }));
  }, [activePondCycleIds, activePonds.length, cycles]);
  const accessibleCycleIds = React.useMemo(() => new Set(
    accessiblePonds.map((pond) => pond.cycleId).filter((cycleId): cycleId is string => Boolean(cycleId)),
  ), [accessiblePonds]);
  const openCycleIds = React.useMemo(() => new Set(
    cycles.filter(isFarmCycleOpen).map((cycle) => cycle.id),
  ), [cycles]);
  const historicalCycles = React.useMemo(() => cycles
    .filter((cycle) => !isFarmCycleOpen(cycle) && accessibleCycleIds.has(cycle.id))
    .sort((first, second) => first.cycleName.localeCompare(second.cycleName, undefined, { numeric: true })), [accessibleCycleIds, cycles]);
  const accessiblePondIds = React.useMemo(() => new Set(accessiblePonds.map((pond) => pond.id)), [accessiblePonds]);
  const accessibleHarvestRecords = React.useMemo(() => harvestRecords
    .map((record) => ({
      ...record,
      ponds: record.ponds.filter((pond) => accessiblePondIds.has(pond.pondId)),
    }))
    .filter((record) => record.ponds.length > 0), [accessiblePondIds, harvestRecords]);
  const [harvestFilter, setHarvestFilter] = useState<'current' | 'history'>('current');
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [historyCycleId, setHistoryCycleId] = useState('all');
  const [harvestDate, setHarvestDate] = useState(getFarmDateKey(new Date(), company?.timeZone));
  
  const canEditHarvest = hasFarmPermission(user, 'manageHarvests', company?.ownerId);
  const canModifyHarvestRecord = useCallback((harvestId: string) => {
    const record = harvestRecords.find((harvest) => harvest.id === harvestId);
    if (!record) return false;
    if (company?.businessSize !== 'enterprise' || user?.role !== 'technician') return true;
    return record.ponds.every((pond) => accessiblePondIds.has(pond.pondId));
  }, [accessiblePondIds, company?.businessSize, harvestRecords, user?.role]);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingHarvest, setEditingHarvest] = useState<HarvestRecord | null>(null);
  const editReplacementIdRef = useRef<string | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [harvestToDelete, setHarvestToDelete] = useState<string | null>(null);

  const selectedCycle = React.useMemo(
    () => activeCycles.find((cycle) => cycle.id === selectedCycleId),
    [activeCycles, selectedCycleId],
  );
  const selectedCyclePonds = React.useMemo(() => activePonds.filter((pond) => (
    pond.cycleId === selectedCycleId || (!pond.cycleId && activeCycles.length === 1)
  )), [activeCycles.length, activePonds, selectedCycleId]);
  const formPonds = React.useMemo(() => editingHarvest
    ? editingHarvest.ponds
        .map((harvestPond) => accessiblePonds.find((pond) => pond.id === harvestPond.pondId))
        .filter(Boolean) as typeof accessiblePonds
    : selectedCyclePonds,
  [accessiblePonds, editingHarvest, selectedCyclePonds]);
  const formCycle = React.useMemo(() => editingHarvest
    ? cycles.find((cycle) => cycle.id === editingHarvest.cycleId)
    : selectedCycle,
  [cycles, editingHarvest, selectedCycle]);
  const selectedCyclePondIds = React.useMemo(
    () => new Set(selectedCyclePonds.map((pond) => pond.id)),
    [selectedCyclePonds],
  );

  const initializePondData = useCallback(() => selectedCyclePonds.map(pond => ({
    pondId: pond.id, pondName: pond.pondName,
    cycleId: pond.cycleId || selectedCycleId,
    cycleName: pond.cycleName || selectedCycle?.cycleName,
    pondCycleId: pond.pondCycleId || pond.id,
    blockId: pond.blockId,
    blockName: pond.blockName,
    harvestType: 'partial' as HarvestType,
    biomass: "", size: "", price: "", subBiomass: "", subSize: "", subPrice: "",
  })), [selectedCycle?.cycleName, selectedCycleId, selectedCyclePonds]);

  const [pondData, setPondData] = useState<HarvestRecord['ponds']>(initializePondData());
  const [expandedPondId, setExpandedPondId] = useState<string | null>(selectedCyclePonds[0]?.id ?? null);
  const [secondaryPondIds, setSecondaryPondIds] = useState<string[]>([]);
  const [samplingMbwDrafts, setSamplingMbwDrafts] = useState<Record<string, string>>({});
  const [samplingFeedStatuses, setSamplingFeedStatuses] = useState<Record<string, HarvestDayFeedStatus>>({});
  const [autoFilledSizes, setAutoFilledSizes] = useState<Record<string, { value: string; date: string }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  const visibleHarvestRecords = React.useMemo(
    () => accessibleHarvestRecords.filter((harvest) =>
      harvestFilter === 'current'
        ? Boolean(selectedCycleId && (
          harvestRecordMatchesCycle(harvest, selectedCycleId)
          || harvest.ponds.some((pond) => selectedCyclePondIds.has(pond.pondId))
        ))
        : historyCycleId === 'all'
          ? isHistoricalHarvestRecord(harvest, openCycleIds)
            && !harvest.ponds.some((pond) => activePonds.some((activePond) => activePond.id === pond.pondId))
          : harvestRecordMatchesCycle(harvest, historyCycleId)
    ),
    [accessibleHarvestRecords, activePonds, harvestFilter, historyCycleId, openCycleIds, selectedCycleId, selectedCyclePondIds]
  );

  const fallbackCycleId = activeCycles[0]?.id || '';
  if (!activeCycles.some((cycle) => cycle.id === selectedCycleId) && selectedCycleId !== fallbackCycleId) {
    setSelectedCycleId(fallbackCycleId);
  }

  // Preserve typed harvest values when live pond measurements refresh.
  const draftScope = JSON.stringify([selectedCycleId, selectedCyclePonds.map(pond => pond.id)]);
  const [previousDraftScope, setPreviousDraftScope] = useState(draftScope);
  if (previousDraftScope !== draftScope) {
    setPreviousDraftScope(draftScope);
    setPondData(initializePondData());
    setExpandedPondId(selectedCyclePonds[0]?.id ?? null);
    setSecondaryPondIds([]);
    setAutoFilledSizes({});
  }

  const updatePondField = (pondId: string, field: string, value: string | HarvestType) => {
    if (field === 'size') {
      setAutoFilledSizes((current) => {
        if (!current[pondId]) return current;
        const next = { ...current };
        delete next[pondId];
        return next;
      });
    }
    setPondData(prev => prev.map(pond => pond.pondId === pondId ? { ...pond, [field]: value } : pond));
  };

  const changeHarvestDate = (nextDate: string) => {
    if (nextDate === harvestDate) return;
    const previousAutoFilledSizes = autoFilledSizes;
    setAutoFilledSizes({});
    setPondData((current) => current.map((entry) => {
      const provenance = previousAutoFilledSizes[entry.pondId];
      const size = clearUntouchedAutoFilledHarvestSize(entry.size, provenance);
      return size === entry.size ? entry : { ...entry, size };
    }));
    setHarvestDate(nextDate);
  };

  const parsePositiveNumber = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };

  const hasAnyHarvestData = (pond: typeof pondData[number]) =>
    hasHarvestDraftData(pond, Boolean(autoFilledSizes[pond.pondId]));

  const isPondEntryComplete = (pond: typeof pondData[number]) => {
    return hasAnyHarvestData(pond)
      && getInvalidHarvestDraftLine(pond, Boolean(autoFilledSizes[pond.pondId])) === null;
  };

  const completedPondCount = pondData.filter((entry) => {
    const pond = formPonds.find((item) => item.id === entry.pondId);
    return Boolean(pond && getHarvestDateSampling(pond, harvestDate) && isPondEntryComplete(entry));
  }).length;
  const enteredPondCount = pondData.filter(hasAnyHarvestData).length;

  const toggleSecondaryHarvest = (pondId: string) => {
    setSecondaryPondIds((current) =>
      current.includes(pondId)
        ? current.filter((id) => id !== pondId)
        : [...current, pondId]
    );
  };

  const openNextPond = (pondId: string) => {
    const currentIndex = formPonds.findIndex((pond) => pond.id === pondId);
    setExpandedPondId(formPonds[currentIndex + 1]?.id ?? null);
  };

  const getHarvestBiomass = (pond: { biomass: string; subBiomass: string }) =>
    (parseFloat(pond.biomass) || 0) + (parseFloat(pond.subBiomass) || 0);

  const saveRequiredSampling = async (pond: typeof selectedCyclePonds[number]) => {
    const mbw = parsePositiveNumber(samplingMbwDrafts[pond.id] || '');
    if (!mbw) {
      Alert.alert(t.messages.error, t.harvest.samplingMbwRequired);
      return;
    }

    const outcome = await addSampling(pond.id, buildHarvestDateSampling({
      id: createHarvestSamplingId(),
      date: harvestDate,
      mbw,
      feedStatus: samplingFeedStatuses[pond.id] || 'not_recorded',
      cycleId: pond.cycleId,
      cycleName: pond.cycleName,
      pondCycleId: pond.pondCycleId || pond.id,
    }));

    if (!outcome || outcome.success === false || outcome.status === 'rejected') {
      Alert.alert(t.messages.error, outcome?.error || 'Failed to save sampling locally.');
      return;
    }

    const suggestedSize = String(Math.round(1000 / mbw));
    const currentSize = pondData.find((entry) => entry.pondId === pond.id)?.size || '';
    const refreshedSize = refreshAutoFilledHarvestSize(
      currentSize,
      autoFilledSizes[pond.id],
      suggestedSize,
      harvestDate,
    );
    setAutoFilledSizes((current) => {
      if (!refreshedSize.autoFilled) {
        if (!current[pond.id]) return current;
        const next = { ...current };
        delete next[pond.id];
        return next;
      }
      return { ...current, [pond.id]: refreshedSize.autoFilled };
    });
    setPondData((current) => current.map((entry) => entry.pondId === pond.id
      ? { ...entry, size: refreshedSize.size }
      : entry));
    setSamplingMbwDrafts((current) => ({ ...current, [pond.id]: '' }));
  };

  const getExcessHarvestWarning = (pondsWithData: typeof pondData) => {
    const warningPond = pondsWithData.find((harvestPond) => {
      const pond = formPonds.find((item) => item.id === harvestPond.pondId);
      if (!pond) return false;

      const previousHarvestPond = editingHarvest?.ponds.find((item) => item.pondId === harvestPond.pondId);
      const estimatedBiomass = calculatePondMetricsWithHarvest(pond).currentBiomass
        + (previousHarvestPond ? getHarvestBiomass(previousHarvestPond) : 0);
      return estimatedBiomass > 0 && getHarvestBiomass(harvestPond) > estimatedBiomass * 1.1;
    });

    if (!warningPond) return null;

    const pond = formPonds.find((item) => item.id === warningPond.pondId);
    const previousHarvestPond = editingHarvest?.ponds.find((item) => item.pondId === warningPond.pondId);
    const estimatedBiomass = pond
      ? calculatePondMetricsWithHarvest(pond).currentBiomass + (previousHarvestPond ? getHarvestBiomass(previousHarvestPond) : 0)
      : 0;

    return {
      pondName: warningPond.pondName,
      harvestBiomass: getHarvestBiomass(warningPond),
      estimatedBiomass,
    };
  };

  const resetForm = useCallback(() => {
    setPondData(initializePondData());
    setExpandedPondId(selectedCyclePonds[0]?.id ?? null);
    setSecondaryPondIds([]);
    setSamplingMbwDrafts({});
    setSamplingFeedStatuses({});
    setAutoFilledSizes({});
  }, [initializePondData, selectedCyclePonds]);

  const saveHarvestRecords = useCallback(async (pondsWithData: typeof pondData) => {
    const harvestId = editingHarvest
      ? (editReplacementIdRef.current ||= `harvest-${editingHarvest.id}-rev-${Date.now()}`)
      : Date.now().toString();
    const newHarvest: HarvestRecord = {
      id: harvestId,
      date: harvestDate,
      cycleId: editingHarvest?.cycleId || formCycle?.id,
      cycleName: editingHarvest?.cycleName || formCycle?.cycleName,
      blockId: editingHarvest?.blockId || formCycle?.blockId || formPonds[0]?.blockId,
      blockName: editingHarvest?.blockName || formCycle?.blockName || formCycle?.blockNames?.[0] || formPonds[0]?.blockName,
      ponds: pondsWithData.map((pond) => {
        const savedDraft = stripOrphanAutoFilledHarvestSize(
          pond,
          Boolean(autoFilledSizes[pond.pondId]),
        );
        return {
          ...savedDraft,
          biomass: savedDraft.biomass.trim(),
          size: savedDraft.size.trim(),
          price: savedDraft.price.trim(),
          subBiomass: savedDraft.subBiomass.trim(),
          subSize: savedDraft.subSize.trim(),
          subPrice: savedDraft.subPrice.trim(),
        };
      }),
    };

    try {
      const outcome = editingHarvest
        ? await updateHarvestRecord(editingHarvest.id, newHarvest)
        : await addHarvestRecord(newHarvest);

      if (!outcome || outcome.success === false || outcome.status === 'rejected') {
        const message = outcome?.error || 'Failed to save harvest record.';
        Alert.alert(t.messages.error, message);
        return;
      }

      editReplacementIdRef.current = null;
      resetForm();
      setEditingHarvest(null);
      setIsModalVisible(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save harvest record.';
      Alert.alert(t.messages.error, message);
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }, [addHarvestRecord, autoFilledSizes, editingHarvest, formCycle, formPonds, harvestDate, resetForm, t.messages.error, updateHarvestRecord]);

  const handleSave = () => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setIsSubmitting(true);

    if (!canEditHarvest) {
      Alert.alert(t.harvest.permissionDenied, t.harvest.permissionMessage);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const pondsWithData = pondData.filter((pond) => hasAnyHarvestData(pond));

    const formCycleId = editingHarvest?.cycleId || formCycle?.id;
    if (!formCycleId || formPonds.length === 0) {
      Alert.alert(t.messages.error, t.harvest.noActivePonds);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    if (pondsWithData.length === 0) {
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    if (!harvestPondsBelongToCycle(pondsWithData, formCycleId)) {
      Alert.alert(t.messages.error, t.harvestCycle.sameCycleRequired);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const missingSamplingPond = pondsWithData.find((entry) => {
      const pond = formPonds.find((item) => item.id === entry.pondId);
      return !pond || !getHarvestDateSampling(pond, harvestDate);
    });
    if (missingSamplingPond) {
      Alert.alert(
        t.harvest.samplingRequired,
        t.harvest.samplingRequiredMessage
          .replace('{{pondName}}', missingSamplingPond.pondName)
          .replace('{{date}}', harvestDate),
      );
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const invalidPond = pondsWithData.find((pond) => getInvalidHarvestDraftLine(
      pond,
      Boolean(autoFilledSizes[pond.pondId]),
    ) !== null);

    if (invalidPond) {
      const invalidLine = getInvalidHarvestDraftLine(invalidPond, Boolean(autoFilledSizes[invalidPond.pondId]));
      setExpandedPondId(invalidPond.pondId);
      if (invalidLine === 'secondary') {
        setSecondaryPondIds((current) => current.includes(invalidPond.pondId) ? current : [...current, invalidPond.pondId]);
      }
      Alert.alert(
        t.messages.error,
        `${invalidPond.pondName} · ${invalidLine === 'secondary' ? t.harvest.subSize : t.harvest.size}: ${t.harvest.invalidHarvestLine.replace('{{pondName}}', invalidPond.pondName)}`
      );
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const finishSave = () => {
      const warning = getExcessHarvestWarning(pondsWithData);
      if (warning) {
        Alert.alert(
          t.harvest.biomassWarningTitle,
          `${warning.pondName}: ${t.harvest.biomassWarningMessage} (${warning.harvestBiomass.toFixed(1)} kg vs ${warning.estimatedBiomass.toFixed(1)} kg).`,
          [
            {
              text: t.actions.cancel,
              style: 'cancel',
              onPress: () => {
                submitLockRef.current = false;
                setIsSubmitting(false);
              },
            },
            { text: t.harvest.continueSave, onPress: () => saveHarvestRecords(pondsWithData) },
          ]
        );
        return;
      }
      saveHarvestRecords(pondsWithData);
    };

    const sizeWarning = pondsWithData.find((entry) => {
      const pond = formPonds.find((item) => item.id === entry.pondId);
      const sampling = pond ? getHarvestDateSampling(pond, harvestDate) : undefined;
      return harvestSizeDiffersFromSampling(entry.size, sampling)
        || harvestSizeDiffersFromSampling(entry.subSize, sampling);
    });
    if (sizeWarning) {
      Alert.alert(
        t.harvest.sizeDifferenceTitle,
        t.harvest.sizeDifferenceMessage.replace('{{pondName}}', sizeWarning.pondName),
        [
          {
            text: t.actions.cancel,
            style: 'cancel',
            onPress: () => {
              submitLockRef.current = false;
              setIsSubmitting(false);
            },
          },
          { text: t.harvest.continueSave, onPress: finishSave },
        ],
      );
      return;
    }

    finishSave();
  };

  const handleModalClose = () => {
    editReplacementIdRef.current = null;
    resetForm();
    setEditingHarvest(null);
    submitLockRef.current = false;
    setIsSubmitting(false);
    setIsModalVisible(false);
  };

  const handleEditHarvest = (record: HarvestRecord) => {
    if (!canEditHarvest || !canModifyHarvestRecord(record.id)) {
      Alert.alert(t.harvest.permissionDenied, t.harvest.permissionMessage);
      return;
    }
    editReplacementIdRef.current = `harvest-${record.id}-rev-${Date.now()}`;
    setEditingHarvest(record);
    setHarvestDate(record.date);
    setPondData(record.ponds.map((pond) => ({
      ...pond,
      cycleId: pond.cycleId || record.cycleId || '',
      cycleName: pond.cycleName || record.cycleName,
      pondCycleId: pond.pondCycleId || pond.pondId,
      blockId: pond.blockId || record.blockId,
      blockName: pond.blockName || record.blockName,
      harvestType: pond.harvestType || 'partial',
      biomass: pond.biomass || '',
      size: pond.size || '',
      price: pond.price || '',
      subBiomass: pond.subBiomass || '',
      subSize: pond.subSize || '',
      subPrice: pond.subPrice || '',
    })));
    setExpandedPondId(record.ponds[0]?.pondId ?? null);
    setSecondaryPondIds(record.ponds
      .filter((pond) => Boolean(pond.subBiomass || pond.subSize || pond.subPrice))
      .map((pond) => pond.pondId));
    setAutoFilledSizes({});
    submitLockRef.current = false;
    setIsSubmitting(false);
    setIsModalVisible(true);
  };

  const handleDeleteHarvest = (harvestId: string) => {
    if (!canEditHarvest || !canModifyHarvestRecord(harvestId)) {
      Alert.alert(t.harvest.permissionDenied, t.harvest.permissionMessage);
      return;
    }
    setHarvestToDelete(harvestId);
    setDeleteModalVisible(true);
  };

  const confirmDeleteHarvest = async () => {
    if (harvestToDelete) {
      const outcome = await removeHarvestRecord(harvestToDelete);
      if (!outcome || outcome.success === false || outcome.status === 'rejected') {
        Alert.alert(t.messages.error, outcome?.error || 'Failed to void harvest record.');
        return;
      }
      setDeleteModalVisible(false);
      setHarvestToDelete(null);
    }
  };

  const cancelDeleteHarvest = () => { setDeleteModalVisible(false); setHarvestToDelete(null); };

  const handleHarvestCardClick = (harvestId: string, harvestDate: string) => {
    router.push({ pathname: '/harvestdetails', params: { harvestId, harvestDate }});
  };

  const calculateTotals = (harvest: HarvestRecord) => {
    let totalBiomass = 0, totalPrice = 0, weightedSizeSum = 0, totalWeight = 0;

    harvest.ponds.forEach(pond => {
      const biomass = parseFloat(pond.biomass) || 0;
      const size = parseFloat(pond.size) || 0;
      const pricePerKg = parseFloat(pond.price) || 0;
      const subBiomass = parseFloat(pond.subBiomass) || 0;
      const subSize = parseFloat(pond.subSize) || 0;
      const subPricePerKg = parseFloat(pond.subPrice) || 0;

      totalBiomass += biomass + subBiomass;
      totalPrice += (biomass * pricePerKg) + (subBiomass * subPricePerKg);

      if (biomass > 0 && size > 0) {
        weightedSizeSum += biomass * size;
        totalWeight += biomass;
      }
      if (subBiomass > 0 && subSize > 0) {
        weightedSizeSum += subBiomass * subSize;
        totalWeight += subBiomass;
      }
    });

    const averageSize = totalWeight > 0 ? weightedSizeSum / totalWeight : 0;

    return {
      totalBiomass: totalBiomass,
      averageSize: averageSize,
      totalPrice: totalPrice,
    };
  };

  const getHarvestTypeLabel = (pond: HarvestRecord['ponds'][number]) => {
    if (pond.harvestType === 'partial') {
      return t.harvest.partialHarvestNumber.replace('{{number}}', String(pond.partialHarvestNumber || 1));
    }
    if (pond.harvestType === 'final') return t.harvest.finalHarvest;
    return t.harvest.harvest;
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0d2137" />
      <View style={styles.container}>
        <View style={styles.header}>
          <DashboardIcon name="harvest" size={28} color="#315f57" />
          <Text style={styles.headerTitle}>{t.harvest.title}</Text>
        </View>

        <View style={styles.cycleSummary}>
          <View style={styles.cycleSummaryText}>
            <Text style={styles.cycleEyebrow}>{harvestFilter === 'current' ? t.harvestCycle.selectedCycle : t.harvestCycle.cycleHistory}</Text>
            <Text style={styles.cycleTitle}>
              {harvestFilter === 'current'
                ? selectedCycle?.cycleName || t.harvestCycle.noActiveCycle
                : historyCycleId === 'all'
                  ? t.harvestCycle.allCompletedCycles
                  : historicalCycles.find((cycle) => cycle.id === historyCycleId)?.cycleName || t.harvestCycle.cycleHistory}
            </Text>
            <Text style={styles.cycleSubtitle}>
              {harvestFilter === 'current'
                ? t.harvestCycle.activePonds
                  .replace('{{blockName}}', selectedCycle?.blockName || selectedCycle?.blockNames?.[0] || selectedCyclePonds[0]?.blockName || t.harvestCycle.blockFallback)
                  .replace('{{count}}', String(selectedCyclePonds.length))
                : t.harvestCycle.historicalRecords.replace('{{count}}', String(visibleHarvestRecords.length))}
            </Text>
          </View>
          <View style={styles.cycleBadge}>
            <Text style={styles.cycleBadgeText}>{visibleHarvestRecords.length}</Text>
          </View>
        </View>

        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, harvestFilter === 'current' && styles.filterButtonActive]}
            onPress={() => setHarvestFilter('current')}
          >
            <Text style={[styles.filterText, harvestFilter === 'current' && styles.filterTextActive]}>{t.harvestCycle.currentCycle}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, harvestFilter === 'history' && styles.filterButtonActive]}
            onPress={() => setHarvestFilter('history')}
          >
            <Text style={[styles.filterText, harvestFilter === 'history' && styles.filterTextActive]}>{t.harvestCycle.history}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cycleSelectorContainer}>
          {harvestFilter === 'current' ? (
            <CycleSelector
              label={t.harvestCycle.productionCycle}
              value={selectedCycleId}
              options={activeCycles}
              onChange={setSelectedCycleId}
              placeholder={t.harvestCycle.selectActiveCycle}
              sheetEyebrow={t.harvestCycle.harvestRecords}
              sheetTitle={t.harvestCycle.selectProductionCycle}
              emptyLabel={t.harvestCycle.noActiveCycles}
            />
          ) : (
            <CycleSelector
              label={t.harvestCycle.cycleHistory}
              value={historyCycleId}
              options={historicalCycles}
              onChange={setHistoryCycleId}
              includeAllHistory
              placeholder={t.harvestCycle.selectCompletedCycle}
              allHistoryLabel={t.harvestCycle.allHistory}
              sheetEyebrow={t.harvestCycle.harvestHistory}
              sheetTitle={t.harvestCycle.selectCompletedCycle}
              emptyLabel={t.harvestCycle.noCompletedCycles}
            />
          )}
        </View>

        <FlatList
          data={visibleHarvestRecords}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 80 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="cash-outline" size={80} color="#315f57" />
              <Text style={styles.emptyTitle}>{t.harvest.noRecords}</Text>
              <Text style={styles.emptySubtitle}>
                {harvestFilter === 'current'
                  ? (canEditHarvest ? t.harvest.currentCycleEmpty : t.harvest.noDataAvailable)
                  : t.harvest.historyEmpty}
              </Text>
            </View>
          }
          renderItem={({ item: harvest }) => {
              const totals = calculateTotals(harvest);
              return (
                <View key={harvest.id} style={styles.recordCard}>
                  <View style={styles.cardHeader}>
                    <TouchableOpacity style={styles.cardContent}
                      onPress={() => handleHarvestCardClick(harvest.id, harvest.date)}>
                      <Text style={styles.harvestTitle}>
                        {t.harvest.harvest} {new Date(harvest.date).toLocaleDateString()}
                      </Text>
                      <Text style={styles.dateText}>
                        {harvest.ponds.length} {t.harvest.pond}{harvest.ponds.length !== 1 ? 's' : ''}
                      </Text>
                      {harvest.cycleName ? (
                        <Text style={styles.recordCycleText} numberOfLines={1}>
                          {harvest.cycleName}{harvest.blockName ? ` · ${harvest.blockName}` : ''}
                        </Text>
                      ) : null}
                      <Text style={styles.harvestTypeSummary}>
                        {harvest.ponds.map((pond) => `${pond.pondName}: ${getHarvestTypeLabel(pond)}`).join(' • ')}
                      </Text>
                    </TouchableOpacity>
                    {canEditHarvest && canModifyHarvestRecord(harvest.id) && (
                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => handleEditHarvest(harvest)}
                          accessibilityRole="button"
                          accessibilityLabel={`${t.actions.edit} ${t.harvest.harvest}`}
                        >
                          <Ionicons name="pencil-outline" size={20} color="#0F4C75" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.deleteButton}
                          onPress={() => handleDeleteHarvest(harvest.id)}>
                          <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => handleHarvestCardClick(harvest.id, harvest.date)}>
                    <View style={styles.parametersContainer}>
                      <View style={styles.parameterRow}>
                        <SummaryItem iconName="scale-outline" label={t.harvest.totalBiomass}
                          value={totals.totalBiomass.toLocaleString('id-ID')} />
                        <SummaryItem iconName="resize-outline" label={t.harvest.averageSize} 
                          value={totals.averageSize.toFixed(1)} />
                      </View>
                      <View style={styles.parameterRow}>
                        <SummaryItem iconName="cash-outline" label={t.harvest.totalPrice} 
                          value={formatCurrency(totals.totalPrice)} />
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            }}
        />

        {canEditHarvest && (
          <TouchableOpacity
            style={[styles.floatingButton, { bottom: Math.max(insets.bottom, 30) }, selectedCyclePonds.length === 0 && styles.floatingButtonDisabled]}
            onPress={() => {
              if (selectedCyclePonds.length === 0) {
                Alert.alert(t.messages.error, t.harvest.startPondCycleFirst);
                return;
              }
              setHarvestDate(getFarmDateKey(new Date(), company?.timeZone));
              setEditingHarvest(null);
              submitLockRef.current = false;
              setIsSubmitting(false);
              setPondData(initializePondData());
              setExpandedPondId(selectedCyclePonds[0]?.id ?? null);
              setSecondaryPondIds([]);
              setAutoFilledSizes({});
              setIsModalVisible(true);
            }}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        )}

        <Modal visible={isModalVisible} animationType="slide" transparent>
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingHarvest ? `${t.actions.edit} ${t.harvest.harvest}` : t.harvest.addRecord}
                </Text>
                <TouchableOpacity
                  onPress={handleModalClose}
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel={t.harvest.close}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color="#315f57" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                showsVerticalScrollIndicator={false} 
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
              >
                <View style={styles.harvestContextCard}>
                  <View style={styles.harvestContextCopy}>
                    <Text style={styles.harvestContextValue}>{editingHarvest?.cycleName || formCycle?.cycleName}</Text>
                    <Text style={styles.harvestContextMeta}>
                      {editingHarvest?.blockName || formCycle?.blockName || formCycle?.blockNames?.[0] || formPonds[0]?.blockName || t.harvestCycle.blockNotAssigned}
                    </Text>
                  </View>
                  <View style={styles.harvestDateField}>
                    <AppDatePicker
                      label={t.harvestCycle.harvestDate}
                      value={harvestDate}
                      maximumDate={new Date()}
                      onChange={(date) => changeHarvestDate(getFarmDateKey(date, company?.timeZone))}
                      cancelLabel={t.actions.cancel}
                      confirmLabel={t.actions.confirm}
                    />
                  </View>
                </View>

                <View style={styles.progressCard}>
                  <View style={styles.progressTextRow}>
                    <Text style={styles.progressLabel}>{t.harvest.harvestProgress}</Text>
                    <Text style={styles.progressCount}>
                      {t.harvest.pondsCompleted
                        .replace('{{completed}}', String(completedPondCount))
                        .replace('{{total}}', String(formPonds.length))}
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${formPonds.length > 0 ? (completedPondCount / formPonds.length) * 100 : 0}%` },
                      ]}
                    />
                  </View>
                </View>

                {formPonds.map((pond) => {
                  const currentPondData = pondData.find(p => p.pondId === pond.id);
                  if (!currentPondData) return null;
                  const harvestSampling = getHarvestDateSampling(pond, harvestDate);
                  const sampledMbw = getSamplingMbw(harvestSampling);
                  const sampledSize = getSamplingSize(harvestSampling);
                  const samplingFeedStatus = samplingFeedStatuses[pond.id] || 'not_recorded';
                  const isExpanded = expandedPondId === pond.id;
                  const hasData = hasAnyHarvestData(currentPondData);
                  const isComplete = Boolean(harvestSampling) && isPondEntryComplete(currentPondData);
                  const showSecondaryHarvest = secondaryPondIds.includes(pond.id);
                  const hasSecondaryData = !!(
                    currentPondData.subBiomass || currentPondData.subSize || currentPondData.subPrice
                  );
                  const harvestTypeLabel = currentPondData.harvestType === 'partial'
                    ? t.harvest.partialHarvest
                    : t.harvest.finalHarvest;
                  const biomassTotal = getHarvestBiomass(currentPondData);

                  return (
                    <View key={pond.id} style={[styles.pondSection, isExpanded && styles.pondSectionExpanded]}>
                      <TouchableOpacity
                        style={styles.pondAccordionHeader}
                        onPress={() => setExpandedPondId(isExpanded ? null : pond.id)}
                        accessibilityRole="button"
                        accessibilityState={{ expanded: isExpanded }}
                      >
                        <View style={styles.pondAccordionTitleGroup}>
                          <View style={styles.pondTitleRow}>
                            <Text style={styles.pondSectionTitle}>{pond.pondName}</Text>
                            {isComplete && (
                              <Ionicons name="checkmark-circle" size={18} color="#2e7d63" />
                            )}
                          </View>
                          <Text style={[
                            styles.pondEntryStatus,
                            isComplete && styles.pondEntryStatusComplete,
                            hasData && !isComplete && styles.pondEntryStatusInProgress,
                          ]}>
                            {!harvestSampling
                              ? t.harvest.samplingRequired
                              : isComplete
                              ? `${harvestTypeLabel} · ${biomassTotal.toLocaleString()} · ${currentPondData.size || currentPondData.subSize} ${t.harvest.pcsPerKg}`
                              : hasData
                                ? t.harvest.inProgress
                                : t.harvest.notEntered}
                          </Text>
                        </View>
                        <Ionicons
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          size={20}
                          color="#315f57"
                        />
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={styles.pondFormContent}>

                      {!harvestSampling ? (
                        <View style={styles.samplingGuardCard}>
                          <View style={styles.samplingGuardHeader}>
                            <Ionicons name="alert-circle-outline" size={17} color="#8A5700" />
                            <Text style={styles.samplingGuardTitle}>{t.harvest.samplingRequired}</Text>
                            <Text style={styles.samplingGuardDate}>{harvestDate}</Text>
                          </View>
                          <View style={styles.compactSamplingRow}>
                            <View style={styles.compactSamplingInputGroup}>
                              <Text style={styles.compactSamplingLabel}>{t.harvest.samplingMbw}</Text>
                              <TextInput
                                style={styles.compactSamplingInput}
                                keyboardType="numeric"
                                value={samplingMbwDrafts[pond.id] || ''}
                                onChangeText={(value: string) => setSamplingMbwDrafts((current) => ({ ...current, [pond.id]: value }))}
                                placeholder="e.g., 15.5"
                                placeholderTextColor="#8A7A62"
                              />
                            </View>
                            <TouchableOpacity style={styles.saveSamplingButton} onPress={() => saveRequiredSampling(pond)}>
                              <Text style={styles.saveSamplingButtonText}>{t.harvest.saveSampling}</Text>
                            </TouchableOpacity>
                          </View>
                          <View style={styles.feedStatusRow}>
                            <Text style={styles.feedStatusLabel}>{t.harvest.feedStatusLabel}</Text>
                            {(['not_recorded', 'fasted'] as HarvestDayFeedStatus[]).map((status) => (
                              <TouchableOpacity
                                key={status}
                                style={[styles.feedStatusChip, samplingFeedStatus === status && styles.feedStatusChipActive]}
                                onPress={() => setSamplingFeedStatuses((current) => ({ ...current, [pond.id]: status }))}
                              >
                                <Text style={[styles.feedStatusChipText, samplingFeedStatus === status && styles.feedStatusChipTextActive]}>
                                  {status === 'fasted' ? t.harvest.fasted : t.harvest.enterFeedLater}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      ) : (
                        <>
                      <View style={styles.samplingReadyCard}>
                        <Ionicons name="checkmark-circle" size={18} color="#2e7d63" />
                        <Text style={styles.samplingReadyText}>
                          {t.harvest.samplingReady
                            .replace('{{mbw}}', sampledMbw.toFixed(2))
                            .replace('{{size}}', String(sampledSize))}
                        </Text>
                      </View>

                      <Text style={styles.inputLabel}>{t.harvest.harvestType}</Text>
                      <View style={styles.harvestTypeSelector}>
                        {(['partial', 'final'] as HarvestType[]).map((harvestType) => (
                          <TouchableOpacity
                            key={harvestType}
                            accessibilityRole="button"
                            style={[
                              styles.harvestTypeOption,
                              currentPondData.harvestType === harvestType && styles.harvestTypeOptionActive,
                            ]}
                            onPress={() => updatePondField(pond.id, 'harvestType', harvestType)}
                          >
                            <Text style={[
                              styles.harvestTypeOptionText,
                              currentPondData.harvestType === harvestType && styles.harvestTypeOptionTextActive,
                            ]}>
                              {harvestType === 'partial' ? t.harvest.partialHarvest : t.harvest.finalHarvest}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <View style={styles.harvestRow}>
                        <View style={styles.inputGroup}>
                          <Input label={t.harvest.size} value={currentPondData.size}
                            onChangeText={(text: string) => updatePondField(pond.id, "size", text)}
                            placeholder={t.harvest.sizePlaceholder} />
                        </View>
                        <View style={styles.inputGroup}>
                          <Input label={t.harvest.biomassKg} value={currentPondData.biomass}
                            onChangeText={(text: string) => updatePondField(pond.id, "biomass", text)}
                            placeholder={t.harvest.biomassPlaceholder} />
                        </View>
                      </View>

                      <View style={styles.singleRow}>
                        <Input label={`${t.harvest.pricePerKg} (${currencyConfig.symbol})`} value={currentPondData.price}
                          onChangeText={(text: string) => updatePondField(pond.id, "price", text)}
                          placeholder={t.harvest.pricePlaceholder} />
                      </View>

                      <TouchableOpacity
                        style={styles.secondaryToggle}
                        onPress={() => toggleSecondaryHarvest(pond.id)}
                        accessibilityRole="button"
                      >
                        <Ionicons
                          name={showSecondaryHarvest ? "remove-circle-outline" : "add-circle-outline"}
                          size={19}
                          color="#315f57"
                        />
                        <Text style={styles.secondaryToggleText}>
                          {showSecondaryHarvest
                            ? t.harvest.hideSecondarySize
                            : hasSecondaryData
                              ? t.harvest.showSecondarySize
                              : t.harvest.addSecondarySize}
                        </Text>
                      </TouchableOpacity>

                      {showSecondaryHarvest && (
                        <View style={styles.secondaryFields}>
                          <View style={styles.harvestRow}>
                            <View style={styles.inputGroup}>
                              <Input label={t.harvest.subSize} value={currentPondData.subSize}
                                onChangeText={(text: string) => updatePondField(pond.id, "subSize", text)}
                                placeholder={t.harvest.subSizePlaceholder} />
                            </View>
                            <View style={styles.inputGroup}>
                              <Input label={t.harvest.subBiomassKg} value={currentPondData.subBiomass}
                                onChangeText={(text: string) => updatePondField(pond.id, "subBiomass", text)}
                                placeholder={t.harvest.subBiomassPlaceholder} />
                            </View>
                          </View>

                          <View style={styles.singleRow}>
                            <Input label={`${t.harvest.pricePerKg} (${currencyConfig.symbol})`} value={currentPondData.subPrice}
                              onChangeText={(text: string) => updatePondField(pond.id, "subPrice", text)}
                              placeholder={t.harvest.subPricePlaceholder} />
                          </View>
                        </View>
                      )}

                      <TouchableOpacity
                        style={[styles.nextPondButton, !isComplete && styles.nextPondButtonDisabled]}
                        onPress={() => openNextPond(pond.id)}
                        disabled={!isComplete}
                        accessibilityRole="button"
                      >
                        <Text style={[styles.nextPondButtonText, !isComplete && styles.nextPondButtonTextDisabled]}>
                          {formPonds[formPonds.length - 1]?.id === pond.id
                            ? t.harvest.finishPondEntry
                            : t.harvest.nextPond}
                        </Text>
                        <Ionicons
                          name={formPonds[formPonds.length - 1]?.id === pond.id ? "checkmark" : "arrow-forward"}
                          size={18}
                          color={isComplete ? "#FFFFFF" : "#8ba2b3"}
                        />
                      </TouchableOpacity>
                        </>
                      )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>

              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.cancelButton} onPress={handleModalClose}>
                  <Text style={styles.cancelButtonText}>{t.actions.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.addButton,
                    (isSubmitting || enteredPondCount === 0) && styles.addButtonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={isSubmitting || enteredPondCount === 0}
                >
                  <Text style={styles.addButtonText}>
                    {t.harvest.saveHarvests.replace('{{count}}', String(completedPondCount))}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal visible={deleteModalVisible} animationType="fade" transparent>
          <View style={styles.deleteModalContainer}>
            <View style={styles.deleteModalContent}>
              <View style={styles.deleteModalIcon}>
                <Ionicons name="warning-outline" size={48} color="#e74c3c" />
              </View>
              <Text style={styles.deleteModalTitle}>{currentLanguage === 'id' ? 'Batalkan panen?' : 'Void harvest?'}</Text>
              <Text style={styles.deleteModalText}>{currentLanguage === 'id' ? 'Panen dan pendapatannya akan dibatalkan. Riwayat dan pembayaran yang dikonfirmasi tetap disimpan. Catat pengembalian dana secara terpisah.' : 'This voids the harvest and its revenue. History and confirmed payments are retained. Record any refund separately.'}</Text>
              <View style={styles.deleteModalButtons}>
                <TouchableOpacity style={styles.deleteModalCancelButton} onPress={cancelDeleteHarvest}>
                  <Text style={styles.deleteModalCancelText}>{t.actions.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteModalConfirmButton} onPress={confirmDeleteHarvest}>
                  <Text style={styles.deleteModalConfirmText}>{currentLanguage === 'id' ? 'Batalkan panen' : 'Void harvest'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f8fc" },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: Platform.OS === 'android' ? 16 : 20, 
    paddingTop: Platform.OS === 'android' ? 16 : 20, 
    paddingBottom: Platform.OS === 'android' ? 16 : 20,
    backgroundColor: '#f4f8fc' 
  },
  screenTitle: { fontSize: 24, fontWeight: 'bold', color: '#0d2137', marginBottom: 20 },
  headerTitle: { fontSize: Platform.OS === 'android' ? 22 : 24, fontWeight: 'bold', color: '#0d2137', marginLeft: Platform.OS === 'android' ? 10 : 12 },
  cycleSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: Platform.OS === 'android' ? 16 : 20, marginBottom: 12, padding: 16, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#e8f2f9' },
  cycleSummaryText: { flex: 1, marginRight: 12 },
  cycleEyebrow: { color: '#315f57', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  cycleTitle: { color: '#0d2137', fontSize: 18, fontWeight: '800' },
  cycleSubtitle: { color: '#6b8aa0', fontSize: 12, fontWeight: '600', marginTop: 4 },
  cycleBadge: { minWidth: 38, height: 38, borderRadius: 19, backgroundColor: '#dce8f2', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#315f57' },
  cycleBadgeText: { color: '#0d2137', fontSize: 15, fontWeight: '800' },
  cycleSelectorContainer: { marginHorizontal: Platform.OS === 'android' ? 16 : 20, marginBottom: 12 },
  filterContainer: { flexDirection: 'row', marginHorizontal: Platform.OS === 'android' ? 16 : 20, marginBottom: 16, backgroundColor: '#dce8f2', borderRadius: 14, padding: 4, borderWidth: 1, borderColor: '#e8f2f9' },
  filterButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  filterButtonActive: { backgroundColor: '#0d2137' },
  filterText: { color: '#315f57', fontSize: 13, fontWeight: '700' },
  filterTextActive: { color: '#FFFFFF' },
  scrollContent: { padding: Platform.OS === 'android' ? 16 : 20, paddingTop: 0 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyTitle: { color: '#0d2137', fontSize: 24, fontWeight: 'bold', marginTop: 20 },
  emptySubtitle: { color: '#0d2137', fontSize: 16, marginTop: 8, lineHeight: 22 },
  recordCard: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e8f2f9', shadowColor: '#315f57', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  cardContent: { flex: 1 },
  cardActions: { flexDirection: 'row', gap: 6, marginLeft: 8 },
  editButton: { padding: 8, backgroundColor: 'rgba(15, 76, 117, 0.08)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(15, 76, 117, 0.22)' },
  harvestTitle: { fontSize: 20, fontWeight: 'bold', color: '#0d2137' },
  dateText: { color: '#0d2137', fontSize: 12, marginTop: 4 },
  recordCycleText: { color: '#6b8aa0', fontSize: 11, fontWeight: '700', marginTop: 4 },
  harvestTypeSummary: { color: '#315f57', fontSize: 12, fontWeight: '700', marginTop: 6 },
  deleteButton: { padding: 8, backgroundColor: 'rgba(231, 76, 60, 0.1)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(231, 76, 60, 0.3)' },
  parametersContainer: { gap: 12 },
  parameterRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { flex: 1, flexDirection: 'row', alignItems: 'center', marginHorizontal: 4, minWidth: 0 },
  summaryLabel: { color: '#0d2137', fontSize: 12, marginLeft: 6, width: 80, flexShrink: 0 },
  summaryValue: { fontSize: 12, fontWeight: '600', textAlign: 'right', flex: 1, color: '#0d2137' },
  floatingButton: { position: 'absolute', right: 30, backgroundColor: '#0d2137', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#315f57', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  floatingButtonDisabled: { opacity: 0.5 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(15, 76, 117, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, width: '100%', maxHeight: '85%', borderWidth: 1, borderColor: '#e8f2f9', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 0 },
  modalTitle: { flex: 1, marginRight: 12, fontSize: 24, fontWeight: 'bold', color: '#0d2137' },
  closeButton: { padding: 4 },
  harvestContextCard: { marginBottom: 14, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#D8E7F0', backgroundColor: '#F8FBFD', gap: 14 },
  harvestContextCopy: { minWidth: 0 },
  harvestContextValue: { color: '#102F46', fontSize: 16, fontWeight: '900' },
  harvestContextMeta: { marginTop: 3, color: '#78909C', fontSize: 11, fontWeight: '700' },
  harvestDateField: { minWidth: 0 },
  modalScrollView: { paddingHorizontal: 20 },
  modalScrollContent: { paddingTop: 20, paddingBottom: 12 },
  progressCard: { backgroundColor: '#f4f8fc', borderWidth: 1, borderColor: '#e8f2f9', borderRadius: 14, padding: 14, marginBottom: 14 },
  progressTextRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  progressLabel: { color: '#0d2137', fontSize: 14, fontWeight: '800' },
  progressCount: { color: '#315f57', fontSize: 12, fontWeight: '700', textAlign: 'right', flexShrink: 1 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: '#dce8f2', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: '#2e7d63' },
  pondSection: { marginBottom: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#e8f2f9', borderRadius: 14, overflow: 'hidden' },
  pondSectionExpanded: { borderColor: '#8fb7d1' },
  pondAccordionHeader: { minHeight: 66, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  pondAccordionTitleGroup: { flex: 1, minWidth: 0 },
  pondTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  pondSectionTitle: { color: '#0d2137', fontSize: 15, fontWeight: '800', flexShrink: 1 },
  pondEntryStatus: { color: '#6b8aa0', fontSize: 12, fontWeight: '600', marginTop: 4 },
  pondEntryStatusComplete: { color: '#2e7d63' },
  pondEntryStatusInProgress: { color: '#b7791f' },
  pondFormContent: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#e8f2f9', backgroundColor: '#fbfdff' },
  samplingGuardCard: { padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#F1C27D', backgroundColor: '#FFF8EA' },
  samplingGuardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 9 },
  samplingGuardTitle: { flex: 1, color: '#8A5700', fontSize: 13, fontWeight: '800' },
  samplingGuardDate: { color: '#8A5700', fontSize: 11, fontWeight: '700' },
  compactSamplingRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  compactSamplingInputGroup: { flex: 1, minWidth: 0 },
  compactSamplingLabel: { color: '#6B4B16', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  compactSamplingInput: { minHeight: 40, borderWidth: 1, borderColor: '#D7B36F', paddingHorizontal: 11, borderRadius: 8, backgroundColor: '#FFFFFF', color: '#0d2137', fontSize: 14 },
  saveSamplingButton: { minHeight: 40, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#0F4C75', alignItems: 'center', justifyContent: 'center' },
  saveSamplingButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  feedStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  feedStatusLabel: { color: '#6B4B16', fontSize: 10, fontWeight: '700' },
  feedStatusChip: { minHeight: 28, paddingHorizontal: 9, borderRadius: 14, borderWidth: 1, borderColor: '#D7B36F', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  feedStatusChipActive: { borderColor: '#0F4C75', backgroundColor: '#EAF6FD' },
  feedStatusChipText: { color: '#6B4B16', fontSize: 10, fontWeight: '700' },
  feedStatusChipTextActive: { color: '#0F4C75' },
  samplingReadyCard: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 8, backgroundColor: '#EAF7F1', marginBottom: 10 },
  samplingReadyText: { flex: 1, color: '#246B52', fontSize: 11, fontWeight: '700' },
  harvestTypeSelector: { flexDirection: 'row', padding: 4, marginBottom: 16, borderRadius: 12, backgroundColor: '#f4f8fc', borderWidth: 1, borderColor: '#e8f2f9' },
  harvestTypeOption: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 9 },
  harvestTypeOptionActive: { backgroundColor: '#0d2137' },
  harvestTypeOptionText: { color: '#315f57', fontSize: 13, fontWeight: '700' },
  harvestTypeOptionTextActive: { color: '#FFFFFF' },
  harvestRow: { flexDirection: 'row', gap: 12, marginBottom: 0 },
  singleRow: { marginBottom: 0 },
  secondaryToggle: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: '#b9d4e6', borderRadius: 10, backgroundColor: '#f4f8fc', marginBottom: 14 },
  secondaryToggleText: { color: '#315f57', fontSize: 13, fontWeight: '700' },
  secondaryFields: { paddingTop: 2 },
  nextPondButton: { minHeight: 44, borderRadius: 10, backgroundColor: '#315f57', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 2 },
  nextPondButtonDisabled: { backgroundColor: '#e8f2f9' },
  nextPondButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  nextPondButtonTextDisabled: { color: '#8ba2b3' },
  inputContainer: { marginBottom: 16 },
  inputLabel: { color: '#0d2137', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e8f2f9', padding: 16, borderRadius: 12, backgroundColor: '#f4f8fc', color: '#0d2137', fontSize: 16, includeFontPadding: false, textAlignVertical: 'center' },
  inputGroup: { flex: 1 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 14, paddingBottom: Platform.OS === 'android' ? 20 : 24, borderTopWidth: 1, borderTopColor: '#e8f2f9', backgroundColor: '#FFFFFF' },
  addButton: { backgroundColor: '#315f57', paddingVertical: Platform.OS === 'android' ? 14 : 16, paddingHorizontal: Platform.OS === 'android' ? 20 : 24, borderRadius: 12, alignItems: 'center', flex: 1, marginLeft: 6, shadowColor: '#315f57', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  addButtonDisabled: { opacity: 0.45, shadowOpacity: 0, elevation: 0 },
  addButtonText: { color: '#fff', fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: 'bold' },
  cancelButton: { backgroundColor: 'transparent', paddingVertical: Platform.OS === 'android' ? 14 : 16, paddingHorizontal: Platform.OS === 'android' ? 20 : 24, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e74c3c', flex: 1, marginRight: 6 },
  cancelButtonText: { color: '#e74c3c', fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: 'bold' },
  deleteModalContainer: { flex: 1, backgroundColor: 'rgba(15, 76, 117, 0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  deleteModalContent: { backgroundColor: '#0d2137', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400, alignItems: 'center', borderWidth: 1, borderColor: '#315f57' },
  deleteModalIcon: { marginBottom: 16 },
  deleteModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#f4f8fc', marginBottom: 12, textAlign: 'center' },
  deleteModalText: { fontSize: 16, color: '#f4f8fc', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  deleteModalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  deleteModalCancelButton: { flex: 1, backgroundColor: '#315f57', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center' },
  deleteModalCancelText: { color: '#f4f8fc', fontSize: 16, fontWeight: '600' },
  deleteModalConfirmButton: { flex: 1, backgroundColor: '#e74c3c', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center' },
  deleteModalConfirmText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
