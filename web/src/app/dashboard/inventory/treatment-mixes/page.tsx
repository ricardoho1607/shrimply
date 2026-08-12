"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Beaker, Loader2, Plus, RefreshCw, Waves, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useInventoryFeeds } from '@/hooks/useDashboardData';
import {
  createTreatmentMix,
  makeTreatmentMixBatch,
  useTreatmentMix as applyTreatmentMix,
  type TreatmentMixComponent,
  type TreatmentMixInventoryItem,
} from '@/lib/treatmentMixInventory';
import { calculateTreatmentDoseLiters } from '../../../../../../shared/treatmentMix';

type Pond = {
  id: string;
  pondName: string;
  pondArea: number;
  cycleStatus?: string;
  cycleId?: string;
  cycleName?: string;
  pondCycleId?: string;
};

const canEdit = (role?: string) => ['owner', 'co-owner', 'technician'].includes(role || '');
const positiveNumber = (value: string) => {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};
const message = (error: unknown) => error instanceof Error ? error.message : 'Operation failed';

export default function TreatmentMixesPage() {
  const { company, user } = useAuth();
  const { formatCurrency } = useCurrency();
  const { additives: inventory, ponds, loading, companyId } = useInventoryFeeds<never, TreatmentMixInventoryItem, Pond>();
  const [showCreate, setShowCreate] = useState(false);
  const [useMix, setUseMix] = useState<TreatmentMixInventoryItem | null>(null);
  const [name, setName] = useState('');
  const [yieldLiters, setYieldLiters] = useState('');
  const [notes, setNotes] = useState('');
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [pondId, setPondId] = useState('');
  const [ppm, setPpm] = useState('');
  const [saving, setSaving] = useState(false);

  const additives = useMemo(() => inventory.filter((item) => item.inventoryKind !== 'treatmentMix'), [inventory]);
  const mixes = useMemo(() => inventory.filter((item) => item.inventoryKind === 'treatmentMix'), [inventory]);
  const activePonds = useMemo(() => ponds.filter((pond) => pond.cycleStatus !== 'ended'), [ponds]);
  const selectedPond = activePonds.find((pond) => pond.id === pondId);
  const dose = useMemo(() => {
    const parsedPpm = positiveNumber(ppm);
    return selectedPond && parsedPpm ? calculateTreatmentDoseLiters(selectedPond.pondArea, parsedPpm) : null;
  }, [ppm, selectedPond]);

  const reset = () => {
    setShowCreate(false);
    setUseMix(null);
    setName('');
    setYieldLiters('');
    setNotes('');
    setQuantities({});
    setPondId('');
    setPpm('');
    setSaving(false);
  };

  const saveMix = async () => {
    if (!companyId) return;
    const finalYield = positiveNumber(yieldLiters);
    const components: TreatmentMixComponent[] = additives.flatMap((item) => {
      const quantity = positiveNumber(quantities[item.id] || '');
      return quantity ? [{ additiveId: item.id, additiveName: item.itemName, quantity, unit: item.unit || 'kg' }] : [];
    });
    if (!name.trim() || !finalYield || !components.length) return alert('Enter a name, final volume, and at least one ingredient.');
    if (inventory.some((item) => item.itemName.trim().toLowerCase() === name.trim().toLowerCase())) return alert('That inventory name already exists.');
    setSaving(true);
    try {
      await createTreatmentMix(companyId, { name, yieldLiters: finalYield, components, notes, timeZone: company?.timeZone });
      reset();
    } catch (error) {
      alert(message(error));
      setSaving(false);
    }
  };

  const makeBatch = async (mix: TreatmentMixInventoryItem) => {
    if (!companyId || !mix.treatmentMixRecipe) return;
    const ingredients = mix.treatmentMixRecipe.components.map((item) => `${item.quantity} ${item.unit} ${item.additiveName}`).join('\n');
    if (!window.confirm(`Make ${mix.treatmentMixRecipe.yieldLiters} L of ${mix.itemName}?\n\n${ingredients}`)) return;
    try {
      await makeTreatmentMixBatch(companyId, mix.id, company?.timeZone);
    } catch (error) {
      alert(message(error));
    }
  };

  const recordUse = async () => {
    if (!companyId || !useMix || !selectedPond) return alert('Select a pond.');
    const parsedPpm = positiveNumber(ppm);
    if (!parsedPpm) return alert('PPM must be greater than zero.');
    setSaving(true);
    try {
      await applyTreatmentMix(companyId, useMix.id, {
        id: selectedPond.id,
        name: selectedPond.pondName,
        areaM2: selectedPond.pondArea,
        cycleId: selectedPond.cycleId,
        cycleName: selectedPond.cycleName,
        pondCycleId: selectedPond.pondCycleId,
      }, parsedPpm, company?.timeZone, notes);
      reset();
    } catch (error) {
      alert(message(error));
      setSaving(false);
    }
  };

  if (loading) return <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}><Loader2 className="animate-spin" size={42} /></div>;

  return (
    <div className="dashboard-page-relaxed" style={{ paddingBottom: 40 }}>
      <div className="dashboard-inline-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/dashboard/inventory/feeds" className="dashboard-action dashboard-action-secondary" aria-label="Back to feeds and additives"><ArrowLeft size={18} /></Link>
          <div>
            <h1 style={{ margin: 0, fontSize: 26 }}>Treatment Mixes</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--text-faint)' }}>Prepare recipes, then apply finished mix to ponds by PPM.</p>
          </div>
        </div>
        {canEdit(user?.role) && <button className="dashboard-action dashboard-action-primary" onClick={() => setShowCreate(true)}><Plus size={18} /> Create Treatment Mix</button>}
      </div>

      <div className="glass-card" style={{ marginTop: 20, padding: 16, color: 'var(--text-muted)' }}>
        <strong style={{ color: 'var(--primary)' }}>Dose logic:</strong> at the current assumed 1 m depth, required litres = PPM × pond area (m²) ÷ 1,000. A 2,500 m² pond at 2 PPM uses 5 L.
      </div>

      <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
        {mixes.map((mix) => (
          <article key={mix.id} className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'var(--primary-dim)', color: 'var(--primary)' }}><Beaker size={24} /></div>
              <div style={{ flex: 1 }}><h2 style={{ margin: 0, fontSize: 19 }}>{mix.itemName}</h2><div style={{ marginTop: 4, color: 'var(--text-muted)' }}>{mix.totalStock || 0} L available</div></div>
              <strong>{formatCurrency(mix.totalCost || 0)}</strong>
            </div>
            <div style={{ marginTop: 16, padding: 14, borderRadius: 14, background: 'var(--bg-mid)' }}>
              <strong>Recipe for {mix.treatmentMixRecipe?.yieldLiters || 0} L</strong>
              {(mix.treatmentMixRecipe?.components || []).map((component) => <div key={component.additiveId} style={{ marginTop: 7, color: 'var(--text-muted)' }}>{component.quantity} {component.unit} · {component.additiveName}</div>)}
            </div>
            {canEdit(user?.role) && <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="dashboard-action dashboard-action-secondary" style={{ flex: 1 }} onClick={() => makeBatch(mix)}><RefreshCw size={17} /> Make Batch</button>
              <button className="dashboard-action dashboard-action-primary" style={{ flex: 1 }} onClick={() => setUseMix(mix)} disabled={(mix.totalStock || 0) <= 0}><Waves size={17} /> Use</button>
            </div>}
          </article>
        ))}
      </div>
      {!mixes.length && <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-faint)' }}><Beaker size={52} style={{ margin: '0 auto 14px' }} /><h2>No treatment mixes yet</h2></div>}

      {(showCreate || useMix) && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(5,20,30,.55)', display: 'grid', placeItems: 'center', padding: 20 }}>
          <div className="glass-card" style={{ width: 'min(680px, 100%)', maxHeight: '90vh', overflow: 'auto', padding: 24, background: 'var(--bg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <div><h2 style={{ margin: 0 }}>{showCreate ? 'Create Treatment Mix' : `Use ${useMix?.itemName}`}</h2><p style={{ color: 'var(--text-faint)' }}>{showCreate ? 'Saving makes the first batch and deducts ingredients.' : 'Select the pond and PPM.'}</p></div>
              <button className="dashboard-action dashboard-action-secondary" onClick={reset} aria-label="Close"><X size={18} /></button>
            </div>

            {showCreate ? <>
              <label style={labelStyle}>Mix name<input style={inputStyle} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Ionisation" /></label>
              <label style={labelStyle}>Final prepared volume (L)<input style={inputStyle} type="number" min="0" step="any" value={yieldLiters} onChange={(event) => setYieldLiters(event.target.value)} /></label>
              <h3 style={{ marginTop: 24 }}>Additive ingredients</h3>
              {additives.map((item) => <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 45px', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
                <div><strong>{item.itemName}</strong><div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{item.totalStock || 0} {item.unit || 'kg'} available</div></div>
                <input style={inputStyle} type="number" min="0" step="any" value={quantities[item.id] || ''} onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="0" />
                <span>{item.unit || 'kg'}</span>
              </div>)}
            </> : <>
              <div style={{ ...labelStyle, display: 'block' }}>Pond</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{activePonds.map((pond) => <button key={pond.id} className={`dashboard-action ${pond.id === pondId ? 'dashboard-action-primary' : 'dashboard-action-secondary'}`} onClick={() => setPondId(pond.id)}>{pond.pondName} · {pond.pondArea} m²</button>)}</div>
              <label style={labelStyle}>Treatment concentration (PPM)<input style={inputStyle} type="number" min="0" step="any" value={ppm} onChange={(event) => setPpm(event.target.value)} /></label>
              {dose && <div style={{ marginTop: 14, padding: 16, borderRadius: 14, background: 'var(--primary-dim)' }}><strong>Dose: {dose.requiredMixLiters} L</strong><div style={{ marginTop: 5 }}>{ppm} PPM × {selectedPond?.pondArea} m² ÷ 1,000</div>{useMix && dose.requiredMixLiters > useMix.totalStock && <div style={{ marginTop: 6, color: '#c0392b', fontWeight: 600 }}>Only {useMix.totalStock} L is available.</div>}</div>}
            </>}

            <label style={labelStyle}>Notes (optional)<textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
            <button className="dashboard-action dashboard-action-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 22 }} disabled={saving} onClick={showCreate ? saveMix : recordUse}>{saving ? <Loader2 className="animate-spin" size={18} /> : showCreate ? 'Save & Make First Batch' : 'Record Treatment'}</button>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: 'grid', gap: 8, marginTop: 16, fontSize: 13, fontWeight: 600 } as const;
const inputStyle = { width: '100%', minHeight: 46, padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-mid)', color: 'var(--text)' } as const;
