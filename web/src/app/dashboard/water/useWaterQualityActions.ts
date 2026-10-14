"use client";
import { ADAPTIVE_SOPS_ENABLED } from "@/lib/sopFeature";
import { parseObservationTimes } from "../../../../../shared/sop/observationTimes";
import { app, db, storage } from '@/lib/firebase';
import { getManualLabColumns } from '@/lib/manualLabColumns';
import { createRecordOnce, prepareSaveData as removeUndefinedFields, updateRecordOnline, uploadSaveFile } from '@/lib/saveData';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getDownloadURL, ref } from 'firebase/storage';
import React, { useMemo, useRef, useState } from 'react';
import { validateLabRow } from "../../../../../functions/shared/labMeasurementContract";
import { getFarmDateKey } from "../../../../../shared/farmDate";
import { getManualLabInputUnits, toggleUniqueLabPondRow } from "./labRowState";
import { normalizeLabRow, denormalizeLabRow } from './labRowConversion';
import { initializeWaterDraft, isDailyWaterRecord } from "./waterFormState";
import { LAB_PDF_PENDING_MS, LabPdfUsageType, LabPondResult, LabReport, LabReportType, LabSeverity, Pond, Sampling, getLabReportTypeLabel, hasWaterQualityHistory } from './WaterQualityModel';

import type { useWaterQualityState } from './useWaterQualityState';
type Context = Pick<ReturnType<typeof useWaterQualityState>,
  'formData'
  | 'sopTimes'
  | 'setSopTimes'
  | 'accessiblePonds'
  | 'save'
  | 'setFormData'
  | 'today'
  | 'setModalOpen'
  | 'companyId'
  | 'user'
  | 'canEditWater'
  | 'copy'
  | 'selectedLabPondIds'
  | 'labRows'
  | 'setSelectedLabPondIds'
  | 'setLabRows'
  | 'labEntryMode'
  | 'labPdfUsage'
  | 'labUsageNowMs'
  | 'setLabEntryMode'
  | 'setEditingLabReportId'
  | 'setLabPdfFile'
  | 'setLabForm'
  | 'setLabModalOpen'
  | 'canManageLabReports'
  | 'labPdfFile'
  | 'labForm'
  | 'setLabSubmitting'
  | 'editingLabReportId'
  | 'downloadingLabReportId'
  | 'setDownloadingLabReportId'
  | 'searchTerm'
  | 'labReports'
  | 'company'
  | 'setExpandedLabDateKeys'>;
export function useWaterQualityActions(context: Context) {
  const {
    formData,
    sopTimes, setSopTimes,
    accessiblePonds,
    save,
    setFormData,
    today,
    setModalOpen,
    companyId,
    user,
    canEditWater,
    copy,
    selectedLabPondIds,
    labRows,
    setSelectedLabPondIds,
    setLabRows,
    labEntryMode,
    labPdfUsage,
    labUsageNowMs,
    setLabEntryMode,
    setEditingLabReportId,
    setLabPdfFile,
    setLabForm,
    setLabModalOpen,
    canManageLabReports,
    labPdfFile,
    labForm,
    setLabSubmitting,
    editingLabReportId,
    downloadingLabReportId,
    setDownloadingLabReportId,
    searchTerm,
    labReports,
    company,
    setExpandedLabDateKeys,
  } = context;
  const waterDrafts = useRef(new Map<string, typeof formData>());

  const [waterSubmitting, setWaterSubmitting] = useState(false);

  const createWaterDraft = (pondId: string, date: string) => {
    const pond = accessiblePonds.find(pond => pond.id === pondId);
    const record = pond?.samplings.find(row => isDailyWaterRecord(row, date));
    setSopTimes(record?.observedAtByField || {});
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
          ...(ADAPTIVE_SOPS_ENABLED ? { observedAtByField: { ...(existingIndex >= 0 ? samplings[existingIndex].observedAtByField : {}), ...parseObservationTimes(sopTimes) }, ammoniaBasis: formData.ammoniaBasis } : {}),
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
    const rows = (report.pondResults || []).map(row => denormalizeLabRow(row, accessiblePonds));
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
      const rows = (result.data.pondResults || []).map(row => denormalizeLabRow(row, accessiblePonds));
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
        pondResults: permittedLabRows.map(row => normalizeLabRow(row, labEntryMode)),
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
  return {
    waterSubmitting,
    openWaterRecord,
    selectWaterRecord,
    handleAddWQ,
    toggleLabPond,
    updateLabRow,
    openNewLabReport,
    openLabPdfUpload,
    openLabReportReview,
    handleUploadLabPdf,
    handleCreateManualLabReport,
    handleDownloadLabReport,
    filteredPonds,
    filteredLabReports,
    groupedLabReports,
    toggleLabDateGroup,
    getSeverityStyle,
    formatLabValue,
    getLatestWQ,
    labGridColumns,
    mineralPdfActionState,
    planktonPdfActionState,
    activePdfActionState,
  };
}
