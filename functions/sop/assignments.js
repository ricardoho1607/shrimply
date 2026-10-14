"use strict";
const { getPondTechnicianId } = require('../shared/orsonDomain/pondAssignments');
// Task cycleId is a pond-cycle identity; resolve the farm cycle from its source pond.
async function targetTechnician(reader, ref, company, target) {
  const get = (doc) => reader.get ? reader.get(doc) : doc.get();
  if (target.scope === 'company') return null;
  if (company.businessSize === 'enterprise' || target.scope === 'block') {
    if (!target.blockId) return null;
    return (await get(ref.collection('blocks').doc(target.blockId))).data()?.assignedTechnicianId || null;
  }
  let pondId = target.pondId;
  if (!pondId) {
    const physical = await get(ref.collection('physicalPonds').doc(target.physicalPondId || target.id));
    pondId = physical.data()?.activePondId;
  }
  if (!pondId) return null;
  const pond = await get(ref.collection('ponds').doc(pondId));
  if (!pond.data()?.cycleId) return null;
  const cycle = await get(ref.collection('cycles').doc(pond.data().cycleId));
  return getPondTechnicianId({ id: pond.id, ...pond.data() }, {
    businessSize: company.businessSize, blocks: [], cycles: cycle.exists ? [{ id: cycle.id, ...cycle.data() }] : [],
  });
}
module.exports = { targetTechnician };
