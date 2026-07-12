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
  Calendar,
  Waves,
  ChevronRight,
  ArrowRight,
  ClipboardList
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

/* --- Types --------------------------------------------------- */
interface FeedData {
  totalDailyFeed: string;
  inventoryFeedId?: string | null;
  cycleId?: string;
  cycleName?: string;
  pondCycleId?: string;
}

interface Sampling {
  id: string; date: string; cycleId?: string; cycleName?: string; pondCycleId?: string; feedData?: FeedData;
  isBaselineEstimate?: boolean;
  source?: string;
}

interface Pond {
  id: string; pondName: string; samplings: Sampling[];
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
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ uid: string; role?: string } | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedPondForHistory, setSelectedPondForHistory] = useState<Pond | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [inventoryFeeds, setInventoryFeeds] = useState<InventoryFeed[]>([]);

  // Form State
  const [formData, setFormData] = useState<FeedData & { pondId: string; date: string }>({
    pondId: '',
    inventoryFeedId: '',
    date: new Date().toISOString().split('T')[0],
    totalDailyFeed: '',
  });
  const canEditFeed = canEditOperations(user?.role);

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

    const pond = ponds.find(p => p.id === formData.pondId);
    const existing = pond?.samplings?.find(s => !isBaselineSampling(s) && s.feedData && s.date === formData.date);

    if (existing?.feedData) {
      // Data exists for this day, pre-fill the form
      const data = existing.feedData;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData(prev => ({
        ...prev,
        ...data,
        inventoryFeedId: data.inventoryFeedId || '',
        pondId: prev.pondId, // Ensure these aren't lost
        date: prev.date
      }));
    } else {
      // No data for this day, reset but keep context
      setFormData(prev => ({
        pondId: prev.pondId,
        date: prev.date,
        inventoryFeedId: '',
        totalDailyFeed: '',
      }));
    }
  }, [formData.pondId, formData.date, isModalOpen, ponds]);

  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !formData.pondId) return;
    if (!canEditFeed) return;
    const feedAmount = parseFloat(formData.totalDailyFeed);
    if (!Number.isFinite(feedAmount) || feedAmount <= 0) {
      alert('Daily feed must be greater than 0.');
      return;
    }

    try {
      const pondRef = doc(db, 'companies', companyId, 'ponds', formData.pondId);
      const requestedFeedId = formData.inventoryFeedId || '';

      await runTransaction(db, async (transaction) => {
        const pondDoc = await transaction.get(pondRef);
        if (!pondDoc.exists()) throw new Error('Pond record not found');

        const pondData = pondDoc.data();
        const samplings = [...(pondData.samplings || [])];
        const existingIndex = samplings.findIndex(s => !isBaselineSampling(s) && s.feedData && s.date === formData.date);
        const existingFeedData = existingIndex >= 0 ? samplings[existingIndex]?.feedData : undefined;
        const previousInventoryFeedId = existingFeedData?.inventoryFeedId || '';

        const feedData = {
          totalDailyFeed: formData.totalDailyFeed,
          inventoryFeedId: requestedFeedId || null,
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

        const feedIds = Array.from(new Set([previousInventoryFeedId, requestedFeedId].filter(Boolean)));
        const feedSnapshots = new Map<string, DocumentSnapshot<DocumentData>>();
        for (const feedId of feedIds) {
          const feedRef = doc(db, 'companies', companyId, 'feeds', feedId);
          feedSnapshots.set(feedId, await transaction.get(feedRef));
        }

        const getFeedScreenUsageTotal = (feedId: string) => {
          const feedDoc = feedSnapshots.get(feedId);
          if (!feedDoc?.exists()) return 0;
          const data = feedDoc.data() as InventoryFeed;
          return (data.usageHistory || [])
            .filter((usage) => usage.date === formData.date && usage.pondId === formData.pondId && usage.notes === `Daily feed for pond: ${pondData.pondName}`)
            .reduce((sum: number, usage) => sum + (Number(usage.quantity) || 0), 0);
        };

        const adjustFeedUsage = (feedId: string, quantityDelta: number) => {
          if (!feedId || !Number.isFinite(quantityDelta) || quantityDelta === 0) return;

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
            .filter((usage) => usage.date === formData.date && usage.pondId === formData.pondId && usage.notes === `Daily feed for pond: ${pondData.pondName}`)
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
              id: `usage-${formData.pondId}-${formData.date}-${Date.now()}`,
              date: formData.date,
              quantity: quantityDelta,
              unitPrice,
              totalCost: quantityDelta * unitPrice,
              pondId: formData.pondId,
              cycleId: pondData.cycleId,
              cycleName: pondData.cycleName,
              pondCycleId: pondData.pondCycleId || formData.pondId,
              notes: `Daily feed for pond: ${pondData.pondName}`,
              createdAt: Timestamp.now()
            }),
            lastUpdated: serverTimestamp()
          });
        };

        if (previousInventoryFeedId && previousInventoryFeedId !== requestedFeedId) {
          const previousDeducted = getFeedScreenUsageTotal(previousInventoryFeedId);
          adjustFeedUsage(previousInventoryFeedId, -previousDeducted);
        }

        if (requestedFeedId) {
          const alreadyDeducted = getFeedScreenUsageTotal(requestedFeedId);
          adjustFeedUsage(requestedFeedId, feedAmount - alreadyDeducted);
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
          inventoryFeedId: '',
          date: new Date().toISOString().split('T')[0],
          totalDailyFeed: '',
        });
    } catch (error) {
      console.error('Error adding feed record:', error);
      alert(error instanceof Error ? error.message : 'Failed to update feed record.');
    }
  };

  const filteredPonds = useMemo(() => {
    return ponds.filter(p => p.pondName.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [ponds, searchTerm]);

  const getLatestFeed = (pond: Pond) => {
    const logs = (pond.samplings || [])
      .filter(s => s.feedData)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return logs[0]?.feedData;
  };

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
                inventoryFeedId: '',
                date: new Date().toISOString().split('T')[0],
                totalDailyFeed: '',
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
                    onClick={() => setSelectedPondForHistory(pond)}
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
          <div style={{ width: '100%', maxWidth: '560px', background: '#FFFFFF', height: '100vh', boxShadow: '-10px 0 50px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', animation: 'drawerSlide 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div style={{ padding: '26px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-mid)' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800 }}>{selectedPondForHistory.pondName} Feed History</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>Daily feed totals</p>
              </div>
              <button onClick={() => setSelectedPondForHistory(null)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '8px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {selectedPondForHistory.samplings
                  .filter(s => s.feedData)
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((log, i) => (
                    <div key={i} className="glass-card animate-fade-up" style={{ padding: '18px', background: 'white', animationDelay: `${i * 0.05}s` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Calendar size={18} color="var(--text-faint)" />
                          <span style={{ fontWeight: 800, fontSize: '14px' }}>{new Date(log.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </div>
                        <div style={{ padding: '6px 12px', borderRadius: '12px', background: 'var(--primary)', color: '#FFF', fontSize: '12px', fontWeight: 800, boxShadow: '0 4px 12px rgba(15, 76, 117, 0.2)' }}>
                          {log.feedData?.totalDailyFeed} kg
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
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
                    {ponds.map(p => <option key={p.id} value={p.id}>{p.pondName}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</label>
                  <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 700, color: 'var(--text-primary)' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Daily Total (kg)</label>
                  <input required min="0.1" type="number" step="0.1" value={formData.totalDailyFeed} onChange={e => setFormData({...formData, totalDailyFeed: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 800, color: 'var(--primary)' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inventory Feed (Optional)</label>
                  <select
                    value={formData.inventoryFeedId || ''}
                    onChange={e => setFormData({...formData, inventoryFeedId: e.target.value})}
                    style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none', fontWeight: 700, color: 'var(--text-primary)' }}
                  >
                    <option value="">No deduction from inventory</option>
                    {inventoryFeeds.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.feedName} {f.brand ? `(${f.brand})` : ''} - Stock: {f.totalStock} {f.unit}
                      </option>
                    ))}
                  </select>
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
