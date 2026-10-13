"use client";
import { usePondDetailActions } from './usePondDetailActions';
import { usePondDetailMetrics } from './usePondDetailMetrics';
import { usePondDetailState } from './usePondDetailState';
export function usePondDetail() {
  const state = usePondDetailState();
  const actions = usePondDetailActions(state);
  const metrics = usePondDetailMetrics(state);
  return { ...state, ...actions, ...metrics };
}
export type PondDetailViewModel = ReturnType<typeof usePondDetail>;
