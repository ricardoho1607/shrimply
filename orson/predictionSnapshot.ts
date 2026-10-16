import type { OrsonHarvestProjection } from './types';

export const ORSON_HARVEST_PROJECTION_MODEL_VERSION = 'harvest-projection-v2';

export interface OrsonPredictionSnapshotRequest {
  companyId: string;
  pondId: string;
  cycleId: string | null;
  pondCycleId: string | null;
  targetDate: string;
  daysToHarvest: number;
  modelVersion: string;
  calibrationVersionId: string;
  calibrationScope: OrsonHarvestProjection['calibrationScope'];
  calibrationSampleSize: number;
  confidenceScore: number;
  projected: {
    mbwG: number | null;
    biomassKg: number | null;
    survivalPercent: number | null;
    fcr: number | null;
  };
  learningContext: OrsonHarvestProjection['learningContext'];
  riskIds: string[];
}

const optionalString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

export const buildOrsonPredictionSnapshotRequest = (
  companyId: string,
  pond: Record<string, unknown>,
  projection: OrsonHarvestProjection,
): OrsonPredictionSnapshotRequest => {
  if (!companyId.trim()) throw new Error('companyId is required to record an Orson prediction.');
  if (!projection.pondId) throw new Error('pondId is required to record an Orson prediction.');

  return {
    companyId: companyId.trim(),
    pondId: projection.pondId,
    cycleId: optionalString(pond.cycleId),
    pondCycleId: optionalString(pond.pondCycleId) ?? projection.pondId,
    targetDate: projection.targetDate,
    daysToHarvest: projection.daysToHarvest,
    modelVersion: ORSON_HARVEST_PROJECTION_MODEL_VERSION,
    calibrationVersionId: projection.calibrationVersionId,
    calibrationScope: projection.calibrationScope,
    calibrationSampleSize: projection.calibrationSampleSize,
    confidenceScore: projection.confidenceScore,
    projected: {
      mbwG: projection.projectedMbwG,
      biomassKg: projection.projectedBiomassKg,
      survivalPercent: projection.assumedSurvivalPercent,
      fcr: projection.projectedFcr,
    },
    learningContext: projection.learningContext ? { ...projection.learningContext } : projection.learningContext,
    riskIds: projection.risks ? projection.risks.map((risk) => risk.id).slice(0, 12) : [],
  };
};
