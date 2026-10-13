"use client";
import {
  Loader2
} from 'lucide-react';
import { useInventoryFeeds } from './useInventoryFeeds';

import { InventoryEntryDialog } from './InventoryEntryDialog';
import { InventoryFeedsStyles } from './InventoryFeedsStyles';
import { InventoryOverview } from './InventoryOverview';
import { InventoryToolbar } from './InventoryToolbar';
export default function InventoryFeedsPage() {
  const model = useInventoryFeeds();
  const { loading } = model;
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <Loader2 className="animate-spin" size={48} color="var(--primary)" />
      </div>
    );
  }
  return (
    <div className="inventory-feeds-page dashboard-page-relaxed authenticated-compact-page business-dashboard-page" style={{ paddingBottom: '32px' }}>
      <InventoryToolbar {...model} />

      {/* Main Content Area */}
      <InventoryOverview {...model} />

      {/* -- MODERNIZED MODALS --------------------------------------------- */}
      <InventoryEntryDialog {...model} />

      <InventoryFeedsStyles />
    </div>
  );
}
