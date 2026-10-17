import { getUserErrorMessage } from '../../shared/userError';
import { AppAlert as Alert } from '../../components/alerts/appAlert';
import { assertSopStageGate, previewSopPondChange } from "../../app/services/sopGuards";
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useCallback } from 'react';

import { buildDefaultFarmCycle, getPhysicalPondKey, isPondCycleActive, type FarmCycle, type PhysicalPond, type Pond, type PondCycleEndReason } from "../../app/store/pondStore";
import firebaseApp from "../../config/firebase";
import { getFarmDateKey } from "../../shared/farmDate";
import { hasFinalHarvestForPondCycle } from "../../shared/harvestCalculations";
import type { usePondManagementState } from './usePondManagementState';
type Context = Pick<ReturnType<typeof usePondManagementState>,
  'currentCompanyId'
  | 'addPhysicalPond'
  | 'submitLockRef'
  | 'setIsSubmitting'
  | 'canManagePonds'
  | 't'
  | 'formData'
  | 'availableEnterpriseBlocks'
  | 'isEnterpriseFarm'
  | 'physicalPonds'
  | 'ponds'
  | 'closeModal'
  | 'setCycleFilter'
  | 'canManageFarmCycle'
  | 'openAccessibleFarmCycles'
  | 'formatLocalDateKey'
  | 'cycles'
  | 'activeFarmCycle'
  | 'startablePondOptions'
  | 'activePhysicalPondNames'
  | 'calculateDocFromDates'
  | 'addPond'
  | 'convertPlToGrams'
  | 'updateFarmCycle'
  | 'setSelectedDashboardCycleId'
  | 'canRecordPondData'
  | 'activePonds'
  | 'addSampling'
  | 'parseNumericInput'
  | 'user'
  | 'company'
  | 'addMortalityRecord'
  | 'mortalityDraftIdRef'
  | 'router'
  | 'harvestRecords'
  | 'endPondCycle'
  | 'deletePond'
  | 'deletePhysicalPond'
  | 'cycleNameDraft'>;
export function usePondManagementPondActions(context: Context) {
  const {
    currentCompanyId,
    addPhysicalPond,
    submitLockRef,
    setIsSubmitting,
    canManagePonds,
    t,
    formData,
    availableEnterpriseBlocks,
    isEnterpriseFarm,
    physicalPonds,
    ponds,
    closeModal,
    setCycleFilter,
    canManageFarmCycle,
    openAccessibleFarmCycles,
    formatLocalDateKey,
    cycles,
    activeFarmCycle,
    startablePondOptions,
    activePhysicalPondNames,
    calculateDocFromDates,
    addPond,
    convertPlToGrams,
    updateFarmCycle,
    setSelectedDashboardCycleId,
    canRecordPondData,
    activePonds,
    addSampling,
    parseNumericInput,
    user,
    company,
    addMortalityRecord,
    mortalityDraftIdRef,
    router,
    harvestRecords,
    endPondCycle,
    deletePond,
    deletePhysicalPond,
    cycleNameDraft,
  } = context;
  const createPhysicalPondOnServer = useCallback(async (pond: PhysicalPond) => {
    if (!currentCompanyId) throw new Error('Company not found.');
    if (!await previewSopPondChange(currentCompanyId, pond)) throw new Error("Pond creation was cancelled.");
    const createPhysicalPond = httpsCallable<
      { companyId: string; pondId: string; pond: { pondName: string; pondArea: number; blockId?: string; blockName?: string } },
      { id: string }
    >(getFunctions(firebaseApp), 'createCompanyPhysicalPond');
    const result = await createPhysicalPond({
      companyId: currentCompanyId,
      pondId: pond.id,
      pond: {
        pondName: pond.pondName,
        pondArea: pond.pondArea,
        blockId: pond.blockId,
        blockName: pond.blockName,
      },
    });
    await addPhysicalPond({ ...pond, id: result.data.id }, { sync: false });
    return result.data.id;
  }, [addPhysicalPond, currentCompanyId]);

  const handleAddPond = useCallback(async () => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setIsSubmitting(true);

    if (!canManagePonds) {
      Alert.alert(
        t.home.permissionDenied,
        t.home.onlyTechniciansCanAdd,
        [{ text: t.actions.confirm }]
      );
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }
    const { pondName, pondArea, blockId } = formData;

    if (!pondName || !pondArea) {
      Alert.alert(t.messages.error, t.home.fillAllFields);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }
    const selectedBlock = availableEnterpriseBlocks.find((block) => block.id === blockId);
    if (isEnterpriseFarm && !selectedBlock) {
      Alert.alert(t.messages.error, availableEnterpriseBlocks.length === 0
        ? t.enterprise.noAssignedBlocks
        : t.enterprise.blockRequired);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const pondKey = getPhysicalPondKey(pondName);
    const alreadyExists = physicalPonds.some((pond) => getPhysicalPondKey(pond.pondName) === pondKey) ||
      ponds.some((pond) => getPhysicalPondKey(pond.pondName) === pondKey);
    if (alreadyExists) {
      Alert.alert(t.messages.error, `${pondName} already exists. Use Add Cycle to start production for this pond.`);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    try {
      await createPhysicalPondOnServer({
        id: Date.now().toString(),
        pondName,
        pondArea: Number(pondArea),
        blockId: selectedBlock?.id,
        blockName: selectedBlock?.name,
        status: 'idle',
      });
      submitLockRef.current = false;
      closeModal();
      setCycleFilter('inactive');
      Alert.alert(t.messages.success, t.home.pondAddedSuccess);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add pond.';
      Alert.alert(t.messages.error, message.includes('plan allows')
        ? `${message}\n\nThe company owner can manage the plan on the Shrimply website.`
        : message);
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    availableEnterpriseBlocks,
    canManagePonds,
    closeModal,
    createPhysicalPondOnServer,
    formData,
    isEnterpriseFarm,
    physicalPonds,
    ponds,
    setCycleFilter,
    setIsSubmitting,
    submitLockRef,
    t,
  ]);

  const handleAddCycle = useCallback(async () => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setIsSubmitting(true);
    try {

      if (!canManagePonds || !canManageFarmCycle) {
        Alert.alert(t.home.permissionDenied, t.home.onlyTechniciansCanAdd, [{ text: t.actions.confirm }]);

        return;
      }
      const {
        cyclePondId,
        density,
        docStart,
        supplier,
        plValue,
        cycleStartMode,
        baselineMbw,
        baselineEstimatedPopulation,
        baselineSurvivalRate,
        baselineCumulativeFeed,
      } = formData;

      const isCreatingNewCycle = !isEnterpriseFarm && (formData.cycleTargetMode === 'new' || openAccessibleFarmCycles.length === 0);
      const docStartString = formatLocalDateKey(docStart);

      let selectedFarmCycle: FarmCycle | undefined;
      if (isCreatingNewCycle) {
        const cycleName = formData.newCycleName?.trim() || `Cycle ${cycles.length + 1}`;
        selectedFarmCycle = {
          ...buildDefaultFarmCycle(cycles, company?.timeZone),
          cycleName,
          status: 'active',
          plannedStartDate: docStartString,
          stockingStartDate: docStartString,
          stockingEndDate: docStartString,
        };
      } else {
        selectedFarmCycle = cycles.find((cycle) => cycle.id === formData.cycleId) || activeFarmCycle;
      }

      if (isEnterpriseFarm && !selectedFarmCycle) {
        Alert.alert(t.farmCycle.noActiveCycle, t.enterprise.ownerMustStartCycle);

        return;
      }

      const sourcePond = startablePondOptions.find((pond) => pond.id === cyclePondId);
      if (!sourcePond || !density || !supplier || !plValue) {
        Alert.alert(t.messages.error, t.home.fillAllFields);

        return;
      }

      if (activePhysicalPondNames.has(getPhysicalPondKey(sourcePond.pondName))) {
        Alert.alert(t.messages.error, t.farmCycle.activeDuplicateMessage.replace('{{pondName}}', sourcePond.pondName));

        return;
      }
      const selectedCycleBlockIds = selectedFarmCycle?.blockIds?.length
        ? selectedFarmCycle.blockIds
        : selectedFarmCycle?.blockId
          ? [selectedFarmCycle.blockId]
          : [];
      if (selectedCycleBlockIds.length > 0 && (!sourcePond.blockId || !selectedCycleBlockIds.includes(sourcePond.blockId))) {
        Alert.alert(t.messages.error, t.enterpriseCycle.pondBlockMismatch);

        return;
      }
      if (!selectedFarmCycle?.blockIds?.length && selectedFarmCycle?.plannedPondIds?.length && !selectedFarmCycle.plannedPondIds.includes(sourcePond.id)) {
        Alert.alert(t.messages.error, t.enterpriseCycle.pondCycleMismatch);

        return;
      }

      const isMidcycle = cycleStartMode === 'midcycle';
      const baselineMbwValue = parseFloat(baselineMbw);
      const baselinePopulationValue = parseFloat(baselineEstimatedPopulation);
      const baselineSurvivalValue = parseFloat(baselineSurvivalRate);
      const baselineFeedValue = parseFloat(baselineCumulativeFeed);
      const baselineDate = new Date();
      const baselineDocValue = isMidcycle ? calculateDocFromDates(docStart, baselineDate) : 0;

      if (isMidcycle && (!baselineMbw || Number.isNaN(baselineMbwValue) || baselineMbwValue <= 0)) {
        Alert.alert(t.messages.error, t.midcycleOnboarding.baselineMbwRequired);

        return;
      }

      if (isMidcycle && (!Number.isFinite(baselineDocValue) || baselineDocValue < 0)) {
        Alert.alert(t.messages.error, t.midcycleOnboarding.baselineDateInvalid);

        return;
      }

      if (!isMidcycle && currentCompanyId) await assertSopStageGate(currentCompanyId, sourcePond.id, "stocking");
      const baselineDateString = formatLocalDateKey(baselineDate);
      const baselineSampling = isMidcycle ? [{
        id: `baseline-${Date.now()}`,
        date: baselineDateString,
        mbw: baselineMbwValue,
        mortality: 0,
        feed: Number.isNaN(baselineFeedValue) ? 0 : baselineFeedValue,
        isBaselineEstimate: true,
        source: 'midcycle_onboarding',
        ...(Number.isNaN(baselinePopulationValue) ? {} : { estimatedPopulation: baselinePopulationValue }),
        ...(Number.isNaN(baselineSurvivalValue) ? {} : { estimatedSurvivalRate: baselineSurvivalValue }),
        ...(Number.isNaN(baselineFeedValue) ? {} : { cumulativeFeedToDate: baselineFeedValue }),
        ...(selectedFarmCycle?.id ? { cycleId: selectedFarmCycle.id } : {}),
        ...(selectedFarmCycle?.cycleName ? { cycleName: selectedFarmCycle.cycleName } : {}),
      }] : [];

      const added = await addPond({
        id: Date.now().toString(),
        pondName: sourcePond.pondName,
        blockId: sourcePond.blockId,
        blockName: sourcePond.blockName,
        supplier,
        plSupplier: supplier,
        pondArea: sourcePond.pondArea,
        density: Number(density),
        initialPopulation: sourcePond.pondArea * Number(density),
        docStart: docStartString,
        initialWeight: convertPlToGrams(plValue),
        samplings: baselineSampling,
        mortalityRecords: [],
        totalHarvestedBiomass: 0,
        totalHarvestedPopulation: 0,
        totalHarvestedFeed: 0,
        physicalPondId: sourcePond.id,
        cycleId: selectedFarmCycle?.id,
        cycleName: selectedFarmCycle?.cycleName,
        cycleStatus: 'active',
        cycleStartedAt: docStartString,
        cycleStartMode,
        previousCyclePondId: sourcePond.id,
        ...(isMidcycle && {
          baselineDate: baselineDateString,
          baselineDoc: baselineDocValue,
          baselineMbw: baselineMbwValue,
          baselineEstimatedPopulation: Number.isNaN(baselinePopulationValue) ? undefined : baselinePopulationValue,
          baselineSurvivalRate: Number.isNaN(baselineSurvivalValue) ? undefined : baselineSurvivalValue,
          baselineCumulativeFeed: Number.isNaN(baselineFeedValue) ? undefined : baselineFeedValue,
          baselineSource: 'user_midcycle_estimate',
        }),
      }, { cycle: isCreatingNewCycle ? selectedFarmCycle : undefined });
      if (!added) {
        Alert.alert(t.messages.error, 'Could not start this pond. Sync the farm and check its physical pond link before trying again.');

        return;
      }
      if (selectedFarmCycle && !isCreatingNewCycle) {
        const stockingDates = [selectedFarmCycle.stockingStartDate, selectedFarmCycle.stockingEndDate, docStartString]
          .filter((date): date is string => Boolean(date))
          .sort();
        await updateFarmCycle(selectedFarmCycle.id, {
          status: 'stocking',
          stockingStartDate: stockingDates[0],
          stockingEndDate: stockingDates[stockingDates.length - 1],
        });
      }

      if (selectedFarmCycle) {
        setSelectedDashboardCycleId(selectedFarmCycle.id);
      }

      submitLockRef.current = false;
      closeModal();
      setCycleFilter('active');
      Alert.alert(t.messages.success, t.farmCycle.cycleStartedSuccess.replace('{{pondName}}', sourcePond.pondName));

    } catch (error) {
      Alert.alert(t.messages.error, getUserErrorMessage(error, t.messages.networkError));
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    activeFarmCycle,
    activePhysicalPondNames,
    addPond,
    calculateDocFromDates,
    canManageFarmCycle,
    canManagePonds,
    closeModal,
    currentCompanyId,
    company,
    convertPlToGrams,
    cycles,
    formData,
    formatLocalDateKey,
    isEnterpriseFarm,
    openAccessibleFarmCycles.length,
    setCycleFilter,
    setIsSubmitting,
    setSelectedDashboardCycleId,
    startablePondOptions,
    submitLockRef,
    t,
    updateFarmCycle,
  ]);

  const handleAddSamplingData = useCallback(async () => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setIsSubmitting(true);

    if (!canRecordPondData) {
      Alert.alert(t.home.permissionDenied, t.home.onlyTechniciansCanAdd, [{ text: t.actions.confirm }]);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const { selectedPond, mbw, feed, samplingDate } = formData;
    if (!selectedPond || !mbw) {
      Alert.alert(t.messages.error, t.home.fillAllFields);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const selectedPondData = activePonds.find(p => p.pondName === selectedPond);
    if (!selectedPondData) {
      Alert.alert(t.messages.error, t.home.pondNotFound);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    try {
      const outcome = await addSampling(selectedPondData.id, {
        id: Date.now().toString(),
        mbw: parseNumericInput(mbw),
        mortality: 0,
        feed: parseNumericInput(feed),
        date: formatLocalDateKey(samplingDate),
        // No feedData here - sampling doesn't deduct from inventory
      });
      if (!outcome.success || outcome.status === 'rejected') {
        Alert.alert(t.messages.error, outcome.error || 'Could not save sampling locally.');
        return;
      }
      submitLockRef.current = false;
      closeModal();
      Alert.alert(t.messages.success, t.home.samplingAddedSuccess);
    } catch (error) {
      Alert.alert(t.messages.error, getUserErrorMessage(error, 'Could not save sampling locally.'));
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    submitLockRef,
    setIsSubmitting,
    canRecordPondData,
    formData,
    activePonds,
    t,
    addSampling,
    parseNumericInput,
    formatLocalDateKey,
    closeModal,
  ]);

  const handleAddMortalityRecord = useCallback(async () => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setIsSubmitting(true);

    if (!canRecordPondData || !user?.uid) {
      Alert.alert(t.home.permissionDenied, t.home.onlyTechniciansCanAddMortality, [{ text: t.actions.confirm }]);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const {
      selectedPond,
      mortalityObservationType,
      mortalityCount,
      siponShift,
      siphonedCount,
      mortalCount,
      mortalityDate,
      mortalityNotes,
    } = formData;
    const selectedPondData = activePonds.find((pond) => pond.pondName === selectedPond);
    if (!selectedPondData) {
      Alert.alert(t.messages.error, t.home.pondNotFound);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const siphoned = Number(String(siphonedCount).trim().replace(',', '.')) || 0;
    const mortal = Number(String(mortalCount).trim().replace(',', '.')) || 0;
    const count = mortalityObservationType === 'none_observed'
      ? 0
      : mortalityObservationType === 'observed_recovered'
        ? siphoned + mortal
        : Number(String(mortalityCount).trim().replace(',', '.'));
    if (mortalityObservationType !== 'none_observed' && (!Number.isInteger(count) || count <= 0)) {
      Alert.alert(t.messages.error, t.home.mortalityPositiveCountRequired);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const dateKey = formatLocalDateKey(mortalityDate);
    const todayKey = getFarmDateKey(new Date(), company?.timeZone);
    const cycleStartKey = String(selectedPondData.cycleStartedAt || selectedPondData.docStart || '').slice(0, 10);
    if (dateKey > todayKey) {
      Alert.alert(t.messages.error, t.home.mortalityFutureDateError);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }
    if (cycleStartKey && dateKey < cycleStartKey) {
      Alert.alert(t.messages.error, t.home.mortalityBeforeCycleError);
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const mbwAtRecord = [...(selectedPondData.samplings || [])]
      .filter((sampling) => sampling.date <= dateKey && Number(sampling.mbw) > 0)
      .sort((first, second) => second.date.localeCompare(first.date))[0]?.mbw;
    try {
      const outcome = await addMortalityRecord(selectedPondData.id, {
        id: mortalityDraftIdRef.current || (mortalityDraftIdRef.current = `mortality-${Date.now()}-${Math.random().toString(36).slice(2)}`),
        date: dateKey,
        observationType: mortalityObservationType,
        count,
        ...(mortalityObservationType === 'observed_recovered' ? {
          siponShift,
          siphonedCount: siphoned,
          mortalCount: mortal,
        } : {}),
        mbwAtRecord: Number(mbwAtRecord) > 0 ? Number(mbwAtRecord) : undefined,
        notes: mortalityNotes.trim() || undefined,
        recordedAt: new Date().toISOString(),
        recordedBy: user.uid,
        cycleId: selectedPondData.cycleId,
        cycleName: selectedPondData.cycleName,
        pondCycleId: selectedPondData.pondCycleId || selectedPondData.id,
      });

      if (!outcome.success) throw new Error(outcome.error || 'Could not save mortality locally.');
      submitLockRef.current = false;
      closeModal();
      Alert.alert(t.messages.success, t.home.mortalitySavedSuccess);
    } catch (error) {
      Alert.alert(t.messages.error, getUserErrorMessage(error, 'Could not save mortality locally.'));
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    activePonds,
    addMortalityRecord,
    canRecordPondData,
    closeModal,
    company,
    formData,
    formatLocalDateKey,
    mortalityDraftIdRef,
    setIsSubmitting,
    submitLockRef,
    t,
    user,
  ]);

  const handleEndPondCycle = useCallback((pond: Pond) => {
    if (!canManagePonds) {
      Alert.alert(
        t.home.permissionDenied,
        t.home.onlyTechniciansCanDelete,
        [{ text: t.actions.confirm }]
      );
      return;
    }

    if (!isPondCycleActive(pond)) {
      Alert.alert(t.farmCycle.pondAlreadyEndedTitle, t.farmCycle.pondAlreadyEndedMessage.replace('{{pondName}}', pond.pondName));
      return;
    }

    const goToHarvest = () => router.push('/harvest');
    const endCycle = async (reason: PondCycleEndReason) => {
      try {
        if (reason === 'harvested' && !hasFinalHarvestForPondCycle(harvestRecords, pond)) {
          Alert.alert(
            t.farmCycle.finalHarvestRequiredTitle,
            t.farmCycle.finalHarvestRequiredMessage.replace('{{pondNames}}', pond.pondName),
            [
              { text: t.actions.cancel, style: 'cancel' },
              { text: t.farmCycle.goToHarvest, onPress: goToHarvest },
            ]
          );
          return;
        }
        const today = getFarmDateKey(new Date(), company?.timeZone);
        await endPondCycle(pond.id, today, reason, user?.uid);
        Alert.alert(t.messages.success, t.farmCycle.pondEndedSuccess.replace('{{pondName}}', pond.pondName));

      } catch (error) {
        Alert.alert(t.messages.error, getUserErrorMessage(error, t.messages.networkError));
      }
    };
    const chooseNonHarvestReason = () => {
      Alert.alert(
        t.farmCycle.endCycleTitle,
        t.farmCycle.endPondCycleMessage.replace('{{pondName}}', pond.pondName),
        [
          { text: t.actions.cancel, style: 'cancel' },
          { text: t.farmCycle.reasons.disease, onPress: () => endCycle('disease') },
          { text: t.farmCycle.reasons.resetOther, onPress: () => endCycle('other') },
        ]
      );
    };

    Alert.alert(
      t.farmCycle.endCycleTitle,
      t.farmCycle.endPondCycleMessage.replace('{{pondName}}', pond.pondName),
      [
        { text: t.actions.cancel, style: 'cancel' },
        { text: t.farmCycle.reasons.harvested, onPress: () => endCycle('harvested') },
        { text: t.farmCycle.reasons.nonHarvest, onPress: chooseNonHarvestReason },
      ]
    );
  }, [canManagePonds, company, endPondCycle, harvestRecords, router, t, user]);

  const handleDeletePond = useCallback((pond: Pond) => {
    if (!canManagePonds) {
      Alert.alert(
        t.home.permissionDenied,
        t.home.onlyTechniciansCanDelete,
        [{ text: t.actions.confirm }]
      );
      return;
    }

    if (isPondCycleActive(pond)) {
      Alert.alert(
        t.farmCycle.endCycleTitle,
        t.farmCycle.endPondCycleMessage.replace('{{pondName}}', pond.pondName),
        [{ text: t.actions.confirm }]
      );
      return;
    }

    Alert.alert(
      t.home.deletePond,
      `${t.messages.deletePondConfirm} ${pond.pondName}? ${t.messages.deletePondWarning}`,
      [
        { text: t.actions.cancel, style: 'cancel' },
        {
          text: t.actions.delete,
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePond(pond.id);
              Alert.alert(t.messages.success, t.home.pondDeletedSuccess);
            } catch (error) {
              Alert.alert(t.messages.error, getUserErrorMessage(error, t.messages.networkError));
            }
          },
        },
      ]
    );
  }, [canManagePonds, deletePond, t]);

  const handleDeletePhysicalPond = useCallback((pond: PhysicalPond) => {
    if (!canManagePonds) {
      Alert.alert(
        t.home.permissionDenied,
        t.home.onlyTechniciansCanDelete,
        [{ text: t.actions.confirm }]
      );
      return;
    }

    if (!company?.id) {
      Alert.alert(t.messages.error, t.messages.dataNotFound);
      return;
    }

    if (pond.status === 'active' || pond.activePondId) {
      Alert.alert(
        t.farmCycle.endCycleTitle,
        t.farmCycle.endPondCycleMessage.replace('{{pondName}}', pond.pondName),
        [{ text: t.actions.confirm }]
      );
      return;
    }

    const persistDeletePhysicalPond = async () => {
      try {
        await deletePhysicalPond(pond.id);
        Alert.alert(t.messages.success, t.home.pondDeletedSuccess);
      } catch (error) {
        console.error('Failed to delete physical pond:', error);
        Alert.alert(t.messages.error, t.messages.networkError);
      }
    };

    Alert.alert(
      t.home.deletePond,
      `${t.messages.deletePondConfirm} ${pond.pondName}?`,
      [
        { text: t.actions.cancel, style: 'cancel' },
        {
          text: t.actions.delete,
          style: 'destructive',
          onPress: () => {
            void persistDeletePhysicalPond();
          },
        },
      ]
    );
  }, [canManagePonds, company?.id, deletePhysicalPond, t]);

  const handleRenameFarmCycle = useCallback(async () => {
    try {
      if (!activeFarmCycle || !canManageFarmCycle) return;
      const nextName = cycleNameDraft.trim();
      if (!nextName) {
        Alert.alert(t.messages.error, t.farmCycle.cycleNameRequired);
        return;
      }

      await updateFarmCycle(activeFarmCycle.id, { cycleName: nextName });
      Alert.alert(t.messages.success, t.farmCycle.cycleNameUpdated);

    } catch (error) {
      Alert.alert(t.messages.error, getUserErrorMessage(error, t.messages.networkError));
    }
  }, [activeFarmCycle, canManageFarmCycle, cycleNameDraft, t, updateFarmCycle]);
  return {
    createPhysicalPondOnServer,
    handleAddPond,
    handleAddCycle,
    handleAddSamplingData,
    handleAddMortalityRecord,
    handleEndPondCycle,
    handleDeletePond,
    handleDeletePhysicalPond,
    handleRenameFarmCycle,
  };
}
