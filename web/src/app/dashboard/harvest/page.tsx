"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Wallet, 
  Search, 
  Scale, 
  DollarSign,
  X,
  Loader2,
  Calendar,
  Waves,
  ChevronRight,
  Trash2,
  ArrowRight,
  TrendingUp,
  History
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, addDoc, serverTimestamp, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

/* ─── Types ─────────────────────────────────────────────────── */
interface HarvestPond {
  pondId: string;
  pondName: string;
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
  ponds: HarvestPond[];
  createdAt?: { toDate?: () => Date; seconds?: number };
}

interface Pond {
  id: string;
  pondName: string;
  cycleStatus?: 'active' | 'ended';
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

export default function HarvestPage() {
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [harvestRecords, setHarvestRecords] = useState<HarvestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  
  const [isModalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    pondId: '',
    biomass: '',
    size: '',
    price: '',
    subBiomass: '',
    subSize: '',
    subPrice: ''
  });

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        onSnapshot(doc(db, 'users', firebaseUser.uid), (uDoc) => {
          const cid = uDoc.data()?.companyId;
          setCompanyId(cid);
          if (cid) {
            // Load Ponds
            onSnapshot(collection(db, 'companies', cid, 'ponds'), (snapshot) => {
              setPonds(snapshot.docs
                .map(doc => ({ id: doc.id, pondName: doc.data().pondName, cycleStatus: doc.data().cycleStatus } as Pond))
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
    if (!companyId || !formData.pondId) return;

    try {
      const selectedPond = ponds.find(p => p.id === formData.pondId);
      if (!selectedPond) return;

      const newRecord = {
        date: formData.date,
        ponds: [{
          pondId: formData.pondId,
          pondName: selectedPond.pondName,
          biomass: formData.biomass,
          size: formData.size,
          price: formData.price,
          subBiomass: formData.subBiomass,
          subSize: formData.subSize,
          subPrice: formData.subPrice
        }],
        createdAt: serverTimestamp(),
        createdBy: user.uid
      };

      await addDoc(collection(db, 'companies', companyId, 'harvestRecords'), newRecord);
      
      // Note: In a full implementation, we'd also update the pond's totalHarvestedBiomass here
      // But we'll stick to the record logging for now to match the user's focus on UI
      
      setModalOpen(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        pondId: '',
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
    if (!companyId || !window.confirm('Delete this harvest record?')) return;
    try {
      await deleteDoc(doc(db, 'companies', companyId, 'harvestRecords', recordId));
    } catch (error) {
      console.error('Error deleting record:', error);
    }
  };

  const filteredRecords = useMemo(() => {
    return harvestRecords.filter(r => 
      r.ponds.some(p => p.pondName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [harvestRecords, searchTerm]);

  const totalRevenue = useMemo(() => {
    return harvestRecords.reduce((total, record) => {
      return total + record.ponds.reduce((pondTotal, p) => {
        const main = (parseFloat(p.biomass) || 0) * (parseFloat(p.price) || 0);
        const sub = (parseFloat(p.subBiomass) || 0) * (parseFloat(p.subPrice) || 0);
        return pondTotal + main + sub;
      }, 0);
    }, 0);
  }, [harvestRecords]);

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
        <button className="dashboard-action dashboard-action-primary" onClick={() => setModalOpen(true)}>
          <Plus size={20} />
          <span>Log Harvest</span>
        </button>
      </div>

      {/* Financial Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
        <div className="glass-card" style={{ padding: '20px', background: '#FFFFFF' }}>
          <div style={{ color: '#27ae60', marginBottom: '10px' }}><DollarSign size={22} /></div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Total Estimated Revenue</div>
          <div style={{ fontSize: '21px', fontWeight: 800 }}>IDR {totalRevenue.toLocaleString()}</div>
        </div>
        <div className="glass-card" style={{ padding: '20px', background: '#FFFFFF' }}>
          <div style={{ color: '#0d2137', marginBottom: '10px' }}><Scale size={22} /></div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Total Harvested Biomass</div>
          <div style={{ fontSize: '21px', fontWeight: 800 }}>
            {harvestRecords.reduce((acc, r) => acc + r.ponds.reduce((pAcc, p) => pAcc + (parseFloat(p.biomass) || 0) + (parseFloat(p.subBiomass) || 0), 0), 0).toLocaleString()} <span style={{ fontSize: '13px' }}>kg</span>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '20px', background: '#FFFFFF' }}>
          <div style={{ color: '#3282B8', marginBottom: '10px' }}><History size={22} /></div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Cycles Completed</div>
          <div style={{ fontSize: '21px', fontWeight: 800 }}>{harvestRecords.length}</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="glass-card" style={{ padding: '24px', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px' }}>Harvest History</h3>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><Loader2 className="animate-spin" /></div>
        ) : filteredRecords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <Wallet size={48} style={{ opacity: 0.1, margin: '0 auto 16px' }} />
            <p>No harvest records found.</p>
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
                  <button onClick={() => handleDeleteRecord(record.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', opacity: 0.5, cursor: 'pointer' }}><Trash2 size={18} /></button>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                  {record.ponds.map((p, idx) => (
                    <div key={idx} style={{ padding: '14px', borderRadius: '12px', background: 'var(--bg-mid)' }}>
                      <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '10px' }}>{p.pondName}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Biomass</span>
                          <span style={{ fontSize: '13px', fontWeight: 700 }}>{parseFloat(p.biomass) + (parseFloat(p.subBiomass) || 0)} kg</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Avg. Size</span>
                          <span style={{ fontSize: '13px', fontWeight: 700 }}>{p.size} <span style={{ fontSize: '11px' }}>pcs/kg</span></span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Revenue</span>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#27ae60' }}>
                            IDR {((parseFloat(p.biomass) * parseFloat(p.price)) + (parseFloat(p.subBiomass) * parseFloat(p.subPrice))).toLocaleString()}
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '700px', background: '#FFFFFF', padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Log Harvest</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Record final production data and pricing.</p>
              </div>
              <button onClick={() => setModalOpen(false)} style={{ background: 'var(--bg-mid)', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddHarvest} style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700 }}>Select Pond</label>
                  <select 
                    required 
                    value={formData.pondId}
                    onChange={e => setFormData({...formData, pondId: e.target.value})}
                    style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none' }}
                  >
                    <option value="">Choose a pond...</option>
                    {ponds.map(p => <option key={p.id} value={p.id}>{p.pondName}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700 }}>Harvest Date</label>
                  <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700 }}>Avg. Size (pcs/kg)</label>
                  <input required type="number" value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', gridColumn: 'span 2', padding: '24px', background: 'var(--bg-mid)', borderRadius: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary)' }}>Main Biomass (kg)</label>
                      <input required type="number" step="0.1" value={formData.biomass} onChange={e => setFormData({...formData, biomass: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: '#FFF' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary)' }}>Main Price (per kg)</label>
                      <input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: '#FFF' }} />
                    </div>
                  </div>
                  
                  <div style={{ height: '1px', background: 'var(--border)' }} />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-faint)' }}>Sub Biomass (Optional)</label>
                      <input type="number" step="0.1" value={formData.subBiomass} onChange={e => setFormData({...formData, subBiomass: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: '#FFF' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-faint)' }}>Sub Price (Optional)</label>
                      <input type="number" value={formData.subPrice} onChange={e => setFormData({...formData, subPrice: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: '#FFF' }} />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '12px', display: 'flex', gap: '16px' }}>
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
