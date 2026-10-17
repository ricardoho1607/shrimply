import { useSaveOperation } from '../../shared/useSaveOperation';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useLanguage } from '../../context/LanguageContext';
import { calculateTreatmentDoseLiters } from '../../shared/treatmentMix';
import {
  type Additive,
  type TreatmentMixComponent,
  useFeedAdditiveStore,
} from '../store/feedAdditiveStore';
import { isPondCycleActive, usePondStore } from '../store/pondStore';

type ModalMode = 'create' | 'use' | null;

const parsePositiveNumber = (value: string) => {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;
const interpolate = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce((result, [key, value]) => result.replace(`{{${key}}}`, String(value)), template);

export default function TreatmentMixesScreen({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { company } = useAuth();
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();
  const mixT = t.inventory.treatmentMix;
  const store = useFeedAdditiveStore();
  const { ponds } = usePondStore();
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedMix, setSelectedMix] = useState<Additive | null>(null);
  const [name, setName] = useState('');
  const [yieldLiters, setYieldLiters] = useState('');
  const [notes, setNotes] = useState('');
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [pondId, setPondId] = useState('');
  const [ppm, setPpm] = useState('');
  const { save } = useSaveOperation();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!company?.id || embedded) return;
    store.setCurrentCompanyId(company.id, company.timeZone);
    return store.initializeForCompany(company.id, company.timeZone);
  }, [company?.id, company?.timeZone, embedded]);

  const additives = useMemo(
    () => store.additives.filter((item) => item.inventoryKind !== 'treatmentMix'),
    [store.additives],
  );
  const mixes = useMemo(
    () => store.additives.filter((item) => item.inventoryKind === 'treatmentMix'),
    [store.additives],
  );
  const activePonds = useMemo(() => ponds.filter(isPondCycleActive), [ponds]);
  const selectedPond = activePonds.find((pond) => pond.id === pondId);
  const dose = useMemo(() => {
    const parsedPpm = parsePositiveNumber(ppm);
    if (!selectedPond || parsedPpm <= 0 || selectedPond.pondArea <= 0) return null;
    return calculateTreatmentDoseLiters(selectedPond.pondArea, parsedPpm);
  }, [ppm, selectedPond]);

  const resetModal = () => {
    if (save.busy) return;
    save.reset();
    setModalMode(null);
    setSelectedMix(null);
    setName('');
    setYieldLiters('');
    setNotes('');
    setQuantities({});
    setPondId('');
    setPpm('');
    setSaving(false);
  };

  const createMix = async () => {
    const finalYield = parsePositiveNumber(yieldLiters);
    const components: TreatmentMixComponent[] = additives.flatMap((additive) => {
      const quantity = parsePositiveNumber(quantities[additive.id] || '');
      return quantity > 0 ? [{
        additiveId: additive.id,
        additiveName: additive.additiveName,
        quantity,
        unit: additive.unit || 'kg',
      }] : [];
    });
    if (!name.trim()) return Alert.alert(mixT.missingName, mixT.missingNameMessage);
    if (finalYield <= 0) return Alert.alert(mixT.missingVolume, mixT.missingVolumeMessage);
    if (components.length === 0) return Alert.alert(mixT.missingIngredients, mixT.missingIngredientsMessage);

    if (!save.acquire()) return;
    setSaving(true);
    try {
      await store.createTreatmentMix({ name, yieldLiters: finalYield, components, notes, operationId: save.id(`mix:${company?.id}`) });
      save.complete();
      save.release();
      resetModal();
      Alert.alert(mixT.created, mixT.createdMessage);
    } catch (error) {
      Alert.alert(mixT.createFailed, errorMessage(error, mixT.unknownError));
      setSaving(false);
    }
    finally { save.release(); setSaving(false); }
  };

  const makeBatch = (mix: Additive) => {
    const recipe = mix.treatmentMixRecipe;
    if (!recipe) return;
    const requirements = recipe.components.map((item) => `${item.quantity} ${item.unit} ${item.additiveName}`).join('\n');
    Alert.alert(
      `${mixT.makeBatch}: ${recipe.yieldLiters} L ${mix.additiveName}?`,
      requirements,
      [
        { text: mixT.cancel, style: 'cancel' },
        {
          text: mixT.makeBatch,
          onPress: async () => {
            if (!save.acquire()) return;
            setSaving(true);
            try {
              await store.makeTreatmentMixBatch(mix.id, save.id(`batch:${mix.id}`));
              save.complete();
              Alert.alert(mixT.batchCreated, interpolate(mixT.batchAdded, { amount: recipe.yieldLiters }));
            } catch (error) {
              Alert.alert(mixT.batchFailed, errorMessage(error, mixT.unknownError));
            }
            finally { save.release(); setSaving(false); }
          },
        },
      ],
    );
  };

  const useMix = async () => {
    if (!selectedMix || !selectedPond) return Alert.alert(mixT.selectPond, mixT.selectPondMessage);
    const parsedPpm = parsePositiveNumber(ppm);
    if (parsedPpm <= 0) return Alert.alert(mixT.enterPpm, mixT.enterPpmMessage);
    if (!save.acquire()) return;
    setSaving(true);
    try {
      const result = await store.useTreatmentMix(
        selectedMix.id,
        { id: selectedPond.id, name: selectedPond.pondName, areaM2: selectedPond.pondArea },
        parsedPpm,
        notes,
        save.id(`treatment:${selectedMix.id}`),
      );
      save.complete();
      save.release();
      resetModal();
      Alert.alert(mixT.treatmentRecorded, interpolate(mixT.treatmentDeducted, { amount: result.quantityLiters }));
    } catch (error) {
      Alert.alert(mixT.useFailed, errorMessage(error, mixT.unknownError));
      setSaving(false);
    }
    finally { save.release(); setSaving(false); }
  };

  const openUse = (mix: Additive) => {
    if (!save.reset()) return;
    setSelectedMix(mix);
    setNotes('');
    setPondId('');
    setPpm('');
    setModalMode('use');
  };

  return (
    <View style={embedded ? styles.embeddedRoot : styles.safeArea}>
      <SafeAreaView style={styles.headerSafeArea} edges={embedded ? [] : ['top', 'left', 'right']}>
      <View style={[styles.header, embedded && styles.embeddedHeader]}>
        {!embedded && (
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#0d2137" />
          </TouchableOpacity>
        )}
        <View style={styles.headerTitleWrap}>
          <Text style={styles.title}>{mixT.title}</Text>
          <Text style={styles.subtitle}>{mixT.subtitle}</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalMode('create')}>
          <Ionicons name="add" size={25} color="#fff" />
        </TouchableOpacity>
      </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content}>
        {mixes.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="beaker-outline" size={60} color="#B8C9C5" />
            <Text style={styles.emptyTitle}>{mixT.noMixes}</Text>
            <Text style={styles.emptyText}>{mixT.emptyDescription}</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setModalMode('create')}>
              <Text style={styles.primaryButtonText}>{mixT.create}</Text>
            </TouchableOpacity>
          </View>
        ) : mixes.map((mix) => (
          <View key={mix.id} style={styles.mixCard}>
            <View style={styles.mixTopRow}>
              <View style={styles.mixIcon}><Ionicons name="beaker" size={25} color="#315f57" /></View>
              <View style={styles.flex}>
                <Text style={styles.mixName}>{mix.additiveName}</Text>
                <Text style={styles.stockText}>{mix.totalStock || 0} L {mixT.available}</Text>
              </View>
              <View style={styles.valuePill}><Text style={styles.valueText}>{formatCurrency(mix.totalCost || 0)}</Text></View>
            </View>
            <View style={styles.recipeBox}>
              <Text style={styles.recipeTitle}>{mixT.recipeFor} {mix.treatmentMixRecipe?.yieldLiters || 0} L</Text>
              {(mix.treatmentMixRecipe?.components || []).map((component) => (
                <Text key={component.additiveId} style={styles.recipeLine}>
                  {component.quantity} {component.unit} · {component.additiveName}
                </Text>
              ))}
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => makeBatch(mix)}>
                <Ionicons name="refresh" size={18} color="#315f57" />
                <Text style={styles.secondaryButtonText}>{mixT.makeBatch}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.useButton} onPress={() => openUse(mix)} disabled={(mix.totalStock || 0) <= 0}>
                <Ionicons name="water" size={18} color="#fff" />
                <Text style={styles.useButtonText}>{mixT.use}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={modalMode !== null} animationType="slide" onRequestClose={resetModal}>
        <SafeAreaView
          style={[styles.modalSafeArea, { paddingTop: Math.max(insets.top, 16) }]}
          edges={['left', 'right', 'bottom']}
          pointerEvents={saving ? 'none' : 'auto'}
        >
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{modalMode === 'create' ? mixT.create : `${mixT.use}: ${selectedMix?.additiveName || ''}`}</Text>
              <Text style={styles.modalSubtitle}>{modalMode === 'create' ? mixT.createSubtitle : mixT.useSubtitle}</Text>
            </View>
            <TouchableOpacity onPress={resetModal}><Ionicons name="close-circle" size={30} color="#9AACB9" /></TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            {modalMode === 'create' ? (
              <>
                <Text style={styles.label}>{mixT.mixName}</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={mixT.mixNamePlaceholder} placeholderTextColor="#5F746F" />
                <Text style={styles.label}>{mixT.finalVolume}</Text>
                <TextInput style={styles.input} value={yieldLiters} onChangeText={setYieldLiters} keyboardType="decimal-pad" placeholder={mixT.finalVolumePlaceholder} placeholderTextColor="#5F746F" />
                <Text style={styles.sectionTitle}>{mixT.ingredients}</Text>
                <Text style={styles.helper}>{mixT.ingredientsHelper}</Text>
                {additives.length === 0 ? (
                  <Text style={styles.warning}>{mixT.additiveRequired}</Text>
                ) : additives.map((additive) => (
                  <View key={additive.id} style={styles.ingredientRow}>
                    <View style={styles.flex}>
                      <Text style={styles.ingredientName}>{additive.additiveName}</Text>
                      <Text style={styles.available}>{additive.totalStock || 0} {additive.unit || 'kg'} {mixT.available}</Text>
                    </View>
                    <TextInput
                      style={styles.quantityInput}
                      value={quantities[additive.id] || ''}
                      onChangeText={(value) => setQuantities((current) => ({ ...current, [additive.id]: value }))}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor="#5F746F"
                    />
                    <Text style={styles.unit}>{additive.unit || 'kg'}</Text>
                  </View>
                ))}
              </>
            ) : (
              <>
                <Text style={styles.label}>{mixT.pond}</Text>
                <View style={styles.chipWrap}>
                  {activePonds.map((pond) => (
                    <TouchableOpacity
                      key={pond.id}
                      style={[styles.chip, pondId === pond.id && styles.chipSelected]}
                      onPress={() => setPondId(pond.id)}
                    >
                      <Text style={[styles.chipText, pondId === pond.id && styles.chipTextSelected]}>{pond.pondName} · {pond.pondArea} m²</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {activePonds.length === 0 && <Text style={styles.warning}>{mixT.noActivePonds}</Text>}
                <Text style={styles.label}>{mixT.concentration}</Text>
                <TextInput style={styles.input} value={ppm} onChangeText={setPpm} keyboardType="decimal-pad" placeholder={mixT.ppmPlaceholder} placeholderTextColor="#5F746F" />
                {dose && (
                  <View style={styles.calculationCard}>
                    <Text style={styles.calculationTitle}>{mixT.doseCalculation}</Text>
                    <Text style={styles.calculationLine}>{mixT.pondVolume}: {dose.pondVolumeLiters.toLocaleString()} L</Text>
                    <Text style={styles.calculationResult}>{ppm} PPM × {selectedPond?.pondArea} m² ÷ 1,000 = {dose.requiredMixLiters} L</Text>
                    {selectedMix && dose.requiredMixLiters > (selectedMix.totalStock || 0) && (
                      <Text style={styles.shortage}>{interpolate(mixT.onlyAvailable, { amount: selectedMix.totalStock || 0 })}</Text>
                    )}
                  </View>
                )}
              </>
            )}

            <Text style={styles.label}>{mixT.notesOptional}</Text>
            <TextInput style={[styles.input, styles.notes]} value={notes} onChangeText={setNotes} multiline placeholder={mixT.notesPlaceholder} placeholderTextColor="#5F746F" />
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.disabledButton]}
              onPress={modalMode === 'create' ? createMix : useMix}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>{modalMode === 'create' ? mixT.saveFirstBatch : mixT.recordTreatment}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F8F7' },
  embeddedRoot: { flex: 1, backgroundColor: '#F5F8F7' },
  headerSafeArea: { backgroundColor: '#fff' },
  embeddedHeader: { paddingTop: 12 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E4ECEA' },
  headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#F2F6F5' },
  headerTitleWrap: { flex: 1, paddingHorizontal: 12 },
  title: { fontSize: 20, fontWeight: '800', color: '#0d2137' },
  subtitle: { marginTop: 2, fontSize: 12, color: '#6B7F91' },
  addButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#315f57' },
  content: { padding: 18, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingVertical: 72, paddingHorizontal: 28 },
  emptyTitle: { marginTop: 14, fontSize: 19, fontWeight: '800', color: '#0d2137' },
  emptyText: { marginTop: 7, textAlign: 'center', color: '#6B7F91', lineHeight: 20 },
  primaryButton: { marginTop: 20, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 13, backgroundColor: '#315f57' },
  primaryButtonText: { color: '#fff', fontWeight: '800' },
  mixCard: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#E4ECEA' },
  mixTopRow: { flexDirection: 'row', alignItems: 'center' },
  mixIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F2F0', marginRight: 12 },
  flex: { flex: 1 },
  mixName: { fontSize: 18, fontWeight: '800', color: '#0d2137' },
  stockText: { marginTop: 3, color: '#5F746F', fontWeight: '600' },
  valuePill: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: '#F2F6F5' },
  valueText: { fontSize: 12, color: '#315f57', fontWeight: '800' },
  recipeBox: { marginTop: 14, padding: 13, borderRadius: 13, backgroundColor: '#F7F9F9' },
  recipeTitle: { marginBottom: 6, fontSize: 12, color: '#6B7F91', fontWeight: '800', textTransform: 'uppercase' },
  recipeLine: { color: '#334A47', lineHeight: 21, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  secondaryButton: { flex: 1, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 13, borderWidth: 1, borderColor: '#315f57' },
  secondaryButtonText: { color: '#315f57', fontWeight: '800' },
  useButton: { flex: 1, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 13, backgroundColor: '#315f57' },
  useButtonText: { color: '#fff', fontWeight: '800' },
  modalSafeArea: { flex: 1, backgroundColor: '#F7F9F9' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E4ECEA' },
  modalTitle: { fontSize: 21, color: '#0d2137', fontWeight: '800' },
  modalSubtitle: { marginTop: 3, fontSize: 12, color: '#6B7F91' },
  form: { padding: 20, paddingBottom: 42 },
  label: { marginTop: 15, marginBottom: 8, fontSize: 13, color: '#38534E', fontWeight: '800' },
  input: { minHeight: 50, borderWidth: 1, borderColor: '#D7E2DF', borderRadius: 13, paddingHorizontal: 14, backgroundColor: '#fff', color: '#0d2137', fontSize: 16 },
  notes: { minHeight: 86, paddingTop: 14, textAlignVertical: 'top' },
  sectionTitle: { marginTop: 25, fontSize: 17, color: '#0d2137', fontWeight: '800' },
  helper: { marginTop: 4, marginBottom: 10, color: '#6B7F91', lineHeight: 18 },
  warning: { marginTop: 10, padding: 12, borderRadius: 10, color: '#9A5B00', backgroundColor: '#FFF4DD', fontWeight: '600' },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E4ECEA' },
  ingredientName: { color: '#0d2137', fontWeight: '700' },
  available: { marginTop: 3, fontSize: 12, color: '#6B7F91' },
  quantityInput: { width: 74, height: 44, borderWidth: 1, borderColor: '#D7E2DF', borderRadius: 11, paddingHorizontal: 10, textAlign: 'right', backgroundColor: '#fff', fontSize: 15 },
  unit: { width: 38, marginLeft: 7, color: '#5F746F', fontWeight: '700' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#D7E2DF', backgroundColor: '#fff' },
  chipSelected: { borderColor: '#315f57', backgroundColor: '#315f57' },
  chipText: { color: '#38534E', fontWeight: '700' },
  chipTextSelected: { color: '#fff' },
  calculationCard: { marginTop: 15, padding: 15, borderRadius: 14, backgroundColor: '#E8F2F0' },
  calculationTitle: { fontWeight: '800', color: '#315f57', marginBottom: 6 },
  calculationLine: { color: '#4D6863', lineHeight: 20 },
  calculationResult: { marginTop: 5, color: '#0d2137', fontWeight: '800', fontSize: 15 },
  shortage: { marginTop: 8, color: '#C0392B', fontWeight: '800' },
  saveButton: { minHeight: 52, marginTop: 25, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#315f57' },
  disabledButton: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
