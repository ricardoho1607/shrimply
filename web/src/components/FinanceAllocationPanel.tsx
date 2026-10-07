'use client';

import { useEffect, useRef, useState } from 'react';
import type { PondCostAllocation } from '../../../shared/financeCycleAllocation';
import type { ExpensePond, ProductionAllocationPreview } from '../../../shared/financeExpenseAllocation';
import { pondPlQuantity } from '../../../shared/financeExpenseAllocation';
import type { FinanceAllocationCopy } from '../../../shared/financeAllocationCopy';
import styles from './FinanceAllocationPanel.module.css';

export function FinanceAllocationBreakdown({ rows, copy, formatCurrency }: { rows: PondCostAllocation[]; copy: FinanceAllocationCopy; formatCurrency: (value: number) => string }) {
  if (!rows.length) return null;
  return <details className={styles.breakdown}><summary>{copy.breakdown} · {rows.length} {copy.ponds}</summary>
    <div className={styles.rows}>{rows.map(row => <div className={styles.row} key={row.pondCycleId || row.pondId}>
      <div><strong>{row.pondName}</strong><small>{[row.blockName, row.cycleName].filter(Boolean).join(' · ')}</small>
        {(row.pondArea !== undefined || row.plQuantity !== undefined) && <small>{(row.pondArea ?? row.plQuantity)?.toLocaleString()} {row.pondArea !== undefined ? 'm²' : 'PL'}</small>}
      </div><strong>{formatCurrency(row.amount)}</strong>
    </div>)}</div>
  </details>;
}

export default function FinanceAllocationPanel({ method, ponds, preview, selectedIds, quantities, onSelection, onQuantity, copy, formatCurrency, currencySymbol, usingSaved, onRecalculate }: {
  method: 'active_pond_area' | 'pl_quantity'; ponds: ExpensePond[]; preview: ProductionAllocationPreview;
  selectedIds: string[]; quantities: Record<string, string | number>; onSelection: (ids: string[]) => void;
  onQuantity: (pondId: string, quantity: string) => void; copy: FinanceAllocationCopy;
  formatCurrency: (value: number) => string; currencySymbol: string; usingSaved?: boolean; onRecalculate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);
  const visiblePonds = ponds.filter(pond => `${pond.pondName} ${pond.blockName || ''} ${pond.cycleName || ''}`.toLowerCase().includes(search.toLowerCase()));
  const groups = new Map<string, { name: string; ponds: ExpensePond[] }>();
  visiblePonds.forEach(pond => {
    const key = pond.blockId || pond.blockName || '__unassigned__';
    const group = groups.get(key) || { name: pond.blockName || copy.unassigned, ponds: [] };
    group.ponds.push(pond); groups.set(key, group);
  });
  const toggle = (ids: string[]) => {
    const allSelected = ids.every(id => selectedIds.includes(id));
    onSelection(allSelected ? selectedIds.filter(id => !ids.includes(id)) : [...new Set([...selectedIds, ...ids])]);
  };
  return <section className={styles.panel} aria-label={copy.breakdown}>
    <strong>{method === 'active_pond_area' ? copy.production : copy.selectPonds}</strong>
    <p>{method === 'active_pond_area' ? copy.areaHint : copy.plHint}</p>
    {method === 'pl_quantity' ? <button type="button" className={styles.selector} onClick={() => { setSearch(''); setOpen(true); }}>{copy.selectPonds} · {selectedIds.length} {copy.selected}</button> : preview.error ? <p>{ponds.length} {copy.ponds}</p> : null}
    {usingSaved && <p>{copy.saved} {onRecalculate && <button type="button" className={styles.link} onClick={onRecalculate}>{copy.recalculate}</button>}</p>}
    {preview.error && preview.error !== 'invalidAmount' && <p className={styles.error} role="alert">{copy[preview.error]}</p>}
    {!preview.error && <><div className={styles.metrics}><span>{preview.allocations.length} {preview.allocations.length === 1 ? copy.pond : copy.ponds} · {preview.blockCount} {preview.blockCount === 1 ? copy.block : copy.blocks}</span>
      <span>{method === 'active_pond_area' ? copy.totalArea : copy.totalPl}: <strong>{preview.totalBasis.toLocaleString()} {method === 'active_pond_area' ? 'm²' : 'PL'}</strong></span>
      <span>{currencySymbol} {preview.rate.toLocaleString(undefined, { maximumFractionDigits: 4 })} / {method === 'active_pond_area' ? 'm²' : 'PL'}</span></div>
      <FinanceAllocationBreakdown rows={preview.allocations} copy={copy} formatCurrency={formatCurrency} /></>}
    <dialog ref={dialog} className={styles.dialog} onClose={() => setOpen(false)} onCancel={() => setOpen(false)} aria-label={copy.selectPonds}>
      <header><h3>{copy.selectPonds}</h3><button type="button" aria-label={copy.close} onClick={() => setOpen(false)}>×</button></header>
      <input className={styles.search} type="search" aria-label={copy.search} placeholder={copy.search} value={search} onChange={event => setSearch(event.target.value)} />
      <div className={styles.options}>{Array.from(groups, ([key, group]) => <section key={key}>
        <div className={styles.group}><strong>{group.name}</strong><button type="button" className={styles.link} onClick={() => toggle(group.ponds.map(pond => pond.id))}>{group.ponds.every(pond => selectedIds.includes(pond.id)) ? copy.clearBlock : copy.selectBlock}</button></div>
        {group.ponds.map(pond => <div className={styles.option} key={pond.id}>
          <label><input type="checkbox" checked={selectedIds.includes(pond.id)} onChange={() => toggle([pond.id])} /><span><strong>{pond.pondName}</strong><small>{pond.cycleName || pond.cycleId}</small></span></label>
          {selectedIds.includes(pond.id) && <label className={styles.quantity}>{copy.quantity}<input type="number" min="1" step="1" value={quantities[pond.id] ?? pondPlQuantity(pond) ?? ''} onChange={event => onQuantity(pond.id, event.target.value)} /></label>}
        </div>)}
      </section>)}{!visiblePonds.length && <p>{copy.noPonds}</p>}</div>
      <footer><span>{selectedIds.length} {copy.ponds} {copy.selected}</span><button type="button" className={styles.done} onClick={() => setOpen(false)}>{copy.done}</button></footer>
    </dialog>
  </section>;
}
