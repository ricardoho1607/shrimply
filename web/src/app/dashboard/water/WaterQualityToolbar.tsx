"use client";
import {
  Plus,
  Search
} from 'lucide-react';

import type { WaterQualityViewModel } from './useWaterQuality';
type Props = Pick<WaterQualityViewModel,
  'copy'
  | 'searchTerm'
  | 'setSearchTerm'
  | 'canEditWater'
  | 'activeView'
  | 'openWaterRecord'
  | 'savePending'
  | 'canManageLabReports'
  | 'setLabActionModalOpen'>;
export function WaterQualityToolbar({ copy, searchTerm, setSearchTerm, canEditWater, activeView, openWaterRecord, savePending, canManageLabReports, setLabActionModalOpen }: Props) {
  return (<><div className="glass-card dashboard-toolbar-card water-toolbar animate-fade-up animate-delay-1">
    <div className="water-search-field">
      <Search size={17} aria-hidden="true" />
      <input
        placeholder={copy('Search ponds or parameters...')}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
    </div>
    {canEditWater && activeView === 'daily' && (
      <button
        onClick={() => {
          openWaterRecord();
        }}
        className="dashboard-action dashboard-action-primary" disabled={savePending}
      >
        <Plus size={18} />
        <span>{copy('New Parameter Log')}</span>
      </button>
    )}
    {canManageLabReports && activeView === 'lab' && (
      <button
        type="button"
        onClick={() => setLabActionModalOpen(true)}
        className="dashboard-action dashboard-action-primary" disabled={savePending}
      >
        <Plus size={18} />
        <span>{copy('Add Lab Report')}</span>
      </button>
    )}
  </div></>);
}
