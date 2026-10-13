"use client";
import { useCompanyId } from '@/hooks/useDashboardData';

import { LabReportActionsDialog } from './LabReportActionsDialog';
import { LabReportDialog } from './LabReportDialog';
import { useWaterQuality } from './useWaterQuality';
import { WaterHistoryDrawer } from './WaterHistoryDrawer';
import { WaterQualityOverview } from './WaterQualityOverview';
import { WaterQualityStyles } from './WaterQualityStyles';
import { WaterQualityTabs } from './WaterQualityTabs';
import { WaterQualityToolbar } from './WaterQualityToolbar';
import { WaterReadingDialog } from './WaterReadingDialog';
export default function WaterQualityPage() {
  const { scope } = useCompanyId();
  return <WaterQualityContent key={scope || 'signed-out'} />;
}

function WaterQualityContent() {
  const model = useWaterQuality();

  return (
    <div className="dashboard-page water-quality-page">
      <WaterQualityTabs {...model} />

      {/* Toolbar */}
      <WaterQualityToolbar {...model} />

      {/* Daily Pond Grid */}
      <WaterQualityOverview {...model} />

      {/* -- HISTORY DRAWER ------------------------------ */}
      <WaterHistoryDrawer {...model} />

      {/* -- LAB REPORT ACTION MODAL --------------------- */}
      <LabReportActionsDialog {...model} />

      {/* -- LAB REPORT MODAL --------------------------------- */}
      <LabReportDialog {...model} />

      {/* -- LOG MODAL ------------------------------------------ */}
      <WaterReadingDialog {...model} />

      <WaterQualityStyles />
    </div>
  );
}
