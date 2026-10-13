"use client";

import { useWaterQualityActions } from './useWaterQualityActions';
import { useWaterQualityState } from './useWaterQualityState';
export function useWaterQuality() {
  const state = useWaterQualityState();
  const actions = useWaterQualityActions(state);
  return { ...state, ...actions };
}
export type WaterQualityViewModel = ReturnType<typeof useWaterQuality>;
