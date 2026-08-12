"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  History,
  Search,
  Activity,
  ShoppingBag,
  X,
  Loader2,
  Waves,
  ChevronRight,
  ArrowRight,
  ClipboardList,
  TriangleAlert,
  Trash2
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  serverTimestamp,
  runTransaction,
  arrayUnion,
  Timestamp
} from 'firebase/firestore';
import type { DocumentData, DocumentSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  DAILY_FEED_USAGE_SOURCE,
  buildDailyFeedRecordId,
  getDailyFeedUsageTotal,
  isDailyFeedUsage,
  normalizeFeedAllocations,
  sumFeedAllocations,
  type FeedAllocation,
} from '../../../../../shared/feedInventoryUsage';
import { useFarmDateKey } from '@/hooks/useFarmDateKey';
import { EnterpriseGroupedPondGrid } from '@/components/EnterpriseDashboard';
import { useCompanyBlocks } from '@/hooks/useDashboardData';
import {
  filterEnterpriseRecordsForUser,
  isEnterpriseOwner,
  type FarmBlock,
} from '../../../../../shared/enterpriseBlocks';
import { normalizeFarmDateKey } from '../../../../../shared/farmDate';

/* --- Types --------------------------------------------------- */
interface FeedData {
  totalDailyFeed: string;
  inventoryFeedId?: string | null;
  feedAllocations?: FeedAllocation[];
  cycleId?: string;
  cycleName?: string;
  pondCycleId?: string;
}

interface FeedAllocationInput {
  inventoryFeedId: string;
  quantityKg: string;
}

interface FeedFormData extends Omit<FeedData, 'feedAllocations'> {
  pondId: string;
  date: string;
  feedAllocations: FeedAllocationInput[];
}

interface Sampling {
  id: string; date: string; cycleId?: string; cycleName?: string; pondCycleId?: string; feedData?: FeedData;
  isBaselineEstimate?: boolean;
  source?: string;
}

type FeedHistoryEntry = Sampling & { feedData: FeedData };

interface Pond {
  id: string; pondName: string; samplings: Sampling[];
  blockId?: string;
  blockName?: string;
  cycleId?: string;
  cycleName?: string;
  pondCycleId?: string;
  cycleStatus?: 'active' | 'ended';
  docStart?: string;
  cycleStartedAt?: string;
  createdAt?: { toDate?: () => Date; seconds?: number };
  updatedAt?: { toDate?: () => Date; seconds?: number };
}

interface FeedUsage {
  id?: string;
  date?: string;
  quantity?: number | string;
  unitPrice?: number | string;
  totalCost?: number | string;
  pondId?: string;
  notes?: string;
  source?: string;
  feedRecordId?: string;
}

interface InventoryFeed {
  id: string;
  feedName?: string;
  brand?: string;
  unit?: string;
  totalStock?: number;
  totalCost?: number;
  usageHistory?: FeedUsage[];
}

const getTimestampDate = (value?: { toDate?: () => Date; seconds?: number } | string | Date | null): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === 'object' && typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'object' && typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  return null;
};

const formatSyncStatus = (date: Date | null): string => {
  if (!date) return 'Sync status unavailable';
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return 'Last synced today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Last synced yesterday';
  return `Last synced ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)}`;
};

const isBaselineSampling = (sampling: Pick<Sampling, 'isBaselineEstimate' | 'source'>): boolean =>
  Boolean(sampling.isBaselineEstimate) || sampling.source === 'midcycle_onboarding';
const canEditOperations = (role?: string) => role === 'owner' || role === 'co-owner' || role === 'technician';

export default function FeedRecordsPage() {
  const { t } = useLanguage();
  const { company } = useAuth();
  const today = useFarmDateKey(company?.timeZone);
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ uid: string; role?: string } | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedPondIdForHistory, setSelectedPondIdForHistory] = useState<string | null>(null);
  const [editingFeedRecord, setEditingFeedRecord] = useState<{ pondId: string; date: string; id: string } | null>(null);
  const [deletingFeedRecord, setDeletingFeedRecord] = useState<FeedHistoryEntry | null>(null);
  const [revealedFeedRecordId, setRevealedFeedRecordId] = useState<string | null>(null);
  const [isDeletingFeedRecord, setIsDeletingFeedRecord] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [inventoryFeeds, setInventoryFeeds] = useState<InventoryFeed[]>([]);
  const historyTouchStartXRef = useRef<number | null>(null);
  const suppressHistoryClickRef = useRef(false);

  // Form State
  const [formData, setFormData] = useState<FeedFormData>({
    pondId: '',
    date: today,
    totalDailyFeed: '',
    feedAllocations: [],
  });
  const canEditFeed = canEditOperations(user?.role);
  const enterpriseOwnerView = isEnterpriseOwner(company?.businessSize, user?.role);
  const { data: farmBlocks } = useCompanyBlocks<FarmBlock>('asc');
  const accessiblePonds = useMemo(() => filterEnterpriseRecordsForUser(ponds, {
    businessSize: company?.businessSize,
    role: user?.role,
    userId: user?.uid,
    blocks: farmBlocks,
  }), [company?.businessSize, farmBlocks, ponds, user?.role, user?.uid]);
  const selectedFormPond = useMemo(
    () => accessiblePonds.find((pond) => pond.id === formData.pondId),
    [accessiblePonds, formData.pondId],
  );
  const selectedPondStartDate = normalizeFarmDateKey(
    selectedFormPond?.cycleStartedAt || selectedFormPond?.docStart,
    company?.timeZone,
  );
  const minimumFeedDate = selectedPondStartDate && selectedPondStartDate <= today
    ? selectedPondStartDate
    : today;

  useEffect(() => {
    let unsubUser: (() => void) | null = null;
    let unsubPonds: (() => void) | null = null;
    let unsubFeeds: (() => void) | null = null;
    let currentCompanyId: string | null = null;

    const cleanCompanyListeners = () => {
      if (unsubPonds) unsubPonds();
      if (unsubFeeds) unsubFeeds();
      unsubPonds = null;
      unsubFeeds = null;
    };

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubUser) unsubUser();
      cleanCompanyListeners();
      unsubUser = null;
      currentCompanyId = null;

      if (firebaseUser) {
        unsubUser = onSnapshot(doc(db, 'users', firebaseUser.uid), (uDoc) => {
          const userData = uDoc.data();
          setUser({
            uid: firebaseUser.uid,
            role: typeof userData?.role === 'string' ? userData.role : undefined,
          });
          const cid = userData?.companyId;
          setCompanyId(cid);
          if (cid && cid !== currentCompanyId) {
            cleanCompanyListeners();
            currentCompanyId = cid;
            const q = query(collection(db, 'companies', cid, 'ponds'), orderBy('createdAt', 'desc'));
            unsubPonds = onSnapshot(q, (snapshot) => {
              const data = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Pond))
                .filter(pond => pond.cycleStatus !== 'ended');
              setPonds(data);
              setLoading(false);
            });

            // Fetch Inventory Feeds
            const qFeeds = query(collection(db, 'companies', cid, 'feeds'), orderBy('feedName', 'asc'));
            unsubFeeds = onSnapshot(qFeeds, (snapshot) => {
              setInventoryFeeds(snapshot.docs.map((feedDoc) => ({ id: feedDoc.id, ...feedDoc.data() } as InventoryFeed)));
            });
          } else {
            if (!cid) {
              cleanCompanyListeners();
              currentCompanyId = null;
              setPonds([]);
              setInventoryFeeds([]);
              setLoading(false);
            }
          }
        });
      } else {
        setUser(null);
        setCompanyId(null);
        setPonds([]);
        setInventoryFeeds([]);
        setLoading(false);
      }
    });
    return () => {
      unsubAuth();
      if (unsubUser) unsubUser();
      cleanCompanyListeners();
    };
  }, []);

  // -- Sync form data with existing records when pond/date changes ----
  useEffect(() => {
    if (!isModalOpen || !formData.pondId || !formData.date) return;

    const pond = accessiblePonds.find(p => p.id === formData.pondId);
    const existing = pond?.samplings?.find(s => (
      !isBaselineSampling(s) &&
      s.feedData &&
      (editingFeedRecord ? s.id === editingFeedRecord.id : s.date === formData.date)
    ));

    if (existing?.feedData) {
      // Data exists for this day, pre-fill the form
      const data = existing.feedData;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData(prev => ({
        ...prev,
        ...data,
        inventoryFeedId: undefined,
        feedAllocations: normalizeFeedAllocations(data).map((allocation) => ({
          inventoryFeedId: allocation.inventoryFeedId,
          quantityKg: String(allocation.quantityKg),
        })),
        pondId: prev.pondId, // Ensure these aren't lost
        date: prev.date
      }));
    } else {
      // No data for this day, reset but keep context
      setFormData(prev => ({
        pondId: prev.pondId,
        date: prev.date,
        totalDailyFeed: '',
        feedAllocations: [],
      }));
    }
  }, [accessiblePonds, editingFeedRecord, formData.pondId, formData.date, isModalOpen]);

  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !formData.pondId) return;
    if (!canEditFeed) return;
    if (!accessiblePonds.some((pond) => pond.id === formData.pondId)) return;
    const allocationInputs = formData.feedAllocations.map((allocation) => ({
      inventoryFeedId: allocation.inventoryFeedId,
      quantityKg: Number(allocation.quantityKg),
    }));
    if (allocationInputs.length === 0) {
      alert(inventoryFeeds.length === 0 ? t.feed.noFeedsAvailable : t.feed.selectFeedFirst);
      return;
    }
    if (allocationInputs.some((allocation) => !inventoryFeeds.some((feed) => feed.id === allocation.inventoryFeedId))) {
      alert(t.feed.inventoryNotFound);
      return;
    }
    if (allocationInputs.some((allocation) => (
      !allocation.inventoryFeedId || !Number.isFinite(allocation.quantityKg) || allocation.quantityKg <= 0
    ))) {
      alert(t.feed.invalidAllocation);
      return;
    }
    const requestedAllocations = normalizeFeedAllocations({ feedAllocations: allocationInputs });
    const feedAmount = sumFeedAllocations(requestedAllocations);
    if (!Number.isFinite(feedAmount) || feedAmount <= 0) {
      alert(t.feed.invalidAmount);
      return;
    }

    try {
      const pondRef = doc(db, 'companies', companyId, 'ponds', formData.pondId);
      await runTransaction(db, async (transaction) => {
        const pondDoc = await transaction.get(pondRef);
        if (!pondDoc.exists()) throw new Error('Pond record not found');

        const pondData = pondDoc.data();
        const samplings = [...(pondData.samplings || [])];
        const existingIndex = samplings.findIndex(s => (
          !isBaselineSampling(s) &&
          s.feedData &&
          (editingFeedRecord ? s.id === editingFeedRecord.id : s.date === formData.date)
        ));
        const existingFeedData = existingIndex >= 0 ? samplings[existingIndex]?.feedData : undefined;
        const previousAllocations = normalizeFeedAllocations(existingFeedData);
        const desiredByFeedId = new Map(requestedAllocations.map((allocation) => (
          [allocation.inventoryFeedId, allocation.quantityKg]
        )));
        const feedRecordId = buildDailyFeedRecordId(formData.pondId, formData.date);

        const feedData = {
          totalDailyFeed: feedAmount.toFixed(2),
          inventoryFeedId: requestedAllocations.length === 1 ? requestedAllocations[0].inventoryFeedId : null,
          feedAllocations: requestedAllocations,
          cycleId: pondData.cycleId,
          cycleName: pondData.cycleName,
          pondCycleId: pondData.pondCycleId || formData.pondId,
        };

        if (existingIndex >= 0) {
          samplings[existingIndex] = {
            ...samplings[existingIndex],
            cycleId: pondData.cycleId,
            cycleName: pondData.cycleName,
            pondCycleId: pondData.pondCycleId || formData.pondId,
            feedData: { ...(samplings[existingIndex].feedData || {}), ...feedData }
          };
        } else {
          samplings.push({
            id: `feed-${Date.now()}`,
            date: formData.date,
            mbw: 0, mortality: 0, feed: 0,
            cycleId: pondData.cycleId,
            cycleName: pondData.cycleName,
            pondCycleId: pondData.pondCycleId || formData.pondId,
            feedData
          });
        }

        const feedIds = Array.from(new Set([
          ...previousAllocations.map((allocation) => allocation.inventoryFeedId),
          ...requestedAllocations.map((allocation) => allocation.inventoryFeedId),
        ]));
        const feedSnapshots = new Map<string, DocumentSnapshot<DocumentData>>();
        for (const feedId of feedIds) {
          const feedRef = doc(db, 'companies', companyId, 'feeds', feedId);
          feedSnapshots.set(feedId, await transaction.get(feedRef));
        }

        const getFeedScreenUsageTotal = (feedId: string) => {
          const feedDoc = feedSnapshots.get(feedId);
          if (!feedDoc?.exists()) return 0;
          const data = feedDoc.data() as InventoryFeed;
          return getDailyFeedUsageTotal(data.usageHistory, formData.pondId, formData.date);
        };

        const adjustFeedUsage = (feedId: string, quantityDelta: number) => {
          if (!feedId || !Number.isFinite(quantityDelta) || Math.abs(quantityDelta) < 0.000001) return;

          const feedRef = doc(db, 'companies', companyId, 'feeds', feedId);
          const feedDoc = feedSnapshots.get(feedId);
          if (!feedDoc?.exists()) {
            throw new Error('Selected feed inventory item was not found.');
          }

          const currentFeedData = feedDoc.data() as InventoryFeed;
          const currentStock = Number(currentFeedData.totalStock) || 0;
          const currentCost = Number(currentFeedData.totalCost) || 0;
          if (quantityDelta > 0 && quantityDelta > currentStock) {
            throw new Error('Insufficient stock');
          }

          const matchingUsage = (currentFeedData.usageHistory || [])
            .filter((usage) => isDailyFeedUsage(usage, formData.pondId, formData.date))
            .slice()
            .reverse()
            .find((usage) => Number(usage.unitPrice) > 0 || Number(usage.totalCost) > 0);
          const historicalUnitPrice = matchingUsage
            ? Number(matchingUsage.unitPrice) || (Number(matchingUsage.totalCost) / Number(matchingUsage.quantity))
            : 0;
          const unitPrice = currentStock > 0 ? currentCost / currentStock : historicalUnitPrice;
          if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
            throw new Error('Feed cost is missing. Stock this feed with a price before recording usage.');
          }

          transaction.update(feedRef, {
            totalStock: Math.max(0, currentStock - quantityDelta),
            totalCost: quantityDelta > 0
              ? Math.max(0, currentCost - (quantityDelta * unitPrice))
              : currentCost + (Math.abs(quantityDelta) * unitPrice),
            usageHistory: arrayUnion({
              id: `usage-${formData.pondId}-${formData.date}-${feedId}-${Date.now()}`,
              date: formData.date,
              quantity: quantityDelta,
              unitPrice,
              totalCost: quantityDelta * unitPrice,
              pondId: formData.pondId,
              cycleId: pondData.cycleId,
              cycleName: pondData.cycleName,
              pondCycleId: pondData.pondCycleId || formData.pondId,
              notes: `Daily feed for pond: ${pondData.pondName}`,
              source: DAILY_FEED_USAGE_SOURCE,
              feedRecordId,
              createdAt: Timestamp.now()
            }),
            lastUpdated: serverTimestamp()
          });
        };

        for (const feedId of feedIds) {
          const feedDoc = feedSnapshots.get(feedId);
          if (!feedDoc?.exists()) {
            if (desiredByFeedId.has(feedId)) throw new Error('Selected feed inventory item was not found.');
            continue;
          }
          const alreadyDeducted = getFeedScreenUsageTotal(feedId);
          const desiredAmount = desiredByFeedId.get(feedId) || 0;
          adjustFeedUsage(feedId, desiredAmount - alreadyDeducted);
        }

        transaction.update(pondRef, {
          samplings,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid
        });
      });

        setModalOpen(false);
        setEditingFeedRecord(null);
        setFormData({
          pondId: '',
          date: today,
          totalDailyFeed: '',
          feedAllocations: [],
        });
    } catch (error) {
      console.error('Error adding feed record:', error);
      alert(error instanceof Error ? error.message : 'Failed to update feed record.');
    }
  };

  const filteredPonds = useMemo(() => {
    return accessiblePonds.filter(p => p.pondName.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [accessiblePonds, searchTerm]);

  const todayFeedSummary = useMemo(() => {
    let totalKg = 0;
    let hasLoggedFeed = false;

    accessiblePonds.forEach((pond) => {
      const todayRecord = (pond.samplings || []).find((sampling) => (
        !isBaselineSampling(sampling)
        && sampling.date === today
        && sampling.feedData
      ));
      const amount = Number(todayRecord?.feedData?.totalDailyFeed);
      if (!Number.isFinite(amount) || amount <= 0) return;
      totalKg += amount;
      hasLoggedFeed = true;
    });

    return { totalKg, hasLoggedFeed };
  }, [accessiblePonds, today]);

  const todayFeedSummaryValue = todayFeedSummary.hasLoggedFeed
    ? `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(todayFeedSummary.totalKg)} kg`
    : t.feed.notLoggedYet;

  const selectedPondForHistory = useMemo(
    () => accessiblePonds.find((pond) => pond.id === selectedPondIdForHistory) || null,
    [accessiblePonds, selectedPondIdForHistory],
  );

  const selectedFeedHistory = useMemo<FeedHistoryEntry[]>(() => (
    selectedPondForHistory?.samplings || []
  )
    .filter((sampling): sampling is FeedHistoryEntry => Boolean(sampling.feedData))
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [selectedPondForHistory]);

  const getLatestFeed = (pond: Pond) => {
    const logs = (pond.samplings || [])
      .filter(s => s.feedData)
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return logs[0]?.feedData;
  };

  const formAllocationTotal = sumFeedAllocations(formData.feedAllocations.map((allocation) => ({
    inventoryFeedId: allocation.inventoryFeedId,
    quantityKg: Number(allocation.quantityKg) || 0,
  })));
  const hasUnusedInventoryFeed = inventoryFeeds.some((feed) => (
    !formData.feedAllocations.some((allocation) => allocation.inventoryFeedId === feed.id)
  ));

  const openHistoryEditor = (log: FeedHistoryEntry) => {
    if (!selectedPondForHistory || !canEditFeed) return;
    setEditingFeedRecord({
      pondId: selectedPondForHistory.id,
      date: log.date,
      id: log.id,
    });
    setFormData({
      pondId: selectedPondForHistory.id,
      date: log.date,
      totalDailyFeed: log.feedData.totalDailyFeed,
      feedAllocations: normalizeFeedAllocations(log.feedData).map((allocation) => ({
        inventoryFeedId: allocation.inventoryFeedId,
        quantityKg: String(allocation.quantityKg),
      })),
    });
    setSelectedPondIdForHistory(null);
    setRevealedFeedRecordId(null);
    setModalOpen(true);
  };

  const openHistoryDrawer = (pondId: string) => {
    setRevealedFeedRecordId(null);
    setSelectedPondIdForHistory(pondId);
  };

  const closeHistoryDrawer = () => {
    setRevealedFeedRecordId(null);
    setSelectedPondIdForHistory(null);
  };

  const handleHistoryPointerStart = (event: React.PointerEvent) => {
    historyTouchStartXRef.current = event.clientX;
    suppressHistoryClickRef.current = false;
  };

  const handleHistoryPointerEnd = (recordId: string, event: React.PointerEvent) => {
    const startX = historyTouchStartXRef.current;
    const endX = event.clientX;
    historyTouchStartXRef.current = null;
    if (startX === null) return;

    const distance = endX - startX;
    if (distance < -48) {
      setRevealedFeedRecordId(recordId);
      suppressHistoryClickRef.current = true;
    } else if (distance > 36) {
      setRevealedFeedRecordId(null);
      suppressHistoryClickRef.current = true;
    }
  };

  const handleDeleteFeedRecord = async () => {
    if (!companyId || !user || !selectedPondForHistory || !deletingFeedRecord || !canEditFeed || isDeletingFeedRecord) return;
    if (!accessiblePonds.some((pond) => pond.id === selectedPondForHistory.id)) return;
    setIsDeletingFeedRecord(true);
    let missingInventory = false;

    try {
      const pondRef = doc(db, 'companies', companyId, 'ponds', selectedPondForHistory.id);
      await runTransaction(db, async (transaction) => {
        const pondDoc = await transaction.get(pondRef);
        if (!pondDoc.exists()) return;

        const pondData = pondDoc.data();
        const samplings = Array.isArray(pondData.samplings) ? [...pondData.samplings] : [];
        const samplingIndex = samplings.findIndex((sampling) => (
          sampling.id === deletingFeedRecord.id &&
          sampling.date === deletingFeedRecord.date &&
          Boolean(sampling.feedData)
        ));
        if (samplingIndex < 0) return;

        const feedData = samplings[samplingIndex].feedData as FeedData;
        const allocations = normalizeFeedAllocations(feedData);
        if (allocations.length === 0) {
          throw new Error(t.feedHistory.deleteInventoryMissing);
        }

        const feedSnapshots = new Map<string, DocumentSnapshot<DocumentData>>();
        const matchingInventoryFeedIds = inventoryFeeds
          .filter((feed) => getDailyFeedUsageTotal(
            feed.usageHistory,
            selectedPondForHistory.id,
            deletingFeedRecord.date,
          ) > 0)
          .map((feed) => feed.id);
        const feedIds = Array.from(new Set([
          ...allocations.map((allocation) => allocation.inventoryFeedId),
          ...matchingInventoryFeedIds,
        ]));
        for (const feedId of feedIds) {
          const feedRef = doc(db, 'companies', companyId, 'feeds', feedId);
          feedSnapshots.set(feedId, await transaction.get(feedRef));
        }

        const feedRecordId = buildDailyFeedRecordId(selectedPondForHistory.id, deletingFeedRecord.date);
        const adjustmentTimestamp = Date.now();
        let restoredQuantity = 0;
        for (const feedId of feedIds) {
          const feedDoc = feedSnapshots.get(feedId);
          if (!feedDoc?.exists()) continue;

          const inventoryFeed = feedDoc.data() as InventoryFeed;
          const quantityToRestore = getDailyFeedUsageTotal(
            inventoryFeed.usageHistory,
            selectedPondForHistory.id,
            deletingFeedRecord.date,
          );
          if (!Number.isFinite(quantityToRestore) || quantityToRestore <= 0) continue;
          restoredQuantity += quantityToRestore;

          const matchingUsage = (inventoryFeed.usageHistory || [])
            .filter((usage) => (
              isDailyFeedUsage(usage, selectedPondForHistory.id, deletingFeedRecord.date) &&
              Number(usage.quantity) > 0
            ))
            .slice()
            .reverse()
            .find((usage) => Number(usage.unitPrice) > 0 || Number(usage.totalCost) > 0);
          const historicalUnitPrice = matchingUsage
            ? Number(matchingUsage.unitPrice) || (Number(matchingUsage.totalCost) / Number(matchingUsage.quantity))
            : 0;
          const currentStock = Number(inventoryFeed.totalStock) || 0;
          const currentCost = Number(inventoryFeed.totalCost) || 0;
          const fallbackUnitPrice = currentStock > 0 ? currentCost / currentStock : 0;
          const unitPrice = historicalUnitPrice || fallbackUnitPrice;
          if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
            throw new Error(t.feed.missingFeedCost);
          }

          const feedRef = doc(db, 'companies', companyId, 'feeds', feedId);
          transaction.update(feedRef, {
            usageHistory: arrayUnion({
              id: `${feedRecordId}:${feedId}:deleted:${adjustmentTimestamp}`,
              date: deletingFeedRecord.date,
              quantity: -quantityToRestore,
              unitPrice,
              totalCost: -(quantityToRestore * unitPrice),
              pondId: selectedPondForHistory.id,
              cycleId: feedData.cycleId || pondData.cycleId || null,
              cycleName: feedData.cycleName || pondData.cycleName || null,
              pondCycleId: feedData.pondCycleId || pondData.pondCycleId || selectedPondForHistory.id,
              notes: 'Deleted feed record returned to inventory',
              source: DAILY_FEED_USAGE_SOURCE,
              feedRecordId,
              createdAt: Timestamp.now(),
            }),
            totalStock: currentStock + quantityToRestore,
            totalCost: currentCost + (quantityToRestore * unitPrice),
            lastUpdated: serverTimestamp(),
          });
        }
        missingInventory = restoredQuantity + 0.000001 < sumFeedAllocations(allocations);

        const samplingWithoutFeedData = { ...samplings[samplingIndex] };
        delete samplingWithoutFeedData.feedData;
        samplings[samplingIndex] = samplingWithoutFeedData;
        transaction.update(pondRef, {
          samplings,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        });
      });

      setDeletingFeedRecord(null);
      setRevealedFeedRecordId(null);
      alert(missingInventory
        ? t.feedHistory.deleteSuccessWithoutInventory
        : t.feedHistory.deleteSuccess);
    } catch (error) {
      console.error('Error deleting feed record:', error);
      alert(error instanceof Error ? error.message : t.feedHistory.deleteFailed);
    } finally {
      setIsDeletingFeedRecord(false);
    }
  };

  const closeFeedModal = () => {
    setModalOpen(false);
    setEditingFeedRecord(null);
  };

  const deletionHasMissingInventory = deletingFeedRecord
    ? inventoryFeeds.reduce(
      (total, feed) => total + getDailyFeedUsageTotal(
        feed.usageHistory,
        selectedPondForHistory?.id || '',
        deletingFeedRecord.date,
      ),
      0,
    ) + 0.000001 < sumFeedAllocations(normalizeFeedAllocations(deletingFeedRecord.feedData))
    : false;

  return (
    <div className="dashboard-page-relaxed" style={{ maxWidth: '1200px', margin: '0 auto' }}>

      {/* Toolbar */}
      <div className="glass-card dashboard-toolbar-card animate-fade-up" style={{ flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
          <input
            placeholder={t.feed.searchPonds}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: 'var(--bg-mid)', border: '1px solid var(--border)', borderRadius: '10px',
              height: '44px', padding: '0 16px 0 40px', width: '100%', fontSize: '14px', outline: 'none', fontWeight: 400, color: 'var(--text-primary)'
            }}
          />
        </div>
        {canEditFeed && (
          <button
            onClick={() => {
              setEditingFeedRecord(null);
              setFormData({
                pondId: '',
                date: today,
                totalDailyFeed: '',
                feedAllocations: [],
              });
              setModalOpen(true);
            }}
            className="dashboard-action dashboard-action-primary"
          >
            <Plus size={20} />
            <span>{t.feed.newFeedLog}</span>
          </button>
        )}
        <div
          role="status"
          aria-live="polite"
          style={{
            flexBasis: '100%',
            minHeight: '40px',
            padding: '10px 4px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            borderTop: '1px solid var(--border)',
          }}
        >
          <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>
            {t.feed.dailyFeedUsed}
          </span>
          <strong style={{ color: 'var(--text-primary)', fontSize: '17px', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {todayFeedSummaryValue}
          </strong>
        </div>
      </div>

      {/* Pond Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><Loader2 className="animate-spin" size={40} color="var(--primary)" /></div>
      ) : enterpriseOwnerView ? (
        <EnterpriseGroupedPondGrid
          ponds={filteredPonds}
          emptyMessage={t.feed.noData}
          getTone={(pond) => getLatestFeed(pond as Pond) ? 'stable' : 'neutral'}
          getSubtitle={(pond) => {
            const latest = getLatestFeed(pond as Pond);
            return latest ? `${latest.totalDailyFeed} kg` : undefined;
          }}
          onSelect={(pond) => openHistoryDrawer(pond.id)}
        />
      ) : (
        <div className="responsive-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {filteredPonds.map((pond, idx) => {
            const latest = getLatestFeed(pond);
            return (
              <div key={pond.id} className="glass-card animate-fade-up" style={{ padding: '0', overflow: 'hidden', animationDelay: `${idx * 0.05}s` }}>
                <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-mid)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(15, 76, 117, 0.08)' }}>
                      <ClipboardList size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{pond.pondName}</h3>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{latest ? 'Daily feeding active' : 'No recent logs'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => openHistoryDrawer(pond.id)}
                    style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '8px', color: 'var(--primary)', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                    onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                    onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                  >
                    <History size={20} />
                  </button>
                </div>

                <div style={{ padding: '22px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Daily Total</span>
                    <div style={{ fontSize: '21px', fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      {latest ? latest.totalDailyFeed : '--'} <span style={{ fontSize: '13px', fontWeight: 600 }}>kg</span>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '14px 22px', background: 'var(--bg-mid)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Daily feed record</span>
                  {canEditFeed && (
                    <button
                      onClick={() => {
                        setEditingFeedRecord(null);
                        setFormData({
                          pondId: pond.id,
                          date: today,
                          totalDailyFeed: '',
                          feedAllocations: [],
                        });
                        setModalOpen(true);
                      }}
                      style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'gap 0.2s' }}
                      onMouseOver={(e) => (e.currentTarget.style.gap = '10px')}
                      onMouseOut={(e) => (e.currentTarget.style.gap = '6px')}
                    >
                      Quick Entry <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* -- HISTORY DRAWER ---------------------------------- */}
      {selectedPondForHistory && (
        <div className="responsive-side-drawer-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'flex-end' }}>
          <div className="responsive-side-drawer" role="dialog" aria-modal="true" aria-label={`${selectedPondForHistory.pondName} feed history`} style={{ width: '100%', maxWidth: '580px', background: '#F8FAFC', height: '100dvh', boxShadow: '-14px 0 60px rgba(15, 76, 117, 0.16)', display: 'flex', flexDirection: 'column', animation: 'drawerSlide 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div className="responsive-modal-header" style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(50, 130, 184, 0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <History size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{selectedPondForHistory.pondName}</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, margin: '3px 0 0' }}>{t.feedHistory.title}</p>
                </div>
              </div>
              <button aria-label="Close feed history" onClick={closeHistoryDrawer} style={{ background: 'var(--bg-mid)', border: '1px solid var(--border)', borderRadius: '12px', padding: '9px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 32px' }}>
              {canEditFeed && selectedFeedHistory.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '14px', padding: '12px 14px', borderRadius: '12px', border: '1px solid #BBE1FA', background: '#EAF4FB', color: '#0F4C75', fontSize: '13px', fontWeight: 600 }}>
                  <History size={17} />
                  <span>{t.feedHistory.editHint}</span>
                </div>
              )}
              {selectedFeedHistory.length === 0 && (
                <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ width: '68px', height: '68px', borderRadius: '20px', background: '#EAF3F8', color: '#0F4C75', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                    <ClipboardList size={30} />
                  </div>
                  <div style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 600, marginBottom: '6px' }}>{t.feedHistory.noHistory}</div>
                  <div style={{ maxWidth: '300px', fontSize: '13px', lineHeight: 1.6, fontWeight: 600 }}>{t.feedHistory.noHistorySubtitle}</div>
                </div>
              )}
              {selectedFeedHistory.length > 0 && (
                <div style={{ overflow: 'hidden', borderRadius: '14px', background: '#FFFFFF', border: '1px solid #DCE8F2' }}>
                  {selectedFeedHistory.map((log, i) => {
                    const recordId = log.id || log.date;
                    const isRevealed = revealedFeedRecordId === recordId;
                    return (
                      <div
                        key={recordId}
                        style={{
                          position: 'relative',
                          overflow: 'hidden',
                          borderBottom: i < selectedFeedHistory.length - 1 ? '1px solid #EEF3F6' : 'none',
                        }}
                      >
                        {canEditFeed && (
                          <button
                            type="button"
                            aria-label={`${t.feedHistory.deleteAction}: ${log.date}`}
                            onClick={() => setDeletingFeedRecord(log)}
                            style={{ position: 'absolute', inset: '0 0 0 auto', width: '104px', border: 'none', background: '#E74C3C', color: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            <Trash2 size={19} />
                            {t.feedHistory.deleteAction}
                          </button>
                        )}
                        <div
                          role={canEditFeed ? 'button' : undefined}
                          tabIndex={canEditFeed ? 0 : undefined}
                          aria-label={canEditFeed ? `${t.feedHistory.editTitle}: ${log.date}, ${log.feedData.totalDailyFeed} kg` : undefined}
                          onPointerDown={canEditFeed ? handleHistoryPointerStart : undefined}
                          onPointerUp={canEditFeed ? (event) => handleHistoryPointerEnd(recordId, event) : undefined}
                          onPointerCancel={() => {
                            historyTouchStartXRef.current = null;
                          }}
                          onClick={() => {
                            if (suppressHistoryClickRef.current) {
                              suppressHistoryClickRef.current = false;
                              return;
                            }
                            openHistoryEditor(log);
                          }}
                          onKeyDown={(event) => {
                            if (canEditFeed && (event.key === 'Enter' || event.key === ' ')) {
                              event.preventDefault();
                              openHistoryEditor(log);
                            }
                          }}
                          style={{ position: 'relative', zIndex: 1, width: '100%', minHeight: '58px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', background: '#FFFFFF', cursor: canEditFeed ? 'pointer' : 'default', textAlign: 'left', transform: isRevealed ? 'translateX(-104px)' : 'translateX(0)', transition: 'transform 180ms ease' }}
                        >
                          <span style={{ color: '#334E68', fontSize: '14px', fontWeight: 600 }}>
                            {new Date(log.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0F4C75', fontSize: '16px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {log.feedData.totalDailyFeed} kg
                            {canEditFeed && (
                              <button
                                type="button"
                                className="feed-history-desktop-delete"
                                aria-label={`${t.feedHistory.deleteAction}: ${log.date}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setDeletingFeedRecord(log);
                                }}
                                onKeyDown={(event) => event.stopPropagation()}
                              >
                                <Trash2 size={17} />
                              </button>
                            )}
                            {canEditFeed && <ChevronRight size={18} color="#6B8AA0" />}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {deletingFeedRecord && selectedPondForHistory && (
        <div className="responsive-modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="delete-feed-title" className="glass-card animate-fade-up responsive-modal" style={{ width: '100%', maxWidth: '460px', padding: '28px', background: '#FFFFFF', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', margin: '0 auto 14px', borderRadius: '50%', background: '#FDECEC', color: '#E74C3C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={25} />
            </div>
            <h2 id="delete-feed-title" style={{ margin: 0, color: 'var(--text-primary)', fontSize: '21px', fontWeight: 600 }}>{t.feedHistory.deleteTitle}</h2>
            <p style={{ margin: '10px 0 0', color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.6, fontWeight: 600 }}>
              {t.feedHistory.deleteMessage
                .replace('{amount}', String(deletingFeedRecord.feedData.totalDailyFeed))
                .replace('{date}', new Date(deletingFeedRecord.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }))}
            </p>
            <div style={{ marginTop: '18px', padding: '12px 14px', borderRadius: '12px', background: '#EAF4FB', color: '#0F4C75', fontSize: '13px', lineHeight: 1.5, fontWeight: 600 }}>
              {deletionHasMissingInventory
                ? t.feedHistory.deleteMissingInventoryNote
                : t.feedHistory.deleteInventoryNote}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={() => setDeletingFeedRecord(null)}
                disabled={isDeletingFeedRecord}
                style={{ flex: 1, minHeight: '48px', borderRadius: '12px', border: '1px solid var(--border)', background: '#FFFFFF', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
              >
                {t.actions.cancel}
              </button>
              <button
                type="button"
                onClick={handleDeleteFeedRecord}
                disabled={isDeletingFeedRecord}
                style={{ flex: 1.4, minHeight: '48px', padding: '0 12px', borderRadius: '12px', border: 'none', background: '#E74C3C', color: '#FFFFFF', fontWeight: 600, cursor: isDeletingFeedRecord ? 'wait' : 'pointer', opacity: isDeletingFeedRecord ? 0.65 : 1 }}
              >
                {isDeletingFeedRecord ? t.feedHistory.deleting : t.feedHistory.confirmDelete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -- LOG MODAL -------------------------------------- */}
      {isModalOpen && (
        <div className="responsive-modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="glass-card animate-fade-up responsive-modal" style={{ width: '100%', maxWidth: '640px', maxHeight: 'calc(100dvh - 48px)', background: '#FFFFFF', padding: '0', overflow: 'hidden', boxShadow: '0 20px 50px rgba(15, 76, 117, 0.2)' }}>
            <div className="responsive-modal-header" style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-mid)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(15, 76, 117, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', border: '1px solid var(--border)' }}>
                  <Plus size={28} />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', lineHeight: '26px', fontWeight: 600 }}>{editingFeedRecord ? t.feedHistory.editTitle : t.feed.addFeedData}</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '18px', fontWeight: 400 }}>
                    {editingFeedRecord ? t.feedHistory.editSubtitle : t.feed.feedMixHint}
                  </p>
                </div>
              </div>
              <button onClick={closeFeedModal} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>

            <form className="responsive-modal-body" onSubmit={handleAddFeed} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', maxHeight: 'calc(100dvh - 145px)', overflowY: 'auto' }}>
              <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Select Pond</label>
                  <select
                    required
                    disabled={Boolean(editingFeedRecord)}
                    value={formData.pondId}
                    onChange={e => {
                      const pondId = e.target.value;
                      const pond = accessiblePonds.find((item) => item.id === pondId);
                      const pondStartDate = normalizeFarmDateKey(
                        pond?.cycleStartedAt || pond?.docStart,
                        company?.timeZone,
                      );
                      setFormData((current) => ({
                        ...current,
                        pondId,
                        date: pondStartDate && current.date < pondStartDate ? today : current.date,
                      }));
                    }}
                    style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: editingFeedRecord ? '#edf3f8' : 'var(--bg-mid)', outline: 'none', fontWeight: 600, color: 'var(--text-primary)' }}
                  >
                    <option value="">Choose a pond...</option>
                    {accessiblePonds.map(p => <option key={p.id} value={p.id}>{p.pondName}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{t.forms.date}</label>
                  <input
                    type="date"
                    required
                    disabled={Boolean(editingFeedRecord) || !formData.pondId}
                    min={minimumFeedDate}
                    max={today}
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: editingFeedRecord || !formData.pondId ? '#edf3f8' : 'var(--bg-mid)', fontWeight: 600, color: 'var(--text-primary)' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{t.feed.feedMix}</label>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>{t.feed.feedMixHint}</p>
                  {formData.feedAllocations.length === 0 && (
                    <div role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px', borderRadius: '12px', border: '1px solid #f6c453', background: '#fff8e6', color: '#92400e' }}>
                      <TriangleAlert size={20} style={{ flexShrink: 0 }} />
                      <div>
                        <strong style={{ display: 'block', fontSize: '13px', marginBottom: '2px' }}>{t.feed.inventoryRequired}</strong>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>{inventoryFeeds.length === 0 ? t.feed.noFeedsAvailable : t.feed.selectFeedFirst}</span>
                      </div>
                    </div>
                  )}
                  {formData.feedAllocations.map((allocation, index) => (
                    <div key={allocation.inventoryFeedId} className="responsive-allocation-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 140px 40px', gap: '10px', alignItems: 'center' }}>
                      <select
                        value={allocation.inventoryFeedId}
                        onChange={e => setFormData((current) => ({
                          ...current,
                          feedAllocations: current.feedAllocations.map((item, itemIndex) => (
                            itemIndex === index ? { ...item, inventoryFeedId: e.target.value } : item
                          )),
                        }))}
                        style={{ minWidth: 0, padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none', fontWeight: 600, color: 'var(--text-primary)' }}
                      >
                        {!inventoryFeeds.some((feed) => feed.id === allocation.inventoryFeedId) && (
                          <option value={allocation.inventoryFeedId}>{t.feed.feedUnavailable}</option>
                        )}
                        {inventoryFeeds
                          .filter((feed) => feed.id === allocation.inventoryFeedId || !formData.feedAllocations.some((item) => item.inventoryFeedId === feed.id))
                          .map((feed) => (
                            <option key={feed.id} value={feed.id}>{feed.feedName || feed.brand || 'Feed'} — {feed.totalStock || 0} {feed.unit || 'kg'}</option>
                          ))}
                      </select>
                      <input
                        required
                        min="0.1"
                        type="number"
                        step="0.1"
                        aria-label={t.feed.feedAmountKg}
                        placeholder={t.feed.feedAmountKg}
                        value={allocation.quantityKg}
                        onChange={e => setFormData((current) => ({
                          ...current,
                          feedAllocations: current.feedAllocations.map((item, itemIndex) => (
                            itemIndex === index ? { ...item, quantityKg: e.target.value } : item
                          )),
                        }))}
                        style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 600, color: 'var(--primary)' }}
                      />
                      <button
                        type="button"
                        aria-label={t.feed.removeFeed}
                        onClick={() => setFormData((current) => ({
                          ...current,
                          feedAllocations: current.feedAllocations.filter((_, itemIndex) => itemIndex !== index),
                        }))}
                        style={{ width: '40px', height: '40px', borderRadius: '10px', border: '1px solid var(--border)', background: 'white', color: '#e74c3c', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    disabled={!hasUnusedInventoryFeed}
                    onClick={() => {
                      const nextFeed = inventoryFeeds.find((feed) => !formData.feedAllocations.some((allocation) => allocation.inventoryFeedId === feed.id));
                      if (!nextFeed) return;
                      setFormData((current) => ({
                        ...current,
                        feedAllocations: [...current.feedAllocations, { inventoryFeedId: nextFeed.id, quantityKg: '' }],
                      }));
                    }}
                    style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'white', color: 'var(--primary)', fontWeight: 600, cursor: hasUnusedInventoryFeed ? 'pointer' : 'not-allowed', opacity: hasUnusedInventoryFeed ? 1 : 0.5 }}
                  >
                    + {t.feed.addFeedType}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{t.feed.calculatedTotal}</label>
                  <input
                    readOnly
                    type="number"
                    step="0.1"
                    value={formAllocationTotal.toFixed(2)}
                    style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: '#edf3f8', fontWeight: 600, color: 'var(--primary)' }}
                  />
                </div>

              </div>

              <div style={{ position: 'sticky', bottom: '-24px', margin: '0 -24px -24px', padding: '20px 24px 24px', display: 'flex', gap: '12px', borderTop: '1px solid var(--border)', background: '#FFFFFF' }}>
                <button type="button" onClick={closeFeedModal} style={{ flex: 1, height: '44px', padding: '0 16px', borderRadius: '10px', border: '1px solid var(--border)', background: 'white', fontWeight: 500, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg-mid)')} onMouseOut={(e) => (e.currentTarget.style.background = 'white')}>{t.actions.cancel}</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, height: '44px', padding: '0 16px', borderRadius: '10px', fontWeight: 500, fontSize: '14px' }}>{editingFeedRecord ? t.feedHistory.updateFeed : t.feed.saveFeedData}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes drawerSlide {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .feed-history-desktop-delete {
          width: 34px;
          height: 34px;
          border: 1px solid #f5c2c0;
          border-radius: 9px;
          background: #fff5f5;
          color: #e74c3c;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        @media (max-width: 768px) {
          .feed-history-desktop-delete {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
