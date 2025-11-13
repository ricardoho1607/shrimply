import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { 
  Modal, ScrollView, StatusBar, StyleSheet, Text, 
  TextInput, TouchableOpacity, View, Alert, Platform 
} from 'react-native';
import { usePondStore, type Pond, type Sampling } from './store/pondStore';
import { useLanguage } from './../context/LanguageContext';
import { useAuth } from './../context/AuthContext';

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
      setMbw(sample.mbw.toString());
      setMortality(sample.mortality.toString());
      setFeed(sample.feed.toString());
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

  const InputField = ({ 
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
        placeholderTextColor="#3282B8"
        blurOnSubmit={false}
        returnKeyType="next"
        autoCorrect={false}
        autoCapitalize="none"
      />
    </View>
  );

  return (
    <Modal visible={visible} animationType="none" transparent>
      <View style={styles.editModalContainer}>
        <View style={styles.editModalContent}>
          <View style={styles.editModalHeader}>
            <Text style={styles.editModalTitle}>
              {t.actions.edit} {t.home.samplingData}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#3282B8" />
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            keyboardShouldPersistTaps="handled" 
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            <InputField
              label={t.shrimp.meanBodyWeight}
              value={mbw}
              onChangeText={setMbw}
              keyboardType="numeric"
            />
            <InputField
              label={t.shrimp.mortality}
              value={mortality}
              onChangeText={setMortality}
              keyboardType="numeric"
            />
            <InputField
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
      </View>
    </Modal>
  );
};

export default function PondDetails() {
  const router = useRouter();
  const { pondId } = useLocalSearchParams();
  const { t } = useLanguage();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const canEditPonds = user?.role === 'technician' || user?.role === 'owner';
  
  const { 
    getPondById, 
    updateSampling, 
    calculatePondMetricsWithHarvest 
  } = usePondStore();
  
  const [pond, setPond] = useState<Pond | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedSample, setSelectedSample] = useState<Sampling | null>(null);

  useEffect(() => {
    if (pondId) {
      const pondData = getPondById(pondId as string);
      if (pondData) {
        setPond(pondData);
      }
    }
  }, [pondId]);

  const calculations = useMemo(() => {
    if (!pond) return null;

    const calculateDOC = (start: string) => {
      if (!start) return 0;
      const diffTime = new Date().getTime() - new Date(start).getTime();
      return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    };

    const getPondSamplingData = () => pond?.samplings || [];

    const getLatestSamplingData = () => 
      getPondSamplingData()
        .filter((s: Sampling) => 
          !(s.mbw === 0 && s.mortality === 0 && s.feed === 0)
        )
        .sort((a: Sampling, b: Sampling) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0] || null;

    const getTotalMortality = () =>
      getPondSamplingData()
        .filter((s: Sampling) => 
          !(s.mbw === 0 && s.mortality === 0 && s.feed === 0)
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
          !(s.mbw === 0 && s.mortality === 0 && s.feed === 0)
        )
        .sort((a: Sampling, b: Sampling) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
      
      if (pondSampling.length === 0) return { last: 0, average: 0 };
      
      let totalADG = 0;
      let adgCount = 0;
      let lastADG = 0;

      if (pondSampling.length >= 1 && pond.initialWeight) {
        const daysDiff = Math.abs(
          (new Date(pondSampling[0].date).getTime() - 
           new Date(pond.docStart).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysDiff > 0) {
          const adg = calculateADG(
            pondSampling[0].mbw, 
            pond.initialWeight, 
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

    const getTotalFeedData = () => {
      const samplingFeed = getPondSamplingData()
        .filter((s: Sampling) => 
          !(s.mbw === 0 && s.mortality === 0 && s.feed === 0)
        )
        .reduce((total: number, s: Sampling) => 
          total + (s.feed || 0), 0
        );

      const feedManagementFeed = getPondSamplingData()
        .filter((s: Sampling) => s.feedData)
        .reduce((total: number, s: Sampling) => 
          total + (parseFloat(s.feedData?.totalDailyFeed || '0') || 0), 0
        );

      return feedManagementFeed > 0 ? feedManagementFeed : samplingFeed;
    };

    const latestSampling = getLatestSamplingData();
    const doc = calculateDOC(pond.docStart);
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
        !(s.mbw === 0 && s.mortality === 0 && s.feed === 0)
      )
      .reduce((total: number, s: Sampling) => 
        total + (s.mortality * s.mbw) / 1000, 0
      );

    const pondSamplingData = getPondSamplingData()
      .filter((s: Sampling) => 
        !(s.mbw === 0 && s.mortality === 0 && s.feed === 0)
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
    if (!canEditPonds) {
      Alert.alert(
        t.home.permissionDenied,
        t.home.onlyTechniciansCanEdit,
        [{ text: t.actions.confirm }]
      );
      return;
    }
    
    setSelectedSample(sample);
    setEditModalVisible(true);
  }, [canEditPonds, t]);

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
    
    router.push('/');
  }, [pond, updateSampling, getPondById, router]);

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

  if (!pond || !calculations) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#1B262C" />
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
  } = calculations;

  return (
    <>
      <Stack.Screen 
        options={{
          title: pond.pondName,
          headerBackTitle: t.nav.ponds,
          headerStyle: { backgroundColor: '#BBE1FA' },
          headerTintColor: '#1B262C',
          headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
          headerShadowVisible: false,
        }}
      />
      <StatusBar barStyle="dark-content" backgroundColor="#BBE1FA" />
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
                </View>
              </View>
            </View>
          )}

          {pondSamplingData.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>
                {t.home.samplingHistory}
              </Text>
              <View style={styles.samplingContainer}>
                {pondSamplingData.map((sample) => (
                  <View key={sample.id} style={styles.samplingRow}>
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
                        {t.nav.feed}: {sample.feed}kg
                      </Text>
                    </View>
                    {canEditPonds && (
                      <TouchableOpacity 
                        style={styles.editButton} 
                        onPress={() => openEditModal(sample)}
                      >
                        <Ionicons 
                          name="pencil-outline" 
                          size={16} 
                          color="#3282B8" 
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>

        <EditSamplingModal
          visible={editModalVisible}
          sample={selectedSample}
          onClose={closeEditModal}
          onSave={handleSaveEdit}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backButton: { 
    marginRight: Platform.OS === 'android' ? 12 : 16 
  },
  
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: Platform.OS === 'android' ? 12 : 16 
  },
  
  pondName: { 
    fontSize: Platform.OS === 'android' ? 17 : 18, 
    color: '#1B262C', 
    fontWeight: 'bold' 
  },
  
  scrollView: { 
    flex: 1, 
    padding: Platform.OS === 'android' ? 16 : 20 
  },
  
  title: { 
    fontSize: Platform.OS === 'android' ? 22 : 24, 
    fontWeight: 'bold', 
    color: '#1B262C', 
    marginBottom: Platform.OS === 'android' ? 20 : 24 
  },
  
  sectionTitle: { 
    fontSize: Platform.OS === 'android' ? 18 : 20, 
    fontWeight: 'bold', 
    color: '#1B262C', 
    marginBottom: Platform.OS === 'android' ? 12 : 16, 
    marginTop: Platform.OS === 'android' ? 20 : 24 
  },
  
  detailsBubble: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    padding: Platform.OS === 'android' ? 20 : 24, 
    borderWidth: 1, 
    borderColor: '#BBE1FA', 
    marginBottom: Platform.OS === 'android' ? 12 : 16,
    shadowColor: '#0F4C75',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  columnContainer: { 
    flexDirection: 'row', 
    gap: Platform.OS === 'android' ? 20 : 24 
  },
  
  column: { 
    flex: 1 
  },
  
  dataRow: { 
    marginBottom: Platform.OS === 'android' ? 16 : 20 
  },
  
  dataLabel: { 
    fontSize: Platform.OS === 'android' ? 13 : 14, 
    color: '#0F4C75', 
    marginBottom: 4, 
    fontWeight: '500',
    lineHeight: Platform.OS === 'android' ? 18 : 20
  },
  
  dataValue: { 
    fontSize: Platform.OS === 'android' ? 17 : 18, 
    color: '#1B262C', 
    fontWeight: '600' 
  },
  
  dataUnit: { 
    fontSize: Platform.OS === 'android' ? 13 : 14, 
    color: '#3282B8', 
    fontWeight: '400' 
  },
  
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  loadingText: { 
    color: '#3282B8', 
    fontSize: Platform.OS === 'android' ? 15 : 16 
  },
  
  moreButton: { 
    padding: Platform.OS === 'android' ? 10 : 12, 
    backgroundColor: '#BBE1FA', 
    borderRadius: 12, 
    alignItems: 'center', 
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3282B8',
  },
  
  moreButtonText: { 
    fontSize: Platform.OS === 'android' ? 15 : 16, 
    fontWeight: '600', 
    color: '#0F4C75' 
  },
  
  samplingContainer: { 
    marginBottom: 20 
  },
  
  samplingRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: Platform.OS === 'android' ? 10 : 12, 
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 12, 
    marginBottom: Platform.OS === 'android' ? 6 : 8, 
    borderWidth: 1, 
    borderColor: '#BBE1FA', 
    shadowColor: '#0F4C75',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  
  samplingData: { 
    flex: 1 
  },
  
  samplingDate: { 
    color: '#1B262C', 
    fontSize: Platform.OS === 'android' ? 13 : 14, 
    fontWeight: 'bold', 
    marginBottom: 4 
  },
  
  samplingValue: { 
    color: '#3282B8', 
    fontSize: Platform.OS === 'android' ? 11 : 12, 
    marginBottom: 2,
    lineHeight: Platform.OS === 'android' ? 16 : 18
  },
  
  editButton: { 
    padding: Platform.OS === 'android' ? 6 : 8, 
    backgroundColor: '#F8FAFC', 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#BBE1FA' 
  },
  
  editModalContainer: { 
    flex: 1, 
    backgroundColor: 'rgba(15, 76, 117, 0.7)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  
  editModalContent: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    width: '100%', 
    maxWidth: 400, 
    borderWidth: 1, 
    borderColor: '#BBE1FA', 
    padding: Platform.OS === 'android' ? 20 : 24 
  },
  
  editModalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: Platform.OS === 'android' ? 20 : 24 
  },
  
  editModalTitle: { 
    fontSize: Platform.OS === 'android' ? 18 : 20, 
    fontWeight: 'bold', 
    color: '#1B262C' 
  },
  
  closeButton: { 
    padding: 4 
  },
  
  editInputContainer: { 
    marginBottom: Platform.OS === 'android' ? 14 : 16 
  },
  
  editInputLabel: { 
    color: '#1B262C', 
    fontSize: Platform.OS === 'android' ? 13 : 14, 
    fontWeight: '600', 
    marginBottom: 8 
  },
  
  editInput: { 
    borderWidth: 1, 
    borderColor: '#BBE1FA', 
    padding: Platform.OS === 'android' ? 10 : 12, 
    borderRadius: 8, 
    backgroundColor: '#F8FAFC', 
    color: '#1B262C', 
    fontSize: Platform.OS === 'android' ? 15 : 16,
    includeFontPadding: false,
    textAlignVertical: 'center'
  },
  
  editButtonContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    gap: 12, 
    marginTop: 8 
  },
  
  editCancelButton: { 
    backgroundColor: 'transparent', 
    paddingVertical: Platform.OS === 'android' ? 10 : 12, 
    paddingHorizontal: Platform.OS === 'android' ? 16 : 20, 
    borderRadius: 8, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#e74c3c', 
    flex: 1 
  },
  
  editCancelText: { 
    color: '#e74c3c', 
    fontSize: Platform.OS === 'android' ? 13 : 14, 
    fontWeight: 'bold' 
  },
  
  editSaveButton: { 
    backgroundColor: '#0F4C75', 
    paddingVertical: Platform.OS === 'android' ? 10 : 12, 
    paddingHorizontal: Platform.OS === 'android' ? 16 : 20, 
    borderRadius: 8, 
    alignItems: 'center', 
    flex: 1 
  },
  
  editSaveText: { 
    color: '#FFFFFF', 
    fontSize: Platform.OS === 'android' ? 13 : 14, 
    fontWeight: 'bold' 
  },
});