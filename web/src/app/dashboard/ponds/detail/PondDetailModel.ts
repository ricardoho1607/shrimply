import React from 'react';
import { type HarvestType } from "../../../../../../shared/harvestCalculations";
import type { PlanktonOverwatchSnapshot } from "../../../../../../shared/planktonOverwatch";
import {
  type MortalityObservationType,
  type SharedMortalityRecord
} from "../../../../../../shared/pondCalculations";
import type { PondDetailCopy } from "../../../../../../shared/pondDetailI18n";
export interface FeedData {
  totalDailyFeed: string | number;
  inventoryFeedId?: string | null;
  cycleId?: string;
  cycleName?: string;
  pondCycleId?: string;
}

export interface Sampling {
  id: string;
  date: string;
  mbw: number;
  mortality: number;
  feed?: number;
  cycleId?: string;
  cycleName?: string;
  pondCycleId?: string;
  phMorning?: string;
  phEvening?: string;
  doMorning?: string;
  doEvening?: string;
  transparency?: string;
  salinity?: string;
  temp?: string;
  feedData?: FeedData;
  isBaselineEstimate?: boolean;
  source?: string;
  estimatedPopulation?: number;
  estimatedSurvivalRate?: number;
  cumulativeFeedToDate?: number;
}

export interface HarvestRecord {
  id: string;
  cycleId?: string;
  ponds: {
    pondId: string;
    pondCycleId?: string;
    cycleId?: string;
    harvestType?: HarvestType;
  }[];
}

export type LabReportStatus = {
  labReportId?: string;
  reportType?: 'water_quality' | 'plankton' | 'combined';
  sampleDate?: string;
  status?: 'good' | 'info' | 'watch' | 'warning' | 'critical';
  mainIssue?: string;
  keyRisks?: string[];
  recommendations?: string[];
};

export interface Pond {
  physicalPondId?: string;
  id: string; pondName: string; pondArea: number; density: number; initialPopulation: number;
  blockId?: string;
  blockName?: string;
  docStart: string; supplier: string; plSupplier?: string; initialWeight: number; samplings: Sampling[];
  mortalityRecords?: SharedMortalityRecord[];
  latestLabStatus?: LabReportStatus & {
    byType?: {
      water_quality?: LabReportStatus;
      plankton?: LabReportStatus;
    };
  };
  latestPlanktonOverwatch?: PlanktonOverwatchSnapshot;
  cycleId?: string;
  cycleName?: string;
  pondCycleId?: string;
  cycleStatus?: 'active' | 'ended';
  cycleStartedAt?: string;
  cycleEndedAt?: string;
  cycleEndedBy?: string;
  cycleEndReason?: 'harvested' | 'disease' | 'reset' | 'other';
  previousCyclePondId?: string;
  cycleStartMode?: 'new' | 'midcycle';
  baselineDate?: string;
  baselineDoc?: number;
  baselineMbw?: number;
  baselineEstimatedPopulation?: number;
  baselineSurvivalRate?: number;
  baselineCumulativeFeed?: number;
  baselineSource?: string;
}

export interface FarmCycle {
  id: string;
  cycleName: string;
  status: 'planning' | 'stocking' | 'active' | 'closing' | 'closed';
  plannedStartDate?: string;
  stockingStartDate?: string;
}

export interface MortalityFormState {
  date: string;
  observationType: MortalityObservationType;
  count: string;
  siponShift: 'morning' | 'evening';
  siphonedCount: string;
  mortalCount: string;
  notes: string;
}

export const getCycleStatus = (pond: Pond) => pond.cycleStatus === 'ended' ? 'ended' : 'active';

export const isActiveCycle = (pond: Pond) => getCycleStatus(pond) === 'active';

export const getPlSupplier = (pond: Pond) => pond.plSupplier || pond.supplier || 'N/A';

export const isOpenFarmCycle = (cycle: FarmCycle) => ['planning', 'stocking', 'active'].includes(cycle.status);

export const getPhysicalPondKey = (pondName: string) => pondName.trim().toLowerCase();

export const getLabStatusStyle = (status: LabReportStatus['status'] | undefined, copy: PondDetailCopy) => {
  if (status === 'critical') return { label: copy.critical, color: '#991b1b', bg: '#fee2e2' };
  if (status === 'warning') return { label: copy.warning, color: '#92400e', bg: '#fef3c7' };
  if (status === 'watch') return { label: copy.watch, color: '#0F4C75', bg: '#E0F2FE' };
  return { label: copy.good, color: '#166534', bg: '#DCFCE7' };
};

export const DAY_MS = 24 * 60 * 60 * 1000;

export const getDateOnlyUtcTime = (dateString: string): number => {
  const [year, month, day] = dateString.split('-').map(Number);
  return Date.UTC(year, (month || 1) - 1, day || 1);
};

export const calculateDocFromDates = (startDate: string, baselineDate: string): number =>
  Math.floor((getDateOnlyUtcTime(baselineDate) - getDateOnlyUtcTime(startDate)) / DAY_MS);

export type SamplingForm = { date: string; mbw: string; feed: string; mortality: string };

export interface MortalityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  form: MortalityFormState;
  setForm: React.Dispatch<React.SetStateAction<MortalityFormState>>;
  isSubmitting: boolean;
  isEditing?: boolean;
}
