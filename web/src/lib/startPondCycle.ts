import { assertSopStageGate } from './sopGuards';
import {
  collection,
  doc,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { removeUndefinedFields } from './firestoreData';
import { resolveCompanyPhysicalPond } from './physicalPondIdentity';

export type PondCycleStartMode = 'new' | 'midcycle';

export interface StartPondCycleFormValue {
  density: string;
  docStart: string;
  plValue: string;
  plSupplier: string;
  cycleStartMode: PondCycleStartMode;
  baselineMbw: string;
  baselineEstimatedPopulation: string;
  baselineSurvivalRate: string;
  baselineCumulativeFeed: string;
  cycleTargetMode?: 'existing' | 'new';
  targetCycleId?: string;
  newCycleName?: string;
  assignedTechnicianId?: string | null;
}

export interface StartablePondCycleRecord {
  id: string;
  physicalPondId?: string | null;
  previousCyclePondId?: string | null;
  pondName: string;
  pondArea?: number;
  area?: number;
  blockId?: string | null;
  blockName?: string | null;
}

export interface OpenFarmCycle {
  id: string;
  cycleName: string;
  status?: 'planning' | 'stocking' | 'active' | 'closing' | 'closed';
  blockIds?: string[] | null;
  blockNames?: string[] | null;
  blockId?: string | null;
  blockName?: string | null;
  plannedPondIds?: string[] | null;
  stockingStartDate?: string;
  stockingEndDate?: string;
}

export type StartPondCycleErrorCode =
  | 'duplicate'
  | 'invalidDensity'
  | 'invalidPlValue'
  | 'invalidSupplier'
  | 'invalidStartDate'
  | 'baselineMbwRequired'
  | 'blockMismatch'
  | 'cycleMismatch';

export class StartPondCycleError extends Error {
  constructor(public readonly code: StartPondCycleErrorCode) {
    super(code);
    this.name = 'StartPondCycleError';
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

const getDateOnlyUtcTime = (dateString: string): number => {
  const [year, month, day] = dateString.split('-').map(Number);
  return Date.UTC(year, (month || 1) - 1, day || 1);
};

const calculateDocFromDates = (startDate: string, baselineDate: string): number =>
  Math.floor((getDateOnlyUtcTime(baselineDate) - getDateOnlyUtcTime(startDate)) / DAY_MS);

export const getPhysicalPondKey = (pondName: string) => pondName.trim().toLowerCase();

export const convertPlStageToGrams = (plValue: string): number => {
  const stage = Number(String(plValue).trim().replace(',', '.'));
  return Number.isFinite(stage) && stage > 0 ? stage / 10 : 0;
};

const parseOptionalNumber = (value: string): number | undefined => {
  const normalized = String(value).trim().replace(',', '.');
  if (!normalized) return undefined;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export async function startPondCycle({
  companyId,
  userId,
  pond,
  pondType,
  activeCycle,
  form,
  today,
  activePonds,
  operationId,
}: {
  operationId?: string;
  companyId: string;
  userId: string;
  pond: StartablePondCycleRecord;
  pondType: 'physical' | 'cycle';
  activeCycle?: OpenFarmCycle | null;
  form: StartPondCycleFormValue;
  today: string;
  activePonds: { id: string; pondName: string; cycleStatus?: 'active' | 'ended' }[];
}): Promise<{ pondId: string; cycleId: string }> {
  if (operationId) {
    const committed = await runTransaction(db, async tx => {
      const existing = await tx.get(doc(db, 'companies', companyId, 'ponds', operationId));
      return existing.exists() ? { pondId: operationId, cycleId: String(existing.data().cycleId) } : null;
    });
    if (committed) return committed;
  }
  const hasDuplicate = activePonds.some((activePond) => (
    activePond.id !== pond.id
    && activePond.cycleStatus !== 'ended'
    && getPhysicalPondKey(activePond.pondName) === getPhysicalPondKey(pond.pondName)
  ));
  if (hasDuplicate) throw new StartPondCycleError('duplicate');
  const physicalPond = await resolveCompanyPhysicalPond(companyId, pondType === 'physical' ? { ...pond, physicalPondId: pond.id } : pond);
  if(form.cycleStartMode!=='midcycle')await assertSopStageGate(companyId, physicalPond.id, 'stocking');

  const isCreatingNewCycle = form.cycleTargetMode === 'new' || !activeCycle;
  const assignedBlockIds = (!isCreatingNewCycle && activeCycle?.blockIds?.length)
    ? activeCycle.blockIds
    : (!isCreatingNewCycle && activeCycle?.blockId)
      ? [activeCycle.blockId]
      : [];
  if (assignedBlockIds.length > 0 && (!pond.blockId || !assignedBlockIds.includes(pond.blockId))) {
    throw new StartPondCycleError('blockMismatch');
  }
  if (!isCreatingNewCycle && Array.isArray(activeCycle?.plannedPondIds) && !activeCycle.plannedPondIds.includes(physicalPond.id)) {
    throw new StartPondCycleError('cycleMismatch');
  }

  const pondArea = Number(pond.pondArea ?? pond.area);
  const density = Number(String(form.density).trim().replace(',', '.'));
  if (!Number.isFinite(pondArea) || pondArea <= 0 || !Number.isFinite(density) || density <= 0) {
    throw new StartPondCycleError('invalidDensity');
  }

  const initialWeight = convertPlStageToGrams(form.plValue);
  if (initialWeight <= 0) throw new StartPondCycleError('invalidPlValue');

  const supplier = form.plSupplier.trim();
  if (!supplier) throw new StartPondCycleError('invalidSupplier');

  const startDateTime = getDateOnlyUtcTime(form.docStart);
  const todayTime = getDateOnlyUtcTime(today);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.docStart) || !Number.isFinite(startDateTime) || new Date(startDateTime).toISOString().slice(0, 10) !== form.docStart || startDateTime > todayTime) {
    throw new StartPondCycleError('invalidStartDate');
  }

  const isMidcycle = form.cycleStartMode === 'midcycle';
  const baselineDoc = isMidcycle ? calculateDocFromDates(form.docStart, today) : 0;
  const baselineMbw = Number(String(form.baselineMbw).trim().replace(',', '.'));
  if (isMidcycle && (!Number.isFinite(baselineMbw) || baselineMbw <= 0)) {
    throw new StartPondCycleError('baselineMbwRequired');
  }

  const baselinePopulation = parseOptionalNumber(form.baselineEstimatedPopulation);
  const baselineSurvivalRate = parseOptionalNumber(form.baselineSurvivalRate);
  const baselineFeed = parseOptionalNumber(form.baselineCumulativeFeed);
  
  const pondRef = operationId
    ? doc(db, 'companies', companyId, 'ponds', operationId)
    : doc(collection(db, 'companies', companyId, 'ponds'));
  const cycleRef = doc(db, 'companies', companyId, 'cycles', `cycle-${pondRef.id}`);
  const physicalRef = doc(db, 'companies', companyId, 'physicalPonds', physicalPond.id);
  return runTransaction(db, async batch => {
    const existingPond = await batch.get(pondRef);
    if (existingPond.exists()) return { pondId: pondRef.id, cycleId: String(existingPond.data().cycleId) };
    const physicalSnapshot = await batch.get(physicalRef);
    if (!physicalSnapshot.exists()) throw new StartPondCycleError('cycleMismatch');
    const currentPhysical = physicalSnapshot.data();
    if (currentPhysical.activePondId && currentPhysical.activePondId !== pond.id) throw new StartPondCycleError('duplicate');
    if (currentPhysical.activePondId === pond.id && pondType === 'cycle') {
      const previousPond = await batch.get(doc(db, 'companies', companyId, 'ponds', pond.id));
      if (previousPond.exists() && previousPond.data().cycleStatus !== 'ended') throw new StartPondCycleError('duplicate');
    }
    const existingCycle = !isCreatingNewCycle && activeCycle
      ? await batch.get(doc(db, 'companies', companyId, 'cycles', activeCycle.id)) : null;
    if (existingCycle && (!existingCycle.exists() || existingCycle.data().status === 'closed')) throw new StartPondCycleError('cycleMismatch');
    const currentCycle = existingCycle?.data();
    if (Array.isArray(currentCycle?.plannedPondIds) && !currentCycle.plannedPondIds.includes(physicalPond.id)) {
      throw new StartPondCycleError('cycleMismatch');
    }
  
  let targetCycleId = activeCycle?.id || '';
  let targetCycleName = activeCycle?.cycleName || '';

  if (isCreatingNewCycle) {
    targetCycleId = cycleRef.id;
    targetCycleName = form.newCycleName?.trim() || 'New Cycle';
    const technicianId = form.assignedTechnicianId?.trim();
    batch.set(cycleRef, {
      ...(technicianId ? { assignedTechnicianId: technicianId } : {}),
      cycleName: targetCycleName,
      status: 'active',
      plannedStartDate: form.docStart,
      stockingStartDate: form.docStart,
      stockingEndDate: form.docStart,
      createdAt: serverTimestamp(),
      createdBy: userId,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    });
  }

  const baselineSampling = isMidcycle ? [{
    id: `baseline-${Date.now()}`,
    date: today,
    mbw: baselineMbw,
    mortality: 0,
    feed: baselineFeed ?? 0,
    isBaselineEstimate: true,
    source: 'midcycle_onboarding',
    cycleId: targetCycleId,
    cycleName: targetCycleName,
    pondCycleId: pondRef.id,
    physicalPondId: physicalPond.id,
    ...(baselinePopulation !== undefined ? { estimatedPopulation: baselinePopulation } : {}),
    ...(baselineSurvivalRate !== undefined ? { estimatedSurvivalRate: baselineSurvivalRate } : {}),
    ...(baselineFeed !== undefined ? { cumulativeFeedToDate: baselineFeed } : {}),
  }] : [];

  batch.set(pondRef, removeUndefinedFields({
    pondName: physicalPond.pondName,
    physicalPondId: physicalPond.id,
    blockId: pond.blockId || undefined,
    blockName: pond.blockName || undefined,
    pondArea,
    density,
    initialPopulation: pondArea * density,
    docStart: form.docStart,
    supplier,
    plSupplier: supplier,
    initialWeight,
    samplings: baselineSampling,
    totalHarvestedBiomass: 0,
    totalHarvestedPopulation: 0,
    totalHarvestedFeed: 0,
    cycleId: targetCycleId,
    cycleName: targetCycleName,
    pondCycleId: pondRef.id,
    cycleStatus: 'active',
    cycleStartedAt: form.docStart,
    cycleStartMode: form.cycleStartMode,
    previousCyclePondId: pond.id,
    ...(isMidcycle ? {
      baselineDate: today,
      baselineDoc,
      baselineMbw,
      baselineEstimatedPopulation: baselinePopulation,
      baselineSurvivalRate,
      baselineCumulativeFeed: baselineFeed,
      baselineSource: 'user_midcycle_estimate',
    } : {}),
    createdAt: serverTimestamp(),
    createdBy: userId,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  }) as Record<string, unknown>);

  {
    batch.update(doc(db, 'companies', companyId, 'physicalPonds', physicalPond.id), {
      status: 'active',
      activePondId: pondRef.id,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    });
  }

  if (!isCreatingNewCycle && activeCycle) {
    const stockingStartDate = [currentCycle?.stockingStartDate, form.docStart]
      .filter((date): date is string => Boolean(date))
      .sort()[0];
    const stockingEndDate = [currentCycle?.stockingEndDate, form.docStart]
      .filter((date): date is string => Boolean(date))
      .sort()
      .at(-1);
    batch.update(doc(db, 'companies', companyId, 'cycles', activeCycle.id), {
      status: 'stocking',
      stockingStartDate,
      stockingEndDate,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    });
  }

  return { pondId: pondRef.id, cycleId: targetCycleId };
  });
}
