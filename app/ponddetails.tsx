import { useShallow } from 'zustand/react/shallow';
import { getUserErrorMessage } from '../shared/userError';
import { AppAlert as Alert } from '../components/alerts/appAlert';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, Platform, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { usePondStore, type Pond, type Sampling, type MortalityRecord, getActiveFarmCycle, getPhysicalPondKey, getPondCurrentDoc, getPondCycleStatus, getPondPlSupplier, getPondTotalFeedConsumed, isBaselineSampling, isPondCycleActive } from './store/pondStore';
import { useLanguage } from './../context/LanguageContext';
import { useAuth } from './../context/AuthContext';
import { calculateSamplingAdg, calculatePondMortalityForDate, detectFeedBiomassMismatchInsight, getSamplingMbw, type MortalityObservationType } from '../shared/pondCalculations';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { FARM_OPERATIONAL_DAY_ROLLOVER_HOUR, getFarmDateKey } from '../shared/farmDate';
import { getAssignedEnterpriseBlockIds } from '../shared/enterpriseBlocks';
import { useEnterpriseBlocks } from './hooks/useEnterpriseBlocks';
import AppDatePicker from './components/forms/AppDatePicker';
import { hasFarmPermission } from '../shared/permissions';
import { useFarmDateKey } from './hooks/useFarmDateKey';

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

const DataRow = React.memo(({ 
  label, 
  value, 
  unit = '' 
}: { 
  label: string; 
  value: string | number; 
  unit?: string 
}) => (
  <View style={styles.dataRow}>
    <Text style={styles.dataLabel}>{label}:</Text>
    <Text style={styles.dataValue}>
      {value} <Text style={styles.dataUnit}>{unit}</Text>
    </Text>
  </View>
));
DataRow.displayName = 'DataRow';

type PondLabStatus = NonNullable<Pond['latestLabStatus']>;

const getLabStatusStyle = (
  status: PondLabStatus['status'] | undefined,
  labels: { critical: string; warning: string; watch: string; good: string },
) => {
  if (status === 'critical') return { label: labels.critical, bg: '#fee2e2', color: '#991b1b', icon: 'warning-outline' as const };
  if (status === 'warning') return { label: labels.warning, bg: '#fef3c7', color: '#92400e', icon: 'alert-circle-outline' as const };
  if (status === 'watch') return { label: labels.watch, bg: '#e0f2fe', color: '#0F4C75', icon: 'eye-outline' as const };
  return { label: labels.good, bg: '#dcfce7', color: '#166534', icon: 'checkmark-circle-outline' as const };
};

const EditInputField = React.memo(({ 
  label, 
  value, 
  onChangeText, 
  keyboardType = "default" 
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: "default" | "numeric";
}) => (
  <View style={styles.editInputContainer}>
    <Text style={styles.editInputLabel}>{label}</Text>
    <TextInput
      style={styles.editInput}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      placeholderTextColor="#6b8aa0"
      blurOnSubmit={false}
      returnKeyType="next"
      autoCorrect={false}
      autoCapitalize="none"
    />
  </View>
));
EditInputField.displayName = 'EditInputField';

const EditSamplingModal = ({ 
  visible, 
  sample, 
  onClose, 
  onSave 
}: {
  visible: boolean;
  sample: Sampling | null;
  onClose: () => void;
  onSave: (id: string, data: { 
    mbw: number; 
    mortality: number; 
    feed: number 
  }) => void;
}) => {
  const { t } = useLanguage();
  
  const [mbw, setMbw] = useState('');
  const [mortality, setMortality] = useState('');
  const [feed, setFeed] = useState('');

  const [draftInputs1, setDraftInputs1] = useState<readonly unknown[] | null>(null);
  const nextDraftInputs1 = [sample, visible];
  if (!draftInputs1 || nextDraftInputs1.some((value, index) => !Object.is(value, draftInputs1[index]))) {
    setDraftInputs1(nextDraftInputs1);
    (() => {
    if (sample && visible) {
      setMbw(sample.mbw ? sample.mbw.toString() : '0');
      setMortality(sample.mortality ? sample.mortality.toString() : '0');
      setFeed(sample.feed ? sample.feed.toString() : '0');
    }

    })();
  }

  const [draftInputs2, setDraftInputs2] = useState<readonly unknown[] | null>(null);
  const nextDraftInputs2 = [visible];
  if (!draftInputs2 || nextDraftInputs2.some((value, index) => !Object.is(value, draftInputs2[index]))) {
    setDraftInputs2(nextDraftInputs2);
    (() => {
    if (!visible) {
      setMbw('');
      setMortality('');
      setFeed('');
    }

    })();
  }

  const handleSave = () => {
    if (!sample || !mbw || !mortality || !feed) return;
    
    onSave(sample.id, {
      mbw: Number(mbw),
      mortality: Number(mortality),
      feed: Number(feed)
    });
    
    onClose();
  };

  return (
    <Modal visible={visible} animationType="none" transparent>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.editModalContainer}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ width: '100%', alignItems: 'center' }}
          >
            <View style={styles.editModalContent}>
          <View style={styles.editModalHeader}>
            <Text style={styles.editModalTitle}>
              {t.actions.edit} {t.home.samplingData}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color="#315f57" />
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.editModalScrollView}
            contentContainerStyle={styles.editModalScrollContent}
            keyboardShouldPersistTaps="handled" 
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            bounces={false}
          >
            <EditInputField
              label={t.shrimp.meanBodyWeight}
              value={mbw}
              onChangeText={setMbw}
              keyboardType="numeric"
            />
            <EditInputField
              label={t.shrimp.mortality}
              value={mortality}
              onChangeText={setMortality}
              keyboardType="numeric"
            />
            <EditInputField
              label={t.shrimp.feedAmount}
              value={feed}
              onChangeText={setFeed}
              keyboardType="numeric"
            />
          </ScrollView>
          
            <View style={styles.editButtonContainer}>
              <TouchableOpacity 
                style={styles.editCancelButton} 
                onPress={onClose}
              >
                <Text style={styles.editCancelText}>
                  {t.actions.cancel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.editSaveButton} 
                onPress={handleSave}
              >
                <Text style={styles.editSaveText}>
                  {t.actions.save}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  </Modal>
);
};

const EditMortalityModal = ({
  visible,
  record,
  onClose,
  onSave,
}: {
  visible: boolean;
  record: MortalityRecord | null;
  onClose: () => void;
  onSave: (id: string, data: {
    count: number;
    observationType: MortalityObservationType;
    siponShift?: 'morning' | 'evening';
    siphonedCount?: number;
    mortalCount?: number;
    notes?: string;
  }) => void;
}) => {
  const { t } = useLanguage();
  const [count, setCount] = useState('');
  const [observationType, setObservationType] = useState<MortalityObservationType>('estimated_total');
  const [siponShift, setSiponShift] = useState<'morning' | 'evening'>('morning');
  const [siphonedCount, setSiphonedCount] = useState('');
  const [mortalCount, setMortalCount] = useState('');
  const [notes, setNotes] = useState('');

  const [draftInputs3, setDraftInputs3] = useState<readonly unknown[] | null>(null);
  const nextDraftInputs3 = [record, visible];
  if (!draftInputs3 || nextDraftInputs3.some((value, index) => !Object.is(value, draftInputs3[index]))) {
    setDraftInputs3(nextDraftInputs3);
    (() => {
    if (record && visible) {
      setCount(record.observationType === 'none_observed' ? '0' : (record.count !== undefined ? String(record.count) : '0'));
      setObservationType(record.observationType || 'estimated_total');
      setSiponShift(record.siponShift || 'morning');
      setSiphonedCount(record.siphonedCount !== undefined ? String(record.siphonedCount) : '');
      setMortalCount(record.mortalCount !== undefined ? String(record.mortalCount) : '');
      setNotes(record.notes || '');
    }

    })();
  }

  const [draftInputs4, setDraftInputs4] = useState<readonly unknown[] | null>(null);
  const nextDraftInputs4 = [visible];
  if (!draftInputs4 || nextDraftInputs4.some((value, index) => !Object.is(value, draftInputs4[index]))) {
    setDraftInputs4(nextDraftInputs4);
    (() => {
    if (!visible) {
      setCount('');
      setObservationType('estimated_total');
      setSiponShift('morning');
      setSiphonedCount('');
      setMortalCount('');
      setNotes('');
    }

    })();
  }

  const handleSave = () => {
    if (!record) return;
    const isNone = observationType === 'none_observed';
    const componentTotal = Number(siphonedCount || 0) + Number(mortalCount || 0);
    const countNum = isNone ? 0 : observationType === 'observed_recovered' && componentTotal > 0 ? componentTotal : Number(count);
    if (!isNone && (isNaN(countNum) || countNum < 0)) return;

    onSave(record.id, {
      count: countNum,
      observationType,
      ...(observationType === 'observed_recovered' && componentTotal > 0 ? {
        siponShift,
        siphonedCount: Number(siphonedCount || 0),
        mortalCount: Number(mortalCount || 0),
      } : {}),
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="none" transparent>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.editModalContainer}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ width: '100%', alignItems: 'center' }}
          >
            <View style={styles.editModalContent}>
              <View style={styles.editModalHeader}>
                <Text style={styles.editModalTitle}>
                  {t.actions.edit} {t.home.mortalityHistory}
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color="#315f57" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.editModalScrollView}
                contentContainerStyle={styles.editModalScrollContent}
                keyboardShouldPersistTaps="handled" 
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                bounces={false}
              >
                {/* Observation Type Selector */}
                <View style={styles.editInputContainer}>
                  <Text style={styles.editInputLabel}>{t.home.mortalityObservationType}</Text>
                  <View style={styles.obsTypeSelector}>
                    <TouchableOpacity
                      style={[
                        styles.obsTypePill,
                        observationType === 'estimated_total' && styles.obsTypePillActive,
                      ]}
                      onPress={() => setObservationType('estimated_total')}
                    >
                      <Text
                        style={[
                          styles.obsTypePillText,
                          observationType === 'estimated_total' && styles.obsTypePillTextActive,
                        ]}
                      >
                        {t.home.mortalityEstimatedShort || 'Estimated Total'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.obsTypePill,
                        observationType === 'observed_recovered' && styles.obsTypePillActive,
                      ]}
                      onPress={() => setObservationType('observed_recovered')}
                    >
                      <Text
                        style={[
                          styles.obsTypePillText,
                          observationType === 'observed_recovered' && styles.obsTypePillTextActive,
                        ]}
                      >
                        {t.home.mortalityObservedShort || 'Observed'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.obsTypePill,
                        observationType === 'none_observed' && styles.obsTypePillActive,
                      ]}
                      onPress={() => {
                        setObservationType('none_observed');
                        setCount('0');
                      }}
                    >
                      <Text
                        style={[
                          styles.obsTypePillText,
                          observationType === 'none_observed' && styles.obsTypePillTextActive,
                        ]}
                      >
                        {t.home.mortalityNoneShort || 'None'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {observationType === 'estimated_total' && (
                  <EditInputField
                    label={`${t.home.mortalityCount} (pcs)`}
                    value={count}
                    onChangeText={setCount}
                    keyboardType="numeric"
                  />
                )}

                {observationType === 'observed_recovered' && (
                  <>
                    <View style={styles.editInputContainer}>
                      <Text style={styles.editInputLabel}>{t.dailyOperationsReports.siponShift}</Text>
                      <View style={styles.obsTypeSelector}>
                        {(['morning', 'evening'] as const).map((shift) => (
                          <TouchableOpacity
                            key={shift}
                            style={[styles.obsTypePill, siponShift === shift && styles.obsTypePillActive]}
                            onPress={() => setSiponShift(shift)}
                          >
                            <Text style={[styles.obsTypePillText, siponShift === shift && styles.obsTypePillTextActive]}>
                              {shift === 'morning' ? t.dailyOperationsReports.morning : t.dailyOperationsReports.evening}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    <EditInputField label={t.dailyOperationsReports.siphoned} value={siphonedCount} onChangeText={setSiphonedCount} keyboardType="numeric" />
                    <EditInputField label={t.dailyOperationsReports.mortal} value={mortalCount} onChangeText={setMortalCount} keyboardType="numeric" />
                  </>
                )}

                <View style={styles.editInputContainer}>
                  <Text style={styles.editInputLabel}>{t.home.mortalityNotes}</Text>
                  <TextInput
                    style={[styles.editInput, styles.editInputMultiline]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder={t.home.mortalityNotesHint || 'Notes (optional)'}
                    placeholderTextColor="#6b8aa0"
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </ScrollView>

              <View style={styles.editButtonContainer}>
                <TouchableOpacity 
                  style={styles.editCancelButton} 
                  onPress={onClose}
                >
                  <Text style={styles.editCancelText}>
                    {t.actions.cancel}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.editSaveButton} 
                  onPress={handleSave}
                >
                  <Text style={styles.editSaveText}>
                    {t.actions.save}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default function PondDetails() {
  const router = useRouter();
  const { pondId } = useLocalSearchParams();
  const { t } = useLanguage();
  const { user, company } = useAuth();
  const calendarToday = useFarmDateKey(company?.timeZone);
  const farmToday = useFarmDateKey(company?.timeZone, FARM_OPERATIONAL_DAY_ROLLOVER_HOUR);
  const insets = useSafeAreaInsets();
  
  const canManagePonds = hasFarmPermission(user, 'managePonds', company?.ownerId);
  const canRecordPondData = hasFarmPermission(user, 'recordPondData', company?.ownerId);
  const canManageCycles = hasFarmPermission(user, 'manageCycles', company?.ownerId);
  const isEnterpriseTechnician = company?.businessSize === 'enterprise' && user?.role === 'technician';
  const enterpriseBlocks = useEnterpriseBlocks(
    company?.businessSize === 'enterprise' ? company?.id : undefined,
    user?.uid,
  );
  const assignedBlockIds = useMemo(
    () => getAssignedEnterpriseBlockIds(enterpriseBlocks.blocks, user?.uid),
    [enterpriseBlocks.blocks, user?.uid],
  );
  
  const { 
    getPondById, 
    addPond,
    updateSampling, 
    deleteSampling,
    updateMortalityRecord,
    deleteMortalityRecord,
    calculatePondMetricsWithHarvest,
    ponds,
    cycles,
  } = usePondStore(useShallow((state) => ({
    getPondById: state.getPondById,
    addPond: state.addPond,
    updateSampling: state.updateSampling,
    deleteSampling: state.deleteSampling,
    updateMortalityRecord: state.updateMortalityRecord,
    deleteMortalityRecord: state.deleteMortalityRecord,
    calculatePondMetricsWithHarvest: state.calculatePondMetricsWithHarvest,
    currentTimeZone: state.currentTimeZone,
    harvestRecords: state.harvestRecords,
    ponds: state.ponds,
    cycles: state.cycles,
  })));
  const activeFarmCycle = useMemo(() => getActiveFarmCycle(cycles), [cycles]);
  
  const [pond, setPond] = useState<Pond | null>(null);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'sampling' | 'mortality'>('sampling');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedSample, setSelectedSample] = useState<Sampling | null>(null);
  const [editMortalityModalVisible, setEditMortalityModalVisible] = useState(false);
  const [selectedMortalityRecord, setSelectedMortalityRecord] = useState<MortalityRecord | null>(null);
  const [inventoryFeeds, setInventoryFeeds] = useState<any[]>([]);
  const [startCycleVisible, setStartCycleVisible] = useState(false);
  const [newCycleForm, setNewCycleForm] = useState({
    density: '',
    docStart: getFarmDateKey(new Date(), company?.timeZone),
    plValue: '',
    plSupplier: '',
  });

  const nextPondSource = pondId ? getPondById(pondId as string) : undefined;
  const canAccessCurrentPond = !isEnterpriseTechnician || (!enterpriseBlocks.loading
    && typeof nextPondSource?.blockId === 'string' && assignedBlockIds.has(nextPondSource.blockId));
  const accessiblePondSource = canAccessCurrentPond ? nextPondSource ?? null : null;
  const [previousPondSource, setPreviousPondSource] = useState<typeof accessiblePondSource | undefined>(undefined);
  if (previousPondSource !== accessiblePondSource) {
    setPreviousPondSource(accessiblePondSource);
    setPond(accessiblePondSource);
  }

  useEffect(() => {
    if (company?.id) {
      const q = query(collection(db, 'companies', company.id, 'feeds'), orderBy('feedName', 'asc'));
      const unsub = onSnapshot(q, (snapshot) => {
        setInventoryFeeds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return unsub;
    }
  }, [company?.id]);

  const getFeedName = (feedId?: string) => {
    if (!feedId) return null;
    const feed = inventoryFeeds.find(f => f.id === feedId);
    return feed ? `${feed.feedName} (${feed.brand || ''})` : 'Unknown Feed';
  };

  const calculations = useMemo(() => {
    if (!pond) return null;

    const getPondSamplingData = () => pond?.samplings || [];

    const getLatestSamplingData = () => 
      getPondSamplingData()
        .filter((s: Sampling) => 
          (getSamplingMbw(s) > 0 || Number(s.mortality) > 0 || Number(s.feed) > 0)
        )
        .sort((a: Sampling, b: Sampling) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0] || null;

    const harvestAdjustedMetrics = calculatePondMetricsWithHarvest(pond);
    const feedBiomassInsight = detectFeedBiomassMismatchInsight(pond);

    const calculateSize = (mbw: number) => (1000 / mbw).toFixed(0);

    const getADGData = () => {
      const intervals = getPondSamplingData()
        .map(sampling => calculateSamplingAdg(pond, sampling, company?.timeZone))
        .filter((adg): adg is number => adg !== null);
      return { average: intervals.length ? intervals.reduce((sum, adg) => sum + adg, 0) / intervals.length : 0 };
    };

    const getTotalFeedData = () => getPondTotalFeedConsumed(pond);

    const latestSampling = getLatestSamplingData();
    const doc = getPondCurrentDoc(pond, company?.timeZone, farmToday);
    const totalMortality = harvestAdjustedMetrics.totalMortality;
    const todayMortality = calculatePondMortalityForDate(
      pond,
      calendarToday,
      company?.timeZone,
    );
    
    const currentPopulation = harvestAdjustedMetrics.currentPopulation;
    const estBiomass = harvestAdjustedMetrics.currentBiomass;
    const sr = harvestAdjustedMetrics.adjustedSR.toFixed(1);
    const size = harvestAdjustedMetrics.latestMbw > 0 ? calculateSize(harvestAdjustedMetrics.latestMbw) : '0';
    const { average: avgADG } = getADGData();
    const lastADG = harvestAdjustedMetrics.adg;

    const totalFeed = harvestAdjustedMetrics.totalFeedConsumed || getTotalFeedData();
    
    const fcr = latestSampling 
      ? harvestAdjustedMetrics.adjustedFCR.toFixed(2) 
      : (harvestAdjustedMetrics.adjustedFCR > 0 
          ? harvestAdjustedMetrics.adjustedFCR.toFixed(2) 
          : '0.00'
        );
    
    const mortalityPieces = todayMortality.totalMortality;
    const mortalityWeight = todayMortality.totalMortalityWeight;
      
    const totalMortalityWeight = harvestAdjustedMetrics.totalMortalityWeight;

    const pondSamplingData = getPondSamplingData()
      .filter((s: Sampling) => 
        (getSamplingMbw(s) > 0 || Number(s.mortality) > 0 || Number(s.feed) > 0)
      )
      .sort((a: Sampling, b: Sampling) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

    return {
      latestSampling,
      doc,
      totalMortality,
      currentPopulation,
      estBiomass,
      sr,
      size,
      lastADG,
      avgADG,
      totalFeed,
      fcr,
      mortalityPieces,
      mortalityWeight,
        totalMortalityWeight,
      pondSamplingData,
      feedBiomassInsight
    };
  }, [calendarToday, company?.timeZone, farmToday, pond, calculatePondMetricsWithHarvest]);

  const currentCycleMortalityRecords = useMemo(() => {
    if (!pond) return [];
    const records = Array.isArray(pond.mortalityRecords) ? pond.mortalityRecords : [];
    return records
      .filter((r) => !r.pondCycleId || r.pondCycleId === pond.pondCycleId || r.pondCycleId === pond.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [pond]);

  const getSamplingMbwAtDate = useCallback((dateStr: string) => {
    if (!pond) return 0;
    const validSamplings = (pond.samplings || [])
      .filter((s) => !isBaselineSampling(s) && getSamplingMbw(s) > 0 && s.date <= dateStr)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (validSamplings.length > 0) return getSamplingMbw(validSamplings[0]);
    const baseline = (pond.samplings || []).find(isBaselineSampling);
    if (baseline && getSamplingMbw(baseline) > 0) return getSamplingMbw(baseline);
    return pond.initialWeight || 0.5;
  }, [pond]);

  const openEditModal = useCallback((sample: Sampling) => {
    if (!canRecordPondData || !pond || !isPondCycleActive(pond)) {
      Alert.alert(
        t.home.permissionDenied,
        !pond || !isPondCycleActive(pond) ? 'Ended cycles are read-only. Start a new cycle before adding or editing sampling data.' : t.home.onlyTechniciansCanEdit,
        [{ text: t.actions.confirm }]
      );
      return;
    }
    
    setSelectedSample(sample);
    setEditModalVisible(true);
  }, [canRecordPondData, pond, t]);

  const handleStartNewCycle = useCallback(async () => {
    try {
      if (!pond || !canManagePonds || !canManageCycles) return;
      if (isEnterpriseTechnician && !activeFarmCycle) {
        Alert.alert(t.farmCycle.noActiveCycle, t.enterprise.ownerMustStartCycle);
        return;
      }
      const { density, docStart, plValue, plSupplier } = newCycleForm;

      if (!density || !docStart || !plValue || !plSupplier) {
        Alert.alert(t.messages.error, t.home.fillAllFields);
        return;
      }

      const initialPopulation = pond.pondArea * Number(density);
      const initialWeight = (parseFloat(plValue) || 0) / 10;
      const hasActiveCycleForPond = ponds.some((existingPond) =>
        existingPond.id !== pond.id &&
        isPondCycleActive(existingPond) &&
        getPhysicalPondKey(existingPond.pondName) === getPhysicalPondKey(pond.pondName)
      );

      if (hasActiveCycleForPond) {
        Alert.alert(t.messages.error, `${pond.pondName} already has an active cycle. End that pond first before starting another cycle for it.`);
        return;
      }

      const added = await addPond({
        id: Date.now().toString(),
        pondName: pond.pondName,
        pondArea: pond.pondArea,
        blockId: pond.blockId,
        blockName: pond.blockName,
        density: Number(density),
        initialPopulation,
        docStart,
        supplier: plSupplier,
        plSupplier,
        initialWeight,
        samplings: [],
        totalHarvestedBiomass: 0,
        totalHarvestedPopulation: 0,
        totalHarvestedFeed: 0,
        cycleStatus: 'active',
        cycleStartedAt: docStart,
        previousCyclePondId: pond.id,
        physicalPondId: pond.physicalPondId,
      });

      if (!added) {
        Alert.alert(t.messages.error, 'Could not start this pond. Sync the farm and check its physical pond link before trying again.');
        return;
      }

      setStartCycleVisible(false);
      setNewCycleForm({
        density: '',
        docStart: getFarmDateKey(new Date(), company?.timeZone),
        plValue: '',
        plSupplier: '',
      });
      router.push('/(tabs)' as any);
      Alert.alert(t.messages.success, `${pond.pondName} new cycle started.`);

    } catch (error) {
      Alert.alert(t.messages.error, getUserErrorMessage(error, t.messages.networkError));
    }
  }, [activeFarmCycle, addPond, canManageCycles, canManagePonds, company, isEnterpriseTechnician, newCycleForm, pond, ponds, router, t]);

  const closeEditModal = useCallback(() => {
    setEditModalVisible(false);
    setSelectedSample(null);
  }, []);

  const handleSaveEdit = useCallback((
    sampleId: string, 
    data: { mbw: number; mortality: number; feed: number }
  ) => {
    if (!pond) return;
    
    updateSampling(pond.id, sampleId, data);
    
    const updatedPond = getPondById(pond.id);
    if (updatedPond) {
      setPond(updatedPond);
    }
  }, [pond, updateSampling, getPondById]);

  const openEditMortalityModal = useCallback((record: MortalityRecord) => {
    if (!canRecordPondData || !pond || !isPondCycleActive(pond)) {
      Alert.alert(
        t.home.permissionDenied,
        !pond || !isPondCycleActive(pond)
          ? 'Ended cycles are read-only. Start a new cycle before adding or editing mortality data.'
          : t.home.onlyTechniciansCanEdit,
        [{ text: t.actions.confirm }]
      );
      return;
    }
    
    setSelectedMortalityRecord(record);
    setEditMortalityModalVisible(true);
  }, [canRecordPondData, pond, t]);

  const closeEditMortalityModal = useCallback(() => {
    setEditMortalityModalVisible(false);
    setSelectedMortalityRecord(null);
  }, []);

  const handleSaveMortalityEdit = useCallback((
    recordId: string,
    data: { count: number; observationType: MortalityObservationType; siponShift?: 'morning' | 'evening'; siphonedCount?: number; mortalCount?: number; notes?: string }
  ) => {
    if (!pond) return;

    updateMortalityRecord(pond.id, recordId, data);

    const updatedPond = getPondById(pond.id);
    if (updatedPond) {
      setPond(updatedPond);
    }
  }, [pond, updateMortalityRecord, getPondById]);

  const handleDeleteMortality = useCallback((record: MortalityRecord) => {
    if (!pond || !canRecordPondData || !isPondCycleActive(pond)) return;
    const formattedDate = new Date(record.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const countText = record.observationType === 'none_observed' ? '0 pcs' : `${record.count} pcs`;
    Alert.alert(
      t.actions.delete,
      `${t.home.mortalityHistory}: ${formattedDate} (${countText})?`,
      [
        { text: t.actions.cancel, style: 'cancel' },
        {
          text: t.actions.delete,
          style: 'destructive',
          onPress: () => {
            deleteMortalityRecord(pond.id, record.id);
            const updatedPond = getPondById(pond.id);
            if (updatedPond) {
              setPond(updatedPond);
            }
          },
        },
      ]
    );
  }, [pond, canRecordPondData, deleteMortalityRecord, getPondById, t]);

  const handleDeleteSampling = useCallback((sample: Sampling) => {
    if (!pond || !canRecordPondData || !isPondCycleActive(pond)) return;
    const formattedDate = new Date(sample.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    Alert.alert(
      t.actions.delete,
      `${t.home.samplingData}: ${formattedDate} (MBW ${sample.mbw}g)?`,
      [
        { text: t.actions.cancel, style: 'cancel' },
        {
          text: t.actions.delete,
          style: 'destructive',
          onPress: () => {
            deleteSampling(pond.id, sample.id);
            const updatedPond = getPondById(pond.id);
            if (updatedPond) {
              setPond(updatedPond);
            }
          },
        },
      ]
    );
  }, [pond, canRecordPondData, deleteSampling, getPondById, t]);

  if (!pond || !calculations) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
            <Ionicons name="arrow-back" size={24} color="#0d2137" />
          </TouchableOpacity>
          <Text style={styles.pondName}>{t.actions.loading}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t.messages.loadingData}</Text>
        </View>
      </View>
    );
  }

  const {
    doc,
    totalMortality,
    currentPopulation,
    estBiomass,
    sr,
    size,
    lastADG,
    avgADG,
    totalFeed,
    fcr,
    mortalityPieces,
    mortalityWeight,
    totalMortalityWeight,
    pondSamplingData,
    feedBiomassInsight
  } = calculations;
  const latestLabStatus = pond.latestLabStatus;
  const waterQualityLabStatus = latestLabStatus?.byType?.water_quality
    ?? (latestLabStatus?.reportType === 'water_quality' || (!latestLabStatus?.reportType && !latestLabStatus?.byType) ? latestLabStatus : undefined);
  const planktonLabStatus = latestLabStatus?.byType?.plankton
    ?? (latestLabStatus?.reportType === 'plankton' ? latestLabStatus : undefined);
  const labStatusCards = [
    { key: 'water_quality', title: t.waterQuality.mineralQuality, icon: 'water-outline' as const, status: waterQualityLabStatus },
    { key: 'plankton', title: t.waterQuality.planktonQuality, icon: 'leaf-outline' as const, status: planktonLabStatus },
  ].filter((item) => item.status);

  return (
    <>
      <Stack.Screen 
        options={{
          title: pond.pondName,
          headerBackTitle: t.nav.ponds,
          headerStyle: { backgroundColor: '#dce8f2' },
          headerTintColor: '#0d2137',
          headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
          headerShadowVisible: false,
        }}
      />
      <StatusBar barStyle="dark-content" backgroundColor="#dce8f2" />
      <GestureHandlerRootView style={styles.container}>
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ 
          paddingBottom: Platform.OS === 'android' 
            ? Math.max(insets.bottom, 20) + 20 
            : 20 
        }}
        >
          <Text style={styles.title}>{t.shrimp.pondDetails}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, getPondCycleStatus(pond) === 'ended' && styles.statusBadgeEnded]}>
              <Text style={styles.statusBadgeText}>{getPondCycleStatus(pond) === 'ended' ? 'Ended Cycle' : 'Active Cycle'}</Text>
            </View>
            {pond.cycleStartMode === 'midcycle' && (
              <View style={styles.midcycleBadge}>
                <Text style={styles.midcycleBadgeText}>{t.midcycleOnboarding.importedMidcycle}</Text>
              </View>
            )}
            {getPondCycleStatus(pond) === 'ended' && canManagePonds && canManageCycles && (
              <TouchableOpacity style={styles.startCycleButton} onPress={() => setStartCycleVisible(true)}>
                <Text style={styles.startCycleButtonText}>Start New Cycle</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.detailsBubble}>
            <View style={styles.columnContainer}>
              <View style={styles.column}>
                <DataRow 
                  label={t.forms.pondSize.replace(' (square meters)', '')} 
                  value={pond.pondArea.toLocaleString()} 
                  unit="m²" 
                />
                <DataRow 
                  label={`${t.home.total} ${t.shrimp.population}`} 
                  value={pond.initialPopulation.toLocaleString()} 
                  unit="pcs" 
                />
                <DataRow 
                  label={`${t.home.estimated} ${t.shrimp.biomass}`} 
                  value={estBiomass.toFixed(1)} 
                  unit="kg" 
                />
                <DataRow 
                  label={t.shrimp.size} 
                  value={size} 
                />
                <DataRow 
                  label={`${t.shrimp.current} ${t.shrimp.adg}`} 
                  value={lastADG.toFixed(2)} 
                  unit="g/day" 
                />
                <DataRow 
                  label={`${t.home.total} ${t.nav.feed}`} 
                  value={totalFeed.toFixed(1)} 
                  unit="kg" 
                />
                <DataRow 
                  label={t.shrimp.fcr} 
                  value={fcr} 
                />
              </View>
              <View style={styles.column}>
                <DataRow 
                  label={t.forms.density.replace(' (pieces per square meter)', '')} 
                  value={pond.density} 
                  unit="per m²" 
                />
                <DataRow 
                  label={`${t.shrimp.current} ${t.shrimp.population}`} 
                  value={currentPopulation.toLocaleString()} 
                  unit="pcs" 
                />
                <DataRow 
                  label={t.shrimp.doc} 
                  value={doc} 
                  unit="days" 
                />
                <DataRow 
                  label={t.home.estimatedSR} 
                  value={sr} 
                  unit="%" 
                />
                <DataRow 
                  label={`${t.home.average} ${t.shrimp.adg}`} 
                  value={avgADG.toFixed(2)} 
                  unit="g/day" 
                />
                <DataRow 
                  label={t.forms.supplier} 
                  value={getPondPlSupplier(pond)} 
                />
              </View>
            </View>
          </View>

          {feedBiomassInsight?.latest && (
            <View style={styles.feedInsightStrip}>
              <View style={styles.feedInsightIcon}>
                <Ionicons name="analytics-outline" size={18} color="#92400e" />
              </View>
              <View style={styles.feedInsightContent}>
                <Text style={styles.feedInsightTitle}>Feed response needs review</Text>
                <Text style={styles.feedInsightText}>
                  Feed-based biomass differs from records across {feedBiomassInsight.requiredRecords} recent records.
                </Text>
                <View style={styles.feedInsightStats}>
                  <Text style={styles.feedInsightStat}>Records {feedBiomassInsight.latest.recordBiomassKg.toFixed(1)} kg</Text>
                  <Text style={styles.feedInsightStat}>Feed est. {feedBiomassInsight.latest.feedBasedBiomassKg.toFixed(1)} kg</Text>
                  <Text style={styles.feedInsightStat}>{feedBiomassInsight.latest.differencePercent.toFixed(0)}% diff</Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.labStatusCard}>
            <View style={styles.labStatusHeader}>
              <View style={styles.labStatusTitleRow}>
                <Ionicons name="flask-outline" size={18} color="#315f57" />
                <Text style={styles.labStatusTitle}>{t.waterQuality.labReports}</Text>
              </View>
            </View>
            {labStatusCards.length === 0 ? (
              <View style={styles.labStatusEmpty}>
                <Text style={styles.labStatusIssue}>{t.waterQuality.noConfirmedLabWarning}</Text>
              </View>
            ) : (
              <View style={styles.labStatusGrid}>
                {labStatusCards.map((item) => {
                  const statusStyle = getLabStatusStyle(item.status?.status, {
                    critical: t.waterQuality.statusCritical,
                    warning: t.waterQuality.statusWarning,
                    watch: t.waterQuality.statusWatch,
                    good: t.waterQuality.statusGood,
                  });
                  return (
                    <View key={item.key} style={styles.labStatusTypeCard}>
                      <View style={styles.labStatusTypeHeader}>
                        <View style={styles.labStatusTitleRow}>
                          <Ionicons name={item.icon} size={16} color="#315f57" />
                          <Text style={styles.labStatusTypeTitle}>{item.title}</Text>
                        </View>
                        <View style={[styles.labStatusBadge, { backgroundColor: statusStyle.bg }]}>
                          <Ionicons name={statusStyle.icon} size={13} color={statusStyle.color} />
                          <Text style={[styles.labStatusBadgeText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
                        </View>
                      </View>
                      <Text style={styles.labStatusIssue}>{item.status?.mainIssue || t.waterQuality.noConfirmedLabWarning}</Text>
                      {item.status?.sampleDate && (
                        <Text style={styles.labStatusDate}>
                          {t.waterQuality.lastLab}: {new Date(item.status.sampleDate).toLocaleDateString()}
                        </Text>
                      )}
                      {item.status?.keyRisks && item.status.keyRisks.length > 0 && (
                        <View style={styles.labStatusList}>
                          {item.status.keyRisks.slice(0, 2).map((risk, index) => (
                            <Text key={`${item.key}-${risk}-${index}`} style={styles.labStatusListItem}>• {risk}</Text>
                          ))}
                        </View>
                      )}
                      {item.status?.recommendations?.[0] && (
                        <View style={styles.labStatusRecommendation}>
                          <Text style={styles.labStatusRecommendationTitle}>{t.waterQuality.recommendedAction}</Text>
                          <Text style={styles.labStatusRecommendationText}>{item.status.recommendations[0]}</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Segmented History Switcher */}
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[styles.segmentButton, activeHistoryTab === 'sampling' && styles.segmentButtonActive]}
              onPress={() => setActiveHistoryTab('sampling')}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, activeHistoryTab === 'sampling' && styles.segmentTextActive]}>
                {t.home.samplingHistory}
              </Text>
              <View style={[styles.segmentBadge, activeHistoryTab === 'sampling' && styles.segmentBadgeActive]}>
                <Text style={[styles.segmentBadgeText, activeHistoryTab === 'sampling' && styles.segmentBadgeTextActive]}>
                  {pondSamplingData.length}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentButton, activeHistoryTab === 'mortality' && styles.segmentButtonActive]}
              onPress={() => setActiveHistoryTab('mortality')}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, activeHistoryTab === 'mortality' && styles.segmentTextActive]}>
                {t.home.mortalityHistory}
              </Text>
              <View style={[styles.segmentBadge, activeHistoryTab === 'mortality' && styles.segmentBadgeActive]}>
                <Text style={[styles.segmentBadgeText, activeHistoryTab === 'mortality' && styles.segmentBadgeTextActive]}>
                  {currentCycleMortalityRecords.length}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {activeHistoryTab === 'mortality' ? (
            <>
              {/* Mortality Overview Card */}
              <View style={styles.mortalitySummaryCard}>
                <View style={styles.mortalitySummaryCol}>
                  <Text style={styles.mortalitySummaryLabel}>{t.home.todayMortality}</Text>
                  <Text style={styles.mortalitySummaryValue}>
                    {mortalityPieces.toLocaleString()} <Text style={styles.mortalitySummaryUnit}>pcs</Text>
                  </Text>
                  <Text style={styles.mortalitySummarySub}>
                    {mortalityWeight > 0 ? `${mortalityWeight.toFixed(2)} kg` : '0 kg'}
                  </Text>
                </View>
                <View style={styles.mortalitySummaryDivider} />
                <View style={styles.mortalitySummaryCol}>
                  <Text style={styles.mortalitySummaryLabel}>{t.home.total} {t.shrimp.mortality}</Text>
                  <Text style={styles.mortalitySummaryValue}>
                    {totalMortality.toLocaleString()} <Text style={styles.mortalitySummaryUnit}>pcs</Text>
                  </Text>
                  <Text style={styles.mortalitySummarySub}>
                    {totalMortalityWeight > 0 ? `${totalMortalityWeight.toFixed(2)} kg` : '0 kg'}
                  </Text>
                </View>
              </View>

              {/* Clean Mortality Activity List */}
              {currentCycleMortalityRecords.length === 0 ? (
                <View style={styles.emptyMortalityCard}>
                  <Text style={styles.emptyMortalityText}>{t.home.noMortalityRecords}</Text>
                </View>
              ) : (
                <View style={styles.mortalityListCard}>
                {currentCycleMortalityRecords.map((record, index) => {
                  const isNone = record.observationType === 'none_observed';
                  const mbw = record.mbwAtRecord || getSamplingMbwAtDate(record.date);
                  const countNum = Number(record.count) || 0;
                  const weightKg = mbw > 0 && countNum > 0 ? (countNum * mbw) / 1000 : null;

                  const rowContent = (
                    <TouchableOpacity
                      activeOpacity={canRecordPondData && isPondCycleActive(pond) ? 0.7 : 1}
                      onPress={() => {
                        if (canRecordPondData && isPondCycleActive(pond)) {
                          openEditMortalityModal(record);
                        }
                      }}
                      style={[
                        styles.mortalityItemRow,
                        index !== currentCycleMortalityRecords.length - 1 && styles.mortalityItemBorder
                      ]}
                    >
                      <View style={styles.mortalityItemLeft}>
                        <Text style={styles.mortalityItemDate}>
                          {new Date(record.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                        {record.notes && !record.notes.toLowerCase().includes('projection testing') ? (
                          <Text style={styles.mortalityItemNote} numberOfLines={2}>
                            {record.notes}
                          </Text>
                        ) : null}
                      </View>

                      <View style={styles.mortalityItemRight}>
                        <Text style={[styles.mortalityCountBig, isNone ? styles.countNone : styles.countLoss]}>
                          {isNone ? '0 pcs' : `${countNum.toLocaleString()} pcs`}
                        </Text>
                        {weightKg !== null && !isNone && (
                          <Text style={styles.mortalityWeightSub}>
                            {weightKg.toFixed(2)} kg
                          </Text>
                        )}
                      </View>

                      {canRecordPondData && isPondCycleActive(pond) && (
                        <TouchableOpacity
                          style={styles.samplingEditBtn}
                          onPress={() => openEditMortalityModal(record)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="pencil-outline" size={15} color="#0F4C75" />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  );

                  return canRecordPondData && isPondCycleActive(pond) ? (
                    <Swipeable
                      key={record.id || index}
                      overshootRight={false}
                      rightThreshold={40}
                      renderRightActions={() => (
                        <TouchableOpacity
                          style={styles.swipeDeleteButton}
                          onPress={() => handleDeleteMortality(record)}
                          accessibilityRole="button"
                          accessibilityLabel={`${t.actions.delete}: ${record.date}`}
                        >
                          <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                          <Text style={styles.swipeDeleteText}>{t.actions.delete}</Text>
                        </TouchableOpacity>
                      )}
                    >
                      {rowContent}
                    </Swipeable>
                  ) : (
                    <View key={record.id || index}>
                      {rowContent}
                    </View>
                  );
                })}
              </View>
            )}
            </>
          ) : (
            /* Sampling History List */
            pondSamplingData.length === 0 ? (
              <View style={styles.emptyMortalityCard}>
                <Text style={styles.emptyMortalityText}>{t.messages.dataNotFound}</Text>
              </View>
            ) : (
              <View style={styles.mortalityListCard}>
                {pondSamplingData.map((sample, index) => {
                  const rowContent = (
                    <TouchableOpacity
                      activeOpacity={canRecordPondData && isPondCycleActive(pond) ? 0.7 : 1}
                      onPress={() => {
                        if (canRecordPondData && isPondCycleActive(pond)) {
                          openEditModal(sample);
                        }
                      }}
                      style={[
                        styles.samplingItemRow,
                        index !== pondSamplingData.length - 1 && styles.mortalityItemBorder
                      ]}
                    >
                      <View style={styles.samplingItemLeft}>
                        <Text style={styles.samplingItemDate}>
                          {new Date(sample.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                        <View style={styles.samplingMetricsRow}>
                          <Text style={styles.samplingMetricTag}>MBW <Text style={styles.samplingMetricBold}>{sample.mbw}g</Text></Text>
                          <Text style={styles.samplingMetricDivider}>•</Text>
                          <Text style={styles.samplingMetricTag}>Feed <Text style={styles.samplingMetricBold}>{sample.feed}kg</Text></Text>
                          {Number(sample.mortality) > 0 && (
                            <>
                              <Text style={styles.samplingMetricDivider}>•</Text>
                              <Text style={styles.samplingMetricTagLoss}>Mort. {sample.mortality}</Text>
                            </>
                          )}
                        </View>
                        {sample.feedData?.inventoryFeedId && (
                          <Text style={styles.samplingFeedName}>{getFeedName(sample.feedData.inventoryFeedId)}</Text>
                        )}
                      </View>

                      {canRecordPondData && isPondCycleActive(pond) && (
                        <TouchableOpacity 
                          style={styles.samplingEditBtn} 
                          onPress={() => openEditModal(sample)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="pencil-outline" size={15} color="#0F4C75" />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  );

                  return canRecordPondData && isPondCycleActive(pond) ? (
                    <Swipeable
                      key={sample.id || index}
                      overshootRight={false}
                      rightThreshold={40}
                      renderRightActions={() => (
                        <TouchableOpacity
                          style={styles.swipeDeleteButton}
                          onPress={() => handleDeleteSampling(sample)}
                          accessibilityRole="button"
                          accessibilityLabel={`${t.actions.delete}: ${sample.date}`}
                        >
                          <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                          <Text style={styles.swipeDeleteText}>{t.actions.delete}</Text>
                        </TouchableOpacity>
                      )}
                    >
                      {rowContent}
                    </Swipeable>
                  ) : (
                    <View key={sample.id || index}>
                      {rowContent}
                    </View>
                  );
                })}
              </View>
            )
          )}
        </ScrollView>

        <EditSamplingModal
          visible={editModalVisible}
          sample={selectedSample}
          onClose={closeEditModal}
          onSave={handleSaveEdit}
        />
        <EditMortalityModal
          visible={editMortalityModalVisible}
          record={selectedMortalityRecord}
          onClose={closeEditMortalityModal}
          onSave={handleSaveMortalityEdit}
        />
        <Modal visible={startCycleVisible} animationType="slide" transparent>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.editModalContainer}
          >
            <View style={styles.editModalContent}>
              <View style={styles.editModalHeader}>
                <Text style={styles.editModalTitle}>Start New Cycle</Text>
                <TouchableOpacity onPress={() => setStartCycleVisible(false)} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#315f57" />
                </TouchableOpacity>
              </View>
              <ScrollView
                style={styles.editModalScrollView}
                contentContainerStyle={styles.editModalScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                bounces={false}
              >
                <Text style={styles.cycleHint}>{pond.pondName} and {pond.pondArea.toLocaleString()} m² will be reused. Enter new stocking details for this cycle.</Text>
                <EditInputField label={t.forms.density} value={newCycleForm.density} onChangeText={(value) => setNewCycleForm(prev => ({ ...prev, density: value }))} keyboardType="numeric" />
                <View style={styles.editInputContainer}>
                  <AppDatePicker
                    label={t.forms.startDate}
                    value={newCycleForm.docStart}
                    onChange={(date) => setNewCycleForm((prev) => ({
                      ...prev,
                      docStart: getFarmDateKey(date, company?.timeZone),
                    }))}
                    cancelLabel={t.actions.cancel}
                    confirmLabel={t.actions.confirm}
                  />
                </View>
                <EditInputField label={t.forms.plValue} value={newCycleForm.plValue} onChangeText={(value) => setNewCycleForm(prev => ({ ...prev, plValue: value }))} keyboardType="numeric" />
                <EditInputField label="PL Supplier" value={newCycleForm.plSupplier} onChangeText={(value) => setNewCycleForm(prev => ({ ...prev, plSupplier: value }))} />
              </ScrollView>
              <View style={styles.editButtonContainer}>
                <TouchableOpacity style={styles.editCancelButton} onPress={() => setStartCycleVisible(false)}>
                  <Text style={styles.editCancelText}>{t.actions.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.editSaveButton} onPress={handleStartNewCycle}>
                  <Text style={styles.editSaveText}>Start Cycle</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </GestureHandlerRootView>
    </>
  );
}

const styles = StyleSheet.create({
  backButton: { marginRight: Platform.OS === 'android' ? 12 : 16 },
  container: { flex: 1, backgroundColor: '#f4f8fc' },
  header: { flexDirection: 'row', alignItems: 'center', padding: Platform.OS === 'android' ? 12 : 16 },
  pondName: { fontSize: Platform.OS === 'android' ? 17 : 18, color: '#0d2137', fontWeight: 'bold' },
  scrollView: { flex: 1, padding: Platform.OS === 'android' ? 16 : 20 },
  title: { fontSize: Platform.OS === 'android' ? 22 : 24, fontWeight: 'bold', color: '#0d2137', marginBottom: Platform.OS === 'android' ? 20 : 24 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  statusBadge: { backgroundColor: '#315f57', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  statusBadgeEnded: { backgroundColor: '#6b8aa0' },
  statusBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  midcycleBadge: { backgroundColor: '#BBE1FA', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  midcycleBadgeText: { color: '#0F4C75', fontSize: 12, fontWeight: '800' },
  startCycleButton: { backgroundColor: '#0d2137', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  startCycleButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  sectionTitle: { fontSize: Platform.OS === 'android' ? 18 : 20, fontWeight: 'bold', color: '#0d2137', marginBottom: Platform.OS === 'android' ? 12 : 16, marginTop: Platform.OS === 'android' ? 20 : 24 },
  detailsBubble: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#e8f2f9', marginBottom: 12, elevation: 3 },
  columnContainer: { flexDirection: 'row', gap: 20 },
  column: { flex: 1 },
  dataRow: { marginBottom: 16 },
  dataLabel: { fontSize: 13, color: '#0d2137', marginBottom: 4, fontWeight: '500' },
  dataValue: { fontSize: 17, color: '#0d2137', fontWeight: '600' },
  dataUnit: { fontSize: 13, color: '#315f57' },
  feedInsightStrip: { flexDirection: 'row', gap: 12, backgroundColor: '#fffbeb', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#fde68a', marginBottom: 12 },
  feedInsightIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' },
  feedInsightContent: { flex: 1, gap: 5 },
  feedInsightTitle: { color: '#78350f', fontSize: 14, fontWeight: '900' },
  feedInsightText: { color: '#92400e', fontSize: 12, fontWeight: '700', lineHeight: 17 },
  feedInsightStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  feedInsightStat: { color: '#78350f', fontSize: 11, fontWeight: '900', backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  labStatusCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e8f2f9', elevation: 3 },
  labStatusHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  labStatusTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  labStatusTitle: { color: '#0d2137', fontSize: 15, fontWeight: '900' },
  labStatusGrid: { gap: 10 },
  labStatusTypeCard: { backgroundColor: '#f8fbfd', borderRadius: 14, padding: 13, borderWidth: 1, borderColor: '#e8f2f9' },
  labStatusTypeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 },
  labStatusTypeTitle: { color: '#0d2137', fontSize: 13, fontWeight: '900' },
  labStatusEmpty: { backgroundColor: '#f8fbfd', borderRadius: 14, padding: 13, borderWidth: 1, borderColor: '#e8f2f9' },
  labStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  labStatusBadgeText: { fontSize: 11, fontWeight: '900' },
  labStatusIssue: { color: '#0d2137', fontSize: 14, fontWeight: '800', lineHeight: 21 },
  labStatusDate: { color: '#6b8aa0', fontSize: 12, fontWeight: '700', marginTop: 6 },
  labStatusList: { marginTop: 10, gap: 4 },
  labStatusListItem: { color: '#315f57', fontSize: 13, fontWeight: '700', lineHeight: 19 },
  labStatusRecommendation: { marginTop: 12, backgroundColor: '#f4f8fc', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e8f2f9' },
  labStatusRecommendationTitle: { color: '#0d2137', fontSize: 11, fontWeight: '900', marginBottom: 4, textTransform: 'uppercase' },
  labStatusRecommendationText: { color: '#315f57', fontSize: 13, fontWeight: '700', lineHeight: 19 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#315f57', fontSize: 16 },
  samplingContainer: { marginBottom: 20 },
  samplingRow: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e8f2f9' },
  samplingData: { flex: 1 },
  samplingDate: { fontWeight: 'bold', color: '#0d2137' },
  samplingValue: { color: '#315f57', fontSize: 12 },
  editButton: { padding: 8, backgroundColor: '#f4f8fc', borderRadius: 8, borderWidth: 1, borderColor: '#e8f2f9' },
  
  // MODAL STYLES
  editModalContainer: { flex: 1, backgroundColor: 'rgba(15, 76, 117, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  editModalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 400, maxHeight: '85%', padding: 24 },
  editModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  editModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0d2137' },
  editModalScrollView: { flexGrow: 0, flexShrink: 1 },
  editModalScrollContent: { paddingBottom: 12 },
  closeButton: { padding: 4 },
  editInputContainer: { marginBottom: 16 },
  editInputLabel: { color: '#0d2137', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  editInput: { borderWidth: 1, borderColor: '#e8f2f9', padding: 12, borderRadius: 8, backgroundColor: '#f4f8fc', color: '#0d2137' },
  cycleHint: { color: '#315f57', fontSize: 13, lineHeight: 18, marginBottom: 16 },
  editButtonContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  editCancelButton: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e74c3c', alignItems: 'center' },
  editCancelText: { color: '#e74c3c', fontWeight: 'bold' },
  editSaveButton: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#0d2137', alignItems: 'center' },
  editSaveText: { color: '#FFFFFF', fontWeight: 'bold' },
  inputContainer: { marginBottom: 16 },
  inputLabel: { color: '#0d2137', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e8f2f9', padding: 12, borderRadius: 8, backgroundColor: '#f4f8fc', color: '#0d2137' },
  inputHint: { color: '#0d2137', fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#e8f2f9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
    marginTop: 16,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 11,
    gap: 6,
  },
  segmentButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F4C75',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b8aa0',
  },
  segmentTextActive: {
    color: '#0F4C75',
    fontWeight: '800',
  },
  segmentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 999,
    backgroundColor: 'rgba(107, 138, 160, 0.15)',
  },
  segmentBadgeActive: {
    backgroundColor: '#e0f2fe',
  },
  segmentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b8aa0',
  },
  segmentBadgeTextActive: {
    color: '#0F4C75',
  },
  mortalitySummaryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e8f2f9',
    marginBottom: 12,
    alignItems: 'center',
  },
  mortalitySummaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  mortalitySummaryDivider: {
    width: 1,
    height: '70%',
    backgroundColor: '#e8f2f9',
  },
  mortalitySummaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b8aa0',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
    textAlign: 'center',
  },
  mortalitySummaryValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0d2137',
    textAlign: 'center',
  },
  mortalitySummaryUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: '#315f57',
  },
  mortalitySummarySub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#315f57',
    marginTop: 2,
    textAlign: 'center',
  },
  mortalityListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e8f2f9',
    marginBottom: 20,
    overflow: 'hidden',
  },
  mortalityItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  mortalityItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  mortalityItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  mortalityItemDate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0d2137',
  },
  mortalityItemNote: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b8aa0',
    fontStyle: 'italic',
    marginTop: 3,
  },
  mortalityItemRight: {
    alignItems: 'flex-end',
  },
  mortalityCountBig: {
    fontSize: 14,
    fontWeight: '800',
  },
  countLoss: {
    color: '#0d2137',
  },
  countNone: {
    color: '#16a34a',
  },
  mortalityWeightSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#315f57',
    marginTop: 2,
  },
  emptyMortalityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e8f2f9',
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMortalityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0d2137',
    marginBottom: 2,
  },
  emptyMortalityText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b8aa0',
    textAlign: 'center',
  },
  samplingItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  samplingItemLeft: {
    flex: 1,
  },
  samplingItemDate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0d2137',
    marginBottom: 3,
  },
  samplingMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  samplingMetricTag: {
    fontSize: 12,
    color: '#315f57',
    fontWeight: '500',
  },
  samplingMetricBold: {
    fontWeight: '700',
    color: '#0d2137',
  },
  samplingMetricDivider: {
    fontSize: 10,
    color: '#94a3b8',
  },
  samplingMetricTagLoss: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
  samplingFeedName: {
    fontSize: 11,
    color: '#6b8aa0',
    marginTop: 3,
    fontStyle: 'italic',
  },
  samplingEditBtn: {
    padding: 7,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    marginLeft: 10,
  },
  obsTypeSelector: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  obsTypePill: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dce8f2',
    backgroundColor: '#f8fbfd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  obsTypePillActive: {
    borderColor: '#0F4C75',
    backgroundColor: '#0F4C75',
  },
  obsTypePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b8aa0',
    textAlign: 'center',
  },
  obsTypePillTextActive: {
    color: '#FFFFFF',
  },
  swipeDeleteButton: {
    width: 76,
    backgroundColor: '#E74C3C',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  swipeDeleteText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  editInputMultiline: {
    minHeight: 64,
    textAlignVertical: 'top',
    paddingTop: 8,
  },
});
