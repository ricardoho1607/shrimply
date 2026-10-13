import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ScrollView,
  Text,
  TouchableOpacity, View
} from 'react-native';
import AppDatePicker from "../../app/components/forms/AppDatePicker";
import { type MortalityObservationType } from "../../app/store/pondStore";
import { InputField } from './InputField';
import { styles } from './pondManagementStyles';
import type { PondManagementViewModel } from './usePondManagement';
type Props = Pick<PondManagementViewModel,
  't'
  | 'formData'
  | 'activePonds'
  | 'updateForm'>;
export function PondMortalityForm({ t, formData, activePonds, updateForm }: Props) {
  const observationOptions: { value: MortalityObservationType; label: string }[] = [
    { value: 'estimated_total', label: t.home.mortalityEstimatedTotal },
    { value: 'observed_recovered', label: t.home.mortalityObservedRecovered },
    { value: 'none_observed', label: t.home.mortalityNoneObserved },
  ];
  const observationHint = formData.mortalityObservationType === 'estimated_total'
    ? t.home.mortalityEstimatedHint
    : formData.mortalityObservationType === 'observed_recovered'
      ? t.home.mortalityObservedHint
      : t.home.mortalityNoneHint;

  return (
    <>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{t.forms.selectPond}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pondSelector}>
          {activePonds.map((pond) => (
            <TouchableOpacity
              key={pond.id}
              style={[
                styles.pondOption,
                formData.selectedPond === pond.pondName && styles.pondOptionSelected,
              ]}
              onPress={() => updateForm('selectedPond', pond.pondName)}
            >
              <Text style={[
                styles.pondOptionText,
                formData.selectedPond === pond.pondName && styles.pondOptionTextSelected,
              ]}>
                {pond.pondName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{t.home.mortalityObservationType}</Text>
        <View style={styles.mortalityOptionList}>
          {observationOptions.map((option) => {
            const selected = formData.mortalityObservationType === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.mortalityOption, selected && styles.mortalityOptionSelected]}
                onPress={() => updateForm('mortalityObservationType', option.value)}
              >
                <Ionicons
                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={selected ? '#FFFFFF' : '#315f57'}
                />
                <Text style={[styles.mortalityOptionText, selected && styles.mortalityOptionTextSelected]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.inputHint}>{observationHint}</Text>
      </View>

      {formData.mortalityObservationType === 'estimated_total' && (
        <InputField
          label={t.home.mortalityCount}
          value={formData.mortalityCount}
          onChangeText={(value) => updateForm('mortalityCount', value)}
          placeholder={t.home.mortalityHint}
          keyboardType="numeric"
          hint={t.home.mortalityCountHint}
          maxLength={12}
        />
      )}

      {formData.mortalityObservationType === 'observed_recovered' && (
        <>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t.dailyOperationsReports.siponShift}</Text>
            <View style={styles.segmentRow}>
              {(['morning', 'evening'] as const).map((shift) => (
                <TouchableOpacity
                  key={shift}
                  style={[styles.segmentOption, formData.siponShift === shift && styles.segmentOptionSelected]}
                  onPress={() => updateForm('siponShift', shift)}
                >
                  <Text style={[styles.segmentOptionText, formData.siponShift === shift && styles.segmentOptionTextSelected]}>
                    {shift === 'morning' ? t.dailyOperationsReports.morning : t.dailyOperationsReports.evening}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <InputField label={t.dailyOperationsReports.siphoned} value={formData.siphonedCount} onChangeText={(value) => updateForm('siphonedCount', value)} placeholder="0" keyboardType="numeric" maxLength={12} />
            </View>
            <View style={styles.inputGroup}>
              <InputField label={t.dailyOperationsReports.mortal} value={formData.mortalCount} onChangeText={(value) => updateForm('mortalCount', value)} placeholder="0" keyboardType="numeric" maxLength={12} />
            </View>
          </View>
        </>
      )}

      <View style={styles.inputContainer}>
        <AppDatePicker
          label={t.home.mortalityDate}
          value={formData.mortalityDate}
          onChange={(date) => updateForm('mortalityDate', date)}
          cancelLabel={t.actions.cancel}
          confirmLabel={t.actions.confirm}
        />
      </View>

      <InputField
        label={t.home.mortalityNotes}
        value={formData.mortalityNotes}
        onChangeText={(value) => updateForm('mortalityNotes', value)}
        placeholder={t.home.mortalityNotesHint}
        maxLength={500}
      />
    </>
  );
}
