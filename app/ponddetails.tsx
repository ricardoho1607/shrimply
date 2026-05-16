import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { 
  FlatList, Modal, ScrollView, StatusBar, StyleSheet, Text, 
  TextInput, TouchableOpacity, View, Alert, Platform,
  Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView
} from 'react-native';
import { usePondStore, type Pond, type Sampling, getPhysicalPondKey, getPondCurrentDoc, getPondCycleStatus, getPondPlSupplier, getPondTotalFeedConsumed, isBaselineSampling, isPondCycleActive } from './store/pondStore';
import { useLanguage } from './../context/LanguageContext';
import { useAuth } from './../context/AuthContext';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '@/config/firebase';

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
}) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TouchableOpacity style={styles.dateInput} onPress={onPress}>
      <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
      <Ionicons name="calendar-outline" size={20} color="#dce8f2" />
    </TouchableOpacity>
  </View>
));
DateInput.displayName = 'DateInput';

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

  useEffect(() => {
    if (sample && visible) {
      setMbw(sample.mbw ? sample.mbw.toString() : '0');
      setMortality(sample.mortality ? sample.mortality.toString() : '0');
      setFeed(sample.feed ? sample.feed.toString() : '0');
    }
  }, [sample, visible]);

  useEffect(() => {
    if (!visible) {
      setMbw('');
      setMortality('');
      setFeed('');
    }
  }, [visible]);

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
            keyboardShouldPersistTaps="handled" 
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
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

export default function PondDetails() {
  const router = useRouter();
  const { pondId } = useLocalSearchParams();
  const { t } = useLanguage();
  const { user, company } = useAuth();
  const insets = useSafeAreaInsets();
  
  const canEditPonds = user?.role === 'technician' || user?.role === 'owner';
  
  const { 
    getPondById, 
    addPond,
    updateSampling, 
    calculatePondMetricsWithHarvest,
    ponds
  } = usePondStore();
  
  const [pond, setPond] = useState<Pond | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedSample, setSelectedSample] = useState<Sampling | null>(null);
  const [inventoryFeeds, setInventoryFeeds] = useState<any[]>([]);
  const [startCycleVisible, setStartCycleVisible] = useState(false);
  const [newCycleForm, setNewCycleForm] = useState({
    density: '',
    docStart: new Date().toISOString().split('T')[0],
    plValue: '',
    plSupplier: '',
  });

  useEffect(() => {
    if (pondId) {
      const pondData = getPondById(pondId as string);
      if (pondData) {
        setPond(pondData);
      }
    }
  }, [pondId, ponds, getPondById]);

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
          (Number(s.mbw) > 0 || Number(s.mortality) > 0 || Number(s.feed) > 0)
        )
        .sort((a: Sampling, b: Sampling) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0] || null;

    const getTotalMortality = () =>
      getPondSamplingData()
        .filter((s: Sampling) => 
          (Number(s.mbw) > 0 || Number(s.mortality) > 0 || Number(s.feed) > 0)
        )
        .reduce((total: number, sample: Sampling) => 
          total + sample.mortality, 0
        );

    const harvestAdjustedMetrics = calculatePondMetricsWithHarvest(pond);

    const calculateSize = (mbw: number) => (1000 / mbw).toFixed(0);

    const calculateADG = (
      currentMBW: number, 
      previousMBW: number, 
      daysDiff: number
    ) => !previousMBW || daysDiff === 0 
      ? 0 
      : (currentMBW - previousMBW) / daysDiff;

    const getADGData = () => {
      const pondSampling = getPondSamplingData()
        .filter((s: Sampling) => 
          !isBaselineSampling(s) && (Number(s.mbw) > 0 || Number(s.mortality) > 0 || Number(s.feed) > 0)
        )
        .sort((a: Sampling, b: Sampling) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
      const baselineSampling = getPondSamplingData()
        .filter(isBaselineSampling)
        .sort((a: Sampling, b: Sampling) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      if (pondSampling.length === 0) return { last: 0, average: 0 };
      
      let totalADG = 0;
      let adgCount = 0;
      let lastADG = 0;

      if (pondSampling.length >= 1) {
        const previousWeight = baselineSampling?.mbw || pond.initialWeight || 0.5;
        const previousDate = baselineSampling?.date || pond.docStart;
        const daysDiff = Math.abs(
          (new Date(pondSampling[0].date).getTime() - 
           new Date(previousDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysDiff > 0) {
          const adg = calculateADG(
            pondSampling[0].mbw, 
            previousWeight,
            daysDiff
          );
          totalADG += adg;
          adgCount++;
          if (pondSampling.length === 1) lastADG = adg;
        }
      }

      for (let i = 1; i < pondSampling.length; i++) {
        const daysDiff = Math.abs(
          (new Date(pondSampling[i].date).getTime() - 
           new Date(pondSampling[i - 1].date).getTime()) / 
           (1000 * 60 * 60 * 24)
        );
        
        if (daysDiff > 0) {
          const adg = calculateADG(
            pondSampling[i].mbw, 
            pondSampling[i - 1].mbw, 
            daysDiff
          );
          totalADG += adg;
          adgCount++;
          lastADG = adg;
        }
      }

      return {
        last: lastADG,
        average: adgCount > 0 ? totalADG / adgCount : 0
      };
    };

    const getTotalFeedData = () => getPondTotalFeedConsumed(pond);

    const latestSampling = getLatestSamplingData();
    const doc = getPondCurrentDoc(pond);
    const totalMortality = getTotalMortality();
    
    const currentPopulation = harvestAdjustedMetrics.currentPopulation;
    const estBiomass = harvestAdjustedMetrics.currentBiomass;
    const sr = harvestAdjustedMetrics.adjustedSR.toFixed(1);
    const size = latestSampling ? calculateSize(latestSampling.mbw) : '0';
    const { last: lastADG, average: avgADG } = getADGData();

    const totalFeed = getTotalFeedData();
    
    const fcr = latestSampling 
      ? harvestAdjustedMetrics.adjustedFCR.toFixed(2) 
      : (harvestAdjustedMetrics.adjustedFCR > 0 
          ? harvestAdjustedMetrics.adjustedFCR.toFixed(2) 
          : '0.00'
        );
    
    const mortalityPieces = latestSampling?.mortality || 0;
    const mortalityWeight = latestSampling 
      ? (latestSampling.mortality * latestSampling.mbw) / 1000 
      : 0;
      
    const totalMortalityWeight = getPondSamplingData()
      .filter((s: Sampling) => 
        (Number(s.mbw) > 0 || Number(s.mortality) > 0 || Number(s.feed) > 0)
      )
      .reduce((total: number, s: Sampling) => 
        total + (s.mortality * s.mbw) / 1000, 0
      );

    const pondSamplingData = getPondSamplingData()
      .filter((s: Sampling) => 
        (Number(s.mbw) > 0 || Number(s.mortality) > 0 || Number(s.feed) > 0)
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
      pondSamplingData
    };
  }, [pond, calculatePondMetricsWithHarvest]);

  const openEditModal = useCallback((sample: Sampling) => {
    if (!canEditPonds || !pond || !isPondCycleActive(pond)) {
      Alert.alert(
        t.home.permissionDenied,
        !pond || !isPondCycleActive(pond) ? 'Ended cycles are read-only. Start a new cycle before adding or editing sampling data.' : t.home.onlyTechniciansCanEdit,
        [{ text: t.actions.confirm }]
      );
      return;
    }
    
    setSelectedSample(sample);
    setEditModalVisible(true);
  }, [canEditPonds, pond, t]);

  const handleStartNewCycle = useCallback(() => {
    if (!pond || !canEditPonds) return;
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

    addPond({
      id: Date.now().toString(),
      pondName: pond.pondName,
      pondArea: pond.pondArea,
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
    });

    setStartCycleVisible(false);
    setNewCycleForm({
      density: '',
      docStart: new Date().toISOString().split('T')[0],
      plValue: '',
      plSupplier: '',
    });
    router.push('/(tabs)' as any);
    Alert.alert(t.messages.success, `${pond.pondName} new cycle started.`);
  }, [addPond, canEditPonds, newCycleForm, pond, ponds, router, t]);

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
    
    router.push('/(tabs)' as any);
  }, [pond, updateSampling, getPondById, router]);

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
    pondSamplingData
  } = calculations;

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
      <View style={styles.container}>
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
            {getPondCycleStatus(pond) === 'ended' && canEditPonds && (
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
              </View>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.moreButton} 
            onPress={() => setShowMore(!showMore)}
          >
            <Text style={styles.moreButtonText}>
              {showMore ? t.home.hideDetails : t.home.moreDetails}
            </Text>
          </TouchableOpacity>

          {showMore && (
            <View style={styles.detailsBubble}>
              <View style={styles.columnContainer}>
                <View style={styles.column}>
                  <DataRow 
                    label={t.shrimp.mortality} 
                    value={mortalityPieces} 
                    unit="pcs" 
                  />
                  <DataRow 
                    label={`${t.home.total} ${t.shrimp.mortality}`} 
                    value={totalMortality} 
                    unit="pcs" 
                  />
                  <DataRow 
                    label={t.shrimp.fcr} 
                    value={fcr} 
                  />
                </View>
                <View style={styles.column}>
                  <DataRow 
                    label={t.home.mortalityWeight} 
                    value={mortalityWeight.toFixed(2)} 
                    unit="kg" 
                  />
                  <DataRow 
                    label={t.home.totalMortalityWeight} 
                    value={totalMortalityWeight.toFixed(2)} 
                    unit="kg" 
                  />
                  <DataRow 
                    label={`${t.home.total} ${t.nav.feed}`} 
                    value={totalFeed.toFixed(1)} 
                    unit="kg" 
                  />
                  <DataRow
                    label={t.forms.supplier}
                    value={getPondPlSupplier(pond)}
                  />
                </View>
              </View>
            </View>
          )}

          {pondSamplingData.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>
                {t.home.samplingHistory}
              </Text>
              <FlatList
                data={pondSamplingData}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                contentContainerStyle={styles.samplingContainer}
                renderItem={({ item: sample }) => (
                    <View style={styles.samplingRow}>
                      <View style={styles.samplingData}>
                        <Text style={styles.samplingDate}>
                          {new Date(sample.date).toLocaleDateString()}
                        </Text>
                        <Text style={styles.samplingValue}>
                          MBW: {sample.mbw}g
                        </Text>
                        <Text style={styles.samplingValue}>
                          {t.shrimp.mortality}: {sample.mortality}
                        </Text>
                        <Text style={styles.samplingValue}>
                          {t.nav.feed}: {sample.feed}kg {sample.feedData?.inventoryFeedId && `• ${getFeedName(sample.feedData.inventoryFeedId)}`}
                        </Text>
                      </View>
                      {canEditPonds && isPondCycleActive(pond) && (
                        <TouchableOpacity 
                          style={styles.editButton} 
                          onPress={() => openEditModal(sample)}
                        >
                          <Ionicons 
                            name="pencil-outline" 
                            size={16} 
                            color="#315f57" 
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                )}
              />
            </>
          )}
        </ScrollView>

        <EditSamplingModal
          visible={editModalVisible}
          sample={selectedSample}
          onClose={closeEditModal}
          onSave={handleSaveEdit}
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
              <Text style={styles.cycleHint}>{pond.pondName} and {pond.pondArea.toLocaleString()} m² will be reused. Enter new stocking details for this cycle.</Text>
              <EditInputField label={t.forms.density} value={newCycleForm.density} onChangeText={(value) => setNewCycleForm(prev => ({ ...prev, density: value }))} keyboardType="numeric" />
              <EditInputField label={t.forms.startDate} value={newCycleForm.docStart} onChangeText={(value) => setNewCycleForm(prev => ({ ...prev, docStart: value }))} />
              <EditInputField label={t.forms.plValue} value={newCycleForm.plValue} onChangeText={(value) => setNewCycleForm(prev => ({ ...prev, plValue: value }))} keyboardType="numeric" />
              <EditInputField label="PL Supplier" value={newCycleForm.plSupplier} onChangeText={(value) => setNewCycleForm(prev => ({ ...prev, plSupplier: value }))} />
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
      </View>
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#315f57', fontSize: 16 },
  moreButton: { padding: 12, backgroundColor: '#dce8f2', borderRadius: 12, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#315f57' },
  moreButtonText: { fontWeight: '600', color: '#0d2137' },
  samplingContainer: { marginBottom: 20 },
  samplingRow: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e8f2f9' },
  samplingData: { flex: 1 },
  samplingDate: { fontWeight: 'bold', color: '#0d2137' },
  samplingValue: { color: '#315f57', fontSize: 12 },
  editButton: { padding: 8, backgroundColor: '#f4f8fc', borderRadius: 8, borderWidth: 1, borderColor: '#e8f2f9' },
  
  // MODAL STYLES
  editModalContainer: { flex: 1, backgroundColor: 'rgba(15, 76, 117, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  editModalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 400, padding: 24 },
  editModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  editModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0d2137' },
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
  dateInput: { borderWidth: 1, borderColor: '#e8f2f9', padding: 12, borderRadius: 8, backgroundColor: '#f4f8fc', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { color: '#0d2137', fontSize: 16 },
});
