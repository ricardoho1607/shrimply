import { useCallback } from 'react';
import {
  Alert
} from 'react-native';
import { getPhysicalPondKey, isPondCycleActive, type FarmCycle, type PhysicalPond } from "../../app/store/pondStore";
import {
  type FarmBlock
} from "../../shared/enterpriseBlocks";
import { getEnterpriseStockingDateRange } from "../../shared/enterpriseCycleSetup";
import { differenceInFarmCalendarDays, getFarmDateKey } from "../../shared/farmDate";
import { hasFinalHarvestForPondCycle } from "../../shared/harvestCalculations";
import type { usePondManagementPondActions } from './usePondManagementPondActions';
import type { usePondManagementState } from './usePondManagementState';
type Context = Pick<ReturnType<typeof usePondManagementState> & ReturnType<typeof usePondManagementPondActions>,
  'activeFarmCycle'
  | 'canManageFarmCycle'
  | 'activeCyclePonds'
  | 'harvestRecords'
  | 't'
  | 'router'
  | 'company'
  | 'user'
  | 'currentCyclePonds'
  | 'closeFarmCycle'
  | 'setCycleFilter'
  | 'setCycleManagerExpanded'
  | 'addFarmCycle'
  | 'updateFarmCycle'
  | 'addPond'
  | 'physicalPonds'
  | 'ponds'
  | 'createPhysicalPondOnServer'>;
export function usePondManagementEnterpriseActions(context: Context) {
  const {
    activeFarmCycle,
    canManageFarmCycle,
    activeCyclePonds,
    harvestRecords,
    t,
    router,
    company,
    user,
    currentCyclePonds,
    closeFarmCycle,
    setCycleFilter,
    setCycleManagerExpanded,
    addFarmCycle,
    updateFarmCycle,
    addPond,
    physicalPonds,
    ponds,
    createPhysicalPondOnServer,
  } = context;
  const handleCloseFarmCycle = useCallback(() => {
    if (!activeFarmCycle || !canManageFarmCycle) return;

    const missingFinalHarvestPonds = activeCyclePonds.filter((pond) =>
      !hasFinalHarvestForPondCycle(harvestRecords, pond)
    );
    if (missingFinalHarvestPonds.length > 0) {
      Alert.alert(
        t.farmCycle.finalHarvestRequiredTitle,
        t.farmCycle.finalHarvestRequiredMessage.replace(
          '{{pondNames}}',
          missingFinalHarvestPonds.map((pond) => pond.pondName).join(', ')
        ),
        [
          { text: t.actions.cancel, style: 'cancel' },
          { text: t.farmCycle.goToHarvest, onPress: () => router.push('/harvest') },
        ]
      );
      return;
    }

    const today = getFarmDateKey(new Date(), company?.timeZone);
    const reportCycleId = activeFarmCycle.id;
    const canViewCycleReport = ['owner', 'co-owner', 'manager', 'admin'].includes(user?.role || '');
    Alert.alert(
      t.farmCycle.endCycleTitle,
      t.farmCycle.endFarmCycleMessage
        .replace('{{cycleName}}', activeFarmCycle.cycleName)
        .replace('{{pondCount}}', String(currentCyclePonds.length)),
      [
        { text: t.actions.cancel, style: 'cancel' },
        {
          text: t.farmCycle.endCycleAction,
          style: 'destructive',
          onPress: async () => {
            try {
              await closeFarmCycle(activeFarmCycle.id, today, { endedBy: user?.uid });
              setCycleFilter('ended');
              setCycleManagerExpanded(false);
              Alert.alert(
                t.messages.success,
                t.farmCycle.endFarmCycleSuccess.replace('{{cycleName}}', activeFarmCycle.cycleName),
                canViewCycleReport
                  ? [
                    { text: t.farmCycle.later, style: 'cancel' },
                    {
                      text: t.farmCycle.viewCycleReport,
                      onPress: () => router.push({ pathname: '/cycle-report', params: { cycleId: reportCycleId } }),
                    },
                  ]
                  : [{ text: t.actions.confirm }]
              );
            } catch (error) {
              console.error('Failed to persist farm cycle close:', error);
              Alert.alert(t.messages.error, t.farmCycle.endCycleFailed);
            }
          },
        },
      ]
    );
  }, [
    activeCyclePonds,
    activeFarmCycle,
    canManageFarmCycle,
    closeFarmCycle,
    company?.timeZone,
    currentCyclePonds.length,
    harvestRecords,
    router,
    setCycleFilter,
    setCycleManagerExpanded,
    t,
    user,
  ]);

  const handleSaveEnterpriseProductionCycle = useCallback(async (input: {
    cycle?: FarmCycle;
    cycleName: string;
    block: FarmBlock;
    plannedStartDate: string;
    cycleStartMode: 'new' | 'midcycle';
    ponds: {
      pond: PhysicalPond;
      stockingDate: string;
      density: number;
      supplier: string;
      baselineMbw?: number;
      baselineEstimatedPopulation?: number;
      baselineSurvivalRate?: number;
      baselineCumulativeFeed?: number;
    }[];
  }) => {
    const stockingRange = getEnterpriseStockingDateRange([
      input.cycle?.stockingStartDate,
      input.cycle?.stockingEndDate,
      ...input.ponds.map((pond) => pond.stockingDate),
    ]);
    const cycle = input.cycle || await addFarmCycle({
      cycleName: input.cycleName,
      status: 'active',
      blockIds: [input.block.id],
      blockNames: [input.block.name],
      plannedStartDate: input.plannedStartDate,
      stockingStartDate: stockingRange.stockingStartDate,
      stockingEndDate: stockingRange.stockingEndDate,
    });
    if (input.cycle) {
      await updateFarmCycle(cycle.id, {
        status: 'active',
        stockingStartDate: stockingRange.stockingStartDate,
        stockingEndDate: stockingRange.stockingEndDate,
      });
    }
    const startedAt = Date.now();
    const baselineDate = getFarmDateKey(new Date(), company?.timeZone);
    for (const [index, { pond, stockingDate, density, supplier, baselineMbw, baselineEstimatedPopulation, baselineSurvivalRate, baselineCumulativeFeed }] of input.ponds.entries()) {
      const pondCycleId = `${startedAt}-${index}`;
      const baselineDoc = differenceInFarmCalendarDays(baselineDate, stockingDate);
      const baselineSampling = input.cycleStartMode === 'midcycle' && baselineMbw ? [{
        id: `baseline-${startedAt}-${index}`,
        date: baselineDate,
        mbw: baselineMbw,
        mortality: 0,
        feed: baselineCumulativeFeed ?? 0,
        isBaselineEstimate: true,
        source: 'midcycle_onboarding',
        ...(baselineEstimatedPopulation === undefined ? {} : { estimatedPopulation: baselineEstimatedPopulation }),
        ...(baselineSurvivalRate === undefined ? {} : { estimatedSurvivalRate: baselineSurvivalRate }),
        ...(baselineCumulativeFeed === undefined ? {} : { cumulativeFeedToDate: baselineCumulativeFeed }),
        cycleId: cycle.id,
        cycleName: cycle.cycleName,
        pondCycleId,
      }] : [];
      const added = await addPond({
        id: pondCycleId,
        pondName: pond.pondName,
        pondArea: pond.pondArea,
        blockId: input.block.id,
        blockName: input.block.name,
        density,
        initialPopulation: pond.pondArea * density,
        docStart: stockingDate,
        supplier,
        plSupplier: supplier,
        initialWeight: 0.5,
        samplings: baselineSampling,
        mortalityRecords: [],
        totalHarvestedBiomass: 0,
        totalHarvestedPopulation: 0,
        totalHarvestedFeed: 0,
        physicalPondId: pond.id,
        previousCyclePondId: pond.id,
        cycleId: cycle.id,
        cycleName: cycle.cycleName,
        pondCycleId,
        cycleStatus: 'active',
        cycleStartedAt: stockingDate,
        cycleStartMode: input.cycleStartMode,
        ...(input.cycleStartMode === 'midcycle' && baselineMbw ? {
          baselineDate,
          baselineDoc,
          baselineMbw,
          baselineEstimatedPopulation,
          baselineSurvivalRate,
          baselineCumulativeFeed,
          baselineSource: 'user_midcycle_estimate',
        } : {}),
      });
      if (!added) throw new Error('Could not start this pond. Sync the farm and check its physical pond link before trying again.');
    }
  }, [addFarmCycle, addPond, company?.timeZone, updateFarmCycle]);

  const handleCreateEnterprisePhysicalPond = useCallback(async (input: {
    pondName: string;
    pondArea: number;
    block: FarmBlock;
  }) => {
    const pondKey = getPhysicalPondKey(input.pondName);
    const alreadyExists = physicalPonds.some((pond) => getPhysicalPondKey(pond.pondName) === pondKey)
      || ponds.some((pond) => getPhysicalPondKey(pond.pondName) === pondKey);
    if (alreadyExists) throw new Error(`${input.pondName} already exists.`);

    const id = Date.now().toString();
    await createPhysicalPondOnServer({
      id,
      pondName: input.pondName,
      pondArea: input.pondArea,
      blockId: input.block.id,
      blockName: input.block.name,
      status: 'idle',
    });
  }, [createPhysicalPondOnServer, physicalPonds, ponds]);

  const handleEditEnterpriseCycle = useCallback((cycle: FarmCycle, input: { cycleName: string; blocks: FarmBlock[] }) => {
    return updateFarmCycle(cycle.id, {
      cycleName: input.cycleName,
      blockIds: input.blocks.map((block) => block.id),
      blockNames: input.blocks.map((block) => block.name),
    });
  }, [updateFarmCycle]);

  const handleCloseEnterpriseBlockCycle = useCallback((cycle: FarmCycle) => {
    const activePondsForCycle = ponds.filter((pond) => pond.cycleId === cycle.id && isPondCycleActive(pond));
    if (activePondsForCycle.length > 0) {
      Alert.alert(
        t.farmCycle.endCycleTitle,
        `End the active pond cycles first: ${activePondsForCycle.map((pond) => pond.pondName).join(', ')}`,
      );
      return;
    }
    return updateFarmCycle(cycle.id, {
      status: 'closed',
      closedAt: getFarmDateKey(new Date(), company?.timeZone),
    });
  }, [company?.timeZone, ponds, t, updateFarmCycle]);
  return { handleCloseFarmCycle, handleSaveEnterpriseProductionCycle, handleCreateEnterprisePhysicalPond, handleEditEnterpriseCycle, handleCloseEnterpriseBlockCycle };
}
