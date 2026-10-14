import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { getCompanyTechnicians, type CompanyTechnician } from '../../shared/cycleTechnicianAssignment';

export const useCompanyTechnicians = (companyId?: string | null, userId?: string) => {
  const scope = JSON.stringify([companyId, userId]);
  const [state, setState] = useState({ scope, technicians: [] as CompanyTechnician[] });

  useEffect(() => {
    if (!companyId) return;
    let active = true;
    const unsubscribe = onSnapshot(query(collection(db, 'users'), where('companyId', '==', companyId)), (snapshot) => {
      if (!active) return;
      setState({ scope, technicians: getCompanyTechnicians(snapshot.docs.map((member) => ({ ...member.data(), id: member.id })), companyId) });
    }, (error) => {
      if (!active) return;
      console.error('Unable to load company technicians:', error);
      setState({ scope, technicians: [] });
    });
    return () => { active = false; unsubscribe(); };
  }, [companyId, scope]);

  return { technicians: companyId && state.scope === scope ? state.technicians : [] };
};
