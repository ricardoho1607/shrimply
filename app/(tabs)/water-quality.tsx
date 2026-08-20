import React, { useState, useMemo, useCallback, useRef } from "react";
import { FlatList, StyleSheet, Text, View, TouchableOpacity, Modal, TextInput, ScrollView, StatusBar, Alert, Platform, KeyboardAvoidingView, ActivityIndicator, Linking, InteractionManager } from "react-native";
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { hasWaterQualityData, usePondStore, isPondCycleActive, type Pond } from "../store/pondStore";
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import app, { db, storage } from '../../config/firebase';
import { getFarmDateKey } from '../../shared/farmDate';
import { filterEnterpriseRecordsForUser, getEnterprisePondStatus, isEnterpriseOwner } from '../../shared/enterpriseBlocks';
import EnterprisePondGrid from '../components/enterprise/EnterprisePondGrid';
import { useEnterpriseBlocks } from '../hooks/useEnterpriseBlocks';
import PlanktonOverwatchCard from '../components/PlanktonOverwatchCard';

interface MobileLabReport {
  id: string;
  companyId?: string;
  status?: 'draft' | 'extracted' | 'confirmed' | 'failed';
  entryMode?: 'manual' | 'pdf_upload';
  reportType?: 'water_quality' | 'plankton' | 'combined';
  labName?: string;
  sampleDate?: string;
  originalFileName?: string;
  sourcePdfUrl?: string;
  sourcePdfPath?: string;
  pondResults?: any[];
  extraction?: {
    status?: string;
    confidence?: number;
    warnings?: string[];
    error?: string;
  };
}

type LabPdfUsageType = 'water_quality' | 'plankton';
type LabPdfUsage = Partial<Record<LabPdfUsageType, {
  status?: 'idle' | 'pending' | 'cooldown';
  resetAt?: unknown;
  startedAt?: unknown;
}>>;

const LAB_PDF_PENDING_MS = 10 * 60 * 1000;
const MAX_LAB_PDF_BYTES = 10 * 1024 * 1024;
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type WeatherEvent = 'rain' | 'heavy_rain' | 'sudden_cloud';
type SludgeLoad = 'low' | 'moderate' | 'high';
type ShrimpBehaviour = 'normal' | 'abnormal';

interface WaterQualityValues {
  phMorning: string;
  phEvening: string;
  doMorning: string;
  doEvening: string;
  transparency: string;
  salinity: string;
  temperature: string;
  weatherEvent: WeatherEvent | null;
  waterExchangePercent: string;
  sludgeLoad: SludgeLoad | null;
  surfaceScum: boolean | null;
  shrimpBehaviour: ShrimpBehaviour | null;
}

const createEmptyWaterQualityValues = (): WaterQualityValues => ({
  phMorning: '',
  phEvening: '',
  doMorning: '',
  doEvening: '',
  transparency: '',
  salinity: '',
  temperature: '',
  weatherEvent: null,
  waterExchangePercent: '',
  sludgeLoad: null,
  surfaceScum: null,
  shrimpBehaviour: null,
});

const waitForNativePickerWindow = () => new Promise<void>((resolve) => {
  InteractionManager.runAfterInteractions(() => {
    setTimeout(resolve, 650);
  });
});

const isDocumentPickerBusyError = (error: unknown) => (
  error instanceof Error && error.message.includes('Different document picking in progress')
);

const loadLabPdfPickerTools = async () => {
  const [DocumentPicker, FileSystem] = await Promise.all([
    import('expo-document-picker'),
    import('expo-file-system/legacy'),
  ]);

  if (typeof DocumentPicker.getDocumentAsync !== 'function' || typeof FileSystem.getInfoAsync !== 'function') {
    throw new Error('Lab PDF picker tools are unavailable.');
  }

  return { DocumentPicker, FileSystem };
};

const isPdfAsset = (asset: { name?: string | null; mimeType?: string | null }) => (
  asset.mimeType === 'application/pdf'
  || (!asset.mimeType && !!asset.name?.toLowerCase().endsWith('.pdf'))
);

const Input = React.memo(function Input({ label, value, onChange, placeholder = "" }: any) {
  return (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput style={styles.input} keyboardType="numeric" value={value} 
      onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#6b8aa0" />
  </View>
  );
});

const Parameter = React.memo(function Parameter({ icon, label, value, color }: any) {
  return (
  <View style={styles.parameterItem}>
    <Ionicons name={icon} size={16} color="#315f57" />
    <Text style={styles.parameterLabel}>{label}</Text>
    <Text style={[styles.parameterValue, { color }]}>{value || "N/A"}</Text>
  </View>
  );
});

export default function WaterQualityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, company } = useAuth();
  const { t } = useLanguage();
  const { ponds, addWaterQuality } = usePondStore();
  const canEditPonds = user?.role === 'technician' || user?.role === 'owner' || user?.role === 'co-owner';
  const enterpriseOwnerView = isEnterpriseOwner(company?.businessSize, user?.role);
  const enterpriseBlocks = useEnterpriseBlocks(
    company?.businessSize === 'enterprise' ? company?.id : undefined,
    user?.uid,
  );
  const accessiblePonds = useMemo(() => filterEnterpriseRecordsForUser(ponds, {
    businessSize: company?.businessSize,
    role: user?.role,
    userId: user?.uid,
    blocks: enterpriseBlocks.blocks,
  }), [company?.businessSize, enterpriseBlocks.blocks, ponds, user?.role, user?.uid]);
  const activePonds = useMemo(() => accessiblePonds.filter(isPondCycleActive), [accessiblePonds]);
  const [activeView, setActiveView] = useState<'daily' | 'lab'>('daily');
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedPond, setSelectedPond] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLabUploading, setIsLabUploading] = useState(false);
  const [isConfirmingLab, setIsConfirmingLab] = useState(false);
  const [isLabActionModalVisible, setIsLabActionModalVisible] = useState(false);
  const [labReports, setLabReports] = useState<MobileLabReport[]>([]);
  const [labPdfUsage, setLabPdfUsage] = useState<LabPdfUsage>({});
  const [labUsageNowMs, setLabUsageNowMs] = useState(Date.now());
  const [selectedLabReport, setSelectedLabReport] = useState<MobileLabReport | null>(null);
  const [selectedLabPond, setSelectedLabPond] = useState<Pond | null>(null);
  const [expandedReviewRows, setExpandedReviewRows] = useState<Record<string, boolean>>({});
  const [expandedLabHistoryDates, setExpandedLabHistoryDates] = useState<Record<string, boolean>>({});
  const submitLockRef = useRef(false);
  const labPickerLockRef = useRef(false);
  const [values, setValues] = useState<WaterQualityValues>(createEmptyWaterQualityValues);

  React.useEffect(() => {
    if (isModalVisible) {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }, [isModalVisible]);

  React.useEffect(() => {
    if (!company?.id) {
      setLabReports([]);
      return undefined;
    }

    const reportsQuery = query(
      collection(db, 'companies', company.id, 'labReports'),
      orderBy('sampleDate', 'desc'),
    );
    return onSnapshot(reportsQuery, (snapshot) => {
      setLabReports(snapshot.docs.map(reportDoc => ({ id: reportDoc.id, ...reportDoc.data() } as MobileLabReport)));
    }, (error) => {
      console.error('Error loading lab reports:', error);
    });
  }, [company?.id]);

  React.useEffect(() => {
    if (!company?.id) {
      setLabPdfUsage({});
      return undefined;
    }

    return onSnapshot(doc(db, 'companies', company.id, 'labUsage', 'pdfExtraction'), (snapshot) => {
      setLabPdfUsage(snapshot.exists() ? (snapshot.data() as LabPdfUsage) : {});
    }, (error) => {
      console.error('Error loading lab PDF usage:', error);
    });
  }, [company?.id]);

  React.useEffect(() => {
    const interval = setInterval(() => setLabUsageNowMs(Date.now()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    setExpandedReviewRows({});
  }, [selectedLabReport?.id]);

  React.useEffect(() => {
    setExpandedLabHistoryDates({});
  }, [selectedLabPond?.id]);

  const getColor = useCallback((type: string, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "#315f57";
    if (type === "do") return num < 3.5 ? "#e74c3c" : num <= 4.5 ? "#f39c12" : "#0d2137";
    if (type === "ph") return num < 7.5 || num > 8.5 ? "#e74c3c" : "#0d2137";
    if (type === "transparency") return num < 30 || num > 40 ? "#e74c3c" : "#0d2137";
    return "#0d2137";
  }, []);

  const getLabStatusStyle = useCallback((status?: string) => {
    if (status === 'critical') return { label: t.waterQuality.statusCritical, bg: '#fee2e2', color: '#991b1b', icon: 'warning-outline' as const };
    if (status === 'warning') return { label: t.waterQuality.statusWarning, bg: '#fef3c7', color: '#92400e', icon: 'alert-circle-outline' as const };
    if (status === 'watch') return { label: t.waterQuality.statusWatch, bg: '#e0f2fe', color: '#0F4C75', icon: 'eye-outline' as const };
    return { label: t.waterQuality.statusGood, bg: '#dcfce7', color: '#166534', icon: 'checkmark-circle-outline' as const };
  }, [t.waterQuality.statusCritical, t.waterQuality.statusGood, t.waterQuality.statusWarning, t.waterQuality.statusWatch]);

  const getPondLabStatusByType = useCallback((pond: Pond, reportType: 'water_quality' | 'plankton') => {
    const latestStatus = pond.latestLabStatus;
    return latestStatus?.byType?.[reportType]
      ?? (latestStatus?.reportType === reportType || (!latestStatus?.reportType && reportType === 'water_quality' && !latestStatus?.byType) ? latestStatus : undefined);
  }, []);

  const getLabRowForPond = useCallback((report: MobileLabReport, pond: Pond) => (
    (report.pondResults || []).find((row) => (
      row?.pondId === pond.id
      || row?.pondCode === pond.pondName
      || row?.pondName === pond.pondName
      || row?.pondCode === pond.id
    ))
  ), []);

  const selectedPondLabHistory = useMemo(() => {
    if (!selectedLabPond) return [];
    return labReports
      .filter((report) => report.status === 'confirmed' && getLabRowForPond(report, selectedLabPond))
      .map((report) => ({ report, row: getLabRowForPond(report, selectedLabPond) }))
      .filter((entry) => entry.row)
      .sort((a, b) => new Date(b.report.sampleDate || 0).getTime() - new Date(a.report.sampleDate || 0).getTime());
  }, [getLabRowForPond, labReports, selectedLabPond]);

  const selectedPondLabHistoryByDate = useMemo(() => {
    const groups = new Map<string, {
      dateKey: string;
      dateLabel: string;
      timestamp: number;
      reports: typeof selectedPondLabHistory;
    }>();

    selectedPondLabHistory.forEach((entry) => {
      const parsedDate = entry.report.sampleDate ? new Date(entry.report.sampleDate) : null;
      const hasValidDate = parsedDate && !Number.isNaN(parsedDate.getTime());
      const dateKey = hasValidDate ? getFarmDateKey(parsedDate, company?.timeZone) : 'unknown-date';
      const dateLabel = hasValidDate ? parsedDate.toLocaleDateString() : t.waterQuality.lastLab;
      const timestamp = hasValidDate ? parsedDate.getTime() : 0;
      const existing = groups.get(dateKey);

      if (existing) {
        existing.reports.push(entry);
      } else {
        groups.set(dateKey, { dateKey, dateLabel, timestamp, reports: [entry] });
      }
    });

    return Array.from(groups.values()).sort((a, b) => b.timestamp - a.timestamp);
  }, [company?.timeZone, selectedPondLabHistory, t.waterQuality.lastLab]);

  const openLabPdf = useCallback(async (report: MobileLabReport) => {
    if (!report.sourcePdfUrl) {
      Alert.alert(t.waterQuality.noLabReports, t.waterQuality.originalPdfUnavailableMessage);
      return;
    }
    try {
      await Linking.openURL(report.sourcePdfUrl);
    } catch (error) {
      console.error('Error opening lab PDF:', error);
      Alert.alert(t.waterQuality.labUploadFailedTitle, t.waterQuality.openPdfFailedMessage);
    }
  }, [t.waterQuality.labUploadFailedTitle, t.waterQuality.noLabReports, t.waterQuality.openPdfFailedMessage, t.waterQuality.originalPdfUnavailableMessage]);

  const allWaterRecords = useMemo(() => {
    const today = getFarmDateKey(new Date(), company?.timeZone);
    return activePonds.map((p) => {
      const todayWQRecord = p.samplings.find(s => s.date === today && hasWaterQualityData(s));
      return todayWQRecord ? { ...todayWQRecord, pondName: p.pondName, latestPlanktonOverwatch: p.latestPlanktonOverwatch } : {
        id: `temp-${p.id}`, date: today, mbw: 0, mortality: 0, feed: 0,
        phMorning: undefined, phEvening: undefined, doMorning: undefined, 
        doEvening: undefined, transparency: undefined, salinity: undefined, pondName: p.pondName,
        latestPlanktonOverwatch: p.latestPlanktonOverwatch,
      };
    });
  }, [activePonds, company?.timeZone]);

  const handleSave = useCallback(() => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setIsSubmitting(true);

    if (!canEditPonds) {
      Alert.alert(t.waterQuality.permissionDenied, t.waterQuality.permissionMessage);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }
    if (!selectedPond) {
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }
    const pond = activePonds.find((p) => p.pondName === selectedPond);
    if (!pond) {
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    addWaterQuality(pond.id, {
      phMorning: values.phMorning.trim(), phEvening: values.phEvening.trim(),
      doMorning: values.doMorning.trim(), doEvening: values.doEvening.trim(),
      transparency: values.transparency.trim(), salinity: values.salinity.trim(),
      temperature: values.temperature.trim(), weatherEvent: values.weatherEvent,
      waterExchangePercent: values.waterExchangePercent.trim(), sludgeLoad: values.sludgeLoad,
      surfaceScum: values.surfaceScum, shrimpBehaviour: values.shrimpBehaviour,
    });
    setValues(createEmptyWaterQualityValues());
    setSelectedPond(null);
    setIsModalVisible(false);
  }, [canEditPonds, selectedPond, activePonds, values, addWaterQuality, t]);

  const handlePondSelection = useCallback((pondName: string) => {
    setSelectedPond(pondName);
    const today = getFarmDateKey(new Date(), company?.timeZone);
    const pond = ponds.find(p => p.pondName === pondName);
    const todayWQRecord = pond?.samplings.find(s => s.date === today && hasWaterQualityData(s));
    setValues(todayWQRecord ? {
      phMorning: todayWQRecord.phMorning || "", phEvening: todayWQRecord.phEvening || "",
      doMorning: todayWQRecord.doMorning || "", doEvening: todayWQRecord.doEvening || "",
      transparency: todayWQRecord.transparency || "", salinity: todayWQRecord.salinity || "",
      temperature: todayWQRecord.temperature || '', weatherEvent: todayWQRecord.weatherEvent || null,
      waterExchangePercent: todayWQRecord.waterExchangePercent || '', sludgeLoad: todayWQRecord.sludgeLoad || null,
      surfaceScum: todayWQRecord.surfaceScum ?? null, shrimpBehaviour: todayWQRecord.shrimpBehaviour || null,
    } : createEmptyWaterQualityValues());
  }, [company?.timeZone, ponds]);

  const closeModal = useCallback(() => {
    setValues(createEmptyWaterQualityValues());
    setSelectedPond(null);
    submitLockRef.current = false;
    setIsSubmitting(false);
    setIsModalVisible(false);
  }, []);

  const updateValue = useCallback((key: string) => (text: string) => {
    setValues(prev => ({ ...prev, [key]: text }));
  }, []);

  const getLabReportTypeLabel = useCallback((reportType?: MobileLabReport['reportType']) => {
    if (reportType === 'plankton') return t.waterQuality.planktonQuality;
    if (reportType === 'combined') return t.waterQuality.combinedLabReport;
    return t.waterQuality.mineralQuality;
  }, [t]);

  const handleManualLabEntryRequest = useCallback((reportType: 'water_quality' | 'plankton') => {
    setIsLabActionModalVisible(false);
    Alert.alert(
      t.waterQuality.addLabReport,
      `${getLabReportTypeLabel(reportType)} ${t.waterQuality.manualEntryWebOnlyMessage}`,
    );
  }, [getLabReportTypeLabel, t.waterQuality.addLabReport, t.waterQuality.manualEntryWebOnlyMessage]);

  const toUsageMillis = useCallback((value: unknown) => {
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
  }, []);

  const formatRemainingTime = useCallback((remainingMs: number) => {
    const safeMs = Math.max(remainingMs, 0);
    const totalMinutes = Math.ceil(safeMs / (60 * 1000));
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }, []);

  const getPdfActionState = useCallback((reportType: LabPdfUsageType) => {
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
    return { disabled: false, message: reportType === 'plankton' ? t.waterQuality.planktonQuality : t.waterQuality.mineralQuality };
  }, [formatRemainingTime, labPdfUsage, labUsageNowMs, t.waterQuality.mineralQuality, t.waterQuality.planktonQuality, toUsageMillis]);

  const handleUploadLabPdf = useCallback(async (reportType: 'water_quality' | 'plankton', pickerReserved = false) => {
    if (!canEditPonds || !user || !company?.id || isLabUploading || (!pickerReserved && labPickerLockRef.current)) {
      if (!canEditPonds) Alert.alert(t.waterQuality.permissionDenied, t.waterQuality.permissionMessage);
      if (pickerReserved) labPickerLockRef.current = false;
      return;
    }
    const pdfActionState = getPdfActionState(reportType);
    if (pdfActionState.disabled) {
      Alert.alert(t.waterQuality.addLabReport, pdfActionState.message);
      if (pickerReserved) labPickerLockRef.current = false;
      return;
    }

    try {
      if (!pickerReserved) labPickerLockRef.current = true;
      const { DocumentPicker, FileSystem } = await loadLabPdfPickerTools();
      await waitForNativePickerWindow();
      let result;
      try {
        result = await DocumentPicker.getDocumentAsync({
          type: 'application/pdf',
          copyToCacheDirectory: true,
          multiple: false,
        });
      } catch (pickerError) {
        if (!isDocumentPickerBusyError(pickerError)) throw pickerError;
        await wait(1200);
        result = await DocumentPicker.getDocumentAsync({
          type: 'application/pdf',
          copyToCacheDirectory: true,
          multiple: false,
        });
      }

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (!isPdfAsset(asset)) {
        Alert.alert(t.waterQuality.invalidPdfTitle, t.waterQuality.invalidPdfMessage);
        return;
      }

      const fileInfo = await FileSystem.getInfoAsync(asset.uri, { md5: true });
      if (!fileInfo.exists) {
        Alert.alert(t.waterQuality.invalidPdfTitle, t.waterQuality.invalidPdfMessage);
        return;
      }
      const pickedFileSize = typeof fileInfo.size === 'number' ? fileInfo.size : asset.size;
      if (typeof pickedFileSize === 'number' && pickedFileSize > MAX_LAB_PDF_BYTES) {
        Alert.alert(t.waterQuality.invalidPdfTitle, t.waterQuality.invalidPdfMessage);
        return;
      }

      setIsLabUploading(true);
      const sourceFileHash = ('md5' in fileInfo && fileInfo.md5) ? fileInfo.md5 : `${asset.name}-${asset.size || Date.now()}`;
      const reportRef = await addDoc(collection(db, 'companies', company.id, 'labReports'), {
        companyId: company.id,
        reportType,
        entryMode: 'pdf_upload',
        status: 'draft',
        sampleDate: getFarmDateKey(new Date(), company?.timeZone),
        labName: reportType === 'plankton' ? t.waterQuality.uploadedPlanktonReport : t.waterQuality.uploadedMineralReport,
        farmName: company.companyName || '',
        originalFileName: asset.name || 'lab-report.pdf',
        sourceFileHash,
        pondResults: [],
        extraction: { status: 'pending', sourceHash: sourceFileHash },
        insights: { status: 'pending' },
        processing: { status: 'pending' },
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        updatedAt: serverTimestamp(),
      });

      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const sourcePdfPath = `companies/${company.id}/labReports/${reportRef.id}/source.pdf`;
      const sourceRef = ref(storage, sourcePdfPath);
      await uploadBytes(sourceRef, blob, {
        contentType: 'application/pdf',
        customMetadata: { companyId: company.id, labReportId: reportRef.id, sourceFileHash },
      });
      const sourcePdfUrl = await getDownloadURL(sourceRef);

      await updateDoc(reportRef, {
        sourcePdfPath,
        sourcePdfUrl,
        updatedAt: serverTimestamp(),
      });

      const functions = getFunctions(app);
      const extract = httpsCallable<{ companyId: string; labReportId: string }, { pondResults?: MobileLabReport['pondResults']; warnings?: string[] }>(functions, 'extractLabReportFromPdf');
      const extractionResult = await extract({ companyId: company.id, labReportId: reportRef.id });
      if (Array.isArray(extractionResult.data?.pondResults)) {
        setSelectedLabReport({
          id: reportRef.id,
          companyId: company.id,
          reportType,
          entryMode: 'pdf_upload',
          status: 'extracted',
          sampleDate: getFarmDateKey(new Date(), company?.timeZone),
          labName: reportType === 'plankton' ? t.waterQuality.uploadedPlanktonReport : t.waterQuality.uploadedMineralReport,
          originalFileName: asset.name || 'lab-report.pdf',
          sourcePdfPath,
          sourcePdfUrl,
          pondResults: extractionResult.data.pondResults,
          extraction: { status: 'complete', warnings: extractionResult.data.warnings || [] },
        });
      }
      Alert.alert(t.waterQuality.labUploadCompleteTitle, t.waterQuality.labUploadCompleteMessage);
    } catch (error) {
      console.error('Error uploading lab PDF:', error);
      const details = typeof error === 'object' && error && 'details' in error ? error.details as { resetAt?: string } : null;
      if (details?.resetAt) {
        const resetAtMs = new Date(details.resetAt).getTime();
        const message = Number.isNaN(resetAtMs)
          ? t.waterQuality.labUploadFailedMessage
          : `${t.waterQuality.pdfExtractionAvailableIn} ${formatRemainingTime(resetAtMs - Date.now())}.`;
        Alert.alert(t.waterQuality.addLabReport, message);
      } else {
        Alert.alert(t.waterQuality.labUploadFailedTitle, t.waterQuality.labUploadFailedMessage);
      }
    } finally {
      labPickerLockRef.current = false;
      setIsLabUploading(false);
    }
  }, [canEditPonds, user, company, isLabUploading, t, getPdfActionState, formatRemainingTime]);

  const startLabPdfUpload = useCallback((reportType: 'water_quality' | 'plankton') => {
    if (labPickerLockRef.current || isLabUploading) return;
    labPickerLockRef.current = true;
    setIsLabActionModalVisible(false);
    setTimeout(() => {
      void handleUploadLabPdf(reportType, true);
    }, 350);
  }, [handleUploadLabPdf, isLabUploading]);

  const reviewableLabReports = useMemo(() => (
    labReports.filter(report => report.entryMode === 'pdf_upload' && report.status !== 'confirmed')
  ), [labReports]);

  const formatLabValue = useCallback((value: unknown, suffix = '') => {
    if (value === null || value === undefined || value === '') return t.waterQuality.notAvailable;
    return `${value}${suffix}`;
  }, [t.waterQuality.notAvailable]);

  const toLabNumber = useCallback((value: unknown) => {
    const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, '').replace(/%$/, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }, []);

  const getPlanktonDominance = useCallback((plankton: Record<string, unknown>) => {
    const good = toLabNumber(plankton.beneficialCellPerMl)
      ?? [plankton.chlorophytaCellPerMl, plankton.diatomCellPerMl, plankton.chrysophytaCellPerMl]
        .map(toLabNumber)
        .reduce<number>((sum, value) => sum + (value || 0), 0);
    const bad = toLabNumber(plankton.harmfulCellPerMl)
      ?? [plankton.cyanophytaCellPerMl, plankton.dinoflagellataCellPerMl]
        .map(toLabNumber)
        .reduce<number>((sum, value) => sum + (value || 0), 0);

    if (good > bad * 1.2) return { label: t.waterQuality.beneficialDominant, bg: '#dcfce7', color: '#166534' };
    if (bad > good) return { label: t.waterQuality.harmfulDominant, bg: '#fee2e2', color: '#991b1b' };
    return { label: t.waterQuality.mixedPlankton, bg: '#fef3c7', color: '#92400e' };
  }, [t.waterQuality.beneficialDominant, t.waterQuality.harmfulDominant, t.waterQuality.mixedPlankton, toLabNumber]);

  const renderLabHistoryReport = useCallback(({ report, row }: typeof selectedPondLabHistory[number]) => {
    const water = row?.waterQuality || {};
    const micro = row?.microbiology || {};
    const plankton = row?.plankton || {};
    const showMineral = report.reportType !== 'plankton';
    const showPlankton = report.reportType === 'plankton' || report.reportType === 'combined';
    const mineralDetailGroups = [
      {
        title: t.waterQuality.nitrogen,
        values: [
          { label: 'NH4', value: formatLabValue(water.nh4) },
          { label: 'NO2', value: formatLabValue(water.no2) },
        ],
      },
      {
        title: t.waterQuality.bufferAndMinerals,
        values: [
          { label: t.waterQuality.alkalinity, value: formatLabValue(water.alkalinityTotal) },
          { label: 'Ca', value: formatLabValue(water.hardnessCa) },
          { label: 'Mg', value: formatLabValue(water.hardnessMg) },
          { label: t.waterQuality.hardness, value: formatLabValue(water.hardnessTotal) },
        ],
      },
      {
        title: t.waterQuality.organicAndBacteria,
        values: [
          { label: 'TOM', value: formatLabValue(water.tom) },
          { label: 'Vibrio', value: formatLabValue(micro.vibrioTotal) },
          { label: 'TBC', value: formatLabValue(micro.tbc) },
        ],
      },
    ];
    const planktonGroups = [
      { label: t.waterQuality.greenAlgae, scientific: 'Chlorophyta', count: plankton.chlorophytaCellPerMl, percent: plankton.chlorophytaPercent, species: plankton.chlorophytaSpecies, quality: t.waterQuality.statusGood, bg: '#dcfce7', color: '#166534' },
      { label: t.waterQuality.blueGreenAlgae, scientific: 'Cyanophyta', count: plankton.cyanophytaCellPerMl, percent: plankton.cyanophytaPercent, species: plankton.cyanophytaSpecies, quality: t.waterQuality.statusBad, bg: '#fee2e2', color: '#991b1b' },
      { label: t.waterQuality.diatoms, scientific: 'Bacillariophyta', count: plankton.diatomCellPerMl, percent: plankton.diatomPercent, species: plankton.diatomSpecies, quality: t.waterQuality.statusGood, bg: '#dcfce7', color: '#166534' },
      { label: t.waterQuality.goldenGreenAlgae, scientific: 'Chrysophyta', count: plankton.chrysophytaCellPerMl, percent: plankton.chrysophytaPercent, species: plankton.chrysophytaSpecies, quality: t.waterQuality.statusWatch, bg: '#e0f2fe', color: '#0F4C75' },
      { label: t.waterQuality.dinoflagellates, scientific: 'Dinoflagellata', count: plankton.dinoflagellataCellPerMl, percent: plankton.dinoflagellataPercent, species: plankton.dinoflagellataSpecies, quality: t.waterQuality.statusBad, bg: '#fee2e2', color: '#991b1b' },
      { label: t.waterQuality.protozoa, scientific: 'Protozoa', count: plankton.protozoaCellPerMl, percent: plankton.protozoaPercent, species: plankton.protozoaSpecies, quality: t.waterQuality.statusWatch, bg: '#e0f2fe', color: '#0F4C75' },
    ];

    return (
      <View key={report.id} style={styles.labHistoryReportCard}>
        <View style={styles.labHistoryReportHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.reviewCardTitle}>{getLabReportTypeLabel(report.reportType)}</Text>
            <Text style={styles.reviewCardMeta} numberOfLines={2}>
              {report.labName || report.originalFileName || t.waterQuality.labReports}
            </Text>
          </View>
          {report.sourcePdfUrl && (
            <TouchableOpacity style={styles.pdfButton} onPress={() => openLabPdf(report)}>
              <Ionicons name="document-text-outline" size={16} color="#FFFFFF" />
              <Text style={styles.pdfButtonText}>{t.waterQuality.pdfLabel}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.reviewDetails}>
          {showMineral && mineralDetailGroups.map((group) => (
            <View key={`${report.id}-${group.title}`} style={styles.reviewDetailGroup}>
              <Text style={styles.reviewDetailGroupTitle}>{group.title}</Text>
              <View style={styles.extractedGrid}>
                {group.values.map((item) => (
                  <View key={`${report.id}-${group.title}-${item.label}`} style={styles.extractedMetric}>
                    <Text style={styles.extractedLabel}>{item.label}</Text>
                    <Text style={styles.extractedValue}>{item.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
          {showPlankton && (
            <View style={styles.reviewDetailGroup}>
              <Text style={styles.reviewDetailGroupTitle}>{t.waterQuality.planktonGroups}</Text>
              {planktonGroups.map(group => (
                <View key={`${report.id}-${group.scientific}`} style={styles.planktonGroupCard}>
                  <View style={styles.planktonGroupHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.planktonGroupName}>{group.label}</Text>
                      <Text style={styles.planktonScientific}>{group.scientific}</Text>
                    </View>
                    <View style={[styles.planktonBadge, { backgroundColor: group.bg }]}>
                      <Text style={[styles.planktonBadgeText, { color: group.color }]}>{group.quality}</Text>
                    </View>
                  </View>
                  <View style={styles.planktonStatsRow}>
                    <View style={styles.planktonStat}>
                      <Text style={styles.extractedLabel}>{t.waterQuality.rawCount}</Text>
                      <Text style={styles.extractedValue}>{formatLabValue(group.count)}</Text>
                    </View>
                    <View style={styles.planktonStat}>
                      <Text style={styles.extractedLabel}>{t.waterQuality.percent}</Text>
                      <Text style={styles.extractedValue}>{formatLabValue(group.percent, '%')}</Text>
                    </View>
                  </View>
                  <Text style={styles.extractedDetail}>{formatLabValue(group.species)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  }, [formatLabValue, getLabReportTypeLabel, openLabPdf, t.waterQuality]);

  const handleConfirmLabReport = useCallback(async () => {
    if (!company?.id || !user || !selectedLabReport || isConfirmingLab) return;
    const reportToConfirm = labReports.find(report => report.id === selectedLabReport.id) || selectedLabReport;
    if (reportToConfirm.status !== 'extracted') {
      Alert.alert(t.waterQuality.labNotReadyTitle, t.waterQuality.labNotReadyMessage);
      return;
    }

    try {
      setIsConfirmingLab(true);
      await updateDoc(doc(db, 'companies', company.id, 'labReports', reportToConfirm.id), {
        status: 'confirmed',
        insights: { status: 'pending' },
        processing: { status: 'pending' },
        confirmedAt: serverTimestamp(),
        confirmedBy: user.uid,
        updatedAt: serverTimestamp(),
      });
      setSelectedLabReport(null);
      Alert.alert(t.waterQuality.labConfirmedTitle, t.waterQuality.labConfirmedMessage);
    } catch (error) {
      console.error('Error confirming lab report:', error);
      Alert.alert(t.waterQuality.labConfirmFailedTitle, t.waterQuality.labConfirmFailedMessage);
    } finally {
      setIsConfirmingLab(false);
    }
  }, [company?.id, user, selectedLabReport, isConfirmingLab, labReports, t]);

  const mineralPdfActionState = getPdfActionState('water_quality');
  const planktonPdfActionState = getPdfActionState('plankton');

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f8fc" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="water-outline" size={28} color="#315f57" />
          <Text style={styles.headerTitle}>{t.waterQuality.title}</Text>
        </View>

        <View style={styles.segmentedControl}>
          {[
            { key: 'daily' as const, label: t.waterQuality.dailyLog, icon: 'water-outline' as const },
            { key: 'lab' as const, label: t.waterQuality.labReports, icon: 'flask-outline' as const },
          ].map(item => {
            const active = activeView === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.segmentButton, active && styles.segmentButtonActive]}
                onPress={() => setActiveView(item.key)}
              >
                <Ionicons name={item.icon} size={16} color={active ? '#FFFFFF' : '#315f57'} />
                <Text style={[styles.segmentButtonText, active && styles.segmentButtonTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeView === 'daily' ? (
        enterpriseOwnerView ? (
          <EnterprisePondGrid
            blocks={enterpriseBlocks.blocks}
            technicians={enterpriseBlocks.technicians}
            ponds={activePonds}
            emptyMessage={t.waterQuality.noData}
            getTone={(pond) => getEnterprisePondStatus(pond, company?.timeZone).risk}
            onPress={(pond) => router.push({ pathname: '/water-quality-history', params: { pondId: pond.id, pondName: pond.pondName } })}
          />
        ) : (
        <FlatList
          data={allWaterRecords}
          keyExtractor={(item, index) => `${item.pondName}-${item.date || index}`}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 20) + 80 : 100 }
          ]} 
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="flask-outline" size={80} color="#315f57" />
              <Text style={styles.emptyTitle}>{t.waterQuality.noData}</Text>
              <Text style={styles.emptySubtitle}>
                {canEditPonds ? t.waterQuality.addFirst : t.waterQuality.noDataAvailable}
              </Text>
            </View>
          }
          renderItem={({ item: rec }) => (
              <TouchableOpacity style={styles.recordCard}
                onPress={() => {
                  const pond = ponds.find(p => p.pondName === rec.pondName);
                  if (pond) router.push({ pathname: '/water-quality-history', params: { pondId: pond.id, pondName: rec.pondName }});
                }}>
                <View style={styles.cardHeader}>
                  <Text style={styles.pondName}>{rec.pondName}</Text>
                  <Text style={styles.dateText}>{rec.date ? new Date(rec.date).toLocaleDateString() : "N/A"}</Text>
                </View>
                <View style={styles.parametersContainer}>
                  <View style={styles.parameterRow}>
                    <Parameter icon="sunny-outline" label={t.waterQuality.phMorning} value={rec.phMorning ?? ""} color={getColor("ph", rec.phMorning ?? "")} />
                    <Parameter icon="moon-outline" label={t.waterQuality.phEvening} value={rec.phEvening ?? ""} color={getColor("ph", rec.phEvening ?? "")} />
                  </View>
                  <View style={styles.parameterRow}>
                    <Parameter icon="sunny-outline" label={t.waterQuality.doMorning} value={rec.doMorning ?? ""} color={getColor("do", rec.doMorning ?? "")} />
                    <Parameter icon="moon-outline" label={t.waterQuality.doEvening} value={rec.doEvening ?? ""} color={getColor("do", rec.doEvening ?? "")} />
                  </View>
                  <View style={styles.parameterRow}>
                    <Parameter icon="eye-outline" label={t.waterQuality.transparency} value={`${rec.transparency || "N/A"} cm`} color={getColor("transparency", rec.transparency ?? "")} />
                    <Parameter icon="water-outline" label={t.waterQuality.salinity} value={`${rec.salinity || "N/A"} ppt`} color="#0d2137" />
                  </View>
                </View>
                <PlanktonOverwatchCard snapshot={rec.latestPlanktonOverwatch} compact />
              </TouchableOpacity>
          )}
        />
        )
        ) : (
          <FlatList
            data={activePonds}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={canEditPonds ? (
              <View>
                <View style={styles.labUploadCard}>
                  <View style={styles.labUploadTextBlock}>
                    <Text style={styles.labUploadTitle}>{t.waterQuality.addLabReport}</Text>
                    <Text style={styles.labUploadSubtitle}>{t.waterQuality.uploadLabPdfSubtitle}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.labUploadButton, isLabUploading && { opacity: 0.65 }]}
                    onPress={() => setIsLabActionModalVisible(true)}
                    disabled={isLabUploading}
                  >
                    {isLabUploading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Ionicons name="add-circle-outline" size={19} color="#FFFFFF" />
                    )}
                    <Text style={styles.labUploadButtonText}>
                      {isLabUploading ? t.waterQuality.extractingLabPdf : t.waterQuality.addLabReport}
                    </Text>
                  </TouchableOpacity>
                </View>

                {reviewableLabReports.length > 0 && (
                  <View style={styles.reviewSection}>
                    <Text style={styles.reviewSectionTitle}>{t.waterQuality.extractedDrafts}</Text>
                    {reviewableLabReports.map((report) => {
                      const isReady = report.status === 'extracted';
                      const isFailed = report.status === 'failed';
                      return (
                        <TouchableOpacity
                          key={report.id}
                          style={styles.reviewCard}
                          onPress={() => setSelectedLabReport(report)}
                          disabled={!isReady && !isFailed}
                        >
                          <View style={styles.reviewCardHeader}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.reviewCardTitle}>{report.labName || report.originalFileName || t.waterQuality.labReports}</Text>
                              <Text style={styles.reviewCardMeta}>
                                {getLabReportTypeLabel(report.reportType)} • {report.sampleDate ? new Date(report.sampleDate).toLocaleDateString() : t.waterQuality.lastLab} • {report.pondResults?.length || 0} {t.waterQuality.pondRows}
                              </Text>
                            </View>
                            <View style={[styles.reviewStatusBadge, isFailed ? styles.reviewStatusFailed : isReady ? styles.reviewStatusReady : styles.reviewStatusPending]}>
                              <Text style={styles.reviewStatusText}>
                                {isFailed ? t.waterQuality.failed : isReady ? t.waterQuality.ready : t.waterQuality.extractingLabPdf}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.reviewCardHint}>
                            {isFailed ? (report.extraction?.error || t.waterQuality.labUploadFailedMessage) : isReady ? t.waterQuality.tapToReviewExtraction : t.waterQuality.extractionInProgress}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : null}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 20) + 80 : 100 }
            ]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="flask-outline" size={80} color="#315f57" />
                <Text style={styles.emptyTitle}>{t.waterQuality.noLabReports}</Text>
                <Text style={styles.emptySubtitle}>{t.waterQuality.labReportsWillAppear}</Text>
              </View>
            }
            renderItem={({ item: pond }) => {
              const mineralStatus = getPondLabStatusByType(pond, 'water_quality');
              const planktonStatus = getPondLabStatusByType(pond, 'plankton');
              const labStatusRows = [
                { key: 'water_quality', title: t.waterQuality.mineralQuality, icon: 'water-outline' as const, status: mineralStatus },
                { key: 'plankton', title: t.waterQuality.planktonQuality, icon: 'leaf-outline' as const, status: planktonStatus },
              ];
              return (
                <TouchableOpacity style={styles.recordCard} onPress={() => setSelectedLabPond(pond)} activeOpacity={0.85}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.pondName}>{pond.pondName}</Text>
                    <Ionicons name="chevron-forward" size={20} color="#6b8aa0" />
                  </View>
                  <View style={styles.labTypeStatusGrid}>
                    {labStatusRows.map((item) => {
                      const labStyle = getLabStatusStyle(item.status?.status);
                      return (
                        <View key={item.key} style={styles.labTypeStatusCard}>
                          <View style={styles.labTypeStatusHeader}>
                            <View style={styles.labTypeTitleRow}>
                              <Ionicons name={item.icon} size={15} color="#315f57" />
                              <Text style={styles.labTypeTitle}>{item.title}</Text>
                            </View>
                            <View style={[styles.labBadge, { backgroundColor: item.status ? labStyle.bg : '#f1f5f9' }]}>
                              <Text style={[styles.labBadgeText, { color: item.status ? labStyle.color : '#64748b' }]}>
                                {item.status ? labStyle.label : t.waterQuality.noDataShort}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.labIssue} numberOfLines={2}>
                            {item.status?.mainIssue || t.waterQuality.noConfirmedLabWarning}
                          </Text>
                          {item.status?.sampleDate && (
                            <Text style={styles.labDate}>{t.waterQuality.lastLab}: {new Date(item.status.sampleDate).toLocaleDateString()}</Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                  <PlanktonOverwatchCard snapshot={pond.latestPlanktonOverwatch} compact />
                  <View style={styles.labCardFooter}>
                    <Text style={styles.labCardFooterText}>{t.waterQuality.tapToViewReportHistoryPdf}</Text>
                    <Ionicons name="document-text-outline" size={15} color="#315f57" />
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}

        <Modal visible={isLabActionModalVisible} animationType="slide" transparent>
          <View style={styles.actionSheetOverlay}>
            <TouchableOpacity style={styles.actionSheetBackdrop} onPress={() => setIsLabActionModalVisible(false)} />
            <View style={styles.actionSheet}>
              <View style={styles.actionSheetHandle} />
              <View style={styles.actionSheetHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionSheetTitle}>{t.waterQuality.addLabReport}</Text>
                  <Text style={styles.actionSheetSubtitle}>{t.waterQuality.uploadLabPdfSubtitle}</Text>
                </View>
                <TouchableOpacity onPress={() => setIsLabActionModalVisible(false)} style={styles.closeButton}>
                  <Ionicons name="close" size={22} color="#315f57" />
                </TouchableOpacity>
              </View>
              <Text style={styles.actionGroupTitle}>{t.waterQuality.uploadPdf}</Text>
              <View style={styles.actionOptionGrid}>
                <TouchableOpacity
                  style={[styles.actionOption, mineralPdfActionState.disabled && styles.actionOptionDisabled]}
                  onPress={() => startLabPdfUpload('water_quality')}
                  disabled={isLabUploading || mineralPdfActionState.disabled}
                >
                  <Ionicons name="cloud-upload-outline" size={20} color="#0F4C75" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actionOptionTitle}>{t.waterQuality.uploadMineralPdf}</Text>
                    <Text style={styles.actionOptionSubtitle}>{mineralPdfActionState.message}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionOption, planktonPdfActionState.disabled && styles.actionOptionDisabled]}
                  onPress={() => startLabPdfUpload('plankton')}
                  disabled={isLabUploading || planktonPdfActionState.disabled}
                >
                  <Ionicons name="leaf-outline" size={20} color="#0F4C75" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actionOptionTitle}>{t.waterQuality.uploadPlanktonPdf}</Text>
                    <Text style={styles.actionOptionSubtitle}>{planktonPdfActionState.message}</Text>
                  </View>
                </TouchableOpacity>
              </View>
              <Text style={styles.actionGroupTitle}>{t.waterQuality.manualEntry}</Text>
              <View style={styles.actionOptionGrid}>
                <TouchableOpacity style={styles.actionOption} onPress={() => handleManualLabEntryRequest('water_quality')}>
                  <Ionicons name="create-outline" size={20} color="#0F4C75" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actionOptionTitle}>{t.waterQuality.manualMineralEntry}</Text>
                    <Text style={styles.actionOptionSubtitle}>{t.waterQuality.mineralQuality}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionOption} onPress={() => handleManualLabEntryRequest('plankton')}>
                  <Ionicons name="create-outline" size={20} color="#0F4C75" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actionOptionTitle}>{t.waterQuality.manualPlanktonEntry}</Text>
                    <Text style={styles.actionOptionSubtitle}>{t.waterQuality.planktonQuality}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={!!selectedLabPond} animationType="slide" transparent>
          <View style={styles.modalContainer}>
            <View style={styles.labReviewModalContent}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>{selectedLabPond?.pondName || t.waterQuality.labReports}</Text>
                  <Text style={styles.labDate}>{t.waterQuality.labReportHistory}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedLabPond(null)}
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <Ionicons name="close" size={24} color="#315f57" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollView} contentContainerStyle={{ paddingBottom: 28 }}>
                {selectedPondLabHistoryByDate.length === 0 ? (
                  <View style={styles.labHistoryEmpty}>
                    <Ionicons name="flask-outline" size={34} color="#6b8aa0" />
                    <Text style={styles.labHistoryEmptyTitle}>{t.waterQuality.noConfirmedLabWarning}</Text>
                    <Text style={styles.labHistoryEmptyText}>{t.waterQuality.confirmedLabReportsForPond}</Text>
                  </View>
                ) : (
                  selectedPondLabHistoryByDate.map((group) => {
                    const expanded = !!expandedLabHistoryDates[group.dateKey];
                    const reportTypeSummary = Array.from(new Set(group.reports.map(({ report }) => getLabReportTypeLabel(report.reportType)))).join(' + ');
                    return (
                      <View key={group.dateKey} style={styles.labHistoryCard}>
                        <TouchableOpacity
                          style={styles.labDateGroupHeader}
                          onPress={() => setExpandedLabHistoryDates(prev => ({ ...prev, [group.dateKey]: !prev[group.dateKey] }))}
                          accessibilityRole="button"
                          accessibilityLabel={`${expanded ? t.waterQuality.collapseLabReportsFor : t.waterQuality.expandLabReportsFor} ${group.dateLabel}`}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.reviewCardTitle}>{group.dateLabel}</Text>
                            <Text style={styles.reviewCardMeta}>
                              {group.reports.length} {group.reports.length === 1 ? t.waterQuality.reportSingular : t.waterQuality.reportPlural} • {reportTypeSummary}
                            </Text>
                          </View>
                          <Ionicons name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'} size={20} color="#0F4C75" />
                        </TouchableOpacity>

                        {expanded && (
                          <View style={styles.labDateGroupReports}>
                            {group.reports.map(renderLabHistoryReport)}
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {canEditPonds && activeView === 'daily' && (
          // UPDATED BUTTON TO MATCH YOUR OTHER PAGE
          <TouchableOpacity style={styles.floatingButton} onPress={() => setIsModalVisible(true)}>
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        )}

        <Modal visible={isModalVisible} animationType="slide" transparent>
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t.waterQuality.addWaterQuality}</Text>
                <TouchableOpacity
                  onPress={closeModal}
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color="#315f57" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                showsVerticalScrollIndicator={false} 
                style={styles.modalScrollView}
                contentContainerStyle={{ paddingBottom: 40 }}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
              >
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{t.waterQuality.selectPond}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pondSelector}>
                    {activePonds.map((p) => (
                      <TouchableOpacity key={p.id}
                        style={[styles.pondOption, selectedPond === p.pondName && styles.pondOptionSelected]}
                        onPress={() => handlePondSelection(p.pondName)}>
                        <Text style={[styles.pondOptionText, selectedPond === p.pondName && styles.pondOptionTextSelected]}>
                          {p.pondName}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.row}>
                  <View style={styles.inputGroup}>
                    <Input label={`${t.waterQuality.salinity} (ppt)`} value={values.salinity} onChange={updateValue('salinity')} placeholder={t.waterQuality.salinityPlaceholder} />
                  </View>
                  <View style={styles.inputGroup}>
                    <Input label={`${t.waterQuality.transparency} (cm)`} value={values.transparency} onChange={updateValue('transparency')} placeholder={t.waterQuality.transparencyPlaceholder} />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={styles.inputGroup}>
                    <Input label={`${t.waterQuality.phMorning} ☀️`} value={values.phMorning} onChange={updateValue('phMorning')} placeholder={t.waterQuality.phPlaceholder} />
                  </View>
                  <View style={styles.inputGroup}>
                    <Input label={`${t.waterQuality.phEvening} 🌙`} value={values.phEvening} onChange={updateValue('phEvening')} placeholder={t.waterQuality.phPlaceholder} />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={styles.inputGroup}>
                    <Input label={`${t.waterQuality.doMorning} ☀️`} value={values.doMorning} onChange={updateValue('doMorning')} placeholder={t.waterQuality.doPlaceholder} />
                  </View>
                  <View style={styles.inputGroup}>
                    <Input label={`${t.waterQuality.doEvening} 🌙`} value={values.doEvening} onChange={updateValue('doEvening')} placeholder={t.waterQuality.doPlaceholder} />
                  </View>
                </View>

                <View style={styles.optionalSection}>
                  <Text style={styles.optionalSectionTitle}>{t.waterQuality.optionalPondConditions}</Text>
                  <Text style={styles.optionalSectionHint}>{t.waterQuality.optionalPondConditionsHint}</Text>

                  <View style={styles.row}>
                    <View style={styles.inputGroup}>
                      <Input label={`${t.waterQuality.temperature} (°C)`} value={values.temperature} onChange={updateValue('temperature')} placeholder="e.g., 29" />
                    </View>
                    <View style={styles.inputGroup}>
                      <Input label={t.waterQuality.waterExchangePercent} value={values.waterExchangePercent} onChange={updateValue('waterExchangePercent')} placeholder="e.g., 10" />
                    </View>
                  </View>

                  <Text style={styles.conditionLabel}>{t.waterQuality.weatherEvent}</Text>
                  <View style={styles.conditionOptions}>
                    {([
                      ['rain', t.waterQuality.rain],
                      ['heavy_rain', t.waterQuality.heavyRain],
                      ['sudden_cloud', t.waterQuality.suddenCloud],
                    ] as const).map(([value, label]) => (
                      <TouchableOpacity
                        key={value}
                        style={[styles.conditionOption, values.weatherEvent === value && styles.conditionOptionSelected]}
                        onPress={() => setValues(prev => ({ ...prev, weatherEvent: prev.weatherEvent === value ? null : value }))}
                      >
                        <Text style={[styles.conditionOptionText, values.weatherEvent === value && styles.conditionOptionTextSelected]}>{label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.conditionLabel}>{t.waterQuality.sludgeLoad}</Text>
                  <View style={styles.conditionOptions}>
                    {([
                      ['low', t.waterQuality.conditionLow],
                      ['moderate', t.waterQuality.conditionModerate],
                      ['high', t.waterQuality.conditionHigh],
                    ] as const).map(([value, label]) => (
                      <TouchableOpacity
                        key={value}
                        style={[styles.conditionOption, values.sludgeLoad === value && styles.conditionOptionSelected]}
                        onPress={() => setValues(prev => ({ ...prev, sludgeLoad: prev.sludgeLoad === value ? null : value }))}
                      >
                        <Text style={[styles.conditionOptionText, values.sludgeLoad === value && styles.conditionOptionTextSelected]}>{label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.conditionLabel}>{t.waterQuality.surfaceScum}</Text>
                  <View style={styles.conditionOptions}>
                    {([
                      [true, t.waterQuality.surfaceScumObserved],
                      [false, t.waterQuality.notObserved],
                    ] as const).map(([value, label]) => (
                      <TouchableOpacity
                        key={String(value)}
                        style={[styles.conditionOption, values.surfaceScum === value && styles.conditionOptionSelected]}
                        onPress={() => setValues(prev => ({ ...prev, surfaceScum: prev.surfaceScum === value ? null : value }))}
                      >
                        <Text style={[styles.conditionOptionText, values.surfaceScum === value && styles.conditionOptionTextSelected]}>{label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.conditionLabel}>{t.waterQuality.shrimpBehaviour}</Text>
                  <View style={styles.conditionOptions}>
                    {([
                      ['normal', t.waterQuality.behaviourNormal],
                      ['abnormal', t.waterQuality.behaviourAbnormal],
                    ] as const).map(([value, label]) => (
                      <TouchableOpacity
                        key={value}
                        style={[styles.conditionOption, values.shrimpBehaviour === value && styles.conditionOptionSelected]}
                        onPress={() => setValues(prev => ({ ...prev, shrimpBehaviour: prev.shrimpBehaviour === value ? null : value }))}
                      >
                        <Text style={[styles.conditionOptionText, values.shrimpBehaviour === value && styles.conditionOptionTextSelected]}>{label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.buttonContainer}>
                  <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                    <Text style={styles.cancelButtonText}>{t.actions.cancel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.addButton, isSubmitting && { opacity: 0.6 }]} onPress={handleSave} disabled={isSubmitting}>
                    <Text style={styles.addButtonText}>{t.waterQuality.saveRecord}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal visible={Boolean(selectedLabReport)} animationType="slide" transparent>
          <View style={styles.modalContainer}>
            <View style={styles.labReviewModalContent}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>{t.waterQuality.reviewLabExtraction}</Text>
                  <Text style={styles.labDate}>
                    {selectedLabReport?.sampleDate ? new Date(selectedLabReport.sampleDate).toLocaleDateString() : t.waterQuality.lastLab}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedLabReport(null)}
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <Ionicons name="close" size={24} color="#315f57" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollView} contentContainerStyle={{ paddingBottom: 28 }}>
                {selectedLabReport?.extraction?.warnings && selectedLabReport.extraction.warnings.length > 0 && (
                  <View style={styles.warningBox}>
                    <Text style={styles.warningTitle}>{t.waterQuality.extractionWarnings}</Text>
                    {selectedLabReport.extraction.warnings.slice(0, 4).map((warning, index) => (
                      <Text key={`${warning}-${index}`} style={styles.warningText}>• {warning}</Text>
                    ))}
                  </View>
                )}

                {(selectedLabReport?.pondResults || []).map((row, index) => {
                  const water = row.waterQuality || {};
                  const micro = row.microbiology || {};
                  const plankton = row.plankton || {};
                  const showMineral = selectedLabReport?.reportType !== 'plankton';
                  const showPlankton = selectedLabReport?.reportType === 'plankton' || selectedLabReport?.reportType === 'combined';
                  const dominance = getPlanktonDominance(plankton);
                  const rowKey = `${row.pondId || row.pondCode || index}-${index}`;
                  const expanded = !!expandedReviewRows[rowKey];
                  const mineralChips = [
                    { label: 'NH4', value: formatLabValue(water.nh4) },
                    { label: 'NO2', value: formatLabValue(water.no2) },
                    { label: 'Alk', value: formatLabValue(water.alkalinityTotal) },
                    { label: 'Ca', value: formatLabValue(water.hardnessCa) },
                    { label: 'Mg', value: formatLabValue(water.hardnessMg) },
                    { label: 'Vibrio', value: formatLabValue(micro.vibrioTotal) },
                  ];
                  const planktonChips = [
                    { label: t.waterQuality.total, value: formatLabValue(plankton.totalCellPerMl) },
                    { label: t.waterQuality.statusGood, value: formatLabValue(plankton.beneficialCellPerMl) },
                    { label: t.waterQuality.statusBad, value: formatLabValue(plankton.harmfulCellPerMl) },
                    { label: t.waterQuality.greenPercent, value: formatLabValue(plankton.chlorophytaPercent, '%') },
                    { label: t.waterQuality.blueGreenPercent, value: formatLabValue(plankton.cyanophytaPercent, '%') },
                    { label: t.waterQuality.goldenPercent, value: formatLabValue(plankton.chrysophytaPercent, '%') },
                  ];
                  const mineralDetailGroups = [
                    {
                      title: t.waterQuality.nitrogen,
                      values: [
                        { label: 'NH4', value: formatLabValue(water.nh4) },
                        { label: 'NO2', value: formatLabValue(water.no2) },
                      ],
                    },
                    {
                      title: t.waterQuality.bufferAndMinerals,
                      values: [
                        { label: t.waterQuality.alkalinity, value: formatLabValue(water.alkalinityTotal) },
                        { label: 'Ca', value: formatLabValue(water.hardnessCa) },
                        { label: 'Mg', value: formatLabValue(water.hardnessMg) },
                        { label: t.waterQuality.hardness, value: formatLabValue(water.hardnessTotal) },
                      ],
                    },
                    {
                      title: t.waterQuality.organicAndBacteria,
                      values: [
                        { label: 'TOM', value: formatLabValue(water.tom) },
                        { label: 'Vibrio', value: formatLabValue(micro.vibrioTotal) },
                        { label: 'TBC', value: formatLabValue(micro.tbc) },
                      ],
                    },
                  ];
                  const planktonGroups = [
                    { label: t.waterQuality.greenAlgae, scientific: 'Chlorophyta', count: plankton.chlorophytaCellPerMl, percent: plankton.chlorophytaPercent, species: plankton.chlorophytaSpecies, quality: t.waterQuality.statusGood, bg: '#dcfce7', color: '#166534' },
                    { label: t.waterQuality.blueGreenAlgae, scientific: 'Cyanophyta', count: plankton.cyanophytaCellPerMl, percent: plankton.cyanophytaPercent, species: plankton.cyanophytaSpecies, quality: t.waterQuality.statusBad, bg: '#fee2e2', color: '#991b1b' },
                    { label: t.waterQuality.diatoms, scientific: 'Bacillariophyta', count: plankton.diatomCellPerMl, percent: plankton.diatomPercent, species: plankton.diatomSpecies, quality: t.waterQuality.statusGood, bg: '#dcfce7', color: '#166534' },
                    { label: t.waterQuality.goldenGreenAlgae, scientific: 'Chrysophyta', count: plankton.chrysophytaCellPerMl, percent: plankton.chrysophytaPercent, species: plankton.chrysophytaSpecies, quality: t.waterQuality.statusWatch, bg: '#e0f2fe', color: '#0F4C75' },
                    { label: t.waterQuality.dinoflagellates, scientific: 'Dinoflagellata', count: plankton.dinoflagellataCellPerMl, percent: plankton.dinoflagellataPercent, species: plankton.dinoflagellataSpecies, quality: t.waterQuality.statusBad, bg: '#fee2e2', color: '#991b1b' },
                    { label: t.waterQuality.protozoa, scientific: 'Protozoa', count: plankton.protozoaCellPerMl, percent: plankton.protozoaPercent, species: plankton.protozoaSpecies, quality: t.waterQuality.statusWatch, bg: '#e0f2fe', color: '#0F4C75' },
                  ];
                  return (
                    <View key={rowKey} style={styles.extractedPondCard}>
                      <View style={styles.reviewPondHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.extractedPondTitle}>{row.pondCode || `${t.waterQuality.labReports} ${index + 1}`}</Text>
                          <Text style={styles.reviewPondMeta}>{getLabReportTypeLabel(selectedLabReport?.reportType)}</Text>
                        </View>
                        {showPlankton && (
                          <View style={[styles.planktonBadge, { backgroundColor: dominance.bg }]}>
                            <Text style={[styles.planktonBadgeText, { color: dominance.color }]}>{dominance.label}</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.reviewChipGrid}>
                        {showMineral && (
                          mineralChips.map((chip) => (
                            <View key={`mineral-${chip.label}`} style={styles.reviewChip}>
                              <Text style={styles.reviewChipLabel}>{chip.label}</Text>
                              <Text style={styles.reviewChipValue}>{chip.value}</Text>
                            </View>
                          ))
                        )}
                        {showPlankton && (
                          planktonChips.map((chip) => (
                            <View key={`plankton-${chip.label}`} style={styles.reviewChip}>
                              <Text style={styles.reviewChipLabel}>{chip.label}</Text>
                              <Text style={styles.reviewChipValue}>{chip.value}</Text>
                            </View>
                          ))
                        )}
                      </View>

                      <TouchableOpacity
                        style={styles.reviewExpandButton}
                        onPress={() => setExpandedReviewRows(prev => ({ ...prev, [rowKey]: !prev[rowKey] }))}
                      >
                        <Text style={styles.reviewExpandText}>{expanded ? t.waterQuality.hideFullDetails : t.waterQuality.showAllValues}</Text>
                        <Ionicons name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'} size={16} color="#0F4C75" />
                      </TouchableOpacity>

                      {expanded && (
                        <View style={styles.reviewDetails}>
                          {showMineral && mineralDetailGroups.map((group) => (
                            <View key={group.title} style={styles.reviewDetailGroup}>
                              <Text style={styles.reviewDetailGroupTitle}>{group.title}</Text>
                              <View style={styles.extractedGrid}>
                                {group.values.map((item) => (
                                  <View key={`${group.title}-${item.label}`} style={styles.extractedMetric}>
                                    <Text style={styles.extractedLabel}>{item.label}</Text>
                                    <Text style={styles.extractedValue}>{item.value}</Text>
                                  </View>
                                ))}
                              </View>
                            </View>
                          ))}
                          {showPlankton && (
                            <View style={styles.reviewDetailGroup}>
                              <Text style={styles.reviewDetailGroupTitle}>{t.waterQuality.planktonGroups}</Text>
                              {planktonGroups.map(group => (
                                <View key={group.scientific} style={styles.planktonGroupCard}>
                                  <View style={styles.planktonGroupHeader}>
                                    <View style={{ flex: 1 }}>
                                      <Text style={styles.planktonGroupName}>{group.label}</Text>
                                      <Text style={styles.planktonScientific}>{group.scientific}</Text>
                                    </View>
                                    <View style={[styles.planktonBadge, { backgroundColor: group.bg }]}>
                                      <Text style={[styles.planktonBadgeText, { color: group.color }]}>{group.quality}</Text>
                                    </View>
                                  </View>
                                  <View style={styles.planktonStatsRow}>
                                    <View style={styles.planktonStat}>
                                      <Text style={styles.extractedLabel}>{t.waterQuality.rawCount}</Text>
                                      <Text style={styles.extractedValue}>{formatLabValue(group.count)}</Text>
                                    </View>
                                    <View style={styles.planktonStat}>
                                      <Text style={styles.extractedLabel}>{t.waterQuality.percent}</Text>
                                      <Text style={styles.extractedValue}>{formatLabValue(group.percent, '%')}</Text>
                                    </View>
                                  </View>
                                  <Text style={styles.extractedDetail}>{formatLabValue(group.species)}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}

                <View style={styles.buttonContainer}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setSelectedLabReport(null)}>
                    <Text style={styles.cancelButtonText}>{t.actions.cancel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.addButton, (isConfirmingLab || selectedLabReport?.status !== 'extracted') && { opacity: 0.6 }]}
                    onPress={handleConfirmLabReport}
                    disabled={isConfirmingLab || selectedLabReport?.status !== 'extracted'}
                  >
                    <Text style={styles.addButtonText}>
                      {isConfirmingLab ? t.waterQuality.confirmingReport : t.waterQuality.confirmReport}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f8fc" },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Platform.OS === 'android' ? 16 : 20, paddingTop: Platform.OS === 'android' ? 16 : 20, paddingBottom: Platform.OS === 'android' ? 16 : 20 },
  headerTitle: { fontSize: Platform.OS === 'android' ? 22 : 24, fontWeight: 'bold', color: '#0d2137', marginLeft: Platform.OS === 'android' ? 10 : 12 },
  segmentedControl: { flexDirection: 'row', marginHorizontal: Platform.OS === 'android' ? 16 : 20, marginBottom: 16, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 4, borderWidth: 1, borderColor: '#e8f2f9' },
  segmentButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 11, borderRadius: 11 },
  segmentButtonActive: { backgroundColor: '#0d2137' },
  segmentButtonText: { color: '#315f57', fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '800' },
  segmentButtonTextActive: { color: '#FFFFFF' },
  scrollContent: { padding: Platform.OS === 'android' ? 16 : 20, paddingTop: 0 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: Platform.OS === 'android' ? 60 : 80 },
  emptyTitle: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 22 : 24, fontWeight: 'bold', marginTop: Platform.OS === 'android' ? 16 : 20 },
  emptySubtitle: { color: '#315f57', fontSize: Platform.OS === 'android' ? 15 : 16, marginTop: 8, textAlign: 'center', lineHeight: Platform.OS === 'android' ? 20 : 22 },
  recordCard: { backgroundColor: '#FFFFFF', padding: Platform.OS === 'android' ? 16 : 20, borderRadius: 16, marginBottom: Platform.OS === 'android' ? 12 : 16, borderWidth: 1, borderColor: '#e8f2f9', shadowColor: '#315f57', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Platform.OS === 'android' ? 12 : 16 },
  pondName: { fontSize: Platform.OS === 'android' ? 18 : 20, fontWeight: 'bold', color: '#0d2137' },
  dateText: { color: '#315f57', fontSize: Platform.OS === 'android' ? 11 : 12 },
  parametersContainer: { gap: Platform.OS === 'android' ? 10 : 12 },
  parameterRow: { flexDirection: 'row', justifyContent: 'space-between' },
  parameterItem: { flex: 1, flexDirection: 'row', alignItems: 'center', marginHorizontal: 4, minWidth: 0 },
  parameterLabel: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 11 : 12, marginLeft: 6, width: Platform.OS === 'android' ? 75 : 80, flexShrink: 0 },
  parameterValue: { fontSize: Platform.OS === 'android' ? 11 : 12, fontWeight: '600', textAlign: 'right', flex: 1 },
  labBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  labBadgeText: { fontSize: 11, fontWeight: '900' },
  labTypeStatusGrid: { gap: 10 },
  labTypeStatusCard: { backgroundColor: '#f8fbfd', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#e8f2f9' },
  labTypeStatusHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 },
  labTypeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  labTypeTitle: { color: '#0d2137', fontSize: 13, fontWeight: '900' },
  labCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e8f2f9' },
  labCardFooterText: { color: '#315f57', fontSize: 12, fontWeight: '800' },
  labIssue: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: '800', lineHeight: 22 },
  labDate: { color: '#6b8aa0', fontSize: 12, fontWeight: '700', marginTop: 6 },
  labList: { marginTop: 12, gap: 4 },
  labListItem: { color: '#315f57', fontSize: 13, fontWeight: '700', lineHeight: 19 },
  labRecommendationBox: { marginTop: 14, backgroundColor: '#f4f8fc', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e8f2f9' },
  labRecommendationTitle: { color: '#0d2137', fontSize: 12, fontWeight: '900', marginBottom: 4, textTransform: 'uppercase' },
  labRecommendationText: { color: '#315f57', fontSize: 13, fontWeight: '700', lineHeight: 19 },
  labUploadCard: { backgroundColor: '#0d2137', borderRadius: 18, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#0d2137', shadowColor: '#315f57', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 4 },
  labUploadTextBlock: { marginBottom: 14 },
  labUploadTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginBottom: 5 },
  labUploadSubtitle: { color: '#c9dbe7', fontSize: 13, fontWeight: '700', lineHeight: 19 },
  labUploadButton: { backgroundColor: '#315f57', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  labUploadButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  actionSheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  actionSheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 76, 117, 0.45)' },
  actionSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28, borderWidth: 1, borderColor: '#e8f2f9' },
  actionSheetHandle: { width: 44, height: 5, borderRadius: 999, backgroundColor: '#dbe9f2', alignSelf: 'center', marginBottom: 14 },
  actionSheetHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  actionSheetTitle: { color: '#0d2137', fontSize: 20, fontWeight: '900', marginBottom: 5 },
  actionSheetSubtitle: { color: '#315f57', fontSize: 13, fontWeight: '700', lineHeight: 19 },
  actionGroupTitle: { color: '#6b8aa0', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginBottom: 8, marginTop: 8 },
  actionOptionGrid: { gap: 9, marginBottom: 8 },
  actionOption: { backgroundColor: '#f4f8fc', borderRadius: 14, borderWidth: 1, borderColor: '#e8f2f9', padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  actionOptionDisabled: { opacity: 0.48 },
  actionOptionTitle: { color: '#0d2137', fontSize: 14, fontWeight: '900' },
  actionOptionSubtitle: { color: '#6b8aa0', fontSize: 12, fontWeight: '700', marginTop: 2 },
  reviewSection: { marginBottom: 16 },
  reviewSectionTitle: { color: '#0d2137', fontSize: 15, fontWeight: '900', marginBottom: 10 },
  reviewCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#dbe9f2' },
  reviewCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewCardTitle: { color: '#0d2137', fontSize: 15, fontWeight: '900' },
  reviewCardMeta: { color: '#6b8aa0', fontSize: 12, fontWeight: '700', marginTop: 3 },
  reviewStatusBadge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  reviewStatusReady: { backgroundColor: '#dcfce7' },
  reviewStatusPending: { backgroundColor: '#e0f2fe' },
  reviewStatusFailed: { backgroundColor: '#fee2e2' },
  reviewStatusText: { color: '#0d2137', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  reviewCardHint: { color: '#315f57', fontSize: 12, fontWeight: '700', marginTop: 8, lineHeight: 17 },
  // UPDATED STYLE: Added fixed bottom/right position
  floatingButton: { position: 'absolute', bottom: 30, right: 30, backgroundColor: '#0d2137', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#315f57', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(15, 76, 117, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, width: '100%', maxHeight: '85%', borderWidth: 1, borderColor: '#e8f2f9', overflow: 'hidden' },
  labReviewModalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, width: '100%', maxHeight: '88%', borderWidth: 1, borderColor: '#e8f2f9', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Platform.OS === 'android' ? 20 : 24, paddingBottom: 0 },
  modalTitle: { fontSize: Platform.OS === 'android' ? 22 : 24, fontWeight: 'bold', color: '#0d2137' },
  closeButton: { padding: 4 },
  modalScrollView: { padding: Platform.OS === 'android' ? 20 : 24, paddingTop: 0 },
  inputContainer: { marginBottom: Platform.OS === 'android' ? 16 : 20 },
  inputLabel: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e8f2f9', padding: Platform.OS === 'android' ? 14 : 16, borderRadius: 12, backgroundColor: '#f4f8fc', color: '#0d2137', fontSize: Platform.OS === 'android' ? 15 : 16, includeFontPadding: false, textAlignVertical: 'center' },
  row: { flexDirection: 'row', gap: 12, marginBottom: 0 },
  inputGroup: { flex: 1 },
  optionalSection: { marginTop: 4, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e8f2f9' },
  optionalSectionTitle: { color: '#0d2137', fontSize: 15, fontWeight: '900' },
  optionalSectionHint: { color: '#6b8aa0', fontSize: 12, fontWeight: '700', lineHeight: 17, marginTop: 4, marginBottom: 14 },
  conditionLabel: { color: '#0d2137', fontSize: 13, fontWeight: '700', marginBottom: 7, marginTop: 4 },
  conditionOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  conditionOption: { backgroundColor: '#f4f8fc', borderRadius: 999, borderWidth: 1, borderColor: '#dbe9f2', paddingHorizontal: 13, paddingVertical: 9 },
  conditionOptionSelected: { backgroundColor: '#0d2137', borderColor: '#0d2137' },
  conditionOptionText: { color: '#315f57', fontSize: 12, fontWeight: '800' },
  conditionOptionTextSelected: { color: '#FFFFFF' },
  pondSelector: { maxHeight: 50 },
  pondOption: { paddingHorizontal: Platform.OS === 'android' ? 14 : 16, paddingVertical: Platform.OS === 'android' ? 7 : 8, marginRight: 8, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#e8f2f9' },
  pondOptionSelected: { backgroundColor: '#0d2137', borderColor: '#0d2137' },
  pondOptionText: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '600' },
  pondOptionTextSelected: { color: '#FFFFFF' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: Platform.OS === 'android' ? 16 : 20, marginBottom: Platform.OS === 'android' ? 20 : 24 },
  addButton: { backgroundColor: '#315f57', paddingVertical: Platform.OS === 'android' ? 14 : 16, paddingHorizontal: Platform.OS === 'android' ? 20 : 24, borderRadius: 12, alignItems: 'center', flex: 1, marginLeft: 6, shadowColor: '#315f57', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  addButtonText: { color: '#FFFFFF', fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: 'bold' },
  cancelButton: { backgroundColor: 'transparent', paddingVertical: Platform.OS === 'android' ? 14 : 16, paddingHorizontal: Platform.OS === 'android' ? 20 : 24, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e74c3c', flex: 1, marginRight: 6 },
  cancelButtonText: { color: '#e74c3c', fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: 'bold' },
  warningBox: { backgroundColor: '#fff7ed', borderRadius: 14, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#fed7aa' },
  warningTitle: { color: '#9a3412', fontSize: 12, fontWeight: '900', marginBottom: 6, textTransform: 'uppercase' },
  warningText: { color: '#9a3412', fontSize: 12, fontWeight: '700', lineHeight: 18 },
  labHistoryCard: { backgroundColor: '#f4f8fc', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e8f2f9' },
  labHistoryHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  labDateGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  labDateGroupReports: { marginTop: 12, gap: 12 },
  labHistoryReportCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#dbe9f2' },
  labHistoryReportHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 2 },
  labHistoryEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 42, paddingHorizontal: 20 },
  labHistoryEmptyTitle: { color: '#0d2137', fontSize: 16, fontWeight: '900', marginTop: 12, textAlign: 'center' },
  labHistoryEmptyText: { color: '#315f57', fontSize: 13, fontWeight: '700', marginTop: 6, textAlign: 'center', lineHeight: 19 },
  pdfButton: { backgroundColor: '#0d2137', borderRadius: 12, paddingVertical: 9, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 6 },
  pdfButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  extractedPondCard: { backgroundColor: '#f4f8fc', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e8f2f9' },
  reviewPondHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  reviewPondMeta: { color: '#6b8aa0', fontSize: 11, fontWeight: '800', marginTop: 2 },
  extractedPondTitle: { color: '#0d2137', fontSize: 16, fontWeight: '900' },
  reviewChipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reviewChip: { minWidth: '30%', flexGrow: 1, backgroundColor: '#FFFFFF', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: '#e8f2f9' },
  reviewChipLabel: { color: '#6b8aa0', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', marginBottom: 2 },
  reviewChipValue: { color: '#0d2137', fontSize: 12, fontWeight: '900' },
  reviewExpandButton: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#eaf4fb', borderRadius: 999, paddingVertical: 9, borderWidth: 1, borderColor: '#dbe9f2' },
  reviewExpandText: { color: '#0F4C75', fontSize: 12, fontWeight: '900' },
  reviewDetails: { marginTop: 12, gap: 12 },
  reviewDetailGroup: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e8f2f9' },
  reviewDetailGroupTitle: { color: '#0d2137', fontSize: 12, fontWeight: '900', marginBottom: 10, textTransform: 'uppercase' },
  extractedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  extractedMetric: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#e8f2f9' },
  extractedLabel: { color: '#6b8aa0', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', marginBottom: 3 },
  extractedValue: { color: '#0d2137', fontSize: 13, fontWeight: '900' },
  extractedDetail: { color: '#315f57', fontSize: 11, fontWeight: '700', marginTop: 4, lineHeight: 15 },
  planktonSummaryCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#dbe9f2' },
  planktonSummaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  planktonGroupCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e8f2f9' },
  planktonGroupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  planktonGroupName: { color: '#0d2137', fontSize: 14, fontWeight: '900', flex: 1 },
  planktonScientific: { color: '#6b8aa0', fontSize: 11, fontWeight: '800', fontStyle: 'italic' },
  planktonStatsRow: { flexDirection: 'row', gap: 8 },
  planktonStat: { flex: 1, backgroundColor: '#f4f8fc', borderRadius: 10, padding: 9 },
  planktonBadge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, alignSelf: 'flex-start' },
  planktonBadgeText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
});
