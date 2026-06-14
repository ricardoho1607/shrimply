"use client";

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { 
  Search, 
  MapPin, 
  Users, 
  Waves, 
  Plus, 
  Check, 
  Loader2,
  ShieldCheck,
  Star,
  ChevronRight,
  TrendingUp,
  Activity,
  AlertCircle
} from 'lucide-react';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import ConfirmationModal from '@/components/ConfirmationModal';
import { getErrorMessage, withTimeout } from '@/lib/asyncUtils';

export default function SuppliersPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [companies, setCompanies] = useState<any[]>([]);
  const [monitoredIds, setMonitoredIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestSearchId = useRef(0);

  const [pondCounts, setPondCounts] = useState<Record<string, number>>({});

  const [monitorConfirm, setMonitorConfirm] = useState<{ isOpen: boolean; company: any | null }>({
    isOpen: false,
    company: null
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchCompanies = useCallback(async (search: string = '') => {
    const requestId = latestSearchId.current + 1;
    latestSearchId.current = requestId;
    setSearching(true);
    setError(null);
    try {
      const q = query(collection(db, 'companies'), where('isPublicProfile', '==', true));
      // Firestore doesn't support complex text search well without Algolia,
      // so we'll fetch public ones and filter in memory for now if search term exists.
      const snapshot = await withTimeout(getDocs(q), 12000, 'Supplier search is taking too long. Please try again.');
      if (latestSearchId.current !== requestId) return;
      let data: any[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (search) {
        data = data.filter(c =>
          c.companyName?.toLowerCase().includes(search.toLowerCase()) ||
          c.location?.toLowerCase().includes(search.toLowerCase())
        );
      }

      setCompanies(data);
    } catch (error: unknown) {
      if (latestSearchId.current === requestId) {
        const message = getErrorMessage(error, 'Unable to load suppliers right now.');
        console.error('Error fetching companies:', error);
        setError(message);
        setCompanies([]);
      }
    } finally {
      if (latestSearchId.current === requestId) {
        setLoading(false);
        setSearching(false);
      }
    }
  }, []);

  useEffect(() => {
    // Initial fetch of public companies
    queueMicrotask(() => fetchCompanies());
    
    // Listen to monitored companies
    if (user?.uid) {
      const q = query(collection(db, 'users', user.uid, 'monitoredCompanies'));
      const unsub = onSnapshot(q, (snapshot) => {
        const ids = new Set(snapshot.docs.map(doc => doc.id));
        setMonitoredIds(ids);
      });
      return () => unsub();
    }
  }, [fetchCompanies, user]);

  // Fetch pond counts when companies list changes
  useEffect(() => {
    const fetchCounts = async () => {
      const counts: Record<string, number> = { ...pondCounts };
      for (const company of companies) {
        if (counts[company.id] === undefined) {
          try {
            const pondSnap = await getDocs(collection(db, 'companies', company.id, 'ponds'));
            counts[company.id] = pondSnap.size;
          } catch (e) {
            counts[company.id] = 0;
          }
        }
      }
      setPondCounts(counts);
    };

    if (companies.length > 0) {
      fetchCounts();
    }
  }, [companies]);

  const handleMonitor = async (company: any) => {
    if (!user) return;
    const isMonitored = monitoredIds.has(company.id);
    
    if (isMonitored) {
      setMonitorConfirm({ isOpen: true, company });
      return;
    }

    try {
      await withTimeout(setDoc(doc(db, 'users', user.uid, 'monitoredCompanies', company.id), {
        companyName: company.companyName,
        location: company.location || company.primaryLocation?.address || t.buyer.unknownLocation || 'Unknown Location',
        monitoredAt: new Date().toISOString(),
      }), 12000, 'Updating monitoring status is taking too long. Please try again.');
    } catch (error: unknown) {
      alert(getErrorMessage(error, t.buyer.monitorError || 'Failed to update monitoring status'));
    }
  };

  const confirmStopMonitoring = async () => {
    if (!user || !monitorConfirm.company) return;
    setIsUpdating(true);
    try {
      await withTimeout(deleteDoc(doc(db, 'users', user.uid, 'monitoredCompanies', monitorConfirm.company.id)), 12000, 'Stopping monitoring is taking too long. Please try again.');
      setMonitorConfirm({ isOpen: false, company: null });
    } catch (error: unknown) {
      alert(getErrorMessage(error, t.buyer.stopMonitoringError || 'Failed to stop monitoring'));
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '32px', marginBottom: '8px', letterSpacing: '-0.03em' }}>{t.buyer.marketplaceTitle}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>{t.buyer.marketplaceSubtitle}</p>
        </div>
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', background: '#FEF3F2', border: '1px solid #FECDCA', borderRadius: '16px', padding: '14px 18px', fontSize: '14px', fontWeight: 700 }}>
          {error}
        </div>
      )}

      <div style={{ position: 'relative', maxWidth: '600px' }}>
        <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} size={20} />
        <input 
          type="text" 
          placeholder={t.buyer.searchPlaceholder} 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchCompanies(searchTerm)}
          style={{
            width: '100%', padding: '16px 16px 16px 48px', borderRadius: '16px',
            border: '1px solid var(--border)', background: '#FFF', outline: 'none',
            fontSize: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', transition: 'all 0.2s'
          }}
        />
        {searching && <Loader2 className="animate-spin" size={20} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
        {companies.map(company => (
          <div key={company.id} className="glass-card supplier-card" style={{ padding: '32px', background: '#FFF', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ 
                  width: '56px', height: '56px', borderRadius: '16px', 
                  background: 'var(--primary-dim)', color: 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' 
                }}>
                  <Waves size={28} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h4 style={{ fontSize: '18px', fontWeight: 800 }}>{company.companyName}</h4>
                    <ShieldCheck size={16} color="#27ae60" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    <MapPin size={14} />
                    {company.location || company.primaryLocation?.address || t.buyer.unknownLocation || 'Unknown Location'}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '12px', borderRadius: '12px', background: 'var(--bg-mid)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  <TrendingUp size={12} />
                  {t.buyer.farmType}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {company.farmType || t.buyer.defaultFarmType || 'Shrimp Farm'}
                </div>
              </div>
              <div style={{ padding: '12px', borderRadius: '12px', background: 'var(--bg-mid)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  <Activity size={12} />
                  {t.buyer.ponds}
                </div>
                <div style={{ fontSize: '15px', fontWeight: 800 }}>{pondCounts[company.id] ?? '...'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ padding: '4px 10px', borderRadius: '6px', background: 'var(--primary-dim)', fontSize: '11px', fontWeight: 700, color: 'var(--primary)' }}>
                {company.businessSize || t.buyer.verified}
              </span>
              {company.isVerified && (
                <span style={{ padding: '4px 10px', borderRadius: '6px', background: '#e8f5e9', fontSize: '11px', fontWeight: 700, color: '#2e7d32', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={12} /> {t.buyer.trusted}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
              <button 
                onClick={() => handleMonitor(company)}
                style={{ 
                  flex: 1, padding: '12px', borderRadius: '12px', 
                  background: monitoredIds.has(company.id) ? 'var(--primary-dim)' : 'var(--bg-mid)',
                  color: monitoredIds.has(company.id) ? 'var(--primary)' : 'var(--text-primary)',
                  border: '1px solid',
                  borderColor: monitoredIds.has(company.id) ? 'var(--primary)' : 'var(--border)',
                  fontWeight: 700, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                {monitoredIds.has(company.id) ? (
                  <>
                    <Check size={18} />
                    {t.buyer.monitoring}
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    {t.buyer.monitorFarm}
                  </>
                )}
              </button>
              <button style={{ 
                padding: '12px', borderRadius: '12px', background: 'var(--primary)', color: '#FFF', 
                border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s'
              }}>
                {t.buyer.viewProfile}
              </button>
            </div>
          </div>
        ))}
      </div>

      {companies.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '100px 40px', color: 'var(--text-muted)' }}>
          <Search size={64} style={{ margin: '0 auto 24px', opacity: 0.1 }} />
          <h4 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>{t.buyer.noSuppliersFound}</h4>
          <p>{t.buyer.adjustSearch}</p>
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
          <Loader2 className="animate-spin" size={40} color="var(--primary)" />
        </div>
      )}

      <ConfirmationModal 
        isOpen={monitorConfirm.isOpen}
        title={t.buyer.stopMonitoring}
        message={t.buyer.stopMonitoringDescription.replace('{companyName}', monitorConfirm.company?.companyName || '')}
        confirmText={t.buyer.stopMonitoring}
        onConfirm={confirmStopMonitoring}
        onCancel={() => setMonitorConfirm({ isOpen: false, company: null })}
        isLoading={isUpdating}
      />

      <style jsx>{`
        .supplier-card { transition: all 0.3s ease; }
        .supplier-card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.08); border-color: var(--primary); }
      `}</style>
    </div>
  );
}
