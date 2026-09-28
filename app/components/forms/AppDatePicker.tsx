import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLanguage } from '../../../context/LanguageContext';

interface AppDatePickerProps {
  label?: string;
  value: Date | string | number | null | undefined;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  cancelLabel?: string;
  confirmLabel?: string;
  placeholder?: string;
  disabled?: boolean;
}

const normalizeDate = (value: AppDatePickerProps['value']): Date => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string') {
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
    const parsed = new Date(dateOnly);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  if (typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
};

export default function AppDatePicker({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  cancelLabel,
  confirmLabel,
  placeholder,
  disabled = false,
}: AppDatePickerProps) {
  const { t } = useLanguage();
  const resolvedCancelLabel = cancelLabel || t.actions.cancel;
  const resolvedConfirmLabel = confirmLabel || t.actions.confirm;
  const resolvedPlaceholder = placeholder || t.financialReports.datePlaceholder;
  const hasValue = value instanceof Date
    ? !Number.isNaN(value.getTime())
    : (typeof value === 'number' || (typeof value === 'string' && value.trim().length > 0));
  const selectedDate = useMemo(() => normalizeDate(value), [value]);
  const [visible, setVisible] = useState(false);
  const [draftDate, setDraftDate] = useState(selectedDate);
  const draftDateRef = useRef(selectedDate);

  const open = () => {
    draftDateRef.current = selectedDate;
    setDraftDate(selectedDate);
    setVisible(true);
  };

  const confirm = (date: Date = draftDateRef.current) => {
    onChange(date);
    setVisible(false);
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity
        style={[styles.button, disabled && styles.disabled]}
        onPress={open}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label || resolvedPlaceholder}
      >
        <Text style={[styles.value, !hasValue && styles.placeholder]}>
          {hasValue ? selectedDate.toLocaleDateString() : resolvedPlaceholder}
        </Text>
        <Ionicons name="calendar-outline" size={20} color="#0F4C75" />
      </TouchableOpacity>

      {visible ? <View style={styles.pickerPanel}>
        <DateTimePicker
          style={Platform.OS === 'ios' ? styles.datePicker : undefined}
          value={draftDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          themeVariant="light"
          onChange={(event, date) => {
            const nextDate = date || draftDateRef.current;
            draftDateRef.current = nextDate;
            if (Platform.OS !== 'ios') {
              setDraftDate(nextDate);
              if (event.type !== 'dismissed') confirm(nextDate);
              else setVisible(false);
            }
          }}
        />
        {Platform.OS === 'ios' ? <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setVisible(false)}>
            <Text style={styles.cancelText}>{resolvedCancelLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmButton} onPress={() => confirm()}>
            <Text style={styles.confirmText}>{resolvedConfirmLabel}</Text>
          </TouchableOpacity>
        </View> : null}
      </View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 5 },
  label: { color: '#60798A', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  button: { minHeight: 48, borderRadius: 11, borderWidth: 1, borderColor: '#D8E7F0', backgroundColor: '#F8FBFD', paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  value: { color: '#102F46', fontSize: 14, fontWeight: '700' },
  placeholder: { color: '#78909C', fontWeight: '600' },
  disabled: { opacity: 0.5 },
  pickerPanel: { borderWidth: 1, borderColor: '#D8E7F0', borderRadius: 11, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  datePicker: { alignSelf: 'center', width: '100%', transform: [{ scaleX: 0.88 }] },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingHorizontal: 10, paddingBottom: 10 },
  cancelButton: { minHeight: 36, borderRadius: 8, borderWidth: 1, borderColor: '#D8E7F0', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: '#5E7485', fontSize: 12, fontWeight: '700' },
  confirmButton: { minHeight: 36, borderRadius: 8, backgroundColor: '#0F4C75', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  confirmText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
});
