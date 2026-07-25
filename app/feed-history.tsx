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
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { usePondStore, FeedData, Pond, Sampling } from './store/pondStore';
import { Feed, useFeedAdditiveStore } from './store/feedAdditiveStore';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
  DAILY_FEED_ERROR_CODES,
  normalizeFeedAllocations,
  sumFeedAllocations,
} from '../shared/feedInventoryUsage';
import { filterEnterpriseRecordsForUser } from '../shared/enterpriseBlocks';
import { useEnterpriseBlocks } from './hooks/useEnterpriseBlocks';

type FeedHistoryRecord = FeedData & { date: string; id: string };
type FeedAllocationInput = { inventoryFeedId: string; quantityKg: string };

export default function FeedHistoryScreen() {
  const { pondId, pondName } = useLocalSearchParams();
  const { ponds, updateSampling } = usePondStore();
  const { user, company } = useAuth();
  const { setCurrentCompanyId, reconcileDailyFeedAllocations } = useFeedAdditiveStore();
  const { t } = useLanguage();
  const [inventoryFeeds, setInventoryFeeds] = useState<Feed[]>([]);
  const [editingRecord, setEditingRecord] = useState<FeedHistoryRecord | null>(null);
  const [feedAllocations, setFeedAllocations] = useState<FeedAllocationInput[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const canEditFeed = user?.role === 'technician' || user?.role === 'owner' || user?.role === 'co-owner';

  useEffect(() => {
    if (!user?.companyId) {
      setCurrentCompanyId(null, company?.timeZone);
      setInventoryFeeds([]);
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
    submitLockRef.current = false;
    setIsSubmitting(false);
  };

  const closeEditor = () => {
    setEditingRecord(null);
    setFeedAllocations([]);
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
      <View style={styles.container}>
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
              renderItem={({ item: record }) => (
                <TouchableOpacity
                  style={styles.historyRow}
                  onPress={() => openEditor(record)}
                  disabled={!canEditFeed}
                  accessibilityRole={canEditFeed ? 'button' : undefined}
                  accessibilityLabel={canEditFeed ? `${formatDate(record.date)}, ${record.totalDailyFeed} kg, ${t.feedHistory.editTitle}` : undefined}
                >
                  <Text style={styles.dateText}>{formatDate(record.date)}</Text>
                  <View style={styles.feedAmountContainer}>
                    <Text style={styles.feedAmount}>{record.totalDailyFeed} kg</Text>
                    {canEditFeed && <Ionicons name="chevron-forward" size={18} color="#6B8AA0" />}
                  </View>
                </TouchableOpacity>
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
      </View>
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
  buttonContainer: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 24 },
  cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E74C3C', alignItems: 'center' },
  cancelButtonText: { color: '#E74C3C', fontSize: 15, fontWeight: '700' },
  updateButton: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#0F4C75', alignItems: 'center' },
  updateButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  disabledButton: { opacity: 0.6 },
});
