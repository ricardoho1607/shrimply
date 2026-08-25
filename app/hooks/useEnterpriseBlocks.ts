import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
  createOfflineOperationId,
  loadOfflineCollectionWithMutations,
  overlayOfflineMutations,
  persistOfflineCollection,
  requestOfflineMutationFlush,
  saveDurableMutation,
} from '../services/offlineWorkspace';
import {
  getEnterpriseTechnicianLabel,
  sortFarmBlocks,
  type EnterpriseTechnician,
  type FarmBlock,
} from '../../shared/enterpriseBlocks';

interface CreateBlockInput {
  name: string;
  technician?: EnterpriseTechnician | null;
}

interface UpdateBlockInput {
  blockId: string;
  name: string;
  technician?: EnterpriseTechnician | null;
}

interface AssignBlockTechnicianInput {
  blockId: string;
  technician: EnterpriseTechnician;
}

export const useEnterpriseBlocks = (companyId?: string, userId?: string) => {
  const [blocks, setBlocks] = useState<FarmBlock[]>([]);
  const [technicians, setTechnicians] = useState<EnterpriseTechnician[]>([]);
  const [loading, setLoading] = useState(Boolean(companyId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setBlocks([]);
      setTechnicians([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError(null);
    let blocksSnapshotVersion = 0;
    let techniciansSnapshotVersion = 0;
    if (userId) {
      void Promise.all([
        loadOfflineCollectionWithMutations<FarmBlock>(
          userId,
          companyId,
          'enterprise-blocks',
          ['companies', companyId, 'blocks'],
        ),
        loadOfflineCollectionWithMutations<EnterpriseTechnician & { id: string }>(
          userId,
          companyId,
          'enterprise-technicians',
          ['users'],
        ),
      ]).then(([cachedBlocks, cachedTechnicians]) => {
        if (cachedBlocks.length > 0 && blocksSnapshotVersion === 0) setBlocks(sortFarmBlocks(cachedBlocks));
        if (cachedTechnicians.length > 0 && techniciansSnapshotVersion === 0) setTechnicians(cachedTechnicians);
        setLoading(false);
      }).catch((cacheError) => {
        console.error('Unable to load cached enterprise data:', cacheError);
        setLoading(false);
      });
    }
    const blocksQuery = query(
      collection(db, 'companies', companyId, 'blocks'),
      orderBy('createdAt', 'asc'),
    );
    const techniciansQuery = query(
      collection(db, 'users'),
      where('companyId', '==', companyId),
    );

    const unsubscribeBlocks = onSnapshot(blocksQuery, { includeMetadataChanges: true }, (snapshot) => {
      const remoteBlocks = sortFarmBlocks(snapshot.docs.map((blockDoc) => ({
        id: blockDoc.id,
        ...blockDoc.data(),
      } as FarmBlock)));
      if (snapshot.metadata.fromCache && remoteBlocks.length === 0) {
        setLoading(false);
        return;
      }
      const snapshotVersion = ++blocksSnapshotVersion;
      void (async () => {
        const nextBlocks = userId
          ? await overlayOfflineMutations(remoteBlocks, userId, companyId, ['companies', companyId, 'blocks'])
          : remoteBlocks;
        if (snapshotVersion !== blocksSnapshotVersion) return;
        setBlocks(sortFarmBlocks(nextBlocks));
        if (userId) await persistOfflineCollection(userId, companyId, 'enterprise-blocks', nextBlocks);
        setLoading(false);
      })().catch((overlayError) => {
        console.error('Unable to apply pending block changes:', overlayError);
        if (snapshotVersion === blocksSnapshotVersion) setBlocks(remoteBlocks);
        setLoading(false);
      });
    }, (snapshotError) => {
      console.error('Error loading enterprise blocks:', snapshotError);
      setError('Unable to load farm blocks.');
      setLoading(false);
    });

    const unsubscribeTechnicians = onSnapshot(techniciansQuery, { includeMetadataChanges: true }, (snapshot) => {
      const team = snapshot.docs
        .map((userDoc) => ({ id: userDoc.id, ...userDoc.data() } as Record<string, unknown> & { id: string }))
        .filter((member) => member.role === 'technician')
        .map((member) => ({
          id: member.id,
          uid: member.id,
          name: typeof member.name === 'string' ? member.name.trim() : '',
          email: typeof member.email === 'string' ? member.email : '',
        }))
        .sort((first, second) => getEnterpriseTechnicianLabel(first.name, first.email, '')
          .localeCompare(getEnterpriseTechnicianLabel(second.name, second.email, '')));
      if (snapshot.metadata.fromCache && team.length === 0) return;
      techniciansSnapshotVersion += 1;
      setTechnicians(team);
      if (userId && (!snapshot.metadata.fromCache || team.length > 0)) {
        void persistOfflineCollection(userId, companyId, 'enterprise-technicians', team);
      }
    }, (snapshotError) => {
      console.error('Error loading enterprise technicians:', snapshotError);
      setError('Farm blocks loaded, but technicians could not be loaded.');
    });

    return () => {
      unsubscribeBlocks();
      unsubscribeTechnicians();
    };
  }, [companyId, userId]);

  const createBlock = useCallback(async ({ name, technician }: CreateBlockInput) => {
    const normalizedName = name.trim();
    if (!companyId || !userId || !normalizedName) {
      throw new Error('Block name and company access are required.');
    }
    if (blocks.some((block) => block.name.trim().toLowerCase() === normalizedName.toLowerCase())) {
      throw new Error('A block with this name already exists.');
    }

    const blockRef = doc(collection(db, 'companies', companyId, 'blocks'));
    const now = Timestamp.now();
    const block = {
      id: blockRef.id,
      companyId,
      name: normalizedName,
      assignedTechnicianId: technician?.uid || null,
      assignedTechnicianName: technician?.name.trim() || null,
      assignedTechnicianEmail: technician?.email || null,
      createdAt: now,
      createdBy: userId,
      updatedAt: now,
      updatedBy: userId,
    } as FarmBlock;
    await saveDurableMutation({
      id: createOfflineOperationId(`block-create-${blockRef.id}`),
      userId,
      companyId,
      createdAt: Date.now(),
      kind: 'set',
      path: ['companies', companyId, 'blocks', blockRef.id],
      data: block as unknown as Record<string, unknown>,
      merge: false,
      createOnly: true,
      serverTimestampFields: ['createdAt', 'updatedAt'],
    }, { deferFlush: true });
    const nextBlocks = sortFarmBlocks([...blocks, block]);
    setBlocks(nextBlocks);
    await persistOfflineCollection(userId, companyId, 'enterprise-blocks', nextBlocks);
    requestOfflineMutationFlush(userId, companyId);
  }, [blocks, companyId, userId]);

  const updateBlock = useCallback(async ({ blockId, name, technician }: UpdateBlockInput) => {
    const normalizedName = name.trim();
    if (!companyId || !userId || !normalizedName) {
      throw new Error('Block name and company access are required.');
    }
    const duplicate = blocks.some(
      (b) => b.id !== blockId && b.name.trim().toLowerCase() === normalizedName.toLowerCase(),
    );
    if (duplicate) {
      throw new Error('A block with this name already exists.');
    }

    const now = Timestamp.now();
    const patch = {
      name: normalizedName,
      assignedTechnicianId: technician?.uid || null,
      assignedTechnicianName: technician?.name.trim() || null,
      assignedTechnicianEmail: technician?.email || null,
      updatedAt: now,
      updatedBy: userId,
    };
    await saveDurableMutation({
      id: createOfflineOperationId(`block-update-${blockId}`),
      userId,
      companyId,
      createdAt: Date.now(),
      kind: 'set',
      path: ['companies', companyId, 'blocks', blockId],
      data: patch,
      merge: true,
      serverTimestampFields: ['updatedAt'],
    }, { deferFlush: true });
    const nextBlocks = sortFarmBlocks(blocks.map((block) => block.id === blockId ? { ...block, ...patch } : block));
    setBlocks(nextBlocks);
    await persistOfflineCollection(userId, companyId, 'enterprise-blocks', nextBlocks);
    requestOfflineMutationFlush(userId, companyId);
  }, [blocks, companyId, userId]);

  const deleteBlock = useCallback(async (blockId: string) => {
    if (!companyId || !userId || !blockId) {
      throw new Error('Company access and block ID are required.');
    }
    await saveDurableMutation({
      id: createOfflineOperationId(`block-delete-${blockId}`),
      userId,
      companyId,
      createdAt: Date.now(),
      kind: 'delete',
      path: ['companies', companyId, 'blocks', blockId],
    }, { deferFlush: true });
    const nextBlocks = blocks.filter((block) => block.id !== blockId);
    setBlocks(nextBlocks);
    await persistOfflineCollection(userId, companyId, 'enterprise-blocks', nextBlocks);
    requestOfflineMutationFlush(userId, companyId);
  }, [blocks, companyId, userId]);

  const assignBlockTechnician = useCallback(async ({ blockId, technician }: AssignBlockTechnicianInput) => {
    const block = blocks.find((candidate) => candidate.id === blockId);
    const approvedTechnician = technicians.find((candidate) => candidate.uid === technician.uid);
    if (!companyId || !userId || !block || !approvedTechnician) {
      throw new Error('A valid block and approved technician are required.');
    }

    const now = Timestamp.now();
    const patch = {
      assignedTechnicianId: approvedTechnician.uid,
      assignedTechnicianName: approvedTechnician.name.trim() || null,
      assignedTechnicianEmail: approvedTechnician.email,
      updatedAt: now,
      updatedBy: userId,
    };
    await saveDurableMutation({
      id: createOfflineOperationId(`block-assign-${blockId}`),
      userId,
      companyId,
      createdAt: Date.now(),
      kind: 'set',
      path: ['companies', companyId, 'blocks', blockId],
      data: patch,
      merge: true,
      serverTimestampFields: ['updatedAt'],
    }, { deferFlush: true });
    const nextBlocks = sortFarmBlocks(blocks.map((candidate) => candidate.id === blockId ? { ...candidate, ...patch } : candidate));
    setBlocks(nextBlocks);
    await persistOfflineCollection(userId, companyId, 'enterprise-blocks', nextBlocks);
    requestOfflineMutationFlush(userId, companyId);
  }, [blocks, companyId, technicians, userId]);

  const blocksAssignedToUser = useMemo(
    () => blocks.filter((block) => block.assignedTechnicianId === userId),
    [blocks, userId],
  );

  return {
    blocks,
    blocksAssignedToUser,
    technicians,
    loading,
    error,
    createBlock,
    updateBlock,
    deleteBlock,
    assignBlockTechnician,
  };
};
