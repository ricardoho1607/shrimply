"use client";

import { useInventoryFeedsActions } from './useInventoryFeedsActions';
import { useInventoryFeedsState } from './useInventoryFeedsState';
export function useInventoryFeeds() {
  const state = useInventoryFeedsState();
  const actions = useInventoryFeedsActions(state);
  return { ...state, ...actions };
}
export type InventoryFeedsViewModel = ReturnType<typeof useInventoryFeeds>;
