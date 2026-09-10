import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { resolvePhysicalPond, PHYSICAL_POND_LINK_ERROR, type PhysicalPondIdentity } from '../../../shared/physicalPondIdentity';

export async function resolveCompanyPhysicalPond(companyId: string, source: PhysicalPondIdentity) {
  for (const id of [source.physicalPondId, source.previousCyclePondId, source.id]) {
    if (!id || id.includes('/')) continue;
    const snapshot = await getDoc(doc(db, 'companies', companyId, 'physicalPonds', id));
    if (snapshot.exists()) {
      const pond = { ...snapshot.data(), id: snapshot.id } as PhysicalPondIdentity;
      if (resolvePhysicalPond(source, [pond])) return pond;
      throw new Error(PHYSICAL_POND_LINK_ERROR);
    }
  }
  const matches = await getDocs(query(collection(db, 'companies', companyId, 'physicalPonds'), where('pondName', '==', source.pondName)));
  const pond = resolvePhysicalPond(source, matches.docs.map(snapshot => ({ ...snapshot.data(), id: snapshot.id } as PhysicalPondIdentity)));
  if (!pond) throw new Error(PHYSICAL_POND_LINK_ERROR);
  return pond;
}
