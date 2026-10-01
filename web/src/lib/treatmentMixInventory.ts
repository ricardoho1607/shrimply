import {
  Timestamp,
  arrayUnion,
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { getFarmDateKey } from '../../../shared/farmDate';
import {
  ASSUMED_POND_DEPTH_METERS,
  calculateFifoConsumption,
  calculateTreatmentDoseLiters,
  roundInventoryCost,
  roundInventoryQuantity,
} from '../../../shared/treatmentMix';
import { db } from './firebase';

export interface TreatmentMixComponent {
  additiveId: string;
  additiveName: string;
  quantity: number;
  unit: string;
}

export interface TreatmentMixRecipe {
  yieldLiters: number;
  components: TreatmentMixComponent[];
  notes?: string;
}

export interface TreatmentMixInventoryItem {
  id: string;
  companyId: string;
  itemName: string;
  additiveName?: string;
  category: string;
  inventoryKind?: 'additive' | 'treatmentMix';
  treatmentMixRecipe?: TreatmentMixRecipe;
  unit?: string;
  stockInHistory: Array<{ quantity: number; price: number; totalCost?: number; [key: string]: unknown }>;
  usageHistory: Array<{ quantity: number; [key: string]: unknown }>;
  totalStock: number;
  totalCost: number;
  [key: string]: unknown;
}

type ProduceInput = {
  companyId: string;
  treatmentMixId: string;
  treatmentMixName?: string;
  recipe?: TreatmentMixRecipe;
  createNew: boolean;
  operationId?: string;
  timeZone?: string;
};

const produceBatch = async ({ companyId, treatmentMixId, treatmentMixName, recipe: requestedRecipe, createNew, timeZone, operationId }: ProduceInput) => {
  const mixRef = doc(db, 'companies', companyId, 'additives', treatmentMixId);
  const batchId = operationId || doc(collection(db, 'companies', companyId, 'treatmentMixBatches')).id;

  await runTransaction(db, async (tx) => {
    const mixSnapshot = await tx.get(mixRef);
    if (mixSnapshot.exists() && (mixSnapshot.data().stockInHistory || []).some((entry: { id?: string }) => entry.id === batchId)) return;
    if (createNew && mixSnapshot.exists()) throw new Error('Treatment mix already exists');
    if (!createNew && !mixSnapshot.exists()) throw new Error('Treatment mix not found');
    const existingMix = mixSnapshot.exists() ? mixSnapshot.data() as TreatmentMixInventoryItem : null;
    if (existingMix && existingMix.inventoryKind !== 'treatmentMix') throw new Error('Selected item is not a treatment mix');

    const name = (treatmentMixName || existingMix?.additiveName || '').trim();
    const recipe = requestedRecipe || existingMix?.treatmentMixRecipe;
    if (!name) throw new Error('Treatment mix name is required');
    if (!recipe || !Number.isFinite(recipe.yieldLiters) || recipe.yieldLiters <= 0) throw new Error('Final mix volume must be greater than zero');
    const components = recipe.components.filter((component) => Number.isFinite(component.quantity) && component.quantity > 0);
    if (components.length === 0) throw new Error('Select at least one additive');
    if (new Set(components.map(component => component.additiveId)).size !== components.length) throw new Error('Each additive can only be included once');

    const refs = components.map((component) => doc(db, 'companies', companyId, 'additives', component.additiveId));
    const snapshots = await Promise.all(refs.map((ref) => tx.get(ref)));
    const shortages: string[] = [];
    const deductions = snapshots.map((snapshot, index) => {
      const component = components[index];
      if (!snapshot.exists()) throw new Error(`${component.additiveName} no longer exists`);
      const additive = snapshot.data() as TreatmentMixInventoryItem;
      if (additive.inventoryKind === 'treatmentMix') throw new Error('Treatment mixes cannot be recipe ingredients');
      const unit = additive.unit || 'kg';
      if (unit !== component.unit) throw new Error(`${additive.additiveName || additive.itemName} unit changed from ${component.unit} to ${unit}`);
      if ((additive.totalStock || 0) + 0.0005 < component.quantity) {
        shortages.push(`${additive.additiveName || additive.itemName}: need ${component.quantity} ${unit}, available ${additive.totalStock || 0} ${unit}`);
      }
      return { additive, component, ref: refs[index] };
    });
    if (shortages.length) throw new Error(`Insufficient stock:\n${shortages.join('\n')}`);

    const now = Timestamp.now();
    const date = getFarmDateKey(now.toDate(), timeZone);
    let batchCost = 0;
    const batchComponents: Array<TreatmentMixComponent & { unitPrice: number; totalCost: number }> = [];
    for (const { additive, component, ref } of deductions) {
      const cost = calculateFifoConsumption(additive.stockInHistory || [], additive.usageHistory || [], component.quantity);
      batchCost += cost.totalCost;
      batchComponents.push({ ...component, additiveName: additive.additiveName || additive.itemName, unitPrice: cost.unitPrice, totalCost: cost.totalCost });
      tx.update(ref, {
        usageHistory: arrayUnion({
          id: `${batchId}-${component.additiveId}`,
          date,
          quantity: component.quantity,
          unitPrice: cost.unitPrice,
          totalCost: cost.totalCost,
          source: 'treatmentMixProduction',
          treatmentMixId,
          treatmentMixName: name,
          batchId,
          createdAt: now,
        }),
        totalStock: roundInventoryQuantity((additive.totalStock || 0) - component.quantity),
        totalCost: cost.remainingCost,
        lastUpdated: serverTimestamp(),
      });
    }

    batchCost = roundInventoryCost(batchCost);
    const stock = {
      id: batchId,
      date,
      quantity: roundInventoryQuantity(recipe.yieldLiters),
      price: roundInventoryCost(batchCost / recipe.yieldLiters),
      totalCost: batchCost,
      unit: 'L',
      source: 'treatmentMixProduction',
      treatmentMixId,
      treatmentMixName: name,
      components: batchComponents,
      ...(recipe.notes ? { notes: recipe.notes } : {}),
      createdAt: now,
    };
    const savedRecipe = {
      yieldLiters: roundInventoryQuantity(recipe.yieldLiters),
      components: deductions.map(({ additive, component }) => ({ ...component, additiveName: additive.additiveName || additive.itemName })),
      ...(recipe.notes ? { notes: recipe.notes } : {}),
    };

    if (createNew) {
      tx.set(mixRef, {
        id: treatmentMixId,
        companyId,
        additiveName: name,
        category: 'Other',
        inventoryKind: 'treatmentMix',
        treatmentMixRecipe: savedRecipe,
        unit: 'L',
        reorderLevel: 0,
        stockInHistory: [stock],
        usageHistory: [],
        totalStock: stock.quantity,
        totalCost: batchCost,
        lastUpdated: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
    } else {
      tx.update(mixRef, {
        stockInHistory: arrayUnion(stock),
        totalStock: roundInventoryQuantity((existingMix?.totalStock || 0) + stock.quantity),
        totalCost: roundInventoryCost((existingMix?.totalCost || 0) + batchCost),
        lastUpdated: serverTimestamp(),
      });
    }
  });
};

export const createTreatmentMix = async (
  companyId: string,
  input: { name: string; yieldLiters: number; components: TreatmentMixComponent[]; notes?: string; timeZone?: string; operationId?: string },
) => {
  const ref = input.operationId ? doc(db, 'companies', companyId, 'additives', input.operationId) : doc(collection(db, 'companies', companyId, 'additives'));
  await produceBatch({
    companyId,
    treatmentMixId: ref.id,
    treatmentMixName: input.name.trim(),
    recipe: {
      yieldLiters: input.yieldLiters,
      components: input.components,
      ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
    },
    createNew: true,
    timeZone: input.timeZone,
    operationId: input.operationId,
  });
  return ref.id;
};

export const makeTreatmentMixBatch = (companyId: string, treatmentMixId: string, timeZone?: string, operationId?: string) =>
  produceBatch({ companyId, treatmentMixId, createNew: false, timeZone, operationId });

export const useTreatmentMix = async (
  companyId: string,
  treatmentMixId: string,
  pond: { id: string; name: string; areaM2: number; cycleId?: string; cycleName?: string; pondCycleId?: string },
  ppm: number,
  timeZone?: string,
  notes?: string,
  operationId?: string,
) => {
  const usageId = operationId || doc(collection(db, 'companies', companyId, 'treatmentMixUsage')).id;
  const dose = calculateTreatmentDoseLiters(pond.areaM2, ppm, ASSUMED_POND_DEPTH_METERS);
  const mixRef = doc(db, 'companies', companyId, 'additives', treatmentMixId);
  await runTransaction(db, async (tx) => {
    const snapshot = await tx.get(mixRef);
    if (!snapshot.exists()) throw new Error('Treatment mix not found');
    const mix = snapshot.data() as TreatmentMixInventoryItem;
    if ((mix.usageHistory || []).some(entry => entry.id === usageId)) return;
    if (mix.inventoryKind !== 'treatmentMix') throw new Error('Selected item is not a treatment mix');
    if ((mix.totalStock || 0) + 0.0005 < dose.requiredMixLiters) {
      throw new Error(`Insufficient ${mix.additiveName}: need ${dose.requiredMixLiters} L, available ${mix.totalStock || 0} L`);
    }
    const cost = calculateFifoConsumption(mix.stockInHistory || [], mix.usageHistory || [], dose.requiredMixLiters);
    tx.update(mixRef, {
      usageHistory: arrayUnion({
        id: usageId,
        date: getFarmDateKey(new Date(), timeZone),
        quantity: dose.requiredMixLiters,
        unitPrice: cost.unitPrice,
        totalCost: cost.totalCost,
        source: 'treatmentMixApplication',
        treatmentMixId,
        treatmentMixName: mix.additiveName,
        pondId: pond.id,
        pondName: pond.name,
        pondAreaM2: pond.areaM2,
        ppm,
        assumedDepthM: ASSUMED_POND_DEPTH_METERS,
        pondVolumeLiters: dose.pondVolumeLiters,
        ...(pond.cycleId ? { cycleId: pond.cycleId } : {}),
        ...(pond.cycleName ? { cycleName: pond.cycleName } : {}),
        ...(pond.pondCycleId ? { pondCycleId: pond.pondCycleId } : {}),
        ...(notes?.trim() ? { notes: notes.trim() } : {}),
        createdAt: Timestamp.now(),
      }),
      totalStock: roundInventoryQuantity((mix.totalStock || 0) - dose.requiredMixLiters),
      totalCost: cost.remainingCost,
      lastUpdated: serverTimestamp(),
    });
  });
  return dose;
};
