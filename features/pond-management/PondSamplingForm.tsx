import {
  ScrollView,
  Text,
  TouchableOpacity, View
} from 'react-native';
import AppDatePicker from "../../app/components/forms/AppDatePicker";
import { InputField } from './InputField';
import { styles } from './pondManagementStyles';
import type { PondManagementViewModel } from './usePondManagement';
type Props = Pick<PondManagementViewModel,
  't'
  | 'activePonds'
  | 'formData'
  | 'updateForm'>;
export function PondSamplingForm({ t, activePonds, formData, updateForm }: Props) {
  return (<><>
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{t.forms.selectPond}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pondSelector}
      >
        {activePonds.map(pond => (
          <TouchableOpacity
            key={pond.id}
            style={[
              styles.pondOption,
              formData.selectedPond === pond.pondName &&
              styles.pondOptionSelected
            ]}
            onPress={() => updateForm('selectedPond', pond.pondName)}
          >
            <Text style={[
              styles.pondOptionText,
              formData.selectedPond === pond.pondName &&
              styles.pondOptionTextSelected
            ]}>
              {pond.pondName}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
    <InputField
      label={t.shrimp.meanBodyWeight}
      value={formData.mbw}
      onChangeText={(value) => updateForm('mbw', value)}
      placeholder={t.home.mbwHint}
      keyboardType="numeric"
    />
    <InputField
      label={t.shrimp.feedAmount}
      value={formData.feed}
      onChangeText={(value) => updateForm('feed', value)}
      placeholder={t.home.feedHint}
      keyboardType="numeric"
    />
    <View style={styles.inputContainer}>
      <AppDatePicker
        label={t.forms.samplingDate}
        value={formData.samplingDate}
        onChange={(date) => updateForm('samplingDate', date)}
        cancelLabel={t.actions.cancel}
        confirmLabel={t.actions.confirm}
      />
    </View>
  </></>);
}
