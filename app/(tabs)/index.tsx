// app/(tabs)/index.tsx - Fully translated version with keyboard handling
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Modal, Platform, ScrollView, StatusBar, StyleSheet, 
  Text, TextInput, TouchableOpacity, View, Alert, KeyboardAvoidingView
} from 'react-native';
import { usePondStore, type Pond, type Sampling } from '.././store/pondStore';
import { useFirebaseSync } from '.././hooks/useFirebaseSync';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

interface FormData {
  pondName: string; 
  pondArea: string; 
  density: string; 
  supplier: string; 
  plValue: string; 
  docStart: Date;
  selectedPond: string; 
  mbw: string; 
  mortality: string; 
  feed: string; 
  samplingDate: Date;
}

const ShrimpIcon = ({ size = 16, color = "#BBE1FA" }: { 
  size?: number; 
  color?: string 
}) => (
  <Text style={{ color, fontSize: size * 0.8, fontWeight: 'bold' }}>
    🦐
  </Text>
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
        <ShrimpIcon size={14} />
      ) : iconName ? (
        <Ionicons name={iconName as any} size={14} color="#BBE1FA" />
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

const InputField = ({ 
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
      placeholderTextColor="#BBE1FA" 
    />
    {hint && <Text style={styles.inputHint}>{hint}</Text>}
  </View>
);

const DateInput = ({ 
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
      <Ionicons name="calendar-outline" size={20} color="#BBE1FA" />
    </TouchableOpacity>
  </View>
);

export default function PondManagementScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, company } = useAuth();
  const canEditPonds = user?.role === 'technician' || user?.role === 'owner';
  
  const { 
    ponds, 
    addPond, 
    addSampling, 
    deletePond, 
    calculatePondMetricsWithHarvest, 
    switchAccount, 
    setFirebaseSync 
  } = usePondStore();
  
  const firebaseSync = useFirebaseSync();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [pondToDelete, setPondToDelete] = useState<Pond | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [modalType, setModalType] = useState<'pond' | 'sampling'>('pond');
  const [tempDate, setTempDate] = useState(new Date());
  const [formData, setFormData] = useState<FormData>({
    pondName: '', 
    pondArea: '', 
    density: '', 
    supplier: '', 
    plValue: '', 
    docStart: new Date(),
    selectedPond: '', 
    mbw: '', 
    mortality: '', 
    feed: '', 
    samplingDate: new Date()
  });

  useEffect(() => {
    if (company?.id) {
      switchAccount(company.id);
      setFirebaseSync({
        syncPond: firebaseSync.syncPond,
        syncSampling: firebaseSync.syncSampling,
        syncHarvestRecord: firebaseSync.syncHarvestRecord,
      });
    }
  }, [
    company?.id, 
    firebaseSync.syncPond, 
    firebaseSync.syncSampling, 
    firebaseSync.syncHarvestRecord, 
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

  const calculateDOC = useCallback((start: string): number => {
    const diff = Date.now() - new Date(start).getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.floor(days));
  }, []);

  const getPondSamplingData = useCallback((pondName: string): Sampling[] => {
    const pond = ponds.find(p => p.pondName === pondName);
    return pond ? pond.samplings.filter((s: Sampling) => 
      !(s.mbw === 0 && s.mortality === 0 && s.feed === 0)
    ) : [];
  }, [ponds]);

  const getLatestSampling = useCallback((pondName: string): Sampling | null => {
    const samples = getPondSamplingData(pondName);
    return samples.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0] || null;
  }, [getPondSamplingData]);

  const getLastADG = useCallback((pondName: string): number => {
    const pond = ponds.find(p => p.pondName === pondName);
    if (!pond) return 0;
    
    const samples = getPondSamplingData(pondName).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    if (!samples.length) return 0;

    const getTimeDiff = (date1: string, date2: string) => {
      const diff = new Date(date1).getTime() - new Date(date2).getTime();
      return diff / (1000 * 60 * 60 * 24);
    };

    const [currentWeight, previousWeight, daysDiff] = samples.length === 1
      ? [
          samples[0].mbw, 
          pond.initialWeight || 0.5, 
          getTimeDiff(samples[0].date, pond.docStart)
        ]
      : [
          samples[samples.length - 1].mbw, 
          samples[samples.length - 2].mbw, 
          getTimeDiff(
            samples[samples.length - 1].date, 
            samples[samples.length - 2].date
          )
        ];
    
    return daysDiff > 0 ? (currentWeight - previousWeight) / daysDiff : 0;
  }, [ponds, getPondSamplingData]);

  const calculateMetrics = useCallback((pond: Pond) => {
    const metrics = calculatePondMetricsWithHarvest(pond);
    const latestSampling = getLatestSampling(pond.pondName);
    const size = latestSampling 
      ? (1000 / latestSampling.mbw).toFixed(0) 
      : '0';
      
    return {
      doc: calculateDOC(pond.docStart), 
      totalBiomass: metrics.currentBiomass,
      sr: metrics.adjustedSR.toFixed(1), 
      size,
      currentPopulation: metrics.currentPopulation, 
      latestSampling,
      fcr: metrics.adjustedFCR.toFixed(2),
    };
  }, [calculatePondMetricsWithHarvest, getLatestSampling, calculateDOC]);

  const getDOCColor = useCallback((doc: number): string => {
    if (doc < 30) return '#0F4C75';
    if (doc < 60) return '#3282B8';
    if (doc < 90) return '#BBE1FA';
    return '#1B262C';
  }, []);

  const handleAddPond = useCallback(() => {
    if (!canEditPonds) {
      Alert.alert(
        t.home.permissionDenied, 
        t.home.onlyTechniciansCanAdd, 
        [{ text: t.actions.confirm }]
      );
      return;
    }
    
    const { 
      pondName, 
      pondArea, 
      density, 
      docStart, 
      supplier, 
      plValue 
    } = formData;
    
    if (!pondName || !pondArea || !density || !supplier || !plValue) {
      Alert.alert(t.messages.error, t.home.fillAllFields);
      return;
    }
    
    addPond({
      id: Date.now().toString(), 
      pondName, 
      supplier, 
      pondArea: Number(pondArea), 
      density: Number(density),
      initialPopulation: Number(pondArea) * Number(density), 
      docStart: docStart.toISOString().split('T')[0],
      initialWeight: convertPlToGrams(plValue), 
      samplings: [],
      totalHarvestedBiomass: 0, 
      totalHarvestedPopulation: 0, 
      totalHarvestedFeed: 0
    });
    
    closeModal();
    Alert.alert(t.messages.success, t.home.pondAddedSuccess);
  }, [canEditPonds, formData, addPond, convertPlToGrams, t]);

  const handleAddSamplingData = useCallback(() => {
    if (!canEditPonds) {
      Alert.alert(
        t.home.permissionDenied, 
        t.home.onlyTechniciansCanAdd, 
        [{ text: t.actions.confirm }]
      );
      return;
    }
    
    const { 
      selectedPond, 
      mbw, 
      mortality, 
      feed, 
      samplingDate 
    } = formData;
    
    if (!selectedPond || !mbw || mortality === '' || !feed) {
      Alert.alert(t.messages.error, t.home.fillAllFields);
      return;
    }
    
    const selectedPondData = ponds.find(
      p => p.pondName === selectedPond
    );
    
    if (!selectedPondData) {
      Alert.alert(t.messages.error, t.home.pondNotFound);
      return;
    }
    
    addSampling(selectedPondData.id, {
      id: Date.now().toString(), 
      mbw: Number(mbw), 
      mortality: Number(mortality),
      feed: Number(feed), 
      date: samplingDate.toISOString().split('T')[0],
    });
    
    closeModal();
    Alert.alert(t.messages.success, t.home.samplingAddedSuccess);
  }, [canEditPonds, formData, ponds, addSampling, t]);

  const closeModal = useCallback(() => { 
    resetForm(); 
    setModalVisible(false); 
  }, [resetForm]);
  
  const handleDeletePond = useCallback((pond: Pond) => {
    if (!canEditPonds) {
      Alert.alert(
        t.home.permissionDenied, 
        t.home.onlyTechniciansCanDelete, 
        [{ text: t.actions.confirm }]
      );
      return;
    }
    setPondToDelete(pond); 
    setDeleteModalVisible(true); 
  }, [canEditPonds, t]);
  
  const confirmDeletePond = useCallback(() => {
    if (pondToDelete) { 
      deletePond(pondToDelete.id); 
      setDeleteModalVisible(false); 
      setPondToDelete(null); 
      Alert.alert(t.messages.success, t.home.pondDeletedSuccess);
    }
  }, [pondToDelete, deletePond, t]);
  
  const cancelDeletePond = useCallback(() => { 
    setDeleteModalVisible(false); 
    setPondToDelete(null); 
  }, []);

  const handleDateChange = useCallback((
    confirmed: boolean, 
    selectedDate?: Date
  ) => {
    if (confirmed && selectedDate) {
      updateForm(
        modalType === 'pond' ? 'docStart' : 'samplingDate', 
        selectedDate
      );
    }
    setShowDatePicker(false);
  }, [modalType, updateForm]);

  const openDatePicker = useCallback(() => {
    setTempDate(modalType === 'pond' ? formData.docStart : formData.samplingDate);
    setShowDatePicker(true);
  }, [modalType, formData]);

  const openModal = useCallback((type: 'pond' | 'sampling') => {
    setModalType(type); 
    setMenuModalVisible(false); 
    setModalVisible(true);
  }, []);

  const PondCard = useMemo(() => React.memo(({ pond }: { pond: Pond }) => {
    const metrics = calculateMetrics(pond);
    const lastADG = getLastADG(pond.pondName);

    return (
      <TouchableOpacity 
        style={styles.pondCard} 
        onPress={() => router.push({ 
          pathname: '/ponddetails', 
          params: { pondId: pond.id } 
        })}
      >
        <View style={styles.pondHeader}>
          <Text style={styles.pondName}>{pond.pondName}</Text>
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
              <TouchableOpacity 
                style={styles.editButton} 
                onPress={(e) => { 
                  e.stopPropagation(); 
                  handleDeletePond(pond); 
                }}
              >
                <Ionicons name="trash-outline" size={18} color="#e74c3c" />
              </TouchableOpacity>
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
              value={pond.supplier} 
            />
            {(pond.totalHarvestedBiomass || 0) === 0 && <DetailItem />}
          </View>
        </View>

        <View style={styles.startDateContainer}>
          <Ionicons name="calendar-outline" size={14} color="#BBE1FA" />
          <Text style={styles.startDate}>
            {t.shrimp.started}: {new Date(pond.docStart).toLocaleDateString()}
            {metrics.latestSampling && 
              ` • ${t.shrimp.lastSampling}: ${new Date(metrics.latestSampling.date).toLocaleDateString()}`
            }
          </Text>
        </View>
      </TouchableOpacity>
    );
  }), [
    calculateMetrics, 
    getLastADG, 
    getDOCColor, 
    handleDeletePond, 
    router, 
    canEditPonds, 
    t
  ]);

  const renderPondForm = useMemo(() => (
    <>
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
    </>
  ), [formData, updateForm, openDatePicker, t]);

  const renderSamplingForm = useMemo(() => (
    <>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{t.forms.selectPond}</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.pondSelector}
        >
          {ponds.map(pond => (
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
  ), [formData, ponds, updateForm, openDatePicker, t]);

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <View style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
        >
          {ponds.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="home-outline" size={80} color="#3282B8" />
              <Text style={styles.emptyTitle}>{t.home.noPondsYet}</Text>
              <Text style={styles.emptySubtitle}>
                {canEditPonds 
                  ? t.home.noPondsSubtitle 
                  : t.home.contactOwnerToAdd
                }
              </Text>
            </View>
          ) : (
            ponds.map(pond => <PondCard key={pond.id} pond={pond} />)
          )}
        </ScrollView>

        {canEditPonds && (
          <TouchableOpacity 
            style={styles.floatingButton} 
            onPress={() => setMenuModalVisible(true)}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        )}

        <Modal visible={deleteModalVisible} animationType="fade" transparent>
          <View style={styles.deleteModalContainer}>
            <View style={styles.deleteModalContent}>
              <View style={styles.deleteModalIcon}>
                <Ionicons name="warning-outline" size={48} color="#e74c3c" />
              </View>
              <Text style={styles.deleteModalTitle}>
                {t.home.deletePond}
              </Text>
              <Text style={styles.deleteModalMessage}>
                {t.messages.deletePondConfirm} "{pondToDelete?.pondName}"?
              </Text>
              <Text style={styles.deleteModalWarning}>
                {t.messages.deletePondWarning}
              </Text>
              <View style={styles.deleteModalButtons}>
                <TouchableOpacity 
                  style={styles.deleteModalCancelButton} 
                  onPress={cancelDeletePond}
                >
                  <Text style={styles.deleteModalCancelText}>
                    {t.actions.cancel}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.deleteModalConfirmButton} 
                  onPress={confirmDeletePond}
                >
                  <Text style={styles.deleteModalConfirmText}>
                    {t.actions.delete}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={menuModalVisible} animationType="fade" transparent>
          <View style={styles.menuModalContainer}>
            <View style={styles.menuModalContent}>
              <Text style={styles.menuTitle}>{t.home.whatToAdd}</Text>
              <TouchableOpacity 
                style={styles.menuOption} 
                onPress={() => openModal('pond')}
              >
                <Ionicons name="water-outline" size={24} color="#0F4C75" />
                <Text style={styles.menuOptionText}>{t.home.newPond}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.menuOption} 
                onPress={() => openModal('sampling')}
              >
                <Ionicons name="analytics-outline" size={24} color="#3282B8" />
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
        </Modal>

        <Modal visible={modalVisible} animationType="slide" transparent>
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {modalType === 'pond' 
                    ? t.home.addNewPond 
                    : t.home.addSamplingData
                  }
                </Text>
                <TouchableOpacity 
                  onPress={() => setModalVisible(false)} 
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#BBE1FA" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                showsVerticalScrollIndicator={false} 
                style={styles.modalScrollView}
                contentContainerStyle={{ paddingBottom: 40 }}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
              >
                {modalType === 'pond' ? renderPondForm : renderSamplingForm}

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
                    style={styles.addButton} 
                    onPress={modalType === 'pond' 
                      ? handleAddPond 
                      : handleAddSamplingData
                    }
                  >
                    <Text style={styles.addButtonText}>
                      {modalType === 'pond' 
                        ? t.home.addPondButton 
                        : t.home.addDataButton
                      }
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              {showDatePicker && (
                <View style={styles.datePickerContainer}>
                  <DateTimePicker 
                    value={tempDate} 
                    mode="date" 
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, date) => setTempDate(date || tempDate)} 
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
                      onPress={() => handleDateChange(true, tempDate)}
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
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  
  scrollContent: { 
    padding: Platform.OS === 'android' ? 16 : 20, 
    paddingTop: Platform.OS === 'android' ? 16 : 20, 
    paddingBottom: 100 
  },
  
  emptyState: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: Platform.OS === 'android' ? 60 : 80 
  },
  emptyTitle: { 
    color: '#1B262C', 
    fontSize: Platform.OS === 'android' ? 22 : 24, 
    fontWeight: 'bold', 
    marginTop: Platform.OS === 'android' ? 16 : 20 
  },
  
  emptySubtitle: { 
    color: '#0F4C75', 
    fontSize: Platform.OS === 'android' ? 15 : 16, 
    marginTop: 8, 
    textAlign: 'center', 
    paddingHorizontal: 20 
  },
  
  floatingButton: { 
    position: 'absolute', 
    bottom: 30, 
    right: 30, 
    backgroundColor: '#0F4C75', 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    alignItems: 'center', 
    justifyContent: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8, 
    elevation: 8 
  },
  
  deleteModalContainer: { 
    flex: 1, 
    backgroundColor: 'rgba(15, 76, 117, 0.8)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  
  deleteModalContent: { 
    backgroundColor: '#0F4C75', 
    padding: Platform.OS === 'android' ? 20 : 24, 
    borderRadius: 20, 
    width: '90%', 
    maxWidth: 400, 
    borderWidth: 1, 
    borderColor: '#3282B8', 
    alignItems: 'center' 
  },
  
  deleteModalIcon: { 
    marginBottom: Platform.OS === 'android' ? 12 : 16 
  },
  
  deleteModalTitle: { 
    fontSize: Platform.OS === 'android' ? 20 : 22, 
    fontWeight: 'bold', 
    color: '#F8FAFC', 
    marginBottom: 12, 
    textAlign: 'center' 
  },
  
  deleteModalMessage: { 
    fontSize: Platform.OS === 'android' ? 15 : 16, 
    color: '#F8FAFC', 
    textAlign: 'center', 
    marginBottom: 12,
    lineHeight: Platform.OS === 'android' ? 20 : 22
  },
  
  deleteModalWarning: { 
    fontSize: Platform.OS === 'android' ? 13 : 14, 
    color: '#BBE1FA', 
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
    backgroundColor: '#3282B8', 
    alignItems: 'center' 
  },
  
  deleteModalCancelText: { 
    color: '#F8FAFC', 
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
    backgroundColor: '#FFFFFF', 
    padding: Platform.OS === 'android' ? 16 : 20, 
    borderRadius: 16, 
    marginBottom: Platform.OS === 'android' ? 12 : 16, 
    borderWidth: 1, 
    borderColor: '#BBE1FA', 
    shadowColor: '#0F4C75', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    elevation: 3 
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
    color: '#1B262C', 
    flex: 1 
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
    color: '#0F4C75', 
    fontSize: Platform.OS === 'android' ? 10 : 11, 
    marginLeft: 6, 
    width: Platform.OS === 'android' ? 48 : 52, 
    flexShrink: 0,
  },
  
  detailValue: { 
    color: '#1B262C', 
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
    borderTopColor: '#BBE1FA' 
  },
  
  startDate: { 
    color: '#0F4C75', 
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
    borderColor: '#BBE1FA' 
  },
  
  menuTitle: { 
    fontSize: Platform.OS === 'android' ? 18 : 20, 
    fontWeight: 'bold', 
    color: '#1B262C', 
    textAlign: 'center', 
    marginBottom: Platform.OS === 'android' ? 20 : 24 
  },
  
  menuOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: Platform.OS === 'android' ? 14 : 16, 
    backgroundColor: '#F8FAFC', 
    borderRadius: 12, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: '#BBE1FA' 
  },
  
  menuOptionText: { 
    color: '#1B262C', 
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
    color: '#0F4C75', 
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
    borderColor: '#BBE1FA', 
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
    color: '#1B262C' 
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
    color: '#1B262C', 
    fontSize: Platform.OS === 'android' ? 13 : 14, 
    fontWeight: '600', 
    marginBottom: 8 
  },
  
  input: { 
    borderWidth: 1, 
    borderColor: '#BBE1FA', 
    padding: Platform.OS === 'android' ? 14 : 16, 
    borderRadius: 12, 
    backgroundColor: '#FFFFFF', 
    color: '#1B262C', 
    fontSize: Platform.OS === 'android' ? 15 : 16,
    includeFontPadding: false,
    textAlignVertical: 'center'
  },
  
  inputHint: { 
    color: '#0F4C75', 
    fontSize: Platform.OS === 'android' ? 11 : 12, 
    marginTop: 4, 
    fontStyle: 'italic',
    lineHeight: Platform.OS === 'android' ? 16 : 18
  },
  
  dateInput: { 
    borderWidth: 1, 
    borderColor: '#BBE1FA', 
    padding: Platform.OS === 'android' ? 14 : 16, 
    borderRadius: 12, 
    backgroundColor: '#FFFFFF', 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  
  dateText: { 
    color: '#1B262C', 
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
    borderColor: '#BBE1FA' 
  },
  
  pondOptionSelected: { 
    backgroundColor: '#0F4C75', 
    borderColor: '#0F4C75' 
  },
  
  pondOptionText: { 
    color: '#0F4C75', 
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
    gap: 16, 
    marginTop: Platform.OS === 'android' ? 24 : 32, 
    marginBottom: Platform.OS === 'android' ? 20 : 24 
  },
  
  addButton: { 
    backgroundColor: '#3282B8', 
    paddingVertical: Platform.OS === 'android' ? 15 : 18, 
    paddingHorizontal: Platform.OS === 'android' ? 28 : 32, 
    borderRadius: 14, 
    alignItems: 'center', 
    flex: 1, 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8, 
    elevation: 6 
  },
  
  addButtonText: { 
    color: '#fff', 
    fontSize: Platform.OS === 'android' ? 15 : 16, 
    fontWeight: '600', 
    letterSpacing: 0.5 
  },
  
  cancelButton: { 
    backgroundColor: 'transparent', 
    paddingVertical: Platform.OS === 'android' ? 15 : 18, 
    paddingHorizontal: Platform.OS === 'android' ? 28 : 32, 
    borderRadius: 14, 
    alignItems: 'center', 
    borderWidth: 2, 
    borderColor: '#e74c3c', 
    flex: 1 
  },
  
  cancelButtonText: { 
    color: '#e74c3c', 
    fontSize: Platform.OS === 'android' ? 16 : 17, 
    fontWeight: '600', 
    letterSpacing: 0.5 
  },
  
  datePickerContainer: { 
    backgroundColor: '#0F4C75', 
    borderTopWidth: 1, 
    borderTopColor: '#3282B8', 
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
    backgroundColor: '#3282B8' 
  },
  
  datePickerCancelText: { 
    color: '#F8FAFC', 
    fontWeight: '600',
    fontSize: Platform.OS === 'android' ? 14 : 15
  },
  
  datePickerConfirmButton: { 
    paddingVertical: Platform.OS === 'android' ? 8 : 10, 
    paddingHorizontal: Platform.OS === 'android' ? 16 : 20, 
    borderRadius: 8, 
    backgroundColor: '#BBE1FA' 
  },
  
  datePickerConfirmText: { 
    color: '#0F4C75', 
    fontWeight: 'bold',
    fontSize: Platform.OS === 'android' ? 14 : 15
  }
});