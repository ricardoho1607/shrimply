"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { 
  Plus, 
  Waves, 
  Search, 
  Archive,
  RotateCcw,
  Calendar, 
  Scale, 
  Users, 
  X,
  Loader2,
  ArrowRight,
  Lock,
  Save,
  Shrimp,
  Pencil
} from 'lucide-react';
import Link from 'next/link';
import { collection, doc, addDoc, serverTimestamp, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useLanguage } from '@/contexts/LanguageContext';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useCompanyCycles, useCompanyPonds, useDebouncedValue } from '@/hooks/useDashboardData';

/* ─── Types ─────────────────────────────────────────────────── */
interface Sampling {
  id: string; date: string; mbw: number; mortality: number; feed: number;
  cycleId?: string; cycleName?: string; pondCycleId?: string;
  isBaselineEstimate?: boolean; source?: string;
  estimatedPopulation?: number; estimatedSurvivalRate?: number; cumulativeFeedToDate?: number;
}

interface Pond {
  id: string; pondName: string; pondArea: number; density: number; initialPopulation: number;
  docStart: string; supplier: string; plSupplier?: string; initialWeight: number; samplings: Sampling[];
  totalHarvestedBiomass?: number; totalHarvestedPopulation?: number;
  cycleId?: string;
  cycleName?: string;
  pondCycleId?: string;
  cycleStatus?: 'active' | 'ended';
  cycleStartedAt?: string;
  cycleEndedAt?: string;
  cycleEndedBy?: string;
  cycleEndReason?: 'harvested' | 'disease' | 'reset' | 'other';
  previousCyclePondId?: string;
  cycleStartMode?: 'new' | 'midcycle';
  baselineDate?: string;
  baselineDoc?: number;
  baselineMbw?: number;
  baselineEstimatedPopulation?: number;
  baselineSurvivalRate?: number;
  baselineCumulativeFeed?: number;
  baselineSource?: string;
  createdAt?: { toDate?: () => Date; seconds?: number };
  updatedAt?: { toDate?: () => Date; seconds?: number };
}

interface FarmCycle {
  id: string;
  cycleName: string;
  status: 'planning' | 'stocking' | 'active' | 'closing' | 'closed';
  plannedStartDate?: string;
  stockingStartDate?: string;
  stockingEndDate?: string;
  closedAt?: string;
}

const getCycleStatus = (pond: Pond) => pond.cycleStatus === 'ended' ? 'ended' : 'active';
const isActiveCycle = (pond: Pond) => getCycleStatus(pond) === 'active';
const getPlSupplier = (pond: Pond) => pond.plSupplier || pond.supplier || 'N/A';
const isOpenFarmCycle = (cycle: FarmCycle) => ['planning', 'stocking', 'active'].includes(cycle.status);
const getPhysicalPondKey = (pondName: string) => pondName.trim().toLowerCase();
const canEditOperations = (role?: string) => role === 'owner' || role === 'co-owner' || role === 'technician';
const DAY_MS = 24 * 60 * 60 * 1000;

const getDateOnlyUtcTime = (dateString: string): number => {
  const [year, month, day] = dateString.split('-').map(Number);
  return Date.UTC(year, (month || 1) - 1, day || 1);
};

const calculateDocFromDates = (startDate: string, baselineDate: string): number =>
  Math.floor((getDateOnlyUtcTime(baselineDate) - getDateOnlyUtcTime(startDate)) / DAY_MS);

const removeUndefinedFields = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(removeUndefinedFields);
  if (!value || typeof value !== 'object') return value;

  return Object.entries(value).reduce((cleaned, [key, entry]) => {
    if (entry !== undefined) cleaned[key] = removeUndefinedFields(entry);
    return cleaned;
  }, {} as Record<string, unknown>);
};

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
  const { data: ponds, loading, companyId, user } = useCompanyPonds<Pond>('desc');
  const { data: cycles } = useCompanyCycles<FarmCycle>();
  
  const [isModalOpen, setModalOpen] = useState(false);
  const [cycleFilter, setCycleFilter] = useState<'active' | 'ended'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebouncedValue(searchTerm);
  const [cycleNameDraft, setCycleNameDraft] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    pondName: '',
    pondArea: '',
    density: '',
    docStart: new Date().toISOString().split('T')[0],
    supplier: '',
    plValue: '0.5',
    cycleStartMode: 'new' as 'new' | 'midcycle',
    baselineDate: new Date().toISOString().split('T')[0],
    baselineMbw: '',
    baselineEstimatedPopulation: '',
    baselineSurvivalRate: '',
    baselineCumulativeFeed: ''
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null
  });
  const [endCyclePond, setEndCyclePond] = useState<Pond | null>(null);
  const [endCycleForm, setEndCycleForm] = useState({
    cycleEndedAt: new Date().toISOString().split('T')[0],
    cycleEndReason: 'harvested' as 'harvested' | 'disease' | 'reset' | 'other',
  });
  const [startCyclePond, setStartCyclePond] = useState<Pond | null>(null);
  const [startCycleForm, setStartCycleForm] = useState({
    density: '',
    docStart: new Date().toISOString().split('T')[0],
    plValue: '0.5',
    plSupplier: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [baselineEditPond, setBaselineEditPond] = useState<Pond | null>(null);
  const [baselineForm, setBaselineForm] = useState({
    baselineDate: new Date().toISOString().split('T')[0],
    baselineMbw: '',
    baselineEstimatedPopulation: '',
    baselineSurvivalRate: '',
    baselineCumulativeFeed: ''
  });

  const activeFarmCycle = useMemo(() => cycles.find(isOpenFarmCycle), [cycles]);
  const canEditPonds = canEditOperations(user?.role);
  const activeCyclePonds = useMemo(
    () => activeFarmCycle
      ? ponds.filter((pond) => isActiveCycle(pond) && (pond.cycleId === activeFarmCycle.id || !pond.cycleId))
      : [],
    [activeFarmCycle, ponds]
  );

  useEffect(() => {
    setCycleNameDraft(activeFarmCycle?.cycleName || '');
  }, [activeFarmCycle?.id, activeFarmCycle?.cycleName]);

  const ensureActiveCycle = async (stockingDate: string) => {
    if (!companyId || !user || !canEditPonds) return null;
    const activeCycle = cycles.find(isOpenFarmCycle);
    if (activeCycle) return activeCycle;

    const cycleName = `Cycle ${cycles.length + 1}`;
    const docRef = await addDoc(collection(db, 'companies', companyId, 'cycles'), {
      cycleName,
      status: 'stocking',
      plannedStartDate: stockingDate,
      stockingStartDate: stockingDate,
      createdAt: serverTimestamp(),
      createdBy: user.uid,
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    });
    return { id: docRef.id, cycleName, status: 'stocking' as const, plannedStartDate: stockingDate, stockingStartDate: stockingDate };
  };

  const handleRenameCycle = async () => {
    if (!companyId || !user || !activeFarmCycle) return;
    if (!canEditPonds) return;
    const nextName = cycleNameDraft.trim();
    if (!nextName) {
      alert('Cycle name cannot be empty.');
      return;
    }

    try {
      await updateDoc(doc(db, 'companies', companyId, 'cycles', activeFarmCycle.id), {
        cycleName: nextName,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });

      await Promise.all(activeCyclePonds.map((pond) =>
        updateDoc(doc(db, 'companies', companyId, 'ponds', pond.id), {
          cycleName: nextName,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        })
      ));
    } catch (error) {
      console.error('Error renaming cycle:', error);
      alert(t.messages.error || 'Failed to rename cycle.');
    }
  };

  const handleCloseFarmCycle = async () => {
    if (!companyId || !user || !activeFarmCycle) return;
    if (!canEditPonds) return;
    const today = new Date().toISOString().split('T')[0];
    if (!window.confirm(`End ${activeFarmCycle.cycleName} and move ${activeCyclePonds.length} pond${activeCyclePonds.length === 1 ? '' : 's'} to history?`)) return;

    try {
      await updateDoc(doc(db, 'companies', companyId, 'cycles', activeFarmCycle.id), {
        status: 'closed',
        closedAt: today,
        stockingEndDate: activeFarmCycle.stockingEndDate || today,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });

      await Promise.all(activeCyclePonds.filter(isActiveCycle).map((pond) =>
        updateDoc(doc(db, 'companies', companyId, 'ponds', pond.id), {
          cycleStatus: 'ended',
          cycleEndedAt: today,
          cycleEndReason: 'harvested',
          cycleEndedBy: user.uid,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        })
      ));

      setCycleFilter('ended');
    } catch (error) {
      console.error('Error ending cycle:', error);
      alert(t.messages.error || 'Failed to end cycle.');
    }
  };

  const handleAddPond = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !user) return;
    if (!canEditPonds) return;

    try {
      const hasActiveCycleForPond = ponds.some((pond) =>
        isActiveCycle(pond) &&
        getPhysicalPondKey(pond.pondName) === getPhysicalPondKey(formData.pondName)
      );

      if (hasActiveCycleForPond) {
        alert(`${formData.pondName} already has an active cycle. End that pond first before starting another cycle for it.`);
        return;
      }

      const initialPopulation = Number(formData.pondArea) * Number(formData.density);
      const initialWeight = parseFloat(formData.plValue) / 10; // Simple conversion logic from mobile app
      const isMidcycle = formData.cycleStartMode === 'midcycle';
      const baselineMbwValue = parseFloat(formData.baselineMbw);
      const baselinePopulationValue = parseFloat(formData.baselineEstimatedPopulation);
      const baselineSurvivalValue = parseFloat(formData.baselineSurvivalRate);
      const baselineFeedValue = parseFloat(formData.baselineCumulativeFeed);
      const baselineDate = new Date().toISOString().split('T')[0];
      const baselineDocValue = isMidcycle ? calculateDocFromDates(formData.docStart, baselineDate) : 0;

      if (isMidcycle && (!formData.baselineMbw || Number.isNaN(baselineMbwValue) || baselineMbwValue <= 0)) {
        alert(t.midcycleOnboarding?.baselineMbwRequired || 'Current MBW is required for an existing cycle.');
        return;
      }

      if (isMidcycle && (!Number.isFinite(baselineDocValue) || baselineDocValue < 0)) {
        alert('Start date must be today or earlier for an existing cycle.');
        return;
      }

      const effectiveDocStart = formData.docStart;
      const baselineDoc = isMidcycle ? baselineDocValue : 0;
      const activeCycle = await ensureActiveCycle(effectiveDocStart);
      const baselineSampling = isMidcycle ? [{
        id: `baseline-${Date.now()}`,
        date: baselineDate,
        mbw: baselineMbwValue,
        mortality: 0,
        feed: Number.isNaN(baselineFeedValue) ? 0 : baselineFeedValue,
        isBaselineEstimate: true,
        source: 'midcycle_onboarding',
        ...(Number.isNaN(baselinePopulationValue) ? {} : { estimatedPopulation: baselinePopulationValue }),
        ...(Number.isNaN(baselineSurvivalValue) ? {} : { estimatedSurvivalRate: baselineSurvivalValue }),
        ...(Number.isNaN(baselineFeedValue) ? {} : { cumulativeFeedToDate: baselineFeedValue }),
        ...(activeCycle?.id ? { cycleId: activeCycle.id } : {}),
        ...(activeCycle?.cycleName ? { cycleName: activeCycle.cycleName } : {}),
      }] : [];

      const pondData = {
        pondName: formData.pondName,
        pondArea: Number(formData.pondArea),
        density: Number(formData.density),
        initialPopulation,
        docStart: effectiveDocStart,
        supplier: formData.supplier,
        plSupplier: formData.supplier,
        initialWeight,
        samplings: baselineSampling,
        totalHarvestedBiomass: 0,
        totalHarvestedPopulation: 0,
        totalHarvestedFeed: 0,
        cycleId: activeCycle?.id,
        cycleName: activeCycle?.cycleName,
        cycleStatus: 'active',
        cycleStartedAt: effectiveDocStart,
        cycleStartMode: formData.cycleStartMode,
        ...(isMidcycle && {
          baselineDate,
          baselineDoc,
          baselineMbw: baselineMbwValue,
          baselineEstimatedPopulation: Number.isNaN(baselinePopulationValue) ? undefined : baselinePopulationValue,
          baselineSurvivalRate: Number.isNaN(baselineSurvivalValue) ? undefined : baselineSurvivalValue,
          baselineCumulativeFeed: Number.isNaN(baselineFeedValue) ? undefined : baselineFeedValue,
          baselineSource: 'user_midcycle_estimate',
        }),
        createdAt: serverTimestamp(),
        createdBy: user.uid
      };

      await addDoc(collection(db, 'companies', companyId, 'ponds'), removeUndefinedFields(pondData));
      setModalOpen(false);
      setFormData({
        pondName: '',
        pondArea: '',
        density: '',
        docStart: new Date().toISOString().split('T')[0],
        supplier: '',
        plValue: '0.5',
        cycleStartMode: 'new',
        baselineDate: new Date().toISOString().split('T')[0],
        baselineMbw: '',
        baselineEstimatedPopulation: '',
        baselineSurvivalRate: '',
        baselineCumulativeFeed: ''
      });
    } catch (error) {
      console.error('Error adding pond:', error);
      alert(t.messages.error || 'Failed to add pond. Please check your connection.');
    }
  };

  const handleEndCycle = async () => {
    if (!companyId || !user || !endCyclePond) return;
    if (!canEditPonds) return;
    try {
      await updateDoc(doc(db, 'companies', companyId, 'ponds', endCyclePond.id), {
        cycleStatus: 'ended',
        cycleEndedAt: endCycleForm.cycleEndedAt,
        cycleEndReason: endCycleForm.cycleEndReason,
        cycleEndedBy: user.uid,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      setEndCyclePond(null);
      setEndCycleForm({
        cycleEndedAt: new Date().toISOString().split('T')[0],
        cycleEndReason: 'harvested',
      });
      setCycleFilter('ended');
    } catch (error) {
      console.error('Error ending cycle:', error);
      alert(t.messages.error || 'Failed to end cycle.');
    }
  };

  const openStartCycle = (pond: Pond) => {
    if (!canEditPonds) return;
    setStartCyclePond(pond);
    setStartCycleForm({
      density: '',
      docStart: new Date().toISOString().split('T')[0],
      plValue: '0.5',
      plSupplier: '',
    });
  };

  const openBaselineEdit = (pond: Pond) => {
    if (!canEditPonds) return;
    const baselineSampling = (pond.samplings || []).filter((sampling) =>
      Boolean(sampling.isBaselineEstimate) || sampling.source === 'midcycle_onboarding'
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    setBaselineEditPond(pond);
    setBaselineForm({
      baselineDate: pond.baselineDate || baselineSampling?.date || new Date().toISOString().split('T')[0],
      baselineMbw: String(pond.baselineMbw ?? baselineSampling?.mbw ?? ''),
      baselineEstimatedPopulation: String(pond.baselineEstimatedPopulation ?? baselineSampling?.estimatedPopulation ?? ''),
      baselineSurvivalRate: String(pond.baselineSurvivalRate ?? baselineSampling?.estimatedSurvivalRate ?? ''),
      baselineCumulativeFeed: String(pond.baselineCumulativeFeed ?? baselineSampling?.cumulativeFeedToDate ?? baselineSampling?.feed ?? '')
    });
  };

  const handleUpdateBaseline = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!companyId || !user || !baselineEditPond) return;
    if (!canEditPonds) return;

    const cycleStartDate = baselineEditPond.docStart || baselineEditPond.cycleStartedAt || baselineForm.baselineDate;
    const baselineDocValue = calculateDocFromDates(cycleStartDate, baselineForm.baselineDate);
    const baselineMbwValue = parseFloat(baselineForm.baselineMbw);
    const baselinePopulationValue = parseFloat(baselineForm.baselineEstimatedPopulation);
    const baselineSurvivalValue = parseFloat(baselineForm.baselineSurvivalRate);
    const baselineFeedValue = parseFloat(baselineForm.baselineCumulativeFeed);

    if (!baselineForm.baselineMbw || Number.isNaN(baselineMbwValue) || baselineMbwValue <= 0) {
      alert(t.midcycleOnboarding?.baselineMbwRequired || 'Current MBW is required for an existing cycle.');
      return;
    }

    if (!baselineForm.baselineDate || !Number.isFinite(baselineDocValue) || baselineDocValue < 0) {
      alert(t.midcycleOnboarding?.baselineDocRequired || 'Current DOC is required for an existing cycle.');
      return;
    }

    const baselineSamplingIndex = (baselineEditPond.samplings || []).findIndex((sampling) =>
      Boolean(sampling.isBaselineEstimate) || sampling.source === 'midcycle_onboarding'
    );
    const existingBaseline = baselineSamplingIndex >= 0 ? baselineEditPond.samplings[baselineSamplingIndex] : undefined;
    const baselineSampling: Sampling = {
      id: existingBaseline?.id || `baseline-${Date.now()}`,
      date: baselineForm.baselineDate,
      mbw: baselineMbwValue,
      mortality: 0,
      feed: Number.isNaN(baselineFeedValue) ? 0 : baselineFeedValue,
      isBaselineEstimate: true,
      source: 'midcycle_onboarding',
      cycleId: baselineEditPond.cycleId,
      cycleName: baselineEditPond.cycleName,
      pondCycleId: baselineEditPond.pondCycleId || baselineEditPond.id,
      ...(Number.isNaN(baselinePopulationValue) ? {} : { estimatedPopulation: baselinePopulationValue }),
      ...(Number.isNaN(baselineSurvivalValue) ? {} : { estimatedSurvivalRate: baselineSurvivalValue }),
      ...(Number.isNaN(baselineFeedValue) ? {} : { cumulativeFeedToDate: baselineFeedValue }),
    };
    const samplings = baselineSamplingIndex >= 0
      ? baselineEditPond.samplings.map((sampling, index) => index === baselineSamplingIndex ? baselineSampling : sampling)
      : [baselineSampling, ...(baselineEditPond.samplings || [])];

    try {
      await updateDoc(doc(db, 'companies', companyId, 'ponds', baselineEditPond.id), removeUndefinedFields({
        docStart: cycleStartDate,
        cycleStartedAt: cycleStartDate,
        cycleStartMode: 'midcycle',
        baselineDate: baselineForm.baselineDate,
        baselineDoc: baselineDocValue,
        baselineMbw: baselineMbwValue,
        baselineEstimatedPopulation: Number.isNaN(baselinePopulationValue) ? undefined : baselinePopulationValue,
        baselineSurvivalRate: Number.isNaN(baselineSurvivalValue) ? undefined : baselineSurvivalValue,
        baselineCumulativeFeed: Number.isNaN(baselineFeedValue) ? undefined : baselineFeedValue,
        baselineSource: 'user_midcycle_estimate',
        samplings,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      }) as Record<string, unknown>);
      setBaselineEditPond(null);
    } catch (error) {
      console.error('Error updating baseline:', error);
      alert(t.messages.error || 'Failed to update baseline.');
    }
  };

  const handleStartCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !user || !startCyclePond) return;
    if (!canEditPonds) return;

    try {
      const hasActiveCycleForPond = ponds.some((pond) =>
        pond.id !== startCyclePond.id &&
        isActiveCycle(pond) &&
        getPhysicalPondKey(pond.pondName) === getPhysicalPondKey(startCyclePond.pondName)
      );

      if (hasActiveCycleForPond) {
        alert(`${startCyclePond.pondName} already has an active cycle. End that pond first before starting another cycle for it.`);
        return;
      }

      const initialPopulation = Number(startCyclePond.pondArea) * Number(startCycleForm.density);
      const initialWeight = parseFloat(startCycleForm.plValue) / 10;
      const activeCycle = await ensureActiveCycle(startCycleForm.docStart);

      await addDoc(collection(db, 'companies', companyId, 'ponds'), {
        pondName: startCyclePond.pondName,
        pondArea: Number(startCyclePond.pondArea),
        density: Number(startCycleForm.density),
        initialPopulation,
        docStart: startCycleForm.docStart,
        supplier: startCycleForm.plSupplier,
        plSupplier: startCycleForm.plSupplier,
        initialWeight,
        samplings: [],
        totalHarvestedBiomass: 0,
        totalHarvestedPopulation: 0,
        totalHarvestedFeed: 0,
        cycleId: activeCycle?.id,
        cycleName: activeCycle?.cycleName,
        cycleStatus: 'active',
        cycleStartedAt: startCycleForm.docStart,
        previousCyclePondId: startCyclePond.id,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });
      setStartCyclePond(null);
      setCycleFilter('active');
    } catch (error) {
      console.error('Error starting new cycle:', error);
      alert(t.messages.error || 'Failed to start new cycle.');
    }
  };

  const handleDeletePond = async (pondId: string) => {
    if (!canEditPonds) return;
    setDeleteConfirm({ isOpen: true, id: pondId });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id || !companyId) return;
    if (!canEditPonds) return;
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
    const normalizedSearch = debouncedSearchTerm.trim().toLowerCase();
    const statusFiltered = ponds.filter(p => getCycleStatus(p) === cycleFilter);
    if (!normalizedSearch) return statusFiltered;
    return statusFiltered.filter(p => p.pondName.toLowerCase().includes(normalizedSearch));
  }, [ponds, debouncedSearchTerm, cycleFilter]);

  return (
    <div className="dashboard-page-relaxed" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div className="glass-card animate-fade-up" style={{ padding: '26px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '18px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
              Current Cycle
            </div>
            <h2 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              {activeFarmCycle?.cycleName || 'No active cycle'}
            </h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '14px', fontWeight: 600 }}>
              {activeFarmCycle
                ? 'New ponds are added to this cycle until it is ended.'
                : `Add a pond to create Cycle ${cycles.length + 1}.`}
            </p>
          </div>
          <div style={{
            padding: '8px 14px',
            borderRadius: '10px',
            background: activeFarmCycle ? 'var(--primary-dim)' : 'var(--bg-mid)',
            color: activeFarmCycle ? 'var(--primary)' : 'var(--text-muted)',
            fontSize: '12px',
            fontWeight: 900,
            textTransform: 'uppercase',
          }}>
            {activeFarmCycle?.status || 'waiting'}
          </div>
        </div>

        {activeFarmCycle ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
              <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-mid)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', marginBottom: '4px' }}>Included ponds</div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--primary)' }}>{activeCyclePonds.length}</div>
              </div>
              <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-mid)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', marginBottom: '4px' }}>Stocking start</div>
                <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text-primary)' }}>{activeFarmCycle.stockingStartDate || activeFarmCycle.plannedStartDate || '-'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {activeCyclePonds.length === 0 ? (
                <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>No ponds attached yet.</span>
              ) : activeCyclePonds.map((pond) => (
                <span key={pond.id} style={{ padding: '7px 11px', borderRadius: '999px', background: 'var(--primary-dim)', color: 'var(--primary)', fontSize: '12px', fontWeight: 800 }}>
                  {pond.pondName}
                </span>
              ))}
            </div>

            {canEditPonds && (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  value={cycleNameDraft}
                  onChange={(event) => setCycleNameDraft(event.target.value)}
                  placeholder="Cycle name"
                  style={{
                    flex: '1 1 260px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-mid)',
                    color: 'var(--text-primary)',
                    fontWeight: 700,
                    outline: 'none',
                  }}
                />
                <button type="button" className="btn-secondary" onClick={handleRenameCycle} style={{ padding: '12px 16px', borderRadius: '12px', fontWeight: 800 }}>
                  <Save size={17} /> Rename
                </button>
                <button type="button" className="btn-primary" onClick={handleCloseFarmCycle} style={{ padding: '12px 16px', borderRadius: '12px', fontWeight: 800 }}>
                  <Lock size={17} /> End Cycle
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: '18px', borderRadius: '12px', background: 'var(--bg-mid)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600 }}>
            Cycle management will appear here after the first pond is added.
          </div>
        )}
      </div>
      
      {/* Toolbar */}
      <div className="glass-card dashboard-toolbar-card animate-fade-up animate-delay-1">
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
          <button onClick={() => setCycleFilter('active')} style={{ 
            padding: '8px 20px', borderRadius: '10px', background: 'var(--glass-bg)', 
            border: '1px solid var(--border)', fontSize: '13px', fontWeight: 700,
            color: cycleFilter === 'active' ? 'var(--primary)' : 'var(--text-muted)',
            boxShadow: cycleFilter === 'active' ? 'var(--shadow-card)' : 'none',
            opacity: cycleFilter === 'active' ? 1 : 0.75,
          }}>
            {t.ponds.active || 'Active'}
          </button>
          <button onClick={() => setCycleFilter('ended')} style={{ 
            padding: '8px 20px', borderRadius: '10px',
            background: cycleFilter === 'ended' ? 'var(--glass-bg)' : 'transparent',
            border: cycleFilter === 'ended' ? '1px solid var(--border)' : 'none',
            fontSize: '13px', fontWeight: 700,
            color: cycleFilter === 'ended' ? 'var(--primary)' : 'var(--text-muted)',
            boxShadow: cycleFilter === 'ended' ? 'var(--shadow-card)' : 'none',
          }}>
            Ended
          </button>
        </div>
        {canEditPonds && (
          <button className="dashboard-action dashboard-action-primary" onClick={() => setModalOpen(true)}>
            <Plus size={20} strokeWidth={3} />
            <span>{t.ponds.addNew || 'Add New Pond'}</span>
          </button>
        )}
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
          {canEditPonds && (
            <button className="btn-primary" onClick={() => setModalOpen(true)}>
              <Plus size={20} strokeWidth={3} />
              {t.ponds.addNew || 'Add New Pond'}
            </button>
          )}
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
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{getPlSupplier(pond)}</p>
                    {pond.cycleStartMode === 'midcycle' && (
                      <span style={{
                        display: 'inline-flex',
                        marginTop: '6px',
                        padding: '3px 8px',
                        borderRadius: '8px',
                        background: '#BBE1FA',
                        color: '#0F4C75',
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em'
                      }}>
                        {t.midcycleOnboarding?.importedMidcycle || 'Imported mid-cycle'}
                      </span>
                    )}
                  </div>
                </Link>
                {canEditPonds && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  {pond.cycleStartMode === 'midcycle' && isActiveCycle(pond) && (
                    <button
                      onClick={() => openBaselineEdit(pond)}
                      title="Edit baseline estimates"
                      style={{
                        background: '#EAF6FD', border: '1px solid #BBE1FA', color: '#0F4C75',
                        cursor: 'pointer', padding: '8px', borderRadius: '10px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Pencil size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => isActiveCycle(pond) ? setEndCyclePond(pond) : openStartCycle(pond)}
                    title={isActiveCycle(pond) ? 'End cycle' : 'Start new cycle'}
                    style={{
                      background: 'var(--bg-mid)', border: 'none', color: isActiveCycle(pond) ? 'var(--primary)' : '#3282B8',
                      cursor: 'pointer', padding: '8px', borderRadius: '10px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'var(--primary-dim)';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'var(--bg-mid)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    {isActiveCycle(pond) ? <Archive size={18} /> : <RotateCcw size={18} />}
                  </button>
                </div>
                )}
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
                    <div style={{ color: 'var(--primary)' }}><Shrimp size={18} /></div>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t.midcycleOnboarding?.cycleQuestion || 'How is this cycle starting?'}
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {(['new', 'midcycle'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setFormData({ ...formData, cycleStartMode: mode })}
                        style={{
                          padding: '13px 14px',
                          borderRadius: '12px',
                          border: `1px solid ${formData.cycleStartMode === mode ? 'var(--primary)' : 'var(--border)'}`,
                          background: formData.cycleStartMode === mode ? 'var(--primary)' : 'var(--bg-mid)',
                          color: formData.cycleStartMode === mode ? '#FFFFFF' : 'var(--text-primary)',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        {mode === 'new'
                          ? (t.midcycleOnboarding?.newCycle || 'New cycle')
                          : (t.midcycleOnboarding?.existingCycle || 'Existing cycle')}
                      </button>
                    ))}
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                    {formData.cycleStartMode === 'midcycle'
                      ? (t.midcycleOnboarding?.existingCycleHint || 'Use this when the pond is already running. Shrimply will create one estimated baseline record.')
                      : (t.midcycleOnboarding?.newCycleHint || 'Use this when stocking starts in Shrimply.')}
                  </p>
                </div>
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
                {formData.cycleStartMode === 'midcycle' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.midcycleOnboarding?.currentMbw || 'Current MBW (g)'}</label>
                      <input required type="number" step="0.01" placeholder={t.midcycleOnboarding?.currentMbwPlaceholder || 'e.g. 7'} value={formData.baselineMbw} onChange={e => setFormData({...formData, baselineMbw: e.target.value})} style={{ padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none', fontSize: '1rem', fontWeight: 600 }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.midcycleOnboarding?.currentPopulation || 'Current Population (optional)'}</label>
                      <input type="number" placeholder={t.midcycleOnboarding?.currentPopulationPlaceholder || 'e.g. 85000'} value={formData.baselineEstimatedPopulation} onChange={e => setFormData({...formData, baselineEstimatedPopulation: e.target.value})} style={{ padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none', fontSize: '1rem', fontWeight: 600 }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.midcycleOnboarding?.survivalRate || 'Current SR % (optional)'}</label>
                      <input type="number" step="0.1" placeholder={t.midcycleOnboarding?.survivalRatePlaceholder || 'e.g. 85'} value={formData.baselineSurvivalRate} onChange={e => setFormData({...formData, baselineSurvivalRate: e.target.value})} style={{ padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none', fontSize: '1rem', fontWeight: 600 }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 2' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.midcycleOnboarding?.feedUsedSoFar || 'Feed Used So Far (kg, optional)'}</label>
                      <input type="number" step="0.01" placeholder={t.midcycleOnboarding?.feedUsedSoFarPlaceholder || 'e.g. 850'} value={formData.baselineCumulativeFeed} onChange={e => setFormData({...formData, baselineCumulativeFeed: e.target.value})} style={{ padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none', fontSize: '1rem', fontWeight: 600 }} />
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>{t.midcycleOnboarding?.feedUsedSoFarHint || 'Used for estimates only. It will not deduct inventory.'}</p>
                    </div>
                  </>
                )}
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

      {baselineEditPond && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
        }}>
          <div className="glass-card animate-fade-up" style={{ width: '100%', maxWidth: '620px', background: '#FFFFFF', padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '28px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Edit Baseline</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                  Corrects baseline estimates only. This will not deduct inventory or create normal sampling history.
                </p>
              </div>
              <button onClick={() => setBaselineEditPond(null)} style={{ background: 'var(--bg-mid)', border: 'none', borderRadius: '12px', padding: '10px', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateBaseline} style={{ padding: '28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t.midcycleOnboarding?.baselineDate || 'Baseline Date'}
                <input required type="date" value={baselineForm.baselineDate} onChange={e => setBaselineForm(prev => ({ ...prev, baselineDate: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t.midcycleOnboarding?.currentMbw || 'Current MBW (g)'}
                <input required type="number" step="0.01" value={baselineForm.baselineMbw} onChange={e => setBaselineForm(prev => ({ ...prev, baselineMbw: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t.midcycleOnboarding?.currentPopulation || 'Current Population (optional)'}
                <input type="number" value={baselineForm.baselineEstimatedPopulation} onChange={e => setBaselineForm(prev => ({ ...prev, baselineEstimatedPopulation: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t.midcycleOnboarding?.survivalRate || 'Current SR % (optional)'}
                <input type="number" step="0.1" value={baselineForm.baselineSurvivalRate} onChange={e => setBaselineForm(prev => ({ ...prev, baselineSurvivalRate: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t.midcycleOnboarding?.feedUsedSoFar || 'Feed Used So Far (kg, optional)'}
                <input type="number" step="0.01" value={baselineForm.baselineCumulativeFeed} onChange={e => setBaselineForm(prev => ({ ...prev, baselineCumulativeFeed: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
              </label>
              <div style={{ gridColumn: 'span 2', display: 'flex', gap: '14px', marginTop: '8px' }}>
                <button type="button" onClick={() => setBaselineEditPond(null)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '14px', borderRadius: '12px', fontWeight: 800 }}>Save Baseline</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {endCyclePond && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
        }}>
          <div className="glass-card animate-fade-up" style={{ width: '100%', maxWidth: '520px', background: '#FFFFFF', padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '28px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>End Cycle</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>{endCyclePond.pondName} history will stay saved.</p>
              </div>
              <button onClick={() => setEndCyclePond(null)} style={{ background: 'var(--bg-mid)', border: 'none', borderRadius: '12px', padding: '10px', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                End Date
                <input type="date" required value={endCycleForm.cycleEndedAt} onChange={e => setEndCycleForm(prev => ({ ...prev, cycleEndedAt: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', color: 'var(--text-primary)' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Reason
                <select value={endCycleForm.cycleEndReason} onChange={e => setEndCycleForm(prev => ({ ...prev, cycleEndReason: e.target.value as typeof endCycleForm.cycleEndReason }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', color: 'var(--text-primary)' }}>
                  <option value="harvested">Harvested</option>
                  <option value="disease">Disease</option>
                  <option value="reset">Reset</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <div style={{ display: 'flex', gap: '14px', marginTop: '8px' }}>
                <button type="button" onClick={() => setEndCyclePond(null)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button type="button" onClick={handleEndCycle} className="btn-primary" style={{ flex: 1, padding: '14px', borderRadius: '12px', fontWeight: 800 }}>End Cycle</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {startCyclePond && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
        }}>
          <div className="glass-card animate-fade-up" style={{ width: '100%', maxWidth: '640px', background: '#FFFFFF', padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '28px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Start New Cycle</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>{startCyclePond.pondName} and {startCyclePond.pondArea} m² will be reused. Supplier must be entered for this cycle.</p>
              </div>
              <button onClick={() => setStartCyclePond(null)} style={{ background: 'var(--bg-mid)', border: 'none', borderRadius: '12px', padding: '10px', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleStartCycle} style={{ padding: '28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Density (PL/m²)
                <input required type="number" value={startCycleForm.density} onChange={e => setStartCycleForm(prev => ({ ...prev, density: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Stocking Date
                <input required type="date" value={startCycleForm.docStart} onChange={e => setStartCycleForm(prev => ({ ...prev, docStart: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                PL Value (g)
                <input required type="number" step="0.1" value={startCycleForm.plValue} onChange={e => setStartCycleForm(prev => ({ ...prev, plValue: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                PL Supplier
                <input required value={startCycleForm.plSupplier} onChange={e => setStartCycleForm(prev => ({ ...prev, plSupplier: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
              </label>
              <div style={{ gridColumn: 'span 2', display: 'flex', gap: '14px', marginTop: '8px' }}>
                <button type="button" onClick={() => setStartCyclePond(null)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '14px', borderRadius: '12px', fontWeight: 800 }}>Start Cycle</button>
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
