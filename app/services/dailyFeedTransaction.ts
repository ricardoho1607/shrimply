import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { normalizeFeedAllocations, sumFeedAllocations } from '../../shared/feedInventoryUsage';
import { reconcileDailyFeedStock } from '../../shared/dailyFeedTransaction';
import type { OfflineMutation } from '../../shared/offlineWorkspace';

export async function applyDailyFeedMutation(mutation: OfflineMutation) {
  const intent = mutation.dailyFeed!;
  const pondRef = doc(db, 'companies', mutation.companyId, 'ponds', intent.pondId);
  const receiptRef = doc(pondRef, 'feedOperations', mutation.id);
  await runTransaction(db, async transaction => {
    const [pond, receipt] = await Promise.all([transaction.get(pondRef), transaction.get(receiptRef)]);
    if (receipt.exists()) return;
    if (!pond.exists() || pond.data().cycleStatus === 'ended') throw new Error('The pond cycle is unavailable');
    const data = pond.data();
    const samplings = [...(data.samplings || [])];
    const index = samplings.findIndex(row => !row.isBaselineEstimate && row.source !== 'midcycle_onboarding' && row.feedData && row.date === intent.date);
    const previous = normalizeFeedAllocations(index >= 0 ? samplings[index].feedData : undefined);
    const ids = [...new Set([...intent.previousFeedIds, ...previous.map(row => row.inventoryFeedId), ...intent.allocations.map(row => row.inventoryFeedId)])];
    const references = ids.map(id => doc(db, 'companies', mutation.companyId, 'feeds', id));
    const snapshots = await Promise.all(references.map(ref => transaction.get(ref)));
    const desired = new Map(intent.allocations.map(row => [row.inventoryFeedId, row.quantityKg]));
    snapshots.forEach((snapshot, i) => {
      if (!snapshot.exists()) throw new Error('Feed inventory is unavailable');
      const update = reconcileDailyFeedStock(snapshot.data(), desired.get(ids[i]) || 0, intent, `${mutation.id}:${ids[i]}`);
      if (update) transaction.update(references[i], { ...update, lastUpdated: serverTimestamp() });
    });
    const feedData = { totalDailyFeed: sumFeedAllocations(intent.allocations).toFixed(2), feedAllocations: intent.allocations,
      inventoryFeedId: intent.allocations.length === 1 ? intent.allocations[0].inventoryFeedId : null, feedingResponse: intent.feedingResponse ?? null };
    if (index >= 0) samplings[index] = { ...samplings[index], feedData: { ...samplings[index].feedData, ...feedData } };
    else samplings.push({ id: `feed-${intent.date}`, date: intent.date, mbw: 0, mortality: 0, feed: 0,
      cycleId: data.cycleId ?? null, cycleName: data.cycleName ?? null, pondCycleId: data.pondCycleId || intent.pondId, feedData });
    transaction.update(pondRef, { samplings, updatedAt: serverTimestamp(), updatedBy: mutation.userId });
    transaction.set(receiptRef, { userId: mutation.userId, createdAt: serverTimestamp() });
  });
}
