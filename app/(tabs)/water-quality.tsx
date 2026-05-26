import React, { useState, useMemo, useCallback, useRef } from "react";
import { FlatList, StyleSheet, Text, View, TouchableOpacity, Modal, TextInput, ScrollView, StatusBar, Alert, Platform, KeyboardAvoidingView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePondStore, isPondCycleActive } from "../store/pondStore";
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const Input = React.memo(({ label, value, onChange, placeholder = "" }: any) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput style={styles.input} keyboardType="numeric" value={value} 
      onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#6b8aa0" />
  </View>
));

const Parameter = React.memo(({ icon, label, value, color }: any) => (
  <View style={styles.parameterItem}>
    <Ionicons name={icon} size={16} color="#315f57" />
    <Text style={styles.parameterLabel}>{label}</Text>
    <Text style={[styles.parameterValue, { color }]}>{value || "N/A"}</Text>
  </View>
));

export default function WaterQualityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { ponds, addWaterQuality } = usePondStore();
  const activePonds = useMemo(() => ponds.filter(isPondCycleActive), [ponds]);
  const canEditPonds = user?.role === 'technician' || user?.role === 'owner' || user?.role === 'co-owner';
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedPond, setSelectedPond] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const [values, setValues] = useState({
    phMorning: "", phEvening: "", doMorning: "", doEvening: "", transparency: "", salinity: ""
  });

  React.useEffect(() => {
    if (isModalVisible) {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }, [isModalVisible]);

  const getColor = useCallback((type: string, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "#315f57";
    if (type === "do") return num < 3.5 ? "#e74c3c" : num <= 4.5 ? "#f39c12" : "#0d2137";
    if (type === "ph") return num < 7.5 || num > 8.5 ? "#e74c3c" : "#0d2137";
    if (type === "transparency") return num < 30 || num > 40 ? "#e74c3c" : "#0d2137";
    return "#0d2137";
  }, []);

  const allWaterRecords = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return activePonds.map((p) => {
      const todayWQRecord = p.samplings.find(s => s.mbw === 0 && s.feed === 0 && s.mortality === 0 && s.date === today);
      return todayWQRecord ? { ...todayWQRecord, pondName: p.pondName } : {
        id: `temp-${p.id}`, date: today, mbw: 0, mortality: 0, feed: 0,
        phMorning: undefined, phEvening: undefined, doMorning: undefined, 
        doEvening: undefined, transparency: undefined, salinity: undefined, pondName: p.pondName
      };
    });
  }, [activePonds]);

  const handleSave = useCallback(() => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setIsSubmitting(true);

    if (!canEditPonds) {
      Alert.alert(t.waterQuality.permissionDenied, t.waterQuality.permissionMessage);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }
    if (!selectedPond) {
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }
    const pond = activePonds.find((p) => p.pondName === selectedPond);
    if (!pond) {
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    addWaterQuality(pond.id, {
      phMorning: values.phMorning.trim(), phEvening: values.phEvening.trim(),
      doMorning: values.doMorning.trim(), doEvening: values.doEvening.trim(),
      transparency: values.transparency.trim(), salinity: values.salinity.trim(),
    });
    setValues({ phMorning: "", phEvening: "", doMorning: "", doEvening: "", transparency: "", salinity: "" });
    setSelectedPond(null);
    setIsModalVisible(false);
  }, [canEditPonds, selectedPond, activePonds, values, addWaterQuality, t]);

  const handlePondSelection = useCallback((pondName: string) => {
    setSelectedPond(pondName);
    const today = new Date().toISOString().split('T')[0];
    const pond = ponds.find(p => p.pondName === pondName);
    const todayWQRecord = pond?.samplings.find(s => 
      s.mbw === 0 && s.feed === 0 && s.mortality === 0 && s.date === today
    );
    setValues(todayWQRecord ? {
      phMorning: todayWQRecord.phMorning || "", phEvening: todayWQRecord.phEvening || "",
      doMorning: todayWQRecord.doMorning || "", doEvening: todayWQRecord.doEvening || "",
      transparency: todayWQRecord.transparency || "", salinity: todayWQRecord.salinity || "",
    } : { phMorning: "", phEvening: "", doMorning: "", doEvening: "", transparency: "", salinity: "" });
  }, [ponds]);

  const closeModal = useCallback(() => {
    setValues({ phMorning: "", phEvening: "", doMorning: "", doEvening: "", transparency: "", salinity: "" });
    setSelectedPond(null);
    submitLockRef.current = false;
    setIsSubmitting(false);
    setIsModalVisible(false);
  }, []);

  const updateValue = useCallback((key: string) => (text: string) => {
    setValues(prev => ({ ...prev, [key]: text }));
  }, []);

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f8fc" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="water-outline" size={28} color="#315f57" />
          <Text style={styles.headerTitle}>{t.waterQuality.title}</Text>
        </View>

        <FlatList 
          data={allWaterRecords}
          keyExtractor={(item, index) => `${item.pondName}-${item.date || index}`}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 20) + 80 : 100 }
          ]} 
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="flask-outline" size={80} color="#315f57" />
              <Text style={styles.emptyTitle}>{t.waterQuality.noData}</Text>
              <Text style={styles.emptySubtitle}>
                {canEditPonds ? t.waterQuality.addFirst : t.waterQuality.noDataAvailable}
              </Text>
            </View>
          }
          renderItem={({ item: rec }) => (
              <TouchableOpacity style={styles.recordCard}
                onPress={() => {
                  const pond = ponds.find(p => p.pondName === rec.pondName);
                  if (pond) router.push({ pathname: '/water-quality-history', params: { pondId: pond.id, pondName: rec.pondName }});
                }}>
                <View style={styles.cardHeader}>
                  <Text style={styles.pondName}>{rec.pondName}</Text>
                  <Text style={styles.dateText}>{rec.date ? new Date(rec.date).toLocaleDateString() : "N/A"}</Text>
                </View>
                <View style={styles.parametersContainer}>
                  <View style={styles.parameterRow}>
                    <Parameter icon="sunny-outline" label={t.waterQuality.phMorning} value={rec.phMorning ?? ""} color={getColor("ph", rec.phMorning ?? "")} />
                    <Parameter icon="moon-outline" label={t.waterQuality.phEvening} value={rec.phEvening ?? ""} color={getColor("ph", rec.phEvening ?? "")} />
                  </View>
                  <View style={styles.parameterRow}>
                    <Parameter icon="sunny-outline" label={t.waterQuality.doMorning} value={rec.doMorning ?? ""} color={getColor("do", rec.doMorning ?? "")} />
                    <Parameter icon="moon-outline" label={t.waterQuality.doEvening} value={rec.doEvening ?? ""} color={getColor("do", rec.doEvening ?? "")} />
                  </View>
                  <View style={styles.parameterRow}>
                    <Parameter icon="eye-outline" label={t.waterQuality.transparency} value={`${rec.transparency || "N/A"} cm`} color={getColor("transparency", rec.transparency ?? "")} />
                    <Parameter icon="water-outline" label={t.waterQuality.salinity} value={`${rec.salinity || "N/A"} ppt`} color="#0d2137" />
                  </View>
                </View>
              </TouchableOpacity>
          )}
        />

        {canEditPonds && (
          // UPDATED BUTTON TO MATCH YOUR OTHER PAGE
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
                <Text style={styles.modalTitle}>{t.waterQuality.addWaterQuality}</Text>
                <TouchableOpacity
                  onPress={closeModal}
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color="#315f57" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                showsVerticalScrollIndicator={false} 
                style={styles.modalScrollView}
                contentContainerStyle={{ paddingBottom: 40 }}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
              >
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{t.waterQuality.selectPond}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pondSelector}>
                    {activePonds.map((p) => (
                      <TouchableOpacity key={p.id}
                        style={[styles.pondOption, selectedPond === p.pondName && styles.pondOptionSelected]}
                        onPress={() => handlePondSelection(p.pondName)}>
                        <Text style={[styles.pondOptionText, selectedPond === p.pondName && styles.pondOptionTextSelected]}>
                          {p.pondName}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.row}>
                  <View style={styles.inputGroup}>
                    <Input label={`${t.waterQuality.salinity} (ppt)`} value={values.salinity} onChange={updateValue('salinity')} placeholder={t.waterQuality.salinityPlaceholder} />
                  </View>
                  <View style={styles.inputGroup}>
                    <Input label={`${t.waterQuality.transparency} (cm)`} value={values.transparency} onChange={updateValue('transparency')} placeholder={t.waterQuality.transparencyPlaceholder} />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={styles.inputGroup}>
                    <Input label={`${t.waterQuality.phMorning} ☀️`} value={values.phMorning} onChange={updateValue('phMorning')} placeholder={t.waterQuality.phPlaceholder} />
                  </View>
                  <View style={styles.inputGroup}>
                    <Input label={`${t.waterQuality.phEvening} 🌙`} value={values.phEvening} onChange={updateValue('phEvening')} placeholder={t.waterQuality.phPlaceholder} />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={styles.inputGroup}>
                    <Input label={`${t.waterQuality.doMorning} ☀️`} value={values.doMorning} onChange={updateValue('doMorning')} placeholder={t.waterQuality.doPlaceholder} />
                  </View>
                  <View style={styles.inputGroup}>
                    <Input label={`${t.waterQuality.doEvening} 🌙`} value={values.doEvening} onChange={updateValue('doEvening')} placeholder={t.waterQuality.doPlaceholder} />
                  </View>
                </View>

                <View style={styles.buttonContainer}>
                  <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                    <Text style={styles.cancelButtonText}>{t.actions.cancel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.addButton, isSubmitting && { opacity: 0.6 }]} onPress={handleSave} disabled={isSubmitting}>
                    <Text style={styles.addButtonText}>{t.waterQuality.saveRecord}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f8fc" },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Platform.OS === 'android' ? 16 : 20, paddingTop: Platform.OS === 'android' ? 16 : 20, paddingBottom: Platform.OS === 'android' ? 16 : 20 },
  headerTitle: { fontSize: Platform.OS === 'android' ? 22 : 24, fontWeight: 'bold', color: '#0d2137', marginLeft: Platform.OS === 'android' ? 10 : 12 },
  scrollContent: { padding: Platform.OS === 'android' ? 16 : 20, paddingTop: 0 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: Platform.OS === 'android' ? 60 : 80 },
  emptyTitle: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 22 : 24, fontWeight: 'bold', marginTop: Platform.OS === 'android' ? 16 : 20 },
  emptySubtitle: { color: '#315f57', fontSize: Platform.OS === 'android' ? 15 : 16, marginTop: 8, textAlign: 'center', lineHeight: Platform.OS === 'android' ? 20 : 22 },
  recordCard: { backgroundColor: '#FFFFFF', padding: Platform.OS === 'android' ? 16 : 20, borderRadius: 16, marginBottom: Platform.OS === 'android' ? 12 : 16, borderWidth: 1, borderColor: '#e8f2f9', shadowColor: '#315f57', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Platform.OS === 'android' ? 12 : 16 },
  pondName: { fontSize: Platform.OS === 'android' ? 18 : 20, fontWeight: 'bold', color: '#0d2137' },
  dateText: { color: '#315f57', fontSize: Platform.OS === 'android' ? 11 : 12 },
  parametersContainer: { gap: Platform.OS === 'android' ? 10 : 12 },
  parameterRow: { flexDirection: 'row', justifyContent: 'space-between' },
  parameterItem: { flex: 1, flexDirection: 'row', alignItems: 'center', marginHorizontal: 4, minWidth: 0 },
  parameterLabel: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 11 : 12, marginLeft: 6, width: Platform.OS === 'android' ? 75 : 80, flexShrink: 0 },
  parameterValue: { fontSize: Platform.OS === 'android' ? 11 : 12, fontWeight: '600', textAlign: 'right', flex: 1 },
  // UPDATED STYLE: Added fixed bottom/right position
  floatingButton: { position: 'absolute', bottom: 30, right: 30, backgroundColor: '#0d2137', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#315f57', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(15, 76, 117, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, width: '100%', maxHeight: '85%', borderWidth: 1, borderColor: '#e8f2f9', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Platform.OS === 'android' ? 20 : 24, paddingBottom: 0 },
  modalTitle: { fontSize: Platform.OS === 'android' ? 22 : 24, fontWeight: 'bold', color: '#0d2137' },
  closeButton: { padding: 4 },
  modalScrollView: { padding: Platform.OS === 'android' ? 20 : 24, paddingTop: 0 },
  inputContainer: { marginBottom: Platform.OS === 'android' ? 16 : 20 },
  inputLabel: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e8f2f9', padding: Platform.OS === 'android' ? 14 : 16, borderRadius: 12, backgroundColor: '#f4f8fc', color: '#0d2137', fontSize: Platform.OS === 'android' ? 15 : 16, includeFontPadding: false, textAlignVertical: 'center' },
  row: { flexDirection: 'row', gap: 12, marginBottom: 0 },
  inputGroup: { flex: 1 },
  pondSelector: { maxHeight: 50 },
  pondOption: { paddingHorizontal: Platform.OS === 'android' ? 14 : 16, paddingVertical: Platform.OS === 'android' ? 7 : 8, marginRight: 8, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#e8f2f9' },
  pondOptionSelected: { backgroundColor: '#0d2137', borderColor: '#0d2137' },
  pondOptionText: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '600' },
  pondOptionTextSelected: { color: '#FFFFFF' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: Platform.OS === 'android' ? 16 : 20, marginBottom: Platform.OS === 'android' ? 20 : 24 },
  addButton: { backgroundColor: '#315f57', paddingVertical: Platform.OS === 'android' ? 14 : 16, paddingHorizontal: Platform.OS === 'android' ? 20 : 24, borderRadius: 12, alignItems: 'center', flex: 1, marginLeft: 6, shadowColor: '#315f57', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  addButtonText: { color: '#FFFFFF', fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: 'bold' },
  cancelButton: { backgroundColor: 'transparent', paddingVertical: Platform.OS === 'android' ? 14 : 16, paddingHorizontal: Platform.OS === 'android' ? 20 : 24, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e74c3c', flex: 1, marginRight: 6 },
  cancelButtonText: { color: '#e74c3c', fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: 'bold' },
});
