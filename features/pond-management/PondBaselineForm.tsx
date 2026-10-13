import {
  Text,
  View
} from 'react-native';
import AppDatePicker from "../../app/components/forms/AppDatePicker";
import { InputField } from './InputField';
import { styles } from './pondManagementStyles';
import type { PondManagementViewModel } from './usePondManagement';
type Props = Pick<PondManagementViewModel,
  't'
  | 'formData'
  | 'updateForm'>;
export function PondBaselineForm({ t, formData, updateForm }: Props) {
  return (<><>
    <Text style={styles.inputHint}>
      {t.midcycleOnboarding.baselineEditHint}
    </Text>
    <View style={styles.inputContainer}>
      <AppDatePicker
        label={t.midcycleOnboarding.baselineDate}
        value={formData.baselineDate}
        onChange={(date) => updateForm('baselineDate', date)}
        cancelLabel={t.actions.cancel}
        confirmLabel={t.actions.confirm}
      />
    </View>
    <InputField
      label={t.midcycleOnboarding.currentMbw}
      value={formData.baselineMbw}
      onChangeText={(value) => updateForm('baselineMbw', value)}
      placeholder={t.midcycleOnboarding.currentMbwPlaceholder}
      keyboardType="numeric"
    />
    <InputField
      label={t.midcycleOnboarding.currentPopulation}
      value={formData.baselineEstimatedPopulation}
      onChangeText={(value) => updateForm('baselineEstimatedPopulation', value)}
      placeholder={t.midcycleOnboarding.currentPopulationPlaceholder}
      keyboardType="numeric"
    />
    <InputField
      label={t.midcycleOnboarding.survivalRate}
      value={formData.baselineSurvivalRate}
      onChangeText={(value) => updateForm('baselineSurvivalRate', value)}
      placeholder={t.midcycleOnboarding.survivalRatePlaceholder}
      keyboardType="numeric"
    />
    <InputField
      label={t.midcycleOnboarding.feedUsedSoFar}
      value={formData.baselineCumulativeFeed}
      onChangeText={(value) => updateForm('baselineCumulativeFeed', value)}
      placeholder={t.midcycleOnboarding.feedUsedSoFarPlaceholder}
      keyboardType="numeric"
      hint={t.midcycleOnboarding.feedUsedSoFarHint}
    />
  </></>);
}
