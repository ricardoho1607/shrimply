import {
  createDefaultOrsonCalibration,
  getOrsonCalibrationAdjustment,
  normalizeOrsonCalibration,
} from './learning';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

export const runLearningSelfTest = () => {
  const fallback = normalizeOrsonCalibration(null);
  assert(fallback.versionId === 'default-v1', 'uses default calibration when company memory is missing');

  const profile = normalizeOrsonCalibration({
    ...createDefaultOrsonCalibration(),
    versionNumber: 3,
    versionId: 'v3-test',
    status: 'active',
    companyAdjustment: {
      adgMultiplier: 0.94,
      survivalOffsetPercentagePoints: -2,
      biomassMultiplier: 0.96,
      sampleSize: 40,
    },
    pondAdjustments: [{
      pondName: 'A1',
      pondNameKey: 'a1',
      adgMultiplier: 0.9,
      survivalOffsetPercentagePoints: -3,
      biomassMultiplier: 0.93,
      sampleSize: 8,
    }],
  });

  const pond = getOrsonCalibrationAdjustment(profile, ' A1 ');
  const company = getOrsonCalibrationAdjustment(profile, 'B2');
  assert(pond.scope === 'pond' && pond.adjustment.sampleSize === 8, 'uses pond calibration when enough pond history exists');
  assert(company.scope === 'company' && company.adjustment.sampleSize === 40, 'falls back to company calibration for other ponds');

  const clamped = normalizeOrsonCalibration({
    ...profile,
    companyAdjustment: {
      adgMultiplier: 9,
      survivalOffsetPercentagePoints: -99,
      biomassMultiplier: 0.1,
      sampleSize: 2,
    },
  });
  assert(clamped.companyAdjustment.adgMultiplier === 1.25, 'clamps unsafe ADG calibration');
  assert(clamped.companyAdjustment.survivalOffsetPercentagePoints === -8, 'clamps unsafe survival calibration');
  assert(clamped.companyAdjustment.biomassMultiplier === 0.85, 'clamps unsafe biomass calibration');
};
