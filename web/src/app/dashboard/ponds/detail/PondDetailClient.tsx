"use client";
import { startPondCycle, StartPondCycleError } from '@/lib/startPondCycle';

import { useSaveOperation } from '../../../../../../shared/useSaveOperation';
import { prepareSaveData as removeUndefinedFields } from '@/lib/saveData';
import { updateRecordOnline } from '@/lib/saveData';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Scale,
  Activity,
  Wind,
  Droplets,
  Settings,
  Plus,
  RotateCcw,
  X,
  Loader2,
  Info,
  LineChart as LineChartIcon,
  ShoppingBag,
  Users,
  Target,
  Database,
  Layers,
  FlaskConical,
  Leaf,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import {
  doc,
  onSnapshot,
  runTransaction,
  deleteDoc,
  query,
  collection,
  orderBy,
  serverTimestamp,
  getDocs,
  where,
  writeBatch
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { PHYSICAL_POND_LINK_ERROR } from '../../../../../../shared/physicalPondIdentity';
import {
  calculateSamplingAdg,
  calculatePondMortalityForDate,
  calculatePondMetricsWithHarvest,
  detectFeedBiomassMismatchInsight,
  getSamplingMbw,
  isBaselineSampling,
  type MortalityObservationType,
  type SharedMortalityRecord,
} from '../../../../../../shared/pondCalculations';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFarmDateKey } from '@/hooks/useFarmDateKey';
import { FARM_OPERATIONAL_DAY_ROLLOVER_HOUR } from '../../../../../../shared/farmDate';
import { hasFinalHarvestForPondCycle, type HarvestType } from '../../../../../../shared/harvestCalculations';
import { useCompanyBlocks } from '@/hooks/useDashboardData';
import {
  getAssignedEnterpriseBlockIds,
  type FarmBlock,
} from '../../../../../../shared/enterpriseBlocks';
import { useFarmPermissions } from '@/hooks/useFarmPermissions';
import type { PlanktonOverwatchSnapshot } from '../../../../../../shared/planktonOverwatch';
import PlanktonOverwatchCard from '@/components/PlanktonOverwatchCard';
import type { PondDetailCopy } from '../../../../../../shared/pondDetailI18n';

/* --- Types --------------------------------------------------- */
interface FeedData {
  totalDailyFeed: string | number;
  inventoryFeedId?: string | null;
  cycleId?: string;
  cycleName?: string;
  pondCycleId?: string;
}

interface Sampling {
  id: string;
  date: string;
  mbw: number;
  mortality: number;
  feed?: number;
  cycleId?: string;
  cycleName?: string;
  pondCycleId?: string;
  phMorning?: string;
  phEvening?: string;
  doMorning?: string;
  doEvening?: string;
  transparency?: string;
  salinity?: string;
  temp?: string;
  feedData?: FeedData;
  isBaselineEstimate?: boolean;
  source?: string;
  estimatedPopulation?: number;
  estimatedSurvivalRate?: number;
  cumulativeFeedToDate?: number;
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

type LabReportStatus = {
  labReportId?: string;
  reportType?: 'water_quality' | 'plankton' | 'combined';
  sampleDate?: string;
  status?: 'good' | 'info' | 'watch' | 'warning' | 'critical';
  mainIssue?: string;
  keyRisks?: string[];
  recommendations?: string[];
};

interface Pond {
  physicalPondId?: string;
  id: string; pondName: string; pondArea: number; density: number; initialPopulation: number;
  blockId?: string;
  blockName?: string;
  docStart: string; supplier: string; plSupplier?: string; initialWeight: number; samplings: Sampling[];
  mortalityRecords?: SharedMortalityRecord[];
  latestLabStatus?: LabReportStatus & {
    byType?: {
      water_quality?: LabReportStatus;
      plankton?: LabReportStatus;
    };
  };
  latestPlanktonOverwatch?: PlanktonOverwatchSnapshot;
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
}

interface FarmCycle {
  id: string;
  cycleName: string;
  status: 'planning' | 'stocking' | 'active' | 'closing' | 'closed';
  plannedStartDate?: string;
  stockingStartDate?: string;
}

interface MortalityFormState {
  date: string;
  observationType: MortalityObservationType;
  count: string;
  siponShift: 'morning' | 'evening';
  siphonedCount: string;
  mortalCount: string;
  notes: string;
}

const getCycleStatus = (pond: Pond) => pond.cycleStatus === 'ended' ? 'ended' : 'active';
const isActiveCycle = (pond: Pond) => getCycleStatus(pond) === 'active';
const getPlSupplier = (pond: Pond) => pond.plSupplier || pond.supplier || 'N/A';
const isOpenFarmCycle = (cycle: FarmCycle) => ['planning', 'stocking', 'active'].includes(cycle.status);
const getPhysicalPondKey = (pondName: string) => pondName.trim().toLowerCase();
const getLabStatusStyle = (status: LabReportStatus['status'] | undefined, copy: PondDetailCopy) => {
  if (status === 'critical') return { label: copy.critical, color: '#991b1b', bg: '#fee2e2' };
  if (status === 'warning') return { label: copy.warning, color: '#92400e', bg: '#fef3c7' };
  if (status === 'watch') return { label: copy.watch, color: '#0F4C75', bg: '#E0F2FE' };
  return { label: copy.good, color: '#166534', bg: '#DCFCE7' };
};
const DAY_MS = 24 * 60 * 60 * 1000;

const getDateOnlyUtcTime = (dateString: string): number => {
  const [year, month, day] = dateString.split('-').map(Number);
  return Date.UTC(year, (month || 1) - 1, day || 1);
};

const calculateDocFromDates = (startDate: string, baselineDate: string): number =>
  Math.floor((getDateOnlyUtcTime(baselineDate) - getDateOnlyUtcTime(startDate)) / DAY_MS);

/* --- Custom SVG Chart --------------------------------------- */
const GrowthChart = ({ data, emptyMessage }: { data: { x: number, y: number }[]; emptyMessage: string }) => {
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number } | null>(null);

  if (!data || data.length < 2) {
    return (
      <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontSize: '13px', background: 'var(--bg-mid)', borderRadius: '16px' }}>
        {emptyMessage}
      </div>
    );
  }

  const padding = 40;
  const width = 600;
  const height = 240;

  const minX = Math.min(...data.map(d => d.x));
  const maxX = Math.max(...data.map(d => d.x));
  const minY = 0;
  const maxY = Math.max(...data.map(d => d.y)) * 1.2;

  const getX = (x: number) => padding + ((x - minX) / (maxX - minX || 1)) * (width - padding * 2);
  const getY = (y: number) => height - padding - ((y - minY) / (maxY - minY || 1)) * (height - padding * 2);

  const points = data.map(d => `${getX(d.x)},${getY(d.y)}`).join(' ');

  return (
    <div style={{ width: '100%', overflow: 'hidden', position: 'relative' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        {/* Grids */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <line key={i} x1={padding} y1={getY(maxY * p)} x2={width - padding} y2={getY(maxY * p)} stroke="var(--border)" strokeDasharray="4 4" />
        ))}

        {/* Gradient Fill */}
        <defs>
          <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`M ${getX(data[0].x)} ${height - padding} L ${points} L ${getX(data[data.length-1].x)} ${height - padding} Z`}
          fill="url(#growthGradient)"
        />

        {/* Line */}
        <polyline points={points} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data Points */}
        {data.map((d, i) => (
          <g key={i} onMouseEnter={() => setHoveredPoint(d)} onMouseLeave={() => setHoveredPoint(null)}>
            <circle
              cx={getX(d.x)}
              cy={getY(d.y)}
              r={hoveredPoint === d ? "6" : "4"}
              fill={hoveredPoint === d ? "var(--primary)" : "#FFF"}
              stroke="var(--primary)"
              strokeWidth="2"
              style={{ transition: 'all 0.2s', cursor: 'pointer' }}
            />
            {/* Larger invisible hit area */}
            <circle
              cx={getX(d.x)}
              cy={getY(d.y)}
              r="20"
              fill="transparent"
              style={{ cursor: 'pointer' }}
            />
          </g>
        ))}

        {/* Labels */}
        <text x={padding} y={height - 10} fontSize="10" fill="var(--text-faint)" fontWeight="600">DOC {minX}</text>
        <text x={width - padding} y={height - 10} textAnchor="end" fontSize="10" fill="var(--text-faint)" fontWeight="600">DOC {maxX}</text>
      </svg>

      {/* Tooltip */}
      {hoveredPoint && (
        <div style={{
          position: 'absolute',
          left: `${(getX(hoveredPoint.x) / width) * 100}%`,
          top: `${(getY(hoveredPoint.y) / height) * 100}%`,
          transform: 'translate(-50%, -120%)',
          background: 'rgba(15, 23, 42, 0.9)',
          color: '#FFF',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '12px',
          pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 10,
          whiteSpace: 'nowrap',
          transition: 'all 0.1s ease-out'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '2px' }}>DOC {hoveredPoint.x}</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>MBW: <span style={{ color: '#FFF', fontWeight: 600 }}>{hoveredPoint.y}g</span></div>
          <div style={{ position: 'absolute', bottom: '-4px', left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: '8px', height: '8px', background: 'rgba(15, 23, 42, 0.9)' }} />
        </div>
      )}
    </div>
  );
};

export default function PondDetailClient() {
  const { save, busy: savePending } = useSaveOperation();
  const { company } = useAuth();
  const { t } = useLanguage();
  const copy = t.pondDetail;
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const requestedAction = searchParams.get('action');
  const router = useRouter();
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

  const handleDeleteSampling = async (samplingId: string) => {
    if (!companyId || !pond || !canRecordPondData || !isActiveCycle(pond)) return;
    if (!window.confirm(copy.deleteSamplingConfirm)) return;
    try {
      const reference = doc(db, 'companies', companyId, 'ponds', pond.id);
      await runTransaction(db, async tx => {
        const current = await tx.get(reference);
        if (!current.exists()) throw new Error('Pond no longer exists');
        tx.update(reference, removeUndefinedFields({
          samplings: (current.data().samplings || []).filter((record: { id: string }) => record.id !== samplingId),
          updatedAt: serverTimestamp(),
        }));
      });
    } catch (error) {
      console.error('Error deleting sampling record:', error);
      alert(copy.deleteSamplingFailed);
    }
  };

  const handleDeleteMortality = async (recordId: string) => {
    if (!companyId || !pond || !canRecordPondData || !isActiveCycle(pond)) return;
    if (!window.confirm(copy.deleteMortalityConfirm)) return;
    try {
      const reference = doc(db, 'companies', companyId, 'ponds', pond.id);
      await runTransaction(db, async tx => {
        const current = await tx.get(reference);
        if (!current.exists()) throw new Error('Pond no longer exists');
        tx.update(reference, removeUndefinedFields({
          mortalityRecords: (current.data().mortalityRecords || []).filter((record: { id: string }) => record.id !== recordId),
          updatedAt: serverTimestamp(),
        }));
      });
    } catch (error) {
      console.error('Error deleting mortality record:', error);
      alert(copy.deleteMortalityFailed);
    }
  };

  const handleSaveSampling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (save.busy) return;
    if (!companyId || !pond) return;
    if (!canRecordPondData || !isActiveCycle(pond)) return;

    const mbw = Number(samplingForm.mbw);
    const feed = samplingForm.feed.trim() ? Number(samplingForm.feed) : undefined;
    if (!samplingForm.date || samplingForm.date > today || samplingForm.date < String(pond.docStart || '').slice(0, 10)
      || !Number.isFinite(mbw) || mbw <= 0 || (feed !== undefined && (!Number.isFinite(feed) || feed < 0))) {
      alert('Enter a valid sampling date, positive MBW, and non-negative feed amount.');
      return;
    }
    setIsSubmitting(true);
    if (!save.acquire()) return;
    try {
      const newSampling: Sampling = {
        id: editingSamplingId || save.id(`sampling:${pond.id}`),
        date: samplingForm.date,
        mbw,
        ...(feed !== undefined ? { feed } : {}),
        mortality: parseInt(samplingForm.mortality) || 0,
        cycleId: pond.cycleId,
        cycleName: pond.cycleName,
        pondCycleId: pond.pondCycleId || pond.id,
      };

      const reference = doc(db, 'companies', companyId, 'ponds', pond.id);
      await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists() || snapshot.data().cycleStatus === 'ended') throw new Error('Pond cycle is unavailable');
        const records = (snapshot.data().samplings || []) as Sampling[];
        if (editingSamplingId && !records.some(record => record.id === editingSamplingId)) throw new Error('Sampling no longer exists');
        if (!editingSamplingId && records.some(record => record.id === newSampling.id)) return;
        const updatedSamplings = editingSamplingId
          ? records.map(record => record.id === editingSamplingId ? { ...record, ...newSampling } : record)
          : [...records, newSampling];
        transaction.update(reference, removeUndefinedFields({ samplings: updatedSamplings, updatedAt: serverTimestamp() }));
      });
      save.complete();
      setSamplingModalOpen(false);
      setEditingSamplingId(null);
      setSamplingForm({
        date: today,
        mbw: '',
        feed: '',
        mortality: '0'
      });
    } catch (error) {
      console.error("Error saving sampling:", error);
      alert(t.messages.error || "Failed to save sampling. Your entries are still here; check your connection and retry.");
    } finally {
      save.release();
      setIsSubmitting(false);
    }
  };

  const handleSaveMortality = async (e: React.FormEvent) => {
    e.preventDefault();
    if (save.busy) return;
    const recordedBy = auth.currentUser?.uid;
    if (!companyId || !pond || !canRecordPondData || !isActiveCycle(pond)) return;

    const siphonedCount = Math.round(Number(mortalityForm.siphonedCount) || 0);
    const mortalCount = Math.round(Number(mortalityForm.mortalCount) || 0);
    const count = mortalityForm.observationType === 'none_observed'
      ? 0
      : mortalityForm.observationType === 'observed_recovered'
        ? siphonedCount + mortalCount
        : Math.round(Number(mortalityForm.count));
    if (mortalityForm.observationType !== 'none_observed' && (isNaN(count) || count <= 0)) {
      alert(copy.mortalityCountInvalid);
      return;
    }
    if (mortalityForm.date > today) {
      alert(copy.mortalityFuture);
      return;
    }
    const cycleStartKey = String(pond.cycleStartedAt || pond.docStart || '').slice(0, 10);
    if (cycleStartKey && mortalityForm.date < cycleStartKey) {
      alert(copy.mortalityBeforeCycle);
      return;
    }

    setIsSubmitting(true);
    if (!save.acquire()) return;
    try {
      const mbwAtRecord = [...(pond.samplings || [])]
        .filter((sampling) => sampling.date <= mortalityForm.date && Number(sampling.mbw) > 0)
        .sort((first, second) => second.date.localeCompare(first.date))[0]?.mbw;
      const notes = mortalityForm.notes.trim();

      if (editingMortalityId) {
        const existing = (pond.mortalityRecords || []).find((r) => r.id === editingMortalityId);
        const updatedRecord: SharedMortalityRecord = {
          id: editingMortalityId,
          date: mortalityForm.date,
          observationType: mortalityForm.observationType,
          count,
          ...(mortalityForm.observationType === 'observed_recovered' ? {
            siponShift: mortalityForm.siponShift,
            siphonedCount,
            mortalCount,
          } : {}),
          recordedAt: existing?.recordedAt || new Date().toISOString(),
          recordedBy: existing?.recordedBy || recordedBy,
          pondCycleId: existing?.pondCycleId || pond.pondCycleId || pond.id,
          ...(Number(mbwAtRecord) > 0 ? { mbwAtRecord: Number(mbwAtRecord) } : {}),
          ...(notes ? { notes } : {}),
          ...(pond.cycleId ? { cycleId: pond.cycleId } : {}),
          ...(pond.cycleName ? { cycleName: pond.cycleName } : {}),
        };
        const reference = doc(db, 'companies', companyId, 'ponds', pond.id);
        await runTransaction(db, async transaction => {
          const snapshot = await transaction.get(reference);
          if (!snapshot.exists()) throw new Error('Pond no longer exists');
          const records = (snapshot.data().mortalityRecords || []) as SharedMortalityRecord[];
          if (!records.some(record => record.id === editingMortalityId)) throw new Error('Mortality record no longer exists');
          transaction.update(reference, removeUndefinedFields({ mortalityRecords: records.map(record => record.id === editingMortalityId ? updatedRecord : record), updatedAt: serverTimestamp() }));
        });
      } else {
        const newRecord: SharedMortalityRecord = {
          id: save.id(`mortality:${pond.id}`),
          date: mortalityForm.date,
          observationType: mortalityForm.observationType,
          count,
          ...(mortalityForm.observationType === 'observed_recovered' ? {
            siponShift: mortalityForm.siponShift,
            siphonedCount,
            mortalCount,
          } : {}),
          recordedAt: new Date().toISOString(),
          recordedBy,
          pondCycleId: pond.pondCycleId || pond.id,
          ...(Number(mbwAtRecord) > 0 ? { mbwAtRecord: Number(mbwAtRecord) } : {}),
          ...(notes ? { notes } : {}),
          ...(pond.cycleId ? { cycleId: pond.cycleId } : {}),
          ...(pond.cycleName ? { cycleName: pond.cycleName } : {}),
        };

        const reference = doc(db, 'companies', companyId, 'ponds', pond.id);
        await runTransaction(db, async transaction => {
          const snapshot = await transaction.get(reference);
          if (!snapshot.exists() || snapshot.data().cycleStatus === 'ended') throw new Error('Pond cycle is unavailable');
          const records = (snapshot.data().mortalityRecords || []) as SharedMortalityRecord[];
          if (records.some(record => record.id === newRecord.id)) return;
          transaction.update(reference, removeUndefinedFields({ mortalityRecords: [...records, newRecord], updatedAt: serverTimestamp() }));
        });
      }

      save.complete();
      setMortalityModalOpen(false);
      setEditingMortalityId(null);
      setMortalityForm({
        date: today,
        observationType: 'observed_recovered',
        count: '',
        siponShift: 'morning',
        siphonedCount: '',
        mortalCount: '',
        notes: '',
      });
    } catch (error) {
      console.error('Error saving mortality:', error);
      alert(copy.mortalitySaveFailed);
    } finally {
      save.release();
      setIsSubmitting(false);
    }
  };

  const handleEndCycle = async () => {
    if (save.busy) return;
    if (!companyId || !pond) return;
    if (!canManagePond) return;
    if (!save.acquire()) return;
    try {
      if (endCycleForm.cycleEndReason === 'harvested') {
        const harvestSnapshot = await getDocs(collection(db, 'companies', companyId, 'harvestRecords'));
        const harvestRecords = harvestSnapshot.docs.filter(row => !row.data().voided).map((harvestDoc) => ({
          id: harvestDoc.id,
          ...harvestDoc.data(),
        } as HarvestRecord));
        if (!hasFinalHarvestForPondCycle(harvestRecords, pond)) {
          const shouldGoToHarvest = window.confirm(
            `${t.farmCycle.finalHarvestRequiredMessage.replace('{{pondNames}}', pond.pondName)}\n\n${t.farmCycle.goToHarvest}?`
          );
          if (shouldGoToHarvest) router.push('/dashboard/harvest');
          return;
        }
      }
      const physicalPondsByActiveId = await getDocs(query(
        collection(db, 'companies', companyId, 'physicalPonds'),
        where('activePondId', '==', pond.id)
      ));
      const physicalPondsByName = await getDocs(query(
        collection(db, 'companies', companyId, 'physicalPonds'),
        where('pondName', '==', pond.pondName)
      ));
      const batch = writeBatch(db);
      batch.update(doc(db, 'companies', companyId, 'ponds', pond.id), {
        cycleStatus: 'ended',
        cycleEndedAt: endCycleForm.cycleEndedAt,
        cycleEndReason: endCycleForm.cycleEndReason,
        cycleEndedBy: auth.currentUser?.uid || '',
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid || '',
      });
      const releasedPhysicalPondIds = new Set<string>();
      [...physicalPondsByActiveId.docs, ...physicalPondsByName.docs].forEach((physicalPondDoc) => {
        if (releasedPhysicalPondIds.has(physicalPondDoc.id)) return;
        const physicalPond = physicalPondDoc.data();
        if (
          physicalPond.activePondId === pond.id ||
          (physicalPond.status === 'active' && getPhysicalPondKey(physicalPond.pondName || '') === getPhysicalPondKey(pond.pondName))
        ) {
          releasedPhysicalPondIds.add(physicalPondDoc.id);
          batch.update(doc(db, 'companies', companyId, 'physicalPonds', physicalPondDoc.id), {
            status: 'idle',
            activePondId: null,
            updatedAt: serverTimestamp(),
            updatedBy: auth.currentUser?.uid || '',
          });
        }
      });
      await batch.commit();
      setEndCycleOpen(false);
    } catch (error) {
      console.error('Error ending cycle:', error);
      alert(copy.endCycleFailed);
    } finally {
      save.release();
    }
  };

  const handleDeletePond = async () => {
    if (!companyId || !pond || !canManagePond || isDeletingPond) return;
    const confirmed = window.confirm(copy.deletePondConfirm.replace('{{pond}}', pond.pondName));
    if (!confirmed) return;

    setIsDeletingPond(true);
    try {
      await deleteDoc(doc(db, 'companies', companyId, 'ponds', pond.id));
      router.push('/dashboard/ponds');
    } catch (error) {
      console.error('Error deleting pond:', error);
      alert(copy.deletePondFailed);
    } finally {
      setIsDeletingPond(false);
    }
  };

  const handleStartCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (save.busy) return;
    if (!companyId || !pond) return;
    if (!canManagePond || !canManageCycles) return;
    if (isEnterpriseTechnician && !cycles.some(isOpenFarmCycle)) {
      alert(t.enterprise.ownerMustStartCycle);
      return;
    }
    if (!save.acquire()) return;
    try {
      const sameNamePonds = await getDocs(query(
        collection(db, 'companies', companyId, 'ponds'),
        where('pondName', '==', pond.pondName)
      ));
      const result = await startPondCycle({
        companyId, userId: auth.currentUser?.uid || '', pond, pondType: 'cycle',
        activeCycle: cycles.find(isOpenFarmCycle), today,
        activePonds: sameNamePonds.docs.map(item => ({ id: item.id, ...item.data() } as Pond)),
        operationId: save.id(`pond-cycle:${companyId}:${pond.id}`),
        form: { ...startCycleForm, cycleStartMode: 'new', baselineMbw: '', baselineEstimatedPopulation: '', baselineSurvivalRate: '', baselineCumulativeFeed: '', newCycleName: `Cycle ${cycles.length + 1}` },
      });
      save.complete();
      setStartCycleOpen(false);
      router.push(`/dashboard/ponds/detail?id=${result.pondId}`);
    } catch (error) {
      console.error('Error starting cycle:', error);
      alert(error instanceof StartPondCycleError ? error.code === 'blockMismatch' ? t.enterpriseCycle.pondBlockMismatch : error.code === 'cycleMismatch' ? t.enterpriseCycle.pondCycleMismatch : t.startPondCycle.errors[error.code] : error instanceof Error && error.message === PHYSICAL_POND_LINK_ERROR ? error.message : copy.startCycleFailed);
    } finally {
      save.release();
    }
  };

  const openBaselineModal = () => {
    if (!pond) return;
    if (!canRecordPondData) return;
    const baselineSampling = (pond.samplings || [])
      .filter(isBaselineSampling)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    setBaselineForm({
      baselineDate: pond.baselineDate || baselineSampling?.date || today,
      baselineMbw: String(pond.baselineMbw ?? baselineSampling?.mbw ?? ''),
      baselineEstimatedPopulation: String(pond.baselineEstimatedPopulation ?? baselineSampling?.estimatedPopulation ?? ''),
      baselineSurvivalRate: String(pond.baselineSurvivalRate ?? baselineSampling?.estimatedSurvivalRate ?? ''),
      baselineCumulativeFeed: String(pond.baselineCumulativeFeed ?? baselineSampling?.cumulativeFeedToDate ?? baselineSampling?.feed ?? ''),
    });
    setBaselineModalOpen(true);
  };

  const handleUpdateBaseline = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!companyId || !pond) return;
    if (!canRecordPondData) return;

    const cycleStartDate = pond.docStart || pond.cycleStartedAt || baselineForm.baselineDate;
    const baselineDocValue = calculateDocFromDates(cycleStartDate, baselineForm.baselineDate);
    const baselineMbwValue = parseFloat(baselineForm.baselineMbw);
    const baselinePopulationValue = parseFloat(baselineForm.baselineEstimatedPopulation);
    const baselineSurvivalValue = parseFloat(baselineForm.baselineSurvivalRate);
    const baselineFeedValue = parseFloat(baselineForm.baselineCumulativeFeed);

    if (!baselineForm.baselineMbw || Number.isNaN(baselineMbwValue) || baselineMbwValue <= 0) {
      alert(copy.currentMbwRequired);
      return;
    }
    if (!baselineForm.baselineDate || !Number.isFinite(baselineDocValue) || baselineDocValue < 0) {
      alert(copy.currentDocRequired);
      return;
    }

    const baselineSamplingIndex = (pond.samplings || []).findIndex(isBaselineSampling);
    const existingBaseline = baselineSamplingIndex >= 0 ? pond.samplings[baselineSamplingIndex] : undefined;
    const baselineSampling: Sampling = {
      id: existingBaseline?.id || `baseline-${Date.now()}`,
      date: baselineForm.baselineDate,
      mbw: baselineMbwValue,
      mortality: 0,
      feed: Number.isNaN(baselineFeedValue) ? 0 : baselineFeedValue,
      isBaselineEstimate: true,
      source: 'midcycle_onboarding',
      cycleId: pond.cycleId,
      cycleName: pond.cycleName,
      pondCycleId: pond.pondCycleId || pond.id,
      ...(Number.isNaN(baselinePopulationValue) ? {} : { estimatedPopulation: baselinePopulationValue }),
      ...(Number.isNaN(baselineSurvivalValue) ? {} : { estimatedSurvivalRate: baselineSurvivalValue }),
      ...(Number.isNaN(baselineFeedValue) ? {} : { cumulativeFeedToDate: baselineFeedValue }),
    };
    const samplings = baselineSamplingIndex >= 0
      ? pond.samplings.map((sampling, index) => index === baselineSamplingIndex ? baselineSampling : sampling)
      : [baselineSampling, ...(pond.samplings || [])];

    try {
      await updateRecordOnline(db, doc(db, 'companies', companyId, 'ponds', pond.id), removeUndefinedFields({
        docStart: cycleStartDate,
        cycleStartedAt: cycleStartDate,
        cycleStartMode: 'midcycle',
        baselineDate: baselineForm.baselineDate,
        baselineDoc: baselineDocValue,
        baselineMbw: baselineMbwValue,
        ...(Number.isNaN(baselinePopulationValue) ? {} : { baselineEstimatedPopulation: baselinePopulationValue }),
        ...(Number.isNaN(baselineSurvivalValue) ? {} : { baselineSurvivalRate: baselineSurvivalValue }),
        ...(Number.isNaN(baselineFeedValue) ? {} : { baselineCumulativeFeed: baselineFeedValue }),
        baselineSource: 'user_midcycle_estimate',
        samplings,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid || '',
      }));
      setBaselineModalOpen(false);
    } catch (error) {
      console.error('Error updating baseline:', error);
      alert(copy.baselineUpdateFailed);
    }
  };

  const metrics = useMemo(() => {
    if (!pond) return null;
    const samplings = (pond.samplings || []).filter(s => getSamplingMbw(s) > 0 || Number(s.mortality) > 0 || Number(s.feed) > 0 || Boolean(s.feedData));
    const sorted = [...samplings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const latest = sorted[sorted.length - 1] || { mbw: 0, mortality: 0, feed: 0 };
    const docStart = new Date(pond.docStart);
    const biologicalMetrics = calculatePondMetricsWithHarvest(pond, company?.timeZone, { currentDateKey: operationalToday });
    const todayMortality = calculatePondMortalityForDate(pond, today, company?.timeZone);
    const feedBiomassInsight = detectFeedBiomassMismatchInsight(pond);

    const chartData = sorted
      .filter(s => getSamplingMbw(s) > 0)
      .map(s => ({
        x: Math.floor((new Date(s.date).getTime() - docStart.getTime()) / (1000 * 60 * 60 * 24)),
        y: getSamplingMbw(s)
      }));

    return {
      doc: biologicalMetrics.doc,
      population: biologicalMetrics.currentPopulation,
      biomass: biologicalMetrics.currentBiomass,
      sr: biologicalMetrics.adjustedSR,
      latest,
      chartData,
      adg: biologicalMetrics.adg,
      lastRecordedMBW: biologicalMetrics.latestMbw,
      size: biologicalMetrics.size,
      todayMortality: todayMortality.totalMortality,
      todayObservedMortality: todayMortality.observedRecovered,
      totalMortality: biologicalMetrics.totalMortality,
      totalMortalityWeight: biologicalMetrics.totalMortalityWeight,
      totalFeed: biologicalMetrics.totalFeedConsumed,
      fcr: biologicalMetrics.biomassGainFCR,
      feedBiomassInsight
    };
  }, [company?.timeZone, operationalToday, pond, today]);

  const currentCycleMortalityRecords = useMemo(() => {
    if (!pond) return [];
    const records = Array.isArray(pond.mortalityRecords) ? pond.mortalityRecords : [];
    return records
      .filter((r) => !r.pondCycleId || r.pondCycleId === pond.pondCycleId || r.pondCycleId === pond.id)
      .sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime());
  }, [pond]);

  const getSamplingMbwAtDate = (dateStr?: string) => {
    if (!pond || !dateStr) return 0;
    const validSamplings = (pond.samplings || [])
      .filter((s) => !isBaselineSampling(s) && getSamplingMbw(s) > 0 && (s.date || '') <= dateStr)
      .sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime());
    if (validSamplings.length > 0) return getSamplingMbw(validSamplings[0]);
    const baseline = (pond.samplings || []).find(isBaselineSampling);
    if (baseline && getSamplingMbw(baseline) > 0) return getSamplingMbw(baseline);
    return Number(pond.initialWeight || 0.5);
  };

  if (loading || (isEnterpriseTechnician && blocksLoading)) return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><Loader2 className="animate-spin" size={40} color="var(--primary)" /></div>;
  if (!pond || !hasPondAccess) return <div style={{ padding: '40px', textAlign: 'center' }}>{copy.notFound}</div>;
  const latestLabStatus = pond.latestLabStatus;
  const waterQualityLabStatus = latestLabStatus?.byType?.water_quality
    ?? (latestLabStatus?.reportType === 'water_quality' || (!latestLabStatus?.reportType && !latestLabStatus?.byType) ? latestLabStatus : undefined);
  const planktonLabStatus = latestLabStatus?.byType?.plankton
    ?? (latestLabStatus?.reportType === 'plankton' ? latestLabStatus : undefined);
  const labStatusCards = [
    { key: 'water_quality', title: copy.mineralQuality, Icon: Droplets, status: waterQualityLabStatus },
    { key: 'plankton', title: copy.planktonQuality, Icon: Leaf, status: planktonLabStatus },
  ].filter((item) => item.status);

  return (
    <div className="pond-detail-page dashboard-page" style={{ maxWidth: '1200px', margin: '0 auto' }}>

      {/* Breadcrumbs & Actions */}
      <div className="glass-card animate-fade-up pond-detail-toolbar">
        <div className="pond-detail-identity">
          <Link href="/dashboard/ponds" className="pond-detail-back" aria-label={copy.backToPonds}>
            <ArrowLeft size={17} />
          </Link>
          <div className="pond-detail-title">
              <div>
                {pond.pondName}
              </div>
              <div className="pond-detail-meta">
                <span>
                  DOC {metrics?.doc ?? 0}
                </span>
                <span className={`pond-detail-status is-${getCycleStatus(pond)}`}>
                  {getCycleStatus(pond) === 'ended' ? copy.ended : copy.active}
                </span>
                {pond.cycleStartMode === 'midcycle' && (
                  <span className="pond-detail-baseline-badge">
                    {copy.midCycleBaseline}
                  </span>
                )}
              </div>
            </div>
          </div>
        {canEditPond && (
          <div className="pond-detail-actions">
            {!isActiveCycle(pond) && canManagePond && canManageCycles && (
              <button onClick={() => {
                setStartCycleForm(prev => ({ ...prev, docStart: today }));
                setStartCycleOpen(true);
              }} className="dashboard-action dashboard-action-primary" disabled={savePending}>
                <RotateCcw size={18} strokeWidth={2.5} />
                <span>{copy.startNewCycle}</span>
              </button>
            )}
            {pond.cycleStartMode === 'midcycle' && isActiveCycle(pond) && canRecordPondData && (
              <button onClick={openBaselineModal} className="pond-detail-icon-action" title={copy.editBaselineEstimates} aria-label={copy.editBaselineEstimates} disabled={savePending}>
                <Settings size={16} />
              </button>
            )}
            {canRecordPondData && <div className="pond-detail-record-menu" ref={recordMenuRef}>
              <button
                type="button"
                className="pond-detail-record-trigger"
                aria-expanded={isRecordMenuOpen}
                aria-haspopup="menu"
                disabled={savePending || (!isActiveCycle(pond))}
                onClick={() => setRecordMenuOpen((open) => !open)}
              >
                <Plus size={15} />
                <span>{copy.record}</span>
              </button>
              {isRecordMenuOpen && (
                <div className="pond-detail-record-popover" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setRecordMenuOpen(false);
                      setEditingSamplingId(null);
                      setSamplingForm(prev => ({ ...prev, date: today }));
                      setSamplingModalOpen(true);
                    }} disabled={savePending}
                  >
                    <Plus size={16} /><span><strong>{copy.sampling}</strong><small>{copy.samplingDescription}</small></span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setRecordMenuOpen(false);
                      setMortalityForm(prev => ({ ...prev, date: today }));
                      setMortalityModalOpen(true);
                    }} disabled={savePending}
                  >
                    <Activity size={16} /><span><strong>{copy.mortality}</strong><small>{copy.mortalityDescription}</small></span>
                  </button>
                  {canManageFeed && <Link
                    role="menuitem"
                    href={`/dashboard/feed?action=new&pondId=${encodeURIComponent(pond.id)}`}
                    onClick={() => setRecordMenuOpen(false)}
                  >
                    <ShoppingBag size={16} /><span><strong>{copy.feed}</strong><small>{copy.feedDescription}</small></span>
                  </Link>}
                </div>
              )}
            </div>}
          </div>
        )}
      </div>

      {/* Hero Stats */}
      <div className="glass-card animate-fade-up animate-delay-1 dashboard-summary-panel pond-detail-summary">
        {[
          { label: copy.ageDoc, value: `${metrics?.doc ?? 0}`, unit: copy.days },
          { label: copy.estimatedBiomass, value: metrics?.biomass.toLocaleString(undefined, { maximumFractionDigits: 1 }) || '0', unit: 'kg' },
          { label: copy.averageDailyGrowth, value: metrics?.adg.toFixed(2) || '0.00', unit: `g/${copy.days}` },
          { label: copy.survivalRate, value: `${metrics?.sr.toFixed(1) || '0.0'}%`, unit: '' },
        ].map(({ label, value, unit }) => (
          <div className="dashboard-summary-item pond-detail-summary-item" key={label}>
            <div className="dashboard-summary-content">
              <span className="dashboard-summary-label">{label}</span>
              <div className="dashboard-summary-value">{value}{unit && <small>{unit}</small>}</div>
            </div>
          </div>
        ))}
      </div>

      {metrics?.feedBiomassInsight?.latest && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          border: '1px solid #FDE68A',
          background: '#FFFBEB',
          borderRadius: '12px',
          padding: '14px 16px',
          color: '#78350F',
        }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#92400E', flex: '0 0 auto' }}>
            <LineChartIcon size={18} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{copy.feedReview}</div>
            <div style={{ color: '#92400E', fontSize: '0.78rem', fontWeight: 600, lineHeight: 1.45 }}>
              {copy.feedDifference.replace('{{count}}', String(metrics.feedBiomassInsight.requiredRecords))}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, background: '#FEF3C7', borderRadius: '999px', padding: '4px 8px' }}>{copy.records} {metrics.feedBiomassInsight.latest.recordBiomassKg.toFixed(1)} kg</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, background: '#FEF3C7', borderRadius: '999px', padding: '4px 8px' }}>{copy.feedEstimate} {metrics.feedBiomassInsight.latest.feedBasedBiomassKg.toFixed(1)} kg</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, background: '#FEF3C7', borderRadius: '999px', padding: '4px 8px' }}>{metrics.feedBiomassInsight.latest.differencePercent.toFixed(0)}% {copy.difference}</span>
            </div>
          </div>
        </div>
      )}

      <div className="pond-detail-content-grid">

        {/* Left Content */}
        <div className="animate-fade-up animate-delay-2 pond-detail-main-column">

          {/* Growth Chart Section */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', lineHeight: '26px', fontWeight: 600, marginBottom: '4px' }}>{copy.growthCurve}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{copy.growthCurveDescription}</p>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px',
                background: 'var(--bg-mid)', borderRadius: '12px', fontSize: '0.75rem',
                fontWeight: 600, color: 'var(--primary)', border: '1px solid var(--border)'
              }}>
                <LineChartIcon size={16} />
                {copy.liveTracking}
              </div>
            </div>
            <GrowthChart data={metrics?.chartData || []} emptyMessage={copy.insufficientSampling} />
          </div>

          {/* Sampling History Table */}
          <div className="glass-card pond-detail-sampling-history" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '18px', lineHeight: '26px', fontWeight: 600 }}>{copy.samplingHistory}</h3>
              <button style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', background: 'transparent', border: 'none', cursor: 'pointer' }} disabled={savePending}>{copy.viewAuditLog}</button>
            </div>
            <div className="pond-detail-sampling-table-wrap">
              <table className="pond-detail-sampling-table">
                <thead>
                  <tr style={{ textAlign: 'left', background: 'var(--bg-mid)' }}>
                    <th style={{ height: '44px', padding: '0 24px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{copy.date}</th>
                    <th style={{ height: '44px', padding: '0 24px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>MBW (g)</th>
                    <th style={{ height: '44px', padding: '0 24px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ADG</th>
                    <th style={{ height: '44px', padding: '0 24px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{copy.size}</th>
                    <th style={{ height: '44px', padding: '0 24px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{copy.feedKg}</th>
                    <th style={{ height: '44px', padding: '0 24px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{copy.mortality}</th>
                    {canRecordPondData && isActiveCycle(pond) && <th style={{ height: '44px', padding: '0 24px' }}>{copy.action}</th>}
                  </tr>
                </thead>
                <tbody>
                  {(pond.samplings || [])
                    .filter((s) => Number(s.mbw) > 0 || Number(s.mortality) > 0 || Number(s.feed) > 0)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 8)
                    .map((s, i) => {
                      const samplingAdg = calculateSamplingAdg(pond, s, company?.timeZone);

                      return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)', transition: 'all 0.2s' }} className="hover-row">
                        <td style={{ padding: '16px 24px', fontSize: '0.88rem', fontWeight: 600 }}>
                          {new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '16px 24px', fontSize: '0.88rem', fontWeight: 600, color: 'var(--primary)' }}>{s.mbw || '-'}g</td>
                        <td style={{ padding: '16px 24px', fontSize: '0.88rem', fontWeight: 600 }}>{samplingAdg === null ? '—' : samplingAdg.toFixed(2)}</td>
                        <td style={{ padding: '16px 24px', fontSize: '0.88rem', fontWeight: 600 }}>{s.mbw > 0 ? Math.round(1000 / s.mbw) : '-'}</td>
                        <td style={{ padding: '16px 24px', fontSize: '0.88rem', fontWeight: 600 }}>{s.feed || '-'} kg</td>
                        <td style={{ padding: '16px 24px', fontSize: '0.88rem', fontWeight: 600, color: s.mortality > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                          {s.mortality > 0 ? `+${s.mortality}` : '0'}
                        </td>
                        {canRecordPondData && isActiveCycle(pond) && (
                          <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <button type="button" aria-label={copy.editSampling} onClick={() => {
                                setEditingSamplingId(s.id);
                                setSamplingForm({ date: s.date, mbw: String(s.mbw || ''), feed: String(s.feed || ''), mortality: String(s.mortality || 0) });
                                setSamplingModalOpen(true);
                              }} style={{ border: '1px solid var(--border)', background: '#FFF', borderRadius: '8px', padding: '7px', cursor: 'pointer', color: 'var(--primary)' }} disabled={savePending}><Pencil size={14} /></button>
                              <button type="button" aria-label={copy.deleteSampling} onClick={() => handleDeleteSampling(s.id)} style={{ border: '1px solid var(--border)', background: '#FFF', borderRadius: '8px', padding: '7px', cursor: 'pointer', color: '#ef4444' }} disabled={savePending}><Trash2 size={14} /></button>
                            </div>
                          </td>
                        )}
                      </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mortality History Table */}
          <div className="glass-card pond-detail-mortality-history" style={{ padding: '0', overflow: 'hidden', marginTop: '20px' }}>
            <div
              style={{
                padding: '18px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: isMortalityHistoryOpen ? '1px solid var(--border)' : 'none',
                cursor: 'pointer',
                userSelect: 'none',
              }}
              onClick={() => setMortalityHistoryOpen((prev) => !prev)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ fontSize: '18px', lineHeight: '26px', fontWeight: 600, margin: 0 }}>{copy.mortalityHistory}</h3>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: 'var(--bg-mid)',
                  color: 'var(--primary)',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  border: '1px solid var(--border)',
                }}>
                  {currentCycleMortalityRecords.length}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {canRecordPondData && isActiveCycle(pond) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingMortalityId(null);
                      setMortalityForm({
                        date: today,
                        observationType: 'observed_recovered',
                        count: '',
                        siponShift: 'morning',
                        siphonedCount: '',
                        mortalCount: '',
                        notes: '',
                      });
                      setMortalityModalOpen(true);
                    }}
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: 'var(--primary)',
                      background: 'var(--primary-dim)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }} disabled={savePending}
                  >
                    <Plus size={14} />
                    <span>{copy.recordMortality}</span>
                  </button>
                )}
                <button
                  type="button"
                  aria-label={isMortalityHistoryOpen ? copy.collapseMortalityHistory : copy.expandMortalityHistory}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px',
                  }} disabled={savePending}
                >
                  {isMortalityHistoryOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>
            </div>

            {isMortalityHistoryOpen && (
              currentCycleMortalityRecords.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 500 }}>
                  {copy.noMortalityRecords}
                </div>
              ) : (
                <div className="pond-detail-sampling-table-wrap">
                  <table className="pond-detail-sampling-table">
                    <thead>
                      <tr style={{ textAlign: 'left', background: 'var(--bg-mid)' }}>
                        <th style={{ height: '44px', padding: '0 24px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{copy.date}</th>
                        <th style={{ height: '44px', padding: '0 24px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{copy.recordType}</th>
                        <th style={{ height: '44px', padding: '0 24px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{copy.countPieces}</th>
                        <th style={{ height: '44px', padding: '0 24px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{copy.estimatedWeight}</th>
                        <th style={{ height: '44px', padding: '0 24px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{copy.notes}</th>
                        {canRecordPondData && isActiveCycle(pond) && (
                          <th style={{ height: '44px', padding: '0 24px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{copy.actions}</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {currentCycleMortalityRecords.map((record, i) => {
                        const isNone = record.observationType === 'none_observed';
                        const isObserved = record.observationType === 'observed_recovered';
                        const countNum = Number(record.count) || 0;
                        const mbw = Number(record.mbwAtRecord) || getSamplingMbwAtDate(record.date);
                        const weightKg = mbw > 0 && countNum > 0 ? (countNum * mbw) / 1000 : null;

                        const badgeStyle = isNone
                          ? { bg: '#DCFCE7', color: '#166534', label: copy.noneObserved }
                          : isObserved
                          ? { bg: '#E0F2FE', color: '#0F4C75', label: copy.observedRecovered }
                          : { bg: '#FEE2E2', color: '#991B1B', label: copy.estimatedTotal };

                        return (
                          <tr key={record.id || i} style={{ borderBottom: '1px solid var(--border)', transition: 'all 0.2s' }} className="hover-row">
                            <td style={{ padding: '16px 24px', fontSize: '0.88rem', fontWeight: 600 }}>
                              {record.date ? new Date(record.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                            </td>
                            <td style={{ padding: '16px 24px' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '4px 10px',
                                borderRadius: '999px',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                background: badgeStyle.bg,
                                color: badgeStyle.color,
                              }}>
                                {badgeStyle.label}
                              </span>
                            </td>
                            <td style={{ padding: '16px 24px', fontSize: '0.88rem', fontWeight: 600, color: countNum > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                              {isNone ? `0 ${copy.pieces}` : `${countNum.toLocaleString()} ${copy.pieces}`}
                            </td>
                            <td style={{ padding: '16px 24px', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {weightKg !== null && !isNone ? `${weightKg.toFixed(2)} kg` : '—'}
                            </td>
                            <td style={{ padding: '16px 24px', fontSize: '0.84rem', color: 'var(--text-muted)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {record.notes && !record.notes.toLowerCase().includes('projection testing') ? record.notes : '—'}
                            </td>
                            {canRecordPondData && isActiveCycle(pond) && (
                              <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <button
                                    type="button"
                                    aria-label={copy.editMortality}
                                    onClick={() => {
                                      setEditingMortalityId(record.id || null);
                                      setMortalityForm({
                                        date: record.date || today,
                                        observationType: record.observationType || 'estimated_total',
                                        count: record.observationType === 'none_observed' ? '0' : String(record.count || '0'),
                                        siponShift: record.siponShift || 'morning',
                                        siphonedCount: String(record.siphonedCount || ''),
                                        mortalCount: String(record.mortalCount || ''),
                                        notes: record.notes || '',
                                      });
                                      setMortalityModalOpen(true);
                                    }}
                                    style={{ border: '1px solid var(--border)', background: '#FFF', borderRadius: '8px', padding: '7px', cursor: 'pointer', color: 'var(--primary)' }} disabled={savePending}
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    aria-label={copy.deleteMortality}
                                    onClick={() => handleDeleteMortality(record.id || '')}
                                    style={{ border: '1px solid var(--border)', background: '#FFF', borderRadius: '8px', padding: '7px', cursor: 'pointer', color: '#ef4444' }} disabled={savePending}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>

        </div>

        {/* Right Sidebar */}
        <div className="animate-fade-up animate-delay-3 pond-detail-side-column">
          <PlanktonOverwatchCard snapshot={pond.latestPlanktonOverwatch} />

          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <FlaskConical size={18} />
                </div>
                <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{copy.latestLabStatus}</h4>
              </div>
            </div>
            {labStatusCards.length === 0 ? (
              <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.45 }}>
                {copy.noLabWarning}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {labStatusCards.map((item) => {
                  const statusStyle = getLabStatusStyle(item.status?.status, copy);
                  const Icon = item.Icon;
                  return (
                    <div key={item.key} style={{ padding: '14px', borderRadius: '14px', background: 'var(--bg-mid)', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <Icon size={16} color="var(--primary)" />
                          <span style={{ color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 600 }}>{item.title}</span>
                        </div>
                        <span style={{ borderRadius: 999, padding: '5px 9px', background: statusStyle.bg, color: statusStyle.color, fontSize: '0.66rem', fontWeight: 600, flexShrink: 0 }}>
                          {statusStyle.label}
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-primary)', fontSize: '0.86rem', fontWeight: 600, lineHeight: 1.45 }}>
                        {item.status?.mainIssue || copy.noLabWarning}
                      </p>
                      {item.status?.sampleDate && (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: 600, marginTop: '6px' }}>
                          {copy.lastLab}: {new Date(item.status.sampleDate).toLocaleDateString()}
                        </p>
                      )}
                      {item.status?.keyRisks && item.status.keyRisks.length > 0 && (
                        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          {item.status.keyRisks.slice(0, 2).map((risk, index) => (
                            <span key={`${item.key}-${risk}-${index}`} style={{ color: 'var(--text-muted)', fontSize: '0.76rem', fontWeight: 600 }}>• {risk}</span>
                          ))}
                        </div>
                      )}
                      {item.status?.recommendations?.[0] && (
                        <div style={{ marginTop: '12px', padding: '10px', borderRadius: '10px', background: '#ffffff', border: '1px solid var(--border)' }}>
                          <div style={{ color: 'var(--text-faint)', fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>{copy.recommendedAction}</div>
                          <div style={{ color: 'var(--text-primary)', fontSize: '0.78rem', fontWeight: 600, lineHeight: 1.45 }}>{item.status.recommendations[0]}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <Info size={18} />
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{copy.detailedMetrics}</h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Biological Specs */}
              <div>
                <h5 style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-faint)', letterSpacing: '0.08em', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>{copy.biologicalAndFeed}</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { label: copy.currentPopulation, value: `${metrics?.population.toLocaleString()} ${copy.pieces}`, icon: Users },
                    { label: copy.todaysMortality, value: `${metrics?.todayMortality.toLocaleString()} ${copy.pieces}`, icon: Activity },
                    { label: copy.totalMortality, value: `${metrics?.totalMortality.toLocaleString()} ${copy.pieces}`, icon: Activity },
                    { label: copy.totalMortalityWeight, value: `${metrics?.totalMortalityWeight.toFixed(2)} kg`, icon: Wind },
                    { label: copy.totalFeedUsed, value: `${metrics?.totalFeed.toFixed(1)} kg`, icon: ShoppingBag },
                    { label: copy.fcrEstimated, value: metrics?.fcr.toFixed(2), icon: Target },
                    { label: copy.currentSize, value: `${metrics?.size} ${copy.pieces}/kg`, icon: Scale },
                  ].map((spec, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <spec.icon size={14} style={{ opacity: 0.5 }} /> {spec.label}
                      </span>
                      <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pond Specifications */}
              <div>
                <h5 style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-faint)', letterSpacing: '0.08em', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>{copy.pondSpecifications}</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { label: copy.totalArea, value: `${pond.pondArea} m²`, icon: Layers },
                    { label: copy.targetDensity, value: `${pond.density} PL/m²`, icon: Database },
                    { label: copy.plSupplier, value: getPlSupplier(pond), icon: Target },
                    { label: copy.initialWeight, value: `${pond.initialWeight} g`, icon: Wind },
                  ].map((spec, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <spec.icon size={14} style={{ opacity: 0.5 }} /> {spec.label}
                      </span>
                      <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          <div className="pond-detail-delete-action">
            <p>{copy.deleteDescription}</p>
            <button
              type="button"
              onClick={handleDeletePond}
              disabled={savePending || (!canManagePond || isDeletingPond)}
            >
              {isDeletingPond ? copy.deleting : copy.deletePond}
            </button>
          </div>
        </div>

      </div>

      {isEndCycleOpen && (
        <div className="responsive-modal-overlay feed-log-overlay pond-detail-form-modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(10px)' }}>
          <div className="glass-card responsive-modal feed-log-modal pond-detail-form-modal">
            <div className="responsive-modal-header feed-log-header pond-detail-form-modal-header">
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 600 }}>{copy.endCycle}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>{copy.historyRemains.replace('{{pond}}', pond.pondName)}</p>
              </div>
              <button onClick={() => setEndCycleOpen(false)} className="feed-modal-close" aria-label={copy.cancel} disabled={savePending}>
                <X size={20} />
              </button>
            </div>
            <div className="responsive-modal-body feed-log-form pond-detail-form-modal-form">
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {copy.endDate}
                <input type="date" value={endCycleForm.cycleEndedAt} onChange={e => setEndCycleForm(prev => ({ ...prev, cycleEndedAt: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {copy.reason}
                <select value={endCycleForm.cycleEndReason} onChange={e => setEndCycleForm(prev => ({ ...prev, cycleEndReason: e.target.value as typeof endCycleForm.cycleEndReason }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }}>
                  <option value="harvested">{copy.harvested}</option>
                  <option value="disease">{copy.disease}</option>
                  <option value="reset">{copy.reset}</option>
                  <option value="other">{copy.other}</option>
                </select>
              </label>
              <div className="responsive-modal-footer feed-log-footer pond-detail-form-actions">
                <button type="button" onClick={() => setEndCycleOpen(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', fontWeight: 600, cursor: 'pointer' }} disabled={savePending}>{copy.cancel}</button>
                <button type="button" onClick={handleEndCycle} className="dashboard-action dashboard-action-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={savePending}>{copy.endCycle}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isBaselineModalOpen && (
        <div className="responsive-modal-overlay feed-log-overlay pond-detail-form-modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(10px)' }}>
          <div className="glass-card responsive-modal feed-log-modal pond-detail-form-modal">
            <div className="responsive-modal-header feed-log-header pond-detail-form-modal-header">
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 600 }}>{copy.editBaseline}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>{copy.baselineDescription}</p>
              </div>
              <button onClick={() => setBaselineModalOpen(false)} className="feed-modal-close" aria-label={copy.cancel} disabled={savePending}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateBaseline} className="responsive-modal-body feed-log-form pond-detail-form-modal-form pond-detail-form-grid"><fieldset disabled={savePending} style={{ display: 'contents' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {copy.baselineDate}
                <input required type="date" value={baselineForm.baselineDate} onChange={e => setBaselineForm(prev => ({ ...prev, baselineDate: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {copy.currentMbw}
                <input required type="number" step="0.01" value={baselineForm.baselineMbw} onChange={e => setBaselineForm(prev => ({ ...prev, baselineMbw: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {copy.currentPopulation}
                <input type="number" value={baselineForm.baselineEstimatedPopulation} onChange={e => setBaselineForm(prev => ({ ...prev, baselineEstimatedPopulation: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {copy.currentSr}
                <input type="number" step="0.1" value={baselineForm.baselineSurvivalRate} onChange={e => setBaselineForm(prev => ({ ...prev, baselineSurvivalRate: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {copy.feedUsedSoFar}
                <input type="number" step="0.01" value={baselineForm.baselineCumulativeFeed} onChange={e => setBaselineForm(prev => ({ ...prev, baselineCumulativeFeed: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
              </label>
              <div className="responsive-modal-footer feed-log-footer pond-detail-form-actions" style={{ gridColumn: '1 / -1' }}>
                <button type="button" onClick={() => setBaselineModalOpen(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', fontWeight: 600, cursor: 'pointer' }} disabled={savePending}>{copy.cancel}</button>
                <button type="submit" className="dashboard-action dashboard-action-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={savePending}>{copy.saveBaseline}</button>
              </div>
            </fieldset></form>
          </div>
        </div>
      )}

      {isStartCycleOpen && (
        <div className="responsive-modal-overlay feed-log-overlay pond-detail-form-modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(10px)' }}>
          <div className="glass-card responsive-modal feed-log-modal pond-detail-form-modal">
            <div className="responsive-modal-header feed-log-header pond-detail-form-modal-header">
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 600 }}>{copy.startNewCycle}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>{copy.startCycleDescription.replace('{{pond}}', pond.pondName).replace('{{area}}', String(pond.pondArea))}</p>
              </div>
              <button onClick={() => setStartCycleOpen(false)} className="feed-modal-close" aria-label={copy.cancel} disabled={savePending}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleStartCycle} className="responsive-modal-body feed-log-form pond-detail-form-modal-form pond-detail-form-grid"><fieldset disabled={savePending} style={{ display: 'contents' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {copy.density}
                <input required type="number" value={startCycleForm.density} onChange={e => setStartCycleForm(prev => ({ ...prev, density: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {copy.stockingDate}
                <input required type="date" value={startCycleForm.docStart} onChange={e => setStartCycleForm(prev => ({ ...prev, docStart: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {copy.plValue}
                <input required type="number" step="0.1" value={startCycleForm.plValue} onChange={e => setStartCycleForm(prev => ({ ...prev, plValue: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {copy.plSupplier}
                <input required value={startCycleForm.plSupplier} onChange={e => setStartCycleForm(prev => ({ ...prev, plSupplier: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
              </label>
              <div className="responsive-modal-footer feed-log-footer pond-detail-form-actions" style={{ gridColumn: '1 / -1' }}>
                <button type="button" onClick={() => setStartCycleOpen(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', fontWeight: 600, cursor: 'pointer' }} disabled={savePending}>{copy.cancel}</button>
                <button type="submit" className="dashboard-action dashboard-action-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={savePending}>{copy.startCycle}</button>
              </div>
            </fieldset></form>
          </div>
        </div>
      )}

      <SamplingModal
        isOpen={isSamplingModalOpen}
        onClose={() => {
          if (save.busy) return;
          setSamplingModalOpen(false);
          setEditingSamplingId(null);
        }}
        onSubmit={handleSaveSampling}
        form={samplingForm}
        setForm={setSamplingForm}
        isSubmitting={isSubmitting}
        isEditing={Boolean(editingSamplingId)}
      />
      <MortalityModal
        isOpen={isMortalityModalOpen}
        onClose={() => {
          if (save.busy) return;
          setMortalityModalOpen(false);
          setEditingMortalityId(null);
        }}
        onSubmit={handleSaveMortality}
        form={mortalityForm}
        setForm={setMortalityForm}
        isSubmitting={isSubmitting}
        isEditing={Boolean(editingMortalityId)}
      />

      <style jsx>{`
        .hover-row:hover {
          background: var(--primary-dim) !important;
        }
        .action-button-modern {
          width: 100%;
          padding: 14px 10px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: var(--bg-mid);
          color: var(--text-primary);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }
        .action-button-modern:hover {
          transform: translateY(-4px);
          border-color: var(--primary);
          box-shadow: var(--shadow-card);
          background: #FFF;
        }
        .action-button-modern .icon-box {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .action-button-modern span {
          font-size: 0.68rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        @media (max-width: 420px) {
          .pond-detail-record-popover {
            position: absolute;
            top: calc(100% + 8px);
            right: 0;
            bottom: auto;
            left: auto;
            width: min(238px, calc(100vw - 24px));
          }
        }
      `}</style>
    </div>
  );
}

type SamplingForm = { date: string; mbw: string; feed: string; mortality: string };
function SamplingModal({ isOpen, onClose, onSubmit, form, setForm, isSubmitting, isEditing }: {
  isOpen: boolean; onClose: () => void; onSubmit: (event: React.FormEvent) => void;
  form: SamplingForm; setForm: React.Dispatch<React.SetStateAction<SamplingForm>>; isSubmitting: boolean; isEditing: boolean;
}) {
  const { t } = useLanguage();
  const copy = t.pondDetail;

  if (!isOpen) return null;

  return (
    <div className="responsive-modal-overlay feed-log-overlay pond-detail-form-modal-overlay" style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)', padding: '24px'
    }}>
      <div className="glass-card animate-fade-up responsive-modal feed-log-modal pond-detail-form-modal" style={{ width: '100%', maxWidth: '520px', background: '#FFF', overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.2)' }}>
        <div className="responsive-modal-header feed-log-header pond-detail-form-modal-header" style={{ padding: '32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{isEditing ? copy.editSamplingTitle : copy.newSampling}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>{copy.samplingModalDescription}</p>
          </div>
          <button
            onClick={onClose}
            className="feed-modal-close"
            aria-label={copy.cancel} disabled={isSubmitting}
          >
            <X size={24} />
          </button>
        </div>

        <form className="responsive-modal-body feed-log-form pond-detail-form-modal-form" onSubmit={onSubmit} style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}><fieldset disabled={isSubmitting} style={{ display: 'contents' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{copy.samplingDate}</label>
            <input
              type="date"
              required
              value={form.date}
              onChange={e => setForm({...form, date: e.target.value})}
              style={{
                padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border)',
                background: 'var(--bg-mid)', outline: 'none', fontSize: '1rem', fontWeight: 600
              }}
            />
          </div>

          <div className="responsive-form-grid feed-log-grid pond-detail-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{copy.mbwGrams}</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={form.mbw}
                onChange={e => setForm({...form, mbw: e.target.value})}
                style={{
                  padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border)',
                  background: 'var(--bg-mid)', outline: 'none', fontSize: '1rem', fontWeight: 600
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{copy.feedKg}</label>
              <input
                type="number"
                step="0.1"
                placeholder="0.0"
                value={form.feed}
                onChange={e => setForm({...form, feed: e.target.value})}
                style={{
                  padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border)',
                  background: 'var(--bg-mid)', outline: 'none', fontSize: '1rem', fontWeight: 600
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{copy.mortalityPieces}</label>
            <input
              type="number"
              placeholder="0"
              value={form.mortality}
              onChange={e => setForm({...form, mortality: e.target.value})}
              style={{
                padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border)',
                background: 'var(--bg-mid)', outline: 'none', fontSize: '1rem', fontWeight: 600
              }}
            />
          </div>

          <div className="feed-log-footer pond-detail-form-actions" style={{ marginTop: '12px', display: 'flex', gap: '16px' }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '16px', borderRadius: '14px', border: '1px solid var(--border)',
              background: 'transparent', fontWeight: 600, cursor: 'pointer'
            }} disabled={isSubmitting}>{copy.cancel}</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ flex: 1, padding: '16px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : isEditing ? copy.updateRecord : copy.saveRecord}
            </button>
          </div>
        </fieldset></form>
      </div>
    </div>
  );
}

interface MortalityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  form: MortalityFormState;
  setForm: React.Dispatch<React.SetStateAction<MortalityFormState>>;
  isSubmitting: boolean;
  isEditing?: boolean;
}

function MortalityModal({ isOpen, onClose, onSubmit, form, setForm, isSubmitting, isEditing }: MortalityModalProps) {
  const { t } = useLanguage();
  const copy = t.pondDetail;

  if (!isOpen) return null;

  return (
    <div className="responsive-modal-overlay feed-log-overlay pond-detail-form-modal-overlay" style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)', padding: '24px'
    }}>
      <div className="glass-card animate-fade-up responsive-modal feed-log-modal pond-detail-form-modal" style={{ width: '100%', maxWidth: '520px', background: '#FFF', overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.2)' }}>
        <div className="responsive-modal-header feed-log-header pond-detail-form-modal-header" style={{ padding: '32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{isEditing ? copy.editMortalityTitle : copy.dailyMortality}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>{copy.mortalityModalDescription}</p>
          </div>
          <button onClick={onClose} className="feed-modal-close" aria-label={copy.cancel} disabled={isSubmitting}>
            <X size={24} />
          </button>
        </div>

        <form className="responsive-modal-body feed-log-form pond-detail-form-modal-form" onSubmit={onSubmit} style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}><fieldset disabled={isSubmitting} style={{ display: 'contents' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {copy.recordType}
            <select value={form.observationType} onChange={(event) => setForm({ ...form, observationType: event.target.value as MortalityObservationType })} style={{ padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontSize: '1rem', fontWeight: 600 }}>
              <option value="estimated_total">{copy.estimatedTotalOption}</option>
              <option value="observed_recovered">{copy.observedRecoveredOption}</option>
              <option value="none_observed">{copy.noneObservedOption}</option>
            </select>
          </label>

          {form.observationType === 'estimated_total' ? (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {copy.mortalityCount}
              <input required type="number" min="1" step="1" value={form.count} onChange={(event) => setForm({ ...form, count: event.target.value })} placeholder="0" style={{ padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontSize: '1rem', fontWeight: 600 }} />
            </label>
          ) : null}

          {form.observationType === 'observed_recovered' ? <>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t.dailyOperationsReports.siponShift}
              <select value={form.siponShift} onChange={(event) => setForm({ ...form, siponShift: event.target.value as 'morning' | 'evening' })} style={{ padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontSize: '1rem', fontWeight: 600 }}>
                <option value="morning">{t.dailyOperationsReports.morning}</option>
                <option value="evening">{t.dailyOperationsReports.evening}</option>
              </select>
            </label>
            <div className="responsive-form-grid feed-log-grid pond-detail-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t.dailyOperationsReports.siphoned}
                <input required type="number" min="0" step="1" value={form.siphonedCount} onChange={(event) => setForm({ ...form, siphonedCount: event.target.value })} placeholder="0" style={{ padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontSize: '1rem', fontWeight: 600 }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t.dailyOperationsReports.mortal}
                <input required type="number" min="0" step="1" value={form.mortalCount} onChange={(event) => setForm({ ...form, mortalCount: event.target.value })} placeholder="0" style={{ padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontSize: '1rem', fontWeight: 600 }} />
              </label>
            </div>
          </> : null}

          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {copy.mortalityDate}
            <input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} style={{ padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontSize: '1rem', fontWeight: 600 }} />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {copy.notesOptional}
            <textarea maxLength={500} rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder={copy.notesPlaceholder} style={{ padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontSize: '1rem', fontWeight: 600, resize: 'vertical' }} />
          </label>

          <div className="feed-log-footer pond-detail-form-actions" style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '16px', borderRadius: '14px', border: '1px solid var(--border)', background: 'transparent', fontWeight: 600, cursor: 'pointer' }} disabled={isSubmitting}>{copy.cancel}</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ flex: 1, padding: '16px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : isEditing ? copy.updateRecord : copy.saveMortality}
            </button>
          </div>
        </fieldset></form>
      </div>
    </div>
  );
}
