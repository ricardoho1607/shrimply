"use client";
import { getUserErrorMessage } from '@/lib/userError';
import {
  Loader2,
  Trash2,
  X
} from 'lucide-react';
import { getFarmDateKey } from "../../../../../../shared/farmDate";
import styles from "./InventoryFeeds.module.css";
import { ADDITIVE_CATEGORIES, FEED_CATEGORIES, formatQuantity, formatUsageDisplay, isVoidSaved, UNITS } from './InventoryFeedsModel';

import type { InventoryFeedsViewModel } from './useInventoryFeeds';
type Props = Pick<InventoryFeedsViewModel,
  'isModalOpen'
  | 'closeInventoryModal'
  | 'modalType'
  | 'copy'
  | 'itemType'
  | 't'
  | 'selectedItem'
  | 'savePending'
  | 'agent'
  | 'voidActionBusy'
  | 'historyItem'
  | 'voidPreparationError'
  | 'acceptedInScope'
  | 'voidStatusPanelRef'
  | 'checkingVoidStatus'
  | 'acceptedVoid'
  | 'preparingVoidRecordId'
  | 'pendingVoidOperation'
  | 'acceptedVoidItemName'
  | 'formatDate'
  | 'voidStatusUncertain'
  | 'canRetryVoid'
  | 'retryVoidStockIn'
  | 'recoverVoidStockIn'
  | 'canEditInventory'
  | 'canUseOrson'
  | 'formatCurrency'
  | 'prepareVoidStockIn'
  | 'hasOpenVoidOperation'
  | 'usageRemovalError'
  | 'ponds'
  | 'handleRemoveUsage'
  | 'removingUsageId'
  | 'handleAction'
  | 'formData'
  | 'setFormData'
  | 'itemSuggestions'
  | 'handleOpenModal'
  | 'activePonds'
  | 'currencyConfig'
  | 'company'>;
export function InventoryEntryDialog({ isModalOpen, closeInventoryModal, modalType, copy, itemType, t, selectedItem, savePending, agent, voidActionBusy, historyItem, voidPreparationError, acceptedInScope, voidStatusPanelRef, checkingVoidStatus, acceptedVoid, preparingVoidRecordId, pendingVoidOperation, acceptedVoidItemName, formatDate, voidStatusUncertain, canRetryVoid, retryVoidStockIn, recoverVoidStockIn, canEditInventory, canUseOrson, formatCurrency, prepareVoidStockIn, hasOpenVoidOperation, usageRemovalError, ponds, handleRemoveUsage, removingUsageId, handleAction, formData, setFormData, itemSuggestions, handleOpenModal, activePonds, currencyConfig, company }: Props) {
  return (<>{isModalOpen && (
    <div
      className="responsive-modal-overlay inventory-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeInventoryModal();
      }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000,
        background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px'
      }}>
      <div
        className="glass-card responsive-modal animate-fade-up inventory-modal"
        role="dialog" aria-modal="true" aria-labelledby="inventory-modal-title"
        style={{
          width: '100%', maxWidth: modalType === 'history' ? '920px' : '560px', background: '#FFFFFF', padding: '0',
          overflow: 'hidden', boxShadow: '0 24px 64px rgba(15, 23, 42, 0.18)',
          maxHeight: 'calc(100dvh - 24px)', display: 'flex', flexDirection: 'column',
          border: '1px solid var(--border)', borderRadius: '16px'
        }}
      >
        <div className="responsive-modal-header inventory-modal-header" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
          <div>
            <div>
              <h2 id="inventory-modal-title" style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                {modalType === 'add' ? `${copy('Add New')} ${copy(itemType === 'feed' ? 'Feed' : 'Additive')}` :
                  modalType === 'stockIn' ? t.inventory.stockIn :
                    modalType === 'usage' ? t.inventory.recordUsage :
                      modalType === 'history' ? t.inventory.transactionHistory : copy(itemType === 'additive' ? 'Product Label & Threshold' : 'Threshold Settings')}
              </h2>
              {selectedItem && (
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '2px 0 0' }}>
                  {selectedItem.itemName}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={closeInventoryModal}
            disabled={savePending || (agent.busy || voidActionBusy)}
            aria-label={copy('Close inventory dialog')}
            style={{
              width: '36px', height: '36px', background: 'var(--bg-mid)', border: '1px solid transparent', borderRadius: '10px',
              padding: '0', cursor: 'pointer', color: 'var(--text-primary)', display: 'grid', placeItems: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="responsive-modal-body inventory-modal-body" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {modalType === 'history' && historyItem ? (
            <div className={styles.historySections}>
              {(voidActionBusy || voidPreparationError || agent.error || acceptedInScope) && (
                <section ref={voidStatusPanelRef} className={styles.historySection} aria-live="polite" aria-busy={voidActionBusy}>
                  <h3>{copy('Removal status')}</h3>
                  {voidActionBusy && (
                    <p role="status" className={styles.historyNote} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Loader2 size={14} className="animate-spin" />
                      {copy(checkingVoidStatus ? 'Working...' :
                        acceptedVoid?.command.recordId === preparingVoidRecordId ? 'Saving removal...' : 'Preparing removal...')}
                    </p>
                  )}
                  {voidPreparationError && <p role="alert" style={{ color: '#b42318', fontSize: '13px', margin: 0 }}>{voidPreparationError}</p>}
                  {agent.error && <p role="alert" style={{ color: '#b42318', fontSize: '13px', margin: 0 }}>{agent.error}</p>}
                  {acceptedInScope && pendingVoidOperation && acceptedVoid && (
                    <>
                      <p role="status" className={styles.historyNote}>
                        {acceptedVoidItemName && <>{acceptedVoidItemName} · </>}
                        {formatDate(acceptedVoid.command.date)} · {copy(voidActionBusy ? 'Working...' :
                          voidStatusUncertain ? 'Save status unverified' :
                            isVoidSaved(pendingVoidOperation) ? 'Purchase removed; audit history retained.' :
                              pendingVoidOperation.state === 'discarded' ? 'Removal draft discarded' :
                                pendingVoidOperation.state === 'draft' ? 'Removal draft awaiting save' : 'Removal not confirmed')}
                      </p>
                      {pendingVoidOperation.rows[0].error && <p role="alert">{pendingVoidOperation.rows[0].error}</p>}
                      {pendingVoidOperation.receipts.map((receipt, index) => (
                        <p key={index} className={styles.historyNote}>{copy(receipt.status)}: {getUserErrorMessage(receipt.message)}</p>
                      ))}
                      <button type="button" onClick={() => void (canRetryVoid ? retryVoidStockIn() : recoverVoidStockIn())}
                        disabled={savePending || (agent.busy || voidActionBusy || (canRetryVoid && (!canEditInventory || !canUseOrson)))}>
                        {copy(canRetryVoid ? 'Retry removal' : 'Check save status')}
                      </button>
                    </>
                  )}
                </section>
              )}
              {(() => {
                const activeStockIn = (historyItem.stockInHistory || []).filter(h => !h.voided);
                const voidedStockIn = (historyItem.stockInHistory || []).filter(h => h.voided);
                return (
                  <>
                    <section className={styles.historySection}>
                      <h3>{copy('Stock In Records')} <span>{activeStockIn.length}</span></h3>
                      {activeStockIn.length === 0 && <p className={styles.overviewEmpty}>{copy('No stock intake recorded.')}</p>}
                      {[...activeStockIn].reverse().map(h => (
                        <div key={h.id} className={styles.historyRecord}>
                          <div className={styles.overviewRow}>
                            <div className={styles.overviewIdentity}>
                              <strong>{formatDate(h.date)}</strong>
                              <small>{copy('Unit Price')}: {Number.isFinite(h.price) && h.price > 0 ? formatCurrency(h.price) : '—'}</small>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <strong className={styles.historyQuantity}>
                                +{formatQuantity(h.quantity)} {historyItem.unit}
                              </strong>
                              {(itemType === 'feed' || itemType === 'additive') && canEditInventory && canUseOrson && h.id && h.date && (
                                <button
                                  type="button"
                                  onClick={() => void prepareVoidStockIn(h)}
                                  disabled={savePending || (agent.busy || voidActionBusy || hasOpenVoidOperation)}
                                  aria-label={`${t.companyDetails.remove} ${formatDate(h.date)}`}
                                  title={copy('Remove this stock-in purchase from active inventory and finance')}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    flexShrink: 0,
                                    border: '1px solid #f2c7c7',
                                    borderRadius: '8px',
                                    background: '#fff',
                                    color: '#b42318',
                                    padding: '7px 9px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: agent.busy || voidActionBusy || hasOpenVoidOperation ? 'not-allowed' : 'pointer',
                                    opacity: agent.busy || voidActionBusy || hasOpenVoidOperation ? 0.55 : 1,
                                  }}
                                >
                                  {preparingVoidRecordId === h.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                  {t.companyDetails.remove}
                                </button>
                              )}
                            </div>
                          </div>
                          {h.notes && <p className={styles.historyNote}>{h.notes}</p>}
                        </div>
                      ))}
                    </section>
                    {voidedStockIn.length > 0 && (
                      <section className={styles.historySection}>
                        <h3>{copy('Audit History')} <span>{voidedStockIn.length}</span></h3>
                        {[...voidedStockIn].reverse().map(h => (
                          <div key={h.id} className={styles.historyRecord}>
                            <div className={styles.overviewRow}>
                              <div className={styles.overviewIdentity}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <strong>{formatDate(h.date)}</strong>
                                  <span style={{
                                    backgroundColor: '#fde8e8',
                                    color: '#e74c3c',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    letterSpacing: '0.05em',
                                  }}>
                                    {copy('VOIDED')}
                                  </span>
                                </div>
                                <small>{copy('Unit Price')}: {Number.isFinite(h.price) && h.price > 0 ? formatCurrency(h.price) : '—'}</small>
                              </div>
                              <strong className={styles.historyQuantity} style={{ textDecoration: 'line-through', color: '#95a5a6' }}>
                                +{formatQuantity(h.quantity)} {historyItem.unit}
                              </strong>
                            </div>
                            <p className={styles.historyNote} style={{ color: '#e74c3c', fontWeight: 600 }}>
                              {copy('Audited effect: Stock & cost reversed')} ({formatDate(h.voidedAt || h.date)})
                            </p>
                            {h.notes && <p className={styles.historyNote}>{h.notes}</p>}
                          </div>
                        ))}
                      </section>
                    )}
                  </>
                );
              })()}
              <section className={styles.historySection}>
                <h3>{copy('Usage History')} <span>{historyItem.usageHistory?.length || 0}</span></h3>
                {usageRemovalError && <p role="alert" className={styles.historyNote} style={{ color: '#b42318' }}>{usageRemovalError}</p>}
                {(historyItem.usageHistory || []).length === 0 && <p className={styles.overviewEmpty}>{copy('No usage logs found.')}</p>}
                {[...(historyItem.usageHistory || [])].reverse().map(h => (
                  <div key={h.id} className={styles.historyRecord}>
                    <div className={styles.overviewRow}>
                      <div className={styles.overviewIdentity}>
                        <strong>{formatDate(h.date)}</strong>
                        <small>{copy('Applied to')}: {h.pondId ? (ponds.find(p => p.id === h.pondId)?.pondName || copy('Unknown Pond')) : copy('General Inventory Usage')}</small>
                      </div>
                      <div className={styles.usageActions}>
                        <strong className={styles.historyQuantity}>{formatUsageDisplay(h.quantity)} {historyItem.unit}</strong>
                        {itemType === 'additive' && canEditInventory && h.id && h.quantity > 0 && h.source !== 'treatmentMixProduction' && (
                          <button
                            type="button"
                            className={styles.removeUsageButton}
                            disabled={savePending || agent.busy || voidActionBusy || hasOpenVoidOperation}
                            onClick={() => void handleRemoveUsage(historyItem, h)}
                            aria-label={`Remove ${formatQuantity(h.quantity)} ${historyItem.unit || 'kg'} usage on ${formatDate(h.date)}`}
                            title="Restore the recorded stock and cost and remove this usage expense"
                          >
                            {removingUsageId === h.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            {t.companyDetails.remove}
                          </button>
                        )}
                      </div>
                    </div>
                    {h.notes && <p className={styles.historyNote}>{h.notes}</p>}
                  </div>
                ))}
              </section>

            </div>
          ) : (
            <form id="inventoryForm" className="inventory-form" onSubmit={handleAction} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}><fieldset disabled={savePending} style={{ display: 'contents' }}>
              {modalType === 'add' && (
                <div className="responsive-form-grid inventory-add-details" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="inventory-full-row" style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>{copy('Item Identification')}</label>
                    <input required value={formData.itemName} onChange={e => setFormData({ ...formData, itemName: e.target.value })} placeholder={copy(itemType === 'feed' ? 'e.g. Premium Growth Feed 02' : 'e.g. Pond Probiotic Blend')} style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 600, fontSize: '16px', outline: 'none', transition: 'all 0.3s' }} />
                  </div>
                  <div className="inventory-full-row" style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>{copy('Brand / Manufacturer')}</label>
                    <input value={itemType === 'feed' ? formData.brand : formData.manufacturer} onChange={e => setFormData({ ...formData, [itemType === 'feed' ? 'brand' : 'manufacturer']: e.target.value })} placeholder="e.g. Orson Bio" style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 600, fontSize: '16px', outline: 'none' }} />
                  </div>
                  {itemSuggestions.length > 0 && (
                    <div className="inventory-full-row" style={{ gridColumn: 'span 2', padding: 14, border: '1px solid var(--border)', borderRadius: 12 }}>
                      <strong>{copy('Restock an existing item')}</strong>
                      {itemSuggestions.map(item => (
                        <button key={item.id} type="button" onClick={() => handleOpenModal('stockIn', item, itemType)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 0', color: 'var(--primary)', borderBottom: '1px solid var(--border)' }} disabled={savePending}>
                          {item.itemName} · {item.brand || item.productLabel?.manufacturer || copy('No Brand')} · {copy(item.feedType || item.category)} · {formatQuantity(item.totalStock)} {item.unit}
                        </button>
                      ))}
                      <p style={{ marginTop: 10, fontSize: 13 }}>{copy('Different product? Continue below to create a new item.')}</p>
                    </div>
                  )}
                  {itemType === 'additive' && (
                    <>
                      <div className="inventory-full-row" style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>{copy('Ingredients / Strains — One Per Line')}</label>
                        <textarea rows={4} value={formData.ingredients} onChange={e => setFormData({ ...formData, ingredients: e.target.value })} placeholder="Bacillus subtilis 1×10⁹ CFU/g" style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 600, fontSize: '15px', outline: 'none', resize: 'vertical' }} />
                      </div>
                      <div className="inventory-full-row" style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>{copy('Official Label URL')}</label>
                        <input type="url" value={formData.labelSourceUrl} onChange={e => setFormData({ ...formData, labelSourceUrl: e.target.value })} placeholder="https://manufacturer.com/product-label.pdf" style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 600, fontSize: '15px', outline: 'none' }} />
                      </div>
                    </>
                  )}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>{copy('Classification')}</label>
                    <select required aria-label={copy('Inventory classification')} value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 600, fontSize: '16px', outline: 'none' }}>
                      {(itemType === 'feed' ? FEED_CATEGORIES : ADDITIVE_CATEGORIES).map(c => <option key={c} value={c}>{copy(c)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>{copy('Inventory Unit')}</label>
                    <select value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 600, fontSize: '16px', outline: 'none' }}>
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="inventory-full-row" style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>{copy('Alert Threshold')}</label>
                    <input type="number" value={formData.reorderLevel} onChange={e => setFormData({ ...formData, reorderLevel: e.target.value })} placeholder={copy('Notify when below...')} style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 600, fontSize: '16px', outline: 'none' }} />
                  </div>
                </div>
              )}

              {modalType !== 'editReorder' && (
                <div className="responsive-form-grid inventory-stock-details" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className={modalType === 'add' ? undefined : 'inventory-full-row'} style={{ gridColumn: modalType === 'add' ? 'span 1' : 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>{t.inventory.quantity} ({formData.unit || 'units'})</label>
                    <input required type="number" step="0.01" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} placeholder="0.00" style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 600, fontSize: '20px', outline: 'none', color: 'var(--primary)' }} />
                  </div>

                  {modalType === 'usage' && (
                    <div className="inventory-full-row" style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>{copy('Assign to Pond')}</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, pondId: '' })}
                          style={{
                            padding: '14px', borderRadius: '14px', fontSize: '13px', fontWeight: 600,
                            background: formData.pondId === '' ? 'var(--primary)' : 'var(--bg-mid)',
                            color: formData.pondId === '' ? 'white' : 'var(--text-muted)',
                            border: '1px solid var(--border)', transition: 'all 0.3s'
                          }} disabled={savePending}
                        >{copy('General Use')}</button>
                        {activePonds.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, pondId: p.id })}
                            style={{
                              padding: '14px', borderRadius: '14px', fontSize: '13px', fontWeight: 600,
                              background: formData.pondId === p.id ? 'var(--primary)' : 'var(--bg-mid)',
                              color: formData.pondId === p.id ? 'white' : 'var(--text-muted)',
                              border: '1px solid var(--border)', transition: 'all 0.3s',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                            }} disabled={savePending}
                          >{p.pondName}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {modalType === 'usage' && (
                    <div>
                      <label htmlFor="inventory-usage-date" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{copy('Usage date')}</label>
                      <input id="inventory-usage-date" required type="date" max={getFarmDateKey(new Date(), company?.timeZone)} value={formData.usageDate}
                        onChange={event => setFormData({ ...formData, usageDate: event.target.value })} disabled={savePending}
                        style={{ width: '100%', padding: 18, borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 600, fontSize: 16 }} />
                    </div>
                  )}

                  {modalType !== 'usage' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>{t.inventory.unitPrice} ({currencyConfig.symbol})</label>
                      <input required type="number" value={formData.unitPrice} onChange={e => setFormData({ ...formData, unitPrice: e.target.value })} placeholder={copy('Current Price')} style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 600, fontSize: '16px', outline: 'none' }} />
                    </div>
                  )}

                  {(modalType === 'add' || modalType === 'stockIn') && (
                    <>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>{t.inventory.stockDate}</label>
                        <input required type="date" max={getFarmDateKey(new Date(), company?.timeZone)} value={formData.stockDate} onChange={e => setFormData({ ...formData, stockDate: e.target.value })} style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 600, fontSize: '16px', outline: 'none' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>{copy('Expiry Date')}</label>
                        <input type="date" value={formData.expiry} onChange={e => setFormData({ ...formData, expiry: e.target.value })} style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 600, fontSize: '16px', outline: 'none' }} />
                      </div>
                    </>
                  )}
                </div>
              )}

              {modalType === 'editReorder' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{copy('Stock Reorder Threshold')}</label>
                  <input type="number" value={formData.reorderLevel} onChange={e => setFormData({ ...formData, reorderLevel: e.target.value })} placeholder={copy('Alert me when stock is below...')} style={{ width: '100%', padding: '20px', borderRadius: '20px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 600, fontSize: '24px', outline: 'none', color: '#e74c3c' }} />
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600 }}>{copy('We will display a critical alert on the dashboard when stock falls below this amount.')}</p>
                  {itemType === 'additive' && (
                    <>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{copy('Manufacturer')}</label>
                      <input value={formData.manufacturer} onChange={e => setFormData({ ...formData, manufacturer: e.target.value })} placeholder={copy('Company shown on the product label')} style={{ width: '100%', padding: '16px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 600 }} />
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{copy('Ingredients / Strains — One Per Line')}</label>
                      <textarea rows={4} value={formData.ingredients} onChange={e => setFormData({ ...formData, ingredients: e.target.value })} placeholder="Bacillus subtilis 1×10⁹ CFU/g" style={{ width: '100%', padding: '16px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 600, resize: 'vertical' }} />
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{copy('Official Label URL')}</label>
                      <input type="url" value={formData.labelSourceUrl} onChange={e => setFormData({ ...formData, labelSourceUrl: e.target.value })} placeholder="https://manufacturer.com/product-label.pdf" style={{ width: '100%', padding: '16px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 600 }} />
                    </>
                  )}
                </div>
              )}

              {modalType !== 'editReorder' && (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>{t.inventory.notesOptional}</label>
                  <textarea rows={2} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder={copy('Any specific details about this transaction...')} style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 600, fontSize: '16px', outline: 'none', resize: 'none' }} />
                </div>
              )}
            </fieldset></form>
          )}
        </div>

        {modalType !== 'history' && (
          <div className="responsive-modal-footer inventory-modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={closeInventoryModal}
              disabled={savePending || (agent.busy || voidActionBusy)}
            >{copy('Cancel')}</button>
            <button
              form="inventoryForm"
              type="submit"
              className="btn-primary" disabled={savePending}
            >
              {modalType === 'add' ? `${copy('Add')} ${copy(itemType === 'feed' ? 'Feed' : 'Additive')}` :
                modalType === 'stockIn' ? copy('Confirm stock in') :
                  modalType === 'usage' ? copy('Record usage') : copy('Save threshold')}
            </button>
          </div>
        )}
      </div>
    </div>
  )}</>);
}
