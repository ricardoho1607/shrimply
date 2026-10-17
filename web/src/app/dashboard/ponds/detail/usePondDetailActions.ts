"use client";
import { confirmAppAction, showAppAlert } from '@/lib/appDialogs';

import { auth, db } from '@/lib/firebase';
import { prepareSaveData as removeUndefinedFields, updateRecordOnline } from '@/lib/saveData';
import { startPondCycle, StartPondCycleError } from '@/lib/startPondCycle';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch
} from 'firebase/firestore';
import React from 'react';
import { hasFinalHarvestForPondCycle } from "../../../../../../shared/harvestCalculations";
import { PHYSICAL_POND_LINK_ERROR } from "../../../../../../shared/physicalPondIdentity";
import {
  isBaselineSampling,
  type SharedMortalityRecord
} from "../../../../../../shared/pondCalculations";
import { calculateDocFromDates, getPhysicalPondKey, HarvestRecord, isActiveCycle, isOpenFarmCycle, Pond, Sampling } from './PondDetailModel';
import type { usePondDetailState } from './usePondDetailState';
type Context = Pick<ReturnType<typeof usePondDetailState>,
  'companyId'
  | 'pond'
  | 'canRecordPondData'
  | 'copy'
  | 'save'
  | 'samplingForm'
  | 'today'
  | 'setIsSubmitting'
  | 'editingSamplingId'
  | 'setSamplingModalOpen'
  | 'setEditingSamplingId'
  | 'setSamplingForm'
  | 't'
  | 'mortalityForm'
  | 'editingMortalityId'
  | 'setMortalityModalOpen'
  | 'setEditingMortalityId'
  | 'setMortalityForm'
  | 'canManagePond'
  | 'endCycleForm'
  | 'router'
  | 'setEndCycleOpen'
  | 'isDeletingPond'
  | 'setIsDeletingPond'
  | 'canManageCycles'
  | 'isEnterpriseTechnician'
  | 'cycles'
  | 'startCycleForm'
  | 'setStartCycleOpen'
  | 'setBaselineForm'
  | 'setBaselineModalOpen'
  | 'baselineForm'>;
export function usePondDetailActions(context: Context) {
  const {
    companyId,
    pond,
    canRecordPondData,
    copy,
    save,
    samplingForm,
    today,
    setIsSubmitting,
    editingSamplingId,
    setSamplingModalOpen,
    setEditingSamplingId,
    setSamplingForm,
    t,
    mortalityForm,
    editingMortalityId,
    setMortalityModalOpen,
    setEditingMortalityId,
    setMortalityForm,
    canManagePond,
    endCycleForm,
    router,
    setEndCycleOpen,
    isDeletingPond,
    setIsDeletingPond,
    canManageCycles,
    isEnterpriseTechnician,
    cycles,
    startCycleForm,
    setStartCycleOpen,
    setBaselineForm,
    setBaselineModalOpen,
    baselineForm,
  } = context;
  const handleDeleteSampling = async (samplingId: string) => {
    if (!companyId || !pond || !canRecordPondData || !isActiveCycle(pond)) return;
    if (!(await confirmAppAction(copy.deleteSamplingConfirm))) return;
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
      showAppAlert(copy.deleteSamplingFailed);
    }
  };

  const handleDeleteMortality = async (recordId: string) => {
    if (!companyId || !pond || !canRecordPondData || !isActiveCycle(pond)) return;
    if (!(await confirmAppAction(copy.deleteMortalityConfirm))) return;
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
      showAppAlert(copy.deleteMortalityFailed);
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
      showAppAlert('Enter a valid sampling date, positive MBW, and non-negative feed amount.');
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
      showAppAlert(t.messages.error || "Failed to save sampling. Your entries are still here; check your connection and retry.");
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
      showAppAlert(copy.mortalityCountInvalid);
      return;
    }
    if (mortalityForm.date > today) {
      showAppAlert(copy.mortalityFuture);
      return;
    }
    const cycleStartKey = String(pond.cycleStartedAt || pond.docStart || '').slice(0, 10);
    if (cycleStartKey && mortalityForm.date < cycleStartKey) {
      showAppAlert(copy.mortalityBeforeCycle);
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
      showAppAlert(copy.mortalitySaveFailed);
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
          const shouldGoToHarvest = (await confirmAppAction(`${t.farmCycle.finalHarvestRequiredMessage.replace('{{pondNames}}', pond.pondName)}\n\n${t.farmCycle.goToHarvest}?`));
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
      showAppAlert(copy.endCycleFailed);
    } finally {
      save.release();
    }
  };

  const handleDeletePond = async () => {
    if (!companyId || !pond || !canManagePond || isDeletingPond) return;
    const confirmed = (await confirmAppAction(copy.deletePondConfirm.replace('{{pond}}', pond.pondName)));
    if (!confirmed) return;

    setIsDeletingPond(true);
    try {
      await deleteDoc(doc(db, 'companies', companyId, 'ponds', pond.id));
      router.push('/dashboard/ponds');
    } catch (error) {
      console.error('Error deleting pond:', error);
      showAppAlert(copy.deletePondFailed);
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
      showAppAlert(t.enterprise.ownerMustStartCycle);
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
      showAppAlert(error instanceof StartPondCycleError ? error.code === 'blockMismatch' ? t.enterpriseCycle.pondBlockMismatch : error.code === 'cycleMismatch' ? t.enterpriseCycle.pondCycleMismatch : t.startPondCycle.errors[error.code] : error instanceof Error && error.message === PHYSICAL_POND_LINK_ERROR ? error.message : copy.startCycleFailed);
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
      showAppAlert(copy.currentMbwRequired);
      return;
    }
    if (!baselineForm.baselineDate || !Number.isFinite(baselineDocValue) || baselineDocValue < 0) {
      showAppAlert(copy.currentDocRequired);
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
      showAppAlert(copy.baselineUpdateFailed);
    }
  };
  return {
    handleDeleteSampling,
    handleDeleteMortality,
    handleSaveSampling,
    handleSaveMortality,
    handleEndCycle,
    handleDeletePond,
    handleStartCycle,
    openBaselineModal,
    handleUpdateBaseline,
  };
}
