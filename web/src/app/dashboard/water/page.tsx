"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Droplets, 
  Search, 
  Activity, 
  Thermometer, 
  Wind,
  X,
  Loader2,
  Calendar,
  Waves,
  ArrowRight,
  ChevronRight,
  History,
  Info
} from 'lucide-react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

/* ─── Types ─────────────────────────────────────────────────── */
interface Sampling {
  id: string; date: string; mbw: number; mortality: number; feed: number;
  phMorning?: string; phEvening?: string; doMorning?: string; doEvening?: string;
  transparency?: string; salinity?: string;
}

interface Pond {
  id: string; pondName: string; supplier: string; samplings: Sampling[];
  cycleStatus?: 'active' | 'ended';
  createdAt?: { toDate?: () => Date; seconds?: number };
  updatedAt?: { toDate?: () => Date; seconds?: number };
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

export default function WaterQualityPage() {
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedPondForHistory, setSelectedPondForHistory] = useState<Pond | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    pondId: '',
    date: new Date().toISOString().split('T')[0],
    phMorning: '',
    phEvening: '',
    doMorning: '',
    doEvening: '',
    transparency: '',
    salinity: ''
  });

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        onSnapshot(doc(db, 'users', firebaseUser.uid), (uDoc) => {
          const cid = uDoc.data()?.companyId;
          setCompanyId(cid);
          if (cid) {
            const q = query(collection(db, 'companies', cid, 'ponds'), orderBy('createdAt', 'desc'));
            const unsubPonds = onSnapshot(q, (snapshot) => {
              const data = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Pond))
                .filter(pond => pond.cycleStatus !== 'ended');
              setPonds(data);
              setLoading(false);
            });
            return () => unsubPonds();
          } else {
            setLoading(false);
          }
        });
      }
    });
    return () => unsubAuth();
  }, []);

  // ── Sync form data with existing records when pond/date changes ────
  useEffect(() => {
    if (!isModalOpen || !formData.pondId || !formData.date) return;
    
    const pond = ponds.find(p => p.id === formData.pondId);
    const existing = pond?.samplings?.find(s => s.date === formData.date);
    
    if (existing) {
      setFormData(prev => {
        // Only update if the values are actually different to avoid input loops
        if (
          prev.phMorning === (existing.phMorning || '') &&
          prev.phEvening === (existing.phEvening || '') &&
          prev.doMorning === (existing.doMorning || '') &&
          prev.doEvening === (existing.doEvening || '') &&
          prev.transparency === (existing.transparency || '') &&
          prev.salinity === (existing.salinity || '')
        ) return prev;

        return {
          ...prev,
          phMorning: existing.phMorning || '',
          phEvening: existing.phEvening || '',
          doMorning: existing.doMorning || '',
          doEvening: existing.doEvening || '',
          transparency: existing.transparency || '',
          salinity: existing.salinity || '',
        };
      });
    } else {
      setFormData(prev => {
        // Only clear if not already empty
        if (
          !prev.phMorning && !prev.phEvening && !prev.doMorning && 
          !prev.doEvening && !prev.transparency && !prev.salinity
        ) return prev;

        return {
          ...prev,
          phMorning: '',
          phEvening: '',
          doMorning: '',
          doEvening: '',
          transparency: '',
          salinity: ''
        };
      });
    }
  }, [formData.pondId, formData.date, isModalOpen, ponds]);

  const handleAddWQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !formData.pondId) return;

    try {
      const pondRef = doc(db, 'companies', companyId, 'ponds', formData.pondId);
      const pondDoc = await getDoc(pondRef);
      
      if (pondDoc.exists()) {
        const pondData = pondDoc.data();
        let samplings = [...(pondData.samplings || [])];
        const existingIndex = samplings.findIndex(s => s.date === formData.date);
        
        const wqData = {
          phMorning: formData.phMorning,
          phEvening: formData.phEvening,
          doMorning: formData.doMorning,
          doEvening: formData.doEvening,
          transparency: formData.transparency,
          salinity: formData.salinity,
        };

        if (existingIndex >= 0) {
          samplings[existingIndex] = { 
            ...samplings[existingIndex], 
            phMorning: formData.phMorning || samplings[existingIndex].phMorning || '',
            phEvening: formData.phEvening || samplings[existingIndex].phEvening || '',
            doMorning: formData.doMorning || samplings[existingIndex].doMorning || '',
            doEvening: formData.doEvening || samplings[existingIndex].doEvening || '',
            transparency: formData.transparency || samplings[existingIndex].transparency || '',
            salinity: formData.salinity || samplings[existingIndex].salinity || '',
          };
        } else {
          samplings.push({
            id: `wq-${Date.now()}`,
            date: formData.date,
            mbw: 0, mortality: 0, feed: 0,
            phMorning: formData.phMorning,
            phEvening: formData.phEvening,
            doMorning: formData.doMorning,
            doEvening: formData.doEvening,
            transparency: formData.transparency,
            salinity: formData.salinity,
          });
        }

        await updateDoc(pondRef, {
          samplings,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid
        });

        setModalOpen(false);
        setFormData({
          pondId: '',
          date: new Date().toISOString().split('T')[0],
          phMorning: '',
          phEvening: '',
          doMorning: '',
          doEvening: '',
          transparency: '',
          salinity: ''
        });
      }
    } catch (error) {
      console.error('Error adding water quality:', error);
      alert('Failed to update water quality.');
    }
  };

  const filteredPonds = useMemo(() => {
    return ponds.filter(p => p.pondName.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [ponds, searchTerm]);

  const getLatestWQ = (pond: Pond) => {
    const logs = (pond.samplings || [])
      .filter(s => s.phMorning || s.phEvening || s.doMorning || s.doEvening || s.transparency || s.salinity)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return logs[0] || null;
  };

  return (
    <div className="dashboard-page-relaxed" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Toolbar */}
      <div className="glass-card dashboard-toolbar-card animate-fade-up animate-delay-1">
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
          <input 
            placeholder="Search ponds or parameters..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: 'var(--glass-bg)', border: '1px solid var(--border)', borderRadius: '16px',
              padding: '14px 16px 14px 48px', width: '100%', fontSize: '1rem', outline: 'none', 
              color: 'var(--text-primary)', fontWeight: 600, backdropFilter: 'var(--glass-blur)',
              boxShadow: 'var(--shadow-card)', transition: 'all 0.2s'
            }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
          />
        </div>
        <button 
          onClick={() => { setFormData({ ...formData, pondId: '' }); setModalOpen(true); }}
          className="dashboard-action dashboard-action-primary"
        >
          <Plus size={20} strokeWidth={3} />
          <span>New Parameter Log</span>
        </button>
      </div>

      {/* Pond Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><Loader2 className="animate-spin" size={40} color="var(--primary)" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {filteredPonds.map((pond, idx) => {
            const latest = getLatestWQ(pond);
            return (
              <div key={pond.id} className={`glass-card animate-fade-up animate-delay-${(idx % 4) + 1}`} style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-mid)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', border: '1px solid var(--border)' }}>
                      <Waves size={20} />
                    </div>
                    <Link href={`/dashboard/ponds/${pond.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{pond.pondName}</h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
                          {latest ? `UPDATED ${new Date(latest.date).toLocaleDateString()}` : 'NO DATA LOGGED'}
                        </p>
                      </div>
                    </Link>
                  </div>
                  <button 
                    onClick={() => setSelectedPondForHistory(pond)}
                    className="icon-btn-modern"
                  >
                    <History size={20} />
                  </button>
                </div>

                <div style={{ padding: '24px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', flex: 1 }}>
                  <div className="wq-metric">
                    <span className="wq-label">pH Level</span>
                    <div className="wq-value">
                      <Activity size={16} color="var(--accent)" /> 
                      <span>{latest ? `${latest.phMorning || '-'} / ${latest.phEvening || '-'}` : '--'}</span>
                    </div>
                  </div>
                  <div className="wq-metric">
                    <span className="wq-label">DO (mg/L)</span>
                    <div className="wq-value">
                      <Wind size={16} color="var(--primary)" /> 
                      <span>{latest ? `${latest.doMorning || '-'} / ${latest.doEvening || '-'}` : '--'}</span>
                    </div>
                  </div>
                  <div className="wq-metric">
                    <span className="wq-label">Salinity</span>
                    <div className="wq-value">
                      <Droplets size={16} color="#10b981" /> 
                      <span>{latest ? `${latest.salinity || '--'} PPT` : '--'}</span>
                    </div>
                  </div>
                  <div className="wq-metric">
                    <span className="wq-label">Transparency</span>
                    <div className="wq-value">
                      <Thermometer size={16} color="#f59e0b" /> 
                      <span>{latest ? `${latest.transparency || '--'} CM` : '--'}</span>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', background: 'var(--bg-mid)' }}>
                  <button 
                    onClick={() => { setFormData({ ...formData, pondId: pond.id }); setModalOpen(true); }}
                    className="btn-secondary"
                    style={{ padding: '9px 16px', fontSize: '0.82rem' }}
                  >
                    Quick Log <Plus size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── HISTORY DRAWER ────────────────────────────── */}
      {selectedPondForHistory && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'flex-end' }}>
          <div className="drawer-content animate-slide-left">
            <div style={{ padding: '26px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-mid)' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--text-primary)' }}>
                  {selectedPondForHistory.pondName} Water Quality History
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
                  Historical environmental logs and parameter readings
                </p>
              </div>
              <button onClick={() => setSelectedPondForHistory(null)} className="icon-btn-modern">
                <X size={20} />
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {selectedPondForHistory.samplings
                  .filter(s => s.phMorning || s.phEvening || s.doMorning || s.doEvening || s.transparency || s.salinity)
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((log, i) => (
                    <div key={i} className="glass-card" style={{ padding: '18px', background: '#FFF' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <span style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '-0.01em' }}>{new Date(log.date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        <div style={{ fontSize: '0.6rem', padding: '4px 10px', borderRadius: '100px', background: 'var(--primary-dim)', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Record Entry</div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <div className="wq-metric-small">
                          <span className="wq-label-small">pH Levels</span>
                          <span className="wq-val-small">{log.phMorning || '-'} <span style={{ color: 'var(--text-faint)' }}>AM</span> / {log.phEvening || '-'} <span style={{ color: 'var(--text-faint)' }}>PM</span></span>
                        </div>
                        <div className="wq-metric-small">
                          <span className="wq-label-small">Dissolved Oxygen</span>
                          <span className="wq-val-small">{log.doMorning || '-'} <span style={{ color: 'var(--text-faint)' }}>AM</span> / {log.doEvening || '-'} <span style={{ color: 'var(--text-faint)' }}>PM</span></span>
                        </div>
                        <div className="wq-metric-small">
                          <span className="wq-label-small">Salinity</span>
                          <span className="wq-val-small">{log.salinity || '-'} PPT</span>
                        </div>
                        <div className="wq-metric-small">
                          <span className="wq-label-small">Transparency</span>
                          <span className="wq-val-small">{log.transparency || '-'} CM</span>
                        </div>
                      </div>
                    </div>
                  ))
                }
                {selectedPondForHistory.samplings.length === 0 && (
                   <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                     <Info size={40} style={{ marginBottom: '16px', opacity: 0.3 }} />
                     <p style={{ fontWeight: 600 }}>No environmental records found for this pond.</p>
                   </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LOG MODAL ────────────────────────────────────────── */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="glass-card animate-fade-up" style={{ width: '100%', maxWidth: '640px', background: 'white', padding: '0', overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-mid)' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Log Parameters</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px', fontWeight: 600 }}>Sync environmental data with Orson AI.</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="icon-btn-modern">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddWQ} style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 2' }}>
                  <label className="form-label">Target Pond</label>
                  <select 
                    required 
                    value={formData.pondId}
                    onChange={e => setFormData({...formData, pondId: e.target.value})}
                    className="form-input"
                  >
                    <option value="">Select a pond asset...</option>
                    {ponds.map(p => <option key={p.id} value={p.id}>{p.pondName}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="form-label">Sampling Date</label>
                  <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="form-input" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="form-label">Salinity (PPT)</label>
                  <input type="number" step="0.1" placeholder="0.0" value={formData.salinity} onChange={e => setFormData({...formData, salinity: e.target.value})} className="form-input" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="form-label">pH (Morning)</label>
                  <input type="number" step="0.1" placeholder="0.0" value={formData.phMorning} onChange={e => setFormData({...formData, phMorning: e.target.value})} className="form-input" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="form-label">pH (Evening)</label>
                  <input type="number" step="0.1" placeholder="0.0" value={formData.phEvening} onChange={e => setFormData({...formData, phEvening: e.target.value})} className="form-input" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="form-label">DO (Morning) mg/L</label>
                  <input type="number" step="0.1" placeholder="0.0" value={formData.doMorning} onChange={e => setFormData({...formData, doMorning: e.target.value})} className="form-input" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="form-label">DO (Evening) mg/L</label>
                  <input type="number" step="0.1" placeholder="0.0" value={formData.doEvening} onChange={e => setFormData({...formData, doEvening: e.target.value})} className="form-input" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 2' }}>
                  <label className="form-label">Transparency (CM)</label>
                  <input type="number" placeholder="0" value={formData.transparency} onChange={e => setFormData({...formData, transparency: e.target.value})} className="form-input" />
                </div>
              </div>

              <div style={{ marginTop: '12px', display: 'flex', gap: '16px', borderTop: '1px solid var(--border)', paddingTop: '32px' }}>
                <button type="button" onClick={() => setModalOpen(false)} style={{ 
                  flex: 1, padding: '16px', borderRadius: '14px', border: '1px solid var(--border)', 
                  background: 'transparent', fontWeight: 700, cursor: 'pointer' 
                }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '16px', borderRadius: '14px', fontWeight: 800 }}>Save Log Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .icon-btn-modern {
          background: #FFF;
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 10px;
          color: var(--primary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(15, 76, 117, 0.05);
        }
        .icon-btn-modern:hover {
          background: var(--primary-dim);
          transform: translateY(-2px);
          border-color: var(--primary);
        }
        .wq-metric {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .wq-label {
          font-size: 0.65rem;
          font-weight: 800;
          color: var(--text-faint);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .wq-value {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--text-primary);
        }
        .drawer-content {
          width: 100%;
          max-width: 560px;
          background: #FFFFFF;
          height: 100vh;
          box-shadow: -20px 0 60px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
        }
        .animate-slide-left {
          animation: slideLeft 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes slideLeft {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .wq-metric-small {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .wq-label-small {
          font-size: 0.6rem;
          font-weight: 800;
          color: var(--text-faint);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .wq-val-small {
          font-size: 0.95rem;
          font-weight: 800;
          color: var(--text-primary);
        }
        .form-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .form-input {
          padding: 14px 18px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--bg-mid);
          outline: none;
          font-size: 1rem;
          font-weight: 600;
          transition: all 0.2s;
        }
        .form-input:focus {
          border-color: var(--primary);
          background: #FFF;
          box-shadow: 0 0 0 4px var(--primary-dim);
        }
      `}</style>
    </div>
  );
}
