"use client";
import {
  Box,
  FlaskConical,
  LayoutDashboard,
  Plus
} from 'lucide-react';
import Link from 'next/link';

import type { InventoryFeedsViewModel } from './useInventoryFeeds';
type Props = Pick<InventoryFeedsViewModel,
  't'
  | 'setActiveTab'
  | 'activeTab'
  | 'savePending'
  | 'setShowArchived'
  | 'showArchived'
  | 'canEditInventory'
  | 'inputMenuRef'
  | 'copy'
  | 'isInputMenuOpen'
  | 'setTransactionFilterOpen'
  | 'setInputMenuOpen'
  | 'handleOpenModal'>;
export function InventoryToolbar({ t, setActiveTab, activeTab, savePending, setShowArchived, showArchived, canEditInventory, inputMenuRef, copy, isInputMenuOpen, setTransactionFilterOpen, setInputMenuOpen, handleOpenModal }: Props) {
  return (<><div className="inventory-primary-toolbar animate-fade-up">
    <div className="inventory-section-tabs">
      {[
        { id: 'dashboard', label: t.inventory.dashboard, icon: LayoutDashboard },
        { id: 'feed', label: t.inventory.feeds, icon: Box },
        { id: 'additive', label: t.inventory.additives, icon: FlaskConical }
      ].map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id as typeof activeTab)}
          className={`inventory-section-tab ${activeTab === tab.id ? 'active' : ''}`} disabled={savePending}
        >
          <tab.icon size={18} style={{ opacity: activeTab === tab.id ? 1 : 0.6 }} />
          {tab.label}
        </button>
      ))}
    </div>

    <button type="button" className="btn-secondary" onClick={() => setShowArchived(value => !value)} disabled={savePending}>{showArchived ? 'Hide archived' : 'Show archived'}</button>
    {canEditInventory && (
      <div className="pond-detail-record-menu inventory-input-menu" ref={inputMenuRef}>
        <button
          type="button"
          className="pond-detail-record-trigger inventory-input-trigger"
          aria-label={copy('Add inventory input')}
          aria-expanded={isInputMenuOpen}
          aria-haspopup="menu"
          onClick={() => {
            setTransactionFilterOpen(false);
            setInputMenuOpen((open) => !open);
          }} disabled={savePending}
        >
          <Plus size={15} />
          <span>{copy('Input')}</span>
        </button>
        {isInputMenuOpen && (
          <div
            role="menu"
            className="pond-detail-record-popover inventory-input-popover"
            style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, bottom: 'auto', left: 'auto', width: 'min(238px, calc(100vw - 24px))' }}
          >
            <Link role="menuitem" href="/dashboard/inventory/treatment-mixes" onClick={() => setInputMenuOpen(false)}>
              <FlaskConical size={16} />
              <span><strong>{copy('Treatment Mixes')}</strong><small>{copy('Create or manage treatment recipes')}</small></span>
            </Link>
            <button type="button" role="menuitem" onClick={() => {
              setInputMenuOpen(false);
              handleOpenModal('add', undefined, 'feed');
            }} disabled={savePending}>
              <Box size={16} />
              <span><strong>{t.inventory.addFeed}</strong><small>{copy('Add feed stock to inventory')}</small></span>
            </button>
            <button type="button" role="menuitem" onClick={() => {
              setInputMenuOpen(false);
              handleOpenModal('add', undefined, 'additive');
            }} disabled={savePending}>
              <FlaskConical size={16} />
              <span><strong>{t.inventory.addAdditive}</strong><small>{copy('Add an inventory additive')}</small></span>
            </button>
          </div>
        )}
      </div>
    )}
  </div></>);
}
