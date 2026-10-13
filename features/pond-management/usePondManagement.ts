import { usePondManagementBaselineActions } from './usePondManagementBaselineActions';
import { usePondManagementEnterpriseActions } from './usePondManagementEnterpriseActions';
import { usePondManagementPondActions } from './usePondManagementPondActions';
import { usePondManagementState } from './usePondManagementState';
export function usePondManagement() {
  const state = usePondManagementState();
  const pondActions = usePondManagementPondActions(state);
  const enterpriseActions = usePondManagementEnterpriseActions({ ...state, createPhysicalPondOnServer: pondActions.createPhysicalPondOnServer });
  const baselineActions = usePondManagementBaselineActions(state);
  return { ...state, ...pondActions, ...enterpriseActions, ...baselineActions };
}
export type PondManagementViewModel = ReturnType<typeof usePondManagement>;
