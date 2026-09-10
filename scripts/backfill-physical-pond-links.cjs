#!/usr/bin/env node
'use strict';
const { connect, eligibleCompanies } = require('./company-billing-admin.cjs');

const decode = document => ({ id: document.name.split('/').at(-1), ...Object.fromEntries(
  Object.entries(document.fields || {}).map(([key, value]) => [key,
    value.stringValue ?? (value.nullValue === null ? null : value.integerValue !== undefined ? Number(value.integerValue) : value.doubleValue)]),
) });

function planLinks(physical, cycles) {
  const updates = [];
  const conflicts = [];
  const archivedWithoutPhysical = [];
  const links = new Map();
  const sameIdentity = (a, b) => a.pondName?.trim().toLowerCase() === b.pondName?.trim().toLowerCase()
    && (a.blockId || null) === (b.blockId || null);
  for (const cycle of cycles) {
    const byId = [cycle.physicalPondId, cycle.previousCyclePondId].map(id => physical.find(pond => pond.id === id)).find(Boolean);
    const candidates = byId ? [byId] : physical.filter(pond => sameIdentity(pond, cycle));
    const matched = candidates.length === 1 && sameIdentity(candidates[0], cycle) ? candidates[0] : null;
    if (!matched) {
      if (!candidates.length && cycle.cycleStatus === 'ended') archivedWithoutPhysical.push(cycle.id);
      else conflicts.push({ pondId: cycle.id, reason: candidates.length > 1 ? 'ambiguous-physical-pond' : 'missing-or-mismatched-physical-pond' });
      continue;
    }
    if (cycle.cycleStatus !== 'ended') {
      if (links.has(matched.id)) conflicts.push({ pondId: cycle.id, reason: 'multiple-active-cycles' });
      links.set(matched.id, cycle.id);
      if (matched.activePondId !== cycle.id) conflicts.push({ pondId: cycle.id, reason: 'active-pointer-needs-review' });
    }
    if (cycle.physicalPondId !== matched.id) updates.push({ pondId: cycle.id, physicalPondId: matched.id });
  }
  return { updates, conflicts, archivedWithoutPhysical };
}

async function main() {
  const arg = key => process.argv.find(value => value.startsWith(`--${key}=`))?.slice(key.length + 3);
  const cutoff = Date.parse(arg('before'));
  if (!Number.isFinite(cutoff) || cutoff > Date.now()) throw new Error('Provide a fixed past --before timestamp.');
  const apply = process.argv.includes('--apply');
  const { root, request, list } = await connect(arg('project'));
  const companies = eligibleCompanies(await list('companies'), cutoff);
  const plans = [];
  for (const company of companies) {
    const id = company.name.split('/').at(-1);
    const [physical, cycles] = await Promise.all([list(`companies/${id}/physicalPonds`), list(`companies/${id}/ponds`)]);
    const plan = planLinks(physical.map(decode), cycles.map(decode));
    plans.push({ companyId: id, ...plan, cycleDocuments: cycles, physicalDocuments: physical });
  }
  if (apply && plans.some(plan => plan.conflicts.length)) throw new Error('Resolve the conflicts from dry-run first. No records have been written.');
  if (apply) {
    for (const plan of plans) {
      if (!plan.updates.length) continue;
      const { transaction } = await request(':beginTransaction', { method: 'POST', body: '{}' });
      try {
      const [physical, cycles] = await Promise.all([
        list(`companies/${plan.companyId}/physicalPonds`, transaction),
        list(`companies/${plan.companyId}/ponds`, transaction),
      ]);
      const fresh = planLinks(physical.map(decode), cycles.map(decode));
      if (fresh.conflicts.length || fresh.updates.length > 400) throw new Error(`Company ${plan.companyId} needs review; transaction cancelled.`);
      // Preserve observations/history. Transaction reads also protect the matched physical identities.
      await request(':commit', { method: 'POST', body: JSON.stringify({ transaction, writes: fresh.updates.map(update => ({
        update: { name: `${root}/companies/${plan.companyId}/ponds/${update.pondId}`, fields: { physicalPondId: { stringValue: update.physicalPondId } } },
        updateMask: { fieldPaths: ['physicalPondId'] },
        currentDocument: { updateTime: cycles.find(document => document.name.split('/').at(-1) === update.pondId).updateTime },
      })) }) });
      } catch (error) {
        await request(':rollback', { method: 'POST', body: JSON.stringify({ transaction }) }).catch(() => {});
        throw error;
      }
    }
  }
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', companies: plans.map(({ cycleDocuments, physicalDocuments, ...plan }) => plan) }, null, 2));
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { planLinks };
