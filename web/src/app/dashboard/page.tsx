"use client";

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Waves, 
  Scale, 
  Users, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  ChevronRight,
  Activity,
  Droplets,
  Zap,
  BrainCircuit,
  Loader2,
  LayoutGrid,
  List,
  Clock,
  Minus,
  Building2,
  Brain,
  Thermometer,
  Utensils,
  ShoppingBag,
  Check,
  FileText
} from 'lucide-react';
import Link from 'next/link';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  useCompanyPonds,
  useMarketplaceListings,
  useMonitoredCompanies,
} from '@/hooks/useDashboardData';

/* ─── Types ─────────────────────────────────────────────────── */
interface FeedData {
  ancoPercentage: string;
  totalDailyFeed: string;
  anco1?: string; anco2?: string; anco3?: string; anco4?: string;
}

interface Sampling {
  id: string; 
  date: string; 
  mbw: number; 
  mortality: number; 
  feed: number;
  phMorning?: string;
  phEvening?: string;
  doMorning?: string;
  doEvening?: string;
  transparency?: string;
  salinity?: string;
  temp?: string;
  feedData?: FeedData;
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
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    const parsed = value.toDate();
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000);
  }
  return null;
};

const formatSyncStatus = (date: Date | null): string => {
  if (!date) return 'Sync status unavailable';

  const now = new Date();
  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isSameDay) return 'Last synced today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (isYesterday) return 'Last synced yesterday';

  return `Last synced ${new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(date)}`;
};

/* ─── Calculation Utilities ─────────────────────────────────── */

const getFRFromMBW = (mbw: number): number | null => {
  const frTable = [
    { mbw: 0.01, fr: null }, { mbw: 0.65, fr: null }, { mbw: 1.65, fr: 6.50 }, { mbw: 3.00, fr: 6.50 }, { mbw: 5.00, fr: 5.50 },
    { mbw: 7.50, fr: 4.20 }, { mbw: 10.50, fr: 3.60 }, { mbw: 14.00, fr: 3.30 }, { mbw: 17.50, fr: 3.10 }, { mbw: 21.00, fr: 2.90 },
    { mbw: 25.00, fr: 2.70 }, { mbw: 29.00, fr: 2.50 }, { mbw: 33.00, fr: 2.30 }
  ];
  if (mbw > 33.00) return 2.10;
  for (let i = 0; i < frTable.length - 1; i++) {
    const current = frTable[i];
    const next = frTable[i + 1];
    if (current.fr === null) continue;
    if (mbw <= current.mbw) return current.fr;
    if (mbw >= current.mbw && mbw <= next.mbw && next.fr !== null) {
      const ratio = (mbw - current.mbw) / (next.mbw - current.mbw);
      return current.fr + ratio * (next.fr - current.fr);
    }
  }
  return frTable[frTable.length - 1].fr;
};

const calculateMetrics = (pond: Pond) => {
  const samplings = pond.samplings || [];
  const validSamplings = samplings.filter(s => s.mbw > 0 || s.mortality > 0 || s.feed > 0 || s.feedData);
  
  if (validSamplings.length === 0) {
    return {
      biomass: (pond.initialPopulation * (pond.initialWeight || 0.5)) / 1000,
      population: pond.initialPopulation,
      sr: 100,
      doc: Math.floor((Date.now() - new Date(pond.docStart).getTime()) / (1000 * 60 * 60 * 24)),
      size: 0,
      mbw: pond.initialWeight || 0.5,
      adg: 0,
      latest: {},
      latestValid: null
    };
  }

  const sorted = [...validSamplings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const latest = sorted[sorted.length - 1];
  
  // Find latest valid entry for biological projection
  const latestValid = sorted.filter(s => {
    const feedVal = s.feed || parseFloat(s.feedData?.totalDailyFeed || '0');
    return s.mbw > 0 && feedVal > 0;
  }).reverse()[0];

  let population = pond.initialPopulation;
  if (latestValid) {
    const fr = getFRFromMBW(latestValid.mbw);
    const feedVal = latestValid.feed || parseFloat(latestValid.feedData?.totalDailyFeed || '0');
    if (fr && feedVal > 0) {
      population = Math.round(((feedVal / fr) / latestValid.mbw) * 100000);
    }
  } else {
    const totalMortality = sorted.reduce((sum, s) => sum + (s.mortality || 0), 0);
    population = Math.max(0, pond.initialPopulation - totalMortality);
  }

  const lastRecordedMBW = [...sorted].reverse().find(s => s.mbw > 0)?.mbw || pond.initialWeight || 0.5;
  population = Math.max(0, population - (pond.totalHarvestedPopulation || 0));
  const biomass = (population * lastRecordedMBW) / 1000;
  const sr = (population / pond.initialPopulation) * 100;
  const doc = Math.floor((Date.now() - new Date(pond.docStart).getTime()) / (1000 * 60 * 60 * 24));
  const size = lastRecordedMBW > 0 ? Math.round(1000 / lastRecordedMBW) : 0;

  const adg = (() => {
    const validForADG = sorted.filter(s => s.mbw > 0);
    if (validForADG.length >= 2) {
      const s2 = validForADG[validForADG.length - 1];
      const s1 = validForADG[validForADG.length - 2];
      const days = Math.max(1, (new Date(s2.date).getTime() - new Date(s1.date).getTime()) / (1000 * 60 * 60 * 24));
      return (s2.mbw - s1.mbw) / days;
    } else if (validForADG.length === 1) {
      const s1 = validForADG[0];
      const days = Math.max(1, (new Date(s1.date).getTime() - new Date(pond.docStart).getTime()) / (1000 * 60 * 60 * 24));
      return (s1.mbw - (pond.initialWeight || 0.5)) / days;
    }
    return 0;
  })();

    const phM = parseFloat(latest.phMorning || '0');
    const phE = parseFloat(latest.phEvening || '0');
    const ph = phM > 0 && phE > 0 ? (phM + phE) / 2 : (phM || phE || 7.7);
    const transparency = parseFloat(latest.transparency || '35');
    const temperature = parseFloat(latest.temp || '28.5');
    const dailyFeed = latest.feed || parseFloat(latest.feedData?.totalDailyFeed || '120');

    return {
      biomass,
      population,
      sr,
      doc,
      size,
      mbw: lastRecordedMBW,
      adg,
      latest,
      latestValid,
      ph,
      transparency,
      temperature,
      dailyFeed
    };
  };

/* ─── Sub-components ─────────────────────────────────────────── */

function SummaryCard({ label, value, trend, trendType, loading, icon: Icon }: any) {
  return (
    <div className="glass-card" style={{
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ 
          width: '42px', height: '42px', borderRadius: '12px', background: 'var(--primary-dim)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' 
        }}>
          {Icon && <Icon size={20} strokeWidth={2.5} />}
        </div>
        {trend && (
          <div style={{ 
            fontSize: '0.72rem', fontWeight: 800, 
            color: trendType === 'up' ? '#16a34a' : '#ef4444', 
            background: trendType === 'up' ? '#16a34a14' : '#ef444414',
            padding: '5px 10px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '4px'
          }}>
            {trendType === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {trend}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800 }}>
          {label}
        </span>
        {loading ? (
          <div style={{ height: '2.2rem', width: '60%', background: 'var(--bg-mid)', borderRadius: '8px', animation: 'pulse 2s infinite' }} />
        ) : (
          <div style={{ fontSize: '1.55rem', color: 'var(--text-primary)', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {value}
          </div>
        )}
      </div>
      
      {/* Subtle Background Icon Decoration */}
      <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.03, color: 'var(--primary)', transform: 'rotate(-15deg)' }}>
        {Icon && <Icon size={100} strokeWidth={1} />}
      </div>
    </div>
  );
}

function PondCard({ pond, calculateMetrics, t }: any) {
  const m = calculateMetrics(pond);
  const isHarvested = (pond.totalHarvestedPopulation || 0) >= (pond.initialPopulation * 0.9);
    const today = new Date().toISOString().split('T')[0];
    const todaySampling = pond.samplings?.find((s: any) => s.date === today);
    const wqPosted = !!(todaySampling?.phMorning || todaySampling?.phEvening || todaySampling?.doMorning || todaySampling?.doEvening);
    const feedPosted = !!(todaySampling?.feed || todaySampling?.feedData?.totalDailyFeed);

  return (
    <Link href={`/dashboard/ponds/detail?id=${pond.id}`} style={{ textDecoration: 'none' }}>
      <div className="glass-card" style={{
        padding: '22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ 
              width: '42px', height: '42px', borderRadius: '12px', background: 'var(--gradient-dim)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)',
              border: '1px solid var(--border)'
            }}>
              <Waves size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1.12rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '2px', letterSpacing: '-0.02em' }}>
                {pond.pondName}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="ping" style={{ 
                  width: '7px', height: '7px', borderRadius: '50%', 
                  background: isHarvested ? '#64748b' : '#16a34a' 
                }} />
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {isHarvested ? 'Harvested' : `Active • DOC ${m.doc}`}
                </span>
              </div>
            </div>
          </div>
          <div style={{ padding: '6px', borderRadius: '10px', background: 'var(--bg-mid)', color: 'var(--text-faint)' }}>
            <ChevronRight size={18} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-faint)', letterSpacing: '0.12em', fontWeight: 800 }}>Avg Weight</span>
            <span style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {m.mbw.toFixed(1)}<span style={{ fontSize: '0.8rem', fontWeight: 700, marginLeft: '2px' }}>g</span>
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-faint)', letterSpacing: '0.12em', fontWeight: 800 }}>Survival</span>
            <span style={{ fontSize: '1rem', color: m.sr > 85 ? '#16a34a' : '#ef4444', fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {m.sr.toFixed(1)}<span style={{ fontSize: '0.8rem', fontWeight: 700, marginLeft: '2px' }}>%</span>
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-faint)', letterSpacing: '0.12em', fontWeight: 800 }}>Biomass</span>
            <span style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {m.biomass.toLocaleString(undefined, {maximumFractionDigits:0})}<span style={{ fontSize: '0.8rem', fontWeight: 700, marginLeft: '2px' }}>kg</span>
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-faint)', letterSpacing: '0.12em', fontWeight: 800 }}>ADG</span>
            <span style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {m.adg.toFixed(2)}<span style={{ fontSize: '0.8rem', fontWeight: 700, marginLeft: '2px' }}>g/d</span>
            </span>
          </div>
        </div>

        <div style={{ marginTop: '2px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
              <div style={{ 
                width: '18px', height: '18px', borderRadius: '50%', 
                background: wqPosted ? 'rgba(22, 163, 74, 0.1)' : 'var(--bg-mid)',
                color: wqPosted ? '#16a34a' : 'var(--text-faint)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: wqPosted ? '1px solid rgba(22, 163, 74, 0.2)' : '1px solid var(--border)',
                transition: 'all 0.3s ease'
              }}>
                {wqPosted ? <Check size={10} strokeWidth={4} /> : <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'currentColor' }} />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.58rem', fontWeight: 800, color: wqPosted ? 'var(--text-primary)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Water Quality</span>
                {wqPosted && <span style={{ fontSize: '0.52rem', color: '#16a34a', fontWeight: 700 }}>POSTED</span>}
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
              <div style={{ 
                width: '18px', height: '18px', borderRadius: '50%', 
                background: feedPosted ? 'rgba(22, 163, 74, 0.1)' : 'var(--bg-mid)',
                color: feedPosted ? '#16a34a' : 'var(--text-faint)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: feedPosted ? '1px solid rgba(22, 163, 74, 0.2)' : '1px solid var(--border)',
                transition: 'all 0.3s ease'
              }}>
                {feedPosted ? <Check size={10} strokeWidth={4} /> : <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'currentColor' }} />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.58rem', fontWeight: 800, color: feedPosted ? 'var(--text-primary)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Feed status</span>
                {feedPosted && <span style={{ fontSize: '0.52rem', color: '#16a34a', fontWeight: 700 }}>COMPLETED</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ─── Buyer Components ───────────────────────────────────────── */

function BuyerDashboard({ t, user }: any) {
  const { formatCurrency } = useCurrency();
  const { data: listings } = useMarketplaceListings<any>();
  const { data: monitoredCompanies, loading } = useMonitoredCompanies<any>();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const marketPrices = useMemo(() => {
    const prices: Record<'size30' | 'size50' | 'size100', number[]> = {
      size30: [],
      size50: [],
      size100: [],
    };

    listings.forEach((listing: any) => {
      if (listing.status !== 'active' || !listing.priceList) return;
      if (listing.priceList.size30) prices.size30.push(Number(listing.priceList.size30));
      if (listing.priceList.size50) prices.size50.push(Number(listing.priceList.size50));
      if (listing.priceList.size100) prices.size100.push(Number(listing.priceList.size100));
    });

    const avg = (values: number[]) => values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    return {
      size30: avg(prices.size30),
      size50: avg(prices.size50),
      size100: avg(prices.size100),
    };
  }, [listings]);

  const handleRemoveMonitor = async (e: React.MouseEvent, companyId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmDelete(companyId);
  };

  const executeDelete = async () => {
    if (!user?.uid || !confirmDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'monitoredCompanies', confirmDelete));
      setConfirmDelete(null);
    } catch (error) {
      alert(t.buyer.stopMonitoringError || 'Failed to remove farm');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
      
      {/* Confirmation Modal */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(27, 38, 44, 0.4)', backdropFilter: 'blur(10px)' }}>
          <div className="glass-card animate-fade-up" style={{ width: '400px', background: '#FFF', padding: '48px', textAlign: 'center', borderRadius: 'var(--radius-xl)' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
              <Minus size={36} />
            </div>
            <h3 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '14px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{t.buyer.stopMonitoring}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.6, marginBottom: '40px' }}>
              {t.buyer.stopMonitoringDescription}
            </p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary" style={{ flex: 1 }} disabled={isDeleting}>
                {t.actions.cancel}
              </button>
              <button onClick={executeDelete} className="btn-primary" style={{ flex: 1, background: '#ef4444' }} disabled={isDeleting}>
                {isDeleting ? <Loader2 className="animate-spin" size={20} /> : (t.actions.delete || 'Remove')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="animate-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div className="section-label" style={{ marginBottom: '16px' }}>Market Overview</div>
          <h1 style={{ fontSize: 'clamp(2.5rem, 4vw, 3.5rem)', letterSpacing: '-0.05em', lineHeight: 1 }}>
            {t.buyer.dashboardTitle.split(' ')[0]},<br />
            <span className="text-gradient">{user?.name?.split(' ')[0] || 'Buyer'}</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Link href="/dashboard/suppliers">
            <button className="btn-primary">
              <Plus size={20} strokeWidth={3} />
              {t.buyer.findSuppliers}
            </button>
          </Link>
        </div>
      </div>

      <div className="animate-fade-up animate-delay-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <SummaryCard label={t.buyer.monitoredSuppliers} value={monitoredCompanies.length.toString()} icon={Users} loading={loading} />
        <SummaryCard label={t.buyer.totalAvailableBiomass} value={`${Math.round(monitoredCompanies.reduce((sum: number, c: any) => sum + (c.totalBiomass || 0), 0)).toLocaleString()} ${t.common.kg}`} icon={TrendingUp} loading={loading} />
        <SummaryCard label={t.buyer.avgSupplierDOC} value={`${Math.round(monitoredCompanies.reduce((sum: number, c: any) => sum + (c.avgDOC || 0), 0) / Math.max(1, monitoredCompanies.length))} ${t.common.days}`} icon={Clock} loading={loading} />
        <SummaryCard label={t.buyer.avgMarketSize} value={`${Math.round(monitoredCompanies.reduce((sum: number, c: any) => sum + (c.avgSize || 0), 0) / Math.max(1, monitoredCompanies.length))} ${t.common.pcsKg}`} icon={Scale} loading={loading} />
      </div>

      <div className="animate-fade-up animate-delay-2" style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '40px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.03em' }}>{t.buyer.monitoredSuppliers}</h3>
          </div>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
              <Loader2 className="animate-spin" size={48} color="var(--primary)" />
            </div>
          ) : monitoredCompanies.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '100px 48px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'var(--bg-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', color: 'var(--text-faint)' }}>
                <Users size={40} />
              </div>
              <h4 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '12px' }}>{t.buyer.noSuppliersMonitored}</h4>
              <p style={{ color: 'var(--text-muted)', marginBottom: '40px', maxWidth: '400px', margin: '0 auto 40px' }}>{t.buyer.searchFarmsDescription}</p>
              <Link href="/dashboard/suppliers">
                <button className="btn-primary" style={{ padding: '16px 40px' }}>{t.buyer.findSuppliers}</button>
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '32px' }}>
              {monitoredCompanies.map(company => (
                <div key={company.id} className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '18px' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'var(--gradient-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', border: '1px solid var(--border)' }}>
                        <Building2 size={28} />
                      </div>
                      <div>
                        <h4 style={{ fontWeight: 900, fontSize: '1.3rem', color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '-0.02em' }}>{company.companyName}</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700 }}>{company.location}</p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => handleRemoveMonitor(e, company.id)} 
                      style={{ color: '#ef4444', padding: '10px', borderRadius: '12px', background: 'var(--bg-mid)', border: 'none', transition: 'all 0.2s', cursor: 'pointer' }}
                    >
                      <Minus size={20} strokeWidth={3} />
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ padding: '20px', borderRadius: '20px', background: 'var(--bg-mid)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-faint)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>{t.buyer.avgDOC}</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{company.avgDOC || 0} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>days</span></div>
                    </div>
                    <div style={{ padding: '20px', borderRadius: '20px', background: 'var(--bg-mid)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-faint)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>{t.buyer.avgSize}</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{company.avgSize || 0} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>pcs/kg</span></div>
                    </div>
                  </div>

                  <div style={{ padding: '24px', borderRadius: '20px', background: 'var(--gradient)', boxShadow: 'var(--shadow-glow)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'relative', zIndex: 2 }}>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px' }}>{t.buyer.estBiomass}</div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#FFF', letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{Math.round(company.totalBiomass || 0).toLocaleString()} <span style={{ fontSize: '1rem', fontWeight: 700 }}>kg</span></div>
                    </div>
                    <Waves size={80} style={{ position: 'absolute', right: '-10px', bottom: '-20px', color: 'white', opacity: 0.1, transform: 'rotate(-10deg)' }} />
                  </div>

                  <button className="btn-secondary" style={{ width: '100%', padding: '16px', borderRadius: '14px', fontWeight: 800 }}>{t.buyer.viewFarmDetails}</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div className="glass-card" style={{ padding: '32px' }}>
            <h4 style={{ fontWeight: 900, fontSize: '1.3rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.02em' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <TrendingUp size={22} />
              </div> 
              {t.buyer.marketInsights}
            </h4>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '32px', fontWeight: 500 }}>
              {t.buyer.marketInsightsDescription.replace('{days}', Math.round(monitoredCompanies.reduce((sum, c) => sum + (c.avgDOC || 0), 0) / (monitoredCompanies.length || 1)).toString())}
            </p>
            <Link href="/dashboard/marketplace">
              <button className="btn-primary" style={{ width: '100%', borderRadius: '14px' }}>{t.buyer.viewMarketplace}</button>
            </Link>
          </div>
          
          <div className="glass-card" style={{ padding: '32px' }}>
            <h4 style={{ fontWeight: 900, fontSize: '1.3rem', marginBottom: '28px', letterSpacing: '-0.02em' }}>{t.buyer.priceIndex}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {[
                { label: `${t.shrimp.size} 30`, price: marketPrices.size30 },
                { label: `${t.shrimp.size} 50`, price: marketPrices.size50 },
                { label: `${t.shrimp.size} 100`, price: marketPrices.size100 },
              ].filter(item => item.price > 0).map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderRadius: '20px', background: 'var(--bg-mid)', border: '1px solid var(--border)', transition: 'transform 0.2s' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{item.label}</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--primary)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{formatCurrency(item.price)}</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)' }}>Market Avg</div>
                  </div>
                </div>
              ))}
              {Object.values(marketPrices).every(v => v === 0) && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-faint)', fontSize: '0.9rem' }}>
                  No active listings for price index
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */

export default function DashboardPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { data: ponds, loading: pondsLoading } = useCompanyPonds<Pond>('asc');
  const userData = user;
  const loading = authLoading || !userData || (userData.role !== 'buyer' && pondsLoading);

  const totalMetrics = useMemo(() => {
    let currentBiomass = 0; let currentSR = 0; let currentPop = 0;
    let prevBiomass = 0; let prevSR = 0; let prevPop = 0;

    ponds.forEach(pond => {
      const samplings = pond.samplings || [];
      const sorted = [...samplings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const m = calculateMetrics(pond);
      currentBiomass += m.biomass; currentSR += m.sr; currentPop += m.population;

      if (sorted.length >= 2) {
        const prevSampling = sorted[sorted.length - 2];
        const prevValid = sorted.slice(0, -1).filter(s => s.mbw > 0 && s.feed > 0).reverse()[0];
        let pPop = pond.initialPopulation;
        if (prevValid) {
          const fr = getFRFromMBW(prevValid.mbw);
          if (fr && prevValid.feed > 0) pPop = Math.round(((prevValid.feed / fr) / prevValid.mbw) * 100000);
        } else {
          const totalMortalityBefore = sorted.slice(0, -1).reduce((sum, s) => sum + (s.mortality || 0), 0);
          pPop = Math.max(0, pond.initialPopulation - totalMortalityBefore);
        }
        prevBiomass += (pPop * (prevSampling.mbw || 0)) / 1000;
        prevSR += (pPop / pond.initialPopulation) * 100;
        prevPop += pPop;
      } else {
        prevBiomass += (pond.initialPopulation * (pond.initialWeight || 0.5)) / 1000;
        prevSR += 100; prevPop += pond.initialPopulation;
      }
    });

    const activeCount = ponds.filter(p => (p.totalHarvestedPopulation || 0) < (p.initialPopulation * 0.9)).length;
    const avgSR = activeCount > 0 ? (currentSR / activeCount) : 0;
    const oldAvgSR = activeCount > 0 ? (prevSR / activeCount) : 0;
    const biomassTrend = prevBiomass > 0 ? ((currentBiomass - prevBiomass) / prevBiomass) * 100 : 0;
    const srTrend = oldAvgSR > 0 ? (avgSR - oldAvgSR) : 0;
    const popTrend = prevPop > 0 ? ((currentPop - prevPop) / prevPop) * 100 : 0;

    return { biomass: currentBiomass, population: currentPop, sr: avgSR, activeCount, biomassTrend, srTrend, popTrend };
  }, [ponds]);

  const firstName = useMemo(() => {
    return userData?.name?.trim()?.split(' ')[0] || 'Captain';
  }, [userData]);

  const dashboardDateLabel = useMemo(() => {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(new Date());
  }, []);

  const lastSyncedLabel = useMemo(() => {
    const latestSync = ponds.reduce<Date | null>((latest, pond) => {
      const candidate = getTimestampDate(pond.updatedAt) || getTimestampDate(pond.createdAt);
      if (!candidate) return latest;
      if (!latest || candidate.getTime() > latest.getTime()) return candidate;
      return latest;
    }, null);

    return formatSyncStatus(latestSync);
  }, [ponds]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Loader2 className="animate-spin" size={48} color="var(--primary)" />
    </div>
  );

  if (userData?.role === 'buyer') return <BuyerDashboard t={t} user={userData} />;

  return (
    <div className="dashboard-page">
      
      {/* Header */}
      <div className="dashboard-hero animate-fade-up">
        <div className="dashboard-hero-copy">
          <div className="dashboard-hero-title-row">
            <h1 className="dashboard-hero-title">Welcome back, {firstName}</h1>
            <span className="dashboard-hero-date">{dashboardDateLabel}</span>
          </div>
        </div>
        <div className="dashboard-hero-actions">
          <Link href="/dashboard/reports/shrimp">
            <button className="dashboard-action dashboard-action-secondary">
              <FileText size={18} strokeWidth={2.2} />
              <span>View Reports</span>
            </button>
          </Link>
          <Link href="/dashboard/ponds">
            <button className="dashboard-action dashboard-action-primary">
              <Plus size={20} strokeWidth={3} />
              <span>New Pond</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Summary Row */}
      <div className="animate-fade-up animate-delay-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <SummaryCard label={t.shrimp.biomass} value={`${totalMetrics.biomass.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg`} trend={`${totalMetrics.biomassTrend >= 0 ? '+' : ''}${totalMetrics.biomassTrend.toFixed(1)}%`} trendType={totalMetrics.biomassTrend >= 0 ? 'up' : 'down'} icon={Scale} loading={loading} />
        <SummaryCard label={t.shrimp.survivalRate} value={`${totalMetrics.sr.toFixed(1)}%`} trend={`${totalMetrics.srTrend >= 0 ? '+' : ''}${totalMetrics.srTrend.toFixed(1)}%`} trendType={totalMetrics.srTrend >= 0 ? 'up' : 'down'} icon={TrendingUp} loading={loading} />
        <SummaryCard label={t.shrimp.population} value={totalMetrics.population.toLocaleString()} trend={`${totalMetrics.popTrend >= 0 ? '+' : ''}${totalMetrics.popTrend.toFixed(1)}%`} trendType={totalMetrics.popTrend >= 0 ? 'up' : 'down'} icon={Users} loading={loading} />
        <SummaryCard label="Active Ponds" value={totalMetrics.activeCount.toString()} icon={Waves} loading={loading} />
      </div>

      {/* Ponds Section with Insights Sidebar */}
      <div className="animate-fade-up animate-delay-2" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px', alignItems: 'start' }}>
        
        {/* Left Column: Ponds List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.04em' }}>Ponds</h3>
              <div style={{ 
                background: 'var(--primary-dim)', color: 'var(--primary)', padding: '4px 12px', 
                borderRadius: '100px', fontSize: '0.8rem', fontWeight: 800, border: '1px solid var(--border)' 
              }}>
                {ponds.length} ponds
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ display: 'flex', background: 'var(--bg-mid)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <button 
                  onClick={() => setViewMode('grid')}
                  style={{ 
                    padding: '8px 12px', borderRadius: '8px', border: 'none', 
                    background: viewMode === 'grid' ? 'white' : 'transparent',
                    color: viewMode === 'grid' ? 'var(--primary)' : 'var(--text-faint)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s',
                    boxShadow: viewMode === 'grid' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  <LayoutGrid size={18} />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  style={{ 
                    padding: '8px 12px', borderRadius: '8px', border: 'none', 
                    background: viewMode === 'list' ? 'white' : 'transparent',
                    color: viewMode === 'list' ? 'var(--primary)' : 'var(--text-faint)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s',
                    boxShadow: viewMode === 'list' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '0', overflow: 'hidden', border: viewMode === 'list' ? '1px solid var(--border)' : 'none', background: viewMode === 'list' ? 'white' : 'transparent', boxShadow: viewMode === 'list' ? 'var(--shadow-card)' : 'none' }}>
            {viewMode === 'list' && (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '2fr 1.5fr 1.5fr 1.5fr 1fr 0.5fr', 
                padding: '24px 32px',
                background: 'rgba(241, 245, 249, 0.5)',
                borderBottom: '1px solid var(--border)'
              }}>
                {['POND NAME', 'DOC', 'BIOMASS', 'SR (%)', 'SIZE', ''].map((label) => (
                  <span key={label} style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-faint)', letterSpacing: '0.05em' }}>{label}</span>
                ))}
              </div>
            )}
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(380px, 1fr))' : '1fr', 
              gap: viewMode === 'grid' ? '32px' : '0' 
            }}>
              {ponds.map((pond, idx) => {
                const m = calculateMetrics(pond);
                return viewMode === 'grid' ? (
                  <PondCard key={pond.id} pond={pond} calculateMetrics={calculateMetrics} t={t} />
                ) : (
                  <Link key={pond.id} href={`/dashboard/ponds/detail?id=${pond.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '2fr 1.5fr 1.5fr 1.5fr 1fr 0.5fr', 
                      padding: '16px 32px',
                      alignItems: 'center',
                      borderBottom: idx === ponds.length - 1 ? 'none' : '1px solid var(--border)',
                      transition: 'background 0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-dark)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '2px' }}>{pond.pondName}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', fontWeight: 600 }}>{pond.supplier || 'N/A'}</div>
                      </div>
                      
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>DOC {m.doc}</div>
                      
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {m.biomass.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg
                      </div>
                      
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#16a34a' }}>
                        {m.sr.toFixed(1)}%
                      </div>
                      
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {m.size || '-'}
                      </div>

                      <div style={{ textAlign: 'right', color: 'var(--text-faint)' }}>
                        <ChevronRight size={18} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Insights Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', position: 'sticky', top: '32px' }}>
          {/* Orson AI Insights Card */}
          <div style={{ 
            background: 'var(--gradient)', borderRadius: '32px', padding: '32px', color: 'white',
            position: 'relative', overflow: 'hidden', boxShadow: 'var(--shadow-glow)'
          }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.1 }}>
              <Brain size={140} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={20} />
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Orson AI</span>
            </div>
            <h4 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '16px', color: 'white' }}>Analysis in progress...</h4>
            <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.8)', marginBottom: '32px', lineHeight: '1.5', fontWeight: 500 }}>
              Based on your latest sampling data, your ponds show growth efficiency. I'm calculating your harvest window.
            </p>
            <button style={{ 
              width: '100%', padding: '16px', borderRadius: '16px', background: 'white', color: 'var(--primary)',
              border: 'none', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
            >
              Orson AI
            </button>
          </div>

          <div className="glass-card" style={{ padding: '32px' }}>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '24px' }}>Farm Health Index</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {[
                { 
                  label: 'pH Level', 
                  value: (ponds.reduce((acc, p) => {
                    const m = calculateMetrics(p);
                    return acc + (m?.ph || 7.7);
                  }, 0) / (ponds.length || 1)).toFixed(1), 
                  icon: Activity 
                },
                { 
                  label: 'Transparency', 
                  value: `${(ponds.reduce((acc, p) => {
                    const m = calculateMetrics(p);
                    return acc + (m?.transparency || 35);
                  }, 0) / (ponds.length || 1)).toFixed(0)}cm`, 
                  icon: Droplets 
                },
                { 
                  label: 'Temperature', 
                  value: `${(ponds.reduce((acc, p) => {
                    const m = calculateMetrics(p);
                    return acc + (m?.temperature || 28.5);
                  }, 0) / (ponds.length || 1)).toFixed(1)}°C`, 
                  icon: Thermometer 
                },
                { 
                  label: 'Daily Feed Usage', 
                  value: `${(ponds.reduce((acc, p) => {
                    const m = calculateMetrics(p);
                    return acc + (m?.dailyFeed || 120);
                  }, 0) / (ponds.length || 1)).toFixed(0)}kg`, 
                  icon: Utensils 
                }
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                      <item.icon size={18} />
                    </div>
                    <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>{item.label}</span>
                  </div>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
