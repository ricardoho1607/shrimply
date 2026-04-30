"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Waves, 
  Search, 
  MoreHorizontal, 
  Trash2, 
  Calendar, 
  Scale, 
  Users, 
  X,
  Loader2,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useLanguage } from '@/contexts/LanguageContext';
import ConfirmationModal from '@/components/ConfirmationModal';

/* ─── Types ─────────────────────────────────────────────────── */
interface Sampling {
  id: string; date: string; mbw: number; mortality: number; feed: number;
}

interface Pond {
  id: string; pondName: string; pondArea: number; density: number; initialPopulation: number;
  docStart: string; supplier: string; initialWeight: number; samplings: Sampling[];
  totalHarvestedBiomass?: number; totalHarvestedPopulation?: number;
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
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return 'Last synced today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Last synced yesterday';
  return `Last synced ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)}`;
};

export default function PondsPage() {
  const { t } = useLanguage();
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  
  const [isModalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    pondName: '',
    pondArea: '',
    density: '',
    docStart: new Date().toISOString().split('T')[0],
    supplier: '',
    plValue: '0.5'
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null
  });
  const [isDeleting, setIsDeleting] = useState(false);

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
              const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pond));
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

  const handleAddPond = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !user) return;

    try {
      const initialPopulation = Number(formData.pondArea) * Number(formData.density);
      const initialWeight = parseFloat(formData.plValue) / 10; // Simple conversion logic from mobile app

      const pondData = {
        pondName: formData.pondName,
        pondArea: Number(formData.pondArea),
        density: Number(formData.density),
        initialPopulation,
        docStart: formData.docStart,
        supplier: formData.supplier,
        initialWeight,
        samplings: [],
        totalHarvestedBiomass: 0,
        totalHarvestedPopulation: 0,
        totalHarvestedFeed: 0,
        createdAt: serverTimestamp(),
        createdBy: user.uid
      };

      await addDoc(collection(db, 'companies', companyId, 'ponds'), pondData);
      setModalOpen(false);
      setFormData({
        pondName: '',
        pondArea: '',
        density: '',
        docStart: new Date().toISOString().split('T')[0],
        supplier: '',
        plValue: '0.5'
      });
    } catch (error) {
      console.error('Error adding pond:', error);
      alert(t.messages.error || 'Failed to add pond. Please check your connection.');
    }
  };

  const handleDeletePond = async (pondId: string) => {
    setDeleteConfirm({ isOpen: true, id: pondId });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id || !companyId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'companies', companyId, 'ponds', deleteConfirm.id));
      setDeleteConfirm({ isOpen: false, id: null });
    } catch (error) {
      console.error('Error deleting pond:', error);
      alert(t.messages.error || 'Failed to delete pond.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredPonds = useMemo(() => {
    return ponds.filter(p => p.pondName.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [ponds, searchTerm]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '48px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Toolbar */}
      <div className="glass-card animate-fade-up animate-delay-1" style={{ padding: '18px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
          <input 
            placeholder={t.ponds.searchPlaceholder || "Search ponds by name..."} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: 'var(--bg-mid)', border: '1px solid var(--border)', borderRadius: '12px',
              padding: '12px 16px 12px 48px', width: '100%', fontSize: '15px', outline: 'none',
              fontWeight: 600, color: 'var(--text-primary)', transition: 'all 0.2s'
            }}
            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>
        <div style={{ display: 'flex', gap: '10px', background: 'var(--bg-mid)', padding: '6px', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <button style={{ 
            padding: '8px 20px', borderRadius: '10px', background: 'var(--glass-bg)', 
            border: '1px solid var(--border)', fontSize: '13px', fontWeight: 700, 
            color: 'var(--primary)', boxShadow: 'var(--shadow-card)' 
          }}>
            {t.ponds.active || 'Active'}
          </button>
          <button style={{ 
            padding: '8px 20px', borderRadius: '10px', background: 'transparent', 
            border: 'none', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' 
          }}>
            {t.ponds.harvested || 'Harvested'}
          </button>
        </div>
        <button className="dashboard-action dashboard-action-primary" onClick={() => setModalOpen(true)}>
          <Plus size={20} strokeWidth={3} />
          <span>{t.ponds.addNew || 'Add New Pond'}</span>
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
          <Loader2 className="animate-spin" size={40} color="var(--primary)" />
        </div>
      ) : filteredPonds.length === 0 ? (
        <div className="glass-card animate-fade-up animate-delay-2" style={{ padding: '80px 40px', textAlign: 'center' }}>
          <div style={{ 
            width: '80px', height: '80px', borderRadius: '24px', background: 'var(--primary-dim)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)',
            margin: '0 auto 24px'
          }}>
            <Waves size={40} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px' }}>{t.ponds.noPondsFound || 'No Ponds Found'}</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '32px', maxWidth: '400px', margin: '0 auto 32px', lineHeight: 1.6 }}>
            {t.ponds.noPondsSubtitle || 'Get started by adding your first shrimp pond to the system.'}
          </p>
          <button className="btn-primary" onClick={() => setModalOpen(true)}>
            <Plus size={20} strokeWidth={3} />
            {t.ponds.addNew || 'Add New Pond'}
          </button>
        </div>
      ) : (
        <div className="animate-fade-up animate-delay-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {filteredPonds.map(pond => (
            <div key={pond.id} className="glass-card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link href={`/dashboard/ponds/detail?id=${pond.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ 
                    width: '46px', height: '46px', borderRadius: '12px', background: 'var(--gradient-dim)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' 
                  }}>
                    <Waves size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.12rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{pond.pondName}</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{pond.supplier}</p>
                  </div>
                </Link>
                <button 
                  onClick={() => handleDeletePond(pond.id)}
                  style={{ 
                    background: 'var(--bg-mid)', border: 'none', color: '#ef4444', 
                    cursor: 'pointer', padding: '8px', borderRadius: '10px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#ef444414';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'var(--bg-mid)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
              
              <div style={{ padding: '22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t.ponds.area || 'Pond Area'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ color: 'var(--primary)' }}><Scale size={18} /></div>
                    <span style={{ fontSize: '1rem', fontWeight: 800 }}>{pond.pondArea} m²</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t.ponds.density || 'Density'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ color: 'var(--primary)' }}><Users size={18} /></div>
                    <span style={{ fontSize: '1rem', fontWeight: 800 }}>{pond.density} <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>PL/m²</span></span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t.ponds.started || 'Started'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ color: 'var(--primary)' }}><Calendar size={18} /></div>
                    <span style={{ fontSize: '0.98rem', fontWeight: 800 }}>{new Date(pond.docStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t.ponds.population || 'Population'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ fontSize: '18px' }}>🦐</div>
                    <span style={{ fontSize: '1rem', fontWeight: 800 }}>{pond.initialPopulation.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px 22px', background: 'var(--bg-mid)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  {t.ponds.lastSampled || 'Last sampled'}: <span style={{ color: 'var(--text-faint)' }}>{t.ponds.never || 'Never'}</span>
                </span>
                <Link href={`/dashboard/ponds/detail?id=${pond.id}`} style={{ textDecoration: 'none' }}>
                  <button style={{ 
                    background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: 800, 
                    fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                    transition: 'all 0.2s'
                  }} onMouseEnter={e => e.currentTarget.style.gap = '10px'} onMouseLeave={e => e.currentTarget.style.gap = '6px'}>
                    {t.ponds.viewDetails || 'View Details'} <ArrowRight size={16} />
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL ───────────────────────────────────────────── */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
        }}>
          <div className="glass-card animate-fade-up" style={{ 
            width: '100%', maxWidth: '640px', background: '#FFFFFF', padding: '0', 
            overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.2)'
          }}>
            <div style={{ padding: '32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{t.ponds.addNew || 'Add New Pond'}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>{t.ponds.initializeCycle || 'Initialize a new cultivation cycle.'}</p>
              </div>
              <button 
                onClick={() => setModalOpen(false)} 
                style={{ 
                  background: 'var(--bg-mid)', border: 'none', borderRadius: '12px', 
                  padding: '10px', cursor: 'pointer', transition: 'all 0.2s' 
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-mid)'}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddPond} style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.ponds.pondName || 'Pond Name'}</label>
                  <input 
                    required placeholder={t.ponds.pondNamePlaceholder || "e.g. Pond Alpha 1"} 
                    value={formData.pondName}
                    onChange={e => setFormData({...formData, pondName: e.target.value})}
                    style={{ 
                      padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border)', 
                      background: 'var(--bg-mid)', outline: 'none', fontSize: '1rem', fontWeight: 600,
                      transition: 'all 0.2s'
                    }}
                    onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.background = '#FFF'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--bg-mid)'; }}
                  />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.ponds.area || 'Pond Area'} (m²)</label>
                  <input 
                    required type="number" placeholder="1000" 
                    value={formData.pondArea}
                    onChange={e => setFormData({...formData, pondArea: e.target.value})}
                    style={{ 
                      padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border)', 
                      background: 'var(--bg-mid)', outline: 'none', fontSize: '1rem', fontWeight: 600 
                    }}
                    onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.background = '#FFF'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--bg-mid)'; }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.ponds.density || 'Density'} (PL/m²)</label>
                  <input 
                    required type="number" placeholder="100" 
                    value={formData.density}
                    onChange={e => setFormData({...formData, density: e.target.value})}
                    style={{ 
                      padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border)', 
                      background: 'var(--bg-mid)', outline: 'none', fontSize: '1rem', fontWeight: 600 
                    }}
                    onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.background = '#FFF'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--bg-mid)'; }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.ponds.stockingDate || 'Stocking Date'}</label>
                  <input 
                    required type="date" 
                    value={formData.docStart}
                    onChange={e => setFormData({...formData, docStart: e.target.value})}
                    style={{ 
                      padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border)', 
                      background: 'var(--bg-mid)', outline: 'none', fontSize: '1rem', fontWeight: 600 
                    }}
                    onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.background = '#FFF'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--bg-mid)'; }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.ponds.plValue || 'PL Value'} (g)</label>
                  <input 
                    required type="number" step="0.1" placeholder="0.5" 
                    value={formData.plValue}
                    onChange={e => setFormData({...formData, plValue: e.target.value})}
                    style={{ 
                      padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border)', 
                      background: 'var(--bg-mid)', outline: 'none', fontSize: '1rem', fontWeight: 600 
                    }}
                    onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.background = '#FFF'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--bg-mid)'; }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.ponds.plSupplier || 'PL Supplier'}</label>
                  <input 
                    required placeholder={t.ponds.plSupplierPlaceholder || "e.g. CP Prima, Charoen Pokphand"} 
                    value={formData.supplier}
                    onChange={e => setFormData({...formData, supplier: e.target.value})}
                    style={{ 
                      padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border)', 
                      background: 'var(--bg-mid)', outline: 'none', fontSize: '1rem', fontWeight: 600 
                    }}
                    onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.background = '#FFF'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--bg-mid)'; }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '12px', display: 'flex', gap: '20px' }}>
                <button type="button" onClick={() => setModalOpen(false)} style={{ 
                  flex: 1, padding: '16px', borderRadius: '14px', border: '1px solid var(--border)', 
                  background: 'transparent', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' 
                }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-mid)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  {t.common.cancel || 'Cancel'}
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '16px', borderRadius: '14px' }}>
                  {t.ponds.addNew || 'Add Pond'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal 
        isOpen={deleteConfirm.isOpen}
        title="Delete Pond?"
        message={t.ponds.deleteConfirm}
        confirmText="Delete Pond"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
        isLoading={isDeleting}
      />
    </div>

  );
}
