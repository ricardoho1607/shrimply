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
  | 'startablePondOptions'
  | 'formData'
  | 'updateForm'
  | 'openAccessibleFarmCycles'
  | 'isEnterpriseFarm'
  | 'activeFarmCycle'
  | 'cycles'>;
export function PondCycleForm({ t, startablePondOptions, formData, updateForm, openAccessibleFarmCycles, isEnterpriseFarm, activeFarmCycle, cycles }: Props) {
  return (<><>
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{t.farmCycle.existingPond}</Text>
      {startablePondOptions.length === 0 ? (
        <Text style={styles.inputHint}>
          Add a pond placeholder first, or end an active pond cycle before starting another cycle.
        </Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pondSelector}
        >
          {startablePondOptions.map(pond => (
            <TouchableOpacity
              key={pond.id}
              style={[
                styles.pondOption,
                formData.cyclePondId === pond.id && styles.pondOptionSelected
              ]}
              onPress={() => updateForm('cyclePondId', pond.id)}
            >
              <Text style={[
                styles.pondOptionText,
                formData.cyclePondId === pond.id && styles.pondOptionTextSelected
              ]}>
                {pond.pondName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
    {openAccessibleFarmCycles.length > 0 && !isEnterpriseFarm && (
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{t.farmCycle.targetCycle}</Text>
        <View style={styles.segmentRow}>
          {(['existing', 'new'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.segmentOption,
                formData.cycleTargetMode === mode && styles.segmentOptionSelected
              ]}
              onPress={() => updateForm('cycleTargetMode', mode)}
            >
              <Text style={[
                styles.segmentOptionText,
                formData.cycleTargetMode === mode && styles.segmentOptionTextSelected
              ]}>
                {mode === 'existing' ? t.farmCycle.addToActiveCycle : t.farmCycle.createNewCycle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    )}

    {formData.cycleTargetMode === 'existing' && openAccessibleFarmCycles.length > 0 && !isEnterpriseFarm ? (
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{t.farmCycle.cycleName}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pondSelector}
        >
          {openAccessibleFarmCycles.map((cycle) => (
            <TouchableOpacity
              key={cycle.id}
              style={[
                styles.pondOption,
                (formData.cycleId === cycle.id || (!formData.cycleId && activeFarmCycle?.id === cycle.id)) && styles.pondOptionSelected
              ]}
              onPress={() => updateForm('cycleId', cycle.id)}
            >
              <Text style={[
                styles.pondOptionText,
                (formData.cycleId === cycle.id || (!formData.cycleId && activeFarmCycle?.id === cycle.id)) && styles.pondOptionTextSelected
              ]}>
                {cycle.cycleName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    ) : !isEnterpriseFarm ? (
      <InputField
        label={t.farmCycle.newCycleName}
        value={formData.newCycleName}
        onChangeText={(value) => updateForm('newCycleName', value)}
        placeholder={`Cycle ${cycles.length + 1}`}
      />
    ) : null}

    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{t.midcycleOnboarding.cycleQuestion}</Text>
      <View style={styles.segmentRow}>
        {(['new', 'midcycle'] as const).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.segmentOption,
              formData.cycleStartMode === mode && styles.segmentOptionSelected
            ]}
            onPress={() => updateForm('cycleStartMode', mode)}
          >
            <Text style={[
              styles.segmentOptionText,
              formData.cycleStartMode === mode && styles.segmentOptionTextSelected
            ]}>
              {mode === 'new' ? t.midcycleOnboarding.newCycle : t.midcycleOnboarding.existingCycle}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
    <InputField
      label={t.forms.density}
      value={formData.density}
      onChangeText={(value) => updateForm('density', value)}
      placeholder={t.home.densityHint}
      keyboardType="numeric"
    />
    <View style={styles.inputContainer}>
      <AppDatePicker
        label={t.forms.startDate}
        value={formData.docStart}
        onChange={(date) => updateForm('docStart', date)}
        cancelLabel={t.actions.cancel}
        confirmLabel={t.actions.confirm}
      />
    </View>
    <InputField
      label={t.forms.supplier}
      value={formData.supplier}
      onChangeText={(value) => updateForm('supplier', value)}
      placeholder={t.home.supplierPlaceholder}
    />
    <InputField
      label={t.forms.plValue}
      value={formData.plValue}
      onChangeText={(value) => updateForm('plValue', value)}
      placeholder={t.home.plHint}
      keyboardType="numeric"
      hint={t.farmCycle.startCycleHint}
    />
    {formData.cycleStartMode === 'midcycle' && (
      <>
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
      </>
    )}
  </></>);
}
