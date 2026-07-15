import type {
  OrsonCalibrationAdjustment,
  OrsonCalibrationProfile,
  OrsonPondCalibrationAdjustment,
} from './types';

export const ORSON_LEARNING_SCHEMA_VERSION = 1 as const;
export const ORSON_DEFAULT_CALIBRATION_VERSION = 'default-v1';

const LIMITS = {
  adgMultiplier: { min: 0.75, max: 1.25 },
  survivalOffsetPercentagePoints: { min: -8, max: 8 },
  biomassMultiplier: { min: 0.85, max: 1.15 },
};

const finiteNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const normalizeAdjustment = (
  value: unknown,
  fallback: OrsonCalibrationAdjustment,
): OrsonCalibrationAdjustment => {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    adgMultiplier: clamp(
      finiteNumber(source.adgMultiplier) ?? fallback.adgMultiplier,
      LIMITS.adgMultiplier.min,
      LIMITS.adgMultiplier.max,
    ),
    survivalOffsetPercentagePoints: clamp(
      finiteNumber(source.survivalOffsetPercentagePoints) ?? fallback.survivalOffsetPercentagePoints,
      LIMITS.survivalOffsetPercentagePoints.min,
      LIMITS.survivalOffsetPercentagePoints.max,
    ),
    biomassMultiplier: clamp(
      finiteNumber(source.biomassMultiplier) ?? fallback.biomassMultiplier,
      LIMITS.biomassMultiplier.min,
      LIMITS.biomassMultiplier.max,
    ),
    sampleSize: Math.max(0, Math.floor(finiteNumber(source.sampleSize) ?? fallback.sampleSize)),
  };
};

export const createDefaultOrsonCalibration = (): OrsonCalibrationProfile => ({
  schemaVersion: ORSON_LEARNING_SCHEMA_VERSION,
  versionNumber: 0,
  versionId: ORSON_DEFAULT_CALIBRATION_VERSION,
  status: 'default',
  companyAdjustment: {
    adgMultiplier: 1,
    survivalOffsetPercentagePoints: 0,
    biomassMultiplier: 1,
    sampleSize: 0,
  },
  pondAdjustments: [],
  eligibleOutcomeCount: 0,
  trainingOutcomeCount: 0,
  validationOutcomeCount: 0,
  previousScore: null,
  validationScore: null,
});

export const normalizePondNameKey = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toLowerCase().replace(/\s+/g, ' ') : '';

export const normalizeOrsonCalibration = (value: unknown): OrsonCalibrationProfile => {
  const fallback = createDefaultOrsonCalibration();
  if (!value || typeof value !== 'object') return fallback;

  const source = value as Record<string, unknown>;
  const companyAdjustment = normalizeAdjustment(source.companyAdjustment, fallback.companyAdjustment);
  const rawPondAdjustments = Array.isArray(source.pondAdjustments) ? source.pondAdjustments : [];
  const pondAdjustments: OrsonPondCalibrationAdjustment[] = rawPondAdjustments
    .map((item): OrsonPondCalibrationAdjustment | null => {
      if (!item || typeof item !== 'object') return null;
      const raw = item as Record<string, unknown>;
      const pondName = typeof raw.pondName === 'string' ? raw.pondName.trim().slice(0, 120) : '';
      const pondNameKey = normalizePondNameKey(raw.pondNameKey || pondName);
      if (!pondNameKey) return null;
      return {
        pondName,
        pondNameKey,
        ...normalizeAdjustment(raw, companyAdjustment),
      };
    })
    .filter((item): item is OrsonPondCalibrationAdjustment => item !== null)
    .slice(0, 200);

  const versionNumber = Math.max(0, Math.floor(finiteNumber(source.versionNumber) ?? 0));
  const versionId = typeof source.versionId === 'string' && source.versionId.trim()
    ? source.versionId.trim().slice(0, 80)
    : versionNumber > 0 ? `v${versionNumber}` : ORSON_DEFAULT_CALIBRATION_VERSION;

  return {
    schemaVersion: ORSON_LEARNING_SCHEMA_VERSION,
    versionNumber,
    versionId,
    status: versionNumber > 0 && source.status === 'active' ? 'active' : 'default',
    companyAdjustment,
    pondAdjustments,
    eligibleOutcomeCount: Math.max(0, Math.floor(finiteNumber(source.eligibleOutcomeCount) ?? companyAdjustment.sampleSize)),
    trainingOutcomeCount: Math.max(0, Math.floor(finiteNumber(source.trainingOutcomeCount) ?? 0)),
    validationOutcomeCount: Math.max(0, Math.floor(finiteNumber(source.validationOutcomeCount) ?? 0)),
    previousScore: finiteNumber(source.previousScore),
    validationScore: finiteNumber(source.validationScore),
    updatedAt: source.updatedAt,
  };
};

export const getOrsonCalibrationAdjustment = (
  profileValue: OrsonCalibrationProfile | null | undefined,
  pondName: string,
): {
  adjustment: OrsonCalibrationAdjustment;
  scope: 'default' | 'company' | 'pond';
  versionId: string;
} => {
  const profile = normalizeOrsonCalibration(profileValue);
  const pondNameKey = normalizePondNameKey(pondName);
  const pondAdjustment = profile.pondAdjustments.find((item) => item.pondNameKey === pondNameKey);

  if (pondAdjustment && pondAdjustment.sampleSize > 0) {
    return { adjustment: pondAdjustment, scope: 'pond', versionId: profile.versionId };
  }
  if (profile.status === 'active' && profile.companyAdjustment.sampleSize > 0) {
    return { adjustment: profile.companyAdjustment, scope: 'company', versionId: profile.versionId };
  }
  return { adjustment: createDefaultOrsonCalibration().companyAdjustment, scope: 'default', versionId: profile.versionId };
};
