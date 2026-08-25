import type { OrsonCalibrationProfile } from './types';

const CALIBRATION_CACHE_MS = 5 * 60 * 1000;
const calibrationCache = new Map<string, {
  value: OrsonCalibrationProfile | null;
  expiresAt: number;
}>();

export const loadCachedOrsonCalibration = async (
  companyId: string,
  loader: () => Promise<OrsonCalibrationProfile | null>,
  now = Date.now(),
): Promise<OrsonCalibrationProfile | null> => {
  const cached = calibrationCache.get(companyId);
  if (cached && cached.expiresAt > now) return cached.value;
  const value = await loader();
  calibrationCache.set(companyId, { value, expiresAt: now + CALIBRATION_CACHE_MS });
  return value;
};
