"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Layers3,
  ListPlus,
  Maximize2,
  Pencil,
  Play,
  Plus,
  FlaskConical,
  Waves,
  X,
} from 'lucide-react';
import { addDoc, collection, doc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  useCompanyBlocks,
  useCompanyCycles,
  useCompanyMembers,
  useCompanyPhysicalPonds,
} from '@/hooks/useDashboardData';
import {
  getEnterprisePondStatus,
  getEnterpriseTechnicianLabel,
  sortFarmBlocks,
  type EnterprisePond,
  type EnterprisePondRisk,
  type FarmBlock,
} from '../../../shared/enterpriseBlocks';
import {
  getEnterpriseCycleAvailableBlocks,
  getEnterpriseCycleBlockIds,
  getEnterpriseCyclePonds,
  isEnterpriseCycleOpen,
  summarizeEnterpriseCycle,
  type EnterpriseCycleRecord,
} from '../../../shared/enterpriseCycles';
import { differenceInFarmCalendarDays, getFarmDateKey } from '../../../shared/farmDate';
import {
  countCompletedEnterprisePondSetups,
  createEnterprisePondSetupValues,
  getEnterpriseStockingDateRange,
  isEnterprisePondSetupComplete,
  parseEnterprisePondDensity,
  parseOptionalEnterprisePondNumber,
  type EnterpriseCycleStartMode,
  type EnterprisePondSetupValue,
} from '../../../shared/enterpriseCycleSetup';
import EnterpriseHealthDisplay from './EnterpriseHealthDisplay';
import ProfileCompletionCard from './ProfileCompletionCard';
import styles from './EnterpriseDashboard.module.css';

interface EnterpriseCycleDashboardProps {
  ponds: EnterprisePond[];
  timeZone?: string;
}

type PondFilter = 'active' | 'inactive' | 'ended';

interface PhysicalPond {
  id: string;
  pondName: string;
  pondArea: number;
  blockId?: string | null;
  blockName?: string | null;
  status?: 'idle' | 'active';
  activePondId?: string | null;
}

interface CompanyMember {
  id: string;
  uid?: string;
  name?: string;
  email?: string;
  role?: string;
}

interface UnassignedPondOption {
  key: string;
  pondName: string;
  physicalPondId?: string;
  pondId?: string;
}

const riskClass: Record<EnterprisePondRisk, string> = {
  stable: styles.stable,
  warning: styles.warning,
  'high-risk': styles.highRisk,
};

export default function EnterpriseCycleDashboard({ ponds, timeZone }: EnterpriseCycleDashboardProps) {
  const { user, company } = useAuth();
  const { t } = useLanguage();
  const copy = t.enterpriseCycle;
  const todayDate = getFarmDateKey(new Date(), timeZone);
  const { data: blocks, loading, error } = useCompanyBlocks<FarmBlock>('asc');
  const { data: cycles } = useCompanyCycles<EnterpriseCycleRecord>('asc');
  const { data: physicalPonds } = useCompanyPhysicalPonds<PhysicalPond>('asc');
  const { data: members } = useCompanyMembers<CompanyMember>();
  const [expandedCycles, setExpandedCycles] = useState<Record<string, boolean>>({});
  const [pondFilter, setPondFilter] = useState<PondFilter>('active');
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [operationAction, setOperationAction] = useState<'sampling' | 'mortality' | null>(null);
  const [createBlockOpen, setCreateBlockOpen] = useState(false);
  const [newBlockName, setNewBlockName] = useState('');
  const [newBlockTechnicianId, setNewBlockTechnicianId] = useState('');
  const [createPondOpen, setCreatePondOpen] = useState(false);
  const [newPondName, setNewPondName] = useState('');
  const [newPondArea, setNewPondArea] = useState('');
  const [newPondBlockId, setNewPondBlockId] = useState('');
  const [pondAssignmentOpen, setPondAssignmentOpen] = useState(false);
  const [pondAssignmentKey, setPondAssignmentKey] = useState('');
  const [pondAssignmentBlockId, setPondAssignmentBlockId] = useState('');
  const [cycleFormOpen, setCycleFormOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<EnterpriseCycleRecord | null>(null);
  const [cycleName, setCycleName] = useState('');
  const [plannedStartDate, setPlannedStartDate] = useState(() => getFarmDateKey(new Date(), timeZone));
  const [cycleStartMode, setCycleStartMode] = useState<EnterpriseCycleStartMode>('new');
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
  const [cycleFormStep, setCycleFormStep] = useState<'details' | 'ponds'>('details');
  const [stockingCycle, setStockingCycle] = useState<EnterpriseCycleRecord | null>(null);
  const [pondSetupValues, setPondSetupValues] = useState<Record<string, EnterprisePondSetupValue>>({});
  const [expandedSetupPondId, setExpandedSetupPondId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedPond, setSelectedPond] = useState<EnterprisePond | null>(null);
  const [officeDisplayOpen, setOfficeDisplayOpen] = useState(false);

  const sortedBlocks = useMemo(() => sortFarmBlocks(blocks), [blocks]);
  const technicians = useMemo(() => members
    .filter((member) => member.role === 'technician')
    .map((member) => ({ uid: member.uid || member.id, name: member.name?.trim() || '', email: member.email || '' })), [members]);
  const sortedCycles = useMemo(() => [...cycles].sort((first, second) => {
    const firstClosed = first.status === 'closed' ? 1 : 0;
    const secondClosed = second.status === 'closed' ? 1 : 0;
    if (firstClosed !== secondClosed) return firstClosed - secondClosed;
    return (second.stockingStartDate || second.plannedStartDate || '')
      .localeCompare(first.stockingStartDate || first.plannedStartDate || '');
  }), [cycles]);
  const openCycles = useMemo(() => cycles.filter(isEnterpriseCycleOpen), [cycles]);
  const activePonds = useMemo(() => ponds.filter((pond) => pond.cycleStatus !== 'ended'), [ponds]);
  const assignedBlockIds = useMemo(() => new Set(sortedBlocks.map((block) => block.id)), [sortedBlocks]);
  const unassignedPondOptions = useMemo<UnassignedPondOption[]>(() => {
    const options: UnassignedPondOption[] = physicalPonds
      .filter((pond) => !pond.blockId || !assignedBlockIds.has(pond.blockId))
      .map((pond) => ({
        key: `physical:${pond.id}`,
        pondName: pond.pondName,
        physicalPondId: pond.id,
        pondId: pond.activePondId || undefined,
      }));

    activePonds.filter((pond) => !pond.blockId || !assignedBlockIds.has(pond.blockId)).forEach((pond) => {
      const linkedPhysicalPond = physicalPonds.find((physicalPond) => (
        physicalPond.activePondId === pond.id
        || physicalPond.id === pond.physicalPondId
        || physicalPond.id === pond.previousCyclePondId
      ));
      const existingOption = linkedPhysicalPond
        ? options.find((option) => option.physicalPondId === linkedPhysicalPond.id)
        : undefined;

      if (existingOption) {
        existingOption.pondId = pond.id;
      } else {
        options.push({
          key: `pond:${pond.id}`,
          pondName: pond.pondName,
          physicalPondId: linkedPhysicalPond?.id,
          pondId: pond.id,
        });
      }
    });

    return options.sort((first, second) => first.pondName.localeCompare(second.pondName, undefined, { numeric: true }));
  }, [activePonds, assignedBlockIds, physicalPonds]);
  const statusByPond = useMemo(() => new Map(ponds.map((pond) => [
    pond.id,
    getEnterprisePondStatus(pond, timeZone),
  ])), [ponds, timeZone]);
  const activePhysicalPondIds = useMemo(() => new Set(ponds
    .filter((pond) => pond.cycleStatus !== 'ended')
    .flatMap((pond) => [pond.physicalPondId, pond.previousCyclePondId].filter((id): id is string => Boolean(id)))), [ponds]);
  const activePondNames = useMemo(() => new Set(ponds
    .filter((pond) => pond.cycleStatus !== 'ended')
    .map((pond) => pond.pondName.trim().toLowerCase())), [ponds]);
  const selectedStatus = selectedPond ? statusByPond.get(selectedPond.id) : undefined;
  const cycleBlockOptions = useMemo(
    () => getEnterpriseCycleAvailableBlocks(
      sortedBlocks,
      openCycles.filter((cycle) => cycle.id !== editingCycle?.id),
      ponds,
    ),
    [editingCycle?.id, openCycles, ponds, sortedBlocks],
  );
  const openCycleByBlockId = useMemo(() => {
    const result = new Map<string, EnterpriseCycleRecord>();
    openCycles.forEach((cycle) => {
      getEnterpriseCycleBlockIds(cycle, ponds).forEach((blockId) => {
        if (!result.has(blockId)) result.set(blockId, cycle);
      });
    });
    return result;
  }, [openCycles, ponds]);
  const inactiveBlockRows = useMemo(() => sortedBlocks.map((block) => ({
    block,
    inactivePonds: physicalPonds
      .filter((pond) => pond.blockId === block.id && pond.status !== 'active' && !pond.activePondId && !activePhysicalPondIds.has(pond.id) && !activePondNames.has(pond.pondName.trim().toLowerCase()))
      .sort((first, second) => first.pondName.localeCompare(second.pondName, undefined, { numeric: true })),
  })).filter((row) => row.inactivePonds.length > 0), [activePhysicalPondIds, activePondNames, physicalPonds, sortedBlocks]);
  const lockedEditingBlockIds = useMemo(() => new Set(
    editingCycle
      ? getEnterpriseCyclePonds(editingCycle.id, ponds)
        .map((pond) => pond.blockId)
        .filter((blockId): blockId is string => Boolean(blockId))
      : [],
  ), [editingCycle, ponds]);
  const filteredCycleRows = useMemo(() => sortedCycles.map((cycle) => {
    const cyclePonds = getEnterpriseCyclePonds(cycle.id, ponds);
    const visiblePonds = cyclePonds.filter((pond) => pondFilter === 'ended'
      ? pond.cycleStatus === 'ended'
      : pond.cycleStatus !== 'ended');
    return { cycle, visiblePonds };
  }).filter((row) => pondFilter !== 'inactive' && row.visiblePonds.length > 0), [pondFilter, ponds, sortedCycles]);
  const selectedSetupBlock = sortedBlocks.find((block) => selectedBlockIds.includes(block.id));
  const setupPonds = useMemo(() => physicalPonds
    .filter((pond) => pond.blockId === selectedSetupBlock?.id && pond.status !== 'active' && !pond.activePondId && !activePhysicalPondIds.has(pond.id) && !activePondNames.has(pond.pondName.trim().toLowerCase()))
    .sort((first, second) => first.pondName.localeCompare(second.pondName, undefined, { numeric: true })), [activePhysicalPondIds, activePondNames, physicalPonds, selectedSetupBlock?.id]);
  const completedSetupCount = countCompletedEnterprisePondSetups(setupPonds.map((pond) => pond.id), pondSetupValues, cycleStartMode);

  const resetCycleForm = () => {
    setCycleFormOpen(false);
    setEditingCycle(null);
    setStockingCycle(null);
    setCycleName('');
    setPlannedStartDate(getFarmDateKey(new Date(), timeZone));
    setCycleStartMode('new');
    setSelectedBlockIds([]);
    setCycleFormStep('details');
    setPondSetupValues({});
    setExpandedSetupPondId(null);
  };

  const openCycleForm = () => {
    setEditingCycle(null);
    setCycleFormOpen(true);
    setCycleName(copy.defaultCycleName.replace('{{number}}', String(cycles.length + 1)));
    setPlannedStartDate(getFarmDateKey(new Date(), timeZone));
    setCycleStartMode('new');
    setSelectedBlockIds([]);
    setCycleFormStep('details');
    setStockingCycle(null);
    setPondSetupValues({});
    setExpandedSetupPondId(null);
  };

  const openCycleFormForBlock = (blockId?: string | null) => {
    if (!blockId) {
      openCycleForm();
      return;
    }
    const existingCycle = openCycleByBlockId.get(blockId) || null;
    const defaultStockingDate = getFarmDateKey(new Date(), timeZone);
    const blockPonds = physicalPonds
      .filter((pond) => pond.blockId === blockId && pond.status !== 'active' && !pond.activePondId && !activePhysicalPondIds.has(pond.id) && !activePondNames.has(pond.pondName.trim().toLowerCase()))
      .sort((first, second) => first.pondName.localeCompare(second.pondName, undefined, { numeric: true }));
    setEditingCycle(null);
    setStockingCycle(existingCycle);
    setCycleFormOpen(true);
    setCycleName(existingCycle?.cycleName || copy.defaultCycleName.replace('{{number}}', String(cycles.length + 1)));
    setPlannedStartDate(existingCycle?.plannedStartDate || defaultStockingDate);
    setCycleStartMode('new');
    setSelectedBlockIds([blockId]);
    setPondSetupValues(createEnterprisePondSetupValues(blockPonds.map((pond) => pond.id), defaultStockingDate));
    setExpandedSetupPondId(blockPonds[0]?.id || null);
    setCycleFormStep(existingCycle ? 'ponds' : 'details');
  };

  const dismissKeyboardOnContainerPress = (event: React.PointerEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('input, textarea, select, button, a')) return;
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  };

  const openEditCycleForm = (cycle: EnterpriseCycleRecord) => {
    setEditingCycle(cycle);
    setStockingCycle(null);
    setCycleFormStep('details');
    setCycleFormOpen(true);
    setCycleName(cycle.cycleName);
    setPlannedStartDate(cycle.plannedStartDate || getFarmDateKey(new Date(), timeZone));
    setSelectedBlockIds(getEnterpriseCycleBlockIds(cycle, ponds));
  };

  const continueCycleForm = () => {
    if (!cycleName.trim() || !selectedSetupBlock || setupPonds.length === 0) return;
    setPondSetupValues(createEnterprisePondSetupValues(setupPonds.map((pond) => pond.id), plannedStartDate));
    setExpandedSetupPondId(setupPonds[0]?.id || null);
    setCycleFormStep('ponds');
  };

  const updatePondSetup = (pondId: string, field: keyof EnterprisePondSetupValue, value: string) => {
    setPondSetupValues((current) => {
      const previous = current[pondId] || { stockingDate: plannedStartDate, density: '', supplier: '' };
      return { ...current, [pondId]: { ...previous, [field]: value } };
    });
  };

  const createCycle = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!company?.id || !user?.uid || !cycleName.trim() || selectedBlockIds.length !== 1) return;
    const baselineDate = todayDate;
    if (!editingCycle && cycleStartMode === 'midcycle' && setupPonds.some((pond) => (
      differenceInFarmCalendarDays(baselineDate, pondSetupValues[pond.id]?.stockingDate || '') < 0
    ))) {
      window.alert(copy.baselineDateInvalid);
      return;
    }

    setSaving(true);
    try {
      const selectedBlocks = sortedBlocks.filter((block) => selectedBlockIds.includes(block.id));
      const cycleData = {
        cycleName: cycleName.trim(),
        blockIds: selectedBlocks.map((block) => block.id),
        blockNames: selectedBlocks.map((block) => block.name),
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      };
      if (editingCycle) {
        await updateDoc(doc(db, 'companies', company.id, 'cycles', editingCycle.id), cycleData);
      } else {
        if (!selectedSetupBlock || setupPonds.length === 0 || completedSetupCount !== setupPonds.length) return;
        const stockingRange = getEnterpriseStockingDateRange([
          stockingCycle?.stockingStartDate,
          stockingCycle?.stockingEndDate,
          ...setupPonds.map((pond) => pondSetupValues[pond.id].stockingDate),
        ]);
        const batch = writeBatch(db);
        const cycleRef = stockingCycle
          ? doc(db, 'companies', company.id, 'cycles', stockingCycle.id)
          : doc(collection(db, 'companies', company.id, 'cycles'));
        batch.set(cycleRef, {
          ...cycleData,
          status: 'active',
          plannedStartDate,
          stockingStartDate: stockingRange.stockingStartDate,
          stockingEndDate: stockingRange.stockingEndDate,
          ...(!stockingCycle ? { createdAt: serverTimestamp(), createdBy: user.uid } : {}),
        }, { merge: Boolean(stockingCycle) });
        setupPonds.forEach((pond) => {
          const value = pondSetupValues[pond.id];
          const stockingDate = value.stockingDate;
          const baselineDoc = differenceInFarmCalendarDays(baselineDate, stockingDate);
          const density = parseEnterprisePondDensity(value.density);
          const supplier = value.supplier.trim();
          const baselineMbw = parseOptionalEnterprisePondNumber(value.baselineMbw);
          const baselineEstimatedPopulation = parseOptionalEnterprisePondNumber(value.baselineEstimatedPopulation);
          const baselineSurvivalRate = parseOptionalEnterprisePondNumber(value.baselineSurvivalRate);
          const baselineCumulativeFeed = parseOptionalEnterprisePondNumber(value.baselineCumulativeFeed);
          const pondRef = doc(collection(db, 'companies', company.id, 'ponds'));
          batch.set(pondRef, {
            pondName: pond.pondName,
            pondArea: pond.pondArea,
            blockId: selectedSetupBlock.id,
            blockName: selectedSetupBlock.name,
            density,
            initialPopulation: pond.pondArea * density,
            docStart: stockingDate,
            supplier,
            plSupplier: supplier,
            initialWeight: 0.5,
            samplings: cycleStartMode === 'midcycle' && baselineMbw ? [{
              id: `baseline-${pondRef.id}`,
              date: baselineDate,
              mbw: baselineMbw,
              mortality: 0,
              feed: baselineCumulativeFeed ?? 0,
              isBaselineEstimate: true,
              source: 'midcycle_onboarding',
              ...(baselineEstimatedPopulation === undefined ? {} : { estimatedPopulation: baselineEstimatedPopulation }),
              ...(baselineSurvivalRate === undefined ? {} : { estimatedSurvivalRate: baselineSurvivalRate }),
              ...(baselineCumulativeFeed === undefined ? {} : { cumulativeFeedToDate: baselineCumulativeFeed }),
              cycleId: cycleRef.id,
              cycleName: cycleName.trim(),
              pondCycleId: pondRef.id,
            }] : [],
            mortalityRecords: [],
            totalHarvestedBiomass: 0,
            totalHarvestedPopulation: 0,
            totalHarvestedFeed: 0,
            physicalPondId: pond.id,
            previousCyclePondId: pond.id,
            cycleId: cycleRef.id,
            cycleName: cycleName.trim(),
            pondCycleId: pondRef.id,
            cycleStatus: 'active',
            cycleStartedAt: stockingDate,
            cycleStartMode,
            ...(cycleStartMode === 'midcycle' && baselineMbw ? {
              baselineDate,
              baselineDoc,
              baselineMbw,
              ...(baselineEstimatedPopulation === undefined ? {} : { baselineEstimatedPopulation }),
              ...(baselineSurvivalRate === undefined ? {} : { baselineSurvivalRate }),
              ...(baselineCumulativeFeed === undefined ? {} : { baselineCumulativeFeed }),
              baselineSource: 'user_midcycle_estimate',
            } : {}),
            createdAt: serverTimestamp(),
            createdBy: user.uid,
            updatedAt: serverTimestamp(),
            updatedBy: user.uid,
          });
          batch.update(doc(db, 'companies', company.id, 'physicalPonds', pond.id), {
            status: 'active',
            activePondId: pondRef.id,
            updatedAt: serverTimestamp(),
            updatedBy: user.uid,
          });
        });
        await batch.commit();
        setPondFilter('active');
      }
      resetCycleForm();
    } catch (cycleError) {
      console.error('Failed to save enterprise production cycle:', cycleError);
      window.alert(copy.cycleSaveFailed);
    } finally {
      setSaving(false);
    }
  };

  const createBlock = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!company?.id || !user?.uid || !newBlockName.trim()) return;
    if (sortedBlocks.some((block) => block.name.trim().toLowerCase() === newBlockName.trim().toLowerCase())) {
      window.alert(copy.duplicateBlock);
      return;
    }
    const technician = technicians.find((candidate) => candidate.uid === newBlockTechnicianId);
    setSaving(true);
    try {
      await addDoc(collection(db, 'companies', company.id, 'blocks'), {
        companyId: company.id,
        name: newBlockName.trim(),
        assignedTechnicianId: technician?.uid || null,
        assignedTechnicianName: technician?.name || null,
        assignedTechnicianEmail: technician?.email || null,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      setNewBlockName('');
      setNewBlockTechnicianId('');
      setCreateBlockOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const createPhysicalPond = async (event: React.FormEvent) => {
    event.preventDefault();
    const selectedBlock = sortedBlocks.find((block) => block.id === newPondBlockId);
    const pondArea = Number(newPondArea);
    if (!company?.id || !user?.uid || !selectedBlock || !newPondName.trim() || !Number.isFinite(pondArea) || pondArea <= 0) return;
    const pondKey = newPondName.trim().toLowerCase();
    if (physicalPonds.some((pond) => pond.pondName.trim().toLowerCase() === pondKey) || ponds.some((pond) => pond.pondName.trim().toLowerCase() === pondKey)) {
      window.alert(copy.duplicatePond);
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, 'companies', company.id, 'physicalPonds'), {
        pondName: newPondName.trim(),
        pondArea,
        blockId: selectedBlock.id,
        blockName: selectedBlock.name,
        status: 'idle',
        activePondId: null,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      setNewPondName('');
      setNewPondArea('');
      setNewPondBlockId('');
      setCreatePondOpen(false);
      setPondFilter('inactive');
    } finally {
      setSaving(false);
    }
  };

  const savePondAssignment = async (event: React.FormEvent) => {
    event.preventDefault();
    const block = sortedBlocks.find((candidate) => candidate.id === pondAssignmentBlockId);
    const assignment = unassignedPondOptions.find((candidate) => candidate.key === pondAssignmentKey);
    if (!company?.id || !user?.uid || !block || !assignment || saving) return;

    setSaving(true);
    try {
      const assignmentData = {
        blockId: block.id,
        blockName: block.name,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      };
      const batch = writeBatch(db);
      const physicalPondIds = new Set<string>();
      const pondIds = new Set<string>();
      const selectedPondRecord = assignment.pondId
        ? activePonds.find((pond) => pond.id === assignment.pondId)
        : undefined;

      if (assignment.physicalPondId) physicalPondIds.add(assignment.physicalPondId);
      if (assignment.pondId) pondIds.add(assignment.pondId);

      activePonds.forEach((pond) => {
        if (assignment.physicalPondId && (
          pond.physicalPondId === assignment.physicalPondId
          || pond.previousCyclePondId === assignment.physicalPondId
        )) pondIds.add(pond.id);
      });
      physicalPonds.forEach((physicalPond) => {
        if (assignment.pondId && (
          physicalPond.activePondId === assignment.pondId
          || physicalPond.id === selectedPondRecord?.physicalPondId
          || physicalPond.id === selectedPondRecord?.previousCyclePondId
        )) physicalPondIds.add(physicalPond.id);
      });

      physicalPondIds.forEach((physicalPondId) => {
        batch.update(doc(db, 'companies', company.id, 'physicalPonds', physicalPondId), assignmentData);
      });
      pondIds.forEach((pondId) => {
        batch.update(doc(db, 'companies', company.id, 'ponds', pondId), assignmentData);
      });
      await batch.commit();
      setPondAssignmentOpen(false);
      setPondAssignmentKey('');
      setPondAssignmentBlockId('');
      setPondFilter('inactive');
    } catch (assignmentError) {
      console.error('Failed to assign enterprise pond to block:', assignmentError);
      window.alert(t.enterprise.pondAssignmentFailed);
    } finally {
      setSaving(false);
    }
  };

  const closeCycle = async (cycle: EnterpriseCycleRecord) => {
    if (!company?.id || !user?.uid) return;
    const cyclePonds = getEnterpriseCyclePonds(cycle.id, ponds);
    const activeCyclePonds = cyclePonds.filter((pond) => pond.cycleStatus !== 'ended');
    if (activeCyclePonds.length > 0) {
      window.alert(copy.endActivePondsFirst.replace('{{pondNames}}', activeCyclePonds.map((pond) => pond.pondName).join(', ')));
      return;
    }
    if (!window.confirm(copy.closeCycleDescription.replace('{{cycleName}}', cycle.cycleName))) return;
    await updateDoc(doc(db, 'companies', company.id, 'cycles', cycle.id), {
      status: 'closed',
      closedAt: getFarmDateKey(new Date(), timeZone),
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    });
  };

  const enterOfficeDisplay = () => {
    setOfficeDisplayOpen(true);
    if (!document.fullscreenElement) void document.documentElement.requestFullscreen().catch(() => undefined);
  };

  const exitOfficeDisplay = () => {
    setOfficeDisplayOpen(false);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
  };

  return (
    <div className={styles.page}>
      {officeDisplayOpen ? (
        <EnterpriseHealthDisplay
          blocks={blocks}
          ponds={activePonds}
          companyId={company?.id}
          companyName={company?.companyName}
          timeZone={timeZone}
          onExit={exitOfficeDisplay}
        />
      ) : null}
      <header className={styles.enterpriseTitleBar}>
        <div className={styles.enterpriseTitleCopy}><h1>{copy.dashboardTitle}</h1><p>{company?.companyName || copy.companyFallback}</p></div>
        <div className={styles.enterpriseTitleActions}>
          {(user?.role === 'owner' || user?.role === 'co-owner') && sortedBlocks.length > 0 && unassignedPondOptions.length > 0 ? (
            <button type="button" className={styles.displayButton} onClick={() => setPondAssignmentOpen(true)}>
              <ListPlus size={18} /> {t.enterprise.assignPond}
            </button>
          ) : null}
          <button type="button" className={styles.displayButton} onClick={enterOfficeDisplay}>
            <Maximize2 size={18} /> {copy.officeDisplay}
          </button>
          <button type="button" className={styles.addButton} onClick={() => setAddMenuOpen(true)}>
            <Plus size={18} /> {copy.add}
          </button>
        </div>
      </header>
      <ProfileCompletionCard company={company} />

      <div className={styles.cycleFilters}>
        {(['active', 'inactive', 'ended'] as PondFilter[]).map((filter) => (
          <button key={filter} type="button" className={pondFilter === filter ? styles.cycleFilterActive : ''} onClick={() => setPondFilter(filter)}>
            {filter === 'active' ? t.farmCycle.filterActive : filter === 'inactive' ? t.farmCycle.filterInactive : t.farmCycle.filterEnded}
          </button>
        ))}
      </div>

      {error ? <p className={styles.error}>{error.message}</p> : null}
      {loading ? <div className={styles.loading}>{copy.loading}</div> : null}
      {!loading && sortedBlocks.length === 0 ? (
        <div className={styles.empty}>
          <Layers3 size={38} />
          <h2>{copy.createBlocksTitle}</h2>
          <p>{copy.createBlocksBody}</p>
          <Link className={styles.addButton} href="/dashboard/ponds">{copy.managePondsBlocks}</Link>
        </div>
      ) : (
        <div className={styles.blockList}>
          {(pondFilter === 'inactive' ? inactiveBlockRows.length === 0 : filteredCycleRows.length === 0) ? (
            <button type="button" className={styles.emptyCycleButton} onClick={openCycleForm}>
              {sortedCycles.length === 0 ? <><Plus size={20} /> {copy.createFirstCycle}</> : copy.noPonds.replace('{{status}}', pondFilter === 'active' ? t.farmCycle.filterActive.toLocaleLowerCase() : pondFilter === 'inactive' ? t.farmCycle.filterInactive.toLocaleLowerCase() : t.farmCycle.filterEnded.toLocaleLowerCase())}
            </button>
          ) : null}
          {pondFilter === 'inactive' ? inactiveBlockRows.map(({ block, inactivePonds }) => {
            const openCycle = openCycleByBlockId.get(block.id);
            return (
              <article key={block.id} className={styles.productionCycle}>
                <div className={styles.productionCycleHeader}>
                  <div className={styles.productionCycleToggle}>
                    <span className={styles.productionCycleIcon}><Layers3 size={19} /></span>
                    <span className={styles.productionCycleCopy}><strong>{block.name}</strong><small>{copy.inactivePonds.replace('{{count}}', String(inactivePonds.length))}</small></span>
                  </div>
                  <button type="button" className={styles.editCycleButton} onClick={() => openCycleFormForBlock(block.id)}>{openCycle ? <Play size={15} /> : <Plus size={15} />}{openCycle ? copy.continue : copy.createCycle}</button>
                </div>
                <div className={styles.productionCycleBody}>
                  <div className={styles.cyclePondPreview}>
                    {inactivePonds.map((pond) => <div key={pond.id} className={`${styles.pondTile} ${styles.plannedPond}`}><span>{pond.pondName}</span><small>{copy.inactive}</small></div>)}
                  </div>
                </div>
              </article>
            );
          }) : null}
          {filteredCycleRows.map(({ cycle, visiblePonds }) => {
            const summary = summarizeEnterpriseCycle(cycle, ponds, physicalPonds);
            const cycleExpanded = Boolean(expandedCycles[cycle.id]);
            const cycleBlockId = getEnterpriseCycleBlockIds(cycle, ponds)[0];
            const cycleBlock = sortedBlocks.find((block) => block.id === cycleBlockId);
            const cycleTechnician = technicians.find((technician) => technician.uid === cycleBlock?.assignedTechnicianId);
            const technicianLabel = getEnterpriseTechnicianLabel(cycleTechnician?.name, cycleTechnician?.email, t.enterprise.unassigned);

            return (
              <article key={cycle.id} className={styles.productionCycle}>
                <div className={styles.productionCycleHeader}>
                  <button type="button" className={styles.productionCycleToggle} onClick={() => setExpandedCycles((current) => ({ ...current, [cycle.id]: !cycleExpanded }))} aria-expanded={cycleExpanded}>
                    <span className={styles.productionCycleIcon}><CalendarDays size={19} /></span>
                    <span className={styles.productionCycleCopy}>
                      <strong>{cycle.cycleName}</strong>
                      <small>{copy.started.replace('{{date}}', summary.stockingStartDate || copy.notStarted).replace('{{technician}}', technicianLabel)}</small>
                    </span>
                    {cycleExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  <button type="button" className={styles.editCycleButton} onClick={() => openEditCycleForm(cycle)}><Pencil size={15} /> {t.actions.edit}</button>
                </div>

                {cycleExpanded ? (
                  <div className={styles.productionCycleBody}>
                    <div className={styles.cyclePondPreview}>
                      {pondFilter !== 'inactive' ? visiblePonds.map((pond) => {
                        const pondStatus = statusByPond.get(pond.id);
                        const tone = pond.cycleStatus === 'ended' ? styles.ended : pondStatus ? riskClass[pondStatus.risk] : styles.neutral;
                        return <button key={pond.id} type="button" className={`${styles.pondTile} ${tone}`} onClick={() => setSelectedPond(pond)}><span>{pond.pondName}</span><small>{pond.cycleStatus === 'ended' ? copy.ended : `DOC ${pondStatus?.doc ?? 0}`}</small></button>;
                      }) : null}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      {pondAssignmentOpen ? (
        <div className={styles.overlay} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !saving && setPondAssignmentOpen(false)}>
          <form className={styles.modal} onSubmit={savePondAssignment} onPointerDown={dismissKeyboardOnContainerPress}>
            <div className={styles.modalHeader}>
              <div><h2>{t.enterprise.assignPond}</h2><p>{t.enterprise.assignPondDescription}</p></div>
              <button type="button" className={styles.iconButton} onClick={() => setPondAssignmentOpen(false)} aria-label={copy.close} disabled={saving}><X size={20} /></button>
            </div>
            <label>{t.enterprise.selectPond}
              <select required value={pondAssignmentKey} onChange={(event) => setPondAssignmentKey(event.target.value)}>
                <option value="">{t.enterprise.selectPond}</option>
                {unassignedPondOptions.map((pond) => <option key={pond.key} value={pond.key}>{pond.pondName}</option>)}
              </select>
            </label>
            <label>{t.enterprise.selectBlock}
              <select required value={pondAssignmentBlockId} onChange={(event) => setPondAssignmentBlockId(event.target.value)}>
                <option value="">{t.enterprise.selectBlock}</option>
                {sortedBlocks.map((block) => <option key={block.id} value={block.id}>{block.name}</option>)}
              </select>
            </label>
            <button className={styles.saveButton} disabled={saving || !pondAssignmentKey || !pondAssignmentBlockId}>
              {saving ? t.enterprise.loadingBlocks : t.enterprise.savePondAssignment}
            </button>
          </form>
        </div>
      ) : null}

      {cycleFormOpen ? (
        <div className={styles.overlay} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && resetCycleForm()}>
          <form className={styles.modal} onSubmit={(event) => { if (!editingCycle && cycleFormStep === 'details') { event.preventDefault(); continueCycleForm(); } else { void createCycle(event); } }} onPointerDown={dismissKeyboardOnContainerPress}>
            <div className={styles.modalHeader}>
              <div><span className={styles.eyebrow}>{copy.eyebrow}</span><h2>{editingCycle ? copy.editCycle : stockingCycle ? copy.continueCycle.replace('{{cycleName}}', stockingCycle.cycleName) : copy.createProductionCycle}</h2><p>{editingCycle ? copy.editDescription : cycleFormStep === 'details' ? copy.chooseBlockDate : copy.stockingDetails.replace('{{blockName}}', selectedSetupBlock?.name || copy.blockFallback)}</p></div>
              <button type="button" className={styles.iconButton} onClick={resetCycleForm} aria-label={copy.close}><X size={20} /></button>
            </div>
            {editingCycle || cycleFormStep === 'details' ? <>
              <label>{copy.cycleName}<input required maxLength={100} value={cycleName} onChange={(event) => setCycleName(event.target.value)} /></label>
              {!editingCycle ? <label>{copy.plannedStart}<input required type="date" value={plannedStartDate} onChange={(event) => setPlannedStartDate(event.target.value)} /></label> : null}
              <fieldset className={styles.pondSelector}>
                <legend>{copy.blockInCycle}</legend>
                {cycleBlockOptions.length === 0 ? <p>{copy.noBlocksAvailable}</p> : cycleBlockOptions.map((block) => {
                  const checked = selectedBlockIds.includes(block.id);
                  const locked = lockedEditingBlockIds.has(block.id);
                  const pondCount = physicalPonds.filter((pond) => pond.blockId === block.id && pond.status !== 'active' && !pond.activePondId).length;
                  return (
                    <label key={block.id} className={checked ? styles.pondSelectorChecked : ''}>
                      <input type="radio" name="cycle-block" checked={checked} disabled={lockedEditingBlockIds.size > 0} onChange={() => setSelectedBlockIds([block.id])} />
                      <Layers3 size={17} /><span>{block.name}</span><small>{locked ? copy.inProduction : copy.inactivePonds.replace('{{count}}', String(pondCount))}</small>
                    </label>
                  );
                })}
              </fieldset>
              <button className={styles.saveButton} disabled={saving || !cycleName.trim() || selectedBlockIds.length !== 1 || (!editingCycle && setupPonds.length === 0)}>{saving ? t.actions.loading : editingCycle ? copy.saveChanges : t.actions.next}</button>
            </> : <>
              <fieldset className={styles.cycleModeSelector}>
                <legend>{copy.cycleStartQuestion}</legend>
                {(['new', 'midcycle'] as const).map((mode) => <label key={mode} className={cycleStartMode === mode ? styles.cycleModeSelected : ''}>
                  <input type="radio" name="enterprise-cycle-start-mode" checked={cycleStartMode === mode} onChange={() => setCycleStartMode(mode)} />
                  <span><b>{mode === 'new' ? copy.newCycle : copy.existingCycle}</b><small>{mode === 'new' ? copy.newCycleHint : copy.existingCycleHint}</small></span>
                </label>)}
              </fieldset>
              <div className={styles.setupProgress}><strong>{copy.pondsReady.replace('{{completed}}', String(completedSetupCount)).replace('{{total}}', String(setupPonds.length))}</strong><small>{cycleStartMode === 'midcycle' ? copy.baselineMbwRequired : copy.densitySupplierRequired}</small></div>
              <div className={styles.setupPondList}>{setupPonds.map((pond) => {
                const value = pondSetupValues[pond.id] || { stockingDate: plannedStartDate, density: '', supplier: '' };
                const expanded = expandedSetupPondId === pond.id;
                const complete = isEnterprisePondSetupComplete(value, cycleStartMode);
                return <section key={pond.id} className={`${styles.setupPondCard} ${expanded ? styles.setupPondCardExpanded : ''}`}>
                  <button type="button" className={styles.setupPondHeader} onClick={() => setExpandedSetupPondId(expanded ? null : pond.id)} aria-expanded={expanded}><span><b>{pond.pondName}</b><small>{complete ? `${value.stockingDate} · ${value.density} PL/m² · ${value.supplier}` : copy.stockingMissing}</small></span>{complete ? <CheckCircle2 size={18} /> : null}{expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>
                  {expanded ? <div className={styles.setupPondForm}>
                    <label className={styles.setupDateField}>{copy.stockingDate}<input required type="date" value={value.stockingDate} max={cycleStartMode === 'midcycle' ? todayDate : undefined} onChange={(event) => updatePondSetup(pond.id, 'stockingDate', event.target.value)} /></label>
                    <label>{copy.density}<input required min="0.01" step="0.01" inputMode="decimal" value={value.density} onChange={(event) => updatePondSetup(pond.id, 'density', event.target.value)} /></label>
                    <label>{copy.supplier}<input required value={value.supplier} onChange={(event) => updatePondSetup(pond.id, 'supplier', event.target.value)} placeholder={copy.hatcheryName} /></label>
                    {cycleStartMode === 'midcycle' ? <>
                      <label>{copy.currentMbw}<input required min="0.01" step="0.01" inputMode="decimal" value={value.baselineMbw || ''} onChange={(event) => updatePondSetup(pond.id, 'baselineMbw', event.target.value)} placeholder={copy.currentMbwPlaceholder} /></label>
                      <label>{copy.currentPopulation}<input min="0" step="1" inputMode="numeric" value={value.baselineEstimatedPopulation || ''} onChange={(event) => updatePondSetup(pond.id, 'baselineEstimatedPopulation', event.target.value)} placeholder={copy.currentPopulationPlaceholder} /></label>
                      <label>{copy.currentSurvivalRate}<input min="0" max="100" step="0.1" inputMode="decimal" value={value.baselineSurvivalRate || ''} onChange={(event) => updatePondSetup(pond.id, 'baselineSurvivalRate', event.target.value)} placeholder={copy.survivalRatePlaceholder} /></label>
                      <label>{copy.feedUsedSoFar}<input min="0" step="0.01" inputMode="decimal" value={value.baselineCumulativeFeed || ''} onChange={(event) => updatePondSetup(pond.id, 'baselineCumulativeFeed', event.target.value)} placeholder={copy.feedUsedSoFarPlaceholder} /></label>
                      <small className={styles.setupHint}>{copy.feedUsedSoFarHint}</small>
                    </> : null}
                  </div> : null}
                </section>;
              })}</div>
              <div className={styles.setupActions}><button type="button" className={styles.backButton} onClick={() => stockingCycle ? resetCycleForm() : setCycleFormStep('details')}>{stockingCycle ? t.actions.cancel : t.actions.back}</button><button className={styles.saveButton} disabled={saving || setupPonds.length === 0 || completedSetupCount !== setupPonds.length}>{saving ? copy.startingBlock : stockingCycle ? copy.startRemainingPonds : copy.startProductionCycle}</button></div>
            </>}
            {editingCycle ? <div className={styles.editCycleActions}>
              <Link href={`/dashboard/reports/cycles?cycleId=${encodeURIComponent(editingCycle.id)}`}>{copy.viewCycleReport}</Link>
              {editingCycle.status !== 'closed' ? <button type="button" disabled={getEnterpriseCyclePonds(editingCycle.id, ponds).some((pond) => pond.cycleStatus !== 'ended')} onClick={async () => { await closeCycle(editingCycle); resetCycleForm(); }}>{copy.closeCycle}</button> : null}
            </div> : null}
          </form>
        </div>
      ) : null}

      {addMenuOpen ? (
        <div className={styles.overlay} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setAddMenuOpen(false)}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-label={copy.addItemLabel}>
            <div className={styles.modalHeader}><div><h2>{copy.addPrompt}</h2><p>{copy.addPromptDescription}</p></div><button type="button" className={styles.iconButton} onClick={() => setAddMenuOpen(false)} aria-label={copy.close}><X size={20} /></button></div>
            <div className={styles.addMenuGrid}>
              <button type="button" disabled={activePonds.length === 0} onClick={() => { setAddMenuOpen(false); setOperationAction('sampling'); }}><FlaskConical size={21} /><span>{t.home.samplingData}</span></button>
              <button type="button" disabled={activePonds.length === 0} onClick={() => { setAddMenuOpen(false); setOperationAction('mortality'); }}><Activity size={21} /><span>Daily Mortality</span></button>
              <button type="button" disabled={cycleBlockOptions.length === 0} onClick={() => { setAddMenuOpen(false); openCycleForm(); }}><CalendarDays size={21} /><span>{copy.newProductionCycle}</span></button>
              <button type="button" onClick={() => { setAddMenuOpen(false); setCreateBlockOpen(true); }}><Layers3 size={21} /><span>{copy.newBlock}</span></button>
              <button type="button" disabled={sortedBlocks.length === 0} onClick={() => { setAddMenuOpen(false); setCreatePondOpen(true); }}><Waves size={21} /><span>{copy.newPond}</span></button>
            </div>
          </div>
        </div>
      ) : null}

      {operationAction ? (
        <div className={styles.overlay} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOperationAction(null)}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-label={operationAction === 'sampling' ? t.home.samplingData : 'Daily Mortality'}>
            <div className={styles.modalHeader}>
              <div><h2>{operationAction === 'sampling' ? t.home.samplingData : 'Daily Mortality'}</h2><p>Select an active pond.</p></div>
              <button type="button" className={styles.iconButton} onClick={() => setOperationAction(null)} aria-label={copy.close}><X size={20} /></button>
            </div>
            <div className={styles.addMenuGrid}>
              {activePonds.map((pond) => (
                <Link key={pond.id} href={`/dashboard/ponds/detail?id=${encodeURIComponent(pond.id)}&action=${operationAction}`}>
                  <Waves size={21} /><span>{pond.pondName}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {createBlockOpen ? (
        <div className={styles.overlay} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setCreateBlockOpen(false)}>
          <form className={styles.modal} onSubmit={createBlock} onPointerDown={dismissKeyboardOnContainerPress}>
            <div className={styles.modalHeader}><div><h2>{copy.newBlock}</h2><p>{copy.newBlockDescription}</p></div><button type="button" className={styles.iconButton} onClick={() => setCreateBlockOpen(false)} aria-label={copy.close}><X size={20} /></button></div>
            <label>{t.enterprise.blockName}<input required maxLength={100} value={newBlockName} onChange={(event) => setNewBlockName(event.target.value)} /></label>
            <label>{copy.technician}<select value={newBlockTechnicianId} onChange={(event) => setNewBlockTechnicianId(event.target.value)}><option value="">{t.enterprise.unassigned}</option>{technicians.map((technician) => <option key={technician.uid} value={technician.uid}>{getEnterpriseTechnicianLabel(technician.name, technician.email)}</option>)}</select></label>
            <button className={styles.saveButton} disabled={saving || !newBlockName.trim()}>{saving ? copy.creatingBlock : copy.createBlock}</button>
          </form>
        </div>
      ) : null}

      {createPondOpen ? (
        <div className={styles.overlay} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setCreatePondOpen(false)}>
          <form className={styles.modal} onSubmit={createPhysicalPond} onPointerDown={dismissKeyboardOnContainerPress}>
            <div className={styles.modalHeader}><div><h2>{copy.newPond}</h2><p>{copy.newPondDescription}</p></div><button type="button" className={styles.iconButton} onClick={() => setCreatePondOpen(false)} aria-label={copy.close}><X size={20} /></button></div>
            <label>{copy.selectBlock}<select required value={newPondBlockId} onChange={(event) => setNewPondBlockId(event.target.value)}><option value="">{copy.selectBlock}</option>{sortedBlocks.map((block) => <option key={block.id} value={block.id}>{block.name}</option>)}</select></label>
            <label>{copy.pondName}<input required maxLength={100} value={newPondName} onChange={(event) => setNewPondName(event.target.value)} /></label>
            <label>{copy.pondArea}<input required type="number" min="0.01" step="0.01" value={newPondArea} onChange={(event) => setNewPondArea(event.target.value)} /></label>
            <button className={styles.saveButton} disabled={saving || !newPondName.trim() || !newPondBlockId || Number(newPondArea) <= 0}>{saving ? copy.creatingPond : copy.createPond}</button>
          </form>
        </div>
      ) : null}

      {selectedPond && selectedStatus ? (
        <div className={styles.overlay} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelectedPond(null)}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-label={selectedPond.pondName}>
            <div className={styles.modalHeader}>
              <div><h2>{selectedPond.pondName}</h2><p>DOC {selectedStatus.doc}</p></div>
              <button className={styles.iconButton} onClick={() => setSelectedPond(null)} aria-label={copy.close}><X size={20} /></button>
            </div>
            {selectedStatus.risk === 'stable' ? (
              <div className={styles.stablePanel}><CheckCircle2 size={21} />{copy.stableHealth}</div>
            ) : (
              <div className={styles.warningList}>
                {selectedStatus.warnings.map((warning) => (
                  <div
                    key={warning.code}
                    className={warning.severity === 'critical' ? styles.criticalItem : styles.warningItem}
                  >
                    <AlertTriangle size={18} /><span>{warning.label}</span>
                  </div>
                ))}
              </div>
            )}
            <Link className={styles.saveButton} href={`/dashboard/ponds/detail?id=${selectedPond.id}`}>{t.enterprise.openPondDetails}</Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
