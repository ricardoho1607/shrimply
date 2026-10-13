import firebaseApp, { db } from '@/config/firebase';
import {
  doc,
  runTransaction,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { PHYSICAL_POND_LINK_ERROR, resolvePhysicalPond } from '../../../shared/physicalPondIdentity';
import { PhysicalPond, usePondStore } from '../../store/pondStore';
import { commitHarvestChange } from './commitHarvestChange';
import { removeUndefinedFields } from './syncPayload';
import type { CommitContext, CommitResult, PendingChange } from './syncTypes';
export async function commitFarmChanges({ activeCompanyId, user, company }: CommitContext, changes: PendingChange[]): Promise<CommitResult> {
  if (!activeCompanyId || !user || changes.length === 0) return { processedIds: [], committedLegacyPonds: {} };

  try {
    const batch = writeBatch(db);
    const processedChanges: string[] = [];
    const committedLegacyPonds: Record<string, Record<string, any>> = {};
    let hasBatchWrites = false;

    for (const change of changes) {
      try {
        let didProcess = false;

        if (change.type === 'pond') {
          const pondRef = doc(db, 'companies', activeCompanyId, 'ponds', change.data.id);

          if (change.action === 'create' || change.action === 'update') {
            // Repair pre-upgrade queued creates without inventing a physical pond.
            const physical = change.action === 'create'
              ? resolvePhysicalPond(change.data, usePondStore.getState().physicalPonds)
              : undefined;
            if (change.action === 'create' && !physical) throw new Error(PHYSICAL_POND_LINK_ERROR);
            const { samplings: _samplings, mortalityRecords: _mortalityRecords,
              physicalPondId: _physicalPondId, pondName: _pondName, ...pondFields } = change.data;
            const pondData = {
              ...removeUndefinedFields(change.action === 'create' ? change.data : pondFields),
              ...(physical ? { physicalPondId: physical.id, pondName: physical.pondName } : {}),
              updatedAt: serverTimestamp(),
              updatedBy: user.uid,
              ...(change.action === 'create' && {
                createdAt: serverTimestamp(),
                createdBy: user.uid
              })
            };
            batch.set(pondRef, pondData, { merge: change.action === 'update' });
            if (physical && change.data.cycleStatus !== 'ended') {
              batch.update(doc(db, 'companies', activeCompanyId, 'physicalPonds', physical.id), {
                status: 'active', activePondId: change.data.id,
                updatedAt: serverTimestamp(), updatedBy: user.uid,
              });
            }
            hasBatchWrites = true;
            didProcess = true;
          } else if (change.action === 'delete') {
            batch.delete(pondRef);
            hasBatchWrites = true;
            didProcess = true;
          }
        }
        else if (change.type === 'physicalPond') {
          const physicalPondRef = doc(db, 'companies', activeCompanyId, 'physicalPonds', change.data.id);
          if (change.action === 'create') {
            const createPhysicalPond = httpsCallable<
              { companyId: string; pondId: string; pond: PhysicalPond },
              { id: string }
            >(getFunctions(firebaseApp), 'createCompanyPhysicalPond');
            await createPhysicalPond({
              companyId: activeCompanyId,
              pondId: change.data.id,
              pond: change.data,
            });
            didProcess = true;
          } else if (change.action === 'update') {
            const physicalPondData = {
              ...removeUndefinedFields(change.data),
              updatedAt: serverTimestamp(),
              updatedBy: user.uid,
            };
            batch.set(physicalPondRef, physicalPondData, { merge: true });
            hasBatchWrites = true;
            didProcess = true;
          } else if (change.action === 'delete') {
            batch.delete(physicalPondRef);
            hasBatchWrites = true;
            didProcess = true;
          }
        }
        else if (change.type === 'cycle') {
          const cycleRef = doc(db, 'companies', activeCompanyId, 'cycles', change.data.id);
          if (change.action === 'create' || change.action === 'update') {
            const cycleData = {
              ...removeUndefinedFields(change.data),
              updatedAt: serverTimestamp(),
              updatedBy: user.uid,
              ...(change.action === 'create' && {
                createdAt: serverTimestamp(),
                createdBy: user.uid,
              }),
            };
            batch.set(cycleRef, cycleData, { merge: change.action === 'update' });
            hasBatchWrites = true;
            didProcess = true;
          } else if (change.action === 'delete') {
            batch.delete(cycleRef);
            hasBatchWrites = true;
            didProcess = true;
          }
        }
        else if (change.type === 'harvest') {
          Object.assign(committedLegacyPonds, await commitHarvestChange({ activeCompanyId, user, company }, change));
          didProcess = true;
        }
        else if (change.type === 'sampling' && change.pondId) {
          const pondRef = doc(db, 'companies', activeCompanyId, 'ponds', change.pondId);
          await runTransaction(db, async (transaction) => {
            const pondDoc = await transaction.get(pondRef);
            if (!pondDoc.exists()) throw new Error(`Pond ${change.pondId} was not found`);
            const pondData = pondDoc.data();
            let samplings = [...(pondData.samplings || [])];

            // Feeding is committed only with its inventory transaction. Old queued
            // sampling snapshots must never overwrite a newer feed allocation.
            const { feedData: _queuedFeed, ...samplingFields } = change.data;
            if (change.action === 'create') {
              if (!samplings.some((sampling) => sampling.id === change.samplingId)) samplings.push(removeUndefinedFields(samplingFields));
            } else if (change.action === 'update' && change.samplingId) {
              const index = samplings.findIndex(s => s.id === change.samplingId);
              if (index >= 0) samplings[index] = removeUndefinedFields({ ...samplingFields, ...(samplings[index].feedData ? { feedData: samplings[index].feedData } : {}) });
              else samplings.push(removeUndefinedFields(samplingFields));
            } else if (change.action === 'delete' && change.samplingId) {
              samplings = samplings.filter(s => s.id !== change.samplingId);
            }
            transaction.update(pondRef, {
              samplings,
              updatedAt: serverTimestamp(),
              updatedBy: user.uid
            });
          });
          didProcess = true;
        }
        else if (change.type === 'mortality' && change.pondId) {
          const pondRef = doc(db, 'companies', activeCompanyId, 'ponds', change.pondId);
          await runTransaction(db, async (transaction) => {
            const pondDoc = await transaction.get(pondRef);
            if (!pondDoc.exists()) throw new Error(`Pond ${change.pondId} was not found`);
            let records = [...(pondDoc.data().mortalityRecords || [])];
            if (change.action === 'delete') {
              records = records.filter((record) => record.id !== change.recordId);
            } else {
              const index = records.findIndex((record) => record.id === change.recordId);
              if (index >= 0) records[index] = removeUndefinedFields(change.data);
              else records.push(removeUndefinedFields(change.data));
            }
            transaction.update(pondRef, {
              mortalityRecords: records,
              updatedAt: serverTimestamp(),
              updatedBy: user.uid,
            });
          });
          didProcess = true;
        }

        if (didProcess) processedChanges.push(change.id);
      } catch (error) {
        console.error(`Error processing change ${change.id}:`, error);
        throw error;
      }
    }

    if (hasBatchWrites) await batch.commit();
    return { processedIds: processedChanges, committedLegacyPonds };
  } catch (error) {
    console.error('Error syncing changes:', error);
    throw error;
  }
}
