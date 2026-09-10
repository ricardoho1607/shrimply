export interface PhysicalPondIdentity {
  id: string;
  pondName: string;
  blockId?: string | null;
  physicalPondId?: string | null;
  previousCyclePondId?: string | null;
}

// Older cycles sometimes stored the previous cycle ID as the physical ID.
// Only resolve against actual physical records; ambiguous names require repair.
export function resolvePhysicalPond<T extends PhysicalPondIdentity>(source: PhysicalPondIdentity, physicalPonds: T[]): T | undefined {
  const sameIdentity = (pond: T) => pond.pondName.trim().toLowerCase() === source.pondName.trim().toLowerCase()
    && (pond.blockId || null) === (source.blockId || null);
  for (const id of [source.physicalPondId, source.previousCyclePondId, source.id]) {
    const match = id ? physicalPonds.find(pond => pond.id === id) : undefined;
    if (match) return sameIdentity(match) ? match : undefined;
  }
  const matches = physicalPonds.filter(sameIdentity);
  return matches.length === 1 ? matches[0] : undefined;
}

export const PHYSICAL_POND_LINK_ERROR = 'This cycle is not linked to a registered physical pond. Sync the farm and try again, or contact support to repair the pond link.';
