import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from "react";
import { 
  Alert, FlatList, Modal, ScrollView, StatusBar, StyleSheet, Platform,
  Text, TextInput, TouchableOpacity, View 
} from "react-native";
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { usePondStore, isPondCycleActive } from "../store/pondStore";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useFeedAdditiveStore } from "../store/feedAdditiveStore";
import {
  DAILY_FEED_ERROR_CODES,
  normalizeFeedAllocations,
  sumFeedAllocations,
} from '../../shared/feedInventoryUsage';
import { getFarmDateKey, normalizeFarmDateKey } from '../../shared/farmDate';
import { filterEnterpriseRecordsForUser, isEnterpriseOwner } from '../../shared/enterpriseBlocks';
import EnterprisePondGrid from '../components/enterprise/EnterprisePondGrid';
import { useEnterpriseBlocks } from '../hooks/useEnterpriseBlocks';

interface FeedAllocationInput {
  inventoryFeedId: string;
  quantityKg: string;
}

const dateKeyToLocalDate = (dateKey: string): Date => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
};

const localDateToDateKey = (date: Date): string => (
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
);

const Input = React.memo(({ label, value, onChange, placeholder = "", disabled = false }: any) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput style={[styles.input, disabled && styles.inputDisabled]} keyboardType="numeric" value={value}
      onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#6b8aa0" editable={!disabled} />
  </View>
));
Input.displayName = 'Input';

const Parameter = React.memo(({ icon, label, value }: any) => (
  <View style={styles.parameterItem}>
    <Ionicons name={icon} size={16} color="#dce8f2" />
    <Text style={styles.parameterLabel}>{label}</Text>
    <Text style={styles.parameterValue}>{value || "N/A"}</Text>
  </View>
));
Parameter.displayName = 'Parameter';

export default function FeedManagementScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, company } = useAuth();
  const { ponds, addFeedData } = usePondStore();
  const { setCurrentCompanyId, reconcileDailyFeedAllocations } = useFeedAdditiveStore();
  const canEditPonds = user?.role === 'technician' || user?.role === 'owner' || user?.role === 'co-owner';
  const enterpriseOwnerView = isEnterpriseOwner(company?.businessSize, user?.role);
  const enterpriseBlocks = useEnterpriseBlocks(
    company?.businessSize === 'enterprise' ? company?.id : undefined,
    user?.uid,
  );
  const accessiblePonds = useMemo(() => filterEnterpriseRecordsForUser(ponds, {
    businessSize: company?.businessSize,
    role: user?.role,
    userId: user?.uid,
    blocks: enterpriseBlocks.blocks,
  }), [company?.businessSize, enterpriseBlocks.blocks, ponds, user?.role, user?.uid]);
  const activePonds = useMemo(() => accessiblePonds.filter(isPondCycleActive), [accessiblePonds]);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedPond, setSelectedPond] = useState<string | null>(null);
  const [inventoryFeeds, setInventoryFeeds] = useState<any[]>([]);
  const [feedAllocations, setFeedAllocations] = useState<FeedAllocationInput[]>([]);
  const farmToday = getFarmDateKey(new Date(), company?.timeZone);
  const [feedDate, setFeedDate] = useState(farmToday);
  const [tempFeedDate, setTempFeedDate] = useState(dateKeyToLocalDate(farmToday));
  const [showFeedDatePicker, setShowFeedDatePicker] = useState(false);
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
      setCurrentCompanyId(user.companyId, company?.timeZone);
      const q = query(collection(db, 'companies', user.companyId, 'feeds'), orderBy('feedName', 'asc'));
      const unsub = onSnapshot(q, (snapshot) => {
        setInventoryFeeds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return unsub;
    }
  }, [company?.timeZone, setCurrentCompanyId, user?.companyId]);

  const getFeedRecordForDate = React.useCallback((pond: any, date: string) => (
    Array.isArray(pond?.samplings)
      ? pond.samplings.find((sampling: any) => sampling.feedData && sampling.date === date)
      : undefined
  ), []);

  const getTodayFeedRecord = React.useCallback((pond: any) => (
    getFeedRecordForDate(pond, farmToday)
  ), [farmToday, getFeedRecordForDate]);

  const selectedPondRecord = useMemo(
    () => activePonds.find((pond) => pond.pondName === selectedPond),
    [activePonds, selectedPond],
  );
  const selectedPondStartDate = normalizeFarmDateKey(
    selectedPondRecord?.cycleStartedAt || selectedPondRecord?.docStart,
    company?.timeZone,
  );
  const minimumFeedDate = selectedPondStartDate && selectedPondStartDate <= farmToday
    ? selectedPondStartDate
    : farmToday;

  const loadFeedAllocations = React.useCallback((pondName: string | null, date: string) => {
    const pond = activePonds.find((item) => item.pondName === pondName);
    const feedRecord = pond ? getFeedRecordForDate(pond, date) : undefined;
    setFeedAllocations(feedRecord?.feedData
      ? normalizeFeedAllocations(feedRecord.feedData).map((allocation) => ({
        inventoryFeedId: allocation.inventoryFeedId,
        quantityKg: String(allocation.quantityKg),
      }))
      : []);
  }, [activePonds, getFeedRecordForDate]);

  const allFeedRecords = useMemo(() => {
    const today = getFarmDateKey(new Date(), company?.timeZone);
    return activePonds.map(pond => {
      const todayRecord = getTodayFeedRecord(pond);
      return todayRecord?.feedData 
        ? { ...todayRecord.feedData, pondId: pond.id, pondName: pond.pondName, date: today }
        : { pondId: pond.id, pondName: pond.pondName, date: today };
    });
  }, [activePonds, company?.timeZone, getTodayFeedRecord]);

  const todayFeedSummary = useMemo(() => {
    let totalKg = 0;
    let hasLoggedFeed = false;

    activePonds.forEach((pond) => {
      const amount = Number(getTodayFeedRecord(pond)?.feedData?.totalDailyFeed);
      if (!Number.isFinite(amount) || amount <= 0) return;
      totalKg += amount;
      hasLoggedFeed = true;
    });

    return { totalKg, hasLoggedFeed };
  }, [activePonds, getTodayFeedRecord]);

  const todayFeedSummaryValue = todayFeedSummary.hasLoggedFeed
    ? `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(todayFeedSummary.totalKg)} kg`
    : t.feed.notLoggedYet;

  const handleSave = async () => {
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

    const allocationInputs = feedAllocations.map((allocation) => ({
      inventoryFeedId: allocation.inventoryFeedId,
      quantityKg: Number(allocation.quantityKg),
    }));
    if (allocationInputs.length === 0) {
      Alert.alert(t.feed.inventoryRequired, inventoryFeeds.length === 0 ? t.feed.noFeedsAvailable : t.feed.selectFeedFirst);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }
    if (allocationInputs.some((allocation) => !inventoryFeeds.some((feed) => feed.id === allocation.inventoryFeedId))) {
      Alert.alert(t.messages?.error || 'Error', t.feed.inventoryNotFound);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }
    if (allocationInputs.some((allocation) => !Number.isFinite(allocation.quantityKg) || allocation.quantityKg <= 0)) {
      Alert.alert(t.messages?.error || 'Error', t.feed.invalidAllocation);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }
    const parsedAllocations = normalizeFeedAllocations({ feedAllocations: allocationInputs });

    const totalDailyFeed = sumFeedAllocations(parsedAllocations);
    if (!Number.isFinite(totalDailyFeed) || totalDailyFeed <= 0) {
      Alert.alert(t.messages?.error || 'Error', t.feed.invalidAmount);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }
    const selectedDateRecord = getFeedRecordForDate(pond, feedDate);
    const previousAllocations = normalizeFeedAllocations(selectedDateRecord?.feedData);

    const feedData = {
      totalDailyFeed: totalDailyFeed.toFixed(2),
      inventoryFeedId: parsedAllocations.length === 1 ? parsedAllocations[0].inventoryFeedId : null,
      feedAllocations: parsedAllocations,
    };

    try {
      await reconcileDailyFeedAllocations(
        previousAllocations,
        parsedAllocations,
        pond.id,
        feedDate,
      );

      addFeedData(pond.id, feedData, feedDate);
      setSelectedPond(null);
      setFeedAllocations([]);
      setFeedDate(farmToday);
      setTempFeedDate(dateKeyToLocalDate(farmToday));
      setIsModalVisible(false);
    } catch (error: any) {
      console.error('Failed to save feed data:', error);
      const errorMessages: Record<string, string> = {
        [DAILY_FEED_ERROR_CODES.companyUnavailable]: t.feed.companyUnavailable,
        [DAILY_FEED_ERROR_CODES.feedSelectionRequired]: t.feed.selectFeedFirst,
        [DAILY_FEED_ERROR_CODES.invalidAmount]: t.feed.invalidAmount,
        [DAILY_FEED_ERROR_CODES.invalidAllocation]: t.feed.invalidAllocation,
        [DAILY_FEED_ERROR_CODES.inventoryNotFound]: t.feed.inventoryNotFound,
        [DAILY_FEED_ERROR_CODES.insufficientStock]: t.feed.insufficientStock,
        [DAILY_FEED_ERROR_CODES.missingCost]: t.feed.missingFeedCost,
      };
      Alert.alert(t.messages?.error || 'Error', errorMessages[error?.message] || t.feed.saveFailed);
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handlePondSelection = (pondName: string) => {
    setSelectedPond(pondName);
    const pond = activePonds.find((item) => item.pondName === pondName);
    const startDate = normalizeFarmDateKey(pond?.cycleStartedAt || pond?.docStart, company?.timeZone);
    const nextDate = startDate && feedDate < startDate ? farmToday : feedDate;
    setFeedDate(nextDate);
    setTempFeedDate(dateKeyToLocalDate(nextDate));
    loadFeedAllocations(pondName, nextDate);
  };

  const applyFeedDate = (date: Date) => {
    const nextDate = localDateToDateKey(date);
    setFeedDate(nextDate);
    setTempFeedDate(dateKeyToLocalDate(nextDate));
    loadFeedAllocations(selectedPond, nextDate);
  };

  const openModal = () => {
    const today = getFarmDateKey(new Date(), company?.timeZone);
    setFeedDate(today);
    setTempFeedDate(dateKeyToLocalDate(today));
    setShowFeedDatePicker(false);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setSelectedPond(null);
    setFeedAllocations([]);
    setFeedDate(farmToday);
    setTempFeedDate(dateKeyToLocalDate(farmToday));
    setShowFeedDatePicker(false);
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

        <View
          style={styles.dailyFeedSummary}
          accessible
          accessibilityLabel={`${t.feed.dailyFeedUsed}: ${todayFeedSummaryValue}`}
        >
          <Text style={styles.dailyFeedSummaryLabel}>{t.feed.dailyFeedUsed}</Text>
          <Text style={styles.dailyFeedSummaryValue}>{todayFeedSummaryValue}</Text>
        </View>

        {enterpriseOwnerView ? (
          <EnterprisePondGrid
            blocks={enterpriseBlocks.blocks}
            technicians={enterpriseBlocks.technicians}
            ponds={activePonds}
            emptyMessage={t.feed.noData}
            getTone={(pond) => getTodayFeedRecord(pond)?.feedData ? 'stable' : 'neutral'}
            getSubtitle={(pond) => {
              const amount = getTodayFeedRecord(pond)?.feedData?.totalDailyFeed;
              return amount ? `${amount} kg` : undefined;
            }}
            onPress={(pond) => router.push({ pathname: '/feed-history', params: { pondId: pond.id, pondName: pond.pondName } })}
          />
        ) : (
        <FlatList
          data={allFeedRecords}
          keyExtractor={(item, index) => `${item.pondName}-${item.date || index}`}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="file-tray-outline" size={80} color="#315f57" />
              <Text style={styles.emptyTitle}>{t.feed.noData}</Text>
              <Text style={styles.emptySubtitle}>
                {canEditPonds ? t.feed.addFirst : t.feed.noDataAvailable}
              </Text>
            </View>
          }
          renderItem={({ item: rec }) => (
              <TouchableOpacity style={styles.recordCard}
                onPress={() => {
                  router.push({ pathname: '/feed-history',
                    params: { pondId: rec.pondId, pondName: rec.pondName }});
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
                    <View style={{ flex: 1 }} />
                  </View>
                </View>
              </TouchableOpacity>
          )}
        />
        )}

        {canEditPonds && (
          <TouchableOpacity style={styles.floatingButton} onPress={openModal}>
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
                  accessibilityLabel={t.actions.cancel}
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
                  <Text style={styles.inputLabel}>{t.forms.date}</Text>
                  <TouchableOpacity
                    style={[styles.dateInput, !selectedPond && styles.inputDisabled]}
                    onPress={() => {
                      setTempFeedDate(dateKeyToLocalDate(feedDate));
                      setShowFeedDatePicker(true);
                    }}
                    disabled={!selectedPond}
                    accessibilityRole="button"
                    accessibilityLabel={`${t.forms.date}: ${dateKeyToLocalDate(feedDate).toLocaleDateString()}`}
                    accessibilityState={{ disabled: !selectedPond }}
                  >
                    <Ionicons name="calendar-outline" size={20} color="#0F4C75" />
                    <Text style={styles.dateInputText}>
                      {dateKeyToLocalDate(feedDate).toLocaleDateString()}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="#6b8aa0" />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{t.feed.feedMix}</Text>
                  <Text style={styles.inputHint}>{t.feed.feedMixHint}</Text>
                  {feedAllocations.length === 0 && (
                    <View style={styles.feedWarning}>
                      <Ionicons name="warning-outline" size={20} color="#b45309" />
                      <View style={styles.feedWarningTextContainer}>
                        <Text style={styles.feedWarningTitle}>{t.feed.inventoryRequired}</Text>
                        <Text style={styles.feedWarningText}>
                          {inventoryFeeds.length === 0 ? t.feed.noFeedsAvailable : t.feed.selectFeedFirst}
                        </Text>
                      </View>
                    </View>
                  )}
                  {feedAllocations.map((allocation) => {
                    const feed = inventoryFeeds.find((item) => item.id === allocation.inventoryFeedId);
                    return (
                      <View key={allocation.inventoryFeedId} style={styles.allocationRow}>
                        <View style={styles.allocationNameContainer}>
                          <Text style={styles.allocationName} numberOfLines={1}>{feed?.feedName || t.feed.feedUnavailable}</Text>
                          <Text style={styles.allocationStock}>{feed?.totalStock ?? 0} {feed?.unit || 'kg'}</Text>
                        </View>
                        <TextInput
                          style={styles.allocationInput}
                          keyboardType="numeric"
                          value={allocation.quantityKg}
                          onChangeText={(quantityKg) => setFeedAllocations((current) => current.map((item) => (
                            item.inventoryFeedId === allocation.inventoryFeedId ? { ...item, quantityKg } : item
                          )))}
                          placeholder={t.feed.feedAmountKg}
                          placeholderTextColor="#6b8aa0"
                        />
                        <TouchableOpacity
                          style={styles.removeAllocationButton}
                          onPress={() => setFeedAllocations((current) => current.filter((item) => item.inventoryFeedId !== allocation.inventoryFeedId))}
                          accessibilityRole="button"
                          accessibilityLabel={t.feed.removeFeed}
                        >
                          <Ionicons name="close" size={18} color="#e74c3c" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                  {inventoryFeeds.some((feed) => !feedAllocations.some((allocation) => allocation.inventoryFeedId === feed.id)) && (
                    <>
                      <Text style={styles.addFeedLabel}>{t.feed.addFeedType}</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pondSelector}>
                        {inventoryFeeds
                          .filter((feed) => !feedAllocations.some((allocation) => allocation.inventoryFeedId === feed.id))
                          .map((feed) => (
                            <TouchableOpacity key={feed.id}
                              style={styles.pondOption}
                              onPress={() => setFeedAllocations((current) => [...current, { inventoryFeedId: feed.id, quantityKg: '' }])}>
                              <Text style={styles.pondOptionText}>
                                + {feed.feedName} ({feed.totalStock} {feed.unit || 'kg'})
                              </Text>
                            </TouchableOpacity>
                          ))}
                      </ScrollView>
                    </>
                  )}
                </View>

                <Input label={t.feed.calculatedTotal}
                  value={sumFeedAllocations(feedAllocations.map((allocation) => ({
                    inventoryFeedId: allocation.inventoryFeedId,
                    quantityKg: Number(allocation.quantityKg) || 0,
                  }))).toFixed(2)}
                  onChange={() => undefined}
                  placeholder={t.feed.feedPlaceholder}
                  disabled />

                <View style={styles.buttonContainer}>
                  <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                    <Text style={styles.cancelButtonText}>{t.actions.cancel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.addButton, isSubmitting && { opacity: 0.6 }]} onPress={handleSave} disabled={isSubmitting}>
                    <Text style={styles.addButtonText}>{t.feed.saveFeedData}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              {showFeedDatePicker && selectedPond && (
                <View style={styles.datePickerContainer}>
                  <DateTimePicker
                    value={tempFeedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    minimumDate={dateKeyToLocalDate(minimumFeedDate)}
                    maximumDate={dateKeyToLocalDate(farmToday)}
                    onChange={(event, date) => {
                      if (event.type === 'dismissed') {
                        setShowFeedDatePicker(false);
                        return;
                      }
                      const nextDate = date || tempFeedDate;
                      setTempFeedDate(nextDate);
                      if (Platform.OS !== 'ios') {
                        applyFeedDate(nextDate);
                        setShowFeedDatePicker(false);
                      }
                    }}
                    themeVariant="light"
                  />
                  {Platform.OS === 'ios' && (
                    <View style={styles.datePickerButtons}>
                      <TouchableOpacity
                        style={styles.datePickerCancelButton}
                        onPress={() => setShowFeedDatePicker(false)}
                      >
                        <Text style={styles.datePickerCancelText}>{t.actions.cancel}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.datePickerConfirmButton}
                        onPress={() => {
                          applyFeedDate(tempFeedDate);
                          setShowFeedDatePicker(false);
                        }}
                      >
                        <Text style={styles.datePickerConfirmText}>{t.actions.confirm}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
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
  dailyFeedSummary: {
    minHeight: 48,
    marginHorizontal: Platform.OS === 'android' ? 16 : 20,
    marginBottom: Platform.OS === 'android' ? 12 : 16,
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dce8f2',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dailyFeedSummaryLabel: { flex: 1, color: '#315f57', fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '600' },
  dailyFeedSummaryValue: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 16 : 17, fontWeight: '800', textAlign: 'right' },
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
  inputDisabled: { backgroundColor: '#edf3f8', color: '#315f57' },
  inputHint: { color: '#6b8aa0', fontSize: 12, lineHeight: 17, marginBottom: 10 },
  dateInput: { minHeight: 50, borderWidth: 1, borderColor: '#d9e8f2', paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#f4f8fc', flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateInputText: { flex: 1, color: '#0d2137', fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: '600' },
  datePickerContainer: { borderTopWidth: 1, borderTopColor: '#e8f2f9', backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 20 : 0 },
  datePickerButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  datePickerCancelButton: { paddingHorizontal: 18, paddingVertical: 12 },
  datePickerConfirmButton: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10, backgroundColor: '#0F4C75' },
  datePickerCancelText: { color: '#e74c3c', fontSize: 14, fontWeight: '700' },
  datePickerConfirmText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  feedWarning: { flexDirection: 'row', gap: 10, padding: 12, marginBottom: 12, borderRadius: 12, borderWidth: 1, borderColor: '#f6c453', backgroundColor: '#fff8e6' },
  feedWarningTextContainer: { flex: 1 },
  feedWarningTitle: { color: '#92400e', fontSize: 13, fontWeight: '700', marginBottom: 2 },
  feedWarningText: { color: '#92400e', fontSize: 12, lineHeight: 17 },
  allocationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e8f2f9' },
  allocationNameContainer: { flex: 1, minWidth: 0 },
  allocationName: { color: '#0d2137', fontSize: 14, fontWeight: '600' },
  allocationStock: { color: '#6b8aa0', fontSize: 11, marginTop: 2 },
  allocationInput: { width: 92, borderWidth: 1, borderColor: '#d9e8f2', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, color: '#0d2137', backgroundColor: '#f4f8fc', fontSize: 13 },
  removeAllocationButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  addFeedLabel: { color: '#315f57', fontSize: 12, fontWeight: '600', marginTop: 12, marginBottom: 8 },
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
