import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useLanguage } from '../../../context/LanguageContext';

export interface CycleSelectorOption {
  id: string;
  cycleName: string;
  blockName?: string;
  blockNames?: string[];
}

interface CycleSelectorProps {
  label?: string;
  value: string;
  options: CycleSelectorOption[];
  onChange: (cycleId: string) => void;
  includeAllHistory?: boolean;
  placeholder?: string;
  allHistoryLabel?: string;
  sheetEyebrow?: string;
  sheetTitle?: string;
  emptyLabel?: string;
  disabled?: boolean;
}

const getCycleSubtitle = (cycle: CycleSelectorOption) => (
  cycle.blockNames?.filter(Boolean).join(', ') || cycle.blockName || ''
);

export default function CycleSelector({
  label,
  value,
  options,
  onChange,
  includeAllHistory = false,
  placeholder,
  allHistoryLabel,
  sheetEyebrow,
  sheetTitle,
  emptyLabel,
  disabled = false,
}: CycleSelectorProps) {
  const { t } = useLanguage();
  const resolvedPlaceholder = placeholder || t.financeCycle.selectCycle;
  const resolvedAllHistoryLabel = allHistoryLabel || t.financeCycle.allHistory;
  const resolvedSheetEyebrow = sheetEyebrow || t.financeCycle.allocateToCycle;
  const resolvedSheetTitle = sheetTitle || t.financeCycle.selectCycle;
  const resolvedEmptyLabel = emptyLabel || t.financeCycle.noCyclesAvailable;
  const [visible, setVisible] = useState(false);
  const selectedCycle = useMemo(
    () => options.find((cycle) => cycle.id === value),
    [options, value],
  );
  const displayValue = value === 'all' && includeAllHistory
    ? resolvedAllHistoryLabel
    : selectedCycle?.cycleName || resolvedPlaceholder;

  const select = (cycleId: string) => {
    onChange(cycleId);
    setVisible(false);
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        disabled={disabled}
        onPress={() => setVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label || t.financeCycle.cycle}: ${displayValue}`}
      >
        <View style={styles.triggerCopy}>
          <Text style={[styles.triggerValue, !selectedCycle && value !== 'all' && styles.placeholder]} numberOfLines={1}>
            {displayValue}
          </Text>
          {selectedCycle && getCycleSubtitle(selectedCycle) ? (
            <Text style={styles.triggerSubtitle} numberOfLines={1}>{getCycleSubtitle(selectedCycle)}</Text>
          ) : null}
        </View>
        <Ionicons name="chevron-down" size={18} color="#0F4C75" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.sheet}>
                <View style={styles.header}>
                  <View>
                    <Text style={styles.eyebrow}>{resolvedSheetEyebrow}</Text>
                    <Text style={styles.title}>{resolvedSheetTitle}</Text>
                  </View>
                  <TouchableOpacity style={styles.closeButton} onPress={() => setVisible(false)} accessibilityLabel={t.enterpriseCycle.close}>
                    <Ionicons name="close" size={21} color="#334B5C" />
                  </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false} style={styles.options}>
                  {includeAllHistory ? (
                    <TouchableOpacity style={[styles.option, value === 'all' && styles.optionSelected]} onPress={() => select('all')}>
                      <View style={styles.optionIcon}><Ionicons name="time-outline" size={19} color="#0F4C75" /></View>
                      <View style={styles.optionCopy}>
                        <Text style={styles.optionName} numberOfLines={1} ellipsizeMode="tail">{resolvedAllHistoryLabel}</Text>
                      </View>
                      {value === 'all' ? <Ionicons name="checkmark-circle" size={20} color="#0F4C75" /> : null}
                    </TouchableOpacity>
                  ) : null}
                  {options.map((cycle) => {
                    const selected = value === cycle.id;
                    const subtitle = getCycleSubtitle(cycle);
                    return (
                      <TouchableOpacity key={cycle.id} style={[styles.option, selected && styles.optionSelected]} onPress={() => select(cycle.id)}>
                        <View style={styles.optionIcon}><Ionicons name="repeat-outline" size={19} color="#0F4C75" /></View>
                        <View style={styles.optionCopy}>
                          <Text style={styles.optionName} numberOfLines={1} ellipsizeMode="tail">{cycle.cycleName}</Text>
                          {subtitle ? <Text style={styles.optionSubtitle} numberOfLines={1} ellipsizeMode="tail">{subtitle}</Text> : null}
                        </View>
                        {selected ? <Ionicons name="checkmark-circle" size={20} color="#0F4C75" /> : null}
                      </TouchableOpacity>
                    );
                  })}
                  {options.length === 0 ? <Text style={styles.emptyText}>{resolvedEmptyLabel}</Text> : null}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 5 },
  label: { color: '#60798A', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  trigger: { minHeight: 48, borderRadius: 11, borderWidth: 1, borderColor: '#D8E7F0', backgroundColor: '#F8FBFD', paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10, overflow: 'hidden' },
  triggerDisabled: { opacity: 0.72 },
  triggerCopy: { flex: 1, minWidth: 0, overflow: 'hidden' },
  triggerValue: { color: '#102F46', fontSize: 14, fontWeight: '800' },
  triggerSubtitle: { marginTop: 2, color: '#78909C', fontSize: 10, fontWeight: '600' },
  placeholder: { color: '#78909C', fontWeight: '600' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(13, 33, 55, 0.48)' },
  sheet: { maxHeight: '70%', borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: '#FFFFFF', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 28 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  eyebrow: { color: '#60798A', fontSize: 10, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  title: { marginTop: 3, color: '#102F46', fontSize: 20, fontWeight: '900' },
  closeButton: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: '#D8E7F0', backgroundColor: '#F4F8FC', alignItems: 'center', justifyContent: 'center' },
  options: { flexGrow: 0 },
  option: { minHeight: 58, marginBottom: 8, borderRadius: 13, borderWidth: 1, borderColor: '#D8E7F0', backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 10, overflow: 'hidden' },
  optionSelected: { borderColor: '#3282B8', backgroundColor: '#EAF6FD' },
  optionIcon: { width: 34, height: 34, flexShrink: 0, borderRadius: 10, backgroundColor: '#EDF5FA', alignItems: 'center', justifyContent: 'center' },
  optionCopy: { flex: 1, minWidth: 0, overflow: 'hidden' },
  optionName: { flexShrink: 1, color: '#102F46', fontSize: 13, fontWeight: '800' },
  optionSubtitle: { flexShrink: 1, marginTop: 2, color: '#78909C', fontSize: 10, fontWeight: '600' },
  emptyText: { paddingVertical: 22, color: '#78909C', fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
