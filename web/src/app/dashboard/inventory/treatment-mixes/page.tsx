"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Loader2, Plus, RefreshCw, Waves, X } from 'lucide-react';
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
import styles from './TreatmentMixesPage.module.css';
import { useFarmPermissions } from '@/hooks/useFarmPermissions';
import { useDashboardCopy } from '@/hooks/useDashboardCopy';

type Pond = {
  id: string;
  pondName: string;
  pondArea: number;
  cycleStatus?: string;
  cycleId?: string;
  cycleName?: string;
  pondCycleId?: string;
};

const positiveNumber = (value: string) => {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};
const message = (error: unknown) => error instanceof Error ? error.message : 'Operation failed';

export default function TreatmentMixesPage() {
  const copy = useDashboardCopy();
  const { company } = useAuth();
  const { formatCurrency } = useCurrency();
  const { additives: inventory, ponds, loading, companyId } = useInventoryFeeds<never, TreatmentMixInventoryItem, Pond>();
  const [showCreate, setShowCreate] = useState(false);
  const [useMix, setUseMix] = useState<TreatmentMixInventoryItem | null>(null);
  const [batchMix, setBatchMix] = useState<TreatmentMixInventoryItem | null>(null);
  const [name, setName] = useState('');
  const [yieldLiters, setYieldLiters] = useState('');
  const [notes, setNotes] = useState('');
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<string[]>([]);
  const [isIngredientMenuOpen, setIngredientMenuOpen] = useState(false);
  const [pondId, setPondId] = useState('');
  const [ppm, setPpm] = useState('');
  const [saving, setSaving] = useState(false);
  const hasPermission = useFarmPermissions();
  const canEdit = hasPermission('manageFeedInventory');

  const additives = useMemo(() => inventory.filter((item) => item.inventoryKind !== 'treatmentMix'), [inventory]);
  const mixes = useMemo(() => inventory.filter((item) => item.inventoryKind === 'treatmentMix'), [inventory]);
  const selectedAdditives = useMemo(
    () => selectedIngredientIds.flatMap((id) => {
      const additive = additives.find((item) => item.id === id);
      return additive ? [additive] : [];
    }),
    [additives, selectedIngredientIds],
  );
  const activePonds = useMemo(() => ponds.filter((pond) => pond.cycleStatus !== 'ended'), [ponds]);
  const selectedPond = activePonds.find((pond) => pond.id === pondId);
  const dose = useMemo(() => {
    const parsedPpm = positiveNumber(ppm);
    return selectedPond && parsedPpm ? calculateTreatmentDoseLiters(selectedPond.pondArea, parsedPpm) : null;
  }, [ppm, selectedPond]);

  const reset = () => {
    setShowCreate(false);
    setUseMix(null);
    setBatchMix(null);
    setName('');
    setYieldLiters('');
    setNotes('');
    setQuantities({});
    setSelectedIngredientIds([]);
    setIngredientMenuOpen(false);
    setPondId('');
    setPpm('');
    setSaving(false);
  };

  const saveMix = async () => {
    if (!companyId) return;
    const finalYield = positiveNumber(yieldLiters);
    const components: TreatmentMixComponent[] = selectedAdditives.flatMap((item) => {
      const quantity = positiveNumber(quantities[item.id] || '');
      return quantity ? [{ additiveId: item.id, additiveName: item.itemName, quantity, unit: item.unit || 'kg' }] : [];
    });
    if (!name.trim() || !finalYield || !components.length) return alert(copy('Enter a name, final volume, and at least one ingredient.'));
    if (inventory.some((item) => item.itemName.trim().toLowerCase() === name.trim().toLowerCase())) return alert(copy('That inventory name already exists.'));
    setSaving(true);
    try {
      await createTreatmentMix(companyId, { name, yieldLiters: finalYield, components, notes, timeZone: company?.timeZone });
      reset();
    } catch (error) {
      alert(message(error));
      setSaving(false);
    }
  };

  const toggleIngredient = (id: string) => {
    const isSelected = selectedIngredientIds.includes(id);
    setSelectedIngredientIds((current) => isSelected ? current.filter((itemId) => itemId !== id) : [...current, id]);
    if (isSelected) {
      setQuantities((values) => {
        const next = { ...values };
        delete next[id];
        return next;
      });
    }
  };

  const confirmBatch = async () => {
    if (!companyId || !batchMix?.treatmentMixRecipe) return;
    setSaving(true);
    try {
      await makeTreatmentMixBatch(companyId, batchMix.id, company?.timeZone);
      reset();
    } catch (error) {
      alert(message(error));
      setSaving(false);
    }
  };

  const recordUse = async () => {
    if (!companyId || !useMix || !selectedPond) return alert(copy('Select a pond.'));
    const parsedPpm = positiveNumber(ppm);
    if (!parsedPpm) return alert(copy('PPM must be greater than zero.'));
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
    <div className="dashboard-page-relaxed authenticated-compact-page business-dashboard-page" style={{ paddingBottom: 40 }}>
      <div className={`dashboard-inline-toolbar ${styles.toolbarCompact}`}>
        <Link href="/dashboard/inventory/feeds" className="dashboard-action dashboard-action-secondary" aria-label={copy('Back to feeds and additives')}><ArrowLeft size={18} /></Link>
        <div className={styles.toolbarCopy}>
          <h1>{copy('Treatment Mixes')}</h1>
          <p>{copy('Prepare recipes, then apply finished mix to ponds by PPM.')}</p>
        </div>
        {canEdit && <button className="dashboard-action dashboard-action-primary" onClick={() => setShowCreate(true)}><Plus size={17} /> {copy('Create Mix')}</button>}
      </div>

      <div className={styles.doseLogic}>
        <strong style={{ color: 'var(--primary)' }}>{copy('Dose logic:')}</strong> {copy('at the current assumed 1 m depth, required litres = PPM × pond area (m²) ÷ 1,000. A 2,500 m² pond at 2 PPM uses 5 L.')}
      </div>

      <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
        {mixes.map((mix) => (
          <article key={mix.id} className={`glass-card ${styles.mixCard}`} style={{ padding: 16 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ flex: 1 }}><h2 style={{ margin: 0, fontSize: 19 }}>{mix.itemName}</h2><div style={{ marginTop: 4, color: 'var(--text-muted)' }}>{mix.totalStock || 0} {copy('L available')}</div></div>
              <strong>{formatCurrency(mix.totalCost || 0)}</strong>
            </div>
            <div style={{ marginTop: 16, padding: 14, borderRadius: 14, background: 'var(--bg-mid)' }}>
              <strong>{copy('Recipe for')} {mix.treatmentMixRecipe?.yieldLiters || 0} L</strong>
              {(mix.treatmentMixRecipe?.components || []).map((component) => <div key={component.additiveId} style={{ marginTop: 7, color: 'var(--text-muted)' }}>{component.quantity} {component.unit} · {component.additiveName}</div>)}
            </div>
            {canEdit && <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="dashboard-action dashboard-action-secondary" style={{ flex: 1 }} onClick={() => setBatchMix(mix)}><RefreshCw size={17} /> {copy('Make Batch')}</button>
              <button className="dashboard-action dashboard-action-primary" style={{ flex: 1 }} onClick={() => setUseMix(mix)} disabled={(mix.totalStock || 0) <= 0}><Waves size={17} /> {copy('Use')}</button>
            </div>}
          </article>
        ))}
      </div>
      {!mixes.length && <div className={styles.emptyState}><h2>{copy('No treatment mixes yet')}</h2><p>{copy('Create a reusable recipe from your additive inventory.')}</p></div>}

      {(showCreate || useMix || batchMix) && (
        <div
          className={`responsive-modal-overlay ${styles.modalOverlay}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) reset();
          }}
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(5,20,30,.55)', display: 'grid', placeItems: 'center', padding: 12 }}
        >
          <div className={`glass-card responsive-modal ${styles.modal}`} role="dialog" aria-modal="true" aria-labelledby="treatment-mix-modal-title" style={{ width: 'min(620px, 100%)', maxHeight: 'calc(100dvh - 24px)', overflow: 'hidden', padding: 0, background: '#fff' }}>
            <div className={`responsive-modal-header ${styles.modalHeader}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <div><h2 id="treatment-mix-modal-title" style={{ margin: 0 }}>{showCreate ? copy('Create Treatment Mix') : useMix ? `${copy('Use')} ${useMix.itemName}` : `${copy('Make')} ${batchMix?.itemName}`}</h2><p style={{ color: 'var(--text-faint)' }}>{showCreate ? copy('Saving makes the first batch and deducts ingredients.') : useMix ? copy('Select the pond and PPM.') : copy('Confirm the recipe before deducting ingredients.')}</p></div>
              <button className="dashboard-action dashboard-action-secondary" onClick={reset} aria-label={copy('Close')}><X size={18} /></button>
            </div>

            <div className={`responsive-modal-body ${styles.modalBody}`}>
            {showCreate ? <>
              <label style={labelStyle}>{copy('Mix name')}<input style={inputStyle} value={name} onChange={(event) => setName(event.target.value)} placeholder={copy('e.g. Ionisation')} /></label>
              <label style={labelStyle}>{copy('Final prepared volume (L)')}<input style={inputStyle} type="number" min="0" step="any" value={yieldLiters} onChange={(event) => setYieldLiters(event.target.value)} /></label>
              <section className={styles.ingredientsSection}>
                <div className={styles.ingredientsHeader}>
                  <div><h3>{copy('Additive ingredients')}</h3><p>{copy('Select stocked additives, then enter the amount used for one batch.')}</p></div>
                  <span>{selectedIngredientIds.length} {copy('selected')}</span>
                </div>
                <div className={styles.ingredientPicker}>
                  <button
                    type="button"
                    className="dashboard-action dashboard-action-secondary"
                    aria-label={copy('Select treatment mix ingredients')}
                    aria-haspopup="menu"
                    aria-expanded={isIngredientMenuOpen}
                    onClick={() => setIngredientMenuOpen((current) => !current)}
                  ><Plus size={16} /> {copy('Select ingredients')}</button>
                  {isIngredientMenuOpen && (
                    <div className={styles.ingredientMenu} role="menu" aria-label={copy('Additive inventory')}>
                      {additives.filter((item) => (item.totalStock || 0) > 0).length === 0 ? (
                        <p>{copy('No stocked additives are available. Add additive stock from Feeds & Additives first.')}</p>
                      ) : additives.filter((item) => (item.totalStock || 0) > 0).map((item) => {
                        const isSelected = selectedIngredientIds.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            role="menuitemcheckbox"
                            aria-checked={isSelected}
                            onClick={() => toggleIngredient(item.id)}
                          >
                            <span><strong>{item.itemName}</strong><small>{item.totalStock || 0} {item.unit || 'kg'} {copy('available')}</small></span>
                            {isSelected && <Check size={17} aria-hidden="true" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {selectedAdditives.length === 0 ? (
                  <p className={styles.selectionHint}>{copy('No ingredients selected yet.')}</p>
                ) : selectedAdditives.map((item) => <div key={item.id} className={styles.ingredientRow}>
                  <div><strong>{item.itemName}</strong><small>{item.totalStock || 0} {item.unit || 'kg'} {copy('available')}</small></div>
                  <input aria-label={`${item.itemName} ${copy('quantity')}`} style={inputStyle} type="number" min="0" max={item.totalStock || undefined} step="any" value={quantities[item.id] || ''} onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="0" />
                  <span>{item.unit || 'kg'}</span>
                  <button type="button" aria-label={`${copy('Remove')} ${item.itemName}`} onClick={() => toggleIngredient(item.id)}><X size={16} /></button>
                </div>)}
              </section>
            </> : useMix ? <>
              <div style={{ ...labelStyle, display: 'block' }}>{copy('Pond')}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{activePonds.map((pond) => <button key={pond.id} className={`dashboard-action ${pond.id === pondId ? 'dashboard-action-primary' : 'dashboard-action-secondary'}`} onClick={() => setPondId(pond.id)}>{pond.pondName} · {pond.pondArea} m²</button>)}</div>
              <label style={labelStyle}>{copy('Treatment concentration (PPM)')}<input style={inputStyle} type="number" min="0" step="any" value={ppm} onChange={(event) => setPpm(event.target.value)} /></label>
              {dose && <div style={{ marginTop: 14, padding: 16, borderRadius: 14, background: 'var(--primary-dim)' }}><strong>{copy('Dose')}: {dose.requiredMixLiters} L</strong><div style={{ marginTop: 5 }}>{ppm} PPM × {selectedPond?.pondArea} m² ÷ 1,000</div>{useMix && dose.requiredMixLiters > useMix.totalStock && <div style={{ marginTop: 6, color: '#c0392b', fontWeight: 600 }}>{copy('Only {amount} L is available.', { amount: useMix.totalStock })}</div>}</div>}
            </> : <div className={styles.batchSummary}>
              <strong>{copy('Recipe for')} {batchMix?.treatmentMixRecipe?.yieldLiters || 0} L</strong>
              {(batchMix?.treatmentMixRecipe?.components || []).map((component) => <div key={component.additiveId}><span>{component.additiveName}</span><strong>{component.quantity} {component.unit}</strong></div>)}
            </div>}

            {!batchMix && <label style={labelStyle}>{copy('Notes (optional)')}<textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>}
            </div>
            <div className={`responsive-modal-footer ${styles.modalFooter}`}>
              <button className="dashboard-action dashboard-action-secondary" onClick={reset}>{copy('Cancel')}</button>
              <button className="dashboard-action dashboard-action-primary" disabled={saving} onClick={showCreate ? saveMix : useMix ? recordUse : confirmBatch}>{saving ? <Loader2 className="animate-spin" size={18} /> : showCreate ? copy('Save & Make First Batch') : useMix ? copy('Record Treatment') : copy('Make Batch')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: 'grid', gap: 8, marginTop: 16, fontSize: 13, fontWeight: 600 } as const;
const inputStyle = { width: '100%', minHeight: 46, padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-mid)', color: 'var(--text)' } as const;
