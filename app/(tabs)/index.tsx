// app/(tabs)/index.tsx - Fully translated version with keyboard handling
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { 
  FlatList, Modal, Platform, ScrollView, StatusBar, StyleSheet, 
  Text, TextInput, TouchableOpacity, View, Alert, KeyboardAvoidingView,
  Keyboard, TouchableWithoutFeedback
} from 'react-native';
import { usePondStore, type FarmCycle, type Pond, type Sampling, type PondCycleEndReason, getActiveFarmCycle, getPhysicalPondKey, getPondCurrentDoc, getPondCycleStatus, getPondPlSupplier, isBaselineSampling, isPondCycleActive } from '.././store/pondStore';
import { useFirebaseSync } from '.././hooks/useFirebaseSync';
import { db } from '../../config/firebase';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import ShrimpIcon from '../components/icons/ShrimpIcon';

interface FormData {
  pondName: string; 
  pondArea: string; 
  density: string; 
  supplier: string; 
  plValue: string; 
  docStart: Date;
  cycleStartMode: 'new' | 'midcycle';
  baselineDate: Date;
  baselineDoc: string;
  baselineMbw: string;
  baselineEstimatedPopulation: string;
  baselineSurvivalRate: string;
  baselineCumulativeFeed: string;
  cyclePondId: string;
  selectedPond: string; 
  mbw: string; 
  mortality: string; 
  feed: string; 
  samplingDate: Date;
}

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
  hint 
}: {
  label: string; 
  value: string; 
  onChangeText: (text: string) => void; 
  placeholder: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad'; 
  hint?: string;
}) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput 
      placeholder={placeholder} 
      value={value} 
      onChangeText={onChangeText} 
      keyboardType={keyboardType}
      style={styles.input} 
      placeholderTextColor="#6b8aa0" 
    />
    {hint && <Text style={styles.inputHint}>{hint}</Text>}
  </View>
));
InputField.displayName = 'InputField';

const DateInput = React.memo(({ 
  label, 
  date, 
  onPress 
}: { 
  label: string; 
  date: Date; 
  onPress: () => void 
}) => {
  const displayDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();

  return (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity style={styles.dateInput} onPress={onPress}>
        <Text style={styles.dateText}>{displayDate.toLocaleDateString()}</Text>
        <Ionicons name="calendar-outline" size={20} color="#dce8f2" />
      </TouchableOpacity>
    </View>
  );
});
DateInput.displayName = 'DateInput';

export default function PondManagementScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, company } = useAuth();
  const canEditPonds = user?.role === 'technician' || user?.role === 'owner';
  
  const { 
    ponds, 
    cycles,
    addPond, 
    updatePond,
    addSampling, 
    endPondCycle, 
    updateFarmCycle,
    closeFarmCycle,
    calculatePondMetricsWithHarvest, 
    switchAccount, 
    setFirebaseSync 
  } = usePondStore();
  
  const firebaseSync = useFirebaseSync();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [cycleFilter, setCycleFilter] = useState<'active' | 'ended'>('active');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const [modalType, setModalType] = useState<'pond' | 'sampling' | 'cycle' | 'baseline'>('pond');
  const [datePickerField, setDatePickerField] = useState<'docStart' | 'samplingDate' | 'baselineDate'>('docStart');
  const [tempDate, setTempDate] = useState(new Date());
  const tempDateRef = useRef(new Date());
  const originalDateRef = useRef(new Date());
  const [cycleNameDraft, setCycleNameDraft] = useState('');
  const [cycleManagerExpanded, setCycleManagerExpanded] = useState(false);
  const [editingBaselinePondId, setEditingBaselinePondId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    pondName: '', 
    pondArea: '', 
    density: '', 
    supplier: '', 
    plValue: '', 
    docStart: new Date(),
    cycleStartMode: 'new',
    baselineDate: new Date(),
    baselineDoc: '',
    baselineMbw: '',
    baselineEstimatedPopulation: '',
    baselineSurvivalRate: '',
    baselineCumulativeFeed: '',
    cyclePondId: '',
    selectedPond: '', 
    mbw: '', 
    mortality: '', 
    feed: '', 
    samplingDate: new Date()
  });

  useEffect(() => {
    if (modalVisible) {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }, [modalVisible]);

  useEffect(() => {
    if (company?.id) {
      switchAccount(company.id);
      setFirebaseSync({
        syncPond: firebaseSync.syncPond,
        syncSampling: firebaseSync.syncSampling,
        syncHarvestRecord: firebaseSync.syncHarvestRecord,
        syncCycle: firebaseSync.syncCycle,
      });
    }
  }, [
    company?.id, 
    firebaseSync.syncPond, 
    firebaseSync.syncSampling, 
    firebaseSync.syncHarvestRecord, 
    firebaseSync.syncCycle,
    switchAccount, 
    setFirebaseSync
  ]);

  const updateForm = useCallback((key: keyof FormData, value: any) => 
    setFormData(prev => ({ ...prev, [key]: value })), 
  []);
  
  const resetForm = useCallback(() => setFormData({
    pondName: '', 
    pondArea: '', 
    density: '', 
    supplier: '', 
    plValue: '', 
    docStart: new Date(),
    cycleStartMode: 'new',
    baselineDate: new Date(),
    baselineDoc: '',
    baselineMbw: '',
    baselineEstimatedPopulation: '',
    baselineSurvivalRate: '',
    baselineCumulativeFeed: '',
    cyclePondId: '',
    selectedPond: '', 
    mbw: '', 
    mortality: '', 
    feed: '', 
    samplingDate: new Date()
  }), []);

  const convertPlToGrams = useCallback((plValue: string): number => {
    const numericValue = parseFloat(plValue);
    return isNaN(numericValue) ? 0 : numericValue / 10;
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

  const activePonds = useMemo(() => ponds.filter(isPondCycleActive), [ponds]);
  const endedPonds = useMemo(() => ponds.filter((pond) => !isPondCycleActive(pond)), [ponds]);
  const activePhysicalPondNames = useMemo(
    () => new Set(activePonds.map((pond) => getPhysicalPondKey(pond.pondName))),
    [activePonds]
  );
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

    return Array.from(latestByPondName.values()).sort((a, b) => a.pondName.localeCompare(b.pondName));
  }, [activePhysicalPondNames, endedPonds]);
  const inferredFarmCycle = useMemo<FarmCycle | undefined>(() => {
    if (cycles.length > 0 || ponds.length === 0) return undefined;

    const groupedPonds = ponds.reduce((groups, pond) => {
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
  }, [cycles.length, ponds, t.farmCycle.currentCycle]);
  const activeFarmCycle = useMemo(() => getActiveFarmCycle(cycles) || inferredFarmCycle, [cycles, inferredFarmCycle]);
  const currentCyclePonds = useMemo(() => {
    if (!activeFarmCycle) return activePonds;
    return ponds.filter((pond) =>
      pond.cycleId === activeFarmCycle.id ||
      (activeFarmCycle.id === 'legacy-active-cycle' && !pond.cycleId) ||
      (!pond.cycleId && isPondCycleActive(pond))
    );
  }, [activeFarmCycle, activePonds, ponds]);
  const activeCyclePonds = useMemo(() => currentCyclePonds.filter(isPondCycleActive), [currentCyclePonds]);
  const currentCycleTitle = activeFarmCycle?.cycleName || (currentCyclePonds.length > 0 ? t.farmCycle.currentCycle : t.farmCycle.noActiveCycle);
  const currentCycleStatus = activeFarmCycle?.status || (currentCyclePonds.length > 0 ? t.farmCycle.status.active : t.farmCycle.status.waiting);
  const visiblePonds = useMemo(
    () => ponds.filter((pond) => getPondCycleStatus(pond) === cycleFilter),
    [ponds, cycleFilter]
  );

  useEffect(() => {
    setCycleNameDraft(activeFarmCycle?.cycleName || '');
  }, [activeFarmCycle?.id, activeFarmCycle?.cycleName]);

  const getLatestSampling = useCallback((pondId: string): Sampling | null => {
    const pond = ponds.find(p => p.id === pondId);
    const samples = (pond?.samplings || []).filter((sample) =>
      !isBaselineSampling(sample) && Number(sample.mbw) > 0
    );
    return samples.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0] || null;
  }, [ponds]);

  const getLastADG = useCallback((pondId: string): number => {
    const pond = ponds.find(p => p.id === pondId);
    if (!pond) return 0;
    
    const samples = (pond.samplings || [])
      .filter((sample) => !isBaselineSampling(sample))
      .filter((sample) => Number(sample.mbw) > 0)
      .sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const baselineSampling = (pond.samplings || [])
      .filter(isBaselineSampling)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    if (!samples.length) return 0;

    const getTimeDiff = (date1: string, date2: string) => {
      const diff = new Date(date1).getTime() - new Date(date2).getTime();
      return diff / (1000 * 60 * 60 * 24);
    };

    const currentSampling = samples[samples.length - 1];
    const currentSamplingTime = new Date(currentSampling.date).getTime();
    const baselineSamplingTime = baselineSampling ? new Date(baselineSampling.date).getTime() : Number.NaN;
    const validBaselineSampling = baselineSampling &&
      Number.isFinite(baselineSamplingTime) &&
      baselineSamplingTime < currentSamplingTime
      ? baselineSampling
      : undefined;
    const previousSampling = [...samples]
      .reverse()
      .find((sample) => new Date(sample.date).getTime() < currentSamplingTime) || validBaselineSampling;
    const currentWeight = Number(currentSampling.mbw);
    const previousWeight = Number(previousSampling?.mbw ?? pond.initialWeight ?? 0.5);
    const previousDate = previousSampling?.date || pond.docStart;
    const daysDiff = getTimeDiff(currentSampling.date, previousDate);
    
    if (isNaN(currentWeight) || isNaN(previousWeight) || daysDiff <= 0) return 0;
    const adg = (currentWeight - previousWeight) / daysDiff;
    return isNaN(adg) ? 0 : adg;
  }, [ponds]);

  const calculateMetrics = useCallback((pond: Pond) => {
    const metrics = calculatePondMetricsWithHarvest(pond);
    const latestSampling = getLatestSampling(pond.id);
    const currentMbw = latestSampling ? Number(latestSampling.mbw) : Number(pond.initialWeight);
    const size = (currentMbw && currentMbw > 0) 
      ? (1000 / currentMbw).toFixed(0) 
      : '0';
      
    return {
      doc: getPondCurrentDoc(pond),
      totalBiomass: metrics.currentBiomass,
      sr: metrics.adjustedSR.toFixed(1), 
      size,
      currentPopulation: metrics.currentPopulation, 
      latestSampling,
      fcr: metrics.adjustedFCR.toFixed(2),
    };
  }, [calculatePondMetricsWithHarvest, getLatestSampling]);

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

  const handleAddPond = useCallback(() => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setIsSubmitting(true);

    if (!canEditPonds) {
      Alert.alert(
        t.home.permissionDenied, 
        t.home.onlyTechniciansCanAdd, 
        [{ text: t.actions.confirm }]
      );
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }
    
    const { 
      pondName, 
      pondArea, 
      density, 
      docStart, 
      supplier, 
      plValue,
      cycleStartMode,
      baselineMbw,
      baselineEstimatedPopulation,
      baselineSurvivalRate,
      baselineCumulativeFeed
    } = formData;
    
    if (!pondName || !pondArea || !density || !supplier || !plValue) {
      Alert.alert(t.messages.error, t.home.fillAllFields);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    if (activePhysicalPondNames.has(getPhysicalPondKey(pondName))) {
      Alert.alert(t.messages.error, t.farmCycle.activeDuplicateMessage.replace('{{pondName}}', pondName));
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
      Alert.alert(t.messages.error, 'Start date must be today or earlier for an existing cycle.');
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const initialPopulation = Number(pondArea) * Number(density);
    const baselineDateString = baselineDate.toISOString().split('T')[0];
    const effectiveDocStart = docStart;
    const docStartString = effectiveDocStart.toISOString().split('T')[0];
    const savedBaselineDoc = isMidcycle ? baselineDocValue : 0;
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
      ...(activeFarmCycle?.id ? { cycleId: activeFarmCycle.id } : {}),
      ...(activeFarmCycle?.cycleName ? { cycleName: activeFarmCycle.cycleName } : {}),
    }] : [];
    
    addPond({
      id: Date.now().toString(), 
      pondName, 
      supplier, 
      plSupplier: supplier,
      pondArea: Number(pondArea), 
      density: Number(density),
      initialPopulation,
      docStart: docStartString,
      initialWeight: convertPlToGrams(plValue), 
      samplings: baselineSampling,
      totalHarvestedBiomass: 0, 
      totalHarvestedPopulation: 0, 
      totalHarvestedFeed: 0,
      cycleId: activeFarmCycle?.id,
      cycleName: activeFarmCycle?.cycleName,
      cycleStatus: 'active',
      cycleStartedAt: docStartString,
      cycleStartMode,
      ...(isMidcycle && {
        baselineDate: baselineDateString,
        baselineDoc: savedBaselineDoc,
        baselineMbw: baselineMbwValue,
        baselineEstimatedPopulation: Number.isNaN(baselinePopulationValue) ? undefined : baselinePopulationValue,
        baselineSurvivalRate: Number.isNaN(baselineSurvivalValue) ? undefined : baselineSurvivalValue,
        baselineCumulativeFeed: Number.isNaN(baselineFeedValue) ? undefined : baselineFeedValue,
        baselineSource: 'user_midcycle_estimate',
      }),
    });
    
    closeModal();
    Alert.alert(t.messages.success, t.home.pondAddedSuccess);
  }, [activeFarmCycle, activePhysicalPondNames, calculateDocFromDates, canEditPonds, closeModal, formData, addPond, convertPlToGrams, t]);

  const handleAddCycle = useCallback(() => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setIsSubmitting(true);

    if (!canEditPonds) {
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
    } = formData;

    const sourcePond = startableEndedPonds.find((pond) => pond.id === cyclePondId);
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

    addPond({
      id: Date.now().toString(),
      pondName: sourcePond.pondName,
      supplier,
      plSupplier: supplier,
      pondArea: sourcePond.pondArea,
      density: Number(density),
      initialPopulation: sourcePond.pondArea * Number(density),
      docStart: docStart.toISOString().split('T')[0],
      initialWeight: convertPlToGrams(plValue),
      samplings: [],
      totalHarvestedBiomass: 0,
      totalHarvestedPopulation: 0,
      totalHarvestedFeed: 0,
      cycleId: activeFarmCycle?.id,
      cycleName: activeFarmCycle?.cycleName,
      cycleStatus: 'active',
      cycleStartedAt: docStart.toISOString().split('T')[0],
      previousCyclePondId: sourcePond.id,
    });

    closeModal();
    setCycleFilter('active');
    Alert.alert(t.messages.success, t.farmCycle.cycleStartedSuccess.replace('{{pondName}}', sourcePond.pondName));
  }, [activeFarmCycle, activePhysicalPondNames, addPond, canEditPonds, closeModal, convertPlToGrams, formData, startableEndedPonds, t]);

  const handleAddSamplingData = useCallback(() => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setIsSubmitting(true);

    if (!canEditPonds) {
      Alert.alert(t.home.permissionDenied, t.home.onlyTechniciansCanAdd, [{ text: t.actions.confirm }]);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }
    
    const { selectedPond, mbw, mortality, feed, samplingDate } = formData;
    if (!selectedPond || !mbw || mortality === '') {
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
      mbw: Number(mbw), 
      mortality: Number(mortality),
      feed: Number(feed), 
      date: samplingDate.toISOString().split('T')[0],
      // No feedData here - sampling doesn't deduct from inventory
    });
    
    closeModal();
    Alert.alert(t.messages.success, t.home.samplingAddedSuccess);
  }, [canEditPonds, closeModal, formData, activePonds, addSampling, t]);

  const handleEndPondCycle = useCallback((pond: Pond) => {
    if (!canEditPonds) {
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

    const endCycle = (reason: PondCycleEndReason) => {
      const today = new Date().toISOString().split('T')[0];
      endPondCycle(pond.id, today, reason, user?.uid);
      Alert.alert(t.messages.success, t.farmCycle.pondEndedSuccess.replace('{{pondName}}', pond.pondName));
    };

    Alert.alert(
      t.farmCycle.endCycleTitle,
      t.farmCycle.endPondCycleMessage.replace('{{pondName}}', pond.pondName),
      [
        { text: t.actions.cancel, style: 'cancel' },
        { text: t.farmCycle.reasons.harvested, onPress: () => endCycle('harvested') },
        { text: t.farmCycle.reasons.resetOther, onPress: () => endCycle('other') },
      ]
    );
  }, [canEditPonds, endPondCycle, t, user?.uid]);

  const handleRenameFarmCycle = useCallback(() => {
    if (!activeFarmCycle) return;
    const nextName = cycleNameDraft.trim();
    if (!nextName) {
      Alert.alert(t.messages.error, t.farmCycle.cycleNameRequired);
      return;
    }

    updateFarmCycle(activeFarmCycle.id, { cycleName: nextName });
    Alert.alert(t.messages.success, t.farmCycle.cycleNameUpdated);
  }, [activeFarmCycle, cycleNameDraft, t, updateFarmCycle]);

  const persistFarmCycleClose = useCallback(async (cycle: FarmCycle, cyclePonds: Pond[], closedAt: string) => {
    if (!company?.id || !user?.uid) {
      throw new Error('Missing company or user context.');
    }

    const batch = writeBatch(db);
    const cycleRef = doc(db, 'companies', company.id, 'cycles', cycle.id);
    batch.set(cycleRef, {
      ...cycle,
      status: 'closed',
      closedAt,
      stockingEndDate: cycle.stockingEndDate || closedAt,
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
      createdAt: cycle.createdAt || serverTimestamp(),
      createdBy: cycle.createdBy || user.uid,
    }, { merge: true });

    cyclePonds.forEach((pond) => {
      const pondRef = doc(db, 'companies', company.id, 'ponds', pond.id);
      batch.set(pondRef, {
        cycleId: pond.cycleId || cycle.id,
        cycleName: pond.cycleName || cycle.cycleName,
        pondCycleId: pond.pondCycleId || pond.id,
        cycleStatus: 'ended',
        cycleEndedAt: closedAt,
        cycleEndedBy: user.uid,
        cycleEndReason: pond.cycleEndReason || 'harvested',
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      }, { merge: true });
    });

    await batch.commit();
  }, [company?.id, user?.uid]);

  const handleCloseFarmCycle = useCallback(() => {
    if (!activeFarmCycle) return;

    const today = new Date().toISOString().split('T')[0];
    const reportCycleId = activeFarmCycle.id;
    const canViewCycleReport = ['owner', 'manager', 'admin'].includes(user?.role || '');
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
              await persistFarmCycleClose(activeFarmCycle, currentCyclePonds, today);
              closeFarmCycle(activeFarmCycle.id, today);
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
  }, [activeFarmCycle, closeFarmCycle, currentCyclePonds, persistFarmCycleClose, router, t, user?.role]);

  const handleDateChange = useCallback((
    confirmed: boolean, 
    selectedDate?: Date
  ) => {
    if (confirmed) {
      updateForm(datePickerField, normalizeDateValue(selectedDate || tempDateRef.current));
    } else if (Platform.OS === 'ios') {
      updateForm(datePickerField, normalizeDateValue(originalDateRef.current));
    }
    setShowDatePicker(false);
  }, [datePickerField, normalizeDateValue, updateForm]);

  const openDatePicker = useCallback((field?: 'docStart' | 'samplingDate' | 'baselineDate') => {
    const nextField = field || (modalType === 'sampling' ? 'samplingDate' : 'docStart');
    const nextDate = normalizeDateValue(formData[nextField]);
    setDatePickerField(nextField);
    originalDateRef.current = nextDate;
    tempDateRef.current = nextDate;
    setTempDate(nextDate);
    setShowDatePicker(true);
  }, [modalType, formData, normalizeDateValue]);

  const openModal = useCallback((type: 'pond' | 'sampling' | 'cycle' | 'baseline') => {
    setModalType(type); 
    setMenuModalVisible(false); 
    setModalVisible(true);
  }, []);

  const openBaselineEditModal = useCallback((pond: Pond) => {
    const baselineSampling = (pond.samplings || [])
      .filter(isBaselineSampling)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const baselineDate = pond.baselineDate || baselineSampling?.date || new Date().toISOString().split('T')[0];

    setEditingBaselinePondId(pond.id);
    setFormData((prev) => ({
      ...prev,
      baselineDate: normalizeDateValue(new Date(baselineDate)),
      baselineDoc: String(pond.baselineDoc ?? ''),
      baselineMbw: String(pond.baselineMbw ?? baselineSampling?.mbw ?? ''),
      baselineEstimatedPopulation: String(pond.baselineEstimatedPopulation ?? baselineSampling?.estimatedPopulation ?? ''),
      baselineSurvivalRate: String(pond.baselineSurvivalRate ?? baselineSampling?.estimatedSurvivalRate ?? ''),
      baselineCumulativeFeed: String(pond.baselineCumulativeFeed ?? baselineSampling?.cumulativeFeedToDate ?? baselineSampling?.feed ?? ''),
    }));
    setModalType('baseline');
    setModalVisible(true);
  }, [normalizeDateValue]);

  const handleUpdateBaseline = useCallback(() => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setIsSubmitting(true);

    if (!canEditPonds) {
      Alert.alert(t.home.permissionDenied, t.home.onlyTechniciansCanAdd, [{ text: t.actions.confirm }]);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const pond = ponds.find((item) => item.id === editingBaselinePondId);
    if (!pond) {
      Alert.alert(t.messages.error, t.messages.error);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const baselineDocValue = parseInt(formData.baselineDoc, 10);
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

    if (!formData.baselineDoc || Number.isNaN(baselineDocValue) || baselineDocValue < 0) {
      Alert.alert(t.messages.error, t.midcycleOnboarding.baselineDocRequired);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const baselineDateString = formData.baselineDate.toISOString().split('T')[0];
    const effectiveDocStart = new Date(formData.baselineDate.getTime() - baselineDocValue * 24 * 60 * 60 * 1000);
    const docStartString = effectiveDocStart.toISOString().split('T')[0];
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
    Alert.alert(t.messages.success, 'Baseline estimates updated.');
  }, [canEditPonds, closeModal, editingBaselinePondId, formData, ponds, t, updatePond]);

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
    openBaselineEditModal,
    router, 
    canEditPonds, 
    t
  ]);

  const renderPondForm = useMemo(() => (
    <>
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
        <Text style={styles.inputHint}>
          {formData.cycleStartMode === 'midcycle'
            ? t.midcycleOnboarding.existingCycleHint
            : t.midcycleOnboarding.newCycleHint}
        </Text>
      </View>
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
      <InputField 
        label={t.forms.density} 
        value={formData.density} 
        onChangeText={(value) => updateForm('density', value)} 
        placeholder={t.home.densityHint} 
        keyboardType="numeric" 
      />
      <DateInput 
        label={t.forms.startDate} 
        date={formData.docStart} 
        onPress={openDatePicker} 
      />
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
        hint={t.home.plHintDescription} 
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
  ), [formData, updateForm, openDatePicker, t]);

  const renderBaselineForm = useMemo(() => (
    <>
      <Text style={styles.inputHint}>
        Corrects the mid-cycle baseline estimate only. This will not deduct inventory or create normal sampling history.
      </Text>
      <DateInput
        label={t.midcycleOnboarding.baselineDate}
        date={formData.baselineDate}
        onPress={() => openDatePicker('baselineDate')}
      />
      <InputField
        label={t.midcycleOnboarding.currentDoc}
        value={formData.baselineDoc}
        onChangeText={(value) => updateForm('baselineDoc', value)}
        placeholder={t.midcycleOnboarding.currentDocPlaceholder}
        keyboardType="numeric"
      />
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
  ), [formData, openDatePicker, t, updateForm]);

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
        label={t.shrimp.mortality} 
        value={formData.mortality} 
        onChangeText={(value) => updateForm('mortality', value)} 
        placeholder={t.home.mortalityHint} 
        keyboardType="numeric" 
      />
      <InputField 
        label={t.shrimp.feedAmount} 
        value={formData.feed} 
        onChangeText={(value) => updateForm('feed', value)} 
        placeholder={t.home.feedHint} 
        keyboardType="numeric" 
      />
      <DateInput 
        label={t.forms.samplingDate} 
        date={formData.samplingDate} 
        onPress={openDatePicker} 
      />
    </>
  ), [formData, activePonds, updateForm, openDatePicker, t]);

  const renderCycleForm = useMemo(() => (
    <>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{t.farmCycle.existingPond}</Text>
        {startableEndedPonds.length === 0 ? (
          <Text style={styles.inputHint}>
            {t.farmCycle.noEndedPondsAvailable}
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pondSelector}
          >
            {startableEndedPonds.map(pond => (
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
      <InputField
        label={t.forms.density}
        value={formData.density}
        onChangeText={(value) => updateForm('density', value)}
        placeholder={t.home.densityHint}
        keyboardType="numeric"
      />
      <DateInput
        label={t.forms.startDate}
        date={formData.docStart}
        onPress={openDatePicker}
      />
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
    </>
  ), [formData, openDatePicker, startableEndedPonds, t, updateForm]);



  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f8fc" />
      <View style={styles.container}>
        <View style={styles.cycleManagerCard}>
          <TouchableOpacity
            style={styles.cycleManagerHeader}
            onPress={() => setCycleManagerExpanded((expanded) => !expanded)}
            activeOpacity={0.8}
          >
            <View>
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
            </View>
            <View style={styles.cycleHeaderRight}>
              <View style={[
                styles.cycleStatusBadge,
                currentCyclePonds.length === 0 && styles.cycleStatusBadgeMuted
              ]}>
                <Text style={styles.cycleStatusText}>
                  {currentCycleStatus.toUpperCase()}
                </Text>
              </View>
              <Ionicons
                name={cycleManagerExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                size={20}
                color="#315f57"
              />
            </View>
          </TouchableOpacity>

          {cycleManagerExpanded && currentCyclePonds.length > 0 ? (
            <>
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

              {canEditPonds && activeFarmCycle && (
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

              {canEditPonds && activeFarmCycle && (
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

        <View style={styles.cycleFilterContainer}>
          <TouchableOpacity
            style={[styles.cycleFilterButton, cycleFilter === 'active' && styles.cycleFilterButtonActive]}
            onPress={() => setCycleFilter('active')}
          >
            <Text style={[styles.cycleFilterText, cycleFilter === 'active' && styles.cycleFilterTextActive]}>{t.farmCycle.filterActive}</Text>
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
          ListEmptyComponent={
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

        <Modal visible={modalVisible} animationType="slide" transparent>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === "ios" ? "padding" : "height"}
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
                        ? 'Edit Baseline'
                        : t.home.addSamplingData}
                </Text>
                <TouchableOpacity 
                  onPress={() => setModalVisible(false)} 
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#dce8f2" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                showsVerticalScrollIndicator={false} 
                style={styles.modalScrollView}
                contentContainerStyle={{ paddingBottom: 40 }}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
              >
                {modalType === 'pond'
                  ? renderPondForm
                  : modalType === 'cycle'
                    ? renderCycleForm
                    : modalType === 'baseline'
                      ? renderBaselineForm
                    : renderSamplingForm}

                <View style={styles.buttonContainer}>
                  <TouchableOpacity 
                    style={styles.cancelButton} 
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>
                      {t.actions.cancel}
                    </Text>
                  </TouchableOpacity>
	                  <TouchableOpacity 
	                    style={[styles.addButton, isSubmitting && { opacity: 0.6 }]} 
	                    onPress={modalType === 'pond'
	                      ? handleAddPond
	                      : modalType === 'cycle'
                          ? handleAddCycle
                          : modalType === 'baseline'
                            ? handleUpdateBaseline
	                        : handleAddSamplingData}
	                    disabled={isSubmitting}
	                  >
                    <Text style={styles.addButtonText}>
                      {modalType === 'pond'
                        ? t.home.addPondButton
                        : modalType === 'cycle'
                          ? 'Start Cycle'
                          : modalType === 'baseline'
                            ? 'Save Baseline'
                          : t.home.addDataButton}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              {showDatePicker && (
                <View style={styles.datePickerContainer}>
                  <DateTimePicker 
                    value={normalizeDateValue(tempDate)}
                    mode="date" 
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, date) => {
                      const nextDate = normalizeDateValue(date || tempDateRef.current);
                      tempDateRef.current = nextDate;
                      setTempDate(nextDate);
                      if (Platform.OS === 'ios') {
                        updateForm(datePickerField, nextDate);
                      } else {
                        handleDateChange(event.type !== 'dismissed', nextDate);
                      }
                    }}
                    themeVariant="light" 
                  />
                  <View style={styles.datePickerButtons}>
                    <TouchableOpacity 
                      style={styles.datePickerCancelButton} 
                      onPress={() => handleDateChange(false)}
                    >
                      <Text style={styles.datePickerCancelText}>
                        {t.actions.cancel}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.datePickerConfirmButton} 
                      onPress={() => handleDateChange(true, tempDateRef.current)}
                    >
                      <Text style={styles.datePickerConfirmText}>
                        {t.actions.confirm}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
        </Modal>
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
  cycleManagerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
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
    padding: Platform.OS === 'android' ? 20 : 24, 
    paddingTop: 0 
  },
  
  inputContainer: { 
    marginBottom: Platform.OS === 'android' ? 16 : 20 
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
  
  dateInput: { 
    borderWidth: 1, 
    borderColor: '#e8f2f9', 
    padding: Platform.OS === 'android' ? 14 : 16, 
    borderRadius: 12, 
    backgroundColor: '#FFFFFF', 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  
  dateText: { 
    color: '#0d2137', 
    fontSize: Platform.OS === 'android' ? 15 : 16 
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
  
  datePickerContainer: { 
    backgroundColor: '#0d2137', 
    borderTopWidth: 1, 
    borderTopColor: '#315f57', 
    padding: 16 
  },
  
  datePickerButtons: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    marginTop: 16 
  },
  
  datePickerCancelButton: { 
    paddingVertical: Platform.OS === 'android' ? 8 : 10, 
    paddingHorizontal: Platform.OS === 'android' ? 16 : 20, 
    marginRight: 12, 
    borderRadius: 8, 
    backgroundColor: '#315f57' 
  },
  
  datePickerCancelText: { 
    color: '#f4f8fc', 
    fontWeight: '600',
    fontSize: Platform.OS === 'android' ? 14 : 15
  },
  
  datePickerConfirmButton: { 
    paddingVertical: Platform.OS === 'android' ? 8 : 10, 
    paddingHorizontal: Platform.OS === 'android' ? 16 : 20, 
    borderRadius: 8, 
    backgroundColor: '#dce8f2' 
  },
  
  datePickerConfirmText: { 
    color: '#0d2137', 
    fontWeight: 'bold',
    fontSize: Platform.OS === 'android' ? 14 : 15
  }
});
