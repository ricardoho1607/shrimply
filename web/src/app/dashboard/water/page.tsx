"use client";

import { useSaveOperation } from '../../../../../shared/useSaveOperation';
import { createRecordOnce } from '@/lib/saveData';
import { prepareSaveData as removeUndefinedFields } from '@/lib/saveData';
import { updateRecordOnline, uploadSaveFile } from '@/lib/saveData';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  Droplets,
  Search,
  X,
  Loader2,
  Info,
  FileText,
  CheckCircle2,
  ClipboardList,
  ChevronDown,
  ExternalLink,
  type LucideIcon
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ref, getDownloadURL } from 'firebase/storage';
import { app, auth, db, storage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
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
import { LAB_WATER_FIELDS, labMeasurementLabel, validateLabRow, type LabMeasurementUnits } from '../../../../../functions/shared/labMeasurementContract';
import { initializeWaterDraft, isDailyWaterRecord } from './waterFormState';
import { getManualLabColumns } from '@/lib/manualLabColumns';
import { getManualLabInputUnits, toggleUniqueLabPondRow } from './labRowState';
import type { PlanktonOverwatchSnapshot } from '../../../../../shared/planktonOverwatch';
import { useFarmPermissions } from '@/hooks/useFarmPermissions';
import { useDashboardCopy } from '@/hooks/useDashboardCopy';

/* --- Types --------------------------------------------------- */
interface Sampling {
  id: string; date: string; mbw: number; mortality: number; feed: number;
  cycleId?: string; cycleName?: string; pondCycleId?: string;
  isBaselineEstimate?: boolean; source?: string;
  feedData?: { totalDailyFeed?: number | string | null } | null; harvestData?: unknown;
  phMorning?: string; phEvening?: string; doMorning?: string; doEvening?: string;
  transparencyMorning?: string; transparencyEvening?: string; transparency?: string;
  salinity?: string;
  temperatureMorning?: string; temperatureEvening?: string; temperature?: string;
  waterAppearanceMorning?: string; waterAppearanceEvening?: string; waterAppearance?: string;
  waterDepthCmMorning?: string; waterDepthCmEvening?: string; waterDepthCm?: string;
  alkalinity?: string;
  waterQualityRecordedByName?: string;
  ammonia?: string;
  operationalNotes?: string;
  weatherEvent?: 'rain' | 'heavy_rain' | 'sudden_cloud' | null;
  waterExchangePercent?: string;
  sludgeLoad?: 'low' | 'moderate' | 'high' | null;
  surfaceScum?: boolean | null;
  shrimpBehaviour?: 'normal' | 'abnormal' | null;
}

interface Pond {
  id: string; pondName: string; supplier: string; samplings: Sampling[];
  blockId?: string;
  blockName?: string;
  latestLabStatus?: LabStatus;
  latestPlanktonOverwatch?: PlanktonOverwatchSnapshot;
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

const getLabReportTypeLabel = (reportType: LabReportType | undefined, copy: (text: string) => string) => {
  if (reportType === 'plankton') return copy('Plankton Quality');
  if (reportType === 'combined') return copy('Combined Lab Report');
  return copy('Mineral Quality');
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
  measurementUnits?: LabMeasurementUnits;
  pondId: string;
  pondCode: string;
  doc?: string;
  transparencyCm?: string;
  waterQuality?: {
    phCustomer?: string;
    phLab?: string;
    salinityCustomer?: string;
    salinityLab?: string;
    tan?: string;
    nh3?: string;
    nh4?: string;
    no2?: string;
    phosphate?: string;
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

const hasSavedValue = (value: unknown): boolean => value !== null && value !== undefined && value !== '';

const hasWaterQualityHistory = (sampling: Sampling): boolean => Boolean(
  hasSavedValue(sampling.phMorning) || hasSavedValue(sampling.phEvening) ||
  hasSavedValue(sampling.doMorning) || hasSavedValue(sampling.doEvening) ||
  hasSavedValue(sampling.transparencyMorning) || hasSavedValue(sampling.transparencyEvening) || hasSavedValue(sampling.transparency) ||
  hasSavedValue(sampling.salinity) ||
  hasSavedValue(sampling.temperatureMorning) || hasSavedValue(sampling.temperatureEvening) || hasSavedValue(sampling.temperature) ||
  hasSavedValue(sampling.waterAppearanceMorning) || hasSavedValue(sampling.waterAppearanceEvening) || hasSavedValue(sampling.waterAppearance) ||
  hasSavedValue(sampling.waterDepthCmMorning) || hasSavedValue(sampling.waterDepthCmEvening) || hasSavedValue(sampling.waterDepthCm) ||
  hasSavedValue(sampling.alkalinity) ||
  hasSavedValue(sampling.ammonia) ||
  hasSavedValue(sampling.weatherEvent) || hasSavedValue(sampling.operationalNotes) ||
  hasSavedValue(sampling.waterExchangePercent) || hasSavedValue(sampling.sludgeLoad) ||
  sampling.surfaceScum !== null && sampling.surfaceScum !== undefined ||
  hasSavedValue(sampling.shrimpBehaviour)
);

const formatConditionLabel = (value: string | null | undefined): string => value
  ? value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase())
  : 'N/A';

export default function WaterQualityPage() {
  const copy = useDashboardCopy();
  const { company } = useAuth();
  const { t } = useLanguage();
  const today = useFarmDateKey(company?.timeZone);
  const [activeView, setActiveView] = useState<WaterPageView>('daily');
  const { save, busy: savePending } = useSaveOperation();
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [downloadingLabReportId, setDownloadingLabReportId] = useState<string | null>(null);
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
    transparencyMorning: '',
    transparencyEvening: '',
    transparency: '',
    salinity: '',
    temperatureMorning: '',
    temperatureEvening: '',
    temperature: '',
    waterAppearanceMorning: '',
    waterAppearanceEvening: '',
    waterAppearance: '',
    waterDepthCmMorning: '',
    waterDepthCmEvening: '',
    waterDepthCm: '',
    alkalinity: '',
    ammonia: '',
    operationalNotes: '',
    weatherEvent: null as Sampling['weatherEvent'],
    waterExchangePercent: '',
    sludgeLoad: null as Sampling['sludgeLoad'],
    surfaceScum: null as boolean | null,
    shrimpBehaviour: null as Sampling['shrimpBehaviour'],
  });
  const [labForm, setLabForm] = useState({
    reportType: 'water_quality' as LabReportType,
    sampleDate: today,
    labName: '',
    farmName: '',
  });
  const [selectedLabPondIds, setSelectedLabPondIds] = useState<string[]>([]);
  const [labRows, setLabRows] = useState<LabPondResult[]>([]);
  const hasPermission = useFarmPermissions();
  const canEditWater = hasPermission('recordPondData');
  const canManageLabReports = hasPermission('manageLabReports');

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

  const waterDrafts = useRef(new Map<string, typeof formData>());
  const [waterSubmitting, setWaterSubmitting] = useState(false);
  const createWaterDraft = (pondId: string, date: string) => {
    const pond = accessiblePonds.find(pond => pond.id === pondId);
    return initializeWaterDraft(pondId, date, pond?.samplings || []);
  };
  const openWaterRecord = (pondId = '') => {
    if (!save.reset()) return;
    waterDrafts.current.clear();
    setFormData(createWaterDraft(pondId, today));
    setModalOpen(true);
  };
  const selectWaterRecord = (pondId: string, date: string) => {
    if (save.busy) return;
    waterDrafts.current.set(`${formData.pondId}:${formData.date}`, formData);
    setFormData(waterDrafts.current.get(`${pondId}:${date}`) || createWaterDraft(pondId, date));
  };

  const handleAddWQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (save.busy) return;
    if (!companyId || !formData.pondId || !user || waterSubmitting) return;
    if (!canEditWater) return;
    if (!accessiblePonds.some((pond) => pond.id === formData.pondId)) return;

    setWaterSubmitting(true);
    if (!save.acquire()) return;
    try {
      const pondRef = doc(db, 'companies', companyId, 'ponds', formData.pondId);
      await runTransaction(db, async transaction => {
        const pondDoc = await transaction.get(pondRef);

        if (!pondDoc.exists()) throw new Error('Pond no longer exists.');
        const pondData = pondDoc.data();
        const samplings = [...(pondData.samplings || [])];
        const existingIndex = samplings.findIndex((record: Sampling) => isDailyWaterRecord(record, formData.date));

        const wqData = {
          cycleId: pondData.cycleId,
          cycleName: pondData.cycleName,
          pondCycleId: pondData.pondCycleId || formData.pondId,
          phMorning: formData.phMorning,
          phEvening: formData.phEvening,
          doMorning: formData.doMorning,
          doEvening: formData.doEvening,
          transparencyMorning: formData.transparencyMorning,
          transparencyEvening: formData.transparencyEvening,
          transparency: formData.transparencyMorning || formData.transparencyEvening || formData.transparency,
          salinity: formData.salinity,
          temperatureMorning: formData.temperatureMorning,
          temperatureEvening: formData.temperatureEvening,
          temperature: formData.temperatureMorning || formData.temperatureEvening || formData.temperature,
          waterAppearanceMorning: formData.waterAppearanceMorning,
          waterAppearanceEvening: formData.waterAppearanceEvening,
          waterAppearance: formData.waterAppearanceMorning || formData.waterAppearanceEvening || formData.waterAppearance,
          waterDepthCmMorning: formData.waterDepthCmMorning,
          waterDepthCmEvening: formData.waterDepthCmEvening,
          waterDepthCm: formData.waterDepthCmMorning || formData.waterDepthCmEvening || formData.waterDepthCm,
          alkalinity: formData.alkalinity,
          waterQualityRecordedByName: user.name || (typeof user.email === 'string' ? user.email.split('@')[0] : '') || '',
          ammonia: formData.ammonia,
          operationalNotes: formData.operationalNotes.trim(),
          weatherEvent: formData.weatherEvent,
          waterExchangePercent: formData.waterExchangePercent,
          sludgeLoad: formData.sludgeLoad,
          surfaceScum: formData.surfaceScum,
          shrimpBehaviour: formData.shrimpBehaviour,
        };

        if (existingIndex >= 0) {
          samplings[existingIndex] = { ...samplings[existingIndex], ...wqData };
        } else {
          samplings.push({
            id: `wq-${Date.now()}`,
            date: formData.date,
            mbw: 0, mortality: 0, feed: 0,
            ...wqData,
          });
        }

        transaction.update(pondRef, removeUndefinedFields({
          samplings,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid
        }));

      });
      setModalOpen(false);
      waterDrafts.current.clear();
    } catch (error) {
      console.error('Error adding water quality:', error);
      alert(copy('Failed to update water quality.'));
    } finally {
      save.release();
      setWaterSubmitting(false);
    }
  };

  const createEmptyLabRow = (pond: Pond): LabPondResult => ({
    pondId: pond.id,
    pondCode: pond.pondName,
    measurementUnits: getManualLabInputUnits(),
    doc: '',
    transparencyCm: '',
    waterQuality: {
      phCustomer: '',
      phLab: '',
      salinityCustomer: '',
      salinityLab: '',
      tan: '',
      nh3: '',
      nh4: '',
      no2: '',
      phosphate: '',
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
    const next = toggleUniqueLabPondRow(
      selectedLabPondIds,
      labRows,
      pond.id,
      () => createEmptyLabRow(pond),
    );
    setSelectedLabPondIds(next.selectedIds);
    setLabRows(next.rows);
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
      measurementUnits: labEntryMode === 'manual' ? getManualLabInputUnits(row.measurementUnits) : row.measurementUnits || {},
      doc: toOptionalNumber(row.doc),
      transparencyCm: toOptionalNumber(row.transparencyCm),
      waterQuality: {
        phCustomer: toOptionalNumber(row.waterQuality?.phCustomer),
        phLab: toOptionalNumber(row.waterQuality?.phLab),
        salinityCustomer: toOptionalNumber(row.waterQuality?.salinityCustomer),
        salinityLab: toOptionalNumber(row.waterQuality?.salinityLab),
        tan: toOptionalNumber(row.waterQuality?.tan),
        nh3: toOptionalNumber(row.waterQuality?.nh3),
        nh4: toOptionalNumber(row.waterQuality?.nh4),
        no2: toOptionalNumber(row.waterQuality?.no2),
        phosphate: toOptionalNumber(row.waterQuality?.phosphate),
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
    measurementUnits: row.measurementUnits || {},
    pondId: row.pondId,
    pondCode: row.pondCode || accessiblePonds.find(pond => pond.id === row.pondId)?.pondName || '',
    doc: toInputString(row.doc),
    transparencyCm: toInputString(row.transparencyCm),
    waterQuality: {
      phCustomer: toInputString(row.waterQuality?.phCustomer),
      phLab: toInputString(row.waterQuality?.phLab),
      salinityCustomer: toInputString(row.waterQuality?.salinityCustomer),
      salinityLab: toInputString(row.waterQuality?.salinityLab),
      tan: toInputString(row.waterQuality?.tan),
      nh3: toInputString(row.waterQuality?.nh3),
      nh4: toInputString(row.waterQuality?.nh4),
      no2: toInputString(row.waterQuality?.no2),
      phosphate: toInputString(row.waterQuality?.phosphate),
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
        message: copy('Available in {time}', { time: formatRemainingTime(resetAtMs - labUsageNowMs) }),
      };
    }
    const startedAtMs = toUsageMillis(usage.startedAt);
    const pendingResetAtMs = usage.status === 'pending' && startedAtMs ? startedAtMs + LAB_PDF_PENDING_MS : null;
    if (pendingResetAtMs && pendingResetAtMs > labUsageNowMs) {
      return {
        disabled: true,
        message: copy('Extraction running ({time})', { time: formatRemainingTime(pendingResetAtMs - labUsageNowMs) }),
      };
    }
    return { disabled: false, message: getLabReportTypeLabel(reportType, copy) };
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
    if (!save.reset()) return;
    resetLabModal();
    setLabForm(prev => ({ ...prev, reportType }));
    setLabModalOpen(true);
  };

  const openLabPdfUpload = (reportType: Exclude<LabReportType, 'combined'>) => {
    if (!save.reset()) return;
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
    if (!save.reset()) return;
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
    if (save.busy) return;
    if (!companyId || !canManageLabReports || !user || !labPdfFile) return;
    const pdfActionState = getPdfActionState(labForm.reportType === 'plankton' ? 'plankton' : 'water_quality');
    if (pdfActionState.disabled) {
      alert(pdfActionState.message);
      return;
    }
    if (labPdfFile.type !== 'application/pdf') {
      alert(copy('Please upload a PDF lab report.'));
      return;
    }

    setLabSubmitting(true);
    if (!save.acquire()) return;
    try {
      const sourceFileHash = await getFileHash(labPdfFile);
      const reportRef = doc(db, 'companies', companyId, 'labReports', save.id(`lab-pdf:${companyId}:${sourceFileHash}`));
      await createRecordOnce(db, reportRef, {
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
      await uploadSaveFile(sourceRef, labPdfFile, {
        contentType: 'application/pdf',
        customMetadata: { companyId, labReportId: reportRef.id, sourceFileHash },
      });
      const sourcePdfUrl = await getDownloadURL(sourceRef);

      await updateRecordOnline(db, reportRef, removeUndefinedFields({
        sourcePdfPath,
        sourcePdfUrl,
        updatedAt: serverTimestamp(),
      }));

      const result = await extractLabReportFromPdf(reportRef.id);
      const rows = (result.data.pondResults || []).map(denormalizeLabRow);
      setEditingLabReportId(reportRef.id);
      setSelectedLabPondIds(rows.map(row => row.pondId));
      setLabRows(rows);
      setLabEntryMode('pdf_upload');
      alert(copy('PDF extraction finished. Review the table, correct any values, then confirm the report.'));
    } catch (error) {
      console.error('Error uploading lab PDF:', error);
      const details = typeof error === 'object' && error && 'details' in error ? error.details as { resetAt?: string } : null;
      if (details?.resetAt) {
        const resetAtMs = new Date(details.resetAt).getTime();
        alert(Number.isNaN(resetAtMs) ? copy('Failed to upload or extract the lab report.') : copy('This PDF extraction is available in {time}.', { time: formatRemainingTime(resetAtMs - Date.now()) }));
      } else {
        alert(copy('Failed to upload or extract the lab report.'));
      }
    } finally {
      save.release();
      setLabSubmitting(false);
    }
  };

  const handleCreateManualLabReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (save.busy) return;
    if (!companyId || !canManageLabReports || selectedLabPondIds.length === 0 || !user) return;
    const accessiblePondIds = new Set(accessiblePonds.map((pond) => pond.id));
    const permittedLabRows = labRows.filter((row) => accessiblePondIds.has(row.pondId));
    if (permittedLabRows.length === 0) return;
    const issues = permittedLabRows.flatMap(row => validateLabRow(labEntryMode === 'manual' ? { ...row, measurementUnits: getManualLabInputUnits(row.measurementUnits) } : row).map(issue => `${row.pondCode}: ${issue}`));
    if (issues.length) { alert(issues.join('\n')); return; }
    setLabSubmitting(true);

    if (!save.acquire()) return;
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
        await updateRecordOnline(db, doc(db, 'companies', companyId, 'labReports', editingLabReportId), removeUndefinedFields(payload));
      } else {
        payload.createdAt = serverTimestamp();
        payload.createdBy = user.uid;
        await createRecordOnce(db, doc(db, 'companies', companyId, 'labReports', save.id(`lab-manual:${companyId}`)), payload);
      }

      save.complete();
      setLabModalOpen(false);
      resetLabModal();
    } catch (error) {
      console.error('Error creating lab report:', error);
      alert(copy('Failed to create lab report.'));
    } finally {
      save.release();
      setLabSubmitting(false);
    }
  };

  const handleDownloadLabReport = async (report: LabReport) => {
    if (downloadingLabReportId) return;
    setDownloadingLabReportId(report.id);
    try {
      const { generateManualLabReportHTML } = await import('@/lib/manualLabReport');
      const { loadMobilePdfBrandAssets, downloadMobilePdf } = await import('@/lib/mobilePdfExport');
      const assets = await loadMobilePdfBrandAssets('landscape');
      await downloadMobilePdf({
        html: generateManualLabReportHTML(report, assets),
        filename: `lab-report-${report.sampleDate || 'undated'}-${report.id.replace(/[^a-zA-Z0-9_-]/g, '')}.pdf`,
        orientation: 'landscape',
      });
    } catch (error) {
      console.error('Error downloading lab report:', error);
      alert(copy('Failed to download the lab report. Please try again.'));
    } finally {
      setDownloadingLabReportId(null);
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
          : copy('No sample date'),
        timestamp: hasValidDate ? parsedDate.getTime() : 0,
        reports: [],
      };
      group.reports.push(report);
      groups.set(key, group);
    });

    return Array.from(groups.values()).sort((a, b) => b.timestamp - a.timestamp);
  }, [company?.timeZone, copy, filteredLabReports]);

  const toggleLabDateGroup = (dateKey: string) => {
    setExpandedLabDateKeys((current) =>
      current.includes(dateKey)
        ? current.filter((key) => key !== dateKey)
        : [...current, dateKey]
    );
  };

  const getSeverityStyle = (status?: LabSeverity) => {
    if (status === 'critical') return { label: copy('Critical'), color: '#991b1b', bg: '#fee2e2' };
    if (status === 'warning') return { label: copy('Warning'), color: '#92400e', bg: '#fef3c7' };
    if (status === 'watch') return { label: copy('Watch'), color: '#0F4C75', bg: '#E0F2FE' };
    return { label: copy('Good'), color: '#166534', bg: '#DCFCE7' };
  };

  const formatLabValue = (value?: string | number | null, suffix = '') => {
    if (value === undefined || value === null || value === '') return 'N/A';
    return `${value}${suffix}`;
  };

  const getLatestWQ = (pond: Pond) => {
    const logs = (pond.samplings || [])
      .filter(hasWaterQualityHistory)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return logs[0] || null;
  };

  const labGridColumns = useMemo(() => getManualLabColumns(labForm.reportType).map(column => ({
    ...column,
    label: column.label.replace(/ \(unit\/basis below\)| \(cm\)| \(ppt\)| %/g, ''),
  })), [labForm.reportType]);

  const mineralPdfActionState = getPdfActionState('water_quality');
  const planktonPdfActionState = getPdfActionState('plankton');
  const activePdfActionState = getPdfActionState(labForm.reportType === 'plankton' ? 'plankton' : 'water_quality');

  return (
    <div className="dashboard-page water-quality-page">
      <div className="water-view-tabs animate-fade-up" role="tablist" aria-label={copy('Water quality view')}>
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
              role="tab"
              aria-selected={active}
              onClick={() => setActiveView(item.id)}
              className={active ? 'is-active' : ''} disabled={savePending}
            >
              <Icon size={15} />
              {copy(item.label)}
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="glass-card dashboard-toolbar-card water-toolbar animate-fade-up animate-delay-1">
        <div className="water-search-field">
          <Search size={17} aria-hidden="true" />
          <input
            placeholder={copy('Search ponds or parameters...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {canEditWater && activeView === 'daily' && (
          <button
            onClick={() => {
              openWaterRecord();
            }}
            className="dashboard-action dashboard-action-primary" disabled={savePending}
          >
            <Plus size={18} />
            <span>{copy('New Parameter Log')}</span>
          </button>
        )}
        {canManageLabReports && activeView === 'lab' && (
          <button
            type="button"
            onClick={() => setLabActionModalOpen(true)}
            className="dashboard-action dashboard-action-primary" disabled={savePending}
          >
            <Plus size={18} />
            <span>{copy('Add Lab Report')}</span>
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
            emptyMessage={copy('No water quality data')}
            getTone={(pond) => getEnterprisePondStatus(pond, company?.timeZone).risk}
            onSelect={(pond) => setSelectedPondForHistory(pond as Pond)}
          />
        ) : (
        <div className="water-pond-grid">
          {filteredPonds.map((pond, idx) => {
            const latest = getLatestWQ(pond);
            const labStyle = getSeverityStyle(pond.latestLabStatus?.status);
            return (
              <article key={pond.id} className={`glass-card ponds-overview-card water-pond-card animate-fade-up animate-delay-${(idx % 4) + 1}`}>
                <div className="ponds-card-header water-pond-header">
                  <div className="water-pond-identity">
                    <div>
                      <h3>{pond.pondName}</h3>
                      <p>
                        {copy('Daily Log')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPondForHistory(pond)}
                    className="water-text-action"
                    aria-label={copy('View {pond} water quality history', { pond: pond.pondName })}
                    title={copy('View history')} disabled={savePending}
                  >
                    {copy('View history')}
                  </button>
                </div>

                {pond.latestLabStatus && (
                  <div className="water-lab-status">
                    <div>
                      <div>
                        <span>{copy('Latest lab')}</span>
                        <strong>{pond.latestLabStatus.mainIssue || copy('Lab report reviewed')}</strong>
                      </div>
                      <span className="water-lab-status-pill" style={{ background: labStyle.bg, color: labStyle.color }}>
                        {labStyle.label}
                      </span>
                    </div>
                  </div>
                )}

                <div className="ponds-card-metrics water-metric-grid">
                  <div className="wq-metric">
                    <span className="wq-label">{copy('pH Level')}</span>
                    <strong className="wq-value">{latest ? `${latest.phMorning || 'N/A'} / ${latest.phEvening || 'N/A'}` : 'N/A'}</strong>
                  </div>
                  <div className="wq-metric">
                    <span className="wq-label">DO (mg/L)</span>
                    <strong className="wq-value">{latest ? `${latest.doMorning || 'N/A'} / ${latest.doEvening || 'N/A'}` : 'N/A'}</strong>
                  </div>
                  <div className="wq-metric">
                    <span className="wq-label">{copy('Temperature')}</span>
                    <strong className="wq-value">{latest ? (
                        hasSavedValue(latest.temperatureMorning) || hasSavedValue(latest.temperatureEvening)
                          ? `${latest.temperatureMorning || 'N/A'} / ${latest.temperatureEvening || 'N/A'} °C`
                          : hasSavedValue(latest.temperature) ? `${latest.temperature} °C` : 'N/A'
                      ) : 'N/A'}</strong>
                  </div>
                  <div className="wq-metric">
                    <span className="wq-label">{copy('Transparency')}</span>
                    <strong className="wq-value">{latest ? (
                        hasSavedValue(latest.transparencyMorning) || hasSavedValue(latest.transparencyEvening)
                          ? `${latest.transparencyMorning || 'N/A'} / ${latest.transparencyEvening || 'N/A'} CM`
                          : hasSavedValue(latest.transparency) ? `${latest.transparency} CM` : 'N/A'
                      ) : 'N/A'}</strong>
                  </div>
                  <div className="wq-metric">
                    <span className="wq-label">{copy('Salinity')}</span>
                    <strong className="wq-value">{latest && hasSavedValue(latest.salinity) ? `${latest.salinity} PPT` : 'N/A'}</strong>
                  </div>
                  <div className="wq-metric">
                    <span className="wq-label">{t.dailyOperationsReports.waterDepth}</span>
                    <strong className="wq-value">{latest ? (
                        hasSavedValue(latest.waterDepthCmMorning) || hasSavedValue(latest.waterDepthCmEvening)
                          ? `${latest.waterDepthCmMorning || 'N/A'} / ${latest.waterDepthCmEvening || 'N/A'} CM`
                          : hasSavedValue(latest.waterDepthCm) ? `${latest.waterDepthCm} CM` : 'N/A'
                      ) : 'N/A'}</strong>
                  </div>
                </div>

                <div className="ponds-card-footer water-pond-actions">
                  <span>{latest ? `${copy('UPDATED')} ${new Date(latest.date).toLocaleDateString()}` : copy('NO DATA LOGGED')}</span>
                  {canEditWater && (
                    <button
                      type="button"
                      onClick={() => openWaterRecord(pond.id)}
                      className="water-quick-log" disabled={savePending}
                    >
                      {copy('Log')}
                    </button>
                  )}
                </div>
              </article>
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
                }} disabled={savePending}
              >
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0' }}>{group.label}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600, marginTop: '2px' }}>
                    {group.reports.length} {copy(group.reports.length === 1 ? 'confirmed report' : 'confirmed reports')}
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
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {report.labName || copy('Lab Report')}
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600 }}>
                          {report.sampleDate ? new Date(report.sampleDate).toLocaleDateString() : copy('No sample date')} · {pondCount} {copy(pondCount === 1 ? 'pond' : 'ponds')}
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
                              fontWeight: 600,
                            }}
                          >
                            {row.pondCode || `${copy('Pond')} ${rowIndex + 1}`} · {rowStyle.label}
                          </span>
                        );
                      })}
                      {(report.pondResults || []).length > 8 && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, padding: '5px 0' }}>
                          +{(report.pondResults || []).length - 8} {copy('more')}
                        </span>
                      )}
                      {(report.pondResults || []).length === 0 && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>{copy('No pond rows')}</span>
                      )}
                    </div>
                    {report.insights?.ownerSummary && (
                      <div style={{ marginTop: '10px', color: 'var(--text-primary)', fontSize: '0.86rem', fontWeight: 600, lineHeight: 1.5 }}>
                        {report.insights.ownerSummary}
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{copy('Report Type')}</div>
                    <div style={{ marginTop: 6, fontWeight: 600, color: 'var(--text-primary)' }}>{getLabReportTypeLabel(report.reportType, copy)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{copy('Processing')}</div>
                    <div style={{ marginTop: 6, fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{copy(report.processing?.status || report.status || 'pending')}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <span style={{ borderRadius: 999, padding: '7px 12px', background: style.bg, color: style.color, fontSize: '0.74rem', fontWeight: 600 }}>
                      {style.label}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
                      {(report.summary?.warningCount || 0) + (report.summary?.criticalCount || 0)} {copy('alert row(s)')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setExpandedLabReportId(isExpanded ? null : report.id)}
                      className="btn-secondary"
                      style={{ padding: '8px 12px', fontSize: '0.76rem' }} disabled={savePending}
                    >
                      {copy(isExpanded ? 'Hide Details' : 'Details')}
                    </button>
                    {canManageLabReports && report.status !== 'confirmed' && (
                      <button
                        type="button"
                        onClick={() => openLabReportReview(report)}
                        className="btn-secondary"
                        style={{ padding: '8px 12px', fontSize: '0.76rem' }} disabled={savePending}
                      >
                        {copy('Review & Confirm')}
                      </button>
                    )}
                    {(report.entryMode || 'manual') === 'manual' && report.reportType === 'plankton' && (
                      <button type="button" className="btn-secondary"
                        disabled={savePending || (downloadingLabReportId !== null)}
                        onClick={() => handleDownloadLabReport(report)}
                        style={{ padding: '8px 12px', fontSize: '0.76rem' }}>
                        {copy(downloadingLabReportId === report.id ? 'Generating PDF...' : 'Download PDF')}
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
                          fontWeight: 600,
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
                        {copy('View PDF')}
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
                              <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{row.pondCode || `${copy('Pond')} ${rowIndex + 1}`}</div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: 600 }}>{getLabReportTypeLabel(report.reportType, copy)}</div>
                            </div>
                            {report.sourcePdfUrl && (
                              <a href={report.sourcePdfUrl} target="_blank" rel="noreferrer" style={{ borderRadius: '10px', padding: '7px 10px', background: 'var(--primary)', color: '#fff', fontSize: '0.72rem', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                <ExternalLink size={12} />
                                PDF
                              </a>
                            )}
                          </div>
                          {report.reportType !== 'plankton' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              {[
                                [labMeasurementLabel('tan', row.measurementUnits), formatLabValue(water.tan)],
                                [labMeasurementLabel('nh3', row.measurementUnits), formatLabValue(water.nh3)],
                                [labMeasurementLabel('tom', row.measurementUnits), formatLabValue(water.tom)],
                                [labMeasurementLabel('nh4', row.measurementUnits), formatLabValue(water.nh4)],
                                [labMeasurementLabel('no2', row.measurementUnits), formatLabValue(water.no2)],
                                [labMeasurementLabel('phosphate', row.measurementUnits), formatLabValue(water.phosphate)],
                                [labMeasurementLabel('alkalinityTotal', row.measurementUnits), formatLabValue(water.alkalinityTotal)],
                                [labMeasurementLabel('hardnessCa', row.measurementUnits), formatLabValue(water.hardnessCa)],
                                [labMeasurementLabel('hardnessMg', row.measurementUnits), formatLabValue(water.hardnessMg)],
                                [labMeasurementLabel('hardnessTotal', row.measurementUnits), formatLabValue(water.hardnessTotal)],
                                ['Vibrio', formatLabValue(micro.vibrioTotal)],
                              ].map(([label, value]) => (
                                <div key={label} style={{ background: '#fff', borderRadius: '10px', border: '1px solid var(--border)', padding: '10px' }}>
                                  <div style={{ color: 'var(--text-faint)', fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
                                  <div style={{ color: 'var(--text-primary)', fontSize: '0.86rem', fontWeight: 600, marginTop: '4px' }}>{value}</div>
                                </div>
                              ))}
                            </div>
                          )}
                          {(report.reportType === 'plankton' || report.reportType === 'combined') && (
                            <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid var(--border)', padding: '10px' }}>
                              <div style={{ color: 'var(--text-faint)', fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase' }}>Plankton</div>
                              <div style={{ color: 'var(--text-primary)', fontSize: '0.86rem', fontWeight: 600, marginTop: '4px' }}>{formatLabValue(plankton.totalCellPerMl)} cells/ml</div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, marginTop: '6px', lineHeight: 1.45 }}>
                                {copy('Green')} {formatLabValue(plankton.chlorophytaPercent, '%')} · {copy('Blue-green')} {formatLabValue(plankton.cyanophytaPercent, '%')} · {copy('Golden')} {formatLabValue(plankton.chrysophytaPercent, '%')}
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
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>{copy('No lab reports yet')}</h3>
              <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{copy('Add a manual report or upload a lab PDF for assisted extraction and review.')}</p>
            </div>
          )}
        </div>
      )}

      {/* -- HISTORY DRAWER ------------------------------ */}
      {selectedPondForHistory && (
        <div className="responsive-side-drawer-overlay water-history-overlay" style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'flex-end' }}>
          <div className="drawer-content responsive-side-drawer water-history-drawer animate-slide-left">
            <div className="responsive-modal-header" style={{ padding: '26px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-mid)' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 600, fontFamily: "var(--jakarta)", color: 'var(--text-primary)' }}>
                  {selectedPondForHistory.pondName} {copy('Water Quality History')}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
                  {copy('Historical environmental logs and parameter readings')}
                </p>
              </div>
              <button onClick={() => setSelectedPondForHistory(null)} className="icon-btn-modern" disabled={savePending}>
                <X size={20} />
              </button>
            </div>

            <div className="responsive-modal-body water-history-body" style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {selectedPondForHistory.samplings
                  .filter(hasWaterQualityHistory)
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((log, i) => (
                    <div key={i} className="glass-card" style={{ padding: '18px', background: '#FFF' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px', letterSpacing: '-0.01em' }}>{new Date(log.date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        <div style={{ fontSize: '0.6rem', padding: '4px 10px', borderRadius: '100px', background: 'var(--primary-dim)', color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{copy('Record Entry')}</div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <div className="wq-metric-small">
                          <span className="wq-label-small">{copy('pH Levels')}</span>
                          <span className="wq-val-small">{log.phMorning || 'N/A'} <span style={{ color: 'var(--text-faint)' }}>AM</span> / {log.phEvening || 'N/A'} <span style={{ color: 'var(--text-faint)' }}>PM</span></span>
                        </div>
                        <div className="wq-metric-small">
                          <span className="wq-label-small">{copy('Dissolved Oxygen')}</span>
                          <span className="wq-val-small">{log.doMorning || 'N/A'} <span style={{ color: 'var(--text-faint)' }}>AM</span> / {log.doEvening || 'N/A'} <span style={{ color: 'var(--text-faint)' }}>PM</span></span>
                        </div>
                        <div className="wq-metric-small">
                          <span className="wq-label-small">{copy('Temperature')}</span>
                          <span className="wq-val-small">{hasSavedValue(log.temperatureMorning) || hasSavedValue(log.temperatureEvening) ? `${log.temperatureMorning || 'N/A'} AM / ${log.temperatureEvening || 'N/A'} PM °C` : hasSavedValue(log.temperature) ? `${log.temperature} °C` : 'N/A'}</span>
                        </div>
                        <div className="wq-metric-small">
                          <span className="wq-label-small">{copy('Transparency')}</span>
                          <span className="wq-val-small">{hasSavedValue(log.transparencyMorning) || hasSavedValue(log.transparencyEvening) ? `${log.transparencyMorning || 'N/A'} AM / ${log.transparencyEvening || 'N/A'} PM CM` : hasSavedValue(log.transparency) ? `${log.transparency} CM` : 'N/A'}</span>
                        </div>
                        <div className="wq-metric-small">
                          <span className="wq-label-small">{copy('Salinity')}</span>
                          <span className="wq-val-small">{hasSavedValue(log.salinity) ? `${log.salinity} PPT` : 'N/A'}</span>
                        </div>
                        <div className="wq-metric-small">
                          <span className="wq-label-small">{t.dailyOperationsReports.waterAppearance}</span>
                          <span className="wq-val-small">{hasSavedValue(log.waterAppearanceMorning) || hasSavedValue(log.waterAppearanceEvening) ? `${log.waterAppearanceMorning || 'N/A'} AM / ${log.waterAppearanceEvening || 'N/A'} PM` : hasSavedValue(log.waterAppearance) ? log.waterAppearance : 'N/A'}</span>
                        </div>
                        <div className="wq-metric-small">
                          <span className="wq-label-small">{t.dailyOperationsReports.waterDepth}</span>
                          <span className="wq-val-small">{hasSavedValue(log.waterDepthCmMorning) || hasSavedValue(log.waterDepthCmEvening) ? `${log.waterDepthCmMorning || 'N/A'} AM / ${log.waterDepthCmEvening || 'N/A'} PM CM` : hasSavedValue(log.waterDepthCm) ? `${log.waterDepthCm} CM` : 'N/A'}</span>
                        </div>
                        <div className="wq-metric-small">
                          <span className="wq-label-small">{t.dailyOperationsReports.alkalinity}</span>
                          <span className="wq-val-small">{hasSavedValue(log.alkalinity) ? `${log.alkalinity} PPM` : 'N/A'}</span>
                        </div>
                        <div className="wq-metric-small">
                          <span className="wq-label-small">{copy('Ammonia (TAN)')}</span>
                          <span className="wq-val-small">{hasSavedValue(log.ammonia) ? `${log.ammonia} mg/L` : 'N/A'}</span>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
                        <div className="wq-metric-small">
                          <span className="wq-label-small">{copy('Weather')}</span>
                          <span className="wq-val-small">{copy(formatConditionLabel(log.weatherEvent))}</span>
                        </div>
                        <div className="wq-metric-small">
                          <span className="wq-label-small">{copy('Water Exchange')}</span>
                          <span className="wq-val-small">{hasSavedValue(log.waterExchangePercent) ? `${log.waterExchangePercent}%` : 'N/A'}</span>
                        </div>
                        <div className="wq-metric-small">
                          <span className="wq-label-small">{copy('Sludge Load')}</span>
                          <span className="wq-val-small">{copy(formatConditionLabel(log.sludgeLoad))}</span>
                        </div>
                        <div className="wq-metric-small">
                          <span className="wq-label-small">{copy('Surface Scum')}</span>
                          <span className="wq-val-small">{log.surfaceScum === null || log.surfaceScum === undefined ? 'N/A' : copy(log.surfaceScum ? 'Present' : 'Not observed')}</span>
                        </div>
                        <div className="wq-metric-small">
                          <span className="wq-label-small">{copy('Shrimp Behavior')}</span>
                          <span className="wq-val-small">{copy(formatConditionLabel(log.shrimpBehaviour))}</span>
                        </div>
                      </div>
                      {log.operationalNotes && <p style={{ margin: '14px 0 0', color: 'var(--text-muted)', fontSize: '13px', whiteSpace: 'pre-wrap' }}>{log.operationalNotes}</p>}
                    </div>
                  ))
                }
                {!selectedPondForHistory.samplings.some(hasWaterQualityHistory) && (
                   <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                     <Info size={40} style={{ marginBottom: '16px', opacity: 0.3 }} />
                     <p style={{ fontWeight: 600 }}>{copy('No environmental records found for this pond.')}</p>
                   </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -- LAB REPORT ACTION MODAL --------------------- */}
      {isLabActionModalOpen && (
        <div className="responsive-modal-overlay water-lab-action-overlay">
          <div className="glass-card responsive-modal animate-fade-up water-lab-action-modal">
            <div className="responsive-modal-header water-lab-action-header">
              <div>
                <h2>{copy('Add Lab Report')}</h2>
                <p>{copy('Upload a PDF or enter results manually.')}</p>
              </div>
              <button onClick={() => setLabActionModalOpen(false)} className="water-modal-close" aria-label={copy('Close lab report options')} disabled={savePending}>
                <X size={18} />
              </button>
            </div>
            <div className="responsive-modal-body water-lab-action-body">
              <section>
                <div className="water-lab-action-label">{copy('Upload PDF')}</div>
                <div className="water-lab-action-grid">
                  <button
                    type="button"
                    disabled={savePending || (mineralPdfActionState.disabled)}
                    onClick={() => {
                      setLabActionModalOpen(false);
                      openLabPdfUpload('water_quality');
                    }}
                    className="water-lab-action-option"
                    style={{ opacity: mineralPdfActionState.disabled ? 0.48 : 1, cursor: mineralPdfActionState.disabled ? 'not-allowed' : 'pointer' }}
                  >
                    <FileText size={16} />
                    <span>
                      <span>{copy('Mineral PDF')}</span>
                      <small>{mineralPdfActionState.message}</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={savePending || (planktonPdfActionState.disabled)}
                    onClick={() => {
                      setLabActionModalOpen(false);
                      openLabPdfUpload('plankton');
                    }}
                    className="water-lab-action-option"
                    style={{ opacity: planktonPdfActionState.disabled ? 0.48 : 1, cursor: planktonPdfActionState.disabled ? 'not-allowed' : 'pointer' }}
                  >
                    <FileText size={16} />
                    <span>
                      <span>{copy('Plankton PDF')}</span>
                      <small>{planktonPdfActionState.message}</small>
                    </span>
                  </button>
                </div>
              </section>
              <section>
                <div className="water-lab-action-label">{copy('Manual Entry')}</div>
                <div className="water-lab-action-grid">
                  <button
                    type="button"
                    onClick={() => {
                      setLabActionModalOpen(false);
                      openNewLabReport('water_quality');
                    }}
                    className="water-lab-action-option" disabled={savePending}
                  >
                    <Plus size={16} />
                    <span>{copy('Manual Mineral')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLabActionModalOpen(false);
                      openNewLabReport('plankton');
                    }}
                    className="water-lab-action-option" disabled={savePending}
                  >
                    <Plus size={16} />
                    <span>{copy('Manual Plankton')}</span>
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* -- LAB REPORT MODAL --------------------------------- */}
      {isLabModalOpen && (
        <div className="responsive-modal-overlay water-lab-form-overlay">
          <div className="glass-card responsive-modal animate-fade-up water-lab-form-modal">
            <div className="responsive-modal-header water-lab-form-header">
              <div>
                <h2>{copy(editingLabReportId ? 'Review Lab Report' : 'Add Lab Report')}</h2>
                <p>{copy('Enter results manually or upload a lab PDF, then review before confirmation.')}</p>
              </div>
              <button onClick={() => setLabModalOpen(false)} className="water-modal-close" aria-label={copy('Close lab report form')} disabled={savePending}>
                <X size={18} />
              </button>
            </div>

            <form className="responsive-modal-body water-lab-form-body" onSubmit={handleCreateManualLabReport}><fieldset disabled={savePending} style={{ display: 'contents' }}>
              <div className="water-lab-form-fields">
                <div className="water-lab-form-field">
                  <label className="form-label">{copy('Entry Mode')}</label>
                  <div className="water-entry-mode-tabs">
                    {([
                      ['manual', 'Manual'],
                      ['pdf_upload', 'PDF'],
                    ] as [LabEntryMode, string][]).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        disabled={savePending || (Boolean(editingLabReportId))}
                        onClick={() => setLabEntryMode(mode)}
                        className={labEntryMode === mode ? 'is-active' : ''}
                        style={{ cursor: editingLabReportId ? 'default' : 'pointer' }}
                      >
                        {copy(label)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="water-lab-form-field">
                  <label className="form-label">{copy('Report Type')}</label>
                  <select value={labForm.reportType} onChange={e => setLabForm({ ...labForm, reportType: e.target.value as LabReportType })} className="form-input">
                    {labForm.reportType === 'combined' && <option value="combined">{copy('Combined Lab Report')}</option>}
                    <option value="water_quality">{copy('Mineral Quality')}</option>
                    <option value="plankton">Plankton</option>
                  </select>
                </div>
                <div className="water-lab-form-field">
                  <label className="form-label">{copy('Sample Date')}</label>
                  <input type="date" required value={labForm.sampleDate} onChange={e => setLabForm({ ...labForm, sampleDate: e.target.value })} className="form-input" />
                </div>
                <div className="water-lab-form-field">
                  <label className="form-label">{copy('Lab Name')}</label>
                  <input value={labForm.labName} onChange={e => setLabForm({ ...labForm, labName: e.target.value })} placeholder={copy('Farm kit / lab name')} className="form-input" />
                </div>
              </div>

              {labEntryMode === 'pdf_upload' && !editingLabReportId && (
                <div className="water-pdf-upload-row">
                  <div className="water-pdf-upload-copy">
                    <label className="form-label">{copy('Upload Lab PDF')}</label>
                    <div className="water-pdf-file-control">
                      <input
                        className="water-pdf-file-input"
                        type="file"
                        accept="application/pdf"
                        onChange={e => setLabPdfFile(e.target.files?.[0] || null)}
                      />
                      {labPdfFile && (
                        <span className="water-pdf-file-success" role="status" aria-label={`${labPdfFile.name} ${copy('selected')}`}>
                          <CheckCircle2 size={17} />
                        </span>
                      )}
                    </div>
                    <p>{copy('Creates a draft for review. The report is not confirmed automatically.')}</p>
                  </div>
                  <button
                    type="button"
                    disabled={savePending || (labSubmitting || !labPdfFile || activePdfActionState.disabled)}
                    onClick={handleUploadLabPdf}
                    className="water-lab-primary-button water-upload-extract-button"
                  >
                    {labSubmitting ? copy('Extracting...') : activePdfActionState.disabled ? activePdfActionState.message : copy('Upload & Extract')}
                  </button>
                </div>
              )}

              <section className="water-included-ponds">
                <div className="water-included-ponds-heading">
                  <div>
                    <h3>{copy('Included Ponds')}</h3>
                    <p>{copy('Select every pond covered by this lab report.')}</p>
                  </div>
                  <span>{selectedLabPondIds.length} {copy('selected')}</span>
                </div>
                <div className="water-pond-selector-grid">
                  {accessiblePonds.map(pond => {
                    const selected = selectedLabPondIds.includes(pond.id);
                    return (
                      <button
                        key={pond.id}
                        type="button"
                        onClick={() => toggleLabPond(pond)}
                        className={selected ? 'is-selected' : ''} disabled={savePending}
                      >
                        <span>{pond.pondName}</span>
                        {selected && <CheckCircle2 size={16} />}
                      </button>
                    );
                  })}
                </div>
              </section>

              {labRows.length > 0 && (
                <div>
                  <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '14px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: labForm.reportType === 'plankton' ? '2200px' : labForm.reportType === 'combined' ? '2800px' : '1280px' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-mid)' }}>
                          {['Pond', ...labGridColumns.map(column => column.label)].map(label => (
                            <th key={label} style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{copy(label)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {labRows.map(row => (
                          <tr key={row.pondId}>
                            <td style={{ padding: '8px', fontWeight: 600, minWidth: 90, textAlign: 'center', verticalAlign: 'middle' }}>{row.pondCode}</td>
                            {labGridColumns.map(({ label, path, inputType = 'number' }) => {
                              const field = path[0] === 'waterQuality' ? LAB_WATER_FIELDS[path[1]] : null;
                              const units = row.measurementUnits?.[path[1]];
                              const inputUnit = field
                                ? units?.unit || (labEntryMode === 'manual' ? field.unit : '')
                                : path[0] === 'transparencyCm' ? 'cm'
                                : path[1]?.endsWith('Percent') ? '%'
                                : path[1]?.endsWith('CellPerMl') ? 'cells/mL' : '';
                              const setUnits = (unit: string, basis: string) => setLabRows(previous => previous.map(item => item.pondId !== row.pondId ? item : { ...item, measurementUnits: { ...item.measurementUnits, [path[1]]: { unit, basis } } }));
                              const sectionValue = row[path[0] as keyof LabPondResult];
                              const value = path.length === 1
                                ? (sectionValue as string | undefined)
                                : (typeof sectionValue === 'object' && sectionValue ? (sectionValue as Record<string, string | undefined>)[path[1]] : undefined);
                              return (
                                <td key={path.join('.')} style={{ padding: '6px', borderTop: '1px solid var(--border)', textAlign: 'center', verticalAlign: 'middle' }}>
                                  <div className="water-lab-value-input" style={{ width: inputType === 'text' ? '170px' : inputUnit === 'cells/mL' ? '112px' : '86px', margin: '0 auto' }}>
                                  <input
                                    type={inputType}
                                    aria-label={`${row.pondCode} ${label}${inputUnit ? ` (${inputUnit})` : ''}`}
                                    title={field ? labMeasurementLabel(path[1], row.measurementUnits) : label}
                                    min={inputType === 'number' ? 0 : undefined}
                                    max={field?.max ?? (path[1]?.endsWith('Percent') ? 100 : undefined)}
                                    step={inputType === 'number' ? 'any' : undefined}
                                    value={value || ''}
                                    onChange={e => updateLabRow(row.pondId, path, e.target.value)}
                                  />
                                  {inputUnit && <span aria-hidden="true">{inputUnit}</span>}
                                  </div>
                                  {field && labEntryMode === 'pdf_upload' && <div style={{ display: 'grid', gap: 4, marginTop: 6, width: inputType === 'text' ? '170px' : inputUnit === 'cells/mL' ? '112px' : '86px', margin: '6px auto 0' }}>
                                    <select aria-label={`${row.pondCode} ${field.label} unit`} value={units?.unit || ''} onChange={e => setUnits(e.target.value, units?.basis || '')}>
                                      <option value="">Select unit</option>
                                      {[...new Set([field.unit, ...(field.unit === 'mg/L' ? ['µg/L', 'ppm'] : []), ...(units?.unit ? [units.unit] : [])])].map(unit => <option key={unit}>{unit}</option>)}
                                    </select>
                                    <select aria-label={`${row.pondCode} ${field.label} basis`} value={units?.basis || ''} onChange={e => setUnits(units?.unit || field.unit, e.target.value)}>
                                      <option value="">Select basis</option>
                                      {[...new Set([...field.bases, ...(units?.basis ? [units.basis] : [])])].map(basis => <option key={basis} value={basis}>{`as ${basis}`}</option>)}
                                    </select>
                                  </div>}
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

              <div className="water-lab-form-footer">
                <button type="button" onClick={() => setLabModalOpen(false)} className="water-lab-cancel-button" disabled={savePending}>{copy('Cancel')}</button>
                <button type="submit" disabled={savePending || (labSubmitting || selectedLabPondIds.length === 0 || labRows.some(row => validateLabRow(labEntryMode === 'manual' ? { ...row, measurementUnits: getManualLabInputUnits(row.measurementUnits) } : row).length > 0))} className="water-lab-primary-button water-confirm-lab-button">
                  {copy(labSubmitting ? 'Saving...' : 'Confirm Lab Report')}
                </button>
              </div>
            </fieldset></form>
          </div>
        </div>
      )}

      {/* -- LOG MODAL ------------------------------------------ */}
      {isModalOpen && (
        <div className="responsive-modal-overlay water-log-overlay">
          <div className="glass-card responsive-modal animate-fade-up water-log-modal">
            <div className="responsive-modal-header water-log-header">
              <div>
                <h2>{copy('Log Parameters')}</h2>
                <p>{copy('Sync environmental readings with Orson AI.')}</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="water-modal-close" aria-label={copy('Close parameter log')} disabled={savePending}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddWQ} className="water-log-form"><fieldset disabled={savePending} style={{ display: 'contents' }}>
              <div className="responsive-modal-body water-log-form-grid">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', gridColumn: 'span 2' }}>
                  <label className="form-label">{copy('Target Pond')}</label>
                  <select
                    required
                    value={formData.pondId}
                    onChange={e => selectWaterRecord(e.target.value, formData.date)}
                    className="form-input"
                  >
                    <option value="">{copy('Select a pond asset...')}</option>
                    {accessiblePonds.map(p => <option key={p.id} value={p.id}>{p.pondName}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <label className="form-label">{copy('Date')}</label>
                  <input type="date" value={formData.date} onChange={e => selectWaterRecord(formData.pondId, e.target.value)} className="form-input" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <label className="form-label">{copy('Salinity (PPT)')}</label>
                  <input type="number" step="0.1" placeholder="N/A" value={formData.salinity} onChange={e => setFormData({...formData, salinity: e.target.value})} className="form-input" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <label className="form-label">{copy('Temperature (Morning) (°C)')}</label>
                  <input type="number" step="0.1" placeholder="N/A" value={formData.temperatureMorning} onChange={e => setFormData({...formData, temperatureMorning: e.target.value})} className="form-input" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <label className="form-label">{copy('Temperature (Evening) (°C)')}</label>
                  <input type="number" step="0.1" placeholder="N/A" value={formData.temperatureEvening} onChange={e => setFormData({...formData, temperatureEvening: e.target.value})} className="form-input" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <label className="form-label">{copy('pH (Morning)')}</label>
                  <input type="number" step="0.1" placeholder="N/A" value={formData.phMorning} onChange={e => setFormData({...formData, phMorning: e.target.value})} className="form-input" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <label className="form-label">{copy('pH (Evening)')}</label>
                  <input type="number" step="0.1" placeholder="N/A" value={formData.phEvening} onChange={e => setFormData({...formData, phEvening: e.target.value})} className="form-input" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <label className="form-label">{copy('DO (Morning) mg/L')}</label>
                  <input type="number" step="0.1" placeholder="N/A" value={formData.doMorning} onChange={e => setFormData({...formData, doMorning: e.target.value})} className="form-input" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <label className="form-label">{copy('DO (Evening) mg/L')}</label>
                  <input type="number" step="0.1" placeholder="N/A" value={formData.doEvening} onChange={e => setFormData({...formData, doEvening: e.target.value})} className="form-input" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <label className="form-label">{copy('Transparency (Morning) (CM)')}</label>
                  <input type="number" placeholder="N/A" value={formData.transparencyMorning} onChange={e => setFormData({...formData, transparencyMorning: e.target.value})} className="form-input" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <label className="form-label">{copy('Transparency (Evening) (CM)')}</label>
                  <input type="number" placeholder="N/A" value={formData.transparencyEvening} onChange={e => setFormData({...formData, transparencyEvening: e.target.value})} className="form-input" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <label className="form-label">{copy('Water Appearance (Morning)')}</label>
                  <input type="text" maxLength={40} placeholder="N/A" value={formData.waterAppearanceMorning} onChange={e => setFormData({...formData, waterAppearanceMorning: e.target.value})} className="form-input" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <label className="form-label">{copy('Water Appearance (Evening)')}</label>
                  <input type="text" maxLength={40} placeholder="N/A" value={formData.waterAppearanceEvening} onChange={e => setFormData({...formData, waterAppearanceEvening: e.target.value})} className="form-input" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <label className="form-label">{copy('Water Depth (Morning) (CM)')}</label>
                  <input type="number" min="0" step="0.1" placeholder="N/A" value={formData.waterDepthCmMorning} onChange={e => setFormData({...formData, waterDepthCmMorning: e.target.value})} className="form-input" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <label className="form-label">{copy('Water Depth (Evening) (CM)')}</label>
                  <input type="number" min="0" step="0.1" placeholder="N/A" value={formData.waterDepthCmEvening} onChange={e => setFormData({...formData, waterDepthCmEvening: e.target.value})} className="form-input" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', gridColumn: 'span 2' }}>
                  <label className="form-label">{t.dailyOperationsReports.alkalinity} (PPM)</label>
                  <input type="number" min="0" step="0.1" placeholder="N/A" value={formData.alkalinity} onChange={e => setFormData({...formData, alkalinity: e.target.value})} className="form-input" />
                </div>

                <div className="water-optional-heading">
                  <strong>{copy('Optional Pond Conditions')}</strong>
                  <span>{copy('Add only what was directly observed today.')}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <label className="form-label">{copy('Ammonia (TAN) (mg/L)')}</label>
                  <input type="number" min="0" step="0.01" placeholder="N/A" value={formData.ammonia} onChange={e => setFormData({...formData, ammonia: e.target.value})} className="form-input" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <label className="form-label">{copy('Water Exchange (%)')}</label>
                  <input type="number" step="0.1" placeholder="N/A" value={formData.waterExchangePercent} onChange={e => setFormData({...formData, waterExchangePercent: e.target.value})} className="form-input" />
                </div>

                <div className="water-condition-group">
                  <label className="form-label">{copy('Weather Event')}</label>
                  <div className="water-condition-options">
                    {([['rain', 'Rain'], ['heavy_rain', 'Heavy Rain'], ['sudden_cloud', 'Sudden Cloud']] as const).map(([value, label]) => (
                      <button
                        type="button"
                        key={value}
                        className={`water-condition-option ${formData.weatherEvent === value ? 'selected' : ''}`}
                        onClick={() => setFormData(prev => ({ ...prev, weatherEvent: prev.weatherEvent === value ? null : value }))} disabled={savePending}
                      >{copy(label)}</button>
                    ))}
                  </div>
                </div>

                <div className="water-condition-group">
                  <label className="form-label">{copy('Sludge Load')}</label>
                  <div className="water-condition-options">
                    {([['low', 'Low'], ['moderate', 'Moderate'], ['high', 'High']] as const).map(([value, label]) => (
                      <button
                        type="button"
                        key={value}
                        className={`water-condition-option ${formData.sludgeLoad === value ? 'selected' : ''}`}
                        onClick={() => setFormData(prev => ({ ...prev, sludgeLoad: prev.sludgeLoad === value ? null : value }))} disabled={savePending}
                      >{copy(label)}</button>
                    ))}
                  </div>
                </div>

                <div className="water-condition-group">
                  <label className="form-label">{copy('Surface Scum')}</label>
                  <div className="water-condition-options">
                    {([[true, 'Observed'], [false, 'Not observed']] as const).map(([value, label]) => (
                      <button
                        type="button"
                        key={String(value)}
                        className={`water-condition-option ${formData.surfaceScum === value ? 'selected' : ''}`}
                        onClick={() => setFormData(prev => ({ ...prev, surfaceScum: prev.surfaceScum === value ? null : value }))} disabled={savePending}
                      >{copy(label)}</button>
                    ))}
                  </div>
                </div>

                <div className="water-condition-group">
                  <label className="form-label">{copy('Shrimp Behaviour')}</label>
                  <div className="water-condition-options">
                    {([['normal', 'Normal'], ['abnormal', 'Abnormal']] as const).map(([value, label]) => (
                      <button
                        type="button"
                        key={value}
                        className={`water-condition-option ${formData.shrimpBehaviour === value ? 'selected' : ''}`}
                        onClick={() => setFormData(prev => ({ ...prev, shrimpBehaviour: prev.shrimpBehaviour === value ? null : value }))} disabled={savePending}
                      >{copy(label)}</button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', gridColumn: 'span 2' }}>
                  <label className="form-label">{copy('Operational Notes')}</label>
                  <textarea
                    rows={3}
                    maxLength={1000}
                    placeholder={copy('Aeration, rain impact, water exchange, treatments, or other observed work')}
                    value={formData.operationalNotes}
                    onChange={e => setFormData({...formData, operationalNotes: e.target.value})}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="responsive-modal-footer water-log-footer">
                <button type="button" onClick={() => setModalOpen(false)} style={{
                  flex: 1, borderRadius: '10px', border: '1px solid var(--border)',
                  background: 'transparent', fontWeight: 600, cursor: 'pointer'
                }} disabled={savePending}>{copy('Cancel')}</button>
                <button type="submit" disabled={savePending || (!formData.pondId || waterSubmitting)} className="water-save-log-button">{copy('Save Log Entry')}</button>
              </div>
            </fieldset></form>
          </div>
        </div>
      )}

      <style jsx>{`
        .water-lab-value-input {
          display: flex;
          align-items: center;
          gap: 4px;
          min-height: 40px;
          padding: 0 8px;
          border: 1px solid var(--border);
          border-radius: 9px;
          background: var(--bg-card, #fff);
        }
        .water-lab-value-input:focus-within {
          border-color: var(--primary);
        }
        .water-lab-value-input input {
          width: 100%;
          min-width: 0;
          padding: 8px 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--text-primary);
          font: inherit;
          font-weight: 600;
          appearance: textfield;
        }
        .water-lab-value-input input::-webkit-inner-spin-button,
        .water-lab-value-input input::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .water-lab-value-input span {
          flex-shrink: 0;
          color: var(--text-muted);
          font-size: 11px;
          pointer-events: none;
        }

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
          font-weight: 600;
          color: var(--text-faint);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .wq-value {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.1rem;
          font-weight: 600;
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
        @media (max-width: 640px) {
          .water-history-drawer {
            width: 100% !important;
            max-width: 100% !important;
          }
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
          font-weight: 600;
          color: var(--text-faint);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .wq-val-small {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .form-label {
          font-size: 0.8rem;
          font-weight: 600;
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
        .water-optional-heading {
          grid-column: span 2;
          border-top: 1px solid var(--border);
          padding-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          color: var(--text-primary);
        }
        .water-optional-heading span {
          color: var(--text-faint);
          font-size: 0.8rem;
          font-weight: 600;
        }
        .water-condition-group {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }
        .water-condition-options {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }
        .water-condition-option {
          border: 1px solid var(--border);
          background: var(--bg-mid);
          color: var(--text-muted);
          border-radius: 999px;
          padding: 9px 12px;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
        }
        .water-condition-option.selected {
          background: var(--primary);
          border-color: var(--primary);
          color: #FFF;
        }
        @media (max-width: 640px) {
          .water-optional-heading {
            grid-column: span 1;
          }
        }
      `}</style>
    </div>
  );
}
