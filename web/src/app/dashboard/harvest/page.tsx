"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  Wallet,
  Search,
  Scale,
  DollarSign,
  X,
  Loader2,
  Calendar,
  Trash2,
  History
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFarmDateKey } from '@/hooks/useFarmDateKey';
import {
  applyHarvestImpactToPond,
  calculateHarvestRemoval,
  getNextPartialHarvestNumber,
  reverseHarvestImpactOnPond,
  withHarvestReference,
  type HarvestType,
} from '../../../../../shared/harvestCalculations';
import { calculatePondMetricsWithHarvest } from '../../../../../shared/pondCalculations';
import { useCompanyBlocks } from '@/hooks/useDashboardData';
import {
  filterEnterpriseRecordsForUser,
  type FarmBlock,
} from '../../../../../shared/enterpriseBlocks';

/* --- Types --------------------------------------------------- */
interface HarvestPond {
  pondId: string;
  pondName: string;
  cycleId?: string;
  cycleName?: string;
  pondCycleId?: string;
  harvestType?: HarvestType;
  partialHarvestNumber?: number;
  harvestReferenceSamplingId?: string | null;
  harvestReferenceSamplingDate?: string | null;
  harvestReferenceMbw?: number | string | null;
  biomass: string;
  size: string;
  price: string;
  subBiomass: string;
  subSize: string;
  subPrice: string;
}

interface HarvestRecord {
  id: string;
  date: string;
  cycleId?: string;
  cycleName?: string;
  ponds: HarvestPond[];
  createdAt?: { toDate?: () => Date; seconds?: number };
}

interface Pond {
  id: string;
  pondName: string;
  blockId?: string;
  blockName?: string;
  initialPopulation?: number;
  initialWeight?: number;
  samplings?: { date?: string; mbw?: number; abw?: number; mortality?: number }[];
  totalHarvestedBiomass?: number;
  totalHarvestedPopulation?: number;
  partialHarvestCount?: number;
  postHarvestBaselineDate?: string | null;
  postHarvestRemainingBiomass?: number | null;
  postHarvestRemainingPopulation?: number | null;
  postHarvestReferenceSamplingId?: string | null;
  postHarvestReferenceSamplingDate?: string | null;
  postHarvestReferenceMbw?: number | null;
  cycleId?: string;
  cycleName?: string;
  pondCycleId?: string;
  cycleStatus?: 'active' | 'ended';
}

interface DashboardUser {
  uid: string;
  role?: string;
  companyId?: string;
}

const canEditOperations = (role?: string) => role === 'owner' || role === 'co-owner' || role === 'technician';

export default function HarvestPage() {
  const { company } = useAuth();
  const { t } = useLanguage();
  const { formatCurrency, currencyConfig } = useCurrency();
  const today = useFarmDateKey(company?.timeZone);
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [harvestRecords, setHarvestRecords] = useState<HarvestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const [isModalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [harvestFilter, setHarvestFilter] = useState<'current' | 'history'>('current');

  // Form State
  const [formData, setFormData] = useState({
    date: today,
    pondId: '',
    harvestType: 'partial' as HarvestType,
    biomass: '',
    size: '',
    price: '',
    subBiomass: '',
    subSize: '',
    subPrice: ''
  });
  const canEditHarvest = canEditOperations(user?.role);
  const { data: farmBlocks } = useCompanyBlocks<FarmBlock>('asc');
  const accessiblePonds = useMemo(() => filterEnterpriseRecordsForUser(ponds, {
    businessSize: company?.businessSize,
    role: user?.role,
    userId: user?.uid,
    blocks: farmBlocks,
  }), [company?.businessSize, farmBlocks, ponds, user?.role, user?.uid]);
  const accessiblePondIds = useMemo(
    () => new Set(accessiblePonds.map((pond) => pond.id)),
    [accessiblePonds],
  );

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        onSnapshot(doc(db, 'users', firebaseUser.uid), (uDoc) => {
          const userData = uDoc.data() as Omit<DashboardUser, 'uid'> | undefined;
          setUser({ uid: firebaseUser.uid, ...userData });
          const cid = userData?.companyId || null;
          setCompanyId(cid);
          if (cid) {
            // Load Ponds
            onSnapshot(collection(db, 'companies', cid, 'ponds'), (snapshot) => {
              setPonds(snapshot.docs
                .map(doc => ({
                  id: doc.id,
                  pondName: doc.data().pondName,
                  blockId: doc.data().blockId,
                  blockName: doc.data().blockName,
                  initialPopulation: doc.data().initialPopulation || 0,
                  initialWeight: doc.data().initialWeight || 0.5,
                  samplings: Array.isArray(doc.data().samplings) ? doc.data().samplings : [],
                  totalHarvestedBiomass: doc.data().totalHarvestedBiomass || 0,
                  totalHarvestedPopulation: doc.data().totalHarvestedPopulation || 0,
                  partialHarvestCount: doc.data().partialHarvestCount || 0,
                  postHarvestBaselineDate: doc.data().postHarvestBaselineDate ?? null,
                  postHarvestRemainingBiomass: doc.data().postHarvestRemainingBiomass ?? null,
                  postHarvestRemainingPopulation: doc.data().postHarvestRemainingPopulation ?? null,
                  postHarvestReferenceSamplingId: doc.data().postHarvestReferenceSamplingId ?? null,
                  postHarvestReferenceSamplingDate: doc.data().postHarvestReferenceSamplingDate ?? null,
                  postHarvestReferenceMbw: doc.data().postHarvestReferenceMbw ?? null,
                  cycleId: doc.data().cycleId,
                  cycleName: doc.data().cycleName,
                  pondCycleId: doc.data().pondCycleId || doc.id,
                  cycleStatus: doc.data().cycleStatus
                } as Pond))
                .filter(pond => pond.cycleStatus !== 'ended'));
            });
            // Load Harvest Records
            const q = query(collection(db, 'companies', cid, 'harvestRecords'), orderBy('date', 'desc'));
            const unsubHarvest = onSnapshot(q, (snapshot) => {
              setHarvestRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HarvestRecord)));
              setLoading(false);
            });
            return () => unsubHarvest();
          } else {
            setLoading(false);
          }
        });
      }
    });
    return () => unsubAuth();
  }, []);

  const handleAddHarvest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !formData.pondId || !user) return;
    if (!canEditHarvest) return;

    try {
      const selectedPond = accessiblePonds.find(p => p.id === formData.pondId);
      if (!selectedPond) return;
      const removal = calculateHarvestRemoval(formData);
      const estimatedBiomass = calculatePondMetricsWithHarvest(selectedPond).currentBiomass;

      if (
        estimatedBiomass > 0 &&
        removal.biomass > estimatedBiomass * 1.1 &&
        !window.confirm(
          `${selectedPond.pondName}: recorded harvest (${removal.biomass.toFixed(1)} kg) is higher than estimated pond biomass (${estimatedBiomass.toFixed(1)} kg). This can happen when sampling underestimates stock or MBW. Continue saving?`
        )
      ) {
        return;
      }

      const harvestRef = doc(collection(db, 'companies', companyId, 'harvestRecords'));
      const newRecord: HarvestRecord = {
        id: harvestRef.id,
        date: formData.date,
        cycleId: selectedPond.cycleId,
        cycleName: selectedPond.cycleName,
        ponds: [{
          pondId: formData.pondId,
          pondName: selectedPond.pondName,
          cycleId: selectedPond.cycleId,
          cycleName: selectedPond.cycleName,
          pondCycleId: selectedPond.pondCycleId || selectedPond.id,
          harvestType: formData.harvestType,
          biomass: formData.biomass,
          size: formData.size,
          price: formData.price,
          subBiomass: formData.subBiomass,
          subSize: formData.subSize,
          subPrice: formData.subPrice
        }],
      };

      await runTransaction(db, async (transaction) => {
        const pondRef = doc(db, 'companies', companyId, 'ponds', selectedPond.id);
        const pondSnapshot = await transaction.get(pondRef);
        if (!pondSnapshot.exists()) throw new Error('Pond was not found');

        const serverPond = { id: pondSnapshot.id, ...pondSnapshot.data() } as Pond;
        const partialHarvestNumber = formData.harvestType === 'partial'
          ? getNextPartialHarvestNumber(serverPond)
          : undefined;
        const canonicalHarvestPond = withHarvestReference(serverPond, { ...newRecord.ponds[0], partialHarvestNumber });
        const updatedPond = applyHarvestImpactToPond(
          serverPond,
          canonicalHarvestPond,
          newRecord.date,
          partialHarvestNumber,
        );

        transaction.update(pondRef, {
          totalHarvestedBiomass: updatedPond.totalHarvestedBiomass,
          totalHarvestedPopulation: updatedPond.totalHarvestedPopulation,
          partialHarvestCount: updatedPond.partialHarvestCount || 0,
          postHarvestBaselineDate: updatedPond.postHarvestBaselineDate || null,
          postHarvestRemainingBiomass: updatedPond.postHarvestRemainingBiomass ?? null,
          postHarvestRemainingPopulation: updatedPond.postHarvestRemainingPopulation ?? null,
          postHarvestReferenceSamplingId: updatedPond.postHarvestReferenceSamplingId || null,
          postHarvestReferenceSamplingDate: updatedPond.postHarvestReferenceSamplingDate || null,
          postHarvestReferenceMbw: updatedPond.postHarvestReferenceMbw || 0,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        });
        transaction.set(harvestRef, {
          ...newRecord,
          ponds: [canonicalHarvestPond],
          createdAt: serverTimestamp(),
          createdBy: user.uid,
        });
      });

      setModalOpen(false);
      setFormData({
        date: today,
        pondId: '',
        harvestType: 'partial',
        biomass: '',
        size: '',
        price: '',
        subBiomass: '',
        subSize: '',
        subPrice: ''
      });
    } catch (error) {
      console.error('Error adding harvest record:', error);
      alert('Failed to log harvest.');
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!companyId || !user || !window.confirm('Delete this harvest record?')) return;
    if (!canEditHarvest) return;
    const localRecord = harvestRecords.find((record) => record.id === recordId);
    if (
      company?.businessSize === 'enterprise'
      && user.role === 'technician'
      && (!localRecord || !localRecord.ponds.every((pond) => accessiblePondIds.has(pond.pondId)))
    ) return;
    try {
      const harvestRef = doc(db, 'companies', companyId, 'harvestRecords', recordId);
      await runTransaction(db, async (transaction) => {
        const harvestSnapshot = await transaction.get(harvestRef);
        if (!harvestSnapshot.exists()) return;
        const record = { id: harvestSnapshot.id, ...harvestSnapshot.data() } as HarvestRecord;
        const uniquePondIds = Array.from(new Set(record.ponds.map((pond) => pond.pondId)));
        const pondRefs = uniquePondIds.map((pondId) => doc(db, 'companies', companyId, 'ponds', pondId));
        const pondSnapshots = await Promise.all(pondRefs.map((pondRef) => transaction.get(pondRef)));
        const pondSnapshotsById = new Map(pondSnapshots.map((snapshot) => [snapshot.id, snapshot]));

        record.ponds.forEach((harvestPond) => {
          const pondSnapshot = pondSnapshotsById.get(harvestPond.pondId);
          if (!pondSnapshot?.exists()) return;
          const pond = { id: pondSnapshot.id, ...pondSnapshot.data() } as Pond;
          const updatedPond = reverseHarvestImpactOnPond(pond, harvestPond);
          transaction.update(pondSnapshot.ref, {
            totalHarvestedBiomass: updatedPond.totalHarvestedBiomass,
            totalHarvestedPopulation: updatedPond.totalHarvestedPopulation,
            postHarvestRemainingBiomass: updatedPond.postHarvestRemainingBiomass ?? null,
            postHarvestRemainingPopulation: updatedPond.postHarvestRemainingPopulation ?? null,
            updatedAt: serverTimestamp(),
            updatedBy: user.uid,
          });
        });
        transaction.delete(harvestRef);
      });
    } catch (error) {
      console.error('Error deleting record:', error);
    }
  };

  const activePondIds = useMemo(() => new Set(accessiblePonds.map((pond) => pond.id)), [accessiblePonds]);
  const accessibleHarvestRecords = useMemo(() => harvestRecords
    .map((record) => ({
      ...record,
      ponds: record.ponds.filter((pond) => accessiblePondIds.has(pond.pondId)),
    }))
    .filter((record) => record.ponds.length > 0), [accessiblePondIds, harvestRecords]);
  const canModifyHarvestRecord = useCallback((recordId: string) => {
    if (company?.businessSize !== 'enterprise' || user?.role !== 'technician') return true;
    const record = harvestRecords.find((item) => item.id === recordId);
    return Boolean(record?.ponds.every((pond) => accessiblePondIds.has(pond.pondId)));
  }, [accessiblePondIds, company?.businessSize, harvestRecords, user?.role]);

  const isCurrentCycleHarvest = useCallback((harvest: HarvestRecord) => {
    if (harvest.ponds.some((pond) => activePondIds.has(pond.pondId))) return true;
    return Boolean(harvest.cycleId && accessiblePonds.some((pond) => pond.cycleId === harvest.cycleId));
  }, [accessiblePonds, activePondIds]);

  const visibleHarvestRecords = useMemo(() => {
    return accessibleHarvestRecords.filter((harvest) =>
      harvestFilter === 'current' ? isCurrentCycleHarvest(harvest) : !isCurrentCycleHarvest(harvest)
    );
  }, [accessibleHarvestRecords, harvestFilter, isCurrentCycleHarvest]);

  const filteredRecords = useMemo(() => {
    return visibleHarvestRecords.filter(r =>
      r.ponds.some(p => p.pondName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [visibleHarvestRecords, searchTerm]);

  const totalRevenue = useMemo(() => {
    return visibleHarvestRecords.reduce((total, record) => {
      return total + record.ponds.reduce((pondTotal, p) => {
        const main = (parseFloat(p.biomass) || 0) * (parseFloat(p.price) || 0);
        const sub = (parseFloat(p.subBiomass) || 0) * (parseFloat(p.subPrice) || 0);
        return pondTotal + main + sub;
      }, 0);
    }, 0);
  }, [visibleHarvestRecords]);

  const totalBiomass = useMemo(() => {
    return visibleHarvestRecords.reduce((acc, r) =>
      acc + r.ponds.reduce((pAcc, p) => pAcc + (parseFloat(p.biomass) || 0) + (parseFloat(p.subBiomass) || 0), 0)
    , 0);
  }, [visibleHarvestRecords]);

  const getHarvestTypeLabel = (pond: HarvestPond) => {
    if (pond.harvestType === 'partial') {
      return t.harvest.partialHarvestNumber.replace('{{number}}', String(pond.partialHarvestNumber || 1));
    }
    if (pond.harvestType === 'final') return t.harvest.finalHarvest;
    return t.harvest.harvest;
  };

  return (
    <div className="dashboard-page-relaxed" style={{ maxWidth: '1200px', margin: '0 auto' }}>

      {/* Toolbar */}
      <div className="glass-card dashboard-toolbar-card animate-fade-up">
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
          <input
            placeholder="Search by pond name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '10px 16px 10px 40px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', width: '100%', fontSize: '14px', outline: 'none' }}
          />
        </div>
        {canEditHarvest && (
          <button className="dashboard-action dashboard-action-primary" onClick={() => {
            setFormData(prev => ({ ...prev, date: today }));
            setModalOpen(true);
          }}>
            <Plus size={20} />
            <span>Log Harvest</span>
          </button>
        )}
      </div>

      {/* Financial Overview */}
      <div className="responsive-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
        <div className="glass-card" style={{ padding: '20px', background: '#FFFFFF' }}>
          <div style={{ color: '#27ae60', marginBottom: '10px' }}><DollarSign size={22} /></div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Total Estimated Revenue</div>
          <div style={{ fontSize: '21px', fontWeight: 800 }}>{formatCurrency(totalRevenue)}</div>
        </div>
        <div className="glass-card" style={{ padding: '20px', background: '#FFFFFF' }}>
          <div style={{ color: '#0d2137', marginBottom: '10px' }}><Scale size={22} /></div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Total Harvested Biomass</div>
          <div style={{ fontSize: '21px', fontWeight: 800 }}>{totalBiomass.toLocaleString()}</div>
        </div>
        <div className="glass-card" style={{ padding: '20px', background: '#FFFFFF' }}>
          <div style={{ color: '#3282B8', marginBottom: '10px' }}><History size={22} /></div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>{harvestFilter === 'current' ? 'Current Cycle Records' : 'Historical Records'}</div>
          <div style={{ fontSize: '21px', fontWeight: 800 }}>{visibleHarvestRecords.length}</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="glass-card" style={{ padding: '24px', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '18px' }}>{harvestFilter === 'current' ? 'Current Cycle Harvests' : 'Harvest History'}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
              {harvestFilter === 'current'
                ? `${ponds.length} active pond${ponds.length === 1 ? '' : 's'} available for harvest`
                : 'Completed or inactive cycle harvest records'}
            </p>
          </div>
          <div style={{ display: 'flex', background: 'var(--bg-mid)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            {[
              { key: 'current' as const, label: 'Current Cycle' },
              { key: 'history' as const, label: 'History' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setHarvestFilter(item.key)}
                style={{
                  padding: '9px 14px',
                  borderRadius: '9px',
                  background: harvestFilter === item.key ? '#fff' : 'transparent',
                  color: harvestFilter === item.key ? 'var(--primary)' : 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: harvestFilter === item.key ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><Loader2 className="animate-spin" /></div>
        ) : filteredRecords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <Wallet size={48} style={{ opacity: 0.1, margin: '0 auto 16px' }} />
            <p>{harvestFilter === 'current' ? 'No current cycle harvest records found.' : 'No historical harvest records found.'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredRecords.map((record) => (
              <div key={record.id} className="glass-card" style={{ padding: '18px', background: '#FFFFFF', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Calendar size={18} color="var(--primary)" />
                    <span style={{ fontSize: '15px', fontWeight: 700 }}>{new Date(record.date).toLocaleDateString()}</span>
                  </div>
                  {canEditHarvest && canModifyHarvestRecord(record.id) ? (
                    <button onClick={() => handleDeleteRecord(record.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', opacity: 0.5, cursor: 'pointer' }}><Trash2 size={18} /></button>
                  ) : null}
                </div>

                <div className="responsive-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                  {record.ponds.map((p, idx) => (
                    <div key={idx} style={{ padding: '14px', borderRadius: '12px', background: 'var(--bg-mid)' }}>
                      <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '10px' }}>{p.pondName}</div>
                      <div style={{ display: 'inline-flex', padding: '4px 9px', borderRadius: '999px', background: '#BBE1FA', color: '#0F4C75', fontSize: '11px', fontWeight: 800, marginBottom: '10px' }}>
                        {getHarvestTypeLabel(p)}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Biomass</span>
                          <span style={{ fontSize: '13px', fontWeight: 700 }}>{parseFloat(p.biomass) + (parseFloat(p.subBiomass) || 0)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Avg. Size</span>
                          <span style={{ fontSize: '13px', fontWeight: 700 }}>{p.size} <span style={{ fontSize: '11px' }}>pcs/kg</span></span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Revenue</span>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#27ae60' }}>
                            {formatCurrency((parseFloat(p.biomass) * parseFloat(p.price)) + (parseFloat(p.subBiomass) * parseFloat(p.subPrice)))}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="responsive-modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="glass-card responsive-modal" style={{ width: '100%', maxWidth: '700px', background: '#FFFFFF', padding: '0', overflow: 'hidden' }}>
            <div className="responsive-modal-header" style={{ padding: '32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Log Harvest</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>{t.harvest.recordHarvestDescription}</p>
              </div>
              <button onClick={() => setModalOpen(false)} style={{ background: 'var(--bg-mid)', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form className="responsive-modal-body" onSubmit={handleAddHarvest} style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700 }}>Select Pond</label>
                  <select
                    required
                    value={formData.pondId}
                    onChange={e => setFormData({...formData, pondId: e.target.value})}
                    style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none' }}
                  >
                    <option value="">Choose a pond...</option>
                    {accessiblePonds.map(p => <option key={p.id} value={p.id}>{p.pondName}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700 }}>Harvest Date</label>
                  <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700 }}>{t.harvest.harvestType}</label>
                  <div style={{ display: 'flex', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }}>
                    {(['partial', 'final'] as HarvestType[]).map((harvestType) => (
                      <button
                        key={harvestType}
                        type="button"
                        onClick={() => setFormData({ ...formData, harvestType })}
                        style={{
                          flex: 1,
                          padding: '9px 10px',
                          border: 'none',
                          borderRadius: '7px',
                          background: formData.harvestType === harvestType ? '#0F4C75' : 'transparent',
                          color: formData.harvestType === harvestType ? '#FFFFFF' : 'var(--text-muted)',
                          fontSize: '12px',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        {harvestType === 'partial' ? t.harvest.partialHarvest : t.harvest.finalHarvest}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700 }}>Avg. Size (pcs/kg)</label>
                  <input required min="0.01" step="0.01" type="number" value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', gridColumn: 'span 2', padding: '24px', background: 'var(--bg-mid)', borderRadius: '16px' }}>
                  <div className="responsive-two-column" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary)' }}>Main Biomass (kg)</label>
                      <input required min="0.01" type="number" step="0.1" value={formData.biomass} onChange={e => setFormData({...formData, biomass: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: '#FFF' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary)' }}>Main Price ({currencyConfig.symbol}/kg)</label>
                      <input required min="0.01" type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: '#FFF' }} />
                    </div>
                  </div>

                  <div style={{ height: '1px', background: 'var(--border)' }} />

                  <div className="responsive-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-faint)' }}>Sub Biomass (Optional)</label>
                      <input required={Boolean(formData.subSize || formData.subPrice)} min="0.01" type="number" step="0.1" value={formData.subBiomass} onChange={e => setFormData({...formData, subBiomass: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: '#FFF' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-faint)' }}>Sub Size (pcs/kg)</label>
                      <input required={Boolean(formData.subBiomass || formData.subPrice)} min="0.01" step="0.01" type="number" value={formData.subSize} onChange={e => setFormData({...formData, subSize: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: '#FFF' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-faint)' }}>Sub Price ({currencyConfig.symbol}/kg, Optional)</label>
                      <input required={Boolean(formData.subBiomass || formData.subSize)} min="0.01" type="number" value={formData.subPrice} onChange={e => setFormData({...formData, subPrice: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: '#FFF' }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="responsive-modal-footer" style={{ marginTop: '12px', display: 'flex', gap: '16px' }}>
                <button type="button" onClick={() => setModalOpen(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '14px', borderRadius: '12px', fontWeight: 800 }}>Save Harvest</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
