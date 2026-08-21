import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from "react";
import { 
  Alert, FlatList, Modal, ScrollView, StatusBar, StyleSheet, Platform,
  Text, TextInput, TouchableOpacity, View 
} from "react-native";
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { usePondStore, isPondCycleActive, type FeedingResponse } from "../store/pondStore";
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
import AppDatePicker from '../components/forms/AppDatePicker';
import { hasFarmPermission } from '../../shared/permissions';

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

export default function FeedManagementScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, company } = useAuth();
  const { ponds, addFeedData } = usePondStore();
  const { setCurrentCompanyId, reconcileDailyFeedAllocations } = useFeedAdditiveStore();
  const canEditPonds = hasFarmPermission(user, 'manageFeedInventory', company?.ownerId);
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
  const [feedingResponse, setFeedingResponse] = useState<FeedingResponse | null>(null);
  const farmToday = getFarmDateKey(new Date(), company?.timeZone);
  const [feedDate, setFeedDate] = useState(farmToday);
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
    setFeedingResponse(feedRecord?.feedData?.feedingResponse || null);
  }, [activePonds, getFeedRecordForDate]);

  const feedingResponseLabels: Record<FeedingResponse, string> = {
    strong: t.feed.feedingResponseStrong,
    normal: t.feed.feedingResponseNormal,
    weak: t.feed.feedingResponseWeak,
  };
  const getFeedingResponseLabel = (response: unknown): string | null => (
    response === 'strong' || response === 'normal' || response === 'weak'
      ? feedingResponseLabels[response]
      : null
  );

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
      feedingResponse,
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
      setFeedingResponse(null);
      setFeedDate(farmToday);
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
    loadFeedAllocations(pondName, nextDate);
  };

  const applyFeedDate = (date: Date) => {
    const nextDate = localDateToDateKey(date);
    setFeedDate(nextDate);
    loadFeedAllocations(selectedPond, nextDate);
  };

  const openModal = () => {
    const today = getFarmDateKey(new Date(), company?.timeZone);
    setFeedDate(today);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setSelectedPond(null);
    setFeedAllocations([]);
    setFeedingResponse(null);
    setFeedDate(farmToday);
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
              const feedData = getTodayFeedRecord(pond)?.feedData;
              if (!feedData?.totalDailyFeed) return undefined;
              const response = getFeedingResponseLabel(feedData.feedingResponse);
              return `${feedData.totalDailyFeed} kg${response ? ` · ${response}` : ''}`;
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
                  <View style={styles.cardMetricsRow}>
                    <View style={styles.cardMetric}>
                      <Text style={styles.cardMetricLabel}>{t.feed.dailyFeed}</Text>
                      <Text style={styles.cardMetricValue}>{`${rec.totalDailyFeed || "N/A"} kg`}</Text>
                    </View>
                    <View style={[styles.cardMetric, styles.cardMetricRight]}>
                      <Text style={styles.cardMetricLabel}>{t.feed.feedingResponse}</Text>
                      <Text style={styles.cardMetricValue}>
                        {getFeedingResponseLabel(rec.feedingResponse) || "—"}
                      </Text>
                    </View>
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
                  <AppDatePicker
                    label={t.forms.date}
                    value={feedDate}
                    minimumDate={dateKeyToLocalDate(minimumFeedDate)}
                    maximumDate={dateKeyToLocalDate(farmToday)}
                    disabled={!selectedPond}
                    onChange={applyFeedDate}
                    cancelLabel={t.actions.cancel}
                    confirmLabel={t.actions.confirm}
                  />
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

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{t.feed.feedingResponseOptional}</Text>
                  <Text style={styles.inputHint}>{t.feed.feedingResponseHint}</Text>
                  <View style={styles.feedingResponseOptions}>
                    {(['strong', 'normal', 'weak'] as FeedingResponse[]).map((response) => {
                      const selected = feedingResponse === response;
                      return (
                        <TouchableOpacity
                          key={response}
                          style={[styles.feedingResponseOption, selected && styles.feedingResponseOptionSelected]}
                          onPress={() => setFeedingResponse(selected ? null : response)}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: selected }}
                        >
                          <Text style={[styles.feedingResponseOptionText, selected && styles.feedingResponseOptionTextSelected]}>
                            {feedingResponseLabels[response]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
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
  cardMetricsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 },
  cardMetric: { flex: 1, minWidth: 0 },
  cardMetricRight: { alignItems: 'flex-end' },
  cardMetricLabel: { color: '#6B8AA0', fontSize: Platform.OS === 'android' ? 10 : 11, fontWeight: '600', textTransform: 'uppercase' },
  cardMetricValue: { color: '#0D2137', fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: '800', marginTop: 4 },
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
  feedingResponseOptions: { flexDirection: 'row', gap: 8 },
  feedingResponseOption: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#d9e8f2', backgroundColor: '#FFFFFF' },
  feedingResponseOptionSelected: { borderColor: '#0F4C75', backgroundColor: '#0F4C75' },
  feedingResponseOptionText: { color: '#0F4C75', fontSize: 13, fontWeight: '700' },
  feedingResponseOptionTextSelected: { color: '#FFFFFF' },
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
