export interface PondAssignmentRecord {
  id: string;
  cycleId?: string | null;
  blockId?: string | null;
  physicalPondId?: string | null;
  previousCyclePondId?: string | null;
  activePondId?: string | null;
}
export interface TechnicianAssignment { id: string; assignedTechnicianId?: string | null }
export interface PondAssignmentScope {
  businessSize?: string | null;
  role?: string | null;
  userId?: string | null;
  companyOwnerId?: string | null;
  blocks: TechnicianAssignment[];
  cycles: TechnicianAssignment[];
}
export const getPondTechnicianId = (
  pond: PondAssignmentRecord | null | undefined,
  scope: Pick<PondAssignmentScope, 'businessSize' | 'blocks' | 'cycles'>,
): string | null => {
  if (!pond) return null;
  return (scope.businessSize === 'enterprise'
    ? scope.blocks.find((block) => block.id === pond.blockId)
    : scope.cycles.find((cycle) => cycle.id === pond.cycleId))?.assignedTechnicianId || null;
};
export const filterPondRecordsForUser = <T extends PondAssignmentRecord>(
  records: T[], scope: PondAssignmentScope,
  physicalPonds?: { ponds: PondAssignmentRecord[] },
): T[] => {
  if (scope.role !== 'technician' || (scope.userId && scope.companyOwnerId === scope.userId)) return records;
  if (!scope.userId) return [];
  if (scope.businessSize === 'enterprise' || !physicalPonds)
    return records.filter((record) => getPondTechnicianId(record, scope) === scope.userId);
  const assignedPonds = physicalPonds.ponds.filter((pond) => getPondTechnicianId(pond, scope) === scope.userId);
  const pondIds = new Set(assignedPonds.map((pond) => pond.id));
  const physicalIds = new Set(assignedPonds.map((pond) => pond.physicalPondId || pond.previousCyclePondId || pond.id));
  return records.filter((record) => record.activePondId
    ? pondIds.has(record.activePondId)
    : physicalIds.has(record.id));
};
