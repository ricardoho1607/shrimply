import { isHarvestOperation } from '../../../shared/harvestOperation';
import { commitHarvestOperation } from '../../../shared/commitHarvestOperation';
import { db } from '@/config/firebase';
import {
  collection,
  doc,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { buildHarvestRevenue, financeSourceEntry, financeSyncDocumentId } from '../../../shared/financeSync';
import {
  applyHarvestImpactToPond,
  getHarvestDateSampling,
  getNextPartialHarvestNumber,
  reverseHarvestImpactOnPond,
  withHarvestReference,
} from '../../../shared/harvestCalculations';
import {
  backfillCommittedHarvestReceipts
} from '../../../shared/offlineWorkspace';
import { HarvestRecord, Pond } from '../../store/pondStore';
import { isHarvestPayloadMatch, removeUndefinedFields } from './syncPayload';
import type { CommitContext, PendingChange } from './syncTypes';
export async function commitHarvestChange({ activeCompanyId, user, company }: CommitContext, change: PendingChange): Promise<Record<string, Record<string, any>>> {
  if (isHarvestOperation(change.data)) {
    const result = await commitHarvestOperation(db, change.data, { companyId: activeCompanyId, user, timeZone: company?.timeZone }, { doc, runTransaction, serverTimestamp });
    return result.ponds;
  }
  const changeLegacyPonds: Record<string, Record<string, any>> = {};
  const harvestRef = change.data.id
    ? doc(db, 'companies', activeCompanyId, 'harvestRecords', change.data.id)
    : doc(collection(db, 'companies', activeCompanyId, 'harvestRecords'));
  const previousHarvestRef = change.action === 'update' && change.previousData?.id
    ? doc(db, 'companies', activeCompanyId, 'harvestRecords', change.previousData.id)
    : harvestRef;

  await runTransaction(db, async (transaction) => {
    const [harvestSnapshot, previousHarvestSnapshot] = await Promise.all([
      transaction.get(harvestRef),
      previousHarvestRef.path === harvestRef.path
        ? transaction.get(harvestRef)
        : transaction.get(previousHarvestRef),
    ]);

    const backfillLegacyPondReceipts = async (committedRecord: any, previousRecord?: any) => {
      const pondIds = Array.from(new Set([
        ...(committedRecord?.ponds || []).map((line: any) => line.pondId),
        ...(previousRecord?.ponds || []).map((line: any) => line.pondId),
      ]));
      const snapshots = await Promise.all(pondIds.map((pondId) => transaction.get(
        doc(db, 'companies', activeCompanyId, 'ponds', pondId),
      )));
      snapshots.forEach((snapshot) => {
        if (!snapshot.exists()) return;
        changeLegacyPonds[snapshot.id] = snapshot.data() || {};
        const [receiptPond] = backfillCommittedHarvestReceipts<Record<string, any>>(
          [{ id: snapshot.id, ...snapshot.data() }], change, committedRecord, previousRecord,
        );
        transaction.update(snapshot.ref, removeUndefinedFields({
          appliedHarvestOperationId: receiptPond.appliedHarvestOperationId,
          appliedHarvestOperationIds: receiptPond.appliedHarvestOperationIds,
          reversedHarvestOperationIds: receiptPond.reversedHarvestOperationIds,
          appliedHarvestIds: receiptPond.appliedHarvestIds,
          lastAppliedHarvestId: receiptPond.lastAppliedHarvestId,
        }));
      });
    };

    if (change.action === 'create' && harvestSnapshot.exists()) {
      const existingData = harvestSnapshot.data() || {};
      if ((!existingData.operationReceiptId || existingData.operationReceiptId === change.id)
        && isHarvestPayloadMatch(existingData.operationPayload || existingData, change.data)) {
        await backfillLegacyPondReceipts({ id: harvestSnapshot.id, ...existingData });
        if (!existingData.operationReceiptId) transaction.update(harvestRef, {
          operationReceiptId: change.id,
        });
        return;
      }
      throw new Error(`Cannot create harvest: target record ${harvestRef.id} already exists with differing data`);
    }
    if (change.action === 'delete' && (!harvestSnapshot.exists() || harvestSnapshot.data()?.voided)) {
      if (harvestSnapshot.exists() && harvestSnapshot.data()?.voidedByOperationId
        && harvestSnapshot.data()?.voidedByOperationId !== change.id) {
        throw new Error(`Cannot delete harvest ${harvestRef.id}: record was voided by another operation`);
      }
      if (harvestSnapshot.exists() && !harvestSnapshot.data()?.voidedByOperationId
        && !isHarvestPayloadMatch(harvestSnapshot.data()?.operationPayload || harvestSnapshot.data(), change.data)) {
        throw new Error(`Cannot delete harvest ${harvestRef.id}: voided record payload does not match queued operation`);
      }
      await backfillLegacyPondReceipts(
        harvestSnapshot.exists()
          ? { id: harvestSnapshot.id, ...harvestSnapshot.data() }
          : change.data,
      );
      if (harvestSnapshot.exists() && !harvestSnapshot.data()?.voidedByOperationId) {
        transaction.update(harvestRef, { voidedByOperationId: change.id });
      }
      return;
    }
    if (change.action === 'update') {
      if (harvestRef.path === previousHarvestRef.path) {
        throw new Error(`Cannot update harvest ${previousHarvestRef.id}: queued replacement uses the original document ID`);
      }
      if (harvestSnapshot.exists()) {
        const currentReplacement = harvestSnapshot.data() || {};
        if ((!currentReplacement.operationReceiptId || currentReplacement.operationReceiptId === change.id)
          && currentReplacement.correctedFromHarvestId === previousHarvestSnapshot.id
          && isHarvestPayloadMatch(currentReplacement.operationPayload || currentReplacement, change.data)) {
          await backfillLegacyPondReceipts(
            { id: harvestSnapshot.id, ...currentReplacement },
            previousHarvestSnapshot.exists() ? { id: previousHarvestSnapshot.id, ...previousHarvestSnapshot.data() } : change.previousData,
          );
          if (!currentReplacement.operationReceiptId) {
            transaction.update(harvestRef, {
              operationReceiptId: change.id,
            });
          }
          if (previousHarvestSnapshot.exists() && previousHarvestSnapshot.data()?.voided
            && !previousHarvestSnapshot.data()?.voidedByOperationId) {
            transaction.update(previousHarvestRef, { voidedByOperationId: change.id });
          }
          return;
        }
      }
      if (!previousHarvestSnapshot.exists() || previousHarvestSnapshot.data()?.voided) {
        throw new Error(`Cannot update harvest ${previousHarvestRef.id}: record not found or already voided`);
      }
      if (change.previousData && !isHarvestPayloadMatch(previousHarvestSnapshot.data(), change.previousData)) {
        throw new Error(`Cannot update harvest ${previousHarvestRef.id}: record was concurrently modified`);
      }
      if (harvestRef.path !== previousHarvestRef.path && harvestSnapshot.exists()) {
        throw new Error(`Cannot update harvest: target record ${harvestRef.id} already exists`);
      }
    }

    const previousRecord = change.action === 'create'
      ? undefined
      : ({ id: previousHarvestSnapshot.id, ...previousHarvestSnapshot.data() } as HarvestRecord);
    const sourceRecord = change.action === 'delete'
      ? previousRecord!
      : (change.data as HarvestRecord);
    const uniquePondIds = Array.from(new Set([
      ...(previousRecord?.ponds.map((pond) => pond.pondId) || []),
      ...sourceRecord.ponds.map((pond) => pond.pondId),
    ]));
    const pondRefs = uniquePondIds.map((pondId) => doc(db, 'companies', activeCompanyId, 'ponds', pondId));
    const pondSnapshots = await Promise.all(pondRefs.map((pondRef) => transaction.get(pondRef)));
    const pondSnapshotsById = new Map(pondSnapshots.map((snapshot) => [snapshot.id, snapshot]));

    if (change.action === 'create' || change.action === 'update') {
      const updatedPondsById = new Map<string, Pond>();
      pondSnapshots.forEach((pondSnapshot) => {
        if (!pondSnapshot.exists()) throw new Error(`Pond ${pondSnapshot.id} was not found`);
        updatedPondsById.set(pondSnapshot.id, { id: pondSnapshot.id, ...pondSnapshot.data() } as Pond);
      });
      previousRecord?.ponds.forEach((previousHarvestPond) => {
        const pondData = updatedPondsById.get(previousHarvestPond.pondId);
        if (pondData) updatedPondsById.set(
          previousHarvestPond.pondId,
          reverseHarvestImpactOnPond(pondData, previousHarvestPond, previousRecord!.date),
        );
      });

      const canonicalPonds = sourceRecord.ponds.map((harvestPond) => {
        const pondSnapshot = pondSnapshotsById.get(harvestPond.pondId);
        if (!pondSnapshot?.exists()) throw new Error(`Pond ${harvestPond.pondId} was not found`);
        const pondData = updatedPondsById.get(harvestPond.pondId)!;
        const previousHarvestPond = previousRecord?.ponds.find((pond) => pond.pondId === harvestPond.pondId);
        if (!getHarvestDateSampling(pondData, sourceRecord.date)) {
          throw new Error(`Pond ${harvestPond.pondId} requires a positive-MBW sampling on ${sourceRecord.date}`);
        }
        const partialHarvestNumber = harvestPond.harvestType === 'partial'
          ? harvestPond.partialHarvestNumber
          || (previousHarvestPond?.harvestType === 'partial' ? previousHarvestPond.partialHarvestNumber : undefined)
          || getNextPartialHarvestNumber(pondData)
          : undefined;
        const canonicalHarvestPond = withHarvestReference(pondData, { ...harvestPond, partialHarvestNumber }, sourceRecord.date, company?.timeZone);
        const updatedPond = applyHarvestImpactToPond(
          pondData,
          canonicalHarvestPond,
          sourceRecord.date,
          partialHarvestNumber,
          company?.timeZone,
        );
        updatedPondsById.set(harvestPond.pondId, updatedPond);
        return canonicalHarvestPond;
      });

      pondSnapshots.forEach((pondSnapshot) => {
        const updatedPond = updatedPondsById.get(pondSnapshot.id)!;
        const pondSnapshotData = pondSnapshot.data() || {};
        const currentAppliedIds = Array.isArray(pondSnapshotData.appliedHarvestIds)
          ? pondSnapshotData.appliedHarvestIds
          : [];
        const currentAppliedOps = Array.isArray(pondSnapshotData.appliedHarvestOperationIds)
          ? pondSnapshotData.appliedHarvestOperationIds
          : [];
        const currentReversedOps = Array.isArray(pondSnapshotData.reversedHarvestOperationIds)
          ? pondSnapshotData.reversedHarvestOperationIds
          : [];
        const changedByNextHarvest = sourceRecord.ponds.some((item) => item.pondId === pondSnapshot.id);
        const nextAppliedIds = [
          ...currentAppliedIds.filter((id: string) => id !== previousRecord?.id && id !== harvestRef.id),
          ...(changedByNextHarvest ? [harvestRef.id] : []),
        ];
        const nextAppliedOps = currentAppliedOps.includes(change.id) ? currentAppliedOps : [...currentAppliedOps, change.id];
        const nextReversedOps = !changedByNextHarvest && previousRecord
          ? (currentReversedOps.includes(change.id) ? currentReversedOps : [...currentReversedOps, change.id])
          : currentReversedOps;
        const authoritativeHarvestFields = removeUndefinedFields({
          finalHarvestDates: updatedPond.finalHarvestDates || [],
          totalHarvestedBiomass: updatedPond.totalHarvestedBiomass,
          totalHarvestedPopulation: updatedPond.totalHarvestedPopulation,
          partialHarvestCount: updatedPond.partialHarvestCount,
          postHarvestBaselineDate: updatedPond.postHarvestBaselineDate,
          postHarvestRemainingBiomass: updatedPond.postHarvestRemainingBiomass,
          postHarvestRemainingPopulation: updatedPond.postHarvestRemainingPopulation,
          postHarvestReferenceSamplingId: updatedPond.postHarvestReferenceSamplingId,
          postHarvestReferenceSamplingDate: updatedPond.postHarvestReferenceSamplingDate,
          postHarvestReferenceMbw: updatedPond.postHarvestReferenceMbw,
          appliedHarvestOperationId: change.id,
          appliedHarvestOperationIds: nextAppliedOps,
          reversedHarvestOperationIds: nextReversedOps,
          lastAppliedHarvestId: changedByNextHarvest
            ? harvestRef.id
            : (pondSnapshotData.lastAppliedHarvestId === previousRecord?.id
              ? (nextAppliedIds[nextAppliedIds.length - 1] ?? null)
              : pondSnapshotData.lastAppliedHarvestId ?? null),
          appliedHarvestIds: nextAppliedIds,
        });
        changeLegacyPonds[pondSnapshot.id] = authoritativeHarvestFields;
        transaction.update(pondSnapshot.ref, {
          ...authoritativeHarvestFields,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        });
      });

      const revenue = buildHarvestRevenue({ ...sourceRecord, id: harvestRef.id, ponds: canonicalPonds });
      const revenueId = financeSyncDocumentId(revenue.reference);
      transaction.set(harvestRef, {
        financeEntry: { ...financeSourceEntry(revenue), id: revenueId },
        ...removeUndefinedFields(sourceRecord),
        id: harvestRef.id,
        operationReceiptId: change.id,
        ponds: canonicalPonds.map(removeUndefinedFields),
        ...(previousRecord ? { correctedFromHarvestId: previousRecord.id } : {}),
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });
      transaction.set(doc(db, 'companies', activeCompanyId, 'revenues', revenueId), {
        ...removeUndefinedFields(revenue), companyId: activeCompanyId, addedBy: user.uid, addedByName: user.name || user.email || 'Harvest', timestamp: Date.now(), createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      }, { merge: true });

      if (previousRecord) {
        const previousRevenue = buildHarvestRevenue(previousRecord);
        const previousRevenueId = financeSyncDocumentId(previousRevenue.reference);
        transaction.update(previousHarvestRef, {
          voided: true,
          voidedAt: serverTimestamp(),
          voidedBy: user.uid,
          voidedByOperationId: change.id,
          financeEntry: { ...financeSourceEntry(previousRevenue), id: previousRevenueId, voided: true },
        });
        transaction.set(doc(db, 'companies', activeCompanyId, 'revenues', previousRevenueId), {
          ...removeUndefinedFields(previousRevenue), companyId: activeCompanyId, addedBy: user.uid, timestamp: Date.now(), voided: true, voidedAt: serverTimestamp(), voidedBy: user.uid,
        }, { merge: true });
      }
      return;
    }

    previousRecord!.ponds.forEach((harvestPond) => {
      const pondSnapshot = pondSnapshotsById.get(harvestPond.pondId);
      if (!pondSnapshot?.exists()) return;
      const pondData = { id: pondSnapshot.id, ...pondSnapshot.data() } as Pond;
      const updatedPond = reverseHarvestImpactOnPond(pondData, harvestPond, previousRecord!.date);
      const currentAppliedIds = Array.isArray(pondSnapshot.data()?.appliedHarvestIds)
        ? pondSnapshot.data().appliedHarvestIds
        : [];
      const nextAppliedIds = currentAppliedIds.filter((id: string) => id !== previousRecord?.id);
      const currentReversedOps = Array.isArray(pondSnapshot.data()?.reversedHarvestOperationIds)
        ? pondSnapshot.data().reversedHarvestOperationIds
        : [];
      const nextReversedOps = currentReversedOps.includes(change.id) ? currentReversedOps : [...currentReversedOps, change.id];
      const authoritativeHarvestFields = removeUndefinedFields({
        finalHarvestDates: updatedPond.finalHarvestDates || [],
        totalHarvestedBiomass: updatedPond.totalHarvestedBiomass,
        totalHarvestedPopulation: updatedPond.totalHarvestedPopulation,
        partialHarvestCount: updatedPond.partialHarvestCount,
        postHarvestBaselineDate: updatedPond.postHarvestBaselineDate,
        postHarvestRemainingBiomass: updatedPond.postHarvestRemainingBiomass,
        postHarvestRemainingPopulation: updatedPond.postHarvestRemainingPopulation,
        postHarvestReferenceSamplingId: updatedPond.postHarvestReferenceSamplingId,
        postHarvestReferenceSamplingDate: updatedPond.postHarvestReferenceSamplingDate,
        postHarvestReferenceMbw: updatedPond.postHarvestReferenceMbw,
        appliedHarvestOperationId: change.id,
        appliedHarvestOperationIds: pondSnapshot.data()?.appliedHarvestOperationIds || [],
        reversedHarvestOperationIds: nextReversedOps,
        lastAppliedHarvestId: pondSnapshot.data()?.lastAppliedHarvestId === previousRecord!.id
          ? (nextAppliedIds[nextAppliedIds.length - 1] ?? null)
          : pondSnapshot.data()?.lastAppliedHarvestId ?? null,
        appliedHarvestIds: nextAppliedIds,
      });
      changeLegacyPonds[pondSnapshot.id] = authoritativeHarvestFields;
      transaction.update(pondSnapshot.ref, {
        ...authoritativeHarvestFields,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
    });
    const revenue = buildHarvestRevenue(previousRecord!);
    const revenueId = financeSyncDocumentId(revenue.reference);
    transaction.update(harvestRef, { voided: true, voidedAt: serverTimestamp(), voidedBy: user.uid, voidedByOperationId: change.id, financeEntry: { ...financeSourceEntry(revenue), id: revenueId, voided: true } });
    transaction.set(doc(db, 'companies', activeCompanyId, 'revenues', revenueId), { ...removeUndefinedFields(revenue), companyId: activeCompanyId, addedBy: user.uid, timestamp: Date.now(), voided: true, voidedAt: serverTimestamp(), voidedBy: user.uid }, { merge: true });
  });

  return changeLegacyPonds;
}
