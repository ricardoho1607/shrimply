import { type LabMeasurementUnits } from "../../../../../functions/shared/labMeasurementContract";
import type { PlanktonOverwatchSnapshot } from "../../../../../shared/planktonOverwatch";
export interface Sampling {
  observedAtByField?: Record<string, string>;
  ammoniaBasis?: string;
  id: string; date: string; mbw: number; mortality: number; feed: number;
  cycleId?: string; cycleName?: string; pondCycleId?: string;
  isBaselineEstimate?: boolean; source?: string;
  feedData?: { totalDailyFeed?: number | string | null } | null; harvestData?: unknown;
  phMorning?: string; phEvening?: string; doMorning?: string; doEvening?: string;
  transparencyMorning?: string; transparencyEvening?: string; transparency?: string;
  salinity?: string;
  temperatureMorning?: string; temperatureEvening?: string; temperature?: string;
  waterAppearanceMorning?: string; waterAppearanceEvening?: string; waterAppearance?: string;
  waterDepthCmMorning?: string; waterDepthCmEvening?: string; waterDepthCm?: string;
  alkalinity?: string;
  waterQualityRecordedByName?: string;
  ammonia?: string;
  operationalNotes?: string;
  weatherEvent?: 'rain' | 'heavy_rain' | 'sudden_cloud' | null;
  waterExchangePercent?: string;
  sludgeLoad?: 'low' | 'moderate' | 'high' | null;
  surfaceScum?: boolean | null;
  shrimpBehaviour?: 'normal' | 'abnormal' | null;
}

export interface Pond {
  id: string; pondName: string; supplier: string; samplings: Sampling[];
  blockId?: string;
  blockName?: string;
  latestLabStatus?: LabStatus;
  latestPlanktonOverwatch?: PlanktonOverwatchSnapshot;
  cycleId?: string; cycleName?: string; pondCycleId?: string;
  cycleStatus?: 'active' | 'ended';
  createdAt?: { toDate?: () => Date; seconds?: number };
  updatedAt?: { toDate?: () => Date; seconds?: number };
}

export type WaterPageView = 'daily' | 'lab';

export type LabReportType = 'water_quality' | 'plankton' | 'combined';

export type LabSeverity = 'good' | 'watch' | 'warning' | 'critical';

export type LabEntryMode = 'manual' | 'pdf_upload';

export type LabPdfUsageType = 'water_quality' | 'plankton';

export const getLabReportTypeLabel = (reportType: LabReportType | undefined, copy: (text: string) => string) => {
  if (reportType === 'plankton') return copy('Plankton Quality');
  if (reportType === 'combined') return copy('Combined Lab Report');
  return copy('Mineral Quality');
};

export interface LabStatus {
  labReportId?: string;
  sampleDate?: string;
  status?: LabSeverity;
  mainIssue?: string;
  keyRisks?: string[];
  recommendations?: string[];
  updatedAt?: { toDate?: () => Date; seconds?: number };
}

export interface LabPondResult {
  measurementUnits?: LabMeasurementUnits;
  pondId: string;
  pondCode: string;
  doc?: string;
  transparencyCm?: string;
  waterQuality?: {
    phCustomer?: string;
    phLab?: string;
    salinityCustomer?: string;
    salinityLab?: string;
    tan?: string;
    nh3?: string;
    nh4?: string;
    no2?: string;
    phosphate?: string;
    alkalinityTotal?: string;
    tom?: string;
    hardnessCa?: string;
    hardnessMg?: string;
    hardnessTotal?: string;
  };
  microbiology?: {
    vibrioYellow?: string;
    vibrioGreen?: string;
    vibrioTotal?: string;
    tbc?: string;
    tvcTbcRatioPercent?: string;
  };
  plankton?: {
    totalCellPerMl?: string;
    beneficialCellPerMl?: string;
    harmfulCellPerMl?: string;
    chlorophytaCellPerMl?: string;
    chlorophytaPercent?: string;
    chlorophytaSpecies?: string;
    cyanophytaCellPerMl?: string;
    cyanophytaPercent?: string;
    cyanophytaSpecies?: string;
    diatomCellPerMl?: string;
    diatomPercent?: string;
    diatomSpecies?: string;
    chrysophytaCellPerMl?: string;
    chrysophytaPercent?: string;
    chrysophytaSpecies?: string;
    dinoflagellataCellPerMl?: string;
    dinoflagellataPercent?: string;
    dinoflagellataSpecies?: string;
    protozoaCellPerMl?: string;
    protozoaPercent?: string;
    protozoaSpecies?: string;
  };
}

export interface LabReport {
  id: string;
  reportType?: LabReportType;
  entryMode?: LabEntryMode;
  status?: 'draft' | 'extracted' | 'confirmed' | 'failed';
  sampleDate?: string;
  labName?: string;
  farmName?: string;
  sourcePdfUrl?: string;
  sourcePdfPath?: string;
  originalFileName?: string;
  sourceFileHash?: string;
  pondResults?: LabPondResult[];
  extraction?: {
    status?: 'not_required' | 'pending' | 'complete' | 'failed';
    model?: string;
    sourceHash?: string;
    confidence?: number;
    warnings?: string[];
    error?: string;
    extractedAt?: { toDate?: () => Date; seconds?: number };
  };
  processing?: {
    status?: 'pending' | 'complete' | 'failed';
    processedAt?: { toDate?: () => Date; seconds?: number };
    error?: string;
  };
  summary?: {
    overallStatus?: LabSeverity;
    warningCount?: number;
    criticalCount?: number;
  };
  insights?: {
    status?: 'pending' | 'complete' | 'failed';
    ownerSummary?: string;
    generatedBy?: string;
  };
  createdAt?: { toDate?: () => Date; seconds?: number };
}

export type LabPdfUsage = Partial<Record<LabPdfUsageType, {
  status?: 'idle' | 'pending' | 'cooldown';
  resetAt?: unknown;
  startedAt?: unknown;
}>>;

export const LAB_PDF_PENDING_MS = 10 * 60 * 1000;

export const hasSavedValue = (value: unknown): boolean => value !== null && value !== undefined && value !== '';

export const hasWaterQualityHistory = (sampling: Sampling): boolean => Boolean(
  hasSavedValue(sampling.phMorning) || hasSavedValue(sampling.phEvening) ||
  hasSavedValue(sampling.doMorning) || hasSavedValue(sampling.doEvening) ||
  hasSavedValue(sampling.transparencyMorning) || hasSavedValue(sampling.transparencyEvening) || hasSavedValue(sampling.transparency) ||
  hasSavedValue(sampling.salinity) ||
  hasSavedValue(sampling.temperatureMorning) || hasSavedValue(sampling.temperatureEvening) || hasSavedValue(sampling.temperature) ||
  hasSavedValue(sampling.waterAppearanceMorning) || hasSavedValue(sampling.waterAppearanceEvening) || hasSavedValue(sampling.waterAppearance) ||
  hasSavedValue(sampling.waterDepthCmMorning) || hasSavedValue(sampling.waterDepthCmEvening) || hasSavedValue(sampling.waterDepthCm) ||
  hasSavedValue(sampling.alkalinity) ||
  hasSavedValue(sampling.ammonia) ||
  hasSavedValue(sampling.weatherEvent) || hasSavedValue(sampling.operationalNotes) ||
  hasSavedValue(sampling.waterExchangePercent) || hasSavedValue(sampling.sludgeLoad) ||
  sampling.surfaceScum !== null && sampling.surfaceScum !== undefined ||
  hasSavedValue(sampling.shrimpBehaviour)
);

export const formatConditionLabel = (value: string | null | undefined): string => value
  ? value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase())
  : 'N/A';
