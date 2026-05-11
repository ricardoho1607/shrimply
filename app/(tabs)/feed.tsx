import { Ionicons } from "@expo/vector-icons";
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from "react";
import { 
  Alert, FlatList, Modal, ScrollView, StatusBar, StyleSheet, Platform,
  Text, TextInput, TouchableOpacity, View 
} from "react-native";
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { usePondStore, isPondCycleActive } from "../store/pondStore";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '@/config/firebase';

const initialValues = {
  ancoPercentage: "", feed1: "", feed2: "", feed3: "", feed4: "", feed5: "",
  anco1: "", anco2: "", anco3: "", anco4: "", anco5: "",
  anco6: "", anco7: "", anco8: "", anco9: "", anco10: "",
};

const Input = React.memo(({ label, value, onChange, placeholder = "" }: any) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput style={styles.input} keyboardType="numeric" value={value} 
      onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#6b8aa0" />
  </View>
));

const AncoGrid = React.memo(({ value, onChange, getColor }: any) => (
  <View style={styles.ancoGridContainer}>
    {[["100", "75"], ["50", "0"]].map((row, idx) => (
      <View key={idx} style={styles.ancoGridRow}>
        {row.map((percent) => (
          <TouchableOpacity key={percent}
            style={[styles.ancoGridButton, value === percent && styles.ancoButtonSelected, 
              { backgroundColor: getColor(percent) }]}
            onPress={() => onChange(percent)}>
            <Text style={styles.ancoButtonText}>{percent}%</Text>
          </TouchableOpacity>
        ))}
      </View>
    ))}
  </View>
));

const Parameter = React.memo(({ icon, label, value, isAnco = false, a1, a2, getColor }: any) => (
  <View style={styles.parameterItem}>
    <Ionicons name={icon} size={16} color="#dce8f2" />
    <Text style={styles.parameterLabel}>{label}</Text>
    {isAnco && a1 && a2 ? (
      <View style={styles.ancoDisplayContainer}>
        <Text style={[styles.ancoDisplayValue, { color: getColor(a1) }]}>{a1 || "N/A"}%</Text>
        <Text style={styles.ancoDisplaySeparator}> | </Text>
        <Text style={[styles.ancoDisplayValue, { color: getColor(a2) }]}>{a2 || "N/A"}%</Text>
      </View>
    ) : (
      <Text style={styles.parameterValue}>{value || "N/A"}</Text>
    )}
  </View>
));

const FeedSection = React.memo(({ num, values, setValues, calculateAncoGrams, getAncoValueColor, t }: any) => {
  const feedKey = `feed${num}` as keyof typeof values;
  const anco1Key = `anco${num * 2 - 1}` as keyof typeof values;
  const anco2Key = `anco${num * 2}` as keyof typeof values;
  
  return (
    <View>
      <View style={styles.feedSectionHeader}>
        <Text style={styles.feedSectionTitle}>{t.feed.feed} {num}</Text>
      </View>
      <View style={styles.feedRowContainer}>
        <View style={styles.feedRow}>
          <View style={styles.feedInputGroup}>
            <Input label={`${t.feed.feed} ${num} (kg)`} value={values[feedKey]} 
              onChange={(text: string) => setValues({ ...values, [feedKey]: text })} 
              placeholder={t.feed.feedPlaceholder} />
          </View>
          <View style={styles.ancoGramsGroup}>
            <Text style={styles.ancoGramsLabel}>{t.feed.ancoGrams}</Text>
            <Text style={styles.ancoGramsValue}>
              {calculateAncoGrams(values[feedKey], values.ancoPercentage)}
            </Text>
          </View>
        </View>
        <View style={styles.ancoSelectorContainer}>
          <View style={styles.ancoSelectorRow}>
            {[
              { value: values[anco1Key], key: anco1Key, label: `${t.feed.anco} 1` }, 
              { value: values[anco2Key], key: anco2Key, label: `${t.feed.anco} 2` }
            ].map((item, idx) => (
              <View key={idx} style={styles.ancoSelectorGroup}>
                <Text style={styles.ancoSelectorLabel}>{item.label}</Text>
                <AncoGrid value={item.value} 
                  onChange={(v: string) => setValues({ ...values, [item.key]: v })} 
                  getColor={getAncoValueColor} />
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
});

export default function FeedManagementScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { ponds, addFeedData } = usePondStore();
  const activePonds = useMemo(() => ponds.filter(isPondCycleActive), [ponds]);
  const canEditPonds = user?.role === 'technician' || user?.role === 'owner';

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedPond, setSelectedPond] = useState<string | null>(null);
  const [inventoryFeeds, setInventoryFeeds] = useState<any[]>([]);
  const [inventoryFeedId, setInventoryFeedId] = useState<string>('');
  const [values, setValues] = useState(initialValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  React.useEffect(() => {
    if (isModalVisible) {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }, [isModalVisible]);

  React.useEffect(() => {
    if (user?.companyId) {
      const q = query(collection(db, 'companies', user.companyId, 'feeds'), orderBy('feedName', 'asc'));
      const unsub = onSnapshot(q, (snapshot) => {
        setInventoryFeeds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return unsub;
    }
  }, [user?.companyId]);

  const calculateAncoGrams = (feedKg: string, ancoPercent: string) => 
    (((parseFloat(feedKg) || 0) * 1000 * (parseFloat(ancoPercent) || 0)) / 100).toFixed(0);

  const calculateTotalDailyFeed = () => 
    [values.feed1, values.feed2, values.feed3, values.feed4, values.feed5]
      .reduce((sum, feed) => sum + (parseFloat(feed) || 0), 0).toFixed(2);

  const getAncoValueColor = (percentage: string) => {
    const num = parseFloat(percentage);
    if (isNaN(num)) return "#0d2137";
    return { 100: "#27ae60", 75: "#f39c12", 50: "#e74c3c", 0: "#e74c3c" }[num] || "#0d2137";
  };

  const getTodayFeedRecord = (pond: any) => {
    const today = new Date().toISOString().split('T')[0];
    return pond.samplings.find((s: any) => s.feedData && s.date === today);
  };

  const allFeedRecords = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return activePonds.map(pond => {
      const todayRecord = getTodayFeedRecord(pond);
      return todayRecord?.feedData 
        ? { ...todayRecord.feedData, pondName: pond.pondName, date: today }
        : { pondName: pond.pondName, date: today };
    });
  }, [activePonds]);

  const handleSave = () => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setIsSubmitting(true);

    if (!canEditPonds) {
      Alert.alert(t.feed.permissionDenied, t.feed.permissionMessage);
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

    const feedData: any = {
      ancoPercentage: values.ancoPercentage.trim(),
      feed1: values.feed1.trim(), feed2: values.feed2.trim(), feed3: values.feed3.trim(),
      feed4: values.feed4.trim(), feed5: values.feed5.trim(),
      totalDailyFeed: calculateTotalDailyFeed(),
      inventoryFeedId: inventoryFeedId || null,
    };

    for (let i = 1; i <= 10; i++) {
      const key = `anco${i}` as keyof typeof values;
      if (values[key]) feedData[key] = values[key];
    }

    addFeedData(pond.id, feedData);
    setValues(initialValues);
    setSelectedPond(null);
    setInventoryFeedId('');
    setIsModalVisible(false);
  };

  const handlePondSelection = (pondName: string) => {
    setSelectedPond(pondName);
    const pond = ponds.find(p => p.pondName === pondName);
    const todayRecord = pond ? getTodayFeedRecord(pond) : null;
    
    if (todayRecord?.feedData) {
      setValues({ ...initialValues, ...todayRecord.feedData });
      setInventoryFeedId(todayRecord.feedData.inventoryFeedId || '');
    } else {
      setValues(initialValues);
      setInventoryFeedId('');
    }
  };

  const closeModal = () => {
    setValues(initialValues);
    setSelectedPond(null);
    setInventoryFeedId('');
    submitLockRef.current = false;
    setIsSubmitting(false);
    setIsModalVisible(false);
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0d2137" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="fish-outline" size={28} color="#315f57" />
          <Text style={styles.headerTitle}>{t.feed.title}</Text>
        </View>

        <FlatList
          data={allFeedRecords}
          keyExtractor={(item, index) => `${item.pondName}-${item.date || index}`}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="nutrition-outline" size={80} color="#315f57" />
              <Text style={styles.emptyTitle}>{t.feed.noData}</Text>
              <Text style={styles.emptySubtitle}>
                {canEditPonds ? t.feed.addFirst : t.feed.noDataAvailable}
              </Text>
            </View>
          }
          renderItem={({ item: rec }) => (
              <TouchableOpacity style={styles.recordCard}
                onPress={() => {
                  const pond = ponds.find(p => p.pondName === rec.pondName);
                  if (pond) router.push({ pathname: '/feed-history', 
                    params: { pondId: pond.id, pondName: rec.pondName }});
                }}>
                <View style={styles.cardHeader}>
                  <Text style={styles.pondName}>{rec.pondName}</Text>
                  <Text style={styles.dateText}>
                    {rec.date ? new Date(rec.date).toLocaleDateString() : "N/A"}
                  </Text>
                </View>
                <View style={styles.parametersContainer}>
                  <View style={styles.parameterRow}>
                    <Parameter icon="scale-outline" label={t.feed.dailyFeed} 
                      value={`${rec.totalDailyFeed || "N/A"} kg`} />
                    <Parameter icon="stats-chart-outline" label={t.feed.anco} 
                      value={`${rec.ancoPercentage || "N/A"}%`} />
                  </View>
                  <View style={styles.parameterRow}>
                    <Parameter icon="ellipse-outline" label="F1" isAnco 
                      a1={rec.anco1} a2={rec.anco2} getColor={getAncoValueColor} />
                    <Parameter icon="ellipse-outline" label="F2" isAnco 
                      a1={rec.anco3} a2={rec.anco4} getColor={getAncoValueColor} />
                  </View>
                  <View style={styles.parameterRow}>
                    <Parameter icon="ellipse-outline" label="F3" isAnco 
                      a1={rec.anco5} a2={rec.anco6} getColor={getAncoValueColor} />
                    <Parameter icon="ellipse-outline" label="F4" isAnco 
                      a1={rec.anco7} a2={rec.anco8} getColor={getAncoValueColor} />
                  </View>
                  <View style={styles.parameterRow}>
                    <Parameter icon="ellipse-outline" label="F5" isAnco 
                      a1={rec.anco9} a2={rec.anco10} getColor={getAncoValueColor} />
                    <View style={{ flex: 1 }} />
                  </View>
                </View>
              </TouchableOpacity>
          )}
        />

        {canEditPonds && (
          <TouchableOpacity style={styles.floatingButton} onPress={() => setIsModalVisible(true)}>
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        )}

        <Modal visible={isModalVisible} animationType="slide" transparent>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t.feed.addFeedData}</Text>
                <TouchableOpacity
                  onPress={closeModal}
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color="#dce8f2" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScrollView} keyboardShouldPersistTaps="handled">
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{t.forms.selectPond}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pondSelector}>
                    {activePonds.map((p: any) => (
                      <TouchableOpacity key={p.id}
                        style={[styles.pondOption, selectedPond === p.pondName && styles.pondOptionSelected]}
                        onPress={() => handlePondSelection(p.pondName)}>
                        <Text style={[styles.pondOptionText, 
                          selectedPond === p.pondName && styles.pondOptionTextSelected]}>
                          {p.pondName}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Select Feed Brand</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pondSelector}>
                    {inventoryFeeds.map(feed => (
                      <TouchableOpacity key={feed.id}
                        style={[styles.pondOption, inventoryFeedId === feed.id && styles.pondOptionSelected]}
                        onPress={() => setInventoryFeedId(feed.id)}>
                        <Text style={[styles.pondOptionText, 
                          inventoryFeedId === feed.id && styles.pondOptionTextSelected]}>
                          {feed.feedName} ({feed.totalStock}{feed.unit})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <Input label={t.feed.ancoPercentage} value={values.ancoPercentage} 
                  onChange={(text: string) => setValues({ ...values, ancoPercentage: text })} 
                  placeholder={t.feed.ancoPlaceholder} />

                {[1, 2, 3, 4, 5].map(num => (
                  <FeedSection 
                    key={num} 
                    num={num} 
                    values={values} 
                    setValues={setValues}
                    calculateAncoGrams={calculateAncoGrams}
                    getAncoValueColor={getAncoValueColor}
                    t={t}
                  />
                ))}

                <View style={styles.totalFeedContainer}>
                  <Text style={styles.totalFeedLabel}>{t.feed.totalDailyFeed}</Text>
                  <Text style={styles.totalFeedValue}>{calculateTotalDailyFeed()}</Text>
                </View>

                <View style={styles.buttonContainer}>
                  <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                    <Text style={styles.cancelButtonText}>{t.actions.cancel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.addButton, isSubmitting && { opacity: 0.6 }]} onPress={handleSave} disabled={isSubmitting}>
                    <Text style={styles.addButtonText}>{t.feed.saveFeedData}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f8fc" },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Platform.OS === 'android' ? 16 : 20, paddingTop: Platform.OS === 'android' ? 16 : 20, paddingBottom: Platform.OS === 'android' ? 16 : 20 },
  headerTitle: { fontSize: Platform.OS === 'android' ? 22 : 24, fontWeight: 'bold', color: '#0d2137', marginLeft: Platform.OS === 'android' ? 10 : 12 },
  scrollContent: { padding: Platform.OS === 'android' ? 16 : 20, paddingTop: 0, paddingBottom: 100 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: Platform.OS === 'android' ? 60 : 80 },
  emptyTitle: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 22 : 24, fontWeight: 'bold', marginTop: Platform.OS === 'android' ? 16 : 20 },
  emptySubtitle: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 15 : 16, marginTop: 8, textAlign: 'center', lineHeight: Platform.OS === 'android' ? 20 : 22 },
  recordCard: { backgroundColor: '#FFFFFF', padding: Platform.OS === 'android' ? 16 : 20, borderRadius: 16, marginBottom: Platform.OS === 'android' ? 12 : 16, borderWidth: 1, borderColor: '#e8f2f9', shadowColor: '#315f57', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Platform.OS === 'android' ? 12 : 16 },
  pondName: { fontSize: Platform.OS === 'android' ? 18 : 20, fontWeight: 'bold', color: '#0d2137' },
  dateText: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 11 : 12 },
  parametersContainer: { gap: Platform.OS === 'android' ? 10 : 12 },
  parameterRow: { flexDirection: 'row', justifyContent: 'space-between' },
  parameterItem: { flex: 1, flexDirection: 'row', alignItems: 'center', marginHorizontal: 4, minWidth: 0 },
  parameterLabel: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 11 : 12, marginLeft: 6, width: 50, flexShrink: 0 },
  parameterValue: { fontSize: Platform.OS === 'android' ? 11 : 12, fontWeight: '600', textAlign: 'left', flex: 1, minWidth: 80, marginLeft: 8, color: '#0d2137' },
  ancoDisplayContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 1 },
  ancoDisplayValue: { fontSize: Platform.OS === 'android' ? 11 : 12, fontWeight: '600', textAlign: 'left' },
  ancoDisplaySeparator: { fontSize: Platform.OS === 'android' ? 11 : 12, fontWeight: '600', color: '#0d2137' },
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
  feedRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  feedInputGroup: { flex: 2 },
  ancoGramsGroup: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  ancoGramsLabel: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '600', marginBottom: 8, marginTop: 0 },
  ancoGramsValue: { color: '#315f57', fontSize: Platform.OS === 'android' ? 17 : 18, fontWeight: 'bold', backgroundColor: '#f4f8fc', paddingVertical: Platform.OS === 'android' ? 14 : 14, paddingHorizontal: 12, borderRadius: 12, textAlign: 'center', minWidth: 60, borderWidth: 1, borderColor: '#e8f2f9' },
  feedSectionHeader: { marginTop: Platform.OS === 'android' ? 14 : 16, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#dce8f2', paddingBottom: 8 },
  feedSectionTitle: { color: '#315f57', fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: 'bold' },
  ancoSelectorContainer: { marginBottom: Platform.OS === 'android' ? 18 : 20 },
  ancoSelectorRow: { flexDirection: 'row', gap: Platform.OS === 'android' ? 14 : 16 },
  ancoSelectorGroup: { flex: 1 },
  ancoSelectorLabel: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  ancoGridContainer: { gap: 8 },
  ancoGridRow: { flexDirection: 'row', gap: 8 },
  ancoGridButton: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, alignItems: 'center', minHeight: 40, justifyContent: 'center' },
  feedRowContainer: { marginBottom: Platform.OS === 'android' ? 18 : 20 },
  ancoButtonSelected: { borderWidth: 2, borderColor: '#0d2137' },
  ancoButtonText: { color: '#fff', fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: 'bold' },
  totalFeedContainer: { backgroundColor: '#f4f8fc', padding: Platform.OS === 'android' ? 18 : 20, borderRadius: 12, marginTop: Platform.OS === 'android' ? 18 : 20, borderWidth: 1, borderColor: '#e8f2f9', alignItems: 'center' },
  totalFeedLabel: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: '600', marginBottom: 8 },
  totalFeedValue: { color: '#315f57', fontSize: Platform.OS === 'android' ? 22 : 24, fontWeight: 'bold' },
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
