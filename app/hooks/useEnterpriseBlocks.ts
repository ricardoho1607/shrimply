import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
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
    const blocksQuery = query(
      collection(db, 'companies', companyId, 'blocks'),
      orderBy('createdAt', 'asc'),
    );
    const techniciansQuery = query(
      collection(db, 'users'),
      where('companyId', '==', companyId),
    );

    const unsubscribeBlocks = onSnapshot(blocksQuery, (snapshot) => {
      setBlocks(sortFarmBlocks(snapshot.docs.map((blockDoc) => ({
        id: blockDoc.id,
        ...blockDoc.data(),
      } as FarmBlock))));
      setLoading(false);
    }, (snapshotError) => {
      console.error('Error loading enterprise blocks:', snapshotError);
      setError('Unable to load farm blocks.');
      setLoading(false);
    });

    const unsubscribeTechnicians = onSnapshot(techniciansQuery, (snapshot) => {
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
      setTechnicians(team);
    }, (snapshotError) => {
      console.error('Error loading enterprise technicians:', snapshotError);
      setError('Farm blocks loaded, but technicians could not be loaded.');
    });

    return () => {
      unsubscribeBlocks();
      unsubscribeTechnicians();
    };
  }, [companyId]);

  const createBlock = useCallback(async ({ name, technician }: CreateBlockInput) => {
    const normalizedName = name.trim();
    if (!companyId || !userId || !normalizedName) {
      throw new Error('Block name and company access are required.');
    }
    if (blocks.some((block) => block.name.trim().toLowerCase() === normalizedName.toLowerCase())) {
      throw new Error('A block with this name already exists.');
    }

    await addDoc(collection(db, 'companies', companyId, 'blocks'), {
      companyId,
      name: normalizedName,
      assignedTechnicianId: technician?.uid || null,
      assignedTechnicianName: technician?.name.trim() || null,
      assignedTechnicianEmail: technician?.email || null,
      createdAt: serverTimestamp(),
      createdBy: userId,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    });
  }, [blocks, companyId, userId]);

  const assignBlockTechnician = useCallback(async ({ blockId, technician }: AssignBlockTechnicianInput) => {
    const block = blocks.find((candidate) => candidate.id === blockId);
    const approvedTechnician = technicians.find((candidate) => candidate.uid === technician.uid);
    if (!companyId || !userId || !block || block.assignedTechnicianId || !approvedTechnician) {
      throw new Error('A valid unassigned block and approved technician are required.');
    }

    await updateDoc(doc(db, 'companies', companyId, 'blocks', blockId), {
      assignedTechnicianId: approvedTechnician.uid,
      assignedTechnicianName: approvedTechnician.name.trim() || null,
      assignedTechnicianEmail: approvedTechnician.email,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    });
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
    assignBlockTechnician,
  };
};
