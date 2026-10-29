import type { Firestore } from 'firebase/firestore';
import { applyHarvestImpactToPond, reverseHarvestImpactOnPond, getHarvestDateSampling,
  getNextPartialHarvestNumber, withHarvestReference, getInvalidHarvestDraftLine } from './harvestCalculations';
import { buildHarvestRevenue, financeSourceEntry, financeSyncDocumentId } from './financeSync';
import { removeUndefinedFields } from './firestoreData';
import { getFarmDateKey } from './farmDate';
import { backfillCommittedHarvestReceipts } from './offlineWorkspace';
import { groupHarvestEntriesByDate, expandHarvestOperationChange, isHarvestPayloadMatch,
  type HarvestOperation } from './harvestOperation';

export class HarvestOperationError extends Error {}

/** One transaction owns every dated record, pond impact, and matching revenue. */
export async function commitHarvestOperation(
  db: Firestore,
  operation: HarvestOperation<any>,
  context: { companyId: string; user: { uid: string; name?: string; email?: string }; timeZone?: string },
  sdk: { doc: (...args: any[]) => any; serverTimestamp: () => any; runTransaction: (db: any, work: (transaction: any) => Promise<any>) => Promise<any> },
): Promise<{ alreadySaved: boolean; ponds: Record<string, Record<string, any>> }> {
  const { companyId, user, timeZone } = context;
  const { doc, serverTimestamp, runTransaction: transact } = sdk;
  const { records, previousRecord } = operation;
  const fail = (message: string): never => { throw new HarvestOperationError(message); };
  if (!records.length || new Set(records.map(record => record.id)).size !== records.length
    || records.some(record => !record.ponds?.length || record.id === previousRecord?.id)) {
    fail('Invalid harvest operation. Reopen the harvest form and retry.');
  }
  const entries = records.flatMap(record => record.ponds.map((pond: any) => ({ ...pond, cycleId: pond.cycleId || record.cycleId, date: record.date })));
  try { groupHarvestEntriesByDate(entries, getFarmDateKey(new Date(), timeZone)); }
  catch { fail('Choose valid harvest dates and include each pond only once.'); }
  if (entries.some(entry => !String(entry.biomass ?? '').trim() || !String(entry.size ?? '').trim()
    || !String(entry.price ?? '').trim() || getInvalidHarvestDraftLine(entry))) {
    fail('Enter a positive biomass, size, and price for every harvest grade.');
  }
  const pondIds = [...new Set([...entries.map(entry => entry.pondId),
    ...(previousRecord?.ponds.map((pond: any) => pond.pondId) || [])])] as string[];
  if (pondIds.length + records.length * 2 + (previousRecord ? 2 : 0) > 450) {
    fail('Too many ponds in one harvest. Save a smaller batch.');
  }
  const refs = records.map(record => doc(db, 'companies', companyId, 'harvestRecords', record.id));
  const sourceRef = previousRecord ? doc(db, 'companies', companyId, 'harvestRecords', previousRecord.id) : null;
  const pondRefs = pondIds.map(id => doc(db, 'companies', companyId, 'ponds', id));
  return transact(db, async transaction => {
    const targets = await Promise.all(refs.map(ref => transaction.get(ref)));
    const source = sourceRef ? await transaction.get(sourceRef) : null;
    const snapshots = await Promise.all(pondRefs.map(ref => transaction.get(ref)));
    if (snapshots.some(snapshot => !snapshot.exists())) fail('A selected pond is no longer available. Refresh the pond list before saving.');
    const cycleSnapshots = await Promise.all([...new Set(records.map(record => record.cycleId).filter(Boolean))].map(id => transaction.get(doc(db, 'companies', companyId, 'cycles', id))));
    if (!previousRecord && cycleSnapshots.some(snapshot => snapshot.exists() && ['closed', 'closing'].includes(snapshot.data()?.status))) fail('This production cycle is closed.');
    let ponds: any[] = snapshots.map(snapshot => ({ ...snapshot.data(), id: snapshot.id }));
    if (targets.some(snapshot => snapshot.exists())) {
      if (!targets.every((snapshot, index) => snapshot.exists()
        && snapshot.data()!.operationReceiptId === `${operation.id}:${records[index].id}`
        && isHarvestPayloadMatch(snapshot.data()!.operationPayload, records[index])
        && (!previousRecord || snapshot.data()!.correctedFromHarvestId === previousRecord.id))
        || (previousRecord && !source?.data()?.voided)) {
        fail('This harvest conflicts with an earlier save. Refresh the harvest list before retrying.');
      }
      return { alreadySaved: true, ponds: Object.fromEntries(ponds.map(pond => [pond.id, pond])) };
    }
    if (previousRecord && (!source?.exists() || source.data()?.voided
      || !isHarvestPayloadMatch(source.data(), previousRecord))) {
      fail('The original harvest has changed or was voided. Refresh the harvest list before editing.');
    }
    const original: any = source?.exists() ? { ...source.data(), id: source.id } : null;
    const cycles = new Set(entries.map(entry => entry.cycleId).filter(Boolean));
    if (cycles.size > 1) fail('All ponds in a harvest must belong to the same cycle.');
    for (const entry of entries) {
      const pond = ponds.find(pond => pond.id === entry.pondId)!;
      if ((entry.cycleId && pond.cycleId !== entry.cycleId)
        || (entry.pondCycleId && (pond.pondCycleId || pond.id) !== entry.pondCycleId)
        || (!original && pond.cycleStatus === 'ended')) {
        fail('A pond has moved to another cycle. Refresh the pond list before saving.');
      }
      if (!getHarvestDateSampling(pond, entry.date)) fail(`${pond.pondName} requires a positive-MBW sampling on ${entry.date}.`);
    }
    if (original) ponds = ponds.map(pond => {
      const line = original.ponds.find((line: any) => line.pondId === pond.id);
      return line ? reverseHarvestImpactOnPond(pond, line, original.date) : pond;
    });
    const canonical = records.map(record => ({ ...record, ponds: record.ponds.map((line: any) => {
      const index = ponds.findIndex(pond => pond.id === line.pondId);
      const pond = ponds[index];
      const old = original?.ponds.find((item: any) => item.pondId === line.pondId);
      const partialHarvestNumber = line.harvestType === 'partial'
        ? line.partialHarvestNumber || (old?.harvestType === 'partial' ? old.partialHarvestNumber : undefined)
          || getNextPartialHarvestNumber(pond) : undefined;
      const next = withHarvestReference(pond, { ...line, partialHarvestNumber }, record.date, timeZone);
      ponds[index] = applyHarvestImpactToPond(pond, next, record.date, partialHarvestNumber, timeZone);
      return next;
    }) }));
    const change = { id: operation.id, type: 'harvest' as const, action: original ? 'update' as const : 'create' as const,
      data: { ...operation, records: canonical, previousRecord: original || undefined }, timestamp: 0 };
    for (const child of expandHarvestOperationChange(change)) {
      ponds = backfillCommittedHarvestReceipts(ponds, child, child.data, (child as any).previousData);
    }
    const revenues = canonical.map(record => buildHarvestRevenue(record));
    if (revenues.some(revenue => !Number.isFinite(revenue.amount))) fail('Harvest totals are invalid. Check biomass, size, and price before saving.');
    // No transaction reads below this point.
    const ownedFields = ['finalHarvestDates', 'totalHarvestedBiomass', 'totalHarvestedPopulation', 'partialHarvestCount',
      'postHarvestBaselineDate', 'postHarvestRemainingBiomass', 'postHarvestRemainingPopulation',
      'postHarvestReferenceSamplingId', 'postHarvestReferenceSamplingDate', 'postHarvestReferenceMbw',
      'appliedHarvestOperationId', 'appliedHarvestOperationIds', 'reversedHarvestOperationIds', 'appliedHarvestIds', 'lastAppliedHarvestId'];
    snapshots.forEach((snapshot, index) => transaction.update(snapshot.ref, removeUndefinedFields({
      ...Object.fromEntries(ownedFields.map(field => [field, ponds[index][field] ?? (field.endsWith('Ids') || field === 'finalHarvestDates' ? [] : null)])),
      updatedAt: serverTimestamp(), updatedBy: user.uid,
    })));
    canonical.forEach((record, index) => {
      const revenue = revenues[index];
      transaction.set(refs[index], removeUndefinedFields({ ...record,
        operationReceiptId: `${operation.id}:${record.id}`, operationPayload: records[index],
        financeEntry: { ...financeSourceEntry(revenue), id: financeSyncDocumentId(revenue.reference) },
        ...(original ? { correctedFromHarvestId: original.id } : {}), createdAt: serverTimestamp(), createdBy: user.uid,
      }));
      transaction.set(doc(db, 'companies', companyId, 'revenues', financeSyncDocumentId(revenue.reference)), removeUndefinedFields({
        ...revenue, companyId, addedBy: user.uid, addedByName: user.name || user.email || 'Unknown',
        timestamp: Date.now(), createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      }), { merge: true });
    });
    if (original && sourceRef) {
      const revenue = buildHarvestRevenue(original);
      const revenueId = financeSyncDocumentId(revenue.reference);
      transaction.update(sourceRef, removeUndefinedFields({ voided: true,
        voidedAt: serverTimestamp(), voidedBy: user.uid,
        financeEntry: { ...financeSourceEntry(revenue), id: revenueId, voided: true },
      }));
      transaction.set(doc(db, 'companies', companyId, 'revenues', revenueId), removeUndefinedFields({
        ...revenue, companyId, voided: true, voidedAt: serverTimestamp(), voidedBy: user.uid,
      }), { merge: true });
    }
    return { alreadySaved: false, ponds: Object.fromEntries(ponds.map(pond => [pond.id, pond])) };
  });
}
