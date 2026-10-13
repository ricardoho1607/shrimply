"use client";
import {
  Loader2
} from 'lucide-react';
import { EndPondCycleDialog } from './EndPondCycleDialog';
import { MortalityModal } from './MortalityModal';
import { PondBaselineDialog } from './PondBaselineDialog';
import { PondDetailsSidebar } from './PondDetailsSidebar';
import { PondDetailStyles } from './PondDetailStyles';
import { PondDetailToolbar } from './PondDetailToolbar';
import { PondFeedInsight } from './PondFeedInsight';
import { PondHistoryPanels } from './PondHistoryPanels';
import { PondMetricSummary } from './PondMetricSummary';
import { SamplingModal } from './SamplingModal';
import { StartPondCycleDialog } from './StartPondCycleDialog';
import { usePondDetail } from './usePondDetail';
export default function PondDetailClient() {
  const model = usePondDetail();
  const { save, copy, pond, loading, isSamplingModalOpen, setSamplingModalOpen, isMortalityModalOpen, setMortalityModalOpen, isSubmitting, samplingForm, setSamplingForm, editingSamplingId, setEditingSamplingId, editingMortalityId, setEditingMortalityId, mortalityForm, setMortalityForm, blocksLoading, isEnterpriseTechnician, hasPondAccess, handleSaveSampling, handleSaveMortality } = model;
  if (loading || (isEnterpriseTechnician && blocksLoading)) return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><Loader2 className="animate-spin" size={40} color="var(--primary)" /></div>;
  if (!pond || !hasPondAccess) return <div style={{ padding: '40px', textAlign: 'center' }}>{copy.notFound}</div>;
  return (
    <div className="pond-detail-page dashboard-page" style={{ maxWidth: '1200px', margin: '0 auto' }}>

      {/* Breadcrumbs & Actions */}
      <PondDetailToolbar {...model} pond={pond} />

      {/* Hero Stats */}
      <PondMetricSummary {...model} />

      <PondFeedInsight {...model} />

      <div className="pond-detail-content-grid">

        {/* Left Content */}
        <PondHistoryPanels {...model} pond={pond} />

        {/* Right Sidebar */}
        <PondDetailsSidebar {...model} pond={pond} />

      </div>

      <EndPondCycleDialog {...model} pond={pond} />

      <PondBaselineDialog {...model} />

      <StartPondCycleDialog {...model} pond={pond} />

      <SamplingModal
        isOpen={isSamplingModalOpen}
        onClose={() => {
          if (save.busy) return;
          setSamplingModalOpen(false);
          setEditingSamplingId(null);
        }}
        onSubmit={handleSaveSampling}
        form={samplingForm}
        setForm={setSamplingForm}
        isSubmitting={isSubmitting}
        isEditing={Boolean(editingSamplingId)}
      />
      <MortalityModal
        isOpen={isMortalityModalOpen}
        onClose={() => {
          if (save.busy) return;
          setMortalityModalOpen(false);
          setEditingMortalityId(null);
        }}
        onSubmit={handleSaveMortality}
        form={mortalityForm}
        setForm={setMortalityForm}
        isSubmitting={isSubmitting}
        isEditing={Boolean(editingMortalityId)}
      />

      <PondDetailStyles />
    </div>
  );
}
