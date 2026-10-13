import {
  Text,
  TouchableOpacity, View
} from 'react-native';
import { styles } from './pondManagementStyles';
import type { PondManagementViewModel } from './usePondManagement';
type Props = Pick<PondManagementViewModel,
  'isEnterpriseFarm'
  | 'canManageEnterpriseBlocks'
  | 'dashboardMode'
  | 'setDashboardMode'
  | 't'>;
export function PondDashboardModeSwitch({ isEnterpriseFarm, canManageEnterpriseBlocks, dashboardMode, setDashboardMode, t }: Props) {
  return (<>{isEnterpriseFarm && canManageEnterpriseBlocks ? (
    <View style={styles.dashboardModeSwitch} accessibilityRole="tablist">
      {(['enterprise', 'normal'] as const).map((mode) => {
        const selected = dashboardMode === mode;
        return (
          <TouchableOpacity
            key={mode}
            style={[styles.dashboardModeOption, selected && styles.dashboardModeOptionSelected]}
            onPress={() => setDashboardMode(mode)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.dashboardModeText, selected && styles.dashboardModeTextSelected]}>
              {mode === 'enterprise' ? t.enterpriseCycle.enterpriseView : t.enterpriseCycle.normalView}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  ) : null}</>);
}
