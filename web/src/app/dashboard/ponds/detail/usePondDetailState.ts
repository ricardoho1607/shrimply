"use client";
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompanyBlocks, useCompanyHarvestRecords } from '@/hooks/useDashboardData';
import { useFarmDateKey } from '@/hooks/useFarmDateKey';
import { useFarmPermissions } from '@/hooks/useFarmPermissions';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query
} from 'firebase/firestore';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getAssignedEnterpriseBlockIds,
  type FarmBlock,
} from "../../../../../../shared/enterpriseBlocks";
import { FARM_OPERATIONAL_DAY_ROLLOVER_HOUR } from "../../../../../../shared/farmDate";
import {
  type MortalityObservationType
} from "../../../../../../shared/pondCalculations";
import { useSaveOperation } from "../../../../../../shared/useSaveOperation";
import { withFinalHarvestDates, type HarvestRecordForReadiness } from '../../../../../../shared/harvestCalculations';
import { FarmCycle, MortalityFormState, Pond } from './PondDetailModel';

export function usePondDetailState() {
  const { save, busy: savePending } = useSaveOperation();

  const { company } = useAuth();

  const { t } = useLanguage();

  const copy = t.pondDetail;

  const searchParams = useSearchParams();

  const id = searchParams.get('id');

  const requestedAction = searchParams.get('action');

  const router = useRouter();

  const harvests = useCompanyHarvestRecords<HarvestRecordForReadiness>();

  const [pond, setPond] = useState<Pond | null>(null);

  const [loading, setLoading] = useState(true);

  const [companyId, setCompanyId] = useState<string | null>(null);

  const [userRole, setUserRole] = useState<string | undefined>();

  const today = useFarmDateKey(company?.timeZone);

  const operationalToday = useFarmDateKey(company?.timeZone, FARM_OPERATIONAL_DAY_ROLLOVER_HOUR);

  const [cycles, setCycles] = useState<FarmCycle[]>([]);

  const [isSamplingModalOpen, setSamplingModalOpen] = useState(requestedAction === 'sampling');

  const [isMortalityModalOpen, setMortalityModalOpen] = useState(requestedAction === 'mortality');

  const [isMortalityHistoryOpen, setMortalityHistoryOpen] = useState(true);

  const [isRecordMenuOpen, setRecordMenuOpen] = useState(false);

  const recordMenuRef = useRef<HTMLDivElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isDeletingPond, setIsDeletingPond] = useState(false);

  const [isEndCycleOpen, setEndCycleOpen] = useState(false);

  const [endCycleForm, setEndCycleForm] = useState({
    cycleEndedAt: today,
    cycleEndReason: 'harvested' as 'harvested' | 'disease' | 'reset' | 'other',
  });

  const [isStartCycleOpen, setStartCycleOpen] = useState(false);

  const [startCycleForm, setStartCycleForm] = useState({
    density: '',
    docStart: today,
    plValue: '0.5',
    plSupplier: '',
  });

  const [isBaselineModalOpen, setBaselineModalOpen] = useState(false);

  const [baselineForm, setBaselineForm] = useState({
    baselineDate: today,
    baselineMbw: '',
    baselineEstimatedPopulation: '',
    baselineSurvivalRate: '',
    baselineCumulativeFeed: '',
  });

  const [samplingForm, setSamplingForm] = useState({
    date: today,
    mbw: '',
    feed: '',
    mortality: '0'
  });

  const [editingSamplingId, setEditingSamplingId] = useState<string | null>(null);

  const [editingMortalityId, setEditingMortalityId] = useState<string | null>(null);

  const [mortalityForm, setMortalityForm] = useState<MortalityFormState>({
    date: today,
    observationType: 'observed_recovered' as MortalityObservationType,
    count: '',
    siponShift: 'morning',
    siphonedCount: '',
    mortalCount: '',
    notes: '',
  });

  const { data: farmBlocks, loading: blocksLoading } = useCompanyBlocks<FarmBlock>('asc');

  const assignedBlockIds = useMemo(
    () => getAssignedEnterpriseBlockIds(farmBlocks, auth.currentUser?.uid),
    [farmBlocks],
  );

  useEffect(() => {
    if (!isRecordMenuOpen) return;

    const closeRecordMenu = (event: PointerEvent) => {
      if (!recordMenuRef.current?.contains(event.target as Node)) setRecordMenuOpen(false);
    };

    document.addEventListener('pointerdown', closeRecordMenu);
    return () => document.removeEventListener('pointerdown', closeRecordMenu);
  }, [isRecordMenuOpen]);

  useEffect(() => {
    let unsubUser: (() => void) | null = null;
    let unsubPond: (() => void) | null = null;
    let unsubCycles: (() => void) | null = null;
    let currentCompanyId: string | null = null;

    const cleanCompanyListeners = () => {
      if (unsubPond) unsubPond();
      if (unsubCycles) unsubCycles();
      unsubPond = null;
      unsubCycles = null;
    };

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubUser) unsubUser();
      cleanCompanyListeners();
      unsubUser = null;
      currentCompanyId = null;

      if (firebaseUser) {
        unsubUser = onSnapshot(doc(db, 'users', firebaseUser.uid), (uDoc) => {
          const userData = uDoc.data();
          const cid = userData?.companyId;
          setUserRole(userData?.role);
          setCompanyId(cid);
          if (cid && cid !== currentCompanyId) {
            cleanCompanyListeners();
            currentCompanyId = cid;
            // Listen to Pond
            unsubPond = onSnapshot(doc(db, 'companies', cid, 'ponds', id as string), (snapshot) => {
              if (snapshot.exists()) {
                setPond({ id: snapshot.id, ...snapshot.data() } as Pond);
              } else {
                setPond(null);
              }
              setLoading(false);
            });

            const qCycles = query(collection(db, 'companies', cid, 'cycles'), orderBy('createdAt', 'asc'));
            unsubCycles = onSnapshot(qCycles, (snapshot) => {
              setCycles(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as FarmCycle)));
            });
          } else if (!cid) {
            cleanCompanyListeners();
            currentCompanyId = null;
            setPond(null);
            setCycles([]);
            setLoading(false);
          }
        });
      } else {
        setPond(null);
        setCycles([]);
        setCompanyId(null);
        setUserRole(undefined);
        setLoading(false);
      }
    });
    return () => {
      unsubAuth();
      if (unsubUser) unsubUser();
      cleanCompanyListeners();
    };
  }, [id]);

  const isEnterpriseTechnician = company?.businessSize === 'enterprise' && userRole === 'technician';

  const hasPondAccess = !isEnterpriseTechnician
    || (typeof pond?.blockId === 'string' && assignedBlockIds.has(pond.blockId));

  const hasPermission = useFarmPermissions();

  const canManagePond = hasPermission('managePonds') && hasPondAccess;

  const canRecordPondData = hasPermission('recordPondData') && hasPondAccess;

  const canManageCycles = hasPermission('manageCycles') && hasPondAccess;

  const canManageFeed = hasPermission('manageFeedInventory') && hasPondAccess;

  const canEditPond = canManagePond || canRecordPondData;
  return {
    save,
    savePending,
    company,
    t,
    copy,
    id,
    router,
    pond: pond && !harvests.loading && !harvests.error ? withFinalHarvestDates(pond, harvests.data) : pond,
    loading,
    companyId,
    today,
    operationalToday,
    cycles,
    isSamplingModalOpen,
    setSamplingModalOpen,
    isMortalityModalOpen,
    setMortalityModalOpen,
    isMortalityHistoryOpen,
    setMortalityHistoryOpen,
    isRecordMenuOpen,
    setRecordMenuOpen,
    recordMenuRef,
    isSubmitting,
    setIsSubmitting,
    isDeletingPond,
    setIsDeletingPond,
    isEndCycleOpen,
    setEndCycleOpen,
    endCycleForm,
    setEndCycleForm,
    isStartCycleOpen,
    setStartCycleOpen,
    startCycleForm,
    setStartCycleForm,
    isBaselineModalOpen,
    setBaselineModalOpen,
    baselineForm,
    setBaselineForm,
    samplingForm,
    setSamplingForm,
    editingSamplingId,
    setEditingSamplingId,
    editingMortalityId,
    setEditingMortalityId,
    mortalityForm,
    setMortalityForm,
    blocksLoading,
    isEnterpriseTechnician,
    hasPondAccess,
    canManagePond,
    canRecordPondData,
    canManageCycles,
    canManageFeed,
    canEditPond,
  };
}
