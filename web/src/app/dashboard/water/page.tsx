"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Droplets,
  Search,
  Activity,
  Thermometer,
  Wind,
  X,
  Loader2,
  Waves,
  History,
  Info,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  ChevronDown,
  ExternalLink,
  type LucideIcon
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, getDoc, addDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app, auth, db, storage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { getFarmDateKey } from '../../../../../shared/farmDate';
import { useFarmDateKey } from '@/hooks/useFarmDateKey';
import { EnterpriseGroupedPondGrid } from '@/components/EnterpriseDashboard';
import { useCompanyBlocks } from '@/hooks/useDashboardData';
import {
  filterEnterpriseRecordsForUser,
  getEnterprisePondStatus,
  isEnterpriseOwner,
  type FarmBlock,
} from '../../../../../shared/enterpriseBlocks';

/* --- Types --------------------------------------------------- */
interface Sampling {
  id: string; date: string; mbw: number; mortality: number; feed: number;
  cycleId?: string; cycleName?: string; pondCycleId?: string;
  isBaselineEstimate?: boolean; source?: string;
  feedData?: { totalDailyFeed?: number | string | null } | null; harvestData?: unknown;
  phMorning?: string; phEvening?: string; doMorning?: string; doEvening?: string;
  transparency?: string; salinity?: string;
}

interface Pond {
  id: string; pondName: string; supplier: string; samplings: Sampling[];
  blockId?: string;
  blockName?: string;
  latestLabStatus?: LabStatus;
  cycleId?: string; cycleName?: string; pondCycleId?: string;
  cycleStatus?: 'active' | 'ended';
  createdAt?: { toDate?: () => Date; seconds?: number };
  updatedAt?: { toDate?: () => Date; seconds?: number };
}

type WaterPageView = 'daily' | 'lab';
type LabReportType = 'water_quality' | 'plankton' | 'combined';
type LabSeverity = 'good' | 'watch' | 'warning' | 'critical';
type LabEntryMode = 'manual' | 'pdf_upload';
type LabPdfUsageType = 'water_quality' | 'plankton';

const getLabReportTypeLabel = (reportType?: LabReportType) => {
  if (reportType === 'plankton') return 'Plankton Quality';
  if (reportType === 'combined') return 'Combined Lab Report';
  return 'Mineral Quality';
};

interface LabStatus {
  labReportId?: string;
  sampleDate?: string;
  status?: LabSeverity;
  mainIssue?: string;
  keyRisks?: string[];
  recommendations?: string[];
  updatedAt?: { toDate?: () => Date; seconds?: number };
}

interface LabPondResult {
  pondId: string;
  pondCode: string;
  doc?: string;
  transparencyCm?: string;
  waterQuality?: {
    phCustomer?: string;
    phLab?: string;
    salinityCustomer?: string;
    salinityLab?: string;
    nh4?: string;
    no2?: string;
    alkalinityTotal?: string;
    tom?: string;
    hardnessCa?: string;
    hardnessMg?: string;
    hardnessTotal?: string;
  };
  microbiology?: {
    vibrioYellow?: string;
    vibrioGreen?: string;
    vibrioTotal?: string;
    tbc?: string;
    tvcTbcRatioPercent?: string;
  };
  plankton?: {
    totalCellPerMl?: string;
    beneficialCellPerMl?: string;
    harmfulCellPerMl?: string;
    chlorophytaCellPerMl?: string;
    chlorophytaPercent?: string;
    chlorophytaSpecies?: string;
    cyanophytaCellPerMl?: string;
    cyanophytaPercent?: string;
    cyanophytaSpecies?: string;
    diatomCellPerMl?: string;
    diatomPercent?: string;
    diatomSpecies?: string;
    chrysophytaCellPerMl?: string;
    chrysophytaPercent?: string;
    chrysophytaSpecies?: string;
    dinoflagellataCellPerMl?: string;
    dinoflagellataPercent?: string;
    dinoflagellataSpecies?: string;
    protozoaCellPerMl?: string;
    protozoaPercent?: string;
    protozoaSpecies?: string;
  };
}

interface LabReport {
  id: string;
  reportType?: LabReportType;
  entryMode?: LabEntryMode;
  status?: 'draft' | 'extracted' | 'confirmed' | 'failed';
  sampleDate?: string;
  labName?: string;
  farmName?: string;
  sourcePdfUrl?: string;
  sourcePdfPath?: string;
  originalFileName?: string;
  sourceFileHash?: string;
  pondResults?: LabPondResult[];
  extraction?: {
    status?: 'not_required' | 'pending' | 'complete' | 'failed';
    model?: string;
    sourceHash?: string;
    confidence?: number;
    warnings?: string[];
    error?: string;
    extractedAt?: { toDate?: () => Date; seconds?: number };
  };
  processing?: {
    status?: 'pending' | 'complete' | 'failed';
    processedAt?: { toDate?: () => Date; seconds?: number };
    error?: string;
  };
  summary?: {
    overallStatus?: LabSeverity;
    warningCount?: number;
    criticalCount?: number;
  };
  insights?: {
    status?: 'pending' | 'complete' | 'failed';
    ownerSummary?: string;
    generatedBy?: string;
  };
  createdAt?: { toDate?: () => Date; seconds?: number };
}

type LabPdfUsage = Partial<Record<LabPdfUsageType, {
  status?: 'idle' | 'pending' | 'cooldown';
  resetAt?: unknown;
  startedAt?: unknown;
}>>;

const LAB_PDF_PENDING_MS = 10 * 60 * 1000;

interface DashboardUser {
  uid: string;
  role?: string;
  companyId?: string;
  [key: string]: unknown;
}

const isBaselineSampling = (sampling: Pick<Sampling, 'isBaselineEstimate' | 'source'>): boolean =>
  Boolean(sampling.isBaselineEstimate) || sampling.source === 'midcycle_onboarding';
const canEditOperations = (role?: string) => role === 'owner' || role === 'co-owner' || role === 'technician';

export default function WaterQualityPage() {
  const { company } = useAuth();
  const today = useFarmDateKey(company?.timeZone);
  const [activeView, setActiveView] = useState<WaterPageView>('daily');
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [labReports, setLabReports] = useState<LabReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [labPdfUsage, setLabPdfUsage] = useState<LabPdfUsage>({});
  const [labUsageNowMs, setLabUsageNowMs] = useState(() => Date.now());

  const [isModalOpen, setModalOpen] = useState(false);
  const [isLabModalOpen, setLabModalOpen] = useState(false);
  const [isLabActionModalOpen, setLabActionModalOpen] = useState(false);
  const [labSubmitting, setLabSubmitting] = useState(false);
  const [labEntryMode, setLabEntryMode] = useState<LabEntryMode>('manual');
  const [editingLabReportId, setEditingLabReportId] = useState<string | null>(null);
  const [labPdfFile, setLabPdfFile] = useState<File | null>(null);
  const [selectedPondForHistory, setSelectedPondForHistory] = useState<Pond | null>(null);
  const [expandedLabReportId, setExpandedLabReportId] = useState<string | null>(null);
  const [expandedLabDateKeys, setExpandedLabDateKeys] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const enterpriseOwnerView = isEnterpriseOwner(company?.businessSize, user?.role);
  const { data: farmBlocks } = useCompanyBlocks<FarmBlock>('asc');
  const accessiblePonds = useMemo(() => filterEnterpriseRecordsForUser(ponds, {
    businessSize: company?.businessSize,
    role: user?.role,
    userId: user?.uid,
    blocks: farmBlocks,
  }), [company?.businessSize, farmBlocks, ponds, user?.role, user?.uid]);

  // Form State
  const [formData, setFormData] = useState({
    pondId: '',
    date: today,
    phMorning: '',
    phEvening: '',
    doMorning: '',
    doEvening: '',
    transparency: '',
    salinity: ''
  });
  const [labForm, setLabForm] = useState({
    reportType: 'water_quality' as LabReportType,
    sampleDate: today,
    labName: '',
    farmName: '',
  });
  const [selectedLabPondIds, setSelectedLabPondIds] = useState<string[]>([]);
  const [labRows, setLabRows] = useState<LabPondResult[]>([]);
  const canEditWater = canEditOperations(user?.role);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        onSnapshot(doc(db, 'users', firebaseUser.uid), (uDoc) => {
          const userData = uDoc.data();
          setUser({ uid: firebaseUser.uid, ...userData });
          const cid = userData?.companyId;
          setCompanyId(cid);
          if (cid) {
            const q = query(collection(db, 'companies', cid, 'ponds'), orderBy('createdAt', 'desc'));
            const unsubPonds = onSnapshot(q, (snapshot) => {
              const data = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Pond))
                .filter(pond => pond.cycleStatus !== 'ended');
              setPonds(data);
              setLoading(false);
            });
            const labReportsQuery = query(collection(db, 'companies', cid, 'labReports'), orderBy('sampleDate', 'desc'));
            const unsubLabReports = onSnapshot(labReportsQuery, (snapshot) => {
              setLabReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LabReport)));
            });
            return () => {
              unsubPonds();
              unsubLabReports();
            };
          } else {
            setLoading(false);
          }
        });
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!companyId) {
      return undefined;
    }

    return onSnapshot(doc(db, 'companies', companyId, 'labUsage', 'pdfExtraction'), (snapshot) => {
      setLabPdfUsage(snapshot.exists() ? snapshot.data() as LabPdfUsage : {});
    }, (error) => {
      console.error('Error loading lab PDF usage:', error);
    });
  }, [companyId]);

  useEffect(() => {
    const interval = window.setInterval(() => setLabUsageNowMs(Date.now()), 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  // -- Sync form data with existing records when pond/date changes ----
  useEffect(() => {
    if (!isModalOpen || !formData.pondId || !formData.date) return;

    const pond = accessiblePonds.find(p => p.id === formData.pondId);
    const existing = pond?.samplings?.find(s =>
      !isBaselineSampling(s) &&
      !s.feedData &&
      !s.harvestData &&
      s.mbw === 0 &&
      s.feed === 0 &&
      s.mortality === 0 &&
      s.date === formData.date
    );

    if (existing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData(prev => {
        // Only update if the values are actually different to avoid input loops
        if (
          prev.phMorning === (existing.phMorning || '') &&
          prev.phEvening === (existing.phEvening || '') &&
          prev.doMorning === (existing.doMorning || '') &&
          prev.doEvening === (existing.doEvening || '') &&
          prev.transparency === (existing.transparency || '') &&
          prev.salinity === (existing.salinity || '')
        ) return prev;

        return {
          ...prev,
          phMorning: existing.phMorning || '',
          phEvening: existing.phEvening || '',
          doMorning: existing.doMorning || '',
          doEvening: existing.doEvening || '',
          transparency: existing.transparency || '',
          salinity: existing.salinity || '',
        };
      });
    } else {
      setFormData(prev => {
        // Only clear if not already empty
        if (
          !prev.phMorning && !prev.phEvening && !prev.doMorning &&
          !prev.doEvening && !prev.transparency && !prev.salinity
        ) return prev;

        return {
          ...prev,
          phMorning: '',
          phEvening: '',
          doMorning: '',
          doEvening: '',
          transparency: '',
          salinity: ''
        };
      });
    }
  }, [accessiblePonds, formData.pondId, formData.date, isModalOpen]);

  const handleAddWQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !formData.pondId || !user) return;
    if (!canEditWater) return;
    if (!accessiblePonds.some((pond) => pond.id === formData.pondId)) return;

    try {
      const pondRef = doc(db, 'companies', companyId, 'ponds', formData.pondId);
      const pondDoc = await getDoc(pondRef);

      if (pondDoc.exists()) {
        const pondData = pondDoc.data();
        const samplings = [...(pondData.samplings || [])];
        const existingIndex = samplings.findIndex(s =>
          !isBaselineSampling(s) &&
          !s.feedData &&
          !s.harvestData &&
          s.mbw === 0 &&
          s.feed === 0 &&
          s.mortality === 0 &&
          s.date === formData.date
        );

        const wqData = {
          cycleId: pondData.cycleId,
          cycleName: pondData.cycleName,
          pondCycleId: pondData.pondCycleId || formData.pondId,
          phMorning: formData.phMorning,
          phEvening: formData.phEvening,
          doMorning: formData.doMorning,
          doEvening: formData.doEvening,
          transparency: formData.transparency,
          salinity: formData.salinity,
        };

        if (existingIndex >= 0) {
          samplings[existingIndex] = {
            ...samplings[existingIndex],
            cycleId: pondData.cycleId,
            cycleName: pondData.cycleName,
            pondCycleId: pondData.pondCycleId || formData.pondId,
            phMorning: formData.phMorning || samplings[existingIndex].phMorning || '',
            phEvening: formData.phEvening || samplings[existingIndex].phEvening || '',
            doMorning: formData.doMorning || samplings[existingIndex].doMorning || '',
            doEvening: formData.doEvening || samplings[existingIndex].doEvening || '',
            transparency: formData.transparency || samplings[existingIndex].transparency || '',
            salinity: formData.salinity || samplings[existingIndex].salinity || '',
          };
        } else {
          samplings.push({
            id: `wq-${Date.now()}`,
            date: formData.date,
            mbw: 0, mortality: 0, feed: 0,
            ...wqData,
          });
        }

        await updateDoc(pondRef, {
          samplings,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid
        });

        setModalOpen(false);
        setFormData({
          pondId: '',
          date: today,
          phMorning: '',
          phEvening: '',
          doMorning: '',
          doEvening: '',
          transparency: '',
          salinity: ''
        });
      }
    } catch (error) {
      console.error('Error adding water quality:', error);
      alert('Failed to update water quality.');
    }
  };

  const createEmptyLabRow = (pond: Pond): LabPondResult => ({
    pondId: pond.id,
    pondCode: pond.pondName,
    doc: '',
    transparencyCm: '',
    waterQuality: {
      phCustomer: '',
      phLab: '',
      salinityCustomer: '',
      salinityLab: '',
      nh4: '',
      no2: '',
      alkalinityTotal: '',
      tom: '',
      hardnessCa: '',
      hardnessMg: '',
      hardnessTotal: '',
    },
    microbiology: {
      vibrioYellow: '',
      vibrioGreen: '',
      vibrioTotal: '',
      tbc: '',
      tvcTbcRatioPercent: '',
    },
    plankton: {
      totalCellPerMl: '',
      beneficialCellPerMl: '',
      harmfulCellPerMl: '',
      chlorophytaCellPerMl: '',
      chlorophytaPercent: '',
      chlorophytaSpecies: '',
      cyanophytaCellPerMl: '',
      cyanophytaPercent: '',
      cyanophytaSpecies: '',
      diatomCellPerMl: '',
      diatomPercent: '',
      diatomSpecies: '',
      chrysophytaCellPerMl: '',
      chrysophytaPercent: '',
      chrysophytaSpecies: '',
      dinoflagellataCellPerMl: '',
      dinoflagellataPercent: '',
      dinoflagellataSpecies: '',
      protozoaCellPerMl: '',
      protozoaPercent: '',
      protozoaSpecies: '',
    },
  });

  const toggleLabPond = (pond: Pond) => {
    setSelectedLabPondIds(prev => {
      const exists = prev.includes(pond.id);
      const nextIds = exists ? prev.filter(id => id !== pond.id) : [...prev, pond.id];
      setLabRows(rows => {
        if (exists) return rows.filter(row => row.pondId !== pond.id);
        return [...rows, createEmptyLabRow(pond)];
      });
      return nextIds;
    });
  };

  const updateLabRow = (pondId: string, path: string[], value: string) => {
    setLabRows(rows => rows.map(row => {
      if (row.pondId !== pondId) return row;
      if (path.length === 1) return { ...row, [path[0]]: value };
      const [section, field] = path as [keyof LabPondResult, string];
      const sectionValue = row[section];
      return {
        ...row,
        [section]: {
          ...(typeof sectionValue === 'object' && sectionValue ? sectionValue : {}),
          [field]: value,
        },
      };
    }));
  };

  const toOptionalNumber = (value?: string) => {
    if (value === undefined || value === null || String(value).trim() === '') return null;
    const parsed = Number(String(value).replace(/,/g, '').replace(/%$/, ''));
    return Number.isFinite(parsed) ? parsed : null;
  };

  const getPlanktonCellCount = (cellValue: string | undefined, percentValue: string | undefined, totalCellPerMl: number | null) => {
    const enteredCellCount = toOptionalNumber(cellValue);
    if (enteredCellCount !== null) return enteredCellCount;

    const percent = toOptionalNumber(percentValue);
    if (totalCellPerMl === null || percent === null) return null;

    return Math.round((totalCellPerMl * percent) / 100);
  };

  const normalizeLabRow = (row: LabPondResult) => {
    const totalCellPerMl = toOptionalNumber(row.plankton?.totalCellPerMl);

    return {
      pondId: row.pondId,
      pondCode: row.pondCode,
      doc: toOptionalNumber(row.doc),
      transparencyCm: toOptionalNumber(row.transparencyCm),
      waterQuality: {
        phCustomer: toOptionalNumber(row.waterQuality?.phCustomer),
        phLab: toOptionalNumber(row.waterQuality?.phLab),
        salinityCustomer: toOptionalNumber(row.waterQuality?.salinityCustomer),
        salinityLab: toOptionalNumber(row.waterQuality?.salinityLab),
        nh4: toOptionalNumber(row.waterQuality?.nh4),
        no2: toOptionalNumber(row.waterQuality?.no2),
        alkalinityTotal: toOptionalNumber(row.waterQuality?.alkalinityTotal),
        tom: toOptionalNumber(row.waterQuality?.tom),
        hardnessCa: toOptionalNumber(row.waterQuality?.hardnessCa),
        hardnessMg: toOptionalNumber(row.waterQuality?.hardnessMg),
        hardnessTotal: toOptionalNumber(row.waterQuality?.hardnessTotal),
      },
      microbiology: {
        vibrioYellow: toOptionalNumber(row.microbiology?.vibrioYellow),
        vibrioGreen: toOptionalNumber(row.microbiology?.vibrioGreen),
        vibrioTotal: toOptionalNumber(row.microbiology?.vibrioTotal),
        tbc: toOptionalNumber(row.microbiology?.tbc),
        tvcTbcRatioPercent: toOptionalNumber(row.microbiology?.tvcTbcRatioPercent),
      },
      plankton: {
        totalCellPerMl,
        beneficialCellPerMl: toOptionalNumber(row.plankton?.beneficialCellPerMl),
        harmfulCellPerMl: toOptionalNumber(row.plankton?.harmfulCellPerMl),
        chlorophytaCellPerMl: getPlanktonCellCount(row.plankton?.chlorophytaCellPerMl, row.plankton?.chlorophytaPercent, totalCellPerMl),
        chlorophytaPercent: toOptionalNumber(row.plankton?.chlorophytaPercent),
        chlorophytaSpecies: row.plankton?.chlorophytaSpecies?.trim() || null,
        cyanophytaCellPerMl: getPlanktonCellCount(row.plankton?.cyanophytaCellPerMl, row.plankton?.cyanophytaPercent, totalCellPerMl),
        cyanophytaPercent: toOptionalNumber(row.plankton?.cyanophytaPercent),
        cyanophytaSpecies: row.plankton?.cyanophytaSpecies?.trim() || null,
        diatomCellPerMl: getPlanktonCellCount(row.plankton?.diatomCellPerMl, row.plankton?.diatomPercent, totalCellPerMl),
        diatomPercent: toOptionalNumber(row.plankton?.diatomPercent),
        diatomSpecies: row.plankton?.diatomSpecies?.trim() || null,
        chrysophytaCellPerMl: getPlanktonCellCount(row.plankton?.chrysophytaCellPerMl, row.plankton?.chrysophytaPercent, totalCellPerMl),
        chrysophytaPercent: toOptionalNumber(row.plankton?.chrysophytaPercent),
        chrysophytaSpecies: row.plankton?.chrysophytaSpecies?.trim() || null,
        dinoflagellataCellPerMl: getPlanktonCellCount(row.plankton?.dinoflagellataCellPerMl, row.plankton?.dinoflagellataPercent, totalCellPerMl),
        dinoflagellataPercent: toOptionalNumber(row.plankton?.dinoflagellataPercent),
        dinoflagellataSpecies: row.plankton?.dinoflagellataSpecies?.trim() || null,
        protozoaCellPerMl: getPlanktonCellCount(row.plankton?.protozoaCellPerMl, row.plankton?.protozoaPercent, totalCellPerMl),
        protozoaPercent: toOptionalNumber(row.plankton?.protozoaPercent),
        protozoaSpecies: row.plankton?.protozoaSpecies?.trim() || null,
      },
    };
  };

  const toInputString = (value: unknown) => {
    if (value === null || value === undefined) return '';
    return String(value);
  };

  const denormalizeLabRow = (row: LabPondResult): LabPondResult => ({
    pondId: row.pondId,
    pondCode: row.pondCode || accessiblePonds.find(pond => pond.id === row.pondId)?.pondName || '',
    doc: toInputString(row.doc),
    transparencyCm: toInputString(row.transparencyCm),
    waterQuality: {
      phCustomer: toInputString(row.waterQuality?.phCustomer),
      phLab: toInputString(row.waterQuality?.phLab),
      salinityCustomer: toInputString(row.waterQuality?.salinityCustomer),
      salinityLab: toInputString(row.waterQuality?.salinityLab),
      nh4: toInputString(row.waterQuality?.nh4),
      no2: toInputString(row.waterQuality?.no2),
      alkalinityTotal: toInputString(row.waterQuality?.alkalinityTotal),
      tom: toInputString(row.waterQuality?.tom),
      hardnessCa: toInputString(row.waterQuality?.hardnessCa),
      hardnessMg: toInputString(row.waterQuality?.hardnessMg),
      hardnessTotal: toInputString(row.waterQuality?.hardnessTotal),
    },
    microbiology: {
      vibrioYellow: toInputString(row.microbiology?.vibrioYellow),
      vibrioGreen: toInputString(row.microbiology?.vibrioGreen),
      vibrioTotal: toInputString(row.microbiology?.vibrioTotal),
      tbc: toInputString(row.microbiology?.tbc),
      tvcTbcRatioPercent: toInputString(row.microbiology?.tvcTbcRatioPercent),
    },
    plankton: {
      totalCellPerMl: toInputString(row.plankton?.totalCellPerMl),
      beneficialCellPerMl: toInputString(row.plankton?.beneficialCellPerMl),
      harmfulCellPerMl: toInputString(row.plankton?.harmfulCellPerMl),
      chlorophytaCellPerMl: toInputString(row.plankton?.chlorophytaCellPerMl),
      chlorophytaPercent: toInputString(row.plankton?.chlorophytaPercent),
      chlorophytaSpecies: toInputString(row.plankton?.chlorophytaSpecies),
      cyanophytaCellPerMl: toInputString(row.plankton?.cyanophytaCellPerMl),
      cyanophytaPercent: toInputString(row.plankton?.cyanophytaPercent),
      cyanophytaSpecies: toInputString(row.plankton?.cyanophytaSpecies),
      diatomCellPerMl: toInputString(row.plankton?.diatomCellPerMl),
      diatomPercent: toInputString(row.plankton?.diatomPercent),
      diatomSpecies: toInputString(row.plankton?.diatomSpecies),
      chrysophytaCellPerMl: toInputString(row.plankton?.chrysophytaCellPerMl),
      chrysophytaPercent: toInputString(row.plankton?.chrysophytaPercent),
      chrysophytaSpecies: toInputString(row.plankton?.chrysophytaSpecies),
      dinoflagellataCellPerMl: toInputString(row.plankton?.dinoflagellataCellPerMl),
      dinoflagellataPercent: toInputString(row.plankton?.dinoflagellataPercent),
      dinoflagellataSpecies: toInputString(row.plankton?.dinoflagellataSpecies),
      protozoaCellPerMl: toInputString(row.plankton?.protozoaCellPerMl),
      protozoaPercent: toInputString(row.plankton?.protozoaPercent),
      protozoaSpecies: toInputString(row.plankton?.protozoaSpecies),
    },
  });

  const toUsageMillis = (value: unknown) => {
    if (!value) return null;
    if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
      const date = value.toDate();
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date.getTime() : null;
    }
    if (typeof value === 'string') {
      const parsed = new Date(value).getTime();
      return Number.isNaN(parsed) ? null : parsed;
    }
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    return null;
  };

  const formatRemainingTime = (remainingMs: number) => {
    const safeMs = Math.max(remainingMs, 0);
    const totalMinutes = Math.ceil(safeMs / (60 * 1000));
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getPdfActionState = (reportType: LabPdfUsageType) => {
    const usage = labPdfUsage[reportType] || {};
    const resetAtMs = toUsageMillis(usage.resetAt);
    if (resetAtMs && resetAtMs > labUsageNowMs) {
      return {
        disabled: true,
        message: `Available in ${formatRemainingTime(resetAtMs - labUsageNowMs)}`,
      };
    }
    const startedAtMs = toUsageMillis(usage.startedAt);
    const pendingResetAtMs = usage.status === 'pending' && startedAtMs ? startedAtMs + LAB_PDF_PENDING_MS : null;
    if (pendingResetAtMs && pendingResetAtMs > labUsageNowMs) {
      return {
        disabled: true,
        message: `Extraction running (${formatRemainingTime(pendingResetAtMs - labUsageNowMs)})`,
      };
    }
    return { disabled: false, message: getLabReportTypeLabel(reportType) };
  };

  const resetLabModal = () => {
    setLabEntryMode('manual');
    setEditingLabReportId(null);
    setLabPdfFile(null);
    setSelectedLabPondIds([]);
    setLabRows([]);
    setLabForm({
      reportType: 'water_quality',
      sampleDate: today,
      labName: '',
      farmName: '',
    });
  };

  const openNewLabReport = (reportType: Exclude<LabReportType, 'combined'> = 'water_quality') => {
    resetLabModal();
    setLabForm(prev => ({ ...prev, reportType }));
    setLabModalOpen(true);
  };

  const openLabPdfUpload = (reportType: Exclude<LabReportType, 'combined'>) => {
    const pdfActionState = getPdfActionState(reportType);
    if (pdfActionState.disabled) {
      alert(pdfActionState.message);
      return;
    }
    resetLabModal();
    setLabEntryMode('pdf_upload');
    setLabForm(prev => ({
      ...prev,
      reportType,
      labName: reportType === 'plankton' ? 'Uploaded plankton report' : 'Uploaded mineral quality report',
    }));
    setLabModalOpen(true);
  };

  const openLabReportReview = (report: LabReport) => {
    setLabEntryMode(report.entryMode || 'manual');
    setEditingLabReportId(report.id);
    setLabPdfFile(null);
    setLabForm({
      reportType: report.reportType || 'water_quality',
      sampleDate: report.sampleDate || today,
      labName: report.labName || '',
      farmName: report.farmName || '',
    });
    const rows = (report.pondResults || []).map(denormalizeLabRow);
    setSelectedLabPondIds(rows.map(row => row.pondId));
    setLabRows(rows);
    setLabModalOpen(true);
  };

  const getFileHash = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
  };

  const extractLabReportFromPdf = async (labReportId: string) => {
    const functions = getFunctions(app);
    const extract = httpsCallable<{ companyId: string; labReportId: string }, { pondResults?: LabPondResult[] }>(
      functions,
      'extractLabReportFromPdf',
    );
    return extract({ companyId: companyId || '', labReportId });
  };

  const handleUploadLabPdf = async () => {
    if (!companyId || !canEditWater || !user || !labPdfFile) return;
    const pdfActionState = getPdfActionState(labForm.reportType === 'plankton' ? 'plankton' : 'water_quality');
    if (pdfActionState.disabled) {
      alert(pdfActionState.message);
      return;
    }
    if (labPdfFile.type !== 'application/pdf') {
      alert('Please upload a PDF lab report.');
      return;
    }

    setLabSubmitting(true);
    try {
      const sourceFileHash = await getFileHash(labPdfFile);
      const reportRef = await addDoc(collection(db, 'companies', companyId, 'labReports'), {
        companyId,
        reportType: labForm.reportType,
        entryMode: 'pdf_upload',
        status: 'draft',
        sampleDate: labForm.sampleDate,
        labName: labForm.labName.trim() || 'Uploaded lab report',
        farmName: labForm.farmName.trim() || '',
        originalFileName: labPdfFile.name,
        sourceFileHash,
        pondResults: [],
        extraction: { status: 'pending', sourceHash: sourceFileHash },
        insights: { status: 'pending' },
        processing: { status: 'pending' },
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        updatedAt: serverTimestamp(),
      });

      const sourcePdfPath = `companies/${companyId}/labReports/${reportRef.id}/source.pdf`;
      const sourceRef = ref(storage, sourcePdfPath);
      await uploadBytes(sourceRef, labPdfFile, {
        contentType: 'application/pdf',
        customMetadata: { companyId, labReportId: reportRef.id, sourceFileHash },
      });
      const sourcePdfUrl = await getDownloadURL(sourceRef);

      await updateDoc(reportRef, {
        sourcePdfPath,
        sourcePdfUrl,
        updatedAt: serverTimestamp(),
      });

      const result = await extractLabReportFromPdf(reportRef.id);
      const rows = (result.data.pondResults || []).map(denormalizeLabRow);
      setEditingLabReportId(reportRef.id);
      setSelectedLabPondIds(rows.map(row => row.pondId));
      setLabRows(rows);
      setLabEntryMode('pdf_upload');
      alert('PDF extraction finished. Review the table, correct any values, then confirm the report.');
    } catch (error) {
      console.error('Error uploading lab PDF:', error);
      const details = typeof error === 'object' && error && 'details' in error ? error.details as { resetAt?: string } : null;
      if (details?.resetAt) {
        const resetAtMs = new Date(details.resetAt).getTime();
        alert(Number.isNaN(resetAtMs) ? 'Failed to upload or extract the lab report.' : `This PDF extraction is available in ${formatRemainingTime(resetAtMs - Date.now())}.`);
      } else {
        alert('Failed to upload or extract the lab report.');
      }
    } finally {
      setLabSubmitting(false);
    }
  };

  const handleCreateManualLabReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !canEditWater || selectedLabPondIds.length === 0 || !user) return;
    const accessiblePondIds = new Set(accessiblePonds.map((pond) => pond.id));
    const permittedLabRows = labRows.filter((row) => accessiblePondIds.has(row.pondId));
    if (permittedLabRows.length === 0) return;
    setLabSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        companyId,
        reportType: labForm.reportType,
        entryMode: labEntryMode,
        status: 'confirmed',
        sampleDate: labForm.sampleDate,
        labName: labForm.labName.trim() || (labEntryMode === 'pdf_upload' ? 'Uploaded lab report' : 'Farm test kit'),
        farmName: labForm.farmName.trim() || '',
        pondResults: permittedLabRows.map(normalizeLabRow),
        insights: { status: 'pending' },
        processing: { status: 'pending' },
        updatedAt: serverTimestamp(),
        confirmedAt: serverTimestamp(),
        confirmedBy: user.uid,
      };

      if (labEntryMode === 'manual') {
        payload.extraction = { status: 'not_required' };
      }

      if (editingLabReportId) {
        await updateDoc(doc(db, 'companies', companyId, 'labReports', editingLabReportId), payload);
      } else {
        payload.createdAt = serverTimestamp();
        payload.createdBy = user.uid;
        await addDoc(collection(db, 'companies', companyId, 'labReports'), payload);
      }

      setLabModalOpen(false);
      resetLabModal();
    } catch (error) {
      console.error('Error creating lab report:', error);
      alert('Failed to create lab report.');
    } finally {
      setLabSubmitting(false);
    }
  };

  const filteredPonds = useMemo(() => {
    return accessiblePonds.filter(p => p.pondName.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [accessiblePonds, searchTerm]);

  const filteredLabReports = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return labReports.filter(report => (
      report.status === 'confirmed'
      && (
        (report.labName || '').toLowerCase().includes(term)
        || (report.farmName || '').toLowerCase().includes(term)
        || (report.sampleDate || '').toLowerCase().includes(term)
        || (report.pondResults || []).some(row => (row.pondCode || '').toLowerCase().includes(term))
      )
    ));
  }, [labReports, searchTerm]);

  const groupedLabReports = useMemo(() => {
    const groups = new Map<string, { key: string; label: string; timestamp: number; reports: LabReport[] }>();

    filteredLabReports.forEach((report) => {
      const parsedDate = report.sampleDate ? new Date(report.sampleDate) : null;
      const hasValidDate = parsedDate && !Number.isNaN(parsedDate.getTime());
      const key = hasValidDate ? getFarmDateKey(parsedDate, company?.timeZone) : 'no-date';
      const existing = groups.get(key);
      const group = existing || {
        key,
        label: hasValidDate
          ? parsedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
          : 'No sample date',
        timestamp: hasValidDate ? parsedDate.getTime() : 0,
        reports: [],
      };
      group.reports.push(report);
      groups.set(key, group);
    });

    return Array.from(groups.values()).sort((a, b) => b.timestamp - a.timestamp);
  }, [company?.timeZone, filteredLabReports]);

  const toggleLabDateGroup = (dateKey: string) => {
    setExpandedLabDateKeys((current) =>
      current.includes(dateKey)
        ? current.filter((key) => key !== dateKey)
        : [...current, dateKey]
    );
  };

  const getSeverityStyle = (status?: LabSeverity) => {
    if (status === 'critical') return { label: 'Critical', color: '#991b1b', bg: '#fee2e2' };
    if (status === 'warning') return { label: 'Warning', color: '#92400e', bg: '#fef3c7' };
    if (status === 'watch') return { label: 'Watch', color: '#0F4C75', bg: '#E0F2FE' };
    return { label: 'Good', color: '#166534', bg: '#DCFCE7' };
  };

  const formatLabValue = (value?: string | number | null, suffix = '') => {
    if (value === undefined || value === null || value === '') return 'N/A';
    return `${value}${suffix}`;
  };

  const getLatestWQ = (pond: Pond) => {
    const logs = (pond.samplings || [])
      .filter(s => s.phMorning || s.phEvening || s.doMorning || s.doEvening || s.transparency || s.salinity)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return logs[0] || null;
  };

  const labGridColumns = useMemo(() => {
    const baseColumns: { label: string; path: string[]; inputType?: 'number' | 'text' }[] = [
      { label: 'DOC', path: ['doc'] },
    ];
    const mineralColumns: { label: string; path: string[]; inputType?: 'number' | 'text' }[] = [
      { label: 'Transp.', path: ['transparencyCm'] },
      { label: 'Sal. Cust.', path: ['waterQuality', 'salinityCustomer'] },
      { label: 'Sal. Lab', path: ['waterQuality', 'salinityLab'] },
      { label: 'NH4', path: ['waterQuality', 'nh4'] },
      { label: 'NO2', path: ['waterQuality', 'no2'] },
      { label: 'Alk.', path: ['waterQuality', 'alkalinityTotal'] },
      { label: 'TOM', path: ['waterQuality', 'tom'] },
      { label: 'Ca', path: ['waterQuality', 'hardnessCa'] },
      { label: 'Mg', path: ['waterQuality', 'hardnessMg'] },
      { label: 'Hardness', path: ['waterQuality', 'hardnessTotal'] },
      { label: 'Vib. Y', path: ['microbiology', 'vibrioYellow'] },
      { label: 'Vib. G', path: ['microbiology', 'vibrioGreen'] },
      { label: 'Vib. Total', path: ['microbiology', 'vibrioTotal'] },
      { label: 'TBC', path: ['microbiology', 'tbc'] },
      { label: 'TVC/TBC %', path: ['microbiology', 'tvcTbcRatioPercent'] },
    ];
    const planktonColumns: { label: string; path: string[]; inputType?: 'number' | 'text' }[] = [
      { label: 'Total Plankton', path: ['plankton', 'totalCellPerMl'] },
      { label: 'Good Plankton', path: ['plankton', 'beneficialCellPerMl'] },
      { label: 'Bad Plankton', path: ['plankton', 'harmfulCellPerMl'] },
      { label: 'Green Algae Cells', path: ['plankton', 'chlorophytaCellPerMl'] },
      { label: 'Green Algae %', path: ['plankton', 'chlorophytaPercent'] },
      { label: 'Green Algae Species', path: ['plankton', 'chlorophytaSpecies'], inputType: 'text' },
      { label: 'Blue-Green Cells', path: ['plankton', 'cyanophytaCellPerMl'] },
      { label: 'Blue-Green %', path: ['plankton', 'cyanophytaPercent'] },
      { label: 'Blue-Green Species', path: ['plankton', 'cyanophytaSpecies'], inputType: 'text' },
      { label: 'Diatom Cells', path: ['plankton', 'diatomCellPerMl'] },
      { label: 'Diatom %', path: ['plankton', 'diatomPercent'] },
      { label: 'Diatom Species', path: ['plankton', 'diatomSpecies'], inputType: 'text' },
      { label: 'Golden-Green Cells', path: ['plankton', 'chrysophytaCellPerMl'] },
      { label: 'Golden-Green %', path: ['plankton', 'chrysophytaPercent'] },
      { label: 'Golden-Green Species', path: ['plankton', 'chrysophytaSpecies'], inputType: 'text' },
      { label: 'Dino Cells', path: ['plankton', 'dinoflagellataCellPerMl'] },
      { label: 'Dino %', path: ['plankton', 'dinoflagellataPercent'] },
      { label: 'Dino Species', path: ['plankton', 'dinoflagellataSpecies'], inputType: 'text' },
      { label: 'Protozoa Cells', path: ['plankton', 'protozoaCellPerMl'] },
      { label: 'Protozoa %', path: ['plankton', 'protozoaPercent'] },
      { label: 'Protozoa Species', path: ['plankton', 'protozoaSpecies'], inputType: 'text' },
    ];
    if (labForm.reportType === 'plankton') return planktonColumns;
    if (labForm.reportType === 'combined') return [...baseColumns, ...mineralColumns, ...planktonColumns];
    return [...baseColumns, ...mineralColumns];
  }, [labForm.reportType]);

  const mineralPdfActionState = getPdfActionState('water_quality');
  const planktonPdfActionState = getPdfActionState('plankton');
  const activePdfActionState = getPdfActionState(labForm.reportType === 'plankton' ? 'plankton' : 'water_quality');

  return (
    <div className="dashboard-page-relaxed" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div className="glass-card animate-fade-up" style={{ padding: '5px', display: 'inline-flex', gap: '4px', marginBottom: '6px', width: 'fit-content', alignSelf: 'flex-start', borderRadius: '12px' }}>
        {([
          { id: 'daily', label: 'Daily Log', icon: Droplets },
          { id: 'lab', label: 'Lab Reports', icon: FileText },
        ] as { id: WaterPageView; label: string; icon: LucideIcon }[]).map(item => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveView(item.id)}
              style={{
                border: 'none',
                borderRadius: '9px',
                padding: '8px 12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                background: active ? 'var(--primary)' : 'transparent',
                color: active ? '#FFFFFF' : 'var(--text-muted)',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: active ? '0 8px 18px rgba(15, 76, 117, 0.18)' : 'none',
              }}
            >
              <Icon size={15} />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="glass-card dashboard-toolbar-card animate-fade-up animate-delay-1">
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
          <input
            placeholder="Search ponds or parameters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: 'var(--glass-bg)', border: '1px solid var(--border)', borderRadius: '16px',
              padding: '14px 16px 14px 48px', width: '100%', fontSize: '1rem', outline: 'none',
              color: 'var(--text-primary)', fontWeight: 600, backdropFilter: 'var(--glass-blur)',
              boxShadow: 'var(--shadow-card)', transition: 'all 0.2s'
            }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
          />
        </div>
        {canEditWater && activeView === 'daily' && (
          <button
            onClick={() => {
              setFormData({ ...formData, pondId: '', date: today });
              setModalOpen(true);
            }}
            className="dashboard-action dashboard-action-primary"
          >
            <Plus size={20} strokeWidth={3} />
            <span>New Parameter Log</span>
          </button>
        )}
        {canEditWater && activeView === 'lab' && (
          <button
            type="button"
            onClick={() => setLabActionModalOpen(true)}
            className="dashboard-action dashboard-action-primary"
          >
            <Plus size={20} strokeWidth={3} />
            <span>Add Lab Report</span>
          </button>
        )}
      </div>

      {/* Daily Pond Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><Loader2 className="animate-spin" size={40} color="var(--primary)" /></div>
      ) : activeView === 'daily' ? (
        enterpriseOwnerView ? (
          <EnterpriseGroupedPondGrid
            ponds={filteredPonds}
            emptyMessage="No water quality data"
            getTone={(pond) => getEnterprisePondStatus(pond, company?.timeZone).risk}
            onSelect={(pond) => setSelectedPondForHistory(pond as Pond)}
          />
        ) : (
        <div className="responsive-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {filteredPonds.map((pond, idx) => {
            const latest = getLatestWQ(pond);
            const labStyle = getSeverityStyle(pond.latestLabStatus?.status);
            return (
              <div key={pond.id} className={`glass-card animate-fade-up animate-delay-${(idx % 4) + 1}`} style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-mid)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', border: '1px solid var(--border)' }}>
                      <Waves size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{pond.pondName}</h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
                        {latest ? `UPDATED ${new Date(latest.date).toLocaleDateString()}` : 'NO DATA LOGGED'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPondForHistory(pond)}
                    className="icon-btn-modern"
                  >
                    <History size={20} />
                  </button>
                </div>

                {pond.latestLabStatus && (
                  <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)', background: '#FFFFFF' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Latest Lab Status</div>
                        <div style={{ marginTop: '4px', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>{pond.latestLabStatus.mainIssue || 'Lab report reviewed'}</div>
                      </div>
                      <span style={{ borderRadius: 999, padding: '6px 10px', background: labStyle.bg, color: labStyle.color, fontSize: '0.72rem', fontWeight: 800 }}>
                        {labStyle.label}
                      </span>
                    </div>
                  </div>
                )}

                <div style={{ padding: '24px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', flex: 1 }}>
                  <div className="wq-metric">
                    <span className="wq-label">pH Level</span>
                    <div className="wq-value">
                      <Activity size={16} color="var(--accent)" />
                      <span>{latest ? `${latest.phMorning || '-'} / ${latest.phEvening || '-'}` : '--'}</span>
                    </div>
                  </div>
                  <div className="wq-metric">
                    <span className="wq-label">DO (mg/L)</span>
                    <div className="wq-value">
                      <Wind size={16} color="var(--primary)" />
                      <span>{latest ? `${latest.doMorning || '-'} / ${latest.doEvening || '-'}` : '--'}</span>
                    </div>
                  </div>
                  <div className="wq-metric">
                    <span className="wq-label">Salinity</span>
                    <div className="wq-value">
                      <Droplets size={16} color="#10b981" />
                      <span>{latest ? `${latest.salinity || '--'} PPT` : '--'}</span>
                    </div>
                  </div>
                  <div className="wq-metric">
                    <span className="wq-label">Transparency</span>
                    <div className="wq-value">
                      <Thermometer size={16} color="#f59e0b" />
                      <span>{latest ? `${latest.transparency || '--'} CM` : '--'}</span>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', background: 'var(--bg-mid)' }}>
                  {canEditWater && (
                    <button
                      onClick={() => { setFormData({ ...formData, pondId: pond.id, date: today }); setModalOpen(true); }}
                      className="btn-secondary"
                      style={{ padding: '9px 16px', fontSize: '0.82rem' }}
                    >
                      Quick Log <Plus size={16} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        )
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {groupedLabReports.map((group, groupIndex) => (
            <section key={group.key} className={`animate-fade-up animate-delay-${(groupIndex % 4) + 1}`} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                type="button"
                onClick={() => toggleLabDateGroup(group.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  border: '1px solid var(--border)',
                  background: '#FFFFFF',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(15, 76, 117, 0.05)',
                  textAlign: 'left',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '0' }}>{group.label}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700, marginTop: '2px' }}>
                    {group.reports.length} confirmed report{group.reports.length === 1 ? '' : 's'}
                  </p>
                </div>
                <ChevronDown
                  size={18}
                  color="var(--primary)"
                  style={{
                    flexShrink: 0,
                    transition: 'transform 0.2s ease',
                    transform: expandedLabDateKeys.includes(group.key) ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </button>

              {expandedLabDateKeys.includes(group.key) && group.reports.map((report) => {
                const style = getSeverityStyle(report.summary?.overallStatus);
                const pondCount = report.pondResults?.length || 0;
                const isExpanded = expandedLabReportId === report.id;
                return (
                  <div key={report.id} className="glass-card" style={{ padding: '18px' }}>
                <div className="responsive-four-column" style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1.4fr) minmax(160px, 0.7fr) minmax(160px, 0.7fr) auto', gap: '16px', alignItems: 'center' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--primary-dim)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ClipboardList size={19} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 850, color: 'var(--text-primary)' }}>
                          {report.labName || 'Lab Report'}
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700 }}>
                          {report.sampleDate ? new Date(report.sampleDate).toLocaleDateString() : 'No sample date'} · {pondCount} pond{pondCount === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {(report.pondResults || []).slice(0, 8).map((row, rowIndex) => {
                        const relatedPond = accessiblePonds.find((pond) =>
                          pond.id === row.pondId ||
                          pond.pondName.toLowerCase() === (row.pondCode || '').toLowerCase()
                        );
                        const rowStyle = getSeverityStyle(relatedPond?.latestLabStatus?.status || report.summary?.overallStatus);
                        return (
                          <span
                            key={`${row.pondId || row.pondCode || rowIndex}-status`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '5px 9px',
                              borderRadius: '999px',
                              background: rowStyle.bg,
                              color: rowStyle.color,
                              fontSize: '0.7rem',
                              fontWeight: 850,
                            }}
                          >
                            {row.pondCode || `Pond ${rowIndex + 1}`} · {rowStyle.label}
                          </span>
                        );
                      })}
                      {(report.pondResults || []).length > 8 && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 800, padding: '5px 0' }}>
                          +{(report.pondResults || []).length - 8} more
                        </span>
                      )}
                      {(report.pondResults || []).length === 0 && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 650 }}>No pond rows</span>
                      )}
                    </div>
                    {report.insights?.ownerSummary && (
                      <div style={{ marginTop: '10px', color: 'var(--text-primary)', fontSize: '0.86rem', fontWeight: 700, lineHeight: 1.5 }}>
                        {report.insights.ownerSummary}
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Report Type</div>
                    <div style={{ marginTop: 6, fontWeight: 800, color: 'var(--text-primary)' }}>{getLabReportTypeLabel(report.reportType)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Processing</div>
                    <div style={{ marginTop: 6, fontWeight: 800, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{report.processing?.status || report.status || 'pending'}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <span style={{ borderRadius: 999, padding: '7px 12px', background: style.bg, color: style.color, fontSize: '0.74rem', fontWeight: 850 }}>
                      {style.label}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>
                      {(report.summary?.warningCount || 0) + (report.summary?.criticalCount || 0)} alert row(s)
                    </span>
                    <button
                      type="button"
                      onClick={() => setExpandedLabReportId(isExpanded ? null : report.id)}
                      className="btn-secondary"
                      style={{ padding: '8px 12px', fontSize: '0.76rem' }}
                    >
                      {isExpanded ? 'Hide Details' : 'Details'}
                    </button>
                    {canEditWater && report.status !== 'confirmed' && (
                      <button
                        type="button"
                        onClick={() => openLabReportReview(report)}
                        className="btn-secondary"
                        style={{ padding: '8px 12px', fontSize: '0.76rem' }}
                      >
                        Review & Confirm
                      </button>
                    )}
                    {report.sourcePdfUrl && (
                      <a
                        href={report.sourcePdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: 'var(--primary)',
                          fontSize: '0.74rem',
                          fontWeight: 850,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 9px',
                          borderRadius: '9px',
                          background: 'var(--primary-dim)',
                        }}
                      >
                        <ExternalLink size={13} />
                        View PDF
                      </a>
                    )}
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ marginTop: '18px', borderTop: '1px solid var(--border)', paddingTop: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                    {(report.pondResults || []).map((row, rowIndex) => {
                      const water = row.waterQuality || {};
                      const micro = row.microbiology || {};
                      const plankton = row.plankton || {};
                      return (
                        <div key={`${row.pondId || row.pondCode || rowIndex}-${rowIndex}`} style={{ border: '1px solid var(--border)', borderRadius: '14px', background: 'var(--bg-mid)', padding: '14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <div>
                              <div style={{ color: 'var(--text-primary)', fontWeight: 850 }}>{row.pondCode || `Pond ${rowIndex + 1}`}</div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: 700 }}>{getLabReportTypeLabel(report.reportType)}</div>
                            </div>
                            {report.sourcePdfUrl && (
                              <a href={report.sourcePdfUrl} target="_blank" rel="noreferrer" style={{ borderRadius: '10px', padding: '7px 10px', background: 'var(--primary)', color: '#fff', fontSize: '0.72rem', fontWeight: 850, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                <ExternalLink size={12} />
                                PDF
                              </a>
                            )}
                          </div>
                          {report.reportType !== 'plankton' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              {[
                                ['NH4', formatLabValue(water.nh4)],
                                ['NO2', formatLabValue(water.no2)],
                                ['Alkalinity', formatLabValue(water.alkalinityTotal)],
                                ['Ca', formatLabValue(water.hardnessCa)],
                                ['Mg', formatLabValue(water.hardnessMg)],
                                ['Hardness', formatLabValue(water.hardnessTotal)],
                                ['Vibrio', formatLabValue(micro.vibrioTotal)],
                              ].map(([label, value]) => (
                                <div key={label} style={{ background: '#fff', borderRadius: '10px', border: '1px solid var(--border)', padding: '10px' }}>
                                  <div style={{ color: 'var(--text-faint)', fontSize: '0.62rem', fontWeight: 850, textTransform: 'uppercase' }}>{label}</div>
                                  <div style={{ color: 'var(--text-primary)', fontSize: '0.86rem', fontWeight: 850, marginTop: '4px' }}>{value}</div>
                                </div>
                              ))}
                            </div>
                          )}
                          {(report.reportType === 'plankton' || report.reportType === 'combined') && (
                            <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid var(--border)', padding: '10px' }}>
                              <div style={{ color: 'var(--text-faint)', fontSize: '0.62rem', fontWeight: 850, textTransform: 'uppercase' }}>Plankton</div>
                              <div style={{ color: 'var(--text-primary)', fontSize: '0.86rem', fontWeight: 850, marginTop: '4px' }}>{formatLabValue(plankton.totalCellPerMl)} cells/ml</div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, marginTop: '6px', lineHeight: 1.45 }}>
                                Green {formatLabValue(plankton.chlorophytaPercent, '%')} · Blue-green {formatLabValue(plankton.cyanophytaPercent, '%')} · Golden {formatLabValue(plankton.chrysophytaPercent, '%')}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                  </div>
                );
              })}
            </section>
          ))}
          {filteredLabReports.length === 0 && (
            <div className="glass-card" style={{ textAlign: 'center', padding: '70px 24px' }}>
              <FileText size={44} color="var(--text-faint)" style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 850, color: 'var(--text-primary)', marginBottom: '8px' }}>No lab reports yet</h3>
              <p style={{ color: 'var(--text-muted)', fontWeight: 650 }}>Add a manual report or upload a lab PDF for assisted extraction and review.</p>
            </div>
          )}
        </div>
      )}

      {/* -- HISTORY DRAWER ------------------------------ */}
      {selectedPondForHistory && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'flex-end' }}>
          <div className="drawer-content responsive-side-drawer animate-slide-left">
            <div className="responsive-modal-header" style={{ padding: '26px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-mid)' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, fontFamily: "var(--sans)", color: 'var(--text-primary)' }}>
                  {selectedPondForHistory.pondName} Water Quality History
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
                  Historical environmental logs and parameter readings
                </p>
              </div>
              <button onClick={() => setSelectedPondForHistory(null)} className="icon-btn-modern">
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {selectedPondForHistory.samplings
                  .filter(s => s.phMorning || s.phEvening || s.doMorning || s.doEvening || s.transparency || s.salinity)
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((log, i) => (
                    <div key={i} className="glass-card" style={{ padding: '18px', background: '#FFF' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <span style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '-0.01em' }}>{new Date(log.date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        <div style={{ fontSize: '0.6rem', padding: '4px 10px', borderRadius: '100px', background: 'var(--primary-dim)', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Record Entry</div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <div className="wq-metric-small">
                          <span className="wq-label-small">pH Levels</span>
                          <span className="wq-val-small">{log.phMorning || '-'} <span style={{ color: 'var(--text-faint)' }}>AM</span> / {log.phEvening || '-'} <span style={{ color: 'var(--text-faint)' }}>PM</span></span>
                        </div>
                        <div className="wq-metric-small">
                          <span className="wq-label-small">Dissolved Oxygen</span>
                          <span className="wq-val-small">{log.doMorning || '-'} <span style={{ color: 'var(--text-faint)' }}>AM</span> / {log.doEvening || '-'} <span style={{ color: 'var(--text-faint)' }}>PM</span></span>
                        </div>
                        <div className="wq-metric-small">
                          <span className="wq-label-small">Salinity</span>
                          <span className="wq-val-small">{log.salinity || '-'} PPT</span>
                        </div>
                        <div className="wq-metric-small">
                          <span className="wq-label-small">Transparency</span>
                          <span className="wq-val-small">{log.transparency || '-'} CM</span>
                        </div>
                      </div>
                    </div>
                  ))
                }
                {selectedPondForHistory.samplings.length === 0 && (
                   <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                     <Info size={40} style={{ marginBottom: '16px', opacity: 0.3 }} />
                     <p style={{ fontWeight: 600 }}>No environmental records found for this pond.</p>
                   </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -- LAB REPORT ACTION MODAL --------------------- */}
      {isLabActionModalOpen && (
        <div className="responsive-modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 2900, background: 'rgba(15, 23, 42, 0.38)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="glass-card responsive-modal animate-fade-up" style={{ width: '100%', maxWidth: '560px', background: 'white', padding: '0', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
            <div className="responsive-modal-header" style={{ padding: '22px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', background: 'var(--bg-mid)' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 850 }}>Add Lab Report</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', marginTop: '4px', fontWeight: 650 }}>Upload a PDF or enter results manually.</p>
              </div>
              <button onClick={() => setLabActionModalOpen(false)} className="icon-btn-modern">
                <X size={22} />
              </button>
            </div>
            <div className="responsive-modal-body" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <div style={{ color: 'var(--text-faint)', fontSize: '0.68rem', fontWeight: 850, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Upload PDF</div>
                <div className="responsive-two-column" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button
                    type="button"
                    disabled={mineralPdfActionState.disabled}
                    onClick={() => {
                      setLabActionModalOpen(false);
                      openLabPdfUpload('water_quality');
                    }}
                    className="btn-secondary"
                    style={{ padding: '16px', borderRadius: '14px', justifyContent: 'flex-start', opacity: mineralPdfActionState.disabled ? 0.48 : 1, cursor: mineralPdfActionState.disabled ? 'not-allowed' : 'pointer' }}
                  >
                    <FileText size={18} />
                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '3px' }}>
                      <span>Mineral PDF</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700 }}>{mineralPdfActionState.message}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={planktonPdfActionState.disabled}
                    onClick={() => {
                      setLabActionModalOpen(false);
                      openLabPdfUpload('plankton');
                    }}
                    className="btn-secondary"
                    style={{ padding: '16px', borderRadius: '14px', justifyContent: 'flex-start', opacity: planktonPdfActionState.disabled ? 0.48 : 1, cursor: planktonPdfActionState.disabled ? 'not-allowed' : 'pointer' }}
                  >
                    <FileText size={18} />
                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '3px' }}>
                      <span>Plankton PDF</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700 }}>{planktonPdfActionState.message}</span>
                    </span>
                  </button>
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-faint)', fontSize: '0.68rem', fontWeight: 850, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Manual Entry</div>
                <div className="responsive-two-column" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setLabActionModalOpen(false);
                      openNewLabReport('water_quality');
                    }}
                    className="btn-secondary"
                    style={{ padding: '16px', borderRadius: '14px', justifyContent: 'flex-start' }}
                  >
                    <Plus size={18} />
                    <span>Manual Mineral</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLabActionModalOpen(false);
                      openNewLabReport('plankton');
                    }}
                    className="btn-secondary"
                    style={{ padding: '16px', borderRadius: '14px', justifyContent: 'flex-start' }}
                  >
                    <Plus size={18} />
                    <span>Manual Plankton</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -- LAB REPORT MODAL --------------------------------- */}
      {isLabModalOpen && (
        <div className="responsive-modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="glass-card responsive-modal animate-fade-up" style={{ width: '100%', maxWidth: '1100px', maxHeight: '90vh', background: 'white', padding: '0', overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>
            <div className="responsive-modal-header" style={{ padding: '26px 28px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-mid)' }}>
              <div>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 850 }}>{editingLabReportId ? 'Review Lab Report' : 'Add Lab Report'}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px', fontWeight: 650 }}>Enter results manually or upload a lab PDF, then review before confirmation.</p>
              </div>
              <button onClick={() => setLabModalOpen(false)} className="icon-btn-modern">
                <X size={24} />
              </button>
            </div>

            <form className="responsive-modal-body" onSubmit={handleCreateManualLabReport} style={{ padding: '26px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="responsive-four-column" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="form-label">Entry Mode</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {([
                      ['manual', 'Manual'],
                      ['pdf_upload', 'PDF'],
                    ] as [LabEntryMode, string][]).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        disabled={Boolean(editingLabReportId)}
                        onClick={() => setLabEntryMode(mode)}
                        style={{
                          padding: '13px 10px',
                          borderRadius: '12px',
                          border: labEntryMode === mode ? '1px solid var(--primary)' : '1px solid var(--border)',
                          background: labEntryMode === mode ? 'var(--primary-dim)' : '#FFFFFF',
                          color: labEntryMode === mode ? 'var(--primary)' : 'var(--text-muted)',
                          fontWeight: 850,
                          cursor: editingLabReportId ? 'default' : 'pointer',
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="form-label">Report Type</label>
                  <select value={labForm.reportType} onChange={e => setLabForm({ ...labForm, reportType: e.target.value as LabReportType })} className="form-input">
                    {labForm.reportType === 'combined' && <option value="combined">Combined Lab Report</option>}
                    <option value="water_quality">Mineral Quality</option>
                    <option value="plankton">Plankton</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="form-label">Sample Date</label>
                  <input type="date" required value={labForm.sampleDate} onChange={e => setLabForm({ ...labForm, sampleDate: e.target.value })} className="form-input" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="form-label">Lab Name</label>
                  <input value={labForm.labName} onChange={e => setLabForm({ ...labForm, labName: e.target.value })} placeholder="Farm kit / lab name" className="form-input" />
                </div>
              </div>

              {labEntryMode === 'pdf_upload' && !editingLabReportId && (
                <div className="responsive-two-column" style={{ border: '1px solid var(--border)', borderRadius: '16px', padding: '18px', background: 'var(--bg-mid)', display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'center' }}>
                  <div>
                    <label className="form-label">Upload Lab PDF</label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={e => setLabPdfFile(e.target.files?.[0] || null)}
                      style={{ display: 'block', marginTop: '10px', fontWeight: 700 }}
                    />
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 650, marginTop: '8px' }}>
                      The PDF is saved to Firebase Storage. Gemini extraction creates a draft table only; it does not confirm the report.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={labSubmitting || !labPdfFile || activePdfActionState.disabled}
                    onClick={handleUploadLabPdf}
                    className="btn-primary"
                    style={{ padding: '14px 18px', borderRadius: '14px', fontWeight: 850, opacity: labSubmitting || !labPdfFile || activePdfActionState.disabled ? 0.6 : 1 }}
                  >
                    {labSubmitting ? 'Extracting...' : activePdfActionState.disabled ? activePdfActionState.message : 'Upload & Extract'}
                  </button>
                </div>
              )}

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 850 }}>Included Ponds</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 650 }}>Select every pond covered by this lab report.</p>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 800, fontSize: '0.82rem' }}>{selectedLabPondIds.length} selected</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
                  {accessiblePonds.map(pond => {
                    const selected = selectedLabPondIds.includes(pond.id);
                    return (
                      <button
                        key={pond.id}
                        type="button"
                        onClick={() => toggleLabPond(pond)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '12px',
                          border: selected ? '1px solid var(--primary)' : '1px solid var(--border)',
                          background: selected ? 'var(--primary-dim)' : '#FFFFFF',
                          color: selected ? 'var(--primary)' : 'var(--text-primary)',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span>{pond.pondName}</span>
                        {selected && <CheckCircle2 size={16} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {labRows.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <AlertTriangle size={18} color="var(--primary)" />
                    <h3 style={{ fontSize: '1rem', fontWeight: 850 }}>Bulk Result Grid</h3>
                  </div>
                  <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '14px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: labForm.reportType === 'plankton' ? '2200px' : labForm.reportType === 'combined' ? '2800px' : '1280px' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-mid)' }}>
                          {['Pond', ...labGridColumns.map(column => column.label)].map(label => (
                            <th key={label} style={{ padding: '10px 8px', textAlign: 'left', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 850, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {labRows.map(row => (
                          <tr key={row.pondId}>
                            <td style={{ padding: '8px', fontWeight: 850, minWidth: 90 }}>{row.pondCode}</td>
                            {labGridColumns.map(({ path, inputType = 'number' }) => {
                              const sectionValue = row[path[0] as keyof LabPondResult];
                              const value = path.length === 1
                                ? (sectionValue as string | undefined)
                                : (typeof sectionValue === 'object' && sectionValue ? (sectionValue as Record<string, string | undefined>)[path[1]] : undefined);
                              return (
                                <td key={path.join('.')} style={{ padding: '6px', borderTop: '1px solid var(--border)' }}>
                                  <input
                                    type={inputType}
                                    step={inputType === 'number' ? '0.01' : undefined}
                                    value={value || ''}
                                    onChange={e => updateLabRow(row.pondId, path, e.target.value)}
                                    style={{ width: inputType === 'text' ? '170px' : '86px', padding: '8px', borderRadius: '9px', border: '1px solid var(--border)', fontWeight: 700 }}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '16px', borderTop: '1px solid var(--border)', paddingTop: '22px' }}>
                <button type="button" onClick={() => setLabModalOpen(false)} style={{
                  flex: 1, padding: '15px', borderRadius: '14px', border: '1px solid var(--border)',
                  background: 'transparent', fontWeight: 750, cursor: 'pointer'
                }}>Cancel</button>
                <button type="submit" disabled={labSubmitting || selectedLabPondIds.length === 0} className="btn-primary" style={{ flex: 1, padding: '15px', borderRadius: '14px', fontWeight: 850, opacity: labSubmitting || selectedLabPondIds.length === 0 ? 0.6 : 1 }}>
                  {labSubmitting ? 'Saving...' : 'Confirm Lab Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -- LOG MODAL ------------------------------------------ */}
      {isModalOpen && (
        <div className="responsive-modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px' }}>
          <div className="glass-card responsive-modal animate-fade-up" style={{ width: '100%', maxWidth: '560px', maxHeight: 'min(760px, calc(100vh - 36px))', background: 'white', padding: '0', overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>
            <div className="responsive-modal-header" style={{ padding: '20px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-mid)', flexShrink: 0 }}>
              <div>
                <h2 style={{ fontSize: '1.18rem', fontWeight: 850 }}>Log Parameters</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '3px', fontWeight: 650 }}>Sync environmental readings with Orson AI.</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="icon-btn-modern">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddWQ} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
              <div className="responsive-modal-body responsive-form-grid" style={{ padding: '20px 22px', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', minHeight: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', gridColumn: 'span 2' }}>
                  <label className="form-label">Target Pond</label>
                  <select
                    required
                    value={formData.pondId}
                    onChange={e => setFormData({...formData, pondId: e.target.value})}
                    className="form-input"
                  >
                    <option value="">Select a pond asset...</option>
                    {accessiblePonds.map(p => <option key={p.id} value={p.id}>{p.pondName}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <label className="form-label">Sampling Date</label>
                  <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="form-input" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <label className="form-label">Salinity (PPT)</label>
                  <input type="number" step="0.1" placeholder="0.0" value={formData.salinity} onChange={e => setFormData({...formData, salinity: e.target.value})} className="form-input" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <label className="form-label">pH (Morning)</label>
                  <input type="number" step="0.1" placeholder="0.0" value={formData.phMorning} onChange={e => setFormData({...formData, phMorning: e.target.value})} className="form-input" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <label className="form-label">pH (Evening)</label>
                  <input type="number" step="0.1" placeholder="0.0" value={formData.phEvening} onChange={e => setFormData({...formData, phEvening: e.target.value})} className="form-input" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <label className="form-label">DO (Morning) mg/L</label>
                  <input type="number" step="0.1" placeholder="0.0" value={formData.doMorning} onChange={e => setFormData({...formData, doMorning: e.target.value})} className="form-input" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <label className="form-label">DO (Evening) mg/L</label>
                  <input type="number" step="0.1" placeholder="0.0" value={formData.doEvening} onChange={e => setFormData({...formData, doEvening: e.target.value})} className="form-input" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', gridColumn: 'span 2' }}>
                  <label className="form-label">Transparency (CM)</label>
                  <input type="number" placeholder="0" value={formData.transparency} onChange={e => setFormData({...formData, transparency: e.target.value})} className="form-input" />
                </div>
              </div>

              <div className="responsive-modal-footer" style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--border)', padding: '16px 22px', background: '#FFFFFF', flexShrink: 0 }}>
                <button type="button" onClick={() => setModalOpen(false)} style={{
                  flex: 1, padding: '13px', borderRadius: '12px', border: '1px solid var(--border)',
                  background: 'transparent', fontWeight: 700, cursor: 'pointer'
                }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '13px', borderRadius: '12px', fontWeight: 800 }}>Save Log Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .icon-btn-modern {
          background: #FFF;
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 10px;
          color: var(--primary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(15, 76, 117, 0.05);
        }
        .icon-btn-modern:hover {
          background: var(--primary-dim);
          transform: translateY(-2px);
          border-color: var(--primary);
        }
        .wq-metric {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .wq-label {
          font-size: 0.65rem;
          font-weight: 800;
          color: var(--text-faint);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .wq-value {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--text-primary);
        }
        .drawer-content {
          width: 100%;
          max-width: 560px;
          background: #FFFFFF;
          height: 100vh;
          box-shadow: -20px 0 60px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
        }
        .animate-slide-left {
          animation: slideLeft 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes slideLeft {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .wq-metric-small {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .wq-label-small {
          font-size: 0.6rem;
          font-weight: 800;
          color: var(--text-faint);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .wq-val-small {
          font-size: 0.95rem;
          font-weight: 800;
          color: var(--text-primary);
        }
        .form-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .form-input {
          padding: 14px 18px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--bg-mid);
          outline: none;
          font-size: 1rem;
          font-weight: 600;
          transition: all 0.2s;
        }
        .form-input:focus {
          border-color: var(--primary);
          background: #FFF;
          box-shadow: 0 0 0 4px var(--primary-dim);
        }
      `}</style>
    </div>
  );
}
