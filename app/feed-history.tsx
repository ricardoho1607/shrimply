import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { usePondStore, FeedData, Pond, Sampling, type FeedingResponse } from './store/pondStore';
import { Feed, useFeedAdditiveStore } from './store/feedAdditiveStore';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
  DAILY_FEED_ERROR_CODES,
  getDailyFeedUsageTotal,
  normalizeFeedAllocations,
  sumFeedAllocations,
} from '../shared/feedInventoryUsage';
import { filterEnterpriseRecordsForUser } from '../shared/enterpriseBlocks';
import { useEnterpriseBlocks } from './hooks/useEnterpriseBlocks';
import { hasFarmPermission } from '../shared/permissions';

type FeedHistoryRecord = FeedData & { date: string; id: string };
type FeedAllocationInput = { inventoryFeedId: string; quantityKg: string };

export default function FeedHistoryScreen() {
  const { pondId, pondName } = useLocalSearchParams();
  const { ponds, updateSampling } = usePondStore();
  const { user, company } = useAuth();
  const { setCurrentCompanyId, reconcileDailyFeedAllocations, deleteDailyFeedRecord } = useFeedAdditiveStore();
  const { t } = useLanguage();
  const [inventoryFeeds, setInventoryFeeds] = useState<Feed[]>([]);
  const [editingRecord, setEditingRecord] = useState<FeedHistoryRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<FeedHistoryRecord | null>(null);
  const [feedAllocations, setFeedAllocations] = useState<FeedAllocationInput[]>([]);
  const [feedingResponse, setFeedingResponse] = useState<FeedingResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const submitLockRef = useRef(false);

  const resolvedPondId = Array.isArray(pondId) ? pondId[0] : pondId;
  const enterpriseBlocks = useEnterpriseBlocks(
    company?.businessSize === 'enterprise' ? company.id : undefined,
    user?.uid,
  );
  const accessiblePonds = useMemo(() => filterEnterpriseRecordsForUser(ponds, {
    businessSize: company?.businessSize,
    role: user?.role,
    userId: user?.uid,
    blocks: enterpriseBlocks.blocks,
  }), [company?.businessSize, enterpriseBlocks.blocks, ponds, user?.role, user?.uid]);
  const pond: Pond | undefined = accessiblePonds.find((p: Pond) => p.id === resolvedPondId);
  const displayPondName = Array.isArray(pondName) ? pondName[0] : pondName;
  const canEditFeed = hasFarmPermission(user, 'manageFeedInventory', company?.ownerId);
  const feedingResponseLabels: Record<FeedingResponse, string> = {
    strong: t.feed.feedingResponseStrong,
    normal: t.feed.feedingResponseNormal,
    weak: t.feed.feedingResponseWeak,
  };

  const [inventoryCompanyId, setInventoryCompanyId] = useState(user?.companyId);
  if (inventoryCompanyId !== user?.companyId) {
    setInventoryCompanyId(user?.companyId);
    setInventoryFeeds([]);
  }

  useEffect(() => {
    if (!user?.companyId) {
      setCurrentCompanyId(null, company?.timeZone);
      return undefined;
    }

    setCurrentCompanyId(user.companyId, company?.timeZone);
    const feedsQuery = query(
      collection(db, 'companies', user.companyId, 'feeds'),
      orderBy('feedName', 'asc'),
    );
    return onSnapshot(feedsQuery, (snapshot) => {
      setInventoryFeeds(snapshot.docs.map((feedDoc) => ({
        id: feedDoc.id,
        ...feedDoc.data(),
      } as Feed)));
    });
  }, [company?.timeZone, setCurrentCompanyId, user?.companyId]);

  const feedHistory = useMemo<FeedHistoryRecord[]>(() => (pond?.samplings || [])
    .filter((sampling: Sampling): sampling is Sampling & { feedData: FeedData } => Boolean(sampling.feedData))
    .map((sampling) => ({ ...sampling.feedData, date: sampling.date, id: sampling.id }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [pond?.samplings]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const openEditor = (record: FeedHistoryRecord) => {
    if (!canEditFeed) return;
    setEditingRecord(record);
    setFeedAllocations(normalizeFeedAllocations(record).map((allocation) => ({
      inventoryFeedId: allocation.inventoryFeedId,
      quantityKg: String(allocation.quantityKg),
    })));
    setFeedingResponse(record.feedingResponse || null);
    submitLockRef.current = false;
    setIsSubmitting(false);
  };

  const closeEditor = () => {
    setEditingRecord(null);
    setFeedAllocations([]);
    setFeedingResponse(null);
    submitLockRef.current = false;
    setIsSubmitting(false);
  };

  const handleUpdate = async () => {
    if (submitLockRef.current || !editingRecord || !pond || !canEditFeed) return;
    submitLockRef.current = true;
    setIsSubmitting(true);

    const allocationInputs = feedAllocations.map((allocation) => ({
      inventoryFeedId: allocation.inventoryFeedId,
      quantityKg: Number(allocation.quantityKg),
    }));
    const errorTitle = t.messages?.error || 'Error';

    if (allocationInputs.length === 0) {
      Alert.alert(t.feed.inventoryRequired, inventoryFeeds.length === 0 ? t.feed.noFeedsAvailable : t.feed.selectFeedFirst);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }
    if (allocationInputs.some((allocation) => !inventoryFeeds.some((feed) => feed.id === allocation.inventoryFeedId))) {
      Alert.alert(errorTitle, t.feed.inventoryNotFound);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }
    if (allocationInputs.some((allocation) => !Number.isFinite(allocation.quantityKg) || allocation.quantityKg <= 0)) {
      Alert.alert(errorTitle, t.feed.invalidAllocation);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const nextAllocations = normalizeFeedAllocations({ feedAllocations: allocationInputs });
    const totalDailyFeed = sumFeedAllocations(nextAllocations);
    if (!Number.isFinite(totalDailyFeed) || totalDailyFeed <= 0) {
      Alert.alert(errorTitle, t.feed.invalidAmount);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    try {
      await reconcileDailyFeedAllocations(
        normalizeFeedAllocations(editingRecord),
        nextAllocations,
        pond.id,
        editingRecord.date,
      );
      updateSampling(pond.id, editingRecord.id, {
        feedData: {
          totalDailyFeed: totalDailyFeed.toFixed(2),
          feedingResponse,
          inventoryFeedId: nextAllocations.length === 1 ? nextAllocations[0].inventoryFeedId : null,
          feedAllocations: nextAllocations,
          cycleId: editingRecord.cycleId || pond.cycleId,
          cycleName: editingRecord.cycleName || pond.cycleName,
          pondCycleId: editingRecord.pondCycleId || pond.pondCycleId || pond.id,
        },
      });
      closeEditor();
      Alert.alert(t.messages?.success || 'Success', t.feedHistory.updateSuccess);
    } catch (error: any) {
      console.error('Failed to update historical feed data:', error);
      const errorMessages: Record<string, string> = {
        [DAILY_FEED_ERROR_CODES.companyUnavailable]: t.feed.companyUnavailable,
        [DAILY_FEED_ERROR_CODES.feedSelectionRequired]: t.feed.selectFeedFirst,
        [DAILY_FEED_ERROR_CODES.invalidAmount]: t.feed.invalidAmount,
        [DAILY_FEED_ERROR_CODES.invalidAllocation]: t.feed.invalidAllocation,
        [DAILY_FEED_ERROR_CODES.inventoryNotFound]: t.feed.inventoryNotFound,
        [DAILY_FEED_ERROR_CODES.insufficientStock]: t.feed.insufficientStock,
        [DAILY_FEED_ERROR_CODES.missingCost]: t.feed.missingFeedCost,
      };
      Alert.alert(errorTitle, errorMessages[error?.message] || t.feed.saveFailed);
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingRecord || !pond || !user?.uid || !canEditFeed || isDeleting) return;
    setIsDeleting(true);
    const errorTitle = t.messages?.error || 'Error';

    try {
      const matchingInventoryFeedIds = inventoryFeeds
        .filter((feed) => getDailyFeedUsageTotal(feed.usageHistory, pond.id, deletingRecord.date) > 0)
        .map((feed) => feed.id);
      const result = await deleteDailyFeedRecord(
        pond.id,
        deletingRecord.id,
        deletingRecord.date,
        user.uid,
        matchingInventoryFeedIds,
      );
      setDeletingRecord(null);
      Alert.alert(
        t.messages?.success || 'Success',
        result.missingInventory
          ? t.feedHistory.deleteSuccessWithoutInventory
          : t.feedHistory.deleteSuccess,
      );
    } catch (error: any) {
      console.error('Failed to delete historical feed data:', error);
      const errorMessages: Record<string, string> = {
        [DAILY_FEED_ERROR_CODES.companyUnavailable]: t.feed.companyUnavailable,
        [DAILY_FEED_ERROR_CODES.feedRecordMissingInventory]: t.feedHistory.deleteInventoryMissing,
        [DAILY_FEED_ERROR_CODES.inventoryNotFound]: t.feed.inventoryNotFound,
        [DAILY_FEED_ERROR_CODES.missingCost]: t.feed.missingFeedCost,
      };
      Alert.alert(errorTitle, errorMessages[error?.message] || t.feedHistory.deleteFailed);
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteMessage = deletingRecord
    ? t.feedHistory.deleteMessage
      .replace('{amount}', String(deletingRecord.totalDailyFeed))
      .replace('{date}', formatDate(deletingRecord.date))
    : '';
  const deletionHasMissingInventory = deletingRecord
    ? inventoryFeeds.reduce(
      (total, feed) => total + getDailyFeedUsageTotal(feed.usageHistory, pond?.id || '', deletingRecord.date),
      0,
    ) + 0.000001 < sumFeedAllocations(normalizeFeedAllocations(deletingRecord))
    : false;

  const allocationTotal = sumFeedAllocations(feedAllocations.map((allocation) => ({
    inventoryFeedId: allocation.inventoryFeedId,
    quantityKg: Number(allocation.quantityKg) || 0,
  })));

  return (
    <>
      <Stack.Screen options={{
          title: `${displayPondName || ''} ${t.feedHistory.title}`.trim(),
          headerBackTitle: t.feedHistory.backButton,
          headerStyle: { backgroundColor: '#dce8f2' },
          headerTintColor: '#0d2137',
          headerTitleStyle: { fontWeight: 'bold', fontSize: Platform.OS === 'android' ? 17 : 18 },
          headerShadowVisible: false,
        }} />
      <StatusBar barStyle="light-content" backgroundColor="#0d2137" />
      <GestureHandlerRootView style={styles.container}>
        {canEditFeed && feedHistory.length > 0 && (
          <View style={styles.editHint}>
            <Ionicons name="create-outline" size={18} color="#0F4C75" />
            <Text style={styles.editHintText}>{t.feedHistory.editHint}</Text>
          </View>
        )}
        {feedHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="fish-outline" size={80} color="#315f57" />
            <Text style={styles.emptyTitle}>{t.feedHistory.noHistory}</Text>
            <Text style={styles.emptySubtitle}>{t.feedHistory.noHistorySubtitle}</Text>
          </View>
        ) : (
          <View style={styles.historyCard}>
            <FlatList
              data={feedHistory}
              keyExtractor={(item) => item.id || item.date}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item: record }) => canEditFeed ? (
                <Swipeable
                  overshootRight={false}
                  rightThreshold={40}
                  renderRightActions={() => (
                    <TouchableOpacity
                      style={styles.swipeDeleteButton}
                      onPress={() => setDeletingRecord(record)}
                      accessibilityRole="button"
                      accessibilityLabel={`${t.feedHistory.deleteAction}: ${formatDate(record.date)}`}
                    >
                      <Ionicons name="trash-outline" size={21} color="#FFFFFF" />
                      <Text style={styles.swipeDeleteText}>{t.feedHistory.deleteAction}</Text>
                    </TouchableOpacity>
                  )}
                >
                  <TouchableOpacity
                    style={styles.historyRow}
                    onPress={() => openEditor(record)}
                    accessibilityRole="button"
                    accessibilityLabel={`${formatDate(record.date)}, ${record.totalDailyFeed} kg, ${t.feedHistory.editTitle}`}
                  >
                    <Text style={styles.dateText}>{formatDate(record.date)}</Text>
                    <View style={styles.feedAmountContainer}>
                      <Text style={styles.feedAmount}>{record.totalDailyFeed} kg</Text>
                      <Ionicons name="chevron-forward" size={18} color="#6B8AA0" />
                    </View>
                  </TouchableOpacity>
                </Swipeable>
              ) : (
                <View style={styles.historyRow}>
                  <Text style={styles.dateText}>{formatDate(record.date)}</Text>
                  <Text style={styles.feedAmount}>{record.totalDailyFeed} kg</Text>
                </View>
              )}
            />
          </View>
        )}

        <Modal visible={Boolean(editingRecord)} animationType="slide" transparent onRequestClose={closeEditor}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderText}>
                  <Text style={styles.modalTitle}>{t.feedHistory.editTitle}</Text>
                  <Text style={styles.modalSubtitle}>{t.feedHistory.editSubtitle}</Text>
                </View>
                <TouchableOpacity onPress={closeEditor} style={styles.closeButton} accessibilityRole="button">
                  <Ionicons name="close" size={24} color="#0F4C75" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollView} keyboardShouldPersistTaps="handled">
                <View style={styles.readOnlyField}>
                  <Text style={styles.inputLabel}>{t.forms.date}</Text>
                  <Text style={styles.readOnlyValue}>{editingRecord ? formatDate(editingRecord.date) : ''}</Text>
                </View>

                <Text style={styles.inputLabel}>{t.feed.feedMix}</Text>
                <Text style={styles.inputHint}>{t.feed.feedMixHint}</Text>

                {feedAllocations.length === 0 && (
                  <View style={styles.feedWarning}>
                    <Ionicons name="warning-outline" size={20} color="#B45309" />
                    <Text style={styles.feedWarningText}>
                      {inventoryFeeds.length === 0 ? t.feed.noFeedsAvailable : t.feed.selectFeedFirst}
                    </Text>
                  </View>
                )}

                {feedAllocations.map((allocation) => {
                  const feed = inventoryFeeds.find((item) => item.id === allocation.inventoryFeedId);
                  return (
                    <View key={allocation.inventoryFeedId} style={styles.allocationRow}>
                      <View style={styles.allocationNameContainer}>
                        <Text style={styles.allocationName} numberOfLines={1}>
                          {feed?.feedName || t.feed.feedUnavailable}
                        </Text>
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
                        placeholderTextColor="#6B8AA0"
                      />
                      <TouchableOpacity
                        style={styles.removeAllocationButton}
                        onPress={() => setFeedAllocations((current) => current.filter((item) => item.inventoryFeedId !== allocation.inventoryFeedId))}
                        accessibilityRole="button"
                        accessibilityLabel={t.feed.removeFeed}
                      >
                        <Ionicons name="close" size={18} color="#E74C3C" />
                      </TouchableOpacity>
                    </View>
                  );
                })}

                {inventoryFeeds.some((feed) => !feedAllocations.some((allocation) => allocation.inventoryFeedId === feed.id)) && (
                  <>
                    <Text style={styles.addFeedLabel}>{t.feed.addFeedType}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.feedSelector}>
                      {inventoryFeeds
                        .filter((feed) => !feedAllocations.some((allocation) => allocation.inventoryFeedId === feed.id))
                        .map((feed) => (
                          <TouchableOpacity
                            key={feed.id}
                            style={styles.feedOption}
                            onPress={() => setFeedAllocations((current) => [
                              ...current,
                              { inventoryFeedId: feed.id, quantityKg: '' },
                            ])}
                          >
                            <Text style={styles.feedOptionText}>
                              + {feed.feedName} ({feed.totalStock} {feed.unit || 'kg'})
                            </Text>
                          </TouchableOpacity>
                        ))}
                    </ScrollView>
                  </>
                )}

                <View style={styles.totalField}>
                  <Text style={styles.inputLabel}>{t.feed.calculatedTotal}</Text>
                  <Text style={styles.totalValue}>{allocationTotal.toFixed(2)} kg</Text>
                </View>

                <View style={styles.feedingResponseField}>
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
                  <TouchableOpacity style={styles.cancelButton} onPress={closeEditor}>
                    <Text style={styles.cancelButtonText}>{t.actions.cancel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.updateButton, isSubmitting && styles.disabledButton]}
                    onPress={handleUpdate}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.updateButtonText}>{t.feedHistory.updateFeed}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={Boolean(deletingRecord)}
          animationType="fade"
          transparent
          onRequestClose={() => !isDeleting && setDeletingRecord(null)}
        >
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmCard}>
              <View style={styles.confirmIcon}>
                <Ionicons name="trash-outline" size={26} color="#E74C3C" />
              </View>
              <Text style={styles.confirmTitle}>{t.feedHistory.deleteTitle}</Text>
              <Text style={styles.confirmMessage}>{deleteMessage}</Text>
              <View style={styles.inventoryRestoreNote}>
                <Ionicons name="return-down-back-outline" size={18} color="#0F4C75" />
                <Text style={styles.inventoryRestoreText}>
                  {deletionHasMissingInventory
                    ? t.feedHistory.deleteMissingInventoryNote
                    : t.feedHistory.deleteInventoryNote}
                </Text>
              </View>
              <View style={styles.confirmActions}>
                <TouchableOpacity
                  style={styles.confirmCancelButton}
                  onPress={() => setDeletingRecord(null)}
                  disabled={isDeleting}
                >
                  <Text style={styles.confirmCancelText}>{t.actions.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmDeleteButton, isDeleting && styles.disabledButton]}
                  onPress={handleDelete}
                  disabled={isDeleting}
                >
                  <Text style={styles.confirmDeleteText}>
                    {isDeleting ? t.feedHistory.deleting : t.feedHistory.confirmDelete}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </GestureHandlerRootView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8fc' },
  editHint: { marginHorizontal: 20, marginTop: 16, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#BBE1FA', backgroundColor: '#EAF4FB', flexDirection: 'row', alignItems: 'center', gap: 9 },
  editHintText: { flex: 1, color: '#0F4C75', fontSize: 13, fontWeight: '600', lineHeight: 18 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: Platform.OS === 'android' ? 60 : 80 },
  emptyTitle: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 22 : 24, fontWeight: 'bold', marginTop: Platform.OS === 'android' ? 16 : 20 },
  emptySubtitle: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 15 : 16, marginTop: 8, textAlign: 'center', lineHeight: Platform.OS === 'android' ? 20 : 22 },
  historyCard: { flexShrink: 1, margin: Platform.OS === 'android' ? 16 : 20, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#DCE8F2', overflow: 'hidden' },
  historyRow: { minHeight: 58, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  swipeDeleteButton: { width: 96, backgroundColor: '#E74C3C', alignItems: 'center', justifyContent: 'center', gap: 3 },
  swipeDeleteText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  separator: { height: 1, backgroundColor: '#EEF3F6', marginHorizontal: 16 },
  dateText: { color: '#334E68', fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '600', flexShrink: 1 },
  feedAmount: { color: '#0F4C75', fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: '800' },
  feedAmountContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(15, 76, 117, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxHeight: '86%', borderRadius: 20, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  modalHeader: { padding: 22, borderBottomWidth: 1, borderBottomColor: '#DCE8F2', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 },
  modalHeaderText: { flex: 1 },
  modalTitle: { color: '#0D2137', fontSize: 22, fontWeight: '800' },
  modalSubtitle: { color: '#6B8AA0', fontSize: 13, lineHeight: 18, marginTop: 5 },
  closeButton: { padding: 4 },
  modalScrollView: { padding: 22 },
  readOnlyField: { marginBottom: 20 },
  inputLabel: { color: '#0D2137', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  readOnlyValue: { padding: 14, borderRadius: 12, backgroundColor: '#EDF3F8', color: '#334E68', fontSize: 15, fontWeight: '700' },
  inputHint: { color: '#6B8AA0', fontSize: 12, lineHeight: 17, marginBottom: 10 },
  feedWarning: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, marginBottom: 12, borderRadius: 12, borderWidth: 1, borderColor: '#F6C453', backgroundColor: '#FFF8E6' },
  feedWarningText: { flex: 1, color: '#92400E', fontSize: 12, lineHeight: 17, fontWeight: '600' },
  allocationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E8F2F9' },
  allocationNameContainer: { flex: 1, minWidth: 0 },
  allocationName: { color: '#0D2137', fontSize: 14, fontWeight: '600' },
  allocationStock: { color: '#6B8AA0', fontSize: 11, marginTop: 2 },
  allocationInput: { width: 92, borderWidth: 1, borderColor: '#D9E8F2', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, color: '#0D2137', backgroundColor: '#F4F8FC', fontSize: 13 },
  removeAllocationButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  addFeedLabel: { color: '#315F57', fontSize: 12, fontWeight: '600', marginTop: 12, marginBottom: 8 },
  feedSelector: { maxHeight: 50 },
  feedOption: { paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#DCE8F2' },
  feedOptionText: { color: '#0D2137', fontSize: 13, fontWeight: '600' },
  totalField: { marginTop: 22 },
  totalValue: { padding: 14, borderRadius: 12, backgroundColor: '#EDF3F8', color: '#0F4C75', fontSize: 16, fontWeight: '800' },
  feedingResponseField: { marginTop: 20 },
  feedingResponseOptions: { flexDirection: 'row', gap: 8 },
  feedingResponseOption: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#D9E8F2', backgroundColor: '#FFFFFF' },
  feedingResponseOptionSelected: { borderColor: '#0F4C75', backgroundColor: '#0F4C75' },
  feedingResponseOptionText: { color: '#0F4C75', fontSize: 13, fontWeight: '700' },
  feedingResponseOptionTextSelected: { color: '#FFFFFF' },
  buttonContainer: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 24 },
  cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E74C3C', alignItems: 'center' },
  cancelButtonText: { color: '#E74C3C', fontSize: 15, fontWeight: '700' },
  updateButton: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#0F4C75', alignItems: 'center' },
  updateButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  disabledButton: { opacity: 0.6 },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  confirmCard: { width: '100%', maxWidth: 420, padding: 24, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center' },
  confirmIcon: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FDECEC', marginBottom: 14 },
  confirmTitle: { color: '#0D2137', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  confirmMessage: { color: '#526D82', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 9 },
  inventoryRestoreNote: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 9, padding: 12, marginTop: 18, borderRadius: 12, backgroundColor: '#EAF4FB' },
  inventoryRestoreText: { flex: 1, color: '#0F4C75', fontSize: 13, lineHeight: 18, fontWeight: '700' },
  confirmActions: { width: '100%', flexDirection: 'row', gap: 10, marginTop: 22 },
  confirmCancelButton: { flex: 1, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: '#DCE8F2', alignItems: 'center', justifyContent: 'center' },
  confirmCancelText: { color: '#334E68', fontSize: 14, fontWeight: '800' },
  confirmDeleteButton: { flex: 1.4, minHeight: 48, paddingHorizontal: 10, borderRadius: 12, backgroundColor: '#E74C3C', alignItems: 'center', justifyContent: 'center' },
  confirmDeleteText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', textAlign: 'center' },
});
