import { resolvePhysicalPond, type PhysicalPondIdentity } from './physicalPondIdentity';

type Cycle = PhysicalPondIdentity & { pondArea: number; cycleStatus?: string; docStart: string };
type Physical = PhysicalPondIdentity & { pondArea: number; activePondId?: string | null };

/** Physical inventory includes idle ponds; biological totals use active cycles only. */
export function getPondSummaryScope<T extends Cycle>(ponds: T[], physicalPonds: Physical[]) {
  const inventory = new Map(physicalPonds.map(pond => [pond.id, pond.pondArea]));
  const active = new Map<string, T>();
  const identity = (pond: PhysicalPondIdentity) => JSON.stringify([pond.blockId || null, pond.pondName.trim().toLowerCase()]);
  // Process newest legacy records first so historical areas cannot replace current areas.
  for (const pond of [...ponds].sort((a, b) => (b.docStart || '').localeCompare(a.docStart || ''))) {
    const physical = resolvePhysicalPond(pond, physicalPonds);
    if (!physical && physicalPonds.some(record => identity(record) === identity(pond))) {
      throw new Error(`Pond ${pond.pondName} has an ambiguous physical pond link. Repair the link before exporting.`);
    }
    const key = physical?.id ?? `legacy:${identity(pond)}`;
    if (!inventory.has(key)) inventory.set(key, pond.pondArea);
    if (pond.cycleStatus === 'ended') continue;
    if (active.has(key) || (physical?.activePondId && physical.activePondId !== pond.id)) {
      throw new Error(`Pond ${pond.pondName} has conflicting active cycles. Resolve them before exporting.`);
    }
    active.set(key, pond);
  }
  const areas = [...inventory.values()];
  if (areas.some(area => !Number.isFinite(area) || area <= 0)) {
    throw new Error('A pond area is missing or invalid. Update it before exporting.');
  }
  return { activePonds: [...active.values()], totalPonds: inventory.size, totalArea: areas.reduce((sum, area) => sum + area, 0) };
}
