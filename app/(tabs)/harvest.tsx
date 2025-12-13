import { Ionicons } from "@expo/vector-icons";
import { useRouter } from 'expo-router';
import React, { useState } from "react";
import { Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert, Platform, KeyboardAvoidingView } from "react-native";
import { usePondStore, HarvestRecord } from "../store/pondStore";
import { useLanguage } from '../../context/LanguageContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useAuth } from '../../context/AuthContext';

interface HarvestData extends HarvestRecord {}

const Input = React.memo(({ label, value, onChangeText, placeholder }: any) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput style={styles.input} keyboardType="numeric" value={value} 
      onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#BBE1FA" />
  </View>
));

const SummaryItem = React.memo(({ iconName, label, value, unit = "" }: any) => (
  <View style={styles.summaryItem}>
    <Ionicons name={iconName as any} size={16} color="#BBE1FA" />
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue}>{value} {unit}</Text>
  </View>
));

export default function HarvestScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const { user } = useAuth();
  const { ponds, addHarvestData, harvestRecords, addHarvestRecord, removeHarvestRecord, processHarvestImpact } = usePondStore();
  
  const canEditHarvest = user?.role === 'technician' || user?.role === 'owner';

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [harvestToDelete, setHarvestToDelete] = useState<string | null>(null);

  const initializePondData = () => ponds.map(pond => ({
    pondId: pond.id, pondName: pond.pondName,
    biomass: "", size: "", price: "", subBiomass: "", subSize: "", subPrice: "",
  }));

  const [pondData, setPondData] = useState(initializePondData());

  React.useEffect(() => { setPondData(initializePondData()); }, [ponds]);

  const updatePondField = (pondId: string, field: string, value: string) => {
    setPondData(prev => prev.map(pond => pond.pondId === pondId ? { ...pond, [field]: value } : pond));
  };

  const handleSave = () => {
    if (!canEditHarvest) {
      Alert.alert(t.harvest.permissionDenied, t.harvest.permissionMessage);
      return;
    }

    const pondsWithData = pondData.filter(pond => 
      pond.biomass || pond.size || pond.price || pond.subBiomass || pond.subSize || pond.subPrice);

    if (pondsWithData.length === 0) return;

    pondsWithData.forEach(pondData => {
      const recordToSave = {
        biomass: pondData.biomass.trim(), size: pondData.size.trim(), pricePerKg: pondData.price.trim(),
        subBiomass: pondData.subBiomass.trim(), subSize: pondData.subSize.trim(), subPricePerKg: pondData.subPrice.trim(),
      };
      addHarvestData(pondData.pondId, recordToSave);
    });

    const newHarvest: HarvestRecord = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      ponds: pondsWithData,
    };

    addHarvestRecord(newHarvest);
    processHarvestImpact(newHarvest);
    resetForm();
    setIsModalVisible(false);
  };

  const resetForm = () => { setPondData(initializePondData()); };

  const handleModalClose = () => { resetForm(); setIsModalVisible(false); };

  const handleDeleteHarvest = (harvestId: string) => {
    if (!canEditHarvest) {
      Alert.alert(t.harvest.permissionDenied, t.harvest.permissionMessage);
      return;
    }
    setHarvestToDelete(harvestId);
    setDeleteModalVisible(true);
  };

  const confirmDeleteHarvest = () => {
    if (harvestToDelete) {
      removeHarvestRecord(harvestToDelete);
      setDeleteModalVisible(false);
      setHarvestToDelete(null);
    }
  };

  const cancelDeleteHarvest = () => { setDeleteModalVisible(false); setHarvestToDelete(null); };

  const handleHarvestCardClick = (harvestId: string, harvestDate: string) => {
    router.push({ pathname: '/harvestdetails', params: { harvestId, harvestDate }});
  };

  const formatNumber = (num: number) => num.toLocaleString('id-ID');

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
      totalBiomass: formatNumber(parseFloat(totalBiomass.toFixed(1))),
      averageSize: formatNumber(parseFloat(averageSize.toFixed(1))),
      totalPrice: formatNumber(parseFloat(totalPrice.toFixed(0))),
    };
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0F4C75" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="cash-outline" size={28} color="#3282B8" />
          <Text style={styles.headerTitle}>{t.harvest.title}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {harvestRecords.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cash-outline" size={80} color="#3282B8" />
              <Text style={styles.emptyTitle}>{t.harvest.noRecords}</Text>
              <Text style={styles.emptySubtitle}>
                {canEditHarvest ? t.harvest.addFirst : t.harvest.noDataAvailable}
              </Text>
            </View>
          ) : (
            harvestRecords.map((harvest) => {
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
                    </TouchableOpacity>
                    {canEditHarvest && (
                      <TouchableOpacity style={styles.deleteButton}
                        onPress={() => handleDeleteHarvest(harvest.id)}>
                        <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => handleHarvestCardClick(harvest.id, harvest.date)}>
                    <View style={styles.parametersContainer}>
                      <View style={styles.parameterRow}>
                        <SummaryItem iconName="scale-outline" label={t.harvest.totalBiomass} 
                          value={totals.totalBiomass} unit="kg" />
                        <SummaryItem iconName="resize-outline" label={t.harvest.averageSize} 
                          value={totals.averageSize} />
                      </View>
                      <View style={styles.parameterRow}>
                        <SummaryItem iconName="cash-outline" label={t.harvest.totalPrice} 
                          value={formatCurrency(parseFloat(totals.totalPrice.replace(/,/g, '')))} />
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>

        {canEditHarvest && (
          <TouchableOpacity style={styles.floatingButton} onPress={() => setIsModalVisible(true)}>
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
                <Text style={styles.modalTitle}>{t.harvest.addRecord}</Text>
                <TouchableOpacity onPress={handleModalClose} style={styles.closeButton}>
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
                {ponds.map((pond) => {
                  const currentPondData = pondData.find(p => p.pondId === pond.id);
                  if (!currentPondData) return null;

                  return (
                    <View key={pond.id} style={styles.pondSection}>
                      <Text style={styles.pondSectionTitle}>{pond.pondName}</Text>

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
                        <Input label={t.harvest.pricePerKg} value={currentPondData.price}
                          onChangeText={(text: string) => updatePondField(pond.id, "price", text)}
                          placeholder={t.harvest.pricePlaceholder} />
                      </View>

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
                        <Input label={t.harvest.pricePerKg} value={currentPondData.subPrice}
                          onChangeText={(text: string) => updatePondField(pond.id, "subPrice", text)}
                          placeholder={t.harvest.subPricePlaceholder} />
                      </View>
                    </View>
                  );
                })}

                <View style={styles.buttonContainer}>
                  <TouchableOpacity style={styles.cancelButton} onPress={handleModalClose}>
                    <Text style={styles.cancelButtonText}>{t.actions.cancel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.addButton} onPress={handleSave}>
                    <Text style={styles.addButtonText}>{t.harvest.saveRecord}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal visible={deleteModalVisible} animationType="fade" transparent>
          <View style={styles.deleteModalContainer}>
            <View style={styles.deleteModalContent}>
              <View style={styles.deleteModalIcon}>
                <Ionicons name="warning-outline" size={48} color="#e74c3c" />
              </View>
              <Text style={styles.deleteModalTitle}>{t.harvest.deleteTitle}</Text>
              <Text style={styles.deleteModalText}>{t.harvest.deleteMessage}</Text>
              <View style={styles.deleteModalButtons}>
                <TouchableOpacity style={styles.deleteModalCancelButton} onPress={cancelDeleteHarvest}>
                  <Text style={styles.deleteModalCancelText}>{t.actions.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteModalConfirmButton} onPress={confirmDeleteHarvest}>
                  <Text style={styles.deleteModalConfirmText}>{t.actions.delete}</Text>
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
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Platform.OS === 'android' ? 16 : 20, paddingTop: Platform.OS === 'android' ? 16 : 20, paddingBottom: Platform.OS === 'android' ? 16 : 20 },
  headerTitle: { fontSize: Platform.OS === 'android' ? 22 : 24, fontWeight: 'bold', color: '#1B262C', marginLeft: Platform.OS === 'android' ? 10 : 12 },
  scrollContent: { padding: Platform.OS === 'android' ? 16 : 20, paddingTop: 0, paddingBottom: 100 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: Platform.OS === 'android' ? 60 : 80 },
  emptyTitle: { color: '#1B262C', fontSize: Platform.OS === 'android' ? 22 : 24, fontWeight: 'bold', marginTop: Platform.OS === 'android' ? 16 : 20 },
  emptySubtitle: { color: '#0F4C75', fontSize: Platform.OS === 'android' ? 15 : 16, marginTop: 8, lineHeight: Platform.OS === 'android' ? 20 : 22 },
  recordCard: { backgroundColor: '#FFFFFF', padding: Platform.OS === 'android' ? 16 : 20, borderRadius: 16, marginBottom: Platform.OS === 'android' ? 12 : 16, borderWidth: 1, borderColor: '#BBE1FA', shadowColor: '#0F4C75', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Platform.OS === 'android' ? 12 : 16 },
  cardContent: { flex: 1 },
  harvestTitle: { fontSize: Platform.OS === 'android' ? 18 : 20, fontWeight: 'bold', color: '#1B262C' },
  dateText: { color: '#0F4C75', fontSize: Platform.OS === 'android' ? 11 : 12, marginTop: 4 },
  deleteButton: { padding: 8, marginLeft: 8, backgroundColor: 'rgba(231, 76, 60, 0.1)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(231, 76, 60, 0.3)' },
  parametersContainer: { gap: Platform.OS === 'android' ? 10 : 12 },
  parameterRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { flex: 1, flexDirection: 'row', alignItems: 'center', marginHorizontal: 4, minWidth: 0 },
  summaryLabel: { color: '#0F4C75', fontSize: Platform.OS === 'android' ? 11 : 12, marginLeft: 6, width: 80, flexShrink: 0 },
  summaryValue: { fontSize: Platform.OS === 'android' ? 11 : 12, fontWeight: '600', textAlign: 'right', flex: 1, color: '#1B262C' },
  floatingButton: { position: 'absolute', bottom: 30, right: 30, backgroundColor: '#0F4C75', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#0F4C75', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(15, 76, 117, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, width: '100%', maxHeight: '85%', borderWidth: 1, borderColor: '#BBE1FA', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Platform.OS === 'android' ? 20 : 24, paddingBottom: 0 },
  modalTitle: { fontSize: Platform.OS === 'android' ? 22 : 24, fontWeight: 'bold', color: '#1B262C' },
  closeButton: { padding: 4 },
  modalScrollView: { padding: Platform.OS === 'android' ? 20 : 24, paddingTop: 0 },
  pondSection: { marginBottom: Platform.OS === 'android' ? 20 : 24 },
  pondSectionTitle: { fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: 'bold', color: '#3282B8', marginBottom: Platform.OS === 'android' ? 14 : 16, textAlign: 'center' },
  harvestRow: { flexDirection: 'row', gap: 12, marginBottom: 0 },
  singleRow: { marginBottom: 0 },
  inputContainer: { marginBottom: Platform.OS === 'android' ? 14 : 16 },
  inputLabel: { color: '#1B262C', fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#BBE1FA', padding: Platform.OS === 'android' ? 14 : 16, borderRadius: 12, backgroundColor: '#F8FAFC', color: '#1B262C', fontSize: Platform.OS === 'android' ? 15 : 16, includeFontPadding: false, textAlignVertical: 'center' },
  inputGroup: { flex: 1 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: Platform.OS === 'android' ? 16 : 20, marginBottom: Platform.OS === 'android' ? 20 : 24 },
  addButton: { backgroundColor: '#3282B8', paddingVertical: Platform.OS === 'android' ? 14 : 16, paddingHorizontal: Platform.OS === 'android' ? 20 : 24, borderRadius: 12, alignItems: 'center', flex: 1, marginLeft: 6, shadowColor: '#0F4C75', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  addButtonText: { color: '#fff', fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: 'bold' },
  cancelButton: { backgroundColor: 'transparent', paddingVertical: Platform.OS === 'android' ? 14 : 16, paddingHorizontal: Platform.OS === 'android' ? 20 : 24, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e74c3c', flex: 1, marginRight: 6 },
  cancelButtonText: { color: '#e74c3c', fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: 'bold' },
  deleteModalContainer: { flex: 1, backgroundColor: 'rgba(15, 76, 117, 0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  deleteModalContent: { backgroundColor: '#0F4C75', borderRadius: 20, padding: Platform.OS === 'android' ? 20 : 24, width: '100%', maxWidth: 400, alignItems: 'center', borderWidth: 1, borderColor: '#3282B8' },
  deleteModalIcon: { marginBottom: Platform.OS === 'android' ? 14 : 16 },
  deleteModalTitle: { fontSize: Platform.OS === 'android' ? 18 : 20, fontWeight: 'bold', color: '#F8FAFC', marginBottom: Platform.OS === 'android' ? 10 : 12, textAlign: 'center' },
  deleteModalText: { fontSize: Platform.OS === 'android' ? 15 : 16, color: '#F8FAFC', textAlign: 'center', marginBottom: Platform.OS === 'android' ? 20 : 24, lineHeight: Platform.OS === 'android' ? 20 : 22 },
  deleteModalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  deleteModalCancelButton: { flex: 1, backgroundColor: '#3282B8', paddingVertical: 12, paddingHorizontal: Platform.OS === 'android' ? 18 : 20, borderRadius: 12, alignItems: 'center' },
  deleteModalCancelText: { color: '#F8FAFC', fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: '600' },
  deleteModalConfirmButton: { flex: 1, backgroundColor: '#e74c3c', paddingVertical: 12, paddingHorizontal: Platform.OS === 'android' ? 18 : 20, borderRadius: 12, alignItems: 'center' },
  deleteModalConfirmText: { color: '#fff', fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: 'bold' },
});
