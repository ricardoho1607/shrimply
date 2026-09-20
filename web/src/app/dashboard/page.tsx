"use client";

import { useFarmPermissions } from '@/hooks/useFarmPermissions';

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
  Loader2,
  LayoutGrid,
  List,
  Clock,
  Minus,
  Building2,
  Wind,
  Utensils,
  Check
} from 'lucide-react';
import Link from 'next/link';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardCopy } from '@/hooks/useDashboardCopy';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  useCompanyBlocks,
  useCompanyCycles,
  useCompanyPonds,
  useMarketplaceListings,
  useMonitoredCompanies,
} from '@/hooks/useDashboardData';
import { filterActiveCyclePonds } from '@/lib/pondLifecycle';
import {
  calculatePondMetricsWithHarvest,
  getLatestFeedResponseForDate,
  getLatestValidMbwSampling,
  type SharedMortalityRecord,
} from '../../../../shared/pondCalculations';
import { useFarmDateKey } from '@/hooks/useFarmDateKey';
import { FARM_OPERATIONAL_DAY_ROLLOVER_HOUR } from '../../../../shared/farmDate';
import EnterpriseDashboard from '@/components/EnterpriseCycleDashboard';
import DashboardOnboardingCard from './DashboardOnboardingCard';
import styles from './DashboardHome.module.css';
import {
  filterEnterpriseRecordsForUser,
  getEnterprisePondStatus,
  isEnterpriseOwner,
  type FarmBlock,
} from '../../../../shared/enterpriseBlocks';

/* --- Types --------------------------------------------------- */
interface FeedData {
  totalDailyFeed: string;
  feedingResponse?: 'strong' | 'normal' | 'weak' | null;
  cycleId?: string;
  pondCycleId?: string;
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
  temperature?: string;
  ammonia?: string;
  weatherEvent?: 'rain' | 'heavy_rain' | 'sudden_cloud' | null;
  waterExchangePercent?: string;
  sludgeLoad?: 'low' | 'moderate' | 'high' | null;
  surfaceScum?: boolean | null;
  shrimpBehaviour?: 'normal' | 'abnormal' | null;
  feedData?: FeedData;
  isBaselineEstimate?: boolean;
  source?: string;
  estimatedPopulation?: number;
  estimatedSurvivalRate?: number;
  cumulativeFeedToDate?: number;
  cycleId?: string;
  pondCycleId?: string;
}

interface Pond {
  id: string; pondName: string; pondArea: number; density: number; initialPopulation: number;
  blockId?: string;
  blockName?: string;
  docStart: string; supplier: string; initialWeight: number; samplings: Sampling[];
  mortalityRecords?: SharedMortalityRecord[];
  totalHarvestedBiomass?: number; totalHarvestedPopulation?: number;
  cycleId?: string;
  pondCycleId?: string;
  cycleStatus?: 'active' | 'ended';
  baselineDate?: string;
  baselineDoc?: number;
  baselineEstimatedPopulation?: number;
  baselineSurvivalRate?: number;
  baselineCumulativeFeed?: number;
  createdAt?: { toDate?: () => Date; seconds?: number };
  updatedAt?: { toDate?: () => Date; seconds?: number };
}

interface FarmCycle {
  id: string;
  status?: 'planning' | 'stocking' | 'active' | 'closing' | 'closed';
}

/* --- Calculation Utilities ----------------------------------- */

const calculateMetrics = (pond: Pond, timeZone?: string, currentDateKey?: string) => {
  const samplings = pond.samplings || [];
  const validSamplings = samplings.filter(s => s.mbw > 0 || s.mortality > 0 || s.feed > 0 || s.feedData);
  const sorted = [...validSamplings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const latest = sorted[sorted.length - 1] || {};
  const environmentalSamplings = samplings
    .filter((sampling) => sampling.phMorning || sampling.phEvening || sampling.doMorning || sampling.doEvening || sampling.transparency || sampling.salinity || sampling.temp)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const latestEnvironmental = environmentalSamplings[environmentalSamplings.length - 1] || {};
  const latestValid = getLatestValidMbwSampling(pond);
  const biologicalMetrics = calculatePondMetricsWithHarvest(pond, timeZone, { currentDateKey });

    const phM = parseFloat(latestEnvironmental.phMorning || '');
    const phE = parseFloat(latestEnvironmental.phEvening || '');
    const validPhM = Number.isFinite(phM) && phM > 0 ? phM : null;
    const validPhE = Number.isFinite(phE) && phE > 0 ? phE : null;
    const ph = validPhM && validPhE ? (validPhM + validPhE) / 2 : (validPhM ?? validPhE);
    const doM = parseFloat(latestEnvironmental.doMorning || '');
    const doE = parseFloat(latestEnvironmental.doEvening || '');
    const validDoM = Number.isFinite(doM) && doM > 0 ? doM : null;
    const validDoE = Number.isFinite(doE) && doE > 0 ? doE : null;
    const dissolvedOxygen = validDoM && validDoE ? (validDoM + validDoE) / 2 : (validDoM ?? validDoE);
    const transparencyValue = parseFloat(latestEnvironmental.transparency || '');
    const feedDataValue = parseFloat(latest.feedData?.totalDailyFeed || '');
    const dailyFeed = latest.feed && latest.feed > 0
      ? latest.feed
      : Number.isFinite(feedDataValue) && feedDataValue > 0
        ? feedDataValue
        : null;

    return {
      biomass: biologicalMetrics.currentBiomass,
      population: biologicalMetrics.currentPopulation,
      sr: biologicalMetrics.adjustedSR,
      doc: biologicalMetrics.doc,
      size: biologicalMetrics.size,
      mbw: biologicalMetrics.latestMbw,
      adg: biologicalMetrics.adg,
      latest,
      latestValid,
      ph,
      transparency: Number.isFinite(transparencyValue) && transparencyValue > 0 ? transparencyValue : null,
      dissolvedOxygen,
      dailyFeed
    };
  };

/* --- Sub-components ------------------------------------------- */

function SummaryCard({ label, value, trend, trendType, loading, icon: Icon }: {
  label: string; value: React.ReactNode; trend?: string; trendType?: 'up' | 'down'; loading?: boolean; icon?: import('lucide-react').LucideIcon;
}) {
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
            fontSize: '0.72rem', fontWeight: 600,
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
        <span style={{ fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
          {label}
        </span>
        {loading ? (
          <div style={{ height: '2.2rem', width: '60%', background: 'var(--bg-mid)', borderRadius: '8px', animation: 'pulse 2s infinite' }} />
        ) : (
          <div style={{ fontSize: '28px', color: 'var(--text-primary)', fontWeight: 600, lineHeight: '36px', letterSpacing: '-0.02em', fontFamily: "var(--jakarta)" }}>
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

type PondMetricsCalculator = typeof calculateMetrics;
function PondCard({ pond, calculateMetrics, timeZone }: { pond: Pond; calculateMetrics: PondMetricsCalculator; timeZone?: string }) {
  const copy = useDashboardCopy();
  const { t } = useLanguage();
  const operationalToday = useFarmDateKey(timeZone, FARM_OPERATIONAL_DAY_ROLLOVER_HOUR);
  const m = calculateMetrics(pond, timeZone, operationalToday);
  const pondStatus = getEnterprisePondStatus(
    pond as Parameters<typeof getEnterprisePondStatus>[0],
    timeZone,
  );
  const today = useFarmDateKey(timeZone);
  const isHarvested = (pond.totalHarvestedPopulation || 0) >= (pond.initialPopulation * 0.9);
    const todaySampling = pond.samplings?.find((s) => s.date === today);
    const wqPosted = !!(todaySampling?.phMorning || todaySampling?.phEvening || todaySampling?.doMorning || todaySampling?.doEvening);
    const todayFeedRecord = [...(pond.samplings || [])].reverse().find((sampling: Sampling) => (
      sampling.date === today && (Number(sampling.feed) > 0 || Number(sampling.feedData?.totalDailyFeed) > 0)
    ));
    const feedPosted = Boolean(todayFeedRecord);
    const todayFeedResponse = getLatestFeedResponseForDate(pond.samplings, today, {
      cycleId: pond.cycleId,
      pondCycleId: pond.pondCycleId || pond.id,
    });

  return (
    <Link href={`/dashboard/ponds/detail?id=${pond.id}`} style={{ textDecoration: 'none' }}>
      <div className="glass-card dashboard-pond-card" style={{
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div className="dashboard-pond-name-badge" title={pond.pondName}>
              {pond.pondName}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div className="ping" style={{ 
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: isHarvested ? '#64748b' : '#16a34a' 
                }} />
                <span style={{ overflow: 'hidden', fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 600, textOverflow: 'ellipsis', textTransform: 'uppercase', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>
                  {isHarvested ? copy('Harvested') : `${copy('Active')} • DOC ${m.doc}`}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '0 0 auto' }}>
            {!isHarvested && pondStatus.risk !== 'stable' && (
              <span
                title={pondStatus.warnings[0]?.translationCode
                  ? t.enterprise.warningMessages[pondStatus.warnings[0].translationCode]
                  : copy(pondStatus.warnings[0]?.label || '')}
                style={{
                  padding: '4px 7px',
                  borderRadius: '999px',
                  background: pondStatus.risk === 'high-risk' ? '#FEE2E2' : '#FEF3C7',
                  color: pondStatus.risk === 'high-risk' ? '#991B1B' : '#92400E',
                  fontSize: '0.52rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                }}
              >
                {pondStatus.risk === 'high-risk' ? copy('HIGH RISK') : copy('WARNING')}
              </span>
            )}
            <div style={{ padding: '5px', borderRadius: '8px', background: 'var(--bg-mid)', color: 'var(--text-faint)' }}>
              <ChevronRight size={16} />
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.58rem', textTransform: 'uppercase', color: 'var(--text-faint)', letterSpacing: '0.08em', fontWeight: 600 }}>{copy('Avg Weight')}</span>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 600, fontFamily: "var(--jakarta)" }}>
              {m.mbw.toFixed(1)}<span style={{ fontSize: '0.7rem', fontWeight: 500, marginLeft: '2px' }}>g</span>
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.58rem', textTransform: 'uppercase', color: 'var(--text-faint)', letterSpacing: '0.08em', fontWeight: 600 }}>{copy('Survival')}</span>
            <span style={{ fontSize: '0.88rem', color: m.sr > 85 ? '#16a34a' : '#ef4444', fontWeight: 600, fontFamily: "var(--jakarta)" }}>
              {m.sr.toFixed(1)}<span style={{ fontSize: '0.7rem', fontWeight: 500, marginLeft: '2px' }}>%</span>
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.58rem', textTransform: 'uppercase', color: 'var(--text-faint)', letterSpacing: '0.08em', fontWeight: 600 }}>{copy('Biomass')}</span>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 600, fontFamily: "var(--jakarta)" }}>
              {m.biomass.toLocaleString(undefined, {maximumFractionDigits:0})}<span style={{ fontSize: '0.7rem', fontWeight: 500, marginLeft: '2px' }}>kg</span>
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.58rem', textTransform: 'uppercase', color: 'var(--text-faint)', letterSpacing: '0.08em', fontWeight: 600 }}>ADG</span>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 600, fontFamily: "var(--jakarta)" }}>
              {m.adg.toFixed(2)}<span style={{ fontSize: '0.7rem', fontWeight: 500, marginLeft: '2px' }}>g/d</span>
            </span>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: '0.58rem', fontWeight: 600, color: wqPosted ? 'var(--text-primary)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{copy('Water Quality')}</span>
                {wqPosted && <span style={{ fontSize: '0.52rem', color: '#16a34a', fontWeight: 600 }}>{copy('POSTED')}</span>}
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: '0.58rem', fontWeight: 600, color: feedPosted ? 'var(--text-primary)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{copy('Feed status')}</span>
                {feedPosted && <span style={{ fontSize: '0.52rem', color: '#16a34a', fontWeight: 600 }}>{todayFeedResponse ? copy(todayFeedResponse).toUpperCase() : copy('COMPLETED')}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* --- Buyer Components ----------------------------------------- */

function BuyerDashboard({ t, user }: { t: ReturnType<typeof useLanguage>['t']; user: ReturnType<typeof useAuth>['user'] }) {
  const copy = useDashboardCopy();
  const { formatCurrency } = useCurrency();
  const { data: listings } = useMarketplaceListings<{ id: string; status?: string; priceList?: Partial<Record<'size30' | 'size50' | 'size100', number | string>> }>();
  const { data: monitoredCompanies, loading } = useMonitoredCompanies<{ id: string; companyName?: string; location?: string; totalBiomass?: number; avgDOC?: number; avgSize?: number }>();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const marketPrices = useMemo(() => {
    const prices: Record<'size30' | 'size50' | 'size100', number[]> = {
      size30: [],
      size50: [],
      size100: [],
    };

    listings.forEach((listing) => {
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
        <div className="responsive-modal-overlay dashboard-confirm-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(27, 38, 44, 0.4)', backdropFilter: 'blur(10px)' }}>
          <div className="glass-card animate-fade-up responsive-modal dashboard-confirm-modal" style={{ width: '400px', background: '#FFF', padding: '48px', textAlign: 'center', borderRadius: 'var(--radius-xl)' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
              <Minus size={36} />
            </div>
            <h3 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '14px', color: 'var(--text-primary)', letterSpacing: '0' }}>{t.buyer.stopMonitoring}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.6, marginBottom: '40px' }}>
              {t.buyer.stopMonitoringDescription}
            </p>
            <div className="dashboard-confirm-actions" style={{ display: 'flex', gap: '16px' }}>
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
          <div className="section-label" style={{ marginBottom: '16px' }}>{copy('Market Overview')}</div>
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

      <div className="animate-fade-up animate-delay-1 responsive-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <SummaryCard label={t.buyer.monitoredSuppliers} value={monitoredCompanies.length.toString()} icon={Users} loading={loading} />
        <SummaryCard label={t.buyer.totalAvailableBiomass} value={`${Math.round(monitoredCompanies.reduce((sum, c) => sum + (c.totalBiomass || 0), 0)).toLocaleString()} ${t.common.kg}`} icon={TrendingUp} loading={loading} />
        <SummaryCard label={t.buyer.avgSupplierDOC} value={`${Math.round(monitoredCompanies.reduce((sum, c) => sum + (c.avgDOC || 0), 0) / Math.max(1, monitoredCompanies.length))} ${t.common.days}`} icon={Clock} loading={loading} />
        <SummaryCard label={t.buyer.avgMarketSize} value={`${Math.round(monitoredCompanies.reduce((sum, c) => sum + (c.avgSize || 0), 0) / Math.max(1, monitoredCompanies.length))} ${t.common.pcsKg}`} icon={Scale} loading={loading} />
      </div>

      <div className="animate-fade-up animate-delay-2 dashboard-primary-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '40px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 600, letterSpacing: '0' }}>{t.buyer.monitoredSuppliers}</h3>
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
              <h4 style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: '12px' }}>{t.buyer.noSuppliersMonitored}</h4>
              <p style={{ color: 'var(--text-muted)', marginBottom: '40px', maxWidth: '400px', margin: '0 auto 40px' }}>{t.buyer.searchFarmsDescription}</p>
              <Link href="/dashboard/suppliers">
                <button className="btn-primary" style={{ padding: '16px 40px' }}>{t.buyer.findSuppliers}</button>
              </Link>
            </div>
          ) : (
            <div className="responsive-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '32px' }}>
              {monitoredCompanies.map(company => (
                <div key={company.id} className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '18px' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'var(--gradient-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', border: '1px solid var(--border)' }}>
                        <Building2 size={28} />
                      </div>
                      <div>
                        <h4 style={{ fontWeight: 600, fontSize: '1.3rem', color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '0' }}>{company.companyName}</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>{company.location}</p>
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
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>{t.buyer.avgDOC}</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: "var(--jakarta)" }}>{company.avgDOC || 0} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>days</span></div>
                    </div>
                    <div style={{ padding: '20px', borderRadius: '20px', background: 'var(--bg-mid)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>{t.buyer.avgSize}</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: "var(--jakarta)" }}>{company.avgSize || 0} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>pcs/kg</span></div>
                    </div>
                  </div>

                  <div style={{ padding: '24px', borderRadius: '20px', background: 'var(--gradient)', boxShadow: 'var(--shadow-glow)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'relative', zIndex: 2 }}>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px' }}>{t.buyer.estBiomass}</div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 600, color: '#FFF', letterSpacing: '0', fontFamily: "var(--jakarta)" }}>{Math.round(company.totalBiomass || 0).toLocaleString()} <span style={{ fontSize: '1rem', fontWeight: 500 }}>kg</span></div>
                    </div>
                    <Waves size={80} style={{ position: 'absolute', right: '-10px', bottom: '-20px', color: 'white', opacity: 0.1, transform: 'rotate(-10deg)' }} />
                  </div>

                  <button className="btn-secondary" style={{ width: '100%', padding: '16px', borderRadius: '14px', fontWeight: 600 }}>{t.buyer.viewFarmDetails}</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div className="glass-card" style={{ padding: '32px' }}>
            <h4 style={{ fontWeight: 600, fontSize: '1.3rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '0' }}>
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
            <h4 style={{ fontWeight: 600, fontSize: '1.3rem', marginBottom: '28px', letterSpacing: '0' }}>{t.buyer.priceIndex}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {[
                { label: `${t.shrimp.size} 30`, price: marketPrices.size30 },
                { label: `${t.shrimp.size} 50`, price: marketPrices.size50 },
                { label: `${t.shrimp.size} 100`, price: marketPrices.size100 },
              ].filter(item => item.price > 0).map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderRadius: '20px', background: 'var(--bg-mid)', border: '1px solid var(--border)', transition: 'transform 0.2s' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0' }}>{item.label}</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--primary)', fontFamily: "var(--jakarta)" }}>{formatCurrency(item.price)}</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>{copy('Market Avg')}</div>
                  </div>
                </div>
              ))}
              {Object.values(marketPrices).every(v => v === 0) && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-faint)', fontSize: '0.9rem' }}>
                  {copy('No active listings for price index')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --- Main Page ------------------------------------------------ */

export default function DashboardPage() {
  const copy = useDashboardCopy();
  const { t } = useLanguage();
  const { user, company, loading: authLoading, companyLoading } = useAuth();
  const operationalToday = useFarmDateKey(company?.timeZone, FARM_OPERATIONAL_DAY_ROLLOVER_HOUR);
  const hasPermission = useFarmPermissions();
  const canManageEnterpriseBlocks = hasPermission('manageEnterpriseBlocks');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { data: ponds, loading: pondsLoading } = useCompanyPonds<Pond>('asc');
  const { data: cycles } = useCompanyCycles<FarmCycle>();
  const { data: blocks } = useCompanyBlocks<FarmBlock>('asc');
  const userData = user;
  const loading = authLoading || companyLoading || !userData || (userData.role !== 'buyer' && pondsLoading);
  const accessiblePonds = useMemo(() => filterEnterpriseRecordsForUser(ponds, {
    businessSize: company?.businessSize,
    role: userData?.role,
    userId: userData?.uid,
    blocks,
  }), [blocks, company?.businessSize, ponds, userData?.role, userData?.uid]);
  const activePonds = useMemo(
    () => filterActiveCyclePonds(accessiblePonds, cycles),
    [accessiblePonds, cycles],
  );

  const totalMetrics = useMemo(() => {
    let currentBiomass = 0; let currentSR = 0; let currentPop = 0;
    let prevBiomass = 0; let prevSR = 0; let prevPop = 0;

    activePonds.forEach(pond => {
      const samplings = pond.samplings || [];
      const sorted = [...samplings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const m = calculateMetrics(pond, company?.timeZone, operationalToday);
      currentBiomass += m.biomass; currentSR += m.sr; currentPop += m.population;

      if (sorted.length >= 2) {
        const previousSamplings = sorted.slice(0, -1);
        const previousSamplingTime = new Date(previousSamplings[previousSamplings.length - 1].date).getTime();
        const previousMortalityRecords = (pond.mortalityRecords || [])
          .filter((record) => new Date(record.date || '').getTime() <= previousSamplingTime);
        const previousMetrics = calculatePondMetricsWithHarvest({
          ...pond,
          samplings: previousSamplings,
          mortalityRecords: previousMortalityRecords,
        }, company?.timeZone, { currentDateKey: operationalToday });
        prevBiomass += previousMetrics.currentBiomass;
        prevSR += previousMetrics.adjustedSR;
        prevPop += previousMetrics.currentPopulation;
      } else {
        prevBiomass += (pond.initialPopulation * (pond.initialWeight || 0.5)) / 1000;
        prevSR += 100; prevPop += pond.initialPopulation;
      }
    });

    const activeCount = activePonds.length;
    const avgSR = activeCount > 0 ? (currentSR / activeCount) : 0;
    const oldAvgSR = activeCount > 0 ? (prevSR / activeCount) : 0;
    const biomassTrend = prevBiomass > 0 ? ((currentBiomass - prevBiomass) / prevBiomass) * 100 : 0;
    const srTrend = oldAvgSR > 0 ? (avgSR - oldAvgSR) : 0;
    const popTrend = prevPop > 0 ? ((currentPop - prevPop) / prevPop) * 100 : 0;

    return { biomass: currentBiomass, population: currentPop, sr: avgSR, activeCount, biomassTrend, srTrend, popTrend };
  }, [activePonds, company?.timeZone, operationalToday]);

  const averageActivePondMetric = (selector: (pond: Pond) => number | null | undefined) => {
    const values = activePonds
      .map(selector)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    if (values.length === 0) return null;
    return values.reduce((acc, value) => acc + value, 0) / values.length;
  };

  const farmHealthItems = [
    {
      label: copy('pH Level'),
      value: (() => {
        const average = averageActivePondMetric((pond) => calculateMetrics(pond, company?.timeZone).ph);
        return average === null ? '--' : average.toFixed(1);
      })(),
      icon: Activity,
    },
    {
      label: copy('Transparency'),
      value: (() => {
        const average = averageActivePondMetric((pond) => calculateMetrics(pond, company?.timeZone).transparency);
        return average === null ? '--' : `${average.toFixed(0)}cm`;
      })(),
      icon: Droplets,
    },
    {
      label: 'DO',
      value: (() => {
        const average = averageActivePondMetric((pond) => calculateMetrics(pond, company?.timeZone).dissolvedOxygen);
        return average === null ? '--' : `${average.toFixed(1)}mg/L`;
      })(),
      icon: Wind,
    },
    {
      label: copy('Daily Feed'),
      value: (() => {
        const average = averageActivePondMetric((pond) => calculateMetrics(pond, company?.timeZone).dailyFeed);
        return average === null ? '--' : `${average.toFixed(0)}kg`;
      })(),
      icon: Utensils,
    },
  ];

  if (userData?.role === 'buyer') return <BuyerDashboard t={t} user={userData} />;
  if (isEnterpriseOwner(company?.businessSize, userData?.role)
    || (company?.businessSize === 'enterprise' && canManageEnterpriseBlocks)) {
    return <EnterpriseDashboard ponds={ponds} timeZone={company?.timeZone} />;
  }

  return (
    <div className="dashboard-page">

      {!companyLoading && (userData?.role === 'owner' || userData?.role === 'co-owner') ? (
        <DashboardOnboardingCard company={company} />
      ) : null}

      {/* Summary Row */}
      <div className="glass-card animate-fade-up animate-delay-1 dashboard-summary-panel">
        {[
          {
            label: t.shrimp.biomass,
            value: `${totalMetrics.biomass.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg`,
            trend: `${totalMetrics.biomassTrend >= 0 ? '+' : ''}${totalMetrics.biomassTrend.toFixed(1)}%`,
            trendUp: totalMetrics.biomassTrend >= 0,
          },
          {
            label: t.shrimp.survivalRate,
            value: `${totalMetrics.sr.toFixed(1)}%`,
            trend: `${totalMetrics.srTrend >= 0 ? '+' : ''}${totalMetrics.srTrend.toFixed(1)}%`,
            trendUp: totalMetrics.srTrend >= 0,
          },
          {
            label: t.shrimp.population,
            value: totalMetrics.population.toLocaleString(),
            trend: `${totalMetrics.popTrend >= 0 ? '+' : ''}${totalMetrics.popTrend.toFixed(1)}%`,
            trendUp: totalMetrics.popTrend >= 0,
          },
          {
            label: copy('Active Ponds'),
            value: totalMetrics.activeCount.toString(),
            trend: null,
            trendUp: true,
          },
        ].map(({ label, value, trend, trendUp }) => (
          <div className="dashboard-summary-item" key={label}>
            <div className="dashboard-summary-content">
              <div className="dashboard-summary-meta">
                <span className="dashboard-summary-label">{label}</span>
                {trend && (
                  <span className={`dashboard-summary-trend ${trendUp ? 'is-up' : 'is-down'}`}>
                    {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {trend}
                  </span>
                )}
              </div>
              {loading ? (
                <div className="dashboard-summary-skeleton" />
              ) : (
                <div className="dashboard-summary-value">{value}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <section className="glass-card animate-fade-up animate-delay-2 dashboard-health-panel" aria-labelledby="farm-health-title">
        <div className="dashboard-health-heading">
          <h3 id="farm-health-title">{copy('Farm Health')}</h3>
          <span>{copy('Current averages')}</span>
        </div>
        <div className="dashboard-health-grid">
          {farmHealthItems.map(({ label, value, icon: Icon }) => (
            <div className="dashboard-health-item" key={label}>
              <div className="dashboard-health-icon" aria-hidden="true">
                <Icon size={16} strokeWidth={2} />
              </div>
              <div className="dashboard-health-copy">
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Ponds Section */}
      <div className="animate-fade-up animate-delay-2" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

        {/* Left Column: Ponds List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="dashboard-section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '20px', lineHeight: '28px', fontWeight: 600, letterSpacing: '-0.02em' }}>{copy('Ponds')}</h3>
            <div className="dashboard-view-toggle" style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
              <button
                  onClick={() => setViewMode('grid')}
                  aria-label={copy('Grid view')}
                  aria-pressed={viewMode === 'grid'}
                  style={{
                    width: '36px', height: '36px', padding: '0', borderRadius: '8px', border: 'none',
                    background: 'transparent',
                    color: viewMode === 'grid' ? 'var(--primary)' : 'var(--text-faint)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.16s ease, color 0.16s ease'
                  }}
                >
                  <LayoutGrid size={17} />
                </button>
              <button
                  onClick={() => setViewMode('list')}
                  aria-label={copy('List view')}
                  aria-pressed={viewMode === 'list'}
                  style={{
                    width: '36px', height: '36px', padding: '0', borderRadius: '8px', border: 'none',
                    background: 'transparent',
                    color: viewMode === 'list' ? 'var(--primary)' : 'var(--text-faint)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.16s ease, color 0.16s ease'
                  }}
                >
                  <List size={17} />
                </button>
            </div>
          </div>

          <div className={`glass-card responsive-horizontal-scroll ${viewMode === 'list' ? 'dashboard-list-container' : ''}`} style={{ padding: '0', overflow: 'hidden', border: viewMode === 'list' ? '1px solid var(--border)' : 'none', background: viewMode === 'list' ? 'white' : 'transparent', boxShadow: viewMode === 'list' ? 'var(--shadow-card)' : 'none' }}>
            {viewMode === 'list' && (
              <div className="dashboard-list-row dashboard-list-header" style={{
                display: 'grid', 
                gridTemplateColumns: '2fr 1.5fr 1.5fr 1.5fr 1fr 0.5fr', 
                padding: '24px 32px',
                background: 'rgba(241, 245, 249, 0.5)',
                borderBottom: '1px solid var(--border)'
              }}>
                {[copy('POND NAME'), 'DOC', 'ADG', copy('Biomass').toUpperCase(), 'SR (%)', ''].map((label) => (
                  <span key={label} style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-faint)', letterSpacing: '0.05em' }}>{label}</span>
                ))}
              </div>
            )}
            
            {pondsLoading ? (
              <div className="dashboard-pond-grid" aria-busy="true" aria-label={copy('Loading ponds')}>
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    className="glass-card dashboard-summary-skeleton"
                    key={index}
                    aria-hidden="true"
                    style={{ width: '100%', height: '190px', borderRadius: '16px' }}
                  />
                ))}
              </div>
            ) : activePonds.length === 0 ? (
              <div className={`glass-card ${styles.emptyState}`}>
                <div className={styles.emptyContent}>
                  <div className={styles.emptyIcon} aria-hidden="true">
                    <Waves size={22} />
                  </div>
                  <h2 className={styles.emptyTitle}>{copy('Add your first pond')}</h2>
                  <p className={styles.emptyDetail}>
                    {copy('Create a pond to begin tracking stocking, growth, water quality, feed, and harvest records.')}
                  </p>
                  <Link className={styles.emptyAction} href="/dashboard/ponds">
                    <Plus size={16} aria-hidden="true" />
                    {copy('Set up a pond')}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="dashboard-pond-grid" style={{
                display: 'grid',
                gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(280px, 1fr))' : '1fr',
                gap: viewMode === 'grid' ? '16px' : '0'
              }}>
              {activePonds.map((pond, idx) => {
                const m = calculateMetrics(pond, company?.timeZone, operationalToday);
                return viewMode === 'grid' ? (
                  <PondCard key={pond.id} pond={pond} calculateMetrics={calculateMetrics} timeZone={company?.timeZone} />
                ) : (
                  <Link key={pond.id} href={`/dashboard/ponds/detail?id=${pond.id}`} style={{ textDecoration: 'none' }}>
                    <div className="dashboard-list-row dashboard-list-data" style={{
                      display: 'grid', 
                      gridTemplateColumns: '2fr 1.5fr 1.5fr 1.5fr 1fr 0.5fr', 
                      padding: '16px 32px',
                      alignItems: 'center',
                      borderBottom: idx === activePonds.length - 1 ? 'none' : '1px solid var(--border)',
                      transition: 'background 0.2s',
                      cursor: 'pointer'
                    }}
                    >
                      <div className={`dashboard-list-pond ${styles.listPondCell}`}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{pond.pondName}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', fontWeight: 500 }}>{pond.supplier || 'N/A'}</div>
                      </div>
                      
                      <div className="dashboard-list-metric" data-label="DOC" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{m.doc}</div>

                      <div className="dashboard-list-metric" data-label="ADG" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {m.adg.toFixed(2)}
                      </div>
                      
                      <div className="dashboard-list-metric" data-label="Biomass" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {m.biomass.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg
                      </div>
                      
                      <div className="dashboard-list-metric" data-label="Survival" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#16a34a' }}>
                        {m.sr.toFixed(1)}%
                      </div>

                      <div className="dashboard-list-chevron" style={{ textAlign: 'right', color: 'var(--text-faint)' }}>
                        <ChevronRight size={18} />
                      </div>
                    </div>
                  </Link>
                );
              })}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
