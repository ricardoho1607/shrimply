"use client";
import {
  AlertCircle,
  ArrowUpDown,
  Box,
  Plus,
  Search
} from 'lucide-react';
import styles from "./InventoryFeeds.module.css";
import { ADDITIVE_CATEGORIES, FEED_CATEGORIES, formatQuantity, formatUsageDisplay } from './InventoryFeedsModel';

import type { InventoryFeedsViewModel } from './useInventoryFeeds';
type Props = Pick<InventoryFeedsViewModel,
  'activeTab'
  | 'dashboardMetrics'
  | 'copy'
  | 'metrics'
  | 'showAllStockAlerts'
  | 'canEditInventory'
  | 'handleOpenModal'
  | 'savePending'
  | 'setShowAllStockAlerts'
  | 'transactionFilterRef'
  | 'isTransactionFilterOpen'
  | 'setInputMenuOpen'
  | 'setTransactionFilterOpen'
  | 'recentActivityFilter'
  | 'setRecentActivityFilter'
  | 'displayedTransactions'
  | 't'
  | 'searchTerm'
  | 'setSearchTerm'
  | 'setCategoryFilter'
  | 'categoryFilter'
  | 'stockFilter'
  | 'setStockFilter'
  | 'feeds'
  | 'additives'
  | 'filteredItems'
  | 'handleDeleteItem'
  | 'formatCurrency'>;
export function InventoryOverview({ activeTab, dashboardMetrics, copy, metrics, showAllStockAlerts, canEditInventory, handleOpenModal, savePending, setShowAllStockAlerts, transactionFilterRef, isTransactionFilterOpen, setInputMenuOpen, setTransactionFilterOpen, recentActivityFilter, setRecentActivityFilter, displayedTransactions, t, searchTerm, setSearchTerm, setCategoryFilter, categoryFilter, stockFilter, setStockFilter, feeds, additives, filteredItems, handleDeleteItem, formatCurrency }: Props) {
  return (<><div style={{ flex: 1 }}>
    {activeTab === 'dashboard' ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        <div className="glass-card inventory-summary-bar" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
          {dashboardMetrics.map((metric) => (
            <div key={metric.label} className="inventory-summary-item">
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
          ))}
        </div>

        {/* Split View: Alerts and Transactions */}
        <div className="dashboard-report-grid inventory-dashboard-split" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(420px, 1fr)' }}>

          {/* Critical Alerts Section */}
          <div className={`glass-card ${styles.overviewPanel}`}>
            <div className={styles.overviewPanelHeader}>
              <h2 className="inventory-section-heading">{copy('Stock Status Alerts')}</h2>
              <span className="inventory-alert-count">
                {metrics.lowStockCount} {copy(metrics.lowStockCount === 1 ? 'Alert' : 'Alerts')}
              </span>
            </div>

            <div>
              {metrics.lowStockItems.length === 0 && <p className={styles.overviewEmpty}>{copy('No stock alerts')}</p>}
              {(showAllStockAlerts ? metrics.lowStockItems : metrics.lowStockItems.slice(0, 5)).map(item => (
                <div key={item.id} className={styles.overviewRow}>
                  <div className={styles.overviewIdentity}>
                    <strong>{item.itemName}</strong>
                    <small>{formatQuantity(item.totalStock)} {item.unit} {copy('remaining')}</small>
                  </div>
                  {canEditInventory && (
                    <button
                      type="button"
                      className={styles.inventoryCardSecondaryAction}
                      onClick={() => handleOpenModal('stockIn', item, item.feedType ? 'feed' : 'additive')} disabled={savePending}
                    >
                      {copy('Restock now')}
                    </button>
                  )}
                </div>
              ))}
            </div>
            {metrics.lowStockItems.length > 5 && (
              <button type="button" className={styles.overviewExpand} aria-expanded={showAllStockAlerts} onClick={() => setShowAllStockAlerts(value => !value)} disabled={savePending}>
                {copy(showAllStockAlerts ? 'Show less' : 'Show all')} {!showAllStockAlerts && `(${metrics.lowStockItems.length})`}
              </button>
            )}
          </div>

          {/* Transaction Ledger */}
          <div className={`glass-card ${styles.overviewPanel}`}>
            <div className={styles.overviewPanelHeader}>
              <h2 className="inventory-section-heading">{copy('Recent Transactions')}</h2>
              <div className="pond-detail-record-menu inventory-filter-menu" ref={transactionFilterRef}>
                <button
                  type="button"
                  className="inventory-filter-trigger"
                  aria-label={copy('Filter transactions')}
                  aria-expanded={isTransactionFilterOpen}
                  aria-haspopup="menu"
                  onClick={() => {
                    setInputMenuOpen(false);
                    setTransactionFilterOpen((open) => !open);
                  }} disabled={savePending}
                >
                  <ArrowUpDown size={17} />
                </button>
                {isTransactionFilterOpen && (
                  <div
                    className="pond-detail-record-popover inventory-filter-popover"
                    role="menu"
                    style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, bottom: 'auto', left: 'auto', width: 'min(210px, calc(100vw - 24px))' }}
                  >
                    {([
                      { id: 'all', label: 'All transactions', description: 'Show active stock movements' },
                      { id: 'stockIn', label: 'Stock in', description: 'Show active incoming stock' },
                      { id: 'usage', label: 'Stock out', description: 'Show inventory usage only' },
                      { id: 'audit', label: 'Audit history', description: 'Show voided purchase history' },
                    ] as const).map((filter) => (
                      <button
                        key={filter.id}
                        type="button"
                        role="menuitem"
                        className={recentActivityFilter === filter.id ? 'is-active' : ''}
                        onClick={() => {
                          setRecentActivityFilter(filter.id);
                          setTransactionFilterOpen(false);
                        }} disabled={savePending}
                      >
                        <span><strong>{copy(filter.label)}</strong><small>{copy(filter.description)}</small></span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              {displayedTransactions.length === 0 && <p className={styles.overviewEmpty}>{copy('No transactions to show')}</p>}
              {displayedTransactions.map(tx => (
                <div key={tx.id} className={styles.overviewRow}>
                  <div className={styles.overviewIdentity}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong>{tx.name}</strong>
                      {tx.voided && (
                        <span style={{
                          backgroundColor: '#fde8e8',
                          color: '#e74c3c',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}>
                          {copy('VOIDED')}
                        </span>
                      )}
                    </div>
                    <small>{copy(tx.type)} · {tx.date}</small>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontWeight: 600,
                      fontSize: '18px',
                      color: tx.voided ? '#95a5a6' : 'var(--text-primary)',
                      textDecoration: tx.voided ? 'line-through' : 'none',
                      fontVariantNumeric: 'tabular-nums'
                    }}>
                      {tx.type === 'Stock In' ? `+${formatQuantity(tx.quantity)}` : formatUsageDisplay(tx.quantity)}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase' }}>{tx.unit}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Advanced Search and Filtering */}
        <div className="glass-card dashboard-toolbar-card animate-fade-up" style={{ background: 'white' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={20} style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
            <input
              placeholder={t.inventory.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'var(--bg-mid)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '12px 16px 12px 46px',
                width: '100%',
                fontSize: '14px',
                outline: 'none',
                fontWeight: 600,
                color: 'var(--text-primary)',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '6px', padding: '5px', background: 'var(--bg-mid)', borderRadius: '14px', border: '1px solid var(--border)', overflowX: 'auto' }}>
            <button
              onClick={() => setCategoryFilter(null)}
              style={{
                padding: '8px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                background: !categoryFilter ? 'white' : 'transparent',
                color: !categoryFilter ? 'var(--primary)' : 'var(--text-muted)',
                boxShadow: !categoryFilter ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                border: 'none', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }} disabled={savePending}
            >{copy('All Categories')}</button>
            {(activeTab === 'feed' ? FEED_CATEGORIES : ADDITIVE_CATEGORIES).map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                style={{
                  padding: '8px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                  background: categoryFilter === cat ? 'white' : 'transparent',
                  color: categoryFilter === cat ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: categoryFilter === cat ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                  border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }} disabled={savePending}
              >{copy(cat)}</button>
            ))}
          </div>
        </div>

        {/* Dynamic Inventory Grid */}
        <div role="group" aria-label={copy('Stock availability')} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {(['in', 'out', 'all'] as const).map(status => (
            <button key={status} type="button" aria-pressed={stockFilter === status} onClick={() => setStockFilter(status)} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border)', background: stockFilter === status ? 'var(--primary)' : 'white', color: stockFilter === status ? 'white' : 'var(--text-muted)' }} disabled={savePending}>
              {copy(status === 'in' ? 'In stock' : status === 'out' ? 'Out of stock' : 'All')} ({(activeTab === 'feed' ? feeds : additives).filter(item => status === 'all' || (status === 'in' ? item.totalStock > 0 : item.totalStock === 0)).length})
            </button>
          ))}
        </div>
        {filteredItems.length === 0 ? (
          <div className="glass-card animate-fade-up" style={{ padding: '56px 28px', background: 'white', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '22px', background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', marginBottom: '22px', border: '1px solid var(--border)' }}>
              <Box size={34} />
            </div>
            <h2 style={{ fontSize: '20px', lineHeight: '28px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px', letterSpacing: '-0.02em' }}>
              {copy('No items match these filters')}
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '26px', fontWeight: 600, fontSize: '14px', maxWidth: '400px', lineHeight: 1.6 }}>
              {copy('Try All to find existing items, or add a new product.')}
            </p>
            {canEditInventory && (
              <button
                className="btn-primary"
                onClick={() => handleOpenModal('add', undefined, activeTab)}
                style={{ height: '44px', padding: '0 20px', borderRadius: '10px', fontWeight: 500, fontSize: '14px', letterSpacing: 0, textTransform: 'none', boxShadow: 'var(--shadow-glow)' }} disabled={savePending}
              >
                <Plus size={22} />
                {copy(activeTab === 'feed' ? 'Add Feed' : 'Add Additive')}
              </button>
            )}
          </div>
        ) : (
          <div className="responsive-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
            {filteredItems.map((item, idx) => {
              if (item.totalStock === 0) return (
                <div key={item.id} className="glass-card" style={{ padding: 18 }}>
                  <strong>{item.itemName}</strong>
                  <p>{item.brand || item.productLabel?.manufacturer} · {copy('Out of stock')}</p>
                  <div style={{ display: 'flex', gap: 16 }}>
                    {canEditInventory && <button type="button" onClick={() => handleOpenModal('stockIn', item, activeTab)} disabled={savePending}>{copy('Restock now')}</button>}
                    <button type="button" onClick={() => handleOpenModal('history', item, activeTab)} disabled={savePending}>{copy('History')}</button>
                  </div>
                </div>
              );
              const isLow = (item.reorderLevel || 0) > 0 && item.totalStock <= (item.reorderLevel || 0);
              const averagePrice = item.totalStock > 0 ? item.totalCost / item.totalStock : 0;
              const totalIn = item.stockInHistory?.filter(h => !h.voided).reduce((s, h) => s + (h.quantity || 0), 0) || 0;
              const totalOut = item.usageHistory?.reduce((s, h) => s + (h.quantity || 0), 0) || 0;

              return (
                <div key={item.id} className="glass-card animate-fade-up" style={{
                  background: 'white',
                  padding: '0',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  border: isLow ? '2px solid #e74c3c' : '1px solid var(--border)',
                  boxShadow: isLow ? '0 10px 40px rgba(231, 76, 60, 0.1)' : 'var(--shadow-card)',
                  animationDelay: `${idx * 0.05}s`,
                  transform: 'translateZ(0)',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                }}>
                  <div className={styles.inventoryCardHeader}>
                    <div className={styles.inventoryCardIdentity}>
                      <h3>{item.itemName}</h3>
                      <div className={styles.inventoryCardMeta}>
                        <span>{item.brand || copy('No Brand')}</span>
                        <span className={styles.inventoryCardCategory}>
                          {copy(item.feedType || item.category)}
                        </span>
                      </div>
                    </div>
                    <div className={styles.inventoryCardHeaderActions}>
                      <button
                        type="button"
                        className={styles.inventoryCardHeaderAction}
                        onClick={() => handleOpenModal('history', item, activeTab)} disabled={savePending}
                      >
                        {copy('History')}
                      </button>
                      {canEditInventory && (
                        <button
                          type="button"
                          className={`${styles.inventoryCardHeaderAction} ${styles.inventoryCardDeleteAction}`}
                          onClick={() => handleDeleteItem(item, activeTab)} disabled={savePending}
                        >
                          {copy('Delete')}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className={styles.inventoryMetrics}>
                    <div className={styles.inventoryMetric}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.inventory.stock}</span>
                      <div className={styles.inventoryMetricValue} style={{ color: isLow ? '#e74c3c' : 'var(--text-primary)' }}>
                        {formatQuantity(item.totalStock)}
                        <span className={styles.inventoryMetricUnit}>{item.unit}</span>
                      </div>
                      {isLow && (
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#e74c3c', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertCircle size={12} /> {copy('Low Stock Alert')}
                        </div>
                      )}
                    </div>
                    <div className={styles.inventoryMetric}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.inventory.avgPrice}</span>
                      <span className={styles.inventoryMetricValue}>{Number.isFinite(averagePrice) && averagePrice > 0 ? formatCurrency(averagePrice) : '—'}</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>{copy('per')} {item.unit}</span>
                    </div>
                    <div className={styles.inventoryMetric}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.inventory.value}</span>
                      <span className={styles.inventoryMetricValue}>{formatCurrency(item.totalCost || 0)}</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>{copy('Total Value')}</span>
                    </div>
                  </div>

                  <div className={styles.inventoryCardActivity}>
                    <div>
                      {t.inventory.in}: {formatQuantity(totalIn)} {item.unit}
                    </div>
                    <div>
                      {t.inventory.out}: {formatQuantity(totalOut)} {item.unit}
                    </div>
                  </div>

                  {canEditInventory && (
                    <div className={styles.inventoryCardActions}>
                      <button
                        type="button"
                        className={styles.inventoryCardPrimaryAction}
                        onClick={() => handleOpenModal('stockIn', item, activeTab)} disabled={savePending}
                      >
                        {t.inventory.stockIn}
                      </button>
                      <button
                        type="button"
                        className={styles.inventoryCardSecondaryAction}
                        onClick={() => handleOpenModal('usage', item, activeTab)} disabled={savePending}
                      >
                        {t.inventory.use}
                      </button>
                      <button
                        type="button"
                        className={styles.inventoryCardSecondaryAction}
                        onClick={() => handleOpenModal('editReorder', item, activeTab)} disabled={savePending}
                      >
                        {copy(activeTab === 'additive' ? 'Product' : 'Threshold')}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    )}
  </div></>);
}
