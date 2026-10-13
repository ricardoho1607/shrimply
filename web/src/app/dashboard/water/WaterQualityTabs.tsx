"use client";
import {
  Droplets,
  FileText,
  type LucideIcon
} from 'lucide-react';
import { WaterPageView } from './WaterQualityModel';

import type { WaterQualityViewModel } from './useWaterQuality';
type Props = Pick<WaterQualityViewModel,
  'copy'
  | 'activeView'
  | 'setActiveView'
  | 'savePending'>;
export function WaterQualityTabs({ copy, activeView, setActiveView, savePending }: Props) {
  return (<><div className="water-view-tabs animate-fade-up" role="tablist" aria-label={copy('Water quality view')}>
    {([
      { id: 'daily', label: 'Daily Log', icon: Droplets },
      { id: 'lab', label: 'Lab Reports', icon: FileText },
    ] as { id: WaterPageView; label: string; icon: LucideIcon }[]).map(item => {
      const Icon = item.icon;
      const active = activeView === item.id;
      return (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => setActiveView(item.id)}
          className={active ? 'is-active' : ''} disabled={savePending}
        >
          <Icon size={15} />
          {copy(item.label)}
        </button>
      );
    })}
  </div></>);
}
