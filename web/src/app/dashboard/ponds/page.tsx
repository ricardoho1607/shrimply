"use client";

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
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
  Pencil,
  Trash2
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, doc, addDoc, serverTimestamp, deleteDoc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useLanguage } from '@/contexts/LanguageContext';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useCompanyBlocks, useCompanyCycles, useCompanyHarvestRecords, useCompanyPhysicalPonds, useCompanyPonds, useDebouncedValue } from '@/hooks/useDashboardData';
import { useAuth } from '@/contexts/AuthContext';
import { useFarmDateKey } from '@/hooks/useFarmDateKey';
import { hasFinalHarvestForPondCycle, type HarvestType } from '../../../../../shared/harvestCalculations';
import StartPondCycleModal from '@/components/StartPondCycleModal';
import {
  StartPondCycleError,
  startPondCycle,
  type StartPondCycleFormValue,
} from '@/lib/startPondCycle';
import {
  canManageEnterpriseFarmCycle,
  filterEnterpriseRecordsForUser,
} from '../../../../../shared/enterpriseBlocks';

/* --- Types --------------------------------------------------- */
interface Sampling {
  id: string; date: string; mbw: number; mortality: number; feed: number;
  cycleId?: string; cycleName?: string; pondCycleId?: string;
  isBaselineEstimate?: boolean; source?: string;
  estimatedPopulation?: number; estimatedSurvivalRate?: number; cumulativeFeedToDate?: number;
}

interface Pond {
  id: string; pondName: string; pondArea: number; density: number; initialPopulation: number;
  blockId?: string;
  blockName?: string;
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

interface HarvestRecord {
  id: string;
  cycleId?: string;
  ponds: {
    pondId: string;
    pondCycleId?: string;
    cycleId?: string;
    harvestType?: HarvestType;
  }[];
}

interface PhysicalPond {
  id: string;
  pondName: string;
  pondArea: number;
  blockId?: string;
  blockName?: string;
  status?: 'idle' | 'active';
  activePondId?: string | null;
  createdAt?: { toDate?: () => Date; seconds?: number };
  updatedAt?: { toDate?: () => Date; seconds?: number };
}

interface FarmBlock {
  id: string;
  companyId: string;
  name: string;
  assignedTechnicianId?: string | null;
}

type InactivePondOption = PhysicalPond;
type DeleteTarget = {
  isOpen: boolean;
  id: string | null;
  type: 'physical' | 'cycle' | null;
  pondName?: string;
};

const getCycleStatus = (pond: Pond) => pond.cycleStatus === 'ended' ? 'ended' : 'active';
const isActiveCycle = (pond: Pond) => getCycleStatus(pond) === 'active';
const isPhysicalPondActive = (pond: PhysicalPond) => pond.status === 'active' || Boolean(pond.activePondId);
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

const getLatestSamplingDate = (samplings: Sampling[] = []): string | null => {
  const latestSampling = samplings
    .filter((sampling) => sampling.date && !sampling.isBaselineEstimate && sampling.source !== 'midcycle_onboarding')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  return latestSampling?.date || null;
};

const removeUndefinedFields = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(removeUndefinedFields);
  if (!value || typeof value !== 'object') return value;

  return Object.entries(value).reduce((cleaned, [key, entry]) => {
    if (entry !== undefined) cleaned[key] = removeUndefinedFields(entry);
    return cleaned;
  }, {} as Record<string, unknown>);
};

export default function PondsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { company } = useAuth();
  const { data: ponds, loading, companyId, user } = useCompanyPonds<Pond>('desc');
  const { data: physicalPonds, loading: physicalPondsLoading } = useCompanyPhysicalPonds<PhysicalPond>('asc');
  const { data: farmBlocks } = useCompanyBlocks<FarmBlock>('asc');
  const { data: cycles } = useCompanyCycles<FarmCycle>();
  const { data: harvestRecords } = useCompanyHarvestRecords<HarvestRecord>();
  const today = useFarmDateKey(company?.timeZone);

  const [isModalOpen, setModalOpen] = useState(false);
  const [cycleFilter, setCycleFilter] = useState<'active' | 'inactive' | 'ended'>('active');
  const startRequestHandledRef = useRef(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebouncedValue(searchTerm);
  const [cycleNameDraft, setCycleNameDraft] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    pondName: '',
    pondArea: '',
    blockId: '',
    density: '',
    docStart: today,
    supplier: '',
    plValue: '',
    cycleStartMode: 'new' as 'new' | 'midcycle',
    baselineDate: today,
    baselineMbw: '',
    baselineEstimatedPopulation: '',
    baselineSurvivalRate: '',
    baselineCumulativeFeed: ''
  });

  const [deleteConfirm, setDeleteConfirm] = useState<DeleteTarget>({
    isOpen: false,
    id: null,
    type: null,
  });
  const [endCyclePond, setEndCyclePond] = useState<Pond | null>(null);
  const [endCycleForm, setEndCycleForm] = useState({
    cycleEndedAt: today,
    cycleEndReason: 'harvested' as 'harvested' | 'disease' | 'reset' | 'other',
  });
  const [startCyclePond, setStartCyclePond] = useState<(Pond | PhysicalPond) | null>(null);
  const [pendingPhysicalPonds, setPendingPhysicalPonds] = useState<PhysicalPond[]>([]);
  const [startingPondCycle, setStartingPondCycle] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [finalHarvestPromptPonds, setFinalHarvestPromptPonds] = useState<Pond[]>([]);
  const [baselineEditPond, setBaselineEditPond] = useState<Pond | null>(null);
  const [baselineForm, setBaselineForm] = useState({
    baselineDate: today,
    baselineMbw: '',
    baselineEstimatedPopulation: '',
    baselineSurvivalRate: '',
    baselineCumulativeFeed: ''
  });

  const allPhysicalPonds = useMemo(() => {
    if (pendingPhysicalPonds.length === 0) return physicalPonds;

    const serverIds = new Set(physicalPonds.map((pond) => pond.id));
    const serverNames = new Set(physicalPonds.map((pond) => getPhysicalPondKey(pond.pondName)));
    const unconfirmedPonds = pendingPhysicalPonds.filter((pond) =>
      !serverIds.has(pond.id) && !serverNames.has(getPhysicalPondKey(pond.pondName))
    );

    return [...physicalPonds, ...unconfirmedPonds];
  }, [pendingPhysicalPonds, physicalPonds]);

  useEffect(() => {
    if (pendingPhysicalPonds.length === 0 || physicalPonds.length === 0) return;

    let isActive = true;
    const serverIds = new Set(physicalPonds.map((pond) => pond.id));
    const serverNames = new Set(physicalPonds.map((pond) => getPhysicalPondKey(pond.pondName)));

    queueMicrotask(() => {
      if (!isActive) return;
      setPendingPhysicalPonds((pending) =>
        pending.filter((pond) =>
          !serverIds.has(pond.id) && !serverNames.has(getPhysicalPondKey(pond.pondName))
        )
      );
    });

    return () => {
      isActive = false;
    };
  }, [pendingPhysicalPonds.length, physicalPonds]);

  const activeFarmCycle = useMemo(() => cycles.find(isOpenFarmCycle), [cycles]);
  const canEditPonds = canEditOperations(user?.role);
  const isEnterpriseFarm = company?.businessSize === 'enterprise';
  const canManageFarmCycle = canEditPonds && canManageEnterpriseFarmCycle(company?.businessSize, user?.role);
  const availableFarmBlocks = useMemo(() => {
    if (!isEnterpriseFarm) return [];
    if (user?.role === 'owner' || user?.role === 'co-owner') return farmBlocks;
    if (user?.role === 'technician') return farmBlocks.filter((block) => block.assignedTechnicianId === user.uid);
    return [];
  }, [farmBlocks, isEnterpriseFarm, user]);
  const accessiblePonds = useMemo(() => filterEnterpriseRecordsForUser(ponds, {
    businessSize: company?.businessSize,
    role: user?.role,
    userId: user?.uid,
    blocks: farmBlocks,
  }), [company?.businessSize, farmBlocks, ponds, user?.role, user?.uid]);
  const accessiblePhysicalPonds = useMemo(() => filterEnterpriseRecordsForUser(allPhysicalPonds, {
    businessSize: company?.businessSize,
    role: user?.role,
    userId: user?.uid,
    blocks: farmBlocks,
  }), [allPhysicalPonds, company?.businessSize, farmBlocks, user?.role, user?.uid]);
  const activeCyclePonds = useMemo(
    () => activeFarmCycle
      ? accessiblePonds.filter((pond) => isActiveCycle(pond) && (pond.cycleId === activeFarmCycle.id || !pond.cycleId))
      : [],
    [accessiblePonds, activeFarmCycle]
  );
  const activePondCount = activeCyclePonds.length;
  const endedPondCount = useMemo(
    () => accessiblePonds.filter((pond) => getCycleStatus(pond) === 'ended').length,
    [accessiblePonds],
  );

  useEffect(() => {
    queueMicrotask(() => setCycleNameDraft(activeFarmCycle?.cycleName || ''));
  }, [activeFarmCycle?.id, activeFarmCycle?.cycleName]);

  const ensureActiveCycle = async (stockingDate: string) => {
    if (!companyId || !user || !canEditPonds) return null;
    const activeCycle = cycles.find(isOpenFarmCycle);
    if (activeCycle) return activeCycle;
    if (isEnterpriseFarm) {
      alert(t.enterprise.ownerMustStartCycle);
      return null;
    }

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
    if (!canManageFarmCycle) return;
    const nextName = cycleNameDraft.trim();
    if (!nextName) {
      alert('Cycle name cannot be empty.');
      return;
    }

    try {
      for (let index = 0; index < activeCyclePonds.length; index += 400) {
        const batch = writeBatch(db);
        activeCyclePonds.slice(index, index + 400).forEach((pond) => {
          batch.update(doc(db, 'companies', companyId, 'ponds', pond.id), {
            cycleName: nextName,
            updatedAt: serverTimestamp(),
            updatedBy: user.uid,
          });
        });
        await batch.commit();
      }
      await updateDoc(doc(db, 'companies', companyId, 'cycles', activeFarmCycle.id), {
        cycleName: nextName,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
    } catch (error) {
      console.error('Error renaming cycle:', error);
      alert(t.messages.error || 'Failed to rename cycle.');
    }
  };

  const handleCloseFarmCycle = async () => {
    if (!companyId || !user || !activeFarmCycle) return;
    if (!canManageFarmCycle) return;
    const missingFinalHarvestPonds = activeCyclePonds.filter((pond) =>
      !hasFinalHarvestForPondCycle(harvestRecords, pond)
    );
    if (missingFinalHarvestPonds.length > 0) {
      setFinalHarvestPromptPonds(missingFinalHarvestPonds);
      return;
    }
    if (!window.confirm(`End ${activeFarmCycle.cycleName} and move ${activeCyclePonds.length} pond${activeCyclePonds.length === 1 ? '' : 's'} to history?`)) return;

    try {
      const activePondsToEnd = activeCyclePonds.filter(isActiveCycle);
      const activePondIds = new Set(activePondsToEnd.map((pond) => pond.id));
      const activePondNames = new Set(activePondsToEnd.map((pond) => getPhysicalPondKey(pond.pondName)));
      const lifecycleUpdates: Array<{
        ref: ReturnType<typeof doc>;
        data: Record<string, unknown>;
      }> = [];
      activePondsToEnd.forEach((pond) => {
        lifecycleUpdates.push({ ref: doc(db, 'companies', companyId, 'ponds', pond.id), data: {
          cycleStatus: 'ended',
          cycleEndedAt: today,
          cycleEndReason: 'harvested',
          cycleEndedBy: user.uid,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        } });
      });
      accessiblePhysicalPonds
        .filter((physicalPond) =>
          (physicalPond.activePondId && activePondIds.has(physicalPond.activePondId)) ||
          (isPhysicalPondActive(physicalPond) && activePondNames.has(getPhysicalPondKey(physicalPond.pondName)))
        )
        .forEach((physicalPond) => {
          lifecycleUpdates.push({ ref: doc(db, 'companies', companyId, 'physicalPonds', physicalPond.id), data: {
            status: 'idle',
            activePondId: null,
            updatedAt: serverTimestamp(),
            updatedBy: user.uid,
          } });
        });

      for (let index = 0; index < lifecycleUpdates.length; index += 400) {
        const batch = writeBatch(db);
        lifecycleUpdates.slice(index, index + 400).forEach((update) => {
          batch.update(update.ref, update.data);
        });
        await batch.commit();
      }
      await updateDoc(doc(db, 'companies', companyId, 'cycles', activeFarmCycle.id), {
        status: 'closed',
        closedAt: today,
        stockingEndDate: activeFarmCycle.stockingEndDate || today,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });

      setCycleFilter('ended');
      const openReport = window.confirm(
        `${t.farmCycle.endFarmCycleSuccess.replace('{{cycleName}}', activeFarmCycle.cycleName)}\n\n${t.farmCycle.viewCycleReport}`,
      );
      if (openReport) router.push(`/dashboard/reports/cycles?cycleId=${encodeURIComponent(activeFarmCycle.id)}`);
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
      const pondName = formData.pondName.trim();
      const pondArea = Number(formData.pondArea);
      const selectedBlock = availableFarmBlocks.find((block) => block.id === formData.blockId);
      if (isEnterpriseFarm && !selectedBlock) {
        alert(availableFarmBlocks.length === 0 ? t.enterprise.noAssignedBlocks : t.enterprise.blockRequired);
        return;
      }
      const pondKey = getPhysicalPondKey(pondName);
      const alreadyExists = allPhysicalPonds.some((pond) => getPhysicalPondKey(pond.pondName) === pondKey) ||
        ponds.some((pond) => getPhysicalPondKey(pond.pondName) === pondKey);

      if (alreadyExists) {
        alert(`${pondName} already exists. Use Start Cycle to begin production for this pond.`);
        return;
      }

      const physicalPondRef = doc(collection(db, 'companies', companyId, 'physicalPonds'));
      const pendingPond: PhysicalPond = {
        id: physicalPondRef.id,
        pondName,
        pondArea,
        blockId: selectedBlock?.id,
        blockName: selectedBlock?.name,
        status: 'idle',
      };
      const pondData = {
        pondName,
        pondArea,
        blockId: selectedBlock?.id,
        blockName: selectedBlock?.name,
        status: 'idle',
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      };

      setPendingPhysicalPonds((pending) => [...pending, pendingPond]);
      setModalOpen(false);
      setCycleFilter('inactive');
      setFormData({
        pondName: '',
        pondArea: '',
        blockId: '',
        density: '',
        docStart: today,
        supplier: '',
        plValue: '',
        cycleStartMode: 'new',
        baselineDate: today,
        baselineMbw: '',
        baselineEstimatedPopulation: '',
        baselineSurvivalRate: '',
        baselineCumulativeFeed: ''
      });
      await setDoc(physicalPondRef, removeUndefinedFields(pondData) as Record<string, unknown>);
    } catch (error) {
      console.error('Error adding pond:', error);
      const failedPondKey = getPhysicalPondKey(formData.pondName);
      setPendingPhysicalPonds((pending) =>
        pending.filter((pond) => getPhysicalPondKey(pond.pondName) !== failedPondKey)
      );
      alert(t.messages.error || 'Failed to add pond. Please check your connection.');
    }
  };

  const handleEndCycle = async () => {
    if (!companyId || !user || !endCyclePond) return;
    if (!canEditPonds) return;
    if (
      endCycleForm.cycleEndReason === 'harvested' &&
      !hasFinalHarvestForPondCycle(harvestRecords, endCyclePond)
    ) {
      setFinalHarvestPromptPonds([endCyclePond]);
      setEndCyclePond(null);
      return;
    }
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'companies', companyId, 'ponds', endCyclePond.id), {
        cycleStatus: 'ended',
        cycleEndedAt: endCycleForm.cycleEndedAt,
        cycleEndReason: endCycleForm.cycleEndReason,
        cycleEndedBy: user.uid,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      accessiblePhysicalPonds
        .filter((physicalPond) =>
          physicalPond.activePondId === endCyclePond.id ||
          (isPhysicalPondActive(physicalPond) && getPhysicalPondKey(physicalPond.pondName) === getPhysicalPondKey(endCyclePond.pondName))
        )
        .forEach((physicalPond) => {
          batch.update(doc(db, 'companies', companyId, 'physicalPonds', physicalPond.id), {
            status: 'idle',
            activePondId: null,
            updatedAt: serverTimestamp(),
            updatedBy: user.uid,
          });
        });
      await batch.commit();
      setEndCyclePond(null);
      setEndCycleForm({
        cycleEndedAt: today,
        cycleEndReason: 'harvested',
      });
      setCycleFilter('ended');
    } catch (error) {
      console.error('Error ending cycle:', error);
      alert(t.messages.error || 'Failed to end cycle.');
    }
  };

  const openStartCycle = useCallback((pond: Pond | PhysicalPond) => {
    if (!canEditPonds) return;
    setStartCyclePond(pond);
  }, [canEditPonds]);

  useEffect(() => {
    if (
      startRequestHandledRef.current
      || loading
      || physicalPondsLoading
      || !canEditPonds
      || typeof window === 'undefined'
    ) return;

    const params = new URLSearchParams(window.location.search);
    const requestedPondId = params.get('startPondId');
    const requestedPondType = params.get('startPondType');
    if (!requestedPondId || !['physical', 'cycle'].includes(requestedPondType || '')) return;

    const requestedPond = requestedPondType === 'cycle'
      ? accessiblePonds.find((pond) => pond.id === requestedPondId && getCycleStatus(pond) === 'ended')
      : accessiblePhysicalPonds.find((pond) => pond.id === requestedPondId && !isPhysicalPondActive(pond));
    if (!requestedPond) {
      startRequestHandledRef.current = true;
      window.history.replaceState(window.history.state, '', '/dashboard/ponds');
      alert(t.startPondCycle.invalidRequest);
      return;
    }

    startRequestHandledRef.current = true;
    queueMicrotask(() => {
      setCycleFilter('inactive');
      openStartCycle(requestedPond);
      window.history.replaceState(window.history.state, '', '/dashboard/ponds');
    });
  }, [
    accessiblePhysicalPonds,
    accessiblePonds,
    canEditPonds,
    loading,
    openStartCycle,
    physicalPondsLoading,
    t.startPondCycle.invalidRequest,
  ]);

  const openBaselineEdit = (pond: Pond) => {
    if (!canEditPonds) return;
    const baselineSampling = (pond.samplings || []).filter((sampling) =>
      Boolean(sampling.isBaselineEstimate) || sampling.source === 'midcycle_onboarding'
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    setBaselineEditPond(pond);
    setBaselineForm({
      baselineDate: pond.baselineDate || baselineSampling?.date || today,
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

  const handleStartCycle = async (form: StartPondCycleFormValue) => {
    if (!companyId || !user || !startCyclePond) return;
    if (!canEditPonds) return;

    setStartingPondCycle(true);
    try {
      const activeCycle = await ensureActiveCycle(form.docStart);
      if (!activeCycle) return;
      await startPondCycle({
        companyId,
        userId: user.uid,
        pond: startCyclePond,
        pondType: 'cycleStatus' in startCyclePond ? 'cycle' : 'physical',
        activeCycle,
        form,
        today,
        activePonds: ponds,
      });
      setStartCyclePond(null);
      setCycleFilter('active');
    } catch (error) {
      console.error('Error starting new cycle:', error);
      const errorCode = error instanceof StartPondCycleError ? error.code : 'failed';
      alert(t.startPondCycle.errors[errorCode]);
    } finally {
      setStartingPondCycle(false);
    }
  };

  const openDeletePhysicalPond = (pond: PhysicalPond) => {
    if (!canEditPonds) {
      alert(t.home?.onlyTechniciansCanDelete || 'Only technicians, owners, and co-owners can delete ponds.');
      return;
    }

    if (isPhysicalPondActive(pond)) {
      alert(t.ponds?.activeDeleteBlocked || 'End the active cycle for this pond before deleting it.');
      return;
    }

    setDeleteConfirm({
      isOpen: true,
      id: pond.id,
      type: 'physical',
      pondName: pond.pondName,
    });
  };

  const openDeleteCyclePond = (pond: Pond) => {
    if (!canEditPonds) {
      alert(t.home?.onlyTechniciansCanDelete || 'Only technicians, owners, and co-owners can delete ponds.');
      return;
    }

    if (isActiveCycle(pond)) {
      alert(t.ponds?.activeDeleteBlocked || 'End the active cycle for this pond before deleting it.');
      return;
    }

    setDeleteConfirm({
      isOpen: true,
      id: pond.id,
      type: 'cycle',
      pondName: pond.pondName,
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id || !deleteConfirm.type || !companyId || !user) return;
    if (!canEditPonds) return;
    setIsDeleting(true);
    try {
      if (deleteConfirm.type === 'physical') {
        const physicalPond = accessiblePhysicalPonds.find((pond) => pond.id === deleteConfirm.id);

        if (!physicalPond) {
          alert(t.messages?.dataNotFound || 'Pond data not found.');
          return;
        }

        if (isPhysicalPondActive(physicalPond)) {
          alert(t.ponds?.activeDeleteBlocked || 'End the active cycle for this pond before deleting it.');
          return;
        }

        await deleteDoc(doc(db, 'companies', companyId, 'physicalPonds', physicalPond.id));
      } else {
        const pond = accessiblePonds.find((item) => item.id === deleteConfirm.id);

        if (!pond) {
          alert(t.messages?.dataNotFound || 'Pond data not found.');
          return;
        }

        if (isActiveCycle(pond)) {
          alert(t.ponds?.activeDeleteBlocked || 'End the active cycle for this pond before deleting it.');
          return;
        }

        const linkedPhysicalPond = accessiblePhysicalPonds.find((physicalPond) =>
          physicalPond.activePondId === pond.id ||
          (!isPhysicalPondActive(physicalPond) && getPhysicalPondKey(physicalPond.pondName) === getPhysicalPondKey(pond.pondName))
        );

        const batch = writeBatch(db);
        batch.delete(doc(db, 'companies', companyId, 'ponds', pond.id));
        if (linkedPhysicalPond?.activePondId === pond.id) {
          batch.update(doc(db, 'companies', companyId, 'physicalPonds', linkedPhysicalPond.id), {
            status: 'idle',
            activePondId: null,
            updatedAt: serverTimestamp(),
            updatedBy: user.uid,
          });
        }
        await batch.commit();
      }

      setDeleteConfirm({ isOpen: false, id: null, type: null });
      alert(t.ponds?.deleteSuccess || 'Pond deleted successfully.');
    } catch (error) {
      console.error('Error deleting pond:', error);
      alert(t.messages.error || 'Failed to delete pond.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredPonds = useMemo(() => {
    if (cycleFilter === 'inactive') return [];
    const normalizedSearch = debouncedSearchTerm.trim().toLowerCase();
    const statusFiltered = accessiblePonds.filter(p => getCycleStatus(p) === cycleFilter);
    if (!normalizedSearch) return statusFiltered;
    return statusFiltered.filter(p => p.pondName.toLowerCase().includes(normalizedSearch));
  }, [accessiblePonds, debouncedSearchTerm, cycleFilter]);
  const inactivePondOptions = useMemo<InactivePondOption[]>(() => {
    const activeNames = new Set(accessiblePonds.filter(isActiveCycle).map((pond) => getPhysicalPondKey(pond.pondName)));
    return accessiblePhysicalPonds.filter((pond) =>
      !isPhysicalPondActive(pond) && !activeNames.has(getPhysicalPondKey(pond.pondName))
    );
  }, [accessiblePhysicalPonds, accessiblePonds]);
  const filteredPhysicalPonds = useMemo<InactivePondOption[]>(() => {
    if (cycleFilter !== 'inactive') return [];
    const normalizedSearch = debouncedSearchTerm.trim().toLowerCase();
    return inactivePondOptions
      .filter((pond) => !normalizedSearch || pond.pondName.toLowerCase().includes(normalizedSearch));
  }, [cycleFilter, debouncedSearchTerm, inactivePondOptions]);
  const deletePondName = deleteConfirm.pondName || t.ponds?.pondName || 'this pond';
  const deleteTitle = deleteConfirm.type === 'physical'
    ? (t.ponds?.deleteInactiveTitle || 'Delete inactive pond?')
    : (t.ponds?.deleteEndedTitle || 'Delete ended pond record?');
  const deleteMessageTemplate = deleteConfirm.type === 'physical'
    ? (t.ponds?.deleteInactiveConfirm || 'Delete {{pondName}}? This removes the inactive physical pond placeholder and cannot be undone.')
    : (t.ponds?.deleteEndedConfirm || 'Delete {{pondName}}? This permanently removes this ended cycle record and its sampling history.');
  const deleteMessage = deleteMessageTemplate.replace('{{pondName}}', deletePondName);

  return (
    <div className="dashboard-page-relaxed" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div className="glass-card animate-fade-up" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--primary-dim)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <RotateCcw size={17} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-faint)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Current Cycle
              </span>
              <span style={{
                padding: '3px 8px',
                borderRadius: '999px',
                background: activeFarmCycle ? 'var(--primary-dim)' : 'var(--bg-mid)',
                color: activeFarmCycle ? 'var(--primary)' : 'var(--text-muted)',
                fontSize: '0.66rem',
                fontWeight: 900,
                textTransform: 'uppercase',
              }}>
                {activeFarmCycle?.status || 'waiting'}
              </span>
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activeFarmCycle?.cycleName || `Cycle ${cycles.length + 1} not started`}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 800 }}>
            <Waves size={15} color="var(--primary)" />
            {activeCyclePonds.length} pond{activeCyclePonds.length === 1 ? '' : 's'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 800 }}>
            <Calendar size={15} color="var(--primary)" />
            {activeFarmCycle?.stockingStartDate || activeFarmCycle?.plannedStartDate || 'No start date'}
          </div>
          {canManageFarmCycle && activeFarmCycle && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                value={cycleNameDraft}
                onChange={(event) => setCycleNameDraft(event.target.value)}
                placeholder="Cycle name"
                aria-label="Cycle name"
                style={{
                  width: '160px',
                  padding: '8px 10px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-mid)',
                  color: 'var(--text-primary)',
                  fontSize: '0.78rem',
                  fontWeight: 750,
                  outline: 'none',
                }}
              />
              <button type="button" onClick={handleRenameCycle} title="Rename cycle" className="icon-btn-modern" style={{ width: '34px', height: '34px' }}>
                <Save size={15} />
              </button>
              <button type="button" onClick={handleCloseFarmCycle} title="End cycle" className="icon-btn-modern" style={{ width: '34px', height: '34px', color: '#e74c3c' }}>
                <Lock size={15} />
              </button>
            </div>
          )}
        </div>
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
        <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-mid)', padding: '5px', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <button onClick={() => setCycleFilter('active')} style={{
            padding: '8px 14px', borderRadius: '10px', background: cycleFilter === 'active' ? 'var(--glass-bg)' : 'transparent',
            border: '1px solid var(--border)', fontSize: '13px', fontWeight: 700,
            color: cycleFilter === 'active' ? 'var(--primary)' : 'var(--text-muted)',
            boxShadow: cycleFilter === 'active' ? 'var(--shadow-card)' : 'none',
            opacity: cycleFilter === 'active' ? 1 : 0.75,
          }}>
            {t.ponds.active || 'Active'} <span style={{ color: 'var(--text-faint)', marginLeft: '4px' }}>{activePondCount}</span>
          </button>
          <button onClick={() => setCycleFilter('inactive')} style={{
            padding: '8px 14px', borderRadius: '10px',
            background: cycleFilter === 'inactive' ? 'var(--glass-bg)' : 'transparent',
            border: cycleFilter === 'inactive' ? '1px solid var(--border)' : 'none',
            fontSize: '13px', fontWeight: 700,
            color: cycleFilter === 'inactive' ? 'var(--primary)' : 'var(--text-muted)',
            boxShadow: cycleFilter === 'inactive' ? 'var(--shadow-card)' : 'none',
          }}>
            {t.ponds.inactive || 'Inactive'} <span style={{ color: 'var(--text-faint)', marginLeft: '4px' }}>{inactivePondOptions.length}</span>
          </button>
          <button onClick={() => setCycleFilter('ended')} style={{
            padding: '8px 14px', borderRadius: '10px',
            background: cycleFilter === 'ended' ? 'var(--glass-bg)' : 'transparent',
            border: cycleFilter === 'ended' ? '1px solid var(--border)' : 'none',
            fontSize: '13px', fontWeight: 700,
            color: cycleFilter === 'ended' ? 'var(--primary)' : 'var(--text-muted)',
            boxShadow: cycleFilter === 'ended' ? 'var(--shadow-card)' : 'none',
          }}>
            Ended <span style={{ color: 'var(--text-faint)', marginLeft: '4px' }}>{endedPondCount}</span>
          </button>
        </div>
        {canEditPonds && (
          <button className="dashboard-action dashboard-action-primary" onClick={() => {
            setFormData(prev => ({ ...prev, docStart: today, baselineDate: today }));
            setModalOpen(true);
          }}>
            <Plus size={20} strokeWidth={3} />
            <span>{t.ponds.addNew || 'Add New Pond'}</span>
          </button>
        )}
      </div>

      {/* Grid */}
      {loading || physicalPondsLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
          <Loader2 className="animate-spin" size={40} color="var(--primary)" />
        </div>
      ) : filteredPonds.length === 0 && filteredPhysicalPonds.length === 0 ? (
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
            <button className="btn-primary" onClick={() => {
              setFormData(prev => ({ ...prev, docStart: today, baselineDate: today }));
              setModalOpen(true);
            }}>
              <Plus size={20} strokeWidth={3} />
              {t.ponds.addNew || 'Add New Pond'}
            </button>
          )}
        </div>
      ) : (
        <div className="animate-fade-up animate-delay-2 responsive-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {filteredPhysicalPonds.map(pond => (
            <div key={`physical-${pond.id}`} className="glass-card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '12px', background: 'var(--primary-dim)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)'
                  }}>
                    <Waves size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.02rem', fontWeight: 850, letterSpacing: '0' }}>{pond.pondName}</h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                      {t.startPondCycle.readyForNextCycle}
                    </p>
                  </div>
                </div>
                {canEditPonds && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => openStartCycle(pond)}
                      title={t.startPondCycle.submit}
                      style={{
                        background: 'var(--bg-mid)', border: 'none', color: '#3282B8',
                        cursor: 'pointer', padding: '8px', borderRadius: '10px',
                      }}
                    >
                      <RotateCcw size={18} />
                    </button>
                    <button
                      onClick={() => openDeletePhysicalPond(pond)}
                      title={t.ponds?.deletePond || 'Delete pond'}
                      style={{
                        background: 'rgba(231, 76, 60, 0.1)', border: 'none', color: '#e74c3c',
                        cursor: 'pointer', padding: '8px', borderRadius: '10px',
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>
              <div style={{ padding: '18px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t.ponds.area || 'Pond Area'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ color: 'var(--primary)' }}><Scale size={18} /></div>
                    <span style={{ fontSize: '1rem', fontWeight: 800 }}>{pond.pondArea} m²</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Status</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 850, color: 'var(--primary)' }}>Inactive</span>
                </div>
              </div>
            </div>
          ))}
          {filteredPonds.map(pond => (
            <div key={pond.id} className="glass-card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: '330px' }}>
              <div style={{ padding: '22px', minHeight: '106px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px' }}>
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
                  {!isActiveCycle(pond) && (
                    <button
                      onClick={() => openDeleteCyclePond(pond)}
                      title={t.ponds?.deletePond || 'Delete pond'}
                      style={{
                        background: 'rgba(231, 76, 60, 0.1)', border: 'none', color: '#e74c3c',
                        cursor: 'pointer', padding: '8px', borderRadius: '10px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(231, 76, 60, 0.16)';
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(231, 76, 60, 0.1)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
                )}
              </div>

              <div style={{ padding: '22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', flex: '1 1 auto' }}>
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

              <div style={{ padding: '16px 22px', background: 'var(--bg-mid)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  {t.ponds.lastSampled || 'Last sampled'}: <span style={{ color: 'var(--text-faint)' }}>{getLatestSamplingDate(pond.samplings) ? new Date(getLatestSamplingDate(pond.samplings) as string).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : (t.ponds.never || 'Never')}</span>
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

      {/* -- MODAL --------------------------------------------- */}
      {isModalOpen && (
        <div className="responsive-modal-overlay" style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
        }}>
          <div className="glass-card animate-fade-up responsive-modal" style={{
            width: '100%', maxWidth: '640px', background: '#FFFFFF', padding: '0',
            overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.2)'
          }}>
            <div className="responsive-modal-header" style={{ padding: '32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{t.ponds.addNew || 'Add New Pond'}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>Create a physical pond placeholder. Start cycle details are added separately.</p>
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

            <form className="responsive-modal-body" onSubmit={handleAddPond} style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
              <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
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

                {isEnterpriseFarm && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.enterprise.selectBlock}</label>
                    {availableFarmBlocks.length > 0 ? (
                      <select
                        required
                        value={formData.blockId}
                        onChange={e => setFormData({ ...formData, blockId: e.target.value })}
                        style={{ padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontSize: '1rem', fontWeight: 600 }}
                      >
                        <option value="">{t.enterprise.selectBlock}</option>
                        {availableFarmBlocks.map((block) => <option key={block.id} value={block.id}>{block.name}</option>)}
                      </select>
                    ) : <p style={{ margin: 0, color: '#B42318', fontSize: '0.82rem' }}>{t.enterprise.noAssignedBlocks}</p>}
                  </div>
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
        <div className="responsive-modal-overlay" style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
        }}>
          <div className="glass-card animate-fade-up responsive-modal" style={{ width: '100%', maxWidth: '620px', background: '#FFFFFF', padding: '0', overflow: 'hidden' }}>
            <div className="responsive-modal-header" style={{ padding: '28px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
            <form className="responsive-modal-body responsive-form-grid" onSubmit={handleUpdateBaseline} style={{ padding: '28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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
        <div className="responsive-modal-overlay" style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
        }}>
          <div className="glass-card animate-fade-up responsive-modal" style={{ width: '100%', maxWidth: '520px', background: '#FFFFFF', padding: '0', overflow: 'hidden' }}>
            <div className="responsive-modal-header" style={{ padding: '28px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>End Cycle</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>{endCyclePond.pondName} history will stay saved.</p>
              </div>
              <button onClick={() => setEndCyclePond(null)} style={{ background: 'var(--bg-mid)', border: 'none', borderRadius: '12px', padding: '10px', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div className="responsive-modal-body" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
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
        <StartPondCycleModal
          key={startCyclePond.id}
          pond={startCyclePond}
          today={today}
          saving={startingPondCycle}
          onClose={() => setStartCyclePond(null)}
          onSubmit={handleStartCycle}
        />
      )}

      <ConfirmationModal
        isOpen={finalHarvestPromptPonds.length > 0}
        title={t.farmCycle.finalHarvestRequiredTitle}
        message={t.farmCycle.finalHarvestRequiredMessage.replace(
          '{{pondNames}}',
          finalHarvestPromptPonds.map((pond) => pond.pondName).join(', ')
        )}
        confirmText={t.farmCycle.goToHarvest}
        cancelText={t.common.cancel}
        onConfirm={() => {
          setFinalHarvestPromptPonds([]);
          router.push('/dashboard/harvest');
        }}
        onCancel={() => setFinalHarvestPromptPonds([])}
        isDanger={false}
      />

      <ConfirmationModal
        isOpen={deleteConfirm.isOpen}
        title={deleteTitle}
        message={deleteMessage}
        confirmText={t.ponds?.deletePond || 'Delete Pond'}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null, type: null })}
        isLoading={isDeleting}
      />
    </div>

  );
}
