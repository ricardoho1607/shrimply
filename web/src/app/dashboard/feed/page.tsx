"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
  TriangleAlert
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
  const [searchTerm, setSearchTerm] = useState('');
  const [inventoryFeeds, setInventoryFeeds] = useState<InventoryFeed[]>([]);

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
    const existing = pond?.samplings?.find(s => !isBaselineSampling(s) && s.feedData && s.date === formData.date);

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
  }, [accessiblePonds, formData.pondId, formData.date, isModalOpen]);

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
        const existingIndex = samplings.findIndex(s => !isBaselineSampling(s) && s.feedData && s.date === formData.date);
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

  return (
    <div className="dashboard-page-relaxed" style={{ maxWidth: '1200px', margin: '0 auto' }}>

      {/* Toolbar */}
      <div className="glass-card dashboard-toolbar-card animate-fade-up">
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
          <input
            placeholder="Search ponds..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: 'var(--bg-mid)', border: '1px solid var(--border)', borderRadius: '12px',
              padding: '12px 16px 12px 40px', width: '100%', fontSize: '14px', outline: 'none', fontWeight: 600, color: 'var(--text-primary)'
            }}
          />
        </div>
        {canEditFeed && (
          <button
            onClick={() => {
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
            <span>New Feed Log</span>
          </button>
        )}
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
          onSelect={(pond) => setSelectedPondIdForHistory(pond.id)}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
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
                      <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>{pond.pondName}</h3>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{latest ? 'Daily feeding active' : 'No recent logs'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPondIdForHistory(pond.id)}
                    style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '8px', color: 'var(--primary)', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                    onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                    onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                  >
                    <History size={20} />
                  </button>
                </div>

                <div style={{ padding: '22px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Daily Total</span>
                    <div style={{ fontSize: '21px', fontWeight: 900, color: 'var(--primary)', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      {latest ? latest.totalDailyFeed : '--'} <span style={{ fontSize: '13px', fontWeight: 700 }}>kg</span>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '14px 22px', background: 'var(--bg-mid)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Daily feed record</span>
                  {canEditFeed && (
                    <button
                      onClick={() => { setFormData({ ...formData, pondId: pond.id }); setModalOpen(true); }}
                      style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: 800, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'gap 0.2s' }}
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'flex-end' }}>
          <div role="dialog" aria-modal="true" aria-label={`${selectedPondForHistory.pondName} feed history`} style={{ width: '100%', maxWidth: '580px', background: '#F8FAFC', height: '100vh', boxShadow: '-14px 0 60px rgba(15, 76, 117, 0.16)', display: 'flex', flexDirection: 'column', animation: 'drawerSlide 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(50, 130, 184, 0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <History size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 850, color: 'var(--text-primary)', margin: 0 }}>{selectedPondForHistory.pondName}</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 650, margin: '3px 0 0' }}>Feed history</p>
                </div>
              </div>
              <button aria-label="Close feed history" onClick={() => setSelectedPondIdForHistory(null)} style={{ background: 'var(--bg-mid)', border: '1px solid var(--border)', borderRadius: '12px', padding: '9px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 32px' }}>
              {selectedFeedHistory.length === 0 && (
                <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ width: '68px', height: '68px', borderRadius: '20px', background: '#EAF3F8', color: '#0F4C75', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                    <ClipboardList size={30} />
                  </div>
                  <div style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 850, marginBottom: '6px' }}>No feed history yet</div>
                  <div style={{ maxWidth: '300px', fontSize: '13px', lineHeight: 1.6, fontWeight: 600 }}>Daily feed records will appear here after the first entry is saved.</div>
                </div>
              )}
              {selectedFeedHistory.length > 0 && (
                <div style={{ overflow: 'hidden', borderRadius: '14px', background: '#FFFFFF', border: '1px solid #DCE8F2' }}>
                  {selectedFeedHistory.map((log, i) => (
                    <div
                      key={log.id || log.date}
                      style={{ minHeight: '58px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', borderBottom: i < selectedFeedHistory.length - 1 ? '1px solid #EEF3F6' : 'none' }}
                    >
                      <span style={{ color: '#334E68', fontSize: '14px', fontWeight: 650 }}>
                        {new Date(log.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span style={{ color: '#0F4C75', fontSize: '16px', fontWeight: 850, whiteSpace: 'nowrap' }}>
                        {log.feedData.totalDailyFeed} kg
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -- LOG MODAL -------------------------------------- */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="glass-card animate-fade-up" style={{ width: '100%', maxWidth: '650px', background: '#FFFFFF', padding: '0', overflow: 'hidden', boxShadow: '0 20px 50px rgba(15, 76, 117, 0.2)' }}>
            <div style={{ padding: '32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-mid)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(15, 76, 117, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', border: '1px solid var(--border)' }}>
                  <Plus size={28} />
                </div>
                <div>
                  <h2 style={{ fontSize: '22px', fontWeight: 800 }}>Log Feeding</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600 }}>Record the pond&apos;s total daily feed.</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleAddFeed} style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Select Pond</label>
                  <select
                    required
                    value={formData.pondId}
                    onChange={e => setFormData({...formData, pondId: e.target.value})}
                    style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none', fontWeight: 700, color: 'var(--text-primary)' }}
                  >
                    <option value="">Choose a pond...</option>
                    {accessiblePonds.map(p => <option key={p.id} value={p.id}>{p.pondName}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</label>
                  <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 700, color: 'var(--text-primary)' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.feed.feedMix}</label>
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
                    <div key={allocation.inventoryFeedId} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 140px 40px', gap: '10px', alignItems: 'center' }}>
                      <select
                        value={allocation.inventoryFeedId}
                        onChange={e => setFormData((current) => ({
                          ...current,
                          feedAllocations: current.feedAllocations.map((item, itemIndex) => (
                            itemIndex === index ? { ...item, inventoryFeedId: e.target.value } : item
                          )),
                        }))}
                        style={{ minWidth: 0, padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none', fontWeight: 700, color: 'var(--text-primary)' }}
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
                        style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 700, color: 'var(--primary)' }}
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
                    style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'white', color: 'var(--primary)', fontWeight: 800, cursor: hasUnusedInventoryFeed ? 'pointer' : 'not-allowed', opacity: hasUnusedInventoryFeed ? 1 : 0.5 }}
                  >
                    + {t.feed.addFeedType}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.feed.calculatedTotal}</label>
                  <input
                    readOnly
                    type="number"
                    step="0.1"
                    value={formAllocationTotal.toFixed(2)}
                    style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: '#edf3f8', fontWeight: 800, color: 'var(--primary)' }}
                  />
                </div>

              </div>

              <div style={{ marginTop: '24px', display: 'flex', gap: '20px', borderTop: '1px solid var(--border)', paddingTop: '32px' }}>
                <button type="button" onClick={() => setModalOpen(false)} style={{ flex: 1, padding: '16px', borderRadius: '14px', border: '1px solid var(--border)', background: 'white', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg-mid)')} onMouseOut={(e) => (e.currentTarget.style.background = 'white')}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '16px', borderRadius: '14px', fontWeight: 900, fontSize: '16px' }}>Save Record</button>
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
      `}</style>
    </div>
  );
}
