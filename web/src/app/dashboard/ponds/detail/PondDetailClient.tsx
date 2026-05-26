"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Waves,
  Scale,
  TrendingUp,
  Activity,
  Wind,
  Droplets,
  Thermometer,
  Calendar,
  Settings,
  Plus,
  Archive,
  RotateCcw,
  X,
  Loader2,
  Trash2,
  ChevronRight,
  Info,
  LineChart as LineChartIcon,
  ShoppingBag,
  Users,
  Target,
  Database,
  Layers
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import {
  doc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  query,
  collection,
  orderBy,
  serverTimestamp,
  runTransaction,
  arrayUnion,
  Timestamp,
  addDoc,
  getDocs,
  where
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

/* ─── Types ─────────────────────────────────────────────────── */
interface FeedData {
  ancoPercentage: string;
  totalDailyFeed: string | number;
  inventoryFeedId?: string | null;
  cycleId?: string;
  cycleName?: string;
  pondCycleId?: string;
  anco1?: string; anco2?: string; anco3?: string; anco4?: string;
}

interface Sampling {
  id: string;
  date: string;
  mbw: number;
  mortality: number;
  feed: number;
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

interface Pond {
  id: string; pondName: string; pondArea: number; density: number; initialPopulation: number;
  docStart: string; supplier: string; plSupplier?: string; initialWeight: number; samplings: Sampling[];
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

const getCycleStatus = (pond: Pond) => pond.cycleStatus === 'ended' ? 'ended' : 'active';
const isActiveCycle = (pond: Pond) => getCycleStatus(pond) === 'active';
const getPlSupplier = (pond: Pond) => pond.plSupplier || pond.supplier || 'N/A';
const isOpenFarmCycle = (cycle: FarmCycle) => ['planning', 'stocking', 'active'].includes(cycle.status);
const canEditOperations = (role?: string) => role === 'owner' || role === 'co-owner' || role === 'technician';
const DAY_MS = 24 * 60 * 60 * 1000;

const getDateOnlyUtcTime = (dateString: string): number => {
  const [year, month, day] = dateString.split('-').map(Number);
  return Date.UTC(year, (month || 1) - 1, day || 1);
};

const calculateDocFromDates = (startDate: string, baselineDate: string): number =>
  Math.floor((getDateOnlyUtcTime(baselineDate) - getDateOnlyUtcTime(startDate)) / DAY_MS);

const toFiniteNumber = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isBaselineSampling = (sampling: Pick<Sampling, 'isBaselineEstimate' | 'source'>): boolean =>
  Boolean(sampling.isBaselineEstimate) || sampling.source === 'midcycle_onboarding';

const getSamplingFeedAmount = (sampling: Pick<Sampling, 'feed' | 'feedData'>): number => {
  const samplingFeed = toFiniteNumber(sampling.feed);
  if (samplingFeed > 0) return samplingFeed;
  return toFiniteNumber(sampling.feedData?.totalDailyFeed);
};

const getPondCurrentDoc = (pond: Pick<Pond, 'docStart' | 'baselineDate' | 'baselineDoc'>): number => {
  const docFromStart = Math.floor((Date.now() - new Date(pond.docStart).getTime()) / (1000 * 60 * 60 * 24));
  const baselineDoc = toFiniteNumber(pond.baselineDoc);
  const baselineDate = pond.baselineDate ? new Date(pond.baselineDate) : null;
  if (baselineDoc > 0 && baselineDate && !Number.isNaN(baselineDate.getTime())) {
    const daysSinceBaseline = Math.floor((Date.now() - baselineDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, baselineDoc + Math.max(0, daysSinceBaseline));
  }
  return Math.max(0, Number.isFinite(docFromStart) ? docFromStart : 0);
};

const getPondBaselineFeed = (pond: Pick<Pond, 'baselineCumulativeFeed' | 'samplings'>): number => {
  const pondLevelFeed = toFiniteNumber(pond.baselineCumulativeFeed);
  if (pondLevelFeed > 0) return pondLevelFeed;

  return (pond.samplings || [])
    .filter(isBaselineSampling)
    .reduce((maxFeed, sampling) => Math.max(maxFeed, toFiniteNumber(sampling.cumulativeFeedToDate) || getSamplingFeedAmount(sampling)), 0);
};

const getPondOperationalFeed = (pond: Pick<Pond, 'samplings'>): number => {
  const operationalSamplings = (pond.samplings || []).filter((sampling) => !isBaselineSampling(sampling));
  const feedManagementFeed = operationalSamplings
    .filter((sampling) => sampling.feedData)
    .reduce((total, sampling) => total + getSamplingFeedAmount(sampling), 0);
  const samplingFeed = operationalSamplings
    .filter((sampling) => Number(sampling.mbw) > 0 || Number(sampling.mortality) > 0 || Number(sampling.feed) > 0)
    .reduce((total, sampling) => total + toFiniteNumber(sampling.feed), 0);

  return feedManagementFeed > 0 ? feedManagementFeed : samplingFeed;
};

const getPondTotalFeedConsumed = (pond: Pick<Pond, 'baselineCumulativeFeed' | 'samplings'>): number =>
  getPondBaselineFeed(pond) + getPondOperationalFeed(pond);

const getPondBaselinePopulation = (pond: Pick<Pond, 'initialPopulation' | 'baselineEstimatedPopulation' | 'baselineSurvivalRate' | 'samplings'>): number | null => {
  const estimatedPopulation = toFiniteNumber(pond.baselineEstimatedPopulation);
  if (estimatedPopulation > 0) return estimatedPopulation;

  const survivalRate = toFiniteNumber(pond.baselineSurvivalRate);
  if (survivalRate > 0 && pond.initialPopulation > 0) return Math.round((pond.initialPopulation * survivalRate) / 100);

  const baselineSampling = (pond.samplings || []).find(isBaselineSampling);
  const samplingPopulation = toFiniteNumber(baselineSampling?.estimatedPopulation);
  if (samplingPopulation > 0) return samplingPopulation;

  const samplingSurvival = toFiniteNumber(baselineSampling?.estimatedSurvivalRate);
  if (samplingSurvival > 0 && pond.initialPopulation > 0) return Math.round((pond.initialPopulation * samplingSurvival) / 100);

  return null;
};

/* ─── Custom SVG Chart ─────────────────────────────────────── */
const GrowthChart = ({ data }: { data: { x: number, y: number }[] }) => {
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);

  if (!data || data.length < 2) {
    return (
      <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontSize: '13px', background: 'var(--bg-mid)', borderRadius: '16px' }}>
        Not enough sampling data to generate growth trends.
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
        <text x={padding} y={height - 10} fontSize="10" fill="var(--text-faint)" fontWeight="700">DOC {minX}</text>
        <text x={width - padding} y={height - 10} textAnchor="end" fontSize="10" fill="var(--text-faint)" fontWeight="700">DOC {maxX}</text>
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
          <div style={{ fontWeight: 800, marginBottom: '2px' }}>DOC {hoveredPoint.x}</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>MBW: <span style={{ color: '#FFF', fontWeight: 700 }}>{hoveredPoint.y}g</span></div>
          <div style={{ position: 'absolute', bottom: '-4px', left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: '8px', height: '8px', background: 'rgba(15, 23, 42, 0.9)' }} />
        </div>
      )}
    </div>
  );
};

export default function PondDetailClient() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const router = useRouter();
  const [pond, setPond] = useState<Pond | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | undefined>();
  const [cycles, setCycles] = useState<FarmCycle[]>([]);
  const [isSamplingModalOpen, setSamplingModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEndCycleOpen, setEndCycleOpen] = useState(false);
  const [endCycleForm, setEndCycleForm] = useState({
    cycleEndedAt: new Date().toISOString().split('T')[0],
    cycleEndReason: 'harvested' as 'harvested' | 'disease' | 'reset' | 'other',
  });
  const [isStartCycleOpen, setStartCycleOpen] = useState(false);
  const [startCycleForm, setStartCycleForm] = useState({
    density: '',
    docStart: new Date().toISOString().split('T')[0],
    plValue: '0.5',
    plSupplier: '',
  });
  const [isBaselineModalOpen, setBaselineModalOpen] = useState(false);
  const [baselineForm, setBaselineForm] = useState({
    baselineDate: new Date().toISOString().split('T')[0],
    baselineMbw: '',
    baselineEstimatedPopulation: '',
    baselineSurvivalRate: '',
    baselineCumulativeFeed: '',
  });
  const [samplingForm, setSamplingForm] = useState({
    date: new Date().toISOString().split('T')[0],
    mbw: '',
    feed: '',
    mortality: '0'
  });

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        onSnapshot(doc(db, 'users', firebaseUser.uid), (uDoc) => {
          const userData = uDoc.data();
          const cid = userData?.companyId;
          setUserRole(userData?.role);
          setCompanyId(cid);
          if (cid) {
            // Listen to Pond
            const unsubPond = onSnapshot(doc(db, 'companies', cid, 'ponds', id as string), (snapshot) => {
              if (snapshot.exists()) {
                setPond({ id: snapshot.id, ...snapshot.data() } as Pond);
              }
              setLoading(false);
            });

            const qCycles = query(collection(db, 'companies', cid, 'cycles'), orderBy('createdAt', 'asc'));
            const unsubCycles = onSnapshot(qCycles, (snapshot: any) => {
              setCycles(snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as FarmCycle)));
            });

            return () => {
              unsubPond();
              unsubCycles();
            };
          }
        });
      }
    });
    return () => unsubAuth();
  }, [id]);
  const canEditPond = canEditOperations(userRole);

  const handleAddSampling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !pond) return;
    if (!canEditPond) return;
    if (!isActiveCycle(pond)) {
      alert('Ended cycles are read-only. Start a new cycle before adding sampling data.');
      return;
    }
    setIsSubmitting(true);

    try {
      const pondRef = doc(db, 'companies', companyId, 'ponds', pond.id);
      const newSampling: any = {
        id: `s-${Date.now()}`,
        date: samplingForm.date,
        mbw: parseFloat(samplingForm.mbw) || 0,
        mortality: parseInt(samplingForm.mortality) || 0,
        feed: parseFloat(samplingForm.feed) || 0,
        pondCycleId: pond.pondCycleId || pond.id,
        ...(pond.cycleId ? { cycleId: pond.cycleId } : {}),
        ...(pond.cycleName ? { cycleName: pond.cycleName } : {}),
      };

      // 1. Update Pond
      await updateDoc(pondRef, {
        samplings: arrayUnion(newSampling),
        updatedAt: serverTimestamp()
      });

      setSamplingModalOpen(false);
      setSamplingForm({
        date: new Date().toISOString().split('T')[0],
        mbw: '',
        mortality: '0',
        feed: ''
      });
    } catch (error) {
      console.error("Error adding sampling:", error);
      alert("Failed to save sampling record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndCycle = async () => {
    if (!companyId || !pond) return;
    if (!canEditPond) return;
    try {
      await updateDoc(doc(db, 'companies', companyId, 'ponds', pond.id), {
        cycleStatus: 'ended',
        cycleEndedAt: endCycleForm.cycleEndedAt,
        cycleEndReason: endCycleForm.cycleEndReason,
        cycleEndedBy: auth.currentUser?.uid || '',
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid || '',
      });
      setEndCycleOpen(false);
    } catch (error) {
      console.error('Error ending cycle:', error);
      alert('Failed to end cycle.');
    }
  };

  const handleStartCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !pond) return;
    if (!canEditPond) return;
    try {
      const sameNamePonds = await getDocs(query(
        collection(db, 'companies', companyId, 'ponds'),
        where('pondName', '==', pond.pondName)
      ));
      const hasActiveCycleForPond = sameNamePonds.docs.some((pondDoc) =>
        pondDoc.id !== pond.id && pondDoc.data().cycleStatus !== 'ended'
      );

      if (hasActiveCycleForPond) {
        alert(`${pond.pondName} already has an active cycle. End that pond first before starting another cycle for it.`);
        return;
      }

      const initialPopulation = Number(pond.pondArea) * Number(startCycleForm.density);
      const initialWeight = parseFloat(startCycleForm.plValue) / 10;
      const activeCycle = cycles.find(isOpenFarmCycle);
      let cycleForPond = activeCycle;
      if (!cycleForPond) {
        const cycleName = `Cycle ${cycles.length + 1}`;
        const cycleRef = await addDoc(collection(db, 'companies', companyId, 'cycles'), {
          cycleName,
          status: 'stocking',
          plannedStartDate: startCycleForm.docStart,
          stockingStartDate: startCycleForm.docStart,
          createdAt: serverTimestamp(),
          createdBy: auth.currentUser?.uid || '',
          updatedAt: serverTimestamp(),
          updatedBy: auth.currentUser?.uid || '',
        });
        cycleForPond = { id: cycleRef.id, cycleName, status: 'stocking', plannedStartDate: startCycleForm.docStart, stockingStartDate: startCycleForm.docStart };
      }
      const newDoc = await addDoc(collection(db, 'companies', companyId, 'ponds'), {
        pondName: pond.pondName,
        pondArea: Number(pond.pondArea),
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
        cycleId: cycleForPond.id,
        cycleName: cycleForPond.cycleName,
        cycleStatus: 'active',
        cycleStartedAt: startCycleForm.docStart,
        previousCyclePondId: pond.id,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid || '',
      });
      setStartCycleOpen(false);
      router.push(`/dashboard/ponds/detail?id=${newDoc.id}`);
    } catch (error) {
      console.error('Error starting cycle:', error);
      alert('Failed to start new cycle.');
    }
  };

  const openBaselineModal = () => {
    if (!pond) return;
    if (!canEditPond) return;
    const baselineSampling = (pond.samplings || [])
      .filter(isBaselineSampling)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    setBaselineForm({
      baselineDate: pond.baselineDate || baselineSampling?.date || new Date().toISOString().split('T')[0],
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
    if (!canEditPond) return;

    const cycleStartDate = pond.docStart || pond.cycleStartedAt || baselineForm.baselineDate;
    const baselineDocValue = calculateDocFromDates(cycleStartDate, baselineForm.baselineDate);
    const baselineMbwValue = parseFloat(baselineForm.baselineMbw);
    const baselinePopulationValue = parseFloat(baselineForm.baselineEstimatedPopulation);
    const baselineSurvivalValue = parseFloat(baselineForm.baselineSurvivalRate);
    const baselineFeedValue = parseFloat(baselineForm.baselineCumulativeFeed);

    if (!baselineForm.baselineMbw || Number.isNaN(baselineMbwValue) || baselineMbwValue <= 0) {
      alert('Current MBW is required for an existing cycle.');
      return;
    }
    if (!baselineForm.baselineDate || !Number.isFinite(baselineDocValue) || baselineDocValue < 0) {
      alert('Current DOC is required for an existing cycle.');
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
      await updateDoc(doc(db, 'companies', companyId, 'ponds', pond.id), {
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
      });
      setBaselineModalOpen(false);
    } catch (error) {
      console.error('Error updating baseline:', error);
      alert('Failed to update baseline.');
    }
  };

  /* ─── Biological Projection Utility ────────────────────────── */
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

  const metrics = useMemo(() => {
    if (!pond) return null;
    const samplings = (pond.samplings || []).filter(s => Number(s.mbw) > 0 || Number(s.mortality) > 0 || Number(s.feed) > 0);
    const sorted = [...samplings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const latest = sorted[sorted.length - 1] || { mbw: 0, mortality: 0, feed: 0 };
    const latestValid = sorted.filter(s => {
      const feedVal = getSamplingFeedAmount(s);
      return !isBaselineSampling(s) && s.mbw > 0 && feedVal > 0;
    }).reverse()[0];

    const docStart = new Date(pond.docStart);
    const docDays = getPondCurrentDoc(pond);

    let population = pond.initialPopulation;
    const baselinePopulation = getPondBaselinePopulation(pond);
    if (baselinePopulation !== null) {
      const baselineTime = pond.baselineDate ? new Date(pond.baselineDate).getTime() : 0;
      const postBaselineMortality = sorted
        .filter(s => !isBaselineSampling(s) && (!baselineTime || new Date(s.date).getTime() >= baselineTime))
        .reduce((sum, s) => sum + (s.mortality || 0), 0);
      population = Math.max(0, baselinePopulation - postBaselineMortality);
    } else if (latestValid) {
      const fr = getFRFromMBW(latestValid.mbw);
      const feedVal = getSamplingFeedAmount(latestValid);
      if (fr && feedVal > 0) {
        population = Math.round(((feedVal / fr) / latestValid.mbw) * 100000);
      }
    } else {
      const totalMortality = sorted.filter(s => !isBaselineSampling(s)).reduce((sum, s) => sum + (s.mortality || 0), 0);
      population = Math.max(0, pond.initialPopulation - totalMortality);
    }

    const lastRecordedMBW = [...sorted].reverse().find(s => s.mbw > 0)?.mbw || pond.initialWeight || 0.5;
    const biomass = (population * lastRecordedMBW) / 1000;
    const sr = (population / pond.initialPopulation) * 100;

    const chartData = sorted
      .filter(s => s.mbw > 0)
      .map(s => ({
        x: Math.floor((new Date(s.date).getTime() - docStart.getTime()) / (1000 * 60 * 60 * 24)),
        y: s.mbw
      }));

    const adg = (() => {
      const validForADG = sorted.filter(s => !isBaselineSampling(s) && s.mbw > 0);
      if (!validForADG.length) return 0;

      const currentSampling = validForADG[validForADG.length - 1];
      const currentSamplingTime = new Date(currentSampling.date).getTime();
      const baselineSampling = sorted.filter(isBaselineSampling).reverse()[0];
      const baselineSamplingTime = baselineSampling ? new Date(baselineSampling.date).getTime() : Number.NaN;
      const validBaselineSampling = baselineSampling &&
        Number.isFinite(baselineSamplingTime) &&
        baselineSamplingTime < currentSamplingTime
        ? baselineSampling
        : undefined;
      const previousSampling = [...validForADG]
        .reverse()
        .find((sample) => new Date(sample.date).getTime() < currentSamplingTime) || validBaselineSampling;
      const previousWeight = previousSampling?.mbw ?? pond.initialWeight ?? 0.5;
      const previousDate = previousSampling?.date || pond.docStart;
      const days = (currentSamplingTime - new Date(previousDate).getTime()) / (1000 * 60 * 60 * 24);
      if (isNaN(currentSampling.mbw) || isNaN(previousWeight) || days <= 0) return 0;
      return (currentSampling.mbw - previousWeight) / days;
    })();

    const size = lastRecordedMBW > 0 ? Math.round(1000 / lastRecordedMBW) : 0;

    // Additional Comprehensive Metrics
    const totalMortality = sorted.reduce((sum, s) => sum + (s.mortality || 0), 0);
    const totalMortalityWeight = sorted.reduce((sum, s) => sum + ((s.mortality || 0) * (s.mbw || 0)) / 1000, 0);
    const totalFeed = getPondTotalFeedConsumed(pond);

    // FCR Calculation (Total Feed / Total Biomass Gain)
    const initialBiomass = (pond.initialPopulation * (pond.initialWeight || 0.5)) / 1000;
    const biomassGain = biomass - initialBiomass;
    const fcr = biomassGain > 0 ? totalFeed / biomassGain : 0;

    return {
      doc: docDays,
      population,
      biomass,
      sr,
      latest,
      chartData,
      adg,
      lastRecordedMBW,
      size,
      totalMortality,
      totalMortalityWeight,
      totalFeed,
      fcr
    };
  }, [pond]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><Loader2 className="animate-spin" size={40} color="var(--primary)" /></div>;
  if (!pond) return <div style={{ padding: '40px', textAlign: 'center' }}>Pond not found.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '36px', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Breadcrumbs & Actions */}
      <div className="glass-card animate-fade-up" style={{ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
          <Link href="/dashboard/ponds" style={{
            width: '42px', height: '42px', borderRadius: '12px', background: 'var(--glass-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)',
            border: '1px solid var(--border)', textDecoration: 'none', transition: 'all 0.2s',
            boxShadow: 'var(--shadow-card)'
          }} onMouseEnter={e => e.currentTarget.style.transform = 'translateX(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}>
            <ArrowLeft size={20} />
          </Link>
          <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {pond.pondName}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                  DOC {metrics?.doc ?? 0}
                </span>
                <span style={{
                  fontSize: '0.68rem',
                  color: getCycleStatus(pond) === 'ended' ? '#64748b' : 'var(--primary)',
                  background: getCycleStatus(pond) === 'ended' ? '#f1f5f9' : 'var(--primary-dim)',
                  border: '1px solid var(--border)',
                  borderRadius: '999px',
                  padding: '3px 8px',
                  fontWeight: 800,
                }}>
                  {getCycleStatus(pond) === 'ended' ? 'ENDED' : 'ACTIVE'}
                </span>
                {pond.cycleStartMode === 'midcycle' && (
                  <span style={{
                    fontSize: '0.68rem',
                    color: '#0F4C75',
                    background: '#BBE1FA',
                    borderRadius: '999px',
                    padding: '3px 8px',
                    fontWeight: 900,
                  }}>
                    MID-CYCLE BASELINE
                  </span>
                )}
              </div>
            </div>
          </div>
        {canEditPond && (
          <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
            {isActiveCycle(pond) ? (
              <button onClick={() => setEndCycleOpen(true)} className="dashboard-action dashboard-action-secondary" style={{ padding: '0 14px' }}>
                <Archive size={18} strokeWidth={2.5} />
                <span>End Cycle</span>
              </button>
            ) : (
              <button onClick={() => setStartCycleOpen(true)} className="dashboard-action dashboard-action-primary">
                <RotateCcw size={18} strokeWidth={2.5} />
                <span>Start New Cycle</span>
              </button>
            )}
            <button
              onClick={openBaselineModal}
              className="dashboard-action dashboard-action-secondary"
              disabled={pond.cycleStartMode !== 'midcycle' || !isActiveCycle(pond)}
              title="Edit baseline estimates"
              style={{ padding: '0 14px', opacity: pond.cycleStartMode === 'midcycle' && isActiveCycle(pond) ? 1 : 0.45, cursor: pond.cycleStartMode === 'midcycle' && isActiveCycle(pond) ? 'pointer' : 'not-allowed' }}
            >
              <Settings size={18} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => setSamplingModalOpen(true)}
              className="dashboard-action dashboard-action-primary"
              disabled={!isActiveCycle(pond)}
              style={{ opacity: isActiveCycle(pond) ? 1 : 0.45, cursor: isActiveCycle(pond) ? 'pointer' : 'not-allowed' }}
            >
              <Plus size={20} strokeWidth={3} />
              <span>New Sampling</span>
            </button>
          </div>
        )}
      </div>

      {/* Hero Stats */}
      <div className="animate-fade-up animate-delay-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '18px' }}>
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Age (DOC)</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <Calendar size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.55rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            {metrics?.doc} <span style={{ fontSize: '0.8rem', color: 'var(--text-faint)', fontWeight: 700 }}>DAYS</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Est. Biomass</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(22, 163, 74, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <Scale size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.55rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            {metrics?.biomass.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span style={{ fontSize: '0.8rem', color: 'var(--text-faint)', fontWeight: 700 }}>KG</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Avg Daily Growth</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(50, 130, 184, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.55rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            {metrics?.adg.toFixed(2)} <span style={{ fontSize: '0.8rem', color: 'var(--text-faint)', fontWeight: 700 }}>G/DAY</span>
          </div>
        </div>

        <div style={{ background: 'var(--gradient)', borderRadius: 'var(--radius-lg)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: 'var(--shadow-glow)', color: '#FFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>Survival Rate</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.55rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            {metrics?.sr.toFixed(1)}%
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '28px' }}>

        {/* Left Content */}
        <div className="animate-fade-up animate-delay-2" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

          {/* Growth Chart Section */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.08rem', fontWeight: 800, marginBottom: '4px' }}>Biological Growth Curve</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Mean Body Weight (MBW) trajectory over production cycle.</p>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px',
                background: 'var(--bg-mid)', borderRadius: '12px', fontSize: '0.75rem',
                fontWeight: 800, color: 'var(--primary)', border: '1px solid var(--border)'
              }}>
                <LineChartIcon size={16} />
                LIVE TRACKING
              </div>
            </div>
            <GrowthChart data={metrics?.chartData || []} />
          </div>

          {/* Sampling History Table */}
          <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '1.08rem', fontWeight: 800 }}>Sampling History</h3>
              <button style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', background: 'transparent', border: 'none', cursor: 'pointer' }}>View Audit Log</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', background: 'var(--bg-mid)' }}>
                    <th style={{ padding: '14px 24px', fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Date</th>
                    <th style={{ padding: '14px 24px', fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>MBW (g)</th>
                    <th style={{ padding: '14px 24px', fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Size (pcs/kg)</th>
                    <th style={{ padding: '14px 24px', fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Feed (kg)</th>
                    <th style={{ padding: '14px 24px', fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Mortality</th>
                  </tr>
                </thead>
                <tbody>
                  {(pond.samplings || [])
                    .filter((s: any) => Number(s.mbw) > 0 || Number(s.mortality) > 0 || Number(s.feed) > 0)
                    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 8)
                    .map((s: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)', transition: 'all 0.2s' }} className="hover-row">
                        <td style={{ padding: '16px 24px', fontSize: '0.88rem', fontWeight: 700 }}>
                          {new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '16px 24px', fontSize: '0.88rem', fontWeight: 800, color: 'var(--primary)' }}>{s.mbw || '-'}g</td>
                        <td style={{ padding: '16px 24px', fontSize: '0.88rem', fontWeight: 600 }}>{s.mbw > 0 ? Math.round(1000 / s.mbw) : '-'}</td>
                        <td style={{ padding: '16px 24px', fontSize: '0.88rem', fontWeight: 600 }}>{s.feed || '-'} kg</td>
                        <td style={{ padding: '16px 24px', fontSize: '0.88rem', fontWeight: 800, color: s.mortality > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                          {s.mortality > 0 ? `+${s.mortality}` : '0'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Sidebar */}
        <div className="animate-fade-up animate-delay-3" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <Info size={18} />
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 800 }}>Detailed Metrics</h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Biological Specs */}
              <div>
                <h5 style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-faint)', letterSpacing: '0.08em', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>Biological & Feed</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { label: 'Current Population', value: `${metrics?.population.toLocaleString()} pcs`, icon: Users },
                    { label: 'Total Mortality', value: `${metrics?.totalMortality.toLocaleString()} pcs`, icon: Activity },
                    { label: 'Total Mort. Weight', value: `${metrics?.totalMortalityWeight.toFixed(2)} kg`, icon: Wind },
                    { label: 'Total Feed Used', value: `${metrics?.totalFeed.toFixed(1)} kg`, icon: ShoppingBag },
                    { label: 'FCR (Est.)', value: metrics?.fcr.toFixed(2), icon: Target },
                    { label: 'Current Size', value: `${metrics?.size} pcs/kg`, icon: Scale },
                  ].map((spec, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <spec.icon size={14} style={{ opacity: 0.5 }} /> {spec.label}
                      </span>
                      <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)' }}>{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pond Specifications */}
              <div>
                <h5 style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-faint)', letterSpacing: '0.08em', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>Pond Specifications</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { label: 'Total Area', value: `${pond.pondArea} m²`, icon: Layers },
                    { label: 'Target Density', value: `${pond.density} PL/m²`, icon: Database },
                    { label: 'PL Supplier', value: getPlSupplier(pond), icon: Target },
                    { label: 'Initial Weight', value: `${pond.initialWeight} g`, icon: Wind },
                  ].map((spec, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <spec.icon size={14} style={{ opacity: 0.5 }} /> {spec.label}
                      </span>
                      <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)' }}>{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          <div className="glass-card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '18px' }}>Quick Actions</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Link href="/dashboard/water" style={{ textDecoration: 'none' }}>
                <button className="action-button-modern">
                  <div className="icon-box" style={{ background: 'rgba(50, 130, 184, 0.1)', color: 'var(--accent)' }}>
                    <Droplets size={20} />
                  </div>
                  <span>Water Quality</span>
                </button>
              </Link>
              <Link href="/dashboard/feed" style={{ textDecoration: 'none' }}>
                <button className="action-button-modern">
                  <div className="icon-box" style={{ background: 'rgba(5, 150, 105, 0.1)', color: '#059669' }}>
                    <ShoppingBag size={20} />
                  </div>
                  <span>Feed Logs</span>
                </button>
              </Link>
            </div>
          </div>

          <div style={{
            background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)',
            borderRadius: 'var(--radius-lg)', padding: '20px', color: '#ef4444'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <Trash2 size={20} />
              <span style={{ fontSize: '1rem', fontWeight: 800 }}>Danger Zone</span>
            </div>
            <p style={{ fontSize: '0.8rem', marginBottom: '24px', opacity: 0.8, lineHeight: 1.6 }}>
              Deleting this pond will permanently remove all associated sampling and water records from the Orson AI ecosystem.
            </p>
            <button className="btn-secondary" style={{ width: '100%', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)', background: 'transparent' }}>
              Delete Asset
            </button>
          </div>
        </div>

      </div>

      {isEndCycleOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '520px', background: '#FFFFFF', padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '28px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>End Cycle</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>{pond.pondName} history will remain available.</p>
              </div>
              <button onClick={() => setEndCycleOpen(false)} style={{ background: 'var(--bg-mid)', border: 'none', borderRadius: '12px', padding: '10px', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                End Date
                <input type="date" value={endCycleForm.cycleEndedAt} onChange={e => setEndCycleForm(prev => ({ ...prev, cycleEndedAt: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Reason
                <select value={endCycleForm.cycleEndReason} onChange={e => setEndCycleForm(prev => ({ ...prev, cycleEndReason: e.target.value as typeof endCycleForm.cycleEndReason }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }}>
                  <option value="harvested">Harvested</option>
                  <option value="disease">Disease</option>
                  <option value="reset">Reset</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <div style={{ display: 'flex', gap: '14px', marginTop: '8px' }}>
                <button type="button" onClick={() => setEndCycleOpen(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button type="button" onClick={handleEndCycle} className="dashboard-action dashboard-action-primary" style={{ flex: 1, justifyContent: 'center' }}>End Cycle</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isBaselineModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '620px', background: '#FFFFFF', padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '28px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Edit Baseline</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>Corrects baseline estimates only. This will not deduct inventory or create normal sampling history.</p>
              </div>
              <button onClick={() => setBaselineModalOpen(false)} style={{ background: 'var(--bg-mid)', border: 'none', borderRadius: '12px', padding: '10px', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateBaseline} style={{ padding: '28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Baseline Date
                <input required type="date" value={baselineForm.baselineDate} onChange={e => setBaselineForm(prev => ({ ...prev, baselineDate: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Current MBW (g)
                <input required type="number" step="0.01" value={baselineForm.baselineMbw} onChange={e => setBaselineForm(prev => ({ ...prev, baselineMbw: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Current Population
                <input type="number" value={baselineForm.baselineEstimatedPopulation} onChange={e => setBaselineForm(prev => ({ ...prev, baselineEstimatedPopulation: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Current SR %
                <input type="number" step="0.1" value={baselineForm.baselineSurvivalRate} onChange={e => setBaselineForm(prev => ({ ...prev, baselineSurvivalRate: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Feed Used So Far (kg)
                <input type="number" step="0.01" value={baselineForm.baselineCumulativeFeed} onChange={e => setBaselineForm(prev => ({ ...prev, baselineCumulativeFeed: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
              </label>
              <div style={{ gridColumn: 'span 2', display: 'flex', gap: '14px', marginTop: '8px' }}>
                <button type="button" onClick={() => setBaselineModalOpen(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" className="dashboard-action dashboard-action-primary" style={{ flex: 1, justifyContent: 'center' }}>Save Baseline</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isStartCycleOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '640px', background: '#FFFFFF', padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '28px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Start New Cycle</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>{pond.pondName} and {pond.pondArea} m² will be reused. Supplier is cycle-specific.</p>
              </div>
              <button onClick={() => setStartCycleOpen(false)} style={{ background: 'var(--bg-mid)', border: 'none', borderRadius: '12px', padding: '10px', cursor: 'pointer' }}>
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
                <button type="button" onClick={() => setStartCycleOpen(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" className="dashboard-action dashboard-action-primary" style={{ flex: 1, justifyContent: 'center' }}>Start Cycle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SamplingModal
        isOpen={isSamplingModalOpen}
        onClose={() => setSamplingModalOpen(false)}
        onSubmit={handleAddSampling}
        form={samplingForm}
        setForm={setSamplingForm}
        isSubmitting={isSubmitting}
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
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
      `}</style>
    </div>
  );
}

function SamplingModal({ isOpen, onClose, onSubmit, form, setForm, isSubmitting }: any) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)', padding: '24px'
    }}>
      <div className="glass-card animate-fade-up" style={{ width: '100%', maxWidth: '520px', background: '#FFF', overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>New Sampling</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>Log biological and feeding data.</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'var(--bg-mid)', border: 'none', borderRadius: '12px', padding: '10px', cursor: 'pointer' }}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={onSubmit} style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sampling Date</label>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MBW (grams)</label>
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
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Feed (kg)</label>
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
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mortality (pcs)</label>
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

          <div style={{ marginTop: '12px', display: 'flex', gap: '16px' }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '16px', borderRadius: '14px', border: '1px solid var(--border)',
              background: 'transparent', fontWeight: 700, cursor: 'pointer'
            }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ flex: 1, padding: '16px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : 'Save Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
