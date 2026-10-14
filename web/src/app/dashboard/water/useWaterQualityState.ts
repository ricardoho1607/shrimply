"use client";
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardCopy } from '@/hooks/useDashboardCopy';
import { useCompanyBlocks, useCompanyId, useCompanyLabPdfUsage, useCompanyLabReports, useCompanyPonds } from '@/hooks/useDashboardData';
import { useFarmDateKey } from '@/hooks/useFarmDateKey';
import { useFarmPermissions } from '@/hooks/useFarmPermissions';
import { useEffect, useMemo, useState } from 'react';
import {
  filterEnterpriseRecordsForUser,
  isEnterpriseOwner,
  type FarmBlock
} from "../../../../../shared/enterpriseBlocks";
import { useSaveOperation } from "../../../../../shared/useSaveOperation";
import { LabEntryMode, LabPdfUsage, LabPondResult, LabReport, LabReportType, Pond, Sampling, WaterPageView } from './WaterQualityModel';


export function useWaterQualityState() {
  const copy = useDashboardCopy();

  const { user, company } = useCompanyId();

  const { t } = useLanguage();

  const today = useFarmDateKey(company?.timeZone);

  const [sopTimes, setSopTimes] = useState<Record<string, string>>({});

  const [activeView, setActiveView] = useState<WaterPageView>('daily');

  const { save, busy: savePending } = useSaveOperation();

  const { data: companyPonds, loading, companyId } = useCompanyPonds<Pond>();

  const ponds = useMemo(() => companyPonds.filter(pond => pond.cycleStatus !== 'ended'), [companyPonds]);

  const [downloadingLabReportId, setDownloadingLabReportId] = useState<string | null>(null);

  const { data: labReports } = useCompanyLabReports<LabReport>();

  const { data: labPdfUsageData } = useCompanyLabPdfUsage();

  const labPdfUsage = labPdfUsageData as LabPdfUsage;

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
    ammoniaBasis: '',
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
    const interval = window.setInterval(() => setLabUsageNowMs(Date.now()), 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);
  return {
    sopTimes, setSopTimes,
    copy,
    user,
    company,
    t,
    today,
    activeView,
    setActiveView,
    save,
    savePending,
    loading,
    companyId,
    ponds,
    downloadingLabReportId,
    setDownloadingLabReportId,
    labReports,
    labPdfUsage,
    labUsageNowMs,
    isModalOpen,
    setModalOpen,
    isLabModalOpen,
    setLabModalOpen,
    isLabActionModalOpen,
    setLabActionModalOpen,
    labSubmitting,
    setLabSubmitting,
    labEntryMode,
    setLabEntryMode,
    editingLabReportId,
    setEditingLabReportId,
    labPdfFile,
    setLabPdfFile,
    selectedPondForHistory,
    setSelectedPondForHistory,
    expandedLabReportId,
    setExpandedLabReportId,
    expandedLabDateKeys,
    setExpandedLabDateKeys,
    searchTerm,
    setSearchTerm,
    enterpriseOwnerView,
    accessiblePonds,
    formData,
    setFormData,
    labForm,
    setLabForm,
    selectedLabPondIds,
    setSelectedLabPondIds,
    labRows,
    setLabRows,
    canEditWater,
    canManageLabReports,
  };
}
