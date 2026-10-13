import { useCallback } from 'react';
import {
  Alert
} from 'react-native';
import { isBaselineSampling, type Pond, type Sampling } from "../../app/store/pondStore";
import { getFarmDateKey } from "../../shared/farmDate";
import type { usePondManagementState } from './usePondManagementState';
type Context = Pick<ReturnType<typeof usePondManagementState>,
  'submitLockRef'
  | 'mortalityDraftIdRef'
  | 'isEnterpriseFarm'
  | 'availableEnterpriseBlocks'
  | 'setFormData'
  | 'cycles'
  | 'openAccessibleFarmCycles'
  | 'activeFarmCycle'
  | 'setModalType'
  | 'setMenuModalVisible'
  | 'setIsSubmitting'
  | 'setModalVisible'
  | 'company'
  | 'setEditingBaselinePondId'
  | 'normalizeDateValue'
  | 'canRecordPondData'
  | 't'
  | 'accessiblePonds'
  | 'editingBaselinePondId'
  | 'formData'
  | 'calculateDocFromDates'
  | 'formatLocalDateKey'
  | 'updatePond'
  | 'closeModal'>;
export function usePondManagementBaselineActions(context: Context) {
  const {
    submitLockRef,
    mortalityDraftIdRef,
    isEnterpriseFarm,
    availableEnterpriseBlocks,
    setFormData,
    cycles,
    openAccessibleFarmCycles,
    activeFarmCycle,
    setModalType,
    setMenuModalVisible,
    setIsSubmitting,
    setModalVisible,
    company,
    setEditingBaselinePondId,
    normalizeDateValue,
    canRecordPondData,
    t,
    accessiblePonds,
    editingBaselinePondId,
    formData,
    calculateDocFromDates,
    formatLocalDateKey,
    updatePond,
    closeModal,
  } = context;
  const openModal = useCallback((type: 'pond' | 'sampling' | 'mortality' | 'cycle' | 'baseline') => {
    if (submitLockRef.current) return;
    mortalityDraftIdRef.current = null;
    if (type === 'pond' && isEnterpriseFarm && availableEnterpriseBlocks.length === 1) {
      setFormData((current) => ({ ...current, blockId: availableEnterpriseBlocks[0].id }));
    }
    if (type === 'cycle') {
      const nextCycleNumber = cycles.length + 1;
      setFormData((current) => ({
        ...current,
        cycleTargetMode: openAccessibleFarmCycles.length > 0 ? 'existing' : 'new',
        cycleId: current.cycleId || activeFarmCycle?.id || openAccessibleFarmCycles[0]?.id || '',
        newCycleName: `Cycle ${nextCycleNumber}`,
      }));
    }
    setModalType(type);
    setMenuModalVisible(false);
    submitLockRef.current = false;
    setIsSubmitting(false);
    setModalVisible(true);
  }, [
    activeFarmCycle?.id,
    availableEnterpriseBlocks,
    cycles.length,
    isEnterpriseFarm,
    mortalityDraftIdRef,
    openAccessibleFarmCycles,
    setFormData,
    setIsSubmitting,
    setMenuModalVisible,
    setModalType,
    setModalVisible,
    submitLockRef,
  ]);

  const openBaselineEditModal = useCallback((pond: Pond) => {
    if (submitLockRef.current) return;
    const baselineSampling = (pond.samplings || [])
      .filter(isBaselineSampling)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const baselineDate = pond.baselineDate || baselineSampling?.date || getFarmDateKey(new Date(), company?.timeZone);

    setEditingBaselinePondId(pond.id);
    setFormData((prev) => ({
      ...prev,
      baselineDate: normalizeDateValue(new Date(baselineDate)),
      baselineMbw: String(pond.baselineMbw ?? baselineSampling?.mbw ?? ''),
      baselineEstimatedPopulation: String(pond.baselineEstimatedPopulation ?? baselineSampling?.estimatedPopulation ?? ''),
      baselineSurvivalRate: String(pond.baselineSurvivalRate ?? baselineSampling?.estimatedSurvivalRate ?? ''),
      baselineCumulativeFeed: String(pond.baselineCumulativeFeed ?? baselineSampling?.cumulativeFeedToDate ?? baselineSampling?.feed ?? ''),
    }));
    setModalType('baseline');
    submitLockRef.current = false;
    setIsSubmitting(false);
    setModalVisible(true);
  }, [company?.timeZone, normalizeDateValue, setEditingBaselinePondId, setFormData, setIsSubmitting, setModalType, setModalVisible, submitLockRef]);

  const handleUpdateBaseline = useCallback(async () => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setIsSubmitting(true);
    try {

      if (!canRecordPondData) {
        Alert.alert(t.home.permissionDenied, t.home.onlyTechniciansCanAdd, [{ text: t.actions.confirm }]);
        submitLockRef.current = false;
        setIsSubmitting(false);
        return;
      }

      const pond = accessiblePonds.find((item) => item.id === editingBaselinePondId);
      if (!pond) {
        Alert.alert(t.messages.error, t.messages.error);
        submitLockRef.current = false;
        setIsSubmitting(false);
        return;
      }

      const cycleStartDate = normalizeDateValue(pond.docStart || pond.cycleStartedAt || formData.baselineDate);
      const baselineDocValue = calculateDocFromDates(cycleStartDate, formData.baselineDate);
      const baselineMbwValue = parseFloat(formData.baselineMbw);
      const baselinePopulationValue = parseFloat(formData.baselineEstimatedPopulation);
      const baselineSurvivalValue = parseFloat(formData.baselineSurvivalRate);
      const baselineFeedValue = parseFloat(formData.baselineCumulativeFeed);

      if (!formData.baselineMbw || Number.isNaN(baselineMbwValue) || baselineMbwValue <= 0) {
        Alert.alert(t.messages.error, t.midcycleOnboarding.baselineMbwRequired);
        submitLockRef.current = false;
        setIsSubmitting(false);
        return;
      }

      if (!Number.isFinite(baselineDocValue) || baselineDocValue < 0) {
        Alert.alert(t.messages.error, t.midcycleOnboarding.baselineDateInvalid);
        submitLockRef.current = false;
        setIsSubmitting(false);
        return;
      }

      const baselineDateString = formatLocalDateKey(formData.baselineDate);
      const docStartString = formatLocalDateKey(cycleStartDate);
      const baselineSamplingIndex = (pond.samplings || []).findIndex(isBaselineSampling);
      const existingBaseline = baselineSamplingIndex >= 0 ? pond.samplings[baselineSamplingIndex] : undefined;
      const baselineSampling: Sampling = {
        id: existingBaseline?.id || `baseline-${Date.now()}`,
        date: baselineDateString,
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

      await updatePond(pond.id, {
        docStart: docStartString,
        cycleStartedAt: docStartString,
        cycleStartMode: 'midcycle',
        baselineDate: baselineDateString,
        baselineDoc: baselineDocValue,
        baselineMbw: baselineMbwValue,
        baselineEstimatedPopulation: Number.isNaN(baselinePopulationValue) ? undefined : baselinePopulationValue,
        baselineSurvivalRate: Number.isNaN(baselineSurvivalValue) ? undefined : baselineSurvivalValue,
        baselineCumulativeFeed: Number.isNaN(baselineFeedValue) ? undefined : baselineFeedValue,
        baselineSource: 'user_midcycle_estimate',
        samplings,
      });

      setEditingBaselinePondId(null);
      submitLockRef.current = false;
      setIsSubmitting(false);
      closeModal();
      Alert.alert(t.messages.success, t.midcycleOnboarding.baselineUpdated);

    } catch (error) {
      Alert.alert(t.messages.error, error instanceof Error ? error.message : t.messages.networkError);
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    accessiblePonds,
    calculateDocFromDates,
    canRecordPondData,
    closeModal,
    editingBaselinePondId,
    formData.baselineCumulativeFeed,
    formData.baselineDate,
    formData.baselineEstimatedPopulation,
    formData.baselineMbw,
    formData.baselineSurvivalRate,
    formatLocalDateKey,
    normalizeDateValue,
    setEditingBaselinePondId,
    setIsSubmitting,
    submitLockRef,
    t,
    updatePond,
  ]);
  return { openModal, openBaselineEditModal, handleUpdateBaseline };
}
